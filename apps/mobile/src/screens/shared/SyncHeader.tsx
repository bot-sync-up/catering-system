import React from 'react';
import { SyncBar } from '@field-ops/ui';
import { useAppStore } from '../../store/app';

export function SyncHeader() {
  const online = useAppStore((s) => s.online);
  const syncing = useAppStore((s) => s.syncing);
  const pending = useAppStore((s) => s.pending);
  return <SyncBar online={online} syncing={syncing} pending={pending} />;
}
