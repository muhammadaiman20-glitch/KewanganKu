import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Crop, LoaderCircle, Maximize, ScanText, Wand2 } from 'lucide-react';
import { Pixels, Quad, ScanFilter, detectQuad, enhance, fullFrame, warp } from '../services/docScan';
import './ReceiptCamera.css';

// Document mode for a receipt photo: auto-detected corners you can drag, then a straightened, cleaned scan.
// Returns a JPEG data URL of the final scan through onDone.
const FILTERS: { id: ScanFilter; label: string; hint: string }[] = [
  { id: 'document', label: 'Dokumen', hint: 'Putih bersih, teks tajam' },
  { id: 'color', label: 'Warna', hint: 'Kekalkan warna, buang bayang' },
  { id: 'original', label: 'Asal', hint: 'Tanpa penapis' },
];
const WORK_MAX = 2400; // longest side the photo is processed at

function toPixels(img: HTMLImageElement): Pixels {
  const s = Math.min(1, WORK_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
  const ctx = c.getContext('2d', { willReadFrequently: true }); if (!ctx) throw new Error('Pelayar tidak dapat memproses gambar.');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  return { width: d.width, height: d.height, data: d.data };
}
function toDataUrl(p: Pixels, quality: number): string {
  const c = document.createElement('canvas'); c.width = p.width; c.height = p.height;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(p.data), p.width, p.height), 0, 0);
  return c.toDataURL('image/jpeg', quality);
}
const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

