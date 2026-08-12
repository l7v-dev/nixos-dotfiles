# Architecture Context

## Stack

| Layer      | Technology               | Role                                           |
| ---------- | ------------------------ | ----------------------------------------------- |
| Framework  | Next.js 16 + TypeScript  | Full-stack app with server/client boundaries    |
| UI         | Tailwind + shadcn/ui     | Component composition and styling               |
| Auth       | TODO (e.g. Clerk)        | User identity and route protection              |
| Database   | TODO (e.g. Prisma + Postgres) | Relational/persistent data                 |
| Background | TODO (e.g. Trigger.dev)  | Durable/long-running workflows                  |
| Storage    | TODO (e.g. Vercel Blob)  | Large generated artifacts                       |

Remove rows that don't apply. This table must always reflect what's actually
installed in `package.json` — update it in the same change that adds or
removes a dependency.

## System Boundaries

- `app/api` — Authenticated request handlers: input validation, ownership
  checks, task triggering, and persistence. No long-running work here.
- `lib` — Shared infrastructure: clients, access-control helpers, utilities.
- `components` — UI composition only; no business logic.
- TODO — add boundaries for any additional top-level dirs this project uses
  (`trigger/`, `workers/`, etc).

## Storage Model

TODO — describe what lives where once persistence is decided: which data is
relational, which is blob/file, which is derived/cache-only. State the
invariant explicitly (e.g. "the DB never stores generated content directly,
only a reference to where it's stored").

## Auth Model

TODO — describe ownership model, protected routes, and any collaborator/role
concept, once auth is decided.

## Invariants

1. Request handlers do not run long-lived work — that belongs in background
   tasks or a queue.
2. Metadata and large generated artifacts are stored in separate layers.
3. Auth and ownership are enforced at every mutation boundary.
4. Client components (`"use client"`) are used only where browser
   interactivity or real-time state requires them.

Add project-specific invariants below as they're discovered — an invariant
violated once and fixed should be written down here so it isn't violated
again.
