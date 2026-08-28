## The Menu Recipe — Implementation Plan

> **Status:** written, pending review · Spec: this document's Goal, ratified in conversation on 08-27-2026 · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. Counts are whole-renderer (`Pommora/src/renderer/src`, Showcase included) unless a task says otherwise.

**Goal**

`DesignSystem/Menus/menu-base.css.ts` names every menu row kind once, in the order the rows stack on screen, and every row-producing surface in the renderer composes those kinds instead of restating them. At the end: a row's height is never declared — it is the typography line plus one of two padding tokens; there are exactly two row sizes, chosen once per surface; `NavList` is a menu; the heading, the "All Properties" action row, the footing, and the trailing slot each exist in one place; and `Frames/frames.css.ts` holds geometry only.

The shape: four tokens (`--row-height-standard` 6px, `--row-height-compact` 4px, `--row-width-standard` 6px, `--row-width-compact` 4px) declared in `menu-base.css.ts`, read by `item` and `itemCompact`; a surface wears `itemCompact`'s pair on itself and every row inside follows. Chosen over a declared `height` (a fixed 24/20 was proposed and rejected — a caption row must grow, and the numbers on disk are already line + pad) and over keeping `PickerMenu`'s font-only knob (it shrinks the text and leaves every surface to invent its own padding, which is the five-heights problem this closes). Ratified by Nathan: the token names, 4px Compact, "pane wins" inside a picker, NavWindow and NavView both Standard, Autocomplete Compact, heading on the row's horizontal inset.

Bounds: the leading-glyph size question and nested-list insets (`menu-row.tsx:40`'s literal `8`, `sidebarDnd.tsx:35`'s mirror, a future `--list-inset`) are **Part 2** — no task here touches them. Table rows, tabs, chips, cards, and grid cells are not rows. The Figma component follows the code and is not a task here.

**Requirements**

1. Four row tokens exist once, in `menu-base.css.ts`; `item` reads the Standard pair on the body ramp; a surface wearing `menuCompact` switches every `item` inside to the Compact pair on the control ramp; no row anywhere declares `height`, `minHeight`, or its own padding.
2. `MENU_GUTTER`, `ROW_INSET`, `--row-inset`, `ROW_SIZE`, `ROW_LINE`, `--menu-row-size`, `--menu-row-line`, `ROW_GAP`, `--top-row-block`, `--bottom-row-block` are gone; the surface reads `--surface-inset` directly.
3. `menu-base.css.ts` and `menu-row.tsx` are ordered as a menu stacks: Shell → TopRow → Heading → Item → ActionRow → Separator → Caption → Footing → Trailing → Column. TopRow defines itself.
4. One `heading` (footnote.emphasized · tertiary · `0 var(--row-width-standard)`); Settings keeps an uppercase modifier on top of it; `MenuHeading` is gone.
5. `actionRow` is the "All Properties" row kind (footnote.emphasized · secondary, Item geometry, no hover).
6. `MenuBottomRow` → `MenuFooting`, bordered top; `bottomBar`'s `margin-top: auto` is gone and FilterFrame pins its footer through `MenuScrollFrame`'s footer slot.
7. `MenuTopRow` and `MenuFrameTopRow` are one component.
8. Every `PickerMenu` is Compact — every row inside, `PickerOption` and `MenuItem` alike; `option` keeps only its selection machinery.
9. `NavList` renders `MenuItem` rows on the menu column; `navList.css` holds no row box; NavWindow, NavView, and Trash are Standard.
10. `AutocompletePane` rows are `itemCompact`; the Cohesion ruling that exempted them is removed.
11. The trailing slot is one place: `chevron` · `value` + toggle · `switch` · `button` · `slider` · `field`; `detail` stays a separate passive text.
12. `frames.css.ts` retains only geometry exports; the 14 restating exports are gone.
13. `Frames/frames.css.ts` `COLOR` and the frame-local heading/tone consts are gone.

