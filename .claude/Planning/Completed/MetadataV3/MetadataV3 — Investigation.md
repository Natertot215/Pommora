### MetadataV3 — Investigation

**DATE:** 10-17-2026
**HEAD:** `988f6ee43`, verified against the working tree at that commit. The Path Links session has uncommitted edits in ten cited files, each marked † where it's cited: `Core/Index/contentIndex.ts`, `Core/Index/indexSeed.ts`, `Core/Nexus/adopt.ts`, `Core/Nexus/fileEvents.ts`, `Core/Nexus/handlers.ts`, `Core/Nexus/settle.ts`, `Core/Platform/stores.ts`, `Core/Testing/memoryStores.ts`, `Core/Testing/storesContract.ts`, and `Desktop/Store/stores.ts`. Its Phase 8 rewrites the Trash restore (`Core/Trash/spend.ts`, `holdings.ts`, `restoreScrub.ts`, `Core/Nexus/heldPages.ts`), so restore citations are re-read once it lands.

This document reconciles three planning scouts (identity and the registry, cascades and the restore, the converter and the interface) with the earlier investigation at `3d191b895` and *MetadataV3 — Scout Findings* at `e6e851183`. It checks each load-bearing claim against the code, merges what the reports share, settles their disagreements against the evidence, and classifies the code against *MetadataV3 — Decisions & Intention* as ratified on 10-17-2026 with the planning session's rulings: exact identity for property keys, option words, Context keys, and the Space titles under them; a stored `label` and `key` on every property and option; formats that ride the rename paths; configuration matched exactly by label; and a Space's `$order` kept by id. It records what is true and the approaches weighed, each naming the decision that settles it.

---

#### What's True

##### Key Identity Today

**One Primitive:** every key comparison folds through `foldKey`, which lowercases and then NFC-normalizes (`Core/Paths/caseFold.ts:7-9`). `normalizeTitle` stringifies, trims, and folds (`caseFold.ts:12-14`), and `spellings` returns every name that folds to a given one, the exact spelling first (`caseFold.ts:17-21`). Property titles are stored trimmed and NFC-normalized but unfolded (`Core/Properties/properties.ts:272-274`) and folded only when compared (`Core/Properties/schema.ts:46-47`).

**Name to Definition:** `byFoldedName` maps a folded title to its definition (`properties.ts:49-50`), with six callers (`Core/Properties/assignment.ts:41,45`; `Core/Contexts/contextResolve.ts:59`; `schema.ts:31`; `Core/Nexus/cascade.ts:80`; `Core/Trash/restoreScrub.ts:35`). Registry admission admits the first definition per folded title (`Core/Properties/propertiesRegistry.ts:29-37`).

**Definition to Held Key:** `heldKey` answers the exact spelling first, then the first key in root order that folds to the name (`Core/Files/heldKeys.ts:11-12`). `heldValue` joins every spelling's members for a list-holding property, Multi-Select or File (`heldKeys.ts:15-26`; `properties.ts:66-69`). `writeTarget` collapses two or more held spellings into the name (`heldKeys.ts:34-39`), and `stripHeld`, `editHeldList`, and `rekeyHeld` act on every spelling (`heldKeys.ts:61-110`). `landValue` writes one key in place of the spellings it governs (`heldKeys.ts:42-48`).

**Pages and Space Sidecars:** a page's keys resolve through the owning Collection's assigned definitions keyed by `byFoldedName` (`Core/Contexts/contextWrite.ts:70-74`; `assignment.ts:33-46`), a Space's through `spaceWorldOf` over the whole registry (`contextResolve.ts:57-59`). Both hosts key by the property title, so the host-blind functions apply one rule to both: `writtenRoot` (`Core/Properties/governedWrite.ts:16-21`), `heldPropertyValue` (`Core/Properties/propertyValue.ts:241-244`), `reconcileGovernedRoot` (`contextResolve.ts:111-157`), `valueEditRewrite` (`Core/Properties/pageValue.ts:36-43`), `stripHeld`, `applyValueAtRoot` (`propertyValue.ts:247-256`), and `resolveFieldValue` (`Core/Properties/value.ts:37-61`).

**Fan-Outs That Send One Rewrite to Both Hosts:** `refillValues` through `sweepRootsById` (`assignment.ts:49-67`; `Core/Properties/governedSweep.ts:146-170`); `stripAndRemove` (`Core/Properties/deleteProperty.ts:113-131`); `valueEditSweep` with `{ raw, sidecars: raw }` (`Core/Properties/optionOps.ts:193-201`); `deleteCascade` and `renameCascade` through `spaceArm` (`cascade.ts:56,117,196,211`); `refillTrashed` (`Core/Trash/holdings.ts:128-148`); and `renameSweep`, whose page and sidecar arms share one `oldName`/`def.name` pair (`Core/Properties/registryProperty.ts:82-98`).

**Context Keys:** a `<Title>:` key resolves through `governorOf`'s Context branch (`contextResolve.ts:91-98`) and always joins its spellings (`contextResolve.ts:100-106`). `contextWorldOf` keys Context titles by `foldKey` and Space titles by `normalizeTitle` (`contextResolve.ts:28-41`), and `contextTitles` reads each member as a trimmed, folded title (`Core/Contexts/contexts.ts:37-39`). The Context cascades rename keys through `rekeyHeld` and `renameFrontmatterKey` with the `merge` rule (`Core/Contexts/contextCascade.ts:34-43,85-90`), retitle a Space through a joined, folded list edit (`contextCascade.ts:45-48`), unlink through `heldKeys` (`contextCascade.ts:132-149`), and skip a case-only retitle (`contextCascade.ts:116-119`). Context and Space titles are folder names held unique by folded title (`contexts.ts:16`; `contextCascade.ts:214,222,273,319`).

**Readers and Writers of `def.name`:** 54 typed production reads in 22 files, plus 4 typed writes, by TypeScript's find-references; Desktop, UIX, and Sync never import a definition. They split as 27 reads used as a key, 17 as a title, 7 as identity (uniqueness, reserved keys, no-op checks: `propertiesRegistry.ts:32,34`; `registryProperty.ts:55,121,125`; `schema.ts:47,56`), and 3 that take both words from one read (`registryProperty.ts:95,129`; `deleteProperty.ts:103`). Untyped reads add `replaySchemaCascade.ts:38-41`, `Core/Trash/trashRows.ts:59`, `byFoldedName`'s six callers, and the write at `registryProperty.ts:138`.

**Key-Independent Writers:** `setBanner` writes the literal `banner` (`Core/Pages/setBanner.ts:29`), `createPage` writes `ID` (`Core/Nexus/page.ts:30`), and the asset migration acts on whatever exact key a slot sits under (`Core/Assets/assetMigrate.ts:142-151`). No path moves a value between a page and a Space.

##### Option Identity and References

**The Option:** `{value, icon?, color?, appearance?}`, with `group_id` for Status (`properties.ts:133-156`); `value` is its title, its word on disk, and its identity, and no option id exists. Status groups carry `{id, label, color, options}` (`properties.ts:158-165`), and `PickOption` has a `label` beside `value` that options fill with one word (`properties.ts:284`; `Core/Properties/Pickers/PropertyPicker.tsx:73`). `stored()` strips a leftover option `label` on every option write (`properties.ts:308-311`). An option has 26 typed production reads: 14 as a label (cells, chips, the option editor, group and order lists, `schema.ts:76,79`), 11 as registry-op identity, and `optionValues` (`properties.ts:296`), whose nine callers split between labels (`Core/Views/Pipeline/group.ts:199,219`; `sort.ts:87`) and keys (`optionOps.ts:63,179,235`; `propertyValue.ts:52`; `replaySchemaCascade.ts:77,87`). No production read uses an option's `value` as the word on disk directly; that role exists only in decode and encode.

**Decode and Encode:** `optionsByFold` caches folded title to title per definition, first wins (`propertyValue.ts:46-56`), and `registeredOption` reads it (`:59-60`). A Select or Status keeps the last element naming a registered option and drops an unregistered one (`:101-107`); a Multi-Select dedupes by fold, maps registered members to their titles, and keeps unregistered ones verbatim (`:108-112`), which is adoption's only input today (`unregisteredMembers`, `:129-134`). `encodeValue(value)` takes no definition and writes the decoded word, a Select as `[value]` (`:192-214`); its six callers all hold the definition (`:255`; `Core/Properties/setProperty.ts:22`; `page.ts:34,104`; `contextResolve.ts:131`; `assignment.ts:58`).

