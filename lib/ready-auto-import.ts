import { upload } from "@vercel/blob/client";
import {
  beginReadyPart,
  finishReadyPart,
  resumeReadyPart,
} from "@/app/actions/ready-import";
import { readyMetadataSchema } from "./ready-papers";
export function createReadyImport(fd: FormData) {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size < 5) throw Error("সঠিক PDF দিন।");
  if (file.size > 50_000_000)
    throw Error("মূল PDF সর্বোচ্চ ৫০ MB। PDF কমপ্রেস বা ভাগ করুন।");
  if (fd.get("rights") !== "on") throw Error("ব্যবহারের অনুমতি নিশ্চিত করুন।");
  const meta = readyMetadataSchema.parse({
    ...Object.fromEntries(fd),
    published: fd.get("published") === "on",
  });
  const groupId = crypto.randomUUID(),
    completed = new Set<string>(),
    pending = new Map<string, { id: string; path: string; url?: string }>();
  let running = false;
  let activeAbort: AbortController | undefined;
  return {
    cancel() {
      activeAbort?.abort();
    },
    async run(progress: (text: string) => void) {
      if (running) throw Error("Import চলছে।");
      running = true;
      const controller = new AbortController();
      activeAbort = controller;
      let worker: Worker | undefined;
      try {
        const buffer = await file.arrayBuffer();
        if (controller.signal.aborted)
          throw Error("Import থামানো হয়েছে। সফল পার্টগুলো রাখা হয়েছে।");
        if (new TextDecoder().decode(new Uint8Array(buffer, 0, 5)) !== "%PDF-")
          throw Error("সঠিক PDF নয়।");
        worker = new Worker(
          new URL("./ready-split.worker.ts", import.meta.url),
        );
        const w = worker;
        progress("PDF পরীক্ষা ও স্বয়ংক্রিয়ভাবে ভাগ হচ্ছে…");
        await new Promise<void>((resolve, reject) => {
          controller.signal.addEventListener(
            "abort",
            () => reject(Error("Import থামানো হয়েছে। সফল পার্টগুলো রাখা হয়েছে।")),
            { once: true },
          );
          let index = 0;
          w.onerror = () =>
            reject(Error("PDF ভাগ করা যায়নি। বড় হলে কমপ্রেস করে চেষ্টা করুন।"));
          w.onmessage = async (event) => {
            const m = event.data;
            try {
              if (m.type === "error") throw Error(m.error);
              if (m.type === "done") {
                resolve();
                return;
              }
              if (m.type === "progress") {
                progress(
                  `${m.total}টির মধ্যে ${m.done} পৃষ্ঠা সংরক্ষিত · ${completed.size} পার্ট`,
                );
                return;
              }
              if (m.type !== "part") return;
              index++;
              const key = `${m.start}:${m.end}`;
              if (!completed.has(key)) {
                let part = pending.get(key);
                if (!part) {
                  part = await beginReadyPart({
                    meta,
                    groupId,
                    partIndex: index,
                    start: m.start,
                    end: m.end,
                    rights: true,
                    submission: fd.get("submission") === "user",
                  });
                  pending.set(key, part);
                }
                progress(
                  `Part ${index} · পৃষ্ঠা ${m.start}–${m.end} upload হচ্ছে…`,
                );
                if (!part.url) {
                  const recovered = await resumeReadyPart(part.id);
                  part.url = recovered.url ?? undefined;
                }
                if (!part.url) {
                  if (controller.signal.aborted)
                    throw Error("Import থামানো হয়েছে।");
                  const blob = await upload(
                    part.path,
                    new Blob([m.buffer], { type: "application/pdf" }),
                    {
                      access: "public",
                      abortSignal: controller.signal,
                      handleUploadUrl: "/api/ready-upload",
                      multipart: true,
                      onUploadProgress: (p) =>
                        progress(
                          `Part ${index} · Upload ${Math.floor(p.percentage)}%`,
                        ),
                    },
                  );
                  part.url = blob.url;
                }
                const r = await finishReadyPart(part.id, part.url);
                if (!r.ok) throw Error(r.error);
                completed.add(key);
              }
              w.postMessage({ type: "next" });
            } catch (e) {
              reject(e);
            }
          };
          w.postMessage({ type: "start", buffer }, [buffer]);
        });
        return completed.size;
      } finally {
        worker?.terminate();
        running = false;
        activeAbort = undefined;
      }
    },
  };
}
