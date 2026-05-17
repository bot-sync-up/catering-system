// In-memory store (greenfield demo). Persists in process only.
// In production, swap with Postgres/Prisma.

import { EventEmitter } from 'events';

export type OrderStatus = 'placed' | 'approved' | 'preparing' | 'shipping' | 'delivered';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'הוזמן',
  approved: 'אושר',
  preparing: 'בהכנה',
  shipping: 'במשלוח',
  delivered: 'נמסר'
};

export const STATUS_FLOW: OrderStatus[] = ['placed', 'approved', 'preparing', 'shipping', 'delivered'];

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
};

export type OrderLine = { itemId: string; name: string; price: number; qty: number };

export type Order = {
  id: string;
  userId: string;
  lines: OrderLine[];
  total: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  paid: boolean;
  paymentRef?: string;
  documents?: { name: string; url: string }[];
};

export type Ticket = {
  id: string;
  userId: string;
  subject: string;
  body: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: number;
  replies: { from: 'user' | 'support'; body: string; at: number }[];
};

export type Feedback = {
  id: string;
  userId: string;
  orderId?: string;
  stars: number;
  text: string;
  createdAt: number;
};

export type User = {
  id: string;
  email: string;
  name: string;
  customMenuPrefs?: { hideCategories: string[]; favoriteIds: string[] };
};

export type OtpRecord = { email: string; code: string; expiresAt: number };

type DB = {
  users: Map<string, User>;
  orders: Map<string, Order>;
  tickets: Map<string, Ticket>;
  feedback: Map<string, Feedback>;
  otps: Map<string, OtpRecord>; // email -> otp
  sessions: Map<string, string>; // sid -> userId
  menu: MenuItem[];
};

declare global {
  // eslint-disable-next-line no-var
  var __DB__: DB | undefined;
  // eslint-disable-next-line no-var
  var __BUS__: EventEmitter | undefined;
}

function seedMenu(): MenuItem[] {
  return [
    { id: 'm1', name: 'סלט קיסר', description: 'חסה רומית, פרמזן, קרוטונים', price: 42, category: 'מנות פתיחה' },
    { id: 'm2', name: 'מרק עגבניות', description: 'מרק חם עם בזיליקום', price: 28, category: 'מנות פתיחה' },
    { id: 'm3', name: 'פסטה ארביאטה', description: 'פסטה ברוטב חריף', price: 58, category: 'מנות עיקריות' },
    { id: 'm4', name: 'סטייק אנטריקוט', description: '300 גרם, צלוי על האש', price: 138, category: 'מנות עיקריות' },
    { id: 'm5', name: 'דג מושט בתנור', description: 'עם ירקות שורש', price: 92, category: 'מנות עיקריות' },
    { id: 'm6', name: 'קינוח טירמיסו', description: 'איטלקי קלאסי', price: 36, category: 'קינוחים' },
    { id: 'm7', name: 'בראוניס שוקולד', description: 'חם עם גלידה', price: 32, category: 'קינוחים' },
    { id: 'm8', name: 'קולה', description: 'פחית 330 מ"ל', price: 12, category: 'שתייה' },
    { id: 'm9', name: 'מים מינרליים', description: 'בקבוק 500 מ"ל', price: 8, category: 'שתייה' }
  ];
}

export function db(): DB {
  if (!globalThis.__DB__) {
    globalThis.__DB__ = {
      users: new Map(),
      orders: new Map(),
      tickets: new Map(),
      feedback: new Map(),
      otps: new Map(),
      sessions: new Map(),
      menu: seedMenu()
    };
    // Seed demo user
    const u: User = {
      id: 'u_demo',
      email: 'demo@example.com',
      name: 'לקוח לדוגמה',
      customMenuPrefs: { hideCategories: [], favoriteIds: ['m4', 'm6'] }
    };
    globalThis.__DB__.users.set(u.id, u);
    // Seed historical order
    const past: Order = {
      id: 'o_past_1',
      userId: u.id,
      lines: [
        { itemId: 'm3', name: 'פסטה ארביאטה', price: 58, qty: 2 },
        { itemId: 'm6', name: 'קינוח טירמיסו', price: 36, qty: 1 }
      ],
      total: 152,
      status: 'delivered',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
      updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 60 * 2,
      paid: true,
      paymentRef: 'CC-DEMO-001',
      documents: [{ name: 'חשבונית_2026_001.pdf', url: '/api/documents/o_past_1' }]
    };
    globalThis.__DB__.orders.set(past.id, past);
  }
  return globalThis.__DB__;
}

export function bus(): EventEmitter {
  if (!globalThis.__BUS__) {
    const e = new EventEmitter();
    e.setMaxListeners(1000);
    globalThis.__BUS__ = e;
  }
  return globalThis.__BUS__;
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
