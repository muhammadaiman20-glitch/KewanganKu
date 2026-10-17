import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPaymentDetails } from '../src/services/paymentDetails.ts';
import { validateDatabase } from '../public/_worker.js';
const bank = { bankName: 'Maybank', accountNumber: '001234567890', accountHolder: 'Aiman Yahya' };
test('payment text preserves account leading zeros and uses professional labels and exact MYR amount', () => {
  assert.equal(formatPaymentDetails(bank, 150.5), 'Bank Name: Maybank\n\nAccount Number: 001234567890\n\nAccount Holder: Aiman Yahya\n\nPayment Amount: RM 150.50');
  assert.match(formatPaymentDetails({...bank, bankName:' Maybank\nBerhad '},15), /^Bank Name: Maybank Berhad/);
});
test('incomplete recipient or invalid payment amount cannot be copied', () => {
  for (const amount of [0,-1,NaN,Infinity]) assert.throws(() => formatPaymentDetails(bank,amount));
  for (const field of ['bankName','accountNumber','accountHolder']) assert.throws(() => formatPaymentDetails({...bank,[field]:' '},15));
});
test('cloud validation retains separate bank and bill account numbers and rejects malformed bank details', () => {
  const db = {expenses:[],debts:[],bills:[{id:'b',name:'Internet',provider:'Provider',status:'unpaid',cycle:'monthly',dueDate:'2026-10-20',amount:99,dueDay:20,paymentHistory:[],accountNumber:'CUSTOMER-123',bankDetails:bank}],subscriptions:[],vehicles:[],fuelLogs:[],profile:{name:'Aiman',email:'',phone:'',monthlyIncome:0}};
  const saved=validateDatabase(db); assert.equal(saved.bills[0].bankDetails.accountNumber,'001234567890');assert.equal(saved.bills[0].accountNumber,'CUSTOMER-123');
  db.bills[0].bankDetails.accountNumber=123;assert.throws(()=>validateDatabase(db));
});
