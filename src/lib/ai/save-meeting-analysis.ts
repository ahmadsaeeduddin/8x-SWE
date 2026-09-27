import "server-only";

import type { MeetingAnalysis } from "@/lib/ai/analyze-meeting";
import { createAdminClient } from "@/lib/supabase/admin";

type SaveMeetingAnalysisInput = {
  meetingId: string;
  participantIdsByName: Map<string, string>;
  analysis: MeetingAnalysis;
};

export async function saveMeetingAnalysis({
  meetingId,
  participantIdsByName,
  analysis,
}: SaveMeetingAnalysisInput) {
  const supabase = createAdminClient();
  const { error: summaryError } = await supabase.from("summaries").upsert({
    meeting_id: meetingId,
    purpose: analysis.understanding.purpose,
    key_takeaways: analysis.understanding.key_takeaways,
    topics: analysis.understanding.topics,
    decisions: analysis.understanding.decisions,
  });
  if (summaryError) throw summaryError;

  if (analysis.actionItems.length) {
    const { error } = await supabase.from("action_items").insert(
      analysis.actionItems.map((item, index) => ({
        meeting_id: meetingId,
        task: item.task,
        owner_name: item.assignee,
        owner_participant_id: item.assignee
          ? (participantIdsByName.get(item.assignee.toLocaleLowerCase()) ?? null)
          : null,
        deadline: item.deadline,
        timestamp_seconds: item.source_timestamp_seconds,
        status: "open" as const,
        sort_order: index,
      })),
    );
    if (error) throw error;
  }

  if (analysis.highlights.length) {
    const { error } = await supabase.from("highlights").insert(
      analysis.highlights.map((highlight, index) => ({
        meeting_id: meetingId,
        label: highlight.label,
        title: highlight.important_moment,
        detail: highlight.important_moment,
        timestamp_seconds: highlight.source_timestamp_seconds,
        sort_order: index,
      })),
    );
    if (error) throw error;
  }

  const { error: readyError } = await supabase
    .from("meetings")
    .update({
      short_summary: analysis.understanding.summary,
      status: "ready",
      error_message: null,
    })
    .eq("id", meetingId);
  if (readyError) throw readyError;
}

export async function clearMeetingAnalysis(meetingId: string) {
  const supabase = createAdminClient();
  const tables = ["summaries", "action_items", "highlights"] as const;
  const results = await Promise.all(
    tables.map((table) => supabase.from(table).delete().eq("meeting_id", meetingId)),
  );
  const cleanupError = results.find((result) => result.error)?.error;

  if (cleanupError) {
    console.error(
      `[meeting-analysis] Failed to clear partial analysis for ${meetingId}: ${cleanupError.message}`,
    );
  }
}
