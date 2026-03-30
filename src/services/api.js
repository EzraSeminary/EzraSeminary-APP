import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:5100/',
    baseUrl: 'http://localhost:5100/',
  }),
  endpoints: builder => ({
    getCourses: builder.query({
      query: () => 'course/getall',
    }),
    getCourseById: builder.query({
      query: id => `course/get/${id}`,
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
  }),
});

export const {
  useGetCoursesQuery,
  useGetCourseByIdQuery,
  useGetPublishedCoursesQuery,
} = api;
