import { auth } from "@/auth";
import { db } from "@/lib/db";
import { READY_PREFIX, parseReady, type ReadyPaper } from "./ready-papers";
export const UPLOAD_INDEX = "readyuploadowner:v1:";
export const REVIEW_INDEX = "readysubmission:v1:";
export async function readyUploadActor() {
  const s = await auth();
  if (!s?.user?.id) throw Error("লগইন করে PDF আপলোড করুন।");
  return {
    id: s.user.id,
    name: s.user.name?.slice(0, 120),
    admin: s.user.role === "ADMIN",
  };
}
export function canManagePending(
  actor: { id: string; admin: boolean },
  p: { ownerId?: string },
) {
  return actor.admin || (!!p.ownerId && p.ownerId === actor.id);
}
export function canReadReady(
  p: ReadyPaper,
  userId: string,
  isAdmin: boolean,
  hasPurchase = false,
) {
  return (
    isAdmin ||
    hasPurchase ||
    (!p.deletedAt &&
      ((p.published && (!p.ownerId || p.moderation === "approved")) ||
        p.ownerId === userId))
  );
}
export async function submittedPapers(ownerId?: string) {
  return (await submissionPage(ownerId)).papers;
}
export async function submissionPage(ownerId?: string, cursor?: string) {
  const prefix = ownerId ? `${UPLOAD_INDEX}${ownerId}:` : REVIEW_INDEX;
  const safeCursor =
    cursor?.startsWith(prefix) && cursor.length < 500 ? cursor : undefined;
  const indexes = await db.setting.findMany({
    where: {
      key: {
        startsWith: prefix,
        ...(safeCursor ? { lt: safeCursor } : {}),
      },
    },
    take: 201,
    orderBy: { key: "desc" },
  });
  const nextCursor = indexes.length > 200 ? indexes[199].key : undefined;
  const keys = indexes.slice(0, 200).flatMap((r) => {
    try {
      const v = JSON.parse(r.value);
      return typeof v.id === "string" ? [READY_PREFIX + v.id] : [];
    } catch {
      return [];
    }
  });
  if (!keys.length) return { papers: [], nextCursor };
  const rows = await db.setting.findMany({
    where: { key: { in: keys } },
    take: 200,
  });
  const papers = rows
    .flatMap((r) => {
      const p = parseReady(r.value);
      return p &&
        !p.deletedAt &&
        p.ownerId &&
        (!ownerId || p.ownerId === ownerId)
        ? [p]
        : [];
    })
    .sort((a, b) => b.at.localeCompare(a.at));
  return { papers, nextCursor };
}
