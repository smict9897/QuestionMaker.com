const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
function compile(file, mocks = {}) {
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (n) => (Object.hasOwn(mocks, n) ? mocks[n] : require(n));
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
const access = compile("lib/resource-access.ts");
function setup() {
  let role = "TEACHER",
    session = { user: { id: "u", role: "ADMIN" } },
    paid = false,
    updates = 0;
  const queries = [];
  const record = {
    id: "r",
    priceBdt: 100,
    fileUrl: "https://files.example/paid.pdf",
  };
  const db = {
    resource: {
      findUnique: async () => record,
      update: async () => {
        updates++;
      },
    },
    user: { findUnique: async () => (role ? { role } : null) },
    purchase: {
      findFirst: async (q) => {
        queries.push(q);
        return paid ? { id: "p" } : null;
      },
    },
  };
  const route = compile("app/api/download/[id]/route.ts", {
    "@/auth": { auth: async () => session },
    "@/lib/db": { db },
    "@/lib/resource-access": access,
    "@/lib/resource-vault": {
      RESOURCE_PRIVATE_PREFIX: "private-resource:v1:",
      privateResourceMarker: (id) => "private-resource:v1:" + id,
      readPrivateResource: async () => {
        throw Error("unavailable");
      },
    },
  });
  return {
    get: () =>
      route.GET(new Request("https://proshnobook.com/api/download/r"), {
        params: Promise.resolve({ id: "r" }),
      }),
    record,
    queries,
    setRole: (r) => (role = r),
    setSession: (s) => (session = s),
    setPaid: (p) => (paid = p),
    count: () => updates,
  };
}
test("teacher/student cannot download paid resource by role, including stale ADMIN session", async () => {
  for (const role of ["TEACHER", "STUDENT"]) {
    const s = setup();
    s.setRole(role);
    const r = await s.get();
    assert.equal(r.status, 402);
    assert.equal(r.headers.get("location"), null);
    assert.equal(s.count(), 0);
    assert.deepEqual(s.queries[0], {
      where: { userId: "u", resourceId: "r", status: "PAID" },
    });
  }
});
test("exact PAID purchase allows ordinary user; fresh ADMIN bypass still works", async () => {
  const s = setup();
  s.setPaid(true);
  const r = await s.get();
  assert.equal(r.status, 307);
  assert.equal(r.headers.get("location"), s.record.fileUrl);
  assert.equal(s.count(), 1);
  assert.match(r.headers.get("cache-control"), /no-store/);
  assert.equal(r.headers.get("vary"), "Cookie");
  const a = setup();
  a.setRole("ADMIN");
  assert.equal((await a.get()).status, 307);
  assert.equal(a.queries.length, 0);
});
test("anonymous and deleted account cannot receive paid file URL or increment downloads", async () => {
  const s = setup();
  s.setSession(null);
  const r = await s.get();
  assert.equal(r.status, 307);
  assert.equal(r.headers.get("location"), "https://proshnobook.com/login");
  assert.equal(s.count(), 0);
  const d = setup();
  d.setRole(null);
  assert.equal((await d.get()).status, 401);
  assert.equal(d.count(), 0);
});
test("free resources remain accessible; unsafe link or corrupt price fails before increment", async () => {
  const s = setup();
  s.setSession(null);
  s.record.priceBdt = 0;
  assert.equal((await s.get()).status, 307);
  for (const link of [
    "javascript:alert(1)",
    "data:text/html,evil",
    "https://user:password@files.example/a",
  ]) {
    const x = setup();
    x.setPaid(true);
    x.record.fileUrl = link;
    assert.equal((await x.get()).status, 503);
    assert.equal(x.count(), 0);
  }
  const c = setup();
  c.record.priceBdt = -1;
  assert.equal((await c.get()).status, 503);
  assert.equal(c.count(), 0);
});
test("public paid video cards never embed or expose source even without login", async () => {
  const React = require("react"),
    { renderToStaticMarkup } = require("react-dom/server");
  const page = compile("app/videos/page.tsx", {
    "@/lib/db": {
      db: {
        resource: {
          findMany: async () => [
            {
              id: "r",
              title: "Paid lesson",
              priceBdt: 100,
              fileUrl: "https://www.youtube.com/watch?v=secret12345",
            },
          ],
        },
      },
    },
    "@/app/actions/pay": { buy: async () => {} },
    "@/auth": { auth: async () => null },
    "@/lib/resource-access": access,
    "@/lib/resource-vault": {
      RESOURCE_PRIVATE_PREFIX: "private-resource:v1:",
      privateResourceMarker: (id) => "private-resource:v1:" + id,
      readPrivateResource: async () => {
        throw Error("unavailable");
      },
    },
    "next/link": {
      __esModule: true,
      default: ({ href, children }) =>
        React.createElement("a", { href }, children),
    },
  });
  const html = renderToStaticMarkup(await page.default());
  assert.doesNotMatch(html, /secret12345|youtube\.com|<iframe/);
  assert.match(html, /\/api\/download\/r/);
});
