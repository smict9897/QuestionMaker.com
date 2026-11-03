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
export async function POST(req: Request) {
  try {
    await ensureTable();
    const body = await req.json();
    const { examTitle, studentName, studentClass, rollNumber, institution, score, totalMarks, timeSpent } = body;

    const query = `
      INSERT INTO "ExamLeaderboard" ("id", "examTitle", "studentName", "studentClass", "rollNumber", "institution", "score", "totalMarks", "timeSpent", "createdAt")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *;
    `;

    const res: any = await db.$queryRawUnsafe(
      query,
      examTitle || "সাধারণ পরীক্ষা",
      studentName || "শিক্ষার্থী",
      studentClass || "N/A",
      rollNumber || "0",
      institution || "",
      parseFloat(score) || 0,
      parseInt(totalMarks) || 0,
      parseInt(timeSpent) || 0
    );

    return NextResponse.json({ success: true, entry: res[0] });
  } catch (err: any) {
    console.error("Leaderboard Save Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
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
