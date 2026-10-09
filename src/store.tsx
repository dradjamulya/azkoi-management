import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData } from './types';
import { createSeed } from './seed';
import { pullRemote, pushRemote, loadSyncConfig, type SyncConfig, type SyncState } from './sync';

const STORAGE_KEY = 'azkoi-hub-data-v1';

/** Fill in fields added after a backup / older version was saved. */
export function normalize(d: AppData): AppData {
  return {
    ...d,
    ingredients: d.ingredients.map((i) => ({ ...i, lowAt: i.lowAt ?? null })),
    products: d.products.map((p) => ({ ...p, priceOptions: p.priceOptions ?? [] })),
    campaigns: d.campaigns ?? [],
    tasks: d.tasks ?? [],
    txns: d.txns ?? [],
  };
}

function readLocal(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.orders)) return normalize(parsed);
    }
  } catch {
    /* storage unavailable or corrupt — fall back to seed */
  }
  return createSeed();
}

function writeLocal(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

type Updater = (draft: AppData) => AppData;

interface Store {
  data: AppData;
  update: (fn: Updater) => void;
  replace: (data: AppData) => void;
  sync: SyncState;
  syncConfig: SyncConfig;
  setSyncConfig: (c: SyncConfig) => void;
  syncNow: () => Promise<void>;
  toast: (msg: string) => void;
  toastMsg: string;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(readLocal);
  const [syncConfig, setSyncConfigState] = useState<SyncConfig>(loadSyncConfig);
  const [sync, setSync] = useState<SyncState>({ status: 'off', message: '' });
  const [toastMsg, setToastMsg] = useState('');
  const dirty = useRef(false);
  const toastTimer = useRef<number>();

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2600);
  }, []);

  const update = useCallback((fn: Updater) => {
    setData((prev) => {
      const next = fn(structuredClone(prev));
      next.updatedAt = new Date().toISOString();
      dirty.current = true;
      return next;
    });
  }, []);

  const replace = useCallback((next: AppData) => {
    dirty.current = true;
    setData({ ...normalize(next), updatedAt: new Date().toISOString() });
  }, []);

  useEffect(() => writeLocal(data), [data]);

  const syncNow = useCallback(async () => {
    if (!syncConfig.enabled) return;
    setSync({ status: 'syncing', message: 'Syncing…' });
    try {
      const remote = await pullRemote(syncConfig);
      if (remote && remote.updatedAt > data.updatedAt) {
        dirty.current = false;
        setData(normalize(remote));
        setSync({ status: 'ok', message: `Pulled latest · ${new Date().toLocaleTimeString()}` });
        return;
      }
      if (!remote || remote.updatedAt < data.updatedAt) await pushRemote(syncConfig, data);
      dirty.current = false;
      setSync({ status: 'ok', message: `Synced · ${new Date().toLocaleTimeString()}` });
    } catch (e) {
      setSync({ status: 'error', message: e instanceof Error ? e.message : 'Sync failed' });
    }
  }, [syncConfig, data]);

  // Pull once on start / whenever sync gets configured, and when the tab regains focus.
  const syncRef = useRef(syncNow);
  syncRef.current = syncNow;
  useEffect(() => {
    if (!syncConfig.enabled) {
      setSync({ status: 'off', message: 'Saved on this device only' });
      return;
    }
    void syncRef.current();
    const onFocus = () => document.visibilityState === 'visible' && void syncRef.current();
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [syncConfig]);

  // Push local edits shortly after they happen.
  useEffect(() => {
    if (!syncConfig.enabled || !dirty.current) return;
    const t = window.setTimeout(async () => {
      setSync({ status: 'syncing', message: 'Saving…' });
      try {
        await pushRemote(syncConfig, data);
        dirty.current = false;
        setSync({ status: 'ok', message: `Synced · ${new Date().toLocaleTimeString()}` });
      } catch (e) {
        setSync({ status: 'error', message: e instanceof Error ? e.message : 'Sync failed' });
      }
    }, 1200);
    return () => window.clearTimeout(t);
  }, [data, syncConfig]);

  const setSyncConfig = useCallback((c: SyncConfig) => {
    try {
      localStorage.setItem('azkoi-hub-sync', JSON.stringify(c));
    } catch {
      /* ignore */
    }
    setSyncConfigState(c);
  }, []);

  const value = useMemo(
    () => ({ data, update, replace, sync, syncConfig, setSyncConfig, syncNow, toast, toastMsg }),
    [data, update, replace, sync, syncConfig, setSyncConfig, syncNow, toast, toastMsg],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}
