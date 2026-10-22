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

- **I-006** (`.claude/IssuesPM.md:173`), **I-032** (`:731`), **I-033** (`:787`), **I-035** (`:819`), **I-036** (`:745`), **I-039** (`:833`), **I-042** (`:1003`), **I-063** (`:889`), **I-064** (`:1075`), **I-068** (`:917`), **I-072** (`:931`), **I-076** (`:1089`), and **I-077** (`:1103`) exist with the statuses *§What Becomes False › Issues Entries* gives each.

---

#### Planner's Calls, Settled

Each call names its reason under the Approach, Principles, and Perspectives. Calls that change what Nathan sees, or depart from the Walkthrough, also carry a *§Last Calls* number.

##### Across the Plan

- **Sequence:** Q's eighteen phases stand with the adjustments listed under *§The Phases › Adjustments to Q's Sequence*. Each phase fits one implementation agent's context and leaves its head shippable.
- **No New Issues:** no task files an Issues entry. I-076 and I-077 are the only deferrals. Every existing entry the work touches is closed or narrowed in place with no successor (*§What Becomes False › Issues Entries*), and anything that can't finish inside the plan is a Last Call.
- **Sync Stays:** nothing under `Core/Sync/` changes, its tests included; `mergePolicy.test.ts:120-136` stays as it reads and goes to *§Sync Rebuild Inputs* (LC-31).
- **Net-Negative Production Lines:** a completion criterion. *§The Ledger* is re-estimated per phase, and the one net-positive phase (P12) states why under *Less Stuff*.
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

##### P5 · One Home per Definition

- **O-6 Is Designed on the Resolver:** Approach I removes `applyRegistry`'s `arrived` walk branch (`fileEvents.ts:488-500`), which the Investigation's O-6 recovery leaned on; with Collections holding ids resolved through one memoized `holderSchema`, a fixed `properties.json` recovers by the registry's own file event patching `config.registry`, and the `Unreadable` registry arm names which registry it is (Q conflict 8).

##### P6 · Undo From the File

- **F3 Folds Into Undo, Measured:** the write's reply already carries the put-back record with the parsed prior value, so it carries the landed value the same way, and the renderer patches its display from what the host wrote; `applyValueAtRoot`, `withSeeds`' encode, and `rekeyOverrides` leave. The pending-write override holds the picked decoded value for the edited field, so no round trip is added before paint. The measurement is a rule (*§Measurement Rules › F3*).
- **Undo's Alias (E-3, Morning Question 16):** only a Link value's alias is taken back; a link typed inside a Text value adds its alias through the editor's own save, which undo leaves (LC-16).
- **`keysPutBack` Is the One Put-Back:** written key-scoped with the value undo as its primary caller, landing parsed nodes, so when P11 removes `undoSweep` nothing shaped only for the sweep side is left (Q dependency 9).

##### P7 · One Door for Property Changes

- **Every Writing Property Channel Folds Into `mutate` (Approach J as I-032's Properties Slice):** the 19 writing property, schema, and registry channels become 14 `mutate` ops; `property:holders` stays a read channel with one request union and a `switch`. Folding the delete alone and adding a `property:configure` channel would leave property writes split across two doors. This is a "how" call, behavior-preserving (LC-34).
- **Replay Rides `MutateOutcome.retry` Until P11:** `property:replay(record?)` becomes the `replayProperty` op, and an owed property op answers `retry: { op: 'replayProperty', record }`, the transport Context renames already use; `propertyWrite.ts` folds into the slice's `mutate`. P11 then replaces one op and one field instead of reshaping eight channels. This is a move of an existing channel, not an addition.
- **One Lock Rule (S1):** every op that writes the registry or a schema sidecar takes the schema lock once; `addProperty` is one hold with its assignment and an in-hold rollback. `createContextGroup`'s move under `underContexts` (R's H-13) waits for P11, where the owed-name read it protects lands.
- **The Counting Module Is `Core/Nexus/entities.ts`:** `PLURALS`, `Counted`, `itemCount`, `countPhrase`, and `unsweptLine` move there; it's engine-safe and both sides already import it, and `hostGraph.test.ts` would refuse `unsweptLine` in the renderer notification copy 04-14 named. `Core/Properties/properties.ts` keeps no count copy. *Clearer Boundaries*.
- **Zero-Holder Deletes Still Ask (Morning Question 13, O-2):** a property or option delete held by nothing asks without the "stripped from 0 Items" clause, since the definition itself is destroyed; Clear and format changes keep asking only past one Item (LC-13).
- **Numbered Names (O-4, Morning Question 14):** `createProperty` returns the landed definition; a Trash restore whose name was taken answers `MutateOutcome.landedAs`, which `browser.ts`'s `steppedTo` already reports; the pane's `+`, which always auto-names, stays quiet (LC-14).

##### P8 · Option Identity

- **Values Decode to Option Ids:** `decodeValue`'s select and multiSelect arms answer option ids, as Context values already answer Space ids (`Core/Contexts/contextResolve.ts:66-78`); every display reads the label off the option. Pages keep the word.
- **Renderer-Minted Ids for Added Options:** the pane's `add` edit carries an id the renderer mints through `mintOptionId()` in `Core/Nexus/ids.ts`, as `mintNewView` mints view ids renderer-side (`Core/Views/Settings/ViewFrame.tsx:80`), so the draft row's key-to-id hand-off and `useRenameKeys` leave `useOptionEdit` entirely; the host mints at registration and in the seeds.
- **An Option Without an Id Answers to a Derived Id:** `opt_${encodeURIComponent(key)}`, deterministic on every device, until the first registry write stores it; a hand edit never hides the property, and two devices derive the same id. A random mint at decode would diverge across devices and would make the read path write.
- **The NexusOS Conversion Is a Throwaway in P8's Checkpoint:** it backs up the four files to `~/NexusOS-Backup-<MM-DD-YYYY>/` beside NexusOS, keeps any option id already stored and mints the rest, converts them, verifies against *Walkthrough §Your Data*'s list (59 options, 8 `group_id`s, the three view files, lowercase `open`/`closed` dropped), and is deleted; the backup folder `~/NexusOS-Backup-<MM-DD-YYYY>/` is removed by its path at Final Verification's closeout.

##### P9 · List First and One Replay Point

- **The Context Rename's Order Is Note → List → Folder → Files (R's H-8, H-9):** Q's preferred cascade-before-relocate is rejected, since a relocate failing after files were rewritten couldn't be reverted by restoring the title alone. On a live relocate failure the op reverts `commitTitle` in place and drops the note; a failed revert leaves the note, and the replay relocates. The file-sweeping reverse path (`contextCascade.ts:231-242`) still leaves.
- **The Replay Moves Off Re-Points:** one pass after `seedContentIndex`, inside the genuine-open block, each entry under its own catch (R's H-10). Only the app writes the notes, so a re-point owes nothing.

##### P10 · One Finder

- **The Finder Rebases an Op's Own Folder Move:** `relocate` patches no tree and `applyMove` runs settle-side, so inside a Context or Space rename the tree lists the pre-move Space paths. The finder takes `moved?: { from: string; to: string }` (root-relative) and rebases any tree path under `from`; one rule serves Context and Space renames alike and the replay arm uses it too, where a registry-derived path would cover only Contexts, since Space titles have no registry. `spaceSidecar.ts:49`'s disk-truth comment is rewritten to that reason (Q conflict 7).
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
- **The Runner Descriptor Is a Rule:** once keyed entries and one reply shape land, the phase compares `rekeyProperty`, `deleteInner`, `rekeyOptions`, and `deleteOption`; if they differ only in their per-arm sweep calls, their shared note-list-sweep-settle skeleton is hoisted into one function in `owed.ts`; if any differs in its order or its reply, the descriptor is excluded and the evidence is recorded in the phase's Departures (*§Measurement Rules › Runner*).

##### P12 · The Stash and Trash Records

- **S's Design Is Binding:** `{ removed_at, values }` per property block, the wrapper kept beside the stamp (LC-1); Remove stamps and every other writer keeps the stamp through `patchStashBlock`; the age cleanup rides the History Timeframe's two triggers and opens only tree-marked sidecars; a global delete leaves Collections in the Trash alone (LC-2); Trash parking runs through origin-filtered `trashedHolders` into `refillValues`; restore order is blocks minus `record.values` ids, then assign, then refill.
- **Cache Becomes Stash, on Disk and in Code (LC-3):** a split would give one concept two names; no Nexus holds a stash or a `caches` record, so both renames are free. `property_cache` → `property_stash`, `propertyCache.ts` → `propertyStash.ts`, `CollectionNode.cached` → `stashed`, the record's `caches` → `stashes`.
- **A Restored Collection's Inert Id Stays (S flag 10):** the restore's reconcile doesn't drop it (*§Verified at HEAD › Inert Assignment Ids*), and leaving it is what makes restore-in-either-order work: a later property restore re-activates it, and the stash block ages out if the property never returns (LC-4).
- **A Re-Add's Refill Skips Surface (S flag 6):** `assignInner` answers the skipped count, `assignProperty`'s reply takes the owed shape P11 gives Remove, and the property's entry gains `refill: [collectionId]`, so the one Try Again re-runs the refill from the block. After the timeframe a skipped value would be lost unseen, so it can't stay silent (LC-5).
- **The Archive Restore's Double Report Folds:** `browser.ts:277-282` stops passing the unrestored and warning lines the slice already showed; the partial line (N-1) inherits the one report. Take Along.

##### P13 – P18

- **07-17 Takes the Host's Values:** GroupFrame's date-bucket list reads the view host's `values` instead of its own `useContainerValues` read when the frame's mount chain holds the host; the read is a rule (*§Measurement Rules › 07-17*).
- **`buildValueContext` Stays (02-12):** 06-08's heading-settings half gives it a job in P13.
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

Each measuring task builds its Benchmark Nexus with `node .claude/scripts/make-benchmark-nexus.mjs large` first, writes the view sidecar it times (the size presets seed no views), runs the measurement over CDP with `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`, and sweeps the Benchmark Nexus and the sidecar after. A baseline is taken with the same script at the phase's base commit. One frame is 16 ms.

- **F3 (P6), the Renderer Stops Encoding:** on `~/Benchmark-Large`, a Table over the largest Collection; 20 single-cell Select edits and five 200-row mass assigns, commit-to-paint from `pointerup` to the paint showing the new chip. **Pass:** single-edit p95 is at most baseline p95 + 16 ms, and each mass assign is at most baseline × 1.10 → F3 lands. **Fail:** the phase restores `applyValueAtRoot`'s encode for the pending override, keeps the rest of P6, removes F3's −30 from *§The Ledger*, and the trace becomes a Last Call row in the reconciliation report.
- **K (P14), an Incremental View Pipeline:** on `~/Benchmark-Large`, a date-sorted, date-grouped Table over the largest Collection; the pipeline's own time (flatten, filter, sort, group) for one value edit, 20 samples, after H compiles operands and date keys once per pass. **Pass:** p95 at most 16 ms → Approach K is excluded, with the trace recorded in the phase's Departures. **Fail:** K becomes a Last Call with the trace, never an Issue.
- **07-10 (P14), the Matrix Filter per Space:** on `~/Benchmark-Large` (800 Spaces), one Matrix filter change with a Select rule; compile plus evaluate time. **Pass:** at most 16 ms → no signature cache. **Fail:** a Last Call with the trace; nothing hoists, since the per-Space prune is row-specific.
- **02-10 (P15), Mass Assign:** on `~/Benchmark-Large`, a 300-row mass assign of a Select. **Pass:** total wall time at most 1,500 ms with no main-thread task over 100 ms → `setProperty` stays one path per op. **Fail:** `setProperty` takes `paths: string[]` in place of `path`, one op under each file's own lock and one reply, inside P15.
- **07-17 (P13), GroupFrame's Second Read:** a read, not a timing. **If** `GroupFrame` mounts under the component that calls `useViewHost` (its render chain from `Core/Views/Settings/SettingsFrame.tsx` reaches the view host's `values`), it takes `values` by prop and its `useContainerValues` call leaves. **Otherwise** the call stays with a one-line comment naming the mount that keeps it apart.
- **Runner (P11), the Mutation Descriptor:** a read. **If** `rekeyProperty`, `deleteInner`, `rekeyOptions`, and `deleteOption` differ only in their per-arm sweep calls after keyed entries land, the shared skeleton is hoisted into one function in `Core/Nexus/owed.ts`. **Otherwise** the descriptor is excluded and the differing steps are recorded in the phase's Departures.

---

#### The Phases

Every phase closes with a Review Checkpoint: gates clean (`npm run typecheck`, `npm run test`, `npm run lint`), `engineGraph.test.ts` and `hostGraph.test.ts` green, the phase's drive group green where it has one, and two `opus-high` reviewers to `closeout-review`'s standards (one simplification, one adversarial), each brief carrying the Approach, Principles, Perspectives, Nathan's Constraints, and the 10-22-2026 directive verbatim; findings are fixed before the next phase opens. Each phase's describers (tests, comments, documents) that its own code makes false are swept inside it; *§What Becomes False* names the rest for P18. Deltas are production lines (source with imports, no comments, tests, docs, or drives).

##### Adjustments to Q's Sequence

1. **P1 Keeps `{defs: 2}`'s Test Untouched:** Q's L2 re-based `mergePolicy.test.ts`; *Sync Stays* rules it out, so L2 reduces to `NexusSyncPM.md:63` in P18.
2. **P4 Takes T's Flags:** the Multi-Select foreign-word dedupe, File dedupe, whitespace-only at decode's entry, and the Space write's no-op skip (with `setSpaceContext`) land beside P-1 and J-9 in the one governed-root module, since every one changes `reconcileGovernedRoot` or the value write it owns. P4's delta takes T's +4 in place of Q's +5 to +10 for P-1.
3. **P7 Folds `property:replay` as a Transport:** Q left `property:replay` for P11 to reshape on folded ops; P7 folds it into `mutate` as `replayProperty` and carries owed records on `MutateOutcome.retry`, so `propertyWrite.ts` leaves in P7 and P11 replaces one op and one field.
4. **P9 Takes R's Context Rename Order:** note → list → folder → files with H-8's in-op revert, over Q's preferred cascade-before-relocate.
5. **P10 Adds the Finder's Move Rebase:** Q's fallback becomes the design, since the tree is patched settle-side.
6. **P11 Takes R's Design Whole:** `journalSlot` dissolves rather than moving; the notes module lands in `Core/Nexus/owed.ts`; Try Again is the argument-less `finishOwed` op; H-13 and H-18 land here; P11's delta becomes R's −200 midpoint less P9's −50 and P1's −12.
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
6. **Generic Modules to Their Owners (Z1):** `Core/Properties/rowOrder.ts`'s `resolveRowOrder` moves into `UIX/Utilities/moveItem.ts` (already a pinned engine-graph UIX leaf), its seven readers re-importing (`Core/Contexts/spaceSidecar.ts`, `Core/Nexus/tree.ts`, `Core/Properties/PropertyPanel.tsx`, `Core/Properties/propertiesRegistry.ts`, the two `bandRouter.ts`/`bandOrder.ts` readers, `Core/Views/Pipeline/group.ts`); `Core/Properties/pageRow.ts` moves to `Core/Views/pageRow.ts`.
7. **Unexports and Comments (09-09, 09-11):** `TypeSpec`, `NUMBER_FAMILIES`, `NumberPart`, `StoredColumnStyle`, and `numberDivisor` unexport, with the rest of 09-09's list of test-only or unread exports; the comments at `Core/Properties/Cells/columnLabel.ts:10`, `setProperty.ts:14`, `Core/Properties/paneDrop.tsx:16-17` (one line), `property-panel.css.ts:8`, and `propertyValue.ts:29` leave.
8. **Test Titles (09-06):** about 31 plan-round tags leave test titles, and the four stale titles are rewritten.

**Order:** 1, 2, 3, 4, 5, 6, 7, 8.