**Folded Member Matching:** `memberKey` compares a scalar member by `normalizeTitle` (`heldKeys.ts:51`), under `joinValues` (`:54-58`), `namesValue`, `editList`, and `stripList` (`pageValue.ts:11-34`), and the reconcile's `memberCount` (`contextResolve.ts:108`). `editList` serves page and sidecar values, Context values, `property_cache`, saved-view operands and orders, and Space `$order` (`pageValue.ts:42`; `contextCascade.ts:45-48`; `Core/Nexus/configReach.ts:142-159,308-320`; `Core/Contexts/spaceSidecar.ts:98-114`). Its replace answers a non-null list whenever any element matches, even when nothing changes (`pageValue.ts:26-33`).

**Where an Option Word Lives Outside Its File:**

| Site | Holds | Cascade Matches | Evaluation Matches |
| --- | --- | --- | --- |
| View filter operands (`Core/Views/filterRules.ts:10-15`) | Labels | Fold (`configReach.ts:142-145`, whole-value ops only, `:121-122`) | Select and Status Is and Is Not fold through the text evaluator (`Core/Views/Pipeline/filter.ts:79-83,244-267`); Multi-Select exact (`:269-286`) |
| Sort and group `order` (`Core/Views/views.ts:62-79`) | Labels | Fold (`configReach.ts:155-159,182-184`) | Exact (`sort.ts:28-35,82-94`; `group.ts:203-229`) |
| `collapsed_groups`, `hidden_groups` | Labels inside bucket keys | Exact (`configReach.ts:161-172`; `views.ts:359-375`) | Exact (`views.ts:325-337`) |
| View Tiles, Matrix filter (`.nexus/matrix.json`) | As views | As views (`configReach.ts:376-388`) | As the filter (`Core/Matrix/matrixInput.ts:116-133`) |
| Creation seeds, filter chips | Operands | n/a | Verbatim (`Core/Views/Pipeline/creationSeeds.ts:32,41`); exact (`FilterFrame.tsx:148`) |
| Collection `property_cache` | Raw page words, so keys, by property id and page id (`Core/Properties/propertyCache.ts:8-29`) | Fold, inside `reachConfig`'s container loop (`configReach.ts:308-320,364-369`) | Decoded against current options at refill (`assignment.ts:57,91`) |
| Property Trash bundle | The definition and raw values by holder id (`Core/Trash/record.ts:54-63`) | None | Fold at refill (`assignment.ts:57`) |
| Schema journal | `option-rename {from, to}`, `option-remove {value}` (`Core/Properties/propertyJournal.ts:8-12`) | Gate exact (`replaySchemaCascade.ts:74-93`) | n/a |

**The Cache's Writers:** Remove writes it (`Core/Properties/removeProperty.ts:36-51`), the property restore writes it (`Core/Trash/restoreProperty.ts:51-55`), the reassign refill trims it (`assignment.ts:102-106`), Delete purges and snapshots it (`deleteProperty.ts:51-54,133-141`), and the page-rename cascade edits it through `editCaches` (`cascade.ts:225`; `propertyCache.ts:52-68`). Clear runs `valueEditSweep` alone (`optionOps.ts:256-267`), so a cleared option's cached words come back at the next reassign.

##### The Read/Write Chain

**Read:** frontmatter is indexed whole (`Core/Index/indexSeed.ts:41-61`†); `heldPropertyValue` picks the held key or joins list spellings (`propertyValue.ts:241-244`); `decodeValue` turns it into a `PropertyValue` (`:83-126`); `resolveFieldValue` memoizes per frontmatter object and definition (`value.ts:50-64`) and serves every cell, card, filter, sort, group, panel row, and Matrix row.

**Write:** a pick builds the next value, a Multi-Select toggle sending the whole list (`PropertyPicker.tsx:397-406`); the renderer lands an optimistic copy through `applyValueAtRoot` (`Core/Properties/assignValue.ts:41`); the host clears on a null or blank value, an emptied Multi-Select included (`page.ts:103`; `propertyValue.ts:220-228`), and otherwise encodes and calls `writtenRoot` (`governedWrite.ts:23-42`; `setProperty.ts:28`). `writtenRoot` collapses every held spelling, reconciles every other governed key while skipping the target (`governedWrite.ts:17-18`; `contextResolve.ts:121`), and spells the value through `writtenSpelling` against the held value it already reads (`governedWrite.ts:19`; `propertyValue.ts:177-190`). Nothing on the write path edits a list in place.

**A Recognized Variant Survives a Write:** `writtenSpelling`'s list arm keeps a held member that folds to the written one (`propertyValue.ts:184-189`), and the reconcile and the refill call it the same way (`contextResolve.ts:149`; `assignment.ts:64`).

**Repair:** `reconcileGovernedRoot` re-encodes each governed value, keeps file spellings through `writtenSpelling`, never shrinks a live value by folded member count, and joins and retires extra spellings (`contextResolve.ts:108,129-149`). It drives every governed write, the repair-on-open sweep over pages (`Core/Properties/repairSweep.ts:20,37-41`), and the restore scrub (`restoreScrub.ts:55,75`).

**Adoption:** only Multi-Select adopts, behind type gates at `optionOps.ts:113-115`, `propertyValue.ts:131`, and `fileEvents.ts:527-528`†. It runs when a Collection gains a property (`fileEvents.ts:432-433`†), on any Space change (`:439`†), on a registry change through `oweNamedKeys` (`:496,520-537`†), at each settle over the owed holders, every page whose values changed, and every path newly in reach (`Core/Nexus/settle.ts:117,150-153`†), and on open after replay and repair (`Core/Nexus/handlers.ts:104-110`†). `registerHeldOptions` runs under the schema lock (`optionOps.ts:96`), so it never sees a sweep in progress; it shields only the slot's `option-rename` `from` (`optionOps.ts:125-135`). Status can't adopt, since `addOption` leaves groups untouched when no group id matches (`Core/Properties/optionModel.ts:31-32`).

##### Uniqueness and Reserved Keys

**Titles:** `validateName` refuses a folded clash (`schema.ts:39-50`), admission admits the first definition per folded title, and `freeName` steps a create aside on folded titles with a ` (2)` suffix (`Core/Paths/names.ts:53-64`; `registryProperty.ts:53-56`).

**Reserved Keys:** `keyRefusal` rejects an empty name, a `$` or `<` prefix, and any folded member of `ID`, `banner`, `id`, `$icon`, `heading_icon_hidden`, and `$color` (`schema.ts:17-27`; `Core/Nexus/identityMark.ts:11`; `spaceSidecar.ts:18-24`), from `validateName`, admission, and `linkKeysOf`'s foreign rule (`schema.ts:30-36,44`).

**Options:** `validateOptionValues` requires titles non-blank and fold-unique (`schema.ts:85-91`), from `editOption`, `renameOption`, and `validateDefinition`, which checks Select and Multi-Select and skips Status (`schema.ts:64-67`). `withUniqueOptions` keeps the first of each fold-alike set at admission and before every option edit (`propertiesRegistry.ts:36`; `optionOps.ts:58`).

##### Confirmations and Counts

**One Channel, Two Counters:** `property:holders` routes to `propertyHolders` without a value and `optionHolders` with one (`Core/Properties/handlers.ts:181-185`; `Core/Contract/bridge.ts:180`), outside the schema lock. Delete counts pages under every Collection holding the key in any casing plus every Space sidecar holding it, including ID-less and duplicate-ID pages the strip leaves alone and omitting a Space touched only for `$order` (`deleteProperty.ts:80-84`; `Core/Properties/keyHolders.ts:23-41,60-71`). Clear and Remove count by a hand-written dry run of the strip (`optionOps.ts:269-285`).

**The Dialog Always Asks:** `askHolding` shows the dialog at any count (`Core/Interface/Confirm/confirmations.ts:109-116`), from `askDestroyProperty`, `askClearOption`, and `askRemoveOption` (`Core/Properties/Schema/PropertyFrame.tsx:279`; `Core/Properties/Schema/useOptionEdit.tsx:110,114`). Confirmations count Items (`confirmations.ts:107`), while the rename refusal and the unswept notices say files (`properties.ts:268-269`; `governedSweep.ts:30-31`).

**The Sweep's No-Op Guard:** `rewriteRaw` drops a rewrite that changes no key (`governedSweep.ts:43-56`), but the page `text` arm and the sidecar arm write any non-null result (`governedSweep.ts:79-80,101-105`).

##### Sweeps and the Journal

**The Engine:** `sweepGovernedRoots` rewrites each file under its own lock, preserves page times, and runs the sidecar arm over every Space sidecar (`governedSweep.ts:59-109`). `optionCascade` runs the file sweep and then `reachConfig` from one `{value, edit}` pair, so the configuration arms and `cacheEdit` share it (`optionOps.ts:203-213`; `configReach.ts:92,339-403`).

**The Property Rename:** `renameProperty` validates, refuses files holding both keys unless the change is case-only, writes the journal, commits, sweeps unless case-only, and clears when nothing was skipped (`registryProperty.ts:111-154`). `renameSweep` always wraps its sidecar arm in `withOrderEntry`, so a rename rewrites every Space whose `$order` lists the property, even where the key arm changed nothing (`registryProperty.ts:95`; `spaceSidecar.ts:98-114`).

