import React from 'react';
import {Modal, Pressable, View, Text, TouchableOpacity} from 'react-native';
import {Minus, Plus, TextT} from 'phosphor-react-native';
import tw from '../../tailwind';
import ReaderFontFamilySelector from './ReaderFontFamilySelector';

const ReaderFontSizeControl = ({
  darkMode,
  isVisible,
  onToggle,
  onDecrease,
  onIncrease,
  percentage,
  popupStyle,
  popupPosition,
  triggerStyle,
  wrapperStyle,
  showFontFamilySelector = false,
}) => {
  const iconColor = isVisible ? '#FFFFFF' : '#EA9215';
  const resolvedPopupPosition = popupPosition || {
    top: 116,
    right: 24,
  };

  return (
    <View style={wrapperStyle}>
      <TouchableOpacity
        onPress={onToggle}
        style={[
          tw`items-center justify-center border border-accent-6 rounded-full`,
          {
            width: 42,
            height: 42,
            backgroundColor: isVisible
              ? '#EA9215'
              : darkMode
              ? '#1F2937'
              : '#FFFFFF',
          },
          triggerStyle,
        ]}>
        <TextT size={20} color={iconColor} weight="bold" />
      </TouchableOpacity>
      <Modal
        visible={Boolean(isVisible)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onToggle}>
        <View style={tw`flex-1`} pointerEvents="box-none">
          <Pressable style={tw`absolute inset-0`} onPress={onToggle} />
          <View
            style={[
              tw`absolute rounded-5 px-3 py-3 border`,
              darkMode
                ? tw`bg-secondary-9 border-secondary-6`
                : tw`bg-primary-1 border-primary-4`,
              {
                ...resolvedPopupPosition,
                minWidth: showFontFamilySelector ? 260 : 156,
                maxWidth: 340,
                zIndex: 1000,
                elevation: 30,
                shadowColor: '#000000',
                shadowOpacity: 0.25,
                shadowRadius: 16,
                shadowOffset: {width: 0, height: 8},
              },
              popupStyle,
            ]}>
            <View style={tw`flex-row items-center`}>
              <TouchableOpacity
                onPress={onDecrease}
                style={tw`w-9 h-9 rounded-full bg-accent-6 items-center justify-center`}>
                <Minus size={16} color="#FFFFFF" weight="bold" />
              </TouchableOpacity>
              <Text
                style={[
                  tw`font-nokia-bold text-sm px-2 flex-1 text-center`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                ]}>
                {percentage}%
              </Text>
              <TouchableOpacity
                onPress={onIncrease}
                style={tw`w-9 h-9 rounded-full bg-accent-6 items-center justify-center`}>
                <Plus size={16} color="#FFFFFF" weight="bold" />
              </TouchableOpacity>
            </View>
            {showFontFamilySelector && (
              <ReaderFontFamilySelector
                darkMode={darkMode}
                compact
                contentContainerStyle={tw`mt-3`}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ReaderFontSizeControl;
