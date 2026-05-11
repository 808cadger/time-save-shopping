# time~save~shopping

[![Release](https://img.shields.io/github/v/release/808cadger/time-save-shopping?include_prereleases&label=release)](https://github.com/808cadger/time-save-shopping/releases)
[![Last commit](https://img.shields.io/github/last-commit/808cadger/time-save-shopping)](https://github.com/808cadger/time-save-shopping/commits)
[![License](https://img.shields.io/github/license/808cadger/time-save-shopping)](https://github.com/808cadger/time-save-shopping/blob/HEAD/LICENSE)
![Platforms](https://img.shields.io/badge/platform-Expo%2FReact%20Native%2C%20Android%2C%20Web%2C%20API%20service-2563eb)

AI grocery assistant with store detection, list guidance, item finding, and mobile shopping workflows.

## Project Snapshot

| Area | Details |
|------|---------|
| Primary use case | AI grocery assistant with store detection, list guidance, item finding, and mobile shopping workflows. |
| Platforms | Expo/React Native, Android, Web, API service |
| Core stack | Expo, React Native, Android, FastAPI, Claude AI |
| Review first | `app`, `backend` |

## Download Links

| Platform | Link |
|----------|------|
| iOS / iPhone | [Open the PWA in Safari](https://808cadger.github.io/time-save-shopping/) and choose **Share -> Add to Home Screen** |
| Android | [Download the latest APK from GitHub Releases](https://github.com/808cadger/time-save-shopping/releases/latest) |
| Source | [Download the GitHub source ZIP](https://github.com/808cadger/time-save-shopping/archive/refs/heads/main.zip) |
| Repository | [View on GitHub](https://github.com/808cadger/time-save-shopping) |

## Why This Repo Is Worth Reviewing

- In-store mobile UX centers around location and list context.
- React Native app plus backend service supports real device workflows.
- AI assistant is integrated into shopping instead of living as a separate chat.


<!-- INSTALL-START -->
## Install and run

These instructions install and run `time-save-shopping` from a fresh clone.

### Clone
```bash
git clone https://github.com/808cadger/time-save-shopping.git
cd time-save-shopping
```

### Expo app
```bash
cd app
npm install
npm start
npm run web
```

### Expo Android build
```bash
cd app
npm run android
npm run build:android
```

### Python/API service
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Notes
- Expo apps require the Expo/React Native local prerequisites for native Android builds.
- Create any required `.env` file from `.env.example` before starting backend services.

### AI/API setup
- If the app has AI features, add the required provider key in the app settings or local `.env` file.
- Browser-only apps store user-provided API keys on the local device unless a backend endpoint is configured.

### License
- Apache License 2.0. See [`LICENSE`](./LICENSE).
<!-- INSTALL-END -->


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
---

© 2026 cadger808 — All rights reserved.
