import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { theme } from '../theme';

interface Props {
  online: boolean;
  syncing: boolean;
  pending: number;
}

export function SyncBar({ online, syncing, pending }: Props) {
  const tone = !online
    ? theme.colors.danger
    : syncing
    ? theme.colors.warning
    : pending > 0
    ? theme.colors.warning
    : theme.colors.success;
  const label = !online
    ? 'לא מחובר'
    : syncing
    ? 'מסנכרן...'
    : pending > 0
    ? `${pending} ממתינים לסנכרון`
    : 'מסונכרן';
  return (
    <View style={[styles.bar, { backgroundColor: tone }]}>
      <Text style={{ fontSize: theme.font.small, color: '#0F172A' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
});
