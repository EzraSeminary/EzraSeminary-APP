import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import {clearCachedHomeScreen} from './homeScreenCache';
import {clearCourseCache} from './courseCache';
import {clearSSLCache} from './sslCache';

const HOME_DATA_CACHE_PREFIX = 'home_data_cache_';

export const ensureOnlineOrNotify = async () => {
  const netInfo = await NetInfo.fetch();
  const hasInternet =
    netInfo.isConnected && netInfo.isInternetReachable !== false;
  if (!hasInternet) {
    Toast.show({
      type: 'info',
      text1: 'Internet Connection Required',
      text2: 'Please connect to the internet to refresh this screen.',
    });
    return false;
  }
  return true;
};

const removeByPrefix = async prefix => {
  const keys = await AsyncStorage.getAllKeys();
  const matchedKeys = keys.filter(key => key.startsWith(prefix));
  if (matchedKeys.length > 0) {
    await AsyncStorage.multiRemove(matchedKeys);
  }
};

export const clearHomeRefreshCache = async ({year, month} = {}) => {
  try {
    if (year && month) {
      await AsyncStorage.removeItem(`home_data_cache_${year}_${month}`);
      return;
    }
    await removeByPrefix(HOME_DATA_CACHE_PREFIX);
  } catch (error) {
    console.error('Error clearing Home refresh cache:', error);
  }
};

export const clearDevotionRefreshCache = async () => {
  try {
    await clearCachedHomeScreen('Devotion');
  } catch (error) {
    console.error('Error clearing Devotion refresh cache:', error);
  }
};

export const clearCourseRefreshCache = async () => {
  try {
    await clearCourseCache();
  } catch (error) {
    console.error('Error clearing Course refresh cache:', error);
  }
};

export const clearSSLRefreshCache = async () => {
  try {
    await clearCachedHomeScreen('SSLHome');
    await clearSSLCache();
  } catch (error) {
    console.error('Error clearing SSL refresh cache:', error);
  }
};

export const clearInVerseRefreshCache = async () => {
  try {
    await clearCachedHomeScreen('InVerseHome');
  } catch (error) {
    console.error('Error clearing InVerse refresh cache:', error);
  }
};
