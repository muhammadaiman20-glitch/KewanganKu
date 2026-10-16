import {
  AppDatabase,
  DebtItem,
  FuelLogItem,
  RecurringBillItem,
  SubscriptionItem,
  UserProfile,
  VehicleItem,
} from '../types';

const STORAGE_KEY = 'kewanganku_app_data_v2'; // bumped for bills schema

export const INITIAL_USER_PROFILE: UserProfile = {
  name: 'Muhammad Aiman',
  email: 'MuhammadAiman20@gmail.com',
  phone: '+60 12-345 6789',
  currency: 'RM',
  monthlyIncome: 6500,
  theme: 'dark',
  googleDriveConnected: true,
  lastBackupTimestamp: '2026-10-15T18:30:00.000Z',
};

export const INITIAL_DEBTS: DebtItem[] = [
  {
    id: 'debt-1',
    title: 'Pinjaman Kereta Perodua Ativa',
    creditor: 'Maybank Islamic Berhad',
    type: 'car',
    originalAmount: 64500,
    remainingBalance: 41180,
    monthlyInstallment: 580,
    dueDay: 10,
    interestRate: 3.15,
    tenureMonthsTotal: 84,
    tenureMonthsRemaining: 54,
    status: 'active',
    payments: [
      {
        id: 'pay-1',
        debtId: 'debt-1',
        amount: 580,
        date: '2026-10-10',
        referenceNo: 'MBB-HP-8891024',
        notes: 'Bayaran ansuran automatik perbankan dalam talian',
      },
      {
        id: 'pay-2',
        debtId: 'debt-1',
        amount: 580,
        date: '2026-09-10',
        referenceNo: 'MBB-HP-7762198',
        notes: 'Bayaran ansuran bulanan',
      },
    ],
    notes: 'Ansuran bulanan tetap setiap 10 haribulan melalui Maybank2u.',
    createdAt: '2022-04-10',
  },
  {
    id: 'debt-2',
    title: 'Pinjaman Pendidikan PTPTN',
    creditor: 'Perbadanan Tabung Pendidikan Tinggi Nasional',
    type: 'education',
    originalAmount: 32000,
    remainingBalance: 14200,
    monthlyInstallment: 180,
    dueDay: 27,
    interestRate: 1.0,
    tenureMonthsTotal: 180,
    tenureMonthsRemaining: 79,
    status: 'active',
    payments: [
      {
        id: 'pay-3',
        debtId: 'debt-2',
        amount: 180,
        date: '2026-09-27',
        referenceNo: 'PTPTN-FPX-55421',
        notes: 'Bayaran FPX potongan bulanan',
      },
    ],
    notes: 'Ujrah 1% tahunan. Diskaun bayaran balik konsisten.',
    createdAt: '2019-12-01',
  },
  {
    id: 'debt-3',
    title: 'Pembiayaan Rumah (Rumah Selangorku)',
    creditor: 'Bank Islam Malaysia Berhad',
    type: 'housing',
    originalAmount: 250000,
    remainingBalance: 228400,
    monthlyInstallment: 1250,
    dueDay: 1,
    interestRate: 4.25,
    tenureMonthsTotal: 360,
    tenureMonthsRemaining: 312,
    status: 'active',
    payments: [
      {
        id: 'pay-4',
        debtId: 'debt-3',
        amount: 1250,
        date: '2026-10-01',
        referenceNo: 'BIMB-HL-109283',
        notes: 'Potongan ansuran bulanan',
      },
    ],
    notes: 'Kadar faedah terapung BFR + 0.35%.',
    createdAt: '2022-08-01',
  },
  {
    id: 'debt-4',
    title: 'Kad Kredit Maybank Islamic Ikhwan',
    creditor: 'Maybank Berhad',
    type: 'credit_card',
    originalAmount: 3500,
    remainingBalance: 840,
    monthlyInstallment: 150,
    dueDay: 18,
    interestRate: 15.0,
    tenureMonthsTotal: 12,
    tenureMonthsRemaining: 6,
    status: 'active',
    payments: [
      {
        id: 'pay-5',
        debtId: 'debt-4',
        amount: 300,
        date: '2026-09-18',
        referenceNo: 'MBB-CC-991032',
        notes: 'Bayaran lebihan daripada minimum',
      },
    ],
    notes: 'Sasaran langsaikan baki dalam 3 bulan.',
    createdAt: '2024-01-15',
  },
];

