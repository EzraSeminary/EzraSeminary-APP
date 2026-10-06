import React, {useState, useEffect, useRef, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  Text,
  View,
  Image,
  ImageBackground,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import tw from './../../../tailwind';
import {
  CaretCircleLeft,
  CaretCircleRight,
  DotsThreeOutlineVertical,
} from 'phosphor-react-native';
import {useDispatch, useSelector} from 'react-redux';
import {
  setProgress,
  selectCurrentUser,
  updateUser,
} from '../../redux/authSlice';
import {useFocusEffect} from '@react-navigation/native';
import {useGetCourseByIdQuery} from './../../services/api';
import {useNavigation} from '@react-navigation/core';
import {ActivityIndicator} from 'react-native';
import FullScreenMenu from './FullScreenMenu';
import List from './Types/List';
import Slide from './Types/Slide';
import Quiz from './Types/Quiz';
import Subtitle from './Types/Subtitle';
import TextComponent from './Types/Text';
import ImageComponent from './Types/Image';
import Title from './Types/Title';
import Sequence from './Types/Sequence';
import AccordionComponent from './Types/AccordionComponent';
import ErrorScreen from '../../components/ErrorScreen';
import Reveal from './Types/Reveal';
import Range from './Types/Range';
import DND from './Types/DND';
import VerseSection from './Types/Verse';
import MainVerseSection from './Types/MainVerse';
import 'react-native-gesture-handler';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import VideoPlayer from './Types/Video';
import AudioPlayer from './Types/Audio';
import Toast from 'react-native-toast-message';
import ScrollMix from './Types/ScrollMix';
import {getCachedCourseById, saveCourseToCache} from '../../utils/courseCache';
import {
  saveProgressForLaterSync,
  syncPendingCourseProgressForCourse,
} from '../../utils/courseProgress';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getFloatingTabScenePadding} from '../../navigation/floatingTabBarStyles';

const INTERACTIVE_ELEMENT_TYPES = [
  'quiz',
  'accordion',
  'sequence',
  'slide',
  'reveal',
  'range',
  'dnd',
  'verse',
];

