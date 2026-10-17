import {
  AppDatabase,
  DebtItem,
  FuelLogItem,
  RecurringBillItem,
  SubscriptionItem,
  VehicleItem,
} from '../types';

/**
 * Escapes special CSV characters (commas, quotes, newlines)
 */
function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Creates downloadable file using blob with UTF-8 BOM for Microsoft Excel compatibility
 */
function triggerCsvDownload(csvContent: string, filename: string): void {
  // UTF-8 BOM ensures Excel displays UTF-8 (Ringgit symbols, Malay text) properly
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * 1. Comprehensive All-In-One Financial Summary CSV Export
 */
export function exportAllToCsv(data: AppDatabase): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const rows: string[] = [];

  // Header & User Profile
  rows.push(['=== KEWANGANKU - LAPORAN RINGKASAN KEWANGAN PERIBADI ==='].map(escapeCsvCell).join(','));
  rows.push([`Tarikh Dijana`, `${dateStr}`].map(escapeCsvCell).join(','));
  rows.push([`Nama Pengguna`, data.profile.name].map(escapeCsvCell).join(','));
  rows.push([`Emel`, data.profile.email].map(escapeCsvCell).join(','));
  rows.push('');

  rows.push(['--- PERBELANJAAN HARIAN ---'].map(escapeCsvCell).join(','));
  rows.push(['ID', 'Keterangan', 'Jumlah (RM)', 'Tarikh', 'Sumber'].map(escapeCsvCell).join(','));
  (data.expenses || []).forEach(e => rows.push([e.id, e.description, e.amount.toFixed(2), e.date, e.source].map(escapeCsvCell).join(',')));
  rows.push('');

  // SECTION 1: RECURRING UTILITY BILLS & JOMPAY
  rows.push(['--- 1. PENGURUSAN BIL UTILITI TETAP & JOMPAY ---'].map(escapeCsvCell).join(','));
  rows.push([
    'ID Bil',
    'Nama Bil',
    'Pembekal / Agensi',
    'Kategori',
    'Amaun (RM)',
    'Kitaran',
    'Hari Tarikh Akhir',
    'Tarikh Akhir Kitaran',
    'No Akaun',
    'Kod JomPAY',
    'Kaedah Bayaran',
    'Autodebit',
    'Status',
    'Catatan',
  ].map(escapeCsvCell).join(','));

  (data.bills || []).forEach((bill) => {
    rows.push([
      bill.id,
      bill.name,
      bill.provider,
      bill.category,
      bill.amount.toFixed(2),
      bill.cycle,
      `Hari ke-${bill.dueDay}`,
      bill.dueDate,
      bill.accountNumber || '-',
      bill.billerCode || '-',
      bill.paymentMethod,
      bill.isAutoDebit ? 'Ya' : 'Tidak',
      bill.status === 'paid' ? 'Telah Dibayar' : 'Belum Bayar',
      bill.notes || '',
    ].map(escapeCsvCell).join(','));
  });

  rows.push('');

  // SECTION 2: DEBT MANAGEMENT SUMMARY & PAYMENT RECORDS
  rows.push(['--- 2. PENGURUSAN HUTANG & REKOD BAYARAN ---'].map(escapeCsvCell).join(','));
  rows.push([
    'ID Hutang',
    'Nama Pinjaman',
    'Pemiutang / Bank',
    'Kategori',
    'Jumlah Asal (RM)',
    'Baki Tertunggak (RM)',
    'Ansuran Bulanan (RM)',
    'Kadar Faedah (%)',
    'Hari Bayaran (Due Day)',
    'Baki Tempoh (Bulan)',
    'Status',
    'Jumlah Rekod Bayaran',
    'Tarikh Bayaran Terkini',
    'Nota',
  ].map(escapeCsvCell).join(','));

  data.debts.forEach((debt) => {
    const latestPayment = debt.payments.length > 0 ? debt.payments[0].date : 'Tiada Rekod';
    rows.push([
      debt.id,
      debt.title,
      debt.creditor,
      debt.type,
      debt.originalAmount.toFixed(2),
      debt.remainingBalance.toFixed(2),
      debt.monthlyInstallment.toFixed(2),
      `${debt.interestRate}%`,
      `Hari ke-${debt.dueDay}`,
      `${debt.tenureMonthsRemaining} bulan`,
      debt.status === 'active' ? 'Aktif' : 'Selesai',
      debt.payments.length,
      latestPayment,
      debt.notes || '',
    ].map(escapeCsvCell).join(','));
  });

  rows.push('');

  // SECTION 3: SUBSCRIPTION MANAGEMENT
  rows.push(['--- 3. PENGURUSAN LANGGANAN DIGITAL ---'].map(escapeCsvCell).join(','));
  rows.push([
    'ID',
    'Nama Servis',
    'Kategori',
    'Amaun (RM)',
    'Kitaran Bil',
    'Tarikh Pembaharuan Seterusnya',
    'Kaedah Bayaran',
    'Status',
    'Unjuran Setahun (RM)',
    'Nota',
  ].map(escapeCsvCell).join(','));

  data.subscriptions.forEach((sub) => {
    const yearlyCost = sub.billingCycle === 'yearly' ? sub.amount : sub.amount * 12;
    rows.push([
      sub.id,
      sub.name,
      sub.category,
      sub.amount.toFixed(2),
      sub.billingCycle,
      sub.renewalDate,
      sub.paymentMethod,
      sub.status === 'active' ? 'Aktif' : 'Dijeda',
      yearlyCost.toFixed(2),
      sub.notes || '',
    ].map(escapeCsvCell).join(','));
  });

  rows.push('');

  // SECTION 4: VEHICLE & SERVICE RECORDS
  rows.push(['--- 4. PENGURUSAN KENDERAAN & STATUS CUKAI JALAN ---'].map(escapeCsvCell).join(','));
  rows.push([
    'ID Kenderaan',
    'Model Kenderaan',
    'No Pendaftaran',
    'Tahun',
    'Odometer Semasa (km)',
    'Tamat Cukai Jalan',
    'Tamat Insurans',
    'Syarikat Insurans',
    'Odometer Servis Seterusnya (km)',
    'Tarikh Servis Seterusnya',
  ].map(escapeCsvCell).join(','));

  data.vehicles.forEach((veh) => {
    rows.push([
      veh.id,
      veh.name,
      veh.plateNumber,
      veh.year,
      veh.currentOdometer,
      veh.roadTaxExpiry,
      veh.insuranceExpiry,
      veh.insuranceProvider,
      veh.nextServiceOdometer,
      veh.nextServiceDate,
    ].map(escapeCsvCell).join(','));
  });

  rows.push('');

  // SECTION 5: FUEL LOGS
  rows.push(['--- 5. LOG ISIAN MINYAK & PENGIRAAN KOS BAHAN API ---'].map(escapeCsvCell).join(','));
  rows.push([
    'ID Log',
    'Tarikh',
    'Kenderaan',
    'Stesen Minyak',
    'Jenis Minyak',
    'Jumlah (RM)',
    'Liter (L)',
    'Harga/L (RM)',
    'Odometer (km)',
    'Jarak Trip (km)',
    'Kecekapan (km/L)',
    'Kos/km (RM/km)',
    'Nota',
  ].map(escapeCsvCell).join(','));

  data.fuelLogs.forEach((fuel) => {
    rows.push([
      fuel.id,
      fuel.date,
      fuel.vehiclePlate,
      fuel.station,
      fuel.fuelType,
      fuel.amount.toFixed(2),
      fuel.litres.toFixed(2),
      fuel.pricePerLitre.toFixed(2),
      fuel.odometer,
      fuel.distanceTrip || '-',
      fuel.efficiencyKmPerLitre ? fuel.efficiencyKmPerLitre.toFixed(2) : '-',
      fuel.costPerKm ? fuel.costPerKm.toFixed(3) : '-',
      fuel.notes || '',
    ].map(escapeCsvCell).join(','));
  });

  const csvString = rows.join('\r\n');
  triggerCsvDownload(csvString, `KewanganKu_Ringkasan_Lengkap_${dateStr}.csv`);
}

