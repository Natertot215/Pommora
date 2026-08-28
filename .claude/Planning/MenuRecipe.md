## The Menu Recipe — Implementation Plan

> **Status:** ratified — in execution (approved 08-27-2026) · Execution follows **The Loop** (below the tasks) · Spec: this document's Goal, ratified in conversation on 08-27-2026 · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. Counts are whole-renderer (`Pommora/src/renderer/src`, Showcase included) unless a task says otherwise.

**Goal**

`DesignSystem/Menus/menu-base.css.ts` names every menu row kind once, in the order the rows stack on screen, and every row-producing surface in the renderer composes those kinds instead of restating them. At the end: a row's height is never declared — it is the typography line plus one of two padding tokens; there are exactly two row sizes, chosen once per surface; `NavList` is a menu; the TopRow, the heading, the "All Properties" action row, the footing, and the trailing slot each exist in one place; and `Frames/frames.css.ts` holds geometry only.

The shape: four tokens (`--row-height-standard` 6px, `--row-height-compact` 4px, `--row-width-standard` 6px, `--row-width-compact` 4px) declared in `menu-base.css.ts`, read by `item`; a surface wears `menuCompact` and every row inside follows. Chosen over a declared `height` (a fixed 24/20 was proposed and rejected — a caption row must grow, and the numbers on disk are already line + pad) and over keeping `PickerMenu`'s font-only knob (it shrinks the text and leaves every surface to invent its own padding, which is the five-heights problem this closes). Ratified by Nathan: the token names, 4px Compact, "pane wins" inside a picker, NavWindow and NavView both Standard, Autocomplete Compact, heading on the row's horizontal inset.

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
10. `AutocompletePane` rows are `item` under a `menuCompact` pane; the Cohesion ruling that exempted them is removed.
11. The trailing slot is one place: `chevron` · `value` + `toggle` · `switch` · `button` · `slider` · `field`; `detail` stays a separate passive text.
12. `frames.css.ts` retains only geometry, drag-chrome, and index exports; the 12 restating exports are gone.
13. `Frames/frames.css.ts` `COLOR` and the frame-local heading/tone consts are gone.
14. The search field in NavWindow and the Trash starts on the same left edge as its rows' icons; NavView's rows start on the content edge its search, banner title, and subfield share, and pad their lead with `--content-inset` like every NavList.
15. `NavTrail` owns its rung, tone, and vertical padding once; no consumer restates them; the Trash's checkboxes sit in the rows' lead inset.
16. The Settings window insets once — the body reads `--surface-inset`, rows read the row tokens — and a trailing field sits at the trailing edge like every other control.

**Acceptance — the whole thing working:** with the app running, the sidebar, the toolbar Settings menu, a property-value picker, the NavWindow list, the Trash list, and the editor's `[[` autocomplete each show rows whose measured height is exactly `line-height + 2 × the surface's height token` (28 Standard, 23 Compact) with no per-surface override in the cascade, and `grep -rF -- "--row-inset" src` is zero while `grep -rF -- "--surface-inset" src` is not.

**Forced By**

- `PickerMenu.pane` is the only writer of the ramp vars and is applied even under `bareSurface` (`PickerMenu.tsx:404`) → the Compact pair rides `pane`; every host in a picker portal is Compact by that fact, which is the ruling.
- `item` also serves the Sidebar (`Sidebar.tsx:140,270,412`), Settings, and every Frame → the base row cannot change class name; `[class*="item"]` at `propertyFrame.test.tsx:300,329` pins it; Compact is additive.
- `PickerOption` is a `<button>` and three tests reach rows via `[data-picker-portal] button` → `option` stays a button wearing `item` under the pane's `menuCompact`.
- `optionRing`'s run-merging (`pickerMenu.css.ts:51-73`) needs adjacent siblings → `PickerOption` markup keeps rows as direct siblings.
- `MenuTopRow` has one caller, `MenuFrameTopRow` (`menu-row.tsx`), and nothing passes `contentClassName` → the fold is consumer-invisible.
- 12 of 13 `MenuBottomRow`s already pin through `MenuScrollFrame footer=` → `margin-top: auto` serves FilterFrame's locked branch alone; jsdom does no flex layout → the footer pin is verified running, not by test.
- `numberEditor.css.ts:14`'s `marginTop: 8px` exists so a collapsed `Reveal` contributes no phantom gap → it survives; it is inter-row rhythm, not a row box.
- `calendarPicker.css.ts:74` sets body size on a control-line option → it deletes with Compact; the Month/Year list is Compact like every list in a picker.
- `menu-row.tsx:61` renders `detail` inside the same span as `trailing` → splitting `detail` from the trailing slot is a markup change, and `GroupFrame.test.tsx:275,285` reach controls by aria-label, so labels stay on payloads.
- `--surface-inset` is 10px and the row's horizontal inset 6px → the surface's padding reads `--surface-inset` (the glass gutter), never a row token; they are different distances.
- `item` sets `padding`, `fontSize`, and `lineHeight` as properties (`menu-base.css.ts:49-51`), and vanilla-extract composition is a class list, not precedence — a rung composed onto `item` contributes only weight → every row variant (TopRow, ActionRow, Compact) sets the **vars** `item` reads, never the properties; declaration order then cannot matter.
- `item` bundles the box and the shell (`rowShell`: hover, focus ring, cursor) → boxes that are not clickable rows (a filter rule, an inspector row, a frame header) compose `rowBox` alone.
- `MenuItem` forwards no ref and has no `onMouseDown` or overlay slot; `NavRow` passes `ref={drag.ref}` (`NavList.tsx:144`) and the pin is absolutely positioned; the autocomplete commits on `mousedown` + `preventDefault` (`AutocompletePane.tsx:44`) → Task 9 extends `MenuItem` first.
- `styles.css` resets no `h1-h6` margin; `.settings-section-title`'s `margin: 0 0 4px` is what zeroes the `<h3>` → `heading` declares `margin: 0`.
- `SettingsWindow`'s `Row` arms each carry a store key and `RowControl`'s components subscribe per row (`:658`) → the index renders rows; it does not own subscriptions, and Settings keeps its union.

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
- `Navigation/{navList.css,NavList.tsx}`, `Windows/NavWindow.tsx`, `Interface/NavView.tsx`, `Settings/TrashFrame.tsx` — the hand-rolled list.
- `MarkdownPM/Styles.css` `.mdpm-ac`, `.mdpm-ac-row`; `MarkdownPM/AutocompletePane.tsx`.
- `Frames/frames.css.ts`, `Frames/groupFrame.css.ts`, `Frames/filterFrame.css.ts`, `Frames/layoutFrame.css.ts`, `Views/CardView/cardAddPicker.css.ts`, `Properties/Editors/{dateTimeEditor,numberEditor}.css.ts`, `Settings/settingsWindow.css`, `Windows/pageWindow.css` — the row boxes.
- `Settings/SettingsWindow.tsx` — the `Row` union and `RowControl` switch the index lifts.
- `.claude/Guidelines/Cohesion-Rulings.md`, `.claude/Features/DesignSystemPM.md` §Menus (`:221`, `:364-366`).

**Environment:** plan directory `.claude/Planning`; explorer = `Explore`; executor = `general-purpose` (one per phase, see The Loop); attack reviewer = `build-breaking-agent`; final reviewer = this session; neutral verifier at closeout = `general-purpose`; simplification = `code-simplifier` then `comment-killer-agent`; gates = `npm run typecheck`, `npx biome check`, `npx vitest run` (from `Pommora/`, exit codes read directly, `set -o pipefail` when piped); rules directory `.claude/Guidelines`.

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

| Doc                      | The specific claim                                                                                                                                       | What makes it false                                            | Task |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---- |
| `DesignSystemPM.md:221`  | "menu headings → Headline / Emphasized" · "settings section headings → Headline / Emphasized" · "chips and sidebar section headers → Control / Semibold" | heading is footnote.emphasized; the sidebar clause has no code | 6    |
| `DesignSystemPM.md:364`  | Menu row: `MenuHeading` in the index                                                                                                                     | `MenuHeading` deleted                                          | 6    |
| `DesignSystemPM.md:365`  | Bars row: `MenuFrameTopRow`, `MenuBottomRow`                                                                                                             | folded / renamed                                               | 4, 5 |
| `DesignSystemPM.md:197`  | Row Inset: `--row-inset` · `ROW_INSET` · 6px                                                                                                             | replaced by the four row tokens                                | 1    |
| `Cohesion-Rulings.md:66` | "The autocomplete pane's row does not adopt the shared menu-row primitive."                                                                              | it does                                                        | 12   |
| `HandoffPM.md:49`        | `SettingsRow.tsx` is the MenuItem adapter                                                                                                                | deleted                                                        | 15   |
| `RendererRefactor.md:20` | the Menu recipe row, as written                                                                                                                          | this plan supersedes it; the row points here                   | 1    |

**Dead Vocabulary** *(the closing sweep; counts at planning time, whole renderer)*

- `MENU_GUTTER` → 0 (3) · `ROW_INSET` → 0 (4) · `--row-inset` → 0 (6) · `ROW_SIZE` → 0 (4) · `ROW_LINE` → 0 (4) · `--menu-row-size` → 0 (2) · `--menu-row-line` → 0 (2) · `ROW_GAP` → 0 (2) · `--top-row-block` → 0 (4) · `--bottom-row-block` → 0 (2)
- `MenuFrameTopRow` → 0 (32) · `MenuBottomRow` → 0 (31) · `bottomBar` → 0 (3) · `MenuHeading` → 0 (7) · `compactRow` → 0 (3) · `optionsLabel` → 0 (10) · `allPropertiesLabel` → 0 (2) · `previewHeading` → 0 (3) · `configRow` → 0 (9) · `allHeadingRow` → 0 (2) · `mdpm-ac-row` → 0 (4) · `SettingsRow` → 0 (17) · `ValueRow` → 0 (15) · `FootingPick` → 0 (3)
- `nav-item` → 0 (36 now, across seven files; `NavTrail` uses `nav-trail-*` and is untouched; `tabStrip.css:108` is a comment in another session's file and is theirs to drop). `flushTrailing` → 0 (26). `settings-wide` → 0 (3). `--trash-lead` → 0. `--trash-gutter` → 0. `--nav-list-lead` → 0 (the column's `--row-pad-lead: var(--content-inset)` replaces both). `trash-check` survives as the checkbox overlay's hold-visible hook.
- Control: `--surface-inset` → 9. Zero here means the sweep never ran.

**Hazard Window:** Task 5 deletes `bottomBar`'s `margin-top: auto`; FilterFrame's locked branch is un-pinned from that commit until Task 20 lands its footer slot. No running-thing pass on FilterFrame between them; Gate 1's running pass records the deferral.

**Hazard Window 2:** Task 3 puts `heading` on `--row-pad-x` (6px) while the boxes it labels — `frames.optionRow` (0), `dateTimeEditor.row` (0), `groupFrame.chipRow` (8) — keep their literals until Task 7 composes them onto `rowBox`; the Options / Format / Grouping-preview headings sit 2–6px off their rows between the two commits.

---

### Phase 0 — The Tree

#### Task 0: Commit the working tree

**Requirement:** none — a precondition. The tree carries a parallel session's `Store/`, `Detail/Scope.ts`, and `Tabs/tabsModel.ts`; the plan's base commit must include them so every phase's `<base>..HEAD` is this work alone.

**Steps:**
- [ ] `git status --short` — list what's there; `npm run typecheck` — record its result in the Log (three `TS7006` errors sit in `Store/CacheSlice.ts` at planning time).
- [ ] `git add -A Pommora/src && git commit -m "chore: the working tree before the menu recipe"`; record the hash as Phase 1's base.

### Phase 1 — The Recipe

#### Task 1: The four row tokens, `item` and `menuCompact`

**Requirement:** 1, 2

**Why:** Every row height in the renderer is line + padding, and the padding is the only thing surfaces disagree on. Naming the two pads once and letting the ramp ride the same variant is what makes "chosen once per surface" possible; the font-only knob is what made every picker-hosted `MenuItem` a third size. Done first because every later task composes these two classes.

**Files:**
- Modify: `DesignSystem/Menus/menu-base.css.ts` — declare the four tokens on `:root`; `rowBox` pads and sizes through four per-surface vars (`--row-pad-y`, `--row-pad-x`, `--row-size`, `--row-line`) that default to the Standard pair and the body ramp, plus `position: relative`; `item = style([rowBox, rowShell])`; add `menuCompact`, the class a surface wears to switch those vars to the Compact pair and the control ramp; delete `ROW_SIZE`, `ROW_LINE`, `ROW_GAP`, `minHeight: '24px'`.
- Modify: `DesignSystem/Components/Pickers/PickerMenu/pickerMenu.css.ts` — `pane` drops the `--menu-row-*` vars; `option` composes `item` (the pane wears `menuCompact`) and keeps only `justifyContent`, `whiteSpace`, the button reset, and the selection classes.
- Modify: `DesignSystem/Elements/DropOutline/dropOutline.css.ts` — `ROW_INSET` → read `var(--row-width-standard)` in `RAIL_CENTER_X`; the export goes.
- Modify: `DesignSystem/Menus/menu-surface.css.ts` — `MENU_GUTTER` deleted; `surface` and `hostedGutter` pad `6px var(--surface-inset)` with the `paddingTop` calc on the same `6px`.
- Modify: `styles.css` — `--row-inset` deleted.
- Modify the four `--row-inset` readers: `Sidebar/Sidebar.css:189`, `Frames/frames.css.ts:147`, `Frames/filterFrame.css.ts:130`, `Windows/navWindow.css:48` → `--row-width-standard`.
- Modify: `Views/CardView/cardAddPicker.css.ts` — deleted; `CardAddPicker.tsx` drops `compactRow` (the pane is Compact).
- Modify: `DesignSystem/Components/Pickers/CalendarPicker/calendarPicker.css.ts` — `optionRow`'s font size and tone go; its `flex: 1 · space-between · text-align left` stay as a geometry class, since the Month/Year/hour/minute labels are left-aligned full-width and `option` centers by default.
- Docs: `DesignSystemPM.md:197` row → the four tokens; `RendererRefactor.md:20` → one line pointing here.

**Interfaces**
- Produces: `rowBox` (the box: padding, ramp, layout, color, `position: relative`), `item = [rowBox, rowShell]` (unchanged name), both reading `--row-pad-y` / `--row-pad-x` (with `--row-pad-lead` / `--row-pad-trail` overriding one side) / `--row-size` / `--row-line` with Standard defaults; `rowDragging` moves here from `frames.css.ts:173` and `outlineMenu.css.ts:12`, which each declared it; `menuCompact`, the surface class that sets the four to the Compact pair and the control ramp.
- Assumed by: every later task; `pickerMenu.css.ts pane` wears `menuCompact`.

**Derivation**
- `grep -rF -- "--row-inset" src` → 6. Legitimate hits after: none.
- `grep -rF "MENU_GUTTER" src` → 3 → 0. `grep -rF "ROW_SIZE" src` → 4 → 0. `grep -rF "ROW_LINE" src` → 4 → 0.
- Control: `grep -rF -- "--surface-inset" src` → 9.

**Failure half:** a surface that sets neither pair → Standard (the `:root` tokens are the fallback, no `var()` default needed); a `MenuItem` with a `subLabel` → grows past 28, since nothing floors it; a picker with zero options → the pane's `surface` padding alone, no row.

**Steps:**
- [x] In `menu-base.css.ts`, `globalStyle(':root', { vars: { '--row-height-standard': '6px', '--row-height-compact': '4px', '--row-width-standard': '6px', '--row-width-compact': '4px' } })`. `rowBox`: `paddingBlock: 'var(--row-pad-y, var(--row-height-standard))'`, `paddingLeft: 'var(--row-pad-lead, var(--row-pad-x, var(--row-width-standard)))'`, `paddingRight: 'var(--row-pad-trail, var(--row-pad-x, var(--row-width-standard)))'` — `--row-pad-x` is the one knob a symmetric surface sets; a surface holding an affordance in its lead gutter (NavWindow 20/12, Trash 34/14) names `--row-pad-lead` alone, `fontSize: 'var(--row-size, ' + font.scale.body.size + ')'`, `lineHeight` likewise with body line, `position: 'relative'`, the flex/gap/color `item` has today; `item = style([rowBox, rowShell])`; delete `minHeight`, `ROW_SIZE`, `ROW_LINE`, `ROW_GAP` (inline `gap: '8px'`). Add `export const menuCompact = style({ vars: { '--row-pad-y': 'var(--row-height-compact)', '--row-pad-x': 'var(--row-width-compact)', '--row-size': font.scale.control.size, '--row-line': font.scale.control.line } })`.
- [x] `pickerMenu.css.ts`: `pane` composes `menuCompact` and drops its `vars`; `option` = `style([item, { justifyContent: 'center', whiteSpace: 'nowrap', border: 'none', background: 'none' }])` — delete its `padding`, `fontSize`, `lineHeight`, `text.control.standard`, `color`. Run `npx vitest run src/renderer/src/DesignSystem/Components/Pickers` → pass.
- [x] `dropOutline.css.ts`: `const RAIL_CENTER_X = \`calc(var(--row-width-standard) + ${RAIL_W / 2}px)\``; delete `ROW_INSET`; `menu-base.css.ts` drops the import.
- [x] `menu-surface.css.ts`: delete `MENU_GUTTER`; both paddings read `var(--surface-inset)`.
- [x] Repoint the four `--row-inset` readers; delete `--row-inset` from `styles.css`.
- [x] Delete `cardAddPicker.css.ts` and its import + `compactRow` use; delete `calendarPicker.optionRow` and its use.
- [x] `npm run format`; gates green; `grep -rF -- "--row-inset" src` → 0; `grep -rF -- "--surface-inset" src` → 9.
- [x] `npm run build`; `grep -o '[^{}]*picker-checked[^{}]*{' out/renderer/assets/index-*.css | head -3` — one class immediately before `:has(`, since `pane` is composed for the first time.
- [x] Docs rows; commit `refactor(menus): the row is its line plus one of two padding tokens`.

