# Agent instructions

## Required project context

Read `acrhitecture/README.md` before making changes. It is the source of truth for this service's stack, App Router boundaries, file placement, and DRY/KISS/SOLID rules. Update it whenever structure or responsibilities change.

## Workspace context

This repository is one of three independently versioned services in the Transcriber workspace:

- `transcriber-clean` — FastAPI transcription and WebSocket progress service on port `8000`.
- `bun-nestjs-auth-app` — NestJS authentication API on port `30111`, backed by PostgreSQL.
- `sborka-web-app` — Next.js web application and backend-for-frontend on port `30121`.

The web application consumes auth and transcription through stable HTTP/WebSocket contracts. Keep browser-safe and server-only code separated: internal service URLs and credentials belong in route handlers/server utilities, while only `NEXT_PUBLIC_*` values may enter the browser bundle. Do not duplicate backend business logic in the UI.

The workspace-level stack is available at `devops/docker-compose.yml`; run it from this repository with `docker compose -f devops/docker-compose.yml up --build`. Environment variables and secrets must stay outside Git.

## Working rules

- Treat each service directory as a separate Git repository. Commit only changes owned by this repository.
- Keep changes narrowly scoped and preserve public contracts unless the coordinating changes are made in every affected service.
- Run lint/build checks and `docker compose -f devops/docker-compose.yml config --quiet` before handoff.
- Never commit `.env`, build output, caches, credentials, tokens, or browser-exposed secrets.
