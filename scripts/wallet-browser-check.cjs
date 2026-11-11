const fs = require("fs"),
  assert = require("node:assert/strict"),
  out = "/home/user/wallet-preview",
  root = process.cwd();
async function build() {
  fs.mkdirSync(out, { recursive: true });
  await require("esbuild").build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import Checkout from './components/wallet-checkout';import Recharge from './components/recharge-form';createRoot(document.getElementById('root')).render(<main><Checkout ids={['m','s','c']}/><Recharge/></main>);`,
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
        name: "mock-actions",
        setup(b) {
          b.onResolve(
            { filter: /^(next\/link|@\/app\/actions\/wallet)$/ },
            (a) => ({ path: a.path, namespace: "mock" }),
          );
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
            resolveDir: root,
            loader: "js",
            contents:
              a.path === "next/link"
                ? `import React from 'react';export default function Link(p){return React.createElement('a',p,p.children)}`
                : `let paid=false;export async function quoteQuestions(){return {ok:true,balance:paid?1900:2000,total:paid?0:100,admin:false,packageCovered:false,canAfford:true}};export async function purchaseQuestions(){paid=true;return {ok:true,charged:100,balance:1900}};export async function submitRecharge(f){return {ok:true,message:'অনুরোধ জমা হয়েছে। যাচাইয়ের পর balance যোগ হবে।'}}`,
          }));
        },
      },
    ],
  });
  fs.writeFileSync(
    out + "/index.html",
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:14px Arial;padding:14px;color:#16344a}*{box-sizing:border-box}input,select{max-width:100%}aside{background:#effaf8;border:1px solid #b3d9cf;border-radius:12px;padding:16px}button{padding:10px;margin:5px}label{display:block;margin:14px 0}input,select{display:block;padding:10px}a{display:inline-block;padding:5px}</style><div id="root"></div><script src="app.js"></script>',
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
    page.on("dialog", (d) => d.accept());
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("http://127.0.0.1:5176");
      await page
        .getByText("মূল্য নিশ্চিত করে Checkout", { exact: true })
        .click();
      await page.getByText(/Checkout সম্পন্ন/).waitFor();
      assert.match(await page.locator("aside").innerText(), /৳19.00/);
      assert.match(await page.locator("aside").innerText(), /৳0.00/);
      assert.equal(
        await page
          .getByRole("link", { name: "Balance / Recharge করুন" })
          .getAttribute("href"),
        "/wallet",
      );
      assert.equal(
        await page.locator("input[name=amount]").getAttribute("min"),
        "20",
      );
      await page.locator("input[name=amount]").fill("20");
      await page.locator("input[name=phone]").fill("01712345678");
      await page.locator("input[name=transactionId]").fill("TEST12345");
      await page.getByRole("button", { name: "যাচাইয়ের অনুরোধ পাঠান" }).click();
      await page.getByText(/অনুরোধ জমা হয়েছে/).waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    console.log(
      "PASS: mock wallet checkout confirmation, updated total/balance, recharge link/minimum/form at 3 widths.",
    );
  } finally {
    await browser.close();
  }
}
(process.argv.includes("--build") ? build() : check()).catch((e) => {
  console.error(e);
  process.exit(1);
});
