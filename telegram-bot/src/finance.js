// KewanganKu finance records over Telegram.
// The bot is just another "device" for the app's sync: it reads the owner's account_state document,
// changes one record, and writes back with the same revision/generation check the Pages worker uses.
// The app sees the new revision on its next poll and three-way merges it like any other device.
// Reads are immediate. Every write is queued and only runs after the owner taps a confirm button.
import { validateDatabase, receiptDate } from '../../public/_worker.js';

const r2 = (n) => Math.round(n * 100) / 100;
const rm = (n) => `RM${Number(n || 0).toFixed(2)}`;
const clip = (s, n) => (s == null ? '' : String(s)).trim().slice(0, n);
// Malaysia is UTC+8 all year; "today" for the owner is that date, not UTC.
export const todayMY = (now = Date.now()) => new Date(now + 8 * 3600e3).toISOString().slice(0, 10);

// Field specs per collection. kind: str | num | int | date | enum | bool. req = must be given on add (unless a default exists).
const F = (kind, extra = {}) => ({ kind, ...extra });
export const SPECS = {
  expenses: {
    label: 'expense', id: () => crypto.randomUUID(),
    fields: { description: F('str', { req: true, max: 200 }), amount: F('num', { req: true }), date: F('date', { def: () => todayMY() }) },
    fixed: () => ({ source: 'manual', floating: true }),
    line: (r) => `${r.date} · ${rm(r.amount)} · ${r.description}`,
  },
  debts: {
    label: 'debt', id: () => `debt-${Date.now()}`, history: 'payments',
    fields: {
      title: F('str', { req: true, max: 150 }), creditor: F('str', { req: true, max: 150 }),
      type: F('enum', { values: ['car', 'housing', 'credit_card', 'education', 'personal', 'other'], def: () => 'other' }),
      originalAmount: F('num', { req: true }), remainingBalance: F('num', { def: (r) => r.originalAmount }),
      monthlyInstallment: F('num', { req: true }), dueDay: F('int', { req: true, min: 1, max: 31 }),
      interestRate: F('num', { def: () => 0 }), tenureMonthsTotal: F('int', { def: () => 0 }),
      tenureMonthsRemaining: F('int', { def: (r) => r.tenureMonthsTotal }),
      status: F('enum', { values: ['active', 'paid_off'], def: () => 'active' }), notes: F('str', { max: 1000 }),
    },
    fixed: () => ({ payments: [], createdAt: todayMY() }),
    line: (r) => `${r.title} (${r.creditor}) · baki ${rm(r.remainingBalance)} · ${rm(r.monthlyInstallment)}/bln · hb ${r.dueDay} · ${r.status}`,
  },
  bills: {
    label: 'bill', id: () => crypto.randomUUID(), history: 'paymentHistory',
    fields: {
      name: F('str', { req: true, max: 150 }), provider: F('str', { req: true, max: 150 }),
      category: F('enum', { values: ['electricity', 'water', 'internet', 'sewerage', 'tax', 'maintenance', 'gas', 'other'], def: () => 'other' }),
      amount: F('num', { req: true }),
      cycle: F('enum', { values: ['monthly', 'bi_monthly', 'quarterly', 'half_yearly', 'yearly'], def: () => 'monthly' }),
      dueDay: F('int', { req: true, min: 1, max: 31 }), dueDate: F('date', { def: (r) => nextDueDate(r.dueDay) }),
      status: F('enum', { values: ['unpaid', 'paid', 'overdue'], def: () => 'unpaid' }),
      paymentMethod: F('str', { max: 60, def: () => 'FPX' }), isAutoDebit: F('bool'),
      accountNumber: F('str', { max: 60 }), billerCode: F('str', { max: 20 }), ref1: F('str', { max: 60 }), ref2: F('str', { max: 60 }),
      notes: F('str', { max: 1000 }),
    },
    fixed: () => ({ paymentHistory: [], createdAt: todayMY() }),
    line: (r) => `${r.name} · ${rm(r.amount)} · due ${r.dueDate} · ${r.status}`,
  },
  subscriptions: {
    label: 'subscription', id: () => `sub-${Date.now()}`,
    fields: {
      name: F('str', { req: true, max: 150 }), amount: F('num', { req: true }),
      category: F('enum', { values: ['entertainment', 'productivity', 'utilities', 'lifestyle', 'fitness', 'other'], def: () => 'other' }),
      billingCycle: F('enum', { values: ['monthly', 'yearly', 'quarterly'], def: () => 'monthly' }),
      renewalDate: F('date', { req: true }), paymentMethod: F('str', { max: 60, def: () => '' }),
      status: F('enum', { values: ['active', 'paused', 'cancelled'], def: () => 'active' }), notes: F('str', { max: 1000 }),
    },
    line: (r) => `${r.name} · ${rm(r.amount)}/${r.billingCycle} · renews ${r.renewalDate} · ${r.status}`,
  },
  vehicles: {
    label: 'vehicle', id: () => `veh-${Date.now()}`, history: 'services',
    fields: {
      name: F('str', { req: true, max: 150 }), plateNumber: F('str', { req: true, max: 20 }),
      type: F('enum', { values: ['car', 'motorcycle', 'suv', 'other'], def: () => 'car' }),
      year: F('int', { req: true, min: 1950, max: 2100 }), currentOdometer: F('int', { req: true }),
      roadTaxExpiry: F('date', { req: true }), insuranceExpiry: F('date', { req: true }), insuranceProvider: F('str', { max: 100, def: () => '' }),
      serviceIntervalKm: F('int', { def: () => 10000 }), nextServiceOdometer: F('int', { def: (r) => r.currentOdometer + r.serviceIntervalKm }),
      nextServiceDate: F('date', { req: true }),
    },
    fixed: () => ({ services: [] }),
    line: (r) => `${r.plateNumber} ${r.name} · ${r.currentOdometer} km · roadtax ${r.roadTaxExpiry} · insurans ${r.insuranceExpiry}`,
  },
  fuelLogs: {
    label: 'fuel log', id: () => `fuel-${Date.now()}`,
    fields: {
      vehicleId: F('str', { req: true, max: 150 }), date: F('date', { def: () => todayMY() }),
      station: F('str', { req: true, max: 60 }), fuelType: F('enum', { values: ['RON95', 'RON97', 'Diesel', 'RON100'], def: () => 'RON95' }),
      amount: F('num', { req: true }), litres: F('num', { req: true }), pricePerLitre: F('num', { req: true }),
      odometer: F('int', { req: true }), notes: F('str', { max: 1000 }),
    },
    fixed: () => ({ floating: true }),
    line: (r) => `${r.date} · ${r.vehiclePlate} · ${r.station} ${r.fuelType} · ${rm(r.amount)} · ${r.litres} L · ${r.odometer} km`,
  },
};
export const COLLECTIONS = Object.keys(SPECS);
const ALIASES = { expense: 'expenses', spending: 'expenses', debt: 'debts', loan: 'debts', bill: 'bills', sub: 'subscriptions', subscription: 'subscriptions', vehicle: 'vehicles', car: 'vehicles', fuel: 'fuelLogs', fuellog: 'fuelLogs', fuel_logs: 'fuelLogs', fuellogs: 'fuelLogs' };
export function collectionOf(name) {
  const key = String(name || '').trim();
  const found = SPECS[key] ? key : ALIASES[key.toLowerCase()] || COLLECTIONS.find((c) => c.toLowerCase() === key.toLowerCase());
  if (!found) throw new Error(`unknown collection "${name}". Use one of: ${COLLECTIONS.join(', ')}`);
  return found;
}

