import { loadPdfImages } from "./ready-paper-browser";
/** Dynamically imported only by the paid studio. Original page, never edited output. */
export async function readPurchasedPage(
  url: string,
  page: number,
  signal: AbortSignal,
  onProgress: (text: string) => void,
) {
  if (signal.aborted) throw Error("OCR বাতিল হয়েছে।");
  onProgress(`পৃষ্ঠা ${page}: মূল PDF পড়ছি…`);
  const images = await loadPdfImages(url, () => {}, [page]);
  if (signal.aborted) throw Error("OCR বাতিল হয়েছে।");
  const { createWorker } = await import("tesseract.js");
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let aborted = false;
  const cancel = () => {
    aborted = true;
    void worker?.terminate();
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    const task = (async () => {
      worker = await createWorker("ben+eng", 1, {
        workerPath: "/vendor/ocr/worker.min.js",
        corePath: "/vendor/ocr",
        langPath: "/vendor/ocr",
        workerBlobURL: false,
        logger: (m) => {
          if (!signal.aborted)
            onProgress(
              `পৃষ্ঠা ${page}: OCR ${m.status} ${Math.round((m.progress || 0) * 100)}%`,
            );
        },
      });
      if (aborted || signal.aborted) {
        await worker.terminate();
        throw Error("OCR বাতিল হয়েছে।");
      }
      const { data } = await worker.recognize(
        images[0],
        {},
        { text: true, blocks: true },
      );
      if (aborted || signal.aborted) throw Error("OCR বাতিল হয়েছে।");
      const words =
        data.blocks?.flatMap((b) =>
          b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)),
        ) ?? [];
      const uncertain = !words.length || words.some((w) => w.confidence < 80);
      // Scope uncertainty to its original line instead of poisoning the entire page.
      const lines =
        data.blocks?.flatMap((b) => b.paragraphs.flatMap((p) => p.lines)) ?? [];
      const text = lines.length
        ? lines
            .map((l) =>
              l.words
                .map((w) => (w.confidence < 45 ? "[UNCLEAR]" : w.text))
                .join(" "),
            )
            .join("\n")
            .trim()
        : data.text.trim();
      if (!text || text.length > 60000) throw Error("OCR-এ প্রশ্ন পড়া যায়নি।");
      return { text, confidence: data.confidence, uncertain, scoped: true };
    })();
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          cancel();
          reject(Error("OCR সময় শেষ। Retry করুন বা অন্য ডিভাইস ব্যবহার করুন।"));
        }, 240000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
    await worker?.terminate();
  }
}
