import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardOverview } from "@/components/meetings/dashboard-overview";
import {
  DashboardEmpty,
  DashboardError,
  DashboardLoading,
} from "@/components/meetings/dashboard-states";
import { getDashboardMeetings } from "@/lib/meetings/get-dashboard-meetings";

async function DashboardContent() {
  const result = await getDashboardMeetings();
  const meetingState =
    result.state === "empty" ? (
      <DashboardEmpty />
    ) : result.state === "error" ? (
      <DashboardError />
    ) : undefined;

  return (
    <DashboardOverview
      meetings={result.meetings}
      stats={result.stats}
      meetingState={meetingState}
    />
  );
}

export default function Home() {
  return (
    <AppShell>
      <Suspense fallback={<DashboardLoading />}>
        <DashboardContent />
      </Suspense>
    </AppShell>
  );
}
