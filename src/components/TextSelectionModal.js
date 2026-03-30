import React, {useMemo, useState} from 'react';
import {
  Modal,
  SafeAreaView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {Copy, Selection, ShareNetwork, TextAa, X} from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import tw from './../../tailwind';
import {HIGHLIGHT_PALETTE} from '../utils/highlightPalette';

const TextSelectionModal = ({
  visible,
  darkMode,
  content,
  blockRanges,
  onClose,
  onApplyHighlight,
}) => {
  const [selection, setSelection] = useState({start: 0, end: 0});

  const selectedText = useMemo(() => {
    if (!content || selection.start === selection.end) {
      return '';
    }

    return content.substring(selection.start, selection.end);
  }, [content, selection.end, selection.start]);

  const selectedBlockIds = useMemo(() => {
    if (selection.start === selection.end) {
      return [];
    }

    return blockRanges
      .filter(
        blockRange =>
          selection.start < blockRange.end && selection.end > blockRange.start,
      )
      .map(blockRange => blockRange.id);
  }, [blockRanges, selection.end, selection.start]);

  const requireSelection = () => {
    if (selectedText) {
      return true;
    }

    Toast.show({
      type: 'info',
      text1: 'Select text first',
      text2: 'Drag across the text, then choose an action.',
    });
    return false;
  };

  const handleCopy = () => {
    if (!requireSelection()) {
      return;
    }

    Clipboard.setString(selectedText);
    Toast.show({
      type: 'success',
      text1: 'Copied to clipboard',
    });
  };

  const handleShare = async () => {
    if (!requireSelection()) {
      return;
    }

    try {
      await Share.share({message: selectedText});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Share failed',
      });
    }
  };

  const handleHighlight = async colorId => {
    if (!requireSelection()) {
      return;
    }

    await onApplyHighlight(selectedBlockIds, colorId);
    Toast.show({
      type: 'success',
      text1: 'Highlight saved',
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <SafeAreaView style={tw`flex-1 bg-black bg-opacity-55`}>
        <View
          style={[
            tw`flex-1 mt-10 rounded-t-3xl px-5 pt-4 pb-6`,
            {backgroundColor: darkMode ? '#111827' : '#FFFFFF'},
          ]}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <View style={tw`flex-row items-center`}>
              <TextAa size={22} color="#EA9215" weight="bold" />
              <Text
                style={[
                  tw`font-nokia-bold text-lg ml-2`,
                  {color: darkMode ? '#F8FAFC' : '#111827'},
                ]}>
                Select Text
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={tw`p-2`}>
              <X size={20} color={darkMode ? '#F8FAFC' : '#111827'} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              tw`rounded-2xl border px-4 py-3 mb-4`,
              {
                backgroundColor: darkMode ? '#1F2937' : '#F8FAFC',
                borderColor: darkMode ? '#374151' : '#E5E7EB',
              },
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-sm mb-2`,
                {color: darkMode ? '#E5E7EB' : '#334155'},
              ]}>
              Drag to select across paragraphs
            </Text>
            <TextInput
              multiline
              editable
              scrollEnabled
              value={content}
              onChangeText={() => {}}
              onSelectionChange={({nativeEvent}) =>
                setSelection(nativeEvent.selection)
              }
              selectionColor="#EA9215"
              showSoftInputOnFocus={false}
              contextMenuHidden={false}
              style={[
                tw`font-nokia-bold text-base leading-6`,
                {
                  color: darkMode ? '#F8FAFC' : '#111827',
                  minHeight: 360,
                  textAlignVertical: 'top',
                },
              ]}
            />
          </View>
          <View style={tw`flex-row flex-wrap justify-between mb-5`}>
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
                  onPress={() => handleHighlight(color.id)}
                  style={[
                    tw`rounded-full mb-3`,
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
              onPress={() => {
                if (!requireSelection()) {
                  return;
                }
                Toast.show({
                  type: 'info',
                  text1: 'Pick a color below',
                });
              }}
              style={[
                tw`flex-row items-center justify-center rounded-2xl px-4 py-3`,
                {
                  backgroundColor: '#EA9215',
                  width: '31%',
                },
              ]}>
              <Selection size={18} color="#FFFFFF" weight="bold" />
              <Text style={tw`font-nokia-bold ml-2 text-white`}>Mark</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default TextSelectionModal;
