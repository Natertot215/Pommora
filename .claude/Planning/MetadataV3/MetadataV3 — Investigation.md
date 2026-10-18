### MetadataV3 — Investigation

**DATE:** 10-17-2026
**HEAD:** `3d191b895`, verified against the working tree at that commit. A parallel session had uncommitted edits in seven cited files, each marked † where it's cited: `Core/Nexus/cascade.ts`, `Core/Nexus/fileEvents.ts`, `Core/Nexus/handlers.ts`, `Core/Nexus/mutate.ts`, `Core/Nexus/settle.ts`, `Core/Trash/spend.ts`, and `.claude/IssuesPM.md`. Line numbers in those files are from the working tree at the last check, and they continue to move.

This document reconciles four scout reports written between `74b4ff18f` and `3d191b895` (key side, option side, index and sweeps, interop and data) with the earlier *MetadataV3 — Scout Findings* written at `e6e851183`. It checks each load-bearing claim against the code, merges the findings the reports share, settles their disagreements against the evidence, and adds sites none of them named. It classifies the code against *MetadataV3 — Decisions & Intention*: properties and options match exactly on page frontmatter and Space sidecars alike, under one stored `key` per property and per option, spelled from a stored `label` by the Key Format and Value Format; Context `<Title>:` keys and the Space titles under them match exactly as titled and get no format; property and option labels and keys, and Context and Space titles, stay unique without regard to case; format changes ride the existing rename and option-rename paths; configuration names options by label; and a page restored from the Trash has its keys and option words matched to the current properties whatever casing or format spelled them and re-spelled into their current keys, while live reads and repair-on-open stay exact. It records what is true and the approaches weighed, each naming the decision that settles it, and makes no decisions of its own.

---

#### What's True

##### Key Identity Today

**One Primitive:** every key comparison folds through `foldKey`, which lowercases and then NFC-normalizes (`Core/Paths/caseFold.ts:7-9`). `normalizeTitle` stringifies, trims, and then folds (`caseFold.ts:12-14`), and `spellings` returns every name that folds to a given one, the exact spelling first (`caseFold.ts:17-21`). The fold is locale-pinned through `toLowerCase` (`caseFold.ts:1-2`). Property titles are stored trimmed and NFC-normalized but unfolded (`Core/Properties/properties.ts:272-274`) and folded only when compared (`Core/Properties/schema.ts:46-47`). The same file holds the title collator and the search matchers (`caseFold.ts:23-102`).

**Name to Definition:** `byFoldedName` maps a folded title to its definition through `new Map`, so the last of two fold-alike definitions wins (`properties.ts:49-50`). Registry admission admits only the first definition per folded title (`Core/Properties/propertiesRegistry.ts:29-37`), so the two orders never meet on admitted data.

**Definition to Held Key:** `heldKey` answers the exact spelling first, then the first key in root order that folds to the name (`Core/Files/heldKeys.ts:11-12`). `heldValue` joins every spelling's members for a list-holding property, through its own `foldKey` filter in root order rather than through `spellings` (`heldKeys.ts:15-26`). A property holds a list when its kind is Multi-Select or File (`properties.ts:66-69`). `writeTarget` collapses two or more held spellings into the name (`heldKeys.ts:34-39`), and `stripHeld`, `editHeldList`, and `rekeyHeld` act on every spelling (`heldKeys.ts:61-110`).

**Pages and Space Sidecars:** a page's property keys resolve through the page world, built from the owning Collection's assigned definitions keyed by `byFoldedName` (`Core/Contexts/contextWrite.ts:70-74`; `Core/Properties/assignment.ts:33-46`). A Space's property keys resolve through `spaceWorldOf`, which keys the whole registry the same way (`Core/Contexts/contextResolve.ts:57-59`). Both hosts use one property title as the key, so the host-blind functions below apply one rule to both. The mutate dispatch routes a value write by `isMarkdownFile(req.path)` (`Core/Nexus/mutate.ts:178-180`†).

**Host-Blind Functions:** `writtenRoot` (`Core/Properties/governedWrite.ts:16-21`), `heldPropertyValue` (`Core/Properties/propertyValue.ts:241-244`), `reconcileGovernedRoot` (`contextResolve.ts:111-157`), `valueEditRewrite` (`Core/Properties/pageValue.ts:36-43`), `stripHeld` (`heldKeys.ts:87-90`), `applyValueAtRoot` (`propertyValue.ts:247-256`), and `resolveFieldValue` (`Core/Properties/value.ts:37-61`). A `ViewRow` carries no host field (`Core/Views/viewRow.ts:17-27`), and `spaceRowOf` dresses a Space as a row by spreading its values and stamping `ID_KEY` (`Core/Properties/pageRow.ts:31-49`).

**Fan-Outs That Send One Rewrite to Both Hosts:**
- `refillValues` through `sweepRootsById` (`assignment.ts:49-67`; `Core/Properties/governedSweep.ts:146-170`), from property restore (`Core/Trash/restoreProperty.ts:63,71`), Link restore (`Core/Trash/spend.ts:275`†), and re-assignment (`assignment.ts:100`).
- `stripAndRemove` (`Core/Properties/deleteProperty.ts:119-123`).
- `valueEditSweep` with `{ raw, sidecars: raw }` (`Core/Properties/optionOps.ts:199-200`) and `optionHolders` (`optionOps.ts:276-283`).
- `deleteCascade` and `renameCascade` through `spaceArm` (`Core/Nexus/cascade.ts:56,117,196,211`†).
- `refillTrashed` (`Core/Trash/holdings.ts:136-147`) and `scrubReturning`'s `links` map (`Core/Trash/restoreScrub.ts:35,38-50`).
- `renameSweep`, whose page arm and sidecar arm share one `oldName`/`def.name` pair, the sidecar arm also renaming the Space `$order` entry (`Core/Properties/registryProperty.ts:82-98`).

**Context Keys:** a `<Title>:` key resolves through `governorOf`'s Context branch (`contextResolve.ts:96-97`) and always joins its spellings (`contextResolve.ts:100`). `contextWorldOf` keys Context titles by `foldKey` and Space titles by `normalizeTitle` (`contextResolve.ts:33-35`), `groupOf` folds the parsed title (`contextResolve.ts:61-65`), and `contextTitles` reads each member of a Context value as a trimmed, folded title (`Core/Contexts/contexts.ts:37-39`). The Context cascades rename keys through `rekeyHeld` and `renameFrontmatterKey` with the `merge` rule and joining (`Core/Contexts/contextCascade.ts:36-43,85-90`), retitle a Space through a joined, folded list edit (`contextCascade.ts:45-48`), unlink through `heldKeys` and a folded member match (`contextCascade.ts:132-149,151-169`), and skip a case-only retitle entirely (`contextCascade.ts:116-119`). A Space-to-Space link write joins spellings and matches the far title folded (`contextWrite.ts:99-110`), and the Trash re-tag collapses and joins (`spend.ts:292-302`†).

**Title Checks on Contexts and Spaces:** a Context or Space title is a folder name (`contexts.ts:16`), clashes are refused by folded title (`contextCascade.ts:214,222,273,319`), and `recase` re-spells a folder whose case alone changed on a case-insensitive disk (`Core/Files/atomicWrite.ts:325-334`), reading directory entries through `heldName` and `spellings` (`atomicWrite.ts:320-323`).

**Writers That Spell a Key From `def.name`:** `createPage` (`Core/Nexus/page.ts:36-37`), `updatePageProperty` (`page.ts:106`), `setSpaceProperty` (`Core/Properties/setProperty.ts:26,28`), `refillValues` (`assignment.ts:63`), `refillTrashed` through `spend.ts:281`†, `renameSweep` (`registryProperty.ts:91-95`), `valueEditRewrite` (`pageValue.ts:42`), `stripAndRemove` and `removeProperty` (`deleteProperty.ts:96,106`; `Core/Properties/removeProperty.ts:34,55`), `applyValueAtRoot` (`propertyValue.ts:254`), and `rekeyOverrides` (`Core/Views/Host/useContainerValues.ts:16-27`), which the rename reply's titles feed (`Core/Properties/Schema/PropertyFrame.tsx:237`; `Core/Session/cacheSlice.ts:55-58`).

**Readers That Use `def.name` as a Key:** `resolveFieldValue` (`value.ts:57`), the PropertyPanel `held` check (`Core/Properties/PropertyPanel.tsx:213-216`), the Matrix filter's `answers` for Space rows (`Core/Matrix/matrixInput.ts:98`), `keyedHolders` (`Core/Properties/keyHolders.ts:59`), the delete snapshot's sidecar loop (`deleteProperty.ts:62`), the delete cascade's dedupe (`cascade.ts:125`†), and `renameCascade`'s cache gate `defs.filter((d) => holds(d.name))` (`cascade.ts:218`†). That gate passes a title to `linkKeysOf`'s key predicate; once the predicate answers by stored key, a title that isn't a key falls through to the foreign rule and answers true (`schema.ts:34`), so the gate would admit non-Link properties.

**Readers That Use `def.name` as a Title:** the Trash row (`Core/Trash/trashRows.ts:59`), the type picker (`Core/Properties/Cells/PropertyTypes.tsx:88`), the property list and editor header (`PropertyFrame.tsx:98,151,157,420`), and the property picker (`Core/Properties/Pickers/PropertyPicker.tsx:150`).

**Key-Independent Writers:** `setBanner` writes the literal `banner` with no world (`Core/Pages/setBanner.ts:29`; `governedWrite.ts:34`), `createPage` writes `ID` (`page.ts:30`), and the asset migration reads and writes whatever exact key a slot sits under (`Core/Assets/assetMigrate.ts:142-151`). No code path moves a property value between a page and a Space: creation seeds are decoded values keyed by property id (`page.ts:32-37`), and Trash records key values by holder id (`restoreProperty.ts:62-63`).

