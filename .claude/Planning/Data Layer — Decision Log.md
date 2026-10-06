### Data Layer — Decision Log

**DATE:** 09-27-2026 · **REVISED:** 10-01-2026
**STATUS:** Re-scoped and re-tagged with Nathan; *Data Layer — Implementation Plan* is written from this revision, reviewed, and ratified for execution
**SESSION:** 5256b7a7-72ed-47b9-bc20-63daf029c52c · revision f314c927-de2e-42d2-9945-c6086ebe8dbb
**CONCEPTS:**

- **The Picture:** The copy of the Nexus that Pommora keeps in memory so it can show things instantly. There are two: one in the **host** (the half of the app allowed to touch files) and one in the **window** (the half that draws what you see).
- **Copy:** Any place a fact about the Nexus is kept besides its own file: either picture, the search index, the caches, and the settings copies.
- **Change Description:** One short, shared description of what a write or an outside edit changed (something was added, removed, moved, or a setting changed). Every copy updates itself from it. Its name in code is `NexusChange` [CONFIRMED].
- **Entity Kinds:** The kinds of things a Nexus holds: Collection, Set, Page, Context, and Space, with Task and Event scaffolded.
- **Reader:** The code that opens one kind of file and turns it into something the app understands.
- **Entry Point:** A way the window asks the host to write a Nexus file. `mutate` is the main one; 40 others exist beside it.
- **Temporary ID:** An ID the app computes from a page's or folder's location until a permanent one is written into the file; retired by E-6.
- **Tags:** [CONFIRMED] Nathan decided it on a product ground. [TECHNICAL] Claude's call; Nathan may veto it on a product ground but isn't asked to evaluate it. [INFERRED] follows from a confirmed call; the planner may challenge it with evidence. [DEFERRED] recorded in the audit for a later cycle. [OPEN] is unresolved.

#### Context

This log is the design specification for the data-layer work, built from Nathan's calls in the brainstorm and from *Data Layer — Investigation* (the evidence). It is the contract the planning session builds from, and the planning session reads it in full before anything else.

---

#### Overview

**The Problem, in Plain Terms**

Pommora keeps several copies of your Nexus: the host's picture, the window's picture, the search index, and a few caches. When something changes, whether you edit in the app, Obsidian saves a file, or Sync brings in another device's change, every copy has to be updated. Today each copy is updated by its own separate, hand-built piece of code. Over time those pieces drifted apart. Some changes reach one copy and not another, some copies re-read files the app just wrote, and every small change sends the entire picture to the window again. That drift is where most of the audit's data-layer findings come from, and it's why fixing one of them tends to create the next.

**The Fix, in Plain Terms**

Every change describes itself once, in one shared form, and every copy updates from that same description. With one description and one way of applying it, the copies can't quietly disagree, and a new feature can't forget to update one of them. Four points make that true; two small riders come along because they're real bugs in the same files; two topics are deferred to the audit. The rest of the audit stands.

**The Mandate:**

1. **Changes Report Themselves:** Every file the app writes is reported as a file change, with the bytes it wrote, to the one step that already handles a file Obsidian or Sync changed. That step updates the picture, the search index, and the window, so the app, outside tools, and Sync share one path, and the second, hand-built system that confirms the app's own writes today is deleted. The window receives what changed instead of the whole picture. This is the big one.
2. **One List of Entity Kinds:** A single table, `Core/Nexus/entities.ts`, says which kinds of things a Nexus holds and how each one is stored, instead of kind lists kept by hand in about ten places.
3. **One Reader Per Kind of File:** Pages are read one way instead of three, Spaces one way instead of three, and folder settings files one way instead of two. The open, outside edits, and the app's own writes all read through the same one.
4. **Settings Get Their Own Home:** Settings, image crops, page metadata, and ordering stop living at the top of the same picture as pages and folders, so toggling one setting stops rebuilding everything.

**The Riders:**

- **Trash Restore Reuses Create and Move:** Deleting and restoring move files the same way creating and moving do, which also stops Sync re-uploading a whole folder when you trash it.
- **Contexts and Properties Get Their Known Problems Fixed:** They stay two separate things, with the same machinery underneath they have today.
- **Four Standalone Defects** (section I).

**Deferred to the Audit:**

- **One Home for Errors:** the whole-app error table is F-621. This work keeps only the piece it needs: a host-side error kind that should reach the user travels to the window's existing notice.
- **Shared Machinery for Contexts and Properties:** F-622. The investigation places it outside the law, and it asks for a crash-recovery commit order that has no product ground to decide it on.

