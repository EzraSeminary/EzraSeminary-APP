import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Circle,
} from 'phosphor-react-native';
import tw from './../../../tailwind';
import Toast from 'react-native-toast-message';
import {
  useGetDevotionPlanByIdQuery,
  useGetDevotionPlanDevotionsQuery,
  useGetDevotionPlanProgressQuery,
  useUpdateDevotionPlanProgressMutation,
  apiSlice,
} from '../../redux/api-slices/apiSlice';
import {useCachedImage} from '../../utils/imageCache';
import {
  saveDevotionToCache,
  saveDevotionsToCache,
} from '../../utils/devotionCache';
import HighlightableBlock from '../../components/HighlightableBlock';
import HighlightableHtmlBlocks from '../../components/HighlightableHtmlBlocks';
import usePersistentHighlights from '../../hooks/usePersistentHighlights';
import {extractHtmlBlocks} from '../../utils/htmlBlocks';

// Completion Modal Component with Animation
const CompletionModal = ({
  visible,
  onClose,
  onRestart,
  onBackToPlans,
  totalDays,
  planTitle,
  darkMode,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      fadeAnim.setValue(0);

      // Start animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, rotateAnim, fadeAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View
        style={[
          tw`flex-1 justify-center items-center`,
          {backgroundColor: 'rgba(0, 0, 0, 0.7)'},
        ]}>
        <Animated.View
          style={[
            tw`bg-primary-1 rounded-4 p-8 mx-6`,
            darkMode ? tw`bg-secondary-8` : null,
            {
              transform: [{scale: scaleAnim}],
              opacity: fadeAnim,
            },
          ]}>
          <View style={tw`items-center mb-6`}>
            <Animated.View
              style={{
                transform: [{rotate}],
              }}>
              <Text style={tw`text-6xl`}>🎉</Text>
            </Animated.View>
          </View>
          <Text
            style={[
              tw`font-nokia-bold text-3xl text-center mb-3`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Congratulations!
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-lg text-center mb-2`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            You've completed all {totalDays} days of
          </Text>
          {planTitle && (
            <Text
              style={[
                tw`font-nokia-bold text-xl text-center mb-6 text-accent-6`,
              ]}>
              {planTitle}
            </Text>
          )}
          <Text
            style={[
              tw`font-nokia-bold text-base text-center mb-6`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            Keep up the great work! Start another plan to continue your
            spiritual journey.
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-4 rounded-4 mb-3`}
            onPress={onRestart}>
            <Text
              style={tw`font-nokia-bold text-primary-1 text-base text-center`}>
              Restart Plan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={tw`border border-accent-6 px-6 py-4 rounded-4`}
            onPress={onBackToPlans}>
            <Text
              style={[
                tw`font-nokia-bold text-base text-center`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Back to Plans
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const PlanDevotionViewer = () => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const {planId} = route.params || {};

  const [currentDevotionIndex, setCurrentDevotionIndex] = useState(0);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);

  const {
    data: plan,
    isLoading: planLoading,
    error: planError,
    refetch: refetchPlan,
  } = useGetDevotionPlanByIdQuery(planId, {
    skip: !planId,
  });

  const {
    data: devotions = [],
    isLoading: devotionsLoading,
    error: devotionsError,
    refetch: refetchDevotions,
  } = useGetDevotionPlanDevotionsQuery(planId, {
    skip: !planId,
  });

  const {data: progressData, refetch: refetchProgress} =
    useGetDevotionPlanProgressQuery(planId, {
      skip: !planId,
    });

  const [updateProgress, {isLoading: updatingProgress}] =
    useUpdateDevotionPlanProgressMutation();

  // Progress structure: { progress: { completed, total, percent }, userPlan: { itemsCompleted, ... } }
  const progress = progressData?.progress || {};
  const userPlan = progressData?.userPlan || {};
  const itemsCompleted = useMemo(
    () => userPlan.itemsCompleted || [],
    [userPlan.itemsCompleted],
  );
  const totalDays = plan?.numItems || devotions.length || progress.total || 0;
  const completedCount = itemsCompleted.length || progress.completed || 0;
  const progressPercent =
    progress.percent !== undefined
      ? progress.percent
      : totalDays > 0
      ? (completedCount / totalDays) * 100
      : 0;

  // Sort devotions by order field
  const sortedDevotions = useMemo(() => {
    if (!devotions || !Array.isArray(devotions)) {
      return [];
    }
    return [...devotions].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [devotions]);

  // Debug logging
  useEffect(() => {
    console.log('=== PLAN DEVOTION VIEWER DEBUG ===');
    console.log('planId:', planId);
    console.log('route.params:', route.params);
    console.log('plan:', plan ? plan.title : 'NO PLAN');
    console.log('planLoading:', planLoading);
    console.log('planError:', planError);
    console.log('devotions:', devotions?.length || 0);
    console.log('devotionsLoading:', devotionsLoading);
    console.log('devotionsError:', devotionsError);
    console.log('sortedDevotions:', sortedDevotions?.length || 0);
    if (devotions && devotions.length > 0) {
      console.log(
        'First devotion sample:',
        JSON.stringify(devotions[0], null, 2),
      );
    }
    console.log('===================================');
  }, [
    planId,
    plan,
    planLoading,
    planError,
    devotions,
    devotionsLoading,
    devotionsError,
    sortedDevotions,
    route.params,
  ]);

  // Find first incomplete devotion
  useEffect(() => {
    if (sortedDevotions.length > 0 && itemsCompleted.length > 0) {
      const firstIncompleteIndex = sortedDevotions.findIndex(
        d => !itemsCompleted.includes(d._id),
      );
      if (firstIncompleteIndex !== -1) {
        setCurrentDevotionIndex(firstIncompleteIndex);
      }
    }
  }, [sortedDevotions, itemsCompleted]);

  const currentDevotion = sortedDevotions[currentDevotionIndex];
  const isCompleted = currentDevotion
    ? itemsCompleted.includes(currentDevotion._id)
    : false;
  const devotionNumber = currentDevotionIndex + 1;
  const planHighlightKey = useMemo(
    () =>
      `devotional-plan:${planId}:${
        currentDevotion?._id || currentDevotionIndex
      }`,
    [currentDevotion?._id, currentDevotionIndex, planId],
  );
  const {highlights, setHighlight, clearHighlight} =
    usePersistentHighlights(planHighlightKey);
  const currentDevotionBlocks = useMemo(
    () => extractHtmlBlocks(currentDevotion?.body || []),
    [currentDevotion?.body],
  );

  // Call useCachedImage hook at the top level (before any early returns)
  const devotionImageUrl = currentDevotion?.image;
  const cachedImage = useCachedImage(devotionImageUrl || '');

  // Cache devotions when they're loaded
  useEffect(() => {
    if (sortedDevotions && sortedDevotions.length > 0) {
      saveDevotionsToCache(sortedDevotions);
    }
  }, [sortedDevotions]);

  // Cache current devotion when it changes
  useEffect(() => {
    if (currentDevotion && currentDevotion._id) {
      saveDevotionToCache(currentDevotion);
    }
  }, [currentDevotion]);

  const handleMarkComplete = async () => {
    if (!currentDevotion || !planId) {
      console.error('handleMarkComplete: Missing currentDevotion or planId', {
        currentDevotion: currentDevotion?._id,
        planId,
      });
      return;
    }

    console.log('=== MARK COMPLETE DEBUG ===');
    console.log('planId:', planId);
    console.log('devotionId:', currentDevotion._id);
    console.log('devotionNumber:', devotionNumber);
    console.log('totalDays:', totalDays);
    console.log('===========================');

    try {
      const result = await updateProgress({
        id: planId,
        devotionId: currentDevotion._id,
        completed: true,
      }).unwrap();

      console.log('Update progress result:', result);

      Toast.show({
        type: 'success',
        text1: 'Day Marked Complete! 🎉',
        text2: `Day ${devotionNumber} of ${totalDays} completed`,
      });

      // Refetch progress to get updated data
      const resultProgress = await refetchProgress();
      const updatedProgressData = resultProgress?.data || progressData;
      const updatedUserPlan = updatedProgressData?.userPlan || userPlan;
      const updatedItemsCompleted =
        updatedUserPlan.itemsCompleted || itemsCompleted;
      const newCompletedCount = updatedItemsCompleted.length;

      console.log('Updated progress data:', {
        newCompletedCount,
        totalDays,
        updatedItemsCompleted,
      });

      // Check if all devotions are complete
      if (newCompletedCount >= totalDays) {
        // Invalidate DevotionPlans cache to refresh completed plans list
        dispatch(apiSlice.util.invalidateTags(['DevotionPlans']));

        setTimeout(() => {
          setCompletionModalVisible(true);
        }, 500);
      } else {
        // Navigate to home after marking complete
        setTimeout(() => {
          navigation.getParent()?.navigate('Home');
        }, 1000);
      }
    } catch (error) {
      console.error('=== UPDATE PROGRESS ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error data:', error?.data);
      console.error('Error status:', error?.status);
      console.error('Full error:', JSON.stringify(error, null, 2));
      console.error('============================');

      Toast.show({
        type: 'error',
        text1: 'Failed to Update Progress',
        text2:
          error?.data?.message ||
          error?.message ||
          error?.error ||
          'Please try again.',
      });
    }
  };

  const handlePrevious = () => {
    if (currentDevotionIndex > 0) {
      setCurrentDevotionIndex(currentDevotionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentDevotionIndex < sortedDevotions.length - 1) {
      setCurrentDevotionIndex(currentDevotionIndex + 1);
    }
  };

  const handleRestart = () => {
    setCompletionModalVisible(false);
    // Navigate to Home tab
    navigation.getParent()?.navigate('Home');
  };

  const handleBackToPlans = () => {
    setCompletionModalVisible(false);
    // Navigate to Home tab
    navigation.getParent()?.navigate('Home');
  };

  // Check if planId is missing
  if (!planId) {
    return (
      <SafeAreaView
        style={darkMode ? tw`bg-secondary-9 flex-1` : tw`bg-primary-1 flex-1`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Plan ID Missing
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center mb-4`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            No plan ID was provided. Please go back and try again.
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4 mt-4`}
            onPress={() => {
              // Navigate to DevotionalHome
              navigation.navigate('Devotional', {
                screen: 'DevotionalHome',
              });
            }}>
            <Text style={tw`font-nokia-bold text-primary-1 text-base`}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (planLoading || devotionsLoading) {
    return (
      <SafeAreaView
        style={darkMode ? tw`bg-secondary-9 flex-1` : tw`bg-primary-1 flex-1`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#EA9215" />
          <Text
            style={[
              tw`font-nokia-bold text-lg mt-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Loading Plan...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if there's a plan error
  if (planError) {
    return (
      <SafeAreaView
        style={darkMode ? tw`bg-secondary-9 flex-1` : tw`bg-primary-1 flex-1`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Error Loading Plan
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center mb-4`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            {planError?.data?.message ||
              planError?.message ||
              'Unable to load the devotion plan.'}
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4 mt-4`}
            onPress={() => refetchPlan()}>
            <Text style={tw`font-nokia-bold text-primary-1 text-base`}>
              Retry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={tw`border border-accent-6 px-6 py-3 rounded-4 mt-3`}
            onPress={() => {
              // Navigate to DevotionalHome
              navigation.navigate('Devotional', {
                screen: 'DevotionalHome',
              });
            }}>
            <Text
              style={[
                tw`font-nokia-bold text-base`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if there's an error loading devotions
  if (devotionsError) {
    return (
      <SafeAreaView
        style={darkMode ? tw`bg-secondary-9 flex-1` : tw`bg-primary-1 flex-1`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Error Loading Devotions
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center mb-4`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            {devotionsError?.data?.message ||
              devotionsError?.message ||
              'Unable to load devotions for this plan.'}
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4 mt-4`}
            onPress={() => refetchDevotions()}>
            <Text style={tw`font-nokia-bold text-primary-1 text-base`}>
              Retry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={tw`border border-accent-6 px-6 py-3 rounded-4 mt-3`}
            onPress={() => {
              // Navigate to DevotionalHome
              navigation.navigate('Devotional', {
                screen: 'DevotionalHome',
              });
            }}>
            <Text
              style={[
                tw`font-nokia-bold text-base`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Only show "Plan Not Found" if we're not loading and there's no error but no plan data
  // This means the API returned successfully but with no data
  if (!planLoading && !planError && !plan) {
    return (
      <SafeAreaView
        style={darkMode ? tw`bg-secondary-9 flex-1` : tw`bg-primary-1 flex-1`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Plan Not Found
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center mb-4`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            The plan with ID "{planId}" could not be found.
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4 mt-4`}
            onPress={() => refetchPlan()}>
            <Text style={tw`font-nokia-bold text-primary-1 text-base`}>
              Retry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={tw`border border-accent-6 px-6 py-3 rounded-4 mt-3`}
            onPress={() => {
              // Navigate to DevotionalHome
              navigation.navigate('Devotional', {
                screen: 'DevotionalHome',
              });
            }}>
            <Text
              style={[
                tw`font-nokia-bold text-base`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!sortedDevotions || sortedDevotions.length === 0) {
    return (
      <SafeAreaView
        style={darkMode ? tw`bg-secondary-9 flex-1` : tw`bg-primary-1 flex-1`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            No Devotions Found
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center mb-4`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            This plan doesn't have any devotions yet.
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4 mt-4`}
            onPress={() => refetchDevotions()}>
            <Text style={tw`font-nokia-bold text-primary-1 text-base`}>
              Retry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={tw`border border-accent-6 px-6 py-3 rounded-4 mt-3`}
            onPress={() => {
              // Navigate to DevotionalHome
              navigation.navigate('Devotional', {
                screen: 'DevotionalHome',
              });
            }}>
            <Text
              style={[
                tw`font-nokia-bold text-base`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // HTMLView requires a plain object, not StyleSheet.create()
  const tailwindStyles = {
    p: [
      tw`text-secondary-6 font-nokia-bold text-justify text-sm leading-snug`,
      darkMode ? tw`text-primary-1` : null,
      {marginVertical: 0},
    ],
    a: tw`text-accent-6 font-nokia-bold text-sm underline`,
    h1: [
      tw`text-secondary-6 font-nokia-bold text-justify text-2xl leading-snug`,
      darkMode ? tw`text-primary-1` : null,
    ],
    h2: [
      tw`text-secondary-6 font-nokia-bold text-justify text-xl leading-snug`,
      darkMode ? tw`text-primary-1` : null,
    ],
    h3: [
      tw`text-secondary-6 font-nokia-bold text-justify text-lg leading-snug`,
      darkMode ? tw`text-primary-1` : null,
    ],
    ol: [
      tw`text-secondary-6 font-nokia-bold text-justify text-sm leading-snug`,
      darkMode ? tw`text-primary-1` : null,
      {marginVertical: 0, paddingLeft: 20},
    ],
    ul: [
      tw`text-secondary-6 font-nokia-bold text-justify text-sm leading-snug`,
      darkMode ? tw`text-primary-1` : null,
      {marginVertical: 0, paddingLeft: 20},
    ],
    li: [
      tw`text-secondary-6 font-nokia-bold text-justify text-sm leading-snug`,
      darkMode ? tw`text-primary-1` : null,
      {marginVertical: -5},
    ],
  };

  return (
    <SafeAreaView
      style={darkMode ? tw`bg-secondary-9 flex-1` : tw`bg-primary-1 flex-1`}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-6`}
        removeClippedSubviews>
        <View style={tw`flex mx-auto w-11/12`}>
          {/* Header */}
          <View style={tw`flex-row items-center justify-between my-4`}>
            <TouchableOpacity
              onPress={() => {
                // Navigate to DevotionalHome
                navigation.navigate('Devotional', {
                  screen: 'DevotionalHome',
                });
              }}>
              <ArrowLeft size={24} color={darkMode ? '#F9FAFB' : '#1F2937'} />
            </TouchableOpacity>
            <Text
              style={[
                tw`font-nokia-bold text-lg`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}
              numberOfLines={1}>
              {plan.title}
            </Text>
            <View style={tw`w-6`} />
          </View>

          {/* Progress Bar */}
          <View style={tw`mb-4`}>
            <View style={tw`flex-row justify-between items-center mb-2`}>
              <Text
                style={[
                  tw`font-nokia-bold text-sm`,
                  darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                ]}>
                {completedCount} of {totalDays} days (
                {Math.round(progressPercent)}%)
              </Text>
            </View>
            <View
              style={[
                tw`h-3 rounded-full overflow-hidden`,
                darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
              ]}>
              <View
                style={[tw`h-full bg-accent-6`, {width: `${progressPercent}%`}]}
              />
            </View>
          </View>

          {/* Day Indicator */}
          <View
            style={[
              tw`flex-row items-center justify-between mb-4 px-4 py-3 rounded-4`,
              darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-lg`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Day {devotionNumber} of {totalDays}
            </Text>
            {isCompleted && (
              <View style={tw`flex-row items-center`}>
                <CheckCircle size={20} color="#10B981" weight="fill" />
                <Text style={tw`font-nokia-bold text-green-500 text-sm ml-1`}>
                  Completed
                </Text>
              </View>
            )}
          </View>

          {/* Devotion Content */}
          {currentDevotion && (
            <>
              <Text
                style={[
                  tw`font-nokia-bold text-2xl mb-3`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}>
                {currentDevotion.title}
              </Text>

              {/* Chapter and Verse */}
              {currentDevotion.chapter && (
                <View style={tw`mb-3`}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-sm mb-1`,
                      darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                    ]}>
                    የዕለቱ የመጽሐፍ ቅዱስ ንባብ ክፍል -
                  </Text>
                  <Text
                    style={tw`font-nokia-bold text-accent-6 text-xl leading-tight`}>
                    {currentDevotion.chapter}
                  </Text>
                </View>
              )}

              {/* Verse Text */}
              {currentDevotion.verse && (
                <View
                  style={[
                    tw`border border-accent-6 p-4 rounded-4 mb-4 bg-primary-5 shadow-lg`,
                    darkMode ? tw`bg-secondary-8` : null,
                  ]}>
                  <HighlightableBlock
                    blockId="verse-card"
                    text={currentDevotion.verse}
                    darkMode={darkMode}
                    activeColorId={highlights['verse-card']}
                    onSelectColor={setHighlight}
                    onClearHighlight={clearHighlight}
                    style={tw`rounded-4 p-1`}>
                    <Text
                      selectable
                      style={[
                        tw`font-nokia-bold text-secondary-6 text-lg leading-tight`,
                        darkMode ? tw`text-primary-1` : null,
                      ]}>
                      {currentDevotion.verse}
                    </Text>
                  </HighlightableBlock>
                </View>
              )}

              {/* Body Paragraphs */}
              {currentDevotion.body && currentDevotion.body.length > 0 && (
                <View style={tw`my-8`}>
                  <HighlightableHtmlBlocks
                    blocks={currentDevotionBlocks}
                    darkMode={darkMode}
                    highlights={highlights}
                    onSelectColor={setHighlight}
                    onClearHighlight={clearHighlight}
                    stylesheet={tailwindStyles}
                    blockContainerStyle={tw`rounded-4 px-2 py-1 mb-2`}
                  />
                </View>
              )}

              {/* Prayer */}
              {currentDevotion.prayer && (
                <View
                  style={[
                    tw`border border-accent-6 p-4 rounded-4 mb-4 bg-primary-4 shadow-sm`,
                    darkMode ? tw`bg-secondary-8` : null,
                  ]}>
                  <HighlightableBlock
                    blockId="prayer-card"
                    text={currentDevotion.prayer}
                    darkMode={darkMode}
                    activeColorId={highlights['prayer-card']}
                    onSelectColor={setHighlight}
                    onClearHighlight={clearHighlight}
                    style={tw`rounded-4 p-1`}>
                    <Text
                      style={[
                        tw`font-nokia-bold text-accent-6 text-sm leading-tight text-center`,
                      ]}>
                      {currentDevotion.prayer}
                    </Text>
                  </HighlightableBlock>
                </View>
              )}

              {/* Image */}
              {devotionImageUrl && (
                <View
                  style={tw`border border-accent-6 rounded-4 mt-4 mb-4 overflow-hidden`}>
                  <Image
                    source={{uri: cachedImage}}
                    style={tw`w-full h-96`}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* Navigation Buttons */}
              <View style={tw`flex-row justify-between items-center mb-4`}>
                <TouchableOpacity
                  style={[
                    tw`flex-row items-center px-4 py-2 rounded-full`,
                    currentDevotionIndex === 0
                      ? tw`opacity-50`
                      : tw`bg-accent-6`,
                  ]}
                  onPress={handlePrevious}
                  disabled={currentDevotionIndex === 0}>
                  <ArrowLeft size={20} color="#FFFFFF" weight="bold" />
                  <Text style={tw`font-nokia-bold text-primary-1 text-sm ml-2`}>
                    Previous
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    tw`flex-row items-center px-4 py-2 rounded-full`,
                    currentDevotionIndex === sortedDevotions.length - 1
                      ? tw`opacity-50`
                      : tw`bg-accent-6`,
                  ]}
                  onPress={handleNext}
                  disabled={
                    currentDevotionIndex === sortedDevotions.length - 1
                  }>
                  <Text style={tw`font-nokia-bold text-primary-1 text-sm mr-2`}>
                    Next
                  </Text>
                  <ArrowRight size={20} color="#FFFFFF" weight="bold" />
                </TouchableOpacity>
              </View>

              {/* Mark Complete Button */}
              <TouchableOpacity
                style={[
                  tw`flex-row items-center justify-center py-4 px-6 rounded-4 mb-6`,
                  {backgroundColor: '#EA9215'},
                  (updatingProgress || isCompleted) && tw`opacity-50`,
                ]}
                onPress={handleMarkComplete}
                disabled={updatingProgress || isCompleted}>
                {updatingProgress ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : isCompleted ? (
                  <>
                    <CheckCircle size={20} color="#FFFFFF" weight="fill" />
                    <Text
                      style={tw`font-nokia-bold text-primary-1 text-lg ml-2`}>
                      Completed
                    </Text>
                  </>
                ) : (
                  <>
                    <Circle size={20} color="#FFFFFF" weight="bold" />
                    <Text
                      style={tw`font-nokia-bold text-primary-1 text-lg ml-2`}>
                      Mark Complete
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Completion Modal with Animation */}
      <CompletionModal
        visible={completionModalVisible}
        onClose={() => setCompletionModalVisible(false)}
        onRestart={handleRestart}
        onBackToPlans={handleBackToPlans}
        totalDays={totalDays}
        planTitle={plan?.title}
        darkMode={darkMode}
      />
    </SafeAreaView>
  );
};

export default PlanDevotionViewer;
