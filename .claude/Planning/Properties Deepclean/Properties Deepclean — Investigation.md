### Properties Deepclean — Investigation

**DATE:** 10-21-2026
**HEAD:** verified at `a0f7dc6ff`. The scouts and reconcilers read `d0595b22d`; the two commits since (`156264f2f`, `a0f7dc6ff`) touch only `.claude/scripts/make-benchmark-nexus.mjs`, the scripts README, *Development-Environment.md*, and the Archive plan, so no cited line under `Core/` has moved.

This document records what Pommora's Properties system does today, what's wrong with it, what the cleanup can remove or consolidate without changing behavior, and the evidence behind each direction Nathan decided. *Properties Deepclean — Decisions & Intention* governs intent, and its entries are cited here as `[Intended as …]`; *BRIEF.md* holds the principles every approach here answers to. *Properties Deepclean — Scout Reports* holds the nine reconciled reports this document is synthesized from (01 Catalog & Types, 02 Values, 03 Schema Mutations, 04 Journals & Sweeps, 05 Schema Surfaces, 06 Value Surfaces, 07 Views, 08 Nexus & Seams, 09 Tests & Describers); finding IDs cite them, and the two findings both named `A-01` are cited as "02 A-01" and "04 A-01". A finding's status reads as the reconcilers left it: **VERIFIED** holds as the scout wrote it, **CORRECTED** holds as rewritten, and **INFERRED** is reasoned from the code without a run or a measurement, listed again under *§Unverified*. Where this synthesis re-opened the code and changed a reconciler's conclusion, the change is stated where it applies and collected under *§Size*'s closing note.

**Live Nexuses:** NexusOS is the only Nexus holding real property data (15 definitions over 9 types). `~/Test`, rebuilt by `make-benchmark-nexus.mjs test` at `156264f2f`, holds an empty registry and no property data, and every legacy-shape removal below was re-checked against both Nexuses. No `~/Benchmark-*` Nexus is on disk, so every scale claim waits on one being built.

**Explanation and Evidence:** each theme's opening and each decided direction carries two parts. The **Explanation (For Nathan)** says in plain terms what happens, why it matters, and what would change. The **Evidence** holds the mechanism, citations, finding IDs, and estimates the planner works from.

---

#### What's True

##### Legacy Residue

**Explanation (For Nathan):** Pommora still carries code for reading file layouts that only earlier versions of Pommora wrote: old spellings of property types, old names for two view settings, and an old way of remembering which groups a view hides. Every time a Nexus opens, part of that code reads the Trash, the Archive, and the homepage files looking for those old spellings. Neither NexusOS nor the test Nexus holds any of them, so the code does nothing except cost time and make the system harder to read. Removing it changes nothing you'd see.

**Evidence:** The type-id half is `LEGACY_TYPE_IDS` and the `propertyType` preprocess (`properties.ts:78-88`, whose comment claims they "read forever"), `normalizePropertyTypes`/`renamedRegistry`/`respelled`/`field` (`migrateConfig.ts:30-38,57-74`), and the open call (`Nexus/handlers.ts:45`). The saved-view half is `RENAMED` (`card_banner: image`, `icon: table`, `migrateConfig.ts:20-23`), `normalizeSavedViews` (`:47-55`, run at `handlers.ts:44` over every sidecar in `.trash` and `.nexus/archive` and every `_tiles.json`), and `renamedSidecar` in adoption's `stampFolder` (`adopt.ts:28,109`). The open-time registry pass reads `properties.json` under its lock and rewrites it only when a legacy id is present (`rmwJsonStrict` skips a `null` mutate), so nothing visible happens today (01-02, 08-03/09-01, CORRECTED). The hidden-group half is `legacyBucketKey` and its three call branches, the bare-`sub/` clause of `clearHiddenBuckets`, and the `/^\d{4}/` year sniff (`views.ts:317-382`, `GroupFrame.tsx:510-511`), from F-383 (`38df2a0d0`) (07-06). Smaller residue: the File `{ path }` object shape (`propertyValue.test.ts:245`), the retired look vocabularies (`columnStyles.test.ts:34-43`), and the old `icon` reservation (`deleteProperty.test.ts:303`) (09-12, 09-15). **Live check (this synthesis):** no `"type"` of `multi_select`/`url`/`datetime`, no `property_cache`, no `card_banner: image`, and no `icon: table` in any NexusOS or `~/Test` JSON; NexusOS's only `hidden_groups` is `[]`. **Settled here:** `adopt.ts:104,120` `migrateContainerSidecar` isn't legacy residue: it relocates `_pageset.json` to `_pagecollection.json` (or back) when a folder changes kind today, so it's current behavior outside Properties and stays (01 Cross-Domain asked for a live-Nexus check). **Keep:** `{defs: 2}` per-field merge depth has only the respelling as its recorded reason, but its live reason is a key rename racing another field's edit, so it stays and its test and doc example are re-based (B-08-01).

##### Type Facts

**Explanation (For Nathan):** Each property type (Select, Date, Number, and so on) has a set of facts: its name, its icon, how it sorts, whether it can group a view, how its chips look, which editor opens when you click it. Today those facts are written in many separate places, some as tables and some as one-off checks scattered through the app, so adding or changing a type means hunting down every copy. A second problem: the list of types a property can be also contains the two timestamp columns and, in places, Title, which are built-in fields rather than properties, so the app carries guards everywhere to stop those from being treated as one; Context, which stays a property type, rides along through a stand-in definition [Intended as F-1, F-2, F-3].

**Evidence:** `PROPERTY_TYPES` (`properties.ts:34-47`) and `TYPE_META` (`Cells/PropertyTypes.tsx:21-35`) are two per-type records; `WIDTHS`/`STYLE_MIN`/`DEFAULT_ALIGN` (`useColumns.ts:32,52,103`), `styleMenuLabel` (`columnMenu.ts:40`), `optionShapeFor` in UIX (`recipes.tsx:11`), and `optionGlyph`'s default (`OptionChip.tsx:26`) restate per-type display facts (01-01, 06-09, 06-11). About 14 compile-checked tables and about 25 unchecked `=== 'x'` sites decide type facts (01 Outward Map; the unchecked count is the scout's tally). "Which types hold connections" is stated five ways (01-05); the reserved columns' facts are spread over eight places (01-04); `'title'` is threaded through 21 hand-spelled `PropertyType | 'title'` unions in 11 files (01-11); the checkbox "a blank still draws" rule is stated four times (06-14); "registers unknown members" is stated twice (01 Outward Map); five Views tables each answer "can this type do X" with a different membership set (07 table-of-tables). `typeIds` feeds both the stored definition and the column taxonomy, so `normalizeRegistry` admits a stored `context`/`createdTime`/`lastEditedTime` definition and guards then defend against it at `SortFrame.tsx:92`, `propertyMenuActions.ts:69`, and `PropertyFrame.tsx:390-393`, while `syntheticContextDef` fabricates a definition at six call sites so Context columns fit definition-typed APIs (01-03, 05-03, 06 Cross-Domain). Title reads as a `select` value (`value.ts:43`) and is special-cased in filter and sort (02-15, 07-13). The Select compact glyph is `'tag'` while the Select type icon is `'send'`, and every user-made Status group draws `circle-dashed` (01-06). Link and date look vocabularies are built into picker options eight ways (01-09, 05-04/08-09). `IconName` lives in a `.tsx`, so icons can't join the engine record (`engineGraph.test.ts:7-9`, 01-01).

##### Values: Reading, Writing, and Undo

**Explanation (For Nathan):** A property's value is read from a page's front matter (the block of properties at the top of a page's file) or from a Space's settings file, shown in a cell, and written back when you edit it. Reading is clean: nothing that reads ever writes. Writing works, but it's built from pieces scattered across three folders, it reads each page twice per edit, a test helper writes values a way the app never does, and the app's on-screen preview of an edit is computed separately from the real write and can differ slightly. Undo has two real defects. Undoing a Context pick on a page whose tag names a Space Pommora can't find (an Obsidian typo, say) deletes that tag outright. Undoing an edit on a key that was written bare (just "Status:" with nothing after it) writes "Status: null" instead of putting it back as it was. Separately, any edit to one property also quietly tidies every other property on that page, which you might not expect.

**Evidence:** Twelve write routes (02 Write Paths) reach bytes through `assignValue` → `mutate` → `setPagePropertyOp`/`setSpacePropertyOp` → `setGovernedRootKey`, with world-less side doors for creation seeds, the banner, and the test seeder. The pipeline owner is split across `Contexts/contextResolve.ts:42-132`, `Contexts/contextWrite.ts:75-86`, and `Properties/governedWrite.ts`, with a Properties→Contexts→Properties import loop (02-03). `propertyValue.ts` holds ten jobs (02-04); five "value"-named files mean five things (02-08). `setGovernedRootKey` parses twice and splits the envelope three times, and "page not found" is decided twice per write (02-06). `encodeValue`'s refusal guards a state the zod door already prevents (02-01). `writePageValue` lands with no world and no lock across 54 test calls (02-07/09-02). The renderer's `applyValueAtRoot` re-implements the host encode and the undo patch differs from both (02-05). A Collection's `properties` list has three parsers (02-11); creation writes a new page once per Context seed (02-16). **Undo:** the context arm re-sends decoded ids (`assignValue.ts:67`, re-read at HEAD), so unresolved tag titles are lost; a bare key's `null` lands as `Status: null` through `nodeSpelledAs`/`mergeInto` (`pageFile.ts:146,172`, probe re-run); this is the unfixed half of I-063 (02-02, 09-13). A Space clear of an absent key repairs no siblings while a page clear does (02-14). Every write re-encodes every other governed key on the file (02 ledger; `governedWrite.ts:13`). Every value write re-reads and re-validates the whole registry from disk, O(R²) in `validateName` (08-05). The read path is read-only by construction (02 Read Path).

##### Schema Changes and Crash Recovery

**Explanation (For Nathan):** Some property changes rewrite many files: renaming a property, changing its Label Format, deleting it, renaming or removing an option. Before starting one, Pommora writes a small crash-recovery note so it can finish the job if the app quits halfway or a file can't be reached (an iCloud file that isn't downloaded, for example). There's only one such note for the whole Nexus. That single slot causes most of the trouble here: while one change is still owed, a second rename or delete runs with no crash protection at all, and option renames, format changes, and option removals on any other property are refused with "An earlier change hasn't reached every file yet." Contexts keep a second note of the same kind with its own rules, and "Try Again" works four different ways depending on what you were doing. Removing a property from a Collection, or clearing an option, can leave some pages untouched with no Try Again at all, and a second Remove does nothing.

**Evidence:** `journalSlot.write` returns `false` against a different held record or an unreadable slot (`journalSlot.ts:30-41`, re-read). `rekeyProperty` and `deleteInner` discard that return and proceed (`registryProperty.ts:183`, `deleteProperty.ts:123`, re-read); `rekeyOptions` and `removeOption` refuse `OWED` (`optionOps.ts:242,377`, re-read); Context and Space renames discard it and pass `supersedes` (03-01/04-01/04-03). Both property arms still attach `owed: record` to the reply, so the renderer carries a record that may exist nowhere, which is why `property:replay` accepts a record over IPC and the replay grew `answered` branches (`replaySchemaCascade.ts:54,78`). Seven hand-placed guards patch around the one slot (03 Refusal Catalog rows 2-8). A property delete commits the registry last with no reason its record needs, which forces the replay's `crashed`/`freed` disambiguation and `createProperty`'s delete-record consumption (04-02, re-read at `deleteProperty.ts:150-161`), and leaves a window where a value write lands behind the strip (04 A-01, INFERRED). The open runs two replays at two points, the Context one before the index is ready (04-07). Try Again has four vocabularies (04-08). Remove has no record and answers its skips as a refusal, so the editor stays open and a second Remove returns `NOTHING_TO_REMOVE` (`removeProperty.ts:33`, re-read) (03-03/04-13). `RenameJournal.skipped` is written and never read (04-04). Ten op entry points have seven reply shapes and four count functions (03-05). The schema lock wraps some registry writers and not others (03-04); five `defEditOp` channels are one operation (03-07/01-07).

##### Multi-File Updates, Reach, and Work Done on Open

**Explanation (For Nathan):** When a change has to touch many files, Pommora finds the files that might hold the property, then opens and rewrites each one. The shared machinery for this lives in the Properties folder even though Contexts, the Trash, Settings, and page banners all use it. Different changes pick their files by different rules: a property change only looks inside Collections and the Archive, while a Context rename or delete reaches any page in the Nexus, including loose pages outside every Collection. Space settings files are found by scanning the disk on every property change, even though the app already knows them, and one property delete scans them three times. Four Trash and restore routines write Space files with their own hand-made loops, two of which silently ignore a failed write. On every open, Pommora also re-checks every page in every Collection that has a Multi-Select property, to register words added while the app was closed.

