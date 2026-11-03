const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export function cleanText(s: string): string {
  if (!s) return "";
  return s.replace(/\r\n?/g, "\n").replace(/[\u200B-\u200D\uFEFF]/g, "").normalize("NFC");
}
export function toAsciiDigits(s: string): string {
  if (!s) return "";
  return s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}
export function joinMarks(s: string): string {
  if (!s) return "";
  let text = s;
  text = text.replace(/([\u09BF\u09C7\u09C8])\s*([ক-হড়-য়])/gu, "$2$1");
  text = text.replace(/([অ-হড়-য়০-৯a-zA-Z])\s+([়্া-ৌঁ-ঃ])/gu, "$1$2").replace(/([্])\s+([অ-হড়-য়])/gu, "$1$2");
  text = text.replace(/([অ-হ])\s+্র/gu, "$1্র").replace(/([অ-হ])\s+্য/gu, "$1্য").replace(/থ\s*র\s*্/gu, "র্থ");
  text = text.replace(/\(\s*([কখগঘabcdABCD])\s*[\)\.]/gu, "($1)");
  return text.replace(/[ \t]{2,}/g, " ");
}
