const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs");
test("PDF CTA and picker have distinct professional styling without changing native upload contract", () => {
  const page = fs.readFileSync("app/ready-papers/page.tsx", "utf8"),
    form = fs.readFileSync("components/ready-papers/admin-upload.tsx", "utf8"),
    css = fs.readFileSync("components/ready-papers/ready.css", "utf8");
  assert.match(page, /href="\/ready-papers\/upload" className="rp-upload-cta"/);
  assert.match(page, /FilePlus2/);
  assert.match(page, /ArrowUpRight/);
  assert.match(
    form,
    /name="file"\s+type="file"\s+accept="application\/pdf"\s+required\s+aria-label="PDF ফাইল বেছে নিন"/,
  );
  assert.match(form, /e.currentTarget.files\?\.\[0\]/);
  assert.match(form, /setSelectedFile\(null\)/);
  assert.match(form, /selectedFile.name/);
  assert.match(form, /selectedFile.size/);
  assert.match(form, /ফাইল পরিবর্তন/);
  assert.match(form, /new FormData\(form\)/);
  assert.match(css, /\.rp-file-picker:focus-within/);
  assert.match(css, /fieldset:disabled \.rp-file-picker/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /linear-gradient\(125deg, #7c3aed, #4f46e5\)/);
});
