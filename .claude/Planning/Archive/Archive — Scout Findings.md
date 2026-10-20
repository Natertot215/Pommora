### Archive — Scout Findings

**DATE:** 10-19-2026
**HEAD:** verified at `213f95a3b`. HEAD has since moved to `5c2385f58` through unrelated number-picker and glyph commits, none of which touches a cited range.

These are the five read-only scout reports behind *Archive — Investigation*: A on cascade reach; B on the index, discovery, the watcher, sync, and location; C on the Trash's machinery; D on views, the table, the menus, and batch actions; and E on windows, history, settings, confirmations, and notices. They're evidence of what the code does and of what each scout weighed, not direction. *Archive — Decisions & Intention* governs intent, and *Archive — Investigation* reconciles these reports against the code and the decisions, listing every claim it narrowed, corrected, dropped, or couldn't verify in its *§Reconciliation Log*. Each recommendation a decision has since settled differently is condensed to one line naming that decision, and each question to Nathan names the decision that answers it or marks it as the planner's.

Every scout received the scope update that Sets are archivable (A-2). Scout D also received the rulings that the Trash's look stays (A-3) and that batch actions come by right-click and through ActionLabel (G-6).

---

#### Scout A — Cascade Reach

**Mandate:** what every cascade opens today, whether an archived page or Set would be among it, and what one definition of reach would take.

##### Findings

###### The Headline: Picking the Location Decides the Reach

Both hidden locations the scouts weighed are **hidden** to the corpus. `hiddenFolder` (`Core/Paths/exclusion.ts:17-24`) matches any segment starting with `.` or `_`, and `outsideContent` (`exclusion.ts:77-82`) rejects any path with a hidden segment. That one predicate gates the corpus walk (`Core/Files/walk.ts:73-83`), index maintenance (`relCorpusPath`, `Core/Index/indexSeed.ts:89-93`), the seed (`indexSeed.ts:225`), and so every `query… ?? nexusCorpus(root)` fallback. **Today nothing reaches either `<Collection>/.archive/` or `.nexus/archive/<ID>/`.** Not a sweep, not the index, not the seed, not the asset migration. Picking a location *is* picking how reach gets in. The table runs each candidate through the predicates that matter:

| Predicate | `<Coll>/.archive/` | `.nexus/archive/<CollID>/` | Visible kind-marked `<Coll>/<Archive>/` |
|---|---|---|---|
| Corpus / index (`outsideContent`, exclusion.ts:77) | out (hidden) | out (hidden) | **in** |
| Watcher (`neverWatched`, exclusion.ts:27-36) | **not watched** (hidden folder at `i < leaf`) | watched (the `i === 0` `.nexus` exemption), but `classifyEvent` drops it (`Core/Nexus/fileEvents.ts:241`) and the index half rejects it | watched |
| Sync (`manifestAdmits`, exclusion.ts:44-61) | **doesn't sync** (`!neverWatched(segs)` at :59) | syncs | syncs |
| Property-sweep scope (`corpusUnder`, indexSeed.ts:78-82) | in, free (`startsWith(folder/)`) | **out** until the scope step admits the archive root as one prefix | in, free |
| Moves with a Collection rename or trash | yes | no: keyed by ID, orphaned when the Collection is deleted | yes |
| Walk adoption | n/a | n/a | **adopted as a Set today**: nested folders resolve to `'set'` (`Core/Nexus/folderKind.ts:53`), `readChildSets` reads them (`Core/Nexus/readNexus.ts:158-170`), and the missing sidecar is listed (readNexus.ts:108-109) and stamped (`Core/Nexus/adopt.ts:133-147`) |

To give the hidden locations reach, carve-outs would be needed in `outsideContent`, `neverWatched`/`manifestAdmits`, `classifyEvent` (fileEvents.ts:241, :252), `listMarkdownFiles` (walk.ts:32-39), and `relCorpusPath`, each one an exception to the hidden-name rule *CorePM §Folder Exclusion* states as total. Without index maintenance in particular, Reach-In breaks on the second cascade. Say a rename rewrites an archived page's `Status:` to `State:`. The index still lists it under `Status`, so the next `State → X` rename's `queryKeyHolders('State')` misses it.

###### The Inventory

"Reached?" covers the two hidden candidates (H) and a visible kind-marked archive folder (V).

| # | Operation | How it enumerates files | Reached? |
|---|---|---|---|
| 1 | Property rename / Key Format (`renamePlan`, `Core/Properties/registryProperty.ts:106-120`) | `keyHolderFiles` = `queryKeyHolders(key) ?? nexusCorpus` ∩ `collectionFolders` (`Core/Properties/keyHolders.ts:12-18`; `Core/Properties/assignment.ts:152-156`, tree Collections + damaged ones), plus every Space sidecar through the plan's `sidecars` arm (`Core/Properties/governedSweep.ts:88-109`) | H: no · V: yes |
| 2 | Rename clash refusal (`bothKeyHolders`, registryProperty.ts:124-130) | `confirmedKeyHolders`: same candidates read from disk, plus its own Space loop (keyHolders.ts:21-39) | H: no · V: yes |
| 3 | Property delete (`deletePlan`/`stripAndRemove`, `Core/Properties/deleteProperty.ts:117-142`) and its snapshot (deleteProperty.ts:32-75) | `keyedHolders(keyHolderFiles)`; the snapshot loops `collectionFolders` sidecars and `spaceSidecars` itself | H: no · V: yes |
| 4 | Property Remove from a Collection (`Core/Properties/removeProperty.ts:36-55`) | `keyHolderFiles(root, key, [collectionFolder])`; values cached by ID into the Collection sidecar's `property_cache` | H(in-Coll) only if the corpus admits it · V: yes |
| 5 | Property re-assign refill (`restoreCachedValues`, assignment.ts:63-103) | **By ID**: `recordById(tree)`, filtered to tree pages under the Collection (assignment.ts:79-84), then `sweepRootsById` (governedSweep.ts:151-175) | **no, any location**: archived IDs stay cached and are never refilled |
| 6 | Option rename / remove / clear / Value Format (`valueEditPlan`, `Core/Properties/optionOps.ts:192-200`; `optionCascade` :210-228) | `keyHolderFiles` ∩ `collectionFolders` + Space sidecars; `cacheSweep` edits `property_cache` blocks on `tree.collections` (`Core/Properties/propertyCache.ts:53-68`) | H: no · V: yes (cached values ride the Collection sidecar either way) |
| 7 | Context rename / Space rename (`sweepMembers`, `Core/Contexts/contextCascade.ts:65-78`) | `queryMembers(key, title) ?? nexusCorpus`, **unscoped**, plus every Space sidecar | H: no · V: yes |
| 8 | Context delete / Space delete unlink (`unlinkContextKey`/`unlinkSpaceValue`, contextCascade.ts:128-181) | Same as 7, with undo-and-refuse on any skip | H: no · V: yes |
| 9 | Context/Space restore re-tag (`reapply`, `Core/Trash/spend.ts:253-283`, :326-336) | **By ID**: `roots = recordById(tree)` (spend.ts:250); `reapply` drops IDs not in `roots` silently (spend.ts:335) | **no, any location** |
| 10 | Page rename/move re-spell (`renameCascade`, `Core/Nexus/cascade.ts:207-262`) | `queryMentions(keys) ?? nexusCorpus`, **unscoped**; tiles gated by `tilesLink`; `editCaches` for Link caches | H: no · V: yes |
| 11 | Heading rename (`renameCascade` heading arm, cascade.ts:222) | `queryMentions(keys, heading) ?? []`: **index only, no corpus fallback** | H: no · V: yes when indexed |
| 12 | Outside-move re-spell (`relink`/`payOutsideMoves`, `Core/Nexus/settle.ts:249-305`) | Pairs index vanish/land IDs against `livePathOf`, then `renameCascade` | archive in/out moves never pair (`livePathOf` is null), so `owed.vanished` holds the ID indefinitely (settle.ts:276-278) |
| 13 | Delete's Link strip (`deleteCascade`, cascade.ts:73-146) | `queryMentions(gone) ?? nexusCorpus` filtered to `liveIdIndex` paths ∪ `withheldIn` folders (cascade.ts:101-106); the `twins` branch skips a file whose ID `livePathOf` can't answer (cascade.ts:108-119) | **no, any location**: filtered at :105, and the twin check at :114 would count it as a twin if it got past |
| 14 | Delete's `paths` (`deleteOp`, `Core/Trash/delete.ts:50`) | `pagesOf(before)` under the target: **tree only** | Archived pages inside a deleted Collection add nothing to `gone`, so live Link values naming them survive |
| 15 | Trash empty (`emptyBundle`, spend.ts:67-103) | `contentPages` → `listMarkdownFiles` (walk.ts:32-39, recursive, **skips hidden folders**), then `deleteCascade` + `parkLinks` | H: an archive inside a trashed Collection is skipped (IDs not gathered, metadata not dropped) · V: included |
| 16 | `parkLinks` (`Core/Trash/holdings.ts:99-109`) | Trash bundles only (`listBundles`) | n/a: parks into bundles |
| 17 | Restore Link refill (spend.ts:284-305) | **By ID**: `refillValues(roots)`; an ID absent from `roots` goes to `refillTrashed` (holdings.ts:144-162), which looks in bundles alone | **no, any location**: the value is **silently lost** |
| 18 | Restore reconcile (`scrubReturning`/`repairLanded`, `Core/Trash/restoreScrub.ts:179,207`) | The returning artifact's own pages | an archive inside a restored Collection rides along (V) or is skipped (H) |
| 19 | `configReach` (`Core/Nexus/configReach.ts:312-381`) | **Tree containers** (`containersOf`, :312-317) + damaged sidecars + tile docs + matrix + settings: configuration only, no pages | an **archived Set's sidecar is never reached**, any location |
| 20 | Schema journal replay (`Core/Properties/replaySchemaCascade.ts:37-90`) | Re-runs 1/3/6 through `collectionFolders` + `keyHolderFiles` | follows 1/3/6 |
| 21 | Context journal replay (`replayPendingRename`, contextCascade.ts:290-352) | Re-runs 7 (`cascadeTitle`) | follows 7 |
| 22 | Repair sweep on open (`Core/Properties/repairSweep.ts:17-45`) | The seed's re-read corpus rels, defs by `owningCollection` (top path segment, `Core/Nexus/treePatch.ts:84-91`) | follows the corpus; for V it resolves the right Collection for free |
| 23 | Clear Exclusion Cache (`Core/Settings/exclusionScan.ts:31-95`) | `listPathsUnder` the excluded folders through `reachingExcluded`, which still drops hidden folders | H: an archive inside an excluded Collection keeps its IDs · V: cleared with the rest |
| 24 | Asset directory migration (`Core/Assets/assetMigrate.ts:117-175`) | `corpusFiles(reachingExcluded)` + `sidecarsUnder` (non-hidden dirs) + `spaceSidecars` | **H: archived pages' and Sets' asset links are not rewritten, while the legacy files they name are trashed** (data loss) · V: reached |
| 25 | ID adoption/stamping (`stampAdopted`/`stampMissing`, adopt.ts:133-194) | `stampTree` walks content folders; `stampMissing` takes the tree's `unreadable` list | archived pages are never stamped; V would stamp a `_pageset.json` onto the archive unless its kind is checked first |
| 26 | `dropPageMetadata` (`Core/Nexus/pageMetadata.ts:119-130`) | Drops the IDs `idHeld` doesn't answer | safe while archived (callers pass explicit IDs), but deleting a Collection skips a hidden archive's IDs (row 15) |
| 27 | Remint judge (`projectBaseline`/`latchBaseline`, `Core/Nexus/remintLedger.ts:21-60`; `adjudicate`, `Core/Nexus/remint.ts:25-39`) | `recordsOf(tree)` | archived IDs drop out of the baseline |

###### Reading the Inventory

Five reach families exist, each defined separately:

- **Governed reach:** property and option sweeps. Index-or-corpus candidates intersected with Collection folders, plus every Space sidecar (rows 1–4, 6, 20).
- **Content reach:** link re-spells and Context sweeps. Index-or-corpus with no scope (rows 7, 8, 10, 11, 21).
- **Tree reach:** the delete strip (`liveIdIndex ∪ withheldIn`, row 13), the delete's `paths` (row 14), `configReach` (row 19).
- **By-ID reach:** every refill. `recordById(tree)` passed as `roots` to `sweepRootsById` from three sites (`assignment.ts:81`, `spend.ts:250`, used at `:298` and `:332`, and `Core/Trash/restoreProperty.ts:57`), plus the `id-live` refusal (`Core/Trash/resolve.ts:36-38`).
- **Bundle reach:** `contentPages`/`listMarkdownFiles`, `listBundles` (rows 15–17).

A location the corpus admits makes the governed and content families reach archived pages with no code change. **The tree and by-ID families never do, whatever the location.** That's where Reach-In has to put in work, and where C-2's strip-without-refill hazard lives.

###### The Un-Adopted-Folders Claim

The mechanism is two separate predicates. The corpus admits every non-hidden, non-asset, non-excluded `.md` (`!outsideContent`), with no kind gate. The tree holds only what kind resolution places: `readRootFolder` returns null unless the folder resolves to `'collection'` (readNexus.ts:194-203), and a root-level page sits in no container (fileEvents.ts:262-263). So the "un-adopted" set is narrower than the doc implies. It covers root-level loose pages, Agenda folders (sidecar-marked `/Tasks` and `/Events`, `folderKind.ts:39-51`), `'unknown'`-kind folders, and empty sidecar-less root folders. **A sidecar-less nested folder isn't un-adopted. It's stamped into a Set.**

On reach, the claim "indexed and cascade-reachable" (`.claude/Features/CorePM.md:69`) is **true for content reach** (link re-spells, Context sweeps) and **false for governed, tree, and by-ID reach**. Property sweeps scope to Collection folders, the delete strip filters loose pages out on purpose (cascade.ts:101), and no refill can find them.

**It generalizes:** Agenda folders are the exact precedent. A sidecar-marked folder kind is admitted by the corpus, watched, synced, and kept out of the tree because `resolveFolderKind` names it something other than a container. An archive folder marked the same way gets index, watcher, sync, and governed and content reach for free.

###### Identity Hazards

- **By-ID refills lose data (the sharpest one):** C-2 strips archived pages through governed reach, but every refill reads `recordById(tree)`. A delete strips `Ref: [[X]]` from an archived page, and the restore then routes that page's ID to `refillTrashed`, which searches bundles, finds nothing, and drops the value (spend.ts:299-304). The same goes for Space and Context re-tags (spend.ts:335), for property re-assign (assignment.ts:79-84), and for the property restore (`restoreProperty.ts:56-69`). Reach-In needs the by-ID map to span the archive.
- **`deleteCascade` twins:** `livePathOf` returns null for an absent ID *and* for an ID two files claim (`Core/Nexus/heldPages.ts:8-13, 25-28`). Every archived file looks like a twin (cascade.ts:114).
- **A second twin rule:** `keyedHolders` keeps the first file per ID and holds later claimants out of the strip (keyHolders.ts:61-64), while `deleteCascade` skips every claimant. That's two definitions of a twin.
- **The `id-live` refusal** (resolve.ts:38) and the **remint baseline** (remintLedger.ts:21-33) can't see archived IDs. Take a live page and an archived page sharing an ID (a Finder duplicate): the archived copy restores as a fresh claimant and is reminted (remint.ts:32-37), losing its snapshot history, which is keyed by page ID. While archived, a by-ID sweep spanning both would hit an ambiguous ID. The same null-on-twin rule as `writablePathsOf` has to cover the union.
- **`stampMissing`/`ensurePageId`:** these only see the tree's `unreadable` list (adopt.ts:133). An ID-less file dropped into the archive is never stamped, so by-ID reach can't address it. Path-based sweeps still reach it.
- **Delete From the Archive (E-3):** deleting an archived page records `gatherParentRef` → `containerAt(tree, parentDir)` (`Core/Trash/gather.ts:24-29`). The archive folder isn't in the tree, so the record reads `unaddressable` and the later Trash restore refuses. The record has to carry the archived page's origin, not its archive folder.

###### Counts

Every count comes from one place. `property:holders` (`Core/Properties/handlers.ts:199-208`) dispatches to `propertyHolders`, `optionHolders`, `keyFormatHolders`, or `valueFormatHolders`. Each builds the same `(files, plan)` its sweep uses and calls `sweepCount`, a dry run returning `touched.size` (governedSweep.ts:113-114). `askHolding` renders it as `itemCount` (`Core/Interface/Confirm/confirmations.ts:109-118`), and today that count includes Space sidecars ("N Items", `Core/Properties/properties.ts:263`). Cascade notices only report skips (`unsweptLine`).

