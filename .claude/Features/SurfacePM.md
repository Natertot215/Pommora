## SurfacePM

Pommora's composable dashboard layer: any **BlockHost** — an entity that owns a block document — renders a mosaic of draggable, resizable tiles holding real content. It's **host-agnostic**: the document load keys on host *identity* rather than kind. The layout engine beneath is **SurfacePM**, [[PommoraDND]]'s sibling.

### The Block Document

A block document — the `layout` (a split tree of row and column bands with tiles as leaves), the entries, and the host lock — is one row in `nexus.db`, keyed by host, under the shared zod contract. It is an arrangement of things that live elsewhere: every entry is a reference, so the document creates nothing a Nexus would miss, and nothing an external writer touches can leave a host unrenderable. Reading and writing the row are one synchronous pair. The host's own sidecar keeps only identity and appearance.

Robustness is render-inert rather than strip: an entry this build doesn't recognize, a dead page reference, and a layout leaf whose entry is gone all hold their space until the user removes the tile. The layout itself needs no repair — the ops renormalize ratios and collapse single-child splits on every mutation, and the boundary rejects a malformed tree before it can be stored.

### Tile Types

- **Markdown block** — file-backed prose: a ULID-named `.md` in the host's own folder, no frontmatter, no properties, non-searchable. It joins the link graph as a connection *source* only — the ULID name is rename-proof. Removing one trashes its file recoverably; the new block default.
- **Page embed** — a reference to a real Page, rendered through the **shared embed framework** below. Removing the tile never touches the page.
- **View embed** — a reference to a container's saved view (**Linked**) or a block-owned config (**Custom**), rendered under the slim view-chrome header. The config is copied at pick time and never synced back, each bound to one source container. The lock freezes **configuration**, not **view state**: collapsing a group band still lands and is remembered, because it says how you're looking at the tile rather than how it's built. A refused config write returns an explicit refusal, and a state write narrows to the state keys.

The header's switcher is an **ActionBand** mount (→ `DesignSystemPM.md`): one segment per view, titles collapsing to icon-only through the shared label morph, the segment stroke wearing the view's chip color when one is set. The heading itself hides in two phases on that same timing — the title slides left, *then* its space collapses upward; revealing runs the phases in reverse. The heading's icon toggle rides the Detail header's own title-icon reveal. Per-view actions live on the segment's right-click menu — rename lands in place auto-sized to the typed text, the icon and color pickers drop from the segment itself, and the title toggle routes through the same command the area menu fires. Alignment inside the tile follows one law: **card grids sit on the header inset** (the pill-and-divider line, zoom divided out since that line lives outside the grid's zoom), while **disclosure-band headings of both view kinds share the table's gutter anchor, glyph-aligned rather than box-aligned** — the table floats its band chevron into the lane so its glyph leads, cards keep the chevron in flow, and the cards lead subtracts that cluster inside the zoom so the folder glyphs coincide at any block zoom.

Linking is the one conversion: a markdown tile links out to a Page or a view from the handle menu, its backing file trashing with it; a page embed can re-aim its Source afterward. Nothing converts back, and no conversion ever touches an embedded source.

### The Embed Framework

One seam renders a Page inside any foreign surface — SurfacePM tiles, and MarkdownPM's `![[Title]]` embeds (→ [[MarkdownPM]] §II. Embeddings). The embed **is** the CM6 view: a read-only portal at rest carrying every MarkdownPM affordance, with editability flipped in place through a live-reconfigured compartment rather than a remount. An embed edit *is* a page edit, flowing through the page's own debounced save.

A page embed's header follows the page itself: a configured banner renders as a band with the title as static text (change/remove kept on the band's own menu); a coverless page carries no header here — the handle menu names the location. Both embed kinds size off **one knob**: a page embed's fixed dimensions ride a scale var while its text zoom derives from that same knob on the editor's own curve; a view embed normalizes its grid onto the editor's text base before taking the zoom, so the two read at one text level. **Resizing a tile is a viewport change, never a scale change.**

Two framework laws reach beyond blocks:

