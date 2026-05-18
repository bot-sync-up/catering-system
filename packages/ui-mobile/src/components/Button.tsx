import React from 'react';
import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  PressableProps,
} from 'react-native';
import { Text } from './Text';
import { theme } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props extends PressableProps {
  title: string;
  variant?: Variant;
  loading?: boolean;
}

export function Button({ title, variant = 'primary', loading, ...rest }: Props) {
  const bg = {
    primary: theme.colors.primary,
    secondary: theme.colors.surface,
    danger: theme.colors.danger,
    ghost: 'transparent',
  }[variant];
  const color =
    variant === 'primary' ? '#0F172A' : theme.colors.text;
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: pressed ? 0.85 : 1 },
        variant === 'ghost' && {
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={{ color, fontWeight: '600' }}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
