import AsyncStorage from '@react-native-async-storage/async-storage';

const SSL_CACHE_KEY = 'ssl_lesson_cache';
const SSL_CACHE_EXPIRY_DAYS = 30; // Cache expires after 30 days
const DEFAULT_SSL_LANGUAGE = 'en';

const normalizeLanguage = language => language || DEFAULT_SSL_LANGUAGE;

const isCacheEntryExpired = cachedAt => {
  if (!cachedAt) {
    return true;
  }

  const cachedDate = new Date(cachedAt);
  if (Number.isNaN(cachedDate.getTime())) {
    return true;
  }

  const now = new Date();
  const daysSinceCache =
    (now.getTime() - cachedDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceCache > SSL_CACHE_EXPIRY_DAYS;
};

/**
 * Generate a unique cache key for an SSL lesson
 * @param {String} ssl - The SSL quarter path (e.g., "2024-Q1")
 * @param {String} weekId - The week ID
 * @param {String} language - The current SSL language
 * @returns {String} - Unique cache key
 */
const getSSLCacheKey = (ssl, weekId, language = DEFAULT_SSL_LANGUAGE) => {
  return `${normalizeLanguage(language)}_${ssl}_${weekId}`;
};

const getLegacySSLCacheKey = (ssl, weekId) => {
  return `${ssl}_${weekId}`;
};

const getSSLQuarterCacheKey = (ssl, language = DEFAULT_SSL_LANGUAGE) => {
  return `${normalizeLanguage(language)}_${ssl}_quarter`;
};

const buildSSLApiBaseUrl = language =>
  `https://sabbath-school-stage.adventech.io/api/v2/${normalizeLanguage(
    language,
  )}`;

const fetchJson = async url => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
};

/**
 * Save an SSL lesson to cache
 * @param {String} ssl - The SSL quarter path
 * @param {String} weekId - The week ID
 * @param {Object} lessonData - The SSL lesson data (SSLWeek)
 * @param {Object} quarterData - The SSL quarter data (SSLQuarter)
 * @param {String} language - The current SSL language
 * @param {String} day - The lesson day ID (01-07)
 */
export const saveSSLLessonToCache = async (
  ssl,
  weekId,
  lessonData,
  quarterData,
  language = DEFAULT_SSL_LANGUAGE,
  day,
) => {
  try {
    if (!ssl || !weekId) {
      console.warn('Cannot cache SSL lesson: missing ssl or weekId');
      return;
    }

    // Load existing cache
    const existingCache = await getSSLCache();
    const cache = existingCache || {};

    // Create cache entry
    const cacheKey = getSSLCacheKey(ssl, weekId, language);
    const existingEntry = cache[cacheKey] || {};
    const days = {...(existingEntry.days || {})};

    if (day && lessonData) {
      days[day] = lessonData;
    }

    cache[cacheKey] = {
      ...existingEntry,
      ssl,
      weekId,
      language: normalizeLanguage(language),
      lessonData:
        day === '01' || !existingEntry.lessonData
          ? lessonData || existingEntry.lessonData || null
          : existingEntry.lessonData,
      quarterData: quarterData || existingEntry.quarterData || null,
      days,
      cachedAt: new Date().toISOString(),
    };

    // Save back to AsyncStorage
    await AsyncStorage.setItem(SSL_CACHE_KEY, JSON.stringify(cache));

    const lessonTitle = lessonData?.title || weekId;
    console.log(`✅ Cached SSL lesson: ${ssl} - Week ${weekId} - ${lessonTitle}`);
  } catch (error) {
    console.error('Error saving SSL lesson to cache:', error);
  }
};

/**
 * Get a cached SSL lesson by ssl and weekId
 * @param {String} ssl - The SSL quarter path
 * @param {String} weekId - The week ID
 * @param {String} language - The current SSL language
 * @returns {Object|null} - The cached lesson data or null if not found/expired
 */