- **Popups escape the tile.** A tile is a `transform`ed ancestor, which re-anchors `position: fixed` descendants to itself, so any popup born inside an embed renders through a body-level portal.

- **Scroll is edge-release.** At rest a tile scrolls its own overflow and releases to the page at its bounds — content that fits passes the wheel straight through, and the text carries no I-beam. The tile holding a live edit contains its scroll instead.

### Surface Interaction

Creation is right-click on the surface background: inside a ragged **wedge** the new block fits flush to the row bottom under the tile above the click; on open background it appends as a full-width band. The **drag handle** is a bordered chip notched into the tile's left border, which curves around it: drag moves the block, click or right-click opens the block menu, whose pinned **Lock** footer sits under the tile's linking, style, and scale rows. While a tile holds the caret its handle reveals by pointer proximity to the top-left corner rather than whole-tile hover.

That footer's **per-tile lock** works on every tile type: a locked tile holds its position and size, takes no content or chrome edit, and dims the menu's mutating rows inert — the footer stays live so it can always unlock.

**Borderless** is a per-tile style: the chassis hides until you reach for it, border and notch returning on hover, on drag or resize, and while the handle menu is open, so the menu reads as attached to a visible tile.

A per-block **Scale** rides **every** tile type: a fixed ladder of discrete steps set from the handle menu's Scale row, where picking scrubs live without closing the dropdown. The factor persists on the entry, rides one inherited var, and animates on the standard beat. The **tile-edge→content inset holds fixed** while the content scales, and the drag handle and resize edges hold with it — manipulation chrome, not content. The *how* splits by tile: a markdown or page tile is **freeze-inset**, only its text and editor glyphs scaling while the fold-gutter width and edge-fade hold; a view tile scales its **grid as a unit**, its own zoom compounding the Scale over the base density.

Resize is window-style on the tile's edges and corners: south stretches the tile alone and the page flows, north negotiates the stacked pair — including across the seam between two full-width bands — east and west move the row splitter, and boundaries magnetize to other tiles' edges near perfect alignment. A full-width row always spans the surface, so interior holes cannot form. Blocks track pane toggles 1:1, tile transitions gating off while the surface width animates.

A **host lock**, set from the host's settings surface, freezes every tile's position and size while content editing, the grab menu, and background-create stay live. The handle menu's mutating rows dim inert, and its footer reads a muted **Locked** in place of the per-tile toggle.

An embedded **page** signals itself with an accent border under the pointer or while the caret is inside it — non-locked tiles only, yielding to the stronger resize accent at the edges. The border is the ambient cue and rides the shared tile chassis both hosts key onto; SurfacePM's location carrier is the handle menu (MarkdownPM's is its hover breadcrumb).

### Storage + Host Rules

Two hosts carry a block document: the Homepage singleton and each Space, identified by their own sidecars under `.nexus/`. The document loads per-host on open — never in the tree walk — and layout writes debounce on gesture end; the watcher ignores host content folders while host configs stay watched (→ [[ArchitecturePM]]). Markdown-block bodies write pure, with no frontmatter envelope and no stamp, locked per file.

### Pending

- **The Homepage's standing** — it hosts a real block surface. Whether it stays a BlockHost, hands the landing surface off, or goes away entirely is undecided; a Space is a settled host either way.
- **The view-embed lock's reach** — the view-embed config lock and the per-tile lock write one key, so locking a view embed's configuration also freezes its position and size. Whether the two stay coupled — and what the lock should therefore read — is unsettled.
- **The Insert menu** — background right-click offering Page / View / Block through the shipped picker, with the Link-Page search pane behind its Page branch. Navigation's per-nexus recents is a confirmed future consumer, but the current drill picker works, so the swap is deferred.
- **The container view-lock** — locking a Collection's or Set's views everywhere they're read; the one lock with no implementation behind it.
- **Navigation surfaces for hosts** — parked by design.

### Prospects

- Widget tiles · per-host-kind block rules · free-placement canvas mode · auto-grow markdown tiles · layout undo history · root-level hosts (breaking) · search + inbound-link opt-in for markdown blocks.