export const INITIAL_BILLS: RecurringBillItem[] = [
  {
    id: 'bill-1',
    name: 'TNB - Bil Elektrik Kediaman',
    provider: 'Tenaga Nasional Berhad',
    category: 'electricity',
    accountNumber: '220091827411',
    billerCode: '5454',
    ref1: '220091827411',
    amount: 142.50,
    cycle: 'monthly',
    dueDay: 18,
    dueDate: '2026-10-18',
    status: 'unpaid',
    isAutoDebit: false,
    paymentMethod: 'JomPAY',
    notes: 'Tarif kediaman blok domestik. Perlu dibayar sebelum 18hb.',
    paymentHistory: [
      {
        id: 'bp-1',
        billId: 'bill-1',
        amount: 138.20,
        paidDate: '2026-09-17',
        referenceNo: 'JOMPAY-TNB-990182',
        method: 'JomPAY',
        notes: 'Bayaran bil elektrik bulan September',
      },
    ],
    createdAt: '2022-01-01',
  },
  {
    id: 'bill-2',
    name: 'Pengurusan Air Selangor',
    provider: 'Air Selangor Sdn Bhd',
    category: 'water',
    accountNumber: '1009283741',
    billerCode: '4200',
    ref1: '1009283741',
    amount: 18.40,
    cycle: 'monthly',
    dueDay: 22,
    dueDate: '2026-10-22',
    status: 'unpaid',
    isAutoDebit: false,
    paymentMethod: 'JomPAY',
    notes: 'Kadar domestik bandar Baru Bangi. Air bersih berpaip.',
    paymentHistory: [
      {
        id: 'bp-2',
        billId: 'bill-2',
        amount: 17.50,
        paidDate: '2026-09-20',
        referenceNo: 'AIR-SEL-882190',
        method: 'JomPAY',
      },
    ],
    createdAt: '2022-01-01',
  },
  {
    id: 'bill-3',
    name: 'TM Unifi Home Fibre 300Mbps',
    provider: 'Telekom Malaysia Berhad',
    category: 'internet',
    accountNumber: '1029384756',
    billerCode: '8888',
    ref1: '1029384756',
    amount: 139.00,
    cycle: 'monthly',
    dueDay: 12,
    dueDate: '2026-10-12',
    status: 'paid',
    isAutoDebit: true,
    paymentMethod: 'Autodebit Maybank',
    notes: 'Pakej internet gentian rumah 300Mbps tanpa had kuota.',
    paymentHistory: [
      {
        id: 'bp-3',
        billId: 'bill-3',
        amount: 139.00,
        paidDate: '2026-10-11',
        referenceNo: 'TM-AUTO-771239',
        method: 'Autodebit',
        notes: 'Autodebit berjaya ditolak dari akaun Maybank',
      },
    ],
    createdAt: '2022-03-15',
  },
  {
    id: 'bill-4',
    name: 'Indah Water Konsortium (IWK)',
    provider: 'Indah Water Konsortium Sdn Bhd',
    category: 'sewerage',
    accountNumber: '9928172600',
    billerCode: '6850',
    ref1: '9928172600',
    amount: 24.00,
    cycle: 'bi_monthly',
    dueDay: 28,
    dueDate: '2026-10-28',
    status: 'unpaid',
    isAutoDebit: false,
    paymentMethod: 'JomPAY',
    notes: 'Caj perkhidmatan pembetungan bersambung dwi-bulanan.',
    paymentHistory: [
      {
        id: 'bp-4',
        billId: 'bill-4',
        amount: 24.00,
        paidDate: '2026-08-27',
        referenceNo: 'IWK-JOM-112344',
        method: 'JomPAY',
      },
    ],
    createdAt: '2022-01-01',
  },
  {
    id: 'bill-5',
    name: 'Cukai Pintu Majlis (MPKj)',
    provider: 'Majlis Perbandaran Kajang',
    category: 'tax',
    accountNumber: 'MPKJ-TAX-9921',
    billerCode: '3012',
    ref1: 'MPKJ-TAX-9921',
    amount: 180.00,
    cycle: 'half_yearly',
    dueDay: 30,
    dueDate: '2026-11-30',
    status: 'unpaid',
    isAutoDebit: false,
    paymentMethod: 'JomPAY',
    notes: 'Cukai Taksiran Penggal Kedua 2026. Perlu dibayar sebelum 30 November.',
    paymentHistory: [
      {
        id: 'bp-5',
        billId: 'bill-5',
        amount: 180.00,
        paidDate: '2026-02-25',
        referenceNo: 'MPKJ-FPX-44211',
        method: 'FPX',
        notes: 'Bayaran Cukai Taksiran Penggal Pertama 2026',
      },
    ],
    createdAt: '2022-01-01',
  },
];

