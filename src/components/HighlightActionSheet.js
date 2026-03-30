import React from 'react';
import {Modal, Share, Text, TouchableOpacity, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {Check, Copy, ShareNetwork, X} from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import tw from './../../tailwind';
import {HIGHLIGHT_PALETTE} from '../utils/highlightPalette';

const HighlightActionSheet = ({
  visible,
  darkMode,
  selectedCount,
  selectedText,
  onClose,
  onSelectColor,
  onClearHighlights,
}) => {
  const ensureSelection = () => {
    if (selectedCount > 0) {
      return true;
    }

    Toast.show({
      type: 'info',
      text1: 'Select text first',
      text2: 'Long press and tap more paragraphs to expand selection.',
    });
    return false;
  };

  const handleCopy = () => {
    if (!ensureSelection()) {
      return;
    }

    Clipboard.setString(selectedText || '');
    Toast.show({
      type: 'success',
      text1: 'Copied to clipboard',
    });
  };

  const handleShare = async () => {
    if (!ensureSelection()) {
      return;
    }

    try {
      await Share.share({message: selectedText || ''});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Share failed',
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={tw`flex-1 justify-end`} pointerEvents="box-none">
        <View
          style={[
            tw`mx-3 mb-3 rounded-3xl px-4 pt-3 pb-4`,
            {backgroundColor: darkMode ? '#111827' : '#FFFFFF'},
          ]}>
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <Text
              style={[
                tw`font-nokia-bold text-sm`,
                {color: darkMode ? '#F8FAFC' : '#111827'},
              ]}>
              {selectedCount} selected
            </Text>
            <TouchableOpacity onPress={onClose} style={tw`p-1`}>
              <X size={20} color={darkMode ? '#F8FAFC' : '#111827'} />
            </TouchableOpacity>
          </View>

          <View style={tw`flex-row flex-wrap justify-between mb-3`}>
            {HIGHLIGHT_PALETTE.map(color => {
              const swatchColor = darkMode
                ? color.darkBackground
                : color.lightBackground;
              const borderColor = darkMode
                ? color.darkBorder
                : color.lightBorder;

              return (
                <TouchableOpacity
                  key={color.id}
                  onPress={async () => {
                    if (!ensureSelection()) {
                      return;
                    }
                    await onSelectColor(color.id);
                  }}
                  style={[
                    tw`rounded-full mb-2 items-center justify-center`,
                    {
                      width: 30,
                      height: 30,
                      backgroundColor: swatchColor,
                      borderWidth: 2,
                      borderColor,
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={tw`flex-row justify-between`}>
            <TouchableOpacity
              onPress={handleCopy}
              style={[
                tw`flex-row items-center justify-center rounded-2xl py-2`,
                {
                  width: '31%',
                  backgroundColor: darkMode ? '#1F2937' : '#F8FAFC',
                },
              ]}>
              <Copy size={16} color="#EA9215" weight="bold" />
              <Text
                style={[
                  tw`font-nokia-bold ml-2`,
                  {color: darkMode ? '#F8FAFC' : '#111827'},
                ]}>
                Copy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={[
                tw`flex-row items-center justify-center rounded-2xl py-2`,
                {
                  width: '31%',
                  backgroundColor: darkMode ? '#1F2937' : '#F8FAFC',
                },
              ]}>
              <ShareNetwork size={16} color="#EA9215" weight="bold" />
              <Text
                style={[
                  tw`font-nokia-bold ml-2`,
                  {color: darkMode ? '#F8FAFC' : '#111827'},
                ]}>
                Share
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClearHighlights}
              style={[
                tw`flex-row items-center justify-center rounded-2xl py-2`,
                {
                  width: '31%',
                  backgroundColor: '#EA9215',
                },
              ]}>
              <Check size={16} color="#FFFFFF" weight="bold" />
              <Text style={tw`font-nokia-bold ml-2 text-white`}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default HighlightActionSheet;
