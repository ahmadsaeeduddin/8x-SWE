import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicMeetingShare } from "@/components/share/public-meeting-share";
import { getPublicMeetingShare } from "@/lib/shares/get-public-meeting-share";

export const metadata: Metadata = {
  title: "Shared meeting — Echo",
  description: "A public, read-only meeting recap shared from Echo.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SharedMeetingPage({ params }: PageProps<"/share/[token]">) {
  const { token } = await params;
  const meeting = await getPublicMeetingShare(token);

  if (!meeting) {
    notFound();
  }

  return <PublicMeetingShare meeting={meeting} />;
}
