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
  Share as RNShare,
} from 'react-native';
import {useCachedImage} from '../../utils/imageCache';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import handleDownload from '../../components/handleDownload';
import {handleShare} from '../../components/handleShare';
import {
  DownloadSimple,
  ShareNetwork,
  ArrowSquareLeft,
  Share,
  Heart,
  ChatCircle,
} from 'phosphor-react-native';
import ErrorScreen from '../../components/ErrorScreen';
import PreviousDevotions from './PreviousDevotions';
import HTMLView from 'react-native-htmlview';
import tw from './../../../tailwind';
import {
  useGetDevotionsQuery,
  useToggleDevotionLikeMutation,
  useGetDevotionLikesQuery,
  apiSlice,
} from '../../redux/api-slices/apiSlice';
import {useDispatch} from 'react-redux';
import Toast from 'react-native-toast-message';
import DevotionalShareModal from '../../components/DevotionalShareModal';
import CommentsModal from '../../components/CommentsModal';
import networkManager from '../../utils/networkManager';

const SelectedDevotional = ({route}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const dispatch = useDispatch();
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
  } = useGetDevotionsQuery({year: 2018, limit: 1000, sort: 'desc'}); // Fetch 2018 devotions
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const scrollViewRef = useRef();

  const {data: likesData} = useGetDevotionLikesQuery(devotional?._id, {
    skip: !currentUser || !devotional?._id,
  });

  const [toggleLike, {isLoading: isTogglingLike}] =
    useToggleDevotionLikeMutation();

  // Update likes state when data changes
  useEffect(() => {
    if (likesData) {
      setIsLiked(likesData.isLiked || false);
      setLikesCount(likesData.likesCount || 0);
    } else if (devotional?.isLiked !== undefined) {
      setIsLiked(devotional.isLiked);
      setLikesCount(devotional.likesCount || 0);
    }
  }, [likesData, devotional?.isLiked, devotional?.likesCount]);

  const handleLike = async () => {
    if (!currentUser || !devotional?._id) {
      return;
    }

    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount(previousLiked ? likesCount - 1 : likesCount + 1);

    try {
      const result = await toggleLike(devotional._id).unwrap();
      setIsLiked(result.isLiked);
      setLikesCount(result.likesCount);
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      Toast.show({
        type: 'error',
        text1: 'Failed to like',
        text2: error?.data?.message || 'Please try again.',
      });
    }
  };

  const handleShareDevotion = async () => {
    if (!currentUser || !devotional) {
      return;
    }

    try {
      const result = await RNShare.share({
        message: `Check out this daily devotional: ${devotional.title}\n\n${devotional.verse}`,
        title: devotional.title,
      });

      if (result.action === RNShare.sharedAction) {
        Toast.show({
          type: 'success',
          text1: 'Shared successfully',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to share',
        text2: 'Please try again.',
      });
    }
  };

  const handleComment = () => {
    if (!currentUser || !devotional?._id) {
      return;
    }
    setShowCommentsModal(true);
  };
  // API already returns only 2018 devotions, no need to filter
  const listForDisplay = devotionals;

  const devotional =
    listForDisplay.find(item => item._id === devotionalId) || {};

  // Extract the verse content and reference
  // Handle various quote types: double quotes, single quotes, and mixed quotes
  const separateVerseAndReference = verseText => {
    if (!verseText) {
      return {verse: '', reference: ''};
    }

    const quotePatterns = ['"', "'", '\u201C', '\u201D', '\u2018', '\u2019'];
    let lastQuoteIndex = -1;
    let lastQuoteChar = '';

    // Find the last occurrence of any quote type
    for (const quote of quotePatterns) {
      const index = verseText.lastIndexOf(quote);
      if (index > lastQuoteIndex) {
        lastQuoteIndex = index;
        lastQuoteChar = quote;
      }
    }

    let verse = '';
    let reference = '';

    if (lastQuoteIndex !== -1) {
      // Separate the verse content and reference
      verse = verseText
        .substring(0, lastQuoteIndex + lastQuoteChar.length)
        .trim(); // Everything up to the last closing quote
      reference = verseText
        .substring(lastQuoteIndex + lastQuoteChar.length)
        .trim(); // Everything after the last closing quote
    } else {
      // If no quotes are found, treat the entire text as the verse
      verse = verseText;
    }

    return {verse, reference};
  };

  const {verse, reference} = separateVerseAndReference(devotional.verse);

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
      Toast.show({
        type: 'error',
        text1: 'No Internet Connection',
        text2: 'Please connect to the internet.',
      });
      return;
    }

    try {
      console.log('SelectedDevotional: Invalidating cache and refetching...');
      dispatch(apiSlice.util.invalidateTags(['Devotions']));
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await refetch();
      console.log(
        'SelectedDevotional: Refetch complete',
        result?.data?.length || 0,
      );

      if (result?.data?.length > 0) {
        Toast.show({
          type: 'success',
          text1: 'Data Refreshed',
          text2: `Loaded ${result.data.length} devotionals`,
        });
      }
    } catch (err) {
      console.error('Retry error:', err);
      Toast.show({
        type: 'error',
        text1: 'Retry Failed',
        text2: 'Unable to fetch devotionals.',
      });
    }
  };

  const imageURI = `${devotional.image}`;
  const cachedImage = useCachedImage(imageURI);

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
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('Devotional', {screen: 'Devotion'})
              }>
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
              {verse}
            </Text>
            {reference && (
              <View style={tw`border-t border-accent-6 mt-3 pt-3`}>
                <Text
                  style={[
                    tw`font-nokia-bold text-accent-6 text-lg leading-tight`,
                    darkMode ? tw`text-accent-6` : null,
                  ]}>
                  {reference}
                </Text>
              </View>
            )}
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

          {/* Like, Share, Comment Actions - Only show when user is logged in */}
          {currentUser && (
            <View style={tw`flex-row items-center justify-center gap-6 mt-4 mb-2`}>
              <TouchableOpacity
                style={tw`items-center`}
                onPress={handleLike}
                disabled={isTogglingLike || !devotional?._id}>
                <Heart
                  size={28}
                  weight={isLiked ? 'fill' : 'regular'}
                  color={isLiked ? '#EF4444' : '#EA9215'}
                />
                <Text
                  style={[
                    tw`font-nokia-bold text-xs mt-1`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  {likesCount || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`items-center`}
                onPress={handleShareDevotion}>
                <ShareNetwork size={28} weight="regular" color="#EA9215" />
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`items-center`}
                onPress={handleComment}>
                <ChatCircle size={28} weight="regular" color="#EA9215" />
                <Text
                  style={[
                    tw`font-nokia-bold text-xs mt-1`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  {devotional?.commentsCount || 0}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View
            style={tw`border border-accent-6 rounded-4 mt-4 overflow-hidden`}>
            <Image
              source={{
                uri: cachedImage,
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
              devotions={listForDisplay}
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

      {/* Comments Modal */}
      {devotional?._id && (
        <CommentsModal
          visible={showCommentsModal}
          onClose={() => setShowCommentsModal(false)}
          devotionId={devotional._id}
          darkMode={darkMode}
        />
      )}
    </View>
  );
};

export default SelectedDevotional;
