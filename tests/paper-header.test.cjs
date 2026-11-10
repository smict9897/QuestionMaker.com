const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
function load(path, deps = {}) {
  const mod = new Module(path);
  mod.require = (n) => (n in deps ? deps[n] : require(n));
  mod._compile(
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    path,
  );
  return mod.exports;
}
const lib = load("lib/paper-header.ts");
const builder = load("lib/paper-builder.ts", { "@/lib/paper-header": lib });
const Preview = load("components/paper-builder/header-preview.tsx").default;
test("all fourteen screenshot header fields exist", () =>
  assert.equal(Object.keys(lib.newHeader().fields).length, 14));
test("smart and both dynamic layouts validate", () => {
  for (const [mode, layout] of [
    ["smart", "header"],
    ["dynamic", "header"],
    ["dynamic", "branded"],
  ])
    assert(
      lib.paperHeaderSchema.safeParse({ ...lib.newHeader(), mode, layout })
        .success,
    );
});
test("legacy papers preserve their metadata without enabling custom headers", () => {
  const s = builder.restoreSettings({ info: { inst: "Old School" } });
  assert.equal(s.info.inst, "Old School");
  assert.equal(s.header.enabled, false);
});
test("corrupt header alone cannot discard the rest of a saved paper", () => {
  const s = builder.restoreSettings({
    info: { inst: "Old School" },
    header: { fields: { bad: true } },
  });
  assert.equal(s.info.inst, "Old School");
  assert.equal(s.header.enabled, false);
});
test("applying template syncs metadata and visibility but preserves watermark and questions", () => {
  const s = builder.defaults(),
    h = lib.newHeader();
  s.info.watermark = "Keep";
  s.edits.q = { text: "Keep question" };
  h.fields.institute.value = "My School";
  h.fields.subjectCode.enabled = false;
  const next = lib.applyHeader(s, h);
  assert.equal(next.header.enabled, true);
  assert.equal(next.info.inst, "My School");
  assert.equal(next.show.subjCode, false);
  assert.equal(next.info.watermark, "Keep");
  assert.equal(next.edits.q.text, "Keep question");
  assert.equal(s.info.inst, "");
});
test("legacy setup changes reflect in custom header editor and output", () => {
  const s = lib.applyHeader(builder.defaults(), lib.newHeader());
  s.info.inst = "Updated School";
  s.show.subjCode = false;
  assert.equal(lib.currentHeader(s).fields.institute.value, "Updated School");
  assert.equal(lib.currentHeader(s).fields.subjectCode.enabled, false);
});
test("checkboxes omit disabled fields, student placeholders remain independent", () => {
  const h = lib.newHeader();
  h.fields.institute.value = "Visible school";
  h.fields.program.enabled = false;
  h.fields.program.value = "Hidden program";
  h.fields.studentName.enabled = true;
  h.fields.studentName.value = "Student placeholder";
  h.fields.studentRoll.enabled = false;
  h.fields.studentRoll.value = "Hidden roll";
  const html = renderToStaticMarkup(
    React.createElement(Preview, { header: h }),
  );
  assert(html.includes("Visible school"));
  assert(html.includes("Student placeholder"));
  assert(!html.includes("Hidden program"));
  assert(!html.includes("Hidden roll"));
});
test("branding banner and note box appear only for dynamic Branding+Header", () => {
  const h = {
    ...lib.newHeader(),
    mode: "dynamic",
    layout: "branded",
    branding: "Brand message",
  };
  const branded = renderToStaticMarkup(
    React.createElement(Preview, { header: h }),
  );
  assert(branded.includes("header-branding"));
  assert(branded.includes("header-note-box"));
  assert(branded.includes("Brand message"));
  const plain = renderToStaticMarkup(
    React.createElement(Preview, { header: { ...h, layout: "header" } }),
  );
  assert(!plain.includes("header-branding"));
});
test("user text is escaped instead of interpreted as HTML", () => {
  const h = lib.newHeader();
  h.fields.institute.value = "<img src=x onerror=alert(1)>";
  const html = renderToStaticMarkup(
    React.createElement(Preview, { header: h }),
  );
  assert(!html.includes("<img"));
  assert(html.includes("&lt;img"));
});
test("auto sets use generated set name instead of stale template set", () => {
  const h = lib.newHeader();
  h.fields.setCode.value = "সেট গ";
  const html = renderToStaticMarkup(
    React.createElement(Preview, { header: h, autoSet: true, setName: "খ" }),
  );
  assert(html.includes("সেট: খ"));
  assert(!html.includes("সেট গ"));
});
test("header and layout survive named-paper settings roundtrip", () => {
  const s = builder.defaults();
  s.header = {
    ...lib.newHeader(),
    enabled: true,
    mode: "dynamic",
    layout: "branded",
    name: "Saved Header",
  };
  assert.deepEqual(builder.restoreSettings(JSON.parse(JSON.stringify(s))), s);
});
function actions(userId = "user-1") {
  const rows = new Map();
  const db = {
    setting: {
      findMany: async ({ where }) =>
        [...rows]
          .filter(([k]) => k.startsWith(where.key.startsWith))
          .map(([key, value]) => ({ key, value })),
      findUnique: async ({ where }) =>
        rows.has(where.key)
          ? { key: where.key, value: rows.get(where.key) }
          : null,
      create: async ({ data }) => rows.set(data.key, data.value),
      update: async ({ where, data }) => rows.set(where.key, data.value),
    },
  };
  return {
    rows,
    api: load("app/actions/paper-headers.ts", {
      "@/auth": {
        auth: async () => (userId ? { user: { id: userId } } : null),
      },
      "@/lib/db": { db },
      "@/lib/paper-header": lib,
    }),
  };
}
test("saved headers are account scoped and can be edited", async () => {
  const { rows, api } = actions();
  const saved = await api.savePaperHeader({
    ...lib.newHeader(),
    name: "My Header",
  });
  assert(saved.ok);
  assert([...rows.keys()][0].startsWith("qbheader:user-1:"));
  const edited = await api.savePaperHeader(
    { ...saved.item.header, name: "Renamed" },
    saved.item.id,
  );
  assert(edited.ok);
  const list = await api.listPaperHeaders();
  assert(list.ok);
  assert.equal(list.items[0].header.name, "Renamed");
  assert.equal(rows.size, 1);
});
test("cannot edit another user header or save without authentication/name", async () => {
  const { api } = actions();
  assert.equal(
    (
      await api.savePaperHeader(
        { ...lib.newHeader(), name: "X" },
        "other-users-header",
      )
    ).ok,
    false,
  );
  assert.equal((await api.savePaperHeader(lib.newHeader())).ok, false);
  const unauth = actions(null);
  assert.equal(
    (await unauth.api.savePaperHeader({ ...lib.newHeader(), name: "X" })).ok,
    false,
  );
  assert.equal(unauth.rows.size, 0);
});
