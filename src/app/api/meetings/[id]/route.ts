import { createAdminClient } from "@/lib/supabase/admin";

type ParticipantLink = {
  participant_id: string;
};

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/meetings/[id]">,
) {
  const { id } = await context.params;
  const slug = id.trim();

  if (!slug) {
    return Response.json({ error: "Meeting ID is required." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (meetingError) {
      console.error("Unable to look up meeting for deletion:", meetingError);
      return Response.json(
        { error: "The meeting could not be deleted." },
        { status: 500 },
      );
    }

    if (!meeting) {
      return Response.json({ error: "Meeting not found." }, { status: 404 });
    }

    const { data: participantLinks, error: participantLinksError } = await supabase
      .from("meeting_participants")
      .select("participant_id")
      .eq("meeting_id", meeting.id);

    if (participantLinksError) {
      console.error(
        "Unable to load participant links before deletion:",
        participantLinksError,
      );
      return Response.json(
        { error: "The meeting could not be deleted." },
        { status: 500 },
      );
    }

    const participantIds = [
      ...new Set(
        ((participantLinks ?? []) as ParticipantLink[]).map(
          (link) => link.participant_id,
        ),
      ),
    ];

    const { error: deleteError } = await supabase
      .from("meetings")
      .delete()
      .eq("id", meeting.id);

    if (deleteError) {
      console.error("Unable to delete meeting:", deleteError);
      return Response.json(
        { error: "The meeting could not be deleted." },
        { status: 500 },
      );
    }

    // Meeting-owned rows are removed by foreign-key cascades. Participant records
    // are shared, so only remove those that no longer belong to another meeting.
    if (participantIds.length > 0) {
      const { data: remainingLinks, error: remainingLinksError } = await supabase
        .from("meeting_participants")
        .select("participant_id")
        .in("participant_id", participantIds);

      if (remainingLinksError) {
        console.error(
          "Meeting deleted, but orphan participant cleanup failed:",
          remainingLinksError,
        );
      } else {
        const linkedParticipantIds = new Set(
          ((remainingLinks ?? []) as ParticipantLink[]).map(
            (link) => link.participant_id,
          ),
        );
        const orphanParticipantIds = participantIds.filter(
          (participantId) => !linkedParticipantIds.has(participantId),
        );

        if (orphanParticipantIds.length > 0) {
          const { error: cleanupError } = await supabase
            .from("participants")
            .delete()
            .in("id", orphanParticipantIds);

          if (cleanupError) {
            console.error(
              "Meeting deleted, but orphan participant cleanup failed:",
              cleanupError,
            );
          }
        }
      }
    }

    return Response.json({ deleted: true, meetingId: meeting.id });
  } catch (error) {
    console.error("Unexpected meeting deletion error:", error);
    return Response.json(
      { error: "The meeting could not be deleted." },
      { status: 500 },
    );
  }
}
