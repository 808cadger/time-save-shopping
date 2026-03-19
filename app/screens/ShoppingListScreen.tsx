import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatBar from "../components/ChatBar";
import { StoreInfo } from "../services/api";

interface ListItem {
  id: string;
  name: string;
  checked: boolean;
}

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
        <Text style={styles.headerTitle}>📝 My List</Text>
        <Text style={styles.headerSub}>{unchecked.length} items remaining</Text>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={newItem}
          onChangeText={setNewItem}
          placeholder="Add an item..."
          placeholderTextColor="#94a3b8"
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
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>Your list is empty</Text>
            <Text style={styles.emptySub}>Add items above, or ask the assistant below!</Text>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />

      {checked.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearChecked}>
          <Text style={styles.clearBtnText}>Clear {checked.length} checked item{checked.length > 1 ? "s" : ""}</Text>
        </TouchableOpacity>
      )}

      {/* Persistent chat bar */}
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
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  addRow: { flexDirection: "row", margin: 16, gap: 10 },
  addInput: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: "#1e293b",
    borderWidth: 1, borderColor: "#e2e8f0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  addBtn: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: "#22c55e",
    justifyContent: "center", alignItems: "center",
  },
  addBtnDisabled: { backgroundColor: "#94a3b8" },
  addBtnText: { color: "#fff", fontSize: 28, fontWeight: "300", lineHeight: 32 },
  listItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "#e2e8f0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1, gap: 10,
  },
  listItemChecked: { opacity: 0.6 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: "#22c55e",
    justifyContent: "center", alignItems: "center",
  },
  checkboxChecked: { backgroundColor: "#22c55e" },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  itemName: { flex: 1, fontSize: 16, color: "#1e293b" },
  itemNameChecked: { textDecorationLine: "line-through", color: "#94a3b8" },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#fee2e2", justifyContent: "center", alignItems: "center",
  },
  deleteBtnText: { color: "#ef4444", fontSize: 12, fontWeight: "700" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1e293b", marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#64748b", textAlign: "center" },
  clearBtn: {
    margin: 16, padding: 14,
    backgroundColor: "#fee2e2", borderRadius: 12, alignItems: "center",
  },
  clearBtnText: { color: "#ef4444", fontWeight: "600", fontSize: 14 },
});
