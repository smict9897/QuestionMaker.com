import { NextResponse } from "next/server";
import { parseBanglaQuestions } from "@/lib/question-parser";
// @ts-ignore
import pdfParse from "pdf-parse";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const directText = formData.get("text") as string | null;

    let fullText = "";

    // ১. যদি সরাসরি টেক্সট পেস্ট করা হয়ে থাকে
    if (directText && directText.trim().length > 10) {
      fullText = directText;
    } 
    // ২. যদি PDF ফাইল আপলোড করা হয়ে থাকে
    else if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const data = await pdfParse(buffer);
      fullText = data.text || "";
    } else {
      return NextResponse.json({ success: false, error: "কোনো ফাইল বা টেক্সট পাওয়া যায়নি।" }, { status: 400 });
    }

    if (!fullText.trim()) {
      return NextResponse.json({ success: false, error: "PDF থেকে কোনো টেক্সট পড়া সম্ভব হয়নি।" }, { status: 400 });
    }

    // 🎯 AI ছাড়া পিওর কোড দিয়ে পার্স করা
    const parsedData = parseBanglaQuestions(fullText);

    return NextResponse.json({
      success: true,
      rawLength: fullText.length,
      mcqs: parsedData.mcqs,
      shortQuestions: parsedData.shortQuestions,
      cqs: parsedData.cqs,
    });
  } catch (err: any) {
    console.error("PDF Parse API Error:", err);
    return NextResponse.json({ success: false, error: err.message || "PDF প্রসেস করতে ত্রুটি হয়েছে।" }, { status: 500 });
  }
}
