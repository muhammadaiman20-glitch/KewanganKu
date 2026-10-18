import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, ScanLine, RefreshCw, CheckCircle2, AlertCircle, X, SwitchCamera, Ellipsis, FileCheck2, LoaderCircle } from 'lucide-react';
import './ReceiptCamera.css';
import { DebtItem, ExpenseItem, FuelLogItem, TabType, VehicleItem } from '../types';
import { SAMPLE_RECEIPTS } from '../services/sampleReceipts';
import { localDate } from '../services/voiceCommand';
import { uploadProof } from '../services/proof';

type Extraction = {
  merchantName: string | null; amount: number | null; date: string | null;
  category: string; suggestedModule: string; rawText: string; amountEvidence: string | null;
  fuelDetails?: { litres: number | null; pricePerLitre: number | null; fuelType: string | null };
  debtDetails?: { referenceNo?: string }; subscriptionDetails?: { nextBillingDate?: string };
};
type OcrFuel = { vehicleId: string; vehiclePlate: string; station: string; amount: number; litres: number; pricePerLitre: number; fuelType: FuelLogItem['fuelType']; date: string; odometer: number; receiptUrl?: string };
interface OcrScannerScreenProps {
  initialModule?: 'debt' | 'subscription' | 'fuel' | 'auto';
  vehicles: VehicleItem[]; debts: DebtItem[];
  onSaveToDebt: (data: { debtId: string; creditor: string; amount: number; date: string; refNo?: string; notes?: string; receiptUrl?: string }) => void;
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
  const [starting, setStarting] = useState(false);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const scannerDialog = useRef<HTMLDialogElement>(null);
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const optionsDialog = useRef<HTMLDialogElement>(null);
  const cameraTicket = useRef(0);
  const openReview = () => { if (!reviewDialog.current?.open) reviewDialog.current?.showModal(); };
  const closeReview = () => reviewDialog.current?.close();
  useEffect(() => {
    const dialog = scannerDialog.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (dialog && !dialog.open) dialog.showModal();
    return () => { dialog?.close(); document.body.style.overflow = previous; };
  }, []);

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
  const stopCamera = () => { cameraTicket.current++; setStarting(false); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCamera(false); };
  useEffect(() => { alive.current = true; return () => { alive.current = false; sequence.current++; pending.current?.abort(); stream.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => { if (camera && video.current && stream.current) { video.current.srcObject = stream.current; void video.current.play().catch(() => setNotice('Kamera tidak dapat dimainkan. Cuba buka semula atau muat naik gambar.')); } }, [camera]);
  const startCamera = async (nextFacing = facing) => {
    stopCamera(); setNotice(''); setStarting(true);
    const ticket = ++cameraTicket.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      if (!alive.current || cameraTicket.current !== ticket) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media; setImage(null); setFacing(nextFacing); setCamera(true);
    } catch { if (alive.current && cameraTicket.current === ticket) setNotice('Kamera tidak tersedia atau akses ditolak. Benarkan kamera atau pilih gambar daripada galeri.'); }
    finally { if (alive.current && cameraTicket.current === ticket) setStarting(false); }
  };
  const scan = async (source: string) => {
    pending.current?.abort(); const id = ++sequence.current; const controller = new AbortController(); pending.current = controller;
    setBusy(true); setResult(null); setNotice(''); setSaved(false); setReviewed(false); stopCamera(); optionsDialog.current?.close(); openReview();
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
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving.current || saved || !reviewed) return;
    const total = Number(amount); if (!Number.isFinite(total) || total <= 0 || !merchant.trim() || !date || date > localDate()) { setNotice('Lengkapkan nama, jumlah positif dan tarikh transaksi yang sah.'); return; }
    saving.current = true;
    try {
      const v = vehicles.find(v => v.id === vehicleId); const qty = Number(litres); const odo = Number(odometer);
      if (category === 'fuel' && (!v || !fuelType || !Number.isFinite(qty) || qty <= 0 || !odometer || !Number.isFinite(odo) || odo < v.currentOdometer)) throw new Error('Pilih kenderaan, gred minyak, liter dan bacaan odometer sebenar (tidak kurang daripada bacaan semasa).');
      if (category === 'debt' && !debtId) throw new Error('Pilih hutang yang betul sebelum merekodkan bayaran.');
      if (category === 'subscription' && !renewal) throw new Error('Masukkan tarikh pembaharuan seterusnya. Tarikh resit bukan tarikh pembaharuan.');
      // The scanned receipt is the proof of payment. If the upload fails the record is still saved, as Terapung.
      let receiptUrl: string | undefined;
      if (category !== 'subscription' && image) {
        setNotice('Memuat naik resit sebagai bukti…');
        try { receiptUrl = await uploadProof(image); } catch { receiptUrl = undefined; }
      }
      if (category === 'fuel' && v) {
        onSaveToFuel({ vehicleId: v.id, vehiclePlate: v.plateNumber, station: merchant.trim(), amount: total, date, litres: qty, pricePerLitre: Number((total / qty).toFixed(4)), odometer: odo, fuelType: fuelType as FuelLogItem['fuelType'], receiptUrl });
      } else if (category === 'debt') {
        onSaveToDebt({ debtId, creditor: merchant.trim(), amount: total, date, refNo: result?.debtDetails?.referenceNo, notes: 'Bayaran daripada resit OCR yang disemak.', receiptUrl });
      } else if (category === 'subscription') {
        onSaveToSubscription({ name: merchant.trim(), amount: total, renewalDate: renewal, category: 'other' });
      } else onSaveExpense({ description: merchant.trim(), amount: total, date, source: 'ocr', receiptUrl });
      setSaved(true);
      setNotice(category === 'subscription' || receiptUrl ? 'Rekod berjaya disimpan dengan resit sebagai bukti.' : 'Rekod disimpan sebagai Terapung — resit gagal dimuat naik. Lampirkan semula dari papan pemuka.');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Rekod tidak dapat disimpan.'); }
    finally { saving.current = false; }
  };
  const leaveScanner = () => {
    if (result && !saved && !window.confirm('Keluar dan buang bacaan resit yang belum disimpan?')) return;
    onNavigate('dashboard');
  };
  const retake = () => {
    if (result && !saved && !window.confirm('Buang bacaan ini dan ambil gambar resit semula?')) return;
    optionsDialog.current?.close(); closeReview(); reset(); void startCamera();
  };
  return <dialog ref={scannerDialog} className="receipt-camera" aria-label="Pengimbas resit" onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); leaveScanner(); }}>
    <div className="receipt-camera-shell">
      <header className="receipt-camera-top">
        <button type="button" className="receipt-icon-button" onClick={leaveScanner} aria-label="Tutup pengimbas"><X size={22} /></button>
        <div className="receipt-camera-title"><ScanLine size={18} aria-hidden="true" /><div><h2>Imbas resit</h2><span>Cloudflare Workers AI</span></div></div>
        <button type="button" className="receipt-icon-button" aria-label="Pilihan pengimbas" onClick={() => optionsDialog.current?.showModal()}><Ellipsis size={24} /></button>
      </header>
      <div className="receipt-viewfinder" aria-label="Paparan kamera resit">
        {camera ? <video ref={video} autoPlay playsInline muted className={facing === 'user' ? 'is-front-camera' : ''} /> : image ? <img src={image} alt="Resit untuk disemak" /> : <div className="receipt-camera-empty"><div className="receipt-empty-icon"><Camera size={30} strokeWidth={1.4} aria-hidden="true" /></div><h3>Resit jelas. Rekod kemas.</h3><p>Letakkan seluruh resit dalam bingkai.<br />Elakkan bayang dan pantulan cahaya.</p><button type="button" disabled={starting} onClick={() => void startCamera()} className="receipt-start">{starting ? 'Membuka kamera…' : 'Buka kamera'}</button></div>}
        {camera && <div className="receipt-guides" aria-hidden="true"><i /><i /><i /><i /></div>}
        <div className="receipt-view-status"><span className={camera ? 'is-live' : ''} />{busy ? 'AI sedang membaca' : camera ? 'Kamera aktif' : image ? saved ? 'Rekod disimpan' : 'Gambar resit' : 'Sedia untuk imbasan'}</div>
        {camera && <button type="button" className="receipt-flip" disabled={starting} onClick={() => void startCamera(facing === 'environment' ? 'user' : 'environment')} aria-label="Tukar kamera depan atau belakang"><SwitchCamera size={22} /></button>}
        {busy && <button type="button" className="receipt-busy-overlay" onClick={openReview}><LoaderCircle className="receipt-spinner" size={30} /><span>Membaca resit…</span><small>Lihat kemajuan</small></button>}
      </div>
      <div className="receipt-mode"><span>RESIT</span><p>{image ? 'Semak jumlah dan tarikh sebelum menyimpan.' : 'Ambil gambar atau pilih daripada galeri.'}</p></div>
      <footer className="receipt-camera-deck">
        <button type="button" className="receipt-deck-button" disabled={busy || starting} onClick={() => input.current?.click()}><span className="receipt-deck-icon"><ImagePlus size={24} aria-hidden="true" /></span><span>Galeri</span></button>
        <button type="button" className="receipt-shutter" disabled={busy || starting} aria-label={camera ? 'Ambil gambar resit' : image ? 'Ambil semula resit' : 'Buka kamera resit'} onClick={() => { if (camera) capture(); else if (image) retake(); else void startCamera(); }}><span>{busy || starting ? <LoaderCircle className="receipt-spinner" size={30} /> : null}</span></button>
        <button type="button" className="receipt-deck-button" disabled={!image && !result && !busy} onClick={openReview}><span className="receipt-deck-icon receipt-thumbnail">{image ? <img src={image} alt="" /> : <FileCheck2 size={24} aria-hidden="true" />}{result && <b aria-hidden="true">1</b>}</span><span>{saved ? 'Disimpan' : 'Semak'}</span></button>
      </footer>
      <p className="receipt-camera-footnote" role="status">{notice && !result && !busy ? notice : 'Semakan anda diperlukan sebelum rekod disimpan.'}</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Fail resit" onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) { setNotice('Pilih gambar JPEG, PNG atau WebP sehingga 20 MB.'); return; }
        const url = URL.createObjectURL(file); try { await scan(url); } finally { URL.revokeObjectURL(url); }
      }} />
    </div>
    <dialog ref={reviewDialog} className="receipt-sheet" aria-label="Semakan hasil OCR" onCancel={event => { event.preventDefault(); event.stopPropagation(); closeReview(); }}>
      <div className="receipt-sheet-heading"><div><h2>{saved ? 'Resit disimpan' : 'Semak bacaan resit'}</h2><p>Workers AI · Semakan sebelum simpan</p></div><button type="button" className="receipt-icon-button" onClick={closeReview} aria-label="Kembali ke kamera"><X size={22} /></button></div>
      <div className="receipt-sheet-content" aria-busy={busy}>
        <p role="status" aria-live="polite" className="receipt-result-status">{busy ? <><LoaderCircle className="receipt-spinner" size={20} />Membaca teks dan menyemak jumlah resit…</> : notice || 'Pilih atau ambil gambar resit untuk bermula.'}</p>
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
        {busy && <button type="button" className="receipt-text-button" onClick={() => { reset(); closeReview(); }}>Batal imbasan</button>}
        {!result && !busy && <div className="receipt-retry"><AlertCircle size={26} /><p>Pastikan teks tajam dan seluruh resit kelihatan.</p><button type="button" onClick={retake} className="receipt-start">Ambil semula</button><button type="button" className="receipt-text-button" onClick={() => { closeReview(); input.current?.click(); }}>Pilih gambar lain</button></div>}
      </div>
    </dialog>
    <dialog ref={optionsDialog} className="receipt-sheet receipt-options" aria-label="Pilihan pengimbas" onCancel={event => { event.preventDefault(); event.stopPropagation(); optionsDialog.current?.close(); }}>
      <div className="receipt-sheet-heading"><h2>Pilihan pengimbas</h2><button type="button" className="receipt-icon-button" aria-label="Tutup pilihan" onClick={() => optionsDialog.current?.close()}><X size={22} /></button></div>
      <div className="receipt-sheet-content"><button type="button" className="receipt-option-button" disabled={busy} onClick={retake}><RefreshCw size={20} /><span>Ambil resit baharu<small>Buka kamera dan mula semula</small></span></button>
        <h3 className="receipt-sample-title">Cuba resit contoh</h3><p className="text-sm text-slate-300 mb-3">Data demonstrasi. Jangan simpan sebagai transaksi sebenar.</p>
        {SAMPLE_RECEIPTS.map(sample => <button type="button" key={sample.id} disabled={busy} className="receipt-option-button" onClick={() => void scan(sample.renderToDataUrl())}><FileCheck2 size={20} /><span>{sample.thumbnailTitle}<small>{sample.badge}</small></span></button>)}
        <p className="receipt-privacy">Gambar dihantar kepada Cloudflare untuk OCR. Aplikasi tidak menyimpan gambar pada pelayan.</p>
      </div>
    </dialog>
  </dialog>;
}
