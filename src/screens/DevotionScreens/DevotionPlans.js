import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {useBottomTabBarHeight} from '@react-navigation/bottom-tabs';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowLeft} from 'phosphor-react-native';
import tw from './../../../tailwind';
import Toast from 'react-native-toast-message';
import {
  useGetDevotionPlansQuery,
  useGetMyDevotionPlansQuery,
  useStartDevotionPlanMutation,
  useRestartDevotionPlanMutation,
} from '../../redux/api-slices/apiSlice';
import {
  saveHomeScreenToCache,
  getCachedHomeScreen,
} from '../../utils/homeScreenCache';
import networkManager from '../../utils/networkManager';
import {formatDevotionPlanForSharing} from '../../utils/textFormatter';
import AndroidStatusBarSpacer from '../../components/AndroidStatusBarSpacer';

const DevotionPlans = () => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const user = useSelector(state => state.auth.user);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [tab, setTab] = useState('find'); // 'find', 'my', 'completed'
  const [activeTab, setActiveTab] = useState('plan'); // 'devotional' or 'plan'
  const listBottomPadding = tabBarHeight + Math.max(insets.bottom, 16) + 24;

  const {
    data: findPlans = [],
    isLoading: loadingFind,
    refetch: refetchFindPlans,
  } = useGetDevotionPlansQuery();
  const {
    data: myPlans = [],
    isLoading: loadingMy,
    refetch: refetchMy,
  } = useGetMyDevotionPlansQuery({status: 'in_progress'});
  const {
    data: completedPlans = [],
    isLoading: loadingCompleted,
    refetch: refetchCompleted,
  } = useGetMyDevotionPlansQuery({status: 'completed'});

  const [startPlan] = useStartDevotionPlanMutation();
  const [restartPlan] = useRestartDevotionPlanMutation();
  const [cachedHomeData, setCachedHomeData] = useState(null);
  const [isUsingCache, setIsUsingCache] = useState(false);

  const renderTopSection = () => (
    <>
      <View style={tw`flex flex-row items-center justify-center my-4 relative`}>
        <TouchableOpacity
          style={tw`absolute left-0`}
          onPress={() => {
            navigation.getParent()?.navigate('Home');
          }}>
          <ArrowLeft size={28} weight="bold" color="#EA9215" />
        </TouchableOpacity>
        <View
          style={[
            tw`flex-row rounded-full p-1`,
            {
              backgroundColor: darkMode ? '#374151' : '#E5E7EB',
            },
          ]}>
          <TouchableOpacity
            onPress={() => {
              setActiveTab('devotional');
              navigation.navigate('Devotional', {
                screen: 'DevotionalHome',
              });
            }}
            style={[
              tw`px-4 py-2 rounded-full`,
              {
                backgroundColor:
                  activeTab === 'devotional' ? '#EA9215' : 'transparent',
              },
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-sm`,
                {
                  color:
                    activeTab === 'devotional'
                      ? '#FFFFFF'
                      : darkMode
                      ? '#D1D5DB'
                      : '#4B5563',
                },
              ]}>
              Devotional
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('plan')}
            style={[
              tw`px-4 py-2 rounded-full`,
              {
                backgroundColor:
                  activeTab === 'plan' ? '#EA9215' : 'transparent',
              },
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-sm`,
                {
                  color:
                    activeTab === 'plan'
                      ? '#FFFFFF'
                      : darkMode
                      ? '#D1D5DB'
                      : '#4B5563',
                },
              ]}>
              Devotional Plan
            </Text>
          </TouchableOpacity>
        </View>
        <View style={tw`absolute right-0 w-7`} />
      </View>

      <View style={tw`flex-row gap-2 mb-4`}>
        <TouchableOpacity
          style={[
            tw`flex-1 px-4 py-2 rounded-full`,
            tab === 'find' ? tw`bg-accent-6` : tw`border border-accent-6`,
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
            tab === 'completed' ? tw`bg-accent-6` : tw`border border-accent-6`,
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
    </>
  );

  // Cache home screen data when loaded with internet
  useEffect(() => {
    if (
      networkManager.isOnline &&
      findPlans.length > 0 &&
      (myPlans.length > 0 || completedPlans.length > 0 || !user)
    ) {
      const homeData = {
        findPlans,
        myPlans,
        completedPlans,
      };
      saveHomeScreenToCache('DevotionPlans', homeData);
    }
  }, [findPlans, myPlans, completedPlans, user]);

  // Load from cache when offline or API fails
  useEffect(() => {
    const loadFromCache = async () => {
      if (
        (!networkManager.isOnline || (loadingFind && !findPlans.length)) &&
        !findPlans.length
      ) {
        try {
          const cached = await getCachedHomeScreen('DevotionPlans');
          if (cached) {
            setCachedHomeData(cached);
            setIsUsingCache(true);
            console.log('📦 Using cached DevotionPlans data (offline/error)');
          }
        } catch (error) {
          console.error('Error loading cached DevotionPlans data:', error);
        }
      } else if (findPlans.length > 0 && isUsingCache) {
        setIsUsingCache(false);
        setCachedHomeData(null);
      }
    };

    loadFromCache();
  }, [loadingFind, findPlans.length, isUsingCache]);

  // Network connectivity listener to refetch devotion plans when connection is restored
  useEffect(() => {
    const unsubscribe = networkManager.addListener(async networkState => {
      // When network comes back online, refetch devotion plans
      if (networkState.isNowConnected) {
        console.log(
          '🌐 Network restored - Refetching devotion plans in DevotionPlans screen...',
        );
        try {
          // Refetch all devotion plan related queries
          await Promise.all([
            refetchFindPlans(),
            refetchMy(),
            refetchCompleted(),
          ]);
          console.log(
            '✅ Devotion plans refetched successfully in DevotionPlans screen',
          );
        } catch (error) {
          console.error('❌ Error refetching devotion plans:', error);
        }
      }
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, [refetchFindPlans, refetchMy, refetchCompleted]);

  // Filter plans to only show those with at least 1 day of data
  const filterPlansWithData = plans => {
    return plans.filter(item => {
      const plan = item.plan || item;
      // Only show plans that have at least 1 day (numItems > 0)
      return plan.numItems != null && plan.numItems > 0;
    });
  };

  // Use cached data if available and filter plans with data
  const displayFindPlans = filterPlansWithData(
    findPlans.length > 0 ? findPlans : cachedHomeData?.findPlans || [],
  );
  const displayMyPlans = filterPlansWithData(
    myPlans.length > 0 ? myPlans : cachedHomeData?.myPlans || [],
  );
  const displayCompletedPlans = filterPlansWithData(
    completedPlans.length > 0
      ? completedPlans
      : cachedHomeData?.completedPlans || [],
  );

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

  const handleSharePlan = async plan => {
    try {
      await Share.share({
        title: plan?.title || 'Devotion Plan',
        message: formatDevotionPlanForSharing(plan),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Share Plan',
        text2: 'Please try again.',
      });
    }
  };

  const renderPlanCard = ({
    item,
    withProgress = false,
    isCompleted = false,
  }) => {
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
          <Text style={tw`font-nokia-bold text-accent-6 text-sm mb-2`}>
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
            <TouchableOpacity
              style={tw`bg-primary-4 px-4 py-2 rounded-full`}
              onPress={() => handleSharePlan(plan)}>
              <Text
                style={tw`text-secondary-7 font-nokia-bold text-sm text-center`}>
                Share Link
              </Text>
            </TouchableOpacity>
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

  const renderPlanList = ({
    plans,
    emptyMessage,
    isLoading,
    loadingMessage,
    resolveCompleted,
    withProgress = false,
    isCompleted = false,
  }) => {
    if (isLoading) {
      return (
        <View style={tw`justify-center items-center py-20`}>
          <ActivityIndicator size="large" color="#EA9215" />
          <Text
            style={[
              tw`font-nokia-bold text-lg mt-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            {loadingMessage}
          </Text>
        </View>
      );
    }

    if (!plans || plans.length === 0) {
      return (
        <View style={tw`justify-center items-center py-20`}>
          <Text
            style={[
              tw`font-nokia-bold text-lg text-center`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            {emptyMessage}
          </Text>
        </View>
      );
    }

    return plans.map(item =>
      renderPlanCard({
        item,
        withProgress,
        isCompleted: resolveCompleted ? resolveCompleted(item) : isCompleted,
      }),
    );
  };

  const renderContent = () => {
    if (tab === 'find') {
      const completedPlanIds = new Set(
        (displayCompletedPlans || []).map(p => p.planId || p.plan?._id),
      );

      return renderPlanList({
        plans: displayFindPlans,
        emptyMessage: 'No devotion plans available',
        isLoading: loadingFind,
        loadingMessage: 'Loading Plans...',
        resolveCompleted: item => completedPlanIds.has(item._id),
      });
    }

    if (tab === 'my') {
      return renderPlanList({
        plans: displayMyPlans,
        emptyMessage: 'No active plans started',
        isLoading: loadingMy,
        loadingMessage: 'Loading Your Plans...',
        withProgress: true,
      });
    }

    if (tab === 'completed') {
      return renderPlanList({
        plans: displayCompletedPlans,
        emptyMessage: 'No completed plans yet',
        isLoading: loadingCompleted,
        loadingMessage: 'Loading Completed Plans...',
        withProgress: true,
        isCompleted: true,
      });
    }

    return null;
  };

  return (
    <View style={darkMode ? tw`bg-secondary-9` : null}>
      <SafeAreaView
        edges={Platform.OS === 'ios' ? undefined : ['left', 'right']}
        style={tw`flex mx-auto w-[92%]`}>
        <AndroidStatusBarSpacer minHeight={4} />
        {isUsingCache && (
          <View
            style={[
              tw`px-4 py-2 border-b`,
              darkMode
                ? tw`bg-secondary-8 border-secondary-7`
                : tw`bg-primary-5 border-primary-4`,
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-xs text-center`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              📦 Showing cached content (offline mode)
            </Text>
          </View>
        )}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: listBottomPadding}}>
          {renderTopSection()}
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default DevotionPlans;
