import {Platform} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  appleAuth,
  appleAuthAndroid,
} from '@invertase/react-native-apple-authentication';

let configuredGoogleSignature = '';

const buildName = (firstName, lastName, fallbackName) => {
  const joined = [firstName, lastName].filter(Boolean).join(' ').trim();
  return joined || fallbackName || '';
};

export const configureGoogleProvider = ({webClientId, iosClientId}) => {
  const signature = `${webClientId || ''}:${iosClientId || ''}`;

  if (!webClientId || signature === configuredGoogleSignature) {
    return;
  }

  if (Platform.OS === 'ios' && !iosClientId) {
    throw new Error(
      'Google iOS client ID is missing. Set GOOGLE_IOS_CLIENT_ID on the backend and redeploy it before using Google sign-in on iPhone.',
    );
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

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices();
  }

  const response = await GoogleSignin.signIn();
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

export const signInWithAppleProvider = async ({serviceId, redirectUri}) => {
  if (Platform.OS === 'ios') {
    if (!appleAuth.isSupported) {
      throw new Error('Apple Sign-In is not supported on this device.');
    }

    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });

    if (!response.identityToken) {
      throw new Error('Apple did not return an identity token.');
    }

    return {
      provider: 'apple',
      idToken: response.identityToken,
      nonce: response.nonce,
      profile: {
        givenName: response.fullName?.givenName,
        familyName: response.fullName?.familyName,
        name: buildName(
          response.fullName?.givenName,
          response.fullName?.familyName,
          '',
        ),
        email: response.email,
        photo: null,
      },
    };
  }

  if (!appleAuthAndroid?.isSupported) {
    throw new Error('Apple Sign-In is not supported on this device.');
  }

  if (!serviceId || !redirectUri) {
    throw new Error('Apple Sign-In is not configured for Android.');
  }

  appleAuthAndroid.configure({
    clientId: serviceId,
    redirectUri,
    responseType: appleAuthAndroid.ResponseType.ALL,
    scope: appleAuthAndroid.Scope.ALL,
  });

  const response = await appleAuthAndroid.signIn();

  if (!response.id_token) {
    throw new Error('Apple did not return an identity token.');
  }

  return {
    provider: 'apple',
    idToken: response.id_token,
    nonce: response.nonce,
    profile: {
      givenName: response.user?.name?.firstName,
      familyName: response.user?.name?.lastName,
      name: buildName(
        response.user?.name?.firstName,
        response.user?.name?.lastName,
        '',
      ),
      email: response.user?.email,
      photo: null,
    },
  };
};

export const isSocialAuthCancelled = error =>
  error?.code === statusCodes.SIGN_IN_CANCELLED ||
  error?.code === appleAuth.Error.CANCELED ||
  error?.code === appleAuthAndroid?.Error?.SIGNIN_CANCELLED;

export const clearGoogleProviderSession = async () => {
  try {
    if (GoogleSignin.hasPreviousSignIn()) {
      await GoogleSignin.signOut();
    }
  } catch {}
};
