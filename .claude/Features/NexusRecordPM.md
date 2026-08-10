## NexusRecord

Pommora answers *where is this now*; the record closes *where was this then*, through two mechanisms:

- **Provenance** — where a departed entity belonged and what it carried. A JSON inside the artifact's own deletion bundle in `.trash`, written by the delete before it destroys anything, read by restore, spent with the bundle.
- **Baseline** — what the walk last saw. A derived, per-machine projection in `nexus.db`, latched once per open against the last one, rebuildable by definition.

The governing law is ids over name-based locations — a rename rots a name, an id survives it. Everything either half stores joins on ids; titles ride along as labels.

### Provenance

#### The Bundle

Every nexus-trash delete produces one folder in `.trash`, under the chain the entity was deleted from and named for a stamped copy of its own leaf. Inside sit the artifact, under the name it always had, and its record. The record travels with what it describes — a rename, a hand-move, or a sync race moves the bundle as one unit. It wears the sidecar convention's leading underscore, a name no user is allowed to choose.

Each record carries a **parent as a discriminated union** — the nexus root, a container by sidecar id, a Context by registry id, or `unaddressable`. A parent that cannot resolve records `unaddressable` honestly, and the record still writes. A folder the filesystem handed Pommora carries no persisted id until an open stamps it, so the delete resolves that folder's kind the way the open-time pass does and mints it one; only a sidecar that exists and cannot be read stays `unaddressable`, since minting over it would replace the schema, views, and cache it still holds.

Per-kind payloads ride the same shape. A **Context** carries its own registry entry plus the membership map — per swept root, the Space list its stripped key held, each Space as id and title. A **Space** carries the id-bearing roots that tagged it. Pages and ordinary containers carry parent and identity alone. A **property delete** has no artifact, and its bundle carries the record alone — the definition, the Collections that assigned it by sidecar id, and the values keyed by page id.

#### Write-Ahead

The record is written before the destruction it describes. The bundle is minted while the artifact is still live, the record lands inside it, the sweep or erase runs, and the artifact moves in last. Its presence is the settle marker — a bundle holding no artifact is a deletion that never finished, skipped by the listing, never removed, left on disk as evidence of what was taken. A record that cannot be written faults the delete before anything is destroyed.

Gathering follows that ordering. The scoped id reads and the registry entry are taken before the erase, since the title→id window closes there; membership captured mid-sweep is patched in on the way past, with `partial` recomputed by the gatherers, and anything that thins a record — a skipped or admission-refused sweep root, an id-less tagging root, a collapsed duplicate id — marks it, keeping a record thinner than the truth honest about it. The Context read is scoped to its own folder; an unreadable sidecar in an unrelated Context never suppresses this delete's record.

**All-or-nothing per record.** A required payload failing to gather — a Context whose registry entry cannot be read — writes no record at all, and a folder with no record is not a bundle; that entity degrades to hand-restore rather than to something the listing would offer. **System-trash mode records nothing** — the artifact leaves the nexus, and there is nowhere valid for a record to live.

A bundle is a folder holding a record; the name alone decides nothing, since `.trash` mirrors the nexus and a user's own folder may wear a stamped name anywhere in the chain. A bundle's interior is trashed content rather than trash structure — the walk stops at one and never reads a deletion out of what it holds. Nothing in the trash is pruned.

#### The Sweep

The delete's unlink sweep holds the record's dependencies. It never strips a passenger — a root under the delete target is leaving with its owner, and its keys stay true in the trash. It returns what it removed — touched, skipped, admission-refused, and the captured values per root, discriminated by which id key the root carries. One page can never fail the fan-out around it: a page that fails admission or cannot round-trip its frontmatter is left byte-identical and named as refused, which is how the record admits the sweep was thin. The fan-out mechanics themselves are the write layer's (→ [[ArchitecturePM]] §The Atomic-Write Contract, [[PropertiesPM]] §Schema Mutations).

#### Resolution & Restore

The record decides; the acting code moves. The resolver takes a record and the current tree and returns a placement — directory, final name, and for a Space or Context the final title — or a typed refusal: parent gone, parent cannot hold this kind, parent unaddressable, id already live. A live id outranks every other answer; nothing writes over a living identity.

**Final titles are the resolver's, never the recorded ones.** Title uniqueness holds only at a moment — a freed title can be re-minted while the original sits in trash — so a collision disambiguates for every kind, and the restored folder, registry entry, re-applied membership keys, and the restored subtree's own passenger keys all wear the final title.

