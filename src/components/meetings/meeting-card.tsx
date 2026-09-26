import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Highlighter,
  MoreHorizontal,
} from "lucide-react";
import type { MeetingAccent, MeetingPreview } from "@/types/meeting";

const accentStyles: Record<MeetingAccent, { dot: string; bar: string; glow: string }> = {
  orange: {
    dot: "bg-[#ff7a1a]",
    bar: "bg-[#ff7a1a]",
    glow: "from-orange-400/[0.09]",
  },
  cyan: {
    dot: "bg-[#64d3ff]",
    bar: "bg-[#64d3ff]",
    glow: "from-cyan-300/[0.08]",
  },
  violet: {
    dot: "bg-[#9b8cff]",
    bar: "bg-[#9b8cff]",
    glow: "from-violet-400/[0.08]",
  },
};

export function MeetingCard({ meeting }: { meeting: MeetingPreview }) {
  const accent = accentStyles[meeting.accent];

  return (
    <article className="group relative flex min-h-[344px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d13]/80 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/[0.14] hover:bg-[#111119]/90 hover:shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-6">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${accent.glow} to-transparent opacity-70`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${accent.dot}`} />
          <span className="font-label text-[8px] font-medium tracking-[0.2em] text-white/42">
            PROCESSED
          </span>
        </div>
        <button
          type="button"
          aria-label={`More options for ${meeting.title}`}
          className="flex size-8 items-center justify-center rounded-lg text-white/28 transition-colors hover:bg-white/[0.06] hover:text-white/75"
        >
          <MoreHorizontal className="size-[18px]" />
        </button>
      </div>

      <div className="relative mt-5">
        <p className="font-label text-[9px] font-medium tracking-[0.12em] text-white/30">
          {meeting.date.toUpperCase()} · {meeting.time}
        </p>
        <h2 className="font-display mt-2.5 text-[22px] font-semibold leading-[1.15] tracking-[-0.035em] text-white sm:text-2xl">
          {meeting.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-[13px] font-light leading-5 text-white/45">
          {meeting.summary}
        </p>
      </div>

      <div
        className="relative mt-5 flex h-10 items-end gap-[3px] overflow-hidden rounded-xl border border-white/[0.045] bg-black/20 px-3 py-2"
        aria-hidden="true"
      >
        {meeting.waveform.map((height, index) => (
          <span
            key={`${meeting.id}-${index}`}
            className={`min-w-[2px] flex-1 rounded-full transition-opacity ${accent.bar} ${
              index > 11 ? "opacity-20" : "opacity-55 group-hover:opacity-75"
            }`}
            style={{ height: `${height}%` }}
          />
        ))}
        <span className="absolute inset-y-0 left-[66%] w-px bg-white/20" />
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        {meeting.topics.map((topic) => (
          <span
            key={topic}
            className="font-label rounded-md border border-white/[0.07] bg-white/[0.035] px-2 py-1 text-[8px] font-medium tracking-[0.1em] text-white/42"
          >
            {topic.toUpperCase()}
          </span>
        ))}
      </div>

      <div className="relative mt-auto flex items-end justify-between gap-3 border-t border-white/[0.065] pt-4">
        <div className="flex items-center">
          {meeting.participants.map((participant, index) => (
            <div
              key={participant.name}
              title={participant.name}
              className={`flex size-7 items-center justify-center rounded-full border-2 border-[#0d0d13] font-display text-[8px] font-semibold text-white ${participant.color} ${
                index > 0 ? "-ml-1.5" : ""
              }`}
            >
              {participant.initials}
            </div>
          ))}
          {meeting.participantCount > meeting.participants.length && (
            <div className="-ml-1.5 flex size-7 items-center justify-center rounded-full border-2 border-[#0d0d13] bg-[#24242e] font-label text-[7px] text-white/55">
              +{meeting.participantCount - meeting.participants.length}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-white/35">
          <span className="flex items-center gap-1.5">
            <Clock3 className="size-3.5" /> {meeting.duration}
          </span>
          <span className="hidden items-center gap-1.5 xl:flex">
            <CheckCircle2 className="size-3.5" /> {meeting.actionItems}
          </span>
          <span className="hidden items-center gap-1.5 xl:flex">
            <Highlighter className="size-3.5" /> {meeting.highlights}
          </span>
          <button
            type="button"
            aria-label={`Open ${meeting.title}`}
            className="ml-1 flex size-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-white/45 transition-colors group-hover:border-white/[0.14] group-hover:bg-white/[0.07] group-hover:text-white"
          >
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
