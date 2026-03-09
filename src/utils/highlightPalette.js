export const HIGHLIGHT_PALETTE = [
  {
    id: 'sunrise',
    label: 'Sunrise',
    lightBackground: '#FFF1A8',
    darkBackground: '#7B6212',
    lightBorder: '#EAB308',
    darkBorder: '#FACC15',
  },
  {
    id: 'mint',
    label: 'Mint',
    lightBackground: '#D1FAE5',
    darkBackground: '#14532D',
    lightBorder: '#10B981',
    darkBorder: '#34D399',
  },
  {
    id: 'sky',
    label: 'Sky',
    lightBackground: '#DBEAFE',
    darkBackground: '#1E3A8A',
    lightBorder: '#3B82F6',
    darkBorder: '#60A5FA',
  },
  {
    id: 'rose',
    label: 'Rose',
    lightBackground: '#FFE4E6',
    darkBackground: '#881337',
    lightBorder: '#F43F5E',
    darkBorder: '#FB7185',
  },
  {
    id: 'lavender',
    label: 'Lavender',
    lightBackground: '#EDE9FE',
    darkBackground: '#4C1D95',
    lightBorder: '#8B5CF6',
    darkBorder: '#A78BFA',
  },
  {
    id: 'peach',
    label: 'Peach',
    lightBackground: '#FFEDD5',
    darkBackground: '#9A3412',
    lightBorder: '#F97316',
    darkBorder: '#FB923C',
  },
  {
    id: 'aqua',
    label: 'Aqua',
    lightBackground: '#CCFBF1',
    darkBackground: '#115E59',
    lightBorder: '#14B8A6',
    darkBorder: '#2DD4BF',
  },
  {
    id: 'slate',
    label: 'Slate',
    lightBackground: '#E2E8F0',
    darkBackground: '#334155',
    lightBorder: '#64748B',
    darkBorder: '#94A3B8',
  },
  {
    id: 'sand',
    label: 'Sand',
    lightBackground: '#F5EAD8',
    darkBackground: '#78350F',
    lightBorder: '#C2410C',
    darkBorder: '#FDBA74',
  },
];

export const getHighlightColors = (paletteId, darkMode) => {
  const palette = HIGHLIGHT_PALETTE.find(color => color.id === paletteId);

  if (!palette) {
    return null;
  }

  return {
    backgroundColor: darkMode
      ? palette.darkBackground
      : palette.lightBackground,
    borderColor: darkMode ? palette.darkBorder : palette.lightBorder,
  };
};