**`editProperty`:** writes the registry alone for every field but `id` and `name` (`registryProperty.ts:156-173`), reached only through `defEditOp`, whose narrowers admit display configs, the icon, and the file directory (`Core/Properties/handlers.ts:120-176`).

**The YAML Rename on a Case-Only Pair:** `renameFrontmatterKey` resolves the old key and the rival through `spellings` (`Core/Files/pageFile.ts:221-225`), so on a pair such as `Tags` to `tags` both name one node, and the rename deletes the key under either collision rule: `prefer-new` drops the node (`:229-230`), and `merge` joins it and renames a node no longer in the document (`:234-239`). The JSON twin leaves the key unchanged under `prefer-new` and re-cases it under `merge` (`heldKeys.ts:105-109`). The property and Context case-only skips keep both paths unreached (`registryProperty.ts:150`; `contextCascade.ts:116-119`).

**The Journal:** one slot holds a four-op union with an arm each in `sameRecord`, `decodeSchemaJournal`, and `replay` (`Core/Properties/journalSlot.ts:14-49`; `propertyJournal.ts:8-43`; `replaySchemaCascade.ts:43-95`). A write that would displace a different record returns false (`journalSlot.ts:37`). `renameProperty`, `renameOption`, and the delete ignore that boolean, run unjournaled, and still answer the in-memory record as owed, so Try Again works within the session and crash replay can't recover them (`registryProperty.ts:130`; `optionOps.ts:229`; `deleteProperty.ts:104`; `propertyJournal.ts:54-57`). `removeOption` reads it and claims owed only when the write landed, since its replay acts only while the slot holds the record (`optionOps.ts:296,303`; `replaySchemaCascade.ts:85-86`).

**The Replay Gates:** `named` folds (`replaySchemaCascade.ts:38-41`). The rename arm acts while the definition is named `to` and no definition is named `from` (`:53`), so an owed case-only rename clears itself, and replay sweeps to the definition's current name (`:55`). The option-rename arm acts while the definition holds `to` and not `from` (`:79`). A create landing under a journaled delete's folded title or id clears the record (`registryProperty.ts:68-76`). Neither Nexus holds a journal file today.

##### The Index

**`page_values`:** every frontmatter key of every indexed page as spelled, with `fold` and the JSON value; primary key `(path, key)` and one secondary index, `page_values_by_fold` (`Desktop/Store/ddl.ts:34-41`). Rows are written with `foldKey(key)` (`Desktop/Store/stores.ts:67-69,82`†).

**Its Readers:** `queryKeyHolders` is `WHERE fold = ?` (`stores.ts:167-173`†), and its memory double re-folds every row (`Core/Testing/memoryStores.ts:182-187`†); the shared contract asserts folded lookups (`Core/Testing/storesContract.ts:166-171`†). `queryMembers` without a title routes to it (`Core/Index/contentIndex.ts:84-89`†), from the Context rename and unlink cascades (`contextCascade.ts:64-77`). Nothing else reads `fold`. Path Links' Phase 7 adds an exact read joining `page_values` on `key = ID_KEY` (`stores.ts:46-52`†) and changes no DDL or generation.

**Space Relations:** `space` rows carry `qualifier = foldKey(key)` and one row per Space title the value names, folded by `contextTitles` (`indexSeed.ts:63-71`†), and `queryMembers` with a title matches both (`stores.ts:174-182`†).

**Generations:** `INDEX_GENERATION` is 18, the DDL runs on every open, and only a generation mismatch drops the index tables (`ddl.ts:3,80-92`). A `key`-only predicate can't use the primary key's index, led by `path` (`ddl.ts:39`).

##### Row Order

**One Resolver:** `resolveRowOrder(items, keyOf, listed)` places listed keys first and the rest after, skipping a listed key no item has (`Core/Properties/rowOrder.ts:1-13`). The registry, the view bands, the group pipeline, and the property panel all order through it (`propertiesRegistry.ts:66`; `Core/Views/Pipeline/bandOrder.ts:13`; `Core/Views/Bands/bandRouter.ts:69-88`; `group.ts:436`; `Core/Properties/PropertyPanel.tsx:221-224`).

**Every Order but One Is by Id:** the registry `order`, a Collection's `properties`, a view's `property_order`, `hidden_properties`, and `group_order`, and the Nexus-wide panel Context order (`config.order.contexts`, `Core/Nexus/readNexus.ts:72`) all list ids. A Space's `$order` lists names: `{contexts, properties}` of Context titles and property titles (`spaceSidecar.ts:60-63,89-96`), written from the panel by `nameOf` and resolved through `normalizeTitle` (`PropertyPanel.tsx:219-225,249-257`; `contextWrite.ts:198-210`). It rides in the Space's `values` rather than as a modeled field (`spaceSidecar.ts:65-87`).

**Who Edits `$order`:** `withOrderEntry` (`spaceSidecar.ts:98-114`) from the property rename (`registryProperty.ts:95`), the property delete (`deleteProperty.ts:122`), the Context rename (`contextCascade.ts:37-43`), and the Context unlink (`:146`). The property delete and Context unlink sweeps already run their sidecar arm over every Space sidecar (`governedSweep.ts:86-107`; `contextCascade.ts:64-77`).

**Three Reorder Paths in the Panel:** a Space writes the moved shown rows of both groups as names, the Nexus-wide Context order writes the full id list placed by `nexusReorderIndex`, and a Collection's properties go through `schema:reorder` by index (`PropertyPanel.tsx:249-277`; `Core/Properties/paneDrop.tsx:28`).

**A Deleted Id:** the orders in `state.json` (Collections, Contexts, and Spaces) keep a deleted id, and the read skips it (`readNexus.ts:67-74`; `Core/Nexus/reorder.ts:37-45`; `rowOrder.ts:7-10`); views and the registry drop a deleted property's id in the passes their deletes already run (`configReach.ts:197-200`; `registryProperty.ts:175-185`).

##### Trash

**No Cascade Reaches `.trash`:** page holders come from the content corpus, which excludes `.trash` (`Core/Paths/exclusion.ts:79`); Space sidecars come from `.nexus/contexts` (`spaceSidecar.ts:51-58`); `reachConfig` walks live containers only (`configReach.ts:332-337`).

**Restores:** a page or container restore runs `scrubReturning` (`spend.ts:190-197`), which reconciles each page against the destination's page world and each sidecar against the Space world (`restoreScrub.ts:25-82`), skipping a Context key in transit by `heldKeys` (`:74`). The scrub covers pages and Space sidecars, not a restored Collection's `property_cache`. A property restore re-creates the definition through `createProperty`, which can step its title aside (`restoreProperty.ts:41`), then `refillValues` lands each value under `writeTarget` (`assignment.ts:56-66`). `refillTrashed` writes Link values back into trashed copies under `def.name` beside whatever spelling the copy holds (`holdings.ts:128-148`; `spend.ts:281`). Path Links' Phase 8 keeps `scrubReturning`'s two closures, hoists their listings into `artifactFiles`, and adds `repairLanded` after the relocate over links only (*Path Links — Plan*, Task 8-2).

**On Disk:** NexusOS's `.trash` holds 254 Markdown files and five deleted-property records; `~/Test`'s holds one deleted-property record.

##### Type Changes

No channel in the app sets a property's type: the type picker only creates (`PropertyFrame.tsx:226-233,294-300`), and `defEditOp` keeps `type` out (`Core/Properties/handlers.ts:120`). A type changes only through an outside edit of `properties.json`, which `oweNamedKeys` notices (`fileEvents.ts:520-537`†). The loose decoder keeps the array the type moved away from, and `optionsOf` reads the declared type's array (`properties.ts:286-306`). `seeded()` fills an empty `select_options` or `status_groups` on create and on every `editProperty` (`registryProperty.ts:33-44,166`; `properties.ts:323-348`).

##### Interop

**Sapphire:** `resolveKey` answers the exact key first, else the first key whose lowercase matches (`Sapphire/src/core/store/caseFold.ts:3-14`), and every frontmatter write reuses the key the note holds (`Sapphire/src/core/frontmatter/frontmatterSplice.ts:38,48`). Its option manager matches values exactly, and its conditions fold case but not separators (`Sapphire/src/properties/options/rename.ts:38-41`; `Sapphire/src/core/rules/evaluate.ts:5,13-26`).

**Obsidian:** In Obsidian 1.14.4, property types are keyed by the lowercased name, the metadata editor refuses a key matching another once both are lowercased, Bases reads frontmatter exact-first and then case-blind, and a Bases property's `displayName` stays apart from its key (`~/Library/Application Support/obsidian/obsidian-1.14.4.asar`).

