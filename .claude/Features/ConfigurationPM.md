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
├── Write Discipline
├── App Configuration (Per-Device)
└── Pending
```

Configuration reads at three scopes. A **[[ArchitecturePM|Nexus]]** is configured from the Settings window, whose knobs live in `.nexus/settings.json` and travel with the Nexus. A **[[CollectionsPM|Collection]]** is configured from its own sidecar, governing how its pages open and how its views present themselves. A **[[PagesPM|Page]]** carries its own frontmatter. Beneath all three sits a per-device layer that never syncs: the app config beside the application, and the machine-and-Nexus preferences in the Nexus's own database.

### Settings

The Nexus' primary settings are placed on a floating window summoned from the sidebar ribbon's settings glyph, mounted on the shared **PreviewPane** surface — inheriting its glass shell, geometry, and dismissal behavior.

#### General

| Setting | Key | Description | Options |
| -- | -- | ----- | --- |
| Date Format | `dateFormat` | The date format that every interface without one of its own takes. | MM/DD/YYYY · DD/MM/YYYY · Short Date · **Full Date** · Relative |
| Time Format | `timeFormat` | The Nexus's clock, wherever a time renders. | **12 Hours** · 24 Hours |

#### Interface

| Setting | Key | Description | Options |
| ------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------- | ------------ |
| Hide Disclosure Chevrons | `hideChevrons` | Collapses the sidebar's chevron gutter. | On · **Off** |
| Reveal Tab Bar On Hover | `revealTabBarOnHover` | Keeps the tab bar hidden until the pointer nears it. | On · **Off** |
| Use Native Menus | `nativeMenus` | Draws plain-list menus as system menus. Belongs to the computer rather than the Nexus, so it lives in the device database. | On · **Off** |
| Show Selection In Pickers As | `pickerSelection` | How every picker marks the row you are on — a filled, outlined row or a trailing checkmark. | **Outlined** · Checked |
| Embed Scale | `embedScale` | The scale embedded pages and views start at; a block's own toggle compounds it. A second press on the control types any scale within the range. | 50%–150% (**90%**) |

**Webpages**

| Setting | Key | Description | Options |
| --------------------- | ---------------- | ------------------------------------------------------------------- | ------------------- |
| Open Links In Pommora | `openLinksInApp` | External links open the floating browser instead of the system one. | On · **Off** |
| Webpage Zoom | `webZoomFactor` | How embedded webpages scale, relative to the window. A second press on the control types any scale within the range. | 50%–150% (**100%**) |

#### Navigation

| Setting | Key | Description | Options |
| --------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------- |
| Close Navigation On Select | `navCloseOnSelect` | Picking an entity dismisses the Navigation window. | **On** · Off |
| Open Connections In Preview | `connectionsOpenInPreview` | A connection click opens the preview window instead of navigating. ⌘-click always takes the other route. | On · **Off** |
| Hover Preview Linger | `hoverPreviewLinger` | How long a connection's hover preview stays open after hovering off. | **None** · 1–30 seconds |

#### Appearance

The three colors the interface derives from. Each opens the ramp grid without its greyscale families — those cells run into the window substrate, so a link or an accent wearing one would be invisible against the page it sits on — and each clears to whatever it inherits rather than to nothing. A color resolved through the chip recipe instead of painted raw can take the grey row and asks for it; the [[#Pages & Editor|checkbox]] is the one that does. Default icons and the default view scale land here once they have controls.

| Setting | Key | Description | Options |
| ------- | --- | ----------- | ------- |
| Accent Color | `accent` | The color every accented surface derives from. | A ramp cell · **the system accent** |
| Internal Link Color | `connectionColor` | Connections to other pages. | A ramp cell · **the accent** |
| External Link Color | `externalLinkColor` | Links out to the web. | A ramp cell · **the system accent** |
|         |     |             |         |

#### Files & Links

**Pasted Links**

| Setting | Key | Description | Options |
| --------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------- |
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
| Default Asset Directory | `asset_directory` | Where inherited assets, images, and other file types will be stored. | Any folder in the Nexus · **`.nexus/assets`** |

**Deletion**

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Permanently Delete Files | `permanentDelete` | Erases an emptied item from the computer rather than handing it to the system trash. | On · **Off** |

#### Properties

Seated and empty.

| Setting | Key | Description | Options |
| ------- | --- | ----------- | ------- |
|         |     |             |         |

#### Pages & Editor

| Setting                        | Key                  | Description                                             | Options      |
| ------------------------------ | -------------------- | ------------------------------------------------------- | ------------ |
| Editor Scale                   | `editorScale`        | How large a page reads — its text, its title, and the chrome around them. An embedded page keeps its own scale. | 50%–150% · **100%** |
| Outliner Lines                 | `outlinerLines`      | Draws indent rails on nested lists in the editor.       | On · **Off** |
| Show Footnotes By Default      | `citationsShown`     | Opens a page with its footnotes section showing. A page's own setting outranks this. | On · **Off** |
| Jump To Citation On Creation   | `jumpToCitation`     | Carries the caret down to the citation a new footnote just made. | **On** · Off |
| Highlight Color                | `highlightColor`     | The wash behind highlighted text. Cleared follows the accent. | Any ramp cell · **the accent** |
| Checkbox Color                 | `checkboxColor`      | The color a task checkbox fills and checks with, the greyscale row included — a cell resolves through the chip recipe rather than being painted raw. Cleared follows the accent. | Any ramp cell · **the accent** |
| Code Color                     | `codeColor`          | Inline `code` and the wash behind it. Cleared removes the key so the theme's own red keeps answering. | Any ramp cell, greyscale included · **red** |
| Show Line Count In Code Blocks | `codeblockLineCount` | Numbers a codeblock's content lines as rendered glyphs. | On · **Off** |
| Mute Checked Items             | `muteCheckedItems`   | A checked task reads as done — its words dimmed and struck through. Drawn, never written. | On · **Off** |
| Display Unresolved Links As Plain Syntax | `plainUnresolvedLinks` | A link leading nowhere reads as the prose it is written as, rather than muted with its syntax showing. Page prose only — cells and other fields stay muted. | On · **Off** |

#### Automations

Seated and empty.

| Setting | Key | Description | Options |
| ------- | --- | ----------- | ------- |
|         |     |             |         |

#### Shortcuts

Keyboard shortcuts are data, not code: the `commands` object in `.nexus/settings.json` maps command ids to shortcut specs, and every future rebindable shortcut registers as a row in that map. Defaults live in code and are overlaid with the on-disk block on read — a malformed or absent entry falls back to its built-in binding rather than losing the shortcut. Specs are `+`-joined modifier chains ending in a key, matched exactly so overlapping bindings can't double-fire. The leaf has no interface yet, so rebinding is hand-edited.

| Command | Key | Description | Binding |
| -------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Toggle Ribbon | `toggle-ribbon` | Slides the sidebar's ribbon strip away and back. | ⌘T |
| Toggle Navigation | `toggle-nav` | Summons the Navigation window. | ⌘O |
| Inverse Paste | `paste-inverse` | Pastes the opposite way a plain paste behaves.[^1] It takes the chord Paste and Match Style holds by default, so that item keeps its act under the name **Paste Without Formatting** but gives up its accelerator. | ⌘⇧V |

#### Trash

The one surface leaf, anchored below the rail's separator. Its body is the deletion record's browser[^2] rather than a list of rows, and the column's own heading menu carries its two display knobs.

| Setting | Key | Description | Options |
| --- | --- | --- | --- |
| Date Format | `trashDateFormat` | How the browser writes a deletion's date. Unset, it follows the Nexus's own date form. | Short Date · Full Date |
| Show Time | `trashHideTime` | Whether that date carries its clock. | **Shown** · Hidden |

### Collections

A Collection's own configuration, stored in its `_pagecollection.json` sidecar and set from the collection's Configuration pane. A Set carries the same keys in `_pageset.json` at any depth, except `open_in`, which is Collection-owned and proxied by its Sets.

| Setting | Key | Description | Options |
| --------------- | ---------------- | -------------------------------------------------------------------- | ---------------------------- |
| Open In | `open_in` | How a page opens from its container. | **Full Page** · Page Preview |
| Show Title | `view_button` | Whether the view dropdown button displays the view's name alongside its glyph. | **Icon** · Labeled |
| View Style | `view_style` | How the view switcher presents itself | **Dropdown** · Toolbar |

The sidecar's remaining fields are structure rather than configuration: the entity's ID and icon, its banner, its page and set ordering, its property assignment list, and its saved views.[^3]

### Pages

A page's frontmatter carries its identity and property values; its configuration is not yet documented here.

| Setting | Key | Description | Options |
| ------- | --- | ----------- | ------- |
|         |     |             |         |

### Personalization

Nexus-wide interface config, stored as the `personalization` object in `.nexus/settings.json`. A key the schema doesn't parse is dropped on read and falls back to its default, so a hand-typed bad value reverts on the next open. Every key the Settings window writes is tabled above; the rest are written by the app itself rather than by a row.

- **accent** — the app-wide accent: a ramp cell, a legacy solid name, or `system` to follow the OS.
- **connectionColor** — the inline `[[Title]]` connection color; tracks the accent live by default, or pins a ramp cell.
- **externalLinkColor** — the `[text](url)` color; tracks the system accent live by default, or pins a ramp cell.
- **defaultIcons** — the per-kind default icon, overriding the built-in seed; an entity's own icon still wins over it.
- **favoriteIcons** — the icons favorited in the Icon Picker, in display order. Written by the picker itself.
- **setPlacement / subSetPlacement** — where the folders sit: a Collection's depth-1 Sets and a Set's Sub-Sets sit above (the default) or below their container's loose pages, so "pages on top" is spelled `bottom`. The knobs are independent tiers — `setPlacement` never moves a Set's own pages, and set-level pages answer only to `subSetPlacement`. The folder block stays contiguous; a full folder↔page interleave is the eventual model.
- **sidebarMode** — the sidebar ribbon's active content mode. Written live by the ribbon and remembered across restarts.
- **ribbonOrder** — the ribbon's launcher-icon order below the pinned Homepage. Written by drag-to-reorder; a partial or stale value is repaired on read, so a newly added icon never vanishes.
- **defaultViewScale** — the window zoom a Nexus opens at, and what ⌘0 resets to. Stated as a multiplier where 1.0 is the interface at its intended size; the host zoom it resolves to is a step below that, so the chrome reads at its drawn scale rather than the browser's. Clamped on read and applied main-side.

### Write Discipline

Every `settings.json` write funnels through one per-file serialize lock, so concurrent writers can't drop each other's keys. Unrecognized keys are preserved by value on write, so a key one build doesn't know — desktop ↔ mobile version skew — survives the round-trip.

### App Configuration (Per-Device)

Cross-session, machine-local state in `pommora.json` under the app's userData directory: the last-opened Nexus, the roll-off list of recently opened Nexuses behind Open Recent, and the delete target. It is never part of a Nexus and never syncs. The Navigation layer's own recents are a separate stream — visited entities within one Nexus, stored in that Nexus's database.

A second class of machine-local state resides in the Nexus's own database rather than alongside the app: preferences for a machine-Nexus pair. **Use Native Menus** is the first, tabled under §Interface above.

### Pending

- **Beyond the knobs that ship** — default icons, both placement knobs, and the default view scale have no in-app writer and are hand-set in `settings.json`, with the watcher applying the change live. All are wireable through the existing setter.
- **Scopes with no renderer-facing setter** — the per-device app config has no IPC a UI could write through; it needs a handler first. The profile is further along: its image is a picked file adopted like a banner and framed by a crop, its icon a glyph name — both written from the ribbon's identity menu, and the subtitle has an op and handler waiting on a surface to drive them.
- **Command rebinding** — data-ready and unbuilt; shortcuts don't ship without per-shortcut sign-off. The Shortcuts leaf lists its bindings and offers no control over them until they do.
- **Two names for one date form** — the Trash column's own menu calls `monthDayYear` "Short Date", where every other surface calls it "MM/DD/YYYY" and reserves "Short Date" for the `short` form. The two vocabularies need reconciling.
- **Page configuration** — §Pages is scaffolded and unwritten.

[^1]: [[MarkdownPM]] §Pasted links
[^2]: [[NexusRecordPM]] §Trash & Deletion
[^3]: [[ViewsPM]]
