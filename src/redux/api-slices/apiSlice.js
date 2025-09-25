import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom base query with timeout and retry logic
const baseQueryWithTimeout = fetchBaseQuery({
  baseUrl: 'https://ezrabackend.online/', // Replace with your actual base URL
  timeout: 15000, // 15 second timeout
  prepareHeaders: async headers => {
    const userString = await AsyncStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const token = user ? user.token : '';
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Base query with retry logic
const baseQueryWithRetry = async (args, api, extraOptions) => {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const result = await baseQueryWithTimeout(args, api, extraOptions);

      // If successful or it's a 4xx error (client error), return immediately
      if (
        !result.error ||
        (result.error.status >= 400 && result.error.status < 500)
      ) {
        return result;
      }

      // For 5xx errors or network errors, retry
      if (attempt < maxRetries) {
        attempt++;
        // Wait before retrying (exponential backoff)
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
        continue;
      }

      return result;
    } catch (error) {
      if (attempt < maxRetries) {
        attempt++;
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
        continue;
      }

      return {
        error: {
          status: 'FETCH_ERROR',
          error: error.message || 'Network request failed',
        },
      };
    }
  }
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRetry,
  // Add keep unused data for 5 minutes to improve UX
  keepUnusedDataFor: 300,
  tagTypes: ['Devotions', 'Courses', 'User'],
  endpoints: builder => ({
    login: builder.mutation({
      query: credentials => ({
        url: '/users/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: credentials,
      }),
    }),
    signup: builder.mutation({
      query: ({firstName, lastName, email, password}) => ({
        url: '/users/signup',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {firstName, lastName, email, password},
      }),
    }),
    updateUser: builder.mutation({
      query: formData => ({
        url: '/users/profile',
        method: 'PUT',
        body: formData,
      }),
    }),
    getDevotions: builder.query({
      query: ({limit, sort, year} = {}) => {
        const params = {};
        if (limit !== undefined) {
          params.limit = limit;
        }
        if (sort !== undefined) {
          params.sort = sort;
        }
        if (year !== undefined) {
          params.year = year;
        }
        return {
          url: '/devotion/show',
          params,
        };
      },
      providesTags: ['Devotions'],
      // Add stale time to reduce unnecessary refetches
      keepUnusedDataFor: 600, // 10 minutes for devotions
    }),
    getCurrentUser: builder.query({
      query: () => '/users/current',
    }),
    getCourses: builder.query({
      query: () => 'course/getall',
      providesTags: ['Courses'],
    }),
    getCourseById: builder.query({
      query: id => `course/get/${id}`,
      providesTags: (result, error, id) => [{type: 'Courses', id}],
    }),
    updateUserStatus: builder.mutation({
      query: ({id, status}) => ({
        url: `/users/status/${id}`,
        method: 'PUT',
        body: {status},
      }),
    }),
    deleteUser: builder.mutation({
      query: id => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
    }),
  }),
});

export const {
  useSignupMutation,
  useLoginMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetDevotionsQuery,
  useGetCoursesQuery,
  useGetCourseByIdQuery,
  useGetCurrentUserQuery,
  useUpdateUserStatusMutation,
} = apiSlice;
