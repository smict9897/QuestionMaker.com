const fs = require("fs"),
  path = require("path"),
  esbuild = require("esbuild"),
  { execFileSync } = require("child_process");
const root = path.resolve(__dirname, "../.."),
  out = process.env.ENGLISH_BROWSER_OUT || "/home/user/english-browser";
fs.mkdirSync(out, { recursive: true });
esbuild.buildSync({
  entryPoints: [__dirname + "/fixture.jsx"],
  bundle: true,
  external: ["/fonts/*"],
  outfile: out + "/app.js",
  jsx: "automatic",
  alias: {
    "@": root,
    "next/link": __dirname + "/mocks.jsx",
    "next/navigation": __dirname + "/mocks.jsx",
    "@/app/actions/english-paper": __dirname + "/mocks.jsx",
    "@/app/actions/paper-headers": __dirname + "/mocks.jsx",
  },
  nodePaths: [root + "/node_modules"],
  loader: { ".css": "css" },
  define: { "process.env.NODE_ENV": '"production"' },
});
execFileSync(
  root + "/node_modules/.bin/tailwindcss",
  [
    "-i",
    root + "/app/globals.css",
    "-o",
    out + "/global.css",
    "--content",
    root + "/components/english-*.tsx",
    "--minify",
  ],
  { cwd: root },
);
fs.writeFileSync(
  out + "/index.html",
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="global.css"><link rel="stylesheet" href="app.css"><div id="root"></div><script src="app.js"></script>',
);

fs.mkdirSync(out + "/fonts", { recursive: true });
fs.copyFileSync(
  root + "/public/fonts/HindSiliguri-Regular.ttf",
  out + "/fonts/HindSiliguri-Regular.ttf",
);
