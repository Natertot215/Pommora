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
11. The trailing slot is one place: `chevron` · `value` + toggle · `switch` · `button` · `slider` · `field`; `detail` stays a separate passive text.
12. `frames.css.ts` retains only geometry, drag-chrome, and index exports; the 12 restating exports are gone.
13. `Frames/frames.css.ts` `COLOR` and the frame-local heading/tone consts are gone.
14. The search field in NavWindow, Trash, and NavView starts on the same left edge as its rows' icons; NavView's rows sit on the content edge its search, banner title, and subfield share.
15. `NavTrail` owns its rung, tone, and vertical padding once; no consumer restates them; the Trash's checkboxes are gone and its actions are row-trailing buttons.
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
- `Navigation/{navList.css,NavList.tsx}`, `Windows/NavWindow.tsx`, `Detail/NavView.tsx`, `Settings/TrashFrame.tsx` — the hand-rolled list.
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

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `DesignSystemPM.md:221` | "menu headings → Headline / Emphasized" · "settings section headings → Headline / Emphasized" · "chips and sidebar section headers → Control / Semibold" | heading is footnote.emphasized; the sidebar clause has no code | 6 |
| `DesignSystemPM.md:364` | Menu row: `MenuHeading` in the index | `MenuHeading` deleted | 6 |
| `DesignSystemPM.md:365` | Bars row: `MenuFrameTopRow`, `MenuBottomRow` | folded / renamed | 4, 5 |
| `DesignSystemPM.md:197` | Row Inset: `--row-inset` · `ROW_INSET` · 6px | replaced by the four row tokens | 1 |
| `Cohesion-Rulings.md:66` | "The autocomplete pane's row does not adopt the shared menu-row primitive." | it does | 12 |
| `HandoffPM.md:49` | `SettingsRow.tsx` is the MenuItem adapter | deleted | 15 |
| `RendererRefactor.md:20` | the Menu recipe row, as written | this plan supersedes it; the row points here | 1 |

**Dead Vocabulary** *(the closing sweep; counts at planning time, whole renderer)*

