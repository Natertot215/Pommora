## Design Terms V2

**Date:** 08-26-2026 · **Scope:** every floating or sliding surface in the renderer, the motions between them, and the names in code, CSS, and the Feature docs that carry them · **Status:** ruled 08-26 and applied — every rename below is on disk; what remains is the Menu recipe's row kinds, the rosters, and the main window mounting `SidePane`

One word per shape. "Pane" named five different things — a toolbar dropdown's content (`ViewPane`, `NavPane`, `SettingsPane`), the page inside its drill-down (`FilterPane`, `GroupingPane`, `SortingPane`, `HiddenPane`, `PropertiesPane`), the beaked shell they hang in (now `NotchedShell`), the chassis every floating window mounted, and the sliding side slot (`SidePane`, `InspectorPanel`); "Preview" named a window that previews nothing. The chassis is now `WindowChassis` and the floating family lives in `Windows/`; the rest of this document decides the others. The vocabulary below gives each shape one word, each word one test, and each motion the word of the shape it moves. Nothing here changes behavior; it changes what things are called so the next surface is named by its shape rather than by where it was first mounted.

### The Terms

Five shapes, ruled. A surface is exactly one of the five.

| Term | What it is | Today | Motion |
|---|---|---|---|
| **Window** | A floating, movable, resizable surface with its own toolbar — `PageWindow`, `WebWindow`, `NavWindow`, the Settings window. Mounts `WindowChassis`. | executed | Scale-fade in/out; Engulf on promote |
| **Pane** | A surface floating over another — the sidebar and the inspector on the main window, the tab strip and inspector on a floating one, and the surfaces anchored in content: the connection hover preview and the editor's autocomplete. Wears `glass-pane`. | `SidePane`, `InspectorPane`, `ConnectionPane`, `AutocompletePane` | **PaneSlide** — the sidebar's and inspector's in-out |
| **Menu** | A dropdown surface hung off a trigger — the toolbar's Space, Outline, View, Settings, Nav menus; a right-click; a picker's options. Wears `glass-surface`. | `MenuDropdown` + `MenuSurface` + `NotchedShell` in `Menus/`; `SpaceMenu`, `OutlineMenu`, `ViewMenu`, `SettingsMenu`, `NavMenu` | Bloom, on the `menu` token |
| **Frame** | One page inside a Menu or a Window's hierarchy — Filter, Group, Sort, Hidden, Layout, Properties, each Settings category. | `FilterFrame`, `GroupFrame`, `SortFrame`, `HiddenFrame`, `LayoutFrame`, `PropertyFrame`, `SettingsFrame`, `ViewFrame`, the Settings window's `FRAMES` | **FrameSlide** — the push/back between frames (`Menus/frame-slide`) |
| **Picker** | A control that presents a bounded set of values and commits one. Unchanged. | — | — |

**Dropdown**, **Preview**, **Leaf**, and **Panel** leave the vocabulary. **Surface** stays SurfacePM's word for the dashboard. **Card** is the `src/Cards` chassis.

### The Menu Recipe

`DesignSystem/Menus/` exists with the files below; the recipe work — the row kinds named once, `menu-roster`, the fold of `MenuDropdown` + `MenuSurface` into one `Menu`, `MenuScrollFrame` → `MenuScroll` — is the next session. The recipe names every row kind once, and a Frame picks kinds rather than declaring type, tone, or padding of its own. The pane stylesheets that exist today (`settingsPane.css.ts` at forty exports, `filterPane.css.ts`, `groupingPane.css.ts`, `viewSettings.css.ts`) shrink to geometry or disappear, and the three files that each decide what a header looks like become one line in `menu-base.css`.

```
// DesignSystem/Menus                    | • The Menu recipe — one shell, one row vocabulary, one frame chassis
├── menu-base.tsx · menu-base.css        | • The trigger + surface (folds MenuDropdown, MenuSurface); every row kind's type rung, tone, and geometry
├── menu-shell.tsx · menu-shell.css      | • The beaked glass-surface the menu wears (today's NotchedShell)
├── menu-row.tsx                         | • The row kinds: item, heading, section title, sub-label, detail, control row, chip run, slider row, sub row
├── menu-frame.tsx                       | • The frame chassis: top row, scroll body, bottom row, FrameSlide hosting (folds MenuScrollFrame, MenuPaneTopRow, MenuBottomRow)
├── menu-roster.tsx                      | • NEW — renders a roster: sections → rows of a kind, each kind's control in the trailing slot
├── menu-accessory.tsx                   | • The one icon-button recipe (today's AccessoryButton)
├── menu-anchor.ts                       | • Today's dropdownAnchor
├── frame-slide.tsx                      | • Today's PaneSlider
└── index.ts
```

