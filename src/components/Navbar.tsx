import type { SyncStatus } from '../services/cloudSync';
import React from 'react';
import { ShieldCheck, Cloud, RefreshCw, Sparkles, Bell, Activity } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  profile: UserProfile;
  onOpenSettings: () => void;
  onOpenOcr: () => void;
  onOpenAnalysis?: () => void;
  syncing: boolean;
  syncStatus: SyncStatus;
  onTriggerSync: () => void;
  urgentAlertCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  onOpenSettings,
  onOpenOcr,
  onOpenAnalysis,
  syncing,
  syncStatus,
  onTriggerSync,
  urgentAlertCount,
}) => {
  const todayFormatted = new Intl.DateTimeFormat('ms-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand & App Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-400 p-[2px] shadow-lg shadow-emerald-950/40">
            <div className="w-full h-full bg-[#0a0f1d] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-white tracking-tight">KewanganKu</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                PRO M3
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium capitalize">{todayFormatted}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cloud sync status button */}
          <button
            onClick={onTriggerSync}
            disabled={syncing}
            title={syncStatus.message}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition"
          >
            <Cloud className={`w-3.5 h-3.5 ${syncStatus.phase === 'synced' ? 'text-emerald-400' : 'text-amber-300'}`} />
            <span className="hidden sm:inline">Cloud</span>
            <RefreshCw className={`w-3 h-3 text-slate-400 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Quick Analysis Button */}
          {onOpenAnalysis && (
            <button
              onClick={onOpenAnalysis}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition"
              title="Analisis Kewangan & Graf"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Analisis</span>
            </button>
          )}

          {/* Quick Scan Receipt Button */}
          <button
            onClick={onOpenOcr}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-900/30 hover:opacity-95 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span>Imbas Resit</span>
          </button>

          {/* Alert bell */}
          <button
            onClick={onOpenSettings}
            className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Pemberitahuan & Profil"
          >
            <Bell className="w-4 h-4" />
            {urgentAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-[#0a0f1d] animate-pulse">
                {urgentAlertCount}
              </span>
            )}
          </button>

          {/* User Profile avatar */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center">
              MA
            </div>
            <span className="text-xs font-semibold text-slate-200 hidden md:inline max-w-[90px] truncate">
              {profile.name}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

