## Navigation Consolidation — Implementation Plan

**Status:** Written, pending review.

#### The Law This Plan Serves

Structure supplies the information; mechanisms don't. Everything Navigation persists is keyed by ID alone and ordered by array position alone — titles, icons, and paths resolve live against the tree at the moment of use, so nothing at rest can ever go stale, and no scaffolding exists to repair what can no longer break. Alongside it, every trace of the dead Swift app's compatibility layer is removed. When this plan completes, a fresh reader must find no evidence that the old design ever existed.

#### Ratified Decisions

- **One `.nexus/navigation.json`** holds all durable navigation intent as three plain ordered arrays: `pinned`, `favorites`, `recents`. Array position is the order — no `order` numbers, no fractional keys, no tombstones, no per-pin files.
- **Entries are ID-only:** `{kind, id}`, with the id-less homepage as `{kind: "homepage"}`. No titles, no paths, no display fields at rest.
- **Whole-file writes, most-recent-wins** — consistent with the locked conflict philosophy. The no-empties rule applies: an emptied array deletes its key.
- **Recents leave `nexus.db`.** The database keeps only true per-machine chrome (tabs, previews, folds, view selections, link titles, block layouts). Navigation intent lives in the one hand-readable, agent-legible file.
- **Persisted tabs and previews go ID-only too:** their stored targets drop `path`; paths are minted at restore from the live tree. The live in-memory `SelectionState` keeps its `path` — it is the address the app actively operates on; only persistence changes.
- **`navview.json` is deleted.** Its lone banner pointer moves into `navigation.json` as the NavView's own key — the file already owns everything the NavView surface is. The banner image loses its dedicated asset folder: the pointer is the only linkage, so the image sits in shared assets and `navigation.json` names its path. `state.json` stays purely the orders file; `settings.json` stays purely "what the user chose."
- **Swift parity is removed wholesale.** Pommora is the sole reader and writer of `.nexus/` configs; Sapphire shares interpretation conventions only and reads nothing here.
- **No migration code.** Exactly two nexuses exist in the world; their files are hand-authored/hand-cleaned during implementation. No lift, no sentinel, no fallback read of the old locations.

#### Conflicts With Locked Decisions — Stated and Signed Off

- **"Favorites and pins stay files" (History)** records that *"recents, tabs and previews are ambient state whose cross-device merge has no correct answer."* Moving recents into the synced `navigation.json` overturns that clause for recents (tabs and previews stay in the db). The overturn is deliberate — one file, one read, one write, structure over mechanism, most-recent-wins accepted — and **Nathan signed it off explicitly (2026-07-29)**. The History entry resolves to the new truth in the erasure pass.
- **"Guard code divides by what it defends against" (History)** proved the tab-history lockstep repair load-bearing after a premature deletion. This plan does not delete that guard — it changes its form: restore-time hydration prunes refs that no longer resolve, mints paths for those that do, and **recomputes the history pointer as it prunes** (pruning shifts indices, so the recompute is structurally unavoidable, not optional hardening). The lockstep invariant keeps exactly one owner: the hydrator.

#### End State On Disk

`.nexus/` holds: `nexus.json` · `settings.json` · `state.json` · `navigation.json` · `homepage.json` · `contexts.json` · `properties.json` · `assets//` · `contexts//` · `nexus.db`. The `pins//` folder, `navFavorites.json`, and `navview.json` do not exist. `state.json` holds only live keys.

#### Out of Scope — Confirmed Alive, Do Not Touch

- The `adopted-` id machinery (`ids.ts`, `adopt.ts`, the reorder `persistable` filter) — it is the bridge for files created by outside editors mid-session.
- Live-selection reconciliation (existence checks + path repair on the in-memory selection after a tree push) — only *at-rest* repair dies.
- General hand-edit validation of on-disk content — files are a public interface; only Swift-specific tolerances go.
- The on-disk snake_case key names — renaming keys is churn, not cleanup.

### Phases

#### Phase 1 — Swift Parity Removal

The inventory is complete and its load-bearing claims are verified (write-only keys, caller trails, dead reads, and the two real `settings.json` files inspected). Scale: **≈107 code lines, ≈143 comment lines, ~160 test lines** across twelve source files. The work, by file:

