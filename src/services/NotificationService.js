import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  TriggerType,
} from '@notifee/react-native';
import {Platform, PermissionsAndroid, AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {EthDateTime} from 'ethiopian-calendar-date-converter';
import {
  ETHIOPIAN_MONTHS,
  normalizeEthiopianMonth,
} from '../utils/ethiopianCalendar';

const DAILY_NOTIFICATION_ENABLED_KEY = 'dailyNotificationEnabled';
const DAILY_NOTIFICATION_TIME_KEY = 'dailyNotificationTime';
const NOTIFICATION_BOOTSTRAP_KEY = 'notifications_bootstrapped_v1';
const FIRST_INSTALL_TEST_KEY = 'notifications_first_install_test_sent_v1';
const DAILY_VERSE_CACHE_KEY = 'daily_verse_devotion_cache_v1';
const DAILY_VERSE_NOTIFICATION_IDS_KEY = 'daily_verse_notification_ids_v1';
const DAILY_VERSE_SCHEDULE_DAYS = 30;
const SABBATH_SCHOOL_NOTIFICATION_IDS_KEY =
  'sabbath_school_notification_ids_v1';
const SABBATH_SCHOOL_SCHEDULE_WEEKS = 12;
const SABBATH_SCHOOL_NOTIFICATION_HOUR = 20;
const SABBATH_SCHOOL_NOTIFICATION_MINUTE = 0;

const formatDateKey = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toEthDate = date => {
  const ethDateTime = EthDateTime.fromEuropeanDate(date);

  return {
    year: ethDateTime.year,
    day: ethDateTime.date,
    monthName: normalizeEthiopianMonth(ETHIOPIAN_MONTHS[ethDateTime.month]),
  };
};

const findDevotionWithOffset = (devotions, offset, baseDate, targetYear) => {
  const date = new Date(baseDate);
  date.setDate(baseDate.getDate() - offset);
  const ethDate = toEthDate(date);
  const targetYearNumber = Number(targetYear);

  return devotions.find(devotion => {
    const devotionYear = devotion?.year;
    const hasYear = devotionYear !== undefined && devotionYear !== null;

    return (
      normalizeEthiopianMonth(devotion?.month) === ethDate.monthName &&
      Number(devotion?.day) === ethDate.day &&
      (!hasYear || Number(devotionYear) === targetYearNumber)
    );
  });
};

const findDevotionForDate = (devotions, date) => {
  const ethDate = toEthDate(date);

  return devotions.find(devotion => {
    const devotionYear = devotion?.year;
    const hasYear = devotionYear !== undefined && devotionYear !== null;

    return (
      normalizeEthiopianMonth(devotion?.month) === ethDate.monthName &&
      Number(devotion?.day) === ethDate.day &&
      (!hasYear || Number(devotionYear) === Number(ethDate.year))
    );
  });
};

const getAlternateMonthName = monthName => {
  if (monthName === 'ሚያዚያ') {
    return 'ሚያዝያ';
  }
  if (monthName === 'ሚያዝያ') {
    return 'ሚያዚያ';
  }
  if (monthName === 'ሐምሌ') {
    return 'ሀምሌ';
  }
  if (monthName === 'ሀምሌ') {
    return 'ሐምሌ';
  }
  return null;
};

const normalizeDevotionsResponse = data =>
  Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
    ? data
    : [];

class NotificationService {
  constructor() {
    this.lastScheduleError = null;
    this.configure();
    this.setupAppStateListener();
  }

  setLastScheduleError(error) {
    if (!error) {
      this.lastScheduleError = null;
      return;
    }
    if (typeof error === 'string') {
      this.lastScheduleError = error;
      return;
    }
    this.lastScheduleError =
      error?.message ||
      error?.code ||
      (typeof error === 'object' ? JSON.stringify(error) : String(error));
  }

  getLastScheduleError() {
    return this.lastScheduleError;
  }

  async canUseExactAlarms() {
    try {
      if (Platform.OS !== 'android' || Platform.Version < 31) {
        return true;
      }
      if (typeof notifee.canScheduleExactAlarms === 'function') {
        return await notifee.canScheduleExactAlarms();
      }
      // Older Notifee versions do not expose this API.
      return false;
    } catch (error) {
      console.warn('Failed to check exact alarm capability:', error);
      return false;
    }
  }

  async configure() {
    try {
      // Create channels (Android only)
      await this.createChannels();

      // Schedule daily verse at set time if enabled (e.g. after app install or restart)
      await this.rescheduleNotificationsIfNeeded();

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

      await notifee.createChannel({
        id: 'sabbath-school',
        name: 'Sabbath School',
        description: 'Weekly Sabbath School lesson reminders',
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
          const alreadyGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          let granted = PermissionsAndroid.RESULTS.GRANTED;
          if (!alreadyGranted) {
            granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            );
          }

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('POST_NOTIFICATIONS permission denied');
            return false;
          }
        }

        // Check and request exact alarm permission for Android 12+
        if (Platform.Version >= 31) {
          const canScheduleExactAlarms = await this.canUseExactAlarms();
          if (!canScheduleExactAlarms) {
            console.log('Exact alarm scheduling not allowed');
            // For API 35, we'll use regular notifications instead of exact alarms
            return this.checkPermissionStatus(); // Still allow basic notifications
          }
        }

        return this.checkPermissionStatus();
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
        const isAuthorized =
          settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
          settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
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
      const settings = await notifee.getNotificationSettings();

      if (Platform.OS === 'ios') {
        console.log('iOS notification settings:', settings);
        return (
          settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
          settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
        );
      }

      if (Platform.Version >= 33) {
        const androidRuntimeGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (!androidRuntimeGranted) {
          return false;
        }
      }

      return settings.authorizationStatus !== AuthorizationStatus.DENIED;
    } catch (error) {
      console.error('Error checking permission status:', error);
      return false;
    }
  }

  // Show immediate notification for testing
  async showTestNotification(devotion) {
    try {
      let hasPermission = await this.checkPermissionStatus();
      if (!hasPermission) {
        hasPermission = await this.requestPermissions();
      }
      if (!hasPermission) {
        console.log('Notification permissions not granted for test notification');
        return false;
      }

      const notificationConfig = {
        title: '📖 Daily Verse (Test)',
        body: this.getNotificationBody(devotion),
        subtitle: devotion.title || 'Daily Devotion',
        data: {
          type: 'daily-verse',
          ...(devotion._id && {devotionId: String(devotion._id)}),
          ...(devotion.year && {year: String(devotion.year)}),
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

  getNotificationBody(devotion) {
    return (
      devotion?.mainVerse ||
      devotion?.main_verse ||
      devotion?.memoryVerse ||
      devotion?.verse ||
      'Daily devotional verse'
    );
  }

  async getApiBaseUrl() {
    let baseUrl = 'https://ezrabackend.online/';
    try {
      const override = await AsyncStorage.getItem('apiBaseUrl');
      if (override && typeof override === 'string') {
        baseUrl = override.endsWith('/') ? override : `${override}/`;
      }
    } catch {}
    return baseUrl;
  }

  async getCachedDailyVerseMap() {
    try {
      const cachedString = await AsyncStorage.getItem(DAILY_VERSE_CACHE_KEY);
      if (!cachedString) {
        return {};
      }
      const cached = JSON.parse(cachedString);
      return cached?.devotionsByDate || {};
    } catch (error) {
      console.warn('Failed to read daily verse cache:', error);
      return {};
    }
  }

  async saveDailyVerseMap(devotionsByDate) {
    try {
      await AsyncStorage.setItem(
        DAILY_VERSE_CACHE_KEY,
        JSON.stringify({
          devotionsByDate,
          cachedAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      console.warn('Failed to save daily verse cache:', error);
    }
  }

  getTargetDates(days = DAILY_VERSE_SCHEDULE_DAYS) {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      dates.push(date);
    }

    return dates;
  }

  async fetchDevotionsForDates(dates) {
    const baseUrl = await this.getApiBaseUrl();
    const monthRequests = new Map();

    dates.forEach(date => {
      const ethDate = toEthDate(date);
      const monthNames = [
        ethDate.monthName,
        getAlternateMonthName(ethDate.monthName),
      ].filter(Boolean);

      monthNames.forEach(monthName => {
        monthRequests.set(`${ethDate.year}:${monthName}`, {
          year: ethDate.year,
          monthName,
        });
      });
    });

    const monthDevotions = [];
    for (const {year, monthName} of monthRequests.values()) {
      try {
        const response = await fetch(
          `${baseUrl}devotion/year/${year}/month/${encodeURIComponent(
            monthName,
          )}`,
        );
        if (!response.ok) {
          console.warn('Failed to fetch devotions:', response.status, monthName);
          continue;
        }

        const data = await response.json();
        monthDevotions.push(...normalizeDevotionsResponse(data));
      } catch (error) {
        console.warn('Failed to fetch devotion month:', monthName, error);
      }
    }

    return monthDevotions;
  }

  async refreshDailyVerseCache(days = DAILY_VERSE_SCHEDULE_DAYS) {
    const dates = this.getTargetDates(days);
    const cachedMap = await this.getCachedDailyVerseMap();
    const fetchedDevotions = await this.fetchDevotionsForDates(dates);
    const devotionsByDate = {...cachedMap};

    dates.forEach(date => {
      const devotion = findDevotionForDate(fetchedDevotions, date);
      if (devotion) {
        devotionsByDate[formatDateKey(date)] = devotion;
      }
    });

    const validKeys = new Set(dates.map(formatDateKey));
    Object.keys(devotionsByDate).forEach(key => {
      if (!validKeys.has(key)) {
        delete devotionsByDate[key];
      }
    });

    await this.saveDailyVerseMap(devotionsByDate);
    return devotionsByDate;
  }

  async getDailyVerseMap(days = DAILY_VERSE_SCHEDULE_DAYS) {
    const cachedMap = await this.getCachedDailyVerseMap();
    const dates = this.getTargetDates(days);
    const missingDate = dates.some(date => !cachedMap[formatDateKey(date)]);

    if (!missingDate) {
      return cachedMap;
    }

    const refreshedMap = await this.refreshDailyVerseCache(days);
    return Object.keys(refreshedMap).length > 0 ? refreshedMap : cachedMap;
  }

  async scheduleRollingDailyVerseNotifications(
    time = {hour: 8, minute: 0},
    days = DAILY_VERSE_SCHEDULE_DAYS,
  ) {
    this.setLastScheduleError(null);
    try {
      let hasPermission = await this.checkPermissionStatus();
      if (!hasPermission) {
        hasPermission = await this.requestPermissions();
      }
      if (!hasPermission) {
        console.log('Notification permissions not granted');
        this.setLastScheduleError('Notification permission is not granted.');
        return false;
      }

      const devotionsByDate = await this.getDailyVerseMap(days + 1);
      const dates = this.getTargetDates(days);
      const now = new Date();
      const notificationConfigs = [];

      dates.forEach(date => {
        const notificationDate = new Date(date);
        notificationDate.setHours(time.hour, time.minute, 0, 0);
        if (notificationDate.getTime() <= now.getTime()) {
          return;
        }

        const notificationDateKey = formatDateKey(date);
        const devotionDate = new Date(date);
        devotionDate.setDate(date.getDate() + 1);
        const devotionDateKey = formatDateKey(devotionDate);
        const devotion = devotionsByDate[devotionDateKey];
        if (!devotion) {
          return;
        }

        notificationConfigs.push({
          notificationDateKey,
          devotionDateKey,
          notificationDate,
          devotion,
        });
      });

      if (notificationConfigs.length === 0) {
        this.setLastScheduleError(
          'No upcoming devotion verses were available to schedule.',
        );
        return false;
      }

      await this.cancelDailyVerseNotifications();

      let canScheduleExactAlarms = true;
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        canScheduleExactAlarms = await this.canUseExactAlarms();
      }

      const scheduledIds = [];
      for (const {
        notificationDateKey,
        devotionDateKey,
        notificationDate,
        devotion,
      } of notificationConfigs) {
        const notificationConfig = {
          id: `daily-verse-${notificationDateKey}`,
          title: '📖 Daily Verse',
          body: this.getNotificationBody(devotion),
          subtitle: devotion.title || 'Daily Devotion',
          data: {
            type: 'daily-verse',
            dateKey: devotionDateKey,
            notificationDateKey,
            ...(devotion._id && {devotionId: String(devotion._id)}),
            ...(devotion.year && {year: String(devotion.year)}),
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
        };

        if (
          Platform.OS === 'android' &&
          canScheduleExactAlarms &&
          Platform.Version < 35
        ) {
          triggerConfig.alarmManager = {
            allowWhileIdle: true,
          };
        }

        const notificationId = await notifee.createTriggerNotification(
          notificationConfig,
          triggerConfig,
        );
        scheduledIds.push(notificationId);
      }

      await AsyncStorage.setItem(
        DAILY_VERSE_NOTIFICATION_IDS_KEY,
        JSON.stringify(scheduledIds),
      );
      await AsyncStorage.setItem(DAILY_NOTIFICATION_ENABLED_KEY, 'true');
      await AsyncStorage.setItem(DAILY_NOTIFICATION_TIME_KEY, JSON.stringify(time));

      console.log(`Scheduled ${scheduledIds.length} daily verse notifications`);
      return true;
    } catch (error) {
      console.error('Error scheduling rolling notifications:', error);
      this.setLastScheduleError(error);
      return false;
    }
  }

  // Schedule daily verse notification
  async scheduleDailyVerseNotification(devotion, time = {hour: 8, minute: 0}) {
    if (devotion) {
      try {
        const todayKey = formatDateKey(new Date());
        const cachedMap = await this.getCachedDailyVerseMap();
        cachedMap[todayKey] = devotion;
        await this.saveDailyVerseMap(cachedMap);
      } catch {}
    }

    return this.scheduleRollingDailyVerseNotifications(time);
  }

  async scheduleSingleDailyVerseNotification(
    devotion,
    time = {hour: 8, minute: 0},
  ) {
    this.setLastScheduleError(null);
    try {
      let hasPermission = await this.checkPermissionStatus();
      if (!hasPermission) {
        hasPermission = await this.requestPermissions();
      }
      if (!hasPermission) {
        console.log('Notification permissions not granted');
        this.setLastScheduleError('Notification permission is not granted.');
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

      const devotionDate = new Date(notificationDate);
      devotionDate.setDate(notificationDate.getDate() + 1);
      const scheduledDevotion =
        (await this.getDevotionForDate(devotionDate)) || devotion;

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
        canScheduleExactAlarms = await this.canUseExactAlarms();
      }

      // Schedule notification
      const notificationConfig = {
        title: '📖 Daily Verse',
        body: this.getNotificationBody(scheduledDevotion),
        subtitle: scheduledDevotion?.title || 'Daily Devotion',
        data: {
          type: 'daily-verse',
          dateKey: formatDateKey(devotionDate),
          ...(scheduledDevotion?._id && {
            devotionId: String(scheduledDevotion._id),
          }),
          ...(scheduledDevotion?.year && {
            year: String(scheduledDevotion.year),
          }),
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
      };

      // Only add alarmManager for Android
      if (Platform.OS === 'android') {
        if (canScheduleExactAlarms && Platform.Version < 35) {
          triggerConfig.alarmManager = {
            allowWhileIdle: true,
          };
        }
      }

      console.log('Creating trigger notification for iOS:', {
        timestamp: notificationDate.getTime(),
        date: notificationDate.toISOString(),
        platform: Platform.OS,
      });

      let notificationId;
      try {
        notificationId = await notifee.createTriggerNotification(
          notificationConfig,
          triggerConfig,
        );
      } catch (primaryError) {
        // Android fallback: some devices reject repeating timestamp/alarm options.
        if (Platform.OS !== 'android') {
          throw primaryError;
        }
        console.warn(
          'Primary Android schedule failed, retrying with fallback trigger:',
          primaryError,
        );
        const fallbackTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: notificationDate.getTime(),
        };
        notificationId = await notifee.createTriggerNotification(
          notificationConfig,
          fallbackTrigger,
        );
      }

      console.log(
        'Notification scheduled successfully with ID:',
        notificationId,
      );

      // Save settings
      await AsyncStorage.setItem(DAILY_NOTIFICATION_ENABLED_KEY, 'true');
      await AsyncStorage.setItem(DAILY_NOTIFICATION_TIME_KEY, JSON.stringify(time));

      return true;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      this.setLastScheduleError(error);
      return false;
    }
  }

  async cancelDailyVerseNotifications() {
    try {
      const storedIdsString = await AsyncStorage.getItem(
        DAILY_VERSE_NOTIFICATION_IDS_KEY,
      );
      const storedIds = storedIdsString ? JSON.parse(storedIdsString) : [];
      const idsToCancel = new Set(Array.isArray(storedIds) ? storedIds : []);

      if (typeof notifee.getTriggerNotifications === 'function') {
        const triggers = await notifee.getTriggerNotifications();
        triggers.forEach(triggerNotification => {
          const notification = triggerNotification?.notification;
          if (
            notification?.data?.type === 'daily-verse' ||
            String(notification?.id || '').startsWith('daily-verse-')
          ) {
            idsToCancel.add(notification.id);
          }
        });
      }

      const ids = [...idsToCancel].filter(Boolean);
      if (ids.length > 0) {
        if (typeof notifee.cancelTriggerNotifications === 'function') {
          await notifee.cancelTriggerNotifications(ids);
        } else {
          await Promise.all(ids.map(id => notifee.cancelNotification(id)));
        }
      }

      await AsyncStorage.removeItem(DAILY_VERSE_NOTIFICATION_IDS_KEY);
      console.log(`Daily verse notifications cancelled: ${ids.length}`);
    } catch (error) {
      console.warn('Failed to cancel daily verse notifications:', error);
    }
  }

  async cancelAllNotifications() {
    await notifee.cancelAllNotifications();
    console.log('All notifications cancelled');
  }

  async getDailyNotificationSettings() {
    try {
      const enabled = await AsyncStorage.getItem(DAILY_NOTIFICATION_ENABLED_KEY);
      const timeString = await AsyncStorage.getItem(DAILY_NOTIFICATION_TIME_KEY);
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
      await AsyncStorage.setItem(DAILY_NOTIFICATION_TIME_KEY, JSON.stringify(time));
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
      await AsyncStorage.setItem(DAILY_NOTIFICATION_ENABLED_KEY, 'true');
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
    await AsyncStorage.setItem(DAILY_NOTIFICATION_ENABLED_KEY, 'false');
    console.log('Daily notifications disabled');
  }

  async ensureNotificationSetupOnAppStart() {
    try {
      const alreadyBootstrapped = await AsyncStorage.getItem(
        NOTIFICATION_BOOTSTRAP_KEY,
      );
      const storedEnabledValue = await AsyncStorage.getItem(
        DAILY_NOTIFICATION_ENABLED_KEY,
      );
      const savedSettings = await this.getDailyNotificationSettings();
      const isFreshInstall = !alreadyBootstrapped && storedEnabledValue === null;
      await this.refreshDailyVerseCache(DAILY_VERSE_SCHEDULE_DAYS);

      let hasPermission = await this.checkPermissionStatus();
      if (!hasPermission) {
        hasPermission = await this.requestPermissions();
      }

      if (!hasPermission) {
        return false;
      }

      const defaultTime = savedSettings?.time || {hour: 7, minute: 30};

      if (isFreshInstall) {
        await this.enableDailyNotifications(defaultTime);
      }

      const devotion = await this.getTodaysDevotion();
      if (devotion && (savedSettings.enabled || isFreshInstall)) {
        await this.scheduleDailyVerseNotification(devotion, defaultTime);
      }

      await this.scheduleSabbathSchoolNotifications();

      if (isFreshInstall) {
        const alreadySentTest = await AsyncStorage.getItem(FIRST_INSTALL_TEST_KEY);
        if (!alreadySentTest && devotion) {
          await this.showTestNotification(devotion);
          await AsyncStorage.setItem(FIRST_INSTALL_TEST_KEY, 'true');
        }
      }

      if (!alreadyBootstrapped) {
        await AsyncStorage.setItem(NOTIFICATION_BOOTSTRAP_KEY, 'true');
      }

      return true;
    } catch (error) {
      console.error('Error ensuring notification setup on app start:', error);
      return false;
    }
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
        const scheduled = await this.scheduleRollingDailyVerseNotifications(
          settings.time,
        );
        if (scheduled) {
          console.log('Notifications rescheduled successfully');
        }
      }
      await this.scheduleSabbathSchoolNotifications();
    } catch (error) {
      console.error('Error rescheduling notifications:', error);
    }
  }

  async getDevotionForDate(date) {
    try {
      const dateKey = formatDateKey(date);
      const dailyVerseMap = await this.getDailyVerseMap(
        DAILY_VERSE_SCHEDULE_DAYS + 1,
      );
      if (dailyVerseMap[dateKey]) {
        return dailyVerseMap[dateKey];
      }

      const {year, monthName: ethiopianMonth} = toEthDate(date);
      const alternateMonthName = getAlternateMonthName(ethiopianMonth);
      const baseUrl = await this.getApiBaseUrl();

      const monthsToCheck = [ethiopianMonth, alternateMonthName].filter(Boolean);
      for (const monthName of monthsToCheck) {
        const response = await fetch(
          `${baseUrl}devotion/year/${year}/month/${encodeURIComponent(monthName)}`,
        );
        if (!response.ok) {
          console.warn('Failed to fetch devotions:', response.status, monthName);
          continue;
        }

        const data = await response.json();
        const devotions = normalizeDevotionsResponse(data);
        const match = findDevotionForDate(devotions, date);
        if (match) {
          const cachedMap = await this.getCachedDailyVerseMap();
          cachedMap[dateKey] = match;
          await this.saveDailyVerseMap(cachedMap);
          return match;
        }
      }

      return null;
    } catch (error) {
      console.warn('Error getting devotion for date:', error);
      return null;
    }
  }

  async getTodaysDevotion() {
    try {
      const today = new Date();
      const dateKey = formatDateKey(today);
      const dailyVerseMap = await this.getDailyVerseMap(
        DAILY_VERSE_SCHEDULE_DAYS,
      );
      if (dailyVerseMap[dateKey]) {
        return dailyVerseMap[dateKey];
      }

      const {year, monthName: ethiopianMonth} = toEthDate(today);
      const alternateMonthName = getAlternateMonthName(ethiopianMonth);

      const findMatchingDevotion = devotions => {
        if (!Array.isArray(devotions) || devotions.length === 0) {
          return null;
        }

        return findDevotionWithOffset(devotions, 0, today, year) || null;
      };

      // 1) Try cached home data (same key pattern as Home screen: home_data_cache_${year}_${month})
      try {
        const cacheKey = `home_data_cache_${year}_${ethiopianMonth}`;
        let cachedString = await AsyncStorage.getItem(cacheKey);
        if (!cachedString) {
          const keys = await AsyncStorage.getAllKeys();
          const homeKeys = keys.filter(k => k.startsWith('home_data_cache_'));
          if (homeKeys.length > 0) {
            const keyValues = await AsyncStorage.multiGet(homeKeys);
            let latest = null;
            keyValues.forEach(([, raw]) => {
              if (!raw) return;
              try {
                const parsed = JSON.parse(raw);
                if (parsed?.devotions?.length && parsed?.lastCacheTime) {
                  if (
                    !latest ||
                    new Date(parsed.lastCacheTime).getTime() >
                      new Date(latest.lastCacheTime || 0).getTime()
                  ) {
                    latest = parsed;
                  }
                }
              } catch (_) {}
            });
            cachedString = latest ? JSON.stringify(latest) : null;
          }
        }
        if (cachedString) {
          const cached = JSON.parse(cachedString);
          const devotions = cached?.devotions || [];
          const match = findMatchingDevotion(devotions);
          if (match) {
            return match;
          }
        }
      } catch (e) {
        console.warn('Failed to read cached devotions:', e);
      }

      // 2) Fallback to the month endpoint used by the Devotion screen.
      const baseUrl = await this.getApiBaseUrl();

      const monthsToCheck = [ethiopianMonth, alternateMonthName].filter(Boolean);
      for (const monthName of monthsToCheck) {
        const response = await fetch(
          `${baseUrl}devotion/year/${year}/month/${encodeURIComponent(monthName)}`,
        );
        if (!response.ok) {
          console.warn('Failed to fetch devotions:', response.status, monthName);
          continue;
        }

        const data = await response.json();
        const devotions = normalizeDevotionsResponse(data);

        const match = findMatchingDevotion(devotions);
        if (match) {
          const cachedMap = await this.getCachedDailyVerseMap();
          cachedMap[dateKey] = match;
          await this.saveDailyVerseMap(cachedMap);
          return match;
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting today's devotion:", error);
      return null;
    }
  }

  getSabbathSchoolQuarterId(date) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    if (month >= 1 && month <= 3) {
      return `${year}-01`;
    }
    if (month >= 4 && month <= 6) {
      return `${year}-02`;
    }
    if (month >= 7 && month <= 9) {
      return `${year}-03`;
    }
    return `${year}-04`;
  }

  parseSabbathSchoolDate(dateString) {
    const [day, month, year] = String(dateString || '')
      .split('/')
      .map(Number);
    return new Date(year, month - 1, day);
  }

  async fetchSabbathSchoolJson(path, preferredLanguage = 'am') {
    const languages = [
      preferredLanguage,
      preferredLanguage === 'am' ? 'en' : 'am',
    ];

    for (const language of languages) {
      try {
        const response = await fetch(
          `https://sabbath-school-stage.adventech.io/api/v2/${language}/${path}`,
        );
        if (!response.ok) {
          continue;
        }
        return await response.json();
      } catch (error) {
        console.warn('Failed to fetch Sabbath School data:', path, error);
      }
    }

    return null;
  }

  resolveSabbathSchoolLessonForDate(quarterData, date) {
    if (!quarterData?.quarterly || !Array.isArray(quarterData?.lessons)) {
      return null;
    }

    const quarterStartDate = this.parseSabbathSchoolDate(
      quarterData.quarterly.start_date,
    );
    if (Number.isNaN(quarterStartDate.getTime())) {
      return quarterData.lessons[0] || null;
    }

    const diffDays = Math.floor(
      (date - quarterStartDate) / (1000 * 60 * 60 * 24),
    );
    const lessonIndex = Math.min(
      Math.max(Math.floor(diffDays / 7), 0),
      quarterData.lessons.length - 1,
    );

    return quarterData.lessons[lessonIndex] || null;
  }

  getUpcomingThursdayReminderDates(weeks = SABBATH_SCHOOL_SCHEDULE_WEEKS) {
    const dates = [];
    const now = new Date();
    const firstDate = new Date();
    firstDate.setHours(
      SABBATH_SCHOOL_NOTIFICATION_HOUR,
      SABBATH_SCHOOL_NOTIFICATION_MINUTE,
      0,
      0,
    );

    const thursday = 4;
    const daysUntilThursday = (thursday - firstDate.getDay() + 7) % 7;
    firstDate.setDate(firstDate.getDate() + daysUntilThursday);
    if (firstDate.getTime() <= now.getTime()) {
      firstDate.setDate(firstDate.getDate() + 7);
    }

    for (let index = 0; index < weeks; index += 1) {
      const date = new Date(firstDate);
      date.setDate(firstDate.getDate() + index * 7);
      dates.push(date);
    }

    return dates;
  }

  async cancelSabbathSchoolNotifications() {
    try {
      const storedIdsString = await AsyncStorage.getItem(
        SABBATH_SCHOOL_NOTIFICATION_IDS_KEY,
      );
      const storedIds = storedIdsString ? JSON.parse(storedIdsString) : [];
      const idsToCancel = new Set(Array.isArray(storedIds) ? storedIds : []);

      if (typeof notifee.getTriggerNotifications === 'function') {
        const triggers = await notifee.getTriggerNotifications();
        triggers.forEach(triggerNotification => {
          const notification = triggerNotification?.notification;
          if (
            notification?.data?.type === 'sabbath-school' ||
            String(notification?.id || '').startsWith('sabbath-school-')
          ) {
            idsToCancel.add(notification.id);
          }
        });
      }

      const ids = [...idsToCancel].filter(Boolean);
      if (ids.length > 0) {
        if (typeof notifee.cancelTriggerNotifications === 'function') {
          await notifee.cancelTriggerNotifications(ids);
        } else {
          await Promise.all(ids.map(id => notifee.cancelNotification(id)));
        }
      }

      await AsyncStorage.removeItem(SABBATH_SCHOOL_NOTIFICATION_IDS_KEY);
    } catch (error) {
      console.warn('Failed to cancel Sabbath School notifications:', error);
    }
  }

  async scheduleSabbathSchoolNotifications() {
    try {
      let hasPermission = await this.checkPermissionStatus();
      if (!hasPermission) {
        hasPermission = await this.requestPermissions();
      }
      if (!hasPermission) {
        return false;
      }

      const reminderDates = this.getUpcomingThursdayReminderDates();
      const quarterCache = new Map();
      const scheduledIds = [];

      await this.cancelSabbathSchoolNotifications();

      for (const notificationDate of reminderDates) {
        const quarterId = this.getSabbathSchoolQuarterId(notificationDate);
        if (!quarterCache.has(quarterId)) {
          quarterCache.set(
            quarterId,
            await this.fetchSabbathSchoolJson(
              `quarterlies/${quarterId}/index.json`,
              'am',
            ),
          );
        }

        const quarterData = quarterCache.get(quarterId);
        const lesson = this.resolveSabbathSchoolLessonForDate(
          quarterData,
          notificationDate,
        );
        if (!lesson?.id) {
          continue;
        }

        const notificationDateKey = formatDateKey(notificationDate);
        const notificationConfig = {
          id: `sabbath-school-${notificationDateKey}`,
          title: 'የዕለቱን የሰንበት ትምህርት ያጥኑ',
          body: lesson.title || 'Sabbath School',
          data: {
            type: 'sabbath-school',
            ssl: quarterId,
            weekId: String(lesson.id),
          },
          android: {
            channelId: 'sabbath-school',
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
            categoryId: 'sabbath-school',
          },
        };

        const notificationId = await notifee.createTriggerNotification(
          notificationConfig,
          {
            type: TriggerType.TIMESTAMP,
            timestamp: notificationDate.getTime(),
          },
        );
        scheduledIds.push(notificationId);
      }

      await AsyncStorage.setItem(
        SABBATH_SCHOOL_NOTIFICATION_IDS_KEY,
        JSON.stringify(scheduledIds),
      );
      console.log(
        `Scheduled ${scheduledIds.length} Sabbath School notifications`,
      );
      return scheduledIds.length > 0;
    } catch (error) {
      console.warn('Error scheduling Sabbath School notifications:', error);
      return false;
    }
  }
}

export default new NotificationService();
