import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Clipboard,
  Share,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import HTMLView from 'react-native-htmlview';
import tw from './../../tailwind';
import {useSelector} from 'react-redux';
import {Copy, ShareNetwork, Selection, X, Check} from 'phosphor-react-native';

const {width: screenWidth} = Dimensions.get('window');

const SelectableHTMLView = ({
  value,
  stylesheet,
  onLongPress,
  enableSelection = true,
  ...props
}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Extract plain text from HTML for selection
  const extractTextFromHTML = html => {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  };

  const handleLongPress = () => {
    if (!enableSelection || !value) return;

    const textContent = extractTextFromHTML(value);
    setSelectedContent(textContent);
    setShowSelectionModal(true);

    if (onLongPress) {
      onLongPress(textContent);
    }
  };

  const copyToClipboard = async () => {
    try {
      await Clipboard.setString(selectedContent);
      setShowSelectionModal(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy text to clipboard');
    }
  };

  const shareText = async () => {
    try {
      await Share.share({
        message: selectedContent,
        title: 'Devotional Content',
      });
      setShowSelectionModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to share content');
    }
  };

  const renderNode = (node, index, siblings, parent, defaultRenderer) => {
    // Make text content selectable by wrapping in TouchableOpacity
    if (node.name === 'p' && enableSelection) {
      return (
        <TouchableOpacity
          key={index}
          activeOpacity={1}
          onLongPress={handleLongPress}
          style={tw`mb-2`}>
          <Text style={stylesheet?.p || {}}>
            {defaultRenderer(node.children, node)}
          </Text>
        </TouchableOpacity>
      );
    }

    // Handle other HTML elements normally
    return defaultRenderer(node.children, node);
  };

  return (
    <View>
      <TouchableOpacity
        activeOpacity={1}
        onLongPress={handleLongPress}
        disabled={!enableSelection}>
        <HTMLView
          value={value}
          stylesheet={stylesheet}
          renderNode={enableSelection ? renderNode : undefined}
          {...props}
        />
      </TouchableOpacity>

      {/* Selection Modal */}
      <Modal
        visible={showSelectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSelectionModal(false)}>
        <View style={tw`flex-1 justify-end bg-black bg-opacity-50`}>
          <View
            style={[
              tw`bg-white rounded-t-3xl max-h-80`,
              darkMode ? tw`bg-secondary-8` : null,
            ]}>
            {/* Header */}
            <View
              style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
              <View style={tw`flex-row items-center`}>
                <Selection size={24} color="#EA9215" weight="bold" />
                <Text
                  style={[
                    tw`font-nokia-bold text-lg ml-2`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  Selected Text
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSelectionModal(false)}
                style={tw`p-2`}>
                <X
                  size={20}
                  color={darkMode ? '#FFFFFF' : '#374151'}
                  weight="bold"
                />
              </TouchableOpacity>
            </View>

            {/* Content Preview */}
            <ScrollView style={tw`px-4 py-2 max-h-40`}>
              <Text
                style={[
                  tw`font-nokia-bold text-sm leading-relaxed`,
                  darkMode ? tw`text-primary-2` : tw`text-gray-700`,
                ]}>
                {selectedContent}
              </Text>
            </ScrollView>

            {/* Action Buttons */}
            <View style={tw`flex-row p-4 gap-3`}>
              <TouchableOpacity
                style={tw`flex-1 flex-row items-center justify-center bg-accent-6 py-3 px-4 rounded-xl`}
                onPress={copyToClipboard}
                activeOpacity={0.8}>
                <Copy size={20} color="#FFFFFF" weight="bold" />
                <Text style={tw`font-nokia-bold text-white ml-2`}>Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  tw`flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl border border-accent-6`,
                  darkMode ? tw`border-accent-6` : tw`border-accent-6`,
                ]}
                onPress={shareText}
                activeOpacity={0.8}>
                <ShareNetwork size={20} color="#EA9215" weight="bold" />
                <Text style={[tw`font-nokia-bold ml-2 text-accent-6`]}>
                  Share
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Toast */}
      {showSuccessToast && (
        <Modal
          visible={showSuccessToast}
          transparent={true}
          animationType="fade">
          <View style={tw`flex-1 justify-center items-center`}>
            <View
              style={[
                tw`bg-green-500 py-3 px-6 rounded-full flex-row items-center shadow-lg`,
                {elevation: 5},
              ]}>
              <Check size={20} color="#FFFFFF" weight="bold" />
              <Text style={tw`font-nokia-bold text-white ml-2`}>
                Copied to clipboard!
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default SelectableHTMLView;
