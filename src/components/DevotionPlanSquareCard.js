import React from 'react';
import {View, Text, TouchableOpacity, ImageBackground} from 'react-native';
import {
  ArrowSquareRight,
  ArrowClockwise,
  CheckCircle,
  Sparkle,
} from 'phosphor-react-native';
import {useCachedImage} from '../utils/imageCache';
import tw from './../../tailwind';

const DevotionPlanSquareCard = ({
  plan,
  darkMode,
  onPress,
  isStarted,
  status,
  progressLabel,
}) => {
  const imageUrl = plan?.image || '';
  const cachedImage = useCachedImage(imageUrl);

  // Early return with null if plan is invalid
  if (!plan) {
    return null;
  }

  // Ensure plan has an _id, if not, try to use id or return null
  const planId = plan._id || plan.id;
  if (!planId) {
    console.warn('DevotionPlanSquareCard: Plan missing _id or id', plan);
    return null;
  }

  const handlePress = () => {
    if (onPress && plan) {
      onPress(plan);
    }
  };

  const resolvedStatus = status || (isStarted ? 'completed' : 'new');
  const isCompleted = resolvedStatus === 'completed';
  const isInProgress = resolvedStatus === 'in_progress';
  const isNew = resolvedStatus === 'new';

  return (
    <TouchableOpacity
      style={tw`w-40 h-40 mr-3 rounded-4 overflow-hidden`}
      onPress={handlePress}
      activeOpacity={0.8}>
      <ImageBackground
        source={
          cachedImage
            ? {uri: cachedImage}
            : {
                uri: 'https://via.placeholder.com/160x160/EA9215/FFFFFF?text=Plan',
              }
        }
        style={tw`w-full h-full`}
        imageStyle={tw`rounded-4`}>
        <View style={tw`absolute inset-0 bg-black bg-opacity-50 rounded-4`} />
        {isCompleted && (
          <View style={tw`absolute top-2 right-2`}>
            <CheckCircle size={24} color="#10B981" weight="fill" />
          </View>
        )}
        {isInProgress && (
          <View style={tw`absolute top-2 right-2`}>
            <ArrowClockwise size={24} color="#F59E0B" weight="bold" />
          </View>
        )}
        {isNew && (
          <View
            style={tw`absolute top-2 right-2 bg-accent-6 px-2 py-1 rounded-full flex-row items-center`}>
            <Sparkle size={12} color="#FFFFFF" weight="fill" />
            <Text style={tw`font-nokia-bold text-white text-xs ml-1`}>NEW</Text>
          </View>
        )}
        <View style={tw`flex-1 justify-end p-3`}>
          <Text
            style={tw`font-nokia-bold text-white text-xl `}
            numberOfLines={2}>
            {plan.title || 'Untitled Plan'}
          </Text>
          {isInProgress && (
            <Text style={tw`font-nokia-bold text-amber-300 text-xs mt-1`}>
              {progressLabel || 'In Progress'}
            </Text>
          )}
          {plan.numItems != null && plan.numItems > 0 && (
            <View style={tw`flex-row items-center justify-between mt-1`}>
              <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                {plan.numItems} {plan.numItems === 1 ? 'day' : 'days'}
              </Text>
              <ArrowSquareRight size={24} color="#EA9215" weight="fill" />
            </View>
          )}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

export default DevotionPlanSquareCard;
