const fs = require("fs"),
  assert = require("node:assert/strict"),
  out = "/home/user/starter-preview",
  root = process.cwd();
async function build() {
  fs.mkdirSync(out, { recursive: true });
  await require("esbuild").build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import './components/home/home.css';import './components/home/workspace.css';import {HomeStarter} from './components/home/home-workspace';createRoot(document.getElementById('root')).render(<div className="qk-home" style={{padding:12}}><HomeStarter rows={[]} unavailable={false}/></div>);`,
      resolveDir: root,
      loader: "tsx",
    },
    bundle: true,
    outfile: out + "/app.js",
    jsx: "automatic",
    nodePaths: [root + "/node_modules"],
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "mock-navigation",
        setup(b) {
          b.onResolve({ filter: /^(next\/link|next-auth\/react)$/ }, (a) => ({
            path: a.path,
            namespace: "mocks",
          }));
          b.onLoad({ filter: /.*/, namespace: "mocks" }, (a) => ({
            contents:
              a.path === "next/link"
                ? `import React from 'react';export default function Link(p){return React.createElement('a',p,p.children)}`
                : `export const signOut=()=>{};`,
            loader: "js",
            resolveDir: root,
          }));
        },
      },
    ],
  });
  for (const name of ["AnekBangla[wdth,wght].ttf", "HindSiliguri-Regular.ttf"])
    fs.copyFileSync(root + "/public/fonts/" + name, out + "/" + name);
  fs.writeFileSync(
    out + "/index.html",
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><style>@font-face{font-family:FixtureHead;src:url("AnekBangla[wdth,wght].ttf");font-weight:100 800}@font-face{font-family:FixtureBody;src:url("HindSiliguri-Regular.ttf")}body{margin:0;--qk-head:FixtureHead;--qk-body:FixtureBody}*{box-sizing:border-box}</style><div id="root"></div><script src="app.js"></script>',
  );
}
async function check() {
  const { chromium } = require("playwright-core"),
    bin = require("@sparticuz/chromium").default,
    browser = await chromium.launch({
      executablePath: await bin.executablePath(),
      args: bin.args,
      headless: true,
    });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto("http://127.0.0.1:5175");
      await page.locator(".hm-next").waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.match(
        await page.locator(".hm-panel-title h1").innerText(),
        /১ মিনিটে/,
      );
      assert.match(await page.locator(".hm-bonus-pill").innerText(), /৳২০/);
      assert.equal(await page.locator(".hm-next").isDisabled(), true);
      assert.equal(
        await page.locator("select[name=subject]").isDisabled(),
        true,
      );
      assert.equal(
        await page.locator(".hm-dropdown-trigger").isDisabled(),
        true,
      );
      assert.equal(await page.locator(".hm-starter-progress").count(), 0);
      await page.locator("select[name=category]").selectOption("Class 6");
      assert.equal(
        await page.locator("select[name=subject]").isEnabled(),
        true,
      );
      const val = await page
        .locator("select[name=subject] option")
        .nth(1)
        .getAttribute("value");
      const text = await page
        .locator("select[name=subject] option")
        .nth(1)
        .innerText();
      await page
        .locator("select[name=subject]")
        .selectOption(val || { label: text });
      assert.equal(await page.locator(".hm-next").isEnabled(), true);
      await page.locator(".hm-dropdown-trigger").click();
      assert.equal(
        await page
          .locator(".hm-dropdown-trigger")
          .getAttribute("aria-expanded"),
        "true",
      );
      const chapter = page.locator("input[name=topic]").first();
      if (await chapter.count()) {
        await chapter.check();
        await page.getByRole("button", { name: "নির্বাচন সম্পন্ন" }).click();
        assert.equal(
          await page
            .locator(".hm-dropdown-trigger")
            .getAttribute("aria-expanded"),
          "false",
        );
        const form = await page
          .locator("form")
          .evaluate((f) => Array.from(new FormData(f).entries()));
        assert.ok(form.some(([k]) => k === "topic"));
      }
      await page.locator("select[name=category]").selectOption("Class 7");
      assert.equal(await page.locator("select[name=subject]").inputValue(), "");
      assert.equal(await page.locator(".hm-next").isDisabled(), true);
      assert.equal(await page.locator("input[name=topic]:checked").count(), 0);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: actual HomeStarter at 4 widths; dropdown expansion/collapse, required/disabled state, collapsed chapter form values, class reset, no overflow/JS errors.",
    );
  } finally {
    await browser.close();
  }
}
(process.argv.includes("--build") ? build() : check()).catch((e) => {
  console.error(e);
  process.exit(1);
});
