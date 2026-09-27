import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SearchResponse, SearchResult } from "@/types/search";

const MAX_QUERY_LENGTH = 200;
const RESULT_LIMIT = 20;
const DISPLAY_TIME_ZONE = "Asia/Karachi";

function formatDate(startsAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(startsAt));
}

function formatDuration(durationSeconds: number) {
  const totalMinutes = Math.max(0, Math.round(durationSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${totalMinutes} min`;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

function formatTimestamp(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function stripHeadlineMarkup(snippet: string) {
  return snippet.replaceAll("<mark>", "").replaceAll("</mark>", "");
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return Response.json({ results: [] } satisfies SearchResponse);
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return Response.json({ error: "Search query is too long." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: rankedMatches, error: searchError } = await supabase.rpc(
      "search_meeting_content",
      {
        search_query: query,
        result_limit: RESULT_LIMIT,
      },
    ).abortSignal(AbortSignal.timeout(8_000));

    if (searchError) throw searchError;

    if (!rankedMatches || rankedMatches.length === 0) {
      return Response.json({ results: [] } satisfies SearchResponse);
    }

    const meetingIds = [...new Set(rankedMatches.map((match) => match.meeting_id))];
    const { data: meetings, error: meetingError } = await supabase
      .from("meetings")
      .select("id, slug, starts_at, duration_seconds, meeting_participants(participant_id)")
      .in("id", meetingIds)
      .eq("status", "ready")
      .abortSignal(AbortSignal.timeout(8_000));

    if (meetingError) throw meetingError;

    const meetingById = new Map((meetings ?? []).map((meeting) => [meeting.id, meeting]));
    const results = rankedMatches.flatMap<SearchResult>((match) => {
      const meeting = meetingById.get(match.meeting_id);
      if (!meeting) return [];

      if (match.result_type === "meeting") {
        const participantLabel =
          meeting.meeting_participants.length === 1 ? "participant" : "participants";

        return [
          {
            id: `meeting-${match.meeting_id}`,
            kind: "meeting",
            title: match.meeting_title,
            detail: stripHeadlineMarkup(match.snippet),
            meta: `${formatDate(meeting.starts_at)} · ${formatDuration(meeting.duration_seconds)} · ${meeting.meeting_participants.length} ${participantLabel}`,
            href: `/meetings/${meeting.slug}`,
          },
        ];
      }

      if (!match.transcript_segment_id) return [];

      return [
        {
          id: match.transcript_segment_id,
          kind: "transcript",
          title: match.meeting_title,
          detail: stripHeadlineMarkup(match.snippet),
          meta: match.meeting_title,
          href: `/meetings/${meeting.slug}#${match.transcript_segment_id}`,
          speaker: match.speaker_name ?? "Unknown speaker",
          timestamp: formatTimestamp(match.start_seconds ?? 0),
        },
      ];
    });

    return Response.json(
      { results } satisfies SearchResponse,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unknown search error";
    console.error(`[search] Supabase search failed: ${message}`);

    return Response.json({ error: "Search is temporarily unavailable." }, { status: 500 });
  }
}
