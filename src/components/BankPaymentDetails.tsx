import React, { useEffect, useId, useState } from 'react';
import { Copy, Landmark, Save } from 'lucide-react';
import type { BankDetails } from '../types';
import { formatPaymentDetails } from '../services/paymentDetails';

interface Props {
  bank?: BankDetails;
  amount: number;
  onSave: (bank: BankDetails) => void;
}

export function BankPaymentDetails({ bank, amount, onSave }: Props) {
  const id = useId();
  const [draft, setDraft] = useState<BankDetails>(() => bank ?? { bankName: '', accountNumber: '', accountHolder: '' });
  const [paymentAmount, setPaymentAmount] = useState(String(amount));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copying, setCopying] = useState(false);
  const [manualCopy, setManualCopy] = useState('');
  useEffect(() => { setDraft({ bankName: bank?.bankName ?? '', accountNumber: bank?.accountNumber ?? '', accountHolder: bank?.accountHolder ?? '' }); }, [bank?.bankName, bank?.accountNumber, bank?.accountHolder]);
  useEffect(() => { setPaymentAmount(String(amount)); }, [amount]);
  const inputClass = 'w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400';
  const clean = (): BankDetails => Object.fromEntries(Object.entries(draft).map(([k,v]) => [k,v.replace(/[\r\n]+/g, ' ').trim()])) as unknown as BankDetails;
  const prepare = () => formatPaymentDetails(clean(), Number(paymentAmount));
  const copy = async () => {
    setMessage(''); setError(''); setManualCopy('');
    let text: string;
    try { text = prepare(); } catch (e) { setError((e as Error).message); return; }
    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Butiran bayaran disalin. Tampal dalam aplikasi Ryt Bank.');
    } catch {
      setManualCopy(text);
      setError('Salinan automatik tidak tersedia. Pilih dan salin teks di bawah.');
    } finally { setCopying(false); }
  };
  return <details className="mt-4 min-w-0 border-t border-slate-800 pt-3">
    <summary className="cursor-pointer rounded-lg py-2 text-sm font-semibold text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
      <Landmark aria-hidden="true" className="mr-2 inline h-4 w-4" />Butiran pindahan bank
    </summary>
    <p className="mt-2 text-xs leading-relaxed text-slate-400">Simpan akaun penerima untuk bayaran seterusnya. Nombor akaun bank berbeza daripada nombor akaun bil atau rujukan JomPAY.</p>
    <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
      {([['bankName', 'Nama bank'], ['accountNumber', 'Nombor akaun bank'], ['accountHolder', 'Nama pemegang akaun']] as const).map(([field,label]) => <div key={field}>
        <label htmlFor={`${id}-${field}`} className="mb-1 block text-xs font-medium text-slate-300">{label}</label>
        <input id={`${id}-${field}`} type="text" inputMode={field === 'accountNumber' ? 'numeric' : 'text'} maxLength={field === 'accountNumber' ? 50 : 150} autoComplete="off" value={draft[field]} onChange={e => { setDraft({...draft,[field]:e.target.value}); setMessage(''); setError(''); setManualCopy(''); }} className={inputClass} />
      </div>)}
      <div><label htmlFor={`${id}-amount`} className="mb-1 block text-xs font-medium text-slate-300">Amaun bayaran (RM)</label>
        <input id={`${id}-amount`} type="number" min="0.01" step="0.01" value={paymentAmount} onChange={e => {setPaymentAmount(e.target.value); setMessage(''); setError(''); setManualCopy('');}} className={inputClass} />
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={() => {setMessage('');setError('');try {formatPaymentDetails(clean(), 1);onSave(clean());setMessage('Butiran bank disimpan.');} catch(e) {setError((e as Error).message);}}} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-400"><Save aria-hidden="true" className="h-4 w-4" />Simpan butiran bank</button>
      <button type="button" disabled={copying} onClick={copy} className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-bold text-emerald-950 hover:bg-emerald-300 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"><Copy aria-hidden="true" className="h-4 w-4" />{copying ? 'Menyalin…' : 'Salin butiran bayaran'}</button>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-slate-400">Format salinan: Bank Name, Account Number, Account Holder, Payment Amount. Bayaran hanya direkodkan selepas anda mengesahkannya secara berasingan.</p>
    <p role="status" className="mt-2 text-xs text-emerald-300">{message}</p>
    {error && <p role="alert" className="mt-2 text-xs text-rose-300">{error}</p>}
    {manualCopy && <div className="mt-3"><label htmlFor={`${id}-manual`} className="mb-1 block text-xs text-slate-300">Teks bayaran untuk disalin</label><textarea id={`${id}-manual`} readOnly rows={9} value={manualCopy} onFocus={e => e.target.select()} className={inputClass} /></div>}
  </details>;
}
