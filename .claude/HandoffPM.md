## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence.”*

#### Current Focus

**Session ID:** 6e36b069-0658-4a96-b4ef-7474821cfd46
**Dates:** 08-16-2026
**Model:** Opus 5

**PM-104 — Menu & Surface Consolidation.** The session opened on the first of PM-104's two bullets: rework `PickerMenu` for double-chevron consumers onto the autocomplete's beak-less surface. `PopoutMenu — Scope.md` had scoped that as a second component beside `PickerMenu`, and every count in it re-derived correctly against the code — but the scoping answered the wrong question. Once Nathan ruled that all menus move and nothing keeps a notch, the answer stopped being "add a component" and became "`PickerMenu` stops having a beak," at which point `PopoutMenu` folded back in after one commit of existence.

**The beak was load-bearing for more than its shape.** A beak is not a silhouette a CSS border can trace, so `NotchedPane` cut the frost to a hand-drawn curve and stroked the same curve as an SVG outline — which meant switching off `GlassPane`'s own border first. CSS bundles the border, the top specular, the inner ring and the lower rim into one `box-shadow` property, so switching off the border switched off the lighting too. Menus had been three lighting layers thinner than every other pane in the app for as long as they had beaks. Dropping the middleman restored them, cut `NotchedPane` from 204 lines to 109 (its sideways path, flip, three inset props and resize publication were all unreachable once `MenuSurface` was its only consumer), and made `PickerMenu` and `PreviewPane` genuinely the same surface rather than nominally.

**That exposed the glass vocabulary as wrong rather than merely imprecise.** `GlassWindow` and `GlassSurface` were byte-identical, each carrying a comment promising divergence "later," so three named tiers were really two and the one real distinction — 95% versus 90% brightness — was invisible in the names. Nathan's call: merge them under `GlassSurface` for the app's fixed chrome, keep `GlassPane` for floating transients, and rebuild `GlassWindow` as the pane's chrome carrying a body. Four spellings of "darken this" (a boolean at 100%, a `tintOpacity` number at 85/90, a `fill` at 78, a hand-written `--state-muted`) collapsed onto one `SOLID_FILL`, which ended a live mismatch: `NavWindow` passed 90 while its own comment insisted it matched `PreviewWindow`, which passed 85.

**What is verified:** every gate green on the final state — typecheck clean both projects, Biome clean across 800 files, 2736 tests across 235 files, 21 atlas tables agreeing with source. The auto-centring branch is pinned by two tests that were mutation-checked (reverting the default makes one fail). The restored border's layout effect was measured rather than reasoned about — it does grow a shrink-to-fit pane by 2px, which `box-sizing: border-box` does not prevent, and `IconPicker`'s column count survives because it derives from a live `clientWidth` rather than its width constant.

**The autocomplete then landed on top of that**, in two commits so the behavior and the refactor revert separately: it centres on the caret and slides within the editor's nearest scrolling ancestor rather than the viewport, then handed its own portal, measurement, exit presence and geometry to `PickerMenu`. A simplification pass over that fold caught a defect it introduced — both hosts rebuilt `bounds` as an inline literal, minting a fresh identity per render, which rebuilt a ResizeObserver and two window listeners on the keystroke path — plus two staleness holes in the cached surface lookup, all three fixed.

**What is assumed:** four visual outcomes nobody has looked at in the running app — the eleven solid pickers at 90% instead of opaque, `PhotoCropModal` on the window tier, the `PaneSlider` panes now growing both directions under auto-centring, and the autocomplete near the column edges and where it flips above the caret line. All are seconds of use to judge and invisible in a screenshot.

#### Completion Criteria