- `MENU_GUTTER` → 0 (3) · `ROW_INSET` → 0 (4) · `--row-inset` → 0 (6) · `ROW_SIZE` → 0 (4) · `ROW_LINE` → 0 (4) · `--menu-row-size` → 0 (2) · `--menu-row-line` → 0 (2) · `ROW_GAP` → 0 (2) · `--top-row-block` → 0 (4) · `--bottom-row-block` → 0 (2)
- `MenuFrameTopRow` → 0 (32) · `MenuBottomRow` → 0 (31) · `bottomBar` → 0 (3) · `MenuHeading` → 0 (7) · `compactRow` → 0 (3) · `optionsLabel` → 0 (10) · `allPropertiesLabel` → 0 (2) · `previewHeading` → 0 (3) · `configRow` → 0 (9) · `allHeadingRow` → 0 (2) · `mdpm-ac-row` → 0 (4) · `SettingsRow` → 0 (17) · `ValueRow` → 0 (15) · `FootingPick` → 0 (3)
- `nav-item` → 0 (36 now, across seven files; `NavTrail` uses `nav-trail-*` and is untouched). `flushTrailing` → 0 (26). `settings-wide` → 0 (3). `trash-check` → 0. `--trash-lead` → 0. `--nav-list-lead` → 0 (the column's `--row-pad-lead` replaces it).
- Control: `--surface-inset` → 9. Zero here means the sweep never ran.

**Hazard Window:** Task 5 deletes `bottomBar`'s `margin-top: auto`; FilterFrame's locked branch is un-pinned from that commit until Task 20 lands its footer slot. No running-thing pass on FilterFrame between them; Gate 1's running pass records the deferral.

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

**Survivors:** `flushAffordance` moves to `// Shell` beside `rowShell`, so `topRow` and `footing` compose an already-declared class. Nothing else depends on order: every variant sets the vars `rowBox` reads (Forced By), so `// TopRow` sitting above `// Item` cannot let `item`'s padding win. Verify with the built CSS: a TopRow measures 18 (caption line 14 + 2·2) — its ramp is live for the first time; today's 20 was the body line winning.

**Steps:**
- [ ] Move declarations into sections; no value changes. `npx biome check` → clean.
- [ ] Gates green; `git diff --stat` shows only the two files.
- [ ] Commit `refactor(menus): the stylesheet reads top to bottom as a menu does`.

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
- [ ] Rewrite `heading`; delete `MenuHeading` and its export; fix the Showcase leaf.
- [ ] Repoint the nine sites; delete the five classes and `COLOR`.
- [ ] Gates green; `GroupFrame.test.tsx` `'Options'` text assertions pass.
- [ ] Commit `refactor(menus): one heading`.

#### Task 4: TopRow defines itself; one `MenuTopRow`

**Requirement:** 3, 7

**Why:** `MenuTopRow` has one caller — `MenuFrameTopRow` — and the split is a leftover of a bare form nothing uses. TopRow owns its rung, tone, padding, and its flush separator, and stops composing `actionRow`.

**Files:**
- Modify: `menu-base.css.ts` — `topRow = style([flushAffordance, { vars: { '--row-pad-y': '2px', '--row-size': font.scale.caption.size, '--row-line': font.scale.caption.line }, fontWeight: font.weight.emphasized, color: c.label.secondary }])` — vars, not properties, so it holds at 18 wherever it sits (absorbs `topRowPad`; the `--top-row-block` knob goes — `CardAddPicker.tsx:128`'s `0px` override becomes `vars: { '--row-pad-y': 0 }` passed as `className` on its `MenuTopRow` — the row element, never the pane, since every row reads `--row-pad-y`; `paneSeparator`'s margin bakes to `2px`); `topBarLeadingLabel = style([text.footnote.emphasized, { color: c.label.secondary }])`, `topBarTrailingLabel` likewise at tertiary — no `actionRow` composition.
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
- Modify: `menu-base.css.ts` — `actionRow = style([rowBox, { vars: { '--row-size': font.scale.footnote.size, '--row-line': font.scale.footnote.line }, fontWeight: font.weight.emphasized, color: c.label.secondary }])` — `rowBox`, not `item`, so it carries no hover; vars, so it renders footnote.
- Modify: `Properties/PropertyFrame.tsx:138-141` — `<button className={actionRow}>` with its chevron; `frames.css.ts` deletes `allHeadingRow` and the `globalStyle` at `:158`; `allRow` stays (it is the unassigned rows' secondary tone, not a box) and its own `color` now suffices; `menu-surface.css.ts:34` global deleted.
- Docs: `DesignSystemPM.md:221` sentence rewritten to the kinds; `:364-366` table rows to `MenuTopRow · MenuItem · MenuSeparator · MenuCaption · MenuFooting`, heading and actionRow as classes.

**Derivation**
- `grep -rF "allHeadingRow" src` → 2 → 0. `grep -rF "titleText" src/renderer/src/DesignSystem/Menus/menu-surface.css.ts` → 1 → 0.
- Control: `grep -rF "actionRow" src` → ≥ 2.

**Steps:**
- [ ] Rewrite; `propertyFrame.test.tsx` `rowFor('All Properties')` passes (label stays a leaf span inside a `role=button`).
- [ ] Gates green; docs; commit `refactor(menus): the action row`.

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
- [ ] Per file, delete the box class and compose `item`; run that file's tests.
- [ ] Gates green; `FilterFrame.test.tsx:376` `[class*="ruleRow"]` passes (the name survives as the gap override).
- [ ] Commit `refactor(frames): the frames' rows are the menu's`.

#### Task 8: Every `PickerMenu` host is Compact

**Requirement:** 8

**Why:** The pane already wears the ramp for everyone inside; giving it the padding pair too is the whole ruling. The hosts that were hybrids (hosted SettingsFrame, BlockHandleMenu, ViewEmbedBlock's list, LayoutFrame's ⋯ menu) become Compact by inheritance — no per-host class.

**Files:** `Blocks/handleMenu.css.ts` (`titleFieldRow` box, host `padding: '3px 6px'` → `rowBox`), `Blocks/viewEmbed.css.ts` `listPane` (no row box), `CalendarPicker` `switchRow` (28 floor → `rowBox`), `ImagePicker` `sliderRow` (→ `rowBox`).

**Derivation**
- `grep -n "minHeight" src/renderer/src/DesignSystem/Components/Pickers/CalendarPicker/calendarPicker.css.ts` → 1 (`:244`) → 0. (`pageWindow.css`'s `.page-window-insp-row` is a filled field box inside `.page-window-insp-rows`, not a menu row — it stays.)
- Control: `grep -n "minHeight" src/renderer/src/DesignSystem/Components/Fields/fields.css.ts` → 1 (`:33`, the field's own floor, survives).

**Steps:**
- [ ] Delete each row box; gates; running pass on BlockHandleMenu root + style + scale panes, the view-embed list, a page window's inspector.
- [ ] Commit `refactor(pickers): every picker host is Compact`.

#### Task 9: `NavList` is a menu

**Requirement:** 9

**Why:** `navList.css` re-implements `rowShell`, `item`, and `rowDisabled` at radius 6 / gap 6 / no selected state, and three surfaces (NavWindow, NavView, Trash) borrow it. As `MenuItem` rows on the menu column they get the Standard box, hover, selection, focus ring, and disabled state for free, and the file empties.

**Files:**
- Modify first: `DesignSystem/Menus/menu-row.tsx` — `MenuItem` becomes a `forwardRef<HTMLDivElement>`, gains `onMouseDown?` and `overlay?: ReactNode` (rendered as the row's last child, positioned by the caller; `rowBox`'s `position: relative` anchors it). Three additions, no behavior change for existing callers.
- Modify: `menu-base.css.ts` `detail` — `flex: '0 1 auto', minWidth: 0, maxWidth: '55%'` (today's `.nav-item-path` cap; a passive text never squeezes the title) and `titleText` gains `--over-scroll-fade: var(--fade-base)`.
- Modify: `Navigation/NavList.tsx` — rows render `<MenuItem ref={drag?.ref} leading={icon} detail={<NavTrail …/>} overlay={<NavPinButton …/>} selected disabled className={dragging && rowDragging} onClick>`; the path is a trailing same-line `detail` (today's `.nav-item-path`: `margin-left: auto; max-width: 55%`), never a `subLabel`; the search header stays its own element.
- Modify: `Navigation/navList.css` — delete `.nav-item`, `.nav-item-main`, `.nav-item-inert`, `.nav-item-title`, `.nav-item-path`, `.nav-item.is-dragging`; `.nav-list` (the column) sets `--row-pad-x: var(--navwindow-inset)` and, where a lead affordance lives, `--row-pad-lead` (NavWindow `--nav-list-lead` 20, Trash `--trash-lead` 34) so each surface's rows keep its gutter (NavWindow 20/12, Trash 34/14, NavView 0/0) and the divider, magnifier, and row edges stay aligned; `.nav-item-pin`'s absolute placement moves to the `overlay` element's own class.
- Modify the other four files with `nav-item` rules: `Windows/navWindow.css:119-123` (`--nav-list-lead` pad → the column's `--row-pad-x`; pin offset → the overlay class), `Settings/trashFrame.css:83,102,115` (the sibling separator, the hover checkbox reveal, the historical dimming — re-keyed on the `MenuItem` row via a `trash-row` className), `Detail/navView.css:63` (pin offset), `Tabs/tabStrip.css` (grep hit; confirm and re-key).
- Modify: `Settings/trashFrame.css:43` — `--trash-lead` is the Trash column's `--row-pad-x`.
- Modify: `Windows/NavWindow.tsx`, `Detail/NavView.tsx`, `Settings/TrashFrame.tsx` — no size class (Standard).

**Interfaces**
- `NavList` rows keep their `data-*` hooks and aria; `NavTrail` stays an Element and rides `detail`. `MenuItem`'s `ref`, `onMouseDown`, and `overlay` are assumed by Task 12.

**Derivation**
- `grep -rF "nav-item" src` → 36 across `navList.css`, `NavList.tsx`, `navWindow.css`, `trashFrame.css`, `TrashFrame.tsx`, `navView.css`, `tabStrip.css` → 0. Control: `grep -rF "nav-list" src` → ≥ 3.

**Failure half:** an empty result list → the column's padding only; a row with no path → no `detail`, still 28; a disabled (inert) row → `rowDisabled`, unhittable, with its `title` tooltip on an inner span so it still fires; a drag → `registerRow` fires through the forwarded ref (verify by reordering a pin).

**Steps:**
- [ ] Rewrite `NavList` rows; delete the classes; gates; `Navigation` tests pass.
- [ ] `.nav-search-row` pads `var(--surface-inset)` block and `var(--row-pad-lead, var(--row-pad-x))` inline, on the same column that sets the rows' tokens, so the field's text origin is the rows' icon edge on every surface (today +2 / −10 / −12); its dead `gap` and `color` go (no magnifier is rendered — `SearchField` is a bare input).
- [ ] `.nav-view` sets `--row-pad-x: 0` and its column pads `calc(var(--sidebar-clearance) + var(--content-edge))` — the one edge `.nav-view-head`, `.banner-title`, and `.subfield` already share — so NavView's rows stop sitting 12px inboard of the footer's trail; `navView.css:57-60`'s `--content-inset − --surface-lane` re-narrowing deletes.
- [ ] Running pass: NavWindow list, NavView, Trash — rows 28, hover wash, selected pill, the pin in its gutter, the search text and row icons on one left edge, NavView rows on the subfield's edge, a pin reorder by drag lands.
- [ ] Commit `refactor(navigation): NavList is a menu`.

#### Task 10: Settings rows and the Settings window

**Requirement:** 1

**Why:** `SettingsRow` is already a `MenuItem`; the window's `.settings-wide` seat and `.settings-empty` are the last Settings-local row chrome. Folds ahead of the index (Task 15) so that task moves data, not styling.

**Files:** `Settings/settingsWindow.css` — `.settings-empty` → `caption`; the body's own padding and the rows' inset stack today (a double inset off the rail) — `.settings-body` pads `var(--surface-inset)` and nothing else, rows read the row tokens, `.settings-heading` and the section headings land on the rows' text edge; `.settings-wide`'s fixed 260px seat deletes — a trailing field or slider sits at the trailing edge like every switch (Task 14's `wide` gives it `--row-trailing-width` for the slider's track; a `PathField` hugs its content), so the asset-directory field stops sitting stranded mid-row; `Settings/SettingsWindow.tsx` `RailTab` unchanged.

**Steps:**
- [ ] Repoint; gates; commit `refactor(settings): the window's rows are the menu's`.

#### Task 11: LayoutFrame's Scale row and the three value+toggle rows

**Requirement:** 1, 11

**Why:** The Scale row is a raw `div` wearing `item` and hand-building `side`/`footingSymbol`/`footingLabel`; the three `chevrons-up-down` rows each re-wrap `side` + `detail`. They are the trailing slot's first consumers and prove its shape before the index generalizes it.

**Files:** `Frames/LayoutFrame.tsx:157-222`, `Frames/SettingsFrame.tsx:148-155`, `Blocks/BlockHandleMenu.tsx:288-297`; `Frames/layoutFrame.css.ts` `scaleRow` deleted.

**Interfaces**
- Produces on `MenuItem`: `value?: ReactNode` (control.standard · label-control, rendered before `trailing` inside the trailing `side`); `detail` stays passive footnote.emphasized and renders in the same cluster after `value`.
- Assumed by: Task 14 (the index's `value` trailing).

**Steps:**
- [ ] Add `value` to `MenuItem` + `menu-base.css.ts` `// Trailing` (`value = style([text.control.standard, { color: c.label.control }])`); migrate the four sites; delete `scaleRow`, `groupByValue`.
- [ ] Gates; running pass on LayoutFrame's footing and Settings' format row.
- [ ] Commit `refactor(menus): value rides the trailing slot`.

#### Task 12: Autocomplete rows are Compact menu rows

**Requirement:** 10

**Why:** The pane is a `PickerMenu` (`bareSurface`) with a fully hand-rolled 28px row, `--fill-quaternary` selection, and no hover. As `item` inside a Compact pane it is 23, hovers, selects with `itemSelected`, and the `.mdpm-ac` max-height stops hardcoding `28px`.

**Files:** `MarkdownPM/AutocompletePane.tsx` (rows → `MenuItem` with `selected`, `onMouseDown={pick}` carrying the `preventDefault` and the `.mdpm-ac-forget` guard — never `onClick`, which would take focus and close the pane; the pane's `font-size` override deleted, so the text drops 15 → 12), `MarkdownPM/Styles.css` — `.mdpm-ac` keeps its pane box (width floor/cap, `overflow-y`, `padding: 4px`) and only its `max-height` line changes to `calc(var(--ac-rows) * 23px + 8px)`; `.mdpm-ac-row*` deleted, `.claude/Guidelines/Cohesion-Rulings.md:66` deleted.

**Derivation**
- `grep -rF "mdpm-ac-row" src` → 4 → 0. Control: `grep -rF "mdpm-ac" src` → ≥ 2.

**Failure half:** zero suggestions → the pane doesn't open (existing behavior, unchanged); the active suggestion → `itemSelected`; keyboard navigation → the `selected` prop moves, no focus change.

**Steps:**
- [ ] Rewrite; `MarkdownPM` autocomplete tests pass; running pass on `[[` in a page.
- [ ] Commit `refactor(markdown): the autocomplete rows are the menu's`.

#### Task 12a: `NavTrail` owns its look

**Requirement:** 15

**Why:** `NavTrail` supplies no rung, tone, or padding; nine consumers inject all three and four of them retype the same caption/secondary pair. The trail is one thing wherever it appears.

**Files:**
- Modify: `DesignSystem/Elements/NavTrail/navTrail.css.ts` — `trail` composes `text.caption.standard`, `color: c.label.secondary`, `paddingBlock: 'var(--trail-pad, 0px)'`; `emphasized`/`current` keep their tones.
- Modify consumers to drop the restated pair: `Navigation/NavList.tsx` (`nav-item-path` → the `detail` slot, Task 9), `Settings/TrashFrame.tsx` (keeps `.is-historical` italic/tertiary as a state class on the trail), `Cards/Card.tsx` `card-loc` (`cards.css:170-172` deleted; `.card-loc-zone`'s `padding-top: 6px` KNOB becomes `--trail-pad` so the zone pads top and bottom alike — **first** diagnose why some cards show bottom padding under the trail and some none: read `.card-loc-zone`'s `margin-top: auto` against `.card-text`'s `8px 8px` and the reserved `--card-foot-h` in `CardsView.css:29-33` per card variant (gallery / cards view / a card with no location), name the cause in the Log, and fix it at that cause rather than by padding), `Embeds/PageEmbed.tsx` `pgembed-crumbs`, `Windows/PageWindow.tsx` `page-window-crumbs`, `Frames/SettingsFrame.tsx` `crumbRow` (footnote → the trail's caption; a footing crumb reads as a trail).
- Survivors: `Subfield` (`subline.emphasized` at `--label-control`, fixed 24px band — a different register by design), `PathField` (inherits its field's body rung).

**Derivation:** `grep -rF "text.caption.standard" src | grep -i "trail\|crumb\|loc\|path"` → 4 at planning → 0. Control: `grep -rF "NavTrail" src` → ≥ 9.

**Steps:**
- [ ] Move the pair into `trail`; delete the four restatements; gates; running pass on a card's location zone, a nav row, a page embed's crumbs, the page window's tab crumbs.
- [ ] Commit `refactor(navtrail): the trail owns its look`.

#### Task 12b: The Trash is a menu

**Requirement:** 15

**Why:** The Trash's rows are `.nav-item`s with a checkbox that rewrites the pin's affordance (`trashFrame.css:92` says so) and a selection set only a native right-click can read. On the recipe, a row's actions are trailing `button`s, the head is the table's, and the checkbox and its 20px gutter delete.

**Files:**
- Modify: `Settings/TrashFrame.tsx` — rows through `MenuRowView` (`item`: lead icon, title, `detail` = the trail, a `trash-date` trailing text) with a Restore glyph in the `overlay` slot that works exactly as `NavList`'s pin does — absolute in the lead gutter, revealed on hover, one click restores that row; the `checked` set, `.has-checked`, and the batch arms go; the context menu keeps Restore To and Delete Forever for the row under the pointer.
- Modify: `Settings/trashFrame.css` — `.trash-check`, `.has-checked` deleted; the column keeps a lead gutter for the overlay through `--row-pad-lead` (as NavWindow does for its pin) and `--row-pad-x` = `--navwindow-inset` 14; the sibling separator re-keys on the row class; `.trash-head` keeps its two lanes and the shared 160px date lane, its name column padding reading the same `--row-pad-x`.
- Test: `Settings/trashFrame.test.ts` (model) unchanged; add a render test that a row's Restore button calls `restore` with that row.

**Failure half:** an empty trash → the caption line; a historical row → the trail italic/tertiary, its overlay still live; Restore on a row that vanished underneath (an external `.trash` edit) → the existing refresh prunes it and the handler no-ops on a missing bundle.

**Steps:**
- [ ] Migrate; gates; running pass: rows 28 with the trail and date, buttons appear on hover and stay reachable, the head's lanes align with the rows', a batch action from the head.
- [ ] Commit `refactor(trash): the Trash is a menu`.

#### Gate 2 — every surface composes the recipe
- [ ] The Loop, steps 3–5. `grep -rn "minHeight: '2[0-9]px'\|min-height: 2[0-9]px" src` → only `fields.css.ts` and the non-row hits listed in the Log. Running surface: every surface this phase touched, the search edge on all three lists, the Trash overlay, a card's trail zone.

---

### Phase 3 — The Index

#### Task 13: `menu-index.tsx`

**Requirement:** 11

**Why:** The trailing kinds are named in seven places today; naming them once as a `Trailing` union and one `MenuRowView` renderer is what lets a presentational frame be a list of sections. `SettingsWindow`'s `Row` union is a settings *schema* (each arm carries a store key, each control subscribes itself) — it keeps its union and its per-row subscriptions, and its `RowControl` renders through `MenuRowView`; the index owns rendering, never state.

**Files:**
- Create: `DesignSystem/Menus/menu-index.tsx` — `type Trailing = { kind: 'chevron' } | { kind: 'value'; value: ReactNode; onToggle: () => void } | { kind: 'switch'; checked; onChange; ariaLabel } | { kind: 'button'; icon; onClick; ariaLabel } | { kind: 'slider'; …Slider props } | { kind: 'field'; children: ReactNode }`; `type MenuRow = { kind: 'heading'; label; caps? } | { kind: 'separator' } | { kind: 'caption'; text } | { kind: 'action'; label; trailing?; onClick } | { kind: 'item'; icon?: ReactNode; label; caption?; trailing?; wide?; selected?; disabled?; onSelect? }` (`icon` is a node, so a chip or a wrapped glyph rides it); `type MenuSection = { title?; caps?; rows: MenuRow[] }`; `MenuRowView({ row })` renders one row; `MenuIndex({ sections })` maps sections → rows → `MenuRowView`. `Trailing` also carries `{ kind: 'picker'; …PickerControl props }` and `{ kind: 'color'; …ColorSwatch props }` so Settings' picker and color rows are not laundered through `field`.
- Test: `DesignSystem/Menus/menu-index.test.tsx` — each kind renders its element; a `switch` trailing keeps its `aria-label` on the button; a `heading` with `caps` wears `headingCaps`; an empty section renders nothing.

**Interfaces**
- Produces: the types above, `MenuRowView`, and `MenuIndex`. Assumed by: Tasks 15–19.

**Failure half:** zero sections → an empty fragment; a section with `title` and zero rows → the heading alone (a design choice: shown, so a data bug is visible rather than silent); a `trailing` of an unknown kind → a compile error (closed union).

**Steps:**
- [ ] Write the failing tests; implement; gates; commit `feat(menus): the index`.

#### Task 14: The trailing slot inside `MenuItem`

**Requirement:** 11

**Why:** `detail` and `trailing` share one span today; `value` joined in Task 11. This makes the slot explicit — leading · title · [value] · [detail] · [trailing] — so the index's `Trailing` maps to markup once. The trailing cluster is **flush by design**: 23 of the 58 `MenuItem` sites pass `flushTrailing` today and none pass the opposite, so `item`'s right padding applies to the title, the cluster sits at the gutter edge, and `flushTrailing` deletes (the index then needs no `className`).

**Files:** `menu-row.tsx` `MenuItem` (gains `wide?: boolean` — the trailing seat takes `--row-trailing-width`, the one KNOB `.settings-wide` was); `menu-base.css.ts` `// Trailing` (`side` stays the cluster class; `value`, `detail`, `accessoryButton` its members; `flushTrailing` deleted, its 23 sites cleaned); `frames.css.ts` `compactTitle`, `configLabel` → deleted (`configLabel` is the item's own title at control density — Compact handles it; `compactTitle` is the chip's name and moves to `OptionRow`'s own stylesheet as geometry).

**Steps:**
- [ ] Rewrite the markup; `GroupFrame.test.tsx` aria lookups pass; gates; commit `refactor(menus): the trailing slot`.

#### Task 15: SettingsWindow renders through the index

**Requirement:** 11

**Files:** `Settings/SettingsWindow.tsx` (`Row` union and `FRAMES` unchanged; each `RowControl` arm keeps its subscription and returns `<MenuRowView row={{ kind: 'item', label, caption: hint, trailing: {…} }} />`), `Settings/SettingsRow.tsx` deleted, `HandoffPM.md:49` line removed.

**Derivation:** `grep -rF "SettingsRow" src` → 17 → 0. Control: `grep -rF "MenuIndex" src` → ≥ 2.

**Steps:**
- [ ] Migrate; running pass on every Settings frame; commit `refactor(settings): the window is an index`.

#### Task 16: LayoutToggles + CardsOptions are one table

**Requirement:** 11

**Files:** `Frames/LayoutToggles.tsx`, `Frames/CardsOptions.tsx` → one `{ icon, label, key, invert?, defaultOn? }[]` each rendered by `MenuIndex` with `switch` trailings — `defaultOn` because `hide_column_icons` reads `?? true` and `set_cards` reads `?? true` while the other five read `?? false`; `frames.css.ts` `toggleRow` deleted.

**Negative control:** on a view with none of the seven keys set, Column Icons and Set Cards show ON, the other five OFF — and flipping `defaultOn` on either shows the opposite.

**Steps:**
- [ ] Migrate; gates; commit `refactor(frames): the toggles are a table`.

#### Task 17: SettingsFrame, LayoutFrame's `FRAME_ROWS`, SortFrame, HiddenFrame

**Requirement:** 11

**Files:** `Frames/SettingsFrame.tsx` (`ENTRIES` → `MenuIndex` `item` rows with `chevron`), `Frames/LayoutFrame.tsx` (`FRAME_ROWS` likewise), `Frames/SortFrame.tsx` and `Frames/HiddenFrame.tsx` (rows render through `MenuRowView` **inside** their existing `RowShell` and `useFrameRegions` region divs — the drag structure stays; `MenuIndex` is for frames without one; `frozen()` → `disabled`; `hiddenRow` and `gp.subRow` ride `className` on `MenuRowView`, which accepts one for exactly these state classes).

**Steps:**
- [ ] Migrate one file per commit; `SortFrame.test.tsx`, `HiddenFrame` model tests pass.

#### Task 18: GroupFrame; `ValueRow` and `FootingPick` fold

**Requirement:** 11

**Files:** `Frames/GroupFrame.tsx`, `Properties/ValueRow.tsx` (deleted), `Frames/groupFrame.css.ts` (`pickerTone` global deleted; its `label.control` tone moves onto `pickerControl.value` itself, so a picker's value reads at full strength wherever it sits).

**Derivation:** `grep -rF "ValueRow" src` → 15 → 0; `grep -rF "FootingPick" src` → 3 → 0.

**Steps:**
- [ ] Migrate; `GroupFrame.test.tsx` passes; running pass; commit.

#### Task 19: The property editors

**Requirement:** 11

**Files:** `Properties/Editors/{URLEditor,CheckboxEditor,FileEditor,NumberEditor,DateTimeEditor}.tsx` → indexes (`switch`, `value`, `field`, `button` trailings); `numberEditor.css.ts` keeps `row`'s `marginTop` as `rowRhythm`.

**Steps:**
- [ ] Migrate; editor tests pass; commit.

#### Task 20: FilterFrame — the footer slot, the shell, the caption

**Requirement:** 6, 11 — closes the hazard window.

**Why:** The one frame with no `MenuScrollFrame` and the one pane the auto-margin held up. Its rule rows are a builder, not a list, so they keep their logic on `item`'s shell; everything around them is recipe.

**Files:** `Frames/FilterFrame.tsx` (wrap in `MenuScrollFrame` with `footer={<MenuFooting …/>}`; `lockedCaption` → `caption`; `addRow` → `button`), `Frames/filterFrame.css.ts` (`frame` keeps `growToContent` + `minHeight: 245`; `body`'s `flex: '1 0 auto'` deleted; `gp.middle`'s nested scroll region removed from the rows branch), `menu-row.tsx` `MenuScrollFrame` gains `className`.

**Negative control:** keep the floor; in the locked branch the footer sits flush at the pane's bottom edge with the slot, and rises to the content with `footer=` removed (the slot pins; the floor only makes room). `MenuTopRow` rides the `header` slot. `lockedCaption` → `caption` changes the locked branch's text from footnote-left to body-centered — the kind's look, ruled.

**Steps:**
- [ ] Migrate; `FilterFrame.test.tsx` passes; running pass on both branches (locked + rows), footer flush at the bottom in each; the pane single-scrolls.
- [ ] Commit `refactor(filter): the footer rides the slot`.

#### Gate 3 — the recipe is the only row writer
- [ ] The Loop, steps 3–5. Dead Vocabulary sweep: every token → 0, control `--surface-inset` → 9. `frames.css.ts` exports 40 → 28, all geometry, drag chrome, or `ICON`. Running surface: every frame, both FilterFrame branches with the footer flush. Docs: `DesignSystemPM.md` §Menus to the kinds and the index; `Cohesion-Rulings.md` gains "the menu row's box is declared once; a surface picks Standard or Compact on its pane".

---

### Phase 4 — The Edges Found Alongside

#### Task 21: The content edge is one token

**Requirement:** 14

**Why:** `calc(var(--sidebar-clearance) + var(--content-edge))` is written out four times — `subfield.css:11`, `subfield.css:99` (the footnotes toggle), `Banner.css:33`, `navView.css:21` — and Task 9 adds a fifth on the NavView column. It is one edge: where a page's chrome starts. Named once, the five read it.

**Files:** `styles.css` `.shell` — `--content-start: calc(var(--sidebar-clearance) + var(--content-edge))` and `--content-start-right` for the inspector side, declared beside the clearances; the five sites read them.

**Derivation:** `grep -rF "var(--sidebar-clearance) + var(--content-edge)" src` → 4 (+1 after Task 9) → 0. Control: `grep -rF -- "--sidebar-clearance" src` → ≥ 3.

**Steps:**
- [ ] Mint; repoint; gates; running pass on the banner title, subfield, footnotes toggle, NavView head — nothing moves.
- [ ] Commit `refactor(shell): the content edge is one token`.

#### Task 22: IconPicker's cell wears the shell

**Requirement:** 1

**Why:** `iconPicker.css.ts:79-85` hand-rolls `rowShell`'s radius 8 + `state.hover` on a 34px cell. It is not a row, so it composes `rowShell` alone — the wash and radius from one place, its own size kept.

**Files:** `DesignSystem/Components/Pickers/IconPicker/iconPicker.css.ts` `cell` → `style([rowShell, { width/height, …selected }])`.

**Steps:**
- [ ] Compose; gates; running pass on the icon picker — hover and selection unchanged.
- [ ] Commit `refactor(iconpicker): the cell wears the shell`.

#### Task 23: The icon ladder is named as the type ramp is

**Requirement:** none of the numbered ones — a naming debt the Figma mirror surfaced.

**Why:** `ICON_PX` in `Tokens/size.css.ts` says `largeTitle / title1 / title2 / title3` while the type ramp says Title Large / Medium / Small. Two ladders, one vocabulary; the Figma `Icons` collection mirrored the old names as-is.

**Files:** `Tokens/size.css.ts` `ICON_PX` keys → `titleLarge`, `titleMedium`, `titleSmall` (a rung with no reader deletes — count first); every `size="title3"` / `'title1'` / `.icon.title2` read; the Figma `Icons` variables renamed to match; `DesignSystemPM.md` Geometry row.

**Derivation:** `grep -rF "title3" src`, `grep -rF "title1" src`, `grep -rF "title2" src`, `grep -rF "largeTitle" src` — counts at execution, each → 0. Control: `grep -rF "ICON_PX" src` → ≥ 3.

**Steps:**
- [ ] Count each rung's readers; a rung with none deletes, said so in the Log.
- [ ] Rename; gates; commit `refactor(tokens): the icon ladder is named as the type ramp is`.

#### Gate 4 — the edges
- [ ] The Loop, steps 3–5. Running surface: banner, subfield, NavView head, the icon picker.

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

**Standards that hold at every step:** exit codes read directly, never through a pipe without `pipefail`; no "green" without the summary line quoted; no `DONE_WITH_CONCERNS` — a concern is a task; comments at one load-bearing why per file, every `KNOB` intact; explicit paths staged, never a directory; no two writers on the tree at once — the executor and the simplifier run in sequence, never in parallel.

---

## Implementation Log

### Progress
- [x] **Phase 0** — The Tree
  - [x] Task 0 — commit the working tree · `27c5171c`
- [ ] **Phase 1** — The Recipe · base `27c5171c`
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
  - [ ] Task 12a — NavTrail owns its look
  - [ ] Task 12b — the Trash is a menu
- [ ] **Phase 3** — The Index
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
- 08-27 (Nathan): the Trash's action works as the NavList pin does — an overlay glyph in the lead gutter; the checkboxes go. The trail pads through `--trail-pad`; the cards' uneven bottom padding is a defect to diagnose, not pad over.
- 08-27 (Nathan): token names `--row-height-*` / `--row-width-*` are padding tokens, named so because a row's height is never declared. Compact pad 4. Pane wins inside a picker. NavWindow, NavView, Trash Standard. Autocomplete Compact. Heading on the row's horizontal inset. TopRow defines itself. `detail` = passive text, `value` = a control's value, both kept. Settings section titles keep uppercase. Leading-glyph sizes and nested-list insets are Part 2.

### Review
- Round 1 (build-breaking-agent, 08-27): 12 findings, all verified against the code and folded — variants set vars not properties (F1, F2); `MenuItem` gains `forwardRef`, `onMouseDown`, `overlay` before NavList (F3, F8); the nav path is `detail` (F4); the four other `nav-item` files and the per-surface `--row-pad-x` (F5); `rowBox` split from `item` (F6); `heading` declares `margin: 0` and the 6/2 vertical pad (F7, F9); `allRow` stays (F9); the index renders, Settings keeps its subscriptions (F10); Task 20's control inverted (F11); Calendar's option alignment kept (F12). Cold-read fixes: the `--surface-inset` sentence, Task 8's derivation, Gate 3's export count, `nav-item`'s survivors, Task 3's StatusEditor caret, the Task 3/6 overlap on `PropertyFrame.tsx:141`.

- Round 2 (build-breaking-agent, 08-27): 15 findings, all verified and folded — the TopRow's real height is 18 once its ramp is live (F1); `rowBox` takes `--row-pad-lead`/`--row-pad-trail` over `--row-pad-x` for the two asymmetric nav surfaces (F2); CardAddPicker's override rides the TopRow element (F3); the trailing cluster is flush by design and `flushTrailing` dies (F4); `wide` on the item (F5); `defaultOn` on the toggle tables (F6); Sort/Hidden render `MenuRowView` inside their drag shells (F7); `detail` caps at 55% (F8); WindowInspector's field box is not a row and leaves Task 8 (F9); `header` stays geometry (F10); `pickerControl.value` owns its tone (F11); `heading` reads `--row-pad-x` (F12); `.mdpm-ac` keeps its box (F13); counts 28 / 12 / calendar-only (F14); the inert row's tooltip on an inner span (F15). Latent: `rowDragging` declared twice — moves to the recipe in Task 1. Unknown carried into Task 1's steps: the composed `pane` under `:has()`.

### Open Against Later Tasks
- Task 9: the "today" figures in its prose predate Task 0's tree — `.nav-search-row` already pads `var(--surface-inset)`, `.nav-item-main` pads `6px` (rows likely 28 already), gap 6; the +2 / −10 / −12 search-edge offsets are stale. Re-read Task 9 against the live tree at Phase 2's open.

### Deviations
- Task 0: the parallel session's `Store/`, `Detail/Scope.ts`, and `Tabs/tabsModel.ts` had already landed (`af2442ab`), so typecheck was clean, not red. The tree committed was Nathan's 30-file CSS pass (comment trims, `navList.css` search row on `--surface-inset`, row pad 6). Two of its declarations had lost their semicolons — `tabBar.css:14` (`--tab-divider-w: var(--segment-width)`, circular with `.tab-divider`'s own `--segment-width`) and `DetailTitleHeader.css:40` (`line-height: var(--border-base)`, a color) — repaired to `var(--width-200)` and `1.15` so the gate passes; flagged to Nathan.
- Task 1: the `--surface-inset` control is 9, not 8 — `MENU_GUTTER`'s one definition became two direct reads (`surface`, `hostedGutter`); every later control rewritten to 9. `calendarPicker.optionRow` survives as the geometry class its Files entry and F12 describe; only its `fontSize` and `color` deleted. The Docs bullets of Tasks 1 and 6 (`DesignSystemPM.md:197,221,364-366`, `RendererRefactor.md:20`) are the closeout's (Loop step 5): the executor stages no `.claude/` file but this one.
### Lessons
### Sequenced After
- Part 2 — leading glyph size per variant; `--list-inset` for nested lists; `menu-row.tsx:40`'s indent base and `sidebarDnd.tsx:35`'s mirror. Its first step is unwinding the inline `paddingLeft` style, which beats every class and var.
- The Figma `Menu Item` follows the code: Standard = body + 6, Compact = control + 4; `Menu Heading`, `Menu Footing`, `Menu TopRow` components.
### Closeout
