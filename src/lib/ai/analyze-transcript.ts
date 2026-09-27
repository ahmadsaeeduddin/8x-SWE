import "server-only";

import type { ParsedTranscript } from "@/lib/transcripts/parse-transcript";

export type MeetingUnderstanding = {
  purpose: string;
  summary: string;
  keyTakeaways: string[];
  topics: string[];
  decisions: string[];
};

export type ExtractedActionItem = {
  task: string;
  assignee: string | null;
  deadline: string | null;
  sourceTimestampSeconds: number | null;
};

export type ExtractedHighlight = {
  importantMoment: string;
  label: string | null;
  sourceTimestampSeconds: number | null;
};

export type MeetingAnalysis = {
  understanding: MeetingUnderstanding;
  actionItems: ExtractedActionItem[];
  highlights: ExtractedHighlight[];
};

type OpenAIResponse = {
  error?: { message?: string };
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
};

const MAX_ANALYSIS_SOURCE_CHARS = 180_000;
const nullableStringSchema = {
  anyOf: [{ type: "string" }, { type: "null" }],
};
const nullableIntegerSchema = {
  anyOf: [{ type: "integer" }, { type: "null" }],
};

const understandingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["purpose", "summary", "key_takeaways", "topics", "decisions"],
  properties: {
    purpose: { type: "string" },
    summary: { type: "string" },
    key_takeaways: { type: "array", items: { type: "string" } },
    topics: { type: "array", items: { type: "string" } },
    decisions: { type: "array", items: { type: "string" } },
  },
};

const actionItemsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action_items"],
  properties: {
    action_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["task", "assignee", "deadline", "source_timestamp_seconds"],
        properties: {
          task: { type: "string" },
          assignee: nullableStringSchema,
          deadline: nullableStringSchema,
          source_timestamp_seconds: nullableIntegerSchema,
        },
      },
    },
  },
};

const highlightsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["highlights"],
  properties: {
    highlights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["important_moment", "label", "source_timestamp_seconds"],
        properties: {
          important_moment: { type: "string" },
          label: nullableStringSchema,
          source_timestamp_seconds: nullableIntegerSchema,
        },
      },
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`OpenAI returned an invalid ${field}.`);
  }
  return value.trim();
}

function nullableString(value: unknown, field: string) {
  if (value === null) return null;
  return requiredString(value, field);
}

function stringArray(value: unknown, field: string) {
  if (!Array.isArray(value)) throw new Error(`OpenAI returned an invalid ${field}.`);
  return value.map((item, index) => requiredString(item, `${field}[${index}]`));
}

function sourceTimestamp(value: unknown, durationSeconds: number, field: string) {
  if (value === null) return null;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > durationSeconds
  ) {
    throw new Error(`OpenAI returned an invalid ${field}.`);
  }
  return value;
}

function deadline(value: unknown) {
  const normalized = nullableString(value, "action item deadline");
  if (normalized === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("OpenAI returned a deadline that is not YYYY-MM-DD.");
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new Error("OpenAI returned an invalid calendar deadline.");
  }
  return normalized;
}

function parseUnderstanding(value: unknown): MeetingUnderstanding {
  if (!isRecord(value)) throw new Error("OpenAI returned invalid meeting understanding data.");
  return {
    purpose: requiredString(value.purpose, "meeting purpose"),
    summary: requiredString(value.summary, "meeting summary"),
    keyTakeaways: stringArray(value.key_takeaways, "key takeaways"),
    topics: stringArray(value.topics, "topics"),
    decisions: stringArray(value.decisions, "decisions"),
  };
}

function parseActionItems(value: unknown, durationSeconds: number): ExtractedActionItem[] {
  if (!isRecord(value) || !Array.isArray(value.action_items)) {
    throw new Error("OpenAI returned invalid action item data.");
  }
  return value.action_items.map((item, index) => {
    if (!isRecord(item)) throw new Error(`OpenAI returned invalid action item ${index + 1}.`);
    return {
      task: requiredString(item.task, `action item ${index + 1} task`),
      assignee: nullableString(item.assignee, `action item ${index + 1} assignee`),
      deadline: deadline(item.deadline),
      sourceTimestampSeconds: sourceTimestamp(
        item.source_timestamp_seconds,
        durationSeconds,
        `action item ${index + 1} timestamp`,
      ),
    };
  });
}

function parseHighlights(value: unknown, durationSeconds: number): ExtractedHighlight[] {
  if (!isRecord(value) || !Array.isArray(value.highlights)) {
    throw new Error("OpenAI returned invalid highlight data.");
  }
  return value.highlights.map((item, index) => {
    if (!isRecord(item)) throw new Error(`OpenAI returned invalid highlight ${index + 1}.`);
    return {
      importantMoment: requiredString(
        item.important_moment,
        `highlight ${index + 1} important moment`,
      ),
      label: nullableString(item.label, `highlight ${index + 1} label`),
      sourceTimestampSeconds: sourceTimestamp(
        item.source_timestamp_seconds,
        durationSeconds,
        `highlight ${index + 1} timestamp`,
      ),
    };
  });
}

function transcriptSource(transcript: ParsedTranscript) {
  const source = transcript.segments
    .map(
      (segment) =>
        `[${segment.startSeconds}s] ${segment.speaker}: ${segment.text}`,
    )
    .join("\n");

  if (source.length > MAX_ANALYSIS_SOURCE_CHARS) {
    throw new Error("The transcript is too large to analyze safely in one request.");
  }

  return `Meeting title: ${transcript.title}\nTranscript:\n${source}`;
}

function extractOutputText(response: OpenAIResponse) {
  for (const output of response.output ?? []) {
    for (const content of output.content ?? []) {
      if (content.type === "refusal" || content.refusal) {
        throw new Error("OpenAI refused to analyze this transcript.");
      }
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("OpenAI did not return structured analysis output.");
}

async function structuredCall(
  name: string,
  instructions: string,
  schema: Record<string, unknown>,
  source: string,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4o-mini",
      store: false,
      instructions,
      input: source,
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema,
        },
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const payload = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `OpenAI request failed with ${response.status}.`);
  }

  try {
    return JSON.parse(extractOutputText(payload)) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("OpenAI returned malformed JSON output.");
    throw error;
  }
}

export async function analyzeTranscript(transcript: ParsedTranscript): Promise<MeetingAnalysis> {
  const source = transcriptSource(transcript);
  const [understanding, actionItems, highlights] = await Promise.all([
    structuredCall(
      "meeting_understanding",
      "Analyze only the supplied transcript. Return the meeting purpose, a concise summary, key takeaways, topics, and explicit decisions. Do not add facts not supported by the transcript.",
      understandingSchema,
      source,
    ),
    structuredCall(
      "meeting_action_items",
      "Extract only explicit action items from the supplied transcript. Never infer an assignee, deadline, or source timestamp. Use null whenever that exact information is not clearly supported. Deadlines must be explicit calendar dates formatted YYYY-MM-DD; relative or ambiguous dates must be null.",
      actionItemsSchema,
      source,
    ),
    structuredCall(
      "meeting_highlights",
      "Extract the most important moments from the supplied transcript. Never infer a source timestamp; use null unless the timestamp is directly supported by the transcript.",
      highlightsSchema,
      source,
    ),
  ]);

  return {
    understanding: parseUnderstanding(understanding),
    actionItems: parseActionItems(actionItems, transcript.durationSeconds),
    highlights: parseHighlights(highlights, transcript.durationSeconds),
  };
}
