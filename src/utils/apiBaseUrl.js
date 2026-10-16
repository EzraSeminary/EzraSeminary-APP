const PRODUCTION_BASE_URL = 'https://ezrabackend.online/';

const ensureTrailingSlash = value =>
  value.endsWith('/') ? value : `${value}/`;

/**
 * Metro replaces API_BASE_URL at bundle time in release builds when it is
 * supplied by the build environment. The fallback keeps existing builds
 * pointed at Ezra production. Android developers can set API_BASE_URL to
 * http://10.0.2.2:5100/ and iOS developers can use localhost.
 */
export const getApiBaseUrlSync = () => {
  const configured =
    typeof process !== 'undefined' ? process.env?.API_BASE_URL : undefined;
  return ensureTrailingSlash(configured || PRODUCTION_BASE_URL);
};

export const getApiBaseUrl = async () => getApiBaseUrlSync();

export {PRODUCTION_BASE_URL};