**Simplest exclusion:** filter the dry run's `touched` keys through one `archived(rel)` path predicate inside `sweepCount`, the only count producer. That's about 2 lines, and the plans stay untouched, so sweeps keep including archived pages. **`bothKeyHolders` isn't a count.** It's a clash refusal (registryProperty.ts:153-155), so it has to *include* archived pages, or a rename silently drops the old value on an archived page that holds both keys.

###### Crash Safety

The schema journal stores the operation, not the files (`Core/Properties/propertyJournal.ts`). Replay recomputes reach through the same plans (replaySchemaCascade.ts:56-62), and the Context journal re-runs `cascadeTitle` (contextCascade.ts:315). **Whatever gives the sweeps reach gives replay the same reach.** No new journal is needed. Replay runs after `seedContentIndex` at open (`Core/Nexus/handlers.ts:103-106`), so an indexed archive is queryable by then. The one real hazard is an **unindexed** archive. A page archived between a crashed rename and its replay would be missed, because replay queries the index (H locations without index maintenance). The Context journal's `skipped` paths are only a survival marker, so an archive move between crash and replay doesn't matter. The archive move itself is a `relocate`. If it's interrupted, the page sits in one place or the other, and both are inside reach.

###### Sets Are Archivable (Scope Update)

- **Pages at any depth:** the corpus walk recurses (walk.ts:53-71) and `listMarkdownFiles` recurses. A visible archive covers nested Sets free. The hidden ones need the carve-out at every level.
- **The walk:** under V, the archive's kind check has to come before `readChildSets` adopts it, and before `stampTree` recurses into it (adopt.ts:159-168), so neither the archive nor its archived Sets are read into the tree or re-stamped. An archived Set already carries its `_pageset.json`, so adoption has nothing to stamp once the kind check stops recursion.
- **Set sidecars:** `configReach` reaches only tree containers and damaged ones (configReach.ts:342-348). An archived Set's saved views keep property, option, and Set references a delete or rename changed elsewhere. Under Reach-In they should be reached, by adding archived Set sidecars to `containersOf`'s list. `property_cache` lives on Collection sidecars only (propertyCache.ts:1; `editCaches` iterates `tree.collections`), so an archived Set holds none, and the Collection's cache already keeps archived pages' values. The Set order (`pageOrder`/`setOrder`) names its own children and travels with the folder, so no cascade touches it. The asset migration's `sidecarsUnder` (assetMigrate.ts:159-165) reaches an archived Set's banner and icon under V and misses them under H.
- **Archiving a Set isn't a Set "leaving a container":** *CorePM §Mutations* has `goneEdit` drop views, View Tiles, and Matrix filters that name a Set leaving a container (delete.ts:38, :111). Applying that to an archive would make restore lossy. The archive move should skip it, and the Set's references stay dormant.
- **Placement:** take a page archived from Set S, with S archived later. `findContainerById` reads the tree (resolve.ts:27-28), so that page's restore answers `parent-gone`. The same goes for a Trash restore aimed at an archived Set.

---

##### Removal & Consolidation

1. **Delete `deleteCascade`'s tree filter and twin branch (≈ -18 lines, cascade.ts:101-119), and run the strip on governed reach.** The strip removes Link *property* values, which only mean something where a schema governs. It's a property sweep, scoped differently from every other property sweep for one reason: the comment says loose files are protected because "no restore could reach it". Governed reach (Collection folders + Spaces) already leaves loose pages out and takes in damaged folders and the archive. `deleteCascade` doesn't route through `keyedHolders`, so its twin rule moves into the governed strip as `keyedHolders`' first-claimant rule rather than disappearing. After this, `withheldIn` keeps its other two callers (`Core/Nexus/treeIndex.ts:119`, remintLedger.ts:41), and `liveIdIndex`/`livePathOf` lose their `cascade.ts` import. One behavior change: pages under a damaged *Set* sidecar were stripped through `withheldIn` and are still stripped (they sit under a Collection folder). Pages whose own frontmatter is unreadable were never swept (`sweepParse` refuses them).
2. **One reach module that owns the fallback and the scope (≈ -25 / +25).** `queryX(...) ?? (await nexusCorpus(root))` is written five times: cascade.ts:87, :221, contextCascade.ts:72, keyHolders.ts:17, :28. The heading arm's `?? []` is a stated exception. The governed scope (`collectionFolders` + `corpusUnder`) is composed at six sites (optionOps.ts:197, registryProperty.ts:112, :126, deleteProperty.ts:82, :99, replaySchemaCascade.ts:56, plus removeProperty.ts:37's single folder). Two named reaches, `contentReach(root, query)` and `governedReach(root, key, folders?)`, collapse that. `keyHolderFiles` and `corpusUnder` fold in, and `collectionFolders` becomes governed reach's own folder list. `confirmedKeyHolders` keeps only its from-disk confirmation.
3. **One reach-by-ID map beside the live one (≈ +12 / -5).** `heldPages.ts` already owns "the held tree's pages by path and by id, for the host's writers" (heldPages.ts:1). The live lookups shouldn't be widened in place. `livePathOf` also feeds the outside-move pairing (settle.ts:277, :287), where an archived ID would pair an archive move as an ordinary move and re-spell inbound links into the archive. It also feeds `loadValues` (`Core/Views/loadValues.ts:15`) and file history (`Core/Pages/fileHistory.ts:89, :174`). So a second projection in the same file, the reach-by-ID map (tree ∪ archive, with `writablePathsOf`'s null-on-twin rule), is handed to `sweepRootsById` in place of `recordById(tree)` at the three refill sites. That fixes rows 5, 9, and 17. Row 13's twin check goes away with Removal 1. `refillTrashed` then gets only IDs found nowhere, which is its stated purpose. File history may want the reach map too, for the ArchiveWindow; that's another scout's call.
4. **Space sidecars are reached four ways:** the plan's `sidecars` arm (governedSweep.ts:88-109), `confirmedKeyHolders`' loop (keyHolders.ts:34-37), the delete snapshot's loop (deleteProperty.ts:55-65), and `spaceArm`'s pre-check (cascade.ts:61-64). Folding the two loops into governed reach would trim ≈10 lines. This is optional and outside the archive's need.
5. **Counts:** a predicate inside `sweepCount` (+2). Nothing else changes.
6. **What not to consolidate:** governed and content reach should stay separate (see below). `configReach` stays its own family, since it rewrites configuration rather than pages. Only its container list gains archived Sets.

Rough net for the reach work alone under Approach 1: about -15 to +10 lines, before the archive folder kind itself, which is about 10–15 lines in `folderKind.ts`/`nexusPaths.ts` modeled on Agenda.

###### Where Reach Has to Differ

- **Governed and content reach differ for a real reason.** A property key means something only where a schema governs. NexusOS's bare `Status:` and `Areas:` keys (Studio CLAUDE.md, *§Important Information*) must never be rekeyed by a property rename. A link or a `<Context>` key is Pommora syntax wherever it's written. Two named reaches, each with its reason stated once, satisfy One Way. Three or five ad-hoc ones don't.
- **The heading arm stays index-only** (cascade.ts:206): a corpus scan per heading edit is an on-every-edit cost. That's a stated exception, so the archive has to be **indexed**. Being enumerable isn't enough.
- **Counts differ from sweeps by exactly one predicate.** The clash refusal doesn't differ.

---

##### Approaches

###### Approach 1: The Archive as a Kind-Marked Content Folder

The Archive is a visible folder inside its Collection, marked by its own sidecar the way Agenda folders are (`folderKind.ts:39-51`). `resolveFolderKind` names it `archive`, so the walk and adoption pass it by, while the corpus, index, watcher, and sync admit its pages unchanged. The archive's own sidecar needs the same `classifyEvent` arm as its pages, since `SIDECARS.has(name)` sends any unknown sidecar to `{ kind: 'walk' }` (fileEvents.ts:253-256). Governed and content reach include it with zero cascade edits, and `owningCollection` and `corpusUnder` resolve its Collection by path. Collection rename, move, trash, and restore carry it. The work is the tree and by-ID families (Removal 1 and 3), `configReach`'s container list, `sweepCount`'s predicate, and a `classifyEvent` arm. Without that arm, every write to an archived page costs an `applyFolder` read (fileEvents.ts:369-370), so archive paths should go index-only, as Agenda pages ought to as well.

- **For:** zero exceptions to the hidden-name rule. Index maintenance and replay come with it. Sync works. It reuses an existing precedent. The location is legible in the filesystem (Locked Decision: Legibility).
- **Against:** it shows in Finder and Obsidian. NexusOS is an Obsidian vault, so archived pages would appear in Obsidian search and graph. It also needs a name: either reserved, or free because the sidecar marks the kind.

###### Approach 2: A Hidden In-Collection `.archive/` with One Admitting Predicate

Keep `<Collection>/.archive/` and add an `archived(segs)` exception threaded through `outsideContent` (corpus and index), `neverWatched` (watcher and sync), `listMarkdownFiles`, and `classifyEvent`. Governed reach then comes free through the path prefix.

- **For:** invisible to Obsidian and Finder by default.
- **Against:** five carve-outs into a predicate *CorePM* calls total. The views' whole-container `folderCorpus` (`Core/Views/loadValues.ts:13`) and every other `!outsideContent` reader would admit archive pages unless each one re-checks. A hidden-but-synced folder also contradicts the rule users read ("a folder whose name starts with `.` is excluded").

###### Approach 3: `.nexus/archive/<CollectionID>/` with a Second Corpus Root

The archive stays a Pommora-owned store. A second enumeration root joins the corpus and index, and `collectionFolders` maps each Collection to its archive directory.

- **For:** syncs already. Survives a Collection rename by ID.
- **Against:** governed reach needs the archive root as one more prefix at the scope step, `corpusUnder` through `keyHolders.ts:17`, `:28`, which can't sit in `collectionFolders`, since that list doubles as the Collection sidecar list (`deleteProperty.ts:44-54`, `:139-143`). A deleted Collection orphans its archive, and trash, empty, and restore all have to learn about a second place. Folder names are ids, unreadable by browsing. And it creates two corpus roots, so every enumerator chooses between them.

Indexing the archive without admitting it to the corpus is rejected. It creates two enumeration paths, and the no-index fallbacks (`?? nexusCorpus`) would silently drop archived pages.

