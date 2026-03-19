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

// ── Store coordinates — update to your actual store ──
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
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.heroIcon}>$</Text>
          <Text style={styles.heroTitle}>time~save~shopping</Text>
          <Text style={styles.heroSub}>Shop smarter. Save time.</Text>
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
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionCard}
              onPress={() => chatBarRef.current?.openWithQuery(a.query)}
              activeOpacity={0.75}
            >
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Supported chains */}
        <Text style={styles.sectionTitle}>Supported Stores</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chainsRow}>
          {Object.entries(chains).slice(0, 10).map(([key, chain]) => (
            <TouchableOpacity
              key={key}
              style={[styles.chainChip, storeInfo?.chain_key === key && styles.chainChipActive]}
              onPress={() => selectStore(key)}
            >
              <Text style={styles.chainEmoji}>{chain.logo_emoji}</Text>
              <Text style={styles.chainName}>{chain.display_name}</Text>
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
                <View style={[styles.selectorIcon, { backgroundColor: (chain.color ?? "#22c55e") + "20" }]}>
                  <Text style={{ fontSize: 22 }}>{chain.logo_emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectorName}>{chain.display_name}</Text>
                  <Text style={styles.selectorOnline}>
                    {chain.has_online_order ? "✓ Online ordering available" : "In-store only"}
                  </Text>
                </View>
                {storeInfo?.chain_key === key && <Text style={{ color: "#22c55e", fontSize: 20 }}>✓</Text>}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ padding: 16, gap: 8 }}
          />
        </View>
      </Modal>

      {/* Persistent chat bar at the bottom */}
      <ChatBar ref={chatBarRef} storeEntered={storeEntered} storeInfo={storeInfo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { paddingBottom: 8 },
  hero: {
    alignItems: "center", paddingBottom: 16,
    backgroundColor: "#22c55e", paddingHorizontal: 24,
  },
  heroIcon: {
    fontSize: 44, marginBottom: 4, color: "rgba(255,255,255,0.92)",
    fontWeight: "200", letterSpacing: -2, fontStyle: "italic",
  },
  heroTitle: { fontSize: 21, fontWeight: "800", color: "#fff", letterSpacing: 1, marginBottom: 2 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 8 },
  modeChip: {
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  modeChipText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  statusCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, padding: 14, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  statusActive: { backgroundColor: "#f0fdf4", borderWidth: 1.5, borderColor: "#86efac" },
  statusIdle: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  statusIcon: { fontSize: 24 },
  statusTitle: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  statusSub: { fontSize: 11, color: "#64748b", marginTop: 1 },
  demoBtn: {
    marginHorizontal: 16, marginTop: 6,
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: "#f1f5f9", borderRadius: 10,
    borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center",
  },
  demoBtnText: { fontSize: 11, color: "#64748b" },
  sectionTitle: {
    fontSize: 14, fontWeight: "700", color: "#1e293b",
    marginHorizontal: 16, marginTop: 14, marginBottom: 8,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 8 },
  actionCard: {
    width: "47%", backgroundColor: "#fff", borderRadius: 12, padding: 12,
    alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  actionIcon: { fontSize: 22, marginBottom: 6 },
  actionLabel: { fontSize: 12, fontWeight: "600", color: "#334155", textAlign: "center" },
  chainsRow: { paddingHorizontal: 16 },
  chainChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#e2e8f0",
    paddingHorizontal: 10, paddingVertical: 6, marginRight: 8,
  },
  chainChipActive: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  chainEmoji: { fontSize: 15 },
  chainName: { fontSize: 12, color: "#334155", fontWeight: "500" },
  selectorModal: { flex: 1, backgroundColor: "#f8fafc" },
  selectorHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, backgroundColor: "#22c55e",
    paddingTop: Platform.OS === "ios" ? 56 : 20,
  },
  selectorTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  selectorClose: { color: "#fff", fontSize: 20, fontWeight: "600" },
  selectorItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  selectorItemActive: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  selectorIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  selectorName: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  selectorOnline: { fontSize: 12, color: "#64748b", marginTop: 2 },
});
