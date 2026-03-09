import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Platform, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HomeScreen from "./screens/HomeScreen";
import ShoppingListScreen from "./screens/ShoppingListScreen";
import StoreMapScreen from "./screens/StoreMapScreen";
import OnboardingScreen, { PREFS_KEY, UserPreferences } from "./screens/OnboardingScreen";

const Tab = createBottomTabNavigator();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{icon}</Text>;
}

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((json) => {
      if (json) {
        const prefs: UserPreferences = JSON.parse(json);
        setOnboardingDone(prefs.onboardingComplete === true);
      } else {
        setOnboardingDone(false);
      }
    });
  }, []);

  // While checking storage, show nothing (or a splash)
  if (onboardingDone === null) return null;

  if (!onboardingDone) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#22c55e",
            tabBarInactiveTintColor: "#94a3b8",
            tabBarStyle: {
              borderTopColor: "#e2e8f0",
              paddingBottom: Platform.OS === "ios" ? 20 : 8,
              paddingTop: 8,
              height: Platform.OS === "ios" ? 82 : 62,
              backgroundColor: "#fff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 8,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarLabel: "Home",
              tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="MyList"
            component={ShoppingListScreen}
            options={{
              tabBarLabel: "My List",
              tabBarIcon: ({ focused }) => <TabIcon icon="📝" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="StoreMap"
            component={StoreMapScreen}
            options={{
              tabBarLabel: "Map",
              tabBarIcon: ({ focused }) => <TabIcon icon="🏪" focused={focused} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
