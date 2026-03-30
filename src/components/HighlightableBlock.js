import React, {useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import HighlightActionSheet from './HighlightActionSheet';
import {getHighlightColors} from '../utils/highlightPalette';

const HighlightableBlock = ({
  blockId,
  text,
  darkMode,
  activeColorId,
  onSelectColor,
  onClearHighlight,
  isSelectionMode,
  isSelected,
  onLongPressBlock,
  onPressBlock,
  style,
  children,
  disabled = false,
}) => {
  const [showSingleSheet, setShowSingleSheet] = useState(false);
  const highlightColors = getHighlightColors(activeColorId, darkMode);
  const usesExternalSelection =
    typeof onLongPressBlock === 'function' &&
    typeof onPressBlock === 'function';

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.92}
        delayLongPress={220}
        disabled={disabled}
        onLongPress={() => {
          if (!text) {
            return;
          }
          if (usesExternalSelection) {
            onLongPressBlock(blockId);
            return;
          }
          setShowSingleSheet(true);
        }}
        onPress={() => {
          if (!usesExternalSelection || !isSelectionMode) {
            return;
          }
          onPressBlock(blockId);
        }}>
        <View
          style={[
            style,
            highlightColors
              ? {
                  backgroundColor: highlightColors.backgroundColor,
                  borderColor: highlightColors.borderColor,
                  borderWidth: 1,
                  borderRadius: 16,
                  overflow: 'hidden',
                }
              : null,
            isSelected
              ? {
                  borderColor: '#EA9215',
                  borderWidth: 2,
                }
              : null,
          ]}>
          {children}
        </View>
      </TouchableOpacity>

      {usesExternalSelection ? null : (
        <HighlightActionSheet
          visible={showSingleSheet}
          darkMode={darkMode}
          selectedCount={1}
          selectedText={text || ''}
          onClose={() => setShowSingleSheet(false)}
          onSelectColor={async colorId => {
            if (onSelectColor) {
              await onSelectColor(blockId, colorId);
            }
            setShowSingleSheet(false);
          }}
          onClearHighlights={async () => {
            if (onClearHighlight) {
              await onClearHighlight(blockId);
            }
            setShowSingleSheet(false);
          }}
        />
      )}
    </>
  );
};

export default HighlightableBlock;
