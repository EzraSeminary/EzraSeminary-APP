import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import {
  CaretCircleDown,
  BookOpen,
  MagnifyingGlass,
  Compass,
  ArrowRight,
} from 'phosphor-react-native';
import tw from './../../tailwind';
import {
  apiSlice,
  useGetPublishedCoursesQuery,
} from './../redux/api-slices/apiSlice';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import ErrorScreen from '../components/ErrorScreen';
import LinearGradient from 'react-native-linear-gradient';
import Explore from './Explore';
import {getCachedCourseList, saveCourseListToCache} from '../utils/courseCache';
import {getOptimizedImageUrl} from '../utils/imageCache';
import {ensureOnlineOrNotify} from '../utils/refreshCacheManager';
import {
  saveHomeScreenToCache,
  getCachedHomeScreen,
} from '../utils/homeScreenCache';
import networkManager from '../utils/networkManager';
import AndroidStatusBarSpacer from '../components/AndroidStatusBarSpacer';

// Tab Switcher Component - matching Devotion screen style
const TabSwitcher = ({activeTab, setActiveTab, darkMode}) => (
  <View style={tw`flex-row items-center justify-center my-4`}>
    <View
      style={[
        tw`flex-row p-1 rounded-full`,
        {
          backgroundColor: darkMode ? '#374151' : '#E5E7EB',
        },
      ]}>
      <TouchableOpacity
        onPress={() => setActiveTab('course')}
        style={[
          tw`px-4 py-2 rounded-full`,
          {
            backgroundColor: activeTab === 'course' ? '#EA9215' : 'transparent',
          },
        ]}>
        <Text
          style={[
            tw`font-nokia-bold text-sm`,
            {
              color:
                activeTab === 'course'
                  ? '#FFFFFF'
                  : darkMode
                  ? '#D1D5DB'
                  : '#4B5563',
            },
          ]}>
          Course
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setActiveTab('explore')}
        style={[
          tw`px-4 py-2 rounded-full`,
          {
            backgroundColor:
              activeTab === 'explore' ? '#EA9215' : 'transparent',
          },
        ]}>
        <Text
          style={[
            tw`font-nokia-bold text-sm`,
            {
              color:
                activeTab === 'explore'
                  ? '#FFFFFF'
                  : darkMode
                  ? '#D1D5DB'
                  : '#4B5563',
            },
          ]}>
          Explore
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

