## Configuration

```
Configuration
├── Settings
│   ├── General
│   ├── Interface
│   ├── Navigation
│   ├── Appearance
│   ├── Files & Links
│   ├── Properties
│   ├── Pages & Editor
│   ├── Automations
│   ├── Shortcuts
│   └── Trash
├── Collections
├── Pages
├── Personalization
├── App Configuration (Per-Device)
└── Pending
```

Configuration reads at three scopes. A **Nexus** is configured from the Settings window, whose knobs live in `.nexus/settings.json` and travel with the Nexus; a **Collection** from its own sidecar, governing how its pages open and how its views present themselves; a **Page** from its own frontmatter and its per-machine chrome. Beneath all three sits a per-device layer that never syncs: the app config beside the application, and the machine-and-Nexus preferences in the Nexus's own database.[^1] This document is the one roster of every knob; other documents name a setting by its label and point here.

### Settings

The Nexus Settings window is a floating window summoned from the ribbon's Settings glyph, mounted on the shared window chassis.[^2] Its rail lists the frames below; each row writes one key of the `personalization` object (`Personalization` in `src/shared/types.ts`), and a row at its default stores no key. Defaults are bold.

#### General

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Date Format | `dateFormat` | The date format every interface without one of its own takes. | MM/DD/YYYY · DD/MM/YYYY · Short Date · **Full Date** · Relative |
| Time Format | `timeFormat` | The Nexus's clock, wherever a time renders. | **12 Hours** · 24 Hours |

#### Interface

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Hide Disclosure Chevrons | `hideChevrons` | Collapses the sidebar's chevron gutter. | On · **Off** |
| Reveal Tab Bar On Hover | `revealTabBarOnHover` | Keeps the tab bar hidden until the pointer nears it. | On · **Off** |
| Use Native Menus | `nativeMenus` | Draws plain-list menus as system menus. A machine-level preference, stored in the device database rather than the Nexus. | On · **Off** |
| Use Native Highlighting | `nativeHighlight` | Selected text uses the system's own highlight instead of Pommora's drawn one. | On · **Off** |
| Show Selection In Pickers As | `pickerSelection` | How every picker marks the row you are on. | **Outlined** · Checked |
| Interface Scale | `defaultViewScale` | The scaling factor applied to the entire interface; additional scaling preferences compound this value. Also what ⌘0 resets to. | 50%–150% in ten-point steps (**100%**) |
| Embed Scale | `embedScale` | The scale embedded pages and views start at; a block's own Scale compounds it. | 50%–150% (**90%**) |

**Webpages**

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Open Links In Pommora | `openLinksInApp` | External links open the floating browser instead of the system one. | On · **Off** |
| Webpage Zoom | `webZoomFactor` | How embedded webpages scale, relative to the window. | 50%–150% (**100%**) |

#### Navigation

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Close Navigation On Select | `navCloseOnSelect` | Picking an entity dismisses the Navigation window. | **On** · Off |
| Open Connections In Preview | `connectionsOpenInPreview` | A connection click opens the Page Window instead of navigating; ⌘-click takes the other route. | On · **Off** |
| Hover Preview Linger | `hoverPreviewLinger` | How long a connection's hover preview stays open after hovering off. | **None** · 1–30 seconds |

#### Appearance

The three colors the interface derives from. Each opens the ramp grid without its greyscale families, and each clears to what it inherits rather than to nothing.

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Accent Color | `accent` | The color every accented surface derives from. | A ramp cell · `system` to follow the OS · **cyan** |
| Internal Link Color | `connectionColor` | Connections to other pages. | A ramp cell · **the accent** |
| External Link Color | `externalLinkColor` | Links out to the web. | A ramp cell · **the system accent** |

#### Files & Links

**Pasted Links**

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Default Format | `defaultLinkFormat` | Which form a pasted address is written in. | **Full Link** · Short Link · Page Title |
| Paste Link Into Text | `pasteLinkIntoText` | Pasting an address over selected text turns that text into the link instead of replacing it. | On · **Off** |