**Recommendation:** Approach 1, the kind-marked visible folder, with Approach 2 next; set aside by B-1 and B-2, which place the Archive hidden at `.nexus/archive/<Collection ID>/` (the log's *Rejected · A Visible Archive Folder*).

---

##### What Becomes False

- `.claude/Features/CorePM.md:69`: "Un-adopted folders… are indexed and cascade-reachable." That's already only half-true (content reach only). It should name which reaches and add the Archive. Its "one predicate … honored by … every cascade" also stops being literal under Approach 2.
- `cascade.ts:72` docblock ("from the pages and Spaces the tree holds") and the :101 comment, if the strip moves to governed reach.
- `heldPages.ts:1` ("The held tree's pages"), `livePathOf`'s and `liveIdIndex`'s names and docs, if they span the archive. A rename may be warranted.
- `exclusion.ts:84` (`reachingExcluded`: "every other enumerator keeps excluded folders out") is unchanged. `exclusion.ts:21` and `:26` change only under Approach 2.
- `walk.ts:31` ("a folder the tree doesn't hold (a trash bundle's artifact)"): the archive becomes a second such folder.
- `holdings.ts:143` (`refillTrashed`: values whose page "sits in the Trash"): it would no longer be the catch-all for unknown IDs.
- `folderKind.ts:53` (nested → `'set'`) gains the archive kind under Approach 1.
- **Tests:** `Core/Nexus/cascade` tests pinning loose-page and withheld-folder behavior and the twin count; `keyHolders` tests if the scope helpers fold; `Core/Testing/storesContract.ts` stays valid, since the store has no path filter (`Desktop/Store/stores.ts:111-170`, verified).

---

##### Risks & Questions

1. **Obsidian Visibility:** a visible Archive folder would show in Obsidian and Finder, since NexusOS is both a vault and a Nexus. **Settled By:** B-1, which keeps the Archive hidden.
2. **Sync:** `<Collection>/.archive/` wouldn't sync (`manifestAdmits` → `neverWatched`). **Settled By:** B-1 and B-2; `.nexus/archive/` syncs today.
3. **Loose Pages and the Delete Strip:** moving the strip to governed reach keeps loose root pages and Agenda pages unstripped, as today, and nothing could refill them. **Settled By:** C-3, which runs the strip on governed reach.
4. **Inbound Links to an Archived Page:** links *naming* an archived page are phantom to `respellings` (`Core/Connections/rewrite.ts:22-49`) while it's archived, so a renamed Collection or Set, or a live page taking its title, leaves them stale or retargeted at restore; the Trash's `targets`/`repairLanded` covers outbound links only. Re-spelling them from the origin path follows the Trash's `deletedPathOf`/`trashedPagesOf` pattern (`holdings.ts:69-96`) while staying out of resolution. **Settled By:** D-1: path links re-spell to where the page lands, and title-only links that landed on a namesake stay with it.
5. **Archiving a Set and Its Views:** archiving a Set leaves the Collection's views and View Tiles that name it in place rather than running the delete's `goneEdit`. **Planner's Call:** this follows from C-1's restore with nothing to reconcile, and the plan confirms it.
6. **Restore Into an Archived Parent:** a page whose origin Set has since been archived finds no parent in the tree. **Planner's Call:** the log leaves it open.
7. **Live and Archived Twins:** when a live page and an archived page share an ID, the restored one is reminted (losing its file history), or by-ID sweeps skip both. **Planner's Call:** whether archiving or restoring refuses on an `id-live` collision, as the Trash's restore does.
8. **The Asset Migration:** it misses Trash bundles today, and would miss an Archive outside its walks, while trashing the legacy files they name. **Planner's Call:** an existing data-loss path; the Archive's own case is covered by walking the archive root (*Archive — Investigation §The Single Exception*).
9. **Agenda Event Cost:** watched Agenda pages route through `applyPage` → `applyFolder` per event (`fileEvents.ts:369`). Under B-2 archived pages never reach that path, since `classifyEvent` ignores `.nexus` outside `contexts/`, so the Agenda cost stands on its own.

---

#### Scout B — Index, Discoverability, Watcher, Sync, and Location

**Mandate:** how the index, discovery surfaces, watcher, and sync treat a candidate archive location, and which location fits.

##### Findings

###### 1. Hidden Folders Are Out of Everything, Sync Included

A folder whose name starts with `.` or `_` is shut out at every layer by one chain of predicates:

- **Corpus and index:** `outsideContent` returns `'hidden'` for any hidden segment (`Core/Paths/exclusion.ts:79`). `corpusFilesUnder` uses it (`Core/Files/walk.ts:81`), so `nexusCorpus`/`folderCorpus` (`Core/Index/indexSeed.ts:74-87`) leave the folder out, and `relCorpusPath` (`indexSeed.ts:89-93`) makes `indexWrittenPage`, `deindexPath`, and `moveIndexPaths` ignore it.
- **Tree:** `readNexus` keeps child dirs only where `!outsideContent` (`Core/Nexus/readNexus.ts:160`, `:328`). The event classifier ignores anything under a hidden folder (`Core/Nexus/fileEvents.ts:252`, `:264`).
- **Watcher:** chokidar's ignore filter is `neverWatched(segs) || isExcluded(segs)` (`Desktop/FileWatch/watcher.ts:55-65`). `neverWatched` exempts `.nexus` at index 0 only (`exclusion.ts:27-36`). `.trash` isn't watched either.
- **Sync:** `manifestAdmits` derives from `neverWatched` and adds `.trash` explicitly (`exclusion.ts:44-61`).

**Archiving into a hidden folder sync doesn't admit, such as `<Collection>/.archive/`, deletes the page on every other device.** An in-app move is `relocate` (`Core/Files/atomicWrite.ts:62-75`), which calls `reportRename`. The sync tap's `feedRename` sees `admits(to)` false and schedules only `from` (`Core/Sync/Client/tap.ts:64-67`). `pushDirty` then finds `from` missing with a base row and pushes a `delete` (`Core/Sync/Client/push.ts`, the `stat === null` branch). The archive copy never syncs. Locally, `moveIndexPaths` sees `newRel` null and de-indexes the page (`indexSeed.ts:178-180`), so it also drops out of every cascade. A hidden location therefore makes the Archive behave like the Trash unless an exemption runs through every link of that chain.

**Sync landings depend on the watcher.** `landBytes` records no echo and notes no event: "the watcher reports it like any outside write and the tree and index take it from that event" (`atomicWrite.ts:40-49`). `landRename` is a raw `machine().rename` (`Core/Sync/Arrival/land.ts:123-142`). So on a receiving device, an archived page reaches the index only if the watcher watches the Archive. Without that, device B sees only the unlink at the old path, de-indexes the page, and Reach-In is broken there until the next seed.

###### 2. Corpus ≠ Tree Already, and Discovery Is Tree-Gated by Construction

The corpus already holds pages the tree doesn't: Agenda folders (`resolveFolderKind` returns `'tasks'`/`'events'`, and `readRootFolder` keeps only `'collection'`, `readNexus.ts:199`), loose root pages (`fileEvents.ts:266`), and sidecar-less or unparsable folders (listed `unreadable`, `readNexus.ts:98-111`). CorePM states it: "Un-adopted folders… stay outside the tree but are indexed and cascade-reachable."

Every discovery surface resolves through the tree:

- **Link resolution, connection autocomplete, heading suggestions:** `pageIndexOf(tree)` (`Core/Nexus/record.ts:78`, `Core/Session/pageConnections.ts:30`, `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts:83-121`). Headings are looked up only after a tree resolve (`:88`).
- **Matrix:** nodes come from `matrixTree` over `tree.collections` (`Core/Matrix/matrixInput.ts:33-57`). Targets resolve through `pageIndexOf(tree)` (`:63-71`), and `buildGraph.link` drops any edge whose source or target isn't a node (`Core/Matrix/Engine/graph.ts:78-83`). An archived page draws no edge in either direction.
- **Navigation, search, trails, reconcile:** `recordsOf`/`nodesOf` (`record.ts:18-46`, `Core/Nexus/treeIndex.ts`).
- **Views, View Tiles, Space rows:** rows are built from `container.pages` (`Core/Views/Pipeline/group.ts:128-135`), and Space membership is `PageNode.contextValues` on tree pages.
- **Tabs, selection, pins, recents:** `reconcileIndexOf(tree)` (`treeIndex.ts:90-120`). A page missing from the tree and not under a withheld folder resolves to `none` (`Core/Session/reconcileSelection.ts:33-38`), and pinned tabs drop the same way (`Core/Navigation/tabsModel.ts:90-104`). Pinned and recents refs persist by id (`Core/Session/navigationSlice.ts:279-299`), so they reappear on restore.
- **Backlinks and mention counts:** no such reader exists. `grep` finds no backlinks panel.

**The unbounded index reads (cost, not leaks):** whole-index reads that ship non-tree rows, which the renderer then discards:

- `readMatrixGraph` → `readPageRelations()` with no paths (`Core/Matrix/matrixGraph.ts:20`).
- `index:headings` with no paths (`Core/Nexus/handlers.ts:167-168` ← `Core/Session/nexusSlice.ts:165`, called with none at `:190`).
- `view:loadValues` with no ids → `folderCorpus(Collection)` (`Core/Views/loadValues.ts:13`, from `useContainerValues.ts:76`). This **reads and parses every corpus file under the folder**. With an in-Collection Archive, that means every archived page on every full view load, although rows only use tree pages. That would be the one real lag source an in-Collection Archive adds. Under `.nexus/archive/` (B-2), `folderCorpus(Collection)` never enters the Archive, so the cost doesn't arise.

**The seam:** tree exclusion *is* discovery exclusion. The Archive needs to be in the corpus, watched, and synced, but absent from the tree. No new discovery filter is needed beyond host-side trimming of the three unbounded reads.

**The Archive must not be modeled as "withheld":** `withheldIn` (`Core/Nexus/treePatch.ts:266-269`) keeps a tab or selection alive on a withheld path (`reconcileSelection.ts:30,36`, `tabsModel.ts:101`), and lets `deleteCascade` sweep it (`Core/Nexus/cascade.ts:103-115`).

###### 3. The Watcher, Live Tree, and Echoes for a Move

- **In-app archive (page or Set):** `relocate` records both ends bytes-less (`atomicWrite.ts:68-69`), so the watcher's echoes drop (`watcher.ts:115`; folder children through the 800ms prefix window, `Core/Files/writeEcho.ts:83-91`). It then raises `noteOwn({event:'move'})`, which reaches `applyOwn` → `applyEvents`.
  - **Index:** `moveIndexPaths` renames the rows when both ends are in the corpus (`indexSeed.ts:187-189`) and re-reads the moved file.
  - **Tree:** `applyMove` → `moveNodeInTree` can't place a node under a non-container, so it falls to synthesized unlink + add (`fileEvents.ts:567-577`). The unlink removes the node; the add is classified away.
  - **Origin `own`:** `oweSeen` isn't called, so the settle owes no vanish or arrival.
  - **Net:** an archive move is a rename to the index and to sync (both ends admitted → `onRename`, `tap.ts:69-74`), and a removal to the tree, tabs, and selection. To the renderer it's indistinguishable from a delete.
- **Outside move into the Archive (watched):** `unlink` → `deindexPath` → `vanished`; `add` → `indexWrittenPage` → `landed`. `payOutsideMoves` can't place either id in the tree (`Core/Nexus/settle.ts:276-292`), so the arrival is dropped and the vanish waits in `owed.vanished` until a restore pairs it. That's benign, and a restore to the same path is a no-op (`settle.ts:282`).
- **Outside edits to an archived file:** they reach the index only if the watcher watches the Archive. Otherwise they reach it at the next seed (`seedContentIndex`, mtime/size-gated, `indexSeed.ts:227-237`).
- **Restore (move back):** in-app, it lands as an own move. The settle doesn't treat it as an arrival because origin is own, so title collisions re-spell only if the restore op calls `relink` itself, the way page moves do. The archive op must **not** reuse `movePageOp`'s relink. Re-spelling toward a page leaving the index is wrong under D-1.

###### 4. Cascade Reach Today (For the Cascade Scout, Cited Anyway)

There are three reach rules:

- `renameCascade` sweeps whatever the index names, with no tree filter (`cascade.ts:219-222`).
- Property sweeps intersect the index's holders with Collection folders by prefix (`Core/Properties/keyHolders.ts:12-18`, `:28`).
- `deleteCascade` sweeps only `held.has(rel) || withheld(rel)`, and skips a page whose id the tree doesn't hold as a "twin" (`cascade.ts:101-121`).

An indexed Archive is reached by the first two for free. The third skips it, so C-2 fails until reach is unified; the `liveIdIndex`/`withheldIn` filter is the consolidation target for C-3. `reachConfig` (views in sidecars) enumerates tree containers only (`Core/Nexus/configReach.ts:312-317`), so an **archived Set's `_pageset.json` views go stale** without an Archive arm. `editCaches` also takes `tree.collections` (`cascade.ts:247`).

###### 5. Sidecar Readers (For Option D)

`_pagecollection.json` is reached through `SIDECAR_FILENAME`/`sidecarPath` (`Core/Paths/nexusPaths.ts:50-58`, `Core/Paths/paths.ts:16`) in about 21 files:

- **Kind and walk:** `folderKind.ts:58,99`, `readNexus.ts:200`.
- **Adoption:** the Collection↔Set sidecar swap at `adopt.ts:120-127`.
- **Events:** `fileEvents.ts:254-261`.
- **Settings and assets:** `exclusionScan.ts:27`, `assetMigrate.ts:161`, `assetDirValidate.ts:31`.
- **Sync and trash:** `mergePolicy.ts:17` (merges by basename), `migrateConfig.ts:47`.
- **Writers:** `reorder`, `removeProperty`, `deleteProperty`, `assignment`, `configReach`, `viewsFile`.

Sapphire reads none of them (`~/The Studio/Projects/Sapphire/src` has no sidecar reference). On disk: NexusOS has 6 root sidecars, Test has 3, plus Trash bundles holding `_pagecollection.json`/`_pageset.json`.

###### 6. Data on Disk

- NexusOS already has a user-made `Ideas/II. Archive` and `Agenda/II. Archive`. There are no `.archive`/`_archive` folders anywhere.
- NexusOS is git-tracked with only `.trash/` ignored (`~/NexusOS/.gitignore`). Obsidian's `showUnsupportedFiles` is false, so JSON sidecars are already invisible there.
- `names.ts:25-26` refuses any create or rename starting with `.` or `_`, so a hidden Archive name can never collide with a user Set.

---

##### Removal & Consolidation

1. **`loadValues` reads what the view shows** (`Core/Views/loadValues.ts:8-18`). A full load reads the tree's pages under the container instead of `folderCorpus`. That removes a per-view-open disk walk, stops parsing withheld, unadopted, and archived files no row uses, and leaves `folderCorpus` with one caller (`indexSeed.ts:183`, inline-able). ~±0 lines, -1 export. Worth doing even without the Archive.
2. **Trim the unbounded index reads to the tree** (`matrixGraph.ts:20`, `handlers.ts:168`). Filter rows to `pagesByPathOf(tree)` host-side. That also drops Agenda, root-loose, and withheld rows shipped today and discarded. ~+3 lines.
3. **One reach rule** (C-3): `deleteCascade`'s held/withheld/twin filter (`cascade.ts:101-121`, ~15 lines) against the index-wide reach of `renameCascade` and the folder intersection of `keyHolders`. With the Archive in the corpus, "corpus = reach" (CorePM's own "indexed and rewritable name one set") is the single definition, and delete's filter becomes the odd one out to remove. That's the cascade scout's call.
4. **`NON_CORPUS_TOP`'s comment is already false** (`nexusPaths.ts:7-8`): "The walk, the index, and every mutation refuse these." Its only reader is `nexusFolderRefusal` (`Core/Settings/codec.ts:51`), and the walk refuses `.nexus`/`.trash` through `hiddenFolder`. Fix the comment or fold the constant into codec.ts. ~0 lines.
5. **Two content walkers** with two admit rules: `listMarkdownFiles` (hidden-only, `walk.ts:31-39`, Trash only) and `corpusFilesUnder` (`walk.ts:73-83`). Its comment says "held to the same hidden-name rule as the content walk", which stops being true under any option that admits an Archive to the corpus. Under F-4 a trashed Collection's Archive stays at `.nexus/archive/<Collection ID>/`, so Trash holdings never include archived pages.

---

##### Approaches

###### A. Tree Exclusion by Kind Sidecar (Marked, Visible Folder)

The Archive is an ordinary non-hidden folder directly under the Collection (default name "Archive"), marked by its own sidecar, `_archive.json`. `resolveFolderKind` returns a new `'archive'` kind for it, the same way the Agenda arm returns `'tasks'`/`'events'` (`folderKind.ts:39-51`). Because `readChildSets` keeps only `kinds[i] === 'set'` (`readNexus.ts:166-168`), the Archive and everything in it, nested archived Sets included, never enter the tree.

- **Works unchanged:** corpus, index, watcher, and sync need no exemption. The folder isn't hidden, `_archive.json` and `_pageset.json` are admitted leaves (the leaf rule is dot-only, `exclusion.ts:34`), and an in-app archive is a rename on the wire.
- **What has to change:**
  - `FolderKind` gains `'archive'`.
  - `resolveFolderKind` checks for `_archive.json` and answers `'archive'` only directly under a Collection, `'unknown'` deeper.
  - `stampTree` adds a case that skips the Archive (`adopt.ts:159-170`). Otherwise it recurses with a non-container kind and calls `agendaKind`.
  - `classifyEvent`'s sidecar arm ignores `_archive.json`. Today any sidecar other than collection/set returns `'walk'` (`fileEvents.ts:254-256`), which would owe a full walk per archive op.
  - Clear Exclusion Cache skips the Archive the way it skips Agenda (`exclusionScan.ts:44`).
- **Archive events:** a page or `_pageset.json` event under the Archive goes `applyPage`/`applyFolder` → parent recursion → `readFolder` → `'archive'` → null node → `'ok'` (`fileEvents.ts:328-350`). That's a few stats per event and no walk.
- **Collection rename, Trash, restore:** a Collection rename or exclusion-carry moves the Archive as a subfolder (`folderEntity.ts:31-32`, `settings.ts:98-106`). Trashing a Collection carries it in the bundle. `contentPages` → `listMarkdownFiles` includes archived pages (non-hidden), so permanent delete drops their metadata (`Core/Trash/delete.ts:48`), and `restoreScrub` reconciles them on a Collection restore (`restoreScrub.ts:122-133`).
- **Property sweeps:** `corpusUnder`'s Collection-prefix intersection reaches the Archive natively (`keyHolders.ts:17`).
- **Cost:** archived pages are **visible in Finder and in Obsidian**. In NexusOS they'd show in Obsidian's search, graph, and link resolution. The name can collide with a user Set called "Archive", which `freeName` disambiguates. ~+12 / -2 lines.

###### B. Tree Exclusion by Hidden Name with Exemptions (`<Collection>/.archive/`)

The Archive stays hidden to the tree by the existing dot rule, so no tree code changes. To keep it in reach and in sync it needs two exemptions:

- **Corpus:** `outsideContent` returns a new reason, `'archive'`, for an `.archive` segment, and only the two corpus callers (`walk.ts:81`, `indexSeed.ts:92`) accept it. Every tree and adoption caller already treats any reason as outside (`readNexus.ts:160,328`, `adopt.ts:165,183`, `folderKind.ts:102`), and `folderEntity.ts:27`'s `SET_ASIDE` typing takes one line.
- **Watcher and sync:** `neverWatched` exempts `.archive`. It has to be name-based rather than depth-based, because a trashed Collection's Archive sits at variable depth under `.trash` (`Core/Trash/bundle.ts:14-20`), and the Trash arm of `manifestAdmits` re-applies `neverWatched` (`exclusion.ts:55`).

Obsidian and Finder both hide the Archive. The cost is an odd one out: a hidden folder that isn't hidden, so CorePM's hidden rule gains a third exception beside `.nexus`/`.trash`. A stray user-made `.archive` anywhere becomes watched, indexed, and swept. Trash holdings and `restoreScrub` skip it (`walk.ts:36`, `restoreScrub.ts:130`), so **archived pages inside a Collection that sat in the Trash come back unreconciled**. They were out of reach while trashed. Fixing that means teaching both to enter `.archive`. ~+12 / -2 lines.

###### C. Index-Level Flag (Rejected)

`indexed_files` gains an `archived` column or a separate table. Reach queries include archived rows and discovery queries exclude them. It needs a schema bump, a second notion of "in the index", and a filter on every discovery query, while discovery is already tree-gated (*§Findings · 2*). It does nothing that a path-derived predicate plus tree exclusion doesn't.

A variant, **an unindexed Archive scanned per sweep**, is O(archive) for every cascade and breaks the index-candidate model. Rejected as well.

###### Location Comparison

| | (a) `<C>/.archive/` | (b) `<C>/_archive/` | (c) `.nexus/archive/<C-ID>/` | (d) `<C>/.collection/{sidecar,archive}` | (e) `<C>/Archive/` + `_archive.json` |
|---|---|---|---|---|---|
| Syncs today | No — archive = remote delete | No | Yes (`.nexus` exempt) | No — and the Collection sidecar stops syncing | Yes |
| Watched (sync landings reach index) | No | No | Yes | No | Yes |
| In corpus/index | Needs exemption | Needs exemption | Needs `.nexus/archive` exemption | Needs exemption | Yes |
| Out of tree | Free | Free | Free | Free | One kind case |
| Collection-scoped sweeps (`corpusUnder`) | Free | Free | One archive-root prefix at the scope step | Free | Free |
| Collection rename/trash/restore | Carried | Carried | Trash must carry/restore it explicitly; rename free | Carried | Carried, and scrubbed on restore |
| Archived Sets (nested folders + `_pageset.json`) | Ignored by tree; restoreScrub skips | Same | Fine | Same as (a) | Fine via kind; `reachConfig` needs an arm in every option |
| Finder | Hidden | Visible | Hidden, ULID-named | Hidden — the Collection's own sidecar too | Visible |
| Obsidian (NexusOS) | Hidden | **Visible** | Hidden | Hidden | **Visible** |
| Legibility Locked Decision | Fair (revealable, self-named) | Good | ID-keyed, inside `.nexus`, which B-2 holds isn't meant to be legible | Fair, but hides what makes a folder a Collection | Best |
| Name collisions | Impossible (`names.ts:25`) | Impossible | None | None | Possible, `freeName` |
| Blast radius | ~2 predicates | Same as (a) | Predicate + sweep folders + Trash | ~21 sidecar files, a data migration of every Nexus and Trash bundle, Sets become the odd one out (`_pageset.json`), the Collection↔Set swap (`adopt.ts:120-127`), and exemptions in the watcher and sync for the sidecar itself | ~5 small union/arm additions |

