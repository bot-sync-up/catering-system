import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { localNotify } from './notifications';
import type { Geofence } from '../types';

export const GEOFENCE_TASK = 'fieldops-geofence-task';

let registered = false;

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('geofence task error', error);
    return;
  }
  const { eventType, region } = (data as any) ?? {};
  if (eventType === Location.GeofencingEventType.Enter) {
    await localNotify('כניסה לאזור', `${region?.identifier ?? ''}`, 'geofence');
  } else if (eventType === Location.GeofencingEventType.Exit) {
    await localNotify('יציאה מהאזור', `${region?.identifier ?? ''}`, 'geofence');
  }
});

export async function initGeofencing() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return;
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return;
  registered = true;
}

export async function setGeofences(fences: Geofence[]) {
  if (!registered) await initGeofencing();
  const has = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(
    () => false,
  );
  if (has) await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});
  if (!fences.length) return;
  await Location.startGeofencingAsync(
    GEOFENCE_TASK,
    fences.map((f) => ({
      identifier: f.id,
      latitude: f.latitude,
      longitude: f.longitude,
      radius: f.radius,
      notifyOnEnter: true,
      notifyOnExit: true,
    })),
  );
}

export async function getCurrentLocation() {
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
}

/** Naive ETA = distance / avg speed (km/h). */
export function estimateEtaMinutes(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  avgKph = 35,
): number {
  const km = haversineKm(fromLat, fromLng, toLat, toLng);
  return Math.max(1, Math.round((km / avgKph) * 60));
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
