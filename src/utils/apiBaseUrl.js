const PRODUCTION_BASE_URL = 'https://ezrabackend.online/';

const ensureTrailingSlash = value =>
  value.endsWith('/') ? value : `${value}/`;

export const getApiBaseUrl = async () => ensureTrailingSlash(PRODUCTION_BASE_URL);
