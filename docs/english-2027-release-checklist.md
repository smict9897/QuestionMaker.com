# English printable paper flow — release record

## Implemented
- English selection from normal preparation routes (classes6–12) opens a separate printable flow. Existing append mode stays on its old route. Explicit Class10/12 now retain their grades; grouped SSC/HSC starts9/11 and allows changing grade.
- Full / selected parts / writing-only selection, template marks preview, exact requested writing topic/alternative/word limit/instruction and supplied seen source requirements.
- Authenticated TEACHER/ADMIN generation action; other roles denied. Per-account persistent lock (stale after3min), ownership-token cleanup, daily10-attempt quota using unique DB keys. Failed provider/output attempts also consume quota. No automatic paid retry.
- Provider timeout90s, page maxDuration120s, bounded response,8192 token request ceiling and strict completeness/output validation. Long full papers can fail safely rather than save truncated output.
- Personal versioned drafts stored under owner-scoped Setting keys; one atomic insert after validation, exact owner checks on list/load/update. No Question rows created, no shared question-bank publishing or migration. Admin does not bypass another owner's draft boundary.
- Saved list `/question-builder/english/saved`; reopen `/question-builder/english/edit?key=...`; save edits, header fields, serif/sans fonts and10–22pt size. Unsaved browser-close warning.
- Dedicated English editor reuses existing HeaderManager (saved presets), HeaderPreview, RichTextField and RichPaperText; does NOT modify Bengali builder settings/localStorage. Templates' original numbering, Parts A/B, passage links, clue boxes, tables and MCQ/subitem rendering. Reading source shown once per group.
- Default single-column A4 browser print/Save as PDF. Separate answer-sheet toggle excludes answers from question mode. Browser-native table row/header handling; no forced whole-passage atomic blocks.
- Additional validators require nonempty MCQ and structured information/matching/substitution/chart-data tables.

## Intentional differences / remaining limits
- English uses a separate editor and personal saved list rather than storing structured tasks as fake Bengali CQ/SHORT questions. Existing shared components are reused, but English does NOT currently expose normal-builder append/exchange/undo, two-column/booklet/OMR or page-number settings. Those existing Bengali-builder features remain untouched. Fixed14mm print margins.
- Chart questions currently use structured data tables; automatic graph/map illustrations are not implemented. Passage text is not editable in the UI (preserves supplied source). Task JSON is available for advanced table/clue edits, validated before save/print.
- Reference templates are user-approved2027 PRACTICE patterns, not independently certified official2027 circulars; HSC references explicitly2024–25/2026.
- Users provide exact seen text and reference; authenticity is not automatically verified. Original unseen and semantic/answer correctness still require human review. Exact-topic substring checks do not prove absence of every semantic extra topic.
- Daily quota uses UTC date; expired quota rows currently follow existing Setting-based retention style (no scheduled cleanup). List shows at most100 drafts ordered by key, not guaranteed newest-first chronological order.
- No deletion, per-task regeneration or automatic shared-bank approval workflow introduced. Private papers are never published.

## Executed checks
- TypeScript passed.
-142 security/regression tests passed, including auth denial, owner isolation, save/reopen,10-attempt quota, concurrent-request exclusion, template marks/counts, source preservation, malformed/truncated provider output and route-grade preservation.
- Next production build passed with dummy DB/auth build values; no real production DB connection tested.
- Actual Chromium/Playwright with production components, real globals/Tailwind CSS and mocked navigation/actions: setup->generation route, all14 class/paper editor fixtures,390px no document overflow, separate answer mode, mocked save, no page errors: PASS.
-14 PDF exports parsed by pdfjs: no blank pages, requested topic retained, separate sample answers absent from question papers: PASS. Synthetic long passages produce2–11 pages; these are test-fixture lengths, not exam pagination promises.
- Browser tooling isolated outside repo; reproducible scripts committed under scripts/english-browser. No binaries/generated PDFs/packages added to project dependencies.
- git diff --check passed; tracked .next build output restored.

## Not executed / do not claim
- Live DeepSeek request (sandbox outbound allowlist excludes provider), authenticated production account, real database persistence, real quota race across deployed instances, real textbook-content/answer audit or Android/native print-service E2E.
- Browser fixture mocks server calls; action tests mock DB/provider. Neither is live-account proof.

## User acceptance checklist after deployment READY
1. Login as teacher/admin; choose English from Class6/7/8, SSC, HSC. Confirm printable mode, class and paper. Confirm Bangla and Live Online Model Test still open their original flows.
2. Writing Only: select exactly one task, enter your own topic and optional limit/instruction. Generate; confirm no extra task/topic, correct marks, and no extra full-paper passages.
3. Selected grammar: verify clues/table/blanks, subitem counts, keys and total; leave answers off once and on once.
4. Full first paper: provide reliable seen text/reference, including poems/stories as requested; verify exact source, linked questions, numbering, choice counts and section totals.
5. Test one complete paper for each class/paper used at your institution; independently compare supplied reference pattern. Review all grammar/key semantic correctness.
6. Edit instruction/subitem/answer/header/font; save; reload saved list and reopen. Ensure changes persist. A different teacher account must not load your copied draft URL.
7. Print question-only PDF, then answer-only PDF; confirm no answer leak, readable tables/options, all pages present and no blank trailing page on desktop and your actual phone print service.
8. Full-paper provider truncation/error should show a safe error and NOT create a partial draft. Ten daily attempts (including failures) are the configured cap. Do not consume all ten just for a smoke test.
9. Existing saved Bengali papers, normal PDF, explicit booklet and math formatting remain as before. English intentionally lacks booklet/two-column options for now. Header presets use the existing shared header manager.

Deployment/PR outcome is reported in chat after merge; never infer READY merely from build/test success.
