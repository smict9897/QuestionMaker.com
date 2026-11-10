import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ডাটাবেজে টেবিল না থাকলে অটোমেটিক তৈরি করার ফাংশন
async function ensureTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ExamLeaderboard" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "examTitle" TEXT NOT NULL,
      "studentName" TEXT NOT NULL,
      "studentClass" TEXT NOT NULL,
      "rollNumber" TEXT NOT NULL,
      "institution" TEXT,
      "score" DOUBLE PRECISION NOT NULL,
      "totalMarks" INTEGER NOT NULL,
      "timeSpent" INTEGER NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `).catch(() => null);
}

// ১. রেজাল্ট সেভ করা
// Unverified practice scores must never enter a shared leaderboard.
// Scheduled model tests use authenticated, server-scored Attempt records.
export async function POST() {
  return NextResponse.json({ success: false, error: "Practice results are local only. Use a scheduled model test for ranked results." }, { status: 410 });
}

// ২. লিডারবোর্ড তালিকা আনা (বেশি মার্ক আগে, সমান হলে কম সময়ে যে দিয়েছে সে আগে)
export async function GET(req: Request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const examTitle = searchParams.get("examTitle");

    let query = `
      SELECT * FROM "ExamLeaderboard"
      ${examTitle ? `WHERE "examTitle" = $1` : ""}
      ORDER BY "score" DESC, "timeSpent" ASC
      LIMIT 100;
    `;

    const list: any = examTitle
      ? await db.$queryRawUnsafe(query, examTitle)
      : await db.$queryRawUnsafe(query);

    return NextResponse.json({ success: true, leaderboard: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
