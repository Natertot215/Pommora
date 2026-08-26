## Handoff — Pommora

> **User Prompt:** *"Add a single picker in Settings > Interface; double-chevron picker dropdown like other scaling mechs."* — then, the same session: *"make it the shared behavior where the trailing percent symbol never disappears when you right-click to enter the field. no jump — absolutely seamless"*, *"refactor settings where it only contains SpaceSettings to go into toolbar"*, and *"This is a REAL refactoring opportunity."*

#### Current Focus

**Session ID:** 14cb88d4-ef66-4a6d-a7c7-18bd37efbbaa
**Dates:** 08-25-2026
**Model:** Opus 5 (1M context)

**Two settings features, then an opportunistic renderer reorganization that turned into the opening move of a much larger one.** The session opened on Interface Scale and closed on a folder-by-folder audit of `src/renderer/src` whose conclusion is a new focus rather than a finished one.

**Interface Scale** gave the existing `personalization.defaultViewScale` key a row in Settings → Interface. The key already existed, was already applied main-side, and was already what ⌘0 resets to — ConfigurationPM listed it under "Knobs without a row" — so nothing new was invented: the picker steps an even 50–150% ramp in ten-point increments (`VIEW_SCALE_STEPS`), `VIEW_SCALE_MAX` came down from 3 to 1.5 to match, and `personalization:set` gained a second main-side effect beside `webZoomFactor` so the pick re-zooms the window immediately rather than waiting for a reload. 100% still resolves to Electron's 0.9 through `viewScaleZoom`; `VIEW_SCALE_BASE` was not touched.

**The typed-unit suffix** followed from Nathan noticing the percent sign vanishing when a zoom row's field opens. `PickerControl`'s `typeable` now takes an optional `suffix` drawn beside the field inside a zero-gap box, so the digits sit at the width they were read at and the mark never leaves; a press on the mark is swallowed so it can't pull focus and commit the edit. All three zoom rows pass `'%'`.

**The reorganization** began with one stranded folder (`Detail/Settings/`, holding only `SpaceSettings.tsx`) and widened as Nathan worked through the tree alongside. What moved: `Components/Detail`'s property surface into a new top-level `Properties/` with per-type editors under `Properties/Editors/`; `PickerControl` and `EyeToggle` into `DesignSystem/Elements/`; `NavGallery` into `Navigation/`, where its own dependencies already were; `SpaceSettings` folded into `SpaceDropdown`, which is now the sole Space surface. Nathan moved `ImagePicker` into `Pickers/` himself and its imports were repaired around it. `EyeToggle` needed its styles extracted out of `settingsPane.css` first — it was reaching into that pane's `hiddenRow` class — so the element now owns its own styles and the pane keeps only the hidden-row dimming, pointing at the element rather than the reverse.

**The two settings features are committed; the reorganization is not.** 69 files are staged: typecheck clean, biome clean across 950 files, 3653 tests passing. Two things carry risk that a gate cannot see — the trio's Settings dropdown now renders nothing when a Space is selected (the Space dropdown owns that surface outright), and `DesignSystem/Elements/PickerControl` imports `nativeMenus` from the app, which is the first time the design system reaches upward into it.

#### Completion Criteria

- [x] **Interface Scale writes the existing key** — `defaultViewScale`, not a second one; ConfigurationPM's Interface table carries the row and its Personalization and Pending entries are gone.
- [x] **The pick applies on assignment** — `personalization:set` re-zooms the window; no reload involved.
- [x] **The unit is shared, not per-row** — `typeable.suffix` lives on `PickerControl`; every zoom row reads the same behavior.
- [x] **Every relocation is a relocation** — no behavior changed by a move; gates green at each step.
- [x] **`Components/Detail` and `Detail/Settings` no longer hold what isn't theirs** — the property surface, the two elements, and the Space pane are at their own addresses.
- [ ] **The reorganization is committed** — 69 files staged and unreviewed by Nathan.
- [ ] **The Space dropdown is eyeballed** — icon, editable title, lock footer, and the icon and color pickers, with the trio's Settings button blank behind it.

