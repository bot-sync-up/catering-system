import type { Meta, StoryObj } from '@storybook/react';
import { Toaster, NotificationCenter, notify } from '../src/notifications';

const meta: Meta = { title: 'Notifications' };
export default meta;

export const Toasts: StoryObj = {
  render: () => (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => notify.success('בוצע בהצלחה', 'ההזמנה נשלחה')}
          className="rounded-md bg-success px-3 py-1.5 text-white"
        >
          הצלחה
        </button>
        <button
          onClick={() => notify.error('שגיאה', 'בעיה בחיבור לשרת')}
          className="rounded-md bg-danger px-3 py-1.5 text-white"
        >
          שגיאה
        </button>
        <button
          onClick={() => notify.warning('שימו לב', 'הפעולה תמחק נתונים')}
          className="rounded-md bg-warning px-3 py-1.5 text-white"
        >
          אזהרה
        </button>
        <button
          onClick={() => notify.info('עדכון', 'גרסה חדשה זמינה')}
          className="rounded-md bg-info px-3 py-1.5 text-white"
        >
          מידע
        </button>
      </div>
      <Toaster />
    </div>
  ),
};

export const Center: StoryObj = { render: () => <NotificationCenter /> };
