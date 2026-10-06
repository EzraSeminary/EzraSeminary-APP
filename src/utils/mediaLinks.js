import {Linking, Platform} from 'react-native';

export const getYouTubeVideoId = url => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const patterns = [
    /youtu\.be\/([^?&#/]+)/,
    /youtube\.com\/watch\?.*v=([^?&#/]+)/,
    /youtube\.com\/embed\/([^?&#/]+)/,
    /youtube\.com\/shorts\/([^?&#/]+)/,
    /youtube\.com\/live\/([^?&#/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
};

export const getActiveLiveYouTubeUrl = liveStream => {
  if (!liveStream) {
    return '';
  }
  if (liveStream.testMode && liveStream.testYoutubeUrl) {
    return liveStream.testYoutubeUrl;
  }
  if (liveStream.isLive && liveStream.youtubeUrl) {
    return liveStream.youtubeUrl;
  }
  return '';
};

export const getYouTubeThumbnailUrl = (url, quality = 'hqdefault') => {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/${quality}.jpg` : '';
};

const openFirstAvailableUrl = async urls => {
  const candidates = urls.filter(Boolean);

  for (const url of candidates) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
    } catch {}
  }

  if (candidates.length > 0) {
    await Linking.openURL(candidates[candidates.length - 1]);
    return true;
  }

  return false;
};

export const openYouTubeUrl = url => {
  const videoId = getYouTubeVideoId(url);
  return openFirstAvailableUrl([
    videoId ? `youtube://watch?v=${videoId}` : null,
    videoId ? `vnd.youtube:${videoId}` : null,
    url,
  ]);
};

export const openTikTokUrl = url =>
  openFirstAvailableUrl([
    url ? url.replace(/^https?:\/\//, 'snssdk1233://') : null,
    url ? url.replace(/^https?:\/\//, 'tiktok://') : null,
    url,
  ]);

export const openFacebookUrl = url => {
  const videoMatch = url?.match(/videos\/(\d+)/);
  const profileMatch = url?.match(/facebook\.com\/([^/?#]+)/);

  return openFirstAvailableUrl([
    videoMatch?.[1] ? `fb://video/${videoMatch[1]}` : null,
    profileMatch?.[1] ? `fb://profile/${profileMatch[1]}` : null,
    Platform.OS === 'android' && url ? `fb://facewebmodal/f?href=${url}` : null,
    url,
  ]);
};

export const openPlatformUrl = (platform, url) => {
  if (!url) {
    return Promise.resolve(false);
  }
  if (platform === 'youtube') {
    return openYouTubeUrl(url);
  }
  if (platform === 'tiktok') {
    return openTikTokUrl(url);
  }
  if (platform === 'facebook') {
    return openFacebookUrl(url);
  }
  return Linking.openURL(url).then(() => true);
};
