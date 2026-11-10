const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const Module = require("node:module");
const mod = new Module("paper-builder");
const headerMod = new Module("paper-header");
headerMod.require = require;
headerMod._compile(
  ts.transpileModule(fs.readFileSync("lib/paper-header.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "paper-header.js",
);
mod.require = (name) =>
  name === "@/lib/paper-header" ? headerMod.exports : require(name);
mod._compile(
  ts.transpileModule(fs.readFileSync("lib/paper-builder.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "paper-builder.js",
);
const {
  defaults,
  restoreSettings,
  shuffled,
  paginate,
  duplicateIds,
  safeImage,
  bn,
} = mod.exports;
test("safe print defaults: A4, two columns, 2x2 options, no answer leakage", () => {
  const s = defaults();
  assert.equal(s.cfg.paper, "A4");
  assert.equal(s.cfg.cols, 2);
  assert.equal(s.cfg.optCols, 2);
  assert.equal(s.cfg.format, "q");
  assert.equal(s.cfg.ansKey, false);
});
test("legacy settings are migrated with metadata intact", () => {
  const s = restoreSettings({
    info: { inst: "School", minutes: "30" },
    cfg: { format: "qa", cols: 3 },
    show: { setCode: true },
  });
  assert.equal(s.info.inst, "School");
  assert.equal(s.cfg.cols, 3);
  assert.equal(s.cfg.paper, "A4");
  assert.equal(s.show.setCode, true);
});
test("invalid enum and numeric values reset safely", () => {
  const s = restoreSettings({
    cfg: { paper: "BAD", fontSize: 500, cols: -1 },
    show: { divider: "bad" },
  });
  assert.equal(s.cfg.paper, "A4");
  assert.equal(s.cfg.fontSize, 14);
  assert.equal(s.cfg.cols, 2);
  assert.equal(s.show.divider, true);
});
test("edited text, images, custom divisions and set order survive roundtrip", () => {
  const s = defaults();
  s.edits.q = { text: "Changed", options: { A: "one" } };
  s.attachments.q = {
    image: "https://example.com/img.png",
    size: 300,
    division: "A",
    important: true,
  };
  s.seed = 741;
  s.setName = "খ";
  assert.deepEqual(restoreSettings(JSON.parse(JSON.stringify(s))), s);
});
test("shuffling is deterministic and never mutates or drops items", () => {
  const list = [1, 2, 3, 4, 5, 6, 7, 8];
  const a = shuffled(list, 7919);
  assert.deepEqual(a, shuffled(list, 7919));
  assert.deepEqual([...a].sort(), list);
  assert.deepEqual(list, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.notDeepEqual(a, list);
});
test("pagination fills left then right without missing questions", () => {
  assert.deepEqual(paginate([40, 40, 40, 40, 40], 100, 2), [
    [
      [0, 1],
      [2, 3],
    ],
    [[4], []],
  ]);
});
test("oversized questions are retained rather than clipped or dropped", () =>
  assert.deepEqual(paginate([200, 40], 100, 2), [[[0], [1]]]));
test("empty pagination has no blank pages", () =>
  assert.deepEqual(paginate([], 100, 2), []));
test("duplicates normalize whitespace and mark both occurrences", () =>
  assert.deepEqual(
    [
      ...duplicateIds([
        { id: "a", text: "এক  দুই" },
        { id: "b", text: "এক দুই" },
        { id: "c", text: "তিন" },
      ]),
    ],
    ["a", "b"],
  ));
test("only HTTPS images are accepted", () => {
  assert.equal(safeImage("javascript:alert(1)"), "");
  assert.equal(safeImage("http://example.com/x"), "");
  assert.equal(safeImage("https://example.com/x"), "https://example.com/x");
});
test("Bengali numbering preserves padded digits", () =>
  assert.equal(bn("01"), "০১"));

test("Bengali math numerals normalize without changing prose", () => {
  assert.equal(
    mod.exports.preparePaperMath("প্রশ্ন ০১: ১/২ এবং $৩+৪$"),
    "প্রশ্ন ০১: 1/2 এবং $3+4$",
  );
});

test("custom watermark persists when toggled off and back on", () => {
  const s = defaults();
  s.show.watermark = true;
  s.info.watermark = "আমার বিদ্যালয়";
  const restored = restoreSettings(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.info.watermark, "আমার বিদ্যালয়");
  restored.show.watermark = false;
  const disabled = restoreSettings(JSON.parse(JSON.stringify(restored)));
  assert.equal(disabled.info.watermark, "আমার বিদ্যালয়");
});

test("settings panel exposes a labelled watermark input only when enabled", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const panel = new Module("paper-settings");
  panel.require = require;
  panel._compile(
    ts.transpileModule(
      fs.readFileSync("components/paper-builder/settings.tsx", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    ).outputText,
    "paper-settings.js",
  );
  const settings = defaults();
  const props = {
    settings,
    update: () => {},
    edit: false,
    setEdit: () => {},
    open: false,
    onClose: () => {},
    counts: { MCQ: 0, CQ: 0, SHORT: 0 },
    onPrint: () => {},
  };
  assert(
    !renderToStaticMarkup(
      React.createElement(panel.exports.default, props),
    ).includes("জলছাপের নাম / লেখা"),
  );
  settings.show.watermark = true;
  settings.info.watermark = "আমার বিদ্যালয়";
  const html = renderToStaticMarkup(
    React.createElement(panel.exports.default, props),
  );
  assert(html.includes("জলছাপের নাম / লেখা"));
  assert(html.includes('value="আমার বিদ্যালয়"'));
});


test("continuation pages reclaim header space in every column", () => {
  assert.deepEqual(paginate(Array(10).fill(40), 50, 2, 120), [
    [[0], [1]],
    [[2, 3, 4], [5, 6, 7]],
    [[8, 9], []],
  ]);
});
test("single-column continuation pages use full available height", () => {
  assert.deepEqual(paginate([40, 40, 40, 40], 50, 1, 120), [
    [[0]], [[1, 2, 3]],
  ]);
});
test("paper header renders only on first page while remaining measurable", () => {
  const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "../components/paper-builder/preview.tsx"), "utf8");
  assert.match(source, /\{page === 0 && header\}/);
  assert.match(source, /data-measure-header>\{header\}/);
});
