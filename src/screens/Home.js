import React, {useState, useCallback, useEffect, useRef, useMemo} from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Dimensions,
  ImageBackground,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {useSelector, useDispatch} from 'react-redux';
import tw from './../../tailwind';
<<<<<<< HEAD
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {
  useGetDevotionsQuery,
  useGetCoursesQuery,
  useGetDevotionPlansQuery,
  useGetMyDevotionPlansQuery,
  useStartDevotionPlanMutation,
  apiSlice,
} from '../redux/api-slices/apiSlice';
import networkManager from '../utils/networkManager';
=======
import {useNavigation} from '@react-navigation/native';
import {
  useGetDevotionsQuery,
  useGetPublishedCoursesQuery,
} from '../redux/api-slices/apiSlice';
>>>>>>> 73ad21f43c16ca57af1f75217762294f97a0253e
import HomeCurrentSSL from './SSLScreens/HomeCurrentSSL';
import PreviousDevotions from './DevotionScreens/PreviousDevotions';
import {toEthiopian} from 'ethiopian-date';
import NetInfo from '@react-native-community/netinfo';
import DevotionCard from '../components/DevotionCard';
import CourseCard from '../components/CourseCard';
import Header from '../components/Header';
import DevotionPlanSquareCard from '../components/DevotionPlanSquareCard';
import StartDevotionPlanModal from '../components/StartDevotionPlanModal';
import {setDevotions} from '../redux/devotionsSlice';
import {setCourses} from '../redux/courseSlice';
import {scheduleVerseOfTheDayNotification} from '../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {prefetchImages} from '../utils/imageCache';
import {
  BookOpen,
  Calendar,
  Users,
  Cross,
  Sparkle,
  Book,
} from 'phosphor-react-native';

const ethiopianMonths = [
  '', // There is no month 0
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
  'ጳጉሜ', // 13th month
];

const {width} = Dimensions.get('window');

