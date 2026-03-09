import React from 'react';
import {View} from 'react-native';
import HTMLView from 'react-native-htmlview';
import HighlightableBlock from './HighlightableBlock';
import {getHighlightColors} from '../utils/highlightPalette';

const TEXT_TAGS = [
  'p',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ol',
  'ul',
  'li',
  'blockquote',
  'div',
  'span',
];

const mergeHighlightIntoStyle = (existingStyle, highlightStyle) => {
  if (Array.isArray(existingStyle)) {
    return [...existingStyle, highlightStyle];
  }

  if (existingStyle) {
    return [existingStyle, highlightStyle];
  }

  return highlightStyle;
};

const HighlightableHtmlBlocks = ({
  blocks,
  darkMode,
  highlights,
  onSelectColor,
  onClearHighlight,
  stylesheet,
  renderNode,
  blockContainerStyle,
}) => {
  return (
    <View>
      {blocks.map(block => {
        const activeColorId = highlights[block.id];
        const highlightColors = getHighlightColors(activeColorId, darkMode);
        const highlightTextStyle = highlightColors
          ? {
              backgroundColor: highlightColors.backgroundColor,
              borderRadius: 8,
              overflow: 'hidden',
              paddingHorizontal: 3,
              paddingVertical: 2,
            }
          : null;
        const mergedStylesheet = highlightTextStyle
          ? TEXT_TAGS.reduce(
              (accumulator, tag) => {
                accumulator[tag] = mergeHighlightIntoStyle(
                  stylesheet?.[tag],
                  highlightTextStyle,
                );
                return accumulator;
              },
              {...stylesheet},
            )
          : stylesheet;

        return (
          <HighlightableBlock
            key={block.id}
            blockId={block.id}
            text={block.text}
            darkMode={darkMode}
            activeColorId={activeColorId}
            onSelectColor={onSelectColor}
            onClearHighlight={onClearHighlight}
            style={blockContainerStyle}>
            <HTMLView
              value={block.html}
              stylesheet={mergedStylesheet}
              linebreak={false}
              renderNode={renderNode}
            />
          </HighlightableBlock>
        );
      })}
    </View>
  );
};

export default HighlightableHtmlBlocks;
