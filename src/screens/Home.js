import React, {useState, useCallback, useEffect, useRef} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import {
  useGetDevotionsQuery,
  useGetPublishedCoursesQuery,
} from '../redux/api-slices/apiSlice';
import HomeCurrentSSL from './SSLScreens/HomeCurrentSSL';
import PreviousDevotions from './DevotionScreens/PreviousDevotions';
import {toEthiopian} from 'ethiopian-date';
import NetInfo from '@react-native-community/netinfo';
import DevotionCard from '../components/DevotionCard';
import CourseCard from '../components/CourseCard';
import Header from '../components/Header';
import {setDevotions} from '../redux/devotionsSlice';
import {setCourses} from '../redux/courseSlice';
import {scheduleVerseOfTheDayNotification} from '../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  const {
    data: devotions = [],
    isFetching,
    refetch: refetchDevotions,
    error: devotionsError,
  } = useGetDevotionsQuery({limit: 5});

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
          console.log('[Home] Devotion - Loaded from cache:', {
            count: cached.devotions?.length ?? 0,
            lastCacheTime: cached.lastCacheTime,
          });
          console.log('[Home] Course - Loaded from cache:', {
            count: cached.courses?.length ?? 0,
            lastCacheTime: cached.lastCacheTime,
          });
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
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setCachedData(cacheData);
      console.log('[Home] Devotion - Saved to cache:', {
        count: cacheData.devotions?.length ?? 0,
      });
      console.log('[Home] Course - Saved to cache:', {
        count: cacheData.courses?.length ?? 0,
      });
    } catch (error) {
      console.error('Error saving cached data:', error);
    }
  }, []);

  const handleButtonPress = id => {
    navigation.navigate('Course', {
      screen: 'CourseContent',
      params: {courseId: id},
    });
  };

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
      const today = new Date();
      const ethiopianDate = toEthiopian(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate(),
      );
      const [year, month, day] = ethiopianDate;
      const ethiopianMonth = ethiopianMonths[month];
      const todaysDevotion = devotionsToUse.find(
        devotion =>
          devotion.month === ethiopianMonth && Number(devotion.day) === day,
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
  }, [devotions, isOffline, persistedDevotions, cachedData.devotions]);

  const getDataToDisplay = () => {
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
  };

  const {devotions: devotionsToDisplay, courses: coursesToDisplay} =
    getDataToDisplay();
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

      const [devotionsData, coursesData] = await Promise.all([
        refetchDevotions(),
        refetchCourses(),
      ]);

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

      // Save to cache
      await saveCachedData(devotionsData.data, coursesData.data);

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
  }, [
    refetchDevotions,
    refetchCourses,
    dispatch,
    devotionToDisplay,
    loadCachedData,
    saveCachedData,
  ]);

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
        fetchData();
      }
    };

    initializeApp();
  }, [fetchData, loadCachedData]);

  const onRefresh = useCallback(async () => {
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
              {isOffline ? 'Loading cached data...' : 'ትምህርቶችን በማውረድ ላይ...'}
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

  if (hasError && (!devotionsToDisplay || devotionsToDisplay.length === 0)) {
    return (
      <SafeAreaView
        style={darkMode ? tw`bg-secondary-9 h-screen flex-1` : tw`flex-1`}>
        <View style={tw`flex-1 justify-center items-center px-4`}>
          <Text
            style={tw`font-nokia-bold text-lg text-accent-6 text-center mb-4`}>
            No Data Available
          </Text>
          <Text style={tw`font-nokia-bold text-secondary-6 text-center mb-4`}>
            Please connect to the internet to load content.
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-lg`}
            onPress={fetchData}>
            <Text style={tw`font-nokia-bold text-primary-1`}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!devotionsToDisplay || devotionsToDisplay.length === 0) {
    return (
      <SafeAreaView
        style={darkMode ? tw`bg-secondary-9 h-screen flex-1` : tw`flex-1`}>
        <ActivityIndicator size="large" color="#EA9215" style={tw`mt-20`} />
        <Text style={tw`font-nokia-bold text-lg text-accent-6 text-center`}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

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
            <Header darkMode={darkMode} navigation={navigation} />

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
            {devotionToDisplay && (
              <Animated.View
                style={{
                  transform: [{scale: scaleAnim}],
                }}>
                <View style={tw`mb-4`}>
                  <View style={tw`flex-row items-center mb-3`}>
                    <Calendar size={24} color="#EA9215" weight="bold" />
                    <Text
                      style={[
                        tw`font-nokia-bold text-lg ml-2`,
                        darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                      ]}>
                      የዕለቱ የጥሞና ምንባብ
                    </Text>
                  </View>
                </View>
                <DevotionCard
                  devotion={devotionToDisplay}
                  darkMode={darkMode}
                  navigation={navigation}
                />
              </Animated.View>
            )}
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
            {lastCourse && (
              <Animated.View
                style={{
                  transform: [{scale: scaleAnim}],
                }}>
                <CourseCard
                  course={lastCourse}
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
                  onPress={() => navigation.navigate('SSLHome')}>
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

            {devotionsToDisplay.length > 0 && (
              <Animated.View
                style={{
                  transform: [{scale: scaleAnim}],
                }}>
                <PreviousDevotions
                  devotions={devotionsToDisplay}
                  darkMode={darkMode}
                />
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Home;
