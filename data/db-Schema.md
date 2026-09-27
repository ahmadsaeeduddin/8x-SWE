# Database schema

## Purpose

The Supabase schema supports the UI that exists today without replacing its mock data yet. It covers meeting cards, the meeting detail view, transcript search, recordings, action items, highlights, and unguessable public share links.

No migration has been applied and no seed data has been inserted.

## Tables

| Table | Purpose | Important fields |
|---|---|---|
| `meetings` | Core meeting metadata and processing state | `slug`, `title`, `short_summary`, `starts_at`, `duration_seconds`, `status`, `source`, `visibility`, `accent` |
| `participants` | Reusable participant identity/display data | `name`, optional `email`, `initials`, `avatar_color` |
| `meeting_participants` | Ordered participants and their role in a meeting | `meeting_id`, `participant_id`, `role`, `sort_order` |
| `recordings` | Metadata for media stored in Supabase Storage | `storage_bucket`, `storage_path`, `mime_type`, `duration_seconds`, `waveform`, `is_primary` |
| `transcript_segments` | Ordered, speaker-attributed transcript lines | `speaker_participant_id`, `speaker_name`, `start_seconds`, `end_seconds`, `text`, `sort_order` |
| `summaries` | One structured summary per meeting | `purpose`, `key_takeaways`, `topics`, `decisions` |
| `action_items` | Follow-ups shown in the summary view | `task`, optional owner, `deadline`, `timestamp_seconds`, `status`, `sort_order` |
| `highlights` | Notable timestamped moments | `label`, `title`, `detail`, `timestamp_seconds`, `sort_order` |
| `meeting_shares` | Revocable public links | `meeting_id`, `token_hash`, `token_hint`, `expires_at`, `revoked_at` |

## Relationships

```text
meetings
  ├── meeting_participants ── participants
  ├── recordings
  ├── transcript_segments ── optional participant speaker
  ├── summaries (one per meeting)
  ├── action_items ── optional participant owner
  ├── highlights
  └── meeting_shares
```

All meeting-owned rows use `on delete cascade`. Participant references use `on delete set null` where preserving transcript/action history matters.

## Existing UI mapping

- Dashboard cards combine `meetings`, `summaries.topics`, participant previews, the primary recording waveform, and action/highlight counts.
- Meeting detail combines one meeting with its ordered participants, primary recording, summary, ordered action items, highlights, and transcript segments.
- UI timestamps remain formatted strings at the component boundary; PostgreSQL stores integer seconds.
- Participant colors should be stored as stable color values such as `#f18f62`, not Tailwind class names. A later data adapter will convert database rows into the current UI types.
- Summary lists remain `text[]` because they are ordered, meeting-owned values with no independent lifecycle.

## Search

`meetings` and `transcript_segments` have generated `tsvector` columns with GIN indexes. The `search_meeting_content(search_query, result_limit)` function returns ranked meeting-title/summary and transcript matches with meeting metadata, speaker, timestamp, and a highlighted excerpt.

The function is server-only for now. The current mock search remains unchanged until the UI data-source migration is explicitly requested.

## Sharing and security

- Share tokens are never stored directly. `meeting_shares.token_hash` stores a lowercase SHA-256 hex digest; `token_hint` may store up to eight non-sensitive display characters.
- A public share request should hash the presented token and resolve it on the server using the server-only Supabase client.
- A share is valid only when `revoked_at` is null and `expires_at` is null or in the future.
- Row Level Security is enabled on every table.
- All table access is revoked from `anon` and `authenticated` in the initial migration because ownership/authentication is not in scope yet.
- Only the server secret role can access these tables at this stage. Never expose `SUPABASE_SECRET_KEY` to browser code.

The private `meeting-recordings` Storage bucket accepts supported audio files up to 50 MB. Uploads use the server-only service role; playback uses short-lived signed URLs, so no anonymous Storage policy is required.

## Supabase helpers

| File | Runtime | Key used |
|---|---|---|
| `src/lib/supabase/client.ts` | Client Components | Publishable key; subject to grants and RLS |
| `src/lib/supabase/server.ts` | Server Components, Actions, and Route Handlers | Publishable key with cookie-based session support |
| `src/lib/supabase/admin.ts` | Trusted server code only | Secret key; bypasses RLS |

Authentication and a Next.js auth proxy are intentionally not included in this task.

## Environment variables

Copy `.env.local.example` to `.env.local` manually and provide:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
OPENAI_API_KEY
OPENAI_ANALYSIS_MODEL
```

Only the two `NEXT_PUBLIC_` variables may appear in browser code.

## Migration files

1. `202609260001_initial_meeting_schema.sql` creates tables, constraints, indexes, update triggers, RLS, and least-privilege grants.
2. `202609260002_meeting_search_function.sql` creates the ranked server-only search function.
3. `202609270003_meeting_recordings_bucket.sql` creates the private audio playback bucket and its type/size limits.

Review and apply these migrations manually through your chosen Supabase workflow. They have not been executed by the agent.

`src/types/database.ts` mirrors the migration for local type-checking. After the schema is applied, regenerate Supabase types from the actual project and compare them before replacing this checked-in type definition.
