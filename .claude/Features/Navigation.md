## Navigation

How you get from where you are to where you want to be — a **toolbar tab bar** holding your open working set, each tab with its own history and a footer breadcrumb for local moves, over a shared **Navigation layer** for the cross-tree jumps (recent, pinned, searched, favorited) the sidebar tree alone can't serve.

The main pane shows the **active tab's** entity; selecting one in the sidebar, a table, or a breadcrumb drives that tab (replacing its content on an unpinned tab, spawning a new one off a pinned tab). A per-tab history records each selection, and the footer breadcrumb shows the active tab's location. Above the tab bar sits the Navigation layer: a per-Nexus, UI-agnostic store of recents, pins, and favorites, plus client-side title search — every surface below reads that one source in a different shape.

### The Navigation Layer

The shared wayfinding store beneath every navigation surface — built once, read everywhere. Three things live in it:

- **Recents** — an auto history stream, most-recent-first, deduped, capped by a generous roll-off. A navigation records only when it actually opens a tab, whether that's a spawn or an in-place replace; re-surfacing an entity already open, stepping Back or Forward, and switching tabs all record nothing. It records through the same selection path the sidebar uses, so anything you can open lands in recents.

- **Pins** — the durable, user-ordered working set, stored one file per pin under `.nexus/pins/`. Pins **are** the pinned tabs (left-docked in the tab bar) and also float to the top of the NavWindow gallery — one working set surfaced in two places. Pinning a tab writes a pin; unpinning removes it.

- **Favorites** — the durable, explicitly-curated list. Mutated only by an explicit add / remove / reorder, never automatically.

Entries store only their identity (kind + id + path) — every title, icon, and location is resolved **live** against the current tree at render, so a rename or move is always current and never cached stale. An entry that no longer resolves is hidden at render but never deleted from storage, so a Nexus switch can't silently wipe pins or favorites. Recents, pins, and favorites all **sync** (per-Nexus, last-writer-wins) so they follow you across machines.

**Search** is a client-side scan over the in-memory tree, title-based: a fuzzy match across the Homepage, every Collection, Set, Page, and Space, plus a cached Agenda snapshot so Tasks and Events are findable. A Context isn't itself a hit — it's the path crumb its Spaces resolve under. The index is memoized per tree, so typing filters without re-walking it.

### Features

#### II. NavWindow

The summoned wayfinding overlay — a non-modal, movable, resizable floating glass panel on the shared **PreviewPane** surface (→ [[PagePreview]]) that always opens centered; its size persists across opens, its position doesn't. It takes the toolbar's **floating** form — corner-pinned glyph clusters rather than a band — so its tab row can reach the window's top edge. A glass rail (the Favorites list, over a List / Gallery toggle) runs beside a main frame: a search field over a gallery of Recents cards (pins on top), each card resolving location + icon + title live from the tree. It resizes from four corners plus a rail split, blocks nothing behind it, and hands the caret to the search field on open. The sidebar ribbon's Navigation icon summons it, `⌘O` (rebindable via the `commands` map) toggles it, and Escape or the window's × dismisses. Row and card actions — open, Open in New Tab, Open in Preview, pin, favorite, remove — live in a context menu. The NavWindow is also tab 1 of the Page Preview's nav flavor: a perma-pinned map tab whose page tabs open beside it, tab-neutral to the app's own tabs → [[PagePreview]].

Reorder drag differs by the view mode inside NavWindow: the **gallery** displaces (cards reflow to open a slot — pins among pins, recents among recents, never across); the **list** uses the sidebar's insertion-line drag (a drop-line indicator between rows). The general rule — grid surfaces displace, row surfaces show an insertion line.

#### II. Toolbar Tabs

The navigation model: a tab bar in the toolbar holding your open working set, each tab **warm** — it keeps its own scroll and editor undo while you're away, so flipping back lands you where you left off with only one view mounted at a time.

