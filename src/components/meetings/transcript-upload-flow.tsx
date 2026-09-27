"use client";

import {
  AlertCircle,
  ArrowRight,
  AudioLines,
  CheckCircle2,
  FileAudio2,
  FileJson,
  FileText,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import {
  AUDIO_FILE_ACCEPT,
  MAX_AUDIO_FILE_BYTES,
  validateAudioFile,
  validateTranscriptAgainstAudio,
} from "@/lib/audio/upload-validation";
import {
  MAX_TRANSCRIPT_FILE_BYTES,
  TRANSCRIPT_FILE_ACCEPT,
  parseTranscriptFile,
  type ParsedTranscript,
} from "@/lib/transcripts/parse-transcript";

type ImportMode = "transcript" | "audio-transcript";
type TranscriptSelection = { file: File; transcript: ParsedTranscript };
type AudioSelection = { file: File; durationSeconds: number | null };

function formatDuration(totalSeconds: number) {
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${totalMinutes} min`;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function formatFileSize(bytes: number) {
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1_000))} KB`;
}

function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);
    const finish = (duration: number | null) => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      audio.removeAttribute("src");
      resolve(duration);
    };
    const timeout = window.setTimeout(() => finish(null), 8_000);

    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    audio.onerror = () => finish(null);
    audio.src = objectUrl;
  });
}

