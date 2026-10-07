**Re-grounded:** 10-07-2026 at `32d3fa62c`

### B — Cascades, Walks & Indexing

This slice covers what happens to a frontmatter string when pages rename, headings rename, pages are deleted or restored, properties rename, and the content index seeds. Each path is traced for how it chooses its files, whether it knows a key's type, and what shape its write takes, followed by what a `text` definition would meet on that path.

#### Task 1: Does the Cascade Know the Type?

##### Registry Sources by Path

| Path | Registry Read | Filter It Applies | Where |
| --- | --- | --- | --- |
| Title and heading rename | `readKeptRegistry(root)` from disk | Key name only: `registered()` keeps every registered key, of any type | `Core/Nexus/cascade.ts:192-195` |
| Rename's cache arm | same | Link ids only | `cascade.ts:228-230` |
| Delete strip | `linkDefs(root)` from disk | `type === 'link'` | `cascade.ts:93`, `Core/Properties/propertiesRegistry.ts:71-72` |
| Restore refill | `linkDefs(root)` | `type === 'link'` | `Core/Trash/spend.ts:257` |
| Restore scrub | the held tree's `config.registry` | `type === 'link'` | `Core/Trash/restoreScrub.ts:35` |

The registry is in hand on every cascade path. The rename cascade already builds `names = byFoldedName(defs)` (`cascade.ts:193`), so the definition, and with it the type, of any frontmatter key is one `names.get(foldKey(k))` away; today the cascade uses it only to drop unregistered keys (`cascade.ts:194-195`). `heldTreeOf(root)` (`Core/Nexus/liveTree.ts:70-71`) supplies the Space arm and the cache arm's Collection list (`cascade.ts:217-230`), and is null when no tree is held, in which case neither arm runs.

##### How Files Are Chosen

| Change | Target Set | Fallback When the Index Isn't Ready | Where |
| --- | --- | --- | --- |
| Page title | `queryMentions(titleKey)`: every path with a non-`space` relation row whose target is the title, any qualifier | the whole corpus, `nexusCorpus(root)` | `cascade.ts:172-174`, `Desktop/Store/stores.ts:99-105` |
| Heading | `queryHeadingMentions(titleKey, heading)` | none: `?? []` | `cascade.ts:175`, `stores.ts:106-113` |
| Heading seen in an outside edit | the same, gated first on `queryHeadingMentions`, `spacesLinkHeading`, or `tilesLinkHeading` answering | none | `Core/Nexus/fileEvents.ts:296-307` |
| Delete | `queryMentions` per gone title | the whole corpus | `cascade.ts:95-98` |
| Spaces (all four) | every sidecar on disk, planned only when a held Space's values answer the rewrite | none: no tree, no arm | `cascade.ts:53-56`, `Core/Properties/governedSweep.ts:86-107` |

Every relation row a rename or delete selects on comes from two producers: `linksIn` over the body and `frontmatterMentions` over whole values (`Core/Index/indexSeed.ts:61-67`); the third, `spaceRelations`, writes the `space` rows those queries exclude (`indexSeed.ts:68`, `Desktop/Store/stores.ts:102`). A link inside a sentence in a frontmatter string produces neither, so with a ready index a page whose only mention of the renamed title sits in such a sentence is absent from `rels` and is never opened. With no ready index the corpus fallback opens it, and `text()` (`cascade.ts:204-216`) still applies only `rewriteFrontmatterConnections`, which reads whole values (`Core/Connections/rewrite.ts:123-130`). A heading rename never reaches it under either condition. The cascade reaching the file therefore depends on the index recording the link first.

##### The Whole-Value Asymmetry

Because `registered()` filters by key and not by type, a registered non-Link string whose value is exactly one connection is already treated as a Link on rename. `frontmatterMentions` indexes it (`Core/Connections/scan.ts:112-125`, no registry), `queryMentions` returns its page, and `rewriteFrontmatterConnections` patches it (`cascade.ts:204-210`). The delete strip skips it, since `named()` requires a Link definition (`cascade.ts:104-108`), and the cache arm skips its cached copy (`cascade.ts:228`). No current type reaches this case in practice: Select encodes as a one-element array (`Core/Properties/propertyValue.ts:153-154`), Multi-Select and File as arrays, and `frontmatterMentions` and `rewriteFrontmatterConnections` both skip non-strings (`scan.ts:117`, `rewrite.ts:124`). A Text value of exactly `[[Page]]` would be the first non-Link value on this path: renamed with its target, kept when its target is deleted.