- **Pinned tabs** dock left as compact, label-less entity icons (the full name reveals on hover); they are the pin set, persist, and are *protected* — navigating while a pinned tab is active opens a new tab rather than replacing it. **Unpinned tabs** sit to the right as scratch tabs — navigating replaces the active one in place unless "Open in New Tab" is used.

- **The full tab set persists and syncs** — closing Pommora never resets your tabs; they reopen (cold) on relaunch and travel across devices. Warm view-state (scroll, undo) is session-only; heading folds re-fold from their durable per-page store.

- **Lifecycle:** closing the active tab focuses the most-recently-used tab; the close `×` shows only on unpinned tabs (unpin first to close a pin); a deleted entity's unpinned tab closes while its pinned tab render-hides (the pin file stays); the last tab closing drops to NavView. Opening an entity already in a tab focuses that tab — never a duplicate.

- **Interaction:** within-zone drag reorders (pinned among pinned, unpinned among unpinned); `Ctrl`+`Tab` / `Ctrl`+`Shift`+`Tab` cycles all tabs; a tab's right-click menu offers Pin/Unpin · Close. A reveal-on-hover setting can hide the bar when idle.

- **Iconography:** tab icons resolve live like every nav surface — the Homepage tab wears the nexus photo (the home glyph only when none is set), and a NavView tab reads "New Tab" under the copy glyph.

#### II. Back and Forward

Back and Forward walk **per-tab** history — each tab owns its own stack, and the toolbar arrows step the active tab, skipping any deleted entities along the way. A history step re-selects without re-recording. History belongs to the unpinned strip: a pinned tab holds none (its content never changes in place), so the arrows disable there. A tab's history *targets* persist with the set (so Back still works after relaunch, cold); the warm state is session-only.

#### II. NavPane

The toolbar Navigation button's dropdown — a blank placeholder on the shared beak-glass menu surface, held at a fixed height. Its content is undecided.

#### II. NavView

The new-tab page — a full-window Recents **gallery or list** + search bar (the NavWindow gallery scaled up). It is the empty state: a `+` opens it, a nexus with no open tabs defaults to it, and closing the last tab lands on it. Picking a card or a row opens that entity into the tab. NavView shares the gallery + list components with NavWindow but stays its own surface (never a merged shell). It carries its own banner, falling back to the Homepage's when it has none and to a bare header when neither exists; the search field sits in the banner's title slot, so the search bar *is* the inline title. As a detail-pane resident, its **List / Gallery toggle lives in the detail-pane [[Subfield]] footer**, not on a rail — the footer describes NavView the way it describes a page. Search always renders as gallery cards; the toggle switches only the recents/empty view. The list is **reorderable and shows the pinned group** above recents (like NavWindow's list), recents dragging on the shared drop-line. The NavWindow's shared-toolbar scan promotes its **map flavor** into NavView (deduped, carrying the view mode once — → [[PagePreview]]).

**View mode persists per surface.** NavWindow's List / Gallery choice and NavView's are separate, each stored per-Nexus — flipping one never moves the other, and both survive relaunch.

#### II. Breadcrumb

The footer carries a breadcrumb of the active tab's container path, plus a dimmed forward **ghost crumb** for the last-visited Page within the open container — a one-click way back into where you were. Full footer → [[Subfield]].

### Pending

**Surface build state:** NavWindow (the overlay), **Toolbar Tabs**, and **NavView** are shipped. **NavPane** (the dropdown) is a placeholder pending its content call.

**Open design:** the NavWindow's Figma gallery form. Whether the rail as built — the Favorites list with its List / Gallery toggle — is the intended rail or a stand-in has no ruling; nor does whether the shipped hover pin marker settles the row marker. List rows carry no current-item treatment today; gallery cards do.

**Deferred:** Agenda entries are search-listable but route nowhere — no selection kind opens a Task or Event, so they list inert until Agenda's own surfaces land. Body / full-text search (today's is title-only) waits on a SQLite FTS layer that doesn't exist; nothing queries the index the app already maintains. Drag-to-pin across the tab divider, and dragging a tab out into its own window, are Prospects.