- [x] **One beak-less rectangular shell** carrying every menu, picker, grid, calendar and hover card; `MenuSurface` alone keeps the beak, for the toolbar dropdown that hangs off a named button.
- [x] **`PickerControl` migrated**, moving its fourteen consumers together.
- [x] **`PopoutMenu` folded into `PickerMenu`**, with `PointMenu` and the fixed-option row re-homed.
- [x] **The pass-through removed** — `PickerMenu` and the autocomplete mount `GlassPane` directly, restoring the material's border, lighting and shadow.
- [x] **Rows split by what they hold**, not which shell they sit in; `rowShell` states hover and focus once.
- [x] **The chosen-row mark is accent from one definition**, replacing four across three surfaces and seven rows carrying none.
- [x] **Auto-centring** — straddle the trigger where the whole pane fits, edge-anchor where it would be clamped, decided once per open.
- [x] **Three honestly-named glass tiers** and one `SOLID_FILL` behind every darkened surface.
- [x] **Documentation reconciled**, with a `SOURCE:`-tagged Glass & Menus table in the atlas.
- [x] **The autocomplete rides the shared pane.** It centres on the caret and slides within the editor's own surface rather than the viewport, and handed its portal, measurement, exit presence and geometry over. `PickerMenu` gained `anchorHeight` (a caret is a line, so a flip clears it) and `bounds` (the box a pane slides within).
- [x] **The three open calls routed** — the hover card's lost beak, `PhotoCropModal`'s tier change, the `PaneSlider` panes under centring.
- [ ] **PM-104's second bullet: one row shape for every menu model.** `ActionItem<A>` moves from `main/returningMenu.ts` into `shared/pageMenu.ts`, and `separatorBefore` / `destructive` collapse into one word. Untouched this session.

#### Next Session

- 
#### Feedback

- "dont use browser shit, I can verify things myself." — headless-Chrome verification is unwanted; hand over what to look at instead.
- "checkmarks must still be accent on the menues like I told you to" — an instruction applied to one row type is not applied; the sweep is the deliverable, not the first site.
- "Give me a no bullshit and no filler approach design" — a design is the files, the values and what breaks; the preamble is not part of it.
- "Try moving PhotoCropModal to Window just for the hell of it." — experiments are welcome when they're cheap and reversible.

#### Session Pointers

- `design-system/materials/index.ts` — the tier ladder is documented at the barrel; read it before touching any glass.
- `design-system/materials/glass-pane.tsx` — `SOLID_FILL`, `WINDOW_FROST` (which is `PANE_FROST` plus the fill and nothing else), and `GlassPane`'s `solid`.
- `design-system/components/PickerMenu/PickerMenu.tsx` — `ANCHOR_RESERVE` places the pane, `CORNER_CLEAR` keeps the Bloom off the arc, `decidedCentre` freezes the centring choice per open.
- `design-system/components/PickerMenu/pickerMenu.css.ts` — `PANE_RADIUS`, `chosenMark`, and the `pane` / `surface` split (shape versus gutter).
- `design-system/components/menu/menu.css.ts` — `rowShell` is the one hover-and-focus recipe both row types compose.
- `design-system/components/NotchedPane.tsx` — the beaked shell, now top-beak-only, with `MenuSurface` as its sole consumer.
- `design-system/components/PickerMenu/PickerMenu.test.tsx` — the auto-centring tests, and the `offsetWidth` / `getBoundingClientRect` stubbing pattern for testing placement in jsdom.
- `MarkdownPM/useConnectionAutocomplete.ts` — `surfaceOf` resolves and caches the box the panel slides within; `AcState` carries that box, built once so its identity doesn't churn a hook dep.
- `.claude/Planning/PopoutMenu — Tasks.md` — the arc's tracker: done, open with what each is waiting on, and deferred by ruling.
- `DesignSystemPM.md` §Glass & Menus — which tier each surface wears; `node scripts/check-atlas.mjs` verifies it.

#### Working Notes

- **`box-sizing: border-box` does not protect a shrink-to-fit box.** It applies only where a width is stated; an auto-width pane still grows by its border. Harmless here because panes anchor by an edge, but it will matter the moment something sets an explicit width and does arithmetic on it.
- **The atlas checker validates column 2's backticked tokens and column 3+'s literals**, skipping bare numbers under 8 and any prose derivation. A new table needs its `SOURCE:` files to actually contain both, or it fails.
- **`MenuOption` lays out its mark slot on every row and only paints the chosen one** — deliberate, so the pane can't resize as the selection moves between labels of unequal length.
- **An object literal built inline in JSX is a fresh identity every render**, and as a hook dependency that is an effect tearing itself down on a path that runs per keystroke. Build it where the values are read, not where they're passed.
- **A comment asserting two values match is worse than no comment.** `NavWindow`'s said it matched `PreviewWindow`'s tint; it made the mismatch harder to find, because reading it told you not to check.

#### Changes

**FILES ADDED**

- `.claude/Planning/PopoutMenu — Tasks.md`

**FILES MODIFIED**

