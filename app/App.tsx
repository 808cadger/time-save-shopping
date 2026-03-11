import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Platform, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HomeScreen from "./screens/HomeScreen";
import ShoppingListScreen from "./screens/ShoppingListScreen";
import StoreMapScreen from "./screens/StoreMapScreen";
import OnboardingScreen, { PREFS_KEY, UserPreferences } from "./screens/OnboardingScreen";

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: React.ComponentProps<typeof Ionicons>["name"]; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as React.ComponentProps<typeof Ionicons>["name"])}
      size={22}
      color={focused ? "#22c55e" : "#94a3b8"}
    />
  );
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
              position: "absolute",
              bottom: Platform.OS === "ios" ? 28 : 16,
              left: 24,
              right: 24,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#fff",
              borderTopWidth: 0,
              paddingBottom: 0,
              paddingTop: 0,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 24,
              elevation: 16,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 6 },
            tabBarIconStyle: { marginTop: 6 },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarLabel: "Home",
              tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="MyList"
            component={ShoppingListScreen}
            options={{
              tabBarLabel: "My List",
              tabBarIcon: ({ focused }) => <TabIcon name="list" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="StoreMap"
            component={StoreMapScreen}
            options={{
              tabBarLabel: "Map",
              tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
