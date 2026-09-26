import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"];

for (const name of REQUIRED_ENV) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  },
);

const transcriptPath = resolve("data/test-meeting-transcript.txt");
const transcriptSource = await readFile(transcriptPath, "utf8");
const runId = randomUUID();
const testSlug = `supabase-smoke-${runId}`;

const checks = [];
let meetingId = null;
let participantIds = [];
let completeMeeting = null;

function record(name, passed, detail) {
  checks.push({ name, status: passed ? "PASS" : "FAIL", detail });
  if (!passed) throw new Error(`${name}: ${detail}`);
}

function getMetadata(label) {
  const match = transcriptSource.match(new RegExp(`^${label}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? null;
}

function timestampToSeconds(timestamp) {
  const [minutes, seconds] = timestamp.split(":").map(Number);
  return minutes * 60 + seconds;
}

function parseTranscriptSegments() {
  const contentBeforeFacts = transcriptSource.split(/^Expected test facts:/m)[0];
  const lines = contentBeforeFacts.split(/\r?\n/);
  const segments = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^\[(\d{2}:\d{2})\]\s+([^:]+):\s*$/);

    if (heading) {
      if (current) {
        current.text = current.textParts.join(" ").trim();
        delete current.textParts;
        segments.push(current);
      }

      current = {
        timestamp: heading[1],
        startSeconds: timestampToSeconds(heading[1]),
        speaker: heading[2].trim(),
        textParts: [],
      };
    } else if (current && line.trim()) {
      current.textParts.push(line.trim());
    }
  }

  if (current) {
    current.text = current.textParts.join(" ").trim();
    delete current.textParts;
    segments.push(current);
  }

  return segments;
}

async function expectNoError(operation, response) {
  if (response.error) {
    throw new Error(`${operation}: ${response.error.message}`);
  }
  return response.data;
}

const title = getMetadata("Meeting Title");
const meetingDate = getMetadata("Date");
const durationLabel = getMetadata("Duration");
const participantNames = (getMetadata("Participants") ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const parsedSegments = parseTranscriptSegments();
const durationSeconds = Number(durationLabel?.match(/\d+/)?.[0] ?? 0) * 60;

try {
  record(
    "transcript_parse",
    title === "Product Release Planning" &&
      meetingDate === "2026-09-26" &&
      durationSeconds === 720 &&
      participantNames.join(",") === "Saeed,Ahmed" &&
      parsedSegments.length === 19 &&
      parsedSegments.every((segment) => segment.speaker && segment.text),
    `Parsed title, date, 12-minute duration, 2 participants, and ${parsedSegments.length} complete segments.`,
  );

  const meeting = await expectNoError(
    "Insert meeting",
    await supabase
      .from("meetings")
      .insert({
        slug: testSlug,
        title,
        short_summary: "Release planning, readiness checks, staged rollout, search, and public sharing.",
        starts_at: `${meetingDate}T09:00:00.000Z`,
        duration_seconds: durationSeconds,
        status: "ready",
        source: "transcript",
        visibility: "unlisted",
        accent: "orange",
      })
      .select("id, slug, title")
      .single(),
  );
  meetingId = meeting.id;

  record(
    "meeting_insert",
    meeting.slug === testSlug && meeting.title === title,
    `Created exactly one temporary meeting with id ${meeting.id}.`,
  );

  const participantRows = await expectNoError(
    "Insert participants",
    await supabase
      .from("participants")
      .insert(
        participantNames.map((name, index) => ({
          name,
          initials: name
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 3)
            .toUpperCase(),
          avatar_color: index === 0 ? "#f18f62" : "#6b9bd2",
        })),
      )
      .select("id, name"),
  );
  participantIds = participantRows.map((participant) => participant.id);
  const participantByName = new Map(participantRows.map((participant) => [participant.name, participant.id]));

  await expectNoError(
    "Insert meeting participants",
    await supabase.from("meeting_participants").insert(
      participantRows.map((participant, index) => ({
        meeting_id: meetingId,
        participant_id: participant.id,
        role: participant.name === "Saeed" ? "Release lead" : "Engineering",
        sort_order: index,
      })),
    ),
  );

  const transcriptRows = parsedSegments.map((segment, index) => ({
    meeting_id: meetingId,
    speaker_participant_id: participantByName.get(segment.speaker) ?? null,
    speaker_name: segment.speaker,
    start_seconds: segment.startSeconds,
    end_seconds: parsedSegments[index + 1]?.startSeconds ?? durationSeconds,
    text: segment.text,
    sort_order: index,
  }));

  const insertedSegments = await expectNoError(
    "Insert transcript segments",
    await supabase
      .from("transcript_segments")
      .insert(transcriptRows)
      .select("id, speaker_name, start_seconds, text, sort_order"),
  );

  record(
    "transcript_insert",
    insertedSegments.length === parsedSegments.length &&
      insertedSegments.every((segment, index) =>
        segment.speaker_name === parsedSegments[index].speaker &&
        segment.start_seconds === parsedSegments[index].startSeconds &&
        segment.text === parsedSegments[index].text,
      ),
    `Inserted and returned all ${insertedSegments.length} speaker-attributed timestamped segments.`,
  );

  await expectNoError(
    "Insert summary",
    await supabase.from("summaries").insert({
      meeting_id: meetingId,
      purpose: "Finalize the product release plan, ownership, deadlines, rollout, search, and sharing requirements.",
      key_takeaways: [
        "Friday remains the target release date if final QA finishes by Thursday at 5 PM.",
        "The release starts with 10 percent of users before expanding based on production error rates.",
        "Search covers meeting titles and transcript content; the public share page remains read-only.",
      ],
      topics: ["Release planning", "Quality assurance", "Staged rollout", "Search", "Sharing"],
      decisions: [
        "Treat the mobile summary layout issue as a release blocker.",
        "Use a staged 10 percent rollout on Friday.",
        "Keep transcript search and public read-only sharing in the first release.",
      ],
    }),
  );

  await expectNoError(
    "Insert action items",
    await supabase.from("action_items").insert([
      {
        meeting_id: meetingId,
        task: "Finish final backend testing.",
        owner_participant_id: participantByName.get("Ahmed"),
        owner_name: "Ahmed",
        deadline: "2026-10-01",
        timestamp_seconds: 53,
        sort_order: 0,
      },
      {
        meeting_id: meetingId,
        task: "Prepare the deployment checklist and release notes.",
        owner_participant_id: participantByName.get("Saeed"),
        owner_name: "Saeed",
        deadline: "2026-10-01",
        timestamp_seconds: 75,
        sort_order: 1,
      },
      {
        meeting_id: meetingId,
        task: "Fix the mobile meeting summary layout issue and send an updated build.",
        owner_participant_id: participantByName.get("Ahmed"),
        owner_name: "Ahmed",
        deadline: "2026-09-30",
        timestamp_seconds: 123,
        sort_order: 2,
      },
    ]),
  );

  await expectNoError(
    "Insert highlights",
    await supabase.from("highlights").insert([
      {
        meeting_id: meetingId,
        label: "Decision",
        title: "Friday release target",
        detail: "Friday remains the target provided QA finishes by Thursday at 5 PM.",
        timestamp_seconds: 37,
        sort_order: 0,
      },
      {
        meeting_id: meetingId,
        label: "Rollout",
        title: "Start with 10 percent",
        detail: "Release to 10 percent of users first and monitor production errors before expanding.",
        timestamp_seconds: 147,
        sort_order: 1,
      },
      {
        meeting_id: meetingId,
        label: "Scope",
        title: "Read-only public sharing",
        detail: "Public meeting pages use unguessable tokens and require no login.",
        timestamp_seconds: 275,
        sort_order: 2,
      },
    ]),
  );

  const rawShareToken = `smoke_${runId}`;
  await expectNoError(
    "Insert share record",
    await supabase.from("meeting_shares").insert({
      meeting_id: meetingId,
      token_hash: createHash("sha256").update(rawShareToken).digest("hex"),
      token_hint: rawShareToken.slice(-8),
    }),
  );

  completeMeeting = await expectNoError(
    "Read complete meeting",
    await supabase
      .from("meetings")
      .select(`
        *,
        meeting_participants(
          role,
          sort_order,
          participant:participants(*)
        ),
        recordings(*),
        transcript_segments(
          *,
          speaker:participants!transcript_segments_speaker_participant_id_fkey(*)
        ),
        summaries(*),
        action_items(
          *,
          owner:participants!action_items_owner_participant_id_fkey(*)
        ),
        highlights(*),
        meeting_shares(id, token_hint, expires_at, revoked_at, created_at)
      `)
      .eq("id", meetingId)
      .order("sort_order", { referencedTable: "meeting_participants", ascending: true })
      .order("sort_order", { referencedTable: "transcript_segments", ascending: true })
      .order("sort_order", { referencedTable: "action_items", ascending: true })
      .order("sort_order", { referencedTable: "highlights", ascending: true })
      .single(),
  );

  const summaryCount = Array.isArray(completeMeeting.summaries)
    ? completeMeeting.summaries.length
    : completeMeeting.summaries
      ? 1
      : 0;

  record(
    "complete_relational_read",
    completeMeeting.meeting_participants.length === 2 &&
      completeMeeting.transcript_segments.length === 19 &&
      summaryCount === 1 &&
      completeMeeting.action_items.length === 3 &&
      completeMeeting.highlights.length === 3 &&
      completeMeeting.meeting_shares.length === 1 &&
      completeMeeting.recordings.length === 0,
    "Read the meeting with 2 participants, 19 segments, 1 summary, 3 actions, 3 highlights, 1 share, and an empty recordings relation.",
  );

  const fridayResults = await expectNoError(
    "Search transcript for Friday",
    await supabase.rpc("search_meeting_content", {
      search_query: "Friday",
      result_limit: 20,
    }),
  );
  const fridayTestRows = fridayResults.filter((result) => result.meeting_id === meetingId);

  record(
    "transcript_search_friday",
    fridayTestRows.length >= 3 && fridayTestRows.some((result) => result.result_type === "transcript"),
    `Found ${fridayTestRows.length} ranked result(s) for “Friday,” including transcript content.`,
  );

  const titleResults = await expectNoError(
    "Search meeting title",
    await supabase.rpc("search_meeting_content", {
      search_query: "Product Release",
      result_limit: 20,
    }),
  );
  const titleMatch = titleResults.find(
    (result) => result.meeting_id === meetingId && result.result_type === "meeting",
  );

  record(
    "meeting_title_search",
    Boolean(titleMatch),
    titleMatch
      ? "Found the temporary meeting through its title."
      : "The temporary meeting was not returned for its title.",
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!checks.some((check) => check.status === "FAIL")) {
    checks.push({ name: "database_test_execution", status: "FAIL", detail: message });
  }
} finally {
  const cleanupErrors = [];

  if (meetingId) {
    const meetingDelete = await supabase.from("meetings").delete().eq("id", meetingId);
    if (meetingDelete.error) cleanupErrors.push(`meeting delete: ${meetingDelete.error.message}`);
  }

  if (participantIds.length) {
    const participantDelete = await supabase.from("participants").delete().in("id", participantIds);
    if (participantDelete.error) cleanupErrors.push(`participant delete: ${participantDelete.error.message}`);
  }

  const meetingCountResult = await supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("slug", testSlug);

  const participantCountResult = participantIds.length
    ? await supabase
        .from("participants")
        .select("id", { count: "exact", head: true })
        .in("id", participantIds)
    : { count: 0, error: null };

  const relatedCounts = {};
  if (meetingId) {
    const relatedTables = [
      "meeting_participants",
      "recordings",
      "transcript_segments",
      "summaries",
      "action_items",
      "highlights",
      "meeting_shares",
    ];

    for (const table of relatedTables) {
      const result = await supabase
        .from(table)
        .select("meeting_id", { count: "exact", head: true })
        .eq("meeting_id", meetingId);

      relatedCounts[table] = result.count;
      if (result.error) cleanupErrors.push(`${table} verification: ${result.error.message}`);
    }
  }

  if (meetingCountResult.error) cleanupErrors.push(`meeting verification: ${meetingCountResult.error.message}`);
  if (participantCountResult.error) cleanupErrors.push(`participant verification: ${participantCountResult.error.message}`);

  const relatedRowsRemain = Object.values(relatedCounts).some((count) => count !== 0);

  checks.push({
    name: "temporary_data_cleanup",
    status:
      cleanupErrors.length === 0 &&
      meetingCountResult.count === 0 &&
      participantCountResult.count === 0 &&
      !relatedRowsRemain
        ? "PASS"
        : "FAIL",
    detail:
      cleanupErrors.length > 0
        ? cleanupErrors.join("; ")
        : `Remaining test meetings: ${meetingCountResult.count}; participants: ${participantCountResult.count}; related rows: ${JSON.stringify(relatedCounts)}.`,
  });
}

console.log(
  JSON.stringify(
    {
      run_id: runId,
      source_file: transcriptPath,
      complete_meeting_readback: completeMeeting,
      checks,
    },
    null,
    2,
  ),
);

if (checks.some((check) => check.status === "FAIL")) {
  process.exitCode = 1;
}
