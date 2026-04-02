import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getInventory, StoreInfo } from "../services/api";
import ChatBar from "../components/ChatBar";

// Aloha from Pearl City! — Claude design tokens
const PARCHMENT    = "#f5f4ed";
const IVORY        = "#faf9f5";
const NEAR_BLACK   = "#141413";
const DARK_SURFACE = "#30302e";
const TERRACOTTA   = "#c96442";
const OLIVE_GRAY   = "#5e5d59";
const STONE_GRAY   = "#87867f";
const BORDER_CREAM = "#f0eee6";
const BORDER_WARM  = "#e8e6dc";
const RING_WARM    = "#d1cfc5";
const WARM_SAND    = "#e8e6dc";
const CHARCOAL_WARM = "#4d4c48";
const WARM_SILVER  = "#b0aea5";

interface AisleInfo { aisle: string; section: string; items: string[]; }

const STORE_KEY = "@timesave_store";

export default function StoreMapScreen() {
  const [aisles, setAisles] = useState<AisleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAisle, setSelectedAisle] = useState<string | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);

  useEffect(() => {
    loadMap();
    AsyncStorage.getItem(STORE_KEY).then((json) => {
      if (json) setStoreInfo(JSON.parse(json));
    }).catch(() => {});
  }, []);

  async function loadMap() {
    try {
      const data = await getInventory();
      const map: Record<string, AisleInfo> = {};
      for (const [item, info] of Object.entries<any>(data.inventory)) {
        const key = info.aisle;
        if (!map[key]) map[key] = { aisle: key, section: info.section, items: [] };
        if (info.in_stock) map[key].items.push(item);
      }
      setAisles(Object.values(map).sort((a, b) => Number(a.aisle) - Number(b.aisle)));
    } catch {
      setAisles([
        { aisle: "2",  section: "Produce",       items: ["apples", "bananas", "spinach"] },
        { aisle: "3",  section: "Meat & Seafood", items: ["chicken"] },
        { aisle: "5",  section: "Dairy & Eggs",   items: ["milk", "eggs", "yogurt", "cheese"] },
        { aisle: "6",  section: "Beverages",      items: ["orange juice"] },
        { aisle: "7",  section: "Bakery",         items: ["bread"] },
        { aisle: "8",  section: "Dry Goods",      items: ["pasta", "tomato sauce", "cereal"] },
        { aisle: "11", section: "Household",      items: ["toilet paper"] },
        { aisle: "12", section: "Personal Care",  items: ["soap", "shampoo"] },
      ]);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={TERRACOTTA} />
        <Text style={styles.loadingText}>Loading store map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Store Map</Text>
        <Text style={styles.headerSub}>Tap an aisle to see items</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.entranceRow}>
          <View style={styles.entranceDoor}>
            <Text style={styles.entranceText}>🚪 ENTRANCE</Text>
          </View>
        </View>

        <View style={styles.aisleGrid}>
          {aisles.map((aisle) => {
            const isSelected = selectedAisle === aisle.aisle;
            return (
              <TouchableOpacity
                key={aisle.aisle}
                style={[styles.aisleCard, isSelected && styles.aisleCardSelected]}
                onPress={() => setSelectedAisle(isSelected ? null : aisle.aisle)}
              >
                <View style={styles.aisleHeader}>
                  <View style={[styles.aisleBadge, isSelected && styles.aisleBadgeSelected]}>
                    <Text style={[styles.aisleBadgeText, isSelected && styles.aisleBadgeTextSelected]}>
                      {aisle.aisle}
                    </Text>
                  </View>
                  <Text style={[styles.aisleName, isSelected && styles.aisleNameSelected]}>
                    {aisle.section}
                  </Text>
                  <Text style={styles.aisleChevron}>{isSelected ? "▲" : "▼"}</Text>
                </View>
                {isSelected && (
                  <View style={styles.aisleItems}>
                    {aisle.items.slice(0, 6).map((item) => (
                      <View key={item} style={styles.itemChip}>
                        <Text style={styles.itemChipText}>{item}</Text>
                      </View>
                    ))}
                    {aisle.items.length > 6 && (
                      <Text style={styles.moreItems}>+{aisle.items.length - 6} more</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.checkoutRow}>
          <View style={styles.checkoutCard}>
            <Text style={styles.checkoutText}>🛒 CHECKOUT LANES</Text>
          </View>
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>

      <ChatBar storeInfo={storeInfo} placeholder="Ask about an aisle or item..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PARCHMENT },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: PARCHMENT },
  loadingText: { color: OLIVE_GRAY, fontSize: 15 },

  header: {
    backgroundColor: DARK_SURFACE,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "500",
    color: IVORY,
    letterSpacing: -0.3,
  },
  headerSub: { fontSize: 13, color: WARM_SILVER, marginTop: 3 },

  scroll: { padding: 16 },

  entranceRow: { alignItems: "center", marginBottom: 14 },
  entranceDoor: {
    backgroundColor: TERRACOTTA,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  entranceText: { color: IVORY, fontWeight: "600", fontSize: 12, letterSpacing: 0.8 },

  aisleGrid: { gap: 8, marginBottom: 14 },
  aisleCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_CREAM,
    backgroundColor: IVORY,
    padding: 14,
  },
  aisleCardSelected: {
    borderColor: TERRACOTTA,
    backgroundColor: WARM_SAND,
  },
  aisleHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  aisleBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: WARM_SAND,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_WARM,
  },
  aisleBadgeSelected: { backgroundColor: TERRACOTTA, borderColor: TERRACOTTA },
  aisleBadgeText: { fontWeight: "700", fontSize: 14, color: CHARCOAL_WARM },
  aisleBadgeTextSelected: { color: IVORY },
  aisleName: { flex: 1, fontSize: 15, fontWeight: "600", color: NEAR_BLACK },
  aisleNameSelected: { color: TERRACOTTA },
  aisleChevron: { fontSize: 11, color: STONE_GRAY },

  aisleItems: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  itemChip: {
    backgroundColor: IVORY,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BORDER_CREAM,
  },
  itemChipText: { fontSize: 12, color: CHARCOAL_WARM },
  moreItems: { fontSize: 12, color: STONE_GRAY, alignSelf: "center" },

  checkoutRow: { alignItems: "center" },
  checkoutCard: {
    backgroundColor: NEAR_BLACK,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  checkoutText: { color: IVORY, fontWeight: "600", fontSize: 12, letterSpacing: 0.8 },
});
