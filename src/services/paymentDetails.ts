import type { BankDetails } from '../types/index.ts';

export function formatPaymentDetails(bank: BankDetails, amount: number): string {
  const line = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();
  if (![bank.bankName, bank.accountNumber, bank.accountHolder].every(value => typeof value === 'string' && line(value))) {
    throw new Error('Lengkapkan nama bank, nombor akaun bank dan nama pemegang akaun.');
  }
  if (!Number.isFinite(amount) || amount < 0.01) throw new Error('Masukkan amaun bayaran yang melebihi RM 0.00.');
  return `Bank Name: ${line(bank.bankName)}\n\nAccount Number: ${line(bank.accountNumber)}\n\nAccount Holder: ${line(bank.accountHolder)}\n\nPayment Amount: RM ${amount.toFixed(2)}`;
}
