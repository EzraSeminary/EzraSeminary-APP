import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';

export const videoLinksApi = createApi({
  reducerPath: 'videoLinksApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:5100/',
  }),
  endpoints: builder => ({
    getVideoLink: builder.query({
      query: ({year, quarter, lesson}) =>
        `sslLinks/${year}/${quarter}/${lesson}`,
    }),
  }),
});

export const {useGetVideoLinkQuery} = videoLinksApi;
