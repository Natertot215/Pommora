## Design Terms V2

**Date:** 08-26-2026 · **Scope:** every floating or sliding surface in the renderer, the motions between them, and the names in code, CSS, and the Feature docs that carry them · **Status:** ruled in part — the Windows block is executed; the rest executes once §The Calls are stamped

One word per shape. "Pane" named five different things — a toolbar dropdown's content (`ViewPane`, `NavPane`, `SettingsPane`), the page inside its drill-down (`FilterPane`, `GroupingPane`, `SortingPane`, `HiddenPane`, `PropertiesPane`), the beaked shell they hang in (now `NotchedShell`), the chassis every floating window mounted, and the sliding side slot (`SidePane`, `InspectorPanel`); "Preview" named a window that previews nothing. The chassis is now `WindowChassis` and the floating family lives in `Windows/`; the rest of this document decides the others. The vocabulary below gives each shape one word, each word one test, and each motion the word of the shape it moves. Nothing here changes behavior; it changes what things are called so the next surface is named by its shape rather than by where it was first mounted.

### The Terms

Five shapes. A surface is exactly one of the five; a term that fits two surfaces the same way is the wrong term.

| Term | What it is | The test | Holds |
|---|---|---|---|
| **Menu** | A glass surface hung off a trigger — a toolbar glyph, a right-click, a chip, a field. Opens on Bloom, dismisses on outside-press or Esc. The toolbar's dropdowns are Menus: `SpaceMenu`, `OutlineMenu`, `ViewMenu`, `SettingsMenu`, `NavMenu`. | It has a trigger and it goes away when you click elsewhere. | Panes, or rows directly |
| **Pane** | One page of a Menu or a Window — the content a trigger opens onto, or a tab's worth of it that slides against its siblings. `GroupPane`, `FilterPane`, `SortPane`, `HiddenPane`, `LayoutPane`, `PropertyPane`, and each Settings category, `TrashPane` among them. | It has a back-row or a rail entry, and switching to its sibling slides. | Rows, sections, controls |
| **Window** | A floating, movable, resizable surface with its own toolbar, sealed off from the main shell's geometry — `PageWindow`, `WebWindow`, `NavWindow`, the Settings window. Mounts `WindowChassis`. The word is the multi-window seam's: a Window is what becomes an OS window when the app grows a second one. | It has a close glyph and a drag surface, and it remembers its size. | A body, and side slots on its edges |
| **Frame** | A surface that floats in content, anchored to a point in it and owned by it — the connection hover preview (`PageFrame`, `WebFrame`), the editor's autocomplete (`AutoFrame`). Not a Menu: it opens on a condition (hover, typing), not a press. | It appears without a click and follows what it is anchored to. | Its own content |
| **Picker** | A control that presents a bounded set of values and commits one — text, color, icon, image, calendar, and the inline picker control. `PickerMenu` is a Menu of a Picker's options and already wears `menu.css`. | It has a value and offers alternatives. | Options |

The sliding side slot — the main window's sidebar and inspector, a floating window's tab strip and inspector — is `SidePane` today, and keeps that name until §The Calls settles whether the main window mounts it. Two words leave the vocabulary: **Dropdown** (every dropdown is a Menu; the word survives only where it names the anchoring geometry) and **Preview** (nothing previews; the floating page window is `PageWindow`). **Surface** stays SurfacePM's word for the dashboard; the glass material keeps its `Glass*` names in `Materials/` and is not a surface term. **Card** is the `src/Cards` chassis; the hover *card* becomes a Frame. **Panel** is not a term.

### The Motions

| Motion | What it moves | Today | Where it lives |
|---|---|---|---|
| **Bloom** | A Menu opening from its trigger and retracting into it | Bloom, on the `dropdown` token | `dropdown-menu` keyframes · `--dropdown-origin` · `useExitPresence` |
| **PaneSlide** | The push/back between two Panes inside one Menu or Window | Pane Slide (`PaneSlider`) — already named for it | `Components/PaneSlider/` |
| **SideSlide** | A side slot opening and closing on a window's edge, the body squeezing beside it | the `--io` / `--io-l` drivers, the sidebar's mode overtake, the inspector's swallow | `styles.css` · `windowChassis.css` · `Sidebar.css` |
| **Scale-fade** | A Window opening and closing | `window-in` / `window-out` | `windowChassis.css` |
| **Engulf** | A Window's content promoting into the main pane | Engulf | `PageWindow.tsx` |

The `dropdown` motion token becomes `menu`; the Bloom keyframes and origin var follow it (`--menu-origin`). PaneSlide keeps its name and its primitive. SideSlide is the one motion that has three hand-rolled homes and no primitive — §The Calls carries whether it gets one.

### The Renames

Current name → V2 name, with the file that carries it. A row marked *fold* is two things becoming one; every other row is a rename and a `git mv`.

#### Menus

