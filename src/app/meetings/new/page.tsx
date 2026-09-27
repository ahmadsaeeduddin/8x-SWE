import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { TranscriptUploadFlow } from "@/components/meetings/transcript-upload-flow";

export const metadata: Metadata = {
  title: "New meeting — Echo",
  description: "Create an analyzed meeting from a transcript, with optional playback audio.",
};

export default function NewMeetingPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1240px]">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-white/38 transition-colors hover:text-white/75"
        >
          <ArrowLeft className="size-3.5" /> Back to meetings
        </Link>

        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="font-label text-[9px] font-medium tracking-[0.3em] text-[#ff7a1a]">
              NEW MEETING
            </span>
            <span className="h-px w-7 bg-gradient-to-r from-[#ff7a1a]/60 to-transparent" />
          </div>
          <h1 className="font-display text-[32px] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[40px]">
            Import a meeting.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-white/42 sm:text-[15px]">
            Use a transcript by itself, or pair it with audio for playback. The transcript always
            supplies speaker names, timestamps, and the text analyzed by Echo.
          </p>
        </section>

        <TranscriptUploadFlow />
      </div>
    </AppShell>
  );
}