**YAML:** Pommora writes with `yaml@2.9.0` under the 1.2 core schema (`pageFile.ts:90,105-108`); spaced, hyphenated, underscored, accented, and CJK keys write bare, as do `on`, `yes`, and `No`, while `null`, `true`, numerals, and indicator characters are quoted. `nodeSpelledAs` keeps a held quote style (`pageFile.ts:143-161`).

**Sync:** the wire carries no property keys (`Core/Sync/Contract/wire.ts:82-110`), and `properties.json` merges per definition and per field (`Core/Sync/Arrival/mergePolicy.ts:32-33`).

##### Real Data

**NexusOS:** 606 pages with parseable frontmatter; 15 definitions; 59 options, 28 carrying a leftover `label` equal to `value`.
- **Keys:** `tags` on 337 pages (`Tags` on 2, both in `Studio`), `description` on 15, and `version` on 29 sit under capitalized properties; no page holds two spellings of one key. `Priority` (18 pages) and `name` (3) are foreign.
- **Option Words:** every held option word equals a registered title exactly, apart from two unregistered Tags members (`Events`, `Guide`) and one blank Status; none differs from an option by case alone.
- **Context Values:** every one matches its Space title exactly.
- **Configuration:** 23 option references across views, tiles, and `matrix.json`, all matching an option exactly; 64 hidden or collapsed bucket keys; no `property_cache` in its 6 Collection sidecars; no `$order` in its 10 Space sidecars, none of which holds a property value.

**`~/Test`:** 33 pages, every held key and option word in registered spelling; 5 options, 4 with a leftover `label`; one Space holds eight property values; no cache, `$order`, or option reference.

##### The Converter Against Real Titles

A prototype of B-5 and B-6 ran every property label, option label, Context title, and Space title in both Nexuses (109 unique) through the ten formats, 1,090 conversions: no empty key, no option or property key collision under any format, no collision with a reserved key, and no restore ambiguity within a property, an option list, a Nexus's Contexts, or a Context's Spaces. Two conversions don't round-trip, both `J. Crew` under `PascalCase` and `camelCase`. On 5,000 synthetic labels heavy in digits and punctuation, only `PascalCase` and `camelCase` failed, wherever a word ending in a digit, a punctuation mark, or a capital meets the next word; no splitting rule closes it while B-6 lowercases each word's remainder. The upper-upper-lower split never fires on real titles and matches `toKebabIconId`'s rule (`UIX/Symbols/iconRoster.ts:4-11`).

**JavaScript Case Behavior:** `toUpperCase` turns `ß` into `SS` and `ﬁ` into `FI`, `toLowerCase` turns `İ` into two code units, and final sigma depends on the whole word, so lowercasing a sliced remainder gives `σ` where the word gives `ς`. An NFD label doesn't split at a hump after a combining mark, so `CaféBar` in NFD stays one word.

---

#### What Leaves, Narrows, and Changes

**Classification:** *Leaves* means the mechanism exists only for folded metadata identity or name-keyed row order. *Narrows* means it survives only for uniqueness, the reserved-key refusal, the restore's match, search, sort, or file names. *Changes* means it stays and matches by stored key, exact title, or id. *Stays* means it's independent of metadata identity.

