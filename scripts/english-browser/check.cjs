const { chromium } = require("playwright-core"),
  binary = require("@sparticuz/chromium").default,
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: await binary.executablePath(),
    args: binary.args,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("http://127.0.0.1:5173/");
    await page
      .getByText("Paper mode", { exact: false })
      .locator("select")
      .selectOption("writing");
    await page.locator("input[type=checkbox]").first().check();
    await page.getByLabel("Requested topic (required)").fill("School life");
    await page.getByRole("button", { name: "প্রশ্নপত্র তৈরি করুন" }).click();
    await page.waitForFunction(() =>
      window.lastRoute?.includes("/english/edit?key=mock"),
    );
    for (const grade of [6, 7, 8, 9, 10, 11, 12])
      for (const paper of [1, 2]) {
        await page.goto(
          `http://127.0.0.1:5173/?editor=1&grade=${grade}&paper=${paper}`,
        );
        await page.locator("#paper .english-task").first().waitFor();
        await page.setViewportSize({ width: 390, height: 844 });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `overflow ${grade}/${paper}`,
        );
        await page.setViewportSize({ width: 1200, height: 900 });
        const count = await page.locator("#paper .english-task").count();
        assert.ok(count >= 8);
        await page.pdf({
          path: `${process.env.ENGLISH_BROWSER_OUT || "/home/user/english-browser"}/paper-${grade}-${paper}.pdf`,
          format: "A4",
        });
        assert.equal(
          await page
            .locator("#paper")
            .innerText()
            .then((t) => t.includes("A separate mock sample answer.")),
          false,
        );
        await page
          .getByText("পৃথক উত্তরপত্র দেখুন/print করুন")
          .locator("input")
          .check();
        assert.ok((await page.locator("#paper").innerText()).includes("mock"));
        await page
          .getByRole("button", { name: "সেভ করুন", exact: true })
          .click();
        await page
          .getByRole("status")
          .filter({ hasText: "সেভ হয়েছে।" })
          .waitFor();
      }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: setup->mock generation, 14 editor templates, mobile overflow, question-only PDFs, separate answer mode, mocked save, no browser errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
