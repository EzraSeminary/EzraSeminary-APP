import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import NetInfo from '@react-native-community/netinfo';
import {getApiBaseUrl} from '../../utils/apiBaseUrl';
import {login, logout} from '../../redux/authSlice';
import {normalizeChapter} from './models';
import {
  clearSecureSession,
  getSecureSession,
  saveSecureSession,
} from '../../utils/secureSession';
import {navigationRef} from '../../navigation/NavigationRef';
import {
  getOfflineBooks,
  getOfflineChapter,
  getOfflineChapterNumbers,
  getOfflineTranslations,
  getOfflineVerse,
  searchOfflineBible,
} from './offlineBible';

const expireSession = async api => {
  await clearSecureSession();
  api.dispatch(logout());
  if (navigationRef.isReady()) {
    navigationRef.navigate('Login', {
      returnToBible: true,
      reason: 'Your session expired. Sign in again to continue syncing.',
    });
  }
};

const readSession = getSecureSession;

const saveSession = async session => {
  const current = (await readSession()) || {};
  return saveSecureSession({...current, ...session});
};

const bibleBaseQuery = async (args, api, extraOptions) => {
  const baseUrl = await getApiBaseUrl();
  const request = fetchBaseQuery({
    baseUrl,
    timeout: 30000,
    prepareHeaders: async headers => {
      const session = await readSession();
      const stateToken = api.getState()?.auth?.user?.token;
      const token = session?.token || session?.accessToken || stateToken;
      headers.set('Content-Type', 'application/json');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  });

  let result = await request(args, api, extraOptions);
  const url = typeof args === 'string' ? args : args.url;
  if (result.error?.status !== 401 || url === '/users/refresh-token') {
    return result;
  }

  const session = await readSession();
  if (!session?.refreshToken) {
    await expireSession(api);
    return result;
  }

  const refreshed = await request(
    {
      url: '/users/refresh-token',
      method: 'POST',
      body: {refreshToken: session.refreshToken},
    },
    api,
    extraOptions,
  );
  if (refreshed.error || !refreshed.data) {
    await expireSession(api);
    return result;
  }

  const nextSession = await saveSession(refreshed.data);
  api.dispatch(login(nextSession));
  return request(args, api, extraOptions);
};

const items = response =>
  Array.isArray(response) ? response : response?.items || [];

export const bibleApi = createApi({
  reducerPath: 'bibleApi',
  baseQuery: bibleBaseQuery,
  tagTypes: [
    'BibleTranslations',
    'BibleBooks',
    'BibleChapter',
    'BibleHighlights',
    'BibleNotes',
    'BibleBookmarks',
    'BibleProgress',
  ],
  endpoints: builder => ({
    getBibleTranslations: builder.query({
      queryFn: async (arg, api, extraOptions, baseQuery) => {
        const offline = await getOfflineTranslations();
        const connection = await NetInfo.fetch();
        if (
          connection.isConnected === false ||
          connection.isInternetReachable === false
        ) {
          return {data: offline};
        }
        const remote = await baseQuery('/api/bibles');
        if (remote.error) return {data: offline};
        const merged = [...offline];
        items(remote.data).forEach(translation => {
          const id = translation._id || translation.id;
          const index = merged.findIndex(item => (item._id || item.id) === id);
          if (index >= 0) merged[index] = translation;
          else merged.push(translation);
        });
        return {data: merged};
      },
      providesTags: ['BibleTranslations'],
    }),
    getBibleTranslation: builder.query({
      query: translationId => `/api/bibles/${translationId}`,
    }),
    getBibleBooks: builder.query({
      queryFn: async (translationId, api, extraOptions, baseQuery) => {
        const offline = await getOfflineBooks(translationId).catch(() => null);
        if (offline) return {data: offline};
        const remote = await baseQuery(`/api/bibles/${translationId}/books`);
        return remote.error ? remote : {data: items(remote.data)};
      },
      providesTags: (result, error, id) => [{type: 'BibleBooks', id}],
    }),
    getBibleChapters: builder.query({
      queryFn: async (
        {translationId, bookId},
        api,
        extraOptions,
        baseQuery,
      ) => {
        const offline = await getOfflineChapterNumbers(
          translationId,
          bookId,
        ).catch(() => null);
        if (offline) return {data: offline};
        const remote = await baseQuery(
          `/api/bibles/${translationId}/books/${bookId}/chapters`,
        );
        return remote.error
          ? remote
          : {data: Array.isArray(remote.data) ? remote.data : []};
      },
    }),
    getBibleChapter: builder.query({
      queryFn: async (
        {translationId, bookId, chapterNumber},
        api,
        extraOptions,
        baseQuery,
      ) => {
        const offline = await getOfflineChapter(
          translationId,
          bookId,
          chapterNumber,
        ).catch(() => null);
        if (offline) return {data: normalizeChapter(offline)};
        const remote = await baseQuery(
          `/api/bibles/${translationId}/books/${bookId}/chapters/${chapterNumber}`,
        );
        return remote.error ? remote : {data: normalizeChapter(remote.data)};
      },
      providesTags: (result, error, arg) => [
        {
          type: 'BibleChapter',
          id: `${arg.translationId}:${arg.bookId}:${arg.chapterNumber}`,
        },
      ],
    }),
    searchBible: builder.query({
      queryFn: async (args, api, extraOptions, baseQuery) => {
        const offline = await searchOfflineBible(args).catch(() => null);
        if (offline) return {data: offline};
        return baseQuery({
          url: `/api/bibles/${args.translationId}/search`,
          params: {
            q: args.q.trim(),
            page: args.page || 1,
            limit: args.limit || 15,
            ...(args.bookId ? {bookId: args.bookId} : {}),
          },
        });
      },
    }),
    getBibleVerse: builder.query({
      queryFn: async (
        {translationId, verseId},
        api,
        extraOptions,
        baseQuery,
      ) => {
        const offline = await getOfflineVerse(translationId, verseId).catch(
          () => null,
        );
        if (offline) return {data: offline};
        return baseQuery(`/api/bibles/${translationId}/verses/${verseId}`);
      },
    }),
    getHighlights: builder.query({
      query: params => ({url: '/api/bible/me/highlights', params}),
      transformResponse: items,
      providesTags: ['BibleHighlights'],
    }),
    createHighlight: builder.mutation({
      query: body => ({url: '/api/bible/me/highlights', method: 'POST', body}),
      invalidatesTags: ['BibleHighlights', 'BibleChapter'],
    }),
    updateHighlight: builder.mutation({
      query: ({highlightId, color}) => ({
        url: `/api/bible/me/highlights/${highlightId}`,
        method: 'PATCH',
        body: {color},
      }),
      invalidatesTags: ['BibleHighlights', 'BibleChapter'],
    }),
    deleteHighlight: builder.mutation({
      query: highlightId => ({
        url: `/api/bible/me/highlights/${highlightId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BibleHighlights', 'BibleChapter'],
    }),
    getNotes: builder.query({
      query: params => ({url: '/api/bible/me/notes', params}),
      transformResponse: items,
      providesTags: ['BibleNotes'],
    }),
    createNote: builder.mutation({
      query: body => ({url: '/api/bible/me/notes', method: 'POST', body}),
      invalidatesTags: ['BibleNotes'],
    }),
    updateNote: builder.mutation({
      query: ({noteId, text}) => ({
        url: `/api/bible/me/notes/${noteId}`,
        method: 'PATCH',
        body: {text},
      }),
      invalidatesTags: ['BibleNotes'],
    }),
    deleteNote: builder.mutation({
      query: noteId => ({
        url: `/api/bible/me/notes/${noteId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BibleNotes'],
    }),
    getBookmarks: builder.query({
      query: params => ({url: '/api/bible/me/bookmarks', params}),
      transformResponse: items,
      providesTags: ['BibleBookmarks'],
    }),
    createBookmark: builder.mutation({
      query: body => ({url: '/api/bible/me/bookmarks', method: 'POST', body}),
      invalidatesTags: ['BibleBookmarks'],
    }),
    deleteBookmark: builder.mutation({
      query: bookmarkId => ({
        url: `/api/bible/me/bookmarks/${bookmarkId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BibleBookmarks'],
    }),
    getBibleProgress: builder.query({
      query: translationId => ({
        url: '/api/bible/me/progress',
        params: translationId ? {translationId} : {},
      }),
      transformResponse: items,
      providesTags: ['BibleProgress'],
    }),
    saveBibleProgress: builder.mutation({
      query: body => ({url: '/api/bible/me/progress', method: 'PUT', body}),
      invalidatesTags: ['BibleProgress'],
    }),
  }),
});

export const {
  useGetBibleTranslationsQuery,
  useGetBibleTranslationQuery,
  useGetBibleBooksQuery,
  useGetBibleChaptersQuery,
  useGetBibleChapterQuery,
  useLazyGetBibleChapterQuery,
  useSearchBibleQuery,
  useLazySearchBibleQuery,
  useGetBibleVerseQuery,
  useGetHighlightsQuery,
  useCreateHighlightMutation,
  useUpdateHighlightMutation,
  useDeleteHighlightMutation,
  useGetNotesQuery,
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
  useGetBookmarksQuery,
  useCreateBookmarkMutation,
  useDeleteBookmarkMutation,
  useGetBibleProgressQuery,
  useSaveBibleProgressMutation,
} = bibleApi;
