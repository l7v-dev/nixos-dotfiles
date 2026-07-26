# Skill: Prisma ORM Setup

## Adımlar
1. `.env.local` içinde `DATABASE_URL` tanımlayın.
2. `npx prisma db push` veya `npx prisma migrate dev` çalıştırın.
3. İstemci kullanımı için `src/lib/prisma.ts` singleton örneğini çağırın.
