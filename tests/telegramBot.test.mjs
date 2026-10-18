import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { runTool, resolvePending, think, handleUpdate, toHtml, chunks, quickRecord } from '../telegram-bot/src/worker.js';
import { buildRecord, summary, todayMY, quickPlan } from '../telegram-bot/src/finance.js';
import { validateDatabase } from '../public/_worker.js';

// Minimal D1 on node:sqlite (prepare/bind/first/all/run/batch).
function d1(sqlite) {
  const wrap = (sql, params = []) => ({
    bind: (...p) => wrap(sql, p),
    first: async () => sqlite.prepare(sql).get(...params) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...params) }),
    run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...params).changes) } }),
  });
  return { prepare: (sql) => wrap(sql), batch: async (stmts) => Promise.all(stmts.map((s) => s.run())) };
}
const appData = () => ({
  expenses: [{ id: 'e1', description: 'kopi', amount: 5, date: todayMY(), source: 'manual' }],
  debts: [{ id: 'debt-1', title: 'PTPTN', creditor: 'PTPTN', type: 'education', originalAmount: 10000, remainingBalance: 300, monthlyInstallment: 200, dueDay: 5, interestRate: 1, tenureMonthsTotal: 60, tenureMonthsRemaining: 2, status: 'active', payments: [], createdAt: '2025-01-01' }],
  bills: [{ id: 'b1', name: 'TNB', provider: 'TNB', category: 'electricity', amount: 120, cycle: 'monthly', dueDay: 20, dueDate: '2026-10-20', status: 'unpaid', paymentMethod: 'JomPAY', paymentHistory: [], createdAt: '2025-01-01' }],
  subscriptions: [],
  vehicles: [{ id: 'veh-1', name: 'Ativa', plateNumber: 'VHY 8821', type: 'car', year: 2022, currentOdometer: 40000, roadTaxExpiry: '2027-01-01', insuranceExpiry: '2027-01-01', insuranceProvider: 'Etiqa', nextServiceOdometer: 50000, nextServiceDate: '2027-03-01', serviceIntervalKm: 10000, services: [] }],
  fuelLogs: [{ id: 'f1', vehicleId: 'veh-1', vehiclePlate: 'VHY 8821', date: '2026-10-01', station: 'Shell', fuelType: 'RON95', amount: 50, litres: 24.39, pricePerLitre: 2.05, odometer: 39600 }],
  profile: { name: 'Owner', email: '', phone: '', monthlyIncome: 5000, currency: 'RM', theme: 'dark', googleDriveConnected: false, lastBackupTimestamp: null },
});
function setup(data = appData()) {
  const bot = new DatabaseSync(':memory:'); bot.exec(readFileSync(new URL('../telegram-bot/schema.sql', import.meta.url), 'utf8'));
  const fin = new DatabaseSync(':memory:'); fin.exec(readFileSync(new URL('../schema-sync.sql', import.meta.url), 'utf8'));
  fin.prepare('INSERT INTO account_state VALUES (?, ?, 7, 0, ?)').run('owner@example.com', JSON.stringify(data), new Date().toISOString());
  const env = { DB: d1(bot), FIN_DB: d1(fin), OWNER_EMAIL: 'Owner@Example.com', OWNER_ID: '42', WEBHOOK_SECRET: 's3cret', TELEGRAM_TOKEN: 't' };
  const doc = () => { const r = fin.prepare('SELECT document, revision FROM account_state').get(); return { ...JSON.parse(r.document), revision: r.revision }; };
  return { env, bot, fin, doc };
}
const tokenOf = (ui) => ui.at(-1).reply_markup.inline_keyboard[0][0].callback_data.split(':')[1];

