/**
 * @format
 */

import React from 'react';
import {AppRegistry, LogBox} from 'react-native';
import 'react-native-screens/native-stack';
import {enableScreens} from 'react-native-screens';
import App from './App';
import ErrorBoundary from './src/components/ErrorBoundary';
import {name as appName} from './app.json';

// Enable react-native-screens
enableScreens();

LogBox.ignoreLogs(['ViewPropTypes will be removed', 'Carousel.propTypes']);

const AppWithErrorBoundary = () => {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

AppRegistry.registerComponent(appName, () => AppWithErrorBoundary);
