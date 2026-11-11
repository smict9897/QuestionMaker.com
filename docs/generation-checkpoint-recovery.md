# Generation checkpoints and interrupted-output recovery

## Scope

- English practice paper generation, including Class 11 / second paper.
- Standard question-builder topic preparation (Bangla/English subjects).
- Admin AI worker MCQ/CQ/SQ jobs. BLOG generation is deliberately unchanged.
- Not the live-exam/model-test/quiz or PDF-import generators. Those paths have not been converted.

## Behaviour

The provider is requested to stream SSE. The bounded reader decodes UTF-8 incrementally, awaits database checkpoints before processing more output and limits the complete wire response to 1 MB. Non-stream JSON envelopes remain supported. Only complete JSON objects in the relevant root-level array are extracted; truncated objects are never repaired or padded with invented answers.

### English

- Generation is split by selected task. Tasks sharing a passage group are generated together so the linked unseen passage remains identical. HSC second paper therefore makes up to 16 distinct requests, not retries of the whole paper. A shared 90-second deadline covers all groups; no paid automatic retry.
- Every completed task is independently revalidated against a single-task subset of the original selection: counts, requested topics/word limits, answers, tables and exact supplied sources remain required.
- A transaction saves both an owner-private, reopenable draft and an immutable PENDING review snapshot in existing Setting storage. Stable owner/selection/output-derived keys suppress identical recovery snapshots across retries. They do not assert semantic deduplication of freshly generated questions.
- Owner recovery drafts appear at `/question-builder/english/saved`, linked from setup. Other users cannot load them. Full output still has to pass the original whole-paper validator before normal success navigation.
- Admin review: `/admin/english-review`, linked in the admin question-bank navigation. ADMIN is checked both on page load and server mutation. Decisions use stored-value CAS and cannot overwrite an already-decided snapshot. Editing the owner's draft does not change the review snapshot.
- Approval changes review status only; it does **not** inject English tasks into the incompatible MCQ/CQ/SQ public bank. Public English distribution/reuse requires a separately designed compatible bank.
- INVALID_OUTPUT can now include a safe task id and static validation rule, without provider bodies, source text or credentials. The prompt explicitly disallows placeholder unseen passages in grammar/writing-only requests and reinforces object subitems and empty writing subitems.
- Failed generation reports saved checkpoint count. A DB checkpoint failure reports STORAGE, not a false successful save.

### Standard preparation and admin worker

- Each complete valid question is saved with `approved: false` as it arrives, even if a later chunk fails. Standard preparation preserves its existing owner-specific pending source; worker output keeps AI_GENERATOR.
- Standard preparation validates each object against the existing schema. Worker MCQs require four distinct choices, a real key and explanation; SQ requires its answer; CQ requires all expected parts and answers (three parts for math, four otherwise).
- Existing question fingerprints and in-response fingerprints filter duplicates. Batch caps still apply. This is not a globally unique semantic deduplication service.
- Worker job claiming is conditional on PENDING status, preventing two invocations from claiming the same job. Interrupted or underfilled worker output remains FAILED, with already-stored pending questions retained.
- Pending approval remains in `/admin/questions?status=pending` / existing manage controls. No automatic publication.

## Limits and costs

- Durable only **after** the DB write succeeds. No promise to recover bytes never received, the currently incomplete question, an unfinished English task's individual subitems, or a failed database write.
- A phone disconnect does not remove already-written checkpoints, but does not guarantee the server keeps running after platform cancellation. This is not a durable background queue.
- No automatic resume cursor or filling only missing tasks. New runs remain new generation attempts; exact English snapshots and retrieved bank questions are deduplicated as above. Teachers retain existing daily caps and ADMIN remains exempt from the English daily cap.
- More small English requests may increase prompt overhead; all selected task groups share the original overall deadline. A full HSC paper can still timeout and leave recoverable completed tasks.
- English owner/review lists remain bounded at 100 key-ordered records. No migration, quota cleanup or payment change.