test('finance add only saves after confirm, bumps revision, and a second tap is harmless', async () => {
  const { env, doc } = setup(), ui = [];
  const r = await runTool(env, 'finance_add', { collection: 'expense', record: { description: 'nasi lemak', amount: 'RM12.50' } }, ui);
  assert.match(r.pending, /NOT saved/); assert.equal(doc().expenses.length, 1);
  const token = tokenOf(ui);
  assert.match(await resolvePending(env, 'ok', token), /Disimpan \(perbelanjaan\)/);
  const after = doc(); assert.equal(after.revision, 8); assert.equal(after.expenses[0].amount, 12.5); assert.equal(after.expenses[0].date, todayMY()); assert.equal(after.expenses[0].source, 'manual');
  assert.match(await resolvePending(env, 'ok', token), /tamat tempoh|sudah digunakan/); assert.equal(doc().expenses.length, 2);
});

test('cancel discards the action', async () => {
  const { env, doc } = setup(), ui = [];
  await runTool(env, 'finance_delete', { collection: 'bills', id: 'b1' }, ui);
  assert.match(await resolvePending(env, 'no', tokenOf(ui)), /Dibatalkan/); assert.equal(doc().bills.length, 1);
});

test('edit is refused if the app changed the same field after the preview', async () => {
  const { env, fin, doc } = setup(), ui = [];
  await runTool(env, 'finance_update', { collection: 'expenses', id: 'e1', changes: { amount: 6 } }, ui);
  const d = doc(); d.expenses[0].amount = 9; delete d.revision;
  fin.prepare('UPDATE account_state SET document = ?, revision = revision + 1').run(JSON.stringify(d));
  assert.match(await resolvePending(env, 'ok', tokenOf(ui)), /diubah dalam aplikasi/); assert.equal(doc().expenses[0].amount, 9);
});

test('commit retries when the app writes between read and write', async () => {
  const { env, fin, doc } = setup(), ui = [];
  await runTool(env, 'finance_add', { collection: 'expenses', record: { description: 'teh', amount: 3 } }, ui);
  const realPrepare = env.FIN_DB.prepare; let raced = false;
  env.FIN_DB.prepare = (sql) => { if (sql.startsWith('UPDATE') && !raced) { raced = true; const d = doc(); delete d.revision; d.expenses.push({ id: 'from-app', description: 'app', amount: 1, date: '2026-10-18', source: 'manual' }); fin.prepare('UPDATE account_state SET document = ?, revision = revision + 1').run(JSON.stringify(d)); } return realPrepare(sql); };
  assert.match(await resolvePending(env, 'ok', tokenOf(ui)), /Disimpan/);
  assert.deepEqual(doc().expenses.map((e) => e.id).filter((id) => ['e1', 'from-app'].includes(id)).sort(), ['e1', 'from-app']);
  assert.equal(doc().expenses.length, 3); assert.equal(doc().revision, 9);
});

test('debt payment mirrors the app: balance, tenure, paid_off', async () => {
  const { env, doc } = setup(), ui = [];
  await runTool(env, 'finance_record_payment', { collection: 'debts', id: 'debt-1', amount: 300, date: '2026-10-17', referenceNo: 'REF1' }, ui);
  assert.match(await resolvePending(env, 'ok', tokenOf(ui)), /selesai/);
  const d = doc().debts[0]; assert.equal(d.remainingBalance, 0); assert.equal(d.status, 'paid_off'); assert.equal(d.tenureMonthsRemaining, 1); assert.equal(d.payments[0].referenceNo, 'REF1');
  assert.match((await runTool(env, 'finance_record_payment', { collection: 'debts', id: 'debt-1', amount: 1 }, [])).error, /already paid off/);
});

test('bill payment marks paid and keeps history', async () => {
  const { env, doc } = setup(), ui = [];
  await runTool(env, 'finance_record_payment', { collection: 'bills', id: 'b1', amount: 120 }, ui);
  await resolvePending(env, 'ok', tokenOf(ui));
  const b = doc().bills[0]; assert.equal(b.status, 'paid'); assert.equal(b.paymentHistory[0].amount, 120); assert.equal(b.paymentHistory[0].paidDate, todayMY());
});

