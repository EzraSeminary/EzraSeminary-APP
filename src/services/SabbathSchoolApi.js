import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';

// Track logged errors to prevent spam
const loggedErrors = new Set();
const ERROR_LOG_TIMEOUT = 60000; // Clear error log after 60 seconds

const baseQueryWithLanguage = async (args, api, extraOptions) => {
  const language = api.getState().language.language;
  const baseUrl = `https://sabbath-school-stage.adventech.io/api/v2/${language}`;
  const rawBaseQuery = fetchBaseQuery({baseUrl});

  const result = await rawBaseQuery(args, api, extraOptions);

  // Check for parsing errors (HTML responses instead of JSON)
  if (result.error && result.error.status === 'PARSING_ERROR') {
    const errorKey = `SSL-${JSON.stringify(args)}`;

    // Only log once per error key within timeout period
    if (!loggedErrors.has(errorKey)) {
      console.warn(
        '⚠️ SSL: Content not available (API returned non-JSON response)',
      );
      loggedErrors.add(errorKey);

      // Clear this error from the log after timeout
      setTimeout(() => {
        loggedErrors.delete(errorKey);
      }, ERROR_LOG_TIMEOUT);
    }

    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: 'Content not available',
        data: 'The requested lesson data is not available yet. This usually happens at the start of a new quarter.',
      },
    };
  }

  // Filter the data to exclude lessons with multiple hyphens in their id
  if (result.data && Array.isArray(result.data)) {
    result.data = result.data.filter(item => {
      const hyphenCount = (item.id.match(/-/g) || []).length;
      return hyphenCount <= 1; // Keep items with 0 or 1 hyphen
    });
  }

  return result;
};

export const SSLapi = createApi({
  reducerPath: 'SSLapi',
  baseQuery: baseQueryWithLanguage,
  tagTypes: ['SSL', 'SSLQuarter', 'SSLDay', 'SSLDayLesson'],
  endpoints: builder => ({
    getSSLs: builder.query({
      query: () => `quarterlies/index.json`,
      providesTags: ['SSL'],
    }),
    getSSLOfQuarter: builder.query({
      query: quarter => `quarterlies/${quarter}/index.json`,
      providesTags: (result, error, quarter) => [
        {type: 'SSLQuarter', id: quarter},
      ],
    }),
    getSSLOfDay: builder.query({
      query: ({path, id}) => `quarterlies/${path}/lessons/${id}/index.json`,
      providesTags: (result, error, {path, id}) => [
        {type: 'SSLDay', id: `${path}-${id}`},
      ],
    }),
    getSSLOfDayLesson: builder.query({
      query: ({path, id, day}) => {
        return `quarterlies/${path}/lessons/${id}/days/${day}/read/index.json`;
      },
      providesTags: (result, error, {path, id, day}) => [
        {type: 'SSLDayLesson', id: `${path}-${id}-${day}`},
      ],
    }),
    // Add a mutation to invalidate all SSL caches
    invalidateSSLCache: builder.mutation({
      query: () => ({
        url: 'quarterlies/index.json',
        method: 'GET',
        // Force fresh data by adding timestamp
        params: {_t: Date.now()},
      }),
      invalidatesTags: ['SSL', 'SSLQuarter', 'SSLDay', 'SSLDayLesson'],
      // Force refetch even if cached
      forceRefetch: true,
    }),
  }),
});

export const {
  useGetSSLsQuery,
  useGetSSLOfQuarterQuery,
  useGetSSLOfDayQuery,
  useGetSSLOfDayLessonQuery,
  useInvalidateSSLCacheMutation,
  usePrefetch,
} = SSLapi;

// For backward compatibility
export const SabbathSchoolApi = SSLapi;
