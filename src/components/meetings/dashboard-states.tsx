import { AlertCircle, CalendarClock, RotateCw } from "lucide-react";
import Link from "next/link";

export function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1480px] animate-pulse" aria-label="Loading meetings">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-xl">
          <div className="h-3 w-24 rounded-full bg-white/[0.07]" />
          <div className="mt-5 h-10 w-72 max-w-full rounded-xl bg-white/[0.07]" />
          <div className="mt-3 h-4 w-full rounded-full bg-white/[0.045]" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-white/[0.045]" />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-[104px] items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4"
          >
            <div className="size-10 shrink-0 rounded-xl bg-white/[0.06]" />
            <div className="flex-1">
              <div className="h-2 w-20 rounded-full bg-white/[0.06]" />
              <div className="mt-3 h-6 w-28 rounded-lg bg-white/[0.07]" />
            </div>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-4">
          <div className="h-5 w-36 rounded-lg bg-white/[0.07]" />
          <div className="mt-2 h-3 w-56 rounded-full bg-white/[0.045]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="min-h-[344px] rounded-2xl border border-white/[0.08] bg-[#0d0d13]/80 p-6"
            >
              <div className="h-2 w-20 rounded-full bg-white/[0.06]" />
              <div className="mt-8 h-3 w-28 rounded-full bg-white/[0.045]" />
              <div className="mt-4 h-7 w-3/4 rounded-lg bg-white/[0.07]" />
              <div className="mt-4 h-14 rounded-xl bg-white/[0.045]" />
              <div className="mt-5 h-10 rounded-xl bg-white/[0.045]" />
              <div className="mt-8 h-px bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DashboardState({
  icon,
  title,
  description,
  retry,
}: {
  icon: "empty" | "error";
  title: string;
  description: string;
  retry?: boolean;
}) {
  const Icon = icon === "empty" ? CalendarClock : AlertCircle;

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0d0d13]/70 px-6 text-center backdrop-blur-xl">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-white/40">
        <Icon className="size-5" strokeWidth={1.7} />
      </div>
      <h2 className="font-display mt-5 text-lg font-semibold tracking-[-0.025em] text-white">{title}</h2>
      <p className="mt-2 max-w-sm text-sm font-light leading-6 text-white/40">{description}</p>
      {retry && (
        <Link
          href="/"
          className="font-label mt-5 inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3.5 text-[9px] font-medium tracking-[0.13em] text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <RotateCw className="size-3.5" />
          TRY AGAIN
        </Link>
      )}
    </div>
  );
}

export function DashboardEmpty() {
  return (
    <DashboardState
      icon="empty"
      title="No meetings yet"
      description="Meetings will appear here as soon as they are added and ready to review."
    />
  );
}

export function DashboardError() {
  return (
    <DashboardState
      icon="error"
      title="Meetings couldn\u2019t be loaded"
      description="The data service is temporarily unavailable. Try again in a moment."
      retry
    />
  );
}
