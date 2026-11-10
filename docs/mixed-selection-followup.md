# Mixed selection and CQ/SQ columns follow-up

User reports selections remain checked, but only the first selected type seems to reach setup. Exact live-account reproduction is not confirmed. Do not claim a definitive production root cause.

Confirmed issues repaired:
- The questions API silently truncated IDs after 200 while append allowed 300. It now accepts up to 300 unique IDs and explicitly rejects larger requests. DB errors no longer become misleading empty successful responses.
- Fresh selection inherited old builder excludedIds and edits; fresh papers now clear those fields, while append preserves existing behavior and saved papers retain their settings.
- CQ/SQ rendering already used cqColumns (default 1), but the settings panel offered no control. Added an explicit CQ / SQ one/two column control. Existing saved settings remain respected.
- Missing/unavailable IDs now show a warning in setup, not a silent partial paper.
- Setup displays actual visible counts per type and jump buttons to each section. All types remain separate print sections, in MCQ → CQ → SQ order. This does not pack distinct types into a single continuous sheet.

Validation:
- TypeScript, 99 tests, production build, diff check passed. Build used dummy local environment, not production DB.
- Chromium with real picker/builder components in an isolated Vite harness, mocked question API/server header actions: mixed selection count, deselect one tab preserves other types, MCQ-only, CQ+SQ, reversed selection order, reload, mobile render, print media, PDF generation passed.
- Additional browser checks: seeded stale CQ/SQ exclusions are cleared by a fresh selection; both types default to one column; clicking the actual two-column control switches both rendered grids; reload retains that setting; CQ section jump scrolls correctly; PDF generated.
- API regression uses the real route handler with a mocked DB/auth and 240 selected rows, with CQ and SQ at the end; all rows retained, type decoding verified; 301 rejected.
- Harness/artifacts remain outside the repository in /home/user/mock-check. No production data writes, live authenticated account testing, visual PDF/font fidelity certification or deployment verification.

Owner preview checklist:
1. Freshly select all three types, open setup, verify type counts and use each jump button.
2. Repeat CQ+SQ only and MCQ only.
3. CQ/SQ initially one column; select two columns and inspect preview/PDF, then reload.
4. If a missing question warning appears, capture it and the selection counts; private/rejected/deleted questions may legitimately be unavailable.
5. Confirm append preserves the existing paper and saved-paper reopen retains columns.

Agent opens PR; owner merges. After merge, rerun mock checks and check Vercel deployment status per standing user instruction.
