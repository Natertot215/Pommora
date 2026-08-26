## Interface

```
Interface
├── The Shell
├── The Toolbar
├── The Sidebar
│   └── Creation
├── The Subfield
├── Floating Windows
│   ├── II. Page Preview
│   ├── II. The NavWindow
│   └── II. The Settings Window
├── The Hover Card
└── Pending
```

The shell and the surfaces it is built from: the three-pane window, the toolbar, the sidebar, the footer bar under every content view, the floating windows, and the hover card. Each is a surface that hosts content owned elsewhere — pages, views, the navigation layer — and this document describes the surfaces themselves: how they are laid out, what they show, and how you move between them. `App.tsx` composes them; the components live in `src/renderer/src/Sidebar/`, `Toolbar/`, `Detail/`, `PagePreview/`, `NavWindow/`, and `Embeds/`.

### The Shell

A three-pane shell: the sidebar, the main pane, and the inspector, with both side panes drag-resizable and their widths persisted per machine.[^1] The toolbar runs across the top of the main pane, the Subfield along its bottom, and the sidebar collapses on its own motion with the ribbon folding away alongside it. The inspector is reserved for a future decision; its own design pass is pending, and properties do not live there. Every entity opens under a consistent header: containers and pages can set a banner image that bleeds edge-to-edge under the side panes, with the title overlaying its bottom-leading corner and the banner and title locking in place while the body scrolls.

### The Toolbar

The toolbar (`Toolbar/Toolbar.tsx`) holds the tab bar on its left and a trio of glass buttons on its right, with one slot between them that changes with the selection. The trio is the Navigation button (its pane is a placeholder), the Settings dropdown — the container's SettingsPane or a page's own Settings — and the inspector toggle; when the inspector opens, the trio rides its edge on the shared swallow motion. The middle slot holds the ViewDropdown on a container and the Outline on a page, since a selection is one or the other, and a Space shows its own dropdown there.[^2]

### The Sidebar

Pommora's leading pane: a **ribbon** of icons pinned to the left edge, and a **content column** whose contents switch with the ribbon, rendering the pre-ordered tree rather than a raw filesystem view. There is no header row; the Nexus's name and rename affordance live in the Homepage view. Disclosure state persists per entity, per machine.

**Ribbon.** A surface launcher. The Homepage sits pinned at the top, drawn as the Nexus's identity icon, and opens the Homepage in the main pane without changing the column. Below it, in a drag-reorderable default order, sit Navigation, Agenda, Contexts, Collections, and Settings: the middle three switch the content column's mode, while Navigation toggles the NavWindow and Settings the Nexus Settings window — the icon that summoned a window dismisses it. **Toggle Ribbon** (⌘T) slides the strip off the panel's edge while the column reclaims the width.[^3]

**Content Modes.** The column renders one mode at a time, and a switch plays the overtake sweep — the incoming mode sliding in from the ribbon edge over the sitting content. **Collections** lists the top-level Collections, each disclosing its Sets and loose Pages recursively; a depth-1 Set is selectable and a Sub-Set is expand-only.[^4] **Contexts** lists every registry Context as a disclosure of its Space rows.[^5] **Agenda** holds its place with an empty state.

**Drag and Drop.** Every entity reorders within its parent by drag, and Pages and Sets also reparent into other Sets and across Collections.[^6] Order persists parent-side — a container's sidecar holds its Sets and Pages, the nexus state file the top-level Collection order, and the registry the Contexts' own order.

**Selection.** Selection routes the whole detail pane and reads as the menu row's selected fill. It survives a rename or move, since the id survives the confirming push and the path re-derives from the fresh tree, and switching the ribbon mode never changes it.

**Row Labels.** A row's label truncates at rest and scrolls on hover to reveal its full name — the app-wide capped label — with content sliding off the left edge eclipsing into the glass through a soft mask.[^7] The inline rename field is dimensionally identical to the title it replaces, so nothing shifts when editing begins.

#### Creation

