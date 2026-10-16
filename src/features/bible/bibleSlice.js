import {createSlice} from '@reduxjs/toolkit';
import {DEFAULT_READER_SETTINGS} from './constants';

const initialState = {
  settings: DEFAULT_READER_SETTINGS,
  pendingAction: null,
};

const bibleSlice = createSlice({
  name: 'bible',
  initialState,
  reducers: {
    updateBibleSettings(state, action) {
      state.settings = {...state.settings, ...action.payload};
    },
    setPendingBibleAction(state, action) {
      state.pendingAction = action.payload;
    },
    clearPendingBibleAction(state) {
      state.pendingAction = null;
    },
  },
});

export const {
  updateBibleSettings,
  setPendingBibleAction,
  clearPendingBibleAction,
} = bibleSlice.actions;
export default bibleSlice.reducer;
