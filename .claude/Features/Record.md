### Record

Pommora can always answer *where is this now*; the record closes *where was this then*. Two mechanisms, each the smallest thing that does its half — they share a module boundary and nothing else.

- **Provenance** — where a departed entity belonged and what it carried. A paired JSON beside the artifact in `.trash`, created by the delete, read by restore, deleted with its artifact.
- **Baseline** — what the walk last saw. A derived, per-machine projection in `nexus.db`, written once per open, read once per open, rebuildable by definition.

### Provenance — the Pair

Every nexus-trash delete writes one JSON beside the trashed artifact, named from the trash primitive's final stamped destination so pairing is injective through de-collision. It records **ids, never name-based locations** — a rename rots a name, an id survives it.

- **The parent is a discriminated union** — the nexus root, a container by sidecar id, a Context by registry id, or `unaddressable` — each recorded honestly rather than pretending to a bare id. The parent is best-effort: unresolvable degrades to `unaddressable`, and the pair still writes.
- **Per-kind payloads ride the same pair.** A Context carries its own registry entry (its identity lives only in the registry, which the delete erases) plus the membership map — per swept root, the Space list its stripped key held, each Space as id + title. A Space carries the id-bearing roots that tagged it. Pages and ordinary containers carry parent + identity and nothing else. The **property delete's recovery net is the pair's one artifact-less variant** — nothing is trashed, so it lands flat in `.trash`, atomic and de-collided, values keyed by page id.
- **Best-effort, all-or-nothing per pair.** A pair failure never fails the delete — the artifact is already moved, and a missing pair degrades one entity to hand-restore. But a REQUIRED payload failing to gather (a Context whose registry entry cannot be read) writes no pair at all: a present pair that is silently incomplete would be trusted by restore. Anything that leaves a pair thinner than the truth — a skipped or admission-refused sweep root, an id-less tagging root, a collapsed duplicate id — marks it **partial**.
- **Gathering follows the delete arm's real order**: the scoped id reads and the registry entry before the erase (the title→id window closes there), membership during the unlink sweep, the pair name after the move returns. The Context read is scoped to its own folder — an unreadable sidecar in an unrelated Context is not this delete's evidence and never suppresses its pair.
- **System-trash mode writes no pair** — the artifact leaves the nexus and there is nowhere valid for a pair to point.
- A pair whose artifact is gone (trash emptied by hand) is an orphan the listing prunes as encountered, exempting the artifact-less variant. A file that fails validation is not a pair and is never pruned.

The delete's unlink sweep itself holds two laws the pair depends on: **it never strips a passenger** (a root under the delete target is leaving with its owner; its keys stay true in the trash — the rename cascade, sharing the same sweep, never skips), and **it returns what it removed** — touched, skipped, admission-refused, and the captured values per root.

### Resolution and Restore

The record **decides**; the acting code moves. The resolver takes a pair and the current tree and returns a placement — directory, final name, and for a Space or Context the final title — or a typed refusal: parent gone, parent cannot hold this kind, parent unaddressable, id already live. A live id outranks every other answer: nothing may write over a living identity.

- **Final titles are the resolver's, never the recorded ones.** Title uniqueness holds only at a moment — an impostor can mint a freed title while the original sits in trash — so a collision disambiguates for every kind, Contexts included, and the restored folder, registry entry, and every re-applied membership key all use the final title.
- **The restore op is a mover.** It re-resolves inside the op (the world may have changed since listing), places the artifact, deletes the pair, and per kind re-enters the registry (appended — recorded positions rot) and re-applies membership through the shared reconciliation loop: an entry is spent only on a landed write, kept on refusal, skipped when its root has since died. Membership joins on ids against the as-restored folder names. A target the tree cannot see occupying the resolved location refuses rather than clobbers.
- The same spend-per-landed-write loop serves the Remove cache's restore — the loop is shared, the storage is not.

### Baseline — the Compare

The open path owns **one explicit walk**, after the database opens and before the watcher starts, so the baseline latches what the closed window left rather than whatever a sync daemon materializes first. A mid-session re-point — the nexus rename, re-adopting the already-open nexus — stands down: latching a live session would diff it against the launch baseline and destroy the closed-window record.

- **The diff runs over the union of ids with absence first-class**, on scalar fields only. **Existence has three states** — present, absent, unreadable: the walk names every root it saw but could not read (a corrupt sidecar, an Unknown or unreadable page, an unusable contexts registry — which would otherwise read as mass deletion), and the baseline carries those entries through as unreadable instead of reporting a hand-edit typo as a deletion.
- **Compare is silent.** The drift row keeps the last **non-empty** diff, so an uneventful open never overwrites the one interesting record. No surface, no notification; a surface, when wanted, reads what is already recorded. Ids in flux — ambiguous-marked or currently duplicated — leave both sides of the diff.
- An absent prior baseline is a distinct outcome: latch and report nothing. The whole pass is best-effort end to end — a failed walk or row write retains the prior record and the open proceeds.

### The Re-Mint

A duplicated id — content and container alike — stops sharing its twin's identity at the next open. The prior session's baseline names the path that legitimately held each id: what sits there is the original, every other claimant takes a fresh id. The verdict rests entirely on the recorded path, so the refusal states are exact — no baseline, no entry, an unreadable recorded path (never guess), no claimant at the recorded path (unadjudicable — the writer drops the entry, since no future session can adjudicate either).

- **The refusal preserves its evidence and spends or drops it, never hoards it.** A deferred id keeps its prior-session path marked ambiguous; the mark is spent the session its path answers again. An id with no prior entry records one claimant unmarked so the *next* open adjudicates against a stable reference.
- **The copy takes duplicates of the device-local rows; the original is untouched by construction.** Folds, active view, heading columns, and preview origins copy to the fresh id; a Space's block document copies with each view tile's payload ids re-minted — two boards must never share one. A copied container's sidecar re-mints its saved views' ids in the same write. Thumbnails regenerate on use; order arrays need nothing — the entity re-enters by title.
- Disk writes first, row copies second: a refused frontmatter write skips that target with the defer standing, and a row failure leaves the copy on default chrome — never a half-minted identity.

### Pending

**Every surface** — the restore trigger, the trash browser, any compare view. The actions they invoke all exist and are end-to-end tested; the surfaces read and call what already ships.

**Crash-safe cascades** — the write→act→settle shape the pair + a settle marker could cover nearly free.

**Property and frontmatter change capture** as event payloads; **git as opt-in content history** — complementary, never the record, and Pommora must never auto-commit.
