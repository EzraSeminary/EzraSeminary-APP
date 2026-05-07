import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import tw from '../../tailwind';

const ReaderFontSizeControl = ({
  darkMode,
  isVisible,
  onToggle,
  onDecrease,
  onIncrease,
  percentage,
  popupStyle,
  triggerStyle,
  wrapperStyle,
}) => {
  return (
    <View style={wrapperStyle}>
      <TouchableOpacity
        onPress={onToggle}
        style={[
          tw`border border-accent-6 rounded-full px-3 py-1`,
          darkMode ? tw`bg-secondary-8` : tw`bg-primary-1`,
          triggerStyle,
        ]}>
        <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>A+</Text>
      </TouchableOpacity>
      {isVisible ? (
        <View
          style={[
            tw`absolute top-11 right-0 rounded-3xl px-3 py-2 border flex-row items-center`,
            darkMode
              ? tw`bg-secondary-9 border-secondary-6`
              : tw`bg-primary-1 border-primary-4`,
            {
              minWidth: 168,
              zIndex: 20,
              elevation: 12,
            },
            popupStyle,
          ]}>
          <TouchableOpacity
            onPress={onDecrease}
            style={tw`px-3 py-1 rounded-full bg-accent-6`}>
            <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>A-</Text>
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
            style={tw`px-3 py-1 rounded-full bg-accent-6`}>
            <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>A+</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

export default ReaderFontSizeControl;
