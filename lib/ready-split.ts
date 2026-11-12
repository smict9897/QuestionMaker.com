import { PDFDocument } from "pdf-lib";
export const SOURCE_MAX_BYTES = 50_000_000,
  SOURCE_MAX_PAGES = 500,
  PART_MAX_BYTES = 10_000_000,
  PART_MAX_PAGES = 100;
export type PdfPart = { bytes: Uint8Array; start: number; end: number };
/** Copy original PDF pages, never rasterize/recompress text. Sequential splitting bounds transient output memory. */
export async function splitReadyPdf(
  bytes: Uint8Array,
  onPart: (p: PdfPart) => Promise<void>,
  onProgress: (done: number, total: number) => void = () => {},
) {
  if (bytes.byteLength > SOURCE_MAX_BYTES)
    throw Error("মূল PDF সর্বোচ্চ ৫০ MB। কমপ্রেস বা ছোট ভাগ করে দিন।");
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch {
    throw Error("PDF খোলা যায়নি। Password সরিয়ে বা সঠিক PDF দিয়ে চেষ্টা করুন।");
  }
  const count = doc.getPageCount();
  if (count < 1 || count > SOURCE_MAX_PAGES)
    throw Error("মূল PDF সর্বোচ্চ ৫০০ পৃষ্ঠা। আগে ছোট ভাগ করুন।");
  async function emit(start: number, end: number): Promise<void> {
    const part = await PDFDocument.create();
    part.setCreationDate(new Date(0));
    part.setModificationDate(new Date(0));
    const pages = await part.copyPages(
      doc,
      Array.from({ length: end - start }, (_, i) => start + i),
    );
    for (const page of pages) part.addPage(page);
    const output = await part.save({ useObjectStreams: true });
    if (output.byteLength > PART_MAX_BYTES) {
      if (end - start === 1)
        throw Error(`পৃষ্ঠা ${start + 1} একাই ১০ MB-এর বেশি। PDF কমপ্রেস করুন।`);
      const mid = start + Math.floor((end - start) / 2);
      await emit(start, mid);
      await emit(mid, end);
      return;
    }
    await onPart({ bytes: output, start: start + 1, end });
    onProgress(end, count);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  for (let start = 0; start < count; start += PART_MAX_PAGES)
    await emit(start, Math.min(start + PART_MAX_PAGES, count));
  return count;
}
