### Scout 8 — Tests, Documents, Drives & Issues

**Ground:** `cae07c129`. Read-only. Reconciled against HEAD (`cae07c129`, unchanged).

#### 1. Map

##### Tests (`Core/Views/**/*.test.*`)

The test side is 14,353 lines across 45 files, against 9,801 lines of production across 69 files.

- **Pure suites (node):** `Pipeline/{filter,sort,group,resolveView,columns,creationSeeds,bandOrder,pickView,search}.test.ts`, `views.test.ts` (the codec), `viewsFile.test.ts`, `loadValues.test.ts`, `handlers.test.ts`, `filterModel`, `visibilityModel`, `creationOrder`, `reassign`, `valueKinds`, `viewIcon`, `pageRow`, `Bands/{bandModel,bandRouter}.test.ts`, `Table/useColumns.test.ts`, `Cards/cardColumns.test.ts`, `Host/useColumnStyles.test.ts`, `Host/pendingView.test.ts`, `deleteViewWithUndo.test.ts`.
- **jsdom suites:** these split into three groups.
  - **Renderer and host:** `Table/{bandCommits,cellGestures}`, `Cards/{cardCreation,cardDrops,cardGestures,useGhostFlip}`, `manualOrderDrops`, `Host/{useViewHost,useActiveView}`, `Bands/{GroupBand,bandZone}`.
  - **Settings panes:** `Settings/{Filter,Group,Sort,View,Visibility}Frame`, `OptionOrderList`.
  - **Write path:** `viewWrite.test.tsx`.

##### Shared Builders (`Core/Testing/`)

- **`viewHarness.tsx`:** `mountEachTest` (act env, `CSS.escape`, pointer capture, root lifecycle), `renderView` (seats the real `ViewHost` inside `DragGroup`), and `settle`. It has 21 consumers: 18 Views suites plus `OutlineMenu`, `ValueSeat`, and `valueContext`.
- **`pageValues.ts`:** `propsAtRoot`, `pageValues`, and `valuesReply`, used by 14 suites (Views and Properties).
- **`definitions.ts`:** `STATUS_DEF` (cards suites), `FIXTURE_DEFS` (for `fixtures/collection-with-status.json`), and `STASHED_AT`.
- **`testTree.ts`:** `makeTree`, `linkedSpacesTree`, and `identityFor`, imported widely.
- **`configSurfaces.ts`:** `viewOn` and `seedConfigSurfaces`, a raw saved view written to every config surface for cascade tests. It's used only by Properties, Nexus, and Trash suites, never by a Views suite.
- **`virtualRows.ts`:** the virtualizer stand-in used by `ArchiveView`, `TrashFrame`, and `BundleTable`.
- **`MenuDoorHost.tsx`:** used by `GroupFrame.test` and `SortFrame.test`.
- **`vitest.setup.ts:10`:** `stubDialer`.

##### Documents

- **`.claude/Features/ViewTypesPM.md`:** the views feature record (175 lines).
- **`.claude/Features/SymbolsPM.md:18,50-59`:** frame and view-type glyphs.
- **`.claude/FrameworkPM.md:21`:** the v0.6.0 renderers entry.
- **`.claude/IssuesPM.md`:** I-040 (`:1179`) and I-070 (`:1193`); I-059 (`:1075`) and I-069 (`:1089`) sit on this work's surface too (see §Issues). Other issues cite domain files: I-006, I-013, I-026, I-028, I-033, I-057, I-060, and I-065 (footnotes `:1230-1294`).
- No Guideline names views code (`Development-Environment.md:53` names only `settledMutate.ts`).

##### Drives (`.claude/scripts/`)

`drive-harness.mjs` and the eight `*/live-drive.mjs` drives touch views through DOM selectors only. No drive names a `Core/Views` path or identifier, and `make-benchmark-nexus.mjs` writes only persisted view fields (`:21,242`).

**Status:** Verified (counts, harness consumers, and document locations spot-checked); corrected FrameworkPM's path (it sits at `.claude/FrameworkPM.md`, not under `Features/`) and placed I-059 and I-069 in the issues list.

#### 2. Findings

##### F1 — Every View Suite Hand-Rolls an Untyped Source, Dialer, and Session Seed

