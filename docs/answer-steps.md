# Step-by-step answer presentation

User wants answer chains on new lines with equals aligned, and CQ labels in Bengali rather than k/kh/g/gh.

Shared PaperAnswer renderer is used for non-MCQ answer keys and inline question+answer/suggestion formats. MCQ answer-key letter behavior stays unchanged.
- Structured CQ answers (k/kh/g/gh or Bengali equivalents) render in ক/খ/গ/ঘ order. Legacy explanation markers (k), (kh), (g), (gh), k:, kh:, g:, gh: and Bengali equivalents render as separate labeled parts.
- Top-level semicolons/newlines separate statements. A chain such as x²+1/x² = (x+1/x)²−2 = 4²−2 = 14 uses one shared equals column and one step per row. Stored text/math is not recomputed or rewritten.
- Existing paper fraction formatter/rich renderer handles each expression. Parenthesized conditions and <=, >=, != and => are not mistaken for chain equalities.
- Explicit LaTeX environments/text commands and rich-marker lines remain intact instead of splitting their delimiters. Multiple conditions like x=4 এবং y=3 (or English and/or) are not reinterpreted as one equality chain.

Limits: presentation parser, not a general math solver/parser. Unmarked legacy CQ prose cannot reliably be assigned ক/খ/গ/ঘ and remains prose; full arbitrary rich/LaTeX expressions may need existing aligned LaTeX for custom layout. Structured recognized CQ answers take precedence over a duplicate aggregate explanation. More vertical answer space can increase page count. Very tall atomic answer blocks keep the existing oversized warning. No DB migration, stored answer rewrites or auto-correction of mathematical accuracy.

Validation:
- TypeScript, 123 tests, production build and diff check passed (dummy local build environment).
- Unit tests cover legacy/structured CQ labels, equation chains, whole dollar-delimited equations, protected relation signs/conditions, prose boundaries and rich/explicit-LaTeX preservation.
- Chromium actual builder/settings/global+paper+KaTeX CSS fixture with mocked API/header actions: answers-only at 1 and 2 columns; all four Bengali CQ labels; equals x-coordinates aligned across rows with increasing y; fractions preserved; QA mode; mobile reload; no JS errors.
- PDF: 3 expected answer sheets. Actual first CQ chain extracted equals coordinates match horizontally and progress vertically. pdfjs-dist canvas warnings do not affect text-position extraction; not native Android device testing.
- Harness/artifacts outside Git at /home/user/answers-browser. No authenticated production DB/account test or Vercel deployment verification.

Owner preview checklist:
1. Reopen affected answer sheet; each CQ sub-answer should have Bengali ক/খ/গ/ঘ if source has markers/structured answers.
2. Check a multi-equality chain: each next step below with equals aligned. Confirm fractions/powers remain intact.
3. Check SHORT answers, 1/2 columns and question+answer format.
4. Ordinary Download: compare PDF layout and page count, especially taller answers.
5. Ensure standalone conditions/prose and existing explicit LaTeX are unchanged mathematically.

Agent opens PR, owner merges unless explicitly authorizing merge. After merge rerun mock checks and check Vercel status.
