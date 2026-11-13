"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReadyPaper } from "@/lib/ready-papers";
import { deleteReadyPaper } from "@/app/actions/ready-papers";
import {
  reviewReadySubmission,
  reviseReadySubmission,
} from "@/app/actions/ready-submissions";
import ReadyClassSubject, { type ReadyCatalog } from "./class-subject";
const labels = {
  pending: "অনুমোদনের অপেক্ষায়",
  approved: "অনুমোদিত ও প্রকাশিত",
  changes: "সংশোধন প্রয়োজন",
  rejected: "প্রত্যাখ্যাত",
};
export default function Submissions({
  papers,
  catalog,
  admin = false,
}: {
  papers: ReadyPaper[];
  catalog: ReadyCatalog;
  admin?: boolean;
}) {
  const [filter, setFilter] = useState(admin ? "pending" : "all");
  const rows = papers.filter(
    (p) => filter === "all" || p.moderation === filter,
  );
  return (
    <section className="rp-panel rp-submissions">
      <div className="rp-submission-heading">
        <div>
          <span className="rp-tag">{admin ? "REVIEW DESK" : "MY UPLOADS"}</span>
          <h2>{admin ? "ইউজারের জমা দেওয়া PDF" : "আমার আপলোড"}</h2>
        </div>
        <select
          aria-label="অনুমোদনের অবস্থা"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">সব অবস্থা</option>
          {Object.entries(labels).map(([key, label]) => (
            <option key={key} value={key}>
              {label} ({papers.filter((p) => p.moderation === key).length})
            </option>
          ))}
        </select>
      </div>
      <p className="rp-muted">
        {admin
          ? "আগে PDF ও প্রতিটি পার্ট পরীক্ষা করুন। সিদ্ধান্ত শুধু নির্বাচিত পার্টে প্রযোজ্য; অন্য পার্ট স্বয়ংক্রিয়ভাবে প্রকাশ হবে না।"
          : "অনুমোদনের অপেক্ষাতেও নিজের PDF ব্যবহার করতে পারবেন। পৃষ্ঠা বাছাই, মূল্য ও পেমেন্ট আগের নিয়মে। অনুমোদিত হলেই সবার লাইব্রেরিতে প্রকাশ হবে।"}
      </p>
      {!rows.length && <p>এই অবস্থায় কোনো PDF নেই।</p>}
      {rows.map((p) => (
        <Submission
          key={p.id + ":" + p.at + ":" + p.moderation + ":" + p.reviewedAt}
          paper={p}
          catalog={catalog}
          admin={admin}
        />
      ))}
    </section>
  );
}
function Submission({
  paper: p,
  catalog,
  admin,
}: {
  paper: ReadyPaper;
  catalog: ReadyCatalog;
  admin: boolean;
}) {
  const [opened, setOpened] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function review(
    decision: "approved" | "changes" | "rejected",
    form: HTMLFormElement,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await reviewReadySubmission({
        id: p.id,
        revision: `${p.at}:${p.reviewedAt || ""}`,
        decision,
        reviewed: opened && confirmed,
        note: String(new FormData(form).get("note") || ""),
      });
      setMessage(r.ok ? "সিদ্ধান্ত সংরক্ষিত।" : r.error);
      if (r.ok) router.refresh();
    } catch {
      setMessage("সংরক্ষণ হয়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="rp-submission-card">
      <div className="rp-submission-heading">
        <h3>{p.title}</h3>
        <span
          className={`rp-review-status rp-review-${p.moderation || "pending"}`}
        >
          {labels[p.moderation || "pending"]}
        </span>
      </div>
      <p>
        {p.grade} · {p.subject} · {p.year} · {p.source}
        {p.pageStart && ` · মূল পৃষ্ঠা ${p.pageStart}–${p.pageEnd}`}
      </p>
      {admin && (
        <p className="rp-muted">
          আপলোডকারী: {p.uploaderName || p.ownerId} · ID: {p.ownerId} · জমা:{" "}
          {new Date(p.at).toLocaleString("bn-BD")}
        </p>
      )}
      {p.reviewNote && (
        <p className="rp-review-note">
          <strong>অ্যাডমিনের বার্তা: </strong>
          {p.reviewNote}
        </p>
      )}
      <div className="rp-toolbar">
        <Link href={`/ready-papers/${p.id}${admin ? "?preset=1" : ""}`}>
          {admin ? "Studio Preview ও preset" : "পৃষ্ঠা বাছুন / প্রশ্নপত্র বানান →"}
        </Link>
        {admin && (
          <a
            href={p.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpened(true)}
          >
            মূল PDF খুলে দেখুন ↗
          </a>
        )}
        {admin && (
          <button onClick={() => setOpened((v) => !v)}>
            {opened ? "PDF Preview বন্ধ করুন" : "PDF Preview খুলুন"}
          </button>
        )}
      </div>
      {admin && (
        <button
          className="rp-delete-button"
          disabled={busy}
          onClick={async () => {
            if (
              !window.confirm(
                `“${p.title}” শুধু এই পার্ট তালিকা থেকে সরাবেন? আগে কেনা কপি ও মূল PDF রাখা হবে।`,
              )
            )
              return;
            setBusy(true);
            try {
              const r = await deleteReadyPaper(p.id);
              setMessage(r.ok ? "তালিকা থেকে সরানো হয়েছে।" : r.error);
              if (r.ok) router.refresh();
            } catch {
              setMessage("Delete হয়নি।");
            } finally {
              setBusy(false);
            }
          }}
        >
          Delete
        </button>
      )}
      {admin && opened && (
        <iframe
          title={`${p.title} — review PDF`}
          className="rp-review-pdf"
          src={p.url}
        />
      )}
      {admin ? (
        <form onSubmit={(e) => e.preventDefault()} className="rp-review-form">
          <label>
            মন্তব্য / সংশোধন বা প্রত্যাখ্যানের কারণ
            <textarea
              name="note"
              maxLength={1000}
              defaultValue={p.reviewNote || ""}
            />
          </label>
          <label className="rp-check">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={!opened}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            আমি মূল PDF ও তথ্য পরীক্ষা করেছি
          </label>
          <div className="rp-toolbar">
            <button
              disabled={busy || !opened || !confirmed}
              onClick={(e) => void review("approved", e.currentTarget.form!)}
            >
              ✓ অনুমোদন ও প্রকাশ
            </button>
            <button
              disabled={busy || !opened || !confirmed}
              onClick={(e) => void review("changes", e.currentTarget.form!)}
            >
              সংশোধনের জন্য ফেরত
            </button>
            <button
              disabled={busy || !opened || !confirmed}
              className="rp-delete-button"
              onClick={(e) => void review("rejected", e.currentTarget.form!)}
            >
              প্রত্যাখ্যান
            </button>
          </div>
        </form>
      ) : (
        p.moderation !== "approved" && (
          <details>
            <summary>তথ্য সংশোধন করে আবার জমা দিন</summary>
            <p className="rp-muted">
              ফাইল বদলাতে হলে উপরের ফর্মে নতুন PDF upload করুন। এখানে শুধু এই পার্টের
              তথ্য পরিবর্তন হবে।
            </p>
            <form
              className="rp-review-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                const fd = new FormData(e.currentTarget);
                setBusy(true);
                try {
                  const r = await reviseReadySubmission(p.id, {
                    ...Object.fromEntries(fd),
                    published: false,
                  });
                  setMessage(
                    r.ok ? "সংশোধিত তথ্য আবার অনুমোদনের জন্য জমা হয়েছে।" : r.error,
                  );
                  if (r.ok) router.refresh();
                } catch {
                  setMessage("সংশোধন হয়নি। আবার চেষ্টা করুন।");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="rp-fields">
                <label>
                  শিরোনাম
                  <input
                    name="title"
                    required
                    minLength={3}
                    maxLength={160}
                    defaultValue={p.title}
                  />
                </label>
                <label>
                  বিভাগ
                  <select name="kind" defaultValue={p.kind}>
                    <option value="BOARD">বোর্ড প্রশ্ন</option>
                    <option value="SCHOOL">স্কুলের মডেল টেস্ট</option>
                  </select>
                </label>
                <ReadyClassSubject
                  catalog={catalog}
                  grade={p.grade}
                  subject={p.subject}
                  required
                />
                <label>
                  বছর
                  <input
                    name="year"
                    required
                    type="number"
                    min={2000}
                    max={2099}
                    defaultValue={p.year}
                  />
                </label>
                <label>
                  উৎস
                  <input
                    name="source"
                    required
                    minLength={2}
                    maxLength={160}
                    defaultValue={p.source}
                  />
                </label>
              </div>
              <button disabled={busy}>সংশোধন ও আবার জমা</button>
            </form>
          </details>
        )
      )}
      <p role="status">{message}</p>
    </article>
  );
}
