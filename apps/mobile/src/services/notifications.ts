import * as Notifications from 'expo-notifications';
import * as Device from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';
import { isWithinDnd } from '../utils/dnd';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const muted = isWithinDnd(new Date());
    return {
      shouldShowAlert: !muted,
      shouldPlaySound: !muted,
      shouldSetBadge: true,
      shouldShowBanner: !muted,
      shouldShowList: !muted,
    };
  },
});

export async function initNotifications() {
  const perm = await Notifications.getPermissionsAsync();
  let status = perm.status;
  if (status !== 'granted') {
    const r = await Notifications.requestPermissionsAsync();
    status = r.status;
  }
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Orders',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Payments',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync('geofence', {
      name: 'Geofence',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('shifts', {
      name: 'Shifts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Tasks',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync('leads', {
      name: 'Leads',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  try {
    const token = await Notifications.getDevicePushTokenAsync(); // FCM on Android
    await api.post('/devices/register', {
      token: token.data,
      platform: Platform.OS,
      app: 'mobile',
      device: Device.default?.deviceName ?? 'unknown',
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('FCM register failed', e);
  }
}

export async function localNotify(
  title: string,
  body: string,
  channelId = 'default',
) {
  if (isWithinDnd(new Date())) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { channelId } },
    trigger: null,
  });
}
