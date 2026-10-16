import React, { useState, useRef } from 'react';
import {
  Settings,
  User,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Palette,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  FileSpreadsheet,
  Fuel,
  CreditCard,
  Repeat,
} from 'lucide-react';
import { AppDatabase, UserProfile } from '../types';
import { exportBackupJson, parseAndValidateBackup } from '../services/storage';
import { exportAllToCsv, exportFuelLogsOnlyToCsv, exportDebtsOnlyToCsv } from '../services/csvExport';

interface SettingsScreenProps {
  profile: UserProfile;
  database: AppDatabase;
  onUpdateProfile: (profile: UserProfile) => void;
  onRestoreDatabase: (db: AppDatabase) => void;
  onResetToDefaults: () => void;
  syncing: boolean;
  onTriggerSync: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  profile,
  database,
  onUpdateProfile,
  onRestoreDatabase,
  onResetToDefaults,
  syncing,
  onTriggerSync,
}) => {
  const [userName, setUserName] = useState(profile.name);
  const [userEmail, setUserEmail] = useState(profile.email);
  const [userPhone, setUserPhone] = useState(profile.phone);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name: userName,
      email: userEmail,
      phone: userPhone,
    });
    setSaveToast('Maklumat profil berjaya dikemas kini!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleExportData = () => {
    exportBackupJson(database);
    setSaveToast('Fail sandaran JSON berjaya dimuat turun ke peranti anda!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleExportAllCsv = () => {
    exportAllToCsv(database);
    setSaveToast('Laporan CSV Ringkasan Lengkap berjaya dimuat turun!');
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleExportFuelCsv = () => {
    exportFuelLogsOnlyToCsv(database.fuelLogs);
    setSaveToast('Log Minyak CSV berjaya dimuat turun!');
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleExportDebtsCsv = () => {
    exportDebtsOnlyToCsv(database.debts);
    setSaveToast('Senarai Hutang CSV berjaya dimuat turun!');
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const validDb = parseAndValidateBackup(text);
        onRestoreDatabase(validDb);
        setSaveToast('Data sandaran berjaya dipulihkan!');
        setTimeout(() => setSaveToast(null), 3000);
      } catch (err: any) {
        setImportError(err.message || 'Gagal memproses fail JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-300" />
          <span>Profil & Tetapan Sandaran</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Pengurusan akaun pengguna, simpanan data offline Room DB, dan integrasi sandaran Google Drive.
        </p>
      </div>

      {saveToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {importError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{importError}</span>
        </div>
      )}

      {/* 1. User Profile Section */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 font-black text-lg flex items-center justify-center">
            MA
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{profile.name}</h3>
            <p className="text-xs text-slate-400">{profile.email}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Nama Penuh</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Emel Google</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">Nombor Telefon</label>
            <input
              type="text"
              value={userPhone}
              onChange={(e) => setUserPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
          >
            Kemas Kini Profil
          </button>
        </form>
      </div>

      {/* 2. Offline Database & Google Drive Cloud Backup */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Sandaran Google Drive & Simpanan Offline</h3>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Room DB / Offline Diaktifkan
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Semua data disimpan secara selamat di dalam peranti anda tanpa memerlukan sambungan internet setiap masa. Anda boleh menyelaraskan sandaran ke Google Drive atau memuat turun salinan sandaran manual.
        </p>

        {/* Google Drive Status Bar */}
        <div className="p-4 rounded-2xl bg-[#0b1220] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Google Drive Cloud Sync</h4>
              <p className="text-[11px] text-slate-400">
                Akaun: <span className="text-slate-200">{profile.email}</span> • Terakhir:{' '}
                {profile.lastBackupTimestamp
                  ? new Date(profile.lastBackupTimestamp).toLocaleString('ms-MY')
                  : 'Baru sahaja'}
              </p>
            </div>
          </div>

          <button
            onClick={onTriggerSync}
            disabled={syncing}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-2 self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{syncing ? 'Menyelaras...' : 'Selaraskan Sekarang'}</span>
          </button>
        </div>

        {/* Manual Export & Import */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleExportData}
            className="p-4 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-slate-700 transition flex items-center gap-3 text-left group"
          >
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 group-hover:text-emerald-400 transition">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Eksport Fail JSON</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Simpan fail sandaran ke telefon / komputer
              </span>
            </div>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-slate-700 transition flex items-center gap-3 text-left group"
          >
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 group-hover:text-teal-400 transition">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Pulihkan / Import Data</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Muat naik fail sandaran JSON sedia ada
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. CSV Export Section (Excel / Spreadsheet) */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Eksport ke CSV (Excel / Google Sheets)</h3>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            UTF-8 BOM Sedia Ada
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Muat turun rekod transaksi, jadual hutang, dan log isian minyak dalam format fail <strong className="text-white">.CSV</strong> yang boleh dibuka terus dalam Microsoft Excel, Google Sheets, atau Apple Numbers untuk simpanan peribadi atau pengauditan.
        </p>

        {/* Primary All-in-One CSV Button */}
        <button
          onClick={handleExportAllCsv}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-[#0c201a] to-slate-900 border-2 border-emerald-500/40 hover:border-emerald-500/70 transition flex items-center justify-between group text-left shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white">Eksport Ringkasan Lengkap (All-in-One CSV)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                  Disyorkan
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Mengandungi Profil, Hutang & Rekod Bayaran, Langganan, Log Minyak, dan Status Kenderaan
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition shrink-0 ml-2">
            <Download className="w-4 h-4" />
          </div>
        </button>

        {/* Modular Specific CSV Exports */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleExportFuelCsv}
            className="p-3.5 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-slate-700 transition flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Log Minyak Sahaja (CSV)</span>
                <span className="text-[10px] text-slate-400 block">
                  {database.fuelLogs.length} rekod isian, perbatuan & km/L
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-sky-400 transition" />
          </button>

          <button
            onClick={handleExportDebtsCsv}
            className="p-3.5 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-slate-700 transition flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Senarai Hutang & Faedah (CSV)</span>
                <span className="text-[10px] text-slate-400 block">
                  {database.debts.length} pinjaman, baki & ansuran
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition" />
          </button>
        </div>
      </div>

      {/* 4. Theme & Material 3 Specs */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Spesifikasi Reka Bentuk (Design System)</h3>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
          <div className="p-3 rounded-2xl bg-[#064e3b]/30 border border-emerald-500/40">
            <div className="w-4 h-4 rounded-full bg-emerald-500 mx-auto mb-1.5" />
            <span className="font-bold text-emerald-400 block">Emerald Green</span>
            <span className="text-[10px] text-slate-400">#10b981</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#0f172a] border border-slate-700">
            <div className="w-4 h-4 rounded-full bg-[#0f172a] border border-slate-500 mx-auto mb-1.5" />
            <span className="font-bold text-slate-200 block">Deep Navy</span>
            <span className="text-[10px] text-slate-400">#0f172a</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#78350f]/30 border border-amber-500/40">
            <div className="w-4 h-4 rounded-full bg-amber-400 mx-auto mb-1.5" />
            <span className="font-bold text-amber-400 block">Gold Accent</span>
            <span className="text-[10px] text-slate-400">#f59e0b</span>
          </div>
        </div>
      </div>

      {/* 4. Danger Zone (Reset Data) */}
      <div className="rounded-3xl bg-rose-950/20 border border-rose-500/30 p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-sm font-bold">Zon Bahaya & Tetapan Semula</h3>
        </div>

        <p className="text-xs text-slate-300">
          Jika anda ingin memulakan semula dengan data contoh rasmi (Perodua Ativa, resit Petronas, pinjaman Maybank), anda boleh menetapkan semula aplikasi.
        </p>

        <button
          onClick={() => {
            if (confirm('Adakah anda pasti ingin menetapkan semula ke data contoh asal?')) {
              onResetToDefaults();
              setSaveToast('Aplikasi telah ditetapkan semula ke data contoh asal.');
              setTimeout(() => setSaveToast(null), 3000);
            }
          }}
          className="px-4 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Tetapkan Semula ke Data Contoh Asal</span>
        </button>
      </div>
    </div>
  );
};
