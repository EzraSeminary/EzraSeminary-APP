import React from 'react';
import {View, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
import {GoogleLogo} from 'phosphor-react-native';
import tw from './../../tailwind';

const SocialAuthButton = ({
  label,
  subtitle,
  icon,
  onPress,
  darkMode,
  loading,
  disabled,
}) => (
  <TouchableOpacity
    style={[
      tw`w-full rounded-3 px-4 py-4 mb-3`,
      {
        backgroundColor: darkMode ? '#111827' : '#FFFFFF',
        borderWidth: 2,
        borderColor: darkMode ? '#F59E0B' : '#EA9215',
        opacity: disabled ? 0.7 : 1,
      },
    ]}
    activeOpacity={0.85}
    disabled={disabled}
    onPress={onPress}>
    <View style={tw`flex-row items-center`}>
      <View
        style={[
          tw`w-12 h-12 rounded-full items-center justify-center mr-3`,
          {backgroundColor: darkMode ? '#1F2937' : '#FFF7ED'},
        ]}>
        {icon}
      </View>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={darkMode ? '#F9FAFB' : '#111827'}
        />
      ) : (
        <View style={tw`flex-1`}>
          <Text
            style={[
              tw`font-Lato-Black text-base`,
              {color: darkMode ? '#F9FAFB' : '#111827'},
            ]}>
            {label}
          </Text>
          <Text
            style={[
              tw`font-Lato-Regular text-xs mt-1`,
              {color: darkMode ? '#D1D5DB' : '#4B5563'},
            ]}>
            {subtitle}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

const SocialAuthButtons = ({darkMode, onGooglePress, activeProvider}) => (
  <View style={tw`w-full`}>
    <View style={tw`flex-row justify-center mb-4`}>
      <View
        style={[
          tw`flex-row items-center rounded-full px-4 py-2`,
          {backgroundColor: darkMode ? '#111827' : '#FFF7ED'},
        ]}>
        <GoogleLogo
          size={20}
          weight="fill"
          color={darkMode ? '#F59E0B' : '#EA9215'}
        />
        <Text
          style={[
            tw`font-Lato-Bold text-sm ml-3`,
            {color: darkMode ? '#F9FAFB' : '#111827'},
          ]}>
          Google sign in
        </Text>
      </View>
    </View>
    <SocialAuthButton
      label="Continue with Google"
      subtitle="Use your Google account email, name, and profile photo."
      darkMode={darkMode}
      loading={activeProvider === 'google'}
      disabled={Boolean(activeProvider)}
      onPress={onGooglePress}
      icon={
        <GoogleLogo
          size={22}
          weight="fill"
          color={darkMode ? '#F59E0B' : '#EA9215'}
        />
      }
    />
    <View
      style={[
        tw`mt-2 rounded-2 px-4 py-3`,
        {backgroundColor: darkMode ? '#111827' : '#F9FAFB'},
      ]}>
      <Text
        style={[
          tw`font-Lato-Regular text-center text-sm`,
          {color: darkMode ? '#D1D5DB' : '#4B5563'},
        ]}>
        We only use your name, email address, and profile photo from your
        provider.
      </Text>
    </View>
  </View>
);

SocialAuthButtons.defaultProps = {
  activeProvider: '',
};

export default SocialAuthButtons;
