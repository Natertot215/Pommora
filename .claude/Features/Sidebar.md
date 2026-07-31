## Sidebar

Pommora's leading navigation pane in the three-pane shell: a **ribbon** of icons pinned to the left edge, and a **content column** whose contents switch with the ribbon. The ribbon sits *outside* the scrolling content behind a vertical rule, so the content's scroll can neither cross that rule nor move the ribbon. The column renders the pre-ordered `NexusTree`, not a raw filesystem view. Disclosure state persists per entity, device-local. There is no header row; the Nexus's name and rename affordance live in the Homepage view.

### Features

#### II. Ribbon

A **surface launcher** — each icon points at a surface, and surfaces live in different panes:

- **Homepage** — pinned at the top, drawn as the Nexus's identity icon. Selecting it opens the Homepage in the main pane; it does **not** change what the content column shows.

- **Navigation · Agenda · Contexts · Collections · Settings** — below Homepage in that default order, **drag-to-reorder**. **Collections · Contexts · Agenda** switch the content column's mode; **Navigation** summons the NavWindow (→ `Navigation.md`) and **Settings** the floating Settings window (→ `Configuration.md`). The Collections and Contexts tabs draw an entity default, so a personalization override moves them; the rest carry fixed glyphs.

The ribbon collapses and expands *with* the sidebar, and toggles on its own inside the open sidebar: the `toggle-ribbon` command (⌘E by default → `Configuration.md`) slides the strip off the panel's left edge on the sidebar's collapse motion while the content column reclaims the width. Ribbon visibility is transient window state, like the sidebar's collapse; the active mode and ribbon order persist per-Nexus.

#### II. Content Modes

The content column renders one mode at a time. A ribbon switch plays the **overtake sweep**: the incoming mode slides in rightward from the ribbon edge over the sitting content. Both layers are transparent glass, so the cover is two complementary clip sweeps tiling the width rather than a plain overlay, which would read as text over text; the outgoing layer holds still, counter-translated so its visible window doesn't jump when the scroll snaps to the incoming's top. The ribbon tab names the mode, so the column carries no heading:

- **Collections** — the top-level Collections. A Collection discloses its Sets and its loose Pages, recursively; a depth-1 Set is selectable and opens its scoped view, a Sub-Set is expand-only here, and Pages are leaf rows. Full container behaviour → `Collections.md` + `PageSets.md`.

- **Contexts** — every registry Context as a disclosure of its draggable Space rows, in registry order; group headers drag to reorder the registry itself. A Context header is a pure expand/collapse toggle — a Context has no destination view, Spaces do. Full behaviour → `Contexts.md`.

- **Agenda** — the Ribbon's third mode, holding its place with an empty state → `Agenda.md`. The slot is form-independent: whatever Agenda becomes surfaces here. Any list it renders must be fetched by the *sidebar*, not the mode component — the mode-switch overlay renders a second copy of the outgoing layer, and a component fetching its own list brings that copy up empty over the list it is animating away.

#### II. Creation

Creation is right-click-first: a mode's empty area pops its native "New" menu — a lone **New Collection** or **New Context** by mode; right-clicking inside a Context group creates a Space there, labelled from that Context's singular. Right-clicking a row pops its own menu instead. The native menu only *picks*: the store executes the returned request with an **optimistic tree insert**, so the new row lands instantly with its rename input focused while the confirming re-walk follows behind at one walk and no lost keystrokes.

A create always lands **visible**: the new row's inline rename forces its collapsed ancestor disclosures open, and a click that settles a header's rename never doubles as its disclosure toggle.

#### II. Drag and Drop

Every entity reorders within its parent by drag; Pages and Sets also reparent, into other Sets and across Collections. Order persists parent-side: a container's own sidecar holds its Sets and Pages, the nexus state file holds the top-level Collection order and each Context's Space order, and the registry's array position *is* the order of the Contexts themselves. Each content mode is its own drag zone, the ribbon's icon reorder another. Interaction feel and commit routing → `PommoraDND.md`.

#### II. Selection

Selection routes the whole detail pane and reads as the menu row primitive's selected fill. A row's kind and id *are* the selection, so a renamed or moved entity keeps it — the id survives the re-walk and the path is re-derived from the fresh tree. Switching the ribbon mode never changes the selection; the main pane holds until a row is clicked.

#### II. Row Labels

A row's label truncates to an ellipsis at rest; hovering scrolls it — icon included, on one scroll box — to reveal the full name, bounded by the sidebar's trailing edge. Content sliding off the left **eclipses** into the glass through a soft mask rather than hard-clipping, but *only once a row is scrolled off its start* — a bare hover never dims the icon. Un-hovering slides the label back on the sidebar's shared panel-slide timing. The ellipsis-at-rest → scroll-on-hover primitive is app-wide; the left-edge eclipse is the sidebar's opt-in.

The inline rename field is the menu system's flush `titleInput` — dimensionally identical to the title text it replaces, the caret alone marking edit mode, so the icon and row never shift. While the input is mounted, its scroll box lays out as a flex row with the ellipsis off: an atomic-inline input that overflows an ellipsizing box is elided from paint entirely, so the field must take the remaining track rather than a full-width slot.

### Pending

**User Sections:** unbuilt. A first attempt shipped a read path with no writer — a config file the app parsed and never wrote — and it was removed rather than left looking real. The surface wants an **"Add Heading"** entry in the Collections create menu plus rename and drag-a-Collection-into-a-section, and the sections themselves belong in the database with the rest of the sidebar's arrangement.

**Space-Create Label:** Today the create item reads a **stored singular**, which only the seeded Contexts carry — so those offer New Area / New Topic / New Project and every other Context offers flat **New Space**. Because the singular is stored rather than derived, renaming a seeded Context leaves its old label behind. The ruled behaviour keys off the **title** instead, so the label follows a rename. Per-Context custom singulars are prospective.

**Always-On Ribbon:** A ribbon that survives the sidebar collapsing, toggled independently; today the ribbon collapses with the sidebar.
