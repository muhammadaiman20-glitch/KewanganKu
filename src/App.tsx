import React, { useState } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { AppDatabase, DebtItem, FuelLogItem, SubscriptionItem, TabType, UserProfile, VehicleItem, VehicleServiceLog } from './types';
import {
  loadDatabase,
  daysUntil,
} from './services/storage';
import { VoiceInput } from './components/VoiceInput';
import { ExpenseHistory } from './components/ExpenseHistory';
import { useCloudSync } from './hooks/useCloudSync';
import { Navbar } from './components/Navbar';
import { RecurringBillsScreen } from './components/RecurringBillsScreen';
import { BottomNavigation } from './components/BottomNavigation';
import { DashboardScreen } from './components/DashboardScreen';
import { DebtScreen } from './components/DebtScreen';
import { SubscriptionScreen } from './components/SubscriptionScreen';
import { VehicleScreen } from './components/VehicleScreen';
import { FuelScreen } from './components/FuelScreen';
import { OcrScannerScreen } from './components/OcrScannerScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { SettingsScreen } from './components/SettingsScreen';

const TAB_INDEX_MAP: Record<TabType, number> = {
  dashboard: 0,
  bills: 8,
  debt: 1,
  subscription: 2,
  ocr: 3,
  analysis: 4,
  vehicle: 5,
  fuel: 6,
  settings: 7,
};

const pageVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 40 : dir < 0 ? -40 : 0,
    opacity: 0,
    scale: 0.985,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: 'spring', stiffness: 350, damping: 30 },
      opacity: { duration: 0.22, ease: 'easeOut' },
      scale: { duration: 0.22, ease: 'easeOut' },
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -40 : dir < 0 ? 40 : 0,
    opacity: 0,
    scale: 0.985,
    transition: {
      x: { type: 'spring', stiffness: 350, damping: 30 },
      opacity: { duration: 0.18, ease: 'easeIn' },
      scale: { duration: 0.18, ease: 'easeIn' },
    },
  }),
};

