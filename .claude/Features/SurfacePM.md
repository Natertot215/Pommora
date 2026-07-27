## SurfacePM

Pommora's composable dashboard layer: any **BlockHost** — an entity whose config carries the block document — renders a mosaic of draggable, resizable tiles holding real content. The system is deliberately **host-agnostic**: the document load keys on host *identity* rather than kind, so every host renders the same surface off its own config. The layout engine beneath it is **SurfacePM** (→ [[PommoraDND]]'s sibling; engine internals in `SurfacePM/README.md`); this doc is the durable spec of the block system itself.

### The Block Document

A host's config carries two modeled keys plus a lock: `layout` (SurfacePM's split tree — bands of row/column splits with tiles as leaves), `blocks` (a tagged union of tile payloads), and `blocks_locked` for the host lock. The shared zod contract lives in `src/shared/blocks.ts`; every write is a locked read-merge-write that touches only its own keys, so foreign keys — the banner included — survive by construction. A Space's sidecar carries identity other writers own, so its merge is strict: an unreadable sidecar fails the save rather than clobbering it down to a near-empty object.

Robustness is repair-not-reject at every level: unknown or foreign tile entries are preserved and rendered inert (never stripped, never crashing the host); a layout leaf with no entry holds its space invisibly; a hand-edit's broken value repairs (heights floor, ratios renormalize, unrecognizable nodes drop) without ever wiping the document's survivors; dead references (a deleted page) render inert until the user removes the tile.

### Tile Types

- **Markdown block** — file-backed prose: a ULID-named `.md` in the host's own folder, no frontmatter, no properties, non-searchable. It joins the link graph as a connection *source* only (nothing links to it; the ULID name is rename-proof by construction). Removing one trashes its file recoverably; the new block default.

- **Page embed** — a reference (`page_id`) to a real Page, rendered through the **shared embed framework** (below). Removing the tile never touches the page.

- **View embed** — a reference to a container's saved view (**Linked**) or a block-owned config (**Custom**), rendered under the slim view-chrome header: an editable title over a drag-reorderable view switcher, its own settings pane, and a footer config lock. The config is copied at pick time — Linked seeds from a saved view, Custom starts blank — never synced back, each bound to one source container. The lock freezes **configuration**, not **view state**: collapsing a group band still lands and is still remembered, because it says how you're looking at the tile rather than how it's built. A refused config write comes back as an explicit refusal rather than a silent no-op, and a state write narrows to the state keys on the way through, so a gesture the lock refused can't ride along on the one it allows.

Linking is the one conversion: a markdown tile links out to a Page or a view from the handle menu, and its backing file trashes recoverably; a page embed can re-aim its Source afterward. Nothing converts back, and no conversion ever touches an embedded source.

### The Embed Framework

One seam renders a Page inside any foreign surface — SurfacePM tiles today, MarkdownPM's `![[Embed]]` later. The embed **is** the CM6 view: a read-only portal at rest carrying every MarkdownPM affordance (decorations, gutter grips, fold chevrons, wiki-link autocomplete), with editability flipped in place through a live-reconfigured compartment — entering edit is a facet change on the same view, never a remount. An embed edit *is* a page edit, flowing through the page's own debounced save.

Both embed kinds size off **one knob** (`Embeds/embedScale.ts`): a page embed's px-fixed dimensions — glyphs, gutter, chrome — ride a scale var while its text zoom derives from that same knob on the editor's own curve, and a view embed normalizes its grid onto the editor's text base before taking the zoom, so the two kinds read at one text level. Embed zoom is a fixed amount; **resizing a tile is a viewport change, never a scale change**.

Two framework laws with reach beyond blocks:

- **Popups escape the tile.** A tile is a `transform`ed ancestor, which re-anchors `position: fixed` descendants to itself — so any popup born inside an embed renders through a body-level portal, never in the tile's subtree.

- **Scroll is edge-release.** At rest a tile scrolls its own overflow and releases to the page at its bounds — content that fits passes the wheel straight through, and the text carries no I-beam. The tile holding a live edit contains its scroll instead, so an edit can't leak it to the page.

### Surface Interaction

