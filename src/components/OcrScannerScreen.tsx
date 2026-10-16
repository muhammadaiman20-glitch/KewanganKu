import React, { useState, useRef, useEffect } from 'react';
import {
  ScanLine,
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Receipt,
  Fuel,
  CreditCard,
  Repeat,
  Zap,
  Image as ImageIcon,
  Sliders,
  Check,
} from 'lucide-react';
import { FuelLogItem, OcrScanResult, TabType, VehicleItem } from '../types';
import { SAMPLE_RECEIPTS, SampleReceipt } from '../services/sampleReceipts';
import { formatRM } from '../services/storage';

interface OcrScannerScreenProps {
  initialModule?: 'debt' | 'subscription' | 'fuel' | 'auto';
  vehicles: VehicleItem[];
  onSaveToDebt: (data: { creditor: string; amount: number; date: string; refNo?: string; notes?: string }) => void;
  onSaveToSubscription: (data: { name: string; amount: number; renewalDate: string; category?: string }) => void;
  onSaveToFuel: (data: {
    vehicleId: string;
    vehiclePlate: string;
    station: string;
    amount: number;
    litres: number;
    pricePerLitre: number;
    fuelType: 'RON95' | 'RON97' | 'Diesel' | 'RON100';
    date: string;
  }) => void;
  onNavigate: (tab: TabType) => void;
}

