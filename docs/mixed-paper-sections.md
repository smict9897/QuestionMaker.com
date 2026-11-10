# Mixed MCQ / CQ / SQ setup

The picker keeps selections across its three tabs and sends the combined IDs to the same existing setup builder. Both picker tabs and preview/print sections now follow MCQ → CQ → SQ (internally SQ is SHORT).

- MCQ retains its existing customizable title and behavior, including MCQ-only papers.
- CQ: ক-বিভাগ: সৃজনশীল অংশ
- SQ: খ-বিভাগ: সংক্ষিপ্ত প্রশ্ন
- CQ subgroup titles append the group name without losing the ক-বিভাগ heading.
- Select All toggles only visible questions; selections from other types are not cleared. Its checked indicator now reflects visible selections instead of comparing global counts.
- Existing pagination still renders each type/group as its own measured section/sheets, rather than merging different types into a continuous single sheet. Existing answer keys, auto-sets and settings remain unchanged.

Validation: TypeScript, 97 regression/security tests and production build passed locally (build before the final picker tab-order/checkbox-indicator-only adjustment; types/tests rerun afterwards). No authenticated browser/production DB test or Vercel deployment verification in this change.

Preview checklist before merge:
1. Select MCQ, switch to CQ and select, then SQ and select. Ensure the selected total accumulates.
2. Use Select All twice in one tab; other tabs' selections must remain.
3. Open setup: order must be MCQ, then ক-বিভাগ CQ, then খ-বিভাগ SQ; check Print/PDF too.
4. CQ+SQ only: CQ must precede SQ with the requested labels.
5. MCQ only: original title/layout and settings should remain unchanged.
6. Save/reopen and check auto sets if used.

Agent creates PR; owner merges. No deployment created by this change.
