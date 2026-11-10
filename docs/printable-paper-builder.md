# Printable question-paper studio

Route: `/question-builder/build` (existing authenticated question-builder flow).

## What changed
- `components/qb-builder.tsx` coordinates loading, editable header metadata, local question edits, divisions, set order and persistence.
- `components/paper-builder/settings.tsx` provides the desktop sidebar and focus-trapped mobile drawer. Escape/backdrop/close button dismiss it. Every switch affects paper output or editor behavior.
- `components/paper-builder/preview.tsx` measures real rendered question heights after fonts/images load, then fills sequential columns/pages. Question blocks are kept together where possible. Paper sizes: A4, Letter, Legal, A5. Mobile previews scale down without changing print dimensions.
- `lib/paper-builder.ts` owns validated defaults, old-settings migration, deterministic shuffling, duplicate detection and pagination. New default is **question-only** to avoid accidentally printing correct answers.
- Math CSS/assets are bundled locally. Bengali digits within math expressions/fractions are normalized to Latin digits because KaTeX's math fonts do not include Bengali glyphs. Bengali prose/question numbering stays unchanged.

## Using it
1. Select questions in the existing question picker.
2. Configure institution/exam/class/subject/chapter/time/marks/section title/instructions in Page Setup.
3. Open Settings (mobile) or use the sidebar (desktop). Preview updates immediately.
4. Editing Mode exposes question/option/CQ subquestion text and attachments. Changes apply **only to this paper**, not the question bank. Important-question markers and custom CQ divisions are configured per question here.
5. Images use public HTTPS URLs; add them per question in Editing Mode. Choose a global default size or override individual images using +/−/reset. Images are constrained to column width. External-image availability depends on the host.
6. Auto Set prints both ক/খ variants with deterministic question and MCQ-option order. Answer keys use the reordered options. Subjective answers display stored explanations/answers, or an explicit missing-answer message. Sets may retain some items in the same position by chance.
7. Save using the existing named-paper toolbar. Header settings, edits, attachments, marker choices and set order are included. Opening an old paper without settings clears the previous paper's settings rather than leaking them.
8. Download opens the browser print dialog; select Save as PDF, correct paper size, **100% scale, no margins, browser headers/footers off**. This is browser PDF printing, not a server PDF export.

## Fonts
Available fonts are the repository's AdorshoLipi, Hind Siliguri (default), Anek Bangla, and Tinos + Bengali fallback. These are real local fonts; no unavailable SolaimanLipi entry is advertised. Font licensing is unchanged.

## Notes
- Settings are stored in `qb:settings` (version 2), retaining the legacy `show`/`info`/`cfg` shape. Invalid setting values reset safely. The selected question IDs remain in `qb:selected`.
- CQ filtering affects the currently printed CQ divisions, not the selected question bank. Answer quantity is clamped to visible section total; zero in stored settings means “all”.
- Duplicate highlighting is preview-only and omitted from printed papers. Watermark is included in print.
- Questions, OMR sheets and answer keys are paginated using measured blocks. Oversized single blocks are flagged; reduce image/font size if a question cannot fit a sheet. Extremely long blocks may span physical print pages.
- No database schema changes, model-test changes, payment changes, or production-setting changes are involved.

## Verification
`npm run test:security` includes pure-helper regression tests for defaults/migration, persistence roundtrip, set shuffling, pagination, duplicate detection, image protocol validation, Bengali numbering and math digits.

Local Chromium smoke testing uses mocked question API responses (not production data). Checked: desktop and 390px mobile layout, metadata, student/subject-code/duplicate switches, stateful question editing, reload persistence, A4/A5, CQ division filtering, answer-only mode, auto-sets, PDF generation, drawer Escape handling, and no page-level JS errors/horizontal overflow. A temporary test harness is removed before commit; no authentication bypass ships.
