const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
function setup() {
  const store = new Map(),
    users = {
      u: { id: "u", role: "TEACHER" },
      v: { id: "v", role: "STUDENT" },
      a: { id: "a", role: "ADMIN" },
      b: { id: "b", role: "ADMIN" },
    };
  let session = "u",
    queue = Promise.resolve(),
    fail = "";
  const tx = {
    user: { findUnique: async ({ where }) => users[where.id] || null },
    $queryRaw: async () => [],
    setting: {
      findUnique: async ({ where }) =>
        store.has(where.key)
          ? { key: where.key, value: store.get(where.key) }
          : null,
      findMany: async ({ where, orderBy, take }) =>
        [...store]
          .filter(([key]) =>
            where.key.in
              ? where.key.in.includes(key)
              : key.startsWith(where.key.startsWith) &&
                (!where.key.gt || key > where.key.gt),
          )
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .slice(0, take)
          .map(([key, value]) => ({ key, value })),
      create: async ({ data }) => {
        if (fail && data.key.startsWith(fail)) throw Error("forced");
        if (store.has(data.key)) throw Error("duplicate");
        store.set(data.key, data.value);
        return data;
      },
      update: async ({ where, data }) => {
        if (fail && where.key.startsWith(fail)) throw Error("forced");
        if (!store.has(where.key)) throw Error("missing");
        store.set(where.key, data.value);
        return data;
      },
    },
  };
  const db = {
    $transaction: (fn) => {
      const r = queue.then(async () => {
        const before = new Map(store);
        try {
          return await fn(tx);
        } catch (e) {
          store.clear();
          for (const [k, v] of before) store.set(k, v);
          throw e;
        }
      });
      queue = r.catch(() => {});
      return r;
    },
  };
  const cache = {};
  function load(file) {
    if (cache[file]) return cache[file];
    const m = new Module(file, module);
    m.paths = module.paths;
    m.require = (n) =>
      n === "server-only"
        ? {}
        : n === "@/auth"
          ? { auth: async () => (session ? { user: users[session] } : null) }
          : n === "@/lib/db"
            ? { db }
            : n === "next/cache"
              ? { revalidatePath: () => {} }
              : n.startsWith("@/")
                ? load(n.slice(2) + ".ts")
                : require(n);
    m._compile(
      ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      file,
    );
    return (cache[file] = m.exports);
  }
  return {
    actions: load("app/actions/support-tickets.ts"),
    data: load("lib/support-ticket-data.ts"),
    model: load("lib/support-tickets.ts"),
    store,
    setSession: (v) => (session = v),
    setRole: (id, role) => (users[id].role = role),
    setFail: (v) => (fail = v),
  };
}
const id = (n) => "11111111-1111-4111-8111-" + String(n).padStart(12, "0");
function form(n = 1, patch = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    id: id(n),
    kind: "GENERAL",
    title: "সাধারণ সহায়তা চাই",
    message: "This is a sufficiently detailed private support request.",
    consent: "on",
    ...patch,
  }))
    f.set(k, v);
  return f;
}
function review(n = 1, patch = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    id: id(n),
    revision: "1",
    reply: "We reviewed your request; please check the details.",
    status: "RESOLVED",
    confirmed: "on",
    ...patch,
  }))
    f.set(k, v);
  return f;
}
test("support create is authenticated/idempotent and owner-only read; no wallet or public content writes", async () => {
  const s = setup();
  s.setSession(null);
  assert.equal((await s.actions.createSupportTicket({}, form())).ok, false);
  s.setSession("u");
  const r = await Promise.all(
    Array.from({ length: 8 }, () => s.actions.createSupportTicket({}, form())),
  );
  assert.ok(r.every((x) => x.ok));
  assert.equal((await s.data.supportTicketPage()).tickets.length, 1);
  assert.equal(
    [...s.store.keys()]
      .filter((k) => k.startsWith("support:rate"))
      .map((k) => s.store.get(k))[0],
    "1",
  );
  s.setSession("v");
  assert.equal((await s.data.supportTicketPage()).tickets.length, 0);
  assert.equal((await s.actions.createSupportTicket({}, form())).ok, false);
  assert.ok([...s.store.keys()].every((k) => k.startsWith("support:")));
});
test("support validation and 5/day rate bound; retries do not consume new quota", async () => {
  const s = setup();
  for (const patch of [
    { kind: "REFUND" },
    { consent: "" },
    { message: "short" },
    { title: "x" },
    { message: "x".repeat(4001) },
  ])
    assert.equal(
      (await s.actions.createSupportTicket({}, form(1, patch))).ok,
      false,
    );
  for (let n = 1; n <= 5; n++)
    assert.equal((await s.actions.createSupportTicket({}, form(n))).ok, true);
  assert.equal((await s.actions.createSupportTicket({}, form(6))).ok, false);
  assert.equal((await s.actions.createSupportTicket({}, form())).ok, true);
  assert.equal(
    (
      await s.actions.createSupportTicket(
        {},
        form(1, { title: "Changed title" }),
      )
    ).ok,
    false,
  );
});
test("ticket/index/rate creation is atomic on index failure", async () => {
  const s = setup();
  s.setFail("support:owner:");
  assert.equal((await s.actions.createSupportTicket({}, form())).ok, false);
  assert.equal(s.store.size, 0);
});
test("fresh ADMIN required to list/reply, including demoted session", async () => {
  const s = setup();
  await s.actions.createSupportTicket({}, form());
  await assert.rejects(() => s.data.supportTicketPage(undefined, true));
  assert.equal((await s.actions.reviewSupportTicket({}, review())).ok, false);
  s.setSession("a");
  assert.equal(
    (await s.data.supportTicketPage(undefined, true)).tickets.length,
    1,
  );
  s.setRole("a", "TEACHER");
  assert.equal((await s.actions.reviewSupportTicket({}, review())).ok, false);
  await assert.rejects(() => s.data.supportTicketPage(undefined, true));
});
test("admin replies append audit and stale concurrent revisions cannot overwrite; response visible to owner", async () => {
  const s = setup();
  await s.actions.createSupportTicket({}, form());
  s.setSession("a");
  const r = await Promise.all(
    Array.from({ length: 8 }, () =>
      s.actions.reviewSupportTicket({}, review()),
    ),
  );
  assert.equal(r.filter((x) => x.ok).length, 1);
  const audits = [...s.store.keys()].filter((k) =>
    k.startsWith("support:audit:"),
  );
  assert.equal(audits.length, 1);
  const audit = JSON.parse(s.store.get(audits[0]));
  assert.equal(audit.previous.status, "OPEN");
  assert.equal(audit.next.status, "RESOLVED");
  s.setSession("u");
  const ticket = (await s.data.supportTicketPage()).tickets[0];
  assert.equal(ticket.revision, 2);
  assert.match(ticket.reply, /reviewed/);
  s.setSession("b");
  assert.equal(
    (
      await s.actions.reviewSupportTicket(
        {},
        review(1, {
          revision: "2",
          status: "OPEN",
          reply: "More verification is now required.",
        }),
      )
    ).ok,
    true,
  );
});
test("audit or ticket write failure rolls back both reply and revision", async () => {
  for (const fail of ["support:audit:", "support:ticket:"]) {
    const s = setup();
    await s.actions.createSupportTicket({}, form());
    const before = new Map(s.store);
    s.setSession("a");
    s.setFail(fail);
    assert.equal((await s.actions.reviewSupportTicket({}, review())).ok, false);
    assert.deepEqual(s.store, before);
  }
});
test("bounded indexed pagination does not skip records or leak forged cross-owner index", async () => {
  const s = setup(),
    now = new Date().toISOString();
  for (let n = 1; n <= 26; n++) {
    const t = {
      version: 1,
      id: id(n),
      ownerId: "u",
      kind: "PRIVACY",
      title: "Privacy request",
      message: "Details of the requested privacy change",
      revision: 1,
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
    };
    s.store.set("support:ticket:v1:" + t.id, JSON.stringify(t));
    s.store.set("support:owner:v1:u:" + t.id, JSON.stringify({ id: t.id }));
  }
  const a = await s.data.supportTicketPage();
  assert.equal(a.tickets.length, 25);
  assert.ok(a.next);
  const b = await s.data.supportTicketPage(a.next);
  assert.equal(b.tickets.length, 1);
  assert.equal(b.next, null);
  s.store.set("support:owner:v1:v:" + id(1), JSON.stringify({ id: id(1) }));
  s.setSession("v");
  const own = await s.data.supportTicketPage();
  assert.equal(own.tickets.length, 0);
  assert.equal(own.invalid, 1);
});
test("support page renders hostile message/reply as escaped text and states no automatic money/deletion action", async () => {
  const React = require("react"),
    { renderToStaticMarkup } = require("react-dom/server");
  const m = new Module("support-page", module);
  m.paths = module.paths;
  m.require = (n) =>
    n === "next/link"
      ? {
          __esModule: true,
          default: ({ href, children, ...p }) =>
            React.createElement("a", { href, ...p }, children),
        }
      : n === "next/navigation"
        ? {
            redirect: () => {
              throw Error("redirect");
            },
          }
        : n === "@/auth"
          ? { auth: async () => ({ user: { id: "u" } }) }
          : n === "@/lib/support-ticket-data"
            ? {
                supportTicketPage: async () => ({
                  tickets: [
                    {
                      id: id(1),
                      title: "<script>alert(1)</script>",
                      kind: "GENERAL",
                      status: "OPEN",
                      updatedAt: "2026-11-10",
                      message: "<img src=x onerror=alert(1)>",
                      reply: "<script>private reply</script>",
                    },
                  ],
                  next: null,
                  invalid: 0,
                }),
              }
            : n === "@/lib/support-tickets"
              ? { supportKinds: { GENERAL: "General" } }
              : n === "@/components/support-ticket-forms"
                ? {
                    NewSupportTicket: () =>
                      React.createElement("div", null, "New ticket form"),
                  }
                : require(n);
  m._compile(
    ts.transpileModule(fs.readFileSync("app/support/page.tsx", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    "support-page",
  );
  const html = renderToStaticMarkup(
    await m.exports.default({ searchParams: Promise.resolve({}) }),
  );
  assert.doesNotMatch(html, /<script|<img/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /ইমেইল\/SMS notification নেই/);
  assert.match(html, /account deletion বা copyright takedown হয় না/);
});
