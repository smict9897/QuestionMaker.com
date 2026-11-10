# Database-first question preparation

## Flow
Homepage and question-builder selection now navigate to `/question-builder/prepare`. The authenticated preparation page checks the selected class/subject and runs one task per distinct selected chapter (max 12 per request).

Each task:
1. Counts approved questions OR this account's private pending questions, using the same class aliases as the picker.
2. If any matching question exists, reuses it without an AI request. This is availability checking, not a promise of a minimum quantity or complete MCQ/CQ/SHORT coverage.
3. Only when none exists, calls existing DeepSeek configuration to request up to six sample questions (a mix of MCQ/SHORT/CQ), validates a strict bounded response and saves an atomic pending batch.
4. Uses `approved:false` and `AI_PENDING:<sha256(accountId)>` in the existing source column. No schema migration. These are durable review records, not public bank entries.
5. Goes to the existing question picker. Creator can select/print/use their pending questions immediately. Picker, question-by-ID API and saved-paper metadata reads restrict private pending access to that account. Public pages continue to count/read approved questions only.

Admin `/admin/questions?status=pending` and existing management page show these rows. Existing ADMIN-only approve actions make them public; delete removes them. A rejected/deleted row will no longer load from saved IDs later (paper snapshots currently save IDs/settings, not immutable question bodies). Creator edits in the paper builder do not change the original pending review row.

The older quiz/AI save actions now also save new AI batches pending with creator scope rather than automatically publishing them. Existing approved data is not changed.

## All chapters / partial availability
- Explicit selected chapters are checked separately; existing chapters are reused and only missing chapters are generated.
- With no chapter selected, any visible subject-bank questions go directly to selection. It does not generate every missing curriculum chapter automatically in this mode.
- If the whole subject is empty, curriculum chapters are used if there are at most 12. More than 12 requires the user to choose a smaller set. No curriculum metadata falls back to a clearly labelled whole-subject topic.
- A creator's existing pending batch is reused on retry, avoiding repeated generations.

## Honest processing UI
Screenshot-inspired green/cream processing card, animated document icon, selected class/subject, real server-task messages, completed-chapter progress, review notice, error/retry and return controls. No fake percentage or claim that textbooks were scanned. Reduced-motion is honored. The UI does not stream token progress; it waits for each real task.

## Controls and configuration
- Uses existing `DEEPSEEK_API_KEY`; no new secrets requested or production settings changed.
- Provider timeout 90s; prepare page/action route maxDuration 120s. No live provider call was made in this sandbox (provider host is not allowed).
- New preparation path reserves at most 12 AI chapter attempts/account/UTC day through uniquely keyed Setting rows. Failed attempts consume a reservation as well. Existing unrelated legacy generation endpoints are not covered by this new quota.
- Per-account/selection database lock prevents duplicate tabs; crashed locks become replaceable after 3 minutes. Short-lived locks are deleted in finally. Daily quota rows remain as audit/reservation records; long-term retention cleanup can be configured separately.
- DB errors never trigger AI as if the bank were empty. Missing key and provider/validation/persistence errors display retryable messages. Failed output is not published.
- Must be logged in before selecting; existing builder auth layout redirects guests to login and may require reselecting after login.

## Verification
- TypeScript check passed.
- 91 regression/security tests passed, including owner visibility, selection bounds, generated schema, DB-first no-provider behavior, authentication, pending CQ encoding, quota refusal and missing configuration.
- Production Next.js build passed using dummy local environment, not production DB/AI.
- No live database, provider, production account/approval or browser end-to-end test was performed for this change. No deployment created or verified.

## Owner's checklist before merge / after preview deployment
1. Confirm preview deployment is READY and `DEEPSEEK_API_KEY` is available securely in that environment. Do not paste the value into chat.
2. Account A: select a known class/subject/chapter with approved questions. Verify existing questions appear; no new pending batch/provider request should be created.
3. Select a missing chapter. Verify processing, then up to six usable AI questions in the picker. Review wording/math/answers; AI output isn't guaranteed correct.
4. Select one existing and one empty chapter. Only the empty chapter should generate. Reload/retry the same selection: existing pending questions should be reused, not regenerated.
5. Select/print generated questions in the builder; save/load if the account has teacher/admin paper-save permission.
6. Admin: open Pending questions, inspect the new MCQ/SHORT/CQ data. In a different normal account B, A's pending questions must NOT be searchable or retrievable by copied IDs.
7. Approve one as ADMIN. Account B should now find/use that approved row; other pending rows must remain private. Check home public count updates on reload.
8. Test missing provider config, provider failure and retry. Existing approved questions should still work without AI configuration. Failed output must not appear as public.
9. Check mobile layout/reduced motion and retained multiple-chapter/append selections.

User will click Create PR and merge. Agent does neither.
