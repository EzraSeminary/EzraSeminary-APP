import notifee, {
  AndroidImportance,
  EventType,
  TriggerType,
  RepeatFrequency,
} from '@notifee/react-native';
import {Platform, PermissionsAndroid} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  constructor() {
    this.configure();
  }

  async configure() {
    try {
      // Request permissions
      if (Platform.OS === 'android') {
        await this.requestPermissions();
      }

      // Create channels
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
      return await notifee.requestPermission();
    }
  }

  // Show immediate notification for testing
  async showTestNotification(devotion) {
    try {
      await notifee.displayNotification({
        title: '📖 Daily Verse (Test)',
        body: devotion.verse,
        data: {
          type: 'daily-verse',
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
      });
      console.log('Test notification sent');
    } catch (error) {
      console.error('Error showing test notification:', error);
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

      // Check if we can use exact alarms
      const canScheduleExactAlarms =
        Platform.Version >= 31 ? await notifee.canScheduleExactAlarms() : true;

      // Schedule notification
      const notificationId = await notifee.createTriggerNotification(
        {
          title: '📖 Daily Verse',
          body: devotion.verse,
          data: {
            type: 'daily-verse',
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
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: notificationDate.getTime(),
          repeatFrequency: RepeatFrequency.DAILY,
          alarmManager: canScheduleExactAlarms && Platform.Version < 35, // Disable for API 35
        },
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
      const time = timeString ? JSON.parse(timeString) : {hour: 8, minute: 0};

      return {
        enabled: enabled === 'true',
        time: time,
      };
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return {
        enabled: false,
        time: {hour: 8, minute: 0},
      };
    }
  }

  async updateDailyNotificationTime(time) {
    try {
      await AsyncStorage.setItem('dailyNotificationTime', JSON.stringify(time));
      console.log('Notification time updated:', time);
      return true;
    } catch (error) {
      console.error('Error updating notification time:', error);
      return false;
    }
  }

  async disableDailyNotifications() {
    await this.cancelDailyVerseNotifications();
    await AsyncStorage.setItem('dailyNotificationEnabled', 'false');
    console.log('Daily notifications disabled');
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
