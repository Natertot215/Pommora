### Properties Restructure — Planning Findings

**DATE:** 10-22-2026
**HEAD:** `3c6afcabb` (branch `active`). `git diff d0595b22d HEAD -- Core UIX Desktop Sync` is empty, so every cite in the Investigation and the Scout Reports still names the line it named at the inventory head. Every citation below is `path:line` at HEAD.

This document is the one binding design source for the Properties Restructure plan. It reconciles the four planning scouts (Q, the dependency map and sequence; R, the crash-recovery map; S, the stash; T, the tidy rule), each re-verified at `3c6afcabb`, against the code, and settles every design question the plan's phases rest on. *Properties Restructure — Decisions & Intention* governs intent and isn't re-opened here. *Properties Restructure — Investigation* and *Properties Restructure — Scout Reports* are leads: where a planning scout re-read the code at HEAD and found otherwise, the scout's reading wins, and where the two disagree with each other this document's own read of the code settles it (*§Planner's Calls, Settled*). *Properties Restructure — Walkthrough* is what Nathan was told the work does, so every departure from it is a numbered *§Last Calls* entry. A phase writer writes a phase's tasks, with code, from its *§The Phases* entry plus the tree; a reviewer checks every claim here against the tree.

---

#### Verified at HEAD

Each fact below was opened at its cite for this document unless it's marked (Q), (R), (S), or (T), which name the planning scout that re-read it at HEAD.

##### Legacy Residue

- **The Type-Id Preprocess:** `LEGACY_TYPE_IDS` (`multi_select`, `url`, `datetime`) and the `propertyType` preprocess around `typeIds` sit at `Core/Properties/properties.ts:78-88`, under a comment claiming they "read forever".
- **The Migration File:** `Core/Nexus/migrateConfig.ts` is 74 lines; its open calls are `Core/Nexus/handlers.ts:26,44-45` and adoption's `renamedSidecar` branch is `Core/Nexus/adopt.ts:28,109-113` (Q).
- **The Hidden-Group Legacy:** `legacyBucketKey`, `clearHiddenBuckets`' bare-`sub/` clause, and the year sniff sit in `Core/Views/views.ts:317-382`; the frame's copy of the sniff is `Core/Views/Settings/GroupFrame.tsx:510-511` (read: "A legacy bare key under this grouping is a date bucket when it starts with a year").
- **Sync's Legacy Test:** `Core/Sync/Arrival/mergePolicy.test.ts:120-128` merges raw JSON carrying `type: 'multi_select'` and a `name` field, and `:130-136` pins the delete-versus-edit fragment `{ defs: { P: { name: 'New' } } }`; neither decodes a definition, so both stay green after the legacy decode leaves.

##### Type Facts

- **The Title Unions:** `git grep -n "PropertyType | 'title'" -- Core UIX ':!*.test.*'` answers 21 lines in 11 files.
- **Declared-Type Lookups:** `git grep -n "declaredType(" -- Core ':!*.test.*'` answers 23 calls in 14 files.
- **The Synthetic Context Definition:** `syntheticContextDef(` has 6 production call sites.
- **Ad-Hoc Type Checks:** `git grep -nE "\.type === '(text|number|select|multiSelect|status|dateTime|checkbox|link|file|context|createdTime|lastEditedTime)'" -- Core UIX ':!*.test.*'` answers 30 lines. Registration's two `=== 'multiSelect'` checks are `Core/Nexus/fileEvents.ts:528` and `Core/Properties/optionOps.ts:133`.
- **Optional Context Ids:** `git grep -nE "contextIds(\?:| =|: readonly string\[\] = )" -- Core ':!*.test.*'` answers 19 lines.

##### Values and Writing

- **The Never-Shrink Guard:** `Core/Contexts/contextResolve.ts:119-123` keeps `raw` whenever a live reconcile's result is undefined or holds fewer members (`memberCount(next) < memberCount(raw)`), for every governed key; its comment reads "A live reconcile never shrinks or blanks a value". The guard is two fused rules, never-blank and never-drop-a-member, and the member rule began Context-only (`3d28c836f`) before `87fa8aaf6` widened it to every property (T).
- **The Space Clear Short-Circuit:** `landSpaceValue` returns `null` for a clear of an absent key (`Core/Properties/setProperty.ts:26-36`, the condition at `:34`). The Space path writes through `rmwJsonStrict`, which writes whenever the mutate returns non-null (`Core/Files/atomicWrite.ts:141-168`), so an unchanged Space value write rewrites and re-dates `_space.json` today (T).
- **Read-Modify-Write:** `rmwLocked` (`atomicWrite.ts:149-168`) skips the write when `mutate` returns `null`; `updateNexusFile(absPath, mutate, repairable)` (`:229-240`) wraps it in the file's lock and sets a corrupt file aside through `setAside` (`:219-222`) when `repairable`.
- **The Machine Lock:** "Re-taking a key already held inside `fn` rejects rather than deadlocks" (`Core/Platform/machine.ts:31-32`).

##### Crash Recovery

- **Two Note Files:** `PROPERTY_JOURNAL_FILENAME = 'property-cascade.json'` and `CONTEXT_JOURNAL_FILENAME = 'context-rename.json'` with their RELs (`Core/Paths/nexusPaths.ts:27-30`), excluded by exact path (`Core/Paths/exclusion.ts:58`). Neither exists in `~/NexusOS/.nexus/` or `~/Test/.nexus/` (R).
- **The Slot:** `journalSlot.ts` is 49 lines; `write` refuses an unreadable file or a different held record unless `supersedes` admits it (`Core/Properties/journalSlot.ts:33-41`), and `clear` removes only the caller's own record (`:42-47`). Its only callers are `Core/Properties/propertyJournal.ts:42` and `Core/Contexts/contextJournal.ts:45`.
- **Record Kinds:** `SchemaJournal` has four variants (`propertyJournal.ts:9-13`); `RenameJournal` is the fifth kind (`contextJournal.ts`). `SchemaCascade = { cascade; owed?: SchemaJournal }` (`propertyJournal.ts:49-54`).
- **The Dot Rule:** `neverWatched` holds a leaf only to the dot, with `.nexus` itself exempt at depth 0 (`exclusion.ts:28-37`), so a dotted `.nexus/.owed.json` is never watched or synced with no special case.
- **The Open's Two Replay Points:** `replayPendingRename(root)` runs at `Core/Nexus/handlers.ts:86` on every open and re-point, before `readNexus` (`:89`) and the content-index seed (`:108`), with no catch; `replaySchemaCascade(root)` runs at `:111`, after `seedContentIndex`, `oweSeen`, and `sweepFileHistory` (`:108-110`), inside the genuine-open block.
- **Renderer Try Again Today:** `propertyWrite.ts` carries `replay(record?)` over `property:replay`, `landed`'s `'owed'` refusal arm, `retryOwed`, and `warnOwed` (`Core/Properties/propertyWrite.ts:1-34`); its readers are `Core/Properties/Schema/PropertyFrame.tsx:15` and `Core/Properties/Schema/useOptionEdit.tsx:16`. The slice's `mutate` runs `warnCascade(cascade, retry ? … : undefined)` from `MutateOutcome.retry` (`Core/Session/nexusSlice.ts:242-265`).
- **The Folder Move:** `relocate` renames under the source path's lock and notes an own `move` event (`Core/Files/atomicWrite.ts:62-75`); the held tree is patched settle-side by `applyMove` → `moveNodeInTree` (`Core/Nexus/fileEvents.ts:570-579`, `Core/Nexus/treePatch.ts:270`), so inside an op the tree still lists pre-move paths.
- **Space Paths:** `spaceDirRel(contextTitle, name)` is `contexts/<Context>/<Space>` (`nexusPaths.ts:113-114`); a Space's folder is its list entry.

##### Channels, Replies, and Counts

- **The Property Channels:** `Core/Contract/bridge.ts:125-190` declares 20 property, schema, and registry channels: `schema:add`, `schema:reorder`, `schema:unassign`, `schema:assign`, `registry:reorder`, `property:rename`, `property:setKeyFormat`, `property:delete`, `property:replay`, `property:setLinkConfig`, `property:setCheckboxColor`, `property:setIcon`, `property:setNumberFormat`, `property:setFileDirectory`, `property:editOption`, `property:renameOption`, `property:setValueFormat`, `property:removeOption`, `property:clearOption`, and the read channel `property:holders`.
- **`MutateOutcome`:** `created`, `cascade`, `adopted`, `bundled`, `unrestored`, `landedAs`, `retry` (`Core/Nexus/mutateRequest.ts:12-24`); `CascadeReport` is `{ pages, hosts, warning? }` (`Core/Nexus/cascade.ts:37-42`).
- **Count Copy:** `itemCount` is `Core/Properties/properties.ts:263`, read by `Core/Interface/Confirm/confirmations.ts:10,43,185`, `Core/Properties/governedSweep.ts:21,60`, and `KEY_REFUSAL.held` (`properties.ts:273`). `PLURALS`, `Counted`, and `countPhrase` sit renderer-side (`confirmations.ts:29-45`). `askHolding` asks unless `asksPastOne && r.value <= 1` (`:177-186`); `askDestroyProperty` and `askRemoveOption` always ask, wording "stripped from ${held}" (`:188-202`).
- **`unsweptLine`:** defined `governedSweep.ts:59-60`, read at 8 host-side sites: `Core/Contexts/contextCascade.ts:180,241`, `Core/Nexus/cascade.ts:92,158,281`, `Core/Nexus/configReach.ts:275`, `Core/Properties/handlers.ts:64`, `Core/Properties/optionOps.ts:352`, `Core/Settings/exclusionScan.ts:86`, `Core/Trash/restoreScrub.ts:180`.
- **The Counting Module's Home:** `Core/Nexus/entities.ts` holds `ENTITIES` and the derived `HeldKind`, and imports only a type from `Core/Paths/nexusPaths.ts`; `confirmations.ts:2` already imports `HeldKind` from it, so it's engine-safe and read by both sides.

##### The Stash and the Trash

- **The Stash Today:** `Core/Properties/propertyCache.ts` is 68 lines; the record's `caches` is `z.record(z.string(), z.record(z.string(), z.unknown()))` (`Core/Bundles/record.ts:79`); `CollectionNode.cached?: string[]` (`Core/Nexus/tree.ts:67`), filled by `cachedIds` (`Core/Nexus/containerFields.ts:24-27`).
- **The Refill:** `restoreCachedValues` (`Core/Properties/assignment.ts:65-107`) answers `ok(null)` whatever `refillValues` (`:49-63`) failed to write, so a re-add's skips are silent; `assignInner` refills only on a new append (`:110-126`).
- **Restore Order:** `restoreInner` re-assigns from `record.assignments` (`Core/Trash/restoreProperty.ts:46-49`) before writing `record.caches` back (`:50-54`), so a block whose Collection both assigned the property and held leftovers stays unspent.
- **Inert Assignment Ids:** nothing under `Core/Trash` edits a Collection's `properties` list (`git grep -n "properties" -- Core/Trash ':!*.test.*'` answers only imports); `scrubReturning` reconciles page and Space values only (`Core/Trash/restoreScrub.ts:136-195`), and `resolveAssignedSchema` drops an id the registry lacks (`containerFields.ts:29-39`).
- **The Timeframe's Two Triggers:** `void sweepFileHistory(root)` at `Core/Nexus/handlers.ts:110` and inside `if (key === 'historyDays' || key === 'archiveHistoryDays')` at `Core/Settings/handlers.ts:46`; `readFileHistoryConfig` (`Core/Settings/settings.ts:82-92`) is the one millisecond conversion (S).
- **The Archive Restore's Double Report:** the browser's single restore calls the slice's non-quiet `mutate` (`Core/Bundles/browser.ts:268`), which reports `unrestored` and `warnCascade(cascade)` itself (`nexusSlice.ts:253-257`), and then `notifyOutcome` repeats both lines (`browser.ts:276-282`) whenever `landedAs` or `rules.restoreUndo` is set, which every Archive restore is.
- **The Index's Value Store:** `readPageRelations(paths, key)` answers `pages[path].values` (`Core/Platform/stores.ts:44-47`), stored as JSON of the parsed front matter and read back by `JSON.parse` (`Desktop/Store/stores.ts:151-154`); `Desktop/Store/stores.test.ts:88` stores a `BigInt` value.

##### Settings, Open, and Views

- **Repair On Open:** `repairOnOpen: flag(false)` (`Core/Settings/personalization.ts:146`); NexusOS's `settings.json` holds `true`, and a read-only scan finds 0 rewrites under the new tidy rule (T).
- **GroupFrame's Second Read:** `GroupFrame`'s date-bucket list calls `useContainerValues(source.path)` (`Core/Views/Settings/GroupFrame.tsx:499`), a per-instance `useState` read (`Core/Views/Host/useContainerValues.ts`) separate from the view host's own call in `Core/Views/Host/useViewHost.ts`, so an open Group pane holds a second copy of the container's values.
- **Benchmark Presets:** `large` is 25,000 pages, 25 Collections, 800 Spaces (`[250, 250, 300]`), 5 option properties of 25 options (`.claude/scripts/make-benchmark-nexus.mjs:11-15`); no `~/Benchmark-*` is on disk.
- **Drives:** `.claude/scripts/` holds `drive-harness.mjs` (CDP harness on `~/Test`, `drive-harness.mjs:9-11`), `Alias Drive`, `Archive Drive`, `Metadata Drive`, `Option Picker Drive`, `Path Links Drive`, `Text Property Drive`, `editor-parity`, and `reveal-parity`.

##### Issues Entries

- **I-006** (`.claude/IssuesPM.md:173`), **I-032** (`:731`), **I-033** (`:787`), **I-035** (`:819`), **I-036** (`:745`), **I-039** (`:833`), **I-042** (`:1003`), **I-061** (`:1149`), **I-062** (`:813`), **I-063** (`:889`), **I-064** (`:1075`), **I-068** (`:917`), **I-072** (`:931`), **I-076** (`:1089`), and **I-077** (`:1103`) exist with the statuses *§What Becomes False › Issues Entries* gives each.

---

#### Planner's Calls, Settled

Each call names its reason under the Approach, Principles, and Perspectives. Calls that change what Nathan sees, or depart from the Walkthrough, also carry a *§Last Calls* number.

##### Across the Plan

- **Sequence:** Q's eighteen phases stand with the adjustments listed under *§The Phases › Adjustments to Q's Sequence*. Each phase fits one implementation agent's context and leaves its head shippable.
- **No New Issues:** no task files an Issues entry. I-076 and I-077 are the only deferrals. Every existing entry the work touches is closed or narrowed in place with no successor (*§What Becomes False › Issues Entries*), and anything that can't finish inside the plan is a Last Call.
- **Sync Stays:** nothing under `Core/Sync/` changes, its tests included; `mergePolicy.test.ts:120-136` stays as it reads and goes to *§Sync Rebuild Inputs* (LC-31).
- **Net-Negative Production Lines:** a completion criterion. *§The Ledger* is re-estimated per phase, and each net-positive phase (P4B, P12) states why under *Less Stuff*.
- **Every Measure-Then-Decide Point:** each names its Benchmark Nexus, the measurement, a threshold number, and both outcomes as tasks, so the executor runs a rule (*§Measurement Rules*).
- **One Drive:** the plan creates `.claude/scripts/Properties Drive/live-drive.mjs` on `drive-harness.mjs` with one group per phase that has a visible surface, in the Archive Drive's shape; the existing Metadata, Option Picker, and Text Property drives are re-pointed where a phase changes what they select.

##### P1 · Removal First

- **The Shared Test Seed Lands First (09-04):** one `seedNexus(root, defs?)` in `Core/Testing/hostFs.ts` and one shared definitions module read by `STATUS_DEF` and `Core/Testing/fixtures/registry.json`'s readers. Every later phase rewrites its tests on one seeding path; landing it last would re-touch every rewritten test file. *Look Outward*, *Less Stuff*.
- **`{defs: 2}` Stays, Its Test Stays:** B-08-01's re-base of `mergePolicy.test.ts` is excluded under *Sync Stays*; only `NexusSyncPM.md:63`'s example is rewritten (P18), since L1 removes the respelling it describes (LC-31).

##### P2 · What Counts as a Property

- **Filedata:** the table of Title, Created Time, Last Modified, and Location is `FILEDATA`, keyed by reserved id, named per F-2's ruling over the Investigation's "Built-In Fields" argument; F-3's "built-in fields" phrase reads as descriptive. Icon gets no entry, since it isn't a column.
- **A Hand-Written Context Definition Is Unadmitted (Morning Question 11):** "a type a definition may hold" is one predicate read by `normalizeRegistry` and `validateDefinition`, so the property list sets aside a `context`, stamp, or reserved-id definition on the way in, and the four UI filters that guard against it leave (LC-11).

##### P3 · Type Records and Looks

- **The Renderer Label Module First:** 08-07's renderer `.ts` label module lands in P3 because `pickerOptions` and the renderer record's display fields land inside it; `engineGraph.test.ts` forbids a `.tsx` in the engine graph and pins its UIX leaves, so `pickerOptions` can't sit in `UIX/Pickers/PickerControl.tsx` while `lookOptions` stays engine-side (Q dependency 6).
- **The Status Picker Gate Stays (J-8, Morning Question 17):** `PROPERTY_TYPES[def.type].options === 'select'` (`Core/Properties/Pickers/PropertyPicker.tsx:311`) already reads the engine record, so the gate is a type fact today; its reason (a quick picker would have to guess a Status option's group) is written beside it, and no inline-create field is added (LC-17).

##### P4 · The Value Write's One Home

- **The Tidy Is a Type Fact (T):** the live reconcile's guard is "never blank a value" for every type and "never drop a member" only for list-shaped values (Multi-Select, Context, File, whose decoded `value` is an array). A Select or Status lands as it reads. This narrows a rule over-generalized in `87fa8aaf6` rather than adding a Select/Status exception, so Q's conflict 4 resolves into T's framing. *Fix the Origin*, *Type Facts Once*.
- **"Any Edit" Means Any Value Write (T flag 6):** property, Context-tag, Space-link, and Space value writes plus Repair On Open tidy siblings; body, title, and banner writes don't, the same triggers every other tidy-up has (LC-21).
- **A Multi-Select's Foreign Words Dedupe (T flag 1):** the sibling reconcile routes Multi-Select through `keepingForeignWords`, the written key's rule, so `[a, zeta, a]` becomes `[a, zeta]` on the next edit instead of staying whole; one rule for the written key and its siblings (LC-22).
- **File Dedupes (T flag 2):** `decodeValue`'s file arm dedupes entries as every other list kind does (LC-23).
- **Whitespace-Only Is Empty at Decode's Entry (T flag 3):** `raw == null || (typeof raw === 'string' && raw.trim() === '')` answers the empty value once for every type, which lands J-1's text half and extends it to Date, the timestamps, Link, and File; File list entries drop whitespace-only members (LC-24).
- **J-9 Lands as "a Write That Changes Nothing Writes Nothing":** `landSpaceValue`'s short-circuit leaves and the Space write returns `null` when `changedKeys(raw, next)` is empty, the rule the page side already follows (`governedWrite.ts:35`); `setSpaceContext`'s own and far halves take the same rule. An unchanged Space write stops re-dating its file (LC-25).
- **O-3 Lands Beside the Tidy:** with both together, Repair On Open trims an outside-written several-word Select or Status to the one option it shows at the next open; NexusOS has 0 such values (T's scan), and P4's checkpoint re-runs that scan read-only on a copy and lists every page and key it would change (LC-20).
- **`governedSweep.ts` Moves to `Core/Nexus`:** beside the new `governedRoot.ts`, not `Core/Files`, whose imports stop at Nexus leaf utilities (02 A-01).
- **The Single-File Writer Takes a Page Rewrite:** `rewriteRootAt(absFile, rewrite)` hands its rewrite the parsed page and writes the text it answers, nothing for null, and `rewriteRaw(rootRewrite)` lifts a root rewrite into that form, so a put-back can land a page's own node through the same writer (W1-A M4's seam).
- **Currency Stays a Function:** `currencySymbol` moves into the codec as one export read by `SYMBOL` and `numberFormatGlyph`, keeping a foreign code's glyph, where a module-level table would restate `CURRENCY_CODES`.

##### P5 · One Home per Definition

- **The Repair Sweep Builds One World per Collection:** the sweep keys its worlds by schema array, since `governedWorld` also builds the Context world per call.
- **O-6 Is Designed on the Resolver:** Approach I removes `applyRegistry`'s `arrived` walk branch (`fileEvents.ts:488-500`), which the Investigation's O-6 recovery leaned on; with Collections holding ids resolved through one memoized `holderSchema`, a fixed `properties.json` recovers by the registry's own file event patching `config.registry`, and the `Unreadable` registry arm names which registry it is (Q conflict 8).

##### P6 · Undo From the File

- **F3 Folds Into Undo, Measured:** the write's reply already carries the put-back record with the parsed prior value, so it carries the landed value the same way, and the renderer patches its display from what the host wrote; `applyValueAtRoot`, `withSeeds`' encode, and `rekeyOverrides` leave. The pending-write override holds the picked decoded value for the edited field, so no round trip is added before paint. The measurement is a rule (*§Measurement Rules › F3*).
- **Undo's Alias (E-3, Morning Question 16):** only a Link value's alias is taken back; a link typed inside a Text value adds its alias through the editor's own save, which undo leaves (LC-16).
- **`putBackEntries` Is the One Put-Back:** written key-scoped with the value undo as its caller, landing a page's recorded node through P4A's `rewriteRootAt`, with a page rewrite answering `withPair`'s text, and a Space's value through `writeSpaceSidecar`, which moves into `Core/Nexus/governedRoot.ts` beside it in Task 6-2, since `contextWrite.ts` imports `governedRoot.ts` and the reverse import would close a cycle, so no second page or Space writer exists (Q dependency 9). The sweep's private put-back keeps its name, `keysPutBack`, until P11B deletes it with `undoSweep`; renaming it for one phase would be churn. The record is `PutBack = { file, fieldId, before? }`, and a recorded pair keeps a YAML alias as written.
- **A Put-Back That Changes Nothing Writes Nothing:** `withPair` answers `null` when the key's pair prints the same after landing, so undoing a re-pick that changed nothing doesn't re-date the page (LC-25).
- **F3's Baseline Is Task 6-4's Head:** the measurement compares Task 6-4's head with Task 6-5's, so it isolates the overlay.

##### P7 · One Door for Property Changes

- **Every Writing Property Channel Folds Into `mutate` (Approach J as I-032's Properties Slice):** the 19 writing property, schema, and registry channels become 14 `mutate` ops; `property:holders` stays a read channel with one decoded `countedChange` request and a `switch`. Folding the delete alone and adding a `property:configure` channel would leave property writes split across two doors. This is a "how" call, behavior-preserving (LC-34).
- **Replay Rides `MutateOutcome.retry` Until P11:** `property:replay(record?)` becomes the `replayProperty` op, and an owed property op answers `retry: { op: 'replayProperty', record }`, the transport Context renames already use; `propertyWrite.ts` folds into the slice's `mutate`. P11 then replaces one op and one field instead of reshaping eight channels. This is a move of an existing channel, not an addition.
- **The Holder Count Keeps Its Four Functions:** only the argument sniff leaves; the four holder functions keep `Result<number>` and their own `sweepCount` calls, as HEAD has them, and the request is `CountedChange` in `Core/Properties/properties.ts` beside `propertyDraft`, with no `holdersOf`. `Holders` and `HolderQuery` are P10's finder types alone.
- **Remove Keeps Its Views in Its One Write:** Remove's assignment write keeps `mapViews(cur, propertyClear(propertyId))`, so `propertyClear` stays exported and the views change in the same locked write as the assignment.
- **`reorderAssigned` Stays Its Own Op:** folding it into `assignProperty { toIndex }` would turn a reorder racing a Remove from a refusal into a re-assign with a stash refill, so the two intents stay two ops. `isKeyFormat` leaves in Task 7-6 with `idAndFormat`, its other reader.
- **F3's Fail Outcome in P7:** the frame reads the rename's key pair around the send, `from` from the definition before it and `to` from the tree after it, since the write gate pushes the tree before the reply leaves; `MutateOutcome` carries no keys.
- **One Lock Rule (S1):** every op that writes the registry or a schema sidecar takes the schema lock once; `addProperty` is one hold with its assignment and an in-hold rollback. `createContextGroup`'s move under `underContexts` (R's H-13) waits for P11, where the owed-name read it protects lands.
- **The Counting Module Is `Core/Nexus/entities.ts`:** `PLURALS`, `Counted`, `itemCount`, `countPhrase`, and `unsweptLine` move there; it's engine-safe and both sides already import it, and `hostGraph.test.ts` would refuse `unsweptLine` in the renderer notification copy 04-14 named. `Core/Properties/properties.ts` keeps no count copy. *Clearer Boundaries*.
- **Zero-Holder Deletes Still Ask (Morning Question 13, O-2):** a property or option delete held by nothing asks without the "stripped from 0 Items" clause, since the definition itself is destroyed; Clear and format changes keep asking only past one Item (LC-13).
- **Numbered Names (O-4, Morning Question 14):** `createProperty` returns the landed definition; a Trash restore whose name was taken answers `MutateOutcome.landedAs`, which `browser.ts`'s `steppedTo` already reports; the pane's `+`, which always auto-names, stays quiet (LC-14).

##### P8 · Option Identity

- **Values Decode to Option Ids:** `decodeValue`'s select and multiSelect arms answer option ids, as Context values already answer Space ids (`Core/Contexts/contextResolve.ts:66-78`); every display reads the label off the option. Pages keep the word.
- **Renderer-Minted Ids for Added Options:** the pane's `add` edit carries an id the renderer mints through `mintOptionId()` in `Core/Nexus/ids.ts`, as `mintNewView` mints view ids renderer-side (`Core/Views/Settings/ViewFrame.tsx:80`), so the draft row's key-to-id hand-off and `useRenameKeys` leave `useOptionEdit` entirely; the host mints at registration and in the seeds.
- **An Option Without an Id Answers to a Derived Id:** `opt_${encodeURIComponent(key)}`, deterministic on every device, until the first registry write stores it; a hand edit never hides the property, and two devices derive the same id. A random mint at decode would diverge across devices and would make the read path write.
- **A Copied Option Takes Its Key's Derived Id:** the registry keeps each option id once; a repeated id on a new key and label is a hand-copied option block, so it takes `keyedOptionId(key)` and leaves only when that id is taken too (LC-61).
- **A Status Glyph Follows Its Option's Id:** a Status chip finds its group by option id, so an option being renamed keeps its group glyph (Take Along; LC-62).
- **Names:** `optionKeys` (from `keyOf`), `clearBandKeys` (from `clearHiddenBuckets`), and one `'bandKeys'` role holding the hidden and collapsed keys, so `bucketKey` keeps one meaning; `GroupedView` leaves with `groupsOn`, its one reader.
- **The NexusOS Conversion Is a Throwaway in P8's Checkpoint:** it backs up the four files to `~/NexusOS-Backup-<MM-DD-YYYY>/` beside NexusOS, keeps any option id already stored and mints the rest, converts them, verifies against *Walkthrough §Your Data*'s list (59 options, 8 `group_id`s, the three view files, lowercase `open`/`closed` dropped), and is deleted; the backup folder `~/NexusOS-Backup-<MM-DD-YYYY>/` is removed by its path at Final Verification's closeout.

##### P9 · List First and One Replay Point

- **The Context Rename's Order Is Note → List → Folder → Files (R's H-8, H-9):** Q's preferred cascade-before-relocate is rejected, since a relocate failing after files were rewritten couldn't be reverted by restoring the title alone. On a live relocate failure the op reverts `commitTitle` in place and drops the note; a failed revert leaves the note, and the replay relocates. The file-sweeping reverse path (`contextCascade.ts:231-242`) still leaves.
- **The Two Delete Orders Land With the Notes:** the property delete's and the option delete's list-first orders (*§The Phases › P9* items 1 and 2) are written in Task 11A-2, where `deleteInner` and `deleteOption` move onto the notes, so P9 writes no interim order or replay reading for P11A to replace; P9 keeps the Context rename's order and the one replay point.
- **The Replay Moves Off Re-Points:** one pass after `seedContentIndex`, inside the genuine-open block, each entry under its own catch (R's H-10). Only the app writes the notes, so a re-point owes nothing.

##### P10 · One Finder

- **The Finder Rebases an Op's Own Folder Move:** `relocate` patches no tree and `applyMove` runs settle-side, so inside a Context or Space rename the tree lists the pre-move Space paths. The finder takes `moved?: { from: string; to: string }` (root-relative) and rebases any tree path under `from`; one rule serves Context and Space renames alike and the replay arm uses it too, where a registry-derived path would cover only Contexts, since Space titles have no registry. `spaceSidecar.ts:49`'s disk-truth comment is rewritten to that reason (Q conflict 7).
- **The Finder Owns `Holders` and `HolderQuery`:** P7 lands no holder type, so the finder's are the only ones.
- **The Replay's Context Arm Re-Reads the Tree:** the Context arm commits an uncommitted title before its folder move, re-reads the tree inside the move's branch, then finds; the Space arm finds after its move, which patches the tree in place, with no re-read.
- **The `SpaceNode` Context-Keys Field Lands:** `spaceNodeFrom` keeps each Space's raw Context keys, so Context changes use the one finder; the disk-scan fallback G-1 allowed isn't needed.
- **I-035 Stays Open:** its defect (pages already tagged with a new Space or Context name stay unlinked until re-read) lives in the settle's tag resolution and covers Space creates, which no phase touches; P18 rewrites its event-order sentence to the landed list-first order (LC-35).

##### P11 · One Note per Item

- **R's Design Is Binding:** entries are old names per owed thing; `journalSlot` dissolves into `updateNexusFile` rather than moving to `Core/Files`; one Try Again finishes everything owed through one neutral `mutate` op; Trash capture for Context and Space deletes happens up front from the index. H-1, H-2, H-4, H-5, H-8, H-10, H-12, and H-14 are binding.
- **The Notes Module Lives in `Core/Nexus/owed.ts`:** the entry type, compose rules, and owed-names read span Properties and Contexts, so they sit beside `Core/Nexus/cascade.ts`; nothing file-level is left for `Core/Files`, which settles I-042 part (2)'s journal half by removal.
- **The File Is `.nexus/.owed.json`:** dotted, so `neverWatched` keeps it out of the watcher and sync, and `exclusion.ts:58` with its two path constants leaves. An emptied map stays on disk as `{}`, since `updateNexusFile` writes what the mutate answers and removing the file under its own lock would re-implement the slot this phase dissolves (LC-28).
- **Try Again Finishes Everything Owed (R's H-17):** the owed-name refusal knows the name it refused, not which entity owes it, so Try Again takes no argument. It retries other entities' leftovers too and reports one combined count, which entries' rarity makes harmless (LC-6).
- **Index Capture Has a Fallback:** an up-front capture reads `readPageRelations(paths, key)`'s values; a type whose parsed value doesn't round-trip through the index's JSON (a `BigInt`, a `Date`) is read from the page file when it's readable, and from the index only when it isn't. The capture's test pins one value of every type through both paths.
- **H-13 Lands Here:** `createContextGroup` moves under `underContexts` beside H-14's Context-title refusal, since the race it closes is the owed-name read the refusal adds; P7's lock rule covers the schema lock only.
- **H-18's Purge Check Lands Here Once:** `unassignAndPurge` answering `written.ok` and `stripAndRemove` counting a failure as a skip keeps the delete's entry owed, which needs the entry; S's same check isn't counted again in P12.
- **I-039 Closes:** its defect is a refused delete's put-back missing a moved page, and the put-back (`unlinkMembers`' `undoSweep`, `contextCascade.ts:179`, its only caller) leaves, so the state can't occur; re-scoping it to Sync arrivals would file new content under an old number (Q conflict 6).
- **The Runner Lands With the Notes:** `runNoted` lands in Task 11A-1 and every many-file change is written onto it from the start: the four property ops, both renames (`renameContextOp` included, H-8's failed revert counting as a landed list step with its folder missed, LC-64), and Remove. The Context and Space deletes keep their note and list step in `deleteOp`'s branch, since their sweep is the finish's arm. Writing seven skeletons and folding them a phase later is what *Planning Direction* rules out, so the read rule planned here is settled at planning.
- **One Owed-Name Check and One Rename Hold:** `owedNames` and `optionOps.ts`' `owedKeys` become one `owedName(notes, { owner, name, except })`, whose owner includes one property's option words, read by the runner, the creates, `editOption`, registration, and the restore; H-1's hold is one `owesRename` predicate, read by the runner, `finishProperty`, and `finishSpace`. A change held by an owed rename reads as done (LC-63).
- **The Compose Rules:** `owedClear` folds into `owedDelete(o, current?)`, since a Clear is a delete that adds no current word (H-2), and `restoreNote` is the one restore conversion (H-4).
- **The Finishing Arms Always Answer:** an arm that can't reach its list file counts one miss (`stuck`), so a damaged `contexts.json` reads as owed; the arms sweep held parts and Spaces while a rename is owed and keep them whole until it lands.
- **Context and Space Deletes Reach Their Views by Id:** the finishing arm reaches the views every pass while the delete is owed, a view file it misses keeps the delete owed, and `goneEdit`'s Context and Space cases answer nothing; the up-front capture leaves out the deleted folder's own files.
- **The Property Delete Reads Each Holder Once:** `deletePlan` takes every owed key, one find per key, shared by the snapshot, the strip, and the finish.
- **Try Again Is One Slice Action:** `finishOwed` on the session slice sends the one Try Again, read by the slice's refusal and warnings and by `confirmDelete` from Task 11A-2 on.

##### P12 · The Stash and Trash Records

- **S's Design Is Binding:** `{ removed_at, values }` per property block, the wrapper kept beside the stamp (LC-1); Remove stamps and every other writer keeps the stamp through `patchStashBlock`; the age cleanup rides the History Timeframe's two triggers and opens only tree-marked sidecars; a global delete leaves Collections in the Trash alone (LC-2); Trash parking runs through origin-filtered `trashedHolders` into `refillValues`; restore order is blocks minus `record.values` ids, then assign, then refill.
- **The Stamp Is Required:** `StashBlock = { removed_at: string; values }`; `stashedBlock` answers `null` for a block without a string stamp, `patchStashBlock(sidecar, propertyId, block?)` takes the block whole and removes one with no values, and only Remove's one stash write (`stashAndStrip`, shared with its finish) stamps, every other writer spreading the block it read. The rename and the stamp land in one commit (Tasks 12-1 and 12-2), with the record's block shape, so no head writes a stampless block and nothing is stamped on first sight.
- **The Age Sweep Reads Nothing When Nothing Stashes:** it returns before reading the History Timeframe when no Collection lists a stash, and only a `historyDays` write triggers it, `archiveHistoryDays` not (LC-26).
- **The Refill Is a Finish Part:** `refill` runs in `finishProperty` after `unassigned` through `sweepEach`, skipping a Collection gone or no longer assigning; `owesAnything` counts it, `refillStash` carries no assigned check of its own, `assignInner` answers `owedReport` or `reachReport`, and `assignProperty` answers `MutateReply`, which P7's `mutate` arm returns.
- **Cache Becomes Stash, on Disk and in Code (LC-3):** a split would give one concept two names; no Nexus holds a stash or a `caches` record, so both renames are free. `property_cache` → `property_stash`, `propertyCache.ts` → `propertyStash.ts`, `CollectionNode.cached` → `stashed`, the record's `caches` → `stashes`.
- **A Restored Collection's Inert Id Stays (S flag 10):** the restore's reconcile doesn't drop it (*§Verified at HEAD › Inert Assignment Ids*), and leaving it is what makes restore-in-either-order work: a later property restore re-activates it, and the stash block ages out if the property never returns (LC-4).
- **A Re-Add's Refill Skips Surface (S flag 6):** `assignInner` answers the skipped count, `assignProperty`'s reply takes the owed shape P11 gives Remove, and the property's entry gains `refill: [collectionId]`, so the one Try Again re-runs the refill from the block. After the timeframe a skipped value would be lost unseen, so it can't stay silent (LC-5).
- **A Restore's Own Notice Keeps Its Try Again:** an Archive restore's lines already show once, since every notice sets the one shown notification (`Core/Interface/Notifications/notifications.ts:56-59`) and the Restored notice replaces the slice's in the same turn; what the replacement loses is the warning's Try Again, so `restoreOne` passes the reply's owed Try Again to `notifyOutcome` (LC-46, B-3).
- **The Partial Line Lives Beside `partial`:** `recordedPartly` sits in `Core/Bundles/record.ts`, joined in `restoreInner` under the landed `def.label` and at `restoreTrashed`'s end.

##### P13 – P18

- **07-17 Takes the Host's Values:** GroupFrame's date-bucket list reads the view host's `values` instead of its own `useContainerValues` read when the frame's mount chain holds the host; the read is a rule (*§Measurement Rules › 07-17*).
- **`buildValueContext` Stays (02-12):** 06-08's heading-settings half gives it a job in P13.
- **`TypeSpec.groups` Keeps `true`:** an `'option' | 'date'` union would restate the type's kind and P14's `VALUE_KINDS.dateTime.bucket`, so W3's 07-02 change is dropped; the Group pane's date bindings read `type === 'dateTime'`.
- **The Group Pane Plans Once per View:** `GroupFrame` memoizes its plan on `[view, schema, nests]`, as `useViewHost.ts:65` does (*Hot Paths Stay Cold*).
- **`checkboxValue` Lives in the Codec:** J-2's one statement that unchecking removes the key lands in `Core/Properties/propertyValue.ts` in P14 with its first reader, the Checkbox seed, and P16B's `valueClickIntent` and `runPropertyAction` import it.
- **P15's Row Menu Moves to P16B:** P15 lands only the menu vocabulary (`HideFrom` and the bare arms for a column with no look in hand); the panel's row menu, the `page-value` kind and its three `value:*` actions, and `fileValueMenu` leave in Task 16B-2, where the panel joins the seat, so no panel menu is written in P15 that P16B rewrites. P15 is named "Pick Model and One Writer", its drive group is the filter's clock alone, and group 14 carries the Link label and File menus (J-3, J-10, LC-15).
- **One `hideable`:** `HideFrom = 'view' | 'row'` is named once in `Core/Actions/cellMenu.ts`; the link menu's `value.hideable` takes it from Task 16A-1, and the seat's `hide.from` reads it.
- **One Date-Form Rule:** `dateFormFor` in `DateTimeValuePicker.tsx` states the relative-to-short rule once, which `FilterFrame` restated (Take Along).
- **02-10's Fail Outcome Keeps One Write Entry:** `setContext` takes `paths` beside `setProperty`, and `assignValue` takes the rows it writes, so no second write entry or per-row Context loop lands.
- **The Seat Commits With the Table:** Task 16A-1's seat lands in Task 16A-2's commit, `seatHost` with it, so no head holds a seat nothing reads.
- **One Link Format List:** P3 lands `LINK_DISPLAY_OPTIONS` in `displayLabels.ts`, read by the Link editor, the Default Link Format row, and P17's `typeRows.tsx`.
- **The Describers No Phase Named:** I-061 narrows to its two remaining sites, I-062 and I-006 are rewritten true, and `SurfacePM.md:42` and `SymbolsPM.md:18` join P18; the three closures stand.
- **Each Matrix Row Has One Writer:** Task 18-6 writes every Metadata and Archive matrix row the work makes false, since rows like `:110` go false in more than one phase and only the last writer can own them; Tasks 7-8, 11A-3, and 12-1 leave the matrices alone.
- **A New Drive Check Fails at Its Base:** each new check runs once at its phase's base; a check claiming a change fails there, and one that passes there (a behavior-preserving phase's, P13's group 11 among them) is named in its CHANGE as a regression guard.
- **K, 07-10, and 02-10 Are Rules:** *§Measurement Rules*.
- **I-064 Stays Deferred:** Q's "settled by P17's `MenuIndex` rhythm" doesn't hold: L-1 fixes row spacing, while I-064 is a hint-wrapping rule for content-sized panes, which I-076's pane pass holds. P18 rewrites its "Key Format" to "Label Format" and its footnote lines.
- **I-033, I-068, I-072 Are Outside Properties:** each was read at HEAD: I-033 is the Trash batch's per-bundle walk, I-068 a Link-parking ambiguity already marked Nathan's call, and I-072 an owner-deferred record format. None is touched and none changes.
- **Approach L Takes the Moves, Excludes the Split:** the root-versus-subfolder split is I-042 part (1), a Core-wide taxonomy filed before this work (Morning Question 5); P18 narrows I-042 to part (1) plus part (2)'s non-Properties moves (LC-32).
- **Approach M Is Excluded:** a Sync rebuild input.

##### Conflicts Between the Scouts and the Investigation

| Conflict | Investigation | Resolution | Reason |
|---|---|---|---|
| **Collections in the Trash on a Global Delete** | Reach them | Leave them (S) | Reaching only the sidecar loses restore-both; the Trash is left alone for every delete, pages included (LC-2) |
| **The `values` Wrapper** | Flatten (−6 / +4) | Keep, beside `removed_at` (S) | Flattening forces the stamp into a reserved page-id key or a second map (LC-1) |
| **`journalSlot`'s Home** | Keyed, moved to `Core/Files` | Dissolved into `updateNexusFile` (R) | A whole file goes; `updateNexusFile` already locks, repairs, and sets aside (LC-29) |
| **Try Again's Shape** | `replay(id)` per entity | One argument-less finish (R) | The refusal can't name the owing entity; four forms become one (LC-6) |
| **Entry Shape** | `[from, to]` pairs composing | Old names `{ rename?, strip? }` (R) | Option ids make every `to` derivable; pairs were a second source of truth |
| **Context Rename Order** | List → folder → files | Same; Q's cascade-before-relocate rejected | H-8's revert needs no file to have moved |
| **P9/P10 and the Stale Tree** | B-2 retires `spaceSidecar.ts:49`'s reason | The finder rebases the op's own move | `relocate` patches no tree; the crash half retires with the post-seed replay |
| **`unsweptLine`'s Home** | Beside the notification copy | `Core/Nexus/entities.ts` | All 8 readers are host-side; `hostGraph.test.ts` refuses the renderer copy |
| **The Never-Shrink Framing** | Trimming carves a Select/Status exception | A type fact narrowing an over-generalized rule (T) | The member rule began as a Context rule |
| **I-039** | Re-scope | Close | Its put-back leaves; re-scoping files new content under an old number |
| **Partial Delete Capture** | "As the property snapshot does" | From the index, with a file fallback (R) | The snapshot reads files, so it can't reach an unreadable page |
| **O-6's Recovery** | `applyRegistry`'s walk | The resolver's patch | Approach I removes the walk |
| **Remove's Note** | `{ unassigned: folderIds }` | Collection ids (S) | Folders move or rename between a crash and a retry |
| **Remove's Silent Cases** | Unreadable pages silent | Unreadable pages already fault; ID-less, duplicate-ID, and refused pages are the silent ones (S) | `sweepGovernedRoots` counts unreadable pages (`governedSweep.ts:99-101`) |
| **I-064** | Settled by P17 (Q) | Stays deferred | A hint-wrapping rule isn't row spacing |
| **Filedata vs Built-In Fields** | Built-In Fields | Filedata | F-2's ruling |
| **`mergePolicy.test.ts`** | Re-based (B-08-01) | Untouched | *Sync Stays* |

---

#### Measurement Rules

Each measuring task builds its Benchmark Nexus with `node .claude/scripts/make-benchmark-nexus.mjs large` first, writes the view sidecar it times (the size presets seed no views), runs the measurement over CDP on a build launched through `drive-harness.mjs`' `launch` on its own userData (a baseline worktree through `POMMORA_DRIVE_REPO`), so both sides run the build users run and Nathan's dev state is untouched, and sweeps the Benchmark Nexus and the sidecar after. A baseline is taken with the same script at the phase's base commit. One frame is 16 ms.

- **F3 (P6), the Renderer Stops Encoding:** on `~/Benchmark-Large`, at Task 6-4's head as the baseline and Task 6-5's as the measure, so the comparison isolates the overlay, a Table over the largest Collection; 20 single-cell Select edits and five 200-row mass assigns, commit-to-paint from `pointerup` to the paint showing the new chip. **Pass:** single-edit p95 is at most baseline p95 + 16 ms, and each mass assign is at most baseline × 1.10 → F3 lands. **Fail:** the phase restores `applyValueAtRoot`'s encode for the pending override, keeps the rest of P6, removes F3's −30 from *§The Ledger*, and the trace becomes a Last Call row in the reconciliation report.
- **K (P14), an Incremental View Pipeline:** on `~/Benchmark-Large`, a date-sorted, date-grouped Table over the largest Collection; the pipeline's own time (flatten, filter, sort, group) for one value edit, 20 samples, after H compiles operands and date keys once per pass. **Pass:** p95 at most 16 ms → Approach K is excluded, with the trace recorded in the phase's Departures. **Fail:** K becomes a Last Call with the trace, never an Issue.
- **07-10 (P14), the Matrix Filter per Space:** on `~/Benchmark-Large` (800 Spaces), one Matrix filter change with a Context rule every Space answers (`contains_any` over one of two Space ids, alternated); compile plus evaluate time. Benchmark Spaces hold no Select value, so a Select rule would prune away and time nothing. **Pass:** at most 16 ms → no signature cache. **Fail:** a Last Call with the trace, naming the signature cache as the fold it argues for, since this rule prunes alike on every Space.
- **02-10 (P15), Mass Assign:** on `~/Benchmark-Large`, a 300-row mass assign of a Select. **Pass:** total wall time at most 1,500 ms with no main-thread task over 100 ms → `setProperty` stays one path per op. **Fail:** `setProperty` takes `paths: string[]` in place of `path`, one op under each file's own lock and one reply, inside P15.
- **07-17 (P13), GroupFrame's Second Read:** a read, not a timing. **If** `GroupFrame` mounts under the component that calls `useViewHost` (its render chain from `Core/Views/Settings/SettingsFrame.tsx` reaches the view host's `values`), it takes `values` by prop and its `useContainerValues` call leaves. **Otherwise** the call stays with a one-line comment naming the mount that keeps it apart.

---

#### The Phases

Every phase closes with a Review Checkpoint: gates clean (`npm run typecheck`, `npm run test`, `npm run lint`), `engineGraph.test.ts` and `hostGraph.test.ts` green, the phase's drive group green where it has one, and two `opus-high` reviewers to `closeout-review`'s standards (one simplification, one adversarial), each brief carrying the Approach, Principles, Perspectives, Nathan's Constraints, and the 10-22-2026 directive verbatim; findings are fixed before the next phase opens. Each phase's describers (tests, comments, documents) that its own code makes false are swept inside it; *§What Becomes False* names the rest for P18. Deltas are production lines (source with imports, no comments, tests, docs, or drives).

##### Adjustments to Q's Sequence

1. **P1 Keeps `{defs: 2}`'s Test Untouched:** Q's L2 re-based `mergePolicy.test.ts`; *Sync Stays* rules it out, so L2 reduces to `NexusSyncPM.md:63` in P18.
2. **P4 Takes T's Flags:** the Multi-Select foreign-word dedupe, File dedupe, whitespace-only at decode's entry, and the Space write's no-op skip (with `setSpaceContext`) land beside P-1 and J-9 in the one governed-root module, since every one changes `reconcileGovernedRoot` or the value write it owns. P4's delta takes T's +4 in place of Q's +5 to +10 for P-1.
3. **P7 Folds `property:replay` as a Transport:** Q left `property:replay` for P11 to reshape on folded ops; P7 folds it into `mutate` as `replayProperty` and carries owed records on `MutateOutcome.retry`, so `propertyWrite.ts` leaves in P7 and P11 replaces one op and one field.
4. **P9 Takes R's Context Rename Order:** note → list → folder → files with H-8's in-op revert, over Q's preferred cascade-before-relocate.
5. **P10 Adds the Finder's Move Rebase:** Q's fallback becomes the design, since the tree is patched settle-side.
6. **P11 Takes R's Design Whole:** `journalSlot` dissolves rather than moving; the notes module lands in `Core/Nexus/owed.ts` with its runner; Try Again is the argument-less `finishOwed` op; H-13 and H-18 land here, and the two deletes' list-first orders move here from P9.
7. **P12 Takes S's Design Whole:** the wrapper stays, trashed Collections stay untouched, cache becomes stash on disk and in code, the refill's skips surface through a `refill` entry, and the Archive restore's double report folds.
8. **P13 Settles 07-17 by Rule:** Q's read is written as a rule with both outcomes.
9. **P18 Leaves I-064 Deferred:** Q's settlement through P17 doesn't hold (*§Planner's Calls › P13 – P18*).

##### P1 — Removal First

**GOAL:** Everything that reads only what earlier Pommora builds wrote, the encoder's refusal of a shape no path produces, a Context-note field nothing reads, and unread exports and comments leave, with no behavior change on any live Nexus. The shared test seed lands first, so every later phase rewrites its tests on one seeding path.

**Units:** L1 (01-02, 08-03/09-01), L3 (07-06), L4 (09-12, 09-15, 09-06), V2 (02-01), N4 (04-04), Z1 (08-11), 09-04, 09-09, 09-11, 09-06's tags.

**Binding Design:**
1. **The Shared Seed (09-04):** `Core/Testing/hostFs.ts` gains `seedNexus(root: string, opts?: { defs?: PropertyDefinition[]; assigned?: Record<string, string[]> }): Promise<void>`, writing `.nexus/properties.json` and each named Collection's assignment through `putJson`; `Core/Testing/definitions.ts` exports the shared fixture definitions (`STATUS_DEF` and the definitions `Core/Testing/fixtures/registry.json` holds), and `fixtures/registry.json` leaves, its two test readers (`Core/Views/Pipeline/columns.test.ts`, `Core/Views/Pipeline/resolveView.test.ts`) importing the module. Each test file's hand-rolled seed is replaced in the phase that next rewrites it, P1 converting the files it already touches, and P18's test sweep converts every hand-rolled seed still standing, so one seeding path remains.
2. **The Migration Layer (L1):** delete `Core/Nexus/migrateConfig.ts`, `migrateConfig.test.ts`, and `normalizeSavedViews.test.ts`; remove the open's two calls and their import (`Core/Nexus/handlers.ts:26,44-45`) and adoption's `renamedSidecar` branch (`Core/Nexus/adopt.ts:28,109-113`); delete `LEGACY_TYPE_IDS` and the `propertyType` preprocess (`properties.ts:78-88`), so every reader of `propertyType` reads `typeIds`, exported. `adopt.ts`'s `migrateContainerSidecar` stays: it relocates `_pageset.json` ↔ `_pagecollection.json` on a kind change today.
3. **Legacy Hidden-Group Keys (L3):** delete `legacyBucketKey` and its three call branches, `clearHiddenBuckets`' bare-`sub/` clause, and the `/^\d{4}/` sniff in `Core/Views/views.ts:317-382`, and the frame's copy at `GroupFrame.tsx:510-511`.
4. **The Encoder Stops Refusing (V2):** `valueToWrite` returns `unknown`, keeping its exhaustive `never` arm; its `Result` plumbing and the `invalid-property` code leave from `Core/Properties/propertyValue.ts`, `Core/Properties/setProperty.ts`, `Core/Nexus/page.ts`, and `Core/Testing/propertyWrites.ts`.
5. **The Unread Field (N4):** `RenameJournal.skipped`, its decode, its write at `Core/Contexts/contextCascade.ts:184`, and the `contextJournal.ts:1` comment claiming it updates the held record.
6. **Generic Modules to Their Owners (Z1):** `Core/Properties/rowOrder.ts`'s `resolveRowOrder` moves into `UIX/Utilities/moveItem.ts` (already a pinned engine-graph UIX leaf), its five production readers re-importing (`Core/Contexts/spaceSidecar.ts` and `Core/Nexus/tree.ts` hold a `rowOrder` field, not the function; `Core/Properties/PropertyPanel.tsx`, `Core/Properties/propertiesRegistry.ts`, the two `bandRouter.ts`/`bandOrder.ts` readers, `Core/Views/Pipeline/group.ts`); `Core/Properties/pageRow.ts` moves to `Core/Views/pageRow.ts`.
7. **Unexports and Comments (09-09, 09-11):** `TypeSpec`, `NUMBER_FAMILIES`, `NumberPart`, `StoredColumnStyle`, and `numberDivisor` unexport, with the rest of 09-09's list of test-only or unread exports; the comments at `Core/Properties/Cells/columnLabel.ts:10`, `setProperty.ts:14`, `Core/Properties/paneDrop.tsx:16-17` (one line), `property-panel.css.ts:8`, and `propertyValue.ts:29` leave.
8. **Test Titles (09-06):** about 31 plan-round tags leave test titles, and the four stale titles are rewritten.

**Order:** 1, 2, 3, 4, 5, 6, 7, 8.

**Behavior Changes:** none on NexusOS, `~/Test`, or a Benchmark Nexus. A Nexus outside them holding a legacy type id would read that definition as unadmitted, which A-4 accepts (Nathan's intent).

**Consumers:** `Core/Nexus/handlers.ts`, `Core/Nexus/adopt.ts`, `Core/Properties/properties.ts`, `Core/Views/views.ts`, `GroupFrame.tsx`, the four `valueToWrite` readers, `contextJournal.ts`, `contextCascade.ts`, the five `resolveRowOrder` readers, `pageRow`'s readers.

**Tests:** **Deleted:** `migrateConfig.test.ts` (74), `normalizeSavedViews.test.ts` (148), `properties.test.ts:44-47`, `optionOps.test.ts:416-435`, `Nexus/handlers.test.ts:165-178`, the eight `legacyBucketKey`/year-sniff tests, `propertyValue.test.ts:245-247`, `deleteProperty.test.ts:303-332`, `columnStyles.test.ts:13-16,34-43` (keeping the `defaultStyleFor('file')` line), V2's cast test. **Rewritten:** `restoreScrub.test.ts:287,310` respelled camelCase; `value.test.ts:81` retitled. **Untouched:** `Core/Sync/Arrival/mergePolicy.test.ts`. **Written:** one `seedNexus` test pinning that the seeded registry reads back through `readRegistry`.

**Drive:** no visible surface. The Properties Drive lands with its first group in P2.

**Delta:** about −141 production (−296 / +155; *Phase 1 › Line Total*); tests about −520.

**Depends On:** nothing.

**Risks:** low. A test reaching `propertyType` by name fails to compile and is re-pointed to `typeIds`.

##### P2 — What Counts as a Property

**GOAL:** The property types become the nine user types plus Context, and Title, Created Time, Last Modified, and Location become one Filedata table keyed by reserved id, with one admission predicate setting aside any definition that isn't a user type. Title reads as text, so option ids can land later without a title ever reading as an id.

**Units:** Z2 (08-12's vocabulary half, as the phase's first task), T6 with T2 inside (F-1, F-2, F-3; 01-03, 01-04, 01-11, 05-03, 07-13, 02-15), T4 (01-10, 09-09's moves), T5 (01-14), 01-13.

**Binding Design:**
1. **Two Type Sets** (`Core/Properties/properties.ts`): `typeIds = z.enum(['text', 'number', 'checkbox', 'dateTime', 'select', 'multiSelect', 'status', 'link', 'file', 'context'])`, `PropertyType = z.infer<typeof typeIds>`; `FiledataType = 'title' | 'createdTime' | 'lastEditedTime'`; `ColumnType = PropertyType | FiledataType`, which replaces all 21 `PropertyType | 'title'` unions in their 11 files (`Core/Actions/cellMenu.ts` 2, `Core/Properties/Cells/PropertyTypes.tsx` 3, `Core/Properties/Pickers/valueClick.ts` 1, `Core/Properties/columnStyles.ts` 1, `parseEditorValue.ts` 1, `properties.ts` 3, `Core/Properties/value.ts` 2, `cardValueInput.ts` 1, `useViewHost.ts` 1, `useColumns.ts` 3, `reassign.ts` 3).
2. **One Record Keyed by Column Type:** `PROPERTY_TYPES: Readonly<Record<ColumnType, TypeSpec>>`, with `origin: 'user' | 'context' | 'filedata'`; the stamp rows become `origin: 'filedata'`, and `title: { kind: 'text', origin: 'filedata' }` joins, so `specOf`, `pickKindOf`, `valueClickIntent`, and `fillsBlank` answer every column from one record.
3. **One Admission Predicate:** `export const isUserType = (t: string): t is PropertyType => isKeyOf(PROPERTY_TYPES, t) && PROPERTY_TYPES[t].origin === 'user'`, read by `normalizeRegistry` (`Core/Properties/propertiesRegistry.ts:21-45`) and `validateDefinition` (`Core/Properties/schema.ts:65-66` at HEAD, `validation.ts` from Task 2-1); `normalizeRegistry` also sets aside a reserved id, filing both as `unadmitted`. The guards that filtered them back out leave: `Core/Properties/Schema/PropertyFrame.tsx:202,204`, `Core/Views/Settings/visibilityModel.ts:17`, `Core/Views/Settings/SortFrame.tsx:92`, `Core/Interface/Menus/propertyMenuActions.ts:69`, and the stamps' `NO_SETTINGS` rows (`PropertyFrame.tsx:392-393`; Context's `:391` stays).
4. **Filedata** (`properties.ts`):
   ```ts
   export const FILEDATA = {
     title: { id: '_title', type: 'title', label: 'Title' },
     createdAt: { id: '_created_at', type: 'createdTime', label: 'Creation Time' },
     modifiedAt: { id: '_modified_at', type: 'lastEditedTime', label: 'Last Modified' },
     location: { id: '_location', label: 'Location' },
   } as const
   ```
   with one derived `FILEDATA_BY_ID` map behind `isReservedPropertyId`. It replaces `RESERVED_PROPERTY_ID` (its 12 readers write `FILEDATA.<name>.id`), `STAMP_TYPE` (`columnKind`, `Core/Views/Pipeline/columns.ts:11-15`, reads `FILEDATA_BY_ID.get(id)?.type`), `RESERVED_LABEL`, `TITLE_TARGET`/`LOCATION_TARGET`/`STAMP_TARGETS` (`SortFrame.tsx`), `columnLabel.ts:6-7`'s two labels, and `rowGlyph`'s fallback. The ids stay byte for byte; NexusOS refers to them only by id (`_modified_at`, `_location`), so nothing converts. Icon gets no entry. Location carries no `type` because it's a sort, filter, and preview target, never a shown column: `columnKind` (`columns.ts:11-15`) never classifies it, and the task says so where `FILEDATA` is declared. `PROPERTY_TYPES`' `origin` and `FILEDATA` both stand because they answer different questions: `origin` is what separates the nine user types from `context` and the Filedata column types, keyed by type, while `FILEDATA` names each reserved id's type and label, keyed by field; the declaration carries that one line.
5. **Title Reads as Text:** `Core/Properties/value.ts:43` answers `{ kind: 'text', value: row.title }`; `filter.ts`'s title branch leaves; `textValue`'s select arm stays for option labels; `TITLE_OPS` (`filterModel.ts:107-108`) stays, since Title offers no empty ops.
6. **Catalog Moves (T4):** `KEY_REFUSAL` and `RESERVED_NAME_PREFIX` move to `Core/Properties/validation.ts`, which `schema.ts` becomes as this phase's first task (Z2, a pure move), since this phase, P3, P7, and P8 all write into the file; the two seeds move to `Core/Properties/registryProperty.ts`; the `optionsOf` comment (`properties.ts:286`) and `properties.test.ts:267` lose the ghost "type change" reason.
7. **Bucket Labels (T5):** `formatBucketLabel` moves to `Core/Views/Pipeline/group.ts` beside `dateBucketKey`, with its test; `NUMERIC_FORMATS` stays in `formatValue.ts`. **01-13:** `formatPoint` calls `showsWeekday`.

**Order:** 1 and 2 together, 3, 4, 5, 6, 7.

**Behavior Changes:** a hand-written `context`, stamp, or reserved-id definition reads as unadmitted rather than a dead or uneditable property (an earlier agent's choice made consistent; LC-11). Title filters and sorts on its text as before (a title holding literal `[[…]]` filters on its shown text, as the select arm already did).

**Consumers:** the 11 union files, `RESERVED_PROPERTY_ID`'s 12 readers, `normalizeRegistry`, `validateDefinition`, the four guard sites, `columns.ts`, `value.ts`, `filter.ts`, `SortFrame.tsx`, `columnLabel.ts`, `formatValue.ts`, `group.ts`, `bandModel.ts`.

**Tests:** **Rewritten:** `validation.test.ts:86-91` (HEAD's `schema.test.ts`) becomes a decode test (`normalizeRegistry` sets a stamp definition aside); stamp-typed fixtures (`propertyMenuActions.test.ts:39`, `useColumnStyles.test.ts:90`, `sort.test.ts:51,56`, `propertyValue.test.ts:157,161`) re-typed to a Filedata column or removed. **Kept:** `validation.test.ts:79-84` as the create-side pin of `isUserType`. **Written:** one test that a Title value is `{ kind: 'text' }` through `resolveFieldValue`.

**Drive:** the Properties Drive (`.claude/scripts/Properties Drive/live-drive.mjs`, on `drive-harness.mjs`, in the Archive Drive's shape) is created with group 1 on `~/Test`: a Table's header and its sort and filter menus show Title, Creation Time, and Last Modified with today's labels and icons; a `context`-typed definition written by hand into `~/Test/.nexus/properties.json` shows nowhere in the Properties pane, and the drive removes it after.

**Delta:** about −52 (−287 / +235, the rename's specifiers inside; *Phase 2 › Line Total*).

**Depends On:** P1 (`propertyType` is plain `typeIds`).

**Risks:** about 25 files of type churn, mechanical; `typecheck` is the gate.

##### P3 — Type Records and Looks

**GOAL:** Each type's facts live in one engine record and one renderer record, and each type's looks in one record, so consumers ask the type instead of re-deciding it. The renderer label module, the link-display vocabulary, and the pane targets land in their owners first, because the records' display fields land inside them.

**Units:** T9 (08-07, 08-08, 01-08/06-11), T1 (01-01, 01-05, 06-09, 06-14, 06-02's two facts), T3 (01-09, 05-04/08-09), T7 (05-02), T8 (I-4).

**Binding Design:**
1. **Owners First (T9):** the link-display values (`LINK_DISPLAYS`, `LinkDisplay`, `isLinkDisplay`, `DEFAULT_LINK_DISPLAY`) move to `Core/Connections/linkValue.ts`, and their labels go to the label module (08-08's split); `PaneTarget` and its builders move to `Core/Views/paneTargets.ts` (renderer `.ts`, beside `filterModel.ts`); 08-07's renderer label module is `Core/Properties/displayLabels.ts`, taking `LINK_DISPLAY_LABELS` (`properties.ts:98`), `LOOK_LABELS` (`columnStyles.ts:23`), and `lookOptions` (`columnStyles.ts:33`), whose every reader is renderer-side at HEAD (`Core/Actions/columnMenu.ts`, `connectionMenu.ts`, `pasteAsMenu.ts`, `Schema/linkFormatOptions.ts`, `CheckboxEditor.tsx`, `NumberEditor.tsx`, `PropertyFrame.tsx`; the engine graph reaches `Core/Actions` only through `handlers.ts` → `menuModel.ts` and `editorMenu.ts`, which import none of them). The remaining label tables in engine files follow the same test: a table whose every reader is renderer-side moves, and one with a host-side reader stays, each placement stated in its task with the `git grep -n` that settles it.
2. **The Engine Record (T1):** `TypeSpec` gains `connections?: 'value' | 'prose'` (Link `'value'`, Text `'prose'`), `registersMembers?: true` (Multi-Select), and `blankDraws?: true` (Checkbox). `CREATABLE_TYPES` moves from `Cells/PropertyTypes.tsx:43-45` into `properties.ts`, derived from `isUserType`. Readers: the five "which types hold connections" sites (01-05) read `connections`; `fileEvents.ts:528` and `optionOps.ts:133` read `registersMembers`; the four checkbox blank-rule sites (06-14) read `blankDraws`.
3. **The Renderer Record:** `Core/Properties/Cells/PropertyTypes.tsx` moves to `Core/Properties/typeDisplay.ts` (06-11: it isn't a cell; with `PropertyTypeIcon` folded into `Icon`, it holds no JSX), its `TYPE_META` keyed by `ColumnType` absorbing the chip shape (`optionShapeFor`, which leaves `UIX/Labels/recipes.tsx`), the chip default glyph (`optionGlyph`'s default, `Cells/OptionChip.tsx:26`; Select keeps `'tag'`, M-1), and `styleLabel` (Link `'Format'`, every other type `'Style'`), which replaces `styleMenuLabel` (`Core/Actions/columnMenu.ts:40-42`); `columnMenu.ts` is renderer-side (its importers are `cellMenu.ts`, `optionMenu.ts`, `Bundles/browser.ts`, `MarkdownPM/Tables/tableMenu.ts`, `useOptionEdit.tsx`, `CardValue.tsx`, `useColumns.ts`, none in the engine graph), so it reads the record directly. `Schema/GhostOptionChip.tsx` and `Schema/useOptionEdit.tsx` read the shape from it.
4. **One Options-From-Labels Builder (T3):** `pickerOptions(values, labels)` in `displayLabels.ts`, beside `lookOptions`, which becomes `(looks) => pickerOptions(looks, LOOK_LABELS)`; `Core/Properties/Schema/linkFormatOptions.ts` leaves; `LinkEditor.tsx` and `Core/Settings/frames.ts` call `pickerOptions`. Nothing in the engine graph imports `displayLabels.ts`, which `engineGraph.test.ts`'s no-renderer pin proves.
5. **One Looks Record (T7):** `LOOKS: Readonly<Record<PropertyType, readonly ColumnLook[]>>` in `columnStyles.ts` beside `OPTION_LOOKS`/`CHECKBOX_LOOKS`/`NUMBER_LOOKS`, read by `styleMenuItems`, `defaultStyleFor`, and `PropertyFrame.tsx:362,370,408`'s three narrowings. No row moves and no wording changes (I-1).
6. **The Status Picker Gate (J-8):** `PropertyPicker.tsx:311` keeps reading `options === 'select'`, with its reason in one line beside it.

**Order:** 1, 2, 3, 4, 5, 6.

**Behavior Changes:** a Number column's right-click names its Number or Bar choice "Style" (I-4, Nathan's intent). Nothing else visible.

**Consumers:** `linkValue.ts`'s new readers, `filterModel.ts`, `Core/Navigation/previewRules.ts`, `SortFrame.tsx`, `PropertyPanel.tsx`, `UIX/Labels/recipes.tsx`, `OptionChip.tsx`, `GhostOptionChip.tsx`, `useOptionEdit.tsx`, `columnMenu.ts`, `columnStyles.ts`, `PropertyFrame.tsx`, `LinkEditor.tsx`, `Settings/frames.ts`, the connections, registration, and blank-rule sites.

**Tests:** **Rewritten:** `columnMenu.test.ts:171-175` pins "Style" for Number and "Format" for Link; `columnMenu.test.ts:39`'s title matched to its `[]` assertion; `cellMenu.test.ts:100`'s "(its look is per-property)" retitled. **Collapsed:** the duplicate type-fact pins 01-01 lists fold to one record test per side.

**Drive:** Properties Drive group 2: right-clicking a Number column header shows "Style", a Link header "Format"; a Select chip in compact view keeps its tag glyph.

**Delta:** about −29 (−264 / +235; *Phase 3 › Line Total*): the moves pay Biome's import wrapping, and the narrowings read the record through `lookIn` rather than leaving.

**Depends On:** P2 (`ColumnType`).

**Risks:** `engineGraph.test.ts`'s pinned UIX leaf list changes when `optionShapeFor` leaves `recipes.tsx`; the pin is updated in the same task.

`[Compaction checkpoint: c/pre-compaction; on the re-prompt, re-read §Constraints and c/plan-execution before P4 opens]`

##### P4 — The Value Write's One Home (Written as P4A and P4B)

The phase lands as two phases in the Archive's 6A/6B shape, each with its own Review Checkpoint: **P4A — The Value Write's One Home** (the module, the codec's narrowing, the real-write seeds, the names and small merges: pure consolidation with no behavior change) and **P4B — The Tidy Rule and Repair On Open** (the type-fact tidy, foreign-word and File dedupe, whitespace at decode's entry, the no-op write, O-3: the phase's six Last Calls). The design below covers both.


**GOAL:** Every value write lands through one governed-root module that reads each file once, and tests seed through the real write. The tidy rule lands there as a type fact: a value is never blanked, a list never loses a member it can't read, and a Select or Status lands as the one option it shows. Text and every other type holding only spaces read as empty, a write that changes nothing writes nothing on a Space as on a page, and Repair Properties On Open turns on by default.

**Units:** V1 (02-03, 02-04, 02-06, 02 A-01), V3 (02-04, 04-11, 08-07's number half), V4 (02-07, 09-02), V5 (02-08, 02-11, 02-16, 08-05), V7 (P-1, P-3), V8 (J-9), V9 (J-1), R8 (O-3), T's flags 1–4, R6's `governedSweep.ts` move.

**Binding Design:**
1. **The Module** (new `Core/Nexus/governedRoot.ts`): `GovernedWorld`, `governedWorld`, `spaceWorldOf` (from `Core/Contexts/contextResolve.ts:42-57`), `pageWorldOf` (from `Core/Contexts/contextWrite.ts`), `reconcileGovernedRoot` (from `contextResolve.ts:96-132`), one `reencode(def, raw, frozen?)` replacing `reconcilePropertyValue` and the hand-rolled copies at `contextResolve.ts:112-128` and `Core/Properties/assignment.ts:57-61`, `writtenSpelling`/`checkedSpelling`, `writtenRoot` (from `governedWrite.ts:12-17`), and `rewriteRootAt(absFile: string, rewrite: (page: SweptPage) => string | null): Promise<Result<null>>`, parsing once through `sweepParse` and writing the text its rewrite answers, with `rewriteRaw(rootRewrite)` lifting a root rewrite into that form, answering `not-found` itself so callers' existence checks leave. `Core/Properties/governedWrite.ts` is deleted; `Core/Properties/governedSweep.ts` moves to `Core/Nexus/governedSweep.ts`. The banner passes `rewriteRaw((raw) => landValue(raw, 'banner', v))` to `rewriteRootAt`; `landPageValue` folds into `setPagePropertyOp`; `setPageContext` calls `rewriteRootAt`.
2. **The Tidy Guard (P-1, T):** inside `reconcileGovernedRoot`:
   ```ts
   let next: unknown
   let listed = true
   if ('def' in governor) {
     const reconciled = reconcilePropertyValue(governor.def, raw, frozen)
     if (!isBlankValue(reconciled)) next = encodeValue(governor.def, reconciled)
     listed = 'value' in reconciled && Array.isArray(reconciled.value)
   } else { … }
   // A live reconcile never blanks a value, and never drops a list member it can't resolve; a single value lands as it reads.
   if (!frozen && (next === undefined || (listed && memberCount(next) < memberCount(raw)))) {
   ```
   (`reconcilePropertyValue` and `encodeValue` here read as `reencode` once item 1 lands.)
   A Context governor is a list; the property arm's list-ness comes from the decoded value union (`multiSelect`, `context`, `file` carry `string[]`), so nothing restates it.
3. **Foreign Words in Siblings (T flag 1):** the property arm's Multi-Select re-encode runs through `keepingForeignWords(def, encoded, raw)`, the written key's rule, so `[a, zeta, a]` lands `[a, zeta]`.
4. **File Dedupes (T flag 2):** `decodeValue`'s file arm (`propertyValue.ts:133-141`) dedupes entries and drops whitespace-only ones.
5. **Whitespace at Decode's Entry (J-1, T flag 3):** `decodeValue` (`propertyValue.ts:104`) opens with `if (raw == null || (typeof raw === 'string' && raw.trim() === '')) return NULL_VALUE` for every type, replacing the text arm's `isBlankRaw` use; `isBlankRaw`'s four callers stay file-spelling checks (`assignment.ts:60`, `keyHolders.ts:59`, `Core/Trash/holdings.ts:79`, `Core/Trash/restoreProperty.ts:63`).
6. **A Write That Changes Nothing (J-9, T flag 4):** `landSpaceValue`'s short-circuit leaves; the Space write's mutate answers `changedKeys(raw, next).length ? next : null`, and `setSpaceContext`'s own and far halves (`contextWrite.ts:84-120`) take the same rule.
7. **The Codec Narrows (V3):** `propertyValue.ts` keeps the union, decode, encode, option words, checkbox reading, and blank predicates; `unregisteredMembers` moves to `Core/Properties/optionOps.ts`; `Frozen`/`frozenWorld`/`gonePageEntry` move to the Trash side with one `frozenOf(tree, archived)` builder replacing the three `frozenWorld(linkWorld(...))` sites (`assignment.ts`, `restoreProperty.ts`, `Core/Trash/spend.ts`); `readNumber`/`spelledNumber` move beside decode and encode, with `currencySymbol` as one export `SYMBOL` and `numberFormatGlyph` read, so `formatValue.ts` leaves the engine graph.
8. **Tests Seed Through the Real Write (V4):** `writePageValue`/`writeSpaceValue` leave `Core/Testing/propertyWrites.ts`; a test meaning "a user wrote this" seeds through `settledMutate`, one meaning "the file holds this" through `putJson`/`seedSpaceSidecar`; the `land*` exports leave once `writePathRace.test.ts:75-82` pins the lock rule through `setPagePropertyOp`.
9. **Names and Small Merges (V5):** `Core/Properties/pageValue.ts` is deleted, its list edits moving to `Core/Files/rootValues.ts` and `valueEditRewrite` to `optionOps.ts`; `Core/Properties/value.ts` becomes `fieldValue.ts`, its `fileName` moving to `linkValue.ts`; `pageValuesOf` folds into `Core/Views/Host/loadValues.ts`; create-with-seeds writes once (02-16); the registry read on a value write goes through `cachedParse` (`Core/Files/walkCache.ts:34-58`), ending the per-write `validateName` re-validation (08-05).
10. **Repair On Open (O-3):** `personalization.ts:146` becomes `flag(true)`.
11. **Describers:** `Core/Nexus/mutate.ts:81`'s "never shrinks or drops a key it can't resolve" becomes "never blanks a value or drops a list member it can't resolve".

**Order:** 1 (with the move of `governedSweep.ts`), 7, 9, 8, then 2–6 on the merged module, then 10, 11.

**Behavior Changes:** a several-word Select or Status tidies to the one option it shows on any value write to its page or Space and on Repair On Open (P-1, Nathan's intent; LC-20, LC-21); a Multi-Select holding a foreign word dedupes (LC-22); File dedupes (LC-23); whitespace-only reads as empty for every type (J-1 for Text, Nathan's intent; LC-24 for the rest); an unchanged Space write leaves the file untouched (an accident fixed; LC-25); a Space clear of an absent key tidies the Space's other properties (J-9, Nathan's intent); Repair On Open defaults on (O-3, Nathan's intent).

**Consumers:** every value write route (`setPagePropertyOp`, `setSpacePropertyOp`, `setPageContext`, `setSpaceContext`, `setBanner`, creation seeds, the repair sweep), `governedSweep.ts`'s 19 importers (8 outside Properties), `frozenWorld`'s three sites, `formatValue.ts`'s readers, `propertyWrites.ts`'s 54 test calls.

**Tests:** **Deleted:** `repairSweep.test.ts:150-156` (its case moves to the unit level), `pageValue.test.ts` (folded with its functions). **Written:** `contextResolve.test.ts` property arm: `Stage: [A, B]` → `[B]`, `[A, Zed]` → `[A]`, `[Zed]` kept; `[a, zeta, a]` → `[a, zeta]`; a duplicate File entry collapses; `Notes: "   "`, a whitespace Date, and a whitespace Link decode empty; `setSpaceProperty.test.ts` *reconciles the Space* gains "clearing a key the Space never held tidies `Status: 'Option 1'` to `['Option 1']`". **Kept:** `setSpaceProperty.test.ts:75-82` (bytes and mtime unchanged on a no-op clear), `repairSweep.test.ts:135-141`, `contextResolve.test.ts:213-226`, `propertyValue.test.ts:167-190`. **Rewritten:** `propertyValue.test.ts:223-225` ("an empty string is a link value") pins the empty value; every `writePageValue` call re-seeds through the real write.

**Drive:** Properties Drive group 3: on `~/Test`, a page written by hand with `Status: [Option 1, Option 2]` shows Option 2, and editing a different property rewrites it to `[Option 2]`; a Text property written as three spaces matches "is empty"; picking a Space value already held leaves `_space.json`'s mtime unchanged.

**Measurements:** P4's checkpoint runs T's NexusOS scan read-only against a copy of `~/NexusOS` and lists every page and key Repair On Open would change under the new rule (expected: none).

**Delta:** about −32 across both halves: P4A about −39 (−419 / +380) and P4B about +7 (−16 / +23); `frozenOf` and the `pageValuesOf` fold didn't hold at HEAD, and the banner keeps its read.

**Depends On:** P1, P2.

**Risks:** about 40 files of import churn from the module moves; the engine and host graph tests catch a renderer import into `Core/Nexus`.

##### P5 — One Home per Definition

**GOAL:** Collections hold property ids and every holder's schema resolves through one memoized resolver, so a property arriving by sync or hand edit no longer walks the Nexus, registration at open reads the index, and the repair sweep builds its world from the tree. A damaged property list opens the Nexus with Properties marked unreadable and a notice naming that list, recovering through the same resolver once the file is fixed.

**Units:** R4 (08-02, 08-13, 07-12, 03-14's `assignedDefs`), R5 (04-10), R3 (04-06/03-12), R7 (O-6), 04-11's `frozenOf` (landed in P4).

**Binding Design:**
1. **Ids, Not Copies (R4):** `CollectionNode.propertyIds: string[]` as written replaces the resolved definition copies (`Core/Nexus/tree.ts`); `containerSchema(tree, node)` and a new `holderSchema(tree, holder)` resolve against one registry map memoized on `config.registry` identity (`entityMemo`, `tree.ts:132`); `repointRegistryInTree` and `resolveAssignedSchema` (`Core/Nexus/treePatch.ts`, `containerFields.ts:29-39`), the `arrived` walk branch and per-event `registryOf` (`fileEvents.ts:488-500`) leave; `SettingsFrame.tsx:76` routes through `containerSchema`. `assignedDefs`' four readers (`contextWrite.ts`, `assignment.ts`, `repairSweep.ts`, `restoreScrub.ts`) read `holderSchema`. `containerSchema`'s nine readers keep their call and switch any `.properties` reference to it.
2. **Repair's World (R5):** `runRepairSweep`'s async `defsByFolder` memo becomes one synchronous builder shared with `pageWorldOf` and `scrubReturning`, building one world per Collection per sweep, keyed by its schema array.
3. **Registration Reads the Index (R3):** `registerHeldOptions(root)` reads members from `readPageRelations(paths).pages[*].values` for the Multi-Select Collections' pages instead of a stat and parse per page.
4. **The Damaged List (O-6):** `readNexusConfig` (`Core/Nexus/readNexus.ts:287-288`) reads `properties.json` through a kept read that answers an empty registry plus `{ path: '.nexus/properties.json', kind: 'registry', registry: 'properties', reason }` in `tree.unreadable` when the session's first read fails; the `Unreadable` registry arm (`tree.ts:109-112`) gains `registry: 'contexts' | 'properties'`, read by its two readers (`Core/Nexus/remintLedger.ts:56`, `Core/Tiles/tileHosts.ts:51`), so a damaged property list doesn't hide every Space from tiles; the open stops waiting on the root with the error (`handlers.ts:74-80`) for this case; `notifyUnreadable` names the list. Writes already refuse a damaged list through `mutateRegistry` → `updateNexusFile(…, false)`; a fixed file's own event replaces `config.registry`, and the resolver's memo key changes with it.

**Order:** 1, 2, 3, 4.

**Behavior Changes:** a damaged property list opens the Nexus with Properties unreadable and a notice (O-6, Nathan's intent). A synced or hand-edited definition updates without a full re-read (no visible change).

**Consumers:** `tree.ts`, `treePatch.ts`, `containerFields.ts`, `fileEvents.ts`, `SettingsFrame.tsx`, `containerSchema`'s nine readers (`Core/Interface/Menus/entityMenuActions.ts`, `fileEvents.ts`, `treePatch.ts`, `PropertyPanel.tsx`, `optionOps.ts`, `ViewTile.tsx`, `tilesFile.ts`, `useViewHost.ts`, `ViewMenu.tsx`), `assignedDefs`' four readers, `repairSweep.ts`, `optionOps.ts`, `readNexus.ts`, `remintLedger.ts`, `tileHosts.ts`, `notifications.ts`.

**Tests:** **Rewritten:** tree-delta tests holding definition copies hold ids; `fileEvents.test.ts`'s arrived-walk case becomes "a changed definition re-resolves without a walk". **Written:** the damaged-list open (Nexus opens, registry empty, unreadable entry names properties, Spaces stay listed for tiles, fixing the file restores the definitions).

**Drive:** Properties Drive group 4: corrupting `~/Test/.nexus/properties.json` and reopening shows the Nexus with a notice naming the property list and every Space still in tiles; restoring the file brings the properties back without a reopen.

**Delta:** about −55 (−125 / +70; O-6's +8 inside, required behavior in its minimal form).

**Depends On:** P4.

**Risks:** a render-path consumer holding `.properties` by reference must switch to the memoized resolver; `typecheck` finds every one once the field is renamed.

##### P6 — Undo From the File

**GOAL:** The part of Pommora that writes a file records exactly what the edited key held and hands that record back with its reply, and undo puts that one key back, a Link value's alias included, replacing the renderer's held copy, its patch, and the re-sent Context ids. The renderer stops re-implementing the host's encode and patches its display from the value the host wrote.

**Units:** V10 (E-1, E-2, E-3; Approach F2), V11 (Approach F3), 02-05.

**Binding Design:**
1. **The Put-Back Record:** `MutateOutcome` gains `undo`, a `putBack` request over `type PutBack = { file: string; fieldId: string; before?: unknown }` — the key's prior pair as the block spells it, an alias kept as written (page), or its JSON value (Space), absent when the file held no key; `fieldId` is the property's or the Context's id. It's captured where the page and Space writes already read the file. A Space ↔ Space Context link records every file its write touched (`contextWrite.ts:96-113`).
2. **One Put-Back Op:** the `putBack` `mutate` op (`{ op: 'putBack'; entries: PutBack[]; aliases?: AliasPutBack }`) replaces `restoreValue`; it lands through `putBackEntries(root, entries)`, which lands each recorded pair through `rewriteRootAt`, its page rewrite answering `withPair`'s text, and each Space value through `writeSpaceSidecar`, moved into `governedRoot.ts`, writing nothing where the key already reads so, so a bare `Status:` comes back bare and 02-02's `nodeSpelledAs` null fix isn't needed. The sweep's private `keysPutBack` stays as it is until P11B deletes it with `undoSweep`.
3. **E-3:** `editAliases` (`Core/Nexus/pageMetadata.ts`, `aliasMemory.ts`) replies with the aliases it replaced; the value's revert sends that back inside the same `putBack`. Only a Link value's alias is taken back.
4. **Removes:** `held` capture and `restore` with its context arm (`Core/Properties/assignValue.ts:60-72,98-99`), the fire-and-forget shape of the alias add (the add itself stays in `rememberedAlias`, renderer-side, as the one path for Link and Text aliases, now awaited, with `editAliases`' reply attached to the undo entry), `requestedValue` and its `restoreValue` arm (`setProperty.ts`), the `held` request field and its routing (`mutateRequest.ts:91-92`, `mutate.ts:198-202`), `keepingForeignWords`' run over an undo.
5. **F3:** `applyValueAtRoot` (`propertyValue.ts:315`), `assignValue.ts:56`'s encode, `withSeeds`' encode (`Core/Views/Host/useViewCreation.ts:54`), and `rekeyOverrides` (`useContainerValues.ts:17`) leave; `Core/Properties/valueOverride.ts` holds, per pending write, the picked decoded value for the edited field, keyed by field id, until the write lands.
6. **The Undo Stack Stays the One Owner:** `Core/Session/undo.ts`'s `pushUndo`, depth 100, `groupUndo`, and `resetUndo` on a Nexus switch are unchanged; the revert re-resolves the row's current path by id, as today.

**Order:** 1, 2, 3, 4, then 5 with its measurement, 6 checked.

**Behavior Changes:** undo puts back exactly what the file held for the edited key only (E-1, E-2), a bare key comes back bare, unknown Context tag names survive an undo, and undoing a Link value takes back the alias it added (E-3) — each Nathan's intent.

**Consumers:** `assignValue.ts`, `setProperty.ts`, `mutateRequest.ts`, `mutate.ts`, `governedRoot.ts`, `governedSweep.ts`, `contextWrite.ts`, `pageMetadata.ts`, `aliasMemory.ts`, `Session/undo.ts`, `valueOverride.ts`, `useViewCreation.ts`, `useContainerValues.ts`, `ValueWriter`'s three assemblers (`entityMenuActions.ts`, `PropertyPanel.tsx`, `useViewHost.ts`; `assignValue.ts` declares it) (`entityMenuActions.ts`, `PropertyPanel.tsx`, `assignValue.ts`, `useViewHost.ts`).

**Tests:** **Rewritten:** `restoreValue.test.ts` (193 lines) folds into the `setProperty` and put-back tests; `assignValue.test.ts:72-115` pins the reply-carried record. **Written:** bare `Status:` round-trips bare; an unknown Space title survives a Context undo; a Link undo removes its alias and keeps an alias the page already had; a tidied sibling stays tidied after undo.

**Drive:** Properties Drive group 5: on `~/Test`, pick a Select on a page whose file holds a bare `Status:`, press ⌘Z, and the file reads `Status:` again; rename a Link value's display, undo, and the alias leaves `.nexus/metadata/`.

**Measurements:** F3 (*§Measurement Rules › F3*).

**Delta:** about 0 (−193 / +193): the undo's node-exact put-back (about +68) against F3 (about −68); about +68 on F3's Fail.

**Depends On:** P4.

**Risks:** the record crosses IPC on every value write, holding only the key's node text; `ValueWriter` reshapes here, so P15's writer is designed on this one.

`[Compaction checkpoint: c/pre-compaction; on the re-prompt, re-read §Constraints and c/plan-execution before P7 opens]`

##### P7 — One Door for Property Changes

**GOAL:** Every property change reaches the host through `mutate` with one reply shape, one lock rule, and one holder count, and the delete flow runs through the one confirmation home. The counting words move to one module both sides share, a zero count reads correctly, an option's Remove reads Delete, and a restore that takes a numbered name says so.

**Units:** S1 (03-04), S2 (03-07/01-07, Approach J, I-032's Properties slice), S3 (03-08, O-4), S5 (03-10, 03-11, 03-13, 03-14's `writePropertyBundle`, 05-12, L-3's decode), S6 (03-05, O-2), S7 (O-1), S8 (05-05).

**Binding Design:**
1. **The Ops** (`Core/Nexus/mutateRequest.ts`'s union; `Core/Nexus/mutate.ts`'s `dispatch`): 19 writing channels become 14 ops —
   | Op | Replaces |
   |---|---|
   | `addProperty { containerPath, draft }` (the existing `PropertyDraft` decoder; the pane sends `{ label, type }`) | `schema:add` |
   | `assignProperty { containerPath, propertyId }` | `schema:assign` |
   | `unassignProperty { containerPath, propertyId }` | `schema:unassign` |
   | `reorderAssigned { containerPath, propertyId, toIndex }` | `schema:reorder` |
   | `reorderProperty { propertyId, toIndex }` | `registry:reorder` |
   | `renameProperty { propertyId, label }` | `property:rename` |
   | `setFormat { propertyId, change: FormatChange }` | `property:setKeyFormat`, `property:setValueFormat` |
   | `configureProperty { propertyId, patch }` | `property:setLinkConfig`, `property:setCheckboxColor`, `property:setIcon`, `property:setNumberFormat`, `property:setFileDirectory` |
   | `deleteProperty { propertyId }` | `property:delete` |
   | `replayProperty { record?: SchemaJournal }` | `property:replay` (until P11) |
   | `editOption { propertyId, edit }` | `property:editOption` |
   | `renameOption { propertyId, from, to }` | `property:renameOption` |
   | `deleteOption { propertyId, label }` | `property:removeOption` |
   | `clearOption { propertyId, label }` | `property:clearOption` |

   `configureProperty`'s `patch` is one zod `propertyDefinitionFields.pick({ link_display, link_underline, link_color, checkbox_color, icon, number_family, number_currency, number_separators, number_decimals, number_fraction, number_denominator, file_directory }).partial().strict()` (the exact field list read from `defEditOp`'s five callers), with the file-directory check inline. `setFormat` routes on `'key_format' in change` to `rekeyProperty` or `setValueFormat`. `bridge.ts:125-190` keeps only `property:holders`.
2. **One Reply:** every op answers `MutateOutcome`: `cascade` for a sweep's report; `retry: { op: 'replayProperty', record }` for an owed record (replacing `SchemaCascade.owed`'s renderer copy); `bundled` for a delete's Trash entry; `landedAs` for a numbered restore; `created` widens to `{ path: string } | { propertyId: string }` for `addProperty`. `Core/Properties/propertyWrite.ts` is deleted: `PropertyFrame.tsx` and `useOptionEdit.tsx` call the slice's `mutate`, whose refusal path offers Try Again for code `'owed'` as `mutate({ op: 'replayProperty' })`.
3. **One Lock Rule (S1):** each property op takes `serializeSchemaOp` exactly once inside its function and `dispatch` adds no lock around it, so no op re-takes the schema lock (`machine.ts:31-32`); the Trash restore's Contexts → settle → schema nesting is unchanged. `addProperty` is one hold: create, assign, and on a failed assign an in-hold rollback of the create. `rekeyProperty`'s in-commit `validateName` stays for outside writers, its comment (`registryProperty.ts:170`) rewritten to that reason; `propertiesRegistry.ts:125`'s comment states the rule.
4. **Restore Trusts Create (S3, O-4):** `createProperty` returns `Result<PropertyDefinition>` (the landed definition); `restoreInner`'s `'exists'` pre-check, read-back, and second tree read leave, keeping the refusal message; `restoreTrashed`'s property arm answers `landedAs` when the landed label differs, reported by `browser.ts`'s `steppedTo` in the Archive's approved wording.
5. **Small Ones (S5):** `optionCascade`'s `null`-in-a-tuple waits for P8, which replaces it with `removed?: string` (the deleted option's id) once the label pair's reach leaves; Remove keeps its views in its one sidecar write (`mapViews(cur, propertyClear(propertyId))`), so the views and the assignment change under one lock; `refillValues` moves beside `sweepRootsById` in `Core/Nexus/governedSweep.ts`; `writePropertyBundle` unexports; `Core/Properties/removeProperty.ts` becomes `unassignProperty.ts`; `Core/Trash/holdings.ts` becomes `Core/Trash/trashedCopies.ts`; `propertyDraft.id` becomes optional; `number_denominator` decodes `z.number().positive().optional().catch(undefined)` (`properties.ts:190`), so a stored non-positive value reads as unset and the definition stays admitted.
6. **One Count Path (S6, O-2):** `property:holders` decodes one `countedChange` request, `{ of: 'property' } | { of: 'option'; label: string } | { of: 'format'; change: FormatChange }` (`CountedChange`, beside `propertyDraft` in `Core/Properties/properties.ts`), answered by one `switch` over the four holder functions, which keep their own `sweepCount` dry runs (`Core/Properties/handlers.ts:199-208`'s shape sniff leaves). `Counted`, `PLURALS`, `itemCount`, `countPhrase`, and `unsweptLine` move into `Core/Nexus/entities.ts`; `confirmations.ts`, `governedSweep.ts`, `KEY_REFUSAL.held`, and `unsweptLine`'s 8 readers import from there. A property or option delete held by nothing asks without its strip clause: `askDestroyProperty`'s detail reads "It is removed from every collection; a restorable record lands in the nexus’s .trash folder." at zero, and `askDeleteOption`'s reads "The option is deleted from the property." at zero.
7. **Remove Reads Delete (S7, O-1):** `Core/Actions/optionMenu.ts:21` becomes `{ label: 'Delete', action: 'option:delete' }` (its `:1` comment leaves); `askRemoveOption` becomes `askDeleteOption`, asking `Delete “${label}”?` with a Delete button; `removeOption` becomes `deleteOption`; `useOptionEdit.tsx:114-116` dispatches `deleteOption`.
8. **The Delete Flow (S8):** `PropertyFrame.tsx:291-299`'s ask, `property:delete`, `storesChanged.emit`, back-to-list, and `notifyTrashed` become one `confirmDelete` call (`confirmations.ts:122-134`) with the `deleteProperty` op; the frame's `trashChanged` emit (`PropertyFrame.tsx:297`) leaves, since the slice emits it.
9. **Take Along:** the Option Picker Drive's Clear assertion (`.claude/scripts/Option Picker Drive/live-drive.mjs:170-173`) follows the past-one threshold `5e3aee180` set.

**Order:** 6, 3, 4, 5, 7, then 1 and 2 together (the table names ops by their post-rename names), 8, 9.

**Behavior Changes:** an option's Remove reads Delete (O-1, Nathan's intent); a delete held by nothing asks without "0 Items" (O-2, Nathan's intent; LC-13); a Trash restore that took a numbered name says "Restored “Priority” as “Priority (2)”" (O-4, Nathan's intent; LC-14); a denominator of zero or less reads as unset (L-3, Nathan's intent). Folding the channels is a "how" call with no visible change (LC-34).

**Consumers:** `bridge.ts`, `mutateRequest.ts`, `mutate.ts`, `Core/Properties/handlers.ts`, `Core/Session/nexusSlice.ts`, `PropertyFrame.tsx`, `useOptionEdit.tsx`, `confirmations.ts`, `optionMenu.ts`, `registryProperty.ts`, `propertiesRegistry.ts`, `Core/Trash/restoreProperty.ts`, `Core/Trash/spend.ts`, `Core/Bundles/browser.ts`, `optionOps.ts`, `entities.ts`, `unsweptLine`'s and `itemCount`'s readers, the Metadata Drive (`live-drive.mjs:789,932,935,960,979`), `MATRIX.md:110`.

**Tests:** **Rewritten:** `Core/Properties/handlers.test.ts:167-254` and the channel tests against ops; `OptionEditor.test.tsx:44-187` to Delete; `confirmations.test.ts` gains the zero wording and keeps `countPhrase([])` as "0 Items"; `PropertyFrame.test.tsx`'s two harnesses merge, its false names (`:255`, `:438`, `:486`, `deleteSpy` at `:244`) and `:202`'s stale title are corrected (05-13). **Written:** `addProperty`'s in-hold rollback; a restore under a taken name answers `landedAs`; no op re-takes the schema lock.

**Drive:** Properties Drive group 6: an option's menu reads Delete and asks "Delete “Alpha”?"; deleting a property no page holds asks without "0 Items"; restoring a deleted property after creating one with its name reports the numbered name. The Option Picker and Metadata drives run green on the new wording.

**Delta:** about −155 (−382 / +227; the channel adapters held more than they were priced at).

**Depends On:** P2, P3 (the frame's type facts), P6 (the reply shape `mutate` already carries).

**Risks:** the op fold touches every Properties pane write; the frame's drive group exercises each op once.

##### P8 — Option Identity

**GOAL:** Every option carries a permanent id that views, tiles, the Matrix filter, and preview rules refer to, so an option rename stops rewriting configuration and only pages holding the word are swept. Collapsed groups are scoped per property through one bucket-key builder, which keeps folder collapses when a grouped property is deleted, and Status options stop storing their group id. NexusOS is converted once by a throwaway script inside the phase's checkpoint.

**Units:** D1 (D-1), D2 (D-2, K-1's grouped delete), D3 (D-3), 09-14's test cuts.

**Binding Design:**
1. **The Id** (`Core/Nexus/ids.ts`): `export const mintOptionId = (): string => \`opt_${newId()}\`` beside `mintPropertyId`. `selectOption` and `statusOption` (`properties.ts:121-145`) gain `id`, decoded loose: a stored `id` reads as written, and a missing one answers `opt_${encodeURIComponent(key)}`, which the next registry write stores. `statusOption`'s `group_id` leaves the decoder's required fields and every writer (`properties.ts:144,304,313,323,329,335`, `Core/Properties/optionModel.ts:35,49`, `Core/Testing/viewHarness.tsx:68,74`, `Core/Testing/definitions.ts`); a stored `group_id` rides along unread. The registry keeps each option id once, and a repeated id on a new key and label, a hand-copied option block, takes `keyedOptionId(key)`, leaving only when that id is taken too (LC-61).
2. **Values Are Ids:** `wordsOf(def)` keys by id; its `labelOf` becomes `idOf: Map<key, id>`; `decodeValue`'s select and multiSelect arms answer ids, and `encodeValue` maps ids to keys. `findOption(def, id)`; its readers (`Cell.tsx:65,85`, `bandModel.ts:81`, `GroupFrame.tsx:372`, `OptionOrderList.tsx:74,94`, `optionOps.ts:84,190,255`) pass ids; `optionLabels` readers (`group.ts:199,219`, `sort.ts:87`) read labels off options; `bucketKey` (`group.ts:179-180`) yields the option id; `textValue`'s select arm maps id to label for text ops and title sorting. Unregistered words get no id and drop out of the decoded value as today; registration mints one when it adopts a word (A-5).
3. **Option Ops Take Ids:** `editOption`, `renameOption { propertyId, optionId, label }`, `deleteOption { propertyId, optionId }`, `clearOption { propertyId, optionId }`, and `property:holders`' `{ of: 'option'; optionId }`. The `add` edit carries the id the renderer minted with `mintOptionId()`; the host mints at `registerHeldOptions` (`optionOps.ts:150`) and in the two seeds.
4. **The Rename Reach Leaves:** `Core/Nexus/configReach.ts`'s RENAME table and its four handlers (`wholeValues`, `optionRule`'s rename half, `scopedOrder`, `collapsedKeys`, `:131-196`) and `OptionReach.labels` leave; `optionCascade`'s `labels` leave. An option delete still drops its id from views through `GONE`'s `stripGone` (`:226-235`) with a `propId/optId` matcher.
5. **The Popup Re-Keying Leaves:** `useOptionEdit.tsx`'s `useRenameKeys`, rename landing, `rowKeyOf`, and the draft row's `\0n` key hand-off (`:66-97,142-149,183`) leave; rows and the open popup key by option id. `useRenameKeys` stays in UIX for `useListEdit` (`AliasList.tsx`, `ExcludedDirectoriesRow.tsx`).
6. **One Bucket-Key Builder (D2)** (`Core/Views/views.ts`): `bandKey(propertyId, bucket, setId?): string` — a property band `propId/bucket`, a sub-band `setId/propId/bucket`, a Set's value-less sub-tail `bandKey(property, UNGROUPED, set)` (retiring `subGroupKey`); a Set band keeps its Set id and the tail `_ungrouped`. It serves hidden and collapsed keys, which merge into the one `'bandKeys'` role; `editHiddenBucket` leaves; `clearBandKeys(keys, propertyId)` (from `clearHiddenBuckets`) is the one prefix strip, and `CLEAR.bandKeys` (`configReach.ts:212-216`) calls it, so a grouped property's delete keeps structural keys. `group.ts` (`:253,337,340`) and `GroupFrame.tsx`' preview (`:387,411`) build band keys through it.
7. **The NexusOS Conversion (throwaway, in the checkpoint):** a script in the session scratchpad copies `~/NexusOS/.nexus/properties.json`, `~/NexusOS/Ideas/_pagecollection.json`, `~/NexusOS/.nexus/interface/homepage/_tiles.json`, and `~/NexusOS/.nexus/contexts/Projects/Pommora/_tiles.json` into `~/NexusOS-Backup-<MM-DD-YYYY>/` (the conversion's date, a folder beside NexusOS outside every Nexus, so it survives across sessions and is never read as content) before its first write; it builds its label → id map from the property list as read, keeping each option's stored id where one is present (an app open between P8 landing and the conversion may already have stored derived ids) and minting through `mintOptionId()` only where none is stored, across all 59 options (Status 8, Tags 3, Brand 20, Concern 5, Scale 5, Color 12, Version 6), strips `group_id` from Status's 8; switches the Ideas views' `group.order`, `sort[Status].order`, and `collapsed_groups`, the homepage tile 0's two views' sort orders and filters, and the Pommora tile 2's sort order and collapses to ids; scopes collapsed Status labels to `prop_01KWG2FPV0VP0D2W6BR5EK485P/<optId>`; keeps Set ids; drops lowercase `open` and `closed`. It verifies the result against *Walkthrough §Your Data*, runs twice without changing anything the second time, and is deleted; the backup folder is removed by its path at Final Verification's closeout, after the full drive on the final head.
8. **The Generator:** `.claude/scripts/make-benchmark-nexus.mjs:169` writes option ids and no `group_id`; the Metadata Drive (`live-drive.mjs:179-180,876`) stops writing `group_id`.

**Order:** 1, 2, 3, 4, 5, 6, then 8, then 7 inside the checkpoint.

**Behavior Changes:** an option rename stops rewriting views, tiles, the Matrix filter, and preview rules (D-1); collapsed groups are remembered per property (D-2); deleting the property a view groups by keeps folder collapses (K-1); Status options stop writing `group_id` (D-3); view JSON shows `opt_…` where it showed words — each Nathan's intent. A hand-copied option keeps its place under a derived id (LC-61), and a Status chip keeps its group glyph while its option is renamed (LC-62). NexusOS's Pommora tile keeps its Status collapses scoped to Status, with `open` and `closed` dropped (Morning Question 9; LC-40).

**Consumers:** `properties.ts`, `ids.ts`, `optionModel.ts`, `optionOps.ts`, `propertyValue.ts`, `findOption`'s readers, `optionLabels`' readers (it becomes `optionIds`, since they order and rank ids), `group.ts`, `sort.ts`, `filter.ts`, `configReach.ts`, `useOptionEdit.tsx`, `views.ts`, `useViewHost.ts`, `viewRow.ts`, `GroupBand.tsx:130`, `bandModel.ts:181`, `TableView.tsx:447`, `Core/Testing/`, the generator, the Metadata Drive.

**Tests:** **Deleted:** about 160 lines of `OptionEditor.test.tsx:267-448`'s re-keying tests (keeping one refused-rename field reversion), `optionOps.test.ts:245-276`, `configReach.test.ts:157-252`'s rename block. **Rewritten:** every fixture holding `group_id` (about 100 occurrences across 28 test files) drops it; option fixtures carry ids. **Written:** a derived id for an id-less option is stable and stored on the next registry write; an option rename leaves a view's sort order untouched; collapsing "Done" under Status doesn't collapse a "Done" under another property; a grouped property's delete keeps a Set id collapse.

**Drive:** Properties Drive group 7: on `~/Test`, create a Select with options, sort and group a view by it, rename an option, and the view keeps its order and collapses while pages holding the word are rewritten; the view sidecar names `opt_` ids.

**Delta:** about −73 (−213 / +140).

**Depends On:** P2 (Title as text), P7 (O-1's renames before the id retype).

**Risks:** about 20 reader files plus the conversion; the head is shippable only once the conversion has run against NexusOS and the generator writes ids, both inside the checkpoint.

`[Compaction checkpoint: c/pre-compaction; on the re-prompt, re-read §Constraints and c/plan-execution before P9 opens]`

##### P9 — List First and One Replay Point

**GOAL:** The Context rename updates the list before its folder and files, so its registry-last window and its reverse path leave; the property and option deletes take the same list-first order with the notes, in Task 11A-2. Both open-time replays run once, after the content index is seeded, each under its own catch, so a replay that throws stops failing the open halfway.

**Units:** N1 (B-2, 04-07, 04 A-01), R's H-8, H-9, H-10.

**Binding Design:**
1. **Property Delete, Landing in Task 11A-2** (`Core/Properties/deleteProperty.ts:112-161`): bundle → note → `removeFromRegistry` → strip pages, Space sidecars, Collection sidecars, views. A value write after the list moves can't resolve the deleted key, closing 04 A-01's window; a delete entry beside a present definition means the list step hadn't landed, and the finish lands it first, so `replaySchemaCascade.ts:52-56`'s `crashed`/`freed` split leaves with the file.
2. **Option Delete, Landing in Task 11A-2** (`optionOps.ts:367-386`): note → `dropOptionFromDef` → strip pages and stash → views, the option delete's halt leaving. `owedName`'s option owner covers every owed option word, rename and remove, read by `registerHeldOptions`, so an unreached page doesn't re-register a deleted word.
3. **Context Rename** (`contextCascade.ts:194-246`): note → `commitTitle` → `relocate` → cascade. A live relocate failure reverts `commitTitle` in the op and clears the note (one registry write, no file touched, the shape of `addProperty`'s rollback); a failed revert leaves the note for the replay. The reverse rename under a second record (`:231-242`) leaves. The `'merge'` collision rule (`:32-33`) stays, its comment rewritten to its reason: both sides of a collision are real tags, and the app's own tag writes run under the Contexts lock the rename holds.
4. **Space Rename** (`:248-288`): unchanged order (note → relocate → cascade), since a Space's folder is its list entry.
5. **One Replay Point** (`Core/Nexus/handlers.ts`): `replayPendingRename(root)` leaves `:86` and runs in the genuine-open block after `seedContentIndex`, `oweSeen`, and `sweepFileHistory`, beside `replaySchemaCascade`; each is wrapped in a catch that logs, so a throw leaves the walk and seed already done. Its sweep reads `queryMembers` from the seeded index; an entry owing a folder relocation calls `oweWalk(root)` (`fileEvents.ts:141-143`), which the `settleNow` at `:112` pays. Re-points run no replay.

**Order:** 5, then 3 (atomic on today's slot file); 1 and 2 land in Task 11A-2.

**Behavior Changes:** none visible in ordinary use. A Context whose folder can't move refuses with nothing renamed, as today; an open whose Context replay throws completes instead of skipping its walk and seed (an accident fixed; LC-48).

**Consumers:** `deleteProperty.ts`, `optionOps.ts`, `fileEvents.ts`, `contextCascade.ts`, `replaySchemaCascade.ts`, `Nexus/handlers.ts`.

**Tests:** **Rewritten:** the Context rename's commit-order and replay tests in `contextCascade.test.ts` and `cascadeRace.test.ts`, on today's slot. **Written:** a Context rename whose relocate fails leaves the list, the folder, and every page as they were; a throwing Context replay doesn't stop the open's seed. The two deletes' order tests land with Task 11A-2.

**Drive:** no new surface; Properties Drive groups 1–7 re-run green.

**Delta:** about −11 (−54 / +43): `answered` and the option arm's slot check stay until P11A deletes `replaySchemaCascade.ts`, which counts them.

**Depends On:** P5 (R3's index-read registration), P8.

**Risks:** every op's crash order moves; each order is replay-tested before P11 rebuilds the notes on top of it.

##### P10 — One Finder

**GOAL:** Every rename, delete, count, and strip finds its pages from the index and its Spaces from the tree through one finder whose doc comment states the one rule: a property reaches the pages of Collections and the Archive, and a Context tag reaches any page. Restore routines report the Space files they couldn't update as a warning instead of ignoring them.

**Units:** R1 (G-1, G-2, 03-06/04-09, 04-05, 04-15) with S4 inside, R2 (G-3), R6's `keyHolders.ts` move.

**Binding Design:**
1. **The Finder** (`Core/Properties/keyHolders.ts` moves to `Core/Index/keyHolders.ts`):
   ```ts
   export type HolderQuery = {
     keys: readonly string[]
     reach: 'governed' | { collection: string } | 'anywhere'
     title?: string
     moved?: { from: string; to: string }
   }
   export type Held = { file: string; id?: string; keys: string[]; values?: Record<string, unknown> }
   export type Holders = { pages: string[]; spaces: string[]; partial: boolean; held: Held[] }
   export function findHolders(root: string, q: HolderQuery, read?: 'values'): Promise<Holders>
   ```
   Pages come from `queryKeyHolders`/`queryMembers` (corpus fallback before the index is ready), filtered by reach (`governed` is Collections plus the Archive; `{ collection }` one Collection and its Archive; `anywhere` every page); Space sidecar paths come from the tree, `SpaceNode.values` for property keys and the new `SpaceNode.contextKeys` for Context keys, each rebased under `moved`. With `read: 'values'`, it answers which keys each candidate holds and its values by id in the same pass (S4), serving the rename clash (which checks `to` only on `from` holders), the delete snapshot, and counts. `Holders` and `HolderQuery` are the only holder types; P7 lands none.
2. **Space Context Keys:** `spaceNodeFrom` (`Core/Contexts/spaceSidecar.ts:59-82`) keeps each Space's raw Context keys in `SpaceNode.contextKeys: Record<string, unknown>` (`Core/Nexus/tree.ts`).
3. **Leaves:** `spaceSidecars` for property and Context sweeps (`Core/Assets/assetMigrate.ts` keeps it as its outside caller), `spaceArm` (`Core/Nexus/cascade.ts:65-68`), `SweepPlan.sidecars`, `sweepRootsById`'s sidecar scan (it reads each Space's path from `byId`), `confirmedKeyHolders` and the delete `snapshot`'s Space loop, and `sweepMembers`' separate candidate code (`contextCascade.ts:65-77`). The disk-truth comments (`keyHolders.ts:13`, `spaceSidecar.ts:49`) are rewritten to the finder's rule and its move rebase.
4. **One Writer:** every arm writes through `sweepGovernedRoots(files)` with its basename dispatch (04-05); the restore routines' own Space loops (`restoreScrub.ts:183-192`, `Core/Trash/trashedCopies.ts`'s refill, `spend.ts:192-197`) fold into it.
5. **G-3:** the scrub's and the trashed-copy refill's page and Space misses return into `spend.ts`'s `unswept`, which `withUnswept` (`cascade.ts:83`) turns into `cascade.warning`; the scrub's line reads `unsweptLine(n, \`values in “${title}” across \`)`.
6. **I-035 Read:** the Context rename's new order (list, then folder) is recorded for P18's rewrite of I-035's event-order sentence; its defect stays.

**Order:** 2, 1, 3, 4, 5, 6.

**Behavior Changes:** a restore that couldn't update some files warns and still completes (G-3, a reading Nathan didn't object to). Nothing else visible.

**Consumers:** `registryProperty.ts:112`, `optionOps.ts:202`, `deleteProperty.ts:142`, `unassignProperty.ts:41`, `cascade.ts:129`, `contextCascade.ts`, `spaceSidecar.ts`, `tree.ts`, `governedSweep.ts`, `restoreScrub.ts`, `trashedCopies.ts`, `spend.ts`, `notifications.ts`.

**Tests:** **Rewritten:** `keyHolders.test.ts:80-216`'s `describe('governedReach')` moves beside the finder; sweep tests seed Spaces through the tree. **Collapsed:** 09-07's sweep-side exact-key pins collapse to the finder's one pin. **Written:** a Context rename reaches a loose page and a property rename doesn't; a Space under a renamed Context is found at its rebased path; a restore whose Space sidecar is unreadable warns and completes.

**Drive:** Properties Drive group 8: on `~/Test`, rename a Context whose Space links another Space in it; both sidecars update and the Matrix keeps the link.

**Delta:** about −45 (−255 / +210; the correctness requirements the disk scan met implicitly inside).

**Depends On:** P9 (the post-seed replay the tree-sourced finder needs).

**Risks:** an outside Space edit not yet settled is missed until it settles, as pages already are.

`[Compaction checkpoint: c/pre-compaction before the plan's heaviest phase; on the re-prompt, re-read §Constraints, c/plan-execution, and this document's §P11 before P11 opens]`

##### P11 — One Note per Item (Written as P11A and P11B)

The phase lands as two phases, each with its own Review Checkpoint: **P11A — One Note per Item: The Notes and the Renames** (the notes module and its runner, the property kind with the two deletes' list-first orders, and Context and Space renames on the notes; the journals, the slot, both replays, `retry`, and the four Try Again forms leave) and **P11B — One Note per Item: Deletes and Remove** (Context and Space deletes capture up front and finish, Remove's note, the property delete's purge miss, and drive group 9). The design below covers both.

**GOAL:** Every property, Context, and Space keeps its own entry in one device-local notes file, so unfinished work on one never blocks or unprotects another, and every many-file change writes its note first and refuses if it can't. Every delete finishes what it can and offers one Try Again that finishes everything owed, a name still owed to unfinished work is refused, and Remove writes its note so a partial Remove can be retried.

**Units:** N2 (B-1, B-3, B-4), N3 (03-03/04-13, C-2's retry), R's H-0 to H-18, F-1 to F-7, Approach C's runner, B-2's two deletes, I-036, I-039.

**Binding Design:**
1. **The Notes Module** (new `Core/Nexus/owed.ts`):
   ```ts
   export type Owed = { rename?: string[]; strip?: string[] }
   export type PropertyEntry = Owed & { kind: 'property'; options?: Record<string, Owed>; unassigned?: string[] }
   export type ContextEntry = Owed & { kind: 'context'; bundle?: string }
   export type SpaceEntry = Owed & { kind: 'space'; contextId: string; bundle?: string }
   export type Entry = PropertyEntry | ContextEntry | SpaceEntry
   export type Notes = Record<string, Entry>
   export function readNotes(root: string): Promise<Notes>
   export function editNote(root: string, id: string, edit: (e: Entry | undefined) => Entry | undefined): Promise<Result<Entry | undefined>>
   export type Owner = { kind: 'property' } | { kind: 'context' } | { kind: 'space'; contextId: string } | { kind: 'option'; propertyId: string }
   export type Landing = { owner: Owner; name: string; except?: string }
   export function owedName(notes: Notes, landing: Landing): boolean
   export const owesRename: (e: Entry | undefined) => boolean
   export function restoreNote(root: string, id: string): Promise<Result<unknown>>
   export function runNoted<T>(root: string, id: string, change: { lands?; note; list; sweep; settle; under? }): Promise<Result<{ listed: T; cascade: CascadeReport }>>
   // in Core/Nexus/finishOwed.ts, beside owed.ts, since the pass imports every op's sweep
   export function finishOwed(root: string, deps: TrashDeps): Promise<CascadeReport>
   export const owedRename: (o: Owed, from: string, to: string) => Owed
   export const owedDelete: (o: Owed, current?: string) => Owed
   export const owedRestore: (o: Owed) => Owed
   export const owedSwept: (o: Owed, swept: readonly string[]) => Owed
   ```
   Entries key by entity id (`prop_…` and Context and Space ULIDs share no namespace), and option parts key by option id. `readNotes` reads through `readAppFile`; `editNote` writes through `updateNexusFile(abs(OWED_REL), …, true)`, answering `false` when the file can't be written. The compose rules are one-liners: `owedRename` appends the old name to `rename` and drops the new one; `owedDelete` moves `rename` plus the current name, when one is given, into `strip`, an option Clear passing none (H-2); `owedRestore` moves `strip` back into `rename` (H-4), which `restoreNote` applies; `owedSwept` removes the names a clean sweep reached. Renaming back composes to nothing owed. An entry clears only whole (H-1).
2. **The File:** `OWED_REL = \`${NEXUS_DIR}/.owed.json\`` in `Core/Paths/nexusPaths.ts`; the four journal constants (`:27-30`) and `exclusion.ts:58` with its imports leave. `journalSlot.ts`, `propertyJournal.ts`, `contextJournal.ts`, and `replaySchemaCascade.ts` are deleted, and `replayPendingRename` (`contextCascade.ts:290-352`) leaves.
3. **Every Op Writes Its Note First (F-5):** `rekeyProperty` (rename, Label Format), `deleteInner` (after the bundle mints, H-5's residual order), `rekeyOptions` (option rename, Value Format), `deleteOption`, `unassignProperty` (`unassigned: [collectionId]`), `renameContextOp`, `renameSpaceOp`, and the Context and Space deletes (`bundle` in Pommora Trash mode, omitted in System Trash mode), each through `runNoted` except the Context and Space deletes, whose note and list step stay in `deleteOp`'s branch. `editNote` answering `false` refuses the op with nothing changed. Option Clear writes no note and composes only when the option already owes old names (LC-58). The `OWED` refusals (`optionOps.ts:242,377,346-348`) and every discarded-`false` path (`registryProperty.ts:183`, `deleteProperty.ts:123`, `contextCascade.ts:217,277`) leave.
4. **Replay** (`finishOwed`): one pass under H-12's lock order — Context entries first under the Contexts lock, then Space entries, then property entries under the schema lock, the notes file's own lock innermost and never nested — each entry under a catch that logs. Inside an entry: `rename` → `options` → `unassigned` → `strip` (H-1). A Space entry stays while its parent Context owes a rename; a Space entry whose parent Context is owed a delete or is gone drops. Each arm re-derives per name from the current lists, skipping a name a live entity holds now (H-16). A Context rename arm commits an uncommitted title before its folder move and reads the tree again (`await refreshTree(root)`) inside the move's branch before it finds, since after a crash between the list step and the folder move the open's tree holds none of that Context's Spaces for `moved` to rebase (P10); a Space arm finds after its move, which patches the tree in place; an arm that can't reach its list file leaves its entry as it stood with one miss (`stuck`); a delete arm's folder step keeps `oweWalk(root)`; one whose current name sits in `strip` lands the list step first, moving the folder into `bundle` or to the system Trash (H-5). `NO_REACH` clearing a record on any unmapped state (`replaySchemaCascade.ts:29`) leaves with the file.
5. **The Open:** P9's two replay calls become one `await finishOwed(root)` in the genuine-open block after the seed, before `settleNow` (`handlers.ts:111-112`).
6. **Try Again (H-17, F-6):** `{ op: 'finishOwed' }` joins `mutate`'s union and runs `finishOwed(root)` outside `dispatch`'s per-op locks, taking each lock itself. `CascadeReport` gains `owed?: true`, set when an op's entry stays; the slice's one `finishOwed` action sends it: `warnCascade(cascade, cascade.owed ? get().finishOwed : undefined)`, an `'owed'` refusal offers the same, and `confirmDelete` reads it. `MutateOutcome.retry`, the `replayProperty` op, `SchemaCascade`, `journalRecord`, `renamed`'s retry (`mutate.ts:68-77`), `sweepAgain`, the `from` branches (`contextCascade.ts:101-109,206-211,260-264`), and `Unswept` leave.
7. **Restores (H-4, F-3):** property, Context, and Space restores run create → `restoreNote` → spend the bundle. `createProperty`'s delete-record consumption (`registryProperty.ts:94-100`) leaves.
8. **The Owed-Name Refusal (B-4, H-14, F-1, F-2):** `createProperty`, `rekeyPlan` (rename and Label Format), Context create and rename, and Space create and rename refuse a name `owedName(notes, { owner, name, except: ownId })` answers for, with code `'owed'` and the general message "An earlier change hasn't reached every file yet." (`optionOps.ts:45`'s text, moved into `owed.ts`). An entity's own names never refuse it. A restore runs through create and is refused the same way. `freeLabel`'s `owed` parameter leaves.
9. **Option Names (H-7):** `owedKeys` folds into `owedName`'s option owner, the property entry's option `rename` and `strip` names, read by `registerHeldOptions`, `editOption`'s add and relabel, `renameOption`, and `setValueFormat`, each refusing a landing on another option's owed name.
10. **Deletes Finish (B-3):** Context and Space deletes run bundle → note → list or folder → files, and a miss leaves the entry owed with Try Again. `unlinkMembers`' undo-and-throw (`contextCascade.ts:166-181`), the Context put-back and unmint (`Core/Trash/delete.ts:122-135`), and the second record writes (`delete.ts:115,137`) leave; `undoSweep` leaves with its only caller and its private `keysPutBack`, so `putBackEntries` stays P6's one put-back. The finishing arm reaches a deleted Context's or Space's views by id on every pass while the delete is owed, so `goneEdit`'s two cases answer nothing, and the capture leaves out the deleted folder's own files.
11. **Up-Front Capture (H-11, F-4):** property, Context, and Space deletes capture their holders' values before the sweep through `findHolders(…, 'values')`: from the page file when it's readable, from `readPageRelations`' values when it isn't. `SweepCapture`, `UnlinkOutcome`, `captureRoot`, and the capture closures (`contextCascade.ts:51-57,80-84,134-143,151-163`) leave.
12. **Remove (N3):** `unassignProperty` runs through `runNoted`: its note, then its list step (the one sidecar write unassigning the property and clearing its view columns), then the stash and strip through `stashAndStrip`, which the finish's `unassigned` part shares; it answers `cascade.owed` when anything skipped or a holder is ID-less, duplicate-ID, or refused (S's partial reading; LC-19). The three `PropertyFrame.tsx` sites (`:255-257,280,302-306`) return to the list on a landed reply, owed or not. The `unassigned` arm re-runs read → stash → strip for each Collection still not assigning the property and drops a Collection that assigns it again (F-7, H-6); a global delete subsumes it (H-3).
13. **Locks:** `createContextGroup` runs under `underContexts` (H-13, `mutate.ts:224-227`).
14. **The Purge Check (H-18):** `unassignAndPurge` (`deleteProperty.ts:163-172`) answers `written.ok`, and `stripAndRemove` counts a failure as a skip, keeping the entry owed.
15. **The Runner:** `runNoted` in `owed.ts`, landing in Task 11A-1: the owed-name refusal, the note, the list step, the sweep, the put-back on a refused note or list step, and the settle, held while the entry it sits under owes a rename (*§Planner's Calls › P11*).

**Order:** 1, 2, and 15; then 3 with 6 (every op and its reply move together, the two deletes taking P9's list-first orders); 4 and 5; 7; 8 and 9; 10 and 11; 12; 13; 14.

**Behavior Changes:** each change writes its own note, so one property's unfinished rename never blocks or unprotects another (B-1, Nathan's intent); option renames, format changes, option deletes, and Clear stop being refused because some property owes work (LC-45); Context and Space deletes that miss pages finish and offer Try Again (B-3); a name still owed is refused with Try Again (B-4; LC-7, LC-8, LC-9); a change whose note can't be written refuses (LC-12); one Try Again finishes everything owed (LC-6); a Trash entry for a partial delete holds the unreached pages' values (LC-10); re-adding a removed property cancels what its Remove still owed there (LC-18); a Remove that missed pages returns to the list with Try Again (C-2, Nathan's intent); a property delete whose list step fails strips nothing, and an option delete that misses a page leaves the list at once (B-2); a change held by an owed rename reads as done (LC-63); a Context rename whose folder can't move or go back offers Try Again (LC-64); Clear's misses offer no Try Again (LC-58).

**Consumers:** every multi-file op in `registryProperty.ts`, `deleteProperty.ts`, `optionOps.ts`, `unassignProperty.ts`, `contextCascade.ts`, `Core/Trash/delete.ts`, `Core/Trash/gather.ts`, `restoreProperty.ts`, `spend.ts`; `mutate.ts`, `mutateRequest.ts`, `nexusSlice.ts`, `notifications.ts`, `PropertyFrame.tsx`, `useOptionEdit.tsx`, `Nexus/handlers.ts`, `nexusPaths.ts`, `exclusion.ts`, `cascade.ts`.

**Tests:** **Deleted:** the one-slot pins (09-10's about −150 across four files, `journalWiring.test.ts:274-319`, `optionOps.test.ts:707`), `propertyJournal.test.ts`, `contextJournal.test.ts`. **Rewritten:** `journalWiring.test.ts`, `replaySchemaCascade.test.ts` (as `owed.test.ts`), `cascadeRace.test.ts`, and `contextCascade.test.ts`'s journal parts against keyed entries (about 2,300 lines touch them; about −250 leave). **Written:** the four compose rules and `a→b→a` composing to nothing; H-1's entry kept while its rename is owed and the Context-before-Space order; H-2's clear under an owed rename; H-4's restore turning `strip` into `rename`; H-5's crash between note and list for each kind; H-14's refusals across the five sites; an unwritable notes file refusing every op; the index capture's value round-trip for one value of every type.

**Drive:** Properties Drive group 9: on `~/Test`, with one page made unreadable (`chmod 000`), rename a property and see "Couldn’t update 1 Item" with Try Again; rename a second property and see no refusal; create a property under the first's old name and see the owed refusal; restore the page's mode, press Try Again, and both renames finish and the name frees. The drive restores every mode and file it touched.

**Delta:** about −12 across both halves: P11A about −10 (−405 / +395) and P11B about −2 (−130 / +128); the per-op put-backs and settles, H-16's per-name skips, H-1's holds, and the tree re-read cost what R priced at none.

**Depends On:** P6 (`putBackEntries`), P8 (option ids), P9 (the Context rename's order), P10 (the finder and its capture).

**Risks:** crash-order semantics move for every op; the runner's one order is what keeps each op's change small. The index capture's fallback covers a value type the index doesn't round-trip.

##### P12 — The Stash and Trash Records

**GOAL:** The stash stays in the Collection's settings file, records when each property's values were removed, and ages them out after the History Timeframe on the cleanup's two existing triggers. Re-adding a property drops entries for pages that left, parks a trashed page's value in its Trash copy, and surfaces any page it couldn't refill with Try Again; a restored property gets its stash back in the right order. A partial Trash entry shows its mark, and its restore says it may not hold everything.

**Units:** C1 (C-2), C2 (C-3), C3 (N-1), C4 (N-2's describer, in P18), S's flags 3–10, the restore notice's Try Again.

**Binding Design:**
1. **One Vocabulary (LC-3):** `property_cache` → `property_stash` on disk; `Core/Properties/propertyCache.ts` → `Core/Properties/propertyStash.ts`; `cachedValues` → `stashedBlock`; `patchCacheBlock` → `patchStashBlock`; `editCacheBlocks`/`editCaches` → `editStashBlocks`/`editStashes`; `CollectionNode.cached` → `stashed`; `containerFields.ts`'s `cachedIds` → `stashedIds`; the record's `caches` → `stashes`.
2. **The Block:** `type StashBlock = { removed_at: string; values: Record<string, unknown> }`; on disk `property_stash.<propertyId>: { removed_at: "<ISO-8601>", values: { <pageId>: raw } }`. `stashedBlock(sidecar, propertyId): StashBlock | null` is the one reader, answering `null` for a block without a string stamp. `patchStashBlock(sidecar, propertyId, block?: StashBlock)` is the one writer, taking the block whole and removing it (and an emptied `property_stash`) when it holds no values, folding the three hand-built `{ values: x }` spellings (`removeProperty.ts:55`, `assignment.ts:104`, `propertyCache.ts:44-47`). The rename and the block land in one commit (Tasks 12-1 and 12-2), with the record's block shape, so no head writes a stampless block.
3. **Who Stamps:** Remove's one stash write, `stashAndStrip`, shared with its finish, stamps `new Date().toISOString()`; the refill, option edits and Link re-spells (`editStashes`), the purge, and the restore spread the block they read, keeping its stamp. `editStashes`' callback gains a third argument, the block's `removed_at`.
4. **The Age Cleanup:**
   ```ts
   export async function sweepStashes(root: string): Promise<void> {
     const collections = heldTreeOf(root)?.collections ?? []
     const ids = new Set(collections.flatMap((c) => c.stashed ?? []))
     if (!ids.size) return
     const cutoff = Date.now() - (await readFileHistoryConfig(root)).keepMs
     await editStashes(root, collections, ids, (_values, _id, removedAt) =>
       Date.parse(removedAt) < cutoff ? {} : null,
     )
   }
   ```
   in `propertyStash.ts`, called as `void sweepStashes(root)` beside `void sweepFileHistory(root)` at `Core/Nexus/handlers.ts:110` and when `historyDays` is written (`Core/Settings/handlers.ts:46`, `archiveHistoryDays` not), logging and swallowing errors as `sweepFileHistory` does. A Nexus with no stash reads nothing, not even the History Timeframe, and a sidecar is written only when a block expired.
5. **The Refill** (`assignment.ts`'s `restoreCachedValues` becomes `refillStash`): after the refill, the block keeps only ids still owed to a page of this Collection, `(members ∪ trashed) − taken − gone`, passing no stamp; `refillStash(root, propertyId, collectionId)` resolves its Collection by id, since a notes entry holds Collection ids. When some stashed id is absent from `byId`, `trashedHolders` (exported from `Core/Trash/trashedCopies.ts`, filtered to page and Set bundles whose `collectionOf(originOf(record))` is this Collection; Collection bundles never qualify) supplies those pages' Trash copies as extra roots to `refillValues`, whose rewrite is P10's `refillOf(def, frozen)`, the same rewrite `refillTrashed(root, links, defs, frozen)` lands a restore's Link values through, so one reconcile, encode, and blank-check writes every copy; `sweepRootsById`'s `roots` type is `RootsById = ReadonlyMap<string, Pick<EntityRecord, 'kind' | 'path'> | null>`.
6. **Refill Skips Surface (LC-5):** `refillValues` answers `sweepRootsById`'s `{ taken: ReadonlySet<string>; skipped: number }`; `refillStash` answers its skipped count and carries no assigned check of its own; `assignInner`, which every re-add passes through (the op, the restore, and `addProperty`), writes `refill: [collectionId]` into the property's entry and answers `owedReport` or `reachReport`, and `assignProperty` answers that `MutateReply`, which P7's `mutate` arm returns (`PropertyEntry` gains `refill?: string[]`, which `owesAnything` counts); `finishProperty`'s `refill` part re-runs `refillStash` through `sweepEach` for each listed Collection, skipping one gone or no longer assigning, and drops it when nothing skipped. Inside the entry it runs after `unassigned` and before `strip` (H-1's order becomes `rename` → `options` → `unassigned` → `refill` → `strip`), and `owedDelete` drops it, since a delete purges every Collection's block (H-3).
7. **The Trash Record:** `snapshot` captures each Collection's block whole into `stashes` (`deleteProperty.ts:61-72`); `record.ts:79` becomes `stashes: z.record(z.string(), z.object({ removed_at: z.string(), values: z.record(z.string(), z.unknown()) })).optional()`, landing with Task 12-2's block. `restoreProperty` writes each recorded block through `patchStashBlock` with its stamp minus the ids `record.values` holds, then runs the `assignInner` loop, then the `record.values` refill (LC-26).
8. **Collections in the Trash:** a global delete leaves them untouched (LC-2); a restored Collection's inert assignment id stays (LC-4).
9. **The Partial Mark (N-1, LC-37):** `BundleRow` gains `partial?: true` from `record.partial` in both of `bundleRowOf`'s branches (`Core/Bundles/rows.ts:83-125`); `TrashRowView` (`Core/Settings/TrashFrame.tsx:123-170`) shows a warning glyph with the spoken label "Recorded Partly" in its trailing slot. A partial restore adds `“${title}” was recorded partly, so some of what it held may not come back.` to `cascade.warning` through `recordedPartly`, beside `partial` in `Core/Bundles/record.ts`.
10. **A Restore's Own Notice Keeps Its Try Again:** the Restored notice replaces the slice's in the same turn, so its lines already show once; `restoreOne` passes the reply's owed Try Again to `notifyOutcome` (LC-46).

**Order:** 1, 2, 3, 7, 5, 6, 4, 8 (nothing to build), 9, 10.

**Behavior Changes:** stash entries age out after the History Timeframe (C-3, Nathan's intent; LC-26, LC-27); re-adding a property drops entries for pages that left and parks a trashed page's value in its Trash copy (C-2, Nathan's intent; LC-36); a re-add that couldn't refill a page offers Try Again (LC-5); restoring a deleted property refills its stash (C-2); a partial Trash entry shows its mark and its restore says so (N-1); a restore's own notice keeps the Try Again its reply owes (LC-46).

**Consumers:** `propertyStash.ts`, `unassignProperty.ts`, `assignment.ts`, `deleteProperty.ts`, `restoreProperty.ts`, `record.ts`, `optionOps.ts` and `cascade.ts` (renames only), `containerFields.ts`, `tree.ts`, `trashedCopies.ts`, `governedSweep.ts`, both trigger sites, `owed.ts`, `rows.ts`, `TrashFrame.tsx`, `ArchiveView.tsx:228` (same row type), `browser.ts`, `notifications.ts`.

**Tests:** **Rewritten:** the stash arms in `cascade.test.ts:855-936`, `configReach.test.ts:131-270`, `fileEvents.test.ts:1314`, `treeIndex.test.ts`, `assignment.test.ts:72`, `deleteProperty.test.ts:124-145`, `optionOps.test.ts:1008-1355`, `removeProperty.test.ts:88` (renamed `unassignProperty.test.ts`), `value.test.ts`, and `trashRecovery.test.ts:787`, re-seeded with the block shape. **Written:** Remove stamps and every other writer keeps the stamp; `sweepStashes` drops only expired blocks and opens no sidecar without `stashed`; owed-only `left`; Trash copies by origin only; a page in both a block and `record.values` takes the delete-time value and isn't reported unrestored; a refill skip leaves the entry owed and Try Again refills; the partial row mark and restore line.

**Drive:** Properties Drive group 10: on `~/Test`, remove a property from Collection A, trash one page, re-add the property, restore the page, and it holds its value; set `.nexus/settings.json`'s `historyDays` to 7 with a block's `removed_at` backdated eight days, and reopening drops the block. A Trash row for a partial record shows its mark.

**Delta:** about **+93** (−106 / +199). C-3's stamp and cleanup (about +22) and C-2's stale drop and Trash parking (about +20) deliver ruled behavior in minimal form on existing mechanisms (`editStashes`, `refillValues`, `trashedHolders`, `readFileHistoryConfig`, the two triggers) with no new pass, module, or Sync rule; the refill-skip report (about +23) fixes a silent loss through the one function every re-add passes; the record and restore order (about +8) and the partial mark (about +21) deliver C-2, LC-26, and N-1; the block literals' fold, the one stash name, and the double report's fold remove what they replace.

**Depends On:** P11 (the notes entry Remove and the refill ride).

**Risks:** the sweep is a new writer of synced sidecars (*§Sync Rebuild Inputs*); a block that expires mid-session can still refill until the next trigger, as expired file history stays viewable.

`[Mid-Plan Neutral Gate: one fable-high agent over BASELINE..<P12's head>, given only the two heads and §Neutral Gate Intention Statements › Mid-Plan; re-run after each fold until it answers yes. The data layer is complete here: values, definitions, undo, operations, options, crash recovery, reach, the stash.]`

`[Compaction checkpoint: c/pre-compaction; on the re-prompt, re-read §Constraints and c/plan-execution before P13 opens]`

##### P13 — Columns Carry Their Answer

**GOAL:** A view resolves each column's type and definition once and hands it to every filter, sort, group, and cell, so the per-cell schema scans and the scattered optional Context-id defaults leave. New views stop storing a redundant hidden list, view hosts own one style map, and a text cell opens one subscription where it opened three.

**Units:** W1 (07-01, 02-13, 06-08's lookup half), W3 (07-02, 07-08, 07-09, 07-14, 07-16), W5 (06-08's heading-settings half, 02-12's outcome), 07-17.

**Binding Design:**
1. **Compiled Columns:** `resolveColumns(view, schema, contextIds)` (`Core/Views/Pipeline/columns.ts:37-46`) takes `contextIds` as required and returns `ResolvedColumn = { id: string; kind: ColumnKind; type: ColumnType; def?: PropertyDefinition }` (`Core/Views/viewRow.ts`); the hand-built `ResolvedColumn`s (`resolveView.ts`, `VisibilityFrame.tsx`) resolve through it. One compiled `fieldOf(column): (row: ViewRow) => PropertyValue` per column per view pass serves `prepareRule`, `buildCriterion`, and grouping. `columnType`, `resolveFieldValue`'s `schema.find` before its memo, `Cell.tsx:45`'s re-scan, the 23 `declaredType(` calls (each reads `column.type`), and the 19 optional `contextIds` defaults leave.
2. **Smaller Folds (W3):** a new view mints `hidden_properties: []` and the mints drop their `schema` parameter (`ViewFrame.tsx:80`, `ViewTile.tsx:71,359`, `tilesFile.ts:84`, `create.ts:66`, `pickView.ts:16`), retiring `pickView`'s WeakMap — the `property_order` allowlist already hides everything else, so a new view still shows Title only; view hosts own one memoized style map and `useStyleFor` leaves (its readers `PropertyFrame.tsx`, `FilterFrame.tsx` read the map); `patchedValues` is shared by `withSeeds` and `assignValue`; `commitHide` calls `hideShown`; the Group pane memoizes its plan on `[view, schema, nests]`, as `useViewHost.ts:65` does.
3. **Heading Settings (W5):** the two heading settings ride `ValueContext` (`Core/Properties/valueContext.ts`), giving `buildValueContext` its job; `TextCell.tsx:31-34`'s three store subscriptions become one context read, and `LinkCell.tsx:40-41` reads the same, both taking `ValueContext` itself.
4. **07-17:** *§Measurement Rules › 07-17*.

**Order:** 1, 3, 2, 4.

**Behavior Changes:** none. New views keep the Title-only start (Morning Question 6; LC-38).

**Consumers:** `columns.ts`, `resolveView.ts`, `VisibilityFrame.tsx`, `fieldValue.ts`, `filter.ts`, `sort.ts`, `group.ts`, `Cell.tsx`, `CardValue.tsx`, `CardsView.tsx`, `TableView.tsx`, `declaredType(`'s 14 files, the `contextIds` default sites, the six mint sites, `useColumnStyles.ts`, `valueContext.ts`, `TextCell.tsx`, `LinkCell.tsx`, `GroupFrame.tsx`.

**Tests:** **Rewritten:** column and pipeline tests construct columns through `resolveColumns`; `mintNewView` tests pin `hidden_properties: []` with a Title-only render. **Kept:** `valueContext.test.ts`, which now pins the heading settings.

**Drive:** Properties Drive group 11: a new view shows only Title; revealing a property shows it; a Table with Text, Link, and Select columns renders and edits as before.

**Delta:** about −73 (−291 / +218): the resolver's arms, the plan's `Grouping`, and W5's context fields add about +80 against about −150 deleted.

**Depends On:** P2 (`ColumnType`), P4 (`fieldValue.ts`), P8 (option ids in the compiled field).

**Risks:** `TableView.tsx` and `CardsView.tsx` read columns on the render path; the compiled `fieldOf` is built once per pass, never per cell.

##### P14 — The Per-Kind View Record

**GOAL:** One renderer-free record keyed by value kind states each kind's filter operators, operand compile, sort keys, and buckets, replacing about fifteen switches and two text projections. An unreadable filter value is ignored, a Checkbox's "is not empty" works, and empty values sort last for every type; the view pipeline's per-edit cost and the Matrix filter's cost are measured at Benchmark scale and settle Approach K and 07-10 by rule.

**Units:** W4 (Approach H, 07-11, K-1, K-2), W2 (07-04), the K and 07-10 measurements.

**Binding Design:**
1. **The Record** (new `Core/Views/valueKinds.ts`, a renderer-free `.ts` the React-free pipeline modules read; `VIEW_KINDS` and `ViewKind` already name the view-type record in `Core/Views/views.ts`, so the record is named for the `ValueKind` it's keyed by):
   ```ts
   export type ValueKindSpec = {
     ops: readonly FilterOp[]
     operand: 'none' | 'text' | 'number' | 'date' | 'options' | 'checkbox'
     prepare(op: FilterOp, operand: unknown): ((v: PropertyValue) => boolean) | 'abstain'
     sortKey(v: PropertyValue): string | number | null
     bucket?(v: PropertyValue, granularity?: Granularity): string | null
   }
   export const VALUE_KINDS: Readonly<Record<ValueKind, ValueKindSpec>>
   ```
   It replaces `filter.ts`'s per-kind evaluators, `sort.ts:36-73`'s per-kind keys, `group.ts`'s bucket arms, `filterModel.ts`'s `KIND_OPS`, `creationSeeds.ts`'s `SEEDS_FROM_SORT`, `reassign.ts`'s `FROM_GROUP_KEY`, and `configReach.ts`'s whole-option operand class (07-11).
2. **One Shown Text (W2):** `shownText(value: PropertyValue, def?: PropertyDefinition): string` in `formatValue.ts` replaces `filter.ts`'s `textValue` and `sort.ts`'s `sortText`, mapping option ids to labels.
3. **K-1:** `prepare` parses its operand once per pass and answers `'abstain'` when it doesn't read or the op doesn't apply (today `true` at `filter.ts:165-166,181,195,224,236,240,266,287,299`), riding `prepareRule`'s existing abstain (`filter.ts:60,69-85`); Checkbox's `isNotEmpty` answers `v.kind === 'checkbox'`; a hand-written rule whose operator its kind doesn't answer abstains the same way (LC-48); `checkboxValue(checked)` lands in `propertyValue.ts` with the Checkbox seed, its first reader; `filterSeeds` (`creationSeeds.ts:75-103`) seeds nothing from an abstaining rule.
4. **K-2:** a `null` sort key sorts last in either direction, for every kind; dragging a row into another value's run in a sorted view keeps reassigning (`useViewHost.ts:75,109-119,199-209`).
5. **Measurements:** *§Measurement Rules › K* and *› 07-10*.

**Order:** 2, 1, 3, 4, 5.

**Behavior Changes:** an unreadable filter value is ignored, which also changes which values a new page created in that view inherits (K-1, Nathan's intent); Checkbox "is not empty" works (K-1); empty values sort last for every type that can be empty, in both directions, while a Checkbox's unchecked box keeps its place as a value in a sort (K-2, a reading Nathan didn't object to; LC-53).

**Consumers:** `filter.ts`, `sort.ts`, `group.ts`, `filterModel.ts`, `creationSeeds.ts`, `reassign.ts`, `configReach.ts`, `formatValue.ts`, `FilterFrame.tsx`.

**Tests:** **Rewritten:** the per-kind filter, sort, and group tests through the pipeline functions that read `VALUE_KINDS`. **Written:** a Number rule holding letters abstains, and inside an "Any" group the group no longer matches every page; Checkbox "is not empty"; an empty value sorts last ascending and descending for each kind.

**Drive:** Properties Drive group 12: a Number filter holding "abc" inside an Any group leaves the other rule deciding; a Checkbox "is not empty" filter shows only checked pages; a Select sort puts empty rows last in both directions.

**Measurements:** K and 07-10 on `~/Benchmark-Large`.

**Delta:** about −112 (−550 / +438; the record's about +257 new lines inside).

**Depends On:** P13 (compiled columns), P2, P8.

**Risks:** a behavior phase; each kind's old switch is deleted only once its record entry's tests pass.

`[Compaction checkpoint: c/pre-compaction; on the re-prompt, re-read §Constraints and c/plan-execution before P15 opens]`

##### P15 — Pick Model and One Writer

**GOAL:** Picking a value is one pure model for one row and many, the writer is assembled one way, and the row menu takes the one vocabulary the value seat's menu reads. The filter's date picker opens the value's picker on the column's clock, and the text pen reads "Open In Editor".

**Units:** X1 (06-04, 06-05), X2 (06-06, B-06-01; J-3 and J-10 land in P16B), X3 (J-1's clock, 06-09/L-15), X4 (J-4, J-5's comment), X5 (06-11, 06-12), 02-10.

**Binding Design:**
1. **The Pick Model** (new `Core/Properties/Pickers/pickModel.ts`, pure): `pickGroups`, `toggleValue`, `pickOver(def, currents, onCommit, onClose)` carrying the N-row rule (today's `massAssign.ts:13-18`), the picked marks, and the close rule, and `pickedValue` as its one-row case (`pickShape` inlines into its last reader); `Core/Properties/Pickers/massAssign.ts` merges in and is deleted, and `MassPropertyPicker.tsx` reads the model.
2. **One Writer:** `useValueWriter(host)` and `oneShotWriter(...)` replace `ValueWriter`'s three assemblies (`Core/Interface/Menus/entityMenuActions.ts`, `PropertyPanel.tsx`, `useViewHost.ts`), built on P6's reshaped writer.
3. **One Row-Menu Vocabulary:** `HideFrom = 'view' | 'row'` names what a value's Remove takes it out of, and a column with no look in hand answers `cellMenuModel`'s `bare` arms, so the value seat's one row menu builds from `cellMenuModel`'s kinds mapped through `valueMenuIntent` (`Core/Properties/Pickers/valueClick.ts:58-59`). The panel's row menu itself, the `page-value` kind with its three `value:*` actions, `rowMenu`'s hand mapping, and `fileValueMenu` leave in P16B (*§The Phases › P16*, item 4). Both link menus read **Rename** then **Edit Link** (**Edit Title** where the connection menu edits a page link's title): `cellMenuModel`'s link kind (`cellMenu.ts:126-131`) moves from "Edit, Rename" to that order and wording, matching `connectionMenu.ts:81-102`.
4. **The Filter's Clock (X3):** `FilterFrame.tsx:351-371`'s hand-built `CalendarPicker` is replaced by `DateTimeValuePicker` with the operand as a `dateTime` value, on the column's `time_format`; `dateFormFor` states the date form a picker shows once.
5. **Small Ones (X4, X5):** `Core/Properties/Cells/TextCell.tsx:89`'s aria-label reads "Open In Editor" and `.claude/scripts/drive-harness.mjs:282`'s `PEN` selector follows (the Text Property Drive reads it); `PropertyPanel.tsx:151`'s `KNOB` comment leaves (J-5's behavior stays); `propertyMenuBranches` moves to `Core/Actions/propertyRows.ts`; `Core/Views/Cards/cardValueInput.ts` becomes `cardColumns.ts`; `valueField.tsx` is renamed for its one export.
6. **The Missing-Id Fallbacks:** `useViewHost.ts:212` and `propertyMenuActions.ts:96` fall to a Context definition only for a Context id.
7. **Measurement:** *§Measurement Rules › 02-10*; on its Fail outcome `setProperty` and `setContext` take `paths`, and `assignValue` takes the rows it writes.

**Order:** 1, 2, 3, 4, 5, 6, 7.

**Behavior Changes:** the two link menus share one order and wording (J-10; LC-47); the filter's date picker uses the column's clock (J-1); VoiceOver reads "Open In Editor" (J-4) — each Nathan's intent. The panel's menus read as today until P16B.

**Consumers:** `massAssign.ts`, `MassPropertyPicker.tsx`, `PropertyPicker.tsx`, `entityMenuActions.ts`, `PropertyPanel.tsx`, `useViewHost.ts`, `assignValue.ts`, `propertyMenu.ts`, `cellMenu.ts`, `filePick.ts`, `valueClick.ts`, `connectionMenu.ts`, `FilterFrame.tsx`, `DateTimeValuePicker.tsx`, `TextCell.tsx`, `drive-harness.mjs`, the Text Property Drive (`live-drive.mjs:279,287,292,365`).

**Tests:** **Rewritten:** `massAssign` and `pickedValue` tests merge on the model; `cellMenu.test.ts`'s link order. **Collapsed:** the two duplicate editor pairs (06-15). **Written:** a filter date picker on a 24-hour column under a 12-hour Nexus shows 24-hour times.

**Drive:** Properties Drive group 13: a filter's date picker opens the value's picker on the column's clock, without an End Date. The Text Property Drive runs on the new pen label.

**Measurements:** 02-10 on `~/Benchmark-Large`.

**Delta:** about −77 (−205 / +128): the pick model's new file offsets most of what it removes, and 06-09's chip merge isn't this phase's.

**Depends On:** P6 (the writer), P13.

**Risks:** the panel's right-click chain changes shape; the drive group exercises every row kind.

##### P16 — One Value Seat (Written as P16A and P16B)

The phase lands as two phases, each with its own Review Checkpoint: **P16A — One Value Seat: The Seat, the Table, and Cards** (the seat lands and the table's and Cards' copies move onto it, `CardValue.tsx` and `useViewHost.pickTarget` leaving) and **P16B — One Value Seat: The Native Router, the Panel, and No Fabricated Definition** (`MenuSeat` replaces `ValuePickPresenter`, the panel's value interaction and its one row menu move to the seat, `rename` folds into `popover`, `syntheticContextDef` leaves, and drive group 14). The design below covers both.

**GOAL:** Clicking, right-clicking, and editing a value is one shared seat for the table, cards, and panel, with the native menu's fourth router folded into it, and a Context column reaches the pickers without a fabricated definition. The panel's five jobs split along that seam.

**Units:** X6 (Approach B; 06-01, 06-02, 06-03), `syntheticContextDef`'s fold.

**Binding Design:**
1. **The Seat** (new `Core/Properties/Cells/ValueSeat.tsx`): `useValueSeat(host: SeatHost)` and `<ValueSeat>`, with `SeatHost` holding each surface's genuine differences (`anchor`, `commit`, `rowOf`, `hide?: { from: HideFrom }`, P15's union, `style`, and the rest Phase 16A names; no `rowMenu` hook, since `cellMenuContextFor(type, null, …)` builds the panel's menu), dispatching `valueClickIntent` (`valueClick.ts`) for click and the one row menu for right-click. The link menu's `value.hideable` takes `HideFrom` from Task 16A-1. It replaces the three intent maps (`TableView.tsx:134-156`, `CardValue.tsx:74-94`, `PropertyPanel.tsx:286-304`), the two identical right-click chains and the panel's third, the three editing-state types, the three link-seat lines, and the `rename` intent.
2. **The Fourth Router:** `runPropertyAction` → `pendingPick` → `ValuePickPresenter` folds into one app-level seat instance for off-surface menus; `Core/Properties/Cells/valueMenuTarget.ts` and `Core/Interface/Menus/ValuePickPresenter.tsx` are deleted with `App.tsx`'s mount; `pendingPick`'s type-deciding half (`Core/Session/chromeSlice.ts`, `Core/Matrix/MatrixView.tsx`), `CHECKBOX_OPTIONS`, and `valueCommitFor` leave. Matrix's hold follows the seat.
3. **No Fabricated Definition:** the seat hands pickers a `PickTarget` built from P13's resolved column (`{ type, def? }`), so `syntheticContextDef` and its six sites leave (`PropertyPanel.tsx:364,403`, `useViewHost.ts:212`, `propertyMenuActions.ts:72,96`, `FilterFrame.tsx:378`).
4. **The Panel Splits:** `PropertyPanel.tsx` keeps layout, row order, and revealed rows (J-5); value interaction moves to the seat, the label's right-click included. The label and the value build one row menu through `cellMenuContextFor` and `cellMenuModel`, so `propertyMenu.ts`' `page-value` kind and its three `value:*` actions, `rowMenu`'s hand mapping (`PropertyPanel.tsx:319-331`), and `fileValueMenu` (`Core/Properties/Pickers/filePick.ts:115-125`, one caller) leave; a Link row's label gains Rename and Edit Link (J-3), and the panel's File value gains Remove and no Clear (J-10, LC-15). The Cards File pane's `PickTarget` arm and `adoptPathInto` stay (J-7); Cards keeps hiding a chip's remove below 80% zoom (J-6).

**Order:** 3, 1, 2, 4, the seat landing in the table's commit (Tasks 16A-1 and 16A-2) with `seatHost`. The seat's interleavings with Cards' ghost hold, the table's title-action passthrough, and `lastOpened` popover keying are designed in the phase's tasks during planning, from the code, so the executor runs a settled design.

**Behavior Changes:** the panel's Link label and File menus (J-3, J-10, LC-15, LC-47), and the seat's disclosed changes (LC-48, LC-54, LC-59); every other surface keeps today's click and menu behavior.

**Consumers:** `TableView.tsx`, `CardValue.tsx`, `CardsView.tsx`, `PropertyPanel.tsx`, `App.tsx`, `chromeSlice.ts`, `MatrixView.tsx`, `propertyMenuActions.ts`, `PropertyPicker.tsx`, `FilterFrame.tsx`, `useViewHost.ts`.

**Tests:** **Rewritten:** `PropertyPicker.pane.test.tsx:345` and the three surfaces' click and menu tests against the seat. **Written:** one seat test per host pinning click, right-click, and edit for each value kind.

**Drive:** Properties Drive group 14: the same value is clicked, right-clicked, and edited in a Table, a Card, and the panel, and each opens the same picker and menu; the panel's Link label and File menus read as J-3 and J-10 rule; the seat's disclosed changes show; the native menu's property action opens the seat.

**Delta:** about −269 across both halves: P16A about −87 (−520 / +433, the seat's about +268 inside) and P16B about −182 (−309 / +127).

**Depends On:** P13, P15.

**Risks:** Cards' ghost hold, the table's title-action passthrough, and `lastOpened` popover keying interleave with the menu chain; each interleaving is pinned by a seat test before the old copy it replaces is deleted.

`[Compaction checkpoint: c/pre-compaction; on the re-prompt, re-read §Constraints and c/plan-execution before P17 opens]`

##### P17 — The Properties Pane

**GOAL:** Every type's editor renders its rows through one menu index in one collapse-safe container, fixing the Date and Number spacing without moving a row or changing a word. The pane's small duplicates fold, a denominator of zero or less is refused in the editor, an editor whose property disappears returns to the list, the kit header reads "Edit Icon", and "schema" keeps one meaning in file names.

**Units:** Y1 (Approach G; L-1), Y2 (05-06, 05-08, 05-09, 05-10, 05-11), Y3 (L-3's editor half, L-4, O-5); Z2 lands in P2.

**Binding Design:**
1. **Rows as Specifications (Y1):** `NumberEditor.tsx`, `DateTimeEditor.tsx`, `LinkEditor.tsx`, `CheckboxEditor.tsx`, and `FileEditor.tsx` become per-type row builders in one `Core/Properties/Schema/typeRows.tsx` (`rowsFor(def, ctx): MenuRow[]`), rendered by one `MenuIndex` (`UIX/Menus/MenuIndex.tsx:122-176`) in one container whose rhythm sits on `Reveal`'s `[data-reveal]` wrapper (`UIX/Animations/Reveal.tsx:45`), so a revealed row keeps its margin and a collapsed Day row leaves no gap. `number-editor.css.ts` is deleted and `DateTimeEditor.tsx:31`'s inline `gap: 4` leaves; FileEditor's `useSession` read moves to the frame; T7's `LOOKS` serves the three narrowings; the Link rows read P3's `LINK_DISPLAY_OPTIONS`. Date keeps its row icons; every other row passes none (L-2 is I-076).
2. **Small Folds (Y2):** `useGhostOptionAnchor` leaves and both sites call `useGhostAnchor`; the inline-rename store slice becomes `useState`; `OptionOrderList.tsx`'s pane-row helpers move to `Core/Views/Settings/paneRows.tsx`; `OptionEditor` takes `def`; `Schema/OptionRow.tsx` becomes `OptionSlot.tsx`, folding `OptionDraft` and `compactTitle`; internal types unexport; `handleDrop` becomes a `switch`; `Core/Properties/paneDrop.tsx` moves to `UIX/Menus/paneDrop.tsx` with neutral names (readers `PropertyPanel.tsx`, `PropertyFrame.tsx`, `VisibilityFrame.tsx`); `nexusReorderIndex` becomes `fullOrderIndex` in `UIX/Utilities/moveItem.ts`.
3. **Y3:** the denominator row takes only a positive number and otherwise reverts (`NumberEditor.tsx:126-133`), and `formatValue.ts:221`'s guard reduces to a presence check; `UIX/Menus/InlineEditHeader.tsx:47`'s aria-label reads "Edit Icon"; the frame renders the list whenever the edit view names an id `props` lacks, derived at render, so `PropertyFrame.tsx:396-405`'s "Property not found." caption leaves (O-5).

**Order:** 2, 1, 3.

**Behavior Changes:** the Date and Number editors' spacing is fixed (L-1); a non-positive denominator is refused in the editor (L-3); an editor whose property disappears returns to the list (O-5); the header's spoken label reads "Edit Icon" (L-4) — each Nathan's intent.

**Consumers:** the five editors, `PropertyFrame.tsx`, `frames.css.ts`, `MenuIndex.tsx`, `Reveal.tsx`, `GhostOptionChip.tsx`, `PropertyPanel.tsx`, `OptionEditor.tsx`, `OptionOrderList.tsx`, `VisibilityFrame.tsx`, `moveItem.ts`, `InlineEditHeader.tsx`.

**Tests:** **Rewritten:** the editor tests against row builders; `PropertyFrame.test.tsx:224` for "Edit Icon". **Written:** a revealed Number row keeps its margin; a collapsed Day row leaves no gap; a denominator of 0 reverts; deleting the property under an open editor shows the list.

**Drive:** Properties Drive group 15: screenshots of each type's editor with a row revealed and collapsed, compared against the rhythm; create a property, open its editor, delete it from the ⋮ menu, and the list shows.

**Delta:** about −193 (−611 / +418), plus +13 only if O-5's check needs its remedy.

**Depends On:** P3 (`LOOKS`), P7.

**Risks:** O-5's derived list may show the list for one frame after a create, if the tree lacks the new id when `addProperty` replies; the drive's create-then-edit step settles it, and a flash is fixed by opening the editor from the reply's `created.propertyId` after the tree patch.

##### P18 — The Documents Read True

**GOAL:** Every feature document, Issues entry, drive, and script the work made false is rewritten in place, and `PropertiesPM.md` reads as an overview rather than mechanics. The Issues entries citing Properties close or narrow to what's still open, with I-076 and I-077 the only deferrals and no entry filed.

**Units:** every *§What Becomes False* row assigned to P18; the documentation spotcheck.

**Binding Design:** each row of *§What Becomes False › Documents* and *› Issues Entries* marked P18 is rewritten to the landed code, in the Studio documentation reference's voice; `PropertiesPM.md`'s mutation table, Repairs, and Validation sections become overview prose; the Scripts README's channel names are checked against `bridge.ts` and the `mutate` union. I-061 narrows to its two remaining sites, I-062 is rewritten to the landed open, and `SurfacePM.md:42` and `SymbolsPM.md:18` are rewritten (*§What Becomes False*); each drive matrix row has one writer; Task 18-4's checks find each entry by its title over the task's own commit, since the index script renumbers every heading after the three closures. The test sweep converts every hand-rolled Nexus seed still standing in the Properties-system tests to P1's `seedNexus` and shared definitions module, so one seeding path remains, and any test title still carrying a plan-round tag or naming a removed symbol is rewritten; the task lists each file with the `git grep` that found it.

**Order:** feature documents, Issues entries, scripts and drives, then the spotcheck.

**Behavior Changes:** none.

**Tests:** the seed sweep above (test lines move, net negative); no behavior test changes.

**Drive:** every drive in `.claude/scripts/` runs green on P18's head.

**Delta:** 0 production (documents about −40 lines, uncounted).

**Depends On:** P1–P17.

**Review:** one `opus-high` spotcheck against the Studio documentation reference before the commit, in place of the phase's simplification reviewer.

`[Stop: Final Verification per the decision log's Review Procedure › Post-Plan Reviews, its Neutral Gate (BASELINE..HEAD, §Neutral Gate Intention Statements › Final) inside it]`

---

#### Neutral Gate Intention Statements

A neutral gate receives only two commits and the statement below, with no plan, log, principle, or document. Each statement is given verbatim.

##### Mid-Plan (`BASELINE..<P12's head>`)

> This range rebuilds how the Pommora app stores, writes, and recovers property data underneath, with almost nothing a person sees changing. It intended these outcomes:
> - Code that only existed to read file layouts from older builds of the app is gone, and nothing still holding those layouts needed to keep working.
> - The list of property types holds only the types a person can create, plus Context; Title, Created Time, Last Modified, and Location are a separate small table, and a hand-written definition that isn't a real type is set aside when the property list is read.
> - Each type's facts are written once per side of the app, so code asks the type instead of deciding it again.
> - Writing a value to a page or a Space goes through one module that reads the file once. When a value is written, the page's other properties are tidied by one rule: a value is never blanked, a list never loses an item it can't read, and a Select or Status holding several words becomes the one option it shows. Text holding only spaces reads as empty. A write that changes nothing leaves the file alone.
> - Collections refer to property definitions by id, so an incoming definition doesn't force re-reading every page; a damaged property list opens the workspace with properties marked unreadable instead of refusing to open.
> - Undo puts back exactly what the file held for the one property that was edited, and undoing a link value also removes the alias it added.
> - Every property change goes through the app's one change channel with one reply shape, and confirmations count affected items correctly, zero included.
> - Every option has a permanent id; saved views, tiles, and filters refer to options by id, so renaming an option no longer rewrites them. Collapsed groups are remembered per property.
> - Changes that rewrite many files update the list first and the files second, and every property, Context, and Space keeps its own crash-recovery record in one file. A change that can't reach every file finishes what it can and offers one Try Again that finishes everything owed; a name still owed to unfinished work can't be reused until that work finishes.
> - Finding which files hold a property or a tag uses one shared lookup: properties reach pages in Collections and the archive, tags reach any page.
> - A removed property's set-aside values record when they were removed and are cleaned out after the page-history timeframe; re-adding the property refills pages still in the Collection, pages in the trash, and reports any it couldn't refill.
> - The production code is smaller than at the baseline, with fewer ways of doing the same thing, and the tests pin each intended behavior once.
>
> Does the range hold these outcomes, with no data lost on an ordinary action, no expensive work added to a frequent path, and nothing left half-moved? Answer yes or no, with the corrections that would make it yes.

##### Final (`BASELINE..HEAD`)

> This range is a full cleanup of how the Pommora app handles properties — the fields pages and Spaces carry — from how their data is stored and written through to the screens that show and edit them, with almost nothing a person sees changing except where listed. It intended these outcomes:
> - Code that only existed to read file layouts from older builds of the app is gone, and nothing still holding those layouts needed to keep working.
> - The list of property types holds only the types a person can create, plus Context; Title, Created Time, Last Modified, and Location are a separate small table, and a hand-written definition that isn't a real type is set aside when the property list is read.
> - Each type's facts are written once per side of the app, so code asks the type instead of deciding it again.
> - Writing a value to a page or a Space goes through one module that reads the file once. When a value is written, the page's other properties are tidied by one rule: a value is never blanked, a list never loses an item it can't read, and a Select or Status holding several words becomes the one option it shows. Text holding only spaces reads as empty. A write that changes nothing leaves the file alone.
> - Collections refer to property definitions by id, so an incoming definition doesn't force re-reading every page; a damaged property list opens the workspace with properties marked unreadable instead of refusing to open.
> - Undo puts back exactly what the file held for the one property that was edited, and undoing a link value also removes the alias it added.
> - Every property change goes through the app's one change channel with one reply shape, and confirmations count affected items correctly, zero included.
> - Every option has a permanent id; saved views, tiles, and filters refer to options by id, so renaming an option no longer rewrites them. Collapsed groups are remembered per property.
> - Changes that rewrite many files update the list first and the files second, and every property, Context, and Space keeps its own crash-recovery record in one file. A change that can't reach every file finishes what it can and offers one Try Again that finishes everything owed; a name still owed to unfinished work can't be reused until that work finishes.
> - Finding which files hold a property or a tag uses one shared lookup: properties reach pages in Collections and the archive, tags reach any page.
> - A removed property's set-aside values record when they were removed and are cleaned out after the page-history timeframe; re-adding the property refills pages still in the Collection, pages in the trash, and reports any it couldn't refill.
> - A view works out each column's type and definition once and hands it to every filter, sort, group, and cell, instead of looking it up again per cell.
> - Each kind of value's filter rules, sorting, and grouping are stated once in one record; a filter value that can't be read is ignored instead of matching everything, a checkbox's "is not empty" filter works, and empty values sort last for every type that can be empty, a checkbox's unchecked state keeping its place in a sort.
> - Picking a value follows one model for one row or many, and the right-click menu on a value reads the same in the table, cards, and the properties panel.
> - Clicking, right-clicking, and editing a value is one shared piece for the table, cards, and panel.
> - Every type's settings editor uses one layout with consistent spacing, and an editor whose property disappears returns to the property list.
> - The feature documents, issue entries, and test scripts describe the code as it now is.
> - The production code is smaller than at the baseline, the work adds no new issue entries, and nothing in the touched areas reads as left over, temporary, or done one way here and another way elsewhere.
>
> Does the range hold these outcomes on every lens — correctness, simplicity, cohesion with the rest of the codebase, and consequences? Answer yes or no, with corrections, and name the strengths to keep.

---

#### The Perspective Scoreboard

Each count is today's at `3c6afcabb` and the plan's target, with where it's proven. A count marked **Investigation** is the Investigation's or a scout's tally, not re-counted here; every other count was run for this document and its command is in the last column or the numbered list below the table, so a reviewer re-runs it on the head that claims it.

| Perspective | Flagged Practice | Today | After | Proven In · How |
|---|---|---|---|---|
| **Legacy Versus Interop** | Read paths for shapes only earlier builds wrote | 9 (`LEGACY_TYPE_IDS`, `RENAMED`, `normalizeSavedViews`' open pass, `renamedSidecar`, `legacyBucketKey`'s 3 branches, the bare-`sub/` clause, 1 year sniff) | 0 | P1 · command 1 |
| **Type Facts Once** | `PropertyType \| 'title'` unions | 21 in 11 files | 0 | P2 · command 2 |
| **Type Facts Once** | Ad-hoc `.type === '<type>'` checks | 30 | each survivor names a unique piece in its phase's Departures | P3, P14 · the `\.type === '…'` grep in *§Verified at HEAD* |
| **Type Facts Once** | Type-fact tables | about 14 (**Investigation**) | 6 records: engine `PROPERTY_TYPES`, renderer `TYPE_META`, `LOOKS`, `VALUE_KINDS`, `FILEDATA`, and `TYPE_ROWS` (the editor rows, replacing `SETTINGS`) | P2, P3, P14, P17 |
| **Type Facts Once** | "Which types hold connections" statements | 5 (**Investigation**) | 1 (`connections`) | P3 |
| **Type Facts Once** | Checkbox blank-draws rule statements | 3 (P3's count; `Cell.tsx:50-58` is the checkbox cell's type dispatch, not a statement of the rule) | 1 (`blankDraws`) | P3 |
| **Type Facts Once** | Registration `=== 'multiSelect'` checks | 2 (`fileEvents.ts:528`, `optionOps.ts:133`) | 0 (`registersMembers`) | P3 · command 3 |
| **Type Facts Once** | Options-from-labels builders | 8 (**Investigation**) | 1 (`pickerOptions`) | P3 |
| **Type Facts Once** | `syntheticContextDef(` sites | 6 | 0 | P16B · `git grep -n "syntheticContextDef(" -- Core ':!*.test.*'` |
| **Fix the Origin** | UI filters guarding against non-user definitions | 4 | 0 | P2 |
| **Fix the Origin** | Hand-placed slot guards | 7 (**Investigation**) | one owed-name check (`owedName`) and one rename hold (`owesRename`) | P11A · command 4 |
| **Fix the Origin** | Many-file change skeletons | 7 hand-written | 1 (`runNoted`) | P11A, P11B |
| **Fix the Origin** | Never-shrink guard's scope | every governed key | list-shaped values only | P4B |
| **Fix the Origin** | A delete's put-back-and-throw paths | 2 (`unlinkMembers`, the Context put-back) | 0 | P11B |
| **One Write Path** | Value write routes | 12, with 3 world-less side doors (**Investigation**) | every single-file page write (value, tag, banner, put-back) through `rewriteRootAt`, every reconcile through `reconcileGovernedRoot`; the sweeps keep their per-file bodies | P4A · command 5 |
| **One Write Path** | Renderer re-encodes of a write | 2 (`applyValueAtRoot`, `withSeeds`) | 0 | P6 (on F3's Pass) |
| **One Write Path** | Undo routes / put-back landings | 2 / 2 | 1 / 1 | P6 (routes; P6's put-back lands beside the sweep's own private `keysPutBack`), P11B (landings, `keysPutBack` leaving with `undoSweep`) |
| **One Write Path** | `ValueWriter` hand-built assemblies | 3 | 0, assembled by two (`useValueWriter` for a mounted surface, `oneShotWriter` for the native menu) | P15 |
| **One Way** | Try Again forms | 4 (**Investigation**, R) | 1 (`finishOwed`) | P11A |
| **One Way** | Crash-recovery files / record kinds | 2 / 5 | 1 / 1 entry type | P11A · `git grep -n "JOURNAL_FILENAME\|journalSlot" -- Core` answers 0 |
| **One Way** | Replay points at open | 2 (`handlers.ts:86,111`) | 1 | P9, P11A |
| **One Way** | Reply shapes across schema ops | 7 (**Investigation**) | 1 (`MutateOutcome`) | P7, P11A |
| **One Way** | The holder count's argument sniff | 1 (`handlers.ts:199-208`) | 0 (one `countedChange` decode and `switch`); the four holder functions stay, each planning its own sweep, and `Holders` is only the finder's answer | P7, P10 |
| **One Way** | Property, schema, and registry channels | 20 | 1 read channel (`property:holders`) | P7 · `bridge.ts`'s `'(property\|schema\|registry):` entries |
| **One Way** | Space candidate paths for key sweeps | 5 (**Investigation**) | 1 (`spaceFiles`, through `findHolders`); `sweepRootsById`'s by-id paths, the restore's artifact listings, and the asset migration's `spaceSidecars` find by other means | P10 |
| **One Way** | Page candidate rules for property and Context sweeps | 2 (`governedReach`, `sweepMembers`) | 1, with its reach stated | P10 |
| **One Way** | Shown-text projections | 2 (`textValue`, `sortText`) | 1 (`shownText`) | P14 |
| **One Way** | Value click-and-menu copies | 3 plus the native router | 1 seat | P16A (table, Cards), P16B (panel, native router) |
| **One Way** | Bucket-key builders | 2 | 1 (`bandKey`) | P8 |
| **One Way** | Type-editor containers and rhythms | five containers in three styles, three rhythms | one container (`configEditor`) and one 8px rhythm | P17 |
| **Hot Paths Stay Cold** | Per-cell schema scans | 2 (`resolveFieldValue`'s `schema.find`, `Cell.tsx:45`) | 0 | P13 |
| **Hot Paths Stay Cold** | `declaredType(` calls | 23 lines in 14 files (21 readers, the definition, and `columnType`'s own call) | 0 | P13 · `git grep -n "declaredType(" -- Core ':!*.test.*'` |
| **Hot Paths Stay Cold** | Optional `contextIds` defaults | 12 (the grep's other 7 lines are `contextIdsOf(tree)` derivations, which stay) | 0 | P13 · Task 13-4's `contextIds` grep |
| **Hot Paths Stay Cold** | `TextCell` store subscriptions | 3 per cell | 1 | P13 |
| **Hot Paths Stay Cold** | Whole-Nexus walks on a synced definition / open-time per-page registration | 1 / 1 | 0 / 0 | P5 |
| **Hot Paths Stay Cold** | Registry re-read and re-validation per value write | 1 | 0 (`cachedParse`) | P4A |
| **Hot Paths Stay Cold** | Filter operand parses | per row | once per pass | P14 |
| **One Vocabulary** | Names for the stash | 2 (cache, stash) | 1 | P12 · `git grep -n -i "property_cache\|cachedValues\|patchCacheBlock" -- Core` answers 0 |
| **One Vocabulary** | Meanings of "Remove" in the Properties pane | 2 (option delete, unassign) | 1 | P7 |
| **One Vocabulary** | Meanings of "schema" in file names | 3 (**Investigation**) | 1 | P2, P11A · command 6 |
| **One Vocabulary** | Files named "value" meaning different things | 5 (**Investigation**) | each named for its content | P4A |
| **Clearer Boundaries** | Shared modules living in `Core/Properties` | 8 (`governedSweep`, `governedWrite`, `journalSlot`, `keyHolders`, `rowOrder`, `pageRow`, link vocabulary, pane targets) plus `paneDrop` | 0 | P1, P3, P4A, P10, P11A, P17 |
| **Clearer Boundaries** | Homes for count copy | 2 (`properties.ts`, `confirmations.ts`) | 1 (`entities.ts`) | P7 |
| **Sync-Ready Shapes** | Options without ids / unread `group_id` writes | every option / 8 NexusOS options | 0 / 0 | P8 |
| **Sync-Ready Shapes** | Sync rules added | 0 | 0 | every phase · `git diff BASELINE..HEAD -- Core/Sync` is empty |
| **Describers Get Swept** | Plan-round tags in test titles | about 31 (**Investigation**) | 0 | P1 |
| **Describers Get Swept** | Finder casing pins | 6 (`keyHolders.test.ts:155,219`, `renameSweep.test.ts:82`, `removeProperty.test.ts:117`, `optionOps.test.ts:530`, `deleteProperty.test.ts:278`) | 1 (the finder's); the rewrite and reconcile casing pins stay, each pinning its own rule | P10 |
| **Describers Get Swept** | One-slot non-displacement pins | 4 files (**Investigation**) | 0 | P11A |
| **Describers Get Swept** | False `PropertiesPM.md` claims | about 12 (**Investigation**) | 0 | P18 |
| **Behavior Is a Decision** | Behaviors met and not put to Nathan | — | 0; every one is in *§Last Calls* or *§Nathan's Calls* | this document |
| **Directive (10-22-2026)** | Net production delta | — | about −1,236 | *§The Ledger* |
| **Directive (10-22-2026)** | Issues entries filed by the work | — | 0; I-076's and I-077's entries the only deferrals | P18 · Task 18-4's title diff over its own commit lists only I-036's, I-039's, and I-063's titles and I-032's and I-061's old ones on its `<` side, and I-032's and I-061's new ones on its `>` side; *§Completion Criteria › No New Issues* runs the same comparison over `BASELINE..HEAD` |

Commands the table cites by number, each written outside a table cell so no pipe is escaped:

1. `git grep -nw -e LEGACY_TYPE_IDS -e legacyBucketKey -e normalizeSavedViews -e renamedSidecar -- Core` answers nothing (19 lines at HEAD), and `git grep -n -F '/^\d{4}/' -- Core/Views/views.ts Core/Views/Settings/GroupFrame.tsx` answers nothing (`GroupFrame.tsx:511` at HEAD).
2. `git grep -n -F "PropertyType | 'title'" -- Core UIX ':!*.test.*'` answers nothing.
3. `git grep -n "\.type === 'multiSelect'" -- Core ':!*.test.*'` answers nothing.
4. `git grep -n "rename?.length" -- Core ':!*.test.*'` answers only `Core/Nexus/owed.ts`.
5. `git grep -n "setGovernedRootKey\|landPageValue\|landSpaceValue\|propertyWrites" -- Core` answers nothing.
6. `git ls-files 'Core/Properties/*[Ss]chema*'` lists only `Core/Properties/Schema/`'s files.

---

#### The Ledger

Production lines; tests apart. Each figure is the phase file's own *Line Total*, estimated from its AFTER blocks under the one counting rule (source with imports and blank lines as Biome wraps them; comments, tests, test support, documents, and drives out; moved lines on both sides), and each executor replaces it with the measured figure at the phase's Review Checkpoint.

| Phase | Removed | Added | Net | Running Total | Tests |
|---|---|---|---|---|---|
| **P1** Removal First | about −296 | about +155 | **−141** | −141 | about −520 |
| **P2** What Counts as a Property | about −287 | about +235 | **−52** | −193 | about −9 |
| **P3** Type Records and Looks | about −264 | about +235 | **−29** | −222 | about +5 |
| **P4A** The Value Write's One Home | about −419 | about +380 | **−39** | −261 | about −77 |
| **P4B** The Tidy Rule and Repair On Open | about −16 | about +23 | **+7** | −254 | about +53 |
| **P5** One Home per Definition | about −125 | about +70 | **−55** | −309 | about +110 |
| **P6** Undo From the File | about −193 | about +193 | **0** | −309 | about +45 |
| **P7** One Door | about −382 | about +227 | **−155** | −464 | about +170 |
| **P8** Option Identity | about −213 | about +140 | **−73** | −537 | about −220 |
| **P9** List First, One Replay | about −54 | about +43 | **−11** | −548 | about +120 |
| **P10** One Finder | about −255 | about +210 | **−45** | −593 | about +55 |
| **P11A** The Notes and the Renames | about −405 | about +395 | **−10** | −603 | about −450 |
| **P11B** Deletes and Remove | about −130 | about +128 | **−2** | −605 | about +100 |
| **P12** The Stash and Trash Records | about −106 | about +199 | **+93** | −512 | about +190 |
| **P13** Columns Carry Their Answer | about −291 | about +218 | **−73** | −585 | about −40 |
| **P14** The Per-Kind View Record | about −550 | about +438 | **−112** | −697 | about +81 |
| **P15** Pick Model and One Writer | about −205 | about +128 | **−77** | −774 | about +39 |
| **P16A** The Seat, the Table, and Cards | about −520 | about +433 | **−87** | −861 | about +190 |
| **P16B** The Native Router, the Panel, and No Fabricated Definition | about −309 | about +127 | **−182** | −1,043 | about +10 |
| **P17** The Properties Pane | about −611 | about +418 | **−193** | −1,236 | about −75 |
| **P18** The Documents Read True | 0 | 0 | **0** | −1,236 | net negative (the seed sweep, measured) |

**Total:** about **−1,236** production lines (about −5,631 / +4,395), and about **−220** test lines before P18's seed sweep. Every intermediate head is net-negative from P1 on; the Mid-Plan Neutral Gate's range ends at P12's head, about −512. On F3's Fail, P6 lands about +68 and P13's Task 13-8 about 0, so the total is about −1,167.

**Confidence:** the figures are read from the written AFTER blocks, so each moves by Biome's wrapping and the landed shapes of earlier phases; the executors' measured numbers replace them. The total lands about 250 lines short of the planning estimate (−1,490), because the moves pay import wrapping (P3, P4A), the type records and the seat carry the code their surfaces held (P14, P16A), and the crash-recovery rebuild's arms cost what R priced at none (P11A, P11B); P7, P16B, and P17 land further negative than estimated. The tests total lands about −220 rather than −1,250 to −1,600: the large deletions (P1's legacy pins, P8's re-keying tests, P11A's journal suites) hold, while P5, P7, P9, P12, and P16A each write the pins their new behavior needs, one behavior per pin. No combination of the estimates' least favorable ends flips the cumulative sign.

**Net-Positive Rationale:** two phases land above zero, and P6 at zero. **P4B (+7):** every added line is ruled behavior in its minimal form: the list test and the live arm's foreign-word rule narrow an over-generalized guard rather than adding a Select or Status branch, and `writtenRoot`'s null rule replaces the Space op's special case with one rule for every writer. **P12 (+93):** C-3's ageing and C-2's stale drop, Trash parking, and restore order are Nathan's rulings delivered on existing mechanisms (`editStashes`, `refillValues` through `refillOf`, `trashedHolders`, `readFileHistoryConfig`, the two triggers) with no new pass, module, Sync rule, or timer; the refill-skip report fixes a loss the ageing would otherwise make silent, through the one function every re-add passes; the partial mark delivers N-1; each fold inside removes what it replaces. **P6 (0):** an undo that puts back what the file held is a landing no existing code performs, and F3's picked overlay removes as much as it adds.
---

#### What Becomes False

Each describer the work makes false, with the phase that rewrites it. A phase sweeps the tests its own code makes false (listed in its *Tests*); the rows below are the rest.

##### Code Comments

| Comment | Becomes False With | Phase |
|---|---|---|
| `properties.ts:78` "so they read forever" | L1 | P1 |
| `propertyValue.ts:29` "Kept while the Status tag goes" | stale today | P1 |
| `contextJournal.ts:1` on the skip list | N4 | P1 |
| `columnLabel.ts:10`, `setProperty.ts:14`, `paneDrop.tsx:16-17`, `property-panel.css.ts:8` | stale today (09-11) | P1 |
| `properties.ts:286` and `properties.test.ts:267`'s "type change" | stale today (01-10) | P2 |
| `contextResolve.ts:119` "never shrinks or blanks" | the tidy type fact | P4B |
| `mutate.ts:81` "never shrinks or drops a key it can't resolve" | the tidy type fact | P4B |
| `mutateRequest.ts:91` `held` "written back as it was" | E-1 | P6 |
| `registryProperty.ts:170` race rationale | S1 | P7 |
| `propertiesRegistry.ts:125` lock claim | S1 | P7 |
| `optionMenu.ts:1` "Remove deletes the option" | O-1 | P7 |
| `deleteProperty.ts:169` "Spread, never Object.assign" | `patchStashBlock`'s fold | P12 |
| `replaySchemaCascade.ts:52` registry-last rationale | B-2 | P11A |
| `contextCascade.ts:32` the `'merge'` rule's reason | B-2 | P9 |
| `keyHolders.ts:13`, `spaceSidecar.ts:49` disk truth | G-1 | P10 |
| `mutate.ts:68` four-way Try Again; `journalSlot.ts:1,18` | B-1 | P11A |
| `PropertyPanel.tsx:151` the `KNOB` comment | J-5 | P15 |
| `number-editor.css.ts:3` | the file leaves | P17 |
| `UIX/Menus/InlineEditHeader.tsx:47` "Edit icon" | L-4 | P17 |

##### Tests and Scripts

| Describer | Becomes False With | Phase |
|---|---|---|
| `Core/Sync/Arrival/mergePolicy.test.ts:120-136` (`name` field, respelling, fragment) | stays as written under *Sync Stays*; recorded as a rebuild input | — |
| `columnMenu.test.ts:171-175` "Format" for Number | I-4 | P3 |
| `repairSweep.test.ts:151-157` | P-1's type fact | P4B |
| `propertyValue.test.ts:223-225` | whitespace at decode's entry | P4B |
| `restoreValue.test.ts`, `assignValue.test.ts:72-115` | E-1 | P6 |
| `confirmations.test.ts:434-435` | kept; the zero wording is pinned beside it | P7 |
| `PropertyFrame.test.tsx:202,244,255,438,486` | 05-13 | P7 |
| `.claude/scripts/Option Picker Drive/live-drive.mjs:170-173` | `5e3aee180`'s threshold | P7 |
| `.claude/scripts/Metadata Drive/live-drive.mjs:789,932,935,960,979` and `MATRIX.md:110` | O-1 | P7 (the drive), P18 (the matrix) |
| `.claude/scripts/Metadata Drive/live-drive.mjs:179-180,876` | D-3 | P8 |
| `.claude/scripts/make-benchmark-nexus.mjs:169` | D-1, D-3 | P8 |
| `OptionEditor.test.tsx:267-448`, `optionOps.test.ts:245-276`, `configReach.test.ts:157-252` | D-1 | P8 |
| `keyHolders.test.ts:80-216` | the finder's move | P10 |
| `journalWiring.test.ts:274-319`, `optionOps.test.ts:707`, the one-slot pins | B-1, B-4 | P11A |
| `cascadeRace.test.ts:58` "F1 —" and the other plan-round tags | 09-06 | P1 |
| `.claude/scripts/drive-harness.mjs:282`; `Text Property Drive/live-drive.mjs:279,287,292,365` | J-4 | P15 |
| `resolveView.test.ts:513`, `GroupFrame.test.tsx:260`, `views.test.ts:569-578`, `configReach.test.ts:72,83` (bare hidden-group keys) | L3 | P1 |
| `contextCascade.test.ts`' 24 skip-list lines, `contextJournal.test.ts:14`, `Core/Nexus/handlers.test.ts:436` | N4 | P1 |
| `Core/Nexus/handlers.test.ts:143-154` (the open waits on a damaged `properties.json`), `readNexus.test.ts:470-483` | O-6 | P5 |
| The Metadata Drive's label-addressed option ops, counts, values, operands, and five pins; the Option Picker Drive's adds and seeded values; `Alias Drive/live-drive.mjs:80`'s id-less adds; `Archive Drive/live-drive.mjs:391`'s rename by label | D-1 | P8 |
| `Core/Testing/configSurfaces.ts:36` (`viewOn`'s bare collapsed key), `propertyJournal.test.ts`' `labels` cases | D-1, D-2 | P8 |
| `restoreScrub.test.ts:165` (the scrub's refusal), `contextCascade.test.ts:93` ("still reaches every sidecar"), `spaceSidecar.test.ts:28`, the 19 `seedSpaceSidecar` calls | G-1, G-3 | P10 |
| The Metadata Drive's journal slots, `retry` replays, and group 6's owed-option refusals; `drive-harness.mjs:307`'s `COPY.anOptionChangeWaitingForTryAgain` | B-1, LC-45 | P11A |
| `removeProperty.test.ts:351-358` ("a page deleted while cached is skipped — its entry stays cached") | C-2 | P12 |
| `.claude/scripts/Metadata Drive/live-drive.mjs:21-22,188,213-218` (`property_cache`) | LC-3 | P12 |
| `.claude/scripts/Metadata Drive/MATRIX.md`'s channel, journal, cache, and label rows; `Archive Drive/MATRIX.md:42`'s `replaySchemaCascade.test.ts:523` cite | P7, P8, P11A, P12 | P18 (Task 18-6 alone) |
| `.claude/scripts/README.md`'s channel names | P7's fold | P18 |
| `.claude/scripts/Archive Drive/MATRIX.md:30` (group 3's `Drive Stage` seed through `schema:add`) | P7's fold | P18 |

##### Documents

| Document | Claim | Phase |
|---|---|---|
| `.claude/Features/PropertiesPM.md:8` | earlier spellings read and rewritten; "twelve types"; camelCase naming claim | P18 |
| `PropertiesPM.md:15` vs `:68` | "Date" vs "Date & Time" | P18 |
| `PropertiesPM.md:16`, `:74`, `:138` | the several-word Select rule; the reconcile "removes nothing" | P18 |
| `PropertiesPM.md:20-22, 104, 121` | Context and stamps "never a schema definition"; "auto-managed" stamps → Filedata | P18 |
| `PropertiesPM.md:27, 128-134` | "restore cache", "value caches" → the stash, its age, its timeframe | P18 |
| `PropertiesPM.md:53` | Status options reference their group by id | P18 |
| `PropertiesPM.md:66` | Number's look named "Format" | P18 |
| `PropertiesPM.md:76` | compact chip icon (M-1); "Style toggle"; the ghost chip; option Remove → Delete | P18 |
| `PropertiesPM.md:117`, `:119` | one Value Picker control; the panel introduced twice; the panel row menu | P18 |
| `PropertiesPM.md:121` | `**The Properties Menu.**` label form | P18 |
| `PropertiesPM.md:123`, `:125-136` | one lock; journal claims; the mutation table becomes overview prose; Remove "re-runs cleanly"; `:129`'s ID-less member sentence | P18 |
| `PropertiesPM.md:138, 140` | Repairs and Validation as implementation notes | P18 |
| `PropertiesPM.md:149`, `:150` | range values shipped; per-view link styling shipped | P18 |
| `.claude/Features/ConfigurationPM.md:115` | Clear "asks regardless"; option Remove → Delete | P18 |
| `ConfigurationPM.md:143` | Repair Properties On Open defaults Off → On | P18 |
| `.claude/Features/ContextsPM.md:26` | registry committed last; a failed commit reverses the cascade | P18 |
| `.claude/Features/CorePM.md:74`, `:100`; `NexusSyncPM.md:9` | "the two cascade journals"; "multi-file schema operations queue on one lock"; delete records | P18 |
| `.claude/Features/NexusSyncPM.md:63` | the respelling example → a rename racing another field's edit | P18 |
| `.claude/Features/NexusRecordPM.md:12` | `partial` read by nothing; system-Trash mode "records nothing" for a property delete | P18 |
| `.claude/Features/CollectionsPM.md:14` | `property_cache` → `property_stash` with its stamp and timeframe | P18 |
| `.claude/Features/ViewTypesPM.md:91` | a link menu's "Edit Link … and Rename" order | P18 |
| `.claude/Features/CorePM.md:111` | the SOURCE line names `schema.ts` (Z2) | P18 |
| `CorePM.md:92`, `:100`, `:137` | the channel sentence, Context and Space delete policy, and create clause; "every Space sidecar"; the damaged-`properties.json` open (O-6) | P18 |
| `ContextsPM.md:27-28`; `NexusRecordPM.md:12`, `:14` | cascades and deletes that refuse and put back (B-3); the cache, "Key or Value Format", and the owed-name clause | P18 |
| `ViewTypesPM.md:24`, `:41`, `:55`; `PommoraUIX.md:347`; `InteractionPM.md:42` | an unreadable operand that abstains (K-1); Select and Status compared by label (D-1); empty values placed nowhere in a sort (K-2); the chip shape's home (P3); option drafts keyed through `useRenameKeys` (P8) | P18 |
| `CorePM.md`'s *§Mutations*, `mutateRequest.ts`'s comment | I-032's Properties slice folded | P18 |
| `.claude/Features/SurfacePM.md:42` | the saved-view normalization at open (`migrateConfig.ts`) naming the tile hosts' folders by hand → `ensureConfigLayout` creating the Homepage folder (L1) | P18 |
| `.claude/Features/SymbolsPM.md:18` | the property types' glyphs decided in `PropertyTypes.tsx` → `typeDisplay.ts` (P3) | P18 |

##### Issues Entries

| Entry | Outcome | Phase |
|---|---|---|
| **I-006** | Narrowed: "Option lists key on `value`" becomes `key`; option ids have landed, so per-option merging is a Sync rebuild input; it names `property_stash` among the lists merging whole. Stays open under *Sync Stays*. | P18 |
| **I-032** | Narrowed: the Properties slice (19 writing channels) folded into `mutate`; the count and list name what's left. | P18 |
| **I-033** | Unchanged (the Trash batch's walk). | — |
| **I-035** | Narrowed in place: its event-order sentence follows the list-first Context rename; the defect stays. | P18 |
| **I-036** | Closed: one notes file, one replay at one point, one finder over the tree. | P11A (text in P18) |
| **I-039** | Closed: the put-back it describes leaves. | P11B (text in P18) |
| **I-042** | Narrowed to part (1) and part (2)'s non-Properties moves; `governedSweep` lands in `Core/Nexus`, `governedWrite` and `journalSlot` dissolve, `keyHolders` lands in `Core/Index`. | P18 |
| **I-061** | Narrowed in place: "Three sites" become two, since `normalizeSavedViews` leaves with L1; its Solution and `[^61]` drop the migration's site. | P18 |
| **I-062** | Rewritten true: a damaged `properties.json` opens the Nexus with no definitions and names the list unreadable (O-6), where the open failed there first. | P18 |
| **I-063** | Closed: undo puts back the file's own node. | P6 (text in P18) |
| **I-064** | Narrowed in place: "Key Format" becomes "Label Format" and its footnote lines move; stays deferred. | P18 |
| **I-068**, **I-072** | Unchanged (outside Properties). | — |
| **I-076** | Narrowed: its column-menu wording note follows I-4, and its footnote's five editor cites (`IssuesPM.md:1387`) re-point to `typeRows.tsx`' row builders. Stays deferred. | P18 |
| **I-077** | Its footnote lines and `property_cache` follow P12. Stays deferred. | P18 |

---

#### Last Calls

Each is a reading taken in Nathan's place, where the decisions don't settle it or where the plan departs from what the Walkthrough told him. Each gives the reading, the recommendation, and why, in plain English. The numbers are stable ids the phases cite; the groups order them for reading, and the reconciliation report carries them in this order.

##### Departures From the Walkthrough

- **LC-1 · The Stash Keeps Its Inner Layer:** the Walkthrough said an empty wrapper inside the stash flattens. Each removed property's stash now also records the day it was removed, and that date needs a place beside the values, so the wrapper stays and holds both. **Recommended:** keep it; flattening would force the date into a spot that looks like a page's id.
- **LC-2 · Deleting a Property Everywhere Leaves Collections in the Trash Alone:** the Walkthrough said a global delete reaches Collections sitting in the Trash. Reaching into a trashed Collection's settings without also touching its pages would make restoring both lose the link between them. Every delete already leaves the Trash alone, pages included, and restoring in either order works when it's left alone: the Collection comes back still listing the property, and the property's restore switches it back on. **Recommended:** leave the Trash alone.
- **LC-3 · "Cache" Becomes "Stash" Everywhere, on Disk Too:** everyone calls it the stash, while the code and the settings file say "cache" for something that can't be rebuilt. No Nexus holds a stash yet, so renaming the file key to `property_stash` costs nothing now, and renaming the code alone would give one thing two names. **Recommended:** rename both.
- **LC-6 · One Try Again Finishes Everything Owed:** the Walkthrough said Try Again finishes that item's unfinished work and just names the item. When a new name is refused because something else still owes it, Pommora knows the name but not which item owes it, so Try Again finishes every owed item at once and reports one combined count. Unfinished work is rare, so finishing all of it is harmless. **Recommended:** one Try Again for everything.
- **LC-28 · The Notes File Stays Behind Empty:** the Walkthrough said Pommora writes its notes file only while work is owed. After the first big change, the hidden `.nexus/.owed.json` stays on disk holding nothing (`{}`) rather than being deleted, because deleting it safely would rebuild the very file-locking piece this work removes. It's hidden, never synced, and harmless. **Recommended:** accept it.
- **LC-29 · The Notes File's Storage Uses Pommora's Existing File Writer:** the Walkthrough said the notes file's storage moves beside Pommora's file handling. Instead of moving the old one-note slot there, the slot is deleted and the notes file is written by the same piece every other Pommora settings file uses, so there's nothing left to move. **Recommended:** take it.
- **LC-31 · Sync's Two Misleading Tests Stay as They Are:** the Walkthrough said the test pinning the broken property scrap is corrected and the merge-depth test is rewritten. Both live in Sync's folder, which this work doesn't touch while Sync awaits its rebuild, and both still pass. Only the Sync feature document's example is rewritten. **Recommended:** leave the tests for the Sync rebuild, where they're listed.
- **LC-58 · Clearing an Option Warns Without Try Again:** the Walkthrough said a Clear that misses pages offers Try Again. Try Again finishes what the notes file holds, and a Clear writes no note, so its missed pages warn as every Clear's miss does today, with no Try Again. A note would let Try Again run the Clear again later, and by then you may have picked that option again on a page the Clear never reached, so the late clear would wipe the new pick. **Recommended:** keep it; running Clear again reaches the pages it missed, and nothing it leaves behind can undo a later pick.
- **LC-34 · Every Property Change Goes Through the App's One Change Channel:** the Walkthrough said five ways to save a property setting become one; the plan goes further and moves every property change onto the same channel the rest of Pommora's changes already use, so property changes stop having a door of their own. Nothing you see changes. **Recommended:** take it.

##### Crash Recovery

- **LC-7 · A Name Still Owed to an Unfinished Rename Is Refused (Morning Question 1):** today a new property named after an unfinished rename's old name quietly becomes "Priority (2)", and renaming a property onto such a name isn't checked at all. Both are refused with the general "An earlier change hasn't reached every file yet." and Try Again, exactly like B-4's deleted-name case, so a new property never inherits pages a rename hasn't reached. This covers creating, renaming, and changing the Label Format. **Recommended:** refuse.
- **LC-8 · The Same Rule for Contexts and Spaces:** a Context or Space created or renamed under a title another item still owes takes over that item's leftover tags today. It's refused the same way. **Recommended:** refuse.
- **LC-9 · A Trash Restore Under Someone Else's Owed Name Is Refused Too:** restoring goes through the same create step, so it's refused with the general message, and Try Again finishes the other item's work first, after which the restore can run. **Recommended:** one rule, no special case.
- **LC-10 · A Delete That Finishes Later Still Saves Every Value to the Trash:** today a property delete that couldn't reach some pages loses those pages' values from its Trash entry when it finishes them later. Every delete now records the values up front from Pommora's index, so a restore brings them all back. **Recommended:** capture up front.
- **LC-12 · A Change Whose Note Can't Be Written Doesn't Start:** today some big changes run without a note when the note can't be written, and others refuse. Every one now refuses with nothing changed. **Recommended:** refuse.
- **LC-18 · Re-Adding a Removed Property Cancels What Its Remove Still Owed There:** if a Remove missed pages and you add the property back to that Collection before Try Again runs, the leftover work is dropped for that Collection, since the property governs those pages again. **Recommended:** take it.
- **LC-19 · A Remove Reports Pages It Can't Clean Up:** today a Remove quietly leaves the value on a page with no ID, a page sharing another page's ID, or a page whose properties can't be rewritten safely, while the Collection no longer uses the property. These now count as unfinished, with Try Again; a page without an ID usually gets one at its next read, so Try Again usually succeeds. The feature document's sentence calling this intended is rewritten. **Recommended:** report and offer Try Again.
- **LC-45 · Clearing an Option Is No Longer Refused While Another Option Change Is Owed:** today Clear waits on its own property's unfinished option change. It now runs, and any old names still owed to that option are switched to "remove" so the unfinished rename can't bring the cleared value back. **Recommended:** take it. A Clear that misses a page warns, as every Clear's miss already does, and offers no Try Again (LC-58).
- **LC-63 · A Change Under an Owed Rename Reads as Done (P11A, P11B):** while a property's rename is still owed because some pages couldn't be reached, an option rename, an option delete, or a Remove made on it updates every page already under the new name and reports success; the pages still under the old name keep the old value until the rename's own Try Again or the next open finishes the rename and then this change, in that order. The same holds for a Space renamed or deleted while its Context's rename is owed, which departs from B-3's wording that a delete missing pages offers Try Again for the rest. Those pages are the ones the rename's own notice already counted and offered Try Again for, and counting which of them hold this change's word would mean reading files the rename couldn't read; a count of one would misstate the number. **Recommended:** keep it; the alternative is a count of the waiting pages per kind, about 15 more lines.
- **LC-64 · A Stranded Context Rename Offers Try Again (P11A):** if a Context rename's folder can't move and putting the old name back fails too, the new name is already in the Context list, so the rename now reports "Couldn’t update 1 Item." with Try Again, which moves the folder and updates the pages. Before, it answered with the folder's error and left the work for the next open. **Recommended:** keep it; the one Try Again finishes it now rather than at the next open.
- **LC-49 · A Retried Context Rename That Misses Files Again Can Leave Nothing to Finish (P1 to P11A):** between the first phase and the crash-recovery rebuild, if a Context or Space rename's Try Again misses files a second time and no earlier record of that rename is still on file (a later rename of the same item replaced it, or the open already finished it), nothing records the leftover files, so they keep the old name until it's renamed again. Every other retry behaves as today, and the rebuild gives each item its own note. **Recommended:** accept it for those phases; keeping the unread field alive only to cover it would be code the rebuild deletes.
- **LC-50 · Re-Choosing the Nexus Already Open Doesn't Retry an Owed Context Rename (P9):** today, picking the Nexus that's already open re-runs an unfinished Context rename; afterward that happens only on a real open, as unfinished property work already does, and the rename's own notice keeps its Try Again. **Recommended:** take it, one rule for both.

##### Values and Tidy-Ups

- **LC-20 · Outside-Written Several-Word Selects Are Tidied at the Next Open:** with the tidy rule and Repair Properties On Open both on, a Select or Status that Obsidian or another app wrote with several words becomes the one option Pommora shows the next time the Nexus opens, and that change syncs. NexusOS has none today, and nothing in NexusOS relies on a several-word Status. **Recommended:** take it, since it's what both of your rulings say together.
- **LC-21 · "Any Edit" Means Any Value Edit:** a several-word Select tidies when any property, tag, or Space link on its page is changed, and on Repair On Open — the same moments every other tidy-up happens. Editing the page's text, renaming its title, or changing its banner doesn't tidy. **Recommended:** take it.
- **LC-22 · A Multi-Select Holding a Word No Option Names Also Collapses Duplicates:** today `[a, zeta, a]` stays exactly as written when another property is edited, while picking that Multi-Select writes `[a, zeta]`. It now becomes `[a, zeta]` either way, and its options move ahead of the words no option names, as a pick writes them: `[zeta, alpha]` with only `alpha` an option becomes `[alpha, zeta]`. `~/NexusOS` (626 pages; its Multi-Selects `tags`, `Brand`, and `Color`) holds no such value, and Phase 4B's scan stops for your call if one appears. **Recommended:** one rule.
- **LC-23 · A File Value Listed Twice Collapses:** every other list type drops a repeated item on the next edit; File didn't. **Recommended:** match the others.
- **LC-24 · Spaces-Only Reads as Empty for Dates, Links, and Files Too:** you ruled spaces-only text empty; a date, link, or file written as only spaces read as filled for the same reason. It's stated once for every type. **Recommended:** take it.
- **LC-25 · A Space Edit That Changes Nothing Leaves the File Alone:** today re-picking a Space's value it already holds rewrites its settings file and gives it a new modified time. It now writes nothing, as pages already do. **Recommended:** take it.
- **LC-61 · A Hand-Copied Option Keeps Its Place Under a Derived Id (P8):** if you or an agent copy an option in `properties.json` by hand and give the copy a new name but leave its id, both options stay: the copy takes the id its own spelling derives, the next option change stores it, and pages holding its word read it as theirs. With ids permanent, a plain "each id once" rule would drop the copy on every read, its pages would read as holding an unknown word, and the next option edit would erase it from the list, where today it stays. A copy whose derived id another option already holds still leaves, as a copy repeating a name already does. **Recommended:** take it; it keeps what today keeps.
- **LC-62 · A Status Glyph Follows Its Option's Id (P8):** a Status option's chip finds its group's icon by the option's id instead of its name, so while you type a new name in the option editor the chip keeps its group's icon, where today it falls back to the default icon until the rename is saved. An accident fixed. **Recommended:** take it.
- **LC-30 · A Mis-Capitalized Option Word Beside a Valid One Drops:** `Stage: [done, Active]`, where the option is spelled "Done", tidies to `[Active]`, since "done" names no option; alone, `[done]` stays as written. This follows your rule that words no option names are ignored. **Recommended:** no change; noted so it isn't a surprise.
- **LC-51 · A Pick of an Option Deleted Meanwhile Writes Nothing (P8):** if a picker is open while another device deletes one of its options, or a new page inherits an option a sync just removed, picking it writes nothing for that option instead of writing the deleted word, which a Multi-Select would then re-adopt as a brand-new option. **Recommended:** take it; a deleted option shouldn't come back from a stale menu.

##### The Stash

- **LC-4 · A Restored Collection Can Keep a Deleted Property's Id:** if a property is deleted while its Collection sits in the Trash, the restored Collection still lists the property's id. It does nothing on its own, and it switches the property back on if the property is restored too. **Recommended:** leave it.
- **LC-5 · A Re-Add That Couldn't Refill Some Pages Offers Try Again:** today, if re-adding a property can't write some pages, their values wait in the stash forever and you're never told. With the stash now cleaned out after the History Timeframe, they'd be lost unseen, so the re-add reports them with Try Again, which refills from the stash. Restoring a deleted property from the Trash re-adds it the same way, so a restore that couldn't refill a page reports it too. **Recommended:** report it.
- **LC-26 · How the Stash's Clock Runs:** a property restored from the Trash keeps its stash's original removal date, so the Trash doesn't reset the clock (page history ages trashed pages the same way); a second Remove of another property's values into the same block restarts that block's clock; archived pages' stash values follow History Timeframe rather than Archive History Timeframe, as C-3 says. **Recommended:** take all three.
- **LC-27 · The History Timeframe's Hint Now Undersells It:** the setting's hint says it keeps device-local file history, while it now also ages the stash, which syncs. The settings panes' wording waits for your I-076 pass and the stash's own timeframe is I-077, so the hint stays. **Recommended:** fix it when I-077 lands.
- **LC-36 · A Page in the Trash Gets Its Stashed Value (Morning Question 3, Stands):** re-adding a property writes a trashed page's stashed value into its Trash copy, so restoring the page brings it back. Only a page trashed from this Collection qualifies.
- **LC-37 · The Partial Mark (Morning Question 4):** a partly recorded Trash entry shows a warning mark with the spoken label "Recorded Partly", and restoring it adds "“Title” was recorded partly, so some of what it held may not come back." **Recommended:** take it.
- **LC-46 · An Archive Restore Already Reports Once:** restoring from the Archive was read as showing its "some values didn't come back" lines twice. It doesn't: the Restored notice replaces the earlier ones in the same moment, so the lines show once, inside it. What that replacement loses is the earlier notice's Try Again, so the Restored notice now carries it whenever work is still owed. **Recommended:** take it; nothing else about the notice changes.

##### Views, Menus, and Defaults

- **LC-11 · A Hand-Written Context Property Isn't a Real Property (Morning Question 11):** a Context-typed definition typed into the property list by hand is set aside when the list is read, since Contexts come from the Context list.
- **LC-13 · Deleting Something Nothing Holds Still Asks (Morning Question 13):** deleting a property or option no page holds still asks, since the definition itself is destroyed, without the "stripped from 0 Items" clause. The zero-case details are today's details with the strip clause removed and no new words: "It is removed from every collection; a restorable record lands in the nexus’s .trash folder." for a property, and "The option is deleted from the property." for an option.
- **LC-14 · Numbered Names (Morning Question 14):** the pane's `+` keeps naming a new property "New Select" or similar without a notice; a Trash restore whose name was taken says "Restored “Priority” as “Priority (2)”."
- **LC-15 · The Panel's File Menu (Morning Question 15):** a File value's right-click in the panel gains Remove and not Clear, matching cards. The row's label opens the same menu as its value, so a File row's label loses the Clear it offered and gains Add File (P16B, J-10).
- **LC-16 · Undo and Aliases (Morning Question 16):** undo takes back only a Link value's alias; a link typed inside a Text value keeps the alias its save added.
- **LC-17 · Status in the Picker (Morning Question 17):** the value picker keeps creating Select and Multi-Select options but not Status options, since a Status option has to sit in one of its groups.
- **LC-38 · New Views (Morning Question 6):** a new view shows Title only, and properties created later stay hidden in existing views.
- **LC-39 · Value-Less Rows (Morning Question 7):** in a grouped view, pages with no value stay an unlabeled run at the top or bottom rather than a "None" group.
- **LC-40 · The Pommora Tile (Morning Question 9):** its leftover Status collapses are kept and scoped to Status, with "open" and "closed" dropped.
- **LC-41 · The Link Default (Morning Question 12):** an unset Link Format stays Full Link, since Default Link Format is set per device and governs pasting.
- **LC-47 · The Two Link Menus Read the Same:** both read Rename, then Edit Link (Edit Title where a page link's title is what's edited), the order the connection menu already uses. On a page link in the Properties panel, the row label's item reads Edit Link while the value's own menu reads Edit Title for the same action (P16B). **Recommended:** take it.
- **LC-52 · A Title Sorts and Filters on the Text It Shows (P2):** a page title holding `[[…]]` or `](…)` sorts and filters on the text it displays, as a Text value already does, where it sorted on the raw file name. A file name seldom holds either. **Recommended:** take it, since Title now reads as text.
- **LC-53 · A Checkbox Keeps Both of Its Readings (P14):** an unchecked box is stored as no value, so the filter treats it as empty ("is empty" matches unchecked boxes), while the sort keeps treating it as a value, ascending putting unchecked first and descending checked first. Applying "empty sorts last" to it would put every unchecked page last both ways and make the sort's direction do nothing. **Recommended:** keep both; a checkbox has no empty state on screen, and the empty-last rule was written for values that can be missing.
- **LC-54 · Pickers Open Fresh per Value Everywhere (P16):** the table already opens a fresh picker when you move from one value to another; Cards and the Properties panel now do the same, a Date or File added from a card's Add list opens as a fresh picker at the same spot, and the panel's popover fades out instead of vanishing. In a view grouped by a Date, picking a date that moves the row to another group closes the calendar, since the cell it opened from is redrawn (LC-59). **Recommended:** take it, one behavior on every surface.
- **LC-59 · A Date Picked Into Another Band Closes Its Calendar (P16A):** in a table or Cards view grouped by a Date, picking a date that moves the page into another group closes the calendar after that one click, because the page's row is redrawn under its new group and the spot the calendar opened from is gone. Today the calendar stays open but has lost its place on screen, so it likely drifts toward the window's corner. Only a Date's picker stays open after a pick, so no other type is affected. An accident fixed. **Recommended:** take it; one rule, a picker closing when what it opened from leaves, covers every surface.
- **LC-55 · The Date Editor's Rows Space at 8px (P17):** with every type's editor on one layout, the Date editor's rows space at 8px where they spaced at 4px, under the same top padding the other editors have; the Number editor's revealed rows gain their missing 8px, and a hidden Day row leaves no gap. **Recommended:** take it; it's what "every editor shares one layout" means, and the drive's screenshots show it.

##### Settled or Structural

- **LC-60 · An Editor That Gave Way Reopens If Its Property Returns (P17):** when a property's editor gives way to the list because the property left (O-5), the pane remembers which editor it showed, so if the property comes back before you open anything else (an undo of a Remove made elsewhere, a sync, or re-adding it from All Properties), its editor slides open again. A Remove or Delete made from this pane resets that memory, so those never reopen. O-5 says nothing about a property returning; this is an earlier agent's mechanism. **Recommended:** take it; the same rule lets a just-created property's editor open the moment the property exists, and forgetting on every departure would need a second rule watching the property list.
- **LC-32 · The Properties Folder's Background/Screen Split Waits (Morning Question 5):** it's part one of I-042, a folder plan for all of Pommora; landing it for Properties alone would make Properties the one area shaped its own way and move the same files twice.
- **LC-33 · One Notes File (Morning Question 2):** one file holds every item's entry rather than a file per item, since it never syncs and keeps one read at open.
- **LC-35 · I-035 Stays Open:** pages already tagged with a new Space or Context name still stay unlinked until they're re-read; that lives in how Pommora places a new Space, which this work doesn't touch, so the entry's wording is updated and the bug stays on file.
- **LC-42 · Several-Word Selects (Morning Question 8):** settled by Nathan: any edit tidies to the one option shown.
- **LC-43 · The Name (Morning Question 10):** settled by Nathan: Filedata.
- **LC-44 · Measurement Outcomes:** four speed checks on a large test Nexus decide small things by fixed rules: whether the renderer stops pre-computing a write's result (F3), whether views need in-place updating after an edit (K), whether the graph filter needs a cache (07-10), and whether mass edits need a combined request (02-10). Any check that fails its threshold is reported here in the morning with its numbers rather than filed.
- **LC-48 · Accidents Fixed Along the Way:** a Nexus whose unfinished Context rename throws on open now finishes opening; a property delete that can't update a damaged Collection settings file now stays unfinished with Try Again instead of silently skipping it; the restore routines' ignored Space-file failures now warn. **Recommended:** take all three. Also: a returning page the restore's clean-up can't update no longer refuses the whole restore, it lands and the warning names it, as a Space file already did (P10; **Recommended:** take it); a page restored into the Trash takes a re-filled link value the way a live page does, dropping one that names a page gone since (P10); a value picked from a menu after its property was deleted does nothing instead of opening a picker on a made-up property (P13); a write for a property deleted a moment earlier reaches the app's own refusal instead of being dropped silently (P13); a hand-written filter rule whose operator its kind doesn't answer, such as Greater Than on a Checkbox, sits out instead of matching every page (P14); a Link added from a card's Add list opens empty instead of pre-filled with an empty link (P16A); an open picker closes when the row it belongs to disappears, and a pane opened from the sidebar's menu closes if that row is redrawn while it's open (P16B); and a Control-click in the Properties panel opens only the menu, as it already does in the table and cards (P16B).
- **LC-56 · Sweeps Reach Only the Spaces Pommora Lists (P10):** finding which Spaces hold a property or tag now reads Pommora's own list of Spaces instead of scanning every folder, so a Space folder sitting under a Context the Context list doesn't name (only a hand copy makes one) is no longer rewritten, a Space with no id two files share is held out as pages already are, and an unreadable Space file is counted as owed. **Recommended:** take it; nothing displays those folders, and the counts match what the app shows.
- **LC-57 · A Notes File Damaged Before Pommora Read It Starts Fresh (P11A):** if `.nexus/.owed.json` is damaged before the session ever read it, its unfinished work reads as none, and the next note sets the damaged copy aside and starts a new file, the policy every Pommora settings file follows (NC-2). The leftover files keep their old names until changed again. **Recommended:** accept it; the file is device-local and only an outside edit damages it.

---

#### Nathan's Calls

- **NC-1 · Context and Space Deletes in System Trash Mode Keep No Record of Their Tags (R's F-8):** in System Trash mode the folder goes to the system Trash and the tags leave every page with no copy anywhere, while a property delete keeps a Pommora Trash entry in either mode on purpose (N-2). **Recommended:** leave it; System Trash mode means Pommora keeps no records of its own, and the property exception is yours by N-2.
- **NC-2 · Damaged-File Copies Are Never Cleaned (R's F-9):** when Pommora rebuilds one of its own damaged JSON files, the damaged copy is set aside as `.<name>.bad-<id>` beside it and never removed. This is the policy for every Pommora settings file, outside Properties. **Recommended:** leave it; the copies are evidence for a hand repair, and a cleanup policy belongs to all of Pommora's files at once.
- **NC-3 · Pages Pommora Can't Safely Rewrite Count as Unfinished Only for Remove (P11B):** a Remove now counts a page whose properties Pommora can't rewrite safely as unfinished, with Try Again (LC-19), but a property rename, a delete, an option change, and Context and Space changes still count only files they couldn't read, so after one of those such a page keeps the old name with nothing owed, as today. **Recommended:** decide whether every change should count them; widening it is a behavior change this plan doesn't make on its own.

---

#### Sync Rebuild Inputs

Records only; nothing here changes Sync.

- **The Stash:** `property_stash` merges as one key in `_pagecollection.json` (`mergePolicy.ts:38-39`), so two devices removing different properties from one Collection lose one stash; the wrapper kept with `removed_at` is the shape a future `{ property_stash: 2 }` merges per property, and depth 3 per page.
- **The Stash Sweep as a New Writer:** a device ageing out an expired block while another removes a different property from the same Collection lands one side whole, a new trigger for the same loss.
- **Option Lists:** `select_options` and `status_groups` merge whole under `{defs: 2}`; option ids make per-option merging (`{defs: 3}`) possible.
- **Assignment Lists:** a Collection's `properties` list merges whole, so after two concurrent Removes a property can come back assigned beside its stash, and nothing refills on that state.
- **Delete Versus Edit:** a property deleted on one device and edited on another leaves a fragment `normalizeRegistry` files as unadmitted and `mutateRegistry` rewrites forever, pinned as intended by `mergePolicy.test.ts:130-136`, whose fixture uses a `name` field definitions don't have; `:120-128`'s respelling case has no live reason once the legacy decode leaves.
- **Fold-Equal Definitions:** two devices creating one name leave the later definition hidden with no notice (`propertiesRegistry.ts:28-36`).
- **Front Matter:** two devices setting different properties on one page lose one edit outside the conflict capture (`base.ts:57` keeps no page base bytes).
- **The Context List:** `contexts.json` merges its `contexts` list whole (I-006).
- **The Notes File:** device-local by design; a Nexus kept in a cloud-synced folder carries it along, which the re-derive replay tolerates.

---

#### Coverage

Every decision maps to a phase or a stated exclusion.

| Entry | Phase or Exclusion |
|---|---|
| A-1, A-2, A-3, A-6, A-7 | Every phase's brief and review |
| A-4 | P1 |
| A-5 | Kept (P8 mints ids at registration) |
| B-1, B-4 | P11A |
| B-3 | P11B |
| B-2 | P9 (the Context rename), P11A (the two deletes) |
| C-1 | Kept; P11A, P11B, P12 |
| C-2 | P11B (Remove's retry), P12 |
| C-3 | P12; its own timeframe is I-077 |
| D-1, D-2, D-3 | P8 |
| E-1, E-2, E-3 | P6 |
| F-1, F-2, F-3 | P2 |
| G-1, G-2, G-3 | P10 |
| H-1 | Every phase (*Sync Stays*) |
| H-2 | *§Sync Rebuild Inputs* |
| I-1, L-2 | Excluded to I-076 |
| I-2 | Kept |
| I-3 | Kept (LC-41) |
| I-4 | P3 |
| J-1 | P4B (spaces), P15 (clock) |
| J-2, J-6, J-7 | Kept |
| J-3, J-10 | P16B |
| J-4 | P15 |
| J-5 | Kept; its comment in P15 |
| J-8 | P3 (gate's reason; LC-17) |
| J-9 | P4B |
| K-1 | P14 (filters), P8 (collapses) |
| K-2 | P14 |
| L-1, L-4 | P17 |
| L-3 | P7 (decode), P17 (editor) |
| M-1 | P3 (record), P18 (document) |
| M-2 | Kept |
| N-1 | P12 |
| N-2 | Kept; P18 (document) |
| O-1, O-2, O-4 | P7 |
| O-3 | P4B |
| O-5 | P17 |
| O-6 | P5 |
| P-1 | P4B |
| P-2, P-3 | Kept |

| Walkthrough Line | Phase or Exclusion |
|---|---|
| *Types* — two tables; 21 unions; fake-property guards; eight picker builders | P3; P2; P2; P3 |
| *Values* — one module; refusal check; real-write tests; "value" names; cached registry and one creation write; Title as text | P4A; P1; P4A; P4A; P4A; P2 |
| *Undo* — one route and one put-back; the undo list stays the owner; the bare-key repair unneeded | P6 |
| *Crash Recovery* — one notes system and the seven guards; one open point; the reverse path; list-first delete; no screen copy of a note; the unread field; up-front capture | P11A; P9, P11A; P9; P11A; P11A (LC-6); P1; P11B |
| *Reach* — one read per file; Space Context keys; index registration; ids not copies; repair from the tree | P10; P10; P5; P5; P5 |
| *Stash* — wrapper flattens; restore writes the stash first; damaged sidecar caught; `.nexus` home | LC-1; P12; P11B; superseded by C-3 |
| *Stash* — What Changes: stale drop, Trash parking, Trash Collections reached, Remove's Try Again | P12; P12; LC-2; P11B |
| *Options* — rename machinery and popup tests leave; one bucket-key builder; throwaway conversion; ids for Sync later | P8 |
| *Panel* — one seat replacing the native router; one pick model and one writer; moves and names | P16A, P16B; P15; P15 |
| *Views* — columns once; one shown text; no redundant hidden list; the view-kind table; speed measured | P13; P14; P13; P14; P14 (LC-44) |
| *Editors* — looks once; row lists; one save path and one format saver; one lock; small duplicates | P3; P17; P7; P7; P17 |
| *Trash* — one counting home; the delete flow; restore trusts create; Delete names | P7 |
| *Settings* — the notice names its list | P5 |
| *Sync* — the scrap test corrected; the merge-depth test rewritten; losses listed | LC-31; LC-31; *§Sync Rebuild Inputs* |
| *Tests* — one seed; duplicates collapse; tags leave; removed-behavior tests leave; documents and Issues rewritten; comments; drives | P1; each phase; P1; each phase; P18; P1, each phase; P7, P8, P15, P18 |
| *Leftover* — the open conversion; old hidden groups; legacy tests; interop stays; shared pieces move; one name per concept; folder split waits | P1; P1; P1; kept; P1, P3, P4A, P10, P11A, P17; each phase, `validation.ts` in P2; LC-32 |

---

#### Open Items

1. **Superseded Readings in the Planning Documents:** *Properties Restructure — Investigation*'s *§What Counts as a Property* (the Built-In Fields name) and *§Edge Rules* P-1 bullet (an edit to a different property leaves a several-word Select as written), and *Properties Restructure — Walkthrough*'s lines this document departs from (*§Last Calls › Departures From the Walkthrough*, plus line 34's "already today's rule", which covers the display half only), carry readings this document supersedes. Whether those planning records are rewritten before ratification is the orchestrator's call; no phase touches them.
2. **`reveal-parity`:** the decision log's Open Item 2 (`.claude/scripts/reveal-parity/run.mjs:750` looks for "Forget Test" and needs fixtures `~/Test` doesn't hold) stays outside Properties.
3. **P16's Seat:** its interleavings (Cards' ghost hold, the table's title passthrough, `lastOpened` keying) are designed and pinned in P16A; its two halves land about −269 (P16A about −87, P16B about −182), checked at each Review Checkpoint.
4. **Measurement Outcomes:** F3, K, 07-10, and 02-10 run their rules in P6, P14, and P15; a failed threshold becomes an LC-44 row.
5. **Sources:** the four planning scouts, the decision log, the Investigation, the Walkthrough, `BRIEF.md`, and the Archive precedent's Findings and *§Process Overview* were read in full. *Properties Restructure — Scout Reports* (376 KB) wasn't read; it's backup evidence behind the Investigation, and every cite this document leans on was taken from a planning scout's HEAD read or opened at HEAD for this document. A reviewer who finds a Scout Reports claim that contradicts a call here checks it against the code, and the code wins.
