import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { StoreInfo } from "../services/api";

// Aloha from Pearl City! — Claude design tokens
const IVORY        = "#faf9f5";
const NEAR_BLACK   = "#141413";
const TERRACOTTA   = "#c96442";
const OLIVE_GRAY   = "#5e5d59";
const STONE_GRAY   = "#87867f";
const BORDER_CREAM = "#f0eee6";
const BORDER_WARM  = "#e8e6dc";
const WARM_SAND    = "#e8e6dc";
const CHARCOAL_WARM = "#4d4c48";
const ERROR_CRIMSON = "#b53333";

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
        <View style={styles.unknownIconWrapper}>
          <Text style={styles.unknownIcon}>🏪</Text>
        </View>
        <View style={styles.unknownText}>
          <Text style={styles.unknownTitle}>Which store are you in?</Text>
          <Text style={styles.unknownSub}>Tap to select your store for online ordering</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, styles.cardFound, { borderLeftColor: TERRACOTTA }]}>
      <View style={styles.storeLeft}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>{store.logo_emoji ?? "🏪"}</Text>
        </View>
        <View style={styles.storeText}>
          <Text style={styles.storeName}>{store.display_name}</Text>
          {store.address ? (
            <Text style={styles.storeAddress} numberOfLines={1}>{store.address}</Text>
          ) : null}
          <View style={styles.badges}>
            <View style={[
              styles.badge,
              { backgroundColor: store.has_online_order ? WARM_SAND : BORDER_CREAM }
            ]}>
              <Text style={[
                styles.badgeText,
                { color: store.has_online_order ? TERRACOTTA : ERROR_CRIMSON }
              ]}>
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
    marginTop: 14,
    borderRadius: 12,
    padding: 14,
    backgroundColor: IVORY,
    borderWidth: 1,
    borderColor: BORDER_CREAM,
  },
  cardUnknown: {
    flexDirection: "row",
    alignItems: "center",
    borderStyle: "dashed",
    borderColor: BORDER_WARM,
    gap: 12,
  },
  cardFound: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 3,
    justifyContent: "space-between",
  },
  loadingText: { color: STONE_GRAY, fontSize: 14, textAlign: "center" },

  unknownIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: WARM_SAND,
    justifyContent: "center",
    alignItems: "center",
  },
  unknownIcon: { fontSize: 22 },
  unknownText: { flex: 1 },
  unknownTitle: { fontSize: 15, fontWeight: "600", color: NEAR_BLACK },
  unknownSub: { fontSize: 12, color: OLIVE_GRAY, marginTop: 2 },
  arrow: { fontSize: 22, color: BORDER_WARM },

  storeLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: WARM_SAND,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_WARM,
  },
  logoEmoji: { fontSize: 22 },
  storeText: { flex: 1 },
  storeName: { fontSize: 15, fontWeight: "600", color: NEAR_BLACK },
  storeAddress: { fontSize: 12, color: OLIVE_GRAY, marginTop: 1 },
  badges: { flexDirection: "row", marginTop: 5, gap: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  webBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: WARM_SAND,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_WARM,
  },
  webBtnText: { fontSize: 16 },
});