#### Task 2: Order the stylesheet and the row file as a menu stacks

**Requirement:** 3

**Why:** The kinds were appended over time; a reader can't find TopRow next to Footing or tell which class composes which. Ordering by stacking order is what lets every later task add a kind into its section instead of at the end. Behavior-neutral by construction, gated by the cascade rule.

**Files:**
- Modify: `DesignSystem/Menus/menu-base.css.ts` — sections in order: `// Shell` (`rowShell`) · `// TopRow` (`topRow`, `topRowPad` → folded into `topRow`, `topBarLeadingLabel`, `topBarLeadingSymbol`, `topBarTrailingLabel`, `topBarTrailingSymbol`, `paneSeparator`) · `// Heading` (`heading`) · `// Item` (`item`, `menuCompact`, `itemSelected`, `itemEmphasized`, `rowDisabled`, `side`, `titleWrap`, `titleText`, `titleInput`, `subLabel`, `flushAffordance`, `flushTrailing`) · `// ActionRow` (`actionRow`) · `// Separator` · `// Caption` · `// Footing` (`footing`, `footingLabel`, `footingSymbol`, `footerLockAction`, `lockIcon`, the two `globalStyle`s) · `// Trailing` (`accessoryButton`, `detail`) · `// Column` (`menu`, `MENU_MAX_HEIGHT`, `scrollFrame*`).
- Modify: `DesignSystem/Menus/menu-row.tsx` — same order: `MenuTopRow` · `MenuItem` · `MenuSeparator` · `MenuCaption` · `MenuFooting` (Task 5) · `AccessoryButton`, `FooterLockButton`, `FooterMoreButton` · `Menu`, `MenuScrollFrame`.

**Survivors:** `flushAffordance` moves to `// Shell` beside `rowShell`, so `topRow` and `footing` compose an already-declared class; its flush left edge and tight gap ride the vars `rowBox` reads (`--row-pad-lead: 0px`, `--row-gap: 4px`, the latter declared at `:root` as `8px`), since a property declared above `rowBox` loses to it. `topRow` absorbs `topRowPad` as `vars: { '--row-pad-y': 'var(--top-row-block, 2px)' }`. `actionRow` sits above `// TopRow` and the two `globalStyle`s at the end of `// Trailing` until Task 4 unwinds the label compositions — a `style([x])` reads `x` at module evaluation. Verify with the built CSS: `rowBox` reads `var(--row-gap)`, `flushAffordance` emits the two vars; a TopRow still measures 20 (body line 16 + 2·2) — its caption ramp goes live in Task 4.

**Steps:**
- [x] Move declarations into sections; no value changes. `npx biome check` → clean.
- [x] Gates green; `git diff --stat` shows only the two files.
- [x] Commit `refactor(menus): the stylesheet reads top to bottom as a menu does`.

#### Task 3: One heading

**Requirement:** 4, 13

**Why:** Nine section titles in five classes at three rungs; the recipe's own `heading` has no production consumer. One class at footnote.emphasized · tertiary on the row's horizontal inset, and the frames stop deciding type.

