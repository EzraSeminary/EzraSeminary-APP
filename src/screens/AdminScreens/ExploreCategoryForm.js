import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {ArrowLeft, FloppyDisk, X} from 'phosphor-react-native';
import tw from './../../../tailwind';
import {useSelector} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  useCreateExploreCategoryMutation,
  useUpdateExploreCategoryMutation,
} from '../../redux/api-slices/apiSlice';
import Toast from 'react-native-toast-message';

const ExploreCategoryForm = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const darkMode = useSelector(state => state.ui.darkMode);
  const category = route.params?.category;

  const [title, setTitle] = useState(category?.title || '');
  const [description, setDescription] = useState(category?.description || '');
  const [order, setOrder] = useState(category?.order?.toString() || '0');
  const [isPublished, setIsPublished] = useState(category?.isPublished ?? true);

  const [createCategory, {isLoading: isCreating}] =
    useCreateExploreCategoryMutation();
  const [updateCategory, {isLoading: isUpdating}] =
    useUpdateExploreCategoryMutation();

  const isLoading = isCreating || isUpdating;

  const handleSave = async () => {
    if (!title.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Title is required',
      });
      return;
    }

    try {
      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        order: parseInt(order) || 0,
        isPublished,
      };

      if (category) {
        await updateCategory({id: category._id, ...data}).unwrap();
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Category updated successfully',
        });
      } else {
        await createCategory(data).unwrap();
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Category created successfully',
        });
      }
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.data?.message || 'Failed to save category',
      });
    }
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
            tw`font-nokia-bold text-xl flex-1 mx-4`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
          ]}>
          {category ? 'Edit Category' : 'New Category'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isLoading}
          style={[
            tw`p-2`,
            {opacity: isLoading ? 0.6 : 1},
          ]}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#EA9215" />
          ) : (
            <FloppyDisk size={24} color="#EA9215" weight="bold" />
          )}
        </TouchableOpacity>
      </View>

      {/* Form */}
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        <View style={tw`p-4`}>
          {/* Title */}
          <View style={tw`mb-4`}>
            <Text
              style={[
                tw`font-nokia-bold text-base mb-2`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Title *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter category title"
              style={[
                tw`p-4 rounded-2xl font-nokia-bold text-base`,
                {
                  backgroundColor: darkMode ? '#374151' : '#FFFFFF',
                  color: darkMode ? '#FFFFFF' : '#374151',
                  borderWidth: 1,
                  borderColor: darkMode ? '#4B5563' : '#E5E7EB',
                },
              ]}
              placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
            />
          </View>

          {/* Description */}
          <View style={tw`mb-4`}>
            <Text
              style={[
                tw`font-nokia-bold text-base mb-2`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Enter category description (optional)"
              multiline
              numberOfLines={4}
              style={[
                tw`p-4 rounded-2xl font-nokia-bold text-base`,
                {
                  backgroundColor: darkMode ? '#374151' : '#FFFFFF',
                  color: darkMode ? '#FFFFFF' : '#374151',
                  borderWidth: 1,
                  borderColor: darkMode ? '#4B5563' : '#E5E7EB',
                  minHeight: 100,
                },
              ]}
              placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
              textAlignVertical="top"
            />
          </View>

          {/* Order */}
          <View style={tw`mb-4`}>
            <Text
              style={[
                tw`font-nokia-bold text-base mb-2`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Order
            </Text>
            <TextInput
              value={order}
              onChangeText={setOrder}
              placeholder="0"
              keyboardType="numeric"
              style={[
                tw`p-4 rounded-2xl font-nokia-bold text-base`,
                {
                  backgroundColor: darkMode ? '#374151' : '#FFFFFF',
                  color: darkMode ? '#FFFFFF' : '#374151',
                  borderWidth: 1,
                  borderColor: darkMode ? '#4B5563' : '#E5E7EB',
                },
              ]}
              placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
            />
          </View>

          {/* Published */}
          <View
            style={[
              tw`flex-row justify-between items-center p-4 rounded-2xl mb-4`,
              {
                backgroundColor: darkMode ? '#374151' : '#FFFFFF',
                borderWidth: 1,
                borderColor: darkMode ? '#4B5563' : '#E5E7EB',
              },
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-base`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Published
            </Text>
            <Switch
              value={isPublished}
              onValueChange={setIsPublished}
              trackColor={{false: '#767577', true: '#EA9215'}}
              thumbColor={isPublished ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading}
            style={[
              tw`py-4 px-6 rounded-2xl items-center`,
              {
                backgroundColor: '#EA9215',
                opacity: isLoading ? 0.6 : 1,
              },
            ]}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={tw`text-white font-nokia-bold text-lg`}>
                {category ? 'Update Category' : 'Create Category'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ExploreCategoryForm;
