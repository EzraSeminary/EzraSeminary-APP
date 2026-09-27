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
  useGetDevotionsByYearAndMonthQuery,
  useGetDevotionPlansQuery,
  useGetMyDevotionPlansQuery,
  useToggleDevotionLikeMutation,
  useGetDevotionLikesQuery,
  useTrackDevotionShareMutation,
  useGetDevotionCommentsQuery,
  apiSlice,
} from '../redux/api-slices/apiSlice';
import {useDispatch} from 'react-redux';
import {EthDateTime} from 'ethiopian-calendar-date-converter';
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
import {
  clearDevotionRefreshCache,
  ensureOnlineOrNotify,
} from '../utils/refreshCacheManager';
import HighlightableBlock from '../components/HighlightableBlock';
import HighlightableHtmlBlocks from '../components/HighlightableHtmlBlocks';
import HighlightActionSheet from '../components/HighlightActionSheet';
import usePersistentHighlights from '../hooks/usePersistentHighlights';
import {extractHtmlBlocks} from '../utils/htmlBlocks';
import {formatDevotionalForSharing} from '../utils/textFormatter';
import useReaderFontScale from '../hooks/useReaderFontScale';
import {
  ETHIOPIAN_MONTHS,
  normalizeEthiopianMonth,
} from '../utils/ethiopianCalendar';
import AndroidStatusBarSpacer from '../components/AndroidStatusBarSpacer';
import ReaderFontSizeControl from '../components/ReaderFontSizeControl';
import useReaderFontFamily from '../hooks/useReaderFontFamily';
import DevotionalAudioPlayer from '../components/DevotionalAudioPlayer';
import {getDevotionalAudioUrl} from '../utils/devotionalAudio';
import {
  getDevotionOrderValue,
  isSeriesDevotion,
  selectSeriesDevotionForDate,
} from '../utils/devotionalSeries';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getFloatingTabScenePadding} from '../navigation/floatingTabBarStyles';
import useCurrentDate from '../hooks/useCurrentDate';

const toEthDate = date => {
  const ethDateTime = EthDateTime.fromEuropeanDate(date);
  const year = ethDateTime.year;
  const month = ethDateTime.month;
  const day = ethDateTime.date;
  return {
    year,
    month,
    day,
    monthName: normalizeEthiopianMonth(ETHIOPIAN_MONTHS[month]),
  };
};

const findDevotionWithOffset = (
  devotions,
  offset,
  baseDate,
  targetYear,
  normalizeMonth,
) => {
  const date = new Date(baseDate);
  date.setDate(baseDate.getDate() - offset);
  const ethDate = toEthDate(date);
  const targetYearNumber = Number(targetYear);

  return devotions.find(devotion => {
    const devotionYear = devotion?.year;
    const hasYear = devotionYear !== undefined && devotionYear !== null;
    const devotionYearNumber = Number(devotionYear);

    return (
      normalizeMonth(devotion.month) === ethDate.monthName &&
      Number(devotion.day) === ethDate.day &&
      (!hasYear || devotionYearNumber === targetYearNumber)
    );
  });
};

const getMainVerseText = devotion =>
  devotion?.mainVerse ||
  devotion?.main_verse ||
  devotion?.memoryVerse ||
  devotion?.verse ||
  '';

