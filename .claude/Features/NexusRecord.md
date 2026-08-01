### NexusRecord

Pommora always answers *where is this now*; the record closes *where was this then*. Two mechanisms, each the smallest thing that does its half, sharing a module boundary and nothing else:

- **Provenance** — where a departed entity belonged and what it carried. A JSON inside the artifact's own deletion bundle in `.trash`, written by the delete before it destroys anything, read by restore, spent with the bundle.
- **Baseline** — what the walk last saw. A derived, per-machine projection in `nexus.db`, written once per open, read once per open, rebuildable by definition.

The governing law is **ids, never name-based locations** — a rename rots a name, an id survives it. Everything either half stores joins on ids; titles ride along only as labels.

### Provenance

#### II. The Bundle

Every nexus-trash delete produces one folder in `.trash`, under the chain the entity was deleted from and named for a stamped copy of its own leaf. Inside sit two things: the artifact, under the name it always had, and its record. The container is the whole point — a record inside the bundle cannot be separated from what it describes by a rename, a hand-move, or a sync race, and the bundle travels as one unit. In-the-bundle won over beside-the-artifact (a sibling drifts, and naming the record after the move's outcome makes writing it first impossible), over on-the-artifact (three shapes across kinds, a lock against the autosave, a strip pass on the way back), and over a central document (`.nexus/` is watched, a per-gesture rewrite buys re-walks, entries nothing spends).

The artifact keeping its real name is what lets the record drop a stored basename and a stamped-leaf parser both — a user's own `12__Notes.md` was never distinguishable from a de-collision counter. The record shares that folder, so it wears the sidecar convention's leading underscore: no name a user is allowed to choose can collide with it.

Each record carries a **parent as a discriminated union**: the nexus root, a container by sidecar id, a Context by registry id, or `unaddressable`. A parent that cannot resolve records `unaddressable` honestly rather than pretending to a bare id, and the record still writes.

Per-kind payloads ride the same shape. A **Context** carries its own registry entry — its identity lives only in the registry, which the delete erases — plus the membership map: per swept root, the Space list its stripped key held, each Space as id + title. A **Space** carries the id-bearing roots that tagged it. Pages and ordinary containers carry parent + identity and nothing else. A **property delete** takes the same shape with nothing to hold: its bundle carries the record alone — the definition, the Collections that assigned it by sidecar id, and the values keyed by page id.

#### II. Write-Ahead

**The record is written before the destruction it describes.** The bundle is minted while the artifact is still live, the record lands inside it, the sweep or erase runs, and the artifact moves in last. Its presence is the settle marker: a bundle holding no artifact is a deletion that never finished — skipped by the listing, never removed, left on disk as evidence of what was taken. A delete cut short leaves a record naming what it lost rather than silence.

That ordering is the whole protection, and it replaces every guard the old shape needed: a record that cannot be written faults the delete before anything is destroyed. The one cost is named deliberately — a process that dies between a sweep and the settle leaves the sweep done and the folder still live, with the swept membership hand-readable in the record but not yet spendable in-app.

Gathering follows from that. The scoped id reads and the registry entry are taken before the erase, since the title→id window closes there; membership captured mid-sweep is patched in on the way past, with `partial` recomputed by the gatherers rather than cleared, so a record thinner than the truth always says so. Anything that thins one — a skipped or admission-refused sweep root, an id-less tagging root, a collapsed duplicate id — marks it. The Context read is scoped to its own folder: an unreadable sidecar in an unrelated Context is not this delete's evidence and never suppresses its record.

**All-or-nothing per record.** A REQUIRED payload failing to gather (a Context whose registry entry cannot be read) writes no record at all, because restore trusts a present one — and a folder with no record is not a bundle, so that entity degrades to hand-restore rather than to something the listing would offer. **System-trash mode records nothing**; the artifact leaves the nexus and there is nowhere valid for a record to live.

A bundle IS a folder holding a record, which is what decides it — the name alone cannot, since `.trash` mirrors the nexus and a user's own folder may wear that name anywhere in the chain. A bundle's interior is trashed content rather than trash structure, so the walk stops at one and never reads a deletion out of what it holds. Nothing in the trash is ever pruned.

#### II. The Sweep's Two Laws

The delete's unlink sweep holds the laws the record depends on. **It never strips a passenger:** a root under the delete target is leaving with its owner, and its keys stay true in the trash — the rename cascade, sharing the same sweep, never skips. **It returns what it removed:** touched, skipped, admission-refused, and the captured values per root, discriminated by which id key the root carries.

#### II. Resolution & Restore

The record **decides**; the acting code moves. The resolver takes a record and the current tree and returns a placement — directory, final name, and for a Space or Context the final title — or a typed refusal: parent gone, parent cannot hold this kind, parent unaddressable, id already live. A live id outranks every other answer; nothing may write over a living identity.

**Final titles are the resolver's, never the recorded ones.** Title uniqueness holds only at a moment — an impostor can mint a freed title while the original sits in trash — so a collision disambiguates for every kind, Contexts included, and the restored folder, registry entry, re-applied membership keys, and the restored subtree's own passenger keys all wear the final title.

**A property restores by rebuilding, and only what still validates returns.** It has no artifact to place, so its record is spent rather than moved: the definition re-enters the registry, every Collection that carried it gets it back, and each recorded value is written home. The registry itself is the judge of whether the definition may return — a name another property has since taken refuses the whole restore, because two properties cannot share a frontmatter key. Below that, each value is decoded strictly against the definition and dropped unless it survives: an option that no longer exists, a value the type can no longer hold, a page that has since died. A record is evidence of what was, never a mandate to recreate it, and what didn't land is named rather than silently claimed.

The restore op is a mover branching on nothing. It takes a bundle, reads its record, and takes the artifact to place from the one entry inside the walk does not hide. It re-resolves inside the op (the world may have changed since listing), refuses a target it cannot contain — a plain basename, exactly in the resolver's chosen directory, inside the nexus, outside the trash — and refuses an occupied target rather than clobbering what nothing adjudicated. A **Context re-enters the registry before anything moves**: the append is the reversible half, the move is not, so a refused write leaves the bundle intact and the restore retryable, while a failed move rolls the append back. The entry appends at the end — recorded positions rot. Membership re-applies through the shared reconciliation loop, joined by id against the as-restored folder names: an entry is spent only on a landed write, kept on refusal, skipped when its root has since died, and what did not land is named, never silently claimed. The same spend-per-landed-write loop serves the Remove cache's restore — the loop is shared, the storage is not.

### Baseline

#### II. The Open Walk & the Diff

The open path owns **one explicit walk**, after the database opens and before the watcher starts, so the baseline latches what the closed window left rather than whatever a sync daemon materializes first. A mid-session re-point — the nexus rename, re-adopting the already-open nexus — stands down: latching a live session would diff it against the launch baseline and destroy the closed-window record. The watcher owns live-session attribution; the baseline covers only the window the app was closed.

The diff runs over the union of ids with absence first-class, on scalar fields only. **Existence has three states** — present, absent, unreadable. The walk names every root it saw but could not read: a corrupt sidecar, an Unknown or unreadable page, an unusable contexts registry (which would otherwise read as the mass deletion of every group and Space). The baseline carries those through as unreadable instead of reporting a hand-edit typo as a deletion.

**Compare is silent.** The drift row keeps the last non-empty diff, so an uneventful open never overwrites the one interesting record. Ids in flux — ambiguous-marked or currently duplicated — leave both sides of the diff. An absent prior baseline is its own outcome: latch and report nothing. The whole pass is best-effort end to end; a failed walk or row write retains the prior record and the open proceeds.

#### II. The Re-Mint

A duplicated id — content and container alike — stops sharing its twin's identity at the next open. The prior session's baseline names the path that legitimately held each id: what sits there is the original, every other claimant takes a fresh id. The verdict rests entirely on the recorded path, so the deferrals are exact — no baseline, no entry, an unreadable recorded path (never guess), no claimant at the recorded path (unadjudicable: the writer drops the entry, since no future session can adjudicate either).

**The refusal preserves its evidence and spends or drops it, never hoards it.** A deferred id keeps its prior-session path marked ambiguous; the mark is spent the session its path answers again. With no prior evidence at all, the baseline records the **eldest claimant by birth time** — a copy is born after its original, and birth time survives a rename — so the next open's adjudication crowns the likely original rather than whatever the walk enumerated first.

**The copy takes duplicates of the device-local rows; the original is untouched by construction.** Folds, active view, heading columns, and preview origins copy to the fresh id; a Space's block document copies with each view tile's payload ids re-minted — two boards must never share one — and a copied container's sidecar re-mints its saved views' ids in the same write. Thumbnails regenerate on use; order arrays need nothing, since the entity re-enters by title. Disk writes land first, row copies second: a refused frontmatter write skips that target with the defer standing, and a row failure leaves the copy on default chrome — never a half-minted identity.

### Pending

**Every surface** — the restore trigger, the trash browser, any compare view. The actions they invoke exist and are end-to-end tested; the surfaces read and call what already ships.

**Crash-safe cascades beyond the delete** — the write→act→settle shape the bundle proves out, applied to the rename and move cascades.

**Property and frontmatter change capture** as event payloads — the record shape widens additively; no entry-shape change, no differ rewrite.

**Git as opt-in content history** — complementary, never the record; Pommora must never auto-commit.
