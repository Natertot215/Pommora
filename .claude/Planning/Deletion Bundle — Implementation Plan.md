## Deletion Bundle — Implementation Plan

**Status:** review-certified, rulings folded — pending ratification.
**Spec input:** [[Deletion Bundle — Decision Log]] (same folder). Decisions cited as A-1…D-1.

### Goal

Restructure the NexusRecord's provenance container so the record is written before the destruction it describes and physically cannot separate from its artifact: one deletion = one `.deleted` bundle folder in `.trash` holding the artifact under its original name plus `record.json`. The approach was chosen over a db table, a central ledger, frontmatter stamping, path-encoded placement, a journal, and tombstones — each rejected in the Log with the objection that killed it — after an execution-verified attack showed the pair design's root flaw is naming the record after the stamped destination, which forbids write-ahead. This deliberately does **not** touch the baseline/diff/re-mint half, sync, or any surface; the resolver and restore guards carry over unchanged.

### Grounding

- `src/main/io/atomicWrite.ts` — `trashWithTimestamp` (mirror chain, stamp, de-collision loop, `recordWrite` echo); **two** production callers: `removeViaMode` in `mutate.ts` (entity deletes → becomes the bundle path) and `blocks.ts`'s tile-file trash (**not** an entity delete — keeps a flat, record-less primitive per A-5).
- `src/main/blocks.ts` — `trashTileFile`'s flat trash call inside `serializeOnFile`; its tests pin the trashed-file-under-`.trash` shape and stay unchanged.
- `src/main/provenance.ts` — schema + gathers + resolver + mover; `writePair`'s production caller is the delete arm; `writePropertyPair`'s is `crud/deleteProperty.ts` `snapshot()` (already write-ahead: snapshot runs before the scrub).
- `src/main/mutate.ts` delete arm — current order per kind: content gathers before the move; **space sweeps before gathering** (the unrecorded-destruction defect); context gathers evidence before erase, membership during sweep; pair written after `removeViaMode`, best-effort.
- `src/main/record.ts` `projectBaseline` — restore's id-live source; untouched.
- Tests: `provenance.test.ts` (pair matrix, resolver matrix, restore round-trips, guard pins), delete-arm coverage in `mutate.test.ts`-adjacent suites. Baseline gate: **179 files / 1,994 tests**.

### Forced By

- Record-before-destruction ⟹ the record's path cannot derive from the move's outcome ⟹ the bundle is minted first and the artifact arrives last (B-1).
- Artifact presence = settle marker ⟹ no separate settled flag, and intermediate record states can't lie (B-2) ⟹ listing must skip artifact-less non-property bundles.
- Record travels inside the bundle ⟹ the orphan prune has no failure left to answer ⟹ it is deleted, not ported (C-2).
- Artifact keeps its original basename ⟹ the `name` field and `artifactBaseName` parser are dead (A-2) ⟹ the resolver's `baseName` argument is fed from the artifact's real name inside the bundle.
- Clean-break migration (D-1) ⟹ no dual-read; old flat entries and sibling `.provenance.json` files are simply invisible to the new listing.

### Inherited Reasoning

Rejected alternatives live in the Log's Considered & Rejected — an implementor tempted by "just keep sibling pairs for single files" or "put record.json inside the trashed folder" must read that section first; both were weighed and killed.

### End-to-End Acceptance Criterion

In one fixture nexus: delete a Context carrying members → exactly one `.deleted` bundle exists, containing the Context folder under its original name plus a `record.json` whose membership matches the swept tags; rename the fixture's structures, restore → the Context re-enters the registry and members re-tag under the resolver's final title. Separately: run only the delete's pre-settle prefix (mint + record, no artifact move) → the listing excludes the bundle and restore refuses it, while the record remains on disk as evidence. A property delete yields an artifact-less bundle the listing includes. Full gates green: `npm run typecheck` 0 · `npx biome lint src` 0 warnings (read the "Found N warnings" line) · `npx vitest run` all passing · build clean.

### Work Shapes

- **Additive + changed behavior:** no ordering tests exist today, so Task 3 writes the write-ahead pins as new failing tests in the commit that reorders the arms.
- **Fix:** the Space reorder is a fix — sibling sweep: the Context arm consumed the same sweep-then-gather shape and is reordered in the same task.
- **Refactor baseline invariant:** the resolver matrix and restore-guard pin tests pass unchanged (assertions untouched, only setup re-pointed at bundles); the 1,994-test count may only grow.
- **Not a data migration:** clean break (D-1) — no backup/census tasks; the format has zero consumers today.

### Global Constraints

- Fixtures / `TEST_NEXUS_PATH` only — never a live nexus, never CDP-typing into real pages.
- One tree-touching writer at a time; explicit-path staging; commit voice `type(scope): declarative`.
- Biome hook formats on write; never run Biome by hand; comments why-only; `KNOB` and `(Nathan's call)` markers survive.
- Reviews are standard agent dispatches citing file + "what" — never the Workflow tool, never line numbers.
- No keybindings. No new dependencies. Simplicity first — don't add what the Log doesn't name.

