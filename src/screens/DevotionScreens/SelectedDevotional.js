import React, {useState, useEffect, useRef, useMemo} from 'react';
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
import tw from './../../../tailwind';
import {
  useGetDevotionsQuery,
  useToggleDevotionLikeMutation,
  useGetDevotionLikesQuery,
  useTrackDevotionShareMutation,
  useGetDevotionCommentsQuery,
  apiSlice,
} from '../../redux/api-slices/apiSlice';
import {useDispatch} from 'react-redux';
import Toast from 'react-native-toast-message';
import DevotionalShareModal from '../../components/DevotionalShareModal';
import CommentsModal from '../../components/CommentsModal';
import networkManager from '../../utils/networkManager';
import HighlightableBlock from '../../components/HighlightableBlock';
import HighlightableHtmlBlocks from '../../components/HighlightableHtmlBlocks';
import HighlightActionSheet from '../../components/HighlightActionSheet';
import {
  saveDevotionToCache,
  getCachedDevotion,
} from '../../utils/devotionCache';
import {toEthiopian} from 'ethiopian-date';
import usePersistentHighlights from '../../hooks/usePersistentHighlights';
import {extractHtmlBlocks} from '../../utils/htmlBlocks';
import {formatDevotionalForSharing} from '../../utils/textFormatter';
import useReaderFontScale from '../../hooks/useReaderFontScale';
import AndroidStatusBarSpacer from '../../components/AndroidStatusBarSpacer';

