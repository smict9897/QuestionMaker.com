# SaifulSir.com — starter
1. `npm i && cp .env.example .env.local` (fill DATABASE_URL, GEMINI_API_KEY)
2. `npx prisma db push`
3. `npx shadcn@latest init` (add components as you need them)
4. `npm run dev`, then deploy to Vercel (set the same env vars).
Built: layout/ticker/navbar, landing page, working AI quiz action + UI, Prisma schema, admin shell.
Next: auth + role middleware, admin CRUD pages, PDF upload (Vercel Blob), model tests + leaderboard, jobs feed, hire form -> Inquiry.

## Auth (added)
- Run `npx auth secret` and put AUTH_SECRET in .env.local; set ADMIN_EMAIL, then `npx prisma db push` again.
- Register at /login with ADMIN_EMAIL to get the ADMIN role; everyone else is STUDENT. Teachers: change role in `npx prisma studio`.
- /admin/* is protected by middleware (ADMIN or TEACHER); saveQuestions re-checks the role on the server.

