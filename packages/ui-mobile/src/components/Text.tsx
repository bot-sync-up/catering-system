import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function Text({ style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[styles.base, style]}
      allowFontScaling
      textBreakStrategy="balanced"
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: theme.colors.text,
    fontSize: theme.font.body,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
