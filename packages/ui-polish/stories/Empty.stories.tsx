import type { Meta, StoryObj } from '@storybook/react';
import {
  EmptyState,
  NoCustomers,
  NoOrders,
  SearchNoResults,
  NoNotifications,
  NoDocuments,
} from '../src/empty';
import { Inbox } from 'lucide-react';

const meta: Meta = { title: 'Empty' };
export default meta;

export const Generic: StoryObj = {
  render: () => (
    <EmptyState
      icon={<Inbox className="h-full w-full" />}
      title="התיבה ריקה"
      description="כשיגיעו פריטים חדשים הם יופיעו כאן."
      action={
        <button className="rounded-md bg-primary px-3 py-1.5 text-primary-fg">
          רענן
        </button>
      }
    />
  ),
};
export const Customers: StoryObj = { render: () => <NoCustomers /> };
export const Orders: StoryObj = { render: () => <NoOrders /> };
export const SearchNone: StoryObj = { render: () => <SearchNoResults query="משה" /> };
export const Notifications: StoryObj = { render: () => <NoNotifications /> };
export const Documents: StoryObj = { render: () => <NoDocuments /> };