export const INITIAL_SUBSCRIPTIONS: SubscriptionItem[] = [
  {
    id: 'sub-1',
    name: 'Netflix Premium 4K',
    category: 'entertainment',
    amount: 54.90,
    billingCycle: 'monthly',
    renewalDate: '2026-10-24',
    paymentMethod: 'Maybank Visa PayWave',
    status: 'active',
    notes: 'Pelan 4 peranti berkongsi bersama keluarga.',
  },
  {
    id: 'sub-2',
    name: 'Spotify Premium Family',
    category: 'entertainment',
    amount: 24.90,
    billingCycle: 'monthly',
    renewalDate: '2026-10-28',
    paymentMethod: 'Maybank Visa Card',
    status: 'active',
    notes: 'Pelan muzik keluarga tanpa iklan.',
  },
  {
    id: 'sub-3',
    name: 'Penapis Air Coway Ombak',
    category: 'utilities',
    amount: 115.00,
    billingCycle: 'monthly',
    renewalDate: '2026-11-05',
    paymentMethod: 'Autodebit Maybank',
    status: 'active',
    notes: 'Pakej sewa beli termasuk servis berkala setiap 2 bulan.',
  },
  {
    id: 'sub-5',
    name: 'ChatGPT Plus & Claude Pro',
    category: 'productivity',
    amount: 94.50,
    billingCycle: 'monthly',
    renewalDate: '2026-11-12',
    paymentMethod: 'Wise Virtual Card',
    status: 'active',
    notes: 'Langganan AI untuk produktiviti kerja dan pengekodan.',
  },
  {
    id: 'sub-6',
    name: 'iCloud+ 200GB Storage',
    category: 'productivity',
    amount: 13.90,
    billingCycle: 'monthly',
    renewalDate: '2026-10-19',
    paymentMethod: 'Apple Pay',
    status: 'active',
    notes: 'Sandaran foto dan dokumen iPhone & MacBook.',
  },
];

export const INITIAL_VEHICLES: VehicleItem[] = [
  {
    id: 'veh-1',
    name: 'Perodua Ativa 1.0 Turbo AV',
    plateNumber: 'VHY 8821',
    type: 'suv',
    year: 2022,
    currentOdometer: 38450,
    roadTaxExpiry: '2026-11-24', // ~39 days left
    insuranceExpiry: '2026-11-24',
    insuranceProvider: 'Etiqa Takaful Komprehensif',
    nextServiceOdometer: 40000,
    nextServiceDate: '2026-12-10',
    serviceIntervalKm: 10000,
    services: [
      {
        id: 'srv-1',
        vehicleId: 'veh-1',
        date: '2026-05-15',
        odometer: 30200,
        cost: 285.00,
        workshop: 'Pusat Servis Perodua Bangi',
        items: [
          'Minyak Enjin Fully Synthetic 0W-20 Perodua',
          'Penapis Minyak (Oil Filter)',
          'Drain Gasket',
          'Pemeriksaan 40 Titik Keselamatan',
        ],
        notes: 'Pemeriksaan brek depan dan tayar masih tebal 70%.',
      },
      {
        id: 'srv-2',
        vehicleId: 'veh-1',
        date: '2025-11-20',
        odometer: 20150,
        cost: 410.00,
        workshop: 'Pusat Servis Perodua Bangi',
        items: [
          'Minyak Enjin Fully Synthetic',
          'Oil Filter & Air Filter',
          'Minyak Brek DOT 4',
          'Tayar Rotation & Balancing',
        ],
      },
    ],
  },
  {
    id: 'veh-2',
    name: 'Honda City 1.5 RS Hatchback',
    plateNumber: 'BQE 4099',
    type: 'car',
    year: 2023,
    currentOdometer: 21500,
    roadTaxExpiry: '2027-02-15',
    insuranceExpiry: '2027-02-15',
    insuranceProvider: 'Allianz General Insurance',
    nextServiceOdometer: 25000,
    nextServiceDate: '2027-01-20',
    serviceIntervalKm: 10000,
    services: [
      {
        id: 'srv-3',
        vehicleId: 'veh-2',
        date: '2026-04-10',
        odometer: 15400,
        cost: 320.00,
        workshop: 'Honda Kah Motor Selayang',
        items: [
          'Honda Genuine Engine Oil 0W-20 SN',
          'Oil Filter element',
          'Air Conditioner Filter',
        ],
      },
    ],
  },
];

