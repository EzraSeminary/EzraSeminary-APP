import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import InVerseQuarter from './../screens/InVerseScreens/InVerseQuarter';
import InVerseHome from '../screens/InVerseScreens/InVerseHome';
import InVerseWeek from '../screens/InVerseScreens/InVerseWeek';

const Stack = createNativeStackNavigator();

const InVerseStack = () => {
  return (
    <Stack.Navigator initialRouteName="InVerseHome">
      <Stack.Screen
        name="InVerseHome"
        component={InVerseHome}
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
  );
};

export default InVerseStack;
