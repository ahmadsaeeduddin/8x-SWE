# Echo
<p align="center">
  A focused meeting-intelligence workspace that turns transcripts into searchable summaries, decisions, action items, highlights, and grounded answers.
</p>

<p align="center">
  <video src="./data/animated-presentation.mp4" width="100%" autoplay muted loop controls playsinline>
    Your Markdown viewer does not support inline video.
  </video>
</p>

<p align="center">
  <a href="./data/animated-presentation.mp4"><strong>▶ Play the animated product presentation</strong></a>
</p>


## Demo guide

For the quickest evaluation, follow this path:

1. Open the dashboard and review the three seeded meetings.
2. Search for a meeting title or a phrase from a transcript.
3. Open a meeting to explore its summary, action items, highlights, recording timeline, and timestamped transcript.
4. Open **Ask AI** and ask a question about the current meeting. Answers are grounded only in that meeting and link back to transcript timestamps when possible.
5. Select **Share** to create a public, read-only link. The shared recap can also be downloaded as a PDF.
6. Select **Import meeting** to run the real upload and analysis flow.

### Testing the import flow

The import page opens with a JSON format guide:

1. Select **Download JSON template**.
2. Fill in the meeting title, date, duration, speakers, timestamps, and transcript text.
3. Save the completed file as JSON.
4. Choose one of the supported modes:
   - **Transcript only** — upload the completed JSON transcript.
   - **Audio + transcript** — upload the JSON transcript and matching audio. Audio is used for playback; the transcript remains the source of truth.
5. Submit the files and wait for the status to move from `uploaded` to `analyzing` to `ready`.

Audio-only import is intentionally not supported because speaker names and timestamps must come from the supplied transcript.

## Features

- Responsive SaaS dashboard with real Supabase meeting data
- Dynamic meeting detail pages for every processed meeting
- Recording playback for paired audio uploads
- Timestamped, speaker-attributed transcripts with click-to-seek
- AI-generated purpose, summary, takeaways, topics, and decisions
- Structured action items and meeting highlights
- Grounded Ask AI experience scoped to the current meeting
- PostgreSQL search across meeting titles and transcript text
- Unguessable public, read-only sharing links
- Downloadable PDF meeting recaps
- Meeting deletion across the UI and Supabase
- Transcript-only and audio-plus-transcript import flows
- Downloadable JSON transcript template for evaluators
- Loading, empty, validation, processing, and failure states
- Responsive light/dark appearance controls

## Technology

| Layer | Technology |
|---|---|
| Application | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, reusable components, Lucide icons |
| Database | Supabase PostgreSQL |
| Storage | Private Supabase Storage bucket |
| AI | OpenAI Responses API with structured outputs |
| PDF export | `pdf-lib` |
| Deployment | Vercel |

## How it works

```text
JSON transcript (+ optional audio)
                │
                ▼
       Validate transcript format
       and compare audio duration
                │
                ▼
     Save meeting, participants,
     transcript, and optional audio
                │
                ▼
          uploaded → analyzing
                │
                ▼
  understanding │ actions │ highlights
                │
                ▼
        Validate structured output
                │
                ▼
              ready
```

If validation or analysis cannot complete safely, the meeting is marked `failed`. Action-item owners, deadlines, and timestamps remain empty when the transcript does not clearly support them.

## Local setup

### Requirements

- Node.js 20 or newer
- npm
- A Supabase project
- An OpenAI API key for live imports and Ask AI

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the environment

Copy `.env.local.example` to `.env.local`, then provide:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SECRET_KEY=sb_secret_your_key

OPENAI_API_KEY=sk-your_openai_key
OPENAI_ANALYSIS_MODEL=gpt-4o-mini
OPENAI_ASK_MODEL=gpt-4o-mini

ENABLE_DEVELOPMENT_MOCK_FALLBACK=false
```

Only variables beginning with `NEXT_PUBLIC_` may be exposed to browser code. Supabase secret and OpenAI keys must remain server-only.

### 3. Prepare Supabase

Review and apply the SQL files in `supabase/migrations/` in filename order. The migrations create:

- Meeting, participant, recording, transcript, summary, action, highlight, and share tables
- Row Level Security and least-privilege grants
- PostgreSQL full-text meeting/transcript search
- The private `meeting-recordings` Storage bucket

Migrations are intentionally not applied automatically by this repository.

### 4. Seed the demo meetings

```bash
npm run db:seed
```

The seed command uses stable IDs and upserts, so it can be run repeatedly without creating duplicate demo meetings.

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build and run TypeScript checks |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run db:seed` | Upsert the three demo meetings into Supabase |
| `npm run ai:test-fixture` | Run the AI analysis pipeline against the local fixture |

## Project structure

```text
src/
  app/
    api/                     # Import, search, sharing, deletion, and Ask AI
    meetings/[id]/           # Dynamic meeting detail page
    meetings/new/            # Transcript/audio import flow
    share/[token]/           # Public recap and PDF download
  components/
    layout/                  # App shell, navigation, header, background
    meetings/                # Dashboard, cards, detail, import, sharing
    search/                  # Global meeting/transcript search
    settings/                # Appearance controls
  lib/
    ai/                      # Structured analysis and meeting Q&A
    audio/                   # Upload and duration validation
    meetings/                # Meeting data adapters
    shares/                  # Public share resolution
    supabase/                # Browser, server, and admin clients
    transcripts/             # TXT/JSON parsing and validation
  types/                     # Application and generated database types
supabase/
  migrations/                # Database, search, and Storage definitions
data/
  seed/                      # Stable demo fixture data
  animated-presentation.mp4 # Product presentation
```

## Intentional scope

Echo focuses on post-meeting intelligence and a clear assessment demo. It does not include authentication, billing, calendar integrations, meeting bots, live transcription, CRM integrations, or speaker diarization. The complete product boundary is documented in [`Scope.md`](./Scope.md), with the system design in [`data/architecture.md`](./data/architecture.md).

## Deployment

Deploy the Next.js application to Vercel, add the same environment variables, and point it at the migrated Supabase project. Keep the service-role and OpenAI credentials server-only.
