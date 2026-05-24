// API: תכנון מסלולים
'use strict';

const express = require('express');
const db = require('../db/schema');
const { planRouteNearestNeighbor, buildWazeLink, buildGoogleMapsLink } = require('../services/geo');

const router = express.Router();

/**
 * תכנון מסלול לנהג - מקבל delivery_ids, מחזיר סדר אופטימלי
 */
router.post('/plan', (req, res) => {
  const { driver_id, start_lat, start_lng, delivery_ids } = req.body;
  if (!delivery_ids || !Array.isArray(delivery_ids) || delivery_ids.length === 0) {
    return res.status(400).json({ ok: false, error: 'delivery_ids חובה (מערך)' });
  }

  let start = { lat: start_lat, lng: start_lng };
  if (start.lat == null && driver_id) {
    const driver = db.prepare(`
      SELECT v.current_lat, v.current_lng FROM drivers d
      LEFT JOIN vehicles v ON d.current_vehicle_id = v.id
      WHERE d.id = ?
    `).get(driver_id);
    if (driver && driver.current_lat != null) {
      start = { lat: driver.current_lat, lng: driver.current_lng };
    }
  }
  if (start.lat == null) {
    return res.status(400).json({ ok: false, error: 'נקודת התחלה לא ידועה' });
  }

  const placeholders = delivery_ids.map(() => '?').join(',');
  const stops = db.prepare(`
    SELECT id, order_number, customer_name, delivery_address, delivery_lat as lat, delivery_lng as lng
    FROM deliveries WHERE id IN (${placeholders}) AND delivery_lat IS NOT NULL
  `).all(...delivery_ids);

  if (stops.length === 0) {
    return res.status(400).json({ ok: false, error: 'אין יעדים תקינים עם קואורדינטות' });
  }

  const route = planRouteNearestNeighbor(start, stops);

  // הוסף קישורי ניווט לכל עצירה
  route.stops = route.stops.map(s => ({
    ...s,
    waze: buildWazeLink(s.lat, s.lng),
    google_maps: buildGoogleMapsLink(s.lat, s.lng),
  }));

  res.json({ ok: true, data: route });
});

module.exports = router;
