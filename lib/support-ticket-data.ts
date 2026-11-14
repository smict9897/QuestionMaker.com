import "server-only";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SUPPORT_PREFIX, parseSupportTicket } from "@/lib/support-tickets";
export async function supportTicketPage(after?: string, admin = false) {
  const userId = (await auth())?.user?.id;
  if (!userId) throw Error("Login required");
  const cursor = after && /^[a-f0-9-]{36}$/.test(after) ? after : undefined;
  return db.$transaction(
    async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!user || (admin && user.role !== "ADMIN")) throw Error("Forbidden");
      const prefix = admin ? SUPPORT_PREFIX : `support:owner:v1:${userId}:`;
      const rows = await tx.setting.findMany({
        where: {
          key: {
            startsWith: prefix,
            ...(cursor ? { gt: prefix + cursor } : {}),
          },
        },
        orderBy: { key: "asc" },
        take: 26,
      });
      const page = rows.slice(0, 25),
        keys = page.map((r) => SUPPORT_PREFIX + r.key.slice(prefix.length));
      const records = admin
        ? page
        : keys.length
          ? await tx.setting.findMany({
              where: { key: { in: keys } },
              take: 25,
            })
          : [];
      const tickets = records.flatMap((row) => {
        try {
          const t = parseSupportTicket(row.key, row.value);
          return admin || t.ownerId === userId ? [t] : [];
        } catch {
          return [];
        }
      });
      return {
        tickets,
        next: rows.length > 25 ? page[24].key.slice(prefix.length) : null,
        invalid: page.length - tickets.length,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