const Devotion = () => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Get current Ethiopian date
  const today = useCurrentDate();
  const {
    year: ethYear,
    month: ethMonth,
    day: ethDay,
    monthName: currentEthiopianMonth,
  } = toEthDate(today);
  const yearToFetch = ethYear;
  const scrollBottomPadding = useMemo(
    () => getFloatingTabScenePadding(insets),
    [insets],
  );
  const alternateMonthName = useMemo(() => {
    if (currentEthiopianMonth === 'ሚያዚያ') {
      return 'ሚያዝያ';
    }
    if (currentEthiopianMonth === 'ሚያዝያ') {
      return 'ሚያዚያ';
    }
    if (currentEthiopianMonth === 'ሐምሌ') {
      return 'ሀምሌ';
    }
    if (currentEthiopianMonth === 'ሀምሌ') {
      return 'ሐምሌ';
    }
    return null;
  }, [currentEthiopianMonth]);

  // Fetch current month first for fast "today's devotion" render
  const {
    data: primaryMonthDevotions = [],
    isFetching: isPrimaryFeaturedFetching,
    error: primaryFeaturedError,
    refetch: refetchPrimaryMonthDevotions,
  } = useGetDevotionsByYearAndMonthQuery({
    year: yearToFetch,
    month: currentEthiopianMonth,
  });
  const {
    data: alternateMonthDevotions = [],
    isFetching: isAlternateFeaturedFetching,
    error: alternateFeaturedError,
    refetch: refetchAlternateMonthDevotions,
  } = useGetDevotionsByYearAndMonthQuery(
    {
      year: yearToFetch,
      month: alternateMonthName || '',
    },
    {skip: !alternateMonthName},
  );
  const featuredMonthDevotions = useMemo(() => {
    const merged = [...primaryMonthDevotions, ...alternateMonthDevotions];
    const getDevotionKey = devotion =>
      devotion?._id ||
      `${devotion?.year || 'legacy'}-${devotion?.month || ''}-${
        devotion?.day || ''
      }-${devotion?.title || ''}`;
    const unique = merged.filter(
      (item, index, arr) =>
        index ===
        arr.findIndex(other => getDevotionKey(other) === getDevotionKey(item)),
    );
    return unique.length > 0 ? unique : primaryMonthDevotions;
  }, [primaryMonthDevotions, alternateMonthDevotions]);
  const isFeaturedFetching =
    isPrimaryFeaturedFetching || isAlternateFeaturedFetching;
  const featuredError =
    primaryFeaturedError && alternateFeaturedError
      ? primaryFeaturedError
      : primaryFeaturedError || alternateFeaturedError;
  const refetchFeaturedMonthDevotions = useCallback(async () => {
    const requests = [refetchPrimaryMonthDevotions()];
    if (alternateMonthName) {
      requests.push(refetchAlternateMonthDevotions());
    }
    return Promise.all(requests);
  }, [
    alternateMonthName,
    refetchPrimaryMonthDevotions,
    refetchAlternateMonthDevotions,
  ]);

  // Fetch full list in background for "Discover Devotionals"
  const {
    data: discoverDevotions = [],
    isFetching: isDiscoverFetching,
    error: discoverError,
    refetch: refetchDiscoverDevotions,
  } = useGetDevotionsQuery({year: yearToFetch, limit: 1000, sort: 'desc'});

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
  const [floatingHighlightSheet, setFloatingHighlightSheet] = useState({
    visible: false,
  });
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('devotional'); // 'devotional' or 'plan'
  const [cachedHomeData, setCachedHomeData] = useState(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const {
    scaleTextSize,
    increaseFontScale,
    decreaseFontScale,
    readerFontScalePercentage,
  } = useReaderFontScale();
  const {readerFontStyle} = useReaderFontFamily();
  const [showFontSizePopup, setShowFontSizePopup] = useState(false);
  const handleReaderScrollBegin = useCallback(() => {
    setShowFontSizePopup(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setActiveTab('devotional');
    }, []),
  );

  // Cache home screen data when loaded with internet
  useEffect(() => {
    if (
      networkManager.isOnline &&
      (featuredMonthDevotions.length > 0 || discoverDevotions.length > 0) &&
      devotionPlans.length > 0
    ) {
      const homeData = {
        devotions:
          discoverDevotions.length > 0
            ? discoverDevotions
            : featuredMonthDevotions,
        devotionPlans,
        devotionToDisplay: devotionToDisplay || null,
        myDevotionPlans: myDevotionPlans || [],
        completedPlans: completedPlans || [],
      };
      saveHomeScreenToCache('Devotion', homeData);
    }
  }, [
    featuredMonthDevotions,
    discoverDevotions,
    devotionPlans,
    devotionToDisplay,
    myDevotionPlans,
    completedPlans,
  ]);

  // Load from cache when offline or API fails
  useEffect(() => {
    const loadFromCache = async () => {
      if (
        (!networkManager.isOnline || (featuredError && discoverError)) &&
        featuredMonthDevotions.length === 0 &&
        discoverDevotions.length === 0
      ) {
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
      } else if (
        (featuredMonthDevotions.length > 0 || discoverDevotions.length > 0) &&
        isUsingCache
      ) {
        setIsUsingCache(false);
        setCachedHomeData(null);
      }
    };

    loadFromCache();
  }, [
    featuredError,
    discoverError,
    featuredMonthDevotions.length,
    discoverDevotions.length,
    isUsingCache,
  ]);

  // Use cached data if available
  const displayDevotions = useMemo(
    () =>
      discoverDevotions.length > 0
        ? discoverDevotions
        : cachedHomeData?.devotions || [],
    [cachedHomeData?.devotions, discoverDevotions],
  );
  const displayFeaturedDevotions = useMemo(
    () =>
      featuredMonthDevotions.length > 0
        ? featuredMonthDevotions
        : displayDevotions,
    [displayDevotions, featuredMonthDevotions],
  );
  const displayDevotionPlans = useMemo(
    () =>
      devotionPlans.length > 0
        ? devotionPlans
        : cachedHomeData?.devotionPlans || [],
    [cachedHomeData?.devotionPlans, devotionPlans],
  );
  const displayMyDevotionPlans = useMemo(
    () =>
      myDevotionPlans.length > 0
        ? myDevotionPlans
        : cachedHomeData?.myDevotionPlans || [],
    [cachedHomeData?.myDevotionPlans, myDevotionPlans],
  );
  const displayCompletedPlans = useMemo(
    () =>
      completedPlans.length > 0
        ? completedPlans
        : cachedHomeData?.completedPlans || [],
    [cachedHomeData?.completedPlans, completedPlans],
  );

  // Find today's devotion from the loaded data
  const devotionToDisplay = useMemo(() => {
    const devotionsToUse =
      displayDevotions.length > 0 ? displayDevotions : displayFeaturedDevotions;
    if (devotionsToUse.length === 0) {
      return null;
    }

    const seriesDevotion = selectSeriesDevotionForDate(devotionsToUse, today);
    if (seriesDevotion) {
      return seriesDevotion;
    }

    const normalizeMonth = month => normalizeEthiopianMonth(month);
    const todaysDevotion = findDevotionWithOffset(
      displayFeaturedDevotions,
      0,
      today,
      yearToFetch,
      normalizeMonth,
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

    return todaysDevotion || null;
  }, [
    displayDevotions,
    displayFeaturedDevotions,
    currentEthiopianMonth,
    ethDay,
    today,
    yearToFetch,
  ]);

  // Get cached image (must be called before conditional returns)
  const url = devotionToDisplay?.image ? `${devotionToDisplay.image}` : '';
  const cachedImage = useCachedImage(url);
  const {verse, reference} = separateVerseAndReference(
    getMainVerseText(devotionToDisplay),
  );
  const devotionHighlightKey = useMemo(
    () =>
      `devotional-home:${
        devotionToDisplay?._id || `${ethYear}-${ethMonth}-${ethDay}`
      }`,
    [devotionToDisplay?._id, ethDay, ethMonth, ethYear],
  );
  const {
    highlights,
    inlineHighlights,
    setHighlight,
    clearHighlight,
    setInlineHighlight,
    clearInlineHighlights,
  } = usePersistentHighlights(devotionHighlightKey);
  const devotionBodyBlocks = useMemo(
    () => extractHtmlBlocks(devotionToDisplay?.body || []),
    [devotionToDisplay?.body],
  );
  const audioUrl = getDevotionalAudioUrl(devotionToDisplay);
  const isSeriesEntry = isSeriesDevotion(devotionToDisplay);
  const seriesDayNumber = getDevotionOrderValue(devotionToDisplay);
  const dateBadgeTop = isSeriesEntry ? 'Day' : devotionToDisplay?.month;
  const dateBadgeBottom = isSeriesEntry
    ? seriesDayNumber || devotionToDisplay?.day || ''
    : devotionToDisplay?.day;

  const {data: likesData, refetch: refetchLikes} = useGetDevotionLikesQuery(
    devotionToDisplay?._id,
    {
      skip: !devotionToDisplay?._id,
    },
  );

  // Refetch likes when user changes to keep counts aligned across screens.
  useEffect(() => {
    if (devotionToDisplay?._id) {
      refetchLikes();
    }
  }, [user, devotionToDisplay?._id, refetchLikes]);

  const {data: commentsData, refetch: refetchComments} =
    useGetDevotionCommentsQuery(devotionToDisplay?._id, {
      skip: !devotionToDisplay?._id,
    });

  const [toggleLike, {isLoading: isTogglingLike}] =
    useToggleDevotionLikeMutation();
  const [trackShare, {isLoading: isTrackingShare}] =
    useTrackDevotionShareMutation();

  useFocusEffect(
    useCallback(() => {
      if (devotionToDisplay?._id) {
        refetchLikes();
        refetchComments();
      }
      if (networkManager.isOnline) {
        refetchFeaturedMonthDevotions();
        refetchDiscoverDevotions();
      }
    }, [
      devotionToDisplay?._id,
      refetchLikes,
      refetchComments,
      refetchFeaturedMonthDevotions,
      refetchDiscoverDevotions,
    ]),
  );

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
      // No success message - silent success
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      // Only show error message if something goes wrong
      Toast.show({
        type: 'error',
        text1: 'Failed to like',
        text2: error?.data?.message || 'Please try again.',
      });
    }
  };

  const handleShareDevotion = async () => {
    if (!devotionToDisplay || !devotionToDisplay._id) {
      return;
    }

    try {
      const didShare = await handleShare(
        setIsSharing,
        devotionToDisplay.image || '',
        {
          message: formatDevotionalForSharing(devotionToDisplay),
          title: devotionToDisplay.title || 'Daily Devotional',
        },
      );
      if (!didShare) {
        return;
      }
      // Track share on backend to increment share count
      try {
        const shareResult = await trackShare(devotionToDisplay._id).unwrap();
        // Update share count from backend response
        if (shareResult?.sharesCount !== undefined) {
          setSharesCount(shareResult.sharesCount);
        } else {
          // Fallback: optimistic update if backend doesn't return count
          setSharesCount(prevCount => prevCount + 1);
        }
      } catch (shareError) {
        // Even if tracking fails, still show success (share was successful)
        console.error('Failed to track share:', shareError);
        // Optimistic update
        setSharesCount(prevCount => prevCount + 1);
      }

      Toast.show({
        type: 'success',
        text1: 'Shared successfully',
      });
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
    console.log(
      'featuredMonthDevotions loaded:',
      featuredMonthDevotions?.length || 0,
    );
    console.log('discoverDevotions loaded:', discoverDevotions?.length || 0);
    console.log('isFeaturedFetching:', isFeaturedFetching);
    console.log('isDiscoverFetching:', isDiscoverFetching);
    console.log('featuredError:', featuredError);
    console.log('discoverError:', discoverError);
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
    featuredMonthDevotions,
    discoverDevotions,
    isFeaturedFetching,
    isDiscoverFetching,
    featuredError,
    discoverError,
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
        ? tw`text-primary-1 font-nokia-bold`
        : tw`text-secondary-6 font-nokia-bold`),
      ...readerFontStyle,
      fontSize: scaleTextSize(14),
      lineHeight: scaleTextSize(20),
      marginVertical: 0,
    },
    a: {
      ...tw`text-accent-6 font-nokia-bold underline`,
      ...readerFontStyle,
      fontSize: scaleTextSize(14),
      lineHeight: scaleTextSize(20),
    },
    h1: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold`,
          ...readerFontStyle,
          fontSize: scaleTextSize(24),
          lineHeight: scaleTextSize(32),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold`,
          ...readerFontStyle,
          fontSize: scaleTextSize(24),
          lineHeight: scaleTextSize(32),
        },
    h2: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold`,
          ...readerFontStyle,
          fontSize: scaleTextSize(20),
          lineHeight: scaleTextSize(28),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold`,
          ...readerFontStyle,
          fontSize: scaleTextSize(20),
          lineHeight: scaleTextSize(28),
        },
    h3: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold`,
          ...readerFontStyle,
          fontSize: scaleTextSize(18),
          lineHeight: scaleTextSize(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold`,
          ...readerFontStyle,
          fontSize: scaleTextSize(18),
          lineHeight: scaleTextSize(26),
        },
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setLoadingTimeout(false);
    setNetworkError(false);

    const hasInternet = await ensureOnlineOrNotify();
    if (!hasInternet) {
      setNetworkError(true);
      setIsRefreshing(false);
      return;
    }

    try {
      console.log('Devotion screen: Invalidating cache and refetching...');
      await clearDevotionRefreshCache();

      // Invalidate RTK Query cache to force fresh fetch
      dispatch(apiSlice.util.invalidateTags(['Devotions']));

      // Wait for cache invalidation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Refetch featured + discover data
      const [featuredResult, discoverResult] = await Promise.all([
        refetchFeaturedMonthDevotions(),
        refetchDiscoverDevotions(),
      ]);
      console.log(
        'Devotion screen: Refetch complete',
        featuredResult?.data?.length || 0,
        'featured /',
        discoverResult?.data?.length || 0,
        'discover',
      );

      if (
        (featuredResult?.data?.length || 0) > 0 ||
        (discoverResult?.data?.length || 0) > 0
      ) {
        const loadedCount =
          discoverResult?.data?.length || featuredResult?.data?.length || 0;
        Toast.show({
          type: 'success',
          text1: 'Data Refreshed',
          text2: `Loaded ${loadedCount} devotionals`,
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
  }, [refetchFeaturedMonthDevotions, refetchDiscoverDevotions, dispatch]);

  // Add loading timeout effect
  useEffect(() => {
    let timeoutId;
    if (isFeaturedFetching && !featuredError && !devotionToDisplay) {
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
  }, [isFeaturedFetching, featuredError, devotionToDisplay]);

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
      const currentDevotion =
        (await NotificationService.getTodaysDevotion()) || devotion;
      if (settings.enabled && currentDevotion) {
        await NotificationService.scheduleDailyVerseNotification(
          currentDevotion,
          settings.time,
        );
      }
    } catch (err) {
      console.error('Error scheduling notification:', err);
    }
  };

  // Handle different error states
  if (networkError && !devotionToDisplay && !cachedHomeData) {
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

  if (featuredError && !devotionToDisplay && !cachedHomeData) {
    return <ErrorScreen refetch={onRefresh} darkMode={darkMode} />;
  }

  if (loadingTimeout && !devotionToDisplay) {
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

  if (isFeaturedFetching && !devotionToDisplay) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <ActivityIndicator size="large" color="#EA9215" style={tw`mt-20`} />
        <Text style={tw`font-nokia-bold text-lg text-accent-6 text-center`}>
          Loading
        </Text>
      </SafeAreaView>
    );
  }

  if (!devotionToDisplay) {
    return <ErrorScreen refetch={onRefresh} darkMode={darkMode} />;
  }

  // Extract the verse content and reference
  // Handle various quote types: double quotes, single quotes, and mixed quotes
  function separateVerseAndReference(verseText) {
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
  }

  return (
    <View style={darkMode ? tw`bg-secondary-9` : null}>
      <SafeAreaView style={tw`flex mx-auto w-[92%]`}>
        <AndroidStatusBarSpacer minHeight={4} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={handleReaderScrollBegin}
          contentContainerStyle={{
            paddingBottom: scrollBottomPadding,
          }}
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
            <ReaderFontSizeControl
              darkMode={darkMode}
              isVisible={showFontSizePopup}
              onToggle={() => setShowFontSizePopup(previous => !previous)}
              onDecrease={decreaseFontScale}
              onIncrease={increaseFontScale}
              percentage={readerFontScalePercentage}
              popupPosition={{top: 110, right: 24}}
              wrapperStyle={tw`absolute right-0`}
            />
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
                  {dateBadgeTop}
                </Text>
                <Text
                  style={tw`font-nokia-bold text-primary-1 text-4xl leading-tight text-center`}>
                  {dateBadgeBottom}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              tw`border border-accent-6 p-4 rounded-4 mt-4 bg-primary-5 shadow-lg`,
              darkMode ? tw`bg-secondary-8` : null,
            ]}>
            <HighlightableBlock
              blockId="verse-card"
              text={[verse, reference].filter(Boolean).join('\n')}
              darkMode={darkMode}
              activeColorId={highlights['verse-card']}
              onSelectColor={setHighlight}
              onClearHighlight={clearHighlight}
              style={tw`rounded-4 p-1`}>
              <>
                <Text
                  selectable
                  style={[
                    tw`font-nokia-bold text-secondary-6`,
                    darkMode ? tw`text-primary-1` : null,
                    {
                      ...readerFontStyle,
                      fontSize: scaleTextSize(18),
                      lineHeight: scaleTextSize(26),
                    },
                  ]}>
                  {verse}
                </Text>
                {reference && (
                  <View style={tw`border-t border-accent-6 mt-3 pt-3`}>
                    <Text
                      style={[
                        tw`font-nokia-bold text-accent-6`,
                        darkMode ? tw`text-accent-6` : null,
                        {
                          ...readerFontStyle,
                          fontSize: scaleTextSize(18),
                          lineHeight: scaleTextSize(26),
                        },
                      ]}>
                      {reference}
                    </Text>
                  </View>
                )}
              </>
            </HighlightableBlock>
          </View>
          <DevotionalAudioPlayer
            audioUrl={audioUrl}
            darkMode={darkMode}
            title={devotionToDisplay.title}
          />
          <View style={tw`mt-8`}>
            <HighlightableHtmlBlocks
              blocks={devotionBodyBlocks}
              darkMode={darkMode}
              highlights={highlights}
              inlineHighlights={inlineHighlights}
              onSelectColor={setHighlight}
              onSelectInlineColor={setInlineHighlight}
              onClearHighlight={clearHighlight}
              onClearInlineHighlights={clearInlineHighlights}
              onFloatingSheetChange={setFloatingHighlightSheet}
              stylesheet={tailwindStyles}
              blockContainerStyle={tw`rounded-4 mb-2`}
              displayPointerEvents="none"
              minContentHeight={0}
            />
          </View>
          <View
            style={[
              tw`border border-accent-6 p-4 rounded-4 mt-8 bg-primary-4 shadow-sm mb-2`,
              darkMode ? tw`bg-secondary-8` : null,
            ]}>
            <HighlightableBlock
              blockId="prayer-card"
              text={devotionToDisplay.prayer || ''}
              darkMode={darkMode}
              activeColorId={highlights['prayer-card']}
              onSelectColor={setHighlight}
              onClearHighlight={clearHighlight}
              style={tw`rounded-4 p-1`}>
              <Text
                style={[
                  tw`font-nokia-bold text-accent-6 text-center`,
                  {
                    ...readerFontStyle,
                    fontSize: scaleTextSize(14),
                    lineHeight: scaleTextSize(20),
                  },
                ]}>
                {devotionToDisplay.prayer}
              </Text>
            </HighlightableBlock>
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
                    const inProgressEntry = displayMyDevotionPlans.find(
                      p => (p.planId || p.plan?._id) === plan._id,
                    );
                    const completedEntry = displayCompletedPlans.find(
                      p => (p.planId || p.plan?._id) === plan._id,
                    );

                    const planStatus = completedEntry
                      ? 'completed'
                      : inProgressEntry
                      ? 'in_progress'
                      : 'new';
                    const itemsCompleted = Array.isArray(
                      inProgressEntry?.itemsCompleted,
                    )
                      ? inProgressEntry.itemsCompleted.length
                      : 0;
                    const totalItems =
                      inProgressEntry?.progress?.total || plan?.numItems || 0;
                    const percentFromServer =
                      inProgressEntry?.progress?.percent || 0;
                    const derivedPercent =
                      totalItems > 0
                        ? Math.round((itemsCompleted / totalItems) * 100)
                        : 0;
                    const progressPercent =
                      percentFromServer > 0
                        ? percentFromServer
                        : derivedPercent;
                    const progressLabel =
                      planStatus === 'in_progress'
                        ? `Progress ${progressPercent}%`
                        : null;

                    return (
                      <DevotionPlanSquareCard
                        key={plan._id || index}
                        plan={plan}
                        darkMode={darkMode}
                        status={planStatus}
                        progressLabel={progressLabel}
                        onPress={plan => {
                          if (planStatus !== 'new') {
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
          {displayDevotions.length > 0 ? (
            <PreviousDevotions
              devotions={displayDevotions}
              darkMode={darkMode}
              currentYear={yearToFetch}
            />
          ) : (
            <View style={tw`py-8 items-center`}>
              {isDiscoverFetching ? (
                <>
                  <ActivityIndicator size="small" color="#EA9215" />
                  <Text
                    style={[
                      tw`font-nokia-bold text-xs mt-2`,
                      darkMode ? tw`text-primary-3` : tw`text-secondary-4`,
                    ]}>
                    Loading previous devotionals...
                  </Text>
                </>
              ) : (
                <Text
                  style={[
                    tw`font-nokia-bold text-xs mt-2`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-4`,
                  ]}>
                  No previous devotionals available.
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {floatingHighlightSheet?.visible ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            pointerEvents="box-none"
            style={[tw`absolute left-3 right-3`, {bottom: 16}]}>
            <HighlightActionSheet
              visible={Boolean(floatingHighlightSheet?.visible)}
              useModal={false}
              darkMode={darkMode}
              selectedCount={floatingHighlightSheet?.selectedCount || 0}
              selectedText={floatingHighlightSheet?.selectedText || ''}
              onClose={floatingHighlightSheet?.onClose || (() => {})}
              onSelectColor={
                floatingHighlightSheet?.onSelectColor || (async () => {})
              }
              onClearHighlights={
                floatingHighlightSheet?.onClearHighlights || (async () => {})
              }
              onOpenFreeSelection={floatingHighlightSheet?.onOpenFreeSelection}
              freeSelectionEnabled={Boolean(
                floatingHighlightSheet?.freeSelectionEnabled,
              )}
              allowBlockHighlight={Boolean(
                floatingHighlightSheet?.allowBlockHighlight,
              )}
            />
          </View>
        </View>
      ) : null}

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
        isStarting={false}
        onStartPlan={async () => {
          if (!selectedPlan?._id) {
            return;
          }

          const planId = selectedPlan._id;
          setShowStartPlanModal(false);
          setSelectedPlan(null);
          navigation.navigate('Devotional', {
            screen: 'PlanDevotionViewer',
            params: {planId, startOnOpen: true},
          });
        }}
      />
    </View>
  );
};

export default Devotion;
