import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Devotion from './../screens/Devotion';
import AllDevotionals from './../screens/DevotionScreens/AllDevotionals';
import SelectedDevotional from '../screens/DevotionScreens/SelectedDevotional';
import DevotionPlans from '../screens/DevotionScreens/DevotionPlans';
import PlanDevotionViewer from '../screens/DevotionScreens/PlanDevotionViewer';

const Stack = createNativeStackNavigator();

const DevotionalStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DevotionalHome"
        component={Devotion}
        options={{headerShown: false}}
        listeners={({navigation, route}) => ({
          tabPress: e => {
            // Reset to DevotionalHome when tab is pressed
            const state = navigation.getState();
            if (state) {
              const devotionalState = state.routes.find(
                r => r.name === 'Devotional',
              );
              if (devotionalState?.state?.index > 0) {
                navigation.reset({
                  index: 0,
                  routes: [{name: 'DevotionalHome'}],
                });
              }
            }
          },
        })}
      />
      <Stack.Screen
        name="AllDevotionals"
        component={AllDevotionals}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="SelectedDevotional"
        component={SelectedDevotional}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="DevotionPlans"
        component={DevotionPlans}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="PlanDevotionViewer"
        component={PlanDevotionViewer}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

export default DevotionalStack;
