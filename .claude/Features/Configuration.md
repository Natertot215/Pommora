### Configuration

How a Nexus and the app get personalized. Two scopes: a per-Nexus layer in `.nexus/settings.json` — **personalization**, **labels**, and the profile (image + subtitle) — that travels with the Nexus and syncs, and a per-device **app config** that stays on the machine. A third scope — transient device-local UI state (folds, active view, view order, table headings) — is never synced and lives with the read engine (→ `Architecture.md`).

### Personalization (per-Nexus)

Nexus-wide interface config, stored as the React-owned `personalization` object in `.nexus/settings.json` (canonical, synced). It resolves through one schema, one read-side coercion pass, one **apply-map**, and one generic setter. The coercion pass is what admits a key at all — a key it doesn't parse is dropped on read, so the toggle appears to work and reverts on the next open. The apply-map is narrower: it holds a row only for a knob with a DOM effect (a CSS variable or a root class), and the knobs the renderer simply reads carry none.

#### II. Knobs

- **accent** — the app-wide accent: a spectrum solid, or `system` to follow the OS. Back-compatible with the legacy top-level `accent_color`.

- **connectionColor** — the inline `[[Title]]` connection colour; tracks the accent live by default, or pins a specific solid.

- **hideChevrons** — collapse the sidebar's disclosure-chevron gutter.

- **outlinerLines** — nested-list indent rails in MarkdownPM.

- **defaultIcons** — the per-kind default icon (Collection / Set / Space / Page, plus the Area slot the ribbon's Contexts glyph reads), overriding the built-in seed; an entity's own icon still wins over it.

- **setPlacement / subSetPlacement** — where the FOLDERS sit, never the pages: a Collection's depth-1 Sets (`setPlacement`) and a Set's Sub-Sets (`subSetPlacement`) sit above (`top`, default) or below (`bottom`) their container's loose pages — so "pages on top" is spelled `bottom`. The knobs are independent tiers: `setPlacement` never moves a Set's own pages (a Collection with no loose pages shows no visible change), and set-level pages answer only to `subSetPlacement`. The folder block stays contiguous — a full folder↔page interleave is the eventual model.

- **sidebarMode** — the sidebar ribbon's active content mode (Collections, Contexts, or Agenda); absent defaults to Collections. Written live by the ribbon and remembered across restarts.

- **ribbonOrder** — the ribbon's launcher-icon order below the pinned Homepage, as bare icon keys. Written by drag-to-reorder; a partial or stale value is repaired on read (unknown keys dropped, missing keys appended) so a newly-added icon never vanishes.

- **navCloseOnSelect** — whether picking an entity from the Navigation window dismisses it. Defaults on.

- **revealTabBarOnHover** — keep the toolbar's tab bar hidden until the pointer nears it.

- **connectionsOpenInPreview** — a `[[Connection]]` click opens the Page Preview window instead of navigating. ⌘-click always takes the full-page route, whichever way this knob is set.

- **favoriteIcons** — the icons favorited in the Icon Picker, in display order. Written by the picker itself.

- **defaultViewScale** — the window zoom a nexus opens at, and what ⌘0 resets to. Clamped on read and applied main-side, so a hand-typed value can't push the renderer somewhere unusable.

Accent, connection colour, default icons, both placement knobs, and the default view scale have no writer — they're hand-set in `settings.json`, and the watcher applies the change live. Every other knob is written by the surface that owns it. The boolean knobs are round-trip tested together against the silent-drop failure; a new one joins that test.

### Commands (per-Nexus)

Keyboard shortcuts are data, not code: the `commands` object in `.nexus/settings.json` maps command ids to shortcut specs, and every future rebindable shortcut registers as a row in this map. Defaults live in code (`DEFAULT_COMMANDS`) and are overlaid with the on-disk block on read, so every id always resolves — a malformed or absent entry falls back to its built-in binding rather than losing the shortcut. Specs are `+`-joined modifier chains (`cmd`, `ctrl`, `alt`, `shift`) ending in a key, matched exactly so overlapping bindings can't double-fire. Rebinding is hand-edited.

- **toggle-ribbon** — slides the sidebar's ribbon strip away and back (→ `Sidebar.md`).
- **toggle-nav** — summons the Navigation window (→ `Navigation.md`).

#### II. Write Discipline

Every `settings.json` write funnels through one per-file serialize lock (the same lock the page-write path uses), so concurrent writers can't drop each other's keys. Unrecognized keys are preserved by value on write, so a key one build doesn't know — desktop ↔ mobile version skew — survives the round-trip.

### Labels (per-Nexus)

Every entity kind carries a **renameable display label** in `settings.json` (`labels.*`, synced) — the code identity is fixed, the shown name is the user's. Each is a **LabelPair** (singular + plural); the deeper-Set label derives from the Set singular and is never stored. Seeding a fresh Nexus's Context registry takes its Context titles from the matching label plurals — from then on live Context names read from the registry itself, not from labels. A partial or absent `labels` blob falls back per field, so an unset name still resolves to its default.

### App Config (per-device)

Cross-session, machine-local state in `pommora.json` under the app's userData directory: the last-opened Nexus, the recents list, and the delete target (in-Nexus trash vs the system trash). It is never part of a Nexus, so it never syncs.

### The Settings Window

A floating window summoned from the sidebar ribbon's settings glyph, mounted on the shared **PreviewPane** surface (→ `PagePreview.md`) — so it inherits the glass shell, geometry, and dismissal contract rather than re-declaring them, and it opens smaller than a content window via that surface's bounds override. A category rail runs the window's full height as an in-flow side pane, leaving only the × above it; the rail is the roster new panels register in.

Its rows are the per-Nexus boolean knobs, written through the same generic setter every other personalization writer uses, so a flipped switch applies live with no new IPC. A knob whose default is ON stores only its OFF state — re-enabling removes the key entirely, so an untouched nexus keeps a clean settings file.

### Pending

**Beyond the boolean knobs:** accent and connection colour need pickers rather than switches, the placement knobs are two-value choices, and default icons need the Icon Picker per kind. All of these are wireable through the existing setter — no new plumbing.

**Scopes with no renderer-facing setter:** labels and the per-device app config have no IPC a UI could write through; each needs a handler before any surface can edit it. The profile is further along — its image and icon are already written from the ribbon's identity menu, and the subtitle has an op and handler waiting on a surface to drive them. Command rebinding is data-ready but deliberately unbuilt — shortcuts don't ship without per-shortcut sign-off.
