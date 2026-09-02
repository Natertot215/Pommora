## Interface

The shell and the surfaces it is built from: the three-pane window, the toolbar, the sidebar, the footer bar under every content view, the floating windows, and the hover pane. Each is a surface that hosts content owned elsewhere — pages, views, the navigation layer — and this document describes the surfaces themselves: how they are laid out, what they show, and how you move between them. `App.tsx` composes them; the components live in `src/renderer/Sidebar/`, `Toolbar/`, `Interface/`, `Windows/`, and `Links/`.

### The Shell

A three-pane shell: the sidebar, the main pane, and the inspector, with both side panes drag-resizable and their widths persisted per machine. The toolbar runs across the top of the main pane, the Subfield along its bottom, and the sidebar collapses on its own motion with the ribbon folding away alongside it. The inspector is reserved for a future decision; its own design pass is pending, and properties do not live there. Every entity opens under a consistent header: containers and pages can set a banner image that bleeds edge-to-edge under the side panes, with the title overlaying its bottom-leading corner and the banner and title locking in place while the body scrolls.

### The Toolbar

The toolbar (`Toolbar/Toolbar.tsx`) holds the tab bar on its left and a trio of glass buttons on its right, with one slot between them that changes with the selection. The trio is the Navigation button (its menu is a placeholder), the Settings menu — the container's SettingsFrame or a page's own Settings — and the inspector toggle; when the inspector opens, the trio rides its edge on the shared swallow motion. The middle slot holds the ViewMenu on a container and the Outline on a page, since a selection is one or the other, and a Space shows its own menu there.

### The Sidebar

Pommora's leading pane: a **ribbon** of icons pinned to the left edge, and a **content column** whose contents switch with the ribbon, rendering the pre-ordered tree rather than a raw filesystem view. There is no header row; the Nexus's name and rename affordance live in the Homepage view. Disclosure state persists per entity, per machine.

**Ribbon.** A surface launcher. The Homepage sits pinned at the top, drawn as the Nexus's identity icon, and opens the Homepage in the main pane without changing the column. Below it, in a drag-reorderable default order, sit Navigation, Agenda, Contexts, Collections, and Settings: the middle three switch the content column's mode, while Navigation toggles the NavWindow and Settings the Nexus Settings window — the icon that summoned a window dismisses it. **Toggle Ribbon** (⌘T) slides the strip off the panel's edge while the column reclaims the width.

**Content Modes.** The column renders one mode at a time, and a switch plays the overtake sweep — the incoming mode sliding in from the ribbon edge over the sitting content. **Collections** lists the top-level Collections, each disclosing its Sets and loose Pages recursively; a depth-1 Set is selectable and a Sub-Set is expand-only. **Contexts** lists every registry Context as a disclosure of its Space rows. **Agenda** holds its place with an empty state.

**Drag and Drop.** Every entity reorders within its parent by drag, and Pages and Sets also reparent into other Sets and across Collections. Order persists parent-side — a container's sidecar holds its Sets and Pages, the nexus state file the top-level Collection order, and the registry the Contexts' own order.

**Selection.** Selection routes the whole detail pane and reads as the menu row's selected fill. It survives a rename or move, since the id survives the confirming push and the path re-derives from the fresh tree, and switching the ribbon mode never changes it.

**Row Labels.** A row's label truncates at rest and scrolls on hover to reveal its full name — the app-wide capped label — with content sliding off the left edge eclipsing into the glass through a soft mask. The inline rename field is dimensionally identical to the title it replaces, so nothing shifts when editing begins.

#### Creation

Creation is right-click-first. A mode's empty area pops its native New menu — **New Collection** or **New Context** by mode — and right-clicking inside a Context group creates a Space labeled from that Context's singular. Right-clicking a row offers what that row can contain: a Collection and a Set both take a Page and a nested container. The menu picks and the store inserts optimistically, the new row landing with its naming field open while main's confirming push follows. Dwelling on a page row extends a ghost "New Page" row beneath it that creates below on click. A create always lands visible: the new row's rename forces its collapsed ancestors open — a disclosure-locked folder peeks the newcomer alone instead — and one naming field exists at a time across every surface.

