/**
 * @format
 */

require('react-native-gesture-handler');

// Minimal imports so registration runs before any other module can throw
const {AppRegistry} = require('react-native');
const appName = require('./app.json').name;

// Register immediately so "EzraApp" is always registered (native looks this up at launch)
function RootComponent() {
  const React = require('react');
  const {View, Text} = require('react-native');

  try {
    require('react-native-screens/native-stack');
    const {enableScreens} = require('react-native-screens');
    enableScreens();
  } catch (e) {
    // non-fatal
  }

  try {
    const App = require('./App').default;
    const ErrorBoundary = require('./src/components/ErrorBoundary').default;
    return React.createElement(ErrorBoundary, null, React.createElement(App, null));
  } catch (e) {
    return React.createElement(
      View,
      {style: {flex: 1, justifyContent: 'center', padding: 20}},
      React.createElement(Text, null, String(e?.message || e)),
    );
  }
}

AppRegistry.registerComponent(appName, () => RootComponent);

try {
  const {LogBox} = require('react-native');
  LogBox.ignoreLogs(['ViewPropTypes will be removed', 'Carousel.propTypes']);
} catch (_) {}

// Background/quit-state FCM handler - must be registered at top level
if (typeof require !== 'undefined') {
  try {
    const messagingModule = require('@react-native-firebase/messaging');
    if (messagingModule?.default) {
      const messaging = messagingModule.default();
      if (messaging && typeof messaging.setBackgroundMessageHandler === 'function') {
        messaging.setBackgroundMessageHandler(async remoteMessage => {
          try {
            const RemotePush = require('./src/services/RemotePush').default;
            await RemotePush.handleBackgroundMessage(remoteMessage);
          } catch (e) {
            console.warn('Background message handler error:', e);
          }
        });
      }
    }
  } catch (error) {
    console.warn('Firebase Messaging background handler not available:', error?.message);
  }
}
