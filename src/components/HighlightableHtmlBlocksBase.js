import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Platform, Text, TextInput, View} from 'react-native';
import HTMLView from 'react-native-htmlview';
import {getHighlightColors} from '../utils/highlightPalette';
import HighlightActionSheet from './HighlightActionSheet';

const SELECTION_COLOR = 'rgba(96, 165, 250, 0.32)';
const BLOCK_SEPARATOR = '\n\n';

const buildBlockRanges = blocks => {
  let cursor = 0;

  return (Array.isArray(blocks) ? blocks : []).map((block, index, source) => {
    const text = String(block?.text || '');
    const start = cursor;
    const end = start + text.length;
    cursor = end + (index === source.length - 1 ? 0 : BLOCK_SEPARATOR.length);

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
    .sort((first, second) => {
      if (first.start !== second.start) {
        return first.start - second.start;
      }

      return first.end - second.end;
    });
};

const renderHighlightedText = (content, ranges, darkMode, textStyle) => {
  const value = String(content || '');
  if (!value) {
    return null;
  }

  const normalizedRanges = Array.isArray(ranges)
    ? ranges
        .filter(range => range.end > range.start)
        .map(range => ({
          ...range,
          start: Math.max(0, Math.min(Number(range.start) || 0, value.length)),
          end: Math.max(0, Math.min(Number(range.end) || 0, value.length)),
        }))
        .sort((first, second) => {
          if (first.start !== second.start) {
            return first.start - second.start;
          }

          return first.end - second.end;
        })
    : [];

  if (normalizedRanges.length === 0) {
    return <Text style={textStyle}>{value}</Text>;
  }

  const boundaries = new Set([0, value.length]);
  normalizedRanges.forEach(range => {
    boundaries.add(range.start);
    boundaries.add(range.end);
  });

  const orderedBoundaries = Array.from(boundaries)
    .filter(boundary => boundary >= 0 && boundary <= value.length)
    .sort((first, second) => first - second);

  const segments = [];

  for (let index = 0; index < orderedBoundaries.length - 1; index += 1) {
    const start = orderedBoundaries[index];
    const end = orderedBoundaries[index + 1];

    if (end <= start) {
      continue;
    }

    const activeHighlight = normalizedRanges.reduce((bestMatch, range) => {
      const containsSegment = start >= range.start && end <= range.end;
      if (!containsSegment) {
        return bestMatch;
      }

      if (!bestMatch) {
        return range;
      }

      const currentSpan = range.end - range.start;
      const bestSpan = bestMatch.end - bestMatch.start;
      return currentSpan <= bestSpan ? range : bestMatch;
    }, null);

    segments.push({
      id: activeHighlight?.id || `segment-${index}-${start}-${end}`,
      text: value.slice(start, end),
      colorId: activeHighlight?.colorId || null,
    });
  }

  return (
    <Text style={textStyle}>
      {segments.map(segment => {
        if (!segment.colorId) {
          return <Text key={segment.id}>{segment.text}</Text>;
        }

        const colors = segment.colorId
          ? getHighlightColors(segment.colorId, darkMode)
          : null;

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

const buildLocalRanges = (blockRange, globalRanges) =>
  (Array.isArray(globalRanges) ? globalRanges : [])
    .filter(
      range =>
        range.start < blockRange.end && range.end > blockRange.start,
    )
    .map(range => ({
      ...range,
      start: Math.max(0, range.start - blockRange.start),
      end: Math.min(blockRange.end, range.end) - blockRange.start,
    }))
    .filter(range => range.end > range.start);

const HighlightableHtmlBlocksBase = ({
  blocks,
  darkMode,
  highlights = {},
  inlineHighlights = {},
  onSelectColor,
  onSelectInlineColor,
  onClearHighlight,
  onClearInlineHighlights,
  stylesheet,
  renderNode,
  blockContainerStyle,
  onFloatingSheetChange,
  onEnsureSelectionVisible,
  renderHtmlBlocksWhenIdle = false,
  displayPointerEvents = 'box-none',
  keepDisplayVisibleDuringSelection = true,
  selectionSurfaceEditable = true,
  minContentHeight = 0,
  renderBlockDisplay,
}) => {
  const [selection, setSelection] = useState({start: 0, end: 0});
  const [contentHeight, setContentHeight] = useState(minContentHeight);
  const [inputResetKey, setInputResetKey] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef(null);
  const containerOffsetYRef = useRef(0);
  const blockLayoutsRef = useRef({});

  const blockRanges = useMemo(() => buildBlockRanges(blocks), [blocks]);

  const content = useMemo(
    () => blockRanges.map(block => block.text).join(BLOCK_SEPARATOR),
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

  const isSelectionActive =
    isInputFocused || selection.start !== selection.end;

  const clearSelection = useCallback(() => {
    setSelection({start: 0, end: 0});
    setIsInputFocused(false);
    inputRef.current?.blur?.();
    setInputResetKey(previous => previous + 1);
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

  useEffect(() => {
    if (
      typeof onEnsureSelectionVisible !== 'function' ||
      !selectedBlockSelections.length ||
      !isSelectionActive
    ) {
      return;
    }

    const lastSelectedBlockId =
      selectedBlockSelections[selectedBlockSelections.length - 1]?.blockId;
    const layout = blockLayoutsRef.current[lastSelectedBlockId];

    if (!layout) {
      return;
    }

    onEnsureSelectionVisible({
      blockId: lastSelectedBlockId,
      top: containerOffsetYRef.current + layout.y,
      bottom: containerOffsetYRef.current + layout.y + layout.height,
      height: layout.height,
    });
  }, [
    isSelectionActive,
    onEnsureSelectionVisible,
    selectedBlockSelections,
    selection.end,
    selection.start,
  ]);

  const textStyle = useMemo(
    () => [
      stylesheet?.p,
      {
        color: darkMode ? '#F8FAFC' : '#111827',
        ...(Platform.OS === 'android'
          ? {
              includeFontPadding: false,
            }
          : null),
      },
    ],
    [darkMode, stylesheet?.p],
  );

  const renderedBlocks = useMemo(() => {
    return (Array.isArray(blocks) ? blocks : []).map((block, index) => {
      const blockRange = blockRanges[index];
      const localRanges = blockRange
        ? buildLocalRanges(blockRange, globalRanges)
        : [];
      const hasHighlights = localRanges.length > 0;

      if (typeof renderBlockDisplay === 'function') {
        return (
          <View
            key={block.id}
            onLayout={({nativeEvent}) => {
              blockLayoutsRef.current[block.id] = nativeEvent.layout;
            }}
            pointerEvents="box-none">
            {renderBlockDisplay({
              block,
              localRanges,
              darkMode,
              textStyle,
            })}
          </View>
        );
      }

      if (renderHtmlBlocksWhenIdle && block?.html && !hasHighlights) {
        return (
          <View
            key={block.id}
            onLayout={({nativeEvent}) => {
              blockLayoutsRef.current[block.id] = nativeEvent.layout;
            }}
            pointerEvents="box-none">
            <HTMLView
              value={block.html}
              stylesheet={stylesheet}
              renderNode={renderNode}
              addLineBreaks={false}
            />
          </View>
        );
      }

      return (
        <View
          key={block.id}
          onLayout={({nativeEvent}) => {
            blockLayoutsRef.current[block.id] = nativeEvent.layout;
          }}
          pointerEvents="box-none">
          {renderHighlightedText(
            block?.text || '',
            localRanges,
            darkMode,
            textStyle,
          )}
        </View>
      );
    });
  }, [
    blocks,
    blockRanges,
    darkMode,
    globalRanges,
    renderHtmlBlocksWhenIdle,
    renderBlockDisplay,
    renderNode,
    stylesheet,
    textStyle,
  ]);

  const shouldRenderBlockDisplay =
    typeof renderBlockDisplay === 'function' || renderHtmlBlocksWhenIdle;

  return (
    <View
      onLayout={({nativeEvent}) => {
        containerOffsetYRef.current = nativeEvent.layout.y;
      }}
      style={[
        blockContainerStyle,
        {
          position: 'relative',
          minHeight: contentHeight,
        },
      ]}>
      <TextInput
        key={inputResetKey}
        ref={inputRef}
        multiline
        value={content}
        editable={selectionSurfaceEditable}
        onChangeText={() => {}}
        onFocus={() => setIsInputFocused(true)}
        onBlur={() => setIsInputFocused(false)}
        onSelectionChange={({nativeEvent}) => {
          setSelection(nativeEvent.selection);
        }}
        onContentSizeChange={({nativeEvent}) => {
          setContentHeight(
            Math.max(minContentHeight, nativeEvent.contentSize.height),
          );
        }}
        selectionColor={SELECTION_COLOR}
        showSoftInputOnFocus={false}
        contextMenuHidden={false}
        scrollEnabled={false}
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="none"
        underlineColorAndroid="transparent"
        style={[
          textStyle,
          {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            color: keepDisplayVisibleDuringSelection
              ? 'transparent'
              : isSelectionActive
                ? darkMode
                  ? '#F8FAFC'
                  : '#111827'
                : 'transparent',
            backgroundColor: 'transparent',
            includeFontPadding: false,
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: 0,
            paddingRight: 0,
            margin: 0,
            textAlignVertical: 'top',
          },
        ]}
      />
      <View
        pointerEvents={displayPointerEvents}
        style={{
          opacity:
            isSelectionActive && !keepDisplayVisibleDuringSelection ? 0 : 1,
        }}>
        {shouldRenderBlockDisplay
          ? renderedBlocks
          : renderHighlightedText(content, globalRanges, darkMode, textStyle)}
      </View>
      {onFloatingSheetChange ? null : (
        <HighlightActionSheet
          visible={Boolean(selectedText)}
          darkMode={darkMode}
          selectedCount={selectedBlockSelections.length}
          selectedText={selectedText}
          onClose={clearSelection}
          onSelectColor={applyInlineHighlight}
          onClearHighlights={clearSelectedHighlights}
          freeSelectionEnabled={false}
          allowBlockHighlight={true}
        />
      )}
    </View>
  );
};

export default HighlightableHtmlBlocksBase;
