import {Platform} from 'react-native';

export const DEFAULT_READER_FONT_ID = 'nokia';

export const READER_FONTS = [
  {
    id: 'nokia',
    label: 'Nokia Pure Headline',
    sample: 'አማርኛ',
    iosFamily: 'NokiaPureHeadline-Regular',
    androidFamily: 'NOKIAPUREHEADLINE_RG',
    script: 'ethiopic',
    weights: ['300', '700'],
  },
  {
    id: 'menbere',
    label: 'Menbere',
    sample: 'መንበረ',
    iosFamily: 'Menbere-Regular',
    androidFamily: 'Menbere_Variable_Font_wght_2c787a3cf0',
    script: 'ethiopic',
    variableWeight: true,
  },
  {
    id: 'waldba',
    label: 'Waldba',
    sample: 'ዋልድባ',
    iosFamily: 'WaldbaWookianos-Regular',
    androidFamily: 'Waldba_Wookianos_Regular_82dc20e729',
    script: 'ethiopic',
    weights: ['400'],
  },
  {
    id: 'amhara',
    label: 'Amhara',
    sample: 'አማራ',
    iosFamily: 'Amharareduced',
    androidFamily: 'Amhara_reduced_5105c5b37c',
    script: 'ethiopic',
    weights: ['400'],
  },
  {
    id: 'surgraphics',
    label: 'SurGraphics',
    sample: 'ሰር',
    iosFamily: 'SurGraphics-Black',
    androidFamily: 'Sur_Graphics_Extra_Bold_15c4e92309',
    script: 'ethiopic',
    weights: ['900'],
  },
  {
    id: 'lexend',
    label: 'Lexend',
    sample: 'In the beginning',
    iosFamily: 'Lexend',
    androidFamily: 'Lexend-Variable',
    script: 'latin',
    variableWeight: true,
  },
  {
    id: 'inter',
    label: 'Inter',
    sample: 'In the beginning',
    iosFamily: 'Inter',
    androidFamily: 'Inter-Variable',
    script: 'latin',
    variableWeight: true,
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    sample: 'In the beginning',
    iosFamily: 'Montserrat',
    androidFamily: 'Montserrat-Variable',
    script: 'latin',
    variableWeight: true,
  },
];

export const getReaderFontById = fontId =>
  READER_FONTS.find(font => font.id === fontId) || READER_FONTS[0];

export const normalizeReaderFontId = fontId => getReaderFontById(fontId).id;

export const getReaderFontFamily = (fontId, fontWeight = '700') => {
  const font = getReaderFontById(fontId);

  if (font.id === 'nokia') {
    const variant =
      Number(fontWeight) <= 300
        ? {ios: 'NokiaPureHeadline_Lt', android: 'NokiaPureHeadline_Lt'}
        : {ios: 'Nokia Pure Headline Bold', android: 'Nokia Pure Headline Bold'};
    return Platform.select({...variant, default: variant.ios});
  }

  return Platform.select({
    ios: font.iosFamily,
    android: font.androidFamily,
    default: font.iosFamily || font.androidFamily,
  });
};

export const fontSupportsWeight = (fontId, weight) => {
  const font = getReaderFontById(fontId);
  return font.variableWeight || (font.weights || []).includes(String(weight));
};

export const getReaderFontStyle = (fontId, fontWeight = '400') => {
  const font = getReaderFontById(fontId);
  return {
    fontFamily: getReaderFontFamily(font.id, fontWeight),
    ...(font.variableWeight ? {fontWeight} : {}),
  };
};
