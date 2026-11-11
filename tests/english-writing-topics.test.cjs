const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
const m = new Module("writing-topics");
const eight = new Module("class-eight-writing-topics");
eight._compile(
  ts.transpileModule(
    fs.readFileSync("lib/english/class-eight-writing-topics.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  "class-eight.js",
);
m.require = (id) =>
  id === "./class-eight-writing-topics" ? eight.exports : require(id);
m._compile(
  ts.transpileModule(fs.readFileSync("lib/english/writing-topics.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "topics.js",
);
const {
  classSixWritingTopics: data,
  writingTopicSuggestions: get,
  searchWritingTopics: search,
} = m.exports;
test("all supplied class-six headings are present with correct category counts", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
    {
      story: 33,
      "informal-letter": 40,
      "formal-letter": 34,
      "informal-email": 24,
      "formal-email": 16,
      dialogue: 34,
      paragraph: 58,
      composition: 35,
    },
  );
  for (const entries of Object.values(data)) {
    assert.equal(new Set(entries).size, entries.length);
    assert.ok(entries.every((s) => s.trim() && s.length <= 500));
  }
  assert.equal(Object.values(data).flat().length, 274);
});
test("suggestions are isolated by class, paper, selected task and correspondence type", () => {
  for (const g of [7, 9, 10, 11, 12]) assert.deepEqual(get(g, 1, "story"), []);
  assert.equal(get(6, 1, "story").length, 33);
  assert.equal(get(6, 1, "paragraph").length, 58);
  assert.equal(get(6, 1, "dialogue").length, 34);
  assert.deepEqual(get(6, 1, "letter-email", "formal-letter"), []);
  assert.deepEqual(get(6, 2, "paragraph"), []);
  assert.deepEqual(get(6, 2, "letter-email"), []);
  assert.deepEqual(get(6, 2, "letter-email", "invalid"), []);
  assert.equal(get(6, 2, "composition").length, 35);
  for (const choice of [
    "formal-letter",
    "informal-letter",
    "formal-email",
    "informal-email",
  ])
    assert.equal(get(6, 2, "letter-email", choice), data[choice]);
});
test("search is case-insensitive, supports multiple keywords, aliases and no-match custom fallback", () => {
  assert.deepEqual(search(data.composition, " TREE   plantation "), [
    "Tree Plantation",
  ]);
  assert.ok(search(data.story, "tortoise")[0].includes("Hare"));
  assert.ok(search(data.paragraph, "textual nonexistent").length === 0);
  assert.equal(search(data.paragraph, "").length, 58);
  assert.equal(search(data["informal-letter"], "dengue prevention").length, 1);
});

test("class-eight source counts and strict category isolation", () => {
  const data8 = eight.exports.classEightWritingTopics;
  assert.deepEqual(
    Object.fromEntries(Object.entries(data8).map(([k, v]) => [k, v.length])),
    {
      dialogue: 49,
      paragraph: 59,
      story: 34,
      "informal-email": 34,
      "formal-email": 15,
      "informal-letter": 30,
      "formal-letter": 27,
      composition: 33,
    },
  );
  assert.equal(Object.values(data8).flat().length, 281);
  for (const [key, topics] of Object.entries(data8)) {
    assert.equal(new Set(topics).size, topics.length);
    assert.ok(topics.every((t) => t.length > 0 && t.length <= 500));
    const actual = ["story", "paragraph", "dialogue"].includes(key)
      ? get(8, 1, key)
      : key === "composition"
        ? get(8, 2, key)
        : get(8, 2, "letter-email", key);
    assert.equal(actual, topics);
  }
  assert.deepEqual(get(8, 2, "story"), []);
  assert.deepEqual(get(8, 1, "composition"), []);
  assert.deepEqual(get(8, 2, "letter-email"), []);
  assert.equal(
    search(get(8, 2, "composition"), "favourite hobby")[0],
    "Your Favourite Hobby",
  );
  assert.notEqual(get(6, 1, "story"), get(8, 1, "story"));
});
