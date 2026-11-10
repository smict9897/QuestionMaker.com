# English 2027 flow — implementation in progress

User approved grades 6–12; Full Model Test / Selected Items / Writing Only, English-specific passage/grammar/writing generation and strict requested writing topics. Keep existing Bengali builder, shared editor/save/PDF, private pending/admin sharing controls and Live Online Model Test unchanged. User explicitly forbids guessing NCTB marks and supplied all reference images after official attachments could not be retrieved.

## Completed this turn (foundation only)
`lib/english/blueprints.ts` transcribes fourteen templates (grades 6–12 × papers 1/2). Marks, section totals, explicit item counts/choice counts, word limits, writing alternatives, passage grouping and reference provenance are separate data. Tests verify all totals and supplied per-question arithmetic. Do not infer missing sub-item counts just from marks.

- Grades 6–8 first: 70 reading +30 writing=100. Same reading sequence: MCQ7, comprehension10, gap5, vocabulary5, information5, true/false5, summary10, matching5, rearranging8, poems10 (offer8, answer5). Story10, paragraph10, dialogue10. Paragraph length6=120,7/8=150 words.
- Grade6 second: grammar30 (parts-of-speech5, clues5, substitution5, verbs5, transformation5, punctuation5); letter/email8, composition12=50. Composition200 words.
- Grades7/8 second: gap5, substitution5, verbs5, narration5, transformation5, punctuation5; letter/email8, composition12=50. Composition250 words. Grade7 individual-sentence narration; grade8 passage narration and degree comparison.
- Grades9/10 SSC: paper1 70/30 following original user screenshot. Paper2 60/40 following later Class Ten image confirming gap with clues10 (not the earlier inconsistent5), writing paragraph10/letter-email-application10/composition20.
- Grades11/12 HSC first: reading60; writing40 (paragraph10/story7/informal letter-email5/graph-map-chart10/appreciation8). Supplied NCTB image labelled2024–25, not independently verified2027.
- HSC second: grammar12×5=60; formal-letter-email8/report8/paragraph10/composition14. Supplied image labelled2026. Preserve actual source year; label as user-approved2027 practice template, never official2027 certification.

Supplied latest junior reference attachments: FB_IMG_1794337452758.jpg, FB_IMG_1794337455098.jpg, FB_IMG_1794337457256.jpg, available in user message /tmp/arena-coding-uploads. HSC: Screenshot_2026-11-11-00-59-46-79_e2d5b3f32b79de1d45acd1fad96fbb0f.jpg and Screenshot_2026-11-11-01-01-32-46_40deb401b9ffe8e1df2f1cc5ba480b12.jpg; ClassTen1.jpeg. Not copied into Git.

Validation: TypeScript and128 security/regression tests passed. No production build/browser/provider/DB/deployment test for the new foundation this turn. New module not imported by application yet, so live behavior unchanged. No PR opened: feature is NOT complete.

## Remaining before claiming completion
1. Validate user selection (grades/papers/mode/template version/item IDs, writing choices/topics) server-side; Full/selected/writing-only must share server-owned blueprint. Never let model override marks/counts or silently add unselected topics.
2. Seen textbook/poem/story tasks require selected reliable text/unit reference. Do not fabricate an official textbook extract. Original unseen passages must be distinguished from seen source. Prompt instructions alone are insufficient for relationship validation.
3. Bounded authenticated English generation path with timeout/quota/concurrency/dedup/atomic saves and privacy equivalent to existing preparation. Do not bypass Pending/admin approval for shared question bank. Consider structured task storage/editor integration carefully before selecting schema or abusing shared settings.
4. Structured generation schema for passage-group tasks, clue boxes, substitution/matching/info tables, answer key and task-specific subitems; strict server validation against blueprint and exact requested writing task/topic.
5. English-specific setup/selection UI and start-flow integration, full model test label, reference provenance/year, pattern preview, word/topic inputs. Single-column default; template-specific numbering/headings rather than Bengali MCQ/CQ divisions.
6. Persistence and existing editor/save/reopen/append/PDF integration without regressions. Test all grades, modes, marks, topic exclusion, malformed provider output, auth/private visibility, passages/tables, print/page counts and mobile flow.
7. Production build, real mock browser/PDF tests, diff check; then open PR per standing workflow. User merges unless explicitly authorizes merge; after merge rerun mock tests and check Vercel status. Deployment/account/provider integration unverified must remain explicit.

## Selection stage added (next iteration)
- Dedicated authenticated `/question-builder/english` setup page (inherits existing question-builder auth layout) provides full/selected/writing-only modes, live marks preview, reference provenance, topic/word-limit/instruction inputs and separate-answer request.
- Seen/textbook tasks require a supplied exact extract and book/unit reference. This is an input requirement, not verification of textbook authenticity.
- Reusable strict selection resolver enforces known unique IDs, server-owned totals, required/exclusive writing topics and valid task alternatives. It rejects unsupported grades, extra fields and missing seen sources.
- Subject-route helper covers English names in English/Bengali; it is intentionally NOT wired into the existing prepare page until generation/editor integration works, to avoid diverting users into an unfinished workflow. Existing production preparation is unchanged.
- Setup currently validates only: it explicitly states no paper is generated or saved. Provider path, persistence, editor/PDF integration remain outstanding. No PR or deployment for this iteration yet.
- TypeScript and133 regression tests passed; production build and browser tests have not run for this iteration.

## Structured generation foundation (current iteration)
- Added English-only prompt contract and strict output schema for linked passages, subitems, MCQ options, clues, rectangular tables and separate keys/samples.
- Validator rejects unexpected keys/tasks, wrong order/counts, altered seen text, missing/unused passages, invalid MCQ options/keys, malformed tables, missing substitution tables/clue boxes, missing exact writing topic/word limit/special instruction, leaked unrequested answers and incomplete requested keys. Marks and original template numbering come only from server reference data.
- Added bounded provider adapter: validates request before calling provider, 90-second abort, response-size cap, finish_reason completeness check, no automatic paid retries, output validation before returning, generic provider errors and no content/credential logging. Adapter is NOT exposed through any action/API or imported into the client. Authentication, distributed quotas/locks and atomic persistence must precede exposure.
- TypeScript and138 tests passed including mocked provider success, malformed/truncated output and invalid-selection zero-call checks. No live provider calls, browser/PDF test, production build, database write or deployment performed.
- These structural checks cannot establish semantic correctness, uniqueness of solutions or that a paraphrase adds no extra topic; human review and task-specific semantic evaluation still required.
- Still outstanding: authenticated quota-controlled action, task persistence/editor compatibility, generation UI wiring, save/reopen/PDF integration, complete browser/print/regression checks. Current setup remains validation-only, and original prepare routing unchanged. No PR opened for this iteration.

## Functional flow iteration
Authenticated bounded generation, private draft persistence, setup wiring, separate structured English editor/save/reopen and question/answer browser-print export are now implemented. See `docs/english-2027-release-checklist.md` for exact implemented scope, intentional differences from the normal builder, tests, unverified live integrations and user checklist. Earlier progress entries describe their historical stage, not the current completion state. Current checks:142 tests/typecheck/production build/mock Chromium14templates/PDF extraction passed. Existing header presets are reused through HeaderManager. Automatic chart/map illustrations and normal-builder advanced layout controls are not implemented for English. No schema migration or shared question-bank publication.
