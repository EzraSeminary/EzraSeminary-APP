import axios from 'axios';
import {
  clearSecureSession,
  getSecureSession,
  saveSecureSession,
} from '../utils/secureSession';
import {getApiBaseUrlSync} from '../utils/apiBaseUrl';

const persistAuthenticatedUser = async user => {
  if (!user) {
    return;
  }

  await saveSecureSession(user);
};

const getStoredUser = async () => {
  try {
    return await getSecureSession();
  } catch {
    return null;
  }
};

function createAxiosInstance(token) {
  const baseURL = getApiBaseUrlSync();
  const instance = axios.create({
    baseURL,
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
        await clearSecureSession();
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(
          `${baseURL}users/refresh-token`,
          {refreshToken},
        );

        await persistAuthenticatedUser(refreshResponse.data);
        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
        return instance(originalRequest);
      } catch (refreshError) {
        await clearSecureSession();
        return Promise.reject(refreshError);
      }
    },
  );

  return instance;
}

export default createAxiosInstance;
