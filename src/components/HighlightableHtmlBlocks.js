import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Text, View} from 'react-native';
import HighlightableBlock from './HighlightableBlock';
import HighlightActionSheet from './HighlightActionSheet';
import TextSelectionModal from './TextSelectionModal';
import {getHighlightColors} from '../utils/highlightPalette';

const HighlightableHtmlBlocks = ({
  blocks,
  darkMode,
  highlights,
  inlineHighlights = {},
  onSelectColor,
  onSelectInlineColor,
  onClearHighlight,
  onClearInlineHighlights,
  stylesheet,
  blockContainerStyle,
  onFloatingSheetChange,
}) => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState([]);
  const [showFreeSelection, setShowFreeSelection] = useState(false);
  const [freeSelectionInitialSelection, setFreeSelectionInitialSelection] =
    useState({start: 0, end: 0});

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

  const getFirstWordRange = text => {
    const value = String(text || '');
    const match = value.match(/\S+/);
    if (!match) {
      return {start: 0, end: 0};
    }
    const start = match.index || 0;
    const end = start + match[0].length;
    return {start, end};
  };

  const selectedBlocks = useMemo(
    () => blocks.filter(block => selectedBlockIds.includes(block.id)),
    [blocks, selectedBlockIds],
  );

  const freeSelectionContent = useMemo(
    () => selectedBlocks.map(block => block.text || '').join('\n\n'),
    [selectedBlocks],
  );

  const freeSelectionBlockRanges = useMemo(() => {
    let cursor = 0;
    return selectedBlocks.map((block, index) => {
      const blockText = block.text || '';
      const start = cursor;
      const end = start + blockText.length;
      cursor = end + (index === selectedBlocks.length - 1 ? 0 : 2);
      return {
        id: block.id,
        start,
        end,
      };
    });
  }, [selectedBlocks]);

  const applyBlockColor = useCallback(
    async colorId => {
      for (const blockId of selectedBlockIds) {
        await onSelectColor(blockId, colorId);
      }
      clearSelectionMode();
    },
    [onSelectColor, selectedBlockIds],
  );

  const clearSelectedHighlights = useCallback(async () => {
    for (const blockId of selectedBlockIds) {
      await onClearHighlight(blockId);
      if (onClearInlineHighlights) {
        await onClearInlineHighlights(blockId);
      }
    }
    clearSelectionMode();
  }, [onClearHighlight, onClearInlineHighlights, selectedBlockIds]);

  const openFreeSelection = useCallback(() => {
    setIsSelectionMode(false);
    setFreeSelectionInitialSelection({start: 0, end: 0});
    setShowFreeSelection(true);
  }, []);

  useEffect(() => {
    if (!onFloatingSheetChange) {
      return;
    }
    onFloatingSheetChange({
      visible: isSelectionMode,
      selectedCount: selectedBlockIds.length,
      selectedText,
      onClose: clearSelectionMode,
      onSelectColor: applyBlockColor,
      onClearHighlights: clearSelectedHighlights,
      onOpenFreeSelection: openFreeSelection,
      freeSelectionEnabled: selectedBlockIds.length > 0,
      allowBlockHighlight: false,
    });

    return () => {
      onFloatingSheetChange({visible: false});
    };
  }, [
    applyBlockColor,
    clearSelectedHighlights,
    isSelectionMode,
    onFloatingSheetChange,
    openFreeSelection,
    selectedBlockIds.length,
    selectedText,
  ]);

  const renderTextWithInlineHighlights = (text, ranges, fallbackKey) => {
    const value = String(text || '');
    if (!value) {
      return null;
    }

    const normalizedRanges = (Array.isArray(ranges) ? ranges : [])
      .map(range => ({
        ...range,
        start: Math.max(0, Number(range?.start) || 0),
        end: Math.max(0, Number(range?.end) || 0),
      }))
      .filter(range => range.end > range.start)
      .sort((a, b) => a.start - b.start);

    if (normalizedRanges.length === 0) {
      return (
        <Text selectable style={stylesheet?.p}>
          {value}
        </Text>
      );
    }

    const segments = [];
    let cursor = 0;
    normalizedRanges.forEach((range, index) => {
      const clampedStart = Math.max(cursor, Math.min(range.start, value.length));
      const clampedEnd = Math.max(
        clampedStart,
        Math.min(range.end, value.length),
      );
      if (clampedStart > cursor) {
        segments.push({
          id: `${fallbackKey}-plain-${index}-${cursor}`,
          text: value.slice(cursor, clampedStart),
          colorId: null,
        });
      }
      if (clampedEnd > clampedStart) {
        segments.push({
          id:
            range.id ||
            `${fallbackKey}-range-${index}-${clampedStart}-${clampedEnd}`,
          text: value.slice(clampedStart, clampedEnd),
          colorId: range.colorId || null,
        });
      }
      cursor = clampedEnd;
    });
    if (cursor < value.length) {
      segments.push({
        id: `${fallbackKey}-plain-tail-${cursor}`,
        text: value.slice(cursor),
        colorId: null,
      });
    }

    return (
      <Text selectable style={stylesheet?.p}>
        {segments.map(segment => {
          if (!segment.colorId) {
            return <Text key={segment.id}>{segment.text}</Text>;
          }
          const colors = getHighlightColors(segment.colorId, darkMode);
          return (
            <Text
              key={segment.id}
              style={
                colors
                  ? {
                      backgroundColor: colors.backgroundColor,
                    }
                  : null
              }>
              {segment.text}
            </Text>
          );
        })}
      </Text>
    );
  };

  return (
    <>
      <View>
        {blocks.map(block => {
          const activeColorId = highlights[block.id];
          const blockInlineRanges = inlineHighlights[block.id] || [];

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
                const targetBlock = blocks.find(block => block.id === blockId);
                setSelectedBlockIds([blockId]);
                setIsSelectionMode(false);
                setFreeSelectionInitialSelection(
                  getFirstWordRange(targetBlock?.text),
                );
                setShowFreeSelection(true);
              }}
              onPressBlock={toggleBlockSelection}
              style={blockContainerStyle}>
              {renderTextWithInlineHighlights(
                block.text,
                blockInlineRanges,
                block.id,
              )}
            </HighlightableBlock>
          );
        })}
      </View>

      {onFloatingSheetChange ? null : (
        <HighlightActionSheet
          visible={isSelectionMode}
          darkMode={darkMode}
          useModal={false}
          allowBlockHighlight={false}
          selectedCount={selectedBlockIds.length}
          selectedText={selectedText}
          onClose={clearSelectionMode}
          freeSelectionEnabled={selectedBlockIds.length > 0}
          onOpenFreeSelection={openFreeSelection}
          onSelectColor={applyBlockColor}
          onClearHighlights={clearSelectedHighlights}
        />
      )}

      <TextSelectionModal
        visible={showFreeSelection}
        darkMode={darkMode}
        useModal={false}
        content={freeSelectionContent}
        blockRanges={freeSelectionBlockRanges}
        initialSelection={freeSelectionInitialSelection}
        onClose={() => {
          setShowFreeSelection(false);
          clearSelectionMode();
        }}
        onApplyHighlight={async (blockIds, colorId) => {
          for (const blockSelection of blockIds) {
            if (onSelectInlineColor) {
              await onSelectInlineColor({
                ...blockSelection,
                colorId,
              });
            } else if (blockSelection?.blockId && onSelectColor) {
              await onSelectColor(blockSelection.blockId, colorId);
            }
          }
          setShowFreeSelection(false);
          clearSelectionMode();
        }}
      />
    </>
  );
};

export default HighlightableHtmlBlocks;
