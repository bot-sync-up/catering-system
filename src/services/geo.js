// פונקציות גיאוגרפיות - מרחקים, ETA, גיאופנסינג, ניווט
'use strict';

const EARTH_RADIUS_KM = 6371;

/**
 * חישוב מרחק בין שתי נקודות בק"מ - נוסחת Haversine
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * חישוב ETA פשוט לפי מרחק ומהירות ממוצעת
 * @param {number} distanceKm
 * @param {number} avgSpeedKmh - מהירות ממוצעת (40 בעיר, 80 בין-עירוני)
 * @returns {Date}
 */
function estimateETA(distanceKm, avgSpeedKmh = 40) {
  const hoursNeeded = distanceKm / avgSpeedKmh;
  const ms = hoursNeeded * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

/**
 * בדיקה אם נקודה נמצאת בתוך גיאופנסינג עיגולי
 */
function isInsideCircle(lat, lng, centerLat, centerLng, radiusMeters) {
  const distKm = haversineKm(lat, lng, centerLat, centerLng);
  return distKm * 1000 <= radiusMeters;
}

/**
 * בדיקה אם נקודה נמצאת בתוך פוליגון - אלגוריתם ray-casting
 */
function isInsidePolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * בניית קישור Waze לניווט
 */
function buildWazeLink(lat, lng) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/**
 * בניית קישור Google Maps לניווט
 */
function buildGoogleMapsLink(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

/**
 * תכנון מסלול בסיסי - Nearest Neighbor
 * מקבל נקודת התחלה ורשימת נקודות לחלוקה, מחזיר סדר אופטימלי
 */
function planRouteNearestNeighbor(start, stops) {
  if (!stops || stops.length === 0) return [];
  const remaining = [...stops];
  const route = [];
  let current = start;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const next = remaining.splice(nearestIdx, 1)[0];
    route.push({ ...next, distance_from_prev_km: nearestDist });
    current = next;
  }

  const totalKm = route.reduce((sum, s) => sum + s.distance_from_prev_km, 0);
  return { stops: route, total_distance_km: totalKm };
}

module.exports = {
  haversineKm,
  estimateETA,
  isInsideCircle,
  isInsidePolygon,
  buildWazeLink,
  buildGoogleMapsLink,
  planRouteNearestNeighbor,
};
