"use client";
import RichTextField from "./rich-text-field";
import LogoUpload from "./logo-upload";
import type { PaperSettings } from "@/lib/paper-builder";
import { Toggle } from "./settings";
const input =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm";
export default function LayoutControls({
  s,
  update,
  counts,
}: {
  s: PaperSettings;
  update: (s: PaperSettings) => void;
  counts: { MCQ: number; CQ: number; SHORT: number };
}) {
  const cfg = <K extends keyof PaperSettings["cfg"]>(
    k: K,
    v: PaperSettings["cfg"][K],
  ) => update({ ...s, cfg: { ...s.cfg, [k]: v } });
  const text = (key: keyof PaperSettings["info"], label: string) =>
    ["brandHeader", "brandFooter"].includes(key) ? (
      <RichTextField
        label={label}
        value={s.info[key]}
        onChange={(value) =>
          update({ ...s, info: { ...s.info, [key]: value } })
        }
      />
    ) : (
      <label className="my-2 block text-xs">
        {label}
        <input
          className={input}
          value={
            key === "logo" && s.info.logo.startsWith("data:") ? "" : s.info[key]
          }
          onChange={(e) =>
            update({ ...s, info: { ...s.info, [key]: e.target.value } })
          }
        />
      </label>
    );
  return (
    <>
      <section className="studio-section">
        <h3>Page Setup</h3>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["marginTop", "উপরে"],
              ["marginBottom", "নিচে"],
              ["marginLeft", "বামে"],
              ["marginRight", "ডানে"],
            ] as const
          ).map(([key, label]) => (
            <label className="text-xs" key={key}>
              {label} — {s.cfg[key]}px
              <input
                aria-label={`${label} মার্জিন`}
                className="mt-2 w-full accent-emerald-600"
                type="range"
                min={0}
                max={150}
                value={s.cfg[key]}
                onChange={(e) => cfg(key, +e.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="my-3 flex gap-2">
          {(["portrait", "landscape"] as const).map((o) => (
            <button
              key={o}
              aria-pressed={s.cfg.orientation === o}
              className="studio-choice"
              onClick={() => cfg("orientation", o)}
            >
              {o === "portrait" ? "খাড়া (Portrait)" : "আড়াআড়ি (Landscape)"}
            </button>
          ))}
        </div>
        <label className="block text-xs">
          কলাম গ্যাপ — {s.cfg.columnGap}px
          <input
            aria-label="কলাম গ্যাপ"
            className="w-full accent-emerald-600"
            type="range"
            min={0}
            max={80}
            value={s.cfg.columnGap}
            onChange={(e) => cfg("columnGap", +e.target.value)}
          />
        </label>
        <label className="my-3 block text-xs">
          CQ / সংক্ষিপ্ত প্রশ্নের কলাম
          <select
            className={input}
            value={s.cfg.cqColumns}
            onChange={(e) => cfg("cqColumns", +e.target.value)}
          >
            {[1, 2, 3].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <Toggle
          label="পৃষ্ঠা নম্বর"
          checked={s.show.pageNumbers}
          onChange={(v) =>
            update({ ...s, show: { ...s.show, pageNumbers: v } })
          }
        />
        <label className="block text-xs">
          CQ উপপ্রশ্ন স্টাইল
          <select
            className={input}
            value={s.cfg.cqStyle}
            onChange={(e) =>
              cfg("cqStyle", e.target.value as PaperSettings["cfg"]["cqStyle"])
            }
          >
            <option value="circle">◯ক</option>
            <option value="paren">(ক)</option>
            <option value="dot">ক.</option>
            <option value="close">ক)</option>
          </select>
        </label>
        <Toggle
          label="বুকলেট প্রিন্ট — ভাঁজ করার পৃষ্ঠা ক্রম"
          checked={s.cfg.booklet}
          onChange={(v) => cfg("booklet", v)}
        />
        {s.cfg.booklet && (
          <p className="text-xs text-slate-500">
            প্রিন্টে প্রতি পাশে ২ পৃষ্ঠা; ৪-এর গুণিতকে খালি পৃষ্ঠা যোগ হবে। দুই
            পাশে প্রিন্টে short-edge flip বাছুন। প্রিন্টারের সেটিং পরীক্ষা করুন।
          </p>
        )}
        <Toggle
          label="ডান কলাম থেকে শুরু"
          checked={s.show.rightStart}
          onChange={(v) => update({ ...s, show: { ...s.show, rightStart: v } })}
        />
        <Toggle
          label="উত্তর লেখার অতিরিক্ত শীট"
          checked={s.show.answerSheet}
          onChange={(v) =>
            update({ ...s, show: { ...s.show, answerSheet: v } })
          }
        />
        <Toggle
          label="Auto-fit — এক পাতায় ধরানোর চেষ্টা"
          checked={s.cfg.autoFit}
          onChange={(v) => cfg("autoFit", v)}
        />
        <button
          className="studio-choice mt-3 w-full"
          onClick={() =>
            update({
              ...s,
              cfg: {
                ...s.cfg,
                marginTop: 45,
                marginBottom: 45,
                marginLeft: 45,
                marginRight: 45,
                columnGap: 20,
                fontSize: 14,
              },
            })
          }
        >
          মার্জিন ও ফন্ট রিসেট
        </button>
      </section>
      <section className="studio-section">
        <h3>হেডার ও সংযুক্তির লেখা</h3>
        {text("code", "বিষয় কোড")}
        {text("exam", "প্রোগ্রাম / পরীক্ষার নাম")}
        {text("instructor", "ইন্সট্রাক্টরের তথ্য")}
        {text("instr", "নির্দেশনা")}
        {text("marks", "পূর্ণমান")}
        {text("minutes", "সময়")}
        {text("cls", "শ্রেণি")}
        {text("subject", "বিষয়")}
        {text("chapter", "অধ্যায়")}
      </section>
      <section className="studio-section">
        <h3>স্ট্যান্ডার্ড চেকার</h3>
        <Toggle
          label="নির্বাচিত প্রশ্নসংখ্যা যাচাই"
          checked={s.show.standardCheck}
          onChange={(v) =>
            update({ ...s, show: { ...s.show, standardCheck: v } })
          }
        />
        {s.show.standardCheck && (
          <>
            <p className="text-xs text-slate-500">
              নিজের চাহিদা অনুযায়ী সংখ্যা দিন। এটি কোনো বোর্ডের অনুমোদিত
              মানবণ্টন নয়। ০ দিলে সেই ধরন যাচাই হবে না।
            </p>
            {(["MCQ", "CQ", "SHORT"] as const).map((type) => {
              const key = `expected${type}` as
                "expectedMCQ" | "expectedCQ" | "expectedSHORT";
              return (
                <label key={type} className="my-2 block text-xs">
                  {type} — আছে {counts[type]}টি
                  <input
                    type="number"
                    min={0}
                    max={300}
                    aria-label={`${type} প্রত্যাশিত সংখ্যা`}
                    className={input}
                    value={s.cfg[key]}
                    onChange={(e) =>
                      cfg(key, Math.max(0, Math.min(300, +e.target.value)))
                    }
                  />
                  <span
                    className={
                      s.cfg[key] && counts[type] !== s.cfg[key]
                        ? "text-red-600"
                        : "text-emerald-700"
                    }
                  >
                    {!s.cfg[key]
                      ? "যাচাই বন্ধ"
                      : counts[type] === s.cfg[key]
                        ? "✓ ঠিক আছে"
                        : `প্রয়োজন ${s.cfg[key]} / আছে ${counts[type]}`}
                  </span>
                </label>
              );
            })}
          </>
        )}
      </section>
      <section className="studio-section">
        <h3>অতিরিক্ত ব্র্যান্ডিং</h3>
        <LogoUpload
          onChange={(logo) =>
            update({
              ...s,
              show: { ...s.show, logo: true },
              info: { ...s.info, logo },
            })
          }
        />
        {(["logo", "brandHeader", "brandFooter"] as const).map((key, i) => (
          <div key={key}>
            <Toggle
              label={["লোগো", "হেডার ব্যানার", "ফুটার"][i]}
              checked={s.show[key]}
              onChange={(v) => update({ ...s, show: { ...s.show, [key]: v } })}
            />
            {s.show[key] &&
              text(key, key === "logo" ? "লোগোর HTTPS ছবির URL" : "লেখা")}
          </div>
        ))}
      </section>
    </>
  );
}
