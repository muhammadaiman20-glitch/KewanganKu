// Proof of payment. Every transaction (money that actually moved) needs a receipt or transfer slip.
// A new transaction is saved with floating: true and stays out of the realised total until a proof is attached
// (receiptUrl). Records from before this rule have no floating flag and count as realised.
// The Telegram bot (telegram-bot/src/finance.js) follows the same rules on the same synced data.
import type { AppDatabase } from '../types';

export type ProofRef = { c: 'expenses' | 'fuelLogs' | 'debts' | 'bills' | 'vehicles'; id: string; sub?: string };
export type Transaction = { ref: ProofRef; date: string; amount: number; label: string; floating: boolean; receiptUrl?: string };

export const isFloating = (t: { floating?: boolean }) => t.floating === true;
export const refKey = (r: ProofRef) => `${r.c}/${r.id}${r.sub ? '/' + r.sub : ''}`;

// Every transaction with its location, newest first.
export function transactions(db: AppDatabase): Transaction[] {
  const out: Transaction[] = [];
  const add = (ref: ProofRef, t: { floating?: boolean; receiptUrl?: string }, date: string, amount: number, label: string) =>
    out.push({ ref, date, amount, label, floating: isFloating(t), receiptUrl: t.receiptUrl });
  for (const e of db.expenses) add({ c: 'expenses', id: e.id }, e, e.date, e.amount, e.description);
  for (const f of db.fuelLogs) add({ c: 'fuelLogs', id: f.id }, f, f.date, f.amount, `Minyak ${f.vehiclePlate} ${f.station}`);
  for (const d of db.debts) for (const p of d.payments) add({ c: 'debts', id: d.id, sub: p.id }, p, p.date, p.amount, `Bayaran ${d.title}`);
  for (const b of db.bills) for (const p of b.paymentHistory) add({ c: 'bills', id: b.id, sub: p.id }, p, p.paidDate, p.amount, `Bayaran ${b.name}`);
  for (const v of db.vehicles) for (const s of v.services) add({ c: 'vehicles', id: v.id, sub: s.id }, s, s.date, s.cost, `Servis ${v.plateNumber} ${s.workshop || ''}`.trim());
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// Realised vs floating money for one month ("YYYY-MM").
export function proofSplit(db: AppDatabase, month: string) {
  const txns = transactions(db).filter(t => t.date?.startsWith(month));
  const floating = txns.filter(t => t.floating);
  const sum = (list: Transaction[]) => Math.round(list.reduce((a, t) => a + t.amount, 0) * 100) / 100;
  return { realised: sum(txns.filter(t => !t.floating)), floating: sum(floating), floatingCount: floating.length };
}

// Returns a copy of the database with the proof attached to one transaction (it becomes realised).
export function attachProof(db: AppDatabase, ref: ProofRef, url: string): AppDatabase {
  const prove = <T extends { floating?: boolean; receiptUrl?: string }>(t: T): T => { const { floating: _, ...rest } = t; return { ...rest, receiptUrl: url } as T; };
  switch (ref.c) {
    case 'expenses': return { ...db, expenses: db.expenses.map(e => e.id === ref.id ? prove(e) : e) };
    case 'fuelLogs': return { ...db, fuelLogs: db.fuelLogs.map(f => f.id === ref.id ? prove(f) : f) };
    case 'debts': return { ...db, debts: db.debts.map(d => d.id === ref.id ? { ...d, payments: d.payments.map(p => p.id === ref.sub ? prove(p) : p) } : d) };
    case 'bills': return { ...db, bills: db.bills.map(b => b.id === ref.id ? { ...b, paymentHistory: b.paymentHistory.map(p => p.id === ref.sub ? prove(p) : p) } : b) };
    case 'vehicles': return { ...db, vehicles: db.vehicles.map(v => v.id === ref.id ? { ...v, services: v.services.map(s => s.id === ref.sub ? prove(s) : s) } : v) };
  }
}

// New transactions: realised if a proof came with them, otherwise floating.
export const proofFields = (receiptUrl?: string) => (receiptUrl ? { receiptUrl } : { floating: true as const });

// Shrinks a photo to a readable receipt (longest side 1600 px, JPEG) and uploads it. Returns its /api/proofs URL.
export async function uploadProof(source: Blob | string): Promise<string> {
  const img = new Image();
  const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source);
  try {
    img.src = objectUrl || (source as string); await img.decode();
    if (!img.width || !img.height) throw new Error('Gambar tidak dapat dibaca.');
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Pelayar tidak dapat menyediakan gambar.');
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL('image/jpeg', 0.72);
    if (data.length > 1.9 * 1024 * 1024) data = canvas.toDataURL('image/jpeg', 0.5);
    const response = await fetch('/api/proofs', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: data }) });
    if (response.redirected || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Sesi log masuk tamat. Muat semula laman dan log masuk semula.');
    const payload = await response.json();
    if (!response.ok || typeof payload.url !== 'string') throw new Error(payload.error || 'Bukti tidak dapat dimuat naik.');
    return payload.url;
  } finally { if (objectUrl) URL.revokeObjectURL(objectUrl); }
}