**Evidence:** `governedSweep.ts` has 19 non-test importers, 8 outside Properties (04-14). 13 write loops in 10 functions, 12 read-only enumerators, and 9 world builders, of which several are one pattern (04 Mechanism Map). `sweepMembers` reads `queryMembers ?? nexusCorpus` unscoped while property sweeps filter through `governedReach`, and `sweepParse` admits loose files, so the outcomes differ; NexusOS's `Agenda/II. Tasks/PM-QuickFilter.md` sits outside every Collection and holds a Context-titled key (04-15, re-checked on disk). The sidecar arm reads every Space sidecar by disk scan while `spaceArm` and `sweepRootsById` gate from the tree; `scrubReturning` and `refillTrashed` discard sidecar write failures (04-05). `registerHeldOptions(root)` at open walks every Multi-Select Collection's pages under the schema lock, one `stat` plus cached parse each, where the index already holds every value (04-06/03-12). `runRepairSweep` hand-rolls `pageWorldOf` (04-10); `frozenWorld(linkWorld(...))` is built at three sites (04-11). "Which files hold this key" is read three ways, four times across one confirmed Label Format change (03-06/04-09). Collections hold resolved copies of definitions, so a definition arriving by sync or hand edit forces a whole-Nexus walk (`fileEvents.ts:491-495`, re-read) (08-02). "The schema a holder carries" is stated three times plus `assignedDefs` (08-13, 03-14). I-039's race is closed for the app's `mutate` ops (04-12).

##### The Removed-Values Stash and Remove

**Explanation (For Nathan):** When you remove a property from a Collection (as opposed to deleting it everywhere), Pommora strips its values off that Collection's pages and tucks them into the Collection's settings file, so re-adding the property later puts them back. You ruled for this in July, before sync existed. Three problems have surfaced since. First, it's the only copy of those values, and if two devices each remove a different property from the same Collection before syncing, one device's stash is lost for good and that property comes back as if it had never been removed. Second, entries for pages that later left the Collection are never cleaned out, which drifted from your July ruling that said they'd be dropped. Third, a Remove that misses some pages can't be retried. The stash stays, and those three problems are fixed in place or by a better home [Intended as C-1, C-2].

**Evidence:** Remove moves values into `property_cache` then strips (`removeProperty.ts:47-60`); about 170 production lines across 11 files serve the stash (03 L-01, INFERRED count; 71 non-test grep hits for the cache symbols at HEAD). Origin: the 7-2 Decision Log C-3/C-6 (`052ceec63`, implemented `f85ccf2b3`) — Nathan's intent. Collection sidecars merge at depth `{}` (`mergePolicy.ts:38-39`), so both the stash and `properties` merge whole (03-02, 08-06, 08 L9). Stale entries live until a global delete, against C-6's "stale page-ids dropped" (03 L-02). The shape carries a vestigial `values` wrapper and its name misdescribes a non-regenerable store (08-06). NexusOS and `~/Test` hold no `property_cache` (re-checked). Remove's Archive reach strips and caches archived pages (03 L-01, Archive interaction). **Settled here:** 03-02's "`{property_cache: 2}` merges per property, per page" is wrong for today's shape: `mergeKeys` recurses at `level - 1` (`jsonMerge.ts:36-43`), so depth 2 reaches `<propId>` and merges its `values` wrapper whole. 08-06 holds: per page needs depth 3, or the wrapper flattened plus depth 2.

##### Option Identity and Saved Views

**Explanation (For Nathan):** Options (the choices in a Select, Multi-Select, or Status) have no permanent identity; they're known by their label. Saved views remember options by label too — a sort's custom order, which groups are hidden or collapsed, a filter's chosen values. So renaming an option forces Pommora to rewrite every view, tile, and graph filter that mentions it, and on two devices a rename can race a view edit and leave a filter that silently stops matching. Sync also has to treat a property's entire option list as one indivisible item, so two devices each adding an option to the same property lose one of the two. Collapsed groups have their own flaw: they're remembered by bare label, so a "Done" you collapsed while grouping by Status stays collapsed when you regroup by another property that also has "Done" — one of NexusOS's Pommora tiles shows this today.

**Evidence:** Saved views name properties by `prop_` id and options by label in six roles (07 How Saved Views Name Things; `PropertiesPM.md:131`), so an option rename sweeps `configReach.ts:148-196`'s RENAME roles across every sidecar, tile document, `matrix.json`, and `openInPreview`. Options are `{ key, label, … }` with no id (`properties.ts:122-130`); I-006 excludes option lists from per-item merge for that reason (its wording says `value`) (09-14, 08 Sync Shapes). `OptionEditor.test.tsx:267-448` (about 180 lines) and `optionOps.test.ts:245-276` keep popups addressed through renames (09-14, INFERRED as a payoff). `group_id` on Status options is required, written, and read by nothing; a hand edit omitting it makes the whole property unadmitted (08-04, re-grepped at HEAD: writers only). `collapsed_groups` stores bare labels while `hidden_groups` is property-scoped; NexusOS's `Ideas/_pagecollection.json` views 0-1 hold bare labels (plus a Set id in view 0), and `open`/`closed` there match no current option (07-07, re-read on disk). Deleting the grouped property clears every collapsed key, structural ones included (07 ledger). A new view seeds `hidden_properties` with every schema id, redundant with the `property_order` allowlist (07-08).

##### Sync Shapes

**Explanation (For Nathan):** When two devices change the same file before syncing, Pommora merges the two versions, and how finely it can merge depends on how the file is laid out. The property list merges well in general, one setting at a time. The weak spots are: a property deleted on one device while edited on the other ends up as a broken, invisible scrap that sits in the file forever (a test currently pins that as intended); two devices creating a property with the same name leaves one hidden with no notice; option lists, assignment lists, and the removed-values stash each merge as one indivisible item; and a page's own front matter isn't merged at all, so two devices setting different properties on one page lose one of the two edits (it survives only in the conflict capture). A Space's settings file is the one property shape that already merges cleanly.

**Evidence:** 08 Sync Shapes (VERIFIED rows). Delete-versus-edit: `mergeKeys` treats a deleted side as empty (`jsonMerge.ts:36-43`, re-read) under `{defs: 2}`, producing `{ defs: { P: { name: 'New' } } }`, pinned by `mergePolicy.test.ts:130-136` (re-read; it uses a `name` field the schema doesn't have), which `normalizeRegistry` files as `unadmitted` and `mutateRegistry` re-writes forever (08-01, 08 L1). Fold-equal definitions: a registry read hides every later definition whose label or key folds equal to an earlier one's (`propertiesRegistry.ts:28-36`), so two devices each creating "Priority" leave one invisible (01 ledger). `select_options`/`status_groups` merge whole (I-006). Collection `properties` and `property_cache` merge whole (03-02, 08-06). Page frontmatter isn't merged JSON (`mergePolicy.ts:20-21`; `base.ts:57` keeps no page base bytes) (08 Approach D). `_space.json` merges per root key. Journal files are excluded from sync (`exclusion.ts:58`), so crash-recovery records stay per device (04 Approach A).

##### Value Surfaces

**Explanation (For Nathan):** Values show up in table cells, card fields, the Properties panel, pickers, filter rules, group headers, and the right-click menus. They all draw values through one shared piece, which is good, but the logic for what happens when you click or right-click a value is copied three times (table, cards, panel) and a fourth version runs for the native menu. The copies have drifted in small ways you can feel: the panel's right-click on a File value offers less than the same right-click on a card; a filter's date picker uses the Nexus clock while a value's date picker uses the column's clock; the text editor pane and the one-line text field disagree on whether spaces-only counts as empty; and a few rough edges ("Open in TextPane" read aloud to VoiceOver) are plain accidents. Adding a File value from a card's chooser opens a typed-path field while every other route opens the system file dialog, which is how cards are meant to handle files [Intended as J-7].

**Evidence:** Nine render sites and six editor-opening sites; every surface reaches `assignValue` (06 Counts). The intent maps (`TableView.tsx:134-156`, `CardValue.tsx:74-94`, `PropertyPanel.tsx:286-304`, re-located at HEAD), the right-click chains, three editing-state types, and three link-seat lines are hand-wired copies (06-01). `runPropertyAction` → `pendingPick` → `ValuePickPresenter` is a fourth router (06-02). `PropertyPanel.tsx` holds five jobs (06-03). The pick rule is written for one row and for N (06-04); `ValueWriter` is assembled three ways (06-05); the panel row menu is a parallel vocabulary (06-06). The filter-clock split (06-09, L-15), Text's two encoders (06-10), and the panel File menu (B-06-01) are behavior divergences; the Cards File pane (06-07, L-01) is intended. `TextCell` opens three store subscriptions per instance and `Cell` re-scans the schema after `resolveFieldValue` did (06-08, INFERRED cost). `TYPE_META`, pane targets, and `columnLabel` live in `Cells/` though none is a cell (06-11).

##### Schema Surfaces

**Explanation (For Nathan):** The Properties pane in Collection Settings is where you create, rename, and configure properties and their options. Each type's settings editor is built its own way, so spacing differs between them, and two have outright spacing bugs: hiding the Day row in a Date editor leaves an extra gap, and in the Number editor every row that can appear or disappear lost its spacing. The pane mixes settings that apply everywhere in the Nexus (a Number's format, a Link's color) with settings that apply only to the current view (how a column looks) without saying which is which, and the word "Format" means a Nexus-wide setting for Links and Numbers in the pane but a per-view look in the column menu. Option Style is offered twice in the same pane. The Decimals picker says "Hidden" when nothing is set, while cells actually show decimals.

**Evidence:** Five editors sit in four containers (05-01); `rowRhythm`'s `:first-child` zeroes the margin of every revealed row, because each revealed `MenuItem` is its `Reveal` inner `div`'s only child (B-05-01, re-read `number-editor.css.ts:1-12`); the DateTime inline `gap: 4` leaves 4px under a collapsed Day row (05-01). One look concept is placed three ways and "Format" names two layers for Link and Number (05-02). The frame filters reserved ids because admission doesn't refuse them (05-03). The property delete flow is hand-rolled in the frame (05-05). `useGhostOptionAnchor` repeats `useGhostAnchor` (05-06). OptionEditPopup restates the kit's header and footing, and neither fits as-is (05-07). `paneDrop.tsx` is a kit-only model filed in Properties (05-08). The inline-rename store slice has one reader and one writer (05-09). OptionOrderList is a grab-bag (05-10); OptionEditor rebuilds a definition that misstates a Select (05-11). Decimals, denominator, draft id, FileEditor ownership, and two write spellings are small data-layer decisions held in the UI (05-12).

##### Views Integration and Hot Paths

**Explanation (For Nathan):** Views (tables, cards, boards) filter, sort, and group pages by their property values. Each type's view behavior — which filter operators it offers, how it sorts, how it groups — is decided in about fifteen separate places. On large Nexuses, a few things may be slow: every single value edit re-runs the whole view (every row filtered, sorted, and grouped again), dates are re-parsed from text on every pass, and each cell looks up its property in a list instead of being handed it. None of this has been measured, since no benchmark Nexus is built. One real bug: a filter rule with an unreadable value (for example, letters typed into a Number filter) passes every row, so inside an "Any" group it makes the whole group match everything.

**Evidence:** The Per-Type Branch Map lists about 40 sites (07). `resolveFieldValue` scans `schema.find` before its memo; 23 view-side id lookups and 21 `declaredType(` calls; an optional `contextIds` defaulted in a dozen places (07-01). The filter re-parses constant operands per row, and unreadable operands and inapplicable known ops return `true` (`filter.ts:165-166`, re-read) (07-03). The shown-text projection is written twice and the copies differ (07-04). Every value write re-runs flatten, filter, sort, and group (07-05, INFERRED cost). Four ways to get a column's resolved style (07-09); three deciders of "operands name whole options" (07-11); `SettingsFrame` derives the schema by hand (07-12); creation seeds copy `assignValue`'s split (07-14); two hide paths (07-16). The Matrix compiles the filter once per Space (07-10, INFERRED) and GroupFrame's date list refetches values (07-17, INFERRED). Empty values sort by five unrelated rules (07 ledger, accident). A reorder into another sort run silently rewrites the sorted value (07 ledger).

##### Placement and Vocabulary

**Explanation (For Nathan):** Several pieces sit in the Properties folder only because Properties wrote them first — the shared multi-file update machinery, the crash-recovery slot, a general list-ordering helper, the vocabulary for how links display, the filter-pane targets, and a page-row builder for views. Inside the folder, files that run in the app's background process sit beside files that draw the screen, with nothing in their names to tell them apart, and words like "value", "schema", "Remove", and "held" each mean several different things.

**Evidence:** 25 engine files and 10 renderer or renderer-only files share `Core/Properties/` (08 Engine/Interface Split, re-run). "Schema" means three things (08-12). `rowOrder.ts`, `pageRow.ts`, the pane targets, and the link-display vocabulary are generic or belong elsewhere (08-08, 08-11, 01-08, 06-11). Engine files carry display labels (08-07). Seven value-named files (02-08, 08-12). "Remove", "held", and the channel prefixes each mean several things (03-10). `governedSweep`/`governedWrite` can't move into `Core/Files`, whose imports stop at Nexus leaf utilities, so I-042 part (2) holds only for `journalSlot` (02 A-01, 04-14). `Cells/` and `Pickers/` hold non-cell and non-picker modules (06-11). `OptionOrderList.tsx` exports pane-row helpers (05-10); `paneDrop.tsx` holds kit vocabulary (05-08).

##### Tests and Describers

**Explanation (For Nathan):** The property tests and documents have drifted from the code. Tests check the same rule in many files at once (one rule appears seventeen times across twelve files), carry leftover labels from old planning rounds in their titles, and in a few places pin behavior that's already gone. The Properties feature document mixes an overview with low-level mechanics, and about a dozen of its claims are now false. Several Issues entries cite stale line numbers or propose moves the code rules out. The option-picker test script fails because it still expects a confirmation for clearing an option from one page, which Pommora stopped asking for on 10-19.

**Evidence:** `Core/Properties` holds 56 test files (14,657 lines) beside about 8.1k source lines (09 intro). Configuration reach is pinned once in its unit and again in every caller (09-03); each file hand-rolls its own Nexus seed and definitions (09-04); about 31 titles carry plan-round tags (09-06); the exact-key rule is pinned 17 times in 12 files (09-07); the slot's non-displacement rule in four files (09-10, 04-16); change-detector and legacy-vocabulary tests (09-12, 09-15); about 13 test-only or unread exports (09-09); comments claiming ghost constraints (09-11). PropertiesPM claims (09 Doc Claims, 09-05, 03-15, 06-15, 08-14). **Settled here:** the Option Picker Drive's failure at `156264f2f` is drive staleness: `askHolding` returns without asking when `asksPastOne && r.value <= 1` (`confirmations.ts:177-186`, re-read), `5e3aee180` (10-19 10:52) gave Clear that threshold, and the drive's last edit `8d85ed855` (10-19 02:50) predates it, so `live-drive.mjs:170-173` asserts a dialog that correctly never opens and then clicks a button that doesn't exist. The second half of the orchestrator's note (Drive Two's cell reading empty while its file held Alpha) stays under *§Unverified*.

