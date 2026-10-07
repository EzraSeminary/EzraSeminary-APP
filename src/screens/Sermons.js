import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSelector} from 'react-redux';
import {
  ArrowLeft,
  Broadcast,
  Cards,
  Calendar,
  MicrophoneStage,
  Stack,
  VideoCamera,
} from 'phosphor-react-native';
import tw from './../../tailwind';
import DevotionalAudioPlayer from '../components/DevotionalAudioPlayer';
import YouTubeEmbed from '../components/YouTubeEmbed';
import {
  useGetLiveStreamQuery,
  useGetSermonsQuery,
} from '../redux/api-slices/apiSlice';
import {
  getYouTubeThumbnailUrl,
  getYouTubeVideoId,
  openPlatformUrl,
} from '../utils/mediaLinks';
import {normalizeLiveStreamArchives} from '../utils/liveStreamArchives';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getFloatingTabScenePadding} from '../navigation/floatingTabBarStyles';

const getSermonDate = sermon =>
  sermon?.sermonDate || sermon?.date || sermon?.createdAt;

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

const getAudioUrl = sermon =>
  sermon?.audioUrl ||
  sermon?.audioURL ||
  sermon?.audio ||
  sermon?.audioFileUrl ||
  sermon?.media?.audioUrl ||
  '';

const getVideoUrl = sermon =>
  sermon?.videoUrl ||
  sermon?.videoURL ||
  sermon?.youtubeUrl ||
  sermon?.youtubeURL ||
  sermon?.media?.videoUrl ||
  '';

const isSeriesSermon = sermon =>
  Boolean(
    sermon?.isSeries ||
      sermon?.seriesId ||
      sermon?.seriesTitle ||
      sermon?.seriesRef?._id,
  );

const groupSeriesSermons = sermons => {
  const groups = new Map();

  sermons.forEach(sermon => {
    const key =
      sermon?.seriesId ||
      sermon?.seriesRef?._id ||
      sermon?.seriesTitle ||
      sermon?.title ||
      sermon?._id;
    const existing = groups.get(key) || {
      id: key,
      title: sermon?.seriesTitle || sermon?.seriesRef?.title || sermon?.title,
      description: sermon?.seriesRef?.description || '',
      sermons: [],
    };
    existing.sermons.push(sermon);
    groups.set(key, existing);
  });

  return Array.from(groups.values()).map(group => ({
    ...group,
    sermons: [...group.sermons].sort(
      (a, b) =>
        (a?.episodeNumber || a?.order || 0) -
        (b?.episodeNumber || b?.order || 0),
    ),
  }));
};

