export const theme = {
  colors: {
    bg: '#0F172A',
    card: '#1E293B',
    surface: '#334155',
    text: '#F8FAFC',
    muted: '#94A3B8',
    primary: '#22D3EE',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    border: '#475569',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { sm: 6, md: 10, lg: 16 },
  font: {
    title: 22,
    h1: 20,
    h2: 18,
    body: 16,
    small: 13,
  },
};
export type Theme = typeof theme;
