# Blank native print/PDF follow-up

User confirms CQ issue solved, reports blank Android native print preview. Inspection found a reproducible global CSS conflict: booklet clones live outside #paper, while app/globals.css hid every node outside #paper and set body descendants visibility:hidden. Booklet local rules restored the output container's display but neither its children nor visibility. Previous isolated component harnesses omitted global CSS, so missed this path.

Fix: limit ordinary #paper display isolation to body:not(.booklet-print), and explicitly restore visibility for booklet output and descendants. Existing local booklet rules still hide the original app and show imposed sheets. Normal paper/cover rules remain unchanged. No schema/auth/payment/pagination changes.

Validation: TypeScript, 110 tests, production build, diff check passed (dummy build environment). Full app globals.css + paper.css + real builder Chromium fixture with mocked API/header actions reproduces hidden booklet children with the old global rules; old PDF has no question markers. Fixed normal, booklet and mobile-viewport PDFs contain all MCQ/CQ/SQ markers and omit site navigation. Normal/mobile are 1 page, booklet 2 imposed sides (four-page padded booklet), afterprint cleanup passed. Parsed with pdfjs-dist text extraction; canvas rendering dependency warnings do not affect extraction. pdf-parse's older parser rejected the minimal blank PDF, so modern pdfjs-dist was used.

Harness outside Git /home/user/print-browser. Not an actual Android print service/device test or authenticated production test; screenshot alone cannot establish booklet enabled. If normal printing with booklet off still fails on device, this requires further investigation rather than declaring all native PDF issues solved. No deployment verification for this PR.

Preview/device checklist:
1. After deployment, refresh and open paper. Try normal print with booklet OFF; questions should show in preview and saved PDF.
2. Repeat booklet ON; imposed sheets should contain questions, not blank pages.
3. Cancel/return and print again to confirm cleanup/retry.
4. If still blank, report booklet setting, browser and Android version, and whether on-page preview contains text. Do not send login secrets.

Owner merges. Agent reruns mock tests and checks Vercel status after authorized merge.
