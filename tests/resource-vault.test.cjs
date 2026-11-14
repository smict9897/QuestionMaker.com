const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  Module = require("node:module"),
  ts = require("typescript"),
  { PDFDocument } = require("pdf-lib");
process.env.PDF_VAULT_KEYS = JSON.stringify({ v1: "11".repeat(32) });
process.env.PDF_VAULT_ACTIVE_KEY = "v1";
process.env.BLOB_READ_WRITE_TOKEN = "test-only-token";
async function setup() {
  const store = new Map(),
    resources = new Map(),
    blobs = new Map(),
    users = {
      u: { id: "u", role: "TEACHER" },
      v: { id: "v", role: "STUDENT" },
      a: { id: "a", role: "ADMIN" },
    },
    paid = new Set(["u:r"]);
  let session = "a",
    queue = Promise.resolve(),
    fail = "",
    hook = null;
  const calls = [];
  const tx = {
    user: { findUnique: async ({ where }) => users[where.id] || null },
    purchase: {
      findFirst: async ({ where }) =>
        paid.has(where.userId + ":" + where.resourceId) &&
        where.status === "PAID"
          ? { id: "paid" }
          : null,
    },
    $queryRaw: async () => [],
    setting: {
      findUnique: async ({ where }) =>
        store.has(where.key)
          ? { key: where.key, value: store.get(where.key) }
          : null,
      create: async ({ data }) => {
        if (fail && data.key.startsWith(fail)) throw Error("forced");
        if (store.has(data.key)) throw Error("duplicate");
        store.set(data.key, data.value);
        return data;
      },
      update: async ({ where, data }) => {
        if (!store.has(where.key)) throw Error("missing");
        store.set(where.key, data.value);
        return data;
      },
    },
    resource: {
      findUnique: async ({ where }) =>
        resources.has(where.id) ? { ...resources.get(where.id) } : null,
      update: async ({ where, data }) => {
        if (fail === "resource") throw Error("forced");
        const r = resources.get(where.id);
        if (!r) throw Error("missing");
        resources.set(where.id, {
          ...r,
          ...data,
          downloads:
            typeof data.downloads === "object" ? r.downloads + 1 : r.downloads,
        });
        return resources.get(where.id);
      },
      create: async ({ data }) => {
        if (resources.has(data.id)) throw Error("duplicate");
        resources.set(data.id, { ...data, downloads: 0 });
        return data;
      },
    },
  };
  const db = {
    ...tx,
    $transaction: (fn) => {
      const r = queue.then(async () => {
        const before = new Map(store),
          old = new Map(resources);
        try {
          return await fn(tx);
        } catch (e) {
          store.clear();
          resources.clear();
          for (const [k, v] of before) store.set(k, v);
          for (const [k, v] of old) resources.set(k, v);
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
        : n === "@/lib/db"
          ? { db }
          : n === "@/auth"
            ? {
                auth: async () =>
                  session ? { user: { id: session, role: "ADMIN" } } : null,
              }
            : n === "@/lib/guard"
              ? { staff: async () => ({ id: session }) }
              : n === "next/cache"
                ? { revalidatePath: () => {} }
                : n === "@vercel/blob"
                  ? {
                      put: async (name, bytes) => {
                        const url =
                          "https://store.public.blob.vercel-storage.com/" +
                          name;
                        blobs.set(url, Buffer.from(bytes));
                        return { url };
                      },
                      del: async (url) => blobs.delete(url),
                    }
                  : n.startsWith("@/")
                    ? load(n.slice(2) + ".ts")
                    : require(n);
    m._compile(
      ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      file,
    );
    return (cache[file] = m.exports);
  }
  const previous = global.fetch;
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    if (hook) await hook(url);
    const bytes = blobs.get(url);
    return bytes
      ? new Response(bytes)
      : new Response("missing", { status: 404 });
  };
  const doc = await PDFDocument.create();
  doc.addPage([200, 300]);
  const bytes = Buffer.from(await doc.save()),
    url = "https://store.public.blob.vercel-storage.com/legacy.pdf";
  blobs.set(url, bytes);
  resources.set("r", {
    id: "r",
    title: "Paid PDF",
    category: "Library",
    priceBdt: 100,
    fileUrl: url,
    downloads: 0,
  });
  return {
    store,
    resources,
    blobs,
    paid,
    bytes,
    url,
    calls,
    vault: load("lib/resource-vault.ts"),
    upload: load("app/actions/resources.ts"),
    manage: load("app/actions/manage.ts"),
    route: load("app/api/download/[id]/route.ts"),
    setSession: (v) => (session = v),
    setRole: (id, role) => (users[id].role = role),
    setFail: (v) => (fail = v),
    setHook: (v) => (hook = v),
    restore: () => (global.fetch = previous),
  };
}
const run = (fn) => async () => {
  const s = await setup();
  try {
    await fn(s);
  } finally {
    s.restore();
  }
};
test(
  "migration encrypts/verifies before switching pointer and keeps original pending separate retirement",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    assert.equal(s.resources.get("r").fileUrl, "private-resource:v1:r");
    const m = JSON.parse(s.store.get("resource-vault:v1:r"));
    assert.equal(s.blobs.get(m.url).subarray(0, 4).toString(), "PBV1");
    assert.ok(s.blobs.has(s.url));
    assert.deepEqual(await s.vault.readPrivateResource("u", "r"), s.bytes);
    assert.equal(
      JSON.parse(s.store.get("resource-vault:migration:v1:r")).originalRetired,
      false,
    );
    const count = s.calls.length;
    await s.vault.migrateResourcePdf("a", "r");
    assert.equal(s.calls.length, count);
  }),
);
test(
  "private delivery has no teacher/stale admin bypass and revocation during IO fails closed",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    await assert.rejects(() => s.vault.readPrivateResource("v", "r"));
    await assert.rejects(() => s.vault.readPrivateResource(null, "r"));
    s.setHook((url) => {
      if (url.includes("/pdf-vault/")) s.paid.delete("u:r");
    });
    await assert.rejects(() => s.vault.readPrivateResource("u", "r"));
    s.setRole("a", "TEACHER");
    await assert.rejects(() => s.vault.readPrivateResource("a", "r"));
  }),
);
test(
  "migration transaction failure preserves legacy source and cleans losing ciphertext",
  run(async (s) => {
    s.setFail("resource");
    await assert.rejects(() => s.vault.migrateResourcePdf("a", "r"));
    assert.equal(s.resources.get("r").fileUrl, s.url);
    assert.equal(s.store.has("resource-vault:v1:r"), false);
    assert.equal(
      [...s.blobs.keys()].some((u) => u.includes("/pdf-vault/")),
      false,
    );
  }),
);
test(
  "source edits or unreadable provider ciphertext prevent migration commit",
  run(async (s) => {
    s.setHook((url) => {
      if (url === s.url)
        s.resources.get("r").fileUrl =
          "https://store.public.blob.vercel-storage.com/changed.pdf";
    });
    await assert.rejects(() => s.vault.migrateResourcePdf("a", "r"));
    assert.equal(s.store.has("resource-vault:v1:r"), false);
    assert.equal(
      [...s.blobs.keys()].some((u) => u.includes("/pdf-vault/")),
      false,
    );
  }),
);
test(
  "encrypted download returns private PDF attachment with no source URL redirect",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    s.setSession("u");
    const r = await s.route.GET(
      new Request("https://proshnobook.com/api/download/r"),
      { params: Promise.resolve({ id: "r" }) },
    );
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("location"), null);
    assert.equal(r.headers.get("content-type"), "application/pdf");
    assert.match(r.headers.get("cache-control"), /no-store/);
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), s.bytes);
    s.setSession("v");
    assert.equal(
      (
        await s.route.GET(
          new Request("https://proshnobook.com/api/download/r"),
          { params: Promise.resolve({ id: "r" }) },
        )
      ).status,
      404,
    );
    assert.equal(s.resources.get("r").downloads, 1);
  }),
);
test(
  "new paid PDF upload is encrypted, while external public paid PDF links are rejected",
  run(async (s) => {
    const f = new FormData();
    for (const [k, v] of Object.entries({
      title: "New paid PDF",
      category: "Library",
      price: "100",
      link: "",
    }))
      f.set(k, v);
    f.set(
      "file",
      new File([s.bytes], "paper.pdf", { type: "application/pdf" }),
    );
    await s.upload.addResource(f);
    const created = [...s.resources.values()].find((r) => r.id !== "r");
    assert.ok(created.fileUrl.startsWith("private-resource:v1:"));
    assert.ok(s.store.has("resource-vault:v1:" + created.id));
    const bad = new FormData();
    for (const [k, v] of Object.entries({
      title: "Bad paid PDF",
      category: "Library",
      price: "100",
      link: s.url,
    }))
      bad.set(k, v);
    await assert.rejects(() => s.upload.addResource(bad));
  }),
);
test(
  "unconfigured or unauthorized migration fails before source download",
  run(async (s) => {
    await assert.rejects(() => s.vault.migrateResourcePdf("u", "r"));
    assert.equal(s.calls.length, 0);
    const keys = process.env.PDF_VAULT_KEYS;
    try {
      delete process.env.PDF_VAULT_KEYS;
      await assert.rejects(() => s.vault.migrateResourcePdf("a", "r"));
      assert.equal(s.calls.length, 0);
    } finally {
      process.env.PDF_VAULT_KEYS = keys;
    }
  }),
);
test(
  "migration rejects shared namespace external sources before fetch and malformed manifest cannot deliver",
  run(async (s) => {
    s.resources.get("r").fileUrl = "https://other.example/private.pdf";
    await assert.rejects(() => s.vault.migrateResourcePdf("a", "r"));
    assert.equal(s.calls.length, 0);
    s.resources.get("r").fileUrl = s.url;
    await s.vault.migrateResourcePdf("a", "r");
    const key = "resource-vault:v1:r",
      m = JSON.parse(s.store.get(key));
    m.resourceId = "different";
    s.store.set(key, JSON.stringify(m));
    await assert.rejects(() => s.vault.readPrivateResource("u", "r"));
  }),
);
test(
  "invalid ciphertext cannot switch a public resource to a broken private pointer",
  run(async (s) => {
    s.setHook((url) => {
      if (url.includes("/pdf-vault/")) {
        const bytes = s.blobs.get(url);
        bytes[bytes.length - 1] ^= 1;
      }
    });
    await assert.rejects(() => s.vault.migrateResourcePdf("a", "r"));
    assert.equal(s.resources.get("r").fileUrl, s.url);
    assert.equal(s.store.has("resource-vault:v1:r"), false);
    assert.equal(
      [...s.blobs.keys()].some((u) => u.includes("/pdf-vault/")),
      false,
    );
  }),
);
test(
  "private resource later deliberately made free remains available without login",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    s.resources.get("r").priceBdt = 0;
    s.setSession(null);
    const response = await s.route.GET(
      new Request("https://proshnobook.com/api/download/r"),
      { params: Promise.resolve({ id: "r" }) },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), s.bytes);
  }),
);
test(
  "failed paid upload manifest commit rolls back resource and removes ciphertext, no public fallback",
  run(async (s) => {
    s.setFail("resource-vault:v1:");
    const f = new FormData();
    for (const [k, v] of Object.entries({
      title: "New paid PDF",
      category: "Library",
      price: "100",
      link: "",
    }))
      f.set(k, v);
    f.set(
      "file",
      new File([s.bytes], "paper.pdf", { type: "application/pdf" }),
    );
    await assert.rejects(() => s.upload.addResource(f));
    assert.equal(s.resources.size, 1);
    assert.equal(
      [...s.blobs.keys()].some((u) => u.includes("/pdf-vault/")),
      false,
    );
  }),
);
test(
  "public free PDF cannot be made paid by price edit without encrypted storage",
  run(async (s) => {
    s.resources.get("r").priceBdt = 0;
    const f = new FormData();
    f.set("title", "Updated PDF");
    f.set("price", "100");
    await assert.rejects(() => s.manage.updateResource("r", f));
    assert.equal(s.resources.get("r").priceBdt, 0);
  }),
);
