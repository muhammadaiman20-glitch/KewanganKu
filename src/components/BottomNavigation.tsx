import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Repeat,
  Car,
  Fuel,
  ScanLine,
  Settings,
  BarChart3,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TabType } from '../types';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  debtBadge?: number;
  billBadge?: number;
  subBadge?: number;
  vehicleBadge?: number;
}

export const BottomNavigation: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  debtBadge = 0,
  billBadge = 0,
  subBadge = 0,
  vehicleBadge = 0,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0f1d]/95 backdrop-blur-lg border-t border-slate-800/80 px-1.5 py-1.5 shadow-2xl safe-area-pb">
      <div className="max-w-2xl mx-auto flex items-center justify-between relative overflow-x-auto scrollbar-none gap-0.5 sm:gap-1">
        {/* 1. Dashboard */}
        <button
          onClick={() => onChangeTab('dashboard')}
          className={`flex-1 min-w-[48px] sm:min-w-[54px] flex flex-col items-center justify-center py-1 relative transition-colors ${
            currentTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative p-1 rounded-xl">
            {currentTab === 'dashboard' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-emerald-500/15 rounded-xl border border-emerald-500/30"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          </div>
          <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight relative z-10">Utama</span>
        </button>

        {/* 2. Bil Utiliti (NEW MODUL RECURRING BILLS) */}
        <button
          onClick={() => onChangeTab('bills')}
          className={`flex-1 min-w-[48px] sm:min-w-[54px] flex flex-col items-center justify-center py-1 relative transition-colors ${
            currentTab === 'bills' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative p-1 rounded-xl">
            {currentTab === 'bills' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-emerald-500/15 rounded-xl border border-emerald-500/30"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          </div>
          {billBadge > 0 && (
            <span className="absolute top-0 right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-amber-500 text-slate-950 text-[8px] sm:text-[9px] font-black rounded-full flex items-center justify-center z-20 ring-2 ring-[#0a0f1d]">
              {billBadge}
            </span>
          )}
          <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight relative z-10">Bil</span>
        </button>

        {/* 3. Hutang */}
        <button
          onClick={() => onChangeTab('debt')}
          className={`flex-1 min-w-[48px] sm:min-w-[54px] flex flex-col items-center justify-center py-1 relative transition-colors ${
            currentTab === 'debt' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative p-1 rounded-xl">
            {currentTab === 'debt' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-emerald-500/15 rounded-xl border border-emerald-500/30"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          </div>
          {debtBadge > 0 && (
            <span className="absolute top-0 right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-rose-500 text-white text-[8px] sm:text-[9px] font-black rounded-full flex items-center justify-center z-20 ring-2 ring-[#0a0f1d]">
              {debtBadge}
            </span>
          )}
          <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight relative z-10">Hutang</span>
        </button>

        {/* 4. Center AI OCR Floating Action Button */}
        <div className="flex-1 min-w-[50px] sm:min-w-[56px] flex flex-col items-center justify-center -mt-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => onChangeTab('ocr')}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              currentTab === 'ocr'
                ? 'bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 ring-4 ring-emerald-500/30'
                : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 ring-4 ring-emerald-950/60'
            }`}
            title="Imbas Resit Pintar AI"
          >
            <ScanLine className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.4]" />
          </motion.button>
          <span className="text-[9px] font-extrabold text-amber-400 mt-0.5 tracking-tight">Imbas</span>
        </div>

        {/* 5. Langganan */}
        <button
          onClick={() => onChangeTab('subscription')}
          className={`flex-1 min-w-[48px] sm:min-w-[54px] flex flex-col items-center justify-center py-1 relative transition-colors ${
            currentTab === 'subscription' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative p-1 rounded-xl">
            {currentTab === 'subscription' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-emerald-500/15 rounded-xl border border-emerald-500/30"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Repeat className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          </div>
          {subBadge > 0 && (
            <span className="absolute top-0 right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-teal-500 text-slate-950 text-[8px] sm:text-[9px] font-black rounded-full flex items-center justify-center z-20 ring-2 ring-[#0a0f1d]">
              {subBadge}
            </span>
          )}
          <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight relative z-10">Langgan</span>
        </button>

        {/* 6. Analisis */}
        <button
          onClick={() => onChangeTab('analysis')}
          className={`flex-1 min-w-[48px] sm:min-w-[54px] flex flex-col items-center justify-center py-1 relative transition-colors ${
            currentTab === 'analysis' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative p-1 rounded-xl">
            {currentTab === 'analysis' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-emerald-500/15 rounded-xl border border-emerald-500/30"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          </div>
          <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight relative z-10">Analisis</span>
        </button>

        {/* 7. Kenderaan */}
        <button
          onClick={() => onChangeTab('vehicle')}
          className={`flex-1 min-w-[48px] sm:min-w-[54px] flex flex-col items-center justify-center py-1 relative transition-colors ${
            currentTab === 'vehicle' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative p-1 rounded-xl">
            {currentTab === 'vehicle' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-emerald-500/15 rounded-xl border border-emerald-500/30"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Car className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          </div>
          {vehicleBadge > 0 && (
            <span className="absolute top-0 right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-rose-500 text-white text-[8px] sm:text-[9px] font-black rounded-full flex items-center justify-center z-20 ring-2 ring-[#0a0f1d]">
              {vehicleBadge}
            </span>
          )}
          <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight relative z-10">Kereta</span>
        </button>

        {/* 8. Minyak */}
        <button
          onClick={() => onChangeTab('fuel')}
          className={`flex-1 min-w-[48px] sm:min-w-[54px] flex flex-col items-center justify-center py-1 relative transition-colors ${
            currentTab === 'fuel' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative p-1 rounded-xl">
            {currentTab === 'fuel' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-emerald-500/15 rounded-xl border border-emerald-500/30"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Fuel className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          </div>
          <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight relative z-10">Minyak</span>
        </button>

        {/* 9. Tetapan */}
        <button
          onClick={() => onChangeTab('settings')}
          className={`flex-1 min-w-[48px] sm:min-w-[54px] flex flex-col items-center justify-center py-1 relative transition-colors ${
            currentTab === 'settings' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative p-1 rounded-xl">
            {currentTab === 'settings' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-emerald-500/15 rounded-xl border border-emerald-500/30"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          </div>
          <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight relative z-10">Tetapan</span>
        </button>
      </div>
    </div>
  );
};
