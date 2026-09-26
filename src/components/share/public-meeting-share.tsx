import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Highlighter,
  Lightbulb,
  ListChecks,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { EchoWaveBackground } from "@/components/layout/echo-wave-background";
import type { PublicSharedMeeting } from "@/types/meeting";

export function PublicMeetingShare({ meeting }: { meeting: PublicSharedMeeting }) {
  return (
    <div className="relative isolate min-h-screen overflow-x-clip">
      <EchoWaveBackground />

      <div className="relative z-10">
        <header className="border-b border-white/[0.07] bg-[#05050a]/78 px-4 py-4 backdrop-blur-2xl sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <BrandMark />
            <div className="font-label flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[8px] tracking-[0.16em] text-white/38">
              <Eye className="size-3 text-[#64d3ff]" /> PUBLIC · READ ONLY
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
          <section className="border-b border-white/[0.07] pb-9">
            <div className="mb-4 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#ff7a1a] shadow-[0_0_12px_rgba(255,122,26,0.7)]" />
              <span className="font-label text-[8px] font-medium tracking-[0.24em] text-white/38">SHARED MEETING</span>
            </div>
            <h1 className="font-display max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              {meeting.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/42 sm:text-sm">
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
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {meeting.participants.map((participant) => (
                <div
                  key={participant.name}
                  className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] py-1.5 pl-1.5 pr-3"
                >
                  <span
                    className={`flex size-6 items-center justify-center rounded-full font-display text-[7px] font-semibold text-white ${participant.color}`}
                  >
                    {participant.initials}
                  </span>
                  <span className="text-[10px] text-white/45">{participant.name}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl border border-white/[0.085] bg-[#0d0d13]/82 shadow-[0_22px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-7">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#ff7a1a]/10 text-[#ff8b36]">
                <Sparkles className="size-[17px]" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold tracking-[-0.025em] text-white">Meeting summary</h2>
                <p className="mt-0.5 text-[10px] text-white/28">Key context and outcomes</p>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div>
                <p className="font-label text-[8px] font-medium tracking-[0.22em] text-[#ff9950]">MEETING PURPOSE</p>
                <p className="mt-3 max-w-4xl text-sm font-light leading-6 text-white/60 sm:text-[15px]">
                  {meeting.purpose}
                </p>
              </div>

              <div className="mt-8 grid gap-8 border-t border-white/[0.065] pt-8 lg:grid-cols-2 lg:gap-12">
                <div>
                  <div className="mb-5 flex items-center gap-2.5">
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
                  <div className="mb-5 flex items-center gap-2.5">
                    <CheckCircle2 className="size-4 text-[#ff8b36]" />
                    <h3 className="font-display text-sm font-semibold text-white/85">Decisions</h3>
                  </div>
                  <div className="space-y-3">
                    {meeting.decisions.map((decision, index) => (
                      <div
                        key={decision}
                        className="flex gap-3 rounded-xl border border-white/[0.065] bg-white/[0.025] p-3.5 text-[13px] leading-5 text-white/52"
                      >
                        <span className="font-label mt-0.5 shrink-0 text-[9px] text-[#ff8b36]">0{index + 1}</span>
                        {decision}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
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
                <span className="font-label rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[8px] text-white/28">
                  READ ONLY
                </span>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {meeting.actionItems.map((item) => (
                  <article key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0 sm:gap-4">
                    <span className="mt-1 size-4 shrink-0 rounded border border-white/15" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-5 text-white/60">{item.task}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2.5">
                        <span className="flex items-center gap-1.5 text-[10px] text-white/38">
                          <span
                            className={`flex size-5 items-center justify-center rounded-full text-[7px] font-semibold text-white ${item.ownerColor}`}
                          >
                            {item.ownerInitials}
                          </span>
                          {item.owner}
                        </span>
                        <span className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[9px] text-white/35">
                          Due {item.deadline}
                        </span>
                        <span className="font-label rounded-md bg-[#ff7a1a]/[0.07] px-2 py-1 text-[8px] text-[#ff9950]">
                          {item.timestamp}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="h-fit rounded-2xl border border-white/[0.08] bg-[#0d0d13]/78 p-5 backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#ff7a1a]/10 text-[#ff8b36]">
                  <Highlighter className="size-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold tracking-[-0.025em] text-white">Highlights</h2>
                  <p className="mt-0.5 text-[10px] text-white/28">Notable moments</p>
                </div>
              </div>

              <div className="space-y-3">
                {meeting.highlights.map((highlight) => (
                  <article key={highlight.id} className="rounded-xl border border-white/[0.065] bg-white/[0.025] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-label text-[8px] font-medium tracking-[0.14em] text-[#ff9950]">
                        {highlight.label.toUpperCase()}
                      </span>
                      <span className="font-label rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[8px] text-white/32">
                        {highlight.timestamp}
                      </span>
                    </div>
                    <h3 className="font-display mt-3 text-sm font-semibold text-white/78">{highlight.title}</h3>
                    <p className="mt-2 text-[12px] leading-5 text-white/40">{highlight.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] py-6 text-center sm:flex-row sm:text-left">
            <p className="text-[11px] text-white/28">This is a public, read-only meeting recap.</p>
            <p className="font-label text-[8px] tracking-[0.18em] text-white/22">SHARED WITH ECHO</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
