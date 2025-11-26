import React from 'react';
import {View, Text, Image, TouchableOpacity} from 'react-native';
import tw from './../../tailwind';

const DevotionPlanCard = ({plan, darkMode, onPress, showStartButton = true}) => {
  return (
    <View style={tw`border border-accent-6 mt-4 rounded-4 p-2 mr-4`}>
      <View style={tw`h-48`}>
        <Image
          source={{
            uri: plan.image || 'https://via.placeholder.com/300x200',
          }}
          style={tw`w-full h-full rounded-3`}
          resizeMode="cover"
        />
      </View>
      <Text
        style={[
          tw`font-nokia-bold text-secondary-6 text-xl mt-2`,
          darkMode ? tw`text-primary-3` : null,
        ]}
        numberOfLines={2}>
        {plan.title}
      </Text>
      {plan.description && (
        <Text
          style={[
            tw`font-nokia-bold text-secondary-5 text-sm mt-1`,
            darkMode ? tw`text-primary-4` : null,
          ]}
          numberOfLines={2}>
          {plan.description}
        </Text>
      )}
      {plan.numItems && (
        <Text
          style={[
            tw`font-nokia-bold text-accent-6 text-sm mt-1`,
          ]}>
          {plan.numItems} days
        </Text>
      )}
      {showStartButton && (
        <TouchableOpacity
          style={tw`bg-accent-6 px-4 py-2 rounded-full w-36 mt-2`}
          onPress={() => onPress(plan)}>
          <Text style={tw`text-primary-1 font-nokia-bold text-sm text-center`}>
            Start Plan
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default DevotionPlanCard;
