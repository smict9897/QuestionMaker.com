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
    "@/lib/ready-ai-provider": {
      solveReadyAIPage: async () => {
        calls++;
        if (hold) await hold;
        if (fail) throw Error("secret provider detail");
        return { complete: true, questions: [question] };
      },
    },
  });
  return {
    store,
    post: async (run = false, retry = false) => {
      const response = await route.POST(
        new Request("https://example.test/api/ready-ai", {
          method: "POST",
          body: JSON.stringify({ receiptId: receipt, run, retry }),
        }),
      );
      return { status: response.status, ...(await response.json()) };
    },
    setUser: (v) => (user = v),
    setFail: (v) => (fail = v),
    setHold: (v) => (hold = v),
    calls: () => calls,
  };
}
async function configured(fn) {
  const before = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";
  try {
    await fn();
  } finally {
    if (before === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = before;
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
test("missing vision key is honest and does not spend attempts", async () => {
  const s = setup(),
    old = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const r = await s.post(true);
    assert.equal(r.configured, false);
    assert.equal(r.job.pages[1].attempts, 0);
    assert.equal(s.calls(), 0);
  } finally {
    if (old !== undefined) process.env.GEMINI_API_KEY = old;
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
test("vision provider sends one server-selected PDF page, blanks low confidence and rejects truncated output", async () =>
  configured(async () => {
    const d = await PDFDocument.create();
    d.addPage([200, 300]);
    d.addPage([400, 500]);
    const bytes = await d.save();
    let request,
      finish = "STOP";
    const oldFetch = global.fetch;
    global.fetch = async (url, options) => {
      if (url.startsWith("https://test.public.blob"))
        return new Response(bytes);
      request = JSON.parse(options.body);
      return Response.json({
        candidates: [
          {
            finishReason: finish,
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    complete: true,
                    questions: [
                      question,
                      { ...question, number: "2", confidence: "unknown" },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      });
    };
    try {
      const provider = load("lib/ready-ai-provider.ts", { "./ready-ai": ai });
      const r = await provider.solveReadyAIPage(
        "https://test.public.blob.vercel-storage.com/file.pdf",
        2,
      );
      const attachment = request.contents[0].parts[1].inlineData;
      assert.equal(attachment.mimeType, "application/pdf");
      const out = await PDFDocument.load(
        Buffer.from(attachment.data, "base64"),
      );
      assert.equal(out.getPageCount(), 1);
      assert.equal(out.getPages()[0].getWidth(), 400);
      assert.equal(r.questions[1].answer, null);
      finish = "MAX_TOKENS";
      await assert.rejects(() =>
        provider.solveReadyAIPage(
          "https://test.public.blob.vercel-storage.com/file.pdf",
          2,
        ),
      );
      await assert.rejects(() =>
        provider.solveReadyAIPage("https://evil.example/file.pdf", 2),
      );
    } finally {
      global.fetch = oldFetch;
    }
  }));
test("checkout creates durable job atomically; UI auto-resumes and never labels AI approved", () => {
  const c = fs.readFileSync("app/actions/ready-commerce.ts", "utf8"),
    ui = fs.readFileSync("components/ready-papers/ai-answers.tsx", "utf8");
  assert.match(c, /initialReadyAIJob\(q.receiptId, input.selected\)/);
  assert.match(ui, /request\(false, cycle > 0\)/);
  assert.match(ui, /request\(true\)/);
  assert.match(ui, /যাচাই প্রয়োজন/);
  assert.match(ui, /অ্যাডমিন-অনুমোদিত উত্তরমালা নয়/);
  assert.doesNotMatch(ui, /dangerouslySetInnerHTML/);
});
