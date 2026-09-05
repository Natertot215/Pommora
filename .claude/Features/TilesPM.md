## TilesPM

Pommora's composable dashboard layer. Any **tile host** — an entity that owns a tile document — renders a mosaic of draggable, resizable tiles holding real content: prose, a Page, or a view. Two hosts exist today, the Homepage and each Space. The layout engine beneath is `src/renderer/Tiles/`, a pure split-tree model with its own gestures; the tile bodies live alongside it in the same folder, and the engine knows nothing about what a tile holds or where the tree persists, and hosts supply both through one props seam.

### The Tile Document

Each host's document is one row in `nexus.db`, keyed by host and modeled by the shared contract in `src/shared/tiles.ts`: the `layout` (a stack of bands, each a split tree of rows and columns with tiles as leaves), the entries, and the host lock. Every entry is a reference to something that lives elsewhere, so the document creates nothing a Nexus would miss. An entry this build doesn't recognize, a dead page reference, or a layout leaf whose entry is gone holds its space until the user removes the tile, and the tree operations renormalize ratios and collapse single-child splits on every mutation, so the layout never needs repair.

Width and height obey different rules. A row's ratios always sum to one, so resizing a tile sideways is a splitter negotiation with its neighbor and a row always fills the surface; a tile's height is absolute pixels, so stretching one never deforms a neighbor, columns flow independently, and ragged row ends are legal while trapped holes are impossible.

### Tile Types

Three entry types exist, each declared once through the tile recipe rather than branched on: a shared table in `src/shared/tiles.ts` (`TILE_KINDS`) carries a kind's schema, whether it owns a file beside the document, and the link rows its handle menu offers; a renderer table in `src/renderer/Tiles/tileKinds.tsx` (`TILE_SURFACES`) carries the component that draws it and, where a tile stands for a page, which page; main's copy arm (`TILE_COPY` in `src/main/tiles.ts`) carries what a kind must re-mint when its raw entry is duplicated or its host folder is copied. The host's render, both menu presenters, the menu model, the Space seed, and main's lifecycle read these tables, so adding a kind is one entry in each and its component.

- **Markdown tile** — file-backed prose: a ULID-named `.md` in the host's own folder, with no frontmatter, no properties, and no search entry. It joins the link graph as a connection source only. Removing one trashes its file recoverably. This is the default new tile.
- **Page embed** — a reference to a real Page, rendered through the embed framework below. Removing the tile never touches the page.
- **View embed** — a reference to a container's saved view, either **Linked** (the container's own view) or **Custom** (a tile-owned copy of the config, taken at pick time and never synced back), rendered under a slim header whose switcher is an ActionBand of one segment per view. The tile's lock freezes configuration and view CRUD while view state — collapsing a band — still lands. Per-view actions live on a segment's right-click menu. A copy re-mints each view config's payload-local id.

A markdown tile can be converted into a page or view embed from its handle menu, trashing its backing file; a page embed can re-aim its Source afterward. Nothing converts back.

### The Embed Framework

One seam renders a Page inside any foreign surface: `PageTile` in `src/renderer/Tiles/Surfaces/`, used by dashboard tiles, MarkdownPM's `![[Title]]` widget, the Page Window, the NavWindow's page tabs, and the glance pane. The embed *is* a MarkdownPM view — a read-only editor at rest carrying every editor affordance, with editability flipped in place through a reconfigured compartment rather than a remount — so an edit made in an embed is a page edit flowing through the page's own debounced save. Its header follows the page: a configured banner renders as a band with the title as static text, and a coverless page carries no header, its location named by the handle menu instead.

Every tile uses the **tile chassis** (`.tile-chassis` in `Tiles/tile-base.css`), the one border-and-radius definition both hosts key onto, with an accent border that brightens under the pointer or while the caret is inside a page tile. Every tile also carries the **Scale ramp** (`SCALE_STEPS` in `src/shared/types.ts`, the same eight steps every zoom control in the app offers): a discrete factor set from the handle menu's Scale row, persisted on the entry, riding one inherited variable and animating on the standard beat, compounding the nexus-wide **Embed Scale** default. A page tile scales its text and editor glyphs while the tile-edge inset, the handle, and the resize edges hold fixed; a view tile scales its grid as a unit. Resizing a tile is a viewport change, never a scale change.

Two rules reach every embed. Any popup born inside a tile renders through a body-level portal, since a tile is a transformed ancestor. At rest a tile scrolls its own overflow and releases to the page at its bounds, so content that fits passes the wheel straight through; a tile holding a live edit contains its scroll.

### Surface Interaction

Creation is a right-click on the surface background: inside a ragged wedge the new tile fits flush under the tile above the click, and on open background it appends as a full-width band. Each tile's **drag handle** is a bordered chip notched into its left border: drag moves the tile, click or right-click opens the tile menu, whose rows are the tile's linking, style, and Scale entries over a pinned **Lock** footer. While a tile holds the caret, the handle reveals only near the top-left corner.

Resize is window-style on the tile's edges and corners: south stretches the tile alone, north negotiates with the tile stacked above, east and west move the row splitter, and boundaries magnetize to other tiles' edges. A full-width row always spans the surface. A per-tile **lock** holds position and size and dims the menu's mutating rows, while the footer stays live to unlock; **Borderless** hides the chassis until hover, drag, resize, or an open menu brings it back. A **host lock**, set from the host's settings surface, freezes every tile's position and size while content editing, the handle menu, and background-create stay live.

### Storage + Host Rules

The document loads per host when the host opens, never in the tree walk, and layout writes debounce on gesture end. Markdown-tile bodies write as pure Markdown with no frontmatter and no stamp, under a per-file lock; the watcher ignores host content folders while host configs stay watched.

---

#### Pending

- **The Homepage's standing** — whether it stays a tile host, hands the landing surface off, or goes away; a Space is a settled host either way.
- **The view-embed lock's reach** — the config lock and the per-tile lock write one key, so locking a view embed's configuration also freezes its position and size.
- **The Insert menu** — background right-click offering Page, View, or Tile through the shipped picker.
- **The container view-lock** — locking a Collection's or Set's views everywhere they're read; no implementation exists.

#### Prospects

- Widget tiles · per-host-kind tile rules · free-placement canvas mode · auto-grow markdown tiles · layout undo history · root-level hosts · search and inbound-link opt-in for markdown tiles.
