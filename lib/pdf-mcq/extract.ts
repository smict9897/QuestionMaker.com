import type { PageItems, TextItem } from "./types";

// PDF থেকে প্রতিটি পৃষ্ঠার শব্দ ও অবস্থান (X, Y) বের করা
export async function extractPages(buffer: ArrayBuffer): Promise<PageItems[]> {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.js");

  // সার্ভারে আলাদা worker ফাইলের দরকার নেই, তাই workerSrc ফাঁকা রাখা
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = "";
  }

  const doc = await pdfjs
    .getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
      useWorkerFetch: false,
      disableWorker: true,
    })
    .promise;

  const pages: PageItems[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const items: TextItem[] = content.items
      .filter((it: any) => typeof it.str === "string" && it.str.trim() !== "")
      .map((it: any) => ({
        str: it.str as string,
        x: it.transform[4] as number,
        y: (vp.height - it.transform[5]) as number,
        width: (it.width ?? 0) as number,
        height: (it.height ?? 0) as number,
      }));

    pages.push({ pageNumber: p, width: vp.width, height: vp.height, items });
  }

  return pages;
}
