import "server-only";

import type { z } from "zod";
import { toProviderJsonSchema } from "@/lib/validation/meeting-analysis";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const PROVIDER_TIMEOUT_MS = 45_000;

type StructuredAnalysisRequest<T> = {
  name: string;
  instructions: string;
  input: string;
  schema: z.ZodType<T>;
};

export type StructuredAnalysisResult<T> = {
  data: T;
  provider: "openai";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }
}

async function readOpenAiResponse(response: Response) {
  if (!response.ok) {
    let detail = "";

    try {
      const payload = (await response.json()) as unknown;
      if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === "string") {
        detail = response.status === 401
          ? "The API key was rejected."
          : payload.error.message
              .replace(/sk-[A-Za-z0-9_*.-]+/gi, "[redacted]")
              .slice(0, 300);

        if (response.status === 400 && payload.error.details !== undefined) {
          detail += ` Details: ${JSON.stringify(payload.error.details).slice(0, 600)}`;
        }
      }
    } catch {
      // The status is enough when the provider does not return its normal error shape.
    }

    throw new Error(
      `OpenAI request failed with status ${response.status}${detail ? `: ${detail}` : "."}`,
    );
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new Error("OpenAI returned an unreadable response.");
  }
}

function extractOpenAiText(payload: unknown) {
  if (!isRecord(payload)) throw new Error("OpenAI returned an invalid response shape.");
  if (payload.status !== "completed") {
    throw new Error("OpenAI did not complete the structured response.");
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    throw new Error("OpenAI returned no structured output.");
  }

  for (const item of payload.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;

    for (const content of item.content) {
      if (!isRecord(content)) continue;
      if (content.type === "refusal") throw new Error("OpenAI refused the analysis request.");
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  throw new Error("OpenAI returned no structured output.");
}

async function callOpenAi<T>(request: StructuredAnalysisRequest<T>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-6-luna",
      store: false,
      instructions: request.instructions,
      input: request.input,
      text: {
        format: {
          type: "json_schema",
          name: request.name,
          strict: true,
          schema: toProviderJsonSchema(request.schema),
        },
      },
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const payload = await readOpenAiResponse(response);
  return request.schema.parse(safeJsonParse(extractOpenAiText(payload)));
}

export async function generateStructuredAnalysis<T>(
  request: StructuredAnalysisRequest<T>,
): Promise<StructuredAnalysisResult<T>> {
  return { data: await callOpenAi(request), provider: "openai" };
}
