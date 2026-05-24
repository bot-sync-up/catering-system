// מנוע גיאופנסינג - בודק כל עדכון מיקום מול אזורים פעילים
'use strict';

const db = require('../db/schema');
const { isInsideCircle, isInsidePolygon } = require('./geo');

// state פנימי - שומר אם רכב/נהג נמצא כרגע בפנים אזור (כדי לזהות enter/exit)
const presenceState = new Map(); // key: `${entityId}:${geofenceId}` -> boolean

/**
 * הוק לבדיקת גיאופנסינג כאשר מתקבל עדכון מיקום
 * @param {object} ctx - הקונטקסט: { entity_type, entity_id, delivery_id, lat, lng }
 * @returns {Array} - אירועים שנוצרו (enter/exit)
 */
function checkGeofences(ctx) {
  const { entity_id, delivery_id, lat, lng } = ctx;
  if (lat == null || lng == null) return [];

  const fences = db.prepare('SELECT * FROM geofences WHERE active = 1').all();
  const events = [];

  for (const fence of fences) {
    let inside = false;
    if (fence.type === 'circle') {
      inside = isInsideCircle(lat, lng, fence.center_lat, fence.center_lng, fence.radius_meters);
    } else if (fence.type === 'polygon') {
      try {
        const polygon = JSON.parse(fence.polygon_json);
        inside = isInsidePolygon(lat, lng, polygon);
      } catch (e) { continue; }
    }

    const key = `${entity_id}:${fence.id}`;
    const wasInside = presenceState.get(key) || false;
    presenceState.set(key, inside);

    let eventType = null;
    if (!wasInside && inside) eventType = 'geofence_enter';
    else if (wasInside && !inside) eventType = 'geofence_exit';

    if (eventType && (fence.trigger_event === 'both' || fence.trigger_event === eventType.replace('geofence_', ''))) {
      const event = {
        geofence_id: fence.id,
        geofence_name: fence.name,
        event_type: eventType,
        lat, lng,
        timestamp: new Date().toISOString(),
      };
      events.push(event);

      // לוג ב-tracking_events
      if (delivery_id) {
        db.prepare(`
          INSERT INTO tracking_events (delivery_id, event_type, lat, lng, metadata)
          VALUES (?, ?, ?, ?, ?)
        `).run(delivery_id, eventType, lat, lng, JSON.stringify({
          geofence_id: fence.id,
          geofence_name: fence.name,
        }));
      }

      // קריאת webhook אם הוגדר
      if (fence.webhook_url) {
        fireWebhook(fence.webhook_url, event).catch(err => {
          console.error('[geofence webhook fail]', err.message);
        });
      }
    }
  }

  return events;
}

async function fireWebhook(url, payload) {
  try {
    if (typeof fetch === 'undefined') return;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // נכשל בשקט
  }
}

module.exports = { checkGeofences };