**What Stays Exactly As It Is:**

- How files are written: whole-file replacement, one writer per file at a time, and refusing to overwrite a file that couldn't be read.
- The file formats on disk.
- The folders-inside-folders shape of the picture, which the sidebar draws.
- The full re-read of the Nexus as the backup when something can't be updated piece by piece.
- The Trash's record written before anything is destroyed, and restore's rules for where things land.
- What Contexts and Properties mean, and how their renames and deletes rewrite every file that holds them.
- How Sync sends files, one at a time.
- Everything the window keeps about navigation, tabs, floating windows, editing, and tiles.

**What This Work Isn't:**

- A rewrite. It reworks seven points and leaves the rest standing.
- A line-count target. The plan's estimate is about −370 net, with a range of −305 to −430 (by phase about +80, +25, −465, and −10: the first two phases build what the third deletes with), and each phase's figure is reported honestly. Surface area is still a real reason for the work, so every piece of new machinery has to earn its place against plain code (A-8).
- A step backward. Nothing gets worse. A few changes are on purpose: a page with another app's ID is hidden and listed as unreadable with Try Again, a file of the wrong kind for its folder, or a Collection or Set whose settings file is damaged, gets a notice, a page or folder created outside the app gets its permanent ID as soon as the app sees it, and a copy of `Ideas (2)` becomes `Ideas (3)` instead of `Ideas (2) (2)`.
- A file-format change.
- A pause. Feature work continues beside it; each phase re-pins against the code at its start (J-6).

**How the Audit Fits:**

- Many audit findings in this area get fixed as written, by the phase that owns their area.
- Six findings get their fix rewritten, because the rework replaces what they propose.
- The problems the investigation found that stay open after this work get added to it. The ones this work resolves are never written in, and a finding this work resolves is removed from the audit by the phase that resolves it.
- The audit's findings outside this area keep their own schedule.
- Folding the 40 side entry points into the main one (F-611), the whole-app error table (F-621), and shared registry machinery (F-622) wait until after this work.

**The Order:**

0. **Update the audit** so every finding says where it gets fixed. No code.
1. **Foundation:** the entity-kinds table, settings' own home, the four standalone defects (section I), and the Trash fixes that need no later phase.
2. **One reader per kind of file,** with the index seed committing in batches, the notices for unreadable files, and outside-created files stamped when the app first sees them.
3. **One path for every change:** the app's own writes go through the step that handles outside edits, that step stops re-reading the whole Nexus for routine events, the hand-built confirm system is deleted, and the window receives changes.
4. **Contexts and Properties:** the one lookup and the listed bugs.

Each phase ships on its own, and the app works normally after every one. Phase 1's settings move removes the rebuild a toggle costs and the toggle's brief rollback (F-194).

#### Architecture

**The Law:** Every change to a Nexus file, whether the app, an outside tool, or Sync made it, is one file event through one path: the event is classified once, the changed file is read by the one reader for its kind (from the bytes in hand when the app wrote them), and the picture, the index, and the window's pushes all follow from that. The picture's change is described once, as the difference between the picture before and after, and the window applies that description. Configuration sits beside the entity records rather than at the picture's root, holding each setting once. An event the path can't place re-reads the Nexus, so a write nothing was built for is slow, never wrong.

**Conditions:**

- **Nested Store:** The picture keeps its nested shape, addressed by path, with an id lookup beside it. The host updates it through path-addressed steps in `Core/Nexus/treePatch.ts`; the window applies the difference the host sends.
- **Safety Properties:** Twelve were judged. Nine stay exactly as they are: echo suppression by bytes, the single-flight walk with stale-walk discard, the parse cache's racy window, per-file locks with strict read-modify-write, the index seed's database-identity bail, a value write resolving its property inside the file's lock, the live writers' rule never to shrink a Context tag they can't resolve, the walk fallback, and the root pin. Three change form and are re-earned in tests before anything they guard is removed: confirm-by-re-read (the app's write is applied from its own bytes through the watcher's step), reply-before-push (the push leaves before the reply, so the reply finds the picture already current), and `stabilize`'s identity (the host keeps identity when it applies an event, and the window applies differences). Events apply in the order their writes landed, since each write applies its own event before it returns.
- **Self-Healing:** A difference heals only what it names, so each push carries a version, and a window that misses one asks for the whole picture.
- **Speed:** Every phase holds the 10,000-page requirement.
- **Errors:** A host-side error the user can act on (an unreadable file, a duplicate, a failed stamp) reaches the window's existing notice through the change push (section M). The whole-app error table is F-621.

