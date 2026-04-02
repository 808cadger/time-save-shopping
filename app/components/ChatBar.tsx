/**
 * ChatBar — full-screen AI assistant with a draggable, animated FAB.
 * Aloha from Pearl City! — Claude design system applied throughout.
 */
import React, {
  useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle,
} from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Platform, Modal, KeyboardAvoidingView,
  ActivityIndicator, Linking, Animated, PanResponder,
  Dimensions, StatusBar, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatMessage, StoreInfo, streamChat } from "../services/api";

// Claude design tokens
const PARCHMENT    = "#f5f4ed";
const IVORY        = "#faf9f5";
const NEAR_BLACK   = "#141413";
const DARK_SURFACE = "#30302e";
const TERRACOTTA   = "#c96442";
const CORAL        = "#d97757";
const OLIVE_GRAY   = "#5e5d59";
const STONE_GRAY   = "#87867f";
const BORDER_CREAM = "#f0eee6";
const BORDER_WARM  = "#e8e6dc";
const RING_WARM    = "#d1cfc5";
const WARM_SAND    = "#e8e6dc";
const CHARCOAL_WARM = "#4d4c48";
const WARM_SILVER  = "#b0aea5";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface OrderLink {
  item: string; url: string; store: string; has_online_order: boolean;
}
interface Message extends ChatMessage {
  id: string;
  isStreaming?: boolean;
  orderLinks?: OrderLink[];
  timestamp: Date;
  anim: Animated.Value;
}
interface Props {
  storeEntered?: boolean;
  storeInfo?: StoreInfo | null;
  placeholder?: string;
}
export interface ChatBarRef {
  openWithQuery: (query: string) => void;
}

const FAB_SIZE = 62;
const DEFAULT_X = SCREEN_W - FAB_SIZE - 20;
const DEFAULT_Y = SCREEN_H - FAB_SIZE - (Platform.OS === "ios" ? 130 : 110);

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const SUGGESTIONS_DEFAULT = [
  { icon: "🔍", text: "Where is the milk?" },
  { icon: "🗺️", text: "Plan my route for my list" },
  { icon: "🛒", text: "Order coffee online" },
  { icon: "📦", text: "What's out of stock?" },
];
const SUGGESTIONS_IN_STORE = [
  { icon: "📍", text: "I just walked in — what's first?" },
  { icon: "⚡", text: "Fastest route for eggs, milk, bread" },
  { icon: "💰", text: "Cheapest item alternatives?" },
  { icon: "🔄", text: "Check nearby stores for stock" },
];

// Animated typing dots — warm toned
function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(450),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);
  return (
    <View style={td.row}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[td.dot, { transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
}
const td = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: RING_WARM },
});

