# My created papers

`/question-builder/saved` now uses the reference screenshot's navy banner, New Paper button, class/subject dropdowns, name/chapter search, Reset and results count above a horizontally scrollable table.

Columns: sequence, name, class, subject, chapters, question count with detected MCQ/CQ/SHORT counts, configured marks and time, creation/latest-change dates, Open/Edit/Delete.

- Snapshot settings supply class/subject/chapter/marks/time; missing taxonomy falls back to a single batch question-bank lookup. Deleted questions stay in saved IDs/count, but cannot contribute to detected question-type totals.
- Open/Edit load the saved IDs/settings into the existing builder. Storage errors prevent navigation and show a message. Editing and saving still creates a new copy, not an in-place update. The UI explicitly explains this.
- Existing records have no separate modification time; latest change falls back to creation time. Dates use Asia/Dhaka. Missing fields display a dash, not invented values.
- Filters combine class, subject and case-insensitive name/chapter search. Class change resets subject. Reset clears all filters.
- Deletion requires confirmation and shows failed server responses; only success refreshes the list. List/database failures show an explicit retry message.

## Ownership correction
Previously every staff member could list/delete all `qbpaper:` records. New saves use `qbpaper:<userId>:<id>` keys and persist `ownerId`. List and delete enforce ownership for both teachers and admins. Ownerless historical records cannot safely be attributed, so only admins may see/delete them; nothing is deleted or reassigned automatically. This may hide legacy records from teachers until an admin can establish ownership. No schema migration or production data mutation performed.

## Verification
67 security/regression tests passed; TypeScript and production Next.js build passed with dummy local environment. New tests cover combined filters, snapshot fallback, scoped saves, list/delete authorization and legacy admin access. No authenticated production DB or browser end-to-end testing in this change.
