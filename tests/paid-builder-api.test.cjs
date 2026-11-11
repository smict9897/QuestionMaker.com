const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
function harness(user, paid) {
  let reads = 0,
    checks = 0;
  const m = new Module("gate-api", module);
  m.require = (n) =>
    ({
      "@/auth": { auth: async () => ({ user }) },
      "@/lib/wallet": {
        requirePaidQuestions: async (id, ids) => {
          checks++;
          assert.equal(id, "u");
          assert.deepEqual(ids, ["q"]);
          if (!paid) throw Error("unpaid");
        },
      },
      "@/lib/paper-generation": {
        visibleQuestions: () => ({ approved: true }),
      },
      "@/lib/db": {
        db: {
          question: {
            findMany: async () => {
              reads++;
              return [];
            },
          },
        },
      },
      "next/server": {
        NextResponse: {
          json: (data, opts) => ({ data, status: opts?.status || 200 }),
        },
      },
    })[n] || require(n);
  m._compile(
    ts.transpileModule(
      fs.readFileSync("app/api/qb/questions/route.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    "gate-api.js",
  );
  return {
    post: () => m.exports.POST({ json: async () => ({ ids: ["q"] }) }),
    get reads() {
      return reads;
    },
    get checks() {
      return checks;
    },
  };
}
test("direct builder data request denies anonymous and unpaid before returning editor content", async () => {
  for (const [user, expected] of [
    [null, 401],
    [{ id: "u" }, 402],
  ]) {
    const h = harness(user, false);
    assert.equal((await h.post()).status, expected);
    assert.equal(h.reads, 0);
  }
});
test("paid/package/admin server authorization is required even for manually posted IDs", async () => {
  const h = harness({ id: "u" }, true);
  assert.equal((await h.post()).status, 200);
  assert.equal(h.checks, 1);
  assert.equal(h.reads, 1);
});
