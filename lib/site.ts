import { cache } from "react";
import { BRAND, displaySiteName, displayTagline } from "@/lib/brand";
import { db } from "@/lib/db";
import { contact as defContact, social as defSocial } from "@/lib/social";

// সাইটের নাম ও ট্যাগলাইন: এক জায়গায় বদলালেই পুরো সাইটে বদলে যাবে।
// Custom admin values remain; known historical brand aliases normalize for display only.
export const identity = {
  siteName: BRAND.nameBn,
  tagline: BRAND.tagline,
};

export const defaults = {
  heroBadge: "প্রশ্নপত্র তৈরি ও লাইভ মডেল টেস্ট",
  heroTitle: "মিনিটেই তৈরি হোক আপনার নিখুঁত প্রশ্নপত্র",
  heroSubtitle:
    "ক্লাস ও বিষয় বেছে নিন, AI সাহায্যে প্রশ্ন তৈরি করুন আর PDF নামান। শিক্ষার্থীরা দিতে পারবে লাইভ মডেল টেস্ট।",
  footerText: "অনলাইনে প্রশ্নপত্র তৈরি, কুইজ ও লাইভ মডেল টেস্টের এক ঠিকানা।",
  metaDescription: BRAND.description,
};

// শুধু এই সাইটের নিজস্ব সেটিং কী পড়া হয় (সেভ করা প্রশ্নপত্রের JSON আর পড়া হয় না)।
const PREFIXES = ["social.", "contact.", "hero.", "footer.", "meta.", "site."];

// অ্যাডমিন প্যানেলে সেভ করা মান জেতে। প্রথম সেভের আগে lib/social.ts ও এই ডিফল্ট ব্যবহার হয়।
export const getSite = cache(async () => {
  const rows = await db.setting
    .findMany({
      where: { OR: PREFIXES.map((p) => ({ key: { startsWith: p } })) },
    })
    .catch(() => []);
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const s = (k: string, d: string) => (m.has(k) ? (m.get(k) as string) : d);
  const text = (k: string, d: string) =>
    m.get(k)?.trim() ? (m.get(k) as string).trim() : d;
  return {
    siteName: displaySiteName(m.get("site.name")),
    tagline: displayTagline(m.get("site.tagline")),
    social: defSocial.map((x) => ({ ...x, url: s(`social.${x.name}`, x.url) })),
    contact: {
      email: s("contact.email", defContact.email),
      phone: s("contact.phone", defContact.phone),
    },
    heroBadge: text("hero.badge", defaults.heroBadge),
    heroTitle: text("hero.title", defaults.heroTitle),
    heroSubtitle: text("hero.subtitle", defaults.heroSubtitle),
    footerText: text("footer.text", defaults.footerText),
    metaDescription: text("meta.description", defaults.metaDescription),
  };
});

// ===== ফাইল শেষ =====
