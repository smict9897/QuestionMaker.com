import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdmin } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  // 🔒 শুধু লগইন করা ADMIN
  const denied = await checkAdmin();
  if (denied) return denied;

  try {
    const pending = await db.aiTask.count({ where: { status: "PENDING" } });
    const processing = await db.aiTask.count({ where: { status: "PROCESSING" } });
    const completed = await db.aiTask.count({ where: { status: "COMPLETED" } });
    const failed = await db.aiTask.count({ where: { status: "FAILED" } });

    const recentTasks = await db.aiTask.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, prompt: true, status: true }
    });

    return NextResponse.json({ success: true, stats: { pending, processing, completed, failed }, recentTasks });
  } catch (error: any) {
    console.error("ai-status error:", error?.message);
    return NextResponse.json({ success: false, error: "সার্ভারে সমস্যা হয়েছে।" }, { status: 500 });
  }
}

// ===== ফাইল শেষ =====
