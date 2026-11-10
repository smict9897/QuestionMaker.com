const fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
const m = new Module("paper-math");
m._compile(
  ts.transpileModule(fs.readFileSync("lib/paper-math.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "paper-math.js",
);
module.exports = m.exports;
