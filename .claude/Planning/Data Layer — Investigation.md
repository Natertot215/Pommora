## Data Layer Investigation

**Written:** 09-27-2026 · **Code Read At:** `132a2f111`, with *§The Catalogue*'s deltas, *§The Number*, and the later *§Reconciled Disagreements* rows re-grounded at `d7d00240d` (09-30-2026) · **Evidence:** the eight slice reports and orchestrator notes in *Data Layer — Investigation Reports*, re-checked against the code wherever two reports disagreed

This document explains what Pommora's Nexus and data layer is for, where the code does that job once and where it does it several times over, which areas a redesign would target and which it would leave alone, and what the honest outcome is in errors, complexity, integrity, and lines. It is an investigation and a catalogue, not a plan. It covers about 14,100 production lines; the folders are listed under *§Sources*. Decisions taken since it was written are recorded in *Data Layer — Decision Log*.

---

### The Explanation

#### What the Layer Is For

A Nexus is a folder of ordinary files. Pages are Markdown files, and everything else (Contexts, Spaces, settings, the property list, and the small settings file each folder carries) is JSON. Every page and folder carries an ID, a permanent code written into its file so the app can recognize it after a rename or move. The files are the real thing, and everything Pommora shows is read from them.

To show the Nexus quickly, Pommora keeps a picture of it in memory, and it keeps that picture in two places. The **host** is the half of the app allowed to touch files, and it holds one picture. The **window** is the half that draws the interface, and it holds a second picture sent over from the host. Around those two sit several smaller copies of the same facts: a search index on disk that answers questions like "which pages link here" and "which pages carry this property," a cache of files already read, and a copy of the settings.

Three things change the files: the app itself, outside tools such as Obsidian, Finder, or a text editor, and Sync bringing in another device's changes. Only the app's own changes come with a description of what changed. For an outside edit, the app learns only that a file changed.

The whole job of this layer is keeping the files, the two pictures, and the smaller copies in step, whichever of those three made the change, without losing a user's data.

#### Where the Job Is Done Well and Where It's Done Several Times Over

Writing files is done well, and done once. Every write replaces a whole file at once, so a crash leaves either the old file or the new one; two writers to the same file take turns; a file the app couldn't read is refused rather than overwritten with a guess; and the app recognizes its own writes when they come back as "this file changed." Every slice of the investigation, including the one argued from the audit's side, found this part sound, and a redesign keeps it.

Getting a change from a file into every copy is where the work is done several times over. No single message says "this changed." Each kind of change is instead wired by hand to each copy it has to reach:

- After the app writes a file, the host often reads that same file back from disk to learn what it just wrote, even when the code that wrote it had the answer in hand.
- The host and the window each keep their own table of how a request changes the picture.
- The code keeps two notebooks of recent writes so that later steps can tell the window about them.
- Every change, down to one setting toggle, sends the whole picture to the window again. The window compares all of it against its old copy to work out what moved, and rebuilds every index it uses to find things quickly.
- Pages are read by three different pieces of code with three different rules for identifying a page, Spaces by three, and folder settings files by two.
- Besides the main entry point for changes, 40 other entry points write Nexus files, and the host confirms a write in four different ways, with a fifth in the window.

The wiring has gaps where a change reaches some copies and not others. *§The Catalogue* lists them.

#### The Answer to the Hunch

Nathan's hunch was that this layer is a pile of separately built mechanisms layered on June scaffolding, that a rebuild around one core law would be smaller and simpler and would end the stream of audit findings, and that it would net −2,000 to −5,000 production lines. The goal behind it is fewer errors and less complexity without any loss of integrity; the line count is a measure of that, not the aim. The audit's verdict, written about its five most severe findings, was that "the surrounding structure is sound," the fixes are contained, and none need a redesign. The evidence splits between them.

