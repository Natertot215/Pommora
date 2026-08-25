## Handoff — Pommora

> **User Prompt:** *"Go for it. Keep in mind when writing the descriptions of the items on the doc, that they must be BRIEF… Once this is done; do a final sweep simplification pass, commit, and give the diff tree."* — then, the same session: *"buttons are definitely in-scope here, and a shared Controls/ folder is likely where they'd go."*

#### Current Focus

**Session ID:** 5897f22e-4fa9-4416-b22b-4de359243564
**Date:** 08-24-2026
**Model:** Fable 5

**The design system is one tree that reads like its ledger, and it has a Button.** Eight commits, `4d7feba7 → e5a5ce40`, in three arcs.

**Arc 1 — the reorganization (`4d7feba7`).** `src/renderer/src/design-system/` became `DesignSystem/` with every area Capitalized and every stray homed: Tokens · Materials · Labels · Elements · Components/{Controls, Pickers, Menu, Fields} · Detail · Interactions · Animation · Symbols · Theming · Util · Showcase. `NotchedPane` joined Menu, SidePane and PreviewPane joined Detail, SegmentRun joined Labels, ProgressBar joined Elements, and the motion pieces scattered over three folders became one `Animation/` (motion, feel, the Bloom keyframes, `useExitPresence`, `Reveal`). Motion has one ladder and two curves — `easing.baseEase` (`--ease-base`) and `easing.baseSnap` (`--ease-snap`); `easing.inOut` and `duration.disclosure` are gone, and `Feel` reads the ladder through `ms()`. Only `Tokens/` and `Theming/` reach `@shared`; `theme-vars` republishes only, its authored literals homed in `size.css.ts`, `color.css.ts`, and `Symbols/masks.ts`. The Elements consolidation from earlier in the session (DropOutline · PathChevron · Segment) rode the same commit. `DesignSystemPM` was rewritten as the one-look ledger — one section per folder, one row per thing — and `TypographyPM` retired into it; `InteractionPM` points at it for values. The chromeless field treatment was renamed `bare → base` (`8afff1d2`).

**Arc 2 — Button (`21faf5b5` + two fixes).** `DesignSystem/Components/Controls/Button/` is the one button: five types as one CSS-var pair (`base` · `tinted` · `solid` · `filled` · `destructive`), the `size.control` bundles for geometry, icon / icon+label / label content, an optional outline as an inset ring, and the `revealOnHover` / `ghostRest` modifiers. `Segmented` is N Buttons divided by the house `segment`, with `glass` for the toolbar; `Segmented-Controls/` folded into it. Every toolbar-row button is a Button (Back/Forward, the dropdown triggers, the trio, the tab +, the sidebar toggles, the ViewPane row chevron); PhotoCropModal's pair is filled + solid; the settings icon-picker button is filled. **ActionBand keeps its own tab-style segment on purpose.** `PaneSlider`, `Surface`, and `PhotoCropModal` moved into the design system; the showcase gained a Buttons leaf laid out as the Figma card.

**Arc 3 — the ghost sweep (`e5a5ce40`).** A fourth size, `button-inline` (20px / r5 / control icon), is the row-affordance tier, and every hand-rolled ghost button moved onto it: the menu accessory family and its settings-pane derivatives, the footer text and lock actions, the preview window's actions, the subfield add and view toggle, the banner add, the group-band add, the calendar nav and title, both "Add Property" affordances, the filter add-rule, the Open button, and the NavWindow style toggle. Each site keeps placement and tone only. The size bundles carry `labelPaddingX` beside `paddingX`. Empty values read as the pane's `—` on cards and in the calendar too.

#### Completion Criteria

