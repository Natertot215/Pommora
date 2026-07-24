### Framework — Roadmap

Pommora's path to v1.0.0. The React + Electron build rebuilt the Swift paradigm from the ground up, reached parity, then passed it — **Page Previews + the Subfield unification closed the rebuild, and the build stands at v0.5.0**. Each minor version ships green and standalone — shipped detail → `History.md`, session state → `Handoff.md`. Numbers are soft — order and grouping firm up as each cluster lands. Scope is the **core 7** (data · properties · connections · markdown · navigation · table · cards) plus the deferred frontier (the remaining view renderers, block-surface completion, Agenda surfacing, the settings UI, global search, the LLM-chat inspector, OS integrations).

### Versioning

`major.minor.patch` semver. **Minor (`v0.X.0`)** = a completed feature cluster. **Patch (`v0.X.y`)** = a touch-up or additive extension on a shipped feature. **Major (`vX.0.0`)** is reserved for `v1.0.0` (stabilization) and onward. **v0.5.0 is the rebuild-complete baseline.** The upcoming line is version-targeted, never date-bound; order and grouping firm up as each cluster lands.

### Completed

The rebuild arc to **v0.5.0** — locked decisions and full detail per milestone in `History.md`.

- Genesis → walking skeleton — one nexus walk over IPC into a Zustand store
- Headless data layer + the desktop write path
- Glass, drag, and the design system
- The MarkdownPM editor
- Chrome, footer, and inspector
- Tables, views + Properties V2
- The view-settings suite + property editors
- SurfacePM — block surfaces
- Auto-scroll + the navigation surface
- Multi-tab nexus
- Page previews
- Unified Subfield + scan-promote — **closed the rebuild at v0.5.0**

Since the baseline:

- Cards — the second renderer, interaction hardening, the picker-host architecture
- The certified cleanup campaign — one-walk mutations + shared interaction primitives
- Contexts & Spaces — the registry model replacing the fixed three tiers *(in flight)*

### II. Upcoming (v0.5.0 → v1.0.0)

#### The prerequisite — a query consumer

The SQLite index is built, schema-versioned, and rebuilt on every mutation, and **nothing reads it**: there is no query facade. Linked-From, backlinks, ContextView, and full-text search are all blocked on that one missing hop, and the rebuild currently costs a full nexus re-read per write for no benefit. Writing the query layer — or suspending the rebuild until it exists — precedes the features that depend on it.

#### v0.6.0 — The View Renderers

The remaining renderers — **List · Gallery · Calendar · Timeline** — over the shipped filter → group → sort pipeline (Table and Cards render today; the other four are registered types with no renderer, and their picker tiles are inert). The **Filter authoring pane** belongs here too: the filter engine ships and has no UI on either door.

#### v0.7.0 — Agenda + Calendar

Making Agenda reachable. The whole CRUD layer is written, locked, and tested but has **no IPC and no UI** — every caller is a test, and the sidebar's Agenda rows are inert. Needs a selection kind, a detail surface, and the mutate ops to reach the existing write path; an EventKit bridge (opt-in, bidirectional) follows.

#### v0.8.0 — Settings + Quick Capture + LLM Inspector + Search

The Settings editing UI — the single biggest unlock, since 11 of 14 personalization keys are fully wired end-to-end with no control to set them, and the ribbon's Settings icon is a no-op. Plus Quick Capture (specced, zero code), the Claude-chat inspector (the panel ships; its body is empty), and global `⌘K` search over an FTS index.

#### v0.9.0 — SurfacePM Completion + Contexts

SurfacePM's remaining reach — bidirectional tile conversion, the background Insert menu, embed banners — plus the Homepage's final shape. The **Linked-From surface** rides here and is gated on the one architectural prerequisite below.

#### v1.0.0 — Stabilization

No new features — polish, performance, and a release pass (signing, notarization, auto-update).

### Post-v1

No phase commitments. The catalog lives in `PommoraPRD.md` (the Prospects section) — inline `![[Embed]]` in page bodies (parked in the Swift build on a TextKit limitation the CM6 editor no longer has), sub-pages, independent UI titles, a graph view, sync, mobile, and a plugin system among them.