const SelectedDevotional = ({route}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.auth.user);
  const navigation = useNavigation();
  const {devotionalId, year: navigationYear} = route.params;

  const today = new Date();
  const [currentEthiopianYear] = toEthiopian(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );

  // Determine which year to fetch data for
  // Use year from navigation if available, otherwise use current year
  const yearToFetch = navigationYear || currentEthiopianYear;

  const {
    data: devotionals = [],
    isFetching,
    error,
    refetch,
  } = useGetDevotionsQuery({year: yearToFetch, limit: 1000, sort: 'desc'});
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [floatingHighlightSheet, setFloatingHighlightSheet] = useState({
    visible: false,
  });
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [cachedDevotional, setCachedDevotional] = useState(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const scrollViewRef = useRef();
  const {
    scaleTextSize,
    increaseFontScale,
    decreaseFontScale,
    readerFontScalePercentage,
  } = useReaderFontScale();
  const [showFontSizePopup, setShowFontSizePopup] = useState(false);

  const {data: likesData} = useGetDevotionLikesQuery(devotional?._id, {
    skip: !currentUser || !devotional?._id,
  });

  const {data: commentsData} = useGetDevotionCommentsQuery(devotional?._id, {
    skip: !devotional?._id,
  });

  const [toggleLike, {isLoading: isTogglingLike}] =
    useToggleDevotionLikeMutation();
  const [trackShare, {isLoading: isTrackingShare}] =
    useTrackDevotionShareMutation();

  // Note: Do not call refetch on the likes query here. The query runs automatically when
  // skip becomes false (devotional._id + currentUser). Calling refetch when the query
  // was previously skipped causes "Cannot refetch a query that has not been started yet".

  // Update likes, shares, and comments state when data changes
  useEffect(() => {
    if (likesData) {
      setIsLiked(likesData.isLiked || false);
      setLikesCount(likesData.likesCount || 0);
    } else if (devotional?.isLiked !== undefined) {
      setIsLiked(devotional.isLiked);
      setLikesCount(devotional.likesCount || 0);
    }
    // Update shares count from devotional data
    if (devotional) {
      setSharesCount(devotional.sharesCount || 0);
    }
    // Update comments count from API query (same source as modal)
    if (commentsData) {
      setCommentsCount(commentsData.count || 0);
    } else if (devotional?.commentsCount !== undefined) {
      // Fallback to devotional data if API query is not available
      setCommentsCount(devotional.commentsCount || 0);
    }
  }, [
    likesData,
    commentsData,
    devotional,
    devotional?.isLiked,
    devotional?.likesCount,
    devotional?.sharesCount,
    devotional?.commentsCount,
  ]);

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
      // No success message - silent success
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      // Only show error message if something goes wrong
      Toast.show({
        type: 'error',
        text1: 'Failed to like',
        text2: error?.data?.message || 'Please try again.',
      });
    }
  };

  const handleShareDevotion = async () => {
    if (!devotional || !devotional._id) {
      return;
    }

    try {
      const didShare = await handleShare(setIsSharing, devotional.image || '', {
        message: formatDevotionalForSharing(devotional),
        title: devotional.title || 'Daily Devotional',
      });
      if (!didShare) {
        return;
      }
      // Track share on backend to increment share count
      try {
        const shareResult = await trackShare(devotional._id).unwrap();
        // Update share count from backend response
        if (shareResult?.sharesCount !== undefined) {
          setSharesCount(shareResult.sharesCount);
        } else {
          // Fallback: optimistic update if backend doesn't return count
          setSharesCount(prevCount => prevCount + 1);
        }
      } catch (shareError) {
        // Even if tracking fails, still show success (share was successful)
        console.error('Failed to track share:', shareError);
        // Optimistic update
        setSharesCount(prevCount => prevCount + 1);
      }

      Toast.show({
        type: 'success',
        text1: 'Shared successfully',
      });
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

  const devotional = useMemo(
    () =>
      listForDisplay.find(item => item._id === devotionalId) ||
      cachedDevotional ||
      {},
    [listForDisplay, devotionalId, cachedDevotional],
  );
  const highlightCacheKey = useMemo(
    () => `devotional:${devotional._id || devotionalId}`,
    [devotional._id, devotionalId],
  );
  const {
    highlights,
    inlineHighlights,
    setHighlight,
    clearHighlight,
    setInlineHighlight,
  } = usePersistentHighlights(highlightCacheKey);
  const devotionalBodyBlocks = useMemo(
    () => extractHtmlBlocks(devotional.body || []),
    [devotional.body],
  );

  // Load from cache when offline or API fails
  useEffect(() => {
    const loadFromCache = async () => {
      if (
        (!networkManager.isOnline || error) &&
        devotionalId &&
        !devotional?._id
      ) {
        try {
          const cached = await getCachedDevotion(devotionalId);
          if (cached) {
            setCachedDevotional(cached);
            setIsUsingCache(true);
            console.log('📦 Using cached devotional data (offline/error)');
          }
        } catch (error) {
          console.error('Error loading cached devotional:', error);
        }
      } else if (devotional?._id && isUsingCache) {
        // Clear cache flags when fresh data loads
        setIsUsingCache(false);
        setCachedDevotional(null);
      }
    };

    loadFromCache();
  }, [devotionalId, error, devotional?._id, isUsingCache]);

  // Cache devotion when it's loaded
  useEffect(() => {
    if (devotional && devotional._id && !isUsingCache) {
      saveDevotionToCache(devotional);
    }
  }, [devotional, isUsingCache]);

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
        ? tw`text-primary-1 font-nokia-bold`
        : tw`text-secondary-6 font-nokia-bold`),
      fontSize: scaleTextSize(14),
      lineHeight: scaleTextSize(20),
      marginVertical: 0,
    },
    a: {
      ...tw`text-accent-6 font-nokia-bold underline`,
      fontSize: scaleTextSize(14),
      lineHeight: scaleTextSize(20),
    },
    h1: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold`,
          fontSize: scaleTextSize(24),
          lineHeight: scaleTextSize(32),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold`,
          fontSize: scaleTextSize(24),
          lineHeight: scaleTextSize(32),
        },
    h2: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold`,
          fontSize: scaleTextSize(20),
          lineHeight: scaleTextSize(28),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold`,
          fontSize: scaleTextSize(20),
          lineHeight: scaleTextSize(28),
        },
    h3: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold`,
          fontSize: scaleTextSize(18),
          lineHeight: scaleTextSize(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold`,
          fontSize: scaleTextSize(18),
          lineHeight: scaleTextSize(26),
        },
    ol: {
      ...(darkMode
        ? tw`text-primary-1 font-nokia-bold`
        : tw`text-secondary-6 font-nokia-bold`),
      fontSize: scaleTextSize(14),
      lineHeight: scaleTextSize(20),
      marginVertical: 0,
      paddingLeft: 20,
    },
    ul: {
      ...(darkMode
        ? tw`text-primary-1 font-nokia-bold`
        : tw`text-secondary-6 font-nokia-bold`),
      fontSize: scaleTextSize(14),
      lineHeight: scaleTextSize(20),
      marginVertical: 0,
      paddingLeft: 20,
    },
    li: {
      ...(darkMode
        ? tw`text-primary-1 font-nokia-bold`
        : tw`text-secondary-6 font-nokia-bold`),
      fontSize: scaleTextSize(14),
      lineHeight: scaleTextSize(20),
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

  const goToDevotionalHome = () => {
    navigation.navigate('Devotional', {
      screen: 'DevotionalHome',
    });
  };

  // Handle different error states
  if (networkError && !devotionals.length && !cachedDevotional) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : tw`h-100%`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <TouchableOpacity
            style={tw`absolute top-12 left-6`}
            onPress={goToDevotionalHome}>
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
            onPress={goToDevotionalHome}>
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
          onPress={goToDevotionalHome}>
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
            onPress={goToDevotionalHome}>
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
            onPress={goToDevotionalHome}>
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
        <AndroidStatusBarSpacer minHeight={4} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          ref={scrollViewRef}
          removeClippedSubviews>
          <View
            style={tw`flex flex-row justify-between items-center mt-4 mb-4`}>
            <TouchableOpacity onPress={goToDevotionalHome}>
              <ArrowSquareLeft size={36} weight="fill" color={'#EA9215'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                tw`border border-accent-6 rounded-full px-3 py-1`,
                darkMode ? tw`bg-secondary-8` : tw`bg-primary-1`,
              ]}
              onPress={() => setShowFontSizePopup(previous => !previous)}>
              <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>A+</Text>
            </TouchableOpacity>
            {showFontSizePopup && (
              <View
                style={[
                  tw`absolute right-0 top-11 rounded-full px-3 py-2 border flex-row items-center`,
                  darkMode
                    ? tw`bg-secondary-9 border-secondary-6`
                    : tw`bg-primary-1 border-primary-4`,
                ]}>
                <TouchableOpacity
                  onPress={decreaseFontScale}
                  style={tw`px-3 py-1 rounded-full bg-accent-6`}>
                  <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>
                    A-
                  </Text>
                </TouchableOpacity>
                <Text
                  style={[
                    tw`font-nokia-bold text-sm px-2`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                  ]}>
                  {readerFontScalePercentage}%
                </Text>
                <TouchableOpacity
                  onPress={increaseFontScale}
                  style={tw`px-3 py-1 rounded-full bg-accent-6`}>
                  <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>
                    A+
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
            <HighlightableBlock
              blockId="verse-card"
              text={[verse, reference].filter(Boolean).join('\n')}
              darkMode={darkMode}
              activeColorId={highlights['verse-card']}
              onSelectColor={setHighlight}
              onClearHighlight={clearHighlight}
              style={tw`rounded-4 p-1`}>
              <>
                <Text
                  selectable
                  style={[
                    tw`font-nokia-bold text-secondary-6`,
                    darkMode ? tw`text-primary-1` : null,
                    {
                      fontSize: scaleTextSize(18),
                      lineHeight: scaleTextSize(26),
                    },
                  ]}>
                  {verse}
                </Text>
                {reference && (
                  <View style={tw`border-t border-accent-6 mt-3 pt-3`}>
                    <Text
                      style={[
                        tw`font-nokia-bold text-accent-6`,
                        darkMode ? tw`text-accent-6` : null,
                        {
                          fontSize: scaleTextSize(18),
                          lineHeight: scaleTextSize(26),
                        },
                      ]}>
                      {reference}
                    </Text>
                  </View>
                )}
              </>
            </HighlightableBlock>
          </View>
          <View style={tw`mt-8`}>
            <HighlightableHtmlBlocks
              blocks={devotionalBodyBlocks}
              darkMode={darkMode}
              highlights={highlights}
              inlineHighlights={inlineHighlights}
              onSelectColor={setHighlight}
              onSelectInlineColor={setInlineHighlight}
              onClearHighlight={clearHighlight}
              onFloatingSheetChange={setFloatingHighlightSheet}
              stylesheet={tailwindStyles}
              blockContainerStyle={tw`rounded-4 px-2 py-1 mb-2`}
            />
          </View>
          <View
            style={[
              tw`border border-accent-6 p-4 rounded-4 mt-8 bg-primary-4 shadow-sm mb-2`,
              darkMode ? tw`bg-secondary-8` : null,
            ]}>
            <HighlightableBlock
              blockId="prayer-card"
              text={devotional.prayer || ''}
              darkMode={darkMode}
              activeColorId={highlights['prayer-card']}
              onSelectColor={setHighlight}
              onClearHighlight={clearHighlight}
              style={tw`rounded-4 p-1`}>
              <Text
                style={[
                  tw`font-nokia-bold text-accent-6 text-center`,
                  {
                    fontSize: scaleTextSize(14),
                    lineHeight: scaleTextSize(20),
                  },
                ]}>
                {devotional.prayer}
              </Text>
            </HighlightableBlock>
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
            <View
              style={tw`flex-row items-center justify-center gap-6 mt-4 mb-2`}>
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
                <Text
                  style={[
                    tw`font-nokia-bold text-xs mt-1`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  {sharesCount || 0}
                </Text>
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
                  {commentsCount || 0}
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

      {floatingHighlightSheet?.visible ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            pointerEvents="box-none"
            style={[tw`absolute left-3 right-3`, {bottom: 16}]}>
            <HighlightActionSheet
              visible={Boolean(floatingHighlightSheet?.visible)}
              useModal={false}
              darkMode={darkMode}
              selectedCount={floatingHighlightSheet?.selectedCount || 0}
              selectedText={floatingHighlightSheet?.selectedText || ''}
              onClose={floatingHighlightSheet?.onClose || (() => {})}
              onSelectColor={
                floatingHighlightSheet?.onSelectColor || (async () => {})
              }
              onClearHighlights={
                floatingHighlightSheet?.onClearHighlights || (async () => {})
              }
              onOpenFreeSelection={floatingHighlightSheet?.onOpenFreeSelection}
              freeSelectionEnabled={Boolean(
                floatingHighlightSheet?.freeSelectionEnabled,
              )}
              allowBlockHighlight={Boolean(
                floatingHighlightSheet?.allowBlockHighlight,
              )}
            />
          </View>
        </View>
      ) : null}

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
