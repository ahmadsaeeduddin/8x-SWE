"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileJson,
  FileText,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import {
  MAX_TRANSCRIPT_FILE_BYTES,
  TRANSCRIPT_FILE_ACCEPT,
  parseTranscriptFile,
  type ParsedTranscript,
} from "@/lib/transcripts/parse-transcript";

type ValidSelection = {
  file: File;
  transcript: ParsedTranscript;
};

function formatDuration(totalSeconds: number) {
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${totalMinutes} min`;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

export function TranscriptUploadFlow() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<ValidSelection | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetSelection = () => {
    setSelection(null);
    setValidationError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const rejectFile = (message: string) => {
    setSelection(null);
    setValidationError(`${message} Upload canceled—check the format below and try again.`);
    if (inputRef.current) inputRef.current.value = "";
  };

  const validateFile = async (file: File) => {
    setValidationError(null);

    if (file.size === 0) {
      rejectFile("The selected transcript is empty.");
      return;
    }

    if (file.size > MAX_TRANSCRIPT_FILE_BYTES) {
      rejectFile("The selected transcript is larger than 2 MB.");
      return;
    }

    const result = parseTranscriptFile(file.name, await file.text());
    if (!result.success) {
      rejectFile(result.error);
      return;
    }

    setSelection({ file, transcript: result.data });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void validateFile(file);
  };

  const createMeeting = async () => {
    if (!selection || isProcessing) return;

    setIsProcessing(true);
    setValidationError(null);

    try {
      const formData = new FormData();
      formData.append("file", selection.file);
      const response = await fetch("/api/meetings/import-transcript", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        meeting?: { slug: string };
        error?: string;
      };

      if (!response.ok || !payload.meeting) {
        if (response.status === 400 || response.status === 413) {
          rejectFile(payload.error ?? "The transcript format is invalid.");
        } else {
          setValidationError(
            payload.error ?? "The meeting could not be created. Your file is still selected; try again.",
          );
        }
        return;
      }

      router.push(`/meetings/${payload.meeting.slug}`);
      router.refresh();
    } catch {
      setValidationError(
        "The meeting could not be created because the service is unavailable. Try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="rounded-3xl border border-white/[0.085] bg-[#0d0d13]/82 p-5 shadow-[0_22px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#ff7a1a]/10 text-[#ff8b36]">
            <UploadCloud className="size-[18px]" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[-0.025em] text-white">
              Upload transcript
            </h2>
            <p className="mt-1 text-[11px] text-white/32">TXT or JSON · maximum 2 MB</p>
          </div>
        </div>

        {!selection ? (
          <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className={`mt-6 flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition-colors ${
              isDragging
                ? "border-[#ff7a1a]/60 bg-[#ff7a1a]/[0.07]"
                : "border-white/[0.12] bg-black/15 hover:border-white/[0.2] hover:bg-white/[0.025]"
            }`}
          >
            <div className="flex size-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-white/38">
              <UploadCloud className="size-6" strokeWidth={1.6} />
            </div>
            <p className="font-display mt-5 text-base font-semibold text-white/78">
              Drop a transcript here
            </p>
            <p className="mt-2 max-w-sm text-xs leading-5 text-white/35">
              The file is checked locally first. Invalid formats are canceled before anything is
              written to Supabase.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-6 h-10 rounded-xl bg-[#ff7a1a] px-5 text-xs font-semibold text-[#09090d] shadow-[0_10px_32px_rgba(255,122,26,0.22)] transition-colors hover:bg-[#ff8b38]"
            >
              Choose transcript
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={TRANSCRIPT_FILE_ACCEPT}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void validateFile(file);
              }}
            />
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-[#64d3ff]/20 bg-[#64d3ff]/[0.055] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#64d3ff]/10 text-[#64d3ff]">
                  <CheckCircle2 className="size-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/78">Format verified</p>
                  <p className="mt-1 break-all text-[11px] text-white/35">{selection.file.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetSelection}
                disabled={isProcessing}
                aria-label="Remove selected transcript"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-40"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Meeting", selection.transcript.title],
                ["Format", selection.transcript.format.toUpperCase()],
                ["Speakers", String(selection.transcript.participants.length)],
                ["Segments", String(selection.transcript.segments.length)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
                  <p className="font-label text-[7px] tracking-[0.15em] text-white/25">{label.toUpperCase()}</p>
                  <p className="mt-2 truncate text-xs font-medium text-white/65" title={value}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.065] bg-black/15 px-4 py-3">
              <span className="text-[11px] text-white/35">Detected duration</span>
              <span className="font-label text-[10px] text-white/60">
                {formatDuration(selection.transcript.durationSeconds)}
              </span>
            </div>

            <button
              type="button"
              onClick={createMeeting}
              disabled={isProcessing}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff7a1a] text-xs font-semibold text-[#09090d] shadow-[0_10px_34px_rgba(255,122,26,0.24)] transition-colors hover:bg-[#ff8b38] disabled:cursor-wait disabled:opacity-70"
            >
              {isProcessing ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" /> Analyzing meeting...
                </>
              ) : (
                <>
                  Create meeting <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        )}

        {validationError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.055] p-4"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-300/75" />
            <div>
              <p className="text-xs font-medium text-red-100/80">Transcript was not accepted</p>
              <p className="mt-1 text-[11px] leading-5 text-red-100/45">{validationError}</p>
            </div>
          </div>
        )}
      </section>

      <aside className="rounded-3xl border border-white/[0.08] bg-[#0d0d13]/76 p-5 backdrop-blur-xl sm:p-6">
        <div>
          <p className="font-label text-[8px] font-medium tracking-[0.22em] text-[#ff9950]">
            ACCEPTED FORMAT
          </p>
          <h2 className="font-display mt-3 text-xl font-semibold tracking-[-0.03em] text-white">
            Format your transcript first
          </h2>
          <p className="mt-2 text-xs leading-5 text-white/38">
            Use one of these structures. Speaker names, timestamps, and non-empty text are required
            for every segment.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <FormatExample
            icon={<FileJson className="size-4" />}
            label="JSON"
            code={`{
  "title": "Weekly product sync",
  "segments": [
    {
      "speaker": "Saeed",
      "start_time_seconds": 0,
      "end_time_seconds": 18,
      "text": "Let's review the plan."
    }
  ]
}`}
          />
          <FormatExample
            icon={<FileText className="size-4" />}
            label="TXT"
            code={`Meeting Title: Weekly product sync
Date: 2026-09-26
Duration: 12 minutes
Participants: Saeed, Ahmed

[00:00] Saeed:
Let's review the plan.

[00:18] Ahmed:
The first milestone is ready.`}
          />
        </div>

        <div className="mt-5 rounded-xl border border-white/[0.065] bg-white/[0.025] p-4">
          <p className="text-[11px] leading-5 text-white/35">
            JSON may optionally include <code className="text-white/55">meeting_date</code> and{" "}
            <code className="text-white/55">duration_seconds</code>. Uploaded meeting IDs and slugs
            are ignored; Echo creates new ones safely.
          </p>
        </div>
      </aside>
    </div>
  );
}

function FormatExample({
  icon,
  label,
  code,
}: {
  icon: React.ReactNode;
  label: string;
  code: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.075] bg-black/20">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3 text-white/40">
        {icon}
        <span className="font-label text-[8px] tracking-[0.18em]">{label}</span>
      </div>
      <pre className="max-h-64 overflow-auto p-4 font-mono text-[9px] leading-4 text-white/42">
        <code>{code}</code>
      </pre>
    </div>
  );
}