**Acceptance — the whole thing working:** with the app running, the sidebar, the toolbar Settings menu, a property-value picker, the NavWindow list, the Trash list, and the editor's `[[` autocomplete each show rows whose measured height is exactly `line-height + 2 × the surface's height token` (28 Standard, 23 Compact) with no per-surface override in the cascade, and `grep -rF -- "--row-inset" src` is zero while `grep -rF -- "--surface-inset" src` is not.

**Forced By**

- `PickerMenu.pane` is the only writer of the ramp vars and is applied even under `bareSurface` (`PickerMenu.tsx:404`) → the Compact pair rides `pane`; every host in a picker portal is Compact by that fact, which is the ruling.
- `item` also serves the Sidebar (`Sidebar.tsx:140,270,412`), Settings, and every Frame → the base row cannot change class name; `[class*="item"]` at `propertyFrame.test.tsx:300,329` pins it; Compact is additive.
- `PickerOption` is a `<button>` and three tests reach rows via `[data-picker-portal] button` → `option` stays a button wearing `item` + `itemCompact`.
- `optionRing`'s run-merging (`pickerMenu.css.ts:51-73`) needs adjacent siblings → `PickerOption` markup keeps rows as direct siblings.
- `MenuTopRow` has one caller, `MenuFrameTopRow` (`menu-row.tsx`), and nothing passes `contentClassName` → the fold is consumer-invisible.
- 12 of 13 `MenuBottomRow`s already pin through `MenuScrollFrame footer=` → `margin-top: auto` serves FilterFrame's locked branch alone; jsdom does no flex layout → the footer pin is verified running, not by test.
- `numberEditor.css.ts:14`'s `marginTop: 8px` exists so a collapsed `Reveal` contributes no phantom gap → it survives; it is inter-row rhythm, not a row box.
- `calendarPicker.css.ts:74` sets body size on a control-line option → it deletes with Compact; the Month/Year list is Compact like every list in a picker.
- `menu-row.tsx:61` renders `detail` inside the same span as `trailing` → splitting `detail` from the trailing slot is a markup change, and `GroupFrame.test.tsx:275,285` reach controls by aria-label, so labels stay on payloads.
- `--surface-inset` and `--row-width-standard` are both 6px today → the surface's horizontal padding reads `--surface-inset` (the glass gutter), never a row token.

**Inherited Reasoning**

- A fixed `height: 24 / 20` was proposed and rejected: rows carry captions and must grow, and 24/20 matched nothing on disk (28 / 23 do).
- Keeping the ramp knob alone (`--menu-row-size`) was considered and rejected: it is a font knob and the padding was left to each surface, which produced 28 · 27 · 23 · 21 · 30.
- Letting each row opt into Compact by class (kill the pane var) was rejected: rows nobody wrote as picker rows inherit the pane today, and each would regress silently.
- `MenuHeading` as a component: rejected — the heading is a class.
- `TopRow` composing `actionRow`: rejected — TopRow defines itself.
- The `Cohesion-Rulings.md:66` exemption for the autocomplete row is reopened by this plan (Nathan, 08-27).

**Grounding**

- `DesignSystem/Menus/menu-base.css.ts` — the recipe; export order and the two `globalStyle`s at its foot.
- `DesignSystem/Menus/menu-row.tsx` — `MenuItem` (the `side`/`titleWrap`/`detail` markup), `MenuTopRow`, `MenuFrameTopRow`, `MenuBottomRow`, `MenuScrollFrame`.
- `DesignSystem/Menus/menu-surface.css.ts` — `MENU_GUTTER`, the `surface` padding pair, `hostedGutter`, the `titleText` global at `:34`.
- `DesignSystem/Components/Pickers/PickerMenu/{pickerMenu.css.ts,PickerMenu.tsx}` — `pane` vars, `option`, `optionRing`, `bareSurface`.
- `DesignSystem/Elements/DropOutline/dropOutline.css.ts` — `ROW_INSET`, `RAIL_CENTER_X`.
- `Navigation/{navList.css,NavList.tsx}`, `Windows/NavWindow.tsx`, `Detail/NavView.tsx`, `Settings/TrashFrame.tsx` — the hand-rolled list.
- `MarkdownPM/Styles.css` `.mdpm-ac`, `.mdpm-ac-row`; `MarkdownPM/AutocompletePane.tsx`.
- `Frames/frames.css.ts`, `Frames/groupFrame.css.ts`, `Frames/filterFrame.css.ts`, `Frames/layoutFrame.css.ts`, `Views/CardView/cardAddPicker.css.ts`, `Properties/Editors/{dateTimeEditor,numberEditor}.css.ts`, `Settings/settingsWindow.css`, `Windows/pageWindow.css` — the row boxes.
- `Settings/SettingsWindow.tsx` — the `Row` union and `RowControl` switch the roster lifts.
- `.claude/Guidelines/Cohesion-Rulings.md`, `.claude/Features/DesignSystemPM.md` §Menus (`:221`, `:364-366`).

**Environment:** plan directory `.claude/Planning`; explorer = `Explore`; code reviewer = `feature-dev:code-reviewer`; attack reviewer = `build-breaking-agent`; neutral verifier = `general-purpose`; simplification = `code-simplifier` then `comment-killer-agent`; gates = `npm run typecheck`, `npx biome check`, `npx vitest run` (from `Pommora/`, exit codes read directly, `set -o pipefail` when piped); rules directory `.claude/Guidelines`.

**Shapes:** refactor · removal · user-visible · fix (the FilterFrame footer pin).

**Global Constraints (every task inherits these)**

- Gates from `Pommora/`: `npm run typecheck` → 0 errors; `npx biome check` → "No fixes applied", 0 warnings; `npx vitest run` → all files pass. Read each exit code directly.
- Biome formats on write; a shell edit needs `npm run format` before the gate.
- Stage explicit paths. `Store/`, `Detail/Scope.ts`, `Tabs/tabsModel.ts` belong to a parallel session — never staged here.
- Comments: one load-bearing why per file at most; every `KNOB` marker survives.
- Vanilla-extract source order is cascade order at equal specificity: a class must be declared before a class that composes it.
- No row declares `height`, `minHeight`, `padding`, a font rung, or a hover background of its own after its task lands.
- Out of scope everywhere: `menu-row.tsx:40`'s indent base, `sidebarDnd.tsx:35`, leading-glyph sizes, `Tables/`, `Views/TableView`, tabs, cards, the Figma file.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `DesignSystemPM.md:221` | "menu headings → Headline / Emphasized" · "settings section headings → Headline / Emphasized" · "chips and sidebar section headers → Control / Semibold" | heading is footnote.emphasized; the sidebar clause has no code | 6 |
| `DesignSystemPM.md:364` | Menu row: `MenuHeading` in the roster | `MenuHeading` deleted | 6 |
| `DesignSystemPM.md:365` | Bars row: `MenuFrameTopRow`, `MenuBottomRow` | folded / renamed | 4, 5 |
| `DesignSystemPM.md:197` | Row Inset: `--row-inset` · `ROW_INSET` · 6px | replaced by the four row tokens | 1 |
| `Cohesion-Rulings.md:66` | "The autocomplete pane's row does not adopt the shared menu-row primitive." | it does | 12 |
| `HandoffPM.md:49` | `SettingsRow.tsx` is the MenuItem adapter | deleted | 15 |
| `RendererRefactor.md:20` | the Menu recipe row, as written | this plan supersedes it; the row points here | 1 |

**Dead Vocabulary** *(the closing sweep; counts at planning time, whole renderer)*

- `MENU_GUTTER` → 0 (3) · `ROW_INSET` → 0 (4) · `--row-inset` → 0 (6) · `ROW_SIZE` → 0 (4) · `ROW_LINE` → 0 (4) · `--menu-row-size` → 0 (2) · `--menu-row-line` → 0 (2) · `ROW_GAP` → 0 (2) · `--top-row-block` → 0 (4) · `--bottom-row-block` → 0 (2)
- `MenuFrameTopRow` → 0 (32) · `MenuBottomRow` → 0 (31) · `bottomBar` → 0 (3) · `MenuHeading` → 0 (7) · `compactRow` → 0 (3) · `optionsLabel` → 0 (10) · `allPropertiesLabel` → 0 (2) · `previewHeading` → 0 (3) · `configRow` → 0 (9) · `allHeadingRow` → 0 (2) · `mdpm-ac-row` → 0 (4) · `SettingsRow` → 0 (17) · `ValueRow` → 0 (15) · `FootingPick` → 0 (3)
- `nav-item` → 0 outside `NavTrail` (36 now; the `NavTrail` element keeps its own class family).
- Control: `--surface-inset` → 8. Zero here means the sweep never ran.

**Hazard Window:** Task 5 deletes `bottomBar`'s `margin-top: auto`; FilterFrame's locked branch is un-pinned from that commit until Task 20 lands its footer slot. No running-thing pass on FilterFrame between them; Gate 1's running pass records the deferral.

---

### Phase 1 — The Recipe

#### Task 1: The four row tokens, `item` and `itemCompact`

**Requirement:** 1, 2

**Why:** Every row height in the renderer is line + padding, and the padding is the only thing surfaces disagree on. Naming the two pads once and letting the ramp ride the same variant is what makes "chosen once per surface" possible; the font-only knob is what made every picker-hosted `MenuItem` a third size. Done first because every later task composes these two classes.

**Files:**
- Modify: `DesignSystem/Menus/menu-base.css.ts` — declare the four tokens on `:root`; `item` pads and sizes through four per-surface vars that default to the Standard pair and the body ramp; add `menuCompact`, the class a surface wears to switch those vars to the Compact pair and the control ramp; delete `ROW_SIZE`, `ROW_LINE`, `ROW_GAP`, `minHeight: '24px'`.
- Modify: `DesignSystem/Components/Pickers/PickerMenu/pickerMenu.css.ts` — `pane` drops the `--menu-row-*` vars; `option` composes `[item, itemCompact]` and keeps only `justifyContent`, `whiteSpace`, the button reset, and the selection classes.
- Modify: `DesignSystem/Elements/DropOutline/dropOutline.css.ts` — `ROW_INSET` → read `var(--row-width-standard)` in `RAIL_CENTER_X`; the export goes.
- Modify: `DesignSystem/Menus/menu-surface.css.ts` — `MENU_GUTTER` deleted; `surface` and `hostedGutter` pad `6px var(--surface-inset)` with the `paddingTop` calc on the same `6px`.
- Modify: `styles.css` — `--row-inset` deleted.
- Modify the five `--row-inset` readers: `Sidebar/Sidebar.css:189`, `Frames/frames.css.ts:147`, `Frames/filterFrame.css.ts:130`, `Windows/navWindow.css:48` → `--row-width-standard`.
- Modify: `Views/CardView/cardAddPicker.css.ts` — deleted; `CardAddPicker.tsx` drops `compactRow` (the pane is Compact).
- Modify: `DesignSystem/Components/Pickers/CalendarPicker/calendarPicker.css.ts` — `optionRow` deleted; `CalendarPicker.tsx` drops its class.
- Docs: `DesignSystemPM.md:197` row → the four tokens; `RendererRefactor.md:20` → one line pointing here.

**Interfaces**
- Produces: `item` (unchanged name) reading `--row-pad-y` / `--row-pad-x` / `--row-size` / `--row-line`, each defaulting to Standard; `menuCompact`, the surface class that sets the four to the Compact pair and the control ramp.
- Assumed by: every later task; `pickerMenu.css.ts pane` wears `menuCompact`; Requirement 1's "itemCompact" is this pair.

**Derivation**
- `grep -rF -- "--row-inset" src` → 6. Legitimate hits after: none.
- `grep -rF "MENU_GUTTER" src` → 3 → 0. `grep -rF "ROW_SIZE" src` → 4 → 0. `grep -rF "ROW_LINE" src` → 4 → 0.
- Control: `grep -rF -- "--surface-inset" src` → 8.

**Failure half:** a surface that sets neither pair → Standard (the `:root` tokens are the fallback, no `var()` default needed); a `MenuItem` with a `subLabel` → grows past 28, since nothing floors it; a picker with zero options → the pane's `surface` padding alone, no row.

**Steps:**
- [ ] In `menu-base.css.ts`, `globalStyle(':root', { vars: { '--row-height-standard': '6px', '--row-height-compact': '4px', '--row-width-standard': '6px', '--row-width-compact': '4px' } })`. `item`: `padding: 'var(--row-pad-y, var(--row-height-standard)) var(--row-pad-x, var(--row-width-standard))'`, `fontSize: 'var(--row-size, ' + font.scale.body.size + ')'`, `lineHeight` likewise with body line; delete `minHeight`, `ROW_SIZE`, `ROW_LINE`, `ROW_GAP` (inline `gap: '8px'`). Add `export const menuCompact = style({ vars: { '--row-pad-y': 'var(--row-height-compact)', '--row-pad-x': 'var(--row-width-compact)', '--row-size': font.scale.control.size, '--row-line': font.scale.control.line } })`.
- [ ] `pickerMenu.css.ts`: `pane` composes `menuCompact` and drops its `vars`; `option` = `style([item, { justifyContent: 'center', whiteSpace: 'nowrap', border: 'none', background: 'none' }])` — delete its `padding`, `fontSize`, `lineHeight`, `text.control.standard`, `color`. Run `npx vitest run src/renderer/src/DesignSystem/Components/Pickers` → pass.
- [ ] `dropOutline.css.ts`: `const RAIL_CENTER_X = \`calc(var(--row-width-standard) + ${RAIL_W / 2}px)\``; delete `ROW_INSET`; `menu-base.css.ts` drops the import.
- [ ] `menu-surface.css.ts`: delete `MENU_GUTTER`; both paddings read `var(--surface-inset)`.
- [ ] Repoint the four `--row-inset` readers; delete `--row-inset` from `styles.css`.
- [ ] Delete `cardAddPicker.css.ts` and its import + `compactRow` use; delete `calendarPicker.optionRow` and its use.
- [ ] `npm run format`; gates green; `grep -rF -- "--row-inset" src` → 0; `grep -rF -- "--surface-inset" src` → 8.
- [ ] Docs rows; commit `refactor(menus): the row is its line plus one of two padding tokens`.

