const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
function load(file, mocks = {}) {
  const mod = new Module(file, module);
  mod.paths = module.paths;
  mod.require = (n) => mocks[n] || require(n);
  mod._compile(
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
  return mod.exports;
}
const filters = load("lib/chapter-filter.ts");
test("chapter filter supports old single links, multiple chapters and all chapters", () => {
  assert.deepEqual(filters.normalizeTopics(undefined), []);
  assert.deepEqual(filters.normalizeTopics("অধ্যায় ১"), ["অধ্যায় ১"]);
  assert.deepEqual(
    filters.normalizeTopics(["অধ্যায় ১", "অধ্যায় ২", "অধ্যায় ১", ""]),
    ["অধ্যায় ১", "অধ্যায় ২"],
  );
});
test("pagination preserves separate Bengali chapter parameters without comma splitting", () => {
  const topics = ["অধ্যায় ১, তথ্য", "অধ্যায় ২"];
  const params = new URLSearchParams();
  filters.appendFilterParams(params, {
    category: "SSC",
    topic: topics,
    page: "2",
  });
  assert.deepEqual(
    new URLSearchParams(params.toString()).getAll("topic"),
    topics,
  );
  assert.equal(params.get("page"), "2");
});
test("chapter selector renders independent checked inputs and native GET names", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const Selector = load("components/chapter-selector.tsx").default;
  const html = renderToStaticMarkup(
    React.createElement(Selector, {
      topics: ["এক", "দুই", "তিন"],
      defaultValue: ["এক", "দুই"],
    }),
  );
  assert.equal((html.match(/name="topic"/g) || []).length, 3);
  assert.equal((html.match(/checked=""/g) || []).length, 2);
  assert.match(html, /২টি অধ্যায় নির্বাচিত/);
});
test("question picker applies OR chapter membership to both rows and count", async () => {
  const calls = [];
  const db = {
    question: {
      findMany: async (args) => {
        calls.push(args);
        return [];
      },
      count: async (args) => {
        calls.push(args);
        return 0;
      },
    },
  };
  const Page = load("app/question-builder/create/page.tsx", {
    "@/lib/question-type-options": load("lib/question-type-options.ts"),
    "@/lib/question-types": load("lib/question-types.ts", {
      "./question-type-options": load("lib/question-type-options.ts"),
    }),
    "@/auth": { auth: async () => null },
    "@/lib/paper-generation": { visibleQuestions: () => ({ approved: true }) },
    "@/lib/db": { db },
    "@/lib/chapter-filter": filters,
    "@/components/chapter-selector": () => null,
    "@/components/chapter-selector.css": {},
    "@/components/qb-picker": () => null,
    "next/link": () => null,
  }).default;
  await Page({
    searchParams: Promise.resolve({
      category: "SSC",
      subject: "ICT",
      topic: ["প্রথম", "দ্বিতীয়"],
      page: "2",
    }),
  });
  assert.deepEqual(calls[0].where.topic, { in: ["প্রথম", "দ্বিতীয়"] });
  assert.deepEqual(calls[1].where.topic, { in: ["প্রথম", "দ্বিতীয়"] });
  assert.equal(calls[0].skip, 50);
  assert.equal(calls[2].where.subject, "ICT");
});
