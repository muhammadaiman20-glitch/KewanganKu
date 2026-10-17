import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Zap,
  Droplets,
  Wifi,
  Shield,
  Building,
  Flame,
  FileText,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  DollarSign,
  Filter,
  Search,
  Check,
  X,
  CreditCard,
  QrCode,
  Layers,
  History,
  Trash2,
  Edit2,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { BillCategory, BillCycle, BillPaymentRecord, RecurringBillItem, TabType } from '../types';
import { daysUntil, formatRM } from '../services/storage';

interface RecurringBillsScreenProps {
  bills: RecurringBillItem[];
  onAddBill: (bill: Omit<RecurringBillItem, 'id' | 'paymentHistory' | 'createdAt'>) => void;
  onUpdateBill: (bill: RecurringBillItem) => void;
  onDeleteBill: (id: string) => void;
  onRecordPayment: (billId: string, record: Omit<BillPaymentRecord, 'id' | 'billId'>) => void;
  onOpenOcrWithModule: (moduleHint: 'bill') => void;
  onNavigate?: (tab: TabType) => void;
}

const CATEGORY_CONFIG: Record<
  BillCategory,
  { label: string; icon: any; color: string; bg: string; border: string }
> = {
  electricity: {
    label: 'Elektrik',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
  },
  water: {
    label: 'Bekalan Air',
    icon: Droplets,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/30',
  },
  internet: {
    label: 'Internet & Fiber',
    icon: Wifi,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/15',
    border: 'border-indigo-500/30',
  },
  sewerage: {
    label: 'Pembetungan',
    icon: Shield,
    color: 'text-teal-400',
    bg: 'bg-teal-500/15',
    border: 'border-teal-500/30',
  },
  tax: {
    label: 'Cukai Pintu / Taksiran',
    icon: Building,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30',
  },
  maintenance: {
    label: 'Penyelenggaraan / JMB',
    icon: Layers,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
  },
  gas: {
    label: 'Gas Saluran / Dapur',
    icon: Flame,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
  },
  other: {
    label: 'Lain-lain Utiliti',
    icon: FileText,
    color: 'text-slate-300',
    bg: 'bg-slate-700/20',
    border: 'border-slate-700/40',
  },
};

const MALAYSIA_BILL_TEMPLATES = [
  {
    name: 'TNB - Bil Elektrik Kediaman',
    provider: 'Tenaga Nasional Berhad',
    category: 'electricity' as BillCategory,
    billerCode: '5454',
    cycle: 'monthly' as BillCycle,
    defaultAmount: 140,
    dueDay: 18,
    paymentMethod: 'JomPAY',
  },
  {
    name: 'Air Selangor - Bekalan Air',
    provider: 'Pengurusan Air Selangor Sdn Bhd',
    category: 'water' as BillCategory,
    billerCode: '4200',
    cycle: 'monthly' as BillCycle,
    defaultAmount: 20,
    dueDay: 22,
    paymentMethod: 'JomPAY',
  },
  {
    name: 'TM Unifi Home Fibre',
    provider: 'Telekom Malaysia Berhad',
    category: 'internet' as BillCategory,
    billerCode: '8888',
    cycle: 'monthly' as BillCycle,
    defaultAmount: 139,
    dueDay: 12,
    paymentMethod: 'JomPAY',
  },
  {
    name: 'TIME Internet Home 200M',
    provider: 'TIME dotCom Berhad',
    category: 'internet' as BillCategory,
    billerCode: '1122',
    cycle: 'monthly' as BillCycle,
    defaultAmount: 99,
    dueDay: 15,
    paymentMethod: 'JomPAY',
  },
  {
    name: 'Indah Water Konsortium (IWK)',
    provider: 'Indah Water Konsortium',
    category: 'sewerage' as BillCategory,
    billerCode: '6850',
    cycle: 'bi_monthly' as BillCycle,
    defaultAmount: 24,
    dueDay: 28,
    paymentMethod: 'JomPAY',
  },
  {
    name: 'Cukai Pintu Majlis Perbandaran',
    provider: 'Majlis Perbandaran Kajang / DBKL',
    category: 'tax' as BillCategory,
    billerCode: '3012',
    cycle: 'half_yearly' as BillCycle,
    defaultAmount: 180,
    dueDay: 28,
    paymentMethod: 'JomPAY',
  },
];

