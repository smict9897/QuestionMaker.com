import { z } from "zod";
import type { PaperSettings } from "@/lib/paper-builder";
export const headerFieldDefinitions = [
  ["institute", "Institute Name", "প্রতিষ্ঠানের নাম"],
  ["program", "Program", "পরীক্ষা / প্রোগ্রামের নাম"],
  ["class", "Class/Exam", "শ্রেণি / পরীক্ষা"],
  ["subject", "Subject/Syllabus", "বিষয় / সিলেবাস"],
  ["subjectCode", "Subject Code", "বিষয় কোড"],
  ["setCode", "Set Code", "সেট ক"],
  ["time", "Time", "৩০ মিনিট"],
  ["fullMarks", "Full Marks", "৫০"],
  ["questionType", "Question Type", "বহুনির্বাচনি"],
  ["note", "Note", "বিশেষ দ্রষ্টব্য: সঠিক উত্তরের বৃত্তটি ভরাট করো।"],
  [
    "extraInfo",
    "Extra Info",
    "প্রশ্নপত্রে কোনো প্রকার দাগ/চিহ্ন দেয়া যাবে না।",
  ],
  [
    "addNew",
    "Add New",
    "ব্যাচ, তারিখ, মোবাইল নম্বর, ঠিকানা, ব্র্যান্ডিং ইত্যাদি",
  ],
  [
    "studentName",
    "Student Name",
    "পরীক্ষার্থীর নাম: ................................",
  ],
  ["studentRoll", "Student Roll", "রোল: ................"],
] as const;
export type HeaderKey = (typeof headerFieldDefinitions)[number][0];
const entry = z.object({ enabled: z.boolean(), value: z.string().max(2000) });
const baseFields = Object.fromEntries(
  headerFieldDefinitions.map(([key, , hint]) => [
    key,
    {
      enabled: !["class", "addNew", "studentName", "studentRoll"].includes(key),
      value:
        key === "institute"
          ? "আপনার প্রতিষ্ঠানের নাম"
          : key === "program"
            ? "মডেল টেস্ট"
            : key === "subject"
              ? "বিষয় / সিলেবাস"
              : key === "subjectCode"
                ? "১০১"
                : key === "fullMarks"
                  ? "৫০"
                  : hint,
    },
  ]),
) as Record<HeaderKey, z.infer<typeof entry>>;
export const paperHeaderSchema = z.object({
  enabled: z.boolean().default(false),
  mode: z.enum(["smart", "dynamic"]).default("smart"),
  layout: z.enum(["header", "branded"]).default("header"),
  name: z.string().trim().max(120).default(""),
  templateId: z.string().max(200).default(""),
  branding: z
    .string()
    .max(300)
    .default("নির্ভুল প্রশ্নে হোক শ্রেষ্ঠ প্রস্তুতি"),
  fields: z
    .object(
      Object.fromEntries(
        headerFieldDefinitions.map(([key]) => [key, entry]),
      ) as Record<HeaderKey, typeof entry>,
    )
    .default(baseFields),
});
export type PaperHeaderConfig = z.infer<typeof paperHeaderSchema>;
export const newHeader = () => paperHeaderSchema.parse({});
const maps = {
  institute: ["inst", "title"],
  program: ["exam", "exam"],
  class: ["cls", "cls"],
  subject: ["subject", "subject"],
  subjectCode: ["code", "subjCode"],
  setCode: [null, "setCode"],
  time: ["minutes", null],
  fullMarks: ["marks", null],
  questionType: ["section", null],
  extraInfo: ["instr", "instr"],
} as const;
// Reflect changes made in the existing Page Setup and visibility switches.
export function currentHeader(s: PaperSettings): PaperHeaderConfig {
  const header = structuredClone(s.header);
  if (!header.enabled) return header;
  for (const [key, [info, show]] of Object.entries(maps)) {
    const field = header.fields[key as HeaderKey];
    if (info) field.value = s.info[info];
    if (show) field.enabled = s.show[show];
  }
  return header;
}
export function applyHeader(
  s: PaperSettings,
  header: PaperHeaderConfig,
): PaperSettings {
  const next = {
    ...s,
    info: { ...s.info },
    show: { ...s.show },
    header: { ...header, enabled: true },
  };
  for (const [key, [info, show]] of Object.entries(maps)) {
    const field = header.fields[key as HeaderKey];
    if (info) next.info[info] = field.value;
    if (show) next.show[show] = field.enabled;
  }
  return next;
}
