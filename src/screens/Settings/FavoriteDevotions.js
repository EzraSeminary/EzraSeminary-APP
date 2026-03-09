import React, {useMemo} from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {ArrowLeft, Heart} from 'phosphor-react-native';
import {useSelector} from 'react-redux';
import tw from './../../../tailwind';
import DevotionCard from '../../components/DevotionCard';
import {useGetDevotionsQuery} from '../../redux/api-slices/apiSlice';

const FavoriteDevotions = ({navigation}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const user = useSelector(state => state.auth.user);

  const {
    data: devotions = [],
    isLoading,
    refetch,
    error,
  } = useGetDevotionsQuery({limit: 1000, sort: 'desc'}, {skip: !user});

  const favoriteDevotions = useMemo(
    () => devotions.filter(devotion => devotion?.isLiked),
    [devotions],
  );

  if (!user) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 flex-1` : tw`flex-1`}>
        <View style={tw`px-5 pt-5`}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#EA9215" weight="bold" />
          </TouchableOpacity>
        </View>
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Login required
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-base text-center mt-3`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            Sign in to view your favorite devotionals.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={darkMode ? tw`bg-secondary-9 flex-1` : tw`flex-1`}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`px-5 pt-5 pb-8`}>
        <View style={tw`flex-row items-center justify-between mb-5`}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#EA9215" weight="bold" />
          </TouchableOpacity>
          <View style={tw`flex-row items-center`}>
            <Heart size={20} color="#EA9215" weight="fill" />
            <Text
              style={[
                tw`font-nokia-bold text-xl ml-2`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Favorite Devotions
            </Text>
          </View>
          <View style={{width: 24}} />
        </View>

        {isLoading ? (
          <View style={tw`items-center justify-center py-20`}>
            <ActivityIndicator size="large" color="#EA9215" />
          </View>
        ) : error ? (
          <View style={tw`items-center justify-center py-20`}>
            <Text
              style={[
                tw`font-nokia-bold text-lg text-center`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Unable to load favorites
            </Text>
            <TouchableOpacity
              onPress={refetch}
              style={tw`bg-accent-6 px-5 py-3 rounded-full mt-4`}>
              <Text style={tw`font-nokia-bold text-white`}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : favoriteDevotions.length === 0 ? (
          <View style={tw`items-center justify-center py-20 px-6`}>
            <Heart size={42} color="#EA9215" weight="regular" />
            <Text
              style={[
                tw`font-nokia-bold text-xl text-center mt-4`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              No favorite devotionals yet
            </Text>
            <Text
              style={[
                tw`font-nokia-bold text-base text-center mt-3`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              Tap the heart on a devotional and it will appear here.
            </Text>
          </View>
        ) : (
          favoriteDevotions.map(devotion => (
            <DevotionCard
              key={devotion._id}
              devotion={devotion}
              darkMode={darkMode}
              navigation={navigation}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FavoriteDevotions;
