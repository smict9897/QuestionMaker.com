# Reference editor: implemented controls and remaining parity

This change extends the existing printable-paper studio, not the homepage animation. It is NOT full screenshot parity yet.

## Implemented in this change
- Mobile Settings opens a left-side, full-height scrollable drawer with overlay, Escape/focus handling and scroll lock. Desktop retains its sticky panel. Existing Smart/Dynamic Header and all previous settings remain available.
- Panel print/download, save shortcut (focuses actual save-name field), text usage guide, undo/redo (up to 60 session snapshots, including question exchange and removal).
- Four per-edge margins in pixels; portrait/landscape for A4/Letter/Legal/A5; configurable column gap; CQ/short column count; independent CQ subquestion style; page number toggle. Measurement, pagination, preview scale and @page dimensions use the chosen layout.
- Right-column start reserves the first sheet's preceding columns. This is NOT printer booklet imposition. Optional ruled answer sheet.
- Explicit safe-layout reset button (margins, font size and gap). It is NOT an automatic content-fitting algorithm.
- Whole-paper B/I/U/strike/color toolbar. These controls do not format arbitrary selected word ranges.
- Instructor toggle/text; direct subject code/exam/instructions/time/marks/class/subject/chapter inputs in panel; HTTPS logo, plain-text header banner/footer. Existing watermark input remains.
- User-defined expected MCQ/CQ/SHORT counts and mismatch feedback. The UI explicitly states this is not an official board/exam standard checker.
- In editing mode, per-question remove, original-text reset and Exchange. Exchange returns only an approved same-category/subject/topic/type candidate, excluding already selected IDs. Database errors/no candidate are visible. No raw user-selected replacement SQL or unapproved question exposure. Removal is saved via excludedIds and excluded IDs are omitted when saving papers. Undo/redo restores item/setting snapshots.

## Existing features preserved
Question/stimulus/subquestion/option editing, HTTPS image attachments/sizing, divisions/filter, important/tags, answer attachments, examinee/obtained boxes, all metadata switches, paper sizes/alignment/fonts/font size, MCQ styles/labels/option columns, duplicate checks, auto sets, Smart/Dynamic Header templates, watermark/address, named save/load, first-page-only header and browser PDF/print.

## Still required for the user's complete screenshot request
1. Arbitrary selected-text rich editing (including toolbar list/indent features), rather than whole-document formatting and structured question textareas.
2. The exact official exam/subject/division-wise standard checker shown in the screenshots. Need the actual rules/marks/answer quotas; cannot invent or certify an unknown 100-mark template.
3. Exact SolaimanLipi/Kalpurush font assets/licensing; current four existing self-hosted font choices are kept, not falsely relabelled.
4. Exact automatic Fit-inside algorithm and genuine booklet print imposition, if those are expected rather than safe-reset/right-column-start.
5. Direct delete/insert whole division controls and exact screenshot-level grouped editing layout. Existing division assignment/filter and Add Questions workflow remain.
6. Uploaded logo assets, rich branding editor and the exact screenshot footer help/contact dock. Current logo uses validated HTTPS URL and banners are plain text; no external phone number copied.
7. Video tutorial URL/content. Current Learn panel is real written instructions, not a nonworking video button.

## Verification
- TypeScript and production Next build passed with dummy local env; no production data changes or schema migration.
- 76 regression/security tests passed, covering old-settings defaults, layout roundtrip, orientation/style helpers, replacement validation/type/scope/exclusions, and previous features.
- Real Chromium against the actual builder with a locally signed test-only session and intercepted question response: 390px left drawer, landscape/margin/page-number persistence, configurable checker, undo, Escape, desktop screenshot and PDF generation; no client errors. No test routes or auth bypass added to repository. Production auth/DB/printing hardware not tested. Artifacts outside repo at /home/user/studio-browser.
