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

// Background/quit-state FCM handler - must be registered at top level
// Note: This must be registered before the app starts
// Firebase App auto-initializes from google-services.json (Android) and GoogleService-Info.plist (iOS)
if (typeof require !== 'undefined') {
  try {
    // Dynamically import to avoid errors if Firebase isn't properly linked
    const messagingModule = require('@react-native-firebase/messaging');
    
    if (messagingModule && messagingModule.default) {
      const messaging = messagingModule.default;
      
      // Check if messaging is properly initialized before using it
      try {
        // Set background message handler
        // Only register if the native module is available
        const messagingInstance = messaging();
        if (messagingInstance && typeof messagingInstance.setBackgroundMessageHandler === 'function') {
          messagingInstance.setBackgroundMessageHandler(async remoteMessage => {
            try {
              const RemotePush = require('./src/services/RemotePush').default;
              await RemotePush.handleBackgroundMessage(remoteMessage);
            } catch (e) {
              console.warn('Background message handler error:', e);
            }
          });
          console.log('Background message handler registered successfully');
        }
      } catch (nativeError) {
        // Native module not available - this is OK, app will work without FCM
        console.warn('Firebase Messaging native module not available:', nativeError.message);
      }
    }
  } catch (error) {
    // Firebase not configured or native modules not linked - app will still work
    console.warn('Firebase Messaging background handler not available:', error.message);
  }
}
