import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Activity,
  ShieldCheck,
  CreditCard,
  Repeat,
  Fuel,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { AppDatabase, TabType } from '../types';
import { formatRM } from '../services/storage';

interface AnalysisScreenProps {
  data: AppDatabase;
  onUpdateIncome?: (newIncome: number) => void;
  onNavigate: (tab: TabType) => void;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({
  data,
  onUpdateIncome,
  onNavigate,
}) => {
  const currentIncome = data.profile.monthlyIncome || 6500;
  const [incomeInput, setIncomeInput] = useState<number>(currentIncome);
  const [editingIncome, setEditingIncome] = useState<boolean>(false);

  // Active debt commitment
  const monthlyDebt = data.debts
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + d.monthlyInstallment, 0);

  // Active subscriptions
  const monthlySubs = data.subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => {
      if (s.billingCycle === 'yearly') return sum + s.amount / 12;
      return sum + s.amount;
    }, 0);

  // Active Recurring Bills (TNB, Water, Internet, Sewerage, etc.)
  const monthlyBills = (data.bills || []).reduce((sum, b) => {
    if (b.cycle === 'yearly') return sum + b.amount / 12;
    if (b.cycle === 'half_yearly') return sum + b.amount / 6;
    if (b.cycle === 'quarterly') return sum + b.amount / 3;
    if (b.cycle === 'bi_monthly') return sum + b.amount / 2;
    return sum + b.amount;
  }, 0);

  // Current month fuel
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthFuel = data.fuelLogs
    .filter((f) => f.date.startsWith(currentMonthStr))
    .reduce((sum, f) => sum + f.amount, 0);

  const dailyExpenses = data.expenses.filter(e => e.date.startsWith(currentMonthStr)).reduce((sum, e) => sum + e.amount, 0);
  const totalMonthlyExpense = monthlyDebt + monthlyBills + monthlySubs + currentMonthFuel + dailyExpenses;
  const netSavings = Math.max(0, currentIncome - totalMonthlyExpense);

  // Debt Service Ratio (DSR)
  const dsrPercent = currentIncome > 0 ? parseFloat(((monthlyDebt / currentIncome) * 100).toFixed(1)) : 0;
  // Total Commitment Ratio
  const totalCommitmentPercent = currentIncome > 0 ? parseFloat(((totalMonthlyExpense / currentIncome) * 100).toFixed(1)) : 0;

  // 1. Chart 1 Data: Monthly Spending vs Income (Past 6 Months)
  const monthlyComparisonData = [
    {
      month: 'Mei',
      Pendapatan: currentIncome,
      Hutang: monthlyDebt,
      'Bil Utiliti': Math.round(monthlyBills),
      Langganan: Math.round(monthlySubs),
      Minyak: 260,
      Lebihan: Math.max(0, currentIncome - (monthlyDebt + monthlyBills + monthlySubs + 260)),
    },
    {
      month: 'Jun',
      Pendapatan: currentIncome,
      Hutang: monthlyDebt,
      'Bil Utiliti': Math.round(monthlyBills),
      Langganan: Math.round(monthlySubs),
      Minyak: 295,
      Lebihan: Math.max(0, currentIncome - (monthlyDebt + monthlyBills + monthlySubs + 295)),
    },
    {
      month: 'Jul',
      Pendapatan: currentIncome,
      Hutang: monthlyDebt,
      'Bil Utiliti': Math.round(monthlyBills),
      Langganan: Math.round(monthlySubs),
      Minyak: 310,
      Lebihan: Math.max(0, currentIncome - (monthlyDebt + monthlyBills + monthlySubs + 310)),
    },
    {
      month: 'Ogos',
      Pendapatan: currentIncome,
      Hutang: monthlyDebt,
      'Bil Utiliti': Math.round(monthlyBills),
      Langganan: Math.round(monthlySubs),
      Minyak: 275,
      Lebihan: Math.max(0, currentIncome - (monthlyDebt + monthlyBills + monthlySubs + 275)),
    },
    {
      month: 'Sep',
      Pendapatan: currentIncome,
      Hutang: monthlyDebt,
      'Bil Utiliti': Math.round(monthlyBills),
      Langganan: Math.round(monthlySubs),
      Minyak: 300,
      Lebihan: Math.max(0, currentIncome - (monthlyDebt + monthlyBills + monthlySubs + 300)),
    },
    {
      month: 'Okt (Kini)',
      Pendapatan: currentIncome,
      Hutang: monthlyDebt,
      'Bil Utiliti': Math.round(monthlyBills),
      Langganan: Math.round(monthlySubs),
      Minyak: Math.round(currentMonthFuel),
      Lebihan: Math.round(netSavings),
    },
  ];

  // Donut chart spending distribution
  const pieDistributionData = [
    { name: 'Ansuran Hutang', value: Math.round(monthlyDebt), color: '#f59e0b' },
    { name: 'Bil Utiliti', value: Math.round(monthlyBills), color: '#8b5cf6' },
    { name: 'Langganan', value: Math.round(monthlySubs), color: '#14b8a6' },
    { name: 'Bahan Api Minyak', value: Math.round(currentMonthFuel), color: '#38bdf8' },
    { name: 'Perbelanjaan Harian', value: Math.round(dailyExpenses), color: '#fb7185' },
    { name: 'Lebihan / Simpanan', value: Math.round(netSavings), color: '#10b981' },
  ];

  // 2. Chart 2 Data: Debt Reduction Progress Over Time (Past + Future Trajectory)
  const totalCurrentDebt = data.debts
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + d.remainingBalance, 0);

  const debtReductionTrendData = [
    { period: '12 Bln Lepas', baki: totalCurrentDebt + monthlyDebt * 12, label: 'Baki Dahulu' },
    { period: '8 Bln Lepas', baki: totalCurrentDebt + monthlyDebt * 8, label: 'Tahun 2025' },
    { period: '4 Bln Lepas', baki: totalCurrentDebt + monthlyDebt * 4, label: 'Pertengahan 2026' },
    { period: 'Kini (Okt)', baki: totalCurrentDebt, label: 'Baki Semasa' },
    { period: '+6 Bln', baki: Math.max(0, totalCurrentDebt - monthlyDebt * 6), label: 'Unjuran 6 Bln' },
    { period: '+12 Bln (1 Thn)', baki: Math.max(0, totalCurrentDebt - monthlyDebt * 12), label: 'Akhir 2027' },
    { period: '+24 Bln (2 Thn)', baki: Math.max(0, totalCurrentDebt - monthlyDebt * 24), label: 'Tahun 2028' },
    { period: '+36 Bln (3 Thn)', baki: Math.max(0, totalCurrentDebt - monthlyDebt * 36), label: 'Tahun 2029' },
    { period: '+48 Bln (4 Thn)', baki: Math.max(0, totalCurrentDebt - monthlyDebt * 48), label: 'Tahun 2030' },
  ];

  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateIncome) {
      onUpdateIncome(incomeInput);
    }
    setEditingIncome(false);
  };

  // Custom Tooltip for Recharts
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[190px]">
          <p className="font-extrabold text-white border-b border-slate-800 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-bold text-white">{formatRM(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md text-xs space-y-1">
          <p className="font-bold text-white">{label}</p>
          <p className="text-amber-400 font-black text-sm">
            Baki Hutang: {formatRM(payload[0].value)}
          </p>
          <span className="text-[10px] text-slate-400 block">
            {payload[0].payload.label}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold">
              <Activity className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Analisis Kewangan & Aliran Tunai
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Graf interaktif Recharts: Perbandingan perbelanjaan vs pendapatan dan trend pengurangan baki hutang.
          </p>
        </div>

        {/* Income Editor Button */}
        <div className="flex items-center gap-2">
          {editingIncome ? (
            <form onSubmit={handleSaveIncome} className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                  RM
                </span>
                <input
                  type="number"
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(parseFloat(e.target.value) || 0)}
                  className="w-32 pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500 text-white font-bold text-xs"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md"
              >
                Simpan
              </button>
            </form>
          ) : (
            <button
              onClick={() => setEditingIncome(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 hover:bg-slate-800 text-xs font-bold shadow-md transition"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gaji: {formatRM(currentIncome)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 4 KPI Health Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Income */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Pendapatan Bulanan</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white mt-1.5">
            {formatRM(currentIncome)}
          </p>
          <span className="text-[10px] text-emerald-400 font-medium">Gaji bersih semasa</span>
        </div>

        {/* Total Expense */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>Jumlah Komitmen</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1.5">
            {formatRM(totalMonthlyExpense)}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">
            {totalCommitmentPercent}% drpd pendapatan
          </span>
        </div>

        {/* Net Cashflow / Savings */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Lebihan Tunai Bersih</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-teal-400 mt-1.5">
            {formatRM(netSavings)}
          </p>
          <span className="text-[10px] text-teal-300 font-medium">
            {currentIncome > 0 ? ((netSavings / currentIncome) * 100).toFixed(0) : 0}% aliran tunai positif
          </span>
        </div>

        {/* DSR Ratio */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Nisbah Hutang (DSR)</span>
          </div>
          <p className={`text-xl sm:text-2xl font-black mt-1.5 ${dsrPercent <= 40 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {dsrPercent}%
          </p>
          <span className="text-[10px] font-semibold text-emerald-400">
            {dsrPercent <= 40 ? 'Sihat (Bawah 40% BNM)' : 'Berwaspada'}
          </span>
        </div>
      </div>

      {/* 1. CHART: Breakdown of Monthly Spending vs Income */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0c1a2d] to-[#081220] border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                Pecahan Perbelanjaan Bulanan vs Pendapatan (6 Bulan)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Perbandingan pendapatan berbanding komitmen ansuran hutang, langganan, dan minyak.
            </p>
          </div>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-emerald-400">
            Recharts BarChart
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Main Grouped/Stacked Bar Chart */}
          <div className="lg:col-span-8 h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyComparisonData}
                margin={{ top: 20, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar dataKey="Pendapatan" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Hutang" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Bil Utiliti" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Langganan" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Minyak" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Current Month Spending Distribution Donut Chart */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-[#091322] border border-slate-800/80 flex flex-col items-center">
            <span className="text-xs font-bold text-white mb-1">Agihan Komitmen Bulan Ini</span>
            <div className="w-full h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatRM(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full space-y-1.5 pt-2 border-t border-slate-800 text-[11px]">
              {pieDistributionData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-bold text-white">{formatRM(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. CHART: Debt Reduction Progress Trend Line Over Time */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0c1a2d] to-[#081220] border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                Trend Garis Pelunasan Hutang (Debt Reduction Progress)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Penurunan jumlah baki hutang terkumpul dari 12 bulan lepas hingga unjuran bebas hutang.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-300">
              Baki Semasa: {formatRM(totalCurrentDebt)}
            </span>
          </div>
        </div>

        {/* Recharts Area/Line Chart */}
        <div className="h-72 sm:h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={debtReductionTrendData}
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="debtTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="95%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="period"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(val) => `RM ${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomAreaTooltip />} />
              <ReferenceLine
                x="Kini (Okt)"
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: 'Kedudukan Kini',
                  fill: '#34d399',
                  fontSize: 10,
                  position: 'top',
                }}
              />
              <Area
                type="monotone"
                dataKey="baki"
                name="Baki Hutang Terkumpul"
                stroke="#f59e0b"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#debtTrendGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Milestone info banner */}
        <div className="p-4 rounded-2xl bg-[#091424] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white block">
                Disiplin Pembayaran Konsisten
              </span>
              <span className="text-slate-400">
                Dengan bayaran ansuran tetap {formatRM(monthlyDebt)}/bulan, jumlah baki pinjaman anda berjaya diturunkan secara stabil setiap bulan.
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('debt')}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5 self-start sm:self-center shrink-0"
          >
            <span>Kalkulator Pelunasan Pantas</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

