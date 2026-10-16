import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Home from './../screens/Home';
import Sermons from '../screens/Sermons';
import PreviousLiveStreams from '../screens/PreviousLiveStreams';
import BibleHome from '../screens/Bible/BibleHome';
import BibleReader from '../screens/Bible/BibleReader';
import BibleSearch from '../screens/Bible/BibleSearch';
import MyBible from '../screens/Bible/MyBible';
import BibleHighlightManager from '../screens/Settings/BibleHighlightManager';

const Stack = createNativeStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeStack"
        component={Home}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Sermons"
        component={Sermons}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="PreviousLiveStreams"
        component={PreviousLiveStreams}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="BibleHome"
        component={BibleHome}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="BibleReader"
        component={BibleReader}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="BibleSearch"
        component={BibleSearch}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="MyBible"
        component={MyBible}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="BibleHighlightManager"
        component={BibleHighlightManager}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

export default HomeStack;
