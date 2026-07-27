## SurfacePM

Pommora's composable dashboard layer: any **BlockHost** — an entity whose config carries the block document — renders a mosaic of draggable, resizable tiles holding real content. It's deliberately **host-agnostic**: the document load keys on host *identity* rather than kind. The layout engine beneath is **SurfacePM** ([[PommoraDND]]'s sibling; internals in `SurfacePM/README.md`).

### The Block Document

A host's config carries `layout` (SurfacePM's split tree of row/column bands with tiles as leaves), `blocks` (a tagged union of tile payloads), and `blocks_locked`, under the shared zod contract in `src/shared/blocks.ts`. Every write is a locked read-merge-write touching only its own keys, so foreign keys — the banner included — survive by construction. A Space's sidecar carries identity other writers own, so its merge is strict: an unreadable sidecar fails the save rather than clobbering it.

Robustness is repair-not-reject: unknown or foreign entries and dead references (a deleted page) render inert rather than being stripped, holding until the user removes the tile; an entry-less layout leaf holds its space invisibly; broken hand-edited values repair in place without wiping the document's survivors.

### Tile Types

- **Markdown block** — file-backed prose: a ULID-named `.md` in the host's own folder, no frontmatter, no properties, non-searchable. It joins the link graph as a connection *source* only — the ULID name is rename-proof by construction. Removing one trashes its file recoverably; the new block default.

- **Page embed** — a reference (`page_id`) to a real Page, rendered through the **shared embed framework** (below). Removing the tile never touches the page.

- **View embed** — a reference to a container's saved view (**Linked**) or a block-owned config (**Custom**), rendered under the slim view-chrome header — editable title, drag-reorderable view switcher, settings, config lock. The config is copied at pick time — Linked seeds from a saved view, Custom starts blank — never synced back, each bound to one source container. The lock freezes **configuration**, not **view state**: collapsing a group band still lands and is remembered, because it says how you're looking at the tile rather than how it's built. A refused config write returns an explicit refusal rather than a silent no-op, and a state write narrows to the state keys, so a refused gesture can't ride along on an allowed one.

Linking is the one conversion: a markdown tile links out to a Page or a view from the handle menu, its backing file trashing with it; a page embed can re-aim its Source afterward. Nothing converts back, and no conversion ever touches an embedded source.

### The Embed Framework

One seam renders a Page inside any foreign surface — SurfacePM tiles today, MarkdownPM's `![[Embed]]` later. The embed **is** the CM6 view: a read-only portal at rest carrying every MarkdownPM affordance, with editability flipped in place through a live-reconfigured compartment rather than a remount. An embed edit *is* a page edit, flowing through the page's own debounced save.

Both embed kinds size off **one knob** (`Embeds/embedScale.ts`): a page embed's px-fixed dimensions ride a scale var while its text zoom derives from that same knob on the editor's own curve; a view embed normalizes its grid onto the editor's text base before taking the zoom, so the two read at one text level. Embed zoom is a fixed amount; **resizing a tile is a viewport change, never a scale change**.

Two framework laws reach beyond blocks:

- **Popups escape the tile.** A tile is a `transform`ed ancestor, which re-anchors `position: fixed` descendants to itself, so any popup born inside an embed renders through a body-level portal.

- **Scroll is edge-release.** At rest a tile scrolls its own overflow and releases to the page at its bounds — content that fits passes the wheel straight through, and the text carries no I-beam. The tile holding a live edit contains its scroll instead.

### Surface Interaction

Creation is right-click on the surface background: inside a ragged **wedge** the new block fits flush to the row bottom under the tile above the click; on open background it appends as a full-width band. The **drag handle** is a bordered chip notched into the tile's left border (which curves around it, MarkdownPM's shared grip glyph inside): drag moves the block, click or right-click opens the block menu — the tile's linking, style, and scale rows plus **Duplicate** and a main-confirmed, trash-recoverable **Delete**, over a pinned **Lock** footer. While a tile holds the caret its handle reveals by pointer proximity to the top-left corner rather than whole-tile hover.

That footer's **per-tile lock** works on every tile type: a locked tile holds its position and size, takes no content or chrome edit, and dims the menu's mutating rows inert — the footer stays live so it can always unlock.

**Borderless** is a per-tile style: the chassis hides until you reach for it — border and notch return on border/handle hover, on drag or resize, and while the tile's handle menu is open, so the menu reads as attached to a visible tile.

A per-block **Scale** rides **every** tile type: a fixed ladder of discrete steps, default 1×, set from a dropdown off the handle menu's Scale row, where picking scrubs live without closing the dropdown. The factor persists on the entry, rides one inherited var, and animates on the standard beat. The **tile-edge→content inset holds fixed** while the content scales, and the drag handle and resize edges hold with it — manipulation chrome, not content. The *how* splits by tile: a markdown/page tile is **freeze-inset**, only its text and editor glyphs scaling in lockstep while the fold-gutter width and edge-fade hold; a view tile scales its **grid as a unit**, its own zoom compounding the Scale over the base density.

Resize is window-style on the tile's edges and corners: south stretches the tile alone (the page flows), north negotiates the stacked pair — including across the seam between two full-width bands — east/west move the row splitter, and boundaries magnetize to other tiles' edges near perfect alignment. Interior holes are impossible by construction; a full-width row always spans the surface. Blocks track pane toggles 1:1 (tile transitions gate off while the surface width animates), reflow on the Glide feel, and drops beside a block land flush at its height.

A **host lock**, set from the host's own settings surface, freezes every tile's position and size while content editing, the grab menu, and background-create stay live. It dims the same mutating rows, and the menu's footer reads a muted **Locked** in place of the per-tile toggle.

An embedded **page** signals itself with an accent border (accent at the secondary tint) under the pointer or while the caret is inside it — non-locked tiles only, yielding to the stronger resize accent at the edges. The border is the ambient cue; the handle menu carries the page's exact location.

### Storage + Host Rules

Two hosts carry a block document: the Homepage's `homepage.json` and a Space's own `_space.json`, both under `.nexus/` (shielded from other apps). The document loads per-host on open — never in the tree walk — and layout writes debounce on gesture end; the watcher ignores host content folders while the host configs stay watched, so block edits never cost a re-walk. Markdown-block bodies write pure (no frontmatter envelope, no stamp), locked per file.

#### Pending

- **The Homepage's standing** — it hosts a real block surface today as a development surface. Whether it stays a BlockHost, hands the landing surface off, or goes away entirely is undecided; a Space is a settled host either way.

- **The view-embed lock's reach** — the view-embed config lock and the per-tile lock write one key, so locking a view embed's configuration also freezes its position and size. Whether the two stay coupled — and what the lock should therefore read — is unsettled.

- **Page banners on embeds** — the banner-**on** state: the page's real banner image with its in-line title over it, toggled by a right-click menu in the embed's heading area (mirroring the view-embed chrome menus). The plain embed is the shipped banner-**off** default; the entry's `banner` / `title` stay wired.

- **The Insert menu** — background right-click offering Page / View / Block through the shipped picker, with the Link-Page search pane behind its Page branch. Navigation's per-nexus recents is a confirmed future consumer there, but the current drill picker works, so the swap is deferred.

- **The container view-lock** — locking a Collection's or Set's views everywhere they're read; the one lock still unbuilt.

- **Navigation surfaces for hosts** — parked by design.

#### Prospects

- Widget tiles · per-host-kind block rules · free-placement canvas mode · auto-grow markdown tiles · layout undo history · root-level hosts (breaking) · search + inbound-link opt-in for markdown blocks.
