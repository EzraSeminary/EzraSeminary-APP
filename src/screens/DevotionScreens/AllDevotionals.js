import React, {useState, useCallback, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useSelector} from 'react-redux';
import {
  ArrowSquareLeft,
  User,
  ArrowSquareUpRight,
  ArrowSquareDown,
} from 'phosphor-react-native';
import tw from './../../../tailwind';
import {useGetDevotionsQuery} from './../../redux/api-slices/apiSlice';
import ErrorScreen from '../../components/ErrorScreen';
import networkManager from '../../utils/networkManager';
import YearDropdown from '../../components/YearDropdown';

// Utility function for Ethiopian month names
const ethopianMonths = [
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

const AllDevotionals = ({navigation}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const currentUser = useSelector(state => state.auth.user);

  // Get current Ethiopian year
  const getCurrentEthiopianYear = () => {
    // For now, we'll use 2017 as the current Ethiopian year
    // This should be updated based on the actual current Ethiopian year
    return 2017;
  };

  const currentEthiopianYear = getCurrentEthiopianYear();
  const [selectedYear, setSelectedYear] = useState(currentEthiopianYear);

  // Determine if user can access year filtering (instructor or admin)
  const canAccessYearFiltering =
    currentUser &&
    (currentUser.role === 'instructor' ||
      currentUser.role === 'admin' ||
      currentUser.role !== 'Learner');

  // Determine which year to fetch data for
  // For admin/instructor: use selected year (default to current year)
  // For regular users: always use current year
  const yearToFetch = canAccessYearFiltering
    ? selectedYear
    : currentEthiopianYear;

  const {
    data: originalDevotionals = [],
    isFetching,
    refetch,
    error,
  } = useGetDevotionsQuery(); // Fetch all devotions, filter on frontend
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [networkError, setNetworkError] = useState(false);

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

      await refetch();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Add loading timeout effect
  useEffect(() => {
    let timeoutId;
    if (isFetching && !error && !originalDevotionals.length) {
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
  }, [isFetching, error, originalDevotionals.length]);

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

  // Function to get the index of an Ethiopian month
  const getEthiopianMonthIndex = monthName => ethopianMonths.indexOf(monthName);

  // Organize devotionals by month and sort days within each month
  const sortedDevotionals = useMemo(() => {
    // Filter devotions by year first
    const filteredDevotionals = originalDevotionals.filter(devotion => {
      // If devotion has a year field, use it; otherwise assume it's 2017 data
      const devotionYear = devotion.year || 2017;
      return devotionYear === yearToFetch;
    });

    const devotionalsByMonth = filteredDevotionals.reduce((acc, devotion) => {
      const monthName = devotion.month;
      if (!acc[monthName]) acc[monthName] = [];
      acc[monthName].push(devotion);
      return acc;
    }, {});

    // Sort devotionals by Ethiopian month order and day within each month
    const sortedMonths = Object.keys(devotionalsByMonth).sort((a, b) => {
      return getEthiopianMonthIndex(a) - getEthiopianMonthIndex(b);
    });

    sortedMonths.forEach(month => {
      devotionalsByMonth[month] = devotionalsByMonth[month].sort(
        (a, b) => a.day - b.day,
      );
    });

    return {sortedMonths, devotionalsByMonth};
  }, [originalDevotionals, yearToFetch, currentEthiopianYear]);

  const toggleMonth = month =>
    setExpandedMonth(expandedMonth === month ? null : month);

  // Generate available years (current year and next year for instructor/admin)
  const availableYears = useMemo(() => {
    const years = [currentEthiopianYear];
    if (canAccessYearFiltering) {
      years.push(currentEthiopianYear + 1); // Add next year for instructor/admin
    }

    return years;
  }, [currentEthiopianYear, canAccessYearFiltering]);

  const handleYearSelect = year => {
    setSelectedYear(year);
  };

  const handleRetry = async () => {
    setLoadingTimeout(false);
    setNetworkError(false);

    if (!networkManager.isOnline) {
      setNetworkError(true);
      return;
    }

    try {
      await refetch();
    } catch (err) {
      console.error('Retry error:', err);
    }
  };

  // Handle different error states
  if (networkError && !originalDevotionals.length) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : tw`h-100%`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <TouchableOpacity
            style={tw`absolute top-12 left-6`}
            onPress={() => navigation.goBack()}>
            <ArrowSquareLeft size={36} weight="fill" color={'#EA9215'} />
          </TouchableOpacity>
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

  if (loadingTimeout && !originalDevotionals.length) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : tw`h-100%`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <TouchableOpacity
            style={tw`absolute top-12 left-6`}
            onPress={() => navigation.goBack()}>
            <ArrowSquareLeft size={36} weight="fill" color={'#EA9215'} />
          </TouchableOpacity>
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

  if (isFetching && !originalDevotionals.length) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-full flex-1` : null}>
        <TouchableOpacity
          style={tw`absolute top-12 left-6 z-10`}
          onPress={() => navigation.goBack()}>
          <ArrowSquareLeft size={36} weight="fill" color={'#EA9215'} />
        </TouchableOpacity>
        <ActivityIndicator size="large" color="#EA9215" style={tw`mt-20`} />
        <Text style={tw`font-nokia-bold text-lg text-accent-6 text-center`}>
          Loading
        </Text>
      </SafeAreaView>
    );
  }

  if (error && !originalDevotionals.length) {
    return <ErrorScreen refetch={refetch} darkMode={darkMode} />;
  }

  return (
    <View style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
      <SafeAreaView style={tw`flex mx-auto w-[92%]`}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={tw`h-100%`}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }>
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

          {/* Year Filter Dropdown for Instructor/Admin */}
          {canAccessYearFiltering && (
            <View style={tw`mb-4`}>
              <Text
                style={[
                  tw`font-nokia-bold text-base mb-2`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                ]}>
                Select Year:
              </Text>
              <YearDropdown
                selectedYear={selectedYear}
                onYearSelect={handleYearSelect}
                availableYears={availableYears}
                darkMode={darkMode}
              />
            </View>
          )}

          {sortedDevotionals.sortedMonths.map(month => (
            <View key={month} style={tw`my-2`}>
              <TouchableOpacity
                style={tw`flex flex-row justify-between items-center border-b border-accent-6 pb-2`}
                onPress={() => toggleMonth(month)}>
                <Text
                  style={[
                    tw`font-nokia-bold text-lg text-secondary-6`,
                    darkMode ? tw`text-primary-1` : null,
                  ]}>
                  {month}
                </Text>
                <ArrowSquareDown
                  size={24}
                  weight={expandedMonth === month ? 'fill' : 'regular'}
                  color="#EA9215"
                  style={tw`mr-2`}
                />
              </TouchableOpacity>
              {expandedMonth === month && (
                <View style={tw`flex flex-row flex-wrap justify-between mt-4`}>
                  {sortedDevotionals.devotionalsByMonth[month].map(
                    (item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={tw`w-[47.5%] h-35 mb-4 rounded-2 overflow-hidden`}
                        onPress={() =>
                          navigation.navigate('SelectedDevotional', {
                            devotionalId: item._id,
                            year: yearToFetch,
                          })
                        }>
                        <ImageBackground
                          source={{uri: `${item.image}`}}
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
                            <View
                              style={tw`flex absolute bottom-0 left-0 my-2`}>
                              <Text
                                style={tw`font-nokia-bold text-white text-lg mx-2`}>
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
                    ),
                  )}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default AllDevotionals;
