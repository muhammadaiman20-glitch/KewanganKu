import React, { useRef, useState } from 'react';
import { CheckCircle2, Clock, LoaderCircle, Paperclip, ReceiptText } from 'lucide-react';
import { AppDatabase } from '../types';
import { formatRM } from '../services/storage';
import { localDate } from '../services/voiceCommand';
import { ProofRef, Transaction, proofSplit, refKey, transactions, uploadProof } from '../services/proof';
import { DocumentCropper } from './DocumentCropper';

// Realised vs floating money this month, and every transaction still waiting for its receipt.
export function ProofPanel({ data, onAttach }: { data: AppDatabase; onAttach: (ref: ProofRef, url: string) => void }) {
  const split = proofSplit(data, localDate().slice(0, 7));
  const floating = transactions(data).filter(t => t.floating);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const target = useRef<Transaction | null>(null);

  const pick = (t: Transaction) => { target.current = t; setError(''); input.current?.click(); };
  // The chosen photo opens in document mode first (crop, straighten, clean); the scan is what gets uploaded.
  const [cropSource, setCropSource] = useState<string | null>(null);
  const choose = (file: File | undefined) => {
    if (!file || !target.current) return;
    if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) { setError('Pilih gambar resit (JPEG, PNG atau WebP) sehingga 20 MB.'); return; }
    setCropSource(URL.createObjectURL(file));
  };
  const closeCrop = () => { if (cropSource) URL.revokeObjectURL(cropSource); setCropSource(null); };
  const upload = async (scan: string) => {
    const t = target.current; if (!t) return;
    setBusy(refKey(t.ref));
    try { onAttach(t.ref, await uploadProof(scan)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Bukti tidak dapat dimuat naik.'); }
    finally { setBusy(null); target.current = null; }
  };
  const shown = showAll ? floating : floating.slice(0, 5);

  return <section className="mb-6 rounded-2xl bg-slate-900 p-4" aria-label="Bukti transaksi">
    <div className="flex items-center gap-2 mb-3">
      <ReceiptText className="w-5 h-5 text-emerald-400" aria-hidden="true" />
      <h2 className="text-lg font-bold">Bukti transaksi</h2>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
        <p className="text-xs text-emerald-300 flex items-center gap-1"><CheckCircle2 size={14} aria-hidden="true" /> Direalisasikan bulan ini</p>
        <p className="text-lg font-extrabold text-white mt-1">{formatRM(split.realised)}</p>
      </div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
        <p className="text-xs text-amber-200 flex items-center gap-1"><Clock size={14} aria-hidden="true" /> Terapung bulan ini</p>
        <p className="text-lg font-extrabold text-white mt-1">{formatRM(split.floating)}</p>
        <p className="text-[11px] text-amber-200/80">{split.floatingCount} transaksi tanpa bukti</p>
      </div>
    </div>
    <p className="text-xs text-slate-300 mt-3">Setiap transaksi perlu resit atau slip bayaran. Tanpa bukti, ia kekal <strong className="text-amber-200">Terapung</strong> dan tidak dikira sebagai direalisasikan.</p>

    {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
    {!floating.length
      ? <p className="mt-3 text-sm text-emerald-300 flex items-center gap-2"><CheckCircle2 size={16} aria-hidden="true" /> Semua transaksi mempunyai bukti.</p>
      : <ul className="mt-3 divide-y divide-slate-700">{shown.map(t => {
        const key = refKey(t.ref);
        return <li key={key} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm">{t.label}</p>
            <p className="text-xs text-slate-400">{t.date} · <span className="text-amber-200">Terapung</span></p>
          </div>
          <strong className="whitespace-nowrap text-sm">{formatRM(t.amount)}</strong>
          <button type="button" disabled={busy !== null} onClick={() => pick(t)}
            className="min-h-11 shrink-0 rounded-xl bg-amber-400 px-3 text-xs font-bold text-slate-950 flex items-center gap-1.5 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
            {busy === key ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Paperclip size={14} aria-hidden="true" />}
            <span>{busy === key ? 'Memuat naik…' : 'Lampir resit'}</span>
          </button>
        </li>;
      })}</ul>}
    {floating.length > 5 && <button type="button" className="mt-1 min-h-11 text-xs text-emerald-300 underline" onClick={() => setShowAll(v => !v)}>
      {showAll ? 'Tunjuk kurang' : `Tunjuk semua ${floating.length} transaksi terapung`}
    </button>}
    {/* No capture attribute: a bank-transfer slip is usually a screenshot in the gallery, not a camera shot. */}
    <input ref={input} type="file" accept="image/*" className="hidden" aria-label="Gambar resit"
      onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; choose(file); }} />
    {cropSource && <DocumentCropper source={cropSource}
      onCancel={() => { closeCrop(); target.current = null; }}
      onDone={scan => { closeCrop(); void upload(scan); }} />}
  </section>;
}