Row-kind values the recipe owns: the icon ↔ title gap (`ROW_GAP` 8), the row inset (`ROW_PAD_X`), the row floor (24px), the gutter (`MENU_GUTTER` 10px), the shell corner (`BEAK_RADIUS` 12), the minimum width (225px), and one type rung per kind.

### The Frames Folder

Executed as renames; Sort and Hidden are still components until the roster exists, and the frame stylesheets still carry their type and tone until the recipe takes them.

```
// Frames                                | • The frames the Menus and Windows open onto — feature code, RENAMED from Components/Detail
├── SettingsMenu.tsx                     | • The toolbar's Settings trigger + its frame stack (today's SettingsDropdown + SettingsPane)
├── LayoutFrame.tsx                      | • Today's ViewSettings — a roster with the type-tile grid as its one custom row
├── FilterFrame.tsx · filterDnd.ts       | • Logic-shaped: the filter-tree editor; no stylesheet
├── GroupFrame.tsx · groupDnd.ts         | • Logic-shaped: set hierarchy and sub-group order; no stylesheet
├── sortRoster.ts · hiddenRoster.ts      | • Sort and Hidden as data — no component; menu-roster renders them
├── PageMenu.tsx                         | • The page's right-click / ⋮ menu
├── frameDnd.tsx                         | • Today's paneDnd — the engine binding the DnD frames share
└── frames.css.ts                        | • Geometry only — the frame width, the type-tile grid, the swatch grid
```

`Properties/PropertyFrame.tsx` stays in the value layer (R4). The Settings window's leaves become `SettingsFrame` / `TrashFrame` and its `LEAVES` roster becomes `menu-roster` input. The toolbar's triggers become `SpaceMenu`, `OutlineMenu`, `ViewMenu`, `NavMenu` in `Toolbar/`. What disappears: `SortingPane.tsx`, `HiddenPane.tsx`, `MenuDropdown.tsx`, `MenuSurface.tsx`, `Settings/SettingsRow.tsx`, `groupingPane.css.ts`, `viewSettings.css.ts`, most of `settingsPane.css.ts` and `filterPane.css.ts`.

### The Glass Family — executed

`DesignSystem/Glass/`, one recipe and four tiers named by what they are for. `GlassPane` and `GlassSurface` traded names in the move: the menu glass is `GlassSurface`, the clear chrome tier is `GlassPane`. `PickerMenu` takes `glass="pane"` for the two anchored panes.

| File | What it is | Today | Worn by |
|---|---|---|---|
| `glass-base` | The shared recipe — `frostStyle`, the frost params, `OUTLINE_INSET`, the ghost frost | `glass-pane.tsx` (the functions) + `glass-material.ts` | every tier below; the drag ghost |
| `glass-window` | The 90% `--bg-window` fill — `WINDOW_FROST` | `GlassWindow` | `WindowChassis`, the ImagePicker |
| `glass-surface` | The standard menu glass — `PANE_FROST`, no fill | `GlassPane` | `menu-shell`, `PickerMenu` |
| `glass-control` | The liquid-glass control optics, and the knob segment | `GlassControls` + `GlassSegment` | Button, DualSwitch, Slider |
| `glass-pane` | The 10% tint the chrome panes wear | `GlassSurface` (`frostMaterial`) + `Surface.tsx` | the sidebar, the inspector, `SidePane` |

Menus pull from `glass-surface`; Panes from `glass-pane`; Windows from `glass-window`. `GlassSegment` folds into `glass-control` as its `segment` optics.

### The Calls

- **The side slot's primitive.** The main window's sidebar and inspector do not mount `SidePane`; PaneSlide has three homes. The Panes session mounts it in the main window and consolidates the motion — the one behavior change in the vocabulary.
- **The two inspectors** — one component or one name over two — measured in the Panes session.

### The Order

1. **The Menu recipe** — the row kinds named once in `menu-base.css`, `menu-roster`, `MenuDropdown` + `MenuSurface` → `Menu`, `MenuScrollFrame` → `MenuScroll`; Sort and Hidden to rosters; the frame stylesheets to geometry.
2. **The side slot** — the main window onto `SidePane`, PaneSlide consolidated into one motion, the two inspectors reconciled, the store's `closePreview` / `settingsOpen` names.
