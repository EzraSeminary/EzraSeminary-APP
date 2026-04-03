import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  Animated,
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import Toast from 'react-native-toast-message';
import tw from './../../tailwind';
import {
  useLoginMutation,
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
  validatePassword,
} from '../services/mobileAuth';

const Login = ({navigation}) => {
  const dispatch = useDispatch();
  const darkMode = useSelector(state => state.ui.darkMode);
  const {
    data: authProviders,
    isLoading: isAuthProvidersLoading,
    isFetching: isAuthProvidersFetching,
  } = useGetAuthProvidersQuery();
  const [socialAuth] = useSocialAuthMutation();
  const [loginUser, {isLoading: isEmailLoginLoading}] = useLoginMutation();
  const [activeProvider, setActiveProvider] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState('');

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
    await persistAuthenticatedUser({result, dispatch, login});
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
        text2:
          'Google sign-in is not configured. Check backend connectivity and provider setup.',
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
      if (!account) {
        Toast.show({
          type: 'info',
          text1: 'Creating your account',
          text2:
            'No account was found for this Google email. We are creating one now.',
        });
      }

      await finishAuthentication(providerPayload);
      Toast.show({
        type: 'success',
        text1: 'Welcome back',
        text2: 'You are signed in.',
      });
    } catch (error) {
      if (isSocialAuthCancelled(error)) {
        return;
      }

      const detailedMessage = buildDetailedAuthError(error);
      console.error('Google login error:', detailedMessage, error);
      Alert.alert('Google Sign-In Error', detailedMessage);

      Toast.show({
        type: 'error',
        text1: 'Unable to sign in',
        text2: normalizeAuthError(error),
      });
    } finally {
      setActiveProvider('');
    }
  };

  const handleEmailLogin = async () => {
    const nextErrors = {
      email: validateEmailAddress(email),
      password: validatePassword(password),
    };

    setErrors(nextErrors);

    if (nextErrors.email || nextErrors.password) {
      Toast.show({
        type: 'info',
        text1: 'Check your details',
        text2: 'Fix the highlighted fields and try again.',
      });
      return;
    }

    try {
      const result = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      }).unwrap();
      await persistAuthenticatedUser({result, dispatch, login});
      navigation.reset({
        index: 0,
        routes: [{name: 'MainTab'}],
      });
      Toast.show({
        type: 'success',
        text1: 'Welcome back',
        text2: 'You are signed in.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Unable to sign in',
        text2: normalizeAuthError(error),
      });
    }
  };

  const updateFieldError = (field, value) => {
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
          <Animated.View
            style={[tw`items-center mb-6`, {transform: [{scale: scaleAnim}]}]}>
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
                style={tw`w-14 h-14`}
                resizeMode="contain"
              />
            </Animated.View>
            <Text
              style={[
                tw`font-nokia-bold text-3xl text-center`,
                {color: darkMode ? '#F9FAFB' : '#1F2937'},
              ]}>
              Welcome Back
            </Text>
            <Text
              style={[
                tw`font-Lato-Regular text-sm text-center mt-2`,
                {color: darkMode ? '#D1D5DB' : '#6B7280'},
              ]}>
              Sign in fast, or continue without an account.
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
                  tw`font-Lato-Bold text-xs`,
                  {color: darkMode ? '#F9FAFB' : '#111827'},
                ]}>
                Continue without account
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`px-4 py-4 rounded-full mb-4 relative`,
                {
                  backgroundColor:
                    Boolean(activeProvider) || isEmailLoginLoading
                      ? darkMode
                        ? '#6B7280'
                        : '#D1D5DB'
                      : '#EA9215',
                },
              ]}
              disabled={Boolean(activeProvider) || isEmailLoginLoading}
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
                Sign in with email
              </Text>
              <TextInput
                value={email}
                onChangeText={value => {
                  setEmail(value);
                  updateFieldError('email', value);
                }}
                onFocus={() => setFocusedField('email')}
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
              <TextInput
                value={password}
                onChangeText={value => {
                  setPassword(value);
                  updateFieldError('password', value);
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => {
                  setFocusedField('');
                  updateFieldError('password', password);
                }}
                secureTextEntry
                placeholder="Password"
                placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
                style={inputStyle(Boolean(errors.password))}
              />
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
                      isEmailLoginLoading || activeProvider
                        ? darkMode
                          ? '#6B7280'
                          : '#D1D5DB'
                        : '#EA9215',
                  },
                ]}
                disabled={isEmailLoginLoading || Boolean(activeProvider)}
                onPress={handleEmailLogin}>
                <Text style={tw`font-Lato-Black text-white text-base`}>
                  {isEmailLoginLoading ? 'Signing in...' : 'Sign In'}
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
              Need an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={tw`font-Lato-Bold text-accent-6 text-base`}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
      {activeProvider === 'google' ? (
        <View
          style={[
            tw`absolute inset-0 items-center justify-center px-8`,
            {backgroundColor: 'rgba(17, 24, 39, 0.72)'},
          ]}>
          <View
            style={[
              tw`rounded-3 px-8 py-7 items-center`,
              {backgroundColor: 'rgba(255, 255, 255, 0.95)'},
            ]}>
            <ActivityIndicator size="large" color="#EA9215" />
            <Text
              style={[
                tw`font-Lato-Black text-base mt-4 text-center`,
                {color: '#111827'},
              ]}>
              Signing you in...
            </Text>
            <Text
              style={[
                tw`font-Lato-Regular text-sm mt-2 text-center`,
                {color: '#4B5563'},
              ]}>
              Please wait while we connect your Google account.
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default Login;
