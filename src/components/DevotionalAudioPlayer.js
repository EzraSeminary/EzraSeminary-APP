import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import Slider from '@react-native-community/slider';
import TrackPlayer, {
  State,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player';
import {
  FastForward,
  Gauge,
  Pause,
  Play,
  Rewind,
  SpeakerHigh,
} from 'phosphor-react-native';
import tw from './../../tailwind';
import {loadDevotionalTrack} from '../services/devotionalTrackPlayer';

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

const formatTime = seconds => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

const DevotionalAudioPlayer = ({
  audioUrl,
  darkMode,
  title = 'Devotional audio',
  artwork,
  trackId,
}) => {
  const playbackState = usePlaybackState();
  const {position, duration} = useProgress(500);
  const [isReady, setIsReady] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [localPosition, setLocalPosition] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playerState = playbackState?.state;
  const isPlaying = playerState === State.Playing;
  const isLoading =
    isPreparing ||
    playerState === State.Loading ||
    playerState === State.Buffering;
  const effectivePosition = isSeeking ? localPosition : position;
  const id = useMemo(
    () => trackId || `devotional-audio:${audioUrl}`,
    [audioUrl, trackId],
  );

  useEffect(() => {
    setIsReady(false);
    setIsPreparing(false);
    setIsSeeking(false);
    setLocalPosition(0);
    setPlaybackSpeed(1);
  }, [artwork, audioUrl, id, title]);

  if (!audioUrl) {
    return null;
  }

  const togglePlayback = async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
      return;
    }

    try {
      if (!isReady) {
        setIsPreparing(true);
        await loadDevotionalTrack({id, url: audioUrl, title, artwork});
        await TrackPlayer.setRate(playbackSpeed);
        setIsReady(true);
      }
      await TrackPlayer.play();
    } catch (error) {
      setIsReady(false);
      console.warn('Failed to play devotional audio:', error?.message || error);
    } finally {
      setIsPreparing(false);
    }
  };

  const seekBy = async seconds => {
    if (!isReady) {
      return;
    }

    const nextPosition = Math.min(
      Math.max(effectivePosition + seconds, 0),
      duration || 0,
    );
    await TrackPlayer.seekTo(nextPosition);
    setLocalPosition(nextPosition);
  };

  const changePlaybackSpeed = async speed => {
    setPlaybackSpeed(speed);

    if (!isReady) {
      return;
    }

    try {
      await TrackPlayer.setRate(speed);
    } catch (error) {
      console.warn('Failed to change audio speed:', error?.message || error);
    }
  };

  return (
    <View
      style={[
        tw`border border-accent-6 rounded-4 px-4 py-3 mt-4 mb-2`,
        {backgroundColor: darkMode ? '#1F2937' : '#FFF8EC'},
      ]}>
      <View style={tw`flex-row items-center mb-2`}>
        <View
          style={tw`w-9 h-9 rounded-full bg-accent-6 items-center justify-center mr-3`}>
          <SpeakerHigh size={20} color="#FFFFFF" weight="fill" />
        </View>
        <View style={tw`flex-1`}>
          <Text
            style={[
              tw`font-nokia-bold text-sm`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}
            numberOfLines={1}>
            {title}
          </Text>
          <Text style={tw`font-nokia-bold text-accent-6 text-xs`}>
            {formatTime(effectivePosition)} / {formatTime(duration)}
          </Text>
        </View>
      </View>

      <Slider
        style={tw`w-full h-8`}
        value={effectivePosition}
        minimumValue={0}
        maximumValue={duration || 1}
        minimumTrackTintColor="#EA9215"
        maximumTrackTintColor={darkMode ? '#4B5563' : '#F1D8B1'}
        thumbTintColor="#EA9215"
        disabled={!isReady}
        onSlidingStart={() => {
          if (!isReady) {
            return;
          }
          setIsSeeking(true);
          setLocalPosition(position);
        }}
        onValueChange={setLocalPosition}
        onSlidingComplete={async value => {
          if (!isReady) {
            return;
          }
          setIsSeeking(false);
          setLocalPosition(value);
          await TrackPlayer.seekTo(value);
        }}
      />

      <View style={tw`flex-row items-center justify-center mt-1`}>
        <TouchableOpacity
          onPress={() => seekBy(-15)}
          disabled={!isReady}
          style={tw`w-16 h-12 rounded-full items-center justify-center`}>
          <Rewind size={22} color="#EA9215" weight="fill" />
          <Text style={tw`font-nokia-bold text-accent-6 text-xs mt-0.5`}>
            -15s
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={togglePlayback}
          style={tw`w-12 h-12 rounded-full bg-accent-6 items-center justify-center mx-4`}>
          {isLoading && !isPlaying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : isPlaying ? (
            <Pause size={24} color="#FFFFFF" weight="fill" />
          ) : (
            <Play size={24} color="#FFFFFF" weight="fill" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => seekBy(15)}
          disabled={!isReady}
          style={tw`w-16 h-12 rounded-full items-center justify-center`}>
          <FastForward size={22} color="#EA9215" weight="fill" />
          <Text style={tw`font-nokia-bold text-accent-6 text-xs mt-0.5`}>
            +15s
          </Text>
        </TouchableOpacity>
      </View>

      <View style={tw`flex-row items-center mt-3`}>
        <Gauge size={17} color="#EA9215" weight="bold" />
        <Text
          style={[
            tw`font-nokia-bold text-xs ml-1 mr-2`,
            darkMode ? tw`text-primary-2` : tw`text-secondary-7`,
          ]}>
          Speed
        </Text>
        <View style={tw`flex-1 flex-row justify-between`}>
          {PLAYBACK_SPEEDS.map(speed => {
            const isActive = playbackSpeed === speed;
            return (
              <TouchableOpacity
                key={speed}
                onPress={() => changePlaybackSpeed(speed)}
                style={[
                  tw`px-2 py-1 rounded-full border`,
                  isActive
                    ? tw`bg-accent-6 border-accent-6`
                    : darkMode
                    ? tw`border-secondary-6`
                    : tw`border-primary-7`,
                ]}>
                <Text
                  style={[
                    tw`font-nokia-bold text-xs`,
                    isActive
                      ? tw`text-primary-1`
                      : darkMode
                      ? tw`text-primary-2`
                      : tw`text-secondary-7`,
                  ]}>
                  {speed}x
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default DevotionalAudioPlayer;
