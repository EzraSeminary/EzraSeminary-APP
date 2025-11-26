import React from 'react';
import {View, Text, TouchableOpacity, Image} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Play} from 'phosphor-react-native';
import tw from './../../tailwind';

const DevotionPlanProgressCard = ({plan, progress, darkMode}) => {
  const navigation = useNavigation();

  if (!plan || !progress) {
    return null;
  }

  const totalDays = plan.numItems || 0;
  // Progress can be in different formats: progress.itemsCompleted or progress.completed
  const itemsCompleted =
    progress?.itemsCompleted || progress?.completed || [];
  const completedCount = Array.isArray(itemsCompleted)
    ? itemsCompleted.length
    : progress?.completed || 0;
  const progressPercentage =
    totalDays > 0 ? (completedCount / totalDays) * 100 : 0;

  const handleContinue = () => {
    navigation.navigate('Devotional', {
      screen: 'PlanDevotionViewer',
      params: {planId: plan._id || plan.planId},
    });
  };

  return (
    <View
      style={[
        tw`border border-accent-6 rounded-4 p-4 mb-4`,
        darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
      ]}>
      <View style={tw`flex-row items-center mb-3`}>
        <View style={tw`h-16 w-16 rounded-3 overflow-hidden mr-3`}>
          <Image
            source={{
              uri: plan.image || 'https://via.placeholder.com/100x100',
            }}
            style={tw`w-full h-full`}
            resizeMode="cover"
          />
        </View>
        <View style={tw`flex-1`}>
          <Text
            style={[
              tw`font-nokia-bold text-lg mb-1`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}
            numberOfLines={2}>
            Continue Your Devotion Plan
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}
            numberOfLines={1}>
            {plan.title}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={tw`mb-3`}>
        <View style={tw`flex-row justify-between items-center mb-2`}>
          <Text
            style={[
              tw`font-nokia-bold text-xs`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            {completedCount} of {totalDays} days
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-xs`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            {Math.round(progressPercentage)}%
          </Text>
        </View>
        <View
          style={[
            tw`h-2 rounded-full overflow-hidden`,
            darkMode ? tw`bg-secondary-9` : tw`bg-primary-4`,
          ]}>
          <View
            style={[
              tw`h-full bg-accent-6`,
              {width: `${progressPercentage}%`},
            ]}
          />
        </View>
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={tw`flex-row items-center justify-center py-2 px-4 rounded-full bg-accent-6`}
        onPress={handleContinue}>
        <Play size={16} color="#FFFFFF" weight="fill" />
        <Text style={tw`font-nokia-bold text-primary-1 text-sm ml-2`}>
          Continue Plan
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default DevotionPlanProgressCard;
