# Continuous MCQ → CQ → SQ pagination

Supersedes the separate-section-sheet limitation in mixed-paper-sections.md and mixed-selection-followup.md.

Mixed papers now collect all nonempty sections (including CQ division groups) before paginating. A shared measured flow uses the remaining sheet height for the next section instead of starting every section on a new sheet. Order and Bengali headings stay unchanged. A section heading stays with its first question whenever they fit a normal sheet.

- Institution header appears once per question set; subsequent sheets continue the questions.
- Each section keeps its existing question numbering and answer-count instructions.
- MCQ keeps its column setting; CQ/SQ default to one column and retain the separate one/two-column control. Columns fill left first, then right, with the next section starting below the taller column.
- Normal overflow continues onto the next sheet with continuous sheet numbering across question sections.
- Single-section papers keep the existing pagination renderer.
- Auto sets each have their own continuous question flow. OMR, answer keys/answers-only and optional answer sheets remain separate sheets by design. Booklet imposition consumes the generated sheets as before.
- Existing font, rich text, images, edit actions, CQ division grouping, watermark/footer and right-column start settings remain wired through the existing renderer. Auto-fit still reduces font as needed, down to 7pt.
- Fixed print rules that re-enabled the nonprint toolbar and added a blank trailing physical page in the browser fixture. Print breaks now apply at measured page viewport boundaries.

Limits: questions are atomic blocks. A single question/image taller than a usable sheet still warns; it may physically split at print time. This change does not promise arbitrary oversized media fits. Two-column sections may leave spare vertical space in the shorter column; the next section starts below the taller column to preserve reading order. Extreme margins/headers can still leave too little usable space. No schema/payment/auth changes.

Validation (local only):
- TypeScript, 107 regression/security tests, production Next build, diff check passed.
- Chromium browser harness uses real picker, builder, settings, Tailwind and paper CSS, mocked question API and header server actions; no production data writes/auth bypass in app source.
- Three small question types render on ONE sheet; actual two-column CQ/SQ control preserves that one-sheet flow. CQ+SQ-only and MCQ-only also passed.
- Forty-eight longer mixed questions flowed over 10 measured sheets, all 48 present exactly once. Mobile render kept the same sheet count; no browser JS errors.
- PDF parsed with pdf-parse: small mixed fixture exactly 1 physical page; long fixture exactly 10 physical pages; no printed studio toolbar. Not an exhaustive visual/font/license certification.
- Two auto sets each produce a mixed sheet; mixed question sheet + OMR + three answer keys produce five sheets; answers-only produces three answer sheets; custom institution header renders exactly three section titles; auto-fit/right-start render; booklet print handler clones the continuous sheet for imposition.
- Browser harness and PDFs are outside Git in /home/user/continuous-browser. Build used dummy local environment. Live authenticated account/production database and Vercel deployment not verified for this PR.

Owner preview checklist:
1. Freshly select a few MCQ, CQ, SQ; ensure all three appear on the same sheet if space permits, in that order.
2. Add enough questions for overflow. Check no loss/duplicates, no orphan section heading, and continuous sheet numbers.
3. Change CQ/SQ 1→2 columns, font, paper orientation and images; compare preview/PDF.
4. Verify CQ/SQ headings, institution header once per set, MCQ-only and CQ+SQ-only.
5. Test saved-paper reopen, append, grouped CQ, auto sets and optional answer keys/OMR if used.
6. Confirm actual PDF page count matches preview and toolbar/blank trailing page are absent.

Workflow: agent creates PR, owner merges unless explicitly authorizing merge. After merge rerun mock browser checks and check Vercel deployment status.