##### Patch Shape and the Small-Body Route

- **Primitive:** `rewrite(body, own)` at `cascade.ts:179-191` is a pure string-to-string function over `rewriteConnections` or `rewriteHeadingConnections`, each building its own `codeMask` over the string it receives (`rewrite.ts:34`, `:79`). A Text value passes through it as a small body unchanged in form. `own` is `titleFromPath(file)` for the body (`cascade.ts:212`), which a value on the same page would share, so a value's bare `[[#Heading]]` names its own page.
- **Outline:** A `§` run is rewritten only when an outline is given, and the cascade builds it from the renamed page's own body (`cascade.ts:188-190`). A value run through the same call with the value as `body` would build its outline from the value; the page's body outline would have to be passed instead.
- **Patch type:** `rewriteFrontmatterConnections` answers `Record<string, string>` (`rewrite.ts:118`), and the sweep's `mergeFrontmatter(content, patch, keys, next)` takes `Record<string, unknown>` (`Core/Files/pageFile.ts:122-127`). A rewritten Text value is still one string, so the existing patch shape carries it without change; what differs is the per-key choice of whole-value patch versus small-body rewrite, which only the definition's type can make.
- **Space arm:** `spaceMoved` runs the same `moved(registered(raw))` over a sidecar root (`cascade.ts:196-203`), and `spaceArm` decides whether to plan it by calling that rewrite over each held Space's `values` (`cascade.ts:53-56`). A Text arm inside `moved` would reach both the gate and the write. `spaceNodeFrom` keeps every non-modeled, non-Context key raw in `values` (`Core/Contexts/spaceSidecar.ts:65-86`), so the held tree already carries a Space's Text values. `spacesLinkHeading` reads whole values only (`cascade.ts:58-73`).
- **Cache arm:** `editCaches` reaches only Collections caching a Link id (`cascade.ts:228-230`, `Core/Properties/propertyCache.ts:52-67`).

#### Task 2: The Index Side

- **What `add` stores:** a `Relation` of `kind`, `target`, `qualifier`, and `count`, tallied per distinct triple (`indexSeed.ts:55-60`, `Core/Platform/stores.ts:12-17`). The `relations` table has no offset column (`Desktop/Store/ddl.ts:18-26`). The hit's `at` is read once, to decide the `citation` overlay against the body's footnote line (`indexSeed.ts:63`). The `Relation` doc states that `count` is always 1 for `frontmatter`, since `frontmatterMentions` yields each target and qualifier once (`stores.ts:11`, `scan.ts:115-124`).
- **Consumers of `frontmatter` rows:**

| Consumer | Reads | Where |
| --- | --- | --- |
| Rename and delete target selection | `queryMentions`, `queryHeadingMentions` (every kind but `space`) | `cascade.ts:95`, `:174-175` |
| Outside-edit heading cascade gate | `queryHeadingMentions` | `fileEvents.ts:298` |
| Matrix | `readPageRelations` (`body`, `citation`, `frontmatter`), drawn as one link per path, kind, and target, weighted per kind | `Core/Matrix/matrixGraph.ts:19-38`, `stores.ts:132-139`, `Core/Matrix/Engine/forces.ts:7-24` |
| Backlinks | the surface doesn't exist | `.claude/Features/ConnectionsPM.md:77` |

