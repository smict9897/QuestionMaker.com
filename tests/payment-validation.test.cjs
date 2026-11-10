const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const Module = require('node:module');
const mod = new Module('payment-validation');
mod._compile(ts.transpileModule(fs.readFileSync('lib/payment-validation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, 'payment-validation.js');
const { isVerifiedPayment } = mod.exports;
const valid = { status: 'VALID', tran_id: 'order-123', amount: '100.00', currency: 'BDT' };
test('accepts a matching verified payment', () => assert.equal(isVerifiedPayment(valid, 'order-123', 100), true));
test('accepts already validated gateway response', () => assert.equal(isVerifiedPayment({ ...valid, status: 'VALIDATED' }, 'order-123', 100), true));
for (const [field, value] of [['status', 'FAILED'], ['tran_id', 'other-order'], ['currency', 'USD'], ['amount', '99.99'], ['amount', '100.49'], ['amount', 'NaN'], ['amount', '']]) {
  test(`rejects ${field}=${value}`, () => assert.equal(isVerifiedPayment({ ...valid, [field]: value }, 'order-123', 100), false));
}
test('rejects missing gateway validation', () => assert.equal(isVerifiedPayment(null, 'order-123', 100), false));
