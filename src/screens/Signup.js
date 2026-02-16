import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import React, {useState, useRef, useEffect} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  Eye,
  Lock,
  UserCircle,
  EnvelopeSimple,
  Cross,
  Sparkle,
  CheckCircle,
  XCircle,
} from 'phosphor-react-native';
import tw from './../../tailwind';
import {useDispatch} from 'react-redux';
import {useSignupMutation} from '../redux/api-slices/apiSlice';
import {signup as signupUser} from '../redux/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ActivityIndicator} from 'react-native';
import {useSelector} from 'react-redux';
import Toast from 'react-native-toast-message';

const Signup = ({navigation}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);
  const [signupMutation, {isLoading, error}] = useSignupMutation();
  const [errorMessage, setErrorMessage] = useState('');
  const dispatch = useDispatch();
  const darkMode = useSelector(state => state.ui.darkMode);
  let errMessage = '';

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

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validateEmail = email => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateName = name => {
    const re = /^[A-Za-z]+$/;
    return re.test(name);
  };

  // Password complexity check functions
  const checkPasswordLength = password => {
    return password.length >= 8;
  };

  const checkPasswordUppercase = password => {
    return /[A-Z]/.test(password);
  };

  const checkPasswordLowercase = password => {
    return /[a-z]/.test(password);
  };

  const checkPasswordNumber = password => {
    return /[0-9]/.test(password);
  };

  const checkPasswordSpecialChar = password => {
    return /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  };

  const validatePassword = password => {
    return (
      checkPasswordLength(password) &&
      checkPasswordUppercase(password) &&
      checkPasswordLowercase(password) &&
      checkPasswordNumber(password) &&
      checkPasswordSpecialChar(password)
    );
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateName(firstName.trim())) {
      errMessage = 'First name is invalid. Only letters are allowed.';
      Toast.show({
        type: 'error',
        text1: 'Error during sign up',
        text2: errMessage,
      });
      return;
    }

    if (!validateName(lastName.trim())) {
      errMessage = 'Last name is invalid. Only letters are allowed.';
      Toast.show({
        type: 'error',
        text1: 'Error during sign up',
        text2: errMessage,
      });
      return;
    }

    if (!validateEmail(email)) {
      errMessage = 'Please enter a valid email address.';
      Toast.show({
        type: 'error',
        text1: 'Error during sign up',
        text2: errMessage,
      });
      return;
    }

    if (!validatePassword(password)) {
      errMessage =
        'Password must meet all requirements: at least 8 characters, uppercase, lowercase, number, and special character.';
      Toast.show({
        type: 'error',
        text1: 'Error during sign up',
        text2: errMessage,
        visibilityTime: 4000,
        topOffset: 30,
        bottomOffset: 40,
        textStyle: {fontSize: 14},
        style: {marginBottom: 30, borderRadius: 10},
      });
      return;
    }

    if (password !== confirmPassword) {
      errMessage = 'Passwords do not match.';
      Toast.show({
        type: 'error',
        text1: 'Error during sign up',
        text2: errMessage,
      });
      return;
    }

    if (error) {
      setErrorMessage(error);
      Toast.show({
        type: 'error',
        text1: 'Error during sign up',
        text2: errorMessage,
      });
      return;
    }
    try {
      const result = await signupMutation({
        firstName,
        lastName,
        email,
        password,
      }).unwrap();
      AsyncStorage.setItem('user', JSON.stringify(result));

      dispatch(signupUser(result));
      if (result) {
        Toast.show({
          type: 'success',
          text1: 'Account created successfully!',
        });
      }
      navigation.navigate('MainTab');
    } catch (err) {
      console.error('Signup Failed: ', err);
      if (err.status === 422) {
        errMessage = 'This email is already taken.';
      } else if (err.message === 'Network request failed') {
        errMessage =
          'Network request failed. Please check your internet connection and try again.';
      } else {
        errMessage = 'An error occurred during sign up. Please try again.';
      }
      Toast.show({
        type: 'error',
        text1: 'Error during sign up',
        text2: errMessage,
      });
    }
  };

  return (
    <SafeAreaView
      style={[tw`flex-1 bg-primary-1`, darkMode ? tw`bg-secondary-9` : null]}>
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
                tw`mb-4`,
                {
                  transform: [
                    {
                      scale: sparkleAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.1, 1],
                      }),
                    },
                  ],
                },
              ]}>
              <Image
                source={require('./../assets/ezra_logo.png')}
                style={tw`w-16 h-16`}
                resizeMode="contain"
              />
            </Animated.View>
            <Text
              style={[
                tw`font-nokia-bold text-4xl text-secondary-6 text-center mb-2`,
                darkMode ? tw`text-accent-6` : null,
              ]}>
              እንኳን ደህና መጡ!
            </Text>
            <Text
              style={[
                tw`font-Lato-Black text-2xl text-secondary-6 text-center mb-2`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              Create an account
            </Text>
            <Text
              style={[
                tw`font-Lato-Regular text-sm text-secondary-6 text-center opacity-70`,
                darkMode ? tw`text-primary-3` : null,
              ]}>
              Join our spiritual community and track your progress
            </Text>
          </Animated.View>
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
                  style={[
                    tw`font-nokia-bold text-sm text-secondary-6 w-80%`,
                    darkMode ? tw`text-primary-3` : null,
                  ]}
                  placeholderTextColor={darkMode ? '#AAAAAA' : '#AAB0B4'}
                />
              </View>
            </View>
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
              {/* Password Requirements */}
              <View
                style={[
                  tw`mt-2 px-2 py-2 rounded-lg`,
                  darkMode ? tw`bg-secondary-7` : tw`bg-primary-3`,
                ]}>
                <Text
                  style={[
                    tw`font-Lato-Bold text-xs mb-1.5`,
                    darkMode ? tw`text-primary-2` : tw`text-secondary-7`,
                  ]}>
                  Password Requirements:
                </Text>
                <View style={tw`flex flex-col gap-1.5`}>
                  <View style={tw`flex flex-row items-center gap-2`}>
                    {checkPasswordLength(password) ? (
                      <CheckCircle
                        size={14}
                        weight="fill"
                        color={darkMode ? '#10B981' : '#059669'}
                      />
                    ) : (
                      <XCircle
                        size={14}
                        weight="fill"
                        color={darkMode ? '#EF4444' : '#DC2626'}
                      />
                    )}
                    <Text
                      style={[
                        tw`font-Lato-Regular text-xs`,
                        checkPasswordLength(password)
                          ? darkMode
                            ? tw`text-green-400`
                            : tw`text-green-600`
                          : darkMode
                          ? tw`text-primary-4`
                          : tw`text-secondary-5`,
                      ]}>
                      At least 8 characters
                    </Text>
                  </View>
                  <View style={tw`flex flex-row items-center gap-2`}>
                    {checkPasswordUppercase(password) ? (
                      <CheckCircle
                        size={14}
                        weight="fill"
                        color={darkMode ? '#10B981' : '#059669'}
                      />
                    ) : (
                      <XCircle
                        size={14}
                        weight="fill"
                        color={darkMode ? '#EF4444' : '#DC2626'}
                      />
                    )}
                    <Text
                      style={[
                        tw`font-Lato-Regular text-xs`,
                        checkPasswordUppercase(password)
                          ? darkMode
                            ? tw`text-green-400`
                            : tw`text-green-600`
                          : darkMode
                          ? tw`text-primary-4`
                          : tw`text-secondary-5`,
                      ]}>
                      One uppercase letter
                    </Text>
                  </View>
                  <View style={tw`flex flex-row items-center gap-2`}>
                    {checkPasswordLowercase(password) ? (
                      <CheckCircle
                        size={14}
                        weight="fill"
                        color={darkMode ? '#10B981' : '#059669'}
                      />
                    ) : (
                      <XCircle
                        size={14}
                        weight="fill"
                        color={darkMode ? '#EF4444' : '#DC2626'}
                      />
                    )}
                    <Text
                      style={[
                        tw`font-Lato-Regular text-xs`,
                        checkPasswordLowercase(password)
                          ? darkMode
                            ? tw`text-green-400`
                            : tw`text-green-600`
                          : darkMode
                          ? tw`text-primary-4`
                          : tw`text-secondary-5`,
                      ]}>
                      One lowercase letter
                    </Text>
                  </View>
                  <View style={tw`flex flex-row items-center gap-2`}>
                    {checkPasswordNumber(password) ? (
                      <CheckCircle
                        size={14}
                        weight="fill"
                        color={darkMode ? '#10B981' : '#059669'}
                      />
                    ) : (
                      <XCircle
                        size={14}
                        weight="fill"
                        color={darkMode ? '#EF4444' : '#DC2626'}
                      />
                    )}
                    <Text
                      style={[
                        tw`font-Lato-Regular text-xs`,
                        checkPasswordNumber(password)
                          ? darkMode
                            ? tw`text-green-400`
                            : tw`text-green-600`
                          : darkMode
                          ? tw`text-primary-4`
                          : tw`text-secondary-5`,
                      ]}>
                      One number
                    </Text>
                  </View>
                  <View style={tw`flex flex-row items-center gap-2`}>
                    {checkPasswordSpecialChar(password) ? (
                      <CheckCircle
                        size={14}
                        weight="fill"
                        color={darkMode ? '#10B981' : '#059669'}
                      />
                    ) : (
                      <XCircle
                        size={14}
                        weight="fill"
                        color={darkMode ? '#EF4444' : '#DC2626'}
                      />
                    )}
                    <Text
                      style={[
                        tw`font-Lato-Regular text-xs`,
                        checkPasswordSpecialChar(password)
                          ? darkMode
                            ? tw`text-green-400`
                            : tw`text-green-600`
                          : darkMode
                          ? tw`text-primary-4`
                          : tw`text-secondary-5`,
                      ]}>
                      One special character
                    </Text>
                  </View>
                </View>
              </View>
            </View>
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
          </View>
          <TouchableOpacity
            style={tw`w-100% py-4 items-center bg-accent-6 rounded-2 my-2`}
            onPress={handleSubmit}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={tw`font-Lato-Black text-primary-1`}>
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          <View style={tw`flex-row justify-center my-4`}>
            <Text
              style={[
                tw`font-Lato-Bold text-secondary-6 text-lg`,
                darkMode ? tw`text-primary-3` : null,
              ]}>
              Already have an account{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={tw`font-Lato-Bold text-accent-6 text-lg`}>
                Login
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={tw`flex flex-row justify-center mt-4`}
            onPress={() => navigation.navigate('MainTab')}>
            <Text
              style={tw`font-nokia-bold text-accent-6 px-4 py-2 border border-accent-6 rounded-full`}>
              Continue without account
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Signup;
