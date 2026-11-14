import { vaultConfigured } from "@/lib/pdf-vault";
export function resourcePaymentOrigin() {
  if (
    !process.env.SSLCZ_STORE_ID?.trim() ||
    !process.env.SSLCZ_STORE_PASS?.trim()
  )
    return null;
  try {
    const u = new URL(process.env.SITE_URL || "");
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return u.origin;
  } catch {
    return null;
  }
}
/** Legacy Resource gateway only. Does not control wallet recharge or marketplace checkout. */
export function resourceCheckoutAvailable(r: {
  id: string;
  priceBdt: number;
  category: string;
  fileUrl: string;
}) {
  return (
    Number.isSafeInteger(r.priceBdt) &&
    r.priceBdt > 0 &&
    !!resourcePaymentOrigin() &&
    (r.category === "Video" ||
      (r.fileUrl === `private-resource:v1:${r.id}` && vaultConfigured()))
  );
}
export function resourceGatewayDestination(raw: unknown, host: string) {
  if (typeof raw !== "string") throw Error("Missing gateway URL");
  const u = new URL(raw);
  if (
    u.protocol !== "https:" ||
    u.hostname !== new URL(host).hostname ||
    u.port ||
    u.username ||
    u.password
  )
    throw Error("Untrusted gateway URL");
  return u.href;
}
