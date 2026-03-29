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

## SRE & DevOps (2026 Standards)
- **SLOs**: 99.9% availability, <200ms P95 latency, 0.1% error budget monthly.
- **SLIs**: Track uptime, latency, error rate via Prometheus/Grafana.
- **Deploy**: Zero-downtime (blue-green, canary); IaC-first (Pulumi/Terraform).
- **MCP Integration**: Use MCP for secure cloud access (AWS, Vercel).
- **Monitoring**: Golden signals + AI anomaly detection in every app.
- **Chatbot**: Embed agentic chatbot in every app (UI + API + safe prompts).

### Auto-Debug Engine (Always On)
- **Before every change**: Run tests/lint, show output, fix failures first.
- **After code**: Self-review: "Does this pass SRE checks? Edge cases? Security?"
- **Loop**: If error found → fix → retest → confirm clean → proceed.
- **Tools**: Enable Playwright MCP for UI tests; background terminal for logs.
- **Commands**: /doctor for health check; /memory to log fixes learned.
- **Never skip**: No deploy without "Debug complete: [tests passed]".

## Goal
Ship production-ready agentic AI apps with embedded chatbots, SRE-grade reliability, and Fiverr-ready polish. Every deploy <30min.
