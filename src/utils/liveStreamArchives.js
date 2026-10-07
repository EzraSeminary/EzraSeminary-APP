import {getYouTubeVideoId} from './mediaLinks';

const ARCHIVE_LIST_KEYS = [
  'previousLiveStreams',
  'previousStreams',
  'pastLiveStreams',
  'pastStreams',
  'archivedLiveStreams',
  'archivedStreams',
  'archives',
  'recordings',
  'previousVideos',
  'videos',
  'history',
];

const SINGLE_ARCHIVE_KEYS = [
  'lastLiveStream',
  'lastStream',
  'latestRecording',
  'latestArchive',
];

const URL_LIST_KEYS = [
  'previousYoutubeUrls',
  'previousYouTubeUrls',
  'archiveYoutubeUrls',
  'archiveYouTubeUrls',
  'recordingUrls',
];

const getArchiveDate = item =>
  item?.sermonDate ||
  item?.date ||
  item?.streamedAt ||
  item?.endedAt ||
  item?.publishedAt ||
  item?.createdAt ||
  '';

const getArchiveUrl = item =>
  item?.videoUrl ||
  item?.videoURL ||
  item?.youtubeUrl ||
  item?.youtubeURL ||
  item?.url ||
  item?.link ||
  item?.media?.videoUrl ||
  '';

const compareByDateDesc = (a, b) => {
  const aTime = new Date(getArchiveDate(a)).getTime();
  const bTime = new Date(getArchiveDate(b)).getTime();

  if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
    return 0;
  }
  if (Number.isNaN(aTime)) {
    return 1;
  }
  if (Number.isNaN(bTime)) {
    return -1;
  }
  return bTime - aTime;
};

const collectArchiveCandidates = liveStream => {
  if (!liveStream) {
    return [];
  }

  const candidates = [];

  ARCHIVE_LIST_KEYS.forEach(key => {
    if (Array.isArray(liveStream[key])) {
      candidates.push(...liveStream[key]);
    }
  });

  SINGLE_ARCHIVE_KEYS.forEach(key => {
    if (liveStream[key]) {
      candidates.push(liveStream[key]);
    }
  });

  URL_LIST_KEYS.forEach(key => {
    if (Array.isArray(liveStream[key])) {
      candidates.push(
        ...liveStream[key].map((url, index) => ({
          youtubeUrl: url,
          title: `Previous Live Stream ${index + 1}`,
        })),
      );
    }
  });

  if (!liveStream.isLive && getArchiveUrl(liveStream)) {
    candidates.push(liveStream);
  }

  return candidates;
};

export const getLiveStreamArchiveVideoUrl = getArchiveUrl;

export const getLiveStreamArchiveDate = getArchiveDate;

export const normalizeLiveStreamArchives = liveStream => {
  const seen = new Set();

  return collectArchiveCandidates(liveStream)
    .map((item, index) =>
      typeof item === 'string' ? {youtubeUrl: item, index} : {...item, index},
    )
    .map((item, index) => {
      const videoUrl = getArchiveUrl(item);
      const videoId = getYouTubeVideoId(videoUrl);
      const stableId =
        item?._id ||
        item?.id ||
        videoId ||
        videoUrl ||
        `live-stream-archive-${index}`;

      return {
        ...item,
        _id: `live-stream:${stableId}`,
        title:
          item?.title ||
          item?.name ||
          item?.headline ||
          `Previous Live Stream ${index + 1}`,
        speaker: item?.speaker || 'Live Stream',
        videoUrl,
        youtubeUrl: videoUrl,
        mediaType: 'video',
        sermonDate: getArchiveDate(item),
        sourceType: 'live-stream',
      };
    })
    .filter(item => {
      const videoUrl = getArchiveUrl(item);
      const videoId = getYouTubeVideoId(videoUrl);
      const dedupeKey = videoId || videoUrl;

      if (!dedupeKey || seen.has(dedupeKey)) {
        return false;
      }
      seen.add(dedupeKey);
      return true;
    })
    .sort(compareByDateDesc);
};
