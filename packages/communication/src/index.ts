// Public surface — only re-export what callers should depend on.
export * from './types';
export * from './IMessageSender';
export * from './UnifiedSender';

// Channels
export * from './email/SendGridProvider';
export * from './email/AwsSesProvider';
export * from './email/MockEmailProvider';
export * as EmailTemplates from './email/templates';
export * from './email/unsubscribe';

export * from './sms/Provider019';
export * from './sms/TwilioProvider';
export * from './sms/MockSmsProvider';
export * as SmsTemplates from './sms/templates';

export * from './whatsapp/MetaCloudProvider';
export * from './whatsapp/webhook';
export * as WhatsAppTemplates from './whatsapp/templates';

export * from './push/ExpoProvider';
export * from './push/FcmProvider';
export * from './push/ApnsProvider';
export * from './push/preferences';

// Webhooks
export * from './webhooks/sendgridEvents';
export * from './webhooks/twilioStatus';
export * from './webhooks/metaWhatsapp';

// Cross-cutting
export * from './consent/check';
export * from './consent/audit';
export * from './quiet-hours';
export * from './rate-limit';
export * from './cost-tracker';

// Queue
export * from './queue/sender-worker';
export * from './queue/scheduled-sender';
