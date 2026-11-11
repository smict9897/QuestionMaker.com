const fs = require("fs"),
  assert = require("node:assert/strict");
const root = process.cwd(),
  out = "/home/user/header-preview";
async function build() {
  fs.mkdirSync(out, { recursive: true });
  await require("esbuild").build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import Wordmark from './components/brand-wordmark';import './components/home/workspace.css';createRoot(document.getElementById('root')).render(<div className="qk-home"><header className="hm-topbar"><div className="hm-brand"><button className="hm-menu" aria-label="Menu">☰</button><a href="/"><Wordmark/></a></div><div className="hm-account"><a className="hm-outline" href="/dashboard">ড্যাশবোর্ড</a><button className="hm-primary">লগআউট</button></div></header><main style={{padding:16}}><h1>১ মিনিটে প্রশ্ন তৈরি করুন</h1></main></div>);`,
      resolveDir: root,
      loader: "tsx",
    },
    bundle: true,
    outfile: out + "/app.js",
    jsx: "automatic",
    nodePaths: [root + "/node_modules"],
    define: { "process.env.NODE_ENV": '"production"' },
  });
  fs.writeFileSync(
    out + "/index.html",
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><style>body{margin:0}*{box-sizing:border-box}</style><div id="root"></div><script src="app.js"></script>',
  );
}
async function check() {
  const { chromium } = require("playwright-core"),
    bin = require("@sparticuz/chromium").default;
  const browser = await chromium.launch({
    executablePath: await bin.executablePath(),
    args: bin.args,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    for (const width of [320, 360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("http://127.0.0.1:5174");
      assert.equal(
        await page.locator(".qm-wordmark-title").innerText(),
        "QuestionMakerBd.com",
      );
      assert.equal(await page.locator(".qm-intro").count(), 0);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const brand = await page.locator(".hm-brand").boundingBox(),
        account = await page.locator(".hm-account").boundingBox();
      assert.ok(
        brand.x + brand.width <= account.x + 1,
        "brand/account overlap at " + width,
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await page
          .locator(".qm-wordmark-title")
          .evaluate((e) => getComputedStyle(e).animationName),
        "none",
      );
    }
    console.log(
      "PASS: header wordmark at 5 widths, account spacing, no intro/overflow, reduced motion.",
    );
  } finally {
    await browser.close();
  }
}
(process.argv.includes("--build") ? build() : check()).catch((e) => {
  console.error(e);
  process.exit(1);
});