export const RecurringBillsScreen: React.FC<RecurringBillsScreenProps> = ({
  bills,
  onAddBill,
  onUpdateBill,
  onDeleteBill,
  onRecordPayment,
  onOpenOcrWithModule,
}) => {
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calendar states
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [selectedBillForPay, setSelectedBillForPay] = useState<RecurringBillItem | null>(null);
  const [expandedBillHistoryId, setExpandedBillHistoryId] = useState<string | null>(null);

  // Toast / feedback message
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Form states for Add / Edit
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formCategory, setFormCategory] = useState<BillCategory>('electricity');
  const [formAmount, setFormAmount] = useState('');
  const [formCycle, setFormCycle] = useState<BillCycle>('monthly');
  const [formDueDay, setFormDueDay] = useState('15');
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAccountNo, setFormAccountNo] = useState('');
  const [formBillerCode, setFormBillerCode] = useState('');
  const [formRef1, setFormRef1] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('JomPAY');
  const [formIsAutoDebit, setFormIsAutoDebit] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  // Form states for Record Payment Modal
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payRefNo, setPayRefNo] = useState('');
  const [payMethod, setPayMethod] = useState('JomPAY');
  const [payNotes, setPayNotes] = useState('');

  // Copy helper
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(`${label} disalin ke papan klip!`);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  // Month navigation for calendar
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth(); // 0 - 11

  const handlePrevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedCalendarDay(null);
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedCalendarDay(null);
  };

  const handleTodayMonth = () => {
    setCalendarDate(new Date());
    setSelectedCalendarDay(new Date().getDate());
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  // Convert to Mon=0 ... Sun=6 (standard Malaysian business calendar)
  const startDayOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthNamesMalay = [
    'Januari',
    'Februari',
    'Mac',
    'April',
    'Mei',
    'Jun',
    'Julai',
    'Ogos',
    'September',
    'Oktober',
    'November',
    'Disember',
  ];

  // Financial Computations for bills
  const totalMonthlyBills = bills.reduce((acc, b) => {
    if (b.cycle === 'yearly') return acc + b.amount / 12;
    if (b.cycle === 'half_yearly') return acc + b.amount / 6;
    if (b.cycle === 'quarterly') return acc + b.amount / 3;
    if (b.cycle === 'bi_monthly') return acc + b.amount / 2;
    return acc + b.amount;
  }, 0);

  const unpaidBills = bills.filter((b) => b.status === 'unpaid' || b.status === 'overdue');
  const paidBills = bills.filter((b) => b.status === 'paid');

  const totalUnpaidAmount = unpaidBills.reduce((acc, b) => acc + b.amount, 0);
  const totalPaidAmount = paidBills.reduce((acc, b) => acc + b.amount, 0);

  // Urgent overdue count
  const overdueCount = bills.filter((b) => {
    const days = daysUntil(b.dueDate);
    return b.status === 'unpaid' && days < 0;
  }).length;

  // Filter bills for list view
  const filteredBills = bills.filter((b) => {
    const matchCategory = categoryFilter === 'all' || b.category === categoryFilter;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'unpaid' && (b.status === 'unpaid' || b.status === 'overdue')) ||
      (statusFilter === 'paid' && b.status === 'paid');
    const matchSearch =
      searchQuery === '' ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.accountNumber && b.accountNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.billerCode && b.billerCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchCalendarDay =
      selectedCalendarDay === null || b.dueDay === selectedCalendarDay;

    return matchCategory && matchStatus && matchSearch && matchCalendarDay;
  });

  // Fast apply Malaysian template
  const handleApplyTemplate = (tmpl: (typeof MALAYSIA_BILL_TEMPLATES)[0]) => {
    setFormName(tmpl.name);
    setFormProvider(tmpl.provider);
    setFormCategory(tmpl.category);
    setFormAmount(tmpl.defaultAmount.toString());
    setFormCycle(tmpl.cycle);
    setFormDueDay(tmpl.dueDay.toString());
    setFormBillerCode(tmpl.billerCode);
    setFormPaymentMethod(tmpl.paymentMethod);

    // Calculate next due date matching this dueDay
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), tmpl.dueDay);
    if (targetDate.getTime() < now.getTime()) {
      targetDate.setMonth(targetDate.getMonth() + 1);
    }
    setFormDueDate(targetDate.toISOString().split('T')[0]);
  };

  // Open Add modal with clean state
  const handleOpenAddModal = (initialDay?: number) => {
    const day = initialDay || 15;
    setFormName('');
    setFormProvider('');
    setFormCategory('electricity');
    setFormAmount('');
    setFormCycle('monthly');
    setFormDueDay(day.toString());
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    setFormDueDate(d.toISOString().split('T')[0]);
    setFormAccountNo('');
    setFormBillerCode('');
    setFormRef1('');
    setFormPaymentMethod('JomPAY');
    setFormIsAutoDebit(false);
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  // Save new bill
  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formAmount) return;

    onAddBill({
      name: formName,
      provider: formProvider || formName,
      category: formCategory,
      amount: parseFloat(formAmount) || 0,
      cycle: formCycle,
      dueDay: parseInt(formDueDay, 10) || 15,
      dueDate: formDueDate,
      accountNumber: formAccountNo || undefined,
      billerCode: formBillerCode || undefined,
      ref1: formRef1 || formAccountNo || undefined,
      paymentMethod: formPaymentMethod,
      isAutoDebit: formIsAutoDebit,
      status: 'unpaid',
      notes: formNotes || undefined,
    });

    setIsAddModalOpen(false);
  };

  // Open mark payment modal
  const handleOpenPaymentModal = (bill: RecurringBillItem) => {
    setSelectedBillForPay(bill);
    setPayAmount(bill.amount.toString());
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayRefNo(`PAY-${Date.now().toString().slice(-6)}`);
    setPayMethod(bill.paymentMethod || 'JomPAY');
    setPayNotes(`Bayaran bil kitaran ${monthNamesMalay[calendarDate.getMonth()]} ${currentYear}`);
    setIsPaymentModalOpen(true);
  };

  // Submit payment
  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPay || !payAmount) return;

    onRecordPayment(selectedBillForPay.id, {
      amount: parseFloat(payAmount) || selectedBillForPay.amount,
      paidDate: payDate,
      referenceNo: payRefNo,
      method: payMethod,
      notes: payNotes,
    });

    setIsPaymentModalOpen(false);
    setSelectedBillForPay(null);
  };

  // Quick toggle paid status
  const handleTogglePaidQuick = (bill: RecurringBillItem) => {
    if (bill.status === 'paid') {
      onUpdateBill({
        ...bill,
        status: 'unpaid',
      });
    } else {
      handleOpenPaymentModal(bill);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-emerald-500/90 text-slate-950 font-bold text-xs shadow-xl backdrop-blur-md flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Screen Title & Navigation Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Modul Utiliti Berasingan
            </span>
            {overdueCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                {overdueCount} Bil Tertunggak
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2.5">
            <Zap className="w-7 h-7 text-emerald-400 fill-emerald-400/20" />
            <span>Recurring Bills & Utiliti</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Pengurusan komitmen bil utiliti tetap (TNB, bekalan air, jalur lebar internet, IWK & cukai pintu) dengan paparan kalendar tarikh akhir bayaran & sokongan JomPAY.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onOpenOcrWithModule('bill')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-950/40 hover:opacity-95 transition"
            title="Imbas Resit / Bil Utiliti Menggunakan Cloudflare Workers AI"
          >
            <Sparkles className="w-4 h-4" />
            <span>Imbas Resit Bil (AI)</span>
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950/40 hover:bg-emerald-400 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Bil</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Monthly Bills */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
            <span>Anggaran Bulanan</span>
            <CalendarIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {formatRM(totalMonthlyBills)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{bills.length} bil utiliti berdaftar</span>
          </div>
        </div>

        {/* Card 2: Unpaid Balance */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-amber-500/20 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between text-amber-300 text-xs mb-1 font-semibold">
            <span>Perlu Dibayar</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">
            {formatRM(totalUnpaidAmount)}
          </div>
          <div className="text-[11px] text-amber-300/80 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>{unpaidBills.length} bil belum diselesaikan</span>
          </div>
        </div>

        {/* Card 3: Paid This Cycle */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-emerald-500/20 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between text-emerald-300 text-xs mb-1 font-semibold">
            <span>Telah Selesai</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {formatRM(totalPaidAmount)}
          </div>
          <div className="text-[11px] text-emerald-300/80 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{paidBills.length} bil selesai dibayar</span>
          </div>
        </div>

        {/* Card 4: Quick JomPAY Readiness */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
            <span>JomPAY & Autodebit</span>
            <QrCode className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-300">
            {bills.filter((b) => b.billerCode).length} / {bills.length}
          </div>
          <div className="text-[11px] text-indigo-300/80 mt-1">
            Siap dengan Kod Biller JomPAY
          </div>
        </div>
      </div>

      {/* View Switcher Toggle: Kalendar vs Senarai Bil */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl max-w-md mx-auto sm:mx-0">
        <button
          onClick={() => setActiveView('calendar')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-extrabold text-xs transition ${
            activeView === 'calendar'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Kalendar Tarikh Akhir</span>
        </button>

        <button
          onClick={() => setActiveView('list')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-extrabold text-xs transition ${
            activeView === 'list'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Senarai Penuh Bil ({bills.length})</span>
        </button>
      </div>

      {/* VIEW 1: PAYMENT DUE CALENDAR VIEW */}
      {activeView === 'calendar' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-slate-900/85 border border-slate-800 p-4 sm:p-6 shadow-2xl space-y-5">
            {/* Calendar Month Header Controller */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition"
                  title="Bulan Sebelum"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center sm:text-left">
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {monthNamesMalay[currentMonth]} {currentYear}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Paparan Jadual & Tarikh Akhir Komitmen Bayaran Bil
                  </p>
                </div>

                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition"
                  title="Bulan Seterusnya"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={handleTodayMonth}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Hari Ini</span>
                </button>

                {selectedCalendarDay !== null && (
                  <button
                    onClick={() => setSelectedCalendarDay(null)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-bold transition flex items-center gap-1.5 border border-amber-500/30"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset Pilihan ({selectedCalendarDay}hb)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800/60">
              <span className="font-bold text-slate-300">Petunjuk Status:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Tertunggak / Lewat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Perlu Dibayar (&le; 3 Hari)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span>Akan Datang</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Telah Dibayar</span>
              </div>
            </div>

            {/* Days of Week Header (Mon to Sun) */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-bold text-slate-400">
              <div className="py-1">Isnin</div>
              <div className="py-1">Selasa</div>
              <div className="py-1">Rabu</div>
              <div className="py-1">Khamis</div>
              <div className="py-1">Jumaat</div>
              <div className="py-1 text-emerald-400/80">Sabtu</div>
              <div className="py-1 text-emerald-400/80">Ahad</div>
            </div>

            {/* Calendar Grid Matrix */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {/* Empty padding for days before month starts */}
              {Array.from({ length: startDayOffset }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[75px] sm:min-h-[90px] rounded-2xl bg-slate-950/20 border border-slate-900/50 opacity-30"
                />
              ))}

              {/* Real month days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const isToday =
                  new Date().getDate() === dayNum &&
                  new Date().getMonth() === currentMonth &&
                  new Date().getFullYear() === currentYear;

                // Find bills due on this day of the month
                const dayBills = bills.filter((b) => b.dueDay === dayNum);
                const hasBills = dayBills.length > 0;
                const hasUnpaid = dayBills.some((b) => b.status === 'unpaid' || b.status === 'overdue');
                const allPaid = hasBills && dayBills.every((b) => b.status === 'paid');

                // Check overdue status
                const isOverdue =
                  hasUnpaid &&
                  dayBills.some((b) => {
                    const days = daysUntil(b.dueDate);
                    return days < 0;
                  });

                const isSelected = selectedCalendarDay === dayNum;

                return (
                  <button
                    key={`day-${dayNum}`}
                    onClick={() =>
                      setSelectedCalendarDay(selectedCalendarDay === dayNum ? null : dayNum)
                    }
                    className={`min-h-[75px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-2xl border text-left flex flex-col justify-between transition relative overflow-hidden group ${
                      isSelected
                        ? 'ring-2 ring-emerald-400 bg-emerald-500/15 border-emerald-500/50'
                        : isToday
                        ? 'bg-slate-800/80 border-emerald-500/50 shadow-md'
                        : hasBills
                        ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                        : 'bg-slate-950/40 border-slate-900/70 hover:border-slate-800'
                    }`}
                  >
                    {/* Day number & today marker */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black rounded-lg w-6 h-6 flex items-center justify-center ${
                          isToday
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : isSelected
                            ? 'bg-emerald-400 text-slate-950'
                            : 'text-slate-300'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {isToday && (
                        <span className="hidden sm:inline text-[9px] font-bold px-1 rounded bg-emerald-500/20 text-emerald-300">
                          Kini
                        </span>
                      )}
                    </div>

                    {/* Bills Indicator on Calendar Cell */}
                    {hasBills ? (
                      <div className="space-y-1 mt-1">
                        {dayBills.slice(0, 2).map((bill) => {
                          const catInfo = CATEGORY_CONFIG[bill.category] || CATEGORY_CONFIG.other;
                          const isPaid = bill.status === 'paid';
                          const isDueSoon = !isPaid && Math.abs(bill.dueDay - new Date().getDate()) <= 3;
                          return (
                            <div
                              key={bill.id}
                              className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-md font-bold truncate flex items-center gap-1 ${
                                isPaid
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isOverdue
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : isDueSoon
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isPaid
                                    ? 'bg-emerald-400'
                                    : isOverdue
                                    ? 'bg-rose-400'
                                    : 'bg-amber-400'
                                }`}
                              />
                              <span className="truncate">{bill.name.split('-')[0].trim()}</span>
                            </div>
                          );
                        })}

                        {dayBills.length > 2 && (
                          <div className="text-[9px] text-slate-400 font-bold px-1">
                            +{dayBills.length - 2} lagi
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition self-end">
                        +
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agenda / Detailed Due Bills on Selected Day or General Schedule */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-emerald-400" />
                  <span>
                    {selectedCalendarDay !== null
                      ? `Jadual Bayaran: ${selectedCalendarDay} ${monthNamesMalay[currentMonth]} ${currentYear}`
                      : `Semua Tarikh Akhir Bil (${monthNamesMalay[currentMonth]})`}
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  {selectedCalendarDay !== null
                    ? `Menunjukkan bil utiliti yang perlu diselesaikan pada ${selectedCalendarDay}hb.`
                    : `Klik pada mana-mana tarikh di kalendar di atas untuk melihat butiran bil hari tersebut.`}
                </p>
              </div>

              {selectedCalendarDay !== null && (
                <button
                  onClick={() => handleOpenAddModal(selectedCalendarDay)}
                  className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold transition border border-emerald-500/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Bil Pada {selectedCalendarDay}hb</span>
                </button>
              )}
            </div>

            {/* List of Bills for selected day or upcoming */}
            <div className="space-y-3">
              {filteredBills.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300">
                    Tiada bil dijadualkan pada tarikh yang dipilih.
                  </p>
                  <button
                    onClick={() => setSelectedCalendarDay(null)}
                    className="mt-2 text-emerald-400 hover:underline font-bold"
                  >
                    Tunjuk semua bil bulan ini
                  </button>
                </div>
              ) : (
                filteredBills.map((bill) => {
                  const cat = CATEGORY_CONFIG[bill.category] || CATEGORY_CONFIG.other;
                  const Icon = cat.icon;
                  const daysLeft = daysUntil(bill.dueDate);
                  const isPaid = bill.status === 'paid';
                  const isOverdue = !isPaid && daysLeft < 0;
                  const isDueSoon = !isPaid && daysLeft >= 0 && daysLeft <= 3;

                  return (
                    <div
                      key={bill.id}
                      className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isPaid
                          ? 'bg-slate-950/40 border-emerald-500/20'
                          : isOverdue
                          ? 'bg-rose-950/20 border-rose-500/40'
                          : isDueSoon
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      {/* Left: Icon & Info */}
                      <div className="flex items-start gap-3.5">
                        <div className={`p-3 rounded-2xl ${cat.bg} ${cat.border} border`}>
                          <Icon className={`w-6 h-6 ${cat.color}`} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="font-bold text-white text-sm">{bill.name}</h5>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cat.bg} ${cat.color} border ${cat.border}`}>
                              {cat.label}
                            </span>
                            {bill.isAutoDebit && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
                                Autodebit
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{bill.provider}</p>

                          {/* Biller Info / JomPAY details */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {bill.billerCode && (
                              <button
                                onClick={() =>
                                  handleCopyText(
                                    `Biller Code: ${bill.billerCode}\nRef-1: ${bill.ref1 || bill.accountNumber || ''}`,
                                    `Maklumat JomPAY ${bill.name}`
                                  )
                                }
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-[11px] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition"
                                title="Klik untuk salin maklumat JomPAY"
                              >
                                <QrCode className="w-3 h-3 text-emerald-400" />
                                <span>JomPAY: <b>{bill.billerCode}</b></span>
                                {bill.accountNumber && (
                                  <span className="text-slate-400">| No: {bill.accountNumber}</span>
                                )}
                                <Copy className="w-2.5 h-2.5 text-slate-400" />
                              </button>
                            )}

                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3 text-slate-400" />
                              <span>Tarikh Akhir: <b>{bill.dueDay}hb</b> ({bill.dueDate})</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount, Status & Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-3.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                        <div className="text-right">
                          <div className="text-lg font-black text-white">
                            {formatRM(bill.amount)}
                          </div>
                          <div className="text-[11px] font-bold">
                            {isPaid ? (
                              <span className="text-emerald-400 flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Telah Dibayar
                              </span>
                            ) : isOverdue ? (
                              <span className="text-rose-400 flex items-center justify-end gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Lewat {Math.abs(daysLeft)} hari
                              </span>
                            ) : isDueSoon ? (
                              <span className="text-amber-400 flex items-center justify-end gap-1">
                                <Clock className="w-3 h-3" />
                                {daysLeft === 0 ? 'Perlu dibayar hari ini!' : `Tinggal ${daysLeft} hari`}
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                Tinggal {daysLeft} hari
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Mark Paid or Toggle */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePaidQuick(bill)}
                            className={`px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md ${
                              isPaid
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isPaid ? 'Batal Bayar' : 'Tandakan Bayar'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL BILLS LIST & MANAGEMENT */}
      {activeView === 'list' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-xl">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari bil mengikut nama (cth TNB), pembekal, nombor akaun, atau kod JomPAY..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  categoryFilter === 'all'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                Semua Kategori
              </button>
              {(Object.keys(CATEGORY_CONFIG) as BillCategory[]).map((catKey) => {
                const info = CATEGORY_CONFIG[catKey];
                return (
                  <button
                    key={catKey}
                    onClick={() => setCategoryFilter(catKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                      categoryFilter === catKey
                        ? `${info.bg} ${info.color} border ${info.border}`
                        : 'bg-slate-800/80 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400 font-semibold">Status:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter('unpaid')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  statusFilter === 'unpaid' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Belum Bayar ({unpaidBills.length})
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  statusFilter === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Selesai Dibayar ({paidBills.length})
              </button>
            </div>
          </div>

          {/* Bill Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBills.map((bill) => {
              const cat = CATEGORY_CONFIG[bill.category] || CATEGORY_CONFIG.other;
              const Icon = cat.icon;
              const daysLeft = daysUntil(bill.dueDate);
              const isPaid = bill.status === 'paid';
              const isOverdue = !isPaid && daysLeft < 0;
              const isDueSoon = !isPaid && daysLeft >= 0 && daysLeft <= 3;
              const isHistoryExpanded = expandedBillHistoryId === bill.id;

              return (
                <div
                  key={bill.id}
                  className={`rounded-3xl border p-5 shadow-xl transition flex flex-col justify-between ${
                    isPaid
                      ? 'bg-slate-900/70 border-emerald-500/20'
                      : isOverdue
                      ? 'bg-slate-900/90 border-rose-500/40'
                      : isDueSoon
                      ? 'bg-slate-900/90 border-amber-500/40'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div>
                    {/* Header: Icon, Name & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl ${cat.bg} ${cat.border} border`}>
                          <Icon className={`w-6 h-6 ${cat.color}`} />
                        </div>
                        <div>
                          <h4 className="font-black text-white text-base tracking-tight">{bill.name}</h4>
                          <p className="text-xs text-slate-400">{bill.provider}</p>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          isPaid
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : isOverdue
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                            : isDueSoon
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isPaid ? 'Telah Dibayar' : isOverdue ? 'Tertunggak' : 'Belum Bayar'}
                      </span>
                    </div>

                    {/* Amount & Schedule */}
                    <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-400">Amaun Bil</div>
                        <div className="text-xl font-black text-emerald-400">
                          {formatRM(bill.amount)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400">Tarikh Akhir</div>
                        <div className="text-sm font-bold text-white flex items-center gap-1 justify-end">
                          <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                          <span>{bill.dueDay}hb ({bill.dueDate})</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isPaid ? 'Selesai kitaran ini' : daysLeft < 0 ? `Lewat ${Math.abs(daysLeft)} hari` : `Baki ${daysLeft} hari`}
                        </div>
                      </div>
                    </div>

                    {/* JomPAY & Account Details Pill Box */}
                    <div className="mt-3.5 space-y-2 text-xs">
                      {bill.billerCode && (
                        <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-indigo-400" />
                            <div>
                              <div className="font-extrabold text-indigo-200 text-xs">
                                JomPAY Biller Code: <span className="text-white font-mono">{bill.billerCode}</span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Ref-1 (No Akaun): <span className="font-mono text-slate-300">{bill.ref1 || bill.accountNumber || '-'}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              handleCopyText(
                                `Biller Code: ${bill.billerCode}\nRef-1: ${bill.ref1 || bill.accountNumber || ''}`,
                                `Info JomPAY ${bill.name}`
                              )
                            }
                            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition border border-slate-800"
                            title="Salin Kod JomPAY"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {bill.notes && (
                        <p className="text-[11px] text-slate-400 italic px-1">
                          Nota: {bill.notes}
                        </p>
                      )}
                    </div>

                    {/* Payment History Accordion */}
                    {bill.paymentHistory && bill.paymentHistory.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() =>
                            setExpandedBillHistoryId(isHistoryExpanded ? null : bill.id)
                          }
                          className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
                        >
                          <History className="w-3 h-3" />
                          <span>
                            {isHistoryExpanded ? 'Sembunyi Rekod Bayaran' : `Lihat Rekod Bayaran (${bill.paymentHistory.length})`}
                          </span>
                        </button>

                        {isHistoryExpanded && (
                          <div className="mt-2 space-y-1.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                            {bill.paymentHistory.map((rec) => (
                              <div
                                key={rec.id}
                                className="flex items-center justify-between text-[11px] border-b border-slate-800/60 pb-1 last:border-0 last:pb-0"
                              >
                                <span className="text-slate-300">{rec.paidDate}</span>
                                <span className="font-mono text-emerald-400">{formatRM(rec.amount)}</span>
                                <span className="text-slate-400 truncate max-w-[120px]">{rec.referenceNo || rec.method}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onDeleteBill(bill.id)}
                      className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition"
                      title="Padam Bil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePaidQuick(bill)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md ${
                          isPaid
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isPaid ? 'Batal Bayar' : 'Tandakan Bayar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / CREATE RECURRING BILL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  <span>Tambah Bil Utiliti Baru</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Daftarkan bil tetap seperti TNB, air, internet untuk pantauan kalendar.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Templates Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Templat Pantas Pembekal Malaysia:
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {MALAYSIA_BILL_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 text-xs font-semibold whitespace-nowrap transition border border-slate-700/60"
                  >
                    {tmpl.name.split('-')[0].trim()}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nama Bil *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cth: TNB - Bil Elektrik Rumah Bangi"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Pembekal / Agensi
                  </label>
                  <input
                    type="text"
                    placeholder="Cth: Tenaga Nasional Berhad"
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Kategori Utiliti
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as BillCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="electricity">Elektrik (TNB)</option>
                    <option value="water">Bekalan Air (Air Selangor/dll)</option>
                    <option value="internet">Internet & Jalur Lebar (TM Unifi/TIME)</option>
                    <option value="sewerage">Pembetungan (IWK)</option>
                    <option value="tax">Cukai Taksiran / Pintu Majlis</option>
                    <option value="maintenance">Yuran Pengurusan JMB / Kondominium</option>
                    <option value="gas">Gas Saluran / Dapur</option>
                    <option value="other">Lain-lain Utiliti</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Anggaran Amaun (RM) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="145.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Kitaran Bayaran
                  </label>
                  <select
                    value={formCycle}
                    onChange={(e) => setFormCycle(e.target.value as BillCycle)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="monthly">Bulanan</option>
                    <option value="bi_monthly">Setiap 2 Bulan (Dwi-Bulanan)</option>
                    <option value="quarterly">Suku Tahunan</option>
                    <option value="half_yearly">Separuh Tahun (Cukai Pintu)</option>
                    <option value="yearly">Tahunan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Hari Tarikh Akhir (Due Day)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formDueDay}
                    onChange={(e) => setFormDueDay(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">Haribulan (1 - 31)</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Tarikh Akhir Kitaran Ini
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* JomPAY & Account Information */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="font-bold text-slate-300 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-indigo-400" />
                  <span>Maklumat Bayaran & JomPAY (Pilihan)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      No Akaun Bil
                    </label>
                    <input
                      type="text"
                      placeholder="Cth: 220019283741"
                      value={formAccountNo}
                      onChange={(e) => setFormAccountNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      JomPAY Biller Code
                    </label>
                    <input
                      type="text"
                      placeholder="Cth: 5454"
                      value={formBillerCode}
                      onChange={(e) => setFormBillerCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Ref-1 JomPAY
                    </label>
                    <input
                      type="text"
                      placeholder="Biasanya no akaun"
                      value={formRef1}
                      onChange={(e) => setFormRef1(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Kaedah Bayaran
                    </label>
                    <select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs"
                    >
                      <option value="JomPAY">JomPAY</option>
                      <option value="Autodebit">Autodebit Bank</option>
                      <option value="FPX / Online Banking">FPX / Online Banking</option>
                      <option value="Kad Kredit / Debit">Kad Kredit / Debit</option>
                      <option value="Cawangan / Kiosk Pos">Cawangan / Kiosk Pos</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isAutoDebitCheck"
                    checked={formIsAutoDebit}
                    onChange={(e) => setFormIsAutoDebit(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="isAutoDebitCheck" className="text-slate-300 font-medium">
                    Ditubuhkan sebagai potongan automatik (Autodebit)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nota / Catatan
                </label>
                <input
                  type="text"
                  placeholder="Cth: No meter 44019, bayar melalui Maybank2u"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition shadow-lg shadow-emerald-950/40"
                >
                  Simpan Bil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD PAYMENT / MARK AS PAID */}
      {isPaymentModalOpen && selectedBillForPay && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Rekod Bayaran Bil</span>
                </h3>
                <p className="text-xs text-slate-400">{selectedBillForPay.name}</p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Jumlah Bayaran (RM) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-black text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Tarikh Bayaran
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Kaedah Bayaran
                  </label>
                  <input
                    type="text"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nombor Rujukan / Resit
                </label>
                <input
                  type="text"
                  placeholder="Cth: JOMPAY-992102 atau MBB-991823"
                  value={payRefNo}
                  onChange={(e) => setPayRefNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Catatan
                </label>
                <input
                  type="text"
                  placeholder="Cth: Bayaran bil elektrik bulan semasa"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition shadow-lg shadow-emerald-950/40"
                >
                  Sahkan & Tandakan Bayar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

