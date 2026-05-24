/**
 * Hebrew RTL email templates.
 *
 * Each template exports:
 *   - `id`         logical id used by callers
 *   - `subject`    handlebars-compatible subject template
 *   - `mjml`       MJML source (compiled to HTML at boot — see `compile()`)
 *   - `text`       plain-text fallback
 *   - `vars`       declared merge fields (used for validation + docs)
 *
 * MJML is compiled once at startup and the resulting HTML is cached.
 * Handlebars then fills in the merge fields at send time.
 */

import Handlebars from 'handlebars';
import mjml2html from 'mjml';
import { welcomeTemplate } from './welcome';
import { orderConfirmationTemplate } from './orderConfirmation';
import { paymentReceiptTemplate } from './paymentReceipt';
import { eventReminderTemplate } from './eventReminder';
import { birthdayWishTemplate } from './birthdayWish';
import { npsRequestTemplate } from './npsRequest';
import { monthInvoiceTemplate } from './monthInvoice';
import { deliveryEtaTemplate } from './deliveryEta';

export interface EmailTemplate {
  id: string;
  subject: string;
  mjml: string;
  text: string;
  vars: string[];
}

export const TEMPLATES: Record<string, EmailTemplate> = {
  welcome: welcomeTemplate,
  orderConfirmation: orderConfirmationTemplate,
  paymentReceipt: paymentReceiptTemplate,
  eventReminder: eventReminderTemplate,
  birthdayWish: birthdayWishTemplate,
  npsRequest: npsRequestTemplate,
  monthInvoice: monthInvoiceTemplate,
  deliveryEta: deliveryEtaTemplate,
};

interface CompiledTemplate {
  subject: HandlebarsTemplateDelegate<Record<string, unknown>>;
  html: HandlebarsTemplateDelegate<Record<string, unknown>>;
  text: HandlebarsTemplateDelegate<Record<string, unknown>>;
}

const compiledCache = new Map<string, CompiledTemplate>();

export function compile(id: string): CompiledTemplate {
  const cached = compiledCache.get(id);
  if (cached) return cached;
  const tpl = TEMPLATES[id];
  if (!tpl) throw new Error(`Unknown email template: ${id}`);
  const { html, errors } = mjml2html(tpl.mjml, { minify: true, validationLevel: 'soft' });
  if (errors.length > 0) {
    // Non-fatal — MJML reports lots of "tip" warnings; only throw on hard errors.
    const fatal = errors.filter((e) => e.formattedMessage?.includes('Error:'));
    if (fatal.length) throw new Error(`MJML compile failed for ${id}: ${fatal[0].message}`);
  }
  const compiled: CompiledTemplate = {
    subject: Handlebars.compile(tpl.subject, { noEscape: false }),
    html: Handlebars.compile(html, { noEscape: false }),
    text: Handlebars.compile(tpl.text, { noEscape: true }),
  };
  compiledCache.set(id, compiled);
  return compiled;
}

export function render(id: string, data: Record<string, unknown>): { subject: string; html: string; text: string } {
  const c = compile(id);
  return {
    subject: c.subject(data),
    html: c.html(data),
    text: c.text(data),
  };
}