- **The Hunch Is Right About the Shape:** The layer grew by addition. June built the full re-read of the folder and the way files are written; July added three speed-ups to make re-reading cheap; August added a second way of updating the picture piece by piece, beside the full re-read, which stayed on as the backup, with a table of changes on each side and the search index; September added side channels and more sweeps. Nothing was retired along the way. Most of the audit's findings in this layer are symptoms of one missing piece: a description of each change that every copy can apply.
- **The Hunch Is Right About Errors and Complexity:** Consolidating how changes spread closes most of the open audit findings about the picture, opening a Nexus, and watching for outside edits, and most of the gaps the reports added. It turns three page readers into one, five ways of confirming a write into two, and 41 write entry points into about 11, while every safety property the layer holds today survives. One safety net changes form: today, resending the whole picture quietly repairs any mistake in the window's copy, and a version check takes over that job.
- **The Hunch Is Wrong About the Cause and the Size:** The June scaffolding, meaning the full re-read, the folders-inside-folders shape of the picture, and the way files are written, is the part that holds up. The drift came from mechanisms built beside each other later, and from where code sat: the host couldn't load the window's index, so it built its own. The honest line outcome is about −1,100 to −2,300 production lines, or −950 to −2,150 with the folders-inside-folders picture kept, and sharing machinery between Contexts and Properties adds −150 to −300. Anything past about −2,600 would come from changing what the app does or deleting safety machinery, and neither is on the table.
- **The Audit Is Right About the Foundations:** How files are written, the locking, the way the app recognizes its own writes, the one-at-a-time re-read, and the caches are sound.
- **The Audit Is Wrong That Nothing Needs a Redesign:** Summed over every remaining finding in this layer, its fixes net about −33 lines. The few duplicates they remove (one table of changes, one list of everything in the Nexus, one way to find a folder's owner) are offset by what other fixes add, and the duplicate readers, notebooks, and entry points stay. Its own proposed steps (one record list, sending changes instead of the whole picture, and indexing from the text a writer already holds) are the start of the consolidation, and they stop short of it.

"Rebuild or fix" is therefore a false choice. The real decision is between consolidating how changes spread as one design, staged through steps the audit already proposes, and continuing to patch findings one at a time.

#### What Changes and What Stays

A regression in this layer is born when one fact kept in several places is updated in some of them and not the others. Every change below removes a place where that can happen.

**What Stays As It Is:**

- How files are written: whole-file replacement, one writer per file at a time, and refusal to overwrite what couldn't be read.
- How the app recognizes its own writes when they come back as "this file changed."
- The full re-read as the backup, with only one running at a time and an out-of-date one thrown away. It starts reporting what changed instead of replacing the picture wholesale.
- The cache that lets the app skip re-reading files that haven't changed.
- The file formats on disk, which a locked product decision keeps readable outside the app.
- What Contexts and Properties mean: property types and options, the rename and delete sweeps that rewrite every file holding a name, the crash-recovery notes, and the rules that tidy a page's tags. Writing a property value still reads that property's definition from disk at the moment it writes, and tidying a page's tags when you edit it still never removes a tag it can't match to a Space.
- Everything the window keeps about navigation, tabs, floating windows, editing, and tiles (about 3,600 lines), the part of the desktop app that talks to macOS, the path safety rules, and the local databases.
- How Sync sends files, one file at a time.

**What Changes:**

- **Writers Report What They Changed:** Every write produces one change description in one shared form (added, removed, moved, or a setting changed), and every copy applies it. This retires the read-backs after writing, the two notebooks of recent writes, and the two separate tables of how a request changes the picture.
- **Settings Leave the Top of the Picture:** Settings, image crops, page metadata, and ordering stop riding at the top of the same picture as pages and folders, so one setting toggle stops rebuilding every index in both halves of the app.
- **One Reader Per Kind of File:** Pages go from three readers to one, Spaces from three to one, and folder settings files from two to one. Opening a Nexus, outside edits, the app's own confirmations, and the search index all read through the same one.
- **One Entry Point and One Confirmation:** The side entry points fold into the main one wherever nothing structural keeps them apart, and the four confirmation styles in the host become one. Tiles keep confirming by their own reply.
- **The Window Receives Changes:** Sending the whole picture remains only for opening a Nexus, Reload, and the backup re-read.
- **Restore Reuses Create and Move:** The Trash's delete and restore use the same move that create and move use, which also tells Sync a folder was renamed rather than deleted and uploaded again.
- **One Lookup for Contexts:** The seven separate ways the code works out which Spaces each Context has, and the eleven places that re-read Space files from disk, become one lookup kept up to date.
- **Agreement Is Checked:** A kind of change the shared update step doesn't handle stops the app from building, and a test compares the picture after every write the tests perform against a fresh read of the files. A writer no test exercises can still disagree, so the tests have to cover every writer.

Two of these changes make parts of the app that disagree today agree, and that changes an edge case each: a page whose `ID:` line isn't a Pommora ID, and two files that share one ID. *Data Layer — Decision Log* records how each is handled.

**What Should Not Be Done:**

- Storing the picture by id alone. Two files can share an id, since a Finder copy duplicates it, and a folder without a stamped id gets one computed from its path, so renaming it changes the id. The picture is organized by path, with an id lookup beside it that can answer "two files claim this."
- Deleting safety machinery to reach a line count.
- Changing what the app does to save lines. The reports sized two such changes: letting a delete leave its references behind in other files, which would make a new Context or property created under a deleted name silently pick up every stale reference, and letting saved views drop deleted names only when read, which would bring a restored item's view filters back. Both are regressions and are excluded.
- Changing the file formats.
- Folding a rework of how Sync sends files into this work.

---

### Root Causes

The audit's findings in this layer, and most of what the reports added, trace to five places where regressions are born.

1. **Writers don't report what they changed.** Strict read-modify-write already returns the exact record it wrote, and the operation wrapper discards it, so the host re-reads disk to confirm, keeps two notebooks of recent writes for later steps, and pins order lists it had dropped. The premise that writers normalize and so must be re-read holds for about seven writers and not for the rest. This cause produces F-187, F-198, F-205, F-206, F-209, F-210, F-603, and the adoption, exclusion-clear, and banner gaps in *§Findings No Audit Entry Carries*.
2. **Settings ride on the picture's root.** Settings, crops, page metadata, homepage, ordering, and the property list sit on the same root object as pages and folders. Every lookup table is cached against that root, so writing one setting builds a new root and discards every table in both halves of the app. With the whole-picture push, it is the mechanism behind F-186's measured cost, the settings findings F-194 and F-195, and the tree-apply race in F-196, and it is fixable without touching how folders nest.
3. **Each consumer reads and derives for itself.** Pages have three readers, Spaces three, and folder settings files two; Context membership is held in four forms; "which Spaces does each Context have" is worked out seven ways; and 40 lookup functions apply three different rules when two entities share an id. Placement contributed: the window's lookup index imports interface files the host can't load, so the host built its own page-id index and baseline projection. This cause produces F-188, F-189, F-197, F-199, F-200, F-201, and F-211.
4. **One pattern is written twice.** Properties and Contexts are the same shape, a Nexus-wide list whose names appear as keys in files so a rename sweeps every holder, and the code implements it twice with opposite commit orders, two journal vocabularies, two replayers at two points of the open, and different holder scopes.
5. **New doors and confirm paths were grown beside the first.** Every side door onto Nexus files, from views on 06-27 onward, was added after `mutate` existed on 06-16, and nothing in the design routes a new door through it. The same holds for confirm paths: four styles in the host and a fifth in the window.

The first three are the propagation problem. The fourth is a product question as much as a code question. The fifth is where structure and process meet (*§Structure or Process*).

---

### The Core Law

**Stated as One Sentence:** Every change to the Nexus, whoever makes it, becomes one change description in one shared form, produced from what was actually written or read; each kind of file has one reader; every copy applies changes through one applier; and configuration sits beside the entity records rather than on their root, holding each setting once.

The candidate law every slice was judged against had more parts than this. The evidence supports some, contests others, and never reached a few, and this synthesis adds two.

**Supported:**

- Writers report the change they made, built from the record the write already returns.
- One applier, shared by host and window.
- Configuration held as its own record, off the entity root, with each setting held once.
- One reader per kind of file, serving the open, the watcher, confirmations, sweeps, and the index.
- One write door and one confirm path for Nexus files, wherever nothing structural keeps a door separate.
- One push vocabulary: the window receives change lists.
- The store keyed by path, with a projection from id to every file that claims it. Slices A and H reached this independently: duplicate ids are real, held state that re-minting and "ambiguous" title resolution both need, and an id computed from a path can't survive a rename.

**Contested:**

- **A flat map keyed by id:** rejected by the evidence above.
- **Retiring the nested tree:** contested by slice H. The measured costs come from the whole-picture push, settings on the root, and root-keyed caches, none of them from nesting; the sidebar draws recursively from the nested shape; and a flat store has to rebuild each folder's ordered child list as a maintained projection, which is the nesting rebuilt in the window. Slice A sized a flat store with a nested projection for the sidebar. Slice H's own estimate puts the storage swap at about −150 lines, range −300 to +100, with the largest test blast radius. The law holds either way.

**Added by This Synthesis:**

- **Records are immutable values.** The parse cache hands the same page object to every walk and to the live tree, and the walk writes into it (F-211). Slices A and C both note immutable records close that by construction.
- **Checked agreement.** No report proposed it. Two pieces make it: an applier exhaustive over the change vocabulary, so an unhandled kind of change stops the build (F-187 proposes the same exhaustiveness for its router), and parity tests that compare the applied state after a write against a fresh walk, of which about twenty exist today (`Core/Nexus/mutatePatch.test.ts`, `watchPatch.test.ts`). The build check covers the vocabulary, not whether a writer emits; the parity tests cover only the writes they drive, and today's registry-adoption gap coexists with them. Checked agreement narrows how a writer ships unwired to "no test drives it," which makes test coverage of every writer part of the design.

**Not Investigated:**

- Agenda's future shape. CorePM settles that Tasks and Events enter the walk as their own top-level branch; no slice checked how that sits in either store shape.
- Tiles as records, which folding the seven tile channels into one door would need.
- Sync's per-file wire protocol, which the law doesn't change.

---

### Structure or Process

The audit attributes recurring drift to process: closeout reviews a change's own diff, not the other home of the fact it touched. The timeline alone fits that reading as well as a structural one, since each side door shipped through a closeout that reviewed its own diff. What separates them is what stops the next regression.

**The Drift Is Structural in the Placement-and-Wiring Sense.** There is no place a write reports what it did, so every new writer, door, and copy has to be wired by hand, and each wiring is a fresh chance to drift. A process fix has to find the fact's other home at every future change; the structural fix removes the other home. The evidence that the process fix doesn't hold on its own is drift after an identical start: the host's and window's routing tables were born arm for arm on 08-17, and slice B lists thirteen disagreements between them today. The one re-checked here is behavioral: the window ranks an entity missing from an order list last (`Core/Nexus/treePatch.ts:374-379`), the host ranks it by title (`Core/Nexus/order.ts:19-26`), and the host re-reads the order file after creates and reorders to pin its own answer (`Core/Nexus/mutatePatch.ts:183-188`). Two twins came from placement rather than design: the host's page-id index, built because the lookup index sat across the process boundary, and the watcher's own confirm, which lived in a separate module for forty days. No twin in the history came from the tree's nesting.

**One Gap Is Procedural.** Four writers note their folder-settings write so the confirm picks it up: the Space writer, the Context cascade, configuration reach, and the governed sweep (`Core/Contexts/contextWrite.ts:172`, `contextCascade.ts:187`, `Core/Nexus/configReach.ts:366`, `Core/Properties/governedSweep.ts:113`). The fourteen call sites of `patchSidecar` confirm through per-operation routes instead. Two conventions for one fact is the audit's mechanism: the note arrived with the Spaces work and wasn't carried to the other writer.

| Date | Commit | What Arrived | How |
|---|---|---|---|
| 06-14 | | The walk and atomic writes | Walking skeleton |
| 06-16 | `f95a120fe` | The `mutate` write path | First door |
| 06-17 | | The watcher, re-walking on any event | Full re-read as the confirm |
| 06-27 | `ac3348c83` | View persistence channels | First side door |
| 06-29 | `22efca8d1` | Schema channels | Side door |
| 07-01 | `edbaad963` | Property delete channel | Side door |
| 07-02 | `8d543a157` | `stabilize` on every push | Speed-up for re-reading |
| 07-05 | `b81d7bb26` | Personalization config channel | Side door |
| 07-06 | `dc7a0ad31` | Parse cache gated on mtime and size | Speed-up for re-reading |
| 07-10 | `e9b1a0226` | Block document channels, later renamed tiles | Side door |
| 07-11 | `409adc80c` | Self-write echo suppression | Speed-up for re-reading |
| 07-21 | `77c6d26fe` | Window optimistic transforms | First copy of the routing table |
| 07-30 | `9f67178ed` | `treeIndex`, window-only | Lookup projection |
| 08-17 | `91029ed3c`, `f2371b76c`, `6073eb85b`, `96c891e07` | Live tree, watcher patches, shared transforms, host confirm table | Incremental layer beside the walk; transforms unified, routing tables born identical |
| 09-01 | `721d42f65` | `values:changed` and the host page-id index | Side channel; twin forced by placement |
| 09-21 | `08327354a` | Space writer notes its sidecar write | Writer-reported change, half-applied |
| 09-24 | `881b664fe` | Echo drop by bytes | Refinement |
| 09-26 | `3de82626a` | Watcher's own confirm folded into `confirmBy` | Twin collapsed |

The fix for the structural part is the law; the fix for the procedural part is the audit's cross-surface twin sweep. Both are needed, and neither substitutes for the other.

---

### The Catalogue

Each area lists what it does today, what the reports found, what the law replaces it with, what that deletes, what it leaves alone, the sized delta, and how far the audit's own fixes reach. Citations are at `132a2f111`.

#### Read Path and Model

**Today:** Opening a Nexus reads configuration, stamps ids into id-less pages and folders, reads the whole Nexus into a nested picture, settles duplicate ids against the last open's record, seeds the search index, and replays crash journals. The picture's root carries entities, settings, crops, page metadata, order lists, the property list, and bookkeeping (`Core/Nexus/tree.ts:88-115`), and each lookup table is cached against that root object (`treeIndex.ts:52`, `valuesChanged.ts:41`, `remintLedger.ts:20`).

**Found:**

- Every launch reads every Collection page in full twice before the window exists: the adoption pass one file at a time (`Core/Nexus/handlers.ts:45` → `adopt.ts:152`), then the walk (`handlers.ts:85` → `remintLedger.ts:119`). A cold index adds a third read over a wider set of files (`handlers.ts:93`).
- Pages have three readers with three identity rules. `readPageRecord` checks admission (`readNexus.ts:122-129`); `readPageDetail`, which serves `page:open` (`Core/Pages/handlers.ts:24`), checks none and takes any string `ID` (`Core/Files/pageFile.ts:168-181`); `extractPageIndex` keys rows by path (`Core/Index/indexSeed.ts:45`). Spaces have three readers and folder settings files two.
- Forty lookup functions apply three duplicate-id rules: first match, last match, and null.
- A settings write builds a new root (`watchPatch.ts:422-437`), and so do homepage, crop, and page-metadata writes (`:458`, `:463`, `:474`), each discarding every per-root lookup table in both processes.
- A page whose `ID:` isn't a Pommora id, such as an Obsidian user's `ID: 42`, is listed unreadable, its parse is never cached (`Core/Files/walkCache.ts:55`), and every outside save of it re-walks the whole Nexus (`watchPatch.ts:143-145`).
- `profileSubtitle` is decoded (`Core/Settings/codec.ts:102`), carried (`readNexus.ts:360`), and patched, and nothing reads it.
- The container schemas in `schemas.ts` (`:50`, `:61`) have no production reader.

**Replacement:** One record store keyed by path, with an id-to-claimants projection, owners, ancestry, and ordered children, filled by one reader per kind of file; records as immutable values; configuration held as its own record; the nested shape kept as the store or as a projection (*§The Core Law*).

**Deletes:** The adoption pass's separate traversal (F-197), the baseline projection and the host's page-id indices as separate walks (F-188), `applyRemints`, the second pass that attaches Context links, the post-re-mint walk (which retires F-210 by construction), and the id finders that walk per call.

**Leaves Alone:** Folder-kind rules, identity, admission, id minting, adoption's folder rules, re-mint writes, migrations, page writers, enumeration, codecs, both registries' decoders, and the parse cache as it is: its 58 lines are all safety logic, the racy window, the forget counter, uncached failures, and eviction by walk generation (`walkCache.ts:3-4, 44-57`).

**Delta:** About −280 (−220 to −340) under the trimmed mandate: the readers, E-6's temporary-ID sites, the kind literals, and the config fields, with the nested store kept.

**Audit Reach:** F-189's single owner lookup landed in `ed0fcaf0a`. F-188 (rewritten per K-2), F-197, F-210, and F-211 land in phases 1 through 4, and F-212's kind table in phase 1, its navigation, icon, and admission lists staying with W16 (C-2). Without this work they leave the per-root cache, three page readers (`readPageDetail`'s missing admission check has no finding), three Space readers, two container builders, and duplicate-id storage unresolved.

#### Write and Confirm

**Today:** 31 operations enter through `mutate` (`Core/Nexus/mutateRequest.ts:60-111`). After a write lands, the host confirms it into its picture in one of six shapes (pure transform, one-file re-read, both, full walk, no change, or a separate helper), and the window applies its own version of the change after the reply.

**Found:**

- Writers discard what they wrote. `rmwJsonStrict` returns the record it wrote (`Core/Files/atomicWrite.ts:103-127`), and `done()` throws it away (`mutateRequest.ts:25`), so confirms re-read disk. About seven of the re-read writers normalize: view writes, registry writes, `setContext` on a page, restore, page metadata, and the two image writes, `setBanner` and `setProfileImage`, which adopt the image and write its new path (`Core/Pages/setBanner.ts:26-30`, `Core/Assets/setProfileImage.ts:12-14`). `setIcon`, `setDisclosureLock`, `setHeadingIconHidden`, `setCrop`, and `setProfileIcon` store the request's own value.
- Order lists are dropped from the picture after sorting, and the ranking rules disagree, so creates and reorders re-read the parent's order to pin the result (`mutatePatch.ts:169-188`).
- Two module-level notebooks carry what the picture can't: a value-write ledger and a folder-settings-write ledger (`Core/Nexus/valuesChanged.ts:10-33`). The second is flushed by every confirm, the watcher's included (`mutatePatch.ts:224-229`).
- The window keeps its own switch over the same operations (`Core/Session/nexusSlice.ts:264-307`) and applies it after the host has already confirmed, so every patched mutation runs the window's full apply twice. F-187 cites two disagreements between the tables: the `reorderTop` fallback is unreachable, since `reorderChildrenInTree(tree, '', …)` never returns null (`treePatch.ts:500`), and the field-op split is live as a difference in mechanism, the window transforming (`nexusSlice.ts:282-298`) where the host re-reads (`mutatePatch.ts:125-135`).
- An option adopted into the property list by `setProperty`, `setContext`, or a seeded create (`Core/Properties/optionOps.ts:83-111` → `propertiesRegistry.ts:78`) reaches no copy until the next walk, since those operations confirm as no-change or by re-reading the page (`mutatePatch.ts:48-53, 137, 169-173`).
- `exclusions:clear` notes value writes it never flushes (`Core/Settings/handlers.ts:39-42`), and a page-banner re-read can't carry the banner, since page nodes have no banner field (`tree.ts:29-32`).
- Single-entity changes confirm by walking the whole Nexus: a Space or Context delete (`mutatePatch.ts:122`), a Context's icon (`:127`), every restore but a page's (`:149-151`), and renames or moves over adopted ids (`:156-161`).

**Replacement:** Writers return the change they made; one applier shared by host and window; order lists held in the model under one ranking rule; the reply carries the change list, which makes reply and confirmation one message.

**Deletes:** Most of `mutatePatch.ts`'s routing (240 lines to about 40), the four confirm helpers and two ordering timers in `confirm.ts`, both notebooks, and most of `treePatch.ts`'s nested transforms.

**Leaves Alone:** Every writer, lock, strict read-modify-write, cascade, sweep, and echo record. The write half barely moves.

**Delta:** About −285 (−230 to −370), the largest collapse in the layer: `mutatePatch.ts`'s routing, the confirm helpers, and both notebooks. `treePatch.ts`'s transforms stay as the applier under the nested store.

**Audit Reach:** F-195 and F-196's tree-apply race closed in `44885c23c`. F-186, F-187, and F-194 are rewritten per K-2 and land in phases 1 and 2 with F-205, F-206, and F-603. As written, they keep path-addressed transforms, the seventeen disk re-read patchers, both notebooks, the four helpers, the ranking rules with their pins, and the double apply. F-186 itself says the incremental index "needs a plan"; it is deferred behind a measurement at phase 2's closeout.

#### Watcher and Index

**Today:** An outside change arrives as a file event, waits for a debounced batch, drops the app's own echoes, is classified into one of fourteen kinds, and either patches the picture through a per-kind disk re-reader or walks the whole Nexus. The whole picture is then pushed, and the batch is classified again to build four more push lists. The search index is kept current by six writers outside the index module, with a stat check as a backstop.

**Found:**

- One event the classifier can't place makes the whole batch walk before any per-page work runs (`watchPatch.ts:216`), so heading-rename cascades and file-history arming are skipped for every other page in that batch.
- Walks fire for routine events: any folder added or removed (`:167-168`), an outside edit of `properties.json`, which the app's own confirm already patches in place (`:165`), and files the tree never reads beside pages (`:184`).
- The disk re-read patchers are a second reader beside the walk's, sharing its decoders; the index extracts pages with a third.
- Context membership is held in four forms, and three per-path stat ledgers exist: the parse cache, `indexed_files`, and `sync_base`.
- An outside page edit reads the file two or three times, a body save four times, and a property write four times with five YAML parses.

**Replacement:** Each event becomes a read by the one reader for that kind of file, which emits the resulting change; the walk emits a diff against the store; the index takes the same change list in one transaction.

**Deletes:** The re-read patchers (about 170 lines), the index's own page reader, the five per-row index write methods, and the seed's separate traversal, but only if the walk is extended to cover the files the seed reads today and the tree doesn't (un-adopted folders, root-level files, and the Agenda folders). That extension isn't sized.

**Leaves Alone:** The SQLite seam, the watcher's lifecycle and re-arm, echo suppression, the exclusion predicates, listing, the asset map, the config leaves, and the seed's database-identity bail.

**Delta:** About −260 (−210 to −330). The seed keeps its traversal as a remainder pass over the files outside the tree, so the index loses nothing it holds today.

**Audit Reach:** F-198, F-206, and F-209 land in phase 3, F-199 (rewritten per K-2) and F-620 in phase 5. As written, they net about +33 and leave two page readers, two drivers (walk and patchers), the whole-picture push, the index maintained by writer convention, the batch-walk rule, and the Unknown-page re-walk.

#### Window State

**Today:** The window holds about twenty copies of host state. The values, pages, and tiles pushes already arrive as change lists, and the navigation, Matrix, and asset pushes send their small files whole (`watcher.ts:94`, `:96`, `:182`). Only the tree push carries the whole picture, with settings, accent, and commands inside it.

**Found:**

- Every tree push runs `stabilize` over the whole picture (`nexusSlice.ts:181`), rebuilds the lookup index when the root moved, asks the host for the system accent (`:209-216`), and rewrites every appearance setting, even on a pure echo.
- Settings exist in seven copies. A settings toggle always re-identifies the root one round trip later, although `Core/Session/configSlice.ts:46` states a toggle must never pay that cost.
- `stabilize` survives any redesign: the asset map, Matrix config, page metadata, the registry repoint, and the Cards view use it. Only its whole-tree use goes.
- Some staleness no push redesign touches: a page's header detail isn't refreshed by value pushes, headings stay keyed by old paths after an in-app move, and sync status and citations cross a Nexus switch.

**Replacement:** The tree push becomes a per-change apply, and settings become per-key config changes with a per-key applier.

**Deletes:** The window's switch, the settings tree patch, and the once-per-Nexus gates inside `applyTree`.

**Leaves Alone:** Navigation, tabs, floating windows, glances, save scheduling, page caches, and tile documents, about 3,600 lines.

**Delta:** About −65 (−50 to −85).

**Audit Reach:** F-195 and F-196's tree-apply race closed in `44885c23c`; F-186, F-187, and F-194, rewritten per K-2, remove the rest of what the law removes here.

#### Governed Data

**Today:** Properties and Contexts are both Nexus-wide lists whose names appear as keys in page frontmatter, so renaming or deleting one sweeps every file holding the key. Each has its own registry writer, key rename, value rename, strip, holder enumeration, crash journal, and replay.

**Found:**

- "Which Spaces does each Context have" is worked out seven ways, and one is cached. Space settings files are read at eleven sites under four read policies, and `loadContextWorld` reads every Space file from disk one at a time on every tag write (`Core/Contexts/contextWrite.ts:60-90`; F-201).
- Nine separate enumerate-lock-read-decide-write loops exist where CorePM describes one shared walk, with five enumerators and five JSON read-modify-write variants.
- The two registries run opposite commit orders, two journal vocabularies, and two replayers at different points of the open (`Core/Nexus/handlers.ts:81`, `:94`), with different holder scopes.
- `setProperty` writes Space files and reconciles Context keys outside the Contexts lock (`Core/Nexus/mutate.ts:66-68` beside `:133-134`).
- Context and Space deletes write no journal. A refused journal write follows two policies: three callers run unjournaled, as `Core/Properties/journalSlot.ts:1` intends (`contextCascade.ts:223`, `:282`; `registryProperty.ts:112`), while option edits record and report the refusal (`optionOps.ts:186`, `:235`).

**Replacement:** One Context world and key-holder lookup built from the store and kept current, serving the walk, the watcher, the sweeps, the restore, and the writers. Three rules make that safe. A value write resolves the property it sets inside the file's lock, since a rename sweeps on its own chain (`Core/Properties/setProperty.ts:46-50`). The live writers' reconcile never shrinks a value it can't resolve (`Core/Contexts/contextResolve.ts:127-137`, applied at `contextWrite.ts:191`, `Core/Properties/governedWrite.ts:31`, and `repairSweep.ts:49`), which is what lets their world come from the store where today a strict disk read of every Space file stands in (`contextWrite.ts:69-74`). A Space link write decides each far half inside that file's own read-modify-write, which already receives the fresh file, rather than from the loaded world (`contextWrite.ts:195-207`). The restore scrub already reconciles against a world built from the tree and deliberately drops tags it can't resolve (`Core/Trash/restoreScrub.ts:20-29`, `:56-58`); it keeps that design. Sweep confirms become change lists.

**Deletes:** The world loaders' per-call disk reads, which every writer uses today, the four tree-to-world adapters, and duplicated snapshot reads.

**Leaves Alone:** The property type catalog, the option model, reconcile and member preservation, the view-config role tables, journals and folder-moving replays, tile I/O, and every holder rewrite. Files are canonical, so a rename still rewrites every file that holds the key.

**Delta:** About −120 (−90 to −150), slice E's phase-4 figure: the disk world, the drift map, `liveWorld`, two conversions, and the per-call index builders. The sweep loops and journals stay under F-622's deferral, and the phase adds about +150 of its own.

**Audit Reach:** F-200 lands in phase 4 as G-3's lookup and F-201 is rewritten per K-2. As written, F-200, F-201, and F-206 each patch one consumer and leave seven derivations, eleven read sites, three rules for what counts as a governed key, five enumerators, and both registries standing.

**Option:** Sharing one journal-and-replay path and one sweep loop between the two registries, while they stay separate things, is outside the law and worth about −150 to −300 more.

#### Trash and Restore

**Today:** A delete writes its record into a bundle in `.trash`, strips references to the entity from other files, and moves the artifact. A restore resolves a placement, reconciles what returns, moves it back, and re-applies what was stripped.

**Found:**

- Restore reimplements create and move. Its name-stepping rule gives `Ideas (3)` where create's gives `Ideas (2) (2)` (`Core/Paths/names.ts:53-72`); it has its own path guard, its own parent lookup, and its own move with no lock on the file (`Core/Trash/spend.ts:264-269`); delete's `settleBundle` is a third move (`Core/Trash/bundle.ts:37-43`).
- Neither delete nor restore reports a rename to Sync, while `relocatePage` and `landedFolder` do (`Core/Nexus/page.ts:61`, `folderEntity.ts:36`). A trashed Collection therefore ships as a delete of every page plus a fresh upload of every page under `.trash`, and again in reverse on restore, although Sync's folder rename already exists (`Core/Sync/Client/push.ts:233-236`).
- Space and Context deletes, and every restore but a page's, confirm by walking the whole Nexus.
- Three of the four record shapes are the same projection of the picture built three times (F-188); only the bundle's record stands alone.

**Replacement:** One shared move primitive; record lookups in place of disk re-reads when gathering and resolving; restore confirms as a change list.

**Deletes:** Restore's move, guard, and owner scan; `rekeyPassengers` and `restoredSpaceTitles`, which duplicate existing cascade code; `containerChain`.

**Leaves Alone:** Write-ahead records, the stripped-reference payloads, restore semantics, listing, empty, and refusals.

**Delta:** About −115 (−95 to −140): the shared move, restore's duplicates, and its two disk lookups.

**Audit Reach:** F-189's owner lookup landed in `ed0fcaf0a`. The missing rename report has no finding; K-3 adds it.

#### Contract and Host

**Today:** `Core/Contract/bridge.ts` declares 115 channels: 97 asks (`:61-256`), 5 tells (`:258-266`), and 13 pushes (`:268-284`). `HostContext` gives Core 20 host capabilities (`Core/Contract/handlers.ts:42-75`).

**Found:**

- 71 user-initiated doors write Nexus files: `mutate`'s 31 operations and 40 bypass channels, and the two session-open channels write through adoption besides. Four bypasses have a structural reason: `nexus:rename` re-targets the session, `exclusions:clear` sweeps files the live tree doesn't hold, and `page:updateBody` and `tiles:writeMarkdown` carry a base-hash check. The other six tile channels wait on tiles having records, and thirty have no structural reason. Every bypass family arrived after `mutate` did.
- Seven files are writable through both `mutate` and another channel: a container's settings file, `settings.json`, `state.json`, `properties.json`, `matrix.json`, tile boards, and `homepage.json`.
- The host confirms writes in four styles, and the window adds a fifth; seven content push channels exist, five of them with two emitters, Core's handlers and Desktop's watcher. `nav:write` and `matrix:write` confirm only because the watcher pushes config before it drops the app's own echo (`watcher.ts:93-97`).
- `HostContext` is a second seam beside `Core/Platform` with no contract suite; tests build it as `{} as HostContext`.

**Replacement:** One write door for Nexus files wherever nothing structural separates them, one change push, and `HostContext` held to a contract suite with its forwarders and callbacks moved out.

**Deletes:** Channel declarations and argument narrowers for the folded doors, and the duplicate push emitters.

**Leaves Alone:** The `Result` envelope, the handler gates, the serve map, `Machine`, the store interfaces, path safety and naming rules, and Desktop's Electron code.

**Delta:** About 0. Folding the doors (about −125 to −250) is F-611, deferred (J-5), and the change list rides the existing `nexus:changed` channel.

**Audit Reach:** F-611 records the doors and sequences their folding after the rewritten F-187. F-212, F-240, F-242, F-248, and F-249 are placement and naming; none changes the door count, push channels, confirm paths, or the untested seam.

#### Sync Landing

**Today:** A landing writes bytes without an echo record (`atomicWrite.ts:29-39`), so the watcher treats it as an outside edit and re-derives everything from file events.

**Found:**

- The landing functions know each change's kind, path, and source path, and return nothing. A synced rename arrives as a delete plus an add, and a synced new folder costs a walk (F-199).
- Every app write reaches Sync twice, through the write tap and through the watcher's echo, merged by a 2.5-second debounce.
- Landings into `.trash` reach nothing, so a peer's Trash frame stays stale until reopened.
- A Context's identity on disk is its title in three places (the registry entry, the folder name, and its members' keys), each shipped as an independent file change; no merge fix addresses that (F-605).

**Replacement:** Landings emit change values into the same applier.

**Deletes:** Little in Sync's own code; the savings are the re-classification and per-folder walks already counted under the watcher.

**Leaves Alone:** The per-file wire protocol, the three-way JSON merge, the repair seed, and the base records.

**Delta:** About 0 in Sync's own files; the landings gain their change lists and echo records inside phase 5's watcher figure.

**Audit Reach:** F-064, F-066, F-067, F-068, and F-605 each patch one place where the per-file wire meets a fact spanning several files.

---

### Errors, Complexity, and Integrity

The measure that matters is how many places a fact has to be kept in agreement by hand, and whether the safety the layer holds today survives. Lines follow from that.

**How the Law Changes Where Regressions Are Born:** Today a regression is born in one of three ways: a new writer or door isn't wired to every copy; a second reader or lookup is built beside the first and the two drift; or a convention reaches some writers and not others. Under the law a writer's one change description feeds every copy, so there is no per-copy wiring to forget, and one reader per kind of file leaves no second reader to drift. The number of places that emit a change doesn't fall much: slice H counts about 55 under the law against about 47 after the audit's fixes. What changes is that each is a single emission every copy applies, so the copies can't disagree with each other. A missed emission leaves every copy equally behind until the next walk, and the parity tests catch it for every write they drive.

**Open Findings the Law Closes by Construction:**

| Finding | Closed? | How |
|---|---|---|
| F-186 whole-tree push | Yes | The window applies change lists |
| F-187 two routing tables | Yes | One applier |
| F-188 host's own walks | Yes | One engine-safe record store |
| F-189 five owner lookups | Yes | One owner projection |
| F-194 settings roll back | Partly | Needs the per-key ordering listed as machinery |
| F-195 accent asked every push | Yes | Applied only on an accent change |
| F-196 late replies | Partly | The tree-apply race closes; `loadHeadings`, `reloadPage`, and the Matrix load keep their own fix |
| F-197 open reads every page twice | Partly | One reader; stamping from the walk's result needs adoption's writes to land before duplicate ids are settled, and the tree covers fewer files than the seed |
| F-198 index commits per row | Yes | One batched apply |
| F-199 routine events walk | Yes | Per-kind reads, with a folder add or remove as a change |
| F-200 Context lookup rebuilt per tag | Yes | One world kept current |
| F-201 Space files re-read per tag | Yes | World built from the store |
| F-205 folder created without an echo record | Partly | The stray event costs one read instead of a walk; the echo record is still owed |
| F-206 re-read after write | Yes | The writer's own text feeds the index |
| F-209 re-minted page keeps its old index row | Yes | The re-mint emits a change the index applies |
| F-210 stale tree after a failed re-walk | Yes | The re-mint's changes apply directly |
| F-211 walk writes into shared objects | Yes | Records are immutable values |
| F-603 Collection create appends where the host pins | Yes | Order held in the model under one rule |
| F-611 side doors beside `mutate` | Partly | The thirty doors without a structural reason fold; the six tile channels wait on tile records |

Of the gaps no audit entry carries, the law closes the registry-adoption gap, the unflushed exclusion notes, the banner re-read, the missing rename report (through the shared move), `page:open`'s missing admission check (through one page reader), the Unknown-page re-walk (the reader returns a status), the batch forfeit, and the two name-stepping rules (restore uses create's).