test('fuel log resolves plate, checks litres x price, computes efficiency and odometer', async () => {
  const { env, doc } = setup(), ui = [];
  const bad = await runTool(env, 'finance_add', { collection: 'fuel', record: { vehicleId: 'vhy8821', station: 'Petronas', amount: 60, litres: 10, pricePerLitre: 2.05, odometer: 40400 } }, ui);
  assert.match(bad.error, /does not match/);
  await runTool(env, 'finance_add', { collection: 'fuel', record: { vehicleId: 'vhy8821', station: 'Petronas', amount: 41, litres: 20, pricePerLitre: 2.05, odometer: 40400 } }, ui);
  await resolvePending(env, 'ok', tokenOf(ui));
  const d = doc(); assert.equal(d.fuelLogs[0].vehicleId, 'veh-1'); assert.equal(d.fuelLogs[0].distanceTrip, 800); assert.equal(d.fuelLogs[0].efficiencyKmPerLitre, 40); assert.equal(d.vehicles[0].currentOdometer, 40400);
});

test('never guesses: missing fields, fake dates and unknown ids are errors', () => {
  const db = appData();
  assert.deepEqual(buildRecord('debts', { title: 'Kereta' }, db).missing, ['creditor', 'originalAmount', 'monthlyInstallment', 'dueDay']);
  assert.throws(() => buildRecord('expenses', { description: 'x', amount: 1, date: 'today' }, db), /YYYY-MM-DD/);
  assert.throws(() => buildRecord('expenses', { description: 'x', amount: -4 }, db), /invalid/);
  assert.throws(() => buildRecord('bills', { name: 'a', provider: 'b', amount: 1, dueDay: 40 }, db), /between/);
});

test('unknown record id goes back to the model as an error, not a pending button', async () => {
  const { env } = setup(), ui = [];
  await assert.rejects(runTool(env, 'finance_delete', { collection: 'expenses', id: 'nope' }, ui), /not found/); assert.equal(ui.length, 0);
});

test('summary totals this month and flags unpaid bills', () => {
  const s = summary(appData(), '2026-10-25');
  assert.equal(s.activeDebts.remaining, 300); assert.equal(s.unpaidBills[0].overdue, true);
});

test('tech issue CRUD with confirmed delete', async () => {
  const { env } = setup(), ui = [];
  const { created } = await runTool(env, 'create_issue', { title: 'MT5 not connecting', details: 'error 10054' }, ui);
  await runTool(env, 'update_issue', { id: created.id, status: 'resolved', solution: 'firewall rule' }, ui);
  assert.equal((await runTool(env, 'get_issue', { id: `#${created.id}` }, ui)).solution, 'firewall rule');
  assert.equal((await runTool(env, 'search_knowledge', { query: 'firewall' }, ui)).issues.length, 1);
  await runTool(env, 'delete_issue', { id: created.id }, ui);
  assert.equal((await runTool(env, 'list_issues', { status: 'all' }, ui)).issues.length, 1);
  assert.match(await resolvePending(env, 'ok', tokenOf(ui)), /Deleted issue/);
  assert.equal((await runTool(env, 'list_issues', { status: 'all' }, ui)).issues.length, 0);
});

test('agent loop runs a tool call then answers in words', async () => {
  const { env } = setup(), ui = []; let call = 0;
  env.AI = { run: async (_m, input) => (call++ === 0
    ? { choices: [{ message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'finance_summary', arguments: '{}' } }] } }] }
    : { choices: [{ message: { content: `spent ${JSON.parse(input.messages.at(-1).content).expensesThisMonth.total}` } }] }) };
  assert.equal(await think(env, [], 'how much this month?', ui), 'spent 5'); assert.equal(call, 2);
});

test('a round that only queues confirm buttons ends without another model call', async () => {
  const { env } = setup(), ui = []; let call = 0, input0;
  env.AI = { run: async (_m, input) => { input0 ??= input; call++; return { choices: [{ message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'finance_add', arguments: '{"collection":"expenses","record":{"description":"roti","amount":4}}' } }] } }] }; } };
  assert.equal(await think(env, [], 'beli roti dan simpan', ui), ''); assert.equal(call, 1); assert.equal(ui.length, 1);
  assert.equal(input0.reasoning_effort, 'low');
});

