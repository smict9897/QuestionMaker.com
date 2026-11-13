const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('phone final preview hides metadata and answer panels without removing workers',()=>{
 const css=fs.readFileSync('components/ready-papers/studio-responsive.css','utf8');
 const phone=css.slice(css.lastIndexOf('@media screen and (max-width: 639px)'));
 assert.match(phone,/\.rp-stage-preview\s*>\s*:is\(\.rp-studio-head,\s*\.rp-hero,\s*\.rp-status,\s*\.rp-answer-tools\)\s*\{\s*display:\s*none/);
 assert.match(phone,/\.rp-stage-preview \.rp-preview-phone-actions\s*\{\s*display:\s*flex/);
 const studio=fs.readFileSync('components/ready-papers/studio.tsx','utf8');
 assert.match(studio,/<AIAnswers/);assert.match(studio,/<AnswerAssistant/);
 assert.match(studio,/mobileActions=/);
 assert.doesNotMatch(phone,/\.rp-print-sheet\s*\{/);
});
