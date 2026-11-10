# Stacked reciprocal/algebraic fractions in question papers

User screenshot shows slash reciprocals (1/x², 1/x³, 1/x⁴) in exported CQ text. MathText previously autoformatted only numeric fractions. The paper-specific preparePaperMath path now also converts simple algebraic slash fractions to KaTeX frac markup before the existing shared rich-paper renderer runs. No database question text is rewritten.

Supported examples: 1/x, 1/x^2, 1/x², 1/x³, 1/x⁴, 1/x^{12}, x/y, x/2 and 1/(x+1). Simple Bengali numerals in these fractions normalize within math without changing Bengali question numbering/prose. Slash fractions already inside $...$ become frac in the same delimiter; explicit existing LaTeX frac remains unchanged. Rich formatting markers continue to work.

Conservative limits: not a general algebra parser. Does not guess that x4 means x^4, resolve chained a/b/c, interpret multi-letter denominators or arbitrary nested expressions. URL/path tokens and text/url/href/verb LaTeX content are skipped. Existing numeric-fraction handling stays with MathText. Other application MathText usages outside the paper renderer are unchanged.

Validation:
- TypeScript, 117 tests, Next production build and diff check passed (dummy local environment).
- Unit regressions cover explicit/unicode powers, Bengali numerals, existing delimiters/LaTeX, grouped denominator, idempotency and URL/date/path/identifier exclusions.
- Real RichPaperText + MathText + KaTeX server rendering produces three mfrac structures, MathML mfrac and no katex-error inside rich bold text.
- Chromium fixture uses real RichPaperText, app globals.css, paper CSS and KaTeX fonts/CSS. Eight fractions have numerator above denominator and a fraction bar in actual element coordinates; desktop, mobile-sized and print media checks passed with zero JS errors.
- Exported PDF is one page. PDF text-position extraction confirms numerator 1 above denominator x, with power glyphs positioned as superscripts. PDF canvas rendering dependencies unavailable; extraction warnings do not affect coordinate checks. Browser geometry and PDF extraction are not a native Android device test.
- Harness/artifacts outside Git /home/user/fraction-browser. No full live account/provider/database test, Android native print-service test or Vercel deployment verification for this PR.

Owner preview checklist:
1. Reopen affected paper: 1/x², 1/x³ and 1/x⁴ should show 1 over powered x with a horizontal bar.
2. Verify question body, CQ subquestions and MCQ options containing fractions, including bold/italic text.
3. Export via ordinary Download; compare preview/PDF and check wrapping/page counts after taller fractions.
4. Check existing explicit LaTeX and ordinary Bengali prose/numbering remain intact.

Agent opens PR; owner merges unless explicitly authorizing merge. After merge rerun mock checks and check Vercel status.
