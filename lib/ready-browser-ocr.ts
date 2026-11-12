import {
  usablePDFText,
  pdfTextLines,
  columnBoundaries,
  redactOCRWord,
} from "./ready-text-layout";
import {
  loadReadyPdfEngine,
  loadPdfImages,
  imageFrom,
} from "./ready-paper-browser";
/** Dynamically imported only by the paid studio. Original page, never edited output. */
export async function readPurchasedPage(
  url: string,
  page: number,
  signal: AbortSignal,
  onProgress: (text: string) => void,
) {
  if (signal.aborted) throw Error("OCR বাতিল হয়েছে।");
  onProgress(`পৃষ্ঠা ${page}: মূল PDF পড়ছি…`);
  const engine = await loadReadyPdfEngine();
  const doc = await engine.getDocument({
    url,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;
  try {
    if (doc.numPages > 100 || page < 1 || page > doc.numPages)
      throw Error("Page unavailable");
    const p = await doc.getPage(page);
    const text = pdfTextLines((await p.getTextContent()).items);
    p.cleanup();
    if (usablePDFText(text)) {
      onProgress(`পৃষ্ঠা ${page}: সরাসরি PDF লেখা পাওয়া গেছে।`);
      let context = "";
      if (page > 1) {
        const prev = await doc.getPage(page - 1);
        const raw = pdfTextLines((await prev.getTextContent()).items);
        prev.cleanup();
        if (usablePDFText(raw)) context = raw.slice(-12000);
      }
      if (signal.aborted) throw Error("OCR বাতিল হয়েছে।");
      return {
        text: text.slice(0, 60000),
        context,
        confidence: 100,
        uncertain: false,
        scoped: true,
        method: "pdf-text",
      };
    }
  } finally {
    await doc.destroy();
  }
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
      const source = await imageFrom(images[0]);
      const canvas = document.createElement("canvas");
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(source, 0, 0);
      const boundaries = columnBoundaries(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        canvas.width,
        canvas.height,
      );
      const outputs: string[] = [];
      let confidence = 0,
        uncertain = false;
      try {
        for (let c = 0; c < boundaries.length - 1; c++) {
          if (signal.aborted) throw Error("OCR বাতিল হয়েছে।");
          onProgress(
            `পৃষ্ঠা ${page}: কলাম ${c + 1}/${boundaries.length - 1} পড়ছি…`,
          );
          const crop = document.createElement("canvas");
          crop.width = boundaries[c + 1] - boundaries[c];
          crop.height = canvas.height;
          const cc = crop.getContext("2d")!;
          cc.drawImage(
            canvas,
            boundaries[c],
            0,
            crop.width,
            crop.height,
            0,
            0,
            crop.width,
            crop.height,
          );
          let data;
          try {
            ({ data } = await worker.recognize(
              crop,
              {},
              { text: true, blocks: true },
            ));
          } finally {
            crop.width = crop.height = 0;
          }
          const lines =
            data.blocks?.flatMap((b) => b.paragraphs.flatMap((p) => p.lines)) ??
            [];
          const text = lines.length
            ? lines
                .map((l) => l.words.map(redactOCRWord).join(" "))
                .join("\n")
                .trim()
            : data.text.trim();
          outputs.push(text);
          confidence += data.confidence;
          uncertain ||=
            !lines.length ||
            lines.some((l) => l.words.some((w) => w.confidence < 80));
        }
      } finally {
        canvas.width = canvas.height = 0;
      }
      const text = outputs.join("\n\n");
      if (!text.trim() || text.length > 60000)
        throw Error("OCR-এ প্রশ্ন পড়া যায়নি।");
      return {
        text,
        confidence: confidence / (boundaries.length - 1),
        uncertain,
        scoped: true,
        method: "column-ocr",
      };
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
