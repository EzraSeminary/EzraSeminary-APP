import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  language: 'am', // Default language is Amharic
};

const languages = ['am', 'en', 'ti'];

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    toggleLanguage: state => {
      const currentIndex = languages.indexOf(state.language);
      state.language = languages[(currentIndex + 1) % languages.length] || 'am';
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
  },
});

export const {toggleLanguage, setLanguage} = languageSlice.actions;

export default languageSlice.reducer;
