import React, {useState, useEffect} from 'react';
import {
  View,
  TextInput,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDispatch, useSelector} from 'react-redux';
import {useUpdateUserMutation} from '../../redux/api-slices/apiSlice';
import {updateUser} from '../../redux/authSlice';
import tw from './../../../tailwind';
import {
  ArrowSquareLeft,
  UserCircle,
  EnvelopeSimple,
  Lock,
  Eye,
  Camera,
} from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import UserAvatar from '../../components/UserAvatar';
import AndroidStatusBarSpacer from '../../components/AndroidStatusBarSpacer';

const UserProfileUpdateScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [storedAuthProvider, setStoredAuthProvider] = useState('');
  const darkMode = useSelector(state => state.ui.darkMode);
  const currentUser = useSelector(state => state.auth.user);
  const userProfile = currentUser?.user || currentUser || {};
  const resolvedFirstName = userProfile?.firstName || '';
  const resolvedLastName = userProfile?.lastName || '';
  const resolvedEmail = userProfile?.email || '';
  const authProvider = String(
    userProfile?.authProvider || userProfile?.provider || '',
  ).toLowerCase();
  const effectiveAuthProvider = String(
    authProvider || storedAuthProvider || '',
  ).toLowerCase();
  const isGoogleAccount =
    effectiveAuthProvider === 'google' ||
    Boolean(userProfile?.googleId || userProfile?.googleSub);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isAvatarChanged, setIsAvatarChanged] = useState(false);
  const [updateUserMutation, {isLoading}] = useUpdateUserMutation();

  // Initialize form data when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setFirstName(resolvedFirstName);
      setLastName(resolvedLastName);
      setEmail(resolvedEmail);
      setPassword('');

      // Only set avatar preview if it's not already set or if user changed
      if (!isAvatarChanged) {
        setAvatarPreview(userProfile?.avatar || null);
      }
    }
  }, [
    currentUser,
    isAvatarChanged,
    resolvedFirstName,
    resolvedLastName,
    resolvedEmail,
    userProfile?.avatar,
  ]);

  useEffect(() => {
    const loadStoredAuthProvider = async () => {
      try {
        const provider = await AsyncStorage.getItem('authProvider');
        if (provider) {
          setStoredAuthProvider(String(provider).toLowerCase());
        }
      } catch (error) {
        console.error('Failed to load auth provider from storage:', error);
      }
    };

    loadStoredAuthProvider();
  }, []);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const selectImage = () => {
    const options = {
      title: 'Select Profile Picture',
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    };

    Alert.alert(
      'Select Profile Picture',
      'Choose an option',
      [
        {text: 'Camera', onPress: () => openCamera(options)},
        {text: 'Photo Library', onPress: () => openImageLibrary(options)},
        {text: 'Cancel', style: 'cancel'},
      ],
      {cancelable: true},
    );
  };

  const openCamera = options => {
    launchCamera(options, response => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        console.log('Camera image selected:', imageUri);
        setAvatarPreview(imageUri);
        setSelectedImage(response.assets[0]);
        setIsAvatarChanged(true);
      }
    });
  };

  const openImageLibrary = options => {
    launchImageLibrary(options, response => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        console.log('Library image selected:', imageUri);
        setAvatarPreview(imageUri);
        setSelectedImage(response.assets[0]);
        setIsAvatarChanged(true);
      }
    });
  };

  const handleUpdateUser = async () => {
    // Add password validation
    if (password && password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Passwords do not match!',
      });
      return;
    }

    if (currentUser) {
      const nextFirstName = firstName.trim();
      const nextLastName = lastName.trim();
      const nextEmail = email.trim().toLowerCase();
      const originalEmail = String(resolvedEmail || '').trim().toLowerCase();

      if (
        nextFirstName !== resolvedFirstName ||
        nextLastName !== resolvedLastName ||
        (!isGoogleAccount && nextEmail !== originalEmail) ||
        password ||
        selectedImage
      ) {
        try {
          const formData = new FormData();
          formData.append('firstName', nextFirstName);
          formData.append('lastName', nextLastName);
          formData.append('email', isGoogleAccount ? resolvedEmail : nextEmail);
          if (password) {
            formData.append('password', password);
          }

          // Add image to form data if selected
          if (selectedImage) {
            const imageData = {
              uri: selectedImage.uri,
              type: selectedImage.type,
              name: selectedImage.fileName || `profile_${Date.now()}.jpg`,
            };
            formData.append('avatar', imageData);
          }

          const updatedUserResponse = await updateUserMutation({
            formData,
            userId: userProfile?._id,
          }).unwrap();
          const updatedUser = {
            ...updatedUserResponse,
            authProvider:
              updatedUserResponse?.authProvider ||
              userProfile?.authProvider ||
              userProfile?.provider,
          };

          Toast.show({
            type: 'success',
            text1: 'Profile updated successfully!',
          });
          dispatch(updateUser(updatedUser));
          setFirstName(updatedUser.firstName || '');
          setLastName(updatedUser.lastName || '');
          setEmail(updatedUser.email || resolvedEmail);
          setPassword('');
          setConfirmPassword('');
          setSelectedImage(null);
          setAvatarPreview(updatedUser.avatar || null);
          setIsAvatarChanged(false);
          navigation.navigate('SettingsStack');
          AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (error) {
          if (error !== null && 'status' in error && 'data' in error) {
            const apiError = error;
            if (
              apiError.status === 400 &&
              apiError.data.message === 'Error uploading avatar'
            ) {
              console.error('Mutation failed:', error);
              Toast.show({
                type: 'error',
                text1: 'Failed to upload avatar. Please try again.',
              });
            } else {
              Toast.show({
                type: 'error',
                text1:
                  apiError.data?.message ||
                  'An error occurred. Please try again.',
              });
            }
          } else {
            console.error('Mutation failed:', error);
            Toast.show({
              type: 'error',
              text1: 'An unknown error occurred. Please try again.',
            });
          }
        }
      } else {
        Toast.show({
          type: 'info',
          text1: 'No changes detected!',
        });
      }
    }
  };

  return (
    <SafeAreaView
      style={[
        tw`flex-1 items-center px-4 bg-primary-1`,
        darkMode && tw`bg-secondary-9`,
      ]}>
      <ScrollView
        style={tw`flex mx-auto w-[92%]`}
        showsVerticalScrollIndicator={false}>
        <AndroidStatusBarSpacer minHeight={4} />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`self-start`}>
          <ArrowSquareLeft weight="fill" color="#EA9215" size={32} />
        </TouchableOpacity>
        <Text
          style={[
            tw`font-nokia-bold text-secondary-6 text-center text-xl mt-4`,
            darkMode ? tw`text-primary-1` : null,
          ]}>
          Update Profile
        </Text>
        {currentUser && (
          <View style={tw`flex-col w-full justify-center items-center my-4`}>
            <View style={tw`relative`}>
              <UserAvatar
                avatarUri={
                  avatarPreview
                    ? avatarPreview
                    : userProfile?.avatar || null
                }
                size={96}
                style={tw`my-2`}
              />
              <TouchableOpacity
                style={[
                  tw`absolute bottom-2 right-0 w-8 h-8 bg-accent-6 rounded-full items-center justify-center border-2 border-primary-1`,
                  darkMode && tw`border-secondary-9`,
                ]}
                onPress={selectImage}>
                <Camera size={16} color="#FFFFFF" weight="fill" />
              </TouchableOpacity>
            </View>
            <Text
              style={[
                tw`font-nokia-bold text-lg text-secondary-6`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              {resolvedFirstName}
            </Text>
            <Text
              style={[
                tw`font-nokia-light text-sm text-secondary-6`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              {resolvedEmail}
            </Text>
          </View>
        )}
        <View style={tw`flex flex-col gap-4`}>
          <View style={tw`flex flex-row mb-2 justify-between`}>
            <View
              style={[
                tw`flex flex-row items-center gap-2 w-48% h-12 bg-primary-4 border border-secondary-3 rounded-2 px-4`,
                darkMode ? tw`bg-secondary-6` : null,
              ]}>
              <UserCircle
                size={20}
                style={[
                  tw`text-secondary-5`,
                  darkMode ? tw`text-primary-3` : null,
                ]}
              />
              <TextInput
                placeholder="First Name"
                keyboardType="default"
                value={firstName}
                onChangeText={setFirstName}
                style={[
                  tw`font-nokia-bold text-sm text-secondary-6 w-100%`,
                  darkMode ? tw`text-primary-3` : null,
                ]}
                placeholderTextColor={darkMode ? '#AAAAAA' : '#AAB0B4'}
              />
            </View>
            <View
              style={[
                tw`flex flex-row items-center gap-2 w-48% h-12 bg-primary-4 border border-secondary-3 rounded-2 px-4`,
                darkMode ? tw`bg-secondary-6` : null,
              ]}>
              <UserCircle
                size={20}
                style={[
                  tw`text-secondary-5`,
                  darkMode ? tw`text-primary-3` : null,
                ]}
              />
              <TextInput
                placeholder="Last Name"
                keyboardType="default"
                value={lastName}
                onChangeText={setLastName}
                style={[
                  tw`font-nokia-bold text-sm text-secondary-6 w-100%`,
                  darkMode ? tw`text-primary-3` : null,
                ]}
                placeholderTextColor={darkMode ? '#AAAAAA' : '#AAB0B4'}
              />
            </View>
          </View>
          <View style={tw`mb-2`}>
            <View
              style={[
                tw`flex flex-row items-center gap-2 w-100% h-12 bg-primary-4 border border-secondary-3 rounded-2 px-4`,
                darkMode ? tw`bg-secondary-6` : null,
              ]}>
              <EnvelopeSimple
                size={20}
                style={[
                  tw`text-secondary-5`,
                  darkMode ? tw`text-primary-3` : null,
                ]}
              />
              <TextInput
                placeholder="Email address"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!isGoogleAccount}
                selectTextOnFocus={!isGoogleAccount}
                style={[
                  tw`font-nokia-bold text-sm text-secondary-6 w-80%`,
                  isGoogleAccount ? tw`opacity-70` : null,
                  darkMode ? tw`text-primary-3` : null,
                ]}
                placeholderTextColor={darkMode ? '#AAAAAA' : '#AAB0B4'}
              />
            </View>
            {isGoogleAccount && (
              <Text
                style={[
                  tw`font-nokia-bold text-xs mt-1`,
                  darkMode ? tw`text-primary-3` : tw`text-secondary-5`,
                ]}>
                Email is locked for Google sign-in accounts.
              </Text>
            )}
          </View>
          {!isGoogleAccount && (
            <View style={tw`mb-2`}>
              <View
                style={[
                  tw`flex flex-row items-center justify-between gap-2 w-100% h-12 bg-primary-4 border border-secondary-3 rounded-2 px-4`,
                  darkMode ? tw`bg-secondary-6` : null,
                ]}>
                <View style={tw`flex flex-row items-center gap-2`}>
                  <Lock
                    size={20}
                    style={[
                      tw`text-secondary-5`,
                      darkMode ? tw`text-primary-3` : null,
                    ]}
                  />
                  <TextInput
                    placeholder="Password"
                    secureTextEntry={showPassword}
                    keyboardType="default"
                    value={password}
                    onChangeText={setPassword}
                    style={[
                      tw`font-nokia-bold text-sm text-secondary-6 w-80%`,
                      darkMode ? tw`text-primary-3` : null,
                    ]}
                    placeholderTextColor={darkMode ? '#AAAAAA' : '#AAB0B4'}
                  />
                </View>
                <TouchableOpacity onPress={toggleShowPassword}>
                  <Eye
                    size={20}
                    style={[
                      tw`text-secondary-5`,
                      darkMode ? tw`text-primary-3` : null,
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {!isGoogleAccount && (
            <View style={tw`mb-2`}>
              <View
                style={[
                  tw`flex flex-row items-center justify-between gap-2 w-100% h-12 bg-primary-4 border border-secondary-3 rounded-2 px-4`,
                  darkMode ? tw`bg-secondary-6` : null,
                ]}>
                <View style={tw`flex flex-row items-center gap-2`}>
                  <Lock
                    size={20}
                    style={[
                      tw`text-secondary-5`,
                      darkMode ? tw`text-primary-3` : null,
                    ]}
                  />
                  <TextInput
                    placeholder="Confirm Password"
                    secureTextEntry={showConfirmPassword}
                    keyboardType="default"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={[
                      tw`font-nokia-bold text-sm text-secondary-6 w-80%`,
                      darkMode ? tw`text-primary-3` : null,
                    ]}
                    placeholderTextColor={darkMode ? '#AAAAAA' : '#AAB0B4'}
                  />
                </View>
                <TouchableOpacity onPress={toggleShowConfirmPassword}>
                  <Eye
                    size={20}
                    style={[
                      tw`text-secondary-5`,
                      darkMode ? tw`text-primary-3` : null,
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={tw`mb-2`}>
            <View style={tw`flex flex-row justify-between`}>
              <TouchableOpacity
                style={tw`w-70% py-4 items-center bg-accent-6 rounded-2 my-4`}
                onPress={handleUpdateUser}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={tw`font-Lato-Black text-primary-1`}>
                    Update Profile
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`w-28% py-4 items-center bg-red-600 rounded-2 my-4`}
                onPress={() => navigation.navigate('SettingsStack')}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={tw`font-Lato-Black text-primary-1`}>Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default UserProfileUpdateScreen;
