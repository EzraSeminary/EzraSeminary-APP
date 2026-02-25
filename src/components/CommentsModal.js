import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  Animated,
  useWindowDimensions,
} from 'react-native';
import {X, PaperPlaneTilt, Trash} from 'phosphor-react-native';
import {useSelector} from 'react-redux';
import tw from './../../tailwind';
import {
  useGetDevotionCommentsQuery,
  useAddDevotionCommentMutation,
  useDeleteDevotionCommentMutation,
} from '../redux/api-slices/apiSlice';
import Toast from 'react-native-toast-message';

const formatTimeAgo = dateString => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const CommentsModal = ({visible, onClose, devotionId, darkMode}) => {
  const [commentText, setCommentText] = useState('');
  const {height: screenHeight} = useWindowDimensions();
  const [slideAnim] = useState(new Animated.Value(screenHeight));
  const user = useSelector(state => state.auth.user);

  const {
    data: commentsData,
    isLoading,
    refetch,
  } = useGetDevotionCommentsQuery(devotionId, {
    skip: !visible || !devotionId,
  });

  const [addComment, {isLoading: isAddingComment}] =
    useAddDevotionCommentMutation();
  const [deleteComment, {isLoading: isDeletingComment}] =
    useDeleteDevotionCommentMutation();

  const comments = commentsData?.comments || [];
  const commentsCount = commentsData?.count || 0;

  useEffect(() => {
    slideAnim.setValue(screenHeight);
  }, [screenHeight, slideAnim]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, screenHeight]);

  const handlePostComment = async () => {
    if (!commentText.trim()) {
      return;
    }

    try {
      await addComment({id: devotionId, text: commentText.trim()}).unwrap();
      setCommentText('');
      Toast.show({
        type: 'success',
        text1: 'Comment posted',
        text2: 'Your comment has been added successfully.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to post comment',
        text2: error?.data?.message || 'Please try again.',
      });
    }
  };

  const handleDeleteComment = async commentId => {
    try {
      await deleteComment({id: devotionId, commentId}).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Comment deleted',
        text2: 'Your comment has been removed.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to delete comment',
        text2: error?.data?.message || 'Please try again.',
      });
    }
  };

  const renderComment = ({item}) => {
    const isOwner = user && item.user?._id === user._id;
    const userInitial = item.user?.firstName?.[0] || 'U';

    return (
      <View
        style={[
          tw`flex-row mb-4`,
          darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
          tw`p-3 rounded-4`,
        ]}>
        <View style={tw`mr-3`}>
          {item.user?.avatar ? (
            <Image
              source={{uri: item.user.avatar}}
              style={tw`w-10 h-10 rounded-full`}
            />
          ) : (
            <View
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                {backgroundColor: '#EA9215'},
              ]}>
              <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>
                {userInitial}
              </Text>
            </View>
          )}
        </View>
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center mb-1`}>
            <Text
              style={[
                tw`font-nokia-bold text-sm`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              {item.user?.firstName} {item.user?.lastName}
            </Text>
            <Text
              style={[
                tw`font-nokia-bold text-xs ml-2`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>
          <Text
            style={[
              tw`font-nokia-bold text-sm mb-2`,
              darkMode ? tw`text-primary-2` : tw`text-secondary-7`,
            ]}>
            {item.text}
          </Text>
          {isOwner && (
            <TouchableOpacity
              style={tw`self-start`}
              onPress={() => handleDeleteComment(item._id)}
              disabled={isDeletingComment}>
              <Trash size={16} color="#EF4444" weight="bold" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <View style={tw`flex-1`}>
        <TouchableOpacity
          style={tw`flex-1 bg-black bg-opacity-50`}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            tw`absolute bottom-0 left-0 right-0`,
            {
              backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: screenHeight * 0.8,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <View
            style={[
              tw`p-4 border-b`,
              darkMode ? tw`border-secondary-7` : tw`border-primary-4`,
            ]}>
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <Text
                style={[
                  tw`font-nokia-bold text-xl`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}>
                Comments {commentsCount > 0 && `(${commentsCount})`}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={darkMode ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>

            {/* Comment Input */}
            <View style={tw`flex-row items-center`}>
              <TextInput
                style={[
                  tw`flex-1 border rounded-4 px-4 py-2 mr-2 font-nokia-bold`,
                  darkMode
                    ? tw`bg-secondary-8 border-secondary-7 text-primary-1`
                    : tw`bg-primary-5 border-primary-4 text-secondary-8`,
                ]}
                placeholder="Write a comment..."
                placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[
                  tw`p-2 rounded-full`,
                  {backgroundColor: '#EA9215'},
                  (!commentText.trim() || isAddingComment) && tw`opacity-50`,
                ]}
                onPress={handlePostComment}
                disabled={!commentText.trim() || isAddingComment}>
                {isAddingComment ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <PaperPlaneTilt size={20} color="#FFFFFF" weight="bold" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments List */}
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={item => item._id}
            contentContainerStyle={tw`p-4`}
            ListEmptyComponent={
              isLoading ? (
                <View style={tw`py-8 items-center`}>
                  <ActivityIndicator size="large" color="#EA9215" />
                </View>
              ) : (
                <View style={tw`py-8 items-center`}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-sm`,
                      darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                    ]}>
                    No comments yet. Be the first to comment!
                  </Text>
                </View>
              )
            }
            refreshing={isLoading}
            onRefresh={refetch}
            removeClippedSubviews
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

export default CommentsModal;
