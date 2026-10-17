export type TabType =
  | 'dashboard'
  | 'debt'
  | 'bills'
  | 'subscription'
  | 'vehicle'
  | 'fuel'
  | 'analysis'
  | 'ocr'
  | 'settings';

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  referenceNo?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface DebtItem {
  id: string;
  title: string;
  creditor: string;
  type: 'car' | 'housing' | 'credit_card' | 'education' | 'personal' | 'other';
  originalAmount: number;
  remainingBalance: number;
  monthlyInstallment: number;
  dueDay: number; // Day of the month (1 - 31)
  interestRate: number; // in percentage e.g. 3.2
  tenureMonthsTotal: number;
  tenureMonthsRemaining: number;
  status: 'active' | 'paid_off';
  payments: DebtPayment[];
  notes?: string;
  createdAt: string;
}

export type BillCategory =
  | 'electricity'
  | 'water'
  | 'internet'
  | 'sewerage'
  | 'tax'
  | 'maintenance'
  | 'gas'
  | 'other';

export type BillCycle =
  | 'monthly'
  | 'bi_monthly'
  | 'quarterly'
  | 'half_yearly'
  | 'yearly';

export type BillStatus = 'unpaid' | 'paid' | 'overdue';

export interface BillPaymentRecord {
  id: string;
  billId: string;
  amount: number;
  paidDate: string; // YYYY-MM-DD
  referenceNo?: string;
  method?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface RecurringBillItem {
  id: string;
  name: string; // e.g. "TNB - Bil Elektrik Kediaman"
  provider: string; // e.g. "Tenaga Nasional Berhad"
  category: BillCategory;
  accountNumber?: string;
  billerCode?: string; // JomPAY Biller Code e.g. "5454"
  ref1?: string; // JomPAY Ref-1 (Account No)
  ref2?: string;
  amount: number; // RM
  cycle: BillCycle;
  dueDay: number; // 1 - 31
  dueDate: string; // YYYY-MM-DD for current billing cycle
  status: BillStatus;
  isAutoDebit?: boolean;
  paymentMethod: string; // "JomPAY", "FPX", "Autodebit", etc.
  notes?: string;
  paymentHistory: BillPaymentRecord[];
  createdAt: string;
}

export interface SubscriptionItem {
  id: string;
  name: string;
  category: 'entertainment' | 'productivity' | 'utilities' | 'lifestyle' | 'fitness' | 'other';
  amount: number;
  billingCycle: 'monthly' | 'yearly' | 'quarterly';
  renewalDate: string; // YYYY-MM-DD
  paymentMethod: string;
  status: 'active' | 'paused' | 'cancelled';
  icon?: string;
  notes?: string;
}

export interface VehicleServiceLog {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  cost: number;
  workshop: string;
  items: string[];
  receiptUrl?: string;
  notes?: string;
}

export interface VehicleItem {
  id: string;
  name: string; // e.g. "Perodua Ativa 1.0 Turbo AV"
  plateNumber: string; // e.g. "VHY 8821"
  type: 'car' | 'motorcycle' | 'suv' | 'other';
  year: number;
  currentOdometer: number; // in km
  roadTaxExpiry: string; // YYYY-MM-DD
  insuranceExpiry: string; // YYYY-MM-DD
  insuranceProvider: string; // e.g. Etiqa Takaful
  nextServiceOdometer: number;
  nextServiceDate: string; // YYYY-MM-DD
  serviceIntervalKm: number;
  services: VehicleServiceLog[];
}

export interface FuelLogItem {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  date: string;
  station: string; // Petronas, Shell, BHP, Petron, Caltex
  fuelType: 'RON95' | 'RON97' | 'Diesel' | 'RON100';
  amount: number; // RM
  litres: number;
  pricePerLitre: number;
  odometer: number;
  distanceTrip?: number; // km travelled since last fill
  efficiencyKmPerLitre?: number; // km / L
  costPerKm?: number; // RM / km
  receiptUrl?: string;
  notes?: string;
}

export interface OcrScanResult {
  merchantName: string;
  amount: number;
  date: string;
  category: 'fuel' | 'subscription' | 'debt' | 'bill' | 'general';
  suggestedModule: 'fuel' | 'subscription' | 'debt' | 'bill';
  fuelDetails?: {
    fuelType: 'RON95' | 'RON97' | 'Diesel' | 'Lain-lain';
    litres: number;
    pricePerLitre: number;
    stationName: string;
    pumpNumber?: string;
  };
  subscriptionDetails?: {
    serviceName: string;
    planName: string;
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate?: string;
  };
  debtDetails?: {
    creditor: string;
    debtType: string;
    referenceNo?: string;
    installmentAmount?: number;
  };
  billDetails?: {
    provider: string;
    billType: string;
    accountNumber?: string;
    billerCode?: string;
    ref1?: string;
    dueDate?: string;
  };
  taxAmount?: number;
  confidence?: number;
  summaryMalay?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  currency: string;
  monthlyIncome?: number;
  theme: 'dark';
  googleDriveConnected: boolean;
  lastBackupTimestamp: string | null;
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  source: 'voice' | 'manual' | 'ocr';
}

export interface AppDatabase {
  expenses: ExpenseItem[];
  debts: DebtItem[];
  bills: RecurringBillItem[];
  subscriptions: SubscriptionItem[];
  vehicles: VehicleItem[];
  fuelLogs: FuelLogItem[];
  profile: UserProfile;
}

