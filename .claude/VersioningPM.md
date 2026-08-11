## Pommora — Versioning

Pommora's path to v1.0.0. Scope is the **core 7** — data · properties · connections · markdown · navigation · table · cards — plus the deferred frontier. Numbers are soft; order and grouping firm up as each cluster lands.

`major.minor.patch` semver. **Minor (`v0.X.0`)** is a completed feature cluster; **patch (`v0.X.y`)** is a touch-up or additive extension on a shipped feature; **major (`vX.0.0`)** is reserved for `v1.0.0` (stabilization) and onward. The upcoming line is version-targeted, never date-bound.

### EXISTING IMPLEMENTATIONS

#### v0.5.0 — The Rebuild Baseline

The React + Electron build rebuilt the Swift paradigm from the ground up, reached parity, then passed it. The arc ran from a walking skeleton — one nexus walk over IPC into a Zustand store — through the headless data layer and desktop write path, the glass and drag design system, the MarkdownPM editor, the chrome and inspector, tables and Properties V2, the view-settings suite, SurfacePM's block surfaces, auto-scroll and the navigation surface, the multi-tab nexus, and page previews. The unified Subfield and scan-promote closed the rebuild at v0.5.0. Locked decisions and full detail per milestone live in [[HistoryPM]].

#### v0.5.x — The Baseline Hardened

Since the baseline: Cards as the second renderer with its interaction hardening and picker-host architecture; the certified cleanup campaign (one-walk mutations, shared interaction primitives); Contexts & Spaces — the registry model replacing the fixed three tiers, the shared floating-window chassis, and the filter authoring pane; the truing campaign against real code; one syntax for every Pommora-owned key, with operational state moved into `nexus.db`; the hardening campaign — one strict read-modify-write, the parallel walk, the guard audit, and the HOIST design-system consolidation; and the erasure campaigns — Swift parity removed wholesale, navigation persistence consolidated onto one `navigation.json` contract.

#### UPCOMING VERSIONS

The near-term structural queue — the store split and the Pages-in-DB storage-model session — rides `ContextPM.md`'s Pending Focuses rather than a version number; feature clusters resume below once those land. One prerequisite spans several clusters: Linked-From, backlinks, ContextView, and full-text search all need a content index, and none exists — its replacement gets written alongside the query layer that reads it, updating a row at a time, with the database, driver seam, and version handshake already in place for it.

#### v0.6.0 — The View Renderers

The remaining renderers — **List · Gallery · Calendar · Timeline** — over the shipped filter → group → sort pipeline. Table and Cards carry renderers; these four are registered types with none, and their picker tiles are inert. Each groups mechanically differently, so each carries its own grouping surface.

#### v0.7.0 — Agenda + Calendar

Building Agenda from a settled identity model and an empty schema: Tasks and Events are `.md` under their kind keys, their singleton folders are registered, and admission already recognizes them. What it needs is the field vocabulary, the tree membership, a selection kind, a detail surface, and CRUD that converges onto the page writers rather than a second serializer; an EventKit bridge (opt-in, bidirectional) follows.

#### v0.8.0 — Settings + Quick Capture + LLM Inspector + Search

The rest of the Settings editing UI — the window ships off the ribbon with its boolean toggles, leaving the pickers (accent, connection color, default icons) and the placement knobs without controls. Plus Quick Capture (specced, zero code), the Claude-chat inspector (the panel ships; its body is empty), and global `⌘K` search over an FTS index.

#### v0.9.0 — SurfacePM Completion + Context Surfaces

SurfacePM's remaining reach — bidirectional tile conversion, the background Insert menu, embed banners, the remaining locks — plus the Homepage's final shape. The Contexts registry shipped early, so what rides here is its aggregate surfaces: **ContextView**, the **Linked-From** list, and a Space's own relation rows, all three gated on the content index above.

#### v1.0.0 — Stabilization

No new features — polish, performance, and a release pass (signing, notarization, auto-update).

#### Post-v1

No phase commitments. The catalog lives in `PommoraPRD.md`'s Prospects — Sub-pages, independent UI titles, a graph view, sync, mobile, and a plugin system among them.

### Guidelines

**§EXISTING IMPLEMENTATIONS:** Old → New.
**§UPCOMING VERSIONS:** Most immediate → long-term.
