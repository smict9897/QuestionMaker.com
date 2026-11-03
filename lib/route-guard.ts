import { NextResponse } from "next/server";
import { auth } from "@/auth";

// 🔒 অনুমতি না থাকলে এই উত্তর যাবে
function unauthorized() {
  return NextResponse.json(
    { success: false, error: "অনুমতি নেই। অ্যাডমিন হিসেবে লগইন করুন।" },
    { status: 401 }
  );
}

// শুধু লগইন করা ADMIN। ঠিক থাকলে null ফেরত দেয়, না হলে ৪০১ উত্তর ফেরত দেয়।
export async function checkAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (session?.user?.role === "ADMIN") return null;
  return unauthorized();
}

// GitHub cron (Bearer CRON_SECRET) অথবা লগইন করা ADMIN
export async function checkAdminOrCron(req: Request): Promise<NextResponse | null> {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") || "";
  if (secret && header === `Bearer ${secret}`) return null;
  return checkAdmin();
}

// ===== ফাইল শেষ =====