---
#### What Leaves, Narrows, and Changes

This section lists the work that changes nothing a user sees: removals, merges, and moves the plan can carry without a ruling. Deltas are production lines unless marked as tests, and "read" or "inferred" follows each scout's confidence. Work that follows from a decided direction cites it.

##### Legacy Residue

These remove code that only reads file layouts earlier Pommora builds wrote, which no live Nexus holds.

- **The Migration Layer:** The code that rewrites old type spellings and old view-setting names at every open goes. Delete `migrateConfig.ts`, `migrateConfig.test.ts` (74), `normalizeSavedViews.test.ts` (148), the two open calls and their import (`Nexus/handlers.ts:26,44-45`), adoption's `renamedSidecar` branch (`adopt.ts:28,109-113`), `LEGACY_TYPE_IDS` and the `propertyType` preprocess (`propertyType` becomes plain `typeIds`), `properties.test.ts:44-47`, `optionOps.test.ts:416-435`, `Nexus/handlers.test.ts:165-178`, the `PropertiesPM.md:8` clause, and the open-time `rmwJsonStrict` pass over the Trash, the Archive, and tile documents. Respell `restoreScrub.test.ts:287,310` and `mergePolicy.test.ts:122-124` to camelCase (01-02, 08-03/09-01). **Delta:** about −90 production and −315 with tests for the whole file; the property half alone is about −38 production and −70 to −110 tests (08-03's scope), and the saved-view `RENAMED` half is Views residue riding in the same file (read).
- **Keep the Registry's Per-Field Merge:** Sync keeps merging property settings one at a time, with its test and example explained by the real reason. `{defs: 2}` stays; `mergePolicy.test.ts:120-128` is re-based on a rename racing an option or icon edit, and `NexusSyncPM.md:63`'s example is rewritten to that case (B-08-01). **Delta:** one test and one doc line.
- **Legacy Hidden-Group Keys:** The old way of remembering hidden groups stops being read. Delete `legacyBucketKey`, its three call branches, the `clearHiddenBuckets` legacy clause, the year sniff, and the eight tests pinning them (07-06). **Delta:** −35 / −60 tests (read).
- **Legacy Test Shapes:** Tests of file shapes no Nexus holds go. Delete `propertyValue.test.ts:245-247`, `deleteProperty.test.ts:303-332`, `columnStyles.test.ts:13-16,34-43` (keeping the `defaultStyleFor('file')` line), and retitle `value.test.ts:81` (09-12, 09-15, 09-06). **Delta:** about −70 tests (read).

##### Type Facts

These make each type's facts live in one place a reader can find, without changing what any type does.

- **Two Records, One per Side of the Boundary:** Each type's facts move into one table for the background process and one for the screen. The engine `PROPERTY_TYPES` gains `label`, a connections field (`'value'` on Link, `'prose'` on Text), `registersMembers`, and `blankDraws`; `CREATABLE_TYPES` moves beside it. The renderer record (today's `TYPE_META`) absorbs icon, chip shape, chip default glyph, and the style-menu label, so `optionShapeFor` leaves UIX and `styleMenuLabel`, the two registration `=== 'multiSelect'` checks, and the four checkbox blank-rule sites read a field (01-01, 01-05, 06-09, 06-14, 06-02's two editability facts "user-made" and "fillable"). Table widths and alignment stay in `useColumns.ts` (01-01). The Select chip's default glyph stays `'tag'` [Intended as M-1]. **Delta:** −10 to −25 (inferred; relocations, not deletions).
- **One Reserved-Columns Table:** Title, the timestamps, and Location get their names and icons from one table. `RESERVED_COLUMNS` keyed by reserved id carries `{ type, label }`, and `RESERVED_LABEL`, `STAMP_TYPE`, `TITLE_TARGET`/`LOCATION_TARGET`/`STAMP_TARGETS`, and `rowGlyph` read it; "Title" is spelled once (01-04). **Delta:** −20 (read).
- **One Options-From-Labels Builder:** Picker choices built from label lists are built one way. Delete `Schema/linkFormatOptions.ts` and call `lookOptions(LINK_DISPLAYS)`; one `pickerOptions(values, labels)` serves the remaining label maps (01-09, 05-04/08-09). **Settled here:** the helper can't sit in `UIX/Pickers/PickerControl.tsx` (08-09's home) while `lookOptions` stays in `columnStyles.ts`, because `columnStyles.ts` is in the engine graph and `engineGraph.test.ts` forbids any `.tsx` and pins an exact UIX leaf list (`:23-37`); it lands in the renderer label module 08-07 creates, after the label tables move there, and `pickerOptions` is the name (`labelled` is taken at `properties.ts:115`). **Delta:** about −25 / +4 (read).
- **Small Catalog Moves:** Helpers move next to the code that uses them, and unused exports close. `KEY_REFUSAL`/`RESERVED_NAME_PREFIX` to `schema.ts`, the two seeds to `registryProperty.ts`, unexport `TypeSpec`, `NUMBER_FAMILIES`, `NumberPart`, `StoredColumnStyle`, `numberDivisor`, and rewrite the `optionsOf` comment and `properties.test.ts:267` without the ghost "type change" reason (01-10, 09-09). **Settled for 08-07 over 01-10:** `itemCount` stays engine-side, since `governedSweep.ts:60` and `KEY_REFUSAL.held` (`properties.ts:272-273`) read it. `formatPoint` calls `showsWeekday` (01-13). **Delta:** about −5 (read).
- **Bucket Labels Leave Properties:** The labels for date groups move to the view code that groups them. **Settled here:** `formatBucketLabel` moves to `Views/Pipeline/group.ts` beside its inverse `dateBucketKey`, with its test, as 01-14 proposed over 07-15's `bandModel.ts`. The Pipeline module keeps a bucket's key and its label beside each other; `bandModel.ts` is the label's only caller but holds no bucket keys. `NUMERIC_FORMATS` stays in `formatValue.ts` as date-form vocabulary: its readers are `formatBucketLabel` and `GroupFrame.tsx:52,210`, so moving it with the label into either Views module would leave `GroupFrame.tsx` importing a bucket module for a date-form fact. **Delta:** ±0 (read).

##### Values, Writing, and Undo

These give the value write one owner and one parse per write.

- **One Governed-Root Module:** Everything that lands one value in a file lives in one module, and each edit reads the file once. `Nexus/governedRoot.ts` holds `GovernedWorld`, the three world builders, `reconcileGovernedRoot`, one `reencode` (replacing `reconcilePropertyValue` and the two hand-rolled copies at `contextResolve.ts:112-128` and `assignment.ts:57-61`), `writtenSpelling`/`checkedSpelling`, `writtenRoot`, and one `rewriteRootAt(file, rewrite, preserveTimes)` built on `sweepParse` + `rewriteRaw` that answers `not-found` itself. `governedWrite.ts` goes; the banner passes `raw => landValue(raw, 'banner', v)`; `landPageValue` folds into its op; callers' existence checks leave; the reconcile's `{}` mode flag becomes an explicit `mode` (02-03, 02-04, 02-06, 02 A-01). **Delta:** −25 to −35 (read).
- **The Encoder Stops Refusing:** A check against a value shape that can't reach it goes. `valueToWrite` returns `unknown`, keeping the exhaustive `never` check; the `Result` plumbing, `invalid-property`, and the cast test go (02-01). **Delta:** −20 to −25 / −15 tests (read).
- **Codec File Narrows:** The value file keeps only reading and writing values; restore, adoption, and number parsing move to their owners. `propertyValue.ts` keeps the union, decode, encode, option words, checkbox reading, and blank predicates; `unregisteredMembers` → `optionOps.ts`; `Frozen`/`frozenWorld`/`gonePageEntry` → the Trash side, with 04-11's one `frozenOf` builder only alongside that move; `readNumber`/`spelledNumber` move beside decode/encode so `formatValue.ts` leaves the engine graph (02-04, 04-11, 08-07). The stale `:29` comment goes. **Delta:** −10 to −15 (read).
- **Test Seeders Use the Real Write:** Tests stop writing values a way the app never does. `writePageValue`/`writeSpaceValue` go; seeds route through `settledMutate` when a test means "a user wrote this" and through `putJson`/`seedSpaceSidecar` when it means "the file holds this"; `land*` exports leave once `writePathRace.test.ts:75-82` pins the lock rule through `setPagePropertyOp` (02-07, 09-02). **Delta:** about −15 production, −23 fixture (read).
- **Names and Small Merges:** Files named "value" get names that say what they hold, and small duplicates merge. `pageValue.ts`'s list edits move to `Files/rootValues.ts` and `valueEditRewrite` to `optionOps.ts`, deleting the file; `value.ts` becomes `fieldValue.ts` with `fileName` moving to `linkValue.ts`; `pageValuesOf` folds into `loadValues.ts` (02-08). `resolveAssignedSchema` leaves with 08-02's one home per definition (02-11, *§Multi-File Updates and Reach*). Title reads as `{ kind: 'text' }` and `filter.ts`'s title branch goes, keeping `textValue`'s `select` arm (02-15) [Intended as F-3]. Create-with-seeds writes once (02-16). The registry read goes through `cachedParse` (08-05). **Delta:** about −25 (read).
- **`buildValueContext`:** A one-line helper goes unless another change gives it a job. Conditional. 02-12 deletes it and `valueContext.test.ts` (−45, mostly tests), but 06-08 still proposes building the two heading settings onto `ValueContext` there, which gives the builder a job; 06-08's `defById` half was dropped for 07-01. The plan picks one when it lands 06-08.

##### Schema Mutations

These make every schema change follow one lock rule and one channel shape.