- `.claude/CLAUDE.md`
- `.claude/ContextPM.md`
- `.claude/Features/DesignSystemPM.md`
- `.claude/Features/InteractionPM.md`
- `.claude/Features/PagePreviewPM.md`
- `Pommora/src/renderer/src/Blocks/BlockHandleMenu.tsx`
- `Pommora/src/renderer/src/Blocks/handleMenu.css.ts`
- `Pommora/src/renderer/src/Components/Detail/ColorPicker.tsx`
- `Pommora/src/renderer/src/Components/Detail/FilterPane.tsx`
- `Pommora/src/renderer/src/Components/Detail/GroupingPane.tsx`
- `Pommora/src/renderer/src/Components/Detail/InlineEditHeader.tsx`
- `Pommora/src/renderer/src/Components/Detail/PagePropertiesPane.tsx`
- `Pommora/src/renderer/src/Components/Detail/PickerControl.tsx`
- `Pommora/src/renderer/src/Components/Detail/SortingPane.tsx`
- `Pommora/src/renderer/src/Components/Detail/SortingPane.test.tsx`
- `Pommora/src/renderer/src/Components/Detail/dateTimeEditor.test.tsx`
- `Pommora/src/renderer/src/Components/Detail/propertiesPane.datetime.test.tsx`
- `Pommora/src/renderer/src/Components/IconPicker.tsx`
- `Pommora/src/renderer/src/Components/iconPicker.css.ts`
- `Pommora/src/renderer/src/Components/PhotoCropModal.tsx`
- `Pommora/src/renderer/src/Components/photoCropModal.css.ts`
- `Pommora/src/renderer/src/Components/Surface.tsx`
- `Pommora/src/renderer/src/Detail/InspectorPanel/InspectorPanel.tsx`
- `Pommora/src/renderer/src/Detail/InspectorPanel/inspector-panel.css`
- `Pommora/src/renderer/src/Detail/Views/PropertyEditing/PropertyPicker.tsx`
- `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx`
- `Pommora/src/renderer/src/MarkdownPM/AutocompletePanel.tsx`
- `Pommora/src/renderer/src/MarkdownPM/Styles.css`
- `Pommora/src/renderer/src/NavWindow/NavWindow.tsx`
- `Pommora/src/renderer/src/PagePreview/PreviewInspector.tsx`
- `Pommora/src/renderer/src/PagePreview/PreviewWindow.tsx`
- `Pommora/src/renderer/src/Settings/NexusSettings.tsx`
- `Pommora/src/renderer/src/Sidebar/Sidebar.css`
- `Pommora/src/renderer/src/design-system/components/CalendarPicker/CalendarPicker.tsx`
- `Pommora/src/renderer/src/design-system/components/CalendarPicker/calendarPicker.css.ts`
- `Pommora/src/renderer/src/design-system/components/NotchedPane.tsx`
- `Pommora/src/renderer/src/design-system/components/notchedPane.css.ts`
- `Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx`
- `Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.test.tsx`
- `Pommora/src/renderer/src/design-system/components/PickerMenu/pickerMenu.css.ts`
- `Pommora/src/renderer/src/design-system/components/PickerMenu/index.ts`
- `Pommora/src/renderer/src/design-system/components/PreviewPane/PreviewPane.tsx`
- `Pommora/src/renderer/src/design-system/components/PreviewPane/previewPane.css`
- `Pommora/src/renderer/src/design-system/components/SidePane/SidePane.tsx`
- `Pommora/src/renderer/src/design-system/components/TextPicker/TextPicker.tsx`
- `Pommora/src/renderer/src/design-system/components/TextPicker/textPicker.css.ts`
- `Pommora/src/renderer/src/design-system/components/menu/MenuSurface.tsx`
- `Pommora/src/renderer/src/design-system/components/menu/menu.css.ts`
- `Pommora/src/renderer/src/design-system/components/menu/menuSurface.css.ts`
- `Pommora/src/renderer/src/design-system/materials/glass-pane.tsx`
- `Pommora/src/renderer/src/design-system/materials/glass-surface.tsx`
- `Pommora/src/renderer/src/design-system/materials/glass-window.tsx`
- `Pommora/src/renderer/src/design-system/materials/index.ts`
- `Pommora/src/renderer/src/design-system/showcase/leaves/ComponentsLeaf.tsx`
- `Pommora/src/renderer/src/design-system/showcase/leaves/GlassLeaf.tsx`

**FILES REMOVED**

- None. `design-system/components/PopoutMenu/` was created and folded back in within the session, never committed.

**COMMITS**

- None. The whole arc sits uncommitted against `c84cdb43`.

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
- Parallel sessions: the latest /handoff owns the document, and every session's transcript survives through retirement into // Sessions.
- If additional guidelines appear here that aren't in the handoffs template, it means they've been user-added and should be preserved.
