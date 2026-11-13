const fs = require("fs"),
  assert = require("node:assert/strict"),
  root = process.cwd(),
  out = "/home/user/dash-preview";
async function build() {
  fs.mkdirSync(out, { recursive: true });
  await require("esbuild").build({
    stdin: {
      contents: `import React from 'react';import{createRoot}from'react-dom/client';import Page from './app/dashboard/page';import Wallet from './app/wallet/page';const wallet=new URLSearchParams(location.search).has('wallet');(wallet?Wallet():Page({searchParams:Promise.resolve({})})).then(el=>createRoot(document.getElementById('root')).render(el));`,
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
            {
              filter:
                /^(next\/link|next\/navigation|next-auth\/react|@\/auth|@\/lib\/(db|wallet|workspace-summary)|@\/components\/(teacher-onboarding|recharge-form))$/,
            },
            (a) => ({ path: a.path, namespace: "mock" }),
          );
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
            loader: "js",
            resolveDir: root,
            contents:
              a.path === "next/link"
                ? `import React from'react';export default function Link(p){return React.createElement('a',p,p.children)}`
                : a.path === "next/navigation"
                  ? `export function redirect(url){throw Error(url)}`
                  : a.path === "next-auth/react"
                    ? `export const signOut=()=>{window.loggedOut=true}`
                    : a.path === "@/auth"
                      ? `export const auth=async()=>({user:{id:'user',name:'Saiful Islam',email:'saiful@example.com'}})`
                      : a.path === "@/lib/db"
                        ? `export const db={user:{findUnique:async()=>({id:'user',name:'Saiful Islam',email:'saiful@example.com',role:'STUDENT'})},teacherProfile:{findUnique:async()=>null},setting:{findMany:async()=>[]}}`
                        : a.path === "@/lib/wallet"
                          ? `export const formatMoney=n=>'৳'+(n/100).toFixed(2)`
                          : a.path === "@/lib/workspace-summary"
                            ? `export const workspaceSummary=async()=>({wallet:{balance:2000,admin:false,funds:{bonus:2000,recharge:0,earnings:0,received:0}},saved:4,english:2,purchased:12,packagePurchase:null});export const safeWalletRecord=JSON.parse;export const displayDate=s=>s;`
                            : `import React from'react';export default function Fixture(){return React.createElement('p',null,'Form fixture — actual server action not called')}`,
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
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><style>@font-face{font-family:Bangla;src:url(font.ttf)}body{margin:0;--qk-body:Bangla}a{color:inherit}h1,h2,h3,p{margin:0}button{cursor:pointer}</style><div id="root"></div><script src="app.js"></script>`,
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
    const p = await b.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(String(e)));
    for (const width of [320, 390, 768, 1440]) {
      await p.setViewportSize({ width, height: 900 });
      await p.goto("http://127.0.0.1:5179");
      await p.getByRole("heading", { name: "Saiful Islam" }).waitFor();
      await p.evaluate(() => document.fonts.ready);
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert.match(await p.locator(".tw-hero").innerText(), /৳20.00/);
      assert.equal(await p.locator(".tw-feature").count(), 6);
      assert.equal(await p.locator('.tw-feature[href="/wallet"]').count(), 1);
      await p.getByLabel("অ্যাপস খুলুন").click();
      assert.equal(await p.locator(".tw-appmenu a").count(), 6);
      assert.ok(
        await p
          .locator(".tw-appmenu")
          .evaluate((e) => e.getBoundingClientRect().right <= innerWidth),
      );
      await p.keyboard.press("Escape");
      assert.equal(await p.locator("details[open]").count(), 0);
      await p.getByLabel("প্রোফাইল মেনু").click();
      await p.getByRole("button", { name: "লগআউট" }).click();
      assert.equal(await p.evaluate(() => window.loggedOut), true);
      await p.goto("http://127.0.0.1:5179?wallet");
      await p
        .getByRole("heading", { name: "আমার ওয়ালেট", exact: true })
        .waitFor();
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert.match(await p.locator("#recharge").innerText(), /01773729897/);
      assert.match(await p.locator("#recharge").innerText(), /৳২০/);
    }
    assert.deepEqual(errors, []);
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto("http://127.0.0.1:5179");
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: out + "/dashboard-mobile.png", fullPage: true });
    console.log(
      "PASS dashboard+wallet 4 widths; balance/card links, apps/profile/Escape/logout, own recharge number/minimum; no overflow or browser errors. Mock data/actions.",
    );
  } finally {
    await b.close();
  }
}
(process.argv.includes("--build") ? build() : check()).catch((e) => {
  console.error(e);
  process.exit(1);
});
