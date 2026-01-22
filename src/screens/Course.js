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
} from 'phosphor-react-native';
import tw from './../../tailwind';
import {useGetCoursesQuery} from './../redux/api-slices/apiSlice';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import ErrorScreen from '../components/ErrorScreen';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import LinearGradient from 'react-native-linear-gradient';
import Explore from './Explore';

// Tab Switcher Component - matching Devotion screen style
const TabSwitcher = ({activeTab, setActiveTab, darkMode}) => (
  <View
    style={[
      tw`flex-row mb-6 p-1 rounded-full`,
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
          backgroundColor: activeTab === 'explore' ? '#EA9215' : 'transparent',
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
);

const Course = () => {
  const [activeTab, setActiveTab] = useState('course'); // 'course' or 'explore'
  const {data: courses, error, isLoading, refetch} = useGetCoursesQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortByLatest, setSortByLatest] = useState(false);
  const darkMode = useSelector(state => state.ui.darkMode);
  const navigation = useNavigation();
  const currentUser = useSelector(state => state.auth.user);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

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

  const onRefresh = useCallback(async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Toast.show({
        type: 'info',
        text1: 'Internet Connection Required',
        text2: 'Please connect to the internet to reload data.',
      });
      setIsRefreshing(false);
      return;
    }
    try {
      setIsRefreshing(true);
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

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

  const handleButtonPress = id => {
    navigation.navigate('CourseContent', {courseId: id});
  };

  const toggleSortOrder = () => {
    setSortByLatest(prev => !prev);
  };

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

  if (isLoading) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <ActivityIndicator size="large" color="#EA9215" style={tw`mt-20`} />
        <Text style={tw`font-nokia-bold text-lg text-accent-6 text-center`}>
          Loading
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return <ErrorScreen refetch={refetch} darkMode={darkMode} />;
  }

  // Render Explore content if explore tab is active
  if (activeTab === 'explore') {
    return (
      <View style={darkMode ? tw`bg-secondary-9` : null}>
        <SafeAreaView style={tw`flex mx-auto w-[92%]`}>
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
    <View style={darkMode ? tw`bg-secondary-9` : null}>
      <SafeAreaView style={tw`flex mx-auto w-auto`}>
        <TabSwitcher
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            }}>

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
            {filteredData.length > 0 ? (
              filteredData.map((course, index) => {
                const progressValue = getProgressValue(course._id);
                return (
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
                        source={{uri: `${course.image}`}}
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
                  </Animated.View>
                );
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
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Course;
