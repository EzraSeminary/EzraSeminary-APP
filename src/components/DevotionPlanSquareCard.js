import React from 'react';
import {View, Text, TouchableOpacity, ImageBackground} from 'react-native';
import {ArrowSquareRight, CheckCircle} from 'phosphor-react-native';
import {useCachedImage} from '../utils/imageCache';
import tw from './../../tailwind';

const DevotionPlanSquareCard = ({plan, darkMode, onPress, isStarted}) => {
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

  const imageUrl = plan.image || '';
  const cachedImage = useCachedImage(imageUrl);

  const handlePress = () => {
    if (onPress && plan) {
      onPress(plan);
    }
  };

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
        {isStarted && (
          <View style={tw`absolute top-2 right-2`}>
            <CheckCircle size={24} color="#10B981" weight="fill" />
          </View>
        )}
        <View style={tw`flex-1 justify-end p-3`}>
          <Text
            style={tw`font-nokia-bold text-white text-xl `}
            numberOfLines={2}>
            {plan.title || 'Untitled Plan'}
          </Text>
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
