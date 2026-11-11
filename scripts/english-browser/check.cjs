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
      window.lastRoute?.includes("/build?englishKey=mock"),
    );
    await page.evaluate(() => {
      window.mockGenerationFailure = true;
      window.lastRoute = null;
    });
    await page.getByRole("button", { name: "প্রশ্নপত্র তৈরি করুন" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "১টি সম্পূর্ণ অংশ" })
      .waitFor();
    assert.equal(await page.evaluate(() => window.lastRoute), null);
    assert.equal(
      await page
        .getByRole("link", {
          name: "সংরক্ষিত / উদ্ধার করা English draft দেখুন",
        })
        .getAttribute("href"),
      "/question-builder/english/saved",
    );
    await page.goto("http://127.0.0.1:5173/?grade=11&paper=2");
    await page.locator(".english-task-card").first().waitFor();
    assert.equal(
      await page.locator(".english-task-card.is-selected").count(),
      16,
    );
    assert.equal(
      await page.locator(".english-total > strong").innerText(),
      "100",
    );
    await page
      .getByText("Paper mode", { exact: false })
      .locator("select")
      .selectOption("selected");
    await page
      .getByRole("button", { name: "Select all parts", exact: true })
      .click();
    assert.equal(
      await page.locator(".english-task-card.is-selected").count(),
      16,
    );
    await page
      .getByRole("button", { name: "Clear selection", exact: true })
      .click();
    assert.equal(
      await page.locator(".english-total > strong").innerText(),
      "0",
    );
    await page
      .locator(".english-task-card input[type=checkbox]")
      .first()
      .check();
    assert.equal(
      await page.locator(".english-total > strong").innerText(),
      "5",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: "/home/user/english-browser/setup-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.screenshot({
      path: "/home/user/english-browser/setup-desktop.png",
      fullPage: true,
    });
    for (const grade of [6, 7, 8, 9, 10, 11, 12])
      for (const paper of [1, 2]) {
        await page.goto(
          `http://127.0.0.1:5173/?editor=1&grade=${grade}&paper=${paper}`,
        );
        await page.locator("#paper .english-task").first().waitFor();
        await page.setViewportSize({ width: 390, height: 844 });
        if (grade === 6 && paper === 1) {
          await page
            .getByRole("button", { name: "⚙ Page Setup / সেটিংস", exact: true })
            .click();
          const panel = page.getByRole("dialog");
          await panel.getByLabel("ফন্ট সাইজ", { exact: true }).fill("16");
          await panel
            .getByRole("button", { name: "মাঝে", exact: true })
            .click();
          assert.equal(
            await page.locator("#paper").evaluate((el) => el.style.fontSize),
            "16pt",
          );
          assert.equal(
            await page.locator("#paper").evaluate((el) => el.style.textAlign),
            "center",
          );
          await panel.getByRole("button", { name: "সেটিংস বন্ধ করুন" }).click();
        }

        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `overflow ${grade}/${paper}`,
        );
        await page.setViewportSize({ width: 1200, height: 900 });
        if (grade === 6 && paper === 1) {
          await page.getByRole("button", { name: "Undo", exact: true }).click();
          assert.equal(
            await page.locator("#paper").evaluate((el) => el.style.textAlign),
            "left",
          );
          await page.getByRole("button", { name: "Redo", exact: true }).click();
          assert.equal(
            await page.locator("#paper").evaluate((el) => el.style.textAlign),
            "center",
          );
        }
        const count = await page.locator("#paper .english-task").count();
        assert.ok(count >= 8);
        if (grade >= 11 && paper === 1)
          assert.equal(
            await page.locator(".english-data-chart svg").count(),
            1,
          );
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