#### Task 2: Order the stylesheet and the row file as a menu stacks

**Requirement:** 3

**Why:** The kinds were appended over time; a reader can't find TopRow next to Footing or tell which class composes which. Ordering by stacking order is what lets every later task add a kind into its section instead of at the end. Behavior-neutral by construction, gated by the cascade rule.

**Files:**
- Modify: `DesignSystem/Menus/menu-base.css.ts` — sections in order: `// Shell` (`rowShell`) · `// TopRow` (`topRow`, `topRowPad` → folded into `topRow`, `topBarLeadingLabel`, `topBarLeadingSymbol`, `topBarTrailingLabel`, `topBarTrailingSymbol`, `paneSeparator`) · `// Heading` (`heading`) · `// Item` (`item`, `menuCompact`, `itemSelected`, `itemEmphasized`, `rowDisabled`, `side`, `titleWrap`, `titleText`, `titleInput`, `subLabel`, `flushAffordance`, `flushTrailing`) · `// ActionRow` (`actionRow`) · `// Separator` · `// Caption` · `// Footing` (`footing`, `footingLabel`, `footingSymbol`, `footerLockAction`, `lockIcon`, the two `globalStyle`s) · `// Trailing` (`accessoryButton`, `detail`) · `// Column` (`menu`, `MENU_MAX_HEIGHT`, `scrollFrame*`).
- Modify: `DesignSystem/Menus/menu-row.tsx` — same order: `MenuTopRow` · `MenuItem` · `MenuSeparator` · `MenuCaption` · `MenuFooting` (Task 5) · `AccessoryButton`, `FooterLockButton`, `FooterMoreButton` · `Menu`, `MenuScrollFrame`.

