"use client";
import { useId, useRef, useState } from "react";
import { ChevronDown, List } from "lucide-react";
import ChapterSelector from "@/components/chapter-selector";

/** Always mount checkbox fields, even when collapsed, so GET form submission retains selections. */
export default function HomeChapterDropdown({
  topics,
  value,
  onChange,
  disabled,
}: {
  topics: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false),
    id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div
      className="hm-chapter-dropdown"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          close();
        }
      }}
    >
      <span className="hm-field-caption" id={`${id}-label`}>
        অধ্যায় <small>(ঐচ্ছিক)</small>
      </span>
      <button
        ref={trigger}
        type="button"
        className="hm-dropdown-trigger"
        disabled={disabled}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-expanded={open && !disabled}
        aria-controls={`${id}-options`}
        onClick={() => setOpen((v) => !v)}
      >
        <List aria-hidden="true" size={20} />
        <span id={`${id}-value`}>
          {value.length
            ? `${value.length.toLocaleString("bn-BD")}টি অধ্যায় নির্বাচিত`
            : "অধ্যায় নির্বাচন করুন"}
        </span>
        <ChevronDown
          className={open ? "is-open" : ""}
          aria-hidden="true"
          size={20}
        />
      </button>
      <div
        id={`${id}-options`}
        hidden={!open || disabled}
        className="hm-dropdown-options"
      >
        <ChapterSelector
          topics={topics}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <button type="button" className="hm-chapter-done" onClick={close}>
          নির্বাচন সম্পন্ন
        </button>
      </div>
    </div>
  );
}
