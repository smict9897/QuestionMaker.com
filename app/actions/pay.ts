"use server";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  resourceCheckoutAvailable,
  resourcePaymentOrigin,
  resourceGatewayDestination,
} from "@/lib/resource-checkout";
import { sslHost } from "@/lib/ssl";

export async function buy(resourceId: string): Promise<void> {
  const s = await auth();
  if (!s?.user?.id) redirect("/login");
  const r = await db.resource.findUnique({ where: { id: resourceId } });
  if (!r || r.priceBdt <= 0) redirect("/library");
  if (!resourceCheckoutAvailable(r)) redirect("/library?error=unavailable");
  const tran = randomUUID(),
    base = resourcePaymentOrigin()!;
  await db.purchase.create({
    data: { id: tran, userId: s.user.id, resourceId, amount: r.priceBdt },
  });
  const res = await fetch(`${sslHost()}/gwprocess/v4/api.php`, {
    method: "POST",
    body: new URLSearchParams({
      store_id: process.env.SSLCZ_STORE_ID!,
      store_passwd: process.env.SSLCZ_STORE_PASS!,
      total_amount: String(r.priceBdt),
      currency: "BDT",
      tran_id: tran,
      success_url: `${base}/api/pay/success`,
      fail_url: `${base}/api/pay/fail`,
      cancel_url: `${base}/api/pay/cancel`,
      cus_name: s.user.name ?? "Student",
      cus_email: s.user.email ?? "",
      cus_add1: "Bangladesh",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      cus_phone: "01700000000",
      shipping_method: "NO",
      product_name: r.title,
      product_category: "Study material",
      product_profile: "non-physical-goods",
    }),
  });
  const j = (await res.json().catch(() => null)) as {
    GatewayPageURL?: string;
  } | null;
  if (!j?.GatewayPageURL) redirect("/library?error=payment");
  let destination: string;
  try {
    destination = resourceGatewayDestination(j.GatewayPageURL, sslHost());
  } catch {
    redirect("/library?error=payment");
  }
  redirect(destination);
}
