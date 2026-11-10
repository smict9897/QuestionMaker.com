# Full-size normal PDF vs explicit booklet output

User reports tiny right-half content and blank extra sheets after blank-booklet fix. That geometry matches imposed booklet output, but actual device settings were not read.

Two fixes:
1. Both ordinary Download controls now explicitly use normal print regardless of persisted cfg.booklet. Enabling booklet preference reveals a separately named booklet button with confirmation explaining two small pages per side, padding and landscape printing. Booklet remains supported; cancelled/stale booklet sessions are cleaned before subsequent print requests and on unmount.
2. Reproduced an additional real global-CSS/print-media failure: ResizeObserver recalculated pagination after print CSS hid the measurement tree. Zero heights collapsed a four-sheet long fixture to a one-page PDF. Measurement now skips print media and non-rendered measurement roots; it retains settled preview pagination during native print. The visible tree is measured normally after returning to screen.

Validation: TypeScript, 112 regression/security tests, Next production build, diff check passed (dummy local environment). Real global CSS/paper CSS + builder Chromium mock at 390px width:
- Saved booklet=true + ordinary Download creates no booklet clones/body class; printed sheet width >790 CSS pixels (A4), not half-size.
- Small PDF has 1 A4 page; long 36-question PDF has 4 A4 pages matching preview, each question marker once and text matrix >=11pt (12pt configured), not reduced booklet text.
- Before measurement guard, long PDF collapsed from 4 preview sheets to 1 physical page; fixed output 4→4.
- Explicit booklet button cancel does not print. Accept produces imposed output. Normal print invoked before booklet afterprint cleans stale output/classes without relying on Android afterprint delivery.
- No browser JS errors. Harness uses mocked API/header actions, no production writes. Outside Git: /home/user/normal-print-browser.

Limits: not an actual Android vendor print-service test, live account test, or deployment verification. Booklet deliberately remains reduced with padding and requires correct landscape/printer settings. This change does not claim arbitrary printer driver compatibility. No database/payment/auth changes.

Owner device checklist after deployment:
1. Refresh. Ordinary Download should show full-size content even if old booklet preference is ON.
2. Compare native preview/PDF page count with on-page preview for a multi-page paper. Check all questions/no extra blank sheets.
3. Cancel and retry; switch between normal and explicit booklet output.
4. Only use booklet button when two logical pages per landscape side are intended; heed confirmation.
5. If still small, record browser/Android print-service versions and which button was used.

Agent opens PR, owner merges unless explicitly authorizing merge. After merge rerun mock checks and check actual Vercel status.
