import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSelector} from 'react-redux';
import {
  House,
  Student,
  Cross,
  CalendarCheck,
  GearSix,
} from 'phosphor-react-native';
import CourseStack from './CourseStack';
import HomeStack from './HomeStack';
import DevotionalStack from './DevotionalStack';
import SSLStack from './SSLStack';
import InVerseStack from './InVerseStack';
import Setting from '../screens/Setting';
import {StatusBar} from 'react-native';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import {StackActions} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  floatingTabBarIconStyle,
  floatingTabBarItemStyle,
  floatingTabBarLabelStyle,
  getFloatingTabBarStyle,
  getFloatingTabInactiveColor,
} from './floatingTabBarStyles';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const insets = useSafeAreaInsets();

  StatusBar.setBackgroundColor(darkMode ? '#293239' : '#F1F1F1', true);
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
        tabBarInactiveTintColor: getFloatingTabInactiveColor(darkMode),
        tabBarStyle: getFloatingTabBarStyle(darkMode, insets),
        tabBarItemStyle: floatingTabBarItemStyle,
        tabBarLabelStyle: floatingTabBarLabelStyle,
        tabBarIconStyle: floatingTabBarIconStyle,
        tabBarHideOnKeyboard: true,
      })}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Course" component={CourseStack} />
      <Tab.Screen name="SSL" component={SSLStack} />
      <Tab.Screen name="InVerse" component={InVerseStack} />
      <Tab.Screen
        name="Devotional"
        component={DevotionalStack}
        listeners={({navigation}) => ({
          tabPress: e => {
            // Get the current state
            const state = navigation.getState();
            const devotionalRoute = state?.routes?.find(
              r => r.name === 'Devotional',
            );
            const devotionalState = devotionalRoute?.state;
            // If we're not on DevotionalHome, reset to it
            if (devotionalState?.index > 0) {
              e.preventDefault();
              if (devotionalRoute?.key) {
                navigation.dispatch({
                  ...StackActions.popToTop(),
                  target: devotionalRoute.key,
                });
              }
              navigation.navigate('Devotional', {screen: 'DevotionalHome'});
            }
          },
        })}
      />
      <Tab.Screen name="Setting" component={Setting} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
