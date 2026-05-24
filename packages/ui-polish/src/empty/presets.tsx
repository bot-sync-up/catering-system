import type { ReactNode } from 'react';
import {
  Users,
  ShoppingCart,
  SearchX,
  Inbox,
  FileText,
  Bell,
  MessageCircle,
  Calendar,
  Wallet,
  Image as ImageIcon,
} from 'lucide-react';
import { EmptyState } from './EmptyState';

interface PresetProps {
  action?: ReactNode;
}

interface SearchProps extends PresetProps {
  query?: string;
}

/** אין לקוחות במערכת. */
export function NoCustomers({ action }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<Users className="h-full w-full" />}
      title="אין לקוחות עדיין"
      description="ברגע שיתווספו לקוחות חדשים הם יופיעו כאן. אפשר להוסיף לקוח ידנית או לייבא מקובץ."
      action={action}
    />
  );
}

/** אין הזמנות. */
export function NoOrders({ action }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<ShoppingCart className="h-full w-full" />}
      title="אין הזמנות פעילות"
      description="כשתגיע הזמנה חדשה היא תופיע ברשימה הזו עם כל הפרטים שצריך."
      action={action}
    />
  );
}

/** חיפוש ללא תוצאות. */
export function SearchNoResults({ query, action }: SearchProps = {}) {
  return (
    <EmptyState
      icon={<SearchX className="h-full w-full" />}
      title={query ? `לא נמצאו תוצאות עבור "${query}"` : 'לא נמצאו תוצאות'}
      description="נסו לבדוק את האיות, להשתמש במילים אחרות או להסיר מסננים שהפעלתם."
      action={action}
    />
  );
}

/** תיבת הודעות ריקה. */
export function NoMessages({ action }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<MessageCircle className="h-full w-full" />}
      title="אין הודעות"
      description="כשמישהו ישלח לכם הודעה — תראו אותה כאן."
      action={action}
    />
  );
}

/** Inbox ריק. */
export function NoNotifications({ action }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<Bell className="h-full w-full" />}
      title="אין התראות חדשות"
      description="הכל קרוא ומעודכן — נחזור עם עדכונים ברגע שיהיו חדשות."
      action={action}
    />
  );
}

/** אין מסמכים. */
export function NoDocuments({ action }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<FileText className="h-full w-full" />}
      title="אין מסמכים"
      description="העלו מסמך ראשון או צרו אחד חדש כדי להתחיל."
      action={action}
    />
  );
}

/** אין אירועים ביומן. */
export function NoEvents({ action }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<Calendar className="h-full w-full" />}
      title="היומן ריק"
      description="אין אירועים מתוכננים בטווח התאריכים שנבחר."
      action={action}
    />
  );
}

/** אין תנועות כספיות. */
export function NoTransactions({ action }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<Wallet className="h-full w-full" />}
      title="אין תנועות"
      description="כשתבוצע פעולה כספית היא תופיע ברשימה הזו."
      action={action}
    />
  );
}

/** אין תמונות בגלריה. */
export function NoMedia({ action }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<ImageIcon className="h-full w-full" />}
      title="אין מדיה"
      description="העלו תמונה או סרטון כדי להתחיל לבנות גלריה."
      action={action}
    />
  );
}

/** Inbox ריק כללי. */
export function InboxEmpty({ action }: PresetProps = {}) {
  return (
    <EmptyState
      icon={<Inbox className="h-full w-full" />}
      title="אין פריטים בתיבה"
      description="כשיגיעו פריטים חדשים הם יופיעו כאן."
      action={action}
    />
  );
}
