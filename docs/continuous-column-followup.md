# Continue sections at the current column cursor

Supersedes the taller-column section-boundary behavior described in continuous-mixed-paper.md.

User screenshots showed the prior pagination created an independent column grid for each section. Even with a shared sheet, the next section could not use the remaining current/right column. This wasted space and could push SQ to the next page.

The paginator now carries one reading cursor across sections of the same column count. MCQ → CQ → SQ follows the current column immediately; only when heading plus first question does not fit does it advance to the next column, then the next sheet. Section headings are measured at the same column width as their content. Positioned blocks use the measured lane/top coordinates in both preview and print. Question numbering and instructions stay per section.

Scope and limits:
- Applies to mixed sections/CQ groups; the existing single-section layout stays unchanged.
- CQ/SQ default one-column and optional two-column settings remain unchanged.
- If column count changes (e.g. two-column MCQ → one-column CQ), the new full-width region must start below the taller preceding column; placing full-width text inside just the unfinished half-column would overlap the other column. Choose the same column count for a single uninterrupted column stream.
- Headings stay with first question. Very large atomic questions/images still warn and may split physically; no promise that arbitrary oversized media fits.
- OMR/answer keys remain separate by design. No schema/auth/payment changes.

Validation:
- TypeScript, 107 tests, production Next build, diff check passed (dummy local build environment).
- Real-component Chromium + Tailwind/paper CSS, mocked API/header actions: both one- and two-column small mixed fixtures render all three sections on one sheet with no extra section gap (measured consecutive top/bottom coordinates).
- 36-question two-column mixed fixture: 5 sheets, every question exactly once; sections share current lanes; no overlapping blocks; mobile/reload pass.
- Actual PDFs parsed: one page for each small fixture, 5 pages for large fixture, all 36 markers present exactly once, no studio toolbar.
- Different column-count transition, auto sets, OMR plus answer keys, answers-only, custom institution header, booklet print cloning passed. Harness setup needed a wait for React initial effects before seeding test localStorage; no app code change for that test harness race.
- Test harness/artifacts outside Git: /home/user/lane-browser. Production login/data and Vercel deployment untested for this PR; no production writes.

Owner preview checklist:
1. Set MCQ and CQ/SQ all to 2 columns. Select enough questions so MCQ ends partway through a column; CQ must start immediately below, and SQ immediately after CQ.
2. Repeat with all types at 1 column; compare PDF with preview.
3. Fill beyond one page; check left → right → next sheet reading order, no missing/duplicate questions, heading attached to first question.
4. Change CQ/SQ column count, fonts/images, save/reopen; mixed column-width transition should not overlap.
5. If used, check CQ groups, auto sets, answer keys/OMR and booklet.

Agent opens PR; owner merges. After authorized merge, rerun mock browser checks and check actual Vercel status.
