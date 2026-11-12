import { db } from "@/lib/db";
import { READY_PREFIX, parseReady } from "./ready-papers";
export async function readyLibrary(admin = false) {
  const rows = await db.setting.findMany({
    where: { key: { startsWith: READY_PREFIX } },
    take: 200,
    orderBy: { key: "asc" },
  });
  return rows
    .flatMap((r) => {
      const paper = parseReady(r.value);
      return paper && !paper.deletedAt && (admin || paper.published)
        ? [paper]
        : [];
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}