- **(b)** combines (a)'s exemptions with (e)'s Obsidian visibility, so it's dominated.
- **(c)** names folders by id and puts content inside the app's own folder, which B-2 accepts.
- **(d)** buys nothing functional over (a): every root sidecar read moves, the Collection's own config goes dark to the watcher and sync without new exemptions, and existing data needs migration residue. Reject it.

**Recommendation:** (e), the kind-marked Archive folder, falling back to (a); set aside by B-1 and B-2 (the log's *Rejected · A Visible Archive Folder*, *Rejected · A Per-Collection `.archive/`*).

###### Performance

- **At open:** `readNexus` never enters the Archive under (a) or (e). The seed stats every corpus file serially and reads only those whose mtime or size changed (`indexSeed.ts:227-237`), so a large Archive adds one stat per file per open or watcher restart. Archived files rarely change, so they're almost never re-read.
- **At rest:** index rows only. fsevents watches the root as one stream.
- **Per sweep:** a sweep opens only the archived pages the index names as holders, which is Reach-In by definition.
- **The real cost:** `loadValues`'s full-folder read (*§Removal · 1*).
- **No special handling:** low-priority indexing would guard a ghost.

---

##### What Becomes False

- `.claude/Features/CorePM.md` *§Folder Exclusion*: "A folder whose name starts with `.` or `_`… is excluded the same way, the app's own `.nexus` and `.trash` aside" (under (a)). Under (e), the un-adopted-folders sentence gains the Archive as another indexed, cascade-reachable, tree-absent category. The `manifestAdmits` description also changes under (a).
- CorePM *§Adoption*: "Root folders holding content become Collections and everything nested becomes a Set" (under (e), except an Archive).
- `Core/Paths/exclusion.ts:21` ("A folder the app never enters"), `:26` (`neverWatched` doc), `:76` (`outsideContent` doc) under (a).
- `Core/Files/walk.ts:31` ("same hidden-name rule as the content walk") under (a).
- `Core/Paths/nexusPaths.ts:7` (already false).
- `Core/Nexus/folderKind.ts:53`, where nested defaults to `'set'`, gains a case.
- `Core/Views/loadValues.ts` behavior (*§Removal · 1*).
- **Tests:**
  - `Core/Paths/exclusion.test.ts:19-26` (hidden at any depth).
  - `Desktop/FileWatch/watcher.test.ts` (`syncIgnoredUnder`) under (a).
  - `Core/Nexus/folderKind.test.ts`, `readNexus.test.ts`, `fileEvents.test.ts` (sidecar arm → `'walk'`), and `Core/Views` loadValues expectations under (e).
  - The exclusion and sanitize tests use "Archive"/"archive" as an excluded-folder example. That's not a conflict, but it reads confusingly once Archive is a feature.

---

##### Risks & Questions

1. **Obsidian Visibility:** invisible in Obsidian and Finder, or a plainly visible folder any app reads as "Archive"; NexusOS's own `Ideas/II. Archive` suggested the second. **Settled By:** B-1 and B-2, a hidden Archive at `.nexus/archive/<Collection ID>/`.
2. **The Folder Name Under (e):** **Settled By:** B-2; the location has no user-facing name.
3. **Flat or Mirrored Layout Inside the Archive:** titles are filenames, so a flat Archive renames on collision and the restore undoes it, while mirroring the origin chain, as `.trash` does (`bundle.ts:13-20`), makes a chain folder and an archived Set differ only by `_pageset.json`. **Planner's Call:** Open Item 1.
4. **Sets Moved Across Collections After Archiving:** the archived page stays in Collection A's Archive while its origin Set now lives in B. **Settled By:** F-6; the Set's move carries the items archived from within it into B's Archive, so they belong to B as the Set's live pages do.
5. **Delete Reach:** `deleteCascade`'s twin skip (`cascade.ts:110-118`) skips archived pages, and a Collection delete passes only tree pages as `under` (`delete.ts:49`), so Link values naming its archived pages aren't stripped. **Settled By:** C-2 and C-3.
6. **Archived Set Sidecars:** `reachConfig` is tree-sourced (`configReach.ts:312-317`), so view edits miss archived Sets' `_pageset.json`. **Planner's Call:** under C-1, configuration reach gains them (*Archive — Investigation §The Reach Definition*).
7. **Excluding an Archive:** `normalizeExclusions` drops any entry under `.nexus` (`codec.ts:61-85`), so the Archive can't be excluded; F-1 covers Collections and Sets excluded after items were archived from them.
8. **Trash Interplay:** a page deleted from the Archive gets `parent: unaddressable` (`gather.ts:24-29`) because the Archive isn't in the tree, so its origin has to come from the Archive's record. **Settled By:** E-3.
9. **Open Tabs:** an open tab on an archived page closes, as for a delete, and isn't reopened on restore; pins and recents survive hidden and return, as D-2 implies.
10. **Outside Vanishes:** an outside move into the Archive leaves an entry in `owed.vanished` for the session (`settle.ts:276-279`). It's benign and pairs only if the page is restored.

---

#### Scout C — The Trash's Machinery

**Mandate:** the Trash's delete, record, restore, order, metadata, and Undo, and what the Archive can take from them.

##### Findings

###### The Delete Path (`Trash/delete.ts`, 116 Lines)

- **Target Gate:** `deleteOp` resolves its target through `mutableTarget(root, req.path, [req.kind])` (`delete.ts:32`), which admits only what the live tree holds as that kind (`Nexus/liveTree.ts:80-101`, `holds` → `pageAt` / `containerAt`). Anything outside the tree, the Archive included, is refused with `NOT_HELD` before any other step runs.
- **Bundle:** in Nexus trash mode, `mintBundle(root, abs)` (`delete.ts:46`) creates `<stamp>__<leaf>.deleted` under a `.trash` chain that mirrors the artifact's **physical** parent folder (`Trash/bundle.ts:14-20, 31-39`). `deletedPathOf` (`bundle.ts:23-24`) reads that chain back as "where it lived", and both `trashedPagesOf` (`holdings.ts:69-96`) and `emptyBundle`'s strip (`spend.ts:91-97`) build link keys from it.
- **Page Lists:** `under` is computed from `pagesOf(before)` filtered by path (`delete.ts:49`). It only lists tree pages. For an archived page or Set, `under` comes back empty, so `deleteCascade(root, abs, paths)` (`delete.ts:102`, `Nexus/cascade.ts:74-82`) has no keys to strip, and no Link value naming the archived pages is stripped or recorded.
- **Link Targets:** `gatherLinkTargets` (`gather.ts:42-59`) records the page each outbound link resolved to at the delete (id and path). Its inputs are the `under` paths plus Spaces under `rel`, and its page rows come from the index, or from reading the files when the index can't answer (`gather.ts:31-39`).
- **Parent:** `gatherContentRecord` → `gatherParentRef` (`gather.ts:24-29, 61-74`) derives the parent from the artifact's **folder** via `containerAt`. For anything inside an archive folder, that folder isn't a container, so the parent is recorded as `{ kind: 'unaddressable' }`. Restoring such a record refuses with "Where this belonged was never recorded." (`spend.ts:54`).
- **Write-Ahead Sequence:** the code runs record (partial) → move (`relocate` into the bundle, `delete.ts:99`) → `dropPageMetadata` (`delete.ts:101`, which only acts in system mode because `pageIds` is `[]` when a bundle exists, `delete.ts:48`) → Link strip → final record carrying `links` (`delete.ts:103-108`) → `releaseExcludedFolders` for containers (`delete.ts:109`) → config reach through `goneEdit(before, …)` (`delete.ts:38, 110`).
- **Config Reach on Sets:** `goneEdit` for a Set collects `within(node)` ids from the **tree node** (`Nexus/configReach.ts:288-296`). An archived Set isn't in the tree, so deleting one from the Archive skips the pass that drops saved-view, View Tile, and Matrix references to it.
- **Order:** the delete never touches `page_order` or `set_order`. The only writer of `dropFromChildOrder` is `move.ts:37, 63`.

###### The Record (`Trash/record.ts`, 113 Lines)

- **Shape:** `contentRecord(entity)` (`record.ts:33-44`) holds `{ entity, id?, parent, excluded?, links?, targets?, partial? }` for page, Set, and Collection. `parentRef` is a union of `root | container(id) | context(id) | unaddressable` (`record.ts:14-19`).
- **Time:** the record has no time field. The deletion time is parsed back out of the bundle folder's stamp (`trashRows.ts:12-19`, `deletedAtOf`).
- **Fit for the Archive:** the page and Set arms already carry the id and the parent by id an archive origin needs.

###### The Restore Path (`Trash/spend.ts` 336, `resolve.ts` 93, `restoreScrub.ts` 213, `restoreProperty.ts` 75, `holdings.ts` 162)

- **`resolveRecord` (`resolve.ts:31-93`):** a pure function of `(record, baseName, tree)` that returns a placement `{dir, finalName, finalTitle}` or a typed `Refusal`, and it's clean.
  - **Live Ids First:** an id the tree already holds refuses before anything else (`:36-38`).
  - **Container Arm:** for pages and Sets (`:76-91`), the parent is resolved by id through `findContainerById` (`:27-28`), giving `parent-gone` or `cannot-hold`. Siblings are pages plus Sets because they share one folder namespace (`:82-85`). A colliding name steps aside through `freeName` (`Paths/names.ts:56-64`).
- **`restoreArtifact` (`spend.ts:143-323`):** a 180-line function that braids five entity kinds (context, space, page, set, collection) with the reconcile.
  - **Reconcile Steps:** it re-spells the returning artifact's keys and option words (`currentKeys`/`matchOf`, `restoreScrub.ts:40-120`), scrubs governed keys nothing backs (`scrubReturning`, `:136-194`), parks dropped Link values (`spend.ts:202`), runs a two-map arrival re-spell (`:229-249`, the comment at `:229` explains why it can't use one `relink`), repairs the artifact's own links from `targets` (`:238-244`, `repairLanded` at `restoreScrub.ts:197-213`), and refills stripped values into live pages and into trashed copies (`:284-305`, `refillTrashed` at `holdings.ts:144-162`).
  - **Placement Steps:** the page and Set placement itself is short: `resolveRecord` (`:168`), `landingRefusal` and `exclusionWriteRefusal` (`:174-179`), a squatter check (`:181`), `relocate` plus `reseatExcludedFolders` (`:213-220`), and bundle removal (`:315-318`).
- **Destination Override:** `withDestination` (`spend.ts:107-128`) re-parents a record by an id the user picked. The picker is `containerTargets` (`Actions/destinationTree.ts:10-22`) through `destinationRows` (`Actions/pageMenu.ts:42-57`) in `trashMenuItems` (`Actions/trashMenu.ts:21-33`). `TrashFrame.openMenu` offers it only to a single row whose `homeResolves` is false (`Settings/TrashFrame.tsx:~163-176`).
- **Host Copy:** the refusal text lives in the host as `REFUSAL_TEXT` (`spend.ts:51-56`).
- **Row Shaping:** `trashRowOf` (`trashRows.ts:58-83`) builds rows from a `ListedBundle`. The crumbs are resolved live from `parent` (`liveCrumbs`, `:31-45`) and fall back to the frozen chain (`frozenCrumbs`, `:22-29`). `homeResolves` is `resolveRecord` with `id-live` counted as resolving (`:47-50`). `listBundles` walks a hard-coded `TRASH_DIR` (`holdings.ts:24-46`).

###### The Settle After a Move

- **`addressed`:** `addressed` in `Nexus/mutate.ts:89-113` wraps `createPage`, `rename`, `movePage`, and `moveSet`. It takes `settledIndex` before and after the op, diffs the two with `pageMoves`, and runs `relink` → `respellings` → `renameCascade` (`Nexus/settle.ts:249-260`).
- **Archive Restore Through It:** an archive restore routed through `addressed` re-spells the live world for the page's arrival, the way a move or create does, with no archive-specific relink. **Dependency:** this only works if the settled index treats archived pages as absent (phantom) before the restore. If Reach-In indexes archived pages as present, the before/after diff stops seeing an arrival.
- **Restore Doesn't Use It:** `restore` is dispatched under `underContexts` + `inSettleTurn` (`mutate.ts:134-135`), not `addressed`, because of the two-map logic described above.
- **Pending Saves:** `changesSettled` (`Nexus/mutateRequest.ts:139-147`) lists the ops whose pending saves must flush first. New archive and unarchive ops have to be added to it.

###### Order (Position on Restore)

- **Storage:** folder order is `page_order` / `set_order` in the container sidecar (`Nexus/containerFields.ts:57-61`). `resolveOrder` places known ids in array order, drops ids it can't find in memory only, and appends unreferenced items by title (`Nexus/order.ts:10-27`). Per-view custom order is `manual_order` in the view (`Views/views.ts:177`).
- **Incidental Slot Recovery:** the Trash never removes a deleted id from `page_order`, so a page restored from the Trash takes its old slot back **only until** that folder's order is next written.
  - **Location Reorder:** `folderOrderAt` builds from `dest.pages`, which holds live pages only (`Views/Host/useViewInteractions.tsx:171-184`).
  - **Create:** `placeNew` → `pageIdsIn` also uses live ids (`Views/creationOrder.ts:71-77`, `Nexus/create.ts:50`).
  - **Custom Order:** `manual_order`, by contrast, keeps unknown ids through `tieOrderWith`'s `mergedRanking` (`creationOrder.ts:30-51`), so custom-order slots survive.
- **Moves Erase the Slot:** an archive built on `movePageOp` / `moveSetOp` would call `dropFromChildOrder` (`move.ts:37, 63`) and lose the slot immediately.
- **Misleading Comment:** "Stale ids in a source container self-drop on the next read" (`mutateRequest.ts:88`) describes an in-memory drop. Nothing writes it.

###### Page Metadata

- **B-3 Costs Nothing:** `readPageMetadata` loads every shard without pruning (`Nexus/pageMetadata.ts:54-65`, read at `readNexus.ts:303`). Only `dropPageMetadata` removes entries (`pageMetadata.ts:119-134`, filtered by `idHeld`), and it's called by a system-trash delete (`delete.ts:101`), `emptyBundle` (`spend.ts:88`), and Clear Exclusion Cache (`Settings/exclusionScan.ts:85`). If archiving doesn't call it, the entry survives untouched.
- **Hidden-Folder Gap:** `contentPages` for a Collection or Set uses `listMarkdownFiles` (`Files/walk.ts:32-39`), which skips hidden folders. If the Archive sits at `<Collection>/.archive/`:
  - **Deleting the Collection:** the archived pages are carried into the bundle without being listed.
  - **System Trash Mode:** their metadata entries are orphaned for good (`delete.ts:48`).
  - **Emptying That Bundle:** `emptyBundle` neither drops their metadata nor strips links naming them (`spend.ts:83-97`).

###### Undo

- **Countdown:** the countdown is the dwell bar every notice already draws (`Interface/Notifications/NotificationLabel.tsx:33-52`), so there's nothing to build.
- **Delete Undo:** `notifyTrashed` (`Interface/Confirm/confirmations.ts:49-65`) wraps `notifyDeleted` → `notifyUndoable` (`notifications.ts:84-135`).
  - **Spending:** `notifyUndoable` pushes one one-shot revert onto the chord stack (`Session/undo.ts:15-21`). The revert is `mutate({op:'restore', bundlePath})`.
  - **`armed` Map:** a map keyed by `bundlePath` (`confirmations.ts:40-46`) lets a restore or delete from the Trash frame spend the notice's Undo through `spendBundle` (`TrashFrame.tsx:100, 121`).
- **Fixed Wording:** `notifyDeleted` hard-codes "Deleted “…”" (`notifications.ts:90`).
- **Set Confirmations:** `ALWAYS_ASKS` makes a Set or Collection delete confirm whatever the switch says (`confirmations.ts:29-38`). That bears on archiving a Set, which I-2 gives its own switch.

###### Sets (Scope Update)

- **Excluded Entries:**
  - **Move:** a Set move carries its excluded entries along (`followExcludedFolders`, `Nexus/folderEntity.ts:31-32`, `Settings/settings.ts:98`).
  - **Trash:** a Trash delete instead records them (`excluded`, `gather.ts:72`), releases them (`delete.ts:109`), and reseats them on restore (`spend.ts:218`, `settings.ts:126-127`).
  - **Archive:** an entry can't follow its folder into `.nexus/archive/`, since `normalizeExclusions` drops any entry under `.nexus` (`Core/Settings/codec.ts:51`, `:70-73`). F-2 and F-3 instead leave excluded folders behind in the container's parent before it moves, for the Archive and the Trash alike.
