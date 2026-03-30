import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Image,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Sparkle} from 'phosphor-react-native';
import {useDispatch, useSelector} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import tw from './../../tailwind';
import SocialAuthButtons from '../components/SocialAuthButtons';
import {
  useGetAuthProvidersQuery,
  useSocialAuthMutation,
} from '../redux/api-slices/apiSlice';
import {login} from '../redux/authSlice';
import {
  isSocialAuthCancelled,
  signInWithAppleProvider,
  signInWithGoogleProvider,
} from '../services/socialAuth';

const Login = ({navigation}) => {
  const dispatch = useDispatch();
  const darkMode = useSelector(state => state.ui.darkMode);
  const {data: authProviders} = useGetAuthProvidersQuery();
  const [socialAuth] = useSocialAuthMutation();
  const [activeProvider, setActiveProvider] = useState('');

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
    await AsyncStorage.setItem('user', JSON.stringify(result));
    dispatch(login(result));
    navigation.reset({
      index: 0,
      routes: [{name: 'MainTab'}],
    });
  };

  const handleProviderAuth = async provider => {
    try {
      setActiveProvider(provider);

      const providerPayload =
        provider === 'google'
          ? await signInWithGoogleProvider({
              webClientId: authProviders?.google?.webClientId,
              iosClientId: authProviders?.google?.iosClientId,
            })
          : await signInWithAppleProvider({
              serviceId: authProviders?.apple?.serviceId,
              redirectUri: authProviders?.apple?.redirectUri,
            });

      if (!providerPayload) {
        return;
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

      Toast.show({
        type: 'error',
        text1: 'Unable to sign in',
        text2:
          error?.data?.error ||
          error?.message ||
          'Provider sign-in failed. Please try again.',
      });
    } finally {
      setActiveProvider('');
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
                tw`font-nokia-bold text-3xl text-secondary-6 text-center mb-2`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              Welcome Back!
            </Text>
            <Text
              style={[
                tw`font-Lato-Regular text-sm text-secondary-4 text-center opacity-80`,
                darkMode ? tw`text-primary-3` : null,
              ]}>
              Sign in with Google or Apple to continue your spiritual journey.
            </Text>
          </Animated.View>

          <View
            style={[
              tw`rounded-2xl p-5`,
              {backgroundColor: darkMode ? '#374151' : '#FFFFFF'},
            ]}>
            <View style={tw`flex-row items-center justify-center mb-4`}>
              <Sparkle
                size={18}
                color={darkMode ? '#FBBF24' : '#D97706'}
                weight="fill"
              />
              <Text
                style={[
                  tw`font-Lato-Bold text-sm ml-2`,
                  {color: darkMode ? '#F9FAFB' : '#111827'},
                ]}>
                Sign in with your provider
              </Text>
            </View>

            <SocialAuthButtons
              darkMode={darkMode}
              activeProvider={activeProvider}
              onGooglePress={() => handleProviderAuth('google')}
              onApplePress={() => handleProviderAuth('apple')}
            />
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
    </SafeAreaView>
  );
};

export default Login;
