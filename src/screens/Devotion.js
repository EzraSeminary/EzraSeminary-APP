import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import React, {useState, useCallback, useEffect, useMemo, useRef} from 'react';
import {useSelector} from 'react-redux';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {Share as RNShare} from 'react-native';
import handleDownload from '../components/handleDownload';
import {handleShare} from '../components/handleShare';
import {
  DownloadSimple,
  ShareNetwork,
  Share,
  Heart,
  ChatCircle,
  ArrowLeft,
  BookOpen,
} from 'phosphor-react-native';
import tw from './../../tailwind';
import Toast from 'react-native-toast-message';
import {
  useGetDevotionsQuery,
  useGetDevotionPlansQuery,
  useGetMyDevotionPlansQuery,
  useStartDevotionPlanMutation,
  useToggleDevotionLikeMutation,
  useGetDevotionLikesQuery,
  useGetDevotionCommentsQuery,
  apiSlice,
} from '../redux/api-slices/apiSlice';
import {useDispatch} from 'react-redux';
import {toEthiopian} from 'ethiopian-date';
import HTMLView from 'react-native-htmlview';
import {useCachedImage} from '../utils/imageCache';
import ErrorScreen from '../components/ErrorScreen';
import PreviousDevotions from './DevotionScreens/PreviousDevotions';
import NotificationService from '../services/NotificationService';
import DevotionalShareModal from '../components/DevotionalShareModal';
import DevotionPlanSquareCard from '../components/DevotionPlanSquareCard';
import StartDevotionPlanModal from '../components/StartDevotionPlanModal';
import CommentsModal from '../components/CommentsModal';
import {
  saveHomeScreenToCache,
  getCachedHomeScreen,
} from '../utils/homeScreenCache';
import networkManager from '../utils/networkManager';

const ethiopianMonths = [
  '',
  'መስከረም',
  'ጥቅምት',
  'ህዳር',
  'ታህሳስ',
  'ጥር',
  'የካቲት',
  'መጋቢት',
  'ሚያዝያ',
  'ግንቦት',
  'ሰኔ',
  'ሐምሌ',
  'ነሐሴ',
  'ጳጉሜ',
];

