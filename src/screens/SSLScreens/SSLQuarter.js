import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  ArrowSquareLeft,
  Warning,
  XCircle,
  ArrowClockwise,
  CloudSlash,
} from 'phosphor-react-native';
import DateConverter from './DateConverter';
import tw from './../../../tailwind';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {useGetSSLOfQuarterQuery} from '../../services/SabbathSchoolApi';
import LinearGradient from 'react-native-linear-gradient';
import {
  cacheSSLQuarterData,
  getCachedSSLQuarter,
  getCachedSSLQuarterLessonIds,
  saveSSLLessonToCache,
} from '../../utils/sslCache';
import {formatSslDateRange} from '../../utils/sslDateFormatter';
import networkManager from '../../utils/networkManager';

const SSLQuarter = ({route}) => {
  const {sslId} = route.params;
  const language = useSelector(state => state.language.language);
  const {
    data: sslQuarter,
    error,
    isLoading,
    refetch,
  } = useGetSSLOfQuarterQuery(sslId);
  const navigation = useNavigation();
  const darkMode = useSelector(state => state.ui.darkMode);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const textStyle = 'font-nokia-bold text-sm text-secondary-4';
  const [showModal, setShowModal] = useState(false);
  const [fullDescription, setFullDescription] = useState('');
  const [cachedQuarter, setCachedQuarter] = useState(null);
  const [cachedLessonIds, setCachedLessonIds] = useState([]);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [isCachingQuarter, setIsCachingQuarter] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadCachedQuarter = async () => {
      if (!sslId) {
        return;
      }

      try {
        const [quarterCache, lessonIds] = await Promise.all([
          getCachedSSLQuarter(sslId, language),
          getCachedSSLQuarterLessonIds(sslId, language),
        ]);

        if (!isActive) {
          return;
        }

        setCachedQuarter(quarterCache);
        setCachedLessonIds(lessonIds);
        setIsUsingCache(
          Boolean(quarterCache) && Boolean(!networkManager.isOnline || error),
        );
      } catch (cacheError) {
        console.error('Error loading cached SSL quarter:', cacheError);
      }
    };

    loadCachedQuarter();

    return () => {
      isActive = false;
    };
  }, [sslId, language, error]);

  useEffect(() => {
    let isActive = true;

    const cacheQuarter = async () => {
      if (!sslQuarter || !sslId || !networkManager.isOnline) {
        return;
      }

      try {
        setIsCachingQuarter(true);
        const result = await cacheSSLQuarterData({
          ssl: sslId,
          quarterData: sslQuarter,
          language,
        });

        if (!isActive) {
          return;
        }

        setCachedQuarter(sslQuarter);
        const lessonIds = await getCachedSSLQuarterLessonIds(sslId, language);

        if (isActive) {
          setCachedLessonIds(lessonIds);
          setIsUsingCache(false);
        }

        console.log(
          `✅ SSL quarter cache ready: ${result.lessonsCached} lessons, ${result.daysCached} days`,
        );
      } catch (cacheError) {
        console.error('Error caching SSL quarter:', cacheError);
      } finally {
        if (isActive) {
          setIsCachingQuarter(false);
        }
      }
    };

    cacheQuarter();

    return () => {
      isActive = false;
    };
  }, [sslQuarter, sslId, language]);

  const displaySSLQuarter = sslQuarter || cachedQuarter;
  const visibleLessons = useMemo(() => {
    const lessons = displaySSLQuarter?.lessons || [];

    if (!isUsingCache) {
      return lessons;
    }

    return lessons.filter(item => cachedLessonIds.includes(item.id));
  }, [cachedLessonIds, displaySSLQuarter?.lessons, isUsingCache]);

  const handleMorePress = () => {
    setFullDescription(displaySSLQuarter?.quarterly?.introduction || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const onRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  if (isLoading && !displaySSLQuarter) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <View style={tw`flex-1`}>
          {/* Compact Header */}
          <View style={tw`flex-row items-center justify-between p-4`}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowSquareLeft size={36} weight="fill" color={'#EA9215'} />
            </TouchableOpacity>
            <Text
              style={[
                tw`font-nokia-bold text-lg`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Sabbath School
            </Text>
            <View style={tw`w-9`} />
          </View>

          {/* Compact Loading Card */}
          <View
            style={[
              tw`mx-4 p-4 rounded-3 border`,
              {
                backgroundColor: darkMode ? '#374151' : '#F8FAFC',
                borderColor: '#E2E8F0',
              },
            ]}>
            <View style={tw`flex-row items-center`}>
              <ActivityIndicator
                size="large"
                color="#EA9215"
                style={tw`mr-3`}
              />
              <View style={tw`flex-1`}>
                <Text
                  style={[
                    tw`font-nokia-bold text-base mb-1`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  Loading Quarter...
                </Text>
                <Text
                  style={[
                    tw`font-nokia-bold text-sm opacity-70`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}>
                  Please wait while we fetch the lessons
                </Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !displaySSLQuarter) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <View style={tw`flex-1`}>
          {/* Compact Header */}
          <View style={tw`flex-row items-center justify-between p-4`}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowSquareLeft size={36} weight="fill" color={'#EA9215'} />
            </TouchableOpacity>
            <Text
              style={[
                tw`font-nokia-bold text-lg`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Sabbath School
            </Text>
            <View style={tw`w-9`} />
          </View>

          {/* Compact Error Card */}
          <View
            style={[
              tw`mx-4 p-4 rounded-3 border`,
              {
                backgroundColor: darkMode ? '#374151' : '#FEF2F2',
                borderColor: '#EF4444',
              },
            ]}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center flex-1`}>
                <CloudSlash
                  size={24}
                  color="#EF4444"
                  weight="bold"
                  style={tw`mr-3`}
                />
                <View style={tw`flex-1`}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-base mb-1`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}>
                    Quarterly Update Pending
                  </Text>
                  <Text
                    style={[
                      tw`font-nokia-bold text-sm opacity-70`,
                      darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                    ]}>
                    New lessons are being prepared
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  tw`p-2 rounded-full`,
                  {backgroundColor: '#EF4444'},
                  isRefreshing && tw`opacity-70`,
                ]}
                onPress={onRefresh}
                disabled={isRefreshing}>
                {isRefreshing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <ArrowClockwise size={16} color="#FFFFFF" weight="bold" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!displaySSLQuarter?.quarterly) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center justify-between p-4`}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowSquareLeft size={36} weight="fill" color={'#EA9215'} />
            </TouchableOpacity>
            <Text
              style={[
                tw`font-nokia-bold text-lg`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Sabbath School
            </Text>
            <View style={tw`w-9`} />
          </View>
          <View
            style={[
              tw`mx-4 p-4 rounded-3 border`,
              {
                backgroundColor: darkMode ? '#374151' : '#FEF7F0',
                borderColor: '#EA9215',
              },
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-sm text-center`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              {language === 'en'
                ? 'No saved lessons are available for this quarter yet.'
                : 'ለዚህ ሩብ ዓመት የተቀመጡ ትምህርቶች ገና የሉም።'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const handleButtonPress = async (ssl, weekId) => {
    // Cache the quarter data when navigating to a lesson
    // The lesson data will be cached when SSLWeek loads
    if (displaySSLQuarter && ssl && weekId) {
      // Save quarter data - lesson data will be cached in SSLWeek component
      try {
        await saveSSLLessonToCache(
          ssl,
          weekId,
          null,
          displaySSLQuarter,
          language,
        );
      } catch (error) {
        console.error('Error caching SSL quarter data:', error);
      }
    }
    navigation.push('SSLWeek', {ssl, weekId});
  };

  const gradientColor = darkMode
    ? displaySSLQuarter.quarterly.color_primary_dark
    : displaySSLQuarter.quarterly.color_primary;
  const quarterDateRange = formatSslDateRange(
    displaySSLQuarter?.quarterly?.start_date,
    displaySSLQuarter?.quarterly?.end_date,
  );

  return (
    <View style={darkMode ? tw`bg-secondary-9 h-full` : null}>
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
        <View style={tw`flex-1 h-130`}>
          <ImageBackground
            source={{uri: displaySSLQuarter.quarterly.splash}}
            style={tw`flex-5 justify-between py-6 px-4`}>
            <LinearGradient
              colors={[gradientColor, `${gradientColor}30`]}
              style={tw`absolute inset-0`}
              start={{x: 0.5, y: 1}}
              end={{x: 0.5, y: 0.2}}
            />
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowSquareLeft
                size={36}
                weight="fill"
                color={'#EA9215'}
                style={tw`mt-8`}
              />
            </TouchableOpacity>
            <View>
              <Text
                style={tw`font-nokia-bold text-3xl text-primary-1 text-center`}>
                {displaySSLQuarter.quarterly.title}
              </Text>
              <Text
                style={tw`font-nokia-bold text-sm text-primary-3 text-center`}>
                {language === 'en'
                  ? quarterDateRange || displaySSLQuarter.quarterly.human_date
                  : displaySSLQuarter.quarterly.human_date}
              </Text>
              <View style={tw`mt-4`}>
                <Text
                  style={tw`font-nokia-bold text-sm text-primary-1`}
                  numberOfLines={3}>
                  {displaySSLQuarter.quarterly.description}{' '}
                </Text>
                <TouchableOpacity onPress={handleMorePress}>
                  <Text
                    style={tw`font-nokia-bold text-primary-3 border border-primary-3 px-2 w-24 text-center mt-2 rounded py-1`}>
                    {language === 'en' ? 'More' : 'ተጨማሪ'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Modal visible={showModal} transparent animationType="fade">
                <View
                  style={tw`flex-1 justify-center items-center bg-secondary-10 bg-opacity-50`}>
                  <View
                    style={[
                      tw`bg-primary-1 rounded-lg w-90% my-20 rounded`,
                      darkMode ? tw`bg-secondary-6` : null,
                    ]}>
                    <View style={tw`p-4`}>
                      <View
                        style={tw`flex-row justify-between items-center mb-4`}>
                        <Text
                          style={[
                            tw`font-nokia-bold text-lg text-secondary-6`,
                            darkMode ? tw`text-primary-1` : null,
                          ]}>
                          Quarter Information
                        </Text>
                        <TouchableOpacity onPress={closeModal}>
                          <XCircle
                            size={24}
                            weight="bold"
                            color={darkMode ? '#EA9215' : '#6B7280'}
                          />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={tw`max-h-100`}>
                        <Text
                          style={[
                            tw`font-nokia-bold text-sm text-secondary-6`,
                            darkMode ? tw`text-primary-1` : null,
                          ]}>
                          {fullDescription}
                        </Text>
                      </ScrollView>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
          </ImageBackground>
        </View>
        <SafeAreaView style={tw`flex`}>
          {isUsingCache && (
            <View
              style={[
                tw`mx-4 mt-4 mb-2 p-3 rounded-3 border flex-row items-center`,
                {
                  backgroundColor: darkMode ? '#374151' : '#FEF7F0',
                  borderColor: '#EA9215',
                },
              ]}>
              <CloudSlash
                size={18}
                color="#EA9215"
                weight="bold"
                style={tw`mr-2`}
              />
              <Text
                style={[
                  tw`font-nokia-bold text-sm flex-1`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}>
                {language === 'en'
                  ? 'Offline mode: showing saved lessons only.'
                  : 'ከመስመር ውጭ፦ የተቀመጡ ትምህርቶች ብቻ እየታዩ ነው።'}
              </Text>
            </View>
          )}
          {isCachingQuarter && !isUsingCache && (
            <View style={tw`mx-4 mt-4 mb-2 flex-row items-center`}>
              <ActivityIndicator size="small" color="#EA9215" style={tw`mr-2`} />
              <Text
                style={[
                  tw`font-nokia-bold text-xs`,
                  darkMode ? tw`text-primary-3` : tw`text-secondary-4`,
                ]}>
                {language === 'en'
                  ? 'Saving this quarter for offline reading...'
                  : 'ይህ ሩብ ዓመት ከመስመር ውጭ ለማንበብ እየተቀመጠ ነው...'}
              </Text>
            </View>
          )}
          {visibleLessons?.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={tw`flex flex-row items-center gap-6 border-t border-secondary-3 w-full py-3 px-6`}
              onPress={() => handleButtonPress(sslId, item.id)}>
              <Text
                style={[
                  tw`font-nokia-bold text-3xl text-secondary-3`,
                  darkMode ? tw`text-primary-7` : null,
                ]}>
                {index + 1}
              </Text>
              <View style={tw`flex flex-col`}>
                <Text
                  style={[
                    tw`font-nokia-bold text-xl leading-tight text-secondary-6`,
                    darkMode ? tw`text-primary-1` : null,
                  ]}>
                  {item.title}
                </Text>
                <View style={tw`flex flex-row`}>
                  {language === 'en' ? (
                    <Text style={tw`font-nokia-bold text-sm text-secondary-4`}>
                      {formatSslDateRange(item.start_date, item.end_date) ||
                        item.human_date}
                    </Text>
                  ) : (
                    <>
                      <DateConverter
                        gregorianDate={item.start_date}
                        textStyle={textStyle}
                      />
                      <Text style={tw`font-nokia-bold text-secondary-3`}>
                        {' '}
                        -{' '}
                      </Text>
                      <DateConverter
                        gregorianDate={item.end_date}
                        textStyle={textStyle}
                      />
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
          {isUsingCache && visibleLessons.length === 0 && (
            <View style={tw`mx-4 mt-4 p-4 rounded-3 border border-primary-6`}>
              <Text
                style={[
                  tw`font-nokia-bold text-sm text-center`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}>
                {language === 'en'
                  ? 'No saved lessons are available for this quarter yet.'
                  : 'ለዚህ ሩብ ዓመት የተቀመጡ ትምህርቶች ገና የሉም።'}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </ScrollView>
    </View>
  );
};

export default SSLQuarter;
