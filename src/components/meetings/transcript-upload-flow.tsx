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

function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    let timeout = 0;
    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    audio.onerror = () => finish(null);
    timeout = window.setTimeout(() => finish(null), 8_000);
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

  const changeMode = (nextMode: ImportMode) => {
    if (isProcessing) return;
    setMode(nextMode);
    setValidationError(null);
    if (nextMode === "transcript") resetAudio();
  };

  const validateTranscript = async (file: File) => {
    setValidationError(null);
    if (!file.size) return setValidationError("The selected transcript is empty.");
    if (file.size > MAX_TRANSCRIPT_FILE_BYTES) {
      return setValidationError("The transcript must be 2 MB or smaller.");
    }

    const result = parseTranscriptFile(file.name, await file.text());
    if (!result.success) {
      setTranscriptSelection(null);
      if (transcriptInputRef.current) transcriptInputRef.current.value = "";
      return setValidationError(`${result.error} Upload canceled—check the format and try again.`);
    }

    if (audioSelection?.durationSeconds) {
      const mismatch = validateTranscriptAgainstAudio(
        result.data.durationSeconds,
        audioSelection.durationSeconds,
      );
      if (mismatch) return setValidationError(mismatch);
    }
    setTranscriptSelection({ file, transcript: result.data });
  };

  const validateAudio = async (file: File) => {
    setValidationError(null);
    const audioError = validateAudioFile(file);
    if (audioError) return setValidationError(audioError);

    const durationSeconds = await readAudioDuration(file);
    if (durationSeconds && transcriptSelection) {
      const mismatch = validateTranscriptAgainstAudio(
        transcriptSelection.transcript.durationSeconds,
        durationSeconds,
      );
      if (mismatch) {
        resetAudio();
        return setValidationError(mismatch);
      }
    }
    setAudioSelection({ file, durationSeconds });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void validateTranscript(file);
  };

  const createMeeting = async () => {
    if (!transcriptSelection || isProcessing) return;
    if (mode === "audio-transcript" && !audioSelection) {
      setValidationError("Choose an audio file to use audio + transcript mode.");
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

      const response = await fetch("/api/meetings/import-transcript", { method: "POST", body: formData });
      const payload = (await response.json()) as { meeting?: { slug: string }; error?: string };
      if (!response.ok || !payload.meeting) {
        setValidationError(payload.error ?? "The meeting could not be created. Try again.");
        return;
      }

      router.push(`/meetings/${payload.meeting.slug}`);
      router.refresh();
    } catch {
      setValidationError("The meeting service is unavailable. Your selected files were not changed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const canSubmit = Boolean(
    transcriptSelection && (mode === "transcript" || audioSelection) && !isProcessing,
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="rounded-3xl border border-white/[0.085] bg-[#0d0d13]/82 p-5 shadow-[0_22px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#ff7a1a]/10 text-[#ff8b36]">
            <UploadCloud className="size-[18px]" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[-0.025em] text-white">Import files</h2>
            <p className="mt-1 text-[11px] text-white/32">Transcript required · audio optional</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Import mode">
          <ModeButton active={mode === "transcript"} icon={<FileText className="size-4" />} title="Transcript only" description="TXT or JSON transcript" onClick={() => changeMode("transcript")} />
          <ModeButton active={mode === "audio-transcript"} icon={<AudioLines className="size-4" />} title="Audio + transcript" description="Audio for playback, transcript for data" onClick={() => changeMode("audio-transcript")} />
        </div>

        <div onDragEnter={() => setIsDragging(true)} onDragLeave={() => setIsDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className={`mt-5 rounded-2xl border border-dashed p-5 transition-colors ${isDragging ? "border-[#ff7a1a]/60 bg-[#ff7a1a]/[0.07]" : "border-white/[0.12] bg-black/15"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${transcriptSelection ? "bg-[#64d3ff]/10 text-[#64d3ff]" : "bg-white/[0.04] text-white/35"}`}>
                {transcriptSelection ? <CheckCircle2 className="size-[18px]" /> : <FileText className="size-[18px]" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/78">Transcript <span className="text-[#ff8b36]">required</span></p>
                <p className="mt-1 truncate text-[11px] text-white/34">{transcriptSelection ? transcriptSelection.file.name : "Drop or choose a validated .txt or .json file"}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {transcriptSelection && <button type="button" onClick={resetTranscript} disabled={isProcessing} aria-label="Remove transcript" className="flex size-9 items-center justify-center rounded-lg border border-white/[0.08] text-white/35 hover:text-white/70 disabled:opacity-40"><X className="size-4" /></button>}
              <button type="button" onClick={() => transcriptInputRef.current?.click()} disabled={isProcessing} className="h-9 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 text-[11px] font-medium text-white/60 hover:bg-white/[0.07] disabled:opacity-40">{transcriptSelection ? "Replace" : "Choose transcript"}</button>
            </div>
          </div>
          <input ref={transcriptInputRef} type="file" accept={TRANSCRIPT_FILE_ACCEPT} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void validateTranscript(file); }} />
        </div>

        {mode === "audio-transcript" && (
          <div className="mt-3 rounded-2xl border border-white/[0.1] bg-black/15 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${audioSelection ? "bg-[#ff7a1a]/10 text-[#ff8b36]" : "bg-white/[0.04] text-white/35"}`}><FileAudio2 className="size-[18px]" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/78">Playback audio <span className="text-[#ff8b36]">required</span></p>
                  <p className="mt-1 truncate text-[11px] text-white/34">{audioSelection ? `${audioSelection.file.name}${audioSelection.durationSeconds ? ` · ${formatDuration(audioSelection.durationSeconds)}` : " · duration unavailable"}` : "MP3, M4A, WAV, WebM, or OGG · maximum 50 MB"}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {audioSelection && <button type="button" onClick={resetAudio} disabled={isProcessing} aria-label="Remove audio" className="flex size-9 items-center justify-center rounded-lg border border-white/[0.08] text-white/35 hover:text-white/70 disabled:opacity-40"><X className="size-4" /></button>}
                <button type="button" onClick={() => audioInputRef.current?.click()} disabled={isProcessing} className="h-9 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 text-[11px] font-medium text-white/60 hover:bg-white/[0.07] disabled:opacity-40">{audioSelection ? "Replace" : "Choose audio"}</button>
              </div>
            </div>
            <input ref={audioInputRef} type="file" accept={AUDIO_FILE_ACCEPT} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void validateAudio(file); }} />
          </div>
        )}

        {transcriptSelection && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Meeting", transcriptSelection.transcript.title], ["Format", transcriptSelection.transcript.format.toUpperCase()], ["Speakers", String(transcriptSelection.transcript.participants.length)], ["Duration", formatDuration(transcriptSelection.transcript.durationSeconds)]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/[0.07] bg-black/15 p-3"><p className="font-label text-[7px] tracking-[0.15em] text-white/25">{label.toUpperCase()}</p><p className="mt-2 truncate text-xs font-medium text-white/65" title={value}>{value}</p></div>
            ))}
          </div>
        )}

        {validationError && <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.055] p-4"><AlertCircle className="mt-0.5 size-4 shrink-0 text-red-300/75" /><div><p className="text-xs font-medium text-red-100/80">Files were not accepted</p><p className="mt-1 text-[11px] leading-5 text-red-100/45">{validationError}</p></div></div>}

        <button type="button" onClick={createMeeting} disabled={!canSubmit} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff7a1a] text-xs font-semibold text-[#09090d] shadow-[0_10px_34px_rgba(255,122,26,0.24)] transition-colors hover:bg-[#ff8b38] disabled:cursor-not-allowed disabled:opacity-45">
          {isProcessing ? <><LoaderCircle className="size-4 animate-spin" /> Uploading and analyzing...</> : <>Create meeting <ArrowRight className="size-4" /></>}
        </button>
        <p className="mt-3 text-center text-[10px] text-white/28">Audio-only imports are not supported. The transcript is always the source of truth.</p>
      </section>

      <aside className="rounded-3xl border border-white/[0.08] bg-[#0d0d13]/76 p-5 backdrop-blur-xl sm:p-6">
        <p className="font-label text-[8px] font-medium tracking-[0.22em] text-[#ff9950]">ACCEPTED TRANSCRIPT FORMAT</p>
        <h2 className="font-display mt-3 text-xl font-semibold tracking-[-0.03em] text-white">Format your transcript first</h2>
        <p className="mt-2 text-xs leading-5 text-white/38">Speaker names, timestamps, and non-empty text are required for every segment.</p>
        <div className="mt-6 space-y-4">
          <FormatExample icon={<FileJson className="size-4" />} label="JSON" code={`{\n  "title": "Weekly product sync",\n  "segments": [\n    {\n      "speaker": "Saeed",\n      "start_time_seconds": 0,\n      "end_time_seconds": 18,\n      "text": "Let's review the plan."\n    }\n  ]\n}`} />
          <FormatExample icon={<FileText className="size-4" />} label="TXT" code={`Meeting Title: Weekly product sync\nDate: 2026-09-26\nDuration: 12 minutes\nParticipants: Saeed, Ahmed\n\n[00:00] Saeed:\nLet's review the plan.\n\n[00:18] Ahmed:\nThe first milestone is ready.`} />
        </div>
        <div className="mt-5 rounded-xl border border-white/[0.065] bg-white/[0.025] p-4"><p className="text-[11px] leading-5 text-white/35">When audio is included, its browser-readable duration is checked against the transcript. If metadata cannot be read, processing continues and the transcript duration remains authoritative.</p></div>
      </aside>
    </div>
  );
}

function ModeButton({ active, icon, title, description, onClick }: { active: boolean; icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return <button type="button" role="radio" aria-checked={active} onClick={onClick} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${active ? "border-[#ff7a1a]/35 bg-[#ff7a1a]/[0.07]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14]"}`}><span className={active ? "text-[#ff8b36]" : "text-white/35"}>{icon}</span><span><span className="block text-xs font-medium text-white/76">{title}</span><span className="mt-1 block text-[10px] text-white/30">{description}</span></span></button>;
}

function FormatExample({ icon, label, code }: { icon: React.ReactNode; label: string; code: string }) {
  return <div className="overflow-hidden rounded-2xl border border-white/[0.075] bg-black/20"><div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3 text-white/40">{icon}<span className="font-label text-[8px] tracking-[0.18em]">{label}</span></div><pre className="max-h-64 overflow-auto p-4 font-mono text-[9px] leading-4 text-white/42"><code>{code}</code></pre></div>;
}
