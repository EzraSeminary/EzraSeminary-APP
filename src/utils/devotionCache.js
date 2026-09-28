import AsyncStorage from '@react-native-async-storage/async-storage';
import {extractHtmlBlocks} from './htmlBlocks';

const DEVOTION_CACHE_KEY = 'devotion_cache';
const DEVOTION_CACHE_EXPIRY_DAYS = 30; // Cache expires after 30 days

export const normalizeDevotionForHighlighting = devotion => {
  if (!devotion) {
    return devotion;
  }

  const bodyBlocks =
    Array.isArray(devotion.bodyBlocks) && devotion.bodyBlocks.length > 0
      ? devotion.bodyBlocks
      : extractHtmlBlocks(devotion.body || []);

  return {
    ...devotion,
    bodyBlocks,
  };
};

/**
 * Save a devotion to cache
 * @param {Object} devotion - The devotion object to cache
 */
export const saveDevotionToCache = async devotion => {
  try {
    if (!devotion || !devotion._id) {
      console.warn('Cannot cache devotion: missing _id');
      return;
    }

    // Load existing cache
    const existingCache = await getDevotionCache();
    const cache = existingCache || {};

    // Add or update the devotion in cache
    cache[devotion._id] = {
      ...normalizeDevotionForHighlighting(devotion),
      cachedAt: new Date().toISOString(),
    };

    // Save back to AsyncStorage
    await AsyncStorage.setItem(
      DEVOTION_CACHE_KEY,
      JSON.stringify(cache),
    );

    console.log(`✅ Cached devotion: ${devotion._id} - ${devotion.title}`);
  } catch (error) {
    console.error('Error saving devotion to cache:', error);
  }
};

/**
 * Save multiple devotions to cache
 * @param {Array} devotions - Array of devotion objects to cache
 */
export const saveDevotionsToCache = async devotions => {
  try {
    if (!Array.isArray(devotions) || devotions.length === 0) {
      return;
    }

    const existingCache = await getDevotionCache();
    const cache = existingCache || {};

    devotions.forEach(devotion => {
      if (devotion && devotion._id) {
        cache[devotion._id] = {
          ...normalizeDevotionForHighlighting(devotion),
          cachedAt: new Date().toISOString(),
        };
      }
    });

    await AsyncStorage.setItem(
      DEVOTION_CACHE_KEY,
      JSON.stringify(cache),
    );

    console.log(`✅ Cached ${devotions.length} devotions`);
  } catch (error) {
    console.error('Error saving devotions to cache:', error);
  }
};

/**
 * Get a cached devotion by ID
 * @param {String} devotionId - The ID of the devotion to retrieve
 * @returns {Object|null} - The cached devotion or null if not found/expired
 */
export const getCachedDevotion = async devotionId => {
  try {
    const cache = await getDevotionCache();
    if (!cache || !cache[devotionId]) {
      return null;
    }

    const devotion = cache[devotionId];
    const cachedAt = new Date(devotion.cachedAt);
    const now = new Date();
    const daysSinceCache =
      (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);

    // Check if cache is expired
    if (daysSinceCache > DEVOTION_CACHE_EXPIRY_DAYS) {
      console.log(`Cache expired for devotion: ${devotionId}`);
      // Remove expired devotion
      delete cache[devotionId];
      await AsyncStorage.setItem(
        DEVOTION_CACHE_KEY,
        JSON.stringify(cache),
      );
      return null;
    }

    return normalizeDevotionForHighlighting(devotion);
  } catch (error) {
    console.error('Error getting cached devotion:', error);
    return null;
  }
};

/**
 * Get all cached devotions
 * @returns {Object} - Object with devotion IDs as keys
 */
export const getDevotionCache = async () => {
  try {
    const cacheString = await AsyncStorage.getItem(DEVOTION_CACHE_KEY);
    if (!cacheString) {
      return {};
    }
    return JSON.parse(cacheString);
  } catch (error) {
    console.error('Error getting devotion cache:', error);
    return {};
  }
};

/**
 * Get cache statistics
 * @returns {Object} - Cache stats including count, size, oldest, newest
 */
export const getCacheStats = async () => {
  try {
    const cache = await getDevotionCache();
    const devotionIds = Object.keys(cache);
    const devotions = Object.values(cache);

    if (devotions.length === 0) {
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
    const sortedByDate = devotions.sort(
      (a, b) =>
        new Date(a.cachedAt || 0) - new Date(b.cachedAt || 0),
    );
    const oldest = sortedByDate[0];
    const newest = sortedByDate[sortedByDate.length - 1];

    return {
      count: devotions.length,
      size: sizeInBytes,
      sizeFormatted: `${sizeInKB} KB`,
      oldest: oldest?.cachedAt || null,
      newest: newest?.cachedAt || null,
      devotionIds,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
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
 * Clear all cached devotions
 */
export const clearDevotionCache = async () => {
  try {
    await AsyncStorage.removeItem(DEVOTION_CACHE_KEY);
    console.log('✅ Cleared devotion cache');
  } catch (error) {
    console.error('Error clearing devotion cache:', error);
  }
};

/**
 * Remove expired devotions from cache
 */
export const cleanExpiredCache = async () => {
  try {
    const cache = await getDevotionCache();
    const now = new Date();
    let cleaned = 0;

    Object.keys(cache).forEach(devotionId => {
      const devotion = cache[devotionId];
      const cachedAt = new Date(devotion.cachedAt);
      const daysSinceCache =
        (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceCache > DEVOTION_CACHE_EXPIRY_DAYS) {
        delete cache[devotionId];
        cleaned++;
      }
    });

    if (cleaned > 0) {
      await AsyncStorage.setItem(
        DEVOTION_CACHE_KEY,
        JSON.stringify(cache),
      );
      console.log(`✅ Cleaned ${cleaned} expired devotions from cache`);
    }

    return cleaned;
  } catch (error) {
    console.error('Error cleaning expired cache:', error);
    return 0;
  }
};
