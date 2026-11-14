/** Display identity only. Never use a rebrand to rename receipts, cookies or stored paper keys. */
export const BRAND = {
  nameBn: "প্রশ্নবুক.কম",
  nameEn: "Proshnobook",
  domain: "proshnobook.com",
  tagline: "প্রশ্ন তৈরি, শেয়ার ও প্রস্তুতির বিশ্বস্ত সঙ্গী",
  description:
    "ষষ্ঠ থেকে দ্বাদশ শ্রেণির প্রশ্নপত্র খুঁজুন। শিক্ষক প্রোফাইলে প্রশ্নপত্র তৈরি, অনুমোদিত প্রশ্নপত্র কেনা–বেচা ও নিজের কেনা কপি সংরক্ষণ করুন।",
} as const;
const legacyNames = new Set([
  "questionmakerbd.com",
  "questionmakerbd",
  "questionmaker.com",
  "questionmaker",
  "saifulsir.com",
  "saifulsir",
  "প্রশ্নোদয়",
  "প্রশ্নোদয়",
]);
export function displaySiteName(saved?: string) {
  const name = saved?.trim();
  return !name || legacyNames.has(name.toLowerCase()) ? BRAND.nameBn : name;
}
export function displayTagline(saved?: string) {
  const text = saved?.trim();
  return !text || text === "Empowering Assessments with AI"
    ? BRAND.tagline
    : text;
}
/** Keep the existing operational origin until custom-domain OAuth/callback checks.
 * This is not a redirect and does not change AUTH_URL, OAuth credentials or cookies. */
export function publicSiteOrigin(configured?: string) {
  try {
    const url = new URL(configured || "");
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw Error();
    return url.origin;
  } catch {
    return "https://question-maker-com-g6ec.vercel.app";
  }
}
