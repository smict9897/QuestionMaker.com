const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('licensed self-hosted UI fonts use swap without eager preload',()=>{
 const src=fs.readFileSync('lib/ui-fonts.ts','utf8');
 for(const font of ['Kalpurush.woff2','Montserrat[wght].woff2']){const bytes=fs.readFileSync('public/fonts/'+font);assert.equal(bytes.toString('ascii',0,4),'wOF2');assert.ok(src.includes(font));}
 assert.equal((src.match(/preload: false/g)||[]).length,2);assert.equal((src.match(/display: "swap"/g)||[]).length,2);
 assert.match(src,/U\+0980-09FF/);
 for(const family of ['kalpurush','montserrat'])assert.match(fs.readFileSync('public/fonts/'+family+'-OFL.txt','utf8'),/SIL OPEN FONT LICENSE/);
});
test('screen typography preserves separate document font variables and print styling',()=>{
 const css=fs.readFileSync('components/ui-typography.css','utf8');assert.match(css,/@media screen/);assert.doesNotMatch(css,/@media print/);
 assert.match(css,/\.rp-print-sheet\s*\{[^}]*var\(--qk-body\)/);
 assert.match(css,/#paper,\s*#print-area/);
 const layout=fs.readFileSync('app/layout.tsx','utf8');assert.match(layout,/uiBangla.variable/);assert.match(layout,/uiLatin.variable/);
 const paper=fs.readFileSync('lib/qk-fonts.ts','utf8');assert.match(paper,/HindSiliguri-Regular.ttf/);assert.match(paper,/AnekBangla/);
});
