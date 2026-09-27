"use client";

import Link from "next/link";
import {
  ArrowLeft,
  AudioLines,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Highlighter,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  UsersRound,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ShareMeetingButton } from "@/components/meetings/share-meeting-button";
import type { MeetingDetail as MeetingDetailType } from "@/types/meeting";

type MeetingTab = "summary" | "transcript" | "ask-ai";

const tabs: { id: MeetingTab; label: string; icon: typeof Sparkles }[] = [
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "transcript", label: "Transcript", icon: MessageSquareText },
  { id: "ask-ai", label: "Ask AI", icon: Bot },
];

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function TimestampButton({
  label,
  onClick,
  active = false,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-label inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] tracking-[0.08em] transition-colors ${
        active
          ? "border-[#ff7a1a]/35 bg-[#ff7a1a]/12 text-[#ff9a52]"
          : "border-white/[0.08] bg-white/[0.035] text-white/38 hover:border-[#ff7a1a]/30 hover:text-[#ff9a52]"
      }`}
    >
      <Play className="size-2.5 fill-current" />
      {label}
    </button>
  );
}

export function MeetingDetail({ meeting }: { meeting: MeetingDetailType }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeTab, setActiveTab] = useState<MeetingTab>("summary");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [completedActions, setCompletedActions] = useState<string[]>(() =>
    meeting.actionItems.filter((item) => item.completed).map((item) => item.id),
  );
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [transcriptQuery, setTranscriptQuery] = useState("");

  useEffect(() => {
    if (!isPlaying || meeting.recordingUrl) return;

    const timer = window.setInterval(() => {
      setCurrentTime((current) => {
        if (current >= meeting.durationSeconds - 1) {
          setIsPlaying(false);
          return meeting.durationSeconds;
        }
        return current + 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPlaying, meeting.durationSeconds, meeting.recordingUrl]);

  useEffect(() => {
    const openTranscriptMatch = () => {
      const segmentId = window.location.hash.slice(1);
      if (!segmentId) return;

      const segment = meeting.transcript.find((item) => item.id === segmentId);
      if (!segment) return;

      setActiveTab("transcript");
      setCurrentTime(segment.timestampSeconds);
      window.setTimeout(() => {
        document.getElementById(segment.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    };

    openTranscriptMatch();
    window.addEventListener("hashchange", openTranscriptMatch);
    return () => window.removeEventListener("hashchange", openTranscriptMatch);
  }, [meeting.transcript]);

  const activeTranscriptId = useMemo(() => {
    return [...meeting.transcript]
      .reverse()
      .find((segment) => segment.timestampSeconds <= currentTime)?.id;
  }, [currentTime, meeting.transcript]);

  const filteredTranscript = useMemo(() => {
    const query = transcriptQuery.trim().toLowerCase();
    if (!query) return meeting.transcript;
    return meeting.transcript.filter(
      (segment) =>
        segment.speaker.toLowerCase().includes(query) || segment.text.toLowerCase().includes(query),
    );
  }, [meeting.transcript, transcriptQuery]);

  const seededQuestions = useMemo(
    () => [
      {
        question: "What was this meeting about?",
        answer: meeting.purpose,
      },
      {
        question: "What decisions were made?",
        answer:
          meeting.decisions.length > 0
            ? meeting.decisions.join(" ")
            : "No explicit decisions were captured for this meeting.",
      },
      {
        question: "What follow-ups were assigned?",
        answer:
          meeting.actionItems.length > 0
            ? meeting.actionItems.map((item) => `${item.owner}: ${item.task}`).join(" ")
            : "No follow-up actions were captured for this meeting.",
      },
    ],
    [meeting.actionItems, meeting.decisions, meeting.purpose],
  );

  const seekTo = (seconds: number) => {
    const nextTime = Math.min(seconds, meeting.durationSeconds);
    setCurrentTime(nextTime);
    if (audioRef.current) audioRef.current.currentTime = nextTime;
  };

  const togglePlayback = async () => {
    if (!audioRef.current) {
      setIsPlaying((current) => !current);
      return;
    }

    if (audioRef.current.paused) {
      try {
        await audioRef.current.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      audioRef.current.pause();
    }
  };

  const progress = meeting.durationSeconds ? currentTime / meeting.durationSeconds : 0;

  return (
    <div className="mx-auto max-w-[1480px]">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-white/38 transition-colors hover:text-white/75"
      >
        <ArrowLeft className="size-3.5" /> Back to meetings
      </Link>

      <section className="flex flex-col gap-6 border-b border-white/[0.07] pb-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#ff7a1a] shadow-[0_0_12px_rgba(255,122,26,0.7)]" />
            <span className="font-label text-[8px] font-medium tracking-[0.24em] text-white/38">PROCESSED MEETING</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-[44px]">
            {meeting.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/42 sm:text-sm">
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4 text-white/28" /> {meeting.date} at {meeting.time}
            </span>
            <span className="flex items-center gap-2">
              <Clock3 className="size-4 text-white/28" /> {meeting.duration}
            </span>
            <span className="flex items-center gap-2">
              <UsersRound className="size-4 text-white/28" /> {meeting.participants.length} participants
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {meeting.shareToken && <ShareMeetingButton token={meeting.shareToken} />}
          <button
            type="button"
            aria-label="More meeting options"
            className="flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/42 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <MoreHorizontal className="size-[18px]" />
          </button>
        </div>
      </section>

      <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative min-h-[260px] overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0b0b11]/90 shadow-[0_24px_90px_rgba(0,0,0,0.32)] sm:min-h-[320px]">
          {meeting.recordingUrl && (
            <audio
              ref={audioRef}
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            >
              <source src={meeting.recordingUrl} type={meeting.recordingMimeType} />
            </audio>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,122,26,0.13),transparent_24rem),linear-gradient(140deg,rgba(255,255,255,0.025),transparent_45%)]" />
          <div className="relative flex min-h-[260px] flex-col justify-between p-5 sm:min-h-[320px] sm:p-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg border border-[#ff7a1a]/20 bg-[#ff7a1a]/10 text-[#ff8b36]">
                  <AudioLines className="size-3.5" />
                </span>
                <div>
                  <p className="font-label text-[8px] tracking-[0.2em] text-white/42">MEETING RECORDING</p>
                  <p className="mt-1 text-[10px] text-white/25">
                    {meeting.recordingUrl ? "Uploaded playback audio" : "Timeline preview"}
                  </p>
                </div>
              </div>
              <span className="font-label rounded-md border border-white/[0.07] bg-black/20 px-2 py-1 text-[8px] tracking-[0.12em] text-white/30">
                {meeting.recordingUrl ? "PLAYBACK READY" : "TIMELINE ONLY"}
              </span>
            </div>

            <div className="my-8 flex h-24 items-center gap-[3px] sm:h-32 sm:gap-1" aria-hidden="true">
              {meeting.waveform.map((height, index) => {
                const isElapsed = index / meeting.waveform.length <= progress;
                return (
                  <button
                    key={index}
                    type="button"
                    tabIndex={-1}
                    className={`min-w-[2px] flex-1 rounded-full transition-colors duration-300 ${
                      isElapsed ? "bg-[#ff7a1a]/85" : "bg-white/[0.14]"
                    }`}
                    style={{ height: `${height}%` }}
                    onClick={() => seekTo((index / meeting.waveform.length) * meeting.durationSeconds)}
                  />
                );
              })}
            </div>

            <div>
              <input
                aria-label="Recording position"
                type="range"
                min={0}
                max={meeting.durationSeconds}
                value={currentTime}
                onChange={(event) => seekTo(Number(event.target.value))}
                className="h-1 w-full cursor-pointer accent-[#ff7a1a]"
              />
              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => void togglePlayback()}
                    aria-label={isPlaying ? "Pause recording" : "Play recording"}
                    className="flex size-11 items-center justify-center rounded-full bg-[#ff7a1a] text-[#09090d] shadow-[0_10px_34px_rgba(255,122,26,0.28)] transition-transform hover:scale-105"
                  >
                    {isPlaying ? (
                      <Pause className="size-4 fill-current" />
                    ) : (
                      <Play className="ml-0.5 size-4 fill-current" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => seekTo(Math.max(0, currentTime - 10))}
                    aria-label="Go back 10 seconds"
                    className="flex size-9 items-center justify-center rounded-full text-white/38 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                  <Volume2 className="ml-1 hidden size-4 text-white/25 sm:block" />
                </div>
                <p className="font-label text-[10px] tracking-[0.08em] text-white/35">
                  <span className="text-white/70">{formatTime(currentTime)}</span> / {formatTime(meeting.durationSeconds)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-white/[0.08] bg-[#0d0d13]/80 p-5 backdrop-blur-xl sm:p-6">
          <p className="font-label text-[8px] font-medium tracking-[0.22em] text-white/30">PARTICIPANTS</p>
          <div className="mt-5 space-y-4">
            {meeting.participants.map((participant) => (
              <div key={participant.name} className="flex items-center gap-3">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full font-display text-[10px] font-semibold text-white ring-2 ring-white/[0.06] ${participant.color}`}
                >
                  {participant.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-white/78">{participant.name}</p>
                  <p className="mt-0.5 text-[10px] text-white/30">{participant.role}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <div className="mt-8 border-b border-white/[0.08]">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Meeting detail sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex h-12 shrink-0 items-center gap-2 px-4 text-xs font-medium transition-colors sm:px-5 sm:text-sm ${
                  isActive ? "text-white" : "text-white/35 hover:text-white/70"
                }`}
              >
                <Icon className={`size-4 ${isActive ? "text-[#ff8b36]" : ""}`} strokeWidth={1.8} />
                {tab.label}
                {isActive && <span className="absolute inset-x-3 bottom-0 h-px bg-[#ff7a1a] shadow-[0_0_12px_rgba(255,122,26,0.7)]" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-7">
        {activeTab === "summary" && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <div className="space-y-6">
              <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d13]/78 backdrop-blur-xl">
                <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-6">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-[#ff7a1a]/10 text-[#ff8b36]">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-semibold tracking-[-0.025em] text-white">AI summary</h2>
                    <p className="mt-0.5 text-[10px] text-white/28">Generated from the seeded transcript</p>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div>
                    <p className="font-label text-[8px] font-medium tracking-[0.22em] text-[#ff9950]">MEETING PURPOSE</p>
                    <p className="mt-3 text-sm font-light leading-6 text-white/60 sm:text-[15px]">{meeting.purpose}</p>
                  </div>

                  <div className="mt-7 grid gap-7 border-t border-white/[0.065] pt-7 lg:grid-cols-2">
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <Lightbulb className="size-4 text-[#64d3ff]" />
                        <h3 className="font-display text-sm font-semibold text-white/85">Key takeaways</h3>
                      </div>
                      <ul className="space-y-4">
                        {meeting.takeaways.map((takeaway) => (
                          <li key={takeaway} className="flex gap-3 text-[13px] leading-5 text-white/50">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#64d3ff]/70" />
                            {takeaway}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-[#ff8b36]" />
                        <h3 className="font-display text-sm font-semibold text-white/85">Decisions</h3>
                      </div>
                      <ul className="space-y-3">
                        {meeting.decisions.map((decision, index) => (
                          <li
                            key={decision}
                            className="rounded-xl border border-white/[0.065] bg-white/[0.025] p-3.5 text-[13px] leading-5 text-white/52"
                          >
                            <span className="font-label mr-2 text-[9px] text-[#ff8b36]">0{index + 1}</span>
                            {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.08] bg-[#0d0d13]/78 p-5 backdrop-blur-xl sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[#64d3ff]/10 text-[#64d3ff]">
                      <ListChecks className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-semibold tracking-[-0.025em] text-white">Action items</h2>
                      <p className="mt-0.5 text-[10px] text-white/28">{meeting.actionItems.length} follow-ups identified</p>
                    </div>
                  </div>
                  <span className="font-label rounded-md bg-white/[0.04] px-2 py-1 text-[8px] text-white/30">
                    {completedActions.length}/{meeting.actionItems.length} DONE
                  </span>
                </div>

                <div className="divide-y divide-white/[0.06]">
                  {meeting.actionItems.map((item) => {
                    const isComplete = completedActions.includes(item.id);
                    return (
                      <div key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0 sm:gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            setCompletedActions((current) =>
                              current.includes(item.id)
                                ? current.filter((id) => id !== item.id)
                                : [...current, item.id],
                            )
                          }
                          aria-label={isComplete ? `Mark ${item.task} incomplete` : `Mark ${item.task} complete`}
                          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            isComplete
                              ? "border-[#ff7a1a] bg-[#ff7a1a] text-[#09090d]"
                              : "border-white/15 text-transparent hover:border-[#ff7a1a]/60"
                          }`}
                        >
                          <Check className="size-3" strokeWidth={2.5} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] leading-5 transition-colors ${isComplete ? "text-white/25 line-through" : "text-white/62"}`}>
                            {item.task}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2.5">
                            <span className="flex items-center gap-1.5 text-[10px] text-white/38">
                              <span className={`flex size-5 items-center justify-center rounded-full text-[7px] font-semibold text-white ${item.ownerColor}`}>
                                {item.ownerInitials}
                              </span>
                              {item.owner}
                            </span>
                            <span className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[9px] text-white/35">
                              Due {item.deadline}
                            </span>
                            <TimestampButton label={item.timestamp} onClick={() => seekTo(item.timestampSeconds)} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <section className="h-fit rounded-2xl border border-white/[0.08] bg-[#0d0d13]/78 p-5 backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#ff7a1a]/10 text-[#ff8b36]">
                  <Highlighter className="size-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold tracking-[-0.025em] text-white">Highlights</h2>
                  <p className="mt-0.5 text-[10px] text-white/28">Notable moments from the conversation</p>
                </div>
              </div>
              <div className="space-y-3">
                {meeting.highlights.map((highlight) => (
                  <article
                    key={highlight.id}
                    className="rounded-xl border border-white/[0.065] bg-white/[0.025] p-4 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-label text-[8px] font-medium tracking-[0.14em] text-[#ff9950]">
                        {highlight.label.toUpperCase()}
                      </span>
                      <TimestampButton label={highlight.timestamp} onClick={() => seekTo(highlight.timestampSeconds)} />
                    </div>
                    <h3 className="font-display mt-3 text-sm font-semibold text-white/78">{highlight.title}</h3>
                    <p className="mt-2 text-[12px] leading-5 text-white/40">{highlight.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "transcript" && (
          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d13]/78 backdrop-blur-xl">
            <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-[-0.025em] text-white">Transcript</h2>
                <p className="mt-1 text-[11px] text-white/30">Select any timestamp to move the recording.</p>
              </div>
              <label className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3 sm:w-72">
                <Search className="size-3.5 text-white/25" />
                <span className="sr-only">Search transcript</span>
                <input
                  type="search"
                  value={transcriptQuery}
                  onChange={(event) => setTranscriptQuery(event.target.value)}
                  placeholder="Search transcript..."
                  className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/25"
                />
              </label>
            </div>

            <div className="divide-y divide-white/[0.055] px-5 sm:px-6">
              {filteredTranscript.map((segment) => {
                const isActive = segment.id === activeTranscriptId;
                return (
                  <article
                    key={segment.id}
                    id={segment.id}
                    className={`grid gap-3 py-5 transition-colors sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6 ${
                      isActive ? "-mx-5 bg-[#ff7a1a]/[0.045] px-5 sm:-mx-6 sm:px-6" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:items-start">
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold text-white ${segment.speakerColor}`}>
                        {segment.speakerInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-white/62">{segment.speaker}</p>
                        <button
                          type="button"
                          onClick={() => seekTo(segment.timestampSeconds)}
                          className={`font-label mt-1 text-[9px] transition-colors hover:text-[#ff9950] ${isActive ? "text-[#ff8b36]" : "text-white/28"}`}
                        >
                          {segment.timestamp}
                        </button>
                      </div>
                    </div>
                    <p className={`text-[13px] leading-6 sm:text-sm ${isActive ? "text-white/72" : "text-white/50"}`}>
                      {segment.text}
                    </p>
                  </article>
                );
              })}
              {filteredTranscript.length === 0 && (
                <div className="py-16 text-center">
                  <Search className="mx-auto size-5 text-white/20" />
                  <p className="mt-3 text-sm text-white/35">No transcript moments match that search.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "ask-ai" && (
          <section className="grid min-h-[520px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d13]/78 backdrop-blur-xl lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="border-b border-white/[0.07] p-5 lg:border-b-0 lg:border-r lg:p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#ff7a1a]/10 text-[#ff8b36]">
                  <Bot className="size-[18px]" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">Ask this meeting</h2>
                  <p className="mt-0.5 text-[10px] text-white/28">Seeded preview</p>
                </div>
              </div>
              <p className="mt-5 text-xs leading-5 text-white/38">
                Explore answers grounded in this meeting&apos;s seeded transcript and summary.
              </p>
              <div className="mt-6 space-y-2">
                <p className="font-label mb-3 text-[8px] tracking-[0.18em] text-white/25">SUGGESTED QUESTIONS</p>
                {seededQuestions.map((item, index) => (
                  <button
                    key={item.question}
                    type="button"
                    onClick={() => setSelectedQuestion(index)}
                    className={`w-full rounded-xl border p-3 text-left text-[11px] leading-4 transition-colors ${
                      selectedQuestion === index
                        ? "border-[#ff7a1a]/25 bg-[#ff7a1a]/[0.07] text-white/70"
                        : "border-white/[0.06] bg-white/[0.02] text-white/38 hover:bg-white/[0.04] hover:text-white/60"
                    }`}
                  >
                    {item.question}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-h-[420px] flex-col p-5 sm:p-7">
              <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.065] px-4 py-3 text-[13px] leading-5 text-white/68">
                  {seededQuestions[selectedQuestion].question}
                </div>
                <div className="mt-5 flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#ff7a1a] text-[#09090d]">
                    <Sparkles className="size-3.5" />
                  </div>
                  <div>
                    <p className="font-label mb-2 text-[8px] tracking-[0.16em] text-[#ff9950]">ECHO AI</p>
                    <p className="max-w-xl text-sm font-light leading-6 text-white/58">
                      {seededQuestions[selectedQuestion].answer}
                    </p>
                    {meeting.highlights.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        {meeting.highlights.slice(0, 2).map((highlight) => (
                          <TimestampButton
                            key={highlight.id}
                            label={highlight.timestamp}
                            onClick={() => seekTo(highlight.timestampSeconds)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mx-auto mt-8 flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-white/[0.09] bg-black/20 p-2 pl-4">
                <input
                  type="text"
                  readOnly
                  placeholder="Ask anything about this meeting..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                />
                <button
                  type="button"
                  aria-label="Send question"
                  title="Seeded preview only"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#ff7a1a] text-[#09090d] transition-colors hover:bg-[#ff8b38]"
                >
                  <Send className="size-3.5" />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
