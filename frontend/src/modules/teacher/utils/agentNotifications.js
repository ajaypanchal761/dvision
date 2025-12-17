import { requestNotificationPermission, onMessageListener, registerServiceWorker } from '../config/firebase';
import { agentAPI } from '../services/api';

// Local storage keys for agent
const TOKEN_KEY = 'dvision_agent_token'; // agent-specific token
const PENDING_KEY = 'pending_agent_fcm_token';

/**
 * Initialize notifications for agent web
 * Call after app load or post-login
 */
export const initializeAgentNotifications = async () => {
  try {
    await registerServiceWorker();
    const token = await requestNotificationPermission();
    if (token) {
      await saveAgentFcmTokenToBackend(token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error initializing agent notifications:', error);
    return null;
  }
};

/**
 * Save FCM token to backend with platform 'web'
 */
export const saveAgentFcmTokenToBackend = async (fcmToken) => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      console.warn('Agent not logged in. FCM token will be saved after login.');
      localStorage.setItem(PENDING_KEY, fcmToken);
      return;
    }

    if (!fcmToken) {
      console.warn('No FCM token provided for agent');
      return;
    }

    await agentAPI.updateFcmToken(fcmToken, 'web');
    console.log('Agent FCM token saved to backend');
    localStorage.removeItem(PENDING_KEY);
  } catch (error) {
    console.error('Error saving agent FCM token to backend:', error);
  }
};

/**
 * Save pending FCM token after login
 */
export const savePendingAgentFcmToken = async () => {
  const pendingToken = localStorage.getItem(PENDING_KEY);
  if (pendingToken) {
    await saveAgentFcmTokenToBackend(pendingToken);
  }
};

/**
 * Foreground message listener for agent
 */
export const setupAgentForegroundMessageListener = () => {
  onMessageListener()
    .then((payload) => {
      console.log('Agent foreground message received:', payload);
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(payload.notification?.title || 'Dvision Academy', {
          body: payload.notification?.body || '',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: payload.data || {},
          tag: payload.data?.tag || 'default',
        });
        notification.onclick = (event) => {
          event.preventDefault();
          const url = payload.data?.url || '/';
          window.open(url, '_blank');
          notification.close();
        };
      }
    })
    .catch((error) => {
      console.error('Error in agent foreground message listener:', error);
    });
};

export const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

export const getNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'not-supported';
  }
  return Notification.permission;
};