const Devotion = () => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  // Get current Ethiopian date
  const today = new Date();
  const [, ethMonth, ethDay] = toEthiopian(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );
  const currentEthiopianMonth = ethiopianMonths[ethMonth];
  const yearToFetch = 2018; // Fixed year for now

  // Fetch all devotions for the year to ensure we find today's devotion
  const {
    data: devotions = [],
    isFetching,
    error,
    refetch,
  } = useGetDevotionsQuery({year: yearToFetch});

  const {
    data: devotionPlans = [],
    isLoading: devotionPlansLoading,
    error: devotionPlansError,
  } = useGetDevotionPlansQuery();
  const {data: myDevotionPlans = []} = useGetMyDevotionPlansQuery(
    {
      status: 'in_progress',
    },
    {
      skip: !user, // Skip if user is not logged in
    },
  );
  const {data: completedPlans = []} = useGetMyDevotionPlansQuery(
    {
      status: 'completed',
    },
    {
      skip: !user, // Skip if user is not logged in
    },
  );

  const [startDevotionPlan, {isLoading: isStartingPlan}] =
    useStartDevotionPlanMutation();

  // State for start plan modal
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showStartPlanModal, setShowStartPlanModal] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('devotional'); // 'devotional' or 'plan'
  const [cachedHomeData, setCachedHomeData] = useState(null);
  const [isUsingCache, setIsUsingCache] = useState(false);

  // Cache home screen data when loaded with internet
  useEffect(() => {
    if (
      networkManager.isOnline &&
      devotions.length > 0 &&
      devotionPlans.length > 0
    ) {
      const homeData = {
        devotions,
        devotionPlans,
        devotionToDisplay: devotionToDisplay || null,
        myDevotionPlans: myDevotionPlans || [],
        completedPlans: completedPlans || [],
      };
      saveHomeScreenToCache('Devotion', homeData);
    }
  }, [
    devotions,
    devotionPlans,
    devotionToDisplay,
    myDevotionPlans,
    completedPlans,
  ]);

  // Load from cache when offline or API fails
  useEffect(() => {
    const loadFromCache = async () => {
      if ((!networkManager.isOnline || error) && devotions.length === 0) {
        try {
          const cached = await getCachedHomeScreen('Devotion');
          if (cached) {
            setCachedHomeData(cached);
            setIsUsingCache(true);
            console.log('📦 Using cached Devotion home data (offline/error)');
          }
        } catch (error) {
          console.error('Error loading cached Devotion home data:', error);
        }
      } else if (devotions.length > 0 && isUsingCache) {
        setIsUsingCache(false);
        setCachedHomeData(null);
      }
    };

    loadFromCache();
  }, [error, devotions.length, isUsingCache]);

  // Use cached data if available
  const displayDevotions =
    devotions.length > 0 ? devotions : cachedHomeData?.devotions || [];
  const displayDevotionPlans =
    devotionPlans.length > 0
      ? devotionPlans
      : cachedHomeData?.devotionPlans || [];
  const displayMyDevotionPlans =
    myDevotionPlans.length > 0
      ? myDevotionPlans
      : cachedHomeData?.myDevotionPlans || [];
  const displayCompletedPlans =
    completedPlans.length > 0
      ? completedPlans
      : cachedHomeData?.completedPlans || [];

  // Find today's devotion from the loaded data
  const devotionToDisplay = useMemo(() => {
    const devotionsToUse = displayDevotions;
    if (devotionsToUse.length === 0) {
      return cachedHomeData?.devotionToDisplay || null;
    }

    const todaysDevotion = devotionsToUse.find(
      devotion =>
        devotion.month === currentEthiopianMonth &&
        Number(devotion.day) === ethDay,
    );

    // Log whether we found today's devotion or using fallback
    if (todaysDevotion) {
      console.log(
        `Found today's devotion: ${currentEthiopianMonth} ${ethDay} - ${todaysDevotion.title}`,
      );
    } else {
      console.log(
        `Today's devotion NOT found for ${currentEthiopianMonth} ${ethDay}, using fallback`,
      );
    }

    return todaysDevotion || devotionsToUse[0] || null;
  }, [displayDevotions, currentEthiopianMonth, ethDay, cachedHomeData]);

  // Get cached image (must be called before conditional returns)
  const url = devotionToDisplay?.image ? `${devotionToDisplay.image}` : '';
  const cachedImage = useCachedImage(url);

  const {data: likesData} = useGetDevotionLikesQuery(devotionToDisplay?._id, {
    skip: !user || !devotionToDisplay?._id,
  });

  const {data: commentsData} = useGetDevotionCommentsQuery(
    devotionToDisplay?._id,
    {
      skip: !devotionToDisplay?._id,
    },
  );

  const [toggleLike, {isLoading: isTogglingLike}] =
    useToggleDevotionLikeMutation();

  // Update likes, shares, and comments state when data changes
  useEffect(() => {
    if (likesData) {
      setIsLiked(likesData.isLiked || false);
      setLikesCount(likesData.likesCount || 0);
    } else if (devotionToDisplay) {
      // When user is not logged in or likesData is not available, use devotion data
      setIsLiked(devotionToDisplay.isLiked || false);
      setLikesCount(devotionToDisplay.likesCount || 0);
    }
    // Update shares count from devotion data
    if (devotionToDisplay) {
      setSharesCount(devotionToDisplay.sharesCount || 0);
    }
    // Update comments count from API query result
    if (commentsData) {
      setCommentsCount(commentsData.count || 0);
    } else if (devotionToDisplay) {
      // Fallback to devotion data if API query is not available
      setCommentsCount(devotionToDisplay.commentsCount || 0);
    }
  }, [
    likesData,
    commentsData,
    devotionToDisplay,
    devotionToDisplay?.isLiked,
    devotionToDisplay?.likesCount,
    devotionToDisplay?.sharesCount,
    devotionToDisplay?.commentsCount,
  ]);

  const handleLike = async () => {
    if (!user || !devotionToDisplay?._id) {
      return;
    }

    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount(previousLiked ? likesCount - 1 : likesCount + 1);

    try {
      const result = await toggleLike(devotionToDisplay._id).unwrap();
      setIsLiked(result.isLiked);
      setLikesCount(result.likesCount);
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      Toast.show({
        type: 'error',
        text1: 'Failed to like',
        text2: error?.data?.message || 'Please try again.',
      });
    }
  };

  const handleShareDevotion = async () => {
    if (!devotionToDisplay) {
      return;
    }

    try {
      const result = await RNShare.share({
        message: `Check out this daily devotional: ${devotionToDisplay.title}\n\n${devotionToDisplay.verse}`,
        title: devotionToDisplay.title,
      });

      if (result.action === RNShare.sharedAction) {
        // Optimistic update for shares count
        setSharesCount(prevCount => prevCount + 1);

        Toast.show({
          type: 'success',
          text1: 'Shared successfully',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to share',
        text2: 'Please try again.',
      });
    }
  };

  const handleComment = () => {
    if (!user || !devotionToDisplay?._id) {
      return;
    }
    setShowCommentsModal(true);
  };

  // Reset navigation when screen is focused (when tab is pressed)
  useFocusEffect(
    useCallback(() => {
      // Get parent navigator state
      const parentState = navigation.getParent()?.getState();
      if (parentState) {
        const devotionalRoute = parentState.routes.find(
          r => r.name === 'Devotional',
        );
        const devotionalState = devotionalRoute?.state;
        // If we're not on DevotionalHome, reset to it
        if (devotionalState?.index > 0) {
          navigation.reset({
            index: 0,
            routes: [{name: 'DevotionalHome'}],
          });
        }
      }
    }, [navigation]),
  );

  // Debug logging
  useEffect(() => {
    console.log('=== DEVOTION SCREEN DEBUG ===');
    console.log('currentMonth:', currentEthiopianMonth, 'day:', ethDay);
    console.log('devotions loaded:', devotions?.length || 0);
    console.log('isFetching:', isFetching);
    console.log('error:', error);
    console.log(
      'devotionToDisplay:',
      devotionToDisplay ? devotionToDisplay.title : 'NO',
    );
    console.log('devotionPlans:', devotionPlans?.length || 0);
    console.log('devotionPlansLoading:', devotionPlansLoading);
    console.log('devotionPlansError:', devotionPlansError);
    console.log('myDevotionPlans:', myDevotionPlans?.length || 0);
    console.log('completedPlans:', completedPlans?.length || 0);
    console.log('user:', user ? 'logged in' : 'not logged in');
    console.log('============================');
  }, [
    devotions,
    isFetching,
    error,
    devotionToDisplay,
    currentEthiopianMonth,
    ethDay,
    devotionPlans,
    devotionPlansLoading,
    devotionPlansError,
    myDevotionPlans,
    completedPlans,
    user,
  ]);

  const tailwindStyles = StyleSheet.create({
    p: {
      ...(darkMode
        ? tw`text-primary-1 font-nokia-bold text-justify text-sm leading-snug`
        : tw`text-secondary-6 font-nokia-bold text-justify leading-snug`),
      marginVertical: -15,
    },
    a: tw`text-accent-6 font-nokia-bold text-sm underline`,
    h1: darkMode
      ? tw`text-primary-1 font-nokia-bold text-justify text-2xl leading-snug`
      : tw`text-secondary-6 font-nokia-bold text-justify text-2xl leading-snug`,
    h2: darkMode
      ? tw`text-primary-1 font-nokia-bold text-justify text-xl leading-snug`
      : tw`text-secondary-6 font-nokia-bold text-justify text-xl leading-snug`,
    h3: darkMode
      ? tw`text-primary-1 font-nokia-bold text-justify text-lg leading-snug`
      : tw`text-secondary-6 font-nokia-bold text-justify text-lg leading-snug`,
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setLoadingTimeout(false);
    setNetworkError(false);

    // Check network connectivity first
    if (!networkManager.isOnline) {
      setNetworkError(true);
      setIsRefreshing(false);
      Toast.show({
        type: 'error',
        text1: 'No Internet Connection',
        text2: 'Please connect to the internet to reload.',
      });
      return;
    }

    try {
      console.log('Devotion screen: Invalidating cache and refetching...');
      // Invalidate RTK Query cache to force fresh fetch
      dispatch(apiSlice.util.invalidateTags(['Devotions']));

      // Wait for cache invalidation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Refetch with fresh data
      const result = await refetch();
      console.log(
        'Devotion screen: Refetch complete',
        result?.data?.length || 0,
        'devotions',
      );

      if (result?.data?.length > 0) {
        Toast.show({
          type: 'success',
          text1: 'Data Refreshed',
          text2: `Loaded ${result.data.length} devotionals`,
        });
      }
    } catch (err) {
      console.error('Refresh error:', err);
      Toast.show({
        type: 'error',
        text1: 'Refresh Failed',
        text2: 'Unable to fetch devotions. Please try again.',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, dispatch]);

  // Add loading timeout effect
  useEffect(() => {
    let timeoutId;
    if (isFetching && !error) {
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
  }, [isFetching, error]);

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

  // Schedule notification when devotion changes
  useEffect(() => {
    if (devotionToDisplay) {
      scheduleNotificationForCurrentDevotion(devotionToDisplay);
    }
  }, [devotionToDisplay]);

  // Initialize animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const scheduleNotificationForCurrentDevotion = async devotion => {
    try {
      const settings = await NotificationService.getDailyNotificationSettings();
      if (settings.enabled && devotion) {
        await NotificationService.scheduleDailyVerseNotification(
          devotion,
          settings.time,
        );
      }
    } catch (err) {
      console.error('Error scheduling notification:', err);
    }
  };

  // Handle different error states
  if (networkError && !devotions.length && !cachedHomeData) {
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
            onPress={onRefresh}>
            <Text style={tw`font-nokia-bold text-white text-base`}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !devotions.length) {
    return <ErrorScreen refetch={refetch} darkMode={darkMode} />;
  }

  if (loadingTimeout && !devotions.length) {
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
            onPress={onRefresh}>
            <Text style={tw`font-nokia-bold text-white text-base`}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isFetching && !devotions.length) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <ActivityIndicator size="large" color="#EA9215" style={tw`mt-20`} />
        <Text style={tw`font-nokia-bold text-lg text-accent-6 text-center`}>
          Loading
        </Text>
      </SafeAreaView>
    );
  }

  if (!devotions || devotions.length === 0) {
    return <ErrorScreen refetch={refetch} darkMode={darkMode} />;
  }

  // Extract the verse content and reference
  // Handle various quote types: double quotes, single quotes, and mixed quotes
  const separateVerseAndReference = verseText => {
    if (!verseText) {
      return {verse: '', reference: ''};
    }

    const quotePatterns = ['"', "'", '\u201C', '\u201D', '\u2018', '\u2019'];
    let lastQuoteIndex = -1;
    let lastQuoteChar = '';

    // Find the last occurrence of any quote type
    for (const quote of quotePatterns) {
      const index = verseText.lastIndexOf(quote);
      if (index > lastQuoteIndex) {
        lastQuoteIndex = index;
        lastQuoteChar = quote;
      }
    }

    let verse = '';
    let reference = '';

    if (lastQuoteIndex !== -1) {
      // Separate the verse content and reference
      verse = verseText
        .substring(0, lastQuoteIndex + lastQuoteChar.length)
        .trim(); // Everything up to the last closing quote
      reference = verseText
        .substring(lastQuoteIndex + lastQuoteChar.length)
        .trim(); // Everything after the last closing quote
    } else {
      // If no quotes are found, treat the entire text as the verse
      verse = verseText;
    }

    return {verse, reference};
  };

  const {verse, reference} = separateVerseAndReference(devotionToDisplay.verse);

  return (
    <View style={darkMode ? tw`bg-secondary-9` : null}>
      <SafeAreaView style={tw`flex mx-auto w-[92%]`}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }
          removeClippedSubviews={true}>
          <View
            style={tw`flex flex-row items-center justify-center my-4 relative`}>
            <TouchableOpacity
              style={tw`absolute left-0`}
              onPress={() => {
                // Navigate to Home tab
                navigation.getParent()?.navigate('Home');
              }}>
              <ArrowLeft size={28} weight="bold" color="#EA9215" />
            </TouchableOpacity>
            {/* Sliding buttons for Devotional/Devotional Plan */}
            <View
              style={[
                tw`flex-row rounded-full p-1`,
                {
                  backgroundColor: darkMode ? '#374151' : '#E5E7EB',
                },
              ]}>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab('devotional');
                  // Navigate to DevotionalHome if not already there
                  navigation.navigate('Devotional', {
                    screen: 'DevotionalHome',
                  });
                }}
                style={[
                  tw`px-4 py-2 rounded-full`,
                  {
                    backgroundColor:
                      activeTab === 'devotional' ? '#EA9215' : 'transparent',
                  },
                ]}>
                <Text
                  style={[
                    tw`font-nokia-bold text-sm`,
                    {
                      color:
                        activeTab === 'devotional'
                          ? '#FFFFFF'
                          : darkMode
                          ? '#D1D5DB'
                          : '#4B5563',
                    },
                  ]}>
                  Devotional
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab('plan');
                  navigation.navigate('Devotional', {
                    screen: 'DevotionPlans',
                  });
                }}
                style={[
                  tw`px-4 py-2 rounded-full`,
                  {
                    backgroundColor:
                      activeTab === 'plan' ? '#EA9215' : 'transparent',
                  },
                ]}>
                <Text
                  style={[
                    tw`font-nokia-bold text-sm`,
                    {
                      color:
                        activeTab === 'plan'
                          ? '#FFFFFF'
                          : darkMode
                          ? '#D1D5DB'
                          : '#4B5563',
                    },
                  ]}>
                  Devotional Plan
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={tw`flex flex-row mt-6 justify-between`}>
            <View style={tw`w-70%`}>
              <Text
                style={[
                  tw`font-nokia-bold text-secondary-6 text-4xl leading-tight`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                {devotionToDisplay.title}
              </Text>
              <View style={tw`border-b border-accent-6 mb-1`} />
              <Text
                style={[
                  tw`font-nokia-bold text-secondary-6 text-sm`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                የዕለቱ የመጽሐፍ ቅዱስ ንባብ ክፍል -
              </Text>
              <Text
                style={tw`font-nokia-bold text-accent-6 text-xl leading-tight`}>
                {devotionToDisplay.chapter}
              </Text>
            </View>
            <View
              style={tw`flex items-center justify-center border border-accent-6 p-2 rounded-4 w-20 h-20`}>
              <View
                style={tw`flex justify-center gap-[-1] bg-secondary-6 rounded-2 w-16 h-16`}>
                <Text style={tw`font-nokia-bold text-primary-1 text-center`}>
                  {devotionToDisplay.month}
                </Text>
                <Text
                  style={tw`font-nokia-bold text-primary-1 text-4xl leading-tight text-center`}>
                  {devotionToDisplay.day}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              tw`border border-accent-6 p-4 rounded-4 mt-4 bg-primary-5 shadow-lg`,
              darkMode ? tw`bg-secondary-8` : null,
            ]}>
            <Text
              selectable
              style={[
                tw`font-nokia-bold text-secondary-6 text-lg leading-tight`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              {verse}
            </Text>
            {reference && (
              <View style={tw`border-t border-accent-6 mt-3 pt-3`}>
                <Text
                  style={[
                    tw`font-nokia-bold text-accent-6 text-lg leading-tight`,
                    darkMode ? tw`text-accent-6` : null,
                  ]}>
                  {reference}
                </Text>
              </View>
            )}
          </View>
          <View style={tw`mt-8`}>
            <HTMLView
              value={devotionToDisplay.body[0]} // Assuming body[0] contains HTML string
              stylesheet={tailwindStyles}
              linebreak={false}
            />
          </View>
          <View
            style={[
              tw`border border-accent-6 p-4 rounded-4 mt-8 bg-primary-4 shadow-sm mb-2`,
              darkMode ? tw`bg-secondary-8` : null,
            ]}>
            <Text
              style={tw`font-nokia-bold text-accent-6 text-sm leading-tight text-center`}>
              {devotionToDisplay.prayer}
            </Text>
          </View>

          {/* Share Devotional Button */}
          <TouchableOpacity
            style={tw`flex flex-row items-center justify-center gap-2 p-3 bg-accent-6 rounded-4 mt-4 mb-2`}
            onPress={() => setShareModalVisible(true)}>
            <Share size={24} weight="bold" color="#FFFFFF" />
            <Text style={tw`font-nokia-bold text-white text-base`}>
              የዕለቱን መንፈሳዊ ትምህርት አጋራ
            </Text>
          </TouchableOpacity>

          {/* Like, Share, Comment Actions - Only show when user is logged in */}
          {user && (
            <View
              style={tw`flex-row items-center justify-center gap-6 mt-4 mb-2`}>
              <TouchableOpacity
                style={tw`items-center`}
                onPress={handleLike}
                disabled={isTogglingLike || !devotionToDisplay?._id}>
                <Heart
                  size={28}
                  weight={isLiked ? 'fill' : 'regular'}
                  color={isLiked ? '#EF4444' : '#EA9215'}
                />
                <Text
                  style={[
                    tw`font-nokia-bold text-xs mt-1`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  {likesCount || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`items-center`}
                onPress={handleShareDevotion}>
                <ShareNetwork size={28} weight="regular" color="#EA9215" />
                <Text
                  style={[
                    tw`font-nokia-bold text-xs mt-1`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  {sharesCount || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`items-center`}
                onPress={handleComment}>
                <ChatCircle size={28} weight="regular" color="#EA9215" />
                <Text
                  style={[
                    tw`font-nokia-bold text-xs mt-1`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  {commentsCount || 0}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View
            style={tw`border border-accent-6 rounded-4 mt-4 overflow-hidden`}>
            <Image
              source={{
                uri: cachedImage,
              }}
              style={tw`w-full h-96`}
              resizeMode="cover"
            />
            <View style={tw`flex flex-row gap-2 justify-center my-4`}>
              <TouchableOpacity
                style={tw`flex flex-row items-center gap-2 px-2 py-1 bg-accent-6 rounded-4`}
                onPress={() => handleDownload(setIsDownloading, url)}>
                {isDownloading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={tw`font-nokia-bold text-primary-1`}>
                      {' '}
                      ምስሉን አውርድ
                    </Text>
                    <DownloadSimple
                      size={28}
                      weight="bold"
                      style={tw`text-primary-1`}
                    />
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`flex flex-row items-center gap-2 px-2 py-1 bg-accent-6 rounded-4`}
                onPress={() => handleShare(setIsSharing, url)}>
                {isSharing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={tw`font-nokia-bold text-primary-1`}>
                      {' '}
                      ምስሉን አጋራ
                    </Text>
                    <ShareNetwork
                      size={28}
                      weight="bold"
                      style={tw`text-primary-1`}
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <View style={tw`border-b border-primary-7 mt-4 mb-4`} />

          {/* Devotion Plans Section - በእቅድ ያንብቡ */}
          {displayDevotionPlans && displayDevotionPlans.length > 0 && (
            <>
              <Animated.View
                style={[
                  tw`p-4 rounded-2xl mb-4`,
                  {
                    backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                    transform: [{scale: scaleAnim}],
                  },
                ]}>
                <View style={tw`flex flex-row justify-between items-center`}>
                  <View style={tw`flex-row items-center flex-1`}>
                    <BookOpen size={24} color="#EA9215" weight="bold" />
                    <Text
                      style={[
                        tw`font-nokia-bold text-lg ml-3`,
                        darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                      ]}>
                      በእቅድ ያንብቡ
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      tw`px-4 py-2 rounded-full flex-row items-center`,
                      {backgroundColor: '#EA9215'},
                    ]}
                    onPress={() =>
                      navigation.navigate('Devotional', {
                        screen: 'DevotionPlans',
                      })
                    }>
                    <Text
                      style={tw`font-nokia-bold text-primary-1 text-sm mr-1`}>
                      All Plans
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
              <Animated.View
                style={{
                  transform: [{scale: scaleAnim}],
                }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={tw`px-1 pb-2`}>
                  {displayDevotionPlans.slice(0, 5).map((plan, index) => {
                    const isStarted =
                      displayMyDevotionPlans.some(
                        p => (p.planId || p.plan?._id) === plan._id,
                      ) ||
                      displayCompletedPlans.some(
                        p => (p.planId || p.plan?._id) === plan._id,
                      );
                    return (
                      <DevotionPlanSquareCard
                        key={plan._id || index}
                        plan={plan}
                        darkMode={darkMode}
                        isStarted={isStarted}
                        onPress={plan => {
                          if (isStarted) {
                            // If plan is already started, navigate directly
                            navigation.navigate('Devotional', {
                              screen: 'PlanDevotionViewer',
                              params: {planId: plan._id},
                            });
                          } else {
                            // If plan is not started, show modal
                            setSelectedPlan(plan);
                            setShowStartPlanModal(true);
                          }
                        }}
                      />
                    );
                  })}
                </ScrollView>
              </Animated.View>
              <View style={tw`border-b border-primary-7 mt-4 mb-4`} />
            </>
          )}

          <View style={tw`flex flex-row justify-between items-center`}>
            <Text
              style={[
                tw`font-nokia-bold text-secondary-4 text-lg`,
                darkMode ? tw`text-primary-3` : null,
              ]}>
              Discover Devotionals
            </Text>
            <TouchableOpacity
              style={tw`border border-accent-6 px-4 py-1 rounded-4`}
              onPress={() => navigation.navigate('AllDevotionals')}>
              <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                All Devotionals
              </Text>
            </TouchableOpacity>
          </View>
          <PreviousDevotions
            devotions={displayDevotions}
            darkMode={darkMode}
            currentYear={2018}
          />
        </ScrollView>
      </SafeAreaView>

      {/* Share Modal */}
      <DevotionalShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        devotional={devotionToDisplay}
        darkMode={darkMode}
      />

      {/* Comments Modal */}
      {devotionToDisplay?._id && (
        <CommentsModal
          visible={showCommentsModal}
          onClose={() => setShowCommentsModal(false)}
          devotionId={devotionToDisplay._id}
          darkMode={darkMode}
        />
      )}

      {/* Start Devotion Plan Modal */}
      <StartDevotionPlanModal
        visible={showStartPlanModal}
        onClose={() => {
          setShowStartPlanModal(false);
          setSelectedPlan(null);
        }}
        plan={selectedPlan}
        darkMode={darkMode}
        isStarting={isStartingPlan}
        onStartPlan={async () => {
          if (!selectedPlan?._id) {
            return;
          }

          try {
            await startDevotionPlan(selectedPlan._id).unwrap();

            Toast.show({
              type: 'success',
              text1: 'Plan Started! 🎉',
              text2: 'Your devotion plan journey begins now.',
            });

            // Close modal and navigate to plan viewer
            setShowStartPlanModal(false);
            const planId = selectedPlan._id;
            setSelectedPlan(null);

            // Small delay to ensure state updates
            setTimeout(() => {
              navigation.navigate('Devotional', {
                screen: 'PlanDevotionViewer',
                params: {planId},
              });
            }, 300);
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'Failed to Start Plan',
              text2:
                error?.data?.message || error?.message || 'Please try again.',
            });
          }
        }}
      />
    </View>
  );
};

export default Devotion;
