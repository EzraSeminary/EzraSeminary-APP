import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {useSelector} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Circle,
  Play,
} from 'phosphor-react-native';
import tw from './../../../tailwind';
import Toast from 'react-native-toast-message';
import HTMLView from 'react-native-htmlview';
import {
  useGetDevotionPlanByIdQuery,
  useGetDevotionPlanDevotionsQuery,
  useGetDevotionPlanProgressQuery,
  useUpdateDevotionPlanProgressMutation,
} from '../../redux/api-slices/apiSlice';
import {useCachedImage} from '../../utils/imageCache';

const PlanDevotionViewer = () => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const navigation = useNavigation();
  const route = useRoute();
  const {planId} = route.params || {};

  const [currentDevotionIndex, setCurrentDevotionIndex] = useState(0);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);

  const {data: plan, isLoading: planLoading} = useGetDevotionPlanByIdQuery(
    planId,
    {
      skip: !planId,
    },
  );

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
  const itemsCompleted = userPlan.itemsCompleted || [];
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
    console.log('plan:', plan ? plan.title : 'NO PLAN');
    console.log('devotions:', devotions?.length || 0);
    console.log('devotionsLoading:', devotionsLoading);
    console.log('devotionsError:', devotionsError);
    console.log('sortedDevotions:', sortedDevotions?.length || 0);
    if (devotions && devotions.length > 0) {
      console.log('First devotion sample:', JSON.stringify(devotions[0], null, 2));
    }
    console.log('===================================');
  }, [planId, plan, devotions, devotionsLoading, devotionsError, sortedDevotions]);

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

  // Call useCachedImage hook at the top level (before any early returns)
  const devotionImageUrl = currentDevotion?.image;
  const cachedImage = useCachedImage(devotionImageUrl || '');

  const handleMarkComplete = async () => {
    if (!currentDevotion || !planId) return;

    try {
      await updateProgress({
        id: planId,
        devotionId: currentDevotion._id,
        completed: true,
      }).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Day Marked Complete! 🎉',
        text2: `Day ${devotionNumber} of ${totalDays} completed`,
      });

      const result = await refetchProgress();
      const updatedProgressData = result?.data || progressData;
      const updatedUserPlan = updatedProgressData?.userPlan || userPlan;
      const updatedItemsCompleted =
        updatedUserPlan.itemsCompleted || itemsCompleted;
      const newCompletedCount = updatedItemsCompleted.length;

      // Check if all devotions are complete
      if (newCompletedCount >= totalDays) {
        setTimeout(() => {
          setCompletionModalVisible(true);
        }, 500);
      } else {
        // Auto-advance to next incomplete devotion
        setTimeout(() => {
          const nextIncompleteIndex = sortedDevotions.findIndex(
            (d, idx) =>
              idx > currentDevotionIndex &&
              !updatedItemsCompleted.includes(d._id),
          );
          if (nextIncompleteIndex !== -1) {
            setCurrentDevotionIndex(nextIncompleteIndex);
          } else {
            // Find any incomplete devotion
            const anyIncomplete = sortedDevotions.findIndex(
              d => !updatedItemsCompleted.includes(d._id),
            );
            if (anyIncomplete !== -1) {
              setCurrentDevotionIndex(anyIncomplete);
            }
          }
        }, 500);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Update Progress',
        text2: error?.data?.message || 'Please try again.',
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
    navigation.navigate('Devotional', {
      screen: 'DevotionPlans',
    });
  };

  const handleBackToPlans = () => {
    setCompletionModalVisible(false);
    navigation.navigate('Devotional', {
      screen: 'DevotionPlans',
    });
  };

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

  // Show error state if there's an error
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
            onPress={() => navigation.goBack()}>
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

  if (!plan) {
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
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4 mt-4`}
            onPress={() => navigation.goBack()}>
            <Text style={tw`font-nokia-bold text-primary-1 text-base`}>
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
            onPress={() => navigation.goBack()}>
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

  const tailwindStyles = {
    p: {
      ...(darkMode
        ? tw`text-primary-1 font-nokia-bold text-justify text-sm leading-snug`
        : tw`text-secondary-6 font-nokia-bold text-justify leading-snug`),
      marginVertical: 8,
    },
    a: tw`text-accent-6 font-nokia-bold text-sm underline`,
  };

  return (
    <SafeAreaView
      style={darkMode ? tw`bg-secondary-9 flex-1` : tw`bg-primary-1 flex-1`}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-6`}>
        <View style={tw`flex mx-auto w-11/12`}>
          {/* Header */}
          <View style={tw`flex-row items-center justify-between my-4`}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
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
                {completedCount} of {totalDays} days ({Math.round(progressPercent)}%)
              </Text>
            </View>
            <View
              style={[
                tw`h-3 rounded-full overflow-hidden`,
                darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
              ]}>
              <View
                style={[
                  tw`h-full bg-accent-6`,
                  {width: `${progressPercent}%`},
                ]}
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
                <Text
                  style={tw`font-nokia-bold text-green-500 text-sm ml-1`}>
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
                  <Text
                    selectable
                    style={[
                      tw`font-nokia-bold text-secondary-6 text-lg leading-tight`,
                      darkMode ? tw`text-primary-1` : null,
                    ]}>
                    {currentDevotion.verse}
                  </Text>
                </View>
              )}

              {/* Body Paragraphs */}
              {currentDevotion.body && currentDevotion.body.length > 0 && (
                <View style={tw`mb-4`}>
                  {currentDevotion.body.map((paragraph, idx) => (
                    <HTMLView
                      key={idx}
                      value={paragraph}
                      stylesheet={tailwindStyles}
                      linebreak={false}
                    />
                  ))}
                </View>
              )}

              {/* Prayer */}
              {currentDevotion.prayer && (
                <View
                  style={[
                    tw`border border-accent-6 p-4 rounded-4 mb-4 bg-primary-4 shadow-sm`,
                    darkMode ? tw`bg-secondary-8` : null,
                  ]}>
                  <Text
                    style={tw`font-nokia-bold text-accent-6 text-sm leading-tight text-center`}>
                    {currentDevotion.prayer}
                  </Text>
                </View>
              )}

              {/* Image */}
              {devotionImageUrl && (
                <View style={tw`border border-accent-6 rounded-4 mt-4 mb-4 overflow-hidden`}>
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
                  <Text
                    style={tw`font-nokia-bold text-primary-1 text-sm ml-2`}>
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
                  disabled={currentDevotionIndex === sortedDevotions.length - 1}>
                  <Text
                    style={tw`font-nokia-bold text-primary-1 text-sm mr-2`}>
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

      {/* Completion Modal */}
      <Modal
        visible={completionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCompletionModalVisible(false)}>
        <View
          style={[
            tw`flex-1 justify-center items-center`,
            {backgroundColor: 'rgba(0, 0, 0, 0.5)'},
          ]}>
          <View
            style={[
              tw`bg-primary-1 rounded-4 p-6 mx-6`,
              darkMode ? tw`bg-secondary-8` : null,
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-2xl text-center mb-2`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              🎉 Congratulations! 🎉
            </Text>
            <Text
              style={[
                tw`font-nokia-bold text-base text-center mb-4`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              You've completed all {totalDays} days of this devotion plan!
            </Text>
            <TouchableOpacity
              style={tw`bg-accent-6 px-6 py-3 rounded-4 mb-3`}
              onPress={handleRestart}>
              <Text
                style={tw`font-nokia-bold text-primary-1 text-base text-center`}>
                Restart Plan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`border border-accent-6 px-6 py-3 rounded-4`}
              onPress={handleBackToPlans}>
              <Text
                style={[
                  tw`font-nokia-bold text-base text-center`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}>
                Back to Plans
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PlanDevotionViewer;