function nextDueDate(day, today = todayMY()) {
  if (!Number.isInteger(day)) return undefined;
  let [y, m] = today.split('-').map(Number);
  const make = () => { const last = new Date(Date.UTC(y, m, 0)).getUTCDate(); return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`; };
  let d = make();
  if (d < today) { m += 1; if (m > 12) { m = 1; y += 1; } d = make(); }
  return d;
}

// Coerce one value to its field spec. Throws a short, model-readable error.
function coerce(field, spec, v) {
  if (v === null || v === undefined || v === '') return undefined;
  switch (spec.kind) {
    case 'str': return clip(v, spec.max || 300) || undefined;
    case 'bool': if (typeof v === 'boolean') return v; if (/^(true|yes|ya)$/i.test(v)) return true; if (/^(false|no|tidak)$/i.test(v)) return false; break;
    case 'enum': if (spec.values.includes(v)) return v; throw new Error(`${field} must be one of ${spec.values.join(', ')}`);
    case 'date': { const d = receiptDate(String(v).trim()); if (d) return d; throw new Error(`${field} must be a real date in YYYY-MM-DD (got "${v}")`); }
    case 'num': case 'int': {
      const n = typeof v === 'number' ? v : Number(String(v).replace(/^RM\s*/i, '').replace(/,/g, ''));
      if (!Number.isFinite(n) || n < 0) break;
      if (spec.kind === 'int' && !Number.isInteger(n)) throw new Error(`${field} must be a whole number`);
      if ((spec.min != null && n < spec.min) || (spec.max != null && n > spec.max)) throw new Error(`${field} must be between ${spec.min} and ${spec.max}`);
      return spec.kind === 'num' ? r2(n) : n;
    }
  }
  throw new Error(`${field} has an invalid value "${v}"`);
}

// Build a complete new record from loose model input. Returns { record } or { error, missing }.
export function buildRecord(collection, input, db) {
  const spec = SPECS[collection];
  const out = {}, missing = [];
  for (const [field, f] of Object.entries(spec.fields)) {
    let v = coerce(field, f, input?.[field]);
    if (v === undefined && f.def) v = f.def(out);
    if (v === undefined && f.req) missing.push(field);
    if (v !== undefined) out[field] = v;
  }
  if (collection === 'fuelLogs' && out.vehicleId) {
    const car = findVehicle(db, out.vehicleId);
    if (!car) return { error: `no vehicle matches "${out.vehicleId}". Known: ${db.vehicles.map((v) => `${v.plateNumber} (${v.id})`).join(', ') || 'none'}` };
    out.vehicleId = car.id; out.vehiclePlate = car.plateNumber;
  }
  if (missing.length) return { error: `missing required fields: ${missing.join(', ')}. Ask the owner for them; do not guess.`, missing };
  if (collection === 'fuelLogs' && Math.abs(out.litres * out.pricePerLitre - out.amount) > Math.max(0.15, out.amount * 0.02))
    return { error: `litres × pricePerLitre (${r2(out.litres * out.pricePerLitre)}) does not match amount ${out.amount}. Check the numbers with the owner.` };
  return { record: { id: spec.id(), ...out, ...(spec.fixed ? spec.fixed() : {}) } };
}

const findVehicle = (db, key) => {
  const k = String(key).replace(/\s+/g, '').toLowerCase();
  return db.vehicles.find((v) => v.id === key || v.plateNumber.replace(/\s+/g, '').toLowerCase() === k);
};

// Same derived fields the app computes when a fuel log is added.
function withFuelMath(db, log) {
  const past = db.fuelLogs.filter((l) => l.vehicleId === log.vehicleId).sort((a, b) => b.date.localeCompare(a.date));
  const distanceTrip = past.length && log.odometer > past[0].odometer ? log.odometer - past[0].odometer : undefined;
  return {
    ...log, distanceTrip,
    efficiencyKmPerLitre: distanceTrip && log.litres > 0 ? parseFloat((distanceTrip / log.litres).toFixed(2)) : undefined,
    costPerKm: distanceTrip ? parseFloat((log.amount / distanceTrip).toFixed(3)) : undefined,
  };
}

// ---------- storage (same table + optimistic lock as public/_worker.js) ----------
export async function readState(env) {
  if (!env.FIN_DB || !env.OWNER_EMAIL) throw new Error('finance database is not configured on the bot (FIN_DB binding / OWNER_EMAIL secret)');
  const row = await env.FIN_DB.prepare('SELECT document, revision, generation FROM account_state WHERE owner = ?').bind(env.OWNER_EMAIL.toLowerCase()).first();
  if (!row) throw new Error('no KewanganKu cloud data yet: open the app once while signed in so it uploads your records');
  return { data: JSON.parse(row.document), revision: row.revision, generation: row.generation };
}

// Apply `mutate` to the freshest document and write it with the revision check. Retries if the app wrote in between.
export async function commit(env, mutate) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const state = await readState(env);
    const draft = structuredClone(state.data);
    const summary = mutate(draft);
    const data = validateDatabase(draft);
    const res = await env.FIN_DB.prepare('UPDATE account_state SET document = ?, revision = revision + 1, updated_at = ? WHERE owner = ? AND revision = ? AND generation = ?')
      .bind(JSON.stringify(data), new Date().toISOString(), env.OWNER_EMAIL.toLowerCase(), state.revision, state.generation).run();
    if (res.meta?.changes) return summary;
  }
  throw new Error('the app kept saving at the same moment; nothing was changed — tap again');
}

const rows = (db, c) => db[c] || [];
function getRow(db, c, id) {
  const row = rows(db, c).find((r) => r.id === id) || (c === 'vehicles' ? findVehicle(db, id) : null);
  if (!row) throw new Error(`${SPECS[c].label} "${id}" not found`);
  return row;
}

// ---------- read tools ----------
export function summary(db, today = todayMY()) {
  const month = today.slice(0, 7);
  const soon = (d, days) => d && d >= today && d <= addDays(today, days);
  const exp = db.expenses.filter((e) => e.date?.startsWith(month));
  const debts = db.debts.filter((d) => d.status === 'active');
  const bills = db.bills.filter((b) => b.status !== 'paid');
  const subs = db.subscriptions.filter((s) => s.status === 'active');
  const perMonth = { monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
  return {
    today,
    expensesThisMonth: { count: exp.length, total: r2(exp.reduce((a, e) => a + e.amount, 0)) },
    activeDebts: { count: debts.length, remaining: r2(debts.reduce((a, d) => a + d.remainingBalance, 0)), monthlyInstallments: r2(debts.reduce((a, d) => a + d.monthlyInstallment, 0)) },
    unpaidBills: bills.map((b) => ({ id: b.id, name: b.name, amount: b.amount, dueDate: b.dueDate, overdue: b.dueDate < today })),
    subscriptions: { active: subs.length, monthlyCost: r2(subs.reduce((a, s) => a + s.amount * (perMonth[s.billingCycle] ?? 1), 0)), renewingIn14Days: subs.filter((s) => soon(s.renewalDate, 14)).map((s) => `${s.name} ${s.renewalDate}`) },
    vehicleAlerts30Days: db.vehicles.flatMap((v) => [
      soon(v.roadTaxExpiry, 30) || v.roadTaxExpiry < today ? `${v.plateNumber} road tax ${v.roadTaxExpiry}` : null,
      soon(v.insuranceExpiry, 30) || v.insuranceExpiry < today ? `${v.plateNumber} insurance ${v.insuranceExpiry}` : null,
      soon(v.nextServiceDate, 30) || v.currentOdometer >= v.nextServiceOdometer ? `${v.plateNumber} service due ${v.nextServiceDate} / ${v.nextServiceOdometer} km` : null,
    ].filter(Boolean)),
    monthlyIncome: db.profile?.monthlyIncome || 0,
    proofThisMonth: (() => {
      const txns = transactions(db).filter((x) => x.date?.startsWith(month));
      const fl = txns.filter((x) => isFloating(x.t));
      return { realised: r2(txns.reduce((a, x) => a + (isFloating(x.t) ? 0 : x.amount), 0)), floating: r2(fl.reduce((a, x) => a + x.amount, 0)), floatingCount: fl.length };
    })(),
    floatingAllTime: floatingList(db).length,
  };
}
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

// Compact row for lists: history arrays become counts so the model isn't flooded.
const compact = (c, r) => {
  const h = SPECS[c].history;
  const { [h]: hist, bankDetails, ...rest } = r;
  return { ...rest, ...(h ? { [`${h}Count`]: (hist || []).length } : {}), ...(bankDetails ? { hasBankDetails: true } : {}) };
};

export function list(db, args) {
  const c = collectionOf(args.collection);
  let out = rows(db, c);
  if (args.query) { const q = String(args.query).toLowerCase(); out = out.filter((r) => JSON.stringify(compact(c, r)).toLowerCase().includes(q)); }
  const dateKey = { expenses: 'date', fuelLogs: 'date', bills: 'dueDate', subscriptions: 'renewalDate' }[c];
  if (dateKey && args.from) out = out.filter((r) => r[dateKey] >= args.from);
  if (dateKey && args.to) out = out.filter((r) => r[dateKey] <= args.to);
  if (dateKey) out = [...out].sort((a, b) => String(b[dateKey]).localeCompare(String(a[dateKey])));
  const limit = Math.min(Math.max(parseInt(args.limit) || 20, 1), 100);
  const total = c === 'expenses' || c === 'fuelLogs' ? r2(out.reduce((a, r) => a + r.amount, 0)) : undefined;
  return { collection: c, matched: out.length, ...(total !== undefined ? { totalAmount: total } : {}), rows: out.slice(0, limit).map((r) => compact(c, r)) };
}

export function get(db, args) {
  const c = collectionOf(args.collection);
  const row = structuredClone(getRow(db, c, args.id));
  const h = SPECS[c].history;
  if (h && row[h]?.length > 10) row[h] = [...row[h].slice(0, 10), { note: `${row[h].length - 10} older entries hidden` }];
  return { collection: c, record: row };
}

// ---------- write planning (validated now, applied on confirm) ----------
// Each plan returns { action, preview } — action is stored in D1 and replayed by apply() after the owner taps confirm.
// ---------- proof of payment ----------
// Transactions (money that actually moved): expenses, fuel logs, debt and bill payments, vehicle services.
// A new one is floating:true until a receipt is attached (receiptUrl). Records from before this rule have no
// floating flag and count as realised.
const TXN_COLLECTIONS = ['expenses', 'fuelLogs'];
const withProof = (t, proof) => { if (proof) { t.receiptUrl = proof; delete t.floating; } return t; };
const statusOf = (t) => (t.floating === true ? '\n⏳ Terapung — hantar gambar resit/slip untuk realisasikan' : t.receiptUrl ? '\n🧾 Direalisasikan (bukti dilampirkan)' : '');
export const isFloating = (t) => t?.floating === true;

// Where a confirmed action's transaction lives, so a receipt can be attached to it later. null = not a transaction.
export function refOf(a) {
  if (a.op === 'add' && TXN_COLLECTIONS.includes(a.c)) return { c: a.c, id: a.record.id };
  if (a.op === 'pay') return { c: a.c, id: a.id, sub: a.payment.id };
  return null;
}

// Every transaction with its ref, newest first.
export function transactions(db) {
  const out = [];
  for (const e of db.expenses || []) out.push({ ref: { c: 'expenses', id: e.id }, t: e, date: e.date, amount: e.amount, label: e.description });
  for (const f of db.fuelLogs || []) out.push({ ref: { c: 'fuelLogs', id: f.id }, t: f, date: f.date, amount: f.amount, label: `Minyak ${f.vehiclePlate} ${f.station}` });
  for (const d of db.debts || []) for (const p of d.payments || []) out.push({ ref: { c: 'debts', id: d.id, sub: p.id }, t: p, date: p.date, amount: p.amount, label: `Bayaran ${d.title}` });
  for (const b of db.bills || []) for (const p of b.paymentHistory || []) out.push({ ref: { c: 'bills', id: b.id, sub: p.id }, t: p, date: p.paidDate, amount: p.amount, label: `Bayaran ${b.name}` });
  for (const v of db.vehicles || []) for (const s of v.services || []) out.push({ ref: { c: 'vehicles', id: v.id, sub: s.id }, t: s, date: s.date, amount: s.cost, label: `Servis ${v.plateNumber} ${s.workshop || ''}`.trim() });
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
export const floatingList = (db) => transactions(db).filter((x) => isFloating(x.t));

// Attach a stored proof to one transaction (inside commit). Returns a short result line.
export function attachProof(db, ref, url) {
  const x = transactions(db).find((y) => y.ref.c === ref.c && y.ref.id === ref.id && (y.ref.sub ?? null) === (ref.sub ?? null));
  if (!x) throw new Error('that transaction no longer exists (deleted in the app?); the receipt was not attached');
  withProof(x.t, url);
  return `🧾 Direalisasikan: ${x.label} · ${rm(x.amount)} · ${x.date}`;
}

const proofNote =(proof) => (proof ? '\n🧾 Bukti dilampirkan — akan direalisasikan' : '\n⏳ Tiada bukti — disimpan sebagai Terapung sehingga resit dihantar');

export function planAdd(db, args) {
  const c = collectionOf(args.collection);
  const built = buildRecord(c, args.record || {}, db);
  if (built.error) return built;
  const record = c === 'fuelLogs' ? withFuelMath(db, built.record) : built.record;
  const txn = TXN_COLLECTIONS.includes(c);
  const proof = txn && args.proof ? args.proof : undefined;
  return { action: { op: 'add', c, record, ...(proof ? { proof } : {}) }, preview: `➕ Add ${SPECS[c].label}\n${SPECS[c].line(record)}${txn ? proofNote(proof) : ''}` };
}

export function planUpdate(db, args) {
  const c = collectionOf(args.collection);
  const row = getRow(db, c, args.id);
  const changes = {}, expect = {};
  for (const [field, v] of Object.entries(args.changes || {})) {
    const f = SPECS[c].fields[field];
    if (!f) return { error: `field "${field}" can't be edited on ${c}. Editable: ${Object.keys(SPECS[c].fields).join(', ')}` };
    if (c === 'fuelLogs' && field === 'vehicleId') return { error: 'to move a fuel log to another vehicle, delete it and add a new one' };
    const nv = coerce(field, f, v);
    if (nv === undefined) return { error: `${field}: empty value. To clear a field, tell the owner to do it in the app.` };
    if (nv !== row[field]) { changes[field] = nv; expect[field] = row[field] ?? null; }
  }
  if (!Object.keys(changes).length) return { error: 'nothing would change' };
  const diff = Object.keys(changes).map((k) => `${k}: ${fmt(expect[k])} → ${fmt(changes[k])}`).join('\n');
  return { action: { op: 'update', c, id: row.id, changes, expect }, preview: `✏️ Edit ${SPECS[c].label}: ${SPECS[c].line(row)}\n${diff}` };
}

