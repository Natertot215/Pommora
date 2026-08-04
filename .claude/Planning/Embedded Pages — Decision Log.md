## Embedded Pages (MarkdownPM) — Decision Log

### Frame

- **Purpose:** Render a real Page as an embedded tile inside a MarkdownPM document, authored with Obsidian's `![[Title]]` syntax, riding the shared Embed Framework SurfacePM already uses.
- **Core Value:** A page's content lives inline inside another page — readable and editable in place — without inventing a second page renderer or a second tile chrome.
- **Success Criteria:** Typing `![[Title]]` on its own line produces a live tile matching SurfacePM's embed treatment (minus the handle); the raw syntax line never shows; a caret near the tile can't break it; deletion happens through its menu or a deliberate spanning selection, never a stray boundary keystroke.

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
- **A-2:** [confirmed] Lone-line only — the embed resolves (and its menu appears) only when it is the line's sole content, so it can never clobber surrounding text. Mirrors the display-math lone-line model, trimming included: surrounding whitespace doesn't break lone-ness. Detection reads the existing token — which fence suppression already covers — gated by the lone-line check.
- **A-3:** [confirmed] The rename cascade extends to `![[` targets so a page rename can't break embeds. One-regex change: the scanner's two consumers use it only as a mention prefilter, so the blast radius is contained.
- **A-4:** [confirmed] Resolution is the only discriminator: a title that resolves to a page becomes a tile; anything else stays the inert token. No extension branch — an image target like `file.png` stays inert for free because no page holds that title, and dotted page titles (`Chapter 3.5`) embed without a special case.
- **A-5:** [confirmed] An unresolved target stays inert dim text and becomes a tile when its title resolves — mirroring phantom connections.

#### B — The Tile

- **B-1:** [confirmed] The tile mounts the existing `PageEmbed` — no new page renderer.
- **B-2:** [confirmed] Click-to-edit in place, exactly the SurfacePM treatment (an embed edit is a page edit through the page's own save path).
- **B-3:** [confirmed] Tile chrome is DRY-ed to SurfacePM's: hoist the chassis (currently inlined in `TileShell` + `surfacepm.css`) into a shared component; MarkdownPM takes a handle-less variant — the SurfacePM handle CSS is stripped here since the grip lives in the editor gutter.
- **B-4:** [confirmed] The embed rides a real `.cm-line` and takes the gutter-width box treatment callouts use — not a table-style block replace. The raw `![[Title]]` text is hidden and caret-proof (atomic), never live-preview: a caret above or beside the tile can't reveal or break the syntax.
- **B-5:** [confirmed] Default scale is `EMBED_SCALE` — no per-embed zoom control now.
- **B-6:** [confirmed] Nested embeds render but the sub-embed is fully non-interactive — no edit, no menu, no click-through. The cycle guard holds the **ancestor path set** carried down through the embed mounts — A → B → A is a cycle the same as A → A — and that same carried set is what depth-gating reads.
- **B-7:** [confirmed] The tile's decoration lives in its **own StateField**, the Tables shape minus `block: true` — a ViewPlugin-sourced decoration never reaches CM's height map, so off-screen tiles would under-report document height. The existing decoration plugin stays untouched.
- **B-8:** [confirmed] `blockModel` gains an `embed` kind on the math-ranges precedent, so a lone-line embed is its own block — its own grip, its own drag boundary — even typed directly under prose with no blank line. Without it the embed absorbs into the surrounding paragraph and D-1/D-2 have no grip to live on. The line's outer seams get the mirrored boundary-delete guards the table already carries in `editor/input.ts`, enforcing D-3's refusals from both directions.
- **B-9:** [open] Caret parking — arrow keys can rest the caret invisibly *on* the embed line (the atomic range's own edges are legal positions), where the next keystroke breaks lone-ness sight-unseen. Either the atomic range absorbs the line's boundaries or ArrowUp/Down get explicit routing over the tile.
- **B-10:** [open] Scroll-out lifecycle — CM destroys line DOM past its viewport margin, so a tile that scrolls far off-screen unmounts: refetch on return, and any edit made inside the embed loses its undo history. Cheap path: a per-path body cache so remounts rehydrate instead of racing a pending write. Full path: parking the React root outside the widget so `toDOM` re-attaches — real work, priced separately.
- **B-11:** [open] The same page embedded twice in one document — each tile holds its own doc and the per-path pending write is last-writer-wins, so editing both silently overwrites. Candidate rule: one *editable* tile per path per document, the second taking the lock treatment.

#### C — Chrome & Signals

- **C-1:** [confirmed] Banner rule follows the page itself: a page with a configured banner shows it with the in-line title; a coverless page shows the hover breadcrumb instead. No per-embed storage.
- **C-2:** [confirmed] The hover location display reuses `NavCrumbs` (centered, Collection › Set › Page), revealed on cursor hover at the same duration as the tile's accent-border tint reveal (`--duration-base`).
- **C-3:** [confirmed] The accent-border reveal is the signal, as on SurfacePM page-embed tiles — the chassis carries no blur and no separate focus ring.
- **C-4:** [open] Whether editing gets a treatment distinct from hover — SurfacePM fires the same accent stroke for both, so hover and "my keystrokes go here" read identically, and C-2 adds the breadcrumb on that same trigger. A third accent step is available in the existing ramp. The click-*out* seam (what ends an edit) also needs naming — SurfacePM's host owns it via its own editing state, which B-3's chassis hoist doesn't carry.

#### D — Menus & Deletion

- **D-1:** [confirmed] Creation affordance: "Embed Page ▸" in the rail grip's right-click menu, following the callout grip-menu mechanism — and the entry is **itself** the recursive Collections → Sets → Pages tree, so creation always lands an aimed embed. A bare "Embed Page" inserting `![[]]` would produce an unresolved token that A-5 keeps inert — no tile, no tile menu, nothing to re-aim it with. One tree builder serves this and D-2.
- **D-2:** [confirmed] An embedded tile's drag-handle menu carries "Page Source ▸" — the same tree, re-aiming the embed.
- **D-6:** [confirmed] The editor-menu suppression flag widens from callout-specific to any-hot-grip, so the generic native menu and a grip menu never pop together.
- **D-3:** [confirmed] Deletion happens through the tile's context menu or a deliberate spanning selection — the boundary backspace is refused.
- **D-4:** [confirmed] All of it OS-native: the grip menu and the "Page Source ▸" recursive tree ride the native-menu pattern the callout, table, and card menus already use.
- **D-5:** [confirmed] A selection spanning the tile deletes it like any content, and never collapses the tile into raw syntax — the widget stays rendered under selection.

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

- Image rendering for `![[file.png]]` — the image seam stays reserved; such targets stay inert by failing page resolution, with no discrimination logic living in this feature.

#### Considered & Rejected

- **Table-style `block: true` replace widget** — rejected in favor of the real-line, callout-style box so the standard gutter-grip machinery and line-based width conventions apply.
- **Per-embed banner toggle (SurfacePM's parked entry-key design)** — rejected here; the page's own cover decides, keeping the markdown line the only persistence.
