import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('Push permission status:', authStatus);
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
      if (Platform.OS === 'ios') {
        try {
          await messaging().registerDeviceForRemoteMessages();
        } catch (e) {
          console.warn('Failed to register device for remote messages:', e);
        }
      }
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
      // Use the same backend URL as the main API
      // Allow override via AsyncStorage key 'apiBaseUrl' for testing
      let serverUrl = 'https://ezrabackend.online';
      try {
        const override = await AsyncStorage.getItem('apiBaseUrl');
        if (override && typeof override === 'string') {
          serverUrl = override.endsWith('/') ? override.slice(0, -1) : override;
        }
      } catch (e) {
        // Use default if AsyncStorage fails
      }

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
      const authStatus = await messaging().hasPermission();
      return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
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
