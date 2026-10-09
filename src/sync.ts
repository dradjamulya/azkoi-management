import type { AppData } from './types';

/**
 * Optional cloud sync through a Supabase table, so the phone, iPad and laptop
 * all see the same data. The whole workspace is stored as one JSON row:
 *
 *   create table azkoi_state (
 *     id text primary key,
 *     data jsonb not null,
 *     updated_at timestamptz not null default now()
 *   );
 *
 * See README.md for the full setup (including the row-level-security policy).
 */

export interface SyncConfig {
  enabled: boolean;
  url: string;
  anonKey: string;
  workspace: string;
}

export interface SyncState {
  status: 'off' | 'syncing' | 'ok' | 'error';
  message: string;
}

export function loadSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem('azkoi-hub-sync');
    if (raw) return { enabled: false, url: '', anonKey: '', workspace: '', ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { enabled: false, url: '', anonKey: '', workspace: '' };
}

function endpoint(c: SyncConfig) {
  return `${c.url.replace(/\/+$/, '')}/rest/v1/azkoi_state`;
}

function headers(c: SyncConfig): Record<string, string> {
  return {
    apikey: c.anonKey,
    Authorization: `Bearer ${c.anonKey}`,
    'Content-Type': 'application/json',
  };
}

async function check(res: Response) {
  if (res.ok) return;
  let detail = '';
  try {
    const body = await res.json();
    detail = body.message || body.error || '';
  } catch {
    /* ignore */
  }
  throw new Error(`Cloud ${res.status}${detail ? `: ${detail}` : ''}`);
}

export async function pullRemote(c: SyncConfig): Promise<AppData | null> {
  const res = await fetch(`${endpoint(c)}?id=eq.${encodeURIComponent(c.workspace)}&select=data`, { headers: headers(c) });
  await check(res);
  const rows = (await res.json()) as { data: AppData }[];
  return rows[0]?.data ?? null;
}

export async function pushRemote(c: SyncConfig, data: AppData): Promise<void> {
  const res = await fetch(endpoint(c), {
    method: 'POST',
    headers: { ...headers(c), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: c.workspace, data, updated_at: data.updatedAt }),
  });
  await check(res);
}
