"use client";
import { useRef } from "react";
export default function RichTextField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function format(tag: string) {
    const node = ref.current;
    if (!node) return;
    const start = node.selectionStart,
      end = node.selectionEnd;
    if (start === end) {
      node.focus();
      return;
    }
    const opening = `[${tag}]`,
      closing = `[/${tag}]`;
    onChange(
      value.slice(0, start) +
        opening +
        value.slice(start, end) +
        closing +
        value.slice(end),
    );
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(start + opening.length, end + opening.length);
    });
  }
  function lines(mode: "bullet" | "number" | "indent" | "outdent") {
    const node = ref.current;
    if (!node) return;
    const start = value.lastIndexOf("\n", node.selectionStart - 1) + 1;
    const after = value.indexOf("\n", node.selectionEnd);
    const end = after < 0 ? value.length : after;
    const text = value
      .slice(start, end)
      .split("\n")
      .map((line, i) =>
        mode === "bullet"
          ? `• ${line}`
          : mode === "number"
            ? `${i + 1}. ${line}`
            : mode === "indent"
              ? `    ${line}`
              : line.replace(/^ {1,4}/, ""),
      )
      .join("\n");
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => node.focus());
  }
  return (
    <div className="rounded-lg border border-emerald-200 bg-white p-2">
      <div
        role="toolbar"
        aria-label={`${label} ফরম্যাটিং`}
        className="mb-2 flex flex-wrap gap-1"
      >
        {(["b", "i", "u", "s"] as const).map((tag) => (
          <button
            type="button"
            key={tag}
            className="studio-choice"
            aria-label={`${label}: ${tag}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format(tag)}
          >
            {tag.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          className="studio-choice"
          onClick={() => lines("bullet")}
        >
          • তালিকা
        </button>
        <button
          type="button"
          className="studio-choice"
          onClick={() => lines("number")}
        >
          ১. তালিকা
        </button>
        <button
          type="button"
          className="studio-choice"
          onClick={() => lines("indent")}
        >
          →
        </button>
        <button
          type="button"
          className="studio-choice"
          onClick={() => lines("outdent")}
        >
          ←
        </button>
      </div>
      <textarea
        ref={ref}
        aria-label={label}
        className="w-full rounded border border-slate-200 p-2 text-sm"
        rows={3}
        maxLength={10000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[10px] text-slate-500">
        শব্দ নির্বাচন করে B/I/U/S চাপুন। চিহ্নগুলো প্রিভিউ/প্রিন্টে ফরম্যাট
        হিসেবে দেখাবে।
      </p>
    </div>
  );
}
