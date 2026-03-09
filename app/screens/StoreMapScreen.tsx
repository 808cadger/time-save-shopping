import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { getInventory } from "../services/api";
import ChatBar from "../components/ChatBar";

interface AisleInfo { aisle: string; section: string; items: string[]; }

const AISLE_COLORS: Record<string, string> = {
  "2": "#dcfce7", "3": "#fee2e2", "4": "#fde8d8", "5": "#dbeafe",
  "6": "#ede9fe", "7": "#fef3c7", "8": "#f1f5f9", "9": "#fef3c7",
  "10": "#e0f2fe", "11": "#f0fdf4", "12": "#fdf4ff",
};
const AISLE_BORDER: Record<string, string> = {
  "2": "#86efac", "3": "#fca5a5", "4": "#fdba74", "5": "#93c5fd",
  "6": "#c4b5fd", "7": "#fcd34d", "8": "#cbd5e1", "9": "#fcd34d",
  "10": "#7dd3fc", "11": "#6ee7b7", "12": "#e9d5ff",
};

export default function StoreMapScreen() {
  const [aisles, setAisles] = useState<AisleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAisle, setSelectedAisle] = useState<string | null>(null);

  useEffect(() => { loadMap(); }, []);

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
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading store map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏪 Store Map</Text>
        <Text style={styles.headerSub}>Tap an aisle to see items</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.entranceRow}>
          <View style={styles.entranceDoor}>
            <Text style={styles.entranceText}>🚪 ENTRANCE</Text>
          </View>
        </View>

        <View style={styles.aisleGrid}>
          {aisles.map((aisle) => (
            <TouchableOpacity
              key={aisle.aisle}
              style={[
                styles.aisleCard,
                { backgroundColor: AISLE_COLORS[aisle.aisle] ?? "#f8fafc", borderColor: AISLE_BORDER[aisle.aisle] ?? "#e2e8f0" },
                selectedAisle === aisle.aisle && styles.aisleCardSelected,
              ]}
              onPress={() => setSelectedAisle(selectedAisle === aisle.aisle ? null : aisle.aisle)}
            >
              <View style={styles.aisleHeader}>
                <View style={styles.aisleBadge}>
                  <Text style={styles.aisleBadgeText}>{aisle.aisle}</Text>
                </View>
                <Text style={styles.aisleName}>{aisle.section}</Text>
                <Text style={styles.aisleChevron}>{selectedAisle === aisle.aisle ? "▲" : "▼"}</Text>
              </View>
              {selectedAisle === aisle.aisle && (
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
          ))}
        </View>

        <View style={styles.checkoutRow}>
          <View style={styles.checkoutCard}>
            <Text style={styles.checkoutText}>🛒 CHECKOUT LANES</Text>
          </View>
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Persistent chat bar */}
      <ChatBar placeholder="Ask about an aisle or item..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#64748b", fontSize: 15 },
  header: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  scroll: { padding: 16 },
  entranceRow: { alignItems: "center", marginBottom: 12 },
  entranceDoor: {
    backgroundColor: "#15803d", borderRadius: 8,
    paddingHorizontal: 24, paddingVertical: 8,
  },
  entranceText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  aisleGrid: { gap: 8, marginBottom: 12 },
  aisleCard: {
    borderRadius: 14, borderWidth: 1.5, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  aisleCardSelected: { shadowOpacity: 0.12, elevation: 4 },
  aisleHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  aisleBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.08)", justifyContent: "center", alignItems: "center",
  },
  aisleBadgeText: { fontWeight: "800", fontSize: 15, color: "#1e293b" },
  aisleName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1e293b" },
  aisleChevron: { fontSize: 11, color: "#94a3b8" },
  aisleItems: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  itemChip: {
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
  },
  itemChipText: { fontSize: 12, color: "#334155" },
  moreItems: { fontSize: 12, color: "#64748b", alignSelf: "center" },
  checkoutRow: { alignItems: "center" },
  checkoutCard: {
    backgroundColor: "#1e40af", borderRadius: 8,
    paddingHorizontal: 24, paddingVertical: 8,
  },
  checkoutText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
