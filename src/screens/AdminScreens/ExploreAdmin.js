import React, {useState} from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {ArrowLeft, Folder, File, Plus} from 'phosphor-react-native';
import tw from './../../../tailwind';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {
  useGetAdminExploreCategoriesQuery,
} from '../../redux/api-slices/apiSlice';

const ExploreAdmin = () => {
  const navigation = useNavigation();
  const darkMode = useSelector(state => state.ui.darkMode);
  const {data: categories, isLoading} = useGetAdminExploreCategoriesQuery();

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        {backgroundColor: darkMode ? '#111827' : '#F9FAFB'},
      ]}>
      {/* Header */}
      <View
        style={[
          tw`flex-row items-center justify-between p-4 border-b`,
          {
            backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
            borderBottomColor: darkMode ? '#374151' : '#E5E7EB',
          },
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`p-2`}>
          <ArrowLeft size={24} color={darkMode ? '#FFFFFF' : '#374151'} weight="bold" />
        </TouchableOpacity>
        <Text
          style={[
            tw`font-nokia-bold text-xl flex-1 mx-4`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
          ]}>
          Explore Admin
        </Text>
        <View style={tw`w-10`} />
      </View>

      {/* Content */}
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        <View style={tw`p-4`}>
          {/* Categories Section */}
          <View style={tw`mb-6`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <View style={tw`flex-row items-center`}>
                <Folder size={24} color="#EA9215" weight="bold" />
                <Text
                  style={[
                    tw`font-nokia-bold text-xl ml-2`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  Categories
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('ExploreCategoryForm')}
                style={[
                  tw`px-4 py-2 rounded-full flex-row items-center`,
                  {backgroundColor: '#EA9215'},
                ]}>
                <Plus size={20} color="#FFFFFF" weight="bold" />
                <Text style={tw`text-white font-nokia-bold ml-2`}>Add</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={tw`py-8 items-center`}>
                <ActivityIndicator size="large" color="#EA9215" />
              </View>
            ) : categories && categories.length > 0 ? (
              categories.map(category => (
                <TouchableOpacity
                  key={category._id}
                  onPress={() =>
                    navigation.navigate('ExploreCategoryItems', {
                      categoryId: category._id,
                      categoryTitle: category.title,
                    })
                  }
                  style={[
                    tw`p-4 rounded-2xl mb-3`,
                    {
                      backgroundColor: darkMode ? '#374151' : '#FFFFFF',
                      shadowColor: darkMode ? '#000000' : '#EA9215',
                      shadowOffset: {width: 0, height: 2},
                      shadowOpacity: darkMode ? 0.1 : 0.05,
                      shadowRadius: 8,
                      elevation: 2,
                    },
                  ]}>
                  <View style={tw`flex-row justify-between items-center`}>
                    <View style={tw`flex-1`}>
                      <Text
                        style={[
                          tw`font-nokia-bold text-lg mb-1`,
                          darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                        ]}>
                        {category.title}
                      </Text>
                      {category.description && (
                        <Text
                          style={[
                            tw`font-nokia-bold text-sm opacity-70`,
                            darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                          ]}
                          numberOfLines={2}>
                          {category.description}
                        </Text>
                      )}
                      <View style={tw`flex-row items-center mt-2`}>
                        <View
                          style={[
                            tw`px-2 py-1 rounded-full`,
                            {
                              backgroundColor: category.isPublished
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                            },
                          ]}>
                          <Text
                            style={[
                              tw`font-nokia-bold text-xs`,
                              {
                                color: category.isPublished ? '#22C55E' : '#EF4444',
                              },
                            ]}>
                            {category.isPublished ? 'Published' : 'Draft'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('ExploreCategoryForm', {
                          category,
                        })
                      }
                      style={tw`ml-4`}>
                      <Text
                        style={[
                          tw`font-nokia-bold text-base`,
                          {color: '#EA9215'},
                        ]}>
                        Edit
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={tw`py-8 items-center`}>
                <Text
                  style={[
                    tw`font-nokia-bold text-base`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}>
                  No categories yet
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ExploreAdmin;
