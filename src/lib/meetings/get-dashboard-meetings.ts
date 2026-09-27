import "server-only";

import { connection } from "next/server";
import { meetings as mockMeetings } from "@/lib/mock-meetings";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DashboardStats, MeetingAccent, MeetingPreview } from "@/types/meeting";

const DISPLAY_TIME_ZONE = "Asia/Karachi";
const DEFAULT_WAVEFORMS = [
  [28, 45, 66, 38, 78, 52, 34, 72, 92, 48, 64, 36, 58, 84, 46, 70, 32, 56],
  [48, 34, 60, 88, 44, 72, 38, 58, 80, 54, 32, 66, 42, 74, 50, 90, 62, 36],
  [34, 62, 42, 74, 52, 86, 46, 68, 38, 80, 58, 36, 72, 50, 92, 44, 64, 30],
];

const AVATAR_COLORS = [
  "bg-[#f18f62]",
  "bg-[#6b9bd2]",
  "bg-[#9b7bd8]",
  "bg-[#58b8ba]",
  "bg-[#cd7fae]",
  "bg-[#6baf8e]",
];

const AVATAR_COLOR_CLASSES: Record<string, string> = {
  "#f18f62": "bg-[#f18f62]",
  "#6b9bd2": "bg-[#6b9bd2]",
  "#9b7bd8": "bg-[#9b7bd8]",
  "#58b8ba": "bg-[#58b8ba]",
  "#cd7fae": "bg-[#cd7fae]",
  "#738cce": "bg-[#738cce]",
  "#c98b55": "bg-[#c98b55]",
  "#7f81cd": "bg-[#7f81cd]",
  "#6baf8e": "bg-[#6baf8e]",
};

const EMPTY_STATS: DashboardStats = {
  meetingCount: 0,
  totalDurationSeconds: 0,
  insightCount: 0,
  actionItemCount: 0,
  readyCount: 0,
};

export type DashboardMeetingsResult = {
  meetings: MeetingPreview[];
  stats: DashboardStats;
  state: "ready" | "empty" | "error";
  source: "supabase" | "mock";
};

function formatDate(startsAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(startsAt));
}

function formatTime(startsAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(startsAt));
}

function formatDuration(durationSeconds: number) {
  const totalMinutes = Math.max(0, Math.round(durationSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${totalMinutes} min`;
  }

  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

function getMockDurationSeconds(duration: string) {
  const hours = Number(duration.match(/(\d+)\s*hr/)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+)\s*min/)?.[1] ?? 0);
  return hours * 3600 + minutes * 60;
}

function getMockResult(): DashboardMeetingsResult {
  const actionItemCount = mockMeetings.reduce((total, meeting) => total + meeting.actionItems, 0);
  const highlightCount = mockMeetings.reduce((total, meeting) => total + meeting.highlights, 0);

  return {
    meetings: mockMeetings,
    stats: {
      meetingCount: mockMeetings.length,
      totalDurationSeconds: mockMeetings.reduce(
        (total, meeting) => total + getMockDurationSeconds(meeting.duration),
        0,
      ),
      insightCount: actionItemCount + highlightCount,
      actionItemCount,
      readyCount: mockMeetings.length,
    },
    state: "ready",
    source: "mock",
  };
}

function shouldUseDevelopmentFallback() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_DEVELOPMENT_MOCK_FALLBACK === "true"
  );
}

function getAvatarColor(avatarColor: string | null, participantIndex: number) {
  if (avatarColor) {
    const colorClass = AVATAR_COLOR_CLASSES[avatarColor.toLowerCase()];

    if (colorClass) {
      return colorClass;
    }
  }

  return AVATAR_COLORS[participantIndex % AVATAR_COLORS.length];
}

export async function getDashboardMeetings(): Promise<DashboardMeetingsResult> {
  await connection();

  try {
    const { data, error } = await createAdminClient()
      .from("meetings")
      .select(
        `
          id,
          slug,
          title,
          short_summary,
          starts_at,
          duration_seconds,
          accent,
          meeting_participants (
            sort_order,
            participant:participants (name, initials, avatar_color)
          ),
          recordings (waveform, is_primary),
          summaries (topics),
          action_items (id),
          highlights (id)
        `,
      )
      .eq("status", "ready")
      .order("starts_at", { ascending: false })
      .abortSignal(AbortSignal.timeout(8_000));

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      if (shouldUseDevelopmentFallback()) {
        console.warn("[dashboard] Supabase returned no meetings; using the development mock fallback.");
        return getMockResult();
      }

      return { meetings: [], stats: EMPTY_STATS, state: "empty", source: "supabase" };
    }

    let totalDurationSeconds = 0;
    let actionItemCount = 0;
    let highlightCount = 0;

    const meetings = data.map((meeting, meetingIndex): MeetingPreview => {
      const participants = [...meeting.meeting_participants]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((link, participantIndex) => ({
          name: link.participant.name,
          initials: link.participant.initials,
          color: getAvatarColor(link.participant.avatar_color, participantIndex),
        }));
      const primaryRecording =
        meeting.recordings.find((recording) => recording.is_primary) ?? meeting.recordings[0];
      const waveform = primaryRecording?.waveform.length
        ? primaryRecording.waveform
        : DEFAULT_WAVEFORMS[meetingIndex % DEFAULT_WAVEFORMS.length];
      const accent: MeetingAccent = meeting.accent ?? "orange";

      totalDurationSeconds += meeting.duration_seconds;
      actionItemCount += meeting.action_items.length;
      highlightCount += meeting.highlights.length;

      return {
        id: meeting.slug,
        title: meeting.title,
        summary: meeting.short_summary ?? "This meeting is ready to review.",
        date: formatDate(meeting.starts_at),
        time: formatTime(meeting.starts_at),
        duration: formatDuration(meeting.duration_seconds),
        participantCount: participants.length,
        participants: participants.slice(0, 3),
        topics: meeting.summaries?.topics.slice(0, 3) ?? [],
        actionItems: meeting.action_items.length,
        highlights: meeting.highlights.length,
        accent,
        waveform,
      };
    });

    return {
      meetings,
      stats: {
        meetingCount: meetings.length,
        totalDurationSeconds,
        insightCount: actionItemCount + highlightCount,
        actionItemCount,
        readyCount: meetings.length,
      },
      state: "ready",
      source: "supabase",
    };
  } catch (error) {
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unknown data service error";
    console.error(`[dashboard] Failed to load meetings from Supabase: ${errorMessage}`);

    if (shouldUseDevelopmentFallback()) {
      console.warn("[dashboard] Using the development mock fallback after a Supabase error.");
      return getMockResult();
    }

    return { meetings: [], stats: EMPTY_STATS, state: "error", source: "supabase" };
  }
}