##### Option Identity and References

**The Option:** an option is `{value, icon?, color?, appearance?}`, with `group_id` for Status (`properties.ts:133-156`); `value` is at once its title, its word on disk, and its identity, and no option id exists (`Core/Properties/replaySchemaCascade.ts:83`). Status groups carry a `label` (`properties.ts:158-165`), Context picks split `{value: spaceId, label: title}` (`Core/Contexts/contextOptions.ts:31-36`), and `PickOption` has both slots (`properties.ts:284`), which options fill with one word (`PropertyPicker.tsx:73`). `stored()` strips a leftover option `label` on every option write (`properties.ts:308-311`).

**Exact Inside the Registry:** option edits compare `o.value` exactly (`Core/Properties/optionModel.ts:12,53,57`; `optionOps.ts:63,179,235`), and so does display (`Core/Properties/Cells/cellResolve.ts:4`; `Core/Properties/Cells/OptionChip.tsx:28`; `Core/Views/Settings/OptionOrderList.tsx:71`; `Core/Views/Settings/GroupFrame.tsx:375`).

**Folded at Decode:** `optionsByFold` caches folded title to title per definition through `firstPerTitle`, first wins (`propertyValue.ts:46-56`; `properties.ts:53-63`), and `registeredOption` reads it (`propertyValue.ts:59-60`). A Select or Status keeps the last element that names a registered option and drops an unregistered one (`propertyValue.ts:101-107`). A Multi-Select dedupes by fold, maps a registered member to its title, and keeps an unregistered one verbatim (`propertyValue.ts:108-112`). An outside numeral still names an option, since `optionList` reads scalars through `normalizeTitle` (`propertyValue.ts:42-44`).

**Folded Member Matching:** `memberKey` compares a scalar member by `normalizeTitle` (`heldKeys.ts:51`), and three helpers build on it: `joinValues` (`heldKeys.ts:54-58`), `namesValue`, which `editList` and `stripList` use (`pageValue.ts:11-34`), and the reconcile's `memberCount` (`contextResolve.ts:108`). `editList` serves page and sidecar values, Context values, `property_cache` blocks, saved-view operands and orders, and Space `$order` lists (`pageValue.ts:42`; `contextCascade.ts:45-48`; `Core/Nexus/configReach.ts:142-159,308-320`; `Core/Contexts/spaceSidecar.ts:98-114`). A `Matcher` type for a caller-supplied match already exists (`pageValue.ts:9`).

**Where an Option Word Is Stored Outside the File That Holds It:**

| Site | Location | What It Holds | Matched |
| --- | --- | --- | --- |
| View filter operands | `views[].filter` (`Core/Views/filterRules.ts:10-15`) | Titles | Cascade folds (`configReach.ts:142-145`); Select evaluates folded, Multi-Select exactly (`Core/Views/Pipeline/filter.ts:83,244-267,269-286`) |
| Sort and group `order` | `Core/Views/views.ts:62-67,75-79` | Titles | Cascade folds (`configReach.ts:155-159`); evaluation exact (`Core/Views/Pipeline/sort.ts:82-94`; `Core/Views/Pipeline/group.ts:209-229`) |
| `collapsed_groups`, `hidden_groups` | `views.ts:176,178` | Titles inside bucket keys | Exact (`configReach.ts:161-172`; `views.ts:359-375`) |
| View Tiles | `_tiles.json` view configs | As views | As views (`configReach.ts:376-383`) |
| Matrix filter | `.nexus/matrix.json` | Titles | Cascade folds (`configReach.ts:385-388`); one rule evaluates pages and Spaces (`matrixInput.ts:116-133`) |
| `openInPreview` | `settings.json` | Rule operands | The reach exists (`configReach.ts:389-399`), and no registry property can be targeted there (`Core/Navigation/previewRules.ts:26,31-37`) |
| Collection `property_cache` | Collection sidecar, written by Remove (`removeProperty.ts:41-50`) | Raw page words by property id and page id | Cascade folds (`configReach.ts:308-320,367`) |
| Property Trash bundle | `.trash` record (`Core/Trash/record.ts:54-63`) | The whole definition plus raw values by holder id (`deleteProperty.ts:33-76`) | Fold on restore (`restoreProperty.ts:71`; `assignment.ts:57`) |
| Trashed pages and containers | `.trash` | Raw frontmatter, views, and caches | Reached by no cascade (`keyHolders.ts:14-20`; `configReach.ts:332-337`) |
| Schema journal | `.nexus/` slot (`Core/Properties/propertyJournal.ts:8-12`) | `option-rename {from, to}`, `option-remove {value}` | Gate exact (`replaySchemaCascade.ts:74-93`); the cascade it drives folds |
| Renderer override | `Core/Properties/valueOverride.ts:5-41` | Patched raw frontmatter from `applyValueAtRoot` | Depends on the fold (`propertyValue.ts:246`) |
| Undo stack | `Core/Properties/assignValue.ts:71-72,82-91` | The decoded prior value | n/a |
| Creation seeds | `Core/Views/Pipeline/creationSeeds.ts:20-43` | A decoded value from an operand or bucket key | n/a |

`column_styles` holds looks and formats per property id and no option words (`Core/Properties/columnStyles.ts:76-85`).

##### The Read/Write Chain

**Read:**
1. Frontmatter is parsed and indexed whole, registered or not (`Core/Index/indexSeed.ts:39-58`), and values reach the renderer through `view:loadValues` (`pageRow.ts:52-58`).
2. `heldPropertyValue` picks the held key or joins list spellings (`propertyValue.ts:241-244`).
3. `decodeValue` turns the held value into a `PropertyValue` (`propertyValue.ts:83-126`).
4. `resolveFieldValue` memoizes per frontmatter object and definition (`value.ts:50-64`) and serves every cell, card, filter, sort, group, panel row, and Matrix row, Space rows included.

**Write:**
1. A pick builds the next value (`PropertyPicker.tsx:397-406`); a Multi-Select toggle keeps unregistered verbatim members (`PropertyPicker.tsx:60-65,86-87`).
2. The renderer lands an optimistic copy through `applyValueAtRoot` (`assignValue.ts:41`; `propertyValue.ts:247-256`), also used for view-row creation (`Core/Views/Host/useViewCreation.ts:53`).
3. The host encodes (`propertyValue.ts:192-214`, Select as `[value]` at `:195`) and calls `writtenRoot` through `setGovernedRootKey` (`governedWrite.ts:23-42`; `page.ts:106`) or directly for a Space (`setProperty.ts:28`).
4. `writtenRoot` collapses every held spelling (`governedWrite.ts:17`), reconciles every other governed key on the root while skipping the target (`governedWrite.ts:18`; `contextResolve.ts:121`), and spells the value through `writtenSpelling` (`governedWrite.ts:19`).
5. `writtenSpelling` keeps checkbox words, number shapes, and each list member's held spelling where exactly one held member folds to it (`propertyValue.ts:177-190`).
6. `mergeFrontmatter` writes the changed keys; `mergeInto` puts a written key in the place of a dropped spelling of itself, and `nodeSpelledAs` carries quote and flow style (`Core/Files/pageFile.ts:143-191`).

**Context Writes Reconcile Properties Too:** a page Context write goes through `setGovernedRootKey` with the page world (`contextWrite.ts:61-65`), so it reconciles every governed property key on the page.

**Repair:** `reconcileGovernedRoot` re-encodes each governed value (`contextResolve.ts:129-131`), keeps file spellings through `writtenSpelling` (`contextResolve.ts:149`), never shrinks a live value by folded member count (`contextResolve.ts:108,137-141`), and joins and retires extra spellings (`contextResolve.ts:142-148`). It's the engine of every governed write, the repair-on-open sweep (`Core/Properties/repairSweep.ts:37-41`, pages only, gated by `repairOnOpen` at `:20`), and the restore scrub (`restoreScrub.ts:55,75`).

**An In-App Edit Drops an Unregistered Select or Status Word:** decode drops it (`propertyValue.ts:104`), the pick writes `[value]` (`propertyValue.ts:195`), the reconcile skips the target key so the never-shrink guard doesn't apply (`governedWrite.ts:17-18`; `contextResolve.ts:121`), and undo writes the null prior back (`assignValue.ts:71-72,85`).

**A Recognized Variant Survives a Write:** `writtenSpelling` keeps a held member that folds to the written one (`propertyValue.ts:184-189`), and the reconcile and the refill call it the same way (`contextResolve.ts:149`; `assignment.ts:64`). Under exact keys this fold arm would re-land a foreign case variant: with an UPPERCASE Value Format, label `Red`, key `RED`, and a held `red`, a pick of `Red` encodes `RED` and the write lands `red`.

**Adoption:** only Multi-Select adopts, behind three type gates (`propertyValue.ts:131-133`; `optionOps.ts:113-115`; `Core/Nexus/fileEvents.ts:520-521`†). Status couldn't adopt with the gates lifted, since adoption appends through `addOption(g, SELECT_GROUP, v)` (`optionOps.ts:138`) and `addOption` leaves groups untouched when no group id matches (`optionModel.ts:31-32`). Adoption runs when a Collection gains a property (`fileEvents.ts:425-426`†), on any Space change (`fileEvents.ts:432`†), when a definition becomes a Multi-Select or its folded title changes (`fileEvents.ts:513-530`†), at each settle (`Core/Nexus/settle.ts:116,149`†), and on open after the replay and the repair sweep (`Core/Nexus/handlers.ts:104-107`†). It skips only an owed `option-rename`'s old word (`optionOps.ts:125-135`). The 10-07 ruling scoped adoption to Multi-Select without a stated reason for excluding Select and Status (`.claude/sessions/10-07-2026-Text-Properties-Implementation.md:2702`).