const SermonCard = ({sermon, activeTab, darkMode}) => {
  const mediaUrl =
    activeTab === 'audio' ? getAudioUrl(sermon) : getVideoUrl(sermon);
  const date = formatDate(getSermonDate(sermon));

  return (
    <View
      style={[
        tw`rounded-2xl p-4 mb-4 border`,
        darkMode
          ? [tw`bg-secondary-8 border-secondary-6`]
          : [tw`bg-primary-3 border-primary-7`],
      ]}>
      <View style={tw`flex-row items-start justify-between mb-2`}>
        <View style={tw`flex-1 pr-3`}>
          <Text
            style={[
              tw`font-nokia-bold text-lg`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            {sermon?.title || 'Untitled sermon'}
          </Text>
          {!!sermon?.speaker && (
            <Text style={tw`font-nokia-bold text-accent-6 text-sm mt-1`}>
              {sermon.speaker}
            </Text>
          )}
        </View>
        {!!date && (
          <View style={tw`flex-row items-center`}>
            <Calendar size={14} color="#EA9215" weight="bold" />
            <Text
              style={[
                tw`font-nokia-bold text-xs ml-1`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              {date}
            </Text>
          </View>
        )}
      </View>

      {!!sermon?.scripture && (
        <Text
          style={[
            tw`font-nokia-bold text-sm mb-2`,
            darkMode ? tw`text-primary-2` : tw`text-secondary-7`,
          ]}>
          {sermon.scripture}
        </Text>
      )}
      {!!sermon?.description && (
        <Text
          style={[
            tw`font-nokia-bold text-sm leading-5 mb-3`,
            darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
          ]}>
          {sermon.description}
        </Text>
      )}

      {activeTab === 'video' ? (
        mediaUrl ? (
          <YouTubeEmbed url={mediaUrl} darkMode={darkMode} height={210} />
        ) : (
          <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
            Video unavailable.
          </Text>
        )
      ) : mediaUrl ? (
        <DevotionalAudioPlayer
          audioUrl={mediaUrl}
          title={sermon?.title || 'Sermon audio'}
          trackId={`sermon:${sermon?._id || mediaUrl}`}
          darkMode={darkMode}
        />
      ) : (
        <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
          Audio unavailable.
        </Text>
      )}

      {activeTab === 'video' && mediaUrl ? (
        <TouchableOpacity
          onPress={() => openPlatformUrl('youtube', mediaUrl)}
          style={tw`self-start mt-3 px-4 py-2 rounded-full bg-accent-6`}>
          <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>
            Open on YouTube
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const PreviousLiveStreamsSection = ({
  archives,
  activeTab,
  darkMode,
  showAll,
  onToggleShowAll,
}) => {
  if (!archives.length) {
    return null;
  }

  const visibleArchives = showAll ? archives : archives.slice(0, 1);
  const hiddenCount = Math.max(archives.length - 1, 0);

  return (
    <View style={tw`mb-2`}>
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <View style={tw`flex-row items-center flex-1`}>
          <View
            style={tw`w-9 h-9 rounded-full bg-accent-6 items-center justify-center mr-2`}>
            <Broadcast size={20} color="#FFFFFF" weight="fill" />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`font-nokia-bold text-accent-6 text-xs`}>
              Previous live streams
            </Text>
            <Text
              style={[
                tw`font-nokia-bold text-lg`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Latest Recording
            </Text>
          </View>
        </View>

        {hiddenCount > 0 && (
          <TouchableOpacity
            onPress={onToggleShowAll}
            style={tw`px-4 py-2 rounded-full bg-accent-6`}>
            <Text style={tw`font-nokia-bold text-primary-1 text-xs`}>
              {showAll ? 'Show Less' : `Show More (${hiddenCount})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {visibleArchives.map(archive => (
        <SermonCard
          key={archive?._id || getVideoUrl(archive)}
          sermon={archive}
          activeTab={activeTab}
          darkMode={darkMode}
        />
      ))}
    </View>
  );
};

const Sermons = ({navigation}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('video');
  const [libraryMode, setLibraryMode] = useState('standalone');
  const [showAllLiveArchives, setShowAllLiveArchives] = useState(false);
  const {
    data: sermons = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetSermonsQuery();
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

  const mediaFilteredSermons = useMemo(() => {
    return sermons.filter(sermon => {
      if (activeTab === 'audio') {
        return sermon?.mediaType === 'audio' || !!getAudioUrl(sermon);
      }
      return sermon?.mediaType === 'video' || !!getVideoUrl(sermon);
    });
  }, [activeTab, sermons]);

  const standaloneSermons = useMemo(
    () => mediaFilteredSermons.filter(sermon => !isSeriesSermon(sermon)),
    [mediaFilteredSermons],
  );

  const seriesGroups = useMemo(
    () => groupSeriesSermons(mediaFilteredSermons.filter(isSeriesSermon)),
    [mediaFilteredSermons],
  );

  const listData = libraryMode === 'series' ? seriesGroups : standaloneSermons;
  const shouldShowLiveArchives =
    activeTab === 'video' &&
    libraryMode === 'standalone' &&
    liveStreamArchives.length > 0;
  const standaloneCount =
    standaloneSermons.length +
    (activeTab === 'video' ? liveStreamArchives.length : 0);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={tw`items-center py-16`}>
          <ActivityIndicator color="#EA9215" />
          <Text style={tw`font-nokia-bold text-accent-6 mt-3`}>
            Loading sermons...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View
          style={[
            tw`rounded-2xl p-6 border border-accent-6 mt-6`,
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

    return (
      <View
        style={[
          tw`rounded-2xl p-6 border border-accent-6 mt-6`,
          darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
        ]}>
        <Text
          style={[
            tw`font-nokia-bold text-center`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
          ]}>
          No {libraryMode === 'series' ? 'series' : 'standalone'} {activeTab}{' '}
          sermons available yet.
        </Text>
      </View>
    );
  }, [activeTab, darkMode, error, isLoading, libraryMode, refetch]);

  const renderSeriesGroup = ({item}) => {
    const firstSermon = item.sermons[0];
    const thumbnail = getYouTubeThumbnailUrl(
      getVideoUrl(firstSermon),
      'mqdefault',
    );

    return (
      <View
        style={[
          tw`rounded-2xl p-4 mb-4 border`,
          darkMode
            ? tw`bg-secondary-8 border-secondary-6`
            : tw`bg-primary-3 border-primary-7`,
        ]}>
        <View style={tw`flex-row mb-4`}>
          {!!thumbnail && (
            <Image
              source={{uri: thumbnail}}
              resizeMode="cover"
              style={tw`w-24 h-24 rounded-4 bg-secondary-7 mr-3`}
            />
          )}
          <View style={tw`flex-1`}>
            <Text
              style={[
                tw`font-nokia-bold text-lg`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              {item.title || 'Sermon Series'}
            </Text>
            <Text style={tw`font-nokia-bold text-accent-6 text-sm mt-1`}>
              {item.sermons.length} episode
              {item.sermons.length === 1 ? '' : 's'}
            </Text>
            {!!item.description && (
              <Text
                style={[
                  tw`font-nokia-bold text-sm mt-2`,
                  darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                ]}
                numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>

        {item.sermons.map(sermon => (
          <SermonCard
            key={sermon?._id}
            sermon={sermon}
            activeTab={activeTab}
            darkMode={darkMode}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={darkMode ? tw`bg-secondary-9 flex-1` : tw`flex-1`}>
      <SafeAreaView style={tw`flex-1 mx-auto w-11/12`}>
        <View style={tw`flex-row items-center justify-between py-4`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`w-10 h-10 rounded-full items-center justify-center bg-accent-6`}>
            <ArrowLeft size={22} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
          <Text
            style={[
              tw`font-nokia-bold text-2xl`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Sermons
          </Text>
          <View style={tw`w-10`} />
        </View>

        <View
          style={[
            tw`flex-row rounded-full p-1 mb-3`,
            darkMode ? tw`bg-secondary-8` : tw`bg-primary-6`,
          ]}>
          {[
            {key: 'video', label: 'Video', Icon: VideoCamera},
            {key: 'audio', label: 'Audio', Icon: MicrophoneStage},
          ].map(({key, label, Icon}) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveTab(key)}
                style={[
                  tw`flex-1 flex-row items-center justify-center py-3 rounded-full`,
                  isActive ? tw`bg-accent-6` : null,
                ]}>
                <Icon
                  size={18}
                  color={isActive ? '#FFFFFF' : '#EA9215'}
                  weight="bold"
                />
                <Text
                  style={[
                    tw`font-nokia-bold text-sm ml-2`,
                    isActive
                      ? tw`text-primary-1`
                      : darkMode
                      ? tw`text-primary-2`
                      : tw`text-secondary-7`,
                  ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={tw`flex-row mb-4`}>
          {[
            {
              key: 'standalone',
              label: 'Standalone',
              count: standaloneCount,
              Icon: Cards,
            },
            {
              key: 'series',
              label: 'Series',
              count: seriesGroups.length,
              Icon: Stack,
            },
          ].map(({key, label, count, Icon}) => {
            const isActive = libraryMode === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setLibraryMode(key)}
                style={[
                  tw`flex-1 px-3 py-2 rounded-2xl border flex-row items-center justify-center`,
                  key === 'standalone' ? tw`mr-3` : null,
                  isActive
                    ? tw`bg-accent-6 border-accent-6`
                    : darkMode
                    ? tw`bg-secondary-8 border-secondary-6`
                    : tw`bg-primary-3 border-primary-7`,
                ]}>
                <Icon
                  size={17}
                  color={isActive ? '#FFFFFF' : '#EA9215'}
                  weight="bold"
                />
                <Text
                  style={[
                    tw`font-nokia-bold text-sm mx-2`,
                    isActive
                      ? tw`text-primary-1`
                      : darkMode
                      ? tw`text-primary-2`
                      : tw`text-secondary-7`,
                  ]}>
                  {label}
                </Text>
                <View
                  style={[
                    tw`min-w-6 h-6 px-2 rounded-full items-center justify-center`,
                    isActive
                      ? tw`bg-primary-1`
                      : darkMode
                      ? tw`bg-secondary-7`
                      : tw`bg-primary-6`,
                  ]}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-xs`,
                      isActive ? tw`text-accent-6` : tw`text-secondary-7`,
                    ]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <FlatList
          data={listData}
          keyExtractor={(item, index) =>
            item?._id || item?.id || `${activeTab}-${libraryMode}-${index}`
          }
          renderItem={
            libraryMode === 'series'
              ? renderSeriesGroup
              : ({item}) => (
                  <SermonCard
                    sermon={item}
                    activeTab={activeTab}
                    darkMode={darkMode}
                  />
                )
          }
          ListHeaderComponent={
            shouldShowLiveArchives ? (
              <PreviousLiveStreamsSection
                archives={liveStreamArchives}
                activeTab={activeTab}
                darkMode={darkMode}
                showAll={showAllLiveArchives}
                onToggleShowAll={() =>
                  setShowAllLiveArchives(previous => !previous)
                }
              />
            ) : null
          }
          ListEmptyComponent={shouldShowLiveArchives ? null : renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: getFloatingTabScenePadding(insets),
          }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }
        />
      </SafeAreaView>
    </View>
  );
};

export default Sermons;
