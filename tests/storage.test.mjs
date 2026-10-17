import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = readFileSync(new URL('../src/services/storage.ts', import.meta.url), 'utf8').replace(/^import \{[\s\S]*?\} from '\.\.\/types';/, '');
const storage = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const cache = new Map();
globalThis.localStorage = { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value), removeItem: key => cache.delete(key) };
test('old records migrate without losing existing debts', () => {
 cache.clear(); cache.set('kewanganku_app_data_v2', JSON.stringify({ debts: [{id: 'existing'}] }));
 const db = storage.loadDatabase(); assert.deepEqual(db.expenses, []); assert.equal(db.debts[0].id, 'existing');
});
test('expense survives storage and JSON restore', () => {
 cache.clear(); const db = storage.loadDatabase();
 db.expenses.push({ id: 'expense-1', description: 'Lunch', amount: 15, date: '2026-10-17', source: 'voice' });
 storage.saveDatabase(db); assert.deepEqual(storage.loadDatabase().expenses, db.expenses);
 assert.deepEqual(storage.parseAndValidateBackup(JSON.stringify(db)).expenses, db.expenses);
});

test('reset clears every record and profile, removes legacy data, survives reload without demos', () => {
 cache.clear(); cache.set('other-app-data', 'keep'); cache.set('kewanganku_app_data_v1', JSON.stringify({debts:[{id:'legacy'}]}));
 const empty = storage.resetDatabase();
 for (const key of ['expenses','debts','bills','subscriptions','vehicles','fuelLogs']) assert.deepEqual(empty[key], []);
 assert.equal(empty.profile.monthlyIncome, 0); assert.equal(empty.profile.email, ''); assert.equal(empty.profile.phone, '');
 assert.equal(empty.profile.googleDriveConnected, false); assert.equal(empty.profile.lastBackupTimestamp, null);
 assert.equal(cache.has('kewanganku_app_data_v1'), false); assert.equal(cache.get('other-app-data'), 'keep');
 assert.deepEqual(storage.loadDatabase(), empty);
});
test('reset reports a storage failure instead of pretending success', () => {
 const original = globalThis.localStorage;
 globalThis.localStorage = {...original, setItem: () => { throw new Error('storage denied'); }};
 try { assert.throws(() => storage.resetDatabase(), /storage denied/); }
 finally { globalThis.localStorage = original; }
});
