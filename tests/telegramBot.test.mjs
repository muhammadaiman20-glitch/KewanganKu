import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { runTool, resolvePending, think, handleUpdate, toHtml, chunks, quickRecord } from '../telegram-bot/src/worker.js';
import { buildRecord, summary, todayMY, quickPlan } from '../telegram-bot/src/finance.js';

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
  assert.match(await resolvePending(env, 'ok', token), /Saved expense/);
  const after = doc(); assert.equal(after.revision, 8); assert.equal(after.expenses[0].amount, 12.5); assert.equal(after.expenses[0].date, todayMY()); assert.equal(after.expenses[0].source, 'manual');
  assert.match(await resolvePending(env, 'ok', token), /expired|already used/); assert.equal(doc().expenses.length, 2);
});

test('cancel discards the action', async () => {
  const { env, doc } = setup(), ui = [];
  await runTool(env, 'finance_delete', { collection: 'bills', id: 'b1' }, ui);
  assert.match(await resolvePending(env, 'no', tokenOf(ui)), /Cancelled/); assert.equal(doc().bills.length, 1);
});

test('edit is refused if the app changed the same field after the preview', async () => {
  const { env, fin, doc } = setup(), ui = [];
  await runTool(env, 'finance_update', { collection: 'expenses', id: 'e1', changes: { amount: 6 } }, ui);
  const d = doc(); d.expenses[0].amount = 9; delete d.revision;
  fin.prepare('UPDATE account_state SET document = ?, revision = revision + 1').run(JSON.stringify(d));
  assert.match(await resolvePending(env, 'ok', tokenOf(ui)), /changed in the app/); assert.equal(doc().expenses[0].amount, 9);
});

test('commit retries when the app writes between read and write', async () => {
  const { env, fin, doc } = setup(), ui = [];
  await runTool(env, 'finance_add', { collection: 'expenses', record: { description: 'teh', amount: 3 } }, ui);
  const realPrepare = env.FIN_DB.prepare; let raced = false;
  env.FIN_DB.prepare = (sql) => { if (sql.startsWith('UPDATE') && !raced) { raced = true; const d = doc(); delete d.revision; d.expenses.push({ id: 'from-app', description: 'app', amount: 1, date: '2026-10-18', source: 'manual' }); fin.prepare('UPDATE account_state SET document = ?, revision = revision + 1').run(JSON.stringify(d)); } return realPrepare(sql); };
  assert.match(await resolvePending(env, 'ok', tokenOf(ui)), /Saved/);
  assert.deepEqual(doc().expenses.map((e) => e.id).filter((id) => ['e1', 'from-app'].includes(id)).sort(), ['e1', 'from-app']);
  assert.equal(doc().expenses.length, 3); assert.equal(doc().revision, 9);
});

test('debt payment mirrors the app: balance, tenure, paid_off', async () => {
  const { env, doc } = setup(), ui = [];
  await runTool(env, 'finance_record_payment', { collection: 'debts', id: 'debt-1', amount: 300, date: '2026-10-17', referenceNo: 'REF1' }, ui);
  assert.match(await resolvePending(env, 'ok', tokenOf(ui)), /paid off/);
  const d = doc().debts[0]; assert.equal(d.remainingBalance, 0); assert.equal(d.status, 'paid_off'); assert.equal(d.tenureMonthsRemaining, 1); assert.equal(d.payments[0].referenceNo, 'REF1');
  assert.match((await runTool(env, 'finance_record_payment', { collection: 'debts', id: 'debt-1', amount: 1 }, [])).error, /paid off/);
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
    assert.match(await resolvePending(env, 'ok', card.reply_markup.inline_keyboard[0][0].callback_data.split(':')[1]), /Saved expense/);
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
    assert.equal(sent.filter(([m]) => m === 'sendMessage').length, 1); assert.match(sent[0][1].text, /Spent this month/);
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