- **One Lock Rule:** Every change to the property list waits its turn the same way. Every entry that writes the registry or a schema sidecar takes the schema lock, and `schema:add` becomes one hold with an in-hold rollback; `rekeyProperty`'s in-commit `validateName` stays for outside writers, with its comment rewritten to that reason (03-04). **Delta:** ±0 (read).
- **One Configure Channel:** Five near-identical ways to save a property setting become one. `property:configure(id, patch)` replaces the five `defEditOp` channels, narrowed by one zod `partial()` pick with the file-directory check inline; `property:setFormat` folds the two format setters; `registry:reorder` becomes `property:reorder` (03-07/01-07, 03 Approach C, 05 Approach 2, I-032's Properties slice). **Delta:** −25 to −40 (read).
- **Restore Trusts Create:** Restoring a property from the Trash stops re-checking what creating it already checks. `createProperty` returns the landed definition, and `restoreInner`'s `'exists'` pre-check, read-back, and second tree read go, keeping today's refusal message (03-08). **Delta:** about −8 (read).
- **One Holder Pass:** Finding which files hold a property reads each file once instead of up to four times. One `keyHolders(root, keys[])` pass answers which keys each candidate holds and values by id for pages and Spaces; the rename clash checks `to` only on `from` holders; `snapshot` drops its Space loop (03-06/04-09). **Delta:** about −20 (read).
- **Small Ones:** Small encodings, names, and duplicate edits get one clear form each. `optionCascade`'s `null`-in-a-tuple becomes a `rename | remove | clear` union with a `switch` (03-11); Remove's inline `mapViews` goes, so `reachConfig` owns every view edit (03-13, −3); `refillValues` moves beside `sweepRootsById`, `assignedDefs` folds into the holder resolver, and `writePropertyBundle` unexports (03-14); `removeProperty` → `unassignProperty` and `holdings.ts` → a name for Trash links (03-10); `propertyDraft.id` becomes optional and `number_denominator` decodes positive [Intended as L-3] (05-12; the field carries `.catch(undefined)` at `properties.ts:190`, so a stored non-positive value reads as unset, which the formatter already does, and the definition stays admitted). **Delta:** about −5 (read).

##### Multi-File Updates and Reach

These narrow the work done on every open and every property change.

- **Registration at Open Reads the Index:** Registering Multi-Select words at open reads Pommora's index instead of every page. `registerHeldOptions(root)` reads members from `readPageRelations(paths).pages[*].values` instead of walking every Multi-Select Collection's pages (04-06/03-12). **Delta:** −5 (read; scale unmeasured).
- **One Home per Definition:** Collections remember property ids instead of copies, so a synced property no longer forces a full re-read of the Nexus. `CollectionNode` holds `propertyIds` as written; `containerSchema` and a new `holderSchema` (08-13) resolve against a registry map memoized on `config.registry` identity; `repointRegistryInTree`, `resolveAssignedSchema`, the `arrived` walk branch, and per-event `registryOf` go, and `SettingsFrame.tsx:76` routes through it (08-02, 08-13, 07-12, 03-14). **Delta:** about −45 / +15 (read; walk cost inferred).
- **Repair Builds Its World From the Tree:** The on-open repair builds its picture of a page from what Pommora already holds. `runRepairSweep`'s async `defsByFolder` memo becomes one synchronous builder shared with `pageWorldOf` and `scrubReturning` (04-10). **Delta:** −12 (read).
- **Dead Field and Duplicated Tests:** A field nothing reads and a duplicated test file go. `RenameJournal.skipped` goes (04-04, −12); one slot test file sits beside the slot (04-16, −30 tests).
- **Homes:** Shared machinery moves out of the Properties folder to where its users are. `journalSlot.ts` → `Core/Files`; `governedSweep.ts` → `Core/Nexus` beside `governedRoot.ts`; `unsweptLine` beside the notification copy; `keyHolders.ts` → `Core/Index` per I-042 (04-14, 02 A-01). **Delta:** ±0.
- **Issue Edit:** One Issues entry is narrowed to what's still open. I-039 is re-scoped to Sync arrivals, adoption renames, and outside moves (04-12).

##### Views Integration

These state each view question once and stop re-resolving a column per cell.

- **Columns Carry Their Answer:** A view works out each column's type and property once instead of per cell. `resolveColumns` returns `{ id, kind, type, def }`, the three hand-built `ResolvedColumn`s resolve the same, and one compiled `fieldOf` serves `prepareRule`, `buildCriterion`, and grouping; `columnType`, the hot-path scan, and every optional `contextIds` default go (07-01, 02-13, 06-08's lookup half). **Delta:** −60 to −100 (read sites, inferred delta).
- **One Shown-Text Projection:** "A value as the text you see" is computed one way for filtering and sorting. `shownText(value)` in `formatValue.ts` replaces `textValue` and `sortText`, keeping a `select` arm (07-04). **Delta:** −15 (read).
- **Smaller Views Folds:** New views stop storing redundant hidden lists, and small view duplicates merge. A new view mints `hidden_properties: []` and the two mints drop their `schema` parameter, retiring `pickView`'s WeakMap (07-08, −15); view hosts own one memoized style map and `useStyleFor` goes (07-09, −20); the operand class rides the per-kind op table that `configReach.optionRule` reads (07-11, −5); `patchedValues` shared by `withSeeds` and `assignValue` (07-14, −3); `commitHide` calls `hideShown` (07-16, −2); `groups?: 'option' | 'date'` declares the date family once (07-02 smallest step, ±0).

##### Value Surfaces

These collapse copies of one value interaction into one, without changing what a click does.

- **Pick Model and Writer:** The rules for picking a value and the write hookup are written once. One pure `Pickers/pickModel.ts` holds `pickGroups`, `pickShape`, `toggleValue`, `syntheticContextDef` (whose future planning settles with Context staying a property type, [Intended as F-1]), the N-row rule, and `pickedValue` as its one-row case; `massAssign.ts` merges in (06-04, −40 to −60). One `useValueWriter` hook and one `oneShotWriter` replace three writer assemblies (06-05, −20 to −30).
- **Moves and Names:** Misplaced and misnamed files move or get accurate names. `propertyMenuBranches` → `Actions/propertyRows.ts`; `cardValueInput.ts` → `cardColumns.ts`; `valueField.tsx` takes a name for what it holds; `text-pane.css` optionally renamed for both components (06-11, 06-12). **Delta:** about −10.
- **The Value Seat:** Merging the three click-and-menu copies is carried as *§Approaches* B, shaped by the value-surface directions [Intended as J-3, J-7].

##### Schema Surfaces

These tidy the Properties pane's code without changing what it shows.

- **Small Folds:** Small duplicates in the Properties pane's code merge. `useGhostOptionAnchor` goes and both sites call `useGhostAnchor` (05-06, −4); the inline-rename store slice becomes `useState` (05-09, −12); OptionOrderList's helpers move to a Views/Settings pane-rows module with one shared order row (05-10, −12); OptionEditor takes `def`, `OptionRow.tsx` becomes `OptionSlot.tsx` folding in `OptionDraft` and `compactTitle`, and internal types unexport (05-11, −15); `handleDrop` becomes a `switch`, `paneDrop` moves to `UIX/Menus` with neutral names, and `nexusReorderIndex` → `fullOrderIndex` in `UIX/Utilities/moveItem.ts` (05-08, ±0). One write spelling per channel family (05-12).
- **Delete Flow Ownership:** The property delete's confirm-and-notify steps move to the one confirmation home [Intended as O-2]. The frame's hand-rolled delete flow moves there (05-05, net about +4). Under *Less Stuff* this is net-positive; it earns its place only if `property:delete` stays a direct channel, and folding the delete into `mutate` under I-032 removes the hand emit with no new function, which the plan prefers.

##### Placement and Vocabulary

These move generic modules to their owners and let file names say which side they run on.

- **Moves:** Generic pieces move to the folders that own them. The link-display vocabulary → `Connections/linkValue.ts`, with labels following 08-07 (08-08); `resolveRowOrder` → `UIX/Utilities/moveItem.ts` and `pageRow.ts` → `Core/Views/` (08-11); display label tables and option lists → one renderer `.ts` module (08-07). **Settled here (pane targets):** `PaneTarget` and its builders move to one Views-root `Views/paneTargets.ts` beside `filterModel.ts`, as Reconciler B settled, over 01-08's Properties-root home. Four of six consumers are Views modules, the targets are filter, sort, group, and preview vocabulary, `PropertyPanel.tsx` already imports Views row types, and the module has to stay renderer-side anyway because it reads the renderer type record's icons; it's a `.ts`, not inside `filterModel.ts`, so a host-side per-kind table never inherits a renderer import (07-02's host-graph note).
- **Folder Shape:** The Properties folder's layout comes to show which files run where. The engine stays at the root, the ten renderer stragglers move into subfolders, and "schema" keeps one meaning (rename `Schema/` to `Definitions/` or `schema.ts` to `validation.ts`) (08-12). This lands last, in one pass (08 Approach C).

##### Tests and Describers

These make each test pin one intended behavior once.

- **Collapse Duplicates:** Tests that pin the same rule in many files pin it once. `configReach.test.ts` owns field-level reach expectations and callers keep their own decisions (09-03, −100 to −150 tests); one `seedNexus(root)` in `hostFs.ts` and one shared definitions module that `STATUS_DEF` and `fixtures/registry.json` read (09-04, −80 / +25 tests); `pageValue.test.ts:20-22,58-60` go (09-08, −15 tests); change-detector and DOM-nesting pins rewritten or dropped (09-12, −30 to −45 tests); PropertyFrame's two harnesses merge, history pins and `loadSpy` go, and false names are corrected (05-13, −40 tests); the two duplicate editor pairs collapse (06-15, −15 to −30 tests).
- **Strip Tags:** Leftover planning labels leave test titles. About 31 plan-round tags leave test titles and four stale titles are rewritten (09-06, 05-13). **Delta:** ±0.
- **Comments:** Comments that only restate the code go. `columnLabel.ts:10` and `setProperty.ts:14` go; `paneDrop.tsx:16-17` becomes one line (09-11, −8).
- **Decided Test Cuts:** Some test cuts follow decided directions. 09-07's sweep-side exact-key pins (−100 tests) and 09-10's slot pins (−150 tests) leave with the per-entity crash-recovery notes [Intended as B-1]; 09-14's popup re-keying tests (−150) leave with option ids [Intended as D-1], INFERRED until `useOptionEdit`'s addressing is sketched.

---

#### What's Reusable

These are mechanisms already in the codebase that the cleanup builds on instead of writing new ones.

- **`sweepParse` + `SweptPage.merge` + `rewriteRaw`** (`pageFile.ts:252-260`, `governedSweep.ts:77-85`): the one-parse single-file rewrite the governed-root writer is built on (02-06).
- **`sweepGovernedRoots`' basename dispatch** (`governedRoot` `:63`, `keysPutBack` `:174`): the shape loops 9-12 fold into (04-05).
- **`undoSweep` / `keysPutBack`** (`governedSweep.ts:151-182`): the text-level put-back a file-text undo reuses, sidecar arm included (02 Approach B).
- **`sweepCount`'s dry run** (`governedSweep.ts:113-114`): every holder count already ends there, so one `holders` read needs no new counter (03-05).
- **`cachedParse` / `forgetParse`** (`Files/walkCache.ts:34-58`, `atomicWrite.ts:36,51`): fresh-but-not-reparsed reads for the registry (08-05).
- **`rmwJsonStrict`** (`atomicWrite.ts:141-160`): the locked read-modify-write the Space value write keeps (04 Cross-Domain).
- **`containerSchema` / `NO_SCHEMA` and `entityMemo`** (`treePatch.ts:125-131`, `tree.ts:132`): the resolver and memo for one home per definition (08-02).
- **The content index** (`queryKeyHolders`, `readPageRelations`, `Platform/stores.ts:45-48`): every page's values, for registration at open (04-06).
- **`prepareRule`'s abstain** (`filter.ts:69`) and its hoisted `foldKey` (`:84`): the precedent for compiling operands once and abstaining on bad ones (07-03).
- **`editHiddenBucket` / `clearHiddenBuckets`** (`views.ts:359-382`) and **`visibilityModel.hideShown`**: the shared handlers collapse keys and the header hide reuse (07-07, 07-16).
- **`resolveColumns`** (`columns.ts:18-34`): already classifies each column once per view, so it carries `type` and `def` (07-01).
- **`useGhostAnchor`'s `optsRef`** (`ghostCreate.ts:38,49,65`): already reads `suppressed` fresh at fire time (05-06).
- **`MenuIndex` / `MenuRowView` / `Reveal`'s `data-reveal`** (`MenuIndex.tsx:122-176`, `Reveal.tsx:45`): one renderer and a sibling hook for a collapse-safe editor rhythm (05-01).
- **`cellMenuModel`'s `bare` kind** (`cellMenu.ts:26`) and **`valueMenuIntent`**: the panel's row menu maps through these (06-06).
- **`valueClickIntent`** (`valueClick.ts`): the one intent decision a value seat dispatches (06-01).
- **`styleMenuItems` / `defaultStyleFor`** and **`OPTION_LOOKS`/`CHECKBOX_LOOKS`/`NUMBER_LOOKS`** (`columnStyles.ts:12-14,133-155`): where a per-type looks record sits (05-02, 07-02).
- **`UIX/Utilities/moveItem.ts`**: already a pinned engine-graph UIX leaf, so order helpers move there with no test change (05-08, 08-11).
- **`settledMutate`, `hostFs.putJson`/`seedSpaceSidecar`, `fixtures/registry.json`** (`Core/Testing/`): seeding through the real write or the real file (02-07, 09-02, 09-04).
- **`propertyDefinition.safeParse`** (as `restoreProperty.ts:36` uses it): replaces `Bundles/rows.ts:91-96`'s hand decode of a trashed property's label and type (08 L7).
- **The engine and host graph tests** (`engineGraph.test.ts`, `hostGraph.test.ts`): they catch every boundary move this cleanup makes.
- **`make-benchmark-nexus.mjs`**: builds the Benchmark Nexuses every scale claim waits on.

---
#### Decided Directions

These are the directions that change something a user sees or something saved to disk, ordered by how much of the plan rests on them. Each gives the plain explanation, the decision-log entries the direction became, and the evidence; *Properties Deepclean — Decisions & Intention* is the one statement of what was decided.

##### Crash Recovery and How Big Changes Finish

