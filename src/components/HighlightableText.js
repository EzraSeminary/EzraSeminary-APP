import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import tw from './../../tailwind';
import {useSelector} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Highlighter, Palette, X} from 'phosphor-react-native';

const {width: screenWidth} = Dimensions.get('window');

const HighlightableText = ({content, lessonId, dayId, style, onHighlight}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const [highlights, setHighlights] = useState([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState(null);

  const highlightColors = [
    {name: 'Yellow', color: '#FBBF24', bgColor: '#FEF3C7'},
    {name: 'Green', color: '#10B981', bgColor: '#D1FAE5'},
    {name: 'Blue', color: '#3B82F6', bgColor: '#DBEAFE'},
    {name: 'Pink', color: '#EC4899', bgColor: '#FCE7F3'},
    {name: 'Orange', color: '#F97316', bgColor: '#FED7AA'},
  ];

  const handleTextSelection = (text, start, end) => {
    if (text.length > 10) {
      // Only allow highlighting of meaningful text
      setSelectedText(text);
      setSelectionRange({start, end});
      setShowColorPicker(true);
    }
  };

  const addHighlight = async color => {
    if (!selectedText || !selectionRange) return;

    const newHighlight = {
      id: Date.now().toString(),
      text: selectedText,
      start: selectionRange.start,
      end: selectionRange.end,
      color: color.color,
      bgColor: color.bgColor,
      timestamp: new Date().toISOString(),
    };

    const updatedHighlights = [...highlights, newHighlight];
    setHighlights(updatedHighlights);

    // Save to AsyncStorage
    try {
      const storageKey = `highlights_${lessonId}_${dayId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHighlights));
      if (onHighlight) onHighlight(updatedHighlights);
    } catch (error) {
      console.error('Error saving highlight:', error);
    }

    setShowColorPicker(false);
    setSelectedText('');
    setSelectionRange(null);
  };

  const removeHighlight = async highlightId => {
    const updatedHighlights = highlights.filter(h => h.id !== highlightId);
    setHighlights(updatedHighlights);

    try {
      const storageKey = `highlights_${lessonId}_${dayId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHighlights));
      if (onHighlight) onHighlight(updatedHighlights);
    } catch (error) {
      console.error('Error removing highlight:', error);
    }
  };

  const loadHighlights = React.useCallback(async () => {
    try {
      const storageKey = `highlights_${lessonId}_${dayId}`;
      const savedHighlights = await AsyncStorage.getItem(storageKey);
      if (savedHighlights) {
        setHighlights(JSON.parse(savedHighlights));
      }
    } catch (error) {
      console.error('Error loading highlights:', error);
    }
  }, [lessonId, dayId]);

  React.useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  const renderHighlightedText = () => {
    if (!content || highlights.length === 0) {
      return (
        <Text
          style={style}
          selectable={true}
          onSelectionChange={event => {
            const {nativeEvent} = event;
            if (nativeEvent.selection.start !== nativeEvent.selection.end) {
              const selectedText = content.substring(
                nativeEvent.selection.start,
                nativeEvent.selection.end,
              );
              handleTextSelection(
                selectedText,
                nativeEvent.selection.start,
                nativeEvent.selection.end,
              );
            }
          }}>
          {content}
        </Text>
      );
    }

    // Sort highlights by start position
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);
    const textParts = [];
    let lastIndex = 0;

    sortedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        textParts.push({
          text: content.substring(lastIndex, highlight.start),
          isHighlighted: false,
        });
      }

      // Add highlighted text
      textParts.push({
        text: highlight.text,
        isHighlighted: true,
        highlight: highlight,
      });

      lastIndex = highlight.end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      textParts.push({
        text: content.substring(lastIndex),
        isHighlighted: false,
      });
    }

    return (
      <Text style={style} selectable={true}>
        {textParts.map((part, index) => (
          <Text
            key={index}
            style={[
              part.isHighlighted && {
                backgroundColor: part.highlight?.bgColor,
                color: part.highlight?.color,
              },
            ]}
            onLongPress={
              part.isHighlighted
                ? () => {
                    Alert.alert(
                      'Remove Highlight',
                      'Do you want to remove this highlight?',
                      [
                        {text: 'Cancel', style: 'cancel'},
                        {
                          text: 'Remove',
                          onPress: () => removeHighlight(part.highlight.id),
                          style: 'destructive',
                        },
                      ],
                    );
                  }
                : undefined
            }>
            {part.text}
          </Text>
        ))}
      </Text>
    );
  };

  return (
    <View>
      {renderHighlightedText()}

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowColorPicker(false)}>
        <View
          style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
          <View
            style={[
              tw`bg-white rounded-xl p-6 mx-4 shadow-lg`,
              darkMode ? tw`bg-secondary-8` : null,
              {maxWidth: screenWidth * 0.85},
            ]}>
            {/* Header */}
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <View style={tw`flex-row items-center`}>
                <Highlighter size={24} color="#EA9215" weight="bold" />
                <Text
                  style={[
                    tw`font-nokia-bold text-lg ml-2`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  Choose Highlight Color
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowColorPicker(false)}
                style={tw`p-1`}>
                <X
                  size={20}
                  color={darkMode ? '#FFFFFF' : '#374151'}
                  weight="bold"
                />
              </TouchableOpacity>
            </View>

            {/* Selected Text Preview */}
            <View
              style={[
                tw`p-3 rounded-lg mb-4 border`,
                darkMode
                  ? tw`bg-secondary-7 border-secondary-6`
                  : tw`bg-gray-50 border-gray-200`,
              ]}>
              <Text
                style={[
                  tw`font-nokia-bold text-sm`,
                  darkMode ? tw`text-primary-2` : tw`text-gray-700`,
                ]}
                numberOfLines={3}>
                "{selectedText}"
              </Text>
            </View>

            {/* Color Options */}
            <View style={tw`flex-row justify-around mb-4`}>
              {highlightColors.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    tw`w-12 h-12 rounded-full items-center justify-center border-2`,
                    {
                      backgroundColor: color.bgColor,
                      borderColor: color.color,
                    },
                  ]}
                  onPress={() => addHighlight(color)}
                  activeOpacity={0.7}>
                  <Palette size={20} color={color.color} weight="fill" />
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[
                tw`py-3 px-4 rounded-lg border`,
                darkMode ? tw`border-secondary-6` : tw`border-gray-300`,
              ]}
              onPress={() => setShowColorPicker(false)}>
              <Text
                style={[
                  tw`font-nokia-bold text-center`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HighlightableText;