---

### Phase 1 — The Container

**Task 1 — Bundle primitives.**
*Why:* B-1 needs mint and settle as separate moments; today `trashWithTimestamp` fuses them (Goal: record before destruction).
*Files:* `src/main/io/atomicWrite.ts` (replace `trashWithTimestamp`), its unit tests; `src/main/blocks.ts` (import rename only).
*Interfaces:* `mintBundle(nexusRoot: string, absSource: string): Promise<string>` — derives the mirror chain from the source exactly as the old primitive did (out-of-root / `..` sources land flat), creates the chain with recursive `mkdir`, then the bundle dir `<stamp>__<base>.deleted/` with a **non-recursive** `mkdir` so EEXIST actually fires and counters to `<stamp>__<n>__<base>.deleted` (recursive mkdir swallows EEXIST — two same-instant deletes must never share a bundle). Property bundles pass a synthetic flat source. `settleBundle(bundleDir: string, absPath: string): Promise<string>` — `recordWrite` both ends, renames the artifact into the bundle under `basename(absPath)`, returns the destination. `trashFileFlat(nexusRoot, absPath)` — the old behavior, surviving renamed, solely for `blocks.ts` (A-5); its call site swaps the import, its tests stay green unchanged. Assumed by Tasks 2–5.
*Steps:* failing tests first (bundle dir exists before any artifact moves; de-collision mints the counter; settle preserves the original basename; out-of-root sources land flat) → implement → `trashWithTimestamp` is deleted and the type gate enumerates the two known callers (`removeViaMode`, `blocks.ts`) plus any this plan missed.
*Failure half:* a settle whose source vanished rejects and the caller surfaces it; degenerate chain lands the bundle directly under `.trash`.

**Task 2 — Record grammar and listing.**
*Why:* the record moves from a stamped sibling to a fixed name inside the bundle; the listing must speak the new shape and enforce the settle marker (A-2, A-3, B-1).
*Files:* `src/main/provenance.ts` (schema, `writePair`/`readPair`/`pairPathFor` → `writeRecord(bundleDir)`/`readRecord(bundleDir)`/`RECORD_FILENAME = 'record.json'`; `writePropertyPair` → `writePropertyBundle`; `listPairs` → `listBundles`; the full rename set: `pairFile` schema → `recordFile`, `PairFile` → `RecordFile`, `ArtifactPair` → `ArtifactRecord`, `resolvePair` → `resolveRecord` (body unchanged per C-1), `PAIR_SUFFIX` **deleted**; also delete the `name` field, `artifactBaseName`, and the orphan prune), `provenance.test.ts`.
*Interfaces:* `listBundles(root): Promise<{ bundlePath: string; record: RecordFile }[]>` — walks `.trash` for `*.deleted` directories and does **not descend into them** (a bundle's interior is trashed content, not trash structure; a user-created entity named `*.deleted` inside a trashed folder must never surface as a phantom bundle); a non-property bundle with no artifact entry is skipped (incomplete — left on disk, never removed); files outside bundles (old-format trash) are invisible. `bundleArtifact(bundleDir): Promise<string | null>` — the single non-`record.json` entry after ignoring `.`-/`_`-prefixed names (the house convention-skip: Finder's `.DS_Store` and AppleDouble litter must never render a bundle unrestorable, and `invalidName` already forbids those prefixes for real entities), null when absent or ambiguous (2+ candidates). Assumed by Tasks 3 and 5.
*Steps:* failing tests (round-trip; property bundle listed with no artifact; incomplete content bundle skipped AND still on disk after listing; a `.DS_Store` beside the artifact changes nothing; old-format flat file + sibling pair ignored; no descent into bundle interiors) → implement → re-point the existing pair-matrix tests at bundles with assertions unchanged.
*Failure half:* unreadable `record.json` ⇒ not a bundle, skipped, never deleted; 2+ non-ignored candidates ⇒ incomplete.
*Negative control (prune deletion):* the old prune test inverts — an artifact-less content bundle survives three listing calls untouched.

**Phase 1 gate:** typecheck · lint (read the warnings line) · vitest · simplifier + correctness reviewer on the phase range.

### Phase 2 — Write-Ahead Delete Arms

**Task 3 — Reorder the four arms.**
*Why:* the record must exist before the sweep/erase (B-1); the Space arm currently destroys before it can gather (B-4); refusal becomes possible and honest (B-3) (Goal: crash leaves evidence).
*Files:* `src/main/mutate.ts` delete arm + `removeViaMode` (nexus branch becomes settle-into-pre-minted-bundle; system branch unchanged), arm-level tests.
*No refusal guards anywhere (B-3, B-4): a gather that yields no record skips the record and the delete proceeds — today's exact behavior — and a failed record write faults the op through the existing mutate catch before anything was destroyed. The recordless folder is invisible to the listing by its own not-a-bundle rule.*
*Steps, per kind (nexus mode):*
  - *content* — gather (parent ref + id) → mint → writeRecord → settle.
  - *space* — registry + sidecar read **first** (B-4) → mint → writeRecord (members empty, `partial: true`) → `unlinkSpaceValue` → patch members in, `partial` **recomputed** by the existing gatherer from the sweep's real outcome — never cleared (B-2) → settle.
  - *context* — `gatherContextEvidence` first → mint → writeRecord (membership empty, `partial: true`) → `unlinkContextKey` + registry erase → patch membership in, `partial` recomputed → settle.
  - *system mode* — unchanged: no gathers, no bundle, `trashToSystem`.
