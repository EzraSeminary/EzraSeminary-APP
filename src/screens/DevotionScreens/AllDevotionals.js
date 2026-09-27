import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {useSelector} from 'react-redux';
import {
  ArrowSquareLeft,
  User,
  ArrowSquareUpRight,
  ArrowSquareDown,
} from 'phosphor-react-native';
import tw from './../../../tailwind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCachedImage} from '../../utils/imageCache';
import {
  useGetAvailableYearsQuery,
  useGetMonthsByYearQuery,
  useLazyGetDevotionsByYearAndMonthQuery,
} from './../../redux/api-slices/apiSlice';
import {
  ETHIOPIAN_MONTHS,
  normalizeEthiopianMonth,
} from '../../utils/ethiopianCalendar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getFloatingTabScenePadding} from '../../navigation/floatingTabBarStyles';

// Helper function to get thumbnail URL for smaller images (reduces bandwidth)
const getThumbnailUrl = imageUrl => {
  if (!imageUrl) return imageUrl;
  // If using ImageKit, add transformation parameters for smaller images
  // This reduces bandwidth usage significantly
  if (imageUrl.includes('ik.imagekit.io')) {
    // Add ImageKit transformation: width 300px, height 200px, maintain aspect ratio, quality 80
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}tr=w-300,h-200,q-80`;
  }
  // For other image services, return original URL
  return imageUrl;
};

const MonthDevotionCard = ({item, darkMode, onPress}) => {
  const cachedImage = useCachedImage(getThumbnailUrl(item.image));

  return (
    <TouchableOpacity
      style={tw`w-[47.5%] h-35 mb-4 rounded-2 overflow-hidden`}
      onPress={onPress}>
      <ImageBackground
        source={{uri: cachedImage}}
        style={tw`w-full h-full justify-end`}
        imageStyle={tw`rounded-lg`}>
        <View
          style={[
            tw`absolute inset-0 bg-accent-10 bg-opacity-60 rounded-lg`,
            darkMode ? tw`bg-accent-11 bg-opacity-70` : null,
          ]}>
          <ArrowSquareUpRight
            size={32}
            weight="fill"
            style={tw`text-white self-end m-2`}
            color="#F8F8F8"
          />
          <View style={tw`flex absolute bottom-0 left-0 my-2`}>
            <Text
              style={tw`font-nokia-bold text-white text-lg mx-2`}
              numberOfLines={2}>
              {item.title}
            </Text>
            <Text
              style={tw`font-nokia-bold text-white text-sm mx-2 text-accent-2`}>
              {item.month} {item.day}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const AllDevotionals = ({navigation}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const insets = useSafeAreaInsets();
  const listBottomPadding = useMemo(
    () => getFloatingTabScenePadding(insets),
    [insets],
  );

  const {data: availableYearsRaw = []} = useGetAvailableYearsQuery();
  const availableYears = Array.isArray(availableYearsRaw)
    ? availableYearsRaw.map(y => Number(y)).filter(Boolean)
    : [];
  const yearToFetch =
    availableYears.includes(2018)
      ? 2018
      : availableYears.length > 0
      ? Math.max(...availableYears)
      : 2018;
  const {data: monthsFromApi = []} = useGetMonthsByYearQuery(yearToFetch);

  const [expandedMonth, setExpandedMonth] = useState(null);
  const [loadedMonths, setLoadedMonths] = useState({}); // Store loaded month data
  const [loadingMonths, setLoadingMonths] = useState({}); // Track which months are loading
  const [allDevotions, setAllDevotions] = useState([]); // Store all devotions from cache
  const [fetchMonthDevotions] = useLazyGetDevotionsByYearAndMonthQuery();

  const getLatestHomeCacheDevotions = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const homeKeys = keys.filter(key => key.startsWith('home_data_cache_'));

      if (homeKeys.length === 0) {
        return [];
      }

      const keyValues = await AsyncStorage.multiGet(homeKeys);
      let latest = null;

      keyValues.forEach(([, raw]) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (!parsed?.devotions || !Array.isArray(parsed.devotions)) return;
          if (
            !latest ||
            new Date(parsed.lastCacheTime).getTime() >
              new Date(latest.lastCacheTime || 0).getTime()
          ) {
            latest = parsed;
          }
        } catch {}
      });

      return latest?.devotions || [];
    } catch (error) {
      console.error('Error loading Home cache keys:', error);
      return [];
    }
  }, []);

  // Load all devotions from Home cache on mount
  useEffect(() => {
    const loadFromHomeCache = async () => {
      try {
        const cachedDevotions = await getLatestHomeCacheDevotions();
        if (!cachedDevotions.length) return;

        const devotionsForYear = cachedDevotions.filter(
          d => d.year === yearToFetch || !d.year,
        );
        setAllDevotions(devotionsForYear);
        console.log(`Loaded ${devotionsForYear.length} devotions from Home cache`);
      } catch (error) {
        console.error('Error loading from Home cache:', error);
      }
    };

    loadFromHomeCache();
  }, [getLatestHomeCacheDevotions, yearToFetch]);

  // Function to get devotions for a specific month from cached data
  const getMonthDevotionsFromCache = useCallback(
    month => {
      if (!allDevotions || allDevotions.length === 0) {
        return [];
      }
      return allDevotions
        .filter(
          devotion =>
            normalizeEthiopianMonth(devotion.month) ===
            normalizeEthiopianMonth(month),
        )
        .sort((a, b) => Number(a.day) - Number(b.day));
    },
    [allDevotions],
  );

  // Function to load month data
  const loadMonthData = useCallback(
    async month => {
      // Check if already loaded
      if (loadedMonths[month]) {
        return;
      }

      // Try to get from cached allDevotions first
      let cachedMonthData = getMonthDevotionsFromCache(month);

      // If not found in allDevotions, try to reload from Home cache
      if (cachedMonthData.length === 0) {
        try {
          const cachedDevotions = await getLatestHomeCacheDevotions();
          if (cachedDevotions.length > 0) {
            const devotionsForYear = cachedDevotions.filter(
              d => d.year === yearToFetch || !d.year,
            );
            setAllDevotions(devotionsForYear);
            cachedMonthData = devotionsForYear
              .filter(
                d =>
                  normalizeEthiopianMonth(d.month) ===
                  normalizeEthiopianMonth(month),
              )
              .sort((a, b) => Number(a.day) - Number(b.day));
          }
        } catch (error) {
          console.error('Error reloading cache:', error);
        }
      }

      if (cachedMonthData.length > 0) {
        setLoadedMonths(prev => ({
          ...prev,
          [month]: cachedMonthData,
        }));
        console.log(`Loaded ${cachedMonthData.length} devotions for ${month} from cache`);
        return;
      }

      // Fallback to API if cache is empty
      try {
        setLoadingMonths(prev => ({...prev, [month]: true}));
        const result = await fetchMonthDevotions({
          year: yearToFetch,
          month,
        }).unwrap();

        const sorted = Array.isArray(result)
          ? [...result].sort((a, b) => Number(a.day) - Number(b.day))
          : [];

        setLoadedMonths(prev => ({
          ...prev,
          [month]: sorted,
        }));
      } catch (error) {
        console.error('Error fetching month devotions:', error);
        setLoadedMonths(prev => ({
          ...prev,
          [month]: [],
        }));
      } finally {
        setLoadingMonths(prev => ({...prev, [month]: false}));
      }
    },
    [
      loadedMonths,
      yearToFetch,
      fetchMonthDevotions,
      getLatestHomeCacheDevotions,
      getMonthDevotionsFromCache,
    ],
  );

  const sortedMonths =
    Array.isArray(monthsFromApi) && monthsFromApi.length > 0
      ? monthsFromApi
      : ETHIOPIAN_MONTHS.slice(1);

  // Handle month toggle
  const toggleMonth = useCallback(
    async month => {
      if (expandedMonth === month) {
        setExpandedMonth(null);
      } else {
        setExpandedMonth(month);
        // Load data when month is expanded
        await loadMonthData(month);
      }
    },
    [expandedMonth, loadMonthData],
  );

  // Component to display month data
  const MonthDevotions = ({month}) => {
    // Get data from loadedMonths (which is populated from cache or API)
    const monthDevotions = loadedMonths[month] || [];

    // Show loading state only if we're actually loading from API
    if (loadingMonths[month]) {
      return (
        <View style={tw`flex-1 justify-center items-center py-8`}>
          <ActivityIndicator size="large" color="#EA9215" />
          <Text
            style={[
              tw`font-nokia-bold text-sm mt-2`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            Loading {month}...
          </Text>
        </View>
      );
    }

    if (monthDevotions.length === 0) {
      return (
        <View style={tw`flex-1 justify-center items-center py-8`}>
          <Text
            style={[
              tw`font-nokia-bold text-sm`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            No devotionals found for {month}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={monthDevotions}
        keyExtractor={item => item._id || `${item.month}-${item.day}`}
        numColumns={2}
        columnWrapperStyle={tw`justify-between`}
        contentContainerStyle={[tw`mt-4`, {paddingBottom: listBottomPadding}]}
        renderItem={({item}) => (
          <MonthDevotionCard
            item={item}
            darkMode={darkMode}
            onPress={() =>
              navigation.navigate('SelectedDevotional', {
                devotionalId: item._id,
                year: yearToFetch,
              })
            }
          />
        )}
        scrollEnabled={false}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    );
  };

  return (
    <View style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
      <SafeAreaView style={tw`flex mx-auto w-[92%]`}>
        <FlatList
          data={sortedMonths}
          keyExtractor={month => month}
          showsVerticalScrollIndicator={false}
          renderItem={({item: month}) => (
            <View style={tw`my-2`}>
              <TouchableOpacity
                style={tw`flex flex-row justify-between items-center border-b border-accent-6 pb-2`}
                onPress={() => toggleMonth(month)}>
                <View style={tw`flex-row items-center`}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-lg text-secondary-6`,
                      darkMode ? tw`text-primary-1` : null,
                    ]}>
                    {month}
                  </Text>
                  {loadedMonths[month] && (
                    <Text
                      style={[
                        tw`font-nokia-bold text-sm ml-2`,
                        darkMode ? tw`text-primary-4` : tw`text-secondary-4`,
                      ]}>
                      ({loadedMonths[month].length})
                    </Text>
                  )}
                </View>
                <ArrowSquareDown
                  size={24}
                  weight={expandedMonth === month ? 'fill' : 'regular'}
                  color="#EA9215"
                  style={[
                    tw`mr-2`,
                    expandedMonth === month && {
                      transform: [{rotate: '180deg'}],
                    },
                  ]}
                />
              </TouchableOpacity>
              {expandedMonth === month && (
                <MonthDevotions month={month} />
              )}
            </View>
          )}
          ListHeaderComponent={
            <>
              <View style={tw`flex flex-row justify-between my-4`}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <ArrowSquareLeft size={36} weight="fill" color={'#EA9215'} />
                </TouchableOpacity>
                <Text
                  style={[
                    tw`font-nokia-bold text-xl text-secondary-6`,
                    darkMode ? tw`text-primary-1` : null,
                  ]}>
                  All Devotionals
                </Text>
                <User
                  size={32}
                  weight="bold"
                  style={[
                    tw`text-secondary-6`,
                    darkMode ? tw`text-primary-1` : null,
                  ]}
                />
              </View>

              <View style={tw`mb-4 px-2`}>
                <Text
                  style={[
                    tw`font-nokia-bold text-xs text-center`,
                    darkMode ? tw`text-primary-4` : tw`text-secondary-4`,
                  ]}>
                  Tap a month to load devotionals • Data is cached for faster access
                </Text>
              </View>
            </>
          }
          ListFooterComponent={<View style={{height: listBottomPadding}} />}
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
        />
      </SafeAreaView>
    </View>
  );
};

export default AllDevotionals;
