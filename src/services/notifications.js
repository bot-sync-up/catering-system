// שליחת SMS/WhatsApp - מנוע שליחה מופשט, ניתן לחיבור לספקים אמיתיים
'use strict';

/**
 * הקטע הזה משתמש ב-stub. בפרודקשן תחבר לספקים כמו:
 * - SMS: Twilio, Inforu, Cellact
 * - WhatsApp: Twilio Business API, 360dialog, Meta Cloud API
 *
 * התשתית מוכנה - רק תוסיף API keys בקובץ .env
 */

const SMS_PROVIDER = process.env.SMS_PROVIDER || 'stub';
const WHATSAPP_PROVIDER = process.env.WHATSAPP_PROVIDER || 'stub';

function normalizeIsraeliPhone(phone) {
  if (!phone) return null;
  let p = String(phone).replace(/[\s\-()]/g, '');
  if (p.startsWith('0')) p = '+972' + p.substring(1);
  else if (p.startsWith('972')) p = '+' + p;
  else if (!p.startsWith('+')) p = '+972' + p;
  return p;
}

async function sendSMS(phone, message) {
  const normalized = normalizeIsraeliPhone(phone);
  if (SMS_PROVIDER === 'stub') {
    console.log(`[SMS-STUB] -> ${normalized}: ${message}`);
    return { success: true, provider: 'stub', to: normalized };
  }
  // TODO: חיבור לספק SMS אמיתי
  return { success: false, error: 'provider not configured' };
}

async function sendWhatsApp(phone, message) {
  const normalized = normalizeIsraeliPhone(phone);
  if (WHATSAPP_PROVIDER === 'stub') {
    console.log(`[WhatsApp-STUB] -> ${normalized}: ${message}`);
    return { success: true, provider: 'stub', to: normalized };
  }
  // TODO: חיבור לספק WhatsApp אמיתי
  return { success: false, error: 'provider not configured' };
}

/**
 * שליחת הודעת ETA מובנית ללקוח
 */
async function sendETANotification(delivery, eta, channel = 'sms') {
  const etaDate = new Date(eta);
  const timeStr = etaDate.toLocaleString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
  });

  const message =
    `שלום ${delivery.customer_name},\n` +
    `המשלוח שלך (הזמנה ${delivery.order_number}) בדרך אליך.\n` +
    `זמן הגעה משוער: ${timeStr}\n` +
    `כתובת: ${delivery.delivery_address}\n` +
    `תודה על הסבלנות!`;

  if (channel === 'whatsapp') {
    return sendWhatsApp(delivery.customer_phone, message);
  }
  return sendSMS(delivery.customer_phone, message);
}

/**
 * הודעה עם הגעת השליח (סטטוס arrived)
 */
async function sendArrivalNotification(delivery, channel = 'sms') {
  const message =
    `${delivery.customer_name}, השליח הגיע לכתובת!\n` +
    `הזמנה: ${delivery.order_number}\n` +
    `אנא היו זמינים לקבלת המשלוח.`;
  if (channel === 'whatsapp') return sendWhatsApp(delivery.customer_phone, message);
  return sendSMS(delivery.customer_phone, message);
}

/**
 * הודעת אישור מסירה
 */
async function sendDeliveredNotification(delivery, channel = 'sms') {
  const message =
    `המשלוח שלך (${delivery.order_number}) נמסר בהצלחה.\n` +
    `תודה שבחרת בנו!`;
  if (channel === 'whatsapp') return sendWhatsApp(delivery.customer_phone, message);
  return sendSMS(delivery.customer_phone, message);
}

module.exports = {
  sendSMS,
  sendWhatsApp,
  sendETANotification,
  sendArrivalNotification,
  sendDeliveredNotification,
  normalizeIsraeliPhone,
};
