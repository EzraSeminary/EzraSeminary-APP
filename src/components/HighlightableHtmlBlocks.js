import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Text, TextInput, View} from 'react-native';
import {getHighlightColors} from '../utils/highlightPalette';

const buildBlockRanges = blocks => {
  let cursor = 0;

  return (Array.isArray(blocks) ? blocks : []).map((block, index, source) => {
    const text = String(block?.text || '');
    const start = cursor;
    const end = start + text.length;
    cursor = end + (index === source.length - 1 ? 0 : 2);

    return {
      id: block.id,
      start,
      end,
      text,
    };
  });
};

const buildGlobalRanges = (blockRanges, blockHighlights, inlineHighlights) => {
  const ranges = [];

  blockRanges.forEach(blockRange => {
    const blockColorId = blockHighlights?.[blockRange.id];
    if (blockColorId && blockRange.end > blockRange.start) {
      ranges.push({
        id: `${blockRange.id}-block`,
        start: blockRange.start,
        end: blockRange.end,
        colorId: blockColorId,
      });
    }

    const inlineRanges = Array.isArray(inlineHighlights?.[blockRange.id])
      ? inlineHighlights[blockRange.id]
      : [];

    inlineRanges.forEach(range => {
      const localStart = Math.max(0, Number(range?.start) || 0);
      const localEnd = Math.max(localStart, Number(range?.end) || localStart);
      if (localEnd <= localStart) {
        return;
      }

      ranges.push({
        id:
          range.id ||
          `${blockRange.id}-${localStart}-${localEnd}-${range?.colorId || 'inline'}`,
        start: blockRange.start + localStart,
        end: Math.min(blockRange.start + localEnd, blockRange.end),
        colorId: range?.colorId || null,
      });
    });
  });

  return ranges
    .filter(range => range.colorId && range.end > range.start)
    .sort((first, second) => first.start - second.start);
};

