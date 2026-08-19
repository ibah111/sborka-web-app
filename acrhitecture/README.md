# Web application architecture

> The directory name `acrhitecture` is retained as requested. This document is the local source of truth for implementation work.

## Purpose and stack

Full-stack web UI and backend-for-frontend for authentication, workspace navigation, transcription submission, history, and service health.

- Next.js 16 App Router, React 19 and TypeScript 5
- Material UI 7 with Emotion; Tailwind CSS/PostCSS available for utility styling
- Axios for upstream HTTP calls; Next route handlers as the server-side integration boundary
- Bun for dependency management/build; Node 20 standalone production runtime

## Root structure and responsibilities

```text
sborka-web-app/
├── app/
│   ├── (workspace)/          # workspace route group and shared layout
│   ├── api/                  # server-only BFF route handlers and upstream requests
│   ├── components/           # reusable UI and feature components
│   ├── config/               # validated application configuration
│   ├── consts/               # stable named constants
│   ├── lib/                  # focused auth, storage and service clients
│   ├── login/, register/     # public page routes
│   ├── layout.tsx            # root document layout
│   └── globals.css           # global tokens/resets only
├── public/                   # static browser assets
├── acrhitecture/             # this engineering guide
├── devops/                   # workspace-wide Compose entrypoint
├── Dockerfile                # standalone production build
└── package.json              # scripts and dependency manifest
```

`page.tsx` composes a route, `layout.tsx` owns shared route chrome, `route.ts` is an HTTP boundary, components render UI, and `lib/` files encapsulate reusable clients/session/storage behavior. Files using secrets or internal service URLs must stay server-only.

## Adding files

- Add pages under `app/<segment>/page.tsx`; use route groups only for shared layout without a URL segment.
- Add BFF endpoints under `app/api/<resource>/route.ts`. Validate input there and delegate repeated upstream behavior to `app/lib/*-service.ts`.
- Place feature-specific UI under `app/components/<feature>/`; promote a component to the common level only after genuine reuse.
- Keep shared types close to their feature (for example `components/transcriber/transcriber-types.ts`). Put configuration in `app/config`, constants in `app/consts`, and static files in `public`.
- Never import server credentials into Client Components. Only `NEXT_PUBLIC_*` values may enter the browser bundle.

## Clean-code rules

- DRY: centralize API/session behavior and stable UI primitives, but do not merge components that merely look similar while having different behavior.
- KISS: favor server components by default, minimal client state, small route handlers, and readable composition over custom state frameworks.
- SOLID: pages compose, components present/coordinate UI, service clients integrate, and route handlers translate HTTP. Depend on typed interfaces and pass dependencies/values explicitly.
- Use strict TypeScript, meaningful names, early returns, accessible semantic markup, explicit loading/error/empty states, and no `any` without a documented boundary reason.
- A change is complete when lint/build pass, responsive and error states are considered, server/browser boundaries are preserved, and Docker configuration renders successfully.