#### Next Session

1. **Review and commit the staged reorganization.** 69 files, all gates green. Renderer-only, so ⌘R picks it up — no dev restart.
2. **Eyeball the Space dropdown.** It draws the Space's own icon on the toolbar button now, and its pane holds what `SpaceSettings` held. The trio's Settings button showing nothing on a Space is intended.
3. **Two open calls from the reorganization**, both recorded in Context: whether `Detail/Views/PropertyEditing` folds into `Properties/Rows`, and whether `Settings/IconPicker` + `iconFavorites` move to `Components/` — neither is redundant, both are misfiled.
4. **The Refactoring arc wants a plan before it wants moves.** Context §Pending Focuses states its shape; the folder-level decisions inside it are unsettled and each phase should be session-sized.

#### Feedback

- "It must apply on assignment, not command r." Read as a requirement on the setting rather than on the dev process; the main-side branch already did this, and the restart caveat was about `src/main` not hot-reloading.
- "no jump — absolutely seamless." The field and its unit sit in one zero-gap box rather than as two flex children, so the trigger's own 4px gap can't open between the digits and the mark.
- "SpaceDropdown should be the source; not the other one. Condense those and delete the old one."
- "If PickerControl is the double-chevron picker; that goes into DesignSystem/Elements. If not — dont touch it."
- "I want the vibe to be clear that its just 'it doesnt make sense' rather than things being broken." The Refactoring arc is written as organization, not repair.

#### Session Pointers

- `shared/types.ts` — `VIEW_SCALE_STEPS` and the `coerceViewScale` clamp derived off its ends; `SCALE_STEPS` is the other, uneven ramp the embed and web-zoom rows still take.
- `main/index.ts` `personalization:set` — the two keys with a main-side effect: `webZoomFactor` re-stamps guests, `defaultViewScale` re-zooms the window.
- `DesignSystem/Elements/PickerControl/` — `PickerControl.tsx`, its stylesheet, and an `index.ts` re-exporting `pickerValue` for the two callers that want the value class alone.
- `DesignSystem/Elements/EyeToggle/` — `EYE_ICON` is the glyph step; `HiddenPane`'s inert twin reads it rather than restating a size. The hidden-row dimming is a `globalStyle` in `settingsPane.css.ts` pointing at the element's `button` class.
- `Toolbar/SpaceDropdown.tsx` — the whole Space surface: `MenuDropdown` chrome, `InlineEditHeader`, the lock footer, `IconPicker` and `ColorPicker`, and the right-click title menu.
- `Properties/` — panes and shared rows at the root, per-type editors under `Editors/`.
- `.claude/Planning/Inline Page Properties — Decision Log.md` — the other live focus, untouched this session.

#### Working Notes

- A relocation script that re-derives every relative specifier will "normalize" correct ones too — a directory import resolves to its `index.ts` and comes back written as `../input/index`. Resolve against the pre-move layout and rewrite only the specifiers that actually point at something that moved.
- A moved file's own imports and its consumers' imports are two separate passes, and a batch that splits one folder into two levels needs a third for the siblings that landed at different depths.
- `git mv` on a file with staged content needs `-f`; a plain `mv` of a folder was refused by the sandbox where `rm -rf` and `git restore` were not.
- Vanilla-extract can't style a descendant from `style()` — a pane that wants to tone an element it hosts uses `globalStyle` against the imported class.
- The trailing `%` span must swallow `mousedown`, or pressing it blurs the field and commits the edit.

**FILES ADDED**

- `Pommora/src/renderer/src/DesignSystem/Elements/EyeToggle/eyeToggle.css.ts`
- `Pommora/src/renderer/src/DesignSystem/Elements/EyeToggle/index.ts`
- `Pommora/src/renderer/src/DesignSystem/Elements/PickerControl/index.ts`
- `.claude/Planning/Inline Page Properties — Decision Log.md`

