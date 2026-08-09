### Versioning — Roadmap

Pommora's path to v1.0.0. The React + Electron build rebuilt the Swift paradigm from the ground up, reached parity, then passed it — **Page Previews + the Subfield unification closed the rebuild, and the build stands at v0.5.0**.  Numbers are soft — order and grouping firm up as each cluster lands. Scope is the **core 7** (data · properties · connections · markdown · navigation · table · cards) plus the deferred frontier.

### Versioning

`major.minor.patch` semver. **Minor (`v0.X.0`)** = a completed feature cluster. **Patch (`v0.X.y`)** = a touch-up or additive extension on a shipped feature. **Major (`vX.0.0`)** is reserved for `v1.0.0` (stabilization) and onward. **v0.5.0 is the rebuild-complete baseline.** The upcoming line is version-targeted, never date-bound; order and grouping firm up as each cluster lands.

### Completed

The rebuild arc to **v0.5.0** — locked decisions and full detail per milestone in [[HistoryPM]] §04-26-2026 → 08-07-2026.

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
- Contexts & Spaces — the registry model replacing the fixed three tiers, the shared floating-window chassis, and the filter authoring pane
- The truing campaign — a doc audit against real code, the filter made to visibly filter, and the source stripped of a retired vocabulary
- One syntax for every Pommora-owned key — wrapped title keys at the frontmatter root, operational state moved into `nexus.db`, and one palette source
- The hardening campaign and its inverse — one strict read-modify-write, one glyph rule, the parallel walk, the guard audit, and the HOIST design-system consolidation
- The erasure campaigns — Swift parity out wholesale, navigation persistence consolidated onto one `navigation.json` contract

### II. Upcoming (v0.5.0 → v1.0.0)

#### The prerequisite — a query consumer

Linked-From, backlinks, ContextView, and full-text search all need a content index, and none exists. The prior one was deleted rather than repaired: nothing queried it, and its only update path was a full nexus re-walk per write. Its replacement gets written alongside the query layer that reads it, updating a row at a time; the database, the driver seam, and the version handshake are already in place for it.

#### Between versions — the working queue

The near-term queue rides `ContextPM.md`'s Pending Focuses rather than a version number: the IPC channel map and the store split (the two structural sessions, in that order), and the Pages-in-DB storage-model session that inherits the tree-reload ceiling as its design constraint. Feature clusters resume below once those land.

#### v0.6.0 — The View Renderers

The remaining renderers — **List · Gallery · Calendar · Timeline** — over the shipped filter → group → sort pipeline (Table and Cards carry renderers; these four are registered types with none, and their picker tiles are inert). Each groups mechanically differently, so each carries its own grouping surface.

#### v0.7.0 — Agenda + Calendar

Building Agenda. The inherited shape was removed rather than carried forward, so this starts from a settled identity model and an empty schema: Tasks and Events are `.md` under their kind keys, their singleton folders are registered, and admission already recognises them. What it needs is the field vocabulary, the tree membership, a selection kind, a detail surface, and CRUD that converges onto the page writers rather than a second serializer; an EventKit bridge (opt-in, bidirectional) follows.

#### v0.8.0 — Settings + Quick Capture + LLM Inspector + Search

The rest of the Settings editing UI — the window ships off the ribbon with its boolean toggles, leaving the pickers (accent, connection colour, default icons) and the placement knobs without controls. Plus Quick Capture (specced, zero code), the Claude-chat inspector (the panel ships; its body is empty), and global `⌘K` search over an FTS index.

#### v0.9.0 — SurfacePM Completion + Context Surfaces

SurfacePM's remaining reach — bidirectional tile conversion, the background Insert menu, embed banners, the remaining locks — plus the Homepage's final shape. The Contexts registry itself shipped early, so what rides here is its aggregate surfaces: **ContextView**, the **Linked-From** list, and a Space's own relation rows. All three are gated on the query consumer above.

#### v1.0.0 — Stabilization

No new features — polish, performance, and a release pass (signing, notarization, auto-update).

### Post-v1

No phase commitments. The catalog lives in `PommoraPRD.md` (the Prospects section) — inline `![[Embed]]` in page bodies (parked in the Swift build on a TextKit limitation the CM6 editor no longer has), sub-pages, independent UI titles, a graph view, sync, mobile, and a plugin system among them.