- **Landing:** `moveSetOp` already applies `landingRefusal` + `exclusionWriteRefusal` (`move.ts:50-53`). `landingRefusal` ignores the `hidden` reason (`folderEntity.ts:27`), so it wouldn't refuse a landing inside `.archive`. The unarchive direction is the one that needs it.
- **Config Reach:** `moveSetOp` runs a config reach when a Set leaves its Collection (`move.ts:54-66`). Archiving a Set shouldn't run `goneEdit`. Views, tiles, and filters naming it should stay in place, as D-1 keeps Link values. Deleting it from the Archive has to compute the gone ids from disk, since `goneEdit` reads the tree (see the delete path above).

---

##### Removal & Consolidation

###### Hoist Into a Neutral Owner (Shared by the Trash and the Archive)

These have no Trash-specific semantics. Importing them from `Core/Trash/` into `Core/Archive/` would point the dependency the wrong way.

- **Placement:** `resolveRecord`, `findContainerById`, `Refusal`, `ArtifactRecord`, and `REFUSAL_TEXT` (`resolve.ts` 93 lines plus `spend.ts:51-56`), and the destination override `withDestination` (`spend.ts:107-128`, 22 lines). Moving them is about 0 net lines, just a file move. Candidate homes: `Nexus/placement.ts` (beside `move.ts` and `create.ts`), or a small `Core/Holding/` domain if the bundle shape below is shared too.
- **Bundle Store:** `mintBundle`, `trashChainDir`, `deletedPathOf`, `fileStamp`, `BUNDLE_SUFFIX` (`bundle.ts:11-39`), `readRecord`, `writeRecord`, `bundleArtifact` (`record.ts:82-113`), `listBundles` (`holdings.ts:24-46`), and `openBundle` (`spend.ts:58-64`). Each one hard-codes `TRASH_DIR` or `.deleted` in one place. Parameterizing the store root and suffix costs about +5 lines and lets the Archive use them as they are (see *§Approaches* A).
- **Row Shaping:** `trashRowOf` and `trashRows` (`trashRows.ts`, 90 lines) work unchanged for archive bundles (kind, title, crumbs from `parent`, time from stamp, `homeResolves`). Renaming `TrashRow`/`TrashCrumb` to a neutral name such as `HeldRow` touches the bridge (`Contract/bridge.ts:8`) and `TrashFrame.tsx`, about 0 net lines.
- **Undo Wiring:** `armed`/`spendBundle`/`notifyTrashed` (`confirmations.ts:40-65`) are already keyed by `bundlePath`, so archive bundles spend through them unchanged. `notifyDeleted`'s verb becomes a parameter, or the archive calls `notifyUndoable` directly, at about +1 line.

###### Rework Rather Than Reuse

- **Split `restoreArtifact` by Kind:** `spend.ts:143-323` takes a page or Set arm, a Space arm, and a Context arm, each reading straight through. The Archive shouldn't call it. Reconcile-on-Restore is the thing Reach-In removes, and the page/Set placement it needs is about 20 lines. The split stands on its own as a cleanup, roughly 0 to -20 lines.
- **Stale Header:** `destinationTree.ts:1` says both askers "read the one walk in `record.ts`". The code reads `nodesOf` from `Nexus/treeIndex.ts:34`. The comment is already false.
- **Misleading Order Comment:** `mutateRequest.ts:88` describes an in-memory skip as a drop; K-5 rewrites it, and E-2's exact position replaces the incidental slot (*§Risks & Questions* 3).

###### Free Under This Effort (No Code)

- **B-3:** don't call `dropPageMetadata` when archiving.
- **Countdown:** already in place on every notice.
- **E-3:** under Approach A it falls out of the record already naming the origin parent.

###### Indexed Trash Sizing (For the Record; Source Lines, Tests Separate)

These figures are file-length estimates.

If trashed pages stayed current through Reach-In, these **go**:

| What                                                                                                                                   | Where                                                                    | Lines   |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------- |
| The whole re-spell, scrub, and link repair: `matchOf`, `currentKeys`, `artifactFiles`, `scrubReturning`, `repairLanded`                | `restoreScrub.ts`                                                        | 213     |
| The frozen world, scrub call, and park after scrub                                                                                     | `spend.ts:183-202`                                                       | ~20     |
| The two-map arrival re-spell plus repair, replaced by `addressed`'s `relink` (~3 lines)                                                | `spend.ts:229-249`                                                       | ~18 net |
| Refill into trashed copies: `trashedHolders`, `refillTrashed`, and their call                                                          | `holdings.ts:111-162`, `spend.ts:291, 299-304`                           | ~58     |
| The `targets` record: schema, writes, gather                                                                                           | `record.ts:30-31, 42, 56, 74`; `delete.ts:50, 55-57`; `gather.ts:31-59`  | ~38     |
| `frozenWorld`'s `targets` parameter                                                                                                    | `Properties/propertyValue.ts:186-197`                                    | ~4      |
| `trashedPagesOf`                                                                                                                       | `holdings.ts:84-96`                                                      | 13      |
| **Total**                                                                                                                              |                                                                          | **~365** |

These **stay**:

- **The Link Strip:** at delete (`deleteCascade`, `cascade.ts:74-140`) and the refill on restore (`spend.ts:284-301` minus the trashed half).
- **Parking:** `parkLinks` (`holdings.ts:98-109`). Values dropped elsewhere that name a trashed page still need a home. `trashedPages` could read the index instead of walking `.trash`.
- **Kind-Specific Arms:** the Context and Space restore arms (`spend.ts:205-283`) and `restoreProperty.ts` in full.
- **Placement:** `resolve.ts`.
- **Emptying:** `emptyBundle`.

The test lines that would mostly go are `restoreScrub.test.ts` (825), a large share of `spend.test.ts` (2,148), and parts of `trashRecovery.test.ts` (771).

The cost on the other side is that `.trash` joins the shared reach and every reader learns to skip it. That's the same cost the Archive pays now, which is why C-3's shared reach is the real gate for it.

---

##### Approaches

###### A — One Bundle Shape, Two Stores (Recommended)

The scout placed this store inside each Collection, which B-2 sets aside; the bundle shape itself carries forward inside `.nexus/archive/<Collection ID>/` as Open Item 1's recommendation.

An archived page or Set becomes a bundle in its Collection's Archive store: `<stamp>__<leaf>.archived/` holding the artifact under its own name beside a `_record.json` that reuses `contentRecord('page' | 'set')`.

- **Record:** id and `parent` by container id; F-2 keeps excluded entries out of it. There are no `links` or `targets`, because Reach-In keeps the artifact current. Archived time comes from the stamp, read by the existing `deletedAtOf`, so time has one source in both stores.
- **Archive:** gate on `mutableTarget`, then `mintBundle(store)`, write the record from `gatherContentRecord` (parent is resolved correctly while the page is still in the tree), and `relocate`.
  - **What It Leaves Alone:** no `dropFromChildOrder`, so the slot stays in `page_order` as the Trash's does, where E-2 asks for the exact place; no `dropPageMetadata`; no `deleteCascade`; no `goneEdit`.
  - **Excluded Entries:** following the Set is set aside by F-2, which leaves them in the Set's parent.
- **Store Layout:** the store lies flat, one bundle level under the Collection's archive folder. `trashChainDir` mirrors the artifact's chain relative to the Nexus root (`bundle.ts:14-20`). Mirroring under `<Collection>/.archive/` would yield `Coll/.archive/Coll/Set/<stamp>__Page.md.archived/`, and `frozenCrumbs` would need its own prefix rule, since it strips only `TRASH_DIR` and the Contexts prefix (`trashRows.ts:22-29`). The parent comes from the record, so a mirrored chain adds nothing. The hoisted `mintBundle` therefore takes a chain-or-flat choice, about +3 lines.
- **Restore (Unarchive):** `openBundle(store)` → hoisted `resolveRecord` → `landingRefusal` / `exclusionWriteRefusal` / squatter check → `relocate` → remove the emptied bundle. It runs through `addressed`'s before/after `relink` so the live world re-spells for the arrival. `addressed` derives its label from `req.path`, `req.name`, or `req.newName` (`mutate.ts:98-100`), and an unarchive request carries `bundlePath`, so it either takes the label as a parameter or shares the relink through a sibling wrapper (about +3 lines). The restore is about 25 lines and uses none of the reconcile.
- **Homeless Rows:** a record whose Set is gone asks for a destination through the `withDestination` + `containerTargets` picker, as the Trash's does (F-1, E-5).
- **Delete From Archive:**
  - **What `deleteOp` Already Does:** it runs `mintBundle(.trash)` → record → relocate → strip.
  - **Gate:** accept an archive bundle path as a source alongside `mutableTarget`.
  - **Parent:** take `parent` from the archive record, not `gatherParentRef`, so E-3 follows.
  - **Chain:** mint the `.trash` chain from the **origin** container's current path, not the archive folder, so `deletedPathOf` and the crumbs read `Collection/Set/Page`.
  - **Paths:** build `paths` for `deleteCascade` from the archived pages mapped to the origin path, so the Link strip (C-2) uses the keys the page answered to. Under F-2 no excluded folder rides into the Archive, so the artifact's pages are only what Pommora manages.
  - **Set Config Reach:** gather the gone Set ids from its sidecars on disk for the config reach.
  - **Cleanup:** remove the `.archived` bundle once its artifact has moved into the `.trash` bundle. `listBundles` hides a bundle with no artifact (`holdings.ts:36`), but nothing deletes it, and that's the litter `spend.ts:66` describes.
- **Listing:** `listBundles(store)` + `trashRowOf` gives ArchiveView its rows, `homeResolves` included.
- **Undo:** the archive's notice is `notifyUndoable("Archived “…”", () => mutate({op:'unarchive', bundlePath}))` with `armed.set(bundlePath, …)`, and ArchiveView's Restore and Delete call `spendBundle`. It's the delete Undo's shape exactly.
- **Trade-Offs:** maximum reuse, one record format, and one listing, row, and spend path, and Sets come with it (a bundle already holds a folder artifact). The cost is legibility: archived pages sit one folder deeper inside stamped `.archived` folders rather than as plain files. The Trash already accepts that shape. Reach-In has to enumerate bundle artifacts, one level of indirection.
- **Estimate:** about +110 / -25. The new lines are `Core/Archive/` ops, a handler, the delete-source seam, and the parameterized store. The removed ones are the `restoreArtifact` split and the hoist renames.

###### B — Flat Archive Folder Plus One Manifest Per Collection

Pages and Sets move as plain entries into the archive folder. One JSON per Collection maps each archived entity's id to `{kind, parent, archivedAt, name}`. Placement still hoists `resolveRecord`'s container arm.

- **Trade-Offs:** this is the most legible on disk, since archived pages are plain `.md` files. But it costs a second record format beside `_record.json`:
  - **Collisions:** two archived pages with the same title from different Sets collide in the flat folder, so archiving needs `freeName` and the manifest has to keep the original name.
  - **Sync Contention:** one manifest is a shared file that every archive and restore read-modify-writes, which is a sync contention point. Recency-first resolution handles it only if updates are per-key.
  - **Bridging to the Trash:** delete-from-archive has to synthesize a Trash record from a manifest entry, and ArchiveView needs its own row builder.
  - **Drift:** an entry can drift from its file, for example after a hand-move in Finder. A bundle travels with its record (`NexusRecordPM.md:8`).
- **Estimate:** about +170.

###### Rejected Record Shape — Origin by Path Chain Alone

A mirrored chain like `.trash`'s, with no record, names the parent by its title and path. That's what `resolveRecord` exists to avoid (`NexusRecordPM.md:4`): a renamed or moved Set breaks it. The Trash keeps its chain for legibility and still resolves the parent by id from the record.

###### C — Hide in Place (A Flag, No Move)

The page or Set stays where it is and carries an `archived` mark that every reader skips.

- **Trade-Offs:**
  - **Free:** origin, order, metadata, and Reach-In (the files never leave the cascades' reach), and restore is clearing a flag.
  - **Against:** the filesystem would show archived pages as live, and every discovery surface needs a skip, the cost D-2's leaving-the-tree model avoids (the log's *Rejected · Archived Pages Kept in the Tree Under a Hidden Flag*). Sets need the mark on the sidecar and inheritance for their contents.

###### Recommendation

**A**, carried forward as Open Item 1's recommendation inside `.nexus/archive/<Collection ID>/` (B-2); its excluded-entry follow is set aside by F-2 and its incidental slot by E-2.

---

##### What Becomes False

- **`.claude/Features/NexusRecordPM.md:4, 8`:** Provenance is "a JSON written into every deletion bundle in `.trash`", and the code paths `Core/Trash/resolve.ts`, `spend.ts`. Under A, bundles and placement are shared and the paths move.
- **`.claude/Features/CorePM.md:87`:** "the Nexus root, `.nexus`, the trash, and excluded folders fall outside them" is incomplete once delete and unarchive take archive bundles as sources. Line 143's metadata lifetime row needs the Archive noted: entries are kept while archived. Lines 29-33's tree diagram gains the archive store.
- **`Nexus/liveTree.ts:79`:** the `mutableTarget` doc comment, if the delete-source seam is added there rather than in `deleteOp`.
- **`Trash/bundle.ts:13`:** "`.trash` reads as a shadow of the nexus" moves with the hoist, and the chain is now per store.
- **`Trash/trashRow.ts:11`:** "the renderer never sees a `.deleted` suffix" generalizes to both suffixes.
- **`Interface/Confirm/confirmations.ts:42, 48`:** the comments name only delete bundles.
- **`Actions/destinationTree.ts:1`:** already false today.
- **`Nexus/mutateRequest.ts:88`:** already misleading. `changesSettled` (`:139-147`) also needs the new ops.
- **Tests:** `Trash/trashRows.test.ts` (frozen crumbs and stamp parse, if they move); `deleteReach.test.ts` and `deleteOrder.test.ts` (they assume a delete source is tree-held and that the parent comes from the folder). `spend.test.ts` cases that reach `resolveRecord` or `withDestination` through `restoreOp` keep passing but change imports.

---

##### Risks & Questions

1. **Archive Location vs. Reach-In:** any `.`- or `_`-prefixed folder is outside the read walk, the watcher, the index corpus, and every cascade by one predicate (`Paths/exclusion.ts:17-24, 77-82`; `Files/walk.ts:73-83`; `CorePM.md:69`), so whichever location wins, the shared reach has to add it explicitly; an in-Collection `.archive/` creates the hidden-folder gap under *§Findings · Page Metadata*, and `.nexus/archive/<id>/` survives a Collection delete as an orphan. **Settled By:** B-1, B-2, C-3, and F-5.
2. **Restoring Into a Collection That Isn't the Archive's Own:** a Set can move to another Collection while a page archived from it waits, and `resolveRecord` follows the Set across, landing the page under a different schema. **Settled By:** E-1, which follows the Set by id, and F-6, which carries the archived page into the destination Collection's Archive with its Set.
3. **Position:** today's Trash restore regains a slot only while the tombstone in `page_order` lasts (*§Findings · Order*); recording the next sibling's id and splicing with `spliceBeside` (`creationOrder.ts:12-28`) would make it reliable, about +6 lines. **Settled By:** E-2, the exact place for both stores; the splice is a candidate.
4. **Title Collisions:** links naming an archived `Notes` re-resolve to whatever holds `Notes` while it's away. **Settled By:** D-1, which leaves them with the namesake; a restore that steps aside to `Notes (2)` follows E-4.
5. **Archiving a Set:** **Settled By:** I-2; Confirm Before Archiving governs Sets.
6. **Undo After Edits:** while the Undo is armed, a sibling created under the archived page's title makes the Undo step aside to `Title (2)`, as the Trash's does. **Settled By:** E-4.
7. **Auto-Delete Granularity:** a Set bundle's stamp is the archived time for everything inside it, so an auto-delete would expire the Set as one unit (the decision log's *§Prospects · Auto-Delete*).
8. **The `restoreArtifact` Split:** the hoist touches the same lines, and leaving the five-kind braid would leave the Trash the odd one out next to a 25-line unarchive. **Planner's Call:** within A-3's allowance.

---

#### Scout D — Views, the Table, the Shared Browser, the Entry, and the Menus

**Mandate:** ArchiveView's table, hosting and memory, the entry button, the header, the menus that delete, and batch actions with `ActionLabel`.

##### Findings

###### 1. The Table, the Trash, and What "Identical" Means

