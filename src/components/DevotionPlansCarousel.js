import React from 'react';
import {View, Text, TouchableOpacity, Dimensions} from 'react-native';
import Carousel from 'react-native-snap-carousel';
import DevotionPlanCard from './DevotionPlanCard';
import {useNavigation} from '@react-navigation/native';
import {ArrowRight} from 'phosphor-react-native';
import tw from './../../tailwind';

const {width} = Dimensions.get('window');

const DevotionPlansCarousel = ({
  plans = [],
  darkMode,
  showSeeMore = true,
  onPlanPress,
}) => {
  const navigation = useNavigation();

  if (!plans || plans.length === 0) {
    return null;
  }

  const handlePlanPress = plan => {
    if (onPlanPress) {
      onPlanPress(plan);
    } else {
      navigation.navigate('Devotional', {
        screen: 'DevotionPlans',
      });
    }
  };

  const renderItem = ({item}) => (
    <DevotionPlanCard
      plan={item}
      darkMode={darkMode}
      onPress={handlePlanPress}
    />
  );

  return (
    <View style={tw`mb-4`}>
      {showSeeMore && (
        <View style={tw`flex-row justify-between items-center mb-3`}>
          <Text
            style={[
              tw`font-nokia-bold text-lg`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Devotion Plans
          </Text>
          <TouchableOpacity
            style={tw`flex-row items-center`}
            onPress={() =>
              navigation.navigate('Devotional', {
                screen: 'DevotionPlans',
              })
            }>
            <Text style={tw`font-nokia-bold text-accent-6 text-sm mr-1`}>
              See More
            </Text>
            <ArrowRight size={16} color="#EA9215" weight="bold" />
          </TouchableOpacity>
        </View>
      )}
      <Carousel
        data={plans}
        renderItem={renderItem}
        sliderWidth={width * 0.92}
        itemWidth={width * 0.7}
        layout="default"
        loop={false}
        inactiveSlideScale={0.9}
        inactiveSlideOpacity={0.7}
      />
    </View>
  );
};

export default DevotionPlansCarousel;