// onScanReady fires with each newly cropped scan, so the caller can start the AI read before the owner confirms.
export function DocumentCropper({ source, onCancel, onDone, onScanReady }: { source: string; onCancel: () => void; onDone: (dataUrl: string) => void; onScanReady?: (dataUrl: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pixels = useRef<Pixels | null>(null);
  const flat = useRef<Pixels | null>(null);
  const [preview, setPreview] = useState<string | null>(null); // working photo shown under the handles
  const [quad, setQuad] = useState<Quad | null>(null);
  const [found, setFound] = useState(true);
  const [step, setStep] = useState<'crop' | 'result'>('crop');
  const [filter, setFilter] = useState<ScanFilter>('document');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [box, setBox] = useState({ x: 0, y: 0, s: 1 }); // where the photo sits inside the stage
  const [drag, setDrag] = useState<number | null>(null);

  useEffect(() => { const d = dialog.current; if (d && !d.open) d.showModal(); return () => d?.close(); }, []);

  // Load the photo, then detect the receipt.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const img = new Image(); img.src = source; await img.decode();
        const p = toPixels(img); if (!alive) return;
        pixels.current = p; setPreview(toDataUrl(p, 0.85));
        await nextFrame();
        const { quad: q, confidence } = detectQuad(p); if (!alive) return;
        setQuad(q); setFound(confidence > 0);
      } catch { if (alive) setError('Gambar tidak dapat dibaca. Ambil semula.'); }
      finally { if (alive) setBusy(false); }
    })();
    return () => { alive = false; };
  }, [source]);

  // Fit the photo in the stage (object-fit: contain) and remember the mapping for the handles.
  useLayoutEffect(() => {
    const el = stage.current, p = pixels.current; if (!el || !p || step !== 'crop') return;
    const fit = () => { const r = el.getBoundingClientRect(); const s = Math.min(r.width / p.width, r.height / p.height); setBox({ x: (r.width - p.width * s) / 2, y: (r.height - p.height * s) / 2, s }); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, [preview, step]);

  const toScreen = (pt: { x: number; y: number }) => ({ x: box.x + pt.x * box.s, y: box.y + pt.y * box.s });
  const move = (e: React.PointerEvent) => {
    if (drag === null || !quad || !pixels.current) return;
    const r = stage.current!.getBoundingClientRect(), p = pixels.current;
    const x = Math.min(p.width, Math.max(0, (e.clientX - r.left - box.x) / box.s)), y = Math.min(p.height, Math.max(0, (e.clientY - r.top - box.y) / box.s));
    const next = [...quad] as Quad; next[drag] = { x, y }; setQuad(next);
  };

  const render = async (q: Quad, f: ScanFilter, reuseFlat: boolean) => {
    if (!pixels.current) return;
    setBusy(true); setError(''); await nextFrame();
    try {
      const fresh = !reuseFlat || !flat.current;
      if (fresh) flat.current = warp(pixels.current, q);
      const scan = toDataUrl(enhance(flat.current!, f), f === 'document' ? 0.82 : 0.86);
      setResult(scan); setStep('result');
      // A new crop: the text is the same whatever filter is picked next, so the AI can start reading now.
      if (fresh) onScanReady?.(scan);
    } catch (e) { setError(e instanceof Error ? e.message : 'Imbasan tidak dapat diproses.'); }
    finally { setBusy(false); }
  };

  const screenQuad = quad?.map(toScreen);
  const loupe = drag !== null && quad && preview ? quad[drag] : null;

  return <dialog ref={dialog} className="doc-scan" aria-label="Mod dokumen resit" onCancel={e => { e.preventDefault(); e.stopPropagation(); if (step === 'result') setStep('crop'); else onCancel(); }}>
    <header className="receipt-sheet-heading doc-scan-heading">
      <button type="button" className="receipt-icon-button" aria-label={step === 'result' ? 'Kembali ke potongan' : 'Ambil semula'} onClick={() => (step === 'result' ? setStep('crop') : onCancel())}><ArrowLeft size={22} /></button>
      <div className="doc-scan-title"><h2>{step === 'crop' ? 'Laraskan bucu resit' : 'Imbasan dokumen'}</h2>
        <p>{step === 'crop' ? (found ? 'Bucu dikesan automatik — seret jika perlu' : 'Resit tidak dikesan — seret bucu ke tepi kertas') : 'Dipotong, diluruskan dan dibersihkan'}</p></div>
      <span className="w-11" aria-hidden="true" />
    </header>

    {step === 'crop' ? <>
      <div ref={stage} className="doc-scan-stage" onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
        {preview && <img src={preview} alt="Gambar resit asal" draggable={false} style={{ left: box.x, top: box.y, width: (pixels.current?.width || 0) * box.s, height: (pixels.current?.height || 0) * box.s }} />}
        {screenQuad && <svg className="doc-scan-overlay" aria-hidden="true">
          <path fillRule="evenodd" d={`M0 0H9999V9999H0Z M${screenQuad.map(p => `${p.x} ${p.y}`).join(' L')}Z`} className="doc-scan-shade" />
          <polygon points={screenQuad.map(p => `${p.x},${p.y}`).join(' ')} className="doc-scan-edge" />
        </svg>}
        {screenQuad?.map((p, i) => <button key={i} type="button" className={`doc-scan-handle${drag === i ? ' is-active' : ''}`} style={{ left: p.x, top: p.y }}
          aria-label={['Bucu atas kiri', 'Bucu atas kanan', 'Bucu bawah kanan', 'Bucu bawah kiri'][i]}
          onPointerDown={e => { e.preventDefault(); stage.current?.setPointerCapture(e.pointerId); setDrag(i); }}
          onKeyDown={e => { // arrow keys nudge the corner
            const step = e.shiftKey ? 20 : 4, dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0, dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
            if ((!dx && !dy) || !quad) return; e.preventDefault(); const next = [...quad] as Quad; next[i] = { x: quad[i].x + dx, y: quad[i].y + dy }; setQuad(next);
          }} />)}
        {loupe && <div className="doc-scan-loupe" aria-hidden="true" style={{
          backgroundImage: `url(${preview})`, backgroundSize: `${(pixels.current?.width || 0) * box.s * 2.5}px ${(pixels.current?.height || 0) * box.s * 2.5}px`,
          backgroundPosition: `${48 - loupe.x * box.s * 2.5}px ${48 - loupe.y * box.s * 2.5}px`,
        }}><i /></div>}
        {busy && <div className="doc-scan-busy"><LoaderCircle className="receipt-spinner" size={28} /><span>{preview ? 'Memproses…' : 'Mengesan resit…'}</span></div>}
      </div>
      <div className="doc-scan-tools">
        <button type="button" className="doc-scan-tool" disabled={busy || !pixels.current} onClick={() => { const p = pixels.current!; const r = detectQuad(p); setQuad(r.quad); setFound(r.confidence > 0); flat.current = null; }}><Wand2 size={18} /><span>Auto</span></button>
        <button type="button" className="doc-scan-tool" disabled={busy || !pixels.current} onClick={() => { const p = pixels.current!; setQuad(fullFrame(p.width, p.height)); flat.current = null; }}><Maximize size={18} /><span>Penuh</span></button>
        <button type="button" className="doc-scan-next" disabled={busy || !quad} onClick={() => { flat.current = null; void render(quad!, filter, false); }}><Crop size={18} /><span>Potong & imbas</span></button>
      </div>
    </> : <>
      <div className="doc-scan-stage doc-scan-result">
        {result && <img src={result} alt="Resit selepas mod dokumen" />}
        {busy && <div className="doc-scan-busy"><LoaderCircle className="receipt-spinner" size={28} /><span>Memproses…</span></div>}
      </div>
      <div className="doc-scan-filters" role="radiogroup" aria-label="Penapis imbasan">
        {FILTERS.map(f => <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} disabled={busy} className={`doc-scan-filter${filter === f.id ? ' is-active' : ''}`}
          onClick={() => { setFilter(f.id); void render(quad!, f.id, true); }}><ScanText size={16} aria-hidden="true" /><span>{f.label}<small>{f.hint}</small></span></button>)}
      </div>
      <div className="doc-scan-tools">
        <button type="button" className="doc-scan-tool" disabled={busy} onClick={() => setStep('crop')}><Crop size={18} /><span>Potong semula</span></button>
        <button type="button" className="doc-scan-next" disabled={busy || !result} onClick={() => result && onDone(result)}><Check size={18} /><span>Guna imbasan</span></button>
      </div>
    </>}
    {error && <p role="alert" className="doc-scan-error">{error}</p>}
  </dialog>;
}
