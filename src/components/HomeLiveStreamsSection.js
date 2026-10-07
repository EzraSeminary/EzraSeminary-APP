import React, {useMemo, useState} from 'react';
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Broadcast, Play, X} from 'phosphor-react-native';
import tw from './../../tailwind';
import YouTubeEmbed from './YouTubeEmbed';
import {
  getLiveStreamArchiveVideoUrl,
  getLiveStreamArchiveDate,
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

const HomeLiveStreamsSection = ({archives, darkMode, navigation}) => {
  const [selectedStream, setSelectedStream] = useState(null);
  const latestStream = archives[0];
  const olderStreams = useMemo(() => archives.slice(1, 9), [archives]);

  if (!latestStream) {
    return null;
  }

  const latestUrl = getLiveStreamArchiveVideoUrl(latestStream);
  const latestThumbnail = getYouTubeThumbnailUrl(latestUrl, 'hqdefault');
  const selectedUrl = getLiveStreamArchiveVideoUrl(selectedStream);
  const latestDate = formatDate(getLiveStreamArchiveDate(latestStream));

  return (
    <View style={tw`my-4`}>
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <View style={tw`flex-row items-center flex-1`}>
          <Broadcast size={24} color="#EA9215" weight="bold" />
          <Text
            style={[
              tw`font-nokia-bold text-lg ml-2`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Previous Live Streams
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('PreviousLiveStreams')}
          style={tw`px-4 py-2 rounded-full bg-accent-6`}>
          <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>
            Show More
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setSelectedStream(latestStream)}
        style={[
          tw`rounded-2xl overflow-hidden mb-4 border`,
          darkMode
            ? tw`bg-secondary-8 border-secondary-6`
            : tw`bg-primary-3 border-primary-7`,
        ]}>
        <Image
          source={{uri: latestThumbnail}}
          resizeMode="cover"
          style={tw`w-full h-52 bg-secondary-7`}
        />
        <View
          style={tw`absolute top-20 self-center w-14 h-14 rounded-full bg-accent-6 items-center justify-center`}>
          <Play size={28} color="#FFFFFF" weight="fill" />
        </View>
        <View style={tw`p-4`}>
          <Text
            style={[
              tw`font-nokia-bold text-lg`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}
            numberOfLines={2}>
            {latestStream.title || 'Previous Live Stream'}
          </Text>
          {!!latestDate && (
            <Text style={tw`font-nokia-bold text-accent-6 text-sm mt-1`}>
              {latestDate}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {olderStreams.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`px-1 pb-2`}>
          {olderStreams.map((stream, index) => {
            const videoUrl = getLiveStreamArchiveVideoUrl(stream);
            const thumbnail = getYouTubeThumbnailUrl(videoUrl, 'mqdefault');

            return (
              <TouchableOpacity
                key={stream?._id || videoUrl || index}
                activeOpacity={0.9}
                onPress={() => setSelectedStream(stream)}
                style={[
                  tw`w-32 mr-3 rounded-2xl overflow-hidden border`,
                  darkMode
                    ? tw`bg-secondary-8 border-secondary-6`
                    : tw`bg-primary-3 border-primary-7`,
                ]}>
                <Image
                  source={{uri: thumbnail}}
                  resizeMode="cover"
                  style={tw`w-32 h-32 bg-secondary-7`}
                />
                <View
                  style={tw`absolute top-11 left-11 w-10 h-10 rounded-full bg-accent-6 items-center justify-center`}>
                  <Play size={20} color="#FFFFFF" weight="fill" />
                </View>
                <View style={tw`p-2`}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-xs leading-4`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}
                    numberOfLines={2}>
                    {stream.title || 'Previous Live Stream'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

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

export default HomeLiveStreamsSection;
