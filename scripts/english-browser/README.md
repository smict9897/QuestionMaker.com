# Isolated English UI browser regression

Runs the actual setup/editor components with mocked Next navigation and server actions, synthetic source text/answers. This is NOT live authenticated account, database or provider coverage. Never treat synthetic source text as textbook content.

Install optional test-only `esbuild playwright-core @sparticuz/chromium pdfjs-dist` in an external workspace directory (not package.json). Set NODE_PATH to that directory's node_modules. ENGLISH_BROWSER_OUT controls fixture/PDF output (default `/home/user/english-browser`); keep outputs outside Git.

1. `node scripts/english-browser/build.cjs`
2. Serve output on port 5173, e.g. `python3 -m http.server 5173 --bind 0.0.0.0 --directory "$ENGLISH_BROWSER_OUT"` using a managed process.
3. `node scripts/english-browser/check.cjs`
4. `node scripts/english-browser/pdf-check.cjs`

Minimal Linux hosts may need NSS/NSPR shared libraries; the Chromium package's al2023.tar.br supplies compatible libraries in this sandbox. Extract to an external directory and set LD_LIBRARY_PATH to its lib directory, not to any repository folder.

Checks: setup -> mocked generation route;14 editor templates;390px viewport document overflow; question-only PDF export; separate answer rendering; mocked save; no page errors. PDF extraction verifies nonblank pages, expected writing topic and exclusion of sample answers. Page counts depend on synthetic long passage fixture, NOT expected real exam lengths. Additional live review and native mobile print checks remain necessary.
