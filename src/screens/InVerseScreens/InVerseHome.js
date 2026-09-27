import React, {useState, useCallback, useEffect, useRef} from 'react';
import {skipToken} from '@reduxjs/toolkit/query';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ImageBackground,
  Linking,
} from 'react-native';
import tw from './../../../tailwind';
import {useNavigation} from '@react-navigation/native';
import {useBottomTabBarHeight} from '@react-navigation/bottom-tabs';
import {useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  useGetInVersesQuery,
  useGetInVerseOfDayQuery,
  useGetInVerseOfQuarterQuery,
  useInvalidateInVerseCacheMutation,
  usePrefetch,
} from '../../services/InVerseapi';
import {useGetVideoLinkQuery} from '../../services/videoLinksApi';
import useCalculateLessonIndex from './hooks/useCalculateLessonIndex';
import LinearGradient from 'react-native-linear-gradient';
import {
  YoutubeLogo,
  CloudSlash,
  Warning,
  Database,
  ArrowClockwise,
} from 'phosphor-react-native';
import ErrorScreen from '../../components/ErrorScreen';
import {format} from 'date-fns';
import DateConverter from './DateConverter';
import networkManager from '../../utils/networkManager';
import {
  saveHomeScreenToCache,
  getCachedHomeScreen,
} from '../../utils/homeScreenCache';
import {
  clearInVerseRefreshCache,
  ensureOnlineOrNotify,
} from '../../utils/refreshCacheManager';

const isQueryNotStartedError = error =>
  String(error?.message || error).includes('not been started yet');

const safeRefetch = async queryRefetch => {
  try {
    return await queryRefetch();
  } catch (error) {
    if (isQueryNotStartedError(error)) {
      return null;
    }
    throw error;
  }
};

