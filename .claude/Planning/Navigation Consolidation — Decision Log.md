## Navigation Consolidation — Decision Log

**Status:** Decisions ratified; execution split into two task plans — [[Swift Parity Removal — Implementation Plan]] (runs first, independently shippable) and [[Navigation Consolidation — Implementation Plan]]. Both pending adversarial review.

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

### Execution

The work runs as two task plans in this folder, in order:

- **[[Swift Parity Removal — Implementation Plan]]** — independently shippable; every helper, translator, seed, fallback, comment, and test that exists to serve the dead Swift app, removed with its verified consumer trail.
- **[[Navigation Consolidation — Implementation Plan]]** — `navigation.json`, the ID-only persistence contract, the IPC collapse, restore-time hydration, the hand-authoring of both nexuses, and the erasure pass.

Each plan carries its own verified file:line inventory, test cycles, and commit points; this log holds the decisions they execute.

#### Verification Contract

The refactor is done when: a rename or move while the app is closed cannot leave any persisted navigation state stale (nothing stale is stored); the only Navigation mechanisms are one file read, one file write, and live resolution; and no artifact — code, test, comment, or doc — references the previous design or the Swift app.
