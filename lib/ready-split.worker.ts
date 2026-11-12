import { splitReadyPdf } from "./ready-split";
let resume: (() => void) | undefined;
self.onmessage = async (e: MessageEvent) => {
  if (e.data.type === "next") {
    resume?.();
    return;
  }
  if (e.data.type !== "start") return;
  try {
    const total = await splitReadyPdf(
      new Uint8Array(e.data.buffer),
      (p) =>
        new Promise<void>((resolve) => {
          resume = resolve;
          const buffer = p.bytes.slice().buffer;
          self.postMessage(
            { type: "part", buffer, start: p.start, end: p.end },
            { transfer: [buffer] },
          );
        }),
      (done, total) => self.postMessage({ type: "progress", done, total }),
    );
    self.postMessage({ type: "done", total });
  } catch (e) {
    self.postMessage({
      type: "error",
      error: e instanceof Error ? e.message : "PDF ভাগ হয়নি।",
    });
  }
};
