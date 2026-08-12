## Sidebar
```
Sidebar
├── Ribbon
├── Content Modes
├── Creation
├── Drag and Drop
├── Selection
├── Row Labels
└── Pending
```

Pommora's leading navigation pane in the three-pane shell: a **ribbon** of icons pinned to the left edge, and a **content column** whose contents switch with the ribbon. The ribbon sits outside the scrolling content behind a vertical rule. The column renders the pre-ordered `NexusTree` rather than a raw filesystem view, and disclosure state persists per entity, device-local. There is no header row; the Nexus's name and rename affordance live in the Homepage view.

### Ribbon

A **surface launcher** — each icon points at a surface, and surfaces live in different panes:

- **Homepage** — pinned at the top, drawn as the Nexus's identity icon. Selecting it opens the Homepage in the main pane without changing what the content column shows.
- **Navigation · Agenda · Contexts · Collections · Settings** — below Homepage in that default order, drag-to-reorder. **Collections · Contexts · Agenda** switch the content column's mode; **Navigation** toggles the NavWindow (→ [[NavigationPM]]) and **Settings** the floating Settings window (→ [[ConfigurationPM]]) — the icon that summoned a window dismisses it, the same toggle its keyboard command drives. The Collections and Contexts tabs draw an entity default, so a personalization override moves them; the rest carry fixed glyphs.

The ribbon collapses and expands with the sidebar, and toggles on its own inside the open sidebar: the `toggle-ribbon` command (⌘E by default → [[ConfigurationPM]]) slides the strip off the panel's left edge on the sidebar's collapse motion while the content column reclaims the width. Ribbon visibility is transient window state, like the sidebar's collapse; the active mode and ribbon order persist per-Nexus.

### Content Modes

The content column renders one mode at a time. A ribbon switch plays the **overtake sweep** — the incoming mode slides in rightward from the ribbon edge over the sitting content. The ribbon tab names the mode, so the column carries no heading:

- **Collections** — the top-level Collections. A Collection discloses its Sets and its loose Pages, recursively; a depth-1 Set is selectable and opens its scoped view, a Sub-Set is expand-only here, and Pages are leaf rows 
- **Contexts** — every registry Context as a disclosure of its draggable Space rows, in registry order.
- **Agenda** — the ribbon's third mode, holding its place with an empty state; whatever Agenda becomes surfaces here.

### Creation

Creation is right-click-first: a mode's empty area pops its native "New" menu — a lone **New Collection** or **New Context** by mode; right-clicking inside a Context group creates a Space there, labeled from that Context's singular. Right-clicking a row pops its own menu instead, offering what that row can contain — a Collection and a Set both take a Page and a nested container, differing only in whether the nested one reads as a Set or a Sub-Set; the subfield's add button offers the same pair, and both name the container from the nexus labels. A page row's menu carries **New Page Above** and **New Page Below**, creating a sibling at that slot in the manual order. The menu picks and the store executes with an **optimistic tree insert** — the new row lands instantly with its naming input focused and empty (the page itself is already Untitled on disk) while the confirming re-walk follows behind.

**The ghost row** — dwelling on a page row extends a ghost "New Page" row beneath it on the row's own chrome at the inactive dim, entering and leaving on the disclosure motion; clicking it creates below, the field opening in the sidebar. It rides the shared hover-ghost mechanism with the sidebar's own pacing — a longer dwell than the views', since the sidebar is a surface the pointer crosses in transit — and any pointer press outside it stands it down before a drag can measure. Native menus hold it down until they close.

**One naming field, ever.** An entity visible on two surfaces — a Set's sidebar row and its table band — resolves its rename to a single field through the store's owner fence: the gesture's surface wins where the menu declared it, the detail surface outranks the sidebar otherwise, and a rename whose surface disappears is abandoned rather than teleported into another one.

A create always lands visible: the new row's inline rename forces its collapsed ancestor disclosures open.

### Drag and Drop

Every entity reorders within its parent by drag using [[PommoraDND]]; Pages and Sets also reparent into other Sets and across Collections. Order persists parent-side — a container's own sidecar holds its Sets and Pages, the nexus state file holds the top-level Collection order and each Context's Space order, and the registry's array position is the Contexts' own order. Each content mode is its own drag zone, the ribbon's icon reorder another. 

### Selection

Selection routes the whole detail pane and reads as the menu row primitive's selected fill. Selection survives a rename or move — the id survives the re-walk and the path re-derives from the fresh tree. Switching the ribbon mode never changes the selection; the main pane holds until a row is clicked.

### Row Labels

A row's label truncates to an ellipsis at rest; hovering scrolls it — icon included, on one scroll box — to reveal the full name, bounded by the sidebar's trailing edge. Content sliding off the left **eclipses** into the glass through a soft mask rather than hard-clipping, and only once a row is scrolled off its start — a bare hover never dims the icon. Un-hovering slides the label back on the sidebar's shared panel-slide timing. The primitive is the app-wide capped label; the left-edge eclipse is the sidebar's opt-in.

The inline rename field is the menu system's flush `titleInput` — dimensionally identical to the title text it replaces, the caret alone marking edit mode, so the icon and row never shift.

### Pending

- **User Sections** — unbuilt. The surface wants an **"Add Heading"** entry in the Collections create menu plus rename and drag-a-Collection-into-a-section, with the sections themselves in the database beside the rest of the sidebar's arrangement.
- **Space-Create Label** — the create item's stored singular leaves a renamed seeded Context wearing its old label; the ruled behavior keys off the title instead (→ [[ContextsPM]] §Pending).
- **Always-On Ribbon** — a ribbon that survives the sidebar collapsing, toggled independently rather than folding away with it.
