import { z } from "zod";

const conciseText = z.string().trim().min(1).max(4_000);
const conciseList = z.array(conciseText).max(20);
const nullableText = z.union([conciseText, z.null()]);
const sourceTimestamp = z.union([z.number().int().nonnegative(), z.null()]);

const isoDateOrNull = nullableText.superRefine((value, context) => {
  if (value === null) return;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    context.addIssue({
      code: "custom",
      message: "Deadline must be an ISO date or null.",
    });
    return;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    context.addIssue({
      code: "custom",
      message: "Deadline must be a real calendar date.",
    });
  }
});

export const meetingUnderstandingSchema = z
  .object({
    purpose: conciseText,
    summary: conciseText,
    key_takeaways: conciseList,
    topics: conciseList,
    decisions: conciseList,
  })
  .strict();

export const actionItemAnalysisSchema = z
  .object({
    action_items: z
      .array(
        z
          .object({
            task: conciseText,
            assignee: nullableText,
            deadline: isoDateOrNull,
            source_timestamp_seconds: sourceTimestamp,
          })
          .strict(),
      )
      .max(50),
  })
  .strict();

export const highlightAnalysisSchema = z
  .object({
    highlights: z
      .array(
        z
          .object({
            important_moment: conciseText,
            label: conciseText,
            source_timestamp_seconds: sourceTimestamp,
          })
          .strict(),
      )
      .max(50),
  })
  .strict();

export type MeetingUnderstanding = z.infer<typeof meetingUnderstandingSchema>;
export type ActionItemAnalysis = z.infer<typeof actionItemAnalysisSchema>;
export type HighlightAnalysis = z.infer<typeof highlightAnalysisSchema>;

export function toProviderJsonSchema(schema: z.ZodType) {
  const jsonSchema: Record<string, unknown> = {
    ...z.toJSONSchema(schema, { target: "draft-7" }),
  };
  delete jsonSchema.$schema;

  return jsonSchema;
}
