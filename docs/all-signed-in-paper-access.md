# All signed-in users may create question papers

Reported: Google/default STUDENT sees “শিক্ষক বা অ্যাডমিন হিসেবে লগইন করুন” on English generation. Cause: shared English owner() helper excluded STUDENT even though setup was reachable. Now a valid signed-in user ID is sufficient for generation and own draft load/list/save. No promotion or database role change.

Non-ADMIN users, including STUDENT, retain ten English provider generation attempts/day and per-account concurrent generation lock. ADMIN remains quota-exempt. Approved-bank-first reuse, complete-task checkpoint recovery, private owner-hashed draft keys, pending admin review and strict validation unchanged. Anonymous/missing-ID users still denied before writes/provider calls. No change to publication/admin/review access.

General saved papers page also removed a leftover ADMIN/TEACHER route gate; authenticated students may view their own purchased/saved papers, consistent with existing paid-student save action. Anonymous users redirect to login with safe return. MCQ/SQ/CQ wallet checkout, package/ADMIN exemptions and bonus unaffected. English billing remains outside MCQ/SQ/CQ prices, as before. UI quota/empty-state copy now addresses all authenticated users.

Verification: 196 unit/security tests, TypeScript, dummy-environment production build passed. New action tests prove STUDENT generate/save/list/reopen, denial across different student/teacher/anonymous sessions, ten/day quota, single-generation lock, interrupted task pending/private recovery. Existing ADMIN and wallet tests pass. Fourteen-template English mock browser regression passes; not a live student OAuth/provider/database generation test.

Manual: login with an ordinary Google/credential account whose actual role is STUDENT; create Class6/Class8 English selected writing/full paper, edit/save/reopen; bank reuse and ten/day behavior; general wallet checkout→save→saved list; cannot access other users' drafts or admin approval. Confirm ADMIN still exempt. Live auth/provider balance/timeouts and correctness remain separate from this authorization fix.
