export const BIBLE_COLORS = {
  background: '#FBFBFB',
  ink: '#1A2024',
  darkCard: '#21282E',
  gold: '#EA9215',
  darkGold: '#C77C12',
  lightGold: '#FDF4E8',
  border: '#D0D3D5',
  secondary: '#5D6870',
};

export const HIGHLIGHT_COLORS = [
  {key: 'yellow', label: 'Study', hex: '#FCD34D'},
  {key: 'green', label: 'Promise', hex: '#6EE7B7'},
  {key: 'blue', label: 'Teaching', hex: '#93C5FD'},
  {key: 'pink', label: 'Reflection', hex: '#FDA4AF'},
  {key: 'purple', label: 'Question', hex: '#C4B5FD'},
  {key: 'orange', label: 'Important', hex: '#FDBA74'},
  {key: 'teal', label: 'Growth', hex: '#5EEAD4'},
  {key: 'red', label: 'Warning', hex: '#FCA5A5'},
  {key: 'gray', label: 'Reference', hex: '#CBD5E1'},
];

export const getHighlightColorPage = page =>
  HIGHLIGHT_COLORS.slice(page * 5, page * 5 + 5);

export const BIBLE_SEARCH_LIMIT = 15;
export const BIBLE_SEARCH_DEBOUNCE_MS = 450;

export const READER_SETTINGS_KEY = 'bible_reader_settings_v1';
export const DEFAULT_READER_SETTINGS = {
  fontId: 'nokia',
  fontFamily: 'NokiaPureHeadline-Regular',
  fontWeight: '700',
  fontSize: 20,
  lineSpacing: 1.15,
  readingWidth: 'comfortable',
  continuousScrolling: false,
  theme: 'charcoal',
};

export const BIBLE_THEMES = [
  {
    id: 'paper',
    label: 'Paper',
    background: '#FCFBF7',
    text: '#20201E',
    muted: '#68665F',
    card: '#FFFFFF',
    border: '#E3E0D7',
    accent: '#9A6A25',
  },
  {
    id: 'linen',
    label: 'Linen',
    background: '#F4EEE3',
    text: '#29251F',
    muted: '#726A5F',
    card: '#FBF7EF',
    border: '#DED3C3',
    accent: '#A16B2A',
  },
  {
    id: 'mist',
    label: 'Mist',
    background: '#EEF2F1',
    text: '#23302E',
    muted: '#63716E',
    card: '#F8FAF9',
    border: '#D1DBD8',
    accent: '#44766E',
  },
  {
    id: 'sky',
    label: 'Sky',
    background: '#EDF3F8',
    text: '#1D2D3B',
    muted: '#61707D',
    card: '#F7FAFC',
    border: '#D0DBE4',
    accent: '#3E6E91',
  },
  {
    id: 'rose',
    label: 'Rose',
    background: '#F8F0F1',
    text: '#38272A',
    muted: '#79666A',
    card: '#FFF8F8',
    border: '#E4D2D5',
    accent: '#9A5965',
  },
  {
    id: 'sepia',
    label: 'Sepia',
    background: '#EDE0C8',
    text: '#382C1F',
    muted: '#77654E',
    card: '#F6EBD8',
    border: '#D4C09F',
    accent: '#8E622A',
  },
  {
    id: 'charcoal',
    label: 'Charcoal',
    background: '#252B2A',
    text: '#E8EBE9',
    muted: '#A8B0AD',
    card: '#303635',
    border: '#444C4A',
    accent: '#D9A45C',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    background: '#111820',
    text: '#E7EDF3',
    muted: '#9DAAB6',
    card: '#1A232C',
    border: '#303C47',
    accent: '#D6A25A',
  },
];

export const getBibleTheme = themeId =>
  BIBLE_THEMES.find(theme => theme.id === themeId) || BIBLE_THEMES[6];

export const isDarkBibleTheme = themeId =>
  ['charcoal', 'midnight'].includes(themeId);