const renderHighlightedText = (content, ranges, darkMode, textStyle) => {
  const value = String(content || '');
  if (!value) {
    return null;
  }

  if (!Array.isArray(ranges) || ranges.length === 0) {
    return <Text style={textStyle}>{value}</Text>;
  }

  const segments = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    const start = Math.max(cursor, Math.min(range.start, value.length));
    const end = Math.max(start, Math.min(range.end, value.length));

    if (start > cursor) {
      segments.push({
        id: `plain-${index}-${cursor}`,
        text: value.slice(cursor, start),
        colorId: null,
      });
    }

    if (end > start) {
      segments.push({
        id: range.id || `range-${index}-${start}-${end}`,
        text: value.slice(start, end),
        colorId: range.colorId,
      });
    }

    cursor = end;
  });

  if (cursor < value.length) {
    segments.push({
      id: `plain-tail-${cursor}`,
      text: value.slice(cursor),
      colorId: null,
    });
  }

  return (
    <Text style={textStyle}>
      {segments.map(segment => {
        if (!segment.colorId) {
          return <Text key={segment.id}>{segment.text}</Text>;
        }

        const colors = getHighlightColors(segment.colorId, darkMode);

        return (
          <Text
            key={segment.id}
            style={colors ? {backgroundColor: colors.backgroundColor} : null}>
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
};

const HighlightableHtmlBlocks = ({
  blocks,
  darkMode,
  highlights = {},
  inlineHighlights = {},
  onSelectColor,
  onSelectInlineColor,
  onClearHighlight,
  onClearInlineHighlights,
  stylesheet,
  blockContainerStyle,
  onFloatingSheetChange,
}) => {
  const [selection, setSelection] = useState({start: 0, end: 0});
  const [contentHeight, setContentHeight] = useState(240);

  const blockRanges = useMemo(() => buildBlockRanges(blocks), [blocks]);

  const content = useMemo(
    () => blockRanges.map(block => block.text).join('\n\n'),
    [blockRanges],
  );

  const globalRanges = useMemo(
    () => buildGlobalRanges(blockRanges, highlights, inlineHighlights),
    [blockRanges, highlights, inlineHighlights],
  );

  const selectedText = useMemo(() => {
    if (selection.start === selection.end) {
      return '';
    }

    return content.substring(selection.start, selection.end);
  }, [content, selection.end, selection.start]);

  const selectedBlockSelections = useMemo(() => {
    if (!selectedText) {
      return [];
    }

    return blockRanges
      .map(blockRange => {
        const overlapStart = Math.max(selection.start, blockRange.start);
        const overlapEnd = Math.min(selection.end, blockRange.end);

        if (overlapEnd <= overlapStart) {
          return null;
        }

        return {
          blockId: blockRange.id,
          start: overlapStart - blockRange.start,
          end: overlapEnd - blockRange.start,
          selectedText: content.substring(overlapStart, overlapEnd),
        };
      })
      .filter(Boolean);
  }, [blockRanges, content, selectedText, selection.end, selection.start]);

  const selectedBlockIds = useMemo(
    () => selectedBlockSelections.map(item => item.blockId),
    [selectedBlockSelections],
  );

  const clearSelection = useCallback(() => {
    setSelection({start: 0, end: 0});
  }, []);

  const applyInlineHighlight = useCallback(
    async colorId => {
      if (!selectedBlockSelections.length) {
        return;
      }

      if (typeof onSelectInlineColor === 'function') {
        for (const selectedBlock of selectedBlockSelections) {
          await onSelectInlineColor({
            ...selectedBlock,
            colorId,
          });
        }
      } else if (typeof onSelectColor === 'function') {
        for (const blockId of selectedBlockIds) {
          await onSelectColor(blockId, colorId);
        }
      }

      clearSelection();
    },
    [
      clearSelection,
      onSelectColor,
      onSelectInlineColor,
      selectedBlockIds,
      selectedBlockSelections,
    ],
  );

  const clearSelectedHighlights = useCallback(async () => {
    for (const blockId of selectedBlockIds) {
      if (typeof onClearInlineHighlights === 'function') {
        await onClearInlineHighlights(blockId);
      }
      if (typeof onClearHighlight === 'function') {
        await onClearHighlight(blockId);
      }
    }

    clearSelection();
  }, [
    clearSelection,
    onClearHighlight,
    onClearInlineHighlights,
    selectedBlockIds,
  ]);

  useEffect(() => {
    if (!onFloatingSheetChange) {
      return;
    }

    onFloatingSheetChange({
      visible: Boolean(selectedText),
      selectedCount: selectedBlockSelections.length,
      selectedText,
      onClose: clearSelection,
      onSelectColor: applyInlineHighlight,
      onClearHighlights: clearSelectedHighlights,
      freeSelectionEnabled: false,
      allowBlockHighlight: true,
    });

    return () => {
      onFloatingSheetChange({visible: false});
    };
  }, [
    applyInlineHighlight,
    clearSelectedHighlights,
    clearSelection,
    onFloatingSheetChange,
    selectedBlockSelections.length,
    selectedText,
  ]);

  const textStyle = useMemo(
    () => [
      stylesheet?.p,
      {
        color: darkMode ? '#F8FAFC' : '#111827',
      },
    ],
    [darkMode, stylesheet?.p],
  );

  return (
    <View
      style={[
        blockContainerStyle,
        {
          position: 'relative',
          minHeight: contentHeight,
        },
      ]}>
      <View pointerEvents="none">{renderHighlightedText(content, globalRanges, darkMode, textStyle)}</View>
      <TextInput
        multiline
        value={content}
        editable
        onChangeText={() => {}}
        onSelectionChange={({nativeEvent}) => {
          setSelection(nativeEvent.selection);
        }}
        onContentSizeChange={({nativeEvent}) => {
          setContentHeight(Math.max(240, nativeEvent.contentSize.height));
        }}
        selectionColor="#EA9215"
        showSoftInputOnFocus={false}
        contextMenuHidden={false}
        scrollEnabled={false}
        style={[
          textStyle,
          {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            color: 'transparent',
            backgroundColor: 'transparent',
            includeFontPadding: false,
          },
        ]}
      />
    </View>
  );
};

export default HighlightableHtmlBlocks;
