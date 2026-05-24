import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={theme.colors.muted}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: theme.font.body,
  },
});
