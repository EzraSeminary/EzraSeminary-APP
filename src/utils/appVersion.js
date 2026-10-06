import {NativeModules} from 'react-native';
import packageJson from '../../package.json';

const normalizeVersionValue = value => {
  const text = String(value || '').trim();
  return text && text.toLowerCase() !== 'unknown' ? text : '';
};

export const getAppVersion = () =>
  normalizeVersionValue(NativeModules.AppVersion?.versionName) ||
  normalizeVersionValue(packageJson.version) ||
  'Unknown';

export const getAppBuildNumber = () =>
  normalizeVersionValue(NativeModules.AppVersion?.versionCode);
