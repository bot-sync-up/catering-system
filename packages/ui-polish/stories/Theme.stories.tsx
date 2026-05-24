import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, ThemeToggle, useTheme } from '../src/theme';

const meta: Meta = { title: 'Theme' };
export default meta;

function Demo() {
  const { mode, resolved } = useTheme();
  return (
    <div className="space-y-2">
      <p>
        מצב נבחר: <strong>{mode}</strong>
      </p>
      <p>
        מצב פעיל בפועל: <strong>{resolved}</strong>
      </p>
      <ThemeToggle />
    </div>
  );
}

export const Toggle: StoryObj = {
  render: () => (
    <ThemeProvider>
      <Demo />
    </ThemeProvider>
  ),
};
