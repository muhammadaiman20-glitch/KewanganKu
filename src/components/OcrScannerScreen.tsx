import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload, ScanLine, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { DebtItem, ExpenseItem, FuelLogItem, TabType, VehicleItem } from '../types';
import { SAMPLE_RECEIPTS } from '../services/sampleReceipts';
import { localDate } from '../services/voiceCommand';

type Extraction = {
  merchantName: string | null; amount: number | null; date: string | null;
  category: string; suggestedModule: string; rawText: string; amountEvidence: string | null;
  fuelDetails?: { litres: number | null; pricePerLitre: number | null; fuelType: string | null };
  debtDetails?: { referenceNo?: string }; subscriptionDetails?: { nextBillingDate?: string };
};
type OcrFuel = { vehicleId: string; vehiclePlate: string; station: string; amount: number; litres: number; pricePerLitre: number; fuelType: FuelLogItem['fuelType']; date: string; odometer: number };
interface OcrScannerScreenProps {
  initialModule?: 'debt' | 'subscription' | 'fuel' | 'auto';
  vehicles: VehicleItem[]; debts: DebtItem[];
  onSaveToDebt: (data: { debtId: string; creditor: string; amount: number; date: string; refNo?: string; notes?: string }) => void;
  onSaveToSubscription: (data: { name: string; amount: number; renewalDate: string; category?: string }) => void;
  onSaveToFuel: (data: OcrFuel) => void;
  onSaveExpense: (data: Omit<ExpenseItem, 'id'>) => void;
  onNavigate: (tab: TabType) => void;
}
const control = 'w-full min-h-11 rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-emerald-400';

