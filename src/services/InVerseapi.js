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
    const errorKey = `InVerse-${JSON.stringify(args)}`;

    // Only log once per error key within timeout period
    if (!loggedErrors.has(errorKey)) {
      console.warn(
        '⚠️ InVerse: Content not available (API returned non-JSON response)',
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

  return result; // No filtering applied here
};

export const InVerseapi = createApi({
  reducerPath: 'InVerseapi',
  baseQuery: baseQueryWithLanguage,
  tagTypes: ['InVerse', 'InVerseQuarter', 'InVerseDay', 'InVerseDayLesson'],
  endpoints: builder => ({
    getInVerses: builder.query({
      query: () => `quarterlies/index.json`,
      providesTags: ['InVerse'],
      transformResponse: response => {
        // Ensure the response is an array or extract the array from the response
        const data = Array.isArray(response) ? response : response.data;

        if (!Array.isArray(data)) {
          console.error('API response is not an array:', data);
          return [];
        }

        return data; // Return the unfiltered data
      },
    }),
    getInVerseOfQuarter: builder.query({
      query: quarter => `quarterlies/${quarter}/index.json`,
      providesTags: (result, error, quarter) => [
        {type: 'InVerseQuarter', id: quarter},
      ],
    }),
    getInVerseOfDay: builder.query({
      query: ({path, id}) => `quarterlies/${path}/lessons/${id}/index.json`,
      providesTags: (result, error, {path, id}) => [
        {type: 'InVerseDay', id: `${path}-${id}`},
      ],
    }),
    getInVerseOfDayLesson: builder.query({
      query: ({path, id, day}) => {
        return `quarterlies/${path}/lessons/${id}/days/${day}/read/index.json`;
      },
      providesTags: (result, error, {path, id, day}) => [
        {type: 'InVerseDayLesson', id: `${path}-${id}-${day}`},
      ],
    }),
    // Add a mutation to invalidate all InVerse caches
    invalidateInVerseCache: builder.mutation({
      query: () => ({
        url: 'quarterlies/index.json',
        method: 'GET',
        // Force fresh data by adding timestamp
        params: {_t: Date.now()},
      }),
      invalidatesTags: [
        'InVerse',
        'InVerseQuarter',
        'InVerseDay',
        'InVerseDayLesson',
      ],
      // Force refetch even if cached
      forceRefetch: true,
    }),
  }),
});

export const {
  useGetInVersesQuery,
  useGetInVerseOfQuarterQuery,
  useGetInVerseOfDayQuery,
  useGetInVerseOfDayLessonQuery,
  useInvalidateInVerseCacheMutation,
  usePrefetch,
} = InVerseapi;