**Files:**
- Modify: `menu-base.css.ts` — `heading = style([text.footnote.emphasized, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', margin: 0, padding: '6px var(--row-pad-x, var(--row-width-standard)) 2px', color: c.label.tertiary, userSelect: 'none' }])` (the vertical pad is `previewHeading`'s, the only production heading that had one); add `headingCaps = style({ textTransform: 'uppercase', letterSpacing: '0.04em' })`; export both from `Menus/index.ts`.
- Modify: `menu-row.tsx` — delete `MenuHeading`; `DesignSystem/Menus/index.ts` drops the export; `Showcase/leaves/MenuLeaf.tsx:69-79` becomes a `<div className={heading}>` specimen.
- Modify: `Frames/frames.css.ts` — delete `optionsRow`, `optionsLabel`, `allPropertiesLabel`, `COLOR`; `Properties/Editors/{OptionEditor:112-113,StatusEditor:131-141,DateTimeEditor:63}` read `heading` on the wrapper (the "Options" row's trailing `+` sits inside it); StatusEditor's inline rename caret composes `text.footnote.emphasized` directly, not `heading`. `PropertyFrame.tsx:141` is Task 6's.
- Modify: `Frames/groupFrame.css.ts` — delete `previewHeading`; `GroupFrame.tsx:424,473` read `heading`.
- Modify: `Settings/settingsWindow.css` — delete `.settings-section-title`; `SettingsWindow.tsx:619` reads `cx(heading, headingCaps)`.

**Derivation**
- `grep -rF "optionsLabel" src` → 10 → 0. `grep -rF "previewHeading" src` → 3 → 0. `grep -rF "settings-section-title" src` → 3 → 0 (PanesLeaf included).
- Control: `grep -rF "text.footnote.emphasized" src` → ≥ 3.

**Steps:**
- [x] Rewrite `heading`; delete `MenuHeading` and its export; fix the Showcase leaf.
- [x] Repoint the nine sites; delete the five classes and `COLOR`.
- [x] Gates green; `GroupFrame.test.tsx` `'Options'` text assertions pass.
- [x] Commit `refactor(menus): one heading`.

#### Task 4: TopRow defines itself; one `MenuTopRow`

**Requirement:** 3, 7

**Why:** `MenuTopRow` has one caller — `MenuFrameTopRow` — and the split is a leftover of a bare form nothing uses. TopRow owns its rung, tone, padding, and its flush separator, and stops composing `actionRow`.

**Files:**
- Modify: `menu-base.css.ts` — `topRow = style([flushAffordance, { vars: { '--row-pad-y': '2px', '--row-size': font.scale.caption.size, '--row-line': font.scale.caption.line }, fontWeight: font.weight.emphasized, color: c.label.secondary }])` — vars, not properties, so it holds at 18 wherever it sits; its flush edge and 4px gap are `flushAffordance`'s `--row-pad-lead` / `--row-gap` (the `--top-row-block` knob goes — `CardAddPicker.tsx:128`'s `0px` override becomes `vars: { '--row-pad-y': 0 }` passed as `className` on its `MenuTopRow` — the row element, never the pane, since every row reads `--row-pad-y`; `paneSeparator`'s margin bakes to `2px`); `topBarLeadingLabel = style([text.footnote.emphasized, { color: c.label.secondary }])`, `topBarTrailingLabel` likewise at tertiary — no `actionRow` composition, so `actionRow` moves down into `// ActionRow` (Task 6 rewrites it there) and `footingLabel` composes `text.footnote.emphasized` directly.
- Modify: `menu-row.tsx` — one `MenuTopRow({ label, onBack, trailing?, current? })` that renders the row and its flush `MenuSeparator`; delete `MenuFrameTopRow`; `index.ts` exports `MenuTopRow` only.
- Modify the 12 `MenuFrameTopRow` files (Derivation) — rename to `MenuTopRow`; `CardAddPicker.tsx:41` local variable `topRow` renamed to avoid shadowing.

**Derivation**
- `grep -rF "MenuFrameTopRow" src` → 32 → 0. `grep -rF -- "--top-row-block" src` → 4 → 0.
- Control: `grep -rF "MenuTopRow" src` → ≥ 20 after.

**Steps:**
- [x] Fold the component; move `actionRow` into its section; repoint callers.
- [x] Gates green. Commit `refactor(menus): the TopRow defines itself`.

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
- [x] Rename; delete the auto-margin and the dead knob; repoint callers.
- [x] Gates green. Commit `refactor(menus): the footing`.

#### Task 6: ActionRow, and the docs the recipe made false

**Requirement:** 5, 12

**Why:** "All Properties" is a row that acts (it discloses) at the secondary tone — the recipe's `actionRow` exactly, once its label goes emphasized. It escaped `MenuItem` to dodge the surface's `titleText` global; with tone owned by the kind, the global goes.

**Files:**
- Modify: `menu-base.css.ts` — `actionRow = style([rowBox, { vars: { '--row-size': font.scale.footnote.size, '--row-line': font.scale.footnote.line }, fontWeight: font.weight.emphasized, color: c.label.secondary }])` — `rowBox`, not `item`, so it carries no hover; vars, so it renders footnote.
- Modify: `Properties/PropertyFrame.tsx:138-141` — `<button className={actionRow}>` with its chevron; `frames.css.ts` deletes `allHeadingRow`, `allPropertiesLabel`, and the `globalStyle` at `:158`; `allRow` stays (it is the unassigned rows' secondary tone, not a box) and its own `color` now suffices; `menu-surface.css.ts:34` global deleted.
- Docs: `DesignSystemPM.md:221` sentence rewritten to the kinds; `:364-366` table rows to `MenuTopRow · MenuItem · MenuSeparator · MenuCaption · MenuFooting`, heading and actionRow as classes.

**Derivation**
- `grep -rF "allHeadingRow" src` → 2 → 0. `grep -rF "titleText" src/renderer/src/DesignSystem/Menus/menu-surface.css.ts` → 1 → 0.
- Control: `grep -rF "actionRow" src` → ≥ 2.

**Steps:**
- [x] Rewrite; `propertyFrame.test.tsx` `rowFor('All Properties')` passes (label stays a leaf span inside a `role=button`).
- [x] Gates green; docs; commit `refactor(menus): the action row`.

#### Gate 1 — the recipe stands
- [ ] The Loop, steps 3–5. Running surface: sidebar, Settings menu, a value picker, CardAddPicker, Calendar month list — rows 28 or 23, TopRows 18. FilterFrame deferred to Task 20 (hazard window).

---

### Phase 2 — The Surfaces

#### Task 7: Every row box in `Frames/` and `Properties/Editors/` composes `item`

**Requirement:** 1, 12

**Why:** These are the 20 classes that restate the row's box; with `item` reading tokens they have nothing left to say. Deleting them is what gets `frames.css.ts` to geometry-only.

**Files:**
- `Frames/frames.css.ts`: delete `configRow`, `optionRow`, `ghostOptionRow` box props, `crumbRow` box props → `rowBox`; `header` stays a geometry export (its `2px 0 6px 2px` aligns the icon button's dash with the row-icon column, and it hosts a 28px title field); `topRowAction`, `eyeInert`, `rowPlus`, `optionsAdd` → `accessoryButton`; `compactTitle`, `configLabel` → keep as trailing/leading text classes for now (Task 14 moves them).
- `Frames/groupFrame.css.ts`: delete `chipRow`, `eyeSlot`; `subRow` keeps `SUB_ORDER_GAP` (a tuck, not a box).
- `Frames/filterFrame.css.ts`: `ruleRow` → `[rowBox, { gap: '6px', paddingLeft: 0 }]` (a builder row: no hover, and row 0's field stays flush at the gutter); `addRow` → `accessoryButton`; `leadGlyph` → `side`.
- `Properties/Editors/dateTimeEditor.css.ts`: delete `row` (28 floor); rows are `rowBox` (label + control, not clickable). `numberEditor.css.ts`: `row` keeps `marginTop` only.
- Consumers: `URLEditor`, `CheckboxEditor`, `FileEditor`, `NumberEditor`, `DateTimeEditor`, `OptionEditor`, `StatusEditor`, `OptionRow`, `GroupFrame`, `FilterFrame`, `PropertyFrame`.

**Derivation**
- `grep -rF "configRow" src` → 9 → 0. `grep -rF "chipRow" src` → ≥ 3 → 0.
- Control: `grep -rF "frameDnd" src` → ≥ 2 (a geometry export that stays; `propertyFrame.test.tsx:236` pins it).

**Steps:**
- [x] Per file, delete the box class and compose `item`; run that file's tests.
- [x] Gates green; `FilterFrame.test.tsx:376` `[class*="ruleRow"]` passes (the name survives as the gap override).
- [x] Commit `refactor(frames): the frames' rows are the menu's`.

#### Task 8: Every `PickerMenu` host is Compact

**Requirement:** 8

**Why:** The pane already wears the ramp for everyone inside; giving it the padding pair too is the whole ruling. The hosts that were hybrids (hosted SettingsFrame, BlockHandleMenu, ViewEmbedBlock's list, LayoutFrame's ⋯ menu) become Compact by inheritance — no per-host class.

**Files:** `Blocks/handleMenu.css.ts` (`titleFieldRow` box, host `padding: '3px 6px'` → `rowBox`), `Blocks/viewEmbed.css.ts` `listPane` (no row box), `CalendarPicker` `switchRow` (28 floor → `rowBox`), `ImagePicker` `sliderRow` (→ `rowBox`).

**Derivation**
- `grep -n "minHeight" src/renderer/src/DesignSystem/Components/Pickers/CalendarPicker/calendarPicker.css.ts` → 1 (`:244`) → 0. (`pageWindow.css`'s `.page-window-insp-row` is a filled field box inside `.page-window-insp-rows`, not a menu row — it stays.)
- Control: `grep -n "minHeight" src/renderer/src/DesignSystem/Components/Fields/fields.css.ts` → 1 (`:33`, the field's own floor, survives).

**Steps:**
- [x] Delete each row box; gates; running pass on BlockHandleMenu root + style + scale panes, the view-embed list, a page window's inspector.
- [x] Commit `refactor(pickers): every picker host is Compact`.

#### Task 9: `NavList` is a menu

**Requirement:** 9

**Why:** `navList.css` re-implements `rowShell`, `item`, and `rowDisabled` at radius 6 / gap 6 / no selected state, and three surfaces (NavWindow, NavView, Trash) borrow it. As `MenuItem` rows on the menu column they get the Standard box, hover, selection, focus ring, and disabled state for free, and the file empties.

**Files:**
- Modify first: `DesignSystem/Menus/menu-row.tsx` — `MenuItem` becomes a `forwardRef<HTMLDivElement>`, gains `onMouseDown?` and `overlay?: ReactNode` (rendered as the row's last child, positioned by the caller; `rowBox`'s `position: relative` anchors it). Three additions, no behavior change for existing callers.
- Modify: `menu-base.css.ts` `detail` — `flex: '0 1 auto', minWidth: 0, maxWidth: '55%'` (today's `.nav-item-path` cap; a passive text never squeezes the title) and `titleText` gains `--over-scroll-fade: var(--fade-base)`.
- Modify: `Navigation/NavList.tsx` — rows render `<MenuItem ref={drag?.ref} leading={icon} detail={<NavTrail …/>} overlay={<NavPinButton …/>} selected disabled className={dragging && rowDragging} onClick>`; the path is a trailing same-line `detail` (today's `.nav-item-path`: `margin-left: auto; max-width: 55%`), never a `subLabel`; the search header stays its own element.
- Modify: `Navigation/navList.css` — delete `.nav-item`, `.nav-item-main`, `.nav-item-inert`, `.nav-item-title`, `.nav-item-path`, `.nav-item.is-dragging`; `.nav-list` (the column) sets `--row-pad-x: var(--navwindow-inset)` and `--row-pad-lead: var(--content-inset)` — the lead inset TableView pads (`TableView.css:14`) — on every NavList surface (NavWindow 24/12, Trash 24/14, NavView 24/0), so the pin or checkbox lands inside that inset; the pin's absolute placement is the recipe's `overlay` class, centered in the lead through `calc(var(--row-pad-lead) / 2)`, with no per-surface offset.
- Modify the other four files with `nav-item` rules: `Windows/navWindow.css` (`--nav-list-lead` and the `.nav-item-*` overrides delete), `Settings/trashFrame.css` (`--trash-gutter` and `--trash-lead` delete; the sibling separator, the checkbox's hold-visible, and the historical dimming re-key on a `trash-row` className, the `.is-historical` state on the trail), `Interface/navView.css` (the pin's negative-left KNOB deletes), `Tabs/tabStrip.css:108` (a comment only; another session's file).
- Modify: `Settings/TrashFrame.tsx` — rows are `MenuItem`s with the checkbox in the `overlay` slot (Task 12b's shape, forced here by `.nav-item` dying).
- Modify: `Windows/NavWindow.tsx`, `Interface/NavView.tsx`, `Settings/TrashFrame.tsx` — no size class (Standard).

**Interfaces**
- `NavList` rows keep their `data-*` hooks and aria; `NavTrail` stays an Element and rides `detail`. `MenuItem`'s `ref`, `onMouseDown`, and `overlay` are assumed by Task 12.

**Derivation**
- `grep -rF "nav-item" src` → 36 across `navList.css`, `NavList.tsx`, `navWindow.css`, `trashFrame.css`, `TrashFrame.tsx`, `navView.css`, `tabStrip.css` → 0. Control: `grep -rF "nav-list" src` → ≥ 3.

**Failure half:** an empty result list → the column's padding only; a row with no path → no `detail`, still 28; a disabled (inert) row → `rowDisabled`, unhittable, with its `title` tooltip on an inner span so it still fires; a drag → `registerRow` fires through the forwarded ref (verify by reordering a pin).

**Steps:**
- [x] Rewrite `NavList` rows; delete the classes; gates; `Navigation` tests pass.
- [x] `.nav-search-row` pads `var(--surface-inset)` block and `calc(var(--content-inset) - var(--navwindow-inset))` inline — its divider keeps the `--navwindow-inset` margin, so the field's text origin lands on the rows' icon edge (`--content-inset`) on both surfaces that wear it; its dead `gap` and `color` go (no magnifier is rendered — `SearchField` is a bare input).
- [x] `.nav-view`'s column pads `calc(var(--content-edge) - var(--surface-lane))` inside the scroll pane's own `sidebar-clearance + surface-lane`, so its rows start on the one edge `.nav-view-head`, `.banner-title`, and `.subfield` share; `--row-pad-x` is 0 there through `--navwindow-inset: 0`; `navView.css`'s `--content-inset − --surface-lane` re-narrowing deletes.
- [ ] Running pass: NavWindow list, NavView, Trash — rows 28, hover wash, selected pill, the pin in its gutter, the search text and row icons on one left edge, NavView rows on the content edge, a pin reorder by drag lands.
- [x] Commit `refactor(navigation): NavList is a menu`.

#### Task 10: Settings rows and the Settings window

**Requirement:** 1

**Why:** `SettingsRow` is already a `MenuItem`; the window's `.settings-wide` seat and `.settings-empty` are the last Settings-local row chrome. Folds ahead of the index (Task 15) so that task moves data, not styling.

**Files:** `Settings/settingsWindow.css` — `.settings-empty` → `caption`; the body's own padding and the rows' inset stack today (a double inset off the rail) — `.settings-body` pads `var(--surface-inset)` and nothing else, rows read the row tokens, `.settings-heading` and the section headings land on the rows' text edge; `.settings-wide`'s fixed 260px seat deletes — a trailing field or slider sits at the trailing edge like every switch (Task 14's `wide` gives it `--row-trailing-width` for the slider's track; a `PathField` hugs its content), so the asset-directory field stops sitting stranded mid-row; `Settings/SettingsWindow.tsx` `RailTab` unchanged.

**Steps:**
- [x] Repoint; gates; commit `refactor(settings): the window's rows are the menu's`.

#### Task 11: LayoutFrame's Scale row and the three value+toggle rows

**Requirement:** 1, 11

**Why:** The Scale row is a raw `div` wearing `item` and hand-building `side`/`footingSymbol`/`footingLabel`; the three `chevrons-up-down` rows each re-wrap `side` + `detail`. They are the trailing slot's first consumers and prove its shape before the index generalizes it.

**Files:** `Frames/LayoutFrame.tsx:157-222`, `Frames/SettingsFrame.tsx:148-155`, `Blocks/BlockHandleMenu.tsx:288-297`; `Frames/layoutFrame.css.ts` `scaleRow` deleted.

**Interfaces**
- Produces on `MenuItem`: `value?: ReactNode` (control.standard · label-control, rendered before `trailing` inside the trailing `side`); `detail` stays passive footnote.emphasized and renders in the same cluster after `value`.
- Assumed by: Task 14 (the index's `value` trailing).

**Steps:**
- [x] Add `value` to `MenuItem` + `menu-base.css.ts` `// Trailing` (`value = style([text.control.standard, { color: c.label.control }])`); migrate the four sites; delete `scaleRow`, `groupByValue`.
- [ ] Gates; running pass on LayoutFrame's footing and Settings' format row.
- [x] Commit `refactor(menus): value rides the trailing slot`.

#### Task 12: Autocomplete rows are Compact menu rows

**Requirement:** 10

**Why:** The autocomplete becomes a standard Compact menu — nothing bespoke survives (Nathan, 08-28).

**Today:** `AutocompletePane.tsx` renders a `PickerMenu` (`bareSurface`, `contentClassName="mdpm-ac"`) with hand-rolled `div.mdpm-ac-row` rows — their own 28px box, `--fill-quaternary` selection (`.mdpm-ac-selected`), `.mdpm-ac-icon`, `.mdpm-ac-title` (secondary, the `.mdpm-ac-match` prefix primary), a `.mdpm-ac-forget` `HoverRemove` pushed right by `margin-left: auto` — and `.mdpm-ac` caps the pane at `calc(var(--ac-rows) * 28px + 8px)` (`--ac-rows: 4`), scrolls it, pads it 4px, and overrides the font to the editor's 15px.

**Becomes:** the same `PickerMenu` pane, Compact by `pane`, on its own `surface` gutter (the 4px it already pads) and its own scroll cap (`maxHeight={PICKER_MAX_HEIGHT}` — `--ac-rows` had one reader and goes); rows are plain `MenuItem`s — `leading` the page `EntityIcon` or the split glyph, children the title with the match prefix as an inline `mdpm-ac-match` span (the one content class: `font-weight: emphasized`, since the row's title is the recipe's primary), `selected={i === v.index}` → `itemSelected`, `onMouseDown` carrying the `preventDefault` and the `.mdpm-ac-forget` guard (never `onClick`, which would take focus and close the pane), `trailing` the same `HoverRemove reveal="host"` with `hoverRemoveHost` on the row; `.mdpm-ac` keeps only its width floor and cap (KNOBs). `.mdpm-ac-row`, `-selected`, `-icon`, `-title`, `-forget` rules delete; the font override goes, so the text is the control ramp's 12; rows measure 23. `.claude/Guidelines/Cohesion-Rulings.md:66` is the closeout's.

**Derivation**
- `grep -rF "mdpm-ac-row" src` → 4 → 0. Control: `grep -rF "mdpm-ac" src` → ≥ 2.

**Failure half:** zero suggestions → the pane doesn't open (existing behavior, unchanged); the active suggestion → `itemSelected`; keyboard navigation → the `selected` prop moves, no focus change.

**Steps:**
- [x] Rewrite; `MarkdownPM` autocomplete tests pass; running pass on `[[` in a page.
- [x] Commit `refactor(markdown): the autocomplete rows are the menu's`.

#### Task 12a: `NavTrail` owns its look

**Requirement:** 15

**Why:** `NavTrail` supplies no rung, tone, or padding; nine consumers inject all three and four of them retype the same caption/secondary pair. The trail is one thing wherever it appears.

**Files:**
- Modify: `DesignSystem/Elements/NavTrail/navTrail.css.ts` — `trail` composes `text.caption.standard`, `color: c.label.secondary`, `paddingBlock: 'var(--trail-pad, 0px)'`; `emphasized`/`current` keep their tones.
- Modify consumers to drop the restated pair: `Navigation/NavList.tsx` (`nav-item-path` → the `detail` slot, Task 9), `Settings/TrashFrame.tsx` (keeps `.is-historical` italic/tertiary as a state class on the trail), `Cards/Card.tsx` `card-loc` (`cards.css:170-172` deleted; `.card-loc-zone`'s `padding-top: 6px` KNOB becomes `--trail-pad` so the zone pads top and bottom alike — **first** diagnose why some cards show bottom padding under the trail and some none: read `.card-loc-zone`'s `margin-top: auto` against `.card-text`'s `8px 8px` and the reserved `--card-foot-h` in `CardsView.css:29-33` per card variant (gallery / cards view / a card with no location), name the cause in the Log, and fix it at that cause rather than by padding), `Embeds/PageEmbed.tsx` `pgembed-crumbs`, `Windows/PageWindow.tsx` `page-window-crumbs`, `Frames/SettingsFrame.tsx:192`'s `footingLabel` on the footing's `NavTrail` (footnote → the trail's caption; a footing crumb reads as a trail).
- Survivors: `Subfield` (`subline.emphasized` at `--label-control`, fixed 24px band — a different register by design), `PathField` (inherits its field's body rung).

**Derivation:** `grep -rF "text.caption.standard" src | grep -i "trail\|crumb\|loc\|path"` → 4 at planning → 0. Control: `grep -rF "NavTrail" src` → ≥ 9.

**Steps:**
- [x] Move the pair into `trail`; delete the four restatements; gates; running pass on a card's location zone, a nav row, a page embed's crumbs, the page window's tab crumbs.
- [x] Commit `refactor(navtrail): the trail owns its look`.

#### Task 12b: The Trash is a menu

**Requirement:** 15

**Why:** The Trash's rows were `.nav-item`s with a checkbox in a gutter of their own and a selection set a native right-click reads. On the recipe the rows are `MenuItem`s (Task 9 landed that shape), the checkbox is the row's `overlay` in the lead inset — the pin's affordance exactly — and the head's lanes read the rows' tokens.

**Files:**
- Modify: `Settings/TrashFrame.tsx` — each row a `MenuItem` (lead icon, title, `detail` = the trail, a `trash-date` trailing text) with the `Checkbox` in the `overlay` slot, absolutely placed in the lead inset that `--row-pad-lead: var(--content-inset)` reserves; the hover reveal, the `.has-checked` hold-visible, the `checked` set, the batch arms, and the head's Restore All behave as they do today; the context menu keeps today's selection semantics (a checked set acts together; an unchecked row acts alone).
- Modify: `Settings/trashFrame.css` — `.trash-check` survives on the overlay element as the hold-visible hook; the sibling separator keys on `.trash-row`; `--row-pad-x` = `--navwindow-inset` 14; `.trash-head` keeps its two lanes and the shared 160px date lane, its name column padding `--content-inset` and its trailing edge the rows' `--row-pad-x`, so the head's lanes align with the rows'.
- Test: `Settings/trashFrame.test.ts` (model) unchanged; add a render test that a row's checkbox toggles the checked set.

**Failure half:** an empty trash → the caption line; a historical row → the trail italic/tertiary, its checkbox still live; a restore on a row that vanished underneath (an external `.trash` edit) → the existing refresh prunes it and the handler no-ops on a missing bundle.

**Steps:**
- [x] Align the head; the render test; gates; running pass: rows 28 with the trail and date, the checkbox in the lead inset revealed on hover and held while any is checked, the head's lanes align with the rows', a batch action from the head.
- [x] Commit `refactor(trash): the Trash is a menu`.

#### Gate 2 — every surface composes the recipe
- [ ] The Loop, steps 3–5. `grep -rn "minHeight: '2[0-9]px'\|min-height: 2[0-9]px" src` → only `fields.css.ts` and the non-row hits listed in the Log. Running surface: every surface this phase touched, the search edge on all three lists, the Trash overlay, a card's trail zone.

---

### Phase 3 — The Index

Every task below is written as **Today → Becomes**; line numbers are at `7f358d51` (Gate 2). The trailing cluster is flush by design and the index names the trailing kinds once.

#### Task 13: `menu-index.tsx`

**Requirement:** 11

**Why:** The trailing kinds are named in seven places today; naming them once as a `Trailing` union and one `MenuRowView` renderer is what lets a presentational frame be a list of sections. `SettingsWindow`'s `Row` union is a settings *schema* — it keeps its union and its per-row subscriptions, and its `RowControl` renders through `MenuRowView`; the index owns rendering, never state.

**Today:** no index. `Settings/SettingsRow.tsx:8-16` is a `MenuItem` adapter (`subLabel={hint}`, `trailing={children}`); `Frames/LayoutToggles.tsx:25-55` and `Frames/CardsOptions.tsx:29-68` hand-build seven `MenuItem`s with `flushTrailing`+`toggleRow` and a `DualSwitch`; `Frames/SettingsFrame.tsx:158-164` maps `ENTRIES` to `MenuItem` + `chevron-right` + `rowDisabled`; `Frames/LayoutFrame.tsx:332` `leafRow` does the same over `FRAME_ROWS`; `Properties/ValueRow.tsx` and `Frames/GroupFrame.tsx` `FootingPick` wrap a `PickerControl` in `MenuItem` + `footingSymbol` + `footingLabel` + `gp.pickerTone`; the five editors put `configLabel` + a control into a bare `rowBox`.

**Becomes:** `DesignSystem/Menus/menu-index.tsx` exporting `type Trailing = { kind: 'chevron' } | { kind: 'value'; value: ReactNode; onToggle?: () => void } | { kind: 'switch'; checked: boolean; onChange: (next: boolean) => void; ariaLabel: string } | { kind: 'button'; icon: IconName; onClick: () => void; ariaLabel: string; disabled?: boolean } | { kind: 'slider'; …Slider props } | { kind: 'picker'; …PickerControl props } | { kind: 'color'; …ColorSwatch props } | { kind: 'field'; children: ReactNode }`; `type MenuRow = { kind: 'heading'; label: string; caps?: boolean } | { kind: 'separator' } | { kind: 'caption'; text: ReactNode } | { kind: 'action'; label: string; trailing?: Trailing; onClick: () => void } | { kind: 'item'; icon?: ReactNode; label: ReactNode; caption?: ReactNode; trailing?: Trailing; selected?: boolean; disabled?: boolean; onSelect?: () => void; className?: string }`; `type MenuSection = { title?: string; caps?: boolean; rows: MenuRow[] }`; `MenuRowView({ row })` renders one row (`MenuItem` for `item`/`action`, `<div className={cx(heading, caps && headingCaps)}>` for `heading`, `MenuSeparator`, `MenuCaption`); `MenuIndex({ sections })` maps sections → rows. No `wide` — seat widths are ruled out (Task 10) and the Slider owns its width (`144b2c89`).
- Test: `DesignSystem/Menus/menu-index.test.tsx` — each kind renders its element; a `switch` keeps its `aria-label` on the button; a `heading` with `caps` wears `headingCaps`; an empty section renders nothing; zero sections → empty fragment.

**Failure half:** zero sections → an empty fragment; a section with `title` and zero rows → the heading alone (shown, so a data bug is visible); an unknown `trailing.kind` → a compile error (closed union).

**Steps:**
- [x] Write the failing tests; implement; gates; commit `feat(menus): the index`.

#### Task 14: The trailing slot inside `MenuItem`

**Requirement:** 11

**Today:** `menu-row.tsx` renders `value` · `detail` · `trailing` inside one `span.side` (`:113-118`); 39 sites pass `flushTrailing` (`paddingRight: 0`) and none pass the opposite; `frames.css.ts:194` `configLabel` (control.emphasized · primary, the editors' row label) and `:153` `compactTitle` (control.standard · label-control · nowrap, the Compact chip's name in `OptionRow`) restate title type.

**Becomes:** the trailing cluster is flush by design — `MenuItem` sets `--row-pad-trail: 0px` on the row when it has a `trailing` control (a `detail` or `value` alone keeps the trail pad — NavList's path rows) (one var `rowBox` already reads; no new class), so `flushTrailing` deletes and its 39 sites are cleaned; `configLabel` deletes (the item's own title — `MenuRowView` `label` — at whatever density the pane sets); `compactTitle` moves to `Properties/OptionRow`'s own stylesheet as geometry. `MenuItem` gains no `wide`.

**Derivation:** `grep -rF "flushTrailing" src` → 39 → 0. `grep -rF "configLabel" src` → 11 → 0. `grep -rF "compactTitle" src` → 4 → the OptionRow stylesheet's own. Control: `grep -rF "detail" src/renderer/src/DesignSystem/Menus/menu-row.tsx` ≥ 2.

**Steps:**
- [x] Rewrite; `GroupFrame.test.tsx` aria lookups pass; gates; commit `refactor(menus): the trailing slot`.

#### Task 15: SettingsWindow renders through the index

**Requirement:** 11

**Today:** `Settings/SettingsWindow.tsx:71` `Row` union, `:594` section title `<h3 className={cx(heading, headingCaps)}>`, `:607` `RowControl` switch whose arms return `<SettingsRow label hint>` + a control (`:633`, `:651`); `Settings/SettingsRow.tsx` the adapter.

**Becomes:** each `RowControl` arm keeps its subscription and returns `<MenuRowView row={{ kind: 'item', label: row.label, caption: row.hint, trailing: { kind: 'switch' | 'picker' | 'color' | 'field' | 'slider' | 'button', … } }} />`; the section title renders `<MenuRowView row={{ kind: 'heading', label: section.title, caps: true }} />`; `SettingsRow.tsx` deletes; `HandoffPM.md:49` goes with `/handoff`.

**Derivation:** `grep -rF "SettingsRow" src` → 17 → 0. Control: `grep -rF "MenuRowView" src` ≥ 2.

**Steps:**
- [x] Migrate; gates; commit `refactor(settings): the window is an index`.

#### Task 16: LayoutToggles + CardsOptions are one table

**Requirement:** 11

**Today:** `Frames/LayoutToggles.tsx` — Column Icons `checked={!(hide_column_icons ?? true)}` (OFF by default), Hide Borders `hide_borders ?? false` (OFF), Page Icons `checked={!(hide_page_icons ?? false)}` (ON); `Frames/CardsOptions.tsx` — Hide Location (OFF), Wrap Titles (OFF), Hide Page Icons (OFF), Set Cards `?? true` (ON); every row `cx(flushTrailing, toggleRow)` with `frames.css.ts:85` `toggleRow = style({})`.

**Becomes:** one `{ icon, label, key, invert?, defaultOn? }[]` per file rendered by `MenuIndex` with `switch` trailings, `checked = invert ? !(view[key] ?? defaultOn) : (view[key] ?? defaultOn)`, `onChange` writing the key the same way each does today; `toggleRow` deletes.

**Negative control:** with none of the seven keys set, Layout shows Page Icons ON and Column Icons + Hide Borders OFF; Cards shows Set Cards ON and the other three OFF — flipping any entry's `defaultOn` or `invert` flips exactly that row.

**Derivation:** `grep -rF "toggleRow" src` → 10 → 0.

**Steps:**
- [x] Migrate; gates; commit `refactor(frames): the toggles are a table`.

#### Task 17: SettingsFrame, LayoutFrame's `FRAME_ROWS`, SortFrame, HiddenFrame

**Requirement:** 11

**Today:** `Frames/SettingsFrame.tsx:49` `ENTRIES`, `:98` `frozen`, `:158-164` the map to `MenuItem` + `chevron-right` + `rowDisabled`; `Frames/LayoutFrame.tsx:81` `FRAME_ROWS`, `:332` `leafRow`; `Frames/HiddenFrame.tsx:48-86` two `useFrameRegions` regions, each row `<RowShell id><MenuItem leading={rowIcon} trailing={eyeFor(id)} className={flushTrailing | +hiddenRow}>` with `:51` `eyeInert` for the Title row and `:55` `EyeToggle` (a `Button`); `Frames/SortFrame.tsx:166-213` five `ValueRow`s (folds in Task 18 — this task leaves SortFrame's rows to 18 and only confirms they still sit inside their `RowShell`s).

**Becomes:** `SettingsFrame` and `LayoutFrame` root lists → `<MenuIndex sections={[{ rows: entries.map(e => ({ kind: 'item', icon: <Icon name={e.icon} size="title3" />, label: e.label, trailing: { kind: 'chevron' }, disabled: frozen(e.id), onSelect: () => open(e.id) })) }]} />`; HiddenFrame keeps `FrameDnd` + `RowShell` + `useFrameRegions` and renders `<MenuRowView row={{ kind: 'item', icon: rowIcon(id, schema), label: nameFor(id), trailing: { kind: 'button', icon: hidden ? 'eye' : 'eye-off', onClick, ariaLabel, disabled: id === title } , className: hidden && s.hiddenRow }} />` inside each `RowShell` — `EyeToggle` folds into the `button` trailing if its markup is only a `Button` + `Icon` (read `EyeToggle.tsx:8-34` first; if it carries the hover-swap glyph logic, keep it and pass it as `trailing: { kind: 'field', children: <EyeToggle …/> }`), `eyeInert` deletes (`disabled` on the button).

**Derivation:** `grep -rF "leafRow" src` → 1 → 0; `grep -rF "eyeInert" src` → count → 0. Control: `grep -rF "RowShell" src` ≥ 4.

**Steps:**
- [x] Migrate one file per commit; `HiddenFrame` model tests and `SortFrame.test.tsx` pass.

#### Task 18: GroupFrame and SortFrame; `ValueRow` and `FootingPick` fold

**Requirement:** 11

**Today:** `Properties/ValueRow.tsx:11-28` (`MenuItem` + `flushTrailing` + `gp.pickerTone` + `gp.subRow` tier + `PickerControl` trailing, `gp.subLabel` for the sub tier); `Frames/GroupFrame.tsx:190,202` `FootingPick`, `:221-268` six `ValueRow`s; `Frames/SortFrame.tsx:166-213` five `ValueRow`s; `Frames/groupFrame.css.ts:18-19` `pickerTone` + its `globalStyle` forcing `pickerValue` to `label.control`; `:11` `subRow`, `:13` `subLabel`.

**Becomes:** every `ValueRow`/`FootingPick` → `<MenuRowView row={{ kind: 'item', icon, label: tier === 'sub' ? <span className={gp.subLabel}>{label}</span> : label, trailing: { kind: 'picker', ariaLabel, value, options, onPick }, className: tier === 'sub' ? gp.subRow : undefined }} />` (the footing ones inside `MenuFooting` as today); `ValueRow.tsx` and `FootingPick` delete; `pickerTone` and its global delete and `pickerControl.value` carries `color: label.control` itself.

**Derivation:** `grep -rF "ValueRow" src` → 15 → 0; `grep -rF "FootingPick" src` → 3 → 0; `grep -rF "pickerTone" src` → 4 → 0.

**Steps:**
- [x] Migrate; `GroupFrame.test.tsx` and `SortFrame.test.tsx` pass; commit `refactor(frames): the value rows are index rows`.

#### Task 19: The property editors

**Requirement:** 11

**Today:** `URLEditor.tsx:30-49` three `div.rowBox` + `configLabel` + `DualSwitch` / `ColorSwatch` / `PickerControl`; `CheckboxEditor.tsx:31-37` two (`ColorSwatch`, `PickerControl`); `FileEditor.tsx:21-23` one (`PathField`); `NumberEditor.tsx:42-43` `cx(rowBox, s.row)` + `configLabel`, `:60-78` its own `valueControl` button mirroring a `PickerControl` trigger, and `DualSwitch`/`PickerControl` rows; `DateTimeEditor.tsx:43-48` `rowBox` + `side` glyph + `configLabel` + `PickerControl` under the `:65` `heading` "Format"; `numberEditor.css.ts:14` `row` (`marginTop` rhythm), `:21` `valueControl`.

**Becomes:** each editor renders `<MenuIndex sections={[…]} />` with `switch` / `color` / `picker` / `field` trailings (`NumberEditor`'s edit-in-place value rides `{ kind: 'field', children: <its button/input> }` — its `valueControl` stays as the field's own look); `numberEditor.css.ts` `row` → `rowRhythm` (`marginTop` only) passed as the row's `className`; `configLabel` is already gone (Task 14).

**Steps:**
- [x] Migrate; editor tests pass; commit `refactor(properties): the editors are indexes`.

#### Task 20: FilterFrame — the footer slot, the shell, the caption

**Requirement:** 6, 11 — closes Hazard Window 1.

**Today:** `Frames/FilterFrame.tsx:742-790` `div.fp.frame` > `MenuTopRow` > (locked: `div.fp.lockedCaption` + a Reset `MenuItem`) | (rows: `div.cx(gp.middle, fp.body, 'over-scroll')` > the rule list + an `accessoryButton` add) > `MenuFooting` (the Any/On pickers); `filterFrame.css.ts:28` `FILTER_MIN_HEIGHT = '245px'`, `:33-35` `frame` = `growToContent` + `minHeight`, `:40` `body` `flex: '1 0 auto'`, `:111` `lockedCaption`; `groupFrame.css.ts:24` `middle` (scroll ceiling KNOB).

**Becomes:** `<MenuScrollFrame className={fp.frame} header={<MenuTopRow …/>} footer={<MenuFooting …/>}>` wrapping both branches so the footer is pinned by the slot in each; the locked caption → `<MenuCaption>`; the rows branch drops `gp.middle` and `fp.body` (the scroll frame's body scrolls; `body` deletes); `fp.frame` keeps `growToContent` + `minHeight: 245`; `MenuScrollFrame` gains `className`; the add row → a `button` trailing or stays an `accessoryButton` row (reuse what Task 7 left).

**Negative control:** keep the floor; in the locked branch the footer sits flush at the pane's bottom with the slot and rises to the content with `footer=` removed. `lockedCaption` → `caption` changes the locked text from footnote-left to body-centered — the kind's look, ruled.

**Steps:**
- [x] Migrate; `FilterFrame.test.tsx` passes; running pass on both branches, footer flush at the bottom in each; the pane single-scrolls.
- [x] Commit `refactor(filter): the footer rides the slot`.

#### Gate 3 — the recipe is the only row writer
- [ ] The Loop, steps 3–5. Dead Vocabulary sweep: every token → 0, control `--surface-inset` → 9. `frames.css.ts` exports counted, all geometry, drag chrome, or `ICON`. Screenshots: every frame, both FilterFrame branches with the footer flush, every Settings frame, every editor. Docs: deferred to §Closeout.

---

### Phase 4 — The Edges Found Alongside

Written as **Today → Becomes**; counts re-derived at Phase 4's open.

#### Task 21: The content edge is one token

**Requirement:** 14

**Today:** `calc(var(--sidebar-clearance) + var(--content-edge))` is written five times — `Interface/navView.css:21` (`.nav-view-head`'s left margin; its right margin is the inspector twin `calc(var(--inspector-clearance) + var(--content-edge))`), `Interface/Subfield/subfield.css:11` (`.subfield` padding-left), `:99` (the footnotes toggle), `Interface/Banner/Banner.css:33` (`.banner-title` left), `:119` — plus the NavView column Task 9 put on the same edge. `styles.css` `.shell` declares `--sidebar-clearance` / `--inspector-clearance` beside the layout block.

**Becomes:** `.shell` declares `--content-start: calc(var(--sidebar-clearance) + var(--content-edge))` and `--content-start-right: calc(var(--inspector-clearance) + var(--content-edge))` once, beside the clearances; every left and right reader reads the token. Nothing moves on screen.

**Derivation:** `grep -rF "var(--sidebar-clearance) + var(--content-edge)" src` → 5 (+1) → 0; `grep -rF "var(--inspector-clearance) + var(--content-edge)" src` → count at open → 0. Control: `grep -rF -- "--sidebar-clearance" src` ≥ 3.

**Steps:**
- [ ] Mint; repoint; gates; screenshots of the banner title, subfield, footnotes toggle, NavView head and list — nothing moves.
- [ ] Commit `refactor(shell): the content edge is one token`.

#### Task 22: IconPicker's cell wears the shell

**Requirement:** 1

**Today:** `DesignSystem/Components/Pickers/IconPicker/iconPicker.css.ts:75-90` `cell` — `flex 0 0 auto`, `display: grid`, `placeItems: center`, `border: none`, `background: transparent`, `borderRadius: 8`, `color: label.control`, `fontSize: vars.size.icon.title2`, `cursor: pointer`, `'&:hover': { background: state.hover }`; `cellSelected` the accent.

**Becomes:** `cell = style([rowShell, { flex, display: 'grid', placeItems, border, background, color, fontSize }])` — radius 8 and the hover wash from `rowShell`; the cell keeps its own size; `cursor` inherits `rowShell`'s `default` (the cursor convention: default everywhere but links — recorded in Deviations); `cellSelected` unchanged.

**Steps:**
- [ ] Compose; gates; screenshot the icon picker — hover and selection unchanged.
- [ ] Commit `refactor(iconpicker): the cell wears the shell`.

#### Task 23: The icon ladder is named as the type ramp is

**Requirement:** none of the numbered ones — a naming debt the Figma mirror surfaced.

**Today:** `Tokens/size.css.ts:6-18` `ICON_PX = { largeTitle: 26, title1: 22, title2: 17, title3: 15, headline: 13, body: 13, callout: 12, control: 12, caption: 11, footnote: 10, subline: 10 }`, `vars.size.icon.*` derived from it at `:22`; readers whole-renderer at Phase 2's open: `largeTitle` 3, `title1` 7, `title2` 7, `title3` 23 (definitions included).

**Becomes:** four title rungs today against three type-ramp names — list each rung's readers first; a rung with no reader outside its definition deletes (said so in the Log); the survivors are renamed `titleLarge` / `titleMedium` / `titleSmall` in descending size, every `size="…"` / `vars.size.icon.…` read following; the Figma `Icons` variables are Part 2 (the file is out of scope for this run); `DesignSystemPM.md`'s row at closeout.

**Derivation:** each old key → 0 after; control `grep -rF "ICON_PX" src` ≥ 3.

**Steps:**
- [ ] Count each rung's readers; a rung with none deletes.
- [ ] Rename; gates; commit `refactor(tokens): the icon ladder is named as the type ramp is`.

#### Gate 4 — the edges
- [ ] The Loop, steps 3–5. Screenshots: banner, subfield, NavView head, the icon picker.

---

## Landing

When Progress shows every task ticked with a hash and Gate 4 closed, the plan is not done — it is claimed. Landing is four dispatches and a record, in this order, and none is skipped.

**1. The Delivery Claim.** Write it into the Log's Closeout as checkable assertions, each with its evidence: every numbered Requirement (1–16) traces to a landed task by hash; the Acceptance criterion held — name the six surfaces and the measured heights (28 / 23) and the two greps (`--row-inset` → 0, `--surface-inset` → 9); no new dependency; no mechanism declared twice (`rowDragging`, the content edge, the heading, the trail's look — one home each, grep-proven); nothing left with nothing to vary (the Dead Vocabulary sweep at 0 against its control, `frames.css.ts` at 28); no work added to a high-frequency path (no per-render row rebuilds — Settings' subscriptions stayed per row).

**2. The neutral verifier — "Is this true?"** A `general-purpose` agent handed the Claim, the Requirements and Acceptance from this document's head, the Rulings, and the full range `<Task 0 hash>..HEAD` — and nothing else. It answers per assertion: holds, overstated, or missing, with file:line. It is not asked to attack. A "no" on any assertion is a fix and a re-claim before step 3.

**3. The attack.** `build-breaking-agent` on the same range, briefed per *Briefing a Reviewer* with the Rulings as the do-not-re-raise list, asked for reachable defects only — what breaks, not what's missing. Every finding verified against the code by the orchestrator; fixed in an addendum commit or rejected with its reason in the Log. Three rounds maximum; past that, what's open goes to Nathan.

**4. The running pass, Nathan's.** A named list of every user-visible surface the plan touched — the sidebar, each toolbar menu and frame, both FilterFrame branches, a value picker, CardAddPicker, the Calendar lists, NavWindow, NavView, the Trash (rows, overlay, search edge, head lanes), the Settings window (rail, every frame, the asset-directory field, a slider), the `[[` autocomplete, a card's trail zone, a page embed's crumbs, the icon picker — with what to look for at each (28 or 23, one left edge, flush trailing, TopRows at 18). He looks; what he flags is a Task, not a note.

**5. The record.** Run the Dead Vocabulary sweep one last time against its control. Rewrite what the plan made false and hasn't yet: `DesignSystemPM.md` §Menus (the kinds, the tokens, the index), its `:221` sentence and `:364-366` rows, the Geometry table's row-token rows; `Cohesion-Rulings.md` (the autocomplete exemption gone, the "declared once, chosen per pane" ruling added); `InterfacePM.md` / `NavigationPM.md` where the Trash's checkboxes or NavList's own rows are described; `HandoffPM.md:49`. Draft the History entry in chat in plain language — what a row is now, what deleted, the visible changes, the commit range and the code-only line delta — and file it only on Nathan's word. Route Lessons to `.claude/Guidelines` (the vars-not-properties rule for vanilla-extract variants belongs in `Cohesion-Rulings.md`). Write Sequenced After as the Part 2 brief: leading glyph size per variant, `--list-inset`, the indent literal and its `sidebarDnd` mirror, the Figma components that follow (Menu Item at 28/23, Heading, TopRow, Footing, Separator). Update `RendererRefactor.md`'s Menu row to point at the History entry, `ContextPM.md`'s focus and Immediate Work, and run `/handoff`.

**6. Commit and stop.** Everything above rides explicit-path commits on `main`; pushing to origin is Nathan's call. The plan's Status becomes "landed — <History entry>"; the file stays as the record.

## The Loop

Every phase runs the same loop. Nothing advances on a summary; every claim is re-checked by the next hand.

**1. Open — the orchestrator (this session).** Re-derive every Derivation in the phase against the live tree; a count that moved rewrites the task before anyone executes it. Record the base commit in Progress. Write the executor's brief: the phase's tasks verbatim, the Global Constraints, Inherited Reasoning, the Rulings, and a do-not list (the parallel session's files; anything ratified). Nothing else — no transcript.

**2. Execute — one agent, one tree.** A `general-purpose` agent runs the phase's tasks in order, one commit per task, ticking each task's boxes inside its commit. Per task it reports, verbatim from the terminal: each gate's summary line, each Derivation's before/after count against its control, and every deviation from the task as written. If a task's real shape departs from its written one, it searches the plan for every later task that assumed the old shape, rewrites them, and records the divergence — before that task's commit. It never edits a gate, a test assertion, or a criterion to reach green; a task it cannot satisfy as written is reported as impossible and the loop stops there.

**Found Along The Way.** A consumer, a duplicate, or a migration the task didn't name gets one of two dispositions, decided by a test the executor applies and states: **obviously correct** — the same mechanism the task is already replacing, in a file the task is already editing, requiring no decision the plan hasn't made, and the gate stays green — is folded into that task's commit and listed under the task's report as folded; anything else is listed with file:line and a proposed disposition and **left untouched**. The executor never widens scope on its own judgment beyond that test.

**3. Simplify — one agent, the phase's range.** `code-simplifier` then `comment-killer-agent`, each against `<base>..HEAD` scoped to the phase's paths, each reporting what it cut with file:line. Behavior identical; the gates re-run after each and their summary lines are in the report. A simplification that would change behavior is reported, not applied.

**4. Review — the orchestrator, then the attacker.** The orchestrator reads the phase's diff itself (`git diff <base>..HEAD` — the commits, not the reports), runs the three gates itself and reads the exit codes, re-runs every Derivation and the Dead Vocabulary sweep with its control, checks every Made False row whose task landed, and walks the running surface (screenshots where a pane can be reached; otherwise a named list for Nathan). Every Found item is adjudicated: folded now as an addendum commit if obviously correct on the orchestrator's own reading, routed to Open Against Later Tasks if a later task owns it, or to Sequenced After. Then `build-breaking-agent` on the phase's range with the brief in *Briefing a Reviewer*; every finding is verified against the code by the orchestrator before it is folded or rejected with its reason in the Log. **A concern is unfinished work** — it is fixed in an addendum commit or carries Nathan's ruling; nothing is deferred without one.

**5. Close the phase.** Progress hashes filled in; Lessons written into the later tasks they change; the next phase's Derivations re-derived. Only then does step 1 open the next phase. The user-visible surfaces of a phase are Nathan's to see before the next phase starts when a running pass couldn't reach them.

**Standards that hold at every step:** every surface a phase touches is screenshotted and read by the orchestrator before its gate closes (Nathan, 08-28); exit codes read directly, never through a pipe without `pipefail`; no "green" without the summary line quoted; no `DONE_WITH_CONCERNS` — a concern is a task; comments at one load-bearing why per file, every `KNOB` intact; explicit paths staged, never a directory; no two writers on the tree at once — the executor and the simplifier run in sequence, never in parallel.

---

## Implementation Log

### Progress
- [x] **Phase 0** — The Tree
  - [x] Task 0 — commit the working tree · `27c5171c`
- [x] **Phase 1** — The Recipe · base `27c5171c` · executor `a1f3e2c5..bdf30002` · addenda `7cbb44ea` (heading gap 0, Nathan) · `faa7d3b0` (simplifier) · `4626e3a1` (comment-killer) · `72a867a4` (review: `rowBox` first, `footing` on it, `--row-gap` gone, `optionCheck` margin gone) · `8fcb89bb` (breaker F2) · Gate 1 closed `7226d650`
  - [x] Task 1 — the four row tokens, `item` and `menuCompact` · `a1f3e2c5` + `370a167a`
  - [x] Task 2 — stacking order · `5194820f`
  - [x] Task 3 — one heading · `c857a3e4`
  - [x] Task 4 — TopRow defines itself · `fb2f77d5`
  - [x] Task 5 — Footing · `a6df3eed`
  - [x] Task 6 — ActionRow · `bdf30002` (docs rows deferred to §Closeout)
- [x] **Phase 2** — The Surfaces · base `7226d650` · executor `3d90741e..659b25e2` · simplifier `8aed8657` · comment-killer `7f358d51` · review `2be2609b` `96755197` `51be26de` `144b2c89` · breaker `cffdd681` · Gate 2 closed
  - [x] Task 7 — Frames + editors compose `item` · `3d90741e`
  - [x] Task 8 — every PickerMenu host is Compact · `6724ba08`
  - [x] Task 9 — NavList is a menu · `c21eb47d`
  - [x] Task 10 — Settings rows · `90cbd682`
  - [x] Task 11 — value + the Scale row · `be6381a5`
  - [x] Task 12 — Autocomplete · `da647e88`
  - [x] Task 12a — NavTrail owns its look · `0f6325c5`
  - [x] Task 12b — the Trash is a menu · `46aac3d1 + 659b25e2`
- [ ] **Phase 3** — The Index · base `cffdd681`
  - [ ] Task 13 — `menu-index.tsx`
  - [ ] Task 14 — the trailing slot
  - [ ] Task 15 — SettingsWindow
  - [ ] Task 16 — LayoutToggles + CardsOptions
  - [ ] Task 17 — SettingsFrame · LayoutFrame · SortFrame · HiddenFrame
  - [ ] Task 18 — GroupFrame
  - [ ] Task 19 — the property editors
  - [ ] Task 20 — FilterFrame
- [ ] **Phase 4** — The Edges Found Alongside
  - [ ] Task 21 — the content edge is one token
  - [ ] Task 22 — IconPicker's cell wears the shell
  - [ ] Task 23 — the icon ladder is named as the type ramp is

### Rulings
- 08-28 (Nathan): the autocomplete is a standard Compact menu; nothing bespoke survives. Every task's text names what exists today and what it becomes; where the written task is vague, the executor writes that pair in before committing.
- 08-28 (Nathan): the Settings window's own tokens go — it is plain menu logic: the body pads `--surface-inset`, rows are `item`, headings are `heading` + `headingCaps`, controls sit at the trailing edge, no seat widths; only what is structurally Settings stays (the rail, the frame switch, the empty caption), and a structural reader keeps a literal + `KNOB`, not a var.
- 08-28 (Nathan): the Trash keeps its checkboxes; they move into the lead inset.
- 08-28 (Nathan): NavList and the Trash pad their lead with `--content-inset`, as TableView does; the pin / checkbox sits inside it. NavView too — its rows start on the content edge and pad their lead with `--content-inset` like every NavList, so all three surfaces read one `--row-pad-lead` and one overlay rule.
- 08-27 (Nathan): the Trash's action works as the NavList pin does — an overlay glyph in the lead gutter; the checkboxes go. The trail pads through `--trail-pad`; the cards' uneven bottom padding is a defect to diagnose, not pad over.
- 08-27 (Nathan): token names `--row-height-*` / `--row-width-*` are padding tokens, named so because a row's height is never declared. Compact pad 4. Pane wins inside a picker. NavWindow, NavView, Trash Standard. Autocomplete Compact. Heading on the row's horizontal inset. TopRow defines itself. `detail` = passive text, `value` = a control's value, both kept. Settings section titles keep uppercase. Leading-glyph sizes and nested-list insets are Part 2.

### Review
- Round 1 (build-breaking-agent, 08-27): 12 findings, all verified against the code and folded — variants set vars not properties (F1, F2); `MenuItem` gains `forwardRef`, `onMouseDown`, `overlay` before NavList (F3, F8); the nav path is `detail` (F4); the four other `nav-item` files and the per-surface `--row-pad-x` (F5); `rowBox` split from `item` (F6); `heading` declares `margin: 0` and the 6/2 vertical pad (F7, F9); `allRow` stays (F9); the index renders, Settings keeps its subscriptions (F10); Task 20's control inverted (F11); Calendar's option alignment kept (F12). Cold-read fixes: the `--surface-inset` sentence, Task 8's derivation, Gate 3's export count, `nav-item`'s survivors, Task 3's StatusEditor caret, the Task 3/6 overlap on `PropertyFrame.tsx:141`.

- Round 2 (build-breaking-agent, 08-27): 15 findings, all verified and folded — the TopRow's real height is 18 once its ramp is live (F1); `rowBox` takes `--row-pad-lead`/`--row-pad-trail` over `--row-pad-x` for the two asymmetric nav surfaces (F2); CardAddPicker's override rides the TopRow element (F3); the trailing cluster is flush by design and `flushTrailing` dies (F4); `wide` on the item (F5); `defaultOn` on the toggle tables (F6); Sort/Hidden render `MenuRowView` inside their drag shells (F7); `detail` caps at 55% (F8); WindowInspector's field box is not a row and leaves Task 8 (F9); `header` stays geometry (F10); `pickerControl.value` owns its tone (F11); `heading` reads `--row-pad-x` (F12); `.mdpm-ac` keeps its box (F13); counts 28 / 12 / calendar-only (F14); the inert row's tooltip on an inner span (F15). Latent: `rowDragging` declared twice — moves to the recipe in Task 1. Unknown carried into Task 1's steps: the composed `pane` under `:has()`.

- Round 3 (build-breaking-agent, Phase 1 range, 08-28): 2 findings, 17 kills. F1 — `heading` on the row token a phase ahead of the boxes it labels → registered as Hazard Window 2, closed by Task 7 (zero code). F2 — `allHeading` lost the old row's `gap: 4px` and rode `rowBox`'s 8 while `topRow`/`footing` sit at 4 → composes `flushAffordance` (its `--row-pad-lead` duplicate gone). Measured on the built CSS: Standard 28 · Compact 23 · TopRow 18 · `topRowFlat` 14; every composed `globalStyle` emits one class; the Showcase's row padding is now live (it read an undefined `--row-inset` before).

- Round 4 (build-breaking-agent, Phase 2 range, 08-28): 7 findings, 14 kills. F1 `NavTrail` owning a rung re-registered the two ruled survivors (the Subfield's crumbs, a PathField's trail) → both keep their host's register with `font: inherit; color: inherit` on the consumer (`.subfield-crumbs`, `fields.fieldTrail`); F2 the ImagePicker's zoom strip stopped spanning its row → host-local `globalStyle(sliderRow strip)` flex 1; F3 the Trash's date lane sat 14px off the head → `.trash-row` zeroes `--row-pad-trail` and its bar sits at the lane; F4 the Scale readout wearing `detail` capped the cluster at 55% → it wears `footingLabel`; F5 `'nav-pin'` hard-coded like `overlay` was → the row's call site passes both. All in `cffdd681`. F6 — a Trash row with `onClick` is a `role=button` tab stop beside its checkbox's; the recipe ties role to `onClick` by construction and NavList rows carry the same two stops → an Open Call for Nathan (a `MenuItem` opt-out, or the row loses the pointer convenience). F7 — the Settings PathField hugs without a cap → rejected: the hug is ruled; at the default two-segment path the row is 44. Unknowns for Nathan's pass: a pin reorder by drag lands; the `[[` autocomplete measured live.

### Open Against Later Tasks
- Task 14 (from Gate 2's running pass): Hazard Window 3 is real — the Settings sliders and LayoutFrame's Scale slider measure 0 wide inside the trailing cluster (`flex: 0 0 auto`). With seat widths ruled out (`.settings-wide` gone, no `--row-trailing-width`), the Slider takes its own track width as a literal `KNOB` in its own stylesheet — a control's width is the control's — and `wide` is dropped from `MenuItem` and the index.
- Task 9: the "today" figures in its prose predate Task 0's tree — `.nav-search-row` already pads `var(--surface-inset)`, `.nav-item-main` pads `6px` (rows likely 28 already), gap 6; the +2 / −10 / −12 search-edge offsets are stale. Re-read Task 9 against the live tree at Phase 2's open.

### Deviations
- Task 18: `pickerControl.value` owning `label.control` carries the Number editor's edit-in-place caret with it (`numberEditor.css.ts` `valueCaret`), so the value reads one tone at rest and while written.
- Task 19: `URLEditor`, `CheckboxEditor`, and `FileEditor` render one `MenuIndex`; `NumberEditor` and `DateTimeEditor` render `MenuRowView` per row because a `Reveal` wraps single rows, which a section cannot express — each keeps a local row builder (`row(label, trailing)`, `pickerRow(…)`) returning the `MenuRow` literal, with `rowRhythm` as the Number rows' `className`.
- Task 16: the two tables share one reader — `Frames/switchRows.tsx` turns a `SwitchEntry[]` into `switch` rows (the `checked`/`onChange` derivation written once, not once per file); each file keeps its own table.
- Task 14: the flush rule keys on `trailing` (a control or glyph), not on the cluster — every `flushTrailing` site passed a `trailing`, and the rows carrying only `detail` (NavList's paths) were reviewed padded at Gate 2, so they keep their trail pad. The var rides the row's inline style beside the indent, no class. The five editors' `rowBox` + `configLabel` rows are `MenuItem`s with the control as `trailing` until Task 19 restructures them into indexes; `compactTitle` is the one class in a new `Properties/optionRow.css.ts`, geometry only (`nowrap`).
- Gate 2 review (orchestrator, 08-28): `overlay` leaked onto NavGallery's card pin through `NavPinButton` — the class now rides the row's call site (`2be2609b`); `overlay`'s placement wraps in `&&` so a control's own `position: relative` (the checkbox) cannot pull it out of the lead inset (`96755197`); NavView's subfield List/Gallery toggle sits on the trail's edge (`paddingX="0"`, `51be26de`); a footing's `value` reads at the footing's footnote rung like its `detail` (Nathan: "the Style row is wrong"), and the Slider owns its width (`strip` 160 KNOB) with a readout that never shrinks — Hazard Window 3 closed here, not at Task 14 (`144b2c89`). Screenshots in the session scratchpad (`p2-*.png`): NavView list, Settings General / Files & Links / Interface, Trash (rest + hover), Ideas Status editor, the dashboard tile's hosted Settings and Layout (Compact 23, TopRow 18), card trail zones. Not reachable without typing into a page: the `[[` autocomplete — Nathan's list.
- Task 12b. Today (after Task 9): the rows were already `MenuItem`s with the checkbox in the `overlay` slot; the head's name glyph kept the old row's 6px gap. Becomes: the head's cells already pad `--cell-padding-x` (rebound to `--navwindow-inset`, the value the rows' `--row-pad-x` resolves to) so its date lane sat where the rows' does once `.trash-date` lost its own right pad at Task 9 — the head keeps `padding: 0` — and its glyph takes the row's 8px gap, so both lanes align with the rows'; `trashFrame.test.tsx` mounts the frame and checks a row through its checkbox (`aria-checked` flips, `.has-checked` lands on the frame). The `checked` set, the batch arms, and the context menu's selection semantics are unchanged from Task 9's migration.
- Task 12a. Today: `navTrail.trail` was a bare flex run; `Card.tsx`, `NavList.tsx`, `TrashFrame.tsx`, `PageEmbed.tsx`, and `PageWindow.tsx` each passed `text.caption.standard`, `cards.css` tinted `.card-loc` secondary and padded it 1px with the title, `SettingsFrame`'s footing trail wore `footingLabel` (footnote), and `.card-loc-zone` padded its top 6px. Becomes: `trail` composes caption.standard, secondary, and `paddingBlock: var(--trail-pad, 0px)`; the five restatements and `footingLabel` are gone; `.card-loc` keeps only its fixed-row flex and over-scroll fade; the zone sets `--trail-pad: 6px` (KNOB) so the crumbs clear the divider above and the card's edge below alike, and Compact's `--card-foot-h` reserve is the footing's real height (column gap 4 + divider 1.5 + 6 + caption line 14 + 6).
  The uneven bottom padding, diagnosed: a locked card (`NavGallery` always, CardView's locked variant) fixes `.card-body`'s height with `overflow: hidden`, gives the cover `--thumb-share` 65%, and lets `.card-text` shrink (`min-height: 0`) while its children stay `flex: 0 0 auto` — so whenever title + rows + footing exceed the band under the cover (a gallery card at `--card-min` is ~9px short), the footing runs past the text box's 8px bottom pad and the body clips it by whatever the overflow is; wider cards have slack and keep the pad. Reflow cards never clip (`--card-body-min` plus `margin-top: auto` pins the footing on the pad). The fix at the cause is a chassis call — either the cover yields to the text (`.card.is-locked .card-thumb` shrinks, `.card-text` sized to content) or the text band takes a floor the cover pays for — and is left for Nathan as an Open Call; no padding was added.
- Task 12 (ruling 08-28): rewritten in the Today → Becomes form above. `aliasPicker.test.tsx` reached rows through `.mdpm-ac-row` and the glyph through `.mdpm-ac-icon`; the same assertions now key on `[class*="item"]` and its leading `[class*="side"] svg` (the selectors changed, the assertions did not). The pane's scroll cap is the picker's own 240 rather than four rows — the standard picker cap, per the ruling.
- Task 11. Today: `LayoutFrame`'s Style row and `SettingsFrame`'s Open In row each hand-built a `side` holding a `detail` span and a chevron; the Scale row was a raw `div` wearing `item` + `scaleRow` (`width: 100%`) with the slider as a direct child; `BlockHandleMenu`'s Scale trigger typed its value through `handleMenu.scaleValue` (footnote · secondary); `groupFrame.groupByValue` had no reader (GroupFrame's `groupByValue` is a local const). Becomes: `MenuItem` takes `value` (rendered first in the trailing cluster, before `detail` and `trailing`) on the recipe's `value` class (control.standard · label-control); the two toggle rows pass `value` + a chevron `trailing`; the Scale row is a `MenuItem` with the slider as `trailing`; the block menu's trigger keeps its button and types its value with the recipe's `value`; `scaleRow`, `scaleValue`, and `groupByValue` delete. Hazard Window 3 widens to this slider: its track has no width in the trailing cluster until Task 14.
- Task 10 (ruling 08-28). Today: `.settings-window` declared `--settings-inset: 18px` for `.settings-body` alone, the body's top pad read the theme's `--close-clearance` (`CLOSE_CLEARANCE` 30, one reader), `.settings-heading` sat on the body's edge, `.settings-empty` was a tertiary `<p>`, and `.settings-wide` seated a slider or path field in a 260px box through `SettingsRow`'s `wide`. Becomes: the body pads `--surface-inset` with a `30px` `KNOB` for the × clearance (`--close-clearance` and `CLOSE_CLEARANCE` deleted with their one reader), `.settings-heading` pads `0 var(--row-pad-x) 10px` so it lands on the rows' text edge, the empty state is `MenuCaption`, `.settings-wide` and `wide` are gone and the slider and path field sit in the trailing cluster as every switch does. Hazard Window 3: the slider's track has no width of its own until Task 14's `--row-trailing-width` (the `Slider` root is `flex: 1` in a shrink-wrapped cluster).
- Task 9 (rulings 08-28): the Trash keeps its checkboxes, and every NavList surface pads its lead with `--content-inset` — so `navList.css`'s one `.nav-list` rule sets both row tokens for NavWindow, Trash, and NavView alike (`--row-pad-x: var(--navwindow-inset)`, which NavView already zeroes), `--nav-list-lead`, `--trash-gutter`, `--trash-lead`, and NavView's negative-left pin KNOB delete, and the Trash rows migrate here (a `.nav-item` cannot outlive this task) with the checkbox in the `overlay` slot. The overlay is the recipe's: `menu-base.css.ts` `overlay` — absolute, `left: calc(var(--row-pad-lead) / 2)` (the same 12px as `--content-inset / 2` on every surface, and it follows the lead should one change), revealed on `item:hover`; the pin's own look stays `.nav-pin` in `navList.css`, the checkbox's hold-visible stays `.trash-check`. `detail`'s 55% cap rides the trailing cluster — `${side}:has(${detail})` shrinks and caps at 55% of the row — because a percentage on `detail` itself would resolve against the shrink-wrapped cluster and leave a hole beside a truncated path; `detail` and `titleText` both carry `--over-scroll-fade`. The Trash's segment bar keeps `table-segment` on the row and moves its `right` to where the date lane begins (one override); `.trash-date` drops the right pad the row now carries (the head's trailing edge aligns at Task 12b). The inert extras row is `MenuItem disabled` with its tooltip on an inner span that re-enables pointer events, since `rowDisabled`'s `pointer-events: none` inherits. `MenuItem` is a `forwardRef` with `onMouseDown` and `overlay`; the `--surface-inset` control drops 9 → 8 with the NavView pin KNOB that read it.
- Task 8: `handleMenu.titleField` composes `item` (the shell's hover replaces its own) as a stretched column, and its two lines wear `pickerMenu.leadingRow` — the same icon-then-text run at gap 6 — so `titleFieldRow` is gone rather than re-boxed; `titleFieldText` drops the control rung the Compact pane already sets. `calendarPicker.switchRow` had nothing of its own left, so `CalendarPicker.tsx` wears `rowBox` directly; `switchLabel` drops its rung the same way. `ImagePicker` is a floating frame, not a picker pane, so `sliderRow` is a Standard `rowBox` keeping its `gap: 10px` and zero inline pad (the strip and the Cancel/Choose row share `frameW` edge to edge). `viewEmbed.listPane` was width only — nothing to do.
- Task 7: `crumbRow` lost its box props to `NavTrail`'s own `trail` (already flex · `minWidth: 0`) and was a one-reader alias of `footingLabel`, so it is deleted and `SettingsFrame.tsx:192` wears `footingLabel`; its extra `gap: 4px` is gone, so the Settings footing's trail spaces as every other trail does (Task 12a's Files entry rewritten). `leadGlyph` composes `side` but keeps `marginRight: LEAD_GAP` — a field has no gap and `side`'s gap is internal, so the KNOB is the only thing holding the glyph off its label. `optionRow` keeps `justifyContent: 'space-between'` as its own rule (a composition with no rule of its own collapses to `rowBox`'s class, and `paletteButton`'s hover selector keys on it); GroupFrame's four preview chip rows wear it instead of a second chip-and-eye box, the eye in `side`. `configLabel` grows (`flex: '1 1 auto'`) so each two-child config row trails its control without a box rule; `dateTimeEditor.css.ts`'s `row` / `leading` / `label` were the same three things and fold into `rowBox` / `side` / `configLabel`. The four `Button`s wearing `topRowAction` / `rowPlus` / `optionsAdd` render `AccessoryButton`.
- Phase 1 review (orchestrator, 08-27): `rowBox` is declared in the Shell section ahead of everything that composes it, so a variant's own properties (TopRow's tone, `flushAffordance`'s gap) win by source order and no tone var is needed; the executor's `--row-gap` deleted (one writer, one reader — a literal `8px` / `4px`); `footing` composes `rowBox` and zeroes its pads through `--row-pad-y` / `--row-pad-trail`, so no row declares padding; `optionCheck`'s `marginLeft` gone (the row's gap already spaces the mark). Running pass at Gate 1 (CDP, screenshots in the session scratchpad): sidebar rows 6+16+6 = 28, page Settings → Properties frame: TopRow 18 (2+14+2), items 28, footing 20; the Ideas view's Settings menu walked whole (Configuration · Properties · Visibility · Layout · Group · Filter · Sort): root entries 28, every TopRow 18, items 28, the Group heading 21 (6+13+2), All Properties 25 (6+13+6), footings 15–20 (a flex row with no text is as tall as its controls). Rows carrying a switch or eye toggle measure 31–32 because the control is taller than the 16px line — pre-existing math, an Open Call for Nathan (a 16px control, or rows sized by their tallest child). The Compact hosts (value picker, CardAddPicker, Calendar) take their pass at Task 8.
- Task 0's tree arrived after a parallel session landed `Detail/` → `Interface/` (`44366104`); every `Detail/navView.css` / `Detail/NavView.tsx` citation in this plan now reads `Interface/`.
- Task 0: the parallel session's `Store/`, `Detail/Scope.ts`, and `Tabs/tabsModel.ts` had already landed (`af2442ab`), so typecheck was clean, not red. The tree committed was Nathan's 30-file CSS pass (comment trims, `navList.css` search row on `--surface-inset`, row pad 6). Two of its declarations had lost their semicolons — `tabBar.css:14` (`--tab-divider-w: var(--segment-width)`, circular with `.tab-divider`'s own `--segment-width`) and `DetailTitleHeader.css:40` (`line-height: var(--border-base)`, a color) — repaired to `var(--width-200)` and `1.15` so the gate passes; flagged to Nathan.
- Task 1 (amended, Nathan 08-27): the `:root` block also declares `--row-pad-y` / `--row-pad-x` as the Standard tokens and `--row-size` / `--row-line` as the body ramp, and `rowBox` reads each once — `var(--row-pad-y)`, `var(--row-pad-lead, var(--row-pad-x))`, `var(--row-pad-trail, var(--row-pad-x))`, `var(--row-size)`, `var(--row-line)` — instead of nesting the fallback per read; `menuCompact` is unchanged. Landed as `refactor(menus): the row reads its chosen pad once`.
- Task 6: a bare `<button className={actionRow}>` wears the UA button chrome and shrink-wraps, so `frames.css.ts` keeps `allHeading` — the button reset (`width: 100%`, no border, no background), `--row-pad-lead: 0px` for the flush chevron, and the `--drop-outline-beat` the old row carried so the chevron still turns on the spacer's beat. `footingLabel` composes `text.footnote.emphasized` directly (Task 4's rewrite named it; it landed here, before `actionRow` grew a box). The docs rows stay the closeout's, as recorded under Task 1.
- Task 5: `MenuBottomRow` counted 29 at this task's open (the comment sweeps of Tasks 3 and 4 took two); the FilterFrame hazard window is open from this commit.
- Task 4: `MenuTopRow` takes `className`, and CardAddPicker's flat header is `topRowFlat` (`vars: { '--row-pad-y': '0px' }`) in a recreated `Views/CardView/cardAddPicker.css.ts` — the one class that file now holds. `PickerMenu.tsx` was touched only to drop a comment naming `MenuFrameTopRow`, which brought it under the comment ruling. `MenuFrameTopRow` counted 31 at this task's open (Task 2's fold of its body onto one line took one).
- Task 3: `allPropertiesLabel` outlives this task as `style([text.footnote.semibold, { color: c.label.secondary }])` — its one reader is `PropertyFrame.tsx:141`, which Task 6 rewrites, so Task 6 deletes it. The Showcase's heading specimens are two `<div className={heading}>`s, one carrying a trailing chevron. Per the comment ruling (Nathan, 08-27), every file a task edits keeps only `KNOB` markers, `biome-ignore` lines, and at most one why; `frames.css.ts`'s section banners stay as structure.
- Task 2: a pure move was not value-neutral — `flushAffordance`'s `paddingLeft: 0` and `gap: 4px` are properties, and above `rowBox` they lose to it (the TopRow would have gone to a 6px inset and an 8px gap). They now also set `--row-pad-lead: 0px` and `--row-gap: 4px`, `rowBox` reads `gap: var(--row-gap)` with `:root` at `8px`, and `topRow` carries `topRowPad`'s padding as `--row-pad-y: var(--top-row-block, 2px)`. `actionRow` stays above `// TopRow` and the two `globalStyle`s sit after `// Trailing` because a composition reads its class at module evaluation; Task 4 moves `actionRow` into its section. The TopRow measures 20 after this task and 18 after Task 4. The diff also carries the `heading` gap `4px → 0px` edited live on the tree during the task.
- Task 1: the `--surface-inset` control is 9, not 8 — `MENU_GUTTER`'s one definition became two direct reads (`surface`, `hostedGutter`); every later control rewritten to 9. `calendarPicker.optionRow` survives as the geometry class its Files entry and F12 describe; only its `fontSize` and `color` deleted. The Docs bullets of Tasks 1 and 6 (`DesignSystemPM.md:197,221,364-366`, `RendererRefactor.md:20`) are the closeout's (Loop step 5): the executor stages no `.claude/` file but this one.
### Lessons
- A "pure reorder" of vanilla-extract classes is never value-neutral when a class composed later sets a property the base also sets — declare the base first, and let variants set properties; reach for a var only when a surface (not a row) has to override it.
- A var, export, or class with one writer and one reader is indirection: reorder, delete, or compose before minting (Nathan, 08-27).
- The executor's brief must say "add no comments" outright and name the existing prose as cuttable, or a comment-sweep lands as a separate agent pass.
### Sequenced After
- Part 2 — leading glyph size per variant; `--list-inset` for nested lists; `menu-row.tsx:40`'s indent base and `sidebarDnd.tsx:35`'s mirror. Its first step is unwinding the inline `paddingLeft` style, which beats every class and var.
- The Figma `Menu Item` follows the code: Standard = body + 6, Compact = control + 4; `Menu Heading`, `Menu Footing`, `Menu TopRow` components.
### Closeout

Ruled 08-27 (Nathan, before sleep): the plan runs to the end unattended — every phase through Gate 4, then §Landing — with nothing deferred and no cleanup postponed. The History entry is drafted in chat and not filed. Each box is ticked with its evidence beside it, in this document, as it is met.

**Per phase (1–4) — none skipped**
- [x] Phase 1: executor commits · simplifier · comment-killer · orchestrator review (diff read, three gates, Derivations + Dead Vocabulary re-run against control 9, Made False rows) · breaker round(s), every finding verified · running pass (screenshots where reachable) · Progress hashes · Found items adjudicated — `27c5171c..7226d650`
- [x] Phase 2: the same — `7226d650..cffdd681`
- [ ] Phase 3: the same
- [ ] Phase 4: the same

**Landing (§Landing 1–6)**
- [ ] Delivery Claim written below, each assertion with its evidence
- [ ] Neutral verifier: every assertion holds (fix + re-claim on any no)
- [ ] Breaker on `27c5171c..HEAD`: zero unaddressed findings, ≤3 rounds
- [ ] Nathan's running-pass list written (surfaces × what to look for), with the orchestrator's own screenshots attached where taken
- [ ] Dead Vocabulary sweep: every token 0, control `--surface-inset` ≥ 9
- [ ] Acceptance greps: `--row-inset` → 0; `--surface-inset` → non-zero
- [ ] `frames.css.ts` exports counted and all geometry / drag chrome / `ICON`

**Docs — existing mentions only; nothing new that no doc already claims**
- [ ] `DesignSystemPM.md` — Geometry rows `:196` (`MENU_GUTTER` gone) and `:197` (the four row tokens); `:221` sentence (heading = footnote.emphasized); §Menus table `:364-366` (`MenuTopRow · MenuItem · MenuSeparator · MenuCaption · MenuFooting`, `heading` / `actionRow` / `menuCompact` as classes, `MenuIndex` / `MenuRowView`); the `ICON_PX` Geometry row (Task 23)
- [ ] `Cohesion-Rulings.md:66` — autocomplete exemption removed; "declared once, chosen per pane" and the vars-not-properties rule added
- [ ] `InterfacePM.md` / `NavigationPM.md` — any line describing the Trash's checkboxes or NavList's own rows
- [ ] `RendererRefactor.md:20` — the Menu row restated as landed (points at this document); `RendererAtlas.md:86` `menu-roster` → `menu-index`
- [ ] `ContextPM.md:14` Immediate Work row and §Current Focus — a light restatement that fits the document
- [ ] `HandoffPM.md` — rewritten by `/handoff`; `:49` (`SettingsRow`) gone with it
- [ ] Lessons routed to `.claude/Guidelines`; Sequenced After written as the Part 2 brief

**Close**
- [ ] `/closeout` (verification only, no History filed) — change tree, code-only line delta, rules respected or named
- [ ] `/handoff` — ContextPM swept and gated, HandoffPM rewritten
- [ ] Every commit on explicit paths; `git status --short` shows only Nathan's own live edits, if any; Status header → "landed — <entry drafted in chat>"
- [ ] History entry drafted in chat; not filed

**Delivery Claim**
