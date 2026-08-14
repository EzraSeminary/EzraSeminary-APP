import React from 'react';
import {ScrollView, Text, TouchableOpacity, View} from 'react-native';
import tw from '../../tailwind';
import useReaderFontFamily from '../hooks/useReaderFontFamily';
import {getReaderFontFamily} from '../utils/readerFonts';

const ReaderFontFamilySelector = ({
  darkMode,
  compact = false,
  showTitle = true,
  contentContainerStyle,
}) => {
  const {readerFontId, readerFonts, setReaderFontId} = useReaderFontFamily();

  return (
    <View style={contentContainerStyle}>
      {showTitle && (
        <Text
          style={[
            tw`font-nokia-bold text-xs mb-2`,
            darkMode ? tw`text-primary-3` : tw`text-secondary-5`,
          ]}>
          Font Type
        </Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`flex-row gap-2`}>
        {readerFonts.map(font => {
          const isSelected = font.id === readerFontId;

          return (
            <TouchableOpacity
              key={font.id}
              activeOpacity={0.8}
              onPress={() => {
                setReaderFontId(font.id);
              }}
              style={[
                tw`border rounded-full px-3 items-center justify-center`,
                compact ? tw`py-2` : tw`py-3`,
                isSelected
                  ? tw`bg-accent-6 border-accent-6`
                  : darkMode
                  ? tw`bg-secondary-8 border-secondary-6`
                  : tw`bg-primary-1 border-primary-4`,
              ]}>
              <Text
                numberOfLines={1}
                style={[
                  tw`font-nokia-bold`,
                  compact ? tw`text-xs` : tw`text-sm`,
                  isSelected
                    ? tw`text-primary-1`
                    : darkMode
                    ? tw`text-primary-1`
                    : tw`text-secondary-7`,
                  {fontFamily: getReaderFontFamily(font.id)},
                ]}>
                {font.sample}
              </Text>
              {!compact && (
                <Text
                  numberOfLines={1}
                  style={[
                    tw`font-nokia-bold text-xs mt-1`,
                    isSelected
                      ? tw`text-primary-1`
                      : darkMode
                      ? tw`text-primary-3`
                      : tw`text-secondary-4`,
                  ]}>
                  {font.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default ReaderFontFamilySelector;
