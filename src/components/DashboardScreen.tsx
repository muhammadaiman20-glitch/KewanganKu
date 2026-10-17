import React from 'react';
import {
  CreditCard,
  Repeat,
  Car,
  Fuel,
  Sparkles,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  TrendingDown,
  ArrowUpRight,
  ShieldAlert,
  Wrench,
  Clock,
  ChevronRight,
  BarChart2,
  Zap,
} from 'lucide-react';
import { AppDatabase, TabType } from '../types';
import { daysUntil, formatRM } from '../services/storage';

interface DashboardScreenProps {
  data: AppDatabase;
  onNavigate: (tab: TabType) => void;
  onOpenOcrWithModule: (moduleHint: 'debt' | 'subscription' | 'fuel' | 'bill') => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  data,
  onNavigate,
  onOpenOcrWithModule,
}) => {
  // Financial computations
  const totalDebtBalance = data.debts
    .filter((d) => d.status === 'active')
    .reduce((acc, curr) => acc + curr.remainingBalance, 0);

  const monthlyDebtCommitment = data.debts
    .filter((d) => d.status === 'active')
    .reduce((acc, curr) => acc + curr.monthlyInstallment, 0);

  // Recurring Bills monthly commitment
  const monthlyBillsCommitment = (data.bills || []).reduce((acc, curr) => {
    if (curr.cycle === 'yearly') return acc + curr.amount / 12;
    if (curr.cycle === 'half_yearly') return acc + curr.amount / 6;
    if (curr.cycle === 'quarterly') return acc + curr.amount / 3;
    if (curr.cycle === 'bi_monthly') return acc + curr.amount / 2;
    return acc + curr.amount;
  }, 0);

  const unpaidBillsCount = (data.bills || []).filter(
    (b) => b.status === 'unpaid' || b.status === 'overdue'
  ).length;

  const monthlySubscriptionCost = data.subscriptions
    .filter((s) => s.status === 'active')
    .reduce((acc, curr) => {
      if (curr.billingCycle === 'yearly') return acc + curr.amount / 12;
      return acc + curr.amount;
    }, 0);

  // Current month's fuel expense
  const currentMonthPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const thisMonthFuelExpense = data.fuelLogs
    .filter((f) => f.date.startsWith(currentMonthPrefix))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalMonthlyCommitment =
    monthlyDebtCommitment + monthlyBillsCommitment + monthlySubscriptionCost + thisMonthFuelExpense +
    data.expenses.filter(e => e.date.startsWith(currentMonthPrefix)).reduce((sum, e) => sum + e.amount, 0);

  // Vehicle alerts (Road tax & insurance expiration < 60 days)
  const vehicleAlerts = data.vehicles.flatMap((v) => {
    const roadtaxDays = daysUntil(v.roadTaxExpiry);
    const insuranceDays = daysUntil(v.insuranceExpiry);
    const alerts: { vehicle: string; type: string; days: number; urgent: boolean }[] = [];

    if (roadtaxDays <= 45) {
      alerts.push({
        vehicle: `${v.name} (${v.plateNumber})`,
        type: 'Cukai Jalan',
        days: roadtaxDays,
        urgent: roadtaxDays <= 14,
      });
    }
    if (insuranceDays <= 45) {
      alerts.push({
        vehicle: `${v.name} (${v.plateNumber})`,
        type: 'Insurans Kenderaan',
        days: insuranceDays,
        urgent: insuranceDays <= 14,
      });
    }
    return alerts;
  });

  // Upcoming payments in the next 14 days
  const todayDate = new Date();
  const currentDay = todayDate.getDate();

  const upcomingDebts = data.debts
    .filter((d) => d.status === 'active')
    .map((d) => {
      let daysLeft = d.dueDay - currentDay;
      if (daysLeft < 0) daysLeft += 30; // next month cycle
      return {
        id: d.id,
        title: d.title,
        amount: d.monthlyInstallment,
        daysLeft,
        creditor: d.creditor,
        type: 'debt' as const,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 2);

  const upcomingBills = (data.bills || [])
    .filter((b) => b.status === 'unpaid' || b.status === 'overdue')
    .map((b) => {
      let daysLeft = b.dueDay - currentDay;
      if (daysLeft < 0) daysLeft += 30;
      return {
        id: b.id,
        title: b.name,
        amount: b.amount,
        daysLeft,
        creditor: b.provider,
        type: 'bill' as const,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 2);

  const upcomingSubs = data.subscriptions
    .filter((s) => s.status === 'active')
    .map((s) => {
      const daysLeft = daysUntil(s.renewalDate);
      return {
        id: s.id,
        title: s.name,
        amount: s.amount,
        daysLeft: daysLeft < 0 ? 0 : daysLeft,
        creditor: s.paymentMethod,
        type: 'subscription' as const,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 2);

  const combinedUpcoming = [...upcomingBills, ...upcomingDebts, ...upcomingSubs]
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Hero Financial Overview Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f1d2e] via-[#0b1728] to-[#08101f] border border-slate-800/90 p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ringkasan Kewangan Peribadi
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Jumlah Komitmen Bulanan Semasa</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-0.5">
              {formatRM(totalMonthlyCommitment)}
              <span className="text-sm font-normal text-slate-400 ml-1.5">/ bulan</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenOcrWithModule('bill')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/50 transition transform active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Imbas Resit Pintar</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-6 pt-5 border-t border-slate-800/80">
          {/* Hutang */}
          <div
            onClick={() => onNavigate('debt')}
            className="cursor-pointer bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 rounded-2xl p-3 transition"
          >
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              <span>Ansuran Hutang</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white mt-1">
              {formatRM(monthlyDebtCommitment)}
            </p>
            <p className="text-[10px] text-amber-400/90 font-medium">
              Baki: {formatRM(totalDebtBalance)}
            </p>
          </div>

          {/* Recurring Bills (NEW) */}
          <div
            onClick={() => onNavigate('bills')}
            className="cursor-pointer bg-slate-900/60 hover:bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-3 transition"
          >
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bil Utiliti Tetap</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white mt-1">
              {formatRM(monthlyBillsCommitment)}
            </p>
            <p className="text-[10px] text-emerald-400/90 font-medium">
              {unpaidBillsCount > 0 ? `${unpaidBillsCount} belum bayar` : 'Semua telah berbayar'}
            </p>
          </div>

          {/* Langganan */}
          <div
            onClick={() => onNavigate('subscription')}
            className="cursor-pointer bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 rounded-2xl p-3 transition"
          >
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
              <Repeat className="w-3.5 h-3.5 text-teal-400" />
              <span>Langganan Digital</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white mt-1">
              {formatRM(monthlySubscriptionCost)}
            </p>
            <p className="text-[10px] text-teal-400/90 font-medium">
              {data.subscriptions.filter((s) => s.status === 'active').length} servis aktif
            </p>
          </div>

          {/* Minyak */}
          <div
            onClick={() => onNavigate('fuel')}
            className="cursor-pointer bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 rounded-2xl p-3 transition"
          >
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
              <Fuel className="w-3.5 h-3.5 text-sky-400" />
              <span>Minyak (Bulan Ini)</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white mt-1">
              {formatRM(thisMonthFuelExpense)}
            </p>
            <p className="text-[10px] text-sky-400/90 font-medium">
              {data.fuelLogs.filter((f) => f.date.startsWith(currentMonthPrefix)).length} kali isian
            </p>
          </div>
        </div>
      </div>

      {/* 2. Recurring Bills & Payment Due Calendar Banner Alert */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white">
                Kalendar Tarikh Akhir Bil Utiliti
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                TNB &bull; Air &bull; Unifi
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Pantau tarikh akhir bayaran TNB, bekalan air, jalur lebar dan cukai pintu dalam paparan kalendar interaktif.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('bills')}
          className="text-xs font-black px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 self-end sm:self-center shrink-0"
        >
          <span>Buka Kalendar Bil</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Urgent Vehicle Alerts Banner (Road Tax & Insurance) */}
      {vehicleAlerts.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Peringatan Kenderaan Diperlukan
              </h4>
              <p className="text-xs text-slate-200 mt-0.5">
                {vehicleAlerts[0].type} untuk <strong className="text-white">{vehicleAlerts[0].vehicle}</strong> tamat tempoh dalam{' '}
                <span className="text-amber-400 font-bold">{vehicleAlerts[0].days} hari</span>.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('vehicle')}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1 self-end sm:self-center"
          >
            <span>Semak Status</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Quick Action Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 px-1">
          Tindakan Pantas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {/* Action 1: Recurring Bills (NEW) */}
          <button
            onClick={() => onNavigate('bills')}
            className="flex flex-col items-start p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 transition group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Bil & Kalendar</span>
            <span className="text-[11px] text-slate-400 mt-0.5">JomPAY & Utiliti</span>
          </button>

          {/* Action 2: Scan Receipt */}
          <button
            onClick={() => onOpenOcrWithModule('bill')}
            className="flex flex-col items-start p-4 rounded-2xl bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-500/30 hover:border-amber-500/60 transition group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Imbas Resit AI</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Autofill Segera</span>
          </button>

          {/* Action 3: Add Debt Payment */}
          <button
            onClick={() => onNavigate('debt')}
            className="flex flex-col items-start p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Urus Hutang</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Rekod Bayaran</span>
          </button>

          {/* Action 4: Add Subscription */}
          <button
            onClick={() => onNavigate('subscription')}
            className="flex flex-col items-start p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Repeat className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Langganan</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Semak Tarikh</span>
          </button>

          {/* Action 5: Fuel Log */}
          <button
            onClick={() => onNavigate('fuel')}
            className="flex flex-col items-start p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Fuel className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Log Minyak</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Kira Penjimatan</span>
          </button>

          {/* Action 6: Analysis & Graphs */}
          <button
            onClick={() => onNavigate('analysis')}
            className="col-span-2 sm:col-span-1 flex flex-col items-start p-4 rounded-2xl bg-gradient-to-br from-indigo-950/30 to-slate-900 border border-indigo-500/30 hover:border-indigo-500/60 transition group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <BarChart2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Analisis & Graf</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Recharts Visual</span>
          </button>
        </div>
      </div>

      {/* 5. Upcoming Bill & Due Dates Schedule */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Jadual Bayaran Terdekat (14 Hari)</h3>
          </div>
          <button
            onClick={() => onNavigate('bills')}
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-bold"
          >
            <span>Buka Kalendar Penuh</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {combinedUpcoming.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.type === 'bill') onNavigate('bills');
                else if (item.type === 'debt') onNavigate('debt');
                else onNavigate('subscription');
              }}
              className="cursor-pointer flex items-center justify-between p-3 rounded-2xl bg-[#0b1220] border border-slate-800/80 hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    item.type === 'bill'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : item.type === 'debt'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-teal-500/15 text-teal-400'
                  }`}
                >
                  {item.type === 'bill' ? 'BIL' : item.type === 'debt' ? 'HTG' : 'SUB'}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">{item.title}</h4>
                  <p className="text-[11px] text-slate-400">{item.creditor}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs sm:text-sm font-bold text-white">{formatRM(item.amount)}</p>
                <span
                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                    item.daysLeft <= 3
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : item.daysLeft <= 7
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.daysLeft === 0
                    ? 'Hari ini!'
                    : item.daysLeft === 1
                    ? 'Esok'
                    : `Baki ${item.daysLeft} hari`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Vehicle Status Mini Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Status Kenderaan Anda</h3>
          </div>
          <button
            onClick={() => onNavigate('vehicle')}
            className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Semua Kenderaan ({data.vehicles.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.vehicles.map((veh) => {
            const roadtaxDays = daysUntil(veh.roadTaxExpiry);
            const kmToNextService = veh.nextServiceOdometer - veh.currentOdometer;

            return (
              <div
                key={veh.id}
                onClick={() => onNavigate('vehicle')}
                className="cursor-pointer p-4 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-emerald-500/40 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-amber-300">
                      {veh.plateNumber}
                    </span>
                    <h4 className="text-xs font-bold text-white truncate max-w-[130px]">
                      {veh.name}
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {veh.currentOdometer.toLocaleString()} km
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cukai Jalan</span>
                    <span
                      className={`font-semibold ${
                        roadtaxDays <= 30 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {roadtaxDays > 0 ? `${roadtaxDays} hari lagi` : 'Tamat Tempoh'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Servis Seterusnya</span>
                    <span
                      className={`font-semibold ${
                        kmToNextService <= 1000 ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      {kmToNextService > 0 ? `${kmToNextService.toLocaleString()} km lagi` : 'Servis Sekarang'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