*No ordering tests exist today to invert (current delete tests pin content and destinations, never sequence) — this task **writes** the ordering pins as new failing tests: for each arm, the record write precedes the first destructive call, driven through the arm's real code. The existing all-or-nothing pin (unreadable registry → no record, delete still lands) and the gather-matrix partial pins stay green as written.*
*Negative controls:* crash prefixes — content: mint+record then stop → record on disk, artifact live, listing skips. Sweep arms: mint+record+sweep then stop → destruction done, folder live, and the bundle's record **holds the swept membership** (the B-1 accepted cost, proven not assumed).
*Must agree:* the arm's refusal set and `listBundles`' skip rule are two judgments of the same incompleteness — one crossing test drives the crash prefix through the arm's real code and asserts the listing's answer.

**Task 4 — Property deletes join the shape.**
*Why:* A-3; the snapshot is already write-ahead — only its container changes.
*Files:* `src/main/crud/deleteProperty.ts` (`snapshot` → `writePropertyBundle`), its tests.
*Steps:* failing test (property delete yields a `.deleted` bundle, record content byte-equivalent to the old pair's) → swap the writer → the old flat-file de-collision test retires with the code it pinned.

**Phase 2 gate:** as Phase 1, plus re-run the arm-order derivation: grep the delete arm for the destructive calls and assert each is preceded by its record write in source order.

### Phase 3 — Restore, Heal, and Truth

**Task 5 — Restore spends bundles.**
*Why:* C-1; the mover's decisions are unchanged — only its inputs move (Goal: restore behavior preserved).
*Files:* `src/main/provenance.ts` `restoreArtifact`, `src/shared/mutate.ts` (the field renames `pairPath` → `bundlePath` — two references repo-wide, zero renderer-side), `provenance.test.ts` restore matrix.
*Steps:* path validation (under `.trash` against a **realpath'd** root — the inherited guard compared against the raw root where `isReserved` realpaths for exactly this reason; fixed here while the line is open — ends `.deleted`, is a directory) → `readRecord` → **property refuses first**, with its existing message ("A property record has no artifact to restore") — the guard survives the rewrite ahead of the artifact check, so a complete property record is never mislabeled an incomplete delete → `bundleArtifact` (null ⇒ refuse: incomplete) → resolver fed the artifact's real basename → existing guards verbatim (occupancy, registry-append-before-move + rollback) → move the artifact out → remove the bundle dir **recursively** (convention-skipped cruft may remain inside) → passenger re-key + membership reapply unchanged. No id re-check against the artifact — the record is trusted, and the state a tampered record could create is the re-mint pass's existing jurisdiction (Log C-3).
*Failure half:* unreadable record ⇒ not a bundle, refuse; artifact absent ⇒ incomplete, refuse; occupied target ⇒ refuse — all pre-existing shapes, re-pointed.
*Must agree:* resolver refusals and restore's own refusals must not overlap or contradict — the existing pin tests re-run against bundles unchanged.

**Task 6 — Docs and the sweep.**
*Why:* the blast radius (E-1, E-2) is a deliverable, not an afterthought.
*Files:* `Features/NexusRecord.md` (Provenance sections rewritten as-built: the bundle, the settle marker, the refusal semantics; the pair described nowhere), `History.md` (one entry), this plan's Log closed out.
*Steps:* rewrite → grep the docs for `provenance.json`, `pair`, `artifactBaseName` (control token: `record.json` present) → grep `src` for the retired code spellings `PAIR_SUFFIX`, `pairPathFor`, `trashWithTimestamp`, `artifactBaseName` (control token: `RECORD_FILENAME` present; expected hits: zero) → full gates → the acceptance criterion runs as a test, not a claim.

**Phase 3 gate:** as Phase 2, plus the closeout: Delivery Claim → neutral verifier → attack pass briefed to interleave mechanisms (the crossings lesson: this feature's defects live where two correct mechanisms meet).

---

### Sequenced After

Trash browser + restore surface (reads `listBundles`, invokes `restore`) · empty-trash op (bundle-aware) · the id-live heal (Log Prospects — deferred until a surface makes the trap reachable) · re-mint pass consulting trash records · property restore path.

### Progress

- [ ] T1 bundle primitives
- [ ] T2 record grammar + listing
- [ ] P1 gate
- [ ] T3 write-ahead arms
- [ ] T4 property bundles
- [ ] P2 gate
- [ ] T5 restore on bundles
- [ ] T6 docs + sweep
- [ ] P3 gate + closeout

### Log

*(base commits recorded per phase at execution; deviations and rulings land here)*
