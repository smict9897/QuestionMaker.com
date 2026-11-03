"use server";

import { db } from "@/lib/db";
import { staff } from "@/lib/guard";
import { revalidatePath } from "next/cache";

// ডাটাবেজে টেবিল না থাকলে অটোমেটিক তৈরি করার ফাংশন
async function ensureOrderTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BookOrder" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "orderNumber" TEXT NOT NULL UNIQUE,
      "customerName" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "whatsapp" TEXT NOT NULL,
      "itemType" TEXT NOT NULL,
      "itemTitle" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "deliveryFee" DOUBLE PRECISION DEFAULT 0,
      "deliveryAddress" TEXT,
      "district" TEXT,
      "paymentMethod" TEXT NOT NULL,
      "senderNumber" TEXT NOT NULL,
      "trxId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `).catch(() => null);
}

export interface CreateOrderInput {
  customerName: string;
  phone: string;
  whatsapp: string;
  itemType: "PDF" | "PRINT";
  itemTitle: string;
  amount: number;
  deliveryFee: number;
  deliveryAddress?: string;
  district?: string;
  paymentMethod: "bKash" | "Nagad" | "Rocket";
  senderNumber: string;
  trxId: string;
}

// ১. নতুন অর্ডার তৈরি ও TrxID জমা
export async function createBookOrder(input: CreateOrderInput) {
  try {
    await ensureOrderTable();

    // ইউনিক অর্ডার নম্বর (যেমন: #SB-2026-1042)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `SB-${randomNum}`;

    const query = `
      INSERT INTO "BookOrder" (
        "id", "orderNumber", "customerName", "phone", "whatsapp", 
        "itemType", "itemTitle", "amount", "deliveryFee", 
        "deliveryAddress", "district", "paymentMethod", "senderNumber", 
        "trxId", "status", "createdAt"
      )
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING', NOW())
      RETURNING *;
    `;

    const res: any = await db.$queryRawUnsafe(
      query,
      orderNumber,
      input.customerName,
      input.phone,
      input.whatsapp,
      input.itemType,
      input.itemTitle,
      parseFloat(String(input.amount)),
      parseFloat(String(input.deliveryFee || 0)),
      input.deliveryAddress || "",
      input.district || "",
      input.paymentMethod,
      input.senderNumber,
      input.trxId.toUpperCase().trim()
    );

    revalidatePath("/admin/orders");
    return { success: true, order: res[0] };
  } catch (err: any) {
    console.error("Order creation failed:", err);
    return { success: false, error: err.message || "অর্ডার সম্পন্ন করা সম্ভব হয়নি" };
  }
}

// ২. অ্যাডমিন: সব অর্ডার তালিকা দেখা
export async function getAdminOrders() {
  try {
    await staff();
    await ensureOrderTable();
    const list: any = await db.$queryRawUnsafe(`
      SELECT * FROM "BookOrder" ORDER BY "createdAt" DESC LIMIT 100;
    `);
    return { success: true, orders: list };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ৩. অ্যাডমিন: অর্ডার স্ট্যাটাস আপডেট (Verified / Delivered / Cancelled)
export async function updateOrderStatus(orderId: string, status: string) {
  try {
    await staff();
    await db.$executeRawUnsafe(
      `UPDATE "BookOrder" SET "status" = $1 WHERE "id" = $2;`,
      status,
      orderId
    );
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