export function planDelete(db, args) {
  const c = collectionOf(args.collection);
  const row = getRow(db, c, args.id);
  const h = SPECS[c].history;
  const extra = h && row[h]?.length ? `\n⚠️ This also deletes ${row[h].length} payment/service entries.` : '';
  const orphan = c === 'vehicles' && db.fuelLogs.some((l) => l.vehicleId === row.id) ? `\n⚠️ ${db.fuelLogs.filter((l) => l.vehicleId === row.id).length} fuel logs still point to this vehicle.` : '';
  return { action: { op: 'delete', c, id: row.id }, preview: `🗑 Delete ${SPECS[c].label}\n${SPECS[c].line(row)}${extra}${orphan}` };
}

export function planPayment(db, args) {
  const c = collectionOf(args.collection);
  if (c !== 'debts' && c !== 'bills') return { error: 'payments can only be recorded on debts or bills' };
  const row = getRow(db, c, args.id);
  const amount = coerce('amount', F('num'), args.amount);
  if (!amount) return { error: 'amount is required and must be more than 0' };
  const date = coerce('date', F('date'), args.date) || todayMY();
  if (c === 'debts' && row.status !== 'active') return { error: `debt "${row.title}" is already paid off` };
  // The payment id is fixed now (not on confirm) so the bot can attach a receipt to it afterwards.
  const payment = { id: c === 'debts' ? `pay-${Date.now()}` : crypto.randomUUID(), amount, date, referenceNo: clip(args.referenceNo, 60) || undefined, notes: clip(args.notes, 500) || undefined };
  const after = c === 'debts' ? `\nbaki ${rm(row.remainingBalance)} → ${rm(Math.max(0, row.remainingBalance - amount))}` : `\nstatus ${row.status} → paid`;
  return { action: { op: 'pay', c, id: row.id, payment, ...(args.proof ? { proof: args.proof } : {}) }, preview: `💸 Record payment ${rm(amount)} on ${date}\n${SPECS[c].line(row)}${after}${proofNote(args.proof)}` };
}
const fmt = (v) => (v === null || v === undefined ? '(empty)' : typeof v === 'number' ? String(v) : `"${v}"`);

