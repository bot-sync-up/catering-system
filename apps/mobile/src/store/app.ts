import { create } from 'zustand';
import type { User } from '../types';

interface AppState {
  user: User | null;
  online: boolean;
  syncing: boolean;
  pending: number;
  lastSyncAt: number | null;
  setUser: (u: User | null) => void;
  setOnline: (v: boolean) => void;
  setSyncing: (v: boolean) => void;
  setPending: (n: number) => void;
  setLastSyncAt: (t: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  online: true,
  syncing: false,
  pending: 0,
  lastSyncAt: null,
  setUser: (user) => set({ user }),
  setOnline: (online) => set({ online }),
  setSyncing: (syncing) => set({ syncing }),
  setPending: (pending) => set({ pending }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
}));
