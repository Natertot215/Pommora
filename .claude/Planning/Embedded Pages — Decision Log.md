## Embedded Pages (MarkdownPM) — Decision Log

### Frame

- **Purpose:** Render a real Page as an embedded tile inside a MarkdownPM document, authored with Obsidian's `![[Title]]` syntax, riding the shared Embed Framework SurfacePM already uses.
- **Core Value:** A page's content lives inline inside another page — readable and editable in place — without inventing a second page renderer or a second tile chrome.
- **Success Criteria:** Typing `![[Title]]` on its own line produces a live tile matching SurfacePM's embed treatment (minus the handle); the raw syntax line never shows; a caret near the tile can't break it; deletion happens only through its menu.

### Sources

- [[SurfacePM]] — defines the shared Embed Framework, explicitly anticipating MarkdownPM's `![[Embed]]`; documents the tile chassis, accent-border signal, and per-block Scale.
- [[MarkdownPM]] — the table widget (the not-live-preview block precedent), callouts (gutter-width box on real lines, atomic hidden prefix), display math (the lone-line construct model), grip/menu conventions.
- [[PagePreviewPM]] — the centered breadcrumb title precedent.
- `src/renderer/src/Embeds/PageEmbed.tsx` — the reusable page-in-a-box: self-fetching by path, read-only CM6 portal, click-to-edit via live compartment flip, shared debounced autosave.
- `src/renderer/src/Embeds/embedScale.ts` — `EMBED_SCALE` (0.9), the one tunable both embed kinds derive from.
- `src/renderer/src/SurfacePM/SurfaceView.tsx` + `surfacepm.css` — the tile chassis (inlined in `TileShell`; border, radius, accent reveal on `--duration-base`).
- `src/renderer/src/MarkdownPM/detect/index.ts` — `imageEmbedRegex` already tokenizes `![[…]]` as an inert token.
- `src/shared/connections.ts` — the wikilink scanner's negative lookbehind excludes `![[`; rename cascade does not reach embeds today.
- `src/renderer/src/Blocks/BlockSurface.tsx` — `pagePickerItems`, the existing React Collections → Sets → Pages drill; `src/main/cardMenu.ts` — the native recursive container-tree submenu precedent.
- `src/renderer/src/Navigation/NavList.tsx` — `NavCrumbs`, the icon-and-title breadcrumb the floating preview already centers as its title.
- `src/renderer/src/Tabs/warmCache.ts` + `store.ts` — background tabs hold no live trees; a deactivated tab's whole view unmounts.

### Decisions

#### A — Syntax & Resolution

- **A-1:** [confirmed] Obsidian syntax `![[Title]]`, creatable by manual typing.
- **A-2:** [confirmed] Lone-line only — the embed resolves (and its menu appears) only when it is the line's sole content, so it can never clobber surrounding text. Mirrors the display-math lone-line model.
- **A-3:** [confirmed] The rename cascade extends to `![[` targets so a page rename can't break embeds.
- **A-4:** [confirmed] `![[…]]` discriminates by target: a file-extension target stays the inert image-reserved token; a resolving page title becomes a tile.
- **A-5:** [confirmed] An unresolved target stays inert dim text and becomes a tile when its title resolves — mirroring phantom connections.

#### B — The Tile

- **B-1:** [confirmed] The tile mounts the existing `PageEmbed` — no new page renderer.
- **B-2:** [confirmed] Click-to-edit in place, exactly the SurfacePM treatment (an embed edit is a page edit through the page's own save path).
- **B-3:** [confirmed] Tile chrome is DRY-ed to SurfacePM's: hoist the chassis (currently inlined in `TileShell` + `surfacepm.css`) into a shared component; MarkdownPM takes a handle-less variant — the SurfacePM handle CSS is stripped here since the grip lives in the editor gutter.
- **B-4:** [confirmed] The embed rides a real `.cm-line` and takes the gutter-width box treatment callouts use — not a table-style block replace. The raw `![[Title]]` text is hidden and caret-proof (atomic), never live-preview: a caret above or beside the tile can't reveal or break the syntax.
- **B-5:** [confirmed] Default scale is `EMBED_SCALE` — no per-embed zoom control now.
- **B-6:** [confirmed] Nested embeds render but the sub-embed is fully non-interactive — no edit, no menu, no click-through. A cycle guard stops self-reference.

#### C — Chrome & Signals

- **C-1:** [confirmed] Banner rule follows the page itself: a page with a configured banner shows it with the in-line title; a coverless page shows the hover breadcrumb instead. No per-embed storage.
- **C-2:** [confirmed] The hover location display reuses `NavCrumbs` (centered, Collection › Set › Page), revealed on cursor hover at the same duration as the tile's accent-border tint reveal (`--duration-base`).
- **C-3:** [confirmed] The accent-border reveal is the focus signal, as on SurfacePM page-embed tiles — the chassis carries no blur and no separate focus ring.

#### D — Menus & Deletion

- **D-1:** [confirmed] Creation affordance: "Embed Page" in the drag-handle menu. *(Placement scope — which grips carry the menu — still open, D-4.)*
- **D-2:** [confirmed] An embedded tile's drag-handle menu carries "Page Source ▸" — a tree of Collections → Sets → Pages that re-aims the embed.
- **D-3:** [confirmed] The embed is deletable only via its context menu.
- **D-4:** [open] Where "Embed Page" lives — a new menu on every rail grip, an entry in the editor right-click Insert submenu, or both.
- **D-5:** [open] Menu system for the grip menu — OS-native (the callout/table grip precedent, native tree via the cardMenu pattern) vs the React PickerMenu drill.
- **D-6:** [open] The deletion guard's reach — whether a selection spanning the tile (⌘A → Delete, cut) may remove it, with only the boundary backspace refused.

#### E — Performance & Lifecycle

- **E-1:** [confirmed] No hot embeds outside the active tab — already guaranteed: a background tab's whole view unmounts and only warm snapshots persist, so embeds die with their host view. No new lifecycle machinery.
- **E-2:** [confirmed] `PageEmbed` fetches once per path and holds no watcher subscription — no on-every-X work.

### Core (must-have)

- Lone-line `![[Title]]` detection + resolution against the title map, rename-cascade coverage.
- The tile: shared chassis (handle-less variant), `PageEmbed` mount, click-to-edit, atomic caret-proofing, gutter-width box on a real line.
- Gutter grip with block drag + the context menu (Embed Page / Page Source / Delete).
- Banner-or-breadcrumb header rule.

#### Prospects (allowed later, not now)

- **Per-embed zoom toggle** — needs per-machine storage (a new `local_state` scope in `nexus.db` following the folds pattern); deferred to avoid the storage wiring now. Don't-foreclose: the tile reads its scale from one var, so a stored override slots in without restructure.
- **Interactive nested embeds** — depth-1 interactivity only for now.
- **Live refresh of an embed edited elsewhere** — the fetch-once model matches the page's own behavior today; a per-page refresh bus is a separate arc.

#### Out of Scope

- Image rendering for `![[file.png]]` — the image seam stays reserved and inert; this feature only discriminates against it.

#### Considered & Rejected

- **Table-style `block: true` replace widget** — rejected in favor of the real-line, callout-style box so the standard gutter-grip machinery and line-based width conventions apply.
- **Per-embed banner toggle (SurfacePM's parked entry-key design)** — rejected here; the page's own cover decides, keeping the markdown line the only persistence.
