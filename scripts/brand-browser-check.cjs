/** Isolated real-component browser checks; no auth, database or provider requests. */
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict");
const root = process.cwd(),
  out = "/home/user/brand-preview";
async function build() {
  fs.mkdirSync(out, { recursive: true });
  await require("esbuild").build({
    stdin: {
      contents:
        'import React from "react";import {createRoot} from "react-dom/client";import BrandIntro from "./components/brand-intro";createRoot(document.getElementById("root")).render(<BrandIntro/>);',
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
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><style>body{margin:0;padding:16px;background:#f4f7fa}*{box-sizing:border-box}</style><div id="root"></div><script src="app.js"></script>',
  );
  fs.copyFileSync(
    root + "/public/questionmaker-icon.png",
    out + "/questionmaker-icon.png",
  );
}
async function check() {
  const { chromium } = require("playwright-core"),
    binary = require("@sparticuz/chromium").default;
  const browser = await chromium.launch({
    executablePath: await binary.executablePath(),
    args: binary.args,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto("http://127.0.0.1:5174");
      assert.equal(await page.locator("h2").innerText(), "প্রশ্নবুক.কম");
      assert.equal(
        await page
          .locator("img")
          .evaluate((i) => i.complete && i.naturalWidth > 0),
        true,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.equal(
        await page
          .locator(".qm-intro")
          .evaluate((e) => getComputedStyle(e).backgroundColor),
        "rgb(10, 25, 47)",
      );
      await page.waitForTimeout(3200);
      assert.equal(
        await page
          .locator(".qm-intro-name")
          .evaluate((e) => getComputedStyle(e).opacity),
        "1",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await page
          .locator(".qm-intro-name")
          .evaluate((e) => getComputedStyle(e).animationName),
        "none",
      );
      assert.equal(
        await page
          .locator(".qm-intro-glare")
          .evaluate((e) => getComputedStyle(e).display),
        "none",
      );
      assert.deepEqual(errors, []);
    }
    console.log(
      "PASS: 4 responsive widths, loaded PNG, brand text/navy background, final visible state, reduced motion, no JS errors.",
    );
  } finally {
    await browser.close();
  }
}
(process.argv.includes("--build") ? build() : check()).catch((e) => {
  console.error(e);
  process.exit(1);
});
