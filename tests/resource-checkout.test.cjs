const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  ts = require("typescript"),
  fs = require("fs"),
  Module = require("module");
let configured = true;
const m = new Module("checkout", module);
m.require = (n) =>
  n === "@/lib/pdf-vault" ? { vaultConfigured: () => configured } : require(n);
m._compile(
  ts.transpileModule(fs.readFileSync("lib/resource-checkout.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "checkout",
);
const c = m.exports;
test("legacy purchase fails closed for public paid PDFs, missing configuration and malformed amounts", () => {
  const names = ["SSLCZ_STORE_ID", "SSLCZ_STORE_PASS", "SITE_URL"],
    old = names.map((n) => process.env[n]);
  try {
    process.env.SSLCZ_STORE_ID = "test";
    process.env.SSLCZ_STORE_PASS = "test";
    process.env.SITE_URL = "https://proshnobook.com";
    const r = {
      id: "r",
      priceBdt: 10,
      category: "Note",
      fileUrl: "private-resource:v1:r",
    };
    assert.equal(c.resourceCheckoutAvailable(r), true);
    for (const fileUrl of [
      "https://example.com/public.pdf",
      "private-resource:v1:other",
    ])
      assert.equal(c.resourceCheckoutAvailable({ ...r, fileUrl }), false);
    for (const priceBdt of [NaN, Infinity, -1, 0, 1.5])
      assert.equal(c.resourceCheckoutAvailable({ ...r, priceBdt }), false);
    configured = false;
    assert.equal(c.resourceCheckoutAvailable(r), false);
    configured = true;
    delete process.env.SSLCZ_STORE_PASS;
    assert.equal(c.resourceCheckoutAvailable(r), false);
    process.env.SSLCZ_STORE_PASS = "test";
    process.env.SITE_URL = "http://proshnobook.com";
    assert.equal(c.resourceCheckoutAvailable(r), false);
  } finally {
    names.forEach((n, i) =>
      old[i] === undefined ? delete process.env[n] : (process.env[n] = old[i]),
    );
  }
});
test("gateway redirects require exact HTTPS provider host", () => {
  const host = "https://sandbox.sslcommerz.com";
  assert.equal(
    c.resourceGatewayDestination(host + "/pay", host),
    host + "/pay",
  );
  for (const url of [
    "http://sandbox.sslcommerz.com/pay",
    "https://sandbox.sslcommerz.com.evil.test/pay",
    "https://user@sandbox.sslcommerz.com/pay",
    "https://sandbox.sslcommerz.com:444/pay",
    "javascript:alert(1)",
    undefined,
  ])
    assert.throws(() => c.resourceGatewayDestination(url, host));
});
