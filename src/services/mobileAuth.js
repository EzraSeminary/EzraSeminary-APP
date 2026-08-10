import AsyncStorage from '@react-native-async-storage/async-storage';
import {getApiBaseUrl} from '../utils/apiBaseUrl';

export const persistAuthenticatedUser = async ({result, dispatch, login}) => {
  await AsyncStorage.setItem('user', JSON.stringify(result));
  await AsyncStorage.setItem('token', result?.token || '');
  await AsyncStorage.setItem(
    'authProvider',
    String(result?.authProvider || 'email'),
  );
  dispatch(login(result));
};

export const findAccountByEmail = async email => {
  if (!email) {
    return null;
  }

  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}users`);

  if (!response.ok) {
    throw new Error('Unable to verify account availability.');
  }

  const users = await response.json();
  return (
    users.find(
      user => String(user?.email || '').toLowerCase() === email.toLowerCase(),
    ) || null
  );
};

export const normalizeAuthError = error => {
  const message =
    error?.data?.error || error?.message || 'Authentication failed.';

  if (message === 'Email not found') {
    return 'No account is associated with that email address.';
  }

  if (message === 'Password is incorrect') {
    return 'The password is incorrect.';
  }

  if (message === 'Password not set') {
    return 'This account does not have a password yet. Use Google sign-in or create a password-based account.';
  }

  if (message === 'Email already in use') {
    return 'An account with that email already exists.';
  }

  if (message === 'Invalid input') {
    return 'Please complete all required fields.';
  }

  return message;
};

export const buildDetailedAuthError = error => {
  const parts = [];

  if (error?.code !== undefined && error?.code !== null) {
    parts.push(`code: ${String(error.code)}`);
  }

  if (error?.message) {
    parts.push(`message: ${String(error.message)}`);
  }

  if (error?.data?.error) {
    parts.push(`server: ${String(error.data.error)}`);
  }

  if (error?.details) {
    parts.push(`details: ${String(error.details)}`);
  }

  const fallback = (() => {
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return String(error);
    }
  })();

  return parts.length > 0 ? parts.join('\n\n') : fallback;
};

export const validateEmailAddress = email => {
  const value = String(email || '')
    .trim()
    .toLowerCase();

  if (!value) {
    return 'Email is required.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Use a valid email format like name@example.com.';
  }

  return '';
};

export const validatePassword = password => {
  const value = String(password || '');

  if (!value) {
    return 'Password is required.';
  }

  if (value.length < 6) {
    return 'Password must be at least 6 characters.';
  }

  return '';
};

export const validateName = (value, label) => {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return `${label} is required.`;
  }

  if (normalized.length < 2) {
    return `${label} must be at least 2 characters.`;
  }

  if (!/^[a-zA-Z\s'-]+$/.test(normalized)) {
    return `${label} can only include letters, spaces, apostrophes, and hyphens.`;
  }

  return '';
};
