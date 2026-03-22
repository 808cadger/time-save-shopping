# time~save~shopping

> AI grocery assistant — detects when you walk into the store, guides you to every item on your list, and puts an AI chatbot on every screen.

[**Download APK →**](https://codeberg.org/cadger808/time-save-shopping/releases) · [Codeberg](https://codeberg.org/cadger808/time-save-shopping)

---

## Can anyone use this?

**Yes — download the APK and you're running.**

1. Download the APK from [Releases](https://codeberg.org/cadger808/time-save-shopping/releases)
2. Open the file on your Android device to install (enable "Install unknown apps" if prompted)
3. Open the app → Settings → paste your [Anthropic API key](https://console.anthropic.com)
4. Allow location permission when prompted (required for store detection)

---

## What it does

| Feature | Description |
|---------|-------------|
| 🏪 **Store detection** | GPS geofence auto-detects when you enter the store |
| 🛒 **AI chatbot** | Full-screen Claude chat on every screen — drag the FAB anywhere |
| 🗺️ **Route planning** | Give it your list, get optimized step-by-step aisle directions |
| 📍 **Item finder** | Find any item's exact aisle and section instantly |
| 🔄 **Out-of-stock alerts** | Suggests nearby stores with the item in stock |
| 📝 **Shopping list** | Persistent list with checkoff and AI-powered routing |
| 🛍️ **Online ordering** | One-tap order links for 13+ major grocery chains |

---

## Install options

| Method | Steps |
|--------|-------|
| **Android APK** | [Download](https://codeberg.org/cadger808/time-save-shopping/releases) → open file on device |
| **ADB install** | `adb install -r app-debug.apk` |

---

## Dev quick start

```bash
git clone https://codeberg.org/cadger808/time-save-shopping.git
cd time-save-shopping/app && npm install

npx expo start                          # Expo dev server
npx expo export --platform android      # export for Android
cd android && ./gradlew assembleDebug   # build APK
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## Tech stack

| Layer | Tech |
|-------|------|
| Mobile UI | React Native + Expo 51 + TypeScript |
| AI | Claude Opus 4.6 (Anthropic) |
| Location | Expo Location + GPS geofencing |
| CI | Forgejo Actions (APK build) |

---

**Developer:** [codeberg.org/cadger808](https://codeberg.org/cadger808)
