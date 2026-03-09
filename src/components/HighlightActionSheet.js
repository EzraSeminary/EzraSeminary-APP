import React from 'react';
import {
  Modal,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {Copy, Selection, ShareNetwork, X} from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import tw from './../../tailwind';
import {HIGHLIGHT_PALETTE} from '../utils/highlightPalette';

const HighlightActionSheet = ({
  visible,
  darkMode,
  previewText,
  activeColorId,
  onClose,
  onSelectColor,
  onClearHighlight,
}) => {
  const handleCopy = async () => {
    try {
      Clipboard.setString(previewText || '');
      Toast.show({
        type: 'success',
        text1: 'Copied to clipboard',
      });
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Copy failed',
        text2: 'Unable to copy this text.',
      });
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: previewText || '',
      });
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Share failed',
        text2: 'Unable to share this text.',
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={tw`flex-1 justify-end bg-black bg-opacity-45`}>
        <View
          style={[
            tw`rounded-t-3xl px-5 pt-4 pb-8`,
            {backgroundColor: darkMode ? '#111827' : '#FFFFFF'},
          ]}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <View style={tw`flex-row items-center`}>
              <Selection size={22} color="#EA9215" weight="bold" />
              <Text
                style={[
                  tw`font-nokia-bold text-lg ml-2`,
                  {color: darkMode ? '#F8FAFC' : '#111827'},
                ]}>
                Highlight Text
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={tw`p-2`}>
              <X size={20} color={darkMode ? '#F8FAFC' : '#111827'} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              tw`rounded-2xl px-4 py-3 mb-4 border`,
              {
                backgroundColor: darkMode ? '#1F2937' : '#F8FAFC',
                borderColor: darkMode ? '#374151' : '#E5E7EB',
              },
            ]}>
            <ScrollView
              style={{maxHeight: 120}}
              showsVerticalScrollIndicator={false}>
              <Text
                style={[
                  tw`font-nokia-bold text-sm leading-6`,
                  {color: darkMode ? '#E5E7EB' : '#374151'},
                ]}>
                {previewText}
              </Text>
            </ScrollView>
          </View>

          <Text
            style={[
              tw`font-nokia-bold text-sm mb-3`,
              {color: darkMode ? '#CBD5E1' : '#475569'},
            ]}>
            Choose a color
          </Text>

          <View style={tw`flex-row flex-wrap justify-between mb-5`}>
            {HIGHLIGHT_PALETTE.map(color => {
              const isActive = color.id === activeColorId;
              const swatchColor = darkMode
                ? color.darkBackground
                : color.lightBackground;
              const borderColor = darkMode
                ? color.darkBorder
                : color.lightBorder;

              return (
                <TouchableOpacity
                  key={color.id}
                  onPress={() => onSelectColor(color.id)}
                  style={[
                    tw`rounded-full mb-3 items-center justify-center`,
                    {
                      width: 30,
                      height: 30,
                      backgroundColor: swatchColor,
                      borderWidth: isActive ? 3 : 1.5,
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
                tw`flex-row items-center justify-center rounded-2xl px-4 py-3`,
                {
                  backgroundColor: darkMode ? '#1F2937' : '#F8FAFC',
                  width: '31%',
                },
              ]}>
              <Copy size={18} color="#EA9215" weight="bold" />
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
                tw`flex-row items-center justify-center rounded-2xl px-4 py-3`,
                {
                  backgroundColor: darkMode ? '#1F2937' : '#F8FAFC',
                  width: '31%',
                },
              ]}>
              <ShareNetwork size={18} color="#EA9215" weight="bold" />
              <Text
                style={[
                  tw`font-nokia-bold ml-2`,
                  {color: darkMode ? '#F8FAFC' : '#111827'},
                ]}>
                Share
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClearHighlight}
              style={[
                tw`items-center justify-center rounded-2xl px-4 py-3`,
                {
                  backgroundColor: activeColorId ? '#EA9215' : '#9CA3AF',
                  width: '31%',
                },
              ]}
              disabled={!activeColorId}>
              <Text style={tw`font-nokia-bold text-white`}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default HighlightActionSheet;