- [x] **Gates green at every commit** — typecheck 0, biome clean (936 files), 286 test files / 3594 tests, app + showcase build.
- [x] **Sweep proofs** — `design-system/` in source 610 → 0; `--ease-standard` 139 → 0; `var(--disclosure)` 11 → 0; `parseInt(duration…)` 14 → 0; `bare` treatment 47 → 0; `KNOB` 128 → 131 (Nathan's additions), `(Nathan's call)` intact.
- [x] **Toolbar geometry measured, not reasoned** — a sandbox instance (`POMMORA_USERDATA` + `POMMORA_DEBUG_PORT`, against the Test nexus) over CDP: every pill button and glyph centers at the row's y=22, glass layer and cover identical, Back/Forward divided. Two regressions found and fixed that way: a transparent border widening every segment (now an inset ring), and the glass wrapper's `inline-block` swallowing the class's centering (now inline `display:flex; align-items:center` on the pill — deliberate, don't move it to the class).
- [x] **A comment pass over the whole `DesignSystem/` tree** and the reorg-touched app files — it cost one casualty, the tab bar's `.reveal-on-hover` selector (`aca13970` restored it).

#### Next Session

1. **Eyeball the sweep** — the row-affordance sites moved from 16–20px hand boxes to the 20px inline bundle; the simplifier flagged `.subfield-viewtype` no longer sitting flush on the subfield inset (its `padding-left: 0` override lost to Button's inline padding — rule deleted, inset is now the bundle's 4px). Retune `button-inline` in `Tokens/size.css.ts` if anything reads off.
2. **The Figma parity pass on Button** — no Figma MCP is wired into Claude Code here; the types and sizes were built from Nathan's spec and the existing `size.control` geometry, which he confirmed is the Figma geometry. Open [Buttons-Spec.md](Planning/Buttons-Spec.md) against the Figma card and note any deviation.
3. **The continuous codebase cleanup** — [[Codebase-Cleanup-Checklist]], 6a → 6b next (the `Components/Detail` rehome: PaneSlider is already across; the property-editor pieces stay app-side by design).
4. **Restart the dev server** after pulling — the folder rename invalidated Vite's module graph; ⌘R is not enough.

#### Open

- **Line-Ledger artifact** — the post-commit hook asks for a republish each commit; the published artifact holds a newer, larger version than the regenerated file (it has `10e30d59`, the disk file doesn't), so it was never force-published. The hook's history window looks truncated — Nathan's call.
- **`footingLabel = style([actionRow])`** in `menu.css.ts` is an empty composition kept as a named route; collapse only if the name should go.
- **`export { stack }`** in the Tokens barrel has no consumer (everything deep-imports); pre-existing, left.
- **Showcase `MenuLeaf.tsx:20`** pins `<Icon size={16}>` next to rows that size by text — cosmetic, unfixed.
- **Uncommitted, not mine:** `src/main`, `src/preload`, `src/shared/*`, `store.ts`, Nathan's script files and planning-doc deletions — parallel sessions' work, deliberately left.

#### Feedback

- "All code-folders need to be caps." The root included — `DesignSystem/`, not `design-system/`.
- "Keep comments to its absolute minimum" / "strip the comments" — new files ship comment-free; a comment pass follows every build.
- "As long as it's coherent and doesn't just wrap these things in sloppily." A consolidation that leaves the old box and wraps it is the failure; the recipe owns the look, the surface owns what happens on click.
- "ActionBand should stay as its own purposefully divergent tab-style button." Toggle-shaped surfaces keep their selected state outside Button — Button has hover only.
- "Back-forth sizing is intentional, but ALL toolbar buttons need to become buttons; not just the trio."
- "Stop it and fix the fucking alignment issue… there is no time pressure; use my live nexus." Measure over CDP before claiming alignment; a screenshot from Nathan's stale dev server is not evidence either way.

#### Touched Files

- **Design system:** the whole `DesignSystem/` tree (164 files, renamed); new `Components/Controls/Button/` (Button.tsx, button.css.ts, Button.test.tsx), `Animation/index.ts`, `Symbols/masks.ts`, `Components/PaneSlider/`, `Detail/PhotoCropModal/`, `Materials/Surface.tsx`, `Showcase/leaves/ButtonsLeaf.tsx`; `Tokens/size.css.ts` (`button-inline`, `labelPaddingX`, the homed geometry consts), `Tokens/color.css.ts` (`STATE_OPACITY`, `BANNER_SHADOW`), `Tokens/theme-vars.css.ts` (bridge only), `Menu/menu.css.ts` + `Menu.tsx` (`AccessoryButton`, `FooterLockButton`, `FooterMoreButton` on Button).
- **App:** every import site (`@renderer/DesignSystem/…`); the toolbar (`Toolbar.tsx`, `ToolbarTrio.tsx`, `ViewPane.tsx`, `toolbarDropdown.css.ts`), `Tabs/TabBar.tsx` + `tabBar.css`, `App.tsx`, `Sidebar/Sidebar.css`, the settings-pane family (`settingsPane.css.ts`, `PropertiesPane`, `OptionEditor`, `StatusEditor`, `OptionRow`, `EyeToggle`, `InlineEditHeader`, `SettingsScaffold`, `PageMenu`, `PagePropertiesPane`, `FilterPane`), `Blocks/BlockHandleMenu.tsx`, `Detail/Banner/*`, `Detail/Subfield/*`, `Detail/Views/GroupBand.*`, `Detail/Views/Cards/CardValue.tsx`, `NavWindow/*`, `PagePreview/*`, `styles.css`, `MarkdownPM/editor/folding.ts`.
- **Docs:** `DesignSystemPM.md` (the ledger), `InteractionPM.md`, `TypographyPM.md` (deleted), `CLAUDE.md` (maps), `ContextPM.md`, `Planning/Buttons-Spec.md` (new), `Planning/DesignSystem-Organization.md` + `Elements-Consolidation-Plan.md` (deleted, executed), path fixes across Features/Guidelines/Resources/Planning.

#### Session Pointers

- `DesignSystem/Components/Controls/Button/Button.tsx` — `Segmented`'s `containerStyle` carries `display:flex; alignItems:center` inline on purpose: `GlassControls` renders `inline-block` and a class can't beat it. `inRun` switches a Button to the segment geometry (`segmentHeight` / `segmentRadius`).
- `button.css.ts` — a type is one `styleVariants` row setting `--button-fill` / `--button-ink` / `--button-outline`; hover is one gradient overlay of `state.hover` over `--button-fill`, so no per-type hover exists. `base` overrides the disabled rule to `label.tertiary` (the toolbar's mute); every other type dims by `--state-inactive`.
- `Tokens/size.css.ts` — `button-inline` is the only bundle not in Figma; it exists because the app has a whole tier of 16–20px row affordances below the ladder's `small`.
- `Menu/menu.css.ts` — `accessoryButton` is now width-only (`--accessory-box`, default 20px) plus its tertiary `&&` pin; the box is Button's.
- `Build-Gotchas.md §sandbox` — the `POMMORA_USERDATA` line is instrumentation added per pass and removed before committing; the scratch `pommora.json` pointed at `/Users/nathantaichman/Test`, and the harness is `scratchpad/cdp.mjs` + `measure.js` (session-local; recreate from the guideline).
