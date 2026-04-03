import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getApiBaseUrl} from '../utils/apiBaseUrl';

// Dynamically import messaging to avoid errors if Firebase isn't properly linked
let messaging = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (error) {
  console.warn('Firebase Messaging not available:', error.message);
}

/**
 * Remote Push Notification Service
 * Handles Firebase Cloud Messaging (FCM) integration with Notifee
 */
class RemotePushService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Ensure notification channels are created
   */
  async ensureChannel() {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'general',
        name: 'General Notifications',
        description: 'General app notifications from server',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      await notifee.createChannel({
        id: 'daily-verse',
        name: 'Daily Verse',
        description: 'Daily devotional verse notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });
    }
  }

  /**
   * Request push notification permissions
   */
  async requestPushPermission() {
    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return false;
    }
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version < 33) {
          return true;
        }

        const hasAndroidPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (hasAndroidPermission) {
          return true;
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log('Android POST_NOTIFICATIONS permission:', granted);
        return isGranted;
      }

      // Check existing permission first to avoid unnecessary iOS prompts.
      const currentStatus = await messaging().hasPermission();
      const isAlreadyEnabled =
        currentStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        currentStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (isAlreadyEnabled) {
        console.log('Push permission status:', currentStatus);
        return true;
      }

      // If denied, do not keep requesting. User can enable from Settings.
      if (currentStatus === messaging.AuthorizationStatus.DENIED) {
        console.log('Push permission status:', currentStatus);
        return false;
      }

      // Request permission when not determined / ephemeral states.
      const requestedStatus = await messaging().requestPermission();
      const enabled =
        requestedStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        requestedStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('Push permission status:', requestedStatus);
      return enabled;
    } catch (error) {
      console.error('Error requesting push permission:', error);
      return false;
    }
  }

  /**
   * Get FCM token for this device
   */
  async getFcmToken() {
    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return null;
    }
    try {
      const enabled = await this.requestPushPermission();
      if (!enabled) {
        console.log('Push notifications not authorized');
        return null;
      }

      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      
      // TODO: Send this token to your backend or save to Firestore
      // Example: await this.saveTokenToBackend(token);
      
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Save FCM token to backend
   */
  async saveTokenToBackend(token) {
    try {
      // Use the same backend URL resolver as the main API layer
      const baseUrl = await getApiBaseUrl();
      const serverUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // Get auth token if user is logged in
      let authToken = '';
      try {
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          const user = JSON.parse(userString);
          authToken = user?.token || '';
        }
      } catch (e) {
        // Continue without auth token if not available
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`${serverUrl}/users/fcm-token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Token registered with server:', result.message || 'Success');
        return true;
      } else {
        const errorText = await response.text();
        console.warn(
          'Failed to register token with server:',
          response.status,
          errorText,
        );
        return false;
      }
    } catch (error) {
      console.error('Error saving token to backend:', error);
      return false;
    }
  }

  /**
   * Register foreground message handler
   */
  registerForegroundHandler() {
    if (!messaging) {
      console.warn('Firebase Messaging not available, skipping foreground handler');
      return;
    }
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground message received:', remoteMessage);
      
      await this.ensureChannel();
      
      const { notification, data } = remoteMessage || {};
      
      // Determine channel based on message type
      const channelId = data?.type === 'daily-verse' ? 'daily-verse' : 'general';
      
      await notifee.displayNotification({
        title: notification?.title || data?.title || 'EzraApp',
        body: notification?.body || data?.body || '',
        android: {
          channelId,
          pressAction: {
            id: 'default',
          },
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        },
        data: data || {},
      });
    });
  }

  /**
   * Handle background messages (called from index.js)
   */
  async handleBackgroundMessage(remoteMessage) {
    console.log('Background message received:', remoteMessage);
    
    await this.ensureChannel();
    
    const { notification, data } = remoteMessage || {};
    
    // Determine channel based on message type
    const channelId = data?.type === 'daily-verse' ? 'daily-verse' : 'general';
    
    await notifee.displayNotification({
      title: notification?.title || data?.title || 'EzraApp',
      body: notification?.body || data?.body || '',
      android: {
        channelId,
        pressAction: {
          id: 'default',
        },
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      },
      data: data || {},
    });
  }

  /**
   * Subscribe to a topic
   */
  async subscribeTopic(topic) {
    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return false;
    }
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribeTopic(topic) {
    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return false;
    }
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Error unsubscribing from topic ${topic}:`, error);
      return false;
    }
  }

  /**
   * Initialize the remote push service
   */
  async init() {
    if (this.isInitialized) {
      console.log('RemotePush already initialized');
      return;
    }

    try {
      console.log('Initializing RemotePush service...');
      
      // Ensure channels are created
      await this.ensureChannel();
      
      // Get FCM token
      const token = await this.getFcmToken();
      
      // Save token to backend
      if (token) {
        await this.saveTokenToBackend(token);
      }
      
      // Register foreground handler
      this.registerForegroundHandler();
      
      // Subscribe to general topics (optional)
      await this.subscribeTopic('all-users');
      
      this.isInitialized = true;
      console.log('RemotePush service initialized successfully');
      
      return token;
    } catch (error) {
      console.error('Error initializing RemotePush service:', error);
      return null;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled() {
    if (!messaging) {
      return false;
    }
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version < 33) {
          return true;
        }
        return PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      }

      const authStatus = await messaging().hasPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    } catch (error) {
      console.error('Error checking notification status:', error);
      return false;
    }
  }

  /**
   * Get current FCM token (refresh if needed)
   */
  async refreshToken() {
    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return null;
    }
    try {
      const token = await messaging().getToken(true); // Force refresh
      console.log('FCM Token refreshed:', token);
      return token;
    } catch (error) {
      console.error('Error refreshing FCM token:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new RemotePushService();

// Export individual functions for convenience
export const {
  init: initRemotePush,
  getFcmToken,
  subscribeTopic,
  unsubscribeTopic,
  areNotificationsEnabled,
  refreshToken,
  handleBackgroundMessage,
} = new RemotePushService();
