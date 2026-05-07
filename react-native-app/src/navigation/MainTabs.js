import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import CallHistoryScreen from '../screens/CallHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { COLORS } from '../utils/theme';

const Tab = createBottomTabNavigator();

const TabIcon = ({ emoji, focused }) => (
  <View style={styles.iconContainer}>
    <Text style={[styles.icon, focused && styles.iconFocused]}>{emoji}</Text>
  </View>
);

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Contacts',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />
        }}
      />
      <Tab.Screen
        name="Calls"
        component={CallHistoryScreen}
        options={{
          tabBarLabel: 'Calls',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📞" focused={focused} />
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  icon: {
    fontSize: 22
  },
  iconFocused: {
    transform: [{ scale: 1.1 }]
  }
});
