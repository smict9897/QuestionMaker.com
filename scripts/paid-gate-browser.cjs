const fs = require("fs"),
  assert = require("node:assert/strict"),
  root = process.cwd(),
  out = "/home/user/gate-preview";
async function build() {
  fs.mkdirSync(out, { recursive: true });
  await require("esbuild").build({
    stdin: {
      contents: `import React from 'react';import{createRoot}from'react-dom/client';import Gate from './components/paid-builder-gate';localStorage.setItem('qb:selected','["m","c","s"]');createRoot(document.getElementById('root')).render(<Gate><h1 id="editor">PRIVATE EDITOR</h1></Gate>);`,
      resolveDir: root,
      loader: "tsx",
    },
    bundle: true,
    outfile: out + "/app.js",
    jsx: "automatic",
    nodePaths: [root + "/node_modules"],
    plugins: [
      {
        name: "mock",
        setup(b) {
          b.onResolve(
            { filter: /^(next\/link|@\/app\/actions\/wallet)$/ },
            (a) => ({ path: a.path, namespace: "mock" }),
          );
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
            loader: "js",
            resolveDir: root,
            contents:
              a.path === "next/link"
                ? `import React from'react';export default function Link(p){return React.createElement('a',p,p.children)}`
                : `let paid=false;const mode=new URLSearchParams(location.search).get('mode');export async function quoteQuestions(){if(mode==='fail')return{ok:false,error:'SERVER FAILURE'};return{ok:true,total:paid||mode==='package'?0:100,balance:mode==='poor'?0:2000,counts:{MCQ:1,SHORT:1,CQ:1},packageCovered:mode==='package',canAfford:mode!=='poor'}};export async function purchaseQuestions(ids,total){window.purchases=(window.purchases||0)+1;window.expectedTotal=total;if(mode==='stale')return{ok:false,error:'PRICE CHANGED'};paid=true;return{ok:true,charged:total}};export async function checkQuestionAccess(){return{ok:paid}};`,
          }));
        },
      },
    ],
  });
  fs.copyFileSync(
    root + "/public/fonts/HindSiliguri-Regular.ttf",
    out + "/font.ttf",
  );
  fs.writeFileSync(
    out + "/index.html",
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><style>@font-face{font-family:Bangla;src:url(font.ttf)}body{font-family:Bangla,sans-serif;margin:0}button,a{font-family:inherit}*{box-sizing:border-box}</style><div id="root"></div><script src="app.js"></script>`,
  );
}
async function check() {
  const { chromium } = require("playwright-core"),
    bin = require("@sparticuz/chromium").default,
    b = await chromium.launch({
      executablePath: await bin.executablePath(),
      args: bin.args,
      headless: true,
    });
  try {
    const p = await b.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(String(e)));
    for (const width of [320, 390, 768, 1440]) {
      await p.setViewportSize({ width, height: 780 });
      await p.goto("http://127.0.0.1:5178");
      const d = p.getByRole("dialog");
      await d.getByRole("button").waitFor();
      assert.equal(await p.locator("#editor").count(), 0);
      assert.equal(await p.evaluate(() => window.purchases || 0), 0);
      assert.equal(await d.evaluate((e) => e.matches(":modal")), true);
      assert.ok(await d.evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
      for (let i = 0; i < 12; i++) {
        await p.keyboard.press("Tab");
        assert.ok(await d.evaluate((e) => e.contains(document.activeElement)));
      }
      await d.getByRole("button").click();
      await p.locator("#editor").waitFor();
      assert.equal(await p.evaluate(() => window.expectedTotal), 100);
      assert.equal(await p.evaluate(() => document.body.style.overflow), "");
    }
    for (const mode of ["poor", "package", "fail", "stale"]) {
      await p.setViewportSize({ width: 390, height: 480 });
      await p.goto("http://127.0.0.1:5178?mode=" + mode);
      const d = p.getByRole("dialog");
      await p.waitForTimeout(150);
      if (mode === "poor" || mode === "fail") {
        assert.equal(await d.getByRole("button").count(), 0);
        assert.equal(await p.locator("#editor").count(), 0);
      } else {
        await d.getByRole("button").click();
        if (mode === "package") {
          await p.locator("#editor").waitFor();
          assert.equal(await p.evaluate(() => window.expectedTotal), 0);
        } else {
          await d
            .getByRole("alert")
            .filter({ hasText: "PRICE CHANGED" })
            .waitFor();
          assert.equal(await p.locator("#editor").count(), 0);
        }
      }
    }
    assert.deepEqual(errors, []);
    await p.goto("http://127.0.0.1:5178?mode=poor");
    await p.getByRole("dialog").waitFor();
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: out + "/mobile.png" });
    console.log(
      "PASS 4 widths, native focus/inertness, no mount or charge before consent, paid/package continuation, insufficient balance, failed/stale quote denial, short viewport. Mock actions only.",
    );
  } finally {
    await b.close();
  }
}
(process.argv.includes("--build") ? build() : check()).catch((e) => {
  console.error(e);
  process.exit(1);
});
