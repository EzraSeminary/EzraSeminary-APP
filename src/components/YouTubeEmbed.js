import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import tw from './../../tailwind';
import {getYouTubeVideoId, openYouTubeUrl} from '../utils/mediaLinks';

const YouTubeEmbed = ({
  url,
  darkMode,
  height = 210,
  autoPlay = false,
  mute = autoPlay,
  onUnavailable,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const videoId = useMemo(() => getYouTubeVideoId(url), [url]);

  if (!videoId || hasError) {
    return (
      <View
        style={[
          tw`rounded-4 p-4 border border-accent-6`,
          darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
        ]}>
        <Text
          style={[
            tw`font-nokia-bold text-sm text-center mb-3`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
          ]}>
          This video cannot be embedded here.
        </Text>
        {!!url && (
          <TouchableOpacity
            style={tw`self-center px-4 py-2 rounded-full bg-accent-6`}
            onPress={() => openYouTubeUrl(url)}>
            <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>
              Watch on YouTube
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={tw`rounded-4 overflow-hidden bg-black`}>
      <YoutubePlayer
        height={height}
        videoId={videoId}
        play={isPlaying}
        mute={mute}
        webViewProps={{
          allowsFullscreenVideo: true,
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: !autoPlay,
        }}
        onChangeState={state => {
          if (state === 'ended') {
            setIsPlaying(false);
          }
        }}
        onReady={() => setIsReady(true)}
        onError={() => {
          setHasError(true);
          onUnavailable?.();
        }}
      />
      {!isReady && (
        <View style={tw`absolute inset-0 items-center justify-center bg-black`}>
          <ActivityIndicator color="#EA9215" />
        </View>
      )}
    </View>
  );
};

export default YouTubeEmbed;
