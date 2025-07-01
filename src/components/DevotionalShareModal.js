import React from 'react';
import {View, Text, TouchableOpacity, Modal, Share} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import {Copy, ShareNetwork, X} from 'phosphor-react-native';
import tw from './../../tailwind';
import {formatDevotionalForSharing} from '../utils/textFormatter';

const DevotionalShareModal = ({
  visible,
  onClose,
  devotional,
  darkMode = false,
}) => {
  const handleCopyToClipboard = async () => {
    try {
      const formattedText = formatDevotionalForSharing(devotional);
      await Clipboard.setString(formattedText);
      Toast.show({
        type: 'success',
        text1: 'Done!',
        text2: 'የዕለቱ መንፈሳዊ ትምህርት ወደ ክሊፕቦርድ ተገልብጧል።',
      });
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error!',
        text2: 'መገልበጥ አልተሳካም። እባክዎ እንደገና ይሞክሩ።',
      });
    }
  };

  const handleNativeShare = async () => {
    try {
      const formattedText = formatDevotionalForSharing(devotional);
      const result = await Share.share({
        message: formattedText,
        title: `የዕለቱ መንፈሳዊ ትምህርት - ${devotional.title}`,
      });

      if (result.action === Share.sharedAction) {
        onClose();
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'ማጋራት አልተሳካም። እባክዎ እንደገና ይሞክሩ።',
      });
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={tw`flex-1 justify-end bg-black bg-opacity-50`}>
        <View
          style={[
            tw`bg-white rounded-t-6 p-6`,
            darkMode ? tw`bg-secondary-8` : null,
          ]}>
          {/* Header */}
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <Text
              style={[
                tw`text-xl font-nokia-bold text-secondary-6`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              የዕለቱን መንፈሳዊ ትምህርት አጋራ
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X
                size={28}
                weight="bold"
                color={darkMode ? '#F8F8F8' : '#333333'}
              />
            </TouchableOpacity>
          </View>

          {/* Share Options */}
          <View style={tw`gap-4`}>
            {/* Copy to Clipboard */}
            <TouchableOpacity
              style={[
                tw`flex-row items-center p-4 bg-primary-2 rounded-4 border border-accent-6`,
                darkMode ? tw`bg-secondary-7` : null,
              ]}
              onPress={handleCopyToClipboard}>
              <Copy size={32} weight="bold" color="#EA9215" style={tw`mr-4`} />
              <View>
                <Text
                  style={[
                    tw`text-xl font-nokia-bold text-secondary-6`,
                    darkMode ? tw`text-primary-1` : null,
                  ]}>
                  ወደ ክሊፕቦርድ ገልብጥ
                </Text>
              </View>
            </TouchableOpacity>

            {/* Native Share */}
            <TouchableOpacity
              style={[tw`flex-row items-center p-4 bg-accent-6 rounded-4`]}
              onPress={handleNativeShare}>
              <ShareNetwork
                size={32}
                weight="bold"
                color="#FFFFFF"
                style={tw`mr-4`}
              />
              <View>
                <Text style={tw`text-lg font-nokia-bold text-white`}>
                  ወደ ሌላ መተግበሪያ አጋራ
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={tw`mt-6`}>
            <Text
              style={[
                tw`text-sm font-nokia-bold text-secondary-4 mb-2`,
                darkMode ? tw`text-primary-3` : null,
              ]}>
              የሚጋራው ይዘት ምሳሌ:
            </Text>
            <View
              style={[
                tw`p-3 bg-primary-1 rounded-4 border border-primary-3 max-h-32`,
                darkMode ? tw`bg-secondary-9 border-secondary-6` : null,
              ]}>
              <Text
                style={[
                  tw`text-xs text-secondary-5 font-nokia-bold`,
                  darkMode ? tw`text-primary-2` : null,
                ]}
                numberOfLines={6}>
                {formatDevotionalForSharing(devotional).substring(0, 500)}...
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DevotionalShareModal;
