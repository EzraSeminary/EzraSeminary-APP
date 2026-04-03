import React, {useState, useEffect, useCallback, useRef} from 'react';
import {ActivityIndicator, Platform, StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Provider, useSelector, useDispatch} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import ToastComponent from './src/components/ToastComponent';
import SplashScreen from './src/components/SplashScreen';
import {store, persistor} from './src/redux/store';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import {
  House,
  Student,
  Cross,
  CalendarCheck,
  GearSix,
} from 'phosphor-react-native';
import CourseStack from './src/navigation/CourseStack';
import HomeStack from './src/navigation/HomeStack';
import DevotionalStack from './src/navigation/DevotionalStack';
import SSLStack from './src/navigation/SSLStack';
import {useGetCurrentUserQuery} from './src/redux/api-slices/apiSlice';
import {login, updateUser} from './src/redux/authSlice';
import {Login, Signup, Welcome, Setting, SSL} from './src/screens';
import SettingsStack from './src/navigation/SettingsStack';
import {navigationRef} from './src/navigation/NavigationRef';
import SelectedDevotional from './src/screens/DevotionScreens/SelectedDevotional';
import SSLQuarter from './src/screens/SSLScreens/SSLQuarter';
import SSLWeek from './src/screens/SSLScreens/SSLWeek';
import InVerseQuarter from './src/screens/InVerseScreens/InVerseQuarter';
import InVerseWeek from './src/screens/InVerseScreens/InVerseWeek';
import NotificationService from './src/services/NotificationService';
import notifee, {EventType} from '@notifee/react-native';
import RemotePush from './src/services/RemotePush';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const dispatch = useDispatch();

  const {data: userData, error: userError} = useGetCurrentUserQuery();
  //save user data to redux
  useEffect(() => {
    if (userData) {
      dispatch(updateUser(userData));
    }
  }, [dispatch, userData]);

  const tabBarStyle = {
    backgroundColor: darkMode ? '#293239' : '#F3F3F3',
  };

  if (userError) {
    // console.log(userError);
  }

  if (Platform.OS === 'android') {
    StatusBar.setBackgroundColor(darkMode ? '#293239' : '#F1F1F1', true);
  }
  StatusBar.setBarStyle(darkMode ? 'light-content' : 'dark-content', true);
  changeNavigationBarColor(darkMode ? '#293239' : '#F1F1F1', !darkMode, true);

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({color, size}) => {
          let iconComponent;
          if (route.name === 'Home') {
            iconComponent = <House size={size} color={color} weight="fill" />;
          } else if (route.name === 'Course') {
            iconComponent = <Student size={size} color={color} weight="fill" />;
          } else if (route.name === 'SSL') {
            iconComponent = <Cross size={size} color={color} weight="fill" />;
          } else if (route.name === 'Devotional') {
            iconComponent = (
              <CalendarCheck size={size} color={color} weight="fill" />
            );
          } else if (route.name === 'Setting') {
            iconComponent = <GearSix size={size} color={color} weight="fill" />;
          }
          return iconComponent;
        },
        headerShown: false,
        tabBarActiveTintColor: '#EA9215',
        tabBarInactiveTintColor: darkMode ? '#D3D3D3' : '#3A4750',
        tabBarStyle: tabBarStyle,
      })}>
      <Tab.Screen
        name="Home"
        component={HomeStack}
        listeners={({navigation}) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('Home', {screen: 'HomeStack'});
          },
        })}
      />
      <Tab.Screen
        name="Course"
        component={CourseStack}
        listeners={({navigation}) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('Course', {screen: 'CourseHome'});
          },
        })}
      />
      <Tab.Screen
        name="SSL"
        component={SSLStack}
        listeners={({navigation}) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('SSL', {screen: 'SSLHome'});
          },
        })}
      />
      <Tab.Screen
        name="Devotional"
        component={DevotionalStack}
        listeners={({navigation}) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('Devotional', {screen: 'DevotionalHome'});
          },
        })}
      />
      <Tab.Screen
        name="Setting"
        component={SettingsStack}
        listeners={({navigation}) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('Setting', {screen: 'SettingsStack'});
          },
        })}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  const [isCheckingLoginStatus, setIsCheckingLoginStatus] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Signup');
  const pendingNotificationRef = useRef(null);

  useEffect(() => {
    const recoverStorageIfNeeded = async () => {
      const HEALTH_CHECK_KEY = '__storage_health_check__';
      try {
        await AsyncStorage.setItem(HEALTH_CHECK_KEY, 'ok');
        await AsyncStorage.removeItem(HEALTH_CHECK_KEY);
        return;
      } catch (error) {
        const message = String(error?.message || '');
        const isStorageFull =
          message.includes('SQLITE_FULL') || message.includes('disk is full');

        if (!isStorageFull) {
          return;
        }

        try {
          const keys = await AsyncStorage.getAllKeys();
          const keysToRemove = keys.filter(
            key =>
              key === 'persist:root' ||
              key === 'home_data_cache' ||
              key === 'home_screen_cache' ||
              key === 'devotion_cache' ||
              key === 'ssl_lesson_cache' ||
              key.startsWith('app_cache_'),
          );

          if (keysToRemove.length > 0) {
            await AsyncStorage.multiRemove(keysToRemove);
          }
          console.warn(
            `Storage was full. Cleared ${keysToRemove.length} cache keys for recovery.`,
          );
        } catch (cleanupError) {
          console.warn('Failed to recover from low storage state:', cleanupError);
        }
      }
    };

    const checkLoginStatus = async () => {
      try {
        await recoverStorageIfNeeded();
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          store.dispatch(login(JSON.parse(storedUser)));
          setInitialRoute('MainTab');
        }
      } catch (error) {
        console.error('Failed to get user details', error);
      }
      setIsCheckingLoginStatus(false);
    };

    checkLoginStatus();
  }, []);

  useEffect(() => {
    // Ensure no stale toast blocks interactions after cold start / reinstall.
    Toast.hide();
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  const navigateFromNotification = useCallback(notification => {
    try {
      const data = notification?.data || {};
      const devotionId = data.devotionId || data.devotionalId;
      const parsedYear = data.year ? Number(data.year) : undefined;

      if (!navigationRef.current?.isReady?.()) {
        pendingNotificationRef.current = notification;
        return;
      }

      if (devotionId) {
        navigationRef.current.navigate('MainTab', {
          screen: 'Devotional',
          params: {
            screen: 'SelectedDevotional',
            params: {
              devotionalId: String(devotionId),
              ...(Number.isFinite(parsedYear) ? {year: parsedYear} : {}),
            },
          },
        });
        return;
      }

      navigationRef.current.navigate('MainTab', {
        screen: 'Devotional',
        params: {screen: 'DevotionalHome'},
      });
    } catch (error) {
      console.warn('Failed to handle notification press:', error);
    }
  }, []);

  useEffect(() => {
    if (showSplash) {
      return;
    }

    const initializeNotifications = async () => {
      try {
        // Run notification startup tasks in sequence to avoid Android permission race conditions.
        await NotificationService.requestPermissions();
        await NotificationService.rescheduleNotificationsIfNeeded();
        await RemotePush.init();

        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification?.notification) {
          navigateFromNotification(initialNotification.notification);
        }
      } catch (error) {
        console.warn('Failed to initialize notifications:', error);
      }
    };

    const unsubscribeForeground = notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS) {
        navigateFromNotification(detail.notification);
      }
    });

    initializeNotifications();

    return () => {
      unsubscribeForeground();
    };
  }, [showSplash, navigateFromNotification]);

  useEffect(() => {
    if (!showSplash && pendingNotificationRef.current) {
      const pending = pendingNotificationRef.current;
      pendingNotificationRef.current = null;
      navigateFromNotification(pending);
    }
  }, [showSplash, navigateFromNotification]);

  // Show splash screen first
  if (showSplash) {
    return (
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <SplashScreen onFinish={handleSplashFinish} />
        </PersistGate>
      </Provider>
    );
  }

  if (isCheckingLoginStatus) {
    return <ActivityIndicator />;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{
              lazy: true,
            }}>
            <Stack.Screen
              name="Welcome"
              component={Welcome}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="Signup"
              component={Signup}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="Login"
              component={Login}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="MainTab"
              component={MainTabNavigator}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="SelectedDevotional"
              component={SelectedDevotional}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="SSLQuarter"
              component={SSLQuarter}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="SSLWeek"
              component={SSLWeek}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="InVerseQuarter"
              component={InVerseQuarter}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="InVerseWeek"
              component={InVerseWeek}
              options={{headerShown: false}}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PersistGate>
      <ToastComponent />
    </Provider>
  );
};

export default App;
