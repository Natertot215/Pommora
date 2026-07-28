## Distribution — Packaging, Signing, Notarization

Reference for shipping a real build. The current build is **ad-hoc-signed**: `npm run package` → `codesign --force --deep --sign -` → `release/mac-arm64/Pommora.app`, served over a custom `app://` scheme. Below is what a distributable release adds.

- **Packaging:** `electron-builder` (current) or Electron Forge 7+ (official all-in-one). There is no native module to externalize or rebuild — SQLite comes from `node:sqlite` inside Electron's own runtime.
- **Auto-update:** `electron-updater` + GitHub Releases is the path of least resistance (free, no infra). MAS builds use Apple's mechanism instead — no self-update.
- **Signing + notarization:** `@electron/notarize` wraps Apple's `notarytool`. Hardened runtime mandatory; entitlement `com.apple.security.cs.allow-jit`. (Replaces the ad-hoc sign with a Developer ID identity.)
- **MAS sandbox:** forces `contextIsolation: true` + `sandbox: true` + `nodeIntegration: false` (already the build's posture). Filesystem needs `com.apple.security.files.user-selected.read-write` — scoped to user-picked nexus folders, the same constraint any sandboxed Mac app carries.
- **Crash reporting:** `@sentry/electron` (Crashpad-backed; covers main / renderer / utility processes).
