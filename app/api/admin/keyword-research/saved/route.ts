import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { normalizeItems, type KeywordItem } from "@/lib/keyword-research";

export const dynamic = "force-dynamic";

const PREFIX = "kw:";
const MAX_LISTS = 100;
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

async function isAdmin() {
  return (await auth())?.user?.role === "ADMIN";
}

export async function GET() {
  if (!(await isAdmin())) return fail("শুধু অ্যাডমিন।", 403);
  try {
    const rows = await db.setting.findMany({ where: { key: { startsWith: PREFIX } }, take: 200 });
    const lists: { id: string; topic: string; savedAt: number; items: KeywordItem[] }[] = [];
    for (const r of rows) {
      try {
        const o = JSON.parse(r.value) as { topic?: unknown; savedAt?: unknown; items?: unknown };
        lists.push({
          id: r.key.slice(PREFIX.length),
          topic: String(o.topic ?? ""),
          savedAt: Number(o.savedAt) || 0,
          items: normalizeItems(o.items, 30),
        });
      } catch {}
    }
    lists.sort((a, b) => b.savedAt - a.savedAt);
    return NextResponse.json({ ok: true, lists: lists.slice(0, 50) });
  } catch (e) {
    console.error("kw saved list failed:", e);
    return fail("তালিকা আনা যায়নি।", 500);
  }
}

const SaveBody = z.object({
  topic: z.string().trim().min(1).max(200),
  items: z.array(z.unknown()).max(30),
});

export async function POST(req: Request) {
  if (!(await isAdmin())) return fail("শুধু অ্যাডমিন।", 403);
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("অনুরোধ পড়া যায়নি।");
  }
  const p = SaveBody.safeParse(json);
  if (!p.success) return fail("সংরক্ষণের তথ্য ঠিক নেই।");
  const items = normalizeItems(p.data.items, 30);
  if (!items.length) return fail("সংরক্ষণ করার মতো কিওয়ার্ড নেই।");
  try {
    if ((await db.setting.count({ where: { key: { startsWith: PREFIX } } })) >= MAX_LISTS)
      return fail("অনেক তালিকা জমেছে। কিছু পুরনো তালিকা মুছে আবার চেষ্টা করুন।");
    const id = crypto.randomUUID();
    await db.setting.create({
      data: { key: PREFIX + id, value: JSON.stringify({ topic: p.data.topic, savedAt: Date.now(), items }) },
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("kw save failed:", e);
    return fail("সংরক্ষণ হয়নি। আবার চেষ্টা করুন।", 500);
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return fail("শুধু অ্যাডমিন।", 403);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(id)) return fail("ঠিকানা ঠিক নেই।");
  try {
    await db.setting.delete({ where: { key: PREFIX + id } });
    return NextResponse.json({ ok: true });
  } catch {
    return fail("মোছা যায়নি।", 500);
  }
}