**Explanation (For Nathan):** Before a change that rewrites many files — renaming or deleting a property, changing its Label Format, renaming or removing an option, renaming a Context or Space — Pommora writes a small crash-recovery note saying what it's about to do, so it can finish the job if the app quits partway or some file can't be reached. Today there's one note for properties and one for Contexts, each with room for only one change at a time. Because of that: while any change is still unfinished, a second rename or delete runs with no recovery at all; option renames, Value Format changes, and option removals on *every* property are refused with "An earlier change hasn't reached every file yet," even after you've confirmed them; if you rename the same Context twice before the first finishes, the first one's leftovers are forgotten after a restart; and a new property that happens to reuse a deleted property's name silently takes over that deleted property's unfinished cleanup. "Try Again" also works four different ways, and removing a property from a Collection or clearing an option offers no Try Again at all when some pages couldn't be reached — and the editor stays open on a property that's already gone. Every property, Context, and Space gets its own note, every big change updates the list before the files, a delete that can't reach every page finishes what it can and offers Try Again, and a name still owed to a deleted property's cleanup is refused until Try Again finishes that cleanup. Planning first lays out today's recovery files, which part of Pommora owns each, and how a change moves through them, beside the proposal.

**Options and Recommendations:** [Intended as B-1, B-2, B-3, B-4]

**Evidence:** 03-01/04-01/04-03 (the one slot, three policies, seven guards; I-036's two-clause rule holds only with clause 1 limited to cascading ops and `editOption` exempt); 04-02 (registry-last delete; the deferral rationale belonged to option removal, `13d7215d2`); 04 A-01 (a value write landing behind a registry-last strip, INFERRED); 02-09 (a Space value write reads its definition outside the lock a rename sweep honors, INFERRED; closes with the same lock rule); 04-07 (one replay point after the seed, with a tree re-read when a Context relocation is owed); 04-08 (four Try Again vocabularies; `MutateOutcome.retry`, the `from` branches, and `sweepAgain` leave); 03-03/04-13 (Remove and Clear skips: one `SchemaCascade` reply, Remove retry by record or by "cache block exists or a file still holds the key"); 03 L-06 (same-key create adopts an owed delete, accident), L-07, L-08; 04 ledger (Context delete puts everything back and refuses while property ops proceed and owe; `supersedes` loses a first rename's leftovers after restart); 04-04. Commit order today: rename is registry-first and resolves collisions by `NEW_KEY_IS_FRESHER`; Context rename is registry-last with a `'merge'` rule (`contextCascade.ts:32-33`) (04 Approach A). Journals stay per device (`exclusion.ts:58`). Estimate: −60 to −100 production plus a keyed slot (+15 to +25) for 03-01, −15 for 04-02, −30 for 04-08; about −120 to −180 across 04 Approach A, INFERRED.

##### The Removed-Values Stash

**Explanation (For Nathan):** When you remove a property from one Collection, Pommora takes its values off that Collection's pages and keeps them in the Collection's settings file, so re-adding the property brings them back. You chose this in July, before sync, and it stays. Three problems have surfaced since: it's the only copy of those values, and if two devices each remove a different property from one Collection before syncing, one device's values are gone and that property comes back as still assigned; entries for pages that later moved away or were deleted pile up forever, which drifted from your July ruling; and a Remove that misses pages can't be redone. The stash is fixed so it loses nothing, drops entries for pages that have left, and lets a Remove be retried, and planning looks for a better home for it than the Collection's settings file.

**Options and Recommendations:** [Intended as C-1, C-2; H-2]

