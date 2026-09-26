# Project overview

A Fathom-style meeting intelligence app focused on the `Scope.md` **In scope** features: meeting dashboard, meeting detail, transcript, AI summary, action items, highlights, search, sharing, and one real upload/demo processing flow. Seeded meetings keep the app demoable without API keys.

# Tech stack

| Layer | Technology |
|---|---|
| Web app | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + reusable React components |
| Primary analysis | OpenAI API |
| Analysis fallback | Google Gemini API |
| Speech-to-text | Groq Whisper or another free-tier STT provider |
| Database | Supabase PostgreSQL |
| File storage | Supabase Storage |
| Deployment | Vercel |

# High-level system flow

1. User opens a seeded meeting or uploads audio/video or a demo transcript.
2. Media is stored in Supabase Storage and meeting metadata in PostgreSQL.
3. Uploaded media is transcribed; supplied transcripts skip STT.
4. OpenAI generates structured meeting insights, with Gemini as the fallback.
5. Validated results are stored and shown on the meeting detail and share pages.
6. Search uses meeting titles and transcript text stored in PostgreSQL.

# Frontend structure

- **Dashboard:** meetings, search, processing status, and upload/demo action.
- **Meeting detail:** player, recap, actions, highlights, and timestamped transcript.
- **Share page:** public read-only meeting recap through an unguessable token.
- **Shared UI:** loading, empty, processing, ready, and error states.

# Backend structure

- Next.js Server Components load page data.
- Route Handlers manage uploads, processing, search, media access, and sharing.
- A typed AI service wraps OpenAI and Gemini.
- A typed STT service wraps Groq Whisper or a replacement provider.
- Supabase and AI credentials remain server-only.
- Processing states: `uploaded`, `transcribing`, `analyzing`, `ready`, and `failed`.

# Database structure

- `meetings`: title, start time, participants, duration, status, visibility, share token.
- `recordings`: meeting ID, storage path, media type, duration.
- `transcript_segments`: meeting ID, speaker, start/end time, text.
- `summaries`: meeting ID, purpose, takeaways, topics, decisions.
- `action_items`: meeting ID, task, optional owner/deadline, status.
- `highlights`: meeting ID, text, optional timestamp, label.

PostgreSQL full-text indexes cover meeting titles and transcript text.

# AI/STT flow

1. Validate and upload media to Supabase Storage.
2. Transcribe with Groq Whisper and normalize timestamped segments.
3. Send one meeting transcript to OpenAI using a strict structured-output schema.
4. Use Gemini only when the primary analysis fails.
5. Validate before saving; unknown owners, deadlines, or timestamps remain empty.

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
    ai/                       # OpenAI + Gemini fallback
    stt/                      # Groq Whisper adapter
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