**What's There:** The same scaffolding is repeated across the jsdom suites.

- **Casts:** 29 `as unknown as CollectionNode` casts across 15 Views suites. Examples are `cardCreation.test.tsx:17-40`, `cardDrops.test.tsx:19-56`, `bandCommits.test.tsx:46-80`, `cellGestures.test.tsx:72+`, and `manualOrderDrops.test.tsx:31-97`.
- **Builders:** `page()` and `set()` node builders are redefined in 5 suites.
- **Dialer and session seed:** 18 `window.nexus = stubDialer({'view:loadValues', 'views:save', menu})` installs across 12 suites. Each pairs with a near-identical `useSession.setState({tree: makeTree({registry}), selection: none, renamingPath: null, mutate, select})`, for example `cardDrops.test.tsx:92-106` and `manualOrderDrops.test.tsx:112-126`.
- **Settings panes:** the three Settings suites repeat an identical `view()` factory and `source` (`GroupFrame.test.tsx:40-58`, `SortFrame.test.tsx:51-68`, `FilterFrame.test.tsx:40-57`).
- **Small helpers:** `lastSaved`/`lastSavedView` is redefined 7 times. `texts` appears 4 times. `openPicker`/`pickOption` are duplicated (`GroupFrame.test.tsx:84-96`, `SortFrame.test.tsx:99-106`).
- **Size:** jsdom preambles run 50–208 lines each, about 2,085 lines in all before the first `describe`.

**Why It's a Problem:** The casts hide drift. `properties: schema` sits on the source in `SortFrame.test.tsx:67`, `FilterFrame.test.tsx:56`, `useActiveView.test.tsx:31`, and `ViewFrame.test.tsx:36`, yet `CollectionNode` has no `properties` field (`Core/Nexus/tree.ts:46-68`, which uses `propertyIds`), and no production code reads `.properties` off a node. A future List suite would copy about 100 lines of setup.

**Proposed Change:** Add to `viewHarness.tsx`:
- typed `collectionNode({ view, pages, sets, propertyIds })`, `pageNode`, and `setNode` builders;
- one `seatView({ registry, values, channels? })` that installs the dialer and session and returns `{ save, mutate, select, lastSaved }`;
- a `settingsFrame(view)` factory with `texts`/`openPicker`/`pickOption`.

The casts then become compile-checked, and the four stale `properties:` fields surface as type errors.

