import notifee, {
  AndroidImportance,
  EventType,
  TriggerType,
  RepeatFrequency,
} from '@notifee/react-native';
import {Platform, PermissionsAndroid, AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {toEthiopian} from 'ethiopian-date';

class NotificationService {
  constructor() {
    this.configure();
    this.setupAppStateListener();
  }

  async configure() {
    try {
      // Request permissions for both Android and iOS
      await this.requestPermissions();

      // Create channels (Android only)
      await this.createChannels();

      // Listen for notification events
      notifee.onForegroundEvent(({type, detail}) => {
        // console.log('Foreground event:', type, detail);
        switch (type) {
          case EventType.DISMISSED:
            console.log('User dismissed notification', detail.notification);
            break;
          case EventType.PRESS:
            console.log('User pressed notification', detail.notification);
            break;
        }
      });

      notifee.onBackgroundEvent(async ({type, detail}) => {
        console.log('Background event:', type, detail);
      });
    } catch (error) {
      console.warn('Failed to configure notifications:', error);
    }
  }

  async createChannels() {
    if (Platform.OS === 'android') {
      // Create daily verse channel
      await notifee.createChannel({
        id: 'daily-verse',
        name: 'Daily Verse',
        description: 'Daily devotional verse notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      // Create general channel
      await notifee.createChannel({
        id: 'general',
        name: 'General Notifications',
        description: 'General app notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });
    }
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      try {
        // Request notification permission for Android 13+
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('POST_NOTIFICATIONS permission denied');
            return false;
          }
        }

        // Check and request exact alarm permission for Android 12+
        if (Platform.Version >= 31) {
          const canScheduleExactAlarms = await notifee.canScheduleExactAlarms();
          if (!canScheduleExactAlarms) {
            console.log('Exact alarm scheduling not allowed');
            // For API 35, we'll use regular notifications instead of exact alarms
            return true; // Still allow basic notifications
          }
        }

        return true;
      } catch (err) {
        console.warn('Permission request failed:', err);
        return false;
      }
    } else {
      // iOS: Request notification permissions
      try {
        const settings = await notifee.requestPermission({
          alert: true,
          badge: true,
          sound: true,
        });
        console.log('iOS notification permission status:', settings);
        // 1 = AUTHORIZED, 2 = PROVISIONAL, 0 = DENIED, -1 = NOT_DETERMINED
        const isAuthorized =
          settings.authorizationStatus === 1 || settings.authorizationStatus === 2;
        if (!isAuthorized) {
          console.log(
            'iOS notification permission denied. Status:',
            settings.authorizationStatus,
          );
        }
        return isAuthorized;
      } catch (err) {
        console.warn('iOS permission request failed:', err);
        return false;
      }
    }
  }

  // Check current notification permission status
  async checkPermissionStatus() {
    try {
      if (Platform.OS === 'ios') {
        const settings = await notifee.getNotificationSettings();
        console.log('iOS notification settings:', settings);
        return (
          settings.authorizationStatus === 1 || settings.authorizationStatus === 2
        );
      } else {
        // For Android, check if permission is granted
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          return granted;
        }
        return true; // For older Android versions, assume granted
      }
    } catch (error) {
      console.error('Error checking permission status:', error);
      return false;
    }
  }

  // Show immediate notification for testing
  async showTestNotification(devotion) {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Notification permissions not granted for test notification');
        return false;
      }

      const notificationConfig = {
        title: '📖 Daily Verse (Test)',
        body: devotion.verse || 'Daily devotional verse',
        subtitle: devotion.title || 'Daily Devotion',
        data: {
          type: 'daily-verse',
          ...(devotion._id && {devotionId: String(devotion._id)}),
        },
        android: {
          channelId: 'daily-verse',
          pressAction: {
            id: 'default',
          },
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        },
        ios: {
          sound: 'default',
          badge: true,
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      };

      await notifee.displayNotification(notificationConfig);
      console.log('Test notification sent successfully');
      return true;
    } catch (error) {
      console.error('Error showing test notification:', error);
      return false;
    }
  }

  // Schedule daily verse notification
  async scheduleDailyVerseNotification(devotion, time = {hour: 8, minute: 0}) {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Notification permissions not granted');
        return false;
      }

      // Cancel existing notifications
      await this.cancelDailyVerseNotifications();

      // Calculate notification time
      const now = new Date();
      const notificationDate = new Date();
      notificationDate.setHours(time.hour, time.minute, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (notificationDate.getTime() <= now.getTime()) {
        notificationDate.setDate(notificationDate.getDate() + 1);
      }

      console.log(
        'Scheduling notification for:',
        notificationDate.toLocaleString(),
      );
      console.log('Current time:', now.toLocaleString());
      console.log(
        'Time until notification (ms):',
        notificationDate.getTime() - now.getTime(),
      );

      // Check if we can use exact alarms (Android only)
      let canScheduleExactAlarms = true;
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        canScheduleExactAlarms = await notifee.canScheduleExactAlarms();
      }

      // Schedule notification
      const notificationConfig = {
        title: '📖 Daily Verse',
        body: devotion.verse || 'Daily devotional verse',
        subtitle: devotion.title || 'Daily Devotion',
        data: {
          type: 'daily-verse',
          ...(devotion._id && {devotionId: String(devotion._id)}),
        },
        android: {
          channelId: 'daily-verse',
          pressAction: {
            id: 'default',
          },
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        },
        ios: {
          sound: 'default',
          badge: true,
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
          categoryId: 'daily-verse',
        },
      };

      const triggerConfig = {
        type: TriggerType.TIMESTAMP,
        timestamp: notificationDate.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
      };

      // Only add alarmManager for Android
      if (Platform.OS === 'android') {
        triggerConfig.alarmManager =
          canScheduleExactAlarms && Platform.Version < 35; // Disable for API 35
      }

      console.log('Creating trigger notification for iOS:', {
        timestamp: notificationDate.getTime(),
        date: notificationDate.toISOString(),
        platform: Platform.OS,
      });

      const notificationId = await notifee.createTriggerNotification(
        notificationConfig,
        triggerConfig,
      );

      console.log(
        'Notification scheduled successfully with ID:',
        notificationId,
      );

      // Save settings
      await AsyncStorage.setItem('dailyNotificationEnabled', 'true');
      await AsyncStorage.setItem('dailyNotificationTime', JSON.stringify(time));

      return true;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return false;
    }
  }

  async cancelDailyVerseNotifications() {
    await notifee.cancelAllNotifications();
    console.log('Daily verse notifications cancelled');
  }

  async cancelAllNotifications() {
    await notifee.cancelAllNotifications();
    console.log('All notifications cancelled');
  }

  async getDailyNotificationSettings() {
    try {
      const enabled = await AsyncStorage.getItem('dailyNotificationEnabled');
      const timeString = await AsyncStorage.getItem('dailyNotificationTime');
      // Default to 7:30 AM if no time is saved
      const time = timeString ? JSON.parse(timeString) : {hour: 7, minute: 30};

      return {
        enabled: enabled === 'true',
        time: time,
      };
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return {
        enabled: false,
        time: {hour: 7, minute: 30},
      };
    }
  }

  async updateDailyNotificationTime(time) {
    try {
      await AsyncStorage.setItem('dailyNotificationTime', JSON.stringify(time));
      // Also save in a backup key for persistence
      await AsyncStorage.setItem(
        'notification_time_backup',
        JSON.stringify(time),
      );
      console.log('Notification time updated:', time);
      return true;
    } catch (error) {
      console.error('Error updating notification time:', error);
      return false;
    }
  }

  async enableDailyNotifications(time = {hour: 7, minute: 30}) {
    try {
      await AsyncStorage.setItem('dailyNotificationEnabled', 'true');
      await this.updateDailyNotificationTime(time);
      console.log('Daily notifications enabled');
      return true;
    } catch (error) {
      console.error('Error enabling notifications:', error);
      return false;
    }
  }

  async disableDailyNotifications() {
    await this.cancelDailyVerseNotifications();
    await AsyncStorage.setItem('dailyNotificationEnabled', 'false');
    console.log('Daily notifications disabled');
  }

  setupAppStateListener() {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  async handleAppStateChange(nextAppState) {
    if (nextAppState === 'active') {
      // App came to foreground, reschedule notifications if needed
      console.log('App became active, checking notification schedule');
      await this.rescheduleNotificationsIfNeeded();
    }
  }

  async rescheduleNotificationsIfNeeded() {
    try {
      const settings = await this.getDailyNotificationSettings();
      if (settings.enabled) {
        // Cancel existing notifications and reschedule
        await this.cancelDailyVerseNotifications();

        // Get today's devotion and reschedule
        const devotion = await this.getTodaysDevotion();
        if (devotion) {
          await this.scheduleDailyVerseNotification(devotion, settings.time);
          console.log('Notifications rescheduled successfully');
        }
      }
    } catch (error) {
      console.error('Error rescheduling notifications:', error);
    }
  }

  async getTodaysDevotion() {
    try {
      const ethiopianMonths = [
        '',
        'መስከረም',
        'ጥቅምት',
        'ህዳር',
        'ታህሳስ',
        'ጥር',
        'የካቲት',
        'መጋቢት',
        'ሚያዝያ',
        'ግንቦት',
        'ሰኔ',
        'ሐምሌ',
        'ነሐሴ',
        'ጳጉሜ',
      ];

      const today = new Date();
      const [year, month, day] = toEthiopian(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate(),
      );
      const ethiopianMonth = ethiopianMonths[month];

      // 1) Try cached home data first
      try {
        const cachedString = await AsyncStorage.getItem('home_data_cache');
        if (cachedString) {
          const cached = JSON.parse(cachedString);
          const devotions = cached?.devotions || [];
          const match =
            devotions.find(
              d => d.month === ethiopianMonth && Number(d.day) === day,
            ) || devotions[0];
          if (match) return match;
        }
      } catch (e) {
        console.warn('Failed to read cached devotions:', e);
      }

      // 2) Fallback to API
      let baseUrl = 'https://ezrabackend.online/';
      try {
        const override = await AsyncStorage.getItem('apiBaseUrl');
        if (override && typeof override === 'string') {
          baseUrl = override.endsWith('/') ? override : `${override}/`;
        }
      } catch {}

      const response = await fetch(`${baseUrl}devotion/show`);
      if (!response.ok) {
        console.warn('Failed to fetch devotions:', response.status);
        return null;
      }
      const data = await response.json();
      const devotions = Array.isArray(data?.devotions)
        ? data.devotions
        : Array.isArray(data)
        ? data
        : [];

      const match =
        devotions.find(
          d => d.month === ethiopianMonth && Number(d.day) === day,
        ) || devotions[0];
      return match || null;
    } catch (error) {
      console.error("Error getting today's devotion:", error);
      return null;
    }
  }

  async scheduleWeeklyDevotionReminder() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return false;

    const notificationDate = new Date();
    notificationDate.setHours(9, 0, 0, 0);

    // Schedule for next Sunday (0 = Sunday)
    const daysUntilSunday = (7 - notificationDate.getDay()) % 7;
    if (daysUntilSunday === 0 && notificationDate.getTime() <= Date.now()) {
      notificationDate.setDate(notificationDate.getDate() + 7);
    } else {
      notificationDate.setDate(notificationDate.getDate() + daysUntilSunday);
    }

    await notifee.displayNotification({
      title: '🙏 Weekly Devotion Reminder - EzraApp',
      body: "Start your week with spiritual reflection. Check out this week's devotional content!",
      android: {
        channelId: 'general',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      },
    });

    console.log('Weekly reminder scheduled for:', notificationDate);
    return true;
  }
}

export default new NotificationService();
