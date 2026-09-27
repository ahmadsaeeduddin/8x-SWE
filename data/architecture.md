# Project overview

A Fathom-style meeting intelligence app focused on the `Scope.md` **In scope** features: meeting dashboard, meeting detail, transcript, AI summary, action items, highlights, search, sharing, and one real upload/demo processing flow. Seeded meetings keep the app demoable without API keys.

# Tech stack

| Layer | Technology |
|---|---|
| Web app | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + reusable React components |
| AI analysis | OpenAI API |
| Database | Supabase PostgreSQL |
| File storage | Supabase Storage |
| Deployment | Vercel |

# High-level system flow

1. User opens a seeded meeting or imports a transcript, optionally paired with audio.
2. The transcript is validated and remains the source of truth; paired audio is stored privately for playback.
3. OpenAI generates validated, structured meeting insights.
4. Validated results are stored and shown on the meeting detail and share pages.
5. Search uses meeting titles and transcript text stored in PostgreSQL.

# Frontend structure

- **Dashboard:** meetings, search, processing status, and upload/demo action.
- **Meeting detail:** player, recap, actions, highlights, and timestamped transcript.
- **Share page:** public read-only meeting recap through an unguessable token.
- **Shared UI:** loading, empty, processing, ready, and error states.

# Backend structure

- Next.js Server Components load page data.
- Route Handlers manage uploads, processing, search, media access, and sharing.
- A typed AI service wraps OpenAI structured outputs.
- Supabase and AI credentials remain server-only.
- Import processing uses `uploaded` → `analyzing` → `ready`, or `failed` on unsafe failure.

# Database structure

- `meetings`: title, start time, participants, duration, status, visibility, share token.
- `recordings`: meeting ID, storage path, media type, duration.
- `transcript_segments`: meeting ID, speaker, start/end time, text.
- `summaries`: meeting ID, purpose, takeaways, topics, decisions.
- `action_items`: meeting ID, task, optional owner/deadline, status.
- `highlights`: meeting ID, text, optional timestamp, label.

PostgreSQL full-text indexes cover meeting titles and transcript text.

# AI and import flow

1. Validate the required TXT/JSON transcript; reject audio-only imports.
2. For paired imports, check transcript timestamps against browser-readable audio duration and upload audio to private Supabase Storage.
3. Save participants and transcript segments, then run three focused OpenAI structured-output calls for understanding, action items, and highlights.
4. Validate every result before saving; unknown owners, deadlines, or timestamps remain empty.
5. Serve playback through short-lived signed URLs.

# Main project folder structure

```text
src/
  app/
    page.tsx                  # Meetings dashboard
    meetings/[id]/page.tsx   # Meeting detail
    share/[token]/page.tsx   # Public recap
    api/                      # Upload, processing, search, share routes
  components/
    meetings/
    transcript/
    ui/
  lib/
    ai/                       # OpenAI analysis pipeline
    supabase/                 # Database and storage clients
    validation/               # Input and AI-output schemas
  types/
supabase/
  migrations/
  seed.sql
public/
data/
  architecture.md
Scope.md
```