| Mechanism | Location | Today | Under the Decisions | Note |
| --- | --- | --- | --- | --- |
| `foldKey`, `normalizeTitle` | `caseFold.ts:7-14` | Every fold | Narrows | Uniqueness, reserved keys, the restore's match, search, sort, paths. |
| `spellings` | `caseFold.ts:17-21` | Key and file-name spellings | Narrows | Its last caller is `heldName` (`Core/Files/atomicWrite.ts:320-323`), where it can live privately. |
| `compareTitles`, `matchQuery`, `rankMatches` | `caseFold.ts:23-102` | Title sort and search | Stays | |
| `byFoldedName` | `properties.ts:49-50` | Folded title to definition | Leaves | A map by stored key at its six callers. |
| `holdsList` | `properties.ts:66-69` | Whether spellings join | Leaves | With the `join` parameters it feeds (`heldKeys.ts:100`; `pageFile.ts:213`). |
| `firstPerTitle` | `properties.ts:52-63` | Folded title map | Narrows | Label uniqueness alone (`schema.ts:76`); private to `schema.ts`. |
| `stored()` label strip | `properties.ts:308-311` | Drops a leftover option `label` | Leaves | Every option stores `label` (C-2). |
| Definition and option fields | `properties.ts:133-199` | `name`; option `value` | Changes | `label` and `key` on both, plus `key_format` and `value_format` (C-2, B-1). |
| `heldKeys`, `heldKey`, `heldValue`, `writeTarget`, `stripHeld` | `heldKeys.ts:8-39,87-90` | Spelling resolution | Leaves | A read is `root[key]`, a strip is `stripKeys(root, [key])`. |
| `landValue`, `WriteTarget` | `heldKeys.ts:28-48` | Write a key, retiring spellings | Changes | Reduces to a set-or-delete beside `setOrDrop` (`atomicWrite.ts:273-282`), which drops falsy values; one helper remains. |
| `editHeldList` | `heldKeys.ts:61-78` | Joined or per-spelling list edit | Leaves | An edit of `listOf(raw[key])` at its three callers (`pageValue.ts:42`; `contextCascade.ts:46,161`). |
| `memberKey`, `joinValues` | `heldKeys.ts:51-58` | Folded member identity | Changes | Members compare with regard to case; trimming, stringifying, and NFC stay (A-3). |
| `rekeyHeld` | `heldKeys.ts:95-110` | JSON rename over spellings | Changes | An exact move with the rival rule. |
| `renameFrontmatterKey` | `pageFile.ts:208-243` | YAML rename over spellings | Changes | Exact `held`; the variants and `join` go, the rival rule stays. |
| `mergeInto` spelling step | `pageFile.ts:171-177,181` | A written key takes a dropped spelling's place | Leaves | The restore re-spell moves keys through `renameFrontmatterKey`, which keeps the line. |
| `nodeSpelledAs` | `pageFile.ts:143-161` | Quote and flow style | Stays | A-3. |
| `governorOf`, `Governor.name` | `contextResolve.ts:91-98` | Folded lookup; `name: def.name` | Changes | Exact by stored key; `Governor` becomes `{def} \| {group}`. |
| `joins`, `joinsSpellings` | `contextResolve.ts:100-106` | Whether a governed key joins | Leaves | |
| `reconcileGovernedRoot` | `contextResolve.ts:111-157` | Reconcile every governed key | Changes | The held-key check and the join-and-retire branch go; re-encoding and the never-shrink guard stay, counting exactly. |
| `contextWorldOf`, `groupOf`, `contextTitles` | `contextResolve.ts:28-84`; `contexts.ts:37-39` | Folded Context and Space titles | Changes | Exact titles, trimmed and NFC. |
| Context cascades | `contextCascade.ts:34-169` | Folded keys and titles | Changes | Exact; `rekeyContext` loses its `$order` edit (F-5). |
| Context case-only skip | `contextCascade.ts:116-119` | A case-only retitle sweeps nothing | Leaves | After the YAML rename is exact. |
| Context and Space title clashes | `contextCascade.ts:214,222,273,319` | Folded | Narrows | D-3. |
| `setSpaceContext`, Trash re-tag | `contextWrite.ts:99-110`; `spend.ts:292-302` | Joined, folded | Changes | |
| `heldPropertyValue` | `propertyValue.ts:241-244` | Read by title, joined | Changes | `root[def.key]` on both hosts. |
| `optionsByFold`, `registeredOption` | `propertyValue.ts:46-60` | Folded title map | Changes | One cached map per definition from key to label. |
| Multi-Select decode | `propertyValue.ts:108-112` | Folded dedupe; unregistered kept | Changes | Exact; unrecognized words leave the decoded value (E-3). |
| `unregisteredMembers` | `propertyValue.ts:129-134` | Built on decode | Changes | Reads the raw list minus stored keys, filtered by the Value Format (E-1); its type check duplicates `optionOps.ts:113-115`. |
| `writtenSpelling` list arm | `propertyValue.ts:184-189` | Keeps a folded held member | Changes | Exact; keeps the wikilink shape for Link and File. |
| `encodeValue` | `propertyValue.ts:192-214` | Writes the decoded word | Changes | `encodeValue(def, value)` maps label to key. |
| `applyValueAtRoot`, `writtenRoot` | `propertyValue.ts:247-256`; `governedWrite.ts:16-21` | Collapsing write | Changes | Land on the key; a Multi-Select appends the file's unrecognized words (E-3). |
| `ValueEdit`, `namesValue`, `editList`, `stripList` | `pageValue.ts:8-34` | Folded member edits, two branches | Changes | One key map (`from → to \| null`) in one pass serves a rename, a strip, a Value Format change, and the restore re-spell. |
| `valueEditRewrite`, `valueEditSweep`, `valueEditPlan` | `pageValue.ts:36-43`; `optionOps.ts:183-201` | One folded rewrite for both hosts | Changes | Take the key map; `valueEditSweep` folds into the plan plus a sweep. |
| `optionCascade`, `OptionReach`, `option-rename` | `optionOps.ts:203-254`; `configReach.ts:92`; `propertyJournal.ts:11` | One pair for files, cache, and configuration | Changes | Key pairs for files and the cache, a label pair for configuration (F-1, F-2). |
| `cacheEdit` | `configReach.ts:308-320,367` | Folded cache edit inside `reachConfig` | Leaves | The existing `editCaches` edits caches by key (`propertyCache.ts:52-68`). |
| `clearOption` | `optionOps.ts:256-267` | Sweeps pages and Spaces | Changes | Also strips the caches (J-1). |
| `registerHeldOptions` | `optionOps.ts:94-150` | Folded adoption, one-word shield | Changes | Exact recognition; the shield takes every `from` key in the record. |
| Config option arms | `configReach.ts:142-195`; `views.ts:359-375` | Mixed fold and exact | Changes | Exact by label (F-2). |
| Select evaluator | `filter.ts:79-83,119-123` | Is and Is Not through `evaluateText` | Changes | Is and Is Not compare exactly; Contains and Starts With stay folded (F-2). |
| `filter.ts` text evaluation | `filter.ts:244-267` | Folded text match | Stays | Search over Title, Text, and Link. |
| `createPage`, `updatePageProperty`, `setSpaceProperty` | `page.ts:36-37,106`; `setProperty.ts:26,28` | Write `def.name` | Changes | Write `def.key`. |
| `keyHolderFiles`, `confirmedKeyHolders`, `keyedHolders` | `keyHolders.ts:14-74` | Folded holders | Changes | Exact by key. |
| `page_values.fold`, `page_values_by_fold` | `ddl.ts:37,41`; `stores.ts:67-69,82`† | Folded holder column | Leaves | No reader remains (F-3). |
| `queryKeyHolders`, `space` rows | `stores.ts:167-182`†; `memoryStores.ts:182-187`†; `indexSeed.ts:63-71`† | Folded | Changes | `WHERE key = ?` over a `(key, path)` index; exact Context key and Space title. |
| `renameSweep` | `registryProperty.ts:82-98` | One title pair, `$order` always | Changes | The key arm runs when the key changes; no `$order` edit (F-5). |
| `recased` skip | `registryProperty.ts:125-126,150` | Case-only renames skip | Leaves | A rename sweeps when the stored key changes. |
| `bothKeyHolders`, `KEY_REFUSAL.held` | `registryProperty.ts:102-108`; `properties.ts:268-269` | Folded clash, titles, "files" | Changes | Exact keys, named as keys, counted in Items (J-1). |
| `editProperty` | `registryProperty.ts:156-173` | Every field but `id`, `name` | Changes | Format fields route through the rename paths (F-1). |
| `validateName`, `keyRefusal`, `validateOptionValues`, admission, `freeName` | `schema.ts:17-91`; `propertiesRegistry.ts:29-37`; `names.ts:53-64` | Folded on titles | Changes | Check the label and the key without regard to case (D-1, D-2); the step-aside iterates until the key is free. |
| Create supersede | `registryProperty.ts:68-76` | Folded title or id | Changes | The record's key. |
| Replay `named` and gates | `replaySchemaCascade.ts:38-93` | Folded titles | Leaves (`named`); Changes (gates) | Stored keys, exactly; the rename gate becomes "moved off `from`". |
| `SchemaJournal` records | `propertyJournal.ts:8-43` | Titles | Changes | Keys, and pairs for options (F-1). |
| `linkKeysOf` | `schema.ts:30-36` | Folded key to type | Changes | Exact by key; `cascade.ts:218`'s gate passes keys. |
| Delete-cascade Link strip | `cascade.ts:68-142` | Folded lookup, dedupe | Changes | The dedupe (`:125`) goes. |
| `propertyHolders`, `optionHolders`' loop | `deleteProperty.ts:80-84`; `optionOps.ts:269-285` | Two counters | Leaves (the loop); Changes (`propertyHolders`) | Plan builders for one dry-run counter (F-4). |
| `askHolding` | `confirmations.ts:109-116` | Always asks | Changes | Skips at the count each caller names (F-4). |
| Restore scrub | `restoreScrub.ts:25-82` | Folded worlds and links | Changes | Gains the restore re-spell (G-1). |
| Repair on open | `repairSweep.ts:17-45` | Folded reconcile | Changes | Exact (G-2). |
| `refillValues`, `refillTrashed` | `assignment.ts:49-67`; `holdings.ts:128-148` | Write `def.name` among spellings | Changes | Write the key. |
| `oweNamedKeys` | `fileEvents.ts:520-537`† | Folded title change owes adoption | Changes | A key or Value Format change owes it. |
| `useValuesEpoch`, `rekeyOverrides`, rename reply | `Core/Views/Host/useContainerValues.ts:16-64`; `Core/Session/cacheSlice.ts:55-58`; `PropertyFrame.tsx:237`; `registryProperty.ts:100,152` | Re-key by title | Changes | Carry the key pair; nothing re-keys when the key didn't change. |
| PropertyPanel `held`, Matrix `answers` | `PropertyPanel.tsx:213-216`; `matrixInput.ts:81-101` | Folded | Changes | `Object.hasOwn(fm, def.key)`. |
| `withOrderEntry` | `spaceSidecar.ts:98-114` | `$order` title edit | Leaves | Renames don't touch `$order`; a delete drops an id inside its existing sweep (F-5). |
| `SpaceRowOrder`, `readSpaceRowOrder`, `setSpaceRowOrder` | `spaceSidecar.ts:60-96`; `contextWrite.ts:198-210`; `Core/Nexus/mutateRequest.ts:105` | Two name lists in `values` | Changes | One id list, a modeled field of the Space (F-5). |
| Panel row order | `PropertyPanel.tsx:219-277` | Names, folded; three reorder paths | Changes | Both groups resolve by id; the Space reorder takes the Nexus-wide path's shape. |
| `seeded()` | `registryProperty.ts:33-44` | Seeds titles | Changes | Seed keys through the Value Format. |
| Search and Connections title folds | `caseFold.ts:48-102`; `Core/Connections/*` | Titles | Stays | |
| `heldName`, `recase` | `atomicWrite.ts:320-334` | File-name spellings | Stays | A case-insensitive disk. |

**The Removal Yield:** with every metadata key and value matching exactly and every row order by id, the spelling machinery in `heldKeys.ts` goes (`heldKeys`, `heldKey`, `heldValue`, `writeTarget`, `stripHeld`, `editHeldList`, `WriteTarget`), with `landValue` reduced to one set-or-delete and `rekeyHeld` to an exact move. So do `byFoldedName`, `holdsList` and the two `join` parameters, `joins` and `joinsSpellings`, `Governor.name`, the reconcile's join-and-retire branch, `mergeInto`'s spelling step, the property and Context case-only skips, the folded replay gate, the `stored()` label strip, `cacheEdit`, `optionHolders`' loop, `withOrderEntry` and its four call sites, `ValueEdit`'s two branches, the `$order` name folds, and the index's `fold` column with its index, writer argument, and memory fold. The additions are a converter for the ten formats; `label`, `key`, and the two format fields with a one-time registry rewrite (C-3); key checks beside the label checks; the two settings rows; the format changes routed through the rename paths, with the option rename widened to a key map and a label pair; the crossing refusal and the owed-record refusal; the restore re-spell; an exact key index; a dry mode on the sweep for every count; the Multi-Select append; adoption reading raw words; and the create step-aside clearing keys.

---

#### What's Reusable

