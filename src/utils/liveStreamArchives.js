import {getYouTubeVideoId} from './mediaLinks';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ARCHIVES_STORAGE_KEY = 'ezra:live-stream-archives';
const ACTIVE_LIVE_STORAGE_KEY = 'ezra:active-live-stream';

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

const getArchiveKey = item => {
  const videoUrl = getArchiveUrl(item);
  return getYouTubeVideoId(videoUrl) || videoUrl || item?._id || item?.id || '';
};

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

export const mergeLiveStreamArchives = (...archiveLists) => {
  const seen = new Set();

  return archiveLists
    .flat()
    .filter(Boolean)
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
        _id: String(stableId).startsWith('live-stream:')
          ? stableId
          : `live-stream:${stableId}`,
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
      const dedupeKey = getArchiveKey(item);

      if (!dedupeKey || seen.has(dedupeKey)) {
        return false;
      }
      seen.add(dedupeKey);
      return true;
    })
    .sort(compareByDateDesc);
};

export const normalizeLiveStreamArchives = liveStream => {
  return mergeLiveStreamArchives(collectArchiveCandidates(liveStream));
};

export const loadStoredLiveStreamArchives = async () => {
  try {
    const stored = await AsyncStorage.getItem(ARCHIVES_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return mergeLiveStreamArchives(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
};

const persistLiveStreamArchives = async archives => {
  const normalized = mergeLiveStreamArchives(archives);
  await AsyncStorage.setItem(ARCHIVES_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

const loadActiveLiveStream = async () => {
  try {
    const stored = await AsyncStorage.getItem(ACTIVE_LIVE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const rememberActiveLiveStream = async liveStream => {
  if (!getArchiveUrl(liveStream)) {
    return;
  }

  await AsyncStorage.setItem(
    ACTIVE_LIVE_STORAGE_KEY,
    JSON.stringify({
      ...liveStream,
      streamedAt: getArchiveDate(liveStream) || new Date().toISOString(),
    }),
  );
};

const clearActiveLiveStream = () =>
  AsyncStorage.removeItem(ACTIVE_LIVE_STORAGE_KEY);

export const syncLiveStreamArchives = async liveStream => {
  const serverArchives = normalizeLiveStreamArchives(liveStream);
  const storedArchives = await loadStoredLiveStreamArchives();

  if (!liveStream) {
    return mergeLiveStreamArchives(serverArchives, storedArchives);
  }

  if (liveStream?.isLive && getArchiveUrl(liveStream)) {
    await rememberActiveLiveStream(liveStream);
    return mergeLiveStreamArchives(serverArchives, storedArchives);
  }

  const activeLiveStream = await loadActiveLiveStream();
  const stoppedCandidate =
    !liveStream.isLive && !liveStream.testMode && getArchiveUrl(liveStream)
      ? liveStream
      : activeLiveStream;

  if (stoppedCandidate && getArchiveUrl(stoppedCandidate)) {
    const existingArchives = mergeLiveStreamArchives(storedArchives, serverArchives);
    const stoppedKey = getArchiveKey(stoppedCandidate);
    const alreadyArchived = existingArchives.some(
      archive => getArchiveKey(archive) === stoppedKey,
    );

    if (alreadyArchived) {
      await clearActiveLiveStream();
      return existingArchives;
    }

    const archived = {
      ...stoppedCandidate,
      endedAt: stoppedCandidate.endedAt || new Date().toISOString(),
    };
    const nextArchives = await persistLiveStreamArchives([
      archived,
      ...storedArchives,
      ...serverArchives,
    ]);
    await clearActiveLiveStream();
    return nextArchives;
  }

  return mergeLiveStreamArchives(serverArchives, storedArchives);
};
