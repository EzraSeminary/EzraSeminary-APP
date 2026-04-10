import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  ActivityIndicator,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Eye, EyeSlash} from 'phosphor-react-native';
import {useDispatch, useSelector} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import tw from './../../tailwind';
import {
  useSignupMutation,
  useGetAuthProvidersQuery,
  useSocialAuthMutation,
} from '../redux/api-slices/apiSlice';
import {login} from '../redux/authSlice';
import {
  isSocialAuthCancelled,
  signInWithGoogleProvider,
} from '../services/socialAuth';
import {
  buildDetailedAuthError,
  findAccountByEmail,
  normalizeAuthError,
  persistAuthenticatedUser,
  validateEmailAddress,
  validateName,
  validatePassword,
} from '../services/mobileAuth';

const Signup = ({navigation}) => {
  const dispatch = useDispatch();
  const darkMode = useSelector(state => state.ui.darkMode);
  const {
    data: authProviders,
    isLoading: isAuthProvidersLoading,
    isFetching: isAuthProvidersFetching,
  } = useGetAuthProvidersQuery();
  const [socialAuth] = useSocialAuthMutation();
  const [signupUser, {isLoading: isEmailSignupLoading}] = useSignupMutation();
  const [activeProvider, setActiveProvider] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState('');
  const scrollViewRef = useRef(null);
  const fieldLayouts = useRef({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

  const finishAuthentication = async providerPayload => {
    const result = await socialAuth(providerPayload).unwrap();
    await persistAuthenticatedUser({
      result: {
        ...result,
        authProvider: providerPayload?.provider || result?.authProvider,
      },
      dispatch,
      login,
    });
    navigation.reset({
      index: 0,
      routes: [{name: 'MainTab'}],
    });
  };

  const handleProviderAuth = async () => {
    if (isAuthProvidersLoading || isAuthProvidersFetching) {
      Toast.show({
        type: 'info',
        text1: 'Setting up sign in',
        text2: 'Please wait a moment and try again.',
      });
      return;
    }

    if (!authProviders?.google?.webClientId) {
      Toast.show({
        type: 'error',
        text1: 'Sign-in unavailable',
        text2: 'Google sign-in is not configured for mobile yet.',
      });
      return;
    }

    try {
      setActiveProvider('google');

      const providerPayload = await signInWithGoogleProvider({
        webClientId: authProviders?.google?.webClientId,
        iosClientId: authProviders?.google?.iosClientId,
      });

      if (!providerPayload) {
        return;
      }

      const account = await findAccountByEmail(providerPayload?.profile?.email);
      if (account && !account.googleId) {
        const emailKey = String(providerPayload?.profile?.email || '')
          .trim()
          .toLowerCase();
        const confirmationKey = `google_link_confirmed_${emailKey}`;
        const alreadyConfirmed = await AsyncStorage.getItem(confirmationKey);

        if (!alreadyConfirmed) {
          const shouldLink = await new Promise(resolve => {
            Alert.alert(
              'Link Existing Account',
              `An account with ${emailKey} already exists. Continue to link it with Google sign-in?`,
              [
                {text: 'Cancel', style: 'cancel', onPress: () => resolve(false)},
                {text: 'Continue', onPress: () => resolve(true)},
              ],
              {cancelable: true},
            );
          });

          if (!shouldLink) {
            return;
          }

          await AsyncStorage.setItem(confirmationKey, 'true');
        }
      }

      await finishAuthentication(providerPayload);
      Toast.show({
        type: 'success',
        text1: 'Account ready',
        text2: 'You are signed in with your provider account.',
      });
    } catch (error) {
      if (isSocialAuthCancelled(error)) {
        return;
      }

      const detailedMessage = buildDetailedAuthError(error);
      console.error('Google signup error:', detailedMessage, error);
      Alert.alert('Google Sign-In Error', detailedMessage);

      Toast.show({
        type: 'error',
        text1: 'Unable to continue',
        text2: normalizeAuthError(error),
      });
    } finally {
      setActiveProvider('');
    }
  };

  const handleEmailSignup = async () => {
    const nextErrors = {
      firstName: validateName(firstName, 'First name'),
      lastName: validateName(lastName, 'Last name'),
      email: validateEmailAddress(email),
      password: validatePassword(password),
    };

    setErrors(nextErrors);

    if (
      nextErrors.firstName ||
      nextErrors.lastName ||
      nextErrors.email ||
      nextErrors.password
    ) {
      Toast.show({
        type: 'info',
        text1: 'Check your details',
        text2: 'Fix the highlighted fields and try again.',
      });
      return;
    }

    try {
      const result = await signupUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      }).unwrap();
      await persistAuthenticatedUser({
        result: {
          ...result,
          authProvider: result?.authProvider || 'email',
        },
        dispatch,
        login,
      });
      navigation.reset({
        index: 0,
        routes: [{name: 'MainTab'}],
      });
      Toast.show({
        type: 'success',
        text1: 'Account ready',
        text2: 'Your account has been created and signed in.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Unable to sign up',
        text2: normalizeAuthError(error),
      });
    }
  };

  const updateFieldError = (field, value) => {
    if (field === 'firstName') {
      setErrors(prev => ({
        ...prev,
        firstName: validateName(value, 'First name'),
      }));
      return;
    }

    if (field === 'lastName') {
      setErrors(prev => ({
        ...prev,
        lastName: validateName(value, 'Last name'),
      }));
      return;
    }

    if (field === 'email') {
      setErrors(prev => ({...prev, email: validateEmailAddress(value)}));
      return;
    }

    if (field === 'password') {
      setErrors(prev => ({...prev, password: validatePassword(value)}));
    }
  };

  const inputStyle = hasError => [
    tw`rounded-2 px-4 py-3 font-Lato-Regular`,
    {
      backgroundColor: darkMode ? '#111827' : '#FFFFFF',
      color: darkMode ? '#F9FAFB' : '#111827',
      borderWidth: 1,
      borderColor: hasError ? '#DC2626' : darkMode ? '#374151' : '#E5E7EB',
    },
  ];

  const handleFieldFocus = field => {
    setFocusedField(field);
    const y = fieldLayouts.current[field];
    if (typeof y !== 'number') {
      return;
    }
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, y - 120),
        animated: true,
      });
    }, 80);
  };

  return (
    <SafeAreaView
      style={[tw`flex-1 bg-primary-1`, darkMode ? tw`bg-secondary-9` : null]}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={tw`flex-grow justify-center items-center px-4 py-4`}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled">
        <Animated.View
          style={[
            tw`w-full max-w-sm`,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <TouchableOpacity
            style={[
              tw`rounded-full px-4 py-3 items-center mb-3`,
              {
                backgroundColor: darkMode ? '#111827' : '#FFFFFF',
                borderWidth: 1,
                borderColor: darkMode ? '#374151' : '#E5E7EB',
              },
            ]}
            onPress={() => navigation.navigate('MainTab')}>
            <Text
              style={[
                tw`font-Lato-Bold text-sm`,
                {color: darkMode ? '#F9FAFB' : '#111827'},
              ]}>
              Continue without account
            </Text>
          </TouchableOpacity>

          <Animated.View
            style={[tw`mb-5 items-center`, {transform: [{scale: scaleAnim}]}]}>
            <Animated.View
              style={[
                tw`mb-3`,
                {
                  transform: [
                    {
                      scale: sparkleAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.06, 1],
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
                tw`font-nokia-bold text-3xl text-center`,
                {color: darkMode ? '#F9FAFB' : '#1F2937'},
              ]}>
              Create Account
            </Text>
            <Text
              style={[
                tw`font-Lato-Regular text-sm text-center mt-2`,
                {color: darkMode ? '#D1D5DB' : '#6B7280'},
              ]}>
              Use Google or complete the form below.
            </Text>
          </Animated.View>

          <View
            style={[
              tw`rounded-3 p-5`,
              {
                backgroundColor: darkMode ? '#1F2937' : '#FFFDFC',
                borderWidth: 1,
                borderColor: darkMode ? '#374151' : '#F3E8D7',
              },
            ]}>
            <TouchableOpacity
              style={[
                tw`px-4 py-4 rounded-full mb-4 relative`,
                {
                  backgroundColor:
                    Boolean(activeProvider) || isEmailSignupLoading
                      ? darkMode
                        ? '#6B7280'
                        : '#D1D5DB'
                      : '#EA9215',
                },
              ]}
              disabled={Boolean(activeProvider) || isEmailSignupLoading}
              onPress={handleProviderAuth}>
              <View style={tw`flex-row items-center justify-center`}>
                <View
                  style={[
                    tw`items-center justify-center rounded-full`,
                    {backgroundColor: '#FFFFFF', width: 36, height: 36},
                  ]}>
                  <Image
                    source={require('../assets/gmail_logo.webp')}
                    style={tw`w-6 h-6`}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={[
                    tw`font-Lato-Bold text-lg ml-3`,
                    {color: '#FFFFFF'},
                  ]}>
                  Continue with Google
                </Text>
              </View>
              {activeProvider === 'google' ? (
                <View style={[tw`absolute right-4`, {top: "50%", marginTop: -10}]}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : (
                <View />
              )}
            </TouchableOpacity>

            <View style={tw`mb-2`}>
              <Text
                style={[
                  tw`font-Lato-Bold text-xs uppercase tracking-widest mb-3`,
                  {color: darkMode ? '#9CA3AF' : '#92400E'},
                ]}>
                Sign up with email
              </Text>
              <View
                onLayout={event => {
                  fieldLayouts.current.firstName = event.nativeEvent.layout.y;
                }}>
                <TextInput
                  value={firstName}
                  onChangeText={value => {
                    setFirstName(value);
                    updateFieldError('firstName', value);
                  }}
                  onFocus={() => handleFieldFocus('firstName')}
                  onBlur={() => {
                    setFocusedField('');
                    updateFieldError('firstName', firstName);
                  }}
                  placeholder="First name"
                  placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
                  style={inputStyle(Boolean(errors.firstName))}
                />
              </View>
              {errors.firstName ? (
                <Text
                  style={[
                    tw`font-Lato-Regular text-xs mt-2 mb-3`,
                    {color: '#DC2626'},
                  ]}>
                  {errors.firstName}
                </Text>
              ) : focusedField === 'firstName' ? (
                <Text
                  style={[
                    tw`font-Lato-Regular text-xs mt-2 mb-3`,
                    {color: darkMode ? '#9CA3AF' : '#6B7280'},
                  ]}>
                  Use your real first name. Minimum 2 letters.
                </Text>
              ) : (
                <View style={tw`mb-3`} />
              )}
              <View
                onLayout={event => {
                  fieldLayouts.current.lastName = event.nativeEvent.layout.y;
                }}>
                <TextInput
                  value={lastName}
                  onChangeText={value => {
                    setLastName(value);
                    updateFieldError('lastName', value);
                  }}
                  onFocus={() => handleFieldFocus('lastName')}
                  onBlur={() => {
                    setFocusedField('');
                    updateFieldError('lastName', lastName);
                  }}
                  placeholder="Last name"
                  placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
                  style={inputStyle(Boolean(errors.lastName))}
                />
              </View>
              {errors.lastName ? (
                <Text
                  style={[
                    tw`font-Lato-Regular text-xs mt-2 mb-3`,
                    {color: '#DC2626'},
                  ]}>
                  {errors.lastName}
                </Text>
              ) : focusedField === 'lastName' ? (
                <Text
                  style={[
                    tw`font-Lato-Regular text-xs mt-2 mb-3`,
                    {color: darkMode ? '#9CA3AF' : '#6B7280'},
                  ]}>
                  Use your family or last name.
                </Text>
              ) : (
                <View style={tw`mb-3`} />
              )}
              <View
                onLayout={event => {
                  fieldLayouts.current.email = event.nativeEvent.layout.y;
                }}>
                <TextInput
                  value={email}
                  onChangeText={value => {
                    setEmail(value);
                    updateFieldError('email', value);
                  }}
                  onFocus={() => handleFieldFocus('email')}
                  onBlur={() => {
                    setFocusedField('');
                    updateFieldError('email', email);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email address"
                  placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
                  style={inputStyle(Boolean(errors.email))}
                />
              </View>
              {errors.email ? (
                <Text
                  style={[
                    tw`font-Lato-Regular text-xs mt-2 mb-3`,
                    {color: '#DC2626'},
                  ]}>
                  {errors.email}
                </Text>
              ) : focusedField === 'email' ? (
                <Text
                  style={[
                    tw`font-Lato-Regular text-xs mt-2 mb-3`,
                    {color: darkMode ? '#9CA3AF' : '#6B7280'},
                  ]}>
                  Format: `name@example.com`
                </Text>
              ) : (
                <View style={tw`mb-3`} />
              )}
              <View
                onLayout={event => {
                  fieldLayouts.current.password = event.nativeEvent.layout.y;
                }}
                style={tw`relative`}>
                <TextInput
                  value={password}
                  onChangeText={value => {
                    setPassword(value);
                    updateFieldError('password', value);
                  }}
                  onFocus={() => handleFieldFocus('password')}
                  onBlur={() => {
                    setFocusedField('');
                    updateFieldError('password', password);
                  }}
                  secureTextEntry={!showPassword}
                  placeholder="Password"
                  placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
                  style={[inputStyle(Boolean(errors.password)), {paddingRight: 48}]}
                />
                <TouchableOpacity
                  style={tw`absolute right-3 top-0 bottom-0 justify-center`}
                  onPress={() => setShowPassword(prev => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }>
                  {showPassword ? (
                    <EyeSlash size={20} color={darkMode ? '#D1D5DB' : '#6B7280'} />
                  ) : (
                    <Eye size={20} color={darkMode ? '#D1D5DB' : '#6B7280'} />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text
                  style={[
                    tw`font-Lato-Regular text-xs mt-2 mb-3`,
                    {color: '#DC2626'},
                  ]}>
                  {errors.password}
                </Text>
              ) : focusedField === 'password' ? (
                <Text
                  style={[
                    tw`font-Lato-Regular text-xs mt-2 mb-3`,
                    {color: darkMode ? '#9CA3AF' : '#6B7280'},
                  ]}>
                  Use at least 6 characters.
                </Text>
              ) : (
                <View style={tw`mb-3`} />
              )}
              <TouchableOpacity
                style={[
                  tw`rounded-full px-4 py-4 items-center`,
                  {
                    backgroundColor:
                      isEmailSignupLoading || activeProvider
                        ? darkMode
                          ? '#6B7280'
                          : '#D1D5DB'
                        : '#EA9215',
                  },
                ]}
                disabled={isEmailSignupLoading || Boolean(activeProvider)}
                onPress={handleEmailSignup}>
                <Text style={tw`font-Lato-Black text-white text-base`}>
                  {isEmailSignupLoading
                    ? 'Creating account...'
                    : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={tw`flex-row justify-center my-5`}>
            <Text
              style={[
                tw`font-Lato-Bold text-secondary-6 text-base`,
                darkMode ? tw`text-primary-3` : null,
              ]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={tw`font-Lato-Bold text-accent-6 text-base`}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Signup;
