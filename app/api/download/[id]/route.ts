import {
  RESOURCE_PRIVATE_PREFIX,
  privateResourceMarker,
  readPrivateResource,
} from "@/lib/resource-vault";
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
  if (r.fileUrl.startsWith(RESOURCE_PRIVATE_PREFIX)) {
    const uid = (await auth())?.user?.id;
    if (!uid && r.priceBdt > 0)
      return new NextResponse("Unauthorized", { status: 401, headers });
    if (r.fileUrl !== privateResourceMarker(r.id))
      return new NextResponse("Unavailable", { status: 503, headers });
    if (req.headers.has("range"))
      return new NextResponse("Range not supported", { status: 416, headers });
    try {
      const bytes = await readPrivateResource(uid || null, r.id);
      await db.resource.update({
        where: { id: r.id },
        data: { downloads: { increment: 1 } },
      });
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          ...headers,
          "Content-Type": "application/pdf",
          "Content-Disposition":
            'attachment; filename="proshnobook-resource.pdf"',
          "Content-Length": String(bytes.length),
          "Content-Security-Policy": "sandbox; default-src 'none'",
        },
      });
    } catch {
      return new NextResponse("Not found or unavailable", {
        status: 404,
        headers,
      });
    }
  }
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