- **`linksIn` over a value:** `linksIn(body, ownTitle, outline, inCode)` accepts any string and builds `codeMask(body)` itself when no mask is passed (`scan.ts:70-78`). The seed passes the body's `scanDoc` mask (`indexSeed.ts:61`); a value pass would be a separate call without it. The `citation` check (`indexSeed.ts:63`) and the outline (`indexSeed.ts:51-52`) are body-bound.
- **Kind and count:** A sentence link landing as `frontmatter` would carry counts above 1, which the `Relation` doc rules out, and would weigh in the Matrix as a frontmatter link (`forces.ts:10`, `:20`); landing as `body` would merge with the body's tally under the same primary key (`ddl.ts:24`).
- **Values:** `entry.values` is the page's whole parsed frontmatter, every key, registered or not (`indexSeed.ts:47`, `:70`), written as one JSON-encoded row per key in `page_values` (`stores.ts:71-72`, `ddl.ts:33-40`). A later reader can scan it through `readPageRelations` (`stores.ts:144-154`); `queryKeyHolders` answers by folded key (`stores.ts:157-163`); no query reads inside a value.
- **Registry:** The seed takes no definitions. `extractPageIndex(rel, content)` has no registry parameter (`indexSeed.ts:46`), and `spaceRelations` counts unregistered `<Title>` keys deliberately (`indexSeed.ts:73-86`). Re-indexing is driven by a file's mtime and size (`indexSeed.ts:217-225`), and `INDEX_GENERATION` is the only wholesale reset (`ddl.ts:3`, `:80-91`). A type-gated value scan would leave rows reflecting the old type after a property changes type until each page is rewritten or the generation is bumped.
- **Space values:** Space sidecars aren't indexed; every Space arm reads the held tree (`cascade.ts:52-73`).

#### Task 3: Deletion and Restore

##### What Each Step Reads

| Step | Unit It Acts On | Where |
| --- | --- | --- |
| Strip on delete | whole keys, through `stripKeys` on keys whose Link value names a gone title | `cascade.ts:99-113`, `Core/Files/heldKeys.ts:78-81` |
| Record | one `StrippedLink` per key: `{ page, property, value }`, the value whole | `cascade.ts:41-45`, `:137-144` |
| Write to the bundle | `record.links` | `Core/Trash/delete.ts:97-103` |
| Park a dropped value with a trashed page | `parseConnectionText(link.value)`, which matches whole values only | `Core/Trash/holdings.ts:84-95`, `Core/Connections/connections.ts:74-87` |
| Restore under a landed title | `rewriteFrontmatterConnections(values, was, { title: landed })`, whole-value | `spend.ts:263-265` |
| Refill | `refillValues` → `reconcilePropertyValue` with `frozen`, which special-cases only `link` and `multiSelect` | `Core/Properties/assignment.ts:49-67`, `propertyValue.ts:127-138` |
| Scrub the returning artifact | `namesGonePage` on Link keys, whole-value | `restoreScrub.ts:38-39`, `propertyValue.ts:121-124` |

##### Two Treatments of a Text Value Holding a Link

| | Text as a Small Body | Text as a Whole Value |
| --- | --- | --- |
| Delete | Nothing stripped; the link stays in the sentence and reads unresolved, as a body's does (`cascade.ts:81`) | `stripKeys` removes the key, so the whole text goes with the one link it held |
| Record | Nothing recorded | `StrippedLink.value` holds the whole text |
| Park | Nothing to park | `parseConnectionText` matches only a value that is exactly one connection, so a value holding any other text is never parked with the trashed page and is lost once the delete's own bundle is spent |
| Restore | Nothing to return; the sentence still names the title, so it resolves again when the page returns under the same title | The refill loop reads only Link definitions (`spend.ts:257-261`), so a recorded Text value returns only if that loop takes Text too; `refillValues` would then land it whole, since `frozen` filters only Link and Multi-Select kinds (`propertyValue.ts:133-137`) |
| Restore under a new title | The sentence keeps the old title, as bodies do; `spend.ts:264` reaches only recorded values | Whole-value rewrite misses a sentence |

With today's code and a `text` definition added to the type table, the delete strip, the record, and the scrub all filter to Link definitions, so a Text value takes the small-body column by default: kept, unrecorded, unparked. A Text value of exactly `[[Page]]` takes the same column on delete while taking the Link treatment on rename (Task 1).

#### Task 4: Property Rename, Repair, and Reconcile

