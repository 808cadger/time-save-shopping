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

// Aloha from Pearl City! — Claude design tokens
const IVORY = "#faf9f5";
const TERRACOTTA = "#c96442";
const STONE_GRAY = "#87867f";
const NEAR_BLACK = "#141413";
const BORDER_CREAM = "#f0eee6";

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: React.ComponentProps<typeof Ionicons>["name"]; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as React.ComponentProps<typeof Ionicons>["name"])}
      size={22}
      color={focused ? TERRACOTTA : STONE_GRAY}
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
            tabBarActiveTintColor: TERRACOTTA,
            tabBarInactiveTintColor: STONE_GRAY,
            tabBarStyle: {
              position: "absolute",
              bottom: Platform.OS === "ios" ? 28 : 16,
              left: 24,
              right: 24,
              height: 64,
              borderRadius: 32,
              backgroundColor: IVORY,
              borderTopWidth: 0,
              paddingBottom: 0,
              paddingTop: 0,
              // ring-based shadow — no heavy drop shadow
              shadowColor: NEAR_BLACK,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0,
              shadowRadius: 0,
              elevation: 0,
              borderWidth: 1,
              borderColor: BORDER_CREAM,
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
