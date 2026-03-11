# time~save~shopping

> AI-powered grocery assistant — detects when you walk into the store, guides you to every item on your list, and puts an AI chatbot on every screen.

---

## What it does

| Feature | Description |
|---------|-------------|
| 🏪 **Store detection** | GPS geofence auto-detects when you enter the store and greets you |
| 🛒 **AI chatbot** | Full-screen chat powered by Claude on every screen — drag the FAB anywhere |
| 🗺️ **Route planning** | Give it your list, get optimized step-by-step aisle directions |
| 📍 **Item finder** | Find any item's exact aisle and section instantly |
| 🔄 **Out-of-stock alerts** | Suggests nearby stores with the item in stock |
| 📝 **Shopping list** | Persistent list with checkoff and AI-powered routing |
| 🏪 **Store map** | Visual aisle-by-aisle layout with item locations |
| 🛍️ **Online ordering** | One-tap order links for 13+ major grocery chains |

---

## Screenshots

> App features a full-screen AI chat, draggable floating assistant button with animated glow ring, slide-in message animations, and real-time streaming responses.

---

## Tech stack

```
app/        React Native (Expo 51) + TypeScript
backend/    Python FastAPI + Claude claude-opus-4-6 (Anthropic)
```

---

## Getting started

### 1. Get an Anthropic API key

Sign up at [console.anthropic.com](https://console.anthropic.com) → Create API Key

### 2. Start the backend

```bash
cd backend
cp .env.example .env
# Paste your key into .env:  ANTHROPIC_API_KEY=sk-ant-...

pip install -r requirements.txt
python main.py
# Runs at http://localhost:8000
```

### 3. Start the mobile app

```bash
cd app
npm install
npm start
```

Install **Expo Go** on your phone → scan the QR code → done.

### 4. Set your backend IP (physical device)

In `app/services/api.ts`, update `API_BASE_URL`:

```ts
// Android emulator
const API_BASE_URL = "http://10.0.2.2:8000";

// Physical phone (use your computer's local IP)
const API_BASE_URL = "http://192.168.x.x:8000";
```

---

## Build standalone APK

```bash
cd app
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

EAS gives you a download link and QR code to share.

---

## Customize for your store

Edit `backend/main.py`:

- `STORE_INVENTORY` — add/remove items, update aisles and prices
- `STORE_LAT` / `STORE_LNG` in `app/screens/HomeScreen.tsx` — your store's GPS coordinates
- `GEOFENCE_RADIUS_METERS` — detection radius (default 200m)

---

## Supported store chains

Walmart · Kroger · Safeway · Whole Foods · Target · Publix · Costco · ALDI · H-E-B · Trader Joe's · Food Lion · Meijer · Instacart

---

## Architecture

```
app/
  App.tsx                  ← Bottom tab navigation + onboarding
  screens/
    HomeScreen.tsx         ← GPS detection, quick actions, store selector
    ShoppingListScreen.tsx ← Persistent list with AI routing
    StoreMapScreen.tsx     ← Visual aisle map
    OnboardingScreen.tsx   ← First-run setup flow
  components/
    ChatBar.tsx            ← Full-screen AI chat (draggable FAB, animations)
    StoreIdentityCard.tsx  ← Current store display
  services/
    api.ts                 ← Streaming SSE client

backend/
  main.py                  ← FastAPI + Claude with 7 tools + streaming
```

---

Built with [Claude claude-opus-4-6](https://anthropic.com) · React Native (Expo) · FastAPI