##### Uniqueness and Reserved Keys

**Titles:** `validateName` refuses a folded clash (`schema.ts:39-50`), admission admits the first definition per folded title (`propertiesRegistry.ts:29-37`), and `freeName` steps aside on folded titles (`Core/Paths/names.ts:56-64`, from `registryProperty.ts:53-56`). Context and Space titles are held unique by folded title (`contextCascade.ts:222,273`).

**Reserved Keys:** `keyRefusal` rejects an empty name, a `$` or `<` prefix, and any folded member of `PAGE_MODELED_KEYS` (`ID`, `banner`) or `SPACE_MODELED_KEYS` (`id`, `$icon`, `banner`, `heading_icon_hidden`, `$color`) (`schema.ts:17-27`; `Core/Nexus/identityMark.ts:11`; `spaceSidecar.ts:18-24`). It runs from `validateName`, admission, and `linkKeysOf`'s foreign rule (`schema.ts:34,44`; `propertiesRegistry.ts:34`). Pommora's readers of modeled keys are exact on pages (`identityMark.ts:34`; `Core/Pages/pageDetail.ts:13`) and on sidecars (`spaceSidecar.ts:73`). The fold in the refusal guards today's folded sidecar reads: a property titled `Banner` would fold-read a Space's `banner`, and one titled `Id` the `ID` that `spaceRowOf` stamps (`pageRow.ts:37`).

**Options:** `validateOptionValues` requires titles non-blank and fold-unique (`schema.ts:85-91`). It runs from `editOption` (`optionOps.ts:83`), `renameOption` (`optionOps.ts:239`), and `validateDefinition`, which checks `select_options` for Select and Multi-Select and skips Status (`schema.ts:64-67`; `properties.ts:39-41`). `withUniqueOptions` keeps the first of each fold-alike set at every admission (`propertiesRegistry.ts:36`) and before every option edit (`optionOps.ts:58`), so a Status created with fold-alike options reads deduplicated. Adoption dedupes its batch by fold and runs no validation after appending (`optionOps.ts:133-139`).

##### Confirmations and Counts

**One Channel, Two Counters:** `property:holders` routes to `propertyHolders` without a value and `optionHolders` with one (`Core/Properties/handlers.ts:181-185`), outside the schema lock.
- **Delete:** `confirmedKeyHolders` counts pages under every Collection folder holding the key in any casing, re-read from disk, plus every Space sidecar holding it (`deleteProperty.ts:80-84`; `keyHolders.ts:23-41`). An unreadable page counts when the index named it (`keyHolders.ts:33`). The count includes ID-less and duplicate-ID pages the strip leaves alone (`keyHolders.ts:60-64,71`; `deleteProperty.ts:106`) and omits a Space touched only for its `$order` entry (`deleteProperty.ts:122`; `spaceSidecar.ts:98-114`).
- **Clear and Remove:** a dry run of the strip over the page holders plus every Space sidecar (`optionOps.ts:269-285`), matching the sweep for files (`optionOps.ts:189-200`); Remove's config reach isn't counted (`optionOps.ts:203-213`).

**The Dialog Always Asks:** `askHolding` shows the dialog at any count (`Core/Interface/Confirm/confirmations.ts:109-116`), called by `askDestroyProperty` (`PropertyFrame.tsx:279`), `askClearOption`, and `askRemoveOption` (`Core/Properties/Schema/useOptionEdit.tsx:110,114`). The Option Picker Drive asserts the zero-count Remove dialog (`.claude/scripts/Option Picker Drive/live-drive.mjs:174`), and a unit test asserts the wording (`Core/Interface/Confirm/confirmations.test.ts:57-59`).

**Wording:** confirmations count Items (`confirmations.ts:107`), while the rename refusal and every unswept notice say files (`properties.ts:268-269`; `governedSweep.ts:30-31`), for counts that include Space sidecars.

**A Dry-Run Counter Fits Beside the Sweep:** `rewriteRaw` and `changedKeys` already decide whether a rewrite changes anything (`governedSweep.ts:43-56`), and `rewriteRaw` is module-private. `editList`'s replace answers a non-null list whenever any element matches, even when nothing changes (`pageValue.ts:26-33`), so a count built on non-null results would overcount a no-op format change.

##### Sweeps and the Journal

**The Engine:** `sweepGovernedRoots` rewrites each file under its own lock, preserves page times, and runs the sidecar arm over every Space sidecar (`governedSweep.ts:59-109`). `optionCascade` runs one full holder walk, one full sidecar walk, and one config pass per option (`optionOps.ts:203-213`; `configReach.ts:339-403`). `valueEditRewrite` takes one target and one edit (`pageValue.ts:36-43`), and `editList`'s replace dedupes onto `edit.to` (`pageValue.ts:30-31`).

**The Property Rename:** `renameProperty` validates, refuses files holding both keys unless the change is case-only, writes the journal, commits the registry, sweeps unless case-only, and clears the journal when nothing was skipped (`registryProperty.ts:111-154`). The case-only test is `normalizeTitle(to) === normalizeTitle(prior.name)` (`registryProperty.ts:125`), and it skips both the clash check and the sweep (`registryProperty.ts:126,150`). A case-only option rename sweeps every holder (`pageValue.ts:24-31`; `optionOps.ts:250`). The journal write's boolean is ignored, so a rename proceeds unjournaled when the slot holds another record (`registryProperty.ts:130`).

**`editProperty` Takes Any Field but `id` and `name`:** it writes the registry alone (`registryProperty.ts:156-173`), and every `defEditOp` channel funnels into it (`handlers.ts:121-134`). A format field patched through it would re-key every holder with no sweep.

**The YAML Rename on a Case-Only Pair:** `renameFrontmatterKey` resolves both the old key and the rival through `spellings` (`pageFile.ts:221-225`). For a pair such as `name` → `Name`, both resolve to the same node on a file holding either spelling, and `prefer-new` drops that node (`pageFile.ts:229-230`), deleting the key from every holder. The JSON twin keeps the key unchanged in the same case (`heldKeys.ts:102-106`). Today's case-only skips keep the path unreached (`registryProperty.ts:150`; `contextCascade.ts:116-119`).

**The Journal:** one slot (`Core/Properties/journalSlot.ts:14-49`) holds a four-op union with an arm each in `sameRecord`, `decodeSchemaJournal`, and `replay` (`propertyJournal.ts:8-43`; `replaySchemaCascade.ts:43-95`). A write that would displace a different record returns false (`journalSlot.ts:37`); the slot accepts an optional `supersedes` rule the schema journal doesn't pass (`journalSlot.ts:19`; `propertyJournal.ts:45`). Records are intent, and replay re-derives the target files from disk (`propertyJournal.ts:1`); the `rename` and `option-rename` records name both words (`propertyJournal.ts:9,11`). Try Again hands any owed record to `property:replay` (`Core/Properties/propertyWrite.ts:10-24`; `handlers.ts:159-163`).

**The Replay Gate Folds:** `named` compares titles by `normalizeTitle` (`replaySchemaCascade.ts:38-41`). The rename arm returns `NO_REACH` when any definition is `named(from)` (`replaySchemaCascade.ts:53`), so an owed rename whose words differ only in case would match the renamed definition itself and clear its record. The delete arm's `crashed` and `freed` fold the same way (`replaySchemaCascade.ts:60-61`), and replay sweeps to `def.name` (`replaySchemaCascade.ts:55,64`).

**Create Supersede:** a create landing under a journaled delete's folded title, or its id, clears that record (`registryProperty.ts:68-76`).

##### The Index

**`page_values`:** every frontmatter key of every indexed page, as spelled, with `fold` and the JSON value; primary key `(path, key)` and one secondary index, `page_values_by_fold` (`Desktop/Store/ddl.ts:34-41`). Rows are written with `foldKey(key)` (`Desktop/Store/stores.ts:58-60,72-73`).

**`queryKeyHolders`:** `SELECT DISTINCT path FROM page_values WHERE fold = ?` (`stores.ts:158-164`). The memory double re-folds every row (`Core/Testing/memoryStores.ts:176-181`), the shared contract test asserts folded lookups (`Core/Testing/storesContract.ts:141-142`), and without an index callers walk the corpus (`keyHolders.ts:19,29-30`). Property queries and Context queries share it: `queryMembers` without a title is `queryKeyHolders` (`Core/Index/contentIndex.ts:84-89`), reached from a whole-Context rename and a Context delete's unlink (`contextCascade.ts:64-77,121-124,132-149`).

**Space Relations:** `space` rows carry `qualifier = foldKey(key)` and one row per Space title the value names, the titles folded by `contextTitles` (`indexSeed.ts:62-69`; `contexts.ts:37-39`), and `queryMembers` with a title matches both (`stores.ts:165-173`). A Context key naming no Space has no relation row.

**Exact Lookups Already Exist:** `readPageRelations` narrows by `AND key = ?` (`stores.ts:145-148`), and value-link rows keep the key as spelled (`indexSeed.ts:56`).

**Generations:** `INDEX_GENERATION` is 18, the DDL runs on every open, and only a generation mismatch drops the index tables (`ddl.ts:3,80-92`), so an added `CREATE INDEX IF NOT EXISTS` lands without a bump and a changed column needs one. A `key`-only predicate can't use the primary key's index, whose leading column is `path` (`ddl.ts:39`). Nothing on disk carries a schema version (`.claude/Features/CorePM.md:110`).

