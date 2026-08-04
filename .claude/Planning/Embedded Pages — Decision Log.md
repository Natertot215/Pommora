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
- **A-2:** [confirmed] Lone-line only — the embed resolves (and its menu appears) only when it is the line's sole content, so it can never clobber surrounding text. Mirrors the display-math lone-line model, trimming included: surrounding whitespace doesn't break lone-ness. Detection is a whole-doc, per-version derivation on that same pattern — the embed regex over lone lines, fence and table regions excluded, cached beside the other doc derivations — because the tile's StateField needs doc-wide ranges the viewport-scoped token pass can't supply. The token pass keeps styling non-lone occurrences inline, as it does today.
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
- **B-9:** [confirmed] The embed line is skip-over — the atomic range absorbs the line's boundaries so the caret can never rest on it, and no keystroke can break lone-ness from an invisible seat. The absorb's seams — an embed on the document's first or last line, two adjacent embeds — get proven with the executable harness before anything builds on them.
- **B-10:** [confirmed] Scroll-out rehydration rides the warm-page module tabs already use — one consolidated home, extended with a path-keyed detail slot the embeds read; the frontmatter-invalidation sweep covers it. Body freshness comes from the shared per-path save scheduler **writing through** to that slot — the tabs keep body freshness in serialized editor state, which embeds deliberately don't hold — so a returning tile rehydrates with the newest edited body from any host, no refetch, no stale-read race against a pending write. The accepted residual: an edit made inside an embed loses its own undo history once its tile scrolls far away — parking live React roots to preserve it is machinery a rare gesture doesn't buy.
- **B-11:** [confirmed] A page embeds at most **once per document**: the embed autocomplete omits already-embedded pages and the host page, the Page Source tree filters them out, and a manually typed duplicate simply doesn't resolve — the first occurrence in document order owns the tile. A *nested* tile holding an ancestor is fine — it's non-interactive by B-6, and each rehydration shows the newest saved-or-pending body through the write-through slot; live per-keystroke mirroring stays with the refresh-bus prospect.
- **B-12:** [confirmed] The `[[` autocomplete's mechanism extends to `![[` — today the panel's trigger pattern deliberately excludes it, so typing an embed by hand currently gets no completion; the embed reuses the same panel with B-11's filter.

#### C — Chrome & Signals

- **C-1:** [confirmed] Banner rule follows the page itself: a page with a configured banner shows it with the in-line title; a coverless page shows the hover breadcrumb instead. No per-embed storage. The embed's header is **display-only, banner-only in its affordances**: the banner renders with the page's title as static text over it, and neither is editable from the embed — the rename field stays a page-surface affordance (an in-embed rename would need the host's own `![[Title]]` re-resolved as part of the gesture, complexity the feature doesn't buy), and the add-banner strip stays behind too.
- **C-2:** [confirmed] The hover location display reuses `NavCrumbs` (centered, Collection › Set › Page), revealed on cursor hover at the same duration as the tile's accent-border tint reveal (`--duration-base`). The centered two-tone crumb treatment already exists preview-local (`.pgpreview-title` / `.pgpreview-crumbs` over the `.nav-path-*` classes, in `PagePreview/previewTabStrip.css`) — it hoists to the shared home in `Tabs/`, beside the tab-strip motion classes it already borrows, so the preview and the embed read one definition.
- **C-3:** [confirmed] The accent-border reveal is the signal, as on SurfacePM page-embed tiles — the chassis carries no blur and no separate focus ring.
- **C-4:** [confirmed] Signals match SurfacePM exactly: hover and editing share the accent stroke with no third step, and click-out mirrors SurfacePM's host-owned outside-pointerdown ending the edit.
- **C-5:** [confirmed] A deleted target degrades exactly as connections do today: the title leaves the live map, resolution fails, and the tile falls back to the inert dim token through the same live re-resolution that restyles a connection as its target appears or dies — zero extra machinery. The `.trash` deletion bundle preserves restore, and a restored page's tile returns the same way.

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

