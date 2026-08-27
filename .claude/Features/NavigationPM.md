## Navigation

```
Navigation
├── The Navigation Layer
├── NavWindow
├── Toolbar Tabs
├── Back and Forward
├── NavView
├── Pending
└── Prospects
```

How you get from where you are to where you want to be. A **toolbar tab bar** holds the open working set, each tab with its own history, over a shared **navigation layer** for the cross-tree jumps — recent, pinned, searched, favorited — that the sidebar tree alone can't serve. The main pane shows the active tab's entity; selecting one anywhere drives that tab, replacing its content on an unpinned tab and spawning a new one off a pinned tab. The code is `src/renderer/src/Navigation/` for the layer, `Tabs/` for the tab model and NavView, and `Windows/` for the window.

### The Navigation Layer

A per-Nexus, UI-agnostic store of recents, pins, and favorites, plus client-side title search. Everything it persists is a bare identity reference — `{kind, id}` (`NavRef` in `src/shared/types.ts`) — so every title, icon, and path resolves live against the current tree at the moment of use, and a rename or move, even while the app is closed, leaves nothing stale. An entry that no longer resolves is hidden at render but never deleted, so a Nexus switch can't silently wipe pins or favorites.

- **Recents** — an automatic history stream, most recent first, deduplicated, capped at a generous roll-off. A navigation records only when it actually opens a tab, so re-surfacing an entity already open, stepping Back or Forward, and switching tabs record nothing.
- **Pins** — the durable, user-ordered working set. Pins are the pinned tabs, docked left in the tab bar, and also float to the top of the NavWindow gallery — one set surfaced in two places.
- **Favorites** — the durable, explicitly curated list, changed only by an explicit add or remove.
- **Search** — a title-based fuzzy scan over the in-memory tree, memoized per tree. A Context isn't itself a hit; it's the path crumb its Spaces resolve under.

Pins and favorites persist as ordered arrays in `.nexus/navigation.json`, which is hand-editable and follows the Nexus; recents persist per machine, since two machines interleaving one history has no correct answer.[^1]

### NavWindow

The summoned wayfinding overlay: a non-modal floating window on the shared window chassis,[^2] opening centered with its size remembered, that blocks nothing behind it and hands the caret to its search field on open. A glass rail holding the Favorites runs beside a main frame: a search field over a gallery of Recents cards with pins on top — locked cards on the shared chassis ([[DesignSystemPM]]), each resolving location, icon, and title live from the tree, the open one wearing the accent stroke. The ribbon's Navigation icon summons it, **Toggle Navigation** (⌘O) toggles it, and Escape or its close dismisses it.[^3]

The gallery and list modes reorder differently: the gallery displaces, cards reflowing to open a slot, pins among pins and recents among recents; the list uses the sidebar's insertion-line drag. Only recents reorder within search results, and the rail's Style toggle governs the results too — searching changes what is listed, never how it's drawn. Hits whose kind has no destination surface in List only. A row's right-click opens it, pins it, favorites it, or drops it from the list, and a live page row carries the page menu's send rows — Move To ▸, Copy Link, Copy Path.[^4] Picking an entity dismisses the window when **Close Navigation On Select** is on.[^3]

### Toolbar Tabs

The tab bar holds the open working set, each tab **warm** — it keeps its own scroll and editor undo, so flipping back lands where you left off. The two most recently visited page tabs go further: their surface is parked off screen with its editor intact rather than torn down, which is what lets an embedded website survive a tab flip with its session and playing media.[^5] Older tabs fall back to serialized warm state and rebuild on return; the parked count is a code constant.

- **Pinned tabs** dock left as compact, label-less entity icons with the full name on hover. They are the pin set, persist, and are protected: navigating while a pinned tab is active opens a new tab rather than replacing it. **Unpinned tabs** sit to the right as scratch tabs, where navigating replaces the active one in place unless Open New Tab is used.
- **Persistence** — closing Pommora never resets the tabs; they reopen cold on relaunch, each machine keeping its own set. Warm state is session-only.
- **Lifecycle** — closing the active tab focuses the most recently used one; the close × shows only on unpinned tabs; a deleted entity's unpinned tab closes while its pinned tab hides, the pin staying stored. The last tab closing drops to NavView, and opening an entity already in a tab focuses that tab.
- **Interaction** — within-zone drag reorders, pinned among pinned and unpinned among unpinned; Ctrl+Tab cycles all tabs; a tab's right-click offers Pin or Unpin and Close, with Open Preview and the page send rows above them where the tab holds a page. **Reveal Tab Bar On Hover** hides the bar when idle.[^3]
- **Iconography** — tab icons resolve live like every nav surface: the Homepage tab shows the Nexus photo when one is set, and a NavView tab reads "New Tab".

### Back and Forward

Back and Forward walk per-tab history (`Tabs/tabsModel.ts`): each unpinned tab owns its own stack, the toolbar arrows step the active tab, skipping deleted entities, and a history step re-selects without re-recording. A pinned tab's content never changes in place, so it holds no history and the arrows disable there. History persists with the tab set, so Back still works after a relaunch.

### NavView

The new-tab page (`Tabs/NavView.tsx`): a full-window Recents gallery or list over a search bar, and the empty state — a `+` opens it, a Nexus with no open tabs defaults to it, and closing the last tab lands on it. It shares its gallery and list components with the NavWindow but is its own surface, carrying its own banner (falling back to the Homepage's) with the search field in the banner's title slot. Its List / Gallery toggle lives in the Subfield, and that choice persists per Nexus separately from the NavWindow's.[^6] The list shows the pinned group above recents, and the NavWindow's scan glyph promotes its map flavor into NavView.

---

#### Pending

- **NavPane** — the toolbar Navigation button's dropdown, a blank placeholder whose content is undecided.
- **Agenda is unsearchable** — Tasks and Events are absent from the tree the index builds from; the persistence layer admits their refs and renders them as inert rows.
- **Body and full-text search** — waits on a SQLite FTS layer that doesn't exist.

#### Prospects

- Drag-to-pin across the tab divider, and dragging a tab out into its own window.

[^1]: [[ArchitecturePM]] §Persistence
[^2]: [[InterfacePM]] §Floating Windows
[^3]: [[ConfigurationPM]] §Navigation · §Interface · §Shortcuts
[^4]: [[InterfacePM]] §The Sidebar
[^5]: [[WebviewPM]] §Engagement & Retention
[^6]: [[InterfacePM]] §The Subfield
