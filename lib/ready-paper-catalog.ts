import { NCTB_CLASSES } from "./nctb-data";

// Only names cross the server/client boundary, never chapter data.
export const readyPaperCatalog = [
  { grade: "JSC", source: "Class 8" },
  { grade: "SSC", source: "Class 9" },
  { grade: "HSC", source: "Class 11-12" },
].map(({ grade, source }) => ({
  grade,
  subjects: [
    ...new Set(
      NCTB_CLASSES.find((c) => c.class === source)?.subjects.map(
        (s) => s.name,
      ) || [],
    ),
  ],
}));
export function readyGrade(value: string) {
  const aliases: Record<string, string> = {
    "Class 8": "JSC",
    "8": "JSC",
    "Class 9": "SSC",
    "Class 10": "SSC",
    "9": "SSC",
    "10": "SSC",
    "Class 11-12": "HSC",
    "Class 11": "HSC",
    "Class 12": "HSC",
  };
  return aliases[value] || value;
}
export function validReadyPair(grade: string, subject: string) {
  return readyPaperCatalog.some(
    (c) => c.grade === grade && c.subjects.includes(subject),
  );
}
