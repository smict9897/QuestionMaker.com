const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
const source = fs.readFileSync("components/home/paper-animation.tsx", "utf8");
function render() {
  const mod = new Module("animation");
  mod.require = (n) => (n.endsWith(".css") ? {} : require(n));
  mod._compile(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    "animation.js",
  );
  return require("react-dom/server").renderToStaticMarkup(
    require("react").createElement(mod.exports.default),
  );
}
test("homepage demo uses requested institution and labels itself as an animation", () => {
  const html = render();
  assert.match(html.replace(/<[^>]+>/g, ""), /শরৎচন্দ্র নন্দলাল পাবলিক উচ্চ বিদ্যালয় ও কলেজ/);
  assert.match(html, /ডেমো অ্যানিমেশন/);
  assert.match(html, /মাতৃভাষা/);
});
test("demo includes exactly fifteen short questions followed by creative stage", () => {
  const ast = ts.createSourceFile(
    "animation.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let count;
  function walk(node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(ast) === "shortQuestions"
    )
      count = node.initializer.elements.length;
    ts.forEachChild(node, walk);
  }
  walk(ast);
  assert.equal(count, 15);
  assert.match(source, /frame >= 23/);
  assert.match(source, /creativeQuestions.slice\(0, count\)/);
});
test("animation respects reduced motion, pauses outside viewport and cleans up timers", () => {
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /!active \|\| reduced/);
  assert.match(source, /!document.hidden/);
  assert.match(source, /clearInterval/);
  assert.match(source, /observer.disconnect/);
  assert.doesNotMatch(source, /\bfetch\s*\(|localStorage|savePaper/);
});
test("demo appears immediately after entry cards and before bank statistics", () => {
  const page = fs.readFileSync("app/page.tsx", "utf8");
  assert.ok(page.indexOf("<CreationPaths") < page.indexOf("<PaperAnimation"));
  assert.ok(page.indexOf("<HomeStats") < page.indexOf("<HomeStarter"));
  assert.ok(page.indexOf("<PaperAnimation") < page.indexOf("<HomeStats"));
});

test("demo sheet and headings use Kalpurush without altering actual paper font choices", () => {
  const css = fs.readFileSync("components/home/paper-animation.css", "utf8");
  const ui = fs.readFileSync("components/ui-typography.css", "utf8");
  assert.match(css, /font-family: "QmPaperKalpurush"/);
  assert.match(ui, /\.paper-demo-sheet :is\(h1, h2, h3\)\s*\{\s*font-family: "QmPaperKalpurush"/);
  assert.match(fs.readFileSync("app/globals.css", "utf8"), /font-family: 'QmPaperKalpurush'/);
  assert.ok(fs.existsSync("public/fonts/Kalpurush.woff2"));
});

test("demo school emblem has founding year and an accessible sample label", () => {
  const html = render();
  assert.match(html, /প্রতিষ্ঠিত ১৯৬৩/);
  assert.match(html, /নমুনা বিদ্যালয় লোগো/);
  assert.match(html, /paper-demo-school/);
  assert.doesNotMatch(html, /S.N.P High School/);
});

test("compact demo header omits student fields and keeps school ending together",()=>{
 const html=render();
 assert.doesNotMatch(html,/শিক্ষার্থীর নাম|রোল:/);
 assert.match(html,/<span class="paper-demo-school-ending">উচ্চ বিদ্যালয় ও কলেজ<\/span>/);
 const css=fs.readFileSync("components/home/paper-animation.css","utf8");
 assert.match(css,/paper-demo-school-ending[^}]*white-space:nowrap/);
 assert.match(css,/paper-demo-meta[^}]*border-bottom:1px solid/);
});
