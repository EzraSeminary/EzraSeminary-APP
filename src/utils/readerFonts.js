import {Platform} from 'react-native';

export const DEFAULT_READER_FONT_ID = 'nokia';

export const READER_FONTS = [
  {
    id: 'nokia',
    label: 'Nokia',
    sample: 'አማርኛ',
    iosFamily: 'Nokia Pure Headline Bold',
    androidFamily: 'Nokia Pure Headline Bold',
  },
  {
    id: 'menbere',
    label: 'Menbere',
    sample: 'መንበረ',
    iosFamily: 'Menbere-Regular',
    androidFamily: 'Menbere_Variable_Font_wght_2c787a3cf0',
  },
  {
    id: 'waldba',
    label: 'Waldba',
    sample: 'ዋልድባ',
    iosFamily: 'WaldbaWookianos-Regular',
    androidFamily: 'Waldba_Wookianos_Regular_82dc20e729',
  },
  {
    id: 'amhara',
    label: 'Amhara',
    sample: 'አማራ',
    iosFamily: 'Amharareduced',
    androidFamily: 'Amhara_reduced_5105c5b37c',
  },
  {
    id: 'surgraphics',
    label: 'SurGraphics',
    sample: 'ሰር',
    iosFamily: 'SurGraphics-Black',
    androidFamily: 'Sur_Graphics_Extra_Bold_15c4e92309',
  },
];

export const getReaderFontById = fontId =>
  READER_FONTS.find(font => font.id === fontId) || READER_FONTS[0];

export const normalizeReaderFontId = fontId => getReaderFontById(fontId).id;

export const getReaderFontFamily = fontId => {
  const font = getReaderFontById(fontId);

  return Platform.select({
    ios: font.iosFamily,
    android: font.androidFamily,
    default: font.iosFamily || font.androidFamily,
  });
};
