import { z } from 'zod';

const ConfigSchema = z.object({
  port: z.coerce.number().default(4100),
  logLevel: z.string().default('info'),
  redis: z.object({
    host: z.string().default('127.0.0.1'),
    port: z.coerce.number().default(6379),
    password: z.string().optional(),
  }),
  services: z.object({
    crm: z.string().default('http://mock-crm.local'),
    inventory: z.string().default('http://mock-inventory.local'),
    kitchen: z.string().default('http://mock-kitchen.local'),
    staff: z.string().default('http://mock-staff.local'),
    delivery: z.string().default('http://mock-delivery.local'),
    icount: z.string().default('https://api.icount.co.il'),
    cardcom: z.string().default('https://secure.cardcom.solutions'),
    notify: z.string().default('http://mock-notify.local'),
    bi: z.string().default('http://mock-bi.local'),
  }),
  icount: z.object({
    apiKey: z.string().default('test_key'),
  }),
  cardcom: z.object({
    terminal: z.string().default('test_terminal'),
    apiName: z.string().default('test_user'),
  }),
  useMocks: z.coerce.boolean().default(true),
});

export type Config = z.infer<typeof ConfigSchema>;

export const config: Config = ConfigSchema.parse({
  port: process.env.PORT,
  logLevel: process.env.LOG_LEVEL,
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  services: {
    crm: process.env.CRM_BASE_URL,
    inventory: process.env.INVENTORY_BASE_URL,
    kitchen: process.env.KITCHEN_BASE_URL,
    staff: process.env.STAFF_BASE_URL,
    delivery: process.env.DELIVERY_BASE_URL,
    icount: process.env.ICOUNT_BASE_URL,
    cardcom: process.env.CARDCOM_BASE_URL,
    notify: process.env.NOTIFY_BASE_URL,
    bi: process.env.BI_BASE_URL,
  },
  icount: {
    apiKey: process.env.ICOUNT_API_KEY,
  },
  cardcom: {
    terminal: process.env.CARDCOM_TERMINAL,
    apiName: process.env.CARDCOM_API_NAME,
  },
  useMocks: process.env.USE_MOCKS ?? 'true',
});