- **The Exact Primitives:** `stripKeys` and `setOrDrop` (`heldKeys.ts:81-84`; `atomicWrite.ts:273-282`).
- **The Shared Fan-Outs:** one closure already serves pages and sidecars at each fan-out, and one stored key keeps it that way.
- **`renameSweep` as the Key Format Engine:** its YAML arm for pages and JSON arm for sidecars (`registryProperty.ts:93-96`); a Key Format change is a rename from the old stored key to the new one.
- **The Option Rename as the Value Format Engine:** `renameOption`, `optionCascade`, `valueEditRewrite`, the journal arm, and Try Again (`optionOps.ts:203-254`; `replaySchemaCascade.ts:74-81`; `Core/Properties/propertyWrite.ts:10-24`).
- **`editCaches`:** the targeted cache editor the page-rename cascade already uses, scoped by `node.cached` (`propertyCache.ts:52-68`; `cascade.ts:225`).
- **The Dry-Run Pieces:** `sweepParse`, `rewriteRaw`, and `changedKeys` (`pageFile.ts:268-274`; `governedSweep.ts:43-56`), private to the sweep.
- **`resolveRowOrder` and `nexusReorderIndex`:** the one order resolver and the Nexus-wide reorder placement (`rowOrder.ts:1-13`; `paneDrop.tsx:28`).
- **Definition-Level Settings:** a zod field on `propertyDefinitionFields`, as `link_display` is (`properties.ts:169-199`), carried by `looseDecoder` and merged per field (`propertiesRegistry.ts:110`).
- **The Settings Row:** `pickerRow` with its `caption` slot (`UIX/Menus/MenuIndex.tsx:20-77`), the `LINK_FORMAT_OPTIONS` pattern with the default first (`Core/Properties/Schema/linkFormatOptions.ts:1-8`), the shared insertion point between the separator and `SETTINGS[def.type]` (`PropertyFrame.tsx:427-428`), and the option-type predicate `PROPERTY_TYPES[def.type].options` (`PropertyFrame.tsx:391-392`).
- **The Registry Rewrite's Shape:** `migrateConfig`'s field rewrite and `.trash` walk (`Core/Nexus/migrateConfig.ts:44-72`), run once as a script for C-3.
- **The Live Drive:** `.claude/scripts/Metadata Spelling Drive/live-drive.mjs`, which seeds spellings across casings and quote styles and checks bytes, reads, writes, and five cascades.

---

#### Approaches Worth Weighing

Each fork the reports raised, with its evidence and the entry in *MetadataV3 — Decisions & Intention* that settles it.

##### What Exact Includes

**Serves:** A-1 and A-3. **Settled:** A-3.

`normalizeTitle` bundles stringifying, trimming, lowercasing, and NFC (`caseFold.ts:12-14`), and only the lowercasing is casing identity. Matching on the stringified, trimmed, NFC form keeps an outside `- 2024`, stray spaces, and an NFD key matching while ending the case fold.

##### Decoded Values Hold Labels

**Serves:** C-1, C-2, and F-2. **Settled:** C-2 and F-2.

A decoded Select, Status, or Multi-Select value holds labels, decode maps stored key to label through one cached map per definition, and `encodeValue(def, value)` maps label to key at its six callers, each already holding the definition. Every display, filter, sort, group, bucket key, and creation seed already works in labels, so configuration needs no change; holding keys instead would push a key-to-label lookup onto every display site. The option channels (`property:renameOption`, `removeOption`, `clearOption`, `holders`) name an option by key, which the journal records and replay compare.

##### The Case-Conversion Module

**Serves:** B-2, B-5, and B-6. **Settled:** B-5 and B-6.

One module, `Core/Properties/keyFormat.ts`, owns the ten formats as a splitter plus join-and-case rules: `KEY_FORMATS` with `Match Title` first, `formatKey(label, format)`, and the ten spellings of a label for the restore. It sits in Core because the engine, the Trash, and the renderer all reach it, and UIX can't import Core. It NFC-normalizes the label before splitting, splits at spaces, `-`, `_`, lowercase-to-uppercase humps, and upper-upper-lower boundaries over Unicode letter classes, uses `toLowerCase` and `toUpperCase` rather than their locale forms, and lowercases whole words before uppercasing a first letter so final sigma holds. `lowercase` and `UPPERCASE` re-case the label as typed. Adoption's test is `formatKey(w, format) === w`, so the round-trip exception only withholds adoption of foreign words.

##### Uniqueness and Collisions

**Serves:** D-1 to D-3 and F-1. **Settled:** D-1, D-2, D-3, and F-1.

- **Labels and Keys:** property labels and keys, option labels and keys within a property, and Context and Space titles stay unique without regard to case.
- **Reserved Keys:** a one-word label folding to a modeled key is refused at creation; a format change reaching one, as `Heading Icon Hidden` under `snake_case`, is refused on the key.
- **Crossing Keys:** a Value Format change can give one option a key another option holds before the change while every uniqueness check passes. An exhaustive search over 11,480 short labels found 80,480 such pairs, every one pairing `lowercase` or `UPPERCASE` with a hump-splitting format; under `lowercase` to `kebab-case`, `WifiPro` goes `wifipro` to `wifi-pro` while `WiFi-Pro` goes `wifi-pro` to `wi-fi-pro`. A hand-edited key widens it further. The refusal drops pairs whose key doesn't change and refuses when any pair's new key is another pair's old key, through the matcher replay applies.
- **The Step-Aside:** `freeName`'s ` (2)` survives a format as `name-(2)` in `kebab-case` and `name(2)` in `camelCase`, so the step-aside iterates until the key is free.

##### Adoption

**Serves:** E-1 and E-2. **Settled:** E-1 and E-2.

Adoption reads the file's raw members (`optionList`, `propertyValue.ts:43-44`) minus stored keys, keeps a word the Value Format leaves unchanged and whose label duplicates no option without regard to case, and dedupes its batch by fold, first wins. The shield takes every `from` key of an owed `option-rename` with exact membership; a Key Format change's owed rename and an owed `option-remove` need none, since skipped pages hold a key no definition reads and a removed option stays in the definition until its strip lands. `oweNamedKeys` owes adoption when a key or a Value Format changes, since the format decides what's adoptable.

##### E-3's Append

**Serves:** E-3. **Settled:** E-3.

No existing mechanism carries unrecognized words: the write path never targets a member, the never-shrink guard skips the target key, and `writtenSpelling` only re-spells what it's handed. `writtenRoot`, which both hosts share, already reads the held value; for a Multi-Select with a non-empty written list it appends the held words that are no stored key, and `applyValueAtRoot` does the same so the panel doesn't flicker. An emptied list reaches the host as a blank value and clears the key (`page.ts:103`), so emptying removes the foreign words with no added code. The append stays out of `writtenSpelling`, which the reconcile and the refill also call, so a restore still drops unrecognized words (G-2). Undo rides the same host path.

##### The Index Query

**Serves:** F-3. **Settled:** F-3.

`page_values` drops `fold` and `page_values_by_fold`, gains `page_values_by_key ON (key, path)`, and `queryKeyHolders` becomes `WHERE key = ?`; the writer drops its fold argument, and `space` rows carry the exact key and the trimmed NFC title. `INDEX_GENERATION` moves to 19, required both by the column change and by A-2 changing what existing `space` rows hold. Context holder queries stay on `page_values`, since `space` rows miss a Context key naming no Space. The memory double and the contract change with the store.

##### One Counter

**Serves:** F-4. **Settled:** F-4.

`sweepGovernedRoots` gains a dry mode, and every arm takes `rewriteRaw`'s no-op guard (`changedKeys` for raw and sidecar arms, `next === content` for the text arm), which also stops today's spurious sidecar writes and the adoption they owe. The count is the dry run's `touched` size, unreadable files falling in `skipped`. Each confirmation counts its own operation's plan: Delete's strip plan (dropping ID-less and duplicate-ID pages and adding `$order`-holding Spaces), Clear's and Remove's strip, the Key Format change's rename plan, and the Value Format change's key map. `propertyHolders` and `optionHolders` reduce to plan builders behind `property:holders`, which takes a request shape for the two format changes. Collection caches stay out of the count, as Delete's and Remove's already leave out their cache and configuration passes. `askHolding` stays the one asker and skips at the count each caller names.

##### Recording a Format Change

**Serves:** F-1. **Settled:** F-1.

- **Records:** `{op: 'rename', id, from, to}` with keys; `{op: 'delete', id, key}`; `{op: 'option-rename', id, keys: [from, to][], label?: [from, to]}`; `{op: 'option-remove', id, key}`, whose label replay looks up while the option is still listed. With `$order` by id, no property record carries a label.
- **What Each Change Writes:** a Key Format change is a rename with keys only. A Value Format change carries the key pairs and no label pair, so it runs no configuration pass. An option label rename always carries the label pair and carries a key pair only when the format writes a different key from the new label.
- **Gates:** the rename gate becomes "the definition has moved off `from` and no definition holds `from`", sweeping to the definition's current key, so a chained rename still sweeps (`replaySchemaCascade.test.ts:125-139` already expects that intent). The option-rename gate holds every `to` and no `from` among current keys.
- **Owed Records:** an option rename, an option removal, or a Value Format change refuses when the slot holds a different record, pointing to Try Again, through the boolean `writeSchemaJournal` already returns; `removeOption`'s run-anyway branch goes with it. A property rename and a Key Format change keep running unjournaled with the record in their answer.
- **The Read Window:** the registry commits before the sweep (`registryProperty.ts:131-150`), so a skipped file reads as foreign until Try Again lands.

##### The Option Cascade

**Serves:** F-1 and F-2. **Settled:** F-1, F-2, and J-1.

