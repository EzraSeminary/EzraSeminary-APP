import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEYS = [
  'token',
  'user',
  'userProfile',
  'authData',
  'authProvider',
  'pending_course_progress',
];

const SESSION_KEY_PREFIXES = [
  'persist:root',
  'google_link_confirmed_',
  'home_data_cache',
  'course_list_cache',
  'course_cache_',
];

export const clearLocalUserSession = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const keysToRemove = keys.filter(
    key =>
      SESSION_KEYS.includes(key) ||
      SESSION_KEY_PREFIXES.some(prefix => key.startsWith(prefix)),
  );

  if (keysToRemove.length > 0) {
    await AsyncStorage.multiRemove(keysToRemove);
  }
};
