import { answerMeetingQuestion } from "@/lib/ai/answer-meeting-question";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_QUESTION_LENGTH = 500;

export async function POST(
  request: Request,
  context: RouteContext<"/api/meetings/[id]/ask">,
) {
  const { id } = await context.params;
  const slug = id.trim();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "A JSON question is required." }, { status: 400 });
  }

  const question =
    body && typeof body === "object" && "question" in body && typeof body.question === "string"
      ? body.question.trim()
      : "";
  if (!slug || !question) {
    return Response.json({ error: "Enter a question about this meeting." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return Response.json(
      { error: `Questions must be ${MAX_QUESTION_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  try {
    const { data: meeting, error } = await createAdminClient()
      .from("meetings")
      .select(`
        title,
        short_summary,
        status,
        summaries(purpose, key_takeaways, decisions),
        action_items(task, owner_name, deadline, timestamp_seconds, sort_order),
        transcript_segments(id, speaker_name, start_seconds, text, sort_order)
      `)
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    if (!meeting) {
      return Response.json({ error: "Meeting not found." }, { status: 404 });
    }
    if (meeting.status !== "ready") {
      return Response.json(
        { error: "This meeting must finish processing before you can ask questions." },
        { status: 409 },
      );
    }

    const summary = meeting.summaries;
    const answer = await answerMeetingQuestion(question, {
      title: meeting.title,
      summary: meeting.short_summary,
      purpose: summary?.purpose ?? null,
      keyTakeaways: summary?.key_takeaways ?? [],
      decisions: summary?.decisions ?? [],
      actionItems: [...meeting.action_items]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((item) => ({
          task: item.task,
          owner: item.owner_name,
          deadline: item.deadline,
          timestampSeconds: item.timestamp_seconds,
        })),
      transcript: [...meeting.transcript_segments]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((segment) => ({
          id: segment.id,
          speaker: segment.speaker_name,
          startSeconds: segment.start_seconds,
          text: segment.text,
        })),
    });

    return Response.json(answer, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to answer meeting question:", error);
    return Response.json(
      { error: "Ask AI could not answer safely. Please try again." },
      { status: 502 },
    );
  }
}
