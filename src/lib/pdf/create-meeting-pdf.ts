import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { PublicSharedMeeting } from "@/types/meeting";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ORANGE = rgb(0.96, 0.35, 0.08);
const INK = rgb(0.09, 0.1, 0.14);
const MUTED = rgb(0.39, 0.42, 0.48);
const PALE = rgb(0.95, 0.96, 0.97);
const LINE = rgb(0.87, 0.88, 0.9);

function safeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7e\xa0-\xff]/g, "?");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = safeText(text).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = words[0];

  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

export async function createMeetingPdf(meeting: PublicSharedMeeting) {
  const document = await PDFDocument.create();
  document.setTitle(safeText(meeting.title));
  document.setAuthor("Echo");
  document.setSubject("Shared meeting recap");
  document.setCreator("Echo meeting intelligence");

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page!: PDFPage;
  let y = 0;

  const addPage = () => {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 7, width: PAGE_WIDTH, height: 7, color: ORANGE });
    page.drawText("ECHO", { x: MARGIN, y: PAGE_HEIGHT - 42, size: 12, font: bold, color: INK });
    page.drawText("SHARED MEETING RECAP", {
      x: PAGE_WIDTH - MARGIN - 130,
      y: PAGE_HEIGHT - 41,
      size: 7,
      font: bold,
      color: MUTED,
    });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 54 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 54 },
      thickness: 0.7,
      color: LINE,
    });
    y = PAGE_HEIGHT - 82;
  };

  const ensureSpace = (height: number) => {
    if (y - height < 62) addPage();
  };

  const drawLines = (
    lines: string[],
    options: { x?: number; size?: number; lineHeight?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {},
  ) => {
    const x = options.x ?? MARGIN;
    const size = options.size ?? 10;
    const lineHeight = options.lineHeight ?? 15;
    const selectedFont = options.font ?? regular;
    const color = options.color ?? INK;
    for (const line of lines) {
      page.drawText(line, { x, y, size, font: selectedFont, color });
      y -= lineHeight;
    }
  };

  const drawParagraph = (text: string, maxWidth = CONTENT_WIDTH, indent = 0) => {
    const lines = wrapText(text, regular, 10, maxWidth);
    ensureSpace(lines.length * 15 + 4);
    drawLines(lines, { x: MARGIN + indent, size: 10, lineHeight: 15, color: MUTED });
  };

  const drawSectionTitle = (title: string, subtitle?: string) => {
    ensureSpace(subtitle ? 50 : 36);
    y -= 12;
    page.drawRectangle({ x: MARGIN, y: y - 2, width: 4, height: 18, color: ORANGE });
    page.drawText(safeText(title), { x: MARGIN + 13, y, size: 14, font: bold, color: INK });
    y -= 22;
    if (subtitle) {
      page.drawText(safeText(subtitle), { x: MARGIN + 13, y, size: 8, font: regular, color: MUTED });
      y -= 15;
    }
  };

  addPage();
  const titleLines = wrapText(meeting.title, bold, 25, CONTENT_WIDTH);
  ensureSpace(titleLines.length * 31 + 72);
  drawLines(titleLines, { size: 25, lineHeight: 31, font: bold, color: INK });
  y -= 8;
  page.drawText(safeText(`${meeting.date} at ${meeting.time}  |  ${meeting.duration}`), {
    x: MARGIN,
    y,
    size: 9,
    font: regular,
    color: MUTED,
  });
  y -= 20;
  const participantText = meeting.participants.length
    ? `Participants: ${meeting.participants.map((participant) => participant.name).join(", ")}`
    : "Participants: None listed";
  drawParagraph(participantText);

  drawSectionTitle("Meeting summary", "PURPOSE");
  drawParagraph(meeting.purpose);

  drawSectionTitle("Key takeaways");
  if (!meeting.takeaways.length) drawParagraph("No key takeaways were captured.");
  for (const takeaway of meeting.takeaways) {
    const lines = wrapText(takeaway, regular, 10, CONTENT_WIDTH - 22);
    ensureSpace(lines.length * 15 + 8);
    page.drawCircle({ x: MARGIN + 4, y: y + 4, size: 2.2, color: ORANGE });
    drawLines(lines, { x: MARGIN + 18, size: 10, lineHeight: 15, color: MUTED });
    y -= 5;
  }

  drawSectionTitle("Decisions");
  if (!meeting.decisions.length) drawParagraph("No explicit decisions were captured.");
  meeting.decisions.forEach((decision, index) => {
    const lines = wrapText(decision, regular, 10, CONTENT_WIDTH - 34);
    const blockHeight = lines.length * 15 + 18;
    ensureSpace(blockHeight + 7);
    const blockTop = y + 10;
    page.drawRectangle({ x: MARGIN, y: blockTop - blockHeight, width: CONTENT_WIDTH, height: blockHeight, color: PALE });
    page.drawText(String(index + 1).padStart(2, "0"), { x: MARGIN + 12, y: y - 6, size: 8, font: bold, color: ORANGE });
    y -= 5;
    drawLines(lines, { x: MARGIN + 38, size: 10, lineHeight: 15, color: INK });
    y = blockTop - blockHeight - 7;
  });

  drawSectionTitle("Action items", `${meeting.actionItems.length} FOLLOW-UPS`);
  if (!meeting.actionItems.length) drawParagraph("No action items were captured.");
  for (const item of meeting.actionItems) {
    const taskLines = wrapText(item.task, regular, 10, CONTENT_WIDTH - 24);
    const blockHeight = taskLines.length * 15 + 38;
    ensureSpace(blockHeight + 8);
    const blockTop = y + 10;
    page.drawRectangle({
      x: MARGIN,
      y: blockTop - blockHeight,
      width: CONTENT_WIDTH,
      height: blockHeight,
      borderColor: LINE,
      borderWidth: 0.7,
    });
    y -= 4;
    drawLines(taskLines, { x: MARGIN + 12, size: 10, lineHeight: 15, color: INK });
    page.drawText(safeText(`Owner: ${item.owner}  |  Due: ${item.deadline}  |  ${item.timestamp}`), {
      x: MARGIN + 12,
      y: y - 3,
      size: 8,
      font: regular,
      color: MUTED,
    });
    y = blockTop - blockHeight - 8;
  }

  drawSectionTitle("Highlights", `${meeting.highlights.length} NOTABLE MOMENTS`);
  if (!meeting.highlights.length) drawParagraph("No highlights were captured.");
  for (const highlight of meeting.highlights) {
    const title = `${highlight.label.toUpperCase()}  |  ${highlight.timestamp}  |  ${highlight.title}`;
    const titleLines = wrapText(title, bold, 9, CONTENT_WIDTH);
    const detailLines = wrapText(highlight.detail, regular, 10, CONTENT_WIDTH);
    ensureSpace(titleLines.length * 13 + detailLines.length * 15 + 14);
    drawLines(titleLines, { size: 9, lineHeight: 13, font: bold, color: ORANGE });
    drawLines(detailLines, { size: 10, lineHeight: 15, color: MUTED });
    y -= 8;
  }

  const pages = document.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawLine({
      start: { x: MARGIN, y: 45 },
      end: { x: PAGE_WIDTH - MARGIN, y: 45 },
      thickness: 0.7,
      color: LINE,
    });
    currentPage.drawText("Public, read-only meeting recap", {
      x: MARGIN,
      y: 29,
      size: 7,
      font: regular,
      color: MUTED,
    });
    const pageNumber = `${index + 1} / ${pages.length}`;
    currentPage.drawText(pageNumber, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(pageNumber, 7),
      y: 29,
      size: 7,
      font: regular,
      color: MUTED,
    });
  });

  return document.save();
}