## Validation performed

- TypeScript passed; production build passed with dummy DB/auth configuration (not a real DB integration test).
- 163 automated tests passed, including interrupted SSE, UTF-8 byte splits, 1 MB cap, complete-object extraction, HSC second-paper 16-task assembly with answers, failed later task preserving a checkpoint, invalid task rule diagnostics, owner isolation, stable checkpoint deduplication, admin review authorization/CAS, interrupted topic preparation and interrupted worker pending saves.
- Chromium mock checks: setup failure/recovery notice/link, no false success redirect, 14 template editors, mobile overflow, existing settings/Undo/Redo/save/answer separation.
- All 14 synthetic PDFs parsed, nonblank, topic retained, no answers leaked into question mode (2–16 pages).
- These are mocks/synthetic data, not live DeepSeek, real database, authenticated production or native-phone print proof.

## Manual release checks

1. Generate Class 11 / English second paper with writing topics and with/without separate answers. Verify complete paper if it finishes and precise safe task rule if a provider task is invalid.
2. During provider streaming, interrupt upstream connection or hit timeout. Reopen saved English checkpoints; verify source, marks, numbering, requested answer separation. Confirm no partial task is represented as a complete full paper.
3. As another teacher, attempt opening the recovery draft key and accessing/reviewing `/admin/english-review`; deny both. As ADMIN review a snapshot, then submit a stale competing decision; retain the first decision. Never publish automatically.
4. Repeat identical mock output; no duplicate recovery snapshot. Fresh output may create a different snapshot.
5. Interrupt standard topic preparation and worker MCQ/CQ/SQ after one valid question. Verify pending DB record survives, incomplete object is absent, and task status/counters do not claim a complete batch.
6. Test worker math three-part CQ and other-subject four-part CQ, including missing answers and invalid MCQ keys. Confirm pending questions use the existing approval interface.
7. Confirm existing teacher quotas, ADMIN English quota exemption, normal paper builder, Bengali print, live exams and BLOG behaviour are unchanged.

## Database-first English selection (supersedes review-status-only note above)

English generation now checks compatible **ADMIN-approved English review snapshots** before requiring a provider key or consuming an AI daily attempt. Matching includes grade, paper, task id, exact writing topic/type/effective word limit/special instruction and exact supplied source text/reference. Requested answers require an answer-bearing approved snapshot; when answers are not requested, existing keys/samples are stripped before validation. Pending, rejected, owner-private drafts and incompatible legacy MCQ/CQ/SQ bank records are never reused across accounts.

Lookup pages through approved snapshots in stable key order, 100 per page, until all requested groups are filled or storage is exhausted. Passage-linked tasks must form a complete requested group with the same passage; unrelated unseen passages are never mixed. Missing groups alone go to AI. Combined output is revalidated against the complete original selection. An all-bank paper works without provider configuration and does not consume an AI quota slot. Approval now explicitly makes compatible English content eligible for other English paper requests, not for automatic live-test publication.

Selection UI now uses responsive numbered task cards, distinct mark badges, checked-state styling, live total/part counts, bulk select/clear, structured writing inputs, readable sans-serif typography with a bundled Bengali fallback, and existing purple/pink branding. Native labelled checkboxes/keyboard focus are preserved. This does not alter print-paper typography or templates.

Validation: 167 tests (including database-only without provider/key/quota, partial-hit missing-only calls, approval/owner isolation, exact topic/grade/answer matching, answer stripping, pagination and passage-group integrity), typecheck, production build with dummy DB/auth, Chromium desktop/mobile selection totals/bulk actions and the existing 14 template/PDF mock checks. No authenticated production/provider/real database proof. Manual: approve an English snapshot, request matching task from another teacher, test partial bank hit, then change topic/source/answer requirement and confirm mismatches are not silently reused.
