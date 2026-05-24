// אלגוריתם שיבוץ נהג למשלוח - לוקח בחשבון מרחק, זמינות, דירוג, סוג נהג
'use strict';

const db = require('../db/schema');
const { haversineKm } = require('./geo');

/**
 * מציאת הנהג הטוב ביותר למשלוח לפי קריטריונים
 * @param {string} deliveryId
 * @param {object} options - { prefer_internal, max_distance_km }
 */
function findBestDriver(deliveryId, options = {}) {
  const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(deliveryId);
  if (!delivery) throw new Error('משלוח לא נמצא');

  const { prefer_internal = true, max_distance_km = 50 } = options;

  // שלוף נהגים פעילים זמינים
  const drivers = db.prepare(`
    SELECT d.*, v.current_lat as v_lat, v.current_lng as v_lng, v.capacity_kg
    FROM drivers d
    LEFT JOIN vehicles v ON d.current_vehicle_id = v.id
    WHERE d.status = 'active'
  `).all();

  const candidates = [];
  for (const driver of drivers) {
    // חייב רכב משוייך
    if (!driver.current_vehicle_id || driver.v_lat == null) continue;

    // קיבולת מספיקה
    if (driver.capacity_kg && delivery.weight_kg > driver.capacity_kg) continue;

    // מרחק מנקודת האיסוף
    let distanceKm = 0;
    if (delivery.pickup_lat != null && delivery.pickup_lng != null) {
      distanceKm = haversineKm(driver.v_lat, driver.v_lng, delivery.pickup_lat, delivery.pickup_lng);
      if (distanceKm > max_distance_km) continue;
    }

    // ספירת משלוחים פעילים על הנהג
    const activeCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM deliveries
      WHERE driver_id = ? AND status IN ('assigned','en_route','arrived')
    `).get(driver.id).cnt;

    // ניקוד: מרחק קצר + דירוג גבוה + מעט משלוחים פעילים = ציון גבוה
    let score = 100;
    score -= distanceKm * 2;             // כל ק"מ מוריד 2 נק'
    score += (driver.rating || 5) * 5;   // עד 25 בונוס דירוג
    score -= activeCount * 10;           // כל משלוח פעיל מוריד 10
    if (prefer_internal && driver.driver_type === 'internal') score += 15;

    candidates.push({
      driver_id: driver.id,
      driver_name: driver.full_name,
      driver_type: driver.driver_type,
      distance_km: Math.round(distanceKm * 10) / 10,
      active_deliveries: activeCount,
      rating: driver.rating,
      score: Math.round(score * 10) / 10,
      vehicle_id: driver.current_vehicle_id,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/**
 * שיבוץ נהג בפועל למשלוח (מעדכן DB)
 */
function assignDriver(deliveryId, driverId, vehicleId = null) {
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driverId);
  if (!driver) throw new Error('נהג לא נמצא');
  if (driver.status !== 'active') throw new Error('הנהג אינו פעיל');

  const finalVehicleId = vehicleId || driver.current_vehicle_id;

  db.prepare(`
    UPDATE deliveries
    SET driver_id = ?, vehicle_id = ?, status = 'assigned',
        assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(driverId, finalVehicleId, deliveryId);

  db.prepare(`
    INSERT INTO tracking_events (delivery_id, event_type, status, metadata)
    VALUES (?, 'status_change', 'assigned', ?)
  `).run(deliveryId, JSON.stringify({ driver_id: driverId, vehicle_id: finalVehicleId }));

  return db.prepare('SELECT * FROM deliveries WHERE id = ?').get(deliveryId);
}

module.exports = { findBestDriver, assignDriver };
