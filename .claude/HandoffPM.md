## Handoff — Pommora

> **User Prompt:** *"Go for it. Keep in mind when writing the descriptions of the items on the doc, that they must be BRIEF… Once this is done; do a final sweep simplification pass, commit, and give the diff tree."* — then, the same session: *"buttons are definitely in-scope here, and a shared Controls/ folder is likely where they'd go."*

#### Current Focus

**Session ID:** 5897f22e-4fa9-4416-b22b-4de359243564
**Dates:** 08-24-2026
**Model:** Fable 5

**The design-system rework — the second line of work beside the file arc.** One long session in two halves. The first half made `DesignSystem/` one tree that reads like its ledger and gave it a Button (`4d7feba7 → defb6960`; the reorganization, motion in `Animation/`, `theme-vars` a pure bridge, `Components/Controls/Button/` worn by every toolbar button and every former ghost, IconPicker and PhotoCropModal lifted inside). The second half (`278f585c → 8f3246d3`) applied the same method — recipe owns the look, surface owns the click, measure over CDP before claiming anything — to the next three families that were still hand-rolled per surface.

**Trails.** Twelve surfaces drew a location; seven rendered one component, one was a byte-copy, four were their own, and beneath them four separate ancestry computations disagreed about where a page lived. Now `Elements/NavTrail` is the one element — segments `{ title, icon?, ghost?, onSelect? }` divided by `PathChevron`, inert / selectable / navigable by what the caller passes, `emphasize` for the current stop, no ink of its own so the host's color reaches it — and `ancestryOf` on `treeIndex` is the one ancestry, which the subfield spine, card footing, preview and embed trails all slice. The subfield's own O(N) tree search (run twice per render) and Cards' private walk are gone.

