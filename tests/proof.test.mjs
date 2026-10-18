import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachProof, proofFields, proofSplit, transactions } from '../src/services/proof.ts';

const db = () => ({
  expenses: [{ id: 'e1', description: 'old', amount: 10, date: '2026-10-01', source: 'manual' }, { id: 'e2', description: 'nasi', amount: 12.5, date: '2026-10-02', source: 'voice', floating: true }],
  debts: [{ id: 'd1', title: 'PTPTN', payments: [{ id: 'p1', debtId: 'd1', amount: 200, date: '2026-10-03', floating: true }] }],
  bills: [{ id: 'b1', name: 'TNB', paymentHistory: [{ id: 'bp1', billId: 'b1', amount: 120, paidDate: '2026-09-20', floating: true }] }],
  subscriptions: [], vehicles: [{ id: 'v1', plateNumber: 'VHY 8821', services: [{ id: 's1', vehicleId: 'v1', date: '2026-10-04', cost: 300, workshop: 'Bengkel', items: [], receiptUrl: '/api/proofs/x' }] }],
  fuelLogs: [{ id: 'f1', vehiclePlate: 'VHY 8821', station: 'Shell', amount: 50, date: '2026-10-05', floating: true }],
  profile: {},
});

test('records without a flag count as realised; new ones are floating until proven', () => {
  assert.deepEqual(proofFields(), { floating: true });
  assert.deepEqual(proofFields('/api/proofs/a'), { receiptUrl: '/api/proofs/a' });
  assert.deepEqual(proofSplit(db(), '2026-10'), { realised: 310, floating: 262.5, floatingCount: 3 });
  assert.equal(transactions(db()).filter((t) => t.floating).length, 4);
});

test('attaching a proof realises exactly one transaction, nested payments included', () => {
  const original = db();
  let next = attachProof(original, { c: 'debts', id: 'd1', sub: 'p1' }, '/api/proofs/p');
  assert.deepEqual(next.debts[0].payments[0], { id: 'p1', debtId: 'd1', amount: 200, date: '2026-10-03', receiptUrl: '/api/proofs/p' });
  assert.equal(original.debts[0].payments[0].floating, true);
  next = attachProof(next, { c: 'expenses', id: 'e2' }, '/api/proofs/e');
  assert.deepEqual(proofSplit(next, '2026-10'), { realised: 522.5, floating: 50, floatingCount: 1 });
  assert.equal(next.bills[0].paymentHistory[0].floating, true);
});