**Connections**

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Remove Title On Link Change | `removeTitleOnLinkChange` | Pointing a connection at another page drops the alias it was wearing. | **On** · Off |
| Automatically Suggest Existing Aliases When Linking A Page | `aliasPickerOnCommit` | Accepting a page from the connection picker offers the names it already carries. | **On** · Off |

**Assets**

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Default Asset Directory | `asset_directory` | Where banners, the profile image, and file attachments are stored. Written at the settings root rather than under `personalization`. | Any folder in the Nexus · **`.nexus/assets`** |

**Deletion**

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Permanently Delete Files | `permanentDelete` | Erases an item emptied from the trash rather than handing it to the system trash. | On · **Off** |

**Exclusions**

| Setting | Key | Description | Options |
| --- | --- | --- | --- |

#### Properties

Seated and empty.

#### Pages & Editor

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Editor Scale | `editorScale` | How large a page reads — its text, its title, and the chrome around them. An embedded page keeps its own scale. | 50%–150% (**100%**) |
| Outliner Lines | `outlinerLines` | Draws indent rails on nested lists in the editor. | On · **Off** |
| Show Footnotes By Default | `citationsShown` | Opens a page with its footnotes section showing. A page's own setting outranks this. | On · **Off** |
| Jump To Citation On Creation | `jumpToCitation` | Carries the caret down to the citation a new footnote just made. | **On** · Off |
| Highlight Color | `highlightColor` | The wash behind highlighted text. Cleared follows the accent. | Any ramp cell · **the accent** |
| Checkbox Color | `checkboxColor` | The color a task checkbox fills and checks with, the greyscale row included. Cleared follows the accent. | Any ramp cell · **the accent** |
| Code Color | `codeColor` | Inline code and the wash behind it. | Any ramp cell, greyscale included · **red** |
| Show Line Count In Code Blocks | `codeblockLineCount` | Numbers a code block's content lines. | On · **Off** |
| Mute Checked Items | `muteCheckedItems` | A checked task reads as done — dimmed and struck through. Drawn, never written. | On · **Off** |
| Display Unresolved Links As Plain Syntax | `plainUnresolvedLinks` | A link leading nowhere reads as the prose it is written as rather than muted with its syntax showing. Page prose only. | On · **Off** |

#### Automations

Seated and empty.

#### Shortcuts

Keyboard shortcuts are data: the `commands` object in `settings.json` maps command ids to shortcut specs, with defaults in code (`DEFAULT_COMMANDS`) overlaid by the on-disk block on read, so a malformed or absent entry falls back to its built-in binding. Specs are `+`-joined modifier chains ending in a key. The leaf lists its bindings and offers no control over them yet; rebinding is hand-edited.

| Command | Key | Description | Binding |
| --- | --- | --- | --- |
| Toggle Ribbon | `toggle-ribbon` | Slides the sidebar's ribbon strip away and back. | ⌘T |
| Toggle Navigation | `toggle-nav` | Summons the Navigation window. | ⌘O |
| Inverse Paste | `paste-inverse` | Pastes the opposite way a plain paste behaves.[^3] | ⌘⇧V |

#### Trash

The one frame that is a surface of its own, anchored below the rail's separator. Its body is the deletion record's browser,[^4] and its column heading's menu carries the two display knobs.

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Date Format | `trashDateFormat` | How the browser writes a deletion's date. Unset, it follows the Nexus's own date form. | Short Date · Full Date |
| Show Time | `trashHideTime` | Whether that date carries its clock. | **Shown** · Hidden |

### Collections

A Collection's own configuration, stored in its `_pagecollection.json` sidecar and set from the container's Configuration pane. A Set carries the same keys in `_pageset.json` at any depth, except `open_in`, which is Collection-owned and proxied by its Sets.[^5]

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Open In | `open_in` | How a page opens from its container. | **Full Page** · Page Preview |
| Show Title | `view_button` | Whether the view menu button shows the view's name beside its glyph. | **Icon** · Labeled |

The sidecar's remaining fields are structure rather than configuration: the entity's id and icon, its banner, its page and set ordering, its property assignment list, and its saved views.[^6]