/**
 * 2. Dedicated Recurring Bills CSV Export
 */
export function exportBillsOnlyToCsv(bills: RecurringBillItem[]): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const rows: string[] = [];

  rows.push([
    'Nama Bil Utiliti',
    'Pembekal',
    'Kategori',
    'Amaun (RM)',
    'Kitaran',
    'Hari Tarikh Akhir',
    'Tarikh Akhir Semasa',
    'No Akaun',
    'Kod JomPAY',
    'Ref-1',
    'Kaedah Bayaran',
    'Autodebit',
    'Status',
    'Catatan',
  ].map(escapeCsvCell).join(','));

  bills.forEach((b) => {
    rows.push([
      b.name,
      b.provider,
      b.category,
      b.amount.toFixed(2),
      b.cycle,
      b.dueDay,
      b.dueDate,
      b.accountNumber || '-',
      b.billerCode || '-',
      b.ref1 || '-',
      b.paymentMethod,
      b.isAutoDebit ? 'Ya' : 'Tidak',
      b.status === 'paid' ? 'Telah Dibayar' : 'Belum Bayar',
      b.notes || '',
    ].map(escapeCsvCell).join(','));
  });

  triggerCsvDownload(rows.join('\r\n'), `KewanganKu_Bil_Utiliti_${dateStr}.csv`);
}

