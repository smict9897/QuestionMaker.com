import {
  cleanPixels,
  reduceBlueWatermark,
  type PageEdit,
} from "./ready-papers";
let pdfLoader: Promise<any> | undefined;
export async function loadPdfImages(
  url: string,
  onProgress: (n: number, total: number) => void,
) {
  if (!pdfLoader)
    pdfLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/vendor/pdfjs/pdf.min.js";
      script.onload = () => resolve((window as any).pdfjsLib);
      script.onerror = () => {
        pdfLoader = undefined;
        reject(Error("PDF engine লোড হয়নি।"));
      };
      document.head.appendChild(script);
    });
  const pdfjs = await pdfLoader;
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
  const task = pdfjs.getDocument({
    url,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const doc = await task.promise;
  const images: string[] = [];
  try {
    if (doc.numPages > 20)
      throw Error("এক PDF-এ সর্বোচ্চ ২০ page। ছোট ভাগে upload করুন।");
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i),
        v = page.getViewport({ scale: 1 }),
        scale = Math.min(4, 2400 / Math.max(v.width, v.height)),
        vp = page.getViewport({ scale });
      if (vp.width < 1 || vp.height < 1) throw Error("অবৈধ page");
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(vp.width);
      canvas.height = Math.ceil(vp.height);
      await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport: vp,
        background: "white",
      }).promise;
      images.push(canvas.toDataURL("image/jpeg", 0.94));
      canvas.width = canvas.height = 0;
      page.cleanup();
      onProgress(i, doc.numPages);
    }
    return images;
  } finally {
    await doc.destroy();
  }
}
export function imageFrom(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(Error("Page image লোড হয়নি"));
    image.src = url;
  });
}
export async function renderEdited(
  url: string,
  edit: PageEdit,
  includeMarks = true,
) {
  const image = await imageFrom(url),
    canvas = document.createElement("canvas");
  const rotate = edit.rotation === 90 || edit.rotation === 270;
  canvas.width = rotate ? image.height : image.width;
  canvas.height = rotate ? image.width : image.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(((edit.rotation + edit.deskew) * Math.PI) / 180);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (edit.blueWatermark > 0) {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    reduceBlueWatermark(pixels.data, edit.blueWatermark);
    ctx.putImageData(pixels, 0, 0);
  }
  if (edit.mode !== "original") {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    cleanPixels(
      pixels.data,
      canvas.width,
      canvas.height,
      edit.strength,
      edit.mode === "bw",
    );
    ctx.putImageData(pixels, 0, 0);
  }
  if (includeMarks) {
    for (const m of edit.masks) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(
        m.x * canvas.width,
        m.y * canvas.height,
        m.w * canvas.width,
        m.h * canvas.height,
      );
    }
    for (const t of edit.texts) {
      ctx.fillStyle = "#111";
      ctx.font = `${(t.size * canvas.width) / 800}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(
        t.text,
        t.x * canvas.width,
        t.y * canvas.height,
        (1 - t.x) * canvas.width,
      );
    }
  }
  const output = document.createElement("canvas");
  output.width = Math.max(
    1,
    Math.round(canvas.width * (1 - edit.left - edit.right)),
  );
  output.height = Math.max(
    1,
    Math.round(canvas.height * (1 - edit.top - edit.bottom)),
  );
  output
    .getContext("2d")!
    .drawImage(
      canvas,
      edit.left * canvas.width,
      edit.top * canvas.height,
      output.width,
      output.height,
      0,
      0,
      output.width,
      output.height,
    );
  canvas.width = canvas.height = 0;
  return output;
}
/** Conservative suggestion: trim only almost-white outside margins, never guess publication text. */
export async function suggestMargins(url: string) {
  const image = await imageFrom(url),
    canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = Math.round((300 * image.height) / image.width);
  const c = canvas.getContext("2d")!;
  c.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = c.getImageData(0, 0, canvas.width, canvas.height);
  const row = (y: number) => {
    let dark = 0;
    for (let x = 0; x < canvas.width; x++)
      if (data[(y * canvas.width + x) * 4] < 220) dark++;
    return dark > 2;
  };
  let top = 0,
    bottom = 0;
  while (top < canvas.height * 0.08 && !row(top)) top++;
  while (bottom < canvas.height * 0.08 && !row(canvas.height - 1 - bottom))
    bottom++;
  return {
    top: Math.max(0, (top - 4) / canvas.height),
    bottom: Math.max(0, (bottom - 4) / canvas.height),
  };
}
export async function saveLocal(key: string, value: unknown) {
  const db = await openLocal();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite");
      tx.objectStore("drafts").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function loadLocal(key: string) {
  const db = await openLocal();
  try {
    return await new Promise<any>((resolve, reject) => {
      const r = db.transaction("drafts").objectStore("drafts").get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
function openLocal(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("qm-ready-studio", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("drafts");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
