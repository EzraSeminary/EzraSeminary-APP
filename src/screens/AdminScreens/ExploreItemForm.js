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
  Image,
  Alert,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  FloppyDisk,
  Camera,
  FilePdf,
  Presentation,
  X,
  Upload,
} from 'phosphor-react-native';
import tw from './../../../tailwind';
import {useSelector} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  useCreateExploreItemMutation,
  useUpdateExploreItemMutation,
} from '../../redux/api-slices/apiSlice';
import Toast from 'react-native-toast-message';
import {launchImageLibrary} from 'react-native-image-picker';
// Note: react-native-document-picker needs to be installed
// npm install react-native-document-picker
// For now, using a placeholder - you'll need to install and import it
// import DocumentPicker from 'react-native-document-picker';

const ExploreItemForm = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const darkMode = useSelector(state => state.ui.darkMode);
  const item = route.params?.item;
  const categoryId = route.params?.categoryId || item?.categoryId;

  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [order, setOrder] = useState(item?.order?.toString() || '0');
  const [isPublished, setIsPublished] = useState(item?.isPublished ?? true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(item?.imageUrl || null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [createItem, {isLoading: isCreating}] = useCreateExploreItemMutation();
  const [updateItem, {isLoading: isUpdating}] = useUpdateExploreItemMutation();

  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (item?.fileUrl) {
      setFilePreview({
        name: item.fileName || 'file',
        type: item.fileType || 'pdf',
      });
    }
  }, [item]);

  const selectImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1200,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
        setImagePreview(response.assets[0].uri);
      }
    });
  };

  const selectFile = async () => {
    // TODO: Install react-native-document-picker and uncomment this code
    // For now, showing an alert
    Alert.alert(
      'File Picker',
      'Please install react-native-document-picker to enable file selection. Run: npm install react-native-document-picker',
    );
    
    /* Uncomment after installing react-native-document-picker:
    try {
      const DocumentPicker = require('react-native-document-picker').default;
      const result = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.pdf,
          DocumentPicker.types.ppt,
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
      });

      if (result && result[0]) {
        const file = result[0];
        const fileType = file.name?.split('.').pop()?.toLowerCase() || 'pdf';
        if (!['pdf', 'ppt', 'pptx'].includes(fileType)) {
          Toast.show({
            type: 'error',
            text1: 'Invalid File',
            text2: 'Please select a PDF or PPT file',
          });
          return;
        }
        setSelectedFile(file);
        setFilePreview({
          name: file.name,
          type: fileType,
        });
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to select file',
        });
      }
    }
    */
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(item?.imageUrl || null);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(item?.fileUrl ? {name: item.fileName, type: item.fileType} : null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Title is required',
      });
      return;
    }

    if (!item && !selectedFile) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'File is required',
      });
      return;
    }

    if (!categoryId) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Category is required',
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('categoryId', categoryId);
      formData.append('title', title.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('order', parseInt(order) || 0);
      formData.append('isPublished', isPublished);

      if (selectedFile) {
        formData.append('file', {
          uri: selectedFile.uri,
          type: selectedFile.type || 'application/pdf',
          name: selectedFile.name,
        });
      }

      if (selectedImage) {
        formData.append('image', {
          uri: selectedImage.uri,
          type: selectedImage.type || 'image/jpeg',
          name: selectedImage.fileName || 'image.jpg',
        });
      }

      if (item) {
        // Update - send JSON if no new files, FormData if files are being updated
        if (!selectedFile && !selectedImage) {
          // Send as JSON
          const jsonData = {
            title: title.trim(),
            description: description.trim() || undefined,
            order: parseInt(order) || 0,
            isPublished,
            categoryId,
          };
          await updateItem({
            id: item._id,
            formData: jsonData,
          }).unwrap();
        } else {
          // Send as FormData
          await updateItem({id: item._id, formData}).unwrap();
        }
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Item updated successfully',
        });
      } else {
        await createItem(formData).unwrap();
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Item created successfully',
        });
      }
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.data?.message || 'Failed to save item',
      });
    }
  };

  const getFileIcon = () => {
    const fileType = filePreview?.type || selectedFile?.name?.split('.').pop()?.toLowerCase() || 'pdf';
    if (fileType === 'pdf') {
      return <FilePdf size={48} color="#EA9215" weight="bold" />;
    } else if (fileType === 'ppt' || fileType === 'pptx') {
      return <Presentation size={48} color="#EA9215" weight="bold" />;
    }
    return <FilePdf size={48} color="#EA9215" weight="bold" />;
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
          {item ? 'Edit Item' : 'New Item'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isLoading}
          style={[tw`p-2`, {opacity: isLoading ? 0.6 : 1}]}>
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
              placeholder="Enter item title"
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
              placeholder="Enter item description (optional)"
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

          {/* Image Upload */}
          <View style={tw`mb-4`}>
            <Text
              style={[
                tw`font-nokia-bold text-base mb-2`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Cover Image
            </Text>
            {imagePreview ? (
              <View style={tw`relative`}>
                <Image
                  source={{uri: imagePreview}}
                  style={tw`w-full h-48 rounded-2xl`}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={removeImage}
                  style={[
                    tw`absolute top-2 right-2 p-2 rounded-full`,
                    {backgroundColor: 'rgba(0, 0, 0, 0.6)'},
                  ]}>
                  <X size={20} color="#FFFFFF" weight="bold" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={selectImage}
                style={[
                  tw`h-48 rounded-2xl items-center justify-center border-2 border-dashed`,
                  {
                    backgroundColor: darkMode ? '#374151' : '#FFFFFF',
                    borderColor: darkMode ? '#4B5563' : '#E5E7EB',
                  },
                ]}>
                <Camera size={48} color="#EA9215" weight="bold" />
                <Text
                  style={[
                    tw`font-nokia-bold text-base mt-2`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}>
                  Tap to select image
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* File Upload */}
          <View style={tw`mb-4`}>
            <Text
              style={[
                tw`font-nokia-bold text-base mb-2`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              File (PDF/PPT) {!item && '*'}
            </Text>
            {filePreview || selectedFile ? (
              <View
                style={[
                  tw`p-4 rounded-2xl flex-row items-center`,
                  {
                    backgroundColor: darkMode ? '#374151' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: darkMode ? '#4B5563' : '#E5E7EB',
                  },
                ]}>
                <View style={tw`mr-4`}>{getFileIcon()}</View>
                <View style={tw`flex-1`}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-base`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}
                    numberOfLines={1}>
                    {selectedFile?.name || filePreview?.name || 'file'}
                  </Text>
                  <Text
                    style={[
                      tw`font-nokia-bold text-sm opacity-70`,
                      darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                    ]}>
                    {(selectedFile?.size || 0) > 0
                      ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                      : 'File selected'}
                  </Text>
                </View>
                <TouchableOpacity onPress={removeFile} style={tw`p-2`}>
                  <X size={20} color="#EF4444" weight="bold" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={selectFile}
                style={[
                  tw`h-32 rounded-2xl items-center justify-center border-2 border-dashed`,
                  {
                    backgroundColor: darkMode ? '#374151' : '#FFFFFF',
                    borderColor: darkMode ? '#4B5563' : '#E5E7EB',
                  },
                ]}>
                <Upload size={48} color="#EA9215" weight="bold" />
                <Text
                  style={[
                    tw`font-nokia-bold text-base mt-2`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}>
                  Tap to select file (PDF/PPT)
                </Text>
              </TouchableOpacity>
            )}
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
                {item ? 'Update Item' : 'Create Item'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ExploreItemForm;
