## NexusRecord

Pommora answers *where is this now*; the record answers *where was this then*. It has two halves: **Provenance**, a JSON written into every deletion bundle in `.trash` that says where a departed entity belonged and what it carried, and **Baseline**, a per-machine projection of what the last open saw, kept in `nexus.db`. Both join on ids — a rename rots a name, an id survives it — with titles riding along as labels. The code is `src/main/provenance.ts` for the bundle and restore, `src/shared/record.ts` for the baseline's tuple and diff, and `src/main/remint.ts` for duplicate ids.

### Provenance

Every delete to the Nexus's own trash produces a bundle: a folder in `.trash`, under the folder chain the entity came from and named for a stamped copy of its own leaf, holding the artifact under its original name beside a `_record.json`. The record travels with what it describes, so a hand-move or a sync race moves the two as one unit.

**The Bundle.** Each record carries the entity's parent as one of four references — the Nexus root, a container by sidecar id, a Context by registry id, or `unaddressable` when the parent can't be resolved — and a payload by kind. A Context carries its registry entry plus the membership map its stripped key held, per swept root; a Space carries the roots that tagged it; Pages and ordinary containers carry parent and identity alone; a global property delete has no artifact, and its bundle holds the record alone — the definition, the Collections that assigned it, and every value keyed by page id.

**Write-Ahead.** The record is written before the destruction it describes. The bundle is minted while the artifact is still live, the record lands inside it, the unlink sweep runs, and the artifact moves in last, so a delete cut short leaves evidence rather than silence: a bundle holding no artifact is a deletion that never finished, skipped by the listing and never removed. The sweep strips a deleted Space's or Context's keys from every member file outside the folder being trashed and reports what it touched, skipped, or refused, and a record thinner than the truth says so with a `partial` flag. A required payload that can't be gathered writes no record at all, degrading that entity to hand-restore. System-trash mode records nothing, since the artifact leaves the Nexus entirely.

**Restore.** The resolver takes a record and the current tree and returns a placement — directory, final name, and for a Space or Context the final title — or a typed refusal: parent gone, parent can't hold this kind, parent unaddressable, id already live. A live id outranks every other answer. Final titles are the resolver's rather than the recorded ones, since a freed title may have been re-minted while the original sat in trash, so a collision disambiguates for every kind. A returning artifact is reconciled against the world it comes back to: a governed key survives only if what it names still exists, values come back exactly as the file spelled them with a multi-value key narrowing to its survivors, and foreign frontmatter and the body never move. A Context re-enters the registry before its folder moves, so a refused move rolls the entry back; membership re-applies by id against the as-restored folder names. A property restores by rebuilding — the definition re-enters the registry, each Collection gets it back, and each value is written home where it still validates — and refuses outright if another property has since taken its name.

**The Trash Frame.** The record's principal reading half is the Trash frame of the Settings window, listing every bundle `.trash` holds, one row per deleted entity across the five artifact-bearing kinds. Main shapes each row — kind and title from the artifact, the deletion time from the bundle's stamp, a breadcrumb resolved live from the recorded parent id, and whether that parent still resolves — since `.trash` is outside the watcher and the list is fetched when the leaf opens and after each action. A row's right-click restores it or gives it up: **Restore** returns the entity to the tree, or, where its recorded home no longer resolves, opens into the live places that kind may land; **Delete** hands the artifact to the operating system's trash, or erases it when **Permanently Delete Files** is on, and removes the spent bundle. Checked rows act together, and a batch names what it couldn't resolve. A deletion's own notification reads the record too: the delete answers with the bundle it minted, and **Undo** restores from that path without the frame being opened. A system-trash delete mints no bundle, so it offers no Undo.

### Baseline

The open path runs one explicit walk after the database opens and before the watcher starts, and latches what it saw as the baseline — a record per entity of id, kind, title, path, and whether it was readable — against the previous one. The diff runs over the union of ids with absence first-class: an entity the walk saw but couldn't read (a corrupt sidecar, an Unknown page) is carried as unreadable rather than reported as a deletion. Compare is silent; the drift row keeps the last non-empty diff, and a mid-session re-point leaves the baseline alone, since the watcher owns live-session attribution.

The baseline is also what settles a duplicated id. At the next open, the path the prior baseline recorded for an id is the original, and every other claimant takes a fresh id along with copies of the device-local rows keyed to the old one — folds, heading columns, preview sets, a container's saved-view ids, a Space's block document. With no prior evidence, the eldest claimant by birth time is recorded and the following open adjudicates. Disk writes land first and row copies second, so a refused write leaves the duplicate deferred rather than half-minted.

---

#### Known Issues

- **A process dying between the sweep and the settle** leaves the sweep done and the folder still live, with the swept membership readable in the record but not yet spendable in-app.
- **The baseline pass is best-effort end to end** — a failed walk or row write retains the prior record, and the open proceeds.

#### Pending

- **A compare view** — reading a bundle's frozen content against what stands in its place now.
- **Crash-safe moves and link renames** — the write→act→settle shape applied to the move cascade and the `[[link]]` rename cascade, which today are per-file with a revert.
- **Change capture** — property and frontmatter changes as event payloads; the record shape widens additively.
- **Git as an opt-in second history provider** — a second store module beside `versions.db`, complementary to the record; Pommora never auto-commits.
