jest.mock('react-native', () => {
  const reactNative = jest.requireActual('react-native');
  Object.defineProperty(reactNative, 'StatusBar', {
    configurable: true,
    value: Object.assign(() => null, {
      setHidden: jest.fn(),
      setBarStyle: jest.fn(),
      setBackgroundColor: jest.fn(),
    }),
  });
  Object.defineProperty(reactNative, 'Platform', {
    configurable: true,
    value: {
      OS: 'ios',
      select: choices => choices?.ios || choices?.default,
    },
  });
  const animation = {
    start: callback => {
      if (callback) {
        callback({finished: true});
      }
    },
    stop: jest.fn(),
  };
  Object.defineProperty(reactNative, 'Animated', {
    configurable: true,
    value: {
      Value: class {
        constructor(value) {
          this.value = value;
        }
        interpolate() {
          return this;
        }
      },
      View: reactNative.View,
      Text: reactNative.Text,
      Image: reactNative.Image,
      timing: jest.fn(() => animation),
      spring: jest.fn(() => animation),
      parallel: jest.fn(() => animation),
      sequence: jest.fn(() => animation),
      loop: jest.fn(() => animation),
      createAnimatedComponent: component => component,
    },
  });
  return reactNative;
});

jest.mock(
  '@react-native-async-storage/async-storage',
  () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  },
}));

jest.mock('./src/components/SplashScreen', () => () => null);

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(),
    signOut: jest.fn(() => Promise.resolve()),
    getTokens: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

jest.mock('react-native-navigation-bar-color', () => jest.fn());

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({isConnected: true, isInternetReachable: true}),
  ),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const {View} = require('react-native');
  return props => React.createElement(View, props);
});

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/tmp',
  CachesDirectoryPath: '/tmp',
  exists: jest.fn(() => Promise.resolve(false)),
  mkdir: jest.fn(() => Promise.resolve()),
  downloadFile: jest.fn(() => ({promise: Promise.resolve({statusCode: 200})})),
  unlink: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-snap-carousel', () => {
  const React = require('react');
  const {View} = require('react-native');
  const Carousel = ({data = [], renderItem, children}) =>
    React.createElement(
      View,
      null,
      children ||
        data.map((item, index) =>
          React.createElement(View, {key: index}, renderItem({item, index})),
        ),
    );
  return {
    __esModule: true,
    default: Carousel,
    Pagination: props => React.createElement(View, props),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const {View} = require('react-native');
  const Handler = ({children, ...props}) =>
    React.createElement(View, props, children);
  return {
    GestureHandlerRootView: Handler,
    PinchGestureHandler: Handler,
    PanGestureHandler: Handler,
    TapGestureHandler: Handler,
    State: {ACTIVE: 'ACTIVE', END: 'END'},
  };
});

jest.mock('@eleva/react-native-reanimated-carousel', () => {
  const React = require('react');
  const {View} = require('react-native');
  return ({data = [], renderItem, children}) =>
    React.createElement(
      View,
      null,
      children ||
        data.map((item, index) =>
          React.createElement(View, {key: index}, renderItem({item, index})),
        ),
    );
});

jest.mock('react-native-flip-card', () => {
  const React = require('react');
  const {View} = require('react-native');
  return ({children, ...props}) => React.createElement(View, props, children);
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    WebView: props => React.createElement(View, props),
    default: props => React.createElement(View, props),
  };
});

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {
    setupPlayer: jest.fn(() => Promise.resolve()),
    add: jest.fn(() => Promise.resolve()),
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    reset: jest.fn(() => Promise.resolve()),
    seekTo: jest.fn(() => Promise.resolve()),
  },
  useTrackPlayerEvents: jest.fn(),
  usePlaybackState: jest.fn(() => ({state: 'stopped'})),
  useProgress: jest.fn(() => ({position: 0, duration: 0})),
  Event: {},
  State: {
    Playing: 'playing',
    Paused: 'paused',
    Stopped: 'stopped',
  },
  Capability: {},
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(() => Promise.resolve()),
    shareSingle: jest.fn(() => Promise.resolve()),
  },
  Social: {},
}));

jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  createChannel: jest.fn(),
  localNotification: jest.fn(),
  localNotificationSchedule: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
}));

jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    save: jest.fn(() => Promise.resolve('file://mock')),
  },
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(() => Promise.resolve({authorizationStatus: 1})),
    createChannel: jest.fn(() => Promise.resolve('default')),
    displayNotification: jest.fn(() => Promise.resolve()),
    cancelAllNotifications: jest.fn(() => Promise.resolve()),
    onForegroundEvent: jest.fn(() => jest.fn()),
    onBackgroundEvent: jest.fn(),
  },
  AndroidImportance: {HIGH: 4, DEFAULT: 3},
  AuthorizationStatus: {AUTHORIZED: 1, DENIED: 0},
  EventType: {},
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
}));

jest.mock('react-native-htmlview', () => {
  const React = require('react');
  const {Text} = require('react-native');
  return ({value, children, ...props}) =>
    React.createElement(Text, props, children || value || '');
});

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn(),
}));

jest.mock('react-native-modal-datetime-picker', () => () => null);

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    SafeAreaProvider: ({children}) => React.createElement(View, null, children),
    SafeAreaView: ({children, ...props}) =>
      React.createElement(View, props, children),
    useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
    initialWindowMetrics: {
      frame: {x: 0, y: 0, width: 390, height: 844},
      insets: {top: 0, right: 0, bottom: 0, left: 0},
    },
  };
});
