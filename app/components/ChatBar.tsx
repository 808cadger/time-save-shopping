/**
 * ChatBar — fully floating AI assistant overlay.
 *
 * Layout (all z-indexed over content):
 *   • Floating suggestion chips (top of overlay area, auto-dismiss after use)
 *   • Floating mini input bar (collapsible, bottom-right)
 *   • Full chat modal (slides up when needed)
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Platform, Modal, KeyboardAvoidingView,
  ActivityIndicator, Linking, Animated, ScrollView,
} from "react-native";
import { ChatMessage, StoreInfo, streamChat } from "../services/api";

interface OrderLink {
  item: string; url: string; store: string; has_online_order: boolean;
}
interface Message extends ChatMessage {
  id: string; isStreaming?: boolean; orderLinks?: OrderLink[];
}
interface Props {
  storeEntered?: boolean;
  storeInfo?: StoreInfo | null;
  contextSuggestions?: string[];   // page-specific suggestions injected by parent
  placeholder?: string;
}

const DEFAULT_SUGGESTIONS = [
  "Where is the milk? 🥛",
  "Plan my shopping route 🗺️",
  "Order bread online 🛒",
  "What's out of stock? 📦",
  "Show store map 🏪",
];

export default function ChatBar({ storeEntered = false, storeInfo = null, contextSuggestions, placeholder }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [barInput, setBarInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toolLabel, setToolLabel] = useState<string | null>(null);
  const [chipsVisible, setChipsVisible] = useState(true);
  const [barExpanded, setBarExpanded] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Fade-in for chips
  const chipsFade = useRef(new Animated.Value(0)).current;
  const barSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chipsFade, { toValue: 1, duration: 400, delay: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    Animated.spring(barSlide, {
      toValue: barExpanded ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [barExpanded]);

  const suggestions = contextSuggestions?.length ? contextSuggestions : DEFAULT_SUGGESTIONS;

  function openChat(prefill = "") {
    if (prefill) setChatInput(prefill);
    setIsOpen(true);
    setChipsVisible(false);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;
    setBarInput(""); setChatInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    const apiMessages: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: text.trim() },
    ];

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", isStreaming: true, orderLinks: [] }]);

    try {
      let fullText = "";
      const links: OrderLink[] = [];

      for await (const chunk of streamChat(apiMessages, storeEntered, storeInfo)) {
        if (chunk.type === "text" && chunk.content) {
          fullText += chunk.content;
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m));
        } else if (chunk.type === "tool_call") {
          setToolLabel(chunk.label ?? "⚙️ Working...");
        } else if (chunk.type === "order_link" && chunk.url) {
          links.push({ item: chunk.item ?? "", url: chunk.url, store: chunk.store ?? "", has_online_order: chunk.has_online_order ?? true });
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, orderLinks: [...links] } : m));
        } else if (chunk.type === "done") {
          setToolLabel(null);
        }
      }
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m));
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "⚠️ Couldn't connect. Make sure the backend is running.", isStreaming: false }
            : m
        )
      );
      setToolLabel(null);
    }
    setIsLoading(false);
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
        {!isUser && <View style={styles.botAvatar}><Text>🛒</Text></View>}
        <View style={styles.bubbleCol}>
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
            <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>
              {item.content || (item.isStreaming ? "●●●" : "")}
            </Text>
          </View>
          {!isUser && item.orderLinks && item.orderLinks.length > 0 && (
            <View style={styles.orderLinks}>
              {item.orderLinks.map((link) => (
                <TouchableOpacity
                  key={link.item + link.url}
                  style={[styles.orderBtn, !link.has_online_order && styles.orderBtnOff]}
                  onPress={() => link.has_online_order && Linking.openURL(link.url)}
                  activeOpacity={link.has_online_order ? 0.75 : 1}
                >
                  <Text style={styles.orderBtnIcon}>🛒</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderBtnTitle} numberOfLines={1}>
                      {link.has_online_order ? `Order ${link.item}` : `${link.item} — in-store only`}
                    </Text>
                    <Text style={styles.orderBtnStore}>{link.store}</Text>
                  </View>
                  {link.has_online_order && <Text style={styles.orderBtnArrow}>→</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      {/* ── Left side rail: suggestion chips (vertical) ── */}
      {chipsVisible && (
        <Animated.View style={[styles.chipsWrapper, { opacity: chipsFade }]} pointerEvents="box-none">
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.chip}
                onPress={() => openChat(s.replace(/[🥛🗺️🛒📦🏪]/gu, "").trim())}
                activeOpacity={0.8}
              >
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.chipDismiss} onPress={() => setChipsVisible(false)}>
              <Text style={styles.chipDismissText}>✕</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}

      {/* ── Right side rail: FAB + Ask AI ── */}
      <View style={styles.floatingBar} pointerEvents="box-none">
        {/* "Ask AI" label above FAB */}
        {!barExpanded && (
          <TouchableOpacity style={styles.openChatBtn} onPress={() => openChat()}>
            <Text style={styles.openChatText}>Ask{"\n"}AI</Text>
          </TouchableOpacity>
        )}

        <Animated.View
          style={[
            styles.barContainer,
            {
              width: barSlide.interpolate({ inputRange: [0, 1], outputRange: [52, 220] }),
            },
          ]}
        >
          {barExpanded ? (
            <View style={styles.barExpanded}>
              <TextInput
                style={styles.barTextInput}
                value={barInput}
                onChangeText={setBarInput}
                placeholder="Ask anything..."
                placeholderTextColor="#94a3b8"
                autoFocus
                returnKeyType="send"
                onSubmitEditing={() => { if (barInput.trim()) { openChat(barInput); setBarExpanded(false); } }}
                onBlur={() => { if (!barInput.trim()) setBarExpanded(false); }}
              />
              <TouchableOpacity
                style={[styles.barSend, !barInput.trim() && styles.barSendOff]}
                onPress={() => { if (barInput.trim()) { openChat(barInput); setBarExpanded(false); } }}
              >
                <Text style={styles.barSendText}>↑</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.barFab} onPress={() => setBarExpanded(true)} activeOpacity={0.85}>
              <Text style={styles.barFabIcon}>🛒</Text>
              {storeEntered && <View style={styles.barFabDot} />}
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      {/* ── Full chat modal ── */}
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Text style={{ fontSize: 26 }}>🛒</Text>
              <View>
                <Text style={styles.modalTitle}>time~save~shopping</Text>
                <Text style={styles.modalSub}>
                  {storeInfo
                    ? `${storeInfo.logo_emoji ?? "🏪"} ${storeInfo.display_name}`
                    : storeEntered ? "📍 You're in the store" : "AI Shopping Assistant"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => { setIsOpen(false); setChipsVisible(true); }} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {toolLabel && (
            <View style={styles.toolBanner}>
              <ActivityIndicator size="small" color="#22c55e" />
              <Text style={styles.toolBannerText}>{toolLabel}</Text>
            </View>
          )}

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.msgList, { flexGrow: 1 }]}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ fontSize: 52, marginBottom: 12 }}>🛒</Text>
                <Text style={styles.emptyTitle}>What are you looking for?</Text>
                <Text style={styles.emptySub}>I can find items, plan your route, or open the ordering page instantly.</Text>
                <View style={styles.emptySuggestions}>
                  {["Where is the milk?", "Plan my route for 5 items", "Order coffee from Walmart"].map((s) => (
                    <TouchableOpacity key={s} style={styles.emptySugg} onPress={() => sendMessage(s)}>
                      <Text style={styles.emptySuggText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
          />

          <View style={styles.modalInputRow}>
            <TextInput
              style={styles.modalInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Ask anything..."
              placeholderTextColor="#94a3b8"
              multiline maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(chatInput)}
              editable={!isLoading}
              autoFocus={!chatInput}
            />
            <TouchableOpacity
              style={[styles.modalSend, (!chatInput.trim() || isLoading) && styles.modalSendOff]}
              onPress={() => sendMessage(chatInput)}
              disabled={!chatInput.trim() || isLoading}
            >
              {isLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.modalSendText}>↑</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Left side rail: suggestion chips ──
  chipsWrapper: {
    position: "absolute",
    left: 8,
    top: "30%",
    zIndex: 100,
    maxHeight: "45%",
    pointerEvents: "box-none",
  },
  chipsScroll: { gap: 6, alignItems: "flex-start" },
  chip: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#86efac",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    maxWidth: 140,
  },
  chipText: { fontSize: 11, color: "#15803d", fontWeight: "600" },
  chipDismiss: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#e2e8f0",
    marginTop: 2,
  },
  chipDismissText: { fontSize: 11, color: "#94a3b8", fontWeight: "700" },

  // ── Right side rail: FAB + Ask AI ──
  floatingBar: {
    position: "absolute",
    right: 8,
    top: "40%",
    zIndex: 101,
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    pointerEvents: "box-none",
  },
  barContainer: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#22c55e",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
  },
  barFab: {
    width: 52, height: 52,
    borderRadius: 26,
    justifyContent: "center", alignItems: "center",
  },
  barFabIcon: { fontSize: 24 },
  barFabDot: {
    position: "absolute", top: 8, right: 8,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#ef4444", borderWidth: 2, borderColor: "#22c55e",
  },
  barExpanded: {
    flex: 1, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, gap: 8,
  },
  barTextInput: {
    flex: 1, fontSize: 13, color: "#fff",
    paddingVertical: 4,
  },
  barSend: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center", alignItems: "center",
  },
  barSendOff: { opacity: 0.4 },
  barSendText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  openChatBtn: {
    backgroundColor: "#22c55e",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  openChatText: { fontSize: 11, color: "#fff", fontWeight: "700", textAlign: "center", lineHeight: 15 },

  // ── Full modal ──
  modal: { flex: 1, backgroundColor: "#f8fafc" },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 16, paddingTop: Platform.OS === "ios" ? 12 : 16, paddingBottom: 14,
  },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  modalSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 1 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  toolBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f0fdf4", borderBottomWidth: 1, borderBottomColor: "#bbf7d0",
    paddingHorizontal: 16, paddingVertical: 8,
  },
  toolBannerText: { color: "#15803d", fontSize: 13, fontStyle: "italic" },
  msgList: { padding: 16 },
  msgRow: { flexDirection: "row", marginBottom: 14, alignItems: "flex-start" },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowBot: { justifyContent: "flex-start" },
  botAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#dcfce7",
    justifyContent: "center", alignItems: "center",
    marginRight: 8, marginTop: 2,
  },
  bubbleCol: { maxWidth: "78%", gap: 6 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: "#22c55e", borderBottomRightRadius: 4, alignSelf: "flex-end" },
  bubbleBot: {
    backgroundColor: "#fff", borderBottomLeftRadius: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: "#fff" },
  bubbleTextBot: { color: "#1e293b" },
  orderLinks: { gap: 6 },
  orderBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#22c55e",
    borderRadius: 12, padding: 10, gap: 8,
  },
  orderBtnOff: { borderColor: "#e2e8f0", opacity: 0.6 },
  orderBtnIcon: { fontSize: 18 },
  orderBtnTitle: { fontSize: 13, fontWeight: "700", color: "#15803d" },
  orderBtnStore: { fontSize: 11, color: "#64748b", marginTop: 1 },
  orderBtnArrow: { fontSize: 16, color: "#22c55e", fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 6, textAlign: "center" },
  emptySub: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 21, marginBottom: 20 },
  emptySuggestions: { gap: 8, width: "100%" },
  emptySugg: {
    backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#86efac",
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
  },
  emptySuggText: { color: "#15803d", fontSize: 14, textAlign: "center" },
  modalInputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0",
  },
  modalInput: {
    flex: 1, backgroundColor: "#f1f5f9", borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: "#1e293b", maxHeight: 120,
  },
  modalSend: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#22c55e", justifyContent: "center", alignItems: "center",
  },
  modalSendOff: { backgroundColor: "#94a3b8" },
  modalSendText: { color: "#fff", fontSize: 20, fontWeight: "700" },
});
