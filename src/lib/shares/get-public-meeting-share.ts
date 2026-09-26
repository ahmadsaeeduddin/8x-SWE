import "server-only";

import { createHash } from "node:crypto";
import { cache } from "react";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicSharedMeeting } from "@/types/meeting";

const DISPLAY_TIME_ZONE = "Asia/Karachi";
const MAX_TOKEN_LENGTH = 512;
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

function getAvatarColor(avatarColor: string | null | undefined, index: number) {
  if (avatarColor) {
    const colorClass = AVATAR_COLOR_CLASSES[avatarColor.toLowerCase()];
    if (colorClass) return colorClass;
  }

  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function formatTimestamp(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatDuration(durationSeconds: number) {
  const totalMinutes = Math.max(0, Math.round(durationSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${totalMinutes} min`;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

function formatDeadline(deadline: string | null) {
  if (!deadline) return "No deadline";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${deadline}T00:00:00Z`));
}

function formatRole(role: string | null) {
  if (!role) return "Participant";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export const getPublicMeetingShare = cache(
  async (rawToken: string): Promise<PublicSharedMeeting | null> => {
    await connection();

    if (!rawToken || rawToken.length > MAX_TOKEN_LENGTH) return null;

    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const { data: share, error } = await createAdminClient()
      .from("meeting_shares")
      .select(`
        expires_at,
        revoked_at,
        meeting:meetings(
          slug,
          title,
          starts_at,
          duration_seconds,
          status,
          meeting_participants(
            role,
            sort_order,
            participant:participants(name, initials, avatar_color)
          ),
          summaries(purpose, key_takeaways, decisions),
          action_items(
            id,
            task,
            owner_name,
            deadline,
            timestamp_seconds,
            status,
            sort_order,
            owner:participants!action_items_owner_participant_id_fkey(name, initials, avatar_color)
          ),
          highlights(id, label, title, detail, timestamp_seconds, sort_order)
        )
      `)
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .abortSignal(AbortSignal.timeout(8_000))
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to load public meeting share: ${error.message}`);
    }

    if (
      !share ||
      !share.meeting ||
      share.meeting.status !== "ready" ||
      (share.expires_at && new Date(share.expires_at).getTime() <= Date.now())
    ) {
      return null;
    }

    const meeting = share.meeting;
    const participants = [...meeting.meeting_participants]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((link, index) => ({
        name: link.participant.name,
        initials: link.participant.initials,
        color: getAvatarColor(link.participant.avatar_color, index),
        role: formatRole(link.role),
      }));
    const participantColorByName = new Map(
      participants.map((participant) => [participant.name, participant.color]),
    );
    const summary = meeting.summaries;
    const startsAt = new Date(meeting.starts_at);

    return {
      id: meeting.slug,
      title: meeting.title,
      date: new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: DISPLAY_TIME_ZONE,
      }).format(startsAt),
      time: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: DISPLAY_TIME_ZONE,
      }).format(startsAt),
      duration: formatDuration(meeting.duration_seconds),
      participants,
      purpose: summary?.purpose ?? "No meeting purpose is available yet.",
      takeaways: summary?.key_takeaways ?? [],
      decisions: summary?.decisions ?? [],
      actionItems: [...meeting.action_items]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((item, index) => {
          const owner = item.owner_name ?? item.owner?.name ?? "Unassigned";

          return {
            id: item.id,
            task: item.task,
            owner,
            ownerInitials: item.owner?.initials ?? initialsFor(owner),
            ownerColor:
              participantColorByName.get(owner) ?? getAvatarColor(item.owner?.avatar_color, index),
            deadline: formatDeadline(item.deadline),
            timestamp: formatTimestamp(item.timestamp_seconds ?? 0),
            timestampSeconds: item.timestamp_seconds ?? 0,
            completed: item.status === "completed",
          };
        }),
      highlights: [...meeting.highlights]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((highlight) => ({
          id: highlight.id,
          label: highlight.label ?? "Highlight",
          title: highlight.title,
          detail: highlight.detail,
          timestamp: formatTimestamp(highlight.timestamp_seconds ?? 0),
          timestampSeconds: highlight.timestamp_seconds ?? 0,
        })),
    };
  },
);
