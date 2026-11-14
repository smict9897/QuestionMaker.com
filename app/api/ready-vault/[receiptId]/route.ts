import { auth } from "@/auth";
import { deliverReadyVault } from "@/lib/ready-vault";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy":
    "sandbox; default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
};
export async function GET(
  req: Request,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  const id = (await auth())?.user?.id;
  if (!id) return new Response("Unauthorized", { status: 401, headers });
  const { receiptId } = await params;
  if (!/^[a-f0-9]{64}$/.test(receiptId))
    return new Response("Not found", { status: 404, headers });
  // One bounded full response only; never redirect to storage or reveal provider error text.
  if (req.headers.has("range"))
    return new Response("Range not supported", { status: 416, headers });
  try {
    const bytes = await deliverReadyVault(id, receiptId);
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="proshnobook-source-pages.pdf"',
        "Content-Length": String(bytes.length),
      },
    });
  } catch {
    return new Response("Not found or unavailable", { status: 404, headers });
  }
}
