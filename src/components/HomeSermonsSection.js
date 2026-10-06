import React, {useMemo} from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {MicrophoneStage} from 'phosphor-react-native';
import tw from './../../tailwind';
import {useGetSermonsQuery} from '../redux/api-slices/apiSlice';
import {getYouTubeThumbnailUrl} from '../utils/mediaLinks';

const getVideoUrl = sermon =>
  sermon?.videoUrl ||
  sermon?.videoURL ||
  sermon?.youtubeUrl ||
  sermon?.youtubeURL ||
  sermon?.media?.videoUrl ||
  '';

const HomeSermonsSection = ({darkMode, navigation}) => {
  const {data: sermons = [], isLoading, error, refetch} = useGetSermonsQuery();

  const videoSermons = useMemo(
    () =>
      sermons.filter(
        sermon =>
          (sermon?.mediaType === 'video' || getVideoUrl(sermon)) &&
          getVideoUrl(sermon),
      ),
    [sermons],
  );

  const featuredSermon = useMemo(() => {
    if (!videoSermons.length) {
      return null;
    }
    const index = new Date().getDate() % videoSermons.length;
    return videoSermons[index];
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

  return (
    <View style={tw`mb-4`}>
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
        onPress={() => navigation.navigate('Sermons')}
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
                onPress={() => navigation.navigate('Sermons')}
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
    </View>
  );
};

export default HomeSermonsSection;
