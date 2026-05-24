import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import { api } from './api';
import { useAppStore } from '../store/app';

const SYNC_TABLES = [
  'tasks',
  'check_ins',
  'photos',
  'notes',
  'orders',
  'shifts',
  'leads',
  'signatures',
];

let isRunning = false;
let unsub: null | (() => void) = null;
let timer: any = null;

/** Initialize background auto-sync. Triggered by connectivity + interval. */
export function initSync() {
  unsub = NetInfo.addEventListener((s) => {
    useAppStore.getState().setOnline(!!s.isConnected);
    if (s.isConnected) void runSync('netinfo');
  });
  // periodic check every 60s
  timer = setInterval(() => void runSync('interval'), 60_000);
  void runSync('init');
}

export function disposeSync() {
  if (unsub) unsub();
  if (timer) clearInterval(timer);
}

export async function runSync(_reason: string): Promise<void> {
  if (isRunning) return;
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;
  isRunning = true;
  useAppStore.getState().setSyncing(true);
  try {
    await pushLocalChanges();
    await pullRemoteChanges();
    useAppStore.getState().setLastSyncAt(Date.now());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('sync failed', err);
  } finally {
    isRunning = false;
    useAppStore.getState().setSyncing(false);
    await refreshPendingCount();
  }
}

async function refreshPendingCount() {
  let total = 0;
  for (const t of SYNC_TABLES) {
    const c = await database
      .get(t)
      .query(Q.where('is_dirty', true))
      .fetchCount();
    total += c;
  }
  useAppStore.getState().setPending(total);
}

/** Push all locally dirty rows. Conflict resolution: last-write-wins + flag. */
async function pushLocalChanges() {
  for (const tableName of SYNC_TABLES) {
    const dirty = await database
      .get(tableName)
      .query(Q.where('is_dirty', true))
      .fetch();
    if (dirty.length === 0) continue;
    const payload = dirty.map((m: any) => serialize(tableName, m));
    try {
      const res = await api.post(`/sync/${tableName}/push`, { rows: payload });
      const conflicts: Array<{ id: string; serverUpdatedAt: number }> =
        res.data?.conflicts ?? [];
      const conflictMap = new Map(conflicts.map((c) => [c.id, c]));
      await database.write(async () => {
        for (const m of dirty) {
          await m.update((rec: any) => {
            rec.isDirty = false;
            const conflict = conflictMap.get(m.id);
            if (conflict) {
              // last-write-wins: server wins when local updatedAt < server
              const localTs = (m as any).updatedAt?.getTime?.() ?? 0;
              if (localTs < conflict.serverUpdatedAt) {
                rec.conflictFlag = `server_won@${conflict.serverUpdatedAt}`;
              } else {
                rec.conflictFlag = `local_won@${localTs}`;
              }
            }
          });
        }
      });
    } catch (err) {
      // keep dirty for next attempt
      // eslint-disable-next-line no-console
      console.warn(`push ${tableName} failed`, err);
    }
  }
}

/** Pull deltas since last sync. */
async function pullRemoteChanges() {
  const since = useAppStore.getState().lastSyncAt ?? 0;
  for (const tableName of SYNC_TABLES) {
    try {
      const res = await api.get(`/sync/${tableName}/pull`, {
        params: { since },
      });
      const rows: any[] = res.data?.rows ?? [];
      if (!rows.length) continue;
      await database.write(async () => {
        const collection = database.get(tableName);
        for (const r of rows) {
          const existing = await collection.find(r.id).catch(() => null);
          if (existing) {
            await existing.update((m: any) => applyServerRow(tableName, m, r));
          } else {
            await collection.create((m: any) => {
              (m as any)._raw.id = r.id;
              applyServerRow(tableName, m, r);
            });
          }
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`pull ${tableName} failed`, err);
    }
  }
}

function serialize(_table: string, m: any) {
  const raw = { ...(m._raw as any) };
  return raw;
}

function applyServerRow(_table: string, model: any, row: any) {
  for (const k of Object.keys(row)) {
    if (k === 'id') continue;
    (model as any)[camel(k)] = row[k];
  }
  (model as any).isDirty = false;
  if (row.server_updated_at) {
    (model as any).serverUpdatedAt = new Date(row.server_updated_at);
  }
}

function camel(s: string) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
