import { readyAIConfigured } from "@/lib/ready-ai-config";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { walletTransaction } from "@/lib/wallet";
import { READY_PREFIX, parseReady } from "@/lib/ready-papers";
import {
  READY_AI_PREFIX,
  initialReadyAIJob,
  type ReadyAIJob,
  type AIPageResult,
} from "@/lib/ready-ai";
import { browserOCRSchema, solveReadyAIPage } from "@/lib/ready-ai-provider";
import type { ReadyPurchase } from "@/app/actions/ready-commerce";
import { z } from "zod";
export const runtime = "nodejs";
export const maxDuration = 180;
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return Response.json({ error: "অবৈধ অনুরোধ।" }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "লগইন করুন।" }, { status: 401 });
  let input: z.infer<typeof inputSchema>;
  try {
    input = inputSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "অবৈধ অনুরোধ।" }, { status: 400 });
  }
  const owner = session.user.id,
    receiptKey = `readyowned:v1:${owner}:${input.receiptId}`,
    jobKey = `${READY_AI_PREFIX}${owner}:${input.receiptId}`;
  try {
    const claim = await walletTransaction(async (tx) => {
      const row = await tx.setting.findUnique({ where: { key: receiptKey } });
      if (!row) throw Error("not owned");
      const purchase = JSON.parse(row.value) as ReadyPurchase;
      if (purchase.ownerId !== owner) throw Error("not owned");
      const old = await tx.setting.findUnique({ where: { key: jobKey } });
      const job: ReadyAIJob = old
        ? JSON.parse(old.value)
        : initialReadyAIJob(input.receiptId, purchase.selected);
      for (const n of purchase.selected) {
        const p = job.pages[n];
        if (p.status === "running" && (p.leaseUntil ?? 0) < Date.now()) {
          p.status = p.attempts >= 3 ? "error" : "pending";
          p.error = "আগের কাজের সময় শেষ হয়েছে।";
        }
        if (input.retry && p.status === "error" && p.attempts < 3) {
          p.status = "pending";
          delete p.error;
        }
      }
      if (input.ocr || input.ocrFailed) {
        const p = job.pages[input.page!];
        if (
          !purchase.selected.includes(input.page!) ||
          !p ||
          p.status !== "running" ||
          p.lease !== input.lease ||
          (p.leaseUntil ?? 0) <= Date.now() ||
          p.submitted
        )
          throw Error("Invalid OCR lease");
        if (input.ocrFailed) {
          p.status = "error";
          p.error = "ব্রাউজারে OCR পড়া যায়নি। আবার চেষ্টা করুন।";
          delete p.lease;
          delete p.leaseUntil;
          await tx.setting.update({
            where: { key: jobKey },
            data: { value: JSON.stringify(job) },
          });
          return { job, work: undefined, submit: false };
        }
        p.submitted = true;
        await tx.setting.update({
          where: { key: jobKey },
          data: { value: JSON.stringify(job) },
        });
        return {
          job,
          work: { page: input.page!, url: "", lease: input.lease! },
          submit: true,
        };
      }
      let work: { page: number; url: string; lease: string } | undefined;
      if (
        input.run &&
        readyAIConfigured() &&
        !Object.values(job.pages).some((p) => p.status === "running")
      ) {
        const page = purchase.selected.find(
          (n) => job.pages[n].status === "pending" && job.pages[n].attempts < 3,
        );
        if (page !== undefined) {
          const source = await tx.setting.findUnique({
            where: { key: READY_PREFIX + purchase.paperId },
          });
          const paper = source && parseReady(source.value);
          if (!paper) throw Error("Source missing");
          const p = job.pages[page],
            lease = randomUUID();
          p.status = "running";
          delete p.submitted;
          p.attempts++;
          p.lease = lease;
          p.leaseUntil = Date.now() + 600000;
          work = { page, url: paper.url, lease };
        }
      }
      await tx.setting.upsert({
        where: { key: jobKey },
        create: { key: jobKey, value: JSON.stringify(job) },
        update: { value: JSON.stringify(job) },
      });
      return { job, work, submit: false };
    });
    if (!claim.work)
      return Response.json({
        job: claim.job,
        configured: readyAIConfigured(),
      });
    if (!claim.submit)
      return Response.json({
        job: claim.job,
        work: claim.work,
        configured: true,
      });
    const work = claim.work;
    let result: AIPageResult | undefined;
    let failed = false;
    try {
      result = await solveReadyAIPage(input.ocr!, work.page);
    } catch {
      failed = true;
    }
    const job = await walletTransaction(async (tx) => {
      const row = await tx.setting.findUnique({ where: { key: jobKey } });
      if (!row) throw Error("Missing job");
      const job = JSON.parse(row.value) as ReadyAIJob;
      const p = job.pages[work.page];
      if (p.lease === work.lease) {
        p.status = failed ? "error" : "done";
        if (result) p.result = result;
        if (failed)
          p.error =
            "এই পৃষ্ঠার AI উত্তর তৈরি হয়নি। ফাঁকা রাখা হয়েছে; আবার চেষ্টা করুন।";
        else delete p.error;
        delete p.lease;
        delete p.leaseUntil;
        await tx.setting.update({
          where: { key: jobKey },
          data: { value: JSON.stringify(job) },
        });
      }
      return job;
    });
    return Response.json({ job, configured: true });
  } catch {
    return Response.json(
      { error: "কেনা প্রশ্নপত্রের অনুমতি বা সংরক্ষণ যাচাই হয়নি।" },
      { status: 403 },
    );
  }
}
const inputSchema = z
  .object({
    receiptId: z.string().regex(/^[a-f0-9]{64}$/),
    run: z.boolean().default(false),
    retry: z.boolean().default(false),
    page: z.number().int().min(1).max(100).optional(),
    lease: z.string().uuid().optional(),
    ocr: browserOCRSchema.optional(),
    ocrFailed: z.boolean().optional(),
  })
  .refine(
    (v) => (!v.ocr && !v.ocrFailed) || (v.page !== undefined && !!v.lease),
  );
