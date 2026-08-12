# UI Context

## Design Tokens

- Colors, spacing, and typography are defined as CSS custom properties in
  `app/globals.css` and exposed as Tailwind utilities (`bg-base`,
  `text-copy-primary`, `border-surface-border`, etc).
- Never use raw Tailwind palette classes (`zinc-500`, `gray-800`, ...) or
  hardcoded hex values in components — always go through a token.

## Radius Scale

- `rounded-xl` — small elements (buttons, inputs, chips)
- `rounded-2xl` — cards
- `rounded-3xl` — modals, sheets

## Component Conventions

- Base primitives come from `components/ui/*` (shadcn/ui) — treat as
  generated/foundation code, don't hand-edit unless explicitly instructed.
- App-specific composition and styling lives in `components/` outside `ui/`.
- Icons: `lucide-react`.

## Theme

TODO — describe the visual identity once decided: light/dark strategy, brand
color, typographic voice, any motion/animation conventions.

## Layout Conventions

TODO — describe the shell/navigation structure once decided (sidebar layout?
top nav? canvas-first?).