export default function App() {
  const [resetGeneration, setResetGeneration] = useState(0);
  const [data, setData] = useState<AppDatabase>(() => loadDatabase());
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [direction, setDirection] = useState<number>(0);
  const [ocrModuleHint, setOcrModuleHint] = useState<'debt' | 'subscription' | 'fuel' | 'auto'>('auto');
  const cloud = useCloudSync(data, setData);
  const syncing = cloud.status.phase === 'syncing' || cloud.status.phase === 'starting';
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleTabChange = (nextTab: TabType) => {
    if (nextTab === currentTab) return;
    const prevIdx = TAB_INDEX_MAP[currentTab];
    const nextIdx = TAB_INDEX_MAP[nextTab];
    setDirection(nextIdx > prevIdx ? 1 : -1);
    setCurrentTab(nextTab);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleTriggerSync = () => { void cloud.syncNow(); };

  // Navigate to OCR with specific target module
  const handleOpenOcrWithModule = (moduleHint: 'debt' | 'subscription' | 'fuel' | 'bill') => {
    setOcrModuleHint(moduleHint === 'bill' ? 'auto' : moduleHint);
    handleTabChange('ocr');
  };

  // 1. Debt Actions
  const handleAddDebt = (newDebt: Omit<DebtItem, 'id' | 'payments' | 'createdAt'>) => {
    const item: DebtItem = {
      ...newDebt,
      id: `debt-${Date.now()}`,
      payments: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    setData((prev) => ({
      ...prev,
      debts: [item, ...prev.debts],
    }));
    showToast(`Hutang "${item.title}" berjaya didaftarkan!`);
  };

  const handleRecordDebtPayment = (debtId: string, amount: number, notes?: string, refNo?: string, paymentDate?: string) => {
    setData((prev) => {
      const updatedDebts = prev.debts.map((d) => {
        if (d.id === debtId) {
          const newRemaining = Math.max(0, d.remainingBalance - amount);
          const paymentRecord = {
            id: `pay-${Date.now()}`,
            debtId: d.id,
            amount,
            date: paymentDate || new Date().toISOString().split('T')[0],
            referenceNo: refNo,
            notes,
          };
          return {
            ...d,
            remainingBalance: newRemaining,
            status: (newRemaining <= 0 ? 'paid_off' : 'active') as DebtItem['status'],
            tenureMonthsRemaining: Math.max(0, d.tenureMonthsRemaining - 1),
            payments: [paymentRecord, ...d.payments],
          };
        }
        return d;
      });
      return { ...prev, debts: updatedDebts };
    });
    showToast(`Bayaran RM ${amount.toFixed(2)} berjaya direkodkan!`);
  };

  const handleUpdateDebtMonthlyInstallment = (debtId: string, newMonthly: number) => {
    setData((prev) => ({
      ...prev,
      debts: prev.debts.map((d) =>
        d.id === debtId ? { ...d, monthlyInstallment: newMonthly } : d
      ),
    }));
    showToast(`Ansuran bulanan dikemas kini ke RM ${newMonthly.toFixed(2)}/bln!`);
  };

  // 2. Subscription Actions
  const handleAddSubscription = (newSub: Omit<SubscriptionItem, 'id'>) => {
    const item: SubscriptionItem = {
      ...newSub,
      id: `sub-${Date.now()}`,
    };
    setData((prev) => ({
      ...prev,
      subscriptions: [item, ...prev.subscriptions],
    }));
    showToast(`Langganan "${item.name}" berjaya ditambah!`);
  };

  const handleUpdateSubStatus = (id: string, status: SubscriptionItem['status']) => {
    setData((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.map((s) => (s.id === id ? { ...s, status } : s)),
    }));
  };

  const handleDeleteSubscription = (id: string) => {
    setData((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.filter((s) => s.id !== id),
    }));
    showToast('Langganan telah dipadam.');
  };

  // 3. Vehicle Actions
  const handleAddVehicle = (newVeh: Omit<VehicleItem, 'id' | 'services'>) => {
    const item: VehicleItem = {
      ...newVeh,
      id: `veh-${Date.now()}`,
      services: [],
    };
    setData((prev) => ({
      ...prev,
      vehicles: [...prev.vehicles, item],
    }));
    showToast(`Kenderaan ${item.plateNumber} berjaya didaftarkan!`);
  };

  const handleRecordVehicleService = (
    vehId: string,
    newService: Omit<VehicleServiceLog, 'id' | 'vehicleId'>
  ) => {
    setData((prev) => {
      const updatedVehicles = prev.vehicles.map((v) => {
        if (v.id === vehId) {
          const srvLog: VehicleServiceLog = {
            ...newService,
            id: `srv-${Date.now()}`,
            vehicleId: vehId,
          };
          const nextServDate = new Date();
          nextServDate.setMonth(nextServDate.getMonth() + 6);

          return {
            ...v,
            currentOdometer: Math.max(v.currentOdometer, newService.odometer),
            nextServiceOdometer: newService.odometer + v.serviceIntervalKm,
            nextServiceDate: nextServDate.toISOString().split('T')[0],
            services: [srvLog, ...v.services],
          };
        }
        return v;
      });
      return { ...prev, vehicles: updatedVehicles };
    });
    showToast('Rekod servis berjaya disimpan!');
  };

  const handleUpdateOdometer = (vehId: string, newOdometer: number) => {
    setData((prev) => ({
      ...prev,
      vehicles: prev.vehicles.map((v) =>
        v.id === vehId ? { ...v, currentOdometer: newOdometer } : v
      ),
    }));
  };

  const handleUpdateIncome = (newIncome: number) => {
    setData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        monthlyIncome: newIncome,
      },
    }));
    showToast(`Pendapatan bulanan dikemas kini ke RM ${newIncome.toLocaleString()}!`);
  };

  // 4. Fuel Log Actions (with smart efficiency calculation)
  const handleAddFuelLog = (
    newLog: Omit<FuelLogItem, 'id' | 'efficiencyKmPerLitre' | 'costPerKm' | 'distanceTrip'>
  ) => {
    // Find past fuel log for same vehicle to compute trip distance & km/L
    const pastLogs = data.fuelLogs
      .filter((l) => l.vehicleId === newLog.vehicleId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let distanceTrip: number | undefined;
    if (pastLogs.length > 0 && newLog.odometer > pastLogs[0].odometer) {
      distanceTrip = newLog.odometer - pastLogs[0].odometer;
    }

    const efficiency =
      distanceTrip && newLog.litres > 0 ? parseFloat((distanceTrip / newLog.litres).toFixed(2)) : undefined;
    const costPerKm =
      distanceTrip ? parseFloat((newLog.amount / distanceTrip).toFixed(3)) : undefined;

    const logItem: FuelLogItem = {
      ...newLog,
      id: `fuel-${Date.now()}`,
      distanceTrip,
      efficiencyKmPerLitre: efficiency,
      costPerKm,
    };

    // Also update vehicle's current odometer if newer
    setData((prev) => ({
      ...prev,
      fuelLogs: [logItem, ...prev.fuelLogs],
      vehicles: prev.vehicles.map((v) =>
        v.id === newLog.vehicleId && newLog.odometer > v.currentOdometer
          ? { ...v, currentOdometer: newLog.odometer }
          : v
      ),
    }));

    showToast(efficiency ? `Log minyak ditambah! Kecekapan: ${efficiency} km/L` : 'Log minyak ditambah. Kecekapan tersedia selepas bacaan perjalanan yang sah.');
  };

  // 5. OCR Scanner auto-save hooks
  const handleOcrSaveToDebt = (ocrData: { debtId: string; creditor: string; amount: number; date: string; refNo?: string; notes?: string }) => {
    if (!data.debts.some(d => d.id === ocrData.debtId && d.status === 'active')) throw new Error('Hutang tidak dijumpai. Pilih hutang yang betul.');
    handleRecordDebtPayment(ocrData.debtId, ocrData.amount, ocrData.notes, ocrData.refNo, ocrData.date);
  };

  const handleOcrSaveToSubscription = (ocrData: {
    name: string;
    amount: number;
    renewalDate: string;
    category?: string;
  }) => {
    handleAddSubscription({
      name: ocrData.name,
      amount: ocrData.amount,
      billingCycle: 'monthly',
      renewalDate: ocrData.renewalDate,
      category: (ocrData.category as any) || 'entertainment',
      paymentMethod: 'Auto Debit / Resit',
      status: 'active',
    });
  };

  const handleOcrSaveToFuel = (ocrData: {
    vehicleId: string;
    vehiclePlate: string;
    station: string;
    amount: number;
    litres: number;
    pricePerLitre: number;
    fuelType: 'RON95' | 'RON97' | 'Diesel' | 'RON100';
    date: string;
    odometer: number;
  }) => {
    const veh = data.vehicles.find((v) => v.id === ocrData.vehicleId);
    if (!veh) throw new Error('Kenderaan tidak dijumpai.');
    handleAddFuelLog({
      vehicleId: veh?.id || 'veh-1',
      vehiclePlate: veh?.plateNumber || 'VHY 8821',
      station: ocrData.station,
      amount: ocrData.amount,
      litres: ocrData.litres,
      pricePerLitre: ocrData.pricePerLitre,
      fuelType: ocrData.fuelType,
      odometer: ocrData.odometer,
      date: ocrData.date,
      notes: 'Direkodkan secara automatik melalui imbasan AI OCR',
    });
  };

  // Badges count calculation
  const urgentVehicleAlerts = data.vehicles.filter(
    (v) => daysUntil(v.roadTaxExpiry) <= 30 || daysUntil(v.insuranceExpiry) <= 30
  ).length;

  const urgentDebtsCount = data.debts.filter(
    (d) => d.status === 'active' && Math.abs(d.dueDay - new Date().getDate()) <= 3
  ).length;

  const urgentSubsCount = data.subscriptions.filter(
    (s) => s.status === 'active' && daysUntil(s.renewalDate) <= 5
  ).length;

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        profile={data.profile}
        onOpenSettings={() => handleTabChange('settings')}
        onOpenAnalysis={() => handleTabChange('analysis')}
        onOpenOcr={() => {
          setOcrModuleHint('auto');
          handleTabChange('ocr');
        }}
        syncing={syncing}
        syncStatus={cloud.status}
        onTriggerSync={handleTriggerSync}
        urgentAlertCount={urgentVehicleAlerts + urgentDebtsCount}
      />

      {/* Main Content Area with Smooth Page Slide Transitions */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-5 pb-[calc(var(--navigation-height)+var(--navigation-inset)+24px)] overflow-x-hidden">
        <section aria-label="Status penyelarasan" className="mb-4 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm">
          <p role="status" className={cloud.status.phase === 'synced' ? 'text-emerald-300' : 'text-amber-200'}>{cloud.status.message}</p>
          {cloud.status.updatedAt && <p className="mt-1 text-xs text-slate-300">Terakhir: {new Date(cloud.status.updatedAt).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</p>}
          {cloud.status.phase === 'conflict' && <div className="mt-3 space-y-3">
            <p className="text-slate-200">Kedua-dua peranti menukar medan yang sama. Salinan pemulihan disimpan sebelum anda memilih.</p>
            <div className="overflow-x-auto"><table className="w-full text-left text-xs text-slate-200"><thead><tr><th className="p-2">Rekod / medan</th><th className="p-2">Peranti ini</th><th className="p-2">Awan</th></tr></thead><tbody>{cloud.status.details.slice(0, 20).map((item, index) => <tr key={index} className="border-t border-slate-700"><td className="p-2 align-top">{item.label}</td><td className="p-2 align-top break-words max-w-56">{item.local}</td><td className="p-2 align-top break-words max-w-56">{item.cloud}</td></tr>)}</tbody></table></div>
            <div className="flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded-lg bg-slate-700 px-3" onClick={() => void cloud.resolve('cloud')}>Guna medan versi awan</button><button type="button" className="min-h-11 rounded-lg bg-emerald-400 px-3 font-semibold text-slate-950" onClick={() => void cloud.resolve('local')}>Guna medan versi peranti ini</button></div>
          </div>}
          {(cloud.status.phase === 'error' || cloud.status.phase === 'offline') && <button type="button" onClick={handleTriggerSync} className="mt-2 min-h-11 underline text-emerald-300">Cuba selaraskan semula</button>}
        </section>
        <VoiceInput key={resetGeneration} vehicles={data.vehicles} screen={currentTab}
          onSaveFuel={handleAddFuelLog}
          onSaveExpense={(expense) => {
            setData(prev => ({ ...prev, expenses: [{ ...expense, id: crypto.randomUUID() }, ...prev.expenses] }));
            showToast('Perbelanjaan berjaya disimpan!');
          }} />
        {currentTab === 'dashboard' && <ExpenseHistory expenses={data.expenses}
          onDelete={id => setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }))} />}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentTab}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full"
          >
            {currentTab === 'dashboard' && (
              <DashboardScreen
                data={data}
                onNavigate={handleTabChange}
                onOpenOcrWithModule={handleOpenOcrWithModule}
              />
            )}

            {currentTab === 'bills' && <RecurringBillsScreen
              bills={data.bills}
              onAddBill={bill => setData(prev => ({ ...prev, bills: [{ ...bill, id: crypto.randomUUID(), paymentHistory: [], createdAt: new Date().toISOString().split('T')[0] }, ...prev.bills] }))}
              onUpdateBill={bill => setData(prev => ({ ...prev, bills: prev.bills.map(item => item.id === bill.id ? bill : item) }))}
              onDeleteBill={id => setData(prev => ({ ...prev, bills: prev.bills.filter(item => item.id !== id) }))}
              onRecordPayment={(id, record) => setData(prev => ({ ...prev, bills: prev.bills.map(bill => bill.id === id ? { ...bill, status: 'paid', paymentHistory: [{ ...record, id: crypto.randomUUID(), billId: id }, ...bill.paymentHistory] } : bill) }))}
              onOpenOcrWithModule={handleOpenOcrWithModule}
              onNavigate={handleTabChange}
            />}

            {currentTab === 'debt' && (
              <DebtScreen
                debts={data.debts}
                onAddDebt={handleAddDebt}
                onUpdateDebt={debt => setData(prev => ({ ...prev, debts: prev.debts.map(item => item.id === debt.id ? debt : item) }))}
                onRecordPayment={handleRecordDebtPayment}
                onUpdateDebtMonthlyInstallment={handleUpdateDebtMonthlyInstallment}
                onOpenOcrWithModule={handleOpenOcrWithModule}
              />
            )}

            {currentTab === 'subscription' && (
              <SubscriptionScreen
                subscriptions={data.subscriptions}
                onAddSubscription={handleAddSubscription}
                onUpdateStatus={handleUpdateSubStatus}
                onDeleteSubscription={handleDeleteSubscription}
                onOpenOcrWithModule={handleOpenOcrWithModule}
              />
            )}

            {currentTab === 'vehicle' && (
              <VehicleScreen
                vehicles={data.vehicles}
                onAddVehicle={handleAddVehicle}
                onRecordService={handleRecordVehicleService}
                onUpdateOdometer={handleUpdateOdometer}
              />
            )}

            {currentTab === 'fuel' && (
              <FuelScreen
                fuelLogs={data.fuelLogs}
                vehicles={data.vehicles}
                onAddFuelLog={handleAddFuelLog}
                onOpenOcrWithModule={handleOpenOcrWithModule}
              />
            )}

            {currentTab === 'ocr' && (
              <OcrScannerScreen
                initialModule={ocrModuleHint}
                debts={data.debts}
                onSaveExpense={expense => { setData(prev => ({ ...prev, expenses: [{ ...expense, id: crypto.randomUUID() }, ...prev.expenses] })); showToast('Perbelanjaan resit disimpan!'); }}
                vehicles={data.vehicles}
                onSaveToDebt={handleOcrSaveToDebt}
                onSaveToSubscription={handleOcrSaveToSubscription}
                onSaveToFuel={handleOcrSaveToFuel}
                onNavigate={handleTabChange}
              />
            )}

            {currentTab === 'analysis' && (
              <AnalysisScreen
                data={data}
                onUpdateIncome={handleUpdateIncome}
                onNavigate={handleTabChange}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsScreen
                key={resetGeneration}
                profile={data.profile}
                database={data}
                onUpdateProfile={(profile) => setData((prev) => ({ ...prev, profile }))}
                onRestoreDatabase={(newDb) => {
                  setData(newDb);
                  showToast('Pangkalan data berjaya dipulihkan!');
                }}
                onResetEverything={async () => {
                  await cloud.resetAll();
                  localStorage.removeItem('kewanganku_app_data_v1');
                  setResetGeneration(value => value + 1);
                  showToast('Semua rekod dan profil awan telah dikosongkan.');
                }}
                syncStatus={cloud.status}
                syncing={syncing}
                onTriggerSync={handleTriggerSync}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Bottom Toast Notification with Spring Motion */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-emerald-500/50 text-white font-bold text-xs shadow-2xl backdrop-blur-md flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Android Material 3 Bottom Navigation Bar */}
      <BottomNavigation
        currentTab={currentTab}
        onChangeTab={handleTabChange}
        billBadge={data.bills.filter(bill => bill.status !== 'paid').length}
        debtBadge={urgentDebtsCount}
        subBadge={urgentSubsCount}
        vehicleBadge={urgentVehicleAlerts}
      />
    </div>
  );
}