**Evidence:** 03 L-01 (Nathan's intent: 7-2 Decision Log C-3/C-6, `052ceec63`, implemented `f85ccf2b3`); L-02 (stale entries, an agent's drift from C-6); 03-02, 08-06, 08 L9 (whole-key merge; `{property_cache: 2}` merges per property only with today's `values` wrapper, `jsonMerge.ts:36-43`); 03-03 (non-retriable Remove). Remove's Archive reach strips and caches archived pages (03 L-01). Flattening the vestigial `values` wrapper costs about −6 / +4; per-page merging under sync is a Sync rebuild input unless the stash's placement achieves it without a Sync rule. NexusOS and `~/Test` hold no `property_cache` (re-checked), so any reshaping or move needs no migration. Estimate: small, set by planning's placement, INFERRED.

##### Option Identity

**Explanation (For Nathan):** Options are known only by their label. Views remember them by label too — a custom sort order, hidden or collapsed groups, a filter's chosen values. That's why renaming an option makes Pommora rewrite every view, tile, and graph filter that mentions it, why the option editor needs extra work to keep a popup attached to an option while you rename it, and why sync must treat a property's whole option list as one item, so two devices each adding an option lose one. Every option gets a permanent hidden id, as properties already have, so views point at the id and a rename touches only the property list. Your pages keep storing the option's word, so Obsidian and the files read the same as now; only Pommora's own view settings show ids instead of words, and the NexusOS views that remember options by label (the Ideas Collection, the homepage, the Pommora Project tiles) are converted once. Collapsed groups are remembered by bare label today, so a group collapsed under one property stays collapsed under another with the same label; they become remembered per property, with NexusOS's current ones converted.

**Options and Recommendations:** [Intended as D-1, D-2; H-2]

**Evidence:** 09-14 (INFERRED payoff: whether the id retires popup re-keying or moves it to id lookups needs a sketch of `useOptionEdit`'s addressing); 07 Approach C (removes `configReach.ts:148-196`'s RENAME roles, `optionRule`, `scopedOrder`, `collapsedKeys`, and the rename half of `editHiddenBucket`; option delete still sweeps); 08 Approach B (one option shape on disk; its per-option merge is a Sync rebuild input); I-006 (`IssuesPM.md:183-213`). Readers: `decodeValue` would yield ids or the pipeline maps labels to ids. Live migration targets: `Ideas/_pagecollection.json` (`group.order`, `sort.order`, `collapsed_groups`), `.nexus/interface/homepage/_tiles.json` (`sort.order`, filter `values`), `.nexus/contexts/Projects/Pommora/_tiles.json` (`sort.order`, `collapsed_groups`) (07 survey). Collapse keys: 07-07 (CORRECTED; NexusOS views 0-1 hold bare labels, re-read; lowercase `open`/`closed` are already dead; deleting the grouped property clears structural keys, 07 ledger). 08-04's `group_id` strip [Intended as D-3] composes with the id. Estimate: tests about −150, code unknown (09-14); collapse scoping −15 (07-07).

##### Undo

**Explanation (For Nathan):** Undo for a value edit has two real defects. If a page's Context tag names a Space Pommora can't find — a typo from Obsidian, or a Space removed outside the app — and you change that tag, undoing deletes the whole tag, unknown names included. And if a property was written bare in the file (just "Status:" with nothing after it), undoing an edit writes "Status: null" instead of leaving it bare. Both come from undo re-sending what the screen showed rather than what the file held. Undo puts back what the file held, recorded by the part of Pommora that writes the file, only for the property you edited, so the small tidy-ups the edit made to other properties stay. Giving a Link value a new display name also gives the linked page that alias, and undoing the value takes the alias back too. Separately, a "clear" that changes nothing still tidies a page's other properties while the same clear on a Space doesn't; which one is intended is still open (*Decisions & Intention §Open Items*).

**Options and Recommendations:** [Intended as E-1, E-2, E-3]

**Evidence:** 02-02 (VERIFIED; `assignValue.ts:60-72` re-read: the context arm re-sends decoded `prior`; null path through `rootValues.ts:6-11` and `pageFile.ts:146,172`, `yaml` probe re-run); the direction is 02-02's (a) key-level put-back plus (b) the bare-`null` spelling fix, since `keysPutBack` re-lands parsed `was[k]` (`governedSweep.ts:169`) and still needs (b) for a bare `null`. 02 Approach B (removes `held` capture, the `restoreValue` op and its zod arm, `requestedValue`, `assignValue`'s `restore`, the renderer restore patch, and the context-arm divergence; costs a reply field on `MutateOutcome` or host-side undo state). 09-13 (I-063 is this deepclean's question; `restoreValue.test.ts` merges into the `setProperty` tests). 02-05 (an undo stops picking up a foreign word added outside the app between edit and undo). 02-14 (Space-only short-circuit). 02 ledger (alias undo, accident). Undo shape interacts with 06-05's `ValueWriter` (`rowOf`/`apply`), so this lands before 06-05. Estimate: about −30 / +28 (02-02, 02 Approach B ~−30).

##### What Counts as a Property

**Explanation (For Nathan):** The list of types a property can be also includes Created Time and Last Modified Time (the two timestamp columns) and, in places, Title. Those are built-in fields rather than properties: nothing in Pommora ever writes a property of those types and NexusOS has none, but one hand-written into the property list would show up as a dead or uneditable property, and guards across the app stop that from misbehaving. The two timestamps become their own kind of file-derived field, in the same category as a page's Aliases and its ID, and Title and Icon are built-in fields too; Context stays a property type. Planning looks at what already exists for these fields, and at how Icon is held today, before naming or placing anything.

**Options and Recommendations:** [Intended as F-1, F-2, F-3]

**Evidence:** 01-03 (CORRECTED; `PROPERTY_TYPES` stays keyed by column type), 05-03 (admission skips identity and origin checks; `PropertyFrame.tsx:202,204` and `visibilityModel.ts:17` filter in the UI), 01-11 (21 `PropertyType | 'title'` unions), 07-13 (Title's spec belongs on the built-in column record, not the stored-definition enum), 02-15. The stamp halves of the origin guards (`schema.ts:65-66`, `SortFrame.tsx:92`, `propertyMenuActions.ts:69`), the stamps' `NO_SETTINGS` rows, and stamp-typed fixtures leave. With Context staying a property type, how a stored `context`-typed definition reads, what `schema.test.ts:81` pins, and whether `syntheticContextDef` and its six call sites stay are planning's to settle (01 Approach B). "Metadata" already names the page metadata in `Core/Nexus/pageMetadata.ts` and `.nexus/metadata/`. NexusOS's 15 definitions hold no reserved id or non-user type (05-03). Estimate: −10 to −30 (01-03's stamp half), −15 to −30 (01-11), −15 (07-13), −6/+2 (05-03), INFERRED.

##### Where a Property or Tag Reaches

**Explanation (For Nathan):** When you rename a property, Pommora updates pages inside Collections and the Archive. When you rename or delete a Context or Space, it updates *every* page in the Nexus, including loose pages outside every Collection — NexusOS has one, a quick-filter page in the Agenda folder that holds a Context tag. That difference was never stated as a rule. To find which Spaces hold a property, Pommora scans every Space's settings file on disk each time, while pages are found through Pommora's index. And when restoring from the Trash, a Space settings file that fails to update is silently ignored. Finding the files a change reaches runs through one shared mechanism for pages and Spaces, using the best available scan, and keeps the stated rule that a Context tag reaches any page, since a Context relation means something on any page; a failed Space update during a restore is reported as a warning.

**Options and Recommendations:** [Intended as G-1, G-2, G-3]

**Evidence:** 04-15 (CORRECTED; `sweepParse` admits loose files, `pageFile.ts:252-260`; `~/NexusOS/Agenda/II. Tasks/PM-QuickFilter.md` exists, re-checked; `sweepMembers` at `contextCascade.ts:66-76` re-read). 04-05 (sidecar arm scans every Space sidecar; `spaceArm` and `sweepRootsById` gate from the tree; `scrubReturning` and `refillTrashed` discard sidecar write failures while `scrubReturning` refuses on a page skip, `restoreScrub.ts:180`; tree-sourcing trades the disk truth `keyHolders.ts:13` and `spaceSidecar.ts:49` defend, matching what `queryKeyHolders` already does for pages; I-036's *Solution* proposes the tree-sourced half). Estimate: 04-15 about +1 (the stated rule); 04-05 −35 (read sites, inferred delta).

##### Sync Conflicts on Property Definitions

**Explanation (For Nathan):** If one device deletes a property while another edits it before they sync, the result today is a broken scrap of that property — just the edited setting, with no name or type — that sits invisibly in the property list forever and is rewritten with every change; a test pins this as intended. If two devices each create a property with the same name, Pommora quietly hides the second one and never says so. And two devices setting different properties on the same page lose one edit, kept only in the conflict capture. Sync's merge rules stay as they are while Sync awaits its rebuild, so these losses are recorded as inputs for that rebuild, and a fix lands here only where it removes a loss without adding a rule to how Sync works.

**Options and Recommendations:** [Intended as H-1, H-2]

**Evidence:** 08-01 (CORRECTED; a whole-on-absent rule would need a policy-scoped option widening `Depth` at `jsonMerge.ts:4`, since metadata shards rely on keep-the-field, `NexusSyncPM.md:63`); `mergePolicy.test.ts:130-136` re-read (it uses a `name` field the schema doesn't have); B-08-01 (why `{defs: 1}` is rejected); 08 L1; 01 ledger (fold-equal definitions hidden, `propertiesRegistry.ts:28-36,101,112-116`, a review-round rule from `9c2850b3b`, `85e8a9f89`/`585a6bef9`); 08 Approach D (`base.ts:57` keeps no page base bytes). The candidate rules are listed under *Decisions & Intention §Prospects*. Estimate: this deepclean's share is the `name` → `label` fix in `mergePolicy.test.ts:130-136`.

##### Style, Format, and Where Each Setting Lives

**Explanation (For Nathan):** The Properties pane mixes settings that apply everywhere in the Nexus (a Number's format, a Link's color and underline, a Checkbox's color, the options themselves) with settings that apply only to the current view (how a column looks, how a date is written), with no cue telling you which is which. The word "Format" is used for both: in the pane, a Link's or Number's "Format" changes it Nexus-wide, while in a column's menu "Format" changes only this view's look. A Link's display can be set in both places, with the view winning. Option Style appears twice in the pane (a footer picker and the right-click menu), Link offers no per-view look in the pane at all, and dates are formatted per view while numbers are formatted per property. Settings that apply only to the current view share one word, with one Style row for every type that has more than one look, and a Date property carries its own format that its columns follow unless a column overrides how it displays — the pattern Number and Link follow too.

**Options and Recommendations:** [Intended as I-1, I-2, I-3]

**Evidence:** 05-02 (CORRECTED; the per-type looks record sits in `columnStyles.ts`, not on `TypeSpec`, to avoid a cycle, settled with 07-02); 05 ledger (definition and view edits mixed with no cue; Link's and Number's "Format"; dates per view vs numbers per definition; option Style offered twice); 01 ledger (Link look stored in two places); 09-05 (look vs Style vs Format; the UI's "Format" for Link and a bar-capable Number is a deliberate `styleBranch` rule, `columnMenu.test:171-175`); 07 Cross-Domain (`PropertiesPM.md:150`'s "per-view link styling" Pending is stale). Estimate: −30 to −50 (05-02); the property-level date format with column overrides is new work planning sizes.

##### Value-Surface Edges

**Explanation (For Nathan):** Several small differences between the table, cards, and Properties panel come from copied code drifting apart. A filter's date picker uses the Nexus clock while a value's date picker uses the column's clock. The multi-line text pane saves spaces-only text as text, while the one-line field treats it as empty. Right-clicking a Link row's label in the panel offers less than its value does. Right-clicking a File value in the panel offers less than the same right-click on a card (no "Remove"). And the text pen's spoken label reads "Open in TextPane," a code name. Filters use the column's clock, spaces-only text is empty everywhere, the Link label gains Edit and Rename where that's the cohesive move, and the pen reads "Open In Editor." Four behaviors stay as intended: adding a File value from a card's chooser shows a typed-path field, unchecking a checkbox removes its key from the file, a row added to the panel stays shown until it resets on another page, and cards hide the chip remove button below 80% zoom. Today an added panel row survives moving between pages and resets only when the Nexus changes, and whether the panel's File right-click gains the card's actions hasn't been asked; both are under *Decisions & Intention §Open Items*.

**Options and Recommendations:** [Intended as J-1, J-2, J-3, J-4, J-5, J-6, J-7]

**Evidence:** 06-07 (L-01; the Cards File pane, kept); B-06-01 (the panel File menu, −10 if it lands); 06-09 / L-15 (filter clock; FilterFrame mounts `DateTimeValuePicker`, −25 with the chip merge); 06-10 (Text's two encoders, ±0); 06-06 (the Link label addition; panel row maps through `cellMenuModel`'s `bare` kind, −20); 06 L-02 (unchecking removes the key), L-05 (KNOB, `PropertyPanel.tsx:151-157` resets revealed rows on a Nexus id change), L-11 (zoom), L-14 (accident). 06-01's `dateTime` intent collapses only if Cards derives "no click-x" from the column type (`CardsView.tsx:518`), and the table passes no `hideable` (`TableView.tsx:288,296`).

##### View Edges

**Explanation (For Nathan):** A few view behaviors were set by earlier agents or happened by accident. A filter rule with an unreadable value (letters typed into a Number filter) passes every page, so inside an "Any" group it makes the whole group match everything. A Checkbox filter's "is not empty" passes every page. Empty values sort by five unrelated rules depending on type (empty numbers first, empty Selects last but first when reversed, and so on). With a single sort, dragging a row into another value's run changes that row's value. Deleting the property a view groups by also forgets which folder groups you had collapsed. The accidents are fixed: an unreadable filter value is ignored, which also changes which values a new page created in that view inherits; "is not empty" works for Checkbox; empty values sort last for every type; and deleting a grouped property keeps folder collapse memory. Drag-to-reassign stays.

**Options and Recommendations:** [Intended as K-1, K-2]

**Evidence:** 07-03 (CORRECTED; `filter.ts:165-166` re-read; per-kind `prepare` abstains; `filterSeeds` knock-on at `creationSeeds.ts:75-103`; reachable from the free-text number field, `FilterFrame.tsx:336-349`; −10 to −20); 07 ledger rows: checkbox `is_not_empty` (`filter.ts:231-240`, accident), empty-value placement (`sort.ts:36,41,47,52,73`, accident), sort-run reassign (`useViewHost.ts:75,109-119,199-209`, `2c15c767f`, agent's choice), grouped-property delete clearing structural collapse (`configReach.ts:212-214`, accident). Collapse scoping itself rides *§Option Identity*.

##### Property Editor Appearance

**Explanation (For Nathan):** Each type's settings editor in the Properties pane is built its own way. Hiding the Day row in a Date editor leaves an extra gap, and in the Number editor every row that can appear or disappear has lost its spacing, so only Decimals sits apart from its neighbors. Date rows have icons while Number, Checkbox, Link, and File rows have none. The option popup's title field and footer look different from the same pieces elsewhere in the app. The Decimals picker says "Hidden" when nothing is set, though cells actually show up to three decimals (or the currency's usual digits). A fraction denominator of zero or less is saved and silently ignored. Every editor shares one layout with its spacing fixed and its rows carrying icons as Date's do; Decimals keeps reading "Hidden"; a denominator of zero or less is refused; and the option popup's title field and footer stay as they are, with planning raising where they differ from the app's standard pieces.

**Options and Recommendations:** [Intended as L-1, L-2, L-3, L-4]

**Evidence:** 05-01 (CORRECTED; −90 to −130 across six files; a collapse-safe rhythm on the `[data-reveal]` wrapper), B-05-01 (VERIFIED, `number-editor.css.ts:1-12` re-read; a screenshot settles how it reads), 05-07 (the popup restates the kit's `InlineEditHeader` and `FootingItem`, and neither fits as-is; aria-label "Edit Icon" vs "Edit icon"), 05-12 (decimals, `NumberEditor.tsx:31-32`, `formatValue.ts:186-191`; denominator `z.number().positive()`), 05 ledger rows. Rendering editors as row specs is *§Approaches* G.

##### Display Defaults: Times and Chips

**Explanation (For Nathan):** A date column with no style set shows no time, even when the value carries one; "show the time" follows your Nexus clock only through a special saved word. A Select option's compact chip uses a tag icon while the Select type's own icon is a different one, and the feature document says they match. Every Status group you create yourself draws the same dashed-circle icon in compact view, because only the three starting groups have their own. Unstyled dates stay time-less, with the date's format moving onto the property (*§Style, Format, and Where Each Setting Lives*); the Select chip keeps its tag icon, with the feature document corrected; and user-made Status groups keep the dashed circle.

**Options and Recommendations:** [Intended as I-2, M-1, M-2]

**Evidence:** 01-12 (CORRECTED; no shape-only variant; `columnStyles.ts:80-83,100-104,118,130`, `useColumnStyles.ts:23-33`; NexusOS holds no `"time_format": "shown"`; its delta is set by I-2's design), 01-06 (`OptionChip.tsx:15-30`, `PropertyTypes.tsx:27`, `PropertiesPM.md:76`; a document fix), 01 ledger.

##### Small Things Saved to Disk

**Explanation (For Nathan):** Three small items change what's written to disk or shown from it. Each Status option stores the id of the group it sits in, even though it already sits inside that group in the file; nothing reads it, and a hand edit that leaves it out makes the whole property vanish. Every Trash entry records whether it's "partial" (some values couldn't be read when it was made), and nothing ever shows that. And deleting a property always creates a Trash entry, even when Pommora is set to use the system Trash, where the rule is to record nothing; there's no file to send to the system Trash for a property. Status options stop storing their group id, with NexusOS's property list stripped once; the partial mark shows on the Trash entry, and a restore that comes back partial tells you so; and property deletes keep their Trash entry in both modes.

**Options and Recommendations:** [Intended as D-3, N-1, N-2]

**Evidence:** 08-04 (CORRECTED; `group_id` re-grepped at HEAD, writers only: `optionModel.ts:35,49`, `properties.ts:144,304,313,323-335`, `viewHarness.tsx:68,74`; NexusOS writes it on 8 options; raw-preserving writes (`optionOps.ts:59-66`, `optionModel.ts:49`) would carry a stale id through moves, so a strip or an explicit drop in `moveOption` is required; 08 L8 accident; about −10 plus fixtures). 03-09 / 03 L-12 (CORRECTED; unread for every record kind, `Bundles/record.ts:54,70,80,88`, `Trash/delete.ts:142,159`, `Trash/gather.ts:83-91,127-133`, `spend.ts:156`; `NexusRecordPM.md:12` describes it; surfacing it on the Trash row and the restore notice is about +5, INFERRED). 03 L-11 (`deleteProperty.ts:46`; whether the Trash pane shows it in system mode is unverified).

##### Confirmations, Defaults, and Wording

**Explanation (For Nathan):** A handful of smaller items. Deleting a property or removing an option always asks, even when no page holds it ("stripped from 0 Items"). Clearing an option and changing a format ask only when more than one page is affected; removing a property from a Collection never asks. "Remove" means a restorable un-assign for a property but a permanent delete for an option, which reads the same in menus. Repair Properties On Open is off by default, though you have it on in NexusOS. A damaged property list stops the whole Nexus from opening, while a damaged Context list just blanks Contexts and says so. Creating a property whose name is taken quietly names it "Label 2." The value picker can create new Select and Multi-Select options but not Status options. An open editor whose property disappears shows "Property not found." instead of returning to the list. Delete exists only behind the editor's ⋮ menu. Every remove, clear, and delete confirmation counts its Items correctly, zero included, in one vocabulary from one home the Archive's and the Trash's confirmations share; an option's Remove reads Delete; Repair Properties On Open is on by default; a damaged property list opens the Nexus with Properties marked unreadable; a create under a taken name says it took a numbered name; an editor whose property disappears returns to the list; and planning recommends whether the picker creates Status options.

**Options and Recommendations:** [Intended as O-1, O-2, O-3, O-4, O-5, O-6; J-8]

**Evidence:** 03 L-04 (CORRECTED; `confirmations.ts:177-228` re-read; zero-count wording pending per `Archive — Planning Findings.md:12`); 03-10 (vocabulary); 02 ledger and 08 L5 (`personalization.ts:146`; NexusOS `repairOnOpen: true`); 08 L4 (`readKept` throws inside `readNexusConfig`, `readNexus.ts:286-288`; the Contexts arm `:313-322`); 03 L-05 (`registryProperty.ts:56-81`); 01/05/06 ledgers (Status inline create, `PropertyPicker.tsx:312`); 05 ledger ("Property not found.", `PropertyFrame.tsx:396-405`; Delete only behind ⋮, `propertyMenu.ts:19-30`).

##### Edge Rules

**Explanation (For Nathan):** These are rules earlier agents chose that work as designed but that you never asked for. They stay as they are, apart from the first, which changes.
- A Select or Status holding several words shows the *last* one Pommora recognizes, and removing that option reveals the one before it. It becomes: words no option names are ignored, the most recently added valid option shows, and the value tidies to that one option on the next change.
- Two properties, or two options, whose names differ only by capitalization or accents read as the first; the second disappears from view, and an option duplicate leaves the file on the next option edit.
- Re-adding a removed property doesn't bring back a value whose option was renamed or deleted in the meantime.
- Picking a Select value drops any unrecognized word that was there, while picking a Multi-Select value keeps unrecognized words after the picked ones; picking a Context tag drops unknown Space names.
- Any edit to one property also tidies every other property on the same page (a single-word Select becomes a list, duplicates collapse).
- Select and Status values are saved as a one-item list, so Obsidian treats that key as a list.
- Checkbox properties can't group a view; Context columns can't sort a view.
- Picking the same option across several selected rows clears it when every row already holds it, and sets it otherwise.
- The one-line text field edits only a value's first line; later lines ride along untouched.
- A custom option sort always reads in your custom order and ignores Default/Reversed.
- A restored Space loses an option deleted while it sat in the Trash.

**Options and Recommendations:** [Intended as P-1, P-2, P-3]

**Evidence:** 09 ledger (last option, `propertyValue.ts:121-126`, `f5ea8a144`; fold-alike first-wins, `9c2850b3b`; refill drops renamed-option values, `9aeb29271`; restored Space loses a deleted option, `0134cc02d`); 02 ledger (`keepingForeignWords` Multi-Select only, `eea82f191`/`88ad37ea0`; Context tag drops unresolved titles, `contextWrite.ts:42-56,134`; sibling re-encode, `governedWrite.ts:13`; one-element list, `propertyValue.ts:249-250`; mass toggle, `massAssign.ts:13-18`; first-line text, `b80a7b12a`); 01 ledger (checkbox doesn't group and Context sorts nothing, `ee86c919b`); 07 ledger (Custom sort ascending, `sort.ts:83-92`); `mutate.ts:81`'s comment overstates the never-drops rule for the written key itself (02 Cross-Domain).

---
#### Approaches

These are the larger restructures worth weighing; each says what it removes, what it costs, what it risks, and which decided directions it follows or what it depends on.

##### A · Removal-First Landing

This removes everything that's dead, legacy, or unread before anything else is reshaped, so later work never builds on it.
- **Removes:** the migration layer (01 Approach C, 08-03), legacy hidden-group keys (07-06), the encoder refusal (02-01), unread exports (09-09), `RenameJournal.skipped` (04-04), the legacy and change-detector tests (09-12, 09-15), plan-round tags (09-06), and stale comments (09-11).
- **Costs:** none for live Nexuses; a Nexus outside the three named ones would read a legacy type id as an unadmitted definition, which the settled scope accepts.
- **Risk:** low. **Depends on:** nothing.

##### B · One Value Seat

This makes clicking, right-clicking, and editing a value one shared piece instead of three copies plus a menu router.
- **Removes:** three intent maps, two identical right-click chains and the panel's third, three editing-state types, three link-seat lines, the panel's `page-value` menu kind, the `rename` intent, `valueMenuTarget.ts`, `fileValueMenu` (if the panel's File menu takes the card's actions, which hasn't been asked), two writer assemblies, and with the menu fold `ValuePickPresenter.tsx`, the type-deciding half of `pendingPick`, `CHECKBOX_OPTIONS`, and `valueCommitFor` (06 Approaches A and B). The file `PickTarget` arm and `adoptPathInto` stay with the Cards File pane [Intended as J-7].
- **Costs:** one `useValueSeat` + `<ValueSeat>` module (about 120 lines) and a host parameter shape (anchor, hideable, commit, the panel's row-menu mapping); an app-level seat instance for off-surface menus, with Matrix's `pendingPick` hold following it.
- **Risk:** moderate: Cards' ghost hold, the table's title-action passthrough, and `lastOpened` popover keying interleave with the menu chain. Net −150 to −250, INFERRED until designed.
- **Follows:** the value-surface directions [Intended as J-3, J-7] and undo [Intended as E-1, E-2], since undo shapes `ValueWriter`.

##### C · One Crash-Recovery Ledger and One Mutation Runner

This keeps one record per property, Context, or Space, replays them at one point of the open, and runs every big change through one descriptor, with planning presenting today's recovery files and their owners beside it first.
- **Removes:** `contextJournal.ts` (folded into a record kind), `supersedes`, the `answered` branches, both `OWED` refusals, the unjournaled paths, the `record?` channel argument and `journalRecord`, the `from` Try Again path, `sweepAgain`, `MutateOutcome.retry`, the `createProperty` consumer, `owedKeys` and its two siblings (one held-keys read), Clear's special check, the four count functions, the shape-sniffing `property:holders`, and three of four reply shapes (03 Approach A, 04 Approach A).
- **Costs:** a keyed record format (+15 to +25), a rewrite of about 1,190 journal, replay, and wiring test lines, and every op's commit order made list-first and replay-tested again.
- **Risk:** crash-order semantics move. Land keyed records and one reply shape first; the runner only after, since 03-05's net depends on how much they already removed (03-05's stress). The Trash bundle as every delete's write-ahead (04 Approach B) composes with this rather than replacing it, since System Trash mode mints no bundle for content deletes. Dropping crash journaling outright (04 Approach C, about −300) is rejected: a rename re-run can't recover once the old key is gone from the registry.
- **Follows:** [Intended as B-1, B-2, B-3, B-4]. Estimate −100 to −180, INFERRED.

##### D · The Stash, Fixed and Placed

This keeps Remove's strip-and-stash and fixes the stash where it stands or in a better home (03 Approach B).
- **Removes:** stale entries for pages that left the Collection (03 L-02), Remove's non-retriable strip (03-03), and the vestigial `values` wrapper (08-06).
- **Costs:** a Remove retry that rides *§Approaches* C's records, the flattening (about −6 / +4), and whatever a new home costs.
- **Risk:** low; NexusOS and `~/Test` hold no stash, so nothing needs migrating. Losing nothing under sync is a Sync rebuild input unless the placement achieves it without a Sync rule. **Follows:** [Intended as C-1, C-2; H-2].

##### E · Option Identity in Views, and One Option Shape

This gives options a permanent id that views reference, and optionally one option layout on disk.
- **Removes:** the rename half of `configReach`'s view sweep, the popup re-keying machinery and its tests (INFERRED), and with the shape change `optionGroupsOf`/`withOptionGroups`/`SELECT_GROUP`, the nested `group_id`, and the declared-type branching in `optionsOf` (07 Approach C, 08 Approach B, 09-14). The layout's per-option merge (`{defs: 3}`) is a Sync rebuild input, so the shape change earns its place on what it removes outside Sync.
- **Costs:** an id field on every option, a one-time conversion of three NexusOS view files and its property list, and readers mapping labels to ids.
- **Risk:** Legibility in hand-read view JSON (views already show `prop_` ids) and the Concurrency locked decision. **Follows:** [Intended as D-1, D-2, D-3; H-2].

##### F · The Value Write's One Home, and Undo From File Text

This gives the value write one module and one parse per write, then optionally rebuilds undo from file text and stops the renderer from encoding.
- **Removes (F1, the module):** `governedWrite.ts`, `pageValue.ts`, `reconcilePropertyValue`, `landPageValue`/`landSpaceValue`, one parse per write, the no-world mode, and the encode refusal (02 Approach A). About −60 to −80, INFERRED; import churn across about 40 files.
- **Removes (F2, undo from text):** `held` capture, `restoreValue` and its zod arm, `requestedValue`, `assignValue`'s `restore`, the renderer restore patch, and the context-arm divergence (02 Approach B, about −30).
- **Removes (F3, the renderer stops encoding):** `applyValueAtRoot`, `withSeeds`' encode, the spelling and foreign-word divergences, and `rekeyOverrides` (02 Approach C, about −30); it touches the hot read memo, so it waits on a profile.
- **Risk:** F1 low; F2 moderate (undo's "file changed since" rule); F3 moderate. **Depends on:** F1 nothing; F2 follows [Intended as E-1, E-2]; F3 a Benchmark profile.

##### G · Type Editors as Row Specifications

This replaces the five type editor components with per-type row builders rendered by one menu index in one collapse-safe container.
- **Removes:** five components, `number-editor.css.ts`, the inline style, three look narrowings, the option-only footing, and two `STYLE_OPTIONS` (05 Approach 1, about −150 to −200 with tests).
- **Costs:** editor tests rewritten against rows; FileEditor's `useSession` read moves to the frame.
- **Risk:** low; `PathField` and the typeable Value row already fit `Trailing`. **Follows:** [Intended as I-1, L-1, L-2, L-3, L-4].

##### H · How Many Per-Type Records

This decides whether type facts live in two records (engine and renderer) or three (adding a Views per-kind record).
- **Two (01 Approach A):** the engine record holds data only (op lists, flags, connections, `registersMembers`, `blankDraws`); functions stay where they run; widths stay in Views. Small delta; the gain is one place to look.
- **Three (07 Approach A):** `Views/viewKinds.ts` keyed by `ValueKind` holds operators with operand class, `prepare`, sort keys and directions, buckets, and seeds; removes about 15 switches, `textValue`/`sortText`, `SEEDS_FROM_SORT`, `FROM_GROUP_KEY`, `KIND_OPS` as freestanding tables, and `wholeValues`. About +150 / −250, INFERRED. It must stay a renderer-free `.ts`, since host-side `configReach.ts` reads the operand class.
- **Weighed:** the third record earns its place by the boundary it owns (view behavior keyed by value kind, where the other two key by type and side), and it removes more than it adds, so it's preferred once 07-01's compiled columns land; landing it first would key it on a column taxonomy the file-derived fields and built-in Title change [Intended as F-2, F-3]. It also carries 07-03's abstain rule [Intended as K-1], so it can't ship as purely behavior-preserving.
- **Depends on:** 07-01's compiled columns. **Follows:** [Intended as F-2, F-3; K-1, K-2].

##### I · One Home per Definition

This makes Collections hold property ids and resolve them through one memoized resolver (08 Approach A).
- **Removes:** `repointRegistryInTree`, `resolveAssignedSchema`, the walk-on-arrival branch, per-event `registryOf`, and definition duplication in tree deltas.
- **Costs:** about 15 consumers.
- **Risk:** a render-path consumer holding `.properties` by reference must switch to the memoized resolver, keyed on `config.registry` identity. **Depends on:** nothing.

##### J · Fold the Property Channels

This makes the definition-config and format channels one each, and `schema:add` one locked hold (03 Approach C, 05 Approach 2, I-032's Properties slice).
- **Removes:** five bridge entries and their handlers. **Costs:** renderer churn in `PropertyFrame.tsx`. **Risk:** low; the narrowing must be an exact pick. Folding everything into `mutate` per I-032 also retires the frame's hand-rolled `storesChanged` emit (05-05). **Depends on:** nothing.

##### K · An Incremental View Pipeline

This patches a view in place after one value edit instead of re-running filter, sort, and group (07 Approach B).
- **Removes:** the per-edit O(N log N) rebuild the Hard Rule names. **Costs:** A real state machine with a full-rebuild fallback. **Risk:** a new class of drift bugs. **Depends on:** a Benchmark measurement; 07-05's derived-key memos are the cheap first step and may be enough. Not now.

##### L · A Seam-Shaped Properties Folder

This keeps engine files at the Properties root, moves renderer files into subfolders, and moves generic modules to their owners (08 Approach C).
- **Moves:** `rowOrder` to UIX, `pageRow` and pane targets to Views, the link vocabulary to Connections, display labels to a renderer module, `journalSlot` to `Core/Files`, and `governedSweep` and the governed-root module to `Core/Nexus` — not `Core/Files`, which 08 Approach C still names (02 A-01 settled it from the imports).
- **Costs:** about 25 file moves, line-neutral. **Risk:** churn only; best done last in one pass. **Depends on:** the other moves landing first.

##### M · Front-Matter Merge at Sync Landing

This merges a page's front matter key by key when two devices both edited it (08 Approach D).
- **Removes:** the largest property-value loss under sync. **Costs:** page base bytes kept in the database and a YAML-aware merger. **Risk:** high; Sync is desktop-only today. A Sync rebuild input gating Mobile, recorded under *Decisions & Intention §Prospects* [Intended as H-1].

---

#### What Contradicts the Source

These are documents, comments, test titles, scripts, and Issues entries that are false now or that the work will make false.

##### Feature and Reference Documents

- **`PropertiesPM.md:8`:** earlier spellings "still read, and are rewritten" (removed by 01-02/08-03); "a definition names its type by the displayed name in camelCase" is false for `dateTime`, `createdTime`, `lastEditedTime` (09 Doc Claims); "twelve types" changes as the timestamps, Title, and Icon leave the property types [Intended as F-2, F-3].
- **`PropertiesPM.md:15` vs `:68`:** "Date" vs "Date & Time" for one type (09 Doc Claims).
- **`PropertiesPM.md:20-22`:** Context and stamps are "never a schema definition" and "never persisted", while the read path accepts both (01-03).
- **`PropertiesPM.md:27, 128-134`:** "restore cache" and "value caches" for a store that isn't regenerable (08-06); its description follows the stash's placement [Intended as C-2].
- **`PropertiesPM.md:53`:** "every option references its group by id, so status semantics resolve by id"; nothing reads `group_id` (08-04).
- **`PropertiesPM.md:74`:** an implementation-level list of registration triggers, and "every file at open" changes with 04-06 (09-05).
- **`PropertiesPM.md:76`:** Compact renders "the option's own icon or the property type's default", false for Select, whose chip keeps its tag icon [Intended as M-1] (01-06); the option editor sits "under a Style toggle", but it's the footing below the list, and the ghost "New Option" chip goes unmentioned (05-13).
- **`PropertiesPM.md:117`/`:119`:** the Value Picker "runs through one control (`PropertyPicker.tsx`) across every surface" with "a file field for File" is false (06-15); the panel is introduced twice (09 Doc Claims).
- **`PropertiesPM.md:121`:** `**The Properties Menu.**` breaks the `**Label:**` rule.
- **`PropertiesPM.md:123`:** "their entry points queue on one lock" and "states its intent in a journal first" are both false today (03-04, 03-01, 03-15); 09's Doc Claims marked it holding, which the code contradicts.
- **`PropertiesPM.md:125-136`:** the mutation table is implementation-level (09-05); `:131` and the Delete row omit that a Label Format change or delete proceeds unjournaled while another record is owed (03-15); `:136` says Remove "re-runs cleanly after a partial run", false (03-03).
- **`PropertiesPM.md:138, 140`:** Repairs and Validation read as implementation notes (09-05).
- **`PropertiesPM.md:149`:** "range values" have shipped; keyboard stepping hasn't (09 Doc Claims).
- **`PropertiesPM.md:150`:** "per-view link styling" Pending has shipped for Format; only Underline and Color stay property-level (07 Cross-Domain, 09 Doc Claims).
- **`ConfigurationPM.md:115`:** Clear "asks regardless" of Confirm Before Deletion; it asks only past one Item since `5e3aee180` (09 Doc Claims).
- **`NexusSyncPM.md:63`:** its respelling example describes a merge reason 08-03 removes; rewritten to a rename racing another edit (B-08-01).
- **`NexusRecordPM.md:12`:** `partial` described as the record saying it's thinner than the truth; nothing reads it (03-09); it becomes shown on the Trash entry and on a partial restore [Intended as N-1]. The same line's "records nothing" in system-trash mode doesn't hold for a property delete (03 L-11).
- **`CollectionsPM.md:14`:** `property_cache`'s description follows the stash's placement [Intended as C-2].

##### Issues Entries

- **I-006 (`IssuesPM.md:183-213`):** "Option lists key on `value`" is stale vocabulary (options carry `key`); it omits `property_cache`; its Solution follows option ids, with per-option merging a Sync rebuild input [Intended as D-1; H-2] (08-14, 09 Issues Status).
- **I-032:** "seventeen property and schema channels" is now eighteen writing channels plus `property:holders` (09 Issues Status); the Properties slice lands here (03-07).
- **I-036:** two-replay citation `handlers.ts:82,102` is now `:86,:111`; its footnote's source report (`.claude/Planning/Data Layer — Investigation Reports/E — Governed Data Sweeps.md`) doesn't exist; its `assetMigrate.ts:162` cite is stale; clause 1 as worded would make a recolor wait (03-01, 04 Cross-Domain, 09 Cross-Domain).
- **I-039 (`IssuesPM.md:839`):** "nothing orders them" no longer holds for the app's page rename and move; re-scoped to Sync arrivals, adoption renames, and outside moves (04-12).
- **I-042 (`IssuesPM.md:1013`):** part (2) moves `governedSweep`/`governedWrite` into `Core/Files`, which their imports rule out; only `journalSlot` fits (02 A-01, 04-14).
- **I-063 (`[^63]`, `IssuesPM.md:1344`):** cites `Core/Nexus/page.ts:90-99` (now `propertyValue.ts:272`), `mutate.ts:185` (now `:198-202`), and `propertyValue.ts:224` (now `:284`); its Deferred question is answered [Intended as E-1, E-2] (02-02, 09-13).
- **I-064 (`IssuesPM.md:1073-1085,1345`):** "Key Format" is now "Label Format", and its footnote lines drifted; its Solution stands (05-13).

##### Code Comments

- **`properties.ts:78`:** "so they read forever" (09-11); leaves with 01-02.
- **`properties.ts:286`** and **`properties.test.ts:267`:** Justify keying `optionsOf` on the declared type by "a type change" no operation performs (01-10).
- **`propertyValue.ts:29`:** "Kept while the Status tag goes"; the Status tag is gone (02-04).
- **`registryProperty.ts:170`:** a race rationale the in-commit `validateName` already catches (03-04, 09-11).
- **`propertiesRegistry.ts:125`:** says ops that cascade queue on the schema lock; registry-only `editProperty` does and `reorderRegistry`/`removeFromRegistry`/`schema:add`'s create don't (03-04).
- **`mutate.ts:81`:** "never shrinks or drops a key it can't resolve" holds for siblings only (02 Cross-Domain).
- **`number-editor.css.ts:3`:** describes a rhythm the selector doesn't deliver (B-05-01).
- **`contextJournal.ts:1`:** "persisting the skip list updates the held record"; nothing reads it (04-04).
- **`columnLabel.ts:10`, `setProperty.ts:14`, `paneDrop.tsx:16-17`, `property-panel.css.ts:8`:** restate the types or carry unowned design claims (09-11).
- **`keyHolders.ts:13`, `spaceSidecar.ts:49`:** defend disk truth for Space candidates; rewritten with the one reach mechanism [Intended as G-1].

##### Tests and Scripts

- **`mergePolicy.test.ts:130-136`:** pins the fragment definition as intended, with a `name` field the schema doesn't have; `:120-128` uses the same field and the legacy respelling (08-01, B-08-01).
- **`value.test.ts:81`** "(snake_case PropertyType)"; **`columnMenu.test.ts:39`** "file Filename/Full Path" while `:49` asserts `[]`; **`cellMenu.test.ts:100`** "(its look is per-property)"; **`pageValue.test.ts:20,58`** "status" tests that run as Select (09-06, 09-08).
- **`PropertyFrame.test.tsx`:** `:202` "the footer create-row is gone" clicks the footer; `:255` and `:438` name `schema.delete` for `schema:unassign`; `:486` names `schema.rename` for `property:rename`; `deleteSpy` returns `unassignSpy` (`:244`) (05-13).
- **`keyHolders.test.ts:80-216`:** `describe('governedReach')` tests symbols that live in `governedSweep.ts` (03-15).
- **`cascadeRace.test.ts:58`** "F1 —" and about 31 other plan-round tags (09-06).
- **`journalWiring.test.ts:274-319`** and **`optionOps.test.ts:707`:** Pin the create-side consumer and the one-slot refusals that the per-entity notes and the owed-name refusal remove [Intended as B-1, B-4] (03-01).
- **`.claude/scripts/Option Picker Drive/live-drive.mjs:170-173`:** asserts a Clear confirmation at exactly one Item, which `5e3aee180` removed (settled here).
- **`.claude/scripts/reveal-parity/run.mjs:750`:** looks for `Forget Test` where the button reads `Delete alias`, and needs fixtures `~/Test` no longer holds; outside Properties (orchestrator notes).

---

#### Unverified

These are claims reasoned from the code but not yet run, measured, or reproduced, each with what settles it.

- **Mass Assign Cost (02-10):** Whether setting a value on many rows at once is slow. N independent writes; build `make-benchmark-nexus.mjs large` and time a mass assign over a few hundred rows. Any `setValues` shape extends `setProperty` with `paths[]` rather than adding an op.
- **Per-Cell Costs (02-13, 06-08, 07-01's delta):** Whether per-cell lookups and subscriptions cost a frame. The schema scan before the memo, `TextCell`'s three subscriptions, re-split text; a React profiler trace of a store write and a scroll on a text-heavy Table at Benchmark scale.
- **Whole-View Rerun per Edit (07-05) and Approach K:** Whether re-running the whole view after each edit is slow. Commit latency on `~/Benchmark-Large` with a date-sorted, date-grouped Table.
- **Whole-Nexus Walk on a Synced Definition (08-02):** How long the full re-read after a synced property takes. The walk's cost at 50k pages on a Benchmark Nexus.
- **Open-Time Registration (04-06):** How long the Multi-Select check at open takes. N stats under the schema lock at Benchmark scale.
- **Matrix Filter per Space (07-10):** Whether the graph's filter is slow with many Spaces. A Matrix filter timing with hundreds of Spaces; until then the signature cache is new machinery without evidence.
- **GroupFrame's Second Value Read (07-17):** Whether the date-group list's second read is worth removing. Whether a host seam costs less than the second read.
- **Space Write Race (02-09) and Delete Race (04 A-01):** Whether two rare timing races actually happen. A reproduction holding a write between its definition read and its lock while a rename or delete sweeps.
- **Journal and Runner Deltas (03-01, 03-05, 04 Approach A):** How much the crash-recovery rework removes. Measured only after keyed records and one reply shape land.
- **The Value Seat Delta (06-01, 06-03, Approach B):** How much the shared value seat removes. Unmeasured until designed.
- **Option Ids and the Popup (09-14):** Whether option ids retire the option popup's rename bookkeeping. A sketch of `useOptionEdit`'s addressing against an id settles whether re-keying retires or moves.
- **Number Editor Spacing (B-05-01):** How the Number editor's spacing looks today. A screenshot of a Number property's editor.
- **Stranded Ghost (05-06):** Whether a re-added option can show its "New Option" ghost too early. Whether an option re-added under the same label shows its ghost with no dwell, since the Properties sites skip `useClearStrandedGhost`.
- **The Drive's Cell Read:** Whether the option drive's empty cell is a real defect. Whether Drive Two's cell reading empty while its file held Alpha is a defect or a read taken before the Clear landed; re-run the drive with `live-drive.mjs:170-173` updated to the past-one threshold.
- **Title Filtering on Shown Text (07-13):** Whether any title would filter differently as plain text. A title holding literal `[[…]]` would filter and sort on its shown text; a repro settles whether any NexusOS title does.
- **The Unchecked-Site Count (01 Outward Map):** How many one-off type checks exist. About 25 ad hoc `=== 'x'` sites is the scout's tally, not re-counted.
- **Scripts README (09 Doc Claims):** Whether the live drives' documented channels all exist. A channel-by-channel grep of the three `live-drive.mjs` files against `bridge.ts`.
- **I-035, I-033, I-068, I-072:** Four adjacent Issues entries not owned by Properties. Not Properties-owned; reading their cited sites settles each.
- **System-Trash Mode (03 L-11):** Whether a property's Trash entry shows in system-Trash mode. Whether the Trash pane shows a property record in system mode.
- **The Stash's Line Count (03 L-01):** How much code the removed-values stash really costs. About 170 lines across 11 files is the scout's count.

---

#### Size

These are rough deltas, production and tests apart; most large figures are INFERRED from reading and carry that confidence, and none is measured.

| Theme | Unconditional Production | Unconditional Tests | Conditional on a Decision |
|---|---|---|---|
| Legacy Residue | about −125 | about −330 to −355 | — |
| Type Facts | about −55 to −70 | small | −25 to −75 [Intended as F-2, F-3]; 01-12's −6 at most, set by I-2's design |
| Values, Writing, and Undo | about −95 to −120 | about −40 | about −30 / +28 [Intended as E-1, E-2, E-3]; −45 (02-12, if 06-08 doesn't use the builder) |
| Schema Mutations | about −60 to −75 | small | −100 to −180 (Approach C) [Intended as B-1, B-2, B-3, B-4] |
| Multi-File Updates and Reach | about −60 | about −30 | −35 [Intended as G-1, G-2, G-3] |
| Removed-Values Stash | — | — | small, set by planning's placement [Intended as C-1, C-2] |
| Option Identity and Saved Views | −15 (07-08) | — | −15 (07-07) and about −150 tests [Intended as D-1, D-2] |
| Sync Shapes | — | one test | — [Intended as H-1] |
| Value Surfaces | about −70 to −100 | about −15 to −30 | −150 to −250 net (Approach B) [Intended as J-3, J-7]; −10 (B-06-01, if it lands) |
| Schema Surfaces | about −45 | about −40 | −90 to −130 [Intended as L-1, L-2]; −30 to −50 [Intended as I-1] |
| Views Integration | about −110 to −155 | — | about −100 net (Approach H's third record); −10 to −20 (07-03) [Intended as K-1] |
| Placement and Vocabulary | ±0 (moves) | ±0 | — |
| Tests and Describers | about −8 (comments) | about −200 to −265 | about −250 (the slot and exact-key pins) [Intended as B-1]; docs about −40 lines |
| Added by Decisions | — | — | option ids and their one-time conversion [Intended as D-1, D-2]; the property-level formats [Intended as I-2, I-3]; the file-derived fields [Intended as F-2]; the partial mark's display, about +5 [Intended as N-1]; the shared confirmation home [Intended as O-2]; each unsized until planning designs it |

**Totals:** unconditional work is about −650 to −780 production lines and about −680 to −800 test lines. The decided work in *§Decided Directions* adds about −550 to −950 production lines and about −600 to −850 test lines, led by the value seat, the crash-recovery ledger, and the editors, before the unsized additions in the table's last row. Together that's roughly −1,200 to −1,750 production and −1,300 to −1,650 test lines.

**Confidence:** the legacy, catalog, and small-fold figures are read from the code and hold within a few lines. The value seat, the ledger, the stash's placement, the per-kind view record, and the editor rows are scout estimates of designs not yet drawn, so each could move by half. The few net-positive pieces (a keyed slot, the delete flow's move to the confirmation home, `pickerOptions`) are each justified beside their entry, and the delete flow's hand emit is preferred away in favor of I-032's fold.

**Settled by This Synthesis:**
- `~/Test`, rebuilt at `156264f2f`, holds an empty registry and no property data, so legacy removals were re-checked against both live Nexuses.
- The Option Picker Drive's Clear failure is drive staleness from `5e3aee180`, not an app defect; the cell-read half stays unverified.
- `itemCount` stays engine-side (08-07 over 01-10).
- `{property_cache: 2}` merges per property only with today's shape (08-06 over 03-02).
- 02-12's `buildValueContext` removal stays conditional on 06-08's heading-settings half.
- `formatBucketLabel` goes to `Views/Pipeline/group.ts`, with `NUMERIC_FORMATS` staying in `formatValue.ts` (01-14 over 07-15).
- Pane targets go to a Views-root `paneTargets.ts` (Reconciler B over 01-08).
- `pickerOptions` can't live in `PickerControl.tsx` while `lookOptions` stays in an engine file; it follows 08-07's renderer label module (changes 08-09).
- `adopt.ts`'s `migrateContainerSidecar` is current kind-change behavior, not legacy residue, and stays.
