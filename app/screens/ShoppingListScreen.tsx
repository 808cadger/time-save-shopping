import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatBar from "../components/ChatBar";
import { StoreInfo } from "../services/api";

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
const ERROR_CRIMSON = "#b53333";

interface ListItem { id: string; name: string; checked: boolean; }

const STORAGE_KEY = "@timesave_list";
const STORE_KEY = "@timesave_store";

export default function ShoppingListScreen() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    loadList();
    AsyncStorage.getItem(STORE_KEY).then((json) => {
      if (json) setStoreInfo(JSON.parse(json));
    }).catch(() => {});
  }, []);

  async function loadList() {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) setItems(JSON.parse(json));
    } catch {}
  }

  async function saveList(updated: ListItem[]) {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }

  function addItem() {
    if (!newItem.trim()) return;
    const updated = [...items, { id: Date.now().toString(), name: newItem.trim(), checked: false }];
    setItems(updated);
    saveList(updated);
    setNewItem("");
  }

  function toggleItem(id: string) {
    const updated = items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i));
    setItems(updated);
    saveList(updated);
  }

  function removeItem(id: string) {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    saveList(updated);
  }

  function clearChecked() {
    Alert.alert("Clear checked items?", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear", style: "destructive",
        onPress: () => { const u = items.filter((i) => !i.checked); setItems(u); saveList(u); },
      },
    ]);
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My List</Text>
        <Text style={styles.headerSub}>
          {unchecked.length} item{unchecked.length !== 1 ? "s" : ""} remaining
        </Text>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={newItem}
          onChangeText={setNewItem}
          placeholder="Add an item..."
          placeholderTextColor={RING_WARM}
          returnKeyType="done"
          onSubmitEditing={addItem}
        />
        <TouchableOpacity
          style={[styles.addBtn, !newItem.trim() && styles.addBtnDisabled]}
          onPress={addItem}
          disabled={!newItem.trim()}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...unchecked, ...checked]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.listItem, item.checked && styles.listItemChecked]}>
            <TouchableOpacity
              style={[styles.checkbox, item.checked && styles.checkboxChecked]}
              onPress={() => toggleItem(item.id)}
            >
              {item.checked && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Text style={styles.emptyIcon}>📝</Text>
            </View>
            <Text style={styles.emptyTitle}>Your list is empty</Text>
            <Text style={styles.emptySub}>Add items above, or ask the assistant below!</Text>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />

      {checked.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearChecked}>
          <Text style={styles.clearBtnText}>
            Clear {checked.length} checked item{checked.length > 1 ? "s" : ""}
          </Text>
        </TouchableOpacity>
      )}

      <ChatBar
        storeInfo={storeInfo}
        placeholder={items.length > 0
          ? `Route ${unchecked.length} items — ask for directions`
          : "Ask the assistant to help build your list"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PARCHMENT },

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

  addRow: { flexDirection: "row", margin: 16, gap: 10 },
  addInput: {
    flex: 1,
    backgroundColor: IVORY,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: NEAR_BLACK,
    borderWidth: 1,
    borderColor: BORDER_CREAM,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: TERRACOTTA,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnDisabled: { backgroundColor: RING_WARM },
  addBtnText: { color: IVORY, fontSize: 28, fontWeight: "300", lineHeight: 32 },

  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: IVORY,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: BORDER_CREAM,
    gap: 12,
  },
  listItemChecked: { opacity: 0.6 },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: TERRACOTTA,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { backgroundColor: TERRACOTTA },
  checkmark: { color: IVORY, fontSize: 13, fontWeight: "700" },

  itemName: { flex: 1, fontSize: 16, color: NEAR_BLACK },
  itemNameChecked: { textDecorationLine: "line-through", color: STONE_GRAY },

  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: BORDER_WARM,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtnText: { color: OLIVE_GRAY, fontSize: 12, fontWeight: "700" },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: WARM_SAND,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_WARM,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: NEAR_BLACK, marginBottom: 6 },
  emptySub: { fontSize: 14, color: OLIVE_GRAY, textAlign: "center", lineHeight: 22 },

  clearBtn: {
    margin: 16,
    padding: 14,
    backgroundColor: WARM_SAND,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_WARM,
  },
  clearBtnText: { color: ERROR_CRIMSON, fontWeight: "600", fontSize: 14 },
});