#### F — Adjacencies

- **F-1:** [confirmed] Embeds create **no link-graph edge**: the connections scanner excludes `![[` by design, so embedding B in A adds nothing to any connection accounting, and B's own wikilinks stay B's — resolved and clicked through the same connections API the SurfacePM tile already passes, never counted into A. A's Subfield stats read A's body string, which holds only the `![[B]]` line. The standing future call this leaves: when backlinks or a link graph arrive, whether an embed counts as a link (Obsidian says yes) is decided *then*, at the scanner — one deliberate inclusion, not a migration.
- **F-2:** [confirmed] Embed *targets* are **page-only by construction** — the resolution universe is the connections layer's page index, which holds `page` kinds alone, so a Task, Event, or container title can never resolve into a tile. Matches the Page Source tree's shape without a guard.
- **F-7:** [confirmed] The feature binds to **MarkdownPM, never to the Page surface**: detection, the tile field, the grips, and the menus are editor extensions gated by the same connections seam every mount already passes — every current `MarkdownEditor` host (page view, page embeds, SurfacePM markdown blocks) inherits embeds with nothing enabled, and a future Agenda body editor gets them the moment it mounts the editor with connections, exactly as it would get wikilinks. Nothing in this spec keys on the host being a Page.
- **F-3:** [confirmed] No embed behind a prefix — `> ![[B]]` isn't lone-line, so tiles can't live inside callouts or blockquotes, and block-dragging a tile into a box degrades it to the inert token. Prefix-aware lone-ness is a prospect, consistent with the already-deferred prefix-aware tables.
- **F-4:** [confirmed] On disk the syntax is exactly Obsidian's embed — a Nexus stays Obsidian-legible and Sapphire-compatible with no translation.
- **F-5:** [confirmed] Future sub-target and alias forms (`![[B#Heading]]`, `![[B^block]]`, `![[B|alias]]`) capture as titles that don't resolve, so they degrade to the inert token today and arrive later as additive parsing — nothing forecloses them.
- **F-6:** [confirmed] The rename cascade rewrites `[[` and `![[` in one sweep; the mention prefilter widens with the same regex change, and its two consumers use it only as a prefilter, so nothing else shifts.

### Core (must-have)

- Lone-line `![[Title]]` detection + resolution against the title map, rename-cascade coverage.
- The tile: shared chassis (handle-less variant), `PageEmbed` mount, click-to-edit, atomic caret-proofing, gutter-width box on a real line.
- Gutter grip with block drag + the context menu (Embed Page / Page Source / Delete).
- Banner-or-breadcrumb header rule.

#### Prospects (allowed later, not now)

- **Per-embed zoom toggle** — needs per-machine storage (a new `local_state` scope in `nexus.db` following the folds pattern); deferred to avoid the storage wiring now. Don't-foreclose: the tile reads its scale from one var, so a stored override slots in without restructure.
- **Interactive nested embeds** — depth-1 interactivity only for now.
- **Live refresh of an embed edited elsewhere** — the fetch-once model matches the page's own behavior today; a per-page refresh bus is a separate arc.
- **A record-backed "This page was deleted" tile** — the NexusRecord bundle carries everything such a display needs, but record surfaces are wholly unbuilt; the inert-token degrade is the shipped behavior. Don't-foreclose: the degrade path already runs through one resolution seam, so a record-aware branch slots in there.

#### Out of Scope

- Image rendering for `![[file.png]]` — the image seam stays reserved; such targets stay inert by failing page resolution, with no discrimination logic living in this feature.

#### Considered & Rejected

- **Table-style `block: true` replace widget** — rejected in favor of the real-line, callout-style box so the standard gutter-grip machinery and line-based width conventions apply.
- **Per-embed banner toggle (SurfacePM's parked entry-key design)** — rejected here; the page's own cover decides, keeping the markdown line the only persistence.