const InVerseHome = ({onReload}) => {
  const currentDate = new Date().toISOString().slice(0, 10);
  const [quarter, week, year] = useCalculateLessonIndex(currentDate);
  const [backgroundImage, setBackgroundImage] = useState('');
  const {data: InVerse, error, isLoading, refetch} = useGetInVersesQuery();

  const {
    data: lessonDetails,
    error: lessonError,
    isLoading: lessonIsLoading,
    refetch: lessonRefetch,
  } = useGetInVerseOfDayQuery(
    quarter && week ? {path: quarter, id: week} : skipToken,
  );

  const {
    data: quarterDetails,
    error: quarterError,
    isLoading: quarterIsLoading,
    refetch: quarterRefetch,
  } = useGetInVerseOfQuarterQuery(quarter || skipToken);

  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [reloadingLesson, setReloadingLesson] = useState(false);
  const [invalidateInVerseCache] = useInvalidateInVerseCacheMutation();
  const [cachedHomeData, setCachedHomeData] = useState(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const didMountLanguageRefresh = useRef(false);

  const lastDigitQuarter = parseInt(quarter?.slice(-1), 10);
  const {
    data: videoLink,
    error: videoError,
    isLoading: videoLoading,
  } = useGetVideoLinkQuery(
    {
      year: year,
      quarter: lastDigitQuarter,
      lesson: week,
    },
    {skip: !year || !lastDigitQuarter || !week},
  );

  useEffect(() => {
    if (lessonDetails) {
      setBackgroundImage(lessonDetails.lesson.cover);
    }
  }, [lessonDetails]);

  // Cache home screen data when loaded with internet
  useEffect(() => {
    if (
      networkManager.isOnline &&
      InVerse &&
      InVerse.length > 0 &&
      lessonDetails &&
      quarterDetails
    ) {
      const homeData = {
        InVerse,
        lessonDetails,
        quarterDetails,
        videoLink,
      };
      saveHomeScreenToCache('InVerseHome', homeData);
    }
  }, [InVerse, lessonDetails, quarterDetails, videoLink]);

  // Load from cache when offline or API fails
  useEffect(() => {
    const loadFromCache = async () => {
      if (
        (!networkManager.isOnline || error) &&
        (!InVerse || InVerse.length === 0)
      ) {
        try {
          const cached = await getCachedHomeScreen('InVerseHome');
          if (cached) {
            setCachedHomeData(cached);
            setIsUsingCache(true);
            console.log('📦 Using cached InVerseHome data (offline/error)');
          }
        } catch (cacheError) {
          console.error('Error loading cached InVerseHome data:', cacheError);
        }
      } else if (InVerse && InVerse.length > 0 && isUsingCache) {
        setIsUsingCache(false);
        setCachedHomeData(null);
      }
    };

    loadFromCache();
  }, [error, InVerse, isUsingCache]);

  const displayInVerse =
    InVerse && InVerse.length > 0 ? InVerse : cachedHomeData?.InVerse || [];
  const displayLessonDetails =
    lessonDetails || cachedHomeData?.lessonDetails || null;
  const displayQuarterDetails =
    quarterDetails || cachedHomeData?.quarterDetails || null;
  // Filter the data to include only items with an id or index ending in '-cq'
  const filteredData = displayInVerse?.filter(item => {
    if (
      (item.id && typeof item.id === 'string' && item.id.endsWith('-cq')) ||
      (item.index &&
        typeof item.index === 'string' &&
        item.index.endsWith('-cq'))
    ) {
      return true;
    }
    return false;
  });

  const onRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setLoadingTimeout(false);
      setNetworkError(false);

      const hasInternet = await ensureOnlineOrNotify();
      if (!hasInternet) {
        setNetworkError(true);
        return;
      }

      await clearInVerseRefreshCache();
      await invalidateInVerseCache();
      await safeRefetch(lessonRefetch);
      await safeRefetch(quarterRefetch);
      await safeRefetch(refetch);
    } catch (err) {
      console.warn('InVerse refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [lessonRefetch, quarterRefetch, refetch, invalidateInVerseCache]);

  // Add loading timeout effect
  useEffect(() => {
    let timeoutId;
    if (
      (isLoading || lessonIsLoading || quarterIsLoading) &&
      !error &&
      !lessonError &&
      !quarterError
    ) {
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000); // 15 second timeout
    } else {
      setLoadingTimeout(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    isLoading,
    lessonIsLoading,
    quarterIsLoading,
    error,
    lessonError,
    quarterError,
  ]);

  // Check network connectivity on mount and set up listener
  useEffect(() => {
    // Initial check
    if (!networkManager.isOnline) {
      setNetworkError(true);
    }

    // Set up network state listener
    const unsubscribe = networkManager.addListener(networkState => {
      if (!networkState.isOnline) {
        setNetworkError(true);
      } else {
        setNetworkError(false);
      }
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const language = useSelector(state => state.language.language);
  const prefetchWeeklyLessons = usePrefetch('getInVerseOfDayLesson');

  // Refetch data when language changes
  useEffect(() => {
    if (!didMountLanguageRefresh.current) {
      didMountLanguageRefresh.current = true;
      return;
    }
    onRefresh();
  }, [language, onRefresh]);

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const scrollBottomPadding = tabBarHeight + insets.bottom + 64;
  const darkMode = useSelector(state => state.ui.darkMode);

  const handleRetry = async () => {
    setLoadingTimeout(false);
    setNetworkError(false);

    if (!networkManager.isOnline) {
      setNetworkError(true);
      return;
    }

    try {
      // First invalidate all InVerse caches to force fresh data
      await invalidateInVerseCache();

      if (onReload) {
        await onReload();
      } else {
        await safeRefetch(refetch);
        await safeRefetch(lessonRefetch);
        await safeRefetch(quarterRefetch);
      }

      console.log('InVerse cache invalidated and data refetched successfully');
    } catch (err) {
      console.warn('InVerse retry error:', err);
    }
  };

  const handleLessonReload = async () => {
    setReloadingLesson(true);

    if (!networkManager.isOnline) {
      setNetworkError(true);
      setReloadingLesson(false);
      return;
    }

    try {
      // First invalidate all InVerse caches to force fresh data
      await invalidateInVerseCache();

      await safeRefetch(lessonRefetch);
      await safeRefetch(quarterRefetch);

      console.log(
        'InVerse lesson cache invalidated and refetched successfully',
      );
    } catch (err) {
      console.warn('Lesson reload error:', err);
    } finally {
      setReloadingLesson(false);
    }
  };

  if (quarterError) {
    console.warn(
      'Error initializing useGetInVerseOfQuarterQuery:',
      quarterError,
    );
  }

  if (!useGetInVerseOfQuarterQuery) {
    return (
      <SafeAreaView>
        <Text>Error: Hook not initialized</Text>
      </SafeAreaView>
    );
  }

  const handleSearch = text => {
    setSearchTerm(text);
  };

  const parseCustomDate = dateString => {
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  const formatDateRange = (startDate, endDate) => {
    try {
      const start = format(parseCustomDate(startDate), 'MMM dd');
      const end = format(parseCustomDate(endDate), 'MMM dd');
      return `${start} - ${end}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Handle different error states
  if (
    networkError &&
    (!displayInVerse || displayInVerse.length === 0) &&
    !cachedHomeData
  ) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : tw`h-100%`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
            ]}>
            No Internet Connection
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center mb-6`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-4`,
            ]}>
            Please check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4`}
            onPress={handleRetry}>
            <Text style={tw`font-nokia-bold text-white text-base`}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loadingTimeout && (!displayInVerse || displayInVerse.length === 0)) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : tw`h-100%`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <ActivityIndicator size="large" color="#EA9215" style={tw`mb-4`} />
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
            ]}>
            Still loading...
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center mb-6`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-4`,
            ]}>
            This is taking longer than expected. Please check your connection.
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4`}
            onPress={handleRetry}>
            <Text style={tw`font-nokia-bold text-white text-base`}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && (!displayInVerse || displayInVerse.length === 0)) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <ActivityIndicator size="large" color="#EA9215" style={tw`mt-20`} />
        <Text style={tw`font-nokia-bold text-lg text-accent-6 text-center`}>
          Loading
        </Text>
      </SafeAreaView>
    );
  }

  const handleWatchYouTube = () => {
    if (videoLink && videoLink.videoUrl) {
      Linking.openURL(videoLink.videoUrl);
    } else {
      alert('Video link not available');
    }
  };

  if (error && (!displayInVerse || displayInVerse.length === 0)) {
    return <ErrorScreen refetch={refetch} darkMode={darkMode} />;
  }

  const handleInVerseOpen = InVerseId => {
    navigation.navigate('InVerseQuarter', {InVerseId});
  };

  const textStyle = 'font-nokia-bold text-primary-3 text-2xl';
  const gradientColor = '#222222';

  const handleOpenButtonPress = async () => {
    // Prefetch all 7 days of lessons
    const prefetchPromises = [];
    for (let day = 1; day <= 7; day++) {
      const dayString = day.toString().padStart(2, '0');
      prefetchPromises.push(
        prefetchWeeklyLessons({
          path: quarter,
          id: week,
          day: dayString,
        }),
      );
    }

    // Wait for all prefetch requests to complete
    try {
      await Promise.all(prefetchPromises);
    } catch (error) {
      console.log('Prefetch error:', error);
      // Continue navigation even if prefetch fails
    }

    navigation.navigate('InVerseWeek', {
      InVerse: quarter,
      weekId: week,
    });
  };

  const currentLessonUnavailable =
    lessonError ||
    quarterError ||
    !displayLessonDetails ||
    !displayQuarterDetails;

  if (
    (lessonIsLoading || quarterIsLoading || videoLoading) &&
    !currentLessonUnavailable
  ) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <ActivityIndicator size="large" color="#EA9215" style={tw`mt-20`} />
        <Text style={tw`font-nokia-bold text-lg text-accent-6 text-center`}>
          Loading
        </Text>
      </SafeAreaView>
    );
  }

  if (currentLessonUnavailable) {
    return (
      <SafeAreaView style={[tw`flex-1`, darkMode ? tw`bg-secondary-9` : null]}>
        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          alwaysBounceVertical
          bounces
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: scrollBottomPadding,
          }}>
          {/* Enhanced Quarterly Update Card */}
          <View
            style={[
              tw`border-2 border-accent-6 rounded-3 p-4 mb-4 shadow-lg`,
              darkMode ? tw`bg-secondary-8` : tw`bg-orange-50`,
            ]}>
            <View style={tw`flex-row items-start`}>
              <View style={tw`flex-1 pr-3`}>
                <View style={tw`flex-row items-center mb-2`}>
                  <CloudSlash size={24} color="#EA9215" weight="fill" />
                  <Text
                    style={[
                      tw`font-nokia-bold text-lg ml-2`,
                      darkMode ? tw`text-primary-1` : tw`text-orange-700`,
                    ]}>
                    {language === 'en'
                      ? 'Quarterly Update Pending'
                      : 'የሩብ አመት ትምህርት በመጠባበቅ ላይ'}
                  </Text>
                </View>
                <Text
                  style={[
                    tw`font-nokia-bold text-sm leading-relaxed`,
                    darkMode ? tw`text-primary-3` : tw`text-orange-600`,
                  ]}>
                  {language === 'en'
                    ? 'New InVerse lessons are being prepared. Please check back soon or browse previous quarterly lessons below.'
                    : 'አዲስ የጠሊቅ ትምህርቶች እየተዘጋጁ ነው። እባክዎ ከጥቂት ጊዜ በኋላ ይመለሱ ወይም ከታች ያሉትን የቀድሞ የሩብ-አመት ትምህርቶች ይመልከቱ።'}
                </Text>
              </View>
              <TouchableOpacity
                style={tw`w-10 h-10 bg-orange-500 rounded-full items-center justify-center ml-2`}
                onPress={handleLessonReload}>
                {reloadingLesson ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ArrowClockwise size={20} color="#FFFFFF" weight="bold" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            placeholder={
              language === 'en' ? 'Search InVerses...' : 'የቀድሞ ትምህርቶችን ፈልግ...'
            }
            value={searchTerm}
            onChangeText={handleSearch}
            style={[
              tw`border border-primary-7 rounded-full px-4 py-2 font-nokia-bold mb-4`,
              darkMode ? tw`text-primary-1` : null,
            ]}
            placeholderTextColor={darkMode ? '#898989' : '#AAB0B4'}
          />
          <Text style={tw`font-nokia-bold text-accent-6 text-sm mt-2`}>
            {language === 'en' ? 'Quarterly Lessons' : 'የሩብ አመት ትምህርቶች'}
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-secondary-6 text-xl`,
              darkMode ? tw`text-primary-1` : null,
            ]}>
            {language === 'en'
              ? 'Past Quarterly Lessons'
              : 'ያለፉ የሩብ አመት ትምህርቶች'}
          </Text>
          <View style={tw`border-b border-accent-6 my-1`} />
          <View style={tw`flex flex-col`}>
            {filteredData?.map((item, index) => (
              <View
                key={item.id || item.index}
                style={tw`flex flex-row gap-3 my-3 border border-accent-6 p-3 rounded-2`}>
                {/* Image Container */}
                <View style={tw`w-32 h-48`}>
                  <Image
                    source={{uri: item.cover}}
                    style={tw`w-full h-full rounded-2`}
                    resizeMode="cover"
                  />
                </View>

                {/* Content Container */}
                <View style={tw`flex-1 justify-between`}>
                  {/* Text Content */}
                  <View style={tw`flex-1`}>
                    <Text
                      style={tw`font-nokia-bold text-sm text-accent-6 mb-1`}>
                      {item.human_date}
                    </Text>
                    <Text
                      style={[
                        tw`font-nokia-bold text-lg text-secondary-6 leading-tight mb-2`,
                        darkMode ? tw`text-primary-1` : null,
                      ]}
                      numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={tw`border-b border-accent-6 mb-2`} />
                    <Text
                      numberOfLines={3}
                      style={[
                        tw`font-nokia-bold text-sm text-secondary-6 flex-1`,
                        darkMode ? tw`text-primary-1` : null,
                      ]}>
                      {item.description}
                    </Text>
                  </View>

                  {/* Button Container */}
                  <View style={tw`mt-3 pt-2`}>
                    <TouchableOpacity
                      style={tw`px-4 py-2 rounded-4 bg-accent-6 self-start`}
                      onPress={() => handleInVerseOpen(item.id || item.index)}>
                      <Text style={tw`font-nokia-bold text-sm text-primary-1`}>
                        {language === 'en' ? 'Open Lesson' : 'ትምህርቱን ክፈት'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={[tw`flex-1`, darkMode ? tw`bg-secondary-9` : null]}>
      <SafeAreaView style={tw`flex-1`}>
        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          alwaysBounceVertical
          bounces
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: scrollBottomPadding,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }>
          <View style={tw`rounded overflow-hidden`}>
            <ImageBackground
              source={{
                uri: backgroundImage,
              }}
              style={tw`w-full h-44 justify-end`}>
              <LinearGradient
                pointerEvents="none"
                colors={[gradientColor, `${gradientColor}20`]}
                style={tw`absolute inset-0`}
                start={{x: 0.5, y: 1}}
                end={{x: 0.5, y: 0.2}}
              />
              <View pointerEvents="box-none" style={[tw`absolute inset-0 rounded-lg`]}>
                <View style={tw`flex absolute bottom-0 left-0 p-4`}>
                  <Text style={tw`font-nokia-bold text-primary-6`}>
                    {language === 'en'
                      ? "This Week's Lesson"
                      : 'የዚህ ሳምንት ትምህርት'}
                  </Text>
                  <View style={tw`flex flex-row items-center`}>
                    {language === 'en' ? (
                      <Text style={tw`font-nokia-bold text-accent-6`}>
                        {formatDateRange(
                          displayLessonDetails.lesson.start_date,
                          displayLessonDetails.lesson.end_date,
                        )}
                      </Text>
                    ) : (
                      <View style={tw`flex flex-row items-center`}>
                        <DateConverter
                          gregorianDate={displayLessonDetails.lesson.start_date}
                          textStyle={tw`font-nokia-bold text-accent-6`}
                        />
                        <Text style={tw`font-nokia-bold text-accent-6`}>
                          {' '}
                          -{' '}
                        </Text>
                        <DateConverter
                          gregorianDate={displayLessonDetails.lesson.end_date}
                          textStyle={tw`font-nokia-bold text-accent-6`}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </ImageBackground>
          </View>

          <View style={tw`my-2`}>
            <Text style={tw`font-nokia-bold text-accent-6`}>
              {displayQuarterDetails.quarterly.title}
            </Text>
            <Text
              style={[
                tw`font-nokia-bold text-secondary-6 text-2xl`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              {displayLessonDetails.lesson.title}
            </Text>
            <Text style={tw`font-nokia-bold text-accent-6`}>
              {displayQuarterDetails.quarterly.human_date}
            </Text>
          </View>
          <View style={tw`border-b border-accent-6 mb-1`} />
          <Text
            style={[
              tw`font-nokia-bold text-secondary-6`,
              darkMode ? tw`text-primary-1` : null,
            ]}>
            {'   '}
            {displayQuarterDetails.quarterly.description}
          </Text>
          <View style={tw`flex flex-row mx-auto gap-2 items-center my-2`}>
            <TouchableOpacity
              style={tw`bg-accent-6 px-3 py-1 rounded-full`}
              onPress={handleOpenButtonPress}>
              <Text style={tw`text-primary-1 font-nokia-bold`}>
                {language === 'en' ? 'Open Lesson' : 'ትምህርቱን ክፈት'}
              </Text>
            </TouchableOpacity>

            {videoLink && (
              <TouchableOpacity
                style={tw`flex flex-row border border-accent-6 px-3 py-1 rounded-full gap-1`}
                onPress={handleWatchYouTube}>
                <Text
                  style={[
                    tw`font-nokia-bold text-secondary-6 items-center`,
                    darkMode ? tw`text-primary-1` : null,
                  ]}>
                  {language === 'en' ? 'Watch on YouTube' : 'በዩቲዩብ ይመልከቱ'}
                </Text>
                <YoutubeLogo size={20} weight="fill" color="#EA9215" />
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            placeholder={
              language === 'en' ? 'Search InVerses...' : 'የቀድሞ ትምህርቶችን ፈልግ...'
            }
            value={searchTerm}
            onChangeText={handleSearch}
            style={[
              tw`border border-primary-7 rounded-full px-4 py-2 font-nokia-bold`,
              darkMode ? tw`text-primary-1` : null,
            ]}
            placeholderTextColor={darkMode ? '#898989' : '#AAB0B4'}
          />
          <Text style={tw`font-nokia-bold text-accent-6 text-sm mt-2`}>
            {language === 'en' ? 'Quarterly Lessons' : 'የሩብ አመት ትምህርቶች'}
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-secondary-6 text-xl`,
              darkMode ? tw`text-primary-1` : null,
            ]}>
            {language === 'en'
              ? 'Past Quarterly Lessons'
              : 'ያለፉ የሩብ አመት ትምህርቶች'}
          </Text>
          <View style={tw`border-b border-accent-6 my-1`} />
          <View style={tw`flex flex-col`}>
            {filteredData?.map((item, index) => (
              <View
                key={item.id || item.index}
                style={tw`flex flex-row gap-3 my-3 border border-accent-6 p-3 rounded-2`}>
                {/* Image Container */}
                <View style={tw`w-32 h-48`}>
                  <Image
                    source={{uri: item.cover}}
                    style={tw`w-full h-full rounded-2`}
                    resizeMode="cover"
                  />
                </View>

                {/* Content Container */}
                <View style={tw`flex-1 justify-between`}>
                  {/* Text Content */}
                  <View style={tw`flex-1`}>
                    <Text
                      style={tw`font-nokia-bold text-sm text-accent-6 mb-1`}>
                      {item.human_date}
                    </Text>
                    <Text
                      style={[
                        tw`font-nokia-bold text-lg text-secondary-6 leading-tight mb-2`,
                        darkMode ? tw`text-primary-1` : null,
                      ]}
                      numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={tw`border-b border-accent-6 mb-2`} />
                    <Text
                      numberOfLines={3}
                      style={[
                        tw`font-nokia-bold text-sm text-secondary-6 flex-1`,
                        darkMode ? tw`text-primary-1` : null,
                      ]}>
                      {item.description}
                    </Text>
                  </View>

                  {/* Button Container */}
                  <View style={tw`mt-3 pt-2`}>
                    <TouchableOpacity
                      style={tw`px-4 py-2 rounded-4 bg-accent-6 self-start`}
                      onPress={() => handleInVerseOpen(item.id || item.index)}>
                      <Text style={tw`font-nokia-bold text-sm text-primary-1`}>
                        {language === 'en' ? 'Open Lesson' : 'ትምህርቱን ክፈት'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default InVerseHome;
