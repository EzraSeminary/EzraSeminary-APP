import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Home from './../screens/Home';
import Sermons from '../screens/Sermons';
import PreviousLiveStreams from '../screens/PreviousLiveStreams';

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
    </Stack.Navigator>
  );
};

export default HomeStack;