export function TranscriptUploadFlow() {
  const router = useRouter();
  const transcriptInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("transcript");
  const [transcriptSelection, setTranscriptSelection] = useState<TranscriptSelection | null>(null);
  const [audioSelection, setAudioSelection] = useState<AudioSelection | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetTranscript = () => {
    setTranscriptSelection(null);
    setValidationError(null);
    if (transcriptInputRef.current) transcriptInputRef.current.value = "";
  };

  const resetAudio = () => {
    setAudioSelection(null);
    setValidationError(null);
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const rejectTranscript = (message: string) => {
    setTranscriptSelection(null);
    setValidationError(`${message} Upload canceled—check the format below and try again.`);
    if (transcriptInputRef.current) transcriptInputRef.current.value = "";
  };

  const validateTranscript = async (file: File) => {
    setValidationError(null);
    if (file.size === 0) return rejectTranscript("The selected transcript is empty.");
    if (file.size > MAX_TRANSCRIPT_FILE_BYTES) {
      return rejectTranscript("The selected transcript is larger than 2 MB.");
    }

    const result = parseTranscriptFile(file.name, await file.text());
    if (!result.success) return rejectTranscript(result.error);
    if (audioSelection?.durationSeconds) {
      const durationError = validateTranscriptAgainstAudio(
        result.data.durationSeconds,
        audioSelection.durationSeconds,
      );
      if (durationError) return rejectTranscript(durationError);
    }

    setTranscriptSelection({ file, transcript: result.data });
  };

  const validateAudio = async (file: File) => {
    setValidationError(null);
    const fileError = validateAudioFile(file);
    if (fileError) {
      resetAudio();
      setValidationError(fileError);
      return;
    }

    const durationSeconds = await readAudioDuration(file);
    if (durationSeconds && transcriptSelection) {
      const durationError = validateTranscriptAgainstAudio(
        transcriptSelection.transcript.durationSeconds,
        durationSeconds,
      );
      if (durationError) {
        resetAudio();
        setValidationError(durationError);
        return;
      }
    }

    setAudioSelection({ file, durationSeconds });
  };

  const handleTranscriptDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void validateTranscript(file);
  };

  const changeMode = (nextMode: ImportMode) => {
    if (isProcessing) return;
    setMode(nextMode);
    setValidationError(null);
    if (nextMode === "transcript") resetAudio();
  };

  const createMeeting = async () => {
    if (!transcriptSelection || isProcessing) return;
    if (mode === "audio-transcript" && !audioSelection) {
      setValidationError("Choose an audio file as well as the validated transcript.");
      return;
    }

    setIsProcessing(true);
    setValidationError(null);

    try {
      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("transcript", transcriptSelection.file);
      if (audioSelection) {
        formData.append("audio", audioSelection.file);
        if (audioSelection.durationSeconds) {
          formData.append("audioDurationSeconds", String(audioSelection.durationSeconds));
        }
      }

      const response = await fetch("/api/meetings/import-transcript", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { meeting?: { slug: string }; error?: string };
      if (!response.ok || !payload.meeting) {
        setValidationError(payload.error ?? "The meeting could not be created. Try again.");
        return;
      }

      router.push(`/meetings/${payload.meeting.slug}`);
      router.refresh();
    } catch {
      setValidationError("The meeting could not be created because the service is unavailable. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isReady = Boolean(
    transcriptSelection && (mode === "transcript" || audioSelection),
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="rounded-3xl border border-white/[0.085] bg-[#0d0d13]/82 p-5 shadow-[0_22px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#ff7a1a]/10 text-[#ff8b36]">
            <UploadCloud className="size-[18px]" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[-0.025em] text-white">Import meeting</h2>
            <p className="mt-1 text-[11px] text-white/32">Transcript required · audio optional for playback</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.07] bg-black/15 p-1.5">
          {([
            ["transcript", FileText, "Transcript only"],
            ["audio-transcript", AudioLines, "Audio + transcript"],
          ] as const).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => changeMode(value)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-medium transition-colors ${
                mode === value
                  ? "bg-white/[0.08] text-white shadow-sm"
                  : "text-white/35 hover:bg-white/[0.035] hover:text-white/65"
              }`}
            >
              <Icon className={`size-4 ${mode === value ? "text-[#ff8b36]" : ""}`} /> {label}
            </button>
          ))}
        </div>

        <div
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleTranscriptDrop}
          className={`mt-5 rounded-2xl border p-5 transition-colors ${
            isDragging
              ? "border-[#ff7a1a]/60 bg-[#ff7a1a]/[0.07]"
              : transcriptSelection
                ? "border-[#64d3ff]/20 bg-[#64d3ff]/[0.045]"
                : "border-dashed border-white/[0.12] bg-black/15"
          }`}
        >
          {transcriptSelection ? (
            <SelectedFile
              icon={<CheckCircle2 className="size-[18px]" />}
              title="Transcript format verified"
              name={transcriptSelection.file.name}
              detail={`${transcriptSelection.transcript.participants.length} speakers · ${transcriptSelection.transcript.segments.length} segments · ${formatDuration(transcriptSelection.transcript.durationSeconds)}`}
              onRemove={resetTranscript}
              disabled={isProcessing}
            />
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center text-center">
              <FileText className="size-6 text-white/30" />
              <p className="font-display mt-4 text-sm font-semibold text-white/72">Add the source transcript</p>
              <p className="mt-1.5 max-w-sm text-[11px] leading-5 text-white/32">
                Speaker names, timestamps, and text come from this validated TXT or JSON file.
              </p>
              <button
                type="button"
                onClick={() => transcriptInputRef.current?.click()}
                className="mt-4 rounded-xl bg-[#ff7a1a] px-4 py-2.5 text-xs font-semibold text-[#09090d] hover:bg-[#ff8b38]"
              >
                Choose transcript
              </button>
            </div>
          )}
          <input
            ref={transcriptInputRef}
            type="file"
            accept={TRANSCRIPT_FILE_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void validateTranscript(file);
            }}
          />
        </div>

        {mode === "audio-transcript" && (
          <div className="mt-4 rounded-2xl border border-white/[0.09] bg-black/15 p-5">
            {audioSelection ? (
              <SelectedFile
                icon={<FileAudio2 className="size-[18px]" />}
                title="Playback audio ready"
                name={audioSelection.file.name}
                detail={`${formatFileSize(audioSelection.file.size)}${
                  audioSelection.durationSeconds
                    ? ` · ${formatDuration(audioSelection.durationSeconds)}`
                    : " · duration unavailable"
                }`}
                onRemove={resetAudio}
                disabled={isProcessing}
              />
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-white/38">
                    <FileAudio2 className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/70">Add playback audio</p>
                    <p className="mt-1 text-[10px] leading-4 text-white/30">
                      MP3, M4A, WAV, WebM, or OGG · maximum {MAX_AUDIO_FILE_BYTES / 1_000_000} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="shrink-0 rounded-xl border border-white/[0.1] px-4 py-2.5 text-xs text-white/55 transition hover:bg-white/[0.05] hover:text-white"
                >
                  Choose audio
                </button>
              </div>
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept={AUDIO_FILE_ACCEPT}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void validateAudio(file);
              }}
            />
          </div>
        )}

        {validationError && (
          <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.055] p-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-300/75" />
            <div>
              <p className="text-xs font-medium text-red-100/80">Import was not accepted</p>
              <p className="mt-1 text-[11px] leading-5 text-red-100/45">{validationError}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={createMeeting}
          disabled={!isReady || isProcessing}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff7a1a] text-xs font-semibold text-[#09090d] shadow-[0_10px_34px_rgba(255,122,26,0.24)] transition hover:bg-[#ff8b38] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isProcessing ? (
            <><LoaderCircle className="size-4 animate-spin" /> Uploading and analyzing...</>
          ) : (
            <>Create and analyze meeting <ArrowRight className="size-4" /></>
          )}
        </button>
        <p className="mt-3 text-center text-[10px] text-white/25">
          The transcript is validated before anything is processed. Audio-only imports are not supported.
        </p>
      </section>

      <aside className="rounded-3xl border border-white/[0.08] bg-[#0d0d13]/76 p-5 backdrop-blur-xl sm:p-6">
        <p className="font-label text-[8px] font-medium tracking-[0.22em] text-[#ff9950]">ACCEPTED FORMAT</p>
        <h2 className="font-display mt-3 text-xl font-semibold tracking-[-0.03em] text-white">Format your transcript first</h2>
        <p className="mt-2 text-xs leading-5 text-white/38">
          The transcript is authoritative in both modes. Every segment needs a speaker, timestamp, and text.
        </p>
        <div className="mt-6 space-y-4">
          <FormatExample icon={<FileJson className="size-4" />} label="JSON" code={`{
  "title": "Weekly product sync",
  "segments": [
    {
      "speaker": "Saeed",
      "start_time_seconds": 0,
      "end_time_seconds": 18,
      "text": "Let's review the plan."
    }
  ]
}`} />
          <FormatExample icon={<FileText className="size-4" />} label="TXT" code={`Meeting Title: Weekly product sync
Date: 2026-09-26
Duration: 12 minutes
Participants: Saeed, Ahmed

[00:00] Saeed:
Let's review the plan.

[00:18] Ahmed:
The first milestone is ready.`} />
        </div>
      </aside>
    </div>
  );
}

function SelectedFile({
  icon,
  title,
  name,
  detail,
  onRemove,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  name: string;
  detail: string;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#64d3ff]/10 text-[#64d3ff]">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white/78">{title}</p>
        <p className="mt-1 truncate text-[11px] text-white/38" title={name}>{name}</p>
        <p className="mt-1 text-[10px] text-white/28">{detail}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${name}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-40"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function FormatExample({ icon, label, code }: { icon: React.ReactNode; label: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.075] bg-black/20">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3 text-white/40">
        {icon}<span className="font-label text-[8px] tracking-[0.18em]">{label}</span>
      </div>
      <pre className="max-h-64 overflow-auto p-4 font-mono text-[9px] leading-4 text-white/42"><code>{code}</code></pre>
    </div>
  );
}
