import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import HTMLView from 'react-native-htmlview';
import HighlightableBlock from './HighlightableBlock';
import HighlightActionSheet from './HighlightActionSheet';

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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState([]);

  const selectedText = useMemo(
    () =>
      blocks
        .filter(block => selectedBlockIds.includes(block.id))
        .map(block => block.text)
        .join('\n\n'),
    [blocks, selectedBlockIds],
  );

  const toggleBlockSelection = blockId => {
    setSelectedBlockIds(previous => {
      if (previous.includes(blockId)) {
        return previous.filter(id => id !== blockId);
      }
      return [...previous, blockId];
    });
  };

  const clearSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedBlockIds([]);
  };

  return (
    <>
      <View>
        {blocks.map(block => {
          const activeColorId = highlights[block.id];

          return (
            <HighlightableBlock
              key={block.id}
              blockId={block.id}
              text={block.text}
              darkMode={darkMode}
              activeColorId={activeColorId}
              isSelectionMode={isSelectionMode}
              isSelected={selectedBlockIds.includes(block.id)}
              onLongPressBlock={blockId => {
                setIsSelectionMode(true);
                setSelectedBlockIds(previous =>
                  previous.includes(blockId)
                    ? previous
                    : [...previous, blockId],
                );
              }}
              onPressBlock={toggleBlockSelection}
              style={blockContainerStyle}>
              <HTMLView
                value={block.html}
                stylesheet={stylesheet}
                linebreak={false}
                renderNode={renderNode}
              />
            </HighlightableBlock>
          );
        })}
      </View>

      <HighlightActionSheet
        visible={isSelectionMode}
        darkMode={darkMode}
        selectedCount={selectedBlockIds.length}
        selectedText={selectedText}
        onClose={clearSelectionMode}
        onSelectColor={async colorId => {
          for (const blockId of selectedBlockIds) {
            await onSelectColor(blockId, colorId);
          }
          clearSelectionMode();
        }}
        onClearHighlights={async () => {
          for (const blockId of selectedBlockIds) {
            await onClearHighlight(blockId);
          }
          clearSelectionMode();
        }}
      />
    </>
  );
};

export default HighlightableHtmlBlocks;
