import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ImageBackground,
  Linking,
} from 'react-native';
import tw from './../../../tailwind';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {
  useGetSSLsQuery,
  useGetSSLOfDayQuery,
  useGetSSLOfQuarterQuery,
  usePrefetch,
} from '../../services/SabbathSchoolApi';
import {useGetVideoLinkQuery} from '../../services/videoLinksApi';
import useCalculateLessonIndex from './hooks/useCalculateLessonIndex';
import LinearGradient from 'react-native-linear-gradient';
import {
  YoutubeLogo,
  CloudSlash,
  Warning,
  Database,
  ArrowClockwise,
} from 'phosphor-react-native';
import ErrorScreen from '../../components/ErrorScreen';
import {format} from 'date-fns';
import DateConverter from './DateConverter';
import networkManager from '../../utils/networkManager';

const SSLHome = ({onReload}) => {
  const currentDate = new Date().toISOString().slice(0, 10);
  const [quarter, week, year] = useCalculateLessonIndex(currentDate);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [reloadingLesson, setReloadingLesson] = useState(false);
  const {data: ssl, error, isLoading, refetch} = useGetSSLsQuery();

  const {
    data: lessonDetails,
    error: lessonError,
    isLoading: lessonIsLoading,
    refetch: lessonRefetch,
  } = useGetSSLOfDayQuery({path: quarter, id: week});

  const {
    data: quarterDetails,
    error: quarterError,
    isLoading: quarterIsLoading,
    refetch: quarterRefetch,
  } = useGetSSLOfQuarterQuery(quarter);

  const lastDigitQuarter = parseInt(quarter?.slice(-1), 10);

  const {
    data: videoLink,
    error: videoError,
    isLoading: videoLoading,
  } = useGetVideoLinkQuery({
    year: year,
    quarter: lastDigitQuarter,
    lesson: week,
  });

  useEffect(() => {
    if (lessonDetails) {
      setBackgroundImage(lessonDetails.lesson.cover);
    }
  }, [lessonDetails]);

  const onRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setLoadingTimeout(false);
      setNetworkError(false);

      // Check network connectivity first
      if (!networkManager.isOnline) {
        setNetworkError(true);
        return;
      }

      await lessonRefetch();
      await quarterRefetch();
      await refetch();
    } catch (err) {
      console.error('SSL refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [lessonRefetch, quarterRefetch, refetch]);

  // Add loading timeout effect
  useEffect(() => {
    let timeoutId;
    if (
      (isLoading || lessonIsLoading || quarterIsLoading) &&
      !error &&
      !lessonError &&
      !quarterError
    ) {
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000); // 15 second timeout
    } else {
      setLoadingTimeout(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    isLoading,
    lessonIsLoading,
    quarterIsLoading,
    error,
    lessonError,
    quarterError,
  ]);

  // Check network connectivity on mount and set up listener
  useEffect(() => {
    // Initial check
    if (!networkManager.isOnline) {
      setNetworkError(true);
    }

    // Set up network state listener
    const unsubscribe = networkManager.addListener(networkState => {
      if (!networkState.isOnline) {
        setNetworkError(true);
      } else {
        setNetworkError(false);
      }
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const handleRetry = async () => {
    setLoadingTimeout(false);
    setNetworkError(false);

    if (!networkManager.isOnline) {
      setNetworkError(true);
      return;
    }

    try {
      if (onReload) {
        await onReload();
      } else {
        await refetch();
        await lessonRefetch();
        await quarterRefetch();
      }
    } catch (err) {
      console.error('SSL retry error:', err);
    }
  };

  const handleLessonReload = async () => {
    setReloadingLesson(true);

    if (!networkManager.isOnline) {
      setNetworkError(true);
      setReloadingLesson(false);
      return;
    }

    try {
      await lessonRefetch();
      await quarterRefetch();
    } catch (err) {
      console.error('Lesson reload error:', err);
    } finally {
      setReloadingLesson(false);
    }
  };

  const navigation = useNavigation();
  const darkMode = useSelector(state => state.ui.darkMode);

  const handleSearch = text => {
    setSearchTerm(text);
  };

  const filteredData = ssl?.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const language = useSelector(state => state.language.language);
  const prefetchWeeklyLessons = usePrefetch('getSSLOfDayLesson');

  // Refetch data when language changes
  useEffect(() => {
    onRefresh();
  }, [language, onRefresh]);

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

  // Handle different error states
  if (networkError && (!ssl || ssl.length === 0)) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : tw`h-100%`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
            ]}>
            No Internet Connection
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center mb-6`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-4`,
            ]}>
            Please check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4`}
            onPress={handleRetry}>
            <Text style={tw`font-nokia-bold text-white text-base`}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loadingTimeout && (!ssl || ssl.length === 0)) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : tw`h-100%`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <ActivityIndicator size="large" color="#EA9215" style={tw`mb-4`} />
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
            ]}>
            Still loading...
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center mb-6`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-4`,
            ]}>
            This is taking longer than expected. Please check your connection.
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4`}
            onPress={handleRetry}>
            <Text style={tw`font-nokia-bold text-white text-base`}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && (!ssl || ssl.length === 0)) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        {/* Compact Loading */}
        <View
          style={[
            tw`mx-4 mt-4 p-4 rounded-3 border flex-row items-center`,
            {
              backgroundColor: darkMode ? '#374151' : '#F8FAFC',
              borderColor: '#E2E8F0',
            },
          ]}>
          <ActivityIndicator size="large" color="#EA9215" style={tw`mr-3`} />
          <View style={tw`flex-1`}>
            <Text
              style={[
                tw`font-nokia-bold text-base mb-1`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Loading Lessons...
            </Text>
            <Text
              style={[
                tw`font-nokia-bold text-sm opacity-70`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              Fetching Sabbath School content
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const handleWatchYouTube = () => {
    if (videoLink && videoLink.videoUrl) {
      Linking.openURL(videoLink.videoUrl);
    } else {
      alert('Video link not available');
    }
  };

  if (error && (!ssl || ssl.length === 0)) {
    return <ErrorScreen refetch={refetch} darkMode={darkMode} />;
  }

  const handleSSLOpen = sslId => {
    navigation.navigate('SSLQuarter', {sslId});
  };

  const gradientColor = '#222222';

  const handleOpenButtonPress = async () => {
    // Prefetch all 7 days of lessons
    const prefetchPromises = [];
    for (let day = 1; day <= 7; day++) {
      const dayString = day.toString().padStart(2, '0');
      prefetchPromises.push(
        prefetchWeeklyLessons({
          path: quarter,
          id: week,
          day: dayString,
        }),
      );
    }

    // Wait for all prefetch requests to complete
    try {
      await Promise.all(prefetchPromises);
    } catch (error) {
      console.log('Prefetch error:', error);
      // Continue navigation even if prefetch fails
    }

    navigation.navigate('SSLWeek', {
      ssl: quarter,
      weekId: week,
    });
  };

  if (lessonIsLoading || quarterIsLoading || videoLoading) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        {/* Compact Loading */}
        <View
          style={[
            tw`mx-4 mt-4 p-4 rounded-3 border flex-row items-center`,
            {
              backgroundColor: darkMode ? '#374151' : '#F8FAFC',
              borderColor: '#E2E8F0',
            },
          ]}>
          <ActivityIndicator size="large" color="#EA9215" style={tw`mr-3`} />
          <View style={tw`flex-1`}>
            <Text
              style={[
                tw`font-nokia-bold text-base mb-1`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Loading Current Lesson...
            </Text>
            <Text
              style={[
                tw`font-nokia-bold text-sm opacity-70`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              Preparing your study materials
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (lessonError) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
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
          {/* Compact Error Card */}
          <View
            style={[
              tw`border-2 border-orange-400 rounded-3 p-4 mb-4 shadow-lg`,
              darkMode ? tw`bg-secondary-8` : tw`bg-orange-50`,
            ]}>
            <View style={tw`flex-row items-start`}>
              <View style={tw`flex-1 pr-3`}>
                <View style={tw`flex-row items-center mb-2`}>
                  <CloudSlash size={24} color="#EA9215" weight="fill" />
                  <Text
                    style={[
                      tw`font-nokia-bold text-lg ml-2`,
                      darkMode ? tw`text-primary-1` : tw`text-orange-700`,
                    ]}>
                    {language === 'en'
                      ? 'Quarterly Update Pending'
                      : 'የሩብ አመት ትምህርት በመጠባበቅ ላይ'}
                  </Text>
                </View>
                <Text
                  style={[
                    tw`font-nokia-bold text-sm leading-relaxed`,
                    darkMode ? tw`text-primary-3` : tw`text-orange-600`,
                  ]}>
                  {language === 'en'
                    ? 'New Sabbath School lessons are being prepared. Please check back soon or browse previous quarterly lessons below.'
                    : 'አዲስ የሰንበት ትምህርት እየተዘጋጁ ነው። እባክዎ ትንሽ ቆይተው ይመለሱ ወይም ከታች ያሉትን የቀድሞ የሩብ-አመት ትምህርቶች ይመልከቱ።'}
                </Text>
              </View>
              <TouchableOpacity
                style={tw`w-10 h-10 bg-orange-500 rounded-full items-center justify-center ml-2`}
                onPress={handleLessonReload}>
                {reloadingLesson ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ArrowClockwise size={20} color="#FFFFFF" weight="bold" />
                )}
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            placeholder={
              language === 'en' ? 'Search SSLs...' : 'የቀድሞ ትምህርቶችን ፈልግ...'
            }
            value={searchTerm}
            onChangeText={handleSearch}
            style={[
              tw`border border-primary-7 rounded-full px-4 py-2 font-nokia-bold mb-4`,
              darkMode ? tw`text-primary-1` : null,
            ]}
            placeholderTextColor={darkMode ? '#898989' : '#AAB0B4'}
          />
          <Text style={tw`font-nokia-bold text-accent-6 text-sm mt-2`}>
            {language === 'en' ? 'Quarterly Lessons' : 'የሩብ አመት ትምህርቶች'}
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-secondary-6 text-xl`,
              darkMode ? tw`text-primary-1` : null,
            ]}>
            {language === 'en'
              ? 'Past Quarterly Lessons'
              : 'ያለፉ የሩብ አመት ትምህርቶች'}
          </Text>
          <View style={tw`border-b border-accent-6 my-1`} />
          <View style={tw`flex flex-col`}>
            {filteredData.map((item, index) => (
              <View
                key={item.id}
                style={tw`flex flex-row gap-3 my-3 border border-accent-6 p-3 rounded-2`}>
                {/* Image Container */}
                <View style={tw`w-32 h-50`}>
                  <Image
                    source={{uri: item.cover}}
                    style={tw`w-full h-full rounded-2`}
                    resizeMode="cover"
                  />
                </View>

                {/* Content Container */}
                <View style={tw`flex-1 justify-between`}>
                  {/* Text Content */}
                  <View style={tw`flex-1`}>
                    <Text
                      style={tw`font-nokia-bold text-sm text-accent-6 mb-1`}>
                      {item.human_date}
                    </Text>
                    <Text
                      style={[
                        tw`font-nokia-bold text-lg text-secondary-6 leading-tight mb-2`,
                        darkMode ? tw`text-primary-1` : null,
                      ]}
                      numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={tw`border-b border-accent-6 mb-2`} />
                    <Text
                      numberOfLines={3}
                      style={[
                        tw`font-nokia-bold text-sm text-secondary-6 text-justify flex-1`,
                        darkMode ? tw`text-primary-1` : null,
                      ]}>
                      {item.description}
                    </Text>
                  </View>

                  {/* Button Container */}
                  <View style={tw`mt-3 pt-2`}>
                    <TouchableOpacity
                      style={tw`px-4 py-2 rounded-4 bg-accent-6 self-start`}
                      onPress={() => handleSSLOpen(item.id)}>
                      <Text style={tw`font-nokia-bold text-sm text-primary-1`}>
                        {language === 'en' ? 'Open Lesson' : 'ትምህርቱን ክፈት'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (quarterError) {
    return <Text> Error: {quarterError}</Text>;
  }

  if (!lessonDetails || !quarterDetails) {
    console.error('Missing lesson or quarter details:', {
      lessonDetails,
      quarterDetails,
    });
    return <Text>Loading...</Text>;
  }

  return (
    <View style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
      <SafeAreaView style={tw`flex mb-50`}>
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
          <View style={tw`rounded overflow-hidden`}>
            <ImageBackground
              source={{
                uri: backgroundImage,
              }}
              style={tw`w-full h-44 justify-end`}>
              <LinearGradient
                colors={[gradientColor, `${gradientColor}20`]}
                style={tw`absolute inset-0`}
                start={{x: 0.5, y: 1}}
                end={{x: 0.5, y: 0.2}}
              />
              <View style={[tw`absolute inset-0 rounded-lg`]}>
                <View style={tw`flex absolute bottom-0 left-0 p-4`}>
                  <Text style={tw`font-nokia-bold text-primary-6`}>
                    {language === 'en'
                      ? "This Week's Lesson"
                      : 'የዚህ ሳምንት ትምህርት'}
                  </Text>
                  <View style={tw`flex flex-row items-center`}>
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
                        <Text style={tw`font-nokia-bold text-accent-6`}>
                          {' '}
                          -{' '}
                        </Text>
                        <DateConverter
                          gregorianDate={lessonDetails.lesson.end_date}
                          textStyle={tw`font-nokia-bold text-accent-6`}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </ImageBackground>
          </View>

          <View style={tw`my-2`}>
            <Text style={tw`font-nokia-bold text-accent-6`}>
              {quarterDetails.quarterly.title}
            </Text>
            <Text
              style={[
                tw`font-nokia-bold text-secondary-6 text-2xl`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              {lessonDetails.lesson.title}
            </Text>
            <Text style={tw`font-nokia-bold text-accent-6`}>
              {quarterDetails.quarterly.human_date}
            </Text>
          </View>
          <View style={tw`border-b border-accent-6 mb-1`} />
          <Text
            style={[
              tw`font-nokia-bold text-secondary-6 text-justify`,
              darkMode ? tw`text-primary-1` : null,
            ]}>
            {'   '}
            {quarterDetails.quarterly.description}
          </Text>
          <View style={tw`flex flex-row mx-auto gap-2 items-center my-2`}>
            <TouchableOpacity
              style={tw`bg-accent-6 px-3 py-1 rounded-full`}
              onPress={handleOpenButtonPress}>
              <Text style={tw`text-primary-1 font-nokia-bold`}>
                {language === 'en' ? 'Open Lesson' : 'ትምህርቱን ክፈት'}
              </Text>
            </TouchableOpacity>

            {videoLink && (
              <TouchableOpacity
                style={tw`flex flex-row border border-accent-6 px-3 py-1 rounded-full gap-1`}
                onPress={handleWatchYouTube}>
                <Text
                  style={[
                    tw`font-nokia-bold text-secondary-6 items-center`,
                    darkMode ? tw`text-primary-1` : null,
                  ]}>
                  {language === 'en' ? 'Watch on YouTube' : 'በዩቲዩብ ይመልከቱ'}
                </Text>
                <YoutubeLogo size={20} weight="fill" color="#EA9215" />
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            placeholder={
              language === 'en' ? 'Search SSLs...' : 'የቀድሞ ትምህርቶችን ፈልግ...'
            }
            value={searchTerm}
            onChangeText={handleSearch}
            style={[
              tw`border border-primary-7 rounded-full px-4 py-2 font-nokia-bold`,
              darkMode ? tw`text-primary-1` : null,
            ]}
            placeholderTextColor={darkMode ? '#898989' : '#AAB0B4'}
          />
          <Text style={tw`font-nokia-bold text-accent-6 text-sm mt-2`}>
            {language === 'en' ? 'Quarterly Lessons' : 'የሩብ አመት ትምህርቶች'}
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-secondary-6 text-xl`,
              darkMode ? tw`text-primary-1` : null,
            ]}>
            {language === 'en'
              ? 'Past Quarterly Lessons'
              : 'ያለፉ የሩብ አመት ትምህርቶች'}
          </Text>
          <View style={tw`border-b border-accent-6 my-1`} />
          <View style={tw`flex flex-col`}>
            {filteredData.map((item, index) => (
              <View
                key={item.id}
                style={tw`flex flex-row gap-3 my-3 border border-accent-6 p-3 rounded-2`}>
                {/* Image Container */}
                <View style={tw`w-32 h-48`}>
                  <Image
                    source={{uri: item.cover}}
                    style={tw`w-full h-full rounded-2`}
                    resizeMode="cover"
                  />
                </View>

                {/* Content Container */}
                <View style={tw`flex-1 justify-between`}>
                  {/* Text Content */}
                  <View style={tw`flex-1`}>
                    <Text
                      style={tw`font-nokia-bold text-sm text-accent-6 mb-1`}>
                      {item.human_date}
                    </Text>
                    <Text
                      style={[
                        tw`font-nokia-bold text-lg text-secondary-6 leading-tight mb-2`,
                        darkMode ? tw`text-primary-1` : null,
                      ]}
                      numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={tw`border-b border-accent-6 mb-2`} />
                    <Text
                      numberOfLines={3}
                      style={[
                        tw`font-nokia-bold text-sm text-secondary-6 text-justify flex-1`,
                        darkMode ? tw`text-primary-1` : null,
                      ]}>
                      {item.description}
                    </Text>
                  </View>

                  {/* Button Container */}
                  <View style={tw`mt-3 pt-2`}>
                    <TouchableOpacity
                      style={tw`px-4 py-2 rounded-4 bg-accent-6 self-start`}
                      onPress={() => handleSSLOpen(item.id)}>
                      <Text style={tw`font-nokia-bold text-sm text-primary-1`}>
                        {language === 'en' ? 'Open Lesson' : 'ትምህርቱን ክፈት'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default SSLHome;
