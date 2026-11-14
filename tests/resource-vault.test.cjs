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
    hook = null,
    deleteFail = false,
    deleteHook = null;
  const calls = [],
    deletions = [];
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
      findFirst: async ({ where }) => {
        for (const [key, value] of store) {
          if (where.NOT?.key?.in?.includes(key)) continue;
          if (value.includes(where.value.contains)) return { key };
        }
        return null;
      },
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
        if (fail && where.key.startsWith(fail)) throw Error("forced");
        if (!store.has(where.key)) throw Error("missing");
        store.set(where.key, data.value);
        return data;
      },
    },
    resource: {
      findFirst: async ({ where }) =>
        [...resources.values()].find(
          (r) =>
            r.id !== where.id.not &&
            r.fileUrl?.toLowerCase() ===
              (typeof where.fileUrl === "string"
                ? where.fileUrl
                : where.fileUrl.equals
              ).toLowerCase(),
        ) || null,
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
                      del: async (url) => {
                        deletions.push(url);
                        if (deleteFail) throw Error("provider unavailable");
                        blobs.delete(url);
                        if (deleteHook) await deleteHook(url);
                      },
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
    url = "https://store.public.blob.vercel-storage.com/notes/legacy.pdf";
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
    deletions,
    retirement: load("lib/resource-retirement.ts"),
    migrationAction: load("app/actions/resource-vault.ts"),
    setDeleteFail: (v) => (deleteFail = v),
    setDeleteHook: (v) => (deleteHook = v),
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
test(
  "explicit retirement verifies encrypted archive, removes original and leaves paid delivery working with immutable attempts",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    assert.equal(
      await s.retirement.retireResourceOriginal("a", "r"),
      "REMOVED",
    );
    assert.equal(s.blobs.has(s.url), false);
    assert.deepEqual(await s.vault.readPrivateResource("u", "r"), s.bytes);
    const audit = JSON.parse(s.store.get("resource-vault:migration:v1:r"));
    assert.equal(audit.originalRetired, true);
    assert.equal(
      JSON.parse(s.store.get("resource-retirement:v1:r")).status,
      "REMOVED",
    );
    assert.equal(
      [...s.store.keys()].filter((k) =>
        k.startsWith("resource-retirement-attempt:"),
      ).length,
      2,
    );
    const n = s.deletions.length;
    assert.equal(
      await s.retirement.retireResourceOriginal("a", "r"),
      "REMOVED",
    );
    assert.equal(s.deletions.length, n);
  }),
);
test(
  "shared resource or setting reference blocks retirement before source deletion",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    s.resources.set("shared", { id: "shared", fileUrl: s.url });
    await assert.rejects(() => s.retirement.retireResourceOriginal("a", "r"));
    assert.equal(s.blobs.has(s.url), true);
    s.resources.delete("shared");
    s.store.set("readyorigin:v1:shared", JSON.stringify({ url: s.url }));
    await assert.rejects(() => s.retirement.retireResourceOriginal("a", "r"));
    assert.equal(s.blobs.has(s.url), true);
    assert.equal(s.store.has("resource-retirement:v1:r"), false);
  }),
);
test(
  "uncertain provider failure preserves blocked-source intent and can be explicitly retried",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    s.setDeleteFail(true);
    assert.equal(
      await s.retirement.retireResourceOriginal("a", "r"),
      "UNKNOWN",
    );
    assert.equal(s.blobs.has(s.url), true);
    assert.equal(
      JSON.parse(s.store.get("resource-retirement:v1:r")).status,
      "UNKNOWN",
    );
    s.setDeleteFail(false);
    assert.equal(
      await s.retirement.retireResourceOriginal("a", "r"),
      "REMOVED",
    );
    assert.equal(s.blobs.has(s.url), false);
  }),
);
test(
  "post-deletion DB failure cannot erase persisted intent or silently restore a public fallback",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    s.setDeleteHook(() => s.setFail("resource-retirement:v1:"));
    await assert.rejects(() => s.retirement.retireResourceOriginal("a", "r"));
    assert.equal(s.blobs.has(s.url), false);
    assert.equal(
      JSON.parse(s.store.get("resource-retirement:v1:r")).status,
      "PENDING",
    );
    assert.equal(s.resources.get("r").fileUrl, "private-resource:v1:r");
    assert.deepEqual(await s.vault.readPrivateResource("u", "r"), s.bytes);
    s.setFail("");
    s.setDeleteHook(null);
    const key = "resource-retirement:v1:r",
      state = JSON.parse(s.store.get(key));
    state.updatedAt = new Date(Date.now() - 301000).toISOString();
    s.store.set(key, JSON.stringify(state));
    assert.equal(
      await s.retirement.retireResourceOriginal("a", "r"),
      "REMOVED",
    );
  }),
);
test(
  "tombstone prevents reintroducing a retired public URL through new free resource links",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    await s.retirement.retireResourceOriginal("a", "r");
    const f = new FormData();
    for (const [k, v] of Object.entries({
      title: "Reintroduced file",
      category: "Library",
      price: "0",
      link: s.url,
    }))
      f.set(k, v);
    await assert.rejects(() => s.upload.addResource(f));
    assert.equal(s.resources.size, 1);
  }),
);
test(
  "non-admin or absent backup consent cannot trigger deletion",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    await assert.rejects(() => s.retirement.retireResourceOriginal("u", "r"));
    const f = new FormData();
    f.set("resourceId", "r");
    f.set("confirmed", "on");
    assert.equal(
      (await s.migrationAction.retirePaidResourceOriginal({}, f)).ok,
      false,
    );
    assert.equal(s.blobs.has(s.url), true);
    assert.equal(s.store.has("resource-retirement:v1:r"), false);
  }),
);
test(
  "new resource references are blocked during provider deletion, not just after completion",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    let blocked = false;
    s.setDeleteHook(async () => {
      const f = new FormData();
      for (const [k, v] of Object.entries({
        title: "Concurrent reference",
        category: "Library",
        price: "0",
        link: s.url,
      }))
        f.set(k, v);
      try {
        await s.upload.addResource(f);
      } catch {
        blocked = true;
      }
    });
    assert.equal(
      await s.retirement.retireResourceOriginal("a", "r"),
      "REMOVED",
    );
    assert.equal(blocked, true);
    assert.equal(s.resources.size, 1);
  }),
);
test(
  "concurrent retire requests share intent and do not issue independent destructive operations",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        s.retirement.retireResourceOriginal("a", "r"),
      ),
    );
    assert.ok(
      results.some((r) => r.status === "fulfilled" && r.value === "REMOVED"),
    );
    assert.equal(s.deletions.filter((u) => u === s.url).length, 1);
    assert.equal(
      JSON.parse(s.store.get("resource-retirement:v1:r")).status,
      "REMOVED",
    );
  }),
);
test(
  "retirement rejects namespace outside notes and corrupted encrypted archive before deleting source",
  run(async (s) => {
    await s.vault.migrateResourcePdf("a", "r");
    const migrationKey = "resource-vault:migration:v1:r",
      audit = JSON.parse(s.store.get(migrationKey));
    s.store.set(
      migrationKey,
      JSON.stringify({
        ...audit,
        sourceUrl:
          "https://store.public.blob.vercel-storage.com/ready-papers/file.pdf",
      }),
    );
    await assert.rejects(() => s.retirement.retireResourceOriginal("a", "r"));
    assert.equal(s.blobs.has(s.url), true);
    s.store.set(migrationKey, JSON.stringify(audit));
    const m = JSON.parse(s.store.get("resource-vault:v1:r")),
      cipher = s.blobs.get(m.url);
    cipher[cipher.length - 1] ^= 1;
    await assert.rejects(() => s.retirement.retireResourceOriginal("a", "r"));
    assert.equal(s.blobs.has(s.url), true);
    assert.equal(s.store.has("resource-retirement:v1:r"), false);
  }),
);
