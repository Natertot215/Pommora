## Handoff — Pommora

> **User Prompt:** *"The Renderer Refactoring has been started, borders, re-orgs, and other touchups have been done. The V2-Vocab is queued as immediate, and the Immediate Work is the remainder of the refactoring … The clear goal of next session should largely be to recap, come together, and actually plan this out rather than just getting off track and changing course — this is a multi-day effort that's been going on for a day now, and is unorganized; we need to actually plan out everything that's been done, what we're gonna do, and how we're gonna manage continuity throughout."*

#### Current Focus

**Session ID:** 14cb88d4-ef66-4a6d-a7c7-18bd37efbbaa
**Dates:** 08-25-2026 → 08-28-2026
**Model:** Opus 5 (1M context) → Fable 5

**The Renderer Refactor's Menu Recipe — planned, ratified, and landed.** The session's first half built the inset family (`--app-inset` 6 · `--surface-inset` 10 · `--row-inset` 6 · `--content-inset` 24 · `--content-edge` 12 · `--rail-inset` · `--surface-lane` · the clearances) and seeded the Figma PommoraV2 file. Its second half wrote [[MenuRecipe]] through `/writing-plans-v2` — a 23-task plan in four phases with an execution loop (one executor per phase, then `code-simplifier`, then `comment-killer-agent`, then the orchestrator's own review with screenshots, then `build-breaking-agent`) and a landing procedure — and, once Nathan said "full plan, don't stop until it's done", ran it overnight unattended from Task 0 (`27c5171c`) to landing (`33b46163` code, `b3b0cd90` log).

**What landed.** `Menus/menu-base.css.ts` names every row kind once in stacking order with the box declared first, so no row anywhere declares a height, floor, or padding; a row is its ramp's line plus one of two padding pairs (`--row-height/width-standard` 6/6, `-compact` 4/4) chosen per pane (`menuCompact`). `NavList` — NavWindow, NavView, the Trash — became `MenuItem` rows on a column padding its lead with `--content-inset`, the pin and the Trash's checkbox seated in that inset through the row's `overlay` slot. The `[[` autocomplete is a standard Compact menu. `NavTrail` owns its look. `menu-index.tsx` renders the Settings window, every frame, and the property editors from data; `frames.css.ts` went 40 → 28 exports, geometry only. `--content-start` is the content edge, the icon picker's cell wears the row shell, and the icon ladder is named as the type ramp is. Seven breaker rounds (two on the plan, four on the phases, one on the whole) and a neutral verification ran; every finding above Low was fixed in an addendum commit and recorded in the plan's Log with its round.

**Mid-run rulings Nathan gave by message, all folded:** the Trash keeps its checkboxes in the lead inset; NavList, Trash, and NavView pad their lead with `--content-inset` as TableView does; Settings' own tokens go — plain menu logic, no seat widths; the autocomplete is a standard Compact menu with nothing bespoke; every task's plan text is written Today → Becomes; each surface a phase touches is screenshotted before its gate closes; removing and reusing beats minting a var or export with one writer and one reader.

**Verified vs assumed.** Gates green at HEAD (typecheck 0 · biome clean · vitest 297 / 3671); the Dead Vocabulary sweep at 0 against control `--surface-inset` 9; every surface below was screenshotted and measured over CDP on the live app (`p1-*`…`p4-*.png` in the session scratchpad). Not driven and left to Nathan: a pin reorder by drag, the packaged build's sidebar rename field (its five `Sidebar.css` rules were dead in production until `33b46163`), the FilterFrame locked branch, BlockHandleMenu, the Calendar lists.

#### Completion Criteria

- [x] **The Menu recipe** — the row kinds named once, `menu-index`, Sort and Hidden as index rows inside their drag shells, the frame stylesheets down to geometry.
- [ ] **The next session recaps before it moves** — the Done rows in [[RendererRefactor]] confirmed against the tree, the Pending rows ordered, the Open Rulings taken.
- [ ] **The side slot** — the main window mounts `SidePane`; PaneSlide is one motion.
- [ ] **The filing rows are executed** — `Core/`, `Navigation/` absorbing `Tabs/`, the Showcase out, `Surface/`, the casing renames — and the atlas's rule greps return empty.
- [ ] **The token and scale rows are settled** — the zoom renames and merge, `--labels-gap`, the checkbox recipe.
- [ ] **`ViewEmbedBlock.tsx:88` reads `cellRing(key)`.**
- [ ] **The atlas's Open Decisions sections are empty**, each block deleted by a ruling.
- [ ] **The Space dropdown is eyeballed** — carried from 08-25.

#### Next Session

1. **Nathan's running pass** over the list in [[MenuRecipe]] §Closeout — what he flags is a Task; the five **Open Calls** there (rows with a switch or eye at 31–32; locked cards clipping their trail; the Trash row's second tab stop; Settings' section titles as `div`s; a footing row kind) each want a one-line ruling.
2. **File the History entry** drafted in the closeout chat as PM-118 on Nathan's word; then Recent Work in Context.
3. **Part 2** as written in [[MenuRecipe]] §Sequenced After — leading glyph sizes, `--list-inset` (starting from the inline indent style in `menu-row.tsx`), a footing row kind, the `action` kind's first consumer, the two remaining clearance pairings, and the Figma components that follow the code.
4. **The Tiles session** is serialized behind this landing (Blocks/Embeds → Tiles/, Components/ → Utilities/) — ping it that the recipe is on `main`.
5. **Then the ledger:** the side slot, and the filing rows.

#### Feedback

- "Your idea sucks — `--row-height-standard` = +6px, `--row-height-compact` = +4px, no fixed 24 or 28; all consumers move." — a fixed height was the wrong model; padding tokens are the truth.
- "removing and re-using is what Nathan would likely choose as opposed to just stacking new exports or variables that really only exist on one level, where a raw px value that's coherent would make more sense as a knob."
- "make it clear that autocomplete becomes a standard compact menu; the plan is extremely vague on what to do versus what already exists across the entire plan." — every task rewritten Today → Becomes.
- "each surface requires screenshot confirmation."
- "checkbox needs to be a left inset action like pins are." · "navlist + trash must use the 24px inset token like tableview does btw with the pin or checkbox landing inside." · "setting tokens need to go; it's plain-old menu logic; no setting-width etc…"
- "nav-view toggle in subfield must share the same inset the nav trail does, not seemingly extra." · "style row is wrong on the layout — slider has been broken. make sure these are fixed if the plan doesn't fit them in."
- "cut the comments — tell the agents not to add comments unless absolutely necessary."

#### Session Pointers

- `.claude/Planning/MenuRecipe.md` — the plan and its Log: §Rulings, §Deviations (every mid-run change), seven review rounds, §Open Calls, §Lessons, §Sequenced After (the Part 2 brief), and the Delivery Claim with Nathan's running-pass list.
- `Pommora/src/renderer/DesignSystem/Menus/menu-base.css.ts` — the recipe; `rowBox` first, the four tokens and the `--row-*` vars on `:root` at the top; `menuCompact`; the kinds in stacking order.
- `DesignSystem/Menus/menu-index.tsx` — `Trailing` · `MenuRow` · `MenuSection` · `MenuRowView` · `MenuIndex`; `inert` for a box without the shell.
- `DesignSystem/Menus/menu-row.tsx` — `MenuItem` (`forwardRef`, `value` · `detail` · `trailing` · `overlay`, the flush rule keyed on a trailing), `MenuTopRow`, `MenuFooting`, `MenuScrollFrame` with `header`/`footer` slots.
- `Navigation/navList.css` — `.nav-list` sets `--row-pad-x: var(--navwindow-inset)` and `--row-pad-lead: var(--content-inset)`; `.nav-pin` and the Trash's `.trash-check` ride `overlay`.
- `DesignSystem/Components/Controls/Slider/slider.css.ts` — `strip` `width: 160 // KNOB`; the readout never shrinks; ImagePicker's row overrides to `flex: 1`.
- `Tokens/size.css.ts` — `ICON_PX` by the type ramp's names; only `--icon-body` survives as a CSS var.
- The session scratchpad (`/private/tmp/claude-501/…/14cb88d4…/scratchpad`) — `cdp.mjs` (eval · shot with clip · mouse · type · key) and the `p1-`…`p4-*.png` screenshots.

#### Working Notes

- A vanilla-extract variant composed onto a base sets properties only when it is declared after the base — `rowBox` is first in the file for that reason; a surface overriding every row inside it sets the `--row-*` vars instead.
- A class moved "as geometry" must be diffed for the rung and tone it carried; a control's own `:disabled` can un-dim what its base dimmed; a class that gains a `:has()` layout rule stops being a typography prop; a width minted for one host lands on its siblings.
- `Icon`'s `size` prop unions `IconSize` with lucide's `string | number`, so a stale size name is caught by grep, not by `tsc`.
- The dev server's module graph goes stale on a deleted export mid-refactor; a blank React root after a rename is the dev server, not the code — restart it (`env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`).
- Over CDP, assert `document.activeElement` before `Input.insertText` — a rect-derived click landed on a card, opened a page window, and typed into a real Nexus page (recovered with `git checkout` in `~/NexusOS`).
- Plain-CSS selectors on vanilla-extract names by substring (`[class*="…"]`) match in dev and not in the production build; `grep -rn 'class\*=' src --include='*.css'` stays at zero.

**FILES ADDED**

- `Pommora/src/renderer/DesignSystem/Menus/menu-index.tsx` · `menu-index.test.tsx`
- `Pommora/src/renderer/Frames/switchRows.tsx`
- `Pommora/src/renderer/Properties/optionRow.css.ts`
- `Pommora/src/renderer/Settings/trashFrame.test.tsx`
- `Pommora/src/renderer/Views/CardView/cardAddPicker.css.ts` (deleted at Task 1, recreated at Task 4 as one class)

**FILES MODIFIED**

- `.claude/Planning/MenuRecipe.md` — the plan, ratified, executed, and closed; `.claude/ContextPM.md` — Current Focus and the Immediate Work row; `.claude/Features/DesignSystemPM.md` (Geometry rows, the "where each goes" sentence, §Menus), `SymbolsPM.md` (the duplicate ladder table removed), `MarkdownPM.md:128`; `.claude/Guidelines/Cohesion-Rulings.md:66-67`; `.claude/Planning/RendererRefactor.md:20`, `RendererAtlas.md:76`
- 96 files under `Pommora/src/renderer` — `DesignSystem/Menus/*`, `DesignSystem/Components/Pickers/{PickerMenu,CalendarPicker,ImagePicker,IconPicker}/*`, `DesignSystem/Elements/{NavTrail,DropOutline,PickerControl,EyeToggle}/*`, `DesignSystem/Components/{Controls/Slider,Fields}/*`, `DesignSystem/Tokens/{size,theme-vars}.css.ts`, `Frames/*`, `Properties/Editors/*` + `PropertyFrame.tsx` + `OptionRow.tsx`, `Navigation/{NavList.tsx,navList.css}`, `Windows/{NavWindow.tsx,navWindow.css}`, `Interface/{navView.css,Subfield/*,Banner/Banner.css}`, `Settings/*`, `MarkdownPM/{AutocompletePane.tsx,Styles.css}`, `Blocks/{BlockHandleMenu.tsx,handleMenu.css.ts}`, `Views/CardView/*`, `Cards/{Card.tsx,cards.css}`, `Sidebar/Sidebar.css`, `styles.css`, and the icon-rename readers

**FILES REMOVED**

- `Pommora/src/renderer/Properties/ValueRow.tsx`
- `Pommora/src/renderer/Settings/SettingsRow.tsx`

**COMMITS**

- `27c5171c` — chore: the working tree before the menu recipe (Task 0)
- `a1f3e2c5` · `370a167a` · `5194820f` · `c857a3e4` · `fb2f77d5` · `a6df3eed` · `bdf30002` — Phase 1, Tasks 1–6
- `7cbb44ea` · `faa7d3b0` · `4626e3a1` · `72a867a4` · `8fcb89bb` — Gate 1 (Nathan's heading gap · simplifier · comment-killer · review · breaker)
- `3d90741e` · `6724ba08` · `c21eb47d` · `90cbd682` · `be6381a5` · `da647e88` · `0f6325c5` · `46aac3d1` · `659b25e2` — Phase 2, Tasks 7–12b
- `8aed8657` · `2be2609b` · `7f358d51` · `96755197` · `51be26de` · `144b2c89` · `cffdd681` — Gate 2 (simplifier · the overlay's home · comment-killer · the overlay's placement · the subfield toggle · the footing rung and the slider · the breaker's five)
- `71320620` · `f2a59d41` · `21322586` · `8863c613` · `aa6dcaa7` · `1d442c25` · `3d619f98` · `760352dd` · `3a6acd1d` · `1e3a5bd3` · `05392979` — Phase 3, Tasks 13–20
- `0bbf2865` · `3eeda281` · `4a173cfd` · `a2369d4a` — Gate 3 (simplifier · the action row · comment-killer · the breaker's four)
- `da851e1b` · `c67b36b8` · `bedb2008` — Phase 4, Tasks 21–23
- `ba4f18c9` · `8e5a4645` · `9d2826c0` · `33b46163` — Gate 4 and landing (simplifier · comments · the icon cell's fill · the sidebar's title rules)
- `5c2cb807` · `a975b3a8` · `029783bc` · `d3d75a59` · `b3b0cd90` — the claim, the docs it made false, the verifier's restatements, the landing log
- (the plan's own `docs(planning)` commits sit between the phases)

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run rather than accumulating passes.
- A handled item leaves for Context, History, or the Feature docs — no tombstone.
- Nathan's own guidelines in this document are preserved.
