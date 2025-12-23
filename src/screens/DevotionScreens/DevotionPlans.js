import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from 'react-native';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, CheckCircle} from 'phosphor-react-native';
import tw from './../../../tailwind';
import Toast from 'react-native-toast-message';
import {
  useGetDevotionPlansQuery,
  useGetMyDevotionPlansQuery,
  useStartDevotionPlanMutation,
  useRestartDevotionPlanMutation,
} from '../../redux/api-slices/apiSlice';
import DevotionPlanCard from '../../components/DevotionPlanCard';

const DevotionPlans = () => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const user = useSelector(state => state.auth.user);
  const navigation = useNavigation();
  const [tab, setTab] = useState('find'); // 'find', 'my', 'completed'
  const [activeTab, setActiveTab] = useState('plan'); // 'devotional' or 'plan'

  const {data: findPlans = [], isLoading: loadingFind} =
    useGetDevotionPlansQuery();
  const {data: myPlans = [], isLoading: loadingMy, refetch: refetchMy} =
    useGetMyDevotionPlansQuery({status: 'in_progress'});
  const {data: completedPlans = [], isLoading: loadingCompleted} =
    useGetMyDevotionPlansQuery({status: 'completed'});

  const [startPlan] = useStartDevotionPlanMutation();
  const [restartPlan] = useRestartDevotionPlanMutation();

  const handleStartPlan = async planId => {
    if (!user) {
      Toast.show({
        type: 'info',
        text1: 'Sign In Required',
        text2: 'Please log in to start a devotion plan.',
      });
      return;
    }

    try {
      await startPlan(planId).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Plan Started!',
        text2: 'Your devotion plan journey begins now.',
      });
      await refetchMy();
      // Navigate to plan viewer
      navigation.navigate('Devotional', {
        screen: 'PlanDevotionViewer',
        params: {planId},
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Start Plan',
        text2: error?.data?.message || 'Please try again.',
      });
    }
  };

  const handleRestartPlan = async planId => {
    try {
      await restartPlan(planId).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Plan Restarted!',
        text2: 'Your progress has been reset.',
      });
      await refetchMy();
      navigation.navigate('Devotional', {
        screen: 'PlanDevotionViewer',
        params: {planId},
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Restart Plan',
        text2: error?.data?.message || 'Please try again.',
      });
    }
  };

  const renderPlanCard = ({item, withProgress = false, isCompleted = false}) => {
    const plan = item.plan || item;
    const progress = item.progress;

    return (
      <View style={tw`mb-4`}>
        <View
          style={[
            tw`border border-accent-6 rounded-4 p-3`,
            darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
          ]}>
          <View style={tw`h-40 mb-2`}>
            <Image
              source={{
                uri: plan.image || 'https://via.placeholder.com/300x200',
              }}
              style={tw`w-full h-full rounded-3`}
              resizeMode="cover"
            />
          </View>
          <Text
            style={[
              tw`font-nokia-bold text-lg mb-1`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}
            numberOfLines={2}>
            {plan.title}
          </Text>
          {plan.description && (
            <Text
              style={[
                tw`font-nokia-bold text-sm mb-2`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}
              numberOfLines={3}>
              {plan.description}
            </Text>
          )}
          <Text
            style={tw`font-nokia-bold text-accent-6 text-sm mb-2`}>
            {plan.numItems || 0} days
          </Text>

          {withProgress && progress && (
            <View style={tw`mb-3`}>
              <View style={tw`flex-row justify-between items-center mb-1`}>
                <Text
                  style={[
                    tw`font-nokia-bold text-xs`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}>
                  Progress: {progress.percent || 0}%
                </Text>
              </View>
              <View
                style={[
                  tw`h-2 rounded-full overflow-hidden`,
                  darkMode ? tw`bg-secondary-9` : tw`bg-primary-4`,
                ]}>
                <View
                  style={[
                    tw`h-full bg-accent-6`,
                    {width: `${progress.percent || 0}%`},
                  ]}
                />
              </View>
            </View>
          )}

          {isCompleted && (
            <View
              style={tw`mb-2 px-2 py-1 rounded-full bg-green-500 self-start`}>
              <Text style={tw`font-nokia-bold text-primary-1 text-xs`}>
                Completed
              </Text>
            </View>
          )}

          <View style={tw`flex-row gap-2`}>
            {isCompleted ? (
              <TouchableOpacity
                style={tw`flex-1 bg-accent-6 px-4 py-2 rounded-full`}
                onPress={() => handleRestartPlan(plan._id)}>
                <Text
                  style={tw`text-primary-1 font-nokia-bold text-sm text-center`}>
                  Restart Plan
                </Text>
              </TouchableOpacity>
            ) : withProgress ? (
              <TouchableOpacity
                style={tw`flex-1 bg-accent-6 px-4 py-2 rounded-full`}
                onPress={() =>
                  navigation.navigate('Devotional', {
                    screen: 'PlanDevotionViewer',
                    params: {planId: plan._id},
                  })
                }>
                <Text
                  style={tw`text-primary-1 font-nokia-bold text-sm text-center`}>
                  Continue Plan
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={tw`flex-1 bg-accent-6 px-4 py-2 rounded-full`}
                onPress={() => handleStartPlan(plan._id)}>
                <Text
                  style={tw`text-primary-1 font-nokia-bold text-sm text-center`}>
                  Start Plan
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (tab === 'find') {
      if (loadingFind) {
        return (
          <View style={tw`flex-1 justify-center items-center py-20`}>
            <ActivityIndicator size="large" color="#EA9215" />
            <Text
              style={[
                tw`font-nokia-bold text-lg mt-4`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Loading Plans...
            </Text>
          </View>
        );
      }

      if (!findPlans || findPlans.length === 0) {
        return (
          <View style={tw`flex-1 justify-center items-center py-20`}>
            <Text
              style={[
                tw`font-nokia-bold text-lg text-center`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              No devotion plans available
            </Text>
          </View>
        );
      }

      // Check which plans are completed
      const completedPlanIds = new Set(
        (completedPlans || []).map(p => p.planId || p.plan?._id),
      );

      return (
        <FlatList
          data={findPlans}
          keyExtractor={item => item._id}
          renderItem={({item}) => {
            const isCompleted = completedPlanIds.has(item._id);
            return renderPlanCard({item, isCompleted});
          }}
          contentContainerStyle={tw`pb-4`}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (tab === 'my') {
      if (loadingMy) {
        return (
          <View style={tw`flex-1 justify-center items-center py-20`}>
            <ActivityIndicator size="large" color="#EA9215" />
            <Text
              style={[
                tw`font-nokia-bold text-lg mt-4`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Loading Your Plans...
            </Text>
          </View>
        );
      }

      if (!myPlans || myPlans.length === 0) {
        return (
          <View style={tw`flex-1 justify-center items-center py-20`}>
            <Text
              style={[
                tw`font-nokia-bold text-lg text-center`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              No active plans started
            </Text>
          </View>
        );
      }

      return (
        <FlatList
          data={myPlans}
          keyExtractor={item => item._id || item.planId}
          renderItem={({item}) => renderPlanCard({item, withProgress: true})}
          contentContainerStyle={tw`pb-4`}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (tab === 'completed') {
      if (loadingCompleted) {
        return (
          <View style={tw`flex-1 justify-center items-center py-20`}>
            <ActivityIndicator size="large" color="#EA9215" />
            <Text
              style={[
                tw`font-nokia-bold text-lg mt-4`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Loading Completed Plans...
            </Text>
          </View>
        );
      }

      if (!completedPlans || completedPlans.length === 0) {
        return (
          <View style={tw`flex-1 justify-center items-center py-20`}>
            <Text
              style={[
                tw`font-nokia-bold text-lg text-center`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              No completed plans yet
            </Text>
          </View>
        );
      }

      return (
        <FlatList
          data={completedPlans}
          keyExtractor={item => item._id || item.planId}
          renderItem={({item}) =>
            renderPlanCard({item, withProgress: true, isCompleted: true})
          }
          contentContainerStyle={tw`pb-4`}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView
      style={darkMode ? tw`bg-secondary-9 flex-1` : tw`bg-primary-1 flex-1`}>
      <View style={tw`flex mx-auto w-11/12`}>
        {/* Header */}
        <View style={tw`flex-row items-center justify-between my-4`}>
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Devotional', {
                  screen: 'DevotionalHome',
                });
              }
            }}>
            <ArrowLeft size={24} color={darkMode ? '#F9FAFB' : '#1F2937'} />
          </TouchableOpacity>
          <Text
            style={[
              tw`font-nokia-bold text-xl`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Devotion Plans
          </Text>
          <View style={tw`flex flex-row items-center gap-2`}>
            {/* Sliding buttons for Devotional/Devotional Plan */}
            <View
              style={tw`flex-row bg-secondary-7 rounded-full p-1 ${
                darkMode ? 'bg-secondary-8' : ''
              }`}>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab('devotional');
                  navigation.navigate('Devotional', {
                    screen: 'DevotionalHome',
                  });
                }}
                style={tw`px-3 py-1.5 rounded-full ${
                  activeTab === 'devotional'
                    ? 'bg-accent-6'
                    : darkMode
                    ? 'bg-transparent'
                    : 'bg-transparent'
                }`}>
                <Text
                  style={tw`font-nokia-bold text-xs ${
                    activeTab === 'devotional'
                      ? 'text-white'
                      : darkMode
                      ? 'text-primary-3'
                      : 'text-secondary-6'
                  }`}>
                  Devotional
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('plan')}
                style={tw`px-3 py-1.5 rounded-full ${
                  activeTab === 'plan'
                    ? 'bg-accent-6'
                    : darkMode
                    ? 'bg-transparent'
                    : 'bg-transparent'
                }`}>
                <Text
                  style={tw`font-nokia-bold text-xs ${
                    activeTab === 'plan'
                      ? 'text-white'
                      : darkMode
                      ? 'text-primary-3'
                      : 'text-secondary-6'
                  }`}>
                  Devotional Plan
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={tw`flex-row gap-2 mb-4`}>
          <TouchableOpacity
            style={[
              tw`flex-1 px-4 py-2 rounded-full`,
              tab === 'find'
                ? tw`bg-accent-6`
                : tw`border border-accent-6`,
            ]}
            onPress={() => setTab('find')}>
            <Text
              style={[
                tw`font-nokia-bold text-sm text-center`,
                tab === 'find'
                  ? tw`text-primary-1`
                  : darkMode
                  ? tw`text-primary-3`
                  : tw`text-secondary-6`,
              ]}>
              Find Plans
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              tw`flex-1 px-4 py-2 rounded-full`,
              tab === 'my' ? tw`bg-accent-6` : tw`border border-accent-6`,
            ]}
            onPress={() => setTab('my')}>
            <Text
              style={[
                tw`font-nokia-bold text-sm text-center`,
                tab === 'my'
                  ? tw`text-primary-1`
                  : darkMode
                  ? tw`text-primary-3`
                  : tw`text-secondary-6`,
              ]}>
              My Plans
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              tw`flex-1 px-4 py-2 rounded-full`,
              tab === 'completed'
                ? tw`bg-accent-6`
                : tw`border border-accent-6`,
            ]}
            onPress={() => setTab('completed')}>
            <Text
              style={[
                tw`font-nokia-bold text-sm text-center`,
                tab === 'completed'
                  ? tw`text-primary-1`
                  : darkMode
                  ? tw`text-primary-3`
                  : tw`text-secondary-6`,
              ]}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sign in message */}
        {!user && (
          <View
            style={[
              tw`border border-accent-6 rounded-4 p-3 mb-4`,
              darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-base mb-1`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Sign in to track progress
            </Text>
            <Text
              style={[
                tw`font-nokia-bold text-sm`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              Please log in or create an account to save your devotion plan
              progress.
            </Text>
          </View>
        )}

        {/* Content */}
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

export default DevotionPlans;
