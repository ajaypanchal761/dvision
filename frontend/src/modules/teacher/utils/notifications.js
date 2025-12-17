import { requestNotificationPermission, onMessageListener, registerServiceWorker } from '../config/firebase';
import { teacherAPI } from '../services/api';

/**
 * Initialize notifications for the app
 * This should be called when the app loads
 */
export const initializeNotifications = async () => {
  try {
    // Register service worker first
    await registerServiceWorker();

    // Request notification permission
    const token = await requestNotificationPermission();

    if (token) {
      // Save token to backend
      await saveFcmTokenToBackend(token);
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return null;
  }
};

/**
 * Save FCM token to backend
 */
export const saveFcmTokenToBackend = async (fcmToken) => {
  try {
    const token = localStorage.getItem('dvision_teacher_token');

    if (!token) {
      console.warn('User not logged in. FCM token will be saved after login.');
      // Store token temporarily to save after login
      localStorage.setItem('pending_fcm_token', fcmToken);
      return;
    }

    await teacherAPI.updateFcmToken(fcmToken, 'web');
    console.log('FCM token saved to backend');

    // Clear pending token if exists
    localStorage.removeItem('pending_fcm_token');
  } catch (error) {
    console.error('Error saving FCM token to backend:', error);
  }
};

/**
 * Save pending FCM token after login
 * Call this after successful login
 */
export const savePendingFcmToken = async () => {
  const pendingToken = localStorage.getItem('pending_fcm_token');

  if (pendingToken) {
    await saveFcmTokenToBackend(pendingToken);
  }
};

/**
 * Set up foreground message listener
 */
export const setupForegroundMessageListener = () => {
  onMessageListener()
    .then((payload) => {
      console.log('Foreground message received:', payload);

      // Show notification in foreground
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(payload.notification?.title || 'Dvision Academy', {
          body: payload.notification?.body || '',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: payload.data || {},
          tag: payload.data?.tag || 'default',
        });

        // Handle notification click
        notification.onclick = (event) => {
          event.preventDefault();
          const url = payload.data?.url || '/';
          window.open(url, '_blank');
          notification.close();
        };
      }
    })
    .catch((error) => {
      console.error('Error in foreground message listener:', error);
    });
};

/**
 * Check if notifications are supported
 */
export const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

/**
 * Check notification permission status
 */
export const getNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'not-supported';
  }
  return Notification.permission;
};
