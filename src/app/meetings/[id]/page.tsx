import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { MeetingDetail } from "@/components/meetings/meeting-detail";
import { productDesignReviewMeeting } from "@/lib/mock-meeting-detail";

export const metadata: Metadata = {
  title: "Product design review — Echo",
  description: "Meeting recap, decisions, action items, highlights, and transcript.",
};

export function generateStaticParams() {
  return [{ id: productDesignReviewMeeting.id }];
}

export default async function MeetingPage({ params }: PageProps<"/meetings/[id]">) {
  const { id } = await params;

  if (id !== productDesignReviewMeeting.id) {
    notFound();
  }

  return (
    <AppShell>
      <MeetingDetail meeting={productDesignReviewMeeting} />
    </AppShell>
  );
}
