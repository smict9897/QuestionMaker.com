const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module"),
  React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server");
const brand = require("./helpers/brand.cjs");
function load(file, mocks = {}) {
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (n) =>
    n === "@/lib/brand"
      ? brand
      : n.endsWith(".css")
        ? {}
        : mocks[n] || require(n);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
test("display aliases normalize without rewriting custom names or operational origin", () => {
  for (const name of [
    undefined,
    " QuestionMakerBd.com ",
    "SaifulSir.com",
    "প্রশ্নোদয়",
  ])
    assert.equal(brand.displaySiteName(name), "প্রশ্নবুক.কম");
  assert.equal(brand.displaySiteName("আমার বিশেষ নাম"), "আমার বিশেষ নাম");
  assert.equal(
    brand.displayTagline("Empowering Assessments with AI"),
    brand.BRAND.tagline,
  );
  assert.equal(
    brand.publicSiteOrigin(),
    "https://question-maker-com-g6ec.vercel.app",
  );
  assert.equal(
    brand.publicSiteOrigin("https://proshnobook.com/path?q=1"),
    "https://proshnobook.com",
  );
  for (const value of [
    "bad",
    "javascript:alert(1)",
    "https://user:secret@example.com",
  ])
    assert.equal(
      brand.publicSiteOrigin(value),
      "https://question-maker-com-g6ec.vercel.app",
    );
});
test("metadata identity normalizes persisted legacy settings read-only, preserving contact/custom content", async () => {
  const rows = [
    { key: "site.name", value: "QuestionMakerBd.com" },
    { key: "site.tagline", value: "Empowering Assessments with AI" },
    { key: "contact.email", value: "existing@example.com" },
    { key: "footer.text", value: "Preserved content" },
  ];
  let reads = 0;
  const site = load("lib/site.ts", {
    "@/lib/db": {
      db: {
        setting: {
          findMany: async () => {
            reads++;
            return rows;
          },
        },
      },
    },
    "@/lib/social": { contact: { email: "", phone: "" }, social: [] },
  });
  const result = await site.getSite();
  assert.equal(result.siteName, brand.BRAND.nameBn);
  assert.equal(result.tagline, brand.BRAND.tagline);
  assert.equal(result.contact.email, "existing@example.com");
  assert.equal(result.footerText, "Preserved content");
  assert.equal(reads, 1);
  assert.equal(rows[0].value, "QuestionMakerBd.com");
});
test("real wordmark, logo, intro and PWA manifest use new identity without old brand", () => {
  for (const file of [
    "components/brand-wordmark.tsx",
    "components/Logo.tsx",
    "components/brand-intro.tsx",
  ]) {
    const Component = load(file).default,
      html = renderToStaticMarkup(React.createElement(Component));
    assert.match(html, /প্রশ্নবুক.কম/);
    assert.doesNotMatch(html, /QuestionMakerBd|SaifulSir/);
  }
  const manifest = load("app/manifest.ts").default();
  assert.match(manifest.name, /Proshnobook/);
  assert.equal(manifest.short_name, "প্রশ্নবুক.কম");
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
});
test("shell surfaces, origin feeds and install prompt share identity without migrating storage/auth", () => {
  for (const file of [
    "components/site-header.tsx",
    "components/site-footer.tsx",
    "components/teacher-workspace.tsx",
    "components/InstallPrompt.tsx",
  ]) {
    const text = fs.readFileSync(file, "utf8");
    assert.match(text, /@\/lib\/brand/);
    assert.doesNotMatch(text, /QuestionMakerBd/);
  }
  assert.match(
    fs.readFileSync("components/InstallPrompt.tsx", "utf8"),
    /saifulsir_install_prompt_v1/,
  );
  for (const file of [
    "app/layout.tsx",
    "app/sitemap.ts",
    "app/robots.ts",
    "app/feed.xml/route.ts",
  ])
    assert.match(fs.readFileSync(file, "utf8"), /publicSiteOrigin/);
  assert.doesNotMatch(
    fs.readFileSync("lib/brand.ts", "utf8"),
    /support@proshnobook/,
  );
});
