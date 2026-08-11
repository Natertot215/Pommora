## Navigation
```
Navigation
├── The Navigation Layer
├── NavWindow
├── Toolbar Tabs
├── Back and Forward
├── NavView
├── Breadcrumb
├── Pending
└── Prospects
```

How you get from where you are to where you want to be — a **toolbar tab bar** holding the open working set, each tab with its own history and a footer breadcrumb for local moves, over a shared **Navigation layer** for the cross-tree jumps (recent, pinned, searched, favorited) the sidebar tree alone can't serve.

The main pane shows the **active tab's** entity; selecting one anywhere drives that tab, replacing its content on an unpinned tab and spawning a new one off a pinned tab. A per-tab history records each selection, and the footer breadcrumb shows the active tab's location.

### The Navigation Layer

The shared wayfinding store beneath every navigation surface — a per-Nexus, UI-agnostic store of recents, pins, and favorites, plus client-side title search.

- **Recents** — an auto history stream, most-recent-first, deduped, capped by a generous roll-off. A navigation records only when it actually opens a tab, whether a spawn or an in-place replace; re-surfacing an entity already open, stepping Back or Forward, and switching tabs record nothing. It records through the shared selection path, so anything that can open lands in recents.
- **Pins** — the durable, user-ordered working set. Pins are the pinned tabs (left-docked in the tab bar) and also float to the top of the NavWindow gallery — one working set surfaced in two places. Pinning a tab writes a pin; unpinning removes it.
- **Favorites** — the durable, explicitly-curated list. Mutated only by an explicit add or remove.

Everything the layer persists is a bare identity ref — `{kind, id}` — pins and favorites as ordered arrays in `.nexus/navigation.json` (array position is the order, alongside the NavView's banner pointer), recents as a device-local database row, since two machines interleaving one history has no correct answer. Every title, icon, and path resolves live against the current tree at the moment of use, so a rename or move — even while the app is closed — leaves nothing stale. An entry that no longer resolves is hidden at render but never deleted from storage, keeping a Nexus switch from silently wiping pins or favorites. The navigation file is hand-editable and follows the nexus, last-writer-wins; an outside edit to it refreshes the open app live.

**Search** is a client-side, title-based fuzzy scan over the in-memory tree, memoized per tree. A Context isn't itself a hit — it's the path crumb its Spaces resolve under.

### NavWindow

The summoned wayfinding overlay — a non-modal, movable, resizable floating glass panel on the shared **PreviewPane** surface (→ [[PagePreviewPM]]) that always opens centered; its size persists across opens, its position doesn't. It takes the toolbar's floating form — corner-pinned glyph clusters rather than a band — so its tab row can reach the window's top edge. A glass rail holding the Favorites list runs beside a main frame: a search field over a gallery of Recents cards, pins on top, each card resolving location, icon, and title live from the tree. It resizes from its corners and a rail split, blocks nothing behind it, and hands the caret to the search field on open. The sidebar ribbon's Navigation icon summons it, `⌘O` toggles it, and Escape or the window's × dismisses. Row and card actions live in a context menu.

Reorder drag differs by view mode: the **gallery** displaces, cards reflowing to open a slot — pins among pins, recents among recents, never across — while the **list** uses the sidebar's insertion-line drag. Only recents reorder in search — a result set has no stored order to drag against — and the rail's Style toggle governs its search results too: searching changes what is listed, never how it's drawn. Inert hits, whose kind has no click destination, have no card form and surface in List only.

The NavWindow is also tab 1 of the Page Preview's nav flavor — a perma-pinned map tab whose page tabs open beside it, tab-neutral to the app's own tabs (→ [[PagePreviewPM]]).

### Toolbar Tabs

A tab bar in the toolbar holding the open working set, each tab **warm** — it keeps its own scroll and editor undo, so flipping back lands where you left off with only one view mounted at a time.

- **Pinned tabs** dock left as compact, label-less entity icons, the full name revealing on hover; they are the pin set, persist, and are protected — navigating while a pinned tab is active opens a new tab rather than replacing it. **Unpinned tabs** sit to the right as scratch tabs, where navigating replaces the active one in place unless "Open New Tab" is used.
- **The full tab set persists per machine** — closing Pommora never resets the tabs; they reopen cold on relaunch, each machine keeping its own set. Warm view-state is session-only; heading folds re-fold from their durable per-page store.
- **Lifecycle** — closing the active tab focuses the most-recently-used tab; the close `×` shows only on unpinned tabs; a deleted entity's unpinned tab closes while its pinned tab render-hides, the pin staying stored. The last tab closing drops to NavView, and opening an entity already in a tab focuses that tab rather than duplicating it.
- **Interaction** — within-zone drag reorders, pinned among pinned and unpinned among unpinned; `Ctrl`+`Tab` cycles all tabs; a tab's right-click menu offers Pin/Unpin · Close. The `revealTabBarOnHover` knob can hide the bar when idle (→ [[ConfigurationPM]]).
- **Iconography** — tab icons resolve live like every nav surface: the Homepage tab wears the nexus photo, the home glyph only when none is set, and a NavView tab reads "New Tab" under the copy glyph.

### Back and Forward

Back and Forward walk per-tab history — each tab owns its own stack, and the toolbar arrows step the active tab, skipping deleted entities along the way. A history step re-selects without re-recording. History belongs to the unpinned strip — a pinned tab's content never changes in place, so it holds none and the arrows disable there. A tab's history targets persist with the set, so Back still works cold after relaunch; the warm state is session-only.

### NavView

The new-tab page — a full-window Recents **gallery or list** over a search bar. It is the empty state: a `+` opens it, a nexus with no open tabs defaults to it, and closing the last tab lands on it. NavView shares the gallery and list components with NavWindow but stays its own surface. It carries its own banner, falling back to the Homepage's when it has none and to a bare header when neither exists; the search field sits in the banner's title slot, so the search bar is the inline title. As a detail-pane resident, its List / Gallery toggle lives in the detail-pane Subfield footer (→ [[SubfieldPM]]). Search always renders as gallery cards here — the toggle switches only the recents/empty view. The list is reorderable and shows the pinned group above recents, recents dragging on the shared drop-line. The NavWindow's shared-toolbar scan promotes its map flavor into NavView, deduped and carrying the view mode once (→ [[PagePreviewPM]]).

**View mode persists per surface.** NavWindow's List / Gallery choice and NavView's are separate, each stored per-Nexus — flipping one never moves the other, and both survive relaunch.

### Breadcrumb

The footer carries a breadcrumb of the active tab's container path, plus a dimmed forward ghost crumb for the last-visited Page within the open container (→ [[SubfieldPM]]).

### Pending

- **NavPane** — the toolbar Navigation button's dropdown, a blank placeholder on the shared beak-glass menu surface at a fixed height. Its content is undecided.
- **Open design** — the NavWindow's Figma gallery form. Whether the rail as built is the intended rail or a stand-in has no ruling; nor does whether the shipped hover pin marker settles the row marker. List rows carry no current-item treatment; gallery cards do.
- **Agenda is unsearchable** — Tasks and Events are absent from the tree the index builds from, and no selection kind opens one. Both wait on Agenda joining the walk; the persistence layer admits their refs, and the inert-row rendering exists.
- **Body and full-text search** waits on a SQLite FTS layer that doesn't exist.

### Prospects

- Drag-to-pin across the tab divider, and dragging a tab out into its own window.
