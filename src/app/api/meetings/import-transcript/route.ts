import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { analyzeTranscript } from "@/lib/ai/analyze-transcript";
import { saveMeetingAnalysis } from "@/lib/ai/save-meeting-analysis";
import {
  getAudioExtension,
  getAudioMimeType,
  validateAudioFile,
  validateTranscriptAgainstAudio,
} from "@/lib/audio/upload-validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_TRANSCRIPT_FILE_BYTES, parseTranscriptFile } from "@/lib/transcripts/parse-transcript";

const RECORDING_BUCKET = "meeting-recordings";
const AVATAR_COLORS = ["#f18f62", "#6b9bd2", "#9b7bd8", "#58b8ba", "#cd7fae", "#6baf8e"];
type ImportMode = "transcript" | "audio-transcript";

function initialsFor(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

function slugify(value: string) {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70).replace(/-$/g, "") || "meeting";
}

function message(error: unknown) {
  return error && typeof error === "object" && "message" in error ? String(error.message) : "Unknown error";
}

function modeFrom(value: FormDataEntryValue | null): ImportMode | null {
  return value === "transcript" || value === "audio-transcript" ? value : null;
}

function durationFrom(value: FormDataEntryValue | null) {
  if (value === null || typeof value !== "string" || value === "") return null;
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : undefined;
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "A multipart meeting import is required." }, { status: 400 });
  }

  const mode = modeFrom(formData.get("mode"));
  if (!mode) return Response.json({ error: "Choose transcript only or audio + transcript." }, { status: 400 });

  const transcriptFile = formData.get("transcript") ?? formData.get("file");
  if (!(transcriptFile instanceof File)) {
    return Response.json({ error: "Choose a .txt or .json transcript file." }, { status: 400 });
  }
  if (!transcriptFile.size) return Response.json({ error: "The transcript file is empty." }, { status: 400 });
  if (transcriptFile.size > MAX_TRANSCRIPT_FILE_BYTES) {
    return Response.json({ error: "The transcript file must be 2 MB or smaller." }, { status: 413 });
  }

  // The transcript is validated first and remains authoritative in both modes.
  const parsed = parseTranscriptFile(transcriptFile.name, await transcriptFile.text());
  if (!parsed.success) {
    return Response.json({ error: `${parsed.error} Upload canceled—check the accepted format and try again.` }, { status: 400 });
  }

  const audioValue = formData.get("audio");
  const audioFile = audioValue instanceof File ? audioValue : null;
  const audioDuration = durationFrom(formData.get("audioDurationSeconds"));
  if (mode === "audio-transcript" && !audioFile) {
    return Response.json({ error: "Audio + transcript mode requires both files." }, { status: 400 });
  }
  if (mode === "transcript" && audioFile) {
    return Response.json({ error: "Audio is only accepted in audio + transcript mode." }, { status: 400 });
  }
  if (audioDuration === undefined) {
    return Response.json({ error: "The supplied audio duration is invalid." }, { status: 400 });
  }
  if (audioFile) {
    const audioError = validateAudioFile(audioFile);
    if (audioError) return Response.json({ error: audioError }, { status: 400 });
    if (audioDuration !== null) {
      const durationError = validateTranscriptAgainstAudio(parsed.data.durationSeconds, audioDuration);
      if (durationError) return Response.json({ error: durationError }, { status: 400 });
    }
  }

  const supabase = createAdminClient();
  const slug = `${slugify(parsed.data.title)}-${randomUUID().slice(0, 8)}`;
  const effectiveDuration = audioDuration
    ? Math.max(parsed.data.durationSeconds, Math.round(audioDuration))
    : parsed.data.durationSeconds;
  let meetingId: string | null = null;
  let uploadedPath: string | null = null;
  let recordingCreated = false;

  try {
    const { data: meeting, error: meetingError } = await supabase.from("meetings").insert({
      slug,
      title: parsed.data.title,
      short_summary: null,
      starts_at: parsed.data.startsAt ?? new Date().toISOString(),
      duration_seconds: effectiveDuration,
      status: "uploaded",
      source: audioFile ? "upload" : "transcript",
      visibility: "private",
      accent: "orange",
    }).select("id, slug, title").single();
    if (meetingError) throw meetingError;
    meetingId = meeting.id;

    const { data: participants, error: participantError } = await supabase.from("participants").insert(
      parsed.data.participants.map((name, index) => ({
        name,
        initials: initialsFor(name),
        avatar_color: AVATAR_COLORS[index % AVATAR_COLORS.length],
      })),
    ).select("id, name");
    if (participantError) throw participantError;

    const participantByName = new Map(
      participants.map((participant) => [participant.name.toLocaleLowerCase(), participant.id]),
    );
    const { error: linkError } = await supabase.from("meeting_participants").insert(
      participants.map((participant, index) => ({
        meeting_id: meeting.id,
        participant_id: participant.id,
        role: index === 0 ? "Host" : "Participant",
        sort_order: index,
      })),
    );
    if (linkError) throw linkError;

    const { error: transcriptError } = await supabase.from("transcript_segments").insert(
      parsed.data.segments.map((segment, index) => ({
        meeting_id: meeting.id,
        speaker_participant_id: participantByName.get(segment.speaker.toLocaleLowerCase()) ?? null,
        speaker_name: segment.speaker,
        start_seconds: segment.startSeconds,
        end_seconds: segment.endSeconds,
        text: segment.text,
        sort_order: index,
      })),
    );
    if (transcriptError) throw transcriptError;

    if (audioFile) {
      const extension = getAudioExtension(audioFile.name);
      const mimeType = getAudioMimeType(audioFile);
      uploadedPath = `${meeting.id}/${randomUUID()}.${extension}`;
      const { error: storageError } = await supabase.storage.from(RECORDING_BUCKET).upload(
        uploadedPath,
        audioFile,
        { contentType: mimeType, cacheControl: "3600", upsert: false },
      );
      if (storageError) throw storageError;

      const { error: recordingError } = await supabase.from("recordings").insert({
        meeting_id: meeting.id,
        storage_bucket: RECORDING_BUCKET,
        storage_path: uploadedPath,
        mime_type: mimeType,
        file_size_bytes: audioFile.size,
        duration_seconds: audioDuration ? Math.round(audioDuration) : null,
        waveform: [],
        is_primary: true,
      });
      if (recordingError) throw recordingError;
      recordingCreated = true;
    }

    const { error: analyzingError } = await supabase.from("meetings")
      .update({ status: "analyzing", error_message: null }).eq("id", meeting.id);
    if (analyzingError) throw analyzingError;

    const analysis = await analyzeTranscript({ ...parsed.data, durationSeconds: effectiveDuration });
    await saveMeetingAnalysis(meeting.id, participantByName, analysis);

    return Response.json({
      meeting: { ...meeting, status: "ready" },
      participantCount: participants.length,
      segmentCount: parsed.data.segments.length,
      hasAudio: Boolean(audioFile),
    }, { status: 201 });
  } catch (error) {
    console.error(`[meeting-import] Failed: ${message(error)}`);
    if (uploadedPath && !recordingCreated) {
      const { error: cleanupError } = await supabase.storage.from(RECORDING_BUCKET).remove([uploadedPath]);
      if (cleanupError) console.error(`[meeting-import] Audio cleanup failed: ${cleanupError.message}`);
    }
    if (meetingId) {
      await Promise.all([
        supabase.from("summaries").delete().eq("meeting_id", meetingId),
        supabase.from("action_items").delete().eq("meeting_id", meetingId),
        supabase.from("highlights").delete().eq("meeting_id", meetingId),
      ]);
      const { error: statusError } = await supabase.from("meetings").update({
        status: "failed",
        error_message: "Meeting validation or analysis failed before processing completed.",
      }).eq("id", meetingId);
      if (statusError) console.error(`[meeting-import] Failed to mark ${meetingId} failed: ${statusError.message}`);
    }
    return Response.json(
      { error: "The meeting could not be processed safely. Its status was set to failed." },
      { status: 500 },
    );
  }
}
