"use server";

import {
  EnglishProviderError,
  englishProviderMessage,
} from "@/lib/english/provider-error";
import { englishSubset, findEnglishBankParts } from "@/lib/english/bank";
import { validateEnglishOutput } from "@/lib/english/generation";
import { recoverEnglishTasks } from "@/lib/english/recovery";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createHash, randomUUID } from "crypto";
import { requestEnglishPaper } from "@/lib/english/provider";
import { resolveEnglishSelection } from "@/lib/english/selection";
import {
  validateEnglishDraft,
  englishOwnerPrefix,
  ownsEnglishDraft,
} from "@/lib/english/draft";
import { paperHeaderSchema } from "@/lib/paper-header";
async function owner() {
  const user = (await auth())?.user;
  return user?.id && (user.role === "ADMIN" || user.role === "TEACHER")
    ? user
    : null;
}

function makeDraft(
  selection: ReturnType<typeof resolveEnglishSelection>["selection"],
  generated: Awaited<ReturnType<typeof requestEnglishPaper>>,
) {
  const header = paperHeaderSchema.parse({});
  for (const f of Object.values(header.fields)) f.enabled = false;
  Object.assign(header, { enabled: true });
  Object.assign(header.fields.institute, {
    enabled: true,
    value: "Your institution",
  });
  Object.assign(header.fields.program, {
    enabled: true,
    value: "Practice examination 2027",
  });
  Object.assign(header.fields.class, {
    enabled: true,
    value: `Class ${selection.grade}`,
  });
  Object.assign(header.fields.subject, {
    enabled: true,
    value: `English ${selection.paper === 1 ? "1st" : "2nd"} Paper`,
  });
  Object.assign(header.fields.fullMarks, {
    enabled: true,
    value: String(generated.total),
  });
  return validateEnglishDraft({
    version: 1,
    name: `English ${selection.grade} — Paper ${selection.paper}`,
    selection: selection,
    output: generated.output,
    header,
    fontSize: 12,
    font: "serif",
    updatedAt: new Date().toISOString(),
  });
}
export async function generateEnglishPaper(raw: unknown) {
  const user = await owner();
  if (!user?.id)
    return {
      ok: false as const,
      error: "শিক্ষক বা অ্যাডমিন হিসেবে লগইন করুন।",
    };
  const quotaNotice =
    user.role === "ADMIN"
      ? ""
      : " আবার চেষ্টা করলে দৈনিক সীমা থেকে আরেকবার গণনা হবে।";
  let stage = "selection";
  let acquired = false;
  let recoveredCount = 0;
  const recoveredIds = new Set<string>();
  const token = randomUUID(),
    lock = `englishai:lock:${createHash("sha256").update(user.id).digest("hex")}`;
  try {
    const request = resolveEnglishSelection(raw);
    if (JSON.stringify(raw).length > 150000)
      return { ok: false as const, error: "নির্বাচিত পাঠ্যাংশ অত্যন্ত বড়।" };
    await db.setting.deleteMany({
      where: { key: lock, value: { lt: String(Date.now() - 180000) } },
    });
    try {
      await db.setting.create({
        data: { key: lock, value: `${Date.now()}:${token}` },
      });
      acquired = true;
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
      return {
        ok: false as const,
        error: "আপনার একটি generation চলছে। কিছুক্ষণ অপেক্ষা করুন।",
      };
    }
    const bank = await findEnglishBankParts(request.selection, async (after) =>
      db.setting.findMany({
        where: {
          key: {
            startsWith: "english-review:",
            ...(after ? { gt: after } : {}),
          },
          value: { contains: '"status":"APPROVED"' },
        },
        orderBy: { key: "asc" },
        take: 100,
      }),
    );
    if (!bank.missingIds.length) {
      const generated = validateEnglishOutput(request.selection, bank.output);
      const key = englishOwnerPrefix(user.id) + randomUUID();
      stage = "storage";
      await db.setting.create({
        data: {
          key,
          value: JSON.stringify(makeDraft(request.selection, generated)),
        },
      });
      return { ok: true as const, key };
    }
    if (!process.env.DEEPSEEK_API_KEY)
      return {
        ok: false as const,
        error:
          "অনুমোদিত database-এ সব নির্বাচিত অংশ নেই এবং Generation সংযোগ কনফিগার করা নেই।",
      };
    if (user.role !== "ADMIN") {
      const day = new Date().toISOString().slice(0, 10);
      let reserved = false;
      for (let i = 0; i < 10; i++) {
        try {
          await db.setting.create({
            data: {
              key: `englishai:quota:${createHash("sha256").update(user.id).digest("hex")}:${day}:${i}`,
              value: token,
            },
          });
          reserved = true;
          break;
        } catch (e) {
          if ((e as { code?: string }).code !== "P2002") throw e;
        }
      }
      if (!reserved)
        return {
          ok: false as const,
          error: "আজকের English generation সীমা (১০ বার) শেষ।",
        };
    }
    stage = "generation";
    const fresh = await requestEnglishPaper(
      englishSubset(request.selection, bank.missingIds),
      {
        apiKey: process.env.DEEPSEEK_API_KEY,
        segmented: true,
        onContent: async (content) => {
          for (const part of recoverEnglishTasks(request.selection, content)) {
            if (recoveredIds.has(part.id)) continue;
            const hash = createHash("sha256")
              .update(
                JSON.stringify([user.id, part.selection, part.result.output]),
              )
              .digest("hex");
            const recoveryId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
            const recoveryKey = englishOwnerPrefix(user.id!) + recoveryId;
            const reviewKey = `english-review:${recoveryId}`;
            if (
              await db.setting
                .findUnique({ where: { key: reviewKey } })
                .catch(() => {
                  throw new EnglishProviderError("STORAGE");
                })
            ) {
              recoveredIds.add(part.id);
              recoveredCount++;
              continue;
            }
            const recovered = {
              ...makeDraft(part.selection, part.result),
              name: `Recovered — English ${request.selection.grade}/${request.selection.paper} — ${part.id}`,
            };
            // Durable private checkpoint first. Review snapshot is separate from editable owner draft.
            try {
              await db.$transaction([
                db.setting.create({
                  data: { key: recoveryKey, value: JSON.stringify(recovered) },
                }),
                db.setting.create({
                  data: {
                    key: reviewKey,
                    value: JSON.stringify({
                      status: "PENDING",
                      draftKey: recoveryKey,
                      draft: recovered,
                    }),
                  },
                }),
              ]);
            } catch {
              throw new EnglishProviderError("STORAGE");
            }
            recoveredIds.add(part.id);
            recoveredCount++;
          }
        },
      },
    );
    const combined = {
      tasks: [...bank.output.tasks, ...fresh.output.tasks],
      passages: [...bank.output.passages, ...fresh.output.passages],
    };
    combined.tasks.sort(
      (a, b) =>
        request.items.findIndex((i) => i.id === a.id) -
        request.items.findIndex((i) => i.id === b.id),
    );
    const generated = validateEnglishOutput(request.selection, combined);
    const draft = makeDraft(request.selection, generated);
    const key = englishOwnerPrefix(user.id) + randomUUID();
    stage = "storage";
    await db.setting.create({ data: { key, value: JSON.stringify(draft) } });
    return { ok: true as const, key };
  } catch (error) {
    const recoveryNotice = recoveredCount
      ? ` ${recoveredCount}টি সম্পূর্ণ অংশ ব্যক্তিগত recovered draft ও অ্যাডমিনের অনুমোদন তালিকায় সংরক্ষিত আছে। আমার draft পাতা দেখুন।`
      : "";
    if (error instanceof EnglishProviderError)
      return {
        ok: false as const,
        stage: "generation",
        code: error.code,
        error: `${englishProviderMessage(error.code)} [${error.code}]${error.rule ? ` নিয়ম: ${error.rule}` : ""}${quotaNotice}${recoveryNotice}`,
      };
    return {
      ok: false as const,
      stage,
      error:
        recoveryNotice +
        (stage === "selection"
          ? "শ্রেণি, পত্র, নির্বাচিত task, writing topic এবং প্রয়োজনীয় textbook source/reference যাচাই করুন। সংযোগ বা দৈনিক সীমা যাচাইও ব্যর্থ হয়ে থাকতে পারে।"
          : stage === "storage"
            ? "প্রশ্ন তৈরি হয়েছে কিন্তু draft সেভ হয়নি। Database সংযোগ যাচাই করতে হবে।" +
              quotaNotice
            : "Generation ব্যর্থ হয়েছে: provider সংযোগ, সময়সীমা অথবা output validation সমস্যা হতে পারে। অসম্পূর্ণ paper সেভ করা হয়নি। শ্রেণি/পত্র ও এই error-এর screenshot দিন।" +
              quotaNotice),
    };
  } finally {
    if (acquired)
      await db.setting
        .deleteMany({ where: { key: lock, value: { endsWith: token } } })
        .catch(() => {});
  }
}
export async function loadEnglishPaper(key: string) {
  const user = await owner();
  if (!user?.id || !ownsEnglishDraft(key, user.id)) return null;
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return validateEnglishDraft(JSON.parse(row.value));
  } catch {
    return null;
  }
}
export async function listEnglishPapers() {
  const user = await owner();
  if (!user?.id) return [];
  const rows = await db.setting.findMany({
    where: { key: { startsWith: englishOwnerPrefix(user.id) } },
    take: 100,
    orderBy: { key: "desc" },
  });
  return rows.flatMap((row) => {
    try {
      const d = validateEnglishDraft(JSON.parse(row.value));
      return [{ key: row.key, name: d.name, updatedAt: d.updatedAt }];
    } catch {
      return [];
    }
  });
}
export async function saveEnglishPaper(key: string, raw: unknown) {
  const user = await owner();
  if (!user?.id || !ownsEnglishDraft(key, user.id))
    return { ok: false, error: "অনুমতি নেই।" };
  try {
    const draft = validateEnglishDraft(raw);
    const row = await db.setting.findUnique({ where: { key } });
    if (!row) return { ok: false, error: "Draft পাওয়া যায়নি।" };
    const stored = validateEnglishDraft(JSON.parse(row.value));
    if (stored.updatedAt !== draft.updatedAt)
      return {
        ok: false,
        error:
          "অন্য tab/session থেকে draft বদলেছে। এই tab-এর লেখা কপি করে রাখুন; তারপর reload করে আবার সম্পাদনা করুন।",
        conflict: true,
      };
    const updatedAt = new Date(
      Math.max(Date.now(), Date.parse(stored.updatedAt) + 1),
    ).toISOString();
    const changed = await db.setting.updateMany({
      where: { key, value: row.value },
      data: { value: JSON.stringify({ ...draft, updatedAt }) },
    });
    return changed.count
      ? { ok: true, updatedAt }
      : {
          ok: false,
          error: "একই সময়ে draft বদলেছে। লেখা কপি করে রেখে reload করুন।",
          conflict: true,
        };
  } catch {
    return {
      ok: false,
      error: "সেভ হয়নি। প্রশ্নের কাঠামো, topic ও source অপরিবর্তিত রাখুন।",
    };
  }
}