// Replays a confirmed action on the current document (inside commit). Returns a short result line.
export function apply(db, a) {
  const spec = SPECS[a.c];
  const list = db[a.c];
  if (a.op === 'add') {
    if (list.some((r) => r.id === a.record.id)) return `Already saved: ${spec.line(a.record)}`;
    const record = withProof({ ...a.record }, a.proof);
    if (a.c === 'fuelLogs') {
      const car = db.vehicles.find((v) => v.id === record.vehicleId);
      if (!car) throw new Error('that vehicle was deleted in the app; fuel log not saved');
      if (record.odometer > car.currentOdometer) car.currentOdometer = record.odometer;
      list.unshift(record);
    } else if (a.c === 'vehicles') list.push(record);
    else list.unshift(record);
    return `✅ Saved ${spec.label}: ${spec.line(record)}${statusOf(record)}`;
  }
  const idx = list.findIndex((r) => r.id === a.id);
  if (idx < 0) throw new Error(`${spec.label} no longer exists (deleted in the app?) — nothing changed`);
  const row = list[idx];
  if (a.op === 'delete') { list.splice(idx, 1); return `🗑 Deleted ${spec.label}: ${spec.line(row)}`; }
  if (a.op === 'update') {
    for (const [k, old] of Object.entries(a.expect)) if ((row[k] ?? null) !== old) throw new Error(`${k} was changed in the app since I asked (now ${fmt(row[k])}); nothing changed — ask me again`);
    Object.assign(row, a.changes);
    return `✅ Updated ${spec.label}: ${spec.line(row)}`;
  }
  if (a.op === 'pay') {
    const p = a.payment;
    const hist = row[spec.history] || [];
    const pid = p.id || (a.c === 'debts' ? `pay-${Date.now()}` : crypto.randomUUID());
    if (hist.some((h) => h.id === pid)) return 'Already saved: this payment was recorded before';
    if (a.c === 'debts') {
      if (row.status !== 'active') throw new Error('this debt is already paid off; nothing changed');
      const remaining = r2(Math.max(0, row.remainingBalance - p.amount));
      const rec = withProof({ id: pid, debtId: row.id, amount: p.amount, date: p.date, referenceNo: p.referenceNo, notes: p.notes, floating: true }, a.proof);
      row.payments = [rec, ...row.payments];
      row.remainingBalance = remaining;
      row.status = remaining <= 0 ? 'paid_off' : 'active';
      row.tenureMonthsRemaining = Math.max(0, row.tenureMonthsRemaining - 1);
      return `✅ Payment ${rm(p.amount)} recorded. ${row.title} baki now ${rm(remaining)}${remaining <= 0 ? ' — paid off 🎉' : ''}${statusOf(rec)}`;
    }
    const rec = withProof({ id: pid, billId: row.id, amount: p.amount, paidDate: p.date, referenceNo: p.referenceNo, notes: p.notes, method: row.paymentMethod, floating: true }, a.proof);
    row.paymentHistory = [rec, ...row.paymentHistory];
    row.status = 'paid';
    return `✅ Payment ${rm(p.amount)} recorded for ${row.name}; marked paid${statusOf(rec)}`;
  }
  throw new Error(`unknown action ${a.op}`);
}

