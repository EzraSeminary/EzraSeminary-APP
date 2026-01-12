import React, {useState, useEffect} from 'react';
import useCalculateLessonIndex from './hooks/useCalculateLessonIndex';
import {useSelector} from 'react-redux';
import {
  useGetSSLOfDayQuery,
  useGetSSLOfQuarterQuery,
  useInvalidateSSLCacheMutation,
} from '../../services/SabbathSchoolApi';
import {useNavigation} from '@react-navigation/native';
import DateConverter from './DateConverter';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowClockwise,
  Warning,
  CloudSlash,
  Database,
} from 'phosphor-react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import tw from './../../../tailwind';
import {format} from 'date-fns';
import {saveSSLLessonToCache} from '../../utils/sslCache';

const HomeCurrentSSL = () => {
  const currentDate = new Date().toISOString().slice(0, 10);
  const [quarter, week] = useCalculateLessonIndex(currentDate);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [isRefetching, setIsRefetching] = useState(false);
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const navigation = useNavigation();
  const [invalidateSSLCache] = useInvalidateSSLCacheMutation();
  // Guard against infinite loading on home card
  useEffect(() => {
    let timeoutId;
    if (lessonIsLoading || quarterIsLoading) {
      timeoutId = setTimeout(() => setLoadingTimeout(true), 10000);
    } else {
      setLoadingTimeout(false);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [lessonIsLoading, quarterIsLoading]);
  const {
    data: lessonDetails,
    error: lessonError,
    isLoading: lessonIsLoading,
    refetch: refetchLesson,
  } = useGetSSLOfDayQuery({path: quarter, id: week});
  const {
    data: quarterDetails,
    error: quarterError,
    isLoading: quarterIsLoading,
    refetch: refetchQuarter,
  } = useGetSSLOfQuarterQuery(quarter);

  useEffect(() => {
    if (quarterDetails) {
      setBackgroundImage(quarterDetails.quarterly.splash);
    }
  }, [quarterDetails]);

  // Background check for new lessons on app launch with cooldown
  useEffect(() => {
    const COOLDOWN_KEY = 'ssl_last_background_check';
    const COOLDOWN_MINUTES = 15; // Only check every 15 minutes

    const checkForNewLessonsOnLaunch = async () => {
      try {
        // Check if we're within cooldown period
        const lastCheckStr = await AsyncStorage.getItem(COOLDOWN_KEY);
        const lastCheck = lastCheckStr ? new Date(lastCheckStr) : null;
        const now = new Date();
        const timeSinceLastCheck = lastCheck
          ? (now.getTime() - lastCheck.getTime()) / (1000 * 60)
          : Infinity;

        if (timeSinceLastCheck < COOLDOWN_MINUTES) {
          console.log(
            `⏳ SSL background check skipped - cooldown active (${Math.round(
              COOLDOWN_MINUTES - timeSinceLastCheck,
            )} min remaining)`,
          );
          return;
        }

        // Check internet connectivity
        const netInfo = await NetInfo.fetch();

        if (netInfo.isConnected && netInfo.isInternetReachable) {
          console.log('🔄 Checking for new lessons in background...');
          setIsBackgroundUpdating(true);

          // Store current data for comparison
          const previousLessonId = lessonDetails?.lesson?.id;
          const previousQuarterId = quarterDetails?.quarterly?.id;
          const previousLessonTitle = lessonDetails?.lesson?.title;
          const previousQuarterTitle = quarterDetails?.quarterly?.title;

          // Force cache invalidation to get fresh data
          await invalidateSSLCache();
          await new Promise(resolve => setTimeout(resolve, 300));

          // Silent background refresh with fresh data
          const [lessonResult, quarterResult] = await Promise.all([
            refetchLesson(),
            refetchQuarter(),
          ]);

          // Update last check timestamp
          await AsyncStorage.setItem(COOLDOWN_KEY, now.toISOString());

          // Check if content was updated and show success feedback
          const newLessonId = lessonResult.data?.lesson?.id;
          const newQuarterId = quarterResult.data?.quarterly?.id;
          const newLessonTitle = lessonResult.data?.lesson?.title;
          const newQuarterTitle = quarterResult.data?.quarterly?.title;

          // More comprehensive comparison
          const lessonChanged =
            (previousLessonId &&
              newLessonId &&
              previousLessonId !== newLessonId) ||
            (previousLessonTitle &&
              newLessonTitle &&
              previousLessonTitle !== newLessonTitle);

          const quarterChanged =
            (previousQuarterId &&
              newQuarterId &&
              previousQuarterId !== newQuarterId) ||
            (previousQuarterTitle &&
              newQuarterTitle &&
              previousQuarterTitle !== newQuarterTitle);

          if (lessonChanged || quarterChanged) {
            Toast.show({
              type: 'success',
              text1: 'New Content Available!',
              text2: 'Updated lesson data has been loaded.',
              visibilityTime: 3000,
            });
            console.log('🎉 New lesson content detected and updated');
          } else {
            console.log('✅ Background check completed - no new content');
          }
        } else {
          console.log(
            '📶 No internet connection - skipping background lesson check',
          );
        }
      } catch (error) {
        // Silent fail - don't show errors for background updates
        console.warn('Background lesson check failed:', error);
      } finally {
        setIsBackgroundUpdating(false);
      }
    };

    // Run background check on component mount (app launch)
    checkForNewLessonsOnLaunch();
  }, [
    refetchLesson,
    refetchQuarter,
    lessonDetails?.lesson?.id,
    lessonDetails?.lesson?.title,
    quarterDetails?.quarterly?.id,
    quarterDetails?.quarterly?.title,
    invalidateSSLCache,
  ]); // Include IDs and titles for comparison

  const darkMode = useSelector(state => state.ui.darkMode);
  const language = useSelector(state => state.language.language);

  const handleOpenButtonPress = async () => {
    // Cache lesson and quarter data before navigation
    // The lesson data will be fully cached when SSLWeek loads
    if (quarterDetails && lessonDetails && quarter && week) {
      try {
        // Save with available data - full lesson data will be cached in SSLWeek
        await saveSSLLessonToCache(
          quarter,
          week,
          lessonDetails?.lesson || null,
          quarterDetails,
        );
      } catch (error) {
        console.error('Error caching SSL lesson data:', error);
      }
    }

    navigation.navigate('SSL', {
      screen: 'SSLWeek',
      params: {
        ssl: quarter,
        weekId: week,
      },
    });
  };

  const handleRefetch = async () => {
    setIsRefetching(true);
    try {
      // Check internet connectivity first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        Toast.show({
          type: 'info',
          text1: 'No Internet Connection',
          text2: 'Please check your internet connection and try again.',
        });
        return;
      }

      console.log('🔄 Force refreshing SSL data...');

      // Force invalidate all SSL caches to bypass any cached errors
      await invalidateSSLCache();

      // Wait a moment for cache invalidation to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force refetch with fresh data (bypass cache completely)
      const [lessonResult, quarterResult] = await Promise.all([
        refetchLesson(),
        refetchQuarter(),
      ]);

      console.log('✅ SSL data refreshed successfully');

      // Show success message if data was found
      if (lessonResult.data && quarterResult.data) {
        Toast.show({
          type: 'success',
          text1: 'Data Updated',
          text2: 'New lesson data has been loaded successfully.',
        });
      }
    } catch (error) {
      console.error('❌ Refetch error:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Unable to fetch new data. Please try again later.',
      });
    } finally {
      setIsRefetching(false);
    }
  };

  const parseCustomDate = dateString => {
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  const formatDateRange = (startDate, endDate) => {
    try {
      const start = format(parseCustomDate(startDate), 'MMM dd');
      const end = format(parseCustomDate(endDate), 'MMM dd');
      return `${start} - ${end}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  if ((lessonIsLoading || quarterIsLoading) && !loadingTimeout) {
    return (
      <View
        style={[
          tw`rounded-4 p-6 mx-2 my-4 shadow-sm`,
          {
            backgroundColor: darkMode ? '#374151' : '#F8FAFC',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            shadowColor: '#64748B',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          },
        ]}>
        {/* Loading Icon and Indicator */}
        <View style={tw`items-center mb-4`}>
          <View
            style={[
              tw`w-16 h-16 rounded-full items-center justify-center mb-3`,
              {backgroundColor: 'rgba(234, 146, 21, 0.1)'},
            ]}>
            <ActivityIndicator size="large" color="#EA9215" />
          </View>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-2`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Loading Lesson
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center opacity-80 leading-relaxed`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            Fetching the latest Sabbath School lesson...
          </Text>
        </View>

        {/* Loading Progress Skeleton */}

        <View style={tw`space-y-3`}>
          {/* Title Skeleton */}
          <View
            style={[
              tw`h-4 rounded-full`,
              {
                backgroundColor: darkMode ? '#4B5563' : '#E5E7EB',
                width: '80%',
              },
            ]}>
            <View
              style={[
                tw`h-full rounded-full`,
                {
                  backgroundColor: '#EA9215',
                  width: '60%',
                  opacity: 0.3,
                },
              ]}
            />
          </View>

          {/* Subtitle Skeleton */}
          <View
            style={[
              tw`h-3 rounded-full`,
              {
                backgroundColor: darkMode ? '#4B5563' : '#E5E7EB',
                width: '65%',
              },
            ]}>
            <View
              style={[
                tw`h-full rounded-full`,
                {
                  backgroundColor: '#EA9215',
                  width: '40%',
                  opacity: 0.3,
                },
              ]}
            />
          </View>

          {/* Date Skeleton */}
          <View
            style={[
              tw`h-3 rounded-full`,
              {
                backgroundColor: darkMode ? '#4B5563' : '#E5E7EB',
                width: '45%',
              },
            ]}>
            <View
              style={[
                tw`h-full rounded-full`,
                {
                  backgroundColor: '#EA9215',
                  width: '30%',
                  opacity: 0.3,
                },
              ]}
            />
          </View>
        </View>

        {/* Loading Dots Animation */}
        <View style={tw`flex-row justify-center mt-6 space-x-2`}>
          {[0, 1, 2].map(index => (
            <View
              key={index}
              style={[
                tw`w-2 h-2 rounded-full`,
                {
                  backgroundColor: '#EA9215',
                  opacity: 0.4 + index * 0.2,
                },
              ]}
            />
          ))}
        </View>

        {/* Helper Text */}
        <Text
          style={[
            tw`font-nokia-bold text-xs text-center mt-4 opacity-60`,
            darkMode ? tw`text-primary-3` : tw`text-secondary-5`,
          ]}>
          This may take a few moments...
        </Text>
      </View>
    );
  }

  if (lessonError) {
    // Error is already logged at API level, just show UI
    return (
      <View
        style={[
          tw`rounded-4 p-6 mx-2 my-4 shadow-sm`,
          {
            backgroundColor: darkMode ? '#374151' : '#FEF7F0',
            borderWidth: 1,
            borderColor: '#EA9215',
            shadowColor: '#EA9215',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          },
        ]}>
        {/* Icon and Status */}
        <View style={tw`items-center mb-4`}>
          <View
            style={[
              tw`w-16 h-16 rounded-full items-center justify-center mb-3`,
              {backgroundColor: 'rgba(234, 146, 21, 0.1)'},
            ]}>
            <CloudSlash size={32} color="#EA9215" weight="bold" />
          </View>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-2`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Quarterly Update Pending
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center opacity-80 leading-relaxed`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            The new quarterly lessons are being prepared.{'\n'}
            Please check back later or try refreshing.
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            tw`flex-row items-center justify-center py-3 px-6 rounded-full`,
            {
              backgroundColor: '#EA9215',
              shadowColor: '#EA9215',
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            },
            isRefetching && tw`opacity-80`,
          ]}
          onPress={handleRefetch}
          disabled={isRefetching}>
          {isRefetching ? (
            <ActivityIndicator color="#FFFFFF" size="small" style={tw`mr-2`} />
          ) : (
            <ArrowClockwise
              size={20}
              color="#FFFFFF"
              weight="bold"
              style={tw`mr-2`}
            />
          )}
          <Text style={tw`text-white font-nokia-bold text-base`}>
            {isRefetching ? 'Refreshing...' : 'Try Again'}
          </Text>
        </TouchableOpacity>

        {/* Helper Text */}
        <Text
          style={[
            tw`font-nokia-bold text-xs text-center mt-3 opacity-60`,
            darkMode ? tw`text-primary-3` : tw`text-secondary-5`,
          ]}>
          New lessons are typically available at the start of each quarter
        </Text>
      </View>
    );
  }

  if (quarterError) {
    // Error is already logged at API level, just show UI
    return (
      <View
        style={[
          tw`rounded-4 p-6 mx-2 my-4 shadow-sm`,
          {
            backgroundColor: darkMode ? '#374151' : '#FEF2F2',
            borderWidth: 1,
            borderColor: '#EF4444',
            shadowColor: '#EF4444',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          },
        ]}>
        {/* Icon and Status */}
        <View style={tw`items-center mb-4`}>
          <View
            style={[
              tw`w-16 h-16 rounded-full items-center justify-center mb-3`,
              {backgroundColor: 'rgba(239, 68, 68, 0.1)'},
            ]}>
            <Warning size={32} color="#EF4444" weight="bold" />
          </View>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-2`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Connection Error
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center opacity-80 leading-relaxed`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            Unable to load quarterly content.{'\n'}
            Please check your internet connection and try again.
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            tw`flex-row items-center justify-center py-3 px-6 rounded-full`,
            {
              backgroundColor: '#EF4444',
              shadowColor: '#EF4444',
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            },
            isRefetching && tw`opacity-80`,
          ]}
          onPress={handleRefetch}
          disabled={isRefetching}>
          {isRefetching ? (
            <ActivityIndicator color="#FFFFFF" size="small" style={tw`mr-2`} />
          ) : (
            <ArrowClockwise
              size={20}
              color="#FFFFFF"
              weight="bold"
              style={tw`mr-2`}
            />
          )}
          <Text style={tw`text-white font-nokia-bold text-base`}>
            {isRefetching ? 'Retrying...' : 'Retry'}
          </Text>
        </TouchableOpacity>

        {/* Error Details (Optional) */}
        {quarterError.error && (
          <Text
            style={[
              tw`font-nokia-bold text-xs text-center mt-3 opacity-50`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-5`,
            ]}>
            Error: {quarterError.error}
          </Text>
        )}
      </View>
    );
  }

  if (!quarterDetails || !lessonDetails) {
    return (
      <View
        style={[
          tw`rounded-4 p-6 mx-2 my-4 shadow-sm`,
          {
            backgroundColor: darkMode ? '#374151' : '#FEF2F2',
            borderWidth: 1,
            borderColor: '#EF4444',
            shadowColor: '#EF4444',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          },
        ]}>
        {/* Icon and Status */}
        <View style={tw`items-center mb-4`}>
          <View
            style={[
              tw`w-16 h-16 rounded-full items-center justify-center mb-3`,
              {backgroundColor: 'rgba(239, 68, 68, 0.1)'},
            ]}>
            <Database size={32} color="#EF4444" weight="bold" />
          </View>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-2`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Missing Data
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center opacity-80 leading-relaxed`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            The data for this lesson is missing.{'\n'}
            Please check your internet connection and try again.
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            tw`flex-row items-center justify-center py-3 px-6 rounded-full`,
            {
              backgroundColor: '#EF4444',
              shadowColor: '#EF4444',
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            },
            isRefetching && tw`opacity-80`,
          ]}
          onPress={handleRefetch}
          disabled={isRefetching}>
          {isRefetching ? (
            <ActivityIndicator color="#FFFFFF" size="small" style={tw`mr-2`} />
          ) : (
            <ArrowClockwise
              size={20}
              color="#FFFFFF"
              weight="bold"
              style={tw`mr-2`}
            />
          )}
          <Text style={tw`text-white font-nokia-bold text-base`}>
            {isRefetching ? 'Retrying...' : 'Retry'}
          </Text>
        </TouchableOpacity>

        {/* Helper Text */}
        <Text
          style={[
            tw`font-nokia-bold text-xs text-center mt-3 opacity-60`,
            darkMode ? tw`text-primary-3` : tw`text-secondary-5`,
          ]}>
          New lessons are typically available at the start of each quarter
        </Text>
      </View>
    );
  }

  return (
    <View style={tw`rounded-2 overflow-hidden`}>
      {/* Background Update Indicator */}
      {isBackgroundUpdating && (
        <View
          style={[
            tw`flex-row items-center justify-center py-2 px-4 mb-2 rounded-full`,
            {
              backgroundColor: darkMode ? '#374151' : '#FEF7F0',
              borderWidth: 1,
              borderColor: '#EA9215',
            },
          ]}>
          <ActivityIndicator size="small" color="#EA9215" style={tw`mr-2`} />
          <Text
            style={[
              tw`font-nokia-bold text-xs`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            Checking for lesson updates...
          </Text>
        </View>
      )}

      <View
        style={tw`flex flex-row border border-accent-6 mt-4 rounded-4 p-2 gap-2`}>
        <View style={tw`h-32 w-32 flex-shrink-0`}>
          <Image
            source={{
              uri: backgroundImage,
            }}
            style={tw`w-full h-full rounded-3`}
          />
        </View>
        <View style={tw`flex-1 pr-1`}>
          <Text
            style={tw`font-nokia-bold text-accent-6 text-sm leading-tight`}
            numberOfLines={2}
            ellipsizeMode="tail">
            {quarterDetails.quarterly.title}
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-secondary-6 text-lg leading-tight mt-1`,
              darkMode ? tw`text-primary-3` : null,
            ]}
            numberOfLines={3}
            ellipsizeMode="tail">
            {lessonDetails.lesson.title}
          </Text>
          <View style={tw`border-b border-accent-6 mt-1 w-[63%]`} />
          <View style={tw`mt-2`}>
            <Text
              style={[
                tw`font-nokia-bold text-secondary-5 text-xs`,
                darkMode ? tw`text-primary-3` : null,
              ]}>
              {language === 'en' ? (
                <Text style={tw`font-nokia-bold text-accent-6`}>
                  {formatDateRange(
                    lessonDetails.lesson.start_date,
                    lessonDetails.lesson.end_date,
                  )}
                </Text>
              ) : (
                <View style={tw`flex flex-row items-center`}>
                  <DateConverter
                    gregorianDate={lessonDetails.lesson.start_date}
                    textStyle={tw`font-nokia-bold text-accent-6`}
                  />
                  <Text
                    style={[
                      tw`font-nokia-bold text-secondary-5`,
                      darkMode ? 'text-primary-1' : null,
                    ]}>
                    {' '}
                    -{' '}
                  </Text>
                  <DateConverter
                    gregorianDate={lessonDetails.lesson.end_date}
                    textStyle={tw`font-nokia-bold text-accent-6`}
                  />
                </View>
              )}
            </Text>
          </View>
          <TouchableOpacity
            style={tw`bg-accent-6 px-4 py-1 rounded-full self-start mt-2`}
            onPress={handleOpenButtonPress}>
            <Text
              style={tw`text-primary-1 font-nokia-bold text-sm text-center`}>
              {language === 'en' ? 'Open Lesson' : 'ትምህርቱን ክፈት'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default HomeCurrentSSL;
