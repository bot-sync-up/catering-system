// ===================================================================
// API: התראות ETA - SMS/WhatsApp
// ===================================================================
// זוהי שכבת אבסטרקציה. בפרודקשן אפשר לחבר ספק כמו Twilio / 019 / Vonage.
// כברירת מחדל המערכת רושמת ל-DB ומדפיסה ל-console (mock provider).
// ===================================================================
const express = require('express');
const db = require('../db');
const router = express.Router();

// ספק ברירת מחדל - mock (לא שולח בפועל)
async function mockSend(channel, phone, message) {
    console.log(`[${channel.toUpperCase()}] → ${phone}: ${message}`);
    return { providerId: `mock-${Date.now()}`, ok: true };
}

// hook לחיבור ספק חיצוני: process.env.SMS_PROVIDER_URL וכו'
async function realSend(channel, phone, message) {
    const url = process.env.SMS_PROVIDER_URL;
    if (!url) return mockSend(channel, phone, message);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SMS_PROVIDER_KEY || ''}`
            },
            body: JSON.stringify({ channel, to: phone, message })
        });
        const data = await response.json().catch(() => ({}));
        return { providerId: data.id || `ext-${Date.now()}`, ok: response.ok };
    } catch (err) {
        console.error('[ETA] שגיאת ספק:', err.message);
        return { providerId: null, ok: false, error: err.message };
    }
}

// בניית הודעת ETA בעברית
function buildEtaMessage(delivery, eta_at) {
    const etaDate = new Date(eta_at || delivery.eta_at || Date.now() + 30*60*1000);
    const hh = String(etaDate.getHours()).padStart(2, '0');
    const mm = String(etaDate.getMinutes()).padStart(2, '0');
    return `שלום ${delivery.customer_name}, המשלוח שלך (${delivery.tracking_no}) ` +
           `צפוי להגיע בסביבות ${hh}:${mm}. כתובת: ${delivery.dropoff_address}.`;
}

// ===================================================================
// POST /api/eta/notify - שליחת התראת ETA למשלוח
// body: { delivery_id, channel: 'sms'|'whatsapp', eta_at?, message? }
// ===================================================================
router.post('/notify', async (req, res) => {
    const { delivery_id, channel, eta_at, message } = req.body;
    if (!delivery_id) return res.status(400).json({ error: 'delivery_id חובה' });
    if (!['sms', 'whatsapp'].includes(channel))
        return res.status(400).json({ error: 'channel חייב להיות sms או whatsapp' });

    const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(delivery_id);
    if (!delivery) return res.status(404).json({ error: 'משלוח לא נמצא' });
    if (!delivery.customer_phone)
        return res.status(400).json({ error: 'אין טלפון לקוח' });

    const finalMessage = message || buildEtaMessage(delivery, eta_at);
    const phone = delivery.customer_phone;

    const sender = process.env.USE_REAL_PROVIDER === '1' ? realSend : mockSend;
    const { providerId, ok, error } = await sender(channel, phone, finalMessage);

    const result = db.prepare(`
        INSERT INTO eta_notifications (
            delivery_id, channel, phone, message, eta_at, sent_at, status, provider_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(delivery_id, channel, phone, finalMessage,
           eta_at || delivery.eta_at || null, Date.now(),
           ok ? 'sent' : 'failed', providerId);

    if (eta_at) {
        db.prepare('UPDATE deliveries SET eta_at = ? WHERE id = ?').run(eta_at, delivery_id);
    }

    res.json({
        id: result.lastInsertRowid,
        ok, providerId, error,
        message: finalMessage,
        phone
    });
});

// היסטוריית התראות למשלוח
router.get('/notifications/:delivery_id', (req, res) => {
    const rows = db.prepare(`
        SELECT * FROM eta_notifications WHERE delivery_id = ? ORDER BY sent_at DESC
    `).all(req.params.delivery_id);
    res.json(rows);
});

// ===================================================================
// קישורי deep link לניווט (Waze + Google Maps)
// ===================================================================
router.get('/nav-links/:delivery_id', (req, res) => {
    const d = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.delivery_id);
    if (!d) return res.status(404).json({ error: 'משלוח לא נמצא' });

    const dropoffEnc = encodeURIComponent(d.dropoff_address);
    const links = {
        waze:  d.dropoff_lat && d.dropoff_lng
                ? `https://waze.com/ul?ll=${d.dropoff_lat},${d.dropoff_lng}&navigate=yes`
                : `https://waze.com/ul?q=${dropoffEnc}&navigate=yes`,
        gmaps: d.dropoff_lat && d.dropoff_lng
                ? `https://www.google.com/maps/dir/?api=1&destination=${d.dropoff_lat},${d.dropoff_lng}`
                : `https://www.google.com/maps/dir/?api=1&destination=${dropoffEnc}`
    };
    res.json(links);
});

module.exports = router;
