"use server";
import { visibleQuestions } from "@/lib/paper-generation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const PREFIX = "qbpaper:";

async function staff() {
  const s = await auth();
  return s?.user?.id && (s.user.role === "ADMIN" || s.user.role === "TEACHER")
    ? s.user
    : null;
}

const Save = z.object({
  name: z.string().trim().min(1).max(120),
  ids: z.array(z.string()).min(1).max(300),
  settings: z.unknown(),
});

export type SavedPaper = {
  key: string;
  name: string;
  count: number;
  createdAt: string;
  ids: string[];
  settings: unknown;
  categories: string[];
  subjects: string[];
  chapters: string[];
  typeCounts: Record<string, number>;
  updatedAt: string;
};

export async function savePaper(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await staff();
  if (!user)
    return { ok: false, error: "অ্যাডমিন বা শিক্ষক হিসেবে লগইন করুন।" };
  const p = Save.safeParse(raw);
  if (!p.success)
    return { ok: false, error: "নাম দিন এবং কমপক্ষে একটি প্রশ্ন রাখুন।" };
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try {
    await db.setting.create({
      data: {
        key: `${PREFIX}${user.id}:${id}`,
        value: JSON.stringify({
          ownerId: user.id,
          name: p.data.name,
          ids: p.data.ids,
          settings: p.data.settings ?? null,
          createdAt: new Date().toISOString(),
        }),
      },
    });
  } catch (e) {
    console.error("savePaper failed:", e);
    return { ok: false, error: "সেভ হয়নি। আবার চেষ্টা করুন।" };
  }
  revalidatePath("/question-builder/saved");
  return { ok: true };
}

export async function listPapers(): Promise<SavedPaper[]> {
  const user = await staff();
  if (!user) return [];
  const rows = await db.setting.findMany({
    where: { key: { startsWith: PREFIX } },
  });
  const out: SavedPaper[] = [];
  for (const r of rows) {
    try {
      const o = JSON.parse(r.value) as {
        ownerId?: string;
        updatedAt?: string;
        name?: string;
        ids?: string[];
        settings?: unknown;
        createdAt?: string;
      };
      if (
        !o.name ||
        !Array.isArray(o.ids) ||
        !o.ids.every((id) => typeof id === "string")
      )
        continue;
      if (o.ownerId ? o.ownerId !== user.id : user.role !== "ADMIN") continue;
      out.push({
        key: r.key,
        name: o.name,
        count: o.ids.length,
        createdAt: o.createdAt ?? "",
        ids: o.ids,
        settings: o.settings ?? null,
        updatedAt: o.updatedAt ?? o.createdAt ?? "",
        categories: [],
        subjects: [],
        chapters: [],
        typeCounts: {},
      });
    } catch {}
  }
  const ids = [...new Set(out.flatMap((p) => p.ids))];
  if (ids.length) {
    const questions = await db.question.findMany({
      where: { id: { in: ids }, ...visibleQuestions(user.id) },
      select: {
        id: true,
        category: true,
        subject: true,
        topic: true,
        correct: true,
        options: true,
      },
    });
    const map = new Map(questions.map((q) => [q.id, q]));
    for (const paper of out) {
      const found = paper.ids
        .map((id) => map.get(id))
        .filter((q) => q !== undefined);
      paper.categories = [
        ...new Set(found.map((q) => q.category).filter(Boolean)),
      ];
      paper.subjects = [
        ...new Set(found.map((q) => q.subject).filter(Boolean)),
      ];
      paper.chapters = [...new Set(found.map((q) => q.topic).filter(Boolean))];
      found.forEach((q) => {
        const o = q.options as Record<string, unknown> | null;
        const type = q.correct
          ? "MCQ"
          : o && (o.stimulus || o.subQuestions || o.k || o.ক)
            ? "CQ"
            : "SHORT";
        paper.typeCounts[type] = (paper.typeCounts[type] || 0) + 1;
      });
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deletePaper(
  key: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await staff();
  if (!user || !key.startsWith(PREFIX))
    return { ok: false, error: "অনুমতি নেই।" };
  try {
    const row = await db.setting.findUnique({ where: { key } });
    if (!row) return { ok: false, error: "প্রশ্নপত্র পাওয়া যায়নি।" };
    const paper = JSON.parse(row.value);
    if (paper.ownerId ? paper.ownerId !== user.id : user.role !== "ADMIN")
      return { ok: false, error: "অনুমতি নেই।" };
    await db.setting.delete({ where: { key } });
  } catch {
    return { ok: false, error: "মুছে ফেলা যায়নি। আবার চেষ্টা করুন।" };
  }
  revalidatePath("/question-builder/saved");
  return { ok: true };
}