**Scope:** key-holder queries are intersected with Collection folders (`keyHolders.ts:14-20`; `assignment.ts:156-160`), so pages outside every Collection are never swept.

##### Trash

**No Cascade Reaches `.trash`:** page holders come from the content corpus, and `.trash` is a hidden folder outside it (`Core/Paths/exclusion.ts:79`); Space sidecars come from `.nexus/contexts` (`spaceSidecar.ts:51-57`); `reachConfig` walks only live containers (`configReach.ts:332-337`).

**Restores:** a page or container restore runs `scrubReturning` (`spend.ts:190-197`†), which reconciles each page against the destination's page world and each sidecar against the Space world (`restoreScrub.ts:25-82`), skipping a Context key in transit by `heldKeys` (`restoreScrub.ts:74`). A property restore re-creates the definition through `createProperty`, which can step the title aside (`restoreProperty.ts:41`; `registryProperty.ts:53-56`), then `refillValues` lands each value with `writeTarget(raw, def.name, holdsList(def))` and keeps the record's spelling (`assignment.ts:56-66`). The property bundle carries the definition whole (`record.ts:58`). `refillTrashed` writes Link values back into trashed copies under `def.name`, never collapsing (`holdings.ts:129-148`; `spend.ts:281`†).

**On Disk:** NexusOS's `.trash` holds 254 Markdown files and five deleted-property records; `~/Test`'s holds one deleted-property record.

##### Interop

**Sapphire:** `norm` lowercases and trims, and `resolveKey` answers the exact key first, else the first key whose lowercase matches (`Sapphire/src/core/store/caseFold.ts:3-14`). Every frontmatter write resolves to the key the note already holds and reuses its raw spelling (`Sapphire/src/core/frontmatter/frontmatterSplice.ts:38,48`), and `assignProp` treats a note holding a case variant as assigned (`Sapphire/src/automations/actions.ts:81`). Its option manager matches values exactly, and its conditions fold case but not separators (`Sapphire/src/properties/options/rename.ts:38-41`; `Sapphire/src/core/rules/evaluate.ts:5,13-26`). Its only Pommora awareness is hiding `<…>` keys (`Sapphire/src/core/store/store.ts:17,248-251`).

**Obsidian:** In Obsidian 1.14.4, `getPropertyInfo`, `rebuildProperties`, and `setType` key property types by the lowercased name. The metadata editor's `handleUpdateKey` refuses a key that matches another key on the note once both are lowercased ("Property already exists"). Bases reads frontmatter through `getInsensitive`, and tag lookups through an exact-first, then case-blind key match. A Bases property's `displayName` keeps a display name apart from its key. All of these are in `~/Library/Application Support/obsidian/obsidian-1.14.4.asar`.

