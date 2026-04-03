import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    // baseUrl: 'https://ezrabackend.online/',
    baseUrl: 'https://ezrabackend.online/',
  }),
  endpoints: builder => ({
    getCourses: builder.query({
      query: ({limit, sort, page} = {}) => ({
        url: 'course/getall',
        params: {
          ...(limit ? {limit} : {}),
          ...(sort ? {sort} : {}),
          ...(page ? {page} : {}),
        },
      }),
      transformResponse: response => {
        if (Array.isArray(response)) {
          return response;
        }
        if (Array.isArray(response?.items)) {
          return response.items;
        }
        if (Array.isArray(response?.courses)) {
          return response.courses;
        }
        return [];
      },
    }),
    getCourseById: builder.query({
      query: id => `course/get/${id}`,
    }),
    getPublishedCourses: builder.query({
      query: ({limit, sort, page} = {}) => ({
        url: 'course/get/published',
        params: {
          ...(limit ? {limit} : {}),
          ...(sort ? {sort} : {}),
          ...(page ? {page} : {}),
        },
      }),
      transformResponse: response => {
        if (Array.isArray(response)) {
          return response;
        }
        if (Array.isArray(response?.items)) {
          return response.items;
        }
        if (Array.isArray(response?.courses)) {
          return response.courses;
        }
        return [];
      },
      providesTags: ['Courses'],
    }),
  }),
});

export const {
  useGetCoursesQuery,
  useGetCourseByIdQuery,
  useGetPublishedCoursesQuery,
} = api;
