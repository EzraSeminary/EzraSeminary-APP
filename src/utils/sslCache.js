import AsyncStorage from '@react-native-async-storage/async-storage';

const SSL_CACHE_KEY = 'ssl_lesson_cache';
const SSL_CACHE_EXPIRY_DAYS = 30; // Cache expires after 30 days

/**
 * Generate a unique cache key for an SSL lesson
 * @param {String} ssl - The SSL quarter path (e.g., "2024-Q1")
 * @param {String} weekId - The week ID
 * @returns {String} - Unique cache key
 */
const getSSLCacheKey = (ssl, weekId) => {
  return `${ssl}_${weekId}`;
};

/**
 * Save an SSL lesson to cache
 * @param {String} ssl - The SSL quarter path
 * @param {String} weekId - The week ID
 * @param {Object} lessonData - The SSL lesson data (SSLWeek)
 * @param {Object} quarterData - The SSL quarter data (SSLQuarter)
 */
export const saveSSLLessonToCache = async (ssl, weekId, lessonData, quarterData) => {
  try {
    if (!ssl || !weekId) {
      console.warn('Cannot cache SSL lesson: missing ssl or weekId');
      return;
    }

    // Load existing cache
    const existingCache = await getSSLCache();
    const cache = existingCache || {};

    // Create cache entry
    const cacheKey = getSSLCacheKey(ssl, weekId);
    cache[cacheKey] = {
      ssl,
      weekId,
      lessonData: lessonData || null,
      quarterData: quarterData || null,
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
 * @returns {Object|null} - The cached lesson data or null if not found/expired
 */
export const getCachedSSLLesson = async (ssl, weekId) => {
  try {
    const cache = await getSSLCache();
    if (!cache) {
      return null;
    }

    const cacheKey = getSSLCacheKey(ssl, weekId);
    const cachedLesson = cache[cacheKey];

    if (!cachedLesson) {
      return null;
    }

    const cachedAt = new Date(cachedLesson.cachedAt);
    const now = new Date();
    const daysSinceCache =
      (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);

    // Check if cache is expired
    if (daysSinceCache > SSL_CACHE_EXPIRY_DAYS) {
      console.log(`Cache expired for SSL lesson: ${ssl} - Week ${weekId}`);
      // Remove expired lesson
      delete cache[cacheKey];
      await AsyncStorage.setItem(SSL_CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    return cachedLesson;
  } catch (error) {
    console.error('Error getting cached SSL lesson:', error);
    return null;
  }
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