export const INITIAL_FUEL_LOGS: FuelLogItem[] = [
  {
    id: 'fuel-1',
    vehicleId: 'veh-1',
    vehiclePlate: 'VHY 8821',
    date: '2026-10-12',
    station: 'Petronas Bandar Baru Bangi Seksyen 9',
    fuelType: 'RON95',
    amount: 65.00,
    litres: 31.70,
    pricePerLitre: 2.05,
    odometer: 38450,
    distanceTrip: 460,
    efficiencyKmPerLitre: 14.51,
    costPerKm: 0.141,
    notes: 'Isian penuh tangki Petronas Primax 95 with Pro-Drive.',
  },
  {
    id: 'fuel-2',
    vehicleId: 'veh-1',
    vehiclePlate: 'VHY 8821',
    date: '2026-10-02',
    station: 'Shell R&R Seremban Arah Utara',
    fuelType: 'RON95',
    amount: 60.00,
    litres: 29.27,
    pricePerLitre: 2.05,
    odometer: 37990,
    distanceTrip: 435,
    efficiencyKmPerLitre: 14.86,
    costPerKm: 0.138,
    notes: 'Perjalanan balik dari Melaka ke Bangi PLUS Highway.',
  },
  {
    id: 'fuel-3',
    vehicleId: 'veh-1',
    vehiclePlate: 'VHY 8821',
    date: '2026-09-22',
    station: 'BHPetrol Kajang Utama',
    fuelType: 'RON95',
    amount: 55.00,
    litres: 26.83,
    pricePerLitre: 2.05,
    odometer: 37555,
    distanceTrip: 410,
    efficiencyKmPerLitre: 15.28,
    costPerKm: 0.134,
    notes: 'Isian BHPetrol Infiniti RON95.',
  },
  {
    id: 'fuel-4',
    vehicleId: 'veh-2',
    vehiclePlate: 'BQE 4099',
    date: '2026-10-08',
    station: 'Petronas Subang Jaya SS15',
    fuelType: 'RON97',
    amount: 110.00,
    litres: 31.70,
    pricePerLitre: 3.47,
    odometer: 21500,
    distanceTrip: 440,
    efficiencyKmPerLitre: 13.88,
    costPerKm: 0.250,
    notes: 'Isian RON97 Primax untuk Honda City.',
  },
  {
    id: 'fuel-5',
    vehicleId: 'veh-2',
    vehiclePlate: 'BQE 4099',
    date: '2026-09-25',
    station: 'Shell Federal Highway Batu Tiga',
    fuelType: 'RON95',
    amount: 60.00,
    litres: 29.27,
    pricePerLitre: 2.05,
    odometer: 21060,
    distanceTrip: 462,
    efficiencyKmPerLitre: 15.78,
    costPerKm: 0.130,
    notes: 'Honda City perjalanan ulang-alik PJ ke Cyberjaya.',
  },
];

export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        debts: parsed.debts || INITIAL_DEBTS,
        bills: parsed.bills || INITIAL_BILLS,
        subscriptions: parsed.subscriptions || INITIAL_SUBSCRIPTIONS,
        vehicles: parsed.vehicles || INITIAL_VEHICLES,
        fuelLogs: parsed.fuelLogs || INITIAL_FUEL_LOGS,
        profile: parsed.profile || INITIAL_USER_PROFILE,
      };
    }
    // Also check previous storage key version if migrating
    const rawOld = localStorage.getItem('kewanganku_app_data_v1');
    if (rawOld) {
      const parsedOld = JSON.parse(rawOld);
      return {
        debts: parsedOld.debts || INITIAL_DEBTS,
        bills: INITIAL_BILLS,
        subscriptions: parsedOld.subscriptions || INITIAL_SUBSCRIPTIONS,
        vehicles: parsedOld.vehicles || INITIAL_VEHICLES,
        fuelLogs: parsedOld.fuelLogs || INITIAL_FUEL_LOGS,
        profile: parsedOld.profile || INITIAL_USER_PROFILE,
      };
    }
  } catch (e) {
    console.warn('Failed to load storage, using initial mock database', e);
  }

  const defaultDb: AppDatabase = {
    debts: INITIAL_DEBTS,
    bills: INITIAL_BILLS,
    subscriptions: INITIAL_SUBSCRIPTIONS,
    vehicles: INITIAL_VEHICLES,
    fuelLogs: INITIAL_FUEL_LOGS,
    profile: INITIAL_USER_PROFILE,
  };
  saveDatabase(defaultDb);
  return defaultDb;
}

export function saveDatabase(data: AppDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export function formatRM(amount: number): string {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('MYR', 'RM');
}

export function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  // Strip time parts
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function exportBackupJson(data: AppDatabase): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `KewanganKu_Sandaran_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function parseAndValidateBackup(jsonString: string): AppDatabase {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Fail tidak sah: Struktur JSON tidak dijumpai.');
  }
  if (!Array.isArray(parsed.debts) && !Array.isArray(parsed.subscriptions) && !Array.isArray(parsed.vehicles)) {
    throw new Error('Fail tidak mengandungi data modul KewanganKu yang betul.');
  }
  return {
    debts: parsed.debts || [],
    bills: parsed.bills || INITIAL_BILLS,
    subscriptions: parsed.subscriptions || [],
    vehicles: parsed.vehicles || [],
    fuelLogs: parsed.fuelLogs || [],
    profile: parsed.profile || INITIAL_USER_PROFILE,
  };
}
