# ADR-0001: Explicit multi-file submission through gateway SSE

Status: accepted (2026-08-31)

## Context

Drag-and-drop immediately started a single synchronous MP3/MP4 request and the browser opened WebSocket directly to Python. This bypassed the intended gateway and did not allow users to manage multiple active jobs.

## Decision

- Selection and submission are separate actions. Drag/drop and the file picker only populate a multi-file list; `Отправить` starts all selected files.
- Each file gets a browser-generated UUID and an independent process view.
- Next route handlers remain the same-origin browser boundary, read the HttpOnly auth session, and forward every transcriber request to auth-gateway with a bearer token.
- After `202`, each process opens `/api/transcriber/events/{uuid}`. The Next handler streams gateway SSE without buffering.
- The process selector lets the user switch transcript, progress, logs, and errors independently while other jobs continue.

## Consequences

No service URL or access token enters the client bundle. The UI can monitor concurrent UUID sessions; actual inference concurrency remains controlled by `WHISPER_MAX_CONCURRENCY`.
