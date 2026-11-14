const fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
const m = new Module("brand", module);
m._compile(
  ts.transpileModule(fs.readFileSync("lib/brand.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "brand",
);
module.exports = m.exports;
