import React, {useEffect, useMemo, useState} from 'react';
import {View, Text, TouchableOpacity, Modal, Pressable} from 'react-native';
import {X} from 'phosphor-react-native';
import tw from '../../../../tailwind';

const VerseSection = ({value, setIsVerseComplete}) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [openedVerseIndices, setOpenedVerseIndices] = useState(new Set());

  const verses = useMemo(() => {
    if (!Array.isArray(value)) {
      return [];
    }

    if (value.length > 0 && Array.isArray(value[0])) {
      return value
        .filter(item => Array.isArray(item) && item.length >= 2)
        .map(item => [String(item[0]), String(item[1])]);
    }

    if (
      value.length >= 2 &&
      typeof value[0] === 'string' &&
      typeof value[1] === 'string'
    ) {
      return [[value[0], value[1]]];
    }

    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      return value
        .map(item => {
          const title = item.title || item.reference || item.verse || item.name;
          const content = item.content || item.text || item.body;
          if (!title || !content) {
            return null;
          }
          return [String(title), String(content)];
        })
        .filter(Boolean);
    }

    return [];
  }, [value]);

  const handleClose = () => {
    setActiveIndex(null);
  };

  const handleOpenVerse = index => {
    setActiveIndex(index);
    setOpenedVerseIndices(previous => {
      const next = new Set(previous);
      next.add(index);
      return next;
    });
  };

  useEffect(() => {
    setOpenedVerseIndices(new Set());
  }, [verses.length]);

  useEffect(() => {
    if (setIsVerseComplete) {
      if (verses.length === 0) {
        setIsVerseComplete(false);
      } else {
        setIsVerseComplete(openedVerseIndices.size === verses.length);
      }
    }
  }, [openedVerseIndices, setIsVerseComplete, verses.length]);

  return (
    <View style={tw`w-full flex  items-center mt-4`}>
      <View style={tw`w-full gap-2`}>
        {verses.map((verseItem, index) => (
          <TouchableOpacity
            key={`${verseItem[0]}-${index}`}
            onPress={() => handleOpenVerse(index)}
            style={tw`underline self-center`}>
            <Text
              style={tw`text-primary-2 bg-accent-7 px-3 py-1 rounded text-lg font-nokia-bold`}>
              {verseItem[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeIndex !== null && (
        <Modal
          transparent={true}
          visible={activeIndex !== null}
          animationType="fade"
          onRequestClose={handleClose}>
          <Pressable
            style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}
            onPress={e => {
              if (e.target === e.currentTarget) {
                handleClose();
              }
            }}>
            <View
              style={tw`w-[90%] max-w-lg bg-secondary-8 bg-opacity-95 shadow-2xl px-4 py-6 rounded-lg my-2 border border-accent-6 relative`}>
              <Text
                style={tw`absolute top-[-1rem] self-center transform -translate-x-1/2 text-lg text-primary-2 bg-accent-8 px-4 py-1 rounded-md shadow-md font-nokia-bold`}>
                {verses[activeIndex]?.[0]}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={tw`absolute right-1 top-1 z-50 p-1 bg-accent-6 border rounded-full`}>
                <X size={15} style={tw`text-primary-5`} />
              </TouchableOpacity>
              <Text
                style={tw`text-primary-2 text-lg leading-relaxed py-1 font-nokia-bold text-center`}>
                {verses[activeIndex]?.[1]}
              </Text>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

export default VerseSection;
