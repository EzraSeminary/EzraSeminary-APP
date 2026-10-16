import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import {getSecureSession, saveSecureSession} from './secureSession';

describe('secureSession', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    Keychain.getGenericPassword.mockResolvedValue(false);
    Keychain.setGenericPassword.mockResolvedValue(true);
  });

  it('keeps an existing legacy session usable when the native module is missing', async () => {
    const legacySession = {
      _id: 'reader-id',
      email: 'reader@example.com',
      token: 'legacy-access-token',
      refreshToken: 'legacy-refresh-token',
    };
    await AsyncStorage.setItem('user', JSON.stringify(legacySession));
    Keychain.getGenericPassword.mockRejectedValueOnce(
      new TypeError(
        "Cannot read property 'getGenericPasswordForOptions' of null",
      ),
    );

    await expect(getSecureSession()).resolves.toEqual(legacySession);
    expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
  });

  it('reports a native rebuild requirement instead of the bridge error', async () => {
    Keychain.setGenericPassword.mockRejectedValueOnce(
      new TypeError(
        "Cannot read property 'setGenericPasswordForOptions' of null",
      ),
    );

    await expect(
      saveSecureSession({token: 'access-token', refreshToken: 'refresh-token'}),
    ).rejects.toThrow(
      'Secure credential storage is unavailable. Rebuild and reinstall the native app before signing in.',
    );
  });
});
