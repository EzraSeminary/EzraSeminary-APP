import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import handleDownload from '../../components/handleDownload';
import {handleShare} from '../../components/handleShare';
import {
  DownloadSimple,
  ShareNetwork,
  ArrowSquareLeft,
  Share,
} from 'phosphor-react-native';
import ErrorScreen from '../../components/ErrorScreen';
import PreviousDevotions from './PreviousDevotions';
import HTMLView from 'react-native-htmlview';
import tw from './../../../tailwind';
import {useGetDevotionsQuery} from '../../redux/api-slices/apiSlice';
import DevotionalShareModal from '../../components/DevotionalShareModal';
import networkManager from '../../utils/networkManager';

const SelectedDevotional = ({route}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const currentUser = useSelector(state => state.auth.user);
  const navigation = useNavigation();
  const {devotionalId, year: navigationYear} = route.params;

  // Get current Ethiopian year
  const getCurrentEthiopianYear = () => {
    // For now, we'll use 2018 as the current Ethiopian year
    // This should be updated based on the actual current Ethiopian year
    return 2018;
  };

  const currentEthiopianYear = getCurrentEthiopianYear();

  // Determine which year to fetch data for
  // Use year from navigation if available, otherwise use current year
  const yearToFetch = navigationYear || currentEthiopianYear;

  const {
    data: devotionals = [],
    isFetching,
    error,
    refetch,
  } = useGetDevotionsQuery({year: yearToFetch}); // Fetch devotions for specific year
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const scrollViewRef = useRef();
  // No need to filter by year since API already returns year-specific data
  const devotional = devotionals.find(item => item._id === devotionalId) || {};

  const tailwindStyles = StyleSheet.create({
    p: {
      ...(darkMode
        ? tw`text-primary-1 font-nokia-bold text-justify text-sm leading-snug`
        : tw`text-secondary-6 font-nokia-bold text-justify leading-snug`),
      marginVertical: -15,
    },
    a: {
      ...tw`text-accent-6 font-nokia-bold text-sm underline`,
    },
    h1: darkMode
      ? tw`text-primary-1 font-nokia-bold text-justify text-2xl leading-snug`
      : tw`text-secondary-6 font-nokia-bold text-justify text-2xl leading-snug`,
    h2: darkMode
      ? tw`text-primary-1 font-nokia-bold text-justify text-xl leading-snug`
      : tw`text-secondary-6 font-nokia-bold text-justify text-xl leading-snug`,
    h3: darkMode
      ? tw`text-primary-1 font-nokia-bold text-justify text-lg leading-snug`
      : tw`text-secondary-6 font-nokia-bold text-justify text-lg leading-snug`,
    ol: {
      ...(darkMode
        ? tw`text-primary-1 font-nokia-bold text-justify text-sm leading-snug`
        : tw`text-secondary-6 font-nokia-bold text-justify leading-snug`),
      marginVertical: -15,
      paddingLeft: 20,
    },
    ul: {
      ...(darkMode
        ? tw`text-primary-1 font-nokia-bold text-justify text-sm leading-snug`
        : tw`text-secondary-6 font-nokia-bold text-justify leading-snug`),
      marginVertical: -15,
      paddingLeft: 20,
    },
    li: {
      ...(darkMode
        ? tw`text-primary-1 font-nokia-bold text-justify text-sm leading-snug`
        : tw`text-secondary-6 font-nokia-bold text-justify leading-snug`),
      marginVertical: -5,
    },
  });

  useEffect(() => {
    scrollViewRef.current?.scrollTo({x: 0, y: 0, animated: false});
  }, [devotionalId]);

  // Add loading timeout effect
  useEffect(() => {
    let timeoutId;
    if (isFetching && !error && !devotionals.length) {
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
  }, [isFetching, error, devotionals.length]);

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
      await refetch();
    } catch (err) {
      console.error('Retry error:', err);
    }
  };

  const imageURI = `${devotional.image}`;

  // Handle different error states
  if (networkError && !devotionals.length) {
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

  if (loadingTimeout && !devotionals.length) {
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

  if (isFetching && !devotionals.length) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
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

  if (error && !devotionals.length) {
    return <ErrorScreen refetch={refetch} darkMode={darkMode} />;
  }

  // If we have devotionals but couldn't find the specific one, show a not found message
  if (devotionals.length > 0 && !devotional._id) {
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
            Devotional Not Found
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center mb-6`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-4`,
            ]}>
            The requested devotional could not be found.
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4`}
            onPress={() => navigation.goBack()}>
            <Text style={tw`font-nokia-bold text-white text-base`}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={darkMode ? tw`bg-secondary-9` : null}>
      <SafeAreaView style={tw`flex mx-auto w-[92%]`}>
        <ScrollView showsVerticalScrollIndicator={false} ref={scrollViewRef}>
          <View
            style={tw`flex flex-row justify-between items-center mt-4 mb-4`}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowSquareLeft size={36} weight="fill" color={'#EA9215'} />
            </TouchableOpacity>
            <Text
              style={[
                tw`font-nokia-bold text-xl text-secondary-6`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              Devotional
            </Text>
            <View style={tw`flex flex-row items-center gap-3`}>
              <TouchableOpacity onPress={() => setShareModalVisible(true)}>
                <Share size={32} weight="bold" color="#EA9215" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={tw`flex flex-row mt-6 justify-between`}>
            <View style={tw`w-70%`}>
              <Text
                style={[
                  tw`font-nokia-bold text-secondary-6 text-4xl leading-tight`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                {devotional.title}
              </Text>
              <View style={tw`border-b border-accent-6 mb-1`} />
              <Text
                style={[
                  tw`font-nokia-bold text-secondary-6 text-sm`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                የዕለቱ የመጽሐፍ ቅዱስ ንባብ ክፍል -
              </Text>
              <Text
                style={tw`font-nokia-bold text-accent-6 text-xl leading-tight`}>
                {devotional.chapter}
              </Text>
            </View>
            <View
              style={tw`flex items-center justify-center border border-accent-6 p-2 rounded-4 w-20 h-20`}>
              <View
                style={tw`flex justify-center gap-[-1] bg-secondary-6 rounded-2 w-16 h-16`}>
                <Text style={tw`font-nokia-bold text-primary-1 text-center`}>
                  {devotional.month}
                </Text>
                <Text
                  style={tw`font-nokia-bold text-primary-1 text-4xl leading-tight text-center`}>
                  {devotional.day}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              tw`border border-accent-6 p-4 rounded-4 mt-4 bg-primary-5 shadow-lg`,
              darkMode ? tw`bg-secondary-8` : null,
            ]}>
            <Text
              selectable
              style={[
                tw`font-nokia-bold text-secondary-6 text-lg leading-tight`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              {devotional.verse}
            </Text>
          </View>
          <View style={tw`mt-8`}>
            <HTMLView
              value={devotional.body[0]} // Assuming body[0] contains HTML string
              stylesheet={tailwindStyles}
              linebreak={false}
            />
          </View>
          <View
            style={[
              tw`border border-accent-6 p-4 rounded-4 mt-8 bg-primary-4 shadow-sm mb-2`,
              darkMode ? tw`bg-secondary-8` : null,
            ]}>
            <Text
              style={tw`font-nokia-bold text-accent-6 text-sm leading-tight text-center`}>
              {devotional.prayer}
            </Text>
          </View>

          {/* Share Devotional Button */}
          <TouchableOpacity
            style={tw`flex flex-row items-center justify-center gap-2 p-3 bg-accent-6 rounded-4 mt-4 mb-2`}
            onPress={() => setShareModalVisible(true)}>
            <Share size={24} weight="bold" color="#FFFFFF" />
            <Text style={tw`font-nokia-bold text-white text-base`}>
              የዕለቱን መንፈሳዊ ትምህርት አጋራ
            </Text>
          </TouchableOpacity>
          <View
            style={tw`border border-accent-6 rounded-4 mt-4 overflow-hidden`}>
            <Image
              source={{
                uri: `${devotional.image}`,
              }}
              style={tw`w-full h-96`}
              resizeMode="cover"
            />
            <View style={tw`flex flex-row gap-2 justify-center my-4`}>
              {/* Change TouchableOpacity to a View with conditional rendering */}

              <>
                <TouchableOpacity
                  style={tw`flex flex-row items-center gap-2 px-2 py-1 bg-accent-6 rounded-4`}
                  onPress={() => handleDownload(setIsDownloading, imageURI)}>
                  {isDownloading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={tw`font-nokia-bold text-primary-1`}>
                        {' '}
                        ምስሉን አውርድ
                      </Text>
                      <DownloadSimple
                        size={28}
                        weight="bold"
                        style={tw`text-primary-1`}
                      />
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`flex flex-row items-center gap-2 px-2 py-1 bg-accent-6 rounded-4`}
                  onPress={() => handleShare(setIsSharing, imageURI)}>
                  {isSharing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={tw`font-nokia-bold text-primary-1`}>
                        {' '}
                        ምስሉን አጋራ
                      </Text>
                      <ShareNetwork
                        size={28}
                        weight="bold"
                        style={tw`text-primary-1`}
                      />
                    </>
                  )}
                </TouchableOpacity>
              </>
            </View>
          </View>
          <View style={tw`flex flex-row justify-between items-center mt-4`}>
            <Text
              style={[
                tw`font-nokia-bold text-secondary-4 text-lg`,
                darkMode ? tw`text-primary-3` : null,
              ]}>
              Discover More
            </Text>
            <TouchableOpacity
              style={tw`border border-accent-6 px-4 py-1 rounded-4`}
              onPress={() =>
                navigation.navigate('Devotional', {
                  screen: 'AllDevotionals',
                })
              }>
              <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                All Devotionals
              </Text>
            </TouchableOpacity>
          </View>
          <View style={tw`flex flex-row flex-wrap justify-between mt-4`}>
            <PreviousDevotions
              devotions={devotionals}
              navigation={navigation}
              darkMode={darkMode}
              currentYear={yearToFetch}
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Share Modal */}
      <DevotionalShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        devotional={devotional}
        darkMode={darkMode}
      />
    </View>
  );
};

export default SelectedDevotional;