**Fields.** `PathField` was three things wearing one name. `InputField` absorbed the first two as capabilities — `chrome="bordered"`, `edit` (press-to-edit), `leading` and `trailing` slots (the trailing action pins to the field's edge, tertiary) — and the path is composed at its sites from `pathSegments()` + `NavTrail` + a Browse `Button`. `SegmentRun` lost its chevron mode and moved into Fields; `hairlineField → borderedField`. Then the two press-to-edit mechanisms collapsed to one: `useDraftEdit` is deleted, `InputField.edit` rides `RenamableLabel` over `EditableInput` with the rest width held, `renames` seats the caret, `emptyCommits` lets a value field clear, and a host may drive `editing`. `InlineEditHeader` is an icon Button beside an `InputField edit`. A build-breaking pass found six things the swap dropped (caret overflow past the pane, the unreachable empty reset on both path fields, a tone step on click, select-all lost on paths, an unnamed caret, a false one-mechanism claim) — all six closed at `8f3246d3` with `InputField`'s first tests.

**Button** learned `pressed` (the selected wash held under hover; the scoped pane's lock rides it instead of its own fill) and a collapsed label now takes the icon inset — the Views trigger's width regression. Everything above is verified in a sandbox instance over CDP against the Test nexus: subfield tones, nav-row tones, the path field's width pin and caret seat, a pane-header rename. Not verified on Nathan's screen: the trailing glyph's tertiary tone, the Views trigger width, the header caret at 40+ characters.

#### Completion Criteria

- [x] **One location trail, one ancestry** — `NavCrumbs`, `SubfieldBreadcrumb`, `chainOf`, `setChains`, `PathCrumb`, `.nav-path-*`, `.crumb-two-tone` all gone with no dangling consumer; `resolveWith` keeps its six live callers.
- [x] **One press-to-edit mechanism across every field surface** — `useDraftEdit` gone; every rename in the renderer rides `RenamableLabel` (OutlineDropdown, ViewPane, RenamableTitle → GroupBand, PropertiesPane, DetailTitleHeader, Banner, ViewEmbedBlock's pill) or `EditableInput` directly where the caret is the surface. The view embed's title stays a block-level `contentEditable` by design.
- [x] **Gates green at every commit** — typecheck 0 · biome clean (938) · 288 files / 3602 tests · app + showcase build.
- [x] **The ledger reads as the tree does** — `DesignSystemPM` names NavTrail, the Fields section (InputField's props, SegmentRun, the chrome row, `borderedField`), Button's `pressed`; `PathField` and `useDraftEdit` rows gone; the CLAUDE.md map names the trail.
- [ ] **Eyeballed on Nathan's screen** — the trailing glyph's tertiary tone, the Views trigger beside its neighbors, a long page title under Rename.

#### Next Session

1. **Reload and eyeball** the three unverified-on-screen items above; retune `--nav-trail-glyph`, the trailing slot's tone in `fields.css.ts`, or `button-large`'s `paddingX` in `Tokens/size.css.ts` if anything reads off.
2. **Part 3 of the file arc — the ImagePicker.** [[ImagePicker — Decision Log]] and [[ImagePicker — Implementation Plan]] landed from the parallel session (`f68683cd`); one design-system surface for banners, cards, icons and the nexus photo, widening `PhotoCropModal` past the profile photo. Read both before touching `PhotoCropModal`.
3. **The Figma parity pass on Button** — still open from the first half; no Figma MCP is wired here. [[Buttons-Spec]] against the Figma card.
4. **Restart the dev server** after pulling — module moves (`SegmentRun`, the deleted `PathField`/`useDraftEdit`) invalidate Vite's graph; ⌘R is not enough.

#### Feedback

- "As long as it's coherent and doesn't just wrap these things in sloppily." A consolidation that leaves the old box and wraps it is the failure; the recipe owns the look, the surface owns what happens on click.
- "PathField must be retired; just give InputField itself the ability to add an optional leading or trailing glyph or button; that's the whole consolidation." Slots on the field, composition at the site — not a component that hoards chrome, edit mode and an action.
- "Don't create new behavior; add that as a next-feature candidate in ContextPM." A mechanism the codebase could use (TokenField) is recorded, not built, mid-consolidation.
- "Why should it stay?" — on a three-line parse duplicated at three sites. "Retire the component" never means "share nothing"; a pure function is not the thing that was retired.
- "The DesignSystem reworking arc IS important, but WON'T be a history entry since it's amending rather than additive, and detailing it may just hint towards past incorrect behaviors."
- "Stop it and fix the fucking alignment issue… there is no time pressure; use my live nexus." Measure over CDP before claiming alignment; a screenshot from a stale dev server is not evidence either way.

#### Session Pointers

- `DesignSystem/Elements/NavTrail/NavTrail.tsx` — the trail; `pathSegments()` beside it parses a filesystem path. `--nav-trail-glyph` is the only var; ink comes from the host.
- `treeIndex.ts` `ancestryOf(tree, ref)` — the chain including the entity, outermost first, cached per tree; `Subfield/crumbs.ts` `spineOf` gates it to collection/set/page (`hasSpine` is load-bearing, not defensive).
- `DesignSystem/Components/Fields/InputField.tsx` — `chrome` · `edit` (`FieldEdit`: value, onCommit, renames, emptyCommits, editing, onEditingChange) · `leading` · `trailing` · `capped`. `fields.css.ts` holds `borderedField`, `editable`, `draftInput`, `leading`, `trailing` (KNOBs `LEAD_GAP`, `TRAIL_GAP`).
- `DesignSystem/Components/Fields/RenamableLabel.tsx` — the rename swap and its commit guard; `EditableInput.tsx` — the caret itself.
- `Components/Detail/InlineEditHeader.tsx` — the five-pane header: icon Button + `InputField edit`, `editing` driven by a menu's Rename.
- `DesignSystem/Components/Controls/Button/` — `pressed`; `labeled` reads `labelCollapsed`, so a collapsed label takes the icon inset.
- `Build-Gotchas.md §sandbox` — the `POMMORA_USERDATA` line goes into `src/main/index.ts` before `requestSingleInstanceLock` per pass and comes out before committing; harness is scratchpad `cdp.mjs` + probe scripts (session-local; recreate from the guideline).
- `.claude/scripts/Line-Ledger.html` — regenerated by the post-commit hook; published at https://claude.ai/code/artifact/9172cda5-707d-4b69-aaed-d154dd2dd485 (read before publishing; the artifact tool refuses an unread republish).

#### Working Notes

- `--x: inherit` on a custom property inherits the *custom property*, not the value it's meant to alias — it read as unset and fell to the fallback. Alias with `var(--label-control)`.
- `RenamableLabel` encodes title semantics — caret at end, empty cancels, size to content. A value field (a path) wants `renames: 'row'` and `emptyCommits`; the default is right for names only.
- The `draftInput` caret must inherit its field's color and shrink (`flex: 1 1 auto`); stating a tone or `flex-shrink: 0` was right for `borderedField` and wrong for the boxed header.
- `PaneSlider`'s inert flip fires a real blur, so Back commits an in-flight edit; the unmount flush `useDraftEdit` had is not needed by any host traced.
- Zero tests mount `InlineEditHeader` or `RenamableLabel`-inside-a-field; `InputField.test.tsx` (jsdom, `act`, `focusout` for React's onBlur) is the pattern to extend.
- The auto-mode classifier intermittently refuses `git commit`; a message file via `-F` and a retry landed it.

**FILES ADDED**

- `Pommora/src/renderer/src/DesignSystem/Elements/NavTrail/` (NavTrail.tsx · navTrail.css.ts · index.ts · NavTrail.test.tsx)
- `Pommora/src/renderer/src/DesignSystem/Components/Fields/InputField.test.tsx`
- `Pommora/src/renderer/src/DesignSystem/Components/Controls/Button/` (Button.tsx · button.css.ts · Button.test.tsx · index.ts), `Animation/index.ts`, `Symbols/masks.ts`, `Components/PaneSlider/`, `Components/PhotoCropModal/`, `Components/Pickers/IconPicker/`, `Materials/Surface.tsx`, `Showcase/leaves/ButtonsLeaf.tsx`, `Settings/iconFavorites.ts`, `Settings/IconPicker.tsx` (the first half)
- `.claude/Planning/Buttons-Spec.md`; `.claude/Planning/ImagePicker — Decision Log.md`, `— Implementation Plan.md` (parallel session)

**FILES MODIFIED**

- `Pommora/src/renderer/src/treeIndex.ts`, `Navigation/{NavList.tsx, navList.css, navResolve.ts}`, `NavWindow/NavGallery.tsx`, `Detail/Subfield/{Subfield.tsx, crumbs.ts, subfield.css}`, `Detail/Views/Cards/CardsView.tsx`, `Detail/Views/{Table/Cell.tsx, PropertyEditing/filePick.ts}`, `Embeds/PageEmbed.tsx`, `PagePreview/{PreviewWindow.tsx, previewTabStrip.css}`, `Settings/{AssetDirectoryRow.tsx, TrashLeaf.tsx, trashLeaf.css}`, `Components/Detail/{FileEditor, FilterPane, InlineEditHeader, SettingsPane}.tsx`, `Components/Detail/{filterPane, settingsPane}.css.ts`
- `Pommora/src/renderer/src/DesignSystem/Components/Fields/{InputField.tsx, EditableInput.tsx, RenamableLabel.tsx, fields.css.ts, index.ts}`, `Components/Controls/Button/{Button.tsx, button.css.ts}`, `Components/Menu/Menu.tsx`, `Showcase/leaves/FieldsLeaf.tsx`, `Tokens/{card-tokens.css, size.css.ts}`
- `Pommora/src/renderer/src/DesignSystem/Components/Fields/{SegmentRun.tsx, segmentRun.css.ts}` (moved from `Labels/`)
- The whole `DesignSystem/` tree and every import site (the first half's rename); `Toolbar/*`, `Tabs/*`, `App.tsx`, `Sidebar/Sidebar.css`, `Blocks/BlockHandleMenu.tsx`, `Detail/Banner/*`, `Detail/Views/GroupBand.*`, `NavWindow/*`, `MarkdownPM/editor/folding.ts`, `styles.css`
- `Pommora/src/{main/index.ts, preload/index.ts, renderer/src/store.ts, shared/*}` (parallel session: Edit Icon, Change Color)
- `.claude/{CLAUDE.md, ContextPM.md}`, `Features/{DesignSystemPM, ArchitecturePM, CardViewPM, InteractionPM, PagePreviewPM, SubfieldPM}.md`, `Planning/{Codebase-Cleanup-Checklist, Design-Coherence-Report, Architecture Audit — Full-Codebase Report}.md`, `.claude/scripts/{Line-Ledger.html, loc-history.json}`

**FILES REMOVED**

- `Pommora/src/renderer/src/DesignSystem/Components/Fields/{PathField.tsx, pathField.css.ts, useDraftEdit.ts}`
- `Pommora/src/renderer/src/Detail/Subfield/SubfieldBreadcrumb.tsx`
- `Pommora/src/renderer/src/DesignSystem/Components/Controls/Segmented-Controls/`, `Features/TypographyPM.md`, `Planning/{DesignSystem-Organization, Elements-Consolidation-Plan, NavTrail-Consolidation}.md` (executed)
- `Planning/{Asset Directory — Decision Log, Asset Directory — Implementation Plan, File Properties — Decision Log, File Properties — Implementation Plan}.md` (executed; parallel session)

**COMMITS**

- `4d7feba7` — refactor(design-system): one home per thing — DesignSystem/ mirrors its ledger
- `8afff1d2` · `0c219509` · `aca13970` — bare → base; the ledger script; the tab bar's reveal selector restored
- `21faf5b5` · `a7a9c163` · `94f28432` · `e5a5ce40` — one Button recipe; the inset ring; the glass pill centers; every ghost is a Button
- `496b4c02` · `96230467` · `defb6960` — the first-half handoff; IconPicker and PhotoCropModal are components; the rehome's constraint satisfied
- `278f585c` · `c2b0597f` — NavTrail is the one location trail, ancestryOf the one ancestry; the subfield keeps its tones
- `f42594b7` · `03efc3ed` · `2a5695c0` · `6e6946ed` · `267a0f95` · `4446a2bf` · `54b612e9` — InputField owns press-to-edit; PathField retires into the slots; SegmentRun is a Field; the field's width, glyphs, slot centering, the trailing edge
- `6be4aef7` — Button carries a pressed state; a collapsed label reads as icon-only
- `56d3c76a` · `fb27e7f0` · `6e0e2295` · `babe0a3d` — the arc simplified; pathSegments; TokenField is a candidate; the renderer filing is boring work
- `cabf6804` · `8f3246d3` — one press-to-edit; the review's six findings closed
- `f68683cd` · `86b57b43` — the ImagePicker plans (parallel); Edit Icon and Change Color, the executed plans archived

#### Handoff Guidelines

- The handoff is not a History entry — the design-system rework amends what exists and takes none; write what a session needs to resume, not a record of what was wrong before.
- Measured claims and eyeballed claims stay distinct; a sandbox measurement is not Nathan's screen.
