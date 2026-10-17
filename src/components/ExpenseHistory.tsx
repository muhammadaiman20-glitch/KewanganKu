import React from 'react';
import { Trash2 } from 'lucide-react';
import { ExpenseItem } from '../types';
import { formatRM } from '../services/storage';
import { localDate } from '../services/voiceCommand';

export function ExpenseHistory({ expenses, onDelete }: { expenses: ExpenseItem[]; onDelete: (id: string) => void }) {
  const total = expenses.filter(e => e.date.startsWith(localDate().slice(0, 7))).reduce((sum, e) => sum + e.amount, 0);
  return <section className="mb-6 rounded-2xl bg-slate-900 p-4" aria-label="Perbelanjaan harian">
    <h2 className="text-lg font-bold">Perbelanjaan harian</h2>
    <p className="text-sm text-slate-300 mb-3">Bulan ini: <strong>{formatRM(total)}</strong></p>
    {!expenses.length && <p className="text-sm text-slate-300">Belum ada rekod. Gunakan Input Suara untuk menambah perbelanjaan.</p>}
    <ul className="max-h-64 overflow-y-auto divide-y divide-slate-700">{expenses.map(e => <li key={e.id} className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1"><p className="break-words">{e.description}</p><p className="text-xs text-slate-300">{e.date}</p></div>
      <strong className="whitespace-nowrap">{formatRM(e.amount)}</strong>
      <button type="button" aria-label={`Padam ${e.description}`} className="p-3 rounded-lg text-rose-300 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400" onClick={() => { if (window.confirm(`Padam perbelanjaan ${e.description}?`)) onDelete(e.id); }}><Trash2 size={18} /></button>
    </li>)}</ul>
  </section>;
}