const ChatBarInner = forwardRef<ChatBarRef, Props>(
  ({ storeEntered = false, storeInfo = null, placeholder }, ref) => {
    const insets = useSafeAreaInsets();
    const [isOpen, setIsOpen] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [toolLabel, setToolLabel] = useState<string | null>(null);
    const [unread, setUnread] = useState(0);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);

    // FAB animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const ringAnim = useRef(new Animated.Value(0)).current;
    const sendScale = useRef(new Animated.Value(1)).current;

    // Draggable FAB
    const fabPos = useRef(new Animated.ValueXY({ x: DEFAULT_X, y: DEFAULT_Y })).current;
    const dragOffset = useRef({ x: DEFAULT_X, y: DEFAULT_Y });
    const isDragging = useRef(false);
    const dragStartTime = useRef(0);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
        onPanResponderGrant: () => {
          isDragging.current = false;
          dragStartTime.current = Date.now();
          fabPos.setOffset({ x: dragOffset.current.x, y: dragOffset.current.y });
          fabPos.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: (_, gs) => {
          isDragging.current = Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5;
          fabPos.setValue({ x: gs.dx, y: gs.dy });
        },
        onPanResponderRelease: (_, gs) => {
          fabPos.flattenOffset();
          const newX = Math.max(8, Math.min(SCREEN_W - FAB_SIZE - 8, dragOffset.current.x + gs.dx));
          const newY = Math.max(insets.top + 8, Math.min(SCREEN_H - FAB_SIZE - 60, dragOffset.current.y + gs.dy));
          dragOffset.current = { x: newX, y: newY };
          Animated.spring(fabPos, { toValue: { x: newX, y: newY }, useNativeDriver: false, friction: 7, tension: 40 }).start();
          const isTap = !isDragging.current || (Math.abs(gs.dx) < 8 && Math.abs(gs.dy) < 8 && Date.now() - dragStartTime.current < 300);
          if (isTap) openChat();
          isDragging.current = false;
        },
      })
    ).current;

    // Pulse & ring animation when in store
    useEffect(() => {
      if (storeEntered && !isOpen) {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
          ])
        );
        const ring = Animated.loop(
          Animated.sequence([
            Animated.timing(ringAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
            Animated.delay(600),
            Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        );
        pulse.start();
        ring.start();
        return () => { pulse.stop(); ring.stop(); };
      }
    }, [storeEntered, isOpen]);

    // Auto-open and greet when entering store
    useEffect(() => {
      if (storeEntered && messages.length === 0) {
        setIsOpen(true);
        const storeName = storeInfo?.display_name ? ` at ${storeInfo.display_name}` : "";
        sendMessage(`I just walked into the store${storeName}. What should I know?`, true);
      }
    }, [storeEntered]);

    useImperativeHandle(ref, () => ({
      openWithQuery: (query: string) => openChat(query),
    }));

    function openChat(prefill = "") {
      if (prefill) setChatInput(prefill);
      setIsOpen(true);
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 400);
    }

    const sendMessage = useCallback(async (text: string, silent = false) => {
      if (!text.trim() || isLoading) return;
      setChatInput("");

      Animated.sequence([
        Animated.timing(sendScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
        Animated.spring(sendScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      ]).start();

      const msgAnim = new Animated.Value(0);
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
        anim: msgAnim,
      };
      const apiMessages: ChatMessage[] = [
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: text.trim() },
      ];

      if (!silent) {
        setMessages((prev) => [...prev, userMsg]);
        Animated.spring(msgAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
      }
      setIsLoading(true);

      const botAnim = new Animated.Value(0);
      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", isStreaming: true, orderLinks: [], timestamp: new Date(), anim: botAnim },
      ]);

      try {
        let fullText = "";
        const links: OrderLink[] = [];

        for await (const chunk of streamChat(apiMessages, storeEntered, storeInfo)) {
          if (chunk.type === "text" && chunk.content) {
            if (!fullText) Animated.spring(botAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
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
        if (!isOpen) setUnread((n) => n + 1);
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
    }, [messages, isLoading, storeEntered, storeInfo, isOpen]);

    const renderMessage = ({ item }: { item: Message }) => {
      const isUser = item.role === "user";
      return (
        <Animated.View
          style={[
            styles.msgRow,
            isUser ? styles.msgRowUser : styles.msgRowBot,
            {
              opacity: item.anim,
              transform: [{
                translateY: item.anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
              }],
            },
          ]}
        >
          {!isUser && (
            <View style={styles.botAvatar}>
              <Text style={styles.botAvatarText}>🛒</Text>
            </View>
          )}
          <View style={[styles.bubbleCol, isUser && styles.bubbleColUser]}>
            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
              {item.isStreaming && !item.content ? (
                <TypingDots />
              ) : (
                <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>
                  {item.content}
                </Text>
              )}
              {item.isStreaming && item.content.length > 0 && (
                <View style={styles.streamingDot} />
              )}
            </View>
            <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
              {formatTime(item.timestamp)}
            </Text>

            {!isUser && item.orderLinks && item.orderLinks.length > 0 && (
              <View style={styles.orderLinks}>
                {item.orderLinks.map((link) => (
                  <TouchableOpacity
                    key={link.item + link.url}
                    style={[styles.orderBtn, !link.has_online_order && styles.orderBtnOff]}
                    onPress={() => link.has_online_order && Linking.openURL(link.url)}
                    activeOpacity={link.has_online_order ? 0.7 : 1}
                  >
                    <View style={[styles.orderBtnIconWrapper, !link.has_online_order && styles.orderBtnIconOff]}>
                      <Text style={styles.orderBtnIcon}>🛒</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderBtnTitle} numberOfLines={1}>
                        {link.has_online_order ? `Order ${link.item}` : `${link.item} — in-store only`}
                      </Text>
                      <Text style={styles.orderBtnStore}>{link.store}</Text>
                    </View>
                    {link.has_online_order && (
                      <View style={styles.orderBtnArrowWrapper}>
                        <Ionicons name="arrow-forward" size={14} color={IVORY} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      );
    };

    const suggestions = storeEntered ? SUGGESTIONS_IN_STORE : SUGGESTIONS_DEFAULT;

    const ringScale = ringAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.6, 2.0] });
    const ringOpacity = ringAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 0.25, 0] });

    return (
      <>
        {/* ── Draggable FAB — Terracotta ── */}
        <Animated.View
          style={[styles.fabWrapper, { left: fabPos.x, top: fabPos.y }]}
          {...panResponder.panHandlers}
        >
          {storeEntered && !isOpen && (
            <Animated.View
              style={[
                styles.fabRing,
                { transform: [{ scale: ringScale }], opacity: ringOpacity },
              ]}
              pointerEvents="none"
            />
          )}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={[styles.fab, storeEntered && styles.fabActive]}>
              <Ionicons name="sparkles" size={27} color={IVORY} />
              {storeEntered && <View style={styles.fabPulseDot} />}
            </View>
          </Animated.View>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          )}
        </Animated.View>

        {/* ── Full-screen chat modal ── */}
        <Modal
          visible={isOpen}
          animationType="slide"
          presentationStyle="fullScreen"
          statusBarTranslucent
          onRequestClose={() => setIsOpen(false)}
        >
          <StatusBar barStyle="light-content" backgroundColor={DARK_SURFACE} />
          <KeyboardAvoidingView
            style={styles.modal}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {/* Header — Dark Surface */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
              <View style={styles.headerLeft}>
                <View style={styles.headerAvatar}>
                  <Ionicons name="sparkles" size={22} color={IVORY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerTitle}>time~save~shopping</Text>
                  <Text style={styles.headerSub} numberOfLines={1}>
                    {storeInfo
                      ? `${storeInfo.logo_emoji ?? "🏪"} ${storeInfo.display_name}`
                      : storeEntered
                      ? "📍 You're in the store"
                      : "AI Shopping Assistant"}
                  </Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                {messages.length > 0 && (
                  <TouchableOpacity style={styles.clearBtn} onPress={() => setMessages([])}>
                    <Ionicons name="trash-outline" size={18} color={WARM_SILVER} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.closeBtn} onPress={() => setIsOpen(false)}>
                  <Ionicons name="close" size={22} color={IVORY} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Tool-use banner */}
            {toolLabel && (
              <View style={styles.toolBanner}>
                <ActivityIndicator size="small" color={TERRACOTTA} />
                <Text style={styles.toolBannerText}>{toolLabel}</Text>
              </View>
            )}

            {/* Message list */}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.msgList, messages.length === 0 && styles.msgListEmpty]}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onScroll={({ nativeEvent }) => {
                const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
                const distFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
                setShowScrollBtn(distFromBottom > 120);
              }}
              scrollEventThrottle={100}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <View style={styles.emptyIconWrapper}>
                    <Text style={styles.emptyIcon}>🛒</Text>
                  </View>
                  <Text style={styles.emptyTitle}>
                    {storeEntered ? "You're in the store!" : "What can I help you find?"}
                  </Text>
                  <Text style={styles.emptySub}>
                    {storeEntered
                      ? "I can guide you aisle-by-aisle, find any item, or open online ordering instantly."
                      : "Ask me to find items, plan your route, or order online from any grocery store."}
                  </Text>
                  {storeInfo && (
                    <View style={styles.storeChip}>
                      <Text style={styles.storeChipText}>
                        {storeInfo.logo_emoji} {storeInfo.display_name}
                      </Text>
                    </View>
                  )}
                  <ScrollView horizontal={false} showsVerticalScrollIndicator={false} style={styles.suggestionsScroll}>
                    {suggestions.map((s) => (
                      <TouchableOpacity
                        key={s.text}
                        style={styles.suggChip}
                        onPress={() => sendMessage(s.text)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.suggIcon}>{s.icon}</Text>
                        <Text style={styles.suggText}>{s.text}</Text>
                        <Ionicons name="arrow-forward-circle" size={18} color={TERRACOTTA} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              }
            />

            {/* Scroll-to-bottom button */}
            {showScrollBtn && (
              <TouchableOpacity
                style={styles.scrollBtn}
                onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
              >
                <Ionicons name="chevron-down" size={20} color={IVORY} />
              </TouchableOpacity>
            )}

            {/* Input bar — Ivory surface */}
            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder={placeholder ?? "Ask about any item..."}
                placeholderTextColor={RING_WARM}
                multiline
                maxLength={500}
                returnKeyType="send"
                blurOnSubmit
                onSubmitEditing={() => sendMessage(chatInput)}
                editable={!isLoading}
              />
              <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (!chatInput.trim() || isLoading) && styles.sendBtnOff,
                  ]}
                  onPress={() => sendMessage(chatInput)}
                  disabled={!chatInput.trim() || isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading
                    ? <ActivityIndicator size="small" color={IVORY} />
                    : <Ionicons name="arrow-up" size={22} color={IVORY} />
                  }
                </TouchableOpacity>
              </Animated.View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </>
    );
  }
);

