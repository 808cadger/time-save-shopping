import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
  FlatList, TextInput, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { identifyStore, getStoreChains, StoreInfo } from "../services/api";
import StoreIdentityCard from "../components/StoreIdentityCard";
import ChatBar, { ChatBarRef } from "../components/ChatBar";
import { PREFS_KEY, UserPreferences } from "./OnboardingScreen";

// Aloha from Pearl City! — Claude design tokens
const PARCHMENT   = "#f5f4ed";
const IVORY       = "#faf9f5";
const NEAR_BLACK  = "#141413";
const DARK_SURFACE = "#30302e";
const TERRACOTTA  = "#c96442";
const CORAL       = "#d97757";
const OLIVE_GRAY  = "#5e5d59";
const STONE_GRAY  = "#87867f";
const BORDER_CREAM = "#f0eee6";
const BORDER_WARM = "#e8e6dc";
const RING_WARM   = "#d1cfc5";
const WARM_SAND   = "#e8e6dc";
const CHARCOAL_WARM = "#4d4c48";

// #ASSUMPTION: store coordinates are a placeholder — user updates to real store
const STORE_LAT = 37.7749;
const STORE_LNG = -122.4194;
const GEOFENCE_RADIUS_METERS = 200;

function distanceMeters(la1: number, lo1: number, la2: number, lo2: number) {
  const R = 6371000, dLat = ((la2 - la1) * Math.PI) / 180, dLng = ((lo2 - lo1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const QUICK_ACTIONS = [
  { icon: "🔍", label: "Find an item",     query: "I need to find an item" },
  { icon: "🗺️", label: "Plan my route",    query: "Help me plan a route for my shopping list" },
  { icon: "🏪", label: "Store layout",     query: "Show me the store map" },
  { icon: "🛒", label: "Order online",     query: "I want to order something online" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [storeEntered, setStoreEntered] = useState(false);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [chains, setChains] = useState<Record<string, StoreInfo>>({});
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const chatBarRef = useRef<ChatBarRef>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;
    loadPrefsAndLocation().then((sub) => { subscription = sub; });
    loadChains();
    return () => { subscription?.remove(); };
  }, []);

  async function loadPrefsAndLocation() {
    try {
      const json = await AsyncStorage.getItem(PREFS_KEY);
      if (json) setPrefs(JSON.parse(json));
    } catch {}
    return startLocationTracking();
  }

  async function loadChains() {
    try {
      const data = await getStoreChains();
      setChains(data);
    } catch {}
  }

  async function startLocationTracking() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      handleLocation(loc.coords.latitude, loc.coords.longitude);
    } catch {}
    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 20 },
      (loc) => handleLocation(loc.coords.latitude, loc.coords.longitude)
    );
    return subscription;
  }

  async function handleLocation(lat: number, lng: number) {
    const dist = distanceMeters(lat, lng, STORE_LAT, STORE_LNG);
    const entered = dist <= GEOFENCE_RADIUS_METERS;
    setStoreEntered(entered);
    if (entered && !storeInfo) {
      setStoreLoading(true);
      try {
        const info = await identifyStore(lat, lng);
        if (info) {
          setStoreInfo(info);
          AsyncStorage.setItem(STORE_KEY, JSON.stringify(info)).catch(() => {});
        }
      } catch {}
      setStoreLoading(false);
    }
  }

  const STORE_KEY = "@timesave_store";

  function selectStore(key: string) {
    const chain = chains[key];
    if (chain) {
      const info = { ...chain, chain_key: key };
      setStoreInfo(info);
      AsyncStorage.setItem(STORE_KEY, JSON.stringify(info)).catch(() => {});
    }
    setShowStoreSelector(false);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero — Near Black with warm editorial feel */}
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.heroTag}>AI GROCERY ASSISTANT</Text>
          <Text style={styles.heroTitle}>time~save{"\n"}~shopping</Text>
          <Text style={styles.heroSub}>Walk in. Shop smarter. Get out.</Text>
          {prefs && (
            <View style={styles.modeChip}>
              <Text style={styles.modeChipText}>
                {prefs.mode === "full_auto" ? "🤖 Full Auto" : prefs.mode === "assisted" ? "💬 AI-Assisted" : "🧭 Manual"}
              </Text>
            </View>
          )}
        </View>

        {/* Store identity */}
        <StoreIdentityCard
          store={storeInfo}
          loading={storeLoading}
          onSelectStore={() => setShowStoreSelector(true)}
        />

        {/* Store entry status */}
        <View style={[styles.statusCard, storeEntered ? styles.statusActive : styles.statusIdle]}>
          <Text style={styles.statusIcon}>{storeEntered ? "📍" : "🏠"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {storeEntered ? "You're in the store!" : "Not in store"}
            </Text>
            <Text style={styles.statusSub}>
              {storeEntered
                ? `GroceryBot is ready${storeInfo ? ` — ${storeInfo.display_name}` : ""}`
                : "Head to the store to get started"}
            </Text>
          </View>
        </View>

        {/* Demo toggle */}
        <TouchableOpacity style={styles.demoBtn} onPress={() => setStoreEntered((v) => !v)}>
          <Text style={styles.demoBtnText}>
            {storeEntered ? "🚶 Simulate leaving store" : "🏪 Simulate entering store"}
          </Text>
        </TouchableOpacity>

        {/* Quick actions */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.actions}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionCard}
              onPress={() => chatBarRef.current?.openWithQuery(a.query)}
              activeOpacity={0.78}
            >
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Supported chains */}
        <Text style={styles.sectionLabel}>SUPPORTED STORES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chainsRow}>
          {Object.entries(chains).slice(0, 10).map(([key, chain]) => (
            <TouchableOpacity
              key={key}
              style={[styles.chainChip, storeInfo?.chain_key === key && styles.chainChipActive]}
              onPress={() => selectStore(key)}
            >
              <Text style={styles.chainEmoji}>{chain.logo_emoji}</Text>
              <Text style={[styles.chainName, storeInfo?.chain_key === key && styles.chainNameActive]}>
                {chain.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Store selector modal */}
      <Modal visible={showStoreSelector} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.selectorModal}>
          <View style={styles.selectorHeader}>
            <Text style={styles.selectorTitle}>Which store are you in?</Text>
            <TouchableOpacity onPress={() => setShowStoreSelector(false)}>
              <Text style={styles.selectorClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={Object.entries(chains)}
            keyExtractor={([key]) => key}
            renderItem={({ item: [key, chain] }) => (
              <TouchableOpacity
                style={[styles.selectorItem, storeInfo?.chain_key === key && styles.selectorItemActive]}
                onPress={() => selectStore(key)}
              >
                <View style={[styles.selectorIcon, { backgroundColor: WARM_SAND }]}>
                  <Text style={{ fontSize: 22 }}>{chain.logo_emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectorName}>{chain.display_name}</Text>
                  <Text style={styles.selectorOnline}>
                    {chain.has_online_order ? "✓ Online ordering available" : "In-store only"}
                  </Text>
                </View>
                {storeInfo?.chain_key === key && (
                  <Text style={{ color: TERRACOTTA, fontSize: 20 }}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ padding: 16, gap: 8 }}
          />
        </View>
      </Modal>

      <ChatBar ref={chatBarRef} storeEntered={storeEntered} storeInfo={storeInfo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PARCHMENT },
  scroll: { paddingBottom: 8 },

  // Hero — Near Black editorial section
  hero: {
    backgroundColor: NEAR_BLACK,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "flex-start",
  },
  heroTag: {
    fontSize: 10,
    fontWeight: "600",
    color: STONE_GRAY,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: "500",
    color: IVORY,
    lineHeight: 44,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: STONE_GRAY,
    marginBottom: 14,
    lineHeight: 20,
  },
  modeChip: {
    backgroundColor: DARK_SURFACE,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#3d3d3a",
  },
  modeChipText: { color: STONE_GRAY, fontSize: 12, fontWeight: "600" },

  // Status card
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: IVORY,
    borderColor: TERRACOTTA,
  },
  statusIdle: {
    backgroundColor: IVORY,
    borderColor: BORDER_CREAM,
  },
  statusIcon: { fontSize: 22 },
  statusTitle: { fontSize: 13, fontWeight: "700", color: NEAR_BLACK },
  statusSub: { fontSize: 11, color: OLIVE_GRAY, marginTop: 2 },

  // Demo toggle
  demoBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: WARM_SAND,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_WARM,
    alignItems: "center",
  },
  demoBtnText: { fontSize: 11, color: CHARCOAL_WARM, fontWeight: "500" },

  // Section labels — overline style
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: STONE_GRAY,
    letterSpacing: 1.5,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },

  // Action cards
  actions: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 8 },
  actionCard: {
    width: "47%",
    backgroundColor: IVORY,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_CREAM,
    // ring-level shadow
    shadowColor: NEAR_BLACK,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 0,
    elevation: 0,
  },
  actionIcon: { fontSize: 22, marginBottom: 7 },
  actionLabel: { fontSize: 12, fontWeight: "600", color: CHARCOAL_WARM, textAlign: "center" },

  // Store chains
  chainsRow: { paddingHorizontal: 16 },
  chainChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: IVORY,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_CREAM,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  chainChipActive: { borderColor: TERRACOTTA, backgroundColor: WARM_SAND },
  chainEmoji: { fontSize: 15 },
  chainName: { fontSize: 12, color: CHARCOAL_WARM, fontWeight: "500" },
  chainNameActive: { color: TERRACOTTA },

  // Store selector modal
  selectorModal: { flex: 1, backgroundColor: PARCHMENT },
  selectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: DARK_SURFACE,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
  },
  selectorTitle: { fontSize: 20, fontWeight: "700", color: IVORY },
  selectorClose: { color: STONE_GRAY, fontSize: 20, fontWeight: "600" },
  selectorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: IVORY,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER_CREAM,
  },
  selectorItemActive: { borderColor: TERRACOTTA, backgroundColor: WARM_SAND },
  selectorIcon: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  selectorName: { fontSize: 15, fontWeight: "700", color: NEAR_BLACK },
  selectorOnline: { fontSize: 12, color: OLIVE_GRAY, marginTop: 2 },
});
