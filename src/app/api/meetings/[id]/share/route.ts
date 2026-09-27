import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function createShareToken() {
  return `share_${randomBytes(24).toString("base64url")}`;
}

export async function POST(
  _request: Request,
  context: RouteContext<"/api/meetings/[id]/share">,
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
      .select("id, status")
      .eq("slug", slug)
      .maybeSingle();

    if (meetingError) throw meetingError;
    if (!meeting) {
      return Response.json({ error: "Meeting not found." }, { status: 404 });
    }
    if (meeting.status !== "ready") {
      return Response.json(
        { error: "The meeting must finish processing before it can be shared." },
        { status: 409 },
      );
    }

    const token = createShareToken();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { error: shareError } = await supabase.from("meeting_shares").insert({
      meeting_id: meeting.id,
      token_hash: tokenHash,
      token_hint: token.slice(-8),
    });
    if (shareError) throw shareError;

    const { error: visibilityError } = await supabase
      .from("meetings")
      .update({ visibility: "unlisted" })
      .eq("id", meeting.id);
    if (visibilityError) {
      await supabase.from("meeting_shares").delete().eq("token_hash", tokenHash);
      throw visibilityError;
    }

    return Response.json(
      { token, sharePath: `/share/${token}` },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unable to create meeting share:", error);
    return Response.json(
      { error: "The public share link could not be created." },
      { status: 500 },
    );
  }
}
