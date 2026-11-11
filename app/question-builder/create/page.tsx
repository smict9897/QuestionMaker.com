import { questionTypeWhere } from "@/lib/question-types";
import {
  normalizeQuestionType,
  QUESTION_TYPE_OPTIONS,
} from "@/lib/question-type-options";
import { auth } from "@/auth";
import { visibleQuestions } from "@/lib/paper-generation";
import ChapterSelector from "@/components/chapter-selector";
import "@/components/chapter-selector.css";
import { normalizeTopics, appendFilterParams } from "@/lib/chapter-filter";
import Link from "next/link";
import { db } from "@/lib/db";
import QbPicker from "@/components/qb-picker";

export const dynamic = "force-dynamic";
export const metadata = { title: "প্রশ্ন নির্বাচন" };

type SP = {
  append?: string;
  questionType?: string;
  category?: string;
  subject?: string;
  topic?: string | string[];
  q?: string;
  page?: string;
};
const PER_PAGE = 50;

// 🎯 ক্লাসের সব সম্ভাব্য নাম একসঙ্গে মেলানো (যেমন "8" আর "Class 8" দুটোই)
// ডাটাবেসের কিছু বদলায় না, শুধু খোঁজার সময় কাজ করে
function categoryAliases(key: string): string[] {
  if (!key) return [];
  const set = new Set<string>([key]);

  if (/^[1-9]$|^1[0-2]$/.test(key)) {
    set.add(`Class ${key}`);
  }

  const m = key.match(/^Class\s*(\d+)$/i);
  if (m) {
    set.add(m[1]);
    set.add(`Class ${m[1]}`);
  }

  if (key === "SSC") {
    ["Class 9", "Class 10", "Class 9-10", "9", "10"].forEach((v) => set.add(v));
  }
  if (key === "HSC") {
    ["Class 11-12", "Class 11", "Class 12", "11", "12"].forEach((v) =>
      set.add(v),
    );
  }
  if (key === "Class 9" || key === "Class 10" || key === "Class 9-10") {
    set.add("SSC");
  }
  if (key === "Class 11-12" || key === "Class 11" || key === "Class 12") {
    set.add("HSC");
  }

  return Array.from(set);
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const user = (await auth())?.user;
  const category = sp.category ?? "";
  const subject = sp.subject ?? "";
  const selectedTopics = normalizeTopics(sp.topic);
  const questionType = normalizeQuestionType(sp.questionType);
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const cats = categoryAliases(category);

  const where = {
    AND: [questionTypeWhere(questionType)],
    ...visibleQuestions(user?.id),
    ...(category ? { category: { in: cats } } : {}),
    ...(subject ? { subject } : {}),
    ...(selectedTopics.length ? { topic: { in: selectedTopics } } : {}),
    ...(q ? { text: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [rows, total, topicRows] = await Promise.all([
    db.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.question.count({ where }),
    db.question.findMany({
      where: {
        ...visibleQuestions(user?.id),
        ...(category ? { category: { in: cats } } : {}),
        ...(subject ? { subject } : {}),
      },
      select: { topic: true },
      distinct: ["topic"],
    }),
  ]);

  const topics = topicRows.map((t) => t.topic).filter(Boolean);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const href = (o: Partial<SP>) => {
    const m: SP = {
      category,
      subject,
      questionType,
      topic: selectedTopics,
      q,
      append: sp.append === "1" ? "1" : undefined,
      ...o,
    };
    const p = new URLSearchParams();
    appendFilterParams(p, m);
    return `?${p.toString()}`;
  };

  const items = rows.map((r) => {
    // 🎯 সঠিকভাবে MCQ, SHORT এবং CQ ডিটেক্ট করার লজিক
    let itemType = "MCQ";
    const opts = (r.options as any) || {};

    if (!r.correct) {
      // যদি অপশনে উদ্দীপক বা ক/খ/গ/ঘ থাকে, তবেই সেটি CQ, অন্যথায় SHORT
      const isCq =
        opts.stimulus ||
        opts.k ||
        opts.ক ||
        opts.subQuestions ||
        (r.text && r.text.includes("(ক)"));
      itemType = isCq ? "CQ" : "SHORT";
    }

    return {
      id: r.id,
      text: r.text,
      options: opts,
      correct: r.correct,
      explanation: r.explanation,
      category: r.category,
      subject: r.subject,
      topic: r.topic,
      source: r.source.startsWith("AI_PENDING:")
        ? r.approved
          ? "AI"
          : "AI — অনুমোদনের অপেক্ষায়"
        : r.source,
      type: itemType, // 🎯 এখানে টাইপটি পাস করা হলো
      stimulus: opts.stimulus || "",
      subQuestions: itemType === "CQ" ? opts : undefined,
    };
  });

  const input =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/question-builder" className="text-sm text-blue-700">
        ‹ Back
      </Link>
      <h1 className="mt-2 text-xl font-bold">
        {[category, subject].filter(Boolean).join(" · ") || "সব প্রশ্ন"}
      </h1>

      <form method="get" className="mt-4 grid gap-2">
        {sp.append === "1" && <input type="hidden" name="append" value="1" />}
        <label>
          প্রশ্নের ধরন
          <select name="questionType" defaultValue={questionType}>
            {QUESTION_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="subject" value={subject} />
        <ChapterSelector
          key={selectedTopics.join("\u0000")}
          topics={topics}
          defaultValue={selectedTopics}
        />
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="এখানে খুঁজুন"
            className={input}
          />
          <button className="rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white">
            খুঁজুন
          </button>
        </div>
      </form>

      <p className="mt-4 text-sm font-bold">
        মোট {total ? (page - 1) * PER_PAGE + 1 : 0} -{" "}
        {Math.min(page * PER_PAGE, total)} টি প্রশ্ন (মোট {total})
      </p>

      <QbPicker items={items} append={sp.append === "1"} />

      <nav
        aria-label="Pagination"
        className="my-8 flex items-center justify-center gap-4 text-sm"
      >
        {page > 1 && (
          <Link
            href={href({ page: String(page - 1) })}
            className="rounded-lg border px-3 py-2"
          >
            ‹ Prev
          </Link>
        )}
        <span>
          {page} / {pages}
        </span>
        {page < pages && (
          <Link
            href={href({ page: String(page + 1) })}
            className="rounded-lg border px-3 py-2"
          >
            Next ›
          </Link>
        )}
      </nav>
    </main>
  );
}
// ===== ফাইল শেষ =====
