import { BankPaymentDetails } from './BankPaymentDetails';
import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Sparkles,
  CheckCircle,
  Clock,
  TrendingDown,
  Percent,
  Calendar,
  Building,
  ArrowRight,
  Filter,
  DollarSign,
  FileText,
  X,
  Zap,
} from 'lucide-react';
import { DebtItem, DebtPayment } from '../types';
import { formatRM } from '../services/storage';
import { ExtraPaymentModal } from './ExtraPaymentModal';
import { DebtPayoffCalculator } from './DebtPayoffCalculator';

interface DebtScreenProps {
  debts: DebtItem[];
  onAddDebt: (debt: Omit<DebtItem, 'id' | 'payments' | 'createdAt'>) => void;
  onRecordPayment: (debtId: string, amount: number, notes?: string, refNo?: string) => void;
  onUpdateDebt: (debt: DebtItem) => void;
  onUpdateDebtMonthlyInstallment?: (debtId: string, newMonthly: number) => void;
  onOpenOcrWithModule: (moduleHint: 'debt') => void;
}

export const DebtScreen: React.FC<DebtScreenProps> = ({
  debts,
  onAddDebt,
  onRecordPayment,
  onUpdateDebt,
  onUpdateDebtMonthlyInstallment,
  onOpenOcrWithModule,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'paid_off'>('active');
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorDebtId, setSimulatorDebtId] = useState<string>(debts[0]?.id || '');
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payRefNo, setPayRefNo] = useState('');

  // Form state for adding new debt
  const [newTitle, setNewTitle] = useState('');
  const [newCreditor, setNewCreditor] = useState('');
  const [newType, setNewType] = useState<DebtItem['type']>('car');
  const [newOriginalAmount, setNewOriginalAmount] = useState('');
  const [newRemainingBalance, setNewRemainingBalance] = useState('');
  const [newMonthlyInstallment, setNewMonthlyInstallment] = useState('');
  const [newDueDay, setNewDueDay] = useState('10');
  const [newInterestRate, setNewInterestRate] = useState('3.5');
  const [newTenureTotal, setNewTenureTotal] = useState('84');
  const [newTenureRemaining, setNewTenureRemaining] = useState('60');
  const [newNotes, setNewNotes] = useState('');

  const filteredDebts = debts.filter((d) => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const totalOriginal = debts.reduce((sum, d) => sum + d.originalAmount, 0);
  const totalRemaining = debts
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + d.remainingBalance, 0);
  const totalMonthly = debts
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + d.monthlyInstallment, 0);

  const totalPaid = totalOriginal - totalRemaining;
  const progressPercent = totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0;

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCreditor || !newMonthlyInstallment) return;

    const original = parseFloat(newOriginalAmount) || 0;
    const remaining = parseFloat(newRemainingBalance) || original;
    const monthly = parseFloat(newMonthlyInstallment) || 0;

    onAddDebt({
      title: newTitle,
      creditor: newCreditor,
      type: newType,
      originalAmount: original,
      remainingBalance: remaining,
      monthlyInstallment: monthly,
      dueDay: parseInt(newDueDay, 10) || 1,
      interestRate: parseFloat(newInterestRate) || 0,
      tenureMonthsTotal: parseInt(newTenureTotal, 10) || 12,
      tenureMonthsRemaining: parseInt(newTenureRemaining, 10) || 12,
      status: remaining <= 0 ? 'paid_off' : 'active',
      notes: newNotes,
    });

    setIsAddModalOpen(false);
    // Reset form
    setNewTitle('');
    setNewCreditor('');
    setNewOriginalAmount('');
    setNewRemainingBalance('');
    setNewMonthlyInstallment('');
    setNewNotes('');
  };

  const handleMakePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || !payAmount) return;
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    onRecordPayment(selectedDebt.id, amountNum, payNotes, payRefNo);
    setIsPayModalOpen(false);
    setPayAmount('');
    setPayNotes('');
    setPayRefNo('');
  };

  const openPaymentModal = (debt: DebtItem) => {
    setSelectedDebt(debt);
    setPayAmount(debt.monthlyInstallment.toString());
    setPayNotes(`Bayaran ansuran bulan ${new Intl.DateTimeFormat('ms-MY', { month: 'long' }).format(new Date())}`);
    setPayRefNo('');
    setIsPayModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-400" />
            <span>Pengurusan Hutang & Pinjaman</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Pantau baki pinjaman, jadual ansuran bulanan, dan rekod pembayaran resit.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const activeOne = debts.find((d) => d.status === 'active');
              if (activeOne) setSimulatorDebtId(activeOne.id);
              setIsSimulatorOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/15 to-amber-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold shadow-md transition"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Kalkulator Jimat Masa</span>
          </button>
          <button
            onClick={() => onOpenOcrWithModule('debt')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 hover:bg-slate-800 text-xs font-bold shadow-md transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Imbas Resit Hutang</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950/40 transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Hutang</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0c1626] to-[#08101e] border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-slate-400 font-medium">Baki Hutang Aktif</span>
            <h3 className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {formatRM(totalRemaining)}
            </h3>
            <span className="text-[11px] text-slate-400">
              Daripada jumlah asal {formatRM(totalOriginal)}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 font-medium">Komitmen Bulanan</span>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {formatRM(totalMonthly)}
              <span className="text-xs font-normal text-slate-400 ml-1">/ bulan</span>
            </h3>
            <span className="text-[11px] text-emerald-400">
              {debts.filter((d) => d.status === 'active').length} akaun aktif
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Kemajuan Pelunasan</span>
              <span className="font-bold text-emerald-400">{progressPercent}% Telah Selesai</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1.5 block">
              {formatRM(totalPaid)} telah dilangsaikan setakat ini
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Debt Payoff Calculator Component with Visual Graph */}
      <DebtPayoffCalculator
        debts={debts}
        onApplyExtraToMonthly={onUpdateDebtMonthlyInstallment}
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setFilter('active')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            filter === 'active'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Aktif ({debts.filter((d) => d.status === 'active').length})
        </button>
        <button
          onClick={() => setFilter('paid_off')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            filter === 'paid_off'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Selesai ({debts.filter((d) => d.status === 'paid_off').length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            filter === 'all'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Semua ({debts.length})
        </button>
      </div>

      {/* Debts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDebts.map((debt) => {
          const debtProgress = Math.round(
            ((debt.originalAmount - debt.remainingBalance) / debt.originalAmount) * 100
          );

          return (
            <div
              key={debt.id}
              className="rounded-3xl bg-slate-900/80 border border-slate-800/90 p-5 shadow-lg hover:border-slate-700 transition space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white">{debt.title}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{debt.creditor}</span>
                      <span>•</span>
                      <span className="capitalize">{debt.type.replace('_', ' ')}</span>
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    debt.status === 'paid_off'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {debt.status === 'paid_off' ? 'Selesai' : `Hari ke-${debt.dueDay}`}
                </span>
              </div>

              {/* Balances & Installment */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#0b1220] border border-slate-800/80">
                <div>
                  <span className="text-[11px] text-slate-400 block">Baki Tertunggak</span>
                  <span className="text-base font-extrabold text-amber-400">
                    {formatRM(debt.remainingBalance)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Asal: {formatRM(debt.originalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Ansuran Bulanan</span>
                  <span className="text-base font-extrabold text-white">
                    {formatRM(debt.monthlyInstallment)}
                  </span>
                  <span className="text-[10px] text-emerald-400 block mt-0.5 font-medium">
                    Faedah: {debt.interestRate}% setahun
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Pelunasan {debtProgress}%</span>
                  <span>Baki {debt.tenureMonthsRemaining} bulan</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, debtProgress))}%` }}
                  />
                </div>
              </div>

              <BankPaymentDetails key={debt.id} bank={debt.bankDetails} amount={Math.min(debt.monthlyInstallment, debt.remainingBalance)} onSave={bankDetails => onUpdateDebt({ ...debt, bankDetails })} />

              {/* Actions & Recent Payment */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400">
                  {debt.payments.length > 0
                    ? `Terakhir dibayar: ${debt.payments[0].date}`
                    : 'Belum ada rekod'}
                </span>

                {debt.status === 'active' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSimulatorDebtId(debt.id);
                        setIsSimulatorOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 transition flex items-center gap-1 shadow-sm"
                      title="Kira berapa bulan dapat dijimatkan dengan bayaran ekstra"
                    >
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>Simulasi</span>
                    </button>
                    <button
                      onClick={() => openPaymentModal(debt)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md transition"
                    >
                      Rekod Bayaran
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Record Payment Modal */}
      {isPayModalOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsPayModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Rekod Bayaran Ansuran</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {selectedDebt.title} ({selectedDebt.creditor})
            </p>

            <form onSubmit={handleMakePaymentSubmit} className="space-y-4 mt-5">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Jumlah Bayaran (RM)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400">
                    RM
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white font-bold focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Nombor Rujukan / Resit
                </label>
                <input
                  type="text"
                  value={payRefNo}
                  onChange={(e) => setPayRefNo(e.target.value)}
                  placeholder="Contoh: MBB-FPX-882910"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Catatan / Nota
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Contoh: Ansuran bulan Oktober"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 transition"
                >
                  Sahkan & Tolak Baki
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Debt Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>Daftar Hutang / Pinjaman Baru</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Masukkan maklumat pinjaman kereta, peribadi, kad kredit, atau perumahan.
            </p>

            <form onSubmit={handleCreateDebt} className="space-y-3.5 mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Nama Pinjaman *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Pinjaman Kereta Ativa"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Pemberi Pinjaman / Bank *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Maybank, CIMB, PTPTN"
                    value={newCreditor}
                    onChange={(e) => setNewCreditor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Kategori Hutang
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as DebtItem['type'])}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="car">Pinjaman Kenderaan</option>
                    <option value="housing">Pinjaman Rumah</option>
                    <option value="credit_card">Kad Kredit</option>
                    <option value="education">Pendidikan / PTPTN</option>
                    <option value="personal">Pinjaman Peribadi</option>
                    <option value="other">Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Tarikh Akhir (Hari dlm Bulan)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newDueDay}
                    onChange={(e) => setNewDueDay(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Jumlah Pinjaman Asal (RM)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="65000"
                    value={newOriginalAmount}
                    onChange={(e) => setNewOriginalAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Baki Semasa (RM) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="42000"
                    value={newRemainingBalance}
                    onChange={(e) => setNewRemainingBalance(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Ansuran (RM/bln) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="580"
                    value={newMonthlyInstallment}
                    onChange={(e) => setNewMonthlyInstallment(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Faedah (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="3.2"
                    value={newInterestRate}
                    onChange={(e) => setNewInterestRate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Baki Tempoh (Bln)
                  </label>
                  <input
                    type="number"
                    placeholder="60"
                    value={newTenureRemaining}
                    onChange={(e) => setNewTenureRemaining(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Nota</label>
                <textarea
                  rows={2}
                  placeholder="cth: Ansuran melalui Maybank2u Auto Debit..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/40 transition"
                >
                  Simpan Hutang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extra Payment & Tenure Reduction Simulator Modal */}
      {isSimulatorOpen && (
        <ExtraPaymentModal
          debts={debts}
          initialDebtId={simulatorDebtId || debts.find((d) => d.status === 'active')?.id || ''}
          onClose={() => setIsSimulatorOpen(false)}
          onApplyExtraToMonthly={(debtId, newMonthly) => {
            if (onUpdateDebtMonthlyInstallment) {
              onUpdateDebtMonthlyInstallment(debtId, newMonthly);
            }
          }}
          onRecordImmediatePayment={(debtId, amount, notes) => {
            onRecordPayment(debtId, amount, notes, `EXTRA-PAY-${Date.now().toString().slice(-6)}`);
          }}
        />
      )}
    </div>
  );
};

