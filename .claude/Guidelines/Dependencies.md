## Dependencies — Catalog + Distribution

The vetted library menu and what shipping a real build takes. Each library is tagged **Decided** (in `package.json` today), **Candidate** (named, not yet installed), or **Not-yet-needed** (deferred phase). Reconcile against `Pommora/package.json` before trusting any version.

### Libraries

#### Shell · Build · Packaging

- **Electron** + **electron-vite** — desktop shell + Vite-first dev loop with main-process HMR. **Decided.**
- **Vite 7** + **@vitejs/plugin-react 5** — renderer bundler. **Decided** (compat pin: newer plugin-react needs Vite 8, unsupported by electron-vite 5).
- **electron-builder** — packaging + (via `electron-updater`) auto-update. **Decided** for packaging; updater **Not-yet-needed**.
- **@electron/notarize** · **@sentry/electron** — notarization wrapper · crash reporting. **Not-yet-needed** (current build is ad-hoc-signed). See Distribution below.

#### UI · Styling · Icons

- **React 19** + **TypeScript 6** — **Decided.**
- **vanilla-extract** (`@vanilla-extract/css` + vite-plugin) — typed, zero-runtime CSS-in-TS; the token layer authors `*.css.ts`. **Decided.** (Tailwind was the pre-build guess — not used.)
- **lucide-react** — the curated icon registry in `DesignSystem/Symbols/` driven by `SymbolsPM.md`. **Decided.** **`@tabler/icons-react` stays installed as a second source** to pull from per-icon (import its `Icon*`, register it, pass `strokeWidth={1.75}` to match Lucide's weight). (Material Symbols + a `symbols.json` indirection layer was the pre-build guess — not used. A user-swappable icon library, incl. SF Symbols, remains a possible future setting.)
- **@fontsource-variable/inter** — the app font. **Decided.**

#### State · Data · Search

- **Zustand 5** (vanilla + `useSyncExternalStore`) — framework-agnostic store. **Decided.**
- **`node:sqlite`** (WAL) — synchronous SQLite behind `db//driver.ts`, holding device-local operational state and the content index. Ships inside Electron's own Node, so there is no native module to compile and no ABI to match. **Decided** — it replaced `better-sqlite3`, whose prebuilt binary matched Node's ABI and therefore never loaded under Electron at all.
- **zod 4** — schema = codec = type for sidecars + frontmatter. **Decided.** `z.looseObject` defensively retains foreign keys on sidecars — note this is *defensive*, not required: sidecars are controlled schemas, and markdown frontmatter (not the sidecar) is the preserve-everything surface.
- **ulidx** — monotonic ULID ids. **Decided.**
- **write-file-atomic** + **eemeli/yaml** — atomic writes + the comment-preserving YAML Document API. **Decided.**
- **chokidar 5** — filesystem watcher (Phase 4 live refresh). **Decided.** (`@parcel/watcher` is faster on very large trees but adds a native-module rebuild — the failure class the SQLite driver was chosen to avoid; revisit only if watch perf at nexus scale becomes an issue.)
- **SQLite FTS5** — full-text search; `unicode61` tokenizer with `remove_diacritics=2` + external-content mode over the `pages` table is the nexus-scale pattern (1k–10k pages). `MiniSearch` (in-memory) is fine to ~2k notes but balloons by 10k. **Not-yet-needed** (deferred global search; ships inside `node:sqlite` already). Needs a `pages` table and a body column, neither of which currently exists.

#### Drag-and-Drop · Block Layout

- **PommoraDND** — the **in-house drag-and-drop engine** (behind the `interactions/drag.tsx` seam): measure-once, no mid-drag array churn, pointer-capture single sensor, closest-center + hysteresis, decide-then-animate; constraints, auto-scroll, keyboard + ARIA. **Decided + shipped** — replaced `@dnd-kit` entirely. Spec → `Features/PommoraDND.md`.
- **@dnd-kit** — the reference engine PommoraDND was dissected from. **Replaced + uninstalled** — no longer a dependency or import; kept here only as a historical anchor.
- **react-grid-layout** — responsive, draggable + resizable **grid** layout with breakpoints; React-only, MIT. Fits 2-D **dashboard / widget** composition — the Homepage composed-blocks dashboard. Distinct from PommoraDND (which owns linear / nested reorder), not a substitute. **Candidate** — verify React 19 compatibility + maintenance health at adoption time.

### Distribution — Packaging, Signing, Notarization

Reference for shipping a real build. The current build is **ad-hoc-signed**: `npm run package` → `codesign --force --deep --sign -` → `release/mac-arm64/Pommora.app`, served over a custom `app://` scheme. What a distributable release adds:

- **Packaging:** `electron-builder` (current) or Electron Forge 7+ (official all-in-one). There is no native module to externalize or rebuild — SQLite comes from `node:sqlite` inside Electron's own runtime.
- **Auto-update:** `electron-updater` + GitHub Releases is the path of least resistance (free, no infra). MAS builds use Apple's mechanism instead — no self-update.
- **Signing + notarization:** `@electron/notarize` wraps Apple's `notarytool`. Hardened runtime mandatory; entitlement `com.apple.security.cs.allow-jit`. (Replaces the ad-hoc sign with a Developer ID identity.)
- **MAS sandbox:** forces `contextIsolation: true` + `sandbox: true` + `nodeIntegration: false` (already the build's posture). Filesystem needs `com.apple.security.files.user-selected.read-write` — scoped to user-picked nexus folders.
- **Crash reporting:** `@sentry/electron` (Crashpad-backed; covers main / renderer / utility processes).