**YAML:** Pommora writes with `yaml@2.9.0` under the default 1.2 core schema (`pageFile.ts:90,105-108`). Spaced, hyphenated, underscored, accented, and CJK keys write bare, as do `on`, `yes`, `No`, `y`, and `n`; `null`, `true`, `~`, numerals, and indicator characters are quoted; an empty key writes in the complex-key form `? ""` (Scout 4's `yamltest.mjs`, re-run 10-17-2026). `nodeSpelledAs` keeps a held quote style for an equal string (`pageFile.ts:143-161`).

**Sync:** the wire carries paths, mtimes, sizes, and hashes with no property keys (`Core/Sync/Contract/wire.ts:82-110`), Markdown lands whole (`Core/Sync/Arrival/land.ts:45-46`), and `properties.json` merges per definition and per field (`Core/Sync/Arrival/mergePolicy.ts:32-33`; `.claude/IssuesPM.md:198`†). Scout 3 found no Sync binding in either Nexus's `nexus.db` (the binding is `readValue('sync')`, `Core/Sync/handlers.ts:73`).

##### Real Data

**NexusOS:** 607 Markdown files, 606 with parseable frontmatter; 15 definitions, 14 in `order` (`Status` is unordered); 59 options, 28 carrying a leftover `label` equal to `value`.
- **Case-Variant Property Keys:** three registered properties are held under a lowercase spelling: `tags` on 337 pages (with `Tags` on 2, both in `Studio`), `description` on 15, and `version` on 29. No page holds two spellings of one key.
- **Option Words:** every held option word equals a registered title exactly, apart from two unregistered Tags members (`Events`, `Guide`) and one blank Status.
- **Context Values:** every Context value on NexusOS pages matches its Space title exactly (*Decisions & Intention*, A-2).
- **Separators:** no key or option word differs from a registered one by separators alone.
- **Space Sidecars:** 10, none holding a property value.
- **Foreign Keys:** `Priority` on 18 pages and `name` on 3.

**`~/Test`:** 33 pages, every held key and option word in registered spelling; one Space holds eight property values in registered casing.

---

#### What Leaves, Narrows, and Changes

**Classification:** *Leaves* means the mechanism exists only for folded metadata identity, so nothing calls it once property keys, option words, Context keys, and Space titles under them all match exactly. *Narrows* means it survives only for uniqueness, the reserved-key refusal, the restore's match, configuration references, search, sort, or file names. *Changes* means it stays and matches by stored key or exact title. *Stays* means it's independent of metadata identity.

| Mechanism | Location | Today | Under the Decisions | Note |
| --- | --- | --- | --- | --- |
| `foldKey`, `normalizeTitle` | `caseFold.ts:7-14` | Every fold | Narrows | Uniqueness, the reserved-key refusal, the restore's match, configuration references, search, sort, paths, and Sync paths keep them. |
| `spellings` | `caseFold.ts:17-21` | Key and file-name spellings | Narrows | Its last caller reads directory entries (`atomicWrite.ts:322`). |
| `compareTitles`, `matchQuery`, `rankMatches` | `caseFold.ts:23-102` | Title sort and search | Stays | |
| `byFoldedName` | `properties.ts:49-50` | Folded title to definition | Leaves | A map by stored key replaces it at `assignment.ts:41,45`, `contextResolve.ts:59`, `schema.ts:31`, `cascade.ts:80`†, and `restoreScrub.ts:35`. |
| `holdsList` | `properties.ts:66-69` | Whether spellings join | Leaves | Every caller joins spellings (`contextResolve.ts:100`; `propertyValue.ts:244`; `registryProperty.ts:89`; `pageValue.ts:42`; `assignment.ts:63`). |
| `firstPerTitle` | `properties.ts:53-63` | Folded title map | Narrows | Label uniqueness keeps it (`schema.ts:76`); decode matches by stored key instead (`propertyValue.ts:52,110`). |
| `stored()` label strip | `properties.ts:308-311` | Drops a leftover option `label` | Leaves | Every option stores `label` (C-2). |
| Option and definition fields | `properties.ts:133-171` | `name`; option `value` | Changes | `label` and `key` on both (C-2). |
| `heldKeys`, `heldKey` | `heldKeys.ts:8-12` | Exact then fold | Leaves | Callers read `Object.hasOwn(root, key)`. |
| `heldValue` | `heldKeys.ts:15-26` | Read one spelling or join all | Leaves | A read is `root[key]`. |
| `writeTarget` | `heldKeys.ts:28-39` | Where a write lands among spellings | Leaves | A write lands on the key. |
| `landValue` | `heldKeys.ts:42-48` | Write a key, retiring governed spellings | Changes | Nothing else is governed. |
| `memberKey` | `heldKeys.ts:51` | Folded member identity | Changes | Members compare with regard to case; trimming, numeral stringification, and NFC stay (A-3). |
| `joinValues` | `heldKeys.ts:54-58` | Folded member join | Changes | Still joins a `merge` rival's list on a Context rename. |
| `editHeldList` | `heldKeys.ts:61-78` | Joined or per-spelling list edit | Changes | Reduces to an edit of the list under one key. |
| `stripKeys` | `heldKeys.ts:81-84` | Exact strip | Stays | |
| `stripHeld` | `heldKeys.ts:87-90` | Strip every spelling | Leaves | `stripKeys(root, [key])`. |
| `rekeyHeld` | `heldKeys.ts:95-110` | JSON rename over spellings | Changes | An exact move plus the rival rule. |
| `renameFrontmatterKey` | `pageFile.ts:208-243` | YAML rename over spellings | Changes | Exact `held`; the variants and the `join` parameter go, the rival rule stays. |
| `mergeInto` spelling step | `pageFile.ts:171-177,181` | A written key takes a dropped spelling's place | Leaves | Only collapses reach it. |
| `nodeSpelledAs` | `pageFile.ts:143-161` | Quote and flow style | Stays | A-3. |
| `governorOf` | `contextResolve.ts:93-98` | Folded lookup; `name: def.name` | Changes | Exact by stored key, with the key as `name` (`:95`); the Context branch looks up the exact title. |
| `joins`, `joinsSpellings` | `contextResolve.ts:100-106` | Whether a governed key joins | Leaves | |
| `reconcileGovernedRoot` | `contextResolve.ts:111-157` | Reconcile every governed key | Changes | The held-key check (`:122`) and the join-and-retire branch (`:142-148`) go; re-encoding and the never-shrink guard stay, counting exactly (`:108`). |
| `contextWorldOf` title maps | `contextResolve.ts:28-41` | Folded Context and Space titles | Changes | Exact titles for metadata reads. |
| `groupOf`, `resolveContextKeys` | `contextResolve.ts:61-84` | Folded key, joined value | Changes | |
| `contextTitles` | `contexts.ts:37-39` | Trimmed, folded member titles | Changes | Feeds resolution, the reconcile, and the index. |
| Context cascades | `contextCascade.ts:36-169` | Folded keys and titles | Changes | `rekeyContext`, `retitleSpace`, `sweepMembers`, `pageLeg`, and both unlinks match exactly. |
| Context case-only skip | `contextCascade.ts:116-119` | A case-only retitle sweeps nothing | Leaves | A case-only retitle changes `<Title>:` keys and Space-title values; `recase` re-spells the folder (`atomicWrite.ts:325-334`). |
| Context and Space title clashes | `contextCascade.ts:214,222,273,319`; `contexts.ts:16` | Folded | Narrows | Title uniqueness (D-1, D-2, D-3). |
| `setSpaceContext` | `contextWrite.ts:99-110` | Joined read, folded far title | Changes | |
| Trash re-tag `reapply` | `spend.ts:292-302`† | Collapse and folded join | Changes | |
| `heldPropertyValue` | `propertyValue.ts:241-244` | Read by title, joined | Changes | Reads `root[def.key]` on both hosts. |
| `optionsByFold`, `registeredOption` | `propertyValue.ts:46-60` | Folded title map | Changes | A per-definition map from stored key to label. |
| Multi-Select fold dedupe | `propertyValue.ts:108-112` | Folded | Changes | Exact. |
| `writtenSpelling` list arm | `propertyValue.ts:184-189` | Keeps a folded held member | Changes | Exact; it keeps the wikilink shape for Link and File (`:183`). |
| `encodeValue` | `propertyValue.ts:192-214` | Writes the title | Changes | Writes the option's stored key. |
| `applyValueAtRoot` | `propertyValue.ts:247-256` | Collapsing optimistic write | Changes | Lands on the key. |
| `namesValue`, `editList`, `stripList` | `pageValue.ts:11-34` | Folded member edits | Changes | Exact for keys and Context values; config labels and `$order` titles take a separate matcher (*§Config and `$order` Matching*). |
| `valueEditRewrite`, `valueEditSweep`, `optionHolders` | `pageValue.ts:36-43`; `optionOps.ts:183-201,269-285` | One folded rewrite for both hosts | Changes | One exact rewrite still serves both hosts. |
| `optionCascade` and `option-rename` | `optionOps.ts:203-254`; `propertyJournal.ts:11` | One pair | Changes | Widened to the whole list under one record (F-1). |
| `registerHeldOptions` | `optionOps.ts:94-150` | Folded Multi-Select adoption | Changes | Exact recognition; a shield for a pending Value Format sweep. |
| `cacheEdit` | `configReach.ts:308-320` | Folded edit of raw page words | Changes | Exact by key; a Value Format change reaches it (F-2). |
| Config option arms | `configReach.ts:142-195`; `views.ts:359-375` | Titles, mixed fold and exact | Changes | They name options by label under one matching rule the plan chooses (F-2). |
| `filter.ts` text evaluation | `filter.ts:83,244-267` | Folded text match on shown values | Stays | A search behavior over labels. |
| `writtenRoot` | `governedWrite.ts:16-21` | Collapse, reconcile, spell | Changes | Lands on the key, with no collapse. |
| `createPage`, `updatePageProperty`, `setSpaceProperty` | `page.ts:36-37,106`; `setProperty.ts:26,28` | Write `def.name` | Changes | Write `def.key`. |
| `keyHolderFiles`, `confirmedKeyHolders`, `keyedHolders` | `keyHolders.ts:14-74` | Folded holders | Changes | Exact by key on pages and sidecars. |
| `page_values.fold`, `page_values_by_fold`, `queryKeyHolders` | `ddl.ts:37,41`; `stores.ts:58-60,72-73,158-164`; `memoryStores.ts:176-181`; `storesContract.ts:141-142` | Folded holders for properties and Contexts | Leaves (the column and its index); Changes (the query) | No reader of `fold` remains; an exact query needs an index led by `key`, and dropping the column needs a generation bump (*§The Index Query*). |
| `space` relation rows | `indexSeed.ts:62-69`; `stores.ts:165-173` | Folded qualifier and titles | Changes | Exact Context key and Space title. |
| `renameSweep` | `registryProperty.ts:82-98` | One title pair for both arms | Changes | Both arms move the stored key; the `$order` edit takes the title pair. |
| `recased` skip | `registryProperty.ts:125-126,150` | Case-only renames skip | Leaves | A rename sweeps when the stored key changes. |
| `bothKeyHolders`, `KEY_REFUSAL.held` | `registryProperty.ts:102-108,126-128`; `properties.ts:268-269` | Folded clash, titles named | Changes | Exact keys. |
| `editProperty` | `registryProperty.ts:156-173` | Every field but `id`, `name` | Changes | Format fields route through the rename path (F-1). |
| `validateName` | `schema.ts:39-50` | Folded title uniqueness | Changes | Title check stays; a key check joins it. |
| `keyRefusal` | `schema.ts:17-27` | Folded refusal on the title | Changes | Checks the key and the label without regard to case (D-1). |
| `validateOptionValues`, `withUniqueOptions` | `schema.ts:71-91` | Folded title uniqueness | Changes | Label check stays; a key check joins it. |
| Registry admission | `propertiesRegistry.ts:29-37` | First per folded title | Changes | Also first per key. |
| `freeName` on create | `names.ts:56-64` | Folded titles | Changes | The step-aside also has to clear keys. |
| Create supersede | `registryProperty.ts:68-76` | Folded title or id | Changes | The record's key. |
| Replay `named` | `replaySchemaCascade.ts:38-61` | Folded title gate | Leaves | Gates compare stored keys. |
| `SchemaJournal` records | `propertyJournal.ts:8-43` | Titles | Changes | Keys, and pairs for options (F-1). |
| `linkKeysOf` | `schema.ts:30-36` | Folded key to type | Changes | Exact by key; `cascade.ts:218`† passes a title. |
| Delete-cascade Link strip | `cascade.ts:68-142`† | Folded lookup, dedupe | Changes | The dedupe (`:125`) goes. |
| Restore scrub | `restoreScrub.ts:25-82` | Folded worlds and links | Changes | Gains the restore re-spell (G-1). |
| Repair on open | `repairSweep.ts:17-45` | Folded reconcile | Changes, through the world | Exact (G-2). |
| `refillValues`, `refillTrashed` | `assignment.ts:49-67`; `holdings.ts:129-148` | Write `def.name` among spellings | Changes | Write the key. |
| `oweNamedKeys` | `fileEvents.ts:513-530`† | Folded title change owes adoption | Changes | A key change owes it. |
| `useValuesEpoch`, `rekeyOverrides`, `bumpValuesEpoch` | `useContainerValues.ts:16-64`; `cacheSlice.ts:55-58`; `PropertyFrame.tsx:237` | Folded re-key by title | Changes | Carry keys. |
| PropertyPanel `held`, Matrix `answers` | `PropertyPanel.tsx:213-216`; `matrixInput.ts:81-101` | Folded | Changes | `Object.hasOwn(fm, def.key)`. |
| Space `$order` | `PropertyPanel.tsx:218-225`; `spaceSidecar.ts:98-114` | Titles, folded | Stays | Row order by title (*§Config and `$order` Matching*). |
| Search and Connections title folds | `caseFold.ts:48-102`; `Core/Connections/*` | Titles | Stays | Outside metadata identity. |
| `heldName`, `recase` | `atomicWrite.ts:320-334` | File-name spellings | Stays | A case-insensitive disk. |

**The Removal Yield:** with every metadata key and value matching exactly, the spelling machinery in `heldKeys.ts` goes: `heldKeys`, `heldKey`, `heldValue`, `writeTarget`, and `stripHeld`, with `editHeldList` and `rekeyHeld` reduced to single-key forms. So do `byFoldedName`, `holdsList`, `joins` and `joinsSpellings`, the reconcile's join-and-retire branch, `mergeInto`'s spelling step, `renameFrontmatterKey`'s variants and `join` parameter, the property and Context case-only skips, the folded replay gate, the `stored()` label strip, and the index's `fold` column with its index, its writer argument, and the memory double's fold. The folds that stay serve uniqueness of property and option labels and keys and of Context and Space titles, the restore's match, configuration matched by label, Space `$order` by title, search and sort, and file names on a case-insensitive disk. The additions are a case-conversion module for the ten formats, `label` and `key` on every property and option with a one-time rewrite of the two `properties.json` files and six deleted-property records (C-3), key-uniqueness and reserved-key checks on keys, two settings rows, a format change routed through the rename path and a widened option rename with its journal record (F-1), the restore re-spell (G-1), an exact key index (F-3), a dry-run counter for the confirmations (F-4), the Multi-Select write carrying unrecognized words from the file (E-3), the adoption shield widened to a Value Format change's whole list (F-1), and the create step-aside clearing keys (D-1). One rule for both hosts means the shared fan-outs keep one closure. Whether the line count falls depends mostly on the conversion module and the restore re-spell against the removed spelling paths; the `name` to `label` and `value` to `key` renames touch many lines without adding mechanisms.

---

#### What's Reusable

- **The Exact Primitives:** `landValue` and `stripKeys` (`heldKeys.ts:42-48,81-84`).
- **The Shared Fan-Outs:** one closure already serves pages and sidecars at each fan-out in *§Key Identity Today*, and one stored key keeps it that way.
- **`renameSweep` as the Key Format Engine:** it already runs a YAML arm for pages and a JSON arm for sidecars (`registryProperty.ts:93-96`); a Key Format change is a rename from the old stored key to the new one with no title change, so the `$order` edit has nothing to do.
- **The Option Rename as the Value Format Engine:** `renameOption`, `optionCascade`, `valueEditRewrite`, the journal arm, and Try Again (`optionOps.ts:203-254`; `replaySchemaCascade.ts:74-81`), widened from one pair to a list (F-1).
- **The Rename Path:** validate, journal, commit, sweep, clear, and Try Again (`registryProperty.ts:111-154`; `propertyWrite.ts:10-24`), with `registryChannel` and `cascadeReply` on the bridge side (`handlers.ts:54,66-75`).
- **The `Matcher` Type:** `pageValue.ts:9`, for the label matcher that config and `$order` keep beside the exact one.
- **The Dry-Run Pieces:** `sweepParse`, `rewriteRaw`, and `changedKeys` (`pageFile.ts:268-274`; `governedSweep.ts:43-56`).
- **The Label Precedents:** `PickOption.label` (`properties.ts:284`), the Status group `label` (`properties.ts:158-165`), and the Context pick split (`contextOptions.ts:31-36`).
- **Definition-Level Settings:** a zod field on `propertyDefinitionFields` (`properties.ts:169-199`), carried through rewrites by `looseDecoder` (`properties.ts:1`) and merged per field by `mergeKeys` (`propertiesRegistry.ts:110`).
- **The Settings Row:** `pickerRow` (`UIX/Menus/MenuIndex.tsx:54-77`) and the const-array-plus-labels pattern of `LINK_FORMAT_OPTIONS` (`Core/Properties/Schema/linkFormatOptions.ts:5-8`; `properties.ts:109-121`). The panel's shared insertion point sits between the separator and `SETTINGS[def.type]` (`PropertyFrame.tsx:427-428`), and the option-type predicate is `PROPERTY_TYPES[def.type].options !== undefined` (`PropertyFrame.tsx:391-392`).
- **Case Helpers:** `capitalize` (`UIX/Utilities/capitalize.ts:1`) and `checkedSpelling`'s casing mirror (`propertyValue.ts:167-174`). No helper splits free-typed titles into words; `toKebabIconId` splits only on case and digit boundaries (`UIX/Symbols/iconRoster.ts:4-11`).
- **`recase`:** re-spells a folder whose case alone changed (`atomicWrite.ts:325-334`).
- **The Live Drive:** `.claude/scripts/Metadata Spelling Drive/live-drive.mjs` seeds spellings across casings and quote styles and checks bytes, reads, writes, and five cascades.

---

#### Approaches Worth Weighing

Each fork the reports raised, with its options and evidence, and the entry in *MetadataV3 — Decisions & Intention* that settles it.

##### What Exact Includes

**Serves:** A-1 and A-3. **Settled:** A-3.

`normalizeTitle` bundles stringifying, trimming, lowercasing, and NFC (`caseFold.ts:12-14`), and only the lowercasing is casing identity. An outside `- 2024` names option "2024" (`propertyValue.ts:42-44`), a member with stray spaces names its option, and an NFD key from another tool matches an NFC title. Byte-exact matching drops all three; matching on the stringified, trimmed, NFC form keeps them while ending the case fold, which is A-3. `normalizePropertyName` already NFCs titles on entry (`properties.ts:272-274`).

##### The Case-Conversion Module

**Serves:** B-2, B-5, and B-6. **Settled:** B-5 and B-6.

One module can own the ten formats as a tokenizer plus join-and-case rules, living in Core beside `caseFold.ts` and using its non-locale methods. B-5 splits at spaces, hyphens, underscores, and lowercase-to-uppercase humps, keeps every other punctuation mark inside its word (`v5.0` and `J. Crew` are both held in NexusOS), and refuses a label that converts to an empty key. A word also starts at an uppercase letter between another uppercase letter and a lowercase one (`XMLHttp` splits as `XML` and `Http`), and under `PascalCase`, `camelCase`, and `Train-Case` each word's first letter takes the format's case and the rest lowercase (B-6), so `URL Slug` gives `UrlSlug` and a format converts its own output back to itself (`iPhone 17` gives `IPhone17` in `PascalCase`), apart from labels of consecutive single letters (`A B` gives `AB`, which converts to `Ab`). `lowercase` and `UPPERCASE` re-case the label as typed and keep its separators. The module also meets `İ` lowercasing to two code points, `ß` uppercasing to `SS`, final sigma, titlecase digraphs, NFD input, and uncased scripts, which a `[A-Za-z]` splitter would drop. With keys stored (C-2), a later change to the module changes only the keys it writes afterward.

##### Uniqueness and Collisions

**Serves:** Open Within the Idea 5. **Settled:** D-1, D-2, and D-3.

- **Titles and Labels:** property labels, option labels within a property, and Context and Space titles stay unique without regard to case.
- **Property Keys:** two definitions sharing a key would read and write one value, so keys are unique, and D-1 holds them unique without regard to case: Obsidian keys property types by the lowercased name (*§Interop*), and a Sapphire write lands on a held case variant (`frontmatterSplice.ts:38`). Separator-dropping formats create clashes only the folded check catches, such as `Due Date` in camelCase (`dueDate`) beside a `Match Title` property titled `DueDate`.
- **Option Keys:** unique and non-empty within a property, compared without regard to case (D-2). `Q3 Report` and `Q3-Report` share `q3-report` under kebab-case, `Straße` and `Strasse` share `STRASSE` under UPPERCASE, and an all-punctuation label converts to an empty key (B-5). `validateDefinition` skips Status at create (`schema.ts:64-67`), which J-1 closes.
- **Reserved Keys:** a one-word label that folds to a modeled key (`Banner`, `Id`) is refused at creation, as today. A multi-word label can reach one through a format, as `Heading Icon Hidden` under `snake_case` gives `heading_icon_hidden`, and a format change can create that collision after the fact; D-1 refuses it on the key without regard to case.
- **The Step-Aside:** `freeName`'s ` (2)` suffix (`names.ts:53`) has to survive the format (`name-2` in kebab-case, `name2` in camelCase), so the step-aside iterates until the key is free.
- **YAML Typing:** formats can produce `true`, `null`, or numerals, which the writer quotes, and bare `yes`, `no`, `on`, `off`, `y`, `n`, or date-shaped words, which a YAML 1.1 reader may type (*§Interop*).

##### Adoption

**Serves:** Open Within the Idea 2. **Settled:** E-1, E-2, and E-3.

- **The Word Itself:** an adopted Multi-Select word becomes the option's key and its label. Adoption admits only a word the format could have produced, so the word is what the format writes from that label.
- **The Label Collision:** a foreign `red` beside an option labelled `Red` stays foreign, since option labels stay unique without regard to case (D-2).
- **The Namespace:** a foreign word rides verbatim in a Multi-Select value today (`propertyValue.ts:110`), where it would share the label namespace once decode maps keys to labels. E-3 keeps unrecognized words out of the value and untouched on disk through an in-app edit.
- **Select and Status:** Select adoption would register every foreign single word, and a list `[A, B]` would register both while reading as `B` (`propertyValue.ts:102-105`); Status adoption needs a group nothing supplies (`properties.ts:323-344`). E-2 keeps both out.

##### Data Held Today and the Cutover

**Serves:** Open Within the Idea 6. **Settled:** I-1, C-3 (inferred), and the *Ordering* constraint.

- **What Goes Unread:** with exact keys under `Match Title`, NexusOS's `tags` (337 pages), `description` (15), and `version` (29) are foreign until those properties take a `lowercase` Key Format, which reads them and moves the two `Studio` pages holding `Tags` to `tags`. Every other registered key, every option word, and every Context value reads exactly (*§Real Data*), and `~/Test` reads whole.
- **The Registry Rewrite:** the two `properties.json` files and six deleted-property records are rewritten once (C-3).
- **The Ordering:** exact matching lands before or with the formats, since the YAML rename deletes keys on a case-only pair under today's helpers (`pageFile.ts:221-230`) and the replay gate misreads a case-only record (`replaySchemaCascade.ts:53`).

##### The Index Query

**Serves:** F-3, the holder lookups. **Settled:** F-3 (inferred).

With Context keys exact, no reader of `fold` remains, and property and Context holder queries both become exact key lookups. A `key`-only predicate needs an index led by `key` (`ddl.ts:39`); adding one needs no generation bump (`ddl.ts:90`), and dropping `fold` is a column change that does (`ddl.ts:80-92`). An index on `(key, path)` also serves the `DISTINCT path` query. Context holder queries stay on `page_values` rather than the `space` relation rows, which miss a Context key naming no Space (`indexSeed.ts:62-69`). The memory double and the contract test change with the store (`memoryStores.ts:176-181`; `storesContract.ts:141-142`).

##### Counting and the Zero Skip

**Serves:** F-4. **Settled:** F-4.

- **One Counter:** `countRewrites(root, files, plan)` beside `sweepGovernedRoots`, with `propertyHolders` and `optionHolders` reduced to plan builders. The count equals the reach by construction, dropping ID-less pages from the delete count and adding `$order`-only Spaces.
- **Where the Skip Lives:** Clear and a format change are true no-ops at zero (`optionOps.ts:256-267`), while Remove and Delete still change definitions at zero (`optionOps.ts:298-300`; `deleteProperty.ts:93-131`). F-4 skips a format change's confirmation at zero or one item and Clear's at zero, and keeps Remove's and Delete's at any count, so the skip lives at those callers and the Option Picker Drive's zero-count Remove expectation holds (`live-drive.mjs:174`).

##### Recording a Format Change

**Serves:** B-1 and F-1. **Settled:** F-1.

- **The Key Format Record:** the `rename` record names both words (`propertyJournal.ts:9`). Recording stored keys lets replay gate on the definition's current key exactly; recording labels as well serves a label rename's `$order` edit.
- **The Value Format Record:** the widened `option-rename` carries the list of `[from, to]` key pairs, with arms in `sameRecord`, `decodeSchemaJournal`, and `replay` (`propertyJournal.ts:14-43`; `replaySchemaCascade.ts:74-81`). Replay over partly swept files is safe when no word is both an old key and a new key for different options, which D-2's collision refusal or a precheck guarantees (*Decisions & Intention*, *§Open Items*).
- **The Held-Option Shield:** `registerHeldOptions` shields only an owed `option-rename`'s single `from` (`optionOps.ts:125-135`); the widened record shields every `from`, or a settle during a partial sweep registers each unconverted Multi-Select word.
- **The Read Window:** the registry commits before the sweep (`registryProperty.ts:131-150`), so a skipped file reads as foreign until Try Again lands.
- **Interleaving:** an option edit made while a format record is owed runs unjournaled (`journalSlot.ts:37`).

##### The Restore Re-Spell

**Serves:** G-1 and G-2. **Settled:** G-1 and G-2.

- **Where It Runs:** `scrubReturning`'s page text reconcile (`restoreScrub.ts:53-64`) is the one point a returning page passes through.
- **Its Reach:** a key left from before a label rename made while the page sat in the Trash matches none of the new label's spellings and returns as foreign data.
- **What It Recognizes:** a held key matches a current property when it equals, without regard to case, one of the ten spellings the formats write from the property's label, as `VALUE_ONE` or `valueOne` against `Value One`, and is re-spelled into the property's current key; option words match option labels the same way. Comparing against the converter's own output keeps every key Pommora wrote under an earlier format matchable, including the single-letter exception (`AB`) and length-changing case (`STRASSE`), and the match runs only when a restore lands.
- **Ties:** two labels can share a spelling, as `Due Date` and `Due-Date` both give `due-date`. A held key that is exactly a current key takes that property, and a match naming more than one property returns as foreign data (G-1, inferred).
- **Other Restores:** Space and Context bundles restore sidecars through the same scrub (`restoreScrub.ts:69-80`), and their property keys re-spell the same way. A property bundle restores its own definition, key included, and a step-aside on restore changes the key the refill writes under (`restoreProperty.ts:41`).
- **What Stays:** a key matching no current property returns as foreign data, and the reconcile drops an option word matching no current option, as today.
- **Contexts:** `<Title>:` keys and the Space titles under them match the current Contexts and Spaces by the same comparison at restore (G-1, inferred).

##### Config and `$order` Matching

**Serves:** F-2. **Settled:** F-2.

Saved views, View Tiles, and the Matrix filter name options by label; their cascades fold some fields and match others exactly (`configReach.ts:142-172`; `views.ts:359-375`), and the Select filter folds where the Multi-Select filter matches exactly (`filter.ts:83,244-286`). Space `$order` stores property and Context titles matched by `normalizeTitle` (`PropertyPanel.tsx:218-225`). Labels are unique without regard to case, so either matcher picks one option or row; F-2 puts every such reference under one rule, case-insensitive or exact, chosen by the planning agent from what each costs against today's mixed matching; case-insensitive matching only reconciles references edited outside the app. Text operators keep matching as search does.

##### Sapphire and Obsidian

**Serves:** Open Within the Idea 8. **Settled:** I-2 and D-1.

- **Keys:** with keys unique without regard to case, Sapphire's exact-first resolution reads and writes Pommora's keys correctly. Keys differing only by case would let a Sapphire write land on the other property's key and merge their options, kind, and hidden state in its store (`frontmatterSplice.ts:38`; `actions.ts:81`; `store.ts:37-39,116-123`), which D-1 rules out.
- **Values:** Sapphire treats `in-progress`, `In Progress`, and `IN_PROGRESS` as three options, its conditions fold case but not separators, and its value colors are keyed by word (`rename.ts:38-41,62,73`; `evaluate.ts:16`). Nathan's own properties take the formats their Sapphire automations and frontmatter use (I-2).
- **Context Keys:** Sapphire hides `<…>` keys (`store.ts:248-251`).

##### The Settings Rows

**Serves:** the brief's *§The Settings Rows*. **Settled:** H-1.

One shared section at `PropertyFrame.tsx:427-428` reaches all nine user types, with Value Format gated by the option-type predicate (`PropertyFrame.tsx:391-392`); H-1 places both rows there, at the top and divided from the type's own settings. A per-editor placement would repeat a row across five different wrappers. Number and Link each have a picker labelled `Format`, and Date has a `Format` heading (`Core/Properties/Schema/NumberEditor.tsx:66`; `Core/Properties/Schema/LinkEditor.tsx:51`; `Core/Properties/Schema/DateTimeEditor.tsx:32`).

---

#### What Contradicts the Sources

- **PropertiesPM, *§Identity & Values*:** "case-folded, trimmed and NFC-normalized once at write" (`.claude/Features/PropertiesPM.md:27`) describes a stored fold, and names are stored trimmed and NFC-normalized and folded only when compared (`properties.ts:272-274`; `schema.ts:46-47`). "A write collapses the spellings into the registered one" (`PropertiesPM.md:29`) holds for `writtenRoot`; `refillValues` collapses list types, the reconcile collapses only when joining, and `refillTrashed` never collapses (`assignment.ts:63`; `contextResolve.ts:142`; `holdings.ts:141`).
- **PropertiesPM, *§Schema Mutations*:** the "Edit options" row omits the `property_cache` reach (`PropertiesPM.md:133`; `configReach.ts:367`).
- **The Prior Scout Findings:** Scout A calls the reserved-key fold "only a safety margin", and at HEAD it guards folded sidecar reads (`pageRow.ts:37`; `contextResolve.ts:59`). It counts five `reconcileGovernedRoot` call sites, and there are four (`governedWrite.ts:18`; `repairSweep.ts:39`; `restoreScrub.ts:55,75`). Scout C's "`renameSweep` needs the case-only short-circuit removed" omits the key-deleting path in `renameFrontmatterKey` (`pageFile.ts:221-230`). Scout D's data tallies (558 pages, `ID` 492, `Link` 1, `banner` 4, `~/Test` 10 pages) are 606, 540, 46, 49, and 33 at HEAD, and its "Sapphire makes automations write a second key" follows a stale doc (`frontmatterSplice.ts:38`). Scout B lists `openInPreview` as a live option cascade surface, which can't hold an option rule (`previewRules.ts:26,31-37`).
- **Sapphire's Docs:** `AutomationsSPH.md:43` says actions add a second key; every write resolves to the held variant (`frontmatterSplice.ts:38`).
- **Code Comments:** `rekeyHeld`'s doc calls it the twin of `renameFrontmatterKey` "by the same collision and join rules" (`heldKeys.ts:94`), and the two differ on a case-only pair (`heldKeys.ts:102-106`; `pageFile.ts:221-230`).

---

#### Reconciliation Log

##### Disagreements Resolved

- **Whether the Index Needs a Schema Change:** Scout 1 said no, since a folded query is a superset of exact holders; Scout 3 said add `page_values_by_key` and keep `fold` for Contexts. Both kept `fold` for Context keys, which match exactly under A-2, so `fold` has no reader left. An exact key query needs an index led by `key`, and removing the column needs a generation bump (*§The Index Query*).
- **Stored or Derived Key:** Scout 1 favored a stored key, and Scout 2 favored deriving option words from labels. C-2 stores both words on every property and option.
- **Whether a Key Format Change Touches Space Sidecars:** Scout 4 said it rewrites every holding page and Space sidecar. B-4 applies formats on both hosts, so it holds, and `renameSweep`'s two arms already reach both (`registryProperty.ts:93-96`).
- **Tolerant Recognition:** Scouts 2 and 3 proposed tolerant recognizers on restore, repair, and the cache refill. G-1 and G-2 place recognition across casing and format at restore alone; live reads and repair-on-open match exactly.
- **What Can Be Deleted:** Scout 1 found almost nothing deletable while sidecars and Context keys folded. With every metadata key and value exact, the spelling machinery listed in *§What Leaves, Narrows, and Changes* leaves.
- **Where the Host Rule Lives:** Scout 1 weighed four ways to apply different rules to pages and sidecars. One stored key on both hosts gives one rule, and the shared fan-outs keep one closure.
- **The Format List:** Scout 4's opinion that a smaller launch set would cover the observed data stands against B-2. It's kept as a labeled opinion.

##### Claims Dropped, Narrowed, or Widened

- **Scout 2, "the `writtenSpelling` list arm becomes identity for page options":** dropped; a held case variant still folds to the written member and is kept (`propertyValue.ts:184-189`).
- **Scout 1, the reconcile "works unchanged" given two changes:** narrowed; `governorOf` also returns `name: def.name` (`contextResolve.ts:95`).
- **Scout 3, the case-only YAML rename destroys keys only on files "already spelled the new way":** widened to every holder of either spelling (`pageFile.ts:221-230`).
- **Scout 3, "`rekeyHeld` is safe in the same case":** narrowed; it leaves the key unchanged (`heldKeys.ts:102-106`).
- **Scout 2, "`validateDefinition` covers Select options only":** it covers Select and Multi-Select and skips Status (`schema.ts:64`; `properties.ts:39-41`).
- **Scout 2, "a Status created with fold-duplicate options isn't checked":** narrowed; it reads deduplicated through admission (`propertiesRegistry.ts:36`).
- **Scout 4, Obsidian's fold "unverified":** verified against Obsidian's bundled code (*§Interop*).
- **Scouts 2 and 3, older-build and sync-lag hazards:** outside the Constraints (one Mac, no other build).
- **Scout 2, the two-step `label` rollout for older builds:** outside C-3's one-time rewrite.

##### Citations Corrected

| Report | As Cited | At `3d191b895` |
| --- | --- | --- |
| Scouts 1, 2, 3 | `settle.ts:112,145` | `settle.ts:116,149`† |
| Scouts 1, 3 | `spend.ts:271` (Link refill) | `spend.ts:275`† |
| Scouts 1, 3 | `spend.ts:274`, `:277` (refill names) | `spend.ts:281`† |
| Scout 3 | `spend.ts:185-192` (restore scrub call) | `spend.ts:190-197`† |
| Scout 1, Prior Scout A | `spend.ts:288-298`, `:292`, `:295` (re-tag) | `spend.ts:292-302`, `:299`† |
| Scout 1 | `cascade.ts:55`, `:67-141`, `:79`, `:84-94`, `:86`, `:116`, `:124` | `cascade.ts:56`, `:68-142`, `:80`, `:85-95`, `:87`, `:117`, `:125`† |
| Scout 1 | `cascade.ts:174`, `:195`, `:200`, `:210` | `cascade.ts:175`, `:196`, `:201`, `:211`† |
| Scout 1 | `mutate.ts:145-148` (setProperty dispatch) | `mutate.ts:178-180`† |
| Scout 3 | `schema.ts:65` (`validateOptionValues`) | Defined at `schema.ts:85-91`; `:65` is a call |
| Scout 4 | `spaceSidecar.ts:19-25` | `spaceSidecar.ts:18-24` |
| Scouts 1, 2 | `contextCascade.ts:115-118` (Context case-only skip) | `contextCascade.ts:116-119` |
| Scout 4 | `registryProperty.ts:78-97` (`renameSweep`) | `registryProperty.ts:82-98` |
| Scout 4 | `registryProperty.ts:111-155` | `registryProperty.ts:111-154` |
| Scout 4 | `properties.ts:~262` (`KEY_REFUSAL.empty`) | `properties.ts:264` |
| Prior Scout A | `pageFile.ts:207-243` | `pageFile.ts:208-243` |

Every other citation the four reports make in the files opened for this investigation matched the tree. Some rest on the reports alone and should be re-opened before a plan leans on them: the view pipeline and renderer internals beyond the lines quoted here (`sort.ts`, `group.ts`, `Cells/*`, `Cards/*`, `TableView.tsx`, `propertyMenuActions.ts`, `useViewCreation.ts:246`), `columnStyles.ts`, `filterRules.ts`, Sapphire's `store.ts`, `candidateIndex.ts`, `rename.ts`, `values.ts`, and `evaluate.ts`, the Sapphire docs other than `AutomationsSPH.md:43`, and Scout 3's `nexus.db` check.

---

#### Cleaned Reports

##### Scout 1 — Key Side

**Baseline:** `3d191b895`.

**`heldKey` Callers:** `contextResolve.ts:76,122`, `cascade.ts:125`†, `setProperty.ts:26`, `PropertyPanel.tsx:215`, `keyHolders.ts:33,38,59`, `deleteProperty.ts:62`, `useContainerValues.ts:21`, `matrixInput.ts:98`, and `heldKeys.ts:104`. Each becomes `Object.hasOwn(root, key)` against the stored key, or against the exact `<Title>:` key for the two Context sites.

**`heldPropertyValue` Callers:** `value.ts:57`, `optionOps.ts:102`, `assignment.ts:60`, `deleteProperty.ts:65`, and `keyHolders.ts:66`. `registerHeldOptions` already branches on `space ?` (`optionOps.ts:113,117`).

**`writtenRoot`:** with the key exact, the target is the key and the spelling source is `raw[key]`; its four callers stay as they are (`governedWrite.ts:33`; `setProperty.ts:28`; `contextWrite.ts:109,114`).

**`confirmedKeyHolders`:** both loops test the stored key exactly; a format-change count is both loops.

**`renameSweep`:** both arms move the old stored key to the new one, and a rename that doesn't change the key skips them, as when a snake_case title changes only case. The `$order` edit takes the title pair and runs when the title changes.

**`deleteProperty`:** the snapshot is already split by host (`deleteProperty.ts:56-66,100`), and `stripAndRemove` strips the stored key on both arms with the `$order` edit on the title.

**Trash Refill:** `refillValues` and `refillTrashed` write the stored key on both hosts; `refillTrashed`'s `names` maps id to key.

**Journal Records:** `rename { id, from, to }` carrying keys, and `delete { id, key }`.

**Create Supersede:** a new definition can share a deleted one's key without its title, or the reverse, so supersede compares keys.

**Hazards:** replay clears an owed case-only rename under a folded gate (`replaySchemaCascade.ts:41,53`); `editProperty` changes a format field with no sweep (`registryProperty.ts:156-173`); `KEY_REFUSAL.held` and `.duplicate` name titles (`properties.ts:266-269`); the renderer epoch carries titles (`PropertyFrame.tsx:237`); an off-spelled key becomes foreign, so `linkKeysOf`'s foreign rule makes a page rename rewrite `[[…]]` inside it (`schema.ts:34`).

**Opinions (Labeled):** persist the key, since deriving on-disk identity from a word-splitter is the most regret-prone choice; require keys unique folded too, which keeps every Nexus within Obsidian's and Sapphire's folding.

##### Scout 2 — Option Side

**Baseline:** `35db9f366`, re-verified at `3d191b895`.

**References:** every config reference holds the option's title, so config keyed by label needs no migration and no reach on a format change. Option words live outside the files that hold them in two places, `property_cache` and Trash records. The property Trash bundle carries its own definition (`record.ts:58`), so its values match the format it restores.

**Where the Key Applies:** a per-definition map from stored key to label replaces `optionsByFold` (`propertyValue.ts:46-60`), and `unregisteredMembers` and the frozen restore filter use it (`propertyValue.ts:132,162`). `encodeValue` writes the stored key, affecting `setProperty.ts:22`, `page.ts:34,104`, `contextResolve.ts:131`, `assignment.ts:58`, and `propertyValue.ts:255`. An option rename or a Value Format change rewrites files and `property_cache` from old key to new key, and config by label only when the label changes.

**Exact Member Helpers:** `memberCount`, `joinValues`, and `editList` merge, rename, or strip a case variant along with its option under the fold (`contextResolve.ts:108`; `heldKeys.ts:54-58`; `pageValue.ts:24-31`), so each matches exactly on values.

**Hazards:** Select substring filters are excluded from the cascade (`configReach.ts:121-122`); the held-option shield covers one pair (`optionOps.ts:125-135`); trashed pages and containers are reached by no cascade (`keyHolders.ts:14-20`; `configReach.ts:332-337`).

**Opinions (Labeled):** label as the in-app value is nearly free, since today's titles are tomorrow's labels; option ids would be a better long-term identity and don't belong in this work; Multi-Select's `string[]` can't distinguish a foreign word from a label once they share a namespace; Select and Status adoption is a separate product decision.

##### Scout 3 — Index, Counts, Sweeps

**Baseline:** `35db9f366`, re-verified at `3d191b895`.

**What the Live Drive Encodes:** option fold on a page (`live-drive.mjs:97,108`), option fold with the member's spelling kept (`:126`), a fold-matched option cascade (`:200`), a fold-matched key cascade (`:205`), and folded Space titles under a Context key (`:185,203`); each case reads or cascades differently once matching is exact. The byte-identity check on registration (`:244`) stays, and the seed writes options as `{ value }` (`:18,23-24,27`).

**What the Drive Would Need:** Key Format cases over multi-word, digit, acronym, and reserved-adjacent titles per format, asserting page and sidecar bytes; Value Format cases per option type asserting pages, sidecars, and `property_cache` re-spelled with views still resolving; exact Context keys and Space titles; the confirmation count against files rewritten, with the zero skip; off-spelled pages after the cutover; a collision refusal; a restore re-spell; and Try Again after a forced skip.

**Hazards:** a stranded journal record makes the next format change run unjournaled (`journalSlot.ts:1,37`); a file holding `Status:` and `status:` blocks a rename between them (`registryProperty.ts:126-128`); pages outside Collections aren't swept, and `/Tasks` and `/Events` need a decision when Agenda lands (`keyHolders.ts:1,19`); the count is taken outside the schema lock (`handlers.ts:181`).

**Opinions (Labeled):** exact matching with a journaled migration is one step and formats a second; build the dry-run counter now; restrict the zero skip to format changes and Clear; a `.nexus` format marker would be the cheapest gate for future changes.

##### Scout 4 — Interop, Editor, Data

**Baseline:** `74b4ff18f` for Pommora, Sapphire at `d62431e1`.

**Sapphire's Store:** option lists are stored verbatim per property in `data.json` and looked up through `resolveKey` (`store.ts:37-39,116-123`); derived kind sets are lowercase-keyed, so a kind set on one of two case-variant entries applies to both (`store.ts:109-114,151-167`); `isManageable` excludes `tags` and `aliases` in any case (`Sapphire/src/core/store/propertyKinds.ts:19-21`); the suggestion tally pools case-variant keys (`Sapphire/src/properties/options/candidateIndex.ts`). Its live store holds lowercase `price` and `version` where Pommora's titles are `Price` and `Version`, and its automations name `Status`, `Priority`, and `Timeframe`, which pages hold exactly.

**`types.json`:** NexusOS's Obsidian types hold `aliases`, `cssclasses`, `tags`, `banner`, and `version` lowercase and `Status`, `Areas`, `Projects`, `Priority`, `Price`, `Brand`, and `Color` capitalized (`~/NexusOS/.obsidian/types.json`).

**Opinions (Labeled):** one shared Format section at `PropertyFrame.tsx:427`; the real data argues for lowercase as the one non-default Key Format that matters, and a smaller launch set (B-2 fixes the list); Value Format has no observed demand and is the source of the worst Sapphire interop, so Key Format could ship first; refuse two properties whose keys fold alike; update `AutomationsSPH.md:43`.