export const getCachedSSLLesson = async (
  ssl,
  weekId,
  language = DEFAULT_SSL_LANGUAGE,
) => {
  try {
    const cache = await getSSLCache();
    if (!cache) {
      return null;
    }

    const cacheKey = getSSLCacheKey(ssl, weekId, language);
    const legacyCacheKey = getLegacySSLCacheKey(ssl, weekId);
    const cachedLesson = cache[cacheKey] || cache[legacyCacheKey];
    const usedCacheKey = cache[cacheKey] ? cacheKey : legacyCacheKey;

    if (!cachedLesson) {
      return null;
    }

    // Check if cache is expired
    if (isCacheEntryExpired(cachedLesson.cachedAt)) {
      console.log(`Cache expired for SSL lesson: ${ssl} - Week ${weekId}`);
      // Remove expired lesson
      delete cache[usedCacheKey];
      await AsyncStorage.setItem(SSL_CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    return cachedLesson;
  } catch (error) {
    console.error('Error getting cached SSL lesson:', error);
    return null;
  }
};

export const saveSSLQuarterToCache = async (
  ssl,
  quarterData,
  language = DEFAULT_SSL_LANGUAGE,
) => {
  try {
    if (!ssl || !quarterData) {
      console.warn('Cannot cache SSL quarter: missing ssl or quarterData');
      return;
    }

    const cache = (await getSSLCache()) || {};
    const cacheKey = getSSLQuarterCacheKey(ssl, language);
    cache[cacheKey] = {
      ssl,
      language: normalizeLanguage(language),
      type: 'quarter',
      quarterData,
      cachedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(SSL_CACHE_KEY, JSON.stringify(cache));
    console.log(`✅ Cached SSL quarter: ${ssl}`);
  } catch (error) {
    console.error('Error saving SSL quarter to cache:', error);
  }
};

export const getCachedSSLQuarter = async (
  ssl,
  language = DEFAULT_SSL_LANGUAGE,
) => {
  try {
    const cache = await getSSLCache();
    const normalizedLanguage = normalizeLanguage(language);
    const cacheKey = getSSLQuarterCacheKey(ssl, language);
    const cachedQuarter = cache?.[cacheKey];

    if (cachedQuarter) {
      if (isCacheEntryExpired(cachedQuarter.cachedAt)) {
        delete cache[cacheKey];
        await AsyncStorage.setItem(SSL_CACHE_KEY, JSON.stringify(cache));
        return null;
      }

      return cachedQuarter.quarterData || null;
    }

    const fallbackEntry = Object.keys(cache || {})
      .map(key => ({key, entry: cache[key]}))
      .find(({key, entry}) => {
        if (!entry || entry.type === 'quarter' || entry.ssl !== ssl) {
          return false;
        }

        if (isCacheEntryExpired(entry.cachedAt)) {
          return false;
        }

        const isMatchingLanguage =
          entry.language === normalizedLanguage ||
          (!entry.language && key === getLegacySSLCacheKey(ssl, entry.weekId));

        return isMatchingLanguage && Array.isArray(entry.quarterData?.lessons);
      });

    return fallbackEntry?.entry?.quarterData || null;
  } catch (error) {
    console.error('Error getting cached SSL quarter:', error);
    return null;
  }
};

export const getCachedSSLQuarterLessonIds = async (
  ssl,
  language = DEFAULT_SSL_LANGUAGE,
) => {
  try {
    const cache = await getSSLCache();
    const normalizedLanguage = normalizeLanguage(language);
    const lessonIds = [];
    let didCleanExpired = false;

    Object.keys(cache || {}).forEach(cacheKey => {
      const entry = cache[cacheKey];

      if (!entry || entry.type === 'quarter') {
        return;
      }

      if (isCacheEntryExpired(entry.cachedAt)) {
        delete cache[cacheKey];
        didCleanExpired = true;
        return;
      }

      const isMatchingEntry =
        entry.ssl === ssl &&
        (entry.language === normalizedLanguage ||
          (!entry.language && cacheKey === getLegacySSLCacheKey(ssl, entry.weekId)));

      if (
        isMatchingEntry &&
        entry.weekId &&
        (entry.lessonData || entry.quarterData || Object.keys(entry.days || {}).length)
      ) {
        lessonIds.push(entry.weekId);
      }
    });

    if (didCleanExpired) {
      await AsyncStorage.setItem(SSL_CACHE_KEY, JSON.stringify(cache));
    }

    return lessonIds;
  } catch (error) {
    console.error('Error getting cached SSL quarter lesson IDs:', error);
    return [];
  }
};

export const cacheSSLQuarterData = async ({
  ssl,
  quarterData,
  language = DEFAULT_SSL_LANGUAGE,
}) => {
  if (!ssl || !quarterData) {
    return {lessonsCached: 0, daysCached: 0};
  }

  await saveSSLQuarterToCache(ssl, quarterData, language);

  const lessons = Array.isArray(quarterData?.lessons)
    ? quarterData.lessons
    : [];
  const baseUrl = buildSSLApiBaseUrl(language);
  let lessonsCached = 0;
  let daysCached = 0;

  for (const lesson of lessons) {
    const weekId = lesson?.id;

    if (!weekId) {
      continue;
    }

    let lessonIndex = null;

    try {
      lessonIndex = await fetchJson(
        `${baseUrl}/quarterlies/${ssl}/lessons/${weekId}/index.json`,
      );
      lessonsCached += 1;
    } catch (error) {
      console.warn(`Unable to cache SSL lesson index ${ssl}/${weekId}:`, error);
    }

    await saveSSLLessonToCache(
      ssl,
      weekId,
      null,
      lessonIndex || quarterData,
      language,
    );

    for (let dayIndex = 1; dayIndex <= 7; dayIndex += 1) {
      const day = String(dayIndex).padStart(2, '0');

      try {
        const dayData = await fetchJson(
          `${baseUrl}/quarterlies/${ssl}/lessons/${weekId}/days/${day}/read/index.json`,
        );
        await saveSSLLessonToCache(
          ssl,
          weekId,
          dayData,
          lessonIndex || quarterData,
          language,
          day,
        );
        daysCached += 1;
      } catch (error) {
        console.warn(
          `Unable to cache SSL lesson day ${ssl}/${weekId}/${day}:`,
          error,
        );
      }
    }
  }

  return {lessonsCached, daysCached};
};

/**
 * Get all cached SSL lessons
 * @returns {Object} - Object with cache keys as keys
 */
export const getSSLCache = async () => {
  try {
    const cacheString = await AsyncStorage.getItem(SSL_CACHE_KEY);
    if (!cacheString) {
      return {};
    }
    return JSON.parse(cacheString);
  } catch (error) {
    console.error('Error getting SSL cache:', error);
    return {};
  }
};

/**
 * Get SSL cache statistics
 * @returns {Object} - Cache stats including count, size, oldest, newest
 */
export const getSSLCacheStats = async () => {
  try {
    const cache = await getSSLCache();
    const lessonKeys = Object.keys(cache);
    const lessons = Object.values(cache);

    if (lessons.length === 0) {
      return {
        count: 0,
        size: 0,
        sizeFormatted: '0 KB',
        oldest: null,
        newest: null,
      };
    }

    // Calculate size
    const cacheString = JSON.stringify(cache);
    const sizeInBytes = new Blob([cacheString]).size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);

    // Find oldest and newest
    const sortedByDate = lessons.sort(
      (a, b) =>
        new Date(a.cachedAt || 0) - new Date(b.cachedAt || 0),
    );
    const oldest = sortedByDate[0];
    const newest = sortedByDate[sortedByDate.length - 1];

    return {
      count: lessons.length,
      size: sizeInBytes,
      sizeFormatted: `${sizeInKB} KB`,
      oldest: oldest?.cachedAt || null,
      newest: newest?.cachedAt || null,
      lessonKeys,
    };
  } catch (error) {
    console.error('Error getting SSL cache stats:', error);
    return {
      count: 0,
      size: 0,
      sizeFormatted: '0 KB',
      oldest: null,
      newest: null,
    };
  }
};

/**
 * Clear all cached SSL lessons
 */
export const clearSSLCache = async () => {
  try {
    await AsyncStorage.removeItem(SSL_CACHE_KEY);
    console.log('✅ Cleared SSL lesson cache');
  } catch (error) {
    console.error('Error clearing SSL cache:', error);
  }
};

/**
 * Remove expired SSL lessons from cache
 */
export const cleanExpiredSSLCache = async () => {
  try {
    const cache = await getSSLCache();
    const now = new Date();
    let cleaned = 0;

    Object.keys(cache).forEach(cacheKey => {
      const lesson = cache[cacheKey];
      const cachedAt = new Date(lesson.cachedAt);
      const daysSinceCache =
        (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceCache > SSL_CACHE_EXPIRY_DAYS) {
        delete cache[cacheKey];
        cleaned++;
      }
    });

    if (cleaned > 0) {
      await AsyncStorage.setItem(SSL_CACHE_KEY, JSON.stringify(cache));
      console.log(`✅ Cleaned ${cleaned} expired SSL lessons from cache`);
    }

    return cleaned;
  } catch (error) {
    console.error('Error cleaning expired SSL cache:', error);
    return 0;
  }
};
