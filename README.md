# time~save~shopping

AI-powered grocery store app. Detects when you enter the store, guides you to every item on your list, and has an AI chatbot on every screen.

---

## Setup

### 1. Get an Anthropic API Key
Sign up at https://console.anthropic.com → Create API Key

### 2. Backend (Python)

```bash
cd backend
cp .env.example .env
# Paste your API key into .env:  ANTHROPIC_API_KEY=sk-ant-...

pip install -r requirements.txt
python main.py
```
Backend runs at http://localhost:8000

### 3. Mobile App (React Native / Expo)

```bash
cd app
npm install
npm start
```

**To run on your phone (share with anyone!):**
1. Install **Expo Go** from the App Store or Google Play
2. Scan the QR code printed in the terminal
3. Done — anyone with Expo Go can scan your QR to use the app

**To build a standalone APK (Android) to share:**
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```
EAS gives you a download link and QR code to share.

### 4. Set your backend IP (physical device)

In `app/services/api.ts`, update `API_BASE_URL`:
- **Android emulator**: `http://10.0.2.2:8000`
- **iOS simulator**: `http://localhost:8000`
- **Physical phone**: `http://YOUR_COMPUTER_IP:8000`

---

## Features

| Feature | Description |
|---------|-------------|
| 🏪 Store detection | Detects when you walk into the store via GPS geofence |
| 🛒 AI chatbot | Floating chat button on every screen |
| 🗺️ Route planning | Give it your list, get step-by-step directions |
| 📍 Item finder | Find any item's exact aisle and section |
| 🔄 Out-of-stock | Suggests nearby stores when items aren't available |
| 📝 Shopping list | Save and manage your list with AsyncStorage |
| 🏪 Store map | Visual aisle-by-aisle layout |

---

## Architecture

```
app/              ← React Native (Expo)
  App.tsx         ← Tab navigation
  screens/        ← Home, ShoppingList, StoreMap
  components/
    ChatBot.tsx   ← Floating AI chat widget (used on every screen)
  services/
    api.ts        ← Backend API client (streaming SSE)

backend/
  main.py         ← FastAPI + Claude claude-opus-4-6 with tool use
```

## Customizing the Store

Edit `backend/main.py`:
- `STORE_INVENTORY` — add/remove items, update aisles and prices
- `STORE_LAT / STORE_LNG` — set to your actual store coordinates in `HomeScreen.tsx`
- `GEOFENCE_RADIUS_METERS` — how close to trigger the welcome message

---

Built with Claude claude-opus-4-6 (Anthropic) + React Native (Expo) + FastAPI
