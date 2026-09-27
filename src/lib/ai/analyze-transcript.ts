import "server-only";

import type { ParsedTranscript } from "@/lib/transcripts/parse-transcript";

export type MeetingAnalysis = {
  understanding: {
    purpose: string;
    summary: string;
    keyTakeaways: string[];
    topics: string[];
    decisions: string[];
  };
  actionItems: Array<{
    task: string;
    assignee: string | null;
    deadline: string | null;
    sourceTimestampSeconds: number | null;
  }>;
  highlights: Array<{
    importantMoment: string;
    label: string | null;
    sourceTimestampSeconds: number | null;
  }>;
};

type OpenAIResponse = {
  error?: { message?: string };
  output?: Array<{ content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
};

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] };
const nullableInteger = { anyOf: [{ type: "integer" }, { type: "null" }] };
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
          assignee: nullableString,
          deadline: nullableString,
          source_timestamp_seconds: nullableInteger,
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
          label: nullableString,
          source_timestamp_seconds: nullableInteger,
        },
      },
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`OpenAI returned an invalid ${field}.`);
  return value.trim();
}

function optionalString(value: unknown, field: string) {
  return value === null ? null : requiredString(value, field);
}

function strings(value: unknown, field: string) {
  if (!Array.isArray(value)) throw new Error(`OpenAI returned invalid ${field}.`);
  return value.map((item, index) => requiredString(item, `${field}[${index}]`));
}

function timestamp(value: unknown, duration: number, field: string) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > duration) {
    throw new Error(`OpenAI returned an invalid ${field}.`);
  }
  return value;
}

function date(value: unknown) {
  const result = optionalString(value, "deadline");
  if (result === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error("OpenAI returned an invalid deadline.");
  const parsed = new Date(`${result}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) {
    throw new Error("OpenAI returned an invalid deadline.");
  }
  return result;
}

function extractOutputText(payload: OpenAIResponse) {
  for (const output of payload.output ?? []) {
    for (const content of output.content ?? []) {
      if (content.type === "refusal" || content.refusal) throw new Error("OpenAI refused this transcript.");
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("OpenAI did not return structured output.");
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
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4o-mini",
      store: false,
      instructions,
      input: source,
      text: { format: { type: "json_schema", name, strict: true, schema } },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const payload = (await response.json()) as OpenAIResponse;
  if (!response.ok) throw new Error(payload.error?.message ?? `OpenAI request failed with ${response.status}.`);
  return JSON.parse(extractOutputText(payload)) as unknown;
}

function transcriptSource(transcript: ParsedTranscript) {
  const source = transcript.segments
    .map((segment) => `[${segment.startSeconds}s] ${segment.speaker}: ${segment.text}`)
    .join("\n");
  if (source.length > 180_000) throw new Error("The transcript is too large to analyze safely.");
  return `Meeting title: ${transcript.title}\nTranscript:\n${source}`;
}

export async function analyzeTranscript(transcript: ParsedTranscript): Promise<MeetingAnalysis> {
  const source = transcriptSource(transcript);
  const [understandingValue, actionsValue, highlightsValue] = await Promise.all([
    structuredCall(
      "meeting_understanding",
      "Analyze only this transcript. Return purpose, concise summary, key takeaways, topics, and explicit decisions. Do not add unsupported facts.",
      understandingSchema,
      source,
    ),
    structuredCall(
      "meeting_action_items",
      "Extract only explicit actions. Never infer assignee, deadline, or source timestamp. Use null unless clearly supported. A deadline must be an explicit calendar date in YYYY-MM-DD; relative or ambiguous dates are null.",
      actionItemsSchema,
      source,
    ),
    structuredCall(
      "meeting_highlights",
      "Extract important moments. Never infer a timestamp; use null unless directly supported by the transcript.",
      highlightsSchema,
      source,
    ),
  ]);

  if (!isRecord(understandingValue)) throw new Error("OpenAI returned invalid meeting understanding.");
  if (!isRecord(actionsValue) || !Array.isArray(actionsValue.action_items)) {
    throw new Error("OpenAI returned invalid action items.");
  }
  if (!isRecord(highlightsValue) || !Array.isArray(highlightsValue.highlights)) {
    throw new Error("OpenAI returned invalid highlights.");
  }

  return {
    understanding: {
      purpose: requiredString(understandingValue.purpose, "purpose"),
      summary: requiredString(understandingValue.summary, "summary"),
      keyTakeaways: strings(understandingValue.key_takeaways, "key takeaways"),
      topics: strings(understandingValue.topics, "topics"),
      decisions: strings(understandingValue.decisions, "decisions"),
    },
    actionItems: actionsValue.action_items.map((item, index) => {
      if (!isRecord(item)) throw new Error(`OpenAI returned invalid action item ${index + 1}.`);
      return {
        task: requiredString(item.task, "action task"),
        assignee: optionalString(item.assignee, "assignee"),
        deadline: date(item.deadline),
        sourceTimestampSeconds: timestamp(item.source_timestamp_seconds, transcript.durationSeconds, "action timestamp"),
      };
    }),
    highlights: highlightsValue.highlights.map((item, index) => {
      if (!isRecord(item)) throw new Error(`OpenAI returned invalid highlight ${index + 1}.`);
      return {
        importantMoment: requiredString(item.important_moment, "important moment"),
        label: optionalString(item.label, "highlight label"),
        sourceTimestampSeconds: timestamp(item.source_timestamp_seconds, transcript.durationSeconds, "highlight timestamp"),
      };
    }),
  };
}
