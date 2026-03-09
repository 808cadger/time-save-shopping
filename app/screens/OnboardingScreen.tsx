import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserPreferences {
  mode: "full_auto" | "manual" | "assisted";
  features: string[];
  storeDetection: "gps" | "manual" | "qr";
  notifications: boolean;
  onboardingComplete: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  mode: "assisted",
  features: ["directions", "online_order", "out_of_stock"],
  storeDetection: "gps",
  notifications: true,
  onboardingComplete: false,
};

export const PREFS_KEY = "@timesave_prefs";

interface Props {
  onComplete: (prefs: UserPreferences) => void;
}

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to\ntime~save~shopping",
    subtitle: "Let's set up the app to work the way you want.",
    type: "intro",
  },
  {
    id: "mode",
    title: "How do you want the app to work?",
    subtitle: "You can always change this in Settings.",
    type: "choice",
    key: "mode",
    options: [
      {
        value: "full_auto",
        icon: "🤖",
        label: "Full Auto",
        desc: "App detects the store, opens automatically when you walk in, and guides you step-by-step with no tapping needed.",
        tag: "Hands-free",
        tagColor: "#dcfce7",
        tagText: "#15803d",
      },
      {
        value: "assisted",
        icon: "💬",
        label: "AI-Assisted",
        desc: "App suggests the next step and the AI chatbot is always ready. You stay in control and can ask anything.",
        tag: "Recommended",
        tagColor: "#dbeafe",
        tagText: "#1d4ed8",
      },
      {
        value: "manual",
        icon: "🧭",
        label: "Manual",
        desc: "Use the app on your own terms. The AI chatbot is available when you want it, but won't interrupt you.",
        tag: "DIY",
        tagColor: "#f3f4f6",
        tagText: "#374151",
      },
    ],
  },
  {
    id: "features",
    title: "What features do you want?",
    subtitle: "Select all that apply.",
    type: "multi",
    key: "features",
    options: [
      { value: "directions",    icon: "🗺️", label: "In-store directions",   desc: "Step-by-step route to every item on your list" },
      { value: "online_order",  icon: "🛒", label: "Online ordering links", desc: "One tap to order any item on the store's website" },
      { value: "out_of_stock",  icon: "🔄", label: "Out-of-stock alerts",   desc: "Find nearby stores when an item isn't available" },
      { value: "price_compare", icon: "💰", label: "Price info",            desc: "See prices as you shop" },
    ],
  },
  {
    id: "store_detection",
    title: "How should we detect which store you're in?",
    subtitle: "This helps us pull up the right map and ordering links.",
    type: "choice",
    key: "storeDetection",
    options: [
      {
        value: "gps",
        icon: "📍",
        label: "Auto-detect via GPS",
        desc: "We use your location to identify the store chain and auto-load the map.",
        tag: "Recommended",
        tagColor: "#dbeafe",
        tagText: "#1d4ed8",
      },
      {
        value: "manual",
        icon: "🔍",
        label: "I'll pick my store",
        desc: "You search and select the store from our list of supported chains.",
        tag: null,
      },
      {
        value: "qr",
        icon: "📷",
        label: "Scan store QR code",
        desc: "Scan a QR code posted at the store entrance to instantly identify it.",
        tag: null,
      },
    ],
  },
  {
    id: "done",
    title: "You're all set! 🎉",
    subtitle: "time~save~shopping is ready. Walk into any store and let's go.",
    type: "finish",
  },
];

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<UserPreferences>({ ...DEFAULT_PREFS });
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function animateNext(fn: () => void) {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }

  function toggleFeature(value: string) {
    setPrefs((p) => ({
      ...p,
      features: p.features.includes(value)
        ? p.features.filter((f) => f !== value)
        : [...p.features, value],
    }));
  }

  async function finish() {
    const final = { ...prefs, onboardingComplete: true };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(final));
    onComplete(final);
  }

  function canAdvance(): boolean {
    if (currentStep.type === "choice") {
      const val = prefs[currentStep.key as keyof UserPreferences];
      return Boolean(val);
    }
    if (currentStep.type === "multi") {
      return (prefs.features ?? []).length > 0;
    }
    return true;
  }

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.subtitle}>{currentStep.subtitle}</Text>

          {currentStep.type === "intro" && (
            <View style={styles.introIllustration}>
              <Text style={styles.introEmoji}>🛒</Text>
              <View style={styles.introFeatures}>
                {["📍 Detects your store automatically", "🗺️ Plans your route", "🛒 Links to order online", "💬 AI help on every screen"].map((f) => (
                  <View key={f} style={styles.introFeatureRow}>
                    <Text style={styles.introFeatureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {currentStep.type === "finish" && (
            <View style={styles.finishContainer}>
              <Text style={styles.finishEmoji}>🎉</Text>
              <Text style={styles.finishSummary}>
                Mode: <Text style={styles.bold}>{prefs.mode === "full_auto" ? "Full Auto" : prefs.mode === "assisted" ? "AI-Assisted" : "Manual"}</Text>
                {"\n"}Detection: <Text style={styles.bold}>{prefs.storeDetection === "gps" ? "GPS auto-detect" : prefs.storeDetection === "manual" ? "Manual selection" : "QR scan"}</Text>
                {"\n"}Features: <Text style={styles.bold}>{prefs.features.length} enabled</Text>
              </Text>
            </View>
          )}

          {currentStep.type === "choice" && (
            <View style={styles.options}>
              {currentStep.options!.map((opt) => {
                const selected = prefs[currentStep.key as keyof UserPreferences] === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionCard, selected && styles.optionCardSelected]}
                    onPress={() => setPrefs((p) => ({ ...p, [currentStep.key!]: opt.value }))}
                    activeOpacity={0.8}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionIcon}>{opt.icon}</Text>
                      <Text style={styles.optionLabel}>{opt.label}</Text>
                      {opt.tag && (
                        <View style={[styles.optionTag, { backgroundColor: opt.tagColor }]}>
                          <Text style={[styles.optionTagText, { color: opt.tagText }]}>{opt.tag}</Text>
                        </View>
                      )}
                      {selected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.optionDesc}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {currentStep.type === "multi" && (
            <View style={styles.options}>
              {currentStep.options!.map((opt) => {
                const selected = prefs.features.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionCard, selected && styles.optionCardSelected]}
                    onPress={() => toggleFeature(opt.value)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionIcon}>{opt.icon}</Text>
                      <Text style={styles.optionLabel}>{opt.label}</Text>
                      {selected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.optionDesc}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>

      {/* Navigation */}
      <View style={styles.nav}>
        {step > 0 && currentStep.type !== "finish" && (
          <TouchableOpacity style={styles.backBtn} onPress={() => animateNext(() => setStep((s) => s - 1))}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
          onPress={() => {
            if (isLast) {
              finish();
            } else {
              animateNext(() => setStep((s) => s + 1));
            }
          }}
          disabled={!canAdvance()}
        >
          <Text style={styles.nextBtnText}>{isLast ? "Start Shopping 🛒" : "Continue →"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingTop: Platform.OS === "ios" ? 56 : 24,
    paddingBottom: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e2e8f0" },
  dotActive: { backgroundColor: "#22c55e", width: 20 },
  dotDone: { backgroundColor: "#86efac" },
  content: { flex: 1 },
  scroll: { padding: 24, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: "800", color: "#1e293b", lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#64748b", lineHeight: 24, marginBottom: 28 },
  introIllustration: { alignItems: "center" },
  introEmoji: { fontSize: 72, marginBottom: 24 },
  introFeatures: { width: "100%", gap: 10 },
  introFeatureRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  introFeatureText: { fontSize: 15, color: "#334155" },
  finishContainer: { alignItems: "center", gap: 16 },
  finishEmoji: { fontSize: 72 },
  finishSummary: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    lineHeight: 28,
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    width: "100%",
  },
  bold: { fontWeight: "700", color: "#1e293b" },
  options: { gap: 12 },
  optionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionCardSelected: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  optionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  optionIcon: { fontSize: 22 },
  optionLabel: { flex: 1, fontSize: 16, fontWeight: "700", color: "#1e293b" },
  optionTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  optionTagText: { fontSize: 11, fontWeight: "700" },
  checkmark: { fontSize: 18, color: "#22c55e", fontWeight: "800" },
  optionDesc: { fontSize: 13, color: "#64748b", lineHeight: 19 },
  nav: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
  },
  backBtnText: { fontSize: 15, color: "#64748b", fontWeight: "600" },
  nextBtn: {
    flex: 1,
    backgroundColor: "#22c55e",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnDisabled: { backgroundColor: "#94a3b8", shadowOpacity: 0 },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
