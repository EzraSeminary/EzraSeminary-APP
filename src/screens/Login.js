import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Image,
} from 'react-native';
import React, {useState, useRef, useEffect} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  Eye,
  Lock,
  UserCircle,
  Cross,
  Sparkle,
  Warning,
} from 'phosphor-react-native';
import tw from './../../tailwind';
import {useDispatch} from 'react-redux';
import {
  useLoginMutation,
  useUpdateUserStatusMutation,
} from '../redux/api-slices/apiSlice';
import {login as loginUser} from '../redux/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ActivityIndicator, KeyboardAvoidingView, Platform} from 'react-native';
import {useSelector} from 'react-redux';
import Toast from 'react-native-toast-message';
import {Linking} from 'react-native';

const Login = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [login, {isLoading}] = useLoginMutation();
  const [updateUserStatus] = useUpdateUserStatusMutation();
  const dispatch = useDispatch();
  const darkMode = useSelector(state => state.ui.darkMode);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Sparkle animation loop
    const sparkleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    sparkleAnimation.start();

    return () => sparkleAnimation.stop();
  }, [fadeAnim, slideAnim, scaleAnim, sparkleAnim]);

  const validateEmail = email => {
    if (!email || email.trim() === '') {
      return 'Email is required.';
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const validatePassword = password => {
    if (!password || password.trim() === '') {
      return 'Password is required.';
    }
    return '';
  };

  const handleEmailChange = text => {
    setEmail(text);
    if (emailError) {
      setEmailError('');
    }
  };

  const handlePasswordChange = text => {
    setPassword(text);
    if (passwordError) {
      setPasswordError('');
    }
  };

  const handleForgotPassword = () => {
    const url = 'https://ezraseminary.org/forgot-password';
    Linking.openURL(url).catch(err =>
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Unable to open the link.',
      }),
    );
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');

    // Validate fields
    const emailValidationError = validateEmail(email);
    const passwordValidationError = validatePassword(password);

    if (emailValidationError || passwordValidationError) {
      if (emailValidationError) {
        setEmailError(emailValidationError);
      }
      if (passwordValidationError) {
        setPasswordError(passwordValidationError);
      }
      return;
    }

    try {
      const result = await login({email, password}).unwrap();
      if (result) {
        if (result.status === 'inactive') {
          Alert.alert(
            'Account Inactive',
            'Your account is inactive. Would you like to reactivate it?',
            [
              {
                text: 'Cancel',
              },
              {
                text: 'Reactivate',
                onPress: async () => {
                  try {
                    await updateUserStatus({
                      id: result._id,
                      status: 'active',
                    }).unwrap();
                    result.status = 'active'; // Update the status in the result object
                    await AsyncStorage.setItem('user', JSON.stringify(result));
                    dispatch(loginUser(result));
                    navigation.navigate('MainTab');
                    Toast.show({
                      type: 'success',
                      text1: 'Account Reactivated',
                      text2: 'Your account has been reactivated successfully.',
                    });
                  } catch (err) {
                    console.error('Error reactivating account: ', err);
                    Toast.show({
                      type: 'error',
                      text1: 'Reactivation Error',
                      text2:
                        'Failed to reactivate your account. Please try again.',
                    });
                  }
                },
              },
            ],
            {cancelable: false},
          );
        } else {
          await AsyncStorage.setItem('user', JSON.stringify(result));
          dispatch(loginUser(result));
          navigation.navigate('MainTab');
          Toast.show({
            type: 'success',
            text1: 'Login Successful',
          });
          setEmail('');
          setPassword('');
          setEmailError('');
          setPasswordError('');
        }
      }
    } catch (err) {
      console.error('Login Failed: ', err);

      // Handle network errors with toast (global error)
      if (
        err.message === 'Network Error' ||
        err.code === 'ECONNABORTED' ||
        err.message === 'Network request failed'
      ) {
        Toast.show({
          type: 'error',
          text1: 'Network Error',
          text2:
            'Network error or timeout. Please check your internet connection and try again.',
        });
        return;
      }

      // Handle authentication errors with inline messages
      // Check if it's an email or password error based on common API responses
      if (err.status === 401 || err.status === 404) {
        setEmailError('Invalid email or password.');
        setPasswordError('Invalid email or password.');
      } else if (err.data?.message) {
        // If API provides specific error message
        const errorMsg = err.data.message.toLowerCase();
        if (errorMsg.includes('email')) {
          setEmailError(err.data.message);
        } else if (errorMsg.includes('password')) {
          setPasswordError(err.data.message);
        } else {
          setEmailError('Invalid email or password.');
          setPasswordError('Invalid email or password.');
        }
      } else {
        // Default: show error on both fields
        setEmailError('Invalid email or password.');
        setPasswordError('Invalid email or password.');
      }
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <SafeAreaView
      style={[tw`flex-1 bg-primary-1`, darkMode ? tw`bg-secondary-9` : null]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1`}>
        <ScrollView
          contentContainerStyle={tw`flex-grow justify-center items-center px-4 py-6`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Animated.View
            style={[
              tw`w-full max-w-sm`,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            {/* Enhanced Welcome Section */}
            <Animated.View
              style={[
                tw`my-8 p-6 rounded-2xl items-center`,
                {
                  backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                  transform: [{scale: scaleAnim}],
                  elevation: 8,
                },
              ]}>
              <Animated.View
                style={[
                  tw`flex flex-row items-center gap-2 w-100% h-12 bg-primary-4 border rounded-2 px-4`,
                  emailError ? tw`border-red-500` : tw`border-secondary-3`,
                  darkMode ? tw`bg-secondary-6` : null,
                ]}>
                <UserCircle
                  size={20}
                  style={[
                    emailError ? tw`text-red-500` : tw`text-secondary-5`,
                    darkMode && !emailError ? tw`text-primary-3` : null,
                  ]}
                />
                <TextInput
                  placeholder="Email address"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={handleEmailChange}
                  style={[
                    tw`font-nokia-bold text-sm text-secondary-6 flex-1`,
                    darkMode ? tw`text-primary-3` : null,
                  ]}
                  placeholderTextColor={darkMode ? '#AAAAAA' : '#AAB0B4'}
                />
                {emailError && (
                  <Warning
                    size={18}
                    color={darkMode ? '#EF4444' : '#DC2626'}
                    weight="fill"
                  />
                )}
              </Animated.View>
              {emailError && (
                <View style={tw`flex flex-row items-center gap-1 mt-1 px-1`}>
                  <Warning
                    size={14}
                    color={darkMode ? '#EF4444' : '#DC2626'}
                    weight="fill"
                  />
                  <Text
                    style={[
                      tw`font-Lato-Regular text-xs`,
                      darkMode ? tw`text-red-400` : tw`text-red-600`,
                    ]}>
                    {emailError}
                  </Text>
                </View>
              )}
            </Animated.View>
            <View style={tw`mb-2`}>
              <View
                style={[
                  tw`flex flex-row items-center justify-between gap-2 w-100% h-12 bg-primary-4 border rounded-2 px-4`,
                  passwordError ? tw`border-red-500` : tw`border-secondary-3`,
                  darkMode ? tw`bg-secondary-6` : null,
                ]}>
                <View style={tw`flex flex-row items-center gap-2 flex-1`}>
                  <Lock
                    size={20}
                    style={[
                      passwordError ? tw`text-red-500` : tw`text-secondary-5`,
                      darkMode && !passwordError ? tw`text-primary-3` : null,
                    ]}
                  />
                  <TextInput
                    placeholder="Password"
                    secureTextEntry={showPassword}
                    keyboardType="default"
                    value={password}
                    onChangeText={handlePasswordChange}
                    style={[
                      tw`font-nokia-bold text-sm text-secondary-6 flex-1`,
                      darkMode ? tw`text-primary-3` : null,
                    ]}
                    placeholderTextColor={darkMode ? '#AAAAAA' : '#AAB0B4'}
                  />
                </View>
                <TouchableOpacity onPress={toggleShowPassword}>
                  <Eye
                    size={20}
                    style={[
                      tw`text-secondary-4`,
                      darkMode ? tw`text-primary-3` : null,
                    ]}
                  />
                </TouchableOpacity>
                {passwordError && (
                  <Warning
                    size={18}
                    color={darkMode ? '#EF4444' : '#DC2626'}
                    weight="fill"
                    style={tw`ml-1`}
                  />
                )}
              </View>
              {passwordError && (
                <View style={tw`flex flex-row items-center gap-1 mt-1 px-1`}>
                  <Warning
                    size={14}
                    color={darkMode ? '#EF4444' : '#DC2626'}
                    weight="fill"
                  />
                  <Text
                    style={[
                      tw`font-Lato-Regular text-xs`,
                      darkMode ? tw`text-red-400` : tw`text-red-600`,
                    ]}>
                    {passwordError}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={tw`py-2 font-Lato-Bold text-accent-6 text-right`}
              onPress={handleForgotPassword}>
              Forgot Password?
            </Text>
            <TouchableOpacity
              style={tw`w-100% py-4 items-center bg-accent-6 rounded-2 my-2`}
              onPress={handleSubmit}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={tw`font-Lato-Black text-primary-1`}>Sign In</Text>
              )}
            </TouchableOpacity>
            <View style={tw`flex-row justify-center my-4`}>
              <Text
                style={[
                  tw`font-Lato-Bold text-secondary-6 text-lg`,
                  darkMode ? tw`text-primary-3` : null,
                ]}>
                Don't have an account{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={tw`font-Lato-Bold text-accent-6 text-lg`}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;
