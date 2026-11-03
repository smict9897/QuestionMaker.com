import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL ?? "https://saifulsir.com").replace(/\/$/, "");

  const [posts, cats, pages] = await Promise.all([
    db.post.findMany({
      where: { published: true },
      select: { id: true, slug: true, createdAt: true, tags: true },
    }).catch(() => []),
    db.category.findMany({ select: { slug: true } }).catch(() => []),
    db.page.findMany({ select: { slug: true, updatedAt: true } }).catch(() => []),
  ]);

  const tags = Array.from(new Set(posts.flatMap((p) => p.tags)));

  const fixed = [
    "",
    "/academic",
    "/admission",
    "/ntrca",
    "/jobs",
    "/quiz",
    "/library",
    "/videos",
    "/tests",
    "/blog",
    "/hire",
    "/privacy",
    "/terms",
    "/tools",
    "/tools/gpa",
    "/tools/nu-cgpa",
    "/tools/cover-page",
    "/tools/photo-resizer",
  ];

  return [
    ...fixed.map((p) => ({
      url: `${base}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
    })),
    ...cats.map((c) => ({
      url: `${base}/category/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...pages.map((p) => ({
      url: `${base}/p/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...tags.map((t) => ({
      url: `${base}/tag/${encodeURIComponent(t)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug ?? p.id}`,
      lastModified: p.createdAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
