import React, {useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import HighlightActionSheet from './HighlightActionSheet';

const HighlightableBlock = ({
  blockId,
  text,
  darkMode,
  activeColorId,
  onSelectColor,
  onClearHighlight,
  style,
  children,
  disabled = false,
}) => {
  const [isSheetVisible, setIsSheetVisible] = useState(false);

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
          setIsSheetVisible(true);
        }}>
        <View style={style}>{children}</View>
      </TouchableOpacity>

      <HighlightActionSheet
        visible={isSheetVisible}
        darkMode={darkMode}
        previewText={text}
        activeColorId={activeColorId}
        onClose={() => setIsSheetVisible(false)}
        onSelectColor={async colorId => {
          await onSelectColor(blockId, colorId);
          setIsSheetVisible(false);
        }}
        onClearHighlight={async () => {
          await onClearHighlight(blockId);
          setIsSheetVisible(false);
        }}
      />
    </>
  );
};

export default HighlightableBlock;
