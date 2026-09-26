# Echo seed fixtures

Persistent demo data for the meeting-intelligence app.

Contents:
- meetings.json
- participants.json
- meeting-participants.json
- summaries.json
- action-items.json
- highlights.json
- recordings.json
- shares.json
- transcripts/*.txt

The three meetings use stable IDs so the seed process can upsert them safely.
Codex should map these fixture fields to the existing Supabase schema rather than redesigning the schema around the fixture files.