/**
 * 3. Dedicated Fuel Logs CSV Export
 */
export function exportFuelLogsOnlyToCsv(fuelLogs: FuelLogItem[]): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const rows: string[] = [];

  rows.push([
    'Tarikh',
    'No Plat',
    'Stesen Minyak',
    'Gred Minyak',
    'Jumlah Bayaran (RM)',
    'Jumlah Liter (L)',
    'Harga Seliter (RM/L)',
    'Odometer (km)',
    'Jarak Perjalanan (km)',
    'Kecekapan Penggunaan (km/L)',
    'Kos Setiap KM (RM/km)',
    'Catatan',
  ].map(escapeCsvCell).join(','));

  fuelLogs.forEach((f) => {
    rows.push([
      f.date,
      f.vehiclePlate,
      f.station,
      f.fuelType,
      f.amount.toFixed(2),
      f.litres.toFixed(2),
      f.pricePerLitre.toFixed(2),
      f.odometer,
      f.distanceTrip || '-',
      f.efficiencyKmPerLitre ? f.efficiencyKmPerLitre.toFixed(2) : '-',
      f.costPerKm ? f.costPerKm.toFixed(3) : '-',
      f.notes || '',
    ].map(escapeCsvCell).join(','));
  });

  triggerCsvDownload(rows.join('\r\n'), `KewanganKu_Log_Minyak_${dateStr}.csv`);
}

/**
 * 4. Dedicated Debts & Payments CSV Export
 */
export function exportDebtsOnlyToCsv(debts: DebtItem[]): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const rows: string[] = [];

  rows.push([
    'Nama Pinjaman',
    'Institusi / Bank',
    'Kategori',
    'Jumlah Pinjaman Asal (RM)',
    'Baki Tertunggak (RM)',
    'Ansuran Bulanan (RM)',
    'Kadar Faedah (%)',
    'Hari Bayaran Setiap Bulan',
    'Baki Tempoh (Bulan)',
    'Status',
    'Nota',
  ].map(escapeCsvCell).join(','));

  debts.forEach((d) => {
    rows.push([
      d.title,
      d.creditor,
      d.type,
      d.originalAmount.toFixed(2),
      d.remainingBalance.toFixed(2),
      d.monthlyInstallment.toFixed(2),
      d.interestRate,
      d.dueDay,
      d.tenureMonthsRemaining,
      d.status === 'active' ? 'Aktif' : 'Selesai',
      d.notes || '',
    ].map(escapeCsvCell).join(','));
  });

  triggerCsvDownload(rows.join('\r\n'), `KewanganKu_Senarai_Hutang_${dateStr}.csv`);
}

