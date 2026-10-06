import React from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import tw from './../../tailwind';
import {openPlatformUrl} from '../utils/mediaLinks';

const platforms = [
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: require('../../assets/icons/tiktok.webp'),
    color: '#111827',
    urlKey: 'tiktokUrl',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    icon: require('../../assets/icons/youtube.webp'),
    color: '#FF0000',
    urlKey: 'youtubeUrl',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: require('../../assets/icons/facebook.webp'),
    color: '#1877F2',
    urlKey: 'facebookUrl',
  },
];

const LivePlatformButtons = ({liveStream, youtubeUrl}) => {
  const urls = {
    tiktokUrl: liveStream?.tiktokUrl,
    youtubeUrl: youtubeUrl || liveStream?.youtubeUrl,
    facebookUrl: liveStream?.facebookUrl,
  };

  const visiblePlatforms = platforms.filter(platform => urls[platform.urlKey]);

  if (visiblePlatforms.length === 0) {
    return null;
  }

  return (
    <View style={tw`flex-row items-center justify-between`}>
      {visiblePlatforms.map(platform => (
        <TouchableOpacity
          key={platform.key}
          activeOpacity={0.85}
          onPress={() => openPlatformUrl(platform.key, urls[platform.urlKey])}
          style={[
            tw`flex-1 flex-row items-center justify-center rounded-full px-2 py-2 mx-1`,
            {backgroundColor: platform.color},
          ]}>
          <Image
            source={platform.icon}
            resizeMode="contain"
            style={tw`w-5 h-5 mr-1`}
          />
          <Text
            style={tw`font-nokia-bold text-primary-1 text-xs`}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {platform.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default LivePlatformButtons;
