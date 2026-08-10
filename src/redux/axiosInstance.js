import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const persistAuthenticatedUser = async user => {
  if (!user) {
    return;
  }

  await AsyncStorage.setItem('user', JSON.stringify(user));
  await AsyncStorage.setItem('token', user?.token || '');
};

const getStoredUser = async () => {
  try {
    const userString = await AsyncStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  } catch {
    return null;
  }
};

function createAxiosInstance(token) {
  const instance = axios.create({
    // baseURL: 'http://localhost:5100',
    baseURL: 'https://ezrabackend.online/',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });

  instance.interceptors.request.use(async config => {
    const storedUser = await getStoredUser();
    const nextToken = storedUser?.token || token;

    if (nextToken) {
      config.headers.Authorization = `Bearer ${nextToken}`;
    }

    return config;
  });

  instance.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      if (error?.response?.status !== 401 || originalRequest?._retry) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const storedUser = await getStoredUser();
      const refreshToken = storedUser?.refreshToken;

      if (!refreshToken) {
        await AsyncStorage.multiRemove(['user', 'token']);
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(
          'https://ezrabackend.online/users/refresh-token',
          {refreshToken},
        );

        await persistAuthenticatedUser(refreshResponse.data);
        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
        return instance(originalRequest);
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['user', 'token']);
        return Promise.reject(refreshError);
      }
    },
  );

  return instance;
}

export default createAxiosInstance;
