import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import {
  MAX_TRANSCRIPT_FILE_BYTES,
  parseTranscriptFile,
} from "@/lib/transcripts/parse-transcript";
import { createAdminClient } from "@/lib/supabase/admin";

const AVATAR_COLORS = [
  "#f18f62",
  "#6b9bd2",
  "#9b7bd8",
  "#58b8ba",
  "#cd7fae",
  "#6baf8e",
];

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function slugify(value: string) {
  const base = value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70)
    .replace(/-$/g, "");

  return base || "meeting";
}

function errorMessage(error: unknown) {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "Unknown transcript import error";
}

export async function POST(request: NextRequest) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "A multipart transcript upload is required." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a .txt or .json transcript file." }, { status: 400 });
  }

  if (file.size === 0) {
    return Response.json({ error: "The transcript file is empty." }, { status: 400 });
  }

  if (file.size > MAX_TRANSCRIPT_FILE_BYTES) {
    return Response.json({ error: "The transcript file must be 2 MB or smaller." }, { status: 413 });
  }

  const parsed = parseTranscriptFile(file.name, await file.text());
  if (!parsed.success) {
    return Response.json(
      { error: `${parsed.error} Upload canceled—check the accepted format and try again.` },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const slug = `${slugify(parsed.data.title)}-${randomUUID().slice(0, 8)}`;
  let meetingId: string | null = null;

  try {
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert({
        slug,
        title: parsed.data.title,
        short_summary: null,
        starts_at: parsed.data.startsAt ?? new Date().toISOString(),
        duration_seconds: parsed.data.durationSeconds,
        status: "uploaded",
        source: "transcript",
        visibility: "private",
        accent: "orange",
      })
      .select("id, slug, title")
      .single();

    if (meetingError) throw meetingError;
    meetingId = meeting.id;

    const { data: participants, error: participantError } = await supabase
      .from("participants")
      .insert(
        parsed.data.participants.map((name, index) => ({
          name,
          initials: initialsFor(name),
          avatar_color: AVATAR_COLORS[index % AVATAR_COLORS.length],
        })),
      )
      .select("id, name");

    if (participantError) throw participantError;

    const participantByName = new Map(
      participants.map((participant) => [participant.name.toLocaleLowerCase(), participant.id]),
    );
    const { error: meetingParticipantError } = await supabase
      .from("meeting_participants")
      .insert(
        participants.map((participant, index) => ({
          meeting_id: meeting.id,
          participant_id: participant.id,
          role: index === 0 ? "Host" : "Participant",
          sort_order: index,
        })),
      );

    if (meetingParticipantError) throw meetingParticipantError;

    const { error: transcriptError } = await supabase.from("transcript_segments").insert(
      parsed.data.segments.map((segment, index) => ({
        meeting_id: meeting.id,
        speaker_participant_id:
          participantByName.get(segment.speaker.toLocaleLowerCase()) ?? null,
        speaker_name: segment.speaker,
        start_seconds: segment.startSeconds,
        end_seconds: segment.endSeconds,
        text: segment.text,
        sort_order: index,
      })),
    );

    if (transcriptError) throw transcriptError;

    const { data: readyMeeting, error: readyError } = await supabase
      .from("meetings")
      .update({ status: "ready", error_message: null })
      .eq("id", meeting.id)
      .select("id, slug, title, status")
      .single();

    if (readyError) throw readyError;

    return Response.json(
      {
        meeting: readyMeeting,
        participantCount: participants.length,
        segmentCount: parsed.data.segments.length,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = errorMessage(error);
    console.error(`[transcript-import] Failed to create meeting: ${message}`);

    if (meetingId) {
      const { error: statusError } = await supabase
        .from("meetings")
        .update({
          status: "failed",
          error_message: "Transcript import failed before processing completed.",
        })
        .eq("id", meetingId);

      if (statusError) {
        console.error(
          `[transcript-import] Failed to mark meeting ${meetingId} as failed: ${statusError.message}`,
        );
      }
    }

    return Response.json(
      { error: "The transcript could not be imported. Nothing is ready to review yet." },
      { status: 500 },
    );
  }
}
