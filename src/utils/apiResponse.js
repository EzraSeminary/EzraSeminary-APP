// Utility helpers to normalize API responses that may vary in shape
// Ensures components always receive arrays instead of mixed shapes

export const normalizeArrayResponse = response => {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== 'object') return [];
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.devotions)) return response.devotions;
  if (Array.isArray(response.courses)) return response.courses;
  return [];
};

export const normalizeDevotionsResponse = response => {
  return normalizeArrayResponse(response);
};

export const normalizeCoursesResponse = response => {
  return normalizeArrayResponse(response);
};
