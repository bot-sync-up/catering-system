// Service ליצירה/תזמון התראות תוקפים
// משולב עם BullMQ: schedulerQueue יוצר עבודות לבדיקה יומית,
// וכאן אנו יוצרים את רשומות ה-Alert בבסיס הנתונים.

import { prisma } from '../db.js';
import { DOC_TYPE_HE, ALERT_LEVEL_HE, formatDateHe } from '../utils/hebrew.js';

const LEVELS = [
  { key: 'D60', days: 60 },
  { key: 'D30', days: 30 },
  { key: 'D7', days: 7 },
];

/**
 * יוצר/מעדכן רשומות Alert עבור מסמך לפי הרמות 60/30/7 ימים
 */
export async function scheduleAlertsForDocument(doc) {
  if (!doc?.expiry) return;
  // ננקה התראות לא-נשלחות ישנות עבור המסמך
  await prisma.alert.deleteMany({ where: { documentId: doc.id, sent: false } });

  const expiry = new Date(doc.expiry);
  const docTypeHe = DOC_TYPE_HE[doc.type] || doc.type;
  const veh = await prisma.vehicle.findUnique({ where: { id: doc.vehicleId } });
  const plateLabel = veh ? `${veh.plate} (${veh.make} ${veh.model})` : '';

  const now = new Date();
  for (const lvl of LEVELS) {
    const fireAt = new Date(expiry);
    fireAt.setDate(fireAt.getDate() - lvl.days);
    if (fireAt < now) continue; // אל תיצור בעבר
    await prisma.alert.create({
      data: {
        vehicleId: doc.vehicleId,
        documentId: doc.id,
        level: lvl.key,
        fireAt,
        message: `${plateLabel} — ${docTypeHe} ${ALERT_LEVEL_HE[lvl.key]} (תפוגה: ${formatDateHe(expiry)})`,
      },
    });
  }
  // אם כבר פג
  if (expiry < now) {
    await prisma.alert.create({
      data: {
        vehicleId: doc.vehicleId,
        documentId: doc.id,
        level: 'EXPIRED',
        fireAt: now,
        message: `${plateLabel} — ${docTypeHe} ${ALERT_LEVEL_HE.EXPIRED} (תפוגה: ${formatDateHe(expiry)})`,
      },
    });
  }
}

/**
 * סורק את כל המסמכים — נקרא ע"י ה-scheduler יומית.
 * מסמן Alerts ש"בשלים" כ-sent=true (כלומר ניתן להציגם בעמוד התראות).
 */
export async function processDueAlerts() {
  const now = new Date();
  const due = await prisma.alert.findMany({
    where: { sent: false, fireAt: { lte: now } },
    take: 1000,
  });
  for (const a of due) {
    await prisma.alert.update({
      where: { id: a.id },
      data: { sent: true, sentAt: now },
    });
    // כאן ניתן להוסיף שליחת SMS/Email/Push
  }
  return due.length;
}

/**
 * רענון מלא — בודק כל מסמך וודא שיש לו את 3 רמות ההתראה
 */
export async function refreshAllDocumentAlerts() {
  const docs = await prisma.vehicleDocument.findMany();
  let n = 0;
  for (const d of docs) {
    await scheduleAlertsForDocument(d);
    n++;
  }
  return n;
}
