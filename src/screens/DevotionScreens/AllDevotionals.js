import React, {useState, useCallback, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import {useSelector} from 'react-redux';
import {
  ArrowSquareLeft,
  User,
  ArrowSquareUpRight,
  ArrowSquareDown,
} from 'phosphor-react-native';
import tw from './../../../tailwind';
import {useGetDevotionsByYearAndMonthQuery} from './../../redux/api-slices/apiSlice';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Utility function for Ethiopian month names
const ethiopianMonths = [
  'መስከረም',
  'ጥቅምት',
  'ህዳር',
  'ታህሳስ',
  'ጥር',
  'የካቲት',
  'መጋቢት',
  'ሚያዚያ',
  'ግንቦት',
  'ሰኔ',
  'ሐምሌ',
  'ነሐሴ',
  'ጳጉሜ',
];

// Cache key prefix for storing month data
const CACHE_PREFIX = 'devotion_month_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

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

const AllDevotionals = ({navigation}) => {
  const darkMode = useSelector(state => state.ui.darkMode);

  // Always show 2018 devotions only
  const yearToFetch = 2018;
  const HOME_CACHE_KEY = 'home_data_cache';

  const [expandedMonth, setExpandedMonth] = useState(null);
  const [loadedMonths, setLoadedMonths] = useState({}); // Store loaded month data
  const [loadingMonths, setLoadingMonths] = useState({}); // Track which months are loading
  const [allDevotions, setAllDevotions] = useState([]); // Store all devotions from cache

  // Load all devotions from Home cache on mount
  useEffect(() => {
    const loadFromHomeCache = async () => {
      try {
        const cachedString = await AsyncStorage.getItem(HOME_CACHE_KEY);
        if (cachedString) {
          const cached = JSON.parse(cachedString);
          if (cached.devotions && cached.devotions.length > 0) {
            // Filter for 2018 devotions only
            const devotions2018 = cached.devotions.filter(
              d => d.year === yearToFetch || !d.year, // Include if year is 2018 or not specified
            );
            setAllDevotions(devotions2018);
            console.log(
              `Loaded ${devotions2018.length} devotions from Home cache`,
            );
          }
        }
      } catch (error) {
        console.error('Error loading from Home cache:', error);
      }
    };

    loadFromHomeCache();
  }, [yearToFetch]);

  // Function to get devotions for a specific month from cached data
  const getMonthDevotionsFromCache = month => {
    if (!allDevotions || allDevotions.length === 0) return [];
    return allDevotions
      .filter(devotion => devotion.month === month)
      .sort((a, b) => Number(a.day) - Number(b.day));
  };

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
          const cachedString = await AsyncStorage.getItem(HOME_CACHE_KEY);
          if (cachedString) {
            const cached = JSON.parse(cachedString);
            if (cached.devotions && cached.devotions.length > 0) {
              const devotions2018 = cached.devotions.filter(
                d => d.year === yearToFetch || !d.year,
              );
              setAllDevotions(devotions2018);
              cachedMonthData = devotions2018
                .filter(d => d.month === month)
                .sort((a, b) => Number(a.day) - Number(b.day));
            }
          }
        } catch (error) {
          console.error('Error reloading cache:', error);
        }
      }

      // Set the loaded data (even if empty)
      setLoadedMonths(prev => ({
        ...prev,
        [month]: cachedMonthData,
      }));
      
      if (cachedMonthData.length > 0) {
        console.log(`Loaded ${cachedMonthData.length} devotions for ${month} from cache`);
      }
    },
    [loadedMonths, allDevotions, yearToFetch],
  );

  // Use all Ethiopian months (already sorted in the array)
  const sortedMonths = ethiopianMonths;

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
      <View style={tw`flex flex-row flex-wrap justify-between mt-4`}>
        {monthDevotions.map((item, index) => (
          <TouchableOpacity
            key={item._id || index}
            style={tw`w-[47.5%] h-35 mb-4 rounded-2 overflow-hidden`}
            onPress={() =>
              navigation.navigate('SelectedDevotional', {
                devotionalId: item._id,
                year: yearToFetch,
              })
            }>
            <ImageBackground
              source={{uri: getThumbnailUrl(item.image)}}
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
        ))}
      </View>
    );
  };


  return (
    <View style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
      <SafeAreaView style={tw`flex mx-auto w-[92%]`}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={tw`h-100%`}>
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

          {/* Info */}
          <View style={tw`mb-4 px-2`}>
            <Text
              style={[
                tw`font-nokia-bold text-xs text-center`,
                darkMode ? tw`text-primary-4` : tw`text-secondary-4`,
              ]}>
              Tap a month to load devotionals • Data is cached for faster access
            </Text>
          </View>

          {sortedMonths.map(month => (
            <View key={month} style={tw`my-2`}>
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
          ))}

          {/* Bottom padding */}
          <View style={tw`h-20`} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default AllDevotionals;
