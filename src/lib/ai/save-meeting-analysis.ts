import "server-only";

import type { MeetingAnalysis } from "@/lib/ai/analyze-transcript";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveMeetingAnalysis(
  meetingId: string,
  participantByName: Map<string, string>,
  analysis: MeetingAnalysis,
) {
  const supabase = createAdminClient();
  const { error: summaryError } = await supabase.from("summaries").insert({
    meeting_id: meetingId,
    purpose: analysis.understanding.purpose,
    key_takeaways: analysis.understanding.keyTakeaways,
    topics: analysis.understanding.topics,
    decisions: analysis.understanding.decisions,
  });
  if (summaryError) throw summaryError;

  if (analysis.actionItems.length) {
    const { error } = await supabase.from("action_items").insert(
      analysis.actionItems.map((item, index) => ({
        meeting_id: meetingId,
        task: item.task,
        owner_participant_id: item.assignee
          ? participantByName.get(item.assignee.toLocaleLowerCase()) ?? null
          : null,
        owner_name: item.assignee,
        deadline: item.deadline,
        timestamp_seconds: item.sourceTimestampSeconds,
        status: "open" as const,
        sort_order: index,
      })),
    );
    if (error) throw error;
  }

  if (analysis.highlights.length) {
    const { error } = await supabase.from("highlights").insert(
      analysis.highlights.map((item, index) => ({
        meeting_id: meetingId,
        label: item.label,
        title: item.label ?? "Important moment",
        detail: item.importantMoment,
        timestamp_seconds: item.sourceTimestampSeconds,
        sort_order: index,
      })),
    );
    if (error) throw error;
  }

  const { error: meetingError } = await supabase
    .from("meetings")
    .update({
      short_summary: analysis.understanding.summary,
      status: "ready",
      error_message: null,
    })
    .eq("id", meetingId);
  if (meetingError) throw meetingError;
}
