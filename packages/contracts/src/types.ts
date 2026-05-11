import { z } from 'zod';

export const PartySchema = z.object({
  name: z.string().min(2),
  idNumber: z.string().optional(),
  email: z.string().email(),
  phone: z.string().min(7),
  address: z.string().optional(),
});

export const ContractSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  title: z.string(),
  status: z.enum(['draft', 'sent', 'signed', 'expired', 'cancelled']),
  createdAt: z.string(),
  updatedAt: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
  renewalReminderDays: z.number().int().nonnegative().default(30),
  provider: PartySchema,
  client: PartySchema,
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  totalAmount: z.number().nonnegative(),
  currency: z.enum(['ILS', 'USD', 'EUR']).default('ILS'),
  signatureProvider: z.enum(['canvas', 'docusign']).default('canvas'),
  signatureDataUrl: z.string().optional(), // when canvas
  signedAt: z.string().optional(),
  signedIp: z.string().optional(),
  pdfStorageKey: z.string().optional(),
});

export type Party = z.infer<typeof PartySchema>;
export type Contract = z.infer<typeof ContractSchema>;

export type ContractFieldType = 'text' | 'number' | 'date' | 'currency' | 'boolean';

export type ContractTemplateField = {
  key: string;
  label: string;
  type: ContractFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  default?: string | number | boolean;
};

export type ContractTemplate = {
  id: string;
  title: string;
  description: string;
  /** Hebrew body with {{placeholders}}. */
  body: string;
  fields: ContractTemplateField[];
  defaultRenewalDays: number;
};
