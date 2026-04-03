import AsyncStorage from '@react-native-async-storage/async-storage';

const HOME_SCREEN_CACHE_KEY = 'home_screen_cache';
const CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours

/**
 * Save home screen data to cache
 * @param {String} screenName - Name of the home screen (e.g., 'Devotion', 'SSLHome', 'InVerseHome', 'DevotionPlans')
 * @param {Object} data - The data to cache
 */
export const saveHomeScreenToCache = async (screenName, data) => {
  try {
    if (!screenName || !data) {
      console.warn('Cannot cache home screen: missing screenName or data');
      return;
    }

    // Load existing cache
    const existingCache = await getHomeScreenCache();
    const cache = existingCache || {};

    // Create cache entry
    cache[screenName] = {
      data,
      cachedAt: new Date().toISOString(),
    };

    // Save back to AsyncStorage
    await AsyncStorage.setItem(HOME_SCREEN_CACHE_KEY, JSON.stringify(cache));

    console.log(`✅ Cached home screen data: ${screenName}`);
  } catch (error) {
    console.error('Error saving home screen to cache:', error);
  }
};

/**
 * Get cached home screen data
 * @param {String} screenName - Name of the home screen
 * @returns {Object|null} - The cached data or null if not found/expired
 */
export const getCachedHomeScreen = async screenName => {
  try {
    const cache = await getHomeScreenCache();
    if (!cache || !cache[screenName]) {
      return null;
    }

    const cachedItem = cache[screenName];
    const cachedAt = new Date(cachedItem.cachedAt);
    const now = new Date();
    const hoursSinceCache =
      (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);

    // Check if cache is expired
    if (hoursSinceCache > CACHE_EXPIRY_HOURS) {
      console.log(`Cache expired for home screen: ${screenName}`);
      // Remove expired item
      delete cache[screenName];
      await AsyncStorage.setItem(HOME_SCREEN_CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    return cachedItem.data;
  } catch (error) {
    console.error('Error getting cached home screen:', error);
    return null;
  }
};

/**
 * Get all cached home screens
 * @returns {Object} - Object with screen names as keys
 */
export const getHomeScreenCache = async () => {
  try {
    const cacheString = await AsyncStorage.getItem(HOME_SCREEN_CACHE_KEY);
    if (!cacheString) {
      return {};
    }
    return JSON.parse(cacheString);
  } catch (error) {
    console.error('Error getting home screen cache:', error);
    return {};
  }
};

/**
 * Get home screen cache statistics
 * @returns {Object} - Cache stats including count, size, oldest, newest
 */
export const getHomeScreenCacheStats = async () => {
  try {
    const cache = await getHomeScreenCache();
    const screenKeys = Object.keys(cache);
    const screens = Object.values(cache);

    if (screens.length === 0) {
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
    const sortedByDate = screens.sort(
      (a, b) => new Date(a.cachedAt || 0) - new Date(b.cachedAt || 0),
    );
    const oldest = sortedByDate[0];
    const newest = sortedByDate[sortedByDate.length - 1];

    return {
      count: screens.length,
      size: sizeInBytes,
      sizeFormatted: `${sizeInKB} KB`,
      oldest: oldest?.cachedAt || null,
      newest: newest?.cachedAt || null,
      screenKeys,
    };
  } catch (error) {
    console.error('Error getting home screen cache stats:', error);
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
 * Clear all cached home screens
 */
export const clearHomeScreenCache = async () => {
  try {
    await AsyncStorage.removeItem(HOME_SCREEN_CACHE_KEY);
    console.log('✅ Cleared home screen cache');
  } catch (error) {
    console.error('Error clearing home screen cache:', error);
  }
};

/**
 * Clear a specific cached home screen entry
 * @param {String} screenName - Name of the home screen to clear
 */
export const clearCachedHomeScreen = async screenName => {
  try {
    if (!screenName) return;
    const cache = await getHomeScreenCache();
    if (!cache || !cache[screenName]) return;
    delete cache[screenName];
    await AsyncStorage.setItem(HOME_SCREEN_CACHE_KEY, JSON.stringify(cache));
    console.log(`✅ Cleared home screen cache entry: ${screenName}`);
  } catch (error) {
    console.error('Error clearing cached home screen entry:', error);
  }
};

/**
 * Remove expired home screen caches
 */
export const cleanExpiredHomeScreenCache = async () => {
  try {
    const cache = await getHomeScreenCache();
    const now = new Date();
    let cleaned = 0;

    Object.keys(cache).forEach(screenName => {
      const item = cache[screenName];
      const cachedAt = new Date(item.cachedAt);
      const hoursSinceCache =
        (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCache > CACHE_EXPIRY_HOURS) {
        delete cache[screenName];
        cleaned++;
      }
    });

    if (cleaned > 0) {
      await AsyncStorage.setItem(HOME_SCREEN_CACHE_KEY, JSON.stringify(cache));
      console.log(`✅ Cleaned ${cleaned} expired home screen caches`);
    }

    return cleaned;
  } catch (error) {
    console.error('Error cleaning expired home screen cache:', error);
    return 0;
  }
};
