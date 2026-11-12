const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module"),
  { PDFDocument } = require("pdf-lib");
function load(file, mocks = {}) {
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (n) => mocks[n] || require(n);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const ai = load("lib/ready-ai.ts"),
  model = load("lib/ready-papers.ts"),
  receipt = "a".repeat(64),
  paperId = "11111111-1111-4111-8111-111111111111";
const question = {
  number: "1",
  question: "1+1?",
  kind: "MCQ",
  readable: true,
  confidence: "high",
  answer: "ক",
};
test("uncertain/unreadable answers blank, duplicate numbers blank, malformed MCQ labels blank", () => {
  const raw = {
    complete: true,
    questions: [
      question,
      { ...question, number: "2", confidence: "low" },
      { ...question, number: "3", readable: false },
      { ...question, number: "4", answer: "guess A" },
      { ...question, number: "5", question: "" },
    ],
  };
  assert.deepEqual(
    ai.safeAIPage(raw).questions.map((q) => q.answer),
    ["ক", null, null, null, null],
  );
  const dup = ai.safeAIPage({
    complete: true,
    questions: [question, question],
  });
  assert.equal(dup.complete, false);
  assert.ok(dup.questions.every((q) => q.answer === null));
  assert.throws(() =>
    ai.safeAIPage({
      questions: [{ ...question, answer: "x".repeat(5000) }],
      complete: true,
    }),
  );
  assert.equal(
    ai.safeAIPage({ questions: [], complete: true }).complete,
    false,
  );
});
function setup() {
  const store = new Map();
  let user = "u",
    calls = 0,
    fail = false,
    hold;
  let queue = Promise.resolve();
  const setting = {
    findUnique: async ({ where }) =>
      store.has(where.key) ? { value: store.get(where.key) } : null,
    upsert: async ({ where, create, update }) => {
      store.set(where.key, store.has(where.key) ? update.value : create.value);
    },
    update: async ({ where, data }) => store.set(where.key, data.value),
  };
  store.set(
    "readyowned:v1:u:" + receipt,
    JSON.stringify({ ownerId: "u", paperId, selected: [1, 2] }),
  );
  store.set(
    model.READY_PREFIX + paperId,
    JSON.stringify({
      id: paperId,
      title: "Test",
      kind: "SCHOOL",
      grade: "SSC",
      subject: "ICT",
      year: "2026",
      source: "School",
      published: true,
      url: "https://test.public.blob.vercel-storage.com/file.pdf",
      at: new Date().toISOString(),
      presets: {},
    }),
  );
  const walletTransaction = (fn) => {
    const run = queue.then(() => fn({ setting }));
    queue = run.catch(() => {});
    return run;
  };
  const route = load("app/api/ready-ai/route.ts", {
    "@/auth": { auth: async () => (user ? { user: { id: user } } : null) },
    "@/lib/wallet": { walletTransaction },
    "@/lib/ready-papers": model,
    "@/lib/ready-ai": ai,
    "@/lib/ready-ai-config": load("lib/ready-ai-config.ts"),
    "@/lib/ready-ai-provider": {
      browserOCRSchema: load("lib/ready-ai-provider.ts", {
        "./ready-ai": ai,
        "./ready-ai-config": load("lib/ready-ai-config.ts"),
      }).browserOCRSchema,
      solveReadyAIPage: async () => {
        calls++;
        if (hold) await hold;
        if (fail) throw Error("secret provider detail");
        return { complete: true, questions: [question] };
      },
    },
  });
  const raw = async (run = false, retry = false, extra = {}) => {
    const response = await route.POST(
      new Request("https://example.test/api/ready-ai", {
        method: "POST",
        body: JSON.stringify({ receiptId: receipt, run, retry, ...extra }),
      }),
    );
    return { status: response.status, ...(await response.json()) };
  };
  return {
    store,
    raw,
    post: async (run = false, retry = false) => {
      let r = await raw(run, retry);
      if (r.work)
        r = await raw(false, false, {
          page: r.work.page,
          lease: r.work.lease,
          ocr: {
            text: "Test printed question",
            confidence: 95,
            uncertain: false,
          },
        });
      return r;
    },
    setUser: (v) => (user = v),
    setFail: (v) => (fail = v),
    setHold: (v) => (hold = v),
    calls: () => calls,
  };
}
async function configured(fn) {
  const before = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-key";
  process.env.READY_OCR_URL = "https://ocr.example/ocr";
  process.env.READY_OCR_TOKEN = "x".repeat(32);
  try {
    await fn();
  } finally {
    if (before === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = before;
  }
}
test("anonymous and other owner cannot generate or read answers", async () => {
  const s = setup();
  s.setUser(null);
  assert.equal((await s.post(true)).status, 401);
  s.setUser("v");
  assert.equal((await s.post(true)).status, 403);
  assert.equal(s.calls(), 0);
});
test("missing DeepSeek key is honest and does not spend attempts", async () => {
  const s = setup(),
    old = process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  try {
    const r = await s.post(true);
    assert.equal(r.configured, false);
    assert.equal(r.job.pages[1].attempts, 0);
    assert.equal(s.calls(), 0);
  } finally {
    if (old !== undefined) process.env.DEEPSEEK_API_KEY = old;
  }
});
test("paid jobs backfill, persist page results, do not rerun done pages or touch wallet", async () =>
  configured(async () => {
    const s = setup();
    await s.post(false);
    assert.equal(s.calls(), 0);
    assert.equal((await s.post(true)).job.pages[1].status, "done");
    assert.equal((await s.post(true)).job.pages[2].status, "done");
    await s.post(true);
    assert.equal(s.calls(), 2);
    const stored = JSON.parse(s.store.get(ai.READY_AI_PREFIX + "u:" + receipt));
    assert.equal(stored.pages[1].result.questions[0].answer, "ক");
    assert.equal(
      [...s.store.keys()].some((k) => k.startsWith("wallet:")),
      false,
    );
  }));
test("concurrent clients lease at most one page, provider outside transaction", async () =>
  configured(async () => {
    const s = setup();
    let release;
    const waiting = new Promise((r) => (release = r));
    s.setHold(waiting);
    const first = s.post(true);
    while (!s.calls()) await new Promise((r) => setImmediate(r));
    const second = await s.post(true);
    assert.equal(second.job.pages[1].status, "running");
    assert.equal(s.calls(), 1);
    release();
    await first;
  }));
test("failed pages stay blank with safe error, retry cap3 and other pages can finish", async () =>
  configured(async () => {
    const s = setup();
    s.setFail(true);
    for (let i = 0; i < 5; i++) await s.post(true, true);
    const r = await s.post(true, true);
    assert.equal(s.calls(), 6);
    assert.equal(r.job.pages[1].attempts, 3);
    assert.equal(r.job.pages[2].attempts, 3);
    assert.equal(r.job.pages[1].status, "error");
    assert.equal(r.job.pages[1].result, undefined);
    assert.doesNotMatch(JSON.stringify(r), /secret provider/);
  }));
test("expired lease resumes instead of remaining stuck", async () =>
  configured(async () => {
    const s = setup(),
      job = ai.initialReadyAIJob(receipt, [1, 2]);
    job.pages[1] = {
      status: "running",
      attempts: 1,
      lease: "old",
      leaseUntil: 0,
    };
    s.store.set(ai.READY_AI_PREFIX + "u:" + receipt, JSON.stringify(job));
    const r = await s.post(true);
    assert.equal(r.job.pages[1].status, "done");
    assert.equal(r.job.pages[1].attempts, 2);
  }));
test("DeepSeek receives bounded browser OCR text, uncertain OCR blanks answers", async () =>
  configured(async () => {
    let sent,
      finish = "stop";
    const old = global.fetch;
    global.fetch = async (url, options) => {
      assert.equal(url, "https://api.deepseek.com/chat/completions");
      sent = JSON.parse(options.body);
      return Response.json({
        choices: [
          {
            finish_reason: finish,
            message: {
              content: JSON.stringify({
                complete: true,
                questions: [question],
              }),
            },
          },
        ],
      });
    };
    try {
      const provider = load("lib/ready-ai-provider.ts", {
        "./ready-ai": ai,
        "./ready-ai-config": load("lib/ready-ai-config.ts"),
      });
      const ocr = { text: "1. example", confidence: 95, uncertain: false };
      let r = await provider.solveReadyAIPage(ocr, 2);
      assert.equal(r.questions[0].answer, "ক");
      assert.equal(r.complete, false);
      assert.equal(
        JSON.parse(sent.messages[1].content).untrustedOCR,
        "1. example",
      );
      assert.doesNotMatch(JSON.stringify(sent), /inlineData|base64/);
      r = await provider.solveReadyAIPage({ ...ocr, uncertain: true }, 2);
      assert.equal(r.questions[0].answer, null);
      r = await provider.solveReadyAIPage({ ...ocr, confidence: 50 }, 2);
      assert.equal(r.questions[0].answer, null);
      finish = "length";
      await assert.rejects(() => provider.solveReadyAIPage(ocr, 2));
      await assert.rejects(() =>
        provider.solveReadyAIPage({ ...ocr, text: "x".repeat(60001) }, 2),
      );
    } finally {
      global.fetch = old;
    }
  }));
test("checkout creates durable job atomically; UI auto-resumes and never labels AI approved", () => {
  const c = fs.readFileSync("app/actions/ready-commerce.ts", "utf8"),
    ui = fs.readFileSync("components/ready-papers/ai-answers.tsx", "utf8");
  assert.match(c, /initialReadyAIJob\(q.receiptId, input.selected\)/);
  assert.match(ui, /request\(false, cycle > 0\)/);
  assert.match(ui, /request\(true\)/);
  assert.match(ui, /যাচাই প্রয়োজন/);
  assert.match(ui.replace(/\s+/g, " "), /অ্যাডমিন-অনুমোদিত উত্তরমালা নয়/);
  assert.doesNotMatch(ui, /dangerouslySetInnerHTML/);
});

test("browser OCR needs only DeepSeek configuration", () => {
  const old = process.env.DEEPSEEK_API_KEY;
  const config = load("lib/ready-ai-config.ts");
  try {
    process.env.DEEPSEEK_API_KEY = "test";
    assert.equal(config.readyAIConfigured(), true);
    delete process.env.DEEPSEEK_API_KEY;
    assert.equal(config.readyAIConfigured(), false);
  } finally {
    if (old === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = old;
  }
});
test("browser OCR submits only selected page and single-use owned lease; failures retry", async () =>
  configured(async () => {
    const s = setup();
    const claim = await s.raw(true);
    assert.equal(claim.work.page, 1);
    assert.match(claim.work.url, /blob.vercel-storage.com/);
    assert.equal(s.calls(), 0);
    const ocr = { text: "Question", confidence: 95, uncertain: false };
    assert.equal(
      (await s.raw(false, false, { page: 99, lease: claim.work.lease, ocr }))
        .status,
      403,
    );
    assert.equal(
      (
        await s.raw(false, false, {
          page: 1,
          lease: "11111111-1111-4111-8111-111111111111",
          ocr,
        })
      ).status,
      403,
    );
    await s.raw(false, false, { page: 1, lease: claim.work.lease, ocr });
    assert.equal(s.calls(), 1);
    assert.equal(
      (await s.raw(false, false, { page: 1, lease: claim.work.lease, ocr }))
        .status,
      403,
    );
    const next = await s.raw(true);
    const failed = await s.raw(false, false, {
      page: 2,
      lease: next.work.lease,
      ocrFailed: true,
    });
    assert.equal(failed.job.pages[2].status, "error");
    assert.equal(s.calls(), 1);
    assert.equal((await s.post(true, true)).job.pages[2].status, "done");
  }));
test("lazy browser OCR uses local assets, original page and worker cleanup", async () => {
  let terminated = 0,
    rendered,
    loaded = 0;
  const browser = load("lib/ready-browser-ocr.ts", {
    "./ready-paper-browser": {
      loadPdfImages: async (url, cb, pages) => {
        rendered = { url, pages };
        return ["original-image"];
      },
    },
    "tesseract.js": {
      createWorker: async (langs, oem, options) => {
        loaded++;
        assert.equal(langs, "ben+eng");
        assert.equal(oem, 1);
        assert.equal(options.langPath, "/vendor/ocr");
        assert.equal(options.workerBlobURL, false);
        return {
          recognize: async (image) => {
            assert.equal(image, "original-image");
            return {
              data: {
                text: "Question",
                confidence: 95,
                blocks: [
                  {
                    paragraphs: [{ lines: [{ words: [{ confidence: 50 }] }] }],
                  },
                ],
              },
            };
          },
          terminate: async () => {
            terminated++;
          },
        };
      },
    },
  });
  const r = await browser.readPurchasedPage(
    "original.pdf",
    2,
    new AbortController().signal,
    () => {},
  );
  assert.equal(r.uncertain, true);
  assert.equal(terminated, 1);
  assert.deepEqual(rendered, { url: "original.pdf", pages: [2] });
  const c = new AbortController();
  c.abort();
  await assert.rejects(() =>
    browser.readPurchasedPage("original.pdf", 2, c.signal, () => {}),
  );
  assert.equal(loaded, 1);
});
test("vendored browser OCR worker, both WASM variants and gzip languages exist", () => {
  const zlib = require("zlib");
  for (const f of [
    "worker.min.js",
    "tesseract-core-lstm.wasm.js",
    "tesseract-core-simd-lstm.wasm.js",
  ])
    assert.ok(fs.statSync("public/vendor/ocr/" + f).size > 10000);
  for (const lang of ["ben", "eng"])
    assert.ok(
      zlib.gunzipSync(
        fs.readFileSync("public/vendor/ocr/" + lang + ".traineddata.gz"),
      ).length > 100000,
    );
});
