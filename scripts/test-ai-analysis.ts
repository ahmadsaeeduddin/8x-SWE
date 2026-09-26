import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

const projectRoot = process.cwd();
const fixturePath = path.join(projectRoot, "data", "seed", "transcripts", "new.json");

async function main() {
  loadEnvConfig(projectRoot);

  const [{ analyzeMeeting }, { parseTranscriptFile }] = await Promise.all([
    import("@/lib/ai/analyze-meeting"),
    import("@/lib/transcripts/parse-transcript"),
  ]);
  const source = await readFile(fixturePath, "utf8");
  const parsed = parseTranscriptFile("new.json", source);

  if (!parsed.success) {
    throw new Error(`Fixture validation failed: ${parsed.error}`);
  }

  console.log(
    `[ai-fixture-test] Analyzing ${parsed.data.title} (${parsed.data.segments.length} segments) with OpenAI.`,
  );

  const analysis = await analyzeMeeting({
    title: parsed.data.title,
    startsAt: parsed.data.startsAt,
    durationSeconds: parsed.data.durationSeconds,
    segments: parsed.data.segments,
  });

  console.log(
    JSON.stringify(
      {
        fixture: path.relative(projectRoot, fixturePath).replaceAll("\\", "/"),
        providers: analysis.providers,
        meeting_understanding: analysis.understanding,
        action_items: analysis.actionItems,
        highlights: analysis.highlights,
      },
      null,
      2,
    ),
  );
}

function errorMessages(error: unknown): string[] {
  return [error instanceof Error ? error.message : "Unknown AI fixture test failure."];
}

main().catch((error: unknown) => {
  console.error(`[ai-fixture-test] FAIL:\n- ${errorMessages(error).join("\n- ")}`);
  process.exitCode = 1;
});
