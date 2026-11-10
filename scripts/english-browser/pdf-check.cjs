(async () => {
  const { getDocument } = await import(
      require("node:url").pathToFileURL(
        require.resolve("pdfjs-dist/legacy/build/pdf.mjs"),
      ).href
    ),
    fs = require("fs"),
    assert = require("assert/strict");
  for (let g = 6; g <= 12; g++)
    for (const p of [1, 2]) {
      const pdf = await getDocument({
        data: new Uint8Array(
          fs.readFileSync(
            `${process.env.ENGLISH_BROWSER_OUT || "/home/user/english-browser"}/paper-${g}-${p}.pdf`,
          ),
        ),
        useSystemFonts: true,
      }).promise;
      assert.ok(pdf.numPages >= 1);
      let full = "";
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n),
          text = (await page.getTextContent()).items
            .map((i) => i.str)
            .join(" ");
        assert.ok(text.trim().length > 10, `blank ${g}/${p}/${n}`);
        full += text;
      }
      assert.ok(full.includes("School life"));
      assert.ok(!full.includes("A separate mock sample answer."));
      console.log(
        `PDF ${g}/${p}: ${pdf.numPages} pages, nonblank, topic retained, answers excluded`,
      );
    }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
