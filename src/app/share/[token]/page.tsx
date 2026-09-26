import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicMeetingShare } from "@/components/share/public-meeting-share";
import { getPublicMeetingShare, publicMeetingShares } from "@/lib/mock-share";

export const metadata: Metadata = {
  title: "Shared meeting — Echo",
  description: "A public, read-only meeting recap shared from Echo.",
  robots: {
    index: false,
    follow: false,
  },
};

export function generateStaticParams() {
  return publicMeetingShares.map((share) => ({ token: share.token }));
}

export default async function SharedMeetingPage({ params }: PageProps<"/share/[token]">) {
  const { token } = await params;
  const share = getPublicMeetingShare(token);

  if (!share) {
    notFound();
  }

  return <PublicMeetingShare meeting={share.meeting} />;
}
