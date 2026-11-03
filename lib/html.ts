import sanitizeHtml from "sanitize-html";

export function isHtml(str: string): boolean {
  if (!str) return false;
  const t = str.trim();
  return t.startsWith("<") || /<[a-z][\s\S]*>/i.test(t);
}

// 🎯 কম্পাইলার মোড: কোনো রং বা ডিজাইন কাটবে না
export function renderHtml(html: string): string {
  if (!html) return "";
  return cleanHtml(html);
}

export function bodyToEditorHtml(body: string): string {
  if (!body) return "";
  const trimmed = body.trim();
  const OPEN = '<div class="raw-html not-prose">';
  if (trimmed.startsWith(OPEN)) {
    return trimmed.slice(OPEN.length).replace(/<\/div>\s*$/, "").trim();
  }
  return trimmed;
}

export function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// 🎯 সম্পূর্ণ সিএসএস ও আউটলাইন পারমিশন
export function cleanHtml(dirty: string): string {
  if (!dirty) return "";

  return sanitizeHtml(dirty, {
    allowedTags: false, // 👈 কোনো বৈধ HTML ট্যাগ কাটা হবে না
    allowedAttributes: false, // 👈 সমস্ত style, class, id এবং ইনলাইন সিএসএস ১০০% অক্ষুণ্ণ থাকবে
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "iframe", "object", "embed", "form"], // 👈 শুধুমাত্র হ্যাকিং/স্ক্রিপ্ট ট্যাগ বাদ যাবে
  });
}
