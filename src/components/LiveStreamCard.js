import React from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {Broadcast} from 'phosphor-react-native';
import tw from './../../tailwind';
import LivePlatformButtons from './LivePlatformButtons';
import YouTubeEmbed from './YouTubeEmbed';
import {getActiveLiveYouTubeUrl} from '../utils/mediaLinks';

const LiveStreamCard = ({liveStream, isLoading, error, onRetry, darkMode}) => {
  if (isLoading) {
    return (
      <View
        style={[
          tw`rounded-2xl p-4 mb-5`,
          darkMode ? tw`bg-secondary-8` : tw`bg-primary-3`,
        ]}>
        <View style={tw`h-4 w-28 rounded-full bg-accent-6 opacity-40 mb-3`} />
        <View
          style={[
            tw`h-44 rounded-4 items-center justify-center`,
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
          tw`rounded-2xl p-4 mb-5 border border-accent-6`,
          darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
        ]}>
        <Text
          style={[
            tw`font-nokia-bold text-base mb-2`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
          ]}>
          Live stream could not be loaded.
        </Text>
        <TouchableOpacity
          onPress={onRetry}
          style={tw`self-start px-4 py-2 rounded-full bg-accent-6`}>
          <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const shouldShow = liveStream?.isLive || liveStream?.testMode;
  const youtubeUrl = getActiveLiveYouTubeUrl(liveStream);

  if (!shouldShow) {
    return null;
  }

  return (
    <View
      style={[
        tw`rounded-2xl p-4 mb-5`,
        darkMode ? tw`bg-secondary-8` : tw`bg-primary-3`,
      ]}>
      <View style={tw`flex-row items-center mb-2`}>
        <View
          style={tw`w-9 h-9 rounded-full bg-accent-6 items-center justify-center mr-3`}>
          <Broadcast size={21} color="#FFFFFF" weight="fill" />
        </View>
        <View style={tw`flex-1`}>
          <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
            We're live
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-lg`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}
            numberOfLines={2}>
            {liveStream?.title || 'Ezra Seminary Live'}
          </Text>
        </View>
      </View>

      {!!youtubeUrl && (
        <View style={tw`my-3`}>
          <YouTubeEmbed
            url={youtubeUrl}
            darkMode={darkMode}
            height={220}
            autoPlay
          />
        </View>
      )}

      <Text
        style={[
          tw`font-nokia-bold text-sm mb-3 mt-1`,
          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
        ]}>
        Watch Live on:
      </Text>
      <LivePlatformButtons liveStream={liveStream} youtubeUrl={youtubeUrl} />
    </View>
  );
};

export default LiveStreamCard;