export const OcrScannerScreen: React.FC<OcrScannerScreenProps> = ({
  initialModule = 'auto',
  vehicles,
  onSaveToDebt,
  onSaveToSubscription,
  onSaveToFuel,
  onNavigate,
}) => {
  const [selectedModule, setSelectedModule] = useState<'auto' | 'fuel' | 'subscription' | 'debt'>(initialModule);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<OcrScanResult | null>(null);
  const [scanEngine, setScanEngine] = useState<string>('gemini-3.8-flash');
  const [engineNotice, setEngineNotice] = useState<string | null>(null);

  // Editable result fields before saving
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<'fuel' | 'subscription' | 'debt'>('fuel');
  const [litres, setLitres] = useState('');
  const [fuelType, setFuelType] = useState<'RON95' | 'RON97' | 'Diesel' | 'RON100'>('RON95');
  const [selectedVehId, setSelectedVehId] = useState(vehicles[0]?.id || '');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Kamera tidak dapat diakses atau disekat oleh pelayar. Anda boleh muat naik fail atau gunakan resit contoh segera di bawah.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    // Start camera by default if supported
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      stopCamera();
      triggerOcrScan(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCapturedImage(base64);
      stopCamera();
      triggerOcrScan(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSampleReceipt = (sample: SampleReceipt) => {
    const dataUrl = sample.renderToDataUrl();
    setCapturedImage(dataUrl);
    stopCamera();
    triggerOcrScan(dataUrl);
  };

  const triggerOcrScan = async (imageBase64: string) => {
    setScanning(true);
    setScanResult(null);
    setSaveSuccess(null);
    setEngineNotice(null);

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: 'image/jpeg',
          targetModule: selectedModule,
        }),
      });

      const resData = await response.json();
      const extracted: OcrScanResult = resData.data;

      setScanEngine(resData.source || 'gemini-3.8-flash');
      if (resData.warning) {
        setEngineNotice(resData.warning);
      }

      setScanResult(extracted);
      // Populate editable fields
      setMerchant(extracted.merchantName || 'Peniaga Tidak Dikenali');
      setAmount((extracted.amount || 0).toString());
      setDate(extracted.date || new Date().toISOString().split('T')[0]);

      const inferredCat = (extracted.suggestedModule || extracted.category || 'fuel') as 'fuel' | 'subscription' | 'debt';
      setCategory(inferredCat);

      if (extracted.fuelDetails) {
        setLitres((extracted.fuelDetails.litres || 0).toString());
        if (extracted.fuelDetails.fuelType === 'RON97') setFuelType('RON97');
        else if (extracted.fuelDetails.fuelType === 'Diesel') setFuelType('Diesel');
        else setFuelType('RON95');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setEngineNotice('Gagal berhubung ke pelayan OCR. Sila cuba lagi.');
    } finally {
      setScanning(false);
    }
  };

  const handleCommitSave = () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return;

    if (category === 'fuel') {
      const v = vehicles.find((x) => x.id === selectedVehId) || vehicles[0];
      const ltr = parseFloat(litres) || numAmount / 2.05;
      const priceLtr = numAmount / (ltr || 1);

      onSaveToFuel({
        vehicleId: v?.id || 'veh-1',
        vehiclePlate: v?.plateNumber || 'VHY 8821',
        station: merchant,
        amount: numAmount,
        litres: parseFloat(ltr.toFixed(2)),
        pricePerLitre: parseFloat(priceLtr.toFixed(2)),
        fuelType,
        date: date || new Date().toISOString().split('T')[0],
      });
      setSaveSuccess(`Berjaya disimpan ke Log Minyak ${v?.plateNumber || ''}!`);
    } else if (category === 'subscription') {
      onSaveToSubscription({
        name: merchant,
        amount: numAmount,
        renewalDate: date || new Date().toISOString().split('T')[0],
        category: 'entertainment',
      });
      setSaveSuccess(`Berjaya disimpan ke Pengurusan Langganan (${merchant})!`);
    } else if (category === 'debt') {
      onSaveToDebt({
        creditor: merchant,
        amount: numAmount,
        date: date || new Date().toISOString().split('T')[0],
        notes: `Bayaran diimbas dari resit ${merchant}`,
      });
      setSaveSuccess(`Berjaya direkodkan sebagai Bayaran Hutang (${merchant})!`);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setScanResult(null);
    setSaveSuccess(null);
    startCamera();
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-amber-400 text-slate-950 font-bold">
              <ScanLine className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Pengimbas Resit AI Pintar
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dikuasakan oleh Gemini AI & Google ML Kit untuk mengekstrak Nama, Jumlah (RM), Tarikh, dan Kategori secara automatik.
          </p>
        </div>

        {/* Target Module Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          {(
            [
              { id: 'auto', label: 'Auto-Kesan' },
              { id: 'fuel', label: 'Minyak' },
              { id: 'subscription', label: 'Langganan' },
              { id: 'debt', label: 'Hutang' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedModule(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedModule === t.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewport / Captured Image */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
            {/* If has captured image */}
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured Receipt"
                className="w-full h-full object-contain bg-slate-950"
              />
            ) : cameraActive ? (
              /* Live Camera Feed */
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              /* Camera Idle or Permission Blocked */
              <div className="text-center p-6 space-y-3 max-w-sm">
                <div className="w-14 h-14 rounded-3xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-white">Kamera Belum Aktif</h4>
                <p className="text-xs text-slate-400">
                  {cameraError || 'Aktifkan kamera peranti untuk mula mengimbas resit fizikal.'}
                </p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
                >
                  Buka Kamera
                </button>
              </div>
            )}

            {/* Scanning Laser Line Overlay when scanning */}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none bg-emerald-500/10">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-laser absolute" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-2 animate-pulse">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span>Gemini AI sedang membaca teks resit...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Target Reticle Frame Overlay */}
            {!capturedImage && cameraActive && (
              <div className="absolute inset-8 pointer-events-none border-2 border-emerald-500/40 rounded-2xl flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                  <div className="w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                </div>
                <div className="text-center">
                  <span className="px-3 py-1 rounded-full bg-black/60 text-slate-200 text-[11px] font-medium backdrop-blur-sm">
                    Posisikan resit dalam petak ini
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                  <div className="w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                </div>
              </div>
            )}
          </div>

          {/* Scanner Controls Toolbar */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
            {capturedImage ? (
              <button
                onClick={resetScanner}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Ambil Semula</span>
              </button>
            ) : (
              <button
                onClick={capturePhoto}
                disabled={!cameraActive}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>Tangkap Gambar Resit</span>
              </button>
            )}

            {/* File Upload Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Muat Naik Imej</span>
            </button>
          </div>

          {/* Interactive Sample Receipts Selector for 1-Click Zero Friction Testing */}
          <div className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Contoh Resit Malaysia (Uji Cepat 1-Klik)
              </span>
              <span className="text-[10px] text-slate-400">Pilih untuk imbas segera</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SAMPLE_RECEIPTS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSampleReceipt(sample)}
                  className="p-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 transition text-left space-y-1 group"
                >
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 block w-fit">
                    {sample.badge}
                  </span>
                  <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition truncate">
                    {sample.thumbnailTitle}
                  </p>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {sample.name.split('(')[1]?.replace(')', '') || 'RM'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Extracted Data Card & Verification Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Hasil Ekstrak AI OCR</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                {scanEngine}
              </span>
            </div>

            {engineNotice && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{engineNotice}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{saveSuccess}</span>
                </div>
                <button
                  onClick={() => onNavigate(category)}
                  className="underline text-[11px] text-white hover:text-emerald-300"
                >
                  Lihat &rarr;
                </button>
              </div>
            )}

            {scanResult ? (
              <div className="space-y-4 animate-fade-in">
                {scanResult.summaryMalay && (
                  <div className="p-3 rounded-2xl bg-[#0b1220] border border-slate-800 text-xs text-slate-300">
                    <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">
                      Ringkasan AI:
                    </span>
                    {scanResult.summaryMalay}
                  </div>
                )}

                {/* Editable Fields Form */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">
                      Nama Peniaga / Institusi
                    </label>
                    <input
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">
                        Jumlah (RM) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-emerald-400 font-black text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">
                        Tarikh Transaksi
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">
                      Kategori Modul Pilihan
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setCategory('fuel')}
                        className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition ${
                          category === 'fuel'
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Fuel className="w-3.5 h-3.5" />
                        <span>Minyak</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCategory('subscription')}
                        className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition ${
                          category === 'subscription'
                            ? 'bg-teal-500 text-slate-950 font-black shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Repeat className="w-3.5 h-3.5" />
                        <span>Langganan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCategory('debt')}
                        className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition ${
                          category === 'debt'
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Hutang</span>
                      </button>
                    </div>
                  </div>

                  {/* Conditional Module Extras */}
                  {category === 'fuel' && (
                    <div className="p-3.5 rounded-2xl bg-[#0b1220] border border-slate-800 space-y-3">
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1">
                          Pilih Kenderaan
                        </label>
                        <select
                          value={selectedVehId}
                          onChange={(e) => setSelectedVehId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                        >
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} ({v.plateNumber})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">
                            Jumlah Liter (L)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={litres}
                            onChange={(e) => setLitres(e.target.value)}
                            placeholder="cth: 31.7"
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Gred Minyak</label>
                          <select
                            value={fuelType}
                            onChange={(e) =>
                              setFuelType(e.target.value as FuelLogItem['fuelType'])
                            }
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          >
                            <option value="RON95">RON 95</option>
                            <option value="RON97">RON 97</option>
                            <option value="Diesel">Diesel</option>
                            <option value="RON100">RON 100</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Action */}
                  <button
                    onClick={handleCommitSave}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-950/50 transition transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Sahkan & Masukkan ke Modul</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-2 text-slate-400">
                <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs">
                  {scanning
                    ? 'Memproses gambar resit...'
                    : 'Ambil gambar resit atau pilih contoh resit di sebelah kiri untuk melihat hasil analisis AI.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
