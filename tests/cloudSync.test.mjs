import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker from '../public/_worker.js';
import { SyncEngine, mergeSnapshots, RECOVERY_KEY } from '../src/services/cloudSync.ts';
const empty=()=>({expenses:[],debts:[],bills:[],subscriptions:[],vehicles:[],fuelLogs:[],profile:{name:'Pengguna',email:'',phone:'',monthlyIncome:0,currency:'RM',theme:'dark',googleDriveConnected:false,lastBackupTimestamp:null}});
const expense=(id,amount=15)=>({id,description:id,amount,date:'2026-10-18',source:'manual'});
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
const keyPair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',keyPair.publicKey);jwk.kid='sync-tests';
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const unsigned=enc({alg:'RS256',kid:jwk.kid})+'.'+enc({iss:'https://test.cloudflareaccess.com',aud:['app'],email:'owner@example.com',exp:Date.now()/1000+3600});const token=unsigned+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keyPair.privateKey,new TextEncoder().encode(unsigned))).toString('base64url');
const originalFetch=globalThis.fetch;globalThis.fetch=async (url,init)=>String(url).includes('/cdn-cgi/access/certs')?Response.json({keys:[jwk]}):originalFetch(url,init);
function backend(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE account_state(owner TEXT PRIMARY KEY,document TEXT NOT NULL,revision INTEGER NOT NULL,generation INTEGER NOT NULL,updated_at TEXT NOT NULL)');
 const DB={prepare(sql){return {bind(...params){const stmt=sqlite.prepare(sql);return {first:async()=>stmt.get(...params)||null,run:async()=>({meta:{changes:Number(stmt.run(...params).changes)}})}}}}};
 const env={DB,OWNER_EMAIL:'owner@example.com',ACCESS_AUD:'app',ACCESS_TEAM_DOMAIN:'test.cloudflareaccess.com'};
 const request=(url,init={})=>worker.fetch(new Request('https://kewanganku.pages.dev'+url,{...init,headers:{...init.headers,'Cf-Access-Jwt-Assertion':token}}),env);
 return {request,sqlite};
}
function device(server){let data=empty(),status;const cache=storage();let offline=false;const engine=new SyncEngine({empty,getLocal:()=>data,apply:v=>{data=structuredClone(v)},storage:cache,request:async (...args)=>{if(offline)throw Error('offline');return server.request(...args)},onStatus:v=>status=v});return {engine,cache,get data(){return data},set data(v){data=v},get status(){return status},set offline(v){offline=v}}}
test('three-way merge keeps disjoint inserts, honours deletions and reports edit/delete conflict',()=>{
 const base=empty();base.expenses=[expense('a')];const l=structuredClone(base),r=structuredClone(base);l.expenses.push(expense('b'));r.expenses.push(expense('c'));assert.equal(mergeSnapshots(base,l,r).data.expenses.length,3);
 l.expenses=[];assert.deepEqual(mergeSnapshots(base,l,base).data.expenses,[]);r.expenses[0].amount=20;assert.ok(mergeSnapshots(base,l,r).conflicts.length);
});
test('financial records with simultaneous balance/payment edits stay atomic',()=>{const b=empty();b.debts=[{id:'d',remainingBalance:100,payments:[]}];const l=structuredClone(b),r=structuredClone(b);l.debts[0]={id:'d',remainingBalance:80,payments:[{id:'p1',amount:20}]};r.debts[0]={id:'d',remainingBalance:70,payments:[{id:'p2',amount:30}]};const m=mergeSnapshots(b,l,r);assert.deepEqual(m.conflicts,['/debts/d']);assert.deepEqual(m.data.debts[0],l.debts[0]);});
test('two devices sync through actual Worker routes and SQLite without losing concurrent inserts',async()=>{
 const server=backend(),a=device(server),b=device(server);a.data.expenses=[expense('phone')];await a.engine.sync();await b.engine.sync();assert.equal(b.data.expenses[0].id,'phone');a.data.expenses.push(expense('phone-2'));b.data.expenses.push(expense('pc'));await Promise.all([a.engine.sync(),b.engine.sync()]);await Promise.all([a.engine.sync(),b.engine.sync()]);assert.deepEqual(a.data.expenses.map(x=>x.id).sort(),['pc','phone','phone-2']);assert.deepEqual(b.data.expenses.map(x=>x.id).sort(),['pc','phone','phone-2']);a.engine.stop();b.engine.stop();server.sqlite.close();
});
test('offline edits persist then upload on reconnect; conflicts pause and can choose cloud',async()=>{
 const server=backend(),a=device(server),b=device(server);a.data.expenses=[expense('one')];await a.engine.sync();await b.engine.sync();b.offline=true;b.data.expenses.push(expense('offline'));await b.engine.sync();assert.equal(b.data.expenses.length,2);b.offline=false;await b.engine.sync();await a.engine.sync();assert.equal(a.data.expenses.length,2);
 a.data.expenses[0].amount=30;b.data.expenses[0].amount=40;await a.engine.sync();await b.engine.sync();assert.equal(b.status.phase,'conflict');assert.ok(b.cache.getItem(RECOVERY_KEY));await b.engine.resolve('cloud');assert.equal(b.data.expenses[0].amount,30);a.engine.stop();b.engine.stop();server.sqlite.close();
});
test('cloud reset propagates generation and old offline records do not resurrect',async()=>{
 const server=backend(),a=device(server),b=device(server);a.data.expenses=[expense('old')];await a.engine.sync();await b.engine.sync();b.data.expenses.push(expense('unsynced'));await a.engine.resetAll();await b.engine.sync();assert.equal(b.data.expenses.length,0);assert.ok(b.cache.getItem(RECOVERY_KEY));await b.engine.sync();const response=await server.request('/api/state');assert.equal((await response.json()).data.expenses.length,0);a.engine.stop();b.engine.stop();server.sqlite.close();
});
test('unauthenticated and stale writes are rejected',async()=>{const server=backend();assert.equal((await worker.fetch(new Request('https://kewanganku.pages.dev/api/state'),{DB:{}})).status,401);const body={data:empty(),revision:0,generation:0,reset:false};assert.equal((await server.request('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).status,200);assert.equal((await server.request('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).status,409);server.sqlite.close();});
test('edits made while an upload is in flight are uploaded next, not replaced by its reply',async()=>{
 const server=backend(),cache=storage();let data=empty();data.expenses=[expense('first')];let start,release,held=true;const started=new Promise(r=>start=r),gate=new Promise(r=>release=r);
 const engine=new SyncEngine({empty,getLocal:()=>data,apply:v=>{data=structuredClone(v)},storage:cache,onStatus:()=>{},request:async(url,init)=>{const response=await server.request(url,init);if(init.method==='PUT'&&held){held=false;start();await gate;}return response;}});
 const first=engine.sync();await started;data.expenses.push(expense('during-upload'));release();await first;await engine.sync();const remote=await(await server.request('/api/state')).json();assert.equal(remote.data.expenses.length,2);engine.stop();server.sqlite.close();
});
test('offline cloud reset fails without clearing local records',async()=>{const server=backend(),d=device(server);d.data.expenses=[expense('keep')];await d.engine.sync();d.offline=true;await assert.rejects(d.engine.resetAll());assert.equal(d.data.expenses.length,1);d.engine.stop();server.sqlite.close();});

test('saved bank details sync to another device without changing debt balances or bill customer accounts',async()=>{const server=backend(),a=device(server),b=device(server);const bankDetails={bankName:'Maybank',accountNumber:'001234567890',accountHolder:'Aiman'};a.data.debts=[{id:'d',title:'Loan',creditor:'Lender',status:'active',originalAmount:1000,remainingBalance:800,monthlyInstallment:100,dueDay:25,interestRate:0,tenureMonthsTotal:10,tenureMonthsRemaining:8,payments:[],bankDetails}];a.data.bills=[{id:'b',name:'Internet',provider:'Provider',status:'unpaid',cycle:'monthly',dueDate:'2026-10-25',amount:99,dueDay:25,paymentHistory:[],accountNumber:'CUSTOMER-999',bankDetails}];await a.engine.sync();await b.engine.sync();assert.deepEqual(b.data.debts[0].bankDetails,bankDetails);assert.equal(b.data.debts[0].remainingBalance,800);assert.equal(b.data.debts[0].payments.length,0);assert.deepEqual(b.data.bills[0].bankDetails,bankDetails);assert.equal(b.data.bills[0].accountNumber,'CUSTOMER-999');assert.equal(b.data.bills[0].status,'unpaid');a.engine.stop();b.engine.stop();server.sqlite.close();});