### Pages

A page's own configuration splits by where it lives: identity and appearance in the file, chrome per machine.[^7]

| Setting | Where | Description | Set from |
| --- | --- | --- | --- |
| Icon | `icon` in frontmatter | The page's glyph, shown beside its title where the header is opted in. | The header's or a row's Edit Icon |
| Cover | `cover` in frontmatter, its crop in `.nexus/crops.json` | The banner image and how it is framed. | The header's banner menu |
| Header icon | `nexus.db` | Whether the header draws the glyph. | The header's Hide Icon / Show Icon |
| Footnotes | `nexus.db` | Whether the citations section shows, overriding Show Footnotes By Default. | The Subfield's Show / Hide Footnotes |
| Heading folds | `nexus.db` | Which headings are collapsed. | The fold chevrons |
| Embed heights and Scale | `nexus.db` | Each embedded tile's dragged height and Scale factor, per host page and target. | The tile's edge and grip menu |
| Heading columns | `nexus.db` | Per-table heading-column choices. | The table grip menu |

### Personalization

The `personalization` object in `settings.json` holds every key the Settings window writes, tabled above, plus the keys the app writes for itself. A key the schema doesn't parse falls back to its default on read.

| Key | Written by | Description |
| --- | --- | --- |
| `defaultIcons` | Hand-edited | The per-kind default icon, overriding the built-in seed; an entity's own icon still wins. |
| `favoriteIcons` | The Icon Picker | The icons favorited in the picker, in display order. |
| `setPlacement` · `subSetPlacement` | Hand-edited | Whether a Collection's depth-1 Sets, and a Set's Sub-Sets, sit above (the default) or below their container's loose pages. The folder block stays contiguous. |
| `sidebarMode` | The ribbon | The sidebar's active content mode, remembered across restarts. |
| `ribbonOrder` | Drag-to-reorder | The ribbon's icon order below the pinned Homepage; a partial or stale value is repaired on read. |

Three more keys sit at the settings root beside `personalization`: `excluded_folders`, the anchored Nexus-relative paths the walk, watcher, index, and cascades all skip, written by the Files & Links › Exclusions pane;[^8] the profile — `profile_image`, `profile_icon`, `profile_subtitle` — written from the ribbon's identity menu; and the app-owned `subfield` and `navViewModes` blocks the Subfield and the navigation surfaces persist their own state in. Every `settings.json` write serializes through one per-file lock and preserves unrecognized keys by value, so a key one build doesn't know survives the round trip.

### App Configuration (Per-Device)

Cross-session, machine-local state in `pommora.json` under the app's userData directory (`src/main/appConfig.ts`): the last-opened Nexus, the roll-off list of recently opened Nexuses behind Open Recent, and the delete target — the in-Nexus `.trash` or the system trash. It is never part of a Nexus and never syncs. A second class of machine-local state lives in the Nexus's own database as preferences for a machine-and-Nexus pair; Use Native Menus is the first.

---

#### Pending

- **Knobs without a row** — default icons and the placement keys are hand-set in `settings.json`, with the watcher applying the change live; both are wireable through the existing setter.
- **Scopes without a renderer setter** — the per-device app config has no IPC a UI could write through. The profile is further along: its image and icon are written from the ribbon's identity menu, and the subtitle has an op and handler waiting on a surface.
- **Command rebinding** — data-ready and unbuilt; shortcuts don't ship without per-shortcut sign-off.
- **Two names for one date form** — the Trash column's menu calls `monthDayYear` "Short Date", where every other surface calls it "MM/DD/YYYY" and reserves "Short Date" for the `short` form.

[^1]: [[ArchitecturePM]] §Persistence
[^2]: [[InterfacePM]] §Floating Windows
[^3]: [[MarkdownPM]] §Constructs
[^4]: [[NexusRecordPM]] §Provenance
[^5]: [[CollectionsPM]] §Open In
[^6]: [[ViewTypesPM]]
[^7]: [[PagesPM]]
[^8]: [[ArchitecturePM]] §Folder Exclusion
