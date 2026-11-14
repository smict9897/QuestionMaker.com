import { BRAND, publicSiteOrigin } from "@/lib/brand";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const base = publicSiteOrigin(process.env.SITE_URL);
  const posts = await db.post.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 30 }).catch(() => []);
  const items = posts.map((p) => {
    const link = `${base}/blog/${p.slug ?? p.id}`;
    return `<item><title>${esc(p.title)}</title><link>${esc(link)}</link><guid isPermaLink="true">${esc(link)}</guid><pubDate>${p.createdAt.toUTCString()}</pubDate><description>${esc(p.metaDescription || p.excerpt || p.body.slice(0, 200))}</description>${p.tags.map((t) => `<category>${esc(t)}</category>`).join("")}</item>`;
  }).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(BRAND.nameBn)}</title><link>${esc(base)}</link><description>${esc(BRAND.nameEn)} blog</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
