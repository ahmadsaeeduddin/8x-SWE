# Capture Test

## Tool and model

- Tool: OpenAI Codex CLI 0.157.1
- Model: `gpt-5.6-sol`, high reasoning effort
- Planning and execution: the same `gpt-5.6-sol` model performs both; there is no separate planner model

## Automatic capture mechanism

Codex project-local lifecycle hooks run automatically on every submitted prompt and every completed turn:

- `UserPromptSubmit` records the verbatim `prompt` field.
- `Stop` records the final `last_assistant_message` field.
- Both hooks receive and record the Codex session ID, active model slug, and a UTC timestamp.
- The hook deliberately does not subscribe to tool-use or intermediate-step events.

Configuration changed: `.codex/hooks.json`

Capture script: `.codex/hooks/capture-turn.ps1`

The project-local hook definition was reviewed and trusted through Codex's hook review UI before the successful canaries were run.

## Successful canary log paths

- `.agent-logs/2026-09-26_07-57-04_01a0dcb7-b1a3-7070-a81c-43b38b5f33e8.md`
- `.agent-logs/2026-09-26_07-57-30_01a0dcb8-1951-78e1-ad6f-c5dc5fa6a7aa.md`

## Canary 1 — raw entries

[LOG_ENTRY type=PROMPT num=1 session=01a0dcb7]
timestamp: 2026-09-26T07:57:04.815Z
model: gpt-5.6-sol

CAPTURE TEST — 8x assignment, Saeed


[LOG_ENTRY type=RESPONSE num=1 session=01a0dcb7]
timestamp: 2026-09-26T07:57:08.568Z
model: gpt-5.6-sol

Capture received: **8x assignment — Saeed**.

## Canary 2 — raw entries

[LOG_ENTRY type=PROMPT num=1 session=01a0dcb8]
timestamp: 2026-09-26T07:57:30.954Z
model: gpt-5.6-sol

CAPTURE TEST — 8x assignment, Saeed


[LOG_ENTRY type=RESPONSE num=1 session=01a0dcb8]
timestamp: 2026-09-26T07:57:34.464Z
model: gpt-5.6-sol

Captured: **8x assignment — Saeed**.

## What was tried first and did not work

The first automatic canary session did fire both hooks, but Windows PowerShell decoded Codex's UTF-8 hook input using the wrong console encoding. The em dash in the prompt was therefore not preserved verbatim. That failed log remains unedited at:

`.agent-logs/2026-09-26_07-55-41_01a0dcb6-6db8-77a0-924e-97ba855f6841.md`

The capture script was then changed to set `Console.InputEncoding` and `Console.OutputEncoding` explicitly to UTF-8 before reading stdin. Two new, independent Codex sessions were run after the fix; their raw entries above preserve the canary text exactly.
