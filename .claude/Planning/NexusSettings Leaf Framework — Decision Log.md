## NexusSettings Leaf Framework — Decision Log

### Frame

- **Purpose:** Give the Settings window a leaf foundation settings can accumulate into, and seat the rail's categories in the order they will keep.
- **Core Value:** A new setting lands in one obvious place, declared once, without touching the window's plumbing.
- **Success Criteria:** Adding a row means adding one entry to one roster. Every existing knob keeps working. The rail reads General → Interface → Navigation → Appearance → Files & Links → Properties → Pages & Writing → Automations → Shortcuts, with Trash anchored below a separator.

### Sources

- `Pommora/src/renderer/src/Settings/NexusSettings.tsx` — the window: `CATEGORIES` roster, `LEAVES` body map, the `Row` union (toggle · slider · device · picker), `KeyOf<V>` key-typing, `PreviewPane` host.
- `Pommora/src/renderer/src/Settings/nexusSettings.css` — rail rows, `.settings-body`, `.settings-section`, `.settings-row`; no section-heading tier exists.
- `Pommora/src/renderer/src/Settings/TrashLeaf.tsx` — the one surface leaf; owns its own header controls for `trashDateFormat` / `trashHideTime`.
- `Pommora/src/shared/types.ts` — `Personalization`; `TimeFormatSetting` + `DEFAULT_TIME_FORMAT`; `DEFAULT_COMMANDS`.
- `Pommora/src/shared/devicePrefs.ts` — `DevicePrefs`; `nativeMenus` is its only key.
- `Pommora/src/shared/columnStyles.ts` — `DATE_FORMATS`; `defaultStyleFor`, whose `url` arm already takes its default from a setting rather than a constant.
- `Pommora/src/renderer/src/Detail/Views/Table/columnStyles.ts:17` — `styleFor`, the one seam every column style resolves through.
- `Pommora/src/main/readNexus.ts:210` — `time_format` read from settings.json's top level into `tree.timeFormat`.
- `Pommora/src/renderer/src/store.ts:1015` — `setPersonalization`, the one writer both projections ride.
- `Pommora/src/renderer/src/Components/Detail/PickerControl.tsx` — two options toggle in place, three+ pop a `PickerMenu`.
- `.claude/Features/ConfigurationPM.md` — §The Settings Window and §Pending both go stale on this change.

### Decisions

#### A — Scope

- **A-1:** [confirmed] Build the framework and seat the rail; redistribute what exists. The missing writers (accent, connection color, placement, default icons, view scale) stay deferred.
- **A-2:** [confirmed] `ConfigurationPM.md` is reconciled after the code lands.
- **A-3:** [confirmed] `SettingsScaffold.tsx` and `SpaceSettings.tsx` are entity-identity panes sharing only `useNexusIcon` — outside the framework's blast radius.

#### B — The Framework

- **B-1:** [confirmed] `CATEGORIES` and `LEAVES` are two structures keyed by the same key. One roster carrying label, icon, placement, and body replaces both.
- **B-2:** [confirmed] A leaf holds named sections rather than one flat row list — nine leaves accumulating without an inner tier reproduces today's problem one level down.
- **B-3:** [confirmed] `anchored` becomes a declared foot placement rather than an ad-hoc `'anchored' in c` filtered twice.
- **B-4:** [confirmed] The `Row` union stays closed and grows by named kind; `KeyOf<V>` key-typing is kept.
- **B-5:** [confirmed] A leaf is rows or a surface, never both — Trash stays a pure surface.

#### C — Placement

- **C-1:** [confirmed] **Interface** — `hideChevrons`, `revealTabBarOnHover`, `nativeMenus`.
- **C-2:** [confirmed] **Navigation** — `navCloseOnSelect`, `connectionsOpenInPreview`, `hoverPreviewLinger`; traversal, as against authoring.
- **C-3:** [confirmed] **Files & Links** — `autoFormatPastedLinks`, `defaultLinkFormat`, `pasteLinkIntoText`, `removeTitleOnLinkChange`, `aliasPickerOnCommit`, `permanentDelete`.
- **C-4:** [confirmed] **Pages & Writing** — `codeblockLineCount`, `outlinerLines`.
- **C-5:** [confirmed] **General** — the nexus's date format and time format.
- **C-6:** [confirmed] **Trash** — the browser surface alone; its date and time controls stay in its own header.
- **C-7:** [confirmed] Appearance, Properties, Automations ship empty; Appearance fills when the deferred pickers land.

