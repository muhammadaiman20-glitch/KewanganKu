import React, { useState } from 'react';
import {
  Zap,
  TrendingDown,
  Calendar,
  DollarSign,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { DebtItem } from '../types';
import { calculateDebtPayoff } from '../services/payoffCalculator';
import { formatRM } from '../services/storage';

interface ExtraPaymentModalProps {
  debts: DebtItem[];
  initialDebtId: string;
  onClose: () => void;
  onApplyExtraToMonthly: (debtId: string, newMonthlyInstallment: number) => void;
  onRecordImmediatePayment: (debtId: string, amount: number, notes: string) => void;
}

export const ExtraPaymentModal: React.FC<ExtraPaymentModalProps> = ({
  debts,
  initialDebtId,
  onClose,
  onApplyExtraToMonthly,
  onRecordImmediatePayment,
}) => {
  const [selectedDebtId, setSelectedDebtId] = useState<string>(initialDebtId);
  const [extraMonthly, setExtraMonthly] = useState<number>(100);
  const [lumpSum, setLumpSum] = useState<number>(0);
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null);

  const selectedDebt = debts.find((d) => d.id === selectedDebtId) || debts[0];

  if (!selectedDebt) return null;

  const calculation = calculateDebtPayoff({
    balance: selectedDebt.remainingBalance,
    annualInterestRate: selectedDebt.interestRate,
    monthlyPayment: selectedDebt.monthlyInstallment,
    extraMonthly: extraMonthly || 0,
    lumpSum: lumpSum || 0,
  });

  const handleQuickAdd = (amount: number) => {
    setExtraMonthly(amount);
  };

  const handleLumpSumQuick = (amount: number) => {
    setLumpSum((prev) => (prev === amount ? 0 : amount));
  };

  const handleSaveToInstallment = () => {
    const updatedMonthly = selectedDebt.monthlyInstallment + extraMonthly;
    onApplyExtraToMonthly(selectedDebt.id, updatedMonthly);
    setAppliedSuccess(
      `Ansuran bulanan ${selectedDebt.title} berjaya dinaikkan ke ${formatRM(updatedMonthly)}!`
    );
    setTimeout(() => {
      onClose();
    }, 1600);
  };

  const handlePayNow = () => {
    const totalToPay = (extraMonthly || 0) + (lumpSum || 0);
    if (totalToPay <= 0) return;

    onRecordImmediatePayment(
      selectedDebt.id,
      totalToPay,
      `Bayaran tambahan pelunasan pantas (Jimat ${calculation.monthsSaved} bulan)`
    );
    onClose();
  };

  // Timeline percentage representation
  const originalTimelineLength = calculation.originalMonths;
  const newTimelinePercent =
    originalTimelineLength > 0
      ? Math.max(15, Math.min(100, Math.round((calculation.newMonths / originalTimelineLength) * 100)))
      : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-6 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="pr-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-400 text-slate-950">
              <Zap className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                Kalkulator Pelunasan Pantas
              </h3>
              <p className="text-xs text-slate-400">
                Lihat berapa banyak bulan & kos faedah yang boleh dijimatkan dengan bayaran ekstra.
              </p>
            </div>
          </div>
        </div>

        {appliedSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{appliedSuccess}</span>
          </div>
        )}

        {/* 1. Debt Item Selector */}
        <div>
          <label className="text-xs text-slate-300 font-medium block mb-1.5">
            Pilih Akaun Pinjaman
          </label>
          <select
            value={selectedDebtId}
            onChange={(e) => setSelectedDebtId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
          >
            {debts
              .filter((d) => d.status === 'active')
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.creditor}) • Baki: {formatRM(d.remainingBalance)}
                </option>
              ))}
          </select>
        </div>

        {/* Debt Current Baseline Snapshot */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#0b1220] border border-slate-800/80 text-center">
          <div>
            <span className="text-[10px] text-slate-400 block">Baki Semasa</span>
            <span className="text-xs sm:text-sm font-extrabold text-amber-400">
              {formatRM(selectedDebt.remainingBalance)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Ansuran Asal</span>
            <span className="text-xs sm:text-sm font-extrabold text-white">
              {formatRM(selectedDebt.monthlyInstallment)}/bln
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Kadar Faedah</span>
            <span className="text-xs sm:text-sm font-extrabold text-sky-400">
              {selectedDebt.interestRate}% setahun
            </span>
          </div>
        </div>

        {/* 2. Extra Monthly Payment Control */}
        <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              <span>Bayaran Tambahan Bulanan (Extra Payment)</span>
            </label>
            <span className="text-base font-black text-white font-mono">
              +RM {extraMonthly}
            </span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min="0"
            max="1500"
            step="25"
            value={extraMonthly}
            onChange={(e) => setExtraMonthly(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[50, 100, 200, 300, 500].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickAdd(amt)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                  extraMonthly === amt
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-800/90 text-slate-300 hover:text-white'
                }`}
              >
                +RM {amt}
              </button>
            ))}
          </div>

          {/* Optional One-Time Lump Sum */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
              <span className="text-[11px] text-slate-400">Bayaran Sekali Sahaja (Lump Sum Bonus)</span>
              <span className="font-mono text-amber-300 font-bold">
                {lumpSum > 0 ? `+RM ${lumpSum}` : 'Tiada'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[500, 1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleLumpSumQuick(amt)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition ${
                    lumpSum === amt
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  RM {amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Hero Visualized Results Card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0c221a] via-[#091a26] to-[#0a1220] border-2 border-emerald-500/50 p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                Hasil Penjimatan Masa
              </span>
              <h4 className="text-xl sm:text-2xl font-black text-white mt-1">
                Jimat{' '}
                <span className="text-emerald-400 underline decoration-amber-400 decoration-2">
                  {calculation.monthsSaved} Bulan
                </span>{' '}
                Lebih Awal!
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {calculation.yearsSaved > 0 && (
                  <span className="font-semibold text-amber-300">
                    Bersamaan {calculation.yearsSaved} Tahun {calculation.extraMonthsPart} Bulan.
                  </span>
                )}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Jimat Faedah Pinjaman</span>
              <span className="text-base sm:text-lg font-black text-amber-400">
                {formatRM(calculation.interestSaved)}
              </span>
            </div>
          </div>

          {/* Visual Timeline Bar Comparison */}
          <div className="space-y-2.5 pt-1">
            {/* Original Schedule Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Jadual Asal (Tanpa Bayaran Ekstra)</span>
                <span className="font-bold text-slate-300">
                  {calculation.originalMonths} Bulan ({calculation.originalPayoffDate})
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-full h-full bg-slate-600 rounded-full" />
              </div>
            </div>

            {/* Accelerated Schedule Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Jadual Baharu Dipercepat (+RM{extraMonthly}/bln)</span>
                </span>
                <span className="font-mono text-emerald-300">
                  {calculation.newMonths} Bulan ({calculation.newPayoffDate})
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-500 shadow-[0_0_10px_#10b981]"
                  style={{ width: `${newTimelinePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Comparison Stats Table */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
            <div className="p-2 rounded-xl bg-black/40">
              <span className="text-slate-400 block text-[10px]">Tarikh Selesai Asal</span>
              <span className="font-bold text-slate-300">{calculation.originalPayoffDate}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Jumlah Bayaran: {formatRM(calculation.originalTotalPaid)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-emerald-500/20">
              <span className="text-emerald-400 block text-[10px] font-bold">
                Tarikh Bebas Hutang Baharu
              </span>
              <span className="font-black text-white">{calculation.newPayoffDate}</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5 font-medium">
                Jumlah Bayaran: {formatRM(calculation.newTotalPaid)}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <button
            onClick={handleSaveToInstallment}
            className="w-full sm:flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Terapkan Pelan Bayaran Ekstra</span>
          </button>

          {(extraMonthly > 0 || lumpSum > 0) && (
            <button
              onClick={handlePayNow}
              className="w-full sm:flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/40 transition flex items-center justify-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" />
              <span>Bayar RM{(extraMonthly + lumpSum).toLocaleString()} Sekarang</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
