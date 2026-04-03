import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules, Platform} from 'react-native';

const API_PORT = '5100';
const PRODUCTION_BASE_URL = 'https://ezrabackend.online/';
const LOCALHOST_BASE_URL = `http://localhost:${API_PORT}/`;
const ANDROID_EMULATOR_BASE_URL = `http://10.0.2.2:${API_PORT}/`;

const ensureTrailingSlash = value =>
  value.endsWith('/') ? value : `${value}/`;

const isLocalOnlyHost = value => {
  const normalized = String(value || '').toLowerCase();
  return (
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('10.0.2.2')
  );
};

const parseHostFromScriptUrl = scriptUrl => {
  if (!scriptUrl || typeof scriptUrl !== 'string') {
    return '';
  }

  const match = scriptUrl.match(/^[a-zA-Z]+:\/\/([^/:?#]+)(?::\d+)?/);
  return match?.[1] || '';
};

const resolveDefaultBaseUrl = () => {
  if (!__DEV__) {
    return PRODUCTION_BASE_URL;
  }

  const scriptUrl = NativeModules?.SourceCode?.scriptURL;
  const metroHost = parseHostFromScriptUrl(scriptUrl);

  if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
    return `http://${metroHost}:${API_PORT}/`;
  }

  if (Platform.OS === 'android') {
    return ANDROID_EMULATOR_BASE_URL;
  }

  return LOCALHOST_BASE_URL;
};

export const getApiBaseUrl = async () => {
  try {
    const override = await AsyncStorage.getItem('apiBaseUrl');
    if (override && typeof override === 'string') {
      // Prevent stale local overrides from breaking production builds.
      if (!__DEV__ && isLocalOnlyHost(override)) {
        return PRODUCTION_BASE_URL;
      }
      return ensureTrailingSlash(override);
    }
  } catch {}

  return resolveDefaultBaseUrl();
};
