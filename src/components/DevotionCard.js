import React, {useState} from 'react';
import {View, Text, TouchableOpacity, ImageBackground, Share} from 'react-native';
import {BookOpenText, Heart, ShareNetwork, ChatCircle} from 'phosphor-react-native';
import {useSelector} from 'react-redux';
import {useCachedImage} from '../utils/imageCache';
import tw from './../../tailwind';
import {
  useToggleDevotionLikeMutation,
  useGetDevotionLikesQuery,
} from '../redux/api-slices/apiSlice';
import CommentsModal from './CommentsModal';
import Toast from 'react-native-toast-message';

const DevotionCard = ({devotion, darkMode, navigation}) => {
  const user = useSelector(state => state.auth.user);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [isLiked, setIsLiked] = useState(devotion.isLiked || false);
  const [likesCount, setLikesCount] = useState(devotion.likesCount || 0);
  const [sharesCount, setSharesCount] = useState(devotion.sharesCount || 0);
  const [commentsCount, setCommentsCount] = useState(
    devotion.commentsCount || 0,
  );

  const {data: likesData} = useGetDevotionLikesQuery(devotion._id, {
    skip: !user || !devotion._id,
  });

  const [toggleLike, {isLoading: isTogglingLike}] =
    useToggleDevotionLikeMutation();

  // Update likes, shares, and comments state when data changes
  React.useEffect(() => {
    if (likesData) {
      setIsLiked(likesData.isLiked || false);
      setLikesCount(likesData.likesCount || 0);
    } else if (devotion.isLiked !== undefined) {
      setIsLiked(devotion.isLiked);
      setLikesCount(devotion.likesCount || 0);
    }
    // Update shares and comments count from devotion data
    setSharesCount(devotion.sharesCount || 0);
    setCommentsCount(devotion.commentsCount || 0);
  }, [
    likesData,
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

  const handleShare = async () => {
    if (!user) {
      return;
    }

    try {
      const result = await Share.share({
        message: `Check out this daily devotional: ${devotion.title}\n\n${devotion.verse}`,
        title: devotion.title,
      });

      if (result.action === Share.sharedAction) {
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
            onPress={handleShare}>
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
