import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import {normalizeDevotionsResponse} from '../../utils/apiResponse';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dynamic base URL: Production backend is at http://localhost:5100
// For emulator/simulator testing, override via AsyncStorage key 'apiBaseUrl'
// Android emulator: 'http://10.0.2.2:5100/'
// iOS simulator: 'http://localhost:5100/'
const DEFAULT_BASE_URL = 'http://localhost:5100/';

const dynamicBaseQuery = async (args, api, extraOptions) => {
  let baseUrl = DEFAULT_BASE_URL;
  try {
    const override = await AsyncStorage.getItem('apiBaseUrl');
    if (override && typeof override === 'string') {
      baseUrl = override.endsWith('/') ? override : `${override}/`;
    }
  } catch {}

  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    timeout: 60000, // 60 second timeout to prevent AbortError
    prepareHeaders: async headers => {
      let token = api.getState()?.auth?.user?.token || '';
      if (!token) {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        token = user ? user.token : '';
      }
      if (!token) {
        try {
          const storedToken = await AsyncStorage.getItem('token');
          token = storedToken || '';
        } catch {}
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  });

  return rawBaseQuery(args, api, extraOptions);
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: dynamicBaseQuery,
  // Keep unused data for 10 minutes to improve UX and reduce API calls
  keepUnusedDataFor: 600,
  tagTypes: [
    'Devotions',
    'Courses',
    'User',
    'DevotionPlans',
    'DevotionLikes',
    'DevotionComments',
    'ExploreCategories',
    'ExploreItems',
  ],
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
    getAuthProviders: builder.query({
      query: () => '/users/auth/providers',
    }),
    socialAuth: builder.mutation({
      query: body => ({
        url: '/users/auth/social',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
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
      transformResponse: response => normalizeDevotionsResponse(response),
      providesTags: ['Devotions'],
      // Keep devotions data for 15 minutes to reduce API calls
      keepUnusedDataFor: 900,
    }),
    getCurrentUser: builder.query({
      query: () => '/users/current',
    }),
    getCourses: builder.query({
      query: () => 'course/getall',
      providesTags: ['Courses'],
    }),
    getPublishedCourses: builder.query({
      query: ({limit, sort} = {}) => {
        const queryParams = new URLSearchParams();
        if (limit) {
          queryParams.append('limit', limit);
        }
        if (sort) {
          queryParams.append('sort', sort);
        }
        return {
          url: 'course/get/published',
          params: queryParams.toString(),
        };
      },
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
    // Devotion Plans endpoints (according to spec)
    getDevotionPlans: builder.query({
      query: () => '/devotionPlan',
      transformResponse: response => {
        // Backend returns { items: [...], total: number }
        return response?.items || [];
      },
      providesTags: ['DevotionPlans'],
    }),
    getDevotionPlanById: builder.query({
      query: id => `/devotionPlan/${id}`,
      providesTags: (result, error, id) => [{type: 'DevotionPlans', id}],
    }),
    getDevotionPlanDevotions: builder.query({
      query: id => `/devotionPlan/${id}/devotions`,
      transformResponse: (response, meta, arg) => {
        console.log('=== getDevotionPlanDevotions Response ===');
        console.log('Response:', JSON.stringify(response, null, 2));
        console.log('Response type:', typeof response);
        console.log('Is array:', Array.isArray(response));
        // Backend returns { items: [...], total: number, itemCount: number }
        // Or might return array directly
        if (Array.isArray(response)) {
          console.log('Response is array, returning as-is');
          return response;
        }
        if (response?.items && Array.isArray(response.items)) {
          console.log('Response has items array, extracting items');
          return response.items;
        }
        console.log('No valid response format, returning empty array');
        return [];
      },
      providesTags: (result, error, id) => [
        {type: 'DevotionPlans', id},
        {type: 'DevotionPlans', id: `${id}-devotions`},
      ],
    }),
    getMyDevotionPlans: builder.query({
      query: params => {
        const status = params?.status || 'in_progress';
        return {
          url: '/devotionPlan/user',
          params: {status},
        };
      },
      providesTags: ['DevotionPlans'],
    }),
    getDevotionPlanProgress: builder.query({
      query: id => `/devotionPlan/${id}/progress`,
      providesTags: (result, error, id) => [
        {type: 'DevotionPlans', id},
        {type: 'DevotionPlans', id: `${id}-progress`},
      ],
    }),
    startDevotionPlan: builder.mutation({
      query: id => ({
        url: `/devotionPlan/${id}/start`,
        method: 'POST',
      }),
      invalidatesTags: ['DevotionPlans'],
    }),
    updateDevotionPlanProgress: builder.mutation({
      query: ({id, devotionId, completed}) => {
        console.log('=== UPDATE PROGRESS MUTATION ===');
        console.log('planId:', id);
        console.log('devotionId:', devotionId);
        console.log('completed:', completed);
        console.log('================================');
        return {
          url: `/devotionPlan/${id}/progress`,
          method: 'PUT',
          body: {
            devotionId: String(devotionId), // Ensure devotionId is a string
            completed: Boolean(completed), // Ensure completed is a boolean
          },
        };
      },
      transformResponse: (response, meta, arg) => {
        console.log('=== UPDATE PROGRESS RESPONSE ===');
        console.log('Response:', JSON.stringify(response, null, 2));
        console.log('Response type:', typeof response);
        console.log('Status:', meta?.response?.status);
        console.log('================================');
        return response;
      },
      transformErrorResponse: (response, meta, arg) => {
        console.error('=== UPDATE PROGRESS ERROR RESPONSE ===');
        console.error('Error response:', JSON.stringify(response, null, 2));
        console.error('Status:', meta?.response?.status);
        console.error('Status text:', meta?.response?.statusText);
        console.error('=====================================');
        return response;
      },
      invalidatesTags: (result, error, {id}) => [
        {type: 'DevotionPlans', id},
        {type: 'DevotionPlans', id: `${id}-progress`},
        'DevotionPlans', // Invalidate all DevotionPlans queries to refresh getMyDevotionPlans
      ],
    }),
    restartDevotionPlan: builder.mutation({
      query: id => ({
        url: `/devotionPlan/${id}/restart`,
        method: 'POST',
      }),
      invalidatesTags: ['DevotionPlans'],
    }),
    // Devotion Likes and Comments endpoints
    toggleDevotionLike: builder.mutation({
      query: id => ({
        url: `/devotion/${id}/like`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        {type: 'DevotionLikes', id},
        {type: 'Devotions', id},
        'Devotions',
      ],
    }),
    getDevotionLikes: builder.query({
      query: id => `/devotion/${id}/likes`,
      providesTags: (result, error, id) => [{type: 'DevotionLikes', id}],
      // Refetch when user logs in (don't skip based on user, but handle in component)
    }),
    trackDevotionShare: builder.mutation({
      query: id => ({
        url: `/devotion/${id}/share`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        {type: 'Devotions', id},
        'Devotions',
      ],
    }),
    getDevotionComments: builder.query({
      query: id => `/devotion/${id}/comments`,
      providesTags: (result, error, id) => [{type: 'DevotionComments', id}],
    }),
    addDevotionComment: builder.mutation({
      query: ({id, text}) => ({
        url: `/devotion/${id}/comments`,
        method: 'POST',
        body: {text},
      }),
      invalidatesTags: (result, error, {id}) => [
        {type: 'DevotionComments', id},
        {type: 'Devotions', id},
      ],
    }),
    deleteDevotionComment: builder.mutation({
      query: ({id, commentId}) => ({
        url: `/devotion/${id}/comments/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, {id}) => [
        {type: 'DevotionComments', id},
        {type: 'Devotions', id},
      ],
    }),
    // Lazy loading endpoints for devotions by month
    getMonthsByYear: builder.query({
      query: year => `/devotion/year/${year}/months`,
      // Cache months list for 1 hour since it rarely changes
      keepUnusedDataFor: 3600,
      providesTags: (result, error, year) => [
        {type: 'Devotions', id: `months-${year}`},
      ],
    }),
    getDevotionsByYearAndMonth: builder.query({
      query: ({year, month}) =>
        `/devotion/year/${year}/month/${encodeURIComponent(month)}`,
      transformResponse: response => {
        // Backend returns array of devotions for the month
        if (Array.isArray(response)) {
          return response;
        }
        if (response?.items && Array.isArray(response.items)) {
          return response.items;
        }
        return [];
      },
      // Cache month's devotions for 30 minutes
      keepUnusedDataFor: 1800,
      providesTags: (result, error, {year, month}) => [
        {type: 'Devotions', id: `${year}-${month}`},
      ],
    }),
    // Get available years for devotions
    getAvailableYears: builder.query({
      query: () => '/devotion/years',
      // Cache years list for 1 hour
      keepUnusedDataFor: 3600,
      providesTags: [{type: 'Devotions', id: 'years'}],
    }),
    // Explore/Supplements endpoints
    getExploreCategories: builder.query({
      query: () => '/explore/categories',
      providesTags: ['ExploreCategories'],
    }),
    getExploreItems: builder.query({
      query: categoryId => ({
        url: '/explore/items',
        params: {categoryId},
      }),
      providesTags: (result, error, categoryId) => [
        {type: 'ExploreItems', id: categoryId},
        'ExploreItems',
      ],
    }),
    getExploreItemById: builder.query({
      query: id => `/explore/items/${id}`,
      providesTags: (result, error, id) => [{type: 'ExploreItems', id}],
    }),
    // Admin Explore endpoints
    getAdminExploreCategories: builder.query({
      query: () => '/explore/admin/categories',
      providesTags: ['ExploreCategories'],
    }),
    createExploreCategory: builder.mutation({
      query: data => ({
        url: '/explore/admin/categories',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
      }),
      invalidatesTags: ['ExploreCategories'],
    }),
    updateExploreCategory: builder.mutation({
      query: ({id, ...data}) => ({
        url: `/explore/admin/categories/${id}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
      }),
      invalidatesTags: ['ExploreCategories'],
    }),
    deleteExploreCategory: builder.mutation({
      query: id => ({
        url: `/explore/admin/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ExploreCategories', 'ExploreItems'],
    }),
    getAdminExploreItems: builder.query({
      query: categoryId => ({
        url: '/explore/admin/items',
        params: categoryId ? {categoryId} : {},
      }),
      providesTags: ['ExploreItems'],
    }),
    createExploreItem: builder.mutation({
      query: formData => ({
        url: '/explore/admin/items',
        method: 'POST',
        body: formData,
        // Don't set Content-Type for FormData, browser will set it with boundary
      }),
      invalidatesTags: ['ExploreItems', 'ExploreCategories'],
    }),
    updateExploreItem: builder.mutation({
      query: ({id, formData}) => {
        // If formData is a FormData object, don't set Content-Type header
        // Otherwise, set it to application/json
        const isFormData = formData instanceof FormData;
        return {
          url: `/explore/admin/items/${id}`,
          method: 'PUT',
          body: formData,
          ...(isFormData
            ? {}
            : {
                headers: {
                  'Content-Type': 'application/json',
                },
              }),
        };
      },
      invalidatesTags: (result, error, {id}) => [
        {type: 'ExploreItems', id},
        'ExploreItems',
      ],
    }),
    deleteExploreItem: builder.mutation({
      query: id => ({
        url: `/explore/admin/items/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ExploreItems'],
    }),
  }),
});

export const {
  useSignupMutation,
  useLoginMutation,
  useGetAuthProvidersQuery,
  useSocialAuthMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetDevotionsQuery,
  useGetCoursesQuery,
  useGetPublishedCoursesQuery,
  useGetCourseByIdQuery,
  useGetCurrentUserQuery,
  useUpdateUserStatusMutation,
  useGetDevotionPlansQuery,
  useGetDevotionPlanByIdQuery,
  useGetDevotionPlanDevotionsQuery,
  useGetMyDevotionPlansQuery,
  useGetDevotionPlanProgressQuery,
  useStartDevotionPlanMutation,
  useUpdateDevotionPlanProgressMutation,
  useRestartDevotionPlanMutation,
  useToggleDevotionLikeMutation,
  useGetDevotionLikesQuery,
  useTrackDevotionShareMutation,
  useGetDevotionCommentsQuery,
  useAddDevotionCommentMutation,
  useDeleteDevotionCommentMutation,
  // Lazy loading hooks for devotions by month
  useGetMonthsByYearQuery,
  useGetDevotionsByYearAndMonthQuery,
  useLazyGetDevotionsByYearAndMonthQuery,
  useGetAvailableYearsQuery,
  // Explore hooks
  useGetExploreCategoriesQuery,
  useGetExploreItemsQuery,
  useGetExploreItemByIdQuery,
  // Admin Explore hooks
  useGetAdminExploreCategoriesQuery,
  useCreateExploreCategoryMutation,
  useUpdateExploreCategoryMutation,
  useDeleteExploreCategoryMutation,
  useGetAdminExploreItemsQuery,
  useCreateExploreItemMutation,
  useUpdateExploreItemMutation,
  useDeleteExploreItemMutation,
  util: {invalidateTags},
} = apiSlice;
