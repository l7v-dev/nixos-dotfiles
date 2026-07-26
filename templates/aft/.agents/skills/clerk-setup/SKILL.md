# Skill: Clerk Authentication Setup

## Adımlar
1. `@clerk/nextjs` paketini yükleyin.
2. `.env.local` içinde `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` ve `CLERK_SECRET_KEY` tanımlayın.
3. `src/app/layout.tsx` dosyasını `<ClerkProvider>` ile sarmalayın.
