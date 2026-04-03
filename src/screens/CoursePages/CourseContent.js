import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import React, {useState, useCallback, useEffect} from 'react';
import tw from './../../../tailwind';
import {useGetCourseByIdQuery} from './../../services/api';
import {useNavigation} from '@react-navigation/native';
import {
  ArrowSquareLeft,
  CheckCircle,
  Circle,
  BookOpen,
} from 'phosphor-react-native';
import {useSelector} from 'react-redux';
import ErrorScreen from '../../components/ErrorScreen';
import NetInfo from '@react-native-community/netinfo';
import {getCachedCourseById, saveCourseToCache} from '../../utils/courseCache';
import LinearGradient from 'react-native-linear-gradient';
import {getOptimizedImageUrl, useCachedImage} from '../../utils/imageCache';

const CourseContent = ({route}) => {
  const {courseId} = route.params;
  const navigation = useNavigation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const darkMode = useSelector(state => state.ui.darkMode);
  const currentUser = useSelector(state => state.auth.user);

  // console.log(currentUser);

  const {
    data: apiCourseData,
    error,
    isLoading,
    refetch,
  } = useGetCourseByIdQuery(courseId, {
    skip: !courseId,
  });
  const [cachedCourseData, setCachedCourseData] = useState(null);

  useEffect(() => {
    const loadCachedCourse = async () => {
      const cached = await getCachedCourseById(courseId);
      if (cached) {
        setCachedCourseData(cached);
      }
    };
    if (courseId) {
      loadCachedCourse();
    }
  }, [courseId]);

  useEffect(() => {
    if (apiCourseData?._id) {
      setCachedCourseData(apiCourseData);
      saveCourseToCache(courseId, apiCourseData);
    }
  }, [apiCourseData, courseId]);

  const courseData = apiCourseData || cachedCourseData;
  const courseImage = useCachedImage(
    getOptimizedImageUrl(courseData?.image, {
      width: 1200,
      height: 700,
      quality: 76,
    }),
  );

  const onRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const network = await NetInfo.fetch();
      if (!network.isConnected) {
        const cached = await getCachedCourseById(courseId);
        if (cached) {
          setCachedCourseData(cached);
        }
        return;
      }
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [courseId, refetch]);

  const data = courseData?.chapters || [];

  // Find user progress for the specific course
  const userProgress = currentUser?.progress?.find(
    p => p.courseId === courseId,
  );

  const currentChapterIndex = userProgress?.currentChapter ?? 0;

  const [activeIndex, setActiveIndex] = useState(currentChapterIndex);

  useEffect(() => {
    if (userProgress?.currentChapter !== undefined) {
      const newActiveIndex = userProgress.currentChapter;
      setActiveIndex(newActiveIndex);
    }
  }, [userProgress]);

  const updateIndex = newIndex => {
    if (newIndex < 0) {
      newIndex = 0;
    } else if (newIndex >= data.length) {
      newIndex = data.length - 1;
    }
    setActiveIndex(newIndex);
  };

  const currentDataNumber = activeIndex + 1;
  const totalDataNumber = data.length;

  // Helper function to determine if a chapter is unlocked
  const isSlideUnlocked = index => {
    if (!userProgress) return false; // No progress data, chapter is locked
    return index <= userProgress.currentChapter; // Check if the chapter index is less than or equal to the current chapter
  };

  const backButtonPress = () => {
    navigation.navigate('CourseHome');
  };

  const progressValue = () => {
    if (userProgress && userProgress.currentChapter !== undefined) {
      const progressPercent =
        ((userProgress.currentChapter + 1) / totalDataNumber) * 100;
      return progressPercent.toFixed();
    }
    return '0'; // if there's no progress, return 0
  };

  if (isLoading && !courseData) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <ActivityIndicator size="large" color="#EA9215" style={tw`mt-20`} />
        <Text style={tw`font-nokia-bold text-lg text-accent-6 text-center`}>
          Loading
        </Text>
      </SafeAreaView>
    );
  }

  if (error && !courseData) {
    return <ErrorScreen refetch={refetch} darkMode={darkMode} />;
  }

  return (
    <View style={darkMode ? tw`bg-secondary-9 h-full` : null}>
      <SafeAreaView>
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
          <View style={tw`flex-1 h-70`}>
            <ImageBackground
              source={{
                uri: courseImage,
              }}
              style={tw`flex-5`}>
              <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.72)']}
                style={tw`absolute inset-0`}
              />
              <TouchableOpacity onPress={backButtonPress}>
                <ArrowSquareLeft
                  size={36}
                  weight="fill"
                  color={'#EA9215'}
                  style={tw`px-8 mt-4`}
                />
              </TouchableOpacity>
              <View style={tw`absolute bottom-0 w-full px-5 pb-5`}>
                <View
                  style={[
                    tw`self-start rounded-full px-3 py-1 mb-3`,
                    {backgroundColor: 'rgba(234, 146, 21, 0.92)'},
                  ]}>
                  <Text style={tw`font-nokia-bold text-white text-sm`}>
                    {courseData?.category || 'Course'}
                  </Text>
                </View>
                <Text style={tw`font-nokia-bold text-primary-1 text-3xl`}>
                  {courseData?.title}
                </Text>
              </View>
            </ImageBackground>
            <View
              style={[
                tw`flex-1 bg-primary-7 flex-row gap-3 justify-center items-center px-4`,
                darkMode ? tw`bg-secondary-8` : null,
              ]}>
              <View style={tw`px-3 py-1 bg-accent-6 rounded-full`}>
                <Text style={tw`font-nokia-bold text-primary-1`}>
                  {progressValue()}%
                </Text>
              </View>
              <BookOpen size={18} color="#EA9215" weight="bold" />
              <Text
                style={[
                  tw`font-nokia-bold text-secondary-6 text-sm flex-1`,
                  darkMode ? tw`text-primary-3` : null,
                ]}>
                Pass 100% of your lessons to complete this course
              </Text>
            </View>
          </View>
          <View style={tw`flex mx-auto w-[92%]`}>
            <View
              style={[
                tw`mt-4 mb-4 rounded-3xl border px-4 py-4`,
                {
                  backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                  borderColor: '#EA9215',
                },
              ]}>
              <Text
                style={[
                  tw`font-nokia-bold text-secondary-6 text-lg leading-7`,
                  darkMode ? tw`text-primary-3` : null,
                ]}>
                {courseData?.description}
              </Text>
            </View>
            <View style={tw`flex flex-row items-center`}>
              <View style={tw`border-b-4 border-accent-6`}>
                <Text
                  style={[
                    tw`py-2 font-nokia-bold text-secondary-6`,
                    darkMode ? tw`text-primary-3` : null,
                  ]}>
                  ትምህርቶች {currentDataNumber}/{totalDataNumber}
                </Text>
              </View>
              <View style={tw`border-b border-accent-6 h-4 flex-grow mt-5`} />
            </View>
            {data.map((chapter, index) => {
              const unlocked = isSlideUnlocked(index);
              return (
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('SlideSample1', {
                      chapterTitle: chapter.chapter,
                      courseDescription: chapter.description,
                      chapterId: chapter._id,
                      CId: courseId,
                    });
                    updateIndex(index);
                  }}
                  key={index}
                  // disabled={!unlocked}
                >
                  <View
                    style={[
                      tw`flex flex-row justify-between px-4 py-4 items-center rounded-2xl mt-3`,
                      {
                        backgroundColor: darkMode ? '#1F2937' : '#FFF7ED',
                      },
                    ]}>
                    <View style={tw`flex`}>
                      <Text
                        style={tw`font-nokia-bold text-accent-6 text-xs mb-1`}>
                        Chapter {index + 1}
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold text-secondary-6 text-lg`,
                          darkMode ? tw`text-primary-3` : null,
                        ]}>
                        {chapter.chapter}
                      </Text>
                    </View>
                    {unlocked ? (
                      <CheckCircle size={20} weight="fill" color={'#EA9215'} />
                    ) : (
                      <Circle size={20} color={'#EA9215'} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default CourseContent;