ChatBarInner.displayName = "ChatBar";
export default ChatBarInner;

const styles = StyleSheet.create({
  // ── FAB — Terracotta ──
  fabWrapper: {
    position: "absolute",
    zIndex: 300,
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  fabRing: {
    position: "absolute",
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 2,
    borderColor: TERRACOTTA,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: TERRACOTTA,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: NEAR_BLACK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 14,
  },
  fabActive: { backgroundColor: "#b05538" },
  fabPulseDot: {
    position: "absolute",
    top: 9, right: 9,
    width: 11, height: 11,
    borderRadius: 6,
    backgroundColor: CORAL,
    borderWidth: 2,
    borderColor: IVORY,
  },
  unreadBadge: {
    position: "absolute",
    top: -4, right: -4,
    minWidth: 20, height: 20,
    borderRadius: 10,
    backgroundColor: NEAR_BLACK,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: IVORY,
    paddingHorizontal: 3,
  },
  unreadText: { color: IVORY, fontSize: 10, fontWeight: "800" },

  // ── Modal ──
  modal: { flex: 1, backgroundColor: PARCHMENT },

  // ── Header — Dark Surface ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: DARK_SURFACE,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { color: IVORY, fontSize: 16, fontWeight: "600", letterSpacing: 0.2 },
  headerSub: { color: WARM_SILVER, fontSize: 12, marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  clearBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center", alignItems: "center",
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },

  // ── Tool banner — warm ──
  toolBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: WARM_SAND,
    borderBottomWidth: 1, borderBottomColor: BORDER_WARM,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  toolBannerText: { color: CHARCOAL_WARM, fontSize: 13, fontStyle: "italic", flex: 1 },

  // ── Messages ──
  msgList: { padding: 16, paddingBottom: 8 },
  msgListEmpty: { flex: 1 },
  msgRow: { flexDirection: "row", marginBottom: 16, alignItems: "flex-end" },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowBot: { justifyContent: "flex-start" },
  botAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: WARM_SAND,
    justifyContent: "center", alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: BORDER_WARM,
  },
  botAvatarText: { fontSize: 17 },
  bubbleCol: { maxWidth: "80%", gap: 4 },
  bubbleColUser: { alignItems: "flex-end" },
  bubble: { borderRadius: 20, paddingHorizontal: 15, paddingVertical: 11 },
  bubbleUser: { backgroundColor: TERRACOTTA, borderBottomRightRadius: 5 },
  bubbleBot: {
    backgroundColor: IVORY,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: BORDER_CREAM,
    // whisper shadow
    shadowColor: NEAR_BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleText: { fontSize: 15, lineHeight: 23 },
  bubbleTextUser: { color: IVORY },
  bubbleTextBot: { color: NEAR_BLACK },
  streamingDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: RING_WARM,
    alignSelf: "flex-end", marginTop: 4,
  },
  timestamp: { fontSize: 10, color: STONE_GRAY, marginLeft: 4 },
  timestampUser: { textAlign: "right", marginLeft: 0, marginRight: 4 },

  // ── Order links ──
  orderLinks: { gap: 7, marginTop: 2 },
  orderBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: IVORY,
    borderWidth: 1, borderColor: TERRACOTTA,
    borderRadius: 12, padding: 10, gap: 10,
  },
  orderBtnOff: { borderColor: BORDER_CREAM, opacity: 0.6 },
  orderBtnIconWrapper: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: WARM_SAND,
    justifyContent: "center", alignItems: "center",
  },
  orderBtnIconOff: { backgroundColor: BORDER_CREAM },
  orderBtnIcon: { fontSize: 18 },
  orderBtnTitle: { fontSize: 13, fontWeight: "700", color: TERRACOTTA },
  orderBtnStore: { fontSize: 11, color: OLIVE_GRAY, marginTop: 1 },
  orderBtnArrowWrapper: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: TERRACOTTA,
    justifyContent: "center", alignItems: "center",
  },

  // ── Empty state ──
  empty: {
    flex: 1, alignItems: "center",
    paddingTop: 40, paddingHorizontal: 28, paddingBottom: 24,
  },
  emptyIconWrapper: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: WARM_SAND,
    justifyContent: "center", alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_WARM,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: NEAR_BLACK, marginBottom: 8, textAlign: "center" },
  emptySub: { fontSize: 14, color: OLIVE_GRAY, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  storeChip: {
    backgroundColor: WARM_SAND,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER_WARM,
    paddingHorizontal: 16, paddingVertical: 8,
    marginBottom: 20,
  },
  storeChipText: { fontSize: 13, color: TERRACOTTA, fontWeight: "600" },
  suggestionsScroll: { width: "100%" },
  suggChip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: IVORY,
    borderWidth: 1, borderColor: BORDER_CREAM,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    marginBottom: 8,
  },
  suggIcon: { fontSize: 20 },
  suggText: { flex: 1, color: CHARCOAL_WARM, fontSize: 14, fontWeight: "600" },

  // ── Scroll-to-bottom ──
  scrollBtn: {
    position: "absolute",
    bottom: 90, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: TERRACOTTA,
    justifyContent: "center", alignItems: "center",
    shadowColor: NEAR_BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  // ── Input bar — Ivory ──
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 14, paddingTop: 12,
    backgroundColor: IVORY,
    borderTopWidth: 1, borderTopColor: BORDER_CREAM,
  },
  input: {
    flex: 1,
    backgroundColor: PARCHMENT,
    borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 12,
    fontSize: 15, color: NEAR_BLACK,
    maxHeight: 130, lineHeight: 22,
    borderWidth: 1, borderColor: BORDER_WARM,
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: TERRACOTTA,
    justifyContent: "center", alignItems: "center",
    shadowColor: NEAR_BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnOff: { backgroundColor: RING_WARM, shadowOpacity: 0, elevation: 0 },
});
