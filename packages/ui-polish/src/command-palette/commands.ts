import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Users,
  ShoppingCart,
  FileText,
  Settings,
  Bell,
  Search,
  Plus,
  Download,
  Upload,
  Printer,
  Sun,
  Moon,
  LogOut,
  HelpCircle,
  Mail,
  Phone,
  Calendar,
  BarChart3,
  Wallet,
  Inbox,
  Tag,
  Truck,
  Package,
  CreditCard,
  Building2,
  Briefcase,
  Image as ImageIcon,
  Languages,
  Keyboard,
} from 'lucide-react';

export interface Command {
  id: string;
  title: string;
  description?: string;
  group?: string;
  keywords?: string[];
  shortcut?: string;
  icon?: LucideIcon;
  action: () => void;
}

type ActionMap = Partial<Record<string, () => void>>;

/** מחזיר 30 פקודות ברירת מחדל בעברית. ה-actions מועברים מבחוץ. */
export function buildDefaultCommands(actions: ActionMap = {}): Command[] {
  const noop = (): void => {};
  return [
    { id: 'home', title: 'מעבר לדף הבית', group: 'ניווט', icon: Home, keywords: ['ראשי'], action: actions.home ?? noop },
    { id: 'customers', title: 'לקוחות', group: 'ניווט', icon: Users, keywords: ['client'], action: actions.customers ?? noop },
    { id: 'orders', title: 'הזמנות', group: 'ניווט', icon: ShoppingCart, keywords: ['order'], action: actions.orders ?? noop },
    { id: 'invoices', title: 'חשבוניות', group: 'ניווט', icon: FileText, action: actions.invoices ?? noop },
    { id: 'reports', title: 'דוחות', group: 'ניווט', icon: BarChart3, action: actions.reports ?? noop },
    { id: 'calendar', title: 'יומן', group: 'ניווט', icon: Calendar, action: actions.calendar ?? noop },
    { id: 'inbox', title: 'תיבת דואר נכנס', group: 'ניווט', icon: Inbox, action: actions.inbox ?? noop },
    { id: 'wallet', title: 'ארנק / תנועות', group: 'ניווט', icon: Wallet, action: actions.wallet ?? noop },
    { id: 'settings', title: 'הגדרות', group: 'ניווט', icon: Settings, shortcut: 'mod+,', action: actions.settings ?? noop },
    { id: 'notifications', title: 'מרכז התראות', group: 'ניווט', icon: Bell, action: actions.notifications ?? noop },
    { id: 'new-customer', title: 'יצירת לקוח חדש', group: 'יצירה', icon: Plus, shortcut: 'mod+n', action: actions.newCustomer ?? noop },
    { id: 'new-order', title: 'יצירת הזמנה חדשה', group: 'יצירה', icon: Plus, action: actions.newOrder ?? noop },
    { id: 'new-invoice', title: 'יצירת חשבונית', group: 'יצירה', icon: Plus, action: actions.newInvoice ?? noop },
    { id: 'new-event', title: 'יצירת אירוע ביומן', group: 'יצירה', icon: Plus, action: actions.newEvent ?? noop },
    { id: 'send-email', title: 'שליחת מייל', group: 'תקשורת', icon: Mail, action: actions.sendEmail ?? noop },
    { id: 'send-sms', title: 'שליחת SMS', group: 'תקשורת', icon: Phone, action: actions.sendSms ?? noop },
    { id: 'search', title: 'חיפוש גלובלי', group: 'כלים', icon: Search, shortcut: 'mod+f', action: actions.search ?? noop },
    { id: 'export-csv', title: 'ייצוא ל-CSV', group: 'נתונים', icon: Download, action: actions.exportCsv ?? noop },
    { id: 'export-excel', title: 'ייצוא ל-Excel', group: 'נתונים', icon: Download, action: actions.exportExcel ?? noop },
    { id: 'import', title: 'ייבוא מקובץ', group: 'נתונים', icon: Upload, action: actions.import ?? noop },
    { id: 'print', title: 'הדפסה', group: 'נתונים', icon: Printer, shortcut: 'mod+p', action: actions.print ?? noop },
    { id: 'theme-light', title: 'מצב בהיר', group: 'תצוגה', icon: Sun, action: actions.themeLight ?? noop },
    { id: 'theme-dark', title: 'מצב כהה', group: 'תצוגה', icon: Moon, action: actions.themeDark ?? noop },
    { id: 'language', title: 'החלפת שפה', group: 'תצוגה', icon: Languages, action: actions.language ?? noop },
    { id: 'shortcuts', title: 'קיצורי מקלדת', group: 'עזרה', icon: Keyboard, shortcut: 'mod+/', action: actions.shortcuts ?? noop },
    { id: 'help', title: 'מרכז עזרה', group: 'עזרה', icon: HelpCircle, action: actions.help ?? noop },
    { id: 'tags', title: 'ניהול תגיות', group: 'מערכת', icon: Tag, action: actions.tags ?? noop },
    { id: 'shipments', title: 'משלוחים', group: 'מערכת', icon: Truck, action: actions.shipments ?? noop },
    { id: 'inventory', title: 'מלאי / מוצרים', group: 'מערכת', icon: Package, action: actions.inventory ?? noop },
    { id: 'logout', title: 'התנתקות מהמערכת', group: 'חשבון', icon: LogOut, action: actions.logout ?? noop },
    // bonus
    { id: 'billing', title: 'תשלומים ומנויים', group: 'חשבון', icon: CreditCard, action: actions.billing ?? noop },
    { id: 'org', title: 'פרטי הארגון', group: 'חשבון', icon: Building2, action: actions.org ?? noop },
    { id: 'team', title: 'משתמשים והרשאות', group: 'חשבון', icon: Briefcase, action: actions.team ?? noop },
    { id: 'gallery', title: 'גלריה / קבצים', group: 'מערכת', icon: ImageIcon, action: actions.gallery ?? noop },
  ];
}
