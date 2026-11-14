import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resourceDestination } from "@/lib/resource-access";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await db.resource.findUnique({ where: { id: (await params).id } });
  if (!r) return new NextResponse("Not found", { status: 404, headers });
  if (!Number.isSafeInteger(r.priceBdt) || r.priceBdt < 0)
    return new NextResponse("Unavailable", { status: 503, headers });
  if (r.priceBdt > 0) {
    const u = (await auth())?.user;
    if (!u?.id)
      return new NextResponse(null, {
        status: 307,
        headers: { ...headers, Location: new URL("/login", req.url).href },
      });
    // Session roles may be stale. No teacher/student/paid-package role bypass.
    const user = await db.user.findUnique({
      where: { id: u.id },
      select: { role: true },
    });
    if (!user)
      return new NextResponse("Unauthorized", { status: 401, headers });
    const ok =
      user.role === "ADMIN" ||
      (await db.purchase.findFirst({
        where: { userId: u.id, resourceId: r.id, status: "PAID" },
      }));
    if (!ok)
      return new NextResponse("Buy this material first.", {
        status: 402,
        headers,
      });
  }
  let destination: string;
  try {
    destination = resourceDestination(r.fileUrl);
  } catch {
    return new NextResponse("Unavailable", { status: 503, headers });
  }
  await db.resource.update({
    where: { id: r.id },
    data: { downloads: { increment: 1 } },
  });
  return new NextResponse(null, {
    status: 307,
    headers: { ...headers, Location: destination },
  });
}
