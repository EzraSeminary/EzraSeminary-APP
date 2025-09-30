import React, {useState} from 'react';
import {TouchableOpacity, Text, ActivityIndicator} from 'react-native';
import {ArrowClockwise} from 'phosphor-react-native';
import tw from './../../tailwind';
import {useInvalidateSSLCacheMutation} from '../services/SabbathSchoolApi';
import {useInvalidateInVerseCacheMutation} from '../services/InVerseapi';

const QuarterlyRefreshButton = ({
  onRefresh,
  type = 'ssl', // 'ssl' or 'inverse'
  darkMode = false,
  style = {},
  disabled = false,
  size = 'large', // 'small', 'medium', 'large'
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [invalidateSSLCache] = useInvalidateSSLCacheMutation();
  const [invalidateInVerseCache] = useInvalidateInVerseCacheMutation();

  const handleRefresh = async () => {
    if (disabled || isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Invalidate the appropriate cache based on type
      if (type === 'ssl') {
        await invalidateSSLCache();
        console.log('SSL cache invalidated');
      } else if (type === 'inverse') {
        await invalidateInVerseCache();
        console.log('InVerse cache invalidated');
      }

      // Call the custom refresh function if provided
      if (onRefresh) {
        await onRefresh();
      }

      console.log(`${type.toUpperCase()} data refreshed successfully`);
    } catch (error) {
      console.error(`${type.toUpperCase()} refresh error:`, error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return {
          container: tw`p-2 rounded-full`,
          icon: 16,
          text: tw`text-sm`,
        };
      case 'medium':
        return {
          container: tw`flex-row items-center justify-center py-2 px-4 rounded-full`,
          icon: 18,
          text: tw`text-base`,
        };
      case 'large':
      default:
        return {
          container: tw`flex-row items-center justify-center py-3 px-6 rounded-full`,
          icon: 20,
          text: tw`text-base`,
        };
    }
  };

  const buttonSize = getButtonSize();
  const showText = size !== 'small';

  return (
    <TouchableOpacity
      style={[
        buttonSize.container,
        {
          backgroundColor: '#EA9215',
          shadowColor: '#EA9215',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
        },
        (isRefreshing || disabled) && tw`opacity-70`,
        style,
      ]}
      onPress={handleRefresh}
      disabled={disabled || isRefreshing}>
      {isRefreshing ? (
        <ActivityIndicator
          color="#FFFFFF"
          size="small"
          style={showText ? tw`mr-2` : null}
        />
      ) : (
        <ArrowClockwise
          size={buttonSize.icon}
          color="#FFFFFF"
          weight="bold"
          style={showText ? tw`mr-2` : null}
        />
      )}
      {showText && (
        <Text style={[tw`text-white font-nokia-bold`, buttonSize.text]}>
          {isRefreshing ? 'Refreshing...' : 'Try Again'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default QuarterlyRefreshButton;
