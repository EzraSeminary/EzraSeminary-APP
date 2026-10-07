import React, {useState} from 'react';
import {
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSelector} from 'react-redux';
import {ArrowLeft, Broadcast, Calendar, Play, X} from 'phosphor-react-native';
import tw from './../../tailwind';
import YouTubeEmbed from '../components/YouTubeEmbed';
import {useGetLiveStreamQuery} from '../redux/api-slices/apiSlice';
import useLiveStreamArchives from '../hooks/useLiveStreamArchives';
import {
  getLiveStreamArchiveDate,
  getLiveStreamArchiveVideoUrl,
} from '../utils/liveStreamArchives';
import {getYouTubeThumbnailUrl} from '../utils/mediaLinks';

const formatDate = value => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const PreviousLiveStreams = ({navigation}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const [selectedStream, setSelectedStream] = useState(null);
  const {data: liveStream} = useGetLiveStreamQuery(undefined, {
    pollingInterval: 60000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const {archives, isLoadingArchives, refreshArchives} =
    useLiveStreamArchives(liveStream);
  const selectedUrl = getLiveStreamArchiveVideoUrl(selectedStream);

  const renderItem = ({item}) => {
    const videoUrl = getLiveStreamArchiveVideoUrl(item);
    const thumbnail = getYouTubeThumbnailUrl(videoUrl, 'mqdefault');
    const date = formatDate(getLiveStreamArchiveDate(item));

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setSelectedStream(item)}
        style={[
          tw`rounded-2xl p-3 mb-4 border flex-row`,
          darkMode
            ? tw`bg-secondary-8 border-secondary-6`
            : tw`bg-primary-3 border-primary-7`,
        ]}>
        <View>
          <Image
            source={{uri: thumbnail}}
            resizeMode="cover"
            style={tw`w-28 h-28 rounded-4 bg-secondary-7`}
          />
          <View
            style={tw`absolute top-9 left-9 w-10 h-10 rounded-full bg-accent-6 items-center justify-center`}>
            <Play size={20} color="#FFFFFF" weight="fill" />
          </View>
        </View>
        <View style={tw`flex-1 pl-3 justify-center`}>
          <Text
            style={[
              tw`font-nokia-bold text-base`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}
            numberOfLines={2}>
            {item.title || 'Previous Live Stream'}
          </Text>
          {!!date && (
            <View style={tw`flex-row items-center mt-2`}>
              <Calendar size={14} color="#EA9215" weight="bold" />
              <Text style={tw`font-nokia-bold text-accent-6 text-xs ml-1`}>
                {date}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={darkMode ? tw`bg-secondary-9 flex-1` : tw`flex-1`}>
      <SafeAreaView style={tw`flex-1 mx-auto w-11/12`}>
        <View style={tw`flex-row items-center justify-between py-4`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`w-10 h-10 rounded-full items-center justify-center bg-accent-6`}>
            <ArrowLeft size={22} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
          <Text
            style={[
              tw`font-nokia-bold text-xl`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Previous Live Streams
          </Text>
          <View style={tw`w-10`} />
        </View>

        <FlatList
          data={archives}
          keyExtractor={(item, index) =>
            item?._id || getLiveStreamArchiveVideoUrl(item) || `${index}`
          }
          renderItem={renderItem}
          refreshing={isLoadingArchives}
          onRefresh={refreshArchives}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={tw`items-center py-16`}>
              <Broadcast size={34} color="#EA9215" weight="bold" />
              <Text
                style={[
                  tw`font-nokia-bold text-center mt-3`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}>
                No previous live streams yet.
              </Text>
            </View>
          }
        />
      </SafeAreaView>

      <Modal
        visible={!!selectedStream}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedStream(null)}>
        <View
          style={[
            tw`flex-1 justify-center px-4`,
            {backgroundColor: 'rgba(0, 0, 0, 0.82)'},
          ]}>
          <View
            style={[
              tw`rounded-2xl p-4`,
              darkMode ? tw`bg-secondary-9` : tw`bg-primary-1`,
            ]}>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text
                style={[
                  tw`font-nokia-bold text-lg flex-1 mr-3`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}
                numberOfLines={2}>
                {selectedStream?.title || 'Previous Live Stream'}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedStream(null)}
                style={tw`w-10 h-10 rounded-full bg-accent-6 items-center justify-center`}>
                <X size={22} color="#FFFFFF" weight="bold" />
              </TouchableOpacity>
            </View>
            <YouTubeEmbed
              url={selectedUrl}
              darkMode={darkMode}
              height={230}
              autoPlay
              mute={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PreviousLiveStreams;