const Home = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [cachedData, setCachedData] = useState({
    devotions: [],
    courses: [],
    lastCacheTime: null,
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  const navigation = useNavigation();
  const dispatch = useDispatch();
  const darkMode = useSelector(state => state.ui.darkMode);
  const user = useSelector(state => state.auth.user);
  const persistedDevotions = useSelector(state => state.devotions);
  const persistedCourses = useSelector(state => state.courses);

  // Get current Ethiopian year
  const getCurrentEthiopianYear = () => {
    // For now, we'll use 2018 as the current Ethiopian year
    // This should be updated based on the actual current Ethiopian year
    return 2018;
  };

  const currentEthiopianYear = getCurrentEthiopianYear();

  // Determine which year to fetch data for (same logic as other screens)
  // Always fetch current year data for Home screen - let user select year in AllDevotionals
  const yearToFetch = currentEthiopianYear;

  // Get current Ethiopian date
  const today = new Date();
  const [, ethMonth, ethDay] = toEthiopian(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );
  const currentEthiopianMonth = ethiopianMonths[ethMonth];

  // Fetch all devotions for the year to ensure we find today's devotion
  const {
    data: devotions = [],
    isFetching,
    isLoading: devotionsLoading,
    refetch: refetchDevotions,
    error: devotionsError,
<<<<<<< HEAD
  } = useGetDevotionsQuery({year: yearToFetch});
=======
  } = useGetDevotionsQuery({limit: 5});
>>>>>>> 73ad21f43c16ca57af1f75217762294f97a0253e

  const {
    data: courses = [],
    isFetching: courseIsFetching,
    refetch: refetchCourses,
    error: courseError,
  } = useGetPublishedCoursesQuery({limit: 1});

  // [DEVOTION FLOW] 1. Fetched from API (RTK Query)
  console.log('[Home] Devotion - Fetched from API:', {
    count: devotions?.length ?? 0,
    data: devotions,
    isFetching,
    error: devotionsError,
  });

  // [COURSE FLOW] 1. Fetched from API (RTK Query)
  console.log('[Home] Course - Fetched from API:', {
    count: courses?.length ?? 0,
    data: courses,
    isFetching: courseIsFetching,
    error: courseError,
  });

  const {
    data: devotionPlans = [],
    isLoading: devotionPlansLoading,
    error: devotionPlansError,
    refetch: refetchDevotionPlans,
  } = useGetDevotionPlansQuery();

  // Debug logging for devotion plans
  useEffect(() => {
    console.log('=== HOME DEVOTION PLANS DEBUG ===');
    console.log('devotionPlans:', devotionPlans?.length || 0);
    console.log('devotionPlansLoading:', devotionPlansLoading);
    console.log('devotionPlansError:', devotionPlansError);
    if (devotionPlans && devotionPlans.length > 0) {
      console.log('First plan:', JSON.stringify(devotionPlans[0], null, 2));
    }
    console.log('=================================');
  }, [devotionPlans, devotionPlansLoading, devotionPlansError]);
  const {
    data: myDevotionPlans = [],
    refetch: refetchMyDevotionPlans,
  } = useGetMyDevotionPlansQuery({
    status: 'in_progress',
  });
  const {
    data: completedPlans = [],
    refetch: refetchCompletedPlans,
  } = useGetMyDevotionPlansQuery({
    status: 'completed',
  });

  // Network connectivity listener to refetch devotion plans when connection is restored
  useEffect(() => {
    const unsubscribe = networkManager.addListener(async networkState => {
      // When network comes back online, refetch devotion plans
      if (networkState.isNowConnected) {
        console.log('🌐 Network restored - Refetching devotion plans...');
        try {
          // Invalidate cache first to force fresh data
          dispatch(apiSlice.util.invalidateTags(['DevotionPlans']));
          await new Promise(resolve => setTimeout(resolve, 100));

          // Refetch all devotion plan related queries
          await Promise.all([
            refetchDevotionPlans(),
            refetchMyDevotionPlans(),
            refetchCompletedPlans(),
          ]);
          console.log('✅ Devotion plans refetched successfully');
        } catch (error) {
          console.error('❌ Error refetching devotion plans:', error);
        }
      }
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, [refetchDevotionPlans, refetchMyDevotionPlans, refetchCompletedPlans, dispatch]);

  // Force refetch devotion plans on mount if online (fixes iOS stale cache issue)
  useEffect(() => {
    const refetchIfOnline = async () => {
      if (networkManager.isOnline) {
        console.log(
          '🔄 Home mounted with internet - Refetching devotion plans to ensure fresh data...',
        );
        try {
          // Invalidate cache first to force fresh data
          dispatch(apiSlice.util.invalidateTags(['DevotionPlans']));
          await new Promise(resolve => setTimeout(resolve, 100));

          // Refetch all devotion plan related queries
          await Promise.all([
            refetchDevotionPlans(),
            refetchMyDevotionPlans(),
            refetchCompletedPlans(),
          ]);
          console.log('✅ Devotion plans refetched on mount');
        } catch (error) {
          console.error('❌ Error refetching devotion plans on mount:', error);
        }
      }
    };

    refetchIfOnline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Refetch devotion plans when screen comes into focus (iOS fix for stale data)
  useFocusEffect(
    useCallback(() => {
      if (networkManager.isOnline) {
        console.log('🔄 Home screen focused - Refetching devotion plans...');
        // Invalidate cache first to force fresh data
        dispatch(apiSlice.util.invalidateTags(['DevotionPlans']));

        // Small delay to ensure cache invalidation completes
        setTimeout(() => {
          Promise.all([
            refetchDevotionPlans(),
            refetchMyDevotionPlans(),
            refetchCompletedPlans(),
          ]).catch(error => {
            console.error(
              '❌ Error refetching devotion plans on focus:',
              error,
            );
          });
        }, 100);
      }
    }, [
      refetchDevotionPlans,
      refetchMyDevotionPlans,
      refetchCompletedPlans,
      dispatch,
    ]),
  );

  const [startDevotionPlan, {isLoading: isStartingPlan}] =
    useStartDevotionPlanMutation();

  // State for start plan modal
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showStartPlanModal, setShowStartPlanModal] = useState(false);

  // Calculate unstarted plans (plans that are not in progress or completed)
  const unstartedPlans = useMemo(() => {
    if (!devotionPlans || devotionPlans.length === 0) return [];

    const inProgressPlanIds = new Set(
      (myDevotionPlans || []).map(p => p.planId || p.plan?._id),
    );
    const completedPlanIds = new Set(
      (completedPlans || []).map(p => p.planId || p.plan?._id),
    );

    return devotionPlans.filter(
      plan =>
        !inProgressPlanIds.has(plan._id) && !completedPlanIds.has(plan._id),
    );
  }, [devotionPlans, myDevotionPlans, completedPlans]);

  const [selectedDevotion, setSelectedDevotion] = useState(null);

  // Cache management functions
  const CACHE_KEY = 'home_data_cache';
  const CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours

  const loadCachedData = useCallback(async () => {
    try {
      const cachedString = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedString) {
        const cached = JSON.parse(cachedString);
        const now = new Date().getTime();
        const cacheTime = new Date(cached.lastCacheTime).getTime();
        const isExpired = now - cacheTime > CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

        if (!isExpired) {
          setCachedData(cached);
          // Update Redux store with cached data
          if (cached.devotions?.length > 0) {
            dispatch(setDevotions(cached.devotions));
          }
          if (cached.courses?.length > 0) {
            dispatch(setCourses(cached.courses));
          }
<<<<<<< HEAD
          // Begin prefetching cached images in background (devotions & courses)
          prefetchImages(
            (cached.devotions || [])
              .map(d => d.image)
              .concat((cached.courses || []).map(c => c.image)),
          ).catch(() => {});
=======
          console.log('[Home] Devotion - Loaded from cache:', {
            count: cached.devotions?.length ?? 0,
            lastCacheTime: cached.lastCacheTime,
          });
          console.log('[Home] Course - Loaded from cache:', {
            count: cached.courses?.length ?? 0,
            lastCacheTime: cached.lastCacheTime,
          });
>>>>>>> 73ad21f43c16ca57af1f75217762294f97a0253e
          return cached;
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
    return null;
  }, [dispatch]);

  const saveCachedData = useCallback(async (devotionsData, coursesData) => {
    try {
      const cacheData = {
        devotions: devotionsData || [],
        courses: coursesData || [],
        lastCacheTime: new Date().toISOString(),
      };
      // Compact the data to reduce storage size
      const compact = data =>
        (data || []).map(d => ({
          _id: d._id,
          title: d.title,
          month: d.month,
          day: d.day,
          image: d.image,
          verse: d.verse,
          chapter: d.chapter,
          year: d.year,
        }));

      const minimized = {
        devotions: compact(devotionsData),
        courses: (coursesData || []).map(c => ({
          _id: c._id,
          title: c.title,
          image: c.image,
          published: c.published,
        })),
        lastCacheTime: cacheData.lastCacheTime,
      };

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(minimized));
      setCachedData(cacheData);
      console.log('[Home] Devotion - Saved to cache:', {
        count: cacheData.devotions?.length ?? 0,
      });
      console.log('[Home] Course - Saved to cache:', {
        count: cacheData.courses?.length ?? 0,
      });
    } catch (error) {
      // Handle SQLITE_FULL gracefully by purging cache
      const message = String(error?.message || '');
      if (message.includes('SQLITE_FULL') || message.includes('disk is full')) {
        try {
          await AsyncStorage.removeItem(CACHE_KEY);
        } catch {}
      }
      console.error('Error saving cached data:', error);
    }
  }, []);

  const handleButtonPress = id => {
    navigation.navigate('Course', {
      screen: 'CourseContent',
      params: {courseId: id},
    });
  };

  const [lastVisitedCourseId, setLastVisitedCourseId] = useState(null);
  const [startedCourseIds, setStartedCourseIds] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const last = await AsyncStorage.getItem('lastVisitedCourseId');
        const started =
          (await AsyncStorage.getItem('startedCourseIds')) || '[]';
        if (last) setLastVisitedCourseId(last);
        setStartedCourseIds(JSON.parse(started));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const getDevotionsToUse = () => {
      if (isOffline) {
        return cachedData.devotions?.length > 0
          ? cachedData.devotions
          : persistedDevotions;
      }
      return devotions?.length > 0 ? devotions : cachedData.devotions;
    };

    const devotionsToUse = getDevotionsToUse();
    console.log("[Home] Devotion - Selecting today's devotion:", {
      devotionsToUseCount: devotionsToUse?.length ?? 0,
      source: isOffline
        ? cachedData.devotions?.length > 0
          ? 'cached'
          : 'persisted'
        : devotions?.length > 0
        ? 'API'
        : 'cached',
    });

    if (devotionsToUse && devotionsToUse.length > 0) {
      // Find today's devotion from the current month's data
      const todaysDevotion = devotionsToUse.find(
        devotion =>
          devotion.month === currentEthiopianMonth &&
          Number(devotion.day) === ethDay,
      );
      const selected = todaysDevotion || devotionsToUse[0];
      setSelectedDevotion(selected);
      console.log('[Home] Devotion - Selected devotion:', {
        isTodaysMatch: !!todaysDevotion,
        selected: selected
          ? {id: selected._id, month: selected.month, day: selected.day}
          : null,
      });
    }
  }, [
    devotions,
    isOffline,
    persistedDevotions,
    cachedData.devotions,
    currentEthiopianMonth,
    ethDay,
  ]);

  const getDataToDisplay = () => {
<<<<<<< HEAD
    // Priority: fresh data > cached data > persisted data (always show something)
    const devotionsSource =
      (devotions?.length > 0 ? devotions : null) ||
      (cachedData.devotions?.length > 0 ? cachedData.devotions : null) ||
      (persistedDevotions?.length > 0 ? persistedDevotions : null) ||
      [];

    const coursesSource =
      (courses?.length > 0 ? courses : null) ||
      (cachedData.courses?.length > 0 ? cachedData.courses : null) ||
      (persistedCourses?.length > 0 ? persistedCourses : null) ||
      [];

    return {
      devotions: devotionsSource,
      courses: coursesSource,
    };
=======
    let result;
    if (isOffline) {
      result = {
        devotions:
          cachedData.devotions?.length > 0
            ? cachedData.devotions
            : persistedDevotions,
        courses:
          cachedData.courses?.length > 0
            ? cachedData.courses
            : persistedCourses,
      };
      console.log('[Home] Devotion - getDataToDisplay (offline):', {
        source: cachedData.devotions?.length > 0 ? 'cached' : 'persisted',
        count: result.devotions?.length ?? 0,
      });
      console.log('[Home] Course - getDataToDisplay (offline):', {
        source: cachedData.courses?.length > 0 ? 'cached' : 'persisted',
        count: result.courses?.length ?? 0,
      });
    } else {
      result = {
        devotions: devotions?.length > 0 ? devotions : cachedData.devotions,
        courses: courses?.length > 0 ? courses : cachedData.courses,
      };
      console.log('[Home] Devotion - getDataToDisplay (online):', {
        source: devotions?.length > 0 ? 'API' : 'cached',
        count: result.devotions?.length ?? 0,
      });
      console.log('[Home] Course - getDataToDisplay (online):', {
        source: courses?.length > 0 ? 'API' : 'cached',
        count: result.courses?.length ?? 0,
      });
    }
    return result;
>>>>>>> 73ad21f43c16ca57af1f75217762294f97a0253e
  };

  const {devotions: devotionsToDisplay, courses: coursesToDisplay} =
    getDataToDisplay();
<<<<<<< HEAD
=======
  const devotionToDisplay = selectedDevotion || devotionsToDisplay[0];

  // [DEVOTION FLOW] 4. Final display values
  console.log('[Home] Devotion - Display:', {
    devotionToDisplay: devotionToDisplay
      ? {
          id: devotionToDisplay._id,
          month: devotionToDisplay.month,
          day: devotionToDisplay.day,
        }
      : null,
    devotionsToDisplayCount: devotionsToDisplay?.length ?? 0,
  });

  // [COURSE FLOW] 4. Final display values
  const lastCourse = coursesToDisplay ? coursesToDisplay[0] : null;
  console.log('[Home] Course - Display:', {
    lastCourse: lastCourse
      ? {id: lastCourse._id, title: lastCourse.title}
      : null,
    coursesToDisplayCount: coursesToDisplay?.length ?? 0,
  });

  const fetchData = useCallback(async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      setIsOffline(true);
      console.log('[Home] fetchData - Offline, loading cached data');
      // Load cached data when offline
      const cached = await loadCachedData();
      if (
        cached &&
        (cached.devotions?.length > 0 || cached.courses?.length > 0)
      ) {
        console.log('[Home] fetchData - Using cached data (offline):', {
          devotions: cached.devotions?.length ?? 0,
          courses: cached.courses?.length ?? 0,
        });
        Toast.show({
          type: 'info',
          text1: 'Offline Mode',
          text2: 'Showing cached data. Connect to internet for updates.',
        });
        setHasError(false);
        setIsLoading(false);
        return;
      } else {
        Toast.show({
          type: 'error',
          text1: 'No Cached Data',
          text2: 'Please connect to the internet to load data.',
        });
        setHasError(true);
        setIsLoading(false);
        return;
      }
    }

    try {
      setIsLoading(true);
      setHasError(false);
      setIsOffline(false);
>>>>>>> 73ad21f43c16ca57af1f75217762294f97a0253e

  // Ensure devotionsToDisplay is always an array
  const safeDevotionsToDisplay = Array.isArray(devotionsToDisplay)
    ? devotionsToDisplay
    : [];

<<<<<<< HEAD
  // API already returns only 2018 devotions, no need to filter
  const filteredDevotionsToDisplay = safeDevotionsToDisplay;
=======
      console.log('[Home] Devotion - Refetched (fetchData):', {
        count: devotionsData?.data?.length ?? 0,
        data: devotionsData?.data,
      });
      console.log('[Home] Course - Refetched (fetchData):', {
        count: coursesData?.data?.length ?? 0,
        data: coursesData?.data,
      });

      // Update Redux store
      dispatch(setDevotions(devotionsData.data));
      dispatch(setCourses(coursesData.data));
>>>>>>> 73ad21f43c16ca57af1f75217762294f97a0253e

  const devotionToDisplay = selectedDevotion || filteredDevotionsToDisplay[0];

<<<<<<< HEAD
  // Debug logging
  useEffect(() => {
    console.log('=== HOME DEVOTION DEBUG ===');
    console.log('currentMonth:', currentEthiopianMonth);
    console.log('ethDay:', ethDay);
    console.log('devotions from API (current month):', devotions?.length || 0);
    console.log('cachedData.devotions:', cachedData.devotions?.length || 0);
    console.log('selectedDevotion:', selectedDevotion ? 'YES' : 'NO');
    console.log('devotionToDisplay:', devotionToDisplay ? 'YES' : 'NO');
    console.log('==========================');
=======
      if (devotionToDisplay) {
        scheduleVerseOfTheDayNotification(devotionToDisplay.verse);
      }
    } catch (e) {
      console.error('[Home] fetchData - Fetch error:', e);
      // Try to load cached data if network request fails
      const cached = await loadCachedData();
      if (
        cached &&
        (cached.devotions?.length > 0 || cached.courses?.length > 0)
      ) {
        console.log(
          '[Home] fetchData - Network error, using cached fallback:',
          {
            devotions: cached.devotions?.length ?? 0,
            courses: cached.courses?.length ?? 0,
          },
        );
        Toast.show({
          type: 'info',
          text1: 'Network Error',
          text2: 'Showing cached data. Please check your connection.',
        });
        setHasError(false);
      } else {
        setHasError(true);
      }
    } finally {
      setIsLoading(false);
    }
>>>>>>> 73ad21f43c16ca57af1f75217762294f97a0253e
  }, [
    devotions,
    cachedData,
    selectedDevotion,
    devotionToDisplay,
    currentEthiopianMonth,
    ethDay,
  ]);

  const fetchData = useCallback(
    async (opts = {background: false, forceRefresh: false}) => {
      try {
        if (opts.background) {
          setIsBackgroundRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setHasError(false);
        setIsOffline(false);

        // Check network connectivity first
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          setIsOffline(true);
          // If force refresh and offline, show error
          if (opts.forceRefresh) {
            setHasError(true);
            setIsLoading(false);
            Toast.show({
              type: 'error',
              text1: 'No Internet Connection',
              text2: 'Please connect to the internet to reload.',
            });
            return;
          }
          const cached = await loadCachedData();
          if (
            cached &&
            (cached.devotions?.length > 0 || cached.courses?.length > 0)
          ) {
            setHasError(false);
            setIsLoading(false);
            return;
          } else {
            setHasError(true);
            setIsLoading(false);
            return;
          }
        }

        // If force refresh, invalidate RTK Query cache first
        if (opts.forceRefresh) {
          console.log('Force refresh: clearing ALL caches');
          // Clear AsyncStorage cache
          await AsyncStorage.removeItem(CACHE_KEY);
          setCachedData({devotions: [], courses: [], lastCacheTime: null});

          // Invalidate RTK Query cache to force fresh fetch
          dispatch(apiSlice.util.invalidateTags(['Devotions', 'Courses']));

          // Wait a bit for cache invalidation
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Fetch data with timeout - longer timeout for Android
        const fetchWithTimeout = (promise, timeout = 30000) => {
          return Promise.race([
            promise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Request timeout')), timeout),
            ),
          ]);
        };

        console.log('Fetching devotions and courses...');
        // Fetch devotions and courses separately to handle timeouts better
        let devotionsData = null;
        let coursesData = null;

        try {
          // Don't wrap in fetchWithTimeout - let RTK Query handle its own timeout
          devotionsData = await refetchDevotions();

          console.log('Devotions refetch result:', {
            data: devotionsData?.data?.length || 0,
            error: devotionsData?.error,
            isError: devotionsData?.isError,
          });

          // Check if the fetch failed (error or no data)
          if (
            devotionsData?.isError ||
            devotionsData?.error ||
            !devotionsData?.data
          ) {
            throw new Error(devotionsData?.error?.message || 'Fetch failed');
          }
        } catch (e) {
          console.warn('Devotions fetch failed:', e.message || e);
          // Try to use cached data if fetch fails
          if (cachedData.devotions?.length > 0) {
            console.log(
              'Using cached devotions data:',
              cachedData.devotions.length,
            );
            devotionsData = {data: cachedData.devotions};
          } else if (persistedDevotions?.length > 0) {
            console.log(
              'Using persisted devotions data:',
              persistedDevotions.length,
            );
            devotionsData = {data: persistedDevotions};
          } else {
            console.warn(
              'No devotions data available from cache or persistence',
            );
            devotionsData = null;
          }
        }

        try {
          // Don't wrap in fetchWithTimeout - let RTK Query handle its own timeout
          coursesData = await refetchCourses();

          console.log('Courses refetch result:', {
            data: coursesData?.data?.length || 0,
            error: coursesData?.error,
            isError: coursesData?.isError,
          });

          // Check if the fetch failed (error or no data)
          if (
            coursesData?.isError ||
            coursesData?.error ||
            !coursesData?.data
          ) {
            throw new Error(coursesData?.error?.message || 'Fetch failed');
          }
        } catch (e) {
          console.warn('Courses fetch failed:', e.message || e);
          // Try to use cached data if fetch fails
          if (cachedData.courses?.length > 0) {
            console.log(
              'Using cached courses data:',
              cachedData.courses.length,
            );
            coursesData = {data: cachedData.courses};
          } else if (persistedCourses?.length > 0) {
            console.log(
              'Using persisted courses data:',
              persistedCourses.length,
            );
            coursesData = {data: persistedCourses};
          } else {
            coursesData = null;
          }
        }
        console.log(
          'Fetch complete. Devotions:',
          devotionsData?.data?.length || 0,
          'Courses:',
          coursesData?.data?.length || 0,
        );

        // Update Redux store with detailed logging
        console.log('Updating Redux store...');
        if (devotionsData?.data && Array.isArray(devotionsData.data)) {
          console.log(
            'Dispatching',
            devotionsData.data.length,
            'devotions to Redux',
          );
          dispatch(setDevotions(devotionsData.data));
        } else {
          console.warn('No devotion data to dispatch:', devotionsData);
          // If no new data but we have cached data, use that
          if (cachedData.devotions?.length > 0) {
            console.log('Using cached devotions data');
            dispatch(setDevotions(cachedData.devotions));
          }
        }

        if (coursesData?.data && Array.isArray(coursesData.data)) {
          console.log(
            'Dispatching',
            coursesData.data.length,
            'courses to Redux',
          );
          dispatch(setCourses(coursesData.data));
        } else {
          console.warn('No course data to dispatch:', coursesData);
          // If no new data but we have cached data, use that
          if (cachedData.courses?.length > 0) {
            console.log('Using cached courses data');
            dispatch(setCourses(cachedData.courses));
          }
        }

        // Save to cache (non-blocking) - only if we got new data
        if (devotionsData?.data || coursesData?.data) {
          console.log('Saving to cache...');
          saveCachedData(devotionsData?.data, coursesData?.data).catch(
            console.error,
          );
        }

        // Prefetch images for faster subsequent loads
        prefetchImages(
          (devotionsData?.data || [])
            .map(d => d.image)
            .concat((coursesData?.data || []).map(c => c.image)),
        ).catch(() => {});

        // Show success toast on force refresh
        if (opts.forceRefresh) {
          const devotionCount = devotionsData?.data?.length || 0;
          const courseCount = coursesData?.data?.length || 0;
          Toast.show({
            type: 'success',
            text1: 'Data Refreshed',
            text2: `Loaded ${devotionCount} devotions and ${courseCount} courses`,
          });
        }

        console.log('Fetch complete and state updated');
      } catch (e) {
        console.error('Fetch error:', e);
        // On force refresh, don't fall back to cache - show error
        if (opts.forceRefresh) {
          setHasError(true);
          Toast.show({
            type: 'error',
            text1: 'Refresh Failed',
            text2: 'Unable to fetch new data. Please try again.',
          });
        } else {
          // Try to load cached data if network request fails
          await loadCachedData();
          // Don't set error if cache exists - UI will show cached data
          setHasError(false);
        }
      } finally {
        if (opts.background) {
          setIsBackgroundRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [
      refetchDevotions,
      refetchCourses,
      dispatch,
      loadCachedData,
      saveCachedData,
      CACHE_KEY,
    ],
  );

  // Animation effects
  useEffect(() => {
    if (!isLoading) {
      // Start animations when data is loaded
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Sparkle animation loop
      const sparkleAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      );
      sparkleAnimation.start();
    }
  }, [isLoading, fadeAnim, slideAnim, scaleAnim, sparkleAnim]);

  // Load cached data on app start
  useEffect(() => {
    const initializeApp = async () => {
<<<<<<< HEAD
      try {
        // First, try to load cached data immediately
        const cached = await loadCachedData();
        if (
          cached &&
          (cached.devotions?.length > 0 || cached.courses?.length > 0)
        ) {
          setIsLoading(false);
          // Fetch fresh data in background without blocking UI
          setTimeout(() => {
            fetchData({background: true}).catch(console.error);
          }, 100);
        } else {
          // No cached data, fetch from network
          fetchData();
        }
      } catch (error) {
        console.error('Initialization error:', error);
=======
      console.log('[Home] Initialize - Loading cached data...');
      // First, try to load cached data
      const cached = await loadCachedData();
      if (
        cached &&
        (cached.devotions?.length > 0 || cached.courses?.length > 0)
      ) {
        console.log('[Home] Initialize - Cache hit, checking network...');
        setIsLoading(false);
        // Check internet connection and fetch fresh data in background
        const netInfo = await NetInfo.fetch();
        if (netInfo.isConnected) {
          console.log('[Home] Initialize - Online, fetching fresh data');
          fetchData();
        } else {
          console.log('[Home] Initialize - Offline, using cached data');
          setIsOffline(true);
        }
      } else {
        console.log('[Home] Initialize - No cache, fetching from network');
        // No cached data, must fetch from network
>>>>>>> 73ad21f43c16ca57af1f75217762294f97a0253e
        fetchData();
      }
    };

    initializeApp();
  }, [fetchData, loadCachedData]);

  const onRefresh = useCallback(async () => {
<<<<<<< HEAD
    // Pull to refresh uses force refresh (clears cache and fetches fresh)
    await fetchData({forceRefresh: true});
  }, [fetchData]);
=======
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Toast.show({
        type: 'info',
        text1: 'Internet Connection Required',
        text2: 'Please connect to the internet to reload data.',
      });
      return;
    }

    try {
      setIsRefreshing(true);
      setHasError(false);
      setIsOffline(false);

      const [devotionsData, coursesData] = await Promise.all([
        refetchDevotions(),
        refetchCourses(),
      ]);

      console.log('[Home] Devotion - Refetched (onRefresh):', {
        count: devotionsData?.data?.length ?? 0,
      });
      console.log('[Home] Course - Refetched (onRefresh):', {
        count: coursesData?.data?.length ?? 0,
      });

      // Update Redux store
      dispatch(setDevotions(devotionsData.data));
      dispatch(setCourses(coursesData.data));

      // Save to cache
      await saveCachedData(devotionsData.data, coursesData.data);

      Toast.show({
        type: 'success',
        text1: 'Data Updated',
        text2: 'Latest content has been loaded and cached.',
      });
    } catch (e) {
      console.error('Refresh error:', e);
      setHasError(true);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Unable to refresh data. Please try again.',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchDevotions, refetchCourses, dispatch, saveCachedData]);
>>>>>>> 73ad21f43c16ca57af1f75217762294f97a0253e

  if (isLoading) {
    return (
      <SafeAreaView
        style={darkMode ? tw`bg-secondary-9 h-screen flex-1` : tw`flex-1`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          {/* Animated Loading Container */}
          <Animated.View
            style={[
              tw`items-center`,
              {
                transform: [
                  {
                    scale: scaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.1],
                    }),
                  },
                ],
              },
            ]}>
            {/* Glowing Circle Background */}
            <View
              style={[
                tw`w-32 h-32 rounded-full items-center justify-center mb-6`,
                {
                  backgroundColor: darkMode ? '#1F2937' : '#F3F4F6',
                  shadowColor: '#EA9215',
                  shadowOffset: {width: 0, height: 0},
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 10,
                },
              ]}>
              <BookOpen size={48} color="#EA9215" weight="bold" />
              <ActivityIndicator
                size="large"
                color="#EA9215"
                style={tw`absolute`}
              />
            </View>

            {/* Loading Text with Gradient Effect */}
            <Text
              style={[
                tw`font-nokia-bold text-xl text-center mb-2`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Loading...
            </Text>
            <Text
              style={[
                tw`font-nokia-bold text-sm text-center opacity-70`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              {isOffline
                ? 'Working offline with saved content'
                : 'Loading devotionals and courses...'}
            </Text>

            {/* Animated Dots */}
            <View style={tw`flex-row mt-4 gap-2`}>
              {[0, 1, 2].map(index => (
                <Animated.View
                  key={index}
                  style={[
                    tw`w-2 h-2 bg-accent-6 rounded-full`,
                    {
                      opacity: sparkleAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 1, 0.3],
                      }),
                      transform: [
                        {
                          scale: sparkleAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.8, 1.2, 0.8],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // No full-screen errors - always show Home layout with inline error cards per section

<<<<<<< HEAD
  // Determine course to show: last visited, then started, else latest published
  const publishedCourses = coursesToDisplay
    ? coursesToDisplay.filter(c => c.published)
    : [];

  const courseById = id =>
    (coursesToDisplay || []).find(c => String(c._id) === String(id));
  const lastVisitedCourse = lastVisitedCourseId
    ? courseById(lastVisitedCourseId)
    : null;
  const startedCourse = startedCourseIds.map(courseById).find(Boolean) || null;
  const latestPublished = publishedCourses[publishedCourses.length - 1];
  const courseToFeature =
    lastVisitedCourse || startedCourse || latestPublished || null;

=======
>>>>>>> 73ad21f43c16ca57af1f75217762294f97a0253e
  return (
    <View style={darkMode ? tw`bg-secondary-9 flex-1` : tw`flex-1`}>
      <SafeAreaView style={tw`flex mx-auto w-11/12`}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={onRefresh}
              colors={['#EA9215']}
              tintColor={'#EA9215'}
            />
          }>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            }}>
            <Header
              darkMode={darkMode}
              navigation={navigation}
              isRefreshing={isBackgroundRefreshing}
            />

            {/* Enhanced Welcome Section */}
            {user && (
              <Animated.View
                style={[
                  tw`mb-6 p-4 rounded-2xl`,
                  {
                    backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                    transform: [{scale: scaleAnim}],
                  },
                ]}>
                <View style={tw`flex-row items-center justify-between`}>
                  <View style={tw`flex-1`}>
                    <Text
                      style={[
                        tw`font-nokia-bold text-2xl mb-1`,
                        darkMode ? tw`text-accent-6` : tw`text-secondary-8`,
                      ]}>
                      Welcome back, {user.firstName}!
                    </Text>
                    <Text
                      style={[
                        tw`font-nokia-bold text-sm opacity-70`,
                        darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                      ]}>
                      ዛሬም ከቃሉ ጋር ትንሽ ጊዜ ይውሰዱ
                    </Text>
                  </View>
                  <View>
                    <Cross size={32} color="#EA9215" weight="fill" />
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Today's Devotion with Enhanced Card */}
            <View style={tw`mb-4`}>
              <View style={tw`flex-row items-center mb-3 justify-between`}>
                <View style={tw`flex-row items-center`}>
                  <Calendar size={24} color="#EA9215" weight="bold" />
                  <Text
                    style={[
                      tw`font-nokia-bold text-lg ml-2`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}>
                    የዕለቱ የጥሞና ምንባብ
                  </Text>
                </View>
                <TouchableOpacity
                  style={tw`px-3 py-1 rounded-full border border-accent-6`}
                  onPress={() => fetchData({forceRefresh: true})}>
                  <Text style={tw`font-nokia-bold text-accent-6 text-xs`}>
                    Reload
                  </Text>
                </TouchableOpacity>
              </View>
              {devotionToDisplay ? (
                <Animated.View
                  style={{
                    transform: [{scale: scaleAnim}],
                  }}>
                  <DevotionCard
                    devotion={devotionToDisplay}
                    darkMode={darkMode}
                    navigation={navigation}
                  />
                </Animated.View>
              ) : (
                <View
                  style={[
                    tw`border border-accent-6 rounded-4 p-6`,
                    darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
                  ]}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-center mb-3`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}>
                    No Devotional Available
                  </Text>
                  <Text
                    style={[
                      tw`font-nokia-bold text-xs text-center mb-4`,
                      darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                    ]}>
                    Unable to load today's devotional. Check your connection.
                  </Text>
                  <TouchableOpacity
                    style={tw`self-center px-4 py-2 rounded-full bg-accent-6`}
                    onPress={() => fetchData({forceRefresh: true})}>
                    <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>
                      Try Again
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {/* Enhanced Section Divider with Cross */}
            <View style={tw`flex-row items-center my-6`}>
              <View style={tw`flex-1 h-px bg-primary-7 opacity-30`} />
              <Animated.View
                style={[
                  tw`p-3 rounded-full`,
                  {
                    backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                    opacity: sparkleAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.6, 1, 0.6],
                    }),
                    transform: [
                      {
                        scale: sparkleAnim.interpolate({
                          inputRange: [0, 0.25, 0.5, 0.75, 1],
                          outputRange: [1, 1.1, 1.2, 1.1, 1],
                        }),
                      },
                    ],
                    shadowColor: '#374151',
                    shadowOffset: {width: 0, height: 0},
                    shadowOpacity: sparkleAnim.interpolate({
                      inputRange: [0, 0.25, 5],
                      outputRange: [0.2, 0.4, 0.2],
                    }),
                    shadowRadius: sparkleAnim.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [4, 12, 4],
                    }),
                    elevation: 10,
                  },
                ]}>
                <Cross size={18} color="#EA9215" weight="bold" />
              </Animated.View>
              <View style={tw`flex-1 h-px bg-primary-7 opacity-30`} />
            </View>

            {/* Enhanced Continue Learning Section */}
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
                    ማጥናት ይቀጥሉ
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    tw`px-4 py-2 rounded-full flex-row items-center`,
                    {backgroundColor: '#EA9215'},
                  ]}
                  onPress={() =>
                    navigation.navigate('Course', {screen: 'CourseHome'})
                  }>
                  <Text style={tw`font-nokia-bold text-primary-1 text-sm mr-1`}>
                    ሁሉም ኮርሶች
                  </Text>
                  <BookOpen size={14} color="#FFFFFF" weight="bold" />
                </TouchableOpacity>
              </View>
            </Animated.View>
            {courseToFeature && (
              <Animated.View
                style={{
                  transform: [{scale: scaleAnim}],
                }}>
                <CourseCard
                  course={courseToFeature}
                  darkMode={darkMode}
                  handleButtonPress={handleButtonPress}
                />
              </Animated.View>
            )}

            {/* Enhanced Section Divider with Bible */}
            <View style={tw`flex-row items-center my-6`}>
              <View style={tw`flex-1 h-px bg-primary-7 opacity-30`} />
              <Animated.View
                style={[
                  tw`p-3 rounded-full`,
                  {
                    backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                    opacity: sparkleAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.6, 1, 0.6],
                    }),
                    transform: [
                      {
                        scale: sparkleAnim.interpolate({
                          inputRange: [0, 0.25, 0.5, 0.75, 1],
                          outputRange: [1, 1.1, 1.2, 1.1, 1],
                        }),
                      },
                    ],
                    shadowColor: '#374151',
                    shadowOffset: {width: 0, height: 0},
                    shadowOpacity: sparkleAnim.interpolate({
                      inputRange: [0, 0.25, 5],
                      outputRange: [0.2, 0.4, 0.2],
                    }),
                    shadowRadius: sparkleAnim.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [4, 12, 4],
                    }),
                    elevation: 10,
                  },
                ]}>
                <Cross size={18} color="#EA9215" weight="bold" />
              </Animated.View>
              <View style={tw`flex-1 h-px bg-primary-7 opacity-30`} />
            </View>

            {/* Enhanced Sabbath School Section */}
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
                  <Calendar size={24} color="#EA9215" weight="bold" />
                  <Text
                    style={[
                      tw`font-nokia-bold text-lg ml-3`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}>
                    ሰንበት ትምህርት
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    tw`px-4 py-2 rounded-full flex-row items-center`,
                    {backgroundColor: '#EA9215'},
                  ]}
                  onPress={() =>
                    navigation.navigate('SSL', {screen: 'SSLHome'})
                  }>
                  <Text style={tw`font-nokia-bold text-primary-1 text-sm mr-1`}>
                    All SSLs
                  </Text>
                  {/* <Calendar size={14} color="#FFFFFF" weight="bold" /> */}
                </TouchableOpacity>
              </View>
            </Animated.View>
            <Animated.View
              style={{
                transform: [{scale: scaleAnim}],
              }}>
              <HomeCurrentSSL />
            </Animated.View>

            {/* Enhanced Section Divider */}
            <View style={tw`flex-row items-center my-6`}>
              <View style={tw`flex-1 h-px bg-primary-7 opacity-30`} />
              <Animated.View
                style={[
                  tw`p-3 rounded-full`,
                  {
                    backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                    opacity: sparkleAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.6, 1, 0.6],
                    }),
                    transform: [
                      {
                        scale: sparkleAnim.interpolate({
                          inputRange: [0, 0.25, 0.5, 0.75, 1],
                          outputRange: [1, 1.1, 1.2, 1.1, 1],
                        }),
                      },
                    ],
                    shadowColor: '#374151',
                    shadowOffset: {width: 0, height: 0},
                    shadowOpacity: sparkleAnim.interpolate({
                      inputRange: [0, 0.25, 5],
                      outputRange: [0.2, 0.4, 0.2],
                    }),
                    shadowRadius: sparkleAnim.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [4, 12, 4],
                    }),
                    elevation: 10,
                  },
                ]}>
                <Cross size={18} color="#EA9215" weight="bold" />
              </Animated.View>
              <View style={tw`flex-1 h-px bg-primary-7 opacity-30`} />
            </View>

            {/* Devotion Plans Section - በእቅድ ያንብቡ */}
            {devotionPlans && devotionPlans.length > 0 && (
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
                    {devotionPlans
                      .filter(plan => plan && (plan._id || plan.id))
                      .map((plan, index) => {
                        const planId = plan._id || plan.id;
                        const isStarted =
                          myDevotionPlans.some(
                            p => (p.planId || p.plan?._id) === planId,
                          ) ||
                          completedPlans.some(
                            p => (p.planId || p.plan?._id) === planId,
                          );
                        return (
                          <DevotionPlanSquareCard
                            key={planId || index}
                            plan={plan}
                            darkMode={darkMode}
                            isStarted={isStarted}
                          onPress={pressedPlan => {
                            const pressedPlanId = pressedPlan._id || pressedPlan.id;
                            if (isStarted) {
                              // If plan is already started, navigate directly
                              navigation.navigate('Devotional', {
                                screen: 'PlanDevotionViewer',
                                params: {planId: pressedPlanId},
                              });
                            } else {
                              // If plan is not started, show modal
                              setSelectedPlan(pressedPlan);
                              setShowStartPlanModal(true);
                            }
                          }}
                          />
                        );
                      })}
                  </ScrollView>
                </Animated.View>
              </>
            )}

            {/* Enhanced Section Divider with Cross & Light */}
            <View style={tw`flex-row items-center my-6`}>
              <View style={tw`flex-1 h-px bg-primary-7 opacity-30`} />
              <Animated.View
                style={[
                  tw`p-3 rounded-full`,
                  {
                    backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                    opacity: sparkleAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.6, 1, 0.6],
                    }),
                    transform: [
                      {
                        scale: sparkleAnim.interpolate({
                          inputRange: [0, 0.25, 0.5, 0.75, 1],
                          outputRange: [1, 1.1, 1.2, 1.1, 1],
                        }),
                      },
                    ],
                    shadowColor: '#374151',
                    shadowOffset: {width: 0, height: 0},
                    shadowOpacity: sparkleAnim.interpolate({
                      inputRange: [0, 0.25, 5],
                      outputRange: [0.2, 0.4, 0.2],
                    }),
                    shadowRadius: sparkleAnim.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [4, 12, 4],
                    }),
                    elevation: 10,
                  },
                ]}>
                <Cross size={18} color="#EA9215" weight="bold" />
              </Animated.View>
              <View style={tw`flex-1 h-px bg-primary-7 opacity-30`} />
            </View>

            {/* Enhanced Discover Devotionals Section */}
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
                  <Book size={24} color="#EA9215" weight="bold" />
                  <Text
                    style={[
                      tw`font-nokia-bold text-lg ml-3`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}>
                    የጥሞና ምንባብ
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    tw`px-4 py-2 rounded-full flex-row items-center`,
                    {backgroundColor: '#EA9215'},
                  ]}
                  onPress={() =>
                    navigation.navigate('Devotional', {
                      screen: 'AllDevotionals',
                    })
                  }>
                  <Text style={tw`font-nokia-bold text-primary-1 text-sm mr-1`}>
                    All Devotionals
                  </Text>
                  {/* <Book size={14} color="#FFFFFF" weight="bold" /> */}
                </TouchableOpacity>
              </View>
            </Animated.View>

            {safeDevotionsToDisplay.length > 0 && (
              <Animated.View
                style={{
                  transform: [{scale: scaleAnim}],
                }}>
                <PreviousDevotions
                  devotions={filteredDevotionsToDisplay}
                  darkMode={darkMode}
                  currentYear={yearToFetch}
                />
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

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
                error?.data?.message ||
                error?.message ||
                'Please try again.',
            });
          }
        }}
      />
    </View>
  );
};

export default Home;
