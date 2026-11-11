const { chromium } = require("playwright-core"),
  binary = require("@sparticuz/chromium").default,
  assert = require("node:assert/strict");
const grade = Number(process.env.TOPIC_GRADE || 6);
(async () => {
  const browser = await chromium.launch({
    executablePath: await binary.executablePath(),
    args: binary.args,
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await page.goto(`http://127.0.0.1:5173/?grade=${grade}`);
    await page
      .getByText("Paper mode", { exact: false })
      .locator("select")
      .selectOption("writing");
    await page.locator("input[type=checkbox]").first().check();
    await page.locator(".english-topic-library summary").click();
    await page
      .locator("input[type=search]")
      .fill(grade === 8 ? "thirsty crow" : "tortoise");
    await page.locator(".english-topic-option").click();
    assert.match(
      await page.getByLabel("Requested topic (required)").inputValue(),
      grade === 8 ? /Thirsty Crow/ : /Tortoise/,
    );
    await page.getByLabel("Requested topic (required)").fill("My custom story");
    await page.locator("input[type=search]").fill("no-topic-matches-this");
    assert.equal(await page.locator(".english-topic-option").count(), 0);
    assert.equal(
      await page.getByLabel("Requested topic (required)").inputValue(),
      "My custom story",
    );
    await page.goto(`http://127.0.0.1:5173/?grade=${grade}&paper=2`);
    await page
      .getByText("Paper mode", { exact: false })
      .locator("select")
      .selectOption("writing");
    await page.locator("input[type=checkbox]").first().check();
    const choices = page
      .locator("select")
      .filter({ has: page.locator('option:text-is("formal-letter")') });
    await choices.selectOption("formal-letter");
    await page.locator(".english-topic-library summary").click();
    assert.match(
      await page.locator(".english-topic-library").innerText(),
      grade === 8 ? /27 topics/ : /34 topics/,
    );
    await page.locator(".english-topic-option").first().click();
    await choices.selectOption("informal-email");
    assert.equal(
      await page.getByLabel("Requested topic (required)").inputValue(),
      "",
    );
    await page.locator(".english-topic-library summary").click();
    assert.match(
      await page.locator(".english-topic-library").innerText(),
      grade === 8 ? /34 topics/ : /24 topics/,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    console.log(
      "PASS: topic search, selection, custom entry, subtype isolation/reset and mobile overflow.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
