import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette, buildDefaultCommands } from '../src/command-palette';
import { useShortcuts, formatCombo } from '../src/hooks/useShortcuts';
import { useNotifications, notify } from '../src/stores/notifications';
import { Toaster } from '../src/notifications';
import { contrastRatio, meetsContrastAA, announce } from '../src/utils/a11y';
import { FocusTrap } from '../src/a11y/FocusTrap';

describe('CommandPalette', () => {
  it('פתיחה והקלדת חיפוש מסננת פקודות', async () => {
    const action = vi.fn();
    const cmds = buildDefaultCommands({ home: action });
    render(<CommandPalette open onClose={() => {}} commands={cmds} />);
    const input = screen.getByLabelText(/הקלידו פקודה/);
    await userEvent.type(input, 'בית');
    expect(screen.getByText('מעבר לדף הבית')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(action).toHaveBeenCalled();
  });

  it('Escape סוגר את הפלט', async () => {
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} commands={buildDefaultCommands()} />);
    const input = screen.getByLabelText(/הקלידו פקודה/);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('useShortcuts', () => {
  function Host({ onTrigger }: { onTrigger: () => void }) {
    useShortcuts([
      { combo: 'mod+k', description: 'palette', handler: onTrigger, enableInInputs: true },
    ]);
    return <div>host</div>;
  }

  it('מפעיל קיצור Ctrl+K', () => {
    const trig = vi.fn();
    render(<Host onTrigger={trig} />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(trig).toHaveBeenCalled();
  });

  it('formatCombo מציג Ctrl + K', () => {
    expect(formatCombo('ctrl+k')).toContain('K');
  });
});

describe('Notifications store', () => {
  beforeEach(() => useNotifications.getState().clear());

  it('הוספת notification מעדכנת unread', () => {
    notify.success('בוצע!');
    expect(useNotifications.getState().items).toHaveLength(1);
    expect(useNotifications.getState().unreadCount()).toBe(1);
  });

  it('markRead מעדכן סטטוס', () => {
    const id = notify.info('hi');
    useNotifications.getState().markRead(id);
    expect(useNotifications.getState().unreadCount()).toBe(0);
  });

  it('Toaster מציג טוסט', () => {
    notify.error('שגיאה', 'משהו');
    render(<Toaster />);
    expect(screen.getByText('שגיאה')).toBeInTheDocument();
  });
});

describe('A11y utils', () => {
  it('contrastRatio שחור על לבן הוא 21', () => {
    const r = contrastRatio('#000000', '#ffffff');
    expect(Math.round(r)).toBe(21);
  });

  it('meetsContrastAA פועל', () => {
    expect(meetsContrastAA('#000000', '#ffffff')).toBe(true);
    expect(meetsContrastAA('#cccccc', '#ffffff')).toBe(false);
  });

  it('announce יוצר live region', () => {
    announce('שלום עולם');
    const region = document.querySelector('[role="status"][aria-live]');
    expect(region).toBeTruthy();
  });
});

describe('FocusTrap', () => {
  it('שם פוקוס על הראשון', async () => {
    render(
      <FocusTrap active>
        <button>ראשון</button>
        <button>שני</button>
      </FocusTrap>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(document.activeElement?.textContent).toBe('ראשון');
  });
});
