import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import {useSelector} from 'react-redux';
import tw from './../../tailwind';
import {Cross} from 'phosphor-react-native';

const {width, height} = Dimensions.get('window');

const SplashScreen = ({onFinish}) => {
  const darkMode = useSelector(state => state.ui.darkMode);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const crossRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Set status bar style based on theme
    StatusBar.setHidden(true);
    StatusBar.setBarStyle(darkMode ? 'light-content' : 'dark-content');

    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(darkMode ? '#1F2937' : '#FFFFFF', true);
    }

    // Try to set navigation bar color
    const setNavigationBarColor = async () => {
      if (Platform.OS === 'android') {
        try {
          // Try different import methods for the navigation bar package
          let NavigationBar;

          try {
            NavigationBar = require('react-native-navigation-bar-color');
            if (NavigationBar.setNavigationBarColor) {
              NavigationBar.setNavigationBarColor(
                darkMode ? '#1F2937' : '#FFFFFF',
                !darkMode,
              );
            } else if (NavigationBar.changeNavigationBarColor) {
              NavigationBar.changeNavigationBarColor(
                darkMode ? '#1F2937' : '#FFFFFF',
                !darkMode,
                true,
              );
            } else if (typeof NavigationBar === 'function') {
              NavigationBar(darkMode ? '#1F2937' : '#FFFFFF', !darkMode);
            }
          } catch (importError) {
            console.log(
              'Navigation bar package not available:',
              importError.message,
            );
          }
        } catch (error) {
          console.log('Could not set navigation bar color:', error.message);
        }
      }
    };

    setNavigationBarColor();

    // Start animations
    Animated.sequence([
      // Logo animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Text animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Cross rotation animation
    Animated.loop(
      Animated.timing(crossRotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    ).start();

    // Auto dismiss quickly to reduce startup wait
    const timer = setTimeout(() => {
      StatusBar.setHidden(false);
      onFinish();
    }, 1800);

    return () => {
      clearTimeout(timer);
      StatusBar.setHidden(false);
    };
  }, [fadeAnim, scaleAnim, slideAnim, crossRotateAnim, onFinish, darkMode]);

  return (
    <View
      style={[
        tw`flex-1 justify-center items-center`,
        {backgroundColor: darkMode ? '#1F2937' : '#FFFFFF'},
      ]}>
      {/* Background Pattern */}
      <View style={tw`absolute inset-0 opacity-5`}>
        {[...Array(15)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              tw`absolute`,
              {
                left: Math.random() * width,
                top: Math.random() * height,
              },
            ]}>
            <Cross
              size={20}
              color={darkMode ? '#EA9215' : '#D1D5DB'}
              weight="light"
            />
          </Animated.View>
        ))}
      </View>

      {/* Main Logo Container */}
      <Animated.View
        style={[
          tw`items-center justify-center`,
          {
            opacity: fadeAnim,
            transform: [{scale: scaleAnim}],
          },
        ]}>
        {/* Logo Image with Glow Effect */}
        <Animated.View
          style={[
            tw`mb-8`,
            {
              transform: [
                {
                  scale: crossRotateAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.05, 1],
                  }),
                },
              ],
            },
          ]}>
          {/* Logo Image */}
          <Image
            source={require('./../assets/ezra_logo.png')}
            style={[tw`w-32 h-32`]}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App Name */}
        <Animated.View
          style={{
            transform: [{translateY: slideAnim}],
            opacity: fadeAnim,
          }}>
          <Text
            style={[
              tw`text-3xl font-nokia-bold text-center mb-4`,
              {
                color: darkMode ? '#EA9215' : '#1F2937',
                textShadowColor: darkMode
                  ? 'rgba(234, 146, 21, 0.3)'
                  : 'rgba(0, 0, 0, 0.1)',
                textShadowOffset: {width: 0, height: 2},
                textShadowRadius: 4,
              },
            ]}>
            Ezra Seminary
          </Text>

          {/* Ethiopian Motto */}
          <Text
            style={[
              tw`text-lg font-nokia-bold text-center px-6`,
              {
                color: darkMode ? '#D1D5DB' : '#6B7280',
                lineHeight: 28,
                textShadowColor: darkMode
                  ? 'rgba(209, 213, 219, 0.2)'
                  : 'rgba(0, 0, 0, 0.1)',
                textShadowOffset: {width: 0, height: 1},
                textShadowRadius: 2,
              },
            ]}>
            የእግዚአብሔር ቃል ህይወት ይሰጣል!
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Bottom Decorative Element */}
      <Animated.View
        style={[
          tw`absolute bottom-20 items-center`,
          {
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.6],
            }),
            transform: [{translateY: slideAnim}],
          },
        ]}>
        <View style={tw`flex-row items-center`}>
          <View
            style={[
              tw`w-12 h-px`,
              {backgroundColor: darkMode ? '#EA9215' : '#D1D5DB'},
            ]}
          />
          <Animated.View>
            <Cross
              size={16}
              color={darkMode ? '#EA9215' : '#9CA3AF'}
              weight="bold"
            />
          </Animated.View>
          <View
            style={[
              tw`w-12 h-px`,
              {backgroundColor: darkMode ? '#EA9215' : '#D1D5DB'},
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
};

export default SplashScreen;