const Course = () => {
  const PAGE_SIZE = 4;
  const [activeTab, setActiveTab] = useState('course'); // 'course' or 'explore'
  const [page, setPage] = useState(1);
  const [pagedCourses, setPagedCourses] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const {
    data: apiCoursesBatch,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetPublishedCoursesQuery({
    limit: PAGE_SIZE,
    sort: 'desc',
    page,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortByLatest, setSortByLatest] = useState(false);
  const [cachedCourses, setCachedCourses] = useState([]);
  const dispatch = useDispatch();
  const darkMode = useSelector(state => state.ui.darkMode);
  const navigation = useNavigation();
  const currentUser = useSelector(state => state.auth.user);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const loadMoreLockRef = useRef(false);

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

      return () => sparkleAnimation.stop();
    }
  }, [isLoading, fadeAnim, slideAnim, scaleAnim, sparkleAnim]);

  useEffect(() => {
    const loadCachedCourses = async () => {
      const cached = await getCachedCourseList({allowExpired: true});
      if (cached.length > 0) {
        setCachedCourses(cached);
        return;
      }

      const cachedHome = await getCachedHomeScreen('Course');
      if (Array.isArray(cachedHome?.courses) && cachedHome.courses.length > 0) {
        setCachedCourses(cachedHome.courses);
      }
    };
    loadCachedCourses();
  }, []);

  useEffect(() => {
    const batch = Array.isArray(apiCoursesBatch) ? apiCoursesBatch : [];
    if (page === 1) {
      setPagedCourses(batch);
    } else if (batch.length > 0) {
      setPagedCourses(prev => {
        const seen = new Set(prev.map(course => course?._id));
        const nextItems = batch.filter(course => !seen.has(course?._id));
        return [...prev, ...nextItems];
      });
    }

    setHasMore(batch.length === PAGE_SIZE);
    setIsLoadingMore(false);
    loadMoreLockRef.current = false;
  }, [apiCoursesBatch, page]);

  useEffect(() => {
    if (Array.isArray(pagedCourses) && pagedCourses.length > 0) {
      setCachedCourses(pagedCourses);
      saveCourseListToCache(pagedCourses);
      if (networkManager.isOnline) {
        saveHomeScreenToCache('Course', {
          courses: pagedCourses,
          lastCacheTime: new Date().toISOString(),
        });
      }
    }
  }, [pagedCourses]);

  const courses =
    Array.isArray(pagedCourses) && pagedCourses.length > 0
      ? pagedCourses
      : cachedCourses;

  const onRefresh = useCallback(async () => {
    const hasInternet = await ensureOnlineOrNotify();
    if (!hasInternet) {
      setIsRefreshing(false);
      return;
    }
    try {
      setIsRefreshing(true);
      setHasMore(true);
      setIsLoadingMore(false);
      setPage(1);
      dispatch(apiSlice.util.invalidateTags(['Courses']));
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, refetch]);

  const handleSearch = text => {
    setSearchTerm(text);
  };

  let filteredData = courses?.slice(); // Initialize filteredData as a copy of courses array

  if (courses) {
    filteredData = courses.filter(course => {
      if (currentUser && currentUser.role !== 'Learner') {
        return course.title.includes(searchTerm);
      } else {
        return course.title.includes(searchTerm) && course.published;
      }
    });

    // Sort the courses based on the sortByLatest flag
    if (!sortByLatest) {
      filteredData = [...filteredData].reverse();
    }
  }
  const filteredCount = Array.isArray(filteredData) ? filteredData.length : 0;

  const handleLoadMore = () => {
    if (!hasMore || isFetching || isLoadingMore || loadMoreLockRef.current) {
      return;
    }
    loadMoreLockRef.current = true;
    setIsLoadingMore(true);
    setPage(prev => prev + 1);
  };

  const handleCourseScroll = ({nativeEvent}) => {
    const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
    const paddingToBottom = 180;
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isNearBottom) {
      handleLoadMore();
    }
  };

  const handleButtonPress = id => {
    navigation.navigate('CourseContent', {courseId: id});
  };

  const toggleSortOrder = () => {
    setSortByLatest(prev => !prev);
  };

  const renderExploreSeparator = key => (
    <TouchableOpacity
      key={key}
      onPress={() => setActiveTab('explore')}
      activeOpacity={0.85}
      style={[
        tw`my-2 px-4 py-3 rounded-2xl flex-row items-center justify-between border`,
        {
          backgroundColor: darkMode ? '#1F2937' : '#FFF7ED',
          borderColor: '#EA9215',
        },
      ]}>
      <View style={tw`flex-row items-center flex-1 mr-3`}>
        <View
          style={[
            tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
            {backgroundColor: '#EA9215'},
          ]}>
          <Compass size={18} color="#FFFFFF" weight="fill" />
        </View>
        <View style={tw`flex-1`}>
          <Text
            style={[
              tw`font-nokia-bold text-base`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            More books and resources are in Explore
          </Text>
          <Text style={tw`font-nokia-bold text-accent-6 text-sm mt-1`}>
            Open Explore section
          </Text>
        </View>
      </View>
      <ArrowRight size={18} color="#EA9215" weight="bold" />
    </TouchableOpacity>
  );

  function getProgressValue(courseId) {
    const userProgress =
      currentUser &&
      currentUser.progress &&
      currentUser.progress.find(function (p) {
        return p.courseId === courseId;
      });

    const totalChapter = courses?.find(
      course => course._id === courseId,
    )?.chapterCount;

    //calculate the percentage
    if (userProgress && totalChapter) {
      const currentChapterCount = (userProgress.currentChapter ?? 0) + 1;
      const progressDecimal = currentChapterCount / totalChapter;
      const approximatedProgress = Math.round(progressDecimal * 100) / 100;
      return approximatedProgress;
    }
    return undefined;
  }

  if (isLoading && courses.length === 0) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : tw`h-100%`}>
        <ScrollView contentContainerStyle={tw`px-4 pt-4 pb-8`}>
          {[0, 1, 2, 3].map(item => (
            <View
              key={`course-skeleton-${item}`}
              style={[
                tw`rounded-3xl p-5 mb-4`,
                {backgroundColor: darkMode ? '#374151' : '#FFFFFF'},
              ]}>
              <View
                style={[
                  tw`h-44 rounded-2xl mb-4`,
                  {backgroundColor: darkMode ? '#4B5563' : '#E5E7EB'},
                ]}
              />
              <View
                style={[
                  tw`h-4 rounded-full mb-3 w-8/12`,
                  {backgroundColor: darkMode ? '#6B7280' : '#D1D5DB'},
                ]}
              />
              <View
                style={[
                  tw`h-4 rounded-full mb-3 w-10/12`,
                  {backgroundColor: darkMode ? '#6B7280' : '#D1D5DB'},
                ]}
              />
              <View
                style={[
                  tw`h-11 rounded-2xl mt-2`,
                  {backgroundColor: 'rgba(234, 146, 21, 0.35)'},
                ]}
              />
            </View>
          ))}
          <View style={tw`items-center mt-2`}>
            <ActivityIndicator size="small" color="#EA9215" />
            <Text style={tw`font-nokia-bold text-accent-6 text-sm mt-2`}>
              Loading courses...
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error && courses.length === 0) {
    return <ErrorScreen refetch={refetch} darkMode={darkMode} />;
  }

  // Render Explore content if explore tab is active
  if (activeTab === 'explore') {
    return (
      <View style={darkMode ? tw`bg-secondary-9` : null}>
        <SafeAreaView style={tw`flex mx-auto w-[92%]`}>
          <AndroidStatusBarSpacer minHeight={4} />
          <TabSwitcher
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            darkMode={darkMode}
          />
          <Explore />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={darkMode ? tw`bg-secondary-9 h-full` : null}>
      <SafeAreaView style={tw`flex mx-auto w-[92%]`}>
        <AndroidStatusBarSpacer minHeight={4} />
        <TabSwitcher
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={handleCourseScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }>
          <Animated.View
            style={[
              tw`mb-48`,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            {/* Enhanced Search Bar */}
            <Animated.View
              style={[
                tw`mb-6 px-5 py-2 rounded-full`,
                {
                  backgroundColor: darkMode ? '#374151' : '#FFFFFF',
                  shadowColor: darkMode ? '#000000' : '#EA9215',
                  shadowOffset: {width: 0, height: 2},
                  shadowOpacity: darkMode ? 0.1 : 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                  transform: [{scale: scaleAnim}],
                },
              ]}>
              <View style={tw`flex-row items-center`}>
                <View
                  style={[
                    tw`w-10 h-10 rounded-2xl items-center justify-center mr-4`,
                    {backgroundColor: 'rgba(234, 146, 21, 0.1)'},
                  ]}>
                  <MagnifyingGlass size={20} color="#EA9215" weight="bold" />
                </View>
                <TextInput
                  placeholder="ትምህርቶችን ፈልግ..."
                  value={searchTerm}
                  onChangeText={handleSearch}
                  style={[
                    tw`flex-1 font-nokia-bold text-lg`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}
                  placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
                />
              </View>
            </Animated.View>
            <View style={tw`flex flex-row justify-between mt-3 items-center`}>
              <Text style={tw`font-nokia-bold text-accent-6 text-lg`}>
                ተወዳጅ ትምህርቶች
              </Text>
              <TouchableOpacity
                style={tw`flex flex-row justify-between items-center gap-2`}
                onPress={toggleSortOrder}>
                <Text style={tw`font-nokia-bold text-accent-6 text-lg`}>
                  {sortByLatest ? 'የበፊት' : 'የቅርብ'}
                </Text>
                <CaretCircleDown size={24} weight="fill" color={'#EA9215'} />
              </TouchableOpacity>
            </View>
            {filteredCount > 0 ? (
              filteredData.flatMap((course, index) => {
                const progressValue = getProgressValue(course._id);
                const items = [
                  <Animated.View
                    style={[
                      tw`my-4 rounded-3xl overflow-hidden`,
                      {
                        backgroundColor: darkMode ? '#374151' : '#FFFFFF',
                        shadowColor: darkMode ? '#000000' : '#EA9215',
                        shadowOffset: {width: 0, height: 8},
                        shadowOpacity: darkMode ? 0.3 : 0.15,
                        shadowRadius: 16,
                        elevation: 8,
                        opacity: fadeAnim,
                        transform: [
                          {
                            translateY: slideAnim.interpolate({
                              inputRange: [0, 30],
                              outputRange: [0, 30],
                            }),
                          },
                          {scale: scaleAnim},
                        ],
                      },
                    ]}
                    key={index}>
                    {/* Course Image with Gradient Overlay */}
                    <View style={tw`h-56 relative`}>
                      <Image
                        source={{
                          uri: getOptimizedImageUrl(course.image, {
                            width: 900,
                            height: 500,
                            quality: 72,
                          }),
                        }}
                        style={tw`w-full h-full`}
                        resizeMode="cover"
                      />

                      {/* Gradient Overlay */}
                      <LinearGradient
                        colors={[
                          'rgba(0,0,0,0)',
                          'rgba(0,0,0,0.3)',
                          'rgba(0,0,0,0.8)',
                        ]}
                        locations={[0, 0.5, 1]}
                        style={tw`absolute inset-0`}
                      />

                      {/* Category Badge */}
                      <View style={tw`absolute top-4 left-4`}>
                        <View
                          style={[
                            tw`px-3 py-1 rounded-full`,
                            {backgroundColor: 'rgba(234, 146, 21, 0.9)'},
                          ]}>
                          <Text style={tw`text-white font-nokia-bold text-xs`}>
                            {course.category}
                          </Text>
                        </View>
                      </View>

                      {/* Progress Badge */}
                      <View style={tw`absolute top-4 right-4`}>
                        <View
                          style={[
                            tw`px-3 py-1 rounded-full`,
                            {backgroundColor: 'rgba(255, 255, 255, 0.9)'},
                          ]}>
                          <Text
                            style={tw`text-secondary-8 font-nokia-bold text-xs`}>
                            {progressValue !== undefined
                              ? Math.round(progressValue * 100)
                              : 0}
                            %
                          </Text>
                        </View>
                      </View>

                      {/* Chapter Count Badge */}
                      <View style={tw`absolute bottom-4 right-4`}>
                        <View
                          style={[
                            tw`px-3 py-2 rounded-full`,
                            {backgroundColor: 'rgba(234, 146, 21, 0.9)'},
                          ]}>
                          <Text style={tw`text-white font-nokia-bold text-sm`}>
                            {course.chapterCount} ምዕራፎች
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Course Content */}
                    <View style={tw`p-6`}>
                      {/* Progress Bar */}
                      {progressValue !== undefined && (
                        <View style={tw`mb-4`}>
                          <View
                            style={tw`flex-row justify-between items-center mb-2`}>
                            <Text
                              style={[
                                tw`font-nokia-bold text-sm`,
                                darkMode
                                  ? tw`text-primary-3`
                                  : tw`text-secondary-6`,
                              ]}>
                              Progress
                            </Text>
                            <Text
                              style={[
                                tw`font-nokia-bold text-sm`,
                                darkMode
                                  ? tw`text-primary-3`
                                  : tw`text-secondary-6`,
                              ]}>
                              {Math.round(progressValue * 100)}%
                            </Text>
                          </View>
                          <View
                            style={[
                              tw`h-2 rounded-full`,
                              {
                                backgroundColor: darkMode
                                  ? '#4B5563'
                                  : '#E5E7EB',
                              },
                            ]}>
                            <View
                              style={[
                                tw`h-full rounded-full`,
                                {
                                  backgroundColor: '#EA9215',
                                  width: `${progressValue * 100}%`,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      )}

                      {/* Course Stats */}
                      <View
                        style={tw`flex-row justify-between items-center mb-6`}>
                        <View style={tw`flex-row items-center gap-2`}>
                          <BookOpen size={20} color="#EA9215" weight="bold" />
                          <Text
                            style={[
                              tw`font-nokia-bold text-2xl leading-tight`,
                              darkMode
                                ? tw`text-primary-1`
                                : tw`text-secondary-8`,
                            ]}
                            numberOfLines={2}>
                            {course.title}
                          </Text>
                        </View>
                      </View>

                      {/* Action Button */}
                      <TouchableOpacity
                        style={[
                          tw`py-4 px-6 rounded-2xl`,
                          {
                            backgroundColor: '#EA9215',
                            shadowColor: '#EA9215',
                            shadowOffset: {width: 0, height: 4},
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 6,
                          },
                        ]}
                        onPress={() => handleButtonPress(course._id)}>
                        <Text
                          style={tw`text-white font-nokia-bold text-lg text-center`}>
                          ኮርሱን ክፈት
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>,
                ];

                if ((index + 1) % 5 === 0 && index < filteredData.length - 1) {
                  items.push(
                    renderExploreSeparator(`explore-separator-${index}`),
                  );
                }

                return items;
              })
            ) : (
              <Animated.View
                style={[
                  tw`items-center justify-center py-16 px-8`,
                  {
                    opacity: fadeAnim,
                    transform: [{translateY: slideAnim}],
                  },
                ]}>
                <View
                  style={[
                    tw`w-24 h-24 rounded-full items-center justify-center mb-6`,
                    {backgroundColor: darkMode ? '#374151' : '#F3F4F6'},
                  ]}>
                  <MagnifyingGlass size={40} color="#EA9215" weight="bold" />
                </View>
                <Text
                  style={[
                    tw`font-nokia-bold text-xl text-center mb-2`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  No courses found
                </Text>
                <Text
                  style={[
                    tw`font-nokia-bold text-base text-center opacity-70`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}>
                  Try adjusting your search terms
                </Text>
              </Animated.View>
            )}
            {(isFetching || isLoadingMore) && filteredCount > 0 && (
              <View style={tw`py-4 items-center`}>
                <ActivityIndicator size="small" color="#EA9215" />
                <Text
                  style={[
                    tw`font-nokia-bold text-sm mt-2`,
                    darkMode ? tw`text-primary-2` : tw`text-secondary-7`,
                  ]}>
                  Loading more courses...
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Course;
