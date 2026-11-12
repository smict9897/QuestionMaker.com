/** No browser/AI dependencies: shared by extraction and real-PDF diagnostics. */
export function usablePDFText(text: string) {
  const letters = (text.match(/[A-Za-z\u0980-\u09ff]/g) || []).length;
  const legacy = (text.match(/[†‡œÿ©ÖÜ¶ÿøš›‹ˆ˜]/g) || []).length;
  return (
    text.length >= 120 &&
    letters >= 80 &&
    legacy < 5 &&
    !text.includes("\uFFFD")
  );
}
export function pdfTextLines(
  items: { str?: string; transform?: number[]; hasEOL?: boolean }[],
) {
  const rows = new Map<number, { x: number; text: string }[]>();
  for (const i of items) {
    if (!i.str?.trim() || !i.transform) continue;
    const y = Math.round(i.transform[5] / 3) * 3;
    const row = rows.get(y) || [];
    row.push({ x: i.transform[4], text: i.str });
    rows.set(y, row);
  }
  return [...rows]
    .sort((a, b) => b[0] - a[0])
    .map(([, r]) =>
      r
        .sort((a, b) => a.x - b.x)
        .map((i) => i.text)
        .join(" "),
    )
    .join("\n");
}
/** Find strong vertical rules separating newspaper/exam columns; not arbitrary equal crops. */
export function columnBoundaries(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const hits: number[] = [];
  const top = Math.floor(height * 0.18),
    bottom = Math.floor(height * 0.95);
  for (let x = Math.floor(width * 0.2); x < width * 0.8; x++) {
    let dark = 0;
    for (let y = top; y < bottom; y += 2) {
      const p = (y * width + x) * 4;
      if (data[p] < 100 && data[p + 1] < 100 && data[p + 2] < 100) dark++;
    }
    if (dark / Math.ceil((bottom - top) / 2) > 0.55) {
      if (!hits.length || x - hits[hits.length - 1] > width * 0.12)
        hits.push(x);
    }
  }
  return hits.length <= 2 ? [0, ...hits, width] : [0, width];
}
/** Known OCR substitutions for circled option bullets, not arithmetic symbols. */
export function redactOCRWord(word: { text: string; confidence: number }) {
  if (word.confidence >= 45) return word.text;
  return /^[®©@ⓐ-ⓩⒶ-Ⓩ①-⑳]$/.test(word.text) ? "[LABEL_UNCLEAR]" : "[UNCLEAR]";
}
