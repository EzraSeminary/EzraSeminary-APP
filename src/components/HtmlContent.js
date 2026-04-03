import React from 'react';
import {useWindowDimensions} from 'react-native';
import RenderHTML from 'react-native-render-html';

const NOKIA_SYSTEM_FONTS = [
  'Nokia Pure Headline Bold',
  'Nokia Pure Headline Extra Bold',
  'Nokia Pure Headline Regular',
  'Nokia Pure Headline Light',
  'Nokia Pure Headline Ultra Light',
  'NOKIAPUREHEADLINE_RG',
  'NokiaPureHeadline_Lt',
  'NokiaPureHeadline_XBd..ttf',
];

const HtmlContent = ({html, tagsStyles, baseStyle, contentWidth, ...props}) => {
  const {width} = useWindowDimensions();
  const effectiveWidth = contentWidth || width;

  return (
    <RenderHTML
      contentWidth={effectiveWidth}
      source={{html: html || ''}}
      tagsStyles={tagsStyles}
      baseStyle={{fontFamily: 'Nokia Pure Headline Bold', ...baseStyle}}
      defaultTextProps={{
        style: {
          fontFamily: 'Nokia Pure Headline Bold',
        },
      }}
      systemFonts={NOKIA_SYSTEM_FONTS}
      {...props}
    />
  );
};

export default HtmlContent;
