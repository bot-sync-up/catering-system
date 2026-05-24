// Notification adapters: Email (SMTP), SMS + WhatsApp (Twilio).
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { config } from '../lib/config.js';

let mailer: nodemailer.Transporter | null = null;
function getMailer() {
  if (mailer) return mailer;
  mailer = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return mailer;
}

let twi: ReturnType<typeof twilio> | null = null;
function getTwilio() {
  if (twi) return twi;
  if (!config.twilio.sid || !config.twilio.token) {
    throw new Error('Twilio credentials missing');
  }
  twi = twilio(config.twilio.sid, config.twilio.token);
  return twi;
}

export async function sendEmail(to: string, subject: string, html: string, attachments?: any[]) {
  const m = getMailer();
  return m.sendMail({ from: config.smtp.from, to, subject, html, attachments });
}

export async function sendSms(toPhone: string, body: string) {
  return getTwilio().messages.create({
    from: config.twilio.smsFrom,
    to: toPhone,
    body,
  });
}

export async function sendWhatsApp(toPhone: string, body: string) {
  const to = toPhone.startsWith('whatsapp:') ? toPhone : `whatsapp:${toPhone}`;
  return getTwilio().messages.create({
    from: config.twilio.waFrom,
    to,
    body,
  });
}