`optionCascade(root, def, keys, label?)` runs three steps: the file sweep over the key map, `editCaches` over the key map for the Collections caching the property (counting damaged Collections as skips, as `reachConfig` does at `configReach.ts:351-353`), and `reachConfig` with the label pair only when the label changed. `cacheEdit` and its branch leave `configReach`. Clear runs the same cache strip, which closes the cleared-value return.

##### Configuration Matching

**Serves:** F-2. **Settled:** F-2.

| | Exact | Case-Insensitive |
| --- | --- | --- |
| Matchers | One: `memberKey` loses its lowercasing and serves keys, labels, and Context values | Two: `editList` takes a matcher chosen at five call sites |
| Cascade sites | None beyond the shared matcher | The file rewrites keep exact; the configuration arms pass the folded matcher |
| Evaluation sites | Select's Is and Is Not leave the text evaluator (+5) | Folds added to `evaluateSet`, sort's rank map, group's order and tail, every bucket-key reader and writer, creation seeds, and chips |
| Cost | About +4 lines, nothing per row | About +40 lines, a fold per row on every sort and group run |

Every live reference already matches exactly, and Pommora writes each one itself. Exact matching with Select's Is and Is Not split out is the one rule.

##### Row Order by Id

**Serves:** F-5. **Settled:** F-5.

`$order` becomes one list of property and Context ids, read by `spaceNodeFrom` as a modeled field beside `icon` and `color` rather than riding in `values`. Property ids carry a `prop_` prefix and Context ids don't, so one list serves both panel groups. The panel resolves both groups through `resolveRowOrder` keyed by id, its `nameOf`, `orderKey`, and `normalizeTitle` calls going, and the Space reorder writes the full id list placed by `nexusReorderIndex`, as the Nexus-wide Context order does. `setSpaceRowOrder` takes one list. `withOrderEntry` and its rename call sites go; the property delete and the Context unlink drop the id inside the sweeps they already run over every Space sidecar, as views and the registry drop ids in their own delete passes, while `state.json`'s orders stay stale-tolerant.

##### The Restore Re-Spell

**Serves:** G-1 and G-2. **Settled:** G-1 and G-2.

- **Where:** inside `scrubReturning`'s page and sidecar closures, before `unlinked` and the reconcile, since the scrub's link map becomes an exact key map and a re-spelled Link key has to be re-spelled before it's read. Phase 8's `repairLanded` runs after the relocate over links only, so the two don't meet.
- **Reach:** registry-wide (`tree.config.registry`), matching what the sweeps reach, so a dormant value in a Collection that doesn't assign the property re-spells too.
- **Shape:** one respeller built per restore: the exact set of stored keys, and a map from each folded spelling of each label across the ten formats to its key, `null` marking a spelling two labels share. A held key that is a current key wins; otherwise the map answers. Keys move through `renameFrontmatterKey` on page text, which keeps the line, and the exact `rekeyHeld` on sidecars; option words go through the same key-map rewrite a Value Format change uses. Context keys and Space titles use the same respeller with each title as label and key.
- **Rival:** `refillTrashed` can fill the current key into a trashed copy that holds an old spelling, so the exact key keeps its value and the variant stays foreign.
- **Caches:** a Collection restored after a Value Format change holds old keys in its cache, which the reassign refill then drops; the same option map over `editCacheBlocks` reaches it.
- **Cost:** about (15 definitions + 59 options) × 10 conversions per restore on NexusOS. A token fold would skip the converter but miss length-changing case (`Straße` and `STRASSE`) and accept spellings no format writes.

##### Data Held Today and the Cutover

**Serves:** I-1 and C-3. **Settled:** I-1 and C-3.

With exact keys under `Match Title`, NexusOS's `tags`, `description`, and `version` read as foreign until those properties take a `lowercase` Key Format, which also moves the two `Studio` pages from `Tags:` to `tags:`. Every other key, option word, and Context value reads exactly. The two `properties.json` files and six deleted-property records are rewritten once by a script in `migrateConfig`'s shape, then deleted.

##### Sapphire and Obsidian

**Serves:** I-2 and D-1. **Settled:** I-2 and D-1.

With keys unique without regard to case, Sapphire's exact-first resolution reads and writes Pommora's keys correctly, and Obsidian's lowercased property types never meet two Pommora keys. Sapphire treats `in-progress`, `In Progress`, and `IN_PROGRESS` as three options, so Nathan's properties take the formats their Sapphire automations use.

##### The Settings Rows and the Leaf

**Serves:** H-1 and J-1. **Settled:** H-1 and J-1.

One `FormatRows` section between the separator and `SETTINGS[def.type]` (`PropertyFrame.tsx:427-428`), followed by its own separator, reaches all nine user types, Text included; the Context, Created Time, and Last Edited Time arms are unreachable, since those definitions never reach the editor (`PropertyFrame.tsx:194,374-376`). Value Format shows when `PROPERTY_TYPES[def.type].options` is set. Each row is a `pickerRow` with its hint in the caption, sending through its own channel on the rename paths rather than `defEditOp`. The ten-option pane is the panel's longest picker. The Settings leaf at `Core/Settings/frames.ts:636-651` takes the label Metadata, the key `metadata`, which nothing persists or references (`Core/Settings/SettingsWindow.tsx:35,64`), and the section title Maintenance.

##### Sequencing With Path Links

Phase 7 changes no DDL, so generation 19 is MetadataV3's. Phase 8 pins `spend.test.ts:1031` and `restoreScrub.test.ts:320` as passing, and MetadataV3 inverts `:1031`; landing after Path Links, MetadataV3 owns that inversion. The plan's baseline is the commit after Path Links' Phase 9.

---

#### Tests That Change

About forty tests across twenty-one files pin folded matching; line numbers are the working tree's.

- **Go With Their Subjects:** `Core/Files/heldKeys.test.ts` whole, apart from `:23` (`joinValues`), which inverts; `Core/Paths/caseFold.test.ts:86` moves to `heldName`; `Core/Files/pageFile.test.ts:292,308,322,357,368`; `Core/Properties/properties.test.ts:310`; `schema.test.ts:132`; `keyHolders.test.ts:151,157`; `deleteProperty.test.ts:218`; `assignment.test.ts:137,144`; `repairSweep.test.ts:179`; `Core/Trash/spend.test.ts:868`; `Core/Contexts/spaceSidecar.test.ts:105`.
- **Invert:** `propertyValue.test.ts:378,385,407,445,450,458,472`; `governedWrite.test.ts:148-248`; `setSpaceProperty.test.ts:163-187`; `value.test.ts:115,134`; `contextResolve.test.ts:64-330`; `contextWrite.test.ts:150,164,289,296,308`; `keyHolders.test.ts:120,141`; `renameSweep.test.ts:86-140`; `assignment.test.ts:121,133`; `removeProperty.test.ts:116,296`; `pageValue.test.ts:92,99,103,115`; `optionOps.test.ts:437`; `registryProperty.test.ts:142,157`; `replaySchemaCascade.test.ts:125,203`; `settle.test.ts:1028,1059`†; `PropertyPanel.test.tsx:137,357`; `filter.test.ts:288,366`; `matrixInput.test.ts:172`; `cascade.test.ts:216,561`; `restoreScrub.test.ts:196,234`; `spend.test.ts:862,959,1031`; `trashRecovery.test.ts:714`; `useViewHost.test.tsx:525`; `assignValue.test.ts:47`; `contexts.test.ts:43`; `contextCascade.test.ts:143-878` (its `['Pommora','pommora']` fixture); `indexSeed.test.ts:357`†; `contentIndex.test.ts`, `indexMaintenance.test.ts:144-175`, `storesContract.ts:74,166-171`†; `Desktop/Store/open.test.ts:79,148-170`, which rewrite to the new shape.
- **Change:** `settle.test.ts:1013-1026`† (the shield takes pairs); `replaySchemaCascade.test.ts:242,323,376` (list records); `optionOps.test.ts:616` (a dry run); `confirmations.test.ts:39-59` (the skips); `configReach.test.ts:249` (the cache strip moves).
- **Keep Their Uniqueness Intent, With Key Cases Added:** `schema.test.ts:16,38,108`; `propertiesRegistry.test.ts:70`; `registryProperty.test.ts:78`; `names.test.ts:119`; `contextWrite.test.ts:81`; `settle.test.ts:906`†.
- **Stay:** `propertyValue.test.ts:423,465` and the drive's Check matrix (checkbox words, A-3); `restoreProperty.test.ts:292` (a case-insensitive disk); `restoreScrub.test.ts:320`; Connections, search, and path-fold tests.
- **The Live Drives:** the Metadata Spelling Drive's `:97,108,126,185,200,203,205` invert, its seeds move from `{name}` and `{value}` to `{label, key}`, and its descriptions at `:41,113,131,150,166,178,190` lose "in another casing". The Option Picker Drive's zero-count Remove dialog (`:174`) and its Clear at one (`:168,170`) stay, while its field reads (`:25-26,33,39,94,155,254`) move to `label` and `key`.

