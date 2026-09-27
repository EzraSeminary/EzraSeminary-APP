import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Setting} from '../screens';
import UserProfileUpdateScreen from '../screens/Settings/UserProfileUpdateScreen';
import AppInfo from '../screens/Settings/AppInfo';
import AccountSettings from '../screens/Settings/AccountSettings';
import NotificationSettings from '../screens/Settings/NotificationSettings';
import FavoriteDevotions from '../screens/Settings/FavoriteDevotions';
import ExploreAdmin from '../screens/AdminScreens/ExploreAdmin';
import ExploreCategoryForm from '../screens/AdminScreens/ExploreCategoryForm';
import ExploreCategoryItems from '../screens/AdminScreens/ExploreCategoryItems';
import ExploreItemForm from '../screens/AdminScreens/ExploreItemForm';
import DevotionAdmin from '../screens/AdminScreens/DevotionAdmin';
import DevotionForm from '../screens/AdminScreens/DevotionForm';

const Stack = createNativeStackNavigator();

const SettingsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SettingsStack"
        component={Setting}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="EditProfile"
        component={UserProfileUpdateScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="AppInfo"
        component={AppInfo}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="AccountSettings"
        component={AccountSettings}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="FavoriteDevotions"
        component={FavoriteDevotions}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ExploreAdmin"
        component={ExploreAdmin}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ExploreCategoryForm"
        component={ExploreCategoryForm}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ExploreCategoryItems"
        component={ExploreCategoryItems}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ExploreItemForm"
        component={ExploreItemForm}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="DevotionAdmin"
        component={DevotionAdmin}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="DevotionForm"
        component={DevotionForm}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

export default SettingsStack;