- **`settings.ts`** (the largest concentration): the full-Swift-decodable seed (`defaultSettingsSeed` and its seven decoder-serving keys), the `ensureSettings` backfill and its three pre-calls, `defaults_version` stamping (verified write-only), and the labels translator (verified: its only callers are the seed and the backfill — no user-facing label write path exists). **Coupling to honor:** `updateSettings` passes the seed as `rmwJsonStrict`'s absent-file fallback; it becomes an empty-object seed so a write to a missing file still creates it.
- **`identity.ts`**: the Swift-decoder date shim and all four call sites (the app's real timestamp helper keeps milliseconds); the `schemaVersion` and `createdAt` seeding/backfill (both verified reader-less — `createdAt` stays as a plain-ISO field on its own merits as the nexus's birth date; `schemaVersion` goes).
- **`readNexus.ts`**: the top-level `accent_color` fallback (NexusOS is already migrated; the test nexus's `accent_color` is hand-moved to `personalization.accent` in the same session), the `sidebar_sections` label tolerance (verified absent from both real files), and the Swift-only accent alias map — deleted whole. Nathan's ruling: canonical color names only, no exchange maps anywhere.
- **The legacy chip-color map** (`LEGACY_CHIP_COLOR_MAP` and the exchange layer built on it): deleted whole per the same ruling — the palette pass-through already handles every canonical name, so `chipColorFor` collapses to palette-or-default. Verified on-disk first: the two nexuses contain exactly five legacy `gray` values (one live in the NexusOS properties registry, four in the test nexus's trash); all five hand-sweep to `grey` before the map dies.
- **`views.ts` / `schemas.ts`**: the legacy `card_size` word-decoder, the keyless-legacy group arm (the surrounding never-throws leniency is load-bearing and stays), the legacy `open_in` vocabulary coercion, and the reader-less `schema_version` sidecar field.
- **`viewIcon.ts` `tablecells`**: live in both real nexuses' sidecars, so the order is fixed — one-time hand-sweep of the sidecars to the current value first, then the tolerance deletes.
- **The dead pin migration group**: `loadOrMigratePins`'s lift branch, the legacy `pinned` field on `RecentEntry` and its validators/strippers, and the verified-dead `pinned` pass-through in the resolver (the pin list marks its own entries; the element-filtering of stored entries stays as general robustness with its comment rewritten).
- **`watcher.ts`**: the Swift-index exclusion clause.
- **Comment-only sweep** (~55 lines across ~25 files): every Swift-mentioning comment rewritten in native voice or deleted — **no survivors**, including the design-source citations (calendar behavior, color maps), which restate the design intent without the attribution. Nathan's ruling: the comments are a standing source of redundancy and confusion; the sweep is mandatory, not discretionary.
- **Tests**: the Swift-shape suites (settings seed/backfill, identity backfill, the pin-migration suite) delete; foreign-key-survival tests keep their assertions (that behavior now serves Obsidian/agents) under renamed fixtures.
- **Hand-cleaning**: both real `settings.json` files drop the seeded dead keys (`version`, `defaults_version`, `modified_at`, `show_page_icon`); both `nexus.json` files drop `schemaVersion` and the stray `schema_version`.

#### Phase 2 — state.json Cleaned, navview.json Dissolved

- Hand-clean the dead keys (`recents`, `active_views`, `cursor`, `pinned`, stray version stamps confirmed dead in Phase 1) from both real nexuses' `state.json`. No pruning code. `state.json` keeps exactly the orders.
- The NavView banner pointer moves into `navigation.json` (Nathan's ruling); the banner mutation path's navview branch retargets there. The banner-owner kind itself survives (it names the surface, not the file); only main's storage resolution for it changes.
- The dedicated `assets/navview/` folder goes: the banner image is hand-moved into shared assets, the pointer names its path, and the asset write path for this owner stops minting a per-owner folder.
- `navview.json` is deleted from both nexuses and from the paths registry; the tree read drops its fetch.

#### Phase 3 — navigation.json

- **Shared contract:** one `NavigationFile` type — three optional ID-only arrays plus the NavView banner pointer. The old `NavState` / `NavFavorite` / `PinEntry` / `RecentEntry` family and their result envelopes collapse into it.
- **Main IO:** one module owning the file — one read (validated, element-filtered; a malformed entry drops, never crashes), one serialized whole-file write, one quit gate (the favorites gate generalizes; it now covers all navigation intent). `pinsState.ts` and the favorites/pins machinery in `navState.ts` are deleted, along with the dead pin migration and the `'recents'` db scope.
- **IPC:** the seven `nav:*` persistence channels collapse to a read and a write; the `nav:changed` push retypes to the new file shape. `nav:evictThumbs` shares the prefix but is thumbnail eviction — it survives untouched.
- **Renderer:** the store owns the three arrays; pin/favorite toggles and reorders become array splices followed by one persist. The fractional-order helpers and the shared fractional-key generator die (verified pins-only). The never-wired favorites-reorder store action is deleted, not ported. Click-through on an ID-only entry mints its path at click time through the existing id→path reconcile index — the display resolve index stays display-only.
- **Watcher:** the two-pattern navigation match becomes one file match feeding the same refresh bus.
- **Hand-authoring:** `navigation.json` is written by hand for both nexuses from their current pins/favorites (recents restart empty — a 100-entry MRU is not worth preserving); then `pins//` and `navFavorites.json` are deleted from both.

#### Phase 4 — ID-Only Tab & Preview Persistence

- Stored tab/preview targets shrink to `{kind, id}` (the new-tab sentinel unchanged). Per-tab history stacks store the same.
- Restore hydrates in one pass: each stored ref resolves through the id→path index against the live tree — resolving refs get their minted path, non-resolving refs drop, and the history pointer is recomputed as the stack prunes (the lockstep guard's new and only home; see the locked-decision statement above). The banner owner's navview arm is untouched — only main's storage resolution for it changes in Phase 2.
- What dies is repair-of-stored-paths, now unrepresentable: the store's repath sweeps over saved tabs and previews, the stored-recents path patching, and the duplicate target-key helper in the tabs reader (the shared `navKey` becomes the one identity rule). Live-selection reconciliation is untouched.

#### Phase 5 — The Erasure Pass

Input: the blast-radius agent's consolidated report. Nothing ships until:

- Every module, export, type, channel, and test the old design touched is deleted or restated — tests pin the *new* contracts, never the old ones rewritten in place.
- Every doc — `Features/Navigation.md` first, plus every Features/root doc naming the old files — is restated around the new truth in native voice. No supersedes-notes, no history framing. `History.md` follows its own convention instead: changed directions are merged and resolved in place, including the two locked entries above and the multi-tab entry's since-false claim that tabs sync across devices.
- The blast-radius report is the working checklist: the dying modules and their full consumer trails, the type family collapsing into the navigation contract, the seven-channel IPC surface, the at-rest repair sites, the ~40 code comments asserting the old design, and the doc lines in Architecture, Navigation, PagePreview, Context, Handoff, and History.
- The grep gate returns zero hits repo-wide (code, tests, and docs) for the old vocabulary: the old filenames, the pins directory, tombstones, the fractional pin order, the db recents scope, and every Swift-parity name Phase 1 removed — including `Swift` itself as a compat rationale, the seed/backfill names, the date-shim name, and the legacy field/vocabulary names (`pinned` on recents, `tablecells`, the legacy `card_size` words, `sidebar_sections`, `accent_color`).

#### Phase 6 — Gates, Review, Live Verification

- Standard gates: typecheck, lint, full test suite, build — exit codes read directly, never through pipes.
- Adversarial review of the diff (build-breaking agent), findings verified personally before folding.
- Live UIX pass on the running app: pin/unpin/reorder, favorites toggle, recents stream, tab restore across relaunch, rename-then-restore (the stale-path class this plan abolishes), NavView banner set/clear from its new home.
- Docs committed with the code; between-phase re-reads of this plan after each green commit, with downstream phases rewritten if a phase surfaces a wrong assumption.

#### Verification Contract

The refactor is done when: a rename or move while the app is closed cannot leave any persisted navigation state stale (nothing stale is stored); the only Navigation mechanisms are one file read, one file write, and live resolution; and no artifact — code, test, comment, or doc — references the previous design or the Swift app.