---

#### What Contradicts the Sources

- **PropertiesPM:** *§Identity & Values* says names are "case-folded, trimmed and NFC-normalized once at write" (`.claude/Features/PropertiesPM.md:27`), and they're stored trimmed and NFC and folded only when compared (`properties.ts:272-274`; `schema.ts:46-47`). "A write collapses the spellings into the registered one" (`:29`) holds for `writtenRoot`, while `refillTrashed` never collapses (`holdings.ts:141`). *§Schema Mutations*' "Edit options" row omits the `property_cache` reach (`:133`; `configReach.ts:367`).
- **The Earlier Investigation:** it said a Key Format change's `$order` edit "has nothing to do", and `renameSweep` rewrites every Space whose `$order` lists the property (`registryProperty.ts:95`; `governedSweep.ts:101-105`). It said E-3's write could reuse `editList`'s in-place edit, and no write targets a member (`PropertyPicker.tsx:398-406`; `governedWrite.ts:17-18`). It said a settle mid-sweep could adopt unconverted words, and adoption shares the schema lock (`optionOps.ts:96,221-253`). It said D-2's refusal could guarantee a safe replay, and it doesn't (*§Uniqueness and Collisions*). It named only `prefer-new` as deleting a key on a case-only pair. It gave the step-aside's spellings as `name-2` and `name2`.
- **The Planning Handoff:** it said Path Links' Phase 7 adds an ID column to `indexed_files`; the phase joins `page_values` instead (`stores.ts:46-52`†).
- **Code Comments:** `rekeyHeld`'s doc calls it the twin of `renameFrontmatterKey` "by the same collision and join rules" (`heldKeys.ts:94`), and the two differ on a case-only pair. `Core/Platform/stores.ts:66-69`† says "in any casing" twice.
- **Sapphire's Docs:** `AutomationsSPH.md:43` says actions add a second key, and every write resolves to the held variant (`frontmatterSplice.ts:38`).

---

#### Reconciliation Log

##### Disagreements Resolved

- **Select's Is and Is Not:** the converter scout would keep the fold as search, and the cascades scout would split Select out of the text evaluator. F-2 puts option references under one rule, and a Select cell holds only registered labels once identity is exact, so Is and Is Not compare exactly while Contains and Starts With stay search.
- **What `$order` Holds:** the identity scout kept labels and carried them in the rename and delete records; the cascades scout proposed ids; the main session proposed keys. Ids remove `withOrderEntry`, the records' labels, and F-2's `$order` half, where keys keep the rename edit; Nathan chose ids (F-5).
- **An Owed Record:** the cascades scout would refuse every format change, and the identity scout would refuse only a Value Format change. A property's replay follows its id and recovers a chained rename, while an option's replay and shield depend on the slot; Nathan chose refusing option renames and Value Format changes (F-1).
- **`mergeInto`'s Spelling Step:** the identity scout would keep a pairing version so re-spelled keys hold their place; the cascades scout moves restore keys through `renameFrontmatterKey`, which keeps the line. The step goes.
- **NexusOS Space Sidecars:** the cascades scout counted 21; the folder walk finds 10 under `.nexus/contexts` across three Contexts, matching the earlier count.

##### Claims Narrowed or Widened

- **Identity scout, "the YAML rename deletes only under `prefer-new`":** widened to both collision rules, run against the real function.
- **Cascades scout, adoption triggers:** widened to every page whose values changed and every path newly in reach (`settle.ts:150-153`†).
- **Converter scout, B-5's exception:** widened from consecutive single letters to any `PascalCase` or `camelCase` word ending in a digit, a punctuation mark, or a capital.
- **Earlier scouts, the index needing `fold` for Contexts:** with Context keys exact, nothing reads it.

##### Citations Corrected

| As Cited | At `988f6ee43` |
| --- | --- |
| `stores.ts:58-60,72-73,158-164` | `stores.ts:67-69,82,167-173`† |
| `memoryStores.ts:176-181` | `memoryStores.ts:182-187`† |
| `storesContract.ts:141-142` | `storesContract.ts:166-171`† |
| `indexSeed.ts:39-58`, `:56`, `:62-69` | `indexSeed.ts:41-61`, `:58`, `:63-71`† |
| `settle.ts:116,149` | `settle.ts:117,153`† |
| `handlers.ts:104-107` (Nexus) | `handlers.ts:104-110`† |
| `fileEvents.ts:425-426,432,513-530` | `fileEvents.ts:432-433,439,520-537`† |
| `mutate.ts:178-180` | `mutate.ts:185` |

`cascade.ts`, `mutate.ts`, and `spend.ts` match HEAD, so the earlier † on them no longer applies.

---

#### Cleaned Reports

##### Scout 1 — Identity and the Registry

**Baseline:** `988f6ee43` and the working tree; reference counts from TypeScript's find-references over `Core/tsconfig.json`; the case-only rename checks ran the real `renameFrontmatterKey` and `rekeyHeld`.

**The Split's Real Decisions:** what a decoded value holds (labels, with `encodeValue(def, value)`); `optionValues` splitting by caller; one identity for the option channels (the key); the Multi-Select read and write under E-3; the rename reply carrying the key pair; `withOrderEntry` and `OptionReach` each splitting a pair. Everything else is a mechanical rename.

**Journal Needs:** the rename arm needs the old and new key and, while `$order` held labels, the old label; the delete arm needs the key; option-rename needs key pairs and a label pair; option-remove needs the key.

**Ordering Hazards, If Formats Landed on Folded Matching:** the case-only YAML rename deletes keys; the `recased` skip turns the cutover into a registry-only edit; `writeTarget` keeps an old spelling on skipped pages for good; `writtenSpelling` re-applies an old Value Format to missed members; the folded replay gate clears an owed case-only rename; folded decode beside separator formats adopts `in-progress` as a second option or drops it from a Select.

**Opinions (Labeled):** the decoded value should hold labels; the rename gate should be "moved off `from`"; `seeded()` must key seeds through the Value Format, since it runs on every `editProperty`; a per-field Sync merge of a label on one device and a format on another would be C-2's first real test of trusting a stored key.

##### Scout 2 — Cascades, Counts, Adoption, Restore

**Baseline:** `988f6ee43` and the working tree.

**Matching Costs:** exact, about +4 lines; case-insensitive, about +40 and a fold per row on every sort and group run.

**Cache Split:** `cacheEdit` moves to `editCaches` by key; configuration takes the label pair alone, so a Value Format change runs no configuration pass; Clear gains the cache strip.

**Counter:** a dry mode on `sweepGovernedRoots` with the no-op guard on every arm.

**E-3:** the append in `writtenRoot` and `applyValueAtRoot`; never in `writtenSpelling`.

**Restore:** a ten-spelling respeller in `scrubReturning` before `unlinked` and the reconcile, registry-wide, with a rival rule for `refillTrashed`'s fills.

**Reach:** rename and Key Format reach Collection pages and every Space sidecar; option rename and Value Format add every container sidecar, tiles, `matrix.json`, `settings.json`, and the cache; Delete adds every Collection's assignment and cache; Remove reaches one Collection; Clear reaches pages and Space sidecars. Pages outside every Collection are neither swept nor read as holders, and `/Tasks` and `/Events` need a decision when Agenda lands.

**Opinions (Labeled):** store `$order` as ids; refuse format changes while a record is owed; the Delete dialog's "stripped from N Items" wording is Nathan's call.

##### Scout 3 — Converter, Interface, Drives, Docs

**Baseline:** `988f6ee43` and the working tree; the converter prototype and its corpus runs sit in the session scratchpad.

**Converter Must-Dos:** NFC first and last; non-locale case methods; whole-word lowercasing; Unicode letter classes for humps; an empty-key refusal for the seven word formats, with `---` staying non-empty under the three whole-label formats.

**Interface:** the converter in `Core/Properties/keyFormat.ts` beside a `keyFormatOptions.ts` that mirrors `linkFormatOptions.ts`; one `FormatRows` section; the leaf's key free to follow its label.

**Documentation That Becomes False:** PropertiesPM (`:27,29,74,129-139`), CorePM (`:93,94,155`), ContextsPM (`:12,26,27`), PagesPM (`:8`), NexusRecordPM (`:14`), InterfacePM (`:76`), ConfigurationPM (`:136-141`), and ViewTypesPM (`:41`, Select's Is and Is Not); the project `CLAUDE.md` holds none.

**Opinions (Labeled):** keep the upper-upper-lower split as defensive; assert the corpus's real round-trip figure rather than zero; the duplicate-looking `work` beside `Work` deserves a ruling (E-3 settles it).
