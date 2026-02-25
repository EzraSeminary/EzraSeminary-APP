import React from 'react';
import {useWindowDimensions} from 'react-native';
import RenderHTML from 'react-native-render-html';

const HtmlContent = ({html, tagsStyles, baseStyle, contentWidth, ...props}) => {
  const {width} = useWindowDimensions();
  const effectiveWidth = contentWidth || width;

  return (
    <RenderHTML
      contentWidth={effectiveWidth}
      source={{html: html || ''}}
      tagsStyles={tagsStyles}
      baseStyle={baseStyle}
      {...props}
    />
  );
};

export default HtmlContent;
