# Reference editor: current completion status

## Follow-up implementation
The previously missing feasible controls are now implemented:
- Selected-text B/I/U/strike in question text, stimulus, subquestions, MCQ options and branding banners; bullet/number list and indent/outdent tools. Editable text stores explicit formatting markers; preview and print render only the four allowed formatting elements via React, never arbitrary HTML. Math still uses the existing math renderer.
- Real measurement-based Auto-fit tries smaller fonts down to 10pt for each question section. If the section still does not fit, normal pagination continues. User font preference is preserved. No clipping or promise that unlimited content fits one page.
- Real booklet imposition: pad to multiples of four, reorder front/back sides and place two scaled logical pages on each landscape print side. Cancel/completion removes the temporary output. Normal preview is unchanged. Physical duplex printing requires printer-specific short-edge settings and a paper test; only browser PDF was tested.
- CQ division creation/move using an existing question, rename and confirmed removal of every question in a division; all participate in settings undo/redo. Existing Add Questions now carries an append flag through selection/search/pagination and preserves previous non-excluded IDs instead of replacing them.
- Local raster logo upload: PNG/JPEG/WebP <=2 MB, decoded/resized to <=256px and embedded in the saved snapshot; no upload service/secret required. Only bounded PNG/JPEG/WebP data URLs are allowed for logos; SVG/script URLs remain blocked, and question-image rules remain HTTPS-only.
- Rich header/footer banner controls and measured footer height in pagination.
- Sticky Help/Contact button uses the configured WhatsApp link, otherwise /contact-us. A video link only appears if the site has a configured YouTube URL; written instructions always remain.

### Still dependent on external inputs
- Exact official board/exam/division human-marking/checker rules are not known. The explicit user-defined count checker remains; no official compliance claim.
- Exact SolaimanLipi/Kalpurush assets with redistribution license must be supplied/verified. Existing licensed fonts remain available.
- No tutorial video was fabricated. Configure the site's YouTube link to show one.
- This is a functional reference-inspired editor, not a claim of pixel-identical source-site UI or a full WYSIWYG rich document editor. Formatting markers are visible in editing fields and rendered in preview/print. Per-selection color/font size is not provided; global controls remain.

### Follow-up verification
TypeScript, 82 regression/security tests and production Next build passed with dummy local environment. New tests cover safe rich rendering/XSS escaping, malformed markup, raster-logo restrictions, settings roundtrip, bounded auto-fit and booklet order/padding. Real Chromium actual-builder checks passed for selected-word bold and preview rendering, Auto-fit reaching 10pt on long content, division creation, logo embedding, booklet print output/PDF, desktop and 390px drawer; no page errors. These checks used a locally signed session and intercepted sample questions, not production DB/account data. Artifacts remain outside Git at /home/user/completion-browser.

---

## Historical baseline from the previous PR


The previous PR extended the printable-paper studio, not the homepage animation. The historical pending list below is superseded by the completion status above.

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

## Font minimum update
Manual font controls and persisted settings now accept 7–28pt. Auto-fit can reduce to 7pt (previously 10pt); if the content still does not fit, normal pagination continues. It retains a larger size when that already fits rather than forcing every paper to 7pt. TypeScript and 83 tests passed, including settings restore for 7/8/9pt and below-minimum rejection.
