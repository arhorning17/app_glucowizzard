import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";   // <-- ADD THIS

import { BLEProvider } from "./BLEContext";

import LiveScreen from "./screens/LiveScreen";
import HistoryScreen from "./screens/HistoryScreen";
import LoginScreen from "./screens/LoginScreen";
import SettingsScreen from "./screens/SettingsScreen";
import AlignmentScreen from "./screens/AlignmentScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Bottom tabs
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",

        tabBarIcon: ({ focused, color, size }) => {
          const iconMap: any = {
            Live: focused ? "pulse" : "pulse-outline",
            History: focused ? "time" : "time-outline",
            Settings: focused ? "settings" : "settings-outline",
          };
        
          return (
            <Ionicons
              name={iconMap[route.name]}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Live" component={LiveScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <BLEProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Alignment" component={AlignmentScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </BLEProvider>
  );
}