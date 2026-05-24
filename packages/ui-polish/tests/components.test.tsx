import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Skeleton,
  Spinner,
  EmptyState,
  NoCustomers,
  NotFound,
  ServerError,
  FallbackUI,
  ErrorBoundary,
  PhoneInput,
  IsraeliIdInput,
  CurrencyInput,
  HebrewInput,
  BulkActions,
  BulkSelector,
  ProgressBar,
} from '../src';

describe('Loading', () => {
  it('Skeleton מציג role=status', () => {
    render(<Skeleton width={100} height={20} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('Spinner מציג טקסט נגישות', () => {
    render(<Spinner label="טוען נתונים" />);
    expect(screen.getByText('טוען נתונים')).toBeInTheDocument();
  });

  it('ProgressBar עם value נכון', () => {
    render(<ProgressBar value={42} label="התקדמות" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '42');
  });
});

describe('Empty', () => {
  it('EmptyState מציג כותרת', () => {
    render(<EmptyState title="ריק" description="אין כלום" />);
    expect(screen.getByText('ריק')).toBeInTheDocument();
    expect(screen.getByText('אין כלום')).toBeInTheDocument();
  });

  it('NoCustomers preset', () => {
    render(<NoCustomers />);
    expect(screen.getByText('אין לקוחות עדיין')).toBeInTheDocument();
  });
});

describe('Errors', () => {
  it('NotFound', () => {
    render(<NotFound />);
    expect(screen.getByText('הדף לא נמצא')).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('ServerError onRetry', () => {
    const onRetry = vi.fn();
    render(<ServerError onRetry={onRetry} />);
    fireEvent.click(screen.getByText('נסה שוב'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('FallbackUI עם פרטים', () => {
    render(<FallbackUI error={new Error('boom')} showDetails />);
    expect(screen.getByText('משהו השתבש')).toBeInTheDocument();
    expect(screen.getByText(/פרטי השגיאה/)).toBeInTheDocument();
  });

  it('ErrorBoundary תופס שגיאה', () => {
    const Bomb = (): never => {
      throw new Error('💣');
    };
    // השתקת console.error לבדיקה
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('משהו השתבש')).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('Forms', () => {
  it('PhoneInput מעצב מספר', async () => {
    const onChange = vi.fn();
    render(<PhoneInput onChange={onChange} />);
    const input = screen.getByLabelText('טלפון') as HTMLInputElement;
    await userEvent.type(input, '0501234567');
    expect(input.value).toBe('050-123-4567');
    expect(onChange).toHaveBeenLastCalledWith('0501234567', true);
  });

  it('IsraeliIdInput מסמן שגיאה למספר לא תקין', () => {
    render(<IsraeliIdInput />);
    const input = screen.getByLabelText('תעודת זהות') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '123456789' } });
    fireEvent.blur(input);
    expect(screen.getByText('מספר תעודת הזהות אינו תקין')).toBeInTheDocument();
  });

  it('CurrencyInput מעצב סכום', () => {
    const onChange = vi.fn();
    render(<CurrencyInput onChange={onChange} defaultValue={1234.5} />);
    const input = screen.getByLabelText('סכום') as HTMLInputElement;
    expect(input.value).toMatch(/1,234/);
  });

  it('HebrewInput מקבל טקסט עברי', async () => {
    render(<HebrewInput label="שם" />);
    const input = screen.getByLabelText('שם') as HTMLInputElement;
    expect(input.getAttribute('dir')).toBe('rtl');
    expect(input.getAttribute('lang')).toBe('he');
  });
});

describe('Bulk', () => {
  it('BulkSelector indeterminate', () => {
    const onChange = vi.fn();
    render(<BulkSelector checked={false} indeterminate onChange={onChange} />);
    const cb = screen.getByRole('checkbox') as HTMLInputElement;
    expect(cb.indeterminate).toBe(true);
  });

  it('BulkActions לא מוצג אם count=0', () => {
    const { container } = render(<BulkActions count={0} onClear={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('BulkActions מציג מספר נכון', () => {
    render(<BulkActions count={3} onClear={() => {}} />);
    expect(screen.getByText(/נבחרו 3 פריטים/)).toBeInTheDocument();
  });
});
