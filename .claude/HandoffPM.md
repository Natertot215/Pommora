## Handoff — Pommora

> **User Prompt:** *"The Renderer Refactoring has been started, borders, re-orgs, and other touchups have been done. The V2-Vocab is queued as immediate, and the Immediate Work is the remainder of the refactoring … The clear goal of next session should largely be to recap, come together, and actually plan this out rather than just getting off track and changing course — this is a multi-day effort that's been going on for a day now, and is unorganized; we need to actually plan out everything that's been done, what we're gonna do, and how we're gonna manage continuity throughout."*

#### Current Focus

**Session ID:** 14cb88d4-ef66-4a6d-a7c7-18bd37efbbaa
**Dates:** 08-25-2026 → 08-27
**Model:** Opus 5 (1M context) → Fable 5

**The Renderer Refactor, day one and the morning after.** The session opened on the atlas — seven lenses over 453 files, eight filing rules, a target tree — and then took its rows as they came: the token cleanups first (strays cleared, the `--width-*` and `--fade-*` names, the `--border-*` edge ladder composed at the consumer), then the structural moves (`Views/` to the root, `Cards/` as the one chassis, `Tables/` as the tabular chrome, `Properties/` as the value layer, the dependency order `DesignSystem ← Properties ← Tables ← Views`), then the day's second half: the Settings window onto the menu row primitive, the toolbar's tone moved from a `button` selector to the container with its ten specificity pins flattened, `--label-zoom` retired, and the Windows block — `src/Windows/` holding `PageWindow`, `WebWindow`, `NavWindow`; the chassis renamed `WindowBase` and moved to `DesignSystem/Components/`; `DetailPane` → `ContentView`; `NavView` to `Detail/`; `NotchedPane` → `NotchedShell`. Then the vocabulary was ruled and applied in one pass: Window · Pane · Menu · Frame · Picker. `Materials/` became `DesignSystem/Glass/` (`glass-base`, `-window`, `-surface`, `-control`, `-pane`, with `GlassPane` and `GlassSurface` swapped to their meanings); `Components/Detail/` became `Frames/` with every `*Pane` a `*Frame`; `DesignSystem/Components/Menu/` became `DesignSystem/Menus/` in kebab parts with `FrameSlide`; `InspectorPane`, `ConnectionPane`, `AutocompletePane` on `glass-pane`; the toolbar's `*Menu`; `SettingsWindow`; the chassis is `Windows/window-base` — `WindowBase`. Nineteen commits sit on `main` past `origin/main`, each one green.

**Two regressions Nathan saw were not regressions.** The slider's lost track and the switch's lost on-fill were the dev server holding stale vanilla-extract hashes — deleting `label.quaternary` from `color.css.ts` shifted every var hash, and any `.css.ts` not recompiled since still named the old one. A dev-server restart cures it; ⌘R does not. That diagnosis came after a false fix: the `--tint-*` ladder was declared undefined on a literal-name grep and minted a second time, when `theme-vars.css.ts:37` had generated it from `TINT_STEPS` all along. The comment-killer caught the duplicate at closeout and it never landed. Build-Gotchas carries the trap.

**Vocabulary and the plan.** [[DesignTermsV2]] was written, stress-tested, and rewritten to Nathan's retractions: five terms — Menu, Pane, Window, Frame, Picker — with Pane as a Menu's page (`GroupPane`, `FilterPane`, `TrashPane`), Frame as the in-content anchored surfaces (`PageFrame`, `WebFrame`, `AutoFrame`), Window executed. Rulings taken today are in the atlas's Settled list: spacing and radius literal on the even grid with odd values reconciling per consumer, the toolbar tone rule, `--tint-solid` kept, `subChip` kept. Nathan's four-var zoom scheme was evaluated against the evidence: three renames are clean; the `--page-scale` merge costs a font-path rewire. [[RendererRefactor]] now exists as the ledger — end goal, every row done, in flight, and pending, and the rulings it waits on — so the next session plans from it rather than continuing by feel.

#### Completion Criteria

