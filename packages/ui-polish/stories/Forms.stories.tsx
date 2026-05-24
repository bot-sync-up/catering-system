import type { Meta, StoryObj } from '@storybook/react';
import {
  HebrewInput,
  PhoneInput,
  IsraeliIdInput,
  BusinessIdInput,
  CurrencyInput,
  DatePicker,
} from '../src/forms';

const meta: Meta = { title: 'Forms' };
export default meta;

export const All: StoryObj = {
  render: () => (
    <form className="max-w-md space-y-4">
      <HebrewInput label="שם מלא" placeholder="ישראל ישראלי" required />
      <PhoneInput required />
      <IsraeliIdInput />
      <BusinessIdInput />
      <CurrencyInput label="סכום הזמנה" defaultValue={1250} />
      <DatePicker label="תאריך לידה" calendar="both" />
      <button
        type="submit"
        className="rounded-md bg-primary px-4 py-2 text-primary-fg hover:bg-primary-hover"
      >
        שמירה
      </button>
    </form>
  ),
};
