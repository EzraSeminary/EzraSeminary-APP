import React from 'react';
import {Platform, StatusBar, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const AndroidStatusBarSpacer = ({
  minHeight = 0,
  backgroundColor = 'transparent',
}) => {
  const insets = useSafeAreaInsets();

  if (Platform.OS !== 'android') {
    return null;
  }

  const height = Math.max(
    insets.top || 0,
    StatusBar.currentHeight || 0,
    minHeight,
  );

  if (height <= 0) {
    return null;
  }

  return <View style={{height, backgroundColor}} />;
};

export default AndroidStatusBarSpacer;