const SlideSample2 = ({route}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [unlockedIndex, setUnlockedIndex] = useState(0);
  const navigation = useNavigation();
  const {courseId, chapterId} = route.params;
  const {
    data: apiCourseData,
    error,
    isLoading,
    refetch,
  } = useGetCourseByIdQuery(courseId);
  const [cachedCourseData, setCachedCourseData] = useState(null);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const darkMode = useSelector(state => state.ui.darkMode);
  const insets = useSafeAreaInsets();
  const bottomControlPadding = Math.max(
    getFloatingTabScenePadding(insets) - 40,
    24,
  );
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const [triggerNext, setTriggerNext] = useState(false);
  const [isSlideComplete, setIsSlideComplete] = useState(false);
  const [isSequenceComplete, setIsSequenceComplete] = useState(false);
  const [isAccordionExpanded, setIsAccordionExpanded] = useState(false);
  const [isRevealComplete, setIsRevealComplete] = useState(false);
  const [isRangeComplete, setIsRangeComplete] = useState(false);
  const [isVerseComplete, setIsVerseComplete] = useState(false);
  const [isNextButtonVisible, setIsNextButtonVisible] = useState(false);
  const [interactionMessage, setInteractionMessage] = useState('');
  const [activeElementIndex, setActiveElementIndex] = useState(0);
  const initializedProgressKeyRef = useRef('');
  const elementLayoutsRef = useRef([]);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };
  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const interactionMessages = {
    quiz: 'እባክዎ ጥያቄውን ይመልሱ።',
    accordion: 'እባክዎ ሁሉንም ሳጥኖች በመንካት ጽሁፎቹን አንብበው ይጨርሱ።',
    sequence: 'እባክዎ ቀስቶቹን በመንጫ እስከመጨረሻው ይሂዱ።',
    slide: 'እባክዎ ቀስቶቹን በመንጫ እስከመጨረሻው ይሂዱ።',
    reveal: 'እባክዎ ጽሁፎቹን(ሳጥኖቹን) በመንካት ሁሉንም ጽሁፎች አንብበው ይርጨሱ።',
    range: 'እባክዎ ቀስቱን በማንሸራተት ጥያቄውን ይመልሱ',
    dnd: 'እባክዎ ጥያቄውን ይመልሱ።',
    verse: 'እባክዎ ጥቅሱን በመንካት ያንብቡ።',
  };

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
  const chapter = courseData?.chapters?.find(chap => chap._id === chapterId);
  const chapterIndex = courseData?.chapters?.findIndex(
    chap => chap._id === chapterId,
  );
  const data = chapter?.slides ?? [];
  const onLastSlide = activeIndex === data.length - 1;
  const currentSlideElements = data[activeIndex]?.elements ?? [];
  const currentSlideSignature = currentSlideElements
    .map(element => `${element._id}:${element.type}`)
    .join('|');
  const requiredInteractiveTypes = [
    ...new Set(
      currentSlideElements
        .map(element => element.type)
        .filter(type => INTERACTIVE_ELEMENT_TYPES.includes(type)),
    ),
  ];

  useEffect(() => {
    if (!data.length || chapterIndex === undefined || chapterIndex === -1) {
      return;
    }

    const initKey = `${courseId}:${chapterId}:${data.length}`;
    if (initializedProgressKeyRef.current === initKey) {
      return;
    }
    initializedProgressKeyRef.current = initKey;

    const savedProgress = currentUser?.progress?.find(
      p => p.courseId === courseId,
    );
    const isSameChapter =
      savedProgress &&
      savedProgress.currentChapter !== undefined &&
      savedProgress.currentChapter === chapterIndex;

    const startIndex = isSameChapter
      ? Math.min(
          Math.max(savedProgress.currentSlide ?? 0, 0),
          Math.max(data.length - 1, 0),
        )
      : 0;

    setActiveIndex(startIndex);
    setUnlockedIndex(startIndex);
  }, [courseId, chapterId, chapterIndex, data.length, currentUser?.progress]);

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setHidden(true);
      return () => StatusBar.setHidden(false);
    }, []),
  );

  useEffect(() => {
    setIsSlideComplete(false);
    setIsSequenceComplete(false);
    setIsAccordionExpanded(false);
    setIsRevealComplete(false);
    setIsRangeComplete(false);
    setIsVerseComplete(false);
    setIsAnswerChecked(false);
    setIsNextButtonVisible(false);
    setInteractionMessage('');

    const nonInteractiveTypes = [
      'title',
      'sub',
      'text',
      'img',
      'mix',
      'list',
      'video',
      'audio',
    ];

    const allNonInteractive = currentSlideElements.every(element =>
      nonInteractiveTypes.includes(element.type),
    );
    if (allNonInteractive) {
      setIsNextButtonVisible(true);
    }
  }, [activeIndex, currentSlideSignature]);

  useEffect(() => {
    const completionByType = {
      quiz: isAnswerChecked,
      dnd: isAnswerChecked,
      accordion: isAccordionExpanded,
      sequence: isSequenceComplete,
      slide: isSlideComplete,
      reveal: isRevealComplete,
      range: isRangeComplete,
      verse: isVerseComplete,
    };
    const allInteractionsDone =
      requiredInteractiveTypes.length === 0 ||
      requiredInteractiveTypes.every(type => completionByType[type]);

    if (onLastSlide) {
      setIsNextButtonVisible(true);
    } else if (allInteractionsDone !== isNextButtonVisible) {
      setIsNextButtonVisible(allInteractionsDone);
    }
  }, [
    isAnswerChecked,
    isAccordionExpanded,
    isSequenceComplete,
    isSlideComplete,
    isRevealComplete,
    isRangeComplete,
    isVerseComplete,
    requiredInteractiveTypes,
    onLastSlide,
    isNextButtonVisible,
  ]);

  // If the chapter is not found, handle accordingly
  if (courseData && !chapter) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <ActivityIndicator size="large" color="#EA9215" style={tw`mt-20`} />
        <Text style={tw`font-nokia-bold text-lg text-accent-6 text-center`}>
          Chapter not available offline yet
        </Text>
      </SafeAreaView>
    );
  }

  const currentDataNumber = activeIndex + 1;
  const totalDataNumber = data.length;
  const currentSlideElementCount = currentSlideElements.length;

  const updateActiveElementFromOffset = useCallback(
    offsetY => {
      const layouts = elementLayoutsRef.current;
      if (!layouts.length) {
        setActiveElementIndex(0);
        return;
      }

      const probeLine = offsetY + 120;
      const matchedIndex = layouts.findIndex(layout => {
        const startY = layout?.y ?? 0;
        const endY = startY + (layout?.height ?? 0);
        return probeLine >= startY && probeLine < endY;
      });

      if (matchedIndex >= 0) {
        setActiveElementIndex(matchedIndex);
        return;
      }

      if (probeLine < (layouts[0]?.y ?? 0)) {
        setActiveElementIndex(0);
        return;
      }

      setActiveElementIndex(Math.max(layouts.length - 1, 0));
    },
    [setActiveElementIndex],
  );

  useEffect(() => {
    elementLayoutsRef.current = [];
    setActiveElementIndex(0);
  }, [activeIndex, currentSlideSignature]);

  const updateIndex = newIndex => {
    const boundedIndex =
      newIndex >= data.length ? data.length - 1 : Math.max(newIndex, 0);

    setActiveIndex(boundedIndex);
    if (boundedIndex > unlockedIndex) {
      setUnlockedIndex(boundedIndex);
    }

    if (courseID && chapterIndex !== undefined && chapterIndex !== -1) {
      dispatch(
        setProgress({
          courseId: courseID,
          currentChapter: chapterIndex,
          currentSlide: boundedIndex,
        }),
      );
      void saveAndSyncProgressInBackground(boundedIndex);
    }
  };
  const onFirstSlide = activeIndex === 0;

  const handleButtonPress = () => {
    setTriggerNext(true);

    if (requiredInteractiveTypes.length > 0) {
      const completionByType = {
        quiz: isAnswerChecked,
        dnd: isAnswerChecked,
        accordion: isAccordionExpanded,
        sequence: isSequenceComplete,
        slide: isSlideComplete,
        reveal: isRevealComplete,
        range: isRangeComplete,
        verse: isVerseComplete,
      };
      const firstIncompleteType = requiredInteractiveTypes.find(
        type => !completionByType[type],
      );

      if (firstIncompleteType) {
        setInteractionMessage(interactionMessages[firstIncompleteType]);
        Toast.show({
          type: 'info',
          text1: 'ከመቀጠልዎ በፊት!',
          text2: interactionMessages[firstIncompleteType],
        });
        return;
      }
    }

    if (onLastSlide) {
      void saveAndSyncProgressInBackground(activeIndex);
      navigation.navigate('CourseContent', {courseId: courseId});
    } else {
      setIsNextButtonVisible(false);
      goToNextSlide();
    }
  };

  const goToNextSlide = () => {
    const nextIndex = activeIndex + 1;
    if (nextIndex < data.length) {
      updateIndex(nextIndex);
    }
  };

  const goToPreviousSlide = () => {
    setTriggerNext(true);
    const previousIndex = activeIndex - 1;
    if (previousIndex >= 0) {
      updateIndex(previousIndex);
    }
  };

  const courseID = courseData && courseData._id ? courseData._id : '';

  const saveAndSyncProgressInBackground = async slideIndex => {
    try {
      if (!courseID || chapterIndex === undefined || chapterIndex === -1) {
        return;
      }

      const progressEntry = {
        courseId: courseID,
        currentChapter: chapterIndex,
        currentSlide: slideIndex,
      };

      await saveProgressForLaterSync(progressEntry);

      const network = await NetInfo.fetch();
      if (!network.isConnected || !currentUser?._id) {
        return;
      }

      const token = currentUser?.token || (await AsyncStorage.getItem('token'));
      if (!token) {
        return;
      }

      const syncResult = await syncPendingCourseProgressForCourse({
        courseId: courseID,
        userId: currentUser._id,
        token,
      });

      if (syncResult.synced && syncResult.user) {
        dispatch(updateUser(syncResult.user));
      }
    } catch (err) {
      console.error('Error saving background progress:', err.message);
    }
  };

  if (isLoading && !courseData) {
    return (
      <SafeAreaView>
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
    <View style={tw`flex-1`}>
      <FullScreenMenu
        isVisible={menuVisible}
        onClose={toggleMenu}
        chapterId={chapterId}
        courseId={courseId}
        updateIndex={updateIndex}
        unlockedIndex={unlockedIndex}
        activeIndex={activeIndex}
      />
      <ImageBackground
        source={require('./../../assets/bible6.jpeg')}
        style={tw`flex-1 p-2`}>
        <View
          style={[
            tw`absolute inset-0 bg-accent-9 bg-opacity-80`,
            darkMode ? tw`bg-secondary-9 bg-opacity-85` : null,
          ]}
        />
        <View style={tw`h-100% justify-between pt-8 px-2`}>
          <View style={tw`flex-none`}>
            <View style={tw`flex flex-row items-center justify-between w-auto`}>
              <View style={tw`flex flex-row items-center gap-2`}>
                <View style={tw`pr-2 border-r border-primary-1`}>
                  <Image
                    source={require('./../../assets/LogoSmall.png')}
                    style={tw`w-22 h-11`}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  style={tw`font-nokia-bold text-primary-1 text-sm flex-shrink w-[57%]`}>
                  {chapter.chapter}
                </Text>
              </View>
              <View style={tw`flex flex-row items-center gap-1 mr-2`}>
                <Text style={tw`font-nokia-bold text-primary-1 text-lg`}>
                  {currentDataNumber}/{totalDataNumber}
                </Text>
                <TouchableOpacity onPress={toggleMenu} style={tw`self-end`}>
                  <DotsThreeOutlineVertical weight="fill" color="#EA9215" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={tw`border-b border-accent-6 mt-2`} />
          </View>

          <View style={tw`flex-1 relative`}>
            {currentSlideElementCount > 1 ? (
              <View
                pointerEvents="none"
                style={[
                  tw`absolute right-2 top-3 z-10 rounded-full px-3 py-1`,
                  {
                    backgroundColor: darkMode
                      ? 'rgba(17,24,39,0.88)'
                      : 'rgba(255,247,237,0.94)',
                    borderWidth: 1,
                    borderColor: '#EA9215',
                  },
                ]}>
                <Text
                  style={[
                    tw`font-nokia-bold text-sm`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                  ]}>
                  {activeElementIndex + 1}/{currentSlideElementCount}
                </Text>
              </View>
            ) : null}
            <ScrollView
              onScroll={event =>
                updateActiveElementFromOffset(event.nativeEvent.contentOffset.y)
              }
              scrollEventThrottle={16}
              contentContainerStyle={[
                tw`flex-grow justify-center pt-8 px-2`,
                {paddingBottom: 16},
              ]}
              showsVerticalScrollIndicator={false}>
              {data.map((slides, index) => {
                if (index === activeIndex) {
                  return (
                    <>
                      <Text
                        style={tw`text-accent-6 text-3xl font-nokia-bold text-center mb-8`}>
                        {slides.slide}
                      </Text>
                      <View key={slides._id} style={tw`flex gap-4`}>
                        {slides.elements.map((element, elementIndex) => {
                          // console.log(element);
                          const renderElement = () => {
                            switch (element.type) {
                              case 'title':
                                return (
                                  <Title
                                    key={element._id}
                                    value={element.value}
                                  />
                                );
                              case 'sub':
                                return (
                                  <Subtitle
                                    key={element._id}
                                    value={element.value}
                                  />
                                );
                              case 'text':
                                return (
                                  <View style={tw`flex w-[100%]`}>
                                    <TextComponent
                                      key={element._id}
                                      value={element.value}
                                    />
                                  </View>
                                );
                              case 'mix':
                                return (
                                  <ScrollMix
                                    key={element._id}
                                    value={element.value}
                                    toggleModal={toggleModal}
                                    isModalVisible={isModalVisible}
                                    isImageLoaded={isImageLoaded}
                                    handleImageLoad={handleImageLoad}
                                    darkMode={darkMode}
                                  />
                                );
                              case 'list':
                                return (
                                  <List
                                    key={element._id}
                                    value={element.value}
                                  />
                                );
                              case 'slide':
                                return (
                                  <Slide
                                    key={element._id}
                                    value={element.value}
                                    setIsSlideComplete={setIsSlideComplete}
                                  />
                                );
                              case 'sequence':
                                return (
                                  <Sequence
                                    key={element._id}
                                    value={element.value}
                                    setIsSequenceComplete={
                                      setIsSequenceComplete
                                    }
                                  />
                                );
                              case 'reveal':
                                return (
                                  <Reveal
                                    key={element._id}
                                    value={element.value}
                                    setIsRevealComplete={setIsRevealComplete}
                                  />
                                );
                              case 'img':
                                return (
                                  <GestureHandlerRootView style={{flex: 1}}>
                                    <ImageComponent
                                      key={element._id}
                                      value={element.value}
                                      toggleModal={toggleModal}
                                      isModalVisible={isModalVisible}
                                      isImageLoaded={isImageLoaded}
                                      handleImageLoad={handleImageLoad}
                                      darkMode={darkMode}
                                    />
                                  </GestureHandlerRootView>
                                );
                              case 'quiz':
                                return (
                                  <Quiz
                                    key={element._id}
                                    value={element.value}
                                    setIsAnswerChecked={setIsAnswerChecked}
                                  />
                                );
                              case 'accordion':
                                return (
                                  <AccordionComponent
                                    key={element._id}
                                    value={element.value}
                                    setIsAccordionExpanded={
                                      setIsAccordionExpanded
                                    }
                                  />
                                );
                              case 'range':
                                return (
                                  <Range
                                    key={element._id}
                                    setIsRangeComplete={setIsRangeComplete}
                                  />
                                );
                              case 'verse':
                                return (
                                  <VerseSection
                                    key={element._id}
                                    value={element.value}
                                    setIsVerseComplete={setIsVerseComplete}
                                  />
                                );
                              case 'main-verse':
                                return (
                                  <MainVerseSection
                                    key={element._id}
                                    value={element.value}
                                  />
                                );
                              case 'video':
                                return (
                                  <VideoPlayer
                                    key={element._id}
                                    value={element.value}
                                  />
                                );
                              case 'audio':
                                return (
                                  <AudioPlayer
                                    key={element._id}
                                    value={`${element.value}`}
                                    onNext={triggerNext}
                                  />
                                );
                              case 'dnd':
                                return (
                                  <GestureHandlerRootView style={{flex: 1}}>
                                    <DND
                                      key={element._id}
                                      value={element.value}
                                      selectedAnswer={selectedAnswer}
                                      setSelectedAnswer={setSelectedAnswer}
                                      isAnswerChecked={isAnswerChecked}
                                      setIsAnswerChecked={setIsAnswerChecked}
                                    />
                                  </GestureHandlerRootView>
                                );
                              default:
                                return null;
                            }
                          };

                          return (
                            <View
                              key={
                                element._id || `${element.type}-${elementIndex}`
                              }
                              onLayout={event => {
                                elementLayoutsRef.current[elementIndex] = {
                                  y: event.nativeEvent.layout.y,
                                  height: event.nativeEvent.layout.height,
                                };
                              }}>
                              {renderElement()}
                            </View>
                          );
                        })}
                      </View>
                    </>
                  );
                }
              })}
            </ScrollView>
          </View>
          <View style={tw`border-b border-accent-6 mt-2`} />
          <View
            style={[
              tw`flex-none`,
              {paddingBottom: bottomControlPadding},
            ]}>
            <View style={tw`flex-row justify-between px-4 my-2`}>
              {!onFirstSlide && (
                <TouchableOpacity
                  style={tw`flex flex-row items-center bg-accent-6 px-4 rounded-full gap-2 h-10`}
                  onPress={goToPreviousSlide}>
                  <CaretCircleLeft size={18} weight="fill" color="white" />
                  <Text
                    style={tw`text-primary-1 font-nokia-bold text-sm text-center`}>
                    ተመለስ
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={tw`flex flex-row items-center bg-accent-6 px-4 rounded-full gap-2 h-10 ${
                  onFirstSlide ? 'mx-auto' : ''
                }`}
                onPress={handleButtonPress}>
                <Text
                  style={tw`text-primary-1 font-nokia-bold text-sm text-center`}>
                  {onLastSlide ? 'ዘግተህ ውጣ' : 'ቀጥል'}
                </Text>
                <CaretCircleRight size={18} weight="fill" color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

export default SlideSample2;
