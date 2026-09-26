-- Ranked search across meeting titles/summaries and transcript text.
-- Access remains server-only until an authenticated product access model exists.

create or replace function public.search_meeting_content(
  search_query text,
  result_limit integer default 20
)
returns table (
  meeting_id uuid,
  meeting_title text,
  meeting_starts_at timestamptz,
  result_type text,
  transcript_segment_id uuid,
  speaker_name text,
  start_seconds integer,
  snippet text,
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with parsed_query as (
    select websearch_to_tsquery('english'::regconfig, search_query) as query
    where nullif(btrim(search_query), '') is not null
  ),
  ranked_results as (
    select
      meeting.id as meeting_id,
      meeting.title as meeting_title,
      meeting.starts_at as meeting_starts_at,
      'meeting'::text as result_type,
      null::uuid as transcript_segment_id,
      null::text as speaker_name,
      null::integer as start_seconds,
      coalesce(meeting.short_summary, meeting.title) as snippet,
      (ts_rank(meeting.search_vector, parsed_query.query) * 2)::real as rank
    from public.meetings as meeting
    cross join parsed_query
    where meeting.search_vector @@ parsed_query.query

    union all

    select
      meeting.id as meeting_id,
      meeting.title as meeting_title,
      meeting.starts_at as meeting_starts_at,
      'transcript'::text as result_type,
      segment.id as transcript_segment_id,
      segment.speaker_name,
      segment.start_seconds,
      ts_headline(
        'english'::regconfig,
        segment.text,
        parsed_query.query,
        'StartSel=<mark>, StopSel=</mark>, MaxWords=28, MinWords=12'
      ) as snippet,
      ts_rank(segment.search_vector, parsed_query.query)::real as rank
    from public.transcript_segments as segment
    join public.meetings as meeting on meeting.id = segment.meeting_id
    cross join parsed_query
    where segment.search_vector @@ parsed_query.query
  )
  select ranked_results.*
  from ranked_results
  order by ranked_results.rank desc, ranked_results.meeting_starts_at desc
  limit least(greatest(result_limit, 1), 50);
$$;

revoke all on function public.search_meeting_content(text, integer) from public, anon, authenticated;
grant execute on function public.search_meeting_content(text, integer) to service_role;

comment on function public.search_meeting_content(text, integer)
is 'Server-only ranked full-text search for meeting and transcript results.';