// ---------- quick recorder ----------
// Short, plain messages like "beli nasi lemak RM12.50" or "bayar PTPTN RM200 semalam" are planned here without the AI
// (instant confirm button). Anything unclear returns null and goes to the AI as before; the confirm step is unchanged.
const AMOUNT = /\brm\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\b/gi;
const DAY_WORDS = [[/\b(semalam|yesterday)\b/i, -1], [/\b(kelmarin|kelmarin dulu)\b/i, -2], [/\b(hari ini|harini|today|tadi)\b/i, 0]];
const PAY = /^(bayar|pay|paid|jelaskan|settle)\b/i;
const BUY = /^(beli|belanja|buy|bought|spent|spend)\b/i;
// Questions, edits and fuel go to the AI: they need more than "description + amount".
const NOT_QUICK = /[?\n]|\d{1,2}\/\d{1,2}|\b(berapa|how|what|why|kenapa|bila|when|list|senarai|show|tunjuk|semak|padam|delete|buang|remove|ubah|edit|update|tukar|change|batal|cancel|undo|hutang baru|bil baru|langganan|subscription|minyak|petrol|fuel|ron\s?9[57]|diesel|litre|liter)\b/i;

export function quickPlan(db, text, now = Date.now(), proof) {
  const t = String(text || '').trim();
  if (!t || t.length > 100 || t.startsWith('/') || NOT_QUICK.test(t)) return null;
  const amounts = [...t.matchAll(AMOUNT)];
  if (amounts.length !== 1) return null;
  const amount = Number(amounts[0][1].replace(/,/g, '') + (amounts[0][2] ? '.' + amounts[0][2] : ''));
  if (!(amount > 0) || amount > 100000) return null;

  let rest = t.replace(amounts[0][0], ' ');
  let date = todayMY(now);
  const iso = rest.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) { date = coerce('date', F('date'), iso[1]); rest = rest.replace(iso[0], ' '); }
  for (const [re, shift] of DAY_WORDS) if (re.test(rest)) { if (!iso) date = addDays(todayMY(now), shift); rest = rest.replace(re, ' '); }
  rest = rest.replace(/\b(pada|on|untuk|for|di|at)\s*$/i, ' ').replace(/[\s,.;:!-]+/g, ' ').trim();

  if (PAY.test(rest)) {
    const name = rest.replace(PAY, '').trim().toLowerCase();
    if (!name) return null;
    const words = name.split(' ');
    const hits = [
      ...(db.debts || []).filter((d) => d.status === 'active').map((d) => ({ c: 'debts', id: d.id, key: `${d.title} ${d.creditor}` })),
      ...(db.bills || []).map((b) => ({ c: 'bills', id: b.id, key: `${b.name} ${b.provider}` })),
    ].filter((h) => words.every((w) => h.key.toLowerCase().includes(w)));
    // No unique debt/bill (e.g. "bayar parking RM3"): let the AI decide between a payment and an expense.
    if (hits.length !== 1) return null;
    return planPayment(db, { collection: hits[0].c, id: hits[0].id, amount, date, proof });
  }

  const description = rest.replace(BUY, '').trim();
  if (!description || description.length > 60 || description.split(' ').length > 8 || !/\p{L}/u.test(description)) return null;
  return planAdd(db, { collection: 'expenses', record: { description: description[0].toUpperCase() + description.slice(1), amount, date }, proof });
}