| Today | V2 | Where |
|---|---|---|
| `MenuDropdown` | `Menu` (the trigger + surface) | `DesignSystem/Components/Menu/MenuDropdown.tsx` |
| `MenuSurface` | *fold* into `Menu` — the surface is the menu | `DesignSystem/Components/Menu/MenuSurface.tsx` |
| `Menu` (the row column) | `MenuList` | `DesignSystem/Components/Menu/Menu.tsx` |
| `MenuScrollFrame` | `MenuScroll` — the cap/scroll/footer wrapper, not a Frame | `DesignSystem/Components/Menu/Menu.tsx` |
| `SpaceDropdown` · `OutlineDropdown` | `SpaceMenu` · `OutlineMenu` | `Toolbar/` |
| `ViewDropdown` + `ViewPane` | `ViewMenu` — the trigger and its content are one menu; its pages are Panes | `Toolbar/ViewDropdown.tsx` · `Toolbar/ViewPane.tsx` |
| `NavPane` | `NavMenu` | `Toolbar/NavPane.tsx` |
| `SettingsDropdown` + `SettingsPane` | `SettingsMenu` | `Components/Detail/SettingsDropdown.tsx` · `SettingsPane.tsx` |
| `toolbarDropdown.css.ts` · `outlineDropdown.css.ts` · `dropdownAnchor` | `toolbarMenu.css.ts` · `outlineMenu.css.ts` · `menuAnchor` | `Toolbar/` · `DesignSystem/Components/` |
| `settingsPane.css.ts` | `settingsMenu.css.ts` — it styles the menu and its panes | `Components/Detail/` |
| `PageMenu` · `BlockHandleMenu` · `PickerMenu` | stay | — |

#### Panes

| Today | V2 | Where |
|---|---|---|
| `GroupingPane` · `SortingPane` | `GroupPane` · `SortPane` — the noun, like their siblings | `Components/Detail/` |
| `FilterPane` · `HiddenPane` | stay | `Components/Detail/` |
| `ViewSettings` | `LayoutPane` | `Components/Detail/ViewSettings.tsx` |
| `PropertiesPane` | `PropertyPane` | `Properties/PropertiesPane.tsx` |
| the Settings window's leaves (`Leaf`, `LeafBodyView`, `TrashLeaf`) | `Pane` · `SettingsPane` · `TrashPane` — the same discipline as the menus' pages | `Settings/NexusSettings.tsx` · `Settings/TrashLeaf.tsx` |
| `MenuPaneTopRow` | stays | `DesignSystem/Components/Menu/Menu.tsx` |
| `Components/Detail/` | `Components/Panes/` — the folder the atlas left "by ruling" gets its real name with its contents | `Components/Detail/` |

Whether the per-type panes keep their own components is answered by what they hold: each is its own rows and logic over one shared shell (`MenuScrollFrame` + `MenuPaneTopRow` + `PaneSlider`), so the shell is already one thing and the names are the discipline, not duplication. A pane that turns out to be only a list of `ValueRow`s (the Sort pane is the candidate) can collapse into a config-driven one; the others cannot.

#### Frames

| Today | V2 | Where |
|---|---|---|
| `ConnectionHoverCard` · `HoverCardPresenter` · `hoverCardSize` | `PageFrame` / `WebFrame` by what it shows · `FramePresenter` · `frameSize` | `Embeds/` → `Connections/` per the atlas |
| `AutocompletePanel` | `AutoFrame` | `MarkdownPM/AutocompletePanel.tsx` |

#### Windows — executed

`PagePreview/` and `NavWindow/` are `Windows/`: `PageWindow`, `WebWindow`, `NavWindow`, `WindowActions`, `WindowInspector`, `WindowTabStrip`, `windowTabs`, `windowWarm`, `windowMorph`. The chassis is `DesignSystem/Components/WindowChassis/` (`.window-*`, `--window-*`, `window-in` / `window-out`); `SidePane` sits beside it in `Components/`. `Detail/DetailPane` is `Detail/ContentView` (`.content-view`); `NotchedPane` is `NotchedShell`; `Tabs/NavView` sits in `Detail/`. What remains of the family: `NexusSettings` → `SettingsWindow`, and the store's `closePreview` / `settingsOpen` names.

#### The Docs

`DesignSystemPM` §Components carries the five shapes as the vocabulary, replacing the six-word list; `InteractionPM` gains SideSlide as the side-slot motion; `InterfacePM` names the toolbar's Menus, the side slots, the four Windows, and the Frames; `ViewTypesPM` and `PropertiesPM` say Pane where they say leaf. Every mention is a one-word repair.

### The Calls

- **The side slot's word, and one primitive or two hosts.** `SidePane` is the sliding slot and every Window mounts it; the main window's sidebar and inspector do not — they drive `--io` / `--io-l` from `styles.css` on their own rules, which is why SideSlide has three homes. Under V2 "Pane" is a Menu's page, so the slot needs its own word (`SideSlot`, `Drawer`, or `SidePane` kept as a compound that no longer reads as a Pane). *Recommendation:* keep `SidePane` as the compound, mount it in the main window for both slots, and let SideSlide be one motion in one file. That mount is the only behavior change in this document.
- **`Detail` as a name.** `Detail/` → `Interface/` is ruled in the atlas; `DetailScaffold` → `InterfaceScaffold` follows.
- **The two inspectors.** `InspectorPanel` (main window) and `WindowInspector` (page window) draw the same frontmatter surface with different chrome. Whether they become one component or one name over two is measured by how much chrome they share, in the session that renames them.
- **`Menu` the component.** The row column becomes `MenuList` and the trigger-plus-surface takes the bare name — a bare `Menu` should be the thing a reader pictures.
- **Showcase leaves.** They stay "leaves" — the Showcase is leaving the design system and its internal names are its own.
- **The `dropdown` motion token.** Renamed `menu` in the Menu session, which is already in every file that reads `--dropdown-origin`.

### The Order

1. **Menus** — the toolbar's three, `MenuDropdown` / `MenuSurface` / `MenuScrollFrame`, the `dropdown` token and origin var, the stylesheets.
2. **Panes** — `GroupPane`, `SortPane`, `LayoutPane`, `PropertyPane`, the Settings leaves, `Components/Detail/` → `Components/Panes/`.
3. **Frames** — the hover card's three files and the autocomplete.
4. **The side slot** — the main window onto `SidePane`, SideSlide consolidated, the two inspectors reconciled, `SettingsWindow`.
