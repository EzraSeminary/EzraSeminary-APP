import React from 'react';
import {View} from 'react-native';

const ProgressBar = ({
  progress = 0,
  height = 8,
  trackColor = '#E5E7EB',
  fillColor = '#EA9215',
  borderRadius = 999,
}) => {
  const safeProgress = Number.isFinite(progress)
    ? Math.max(0, Math.min(progress, 1))
    : 0;

  return (
    <View
      style={{
        width: '100%',
        height,
        backgroundColor: trackColor,
        borderRadius,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: `${safeProgress * 100}%`,
          height: '100%',
          backgroundColor: fillColor,
          borderRadius,
        }}
      />
    </View>
  );
};

export default ProgressBar;