Creation is right-click on the surface background: inside a ragged **wedge** the new block fits flush to the row bottom under the tile above the click; on open background it appends as a full-width band. The **drag handle** is a bordered chip notched into the tile's left border (the border curves around it; MarkdownPM's shared grip glyph inside) — drag moves the block, click or right-click opens the block menu — **Link View / Link Page** on a fresh markdown tile (**Source** once it's an embed) · **Style ▸** (Bordered / Borderless) · **Scale ▸** (per-tile zoom, below) · **Duplicate** · **Delete** (main-confirmed, trash-recoverable) — over a pinned **Lock** footer. While a tile holds the caret its handle reveals by pointer proximity to the top-left corner rather than whole-tile hover.

That footer's **per-tile lock** works on every tile type: a locked tile holds its position and size, takes no content or chrome edit, and dims the menu's mutating rows inert — the footer stays live so it can always unlock.

**Borderless** is a per-tile style: the chassis hides until you reach for it — border and notch return on border/handle hover, while dragging or resizing, and while the tile's own handle menu is open, so the menu reads as attached to a visible tile.

A tile carries a per-block **Scale** — a fixed ladder of discrete steps, default 1×, on **every** tile type — set from a dropdown off the handle menu's Scale row: its trailing value is the trigger, the current step wears an accent check, and picking scrubs live (the dropdown stays open; a click anywhere else closes it). The factor persists on the entry (absent = 1×), rides one inherited var, and animates on the standard beat. In every case the **tile-edge→content inset holds fixed** while the content scales, and the drag handle + resize edges stay fixed too (manipulation chrome, not content). The *how* splits by tile: a markdown/page tile is **freeze-inset** — only the text and editor glyphs (fold chevron, drag grips, checkbox) scale, in lockstep, while the fold-gutter width and edge-fade hold; a view tile scales its **grid as a unit** (the grid's own zoom compounds the Scale over the base density), so columns and rows shrink together within the frozen inset.

Resize is window-style on the tile's own edges and corners: south stretches the tile alone (the page flows), north negotiates the stacked pair — including across the seam between two full-width bands — east/west move the row splitter, and boundaries magnetize to other tiles' edges near perfect alignment. A full-width row always spans the surface; interior holes are impossible by construction. Blocks track pane toggles 1:1 (tile transitions gate off while the surface width animates), reflow on the Glide feel, and drops beside a block land flush at its height.

A **host lock**, set from the host's own settings surface, freezes every tile's position and size — no drag, no resize — while content editing, the grab menu, and background-create stay live. It dims the handle menu's mutating rows inert, and the menu's footer reads a muted **Locked** in place of the per-tile toggle.

An embedded **page** signals itself with an accent border (accent at the secondary tint) while the pointer is over it or the caret is inside it — non-locked tiles only, and it yields to the stronger resize accent at the edges. The border is the ambient "this is an embed" cue; the handle menu carries the page's exact location.

### Storage + Host Rules

Two hosts carry a block document: the Homepage's `homepage.json` and a Space's own `_space.json` — both under `.nexus/` (shielded from other apps), with each host's markdown tiles in the host's own folder. The document loads per-host on open — never in the tree walk — and layout writes debounce on gesture end; the watcher ignores host content folders while the host configs stay watched, so block edits never cost a re-walk. Markdown-block bodies write pure (no frontmatter envelope, no stamp), locked per file.

#### Pending

- **The Homepage's standing** — it hosts a real block surface today, as a development surface. Whether it stays a BlockHost, hands the landing surface to something else, or goes away entirely is undecided; a Space is a settled host either way.

- **The view-embed lock's reach** — the view-embed config lock and the per-tile lock write one key, so locking a view embed's configuration also freezes its position and size. Whether the two stay coupled — and what the lock should therefore read — is unsettled.

- **Page banners on embeds** — the banner-**on** state: the page's real banner image with its in-line title over it, toggled by a right-click context menu in the embed's heading area (mirroring the view-embed chrome menus). The banner-**off** default is the plain embed — its accent-border hover signal ships (see Surface Interaction); the entry's `banner` / `title` stay wired.

- **The Insert menu** — background right-click offering Page / View / Block through the shipped picker, with the Link-Page search pane behind its Page branch. The Navigation layer's per-nexus recents is a confirmed future consumer — a `page`-kind-filtered recents view behind the Page branch — but the current drill picker works, so the swap is deferred rather than urgent.

- **The container view-lock** — locking a Collection's or Set's views everywhere they're read; the one lock still unbuilt.

- **Navigation surfaces for hosts** — parked by design.

#### Prospects

- Widget tiles · per-host-kind block rules · free-placement canvas mode · auto-grow markdown tiles · layout undo history · root-level hosts (breaking) · search + inbound-link opt-in for markdown blocks.
