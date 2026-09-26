import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { MeetingDetail } from "@/components/meetings/meeting-detail";
import { getMeetingDetail } from "@/lib/meetings/get-meeting-detail";

export async function generateMetadata({ params }: PageProps<"/meetings/[id]">): Promise<Metadata> {
  const { id } = await params;
  const meeting = await getMeetingDetail(id);

  return {
    title: meeting ? `${meeting.title} — Echo` : "Meeting not found — Echo",
    description:
      meeting?.purpose ?? "Meeting recap, decisions, action items, highlights, and transcript.",
  };
}

export default async function MeetingPage({ params }: PageProps<"/meetings/[id]">) {
  const { id } = await params;
  const meeting = await getMeetingDetail(id);

  if (!meeting) {
    notFound();
  }

  return (
    <AppShell>
      <MeetingDetail key={meeting.id} meeting={meeting} />
    </AppShell>
  );
}