- [ ] **The next session recaps before it moves** — the Done rows in [[RendererRefactor]] are confirmed against the tree, the Pending rows are ordered into sessions, and the Open Rulings that gate them are taken.
- [ ] **The vocabulary is applied** — the four [[DesignTermsV2]] sessions executed and its rename tables emptied.
- [ ] **The filing rows are executed** — `Interface/`, `Core/`, `Connections/`, `Navigation/` absorbing `Tabs/`, the Showcase out, `Surface/`, the casing renames — and the atlas's eight rule greps return empty.
- [ ] **The token and scale rows are settled** — the zoom renames and merge, the glass tokens, `--subline-h` / `--labels-gap`, the checkbox recipe.
- [ ] **`ViewEmbedBlock.tsx:88` reads `cellRing(key)`.**
- [ ] **The atlas's Open Decisions sections are empty**, each block deleted by a ruling.
- [ ] **The Space dropdown is eyeballed** — carried from 08-25.

#### Next Session

1. **Read [[RendererRefactor]] first, then this document, then the atlas's Settled list.** Confirm the Done rows hold on disk (`ls src/renderer/src` — `Cards`, `Tables`, `Views`, `Windows`, `Properties` at the root; no `PagePreview`, no `NavWindow`; `DesignSystem/Detail` holding only `tile-chassis.css`).
2. **Plan, with Nathan.** Order the Pending rows into sessions; take the Open Rulings — the zoom merge, the glass tokens, the three design-system reaches, `Interface/`'s scope, the side slot's name and the main window mounting `SidePane`, the bare `Menu`, the two inspectors, the `PropertiesPane` edge, the three "preview" strings. Nathan is still weighing the token moves and alias naming from the early commits; that conversation belongs here, before any further row.
3. **Then the vocabulary's Menus session** — the largest count and every row a rename the typecheck polices — unless the plan reorders it.
4. **`cellRing(key)`** rides whichever session touches `Blocks/` first.
5. **Inline Page Properties** runs parallel on its own Decision Log and shares no files with any of this.

#### Feedback

- "stop being lazy and find the fucking issue. there is no background here." — a claim of "no regression found" was not an answer; reading the dev server's compiled CSS found it in one request.
- "there's no need to measure. My eyes work." — visual reports are facts; diagnose in code, don't re-verify the report.
- "most of these open decisions cite things without actually including evidence." — every block rewritten today carries file:line and counts; the rest re-derive when ruled.
- "Please make sure the atlas is properly reworded … flag moved stuff on the actual tree itself so what's already established isn't re-stated." — executed rows wear `✓` on the target tree; decision blocks that were ruled are deleted, not annotated.
- "subChip stays." · "Glass as a 'Surface' type and material is just more confusing — forget that." · "Pane as the view stuff makes sense, and I retract earlier."

#### Session Pointers

- `.claude/Planning/RendererRefactor.md` — the ledger; read first.
- `.claude/Planning/DesignTermsV2.md` — the five terms, the motions, the rename tables, the calls, the session order.
- `.claude/Planning/RendererAtlas.md` — §The Filing Rules for the eight greps; §The Target Tree with `✓` on executed rows; §Settled for every ruling; the Open Decisions blocks for what still needs one.
- `Pommora/src/renderer/src/Windows/` — the floating family; `Windows/window-base.css` for the `.window-*` chassis and its `--window-*` knobs.
- `Pommora/src/renderer/src/Settings/SettingsRow.tsx` — the `MenuItem` adapter; `nexusSettings.css` `.settings-wide` is the KNOB for a slider or path field's seat width.
- `Pommora/src/renderer/src/Toolbar/toolbar.css` — `.app-toolbar { color: var(--label-control) }` is the toolbar's tone; the chassis toolbar carries the same line.
- `Pommora/src/renderer/src/DesignSystem/Tokens/theme-vars.css.ts:37` — where the `--tint-*` ladder is generated from `TINT_STEPS`.

#### Working Notes

