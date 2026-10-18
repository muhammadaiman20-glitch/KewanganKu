import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { normalizeReceipt, receiptDate, imageData, buildOcrInput, authorized } from '../public/_worker.js';
const receipt = { merchantName: 'Shell', amount: 65, date: '2026-10-17', rawText: 'Shell\nJUMLAH RM65.00', amountEvidence: 'JUMLAH RM65.00', category: 'fuel', fuelDetails: { litres: 31.7, pricePerLitre: 2.05, fuelType: 'RON95' } };
test('keeps evidence-backed fields and actual quantities', () => { const r=normalizeReceipt(receipt); assert.equal(r.amount,65); assert.equal(r.fuelDetails.litres,31.7); });
test('never fills missing date, total, grade, litres', () => { const r=normalizeReceipt({rawText:'Resit kabur', category:'fuel', amount:65}); assert.equal(r.date,null); assert.equal(r.amount,null); assert.equal(r.fuelDetails.litres,null); assert.equal(r.fuelDetails.fuelType,null); });
test('rejects invalid calendar dates and mismatched monetary evidence', () => { assert.equal(receiptDate('2026-02-30'),null); assert.equal(normalizeReceipt({...receipt,amount:100}).amount,null); });
test('blank image result fails instead of fabricated fallback', () => { assert.throws(()=>normalizeReceipt({rawText:null}), /UNREADABLE/); });
test('flags quantity/price mismatch and preserves extracted values for review', () => { const r=normalizeReceipt({...receipt,fuelDetails:{litres:60,pricePerLitre:2.05}}); assert.ok(r.warnings.some(s=>s.includes('tidak sepadan'))); assert.equal(r.fuelDetails.litres,60); });
test('validates data URI and image signature, not arbitrary URLs or forged MIME', () => { assert.throws(()=>imageData('https://example.com/image.png')); assert.throws(()=>imageData('data:image/png;base64,SGVsbG8=')); assert.equal(buildOcrInput('data:image/png;base64,abc').temperature,0); });
test('API rejects unauthenticated scans including forged header', async()=>{ const r=await worker.fetch(new Request('https://kewanganku.pages.dev/api/scan-receipt',{method:'POST',headers:{'Cf-Access-Jwt-Assertion':'fake'}}),{AI:{run(){throw Error('must not run')}}}); assert.equal(r.status,401); });
test('Access JWT requires matching audience, issuer, email and verified signature', async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='test';
 const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const env={ACCESS_TEAM_DOMAIN:'team.cloudflareaccess.com',ACCESS_AUD:'app',OWNER_EMAIL:'owner@example.com'};
 const make=async overrides=>{const head=encode({alg:'RS256',kid:'test'});const body=encode({iss:'https://team.cloudflareaccess.com',aud:['app'],email:'owner@example.com',exp:Date.now()/1000+100,...overrides});const unsigned=head+'.'+body;const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(unsigned));return new Request('https://kewanganku.pages.dev',{headers:{'Cf-Access-Jwt-Assertion':unsigned+'.'+Buffer.from(signature).toString('base64url')}})};
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({keys:[jwk]});
 try {assert.equal(await authorized(await make({}),env),true);assert.equal(await authorized(await make({aud:['other']}),env),false);assert.equal(await authorized(await make({email:'other@example.com'}),env),false);assert.equal(await authorized(await make({exp:0}),env),false);
 const originalRun={run:async()=>({response:JSON.stringify(receipt)})}; const request=await make({});
 const validImage='data:image/jpeg;base64,'+Buffer.from([255,216,255,0]).toString('base64');
 const apiRequest=new Request('https://kewanganku.pages.dev/api/scan-receipt',{method:'POST',headers:{...Object.fromEntries(request.headers),'Content-Type':'application/json'},body:JSON.stringify({imageBase64:validImage})});
 const response=await worker.fetch(apiRequest,{...env,AI:originalRun}); assert.equal(response.status,200);assert.equal((await response.json()).data.amount,65);
 } finally {globalThis.fetch=original;}
});
test('fast read: key lines replace the full transcription; unreadable images still fail', () => {
  const r = normalizeReceipt({ readable: true, merchantName: 'PETRONAS', amount: 50, date: '2026-10-18', category: 'fuel', keyLines: ['PETRONAS', 'Tarikh: 18/10/2026', 'JUMLAH RM 50.00', 7], amountEvidence: 'JUMLAH RM 50.00', fuelDetails: { litres: 24.39, pricePerLitre: 2.05, fuelType: 'RON95' } });
  assert.equal(r.rawText, 'PETRONAS\nTarikh: 18/10/2026\nJUMLAH RM 50.00'); assert.equal(r.amount, 50); assert.equal(r.fuelDetails.litres, 24.39);
  assert.throws(() => normalizeReceipt({ readable: false, keyLines: ['x'] }), /UNREADABLE/);
  assert.throws(() => normalizeReceipt({ readable: true, keyLines: [] }), /UNREADABLE/);
  const input = buildOcrInput('data:image/jpeg;base64,AAAA');
  assert.equal(input.max_tokens, 300); assert.match(input.messages[0].content, /Omit any key you cannot read/);
});
test('lean short-key answers map to the full receipt fields and keep the evidence checks', () => {
  const r = normalizeReceipt({ ok: true, m: 'PETRONAS', a: 50, d: '2026-10-18', c: 'fuel', e: 'JUMLAH RM 50.00', dl: 'Tarikh: 18/10/2026', l: 24.39, p: 2.05, g: 'RON95', s: 'STESEN JALAN KLANG', r: '004512' });
  assert.deepEqual([r.merchantName, r.amount, r.date, r.category, r.suggestedModule, r.amountEvidence], ['PETRONAS', 50, '2026-10-18', 'fuel', 'fuel', 'JUMLAH RM 50.00']);
  assert.deepEqual(r.fuelDetails, { fuelType: 'RON95', litres: 24.39, pricePerLitre: 2.05, stationName: 'STESEN JALAN KLANG' });
  assert.equal(r.rawText, 'PETRONAS\nTarikh: 18/10/2026\nJUMLAH RM 50.00'); assert.deepEqual(r.warnings, []);
  const debt = normalizeReceipt({ ok: true, m: 'PTPTN', a: '200.00', c: 'debt', e: 'AMAUN RM200.00', r: 'REF9' });
  assert.deepEqual([debt.amount, debt.debtDetails.referenceNo, debt.date], [200, 'REF9', null]);
  assert.match(debt.warnings.join(' '), /Tarikh/);
  // A total that its own evidence does not show is still rejected.
  assert.equal(normalizeReceipt({ ok: true, m: 'X', a: 99, e: 'JUMLAH RM 50.00' }).amount, null);
  assert.throws(() => normalizeReceipt({ ok: false }), /UNREADABLE/);
});
