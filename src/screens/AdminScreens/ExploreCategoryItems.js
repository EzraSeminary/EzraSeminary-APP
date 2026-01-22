import React, {useState} from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import {ArrowLeft, Plus, Pencil, Trash, FilePdf, Presentation} from 'phosphor-react-native';
import tw from './../../../tailwind';
import {useSelector} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  useGetAdminExploreItemsQuery,
  useDeleteExploreItemMutation,
} from '../../redux/api-slices/apiSlice';
import Toast from 'react-native-toast-message';

const ExploreCategoryItems = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const darkMode = useSelector(state => state.ui.darkMode);
  const {categoryId, categoryTitle} = route.params;

  const {data: items, isLoading, refetch} = useGetAdminExploreItemsQuery(
    categoryId,
  );
  const [deleteItem, {isLoading: isDeleting}] = useDeleteExploreItemMutation();

  const handleDelete = item => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.title}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(item._id).unwrap();
              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Item deleted successfully',
              });
              refetch();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.data?.message || 'Failed to delete item',
              });
            }
          },
        },
      ],
    );
  };

  const getFileIcon = fileType => {
    if (fileType === 'pdf') {
      return <FilePdf size={24} color="#EA9215" weight="bold" />;
    } else if (fileType === 'ppt' || fileType === 'pptx') {
      return <Presentation size={24} color="#EA9215" weight="bold" />;
    }
    return <FilePdf size={24} color="#EA9215" weight="bold" />;
  };

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
            tw`font-nokia-bold text-lg flex-1 mx-4`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
          ]}
          numberOfLines={1}>
          {categoryTitle}
        </Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('ExploreItemForm', {categoryId})
          }
          style={tw`p-2`}>
          <Plus size={24} color="#EA9215" weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        <View style={tw`p-4`}>
          {isLoading ? (
            <View style={tw`py-8 items-center`}>
              <ActivityIndicator size="large" color="#EA9215" />
            </View>
          ) : items && items.length > 0 ? (
            items.map(item => (
              <View
                key={item._id}
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
                <View style={tw`flex-row`}>
                  {/* Image or Icon */}
                  <View style={tw`w-20 h-20 rounded-xl overflow-hidden mr-4`}>
                    {item.imageUrl ? (
                      <Image
                        source={{uri: item.imageUrl}}
                        style={tw`w-full h-full`}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          tw`w-full h-full items-center justify-center`,
                          {backgroundColor: darkMode ? '#4B5563' : '#F3F4F6'},
                        ]}>
                        {getFileIcon(item.fileType)}
                      </View>
                    )}
                  </View>

                  {/* Content */}
                  <View style={tw`flex-1`}>
                    <Text
                      style={[
                        tw`font-nokia-bold text-lg mb-1`,
                        darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                      ]}
                      numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.description && (
                      <Text
                        style={[
                          tw`font-nokia-bold text-sm opacity-70 mb-2`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}
                        numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    <View style={tw`flex-row items-center`}>
                      <View
                        style={[
                          tw`px-2 py-1 rounded-full mr-2`,
                          {
                            backgroundColor: item.isPublished
                              ? 'rgba(34, 197, 94, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                          },
                        ]}>
                        <Text
                          style={[
                            tw`font-nokia-bold text-xs`,
                            {
                              color: item.isPublished ? '#22C55E' : '#EF4444',
                            },
                          ]}>
                          {item.isPublished ? 'Published' : 'Draft'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          tw`font-nokia-bold text-xs opacity-70`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        {item.fileType?.toUpperCase() || 'FILE'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={tw`flex-row items-center ml-2`}>
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('ExploreItemForm', {
                          item,
                          categoryId,
                        })
                      }
                      style={tw`p-2 mr-2`}>
                      <Pencil size={20} color="#EA9215" weight="bold" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      disabled={isDeleting}
                      style={tw`p-2`}>
                      <Trash
                        size={20}
                        color={isDeleting ? '#9CA3AF' : '#EF4444'}
                        weight="bold"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={tw`py-8 items-center`}>
              <Text
                style={[
                  tw`font-nokia-bold text-base`,
                  darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                ]}>
                No items in this category
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ExploreCategoryItems;
