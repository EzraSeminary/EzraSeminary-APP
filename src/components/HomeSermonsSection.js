import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {MicrophoneStage, Play, X} from 'phosphor-react-native';
import tw from './../../tailwind';
import {
  useGetLiveStreamQuery,
  useGetSermonsQuery,
} from '../redux/api-slices/apiSlice';
import {
  getYouTubeThumbnailUrl,
  getYouTubeVideoId,
} from '../utils/mediaLinks';
import YouTubeEmbed from './YouTubeEmbed';
import {normalizeLiveStreamArchives} from '../utils/liveStreamArchives';

const getVideoUrl = sermon =>
  sermon?.videoUrl ||
  sermon?.videoURL ||
  sermon?.youtubeUrl ||
  sermon?.youtubeURL ||
  sermon?.media?.videoUrl ||
  '';

const HomeSermonsSection = ({darkMode, navigation}) => {
  const [selectedSermon, setSelectedSermon] = useState(null);
  const {data: sermons = [], isLoading, error, refetch} = useGetSermonsQuery();
  const {data: liveStream} = useGetLiveStreamQuery();

  const liveStreamArchives = useMemo(() => {
    const sermonVideoIds = new Set(
      sermons
        .map(sermon => getYouTubeVideoId(getVideoUrl(sermon)))
        .filter(Boolean),
    );

    return normalizeLiveStreamArchives(liveStream).filter(archive => {
      const archiveVideoId = getYouTubeVideoId(getVideoUrl(archive));
      return !archiveVideoId || !sermonVideoIds.has(archiveVideoId);
    });
  }, [liveStream, sermons]);

  const videoSermons = useMemo(
    () =>
      [
        ...liveStreamArchives,
        ...sermons.filter(
          sermon =>
            (sermon?.mediaType === 'video' || getVideoUrl(sermon)) &&
            getVideoUrl(sermon),
        ),
      ],
    [liveStreamArchives, sermons],
  );

  const featuredSermon = useMemo(() => {
    if (!videoSermons.length) {
      return null;
    }
    return videoSermons[0];
  }, [videoSermons]);

  const otherSermons = useMemo(
    () =>
      videoSermons
        .filter(sermon => sermon?._id !== featuredSermon?._id)
        .slice(0, 8),
    [featuredSermon?._id, videoSermons],
  );

  if (isLoading) {
    return (
      <View
        style={[
          tw`rounded-2xl p-4 mb-4`,
          darkMode ? tw`bg-secondary-8` : tw`bg-primary-3`,
        ]}>
        <View style={tw`flex-row items-center mb-3`}>
          <MicrophoneStage size={22} color="#EA9215" weight="fill" />
          <Text
            style={[
              tw`font-nokia-bold text-lg ml-2`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Sermons
          </Text>
        </View>
        <View
          style={[
            tw`h-48 rounded-4 items-center justify-center`,
            darkMode ? tw`bg-secondary-7` : tw`bg-primary-6`,
          ]}>
          <ActivityIndicator color="#EA9215" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          tw`rounded-2xl p-5 mb-4 border border-accent-6`,
          darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
        ]}>
        <Text
          style={[
            tw`font-nokia-bold text-center mb-4`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
          ]}>
          Sermons could not be loaded.
        </Text>
        <TouchableOpacity
          onPress={refetch}
          style={tw`self-center px-4 py-2 rounded-full bg-accent-6`}>
          <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!featuredSermon) {
    return null;
  }

  const featuredVideoUrl = getVideoUrl(featuredSermon);
  const featuredThumbnail = getYouTubeThumbnailUrl(
    featuredVideoUrl,
    'hqdefault',
  );
  const selectedVideoUrl = getVideoUrl(selectedSermon);

  return (
    <View style={tw`my-4`}>
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <View style={tw`flex-row items-center flex-1`}>
          <MicrophoneStage size={24} color="#EA9215" weight="bold" />
          <Text
            style={[
              tw`font-nokia-bold text-lg ml-2`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Sermons
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Sermons')}
          style={tw`px-4 py-2 rounded-full bg-accent-6`}>
          <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>
            Show More
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setSelectedSermon(featuredSermon)}
        style={[
          tw`rounded-2xl overflow-hidden mb-4 border`,
          darkMode
            ? tw`bg-secondary-8 border-secondary-6`
            : tw`bg-primary-3 border-primary-7`,
        ]}>
        <Image
          source={{uri: featuredThumbnail}}
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
            {featuredSermon.title || 'Untitled sermon'}
          </Text>
          {!!featuredSermon.speaker && (
            <Text
              style={tw`font-nokia-bold text-accent-6 text-sm mt-1`}
              numberOfLines={1}>
              {featuredSermon.speaker}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {otherSermons.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`px-1 pb-2`}>
          {otherSermons.map((sermon, index) => {
            const videoUrl = getVideoUrl(sermon);
            const thumbnail = getYouTubeThumbnailUrl(videoUrl, 'mqdefault');

            return (
              <TouchableOpacity
                key={sermon?._id || index}
                activeOpacity={0.9}
                onPress={() => setSelectedSermon(sermon)}
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
                    {sermon.title || 'Untitled sermon'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={!!selectedSermon}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedSermon(null)}>
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
                {selectedSermon?.title || 'Sermon video'}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedSermon(null)}
                style={tw`w-10 h-10 rounded-full bg-accent-6 items-center justify-center`}>
                <X size={22} color="#FFFFFF" weight="bold" />
              </TouchableOpacity>
            </View>
            <YouTubeEmbed
              url={selectedVideoUrl}
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

export default HomeSermonsSection;
