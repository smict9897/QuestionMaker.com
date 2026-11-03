import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { staff } from "@/lib/guard";
import { 
  CheckCircle2, XCircle, Trash2, Check, 
  Database, ShieldCheck 
} from "lucide-react";
import PdfImport from "@/components/pdf-import";
import { toggleApprove, deleteQuestion, approveAllPending } from "./actions";

export const dynamic = "force-dynamic";

const CATEGORIES = ["1", "2", "3", "4", "5", "6", "7", "8", "SSC", "HSC", "Admission", "Job"];

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await staff();
  const params = await searchParams;

  const page = Math.max(1, Number(params.page || 1));
  const category = typeof params.category === "string" ? params.category : "";
  const subject = typeof params.subject === "string" ? params.subject : "";
  const status = typeof params.status === "string" ? params.status : "all";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const okMsg = typeof params.ok === "string" ? params.ok : null;
  const errMsg = typeof params.err === "string" ? params.err : null;

  const take = 30;
  const skip = (page - 1) * take;

  const where: any = {};
  if (category) where.category = category;
  if (subject) where.subject = { contains: subject, mode: "insensitive" };
  if (status === "approved") where.approved = true;
  if (status === "pending") where.approved = false;
  if (query) {
    where.OR = [
      { text: { contains: query, mode: "insensitive" } },
      { topic: { contains: query, mode: "insensitive" } },
    ];
  }

  const [questions, total, pendingCount] = await Promise.all([
    db.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.question.count({ where }),
    db.question.count({ where: { approved: false } }),
  ]);

  const totalPages = Math.ceil(total / take) || 1;

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 font-sans">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Database className="text-blue-600" />
            প্রশ্ন ব্যাংক ব্যবস্থাপনা
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            মোট প্রশ্ন: {total}টি | অনুমোদনের অপেক্ষায়: {pendingCount}টি
          </p>
        </div>

        {pendingCount > 0 && (
          <form action={approveAllPending}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
            >
              <ShieldCheck size={16} />
              <span>সব অপেক্ষমাণ প্রশ্ন অনুমোদন করুন ({pendingCount})</span>
            </button>
          </form>
        )}
      </div>

      {okMsg && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={16} /> <span>{okMsg}</span>
        </div>
      )}
      {errMsg && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-800 flex items-center gap-2">
          <XCircle size={16} /> <span>{errMsg}</span>
        </div>
      )}

      {/* 🎯 ১. PDF থেকে প্রশ্ন আমদানি ড্রপডাউন */}
      <PdfImport categories={CATEGORIES} />

      {/* ২. ফিল্টার ও সার্চ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs mb-6">
        <form method="GET" action="/admin/questions" className="grid gap-3 sm:grid-cols-4">
          <div>
            <select
              name="category"
              defaultValue={category}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
            >
              <option value="">সকল শ্রেণি</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
            >
              <option value="all">অনুমোদনের স্ট্যাটাস: সকল</option>
              <option value="approved">অনুমোদিত (Approved)</option>
              <option value="pending">অপেক্ষমাণ (Pending)</option>
            </select>
          </div>

          <div>
            <input
              type="text"
              name="subject"
              defaultValue={subject}
              placeholder="বিষয় খুঁজুন..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="প্রশ্নের কী-ওয়ার্ড..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
            >
              ফিল্টার
            </button>
          </div>
        </form>
      </div>

      {/* ৩. তালিকা */}
      {questions.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          কোনো প্রশ্ন পাওয়া যায়নি।
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const options: any = typeof q.options === "object" && q.options !== null ? q.options : {};
            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5 text-[10px]">
                      <span className="font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {q.category}
                      </span>
                      <span className="font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {q.subject}
                      </span>
                      {q.topic && (
                        <span className="text-slate-500 px-1">
                          • {q.topic}
                        </span>
                      )}
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        q.approved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}>
                        {q.approved ? "অনুমোদিত" : "অপেক্ষমাণ"}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                      {skip + idx + 1}. {q.text}
                    </p>

                    {Object.keys(options).length > 0 && (
                      <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(options).map(([k, v]) => {
                          const isCorrect = q.correct === k;
                          return (
                            <div
                              key={k}
                              className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                                isCorrect 
                                  ? "bg-emerald-50/70 border-emerald-300 font-bold text-emerald-900" 
                                  : "bg-slate-50 border-slate-100 text-slate-700"
                              }`}
                            >
                              <span className="text-[10px] text-slate-400">({k})</span>
                              <span>{String(v)}</span>
                              {isCorrect && <Check size={12} className="ml-auto text-emerald-600" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <form action={toggleApprove.bind(null, q.id, q.approved)}>
                      <button
                        type="submit"
                        className={`p-2 rounded-xl text-xs font-bold transition ${
                          q.approved
                            ? "bg-amber-50 hover:bg-amber-100 text-amber-700"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                        }`}
                        title={q.approved ? "অনুমোদন বাতিল করুন" : "অনুমোদন করুন"}
                      >
                        {q.approved ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                    </form>

                    <form action={deleteQuestion.bind(null, q.id)}>
                      <button
                        type="submit"
                        className="p-2 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 transition"
                        title="প্রশ্নটি মুছে ফেলুন"
                      >
                        <Trash2 size={16} />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold">
          {page > 1 && (
            <Link
              href={`/admin/questions?page=${page - 1}&category=${category}&subject=${subject}&status=${status}&q=${query}`}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
            >
              আগের পাতা
            </Link>
          )}
          <span className="text-slate-500">পাতা {page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/admin/questions?page=${page + 1}&category=${category}&subject=${subject}&status=${status}&q=${query}`}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
            >
              পরের পাতা
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