**Behavior Changes:** none on NexusOS, `~/Test`, or a Benchmark Nexus. A Nexus outside them holding a legacy type id would read that definition as unadmitted, which A-4 accepts (Nathan's intent).

**Consumers:** `Core/Nexus/handlers.ts`, `Core/Nexus/adopt.ts`, `Core/Properties/properties.ts`, `Core/Views/views.ts`, `GroupFrame.tsx`, the four `valueToWrite` readers, `contextJournal.ts`, `contextCascade.ts`, the seven `resolveRowOrder` readers, `pageRow`'s readers.

**Tests:** **Deleted:** `migrateConfig.test.ts` (74), `normalizeSavedViews.test.ts` (148), `properties.test.ts:44-47`, `optionOps.test.ts:416-435`, `Nexus/handlers.test.ts:165-178`, the eight `legacyBucketKey`/year-sniff tests, `propertyValue.test.ts:245-247`, `deleteProperty.test.ts:303-332`, `columnStyles.test.ts:13-16,34-43` (keeping the `defaultStyleFor('file')` line), V2's cast test. **Rewritten:** `restoreScrub.test.ts:287,310` respelled camelCase; `value.test.ts:81` retitled. **Untouched:** `Core/Sync/Arrival/mergePolicy.test.ts`. **Written:** one `seedNexus` test pinning that the seeded registry reads back through `readRegistry`.

**Drive:** no visible surface. The Properties Drive lands with its first group in P2.

**Delta:** about −160 production (−90 L1, −35 L3, −22 V2, −12 N4, about −5 unexports; the moves are line-neutral and the comments uncounted); about −420 tests, +25 for the seed.

**Depends On:** nothing.

**Risks:** low. A test reaching `propertyType` by name fails to compile and is re-pointed to `typeIds`.

##### P2 — What Counts as a Property

**GOAL:** The property types become the nine user types plus Context, and Title, Created Time, Last Modified, and Location become one Filedata table keyed by reserved id, with one admission predicate setting aside any definition that isn't a user type. Title reads as text, so option ids can land later without a title ever reading as an id.

**Units:** T6 with T2 inside (F-1, F-2, F-3; 01-03, 01-04, 01-11, 05-03, 07-13, 02-15), T4 (01-10, 09-09's moves), T5 (01-14), 01-13.

**Binding Design:**
1. **Two Type Sets** (`Core/Properties/properties.ts`): `typeIds = z.enum(['text', 'number', 'checkbox', 'dateTime', 'select', 'multiSelect', 'status', 'link', 'file', 'context'])`, `PropertyType = z.infer<typeof typeIds>`; `FiledataType = 'title' | 'createdTime' | 'lastEditedTime'`; `ColumnType = PropertyType | FiledataType`, which replaces all 21 `PropertyType | 'title'` unions in their 11 files (`Core/Actions/cellMenu.ts` 2, `Core/Properties/Cells/PropertyTypes.tsx` 3, `Core/Properties/Pickers/valueClick.ts` 1, `Core/Properties/columnStyles.ts` 1, `parseEditorValue.ts` 1, `properties.ts` 3, `Core/Views/Pipeline/value.ts` 2, `cardValueInput.ts` 1, `useViewHost.ts` 1, `useColumns.ts` 3, `reassign.ts` 3).
2. **One Record Keyed by Column Type:** `PROPERTY_TYPES: Readonly<Record<ColumnType, TypeSpec>>`, with `origin: 'user' | 'context' | 'filedata'`; the stamp rows become `origin: 'filedata'`, and `title: { kind: 'text', origin: 'filedata' }` joins, so `specOf`, `pickKindOf`, `valueClickIntent`, and `fillsBlank` answer every column from one record.
3. **One Admission Predicate:** `export const isUserType = (t: string): t is PropertyType => isKeyOf(PROPERTY_TYPES, t) && PROPERTY_TYPES[t].origin === 'user'`, read by `normalizeRegistry` (`Core/Properties/propertiesRegistry.ts:21-45`) and `validateDefinition` (`Core/Properties/schema.ts:65-66`); `normalizeRegistry` also sets aside a reserved id, filing both as `unadmitted`. The guards that filtered them back out leave: `Core/Properties/Schema/PropertyFrame.tsx:202,204`, `Core/Views/Settings/visibilityModel.ts:17`, `Core/Views/Settings/SortFrame.tsx:92`, `Core/Interface/Menus/propertyMenuActions.ts:69`, and the stamps' `NO_SETTINGS` rows (`PropertyFrame.tsx:392-393`; Context's `:391` stays).
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
5. **Title Reads as Text:** `Core/Views/Pipeline/value.ts:43` answers `{ kind: 'text', value: row.title }`; `filter.ts`'s title branch leaves; `textValue`'s select arm stays for option labels; `TITLE_OPS` (`filterModel.ts:107-108`) stays, since Title offers no empty ops.
6. **Catalog Moves (T4):** `KEY_REFUSAL` and `RESERVED_NAME_PREFIX` move to `schema.ts`; the two seeds move to `Core/Properties/registryProperty.ts`; the `optionsOf` comment (`properties.ts:286`) and `properties.test.ts:267` lose the ghost "type change" reason.
7. **Bucket Labels (T5):** `formatBucketLabel` moves to `Core/Views/Pipeline/group.ts` beside `dateBucketKey`, with its test; `NUMERIC_FORMATS` stays in `formatValue.ts`. **01-13:** `formatPoint` calls `showsWeekday`.

**Order:** 1 and 2 together, 3, 4, 5, 6, 7.

**Behavior Changes:** a hand-written `context`, stamp, or reserved-id definition reads as unadmitted rather than a dead or uneditable property (an earlier agent's choice made consistent; LC-11). Title filters and sorts on its text as before (a title holding literal `[[…]]` filters on its shown text, as the select arm already did).

**Consumers:** the 11 union files, `RESERVED_PROPERTY_ID`'s 12 readers, `normalizeRegistry`, `validateDefinition`, the four guard sites, `columns.ts`, `value.ts`, `filter.ts`, `SortFrame.tsx`, `columnLabel.ts`, `formatValue.ts`, `group.ts`, `bandModel.ts`.

**Tests:** **Rewritten:** `schema.test.ts:86-91` becomes a decode test (`normalizeRegistry` sets a stamp definition aside); stamp-typed fixtures (`propertyMenuActions.test.ts:39`, `useColumnStyles.test.ts:90`, `sort.test.ts:51,56`, `propertyValue.test.ts:157,161`) re-typed to a Filedata column or removed. **Kept:** `schema.test.ts:79-84` as the create-side pin of `isUserType`. **Written:** one test that a Title value is `{ kind: 'text' }` through `resolveFieldValue`.

**Drive:** the Properties Drive (`.claude/scripts/Properties Drive/live-drive.mjs`, on `drive-harness.mjs`, in the Archive Drive's shape) is created with group 1 on `~/Test`: a Table's header and its sort and filter menus show Title, Creation Time, and Last Modified with today's labels and icons; a `context`-typed definition written by hand into `~/Test/.nexus/properties.json` shows nowhere in the Properties pane, and the drive removes it after.

**Delta:** about −60 (−45 to −80).

**Depends On:** P1 (`propertyType` is plain `typeIds`).

**Risks:** about 25 files of type churn, mechanical; `typecheck` is the gate.

##### P3 — Type Records and Looks

**GOAL:** Each type's facts live in one engine record and one renderer record, and each type's looks in one record, so consumers ask the type instead of re-deciding it. The renderer label module, the link-display vocabulary, and the pane targets land in their owners first, because the records' display fields land inside them.

**Units:** T9 (08-07, 08-08, 01-08/06-11), T1 (01-01, 01-05, 06-09, 06-14, 06-02's two facts), T3 (01-09, 05-04/08-09), T7 (05-02), T8 (I-4).

**Binding Design:**
1. **Owners First (T9):** the link-display values (`LINK_DISPLAYS`, `LinkDisplay`, `isLinkDisplay`, `DEFAULT_LINK_DISPLAY`) move to `Core/Connections/linkValue.ts`, and their labels go to the label module (08-08's split); `PaneTarget` and its builders move to `Core/Views/paneTargets.ts` (renderer `.ts`, beside `filterModel.ts`); 08-07's renderer label module is `Core/Properties/displayLabels.ts`, taking `LINK_DISPLAY_LABELS` (`properties.ts:98`), `LOOK_LABELS` (`columnStyles.ts:23`), and `lookOptions` (`columnStyles.ts:33`), whose every reader is renderer-side at HEAD (`Core/Actions/columnMenu.ts`, `connectionMenu.ts`, `pasteAsMenu.ts`, `Schema/linkFormatOptions.ts`, `CheckboxEditor.tsx`, `NumberEditor.tsx`, `PropertyFrame.tsx`; the engine graph reaches `Core/Actions` only through `handlers.ts` → `menuModel.ts` and `editorMenu.ts`, which import none of them). The remaining label tables in engine files follow the same test: a table whose every reader is renderer-side moves, and one with a host-side reader stays, each placement stated in its task with the `git grep -n` that settles it.
2. **The Engine Record (T1):** `TypeSpec` gains `connections?: 'value' | 'prose'` (Link `'value'`, Text `'prose'`), `registersMembers?: true` (Multi-Select), and `blankDraws?: true` (Checkbox). `CREATABLE_TYPES` moves from `Cells/PropertyTypes.tsx:43-45` into `properties.ts`, derived from `isUserType`. Readers: the five "which types hold connections" sites (01-05) read `connections`; `fileEvents.ts:528` and `optionOps.ts:133` read `registersMembers`; the four checkbox blank-rule sites (06-14) read `blankDraws`.
3. **The Renderer Record:** `Core/Properties/Cells/PropertyTypes.tsx` moves to `Core/Properties/typeDisplay.tsx` (06-11: it isn't a cell), its `TYPE_META` keyed by `ColumnType` absorbing the chip shape (`optionShapeFor`, which leaves `UIX/Labels/recipes.tsx`), the chip default glyph (`optionGlyph`'s default, `Cells/OptionChip.tsx:26`; Select keeps `'tag'`, M-1), and `styleLabel` (Link `'Format'`, every other type `'Style'`), which replaces `styleMenuLabel` (`Core/Actions/columnMenu.ts:40-42`); `columnMenu.ts` is renderer-side (its importers are `cellMenu.ts`, `optionMenu.ts`, `Bundles/browser.ts`, `MarkdownPM/Tables/tableMenu.ts`, `useOptionEdit.tsx`, `CardValue.tsx`, `useColumns.ts`, none in the engine graph), so it reads the `.tsx` record directly. `Schema/GhostOptionChip.tsx` and `Schema/useOptionEdit.tsx` read the shape from it.
4. **One Options-From-Labels Builder (T3):** `pickerOptions(values, labels)` in `displayLabels.ts`, beside `lookOptions`, which becomes `(looks) => pickerOptions(looks, LOOK_LABELS)`; `Core/Properties/Schema/linkFormatOptions.ts` leaves; `LinkEditor.tsx` and `Core/Settings/frames.ts` call `pickerOptions`. Nothing in the engine graph imports `displayLabels.ts`, which `engineGraph.test.ts`'s no-renderer pin proves.
5. **One Looks Record (T7):** `LOOKS: Readonly<Record<PropertyType, readonly ColumnLook[]>>` in `columnStyles.ts` beside `OPTION_LOOKS`/`CHECKBOX_LOOKS`/`NUMBER_LOOKS`, read by `styleMenuItems`, `defaultStyleFor`, and `PropertyFrame.tsx:362,370,408`'s three narrowings. No row moves and no wording changes (I-1).
6. **The Status Picker Gate (J-8):** `PropertyPicker.tsx:311` keeps reading `options === 'select'`, with its reason in one line beside it.

**Order:** 1, 2, 3, 4, 5, 6.

**Behavior Changes:** a Number column's right-click names its Number or Bar choice "Style" (I-4, Nathan's intent). Nothing else visible.

**Consumers:** `linkValue.ts`'s new readers, `filterModel.ts`, `Core/Navigation/previewRules.ts`, `SortFrame.tsx`, `PropertyPanel.tsx`, `UIX/Labels/recipes.tsx`, `OptionChip.tsx`, `GhostOptionChip.tsx`, `useOptionEdit.tsx`, `columnMenu.ts`, `columnStyles.ts`, `PropertyFrame.tsx`, `LinkEditor.tsx`, `Settings/frames.ts`, the connections, registration, and blank-rule sites.

**Tests:** **Rewritten:** `columnMenu.test.ts:171-175` pins "Style" for Number and "Format" for Link; `columnMenu.test.ts:39`'s title matched to its `[]` assertion; `cellMenu.test.ts:100`'s "(its look is per-property)" retitled. **Collapsed:** the duplicate type-fact pins 01-01 lists fold to one record test per side.

**Drive:** Properties Drive group 2: right-clicking a Number column header shows "Style", a Link header "Format"; a Select chip in compact view keeps its tag glyph.

**Delta:** about −78 (−60 to −95).

**Depends On:** P2 (`ColumnType`).

**Risks:** `engineGraph.test.ts`'s pinned UIX leaf list changes when `optionShapeFor` leaves `recipes.tsx`; the pin is updated in the same task.

`[Compaction checkpoint: c/pre-compaction; on the re-prompt, re-read §Constraints and c/plan-execution before P4 opens]`

##### P4 — The Value Write's One Home

**GOAL:** Every value write lands through one governed-root module that reads each file once, and tests seed through the real write. The tidy rule lands there as a type fact: a value is never blanked, a list never loses a member it can't read, and a Select or Status lands as the one option it shows. Text and every other type holding only spaces read as empty, a write that changes nothing writes nothing on a Space as on a page, and Repair Properties On Open turns on by default.

**Units:** V1 (02-03, 02-04, 02-06, 02 A-01), V3 (02-04, 04-11, 08-07's number half), V4 (02-07, 09-02), V5 (02-08, 02-11, 02-16, 08-05), V7 (P-1, P-3), V8 (J-9), V9 (J-1), R8 (O-3), T's flags 1–4, R6's `governedSweep.ts` move.

**Binding Design:**
1. **The Module** (new `Core/Nexus/governedRoot.ts`): `GovernedWorld`, `governedWorld`, `spaceWorldOf` (from `Core/Contexts/contextResolve.ts:42-57`), `pageWorldOf` (from `Core/Contexts/contextWrite.ts`), `reconcileGovernedRoot` (from `contextResolve.ts:96-132`), one `reencode(def, raw, frozen?)` replacing `reconcilePropertyValue` and the hand-rolled copies at `contextResolve.ts:112-128` and `Core/Properties/assignment.ts:57-61`, `writtenSpelling`/`checkedSpelling`, `writtenRoot` (from `governedWrite.ts:12-17`), and `rewriteRootAt(absFile: string, rewrite: (raw: Json) => Json | null, preserveTimes?: boolean): Promise<Result<'written' | 'unchanged'>>` built on `sweepParse` + `rewriteRaw`, answering `not-found` itself so callers' existence checks leave. `Core/Properties/governedWrite.ts` is deleted; `Core/Properties/governedSweep.ts` moves to `Core/Nexus/governedSweep.ts`. The banner passes `(raw) => landValue(raw, 'banner', v)` to `rewriteRootAt`; `landPageValue` folds into `setPagePropertyOp`; `setPageContext` calls `rewriteRootAt`.
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
7. **The Codec Narrows (V3):** `propertyValue.ts` keeps the union, decode, encode, option words, checkbox reading, and blank predicates; `unregisteredMembers` moves to `Core/Properties/optionOps.ts`; `Frozen`/`frozenWorld`/`gonePageEntry` move to the Trash side with one `frozenOf(tree, archived)` builder replacing the three `frozenWorld(linkWorld(...))` sites (`assignment.ts`, `restoreProperty.ts`, `Core/Trash/spend.ts`); `readNumber`/`spelledNumber` move beside decode and encode, so `formatValue.ts` leaves the engine graph.
8. **Tests Seed Through the Real Write (V4):** `writePageValue`/`writeSpaceValue` leave `Core/Testing/propertyWrites.ts`; a test meaning "a user wrote this" seeds through `settledMutate`, one meaning "the file holds this" through `putJson`/`seedSpaceSidecar`; the `land*` exports leave once `writePathRace.test.ts:75-82` pins the lock rule through `setPagePropertyOp`.
9. **Names and Small Merges (V5):** `Core/Properties/pageValue.ts` is deleted, its list edits moving to `Core/Files/rootValues.ts` and `valueEditRewrite` to `optionOps.ts`; `Core/Views/Pipeline/value.ts` becomes `fieldValue.ts`, its `fileName` moving to `linkValue.ts`; `pageValuesOf` folds into `Core/Views/Host/loadValues.ts`; create-with-seeds writes once (02-16); the registry read on a value write goes through `cachedParse` (`Core/Files/walkCache.ts:34-58`), ending the per-write `validateName` re-validation (08-05).
10. **Repair On Open (O-3):** `personalization.ts:146` becomes `flag(true)`.
11. **Describers:** `Core/Nexus/mutate.ts:81`'s "never shrinks or drops a key it can't resolve" becomes "never blanks a value or drops a list member it can't resolve".

**Order:** 1 (with the move of `governedSweep.ts`), 7, 9, 8, then 2–6 on the merged module, then 10, 11.

**Behavior Changes:** a several-word Select or Status tidies to the one option it shows on any value write to its page or Space and on Repair On Open (P-1, Nathan's intent; LC-20, LC-21); a Multi-Select holding a foreign word dedupes (LC-22); File dedupes (LC-23); whitespace-only reads as empty for every type (J-1 for Text, Nathan's intent; LC-24 for the rest); an unchanged Space write leaves the file untouched (an accident fixed; LC-25); a Space clear of an absent key tidies the Space's other properties (J-9, Nathan's intent); Repair On Open defaults on (O-3, Nathan's intent).

**Consumers:** every value write route (`setPagePropertyOp`, `setSpacePropertyOp`, `setPageContext`, `setSpaceContext`, `setBanner`, creation seeds, the repair sweep), `governedSweep.ts`'s 19 importers (8 outside Properties), `frozenWorld`'s three sites, `formatValue.ts`'s readers, `propertyWrites.ts`'s 54 test calls.

**Tests:** **Deleted:** `repairSweep.test.ts:150-156` (its case moves to the unit level), `pageValue.test.ts` (folded with its functions). **Written:** `contextResolve.test.ts` property arm: `Stage: [A, B]` → `[B]`, `[A, Zed]` → `[A]`, `[Zed]` kept; `[a, zeta, a]` → `[a, zeta]`; a duplicate File entry collapses; `Notes: "   "`, a whitespace Date, and a whitespace Link decode empty; `setSpaceProperty.test.ts` *reconciles the Space* gains "clearing a key the Space never held tidies `Status: 'Option 1'` to `['Option 1']`". **Kept:** `setSpaceProperty.test.ts:75-82` (bytes and mtime unchanged on a no-op clear), `repairSweep.test.ts:135-141`, `contextResolve.test.ts:213-226`, `propertyValue.test.ts:167-190`. **Rewritten:** `propertyValue.test.ts:223-225` ("an empty string is a link value") pins the empty value; every `writePageValue` call re-seeds through the real write.

**Drive:** Properties Drive group 3: on `~/Test`, a page written by hand with `Status: [Option 1, Option 2]` shows Option 2, and editing a different property rewrites it to `[Option 2]`; a Text property written as three spaces matches "is empty"; picking a Space value already held leaves `_space.json`'s mtime unchanged.

**Measurements:** P4's checkpoint runs T's NexusOS scan read-only against a copy of `~/NexusOS` and lists every page and key Repair On Open would change under the new rule (expected: none).

**Delta:** about −85 (−75 to −95; T's +4 inside).

**Depends On:** P1, P2.

**Risks:** about 40 files of import churn from the module moves; the engine and host graph tests catch a renderer import into `Core/Nexus`.

##### P5 — One Home per Definition

**GOAL:** Collections hold property ids and every holder's schema resolves through one memoized resolver, so a property arriving by sync or hand edit no longer walks the Nexus, registration at open reads the index, and the repair sweep builds its world from the tree. A damaged property list opens the Nexus with Properties marked unreadable and a notice naming that list, recovering through the same resolver once the file is fixed.

**Units:** R4 (08-02, 08-13, 07-12, 03-14's `assignedDefs`), R5 (04-10), R3 (04-06/03-12), R7 (O-6), 04-11's `frozenOf` (landed in P4).

**Binding Design:**
1. **Ids, Not Copies (R4):** `CollectionNode.propertyIds: string[]` as written replaces the resolved definition copies (`Core/Nexus/tree.ts`); `containerSchema(tree, node)` and a new `holderSchema(tree, holder)` resolve against one registry map memoized on `config.registry` identity (`entityMemo`, `tree.ts:132`); `repointRegistryInTree` and `resolveAssignedSchema` (`Core/Nexus/treePatch.ts`, `containerFields.ts:29-39`), the `arrived` walk branch and per-event `registryOf` (`fileEvents.ts:488-500`) leave; `SettingsFrame.tsx:76` routes through `containerSchema`. `assignedDefs`' four readers (`contextWrite.ts`, `assignment.ts`, `repairSweep.ts`, `restoreScrub.ts`) read `holderSchema`. `containerSchema`'s nine readers keep their call and switch any `.properties` reference to it.
2. **Repair's World (R5):** `runRepairSweep`'s async `defsByFolder` memo becomes one synchronous builder shared with `pageWorldOf` and `scrubReturning`.
3. **Registration Reads the Index (R3):** `registerHeldOptions(root)` reads members from `readPageRelations(paths).pages[*].values` for the Multi-Select Collections' pages instead of a stat and parse per page.
4. **The Damaged List (O-6):** `readNexusConfig` (`Core/Nexus/readNexus.ts:287-288`) reads `properties.json` through a kept read that answers an empty registry plus `{ path: '.nexus/properties.json', kind: 'registry', registry: 'properties', reason }` in `tree.unreadable` when the session's first read fails; the `Unreadable` registry arm (`tree.ts:109-112`) gains `registry: 'contexts' | 'properties'`, read by its two readers (`Core/Nexus/remintLedger.ts:56`, `Core/Tiles/tileHosts.ts:51`), so a damaged property list doesn't hide every Space from tiles; the open stops waiting on the root with the error (`handlers.ts:74-80`) for this case; `notifyUnreadable` names the list. Writes already refuse a damaged list through `mutateRegistry` → `updateNexusFile(…, false)`; a fixed file's own event replaces `config.registry`, and the resolver's memo key changes with it.

**Order:** 1, 2, 3, 4.

**Behavior Changes:** a damaged property list opens the Nexus with Properties unreadable and a notice (O-6, Nathan's intent). A synced or hand-edited definition updates without a full re-read (no visible change).

**Consumers:** `tree.ts`, `treePatch.ts`, `containerFields.ts`, `fileEvents.ts`, `SettingsFrame.tsx`, `containerSchema`'s nine readers (`Core/Interface/Menus/entityMenuActions.ts`, `fileEvents.ts`, `treePatch.ts`, `PropertyPanel.tsx`, `optionOps.ts`, `ViewTile.tsx`, `tilesFile.ts`, `useViewHost.ts`, `ViewMenu.tsx`), `assignedDefs`' four readers, `repairSweep.ts`, `optionOps.ts`, `readNexus.ts`, `remintLedger.ts`, `tileHosts.ts`, `notifications.ts`.

**Tests:** **Rewritten:** tree-delta tests holding definition copies hold ids; `fileEvents.test.ts`'s arrived-walk case becomes "a changed definition re-resolves without a walk". **Written:** the damaged-list open (Nexus opens, registry empty, unreadable entry names properties, Spaces stay listed for tiles, fixing the file restores the definitions).

**Drive:** Properties Drive group 4: corrupting `~/Test/.nexus/properties.json` and reopening shows the Nexus with a notice naming the property list and every Space still in tiles; restoring the file brings the properties back without a reopen.

**Delta:** about −27 (−20 to −35; O-6's +10 to +20 inside, required behavior in its minimal form).

**Depends On:** P4.

**Risks:** a render-path consumer holding `.properties` by reference must switch to the memoized resolver; `typecheck` finds every one once the field is renamed.

##### P6 — Undo From the File

**GOAL:** The part of Pommora that writes a file records exactly what the edited key held and hands that record back with its reply, and undo puts that one key back, a Link value's alias included, replacing the renderer's held copy, its patch, and the re-sent Context ids. The renderer stops re-implementing the host's encode and patches its display from the value the host wrote.

**Units:** V10 (E-1, E-2, E-3; Approach F2), V11 (Approach F3), 02-05.

**Binding Design:**
1. **The Put-Back Record:** `MutateOutcome` gains `undo?: PutBack[]`, `type PutBack = { file: string; propertyId: string; key: string; before?: string | Json; landed: PropertyValue }` — the key's prior node text (page) or JSON value (Space), absent when the file held no key, plus the parsed landed value for the display patch. It's captured inside `rewriteRootAt` and the Space write's mutate, where the prior text is already read. A Space ↔ Space Context link records every file its write touched (`contextWrite.ts:96-113`).
2. **One Put-Back Op:** the `putBack` `mutate` op (`{ op: 'putBack'; entries: PutBack[]; aliases?: AliasPutBack }`) replaces `restoreValue`; it lands through `keysPutBack(entries)`, which takes a `keys` scope (a value undo its one key, a sweep its `changedKeys`) and lands the recorded nodes rather than parsed values, so a bare `Status:` comes back bare and 02-02's `nodeSpelledAs` null fix isn't needed. It never takes `undoSweep`'s whole-file shortcut.
3. **E-3:** `editAliases` (`Core/Nexus/pageMetadata.ts`, `aliasMemory.ts`) replies with the aliases it replaced; the value's revert sends that back inside the same `putBack`. Only a Link value's alias is taken back.
4. **Removes:** `held` capture and `restore` with its context arm (`Core/Properties/assignValue.ts:60-72,98-99`), the fire-and-forget shape of the alias add (the add itself stays in `rememberedAlias`, renderer-side, as the one path for Link and Text aliases, now awaited, with `editAliases`' reply attached to the undo entry), `requestedValue` and its `restoreValue` arm (`setProperty.ts`), the `held` request field and its routing (`mutateRequest.ts:91-92`, `mutate.ts:198-202`), `keepingForeignWords`' run over an undo.
5. **F3:** `applyValueAtRoot` (`propertyValue.ts:315`), `assignValue.ts:56`'s encode, `withSeeds`' encode (`Core/Views/Host/useViewCreation.ts:54`), and `rekeyOverrides` (`useContainerValues.ts:17`) leave; `Core/Properties/valueOverride.ts` holds, per pending write, the picked decoded value for the edited field, replaced by `undo[].landed` when the reply lands.
6. **The Undo Stack Stays the One Owner:** `Core/Session/undo.ts`'s `pushUndo`, depth 100, `groupUndo`, and `resetUndo` on a Nexus switch are unchanged; the revert re-resolves the row's current path by id, as today.

**Order:** 1, 2, 3, 4, then 5 with its measurement, 6 checked.

**Behavior Changes:** undo puts back exactly what the file held for the edited key only (E-1, E-2), a bare key comes back bare, unknown Context tag names survive an undo, and undoing a Link value takes back the alias it added (E-3) — each Nathan's intent.

**Consumers:** `assignValue.ts`, `setProperty.ts`, `mutateRequest.ts`, `mutate.ts`, `governedRoot.ts`, `governedSweep.ts`, `contextWrite.ts`, `pageMetadata.ts`, `aliasMemory.ts`, `Session/undo.ts`, `valueOverride.ts`, `useViewCreation.ts`, `useContainerValues.ts`, `ValueWriter`'s four assemblers (`entityMenuActions.ts`, `PropertyPanel.tsx`, `assignValue.ts`, `useViewHost.ts`).

**Tests:** **Rewritten:** `restoreValue.test.ts` (193 lines) folds into the `setProperty` and put-back tests; `assignValue.test.ts:72-115` pins the reply-carried record. **Written:** bare `Status:` round-trips bare; an unknown Space title survives a Context undo; a Link undo removes its alias and keeps an alias the page already had; a tidied sibling stays tidied after undo.

**Drive:** Properties Drive group 5: on `~/Test`, pick a Select on a page whose file holds a bare `Status:`, press ⌘Z, and the file reads `Status:` again; rename a Link value's display, undo, and the alias leaves `.nexus/metadata/`.

**Measurements:** F3 (*§Measurement Rules › F3*).

**Delta:** about −35 (−30 to −40); E alone is near zero, and F3 makes it negative.

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
   | `addProperty { containerPath, type, label }` | `schema:add` |
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
5. **Small Ones (S5):** `optionCascade`'s `null`-in-a-tuple becomes `type OptionChange = { kind: 'rename'; from; to } | { kind: 'remove'; label } | { kind: 'clear'; label }` with a `switch`; Remove's inline `mapViews` leaves, so `reachConfig` owns every view edit; `refillValues` moves beside `sweepRootsById` in `Core/Nexus/governedSweep.ts`; `writePropertyBundle` unexports; `Core/Properties/removeProperty.ts` becomes `unassignProperty.ts`; `Core/Trash/holdings.ts` becomes `Core/Trash/trashedCopies.ts`; `propertyDraft.id` becomes optional; `number_denominator` decodes `z.number().positive().optional().catch(undefined)` (`properties.ts:190`), so a stored non-positive value reads as unset and the definition stays admitted.
6. **One Count Path (S6, O-2):** `property:holders` takes one request union, `{ of: 'property' } | { of: 'option'; label: string } | { of: 'format'; change: FormatChange }`, answered by a `switch` ending in `sweepCount`'s dry run (`Core/Properties/handlers.ts:199-208`'s shape sniff leaves). `Counted`, `PLURALS`, `itemCount`, `countPhrase`, and `unsweptLine` move into `Core/Nexus/entities.ts`; `confirmations.ts`, `governedSweep.ts`, `KEY_REFUSAL.held`, and `unsweptLine`'s 8 readers import from there. A property or option delete held by nothing asks without its strip clause: `askDestroyProperty`'s detail reads "It is removed from every collection; a restorable record lands in the nexus’s .trash folder." at zero, and `askDeleteOption`'s reads "The option is deleted from the property." at zero.
7. **Remove Reads Delete (S7, O-1):** `Core/Actions/optionMenu.ts:21` becomes `{ label: 'Delete', action: 'option:delete' }` (its `:1` comment leaves); `askRemoveOption` becomes `askDeleteOption`, asking `Delete “${label}”?` with a Delete button; `removeOption` becomes `deleteOption`; `useOptionEdit.tsx:114-116` dispatches `deleteOption`.
8. **The Delete Flow (S8):** `PropertyFrame.tsx:291-299`'s ask, `property:delete`, `storesChanged.emit`, back-to-list, and `notifyTrashed` become one `confirmDelete` call (`confirmations.ts:122-134`) with the `deleteProperty` op; the frame's `trashChanged` emit (`PropertyFrame.tsx:297`) leaves, since the slice emits it.
9. **Take Along:** the Option Picker Drive's Clear assertion (`.claude/scripts/Option Picker Drive/live-drive.mjs:170-173`) follows the past-one threshold `5e3aee180` set.

**Order:** 6, 3, 4, 5, 7, then 1 and 2 together (the table names ops by their post-rename names), 8, 9.

**Behavior Changes:** an option's Remove reads Delete (O-1, Nathan's intent); a delete held by nothing asks without "0 Items" (O-2, Nathan's intent; LC-13); a Trash restore that took a numbered name says "Restored “Priority” as “Priority (2)”" (O-4, Nathan's intent; LC-14); a denominator of zero or less reads as unset (L-3, Nathan's intent). Folding the channels is a "how" call with no visible change (LC-34).

**Consumers:** `bridge.ts`, `mutateRequest.ts`, `mutate.ts`, `Core/Properties/handlers.ts`, `Core/Session/nexusSlice.ts`, `PropertyFrame.tsx`, `useOptionEdit.tsx`, `confirmations.ts`, `optionMenu.ts`, `registryProperty.ts`, `propertiesRegistry.ts`, `Core/Trash/restoreProperty.ts`, `Core/Trash/spend.ts`, `Core/Bundles/browser.ts`, `optionOps.ts`, `entities.ts`, `unsweptLine`'s and `itemCount`'s readers, the Metadata Drive (`live-drive.mjs:789,932,935,960,979`), `MATRIX.md:110`.

**Tests:** **Rewritten:** `Core/Properties/handlers.test.ts:167-254` and the channel tests against ops; `OptionEditor.test.tsx:44-187` to Delete; `confirmations.test.ts` gains the zero wording and keeps `countPhrase([])` as "0 Items"; `PropertyFrame.test.tsx`'s two harnesses merge, its false names (`:255`, `:438`, `:486`, `deleteSpy` at `:244`) and `:202`'s stale title are corrected (05-13). **Written:** `addProperty`'s in-hold rollback; a restore under a taken name answers `landedAs`; no op re-takes the schema lock.

**Drive:** Properties Drive group 6: an option's menu reads Delete and asks "Delete “Alpha”?"; deleting a property no page holds asks without "0 Items"; restoring a deleted property after creating one with its name reports the numbered name. The Option Picker and Metadata drives run green on the new wording.

**Delta:** about −50 (−35 to −70; the op-keyed `created` and the counting module's zero wording inside).

**Depends On:** P2, P3 (the frame's type facts), P6 (the reply shape `mutate` already carries).

**Risks:** the op fold touches every Properties pane write; the frame's drive group exercises each op once.

##### P8 — Option Identity

**GOAL:** Every option carries a permanent id that views, tiles, the Matrix filter, and preview rules refer to, so an option rename stops rewriting configuration and only pages holding the word are swept. Collapsed groups are scoped per property through one bucket-key builder, which keeps folder collapses when a grouped property is deleted, and Status options stop storing their group id. NexusOS is converted once by a throwaway script inside the phase's checkpoint.

**Units:** D1 (D-1), D2 (D-2, K-1's grouped delete), D3 (D-3), 09-14's test cuts.

**Binding Design:**
1. **The Id** (`Core/Nexus/ids.ts`): `export const mintOptionId = (): string => \`opt_${newId()}\`` beside `mintPropertyId`. `selectOption` and `statusOption` (`properties.ts:121-145`) gain `id`, decoded loose: a stored `id` reads as written, and a missing one answers `opt_${encodeURIComponent(key)}`, which the next registry write stores. `statusOption`'s `group_id` leaves the decoder's required fields and every writer (`properties.ts:144,304,313,323,329,335`, `Core/Properties/optionModel.ts:35,49`, `Core/Testing/viewHarness.tsx:68,74`, `Core/Testing/definitions.ts`); a stored `group_id` rides along unread.
2. **Values Are Ids:** `wordsOf(def)` keys by id; its `labelOf` becomes `idOf: Map<key, id>`; `decodeValue`'s select and multiSelect arms answer ids, and `encodeValue` maps ids to keys. `findOption(def, id)`; its readers (`Cell.tsx:65,85`, `bandModel.ts:81`, `GroupFrame.tsx:372`, `OptionOrderList.tsx:74,94`, `optionOps.ts:84,190,255`) pass ids; `optionLabels` readers (`group.ts:199,219`, `sort.ts:87`) read labels off options; `bucketKey` (`group.ts:179-180`) yields the option id; `textValue`'s select arm maps id to label for text ops and title sorting. Unregistered words get no id and drop out of the decoded value as today; registration mints one when it adopts a word (A-5).
3. **Option Ops Take Ids:** `editOption`, `renameOption { propertyId, optionId, label }`, `deleteOption { propertyId, optionId }`, `clearOption { propertyId, optionId }`, and `property:holders`' `{ of: 'option'; optionId }`. The `add` edit carries the id the renderer minted with `mintOptionId()`; the host mints at `registerHeldOptions` (`optionOps.ts:150`) and in the two seeds.
4. **The Rename Reach Leaves:** `Core/Nexus/configReach.ts`'s RENAME table and its four handlers (`wholeValues`, `optionRule`'s rename half, `scopedOrder`, `collapsedKeys`, `:131-196`) and `OptionReach.labels` leave; `optionCascade`'s `labels` leave. An option delete still drops its id from views through `GONE`'s `stripGone` (`:226-235`) with a `propId/optId` matcher.
5. **The Popup Re-Keying Leaves:** `useOptionEdit.tsx`'s `useRenameKeys`, rename landing, `rowKeyOf`, and the draft row's `\0n` key hand-off (`:66-97,142-149,183`) leave; rows and the open popup key by option id. `useRenameKeys` stays in UIX for `useListEdit` (`AliasList.tsx`, `ExcludedDirectoriesRow.tsx`).
6. **One Bucket-Key Builder (D2)** (`Core/Views/views.ts`): `bandKey(band: { kind: 'set'; setId } | { kind: 'property'; propertyId; bucket; setId?: string } | { kind: 'tail' }): string` — a property band `propId/bucket`, a sub-band `setId/propId/bucket`, a Set band its Set id, the tail `_ungrouped`. It serves hidden and collapsed keys; `editHiddenBucket` leaves; `clearHiddenBuckets` is the one prefix strip, and `CLEAR.bandKeys` (`configReach.ts:212-216`) calls it, so a grouped property's delete keeps structural keys. `useViewHost.ts:63,148-155` and `Core/Views/viewRow.ts` build band keys through it.
7. **The NexusOS Conversion (throwaway, in the checkpoint):** a script in the session scratchpad copies `~/NexusOS/.nexus/properties.json`, `~/NexusOS/Ideas/_pagecollection.json`, `~/NexusOS/.nexus/interface/homepage/_tiles.json`, and `~/NexusOS/.nexus/contexts/Projects/Pommora/_tiles.json` into `~/NexusOS-Backup-<MM-DD-YYYY>/` (the conversion's date, a folder beside NexusOS outside every Nexus, so it survives across sessions and is never read as content) before its first write; it builds its label → id map from the property list as read, keeping each option's stored id where one is present (an app open between P8 landing and the conversion may already have stored derived ids) and minting through `mintOptionId()` only where none is stored, across all 59 options (Status 8, Tags 3, Brand 20, Concern 5, Scale 5, Color 12, Version 6), strips `group_id` from Status's 8; switches the Ideas views' `group.order`, `sort[Status].order`, and `collapsed_groups`, the homepage tile 0's two views' sort orders and filters, and the Pommora tile 2's sort order and collapses to ids; scopes collapsed Status labels to `prop_01KWG2FPV0VP0D2W6BR5EK485P/<optId>`; keeps Set ids; drops lowercase `open` and `closed`. It verifies the result against *Walkthrough §Your Data*, runs twice without changing anything the second time, and is deleted; the backup folder is removed by its path at Final Verification's closeout, after the full drive on the final head.
8. **The Generator:** `.claude/scripts/make-benchmark-nexus.mjs:169` writes option ids and no `group_id`; the Metadata Drive (`live-drive.mjs:179-180,876`) stops writing `group_id`.

**Order:** 1, 2, 3, 4, 5, 6, then 8, then 7 inside the checkpoint.

**Behavior Changes:** an option rename stops rewriting views, tiles, the Matrix filter, and preview rules (D-1); collapsed groups are remembered per property (D-2); deleting the property a view groups by keeps folder collapses (K-1); Status options stop writing `group_id` (D-3); view JSON shows `opt_…` where it showed words — each Nathan's intent. NexusOS's Pommora tile keeps its Status collapses scoped to Status, with `open` and `closed` dropped (Morning Question 9; LC-40).

**Consumers:** `properties.ts`, `ids.ts`, `optionModel.ts`, `optionOps.ts`, `propertyValue.ts`, `findOption`'s and `optionLabels`' readers, `group.ts`, `sort.ts`, `filter.ts`, `configReach.ts`, `useOptionEdit.tsx`, `views.ts`, `useViewHost.ts`, `viewRow.ts`, `GroupBand.tsx:130`, `bandModel.ts:181`, `TableView.tsx:447`, `Core/Testing/`, the generator, the Metadata Drive.

**Tests:** **Deleted:** about 160 lines of `OptionEditor.test.tsx:267-448`'s re-keying tests (keeping one refused-rename field reversion), `optionOps.test.ts:245-276`, `configReach.test.ts:157-252`'s rename block. **Rewritten:** every fixture holding `group_id` (about 100 occurrences across 28 test files) drops it; option fixtures carry ids. **Written:** a derived id for an id-less option is stable and stored on the next registry write; an option rename leaves a view's sort order untouched; collapsing "Done" under Status doesn't collapse a "Done" under another property; a grouped property's delete keeps a Set id collapse.

**Drive:** Properties Drive group 7: on `~/Test`, create a Select with options, sort and group a view by it, rename an option, and the view keeps its order and collapses while pages holding the word are rewritten; the view sidecar names `opt_` ids.

**Delta:** about −85 (−70 to −100).

**Depends On:** P2 (Title as text), P7 (O-1's renames before the id retype).

**Risks:** about 20 reader files plus the conversion; the head is shippable only once the conversion has run against NexusOS and the generator writes ids, both inside the checkpoint.

`[Compaction checkpoint: c/pre-compaction; on the re-prompt, re-read §Constraints and c/plan-execution before P9 opens]`

##### P9 — List First and One Replay Point

**GOAL:** Property delete, option delete, and Context rename update the list before the files, so the registry-last windows, the Context rename's reverse path, and the replay's crashed-or-freed guessing leave. Both open-time replays run once, after the content index is seeded, each under its own catch, so a replay that throws stops failing the open halfway.

**Units:** N1 (B-2, 04-07, 04 A-01), R's H-8, H-9, H-10.

**Binding Design:**
1. **Property Delete** (`Core/Properties/deleteProperty.ts:112-161`): bundle → note → `removeFromRegistry` → strip pages, Space sidecars, Collection sidecars, views. A value write after the list moves can't resolve the deleted key, closing 04 A-01's window. `replaySchemaCascade.ts:52-56`'s `crashed`/`freed` split leaves: a delete record beside a present definition means the list step hadn't landed, and the replay lands it first.
2. **Option Delete** (`optionOps.ts:367-386`): note → `dropOptionFromDef` → strip pages and stash → views. `owedKeys` (`optionOps.ts:79-84`) widens to every owed option key, rename and remove, read by `registerHeldOptions` and the adoption filter (`fileEvents.ts:528`), so an unreached page doesn't re-register a deleted word.
3. **Context Rename** (`contextCascade.ts:194-246`): note → `commitTitle` → `relocate` → cascade. A live relocate failure reverts `commitTitle` in the op and clears the note (one registry write, no file touched, the shape of `addProperty`'s rollback); a failed revert leaves the note for the replay. The reverse rename under a second record (`:231-242`) leaves. The `'merge'` collision rule (`:32-33`) stays, its comment rewritten to its reason: both sides of a collision are real tags, and the app's own tag writes run under the Contexts lock the rename holds.
4. **Space Rename** (`:248-288`): unchanged order (note → relocate → cascade), since a Space's folder is its list entry.
5. **One Replay Point** (`Core/Nexus/handlers.ts`): `replayPendingRename(root)` leaves `:86` and runs in the genuine-open block after `seedContentIndex`, `oweSeen`, and `sweepFileHistory`, beside `replaySchemaCascade`; each is wrapped in a catch that logs, so a throw leaves the walk and seed already done. Its sweep reads `queryMembers` from the seeded index; an entry owing a folder relocation calls `oweWalk(root)` (`fileEvents.ts:141-143`), which the `settleNow` at `:112` pays. Re-points run no replay.

**Order:** 5, then 1, 2, 3 (each atomic per op on today's two slot files).

**Behavior Changes:** none visible in ordinary use. A Context whose folder can't move refuses with nothing renamed, as today; an open whose Context replay throws completes instead of skipping its walk and seed (an accident fixed; LC-48).

**Consumers:** `deleteProperty.ts`, `optionOps.ts`, `fileEvents.ts`, `contextCascade.ts`, `replaySchemaCascade.ts`, `Nexus/handlers.ts`.

**Tests:** **Rewritten:** the commit-order and replay tests in `replaySchemaCascade.test.ts`, `journalWiring.test.ts`, `contextCascade.test.ts`, and `cascadeRace.test.ts` for the three ops' new orders, on today's slots. **Written:** a crash after a delete's note and before its list step replays to a removed definition; a Context rename whose relocate fails leaves the list, the folder, and every page as they were; a throwing Context replay doesn't stop the open's seed.

**Drive:** no new surface; Properties Drive groups 1–7 re-run green.

**Delta:** about −50 (−40 to −60).

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
   export type Holders = { pages: string[]; spaces: string[]; partial: boolean; values?: ReadonlyMap<string, Record<string, unknown>> }
   export function findHolders(root: string, q: HolderQuery, read?: 'values'): Promise<Holders>
   ```
   Pages come from `queryKeyHolders`/`queryMembers` (corpus fallback before the index is ready), filtered by reach (`governed` is Collections plus the Archive; `{ collection }` one Collection and its Archive; `anywhere` every page); Space sidecar paths come from the tree, `SpaceNode.values` for property keys and the new `SpaceNode.contextKeys` for Context keys, each rebased under `moved`. With `read: 'values'`, it answers which keys each candidate holds and its values by id in the same pass (S4), serving the rename clash (which checks `to` only on `from` holders), the delete snapshot, and counts.
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

**Delta:** about −65 (−55 to −75; the `SpaceNode` field's +3 to +6 inside).

**Depends On:** P9 (the post-seed replay the tree-sourced finder needs).

**Risks:** an outside Space edit not yet settled is missed until it settles, as pages already are.

`[Compaction checkpoint: c/pre-compaction before the plan's heaviest phase; on the re-prompt, re-read §Constraints, c/plan-execution, and this document's §P11 before P11 opens]`

##### P11 — One Note per Item

**GOAL:** Every property, Context, and Space keeps its own entry in one device-local notes file, so unfinished work on one never blocks or unprotects another, and every many-file change writes its note first and refuses if it can't. Every delete finishes what it can and offers one Try Again that finishes everything owed, a name still owed to unfinished work is refused, and Remove writes its note so a partial Remove can be retried.

**Units:** N2 (B-1, B-3, B-4), N3 (03-03/04-13, C-2's retry), R's H-0 to H-18, F-1 to F-7, Approach C's runner check, I-036, I-039.

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
   export function editNote(root: string, id: string, edit: (e: Entry | undefined) => Entry | undefined): Promise<boolean>
   export function owedNames(notes: Notes, kind: Entry['kind'], except?: string): ReadonlySet<string>
   export function finishOwed(root: string): Promise<CascadeReport>
   export const owedRename: (o: Owed, from: string, to: string) => Owed
   export const owedDelete: (o: Owed, current: string) => Owed
   export const owedClear: (o: Owed) => Owed
   export const owedRestore: (o: Owed) => Owed
   ```
   Entries key by entity id (`prop_…` and Context and Space ULIDs share no namespace), and option parts key by option id. `readNotes` reads through `readAppFile`; `editNote` writes through `updateNexusFile(abs(OWED_REL), …, true)`, answering `false` when the file can't be written. The four compose rules are one-liners: `owedRename` appends the old name to `rename` and drops the new one; `owedDelete` moves `rename` plus the current name into `strip`; `owedClear` moves an option's `rename` into its `strip` (H-2); `owedRestore` moves `strip` back into `rename` (H-4). Renaming back composes to nothing owed. An entry clears only whole (H-1).
2. **The File:** `OWED_REL = \`${NEXUS_DIR}/.owed.json\`` in `Core/Paths/nexusPaths.ts`; the four journal constants (`:27-30`) and `exclusion.ts:58` with its imports leave. `journalSlot.ts`, `propertyJournal.ts`, `contextJournal.ts`, and `replaySchemaCascade.ts` are deleted, and `replayPendingRename` (`contextCascade.ts:290-352`) leaves.
3. **Every Op Writes Its Note First (F-5):** `rekeyProperty` (rename, Label Format), `deleteInner` (after the bundle mints, H-5's residual order), `rekeyOptions` (option rename, Value Format), `deleteOption`, `unassignProperty` (`unassigned: [collectionId]`), `renameContextOp`, `renameSpaceOp`, and the Context and Space deletes (`bundle` in Pommora Trash mode, omitted in System Trash mode). `editNote` answering `false` refuses the op with nothing changed. Option Clear writes no note and composes only when the option already owes old names. The `OWED` refusals (`optionOps.ts:242,377,346-348`) and every discarded-`false` path (`registryProperty.ts:183`, `deleteProperty.ts:123`, `contextCascade.ts:217,277`) leave.
4. **Replay** (`finishOwed`): one pass under H-12's lock order — Context entries first under the Contexts lock, then Space entries, then property entries under the schema lock, the notes file's own lock innermost and never nested — each entry under a catch that logs. Inside an entry: `rename` → `options` → `unassigned` → `strip` (H-1). A Space entry stays while its parent Context owes a rename; a Space entry whose parent Context is owed a delete or is gone drops. Each arm re-derives per name from the current lists, skipping a name a live entity holds now (H-16). A Context or Space arm that relocates a folder calls `oweWalk(root)` and its cascade passes the finder `moved`; one whose current name sits in `strip` lands the list step first, moving the folder into `bundle` or to the system Trash (H-5). `NO_REACH` clearing a record on any unmapped state (`replaySchemaCascade.ts:29`) leaves with the file.
5. **The Open:** P9's two replay calls become one `await finishOwed(root)` in the genuine-open block after the seed, before `settleNow` (`handlers.ts:111-112`).
6. **Try Again (H-17, F-6):** `{ op: 'finishOwed' }` joins `mutate`'s union and runs `finishOwed(root)` outside `dispatch`'s per-op locks, taking each lock itself. `CascadeReport` gains `owed?: true`, set when an op's entry stays; the slice's `mutate` offers `warnCascade(cascade, cascade.owed ? () => void get().mutate({ op: 'finishOwed' }) : undefined)`, and an `'owed'` refusal offers the same. `MutateOutcome.retry`, the `replayProperty` op, `SchemaCascade`, `journalRecord`, `renamed`'s retry (`mutate.ts:68-77`), `sweepAgain`, the `from` branches (`contextCascade.ts:101-109,206-211,260-264`), and `Unswept` leave.
7. **Restores (H-4, F-3):** property, Context, and Space restores run create → `owedRestore` → spend the bundle. `createProperty`'s delete-record consumption (`registryProperty.ts:94-100`) leaves.
8. **The Owed-Name Refusal (B-4, H-14, F-1, F-2):** `createProperty`, `rekeyPlan` (rename and Label Format), Context create and rename, and Space create and rename refuse a name in `owedNames(notes, kind, ownId)` with code `'owed'` and the general message "An earlier change hasn't reached every file yet." (`optionOps.ts:45`'s text, moved into `owed.ts`). An entity's own names never refuse it. A restore runs through create and is refused the same way. `freeLabel`'s `owed` parameter leaves.
9. **Option Names (H-7):** `owedKeys` becomes the property entry's option `rename` and `strip` names, read by `registerHeldOptions`, `editOption`'s add and relabel, `renameOption`, and `setValueFormat`, each refusing a landing on another option's owed name.
10. **Deletes Finish (B-3):** Context and Space deletes run bundle → note → list or folder → files, and a miss leaves the entry owed with Try Again. `unlinkMembers`' undo-and-throw (`contextCascade.ts:166-181`), the Context put-back and unmint (`Core/Trash/delete.ts:122-135`), and the second record writes (`delete.ts:115,137`) leave; `undoSweep` leaves with its only caller, and `keysPutBack` stays as P6's one put-back.
11. **Up-Front Capture (H-11, F-4):** property, Context, and Space deletes capture their holders' values before the sweep through `findHolders(…, 'values')`: from the page file when it's readable, from `readPageRelations`' values when it isn't. `SweepCapture`, `UnlinkOutcome`, `captureRoot`, and the capture closures (`contextCascade.ts:51-57,80-84,134-143,151-163`) leave.
12. **Remove (N3):** `unassignProperty` writes its note, then its one sidecar write, then `reachConfig`, then the strip; it answers `cascade.owed` when anything skipped or a holder is ID-less, duplicate-ID, or refused (S's partial reading; LC-19). The three `PropertyFrame.tsx` sites (`:255-257,280,302-306`) return to the list on a landed reply, owed or not. The `unassigned` arm re-runs read → stash → strip for each Collection still not assigning the property and drops a Collection that assigns it again (F-7, H-6); a global delete subsumes it (H-3).
13. **Locks:** `createContextGroup` runs under `underContexts` (H-13, `mutate.ts:224-227`).
14. **The Purge Check (H-18):** `unassignAndPurge` (`deleteProperty.ts:163-172`) answers `written.ok`, and `stripAndRemove` counts a failure as a skip, keeping the entry owed.
15. **The Runner Check:** *§Measurement Rules › Runner*.

**Order:** 1 and 2; then 3 with 6 (every op and its reply move together); 4 and 5; 7; 8 and 9; 10 and 11; 12; 13; 14; 15.

**Behavior Changes:** each change writes its own note, so one property's unfinished rename never blocks or unprotects another (B-1, Nathan's intent); option renames, format changes, option deletes, and Clear stop being refused because some property owes work (LC-45); Context and Space deletes that miss pages finish and offer Try Again (B-3); a name still owed is refused with Try Again (B-4; LC-7, LC-8, LC-9); a change whose note can't be written refuses (LC-12); one Try Again finishes everything owed (LC-6); a Trash entry for a partial delete holds the unreached pages' values (LC-10); re-adding a removed property cancels what its Remove still owed there (LC-18); a Remove that missed pages returns to the list with Try Again (C-2, Nathan's intent).

**Consumers:** every multi-file op in `registryProperty.ts`, `deleteProperty.ts`, `optionOps.ts`, `unassignProperty.ts`, `contextCascade.ts`, `Core/Trash/delete.ts`, `Core/Trash/gather.ts`, `restoreProperty.ts`, `spend.ts`; `mutate.ts`, `mutateRequest.ts`, `nexusSlice.ts`, `notifications.ts`, `PropertyFrame.tsx`, `useOptionEdit.tsx`, `Nexus/handlers.ts`, `nexusPaths.ts`, `exclusion.ts`, `cascade.ts`.

**Tests:** **Deleted:** the one-slot pins (09-10's about −150 across four files, `journalWiring.test.ts:274-319`, `optionOps.test.ts:707`), `propertyJournal.test.ts`, `contextJournal.test.ts`. **Rewritten:** `journalWiring.test.ts`, `replaySchemaCascade.test.ts` (as `owed.test.ts`), `cascadeRace.test.ts`, and `contextCascade.test.ts`'s journal parts against keyed entries (about 2,300 lines touch them; about −250 leave). **Written:** the four compose rules and `a→b→a` composing to nothing; H-1's entry kept while its rename is owed and the Context-before-Space order; H-2's clear under an owed rename; H-4's restore turning `strip` into `rename`; H-5's crash between note and list for each kind; H-14's refusals across the five sites; an unwritable notes file refusing every op; the index capture's value round-trip for one value of every type.

**Drive:** Properties Drive group 9: on `~/Test`, with one page made unreadable (`chmod 000`), rename a property and see "Couldn’t update 1 Item" with Try Again; rename a second property and see no refusal; create a property under the first's old name and see the owed refusal; restore the page's mode, press Try Again, and both renames finish and the name frees. The drive restores every mode and file it touched.

**Delta:** about −135 (−85 to −185; the keyed entries, arms, and refusals' +190 to +250 inside).

**Depends On:** P6 (`keysPutBack`), P8 (option ids), P9 (orders), P10 (the finder and its capture).

**Risks:** crash-order semantics move for every op; P9 having taken the orders is what keeps this inside one context. The index capture's fallback covers a value type the index doesn't round-trip.

##### P12 — The Stash and Trash Records

**GOAL:** The stash stays in the Collection's settings file, records when each property's values were removed, and ages them out after the History Timeframe on the cleanup's two existing triggers. Re-adding a property drops entries for pages that left, parks a trashed page's value in its Trash copy, and surfaces any page it couldn't refill with Try Again; a restored property gets its stash back in the right order. A partial Trash entry shows its mark, and its restore says it may not hold everything.

**Units:** C1 (C-2), C2 (C-3), C3 (N-1), C4 (N-2's describer, in P18), S's flags 3–10, the Archive restore's double report.

**Binding Design:**
1. **One Vocabulary (LC-3):** `property_cache` → `property_stash` on disk; `Core/Properties/propertyCache.ts` → `Core/Properties/propertyStash.ts`; `cachedValues` → `stashedBlock`; `patchCacheBlock` → `patchStashBlock`; `editCacheBlocks`/`editCaches` → `editStashBlocks`/`editStashes`; `CollectionNode.cached` → `stashed`; `containerFields.ts`'s `cachedIds` → `stashedIds`; the record's `caches` → `stashes`.
2. **The Block:** `type StashBlock = { removed_at: string; values: Record<string, unknown> }` (decoded loose, a missing stamp answering the sweep's first-sight stamp); on disk `property_stash.<propertyId>: { removed_at: "<ISO-8601>", values: { <pageId>: raw } }`. `stashedBlock(sidecar, propertyId): StashBlock | null` is the one reader. `patchStashBlock(sidecar, propertyId, values?: Record<string, unknown>, removedAt?: string)` writes `{ removed_at: removedAt ?? <the block's current stamp>, values }` for non-empty values and removes the block (and an emptied `property_stash`) otherwise, folding the three hand-built `{ values: x }` spellings (`removeProperty.ts:55`, `assignment.ts:104`, `propertyCache.ts:44-47`).
3. **Who Stamps:** Remove and its retry pass `new Date().toISOString()`; the refill, option edits and Link re-spells (`editStashes`), and the purge pass none, keeping the found stamp. `editStashes`' callback gains a third argument, the block's `removed_at`.
4. **The Age Cleanup:**
   ```ts
   export async function sweepStashes(root: string): Promise<void> {
     const collections = heldTreeOf(root)?.collections ?? []
     const cutoff = Date.now() - (await readFileHistoryConfig(root)).keepMs
     await editStashes(root, collections, new Set(collections.flatMap((c) => c.stashed ?? [])), (_values, _id, removedAt) =>
       Date.parse(removedAt ?? '') < cutoff ? {} : null,
     )
   }
   ```
   in `propertyStash.ts`, called as `void sweepStashes(root)` beside `void sweepFileHistory(root)` at `Core/Nexus/handlers.ts:110` and inside the `historyDays || archiveHistoryDays` branch at `Core/Settings/handlers.ts:46`, logging and swallowing errors as `sweepFileHistory` does. A Nexus with no stash reads zero files; a sidecar is written only when a block expired or carried no stamp; a block without a readable stamp is stamped now on first sight and ages from then, the pattern P8 sets for an id-less option.
5. **The Refill** (`assignment.ts`'s `restoreCachedValues` becomes `refillStash`): after the refill, the block keeps only ids still owed to a page of this Collection, `(members ∪ trashed) − spent − gone`, passing no stamp. When some stashed id is absent from `byId`, `trashedHolders` (exported from `Core/Trash/trashedCopies.ts`, filtered to page and Set bundles whose `collectionOf(originOf(record))` is this Collection; Collection bundles never qualify) supplies those pages' Trash copies as extra roots to `refillValues`, so one reconcile, encode, and blank-check writes every copy; `sweepRootsById`'s `roots` type narrows to `ReadonlyMap<string, Pick<EntityRecord, 'kind' | 'path'> | null>`.
6. **Refill Skips Surface (LC-5):** `refillValues` answers `{ spent: ReadonlySet<string>; skipped: number }`; `refillStash` answers its skipped count; `assignInner` answers `Result<{ skipped: number }>`; `assignProperty` replies `cascade.owed` and writes `refill: [collectionId]` into the property's entry (`PropertyEntry` gains `refill?: string[]`), and `finishOwed`'s property arm re-runs `refillStash` for each listed Collection still assigning the property, dropping it when nothing skipped. Inside the entry it runs after `unassigned` and before `strip` (H-1's order becomes `rename` → `options` → `unassigned` → `refill` → `strip`), and `owedDelete` drops it, since a delete purges every Collection's block (H-3).
7. **The Trash Record:** `snapshot` captures each Collection's block whole into `stashes` (`deleteProperty.ts:61-72`); `record.ts:79` becomes `stashes: z.record(z.string(), z.object({ removed_at: z.string(), values: z.record(z.string(), z.unknown()) })).optional()`. `restoreProperty` writes each recorded block whole with its stamp minus the ids `record.values` holds, then runs the `assignInner` loop, then the `record.values` refill (LC-26).
8. **Collections in the Trash:** a global delete leaves them untouched (LC-2); a restored Collection's inert assignment id stays (LC-4).
9. **The Partial Mark (N-1, LC-37):** `BundleRow` gains `partial?: true` from `record.partial` in both of `bundleRowOf`'s branches (`Core/Bundles/rows.ts:83-125`); `TrashRowView` (`Core/Settings/TrashFrame.tsx:123-170`) shows a warning glyph with the spoken label "Recorded Partly" in its trailing slot. A partial restore adds `“${title}” was recorded partly, so some of what it held may not come back.` to `cascade.warning`.
10. **One Restore Report:** `browser.ts:277-282`'s `notifyOutcome` stops passing `unrestoredLine` and `cascade.warning`, which the slice's `mutate` already shows (LC-46).

**Order:** 1, 2, 3, 7, 5, 6, 4, 8 (nothing to build), 9, 10.

**Behavior Changes:** stash entries age out after the History Timeframe (C-3, Nathan's intent; LC-26, LC-27); re-adding a property drops entries for pages that left and parks a trashed page's value in its Trash copy (C-2, Nathan's intent; LC-36); a re-add that couldn't refill a page offers Try Again (LC-5); restoring a deleted property refills its stash (C-2); a partial Trash entry shows its mark and its restore says so (N-1); the Archive restore stops repeating its report lines (LC-46).

**Consumers:** `propertyStash.ts`, `unassignProperty.ts`, `assignment.ts`, `deleteProperty.ts`, `restoreProperty.ts`, `record.ts`, `optionOps.ts` and `cascade.ts` (renames only), `containerFields.ts`, `tree.ts`, `trashedCopies.ts`, `governedSweep.ts`, both trigger sites, `owed.ts`, `rows.ts`, `TrashFrame.tsx`, `ArchiveView.tsx:228` (same row type), `browser.ts`, `notifications.ts`.

**Tests:** **Rewritten:** the stash arms in `cascade.test.ts:855-936`, `configReach.test.ts:131-270`, `fileEvents.test.ts:1314`, `treeIndex.test.ts`, `assignment.test.ts:72`, `deleteProperty.test.ts:124-145`, `optionOps.test.ts:1008-1355`, `removeProperty.test.ts:88` (renamed `unassignProperty.test.ts`), `value.test.ts`, and `trashRecovery.test.ts:787`, re-seeded with the block shape. **Written:** Remove stamps and every other writer keeps the stamp; `sweepStashes` drops only expired blocks and opens no sidecar without `stashed`; owed-only `left`; Trash copies by origin only; a page in both a block and `record.values` takes the delete-time value and isn't reported unrestored; a refill skip leaves the entry owed and Try Again refills; the partial row mark and restore line.

**Drive:** Properties Drive group 10: on `~/Test`, remove a property from Collection A, trash one page, re-add the property, restore the page, and it holds its value; set `.nexus/settings.json`'s `historyDays` to 7 with a block's `removed_at` backdated eight days, and reopening drops the block. A Trash row for a partial record shows its mark.

**Delta:** about **+37** (+30 to +45) — the plan's one net-positive phase. C-3's stamp and cleanup (about +15) and C-2's stale drop and Trash parking (about +11) deliver ruled behavior in minimal form on existing mechanisms (`editStashes`, `refillValues`, `trashedHolders`, `readFileHistoryConfig`, the two triggers) with no new pass, module, or Sync rule; the refill-skip arm (about +8) and the partial mark (about +8) fix a silent loss and deliver N-1; the block literals' fold and the double report's fold remove what they replace.

**Depends On:** P11 (the notes entry Remove and the refill ride).

**Risks:** the sweep is a new writer of synced sidecars (*§Sync Rebuild Inputs*); a block that expires mid-session can still refill until the next trigger, as expired file history stays viewable.

`[Mid-Plan Neutral Gate: one fable-high agent over BASELINE..<P12's head>, given only the two heads and §Neutral Gate Intention Statements › Mid-Plan; re-run after each fold until it answers yes. The data layer is complete here: values, definitions, undo, operations, options, crash recovery, reach, the stash.]`

`[Compaction checkpoint: c/pre-compaction; on the re-prompt, re-read §Constraints and c/plan-execution before P13 opens]`

##### P13 — Columns Carry Their Answer

**GOAL:** A view resolves each column's type and definition once and hands it to every filter, sort, group, and cell, so the per-cell schema scans and the scattered optional Context-id defaults leave. New views stop storing a redundant hidden list, view hosts own one style map, and a text cell opens one subscription where it opened three.

**Units:** W1 (07-01, 02-13, 06-08's lookup half), W3 (07-02, 07-08, 07-09, 07-14, 07-16), W5 (06-08's heading-settings half, 02-12's outcome), 07-17.

**Binding Design:**
1. **Compiled Columns:** `resolveColumns(view, schema, contextIds)` (`Core/Views/Pipeline/columns.ts:37-46`) takes `contextIds` as required and returns `ResolvedColumn = { id: string; kind: ColumnKind; type: ColumnType; def?: PropertyDefinition }` (`Core/Views/viewRow.ts`); the hand-built `ResolvedColumn`s (`resolveView.ts`, `VisibilityFrame.tsx`) resolve through it. One compiled `fieldOf(column): (row: ViewRow) => PropertyValue` per column per view pass serves `prepareRule`, `buildCriterion`, and grouping. `columnType`, `resolveFieldValue`'s `schema.find` before its memo, `Cell.tsx:45`'s re-scan, the 23 `declaredType(` calls (each reads `column.type`), and the 19 optional `contextIds` defaults leave.
2. **Smaller Folds (W3):** a new view mints `hidden_properties: []` and the mints drop their `schema` parameter (`ViewFrame.tsx:80`, `ViewTile.tsx:71,359`, `tilesFile.ts:84`, `create.ts:66`, `pickView.ts:16`), retiring `pickView`'s WeakMap — the `property_order` allowlist already hides everything else, so a new view still shows Title only; view hosts own one memoized style map and `useStyleFor` leaves (its readers `PropertyFrame.tsx`, `FilterFrame.tsx` read the map); `patchedValues` is shared by `withSeeds` and `assignValue`; `commitHide` calls `hideShown`; `TypeSpec.groups` becomes `'option' | 'date'`, declaring the date family once.
3. **Heading Settings (W5):** the two heading settings ride `ValueContext` (`Core/Properties/valueContext.ts`), giving `buildValueContext` its job; `TextCell.tsx:31-34`'s three store subscriptions become one context read, and `LinkCell.tsx:40-41` reads the same.
4. **07-17:** *§Measurement Rules › 07-17*.

**Order:** 1, 3, 2, 4.

**Behavior Changes:** none. New views keep the Title-only start (Morning Question 6; LC-38).

**Consumers:** `columns.ts`, `resolveView.ts`, `VisibilityFrame.tsx`, `fieldValue.ts`, `filter.ts`, `sort.ts`, `group.ts`, `Cell.tsx`, `CardValue.tsx`, `CardsView.tsx`, `TableView.tsx`, `declaredType(`'s 14 files, the `contextIds` default sites, the six mint sites, `useColumnStyles.ts`, `valueContext.ts`, `TextCell.tsx`, `LinkCell.tsx`, `GroupFrame.tsx`.

**Tests:** **Rewritten:** column and pipeline tests construct columns through `resolveColumns`; `mintNewView` tests pin `hidden_properties: []` with a Title-only render. **Kept:** `valueContext.test.ts`, which now pins the heading settings.

**Drive:** Properties Drive group 11: a new view shows only Title; revealing a property shows it; a Table with Text, Link, and Select columns renders and edits as before.

**Delta:** about −120 (−100 to −140).

**Depends On:** P2 (`ColumnType`), P8 (option ids in the compiled field).

**Risks:** `TableView.tsx` and `CardsView.tsx` read columns on the render path; the compiled `fieldOf` is built once per pass, never per cell.

##### P14 — The Per-Kind View Record

**GOAL:** One renderer-free record keyed by value kind states each kind's filter operators, operand compile, sort keys, and buckets, replacing about fifteen switches and two text projections. An unreadable filter value is ignored, a Checkbox's "is not empty" works, and empty values sort last for every type; the view pipeline's per-edit cost and the Matrix filter's cost are measured at Benchmark scale and settle Approach K and 07-10 by rule.

**Units:** W4 (Approach H, 07-11, K-1, K-2), W2 (07-04), the K and 07-10 measurements.

**Binding Design:**
1. **The Record** (new `Core/Views/viewKinds.ts`, a renderer-free `.ts`, since host-side `configReach.ts` reads the operand class):
   ```ts
   export type ViewKind = {
     ops: readonly FilterOp[]
     operand: 'none' | 'text' | 'number' | 'date' | 'options' | 'checkbox'
     prepare(op: FilterOp, operand: unknown): ((v: PropertyValue) => boolean) | 'abstain'
     sortKey(v: PropertyValue): string | number | null
     bucket?(v: PropertyValue, granularity?: Granularity): string | null
   }
   export const VIEW_KINDS: Readonly<Record<ValueKind, ViewKind>>
   ```
   It replaces `filter.ts`'s per-kind evaluators, `sort.ts:36-73`'s per-kind keys, `group.ts`'s bucket arms, `filterModel.ts`'s `KIND_OPS`, `creationSeeds.ts`'s `SEEDS_FROM_SORT`, `reassign.ts`'s `FROM_GROUP_KEY`, and `configReach.ts`'s whole-option operand class (07-11).
2. **One Shown Text (W2):** `shownText(value: PropertyValue, def?: PropertyDefinition): string` in `formatValue.ts` replaces `filter.ts`'s `textValue` and `sort.ts`'s `sortText`, mapping option ids to labels.
3. **K-1:** `prepare` parses its operand once per pass and answers `'abstain'` when it doesn't read or the op doesn't apply (today `true` at `filter.ts:165-166,181,195,224,236,240,266,287,299`), riding `prepareRule`'s existing abstain (`filter.ts:60,69-85`); Checkbox's `isNotEmpty` answers `v.kind === 'checkbox'`; `filterSeeds` (`creationSeeds.ts:75-103`) seeds nothing from an abstaining rule.
4. **K-2:** a `null` sort key sorts last in either direction, for every kind; dragging a row into another value's run in a sorted view keeps reassigning (`useViewHost.ts:75,109-119,199-209`).
5. **Measurements:** *§Measurement Rules › K* and *› 07-10*.

**Order:** 2, 1, 3, 4, 5.

**Behavior Changes:** an unreadable filter value is ignored, which also changes which values a new page created in that view inherits (K-1, Nathan's intent); Checkbox "is not empty" works (K-1); empty values sort last for every type in both directions (K-2, a reading Nathan didn't object to).

**Consumers:** `filter.ts`, `sort.ts`, `group.ts`, `filterModel.ts`, `creationSeeds.ts`, `reassign.ts`, `configReach.ts`, `formatValue.ts`, `FilterFrame.tsx`.

**Tests:** **Rewritten:** the per-kind filter, sort, and group tests against `VIEW_KINDS`. **Written:** a Number rule holding letters abstains, and inside an "Any" group the group no longer matches every page; Checkbox "is not empty"; an empty value sorts last ascending and descending for each kind.

**Drive:** Properties Drive group 12: a Number filter holding "abc" inside an Any group leaves the other rule deciding; a Checkbox "is not empty" filter shows only checked pages; a Select sort puts empty rows last in both directions.

**Measurements:** K and 07-10 on `~/Benchmark-Large`.

**Delta:** about −115 (−90 to −140; the record's +150 inside).

**Depends On:** P13 (compiled columns), P2, P8.

**Risks:** a behavior phase; each kind's old switch is deleted only once its record entry's tests pass.

`[Compaction checkpoint: c/pre-compaction; on the re-prompt, re-read §Constraints and c/plan-execution before P15 opens]`

##### P15 — Pick Model and One Row Menu

**GOAL:** Picking a value is one pure model for one row and many, the writer is assembled one way, and the Properties panel's right-click is built from the same menu pieces the table and cards use. The filter's date picker opens the value's picker on the column's clock, and the text pen reads "Open In Editor".

**Units:** X1 (06-04, 06-05), X2 (06-06, J-3, J-10, B-06-01), X3 (J-1's clock, 06-09/L-15), X4 (J-4, J-5's comment), X5 (06-11, 06-12), 02-10.

**Binding Design:**
1. **The Pick Model** (new `Core/Properties/Pickers/pickModel.ts`, pure): `pickGroups`, `pickShape`, `toggleValue`, the N-row rule (today's `massAssign.ts:13-18`), and `pickedValue` as its one-row case; `Core/Properties/Pickers/massAssign.ts` merges in and is deleted, and `MassPropertyPicker.tsx` reads the model.
2. **One Writer:** `useValueWriter(host)` and `oneShotWriter(...)` replace `ValueWriter`'s three assemblies (`Core/Interface/Menus/entityMenuActions.ts`, `PropertyPanel.tsx`, `useViewHost.ts`), built on P6's reshaped writer.
3. **One Row Menu:** the panel label's right-click and every panel value build from `cellMenuModel`'s kinds (`link`, `text`, `file`, and `bare` with `clearable: filled, hideable: true`, `Core/Actions/cellMenu.ts:26`) mapped through `valueMenuIntent` (`Core/Properties/Pickers/valueClick.ts:58-59`). `propertyMenu.ts`'s `page-value` kind and its three `value:*` actions, `rowMenu`'s hand mapping (`PropertyPanel.tsx:319-331`), and `fileValueMenu` (`Core/Properties/Pickers/filePick.ts:115-125`, one caller) leave. A Link row's label gains Edit and Rename (J-3); the panel's File value gains Remove and no Clear (J-10). Both link menus read **Rename** then **Edit Link** (**Edit Title** where the connection menu edits a page link's title): `cellMenuModel`'s link kind (`cellMenu.ts:126-131`) moves from "Edit, Rename" to that order and wording, matching `connectionMenu.ts:81-102`.
4. **The Filter's Clock (X3):** `FilterFrame.tsx:351-371`'s hand-built `CalendarPicker` is replaced by `DateTimeValuePicker` with the operand as a `dateTime` value, on the column's `time_format`.
5. **Small Ones (X4, X5):** `Core/Properties/Cells/TextCell.tsx:89`'s aria-label reads "Open In Editor" and `.claude/scripts/drive-harness.mjs:282`'s `PEN` selector follows (the Text Property Drive reads it); `PropertyPanel.tsx:151`'s `KNOB` comment leaves (J-5's behavior stays); `propertyMenuBranches` moves to `Core/Actions/propertyRows.ts`; `Core/Views/Cards/cardValueInput.ts` becomes `cardColumns.ts`; `valueField.tsx` is renamed for its one export.
6. **The Missing-Id Fallbacks:** `useViewHost.ts:212` and `propertyMenuActions.ts:96` fall to a Context definition only for a Context id.
7. **Measurement:** *§Measurement Rules › 02-10*.

**Order:** 1, 2, 3, 4, 5, 6, 7.

**Behavior Changes:** a Link row's label right-click gains Edit and Rename (J-3); the panel's File value gains Remove (J-10; Morning Question 15, LC-15); the two link menus share one order and wording (J-10; LC-47); the filter's date picker uses the column's clock (J-1); VoiceOver reads "Open In Editor" (J-4) — each Nathan's intent.

**Consumers:** `massAssign.ts`, `MassPropertyPicker.tsx`, `PropertyPicker.tsx`, `entityMenuActions.ts`, `PropertyPanel.tsx`, `useViewHost.ts`, `assignValue.ts`, `propertyMenu.ts`, `cellMenu.ts`, `filePick.ts`, `valueClick.ts`, `connectionMenu.ts`, `FilterFrame.tsx`, `DateTimeValuePicker.tsx`, `TextCell.tsx`, `drive-harness.mjs`, the Text Property Drive (`live-drive.mjs:279,287,292,365`).

**Tests:** **Rewritten:** `massAssign` and `pickedValue` tests merge on the model; `propertyMenu.test.ts`'s `page-value` cases and the panel menu tests against `cellMenuModel`; `cellMenu.test.ts`'s link order. **Collapsed:** the two duplicate editor pairs (06-15). **Written:** the panel File value offers Remove and no Clear; a filter date picker on a 24-hour column under a 12-hour Nexus shows 24-hour times.

**Drive:** Properties Drive group 13: right-clicking a Link row's label in the panel offers Edit and Rename; right-clicking a File value offers Remove; a filter's date picker opens the value's picker. The Text Property Drive runs on the new pen label.

**Measurements:** 02-10 on `~/Benchmark-Large`.

**Delta:** about −135 (−115 to −155).

**Depends On:** P6 (the writer), P13.

**Risks:** the panel's right-click chain changes shape; the drive group exercises every row kind.

##### P16 — One Value Seat

**GOAL:** Clicking, right-clicking, and editing a value is one shared seat for the table, cards, and panel, with the native menu's fourth router folded into it, and a Context column reaches the pickers without a fabricated definition. The panel's five jobs split along that seam.

**Units:** X6 (Approach B; 06-01, 06-02, 06-03), `syntheticContextDef`'s fold.

**Binding Design:**
1. **The Seat** (new `Core/Properties/Cells/ValueSeat.tsx`): `useValueSeat(host: SeatHost)` and `<ValueSeat>`, with `SeatHost = { anchor; hideable: boolean; commit; rowMenu?: (target) => MenuModel }`, dispatching `valueClickIntent` (`valueClick.ts`) for click and the P15 row menu for right-click. It replaces the three intent maps (`TableView.tsx:134-156`, `CardValue.tsx:74-94`, `PropertyPanel.tsx:286-304`), the two identical right-click chains and the panel's third, the three editing-state types, the three link-seat lines, and the `rename` intent.
2. **The Fourth Router:** `runPropertyAction` → `pendingPick` → `ValuePickPresenter` folds into one app-level seat instance for off-surface menus; `Core/Properties/Cells/valueMenuTarget.ts` and `Core/Interface/Menus/ValuePickPresenter.tsx` are deleted with `App.tsx`'s mount; `pendingPick`'s type-deciding half (`Core/Session/chromeSlice.ts`, `Core/Matrix/MatrixView.tsx`), `CHECKBOX_OPTIONS`, and `valueCommitFor` leave. Matrix's hold follows the seat.
3. **No Fabricated Definition:** the seat hands pickers a `PickTarget` built from P13's resolved column (`{ type, def? }`), so `syntheticContextDef` and its six sites leave (`PropertyPanel.tsx:364,403`, `useViewHost.ts:212`, `propertyMenuActions.ts:72,96`, `FilterFrame.tsx:378`).
4. **The Panel Splits:** `PropertyPanel.tsx` keeps layout, row order, and revealed rows (J-5); value interaction moves to the seat. The Cards File pane's `PickTarget` arm and `adoptPathInto` stay (J-7); Cards keeps hiding a chip's remove below 80% zoom (J-6).

**Order:** 3, 1, 2, 4. The seat's interleavings with Cards' ghost hold, the table's title-action passthrough, and `lastOpened` popover keying are designed in the phase's tasks during planning, from the code, so the executor runs a settled design.

**Behavior Changes:** none intended; every surface keeps today's click and menu behavior after P15.

**Consumers:** `TableView.tsx`, `CardValue.tsx`, `CardsView.tsx`, `PropertyPanel.tsx`, `App.tsx`, `chromeSlice.ts`, `MatrixView.tsx`, `propertyMenuActions.ts`, `PropertyPicker.tsx`, `FilterFrame.tsx`, `useViewHost.ts`.

**Tests:** **Rewritten:** `PropertyPicker.pane.test.tsx:345` and the three surfaces' click and menu tests against the seat. **Written:** one seat test per host pinning click, right-click, and edit for each value kind.

**Drive:** Properties Drive group 14: the same value is clicked, right-clicked, and edited in a Table, a Card, and the panel, and each opens the same picker and menu; the native menu's property action opens the seat.

**Delta:** about −170 (−120 to −220; the seat's about +120 inside). The phase's checkpoint compares the landed delta to this figure.

**Depends On:** P13, P15.

**Risks:** Cards' ghost hold, the table's title-action passthrough, and `lastOpened` popover keying interleave with the menu chain; each interleaving is pinned by a seat test before the old copy it replaces is deleted.

`[Compaction checkpoint: c/pre-compaction; on the re-prompt, re-read §Constraints and c/plan-execution before P17 opens]`

##### P17 — The Properties Pane

**GOAL:** Every type's editor renders its rows through one menu index in one collapse-safe container, fixing the Date and Number spacing without moving a row or changing a word. The pane's small duplicates fold, a denominator of zero or less is refused in the editor, an editor whose property disappears returns to the list, the kit header reads "Edit Icon", and "schema" keeps one meaning in file names.

**Units:** Y1 (Approach G; L-1), Y2 (05-06, 05-08, 05-09, 05-10, 05-11), Y3 (L-3's editor half, L-4, O-5), Z2 (08-12's vocabulary half).

**Binding Design:**
1. **Rows as Specifications (Y1):** `NumberEditor.tsx`, `DateTimeEditor.tsx`, `LinkEditor.tsx`, `CheckboxEditor.tsx`, and `FileEditor.tsx` become per-type row builders in one `Core/Properties/Schema/typeRows.ts` (`rowsFor(def, ctx): MenuRow[]`), rendered by one `MenuIndex` (`UIX/Menus/MenuIndex.tsx:122-176`) in one container whose rhythm sits on `Reveal`'s `[data-reveal]` wrapper (`UIX/Menus/Reveal.tsx:45`), so a revealed row keeps its margin and a collapsed Day row leaves no gap. `number-editor.css.ts` is deleted and `DateTimeEditor.tsx:31`'s inline `gap: 4` leaves; FileEditor's `useSession` read moves to the frame; T7's `LOOKS` serves the three narrowings. Date keeps its row icons; every other row passes none (L-2 is I-076).
2. **Small Folds (Y2):** `useGhostOptionAnchor` leaves and both sites call `useGhostAnchor`; the inline-rename store slice becomes `useState`; `OptionOrderList.tsx`'s pane-row helpers move to `Core/Views/Settings/paneRows.ts` with one shared order row; `OptionEditor` takes `def`; `Schema/OptionRow.tsx` becomes `OptionSlot.tsx`, folding `OptionDraft` and `compactTitle`; internal types unexport; `handleDrop` becomes a `switch`; `Core/Properties/paneDrop.tsx` moves to `UIX/Menus/paneDrop.ts` with neutral names (readers `PropertyPanel.tsx`, `PropertyFrame.tsx`, `VisibilityFrame.tsx`); `nexusReorderIndex` becomes `fullOrderIndex` in `UIX/Utilities/moveItem.ts`.
3. **Y3:** the denominator row takes only a positive number and otherwise reverts (`NumberEditor.tsx:126-133`), and `formatValue.ts:221`'s guard reduces to a presence check; `UIX/Menus/InlineEditHeader.tsx:47`'s aria-label reads "Edit Icon"; the frame renders the list whenever the edit view names an id `props` lacks, derived at render, so `PropertyFrame.tsx:396-405`'s "Property not found." caption leaves (O-5).
4. **One Meaning for "Schema" (Z2):** `Core/Properties/schema.ts` becomes `Core/Properties/validation.ts`, so `Schema/` names only the pane's folder.

**Order:** 4, 2, 1, 3.

**Behavior Changes:** the Date and Number editors' spacing is fixed (L-1); a non-positive denominator is refused in the editor (L-3); an editor whose property disappears returns to the list (O-5); the header's spoken label reads "Edit Icon" (L-4) — each Nathan's intent.

**Consumers:** the five editors, `PropertyFrame.tsx`, `frames.css.ts`, `MenuIndex.tsx`, `Reveal.tsx`, `GhostOptionChip.tsx`, `PropertyPanel.tsx`, `OptionEditor.tsx`, `OptionOrderList.tsx`, `VisibilityFrame.tsx`, `moveItem.ts`, `InlineEditHeader.tsx`, `schema.ts`'s readers.

**Tests:** **Rewritten:** the editor tests against row builders; `PropertyFrame.test.tsx:224` for "Edit Icon". **Written:** a revealed Number row keeps its margin; a collapsed Day row leaves no gap; a denominator of 0 reverts; deleting the property under an open editor shows the list.

**Drive:** Properties Drive group 15: screenshots of each type's editor with a row revealed and collapsed, compared against the rhythm; create a property, open its editor, delete it from the ⋮ menu, and the list shows.

**Delta:** about −160 (−140 to −180).

**Depends On:** P3 (`LOOKS`), P7.

**Risks:** O-5's derived list may show the list for one frame after a create, if the tree lacks the new id when `addProperty` replies; the drive's create-then-edit step settles it, and a flash is fixed by opening the editor from the reply's `created.propertyId` after the tree patch.

##### P18 — The Documents Read True

**GOAL:** Every feature document, Issues entry, drive, and script the work made false is rewritten in place, and `PropertiesPM.md` reads as an overview rather than mechanics. The Issues entries citing Properties close or narrow to what's still open, with I-076 and I-077 the only deferrals and no entry filed.

**Units:** every *§What Becomes False* row assigned to P18; the documentation spotcheck.

**Binding Design:** each row of *§What Becomes False › Documents* and *› Issues Entries* marked P18 is rewritten to the landed code, in the Studio documentation reference's voice; `PropertiesPM.md`'s mutation table, Repairs, and Validation sections become overview prose; the Scripts README's channel names are checked against `bridge.ts` and the `mutate` union. The test sweep converts every hand-rolled Nexus seed still standing in the Properties-system tests to P1's `seedNexus` and shared definitions module, so one seeding path remains, and any test title still carrying a plan-round tag or naming a removed symbol is rewritten; the task lists each file with the `git grep` that found it.

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
> - Each kind of value's filter rules, sorting, and grouping are stated once in one record; a filter value that can't be read is ignored instead of matching everything, a checkbox's "is not empty" filter works, and empty values sort last for every type.
> - Picking a value follows one model for one row or many, and the right-click menu on a value reads the same in the table, cards, and the properties panel.
> - Clicking, right-clicking, and editing a value is one shared piece for the table, cards, and panel.
> - Every type's settings editor uses one layout with consistent spacing, and an editor whose property disappears returns to the property list.
> - The feature documents, issue entries, and test scripts describe the code as it now is.
> - The production code is smaller than at the baseline, the work adds no new issue entries, and nothing in the touched areas reads as left over, temporary, or done one way here and another way elsewhere.
>
> Does the range hold these outcomes on every lens — correctness, simplicity, cohesion with the rest of the codebase, and consequences? Answer yes or no, with corrections, and name the strengths to keep.

---

#### The Perspective Scoreboard

Each count is today's at `3c6afcabb` and the plan's target, with where it's proven. A count marked **Investigation** is the Investigation's or a scout's tally, not re-counted here; every other count was run for this document and its command is in the last column, so a reviewer re-runs it on the head that claims it.

| Perspective | Flagged Practice | Today | After | Proven In · How |
|---|---|---|---|---|
| **Legacy Versus Interop** | Read paths for shapes only earlier builds wrote | 8 (`LEGACY_TYPE_IDS`, `RENAMED`, `normalizeSavedViews`' open pass, `renamedSidecar`, `legacyBucketKey`'s 3 branches, the bare-`sub/` clause, 2 year sniffs) | 0 | P1 · `git grep -nwE "LEGACY_TYPE_IDS\|legacyBucketKey\|normalizeSavedViews\|renamedSidecar" -- Core` answers 0, and neither `views.ts` nor `GroupFrame.tsx` holds a year sniff |
| **Type Facts Once** | `PropertyType \| 'title'` unions | 21 in 11 files | 0 | P2 · `git grep -n "PropertyType \| 'title'" -- Core UIX ':!*.test.*'` |
| **Type Facts Once** | Ad-hoc `.type === '<type>'` checks | 30 | each survivor names a unique piece in its phase's Departures | P3, P14 · the `\.type === '…'` grep in *§Verified at HEAD* |
| **Type Facts Once** | Type-fact tables | about 14 (**Investigation**) | 5 records: engine `PROPERTY_TYPES`, renderer `TYPE_META`, `LOOKS`, `VIEW_KINDS`, `FILEDATA` | P2, P3, P14 |
| **Type Facts Once** | "Which types hold connections" statements | 5 (**Investigation**) | 1 (`connections`) | P3 |
| **Type Facts Once** | Checkbox blank-draws rule statements | 4 (**Investigation**) | 1 (`blankDraws`) | P3 |
| **Type Facts Once** | Registration `=== 'multiSelect'` checks | 2 (`fileEvents.ts:528`, `optionOps.ts:133`) | 0 (`registersMembers`) | P3 · `git grep -n "=== 'multiSelect'" -- Core ':!*.test.*'` |
| **Type Facts Once** | Options-from-labels builders | 8 (**Investigation**) | 1 (`pickerOptions`) | P3 |
| **Type Facts Once** | `syntheticContextDef(` sites | 6 | 0 | P16 · `git grep -n "syntheticContextDef(" -- Core ':!*.test.*'` |
| **Fix the Origin** | UI filters guarding against non-user definitions | 4 | 0 | P2 |
| **Fix the Origin** | Hand-placed guards around the one slot | 7 (**Investigation**) | 0 | P11 |
| **Fix the Origin** | Never-shrink guard's scope | every governed key | list-shaped values only | P4 |
| **Fix the Origin** | A delete's put-back-and-throw paths | 2 (`unlinkMembers`, the Context put-back) | 0 | P11 |
| **One Write Path** | Value write routes | 12, with 3 world-less side doors (**Investigation**) | one governed-root module; 0 side doors | P4 |
| **One Write Path** | Renderer re-encodes of a write | 2 (`applyValueAtRoot`, `withSeeds`) | 0 | P6 |
| **One Write Path** | Undo routes / put-back landings | 2 / 2 | 1 / 1 | P6 |
| **One Write Path** | `ValueWriter` assemblies | 3 | 1 | P15 |
| **One Way** | Try Again forms | 4 (**Investigation**, R) | 1 (`finishOwed`) | P11 |
| **One Way** | Crash-recovery files / record kinds | 2 / 5 | 1 / 1 entry type | P11 · `git grep -n "JOURNAL_FILENAME\|journalSlot" -- Core` answers 0 |
| **One Way** | Replay points at open | 2 (`handlers.ts:86,111`) | 1 | P9, P11 |
| **One Way** | Reply shapes across schema ops | 7 (**Investigation**) | 1 (`MutateOutcome`) | P7, P11 |
| **One Way** | Holder count functions | 4 (**Investigation**) | 1 (`property:holders`' switch) | P7 |
| **One Way** | Property, schema, and registry channels | 20 | 1 read channel (`property:holders`) | P7 · `bridge.ts`'s `'(property\|schema\|registry):` entries |
| **One Way** | Space candidate paths | 5 (**Investigation**) | 1 (`findHolders`) | P10 |
| **One Way** | Page candidate rules for property and Context sweeps | 2 (`governedReach`, `sweepMembers`) | 1, with its reach stated | P10 |
| **One Way** | Shown-text projections | 2 (`textValue`, `sortText`) | 1 (`shownText`) | P14 |
| **One Way** | Value click-and-menu copies | 3 plus the native router | 1 seat | P16 |
| **One Way** | Bucket-key builders | 2 | 1 (`bandKey`) | P8 |
| **Hot Paths Stay Cold** | Per-cell schema scans | 2 (`resolveFieldValue`'s `schema.find`, `Cell.tsx:45`) | 0 | P13 |
| **Hot Paths Stay Cold** | `declaredType(` calls | 23 in 14 files | 0 | P13 · `git grep -n "declaredType(" -- Core ':!*.test.*'` |
| **Hot Paths Stay Cold** | Optional `contextIds` defaults | 19 | 0 | P13 · the `contextIds` grep in *§Verified at HEAD* |
| **Hot Paths Stay Cold** | `TextCell` store subscriptions | 3 per cell | 1 | P13 |
| **Hot Paths Stay Cold** | Whole-Nexus walks on a synced definition / open-time per-page registration | 1 / 1 | 0 / 0 | P5 |
| **Hot Paths Stay Cold** | Registry re-read and re-validation per value write | 1 | 0 (`cachedParse`) | P4 |
| **Hot Paths Stay Cold** | Filter operand parses | per row | once per pass | P14 |
| **One Vocabulary** | Names for the stash | 2 (cache, stash) | 1 | P12 · `git grep -n -i "property_cache\|cachedValues\|patchCacheBlock" -- Core` answers 0 |
| **One Vocabulary** | Meanings of "Remove" in the Properties pane | 2 (option delete, unassign) | 1 | P7 |
| **One Vocabulary** | Meanings of "schema" in file names | 3 (**Investigation**) | 1 | P17 |
| **One Vocabulary** | Files named "value" meaning different things | 5 (**Investigation**) | each named for its content | P4 |
| **Clearer Boundaries** | Shared modules living in `Core/Properties` | 8 (`governedSweep`, `governedWrite`, `journalSlot`, `keyHolders`, `rowOrder`, `pageRow`, link vocabulary, pane targets) plus `paneDrop` | 0 | P1, P3, P4, P10, P11, P17 |
| **Clearer Boundaries** | Homes for count copy | 2 (`properties.ts`, `confirmations.ts`) | 1 (`entities.ts`) | P7 |
| **Sync-Ready Shapes** | Options without ids / unread `group_id` writes | every option / 8 NexusOS options | 0 / 0 | P8 |
| **Sync-Ready Shapes** | Sync rules added | 0 | 0 | every phase · `git diff BASELINE..HEAD -- Core/Sync` is empty |
| **Describers Get Swept** | Plan-round tags in test titles | about 31 (**Investigation**) | 0 | P1 |
| **Describers Get Swept** | Exact-key rule pins | 17 in 12 files (**Investigation**) | 1 | P10 |
| **Describers Get Swept** | One-slot non-displacement pins | 4 files (**Investigation**) | 0 | P11 |
| **Describers Get Swept** | False `PropertiesPM.md` claims | about 12 (**Investigation**) | 0 | P18 |
| **Behavior Is a Decision** | Behaviors met and not put to Nathan | — | 0; every one is in *§Last Calls* or *§Nathan's Calls* | this document |
| **Directive (10-22-2026)** | Net production delta | — | about −1,490 | *§The Ledger* |
| **Directive (10-22-2026)** | Issues entries filed by the work | — | 0; I-076 and I-077 the only deferrals | P18 · `git diff BASELINE..HEAD -- .claude/IssuesPM.md` adds no `#### I-` heading |

---

#### The Ledger

Production lines; tests apart. Ranges are each scout's; the figure is the midpoint used.

| Phase | Removed | Added | Net | Running Total | Tests |
|---|---|---|---|---|---|
| **P1** Removal First | about −165 | about +5 | **−160** | −160 | about −420, +25 |
| **P2** What Counts as a Property | about −80 | about +20 | **−60** | −220 | small |
| **P3** Type Records and Looks | about −110 | about +32 | **−78** | −298 | small |
| **P4** The Value Write's One Home | about −100 | about +15 (T's +4 inside) | **−85** | −383 | about −40 |
| **P5** One Home per Definition | about −60 | about +33 (O-6 inside) | **−27** | −410 | about −30 |
| **P6** Undo From the File | about −65 | about +30 | **−35** | −445 | about −60 |
| **P7** One Door | about −95 | about +45 | **−50** | −495 | about −40 |
| **P8** Option Identity | about −105 | about +20 | **−85** | −580 | about −220 |
| **P9** List First, One Replay | about −60 | about +10 | **−50** | −630 | rewritten |
| **P10** One Finder | about −75 | about +10 | **−65** | −695 | about −100 |
| **P11** One Note per Item | about −355 | about +220 | **−135** | −830 | about −250 |
| **P12** The Stash and Trash Records | about −14 | about +51 | **+37** | −793 | about +60 |
| **P13** Columns Carry Their Answer | about −140 | about +20 | **−120** | −913 | small |
| **P14** The Per-Kind View Record | about −265 | about +150 | **−115** | −1,028 | rewritten |
| **P15** Pick Model and One Row Menu | about −160 | about +25 | **−135** | −1,163 | about −30 |
| **P16** One Value Seat | about −290 | about +120 | **−170** | −1,333 | rewritten |
| **P17** The Properties Pane | about −190 | about +30 | **−160** | −1,493 | about −40 |
| **P18** The Documents Read True | 0 | 0 | **0** | −1,493 | 0 |

**Total:** about **−1,490** production lines (roughly −1,100 to −1,850), with about −1,250 to −1,600 test lines. Every phase but P12 is net-negative, so every intermediate head is net-negative from P1 on.

**Confidence:** P1, P2, and the small folds are read from the code and hold within a few lines. P11 (the notes), P12 (the stash), P14 (the record), P16 (the seat), and P17 (the editor rows) are estimates of designs drawn here but not yet coded, and each could move by half; none of them flips the cumulative sign, since the smallest plausible total (every estimate at its least favorable end) is still below −1,000. P11's figure is R's −150 to −250 less what P9 (−50) and P1 (N4's −12) took first; P12's is S's +23 less the purge check P11 counts, plus the refill-skip arm (+8) and the partial mark (+8), less the double report's fold (−1).

**Net-Positive Rationale (P12):** under *Less Stuff*, C-3's ageing and C-2's fixes are required behavior in minimal form on existing mechanisms; the refill-skip report fixes a loss the ageing would otherwise make silent; the partial mark delivers N-1; each fold inside it removes what it replaces.

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
| `contextResolve.ts:119` "never shrinks or blanks" | the tidy type fact | P4 |
| `mutate.ts:81` "never shrinks or drops a key it can't resolve" | the tidy type fact | P4 |
| `mutateRequest.ts:91` `held` "written back as it was" | E-1 | P6 |
| `registryProperty.ts:170` race rationale | S1 | P7 |
| `propertiesRegistry.ts:125` lock claim | S1 | P7 |
| `optionMenu.ts:1` "Remove deletes the option" | O-1 | P7 |
| `deleteProperty.ts:169` "Spread, never Object.assign" | `patchStashBlock`'s fold | P12 |
| `replaySchemaCascade.ts:52` registry-last rationale | B-2 | P9 (file leaves in P11) |
| `contextCascade.ts:32` the `'merge'` rule's reason | B-2 | P9 |
| `keyHolders.ts:13`, `spaceSidecar.ts:49` disk truth | G-1 | P10 |
| `mutate.ts:68` four-way Try Again; `journalSlot.ts:1,18` | B-1 | P11 |
| `PropertyPanel.tsx:151` the `KNOB` comment | J-5 | P15 |
| `number-editor.css.ts:3` | the file leaves | P17 |
| `formatValue.ts:221`'s guard comment | L-3 | P17 |
| `UIX/Menus/InlineEditHeader.tsx:47` "Edit icon" | L-4 | P17 |

##### Tests and Scripts

| Describer | Becomes False With | Phase |
|---|---|---|
| `Core/Sync/Arrival/mergePolicy.test.ts:120-136` (`name` field, respelling, fragment) | stays as written under *Sync Stays*; recorded as a rebuild input | — |
| `columnMenu.test.ts:171-175` "Format" for Number | I-4 | P3 |
| `repairSweep.test.ts:150-156` | P-1's type fact | P4 |
| `propertyValue.test.ts:223-225` | whitespace at decode's entry | P4 |
| `restoreValue.test.ts`, `assignValue.test.ts:72-115` | E-1 | P6 |
| `confirmations.test.ts:434-435` | kept; the zero wording is pinned beside it | P7 |
| `PropertyFrame.test.tsx:202,244,255,438,486` | 05-13 | P7 |
| `.claude/scripts/Option Picker Drive/live-drive.mjs:170-173` | `5e3aee180`'s threshold | P7 |
| `.claude/scripts/Metadata Drive/live-drive.mjs:789,932,935,960,979` and `MATRIX.md:110` | O-1 | P7 |
| `.claude/scripts/Metadata Drive/live-drive.mjs:179-180,876` | D-3 | P8 |
| `.claude/scripts/make-benchmark-nexus.mjs:169` | D-1, D-3 | P8 |
| `OptionEditor.test.tsx:267-448`, `optionOps.test.ts:245-276`, `configReach.test.ts:157-252` | D-1 | P8 |
| `keyHolders.test.ts:80-216` | the finder's move | P10 |
| `journalWiring.test.ts:274-319`, `optionOps.test.ts:707`, the one-slot pins | B-1, B-4 | P11 |
| `cascadeRace.test.ts:58` "F1 —" and the other plan-round tags | 09-06 | P1 |
| `.claude/scripts/drive-harness.mjs:282`; `Text Property Drive/live-drive.mjs:279,287,292,365` | J-4 | P15 |
| `.claude/scripts/README.md`'s channel names | P7's fold | P18 |

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
| `CorePM.md`'s *§Mutations*, `mutateRequest.ts`'s comment | I-032's Properties slice folded | P18 |

##### Issues Entries

| Entry | Outcome | Phase |
|---|---|---|
| **I-006** | Narrowed: "Option lists key on `value`" becomes `key`; option ids have landed, so per-option merging is a Sync rebuild input; it names `property_stash` among the lists merging whole. Stays open under *Sync Stays*. | P18 |
| **I-032** | Narrowed: the Properties slice (19 writing channels) folded into `mutate`; the count and list name what's left. | P18 |
| **I-033** | Unchanged (the Trash batch's walk). | — |
| **I-035** | Narrowed in place: its event-order sentence follows the list-first Context rename; the defect stays. | P18 |
| **I-036** | Closed: one notes file, one replay at one point, one finder over the tree. | P11 (text in P18) |
| **I-039** | Closed: the put-back it describes leaves. | P11 (text in P18) |
| **I-042** | Narrowed to part (1) and part (2)'s non-Properties moves; `governedSweep` lands in `Core/Nexus`, `governedWrite` and `journalSlot` dissolve, `keyHolders` lands in `Core/Index`. | P18 |
| **I-063** | Closed: undo puts back the file's own node. | P6 (text in P18) |
| **I-064** | Narrowed in place: "Key Format" becomes "Label Format" and its footnote lines move; stays deferred. | P18 |
| **I-068**, **I-072** | Unchanged (outside Properties). | — |
| **I-076** | Narrowed: its column-menu wording note follows I-4. Stays deferred. | P18 |
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
- **LC-34 · Every Property Change Goes Through the App's One Change Channel:** the Walkthrough said five ways to save a property setting become one; the plan goes further and moves every property change onto the same channel the rest of Pommora's changes already use, so property changes stop having a door of their own. Nothing you see changes. **Recommended:** take it.

##### Crash Recovery

- **LC-7 · A Name Still Owed to an Unfinished Rename Is Refused (Morning Question 1):** today a new property named after an unfinished rename's old name quietly becomes "Priority (2)", and renaming a property onto such a name isn't checked at all. Both are refused with the general "An earlier change hasn't reached every file yet." and Try Again, exactly like B-4's deleted-name case, so a new property never inherits pages a rename hasn't reached. This covers creating, renaming, and changing the Label Format. **Recommended:** refuse.
- **LC-8 · The Same Rule for Contexts and Spaces:** a Context or Space created or renamed under a title another item still owes takes over that item's leftover tags today. It's refused the same way. **Recommended:** refuse.
- **LC-9 · A Trash Restore Under Someone Else's Owed Name Is Refused Too:** restoring goes through the same create step, so it's refused with the general message, and Try Again finishes the other item's work first, after which the restore can run. **Recommended:** one rule, no special case.
- **LC-10 · A Delete That Finishes Later Still Saves Every Value to the Trash:** today a property delete that couldn't reach some pages loses those pages' values from its Trash entry when it finishes them later. Every delete now records the values up front from Pommora's index, so a restore brings them all back. **Recommended:** capture up front.
- **LC-12 · A Change Whose Note Can't Be Written Doesn't Start:** today some big changes run without a note when the note can't be written, and others refuse. Every one now refuses with nothing changed. **Recommended:** refuse.
- **LC-18 · Re-Adding a Removed Property Cancels What Its Remove Still Owed There:** if a Remove missed pages and you add the property back to that Collection before Try Again runs, the leftover work is dropped for that Collection, since the property governs those pages again. **Recommended:** take it.
- **LC-19 · A Remove Reports Pages It Can't Clean Up:** today a Remove quietly leaves the value on a page with no ID, a page sharing another page's ID, or a page whose properties can't be rewritten safely, while the Collection no longer uses the property. These now count as unfinished, with Try Again; a page without an ID usually gets one at its next read, so Try Again usually succeeds. The feature document's sentence calling this intended is rewritten. **Recommended:** report and offer Try Again.
- **LC-45 · Clearing an Option Is No Longer Refused While Another Option Change Is Owed:** today Clear waits on its own property's unfinished option change. It now runs, and any old names still owed to that option are switched to "remove" so the unfinished rename can't bring the cleared value back. **Recommended:** take it.

##### Values and Tidy-Ups

- **LC-20 · Outside-Written Several-Word Selects Are Tidied at the Next Open:** with the tidy rule and Repair Properties On Open both on, a Select or Status that Obsidian or another app wrote with several words becomes the one option Pommora shows the next time the Nexus opens, and that change syncs. NexusOS has none today, and nothing in NexusOS relies on a several-word Status. **Recommended:** take it, since it's what both of your rulings say together.
- **LC-21 · "Any Edit" Means Any Value Edit:** a several-word Select tidies when any property, tag, or Space link on its page is changed, and on Repair On Open — the same moments every other tidy-up happens. Editing the page's text, renaming its title, or changing its banner doesn't tidy. **Recommended:** take it.
- **LC-22 · A Multi-Select Holding a Word No Option Names Also Collapses Duplicates:** today `[a, zeta, a]` stays exactly as written when another property is edited, while picking that Multi-Select writes `[a, zeta]`. It now becomes `[a, zeta]` either way. **Recommended:** one rule.
- **LC-23 · A File Value Listed Twice Collapses:** every other list type drops a repeated item on the next edit; File didn't. **Recommended:** match the others.
- **LC-24 · Spaces-Only Reads as Empty for Dates, Links, and Files Too:** you ruled spaces-only text empty; a date, link, or file written as only spaces read as filled for the same reason. It's stated once for every type. **Recommended:** take it.
- **LC-25 · A Space Edit That Changes Nothing Leaves the File Alone:** today re-picking a Space's value it already holds rewrites its settings file and gives it a new modified time. It now writes nothing, as pages already do. **Recommended:** take it.
- **LC-30 · A Mis-Capitalized Option Word Beside a Valid One Drops:** `Stage: [done, Active]`, where the option is spelled "Done", tidies to `[Active]`, since "done" names no option; alone, `[done]` stays as written. This follows your rule that words no option names are ignored. **Recommended:** no change; noted so it isn't a surprise.

##### The Stash

- **LC-4 · A Restored Collection Can Keep a Deleted Property's Id:** if a property is deleted while its Collection sits in the Trash, the restored Collection still lists the property's id. It does nothing on its own, and it switches the property back on if the property is restored too. **Recommended:** leave it.
- **LC-5 · A Re-Add That Couldn't Refill Some Pages Offers Try Again:** today, if re-adding a property can't write some pages, their values wait in the stash forever and you're never told. With the stash now cleaned out after the History Timeframe, they'd be lost unseen, so the re-add reports them with Try Again, which refills from the stash. **Recommended:** report it.
- **LC-26 · How the Stash's Clock Runs:** a property restored from the Trash keeps its stash's original removal date, so the Trash doesn't reset the clock (page history ages trashed pages the same way); a second Remove of another property's values into the same block restarts that block's clock; archived pages' stash values follow History Timeframe rather than Archive History Timeframe, as C-3 says. **Recommended:** take all three.
- **LC-27 · The History Timeframe's Hint Now Undersells It:** the setting's hint says it keeps device-local file history, while it now also ages the stash, which syncs. The settings panes' wording waits for your I-076 pass and the stash's own timeframe is I-077, so the hint stays. **Recommended:** fix it when I-077 lands.
- **LC-36 · A Page in the Trash Gets Its Stashed Value (Morning Question 3, Stands):** re-adding a property writes a trashed page's stashed value into its Trash copy, so restoring the page brings it back. Only a page trashed from this Collection qualifies.
- **LC-37 · The Partial Mark (Morning Question 4):** a partly recorded Trash entry shows a warning mark with the spoken label "Recorded Partly", and restoring it adds "“Title” was recorded partly, so some of what it held may not come back." **Recommended:** take it.
- **LC-46 · An Archive Restore Reports Once:** restoring from the Archive today shows its "some values didn't come back" lines twice, once on their own and again inside the Restored notice. The repeat inside the Restored notice goes. **Recommended:** take it.

##### Views, Menus, and Defaults

- **LC-11 · A Hand-Written Context Property Isn't a Real Property (Morning Question 11):** a Context-typed definition typed into the property list by hand is set aside when the list is read, since Contexts come from the Context list.
- **LC-13 · Deleting Something Nothing Holds Still Asks (Morning Question 13):** deleting a property or option no page holds still asks, since the definition itself is destroyed, without the "stripped from 0 Items" clause. The zero-case details are today's details with the strip clause removed and no new words: "It is removed from every collection; a restorable record lands in the nexus’s .trash folder." for a property, and "The option is deleted from the property." for an option.
- **LC-14 · Numbered Names (Morning Question 14):** the pane's `+` keeps naming a new property "New Select" or similar without a notice; a Trash restore whose name was taken says "Restored “Priority” as “Priority (2)”."
- **LC-15 · The Panel's File Menu (Morning Question 15):** a File value's right-click in the panel gains Remove and not Clear, matching cards.
- **LC-16 · Undo and Aliases (Morning Question 16):** undo takes back only a Link value's alias; a link typed inside a Text value keeps the alias its save added.
- **LC-17 · Status in the Picker (Morning Question 17):** the value picker keeps creating Select and Multi-Select options but not Status options, since a Status option has to sit in one of its groups.
- **LC-38 · New Views (Morning Question 6):** a new view shows Title only, and properties created later stay hidden in existing views.
- **LC-39 · Value-Less Rows (Morning Question 7):** in a grouped view, pages with no value stay an unlabeled run at the top or bottom rather than a "None" group.
- **LC-40 · The Pommora Tile (Morning Question 9):** its leftover Status collapses are kept and scoped to Status, with "open" and "closed" dropped.
- **LC-41 · The Link Default (Morning Question 12):** an unset Link Format stays Full Link, since Default Link Format is set per device and governs pasting.
- **LC-47 · The Two Link Menus Read the Same:** both read Rename, then Edit Link (Edit Title where a page link's title is what's edited), the order the connection menu already uses. **Recommended:** take it.

##### Settled or Structural

- **LC-32 · The Properties Folder's Background/Screen Split Waits (Morning Question 5):** it's part one of I-042, a folder plan for all of Pommora; landing it for Properties alone would make Properties the one area shaped its own way and move the same files twice.
- **LC-33 · One Notes File (Morning Question 2):** one file holds every item's entry rather than a file per item, since it never syncs and keeps one read at open.
- **LC-35 · I-035 Stays Open:** pages already tagged with a new Space or Context name still stay unlinked until they're re-read; that lives in how Pommora places a new Space, which this work doesn't touch, so the entry's wording is updated and the bug stays on file.
- **LC-42 · Several-Word Selects (Morning Question 8):** settled by Nathan: any edit tidies to the one option shown.
- **LC-43 · The Name (Morning Question 10):** settled by Nathan: Filedata.
- **LC-44 · Measurement Outcomes:** four speed checks on a large test Nexus decide small things by fixed rules: whether the renderer stops pre-computing a write's result (F3), whether views need in-place updating after an edit (K), whether the graph filter needs a cache (07-10), and whether mass edits need a combined request (02-10). Any check that fails its threshold is reported here in the morning with its numbers rather than filed.
- **LC-48 · Accidents Fixed Along the Way:** a Nexus whose unfinished Context rename throws on open now finishes opening; a property delete that can't update a damaged Collection settings file now stays unfinished with Try Again instead of silently skipping it; the restore routines' ignored Space-file failures now warn. **Recommended:** take all three.

---

#### Nathan's Calls

- **NC-1 · Context and Space Deletes in System Trash Mode Keep No Record of Their Tags (R's F-8):** in System Trash mode the folder goes to the system Trash and the tags leave every page with no copy anywhere, while a property delete keeps a Pommora Trash entry in either mode on purpose (N-2). **Recommended:** leave it; System Trash mode means Pommora keeps no records of its own, and the property exception is yours by N-2.
- **NC-2 · Damaged-File Copies Are Never Cleaned (R's F-9):** when Pommora rebuilds one of its own damaged JSON files, the damaged copy is set aside as `.<name>.bad-<id>` beside it and never removed. This is the policy for every Pommora settings file, outside Properties. **Recommended:** leave it; the copies are evidence for a hand repair, and a cleanup policy belongs to all of Pommora's files at once.

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
| B-1, B-3, B-4 | P11 |
| B-2 | P9 |
| C-1 | Kept; P11, P12 |
| C-2 | P11 (retry), P12 |
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
| J-1 | P4 (spaces), P15 (clock) |
| J-2, J-6, J-7 | Kept |
| J-3, J-10 | P15 |
| J-4 | P15 |
| J-5 | Kept; its comment in P15 |
| J-8 | P3 (gate's reason; LC-17) |
| J-9 | P4 |
| K-1 | P14 (filters), P8 (collapses) |
| K-2 | P14 |
| L-1, L-4 | P17 |
| L-3 | P7 (decode), P17 (editor) |
| M-1 | P3 (record), P18 (document) |
| M-2 | Kept |
| N-1 | P12 |
| N-2 | Kept; P18 (document) |
| O-1, O-2, O-4 | P7 |
| O-3 | P4 |
| O-5 | P17 |
| O-6 | P5 |
| P-1 | P4 |
| P-2, P-3 | Kept |

| Walkthrough Line | Phase or Exclusion |
|---|---|
| *Types* — two tables; 21 unions; fake-property guards; eight picker builders | P3; P2; P2; P3 |
| *Values* — one module; refusal check; real-write tests; "value" names; cached registry and one creation write; Title as text | P4; P1; P4; P4; P4; P2 |
| *Undo* — one route and one put-back; the undo list stays the owner; the bare-key repair unneeded | P6 |
| *Crash Recovery* — one notes system and the seven guards; one open point; the reverse path; list-first delete; no screen copy of a note; the unread field; up-front capture | P11; P9, P11; P9; P9; P11 (LC-6); P1; P11 |
| *Reach* — one read per file; Space Context keys; index registration; ids not copies; repair from the tree | P10; P10; P5; P5; P5 |
| *Stash* — wrapper flattens; restore writes the stash first; damaged sidecar caught; `.nexus` home | LC-1; P12; P11; superseded by C-3 |
| *Stash* — What Changes: stale drop, Trash parking, Trash Collections reached, Remove's Try Again | P12; P12; LC-2; P11 |
| *Options* — rename machinery and popup tests leave; one bucket-key builder; throwaway conversion; ids for Sync later | P8 |
| *Panel* — one seat replacing the native router; one pick model and one writer; moves and names | P16; P15; P15 |
| *Views* — columns once; one shown text; no redundant hidden list; the view-kind table; speed measured | P13; P14; P13; P14; P14 (LC-44) |
| *Editors* — looks once; row lists; one save path and one format saver; one lock; small duplicates | P3; P17; P7; P7; P17 |
| *Trash* — one counting home; the delete flow; restore trusts create; Delete names | P7 |
| *Settings* — the notice names its list | P5 |
| *Sync* — the scrap test corrected; the merge-depth test rewritten; losses listed | LC-31; LC-31; *§Sync Rebuild Inputs* |
| *Tests* — one seed; duplicates collapse; tags leave; removed-behavior tests leave; documents and Issues rewritten; comments; drives | P1; each phase; P1; each phase; P18; P1, each phase; P7, P8, P15, P18 |
| *Leftover* — the open conversion; old hidden groups; legacy tests; interop stays; shared pieces move; one name per concept; folder split waits | P1; P1; P1; kept; P1, P3, P4, P10, P11, P17; each phase; LC-32 |

---

#### Open Items

1. **Superseded Readings in the Planning Documents:** *Properties Restructure — Investigation*'s *§What Counts as a Property* (the Built-In Fields name) and *§Edge Rules* P-1 bullet (an edit to a different property leaves a several-word Select as written), and *Properties Restructure — Walkthrough*'s lines this document departs from (*§Last Calls › Departures From the Walkthrough*, plus line 34's "already today's rule", which covers the display half only), carry readings this document supersedes. Whether those planning records are rewritten before ratification is the orchestrator's call; no phase touches them.
2. **`reveal-parity`:** the decision log's Open Item 2 (`.claude/scripts/reveal-parity/run.mjs:750` looks for "Forget Test" and needs fixtures `~/Test` doesn't hold) stays outside Properties.
3. **P16's Seat:** its interleavings (Cards' ghost hold, the table's title passthrough, `lastOpened` keying) are designed in its tasks during planning; its delta is checked against −170 at its Review Checkpoint.
4. **Measurement Outcomes:** F3, K, 07-10, and 02-10 run their rules in P6, P14, and P15; a failed threshold becomes an LC-44 row.
5. **Sources:** the four planning scouts, the decision log, the Investigation, the Walkthrough, `BRIEF.md`, and the Archive precedent's Findings and *§Process Overview* were read in full. *Properties Restructure — Scout Reports* (376 KB) wasn't read; it's backup evidence behind the Investigation, and every cite this document leans on was taken from a planning scout's HEAD read or opened at HEAD for this document. A reviewer who finds a Scout Reports claim that contradicts a call here checks it against the code, and the code wins.
