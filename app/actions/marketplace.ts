"use server";
import { assertRenderableMarketSnapshot } from "@/lib/marketplace-preview";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requirePaidQuestions, walletTransaction } from "@/lib/wallet";
import { visibleQuestions } from "@/lib/paper-generation";
import {
  MARKET_PREFIX,
  marketPricePaisa,
  marketMetadataSchema,
  marketSubmissionId,
  snapshotHash,
  databasePaperOwner,
  assertReviewable,
  type MarketSubmission,
} from "@/lib/marketplace";
import { revalidatePath } from "next/cache";

export type MarketFormState = { ok: boolean; message: string };
async function actor() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("আগে লগইন করুন।");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user) throw new Error("অ্যাকাউন্ট পাওয়া যায়নি।");
  return user;
}
export async function submitMarketPaper(
  _previous: MarketFormState,
  form: FormData,
): Promise<MarketFormState> {
  try {
    const user = await actor();
    const sourceKey = String(form.get("sourceKey") || "");
    if (sourceKey.length > 200 || !sourceKey.startsWith(`qbpaper:${user.id}:`))
      return {
        ok: false,
        message: "নিজের সংরক্ষিত ডাটাবেজ প্রশ্নপত্র নির্বাচন করুন।",
      };
    const metadata = marketMetadataSchema.safeParse({
      examType: form.get("examType"),
      title: form.get("title"),
      grade: form.get("grade"),
      subject: form.get("subject"),
      chapters: [
        ...new Set(
          form
            .getAll("chapters")
            .flatMap((value) => String(value).split(/[,\n]/))
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ],
      description: form.get("description"),
      pricePaisa: marketPricePaisa(form.get("price")),
      rights: form.get("rights") === "on",
    });
    if (!metadata.success)
      return {
        ok: false,
        message:
          "পরীক্ষার ধরন, শিরোনাম, শ্রেণি, বিষয়, অধ্যায়, বিবরণ, ৳১–৫০,০০০ মূল্য এবং বিক্রির অধিকার নিশ্চিত করুন।",
      };
    const row = await db.setting.findUnique({ where: { key: sourceKey } });
    if (!row) return { ok: false, message: "সংরক্ষিত প্রশ্নপত্র পাওয়া যায়নি।" };
    const source = databasePaperOwner(row.value, sourceKey, user.id);
    await requirePaidQuestions(user.id, source.ids);
    const id = marketSubmissionId(user.id, sourceKey);
    const result = await walletTransaction(async (tx) => {
      const current = await tx.setting.findUnique({
        where: { key: sourceKey },
      });
      if (!current || current.value !== row.value)
        throw new Error("source changed");
      const existing = await tx.setting.findUnique({
        where: { key: MARKET_PREFIX + id },
      });
      const prior: MarketSubmission | null = existing
        ? JSON.parse(existing.value)
        : null;
      if (prior && (prior.ownerId !== user.id || prior.status !== "CHANGES"))
        return false;
      const questions = await tx.question.findMany({
        where: { id: { in: source.ids }, ...visibleQuestions(user.id) },
        select: {
          id: true,
          text: true,
          options: true,
          correct: true,
          explanation: true,
          category: true,
          subject: true,
          topic: true,
        },
      });
      if (questions.length !== source.ids.length)
        throw new Error("missing question");
      const byId = new Map(questions.map((q) => [q.id, q]));
      const snapshot = {
        settings: source.settings,
        questions: source.ids.map((id) => byId.get(id)!),
      };
      if (Buffer.byteLength(JSON.stringify(snapshot), "utf8") > 1000000)
        throw new Error("snapshot too large");
      const now = new Date().toISOString();
      const record: MarketSubmission = {
        version: 1,
        id,
        ownerId: user.id,
        sourceKey,
        source: "DATABASE",
        status: "PENDING",
        revision: (prior?.revision ?? 0) + 1,
        metadata: metadata.data,
        snapshot,
        snapshotHash: snapshotHash(snapshot),
        createdAt: prior?.createdAt ?? now,
        updatedAt: now,
      };
      if (existing)
        await tx.setting.update({
          where: { key: MARKET_PREFIX + id },
          data: { value: JSON.stringify(record) },
        });
      else
        await tx.setting.create({
          data: { key: MARKET_PREFIX + id, value: JSON.stringify(record) },
        });
      return true;
    });
    revalidatePath("/dashboard/sell");
    revalidatePath("/admin/marketplace");
    revalidatePath("/marketplace");
    return {
      ok: result,
      message: result
        ? "স্থির কপিসহ আবেদন জমা হয়েছে। অ্যাডমিন যাচাই করবেন। এই ধাপে বিক্রি/টাকা কাটা চালু নয়।"
        : "এই প্রশ্নপত্রের আবেদন আগেই জমা দেওয়া হয়েছে। সংশোধন চাওয়া হলে আবার জমা দিতে পারবেন।",
    };
  } catch {
    return {
      ok: false,
      message:
        "আবেদন জমা হয়নি। মালিকানা, checkout এবং সংরক্ষিত প্রশ্নপত্র যাচাই করুন।",
    };
  }
}
export async function reviewMarketPaper(
  _previous: MarketFormState,
  form: FormData,
): Promise<MarketFormState> {
  try {
    const user = await actor();
    if (user.role !== "ADMIN") throw new Error("forbidden");
    const id = String(form.get("id") || "");
    const decision = String(form.get("decision") || "");
    const revision = Number(form.get("revision"));
    const note = String(form.get("note") || "").trim();
    if (
      !/^[a-f0-9]{64}$/.test(id) ||
      !["APPROVED", "CHANGES", "REJECTED"].includes(decision) ||
      !Number.isSafeInteger(revision) ||
      note.length > 1000 ||
      (decision !== "APPROVED" && note.length < 5) ||
      form.get("reviewed") !== "on"
    )
      throw new Error("invalid review");
    await walletTransaction(async (tx) => {
      const fresh = await tx.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });
      if (fresh?.role !== "ADMIN") throw new Error("forbidden");
      const row = await tx.setting.findUnique({
        where: { key: MARKET_PREFIX + id },
      });
      if (!row) throw new Error("missing");
      const record: MarketSubmission = JSON.parse(row.value);
      assertReviewable(record, revision);
      if (decision === "APPROVED")
        assertRenderableMarketSnapshot(record.snapshot);
      if (record.ownerId === user.id) throw new Error("self review");
      const now = new Date().toISOString();
      await tx.setting.update({
        where: { key: row.key },
        data: {
          value: JSON.stringify({
            ...record,
            status: decision,
            updatedAt: now,
            review: { reviewerId: user.id, note, at: now },
          }),
        },
      });
    });
    revalidatePath("/dashboard/sell");
    revalidatePath("/admin/marketplace");
    revalidatePath("/marketplace");
    return {
      ok: true,
      message:
        "সিদ্ধান্ত সংরক্ষিত। অনুমোদিত পরিচিতি ক্যাটালগে দেখা যাবে; কেনাকাটা এখনও বন্ধ।",
    };
  } catch {
    return {
      ok: false,
      message:
        "সিদ্ধান্ত সংরক্ষণ হয়নি। অনুমতি, কারণ, যাচাইয়ের সম্মতি ও সর্বশেষ সংস্করণ পরীক্ষা করুন। নিজের আবেদন নিজে অনুমোদন করা যাবে না।",
    };
  }
}