- **TableView has no read-only seam.** It's `ViewHostApi` from top to bottom: it destructures schema, view, columns, groups, ctx, bands, `commitValue`, `pickTarget`, and `mutate` (`Core/Views/Table/TableView.tsx:58-72`), mounts `useViewInteractions` for ghost rows, renames, drops, and title menus (`:119-130`), and keeps about 400 lines of editing, picker, sweep, and ghost code (`:97-399`). `useColumns(host)` writes widths, hides, aligns, and styles into the saved view (`useColumns.ts:252-345`). `useViewHost` reads a live container's values and its saved view (`useViewHost.ts:47-60`), and archived pages sit outside the tree (B-1). A read-only mode would mean either faking a host or branching every one of those paths.
- **The look comes from the shared sheet, not from TableView.** The full-length column divider is `.data-cell:not(:last-child) { border-right }`, and the rows stretch (`UIX/Table/table.css:4-9, 87-89`). The row hairline is `.data-row { border-top }`, with `.row-lead` dropping it on the first row (`:116-122`). TableView's header uses the short segment bars as well (`.col-header:not(:last-child)::after`, `:95-108`). So "identical to TableView" means body rows built as `.data-row` grids of `.data-cell`s on `--cols`. A list of `MenuItem` rows can't get there.
- **The Trash's look.** Each row is a `MenuItem` with `className="trash-row table-divider"` (`Core/Settings/TrashFrame.tsx:293-294`). The bar in each row is `.table-divider::after` (`table.css:97-111`), pulled in to the date lane (`trash-frame.css:35-37`), and the rows get a hand-drawn hairline (`trash-frame.css:67-74`). `.table-divider` and `.table.is-clear` each have exactly one code consumer, the Trash (`TrashFrame.tsx:202, 294`). Under A-3 both stay.
- **TableView's shell lives in Core.** The heading bleed, the content-inset padding, the grip gutter (`--rail-inset`, 20px), and `.row-grip`/`.row-rail` are in `Core/Views/Table/table-view.css:3-75`. A content-pane ArchiveView that looks identical has to wear that same shell, so it either imports `table-view.css` or the shell moves to `UIX/Table/`.
- **Virtualization:** only `UIX/Pickers/IconPicker.tsx:91` virtualizes. TableView renders every row, and so does the Trash. Adding none keeps ArchiveView consistent.
- **The date column.** The Trash resolves its style from the personalization key `trashColumnStyle` (`TrashFrame.tsx:65-69`, `personalization.ts:197`) and copies TableView's pick by hand: `styleMenuItems` → `parseStyleAction` → `storedPick` → `holdsStyle` (`TrashFrame.tsx:153-159`). TableView runs the same pick through `setStylePatch` → `columnStylePatch` → `pickedStyle` → `storedPick` (`useColumns.ts:303-306`, `useColumnStyles.ts:48-75`). The menu builder (`columnMenu.ts:54-94`) and the resolver (`columnStyles.ts:107-131`) are already shared. The only duplicated piece is the open-pick-store wrapper, about 7 lines.
- **Search:** two rules do the same job. The Trash ranks with `rankMatches(rows, q, row.match)` (`TrashFrame.tsx:52-56`). ViewSearch filters with `searchGroups` → `matchScore` (`Core/Views/Pipeline/search.ts:4-14`). Both start from `matchQuery`/`MatchKey` in `Paths/caseFold`. `TrashRow.match` is "the title, placed by the crumbs" (`Core/Trash/trashRow.ts:27-28`), the same key ViewSearch builds from the title and the path below the container.
- **The checked-row batch rule exists twice.** The Trash uses the shared `retained`/`toggled` (`UIX/Utilities/checkSet.ts`; `TrashFrame.tsx:77, 88, 97`) and the batch rule "a right-click on a checked row acts on the checked rows still in view; on an unchecked row, on that row alone" (`:161-165`). PageHistoryWindow uses the same helpers (`PageHistoryWindow.tsx:69, 81, 122`) with a slightly different rule: `checked.has(ts) ? [...checked] : [ts]`, with no in-view filter (`:139`). The menus overlap as well: `trashMenu.ts:15-33` builds Restore and Delete plus Restore All and Delete All, while `fileHistoryMenu.ts:5-12` offers Delete All alone for a batch.

###### 2. Hosting and Memory

- **Rendering:** `ContentView`'s `HostView` switches on `SelectionState.kind` (`Core/Interface/ContentView.tsx:52-89`). For a collection or set it renders `ContainerView` → `InterfaceScaffold`, which holds the banner and title, → `ViewHost` → the renderer (`ContainerView.tsx:6-11`, `ViewHost.tsx:17-33`). Hosts are keyed by `navKey`, parked and kept warm (`ContentView.tsx:93-136`), and the scroll position is held per `(tabId, key)` (`InterfaceScaffold.tsx:21-36`).
- **The active view is synced data.** It's the sidecar's `active_view`, switched through `setActiveView` (`ViewFrame.tsx:65-68`, `pickView.ts:7-21`, ViewTypesPM L10). Storing "ArchiveView" as a pseudo-view would write a device's browsing state into a synced file and keep it out of Back/Forward. That breaks G-5.
- **Navigation.** `NavRef`/`SelectionState` are unions (`Core/Navigation/navRef.ts:10-14, 34`), `navKey` is `kind:id` (`:43-45`), and `NAV_KINDS` validates stored refs (`:47-56`). Matrix is the precedent for a place that isn't a node: `MATRIX_REF` (`Core/Matrix/matrixKind.ts:6`), a resolve-index node (`Core/Nexus/treeIndex.ts:54-61`), and a branch in every exhaustive switch. Those switches are `ContentView.tsx:35, 87`, `SettingsMenu.tsx:11-27`, `Subfield/crumbs.ts:49-52`, `navigationSlice.ts:598-614`, and `reconcileSelection.ts:19-42`. `tabKey` is `navKey` (`tabsModel.ts:21-23`), so tabs, `StoredTab`, Back/Forward, and relaunch need nothing new.
- **Leak paths:** `searchEntriesOf` pushes every `nodesOf` record into nav search with no kind filter (`treeIndex.ts:146-173`), Matrix and the homepage included. An archive node added to `nodesOf` for its tab title and icon would show up in search unless it's filtered out. `searchView` opens only when `isContainer(target)` (`viewSearchSlice.ts:27`), so an archive target has to be admitted there. `ViewMenu` renders only for a Collection or a depth-1 Set (`ViewMenu.tsx:16-27`), so it has to render on the archive target, or the toggle can't take you back.
- **Sets and the dropdown:** depth-1 Sets have their own views and dropdown (`ViewMenu.tsx:23-25`). Sub-Sets have no dropdown. G-4 gives a depth-1 Set's dropdown the Archive button too, opening an ArchiveView of what was archived from within that Set.

###### 3. The Entry Button

- **It already exists as a pattern.** `PageHistoryWindow.tsx:207-216` puts a `<Button type="filled" size="button-inline" label="Restore">` in a `MenuFooting`'s `trailing`. `ManageRow.tsx:43-48` uses `type="filled"` with `pressed={open}` as a toggle, and `pressed` lays the selected wash over the fill (`button-base.css.ts:150-156`). `button-inline` is 20px tall with a 4px label pad (`:25-32`). So the Archive button is `<Button type="filled" size="button-inline" label="Archive" pressed={inArchive} />`, with no UIX change.
- **The footing.** `MenuFooting` lays out `leading`, a spacer, and `trailing` (`UIX/Menus/MenuRows.tsx:208-231`), and its `footing` row has a 4px gap (`menu-row.css.ts:66-70, 239-243`). So `leading={<>{FootingCreate}{ArchiveButton}</>}` puts it right of the `+` with no new style.
- **Dead placeholder:** `ViewFrame.tsx:108-116` is a disabled `AccessoryButton icon="dots"` marked `// PLACEHOLDER`, and nothing reaches it.

###### 4. The Header

- **The in-line title isn't in the Toolbar.** It's `DetailTitleHeader` (`Core/Interface/Header/DetailTitleHeader.tsx`), mounted by `EntityBanner` (`Banner.tsx:115-149`), mounted by `InterfaceScaffold` (`InterfaceScaffold.tsx:42`). ViewSearch's state is tab-keyed (`viewSearchSlice.ts:7-11`), and the banner offers search only for a container owner (`Banner.tsx:98`).
- **The clear button** is `.detail-title-clear` with `margin-left: auto` (`content-title.css:91-95`; `DetailTitleHeader.tsx:210-223`), so it sits at the row's right edge. A trailing label placed after it in `.detail-title` (gap 8px, `content-title.css:1-7`) gets "the clear pads against the label" for free. The cost is threading one optional `trailing` node through three components: InterfaceScaffold → EntityBanner → DetailTitleHeader.
- **The banner's whole surface comes along.** With the Collection as owner, ArchiveView inherits the banner image, the banner menu, rename, edit icon, and toggle icon (`Banner.tsx:111-189`). Some of that is probably wrong while you're in the Archive (see *§Risks*).

###### 5. Menus That Delete

- **Page Delete is already one row.** Every page-deleting menu builds through `DELETE_ROW` (`Core/Actions/pageMenu.ts:40`), via `PAGE_ACTION_ROWS` (`:101-105`) and `pageMetaMenuItems` (`:116-133`). Callers:
  - **`entityMenuItems`, page branch** (`entityMenu.ts:42-50`): the sidebar (`Sidebar.tsx:81`), the Matrix (`MatrixView.tsx:70`), and GroupBand (`GroupBand.tsx:167`).
  - **`cellMenuModel`** (`cellMenu.ts:117`): the Table title and grip (`TableView.tsx:303`).
  - **`cardMenuItems`** (`cardMenu.ts:17`): Cards.
  - **`PAGE_ACTION_ROWS`**, through `popPageActions` (`pageMenuActions.ts:74-81`): the toolbar's PageMenu (`Core/Pages/PageMenu.tsx:53`) and the Page Window body (`WindowTabBody.tsx:235`).
- **Page Delete has one runner.** Every host runs it through `runPageAction`'s `title:delete` case (`pageMenuActions.ts:66-68`): entity menus (`entityMenuActions.ts:106`), views (`useViewInteractions.tsx:404`), the tab bar (`TabBar.tsx:120`), the window tab strip (`WindowTabStrip.tsx:125`), nav rows (`NavList.tsx:40`), and connections (`connectionMenuActions.ts:43`).
- **Menus with no page Delete:** tabs (`tabMenu.ts:44-47`, send rows and Rename only), nav rows (`navRowMenu.ts:35`), and connections (`connectionMenu.ts:54`, which removes the link). `gripMenu.ts:101` is the MarkdownPM block grip. Glances and embeds carry no page menu of their own. There's no keyboard delete command for a page: `commands.ts:77` is a key-name table.
- **Set Delete** is a separate literal: `{ label: 'Delete', action: 'delete' }` in the container branch (`entityMenu.ts:64-67`), run by `confirmDelete(target)` (`entityMenuActions.ts:134`). It sits in the `[Rename, Delete]` group above the lock, Copy Path, and Reveal group; I-1 moves it into the bottom section. It reaches the sidebar and GroupBand's Set bands. The Space and Context branch has its own Delete at `:95`.

###### 6. Batch Actions and the Notice

- **`NotificationLabel` is a global toast.** It's mounted once (`App.tsx:198`, after every window, so it sits above Settings), positioned fixed at the top right below the toolbar at `stack.top.interrupt` (`notification-label.css.ts:11-28`), and fed by a store-free single-slot channel (`notifications.ts:20-36`). Its model holds one `message`, an optional `segment`, a `tone`, and one `action` (`:11-16`). It times itself with a rAF drain over `DWELL_MS` (`NotificationLabel.tsx:33-52`), and `trackNear` slows the drain while the pointer is within `NEAR_RADIUS` (`:61-74`). Posting replaces whatever is showing.
- **Why "bypass the hover-pause" matters:** pressing a button on the action bar leaves the pointer exactly where the Undo notice then posts. `trackNear` reads that as near and holds the drain for as long as the pointer stays (`:43`). Any notice posted under the pointer has this problem, not just this one.
- **Reveal primitives in use:** `useHoverReveal` (dwell, engaged, linger; `hoverReveal.ts:29-60`) drives the sidebar's lock (`Disclosure.tsx:84`) and the title's Search hint (`DetailTitleHeader.tsx:59-62`). `trackNear`/`withinBox` drive the notice, the glance, and the tile grid. `paneSlide` drives the notice's entrance. `revealTarget` with `[data-reveal-host]` drives row accessories, and the Trash forces it on with `.has-checked` (`trash-frame.css:76-79`). `Segments` draws the notice's two parts (`NotificationLabel.tsx:92`). `Segmented` draws a pill split by dividers (`Button.tsx:157-215`), and `type="destructive"` exists (`button-base.css.ts:191-197`).

---

##### Removal & Consolidation

| What | Where | Rough Lines |
| --- | --- | --- |
| The dead `// PLACEHOLDER` "More" button, replaced by the Archive button | `ViewFrame.tsx:108-116` | −9 / +6 |
| One Restore/Delete menu builder for the Trash, File History, and the Archive, with batch labels and an optional destination submenu | `trashMenu.ts` + `fileHistoryMenu.ts` → one builder (e.g. `Actions/restoreMenu.ts`) | −12 / +6 (the two files are 45 lines together) |
| One batch rule, "checked rows in view, or the clicked row alone", settling the History window's divergent rule | `TrashFrame.tsx:161-165`, `PageHistoryWindow.tsx:139` | −4 / +6 (the set helpers are already shared) |
| One date-column hook: resolve the stored style, open the style menu, store the pick. Used by the Trash and the Archive, keyed by setting. | `TrashFrame.tsx:65-69, 153-159` → shared hook | −12 / +18 |
| One batch runner: flush saves, run the op per item, collect done/refused/warnings, report with `countPhrase`. Trash restore and empty, Archive restore and delete. | `TrashFrame.tsx:99-151` → shared | −50 / +45 |
| `countPhrase`/`PLURALS`, shared so a uniform batch names its kind and a mixed one reads "N Items" | `TrashFrame.tsx:36-50` | moved, ±0 |
| `DELETE_ROW` becomes a removal pair `[ARCHIVE_ROW, DELETE_ROW]`, plus one `title:archive` case in `runPageAction` | `pageMenu.ts:40, 104, 132`; `pageMenuActions.ts:66` | +6 |
| The container branch's Delete moves into its own bottom section, paired with Archive for Sets and alone for Collections (I-1) | `entityMenu.ts:66`, `entityMenuActions.ts:134` | +5 |
| TableView's shell CSS hoisted to `UIX/Table/`, so TableView and ArchiveView wear one shell instead of ArchiveView importing a view-private sheet | `table-view.css:3-22, 49-75` → `UIX/Table/table.css` | ±0 (moved, ~45) |

The Trash's visual CSS (`trash-frame.css`, `.table-divider`, `.is-clear`) stays under A-3. The `PommoraUIX.md` line describing it stays true.

---

##### Approaches

###### A. ArchiveView on the Real TableView, Read-Only Mode

ArchiveView would mount `TableView` with a synthetic `ViewHostApi`: two fixed columns, no saved view, and edits disabled.

- **For:** It's literally the same component.
- **Against:** No seam exists for it (*§Findings 1*). A fake host has to stub `commitValue`, `pickTarget`, `persistView`, `setStylePatch`, bands, and ghosts, and TableView and `useViewInteractions` would need a `readOnly` branch at every gesture. Column resize and style writes have nowhere to save. Archived pages and Sets aren't `ViewRow`s from the tree. Checkboxes don't exist in TableView. This adds a mode to the most complex renderer to save about 100 lines. Rejected.

###### B. A Small ArchiveTable on the Shared Sheet, Sharing Below the Visual Layer — Recommended

- **ArchiveView's grid:** `Core/Archive/ArchiveView.tsx` draws a `.table .table-view` shell with a `.table-grid`. Its `.table-head` holds two `.col-header` cells, Title and Archived, with the right-click style menu on Archived. Each row is `.data-row` > `.data-cell` × 2 on `--cols` (Title takes `minmax(280px, 1fr)`, Archived uses `widthFor`'s dateTime default). The compact `Checkbox` reveals in the `--rail-inset` gutter where TableView's grip sits (the compact box is 12px, `UIX/Controls/checkbox.css:47-50`, so it fits), and is forced on while anything is checked. That gives the identical full-length dividers and hairlines with no new CSS beyond the hoisted shell. About 120-150 lines.
- **Shared with the Trash, below the visual layer:** `useCheckedRows`, the date-column hook, the batch runner, the Restore/Delete menu builder, `countPhrase`, and one row shape. The row shape is title, icon, kind, crumbs, date, and `homeResolves`, which `TrashRow` already is (`trashRow.ts:12-29`). The Archive's row would be the same type, or a shared base type, with `bundlePath` replaced by an archive id. Search uses one rule: ArchiveView reads the tab's `viewSearch` query through the same `matchQuery` → `rankMatches`/`matchScore` path, keyed on title placed by crumbs, as the Trash.
- **Genuinely shared vs only alike:**
  - **Data:** shared. Same row model, same batch semantics, same report phrasing.
  - **Interaction:** shared. Same checked-set rule and same menus.
  - **Look:** only alike. Two different row chromes under A-3, and that's honest because one is a Settings list and the other a content-pane table.
