import { createMeetingPdf } from "@/lib/pdf/create-meeting-pdf";
import { getPublicMeetingShare } from "@/lib/shares/get-public-meeting-share";

function downloadName(title: string) {
  const safeTitle = title
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${safeTitle || "meeting"}-recap.pdf`;
}

export async function GET(
  _request: Request,
  context: RouteContext<"/share/[token]/download">,
) {
  const { token } = await context.params;
  const meeting = await getPublicMeetingShare(token);
  if (!meeting) {
    return Response.json({ error: "Share link not found." }, { status: 404 });
  }

  const pdf = await createMeetingPdf(meeting);
  const body = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(body).set(pdf);
  return new Response(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${downloadName(meeting.title)}"`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
