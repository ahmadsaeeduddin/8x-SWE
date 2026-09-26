# Scope -- Fathom-style meeting intelligence

## In scope

Build these:

- Meetings dashboard with seeded meetings (plus any processed uploads)
- Meeting detail page with recording/player and notes in one place
- Transcript with timestamps (click-to-seek when a player exists)
- AI summary: purpose, key takeaways, topics, decisions
- Action items with owner/deadline when the model can infer them
- Highlights (notable moments, with timestamps when available)
- Search across meeting titles and transcripts
- Shareable public (or unguessable) meeting link
- Optional upload/demo meeting flow that runs the pipeline
- Real AI processing for transcript → summary / action items / highlights

Seeded meetings may ship with precomputed transcript/notes so the UI is always demoable even if an API key is missing. 
The optional upload/demo flow must call the real pipeline when configured.

---

## Out of scope

Do not build these unless the assignment explicitly requires them:

- Zoom / Google Meet / Teams **recording bot** or calendar auto-join
- Live transcription or real-time captions
- Full auth, orgs, roles, SSO, team workspaces
- Billing, plans, usage limits
- CRM, Slack, email, Notion, Asana sync
- Desktop app, browser extension, mobile apps
- Admin consoles, complex settings, compliance dashboards
- Phone calls, webinars, breakout rooms
- Bot-free system-audio capture (Fathom 3.0 Mac path)

---