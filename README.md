# SaifulSir.com — starter
1. `npm i && cp .env.example .env.local` (fill DATABASE_URL, GEMINI_API_KEY)
2. `npx prisma db push`
3. `npx shadcn@latest init` (add components as you need them)
4. `npm run dev`, then deploy to Vercel (set the same env vars).
Built: layout/ticker/navbar, landing page, working AI quiz action + UI, Prisma schema, admin shell.
Next: auth + role middleware, admin CRUD pages, PDF upload (Vercel Blob), model tests + leaderboard, jobs feed, hire form -> Inquiry.

## Auth (added)
- Run `npx auth secret` and put AUTH_SECRET in .env.local; set ADMIN_EMAIL, then `npx prisma db push` again.
- Password registration always creates STUDENT accounts. To provision the owner, sign in with a verified Google account matching ADMIN_EMAIL, or set the role via a trusted database administrator. Teachers: change role in `npx prisma studio`.
- /admin/* is protected by middleware (ADMIN or TEACHER); saveQuestions re-checks the role on the server.


## Security update deployment
- Before serving traffic, back up/review the target database, then run `npm run db:security-deploy` followed by `npx prisma generate`. The additive, idempotent SQL creates only `ModelTestStart` and `ApiUsage`; it does not modify existing tables or rescore old attempts. This assumes the existing application schema is already provisioned.
- `npm run build` no longer runs `prisma db push`: builds must not implicitly synchronize or alter production tables. Deploy the new tables before rolling out this code.
- Model-test timers are now stored on the server and survive reloads. In-flight exams started before this deployment need to reload and start again.
- Practice exams remain available, but their scores stay local. Unverified `/api/leaderboard` POSTs now return 410; ranked participation uses scheduled model tests instead. Historical leaderboard entries are not automatically trusted or removed.
- Exam generation now requires login. AI generation has a shared per-user limit of 10 calls per UTC hour; failed upstream calls also count. DB mode does not consume AI credit. Periodically delete old `ApiUsage` rows (e.g. older than 7 days).
- Audit existing ADMIN accounts and active sessions after deploying: this patch prevents new password-based admin registration, but cannot undo prior compromise. Rotate AUTH_SECRET if existing sessions must be revoked.
- Regression tests: `npm run test:security`; type check: `npx tsc --noEmit`.

### Verification in the Arena sandbox
- TypeScript checks and security unit/handler regression tests pass.
- Standard Prisma engine download is blocked by sandbox outbound restrictions. A no-engine client was generated for type checking only, not for live database execution.
- Production compilation (`npx next build`) now passes. Tinos, Anek Bangla, and Hind Siliguri are self-hosted with their OFL licenses in `public/fonts`, so builds no longer fetch Google Fonts. This verifies compilation, not live database or gateway connectivity.
- No production DATABASE_URL or deployment environment is present here. The database script, account audit, session revocation, and live payment/Google login smoke tests have NOT been executed against production.
