import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import tw from '../../../../tailwind';

const MainVerseSection = ({value, onVerseViewed}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const title = value?.[0] ?? '';
  const body = value?.[1] ?? '';

  const openVerse = () => {
    setModalVisible(true);
    onVerseViewed?.();
  };

  const closeVerse = () => setModalVisible(false);

  return (
    <View style={tw`w-full flex flex-col items-center mt-4`}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openVerse}
        style={tw`w-[100%] max-w-lg bg-secondary-6 bg-opacity-85 shadow-2xl px-4 py-6 rounded-lg my-2 border border-accent-6 relative`}>
        <Text
          style={tw`absolute top-[-1rem] self-center transform -translate-x-1/2 text-lg text-primary-2 bg-accent-8 px-4 py-1 rounded-md shadow-md font-nokia-bold`}>
          {title}
        </Text>
        <Text
          style={tw`text-primary-2 text-base leading-relaxed py-1 font-nokia-bold text-center mt-4`}>
          ክፍለ ጥቅስ ለማንበብ ይንኩ
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeVerse}>
        <Pressable
          style={tw`flex-1 bg-black bg-opacity-60 justify-center px-4`}
          onPress={closeVerse}>
          <Pressable
            onPress={e => e.stopPropagation()}
            style={tw`max-h-[80%] bg-secondary-6 rounded-xl border border-accent-6 p-5 shadow-2xl`}>
            <Text
              style={tw`text-lg text-primary-2 bg-accent-8 self-center px-4 py-1 rounded-md font-nokia-bold mb-3`}>
              {title}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={tw`text-primary-2 text-lg leading-relaxed font-nokia-bold text-center`}>
                {body}
              </Text>
            </ScrollView>
            <TouchableOpacity
              onPress={closeVerse}
              style={tw`mt-4 self-center bg-accent-6 px-6 py-2 rounded-full`}>
              <Text style={tw`text-primary-1 font-nokia-bold`}>ዝጋ</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default MainVerseSection;
