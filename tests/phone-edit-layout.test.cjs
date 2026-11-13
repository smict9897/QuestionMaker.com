const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const css=fs.readFileSync('components/ready-papers/studio-responsive.css','utf8');
const studio=fs.readFileSync('components/ready-papers/studio.tsx','utf8');
test('phone-only edit layout keeps both panels visible without forcing a desktop viewport',()=>{
 const phone=css.slice(css.lastIndexOf('@media screen and (max-width: 639px)'));
 assert.match(phone,/32fr/);assert.match(phone,/68fr/);
 assert.match(phone,/rp-controls:not\(\.rp-controls-open\)[\s\S]*?display: block/);
 assert.match(phone,/rp-answer-tools/);assert.match(phone,/rp-studio-actions/);
 assert.doesNotMatch(phone,/rp-stage-select/);
 assert.doesNotMatch(phone,/(?:zoom|transform|touch-action):/);
});
test('answer shortcut uses existing paid AI preview without unmounting background answer work',()=>{
 assert.match(studio,/rp-stage-\$\{step\}/);
 assert.match(studio,/className="rp-answer-tools"/);
 assert.match(studio,/step === "edit" && paid && receipt && !adminPreset/);
 const shortcut=studio.slice(studio.indexOf('className="rp-phone-answer"'),studio.indexOf('{step === "select" &&'));
 assert.match(shortcut,/setPrintKind\("ai"\)/);assert.match(shortcut,/setStep\("preview"\)/);
 assert.match(shortcut,/উত্তরপত্র দেখুন/);
 assert.match(studio,/<AIAnswers/);assert.match(studio,/<AnswerAssistant/);
});
