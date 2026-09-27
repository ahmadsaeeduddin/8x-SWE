import type { ReactNode } from "react";
import { CalendarDays, ChevronDown, Clock3, Sparkles, UsersRound } from "lucide-react";
import { MeetingCard } from "@/components/meetings/meeting-card";
import type { DashboardStats, MeetingPreview } from "@/types/meeting";

function formatCapturedTime(totalSeconds: number) {
  const hours = totalSeconds / 3600;

  if (hours < 1) {
    return `${Math.round(totalSeconds / 60)}m`;
  }

  return `${hours.toFixed(1)}h`;
}

type DashboardOverviewProps = {
  meetings: MeetingPreview[];
  stats: DashboardStats;
  meetingState?: ReactNode;
};

export function DashboardOverview({ meetings, stats, meetingState }: DashboardOverviewProps) {
  const overviewStats = [
    {
      label: "Meetings",
      value: String(stats.meetingCount),
      detail: `${stats.readyCount} ready to review`,
      icon: UsersRound,
    },
    {
      label: "Time captured",
      value: formatCapturedTime(stats.totalDurationSeconds),
      detail: "across all meetings",
      icon: Clock3,
    },
    {
      label: "AI insights",
      value: String(stats.insightCount),
      detail: `${stats.actionItemCount} action items`,
      icon: Sparkles,
    },
  ];

  return (
    <div className="mx-auto max-w-[1480px]">
      <section
        id="overview"
        className="scroll-mt-28 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-label text-[9px] font-medium tracking-[0.3em] text-[#ff7a1a]">
              OVERVIEW
            </span>
            <span className="h-px w-7 bg-gradient-to-r from-[#ff7a1a]/60 to-transparent" />
          </div>
          <h1 className="font-display text-[32px] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[40px]">
            Meetings, distilled.
          </h1>
          <p className="mt-3 max-w-xl text-sm font-light leading-6 text-white/42 sm:text-[15px]">
            Review every conversation, decision, and next step—without replaying the whole call.
          </p>
        </div>
        <button className="flex h-10 w-fit items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 text-xs text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/80">
          <CalendarDays className="size-3.5" />
          Last 30 days
          <ChevronDown className="size-3.5 text-white/30" />
        </button>
      </section>

      <section
        id="highlights"
        className="mt-8 grid scroll-mt-28 grid-cols-1 gap-3 sm:grid-cols-3"
        aria-label="Meeting overview"
      >
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex min-h-[104px] items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4 backdrop-blur-sm"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-black/20 text-white/42">
                <Icon className="size-[17px]" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="font-label truncate text-[8px] font-medium tracking-[0.18em] text-white/28">
                  {stat.label.toUpperCase()}
                </p>
                <div className="mt-1.5 flex items-baseline gap-2.5">
                  <p className="font-display text-[22px] font-semibold tracking-[-0.035em] text-white">
                    {stat.value}
                  </p>
                  <p className="truncate text-[10px] text-white/30">{stat.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section id="meetings" className="mt-10 scroll-mt-28">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="font-display text-lg font-semibold tracking-[-0.03em] text-white">Recent meetings</p>
            <p className="mt-1 text-xs text-white/32">Your latest conversations, ready to review</p>
          </div>
          <button className="font-label text-[9px] font-medium tracking-[0.14em] text-white/35 transition-colors hover:text-[#ff7a1a]">
            VIEW ALL
          </button>
        </div>

        {meetingState ?? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
