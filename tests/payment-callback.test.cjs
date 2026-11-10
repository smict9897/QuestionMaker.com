const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const Module = require('node:module');
function load(path, dependencies) {
  const mod = new Module(path);
  mod.require = (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  };
  mod._compile(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, path);
  return mod.exports;
}
const validation = load('lib/payment-validation.ts', {});
function setup(initialStatus, gateway) {
  const purchase = { id: 'tx', resourceId: 'resource', amount: 100, status: initialStatus };
  let writes = 0;
  const route = load('app/api/pay/success/route.ts', {
    'next/server': { NextResponse: { redirect: (url, status) => ({ url, status }) } },
    '@/lib/db': { db: { purchase: {
      findUnique: async () => ({ ...purchase }),
      updateMany: async ({ where, data }) => {
        if (purchase.status !== where.status.not) { purchase.status = data.status; writes++; }
      },
    } } },
    '@/lib/payment-validation': validation,
    '@/lib/ssl': { validate: async () => gateway },
  });
  return { purchase, writes: () => writes, post: () => route.POST({ formData: async () => new Map([['tran_id', 'tx'], ['val_id', 'v']]) }) };
}
const valid = { status: 'VALID', tran_id: 'tx', amount: '100', currency: 'BDT' };
test('valid callback marks pending payment PAID', async () => {
  const ctx = setup('PENDING', valid); await ctx.post(); assert.equal(ctx.purchase.status, 'PAID');
});
test('invalid callback leaves pending payment unchanged', async () => {
  const ctx = setup('PENDING', null); await ctx.post(); assert.equal(ctx.purchase.status, 'PENDING'); assert.equal(ctx.writes(), 0);
});
test('invalid replay cannot downgrade PAID', async () => {
  const ctx = setup('PAID', null); await ctx.post(); assert.equal(ctx.purchase.status, 'PAID'); assert.equal(ctx.writes(), 0);
});
test('verified callback can recover failed payment, replay is idempotent', async () => {
  const ctx = setup('FAILED', valid); await ctx.post(); await ctx.post(); assert.equal(ctx.purchase.status, 'PAID'); assert.equal(ctx.writes(), 1);
});