- **Archived Sets:** a Set row shows the Set icon, its title, the trail of where it lived, and its archived date. Opening it discloses its archived pages inline as indented rows, using `--row-indent` (`table-tokens.css:8`), the token TableView already indents nested rows by, and each page opens in the ArchiveWindow. Restore and Delete on a Set act on the whole Set. G-4 gives each top-level Set its own ArchiveView.
- **Entry:** `<Button type="filled" size="button-inline" label="Archive" pressed>` in the footing's `leading`, after `FootingCreate`. Pressing it toggles `select({kind:'archive', id: collectionId})` and `select({kind:'collection', id})`, so the toggle is itself a Back/Forward step.
- **Memory:** a new place kind, `{ kind: 'archive'; id: string }`, on the Matrix precedent. It's added to `SelectionState`, `NavRef`, and `NAV_KINDS`, gets a branch in each exhaustive switch (the compiler lists every site), and a `nodesOf` record titled from the Collection, which `searchEntriesOf` has to skip. `searchView` is admitted for it and `ViewMenu` renders for it. Putting a flag on the collection target instead would make every `kind === 'collection'` check (16 sites) silently treat ArchiveView as the Collection. The pseudo-view route writes to synced data and skips Back/Forward. Both are rejected. About 60-90 lines across nav.
- **Header:** `DetailTitleHeader` gains an optional `trailing` node rendered after `.detail-title-clear`, threaded from `InterfaceScaffold` (three hops). ArchiveView passes an "Archive" label colored `var(--label-tertiary)`. About +8 lines.

**Net:** the consolidation rows net out to about −140 / +130. The new surface adds ArchiveView (~130), the nav kind (~75), ActionLabel and its slot (~70), the header's trailing node (~8), and the menu rows (~11), so the whole thing comes to roughly **+250**. The positive part is the new surface and the new place kind themselves. The consolidation is what keeps it from reaching about +400, because the Archive reuses the Trash's runner, menus, checked-row rule, and date hook instead of copying them.

###### C. One UIX "CheckTable" Both Browsers Render

This would put a presentational fixed-column table with gutter checkboxes in `UIX/Table/` and have the Trash and the Archive both draw through it.

- **Against:** A-3 keeps the Trash on `MenuItem` rows, so C would serve one consumer and is premature. Revisit it if a third fixed-column table appears, File History being the likely one.

###### Batch Actions: `ActionLabel` vs a `NotificationLabel` Variant

**Recommendation:** a new `ActionLabel` (G-7), with the label chrome hoisted so the two share the look rather than the behavior.

- **Why not a variant:** the notice is a global, store-free, single-slot toast that drains on a timer. The action bar is owned by a surface and persists while rows are checked. It has two actions, a count, a tinted and a destructive button, no countdown, and it has to hide when its host is parked or the Settings frame closes. As a variant, half of `NotificationLabel`'s effects (`:23-74`) would branch on mode, and the single channel would have two owners racing for one slot.
- **What the two share:**
  - **The chrome:** fixed top-right placement, insets, z-index, fill, border, and radius, hoisted from `notification-label.css.ts:11-28` into one shared style.
  - **The entrance:** `paneSlide`.
- **Placement has to be an app-level slot, not a fixed box inside the browser.** A parked host is `translate: -200vw` (`Core/Interface/interface.css:40-46`), the pane's slide animates `transform` (`UIX/Animations/motion.ts:62-63`), and the glass windows use `backdrop-filter` (`UIX/Glass/glassBase.ts:73`). Each of those makes a `position: fixed` descendant position against its ancestor instead of the app window. So the browser (ArchiveView, or TrashFrame while it's showing and its host isn't parked) only *declares* its bar, through a small store-free channel shaped like the notice's, and one App-level host renders it beside `NotificationLabel`.
- **The slot:** the host reads `useNotification()` and yields while a notice shows, so a posted notice (Undo, a report) takes the place, and the bar returns when the notice ends. One slot, one owner at a time.
- **ActionLabel's body:** a `Segmented`-style run, `Restore` (tinted) | `N Pages` (text) | trash icon (destructive), plus whatever the surface hands it. About 60-80 lines, including the declare channel.
- **The hover-pause bypass:** fix it at the source rather than adding a flag. A notice posted with the pointer already inside `NEAR_RADIUS` stays unarmed until the pointer leaves once. That covers this case and any other notice posted under the pointer, which is One Way. About +4 lines in `NotificationLabel.tsx`.
- **The right-click batch stays,** through the shared menu builder.

---

##### What Becomes False

- **`.claude/Features/ViewTypesPM.md`:**
  - **L61:** the ViewFrame footer description ("over a New View footer") gains the Archive button.
  - **L66:** *§The View Host* says "Every renderer mounts through one seat, `ViewHost`." ArchiveView mounts outside it, and that exception has to be stated where a reader meets it.
  - **L71:** *§View Search* says the search belongs to "a container's in-line title." It now also belongs to ArchiveView.
  - **L95:** *§The Table Sheet* says "TableView adds its own layer over it." That's only true if the shell stays in Core; hoisting it changes the line and the SOURCE row.