**Delta:** test about −200 to −280 (builders about +60). Production 0.
**Status:** Verified (29 casts in 15 suites, 18 installs in 12 suites, the four `properties:` fields, and `CollectionNode`'s shape all re-counted); the delta is an estimate.
**Overlaps:** 1 (§Becomes False, suites reading `host.*` fields its F3 removes would also re-point here).

##### F2 — `viewWrite.ts` Is Four Layers Deep, and Its Lock Gate Is Tested Three Times

**What's There:** The write path runs `useSaveView` → `saveViewIn` → `writeView` → `resolveViewWrite` (`viewWrite.ts:12-59`).
- `saveViewIn`, `resolveViewWrite`, and `VIEW_CONFIG_LOCKED` have no production consumer outside the file; only `viewWrite.test.tsx` imports them.
- The same behavior is asserted three times, once per layer:
  - **Locked refusal:** `viewWrite.test.tsx:112`, `:211`, and `:265`.
  - **Unlocked write:** `:125`, `:204`, and `:262`.
  - **State-only narrowing:** `:136`/`:147` and `:268`.
- Only `:276` (manual order rides a locked state write) is unique to the lowest layer.

**Why It's a Problem:** This breaks *Less to Carry* and *Reads as Designed*: an export implies a consumer, and these layers exist only to be tested separately. Git shows the callers moved away over `9ec7b3bd0` and `5ba1eefb0`; whether the export simply outlived them is *inferred*.

**Proposed Change:** One `useSaveView` plus one unexported write function that reports the refusal. Test through `useSaveView` and the existing `StateProbe`, and keep the manual-order case.

**Delta:** production about −12 to −15. Test about −50 to −60.
**Status:** Verified (layering, export consumers, and every cited test line).
**Overlaps:** 1 (F1 folds this file into a `Host/liveView.ts`; F11 the same test-only exports); 6 (F9, one `viewWrite.ts` with the tile scope and delete-with-undo); 7 (F3 gives `saveViewIn` a production caller — see Cross-Report Conflicts).

##### F3 — Tests Pin the Interactions → Creation Seam, Which Production Builds in One Place Only

**What's There:** `useViewHost.test.tsx:127` and `:891` call `useViewCreation(() => ({ ...host!, bandBucket: (key) => key, rename: () => {} }))`. That rebuilds the config which production assembles only in `useViewInteractions.tsx:126`. About 20 creation tests (`:787-985`) run through it.

**Why It's a Problem:** Folding creation into the host, or changing `ViewCreationConfig`, would break those tests with no behavior change, and it would pin a seam that a renderer never touches.

**Proposed Change:** The probe mounts `useViewInteractions(host, policy)`, the renderer-facing assembly, and reads `interactions.create*`.

**Delta:** about 0.
**Status:** Verified.
**Overlaps:** 1 (F2 retypes `ViewCreationConfig`); 3 (F1 removes `rename` from the config, which these probes pass).

##### F4 — Tests That Would Break on Restructure Without a Behavior Change

| Site | What It Pins | Proposal |
| --- | --- | --- |
| `Settings/VisibilityFrame.test.tsx:14` `vi.mock('../viewWrite', …)` | A string module path. Moving `viewWrite.ts` or the pane leaves the mock unapplied and the real save runs. | Stub `views:save` on the dialer like the sibling suites, and drop the module mock (−3). |
| `Settings/FilterFrame.test.tsx:363` `[class*="ruleRow"]` | The vanilla-extract debug class from `fp.ruleRow` (`FilterFrame.tsx:393,461`). A style rename breaks it with no type error. | Assert by role or aria. |
| `Settings/GroupFrame.test.tsx:357` `vi.spyOn(group, 'groupPlan')` | That the pane calls `groupPlan` through the module export. | Keep. It's type-checked and breaks loudly. |
| `useViewHost.test.tsx` | 25 `ViewHostApi` fields, about 100 accessor sites (`api?.toggleCollapse` 11, `persistView` 11, `view` 10, …). | Keep; it's the renderer contract. A host-return reshape rewrites them mechanically — count that in any reshape. |
| `Host/pendingView.test.ts` | `stageView`, `unstageView`, `dropIO`, `mutateAhead`, `useLiveView`, and `usePainted` as module API. | Keep (see Keep). Renames are mechanical. |
| DOM classes | `.data-cell` 15, `.line-zone` 11, `.group-band-head` 7, `.group-band-drop-outline` 6, `.card-value` 5, `.ghost-card`/`.cards-grid`/`.card-text` 4 each, `.data-row`/`.drop-line` 3, `.row-grip`/`.ghost-row` 2. | A shared row primitive for List that renames `.data-row`, `.data-cell`, or `.group-band-*` breaks these and the drives (F11). Keep the names, or rename in one sweep with the drives. |

**Delta:** about −5.
**Status:** Verified.
**Overlaps:** 1 (F1 and its §Becomes False list the same `vi.mock`); 4 (F4 removes `.group-band-drop-outline`, the six pins above); 2 (F2 keeps `.col-resizer`; F6 row shell).

##### F5 — Exports That Exist Only for Tests

Each of these symbols is used inside its own file, and only a test imports it:
- `bandRouter.ts`: `routeBandDrop` `:51`, `runBandEffect` `:132`, `BandScope` `:26`
- `useColumns.ts`: `minWidthFor` `:55`, `clampWidth` `:63`, `alignFor` `:72`, `reorderColumns` `:78`
- `views.ts`: `DEFAULT_VIEW_TYPE` `:16`, `decodeSubGroup` `:137`, `decodeGroupConfig` `:144`
- `useColumnStyles.ts:35` `pickedStyle`
- `GroupBand.tsx:230` `BandGlyph`
- `FilterFrame.tsx:182` `FilterView`
- the `viewWrite` trio (F2)

No production code exists purely as a fixture: there's no `data-testid`, env check, or test hook in the domain.

**Proposal:** Keep the pure-router and column-layout unit tests (Keep). Unexport `decodeGroupConfig`/`decodeSubGroup` and test them through `savedView.parse` (`views.test.ts:303`). Unexport `pickedStyle` if `useColumnStyles.test.ts` can go through `styleFor`; that's *inferred*, not checked.

**Delta:** about 0 lines.
**Status:** Verified (every symbol's non-test references re-grepped: each appears only in its own file). One correction to the Keep: `reorderColumns` is a duplicate of `placeInShown` rather than a seam, and Report 2 F4 removes it with its test block; the Keep covers `minWidthFor`/`clampWidth`/`alignFor`.
**Overlaps:** 1 (F9 `pickedStyle`, F11 decoders); 6 (F12 test-only exports); 2 (F4 `reorderColumns`).

##### F6 — Duplicated Status Definitions

**What's There:** 16 inline Status defs across Views tests.
- `bandCommits.test.tsx:19-44` and `cellGestures.test.tsx:16-41` are byte-identical (diffed).
- `group.test.ts:66-100` is `FIXTURE_DEFS.prop_status` (`definitions.ts:27-57`) without the colors.

**Proposed Change:** Share the identical ones from `definitions.ts`. Leave suite-specific shapes, whose option keys the assertions read.

**Delta:** test about −50.
**Status:** Verified (the two blocks re-diffed identical); the `group.test` reuse is *inferred* safe.
**Overlaps:** none.

##### F7 — Parallel Table and Cards Drop Tests

**What's There:** `manualOrderDrops.test.tsx:206-238` and `:269-295` assert the same three drop outcomes per renderer, differing only by the `mount*` and `drag*` helpers. The Table block also holds a fourth, Table-only case (a grip press drags the row even when a pickable column leads), which stays outside the shared table.

**Proposed Change:** Use `describe.each([[Table, mountTable, dragSecondRowUp], [Cards, mountCards, dragSecondCardUp]])`. A future List joins the drop contract with one entry, which is the test-side image of "presentation over shared infrastructure."

**Delta:** test about −25.
**Status:** Verified; corrected to note the Table-only case.
**Overlaps:** 6 (F12, the file belongs in `Host/`, agreeing with §Placement).

##### F8 — Untested Path: Table's Create-to-Rename

**What's There:** The Table opens its naming field from local, ID-keyed state (`TableView.tsx:73-88`). Its `strandedEditId` effect clears a rename whose row isn't yet in `rowById`.
- No Views test exercises it: no `fromCreate` in any Views suite, and no Table ghost-create assertion; `useViewHost.test.tsx:1002-1036` covers only the standing ghost's create.
- Cards' path is covered (`cardCreation.test.tsx:109-123`).

**Why It Matters:** This is the path I-040 and any rename unification change.

**Proposed Change:** Add one renderer test.

**Delta:** test about +20 (justified: it covers behavior that's about to change).
**Status:** Verified.
**Overlaps:** 2 (F3); 3 (F1).

##### F9 — Domain Suites That Bypass the Shared Seat

**What's There:**
- `viewHarness.tsx:1` claims "every view suite mounts through" it, but `Cards/useGhostFlip.test.tsx:3-6,88` hand-rolls the seat.
- The domain's table suites do the same: `BundleTable.test.tsx:26,82-90,274-283`, `ArchiveView.test.tsx:31,116-125`, `TrashFrame.test.tsx:24,38-48`, and `sidebarDnd.test.tsx:21-23,53-71`.
- Repo-wide, 104 suites set `IS_REACT_ACT_ENVIRONMENT` by hand against 21 that use `mountEachTest`.

**Proposed Change:** Route the domain's suites through `mountEachTest`. Leave the rest of the repo as an insight.

**Delta:** test about −40.
**Status:** Verified (104 and 21 re-counted). **Reconciler-Found:** `Core/Testing/editorHarness.ts:191` (`stubEditorBridge`) is a second shared seat that sets the act environment for MarkdownPM suites, so a repo-wide seat has two existing candidates, not one.
**Overlaps:** none.

##### F10 — I-040 and I-070 Against the Consolidation

**I-040** (rename opens one frame after the row): the citations hold except one.
- **Verified:** `useViewCreation.ts:141-162` (rename runs only after `created.path` resolves, `:155-159`); `useViewInteractions.tsx:45,129`; `CardsView.tsx:161` (`beginRename(target.path, fromCreate, 'detail')`; the footnote's `~163`); `editSlice.ts:21,31,92`; `mutateRequest.ts:174-177` (`minted`).
- **Off:** the Table cite `TableView.tsx:~122-131` is the title cell's commit. The Table's rename state and policy are `:73-77` and `:86-87`, which is what the issue's description routes through.

The issue omits that the two renderers diverge. Table keeps its own ID-keyed state (introduced with the cell-editing state in `4701725b5`/`dfb8d0147`). Cards joins the app-wide path-keyed fence (`renamingPath`/`renamingHost`, shared with the sidebar and detail). Both open their create-rename from the same post-flight callback (`useViewCreation.ts:155-159`), so the Table's ID keying doesn't make it open sooner today.

Whether the fix falls out depends on one decision:
- **Partly, if the cleanup unifies rename:** that means one host-owned, ID-keyed naming state for every renderer, retiring `ViewPolicy.rename`, Table's local state, and Cards' `beginRename` call. `createPageIn` can then claim the minted ID at the gesture. The naming state must tolerate a pending create, since today's `strandedEditId` would clear it, and that view-side half falls out.
- **The fence stays:** the session fence's path keying (`editSlice`) is outside scope, and it decides whether a view rename still coordinates with the sidebar's.
- **Assertion pinned by design:** `cardCreation.test.tsx:122` asserts `beginRename('Col/Untitled.md', true, 'detail')`, and the fix changes it on purpose.

**I-070** (refused cross-band drop keeps its rank): the citations are exact — `pendingView.ts:201-233`, `117-132`; `useViewInteractions.tsx:182-196`; `useViewCreation.ts:115-130`; `bandRouter.ts:72-107`.
- **No fall-out:** the fix doesn't fall out of consolidation.
- **One place:** every cross-band refusal already joins at `dropIO(...).persistAfter` (`pendingView.ts:222-231`). That covers `placeInView` (`useViewInteractions.tsx:193-194`), `runBandEffect`'s `fs` arm (`bandRouter.ts:142-145`), and `GroupFrame.tsx:397`. `persistAfter` closes over the `view` its `dropIO` was built with at the drop (`useViewInteractions.tsx:193`), before the drop's own patch stages — so it holds the prior order.
- **The fix:** re-place the row at its prior slot on the live order in the refusal arm (`pendingView.ts:229`), which matches the issue's own +8 estimate. Merging the three order-writing sites isn't needed for it.
- **Fold in?** Only if `pendingView.ts` is opened anyway — which Report 1 F1 does.

**Status:** Corrected — `persistAfter` holds the view as of the drop rather than "grab-time"; added that both renderers' create-rename fires post-flight; the Table cite is `:73-77, 86-87`. Otherwise verified.
**Overlaps:** 2 (F3); 3 (F1); 1 (§Insights, rename divergence; §Keep, I-070's fix lives in the pending record — agrees, and this finding's cite to the refusal arm is the more precise); 4 (§Insights, I-070 in `bandRouter.ts`).

##### F11 — Drives

No drive references a code path, so file moves and renames break nothing. Class and attribute renames break them:
- **Rows and cells:** `.data-row` (Archive 17, Path Links 10, Properties 9, Metadata 6, Option Picker 5, Text Property 3 occurrences), `.data-cell`, `data-rid`, and `.cell-title-text`.
- **Cards and bands:** `.card-value`, `.card-props`, `.card-text`, `.card-prop-row`, `.card-prop-label`, `.ghost-card`, `.group-band-row`, and `.row-grip`.
- **Table chrome:** `.table-head`, `.table-grid`, `.table-view`, and `.line-zone`.

Helpers are partly duplicated:
- `drive-harness.mjs:341` exports `row(title)`, while Path Links (`:261 rowOf`), Metadata (`:266 cellOf`), and Option Picker (`:68 cell`) roll their own.
- `showView` exists twice (`Text Property:110`, `Properties:923`).

**Proposal:** Only if a row class renames, route those through `drive-harness`'s `row` and one `cellOf` and `showView`.

**Delta:** about −20 in drives, conditional.
**Status:** Verified; occurrence counts re-taken (Archive and Path Links slightly higher than the scout's).
**Overlaps:** 2 (§Becomes False, Archive Drive selectors including the 29.75 row height); 4 (§Becomes False, `data-drop-outline`); 5 (§Becomes False, Properties Drive); 7 (F1, the tile's class reads).

##### F12 — The FrameworkPM and ViewTypesPM Disagreement

**The Code Matches ViewTypesPM.** No renderer or pane switches on a kind; grepping for `type === 'cards'`-style tests finds nothing in Views. One `GroupFrame` and one `SortFrame` adapt through `VIEW_KINDS[view.type].nests` (`views.ts:24-31`, `GroupFrame.tsx:142,174,261`, `SortFrame.tsx:89`).

**FrameworkPM Is Older.** `.claude/FrameworkPM.md:21` comes from `d4382f0d1` (08-11-2026), while `nests` and the one grouping plan came later (`47c16173d`, 09-29-2026). FrameworkPM is stale.

**`nests` Is Overloaded.** One boolean decides:
- whether Set bands nest (`bandModel.ts:171,301`);
- whether structural grouping flattens (`group.ts:451`);
- whether Sub-Group exists (`group.ts:400`, `GroupFrame.tsx:261`);
- whether Group: None is offered (`GroupFrame.tsx:174`);
- whether the reserved Location sort is offered (`group.ts:391`, `SortFrame.tsx:89`).

**Unbuilt Kinds' Values Are Placeholders.** The four unbuilt kinds carry `nests: true` only because they seat `TableView` (`ViewHost.tsx:19`) while `nests` is read from their own entry (`:23`). Setting Gallery to `false` today would flatten a Table.

**Proposal:** Rewrite FrameworkPM:21 to match the code; this is document-only. Resolve the Table fallback at the kind level, so an unbuilt kind's `nests` isn't a decision anyone made. That's Nathan's call, and Report 5 F1 holds the mechanism.

**Status:** Verified (dates, the five readers, and the fallback re-read).
**Overlaps:** 5 (F1 holds the mechanism; §Insights, `nests` two meanings and Open Item 1); 1 (F4 §Note); 7 (F5).

#### 3. Names

| Current | Problem | Proposal |
| --- | --- | --- |
| `ViewRow<Id>` (`LayoutFrame.tsx:101`, imported by `SettingsFrame.tsx:15`) | Collides with `ViewRow`, the page row (`viewRow.ts:32`). | Report 5's `ViewPane`/`VIEW_PANES` carries, since its F2 restructures the list (this report proposed `FrameRow`/`FRAME_ROWS`). |
| `bandCommits.test.tsx` | Holds band drops, reparent, band header, and a "column width" describe (`:845-887`). | Split per placement (§4). |
| `manualOrderDrops.test.tsx` | Covers row and card drops through the host's routing, not only `manual_order` (also `page_order` and relocate). | `rowDrops.test.tsx` |
| `viewHarness.tsx` | `mountEachTest` and `settle` are generic, and only `renderView` is view-specific. Its header (`:1`) overclaims. | Keep the name while it serves views and tables. Fix the header claim (F9). |
| `nests` (registry field) | Means "nested Set bands" and also "flat-list affordances" (None, Location sort). | Flag only; renaming is Nathan's call (F12). |
| ViewTypesPM's "Grouping/Sorting/Filtering" panes | The UI labels and code say Group, Sort, Filter (`LayoutFrame.tsx:110-112`, `GroupFrame`). | Use the UI's names in the doc. |

#### 4. Placement

These are proposals for Nathan's approval:
- **`Table/bandCommits.test.tsx`:** the band portions (`:194-843`) belong in `Bands/` (as `Bands/bandDrops.test.tsx`), since they test band routing with Table as the vehicle. The column-width describe (`:845-887`) belongs beside the Table's column suites.
- **`manualOrderDrops.test.tsx`:** move it from the Views root to `Host/`, where the drop routing lives (`useViewInteractions.tsx`). Report 6 F12 agrees.
- **Root-seat tests:** the "root seat" (`useViewHost.test.tsx:986-1053`) and "view search" (`:1054-1111`) describes test `ViewHost` and search rather than the hook. Leave them unless the host file is reshaped (low value).

#### 5. Already False

**False Today**

- **`SymbolsPM.md:18`:** says view-type glyphs are decided "in `Core/Views/Settings/LayoutFrame.tsx`", but they're `VIEW_KINDS` in `Core/Views/views.ts:24-31`.
- **`.claude/FrameworkPM.md:21`:** "each carries its own grouping surface" is false against the code (F12).
- **`ViewTypesPM.md:16`:** "a persisted ghosted page" reads as saved to disk, where the line means the standing ghost (`useViewHost.test.tsx:1002`, "one standing ghost row"); reword. The line also has a grammar slip ("are use").
- **`ViewTypesPM.md:103`:** `--labels-gap` isn't in the `.table` sheet; it's a `:root` var in `UIX/Labels/label-base.css.ts:127`, and table-tokens.css lacks it.
- **`ViewTypesPM.md:71`:** "The renderer assigns only its scroll root" — the renderer assigns `viewRootRef` (`TableView.tsx:282`, `CardsView.tsx:354`), which is the view's root. The host finds the scroller from it (`useViewCreation.ts:99-101`). The same paragraph's "one policy" omits `newPages` (`TableView.tsx:88`, `CardsView.tsx:162`).
- **`ViewTypesPM.md:47`:** typo, "bands(`GroupBand.tsx`)".
- **`IssuesPM.md:1264` (I-040):** the Table cite `TableView.tsx:~122-131` is off; the state and policy are `:73-77, 86-87`. The issue also omits the Table/Cards rename divergence (F10).
- **`viewHarness.tsx:1`:** "every view suite mounts through" is false (`useGhostFlip.test.tsx`).
- **Stale test fixtures:** `properties: schema` in four suites (F1).

**False After a Restructure**

- **Paths ViewTypesPM cites:** `views.ts` (`VIEW_KINDS`, `savedView`), `Host/{ViewHost,useViewHost,useViewInteractions,useViewCreation,pendingView}`, `Pipeline/`, `filterModel.ts`, `GroupBand.tsx`, `Table/useColumns.ts`, `table-view.css`, `cards-view.css`, `UIX/Interactions/ghostCreate.ts`, `VIEW_RENDERERS`, and the paragraph naming `useContainerValues`.
- **Issue footnotes:** I-006, I-013, I-026, I-028, I-033, I-040, I-057, I-059, I-060, I-065, I-069, and I-070 cite domain files and line ranges.
- **Lines that go false under specific moves:**
  - ViewTypesPM:71 goes false if the host/interactions split or the "policy" shape changes.
  - ViewTypesPM:162 goes false if the unbuilt-kind fallback moves.
  - SymbolsPM:18 goes false if the frame tables move.
- **Tests and drives:** F3, F4, and F11.

**Status:** Verified; corrected the `ViewTypesPM.md:16` reading and the FrameworkPM path.

#### 6. Keep

- **`Host/pendingView.test.ts`:** unit tests of a subtle staging algorithm (`settle`/`stageOver`, `pendingView.ts:39-60`). Testing it only through the host would lose precision.
- **`Bands/bandRouter.test.ts`:** tests a pure router (`routeBandDrop`) directly, which is the right altitude. The test-only exports stay.
- **`Table/useColumns.test.ts`:** pure layout math. `minWidthFor`/`clampWidth`/`alignFor` are legitimate seams; the `reorderColumns` block goes with Report 2 F4.
- **The pipeline suites** (`filter` 975, `sort` 580, `group` 848, `resolveView` 696): large but pure, and they guard the behavior every future kind reuses.
- **`views.test.ts` codec tests and the fixture JSON:** persisted names are frozen, so these tests are the guard.
- **`configSurfaces.ts`:** a cross-surface cascade fixture over persisted shapes, not views-test duplication.
- **`pageValues.ts`, `virtualRows.ts`, `MenuDoorHost.tsx`:** each has one job and several consumers.
- **The 25-field `useViewHost.test` probe:** it tests the renderer contract. Reshape it only alongside a host reshape.

#### 7. Insights and Concerns

- **Three "is this kind built" registries.** These are `VIEW_KINDS` (`views.ts:24`), `VIEW_RENDERERS` (`ViewHost.tsx:11-14`), and `LAYOUT_OPTIONS` (`LayoutFrame.tsx:52`, which also gates the picker tiles at `:185`). Adding List touches all three, and `nests` for unbuilt kinds silently tracks the Table fallback. Report 5 F1 holds this; it's the root of F12.
- **I-013 is MarkdownTable's per-move redraw.** It already names the view Table's CSS-variable drag (`useColumns.ts` `startColumnDrag`) as the model. Markdown tables enter only on real duplication; this is shared technique, not shared code.
- **Repo-wide seat duplication.** 104 suites set the act environment by hand (F9). It's out of scope here; if one seat becomes the repo's, `viewHarness` is the wrong home, and `editorHarness` is the other existing candidate.
- **Rough Totals:** test about −360 to −440, production about −15, documents about 0. The production side is small because this domain is mostly tests and documents. The real production reductions sit in the other scouts' domains, and F3–F4 measure what those changes cost here.

#### Issues

How each issue on this work's surface folds in, checked against `.claude/IssuesPM.md`:

- **I-040** (`:1179`, footnote `:1264`) — **Doesn't fall out on its own.** It folds only if the cleanup unifies page renaming on one ID-keyed claim (Report 2 F3, Report 3 F1, F10 here); then the view-side half falls out and `createPageIn` opens the rename at the gesture. If rename isn't unified, I-040 stays as it is. The footnote's Table cite needs correcting either way.
- **I-070** (`:1193`, footnote `:1294`) — **Doesn't fall out.** The fix is local to `persistAfter`'s refusal arm (`pendingView.ts:229`, +8). It folds in as a rider only if Report 1 F1 opens `pendingView.ts`; otherwise it stays independent. The Decisions doc's [INFERRED] item 6 should say so for I-070.
- **I-059** (`:1075`, footnote `:1283`) — **Deferred by the owner, but it sits squarely on this work's surface.** Its three lock mechanisms — `lineList`'s `locked`, `groupedLine`'s per-kind `disabled`, and the band spec's `draggable` in `snap` (`GroupBand.tsx:62`) — are the row pieces in scope, and its two named victims are BundleRows' never-dragging zone (`BundleTable.tsx:183`; Report 2 §Keep, Report 4 §Insights) and NavList. Its proposed solution is consolidation-shaped (one per-row "stays put" flag replacing three locks), and a non-dragging List would inherit the same drift. Nothing in the other reports fixes it as a side effect. Re-ask Nathan whether it folds in; the default stays deferred.
- **I-069** (`:1089`, footnote `:1293`) — **Folds in through Report 5 F5**, per the settled scope ("any PickerMenu-related cleanup joins this work"). The issue asks that name and folder be decided together in one pass, which F5 does. Its footnote cites check out (`MenuPresenter.tsx:102`, `MenuDropdown.tsx:91`, `PommoraUIX.md:380`, `.claude/CLAUDE.md:109`).

---

#### Removed

- **§Insights "I-059 is a row-piece consolidation the owner deferred" and "I-069 is PickerMenu's name and folder"** — moved into §Issues above with their verified folding, rather than kept as two separate insight bullets.

#### Cross-Report Conflicts

- **`saveViewIn` (8 F2 vs 7 F3):** 8 F2 collapses the four layers on the premise that `saveViewIn` has no production consumer; 7 F3 gives it one — the tile's pill rename/icon/color, which can't use `useSaveView` because `ViewTile` is the scope's provider and reads no scope of its own. If 7 F3 lands, `saveViewIn` stays exported for `ViewTile` and only `writeView`/`resolveViewWrite` collapse into it; the test triplication still goes. Both hold; sequence 7 F3's decision first.
- **I-070 Ownership (8 F10 vs 1 §Keep vs the Decisions Doc):** No contradiction in substance — 1 says I-070's fix lives in the pending record, 8 pins it to the refusal arm at `pendingView.ts:229`. 8's evidence is the more precise. Against the Decisions doc's [INFERRED] item 6, I-070 doesn't fall out of the consolidation.
- **`ViewRow<Id>` Name (8 §Names vs 5 §Names):** 5's `ViewPane` carries (its F2 restructures the list).
- **`reorderColumns` (8 F5 §Keep vs 2 F4):** 2 F4's removal holds; 8's Keep covers the other column-layout exports.
- **Page Rename (8 F10 · 2 F3 · 3 F1):** See Report 2's Cross-Report Conflicts; the ID-keyed direction aligns with I-040's proposed solution, and neither renderer opens its create-rename before the reply today.
