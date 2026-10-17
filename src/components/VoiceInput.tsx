import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, X } from 'lucide-react';
import { ExpenseItem, FuelLogItem, TabType, VehicleItem } from '../types';
import { localDate, parseVoiceCommand } from '../services/voiceCommand';

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
type FuelInput = Omit<FuelLogItem, 'id' | 'efficiencyKmPerLitre' | 'costPerKm' | 'distanceTrip'>;
const fieldClass = 'w-full min-h-11 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400';

export function VoiceInput({ vehicles, screen, onSaveExpense, onSaveFuel }: {
  vehicles: VehicleItem[]; screen: TabType;
  onSaveExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
  onSaveFuel: (log: FuelInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [voiceSource, setVoiceSource] = useState(false);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState<ReturnType<typeof parseVoiceCommand> | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState(localDate);
  const recognition = useRef<Recognition | null>(null);
  const mounted = useRef(true);
  const saving = useRef(false);
  const sw = window as SpeechWindow;
  const supported = !!(sw.SpeechRecognition || sw.webkitSpeechRecognition) && window.isSecureContext;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; recognition.current?.abort(); }; }, []);
  // Stop recording when leaving a screen; retain the draft for review.
  useEffect(() => { recognition.current?.abort(); setListening(false); }, [screen]);
  const stop = () => recognition.current?.stop();
  const start = () => {
    if (recognition.current || listening) return;
    const Constructor = sw.SpeechRecognition || sw.webkitSpeechRecognition;
    if (!Constructor || !window.isSecureContext) return;
    setMessage(''); setText(''); setDraft(null);
    const instance = new Constructor();
    recognition.current = instance;
    instance.lang = 'ms-MY'; instance.continuous = false; instance.interimResults = true;
    instance.onresult = event => {
      if (!mounted.current || recognition.current !== instance) return;
      const result = Array.from(event.results).map(r => r[0].transcript).join(' ');
      setText(result); setVoiceSource(true);
    };
    instance.onerror = event => {
      if (!mounted.current || recognition.current !== instance) return;
      const errors: Record<string, string> = {
        'not-allowed': 'Akses mikrofon ditolak. Benarkan mikrofon dalam tetapan pelayar, atau taip arahan.',
        'service-not-allowed': 'Perkhidmatan suara tidak dibenarkan. Sila taip arahan.',
        'no-speech': 'Suara tidak dikesan. Cuba lagi atau taip arahan.',
        'audio-capture': 'Mikrofon tidak tersedia. Semak sambungan mikrofon.',
        network: 'Sambungan perkhidmatan suara gagal. Semak internet atau taip arahan.',
        'language-not-supported': 'Bahasa Melayu tidak disokong oleh perkhidmatan pelayar ini. Sila taip arahan.',
      };
      if (event.error !== 'aborted') setMessage(errors[event.error] || 'Pengecaman suara gagal. Cuba lagi atau taip arahan.');
    };
    instance.onend = () => { if (recognition.current === instance) { recognition.current = null; if (mounted.current) setListening(false); } };
    try { instance.start(); setListening(true); } catch { recognition.current = null; setMessage('Mikrofon tidak dapat dimulakan. Cuba lagi.'); }
  };
  const close = () => { recognition.current?.abort(); recognition.current = null; setListening(false); setOpen(false); setDraft(null); setText(''); setMessage(''); };
  const patch = (key: keyof NonNullable<typeof draft>, value: string) => setDraft(prev => prev ? { ...prev, [key]: value } : prev);
  return <section className="mb-5 rounded-2xl bg-slate-900 p-4" aria-label="Input suara">
    <div className="flex items-center justify-between gap-3">
      <button type="button" onClick={() => { setOpen(true); if (supported) start(); }} className="min-h-11 flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" aria-expanded={open} aria-controls="voice-panel"><Mic size={20} />Input Suara</button>
      {open && <button type="button" className="p-3 rounded-lg hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400" onClick={close} aria-label="Tutup input suara"><X size={20} /></button>}
    </div>
    {open && <div id="voice-panel" className="mt-4 space-y-4">
      <p className="text-sm text-slate-300">Contoh: “Tambah perbelanjaan makan tengah hari RM 15” atau “Isi minyak Shell RM 60, 30 liter, odometer 38500”.</p>
      <p className="text-xs text-slate-300">Suara diproses oleh perkhidmatan pelayar dan mungkin memerlukan internet. Tiada rekod disimpan sehingga anda menekan Simpan.</p>
      {!supported && <p className="text-sm text-amber-200">Pengecaman suara tidak tersedia. Buka melalui HTTPS dalam pelayar yang menyokongnya, atau taip arahan di bawah.</p>}
      <div role="status" aria-live="polite" className="text-sm text-emerald-200">{listening ? 'Sedang mendengar… Tekan Henti apabila selesai.' : message || 'Sebut atau taip arahan, kemudian semak rekod.'}</div>
      {supported && <button type="button" onClick={listening ? stop : start} className="min-h-11 flex gap-2 items-center rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800">{listening ? <Square size={18} /> : <Mic size={18} />}{listening ? 'Henti' : 'Rakam semula'}</button>}
      <label className="block text-sm">Arahan<textarea value={text} onChange={e => { setText(e.target.value); setVoiceSource(false); setDraft(null); }} disabled={listening} rows={2} className={`${fieldClass} mt-1`} /></label>
      <button type="button" disabled={listening || !text.trim()} className="min-h-11 rounded-lg bg-slate-700 px-4 py-2 disabled:opacity-50" onClick={() => { setDraft(parseVoiceCommand(text, screen === 'fuel')); setVehicleId(vehicles.length === 1 ? vehicles[0].id : ''); setDate(localDate()); setMessage(''); }}>Semak rekod</button>
      {draft && <form className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-700 pt-4" onSubmit={e => {
        e.preventDefault(); if (saving.current) return;
        const amount = Number(draft.amount);
        if (!Number.isFinite(amount) || amount <= 0 || !date || date > localDate()) { setMessage('Masukkan jumlah positif dan tarikh hari ini atau sebelumnya.'); return; }
        if (draft.kind === 'expense' && !draft.description.trim()) { setMessage('Masukkan keterangan perbelanjaan.'); return; }
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const litres = Number(draft.litres), odometer = Number(draft.odometer);
        if (draft.kind === 'fuel' && (!vehicle || !draft.station.trim() || !draft.fuelType || !Number.isFinite(litres) || litres <= 0 || !draft.odometer || !Number.isFinite(odometer) || odometer < vehicle.currentOdometer)) { setMessage('Lengkapkan kenderaan, stesen, jenis minyak, liter dan odometer yang tidak kurang daripada bacaan semasa.'); return; }
        saving.current = true;
        try {
          if (draft.kind === 'expense') onSaveExpense({ description: draft.description.trim(), amount, date, source: voiceSource ? 'voice' : 'manual' });
          else onSaveFuel({ vehicleId: vehicle!.id, vehiclePlate: vehicle!.plateNumber, date, station: draft.station.trim(), fuelType: draft.fuelType as FuelLogItem['fuelType'], amount, litres, pricePerLitre: Number((amount / litres).toFixed(4)), odometer, notes: text });
          close();
        } finally { saving.current = false; }
      }}>
        <label className="text-sm">Jenis rekod<select className={`${fieldClass} mt-1`} value={draft.kind} onChange={e => patch('kind', e.target.value)}><option value="expense">Perbelanjaan</option><option value="fuel">Log minyak</option></select></label>
        <label className="text-sm">Jumlah (RM)<input required type="number" min="0.01" step="0.01" value={draft.amount} onChange={e => patch('amount', e.target.value)} className={`${fieldClass} mt-1`} /></label>
        <label className="text-sm">Tarikh<input required type="date" max={localDate()} value={date} onChange={e => setDate(e.target.value)} className={`${fieldClass} mt-1`} /></label>
        {draft.kind === 'expense' ? <label className="text-sm">Keterangan<input required value={draft.description} onChange={e => patch('description', e.target.value)} className={`${fieldClass} mt-1`} /></label> : <>
          <label className="text-sm">Kenderaan<select required value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={`${fieldClass} mt-1`}><option value="">Pilih kenderaan</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plateNumber})</option>)}</select></label>
          {!vehicles.length && <p className="text-amber-200 text-sm">Tambah kenderaan pada skrin Kenderaan dahulu.</p>}
          <label className="text-sm">Stesen<input required value={draft.station} onChange={e => patch('station', e.target.value)} className={`${fieldClass} mt-1`} /></label>
          <label className="text-sm">Jenis minyak<select required value={draft.fuelType} onChange={e => patch('fuelType', e.target.value)} className={`${fieldClass} mt-1`}><option value="">Pilih jenis</option>{['RON95', 'RON97', 'RON100', 'Diesel'].map(t => <option key={t}>{t}</option>)}</select></label>
          <label className="text-sm">Liter<input required type="number" min="0.001" step="0.001" value={draft.litres} onChange={e => patch('litres', e.target.value)} className={`${fieldClass} mt-1`} /></label>
          <label className="text-sm">Odometer (km)<input required type="number" min={vehicles.find(v => v.id === vehicleId)?.currentOdometer ?? 0} step="1" value={draft.odometer} onChange={e => patch('odometer', e.target.value)} className={`${fieldClass} mt-1`} /></label>
        </>}
        <div className="sm:col-span-2 flex gap-3"><button type="submit" className="min-h-11 rounded-lg bg-emerald-400 px-5 py-2 font-bold text-slate-950">Simpan rekod</button><button type="button" onClick={close} className="min-h-11 px-4 py-2 rounded-lg hover:bg-slate-800">Batal</button></div>
      </form>}
    </div>}
  </section>;
}