test('quick recorder plans plain expenses and payments without the AI, and leaves the rest to it', () => {
  const db = appData(), now = Date.parse('2026-10-19T04:00:00Z');
  const e = quickPlan(db, 'beli nasi lemak RM12.50', now);
  assert.deepEqual([e.action.c, e.action.record.description, e.action.record.amount, e.action.record.date], ['expenses', 'Nasi lemak', 12.5, '2026-10-19']);
  assert.equal(quickPlan(db, 'Grab RM1,250.00 semalam', now).action.record.date, '2026-10-18');
  assert.equal(quickPlan(db, 'rm8 teh tarik', now).action.record.description, 'Teh tarik');
  const p = quickPlan(db, 'bayar PTPTN RM200 semalam', now);
  assert.deepEqual([p.action.op, p.action.c, p.action.id, p.action.payment.amount, p.action.payment.date], ['pay', 'debts', 'debt-1', 200, '2026-10-18']);
  assert.equal(quickPlan(db, 'bayar tnb rm120', now).action.c, 'bills');
  for (const t of ['berapa belanja bulan ni?', 'isi minyak RM50', 'beli roti', 'kopi RM5 dan teh RM3', 'bayar parking RM3', 'padam kopi RM5', 'beli roti RM4 12/10', 'MT5 cannot connect'])
    assert.equal(quickPlan(db, t, now), null, t);
});

test('quick record sends a confirm card straight away and saves only on tap', async () => {
  const { env, doc } = setup(); const sent = []; const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => { sent.push([String(url).split('/').pop(), JSON.parse(init.body)]); return Response.json({ ok: true }); };
  try {
    env.AI = { run: async () => { throw new Error('AI must not be called'); } };
    await handleUpdate(env, { update_id: 9, message: { from: { id: 42 }, chat: { id: 42, type: 'private' }, text: 'beli nasi lemak RM12.50' } });
    const card = sent.find(([m, b]) => m === 'sendMessage' && b.reply_markup)[1];
    assert.match(card.text, /Nasi lemak/); assert.equal(doc().expenses.length, 1);
    assert.match(await resolvePending(env, 'ok', card.reply_markup.inline_keyboard[0][0].callback_data.split(':')[1]), /Disimpan \(perbelanjaan\)/);
    assert.equal(doc().expenses[0].description, 'Nasi lemak');
    assert.equal(await quickRecord(env, 42, 'MT5 cannot connect'), false);
  } finally { globalThis.fetch = orig; }
});

