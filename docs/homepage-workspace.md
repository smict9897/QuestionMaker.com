# Homepage workspace redesign

The `/` homepage uses the supplied reference screenshots as a visual model: white sticky identity/account bar, navy sidebar, blue-tinted canvas, navy-titled quick-start panel, question-bank chart, instructional carousel, pricing cards and navy footer. Original site identity, teacher/student links, features, class entry points, quiz, model tests, blog, FAQ, policy/contact links and configured social links remain available.

## New interactions
- Desktop sidebar; mobile toggle/dismissible navigation below 640px. Sidebar links only point to implemented routes or homepage sections.
- Dependent class, subject and optional chapter selects. Category changes reset subject/chapter; subject changes reset chapter. Curriculum data and approved question-bank categories/subjects/topics populate the lists. Category aliases match the existing question picker (Class 6/6, SSC/Class 9, HSC/Class 11-12).
- Native GET submission to `/question-builder/create` preserves category, subject and topic. Required category/subject and disabled Next prevent an empty selection. Existing builder pages are not modified.
- Manual four-step guide with previous/next controls and selectable indicators.
- Authenticated account name, dashboard and NextAuth sign-out; guest login/register routes.
- Configured WhatsApp contact link; no reference-site phone numbers copied.

## Real data, not copied marketing
- Only approved questions contribute to public counts and selectors. Total/category chart aggregates database counts. The schema has no explicit MCQ/CQ/SQ column, so chart breakdown is honestly class/category-based rather than invented type statistics.
- Seven daily counts use current approved questions' `createdAt` values, with UTC boundaries explicitly labelled. These reflect creation dates, not approval dates. Statistics refresh on page navigation/reload, not a real-time subscription.
- Active packages come from the existing `Package` table (title, description, price and duration). Links use the established `/packages` purchase flow. No copied 50% discount, free quota, recharge/wallet claims or fake class packages. Empty or failed loads have honest messages.
- Existing payment logic, DB schema, auth permissions and printable-paper features are unchanged. Standalone OMR scanning/evaluation, wallet/recharge and new subscription product types from the reference are not represented as working features; these require separate backend scope. Existing paper-builder OMR remains unchanged.

## Verification
- TypeScript check and production Next.js build passed with dummy local environment/no production database.
- 57 regression/security tests passed, including category aliases, aggregation/no fabricated data, stats rendering/error handling and existing route/package wiring.
- Local Chromium desktop/mobile checks: selection dependencies, Next enabled after subject selection, guide navigation, mobile sidebar opening/link dismissal, no horizontal overflow or client page errors. Tested fallback data states because local environment has no production DB access. Live package/auth purchase flows were not tested.
- Browser artifacts kept outside the repository under `/home/user/home-browser`.

## Multi-chapter selection
The homepage chapter control now uses individual checkboxes. Select two, three or more chapters; “সকল অধ্যায়” clears the selection and includes all chapters. The selected count and question total update together. Class/subject changes clear stale selections. Native GET submission uses repeated `topic` parameters; the question picker accepts both old single-topic links and repeated topics, queries membership with Prisma `in`, and preserves all topics in search and pagination. The picker also offers the same checkbox control, scoped to the selected class and subject. No DB migration needed.

Verification: 61 regression/security tests, typecheck and production build passed locally. Tests cover checked inputs, old links, Unicode/comma-containing chapter names, repeated pagination parameters and the actual server page's question/count queries using a mocked database. Production DB and mobile browser were not exercised for this follow-up.
