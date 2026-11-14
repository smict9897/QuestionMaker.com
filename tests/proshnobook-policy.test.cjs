const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  Module = require("node:module"),
  ts = require("typescript"),
  React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server"),
  brand = require("./helpers/brand.cjs");
function load(file, contact = { email: "", phone: "" }) {
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (n) =>
    n === "@/lib/brand"
      ? brand
      : n === "next/link"
        ? ({ href, children, ...p }) =>
            React.createElement("a", { href, ...p }, children)
        : n === "next/navigation"
          ? {
              redirect: (url) => {
                throw Error("redirect:" + url);
              },
              permanentRedirect: (url) => {
                throw Error("permanent:" + url);
              },
            }
          : n === "@/lib/site"
            ? { getSite: async () => ({ contact }) }
            : n.startsWith("@/components/")
              ? load(n.replace("@/", "") + ".tsx", contact)
              : require(n);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
async function html(file, contact) {
  return renderToStaticMarkup(await load(file, contact).default());
}
const pages = [
  "privacy",
  "terms",
  "about-us",
  "contact-us",
  "disclaimer",
  "dmca",
  "cookie-policy",
];
test("public information pages render actual new identity, canonical local policy navigation and stable revision date", async () => {
  for (const name of pages) {
    const s = await html(`app/${name}/page.tsx`);
    assert.match(s, /প্রশ্নবুক/);
    assert.match(s, /2026-11-10/);
    assert.doesNotMatch(
      s,
      /SaifulSir|saifulsir|support@proshnobook|support@saifulsir/,
    );
    for (const href of [
      "/privacy",
      "/terms",
      "/contact-us",
      "/dmca",
      "/cookie-policy",
    ])
      assert.ok(s.includes(`href="${href}"`), name + " " + href);
  }
});
test("financial terms disclose current source/revenue/refund/manual payout rules without pretending PDF resale is live", async () => {
  const s = await html("app/terms/page.tsx");
  for (const pattern of [
    /৬০%/,
    /৳১০০/,
    /মূল টাকা যে উৎস/,
    /অনলাইন কপির অ্যাক্সেস বন্ধ/,
    /ম্যানুয়ালি/,
    /PDF.*এখনও সম্পূর্ণ নয়/,
    /স্বয়ংক্রিয় financial reversal বন্ধ/,
  ])
    assert.match(s, pattern);
  assert.doesNotMatch(
    s,
    /always free|guaranteed refund|৪৮ ঘণ্টা|registered DMCA agent/i,
  );
});
test("privacy describes actual stored data and providers without invented deletion deadlines or universal ad tracking claims", async () => {
  const s = await html("app/privacy/page.tsx");
  for (const pattern of [
    /TrxID/,
    /TID/,
    /Vercel Analytics/,
    /Google/,
    /browser storage/,
    /AI/,
    /স্বয়ংক্রিয় account deletion বোতাম নয়/,
  ])
    assert.match(s, pattern);
  assert.doesNotMatch(
    s,
    /DART|within 45 days|within one month|free for all learners/i,
  );
});
test("empty contact configuration honestly shows missing support rather than inventing channels or form", async () => {
  const s = await html("app/contact-us/page.tsx");
  assert.match(s, /এখনও প্রকাশ করা হয়নি/);
  assert.match(s, /এই পাতা নিজে বার্তা পাঠানোর form নয়/);
  assert.match(s, /href="\/dashboard\/library"/);
  assert.doesNotMatch(s, /mailto:|tel:|<form/);
});
test("published contact values retained; invalid or query-injected contacts not linked", async () => {
  const good = await html("app/contact-us/page.tsx", {
    email: "existing@example.org",
    phone: "+880 1712-345678",
  });
  assert.match(good, /href="mailto:existing@example.org"/);
  assert.match(good, /href="tel:\+8801712345678"/);
  for (const email of [
    "bad",
    "a@example.org?bcc=other",
    "a%0abcc@example.org",
    "a\r\n@example.org",
  ]) {
    const bad = await html("app/contact-us/page.tsx", {
      email,
      phone: "javascript:alert(1)",
    });
    assert.doesNotMatch(bad, /mailto:|tel:/);
  }
});
test("legacy policy aliases resolve to current pages instead of obsolete external domains", () => {
  for (const [from, to] of [
    ["privacy-policy", "privacy"],
    ["terms-conditions", "terms"],
    ["dmca-policy", "dmca"],
  ])
    assert.throws(
      () => load(`app/${from}/page.tsx`).default(),
      new RegExp(`permanent:/${to}`),
    );
  assert.throws(
    () => load("app/contact/page.tsx").default(),
    /redirect:\/contact-us/,
  );
});
module.exports = { html, pages };