#### D — Time Format

- **D-1:** [confirmed] `time_format` moves from settings.json's top level into the `personalization` block, inheriting the setter, the live-apply path, and the watcher.
- **D-2:** [confirmed] **Reversed during execution.** A compat read for the old top-level key was built, then removed: `time_format` never had a writer, so no nexus on disk carries it, and the fold introduced a real defect — a legacy key would re-apply itself every time the new row stored the twelve-hour default as an absent key, silently reverting the choice. A hand-edited file naming the old spelling now reads as the default and is set from the row.
- **D-3:** [confirmed] `tree.timeFormat` is removed. Its two remaining readers moved to the personalization slice so the row applies live rather than waiting on a disk round-trip, which left the tree copy with no consumers.

#### E — Date Format

- **E-1:** [confirmed] A new `dateFormat` personalization key over the existing `DATE_FORMATS` vocabulary.
- **E-2:** [confirmed] It is a **live fallback**: every date renders through it unless its column overrides it. Changing it restyles unoverridden dates immediately.
- **E-3:** [confirmed] The seam is `defaultStyleFor`, taking the nexus value as an argument exactly as its `url` arm already takes `link_display` — so the fallback is stated once and `styleFor` stays the only resolver.
- **E-4:** [confirmed] `TrashLeaf`'s `DEFAULT_DATE_FORMAT` constant reads the nexus value rather than the hardcoded seed.

#### F — Two-Sided Windows

- **F-1:** [confirmed] `PreviewPane` already accepted `left` and `right` and rendered both in flow; the CSS carried both in-flow arms. Holding two panes at once needed no new structure.
- **F-2:** [confirmed] What was missing is the width rule. `useFloatingWindow` gained `widenBy(dx)`, and the pane calls it on a side's open/close transition, so the window's own edge moves by that pane's width and the body keeps what it had.
- **F-3:** [confirmed] Width DRAGS deliberately do not move the window's edge — dragging a pane's own strip reallocates inside the window, which is what the grip means. Only an open/close transition moves the frame.
- **F-4:** [confirmed] The window walks left by half its growth so it opens outward from its own centre, and clamps at the viewport, where the body absorbs the remainder.
- **F-5:** [confirmed] Verified in the browser on the real Settings shell: 850 → 1110 opening the inspector, 940 closing the rail, back to 850 — the body holding 676–678 throughout. A showcase leaf (`Side Panes`) keeps the case reproducible.

### Core (must-have)

- One leaf roster: label, icon, foot placement, body.
- Named sections within a rows leaf, with a heading tier in CSS.
- The nine categories seated in order, Trash anchored below a separator.
- Every existing row rehomed per §C with no behavior change.
- An empty state for a leaf with nothing in it.
- `time_format` relocated into `personalization` with a compat read.
- `dateFormat` added as a live fallback through `defaultStyleFor`.

#### Prospects (allowed later, not now)

- Accent, connection-color, default-icon, placement, and view-scale writers — all wireable through the existing setter; Appearance and Interface are their homes.
- Shortcuts as a read-only display of `DEFAULT_COMMANDS`, then rebinding once shortcuts get per-shortcut sign-off.
- Search across leaves — only earns its place once the roster is large.

#### Out of Scope (won't do)

- Designing what Properties and Automations configure — Automations has no feature behind it, so its settings cannot precede the thing they configure.

#### Considered & Rejected

- **A one-off IPC for `time_format`** — smaller diff than relocating the key, rejected because a bespoke writer for a single key is the seam five more grow from.
- **A narrow date default** (displacing only the hardcoded seed, changing nothing existing) — rejected in favor of the live fallback, which is what the words promise.
- **A leaf holding both rows and a surface** — considered so `permanentDelete` could sit in Trash; dropped when the knob moved to Files & Links and the capability lost its only caller.

#### Lessons

- A default only means something if something inherits it — before adding a "default X" setting, name the seam it overrides and confirm there is exactly one.
- Backward compatibility for a key that never had a writer is compatibility with nothing. Before folding an older spelling into a newer one, check whether any file could carry it — a fold that can never fire still costs a defect when the new path stores its default as an absent key.
- A setting relocated into the personalization block has to take its readers with it. A consumer left on the tree copy reads a value that only refreshes on a disk round-trip, which reads as a settings row that does not work.