async function prepareImage(dataUrl: string): Promise<string> {
  const img = new Image(); img.src = dataUrl; await img.decode();
  if (!img.width || !img.height) throw new Error('Gambar tidak dapat dibaca.');
  const scale = Math.min(1, 2200 / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Pelayar tidak dapat menyediakan gambar.');
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const output = canvas.toDataURL('image/jpeg', 0.94);
  if (output.length > 7 * 1024 * 1024) throw new Error('Gambar terlalu besar. Potong gambar kepada bahagian resit dan cuba lagi.');
  return output;
}

export function OcrScannerScreen({ initialModule = 'auto', vehicles, debts, onSaveToDebt, onSaveToSubscription, onSaveToFuel, onSaveExpense, onNavigate }: OcrScannerScreenProps) {
  const [image, setImage] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<Extraction | null>(null);
  const [merchant, setMerchant] = useState(''); const [amount, setAmount] = useState(''); const [date, setDate] = useState('');
  const [category, setCategory] = useState(initialModule === 'auto' ? 'expense' : initialModule);
  const [litres, setLitres] = useState(''); const [fuelType, setFuelType] = useState('');
  const [vehicleId, setVehicleId] = useState(''); const [odometer, setOdometer] = useState('');
  const [debtId, setDebtId] = useState(''); const [renewal, setRenewal] = useState('');
  const [reviewed, setReviewed] = useState(false); const [saved, setSaved] = useState(false);
  const video = useRef<HTMLVideoElement>(null); const input = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null); const pending = useRef<AbortController | null>(null);
  const sequence = useRef(0); const alive = useRef(true); const saving = useRef(false);
  const stopCamera = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCamera(false); };
  useEffect(() => { alive.current = true; return () => { alive.current = false; sequence.current++; pending.current?.abort(); stream.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => { if (camera && video.current && stream.current) { video.current.srcObject = stream.current; void video.current.play().catch(() => setNotice('Kamera tidak dapat dimainkan. Cuba buka semula atau muat naik gambar.')); } }, [camera]);
  const startCamera = async () => {
    stopCamera(); setNotice('');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      if (!alive.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media; setImage(null); setCamera(true);
    } catch { if (alive.current) setNotice('Kamera tidak tersedia atau akses ditolak. Benarkan kamera atau muat naik gambar resit.'); }
  };
  const scan = async (source: string) => {
    pending.current?.abort(); const id = ++sequence.current; const controller = new AbortController(); pending.current = controller;
    setBusy(true); setResult(null); setNotice(''); setSaved(false); setReviewed(false); stopCamera();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const prepared = await prepareImage(source); if (!alive.current || sequence.current !== id) return;
      setImage(prepared);
      const response = await fetch('/api/scan-receipt', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: prepared }), signal: controller.signal });
      if (response.redirected || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Sesi log masuk tamat. Muat semula laman dan log masuk semula.');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Imbasan gagal. Sila cuba lagi.');
      const data: Extraction = payload.data; if (!data?.rawText) throw new Error('Resit tidak dapat dibaca. Ambil semula gambar yang lebih jelas.');
      if (!alive.current || sequence.current !== id) return;
      setResult(data); setMerchant(data.merchantName || ''); setAmount(data.amount == null ? '' : String(data.amount)); setDate(data.date || '');
      setCategory(['fuel', 'subscription', 'debt'].includes(data.suggestedModule) ? data.suggestedModule : 'expense');
      setLitres(data.fuelDetails?.litres == null ? '' : String(data.fuelDetails.litres)); setFuelType(data.fuelDetails?.fuelType || '');
      setVehicleId(''); setOdometer(''); setDebtId(''); setRenewal(data.subscriptionDetails?.nextBillingDate || '');
      setNotice(payload.warning || 'Semak maklumat sebelum menyimpan.');
    } catch (e) { if (alive.current && sequence.current === id) setNotice(e instanceof Error && e.name === 'AbortError' ? 'Imbasan mengambil masa terlalu lama. Cuba lagi.' : e instanceof Error ? e.message : 'Imbasan gagal. Cuba lagi.'); }
    finally { clearTimeout(timeout); if (alive.current && sequence.current === id) { setBusy(false); pending.current = null; } }
  };
  const capture = () => { const v = video.current; if (!v?.videoWidth) { setNotice('Tunggu sehingga kamera bersedia.'); return; } const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d')?.drawImage(v, 0, 0); void scan(c.toDataURL('image/jpeg', 0.94)); };
  const reset = () => { sequence.current++; pending.current?.abort(); stopCamera(); setBusy(false); setImage(null); setResult(null); setNotice(''); setSaved(false); setReviewed(false); };
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); if (saving.current || saved || !reviewed) return;
    const total = Number(amount); if (!Number.isFinite(total) || total <= 0 || !merchant.trim() || !date || date > localDate()) { setNotice('Lengkapkan nama, jumlah positif dan tarikh transaksi yang sah.'); return; }
    saving.current = true;
    try {
      if (category === 'fuel') {
        const v = vehicles.find(v => v.id === vehicleId); const qty = Number(litres); const odo = Number(odometer);
        if (!v || !fuelType || !Number.isFinite(qty) || qty <= 0 || !odometer || !Number.isFinite(odo) || odo < v.currentOdometer) throw new Error('Pilih kenderaan, gred minyak, liter dan bacaan odometer sebenar (tidak kurang daripada bacaan semasa).');
        onSaveToFuel({ vehicleId: v.id, vehiclePlate: v.plateNumber, station: merchant.trim(), amount: total, date, litres: qty, pricePerLitre: Number((total / qty).toFixed(4)), odometer: odo, fuelType: fuelType as FuelLogItem['fuelType'] });
      } else if (category === 'debt') {
        if (!debtId) throw new Error('Pilih hutang yang betul sebelum merekodkan bayaran.');
        onSaveToDebt({ debtId, creditor: merchant.trim(), amount: total, date, refNo: result?.debtDetails?.referenceNo, notes: 'Bayaran daripada resit OCR yang disemak.' });
      } else if (category === 'subscription') {
        if (!renewal) throw new Error('Masukkan tarikh pembaharuan seterusnya. Tarikh resit bukan tarikh pembaharuan.');
        onSaveToSubscription({ name: merchant.trim(), amount: total, renewalDate: renewal, category: 'other' });
      } else onSaveExpense({ description: merchant.trim(), amount: total, date, source: 'ocr' });
      setSaved(true); setNotice('Rekod berjaya disimpan.');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Rekod tidak dapat disimpan.'); }
    finally { saving.current = false; }
  };
  return <div className="space-y-5 pb-8">
    <header><h2 className="text-xl font-bold flex gap-2 items-center"><ScanLine className="text-emerald-300" />Imbas resit</h2><p className="text-sm text-slate-300 mt-2">Cloudflare Workers AI membaca nama peniaga, jumlah, tarikh dan butiran minyak. Semak bacaan sebelum menyimpan.</p></header>
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      <section className="space-y-4" aria-label="Gambar resit">
        <div className="rounded-2xl bg-slate-900 overflow-hidden min-h-48 flex justify-center items-center">
          {camera ? <video ref={video} autoPlay playsInline muted className="w-full max-h-[65vh] object-contain" /> : image ? <img src={image} alt="Resit untuk disemak" className="max-h-[65vh] w-full object-contain" /> : <div className="p-8 text-center text-slate-300"><ScanLine className="mx-auto mb-3" size={32} /><p>Pastikan seluruh resit jelas, lurus dan tidak silau.</p></div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={camera ? capture : startCamera} className="min-h-11 px-4 py-2 rounded-xl bg-emerald-400 text-slate-950 font-semibold inline-flex gap-2 items-center disabled:opacity-50"><Camera size={18} />{camera ? 'Ambil gambar' : 'Buka kamera'}</button>
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="min-h-11 px-4 py-2 rounded-xl bg-slate-800 font-semibold inline-flex gap-2 items-center disabled:opacity-50"><Upload size={18} />Muat naik</button>
          {(image || camera || busy) && <button type="button" onClick={reset} className="min-h-11 px-4 py-2 rounded-xl bg-slate-800 inline-flex gap-2 items-center"><RefreshCw size={18} />{busy ? 'Batal' : 'Mula semula'}</button>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Fail resit" onChange={async event => {
          const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) { setNotice('Pilih gambar JPEG, PNG atau WebP sehingga 20 MB.'); return; }
          const url = URL.createObjectURL(file); try { await scan(url); } finally { URL.revokeObjectURL(url); }
        }} />
        <p className="text-xs text-slate-300">Gambar dihantar kepada Cloudflare untuk imbasan. Aplikasi tidak menyimpan gambar pada pelayan.</p>
        <details className="rounded-xl bg-slate-900 p-4"><summary className="cursor-pointer text-sm font-semibold">Cuba resit contoh</summary><p className="text-xs text-slate-300 my-3">Data demonstrasi. Jangan simpan sebagai transaksi sebenar.</p><div className="flex flex-wrap gap-2">{SAMPLE_RECEIPTS.map(sample => <button type="button" key={sample.id} disabled={busy} onClick={() => void scan(sample.renderToDataUrl())} className="min-h-11 rounded-lg bg-slate-800 px-3 text-sm disabled:opacity-50">{sample.thumbnailTitle}</button>)}</div></details>
      </section>
      <section className="rounded-2xl bg-slate-900 p-4 sm:p-5 space-y-4" aria-label="Semakan hasil OCR" aria-busy={busy}>
        <div className="flex justify-between gap-3 items-center"><h3 className="font-bold">Semak hasil bacaan</h3><span className="text-xs text-emerald-300">Workers AI · Vision</span></div>
        <p role="status" aria-live="polite" className="text-sm text-emerald-200">{busy ? 'Membaca teks dan menyemak jumlah resit…' : notice || 'Hasil bacaan akan muncul selepas imbasan.'}</p>
        {result && <>
          {result.amountEvidence && <p className="text-sm text-slate-300">Bukti jumlah: <strong className="text-white">{result.amountEvidence}</strong></p>}
          <details><summary className="cursor-pointer text-sm text-emerald-300">Lihat teks yang dibaca</summary><pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-300 max-h-56 overflow-y-auto font-sans">{result.rawText}</pre></details>
          <form onSubmit={submit} className="space-y-4" onChange={() => setReviewed(false)}>
            <fieldset disabled={saved} className="space-y-4 disabled:opacity-60">
              <label className="block text-sm">Nama peniaga / keterangan<input required className={`${control} mt-1`} value={merchant} onChange={e => setMerchant(e.target.value)} /></label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-sm">Jumlah (RM)<input required type="number" min="0.01" step="0.01" className={`${control} mt-1`} value={amount} onChange={e => setAmount(e.target.value)} /></label>
                <label className="block text-sm">Tarikh transaksi<input required type="date" max={localDate()} className={`${control} mt-1`} value={date} onChange={e => setDate(e.target.value)} /></label>
              </div>
              <label className="block text-sm">Simpan sebagai<select className={`${control} mt-1`} value={category} onChange={e => setCategory(e.target.value)}><option value="expense">Perbelanjaan harian / bil dibayar</option><option value="fuel">Log minyak</option><option value="subscription">Langganan</option><option value="debt">Bayaran hutang</option></select></label>
              {category === 'fuel' && <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-sm sm:col-span-2">Kenderaan<select required className={`${control} mt-1`} value={vehicleId} onChange={e => setVehicleId(e.target.value)}><option value="">Pilih kenderaan</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plateNumber})</option>)}</select></label>
                <label className="block text-sm">Liter<input required type="number" min="0.001" step="0.001" className={`${control} mt-1`} value={litres} onChange={e => setLitres(e.target.value)} /></label>
                <label className="block text-sm">Gred minyak<select required className={`${control} mt-1`} value={fuelType} onChange={e => setFuelType(e.target.value)}><option value="">Pilih gred</option>{['RON95', 'RON97', 'RON100', 'Diesel'].map(type => <option key={type}>{type}</option>)}</select></label>
                <label className="block text-sm sm:col-span-2">Odometer sebenar (km)<input required type="number" step="1" min={vehicles.find(v => v.id === vehicleId)?.currentOdometer || 0} className={`${control} mt-1`} value={odometer} onChange={e => setOdometer(e.target.value)} /></label>
              </div>}
              {category === 'debt' && <label className="block text-sm">Bayar kepada hutang<select required className={`${control} mt-1`} value={debtId} onChange={e => setDebtId(e.target.value)}><option value="">Pilih hutang yang betul</option>{debts.filter(d => d.status === 'active').map(d => <option key={d.id} value={d.id}>{d.title} — {d.creditor}</option>)}</select></label>}
              {category === 'subscription' && <label className="block text-sm">Pembaharuan seterusnya<input required type="date" className={`${control} mt-1`} value={renewal} onChange={e => setRenewal(e.target.value)} /></label>}
              <label className="flex gap-3 items-start text-sm text-slate-200 py-2"><input type="checkbox" required checked={reviewed} onChange={e => { e.stopPropagation(); setReviewed(e.target.checked); }} className="mt-1 size-5 accent-emerald-400 shrink-0" />Saya sudah semak jumlah, tarikh dan modul dengan resit asal.</label>
              <button type="submit" disabled={!reviewed || saved} className="min-h-12 w-full rounded-xl bg-emerald-400 text-slate-950 font-bold flex gap-2 justify-center items-center disabled:opacity-40"><CheckCircle2 size={19} />{saved ? 'Rekod disimpan' : 'Sahkan & simpan'}</button>
            </fieldset>
          </form>
          {saved && <button type="button" className="min-h-11 text-emerald-300 underline" onClick={() => onNavigate(category === 'expense' ? 'dashboard' : category as TabType)}>Lihat rekod</button>}
        </>}
        {!result && !busy && <p className="text-sm text-slate-400 flex gap-2"><AlertCircle size={18} className="shrink-0" />Bacaan yang kabur akan diminta untuk diimbas semula. Tiada data contoh digunakan sebagai gantian.</p>}
      </section>
    </div>
  </div>;
}
