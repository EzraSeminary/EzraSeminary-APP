import React, {useState, useRef, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import {X, Play, Calendar, BookOpen} from 'phosphor-react-native';
import tw from './../../tailwind';
import {useCachedImage} from '../utils/imageCache';
import Toast from 'react-native-toast-message';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const StartDevotionPlanModal = ({
  visible,
  onClose,
  plan,
  darkMode,
  onStartPlan,
  isStarting,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const imageUrl = plan?.image || '';
  const cachedImage = useCachedImage(imageUrl);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!plan) {
    return null;
  }

  const handleStart = async () => {
    if (onStartPlan) {
      await onStartPlan();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <View style={tw`flex-1`}>
        <TouchableOpacity
          style={tw`flex-1 bg-black bg-opacity-50`}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            tw`absolute bottom-0 left-0 right-0`,
            {
              backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: SCREEN_HEIGHT * 0.85,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          {/* Handle bar */}
          <View style={tw`items-center pt-3 pb-2`}>
            <View
              style={[
                tw`w-12 h-1 rounded-full`,
                {backgroundColor: darkMode ? '#4B5563' : '#D1D5DB'},
              ]}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`pb-6`}>
            {/* Header */}
            <View
              style={[
                tw`flex-row items-center justify-between px-6 pb-4 border-b`,
                darkMode ? tw`border-secondary-7` : tw`border-primary-4`,
              ]}>
              <Text
                style={[
                  tw`font-nokia-bold text-2xl`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}>
                Start Devotion Plan
              </Text>
              <TouchableOpacity onPress={onClose} disabled={isStarting}>
                <X
                  size={24}
                  color={darkMode ? '#FFFFFF' : '#000000'}
                  weight="bold"
                />
              </TouchableOpacity>
            </View>

            {/* Plan Image */}
            {cachedImage && (
              <View style={tw`px-6 pt-6`}>
                <View style={tw`h-48 rounded-4 overflow-hidden`}>
                  <Image
                    source={{uri: cachedImage}}
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                  />
                </View>
              </View>
            )}

            {/* Plan Details */}
            <View style={tw`px-6 pt-6`}>
              <Text
                style={[
                  tw`font-nokia-bold text-3xl mb-4`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}>
                {plan.title || 'Untitled Plan'}
              </Text>

              {plan.description && (
                <Text
                  style={[
                    tw`font-nokia-bold text-base mb-6 leading-6`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}>
                  {plan.description}
                </Text>
              )}

              {/* Plan Info Cards */}
              <View style={tw`flex-row gap-4 mb-6`}>
                {plan.numItems && (
                  <View
                    style={[
                      tw`flex-1 px-4 py-3 rounded-4 flex-row items-center`,
                      darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
                    ]}>
                    <Calendar size={20} color="#EA9215" weight="bold" />
                    <View style={tw`ml-3`}>
                      <Text
                        style={[
                          tw`font-nokia-bold text-sm`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        Days
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold text-lg`,
                          darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                        ]}>
                        {plan.numItems}
                      </Text>
                    </View>
                  </View>
                )}

                {plan.icon && (
                  <View
                    style={[
                      tw`flex-1 px-4 py-3 rounded-4 flex-row items-center`,
                      darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
                    ]}>
                    <BookOpen size={20} color="#EA9215" weight="bold" />
                    <View style={tw`ml-3`}>
                      <Text
                        style={[
                          tw`font-nokia-bold text-sm`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        Plan Type
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold text-lg`,
                          darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                        ]}
                        numberOfLines={1}>
                        Devotional
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Sample Preview Section */}
              <View
                style={[
                  tw`p-4 rounded-4 mb-6`,
                  darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
                ]}>
                <Text
                  style={[
                    tw`font-nokia-bold text-lg mb-3`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  What to Expect
                </Text>
                <Text
                  style={[
                    tw`font-nokia-bold text-sm leading-5`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}>
                  This {plan.numItems || 'devotion'} day plan will guide you
                  through daily devotions, helping you grow in your faith and
                  deepen your relationship with God. Each day includes scripture,
                  reflection, and prayer.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Start Button */}
          <View
            style={[
              tw`px-6 pt-4 pb-6 border-t`,
              darkMode ? tw`border-secondary-7` : tw`border-primary-4`,
            ]}>
            <TouchableOpacity
              style={[
                tw`flex-row items-center justify-center py-4 px-6 rounded-4`,
                {backgroundColor: '#EA9215'},
                isStarting && tw`opacity-50`,
              ]}
              onPress={handleStart}
              disabled={isStarting}>
              {isStarting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Play size={24} color="#FFFFFF" weight="fill" />
                  <Text
                    style={tw`font-nokia-bold text-primary-1 text-lg ml-2`}>
                    Start Devotion Plan
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default StartDevotionPlanModal;
