import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceCommand, localDate } from '../src/services/voiceCommand.ts';
test('expense command extracts description and RM amount', () => {
 const r = parseVoiceCommand('Tambah perbelanjaan makan tengah hari RM 15');
 assert.equal(r.kind, 'expense'); assert.equal(r.amount, '15'); assert.equal(r.description, 'makan tengah hari');
});
test('fuel numbers remain separate from money', () => {
 const r = parseVoiceCommand('Isi minyak Shell RON95 RM60 30 liter odometer 38500');
 assert.equal(r.kind, 'fuel'); assert.equal(r.amount, '60'); assert.equal(r.litres, '30'); assert.equal(r.odometer, '38500'); assert.equal(r.fuelType, 'RON95');
});
test('missing money is not invented from odometer or fuel grade', () => {
 assert.equal(parseVoiceCommand('Minyak RON95 odometer 38500').amount, '');
 assert.equal(parseVoiceCommand('Isi minyak RM50').litres, '');
});
test('ringgit suffix, prefix, comma decimal and grouped thousands', () => {
 assert.equal(parseVoiceCommand('makan 15 ringgit').amount, '15');
 assert.equal(parseVoiceCommand('makan ringgit 15,50').amount, '15.5');
 assert.equal(parseVoiceCommand('beli RM1,500.50').amount, '1500.5');
});
test('explicit expense overrides fuel-screen context', () => {
 assert.equal(parseVoiceCommand('Tambah perbelanjaan makan RM15', true).kind, 'expense');
});
test('local date uses calendar components', () => { assert.equal(localDate(new Date(2026, 9, 17, 23, 59)), '2026-10-17'); });
