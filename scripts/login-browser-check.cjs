const fs = require("fs"),
  assert = require("node:assert/strict"),
  root = process.cwd(),
  out = "/home/user/login-preview";
async function build() {
  fs.mkdirSync(out, { recursive: true });
  await require("esbuild").build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import './components/home/home.css';import './components/home/workspace.css';import {HomeStarter} from './components/home/home-workspace';import LoginDialog from './components/auth/login-dialog';createRoot(document.getElementById('root')).render(<><div className="qk-home" style={{padding:16}}><a id="background-link" href="/">QuestionMakerBd.com</a><HomeStarter rows={[]} unavailable={false}/></div><LoginDialog next="/wallet"/></>);`,
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
        name: "mock-login",
        setup(b) {
          b.onResolve(
            {
              filter:
                /^(next\/link|next\/navigation|next-auth\/react|@\/app\/actions\/auth)$/,
            },
            (a) => ({ path: a.path, namespace: "mock" }),
          );
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
            resolveDir: root,
            loader: "js",
            contents:
              a.path === "next/link"
                ? `import React from 'react';export default function Link(p){return React.createElement('a',p,p.children)}`
                : a.path === "next/navigation"
                  ? `export function useRouter(){return {replace:url=>{window.closedTo=url}}}`
                  : a.path === "next-auth/react"
                    ? `export const signOut=()=>{};`
                    : `export async function login(s,f){window.loginNext=f.get('next');return 'Email or password is wrong.'};export async function register(s,f){window.registerNext=f.get('next');return 'Registration mock error'};export async function googleLogin(f){window.googleNext=f.get('next')}`,
          }));
        },
      },
    ],
  });
  for (const name of ["AnekBangla[wdth,wght].ttf", "HindSiliguri-Regular.ttf"])
    fs.copyFileSync(root + "/public/fonts/" + name, out + "/" + name);
  fs.writeFileSync(
    out + "/index.html",
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><style>@font-face{font-family:FixtureHead;src:url('AnekBangla[wdth,wght].ttf');font-weight:100 800}@font-face{font-family:FixtureBody;src:url('HindSiliguri-Regular.ttf')}body{margin:0;--qk-head:FixtureHead;--qk-body:FixtureBody}*{box-sizing:border-box}</style><div id="root"></div><script src="app.js"></script>`,
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
      await page.setViewportSize({ width, height: 850 });
      await page.goto("http://127.0.0.1:5177");
      const dialog = page.getByRole("dialog", { name: "লগইন করুন" });
      await dialog.waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await dialog.evaluate((e) => e.matches(":modal")), true);
      assert.match(await dialog.innerText(), /প্রথম লগইনে ৳২০ বোনাস/);
      assert.equal(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
      await page.locator("#background-link").evaluate((e) => e.focus());
      assert.notEqual(
        await page.evaluate(() => document.activeElement?.id),
        "background-link",
      );
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        assert.ok(
          await dialog.evaluate((e) => e.contains(document.activeElement)),
        );
      }
      await dialog
        .getByRole("button", { name: "Continue with Google" })
        .click();
      await page.waitForFunction(() => window.googleNext === "/wallet");
      await dialog
        .getByRole("button", { name: "লগইন করুন", exact: true })
        .click();
      await page.getByLabel("ইমেইল", { exact: true }).fill("test@example.com");
      await page
        .getByLabel("পাসওয়ার্ড", { exact: true })
        .fill("invalid-test-password");
      await dialog
        .getByRole("button", { name: "লগইন করুন", exact: true })
        .click();
      await page.getByRole("alert").waitFor();
      assert.equal(await page.evaluate(() => window.loginNext), "/wallet");
      await page
        .getByRole("button", { name: "নতুন ব্যবহারকারী? অ্যাকাউন্ট তৈরি করুন" })
        .click();
      await page.getByLabel("পূর্ণ নাম").fill("Test Person");
      assert.equal(await page.getByRole("alert").count(), 0);
      await page.setViewportSize({ width, height: 480 });
      const box = await dialog.boundingBox();
      assert.ok(box.y >= 0 && box.height <= 480);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await dialog.evaluate((e) => getComputedStyle(e).animationName),
        "none",
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.evaluate(() => window.closedTo), "/");
      await page.getByRole("button", { name: "লগইন বন্ধ করুন" }).click();
      assert.equal(await page.evaluate(() => window.closedTo), "/");
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: login native modal at4 widths, inert backdrop/focus containment, Google+email next, error/reset/register, short viewport, reduced motion, Escape/close.",
    );
  } finally {
    await browser.close();
  }
}
(process.argv.includes("--build") ? build() : check()).catch((e) => {
  console.error(e);
  process.exit(1);
});