- A `.css.ts` that has not changed since a token was removed from `color.css.ts` keeps its old var hash in the dev server; the built app is unaffected. Restart the dev server before diagnosing a "lost fill."
- Before claiming a CSS var is undefined, grep its template form (`` `--tint-${ ``) — the families are generated from ladders — and read the compiled module from the dev server (`curl localhost:<port>/src/…/x.css.ts.vanilla.css`).
- Nathan's editor overwrote the atlas mid-session with a buffer that predated an edit; when he is editing a Planning document, confirm the file on disk before writing to it.
- A "one `--zoom` with natural compounding" is not available to custom properties — a var that reads itself on a descendant is a cycle. Only the `zoom` property compounds, and the editor and the card grid deliberately do not use it for structure.
- `EntityGlyph` stays in `Navigation/`: three of five consumers are there and it reads `navResolve`'s `ResolvedNav`.
- The Settings rows' hover wash and caption-ramp hints are the menu family's, not a bug; `MenuItem`'s sub-label wrapping had no production consumer before Settings.

**FILES ADDED**

- `.claude/Planning/RendererRefactor.md`
- `.claude/Planning/DesignTermsV2.md`
- `Pommora/src/renderer/src/DesignSystem/Glass/` — the five tier files
- `Pommora/src/renderer/src/Windows/window-base.tsx` · `window-base.css`

**FILES MODIFIED**

- `.claude/ContextPM.md` — Current Focus, Immediate Work, and Pending Focus Two restated for the refactor's day one
- `.claude/Planning/RendererAtlas.md` — rulings into Settled, evidence into the zoom and glass blocks, `✓` on executed rows, the floating-family and toolbar blocks deleted
- `.claude/Guidelines/Build-Gotchas.md` — the stale-hash trap
- `.claude/CLAUDE.md` · fourteen Feature docs · `Cohesion-Rulings.md` — the Windows names
- `Pommora/src/renderer/src/Settings/*`, `DesignSystem/Components/Menu/*`, `Toolbar/toolbar.css`, the flattened-pin stylesheets, `Labels/labels.css.ts`, `Views/CardView/CardsView.css`, `Detail/ContentView.tsx` and its readers, `shared/types.ts`, `main/index.ts`
- `.claude/HandoffPM.md`

**FILES REMOVED**

- `Pommora/src/renderer/src/PagePreview/` and `NavWindow/` — into `Windows/`
- `Pommora/src/renderer/src/DesignSystem/Materials/` — into `Glass/`
- `Pommora/src/renderer/src/Components/Detail/` — into `Frames/`
- `Pommora/src/renderer/src/DesignSystem/Components/Menu/`, `PaneSlider/`, `WindowChassis/` — into `Menus/` and `Windows/`
- `Pommora/src/renderer/src/DesignSystem/Detail/PreviewPane/` and `SidePane/` — into `DesignSystem/Components/`
- `.claude/Planning/Documentation Audit — Report and Plan.md`

**COMMITS**

- `8dba1ee5` — refactor(views): purge the toolbar ViewDropdown's inert View Style toggle
- `19d71280` — refactor(design-system): read the tokens the system already had
- `b9367907` — docs(atlas): regroup the renderer atlas by subject
- `715bd9a3` — refactor(tokens): clear the strays, name the widths and fades
- `ad385956` — refactor(tokens): a literal border ladder — widths and edge colors, composed
- `a9d8b0ef` — refactor(views): Views leaves Detail for the renderer root
- `51e737df` — refactor(cards): one card chassis in src/Cards — the gallery and CardView wear it
- `cd1fcdff` — refactor(tables): the tabular chrome lives in src/Tables — TableView and the Trash wear it
- `230290fc` — refactor(properties): the value layer is Properties' — Tables and Views import downward
- `5bbd8a98` — refactor(renderer): one PathField, the simplification pass, and the closeout's repairs
- `aec1137c` — refactor(settings): the Settings window wears the menu row primitive
- `bdba9bdd` — refactor(toolbar): the tone is the container's, and the pins built against a button selector go
- `77b8937e` — refactor(windows): the floating family is src/Windows, and the chassis is WindowBase
- `cf7cfaa6` — chore(ledger): line counts through the Windows move
- `162f80a5` — docs: the handoff for the refactor's first day
- `00874fd7` — docs(prd): the floating page window by its name
- `19254825` — refactor(vocabulary): Window, Pane, Menu, Frame, Picker — applied across the renderer
- `9746d3af` — chore(ledger): line counts through the vocabulary pass

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run rather than accumulating passes.
- A handled item leaves for Context, History, or the Feature docs — no tombstone.
- Nathan's own guidelines in this document are preserved.