**A returning artifact is reconciled against the world it comes back to.** A bundle stays frozen at the moment of its delete while the world moves on, and replaying it verbatim would put governed keys back with nothing behind them — a value for a property deleted since, a tag for an erased Context. The content is reconciled in the trash, before anything lands, and a governed key survives only if what it names still exists. Every root the Contexts layer governs is reached — a page's frontmatter and a Space's sidecar alike. The one exception is a returning Context's own key, absent from the tree by definition and left for the post-move rekey; nothing under a trashed Context can have gone stale beneath its own key, since the whole subtree froze together.

**Restore drops; it never repairs.** A surviving value comes back exactly as the file spelled it, a multi-value key narrowing to its survivors. Standing is judged the way the destination judges it — a Space title resolves through the same coercion every live path uses, while a property value is decoded strictly against its definition. Foreign frontmatter and the body never move.

**A property restores by rebuilding.** With no artifact to place, its record is spent rather than moved — the definition re-enters the registry, every Collection that carried it gets it back, and each recorded value is written home. A name another property has since taken refuses the whole restore. Below that, each value is decoded strictly against the definition and dropped unless it survives — an option that no longer exists, a value the type cannot hold, a page that has since died. A record is evidence of what was, never a mandate to recreate it, and what didn't land is named rather than silently claimed.

The restore op takes a bundle, reads its record, re-resolves inside the op, and refuses a target it cannot contain or an occupied target. A **Context re-enters the registry before anything moves** — the append is the reversible half, so a refused write leaves the bundle intact and the restore retryable, while a failed move rolls the append back; the entry appends at the end, since recorded positions rot. Membership re-applies through the shared reconciliation loop, joined by id against the as-restored folder names — an entry is spent only on a landed write, kept on refusal, skipped when its root has since died. The same spend-per-landed-write loop serves the Remove cache's restore.

### Baseline

#### The Open Walk & the Diff

The open path owns one explicit walk, after the database opens and before the watcher starts — the baseline latches what the closed window left rather than whatever a sync daemon materializes first. A mid-session re-point — the nexus rename, re-adopting the already-open nexus — stands down; the watcher owns live-session attribution, and the baseline covers only the window the app was closed.

The diff runs over the union of ids with absence first-class, on scalar fields only. Existence carries three states — present, absent, unreadable. The walk names every root it saw but could not read — a corrupt sidecar, an Unknown or unreadable page, an unusable contexts registry — and the baseline carries those through as unreadable instead of reporting a hand-edit typo as a deletion.

**Compare is silent.** The drift row keeps the last non-empty diff, and an uneventful open never overwrites the one interesting record. Ids in flux — ambiguous-marked or currently duplicated — leave both sides of the diff. An absent prior baseline latches and reports nothing.

#### The Re-Mint

A duplicated id — content and container alike — stops sharing its twin's identity at the next open. The prior session's baseline names the path that legitimately held each id; what sits there is the original, and every other claimant takes a fresh id. The verdict rests entirely on the recorded path, and the deferrals are exact — no baseline, no entry, an unreadable recorded path, or no claimant at the recorded path (the writer drops the entry, since no future session can adjudicate it either).

A deferred id keeps its prior-session path marked ambiguous; the mark is spent the session its path answers again. With no prior evidence at all, the baseline records the eldest claimant by birth time — a copy is born after its original, and birth time survives a rename — and the next open's adjudication crowns the likely original.

The copy takes duplicates of the device-local rows; the original is untouched. Folds, heading columns, and preview origins copy to the fresh id. A copied container's sidecar re-mints its saved views' ids in the same write, and the recorded view selection travels through that same map — it names the copy's own view, and a selection with no counterpart doesn't travel. A Space's block document copies with each view tile's payload ids re-minted. Thumbnails regenerate on use. Disk writes land first, row copies second — a refused frontmatter write skips that target with the defer standing, and a row failure leaves the copy on default chrome rather than a half-minted identity.

### Known Issues

- **A process dying between the sweep and the settle** leaves the sweep done and the folder still live, with the swept membership hand-readable in the record but not yet spendable in-app.
- **The baseline pass is best-effort end to end** — a failed walk or row write retains the prior record, and the open proceeds.

### Pending

- **Every surface** — the restore trigger, the trash browser, any compare view. The actions they invoke exist; the surfaces read and call them.
- **Crash-safe cascades beyond the delete** — the write→act→settle shape applied to the rename and move cascades.
- **Property and frontmatter change capture** as event payloads — the record shape widens additively.
- **Git as opt-in content history** — complementary, never the record; Pommora must never auto-commit.