test('webhook: wrong secret is 403, stranger only gets their id, duplicates are dropped', async () => {
  const { env } = setup(); const sent = []; const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => { sent.push([String(url).split('/').pop(), JSON.parse(init.body)]); return Response.json({ ok: true }); };
  try {
    const req = (secret, body) => new Request('https://bot.example/telegram', { method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': secret }, body: JSON.stringify(body) });
    assert.equal((await worker.fetch(req('wrong', {}), env)).status, 403);
    const stranger = { update_id: 1, message: { from: { id: 7 }, chat: { id: 7, type: 'private' }, text: '/summary' } };
    assert.equal((await worker.fetch(req('s3cret', stranger), env)).status, 200);
    assert.match(sent[0][1].text, /KewanganKu Assistant[\s\S]*<code>7<\/code>/); assert.equal(sent[0][1].reply_markup.inline_keyboard[0][0].url, 'https://kewanganku.pages.dev'); sent.length = 0;
    const owner = { update_id: 2, message: { from: { id: 42 }, chat: { id: 42, type: 'private' }, text: '/summary' } };
    await handleUpdate(env, owner); await handleUpdate(env, owner);
    assert.equal(sent.filter(([m]) => m === 'sendMessage').length, 1); assert.match(sent[0][1].text, /Perbelanjaan bulan ini/);
    sent.length = 0; await handleUpdate(env, { update_id: 4, message: { from: { id: 42, first_name: 'Aiman' }, chat: { id: 42, type: 'private' }, text: '/start kewanganku' } });
    assert.match(sent[0][1].text, /Selamat datang, <b>Aiman<\/b>/); assert.equal(sent[0][1].parse_mode, 'HTML');
    sent.length = 0; await handleUpdate(env, { update_id: 3, message: { from: { id: 42 }, chat: { id: -5, type: 'group' }, text: '/summary' } });
    assert.equal(sent.length, 0);
  } finally { globalThis.fetch = orig; }
});

test('Telegram HTML escaping and chunking keep code blocks intact', () => {
  assert.equal(toHtml('**a<b>** `x<y`'), '<b>a&lt;b&gt;</b> <code>x&lt;y</code>');
  const parts = chunks('```\n' + 'line\n'.repeat(1500) + '```', 3500);
  assert.ok(parts.length > 1 && parts.every((p) => (p.match(/```/g) || []).length % 2 === 0));
});

// ---------- proof of payment ----------
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
function telegramMock() {
  const sent = []; const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('/file/bot')) return new Response(JPEG);
    const method = u.split('/').pop();
    if (method === 'getFile') return Response.json({ ok: true, result: { file_path: 'photos/p.jpg', file_size: JPEG.length } });
    sent.push([method, JSON.parse(init.body)]); return Response.json({ ok: true });
  };
  return { sent, restore: () => { globalThis.fetch = orig; } };
}
const photoMsg = (id, caption) => ({ update_id: id, message: { from: { id: 42 }, chat: { id: 42, type: 'private' }, photo: [{ file_id: 'small' }, { file_id: 'big' }], ...(caption ? { caption } : {}) } });
const tapLast = async (env, sent) => { const card = [...sent].reverse().find(([m, b]) => m === 'sendMessage' && b.reply_markup)[1]; return resolvePending(env, 'ok', card.reply_markup.inline_keyboard[0][0].callback_data.split(':')[1], 42); };

test('a confirmed transaction without proof is floating until the next photo is attached as its receipt', async () => {
  const { env, doc, fin } = setup(); const tgm = telegramMock();
  try {
    await handleUpdate(env, { update_id: 20, message: { from: { id: 42 }, chat: { id: 42, type: 'private' }, text: 'beli nasi lemak RM12.50' } });
    assert.match(tgm.sent.at(-1)[1].text, /Terapung/);
    assert.match(await tapLast(env, tgm.sent), /Disimpan \(perbelanjaan\)[\s\S]*Terapung/);
    const saved = doc().expenses[0]; assert.equal(saved.floating, true); assert.equal(saved.receiptUrl, undefined);
    const before = summary(appData()).proofThisMonth.realised;
    assert.deepEqual(summary(doc()).proofThisMonth, { realised: before, floating: 12.5, floatingCount: 1 });
    tgm.sent.length = 0; env.AI = { run: async () => { throw new Error('AI must not be called'); } };
    await handleUpdate(env, photoMsg(21));
    assert.match(tgm.sent.at(-1)[1].text, /Direalisasikan[\s\S]*Nasi lemak/);
    const after = doc().expenses[0]; assert.equal(after.floating, undefined); assert.match(after.receiptUrl, /^\/api\/proofs\/[0-9a-f-]{36}$/);
    const stored = fin.prepare('SELECT owner, mime, data FROM proofs').get();
    assert.deepEqual([stored.owner, stored.mime, stored.data], ['owner@example.com', 'image/jpeg', Buffer.from(JPEG).toString('base64')]);
    assert.deepEqual(summary(doc()).proofThisMonth, { realised: before + 12.5, floating: 0, floatingCount: 0 });
  } finally { tgm.restore(); }
});

test('a receipt photo with a plain caption is recorded already realised; old records without a flag stay realised', async () => {
  const { env, doc } = setup(); const tgm = telegramMock();
  try {
    env.AI = { run: async () => { throw new Error('AI must not be called'); } };
    await handleUpdate(env, photoMsg(30, 'bayar PTPTN RM200'));
    assert.match(tgm.sent.at(-1)[1].text, /Bukti dilampirkan/);
    assert.match(await tapLast(env, tgm.sent), /Direalisasikan/);
    const pay = doc().debts[0].payments[0]; assert.equal(pay.floating, undefined); assert.match(pay.receiptUrl, /^\/api\/proofs\//); assert.equal(doc().debts[0].remainingBalance, 100);
    assert.equal(env.DB.prepare ? (await env.DB.prepare('SELECT count(*) AS n FROM proof_wait').first()).n : 0, 0);
    assert.equal(summary(doc()).floatingAllTime, 0);
  } finally { tgm.restore(); }
});

test('/terapung lists floating transactions and its button picks which one the next photo proves', async () => {
  const data = appData();
  data.bills[0].paymentHistory = [{ id: 'bp1', billId: 'b1', amount: 120, paidDate: '2026-10-02', floating: true }];
  data.expenses.push({ id: 'e2', description: 'roti', amount: 4, date: '2026-10-03', source: 'manual', floating: true });
  const { env, doc } = setup(data); const tgm = telegramMock();
  try {
    await handleUpdate(env, { update_id: 40, message: { from: { id: 42 }, chat: { id: 42, type: 'private' }, text: '/terapung' } });
    const list = tgm.sent.at(-1)[1];
    assert.match(list.text, /2 tanpa bukti/); assert.match(list.text, /1\. Roti|1\. roti/); assert.match(list.text, /Bayaran TNB/);
    const second = list.reply_markup.inline_keyboard[0][1].callback_data.split(':')[1];
    assert.match(await resolvePending(env, 'ok', second, 42), /Hantar gambar resit[\s\S]*TNB/);
    await handleUpdate(env, photoMsg(41, 'ni resit'));
    assert.match(doc().bills[0].paymentHistory[0].receiptUrl, /^\/api\/proofs\//); assert.equal(doc().expenses.find((e) => e.id === 'e2').floating, true);
    assert.match(tgm.sent.at(-1)[1].text, /1 transaksi lagi tanpa bukti/);
  } finally { tgm.restore(); }
});

test('the app sync rejects a malformed proof flag', () => {
  const data = appData(); data.expenses[0].floating = 'yes';
  assert.throws(() => validateDatabase(data), /INVALID_DATA/);
});

test('your real messages: nasi minyak is food, and "18 oktober" sets the date', () => {
  const db = appData(), now = Date.parse('2026-10-19T04:00:00Z');
  const a = quickPlan(db, 'Belanja makan RM 3.50 beli nasi minyak', now);
  assert.deepEqual([a.action.record.description, a.action.record.amount, a.action.record.date], ['Makan beli nasi minyak', 3.5, '2026-10-19']);
  const b = quickPlan(db, 'Beli nasi lemak pada 18 oktober RM 12.80', now);
  assert.deepEqual([b.action.record.description, b.action.record.amount, b.action.record.date], ['Nasi lemak', 12.8, '2026-10-18']);
  assert.equal(quickPlan(db, 'kopi 5 jan RM4', now).action.record.date, '2026-01-05');
  assert.equal(quickPlan(db, 'kopi 25 disember RM4', now).action.record.date, '2025-12-25'); // not in the future
  assert.equal(quickPlan(db, 'kopi 31 feb RM4', now), null);
  for (const t of ['isi minyak RM50', 'minyak kereta RM60', 'petrol RM40']) assert.equal(quickPlan(db, t, now), null, t);
  assert.ok(quickPlan(db, 'minyak masak RM8.90', now).action);
});

test('a reply that only pretends to show a confirm button is sent back so the real tool is called', async () => {
  const { env } = setup(), ui = []; let call = 0;
  env.AI = { run: async () => {
    call++;
    if (call === 1) return { choices: [{ message: { content: '➕ Add expense\n2026-10-19 · RM3.50 · Nasi minyak\n(Butiran akan disimpan selepas anda menekan butang **Sahkan**.)' } }] };
    return { choices: [{ message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'finance_add', arguments: '{"collection":"expenses","record":{"description":"Nasi minyak","amount":3.5}}' } }] } }] };
  } };
  assert.equal(await think(env, [], 'nasi minyak RM3.50 dan teh', ui), '');
  assert.equal(call, 2); assert.equal(ui.length, 1);
  assert.deepEqual(ui[0].reply_markup.inline_keyboard[0].map((b) => b.text), ['✅ Sahkan', '✖️ Batal']);
  // An honest answer that merely mentions "terapung" is left alone.
  const ui2 = []; call = 0;
  env.AI = { run: async () => { call++; return { choices: [{ message: { content: 'RM 12.50 masih terapung (1 transaksi).' } }] }; } };
  assert.equal(await think(env, [], 'berapa terapung?', ui2), 'RM 12.50 masih terapung (1 transaksi).'); assert.equal(call, 1);
});

test('Malay texting short forms are read as standard Malay; numbers and plain English are untouched', async () => {
  const { normalizeMalay, forModel } = await import('../telegram-bot/src/malay.js');
  assert.equal(normalizeMalay('laptop x boleh connect wifi lps update'), 'laptop tidak boleh connect wifi lepas update');
  assert.equal(normalizeMalay('smlm dah byr ptptn 200'), 'semalam sudah bayar ptptn 200');
  assert.equal(normalizeMalay('brp dah abis bulan ni?'), 'berapa sudah habis bulan ini?');
  assert.equal(normalizeMalay('kayu 2 x 3 RM10'), 'kayu 2 x 3 RM10');
  assert.equal(forModel('MT5 cannot connect'), 'MT5 cannot connect');
  assert.match(forModel('td mkn rm8'), /\(Bacaan bahasa baku: tadi makan rm8\)/);
});

test('records are found the way people name them: car by name, "bil api" is the TNB bill, no duplicate bills', async () => {
  const fin = await import('../telegram-bot/src/finance.js');
  const db = appData();
  assert.equal(fin.list(db, { collection: 'bills', query: 'bil api' }).rows[0]?.id, 'b1');
  assert.equal(fin.list(db, { collection: 'bills', query: 'elektrik' }).rows[0]?.id, 'b1');
  assert.equal(fin.list(db, { collection: 'bills', query: 'air' }).rows.length, 0);
  const fuel = fin.planAdd(db, { collection: 'fuelLogs', record: { vehicleId: 'ativa', station: 'Shell', amount: 50, litres: 24.39, pricePerLitre: 2.05, odometer: 40500 } });
  assert.equal(fuel.action.record.vehiclePlate, 'VHY 8821');
  const dup = fin.planAdd(db, { collection: 'bills', record: { name: 'Bil API', provider: 'TNB', category: 'electricity', amount: 120, dueDay: 15 } });
  assert.match(dup.error, /already exists[\s\S]*finance_record_payment/);
  assert.ok(fin.planAdd(db, { collection: 'bills', record: { name: 'Bil API', provider: 'TNB', category: 'electricity', amount: 120, dueDay: 15 }, confirmNew: true }).action);
  assert.ok(fin.planAdd(db, { collection: 'debts', record: { title: 'Pinjaman Peribadi', creditor: 'Bank Rakyat', originalAmount: 5000, monthlyInstallment: 200, dueDay: 1 } }).action);
  assert.equal(fin.quickPlan(db, 'smlm byr ptptn rm200', Date.parse('2026-10-19T04:00:00Z')).action.payment.date, '2026-10-18');
  assert.match(fin.planPayment(db, { collection: 'bills', id: 'b1', amount: 120 }).preview, /^💸 Rekod bayaran RM120\.00[\s\S]*belum bayar → dibayar/);
});

test('the AI gets the real dates behind semalam / kelmarin / esok, in Malay', async () => {
  const { datesBlock } = await import('../telegram-bot/src/worker.js');
  const b = datesBlock(Date.parse('2026-10-19T04:00:00Z'));
  assert.match(b, /hari ini[^\n]*Isnin 19 Oktober 2026 \(2026-10-19\)/);
  assert.match(b, /semalam[^\n]*Ahad 18 Oktober 2026 \(2026-10-18\)/);
  assert.match(b, /kelmarin[^\n]*2026-10-17/); assert.match(b, /esok[^\n]*2026-10-20/); assert.match(b, /bulan lepas = 2026-09/);
});

test('"dah byr" is a payment, never an expense called "Sudah bayar"', async () => {
  const fin = await import('../telegram-bot/src/finance.js'), { normalizeMalay } = await import('../telegram-bot/src/malay.js');
  const db = appData(), now = Date.parse('2026-10-19T04:00:00Z');
  for (const t of ['smlm dah byr ptptn rm200', 'dah bayar ptptn rm200']) {
    const p = fin.quickPlan(db, normalizeMalay(t), now);
    assert.equal(p.action.op, 'pay', t); assert.equal(p.action.id, 'debt-1');
  }
  assert.equal(fin.quickPlan(db, normalizeMalay('beli kopi sambil bayar parking rm5'), now), null);
});

test('when the daily AI allowance runs out, the owner gets a clear Malay message, and simple records still work', async () => {
  const { env, doc } = setup(); const sent = []; const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => { sent.push([String(url).split('/').pop(), JSON.parse(init.body)]); return Response.json({ ok: true }); };
  try {
    env.AI = { run: async () => { throw new Error('AiError: you have used up your daily free allocation of 10,000 neurons'); } };
    await handleUpdate(env, { update_id: 70, message: { from: { id: 42 }, chat: { id: 42, type: 'private' }, text: 'kenapa laptop x boleh connect wifi?' } });
    assert.match(sent.at(-1)[1].text, /Had AI harian Cloudflare telah habis[\s\S]*8:00 pagi/);
    sent.length = 0;
    await handleUpdate(env, { update_id: 71, message: { from: { id: 42 }, chat: { id: 42, type: 'private' }, text: 'smlm dah byr ptptn rm200' } });
    const card = sent.find(([m, b]) => m === 'sendMessage' && b.reply_markup)[1];
    assert.match(card.text, /Rekod bayaran RM200\.00/); assert.equal(card.reply_markup.inline_keyboard[0][0].text, '✅ Sahkan');
  } finally { globalThis.fetch = orig; }
});

test('Groq takes over when Workers AI fails, with the same model, tools and reasoning effort', async () => {
  const { env } = setup(), ui = []; const calls = []; const orig = globalThis.fetch;
  env.GROQ_API_KEY = 'test-key';
  env.AI = { run: async () => { throw new Error('AiError: you have used up your daily free allocation of 10,000 neurons'); } };
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body); calls.push([String(url), init.headers.Authorization, body]);
    return Response.json({ choices: [{ message: { content: null, tool_calls: [{ id: 'g1', type: 'function', function: { name: 'finance_add', arguments: '{"collection":"expenses","record":{"description":"Roti","amount":4}}' } }] } }] });
  };
  try {
    assert.equal(await think(env, [], 'beli roti dan susu', ui), '');
    assert.equal(ui.length, 1); assert.match(ui[0].text, /Tambah perbelanjaan[\s\S]*Roti/);
    const [url, auth, body] = calls[0];
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions'); assert.equal(auth, 'Bearer test-key');
    assert.equal(body.model, 'openai/gpt-oss-120b'); assert.ok(body.tools.length > 10); assert.equal(body.reasoning_effort, 'low');
  } finally { globalThis.fetch = orig; }
});

test('without a Groq key the old behaviour stays: the next Workers AI model is tried', async () => {
  const { env } = setup(), ui = []; const models = [];
  env.AI = { run: async (m) => { models.push(m); if (models.length === 1) throw new Error('busy'); return { choices: [{ message: { content: 'OK' } }] }; } };
  assert.equal(await think(env, [], 'hai', ui), 'OK');
  assert.deepEqual(models, ['@cf/openai/gpt-oss-120b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast']);
});
