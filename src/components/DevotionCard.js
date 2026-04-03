import React, {useState} from 'react';
import {View, Text, TouchableOpacity, ImageBackground} from 'react-native';
import {BookOpenText, Heart, ShareNetwork, ChatCircle} from 'phosphor-react-native';
import {useSelector} from 'react-redux';
import {useCachedImage} from '../utils/imageCache';
import tw from './../../tailwind';
import {
  useToggleDevotionLikeMutation,
  useGetDevotionLikesQuery,
  useTrackDevotionShareMutation,
  useGetDevotionCommentsQuery,
} from '../redux/api-slices/apiSlice';
import CommentsModal from './CommentsModal';
import Toast from 'react-native-toast-message';
import {handleShare as shareWithImage} from './handleShare';
import {formatDevotionalForSharing} from '../utils/textFormatter';

const DevotionCard = ({devotion, darkMode, navigation}) => {
  const user = useSelector(state => state.auth.user);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [isLiked, setIsLiked] = useState(devotion.isLiked || false);
  const [likesCount, setLikesCount] = useState(devotion.likesCount || 0);
  const [sharesCount, setSharesCount] = useState(devotion.sharesCount || 0);
  const [commentsCount, setCommentsCount] = useState(
    devotion.commentsCount || 0,
  );
  const [isSharing, setIsSharing] = useState(false);

  const {data: likesData, refetch: refetchLikes} = useGetDevotionLikesQuery(
    devotion._id,
    {
      skip: !user || !devotion._id,
    },
  );

  const {data: commentsData} = useGetDevotionCommentsQuery(devotion._id, {
    skip: !devotion._id,
  });

  const [toggleLike, {isLoading: isTogglingLike}] =
    useToggleDevotionLikeMutation();
  const [trackShare, {isLoading: isTrackingShare}] =
    useTrackDevotionShareMutation();

  // Refetch likes when user logs in to ensure persistence
  React.useEffect(() => {
    if (user && devotion._id) {
      refetchLikes();
    }
  }, [user, devotion._id, refetchLikes]);

  // Update likes, shares, and comments state when data changes
  React.useEffect(() => {
    if (likesData) {
      setIsLiked(likesData.isLiked || false);
      setLikesCount(likesData.likesCount || 0);
    } else if (devotion.isLiked !== undefined) {
      setIsLiked(devotion.isLiked);
      setLikesCount(devotion.likesCount || 0);
    }
    // Update shares count from devotion data
    setSharesCount(devotion.sharesCount || 0);
    // Update comments count from API query (same source as modal)
    if (commentsData) {
      setCommentsCount(commentsData.count || 0);
    } else if (devotion.commentsCount !== undefined) {
      // Fallback to devotion data if API query is not available
      setCommentsCount(devotion.commentsCount || 0);
    }
  }, [
    likesData,
    commentsData,
    devotion.isLiked,
    devotion.likesCount,
    devotion.sharesCount,
    devotion.commentsCount,
  ]);

  const handleLike = async () => {
    if (!user) {
      return;
    }

    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount(previousLiked ? likesCount - 1 : likesCount + 1);

    try {
      const result = await toggleLike(devotion._id).unwrap();
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

  const handleShare = async () => {
    if (!devotion || !devotion._id) {
      return;
    }

    try {
      const didShare = await shareWithImage(setIsSharing, devotion.image || '', {
        message: formatDevotionalForSharing(devotion),
        title: devotion.title || 'Daily Devotional',
      });
      if (!didShare) {
        return;
      }
      // Track share on backend to increment share count
      try {
        const shareResult = await trackShare(devotion._id).unwrap();
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
    if (!user) {
      return;
    }
    setShowCommentsModal(true);
  };
  // Safety check: return null if devotion is missing
  if (!devotion || !devotion.verse || !devotion._id) {
    return null;
  }

  const verseText = devotion.verse || '';

  // Extract the verse content and reference
  // Handle various quote types: double quotes, single quotes, and mixed quotes
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

  const cachedImage = useCachedImage(devotion.image || '');

  return (
    <ImageBackground
      source={{uri: cachedImage}}
      style={[
        tw`border border-accent-6 mt-3 rounded-4 shadow-md px-4 py-4`,
        darkMode ? tw`bg-secondary-8` : null,
      ]}
      imageStyle={tw`rounded-4`}>
      <View style={tw`absolute inset-0 bg-black bg-opacity-60 rounded-4`} />
      <View style={tw`flex flex-row w-[100%] justify-between items-center`}>
        <View style={tw`flex flex-row items-center gap-2`}>
          <BookOpenText size={32} weight="bold" style={tw`text-accent-6`} />
          <Text
            style={[
              tw`text-primary-2 font-nokia-bold text-lg`,
              darkMode ? tw`text-primary-2` : null,
            ]}>
            የዕለቱ ጥቅስ -
          </Text>
          <Text style={tw`text-accent-6 font-nokia-bold text-lg`}>
            {devotion.month} {devotion.day}
          </Text>
        </View>
        <TouchableOpacity
          style={tw`bg-accent-6 px-4 py-1 rounded-full`}
          onPress={() => {
            navigation.navigate('Devotional', {
              screen: 'SelectedDevotional',
              params: {devotionalId: devotion._id, year: devotion.year || 2018},
            });
          }}>
          <Text style={tw`text-primary-1 font-nokia-bold text-sm`}>ክፈት</Text>
        </TouchableOpacity>
      </View>
      <View style={tw`border-b border-accent-6 mt-2`} />
      <View>
        <Text
          style={[
            tw`font-nokia-bold text-xl text-primary-2 mt-4 `,
            darkMode ? tw`text-primary-2` : null,
          ]}>
          {verse}
        </Text>
        <View style={tw`border-t border-accent-6 mt-2 pt-2 w-[50%]`}>
          <Text
            style={[
              tw`font-nokia-bold text-accent-6 text-lg leading-tight`,
              darkMode ? tw`text-accent-6` : null,
            ]}>
            {reference}
          </Text>
        </View>
      </View>

      {/* Like, Share, Comment Actions - Only show when user is logged in */}
      {user && (
        <View style={tw`flex-row items-center justify-end gap-4 mt-4`}>
          <TouchableOpacity
            style={tw`flex-row items-center gap-1`}
            onPress={handleLike}
            disabled={isTogglingLike}>
            <Heart
              size={20}
              weight={isLiked ? 'fill' : 'regular'}
              color={isLiked ? '#EF4444' : '#FFFFFF'}
            />
            <Text style={tw`font-nokia-bold text-primary-2 text-sm`}>
              {likesCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`flex-row items-center gap-1`}
            onPress={handleShare}
            disabled={isTrackingShare || isSharing}>
            <ShareNetwork size={20} weight="regular" color="#FFFFFF" />
            <Text style={tw`font-nokia-bold text-primary-2 text-sm`}>
              {sharesCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`flex-row items-center gap-1`}
            onPress={handleComment}>
            <ChatCircle size={20} weight="regular" color="#FFFFFF" />
            <Text style={tw`font-nokia-bold text-primary-2 text-sm`}>
              {commentsCount || 0}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Comments Modal */}
      <CommentsModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        devotionId={devotion._id}
        darkMode={darkMode}
      />
    </ImageBackground>
  );
};

export default DevotionCard;
