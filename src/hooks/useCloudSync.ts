import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppDatabase } from '../types';
import { createEmptyDatabase, saveDatabase } from '../services/storage';
import { SyncEngine, type SyncStatus } from '../services/cloudSync';
export function useCloudSync(data: AppDatabase, setData: Dispatch<SetStateAction<AppDatabase>>) {
  const local = useRef(data); local.current = data;
  const engine = useRef<SyncEngine | null>(null);
  const [status, setStatus] = useState<SyncStatus>({ phase: 'starting', message: 'Menyambung ke awan…', updatedAt: null, conflicts: [], details: [] });
  useEffect(() => {
    const service = new SyncEngine({ empty: createEmptyDatabase, getLocal: () => local.current, storage: localStorage,
      apply: next => { local.current = next; saveDatabase(next); setData(next); }, onStatus: setStatus });
    engine.current = service; void service.sync();
    const refresh = () => { if (document.visibilityState === 'visible') void service.sync(); };
    const offline = () => setStatus(previous => previous.phase === 'conflict' ? previous : { ...previous, phase: 'offline', message: 'Luar talian. Perubahan akan diselaraskan apabila sambungan tersedia.' });
    const interval = setInterval(refresh, 15000);
    window.addEventListener('offline', offline); window.addEventListener('online', refresh); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { service.stop(); clearInterval(interval); window.removeEventListener('offline', offline); window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); engine.current = null; };
  }, [setData]);
  useEffect(() => { saveDatabase(data); engine.current?.schedule(); }, [data]);
  return { status, syncNow: useCallback(() => engine.current?.sync() || Promise.resolve(), []),
    resolve: useCallback((prefer: 'local' | 'cloud') => engine.current?.resolve(prefer) || Promise.resolve(), []),
    resetAll: useCallback(async () => { if (!engine.current) throw new Error('Sambungan awan belum tersedia.'); await engine.current.resetAll(); }, []) };
}
