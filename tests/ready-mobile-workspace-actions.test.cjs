const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const studio=fs.readFileSync('components/ready-papers/studio.tsx','utf8');const frame=fs.readFileSync('components/ready-papers/page-viewer.tsx','utf8');const css=fs.readFileSync('components/ready-papers/studio-responsive.css','utf8');
test('only final preview supplies replacement mobile actions to the print frame',()=>{
 assert.equal((studio.match(/<PrintFrame mobileActions=|<PrintFrame\s+mobileActions=/g)||[]).length,1);
 const actions=studio.slice(studio.indexOf('mobileActions='),studio.indexOf('<section id="ready-print">'));
 for(const text of ['Edit-এ ফিরুন','Print / Save PDF','অবস্থান সম্পাদনা বন্ধ'])assert.ok(actions.includes(text));
 assert.match(actions,/!paid/);assert.match(actions,/printPages.length !== selected.length/);
 assert.match(actions,/window.print\(\)/);assert.match(actions,/setPlacementMode/);
 assert.match(frame,/mobileActions\?: ReactNode/);assert.match(frame,/rp-preview-desktop-zoom/);
});
test('mobile controls scroll independently and margin tools follow header without desktop reordering',()=>{
 const rules=css.slice(css.lastIndexOf('@media screen and (max-width: 639px)'));
 assert.match(rules,/overflow-y: auto/);assert.match(rules,/overscroll-behavior-y: contain/);
 assert.match(rules,/rp-margin-tools[\s\S]*?order: 1/);
 assert.match(rules,/rp-order, details\)[\s\S]*?order: 0/);
 assert.match(studio,/className="rp-margin-tools"/);
 assert.match(rules,/rp-preview-desktop-zoom/);
 assert.doesNotMatch(rules,/(?:zoom|transform|touch-action):/);
});
