import {Platform} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

let configuredGoogleSignature = '';

export const configureGoogleProvider = ({webClientId, iosClientId}) => {
  const signature = `${webClientId || ''}:${iosClientId || ''}`;

  if (!webClientId || signature === configuredGoogleSignature) {
    return;
  }

  GoogleSignin.configure({
    webClientId,
    ...(iosClientId ? {iosClientId} : {}),
    scopes: ['email', 'profile'],
  });
  configuredGoogleSignature = signature;
};

export const signInWithGoogleProvider = async ({webClientId, iosClientId}) => {
  if (!webClientId) {
    throw new Error('Google Sign-In is not configured yet.');
  }

  configureGoogleProvider({webClientId, iosClientId});

  let response;
  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices();
    }

    // Reset any stale native session before starting a new interactive flow.
    try {
      if (GoogleSignin.hasPreviousSignIn()) {
        await GoogleSignin.signOut();
      }
    } catch {}

    response = await GoogleSignin.signIn();
  } catch (error) {
    throw error;
  }

  const data =
    response && typeof response === 'object' && 'type' in response
      ? response.type === 'success'
        ? response.data
        : null
      : response;

  if (!data?.idToken) {
    throw new Error('Google did not return an identity token.');
  }

  const user = data.user || {};

  return {
    provider: 'google',
    idToken: data.idToken,
    profile: {
      givenName: user.givenName,
      familyName: user.familyName,
      name: user.name,
      email: user.email,
      photo: user.photo,
    },
  };
};

export const isSocialAuthCancelled = error =>
  error?.code === statusCodes.SIGN_IN_CANCELLED;

export const clearGoogleProviderSession = async () => {
  try {
    if (GoogleSignin.hasPreviousSignIn()) {
      await GoogleSignin.signOut();
    }
  } catch {}
};
