import { AppShell } from "@/components/layout/app-shell";
import { DashboardOverview } from "@/components/meetings/dashboard-overview";
import { meetings } from "@/lib/mock-meetings";

export default function Home() {
  return (
    <AppShell>
      <DashboardOverview meetings={meetings} />
    </AppShell>
  );
}
