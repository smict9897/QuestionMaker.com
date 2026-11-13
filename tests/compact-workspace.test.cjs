const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const css = fs.readFileSync("components/compact-workspace.css", "utf8");
test("native mobile viewport keeps pinch zoom enabled without shrinking every page", () => {
  const layout = fs.readFileSync("app/layout.tsx", "utf8");
  const ast = ts.createSourceFile(
    "layout.tsx",
    layout,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let viewport;
  ast.forEachChild((node) => {
    if (ts.isVariableStatement(node))
      for (const decl of node.declarationList.declarations)
        if (decl.name.getText(ast) === "viewport") viewport = decl.initializer;
  });
  assert.ok(viewport && ts.isObjectLiteralExpression(viewport));
  const props = Object.fromEntries(
    viewport.properties.map((p) => [
      p.name.getText(ast),
      p.initializer.getText(ast),
    ]),
  );
  assert.equal(props.width, '"device-width"');
  assert.equal(props.initialScale, "1");
  assert.equal(props.userScalable, "true");
  assert.equal(props.maximumScale, undefined);
  assert.match(layout, /import "@\/components\/compact-workspace.css"/);
});
test("compact library retains two usable columns with a narrow screen fallback", () => {
  assert.match(css, /min-width:\s*480px/);
  assert.match(css, /max-width:\s*359px/);
  assert.match(
    css,
    /\.rp-professional-library[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  );
  assert.match(
    css,
    /\.rp-library-search \.rp-fields[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  );
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /min-height:\s*44px/);
});
test("compact styles are screen-only, preserve canvas/print and do not conceal overflow", () => {
  assert.match(css, /@media screen and/);
  assert.doesNotMatch(css, /(?:zoom|transform|touch-action|overflow-x):/);
  assert.doesNotMatch(css, /overflow:\s*hidden/);
  assert.doesNotMatch(css, /\.(?:rp-print-sheet|rp-canvas|a4-page)\s*\{/);
});
