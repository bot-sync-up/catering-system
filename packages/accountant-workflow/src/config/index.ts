/**
 * תצורת מצב הדיווח (auto / manual / hybrid)
 * נטענת מ-ENV וניתנת לעדכון רק על ידי "מנהל כללי" דרך פעולת RBAC.
 */
import { z } from 'zod';

export const TaxReportingMode = z.enum(['auto', 'manual', 'hybrid']);
export type TaxReportingMode = z.infer<typeof TaxReportingMode>;

export const AccountantConfigSchema = z.object({
  TAX_REPORTING_MODE: TaxReportingMode.default('manual'),
  ACCOUNTANT_EMAIL: z.string().email().optional(),
  ACCOUNTANT_PHONE: z.string().regex(/^\+?[0-9\-\s]{7,20}$/).optional(),
  ACCOUNTANT_NOTIFY_DAY_OF_MONTH: z.coerce.number().int().min(1).max(28).default(10),
  ACCOUNTANT_FILES_BASE_PATH: z.string().default('./var/accountant-files'),
  ACCOUNTANT_ARCHIVE_YEARS: z.coerce.number().int().min(1).max(20).default(7),
  ACCOUNTANT_TZ: z.string().default('Asia/Jerusalem'),
});

export type AccountantConfig = z.infer<typeof AccountantConfigSchema>;

export function loadAccountantConfig(env: NodeJS.ProcessEnv = process.env): AccountantConfig {
  return AccountantConfigSchema.parse({
    TAX_REPORTING_MODE: env.TAX_REPORTING_MODE,
    ACCOUNTANT_EMAIL: env.ACCOUNTANT_EMAIL,
    ACCOUNTANT_PHONE: env.ACCOUNTANT_PHONE,
    ACCOUNTANT_NOTIFY_DAY_OF_MONTH: env.ACCOUNTANT_NOTIFY_DAY_OF_MONTH,
    ACCOUNTANT_FILES_BASE_PATH: env.ACCOUNTANT_FILES_BASE_PATH,
    ACCOUNTANT_ARCHIVE_YEARS: env.ACCOUNTANT_ARCHIVE_YEARS,
    ACCOUNTANT_TZ: env.ACCOUNTANT_TZ,
  });
}

/**
 * זיכרון פנימי המאפשר לשנות את המצב בזמן ריצה (דרך RBAC + Audit).
 */
let currentConfig: AccountantConfig | null = null;

export function getConfig(): AccountantConfig {
  if (!currentConfig) {
    currentConfig = loadAccountantConfig();
  }
  return currentConfig;
}

export function setReportingMode(mode: TaxReportingMode): AccountantConfig {
  const cfg = getConfig();
  currentConfig = { ...cfg, TAX_REPORTING_MODE: mode };
  return currentConfig;
}

export function resetConfigForTesting(): void {
  currentConfig = null;
}
