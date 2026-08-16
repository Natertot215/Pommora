## Configuration
```
Configuration
├── Personalization
├── Commands
├── Write Discipline
├── Labels
├── App Configuration (Per-Device)
├── The Settings Window
└── Pending
```

How a Nexus and the app get personalized. Two scopes: a per-Nexus layer in `.nexus/settings.json` — **personalization**, **labels**, the profile (image + subtitle), and the Subfield's own `subfield` key — that travels with the Nexus and syncs, and a per-device **app config** that stays on the machine. A third scope — per-machine chrome such as folds, the active view, and the tab and preview sets — is never synced and lives in the Nexus's device-local database. 

### Personalization

Nexus-wide interface config, stored as the `personalization` object in `.nexus/settings.json`. A key the schema doesn't parse is dropped on read and falls back to its default, so a hand-typed bad value reverts on the next open.

- **accent** — the app-wide accent: a spectrum solid, or `system` to follow the OS.
- **connectionColor** — the inline `[[Title]]` connection color; tracks the accent live by default, or pins a specific solid.
- **hideChevrons** — collapse the sidebar's disclosure-chevron gutter.
- **outlinerLines** — nested-list indent rails in MarkdownPM.
- **defaultIcons** — the per-kind default icon, overriding the built-in seed; an entity's own icon still wins over it.
- **setPlacement / subSetPlacement** — where the folders sit: a Collection's depth-1 Sets and a Set's Sub-Sets sit above (the default) or below their container's loose pages, so "pages on top" is spelled `bottom`. The knobs are independent tiers — `setPlacement` never moves a Set's own pages, and set-level pages answer only to `subSetPlacement`. The folder block stays contiguous; a full folder↔page interleave is the eventual model.
- **sidebarMode** — the sidebar ribbon's active content mode (Collections, Contexts, or Agenda); absent defaults to Collections. Written live by the ribbon and remembered across restarts.
- **ribbonOrder** — the ribbon's launcher-icon order below the pinned Homepage. Written by drag-to-reorder; a partial or stale value is repaired on read so a newly-added icon never vanishes.
- **navCloseOnSelect** — whether picking an entity from the Navigation window dismisses it. Defaults on.
- **revealTabBarOnHover** — keep the toolbar's tab bar hidden until the pointer nears it.
- **connectionsOpenInPreview** — a `[[Connection]]` click opens the Page Preview window instead of navigating. ⌘-click always takes the full-page route, whichever way this knob is set.
- **favoriteIcons** — the icons favorited in the Icon Picker, in display order. Written by the picker itself.
- **defaultViewScale** — the window zoom a nexus opens at, and what ⌘0 resets to. Clamped on read and applied main-side, so a hand-typed value can't push the renderer somewhere unusable.
- **hoverPreviewLinger** — how long a connection's hover preview stays open after hovering off, in whole seconds. Absent is **None** — only the short pointer-travel grace. Written by the Settings window's Pages slider; clamped on read, with zero or junk reading as None.
- **autoFormatPastedLinks** — whether an address pasted into MarkdownPM is written as a markdown link rather than as literal text. Absent is literal.
- **defaultLinkFormat** — which form that link takes: the whole address, its bare domain, or the site's page title (→ [[MarkdownPM]] §Pasted links). Absent is the whole address. Disclosed in Settings only while the knob above it is on.
- **pasteLinkIntoText** — whether pasting an address over selected text turns that text into the link instead of replacing it. Absent replaces.

### Commands

Keyboard shortcuts are data, not code: the `commands` object in `.nexus/settings.json` maps command ids to shortcut specs, and every future rebindable shortcut registers as a row in this map. Defaults live in code and are overlaid with the on-disk block on read — a malformed or absent entry falls back to its built-in binding rather than losing the shortcut. Specs are `+`-joined modifier chains ending in a key, matched exactly so overlapping bindings can't double-fire. Rebinding is hand-edited.

- **toggle-ribbon** — slides the sidebar's ribbon strip away and back.
- **toggle-nav** — summons the Navigation window.
- **paste-inverse** — pastes into an editor the opposite way the Pages settings say a plain paste behaves (→ [[MarkdownPM]] §Pasted links). It takes the chord the system's Paste and Match Style holds by default, so that item keeps its act under the name **Paste Without Formatting** but gives up its accelerator — while the role holds ⌘⇧V main-side, the keypress never reaches the editor at all.

### Write Discipline

Every `settings.json` write funnels through one per-file serialize lock, so concurrent writers can't drop each other's keys. Unrecognized keys are preserved by value on write, so a key one build doesn't know — desktop ↔ mobile version skew — survives the round-trip.

### Labels

Every entity kind carries a **renameable display label** in `settings.json` — the code identity is fixed, the shown name is the user's. Each is a **LabelPair** of singular and plural; the deeper-Set label derives from the Set singular and is never stored. Seeding a fresh Nexus's Context registry takes its Context titles from the matching label plurals; from then on live Context names read from the registry itself. A partial or absent `labels` blob falls back per field, so an unset name still resolves to its default.

### App Configuration (Per-Device)

Cross-session, machine-local state in `pommora.json` under the app's userData directory: the last-opened Nexus, the roll-off list of recently opened Nexuses behind Open Recent, and the delete target (in-Nexus trash vs the system trash). It is never part of a Nexus and never syncs. The Navigation layer's own recents are a separate stream — visited entities within one Nexus, stored in that Nexus's database. 

### The Settings Window

A floating window summoned from the sidebar ribbon's settings glyph, mounted on the shared **PreviewPane** surface — inheriting its glass shell, geometry, and dismissal contract, and opening smaller than a content window through that surface's bounds override. A category rail runs the window's full height as an in-flow side pane; the rail is the roster new panels register in.

Its rows are per-Nexus knobs — boolean switches, pickers, and the hover-preview linger's slider — written through the shared personalization setter and applied live. A row may be disclosed by another row's value rather than always shown, folding into place when the knob above it turns on. A leaf may instead carry a surface of its own: the rail's foot holds **Trash**, whose body is the deletion record's browser (→ [[NexusRecordPM]] §Trash & Deletion) rather than a list of toggles. The switch that browser obeys, **Permanently Delete Files**, is an ordinary General row — off, an emptied item goes to the operating system's trash; on, it is erased from the machine. A knob resting at its default stores no key (a default-ON switch stores only its OFF state, the slider's None stores nothing), so an untouched nexus keeps a clean settings file.

### Pending

- **Beyond the boolean knobs** — accent, connection color, default icons, both placement knobs, and the default view scale have no in-app writer and are hand-set in `settings.json`, with the watcher applying the change live. Accent and connection color need pickers, the placement knobs are two-value choices, and default icons need the Icon Picker per kind — all wireable through the existing setter.
- **Scopes with no renderer-facing setter** — labels and the per-device app config have no IPC a UI could write through; each needs a handler first. The profile is further along: its image and icon are written from the ribbon's identity menu, and the subtitle has an op and handler waiting on a surface to drive them.
- **Command rebinding** — data-ready and unbuilt; shortcuts don't ship without per-shortcut sign-off.
