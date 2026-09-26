import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seedDirectory = join(projectRoot, "data", "seed");
const localEnvPath = join(projectRoot, ".env.local");

if (existsSync(localEnvPath)) {
  loadEnvFile(localEnvPath);
}

const requiredEnvironment = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"];
for (const name of requiredEnvironment) {
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

const participantColors = [
  "#f18f62",
  "#6b9bd2",
  "#9b7bd8",
  "#58b8ba",
  "#cd7fae",
  "#6baf8e",
  "#c98b55",
];
const meetingAccents = ["orange", "cyan", "violet"];

async function readJson(relativePath) {
  const path = join(seedDirectory, relativePath);
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Fixture validation failed: ${message}`);
  }
}

function assertUnique(rows, field, fixtureName) {
  const values = rows.map((row) => row[field]);
  assert(values.every(Boolean), `${fixtureName} must provide ${field} for every row.`);
  assert(new Set(values).size === values.length, `${fixtureName} contains duplicate ${field} values.`);
}

function deterministicUuid(value) {
  const bytes = Buffer.from(createHash("sha256").update(value).digest("hex").slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function initialsFor(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function indexWithinMeeting(rows, rowIndex) {
  const row = rows[rowIndex];
  return rows.slice(0, rowIndex).filter((candidate) => candidate.meeting_id === row.meeting_id).length;
}

async function upsertRows(table, rows, onConflict) {
  if (rows.length === 0) return;

  const { error } = await supabase.from(table).upsert(rows, {
    onConflict,
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`Upsert ${table}: ${error.message}`);
  }
}

async function readFixtures() {
  const [
    meetings,
    participants,
    meetingParticipants,
    recordings,
    summaries,
    actionItems,
    highlights,
    shares,
    productTranscript,
    acmeTranscript,
    q4Transcript,
  ] = await Promise.all([
    readJson("meetings.json"),
    readJson("participants.json"),
    readJson("meeting-participants.json"),
    readJson("recordings.json"),
    readJson("summaries.json"),
    readJson("action-items.json"),
    readJson("highlights.json"),
    readJson("shares.json"),
    readJson(join("transcripts", "product-design-review.json")),
    readJson(join("transcripts", "acme-onboarding-research.json")),
    readJson(join("transcripts", "q4-go-to-market-sync.json")),
  ]);

  return {
    meetings,
    participants,
    meetingParticipants,
    recordings,
    summaries,
    actionItems,
    highlights,
    shares,
    transcripts: [productTranscript, acmeTranscript, q4Transcript],
  };
}

function validateFixtures(fixtures) {
  const meetingIds = new Set(fixtures.meetings.map((meeting) => meeting.id));
  const participantIds = new Set(fixtures.participants.map((participant) => participant.id));
  const participantNames = new Set(fixtures.participants.map((participant) => participant.name));

  assert(fixtures.meetings.length > 0, "meetings.json cannot be empty.");
  assertUnique(fixtures.meetings, "id", "meetings.json");
  assertUnique(fixtures.meetings, "slug", "meetings.json");
  assertUnique(fixtures.participants, "id", "participants.json");
  assertUnique(fixtures.participants, "email", "participants.json");
  assertUnique(fixtures.recordings, "id", "recordings.json");
  assertUnique(fixtures.actionItems, "id", "action-items.json");
  assertUnique(fixtures.highlights, "id", "highlights.json");
  assertUnique(fixtures.shares, "id", "shares.json");

  for (const meeting of fixtures.meetings) {
    assert(meeting.title && meeting.meeting_date, `Meeting ${meeting.id} is missing required metadata.`);
    assert(
      fixtures.summaries.filter((summary) => summary.meeting_id === meeting.id).length === 1,
      `Meeting ${meeting.id} must have exactly one summary.`,
    );
    assert(
      fixtures.transcripts.filter((transcript) => transcript.meeting_id === meeting.id).length === 1,
      `Meeting ${meeting.id} must have exactly one transcript fixture.`,
    );
  }

  for (const row of fixtures.meetingParticipants) {
    assert(meetingIds.has(row.meeting_id), `Unknown meeting_id ${row.meeting_id} in meeting-participants.json.`);
    assert(
      participantIds.has(row.participant_id),
      `Unknown participant_id ${row.participant_id} in meeting-participants.json.`,
    );
  }

  for (const fixtureName of ["recordings", "summaries", "actionItems", "highlights", "shares"]) {
    for (const row of fixtures[fixtureName]) {
      assert(meetingIds.has(row.meeting_id), `Unknown meeting_id ${row.meeting_id} in ${fixtureName}.`);
    }
  }

  for (const item of fixtures.actionItems) {
    assert(participantNames.has(item.assignee), `Unknown action-item assignee ${item.assignee}.`);
  }

  for (const transcript of fixtures.transcripts) {
    assert(meetingIds.has(transcript.meeting_id), `Unknown transcript meeting_id ${transcript.meeting_id}.`);
    assert(Array.isArray(transcript.segments), `Transcript ${transcript.slug} has no segments array.`);
    for (const segment of transcript.segments) {
      assert(participantNames.has(segment.speaker), `Unknown transcript speaker ${segment.speaker}.`);
      assert(segment.text?.trim(), `Transcript ${transcript.slug} contains a blank segment.`);
    }
  }
}

function mapFixtures(fixtures) {
  const summaryByMeeting = new Map(
    fixtures.summaries.map((summary) => [summary.meeting_id, summary]),
  );
  const participantByName = new Map(
    fixtures.participants.map((participant) => [participant.name, participant]),
  );

  return {
    meetings: fixtures.meetings.map((meeting, index) => ({
      id: meeting.id,
      slug: meeting.slug,
      title: meeting.title,
      short_summary: summaryByMeeting.get(meeting.id).summary,
      starts_at: meeting.meeting_date,
      duration_seconds: meeting.duration_seconds,
      status: meeting.status,
      source: "seeded",
      visibility: meeting.visibility,
      accent: meetingAccents[index % meetingAccents.length],
      error_message: null,
    })),
    participants: fixtures.participants.map((participant, index) => ({
      id: participant.id,
      name: participant.name,
      email: participant.email,
      initials: initialsFor(participant.name),
      avatar_color: participantColors[index % participantColors.length],
    })),
    meetingParticipants: fixtures.meetingParticipants.map((row, index, rows) => ({
      meeting_id: row.meeting_id,
      participant_id: row.participant_id,
      role: row.role,
      sort_order: indexWithinMeeting(rows, index),
    })),
    recordings: fixtures.recordings.map((recording) => ({
      id: recording.id,
      meeting_id: recording.meeting_id,
      storage_bucket: "meeting-recordings",
      storage_path: recording.storage_path ?? `seed/demo/${recording.id}`,
      mime_type: recording.media_type === "demo" ? "application/x-echo-demo" : recording.media_type,
      file_size_bytes: null,
      duration_seconds: recording.duration_seconds,
      waveform: [],
      is_primary: true,
    })),
    summaries: fixtures.summaries.map((summary) => ({
      meeting_id: summary.meeting_id,
      purpose: summary.purpose,
      key_takeaways: summary.key_takeaways,
      topics: summary.topics,
      decisions: summary.decisions,
    })),
    actionItems: fixtures.actionItems.map((item, index, rows) => ({
      id: item.id,
      meeting_id: item.meeting_id,
      task: item.task,
      owner_participant_id: participantByName.get(item.assignee).id,
      owner_name: item.assignee,
      deadline: item.deadline.slice(0, 10),
      timestamp_seconds: item.timestamp_seconds,
      status: item.completed ? "completed" : "open",
      sort_order: indexWithinMeeting(rows, index),
    })),
    highlights: fixtures.highlights.map((highlight, index, rows) => ({
      id: highlight.id,
      meeting_id: highlight.meeting_id,
      label: highlight.label,
      title: highlight.text,
      detail: highlight.text,
      timestamp_seconds: highlight.timestamp_seconds,
      sort_order: indexWithinMeeting(rows, index),
    })),
    shares: fixtures.shares.map((share) => ({
      id: share.id,
      meeting_id: share.meeting_id,
      token_hash: createHash("sha256").update(share.share_token).digest("hex"),
      token_hint: share.share_token.slice(-8),
      expires_at: null,
      revoked_at: share.is_active ? null : "1970-01-01T00:00:00.000Z",
    })),
    transcriptSegments: fixtures.transcripts.flatMap((transcript) => {
      const attachedParticipantIds = new Set(
        fixtures.meetingParticipants
          .filter((row) => row.meeting_id === transcript.meeting_id)
          .map((row) => row.participant_id),
      );

      return transcript.segments.map((segment, index) => {
        const speaker = participantByName.get(segment.speaker);
        assert(
          attachedParticipantIds.has(speaker.id),
          `${segment.speaker} is not attached to transcript meeting ${transcript.meeting_id}.`,
        );

        return {
          id: deterministicUuid(`transcript:${transcript.meeting_id}:${index}`),
          meeting_id: transcript.meeting_id,
          speaker_participant_id: speaker.id,
          speaker_name: segment.speaker,
          start_seconds: segment.start_time_seconds,
          end_seconds: segment.end_time_seconds,
          text: segment.text,
          sort_order: index,
        };
      });
    }),
  };
}

async function seed(mapped) {
  await upsertRows("meetings", mapped.meetings, "id");
  await upsertRows("participants", mapped.participants, "id");
  await upsertRows("meeting_participants", mapped.meetingParticipants, "meeting_id,participant_id");
  await upsertRows("recordings", mapped.recordings, "id");
  await upsertRows("transcript_segments", mapped.transcriptSegments, "id");
  await upsertRows("summaries", mapped.summaries, "meeting_id");
  await upsertRows("action_items", mapped.actionItems, "id");
  await upsertRows("highlights", mapped.highlights, "id");
  await upsertRows("meeting_shares", mapped.shares, "id");
}

async function verify(fixtures, mapped) {
  const meetingIds = mapped.meetings.map((meeting) => meeting.id);
  const participantIds = mapped.participants.map((participant) => participant.id);
  const { data: meetings, error: meetingError } = await supabase
    .from("meetings")
    .select(`
      id,
      slug,
      title,
      short_summary,
      starts_at,
      duration_seconds,
      status,
      source,
      meeting_participants(participant_id),
      recordings(id),
      transcript_segments(id),
      summaries(meeting_id),
      action_items(id),
      highlights(id),
      meeting_shares(id)
    `)
    .in("id", meetingIds)
    .order("starts_at", { ascending: false });

  if (meetingError) {
    throw new Error(`Verify meetings: ${meetingError.message}`);
  }

  const { count: participantCount, error: participantError } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .in("id", participantIds);

  if (participantError) {
    throw new Error(`Verify participants: ${participantError.message}`);
  }

  assert(meetings.length === fixtures.meetings.length, `Expected ${fixtures.meetings.length} meetings, found ${meetings.length}.`);
  assert(participantCount === fixtures.participants.length, `Expected ${fixtures.participants.length} participants, found ${participantCount}.`);

  const verification = meetings.map((meeting) => {
    const expected = {
      participants: mapped.meetingParticipants.filter((row) => row.meeting_id === meeting.id).length,
      recordings: mapped.recordings.filter((row) => row.meeting_id === meeting.id).length,
      transcriptSegments: mapped.transcriptSegments.filter((row) => row.meeting_id === meeting.id).length,
      summaries: mapped.summaries.filter((row) => row.meeting_id === meeting.id).length,
      actionItems: mapped.actionItems.filter((row) => row.meeting_id === meeting.id).length,
      highlights: mapped.highlights.filter((row) => row.meeting_id === meeting.id).length,
      shares: mapped.shares.filter((row) => row.meeting_id === meeting.id).length,
    };
    const actual = {
      participants: meeting.meeting_participants.length,
      recordings: meeting.recordings.length,
      transcriptSegments: meeting.transcript_segments.length,
      summaries: meeting.summaries ? 1 : 0,
      actionItems: meeting.action_items.length,
      highlights: meeting.highlights.length,
      shares: meeting.meeting_shares.length,
    };
    const sourceMeeting = mapped.meetings.find((candidate) => candidate.id === meeting.id);

    assert(meeting.slug === sourceMeeting.slug, `Slug mismatch for meeting ${meeting.id}.`);
    assert(meeting.title === sourceMeeting.title, `Title mismatch for meeting ${meeting.id}.`);
    assert(meeting.short_summary === sourceMeeting.short_summary, `Summary mismatch for ${meeting.slug}.`);
    assert(meeting.duration_seconds === sourceMeeting.duration_seconds, `Duration mismatch for ${meeting.slug}.`);
    assert(meeting.status === "ready" && meeting.source === "seeded", `State mismatch for ${meeting.slug}.`);
    assert(
      Object.keys(expected).every((key) => expected[key] === actual[key]),
      `Relational count mismatch for ${meeting.slug}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}.`,
    );

    return { slug: meeting.slug, title: meeting.title, ...actual };
  });

  return verification;
}

const fixtures = await readFixtures();
validateFixtures(fixtures);
const mapped = mapFixtures(fixtures);
await seed(mapped);
const verification = await verify(fixtures, mapped);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      message: "Seed fixtures were upserted and verified.",
      meetings: verification,
      participantCount: mapped.participants.length,
    },
    null,
    2,
  ),
);
