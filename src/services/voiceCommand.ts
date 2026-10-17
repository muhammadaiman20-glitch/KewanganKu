export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Only explicit monetary markers count as money; RON95 and odometers never do.
export function parseVoiceCommand(transcript: string, fuelScreen = false) {
  const text = transcript.trim();
  const number = '(\\d+(?:[.,]\\d+)*)';
  const currency = new RegExp(`(?:\\brm\\s*|\\bringgit\\s+)${number}|${number}\\s*ringgit\\b`, 'i');
  const money = text.match(currency);
  const decimal = (value?: string) => {
    if (!value) return '';
    const normalized = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(value) ? value.replaceAll(',', '') : value.replace(',', '.');
    return Number.isFinite(Number(normalized)) ? String(Number(normalized)) : '';
  };
  const fuel = /\b(minyak|petrol|diesel|fuel|ron\s*\d+|petronas|shell|bhp|petron|caltex)\b/i.test(text) || (fuelScreen && !/\b(perbelanjaan|belanja|expense)\b/i.test(text));
  const litres = text.match(new RegExp(`${number}\\s*(?:liter|litre|litres|l)\\b`, 'i'));
  const odometer = text.match(/(?:odometer|perbatuan|mileage)\s*(\d[\d,]*)/i);
  const station = text.match(/\b(petronas|shell|bhpetrol|bhp|petron|caltex)\b/i)?.[0] || '';
  const fuelType = /diesel/i.test(text) ? 'Diesel' : /ron\s*97/i.test(text) ? 'RON97' : /ron\s*100/i.test(text) ? 'RON100' : /ron\s*95/i.test(text) ? 'RON95' : '';
  return {
    kind: fuel ? 'fuel' : 'expense',
    description: text.replace(currency, '').replace(/^(?:tolong\s+)?(?:tambah|rekod|catat|add)\s*(?:perbelanjaan|belanja|expense)?\s*/i, '').trim(),
    amount: decimal(money?.[1] || money?.[2]),
    litres: decimal(litres?.[1]),
    odometer: odometer ? odometer[1].replaceAll(',', '') : '',
    station, fuelType,
  };
}
