-- Core relational model for the meeting intelligence UI.
-- This migration intentionally creates no seed data and no public access policies.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_summary text,
  starts_at timestamptz not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'transcribing', 'analyzing', 'ready', 'failed')),
  source text not null default 'upload'
    check (source in ('seeded', 'upload', 'transcript')),
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted')),
  accent text check (accent is null or accent in ('orange', 'cyan', 'violet')),
  error_message text,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(short_summary, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint meetings_title_not_blank check (length(btrim(title)) > 0)
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  initials text not null,
  avatar_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint participants_name_not_blank check (length(btrim(name)) > 0),
  constraint participants_initials_not_blank check (length(btrim(initials)) > 0)
);

create table public.meeting_participants (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  role text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (meeting_id, participant_id)
);

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  storage_bucket text not null default 'meeting-recordings',
  storage_path text not null unique,
  mime_type text not null,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  waveform smallint[] not null default '{}',
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recordings_storage_path_not_blank check (length(btrim(storage_path)) > 0)
);

create table public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  speaker_participant_id uuid references public.participants(id) on delete set null,
  speaker_name text not null,
  start_seconds integer not null check (start_seconds >= 0),
  end_seconds integer check (end_seconds is null or end_seconds >= start_seconds),
  text text not null,
  sort_order integer not null check (sort_order >= 0),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english'::regconfig, coalesce(speaker_name, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(text, '')), 'A')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transcript_text_not_blank check (length(btrim(text)) > 0),
  unique (meeting_id, sort_order)
);

create table public.summaries (
  meeting_id uuid primary key references public.meetings(id) on delete cascade,
  purpose text not null,
  key_takeaways text[] not null default '{}',
  topics text[] not null default '{}',
  decisions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint summaries_purpose_not_blank check (length(btrim(purpose)) > 0)
);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  task text not null,
  owner_participant_id uuid references public.participants(id) on delete set null,
  owner_name text,
  deadline date,
  timestamp_seconds integer check (timestamp_seconds is null or timestamp_seconds >= 0),
  status text not null default 'open' check (status in ('open', 'completed')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint action_items_task_not_blank check (length(btrim(task)) > 0)
);

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  label text,
  title text not null,
  detail text not null,
  timestamp_seconds integer check (timestamp_seconds is null or timestamp_seconds >= 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint highlights_title_not_blank check (length(btrim(title)) > 0),
  constraint highlights_detail_not_blank check (length(btrim(detail)) > 0)
);

create table public.meeting_shares (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  token_hash text not null unique,
  token_hint text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_shares_token_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint meeting_shares_token_hint_length check (token_hint is null or length(token_hint) <= 8)
);

create unique index participants_email_unique
  on public.participants (lower(email))
  where email is not null;

create unique index recordings_one_primary_per_meeting
  on public.recordings (meeting_id)
  where is_primary;

create index meeting_participants_participant_id_idx
  on public.meeting_participants (participant_id);

create index recordings_meeting_id_idx
  on public.recordings (meeting_id);

create index transcript_segments_meeting_time_idx
  on public.transcript_segments (meeting_id, start_seconds);

create index transcript_segments_speaker_idx
  on public.transcript_segments (speaker_participant_id);

create index action_items_meeting_order_idx
  on public.action_items (meeting_id, sort_order);

create index action_items_owner_idx
  on public.action_items (owner_participant_id);

create index highlights_meeting_order_idx
  on public.highlights (meeting_id, sort_order);

create index meeting_shares_meeting_id_idx
  on public.meeting_shares (meeting_id);

create index meetings_search_vector_idx
  on public.meetings using gin (search_vector);

create index transcript_segments_search_vector_idx
  on public.transcript_segments using gin (search_vector);

create trigger meetings_set_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

create trigger participants_set_updated_at
before update on public.participants
for each row execute function public.set_updated_at();

create trigger recordings_set_updated_at
before update on public.recordings
for each row execute function public.set_updated_at();

create trigger transcript_segments_set_updated_at
before update on public.transcript_segments
for each row execute function public.set_updated_at();

create trigger summaries_set_updated_at
before update on public.summaries
for each row execute function public.set_updated_at();

create trigger action_items_set_updated_at
before update on public.action_items
for each row execute function public.set_updated_at();

create trigger highlights_set_updated_at
before update on public.highlights
for each row execute function public.set_updated_at();

create trigger meeting_shares_set_updated_at
before update on public.meeting_shares
for each row execute function public.set_updated_at();

alter table public.meetings enable row level security;
alter table public.participants enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.recordings enable row level security;
alter table public.transcript_segments enable row level security;
alter table public.summaries enable row level security;
alter table public.action_items enable row level security;
alter table public.highlights enable row level security;
alter table public.meeting_shares enable row level security;

-- The current product has no authentication model. Keep Data API access closed until
-- ownership and authenticated-user policies are designed in a dedicated migration.
revoke all on table
  public.meetings,
  public.participants,
  public.meeting_participants,
  public.recordings,
  public.transcript_segments,
  public.summaries,
  public.action_items,
  public.highlights,
  public.meeting_shares
from anon, authenticated;

grant all on table
  public.meetings,
  public.participants,
  public.meeting_participants,
  public.recordings,
  public.transcript_segments,
  public.summaries,
  public.action_items,
  public.highlights,
  public.meeting_shares
to service_role;

comment on table public.meetings is 'Meeting metadata and processing state.';
comment on table public.recordings is 'Metadata for media objects stored in Supabase Storage.';
comment on table public.transcript_segments is 'Ordered, timestamped transcript text used by the player and search.';
comment on table public.summaries is 'One structured summary per meeting.';
comment on table public.meeting_shares is 'Hashed unguessable tokens for public read-only meeting links.';
