## Handoff — Pommora

> **User Prompt:** *"The Renderer Refactoring has been started, borders, re-orgs, and other touchups have been done. The V2-Vocab is queued as immediate, and the Immediate Work is the remainder of the refactoring … The clear goal of next session should largely be to recap, come together, and actually plan this out rather than just getting off track and changing course — this is a multi-day effort that's been going on for a day now, and is unorganized; we need to actually plan out everything that's been done, what we're gonna do, and how we're gonna manage continuity throughout."*

#### Current Focus

**Session ID:** 14cb88d4-ef66-4a6d-a7c7-18bd37efbbaa
**Dates:** 08-25-2026 → 08-28-2026
**Model:** Opus 5 (1M context) → Fable 5 (continued through the exploration and directed cleanups)

**The Renderer Rework — the Menu Recipe landed, the planning was consolidated, the codebase was explored by twelve agents, and directed cleanups are landing against the findings.** Early in the session the Menu Recipe was ratified and run overnight to landing (`27c5171c`→`33b46163`). Then the scattered planning — the Renderer Atlas, the Refactor ledger, the abandoned Tiles plan, and Cohesion-Rulings — was retired into one document, [[RendererRework]]: the eight filing rules, the target tree, 27 do-not-re-derive rulings, the checklist of moves by kind, the open rulings, and §6 Working Rules (delete-on-landing, no tombstones, report LOC, no done-vs-open ambiguity).

**The exploration.** Twelve read-only perspectives (Reducer as the priority — Cartographer, Exports, Architect, Stylist, Token Designer, Recipe, Lexicographer, Boundary, Newcomer, Archivist) plus a Skeptic pass ran against `Pommora/src/renderer` at a pinned commit. Verdict: the renderer is structurally healthy — zero import cycles, ~no dead code, no hidden stylesheet twin; the real work is naming, filing, and stylesheet vars (Nathan's DRY worry, confirmed: ~237 non-token vars, 61 write-once-read-once, knobs masked by downstream overrides). The load-bearing findings were verified at the line by the orchestrator; the readable synthesis is the published artifact "What the Twelve Found" and the catalogs in the session scratchpad (`explore/`). A ruling was disproven (the PageCard `s.tree` subscription; Cohesion-Rulings:144 deleted) and the abandoned Tiles plan's "a barrel closes the cycle" premise was shown backwards.

**Directed execution.** Rather than wait on a ratified framework, Nathan directed targeted moves against the findings, each landed gated (typecheck 0 · biome clean · vitest 297/3671, builds green where relevant) with its LOC and the map crossed off: eight dead override hooks → literals; one-place table-head type (`.table-head` callout·emphasized·label-secondary); `--labels-gap`→`Labels/`; NavView search → headline; icon picker 210×225; `WarmCache`→`Store/TabState`; banner height + add-zone DRY'd, each surface's divider a local `--detail-divider-width` knob; `Interface/Banner/` dissolved to flat `Interface/` with `content-banner.css` + `content-title.css`; `tile-chassis`→`Blocks/` and `DesignSystem/Detail` removed; `AssetImage`+`assetUrl`+`imageAspect`→`renderer/Assets/`; and `DesignSystem/Components/` dissolved — Pickers, Controls, Fields, SidePane at the design system's top level, `useDismiss`→`Interactions/`. All pushed to origin.

**Where it stands.** Everything landed is gated and pushed; the renderer builds and the showcase deploys unchanged (vercel already points at the current Showcase source). What remains is the formalization: the open forks that gate the framework — the CSS-form question (keep `.css.ts` vs revert to plain CSS, the Stylist's contrarian call), the masked-knob roster (`--detail-title-size`'s 5-way override next), the naming batches, and the ten deferred §3 rulings — then [[RendererRework]] §2 becomes ordered phases with gates.

#### Completion Criteria

- [x] **The Menu recipe landed** — the row kinds named once, `menu-index`, the frame stylesheets down to geometry.
- [x] **The planning is one document** — [[RendererRework]] replaced the Atlas, the Refactor ledger, the Tiles plan, and Cohesion-Rulings.
- [x] **The exploration ran and was verified** — twelve perspectives + the Skeptic; the load-bearing findings opened at the line; the synthesis captured.
- [ ] **The open forks are ruled** — the CSS-form question, the masked-knob roster, the naming batches, and the ten deferred §3 rulings.
- [ ] **The framework is written** — [[RendererRework]] §2 rewritten into ordered phases with gates, then ratified.
- [ ] **The filing and token rows are executed** — `Core/`, `Navigation/` absorbing `Tabs/`, the Showcase out, the casing renames, the zoom family; and R1/R3's greps return the target.
- [ ] **`ViewEmbedBlock` reads `cellRing(key)`** — the one behavioral fix.
- [ ] **The Space dropdown is eyeballed** — carried from 08-25.

#### Next Session

1. **Rule the open forks** — the CSS-form question (keep `.css.ts` vs revert to plain CSS, the Stylist's contrarian call), the masked-knob roster (`--detail-title-size`'s 5-way override is next), the naming batches, and the ten deferred §3 rulings. Each is a one-line call that unblocks a checklist row.
2. **Write the framework** — once the forks are ruled, rewrite [[RendererRework]] §2 into ordered phases with gates and ratify it.
3. **Continue the directed cleanups** in the meantime — they land gated, LOC-reported, map crossed off, per §6 Working Rules.
4. **The Space dropdown** — carried from 08-25.

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

- `.claude/Planning/MenuRecipe.md` — the plan, ratified, executed, and closed; `.claude/ContextPM.md` — Current Focus and the Immediate Work row; `.claude/Features/DesignSystemPM.md` (Geometry rows, the "where each goes" sentence, §Menus), `SymbolsPM.md` (the duplicate ladder table removed), `MarkdownPM.md:128`; `.claude/Guidelines/Cohesion-Rulings.md:66-67`; `.claude/Planning/RendererRework.md` (which replaced `RendererRefactor.md` and `RendererAtlas.md`)
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