- **Type table:** `PROPERTY_TYPES` has no `text` entry (`Core/Properties/properties.ts:33-45`). `holdsList` (`properties.ts:64-67`), `decodeValue` (`propertyValue.ts:71`), and `encodeValue`, whose switch is exhaustive (`propertyValue.ts:151-171`), all read it, as does `isBlankValue` (`propertyValue.ts:178-195`). Every keying path in this slice routes through them, so the entry and its value kind are the prerequisite for everything below.
- **Rename sweep:** `renameSweep` takes its files from `keyHolderFiles(oldName)` (registry-blind, by folded key) and calls `renameFrontmatterKey(content, oldName, newName, 'prefer-new', holdsList(def))` (`Core/Properties/registryProperty.ts:82-98`, `Core/Properties/keyHolders.ts:14-20`). For a non-list type with no rival, the moved value equals the held one, so the node isn't rewritten and its YAML scalar style survives byte-for-byte (`pageFile.ts:161-165`). Other spellings of the old key are dropped with their values, as for every scalar (`pageFile.ts:152`, `:164`). Sidecars take the `rekeyHeld` twin (`heldKeys.ts:92-107`).
- **`reconcileGovernedRoot`:** A Text key reads one spelling (`Core/Contexts/contextResolve.ts:128-129`). When the raw decodes to nothing, a live reconcile keeps it as written (`contextResolve.ts:142-146`) and a frozen one, the restore scrub, retires the key (`contextResolve.ts:147-151`). A foreign array or number under a Text key therefore survives Repair On Open and is removed by a restore, assuming a string-only decode like Link's (`propertyValue.ts:77-79`). If the decode coerces scalars to strings instead, `writtenSpelling` passes a string through unchanged (`propertyValue.ts:141-143`), the JSON comparison sees `42` against `"42"` as changed (`contextResolve.ts:155`), and the repair sweep (`Core/Properties/repairSweep.ts:37-41`) rewrites every such value as a quoted string across every page the seed re-read.
- **Remove, cache, re-assign:** Remove caches `heldPropertyValue` raw per page id (`Core/Properties/removeProperty.ts:36-50`, `keyHolders.ts:66`), and re-assign refills through `reconcilePropertyValue` with `frozen`, which passes every kind but Link and Multi-Select through (`assignment.ts:91-97`, `propertyValue.ts:133-137`). Cached Text values aren't rewritten by a page rename (`cascade.ts:228`).
- **Length and line assumptions:** None found in this slice. The writer serializes with `lineWidth: 0` (`pageFile.ts:60`), so long values aren't folded, and a multi-line value set over an existing folded node keeps that node's block style with its value intact (verified against the repo's `yaml`). `changedKeys` compares by `JSON.stringify` (`governedSweep.ts:43-46`), so a no-op reconcile writes nothing. `memberCount` reads a string as one member (`contextResolve.ts:110`). `isBlankRaw` treats `''` as blank and whitespace as filled (`propertyValue.ts:175-176`).

#### Task 5: Walks and Keying

`watchPatch` and `valuesChanged` don't exist in `Core` or `Desktop`. The equivalent paths treat frontmatter opaquely:

| Path | What It Reads | Where |
| --- | --- | --- |
| Walk | Context keys only, into `PageNode.contextValues`; the rest of a page's frontmatter stays off the tree | `Core/Nexus/readNexus.ts:77-85`, `:150`, `Core/Nexus/tree.ts:27-30` |
| Space walk | every non-modeled key raw in `SpaceNode.values` | `spaceSidecar.ts:65-86`, `tree.ts:32-37` |
| Tree patch | switches on `node.kind` (page, set, collection, space), never on a value | `Core/Nexus/treePatch.ts:29`, `:217-259` |
| Tree delta | replaces non-object values whole | `Core/Nexus/treeDelta.ts:1` |
| Value push | `values:changed` carries page ids and a body-only flag | `Core/Nexus/settle.ts:80-95`, `:153-154` |
| Held-option registration | Multi-Select definitions only | `Core/Properties/optionOps.ts:113-115` |
| Spelling joins | `holdsList` splits list from scalar; Text falls in the scalar bucket | `heldKeys.ts:15-26`, `contextResolve.ts:102` |

No walk, patch, or index path consults the type table: `PROPERTY_TYPES`, `decodeValue`, and `holdsList` don't appear in `Core/Nexus` or `Core/Index` outside `Core/Nexus/configReach.ts:117`, which decides whether a filter rule's operand is a whole value or a substring when an option renames.

#### Tensions

| # | Tension | Verdict | Evidence |
| --- | --- | --- | --- |
| 3 | Cascade | **Confirmed**, at two layers. The index records no row for a sentence link, so a ready index never selects the file; the frontmatter patch reads whole values even when the corpus fallback opens it; heading renames have no fallback. A Text value of exactly one connection is the exception, already renamed but not stripped. | `indexSeed.ts:61-67`, `cascade.ts:172-175`, `:194-216`, `:104-108` |
| 5 | Single vs. multi-line | **No obstacle in storage or sweeps.** Writes don't fold long lines and keep a node's block style; nothing in this slice assumes one line. | `pageFile.ts:60`, `:161-165`, `governedSweep.ts:43-46` |
| 8 | Non-string adoption | **Conditional on the decode arm.** String-only: a foreign number or array survives repair and is dropped on restore. Coercing: repair rewrites every such value as a quoted string. | `contextResolve.ts:142-151`, `:155`, `repairSweep.ts:37-41` |
| 9 | Foreign recognition | **Touched.** A hand-typed unquoted value beginning `[[Page]] ...` is a YAML error, and the sweep leaves that file untouched; an unquoted `[[Page]]` alone parses as a nested array, which `frontmatterMentions` and a string-only decode both skip. Pommora's own writer quotes both. | `pageFile.ts:194-199`, `governedSweep.ts:74-77`, `scan.ts:117`, verified against the repo's `yaml` |
| 2 | Filters | **Touched.** The Matrix filter tests key presence only; an option rename's filter edit treats substring operands by type. | `Core/Matrix/matrixInput.ts:85`, `configReach.ts:117` |
| 1, 4, 6, 7 | Sort, validation, table glyph, native menu | **Can't speak.** Outside this slice. | |

#### Questions for Nathan

- **Should a link inside a Text value behave like a body link or like a Link value?** Bodies keep a deleted page's links and read them as unresolved; Link values are stripped whole and can be restored (`cascade.ts:81`, `spend.ts:252-273`). Stripping a Text value whole removes the surrounding text with the link, and the restore path only re-parks values that are a single link (`holdings.ts:88-90`), so a sentence would come back only through its own delete's bundle. Today's delete, record, and scrub paths already give a Text value the body treatment, since each filters to Link definitions (`cascade.ts:104-108`, `restoreScrub.ts:35`).
- **Should a page rename reach a link written inside a Text value?** Today it doesn't (Task 1). Reaching it means the content index has to record links found inside frontmatter strings, which also puts them in the Matrix as connections (`matrixGraph.ts:19-38`).
- **Should a Text value of exactly `[[Page]]` be a connection at all, or just text?** Today's rename cascade would rename it while the delete leaves it, since the rename filters by key and the delete by type (`cascade.ts:194-195`, `:104-108`).
- **What should a number or a list typed by hand under a Text key become?** Leaving it as written means a restore drops it; reading it as text means Repair On Open rewrites it as quoted text (Task 4).

#### Missing

- No relation row, offset, or index query records a link inside a frontmatter string; `frontmatterMentions` is whole-value only (`scan.ts:111-125`).
- No cascade path rewrites inside a frontmatter value; `rewriteFrontmatterConnections` patches whole values only (`rewrite.ts:113-132`).
- No corpus fallback for heading renames (`cascade.ts:175`, `fileEvents.ts:298-304`).
- The content index seed holds no registry and no type (`indexSeed.ts:46-71`).
- No `text` entry in `PROPERTY_TYPES`, no `text` value kind in `propertyValue`, and no `text` arm in `decodeValue`, `encodeValue`, or `isBlankValue` (`properties.ts:33-45`, `propertyValue.ts:15-28`, `:69-105`, `:151-195`).
- No `watchPatch` or `valuesChanged` in the codebase.
- No Backlinks surface (`ConnectionsPM.md:77`).