A page row's menu is the **page menu** (`src/shared/pageMenu.ts`), the same rows in the same order wherever a page can be right-clicked — a sidebar row, a table row, a card, a row grip, a tab:

| Group    | Rows                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Open     | Open Preview · Open New Tab (reads *Open* where the page already holds a tab)                            |
| Identity | Rename · Edit Icon                                                                                       |
| Create   | New Page Above · New Page Below (a sibling at that slot in the manual order)                             |
| Send     | Move To ▸ (every Collection and its Sets, the page's own disabled) · Copy Link (`[[Title]]`) · Copy Path |
| Locate   | Reveal Location                                                                                          |
| Remove   | Delete                                                                                                   |

### The Subfield

The bottom bar of every content view (`Interface/Subfield/`): a breadcrumb on the left and per-view items on the right, at the Subline scale. The **breadcrumb** is a NavTrail of the open view's ancestry from the Collection down to the current node — Collection and depth-1 Set segments navigate, deeper Sub-Sets are plain, the current segment is inert — extended past the current node with a dimmed tail down to the deepest node visited on this path, still clickable to re-descend, so walking back up keeps the deeper trail in view. The **items** come from a registry keyed by view kind: a Page shows `lines · words · characters`, counting the prose the editor actually draws and settling just behind the keystroke; Collections and Sets show a **+** add menu; NavView shows its List / Gallery toggle; a Space takes the bar with its crumb alone.

A page holding footnotes also carries the **Show Footnotes** / **Hide Footnotes** control in the reveal band above the bar, facing the bar's collapse chevron across it. The bar collapses app-wide on one flag, with a hover-revealed chevron riding directly above it. The Subfield is driven by its host: the content pane hands it the shown page and its live body, and the Page Window hands it the window's active tab and its own body, marking the crumbs inert so they describe location without driving the main pane. Item order and the expanded flag persist per Nexus in `settings.json`.

### Floating Windows

Every in-app window mounts one chassis, **WindowBase** (`Windows/`): a glass shell with per-window-id geometry, a toolbar in either **band** or **floating** form, side-pane slots, and a footer, opening and closing on a scale-fade and sealed off from the main shell's pane geometry so the inspector behind it shifts nothing inside. Four windows mount it: the Page Window, the Web Window, the NavWindow, and the Nexus Settings window.

#### The Page Window

The floating page window (`Windows/PageWindow.tsx`): a movable, resizable, fully editable window that opens Pages without touching the main pane's selection, tabs, or history. One exists at a time; a new summon overtakes it in place. The toolbar takes its band form; the left scan glyph **promotes** the page — it opens for real in the main pane while the window plays the engulf, a FLIP from the window's rect onto the detail pane's — and the right cluster holds a parked Settings glyph, the inspector toggle, and the close. That inspector — an overlay side slot at one remembered width, shared with the NavWindow's page tabs — is the frontmatter inspector: contexts and properties in two group fields that render only once something is assigned, an Add affordance alone on an empty page, and rows edited through the table cells' own primitives, with right-click popping the property menu or, on a linked value, the link menu. The footer is the Subfield, driven by the window's page.

The window is a small tabbed app of its own. A connection clicked inside it opens as a tab beside the origin rather than navigating away, deduplicating against one already open for that page; closing the active tab falls to its left neighbor, closing the origin re-parents the set to the left-most survivor, and closing the last closes the window. A single-tab window shows the page's ancestry as a centered NavTrail; the second tab's birth collapses that into a standard tab strip, and closing back to one returns it. Tabs drag-reorder, and the set persists per origin across sessions, per-machine, restored against the live tree. Warmth is per tab: editor state, undo, and scroll return on switch.

Three routes lead in: a Collection whose **Open In** is the Page Window routes its title clicks and sidebar rows here; **Open Connections In Preview** routes wiki-link clicks here, ⌘-click taking the other route (and inside the window a ⌘-click opens a new app tab behind it); and ⌘N promotes the active tab to a new app tab.

#### The NavWindow

The NavWindow is a flavor of the same window with the floating toolbar: tab 1 is a perma-pinned, icon-only map tab whose content is the whole body — the Favorites rail, the search field, and the gallery — and page tabs open beside it from its rows when the routing override is on. An active page tab swaps the body for the editable embed and slides the rail closed; the map tab is the return. Opening it over a live Page Window morphs one into the other, a FLIP from the Page Window's rect, and the tab set persists across sessions. What the NavWindow is *for* — recents, pins, favorites, search — is Navigation's.

#### The Settings Window

The Nexus Settings window (`Settings/SettingsWindow.tsx`) is summoned and dismissed by the ribbon's Settings glyph and takes the floating toolbar, a rail of frames in a side slot beside the frame it opens: General, Interface, Navigation, Appearance, Files & Links, Properties, Pages & Editor, Automations, and Shortcuts from the top, Trash anchored to the foot. A frame either fills with sections of labeled rows, each writing one key of the Nexus's personalization, or is a surface of its own, as Trash is. A frame whose settings are undecided still holds its place and opens empty.

### Confirmation & Notifications

The two ways the app speaks for itself, and neither hurries the user. A **confirmation** (`Windows/ConfirmationWindow.tsx`) asks before a destructive act: a centered panel on a click-swallowing scrim, on the ImagePicker's chassis rather than a window, since a question is not something you move or resize. Cancel sits at the foot-left and the action at the foot-right, drawn destructive or tinted by the question's tone; Escape and an outside click cancel, Return answers the default, and nothing takes focus on open. It holds the picker-open shield while it stands, so the menu that asked survives underneath it. A **notification** (`Interface/NotificationLabel.tsx`) is the opposite posture — it reports one finished act at the frame's right edge under the toolbar, offers at most one action, and retires itself when its three-second bar drains. Coming near it eases that drain between full speed and a standstill rather than switching it off, and the radius is around the label rather than on it, so the countdown relents while a hand is still travelling toward Undo. Deletion is the first act to use both: what leaves a bundle in `.trash` can be restored from it, a view's Undo saves back the configuration the surface still holds, and a delete sent to the system trash offers none. Copy for every question lives in `Windows/confirmations.ts`.

### The Hover Pane

Resting on a resolved connection past a short intent delay raises the hover pane (`Links/ConnectionPane.tsx`): a compact, read-only render of the target page through the embed framework, without its banner or inline title, on the PickerMenu chassis rather than a window — no backdrop, so it never steals a click. It is mounted once at app level and reached by every host, so one pane exists app-wide. The pane resolves its content before opening (a page that can't load opens nothing), centers on the live link and tracks it as the line reflows, scrolls within itself with headings folding on click, and closes on hover-off, Escape, navigation, or the link leaving view; **Hover Preview Linger** extends the stay. Its text selects and copies in place, read-only, and it resizes from every free edge and corner to one remembered size per machine.

A markdown link naming a website raises the same card as a live, non-interactive render of the site: it opens under a quiet cover that fades once the page paints, a page that fails or never paints closes the card, and a shield keeps every pointer event on the card while passing the wheel down so the site scrolls without becoming clickable.

---

#### Pending

- **The inspector pane** — reserved; its design pass is pending.
- **The NavMenu** — the toolbar Navigation button's menu is a blank placeholder; its content is undecided.
- **User sections** — an "Add Heading" entry in the Collections create menu, with drag-a-Collection-into-a-section.
- **Always-on ribbon** — a ribbon that survives the sidebar collapsing.
- **The engulf's landing** when the promoted page's main-pane fetch outlasts the FLIP; usually masked by warmth.
- **Multi-preview** — two windows at once; the geometry store and slice are ready, and the singleton rule is a product call.
- **Subfield items** — reordering by drag (the persisted order is wired), user-defined items, and per-view configuration.
