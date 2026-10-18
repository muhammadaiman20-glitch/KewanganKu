// Everyday texting Malay -> standard Malay, so the model reads "laptop x boleh connect lps update" as
// "laptop tidak boleh connect lepas update" instead of guessing ("x" is not a laptop model).
// Whole words only; numbers like "2 x 3" and RM amounts are left alone.
const SHORT = {
  x: 'tidak', tk: 'tidak', tak: 'tidak', tdk: 'tidak', xde: 'tiada', takde: 'tiada', tkde: 'tiada', xda: 'tiada',
  dah: 'sudah', da: 'sudah', sdh: 'sudah', blm: 'belum', blum: 'belum',
  nk: 'mahu', nak: 'mahu', mau: 'mahu', blh: 'boleh', bley: 'boleh', leh: 'boleh',
  brp: 'berapa', bpe: 'berapa', bape: 'berapa', byr: 'bayar', bayaq: 'bayar', bli: 'beli', mkn: 'makan', mnm: 'minum', brg: 'barang', brng: 'barang',
  kt: 'di', kat: 'di', dkt: 'dekat', utk: 'untuk', ntk: 'untuk', dgn: 'dengan', dng: 'dengan', sbb: 'sebab', sb: 'sebab', pasal: 'tentang',
  lps: 'lepas', lepas: 'selepas', sblm: 'sebelum', td: 'tadi', tdi: 'tadi', smlm: 'semalam', semlm: 'semalam', kmrn: 'kelmarin', esk: 'esok',
  lg: 'lagi', lgi: 'lagi', bln: 'bulan', thn: 'tahun', hr: 'hari', mgg: 'minggu', tghari: 'tengah hari', tgh: 'tengah', ptg: 'petang', mlm: 'malam',
  sy: 'saya', aku: 'saya', ak: 'saya', ko: 'awak', korang: 'kamu semua', org: 'orang',
  tgk: 'tengok', jgn: 'jangan', ckp: 'cakap', cmne: 'macam mana', camne: 'macam mana', cmana: 'macam mana', mcm: 'macam', pastu: 'lepas itu',
  ni: 'ini', tu: 'itu', abis: 'habis', dlm: 'dalam', skrg: 'sekarang', skang: 'sekarang', je: 'sahaja', jer: 'sahaja', jek: 'sahaja',
  ade: 'ada', ape: 'apa', apa2: 'apa-apa', mane: 'mana', sape: 'siapa', knp: 'kenapa', knape: 'kenapa', npe: 'kenapa',
  tlg: 'tolong', trima: 'terima', tq: 'terima kasih', tqvm: 'terima kasih', mksd: 'maksud', sgt: 'sangat', sket: 'sedikit', sikit: 'sedikit',
  bnyk: 'banyak', byk: 'banyak', sume: 'semua', smua: 'semua', tpi: 'tetapi', tp: 'tetapi', klu: 'kalau', kalo: 'kalau', klau: 'kalau',
  pkai: 'pakai', settle: 'selesai bayar', clear: 'selesai bayar', odo: 'odometer',
};

export function normalizeMalay(text) {
  const t = String(text || '');
  return t.replace(/(^|[\s,.;!?(])([A-Za-z]+[0-9]?)(?=$|[\s,.;!?)])/g, (m, pre, word, offset) => {
    const w = word.toLowerCase();
    // "x" next to a number is multiplication or a size ("2 x 3", "x2"), keep it.
    if (w === 'x' && (/\d\s*$/.test(t.slice(0, offset + pre.length)) || /^\s*\d/.test(t.slice(offset + m.length)))) return m;
    return Object.hasOwn(SHORT, w) ? pre + SHORT[w] : m;
  });
}

// Returns the text the model should see: the original, plus the standard-Malay reading when it differs.
export function forModel(text) {
  const norm = normalizeMalay(text);
  return norm.toLowerCase() === String(text).toLowerCase() ? text : `${text}\n\n(Bacaan bahasa baku: ${norm})`;
}