**Survivors:** `flushAffordance` is declared in `// Item` and precedes `topRow` and `footing`, which compose it — the one forward-reference hazard; `actionRow` precedes `topBar*Label` only if TopRow stops composing it (Task 4 makes TopRow self-defining, so this ordering holds after Task 4; do Task 2 after Task 4 if the cascade check fails).

**Steps:**
- [ ] Move declarations into sections; no value changes. `npx biome check` → clean.
- [ ] Gates green; `git diff --stat` shows only the two files.
- [ ] Commit `refactor(menus): the stylesheet reads top to bottom as a menu does`.

#### Task 3: One heading

**Requirement:** 4, 13

**Why:** Nine section titles in five classes at three rungs; the recipe's own `heading` has no production consumer. One class at footnote.emphasized · tertiary on the row's horizontal inset, and the frames stop deciding type.

**Files:**
- Modify: `menu-base.css.ts` — `heading = style([text.footnote.emphasized, { display: 'flex', alignItems: 'center', gap: '4px', padding: '0 var(--row-width-standard)', color: c.label.tertiary, userSelect: 'none' }])`; add `headingCaps = style({ textTransform: 'uppercase', letterSpacing: '0.04em' })`.
- Modify: `menu-row.tsx` — delete `MenuHeading`; `DesignSystem/Menus/index.ts` drops the export; `Showcase/leaves/MenuLeaf.tsx:69-79` becomes a `<div className={heading}>` specimen.
- Modify: `Frames/frames.css.ts` — delete `optionsRow`, `optionsLabel`, `allPropertiesLabel`, `COLOR`; `Properties/Editors/{OptionEditor:112-113,StatusEditor:131-141,DateTimeEditor:63}` and `Properties/PropertyFrame.tsx:141` read `heading` (the "Options" row keeps its trailing `+` in a flex wrapper that is the heading itself — `heading` is flex with `justifyContent: 'space-between'` added).
- Modify: `Frames/groupFrame.css.ts` — delete `previewHeading`; `GroupFrame.tsx:424,473` read `heading`.
- Modify: `Settings/settingsWindow.css` — delete `.settings-section-title`; `SettingsWindow.tsx:619` reads `cx(heading, headingCaps)`.

**Derivation**
- `grep -rF "optionsLabel" src` → 10 → 0. `grep -rF "previewHeading" src` → 3 → 0. `grep -rF "settings-section-title" src` → 3 → 0 (PanesLeaf included).
- Control: `grep -rF "text.footnote.emphasized" src` → ≥ 3.

**Steps:**
- [ ] Rewrite `heading`; delete `MenuHeading` and its export; fix the Showcase leaf.
- [ ] Repoint the nine sites; delete the five classes and `COLOR`.
- [ ] Gates green; `GroupFrame.test.tsx` `'Options'` text assertions pass.
- [ ] Commit `refactor(menus): one heading`.

#### Task 4: TopRow defines itself; one `MenuTopRow`

**Requirement:** 3, 7

**Why:** `MenuTopRow` has one caller — `MenuFrameTopRow` — and the split is a leftover of a bare form nothing uses. TopRow owns its rung, tone, padding, and its flush separator, and stops composing `actionRow`.