**FILES MODIFIED**

- `.claude/CLAUDE.md` — the codemap gains `Properties/`
- `.claude/Features/ConfigurationPM.md` — Interface Scale's row; its Personalization and Pending entries removed
- `.claude/Features/DesignSystemPM.md` — PickerControl and EyeToggle in Elements, ImagePicker in Pickers
- `.claude/Features/PropertiesPM.md` — the Properties Pane's path
- `Pommora/src/shared/types.ts` — `VIEW_SCALE_STEPS`, the clamp derived off its ends
- `Pommora/src/main/index.ts` — `defaultViewScale` re-zooms on write
- `Pommora/src/main/settings.test.ts` — the clamp ceiling
- `Pommora/src/renderer/src/Settings/NexusSettings.tsx` — the Interface Scale row; `zoom` rows carry their own ramp
- `Pommora/src/renderer/src/Toolbar/SpaceDropdown.tsx` — the whole Space surface
- `Pommora/src/renderer/src/Detail/ViewSettingsScope.ts` — the `space` scope removed
- `Pommora/src/renderer/src/Components/Detail/` — nine panes and stylesheets repointed; `settingsPane.css.ts` gave up the eye styles
- `Pommora/src/renderer/src/Navigation/NavWindow.tsx`, `Tabs/NavView.tsx`, `Sidebar/NexusPhoto.tsx`, `Embeds/PageEmbed.tsx`, `MarkdownPM/PageHeader.tsx` — import repointing across the moves
- `Pommora/src/renderer/src/Detail/Banner/Banner.tsx`, `Detail/Views/Cards/CardAddPicker.tsx`, `Detail/Views/Cards/CardsView.tsx`, `Detail/Views/Table/TableView.tsx`, `Detail/Views/PropertyEditing/usePropertyRows.ts`, `Settings/TrashLeaf.tsx` — the same
- `Pommora/src/renderer/src/DesignSystem/Showcase/leaves/ComponentsLeaf.tsx` — the ImagePicker path
- `Pommora/src/renderer/src/DesignSystem/Components/Controls/checkbox.css`, `Pommora/src/renderer/src/styles.css`, `Pommora/src/shared/theme.ts` — Nathan's own

**FILES REMOVED**

- `Pommora/src/renderer/src/Detail/Settings/SpaceSettings.tsx` — folded into `SpaceDropdown`
- `.claude/Planning/Buttons-Spec.md`, `Chip Style Axis — Implementation Plan.md`, `Fields — Implementation Plan.md` — settled, retired with `c0fe1a4c`

**FILES RENAMED**

- `Components/Detail/{PropertiesPane,PagePropertiesPane,PropertyTypes,ValueRow,OptionRow,GhostOptionChip,DashIcon,LinkFormat,useOptionReorder,useStatusReorder}` + their stylesheets and tests → `Properties/`
- `Components/Detail/{Checkbox,DateTime,File,Number,Option,Status,URL}Editor` + their stylesheets and tests → `Properties/Editors/`
- `Components/Detail/PickerControl` + its stylesheet and test → `DesignSystem/Elements/PickerControl/`
- `Components/Detail/EyeToggle.tsx` → `DesignSystem/Elements/EyeToggle/EyeToggle.tsx`
- `NavWindow/NavGallery.tsx` + `navGallery.css` → `Navigation/`
- `DesignSystem/Components/ImagePicker/` → `DesignSystem/Components/Pickers/ImagePicker/` (Nathan's move)

**COMMITS**

- `3f926099` — feat(settings): Interface Scale takes a row of its own
- `991f4199` — feat(picker): a typed value keeps the unit it is read in
- `c0fe1a4c` — docs(planning): the inline page properties decision log replaces three settled plans
- `e815fb06` — chore(ledger): line counts through the Interface Scale picker

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run rather than accumulating passes.
- A handled item leaves for Context, History, or the Feature docs — no tombstone.
- Nathan's own guidelines in this document are preserved.
