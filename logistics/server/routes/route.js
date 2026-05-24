// ===================================================================
// API: תכנון מסלול בסיסי (route planner)
// אלגוריתם פשוט: nearest-neighbor החל מנקודת מוצא, על משלוחים פתוחים.
// ===================================================================
const express = require('express');
const db = require('../db');
const router = express.Router();

function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng/2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

// ===================================================================
// POST /api/route/plan
// body: {
//   start_lat, start_lng,                       // נקודת מוצא (לרוב מחסן)
//   delivery_ids?: [string],                    // משלוחים מסוימים
//   driver_id?: string                          // או כל המשלוחים של נהג שלא נמסרו
// }
// ===================================================================
router.post('/plan', (req, res) => {
    const { start_lat, start_lng, delivery_ids, driver_id } = req.body;
    if (start_lat == null || start_lng == null)
        return res.status(400).json({ error: 'start_lat, start_lng חובה' });

    let deliveries;
    if (Array.isArray(delivery_ids) && delivery_ids.length) {
        const placeholders = delivery_ids.map(() => '?').join(',');
        deliveries = db.prepare(`
            SELECT * FROM deliveries
             WHERE id IN (${placeholders})
               AND dropoff_lat IS NOT NULL
               AND dropoff_lng IS NOT NULL
        `).all(...delivery_ids);
    } else if (driver_id) {
        deliveries = db.prepare(`
            SELECT * FROM deliveries
             WHERE driver_id = ?
               AND status IN ('assigned', 'en_route')
               AND dropoff_lat IS NOT NULL
               AND dropoff_lng IS NOT NULL
        `).all(driver_id);
    } else {
        return res.status(400).json({ error: 'delivery_ids או driver_id חובה' });
    }

    if (!deliveries.length)
        return res.json({ stops: [], total_km: 0, message: 'אין משלוחים עם נ"צ' });

    // Nearest-Neighbor
    const stops = [];
    const remaining = [...deliveries];
    let curLat = start_lat;
    let curLng = start_lng;
    let totalKm = 0;

    while (remaining.length) {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
            const d = haversine(curLat, curLng, remaining[i].dropoff_lat, remaining[i].dropoff_lng);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        const next = remaining.splice(bestIdx, 1)[0];
        stops.push({
            delivery_id: next.id,
            tracking_no: next.tracking_no,
            customer_name: next.customer_name,
            dropoff_address: next.dropoff_address,
            lat: next.dropoff_lat,
            lng: next.dropoff_lng,
            leg_km: Math.round(bestDist * 100) / 100
        });
        totalKm += bestDist;
        curLat = next.dropoff_lat;
        curLng = next.dropoff_lng;
    }

    // קישור Google Maps לכל המסלול
    const waypointsStr = stops.map(s => `${s.lat},${s.lng}`).join('|');
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${start_lat},${start_lng}` +
                     `&destination=${stops[stops.length-1].lat},${stops[stops.length-1].lng}` +
                     (stops.length > 1
                        ? `&waypoints=${stops.slice(0, -1).map(s => `${s.lat},${s.lng}`).join('|')}`
                        : '');

    res.json({
        start: { lat: start_lat, lng: start_lng },
        stops,
        total_km: Math.round(totalKm * 100) / 100,
        gmaps_url: gmapsUrl
    });
});

module.exports = router;
