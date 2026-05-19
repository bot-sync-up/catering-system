/**
 * Re-export the WhatsApp webhook handler under the conventional path so
 * router setup looks symmetric across channels:
 *
 *   /webhooks/sendgrid     -> SendGridEventReceiver
 *   /webhooks/twilio       -> TwilioStatusReceiver
 *   /webhooks/whatsapp     -> MetaWhatsAppReceiver
 */
export { WhatsAppWebhook as MetaWhatsAppReceiver } from '../whatsapp/webhook';
export type {
  InboundWhatsAppMessage,
  WhatsAppStatusUpdate,
  WhatsAppWebhookConfig,
  WhatsAppWebhookHandlers,
} from '../whatsapp/webhook';
