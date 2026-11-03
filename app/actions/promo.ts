"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export type PromoSettings = {
  active: boolean;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  coverUrl: string;
  pdfPrice: number;
  pdfRegularPrice: number;
  printPrice: number;
  printRegularPrice: number;
  pdfDriveUrl: string;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber?: string;
  allowPrint: boolean;
};

// 🎯 export বাদ দিয়ে ইন্টারনাল কনস্ট্যান্ট করা হলো যাতে Next.js এরর না দেয়
const defaultPromoData: PromoSettings = {
  active: true,
  title: "Writing part",
  subtitle: "Paragraph writing",
  description: "Full hand Note",
  badge: "50% Discount",
  coverUrl: "",
  pdfPrice: 50,
  pdfRegularPrice: 100,
  printPrice: 350,
  printRegularPrice: 500,
  pdfDriveUrl: "",
  bkashNumber: "01773729897",
  nagadNumber: "01773729897",
  rocketNumber: "01773729897",
  allowPrint: false,
};

async function ensureSettingTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Setting" (
      "key" TEXT PRIMARY KEY,
      "value" TEXT NOT NULL
    );
  `).catch(() => null);
}

// ১. সেটিংস ফেচ করা
export async function getPromoSettings(): Promise<PromoSettings> {
  try {
    await ensureSettingTable();
    const setting = await db.setting.findUnique({
      where: { key: "promo_book" },
    }).catch(() => null);

    if (!setting || !setting.value) return defaultPromoData;
    return { ...defaultPromoData, ...JSON.parse(setting.value) };
  } catch (err) {
    console.error("Error fetching promo settings:", err);
    return defaultPromoData;
  }
}

// ২. সেটিংস সেভ করা
export async function savePromoSettings(data: PromoSettings) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { success: false, error: "অননুমোদিত: আপনি অ্যাডমিন হিসেবে লগইন নেই।" };
    }

    await ensureSettingTable();
    const jsonValue = JSON.stringify(data);

    try {
      await db.setting.upsert({
        where: { key: "promo_book" },
        update: { value: jsonValue },
        create: { key: "promo_book", value: jsonValue },
      });
    } catch {
      await db.$executeRawUnsafe(
        `INSERT INTO "Setting" ("key", "value") VALUES ('promo_book', $1)
         ON CONFLICT ("key") DO UPDATE SET "value" = $1;`,
        jsonValue
      );
    }

    try {
      revalidatePath("/", "layout");
      revalidatePath("/admin/promo");
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error("Save promo error:", err);
    return { success: false, error: err?.message || "ডাটাবেজে সেভ হতে ব্যর্থ হয়েছে।" };
  }
}
