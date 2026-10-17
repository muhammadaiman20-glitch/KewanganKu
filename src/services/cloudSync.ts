import type { AppDatabase } from '../types/index.ts';
export const SYNC_META_KEY = 'kewanganku_sync_meta_v1';
export const RECOVERY_KEY = 'kewanganku_sync_recovery_v1';
export function canonical(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k])).join(',') + '}';
  return JSON.stringify(value);
}
export function mergeSnapshots(base: unknown, local: unknown, cloud: unknown, prefer: 'local' | 'cloud' = 'local') {
  const conflicts: string[] = [];
  const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b);
  const merge = (b: any, l: any, r: any, path: string): any => {
    if (equal(l, r)) return l;
    if (equal(l, b)) return r;
    if (equal(r, b)) return l;
    const keyed = (v: any) => Array.isArray(v) && v.every(x => x && typeof x.id === 'string');
    if (keyed(b) && keyed(l) && keyed(r)) {
      const bm = new Map(b.map((x: any) => [x.id, x])), lm = new Map(l.map((x: any) => [x.id, x])), rm = new Map(r.map((x: any) => [x.id, x]));
      return [...new Set([...lm.keys(), ...rm.keys(), ...bm.keys()])].map(id => merge(bm.get(id), lm.get(id), rm.get(id), `${path}/${id}`)).filter(x => x !== undefined);
    }
    if (/^\/(debts|bills|vehicles)\/[^/]+$/.test(path)) { conflicts.push(path); return prefer === 'local' ? l : r; }
    const object = (x: any) => x && typeof x === 'object' && !Array.isArray(x);
    if (object(b) && object(l) && object(r)) {
      return Object.fromEntries([...new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)])].filter(k => !['__proto__', 'constructor', 'prototype'].includes(k)).map(k => [k, merge(b[k], l[k], r[k], `${path}/${k}`)]).filter(([,v]) => v !== undefined));
    }
    conflicts.push(path || '/'); return prefer === 'local' ? l : r;
  };
  return { data: merge(base, local, cloud, '') as AppDatabase, conflicts };
}
export function conflictDetails(paths: string[], local: AppDatabase, cloud: AppDatabase) {
  const groups: Record<string, string> = { expenses: 'Perbelanjaan', debts: 'Hutang', bills: 'Bil', subscriptions: 'Langganan', vehicles: 'Kenderaan', fuelLogs: 'Log minyak', profile: 'Profil' };
  const fields: Record<string, string> = { name: 'Nama', email: 'Emel', phone: 'Telefon', monthlyIncome: 'Pendapatan', amount: 'Jumlah', date: 'Tarikh', description: 'Keterangan' };
  const read = (root: unknown, parts: string[]): any => parts.reduce((v: any, key) => Array.isArray(v) ? v.find(row => row.id === key) : v?.[key], root);
  const labelValue = (v: any): string => {
    if (v === undefined) return 'Dipadam'; if (v === null) return 'Kosong';
    if (typeof v !== 'object') return String(v);
    if (Array.isArray(v)) return `${v.length} rekod`;
    if (Array.isArray(v.payments)) return `${v.title}: baki RM${v.remainingBalance}; ${v.payments.length} bayaran`;
    if (Array.isArray(v.paymentHistory)) return `${v.name}: RM${v.amount}; ${v.status}; ${v.paymentHistory.length} bayaran`;
    if (Array.isArray(v.services)) return `${v.name}: ${v.currentOdometer} km; ${v.services.length} servis`;
    return [v.description || v.name || v.station, v.amount != null ? `RM${v.amount}` : '', v.date || ''].filter(Boolean).join(' · ') || 'Rekod dikemas kini';
  };
  return paths.map(path => { const parts = path.split('/').filter(Boolean); const a = read(local, parts), b = read(cloud, parts); return { label: [groups[parts[0]] || 'Rekod', fields[parts[parts.length - 1]] || ''].filter(Boolean).join(' · '), local: labelValue(a), cloud: labelValue(b) }; });
}
export interface CloudState { data: AppDatabase | null; revision: number; generation: number; updatedAt: string | null }
export interface SyncStatus { phase: 'starting' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict'; message: string; updatedAt: string | null; conflicts: string[]; details: { label: string; local: string; cloud: string }[] }
type Meta = { base: AppDatabase; revision: number; generation: number; updatedAt: string | null };
interface Options {
  empty: () => AppDatabase;
  getLocal: () => AppDatabase;
  apply: (data: AppDatabase) => void;
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  request?: typeof fetch;
  onStatus: (status: SyncStatus) => void;
}
export class SyncEngine {
  private meta: Meta;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private active: Promise<void> | null = null;
  private stopped = false;
  private conflict: CloudState | null = null;
  private conflictPaths: string[] = [];
  private resetting = false;
  private options: Options;
  constructor(options: Options) {
    this.options = options;
    let saved: Meta | null = null;
    try { saved = JSON.parse(options.storage.getItem(SYNC_META_KEY) || 'null'); } catch { /* fresh baseline */ }
    this.meta = saved?.base && Number.isSafeInteger(saved.revision) && Number.isSafeInteger(saved.generation) ? saved : { base: options.empty(), revision: 0, generation: 0, updatedAt: null };
  }
  private status(phase: SyncStatus['phase'], message: string, conflicts: string[] = []) {
    if (!this.stopped) this.options.onStatus({ phase, message, conflicts, details: phase === 'conflict' && this.conflict?.data ? conflictDetails(conflicts, this.options.getLocal(), this.conflict.data) : [], updatedAt: this.meta.updatedAt });
  }
  private backup(remote: CloudState) { this.options.storage.setItem(RECOVERY_KEY, JSON.stringify({ savedAt: new Date().toISOString(), local: this.options.getLocal(), cloud: remote.data })); }
  private acknowledge(remote: CloudState) {
    if (!remote.data) return;
    this.meta = { base: remote.data, revision: remote.revision, generation: remote.generation, updatedAt: remote.updatedAt };
    this.options.storage.setItem(SYNC_META_KEY, JSON.stringify(this.meta));
  }
  private apply(data: AppDatabase) { if (!this.stopped && canonical(data) !== canonical(this.options.getLocal())) this.options.apply(data); }
  private async api(method: 'GET' | 'PUT', body?: unknown): Promise<{ state: CloudState; conflict: boolean }> {
    const response = await (this.options.request || fetch)('/api/state', { method, credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
    if (response.redirected || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Sesi tamat. Muat semula laman dan log masuk semula.');
    const value = await response.json();
    if (!response.ok && response.status !== 409) throw new Error(value.error || 'Sambungan awan gagal. Cuba lagi.');
    if (!Number.isSafeInteger(value.revision) || !Number.isSafeInteger(value.generation) || !('data' in value)) throw new Error('Jawapan awan tidak sah. Data setempat dikekalkan.');
    return { state: value, conflict: response.status === 409 };
  }
  schedule(delay = 800) {
    if (this.conflict) { this.status('conflict', 'Perubahan bertindih. Pilih versi bagi rekod atau medan yang bercanggah.', this.conflictPaths); return; }
    if (this.stopped || this.resetting) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; void this.sync(); }, delay);
  }
  sync(): Promise<void> {
    if (this.stopped || this.resetting) return Promise.resolve();
    if (this.active) return this.active;
    this.active = this.run().finally(() => { this.active = null; });
    return this.active;
  }
  private async run() {
    if (this.conflict) return;
    this.status('syncing', 'Menyelaras dengan awan…');
    try {
      for (let attempt = 0; attempt < 4 && !this.stopped; attempt++) {
        const { state: remote } = await this.api('GET'); if (this.stopped) return;
        if (remote.generation > this.meta.generation) {
          if (canonical(this.options.getLocal()) !== canonical(this.meta.base)) this.backup(remote);
          if (remote.data) this.apply(remote.data); this.acknowledge(remote);
          this.status('synced', 'Tetapan semula dari peranti lain diterima.'); return;
        }
        const merged = remote.data ? mergeSnapshots(this.meta.base, this.options.getLocal(), remote.data) : { data: this.options.getLocal(), conflicts: [] };
        if (merged.conflicts.length) { this.backup(remote); this.conflict = remote; this.conflictPaths = merged.conflicts; this.status('conflict', 'Perubahan bertindih. Pilih versi bagi rekod atau medan yang bercanggah.', merged.conflicts); return; }
        this.apply(merged.data);
        if (remote.data && canonical(merged.data) === canonical(remote.data)) { this.acknowledge(remote); this.status('synced', 'Semua perubahan diselaraskan.'); return; }
        const submitted = merged.data;
        const result = await this.api('PUT', { data: submitted, revision: remote.revision, generation: remote.generation, reset: false });
        if (this.stopped) return;
        if (result.conflict) continue;
        this.acknowledge(result.state); this.status('synced', 'Semua perubahan diselaraskan.');
        if (canonical(this.options.getLocal()) !== canonical(submitted)) this.schedule(0);
        return;
      }
      throw new Error('Awan sedang berubah. Cuba selaraskan semula.');
    } catch (error) { this.status(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error', error instanceof Error ? error.message : 'Penyelarasan gagal. Data setempat dikekalkan.'); }
  }
  async resolve(prefer: 'local' | 'cloud') {
    const remote = this.conflict; if (!remote?.data) return;
    this.backup(remote);
    const merged = mergeSnapshots(this.meta.base, this.options.getLocal(), remote.data, prefer);
    this.apply(merged.data); this.acknowledge(remote); this.conflict = null;
    await this.sync();
  }
  async resetAll() {
    if (this.active) await this.active;
    this.resetting = true; if (this.timer) clearTimeout(this.timer);
    this.status('syncing', 'Mengosongkan data pada semua peranti…');
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const { state: remote } = await this.api('GET');
        const result = await this.api('PUT', { data: this.options.empty(), revision: remote.revision, generation: remote.generation, reset: true });
        if (result.conflict) continue;
        this.conflict = null; this.options.storage.removeItem(RECOVERY_KEY);
        this.apply(result.state.data!); this.acknowledge(result.state); this.status('synced', 'Semua data awan telah dikosongkan.'); return;
      }
      throw new Error('Tetapan semula belum berjaya. Cuba lagi.');
    } catch (error) { this.status('error', 'Tetapan semula awan gagal. Data setempat dikekalkan.'); throw error; }
    finally { this.resetting = false; }
  }
  stop() { this.stopped = true; if (this.timer) clearTimeout(this.timer); }
}