**Files:**
- Modify: `menu-base.css.ts` — `topRow = style([flushAffordance, text.caption.emphasized, { paddingBlock: '2px', minHeight: 0, color: c.label.secondary }])` (absorbs `topRowPad`; the `--top-row-block` knob goes — `CardAddPicker.tsx:128`'s `0px` override becomes a local `style` on its own pane class, not a recipe knob); `topBarLeadingLabel = style([text.footnote.emphasized, { color: c.label.secondary }])`, `topBarTrailingLabel` likewise at tertiary — no `actionRow` composition.
- Modify: `menu-row.tsx` — one `MenuTopRow({ label, onBack, trailing?, current? })` that renders the row and its flush `MenuSeparator`; delete `MenuFrameTopRow`; `index.ts` exports `MenuTopRow` only.
- Modify the 12 `MenuFrameTopRow` files (Derivation) — rename to `MenuTopRow`; `CardAddPicker.tsx:41` local variable `topRow` renamed to avoid shadowing.

**Derivation**
- `grep -rF "MenuFrameTopRow" src` → 32 → 0. `grep -rF -- "--top-row-block" src` → 4 → 0.
- Control: `grep -rF "MenuTopRow" src` → ≥ 20 after.

**Steps:**
- [ ] Fold the component; delete `topRowPad`; repoint callers.
- [ ] Gates green. Commit `refactor(menus): the TopRow defines itself`.

#### Task 5: Footing

**Requirement:** 6

**Why:** The footer is a row kind with its own border and placement, and the component that owns placement is the component — not an auto-margin one pane happens to rely on. Renaming to Footing puts the kind in the vocabulary Nathan ruled.

**Files:**
- Modify: `menu-base.css.ts` — `bottomRow` → `footing` (flush affordance, `paddingBlock: 0`; `--bottom-row-block` deleted); `bottomBar` → `footingBar` with `display: 'flex', flexDirection: 'column'` and **no** `marginTop`; the two `globalStyle`s follow the renames.
- Modify: `menu-row.tsx` — `MenuBottomRow` → `MenuFooting`; `index.ts`.
- Modify: `Frames/frames.css.ts:379` `footerLock` selector → `footing`; `:372` `crumbRow` unchanged.
- Modify the 12 `MenuBottomRow` files (Derivation).

**Derivation**
- `grep -rF "MenuBottomRow" src` → 31 → 0. `grep -rF "bottomBar" src` → 3 → 0. `grep -rF -- "--bottom-row-block" src` → 2 → 0.
- Control: `grep -rF "MenuFooting" src` → ≥ 13 after.

**Hazard:** opens the window — FilterFrame's locked branch is un-pinned until Task 20.

**Steps:**
- [ ] Rename; delete the auto-margin and the dead knob; repoint callers.
- [ ] Gates green. Commit `refactor(menus): the footing`.

#### Task 6: ActionRow, and the docs the recipe made false

**Requirement:** 5, 12

**Why:** "All Properties" is a row that acts (it discloses) at the secondary tone — the recipe's `actionRow` exactly, once its label goes emphasized. It escaped `MenuItem` to dodge the surface's `titleText` global; with tone owned by the kind, the global goes.

**Files:**
- Modify: `menu-base.css.ts` — `actionRow = style([item, text.footnote.emphasized, { color: c.label.secondary, selectors: { '&:hover': { background: 'none' } } }])`.
- Modify: `Properties/PropertyFrame.tsx:138-141` — `<button className={actionRow}>` with its chevron; `frames.css.ts` deletes `allHeadingRow`, `allRow`, and the `globalStyle` at `:158`; `menu-surface.css.ts:34` global deleted.
- Docs: `DesignSystemPM.md:221` sentence rewritten to the kinds; `:364-366` table rows to `MenuTopRow · MenuItem · MenuSeparator · MenuCaption · MenuFooting`, heading and actionRow as classes.

**Derivation**
- `grep -rF "allHeadingRow" src` → 2 → 0. `grep -rF "titleText" src/renderer/src/DesignSystem/Menus/menu-surface.css.ts` → 1 → 0.
- Control: `grep -rF "actionRow" src` → ≥ 2.

**Steps:**
- [ ] Rewrite; `propertyFrame.test.tsx` `rowFor('All Properties')` passes (label stays a leaf span inside a `role=button`).
- [ ] Gates green; docs; commit `refactor(menus): the action row`.

#### Gate 1 — the recipe stands
- [ ] Gates green, exit codes read directly.
- [ ] Derivations re-run against `--surface-inset` → 8.
- [ ] Simplification (`code-simplifier`, then `comment-killer-agent`) and `feature-dev:code-reviewer` dispatched against `<base>..HEAD` scoped to `DesignSystem/Menus`, `Pickers/PickerMenu`, `Frames`, `Properties`, `Settings`.
- [ ] Every concern fixed or ruled in the Log.
- [ ] Running pass: sidebar, Settings menu, a value picker, CardAddPicker, Calendar month list — each row measures 28 or 23. FilterFrame deferred to Task 20 (hazard window).
- [ ] Progress hashes filled in.

---

### Phase 2 — The Surfaces

#### Task 7: Every row box in `Frames/` and `Properties/Editors/` composes `item`

**Requirement:** 1, 12

**Why:** These are the 20 classes that restate the row's box; with `item` reading tokens they have nothing left to say. Deleting them is what gets `frames.css.ts` to geometry-only.

**Files:**
- `Frames/frames.css.ts`: delete `configRow`, `optionRow`, `ghostOptionRow` box props, `crumbRow` box props, `header`'s asymmetric padding → `item`; `topRowAction`, `eyeInert`, `rowPlus`, `optionsAdd` → `accessoryButton`; `compactTitle`, `configLabel` → keep as trailing/leading text classes for now (Task 14 moves them).
- `Frames/groupFrame.css.ts`: delete `chipRow`, `eyeSlot`; `subRow` keeps `SUB_ORDER_GAP` (a tuck, not a box).
- `Frames/filterFrame.css.ts`: `ruleRow` → `[item, { gap: '6px' }]`; `addRow` → `accessoryButton`; `leadGlyph` → `side`.
- `Properties/Editors/dateTimeEditor.css.ts`: delete `row` (28 floor); rows are `item`. `numberEditor.css.ts`: `row` keeps `marginTop` only.
- Consumers: `URLEditor`, `CheckboxEditor`, `FileEditor`, `NumberEditor`, `DateTimeEditor`, `OptionEditor`, `StatusEditor`, `OptionRow`, `GroupFrame`, `FilterFrame`, `PropertyFrame`.

**Derivation**
- `grep -rF "configRow" src` → 9 → 0. `grep -rF "chipRow" src` → ≥ 3 → 0.
- Control: `grep -rF "frameDnd" src` → ≥ 2 (a geometry export that stays; `propertyFrame.test.tsx:236` pins it).

**Steps:**
- [ ] Per file, delete the box class and compose `item`; run that file's tests.
- [ ] Gates green; `FilterFrame.test.tsx:376` `[class*="ruleRow"]` passes (the name survives as the gap override).
- [ ] Commit `refactor(frames): the frames' rows are the menu's`.

#### Task 8: Every `PickerMenu` host is Compact

**Requirement:** 8

**Why:** The pane already wears the ramp for everyone inside; giving it the padding pair too is the whole ruling. The hosts that were hybrids (hosted SettingsFrame, BlockHandleMenu, ViewEmbedBlock's list, LayoutFrame's ⋯ menu) become Compact by inheritance — no per-host class.

**Files:** `Blocks/handleMenu.css.ts` (`titleFieldRow` box, host `padding: '3px 6px'` → `item`), `Blocks/viewEmbed.css.ts` `listPane` (no row box), `Windows/pageWindow.css` `.page-window-insp-row` (min-height 22 → `item`; the inspector is Standard, it is a window), `CalendarPicker` `switchRow` (28 floor → `item`), `ImagePicker` `sliderRow` (→ `item`).

**Derivation**
- `grep -rn "minHeight\|min-height" src/renderer/src/{Blocks,Windows,DesignSystem/Components/Pickers} | grep -v "minHeight: 0\|min-height: 0"` → list at planning: `handleMenu`, `pageWindow.css:81`, `calendarPicker.css.ts:244`, `fields.css.ts:29` (the field's own floor — survives). After: only `fields.css.ts`.

**Steps:**
- [ ] Delete each row box; gates; running pass on BlockHandleMenu root + style + scale panes, the view-embed list, a page window's inspector.
- [ ] Commit `refactor(pickers): every picker host is Compact`.

#### Task 9: `NavList` is a menu

**Requirement:** 9

**Why:** `navList.css` re-implements `rowShell`, `item`, and `rowDisabled` at radius 6 / gap 6 / no selected state, and three surfaces (NavWindow, NavView, Trash) borrow it. As `MenuItem` rows on the menu column they get the Standard box, hover, selection, focus ring, and disabled state for free, and the file empties.

**Files:**
- Modify: `Navigation/NavList.tsx` — rows render `<MenuItem leading={icon} subLabel={pathTrail} selected disabled onClick>`; the search header stays its own element.
- Modify: `Navigation/navList.css` — delete `.nav-item`, `.nav-item-main`, `.nav-item-inert`, `.nav-item-title`, `.nav-item-path`; keep `.nav-list` (the column: `gap` → 0, `padding` per column) and `.nav-search-row`.
- Modify: `Settings/trashFrame.css:43` — the `--trash-lead` override moves to a `style` on the Trash's `MenuItem` `indent`… no: Trash rows show a `NavTrail` in the sub-label; `--trash-lead` deletes.
- Modify: `Windows/NavWindow.tsx`, `Detail/NavView.tsx`, `Settings/TrashFrame.tsx` — no size class (Standard).

**Interfaces**
- `NavList` rows keep their `data-*` hooks and aria; `NavTrail` stays an Element and rides `subLabel`.

**Derivation**
- `grep -rF "nav-item" src` → 36 → 0 outside `DesignSystem/Elements/NavTrail`. Control: `grep -rF "nav-list" src` → ≥ 3.

**Failure half:** an empty result list → the column's padding only; a row with no path → no `subLabel`, height 28; a disabled (inert) row → `rowDisabled`, unhittable.

**Steps:**
- [ ] Rewrite `NavList` rows; delete the classes; gates; `Navigation` tests pass.
- [ ] Running pass: NavWindow list, NavView, Trash — rows 28, hover wash present, selected pill present.
- [ ] Commit `refactor(navigation): NavList is a menu`.

#### Task 10: Settings rows and the Settings window

**Requirement:** 1, 9

**Why:** `SettingsRow` is already a `MenuItem`; the window's `.settings-wide` seat and `.settings-empty` are the last Settings-local row chrome. Folds ahead of the roster (Task 15) so that task moves data, not styling.

**Files:** `Settings/settingsWindow.css` — `.settings-empty` → `caption`; `.settings-wide` stays as the one width KNOB for a slider/path seat (mark it `KNOB`); `Settings/SettingsWindow.tsx` `RailTab` unchanged.

**Steps:**
- [ ] Repoint; gates; commit `refactor(settings): the window's rows are the menu's`.

#### Task 11: LayoutFrame's Scale row and the three value+toggle rows

**Requirement:** 1, 11

**Why:** The Scale row is a raw `div` wearing `item` and hand-building `side`/`footingSymbol`/`footingLabel`; the three `chevrons-up-down` rows each re-wrap `side` + `detail`. They are the trailing slot's first consumers and prove its shape before the roster generalizes it.

**Files:** `Frames/LayoutFrame.tsx:157-222`, `Frames/SettingsFrame.tsx:148-155`, `Blocks/BlockHandleMenu.tsx:288-297`; `Frames/layoutFrame.css.ts` `scaleRow` deleted.

**Interfaces**
- Produces on `MenuItem`: `value?: ReactNode` (control.standard · label-control, rendered before `trailing` inside the trailing `side`); `detail` stays passive footnote.emphasized and renders in the same cluster after `value`.
- Assumed by: Task 14 (the roster's `value` trailing).

**Steps:**
- [ ] Add `value` to `MenuItem` + `menu-base.css.ts` `// Trailing` (`value = style([text.control.standard, { color: c.label.control }])`); migrate the four sites; delete `scaleRow`, `groupByValue`.
- [ ] Gates; running pass on LayoutFrame's footing and Settings' format row.
- [ ] Commit `refactor(menus): value rides the trailing slot`.

#### Task 12: Autocomplete rows are Compact menu rows

**Requirement:** 10

**Why:** The pane is a `PickerMenu` (`bareSurface`) with a fully hand-rolled 28px row, `--fill-quaternary` selection, and no hover. As `item` inside a Compact pane it is 23, hovers, selects with `itemSelected`, and the `.mdpm-ac` max-height stops hardcoding `28px`.

**Files:** `MarkdownPM/AutocompletePane.tsx` (rows → `MenuItem` with `selected`; the pane's `font-size` override deleted), `MarkdownPM/Styles.css` `.mdpm-ac`, `.mdpm-ac-row*` (deleted; max-height reads the row's computed height via `--ac-row-h` = 23 or measures), `.claude/Guidelines/Cohesion-Rulings.md:66` deleted.

**Derivation**
- `grep -rF "mdpm-ac-row" src` → 4 → 0. Control: `grep -rF "mdpm-ac" src` → ≥ 2.

**Failure half:** zero suggestions → the pane doesn't open (existing behavior, unchanged); the active suggestion → `itemSelected`; keyboard navigation → the `selected` prop moves, no focus change.

**Steps:**
- [ ] Rewrite; `MarkdownPM` autocomplete tests pass; running pass on `[[` in a page.
- [ ] Commit `refactor(markdown): the autocomplete rows are the menu's`.

#### Gate 2 — every surface composes the recipe
- [ ] Gates green; derivations re-run; `grep -rn "minHeight: '2[0-9]px'\|min-height: 2[0-9]px" src` → only `fields.css.ts` and non-row hits listed in the Log.
- [ ] Simplification + review against `<base>..HEAD` scoped to `Frames`, `Properties`, `Navigation`, `Settings`, `MarkdownPM`, `Blocks`, `Windows`, `Pickers`.
- [ ] Running pass on every surface this phase touched.
- [ ] Progress hashes.

---

### Phase 3 — The Roster

#### Task 13: `menu-roster.tsx`

**Requirement:** 11

**Why:** `SettingsWindow` already renders rows from a closed `Row` union through one switch; that is the recipe's renderer, misplaced in Settings. Lifting it means a frame is a list of sections and the trailing kinds are named once.

**Files:**
- Create: `DesignSystem/Menus/menu-roster.tsx` — `type Trailing = { kind: 'chevron' } | { kind: 'value'; value: ReactNode; onToggle: () => void } | { kind: 'switch'; checked; onChange; ariaLabel } | { kind: 'button'; icon; onClick; ariaLabel } | { kind: 'slider'; …Slider props } | { kind: 'field'; children: ReactNode }`; `type MenuRow = { kind: 'heading'; label; caps? } | { kind: 'separator' } | { kind: 'caption'; text } | { kind: 'action'; label; trailing?; onClick } | { kind: 'item'; icon?; label; caption?; trailing?; selected?; disabled?; onSelect? }`; `type MenuSection = { title?; caps?; rows: MenuRow[] }`; `MenuRoster({ sections })`.
- Test: `DesignSystem/Menus/menu-roster.test.tsx` — each kind renders its element; a `switch` trailing keeps its `aria-label` on the button; a `heading` with `caps` wears `headingCaps`; an empty section renders nothing.

**Interfaces**
- Produces: the types above and `MenuRoster`. Assumed by: Tasks 15–19.

**Failure half:** zero sections → an empty fragment; a section with `title` and zero rows → the heading alone (a design choice: shown, so a data bug is visible rather than silent); a `trailing` of an unknown kind → a compile error (closed union).

**Steps:**
- [ ] Write the failing tests; implement; gates; commit `feat(menus): the roster`.

#### Task 14: The trailing slot inside `MenuItem`

**Requirement:** 11

**Why:** `detail` and `trailing` share one span today; `value` joined in Task 11. This makes the slot explicit — leading · title · [value] · [detail] · [trailing] — so the roster's `Trailing` maps to markup once.

**Files:** `menu-row.tsx` `MenuItem`; `menu-base.css.ts` `// Trailing` (`side` stays the cluster class; `value`, `detail`, `accessoryButton` its members); `frames.css.ts` `compactTitle`, `configLabel` → deleted (`configLabel` is the item's own title at control density — Compact handles it; `compactTitle` is the chip's name and moves to `OptionRow`'s own stylesheet as geometry).

**Steps:**
- [ ] Rewrite the markup; `GroupFrame.test.tsx` aria lookups pass; gates; commit `refactor(menus): the trailing slot`.

#### Task 15: SettingsWindow renders through the roster

**Requirement:** 11

**Files:** `Settings/SettingsWindow.tsx` (`Row` union → `MenuRow`; `RowControl` deleted; `FRAMES` unchanged), `Settings/SettingsRow.tsx` deleted, `HandoffPM.md:49` line removed.

**Derivation:** `grep -rF "SettingsRow" src` → 17 → 0. Control: `grep -rF "MenuRoster" src` → ≥ 2.

**Steps:**
- [ ] Migrate; running pass on every Settings frame; commit `refactor(settings): the window is a roster`.

#### Task 16: LayoutToggles + CardsOptions are one table

**Requirement:** 11

**Files:** `Frames/LayoutToggles.tsx`, `Frames/CardsOptions.tsx` → one `{ icon, label, key, invert? }[]` each rendered by `MenuRoster` with `switch` trailings; `frames.css.ts` `toggleRow` deleted.

**Steps:**
- [ ] Migrate; gates; commit `refactor(frames): the toggles are a table`.

#### Task 17: SettingsFrame, LayoutFrame's `FRAME_ROWS`, SortFrame, HiddenFrame

**Requirement:** 11

**Files:** `Frames/SettingsFrame.tsx` (`ENTRIES` → `item` rows with `chevron`), `Frames/LayoutFrame.tsx` (`FRAME_ROWS`), `Frames/SortFrame.tsx`, `Frames/HiddenFrame.tsx` (rosters; `frozen()` → `disabled`).

**Steps:**
- [ ] Migrate one file per commit; `SortFrame.test.tsx`, `HiddenFrame` model tests pass.

#### Task 18: GroupFrame; `ValueRow` and `FootingPick` fold

**Requirement:** 11

**Files:** `Frames/GroupFrame.tsx`, `Properties/ValueRow.tsx` (deleted), `Frames/groupFrame.css.ts` (`pickerTone` global deleted — tone is the kind's).

**Derivation:** `grep -rF "ValueRow" src` → 15 → 0; `grep -rF "FootingPick" src` → 3 → 0.

**Steps:**
- [ ] Migrate; `GroupFrame.test.tsx` passes; running pass; commit.

#### Task 19: The property editors

**Requirement:** 11

**Files:** `Properties/Editors/{URLEditor,CheckboxEditor,FileEditor,NumberEditor,DateTimeEditor}.tsx` → rosters (`switch`, `value`, `field`, `button` trailings); `numberEditor.css.ts` keeps `row`'s `marginTop` as `rowRhythm`.

**Steps:**
- [ ] Migrate; editor tests pass; commit.

#### Task 20: FilterFrame — the footer slot, the shell, the caption

**Requirement:** 6, 11 — closes the hazard window.

**Why:** The one frame with no `MenuScrollFrame` and the one pane the auto-margin held up. Its rule rows are a builder, not a list, so they keep their logic on `item`'s shell; everything around them is recipe.

**Files:** `Frames/FilterFrame.tsx` (wrap in `MenuScrollFrame` with `footer={<MenuFooting …/>}`; `lockedCaption` → `caption`; `addRow` → `button`), `Frames/filterFrame.css.ts` (`frame` keeps `growToContent` + `minHeight: 245`; `body`'s `flex: '1 0 auto'` deleted; `gp.middle`'s nested scroll region removed from the rows branch), `menu-row.tsx` `MenuScrollFrame` gains `className`.

**Negative control:** with the footer slot in place, remove `minHeight: 245` → the locked branch's footer rises to the content (proves the slot pins, not the floor); restore it.

**Steps:**
- [ ] Migrate; `FilterFrame.test.tsx` passes; running pass on both branches (locked + rows), footer flush at the bottom in each; the pane single-scrolls.
- [ ] Commit `refactor(filter): the footer rides the slot`.

#### Gate 3 — the recipe is the only row writer
- [ ] Gates green. Dead Vocabulary sweep: every token → 0; control `--surface-inset` → 8.
- [ ] `frames.css.ts` exports counted: geometry only (≤ 16).
- [ ] Simplification + review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Running pass across every surface in the census.
- [ ] Docs: `DesignSystemPM.md` §Menus rewritten to the kinds and the roster; `Cohesion-Rulings.md` gains the ruling "the menu row's box is declared once; a surface picks Standard or Compact on its pane".
- [ ] Progress hashes; Sequenced After written (Part 2: leading glyph sizes, `--list-inset`, the indent base).

---

## Implementation Log

### Progress
- [ ] **Phase 1** — The Recipe · base `<commit>`
  - [ ] Task 1 — the four row tokens, `item` and `menuCompact`
  - [ ] Task 2 — stacking order
  - [ ] Task 3 — one heading
  - [ ] Task 4 — TopRow defines itself
  - [ ] Task 5 — Footing
  - [ ] Task 6 — ActionRow + docs
- [ ] **Phase 2** — The Surfaces
  - [ ] Task 7 — Frames + editors compose `item`
  - [ ] Task 8 — every PickerMenu host is Compact
  - [ ] Task 9 — NavList is a menu
  - [ ] Task 10 — Settings rows
  - [ ] Task 11 — value + the Scale row
  - [ ] Task 12 — Autocomplete
- [ ] **Phase 3** — The Roster
  - [ ] Task 13 — `menu-roster.tsx`
  - [ ] Task 14 — the trailing slot
  - [ ] Task 15 — SettingsWindow
  - [ ] Task 16 — LayoutToggles + CardsOptions
  - [ ] Task 17 — SettingsFrame · LayoutFrame · SortFrame · HiddenFrame
  - [ ] Task 18 — GroupFrame
  - [ ] Task 19 — the property editors
  - [ ] Task 20 — FilterFrame

### Rulings
- 08-27 (Nathan): token names `--row-height-*` / `--row-width-*` are padding tokens, named so because a row's height is never declared. Compact pad 4. Pane wins inside a picker. NavWindow, NavView, Trash Standard. Autocomplete Compact. Heading on the row's horizontal inset. TopRow defines itself. `detail` = passive text, `value` = a control's value, both kept. Settings section titles keep uppercase. Leading-glyph sizes and nested-list insets are Part 2.

### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After
- Part 2 — leading glyph size per variant; `--list-inset` for nested lists; `menu-row.tsx:40`'s indent base and `sidebarDnd.tsx:35`'s mirror.
- The Figma `Menu Item` follows the code: Standard = body + 6, Compact = control + 4; `Menu Heading`, `Menu Footing`, `Menu TopRow` components.
### Closeout