**What the Law Doesn't Close:** Placement and naming (F-212, F-240, F-242, F-248, and F-249); Sync's trust boundary and recovery (F-064, F-066 to F-068, F-605); F-527, F-602, and F-604; and six standalone defects from *§Findings No Audit Entry Carries*: `setProperty` outside the Contexts lock, Context and Space deletes without forward replay and the two policies for a refused journal write, `matrix.json`'s two writers, native menus missing a `commands` change, Context ids never re-minted, and concurrent opens. Each needs its own fix, and the audit's process change (a sweep for the fact's other home) still applies to them.

**Complexity, Today and Under the Law:**

| Measure | Today | Under the Law |
|---|---|---|
| Readers per page | 3, with 3 identity rules | 1 |
| Readers per Space / per folder settings file | 3 / 2 | 1 / 1 |
| Rules when two entities share an id | 3 | 1 |
| Tables deciding how a request reshapes the picture | 2, plus the watcher's re-read patchers | 1 applier |
| Notebooks of recent writes | 2 | 0 |
| Ways a write is confirmed | 4 in the host, 1 in the window | 2: the one confirm path, and tiles' own reply |
| Channels that write Nexus files | 41 (`mutate` plus 40 bypasses), plus the 2 session opens | About 11 (`mutate`, `nexus:rename`, `exclusions:clear`, `page:updateBody`, and the 7 tile channels), plus the 2 session opens |
| Files writable through two doors | 7 | 1 (tile boards, until tiles have records) |
| Content push channels | 7, five with two emitters | 3 (changes, tiles, assets), plus the whole push for open, Reload, and fallback |
| Derivations of "Spaces by Context" | 7 | 1 |
| Settings copies | 8 | 3 (disk, host config, window config), plus the page's applied styles |
| Moves that relocate an entity | 3 (create/move, Trash delete, restore) | 1 |
| Name-stepping rules | 2 | 1 |

**Integrity:** Twelve safety properties were judged, ten of them by slice H. Five survive unchanged: echo suppression by bytes, the single-flight walk with stale-walk discard, the parse cache's racy window, per-file locks with strict read-modify-write, and the index seed's database-identity bail. Five are re-implemented rather than lost: the walk fallback, the root pin, confirm-by-re-read (replaced by the writer's report), reply-before-push (the reply carries the change), and `stabilize`'s identity (records keep identity by construction). Two more survive unchanged: a value write resolves the property it sets inside the file's lock (`setProperty.ts:46-50`), and the live writers' reconcile never shrinks a value it can't resolve (`contextResolve.ts:127-137`), which is what makes a Context world built from the store safe for them. None is lost. Two of the re-implementations gain a duty they don't carry today: emitted changes have to be applied in the order their file locks were taken, and projections have to keep their identity incrementally. One safety net changes form: the whole push erases any window drift at the next push, and change lists heal only what they name, so a version stamp with resync takes over and F-196's tree-apply race has to close first. During any transition, the test suite is the integrity guarantee, and it has to be re-earned (*§The Number*). That is the strongest argument for staging.

---

### The Number

**Method:** Each production file belongs to exactly one area and is counted once, using the slice estimate that best fits the law where two slices sized the same file; the figures are the slices' re-grounded *Plan Inputs* at `d7d00240d` under the trimmed mandate, as *00 — Orchestrator Notes* reconciles them. Each piece of new machinery the law needs is listed once, separately from every area's figures. Every estimate is a code-read judgment, roughly ±25% per file, with no prototype. The slices counted on two bases, non-blank non-comment lines (A) and physical lines (the rest), so the totals mix bases and the ranges are widened for it. Lead with the range, not the midpoint.

**Removals by Area:**

| Area | Current Lines | Removed | Basis |
|---|---|---|---|
| Read Path and Model | 1,842 | −220 to −340 | Slice A, non-blank, less the builders and attach pass counted under Watcher and Governed Data |
| Write and Confirm | 945 | −230 to −370 | B, physical, less the window's switch |
| Watcher and Index | 1,582 | −210 to −330 | C, physical, with the seed's traversal kept as a remainder pass |
| Window State | 534 | −50 to −85 | B and D, physical |
| Governed Data | 3,149 | −90 to −150 | E's phase 4, physical |
| Trash and Restore | 1,042 | −95 to −140 | F, physical |
| Contract and Host | 1,231 | About 0 | F-611 deferred |
| Sync Landing | 306 | About 0 | Counted inside phase 5's watcher figure |
| **Total** | **10,631** | **About −1,125 (−900 to −1,400)** | |

Current lines are physical lines at `132a2f111` in the files each area owns. The rest of the layer's roughly 14,100 lines (Session interface state, Settings, Paths, Platform, and Desktop's Config and remaining Store files) sits outside every collapse.

**Ownership and Settlements:**

- `reorder.ts`'s `persistable` is E-6's and counts once in phase 3 (slice A), not in B's phase 1.
- `tree.ts`'s config fields and `applySettingsLeaves` count once under A; D keeps `configSlice.ts` and the push.
- The window's switch in `nexusSlice.ts` counts once under Window State; B's and D's figures both sized it.
- `watchPatch.ts`'s container and Space builders count once, in phase 3 (A); C's phase-5 removal of the patchers is taken less those lines.
- C's temporary-ID sites count once under A's E-6 inventory, and C's seed-traversal removal (about −40) is dropped, since the traversal stays as a remainder pass.
- `readNexus.ts`'s attach pass and `resolveEntityContexts`, and `restoreScrub.ts`'s `liveWorld`, count once under E.
- `walkCache.ts` and `treeStabilize.ts` count at zero: the parse cache survives as it is, and seven other callers keep `stabilize`.
- Not sized by any slice: the handler call sites of the confirm helpers (about −30).

**New Machinery, Counted Once:**

| Machinery | Lines |
|---|---|
| `entities.ts` and the kinds derived from it | About +40 |
| The config record, its holder, the push payload, the config tap, and the `treeIndex` key | About +75 |
| The Trash rider's shared move, name steps, rekey, and Space-id read, and the three code defects | About +85 |
| The change vocabulary and one applier, with order lists held in the model | About +120 |
| Writer emissions, restore and delete included | About +125 |
| `commitChanges`, the versioned push, and the window's apply | About +90 |
| Three readers, the stamp pass, the notices, and the batched index write | About +245 |
| The Context-world lookup and G-3's fixes | About +150 |
| The watcher's one-file reads, walk-as-diff, and the landings' change lists | About +140 |
| **Total** | **About +1,070 (+800 to +1,350)** |

Incremental `treeIndex` maintenance (about +60) is deferred behind a measurement at phase 2's closeout and isn't counted.

**Outcome:**

| Path | Net Production Lines |
|---|---|
| The audit's path: every remaining finding in this layer | −33, plus +77 for Sync's W4 |
| The trimmed mandate with the nested store kept | About −55 (+200 to −350) |
| Nathan's target | −2,000 to −5,000 |

The added side is the least certain figure, since the applier, the readers, and the lookup aren't designed yet.

**Options Outside the Law:**

| Option | Lines | What It Costs |
|---|---|---|
| Share one journal-and-replay path and one sweep loop between the two registries | −150 to −300 | One commit order for both registries, which changes crash recovery for one of them; Contexts and Properties stay separate things |
| Fold the 40 side entry points into `mutate` (F-611) | −125 to −250 | Sequenced after the rewritten F-187 (J-5) |
| Tiles as records behind the one door | About −45 | Tiles need records, which nobody sized |

Two further reductions the reports sized change user-visible behavior and are excluded: leaving a deleted entity's references in other files (about −255) and dropping deleted names from saved views only at read time (about −90).

**Test Cost:** The layer's folders hold about 35,000 test lines. Fifty test files (20,155 lines) import the patch modules or read the tree's shape, and slice H estimates a rebuild rewrites 8,000 to 12,000 test lines. Until those are re-earned, the walk-parity assertions and the confirm-ordering tests stop guarding anything.

**What the Number Says:** Under the trimmed mandate the line count is close to flat: about 1,125 lines go and about 1,070 arrive. The mandate replaces mechanisms (the routing tables, the notebooks, the re-read confirms, the duplicate readers, the disk world) with machinery that doesn't exist yet (the change vocabulary and applier, writer emissions, three readers, the Context lookup), and the larger reductions this document first sized sit in options deferred or rejected since: folding the doors (F-611), shared registry machinery (F-622), and a flat store. The line count is a byproduct; the tables in *§Errors, Complexity, and Integrity* are the outcome. The audit's path nets −33 because the duplicates it removes (F-187 to F-189) are offset by machinery its other fixes add (F-186 +60, F-199 +30), and the reader, door, and confirm duplicates stay.

---

### Records

#### Findings No Audit Entry Carries

- **Trash never reports a rename to Sync.** A trashed or restored Collection re-uploads every page's ciphertext (`bundle.ts:37-43`, `spend.ts:264-269`; compare `page.ts:61`).
- **`page:open` serves pages admission would refuse.** `readPageDetail` takes any string `ID` (`Pages/handlers.ts:24` → `pageFile.ts:168-181`).
- **Registry option adoptions reach no copy** until the next walk (`optionOps.ts:83-111`; `mutatePatch.ts:48-53, 137, 169-173`). The case is reachable from Obsidian-authored multi-select values.
- **`exclusions:clear` leaves value notes unflushed** for the next unrelated operation to push (`Settings/handlers.ts:39-42`).
- **An outside save of an Unknown-admission page re-walks the whole Nexus** (`watchPatch.ts:143-145`, `walkCache.ts:55`).
- **One unclassifiable event forfeits every page's per-page work in its batch,** including heading-rename cascades and file-history arming (`watchPatch.ts:216`).
- **`setProperty` runs outside the Contexts lock** while writing Space files (`mutate.ts:66-68`, `:133-134`).
- **Context and Space deletes have no forward replay,** and a refused journal write follows two policies: three callers run unjournaled while option edits record and report it (`contextCascade.ts:223`, `:282`; `registryProperty.ts:112`; `optionOps.ts:186`, `:235`).
- **Two name-stepping rules disagree** on an already-suffixed name (`names.ts:53-72`).
- **`matrix.json` has two writers** (`Core/Nexus/configReach.ts:382` beside `Core/Matrix/matrixFile.ts:17`), which slice E reports apply opposite policies to a corrupt file.
- **A `commands` change reaches the window but not the native menus** until relaunch or re-adoption, since `refreshMenu` runs only there (`Desktop/main.ts:172`, `:321`, `:390`).
- **Context ids are never re-minted,** so a duplicated Context id stays unresolved (`Core/Nexus/remint.ts:69`).
- **`nexus:choose` and `nexus:openPath` aren't serialized** while a switch is in flight; `whileAdopting` only counts (`Core/Nexus/session.ts:15-24`). Not confirmed live.
- **`profileSubtitle` has no reader,** and the `schemas.ts` container schemas have no production reader.
- **Delete never drops a deleted page's metadata entry,** and a tile remove or convert doesn't drop its heading links (slice B, not re-checked here).

#### Feature-Doc Divergences

Each item pairs a documented claim with the code that contradicts it, for later reconciliation.

**CorePM:**

- *§The Read + State Layer*, "one eager, read-only walk … in a single pass": an open reads the corpus two or three times, the walk attaches Context links in a second pass, and it writes into objects the parse cache shares (F-211).
- Same section, "no per-entity cache": the parse cache, the raw-Context-key map, and `lastRead` are each per-entity caches.
- Same section, "the walk runs at open and on Reload": it also runs on every refresh-routed confirm, rescope, post-re-mint check, schema replay, and read with no tree held.
- Same section, "patching it in place": the live tree is replaced as a new object on every patch.
- Same section, "a structural-sharing pass … so a push re-renders only what moved": `stabilize` walks the whole tree on every push, and a new root rebuilds every lookup table.
- Same section, "Interface lookups derive from `treeIndex`": the window also walks the tree on its own in five places and imports a host walk (`Core/Tiles/Surfaces/PageTile.tsx:76`).
- *§The Nexus Layout*, "every sidecar's field shape is canonical in `schemas.ts`": production decodes containers in `containerFields.ts` and Spaces in `spaceSidecar.ts`; the `schemas.ts` container schemas are test-only.
- *§Adoption*, "Unknown is invisible and untouched: absent from the tree": Unknown pages sit in the tree's unreadable list, and each outside edit to one walks the whole Nexus. "Admission is the one place it is checked": `readPageDetail` skips it.
- *§Mutations*, "every change funnels through one dispatcher": 40 channels bypass it, and seven files are writable both ways (F-611).
- Same section, "every write channel confirms itself … a pure transform where the request carries the whole fact, a one-file re-read where the writer normalizes": option adoptions and `exclusions:clear` confirm nothing, tiles confirm by reply, `nav:write` and `matrix:write` by the watcher's echo, several operations re-read with the whole fact in the request, and several single-entity changes walk.
- Same section, "the write path never runs inside a read": the watcher's patch runs `renameCascade`, which writes files.
- *Names*, "through one rule in `names.ts`": `freeName` and `createDisambiguated` step differently.
- *Governed keys*, `isRegisteredPropertyName`: no such function exists, and three different governed-key rules are in use.
- *Sweeps and journals*, "share one walk … serialize on one chain and write a crash journal first": nine loops, two serializers, and Context and Space deletes unjournaled.
- *§The Atomic-Write Contract*, "every file write goes through an atomic path … behind the machine seam": thumbnail writes and the asset protocol's reads bypass `Machine`.
- *§The Device-Local Database*, "derived state, disposable by construction … reading only files whose mtime or size moved": six writers maintain the index, and the stat gate misses same-size, preserved-time changes. "A query answers null … and its caller falls back to a full scan": three queries do; the rest fall back to empty values or a fault. "The sync base record (`sync`)": the table is `sync_base`.

**DesktopPM:**

- *§The Shape of the App*, "a deliberately narrow bridge": 115 channels and 41 distinct reply types.
- *§The Push Path*, "pushes it whole to the window on one channel … an echoed push re-renders nothing": seven content push channels; an echo still costs a full compare, three store notifications, an accent round trip, and about thirty style writes.
- *§The File Watcher*, "patch the live tree at the cost of one file read": two or three reads per patch. "Everything unclassifiable — … orderings, a sidecar appearing … — falls back to one verification walk": ordering and a sidecar appearing both patch. "Re-parses only entries whose mtime or size changed": config leaves and metadata shards are re-read uncached.
- *§The Store*, "an empty `sync` table": the table is `sync_base`.

**NexusRecordPM:**

- The opening's code map: restore lives in `spend.ts` and `resolve.ts`, and `record.ts` holds only the baseline type, with no diff.
- *§Provenance*, "a hand-move or a sync race moves the two as one unit": Sync ships the record and each artifact file as independent per-path changes.
- *§Baseline*, "whether it was readable … the diff runs over the union of ids … the drift row keeps the last non-empty diff": the record has no readable field, and no diff or drift row exists. "One explicit walk": one or two.

**ContextsPM:**

- *§The Registry Model*, "`normalizeContextValue`": no such function exists; `normalizeTitle` is the normalizer.
- *§Writes*, "under one lock on the Contexts folder": `setProperty` writes Space files outside it, and the repair sweep runs unlocked.
- *Membership*, "reconciling the whole root it rewrites": Space-file writes reconcile with no property definitions, so a Space's property values are never reconciled.
- *Renames*, "a failed commit reverses the cascade": the reversal's skipped files are dropped with the journal.

**PropertiesPM:**

- *Repair*, "a value naming no Space is dropped": every live writer withholds that drop; only the restore scrub applies it.

**PommoraPRD:**

- *§Storage Philosophy*, "opening a folder that's also an Obsidian vault leaves notes byte-identical until the user edits them": adoption stamps an `ID:` into every id-less page and writes a settings file into every folder. CorePM documents this behavior, so the PRD sentence is the stale one.
- Same section, "the database is off the read path … reads are a single filesystem walk": headings, mentions, members, and the Matrix graph are served from the index.

**Project Rules (`CLAUDE.md`):**

- "Core reaches it only through `Core/Platform`": `HostContext` is a second seam with no contract suite.
- "Read and write are cleanly separable": the watcher's patch writes files, and a settings writer patches the live tree from inside the write.

#### Reconciled Disagreements

Where two reports disagreed, the code settled it: at `132a2f111` for the rows through *The audit's own net*, four of them re-settled under the trimmed mandate, and at `d7d00240d` for the rows after it.

| Question | The Reports Said | Settled | Evidence |
|---|---|---|---|
| Total line outcome | H: about −150. Orchestrator: −1.5K to −2.5K. Slice sums overlapped | About −55 (+200 to −350) for the trimmed mandate with the nested store; H's figure is the storage swap's share | *§The Number* |
| Key the store by id or by path | B, C, and F wrote `move(id)`; A and H said path | Path, with an id-to-claimants projection | `Core/Nexus/ids.ts:47-49` hashes the path; `watchPatch.ts:331-353` inserts a second page with a shared id at a new path |
| Keep the nested tree | A: flat plus a nested projection. H: nesting is sound | Nested, by the Decision Log's J-1; the law holds either way | H's sidebar and `stabilize` argument; A's projection sizing |
| Structure or process | Audit: process. H: placement and one half-applied convention. B: propagation structure | Structural in placement and wiring; the note gap is procedural | *§Structure or Process* |
| Write doors | G: 71. H: about 61 write paths | Same 40 bypasses counted differently: H's 26 confirming channels, 2 value-only, and `nexus:rename`, plus the 7 tile channels, `nav:write`, `matrix:write`, `exclusions:clear`, and `assets:adopt` | `bridge.ts:61-256`: 97 asks |
| Mutate operations | Some notes said 34 | 31 | `mutateRequest.ts:60-111` |
| Does `stabilize` survive | B: for walks. D: tree use goes. H: re-implemented | The function survives whole; only the tree push's use goes | Callers at `assetMap.ts:96`, `pageMetadata.ts:47, 104`, `treePatch.ts:300`, `cacheSlice.ts:45`, `matrixSlice.ts:200`, `CardsView.tsx:343` |
| F-187's disagreements | Audit: the tables already disagree | Of its two, the `reorderTop` fallback is unreachable and the field-op split is a live difference in mechanism; slice B lists thirteen, one re-checked as behavioral | `treePatch.ts:500`; `nexusSlice.ts:282-298` beside `mutatePatch.ts:125-135`; `order.ts:19-26` beside `treePatch.ts:374-379` |
| Parse cache | A and H: survives. C: −43 | Survives as it is | `walkCache.ts:3-4, 44-57` |
| `treeIndex.ts` | A: −130. D: about flat. B: +60 | The cache keys on the tree plus its three icon inputs; incremental maintenance is deferred behind a measurement at phase 2's closeout | `treeIndex.ts:46-98`; `contextIdentity.ts:23-33` |
| Governed Data | E: −730 net | About −120, E's phase-4 figure, with the shared machinery deferred as F-622 | *§The Number* |
| Key-holder lookup | E: −59 | About −15 | `keyHolders.ts:27` keeps the disk confirm; records hold no page values |
| Hand-wired cells | B: every row. H: 83 of about 490 | Different measures: H counts per-write wiring, B counts rows the window reaches only by the whole push | Both hold; the empty cells B found are real |
| Writers normalize | A: several. B: about five. H: partly, including the banner | About seven, the two image writes included | `setBanner.ts:26-30`; `setProfileImage.ts:12-14` |
| Refused journal writes | E: four callers ignore it | Two policies: three callers run unjournaled as intended, and option edits record and report it | `journalSlot.ts:1`; `contextCascade.ts:223`, `:282`; `registryProperty.ts:112`; `optionOps.ts:186`, `:235` |
| The audit's own net | Notes: −33. H: −50. C: +21 | −33 across every remaining finding in the layer; H and C summed subsets | The audit's `Net` fields |
| The change description's name and shape | B: `TreeChange`, `WriteReceipt`, `commit`, `nexus:changes` | `NexusChange` (ruled) with nine arms; the change list is the receipt; `commitChanges`; `nexus:changed` carries a versioned whole picture or change list | Decision Log concepts; `Core/Sync/Contract/wire.ts:102` holds `Change` |
| The config record's name and push | A, B, D: `NexusConfig`. D: extend `nexus:changed` or add `config:changed` | `NexusConfig` beside the tree as `NexusPicture`, on `nexus:changed`; a config channel would retire in phase 2 | `bridge.ts:275`; `nexusSlice.ts:186-201` |
| The `commands` fix's key | F: the tree push | The host's config holder, so it survives both phases' push changes and both emitters | `confirm.ts:10-16`; `Desktop/FileWatch/watcher.ts:170`; `Desktop/main.ts:172-177` |
| Order ranking (B-4) | B: `byOrder` puts unlisted last; the host pins by re-reading | One rule, `resolveOrder`, once containers and config hold their lists | `order.ts:10-27`; `treePatch.ts:401-406`, `:518-520`; `mutatePatch.ts:162-187` |
| Unchanged writes | B: `rmwLocked` returns `ok(base)`, so writers can't tell | The writer's own `mutate` closure knows it answered null; no API change | `atomicWrite.ts:124-125` |
| The watcher stamp | A: a stamp step before the apply. C: stamp what the read returned missing | C's: the read stays read-only, and one `stampMissing` serves the open, the settle, and the fallback walk | `adopt.ts:58-70`, `:104-116`; `watcher.ts:152-161` |
| E-6's reach | Decision Log: nine places | Nine mints and eleven special cases, among them the window's two pin guards; a Space sidecar and the Nexus root each need a ruling | `NavList.tsx:75`; `navigationSlice.ts:488`; `readNexus.ts:245`, `:305` |
| The index corpus | C: indexing from the walk loses Agenda and root files | The seed keeps a remainder pass over files outside the tree; the walk extension is roughly flat and needs a Task and Event reader | `indexSeed.ts:86-88`, `:185-223`; `readNexus.ts:320-328`; `pageFile.ts:184-186` |
| What the page reader caches | A: body and index rows cost every page's text | The record only; rows come from the parse call's text when the index's stat differs | `walkCache.ts:34-57`; `indexSeed.ts:105` |
| When the container and Space builders go | A: phase 3. C: phase 5 | Both: phase 3 replaces the builders with the readers, and phase 5 deletes the patchers | `watchPatch.ts:319-416` |
| Phase 5 as its own plan | C: yes. A, B, D, E, F: no | No: it's the smallest phase, and running last keeps it cuttable (J-8) | *00 — Orchestrator Notes* |
| Lines per phase | Each slice sized its own files | About −1,125 and +1,070 once the overlaps count once | *§The Number* |

#### What Wasn't Verified

- Nothing was driven live. Every claim is a code read, and every line figure is a judgment of about ±25% per file with no prototype.
- The registry-adoption gap, the ledger bleed between a concurrent autosave and a create, and the Contexts-lock race were traced statically and never reproduced.
- Inferred from code paths and options rather than observed: chokidar's initial crawl cost, how a 200-file landing groups into settles, parse counts under concurrency, the reachability of Sync's `.trash` guard in its watch tap, how far the window's optimistic paint leads the confirming push, and whether IPC preserves `undefined`-valued keys that `stabilize` compares.
- Carried from the reports without a re-check here: the forty finders and their three duplicate-id rules, the fifty test files, the test-file line counts the re-grounded reports list, the value notes `exclusions:clear` leaves, twelve of slice B's thirteen table disagreements, and the serial reads in the adoption pass.
- Slice H's nested-versus-flat estimate isn't derived from this document's rows.
- The re-grounded figures leave two things uncounted: the handlers' calls to the confirm helpers, and how many of the 43 `treeIndex` importers read a resolved icon, which sizes phase 1's widest edit.
- Inferred rather than observed for E-6's watcher stamp: chokidar's event order for a Finder or Obsidian create-then-rename, and whether a folder moved in from outside emits one `add` per child.
- `readPageDetail`'s missing admission check, the missing rename report, and the batch forfeit are direct code paths and high confidence; their user-visible frequency is unmeasured.

---

### Sources

**Reports:** `.claude/Planning/Data Layer — Investigation Reports/`: `00 — Orchestrator Notes.md`, `A — Model & Read Path.md`, `B — Write Path & Confirmation.md`, `C — Watcher & Content Index.md`, `D — Window-Side State.md`, `E — Governed Data Sweeps.md`, `F — Trash, Restore & Sync Landing.md`, `G — Contract, Platform, Paths & Host.md`, `H — Counter-Case for the Audit.md`.

**Documents:** `.claude/Planning/Pommora Codebase Audit.md` (Verdict, Pace Guidance, W14, W15, W16, W19); `.claude/Features/CorePM.md`, `DesktopPM.md`, `NexusRecordPM.md`, `ContextsPM.md`, `PropertiesPM.md`; `.claude/PommoraPRD.md` (*§Domain Model*, *§Storage Philosophy*); `.claude/Planning/Data Layer — Decision Log.md`.

**Scope:** `Core/Nexus`, `Core/Session`, `Core/Contexts`, `Core/Trash`, `Core/Files`, `Core/Paths`, `Core/Contract`, `Core/Index`, `Core/Platform`, the host half of `Core/Properties`, `Desktop/Store`, `Desktop/FileWatch`, and `Desktop/Config`.

**Files Quoted:** `Core/Nexus/tree.ts`, `ids.ts`, `order.ts`, `readNexus.ts`, `adopt.ts`, `remint.ts`, `remintLedger.ts`, `treeIndex.ts`, `treePatch.ts`, `watchPatch.ts`, `mutatePatch.ts`, `mutateRequest.ts`, `mutate.ts`, `confirm.ts`, `valuesChanged.ts`, `handlers.ts`, `session.ts`, `page.ts`, `folderEntity.ts`, `configReach.ts`, `pageMetadata.ts`, `schemas.ts`; `Core/Files/atomicWrite.ts`, `pageFile.ts`, `walkCache.ts`; `Core/Index/indexSeed.ts`; `Core/Session/nexusSlice.ts`, `configSlice.ts`, `cacheSlice.ts`, `matrixSlice.ts`; `Core/Contexts/contextWrite.ts`, `contextCascade.ts`, `contextIdentity.ts`, `contextResolve.ts`; `Core/Properties/optionOps.ts`, `propertiesRegistry.ts`, `registryProperty.ts`, `keyHolders.ts`, `governedSweep.ts`, `journalSlot.ts`, `setProperty.ts`; `Core/Pages/handlers.ts`, `setBanner.ts`; `Core/Assets/setProfileImage.ts`, `assetMap.ts`; `Core/Settings/handlers.ts`, `codec.ts`; `Core/Trash/bundle.ts`, `spend.ts`; `Core/Paths/names.ts`; `Core/Sync/Client/push.ts`; `Core/Contract/bridge.ts`, `handlers.ts`; `Core/Matrix/matrixFile.ts`; `Core/Tiles/Surfaces/PageTile.tsx`; `Core/Views/Cards/CardsView.tsx`; `Desktop/FileWatch/watcher.ts`; `Desktop/main.ts`.
