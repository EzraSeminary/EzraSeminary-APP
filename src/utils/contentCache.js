import AsyncStorage from '@react-native-async-storage/async-storage';
import {EthDateTime} from 'ethiopian-calendar-date-converter';
import {
  ETHIOPIAN_MONTHS,
  normalizeEthiopianMonth,
} from './ethiopianCalendar';

const CACHE_KEY = 'offline_content_cache_v1';
const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const dateKeyForDate = date => {
  const value = date instanceof Date ? date : new Date(date);
  const eth = EthDateTime.fromEuropeanDate(value);
  const month = normalizeEthiopianMonth(ETHIOPIAN_MONTHS[eth.month]);
  return `${eth.year}-${month}-${eth.date}`;
};

const dateKeyForDevotion = devotion => {
  const month = normalizeEthiopianMonth(devotion?.month);
  return `${devotion?.year}-${month}-${Number(devotion?.day)}`;
};

const readCache = async () => {
  try {
    const value = await AsyncStorage.getItem(CACHE_KEY);
    return value ? JSON.parse(value) : {devotions: {}, sabbathSchool: {}};
  } catch (error) {
    console.warn('Unable to read offline content cache:', error);
    return {devotions: {}, sabbathSchool: {}};
  }
};

const writeCache = async cache => {
  const cutoff = Date.now() - RETENTION_DAYS * DAY_MS;
  for (const section of ['devotions', 'sabbathSchool']) {
    Object.keys(cache[section] || {}).forEach(key => {
      const timestamp = new Date(cache[section][key]?.cachedAt || 0).getTime();
      if (!timestamp || timestamp < cutoff) delete cache[section][key];
    });
  }
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

export const saveDevotionsForOffline = async devotions => {
  if (!Array.isArray(devotions) || devotions.length === 0) return;
  const cache = await readCache();
  const now = new Date().toISOString();
  devotions.forEach(devotion => {
    if (!devotion?.year || !devotion?.month || !devotion?.day) return;
    cache.devotions[dateKeyForDevotion(devotion)] = {
      data: devotion,
      cachedAt: now,
    };
  });
  await writeCache(cache);
};

export const getDevotionForOfflineDate = async date => {
  const cache = await readCache();
  const entry = cache.devotions?.[dateKeyForDate(date)];
  if (!entry) return null;
  const age = Date.now() - new Date(entry.cachedAt || 0).getTime();
  return age <= RETENTION_DAYS * DAY_MS ? entry.data : null;
};

export const getDevotionsForOfflineWindow = async (startDate, days = 30) => {
  const cache = await readCache();
  const result = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + offset);
    const entry = cache.devotions?.[dateKeyForDate(date)];
    if (entry) {
      const age = Date.now() - new Date(entry.cachedAt || 0).getTime();
      if (age <= RETENTION_DAYS * DAY_MS) result.push(entry.data);
    }
  }
  return result;
};

// Home previously used a separate month cache. Import those saved entries into
// the date keyed cache so an upgrade can use content already on the device.
export const migrateLegacyHomeDevotionsToOfflineCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const homeKeys = keys.filter(key => key.startsWith('home_data_cache_'));
    const devotions = [];
    if (homeKeys.length > 0) {
      const values = await AsyncStorage.multiGet(homeKeys);
      values.forEach(([, raw]) => {
        if (!raw) return;
        try {
          const payload = JSON.parse(raw);
          if (Array.isArray(payload?.devotions)) devotions.push(...payload.devotions);
        } catch {}
      });
    }
    const legacyDevotionCache = await AsyncStorage.getItem('devotion_cache');
    if (legacyDevotionCache) {
      try {
        const parsed = JSON.parse(legacyDevotionCache);
        Object.values(parsed || {}).forEach(entry => {
          const devotion = entry?.data || entry;
          if (devotion?.year && devotion?.month && devotion?.day) {
            devotions.push(devotion);
          }
        });
      } catch {}
    }
    if (devotions.length > 0) await saveDevotionsForOffline(devotions);
  } catch (error) {
    console.warn('Could not migrate saved Home Devotions:', error);
  }
};

export const saveSabbathSchoolQuarterOffline = async (quarterId, quarterData, lessons) => {
  if (!quarterId || !quarterData) return;
  const cache = await readCache();
  const now = new Date().toISOString();
  const existing = cache.sabbathSchool[quarterId] || {};
  cache.sabbathSchool[quarterId] = {
    quarter: quarterData,
    lessons: {...(existing.lessons || {}), ...(lessons || {})},
    cachedAt: now,
  };
  await writeCache(cache);
};

export const getSabbathSchoolQuarterOffline = async quarterId => {
  const cache = await readCache();
  const entry = cache.sabbathSchool?.[quarterId];
  if (!entry) return null;
  const age = Date.now() - new Date(entry.cachedAt || 0).getTime();
  return age <= RETENTION_DAYS * DAY_MS ? entry : null;
};

export const saveSabbathSchoolLessonOffline = async (quarterId, lessonId, lesson, dayId, dayData) => {
  if (!quarterId || !lessonId) return;
  const cache = await readCache();
  const entry = cache.sabbathSchool[quarterId] || {quarter: null, lessons: {}};
  const previous = entry.lessons?.[lessonId] || {lesson: null, days: {}};
  const nextLesson = {
    ...previous,
    lesson: lesson || previous.lesson,
    days: {...(previous.days || {})},
  };
  if (dayId && dayData) nextLesson.days[dayId] = dayData;
  cache.sabbathSchool[quarterId] = {
    ...entry,
    lessons: {...(entry.lessons || {}), [lessonId]: nextLesson},
    cachedAt: new Date().toISOString(),
  };
  await writeCache(cache);
};

export const getOfflineDateKey = dateKeyForDate;
