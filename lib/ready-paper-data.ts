import { db } from "@/lib/db";
import { READY_PREFIX, parseReady } from "./ready-papers";
export async function readyLibrary(admin = false, excludeSubmissions = false) {
  const rows = await db.setting.findMany({
    where: {
      key: { startsWith: READY_PREFIX },
      ...(!admin ? { value: { contains: '"published":true' } } : {}),
      ...(excludeSubmissions
        ? { NOT: { value: { contains: '"ownerId":' } } }
        : {}),
    },
    take: 200,
    orderBy: { key: "asc" },
  });
  return rows
    .flatMap((r) => {
      const paper = parseReady(r.value);
      return paper &&
        !paper.deletedAt &&
        (admin ||
          (paper.published &&
            (!paper.ownerId || paper.moderation === "approved")))
        ? [paper]
        : [];
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}
