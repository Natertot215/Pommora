## Navigation

```
Navigation
├── The Navigation Layer
├── NavWindow
├── Toolbar Tabs
├── Back and Forward
├── NavView
├── Breadcrumb
├── State Persistence
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

The summoned wayfinding overlay — a non-modal, movable, resizable floating glass panel on the shared **PreviewPane** surface[^1] that always opens centered; its size persists across opens, its position doesn't. It takes the toolbar's floating form — corner-pinned glyph clusters rather than a band — so its tab row can reach the window's top edge. A glass rail holding the Favorites list runs beside a main frame: a search field over a gallery of Recents cards, pins on top, each card resolving location, icon, and title live from the tree. It resizes from its corners and a rail split, blocks nothing behind it, and hands the caret to the search field on open. The sidebar ribbon's Navigation icon summons it, `⌘O` toggles it, and Escape or the window's × dismisses. Row and card actions live in a context menu.

Reorder drag differs by view mode: the **gallery** displaces, cards reflowing to open a slot — pins among pins, recents among recents, never across — while the **list** uses the sidebar's insertion-line drag. Only recents reorder in search — a result set has no stored order to drag against — and the rail's Style toggle governs its search results too: searching changes what is listed, never how it's drawn. Inert hits, whose kind has no click destination, have no card form and surface in List only. A row's own right-click menu opens it, pins it, favorites it or drops it from the list, and where the row resolves to a live page it carries the same send block every other page menu does — Move To ▸ · Copy Link · Copy Path.

The NavWindow is also tab 1 of the Page Preview's window — a perma-pinned map tab whose page tabs open beside it, tab-neutral to the app's own tabs.[^1]

### Toolbar Tabs

A tab bar in the toolbar holding the open working set, each tab **warm** — it keeps its own scroll and editor undo, so flipping back lands where you left off.

The most recently visited page tabs go further: their surface is **parked** rather than torn down, held off screen with its editor intact, so returning to one resumes it instead of rebuilding it. A parked surface's embedded webpages read as out of view and pause under their own retention, which is what lets a site survive a tab flip with its session, scroll, and playing media rather than reloading cold.[^2] Older tabs fall back to the serialized warm state and rebuild on return. How many surfaces stay parked is a single tunable in the detail pane.

- **Pinned tabs** dock left as compact, label-less entity icons, the full name revealing on hover; they are the pin set, persist, and are protected — navigating while a pinned tab is active opens a new tab rather than replacing it. **Unpinned tabs** sit to the right as scratch tabs, where navigating replaces the active one in place unless "Open New Tab" is used.
- **Full Set Persistence** — closing Pommora never resets the tabs; they reopen cold on relaunch, each machine keeping its own set. Warm view-state is session-only; heading folds re-fold from their durable per-page store.
- **Lifecycle** — closing the active tab focuses the most-recently-used tab; the close `×` shows only on unpinned tabs; a deleted entity's unpinned tab closes while its pinned tab render-hides, the pin staying stored. The last tab closing drops to NavView, and opening an entity already in a tab focuses that tab rather than duplicating it.
- **Interaction** — within-zone drag reorders, pinned among pinned and unpinned among unpinned; `Ctrl`+`Tab` cycles all tabs; a tab's right-click menu offers Pin/Unpin · Close, with Open Preview and the page send block — Move To ▸ · Copy Link · Copy Path — above them where the tab holds a page. The `revealTabBarOnHover` knob can hide the bar when idle.[^3]
- **Iconography** — tab icons resolve live like every nav surface: the Homepage tab wears the nexus photo, the home glyph only when none is set, and a NavView tab reads "New Tab" under the copy glyph.

### Back and Forward

Back and Forward walk per-tab history — each tab owns its own stack, and the toolbar arrows step the active tab, skipping deleted entities along the way. A history step re-selects without re-recording. History belongs to the unpinned strip — a pinned tab's content never changes in place, so it holds none and the arrows disable there. A tab's history targets persist with the set, so Back still works cold after relaunch; the warm state is session-only.

### NavView

The new-tab page — a full-window Recents **gallery or list** over a search bar. It is the empty state: a `+` opens it, a nexus with no open tabs defaults to it, and closing the last tab lands on it. NavView shares the gallery and list components with NavWindow but stays its own surface. It carries its own banner, falling back to the Homepage's when it has none and to a bare header when neither exists; the search field sits in the banner's title slot, so the search bar is the inline title. As a detail-pane resident, its List / Gallery toggle lives in the detail-pane Subfield footer.[^4] Search always renders as gallery cards here — the toggle switches only the recents/empty view. The list is reorderable and shows the pinned group above recents, recents dragging on the shared drop-line. The NavWindow's shared-toolbar scan promotes its map flavor into NavView, deduped and carrying the view mode once.[^1]

**View mode persists per surface.** NavWindow's List / Gallery choice and NavView's are separate, each stored per-Nexus — flipping one never moves the other, and both survive relaunch.

### Breadcrumb

The footer carries a breadcrumb of the active tab's path, extended with a dimmed tail down to the deepest node visited on it — the segments last backed out of, clickable to re-descend — so walking back up the path keeps the deeper trail in view rather than collapsing it.[^4]

### State Persistence

What Pommora remembers, and for how long. Four tiers, told by where a thing is written rather than by how important it is: the Nexus's own files travel with it, its database stays on the machine that made it, the app's own preferences sit outside every Nexus, and everything else lasts the run.

**Travels With The Nexus.** Written into `.nexus/` files, so a synced or copied Nexus arrives with all of it, and a hand edit from outside is read back live.

| State                                               | Where it lives                | What clears it                                                                  |
| --------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| Every setting in the Settings window                | `settings.json`               | Changing it; a row at its default stores no key                                 |
| Pins and Favorites                                  | `navigation.json`             | Unpinning or removing; an entry that stops resolving hides but is never dropped |
| Property definitions and their order                | `properties.json`             | Editing the registry                                                            |
| Top-level Collection and Context order              | `state.json`                  | Reordering                                                                      |
| Saved views and what a container is                 | Each container's own sidecar. | Editing the view; deleting the container                                        |
| Page bodies, frontmatter, and their property values | The Markdown files themselves | Editing the page                                                                |

**Stays On This Machine, Inside The Nexus.** `nexus.db` sits beside those files and travels with a moved Nexus, but never syncs — it holds what is true of this computer's session rather than of the content.

| State                                          | What it remembers                                                                                           | What clears it                                                                                   |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Tabs                                           | The open set, which was active, and each tab's Back/Forward history as bare refs                            | Closing a tab; a schema-version change                                                           |
| Folds                                          | Which headings and lists are collapsed, per page                                                            | Unfolding; emptying the list deletes the row                                                     |
| Embed heights · heading columns · header glyph | Per-page editor chrome — a tile's dragged height, a table's heading column, whether the page shows its icon | Changing it back                                                                                 |
| Active view and manual page order              | Which saved view a container opens on, and the hand order inside it                                         | Picking another view; reordering                                                                 |
| Preview and NavWindow tab sets                 | The floating window's tabs per origin page, and which preview was open                                      | Closing the last tab of a set                                                                    |
| Recents                                        | The navigation trail, most-recent-first, capped by roll-off                                                 | Roll-off; two machines interleaving one history has no correct answer, which is why it sits here |
| Hover card size                                | The one universal preview-card size                                                                         | Resizing it                                                                                      |
| Fetched link titles                            | A URL's page title, so the same link never refetches                                                        | Nothing — a cached title is kept                                                                 |
| Dashboard blocks                               | Each block surface's layout and its blocks                                                                  | Editing the surface                                                                              |
| Use Native Menus                               | The one machine-level preference                                                                            | Toggling it                                                                                      |

**Stays On This Computer, Outside Every Nexus.** Belongs to the app rather than to any Nexus, so it holds no matter which one is open.

| State                                                             | What it remembers                                                                                                                                              | What clears it                                             |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| The last Nexus opened, the recent Nexus list, and the trash mode  | Where to reopen, and what deleting means                                                                                                                       | Opening another Nexus; the list rolls off at ten           |
| Sidebar and Inspector widths, and which sidebar sections are open | The shell's own proportions                                                                                                                                    | Dragging them; an out-of-range value self-corrects on read |
| Web sessions                                                      | Cookies, logins, and site storage for every embedded page, browser tab, and hover preview — one shared session, so a sign-in anywhere is a sign-in everywhere. | Nothing in the app clears it today                         |

**Lasts The Run.** Held in memory, gone when Pommora closes — the difference between returning to a page and rebuilding it.

| State                                | What it remembers                                                                                             | What ends it                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Parked page surfaces                 | The two most recent page tabs stay built, held off screen, so a flip resumes them[^5]                                    | A third tab taking the slot; closing the tab                                                    |
| Warm tab state                       | Serialized editor state — text, caret, undo history — plus scroll, for every tab beyond the parked ones       | Twenty entries per tab, then the oldest goes; closing the tab; an outside edit to that page     |
| Retained web guests                  | A scrolled-out or parked site stays alive, paused, keeping its scroll, its typed input, and its playing media | Five hidden guests, then the least recent is torn down; the tile then reloads on its next entry |
| Embed tile and preview-window warmth | The same editor state for tiles inside a page and for preview tabs                                            | The page's body changing since capture; closing the preview window                              |
| Pending page saves                   | A typed body waiting on its debounce, flushed on unmount, Nexus switch, and window close                      | The write landing                                                                               |

**Never Kept.** Deliberate, not missing: the window opens at one size every launch, and floating windows re-center rather than reopening where they were left — a remembered position strands chrome off screen when the display changes.

### Pending

- **NavPane** — the toolbar Navigation button's dropdown, a blank placeholder on the shared beak-glass menu surface at a fixed height. Its content is undecided.
- **Agenda is unsearchable** — Tasks and Events are absent from the tree the index builds from, and no selection kind opens one. Both wait on Agenda joining the walk; the persistence layer admits their refs, and the inert-row rendering exists.
- **Body and full-text search** waits on a SQLite FTS layer that doesn't exist.

### Prospects

- Drag-to-pin across the tab divider, and dragging a tab out into its own window.

[^1]: [[PagePreviewPM]]
[^2]: [[WebviewPM]]
[^3]: [[ConfigurationPM]]
[^4]: [[SubfieldPM]]
[^5]: §Toolbar Tabs
