import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkanF8TuSNJWYZFHWd4zjlhJrr_N-_878",
  authDomain: "dvision-academy.firebaseapp.com",
  projectId: "dvision-academy",
  storageBucket: "dvision-academy.firebasestorage.app",
  messagingSenderId: "195388337660",
  appId: "1:195388337660:web:67f24b5c689a05755d5679"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get FCM messaging instance
let messaging = null;

// VAPID key for web push
const vapidKey = "BBM4rFMYzjANGeXwTEb7pAracML52yB8_63VC9TWy5Lq2P6waPNMCg7zY5WQIg198iXnat6HOx-mSKdjjXkae1A";

// Initialize messaging (only in browser)
const getMessagingInstance = () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    if (!messaging) {
      try {
        messaging = getMessaging(app);
      } catch (error) {
        console.error('Error initializing Firebase Messaging:', error);
      }
    }
    return messaging;
  }
  return null;
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Get messaging instance
      const messagingInstance = getMessagingInstance();
      
      if (!messagingInstance) {
        console.warn('Firebase Messaging not available');
        return null;
      }

      // Get FCM token
      try {
        const token = await getToken(messagingInstance, { vapidKey });
        
        if (token) {
          console.log('FCM Token:', token);
          return token;
        } else {
          console.warn('No FCM token available');
          return null;
        }
      } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
      }
    } else {
      console.warn('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () => {
  return new Promise((resolve) => {
    const messagingInstance = getMessagingInstance();
    
    if (messagingInstance) {
      onMessage(messagingInstance, (payload) => {
        console.log('Message received in foreground:', payload);
        resolve(payload);
      });
    }
  });
};

// Register service worker for background notifications
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

export default app;
export { getMessagingInstance };

