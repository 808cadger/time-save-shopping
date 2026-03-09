import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Linking,
} from "react-native";
import { ChatMessage, StoreInfo, streamChat } from "../services/api";

interface OrderLink {
  item: string;
  url: string;
  store: string;
  has_online_order: boolean;
}

interface Message extends ChatMessage {
  id: string;
  isStreaming?: boolean;
  orderLinks?: OrderLink[];
}

interface Props {
  storeEntered?: boolean;
  storeInfo?: StoreInfo | null;
}

export default function ChatBot({ storeEntered = false, storeInfo = null }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolLabel, setActiveToolLabel] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (storeEntered && !isOpen) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [storeEntered, isOpen, pulseAnim]);

  useEffect(() => {
    if (storeEntered && messages.length === 0) {
      setIsOpen(true);
      const storeName = storeInfo?.display_name ? ` at ${storeInfo.display_name}` : "";
      sendMessage(`I just walked into the store${storeName}. What should I know?`, true);
    }
  }, [storeEntered]);

  const sendMessage = useCallback(async (text: string, silent = false) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };

    const apiMessages: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: text.trim() },
    ];

    if (!silent) setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", isStreaming: true, orderLinks: [] },
    ]);

    try {
      let fullText = "";
      const collectedLinks: OrderLink[] = [];

      for await (const chunk of streamChat(apiMessages, storeEntered, storeInfo)) {
        if (chunk.type === "text" && chunk.content) {
          fullText += chunk.content;
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m)
          );
        } else if (chunk.type === "tool_call") {
          setActiveToolLabel(chunk.label ?? "⚙️ Working...");
        } else if (chunk.type === "order_link" && chunk.url) {
          collectedLinks.push({
            item: chunk.item ?? "",
            url: chunk.url,
            store: chunk.store ?? "",
            has_online_order: chunk.has_online_order ?? true,
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, orderLinks: [...collectedLinks] } : m
            )
          );
        } else if (chunk.type === "done") {
          setActiveToolLabel(null);
        }
      }

      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m)
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "⚠️ Couldn't connect. Make sure the backend is running.", isStreaming: false }
            : m
        )
      );
      setActiveToolLabel(null);
    }
    setIsLoading(false);
  }, [messages, isLoading, storeEntered, storeInfo]);

  function openOrderLink(url: string) {
    Linking.openURL(url).catch(() => {
      Linking.openURL(url.replace(/^[a-z]+:\/\//, "https://"));
    });
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Text style={styles.botAvatarText}>🛒</Text>
          </View>
        )}
        <View style={styles.bubbleColumn}>
          <View style={[styles.bubbleContent, isUser ? styles.userContent : styles.assistantContent]}>
            <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
              {item.content || (item.isStreaming ? "●●●" : "")}
            </Text>
          </View>

          {/* Order link buttons below assistant message */}
          {!isUser && item.orderLinks && item.orderLinks.length > 0 && (
            <View style={styles.orderLinksContainer}>
              {item.orderLinks.map((link) => (
                <TouchableOpacity
                  key={link.item + link.url}
                  style={[styles.orderBtn, !link.has_online_order && styles.orderBtnDisabled]}
                  onPress={() => link.has_online_order && openOrderLink(link.url)}
                  activeOpacity={link.has_online_order ? 0.75 : 1}
                >
                  <Text style={styles.orderBtnIcon}>🛒</Text>
                  <View style={styles.orderBtnText}>
                    <Text style={styles.orderBtnTitle} numberOfLines={1}>
                      {link.has_online_order ? `Order ${link.item}` : `${link.item} — in-store only`}
                    </Text>
                    <Text style={styles.orderBtnStore} numberOfLines={1}>{link.store}</Text>
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

  const SUGGESTIONS = [
    "Where is the milk?",
    "Find eggs, bread, and apples",
    "What's out of stock?",
    "Order orange juice online",
  ];

  return (
    <>
      {/* Floating button — bottom-right corner on every screen */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={[styles.fab, storeEntered && styles.fabActive]}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>🛒</Text>
          {storeEntered && <View style={styles.fabBadge} />}
        </TouchableOpacity>
      </Animated.View>

      {/* Chat modal (slides up) */}
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIcon}>🛒</Text>
              <View>
                <Text style={styles.headerTitle}>time~save~shopping</Text>
                <Text style={styles.headerSubtitle}>
                  {storeInfo
                    ? `${storeInfo.logo_emoji ?? "🏪"} ${storeInfo.display_name}`
                    : storeEntered
                    ? "📍 You're in the store"
                    : "Ask me anything"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Active tool indicator */}
          {activeToolLabel && (
            <View style={styles.toolCallBanner}>
              <ActivityIndicator size="small" color="#22c55e" />
              <Text style={styles.toolCallText}>{activeToolLabel}</Text>
            </View>
          )}

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatIcon}>🛒</Text>
                <Text style={styles.emptyChatTitle}>Hi! I'm your time~save~shopping assistant</Text>
                <Text style={styles.emptyChatText}>
                  I can find items, plan your route, and get you ordering links for any grocery store.
                </Text>
                {storeInfo && (
                  <View style={styles.storeChip}>
                    <Text style={styles.storeChipText}>
                      {storeInfo.logo_emoji} Shopping at {storeInfo.display_name}
                    </Text>
                  </View>
                )}
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => sendMessage(s)}>
                      <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
          />

          {/* Input bar */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about any item..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
            >
              {isLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.sendBtnText}>↑</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: { position: "absolute", bottom: 24, right: 24, zIndex: 999 },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#22c55e",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
  },
  fabActive: { backgroundColor: "#16a34a" },
  fabIcon: { fontSize: 26 },
  fabBadge: {
    position: "absolute", top: 8, right: 8,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: "#ef4444", borderWidth: 2, borderColor: "#fff",
  },
  modalContainer: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 16,
    paddingBottom: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { fontSize: 28 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 1 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  toolCallBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f0fdf4", borderBottomWidth: 1, borderBottomColor: "#bbf7d0",
    paddingHorizontal: 16, paddingVertical: 8,
  },
  toolCallText: { color: "#15803d", fontSize: 13, fontStyle: "italic" },
  messageList: { padding: 16, flexGrow: 1 },
  messageBubble: { flexDirection: "row", marginBottom: 14, alignItems: "flex-start" },
  userBubble: { justifyContent: "flex-end" },
  assistantBubble: { justifyContent: "flex-start" },
  botAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#dcfce7",
    justifyContent: "center", alignItems: "center",
    marginRight: 8, marginTop: 2,
  },
  botAvatarText: { fontSize: 16 },
  bubbleColumn: { maxWidth: "78%", gap: 6 },
  bubbleContent: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userContent: { backgroundColor: "#22c55e", borderBottomRightRadius: 4, alignSelf: "flex-end" },
  assistantContent: {
    backgroundColor: "#fff", borderBottomLeftRadius: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: "#fff" },
  assistantText: { color: "#1e293b" },

  orderLinksContainer: { gap: 8 },
  orderBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5, borderColor: "#22c55e",
    borderRadius: 12, padding: 10, gap: 8,
    shadowColor: "#22c55e", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
  },
  orderBtnDisabled: { borderColor: "#e2e8f0", opacity: 0.6 },
  orderBtnIcon: { fontSize: 18 },
  orderBtnText: { flex: 1 },
  orderBtnTitle: { fontSize: 13, fontWeight: "700", color: "#15803d" },
  orderBtnStore: { fontSize: 11, color: "#64748b", marginTop: 1 },
  orderBtnArrow: { fontSize: 16, color: "#22c55e", fontWeight: "700" },

  emptyChat: { flex: 1, alignItems: "center", paddingTop: 40, paddingHorizontal: 24 },
  emptyChatIcon: { fontSize: 52, marginBottom: 12 },
  emptyChatTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 8, textAlign: "center" },
  emptyChatText: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 21, marginBottom: 16 },
  storeChip: {
    backgroundColor: "#f0fdf4", borderRadius: 20, borderWidth: 1, borderColor: "#86efac",
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16,
  },
  storeChipText: { fontSize: 13, color: "#15803d", fontWeight: "600" },
  suggestions: { gap: 8, width: "100%" },
  suggestionChip: {
    backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#86efac",
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
  },
  suggestionText: { color: "#15803d", fontSize: 14, textAlign: "center" },
  inputContainer: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0",
  },
  textInput: {
    flex: 1, backgroundColor: "#f1f5f9", borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: "#1e293b", maxHeight: 120, lineHeight: 22,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#22c55e", justifyContent: "center", alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#94a3b8" },
  sendBtnText: { color: "#fff", fontSize: 20, fontWeight: "700" },
});
