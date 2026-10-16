/**
 * Generates realistic Malaysian receipt images using HTML Canvas to test
 * OCR scanner immediately in browser without needing paper receipts.
 */

export interface SampleReceipt {
  id: string;
  name: string;
  category: 'fuel' | 'subscription' | 'debt';
  thumbnailTitle: string;
  badge: string;
  renderToDataUrl: () => string;
}

function createReceiptCanvas(width = 440, height = 620): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Paper textured background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Top paper jagged edge simulation
  ctx.fillStyle = '#e2e8f0';
  for (let x = 0; x < width; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 7, 8);
    ctx.lineTo(x + 14, 0);
    ctx.fill();
  }

  // Border & subtle fold shadow
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  return [canvas, ctx];
}

export const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: 'sample-petronas',
    name: 'Resit Minyak Petronas RON95 (RM65.00)',
    category: 'fuel',
    thumbnailTitle: 'Petronas Solaris',
    badge: 'Log Minyak',
    renderToDataUrl: () => {
      const [canvas, ctx] = createReceiptCanvas(420, 600);
      const today = new Date().toISOString().split('T')[0];

      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('PETRONAS SOLARIS SERDANG', 210, 50);

      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('STESEN MINYAK MESRA SDN BHD', 210, 72);
      ctx.fillText('LEBUHRAYA SUNGAI BESI, SERDANG', 210, 90);
      ctx.fillText('SST REG NO: W10-1808-32000019', 210, 108);

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(30, 125);
      ctx.lineTo(390, 125);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = '13px "Courier New", monospace';
      ctx.fillText(`TARIKH : ${today}`, 35, 150);
      ctx.fillText('MASA   : 14:32:10', 35, 170);
      ctx.fillText('PAM NO : 04', 35, 190);
      ctx.fillText('RESIT  : #PTR-8829104', 35, 210);

      ctx.beginPath();
      ctx.moveTo(30, 230);
      ctx.lineTo(390, 230);
      ctx.stroke();

      ctx.fillText('PRODUK', 35, 255);
      ctx.textAlign = 'right';
      ctx.fillText('JUMLAH (RM)', 385, 255);

      ctx.textAlign = 'left';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('PRIMAX 95 DENGAN PRO-DRIVE', 35, 290);
      ctx.font = '13px "Courier New", monospace';
      ctx.fillText('31.71 LITER  @  RM 2.05 / L', 35, 315);
      ctx.textAlign = 'right';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillText('RM 65.00', 385, 315);

      ctx.beginPath();
      ctx.moveTo(30, 350);
      ctx.lineTo(390, 350);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = '13px "Courier New", monospace';
      ctx.fillText('JUMLAH KASAR:', 35, 380);
      ctx.textAlign = 'right';
      ctx.fillText('RM 65.00', 385, 380);

      ctx.textAlign = 'left';
      ctx.fillText('CUKAI SST (0%):', 35, 405);
      ctx.textAlign = 'right';
      ctx.fillText('RM 0.00', 385, 405);

      ctx.textAlign = 'left';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('JUMLAH BERSIH:', 35, 445);
      ctx.textAlign = 'right';
      ctx.fillText('RM 65.00', 385, 445);

      ctx.textAlign = 'center';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('CARA BAYARAN: DEBIT CARD VISA', 210, 490);
      ctx.fillText('KAD: ************4821', 210, 510);
      ctx.fillText('TERIMA KASIH! JALAN DENGAN SELAMAT', 210, 545);

      return canvas.toDataURL('image/jpeg', 0.92);
    },
  },
  {
    id: 'sample-netflix',
    name: 'Invois Langganan Netflix (RM54.90)',
    category: 'subscription',
    thumbnailTitle: 'Netflix Malaysia',
    badge: 'Langganan',
    renderToDataUrl: () => {
      const [canvas, ctx] = createReceiptCanvas(420, 580);
      const today = new Date().toISOString().split('T')[0];

      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(0, 0, 420, 16);

      ctx.fillStyle = '#111827';
      ctx.textAlign = 'left';
      ctx.font = 'bold 22px "Courier New", monospace';
      ctx.fillText('NETFLIX MALAYSIA', 35, 55);

      ctx.font = '12px "Courier New", monospace';
      ctx.fillStyle = '#475569';
      ctx.fillText('INVOICE / TAX RECEIPT', 35, 75);
      ctx.fillText('Netflix Pte. Ltd. (Reg: 201536640M)', 35, 92);

      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#94a3b8';
      ctx.moveTo(35, 115);
      ctx.lineTo(385, 115);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = '13px "Courier New", monospace';
      ctx.fillText(`Tarikh Invois : ${today}`, 35, 140);
      ctx.fillText('No Invois     : #NFLX-MY-202610-881', 35, 165);
      ctx.fillText('Pelanggan     : Muhammad Aiman', 35, 190);
      ctx.fillText('Emel          : MuhammadAiman20@gmail.com', 35, 215);

      ctx.beginPath();
      ctx.moveTo(35, 235);
      ctx.lineTo(385, 235);
      ctx.stroke();

      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('Penerangan Pelan', 35, 260);
      ctx.textAlign = 'right';
      ctx.fillText('Amaun', 385, 260);

      ctx.textAlign = 'left';
      ctx.font = '13px "Courier New", monospace';
      ctx.fillText('Pelan Premium Ultra HD (4 Skrin)', 35, 290);
      ctx.fillText('Tempoh: 1 Bulan (Baharui Automatik)', 35, 310);
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('RM 51.79', 385, 290);

      ctx.textAlign = 'left';
      ctx.font = '13px "Courier New", monospace';
      ctx.fillText('Cukai Perkhidmatan Digital (6%):', 35, 345);
      ctx.textAlign = 'right';
      ctx.fillText('RM 3.11', 385, 345);

      ctx.beginPath();
      ctx.moveTo(35, 370);
      ctx.lineTo(385, 370);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('JUMLAH DIBAYAR:', 35, 410);
      ctx.textAlign = 'right';
      ctx.fillText('RM 54.90', 385, 410);

      ctx.textAlign = 'center';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillStyle = '#475569';
      ctx.fillText('Kaedah Bayaran: Kad Visa berakhir 4821', 210, 460);
      ctx.fillText('Status: BERJAYA / PAID', 210, 485);
      ctx.fillText('Terima kasih kerana melanggan Netflix!', 210, 520);

      return canvas.toDataURL('image/jpeg', 0.92);
    },
  },
  {
    id: 'sample-maybank',
    name: 'Resit Bayaran Ansuran Maybank (RM580.00)',
    category: 'debt',
    thumbnailTitle: 'Maybank HP Loan',
    badge: 'Hutang / Pinjaman',
    renderToDataUrl: () => {
      const [canvas, ctx] = createReceiptCanvas(420, 600);
      const today = new Date().toISOString().split('T')[0];

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 0, 420, 12);

      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('MAYBANK ISLAMIC BERHAD', 210, 48);

      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('RESIT BAYARAN SEWA BELI (HIRE PURCHASE)', 210, 70);
      ctx.fillText('PENGESAHAN TRANSAKSI PERBANKAN', 210, 88);

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94a3b8';
      ctx.moveTo(30, 110);
      ctx.lineTo(390, 110);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = '13px "Courier New", monospace';
      ctx.fillText(`TARIKH : ${today} 09:15:22`, 35, 140);
      ctx.fillText('RUJUKAN: MBB-HP-8891024', 35, 165);
      ctx.fillText('NAMA   : MUHAMMAD AIMAN', 35, 190);
      ctx.fillText('AKAUN  : 1140-8829-1039 (HP ATIVA)', 35, 215);
      ctx.fillText('KENDERAAN: PERODUA ATIVA (VHY 8821)', 35, 240);

      ctx.beginPath();
      ctx.moveTo(30, 260);
      ctx.lineTo(390, 260);
      ctx.stroke();

      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('BUTIRAN PEMBAYARAN', 35, 290);

      ctx.font = '13px "Courier New", monospace';
      ctx.fillText('Ansuran Bulanan (Bulan Semasa):', 35, 320);
      ctx.textAlign = 'right';
      ctx.fillText('RM 580.00', 385, 320);

      ctx.textAlign = 'left';
      ctx.fillText('Caj Lewat (Late Fee):', 35, 345);
      ctx.textAlign = 'right';
      ctx.fillText('RM 0.00', 385, 345);

      ctx.beginPath();
      ctx.moveTo(30, 375);
      ctx.lineTo(390, 375);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('JUMLAH DITERIMA:', 35, 415);
      ctx.textAlign = 'right';
      ctx.fillText('RM 580.00', 385, 415);

      ctx.textAlign = 'left';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('STATUS: BERJAYA / SUCCESSFUL', 35, 460);
      ctx.fillText('SALURAN: MAYBANK2U ONLINE PAYMENT', 35, 485);
      ctx.fillText('BAKI TERTUNGGAK KINI: RM 41,180.00', 35, 510);

      ctx.textAlign = 'center';
      ctx.fillText('Resit ini dijana oleh komputer, tiada tandatangan.', 210, 555);

      return canvas.toDataURL('image/jpeg', 0.92);
    },
  },
  {
    id: 'sample-shell',
    name: 'Resit Minyak Shell V-Power 97 (RM80.00)',
    category: 'fuel',
    thumbnailTitle: 'Shell Bangi',
    badge: 'Log Minyak',
    renderToDataUrl: () => {
      const [canvas, ctx] = createReceiptCanvas(420, 560);
      const today = new Date().toISOString().split('T')[0];

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, 420, 10);

      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('SHELL MALAYSIA TRADING', 210, 45);

      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('SHELL BANGI GATEWAY STATION', 210, 68);
      ctx.fillText('JALAN PERSIARAN PEKELILING, BANGI', 210, 86);

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94a3b8';
      ctx.moveTo(30, 110);
      ctx.lineTo(390, 110);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = '13px "Courier New", monospace';
      ctx.fillText(`TARIKH : ${today}`, 35, 135);
      ctx.fillText('PUMP NO: 02', 35, 155);
      ctx.fillText('PRODUK : SHELL V-POWER 97', 35, 175);

      ctx.beginPath();
      ctx.moveTo(30, 195);
      ctx.lineTo(390, 195);
      ctx.stroke();

      ctx.font = '13px "Courier New", monospace';
      ctx.fillText('HARGA / LITER :', 35, 225);
      ctx.textAlign = 'right';
      ctx.fillText('RM 3.19', 385, 225);

      ctx.textAlign = 'left';
      ctx.fillText('JUMLAH LITER  :', 35, 250);
      ctx.textAlign = 'right';
      ctx.fillText('25.08 L', 385, 250);

      ctx.beginPath();
      ctx.moveTo(30, 275);
      ctx.lineTo(390, 275);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('JUMLAH BAYARAN:', 35, 315);
      ctx.textAlign = 'right';
      ctx.fillText('RM 80.00', 385, 315);

      ctx.textAlign = 'center';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('DIBAYAR DENGAN TOUCH N GO EWALLET', 210, 365);
      ctx.fillText('REF: TNG-202610-99120', 210, 385);
      ctx.fillText('GO WELL GO SHELL', 210, 430);

      return canvas.toDataURL('image/jpeg', 0.92);
    },
  },
];