Creation is right-click-first. A mode's empty area pops its native New menu — **New Collection** or **New Context** by mode — and right-clicking inside a Context group creates a Space labeled from that Context's singular. Right-clicking a row offers what that row can contain: a Collection and a Set both take a Page and a nested container. The menu picks and the store inserts optimistically, the new row landing with its naming field open while main's confirming push follows.[^8] Dwelling on a page row extends a ghost "New Page" row beneath it that creates below on click. A create always lands visible: the new row's rename forces its collapsed ancestors open, and one naming field exists at a time across every surface.

A page row's menu is the **page menu** (`src/shared/pageMenu.ts`), the same rows in the same order wherever a page can be right-clicked — a sidebar row, a table row, a card, a row grip, a tab:

| Group | Rows |
| --- | --- |
| Open | Open Preview · Open New Tab (reads *Open* where the page already holds a tab) |
| Identity | Rename · Edit Icon |
| Create | New Page Above · New Page Below (a sibling at that slot in the manual order) |
| Send | Move To ▸ (every Collection and its Sets, the page's own disabled) · Copy Link (`[[Title]]`) · Copy Path |
| Locate | Reveal Location |
| Remove | Delete |

### The Subfield

The bottom bar of every content view (`Detail/Subfield/`): a breadcrumb on the left and per-view items on the right, at the Subline scale. The **breadcrumb** is a NavTrail of the open view's ancestry from the Collection down to the current node — Collection and depth-1 Set segments navigate, deeper Sub-Sets are plain, the current segment is inert — extended past the current node with a dimmed tail down to the deepest node visited on this path, still clickable to re-descend, so walking back up keeps the deeper trail in view. The **items** come from a registry keyed by view kind: a Page shows `lines · words · characters`, counting the prose the editor actually draws and settling just behind the keystroke; Collections and Sets show a **+** add menu; NavView shows its List / Gallery toggle; a Space takes the bar with its crumb alone.

A page holding footnotes also carries the **Show Footnotes** / **Hide Footnotes** control in the reveal band above the bar, facing the bar's collapse chevron across it.[^9] The bar collapses app-wide on one flag, with a hover-revealed chevron riding directly above it. The Subfield takes an optional scope: unscoped, at the detail pane, it reads the global selection and live body; scoped, the Page Preview mounts it in its footer to describe the preview's active tab instead, with non-navigable crumbs. Item order and the expanded flag persist per Nexus in `settings.json`.

### Floating Windows

Every in-app window mounts one chassis, **PreviewPane** (`DesignSystem/Detail/PreviewPane/`): the glass shell, per-window-id geometry (size persists across opens, position opens centered), the dismissal contract, a toolbar in either its **band** form (a full-width move strip the content scrolls beneath) or its **floating** form (corner-pinned glyph clusters, so content reaches the top edge), side-pane slots on either edge in overlay or in-flow mode, and a footer slot. Windows open and close on a scale-fade, and each states its own dimensions in `previewPane.css` for a host to retune. Four windows mount it: the Page Preview, the NavWindow, the in-app browser,[^10] and the Nexus Settings window.[^11] A floating window is sealed off from the main shell's pane geometry, so opening the inspector behind it shifts nothing inside it.

#### II. Page Preview

The floating page window (`PagePreview/PreviewWindow.tsx`): a movable, resizable, fully editable window that opens Pages without touching the main pane's selection, tabs, history, or recents. One preview exists at a time, and a new summon overtakes it in place. The toolbar takes its band form; the scan glyph on the left **promotes** the page — it opens for real in the main pane while the window plays the engulf, a FLIP from the window's rect onto the detail pane's — and the right cluster holds a parked Settings glyph, the inspector toggle, and the close. That inspector — an overlay side slot at one remembered width, shared with the NavWindow's page tabs — is the frontmatter inspector: contexts and properties in two group fields, each rendering only once something is assigned, an Add affordance alone on an empty page, and rows edited through the same primitives the table cells use, with right-click popping the property menu or, on a value holding a link, the link menu.[^13] The window's footer is the scoped Subfield.

The window is a small tabbed app of its own. A connection clicked inside it opens as a tab beside the origin rather than navigating away, deduplicating against a tab already open for that page; closing the active tab falls to its left neighbor, closing the origin re-parents the set to the left-most survivor, and closing the last tab closes the window. A single-tab window shows the page's ancestry as a centered NavTrail; the second tab's birth collapses that title into a standard tab strip, and closing back to one returns it. Tabs drag-reorder, and the whole set persists per origin across sessions, per-machine, restored against the live tree.[^1] Warmth is per tab: editor state, undo, and scroll come back on switch.

Three routes lead in: a Collection whose **Open In** is the preview routes its title clicks and sidebar rows here;[^4] **Open Connections In Preview** routes wiki-link clicks here, with ⌘-click taking the other route, and from inside a preview a ⌘-click opens a new app tab behind it;[^3] and ⌘N while the preview is open promotes the active tab to a new app tab.

#### II. The NavWindow

The NavWindow is a flavor of the same window with the floating toolbar: tab 1 is a perma-pinned, icon-only map tab whose content is the window's whole body — the Favorites rail, the search field, and the gallery — and page tabs open beside it from its rows when the window's routing override is on. An active page tab swaps the body for the editable embed and slides the rail closed; the map tab is the return. Opening the NavWindow over a live preview morphs one window into the other, a FLIP from the preview's rect, and the window's tab set persists across sessions. What the NavWindow is *for* — recents, pins, favorites, search — is Navigation's.[^12]

#### II. The Settings Window

The Nexus Settings window (`Settings/NexusSettings.tsx`) is summoned and dismissed by the ribbon's Settings glyph and takes the floating toolbar, with a rail of leaves in a side slot and the panel they open beside it: General, Interface, Navigation, Appearance, Files & Links, Properties, Pages & Editor, Automations, and Shortcuts listed from the top, and Trash anchored to the rail's foot. A leaf either fills the panel with sections of labeled rows, each row writing one key of the Nexus's personalization,[^11] or hands the panel over to a surface of its own, which is what Trash does. A leaf whose own settings are undecided still holds its place in the rail and opens empty.

### The Hover Card

Resting on a resolved connection past a short intent delay raises the hover card (`Embeds/ConnectionHoverCard.tsx`): a compact, read-only render of the target page through the embed framework, without its banner or inline title, on the PickerMenu chassis rather than a window — no backdrop, no focus, so it never steals a click. It is mounted once at app level and reached by every host, so one card exists app-wide. The card resolves its content before opening (a page that can't load opens nothing), centers on the live link and tracks it as the line reflows, scrolls within itself with headings folding on click, and closes on hover-off, Escape, navigation, or the link leaving view; **Hover Preview Linger** extends the stay.[^3] It resizes from its right and bottom edges to one remembered size per machine.

A markdown link naming a website raises the same card as a live, non-interactive render of the site: it opens under a quiet cover that fades once the page paints, a page that fails or never paints closes the card, and a shield keeps every pointer event on the card while passing the wheel down so the site scrolls without becoming clickable.[^10]

---

#### Pending

- **The inspector pane** — reserved; its design pass is pending.
- **The NavPane** — the toolbar Navigation button's dropdown is a blank placeholder; its content is undecided.
- **User sections** — an "Add Heading" entry in the Collections create menu, with drag-a-Collection-into-a-section.
- **Always-on ribbon** — a ribbon that survives the sidebar collapsing.
- **The engulf's landing** when the promoted page's main-pane fetch outlasts the FLIP; usually masked by warmth.
- **Multi-preview** — two windows at once; the geometry store and slice are ready, and the singleton rule is a product call.
- **Subfield items** — reordering by drag (the persisted order is wired), user-defined items, and per-view configuration.

[^1]: [[ArchitecturePM]] §Persistence
[^2]: [[ViewTypesPM]] §Surfaces · [[PagesPM]] §Outline
[^3]: [[ConfigurationPM]]
[^4]: [[CollectionsPM]]
[^5]: [[ContextsPM]] §Surfaces
[^6]: [[PommoraDND]] §Insertion Line
[^7]: [[InteractionPM]] §OverScroll
[^8]: [[PagesPM]] §Title + Membership
[^9]: [[MarkdownPM]] §Footnotes
[^10]: [[WebviewPM]]
[^11]: [[ConfigurationPM]] §Settings
[^12]: [[NavigationPM]] §NavWindow
[^13]: [[PropertiesPM]] §Shared Mechanisms · [[ConnectionsPM]] §The Link Menu
