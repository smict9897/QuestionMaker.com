const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module"),
  path = require("path"),
  { PDFDocument } = require("pdf-lib");
const group = "11111111-1111-4111-8111-111111111111";
const meta = {
  title: "User ICT",
  kind: "SCHOOL",
  grade: "SSC",
  subject: "ICT",
  year: "2026",
  source: "Own School",
  published: true,
};
function setup() {
  const store = new Map();
  let session = { id: "u", role: "STUDENT" },
    bytes,
    queue = Promise.resolve(),
    tokenOptions;
  const setting = {
    findUnique: async ({ where }) =>
      store.has(where.key)
        ? { key: where.key, value: store.get(where.key) }
        : null,
    findMany: async ({ where, take = 200, orderBy }) =>
      [...store]
        .filter(([k]) =>
          where.key.in
            ? where.key.in.includes(k)
            : k.startsWith(where.key.startsWith) &&
              (!where.key.lt || k < where.key.lt),
        )
        .sort(([a], [b]) =>
          orderBy?.key === "desc" ? b.localeCompare(a) : a.localeCompare(b),
        )
        .slice(0, take)
        .map(([key, value]) => ({ key, value })),
    create: async ({ data }) => {
      if (store.has(data.key)) throw Error("duplicate");
      store.set(data.key, data.value);
      return data;
    },
    update: async ({ where, data }) => {
      if (!store.has(where.key)) throw Error("missing");
      store.set(where.key, data.value);
      return data;
    },
    upsert: async ({ where, create, update }) => {
      if (!store.has(where.key)) store.set(where.key, create.value);
      else if (update.value !== undefined) store.set(where.key, update.value);
    },
  };
  const tx = { setting, $queryRaw: async () => {} };
  const db = {
    ...tx,
    $transaction: (fn) => {
      const run = queue.then(async () => {
        const before = new Map(store);
        try {
          return await fn(tx);
        } catch (e) {
          store.clear();
          for (const [k, v] of before) store.set(k, v);
          throw e;
        }
      });
      queue = run.catch(() => {});
      return run;
    },
  };
  class BlobNotFoundError extends Error {}
  const blob = {
    BlobNotFoundError,
    head: async (url) => {
      if (!bytes) throw new BlobNotFoundError();
      return {
        pathname: url.startsWith("https:")
          ? new URL(url).pathname.slice(1)
          : url,
        size: bytes.length,
        contentType: "application/pdf",
        url: url.startsWith("https:")
          ? url
          : "https://test.public.blob.vercel-storage.com/" + url,
      };
    },
  };
  const cache = {};
  function load(file) {
    file = path.normalize(file);
    if (cache[file]) return cache[file];
    const m = new Module(file, module);
    m.paths = module.paths;
    m.require = (n) =>
      n === "@/lib/db"
        ? { db }
        : n === "@/auth"
          ? { auth: async () => (session ? { user: session } : null) }
          : n === "@/lib/guard"
            ? {
                admin: async () => {
                  if (session?.role !== "ADMIN") throw Error("forbidden");
                  return session;
                },
              }
            : n === "@vercel/blob"
              ? blob
              : n === "@vercel/blob/client"
                ? {
                    handleUpload: async (options) => {
                      tokenOptions = options;
                      return {
                        token: await options.onBeforeGenerateToken(
                          options.body.pathname,
                        ),
                      };
                    },
                  }
                : n === "next/cache"
                  ? { revalidatePath: () => {} }
                  : n === "@/lib/ready-paper-catalog"
                    ? { validReadyPair: () => true }
                    : n.startsWith("@/")
                      ? load(n.replace("@/", "") + ".ts")
                      : n.startsWith("./")
                        ? load(path.join(path.dirname(file), n + ".ts"))
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
  const actions = load("app/actions/ready-import.ts"),
    storage = load("lib/ready-part-storage.ts"),
    review = load("app/actions/ready-submissions.ts"),
    model = load("lib/ready-papers.ts"),
    helpers = load("lib/ready-submissions.ts");
  return {
    store,
    load,
    actions,
    storage,
    review,
    helpers,
    model,
    setSession: (s) => (session = s),
    setBytes: (b) => (bytes = b),
    begin: () =>
      actions.beginReadyPart({
        meta,
        groupId: group,
        partIndex: 1,
        start: 1,
        end: 1,
        rights: true,
      }),
    finalize: async (p) => {
      const old = global.fetch;
      global.fetch = async () => new Response(bytes);
      try {
        return await actions.finishReadyPart(
          p.id,
          "https://test.public.blob.vercel-storage.com/" + p.path,
        );
      } finally {
        global.fetch = old;
      }
    },
    token: async (p) => {
      const route = load("app/api/ready-upload/route.ts");
      return route.POST(
        new Request("https://example.test/api/ready-upload", {
          method: "POST",
          body: JSON.stringify({ pathname: p.path }),
        }),
      );
    },
    row: (id) => JSON.parse(store.get(model.READY_PREFIX + id)),
  };
}
async function ready() {
  const s = setup();
  const p = await s.begin();
  const d = await PDFDocument.create();
  d.addPage();
  s.setBytes(await d.save());
  assert.equal((await s.finalize(p)).ok, true);
  return { s, p };
}
test("anonymous blocked; all logged-in roles can submit but cannot self-publish or impersonate owner", async () => {
  const s = setup();
  s.setSession(null);
  await assert.rejects(() => s.begin());
  for (const role of ["STUDENT", "TEACHER", "USER"]) {
    s.setSession({ id: "u", role });
    const p = await s.actions.beginReadyPart({
      meta,
      ownerId: "victim",
      moderation: "approved",
      groupId: group,
      partIndex: 1,
      start: 1,
      end: 1,
      rights: true,
    });
    const pending = JSON.parse(s.store.get("readypartpending:v1:" + p.id));
    assert.equal(pending.ownerId, "u");
    assert.equal(pending.meta.published, false);
    assert.equal(pending.moderation, undefined);
  }
});
test("owner-bound upload token/resume/finalize prevents cross-user access and replacement", async () => {
  const { s, p } = await ready();
  assert.equal((await s.token(p)).status, 400);
  s.setSession({ id: "v", role: "STUDENT" });
  assert.equal((await s.finalize(p)).ok, false);
  await assert.rejects(() => s.actions.resumeReadyPart(p.id));
  assert.equal((await s.token(p)).status, 400);
  const own = await s.begin();
  assert.equal((await s.token(own)).status, 200);
  s.setSession({ id: "u", role: "STUDENT" });
  assert.equal((await s.token(own)).status, 400);
});
test("finalization queues only validated PDF, persists ownership and indexes, remains idempotent", async () => {
  const { s, p } = await ready();
  const r = s.row(p.id);
  assert.equal(r.ownerId, "u");
  assert.equal(r.moderation, "pending");
  assert.equal(r.published, false);
  assert.ok(s.store.has("readyuploadowner:v1:u:" + p.id));
  assert.ok(s.store.has("readysubmission:v1:" + p.id));
  assert.equal((await s.finalize(p)).ok, true);
  assert.equal((await s.helpers.submittedPapers("u")).length, 1);
  assert.equal((await s.helpers.submittedPapers("v")).length, 0);
  const library = s.load("lib/ready-paper-data.ts");
  assert.equal((await library.readyLibrary()).length, 0);
  assert.equal(s.helpers.canReadReady(r, "u", false), true);
  assert.equal(s.helpers.canReadReady(r, "v", false), false);
  assert.equal(s.helpers.canReadReady(r, "a", true), true);
});
test("admin previews then approves; unauthorized and unconfirmed moderation blocked; stale review rejected", async () => {
  const { s, p } = await ready();
  const input = {
    id: p.id,
    decision: "approved",
    note: "",
    reviewed: true,
    revision: s.row(p.id).at + ":",
  };
  await assert.rejects(() => s.review.reviewReadySubmission(input));
  s.setSession({ id: "a", role: "ADMIN" });
  assert.equal(
    (await s.review.reviewReadySubmission({ ...input, reviewed: false })).ok,
    false,
  );
  assert.equal((await s.review.reviewReadySubmission(input)).ok, true);
  assert.equal(s.row(p.id).published, true);
  assert.equal(s.row(p.id).reviewedBy, "a");
  assert.equal(
    (await s.load("lib/ready-paper-data.ts").readyLibrary()).length,
    1,
  );
  assert.equal(
    (
      await s.review.reviewReadySubmission({
        ...input,
        decision: "rejected",
        note: "stale",
      })
    ).ok,
    false,
  );
});
test("reason-required rejection/changes keeps owner access; owner revises but cannot approve", async () => {
  const { s, p } = await ready();
  s.setSession({ id: "a", role: "ADMIN" });
  const revision = s.row(p.id).at + ":";
  assert.equal(
    (
      await s.review.reviewReadySubmission({
        id: p.id,
        decision: "changes",
        note: "",
        reviewed: true,
        revision,
      })
    ).ok,
    false,
  );
  assert.equal(
    (
      await s.review.reviewReadySubmission({
        id: p.id,
        decision: "changes",
        note: "Fix year",
        reviewed: true,
        revision,
      })
    ).ok,
    true,
  );
  assert.equal(s.row(p.id).reviewNote, "Fix year");
  s.setSession({ id: "v", role: "STUDENT" });
  assert.equal((await s.review.reviseReadySubmission(p.id, meta)).ok, false);
  s.setSession({ id: "u", role: "STUDENT" });
  assert.equal(
    (
      await s.review.reviseReadySubmission(p.id, {
        ...meta,
        title: "Corrected paper",
        moderation: "approved",
        ownerId: "v",
      })
    ).ok,
    true,
  );
  assert.equal(s.row(p.id).moderation, "pending");
  assert.equal(s.row(p.id).published, false);
  assert.equal(s.row(p.id).ownerId, "u");
  assert.equal(s.helpers.canReadReady(s.row(p.id), "u", false), true);
});
test("daily non-admin quota is server enforced; session retry does not consume a new slot", async () => {
  const s = setup();
  const quota =
    "readyuploadquota:v1:u:" + new Date().toISOString().slice(0, 10);
  s.store.set(quota, "99");
  const results = await Promise.allSettled([s.begin(), s.begin()]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(s.store.get(quota), "100");
  const p = results.find((r) => r.status === "fulfilled").value;
  await s.actions.resumeReadyPart(p.id);
  assert.equal(s.store.get(quota), "100");
});
test("public access requires approval even if a record erroneously has published=true", async () => {
  const { s, p } = await ready();
  const r = { ...s.row(p.id), published: true };
  s.store.set(s.model.READY_PREFIX + p.id, JSON.stringify(r));
  assert.equal(s.helpers.canReadReady(r, "v", false), false);
  assert.equal(
    (await s.load("lib/ready-paper-data.ts").readyLibrary()).length,
    0,
  );
});

test("submission pagination does not lose older items or cross owner scope", async () => {
  const { s, p } = await ready(),
    record = s.row(p.id);
  for (let i = 0; i < 205; i++) {
    const id = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    s.store.set(s.model.READY_PREFIX + id, JSON.stringify({ ...record, id }));
    s.store.set(`readyuploadowner:v1:u:${id}`, JSON.stringify({ id }));
  }
  const first = await s.helpers.submissionPage("u");
  assert.equal(first.papers.length, 200);
  assert.ok(first.nextCursor);
  const second = await s.helpers.submissionPage("u", first.nextCursor);
  assert.equal(second.papers.length, 6);
  assert.equal(
    new Set([...first.papers, ...second.papers].map((p) => p.id)).size,
    206,
  );
  assert.equal(second.nextCursor, undefined);
  assert.equal(
    (await s.helpers.submissionPage("v", first.nextCursor)).papers.length,
    0,
  );
});
test("pending publication cannot bypass dedicated review through legacy admin metadata action", async () => {
  const { s, p } = await ready();
  s.setSession({ id: "a", role: "ADMIN" });
  const actions = s.load("app/actions/ready-papers.ts");
  assert.equal(
    (await actions.updateReadyPaper(p.id, { ...meta, published: true })).ok,
    false,
  );
  assert.equal(s.row(p.id).published, false);
  const revision = s.row(p.id).at + ":";
  assert.equal(
    (
      await s.review.reviewReadySubmission({
        id: p.id,
        decision: "approved",
        note: "Checked",
        reviewed: true,
        revision,
      })
    ).ok,
    true,
  );
  s.setSession({ id: "u", role: "STUDENT" });
  assert.equal((await s.review.reviseReadySubmission(p.id, meta)).ok, false);
  assert.equal(s.row(p.id).published, true);
});
