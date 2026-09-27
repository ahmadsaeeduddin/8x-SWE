export const MAX_TRANSCRIPT_FILE_BYTES = 2_000_000;
export const TRANSCRIPT_FILE_ACCEPT = ".txt,.json,application/json,text/plain";

const MAX_SEGMENTS = 10_000;
const MAX_TITLE_LENGTH = 200;

export type NormalizedTranscriptSegment = {
  speaker: string;
  startSeconds: number;
  endSeconds: number | null;
  text: string;
};

export type ParsedTranscript = {
  title: string;
  startsAt: string | null;
  durationSeconds: number;
  participants: string[];
  segments: NormalizedTranscriptSegment[];
  format: "json" | "txt";
};

export type TranscriptParseResult =
  | { success: true; data: ParsedTranscript }
  | { success: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueParticipants(segments: NormalizedTranscriptSegment[]) {
  const names = new Map<string, string>();

  for (const segment of segments) {
    const key = segment.speaker.toLocaleLowerCase();
    if (!names.has(key)) names.set(key, segment.speaker);
  }

  return [...names.values()];
}

function normalizeStartsAt(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T09:00:00+05:00`
    : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function validateTitle(
  value: unknown,
): { success: true; title: string } | { success: false; error: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { success: false, error: 'A non-empty "title" is required.' };
  }

  const title = value.trim();
  if (title.length > MAX_TITLE_LENGTH) {
    return {
      success: false,
      error: `The meeting title must be ${MAX_TITLE_LENGTH} characters or fewer.`,
    };
  }

  return { success: true, title };
}

function deriveDuration(
  segments: NormalizedTranscriptSegment[],
  providedDuration?: unknown,
): number | null {
  const transcriptEnd = Math.max(
    ...segments.map((segment) => segment.endSeconds ?? segment.startSeconds + 1),
  );

  if (providedDuration === undefined || providedDuration === null) {
    return Math.max(1, transcriptEnd);
  }

  if (
    typeof providedDuration !== "number" ||
    !Number.isInteger(providedDuration) ||
    providedDuration < transcriptEnd
  ) {
    return null;
  }

  return providedDuration;
}

function parseJsonTranscript(source: string): TranscriptParseResult {
  let value: unknown;

  try {
    value = JSON.parse(source.replace(/^\uFEFF/, ""));
  } catch {
    return { success: false, error: "The JSON file is not valid JSON." };
  }

  if (!isRecord(value)) {
    return { success: false, error: "The JSON root must be an object." };
  }

  const titleResult = validateTitle(value.title);
  if (!titleResult.success) return { success: false, error: titleResult.error };

  if (!Array.isArray(value.segments) || value.segments.length === 0) {
    return { success: false, error: 'A non-empty "segments" array is required.' };
  }

  if (value.segments.length > MAX_SEGMENTS) {
    return { success: false, error: `A transcript can contain at most ${MAX_SEGMENTS} segments.` };
  }

  const segments: NormalizedTranscriptSegment[] = [];
  let previousStart = -1;

  for (const [index, rawSegment] of value.segments.entries()) {
    if (!isRecord(rawSegment)) {
      return { success: false, error: `Segment ${index + 1} must be an object.` };
    }

    const speaker = typeof rawSegment.speaker === "string" ? rawSegment.speaker.trim() : "";
    const text = typeof rawSegment.text === "string" ? rawSegment.text.trim() : "";
    const startSeconds = rawSegment.start_time_seconds;
    const endSeconds = rawSegment.end_time_seconds;

    if (!speaker) {
      return { success: false, error: `Segment ${index + 1} needs a speaker.` };
    }
    if (!text) {
      return { success: false, error: `Segment ${index + 1} needs transcript text.` };
    }
    if (typeof startSeconds !== "number" || !Number.isInteger(startSeconds) || startSeconds < 0) {
      return {
        success: false,
        error: `Segment ${index + 1} needs a non-negative integer start_time_seconds.`,
      };
    }
    if (startSeconds < previousStart) {
      return { success: false, error: `Segment ${index + 1} is out of timestamp order.` };
    }
    if (
      endSeconds !== undefined &&
      endSeconds !== null &&
      (typeof endSeconds !== "number" || !Number.isInteger(endSeconds) || endSeconds < startSeconds)
    ) {
      return {
        success: false,
        error: `Segment ${index + 1} has an invalid end_time_seconds.`,
      };
    }

    segments.push({
      speaker,
      startSeconds,
      endSeconds: typeof endSeconds === "number" ? endSeconds : null,
      text,
    });
    previousStart = startSeconds;
  }

  const startsAt = normalizeStartsAt(value.meeting_date ?? value.date);
  if (startsAt === undefined) {
    return { success: false, error: "meeting_date must be a valid date or ISO timestamp." };
  }

  const durationSeconds = deriveDuration(segments, value.duration_seconds);
  if (durationSeconds === null) {
    return {
      success: false,
      error: "duration_seconds must be an integer that reaches the end of the transcript.",
    };
  }

  return {
    success: true,
    data: {
      title: titleResult.title,
      startsAt,
      durationSeconds,
      participants: uniqueParticipants(segments),
      segments,
      format: "json",
    },
  };
}

function timestampToSeconds(timestamp: string) {
  const parts = timestamp.split(":").map(Number);
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (seconds >= 60) return null;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (minutes >= 60 || seconds >= 60) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

function parseDurationLabel(value: string | null) {
  if (!value) return null;
  const hours = Number(value.match(/(\d+)\s*(?:hours?|hrs?|hr)/i)?.[1] ?? 0);
  const minutes = Number(value.match(/(\d+)\s*(?:minutes?|mins?|min)/i)?.[1] ?? 0);
  const seconds = Number(value.match(/(\d+)\s*(?:seconds?|secs?|sec)/i)?.[1] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

function getTextMetadata(source: string, label: string) {
  const match = source.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() ?? null;
}

function parseTextTranscript(source: string): TranscriptParseResult {
  const content = source.replace(/^\uFEFF/, "").split(/^Expected test facts:/im)[0];
  const titleResult = validateTitle(getTextMetadata(content, "Meeting Title"));
  if (!titleResult.success) {
    return { success: false, error: 'TXT files must begin with "Meeting Title: ...".' };
  }

  const rawSegments: Array<{
    speaker: string;
    startSeconds: number;
    textParts: string[];
  }> = [];
  let current: (typeof rawSegments)[number] | null = null;

  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(/^\[((?:\d{1,2}:)?\d{1,2}:\d{2})\]\s+([^:]+):\s*$/);

    if (heading) {
      const startSeconds = timestampToSeconds(heading[1]);
      if (startSeconds === null) {
        return { success: false, error: `Invalid timestamp: ${heading[1]}.` };
      }

      current = { speaker: heading[2].trim(), startSeconds, textParts: [] };
      rawSegments.push(current);
    } else if (current && line.trim()) {
      current.textParts.push(line.trim());
    }
  }

  if (rawSegments.length === 0) {
    return {
      success: false,
      error: "No transcript segments were found. Use [MM:SS] Speaker: headings.",
    };
  }

  if (rawSegments.length > MAX_SEGMENTS) {
    return { success: false, error: `A transcript can contain at most ${MAX_SEGMENTS} segments.` };
  }

  const declaredDuration = parseDurationLabel(getTextMetadata(content, "Duration"));
  const segments: NormalizedTranscriptSegment[] = [];

  for (const [index, segment] of rawSegments.entries()) {
    const text = segment.textParts.join(" ").trim();
    const nextStart = rawSegments[index + 1]?.startSeconds;

    if (!segment.speaker) {
      return { success: false, error: `Segment ${index + 1} needs a speaker.` };
    }
    if (!text) {
      return { success: false, error: `Segment ${index + 1} needs transcript text.` };
    }
    if (index > 0 && segment.startSeconds < rawSegments[index - 1].startSeconds) {
      return { success: false, error: `Segment ${index + 1} is out of timestamp order.` };
    }

    segments.push({
      speaker: segment.speaker,
      startSeconds: segment.startSeconds,
      endSeconds:
        nextStart ??
        (declaredDuration && declaredDuration >= segment.startSeconds ? declaredDuration : null),
      text,
    });
  }

  const dateValue = getTextMetadata(content, "Date");
  const startsAt = normalizeStartsAt(dateValue);
  if (startsAt === undefined) {
    return { success: false, error: "Date must use YYYY-MM-DD or a valid ISO timestamp." };
  }

  const durationSeconds = deriveDuration(segments, declaredDuration ?? undefined);
  if (durationSeconds === null) {
    return { success: false, error: "Duration must reach the end of the transcript." };
  }

  return {
    success: true,
    data: {
      title: titleResult.title,
      startsAt,
      durationSeconds,
      participants: uniqueParticipants(segments),
      segments,
      format: "txt",
    },
  };
}

export function parseTranscriptFile(fileName: string, source: string): TranscriptParseResult {
  const extension = fileName.toLocaleLowerCase().split(".").pop();

  if (extension !== "json" && extension !== "txt") {
    return { success: false, error: "Only .json and .txt transcript files are accepted." };
  }

  if (!source.trim()) {
    return { success: false, error: "The transcript file is empty." };
  }

  return extension === "json" ? parseJsonTranscript(source) : parseTextTranscript(source);
}
