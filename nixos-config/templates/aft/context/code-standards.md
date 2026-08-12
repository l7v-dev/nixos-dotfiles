# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes — do not layer workarounds.
- Do not mix unrelated concerns in one component or route.
- Respect the system boundaries defined in `architecture-context.md`.

## TypeScript

- Strict mode is required throughout the project.
- Avoid `any`; use explicit interfaces or narrowly scoped types.
- Validate unknown external input at system boundaries before trusting it.
- Use `interface` for object contracts.

## Next.js

- Default to React Server Components.
- Add `"use client"` only when the component needs browser interactivity,
  hooks, or real-time state.
- Keep route handlers focused on a single responsibility.
- Long-running work belongs in background tasks, not in request handlers.

## Styling

- Use CSS custom property tokens defined in `globals.css` — no raw Tailwind
  color classes like `zinc-*` or hardcoded hex values.
- Reference tokens through their Tailwind utility names.
- Maintain the border radius scale defined in `ui-context.md`.

## API Routes

- Validate and parse request input before any logic runs.
- Enforce auth and ownership checks before any mutation.
- Return consistent, predictable response shapes.
- Keep route handlers thin — push complexity into shared modules or
  background tasks.

## Data and Storage

- Follow the storage model documented in `architecture-context.md`; do not
  introduce a new persistence layer without updating that file first.
- Do not store large generated content directly in a relational database —
  use blob/file storage and keep only a reference.

## File Organization

- `lib/` — shared infrastructure: clients, auth helpers, utilities.
- `components/` — UI composition only; no business logic.
- `app/api/` — route handlers.
- Name files after the responsibility they contain, not the technology.
