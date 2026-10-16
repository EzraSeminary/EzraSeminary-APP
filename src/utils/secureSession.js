import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const SERVICE = 'online.ezrabackend.mobile.session';

const secureStorageUnavailableError = error => {
  const unavailable = new Error(
    'Secure credential storage is unavailable. Rebuild and reinstall the native app before signing in.',
  );
  unavailable.cause = error;
  return unavailable;
};

export const publicUser = user => {
  if (!user) {
    return null;
  }
  const {token, accessToken, refreshToken, ...profile} = user;
  return profile;
};

export const persistPublicUser = async user => {
  if (!user) {
    return;
  }
  await AsyncStorage.setItem('user', JSON.stringify(publicUser(user)));
  await AsyncStorage.removeItem('token');
};

export const saveSecureSession = async session => {
  if (!session) {
    return null;
  }
  const credentials = {
    token: session.token || session.accessToken || '',
    accessToken: session.accessToken || session.token || '',
    refreshToken: session.refreshToken || '',
  };
  try {
    await Keychain.setGenericPassword(
      'ezra-user',
      JSON.stringify(credentials),
      {
        service: SERVICE,
        accessible: Keychain.ACCESSIBLE?.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
  } catch (error) {
    throw secureStorageUnavailableError(error);
  }
  await persistPublicUser(session);
  return {...publicUser(session), ...credentials};
};

export const getSecureSession = async () => {
  let profile = null;
  let secureStorageAvailable = true;
  try {
    const raw = await AsyncStorage.getItem('user');
    profile = raw ? JSON.parse(raw) : null;
  } catch {}

  try {
    const credentials = await Keychain.getGenericPassword({service: SERVICE});
    if (credentials) {
      return {...(profile || {}), ...JSON.parse(credentials.password)};
    }
  } catch {
    // A JS-only refresh can load the Keychain wrapper before its native module
    // has been installed. Keep an existing legacy session usable until the
    // rebuilt binary is installed; never create a new plaintext fallback.
    secureStorageAvailable = false;
  }

  if (!secureStorageAvailable) {
    return profile;
  }

  // One-time migration from older releases that stored credentials in plain
  // AsyncStorage. They are removed as soon as Keychain accepts them.
  if (profile?.token || profile?.accessToken || profile?.refreshToken) {
    try {
      return await saveSecureSession(profile);
    } catch {
      return profile;
    }
  }
  return profile;
};

export const clearSecureSession = async () => {
  const resetSecureCredentials = async () => {
    try {
      return await Keychain.resetGenericPassword({service: SERVICE});
    } catch {
      return false;
    }
  };

  await Promise.all([
    resetSecureCredentials(),
    AsyncStorage.multiRemove(['user', 'token']),
  ]);
};
