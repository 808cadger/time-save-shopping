# CLAUDE.md — time-save-shopping

AI grocery assistant with geolocation.
Stack: React Native + Expo (EAS build) | Deploy: APK via Expo/Gradle

## Repo Identity
- Codeberg: https://codeberg.org/cadger808/time-save-shopping
- Releases: https://codeberg.org/cadger808/time-save-shopping/releases

## Key Files
- `app/` — Expo React Native project root
- `app/App.js` (or `App.tsx`) — entry point
- `app/app.json` — Expo config
- `app/android/` — Android project (Gradle)
- `.github/workflows/build-apk.yml` — APK CI

## Commands
```bash
cd app
npm install
npx expo start
npx expo export --platform android
cd android && ./gradlew assembleDebug
```

## Assumption-Driven Coding

When generating or editing code:
1. Add a comment for each non-trivial assumption using `// #ASSUMPTION: ...` (or language equivalent).
2. Ask: "What test or edge case would break this assumption?"
3. Add minimal defensive checks or `// TODO: validate ...` comments where needed.
4. Before finishing, do a mental review pass on all `#ASSUMPTION` lines.
