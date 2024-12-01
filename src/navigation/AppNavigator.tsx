import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/HomeScreen';
import { StudioScreen } from '../screens/StudioScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { theme } from '../styles/theme';

const Stack = createStackNavigator();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'SingrdBeats' }}
        />
        <Stack.Screen 
          name="Studio" 
          component={StudioScreen}
          options={{ title: 'Studio' }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ title: 'Profile' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}