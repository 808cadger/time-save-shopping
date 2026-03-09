import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { StoreInfo } from "../services/api";

interface Props {
  store: StoreInfo | null;
  loading?: boolean;
  onSelectStore?: () => void;
}

export default function StoreIdentityCard({ store, loading, onSelectStore }: Props) {
  function openWebsite() {
    if (store?.website) Linking.openURL(store.website);
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.loadingText}>📍 Identifying your store...</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <TouchableOpacity style={[styles.card, styles.cardUnknown]} onPress={onSelectStore}>
        <Text style={styles.unknownIcon}>🏪</Text>
        <View style={styles.unknownText}>
          <Text style={styles.unknownTitle}>Which store are you in?</Text>
          <Text style={styles.unknownSub}>Tap to select your store for online ordering</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, styles.cardFound, { borderLeftColor: store.color ?? "#22c55e" }]}>
      <View style={styles.storeLeft}>
        <View style={[styles.logoCircle, { backgroundColor: (store.color ?? "#22c55e") + "20" }]}>
          <Text style={styles.logoEmoji}>{store.logo_emoji ?? "🏪"}</Text>
        </View>
        <View style={styles.storeText}>
          <Text style={styles.storeName}>{store.display_name}</Text>
          {store.address ? (
            <Text style={styles.storeAddress} numberOfLines={1}>{store.address}</Text>
          ) : null}
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: store.has_online_order ? "#dcfce7" : "#fee2e2" }]}>
              <Text style={[styles.badgeText, { color: store.has_online_order ? "#15803d" : "#dc2626" }]}>
                {store.has_online_order ? "✓ Online ordering" : "✗ In-store only"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {store.website && (
        <TouchableOpacity style={styles.webBtn} onPress={openWebsite}>
          <Text style={styles.webBtnText}>🌐</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardUnknown: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    gap: 12,
  },
  cardFound: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    justifyContent: "space-between",
  },
  loadingText: { color: "#64748b", fontSize: 14, textAlign: "center" },
  unknownIcon: { fontSize: 28 },
  unknownText: { flex: 1 },
  unknownTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  unknownSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  arrow: { fontSize: 22, color: "#94a3b8" },
  storeLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logoEmoji: { fontSize: 22 },
  storeText: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  storeAddress: { fontSize: 12, color: "#64748b", marginTop: 1 },
  badges: { flexDirection: "row", marginTop: 5, gap: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  webBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  webBtnText: { fontSize: 18 },
});