**Core and Prospects:** The core is the four-point mandate, the riders, and the ID and notice decisions (sections A through J). The prospects (the side entry points, the error table, shared registry machinery, tiles as records, Agenda's shape, and a Sync protocol rework) are allowed later and aren't foreclosed.

---

### Decisions

#### A — Goal and Guardrails

- **A-1:** [CONFIRMED] The goal is fewer errors and less complexity without any loss of integrity. The line count is reported, not targeted, and it is a real measure of the surface area this work exists to shrink.
- **A-8:** [CONFIRMED] Clarity and purpose over cleverness. The plan prefers plain code to machinery that is "good" but not needed; each abstraction, projection, or generic layer the plan adds is justified in its task against the simpler alternative, and the simplification review holds every phase to that.
- **A-9:** [CONFIRMED] The standard every call Claude makes here is held to, and the plan's test of done. The finished change is judged as a change to a codebase, by a reviewer who knows nothing of its intent beyond `CLAUDE.md`, the code before and after, and what the difference itself shows, and who is trying to prove it made things worse. It passes when that reviewer can't show otherwise on these counts:
  - **Less Mass:** fewer functions, helpers, wrappers, callers, layers, types, and duplicated logic for the same behavior; new code exists only where it buys a matching improvement.
  - **Less to Understand:** what exists, where it lives, what owns it, and what calls it are found with less searching than before, by a developer and by a non-technical reader.
  - **Clearer Boundaries:** where the next change belongs is obvious, with no arbitrary choice between layers or helpers.
  - **Net Improvement:** complexity is removed, not moved, renamed, or outweighed by what replaced it.
  - **Intentional:** the result reads as designed, with no temporary structure, transitional layer, dead path, leftover, or second way of doing one thing.
  - **No Unexplained Divergence:** no duplicated source of truth, competing pattern, or inconsistent boundary without a reason evident in the code.
  A change that adds mass, ambiguity, duplication, indirection, or inconsistency without that justification isn't finished, and the reviewer's findings are closed before it is called so.
- **A-2:** [CONFIRMED] No regressions are accepted. Reductions that change what the app does in a negative way are rejected, including leaving a deleted entity's references in other files and dropping deleted names from saved views only when read.
- **A-3:** [CONFIRMED] The work finds where regressions are born and changes how they're born, so that new ones don't happen and copies that should agree do. It shouldn't over-collapse what deserves to stay separate, and shouldn't manufacture critiques where the existing system is actually the correct one. It targets the issues where each fix breeds more inconsistencies without targeting the rework of the source of the issues themselves.
- **A-4:** [CONFIRMED] The scope is expected to be smaller than the original hunch assumed; nothing enters it on the hunch's strength alone.
- **A-5:** [INFERRED] This work defines no new guarantee for the layer beyond the notices sections E and M add. It restores the ones the Feature docs already state, such as every write confirming itself and no write lost or silently undone, and anything beyond those is out of scope.
- **A-6:** [CONFIRMED] Staying fast at 10,000 pages and beyond is mandatory. Opening, indexing, Context resolution, and the per-change cost the audit measured (F-186, F-197, F-198, F-200) are requirements.
- **A-7:** [CONFIRMED] Success is fewer separate mechanisms and fewer findings: each piece has a clear area, adding a feature costs less, and the codebase reads as one design. It is measured against the audit's *What Extending Costs Today* table and the investigation's complexity table, less that table's two write-channel rows, which belong to F-611.

#### B — Changes Report Themselves

- **B-1:** [TECHNICAL] The app's own writes are file events. Every app write already passes one point with its bytes (`recordWrite`, `Core/Files/writeEcho.ts:20`), and every write handler already passes one gate (`withWriteRoot`, `Core/Contract/handlers.ts:97`). A write reports its event as it lands, and the event is applied through the watcher's own step (`applyWatchEvents`, `Core/Nexus/watchPatch.ts:202-226`) inside that write's continuation, from the bytes the write held; the gate then settles what the events owe (`settle`, `Desktop/FileWatch/watcher.ts:153-198`) and pushes before the reply leaves. No writer returns anything, and a new write is confirmed without wiring.
- **B-2:** [TECHNICAL] The system that confirms the app's writes today is deleted: the host's routing table and its re-reads (`Core/Nexus/mutatePatch.ts`), the confirm helpers (`Core/Nexus/confirm.ts`), the two notebooks of recent writes (`Core/Nexus/valuesChanged.ts:10-35`, `:122-143`), the hand-placed index calls, the request-keyed transforms in `treePatch.ts`, and the window's own routing switch (`Core/Session/nexusSlice.ts:243-280`).
- **B-3:** [TECHNICAL] The window receives the difference between the picture before and after a settle, with a version, and applies it; the push leaves before the write's reply, so the reply finds the picture current. The whole picture is still sent on open, Reload, and a missed version.
- **B-4:** [INFERRED] Order lists live in the model under one ranking rule: an entity missing from an order list sorts by title, as every open does today (`Core/Nexus/order.ts:25`). This retires the re-reads that pin a created or reordered entity's place (`mutatePatch.ts:162-187`) and the window's different rule, which puts it last (`treePatch.ts:401-406`).
- **B-5:** [INFERRED] Checked agreement comes from two tests instead of one per writer: applying a difference to the picture it was taken from yields the picture it was taken to, for any pair of pictures; and after every write the tests perform, the settled picture equals a fresh read of the files. A write no arm places re-reads the Nexus, so an unwired write costs time and can't go stale.
- **B-6:** [TECHNICAL] The watcher's step already carries the parity tests this needs (`Core/Nexus/watchPatch.test.ts`), so the move needs no side-by-side harness: each kind of event the app produces gains its arm and its parity test before the confirm route that handled it is deleted.
- **B-7:** [INFERRED] The gaps this closes: option adoptions that reach no copy (`Core/Properties/optionOps.ts:83-112`), exclusion-clear value notes never flushed (`Core/Settings/handlers.ts:39-42`), the banner re-read that can't carry the banner, and single-entity changes that re-read the whole Nexus.
- **B-8:** [INFERRED] The side entry points stay separate channels until F-611, and they need no confirm call of their own, since the gate settles whatever they wrote. `confirm.ts` goes whole: the settle already re-reads under a moved exclusion scope and re-arms the watcher.

#### C — One List of Entity Kinds

- **C-1:** [CONFIRMED] One table, `Core/Nexus/entities.ts`, is the foundation; its contents are [TECHNICAL], and its name and the kinds it lists are Nathan's. It lists Collection, Set, Page, Context, Space, Task, and Event from the start, so Agenda adds behavior later, not kinds. It is limited to what the data layer derives from it: node, record, mutable, and container kinds, the container test, and each kind's ID mark. Today those lists sit at `Core/Nexus/tree.ts:9`, `record.ts:4`, `mutateRequest.ts:32`, and `schemas.ts:72`. The settings-file names stay in `Core/Paths/nexusPaths.ts`, keyed by folder kind with the Agenda folders beside them, since `Core/Paths` imports nothing from `Core/Nexus`; the reader for each kind is chosen by the event arm and the walk. This is related to the existing audit finding F-212.
- **C-2:** [CONFIRMED] F-212's navigation and icon lists, stored-reference admission, and removal of the unused `context` selection kind stay with W16 and read from the same table. When the table lands, F-212 is rewritten to describe only those remaining parts, naming `entities.ts` where it proposes `kinds.ts`. The older-build pin erasure is a standalone defect.

#### D — Readers and Settings

- **D-1:** [TECHNICAL] One reader per kind of file: pages (today `readPageRecord`, `readPageDetail`, and `extractPageIndex`), Spaces (three readers), and folder settings files (two builders). The open, the app's own confirmations, outside edits, sweeps, and the search index read through it.
- **D-2:** [INFERRED] Opening a Nexus stamps from the walk's own read of each page (F-197). The search index keeps its stat-gated read, which covers files the tree doesn't hold, and commits in batches with its statements prepared once (F-198). A write hands the index the text it wrote (F-206).
- **D-3:** [TECHNICAL] Configuration leaves the picture's root: settings, crops, page metadata, homepage, and ordering become their own record, each setting held once. A settings toggle stops re-identifying the root and rebuilding every lookup table, and the settings copies drop from seven to three plus the page's applied styles. This is in memory only; `settings.json` and every other file keep their format [CONFIRMED].
- **D-4:** [INFERRED] Records are immutable values, so a walk can no longer write into objects the parse cache shares (F-211).

#### E — IDs and Unreadable Files

- **E-1:** [CONFIRMED] Stamping an `ID:` into every id-less page, and a settings file into every adopted folder, on first open is intended. The PRD's "byte-identical until the user edits them" sentence is the stale one.
- **E-2:** [CONFIRMED] A page whose `ID:` isn't a Pommora ID, such as Obsidian's `ID: 42`, stays out of the app everywhere, `page:open` included, and is reported as **'Item' contains unreadable metadata** with **Try Again** giving it a new Pommora ID.
- **E-3:** [CONFIRMED] Try Again replaces the foreign `ID:` value. Today's rule that an Unknown file is never stamped over forbids that; the explicit user action is what allows it, and CorePM's *§Adoption* is reconciled to say so.
- **E-4:** [CONFIRMED] A file whose `ID:` is a valid Pommora ID of the wrong kind, such as a Task's file in a Pages folder, is reported as **'Item' contains invalid metadata** with **Try Again**, which re-reads the file once the user has moved or corrected it and never mints a new ID, since minting would turn the Task into a Page.
- **E-5:** [CONFIRMED] Two files never keep one ID. The copy takes a fresh ID with copies of its metadata and device rows, and the original keeps its own: the path the store already held, or with no such evidence, the eldest by birth time. A copy that can't be read or written is reported as **'Item' contains unreadable metadata** with Try Again, the pattern `Core/Interface/Notifications/notifications.ts:57-62` already provides.
- **E-6:** [CONFIRMED] A page or folder created outside the app mid-session gets its permanent ID when the watcher first sees it, through the same stamp the open uses, once the batch has settled so a tool mid-write has finished. A file the stamp can't write is listed unreadable with Try Again, the E-2 treatment, rather than shown under a temporary ID. Temporary IDs are retired with it: nothing mints one, and the eleven places that special-case one (order lists, band ranks, the re-mint ledger, the rename and move confirms, `stampListed`, the page-metadata re-read, `idTime`'s guard, and the window's two pin guards) go. A folder made at the Nexus root while the app runs becomes a Collection once it holds content, as it would at the next open, and a Space folder whose `_space.json` has no ID is stamped like any other folder. The NexusOS mirroring script carries no frontmatter in either direction, so a stamp never mirrors back; a file Sync lands already carries its ID.
- **E-7:** [CONFIRMED] A Collection or Set whose settings file doesn't parse is reported as **'Item' contains invalid metadata** with **Try Again**, the E-4 treatment, through the same notice and the same Try Again as every other listed file. It stays out of the app until the file is corrected, and correcting it brings it back with or without Try Again. While it is out, what belongs to the pages beneath it is kept: their open tabs, pins, links, and ledger entries. A tab stored from a previous session isn't restored when the settings file is already damaged at launch, since a stored tab holds an id alone and its page isn't in the tree to resolve it.
- **E-8:** [INFERRED] The notice's wording follows what Try Again can do. *Invalid metadata* names a file the user corrects first (a wrong-kind ID, a damaged settings file, a page whose frontmatter doesn't parse), and Try Again re-reads it. *Unreadable metadata* names a file Try Again repairs by stamping (no ID, or another app's ID). Try Again acts on the one file its notice names. A tab open on a page that becomes unreadable closes.

#### F — Trash

- **F-1:** [CONFIRMED] The Trash's restore is fixed in this work.
- **F-2:** [INFERRED] Delete and restore move entities through the same move create and move use (`relocatePage`, `moveFolderEntity`), which reports a rename to Sync; `relocatePage` also takes the file's lock, where the folder movers take none. Today delete's `settleBundle` (`Core/Trash/bundle.ts:37-43`), which runs under delete's own lock, and restore (`Core/Trash/spend.ts:249-253`), which takes none, each move on their own without the rename report.
- **F-3:** [CONFIRMED] Restore and create share one name-stepping rule, restore's: a name that already ends in a counter keeps counting, so a taken `Ideas (2)` becomes `Ideas (3)` everywhere, where create gives `Ideas (2) (2)` today. Create, a page rename (`Core/Nexus/rename.ts:37`), and asset adoption (`Core/Assets/assetWrite.ts:22`) keep checking the disk for a taken name, and step it by the same arithmetic as `freeName` (`Core/Paths/names.ts:53-61`), which retires create's own stepping (`:63-72`). Restore's own path guard, which no input reaches, is deleted.
- **F-4:** [INFERRED] A restore of a page, Set, or Collection lands through the one path without re-reading the Nexus. A Space or Context delete, and a restore of one, still re-read it: members a sweep skipped would otherwise keep a link the read drops.

#### G — Contexts and Properties

- **G-1:** [CONFIRMED] Contexts and Properties stay two separate things, and their problems are fixed in this work.
- **G-2:** [DEFERRED] Sharing one journal-and-replay path and one sweep loop between them is audit finding F-622. It lies outside the law, and its one commit order for both registries changes crash recovery for one of them, which has no product ground to decide it on. Crash recovery for Context and Space deletes goes with it: it is a third replay machine beside the two F-622 merges, and a delete cut short keeps its write-ahead record and finishes when deleted again.
- **G-3:** [INFERRED] The problems fixed: the seven ways of working out each Context's Spaces and the eleven disk re-reads of Space files become one lookup kept current (F-200, F-201); `setProperty`, `setSpaceColor`, and `setSpaceRowOrder` run under the Contexts lock; an unreadable Space blocks tag edits of its own Context alone, where it blocked every one; a rename whose journal write was refused reports the files it skipped with Try Again, which sends the rename again to reach them and does nothing once the item has been renamed again [CONFIRMED]; a property rename, a property delete, an option rename, and an option remove report the files they skipped with Try Again, which hands the operation's record to the replay the open runs, whether or not the journal held it (F-627) [CONFIRMED]; a failed Context rename keeps the files its reversal skipped; and a Space's own property values are reconciled like a page's.
- **G-4:** [INFERRED] Three rules keep the store-built lookup safe. A value write reads the property it sets from disk inside the file's lock (`Core/Properties/setProperty.ts:46-50`). The live writers' reconcile never shrinks a tag it can't resolve (`Core/Contexts/contextResolve.ts:128-137`). A Space link write decides each far half inside that file's own read-modify-write (`Core/Contexts/contextWrite.ts:191-203`). The restore scrub keeps its deliberate drop of tags it can't resolve.
#### H — Outside Edits

- **H-1:** [CONFIRMED] Outside edits from Obsidian, Finder, and Sync appear live, as they do today, through the same path as the app's own writes (B-1).
- **H-2:** [INFERRED] The path reads each changed file through its one reader. Full re-reads stop for routine events: a folder added or removed, a file beside pages the tree never reads, and an edit of `properties.json` or the Context registry (`Core/Nexus/watchPatch.ts:165`, `:167-168`, `:184`). A foreign-ID page stops triggering a full re-read on every save (`:144-145`).
- **H-3:** [INFERRED] One event the path can't place no longer skips the other pages' work in its batch (`watchPatch.ts:215`).
- **H-4:** [INFERRED] When a full re-read does happen, the window receives what differs instead of the whole picture. Sync's landings stay outside edits: they write without an echo record, the watcher sees them, and a landed folder no longer costs a re-read of the Nexus.

#### I — Standalone Defects

- **I-1:** [CONFIRMED] In scope: native menus pick up a `commands` change without a relaunch (`Desktop/main.ts:172`, `:324`, `:401`); `matrix.json` has one writer (`Core/Nexus/configReach.ts:379` beside `Core/Matrix/matrixFile.ts:17`); a duplicated Context ID can be re-minted (`Core/Nexus/remint.ts:68`); and two Nexus opens can't interleave (`Core/Nexus/session.ts:15-23`).
- **I-2:** [INFERRED] They land in the foundation phase, since none depends on a later one.

#### J — Shape, Order, and Staging

- **J-1:** [TECHNICAL] The picture stays nested; the flat store is rejected.
- **J-2:** [CONFIRMED] The work is one multi-phase plan whose phases each ship alone, with the app usable between them.
- **J-3:** [TECHNICAL] The phase order is the one under *§Overview*, by dependency: phase 1's settings move and entity table stand alone; phase 2's readers are what phase 3's one path reads through, and they retire temporary IDs before the path has to carry them; phase 4's lookup is kept current by phase 3's path. Following the audit's finding order was rejected because each step designed alone leaves one fact with two homes. Having about 40 writers each return a description of their change was rejected for the one-path design (B-1): it rebuilt the second system where this deletes it, a writer that forgot to report left the picture stale, and it removed about 300 fewer lines.
- **J-4:** [TECHNICAL] A duplicate ID is re-minted at the next open, as today. Re-minting when the watcher first sees the copy would add a path beside the open's without removing it. E-5's notice for a copy that can't be re-minted waits on the walk leaving a second claimant out of the tree, which is its own follow-up.
- **J-5:** [CONFIRMED] Folding the 40 side entry points into `mutate` is left out and recorded as audit finding F-611 in W14, sequenced after F-187.
- **J-6:** [CONFIRMED] Feature work doesn't pause for this. The plan doesn't design around parallel work; each phase re-pins against the code at its start.
- **J-7:** [CONFIRMED] This work lands before Mobile and Sync.
- **J-8:** [CONFIRMED] A slice that would make the plan unmanageable becomes its own plan, and the planning session says so when the re-grounded reports show it.

#### K — The Audit

- **K-1:** [INFERRED] Fixed as written, by the phase that owns their area: F-197, F-198, F-200, F-205, F-206, F-209, F-210, F-211, and F-212 (as C-2 rewrites it). F-196's tree-apply race is already closed, and its remaining loaders keep the audit's schedule. F-200's cached lookup, keyed on the Contexts it reads, is the lookup G-3 keeps current. F-603 lands in phase 3 with Nathan's ruling: a new Collection always lands last, whatever New Folder Placement says.
- **K-2:** [INFERRED] Six findings get their fix rewritten, because this work replaces what they propose: F-186 (the window receives the difference between the picture before and after a settle), F-187 (both routing tables are deleted: the app's writes settle through the watcher's step, and the window applies differences), F-188 (the host's caches key on the entity arrays they read and survive a configuration write; listing every claimant of an id waits on the duplicate follow-up), F-194 (settings in their own home, applied one setting at a time), F-199 (the watcher reads one file at a time instead of gaining three special cases), and F-201 (the world comes from the store, with no disk fallback, under G-4's rules). F-611's sequencing follows the rewritten F-187.
- **K-3:** [INFERRED] The problems the investigation found that stay open after this work are added as findings, each reviewed by someone other than its finder before entry: the test-only container schemas, delete's missing metadata and heading-link cleanup, the Trash's upload of excluded folders to Sync, and an in-app Space or Context create or rename that doesn't relink already-tagged pages. The ones this work resolves are never written in (K-5).
- **K-4:** [INFERRED] W14's and W15's openers say how their findings land, and the Verdict's "none need a redesign" is corrected for this area only. Findings this work doesn't take on, among them F-240, F-242, F-248, F-249, F-527, and F-604, keep the audit's own schedule.
- **K-5:** [CONFIRMED] A finding this work resolves is removed from the audit by the phase that resolves it. A finding that stays open, in whole or in part, is reworded in place to what remains.

#### L — Documents

- **L-1:** [INFERRED] Each phase's closeout reconciles the Feature docs it makes true or false, using *§Feature-Doc Divergences* in *Data Layer — Investigation* as the list: CorePM, DesktopPM, NexusRecordPM, ContextsPM, PropertiesPM, the PRD's *§Storage Philosophy*, and the project `CLAUDE.md` rules on the Platform seam and read-write separation.

#### M — Error Surfaces

- **M-1:** [DEFERRED] The whole-app error table proposed in *Error Surfaces — Brainstorm Brief* is audit finding F-621, with the brief's five questions carried there. It doesn't foreclose anything here: the table decides surfaces, and the notices this work adds become rows in it.
- **M-2:** [TECHNICAL] This work keeps the one piece it needs. The host has no notice of its own, so a host-side error the user can act on (E-2's unreadable file, E-4's wrong kind, E-5's duplicate, a failed E-6 stamp) travels with the change push, or with the whole picture during open or Reload, and the window's existing reporter shows it with its Try Again. The copy for those notices lives beside the reporter's existing copy in `Core/Interface/Notifications/notifications.ts`.

#### Sources & Reasoning

- `.claude/Planning/Data Layer — Investigation.md` The evidence behind every decision, read at `132a2f111`. It sizes each area, lists the audit findings the law closes, and names the safety properties the plan re-earns.
- `.claude/Planning/Data Layer — Investigation Reports/` The eight slice reports. The planner re-grounds in slices B (write path) and C (watcher) for phase 3, A (readers) for phase 2, E (Contexts and Properties) for phase 4, and F (Trash and Sync) for section F.
- `.claude/Planning/Pommora Codebase Audit.md` The audit, including F-611 in W14. Its findings are the checklist the plan closes, and K-1 to K-4 say how each lands.
- `.claude/Planning/Error Surfaces — Brainstorm Brief.md` The error-surfaces proposal deferred as F-621.
- `Core/Nexus/treePatch.ts` The tree's existing change steps, which become the shared applier under the nested store (J-1).
- `Core/Nexus/mutatePatch.ts`, `Core/Nexus/watchPatch.ts`, `Core/Nexus/valuesChanged.ts`, `Core/Nexus/confirm.ts` The routing, re-read, notebook, and confirmation code phase 3 retires, and the watcher's step every change then runs through.
- `Core/Session/nexusSlice.ts` The window's own routing switch and whole-picture apply, which phase 3 replaces.
- `Core/Interface/Notifications/notifications.ts` The notice and Try Again pattern E-2, E-5, and E-6 reuse (M-2).
- `Core/Contract/result.ts` `ErrorCode`, the closed set of refusal codes the error table maps onto.
- `Core/Nexus/mutatePatch.test.ts`, `Core/Nexus/watchPatch.test.ts` The existing walk-parity assertions B-5 generalizes.
- `.claude/PommoraPRD.md`, `.claude/Features/CorePM.md` The stale "byte-identical" sentence (E-1) and the adoption rule E-3 amends.

---

#### Constraints

- File formats on disk stay as they are (Locked Decision: Legibility & Translation).
- The databases stay regenerable indexes holding nothing that must survive sync (Locked Decision: Database).
- A safety property that gets re-implemented is re-earned in tests before anything it guards is removed.
- The parity tests and confirm-ordering tests are rewritten alongside the code they guard; slice H estimates 8,000 to 12,000 test lines are touched across the plan.
- Every phase holds the 10,000-page requirement (A-6).
- Pommora's codebase becomes "smaller" in terms of what it's expected to maintain, and the effort needed to understand it, without sacrificing clarity or product-level details.

#### Rejected

- Letting a delete leave its references in other files; a new Context or property under a deleted name would silently pick up stale keys.
- Dropping deleted names from saved views only when read; a restored item's view filters would come back.
- Replacing the nested picture with a flat list; its share is about 150 lines, and it carries the largest test blast radius.
- Keying the stored picture by id alone; two files can share an id, and an id computed from a path changes on rename.
- Holding duplicate IDs as a lasting state.
- Keeping temporary IDs beside the watcher's stamp (E-6); a file is either stamped or reported.
- Making Contexts and Properties one kind of thing.
- Deleting safety machinery to reach a line count.
- Dropping the window's picture and asking the host for everything it draws; every scroll and filter would wait on the host, and its cache would become a copy again.

#### Open Items

All technical, settled by the planning session:

1. Duplicate-ID re-mint timing: at the next open (J-4).
2. The side-by-side comparison of old and new confirmation during the move: none; the shared test helper asserts the settled tree against a fresh read for every mutating test (B-6).
3. The shape of `entities.ts` and every name the plan introduces or changes: approved by Nathan as the plan's AFTER code spells them.

#### Prospects

- Folding the side entry points into `mutate` (F-611), after the rewritten F-187; don't-foreclose: a folded entry point needs no confirm of its own, since the gate settles whatever it wrote (B-8).
- The whole-app error table (F-621); don't-foreclose: the notices this work adds become rows in it.
- Shared journal, replay, and sweep machinery for Contexts and Properties (F-622); don't-foreclose: G-3's one lookup is what both would read.
- Tiles as records behind one entry point; unsized; don't-foreclose: `entities.ts` leaves room for a tile kind.
- Agenda's Tasks and Events in the store; not investigated; don't-foreclose: `entities.ts` already names both kinds.
- A Sync protocol that carries facts spanning several files, such as a Context's title in three places (F-605); a separate cycle.

#### Next Steps

1. The slice reports are re-grounded at HEAD for the trimmed mandate and updated in place; one reconciling agent then resolves what the reports say twice or say differently and hands the planner one settled account, and the investigation's figures follow it.
2. Phase 0 updates the audit per K-2 to K-5, with each new finding reviewed by someone other than its finder.
3. The plan is written with `writing-plans-v3`, one phase at a time, with each task's AFTER section as close to the finished code as its length allows, and every phase's line outcome explained in its summary.
4. The plan is reviewed per phase by one simplification reviewer looking outward and inward and one adversarial reviewer, and over the whole by one simplification and one adversarial reviewer; one agent reconciles every finding, and only the reconciled findings reach Nathan.
5. The executed work is finalized by the context-free review A-9 describes.
