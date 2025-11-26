import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import {useSelector} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, Play, CheckCircle} from 'phosphor-react-native';
import tw from './../../../tailwind';
import Toast from 'react-native-toast-message';
import {
  useGetDevotionPlanByIdQuery,
  useGetDevotionPlanProgressQuery,
  useStartDevotionPlanMutation,
} from '../../redux/api-slices/apiSlice';

const DevotionPlanDetails = () => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const navigation = useNavigation();
  const route = useRoute();
  const {planId} = route.params || {};

  const [isStarting, setIsStarting] = useState(false);

  const {
    data: plan,
    isLoading,
    error,
  } = useGetDevotionPlanByIdQuery(planId, {
    skip: !planId,
  });

  const {data: progress} = useGetDevotionPlanProgressQuery(planId, {
    skip: !planId,
  });

  const [startDevotionPlan] = useStartDevotionPlanMutation();

  const isStarted = !!progress;
  const currentDay = progress?.currentDay || 0;
  const completedDays = progress?.completedDays || [];
  const totalDays = plan?.days || 0;
  const progressPercentage =
    totalDays > 0 ? (completedDays.length / totalDays) * 100 : 0;

  const handleStartPlan = async () => {
    if (!planId) return;

    setIsStarting(true);
    try {
      await startDevotionPlan(planId).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Plan Started!',
        text2: 'Your devotion plan journey begins now.',
      });
      // Navigate to the first day's devotion or plan view
      // You can customize this navigation based on your app structure
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Start Plan',
        text2: error?.data?.message || 'Please try again.',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleContinuePlan = () => {
    // Navigate to current day's devotion
    // You can customize this navigation based on your app structure
    Toast.show({
      type: 'info',
      text1: 'Continue Plan',
      text2: 'Navigate to current day...',
    });
  };

  if (isLoading) {
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
            Loading Plan Details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !plan) {
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
                tw`font-nokia-bold text-xl`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Plan Details
            </Text>
            <View style={tw`w-6`} />
          </View>

          {/* Large Image */}
          <View style={tw`h-64 rounded-4 overflow-hidden mb-4`}>
            <Image
              source={{
                uri: plan.image || 'https://via.placeholder.com/400x300',
              }}
              style={tw`w-full h-full`}
              resizeMode="cover"
            />
          </View>

          {/* Icon (if available) */}
          {plan.icon && (
            <View style={tw`items-center mb-4`}>
              <Image
                source={{uri: plan.icon}}
                style={tw`w-16 h-16`}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Title */}
          <Text
            style={[
              tw`font-nokia-bold text-3xl mb-3`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            {plan.title}
          </Text>

          {/* Description */}
          {plan.description && (
            <Text
              style={[
                tw`font-nokia-bold text-base mb-4 leading-6`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              {plan.description}
            </Text>
          )}

          {/* Days Count */}
          <View
            style={[
              tw`flex-row items-center mb-4 px-4 py-3 rounded-4`,
              darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-lg`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              {totalDays} Days
            </Text>
          </View>

          {/* Progress Bar (if started) */}
          {isStarted && (
            <View style={tw`mb-4`}>
              <View style={tw`flex-row justify-between items-center mb-2`}>
                <Text
                  style={[
                    tw`font-nokia-bold text-sm`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}>
                  Progress
                </Text>
                <Text
                  style={[
                    tw`font-nokia-bold text-sm`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}>
                  {completedDays.length} / {totalDays} days
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
                    {width: `${progressPercentage}%`},
                  ]}
                />
              </View>
            </View>
          )}

          {/* Start/Continue Button */}
          <TouchableOpacity
            style={[
              tw`flex-row items-center justify-center py-4 px-6 rounded-4 mb-6`,
              {backgroundColor: '#EA9215'},
              (isStarting || isLoading) && tw`opacity-50`,
            ]}
            onPress={isStarted ? handleContinuePlan : handleStartPlan}
            disabled={isStarting || isLoading}>
            {isStarting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                {isStarted ? (
                  <>
                    <Play size={20} color="#FFFFFF" weight="fill" />
                    <Text
                      style={tw`font-nokia-bold text-primary-1 text-lg ml-2`}>
                      Continue Plan
                    </Text>
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} color="#FFFFFF" weight="fill" />
                    <Text
                      style={tw`font-nokia-bold text-primary-1 text-lg ml-2`}>
                      Start Plan
                    </Text>
                  </>
                )}
              </>
            )}
          </TouchableOpacity>

          {/* Other Plans Section */}
          <View style={tw`mt-4`}>
            <Text
              style={[
                tw`font-nokia-bold text-lg mb-4`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Other Plans
            </Text>
            {/* You can add a carousel or list of other plans here */}
            <Text
              style={[
                tw`font-nokia-bold text-sm`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              Browse more devotion plans to continue your spiritual journey.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DevotionPlanDetails;

