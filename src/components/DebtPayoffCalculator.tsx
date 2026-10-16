import React, { useState } from 'react';
import {
  Zap,
  TrendingDown,
  Calendar,
  DollarSign,
  Clock,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Info,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { DebtItem } from '../types';
import { calculateDebtPayoff, TrajectoryPoint } from '../services/payoffCalculator';
import { formatRM } from '../services/storage';

interface DebtPayoffCalculatorProps {
  debts: DebtItem[];
  onApplyExtraToMonthly?: (debtId: string, newMonthly: number) => void;
}

export const DebtPayoffCalculator: React.FC<DebtPayoffCalculatorProps> = ({
  debts,
  onApplyExtraToMonthly,
}) => {
  const activeDebts = debts.filter((d) => d.status === 'active');
  const [selectedDebtId, setSelectedDebtId] = useState<string>(activeDebts[0]?.id || '');
  const [extraPayment, setExtraPayment] = useState<number>(100);
  const [hoveredPoint, setHoveredPoint] = useState<TrajectoryPoint | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const currentDebt = activeDebts.find((d) => d.id === selectedDebtId) || activeDebts[0];

  if (!currentDebt) {
    return null;
  }

  const result = calculateDebtPayoff({
    balance: currentDebt.remainingBalance,
    annualInterestRate: currentDebt.interestRate,
    monthlyPayment: currentDebt.monthlyInstallment,
    extraMonthly: extraPayment,
  });

  const handleApply = () => {
    if (onApplyExtraToMonthly) {
      const updatedMonthly = currentDebt.monthlyInstallment + extraPayment;
      onApplyExtraToMonthly(currentDebt.id, updatedMonthly);
      setAppliedNotice(
        `Pelan dikemas kini! Ansuran bulanan ${currentDebt.title} kini ${formatRM(updatedMonthly)}/bln.`
      );
      setTimeout(() => setAppliedNotice(null), 4000);
    }
  };

  // SVG Chart Geometry
  const chartWidth = 560;
  const chartHeight = 220;
  const paddingLeft = 50;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 35;

  const graphW = chartWidth - paddingLeft - paddingRight;
  const graphH = chartHeight - paddingTop - paddingBottom;

  const maxBal = currentDebt.remainingBalance > 0 ? currentDebt.remainingBalance : 10000;
  const maxMonth = Math.max(result.originalMonths, 1);

  const getX = (month: number) => paddingLeft + (month / maxMonth) * graphW;
  const getY = (bal: number) => paddingTop + graphH - (bal / maxBal) * graphH;

  // Build SVG Path strings
  const origPoints = result.trajectory.map((p) => `${getX(p.month)},${getY(p.originalBalance)}`).join(' ');
  const newPoints = result.trajectory.map((p) => `${getX(p.month)},${getY(p.newBalance)}`).join(' ');

  // Area path for accelerated curve
  const areaPath = `M ${getX(0)},${getY(currentDebt.remainingBalance)} ` +
    result.trajectory.map((p) => `L ${getX(p.month)},${getY(p.newBalance)}`).join(' ') +
    ` L ${getX(result.newMonths)},${getY(0)} L ${getX(0)},${getY(0)} Z`;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0c1f2f] via-[#091626] to-[#07101e] border-2 border-emerald-500/40 p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Component Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-400 p-[2px] shadow-lg shadow-emerald-950/50">
            <div className="w-full h-full bg-[#091626] rounded-[14px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Kalkulator Pelunasan Pantas (Debt Payoff)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Visual Graf
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulasi pengurangan baki & penjimatan masa dengan bayaran bulanan tambahan.
            </p>
          </div>
        </div>

        {/* Debt Selector Dropdown */}
        <div className="min-w-[220px]">
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Pilih Pinjaman
          </label>
          <div className="relative">
            <select
              value={selectedDebtId}
              onChange={(e) => setSelectedDebtId(e.target.value)}
              className="w-full appearance-none px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs pr-8 focus:outline-none focus:border-emerald-400"
            >
              {activeDebts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({formatRM(d.remainingBalance)})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {appliedNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{appliedNotice}</span>
        </div>
      )}

      {/* 1. Interactive Extra Payment Slider & Presets */}
      <div className="p-4 rounded-2xl bg-[#091322] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              <span>Amaun Bayaran Tambahan Bulanan (Extra Payment)</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Ansuran Asal: <strong className="text-white">{formatRM(currentDebt.monthlyInstallment)}</strong> &rarr; Ansuran Baharu:{' '}
              <strong className="text-emerald-400">{formatRM(currentDebt.monthlyInstallment + extraPayment)}</strong>/bln
            </span>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-white font-mono">
              +RM {extraPayment}
            </span>
            <span className="text-[10px] text-slate-400 block">/bulan</span>
          </div>
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min="0"
          max="1200"
          step="25"
          value={extraPayment}
          onChange={(e) => setExtraPayment(parseInt(e.target.value, 10))}
          className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
        />

        {/* Preset Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {[0, 50, 100, 200, 300, 500].map((amt) => (
            <button
              key={amt}
              onClick={() => setExtraPayment(amt)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                extraPayment === amt
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/90 text-slate-300 hover:text-white'
              }`}
            >
              {amt === 0 ? 'Asal (RM 0)' : `+RM ${amt}`}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Visual Amortization Trajectory Graph */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#070e1c] border border-slate-800/90 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-1 bg-slate-500 rounded-full" />
              <span>Jadual Asal ({result.originalMonths} bln)</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-3 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#10b981]" />
              <span>Dengan Bayaran Ekstra ({result.newMonths} bln)</span>
            </div>
          </div>

          <span className="text-[11px] text-amber-300 font-medium">
            Gerakkan kursor ke titik graf untuk butiran baki
          </span>
        </div>

        {/* SVG Curve Canvas */}
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto min-w-[340px] overflow-visible"
          >
            <defs>
              <linearGradient id="emeraldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingTop + graphH * (1 - ratio);
              const val = Math.round(maxBal * ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                  </text>
                </g>
              );
            })}

            {/* Shaded Area Under Accelerated Line */}
            <path d={areaPath} fill="url(#emeraldAreaGrad)" />

            {/* Original Schedule Polyline */}
            <polyline
              fill="none"
              stroke="#64748b"
              strokeWidth="2.5"
              strokeDasharray="4,4"
              points={origPoints}
            />

            {/* Accelerated Schedule Polyline */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              points={newPoints}
            />

            {/* Early Payoff Milestone Marker Point */}
            {result.newMonths < result.originalMonths && (
              <g>
                <circle
                  cx={getX(result.newMonths)}
                  cy={getY(0)}
                  r="6"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="animate-pulse"
                />
                <circle
                  cx={getX(result.newMonths)}
                  cy={getY(0)}
                  r="12"
                  fill="#10b981"
                  fillOpacity="0.25"
                />
                {/* Milestone Pin Label */}
                <rect
                  x={Math.max(10, getX(result.newMonths) - 60)}
                  y={getY(0) - 34}
                  width="120"
                  height="22"
                  rx="6"
                  fill="#0f172a"
                  stroke="#10b981"
                  strokeWidth="1.2"
                />
                <text
                  x={Math.max(70, getX(result.newMonths))}
                  y={getY(0) - 19}
                  fill="#34d399"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Bebas ({result.newPayoffDate})
                </text>
              </g>
            )}

            {/* Interactive Data Hover Dots */}
            {result.trajectory.map((p, idx) => {
              const cx = getX(p.month);
              const cyNew = getY(p.newBalance);
              const cyOrig = getY(p.originalBalance);

              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer group"
                >
                  <circle
                    cx={cx}
                    cy={cyNew}
                    r="4"
                    fill="#34d399"
                    className="transition-transform group-hover:scale-150"
                  />
                  <circle
                    cx={cx}
                    cy={cyOrig}
                    r="3"
                    fill="#94a3b8"
                  />
                </g>
              );
            })}

            {/* X-Axis Month Labels */}
            {result.trajectory.filter((_, i) => i % 2 === 0).map((p, idx) => (
              <text
                key={idx}
                x={getX(p.month)}
                y={chartHeight - 10}
                fill="#64748b"
                fontSize="9"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {p.monthLabel}
              </text>
            ))}
          </svg>
        </div>

        {/* Hovered Point Details Bar */}
        {hoveredPoint ? (
          <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between text-xs animate-fade-in">
            <span className="font-bold text-white">{hoveredPoint.monthLabel} ({hoveredPoint.month} Bulan)</span>
            <div className="flex items-center gap-4">
              <span className="text-slate-400">
                Baki Asal: <strong className="text-slate-200">{formatRM(hoveredPoint.originalBalance)}</strong>
              </span>
              <span className="text-emerald-400 font-bold">
                Baki Dipercepat: {formatRM(hoveredPoint.newBalance)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 text-center">
            Garis hijau menunjukkan baki hutang jatuh ke sifar jauh lebih cepat berbanding jadual kelabu asal.
          </div>
        )}
      </div>

      {/* 3. Three Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Months Saved */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
            <Clock className="w-4 h-4" />
            <span>Masa Dijimatkan</span>
          </div>
          <p className="text-2xl font-black text-white mt-1.5">
            {result.monthsSaved} Bulan
          </p>
          <span className="text-[11px] text-emerald-300 font-medium">
            {result.yearsSaved > 0
              ? `${result.yearsSaved} Tahun ${result.extraMonthsPart} Bulan lebih pantas`
              : 'Lebih pantas langsaikan baki'}
          </span>
        </div>

        {/* Interest Saved */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/40">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
            <DollarSign className="w-4 h-4" />
            <span>Penjimatan Faedah</span>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1.5">
            {formatRM(result.interestSaved)}
          </p>
          <span className="text-[11px] text-slate-300 font-medium">
            Jimat caj faedah kepada bank
          </span>
        </div>

        {/* New Debt-Free Date */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-500/40">
          <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold">
            <Calendar className="w-4 h-4" />
            <span>Tarikh Bebas Hutang</span>
          </div>
          <p className="text-2xl font-black text-white mt-1.5">
            {result.newPayoffDate}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Tarikh asal: {result.originalPayoffDate}
          </span>
        </div>
      </div>

      {/* 4. Action Banner */}
      {extraPayment > 0 && onApplyExtraToMonthly && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#091522] border border-emerald-500/30">
          <div className="text-xs text-slate-300">
            <p className="font-semibold text-white">
              Ingin tetapkan bayaran tambahan +RM{extraPayment}/bln sebagai ansuran tetap?
            </p>
            <p className="text-[11px] text-slate-400">
              Ansuran baharu: {formatRM(currentDebt.monthlyInstallment + extraPayment)}/bulan.
            </p>
          </div>

          <button
            onClick={handleApply}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Kemas Kini Ansuran Bulanan</span>
          </button>
        </div>
      )}
    </div>
  );
};