- **`.claude/Features/PommoraUIX.md:391`:** the list of surfaces using `UIX/Table/` ("TableView, the Trash") gains ArchiveView, and the shell if hoisted.
- **`.claude/Features/ConfigurationPM.md:215-221`:** the Trash's Date Column row stays. A sibling row is needed for the Archive's date-column key, or this row is reworded if one key serves both.
- **Code comments:**
  - `ViewMenu.tsx:15` ("Renders only on a Collection / depth-1 Set").
  - `trashMenu.ts:9` (the batch rule's home moves to the shared hook).
  - `TrashFrame.tsx:162` (that long comment moves with the rule).
- **Tests:**
  - **`TrashFrame.test.tsx`:** the `filterRows`/`countPhrase` imports (`:33-85`) move with the hoist, while the DOM tests on `.trash-row`/`.trash-head-date` (`:170, 217-267`) stay valid under A-3.
  - **`trashMenu.test.ts` and `fileHistoryMenu.test.ts`:** collapse into one.
  - **`entityMenu.test.ts`, `pageMenu.test.ts`, `cellMenu.test.ts`, `cardMenu.test.ts`:** every snapshot of the page menu's last group gains Archive.
  - **`ViewFrame.test.tsx`:** the footing contents change.
  - **`navRef.test.ts`:** the stored-ref validation gains a kind.
  - **`NotificationLabel.test.tsx`:** the arming rule changes the near behavior.

---

##### Risks & Questions

1. **The Set Dropdown:** **Settled By:** G-4; a top-level Set's dropdown carries the button, opening an ArchiveView of what was archived from within that Set, and the toggle returns to that Set's view.
2. **The Views Button in ArchiveView:** what the toolbar's views button and the sliders menu show there; `SettingsMenu.tsx:13-15` would render the full view SettingsFrame, which doesn't apply. **Planner's Call.**
3. **The Banner:** whether ArchiveView shows the Collection's banner image and keeps rename and edit icon on its title. **Planner's Call;** G-3 sets the in-line title and its "Archive" label.
4. **The Date-Column Key:** one personalization key for both browsers' date style (renaming `trashColumnStyle`), a sibling key, or a per-Collection setting. **Planner's Call;** G-1 sets the default to the Nexus's date format.
5. **Where an Item Lived:** **Settled By:** G-2; the trail sits beneath the title, as the Trash's crumbs do through `NavTrail` (`TrashFrame.tsx:296-305`).
6. **Where the Shared Parts Live:** **Settled By:** A-4; one neutral owner beside the Trash and the Archive, named in planning.
7. **Recents:** G-5 treats ArchiveView as a place like any other; whether that includes recents and pins is the plan's to confirm.
8. **Scale:** neither TableView nor the Trash virtualizes, so a Collection with thousands of archived pages renders them all. **Planner's Call** under the Scalability Locked Decision.
9. **Archive Inside an Archived Set:** what Archive does on a page inside a Set that's later archived, and whether restoring the Set brings its individually archived pages back. **Planner's Call;** it decides how ArchiveView's Set rows disclose.
10. **Collections:** **Settled By:** A-2 and I-1; Collections aren't archivable, and a Collection's Delete moves alone into the bottom section.

---

#### Scout E — Windows, History, Settings, Confirmations, and Notices

**Mandate:** the read-only window, the archive history timeframe, the settings rows, confirmations, and the Undo notice.

##### Findings

###### 1. Windows

###### The History Window Today

- **One Slot:** `historyTarget: PageTarget | null` (`Core/Session/windowSlice.ts:30`), set and cleared by `openHistory` / `closeHistory` (`:142-143`), counted by `windowsOpen` (`:64-69`), and reset in `CLOSED` / `PER_NEXUS` on close-all and Nexus switch (`:71-84`, `:258-261`, `:284-287`). Its one opener is the page action `title:history` (`Core/Interface/Menus/pageMenuActions.ts:63-64`); it mounts once in `Core/Interface/App.tsx:191`.
- **Already Single-State, Uncached, and Unremembered:** a single nullable slot, so one at a time. It is absent from `WindowKind` (`Core/Interface/Windows/windowRecord.ts:8`) and from the persisted `windowsFile.sets` (`windowSlice.ts:129-136`), so it never comes back after relaunch. Its `MarkdownEditor` gets no `warm` seam (`PageHistoryWindow.tsx:246-253`), so it keeps no editor state or scroll, and it re-reads its body on every open (`:100-116`). Two things are kept. The **size** persists per machine under the window id `'page-history'` through `useWindowGeometry` (`PageHistoryWindow.tsx:63`, `Core/Interface/Windows/useWindowGeometry.ts:6-18`), and the side panel's width persists for the session (`UIX/Windows/WindowBase.tsx:66-69`). Also, the "Current Version" body goes through `fetchPageDetail` (`PageHistoryWindow.tsx:106`), which **does** seed the shared page-detail cache (`Core/Session/pageDetailCache.ts:102-116`). That's harmless for a live page, but an archived page's body shouldn't land in that cache.
- **Shape:** `PageHistoryWindow` (outer, presence via `useHeldPresence`, `:48-53`) → `PageHistoryBody` (`:55-260`), which mounts `WindowBase` with:
  - `title`: a `NavTrail` built from `trailOf(tree, {kind:'page', id})` (`:120`, `:230-234`);
  - `right`: an overlay panel holding the snapshot list (a "Current Version" row, then one row per snapshot with a checkbox, a trash button on checked rows, and a right-click menu), plus a `MenuFooting` whose trailing filled **Restore** button needs exactly one checked row (`:155-221`, `:235-241`);
  - body: a read-only `MarkdownEditor` inside `.page-tile.page-history-page` (`:243-257`).
  - It sets no `lead`, no `onScan`, no `actions`, and no `footer`.
- **Restore Today:** `restoreFromHistory` (`:38-46`) flushes the pending save, asks `history:restore`, and calls `replaceBody`. It works on the body only. Reusing History's Restore therefore reuses the button's *shape* (`MenuFooting` + `Button type="filled" size="button-inline" label="Restore"`, `:207-219`). An archive restore is a move, so it shares none of the logic.

###### The PageWindow Is the Wrong Base

- It's a tabbed window: tab set and active tab in `windowSlot` (`windowSlice.ts:25`, `:144-176`), the set persisted to `windowsFile` on every change (`:129-136`), parked page tabs mounted up to the Active Tab Cache (`Core/Interface/Windows/WindowTabBody.tsx:137-149`), warm editor state per tab (`windowCache.ts:3-22`, `WindowTabBody.tsx:98`), an editable `PageTile` (`:91-102`), and promote / rename / page-actions wiring (`:151-161`, `:230-240`). Each of these is the opposite of "single-state, uncached, unremembered". A read-only mode would need a guard in each of them. This confirms H-1's rejection (the log's *Rejected · A Mode of `PageWindow`*) with evidence.

###### WindowBase's Leading Slot and the Lock Glyph

- The toolbar's leading cluster is `div.window-actions-lead`. It renders the `scan` button when `onScan` is passed (title defaults to "Open Full Page"), followed by `lead` (`UIX/Windows/WindowBase.tsx:242-254`). PageWindow, NavWindow, and MatrixWindow pass `onScan` (`PageWindow.tsx:98`, `NavWindow.tsx:117`, `Core/Matrix/MatrixWindow.tsx:37`). WebWindow already fills `lead` with Back/Forward (`WebWindow.tsx:60-79`).
- **The lock needs no WindowBase change:** omit `onScan` and pass `lead={…}`. `LockGlyph` exists (`UIX/Symbols/index.tsx:263-287`, the `locked` / `lock-outline` faces at `:197-198`) and is used by six surfaces, always with `lockLabel` (`Core/Actions/toggleLabels.ts:12`).
- **Related vocabulary:** `PageMenu`'s "Page Lock" is a placeholder toggle that locks nothing (`Core/Pages/PageMenu.tsx:32-47`). If a locked glyph on an archived page reads as "this page is locked", the future Page Lock and the reader window claim the same glyph; H-1 gives both the one meaning, read-only.

###### How the Editor Goes Read-Only (All Already in History)

- `readOnly` sets `EditorState.readOnly` plus a `changeFilter` that blocks doc changes typed by the user (`Core/MarkdownPM/MarkdownEditor.tsx:79-80`, `:134-136`, `:267-277`). A comment there says programmatic dispatches still pass, which is fine because History passes no `onHeadingRename` (`PageHistoryWindow.tsx:246-253`).
- `useEditorHost({ connections: useConnections('inert'), inert: true })` drops the format menu and glance (`Core/Pages/editorHost.tsx:106-113`, `PageHistoryWindow.tsx:118-119`).
- `embedAncestors={[HISTORY_ANCESTOR, livePath]}` keeps embeds inert (`:36`, `:251`).
- CSS hides the caret and the text cursor: `.page-history-page` (`Core/Interface/Windows/page-window.css:30-36`), plus the placeholder rule at `Core/MarkdownPM/markdown-pm.css:72`. Both class names are History-specific.

###### Properties and a SidePane

- `PropertyPanel` has **no read-only mode**. Its props are `subject`, `host: 'dropdown' | 'side-pane'`, and `connections` (`Core/Properties/PropertyPanel.tsx:79-88`). It always wires `mutate` and a `writer` (`:91`, `:185-195`). It reads its frontmatter through `fetchPageDetail` (caching) and its schema through `containerSchema(tree, path)` (`:115-133`, `:158-161`). For an archived path, that schema only resolves if the archive path still sits under its Collection's folder in the tree's terms. Showing properties read-only therefore costs a new mode on a 577-line component.

###### The Archived Target Breaks Two Tree Lookups

- **Reconcile:** `reconcileWindow` re-resolves `historyTarget` on every tree change (`windowSlice.ts:279-281`) through `reconcileWith` (`Core/Session/reconcileSelection.ts:33-41`). A page id not in the tree survives only if `index.withheld(path)`, which means a path under an unreadable or sidecar-less folder (`withheldIn`, `Core/Nexus/treePatch.ts:266-269`). So an archived target in the same slot would be **closed on the next tree change**.
- **Title:** `trailOf` returns `NO_TRAIL` for an id the tree doesn't hold (`treeIndex.ts:132-143`), so the History title (`PageHistoryWindow.tsx:120`) would render blank for an archived page.
- **Body read:** `page:open` reads any path under the root through `resolveUnderRoot` + `readPage`, with no tree check (`Core/Pages/handlers.ts:18-24`, `Core/Paths/pathSafety.ts:14-38`). The ArchiveWindow can read an archived file with an uncached `dialer().ask('page:open', path)`.

###### 2. History

- **Capture:** only for pages the tree holds. `writeBody` and `noteExternalEdit` key by `liveIdOf` (`Core/Pages/fileHistory.ts:117`, `:136`), and `restoreSnapshot` / `captureFromDisk` by `livePathOf` (`:89`, `:174`), both on the held tree (`Core/Nexus/heldPages.ts:16-28`). So **an archived page gains no new snapshots**: it's read-only, outside the tree, and cascade rewrites don't go through `writeBody`. Its history is exactly what it had when archived, and only shrinks from there.
- **Sweep:** `sweepFileHistory` reads `keepMs` and runs `sweepSnapshots(cutoff)` + `sweepCaptures(cutoff)` (`fileHistory.ts:194-203`). The SQL is `DELETE FROM snapshots WHERE ts < ?` (`Desktop/Store/versionsDb.ts:71-73`), through the port at `Core/Platform/stores.ts:82-90`. It's triggered at open **before the tree is read** (`Core/Nexus/handlers.ts:85-86`) and on any `historyDays` write (`Core/Settings/handlers.ts:46`).
- **Config:** `readFileHistoryConfig` → `{enabled, intervalMs, keepMs}` (`Core/Settings/settings.ts:64-73`). Keys: `fileHistory`, `historyDays` (`HISTORY_DAYS` = 7/14/30/60/**90**), and `historyInterval` (`Core/Settings/personalization.ts:42-43`, `:188-190`). These are Nexus personalization keys, so every device reads the same timeframe.
- **Snapshots key on `page_id`** (`versionsDb.ts:9-15`). The ID survives an archive or restore move, so a restored page keeps whatever the shorter sweep left. Nothing needs re-keying.
- **The content index already pairs path ↔ ID:** `page_values` stores every frontmatter key including `ID` (`Core/Index/indexSeed.ts:43`, `:61`, `:112`), and `SELECT_STATS` joins `indexed_files` to `page_values` on the ID key (`Desktop/Store/stores.ts:49`). The index's queries return null until the seed marks it ready (`Core/Index/contentIndex.ts:44-62`).
- **Corpus Conflict (Cross-Mandate, the Location B-2 Settles):** `outsideContent` refuses any path with a hidden folder on the way, meaning a leading `.` or `_` (`Core/Paths/exclusion.ts:17-23`, `:76-81`). `.nexus` itself counts as hidden there; it's exempt only from `neverWatched`, the watcher filter (`:26-37`). Both candidate locations, `<Collection>/.archive/` and `.nexus/archive/<id>/`, therefore sit **outside the corpus and the index as written**. Sync differs between them: `manifestAdmits` (`exclusion.ts:44-61`) uses `neverWatched` and special-cases `.trash` (`:55`). It **admits `.nexus/archive/…`** but **refuses `<Collection>/.archive/…`**, so as written a page archived there would never reach the hub or other devices. C-1 (Reach-In) needs archived pages in what cascades reach, and B-1 needs them synced, so whichever location wins, the corpus rule (and, for a Collection-local folder, the manifest rule) must admit it deliberately and identifiably by path. The archive-history design below relies on that and doesn't add it on its own account.
- **Hub:** retention is one per-Nexus `history_days`, written once at `info` create (`Core/Sync/handlers.ts:333-341`, `Core/Sync/Contract/wire.ts:59-65`). The hub sweeps by age, skipping blobs that a live item's current version or a capture still references (`Sync/Store/log.ts:70-79`, `:186-191`, `Sync/hub.ts:215`). It knows no page IDs and no archive. **F-013** (`.claude/IssuesPM.md:303-315`) records that it never learns later changes.

###### 3. Settings

- Adding a key is one line in `SETTINGS` (`personalization.ts:150-226`). Schema, default, range, `settingOf`, and the `personalization:set` handler all derive from that line (`:89-110`, `Core/Settings/handlers.ts:42-48`). No codec change is needed.
- **The Deletion section** is `Core/Settings/frames.ts:583-605`: Confirm Before Deletion, Permanently Delete Files, and Restore Links On Deletion. File History is `:606-634` (History Timeframe is a `zoom` row with `unit: DAYS` and no hint, at `:615-620`). The Trash frame is the foot surface at `:903-909`.
- **Copy Pattern:** labels in Title Case with "Before"/"On"; hints as single sentences in present tense ("Ask before…"). **Drift:** the Permanently Delete Files hint (`frames.ts:596`) says "keeping this off will move them to system trash", while ConfigurationPM says "Erases an item emptied from the trash rather than handing it to the system trash" (`.claude/Features/ConfigurationPM.md:116`). The doc matches `askEmptyTrash` (`confirmations.ts:162-173`). Worth fixing during the rename.

###### 4. Confirmations and Notices

- `confirmDelete` (`Core/Interface/Confirm/confirmations.ts:67-89`): `waived(kind)` skips the question only for kinds outside `ALWAYS_ASKS` (Collection, Set, Space, Context) when `confirmDeletion` is off (`:28-38`). The question is `Delete “X”?` with a Trash-Mode detail. Then comes `mutate({op:'delete'})`, then `notifyTrashed`.
- `notifyTrashed` (`:49-65`) → `notifyDeleted` (`Core/Interface/Notifications/notifications.ts:84-101`). That one fixes the verb "Deleted" and adds the "N Internal Links" **segment** from `cascade.pages`. It hands off to `notifyUndoable` (`:106-137`), which posts the notice with Undo, pushes the same one-shot revert onto the undo chord (`Core/Session/undo.ts:15-21`), and returns a *spend*. `confirmations.ts:40-46` keeps the spends in `armed`, keyed by `bundlePath`, so the Trash frame's restore or delete spends the Undo (`Core/Settings/TrashFrame.tsx:100`, `:121`).
- **The countdown isn't an Undo feature.** Every notice drains its bar over `DWELL_MS` (`Core/Interface/Notifications/NotificationLabel.tsx:33-52`). Archiving gets it automatically.
- **Counts and batches:** `itemCount` (`Core/Properties/properties.ts:263`). The Trash frame's batch is `many()` → `countPhrase(rows)` (per kind when uniform, "N Items" when mixed) → one `notifyReport` (`TrashFrame.tsx:45-50`, `:103-150`). Batch empty asks through `askEmptyTrash(count)`. There's no batch delete for live pages anywhere, so a "mixed batch" only exists inside the shared Trash/Archive browser.

---

##### Removal & Consolidation

| What | Change | Rough Δ |
| --- | --- | --- |
| `historyTarget` + `openHistory` / `closeHistory` | Replaced by one typed slot `reader: { kind: 'history' \| 'archive'; page: PageTarget } \| null`, or kept as is with a second slot (see *§Approaches*). The slot's reconcile becomes a `switch` on kind. | ±0 to +6 |
| `PageHistoryWindow.tsx` | Generalized in place: the History-only parts (list panel, snapshot body source, snapshot restore) become the `history` branch; the shell, read-only editor, inert host, and sentinel ancestor are shared. No second file. | +35 to +55 net for the archive branch |
| `fetchPageDetail` for the current body | Replaced with a direct `page:open` read in both modes, so "uncached" holds for the whole window. One read path instead of two. | −1 |
| `.page-history-page` | Renamed to a neutral reader class in `page-window.css:30-36` and `markdown-pm.css:72`. | ±0 |
| `HISTORY_ANCESTOR = 'page-history'` | Renamed to the window's neutral name; one sentinel. | ±0 |
| `spendBundle` / `armed` | Renamed `spendUndo(key)`; the key is any string. Archive arms by its own key (archived path or page id). One spend map for both. | ±0 |
| `waived(kind)` | Takes the setting key: `waived(key, kind?)`, so delete and archive read one predicate. | +1 |
| `notifyDeleted` | **Kept as is.** Archiving strips nothing (D-1), so it has no segment and calls `notifyUndoable(\`Archived “${title}”\`, undo)` directly. Merging would parameterize a verb for one caller. | 0 |
| `sweepSnapshots(cutoff)` | Grows one parameter for the archived cutoff; still one statement, one sweep. | +4 |
| Permanently Delete Files hint | Reworded to match the doc during the rename. | 0 |

---

##### Approaches

###### Preview Window

###### A. One Window, One Slot Typed by Kind (Recommended)

`PageHistoryWindow.tsx` becomes the one read-only page window, with the session slot `reader: { kind: 'history' | 'archive'; page } | null`.

- **Shared:** presence, `WindowBase` with geometry, inert host, `readOnly` editor, sentinel ancestor, uncached `page:open` read, title.
- **History:** `right` = snapshot list + footing Restore (unchanged); body = current or snapshot.
- **Archive:** `lead` = `LockGlyph locked` (no `onScan`); body = the archived file; Restore = the same filled inline `Button` in the toolbar's trailing `actions` (`WindowBase.tsx:256-258`), since there's no list panel for a footing to sit in; title = a trail built from the archive's origin record, because `trailOf` is blank off-tree. The reconcile `switch`: `history` → `reconcileWith` as today; `archive` → close only when the archived page leaves the archive (restored or deleted), which the archive's own change signal reports. The precedent is `trashChanged` (`Core/Session/nexusSlice`, subscribed at `TrashFrame.tsx:93`); its archive twin belongs to the browser's design, and ideally it's one shared signal.
- One slot also means opening an archived page closes History, and the reverse. That fits "one at a time".
- **Cost:** one file grows by about 40-55 lines, plus one switch in `reconcileWindow`. **Gain:** one chassis, one read path, one inert-editor setup, and no second window mount, opener pair, or `windowsOpen` term.

###### B. Shared Hook, Two Thin Windows

A `useReadOnlyPage(path)` hook plus a `ReadOnlyPageBody` component, used by `PageHistoryWindow` and a new `ArchiveWindow.tsx`, each with its own slot (`historyTarget`, `archiveTarget`).

- **Upside:** each file reads as exactly one window, and the reconciles stay separate.
- **Downside:** a second slot, opener pair, mount in `App.tsx`, `windowsOpen` / `CLOSED` term, and file. Two windows could be open at once, which "single-state" argues against. Net about +70-90 lines.

###### C. PageWindow in Read-Only Mode (Rejected)

Tabs, `windowsFile` persistence, the warm cache, the Active Tab Cache, promote, and rename (`windowSlice.ts:129-136`, `WindowTabBody.tsx:137-161`) would each need an archive guard. That's the opposite of uncached and unremembered.

**Naming:** avoid "Preview". `PageWindow`'s aria label is already "Page Preview" (`PageWindow.tsx:97`), and the **Preview** row and **Open In Preview** setting both target the PageWindow (InterfacePM). I'd keep the file `PageHistoryWindow.tsx` only under B. Under A, rename it **`PageReaderWindow.tsx`** with slot `reader`, keeping "File History" and "Archive" as its two aria labels and its user-facing names.

**SidePane:** out of core scope (the decision log's *§Prospects · Read-Only Properties in the Reader Window*). Showing properties read-only needs a new `PropertyPanel` mode, about +20-30 lines touching `writer`, add rows, and menus.

###### Archive History Timeframe

###### A. One Sweep, Two Cutoffs, IDs From What Reach-In Enumerates (Recommended)

- **Key:** `archiveHistoryDays: stepped(HISTORY_DAYS)`.
- **Meaning:** the scout proposed `min(historyDays, archiveHistoryDays)` with 90 as the default; set aside by J-1, under which the archive timeframe follows History Timeframe until a step is picked and a picked step switches down when History Timeframe is shortened below it.
- **Row Placement:** an "Archive History Timeframe" `zoom` row with `unit: DAYS` sits directly under History Timeframe in **File History** (`frames.ts:615-620`), since it's a File History parameter. Trash & Archive gains only Confirm Before Archiving (I-2).
- **Store:** `sweepSnapshots(liveCutoffMs, archived: { ids: readonly string[]; cutoffMs: number })` → `DELETE FROM snapshots WHERE ts < ? OR (ts < ? AND page_id IN (SELECT value FROM json_each(?)))`. One statement, one sweep; captures stay on the live cutoff. JSON1 is already relied on by the store (`json_extract` / `json_type` in `Desktop/Store/stores.ts:49`).
- **No Index Yet:** when the ID query answers null (first open, a reseed, or a store that failed to open, per `contentIndex.ts:1`, `:44-62`), the sweep runs on the live cutoff alone for that pass. Since archived pages never keep more history than live ones, that deletes nothing it shouldn't; archived rows are kept until the next sweep.
- **Where IDs come from:** archived-ness is **location**. The sweep asks for the IDs under the archive path prefix(es), the same enumeration Reach-In needs anyway. If archived pages are indexed (which C-1 needs, see *§Findings › Corpus Conflict*), `readIndexedStats(prefix)` already answers path to id for a prefix (`Desktop/Store/stores.ts:180-187`), so no new query is needed. A path prefix covers **pages at any depth inside an archived Set** with no extra work. Nothing is stored in `versions.db`, so a page archived or restored on another device is read correctly on the next sweep, with no drift.
- **Timing:** the open-time sweep moves from before the tree read (`Nexus/handlers.ts:86`) to after the index seed marks ready. Sweeping isn't urgent. The settings trigger becomes `historyDays || archiveHistoryDays` (`Settings/handlers.ts:46`).
- **Restore:** the page keeps whatever survived, and the live timeframe applies again from the next sweep. Nothing to repair. Its shortened history is the user's choice and reads that way.
- **Hub:** nothing. The hub is content-blind and its retention is a recovery horizon, not File History, so it stays on the live timeframe. F-013 is unrelated debt in the same plumbing; fix it there if the plan touches `info`.
- **Cost:** +1 key, +1 settings row, about +4 store, about +6 sweep, and a reordered trigger.

###### B. Trim at Archive Time, No Recurring Archive Cutoff

Since an archived page gains no snapshots, delete its rows older than the archive cutoff once, when it's archived, and let the live sweep handle the rest.

- **Upside:** no ID enumeration in the sweep.
- **Downside:** it's wrong over time (a page archived yesterday with a 7-day cutoff keeps a 6-day-old snapshot until the live cutoff, possibly 90 days), it's wrong for a Set's pages unless the archive op lists them, and it's wrong for a page archived on another device. It doesn't match "a timeframe".

###### C. A Class Column in `versions.db`

Mark rows or pages as archived at archive time and sweep per class.

- **Downside:** device-local state that drifts from the files (sync arrivals, outside moves, Set archives), and a second source of truth. Rejected.

---

##### What Becomes False

- `.claude/Features/InterfacePM.md:58`: "Seven windows mount it… the Page History window" (the name and the description change under A; the count holds). The Confirmation & Notifications paragraph, "Deletion is the first act to use both", gains archiving and the renamed spend.
- `.claude/Features/CorePM.md:118`: "Rows older than the History Timeframe are deleted at open" (two cutoffs, run after the seed). `:120` (names the window file). `:158` (the retention row).
- `.claude/Features/ConfigurationPM.md:111-117` (the Deletion heading becomes Trash & Archive, plus the new row) and `:124` (History Timeframe gains its archive sibling).
- `Core/Interface/Confirm/confirmations.ts:28` and `:42` comments ("Confirm Before Deletion switch", "A bundle restored or deleted…"), plus the `personalization.ts:192` comment.
- Tests: `Core/Session/windowSlice.test.ts:21-45` and `Core/Session/devicePrefsSeed.test.tsx:227`, `:242` (`historyTarget`); `Core/Pages/fileHistory.test.ts:365-385` and the `sweepSnapshots` tests in `Desktop/Store/versionsDb.test.ts` (signature); `Core/Interface/Confirm/confirmations.test.ts` and `TrashFrame.test.tsx` wherever `spendBundle` is named.
- CSS selectors `.page-history-page` / `.page-history-row` (`page-window.css:27-36`, `markdown-pm.css:72`) under A's rename.

---

##### Risks & Questions

1. **Sets and the Confirmation:** **Settled By:** I-2; Confirm Before Archiving governs pages and Sets alike, since archiving is undoable and removes nothing.
2. **Wording:** a single archive mirrors delete's copy, `Archive “Ideas”?` and the notice `Archived “Ideas”` with Undo and no segment, and batches follow the Trash frame's `countPhrase` and `askEmptyTrash`. **Planner's Call:** Open Item 2.
3. **The Lock Glyph:** **Settled By:** H-1; a static glyph in the leading slot meaning read-only, one meaning shared with File History and the planned Page Lock (`PageMenu.tsx:32`). Whether the reader window offers Restore is the plan's.
4. **SidePane:** out of core scope (the decision log's *§Prospects · Read-Only Properties in the Reader Window*).
5. **The Archive's Location vs. the Corpus:** **Settled By:** B-1 and B-2; the corpus admits `.nexus/archive/` on purpose, which is the archive history's id source too.
6. **Size Memory:** whether the reader window's Archive branch shares History's remembered size (one window id). **Planner's Call.**
7. **A Stale Body:** a Reach-In cascade can rewrite an archived file while the reader window shows it, and an uncached window shows the older text until reopened. **Planner's Call:** whether the Archive's change signal re-reads it.
8. **Range:** **Settled By:** J-1; History Timeframe's steps, following History Timeframe until a step is picked, longer steps dimmed and unpickable, and a picked step switched down when History Timeframe is shortened below it.
