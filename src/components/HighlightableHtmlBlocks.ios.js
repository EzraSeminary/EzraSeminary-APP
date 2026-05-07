import React from 'react';
import HighlightableHtmlBlocksBase from './HighlightableHtmlBlocksBase';

const HighlightableHtmlBlocks = props => (
  <HighlightableHtmlBlocksBase
    {...props}
    displayPointerEvents="none"
    keepDisplayVisibleDuringSelection={false}
  />
);

export default HighlightableHtmlBlocks;
