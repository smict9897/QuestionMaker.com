/** Conservative slash-fraction formatting for paper text, without modifying stored questions. */
export function formatPaperFractions(text: string): string {
  const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const power = (value: string) =>
    value
      .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
      .replace(
        /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,
        (digits) =>
          `^{${Array.from(digits, (d) => superscripts.indexOf(d)).join("")}}`,
      );
  const atom = String.raw`(?:[0-9০-৯]+|[A-Za-z])(?:\^(?:\{[0-9০-৯]+\}|[0-9০-৯]+)|[⁰¹²³⁴⁵⁶⁷⁸⁹]+)?`;
  const denominator = String.raw`(?:${atom}|\([A-Za-z0-9+*^{} .−-]{1,80}\))`;
  const fractions = new RegExp(
    String.raw`(?<![\p{L}\p{N}_\\/:.])(${atom})\s*\/\s*(${denominator})(?![\p{L}\p{N}_/^⁰¹²³⁴⁵⁶⁷⁸⁹])`,
    "gu",
  );
  const convert = (part: string, math: boolean) =>
    part.replace(fractions, (match, num: string, den: string) => {
      // Numeric fractions outside math retain the existing MathText normalization.
      if (!math && !/[A-Za-z]/.test(num + den)) return match;
      const bottom = den.startsWith("(") ? den.slice(1, -1) : den;
      const formula = `\\frac{${power(num)}}{${power(bottom)}}`;
      return math ? formula : `$${formula}$`;
    });
  // Keep existing math delimiters and explicit LaTeX intact. Do not reinterpret URL/path tokens.
  return text
    .split(/(\$[^$]+\$)/g)
    .map((part) => {
      if (part.startsWith("$") && part.endsWith("$")) {
        const formula = part.slice(1, -1);
        return /\\(?:text|url|href|verb)\b/.test(formula)
          ? part
          : `$${convert(formula, true)}$`;
      }
      return part
        .split(/(\S*(?:https?:\/\/|www\.)\S*)/g)
        .map((token) =>
          /https?:\/\/|www\./.test(token) ? token : convert(token, false),
        )
        .join("");
    })
    .join("");
}
