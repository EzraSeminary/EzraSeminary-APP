import axios from 'axios';

function createAxiosInstance(token) {
  const instance = axios.create({
    // baseURL: 'http://localhost:5100',
    baseURL: 'http://localhost:5100/',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });

  return instance;
}

export default createAxiosInstance;
