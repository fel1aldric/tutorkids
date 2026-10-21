import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { api } from './api';

export const registerForPushNotifications = async (projectId = 'tutorkids') => {
  try {
    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    if (token) {
      await api('/parents/push-token', {
        method: 'POST',
        body: { push_token: token, push_provider: 'expo' },
      });
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return token;
  } catch (err) {
    console.error('Failed to register push token:', err);
    return null;
  }
};

export const addNotificationListeners = ({ onFamilyMessage, onNotificationOpen }) => {
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data || {};
    if (data.type === 'family_message') {
      onFamilyMessage?.(data);
    }
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data || {};
    if (data.type === 'family_message') {
      onNotificationOpen?.(data);
    }
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
};
