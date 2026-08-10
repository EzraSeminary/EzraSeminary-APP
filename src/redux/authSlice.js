import {createSlice} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {clearGoogleProviderSession} from '../services/socialAuth';
import {clearLocalUserSession} from '../utils/sessionStorage';
import {apiSlice} from './api-slices/apiSlice';

const initialState = {
  user: null,
  isAuthReady: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action) => {
      const payload = action.payload || {};
      const token = payload.token || state.user?.token || '';
      const refreshToken = payload.refreshToken || state.user?.refreshToken || '';
      state.user = {
        ...(state.user || {}),
        ...payload,
        ...(token ? {token} : {}),
        ...(refreshToken ? {refreshToken} : {}),
      };

      // Store the token in AsyncStorage
      AsyncStorage.setItem('token', token);
      AsyncStorage.setItem('user', JSON.stringify(state.user));
    },
    signup: (state, action) => {
      const payload = action.payload || {};
      state.user = payload;
      AsyncStorage.setItem('token', payload.token || '');
      AsyncStorage.setItem('user', JSON.stringify(payload));
    },
    updateUser: (state, action) => {
      const payload = action.payload || {};
      const token = payload.token || state.user?.token || '';
      const refreshToken = payload.refreshToken || state.user?.refreshToken || '';
      state.user = {
        ...(state.user || {}),
        ...payload,
        ...(token ? {token} : {}),
        ...(refreshToken ? {refreshToken} : {}),
      };

      // Assuming the token is part of the payload, update it in local storage as well
      AsyncStorage.setItem('token', token);

      // Update the user details in local storage
      AsyncStorage.setItem('user', JSON.stringify(state.user));
    },
    logout: state => {
      state.user = null;
      state.isAuthReady = false;
    },
    setAuthReady: (state, action) => {
      state.isAuthReady = action.payload;
    },
    setProgress: (state, action) => {
      const {
        courseId,
        currentChapter,
        currentSlide,
        completedChapterIds = [],
        completedCourse = false,
        completedAt,
      } = action.payload;
      const mergeCompletedChapters = previousIds => [
        ...new Set([
          ...(Array.isArray(previousIds) ? previousIds : []),
          ...(Array.isArray(completedChapterIds) ? completedChapterIds : []),
        ]),
      ];

      // Error handling for existence of user and progress array
      if (state.user && state.user.progress) {
        // Find the index of the progress item for the specific course
        const progressIndex = state.user.progress.findIndex(
          p => p.courseId === courseId,
        );

        // If the course progress does not exist, initialize it
        if (progressIndex === -1) {
          state.user.progress.push({
            courseId,
            currentChapter,
            currentSlide,
            completedChapterIds: mergeCompletedChapters([]),
            completedCourse,
            completedAt: completedCourse
              ? completedAt || new Date().toISOString()
              : undefined,
          });
        } else {
          // Update the current chapter and slide in the existing progress item
          state.user.progress[progressIndex].currentChapter = currentChapter;
          state.user.progress[progressIndex].currentSlide = currentSlide;
          state.user.progress[progressIndex].completedChapterIds =
            mergeCompletedChapters(
              state.user.progress[progressIndex].completedChapterIds,
            );
          state.user.progress[progressIndex].completedCourse = Boolean(
            state.user.progress[progressIndex].completedCourse ||
              completedCourse,
          );
          if (completedCourse) {
            state.user.progress[progressIndex].completedAt =
              completedAt || new Date().toISOString();
          }
        }
      } else if (state.user) {
        // If user exists but has no progress, initialize progress with the current details
        state.user.progress = [
          {
            courseId,
            currentChapter,
            currentSlide,
            completedChapterIds: mergeCompletedChapters([]),
            completedCourse,
            completedAt: completedCourse
              ? completedAt || new Date().toISOString()
              : undefined,
          },
        ];
      }

      if (state.user) {
        AsyncStorage.setItem('user', JSON.stringify(state.user));
      }
    },

    setUser: (state, action) => {
      const payload = action.payload || {};
      const token = payload.token || state.user?.token || '';
      const refreshToken = payload.refreshToken || state.user?.refreshToken || '';
      state.user = {
        ...(state.user || {}),
        ...payload,
        ...(token ? {token} : {}),
        ...(refreshToken ? {refreshToken} : {}),
      };

      // Store the token in AsyncStorage
      AsyncStorage.setItem('token', token);
      AsyncStorage.setItem('user', JSON.stringify(state.user));
    },
    deactivateAccount: state => {
      state.user = null;
    },
  },
});

export const {
  login,
  signup,
  updateUser,
  logout,
  setAuthReady,
  setProgress,
  setUser,
  deactivateAccount,
} = authSlice.actions;

export const loginUser = userData => async dispatch => {
  await AsyncStorage.setItem('token', userData.token);
  await AsyncStorage.setItem('user', JSON.stringify(userData));
  dispatch(authSlice.actions.login(userData));
};

export const signupUser = userData => async dispatch => {
  await AsyncStorage.setItem('token', userData.token);
  await AsyncStorage.setItem('user', JSON.stringify(userData));
  dispatch(authSlice.actions.signup(userData));
};

export const logoutUser = () => async dispatch => {
  try {
    await clearGoogleProviderSession();
    await clearLocalUserSession();
    dispatch(apiSlice.util.resetApiState());
    dispatch(authSlice.actions.logout());
  } catch (error) {
    console.error('Logout error:', error);
    dispatch(apiSlice.util.resetApiState());
    dispatch(authSlice.actions.logout());
  }
};

export const deactivateUserAccount = id => async dispatch => {
  try {
    await fetch(`https://ezrabackend.online/users/status/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({status: 'inactive'}),
    });
    await clearLocalUserSession();
    dispatch(apiSlice.util.resetApiState());
    dispatch(authSlice.actions.deactivateAccount());
  } catch (error) {
    console.error('Error deactivating account:', error);
  }
};

export const selectCurrentUser = state => state.auth.user;

export default authSlice.reducer;
