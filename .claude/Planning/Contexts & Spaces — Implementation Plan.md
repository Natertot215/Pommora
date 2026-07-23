# Contexts & Spaces — Implementation Plan

> **Status: RATIFIED** — three adversarial review rounds ran to convergence: round 1 (1×P0 sequencing, 3×P1, 2×P2 — folded), round 2 (2×P1, 3×P2, 2×P3 — folded), round 3 verified all seven folds held with zero new breaks. Executable as written.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. The ratified spec is [[Contexts & Spaces — Decision Log]] — every decision id cited below (A-4, D-7a, F-9…) resolves there; read it before any task.

**Goal:** Replace the fixed three context tiers with user-defined Contexts (registry-backed groups) containing Spaces — bracketed title-keyed member values, SpaceView block surfaces, per-Space chip colors, the settings chassis, and the crash-safe title-cascade machinery.

**Architecture:** One registry (`.nexus/contexts.json`) is the identity source; member files carry only quoted bracketed title keys (`"[Projects]": [Pommora]`); a synchronous three-scope cascade plus a pending-rename journal keeps title-keyed membership consistent; the walk retains the raw context keys it already parses and resolves them onto each entity's own node; every UI surface generalizes an existing fixed-three mechanism.

**Tech Stack:** Existing only — TypeScript 6, zod, eemeli/yaml, Vitest, the in-house SurfacePM/PommoraDND/chassis primitives. No new dependencies.

## Global Constraints

- Gates per task: `env -u ELECTRON_RUN_AS_NODE npm run typecheck` + `npx vitest run` (read the summary line, `set -o pipefail`) — both green before every commit. Build check (`… npm run build`) at each phase close.
- Branch: `contexts-spaces` off `main`. Explicit-path staging only (parallel-session rule). Commit after every task.
- Biome formats on write — never hand-align; an Edit failing on whitespace means re-read and retry.
- Hard rules bind throughout: main owns fs; IPC envelope `{ok}`; read path write-free (the journal replay is a *mutation-side* open step, not a read); no O(N) on high-frequency triggers; no full re-walk where a patch works.
- H-1 invariant everywhere: **ids in memory, titles only at the write boundary.**
- No keyboard shortcuts anywhere in this plan (none specced).
- UI copy: Title-Case action labels ("New Project", "Delete Context").

---

## Phase 0 — Pre-Flight

### Task 0.1: Gates + vault verdict

- [x] The Obsidian question is resolved and recorded in the Decision Log (A-8): Obsidian shows every top-level key (no hard failure — frontmatter stays valid); visibility is handled by **Sapphire's injected prefix CSS rule** (`.metadata-property[data-property-key^="["] { display: none }`), a Sapphire-side work item outside this plan, with the same rule documented as a snippet for plugin-less vaults. The bracketed syntax stands as ratified.
- [ ] `git checkout -b contexts-spaces` · run both gates to confirm a green baseline · note the passing counts.

---

## Phase 1 — Shared Contracts (headless, tests-first)

### Task 1.1: `src/shared/contexts.ts` — the registry contract

**Files:** Create `src/shared/contexts.ts` · Test `src/shared/contexts.test.ts`

**Produces (later tasks consume these exact names):**

```ts
export type ContextDef = { id: string; title: string; singular: string; icon?: string }
export type ContextsRegistry = { contexts: ContextDef[] } // array position IS the order (F-3: no ordinal semantics)
export const RESERVED_CONTEXT_IDS = ['_tier1', '_tier2', '_tier3'] as const // the seeded three, fresh-create AND migration (H-5)
export const contextsRegistry: z.ZodType<ContextsRegistry> // zod; unknown fields ride through (loose)
export function contextKey(title: string): string // `[${title}]`
export function parseContextKey(key: string): string | null // '[Projects]' → 'Projects'; anything else → null
export function invalidContextTitle(title: string): boolean // brackets banned (H-7) + shared invalidName rules
export function normalizeContextValue(raw: unknown): string // String(raw).trim().toLowerCase().normalize('NFC') — H-6 coercion
export function seededRegistry(labels: NexusLabels): ContextsRegistry // titles from the plural LabelPairs, singulars from the singular halves (F-2)
```

- [ ] Write failing tests: `contextKey('Projects') === '[Projects]'`; `parseContextKey` round-trips and rejects `'Projects'`, `'[Pro]ject]'`, `''`; `invalidContextTitle` rejects `'Pro[ject'`, `'a/b'`, `''`, accepts `'Projects'`; `normalizeContextValue(2024) === '2024'`, `(true) === 'true'`, NFD `'Café'` === NFC `'café'`; `seededRegistry` yields the three with `_tierN` ids in tier order; registry schema preserves unknown fields.
- [ ] Run: `npx vitest run src/shared/contexts.test.ts` — expect FAIL (module missing).
- [ ] Implement; re-run to PASS. Commit `feat(contexts): shared registry contract`.

### Task 1.2: Normalization + schema changes in existing shared files

**Files:** Modify `src/shared/connections.ts` (normalizeTitle gains `.normalize('NFC')`) · `src/shared/schemas.ts` · `src/shared/types.ts` · `src/shared/mutate.ts` · `src/shared/properties.ts` · `src/shared/views.ts` · `src/shared/agenda.ts` · their test files.

**Produces:**

```ts
// types.ts
export type SpaceNode = { kind: 'space'; id: string; title: string; path: string; icon?: string; color?: ChipColorName; contextId: string }
export type ContextGroup = { def: ContextDef; spaces: SpaceNode[] }
// NexusTree.contextGroups?: ContextGroup[]   — OPTIONAL until Task 7.0 (required fields would red every
// NexusTree constructor: walkNexus + ~10 test fixtures). 7.0 renames it to `contexts` and de-optionalizes.
// Legacy NexusTree.contexts ({projects,topics,areas}) STAYS until 7.0.
// No flat contextLinks side-array and no ContextLink type — each entity node carries its OWN resolved links:
// PageNode/SpaceNode (and the agenda snapshot entries) gain `contextValues?: Record<contextId, spaceId[]>`,
// attached at walk assembly. The SQLite index builder is unaffected — it re-reads frontmatter in its OWN
// collectNexusData pass (build.ts:108) and was never a tree consumer; G-2's accelerator keeps getting
// written. Reverse lookups derive on-demand when their first consumer lands — nothing maintains an
// aggregate no surface reads.
// SelectionState kind union gains 'space' (H-9); 'context' reserved unused for the future group view
// mutate.ts ops — ADDED ALONGSIDE createContext{tier}/setTier (legacy ops stripped in 7.0):
//   { op:'createContextGroup'; name: string }                  // appends registry entry (ULID id) — F-12's HoverCreate path
//                                                              // (the legacy tier op owns the `createContext` discriminant until 7.0)
//   { op:'createSpace'; contextId: string; name: string }
//   { op:'renameContext'; contextId: string; newName: string } // three-scope cascade + journal
//   { op:'renameSpace'; spaceId: string; newName: string }
//   { op:'setContext'; path: string; contextId: string; spaceIds: string[] } // main resolves titles (H-1)
//   { op:'setSpaceColor'; spaceId: string; color?: string }
//   { op:'setContextSingular'; contextId: string; singular: string }
//   { op:'reorderContexts'; ids: string[] } | { op:'reorderSpaces'; contextId: string; ids: string[] }
```

**STRATEGY — strictly additive (the typecheck gate is whole-program):** this task *introduces* the new contract beside the old; it deletes NOTHING. `NexusTree` gains `contextGroups?: ContextGroup[]` (optional until 7.0) alongside the legacy `contexts` struct; the new ops land alongside `setTier`/`createContext{tier}`; legacy types stay. Every consumer migrates in Phases 2–5, and **Task 7.0 deletes the legacy contract only once it's consumer-free** — that's the only way each task's commit can gate green.

- [ ] `normalizeTitle` adds NFC (one line); run the full connections + resolution suites — expect green (NFC is a no-op for ASCII); add one NFD test case.
- [ ] `schemas.ts`: add `spaceSidecar` (id, icon?, color? as an open string key validated through the chip-solid map at read, banner?, modified_at; loose so blocks/layout/bracketed keys ride); `pageFrontmatter` and `agendaBase` keep `tier1/2/3` as **legacy-read optional** fields (they stay until Task 7.0).
- [ ] `types.ts`: add `SpaceNode`/`ContextGroup` + the `'space'` selection kind; legacy `AreaNode/TopicNode/ProjectNode` + `AREA_COLORS` remain until Task 7.0 (F-4's palette swap happens at the consumers in Phase 3, reading legacy colors through `chipColorFor`'s legacy MAP).
- [ ] `mutate.ts`: add the new ops; legacy `setTier`/`createContext{tier}` remain wired until their consumers flip (Phases 2–4), then strip in Task 7.0.
- [ ] `properties.ts`: `TIER_LEVELS`/`tierFieldName`/`tierPropertyId` gain a "legacy — migration/legacy-read only" doc note now, deletion in Task 7.0; the `'context'` propertyType comment updates (user Contexts exist; `context_target` becomes `{ contextId }`).
- [ ] Update every red test in the same task; both gates green. Commit `feat(contexts): additive shared contract for the registry model`.

### Task 1.3: `src/shared/contextResolve.ts` — pure resolution + reconcile

**Files:** Create `src/shared/contextResolve.ts` · Test `src/shared/contextResolve.test.ts`

**Produces:**

```ts
export type ResolvedLinks = Map<string /*contextId*/, string[] /*spaceIds*/>
export function resolveContextKeys(root: Record<string, unknown>, registry: ContextsRegistry, spacesByContext: Map<string, SpaceNode[]>): ResolvedLinks
// A-10: key must exact-match a registry title (after parseContextKey); values match via normalizeContextValue against space titles (H-6)
export function reconcileContextKeys(root: Record<string, unknown>, …same): { root: Record<string, unknown>; changed: boolean }
// A-11 per-value: repair near-miss to canonical title; drop unknown; drop empty arrays/keys (A-5); NEVER touch non-context keys
export function legacyTierLinks(root, registry): ResolvedLinks // tier1/2/3 bare-ULID arrays resolved through the _tierN-id entries (H-5)
```

- [ ] Failing tests: valid key+values resolve by id; bare `Projects:` (unbracketed) ignored; unknown value inert but *present* in resolve output? — NO: resolve returns registered links only; reconcile: `["pommora","Pomora","CS 161"]` → repairs `Pommora`, drops `Pomora`, keeps `CS 161`, `changed: true`; `2024`/`true` scalars repair to their string Spaces; empty array key removed; unknown *key* (valid bracket, unknown title) left verbatim, `changed: false`; legacy `tier1: [<ulid>]` resolves through `_tier1`.
- [ ] Implement · green · Commit `feat(contexts): pure resolution + reconcile seams`.

---

## Phase 2 — Main Process: Storage, CRUD, Cascade, Migration

### Task 2.1: Layout + registry IO

**Files:** Modify `src/main/paths.ts` · Create `src/main/contextsRegistry.ts` · Tests alongside.

**Produces:** `contextsRegistryFile(root)` → `.nexus/contexts.json`; `contextsDir(root)` → `.nexus/contexts`; `spaceDir(root, contextTitle, spaceTitle)`; `SPACE_SIDECAR = '_space.json'`; **ONE strict-IO primitive serves every D-7b consumer:** add `rmwJsonStrict(path, fn)` + `readJsonStrict(path)` to `src/main/io/atomicWrite.ts` — a read error is a `fail`, never a fallback-to-empty. The registry here, Task 2.3's `_space.json` writes, and Task 5.1's block-doc writes ALL consume this one chokepoint; no bespoke per-consumer "skip-safe" implementations. `readRegistry(root)` layers only its registry-specific ENOENT branching on top: no legacy tier dirs → seed via `seededRegistry` + write (true fresh nexus); a tier dir present → `fail('unmigrated')`, never blind-seed (the open path runs Task 2.6 first). `mutateRegistryFile(root, fn)` — serialized through `serializeOnFile(contextsRegistryFile(root))` (the per-file lock; NOT the global schema-op chain — nesting a schema op would deadlock).

- [ ] Tests first (temp-dir fixtures): fresh nexus seeds three `_tierN` entries titled from `DEFAULT_LABELS`; corrupt JSON → `fail`, file untouched; mutate round-trips unknown fields. Green. Commit.

### Task 2.2: The walk — registry + spaces + link retention

**Files:** Modify `src/main/readNexus.ts` (replace `readTier`×3 + `readLabels` tier sourcing) · `src/main/walkCache.ts` untouched · Tests `src/main/readNexus.test.ts`.

- [ ] Failing tests: tree carries `contextGroups: ContextGroup[]` in registry order, spaces in `space_orders[contextId]` order (state.json key, falling back to fs order); **the legacy `tree.contexts` struct stays populated during the additive window, derived from the `_tier1/2/3` groups** (Sidebar, `build.ts:111-113`, selection etc. keep working untouched until their own migration tasks); `readPage`/agenda reads **retain the raw bracketed keys** (off the frontmatter they already parse — field retention, not a second scan) plus legacy `tierN`; assembly resolves them per entity (`resolveContextKeys` + `legacyTierLinks`) onto **each node's own `contextValues`** — `_space.json` keys included (G-1). No flat side-array.
- [ ] Implement. The per-file parse stays mtime-cached (`cachedParse`) and **retains the RAW bracketed keys — registry-independent data, so the cache never needs busting for registry changes**; resolution (`resolveContextKeys`) runs at tree-assembly time each walk, a cheap in-memory pass over the retained keys. A pre-existing inert key lights up on the first walk after its Space is created (the A-11 retroactive-registration clause) with zero invalidation machinery — the structural op's existing confirming `load()` is the refresh. Green. Commit `feat(contexts): walk retains raw context keys, resolves at assembly`.

### Task 2.3: CRUD — create/color/setContext + agenda lock widening

**Files:** Modify `src/main/mutate.ts` · `src/main/crud/folderEntity.ts` (register `'space'` kind) · `src/main/crud/page.ts` (drop tier seeds + `setPageTier`; add `setPageContext` writing the bracketed key through the frontmatter merge, key deleted when empty) · `src/main/crud/agendaEntity.ts` (same + **every agenda write wraps `serializeOnFile`** — D-7's lock widening) · `_space.json` RMW rides Task 2.1's `rmwJsonStrict` (no separate spaceIO module) · Tests.

- [ ] Failing tests per op: `createContext` appends ULID entry + mkdir `contextsDir/Title`; `createSpace` mkdirs + writes sidecar (icon absent, no color) **and seeds the 2×2 block document** (four markdown entries + four ULID `.md` files + the two-band layout literal — F-16/B-10; layout shape per `SurfacePM/core/model.ts` types); `setContext` resolves ids→titles through the registry at write (H-1), writes `"[Title]": [names]`, clears the key on `[]`; `setSpaceColor` validates against the chip solids; concurrent agenda write + cascade on the same file serialize (lock test — the F1-class case).
- [ ] Reconcile-on-write: `setPageContext`/page full rewrites/agenda writes run `reconcileContextKeys` on the root they're already rewriting (D-9a — per-file, inside its own governed write; also migrates that file's legacy `tierN` in place, H-5).
- [ ] Green · Commit `feat(contexts): registry CRUD + context writes under the lock`.

### Task 2.4: The rename machinery — journal + three-scope cascade

**Files:** Create `src/main/crud/contextJournal.ts` + `src/main/crud/contextCascade.ts` · Modify `src/main/mutate.ts` (rename ops) · `src/main/index.ts` (replay call in the open path, after lock init, before first walk) · Tests for both (this is the highest-risk code in the plan — test every sequence below).

**Produces:**

```ts
// contextJournal.ts — .nexus/context-rename.json (one pending record max; a second rename awaits the first).
// NOT a new subsystem — it composes three existing primitives: atomicWriteFile (the record is whole-or-absent
// across any crash), the .nexus-resident JSON snapshot idiom (deleteProperty's recovery net), and the same
// serializeOnFile locks the cascade already takes. The only net-new parts: the on-open pending check and the
// write-before/clear-after lifecycle — nothing in the codebase forward-completes an interrupted multi-file op
// today (verified by inventory: SchemaTransaction rolls BACK, .trash snapshots restore MANUALLY, cascades are
// re-runnable but nothing re-triggers them).
export type RenameJournal = { contextId: string; spaceId?: string; oldTitle: string; newTitle: string; skipped: string[] }
export function writeJournal(root, j): Promise<Result<null>>
export function readJournal(root): Promise<RenameJournal | null>
export function clearJournal(root): Promise<void>
// contextCascade.ts
export function cascadeTitle(root, registry, j): Promise<Result<{ touched: string[]; skipped: string[] }>>
// Three scopes (D-7): every member .md frontmatter key/value · every *.task.json/*.event.json root · every _space.json root.
// Per file: under serializeOnFile; unreadable ⇒ record in skipped, CONTINUE (never fallback-to-empty; never throw the run).
```

- [ ] Failing tests — the full D-7a/D-7b contract:
  - Order: journal written → cascade → registry title committed → journal cleared (assert intermediate states via injected failure).
  - Context rename rewrites the KEY in all three scopes; Space rename rewrites the VALUE (exact + near-miss forms untouched — only the exact canonical old title).
  - A file unreadable mid-cascade → `skipped` non-empty → registry still commits → **journal survives** with the skip list; next replay retries only skipped-or-stale files.
  - Replay guard: journal replays only while the registry maps `contextId → oldTitle→newTitle` consistently AND no other Context/Space now owns `oldTitle` — else journal discards untouched (D-7b re-mint guard).
  - Live throw (non-crash): rename op returns `fail`, registry reverted, **journal cleared** (F-D — rollback = abort).
  - Replay idempotence: running replay twice = once.
- [ ] Implement · green · Commit `feat(contexts): journal + three-scope title cascade`.

### Task 2.5: Deletes, reorders, watcher, index

**Files:** Modify `src/main/crud/cascade.ts` (`unlinkTier` → `unlinkContext`, three-scope by title) · `src/main/crud/reorder.ts` (`space_orders` map in state.json; `reorderContexts` writes the registry array order) · `src/main/watcher.ts` (generalize the homepage exclusion: inside `.nexus/contexts/<C>/<S>/`, ignore `*.md`; `_space.json` stays watched — H-8) · `src/main/index/schema.ts` + `build.ts` + `upsert.ts` (SCHEMA_VERSION bump; `contexts` table gains `context_id`, drops `tier`; `context_links.property_id` → `context_id`, sources include spaces; **`collectNexusData`'s `readTiers`/`tierLinks` generalize to parse the bracketed TITLE keys and resolve titles → ids through the registry** — the builder re-reads frontmatter itself and today maps raw ULIDs, so it gains registry + space-folder access it doesn't have) · Tests each.

- [ ] Failing tests: delete Space unlinks its title from all three scopes then trashes the folder; delete Context unlinks its key everywhere, trashes the tree, removes the registry entry; watcher: an external write to `<S>/x.md` triggers NO walk, to `<S>/_space.json` DOES; index rebuild carries space-source links. Green. Commit.

### Task 2.6: Migration

**Files:** Create `src/main/migrateContexts.ts` · Test with a fixture nexus copying today's real shape.

**Trigger (F2-proof):** runs whenever **the nexus schema version < the context-registry version AND any legacy tier dir exists** — the version check survives the registry being minted first, so a killed migration re-triggers on every reopen until the version-bump-last commits (H-5's resumability made real). **The barrier is `openSessionIndex`, not "the renderer's walk":** the index cold-build itself calls `readNexus` (`build.ts:108`), so migration (and the Task 2.4 journal replay) runs between `prepareOpenedNexus` and `openSessionIndex` at BOTH open call sites (`index.ts:596` adopt-open and `index.ts:2124` launch-restore). One-time work may block open — it is NOT part of best-effort `prepareOpenedNexus`.

- [ ] Failing tests — the H-5 contract: registry minted with `_tierN` ids titled from settings labels → tier folders move under `contextsDir` (skip already-moved) → every member file's `tierN` arrays rewrite to bracketed title keys (ULID→title through the moved sidecars; unresolvable ULIDs dropped per A-11's unknown rule, **logged to console count**) → `_area/_topic/_project.json` → `_space.json` (drop `tier`, keep color through the legacy map) → `area_order/topic_order/project_order` → `space_orders` → **each saved view's currently-visible tier columns write into its `property_order`** (under default-OFF, an unrecorded-but-shown tier column would silently vanish from every existing view — F-7's "never visually changes an existing view" applies to the migration itself) → **schema-version bump LAST.** No zero-`tierN` verification re-scan: a file the migration missed is not data loss — legacy `tierN` stays read-recognized and reconcile-on-write heals each straggler on its next save (the H-5 net). The unresolvable-ULID drop count logs to console as pure diagnostics. Kill mid-run at each stage → rerun completes (idempotent). A never-migrated file appearing later (stale device) migrates via Task 2.3's reconcile-on-write.
- [ ] Green · Commit `feat(contexts): idempotent tierN → registry migration`.

---

## Phase 3 — Renderer: Pipeline, Pickers, Colors, Inspector

### Task 3.1: Pipeline generalization

**Identity reaches every caller through ONE seam:** this task creates `pipeline/contextIdentity.ts` — a memoized per-tree accessor resolving `contextId → { title, singular, icon }` and `spaceId → { title, icon, color }` — and EVERY surface consumes it: sidebar rows, picker options, column headers, chips, nav entries, the inspector, the settings surfaces. No surface re-derives icon/color/title from the tree on its own; a Context's icon and a Space's icon+color render identically everywhere by construction.

**Files:** Modify `Detail/Views/pipeline/columns.ts` (columnKind by registry id; DEFLESS_RESERVED → registry ids; **context columns become default-OFF in `resolveColumns`** — rendered only when the view's `property_order`/visibility explicitly reveals them. This is the F-7 mechanism: a later-created Context can never appear in an existing view because absence-from-the-view IS hidden, and `mintVisibility` needs no registry parameter at any of its 8 call sites — the mint-time hidden-set approach can't hide ids that don't exist yet) · `pipeline/value.ts` (TIER_FIELD dies; context value = the node's own `contextValues` field, `?? []` removed — A-5) · `Table/columnLabel.ts` (label = registry title; a registry lookup lands **alongside** `TIER_LEVEL_BY_ID`, which survives for its remaining legacy consumers until 7.0) · `pipeline/contextOptions.ts` + `Table/resolveContext.ts` (iterate `tree.contextGroups`; every Space spreads `color` + `icon`) · `Components/Detail/hiddenPaneModel.ts` — **the context branch changes PREDICATE, not just order**: `(set.has(id) || !shown.has(id))` over the registry ids, matching the schema-prop clause — under default-OFF a context in neither `property_order` nor `hidden_properties` must appear in the hidden zone or F-7's reveal path is dead · group/sort untouched (H-10: context columns stay non-groupable/non-sortable; filter's membership test keys on ids). Tests: the 8 chokepoint suites update in place.

- [ ] `CardsView.tsx:129` + `TableView.tsx:633` + `cardValueInput.ts:76` — the cell-commit write path swaps `writeTierValue` → the `setContext` op (ids in, main resolves titles — H-1); `Detail/Views/tierWrite.ts` goes call-site-free here and deletes in 7.0.
- [ ] Red → green per file; both gates. Commit `feat(contexts): pipeline over the registry`.

### Task 3.2: Per-node context values (no aggregate, no reverse map)

**No reverse-map module, no maintained aggregate, no optimistic membership patches — deleted from v1.** The reverse direction has zero v1 consumers (Subfield unpopulated, ContextView deferred, the settings rows are a Space's own outbound tags), and the entity's visible chip already updates through the existing cell-level optimistic value patch — a `setContext` behaves exactly like every sibling value write (walk-skip included, `store.ts:1713`). Each entity's resolved links ride **its own tree node** (`contextValues`, attached at walk assembly by Task 2.2 — the way property values already reach renderers), so per-row rendering is a direct field read, never an O(N) filter over an aggregate. When the first reverse consumer lands (graph views, ContextView, dashboard blocks), derive the reverse lookup on-demand and memoized from tree data *then*.

- [ ] Verify the pipeline (Task 3.1's `value.ts` changes) reads `node.contextValues`; no new files. Commit rides Task 3.1's.

### Task 3.3: Chips, ColorPicker icon, pickers

**Files:** Modify `Components/ContextChip.tsx` + `Detail/Views/Table/Cell.tsx` + `PropertyPicker.tsx`/`CardAddPicker.tsx` wiring (color now flows for every Space — the working tree's icon diff pattern; unset stays `'default'` grey, F-5) · Create `Components/Detail/CurrentColorIcon.tsx` (palette glyph tinted `vars.color.solid[chipColorFor(color)]`, `label.secondary` unset — C-2; mounts `ColorPicker` via the OptionEditor ref+toggle pattern) · Tests where pure.

- [ ] Red → green; visual check deferred to Phase 6's live pass. Commit.

### Task 3.4: Inspector + assign-reveal unification (F-1)

**Files:** Modify `PagePreview/PreviewInspector.tsx` — `tierRows` → registry map; `isAssigned` = key present with ≥1 value OR session-revealed (empty-array assignment dies — A-5); the add flow auto-opens the picker on assign; blank shows `Title: —`; right-click Remove voids (session state only). Same behavior for property rows (F-1 says both). `commitTier` → `setContext` op (ids → main). Tests for the pure row-model pieces.

- [ ] Red → green · Commit `feat(contexts): assign-reveal inspector over the registry`.

### Task 3.5: Selection + navigation

**Files:** Modify `selection.ts` (kind `'space'`; `allContexts` → all spaces) · `Detail/DetailPane.tsx` (case `'space'` → SpaceView placeholder mount until Phase 5 creates the real one; Subfield: spaces render the footer, unpopulated — F-15) · `Detail/ViewSettingsScope.ts` (**a `case 'space'` arm** — without it the settings button resolves scope `'none'` and SpacePanel can never summon; sweep EVERY `selection.kind === 'context'` switch for the H-9 rename — named sites: `SettingsScaffold.tsx:103`, `Tabs/tabsModel.ts:62`, `Navigation/navSearch.ts:30`, the `store.ts` select reducer, plus whatever the grep finds. The pipeline's VALUE kind `v.kind === 'context'` in `value.ts`/`filter.ts`/`sort.ts`/`CardValue.tsx` is a different discriminant and must NOT be renamed) · `Navigation/navResolve.ts` + `treeNavKeys.ts` (`space:<id>` keys; nav lists spaces) · `Detail/Scope.ts` (`isSurfaceKind('space')`; `findContext` → `findSpace`) · `treeMove.ts` (`insertCreatedInTree` branches for `createContextGroup` + `createSpace`; `reorderTopInTree` over dynamic groups). Tests update in place.

- [ ] Red → green · Commit `feat(contexts): space selection + nav`.

---

## Phase 4 — Sidebar

**Nothing here is new construction.** The sidebar ALREADY renders tier disclosure groups (`TierDisclosure`), ALREADY persists their open state, and ALREADY creates contexts via right-click with optimistic insert + focused rename. Phase 4 only generalizes those exact mechanisms from a hardcoded three to the registry list — any task step that would rebuild one of them is wrong.

### Task 4.1: Dynamic groups + scoped creates

**Files:** Modify `Sidebar/Sidebar.tsx` — `contextsLayer` maps `tree.contexts` into a generalized `ContextGroupDisclosure` (from `TierDisclosure`; `persistKey='context:'+def.id`, default-open, label = `def.title`, icon = `def.icon ?? grid`); `ContextRow` → `SpaceRow` (select `{kind:'space'}`); delete the `newContext` tri-picker + its `modeCtx` wiring (background right-click: nothing — F-10); **in-body** right-click → `createFromMenu([{ label: 'New ' + def.singular, req: { op: 'createSpace', contextId, name: 'New ' + def.singular } }])` (scoped create, F-9); **group-header** right-click → the native group menu **New (Singular) · Settings · Rename · Delete** (F-9) — Settings ships inert until Phase 6 wires the window, Rename triggers the inline rename, Delete confirms natively then runs the D-3 cascade. · `sidebarDnd.tsx`/`sidebarDndModel.ts` (dynamic per-context groups; commits → `reorderSpaces`). Tests: `sidebarDndModel` suites.

- [ ] Red → green · Commit `feat(contexts): dynamic sidebar groups + scoped creates`.

### Task 4.2: HoverCreate

**Files:** Create `Components/HoverCreate.tsx` (reusable — F-12: absolute, `opacity:0`, revealed by container `:hover`, no-drag, `+` glyph — the `.section-add`/`.sidebar-collapse` recipe from `Sidebar.css:234-244/300-323`) · Modify `Sidebar.tsx` + `Sidebar.css` (mount at the Contexts `.section` bottom-left; click → `mutate({op:'createContextGroup', name: 'New Context'}, beginRename)` — direct, no native menu; appended entry mounts open in rename — F-11).

- [ ] Manual live check deferred; unit-test the create-path store wiring. Commit `feat(contexts): HoverCreate + context creation`.

---

## Phase 5 — SpaceView (the block surface)

### Task 5.1: Space as second BlockHost

**Files:** Modify `src/shared/blocks.ts` (`BlockHostRef = {kind:'homepage'} | {kind:'space'; id: string}`; `coerceBlockHost`) · `src/main/blocks.ts` (`blockHostConfig`/`blockHostDir` branch to the Space's `_space.json`/folder via a registry+tree lookup; `BLOCK_HOSTS` → `listBlockHosts(root)` scanning `contextsDir` — B-10; **the space-host block-doc RMW routes through Task 2.1's `rmwJsonStrict`, never `mutateJson`'s `() => ({})` fallback** — a block-layout save against a transiently-unreadable `_space.json` must fail, not clobber id/color/relations to empty, the D-7b rule applied through the one shared chokepoint) · `src/main/paths.ts` · `src/main/index.ts` (`blockHostAnd` widening) · Tests: blocks IO suites with a space-host fixture including the unreadable-sidecar case.

- [ ] Red → green · Commit `feat(contexts): space block hosts`.

### Task 5.2: SpaceView + lock + grid dropdown

**Files:** Create `Detail/SpaceView.tsx` (DetailScaffold + `<BlockSurface host={{kind:'space', id}}/>` — the `HomepageView.tsx:24` shape; banner above, `detail-body` children slot per B-8) · Modify `store.ts` (lock state keyed by host — `blocks_locked` per `_space.json`, F-13) · `Toolbar/Toolbar.tsx` + a new `Toolbar/SpaceDropdown.tsx` (the button LEFT of the trio when a space is active, ViewPane-footprint dropdown, blank body — G-5; its glyph is **the exact symbols-registry icon contexts already default to** — the sidebar's icon-less-context fallback — no new icon minted) · `DetailPane.tsx` (mount SpaceView for `kind:'space'`).

- [ ] Live-drive checkpoint (dev app): create a Space → 2×2 appears; drag/resize/lock behave like Homepage; banner scrolls as one. Commit `feat(contexts): SpaceView`.

---

## Phase 6 — Floating Settings Surfaces

### Task 6.1: The blank chassis — **GATE: Nathan live-drives before content lands (F-14)**

**Files:** Create `design-system/components/FloatingPane/FloatingPane.tsx` — the reusable assembly: `GlassPane` + `useFloatingWindow(id)` + `FloatingResizeCorners` + one `SidePane` + `useExitPresence`, toolbar = title area + lone `×` right (B-9/B-3; NavWindow dismissal contract — Escape, non-focus-stealing, one shared geometry slot). Props: `{ id, open, onClose, bounds?, dragSurfaces?: string, sidePanes?: ReactNode | [ReactNode, ReactNode], children }` — the signature must host what NavWindow actually is: `useFloatingWindow` is three-arg (id, bounds, dragSurfaces — NavWindow's 15-classname allow-list, PreviewWindow's differs), and NavWindow mounts **two** SidePanes (left rail + right inspector). **NavWindow re-homes onto this chassis in the same task** — one shell, two consumers; extracting the primitives while NavWindow keeps its own hand-assembled copy would mint a twin, not a chassis. Explicit re-home verify points: window-body drag via the allow-list, both rails, and the 380ms NavWindow↔PreviewWindow flavor-swap FLIP (shared stashed geometry — the subtlest behavior a component-identity change can break). Plus a temporary dev summon (right-click Settings on any Context/Space opens the empty chassis).

- [ ] Ship blank → **STOP for Nathan's live UIX pass on the chassis itself** (size feel, rail drag, dismiss). Fold his notes before 6.2.

### Task 6.2: Settings windows + SpacePanel

**Files:** Create `Detail/Settings/ContextSettings.tsx` + `SpaceSettings.tsx` (content: `SettingsScaffold`-style (Icon)(Title) over divider — B-4; Space adds `CurrentColorIcon` in the BottomRow right (C-2), the relation rows via the F-1 assign-reveal flow (G-4), and the lock footer (F-13); Context adds the singular field (F-2)) · Create `Detail/Settings/SpacePanel.tsx` (same content, SidePane variant, color icon at SidePane bottom-left — B-5) · Modify `Components/Detail/SettingsDropdown.tsx` (space scope arm → SpacePanel) · `Sidebar` right-click menus wire Settings for real · `store.ts` slice `{ settingsTarget: {kind:'context'|'space'; id} | null }`.

- [ ] Live-drive checkpoint with Nathan. Commit per surface.

---

## Phase 7 — Certification + Docs

### Task 7.0: Legacy contract strip (consumer-free deletion)

**Files:** Modify `src/shared/types.ts` (delete `AreaNode/TopicNode/ProjectNode`, `AREA_COLORS`/`AreaColor`, the legacy `NexusTree.contexts` struct — `contextGroups` renames to `contexts` and de-optionalizes) · `src/shared/mutate.ts` (delete `setTier`, `createContext{tier}`, the three tier `StateOrderKey`s) · `src/shared/schemas.ts` (`tier1/2/3` legacy-read fields stay — H-5's stale-device window — but leave a doc note naming them migration-era) · `src/shared/properties.ts` (tier helpers + `TIER_LEVEL_BY_ID`'s consumers move into `migrateContexts.ts` or die where unused) · `src/renderer/src/Detail/Views/tierWrite.ts` (delete — its last call sites were rerouted to `setContext` in Task 3.1).

- [ ] Grep proves zero remaining references to each deleted symbol BEFORE deleting; both gates + build green after. Commit `refactor(contexts): strip the legacy tier contract`.

### Task 7.1: Full gates + breaker loop

- [ ] `typecheck` + full `vitest` + `build` green · dispatch build-breaking-agent over the working tree (the certified-loop convention) · fold → re-gate → loop till CLEAR.

### Task 7.2: Docs reconciliation (commit with the code — E-1…E-7)

- [ ] Rewrite `Features/Contexts.md` around the registry model (durable voice, no correction-narration) · `Properties.md` (Context type row, `$rel` framing, the tier-exception line, relation editors) · `Sidebar.md` (creation flows) · `Views.md`/`TableView.md` (dynamic context columns note) · `Architecture.md` (registry + journal + migration) · `Navigation.md` (space entries) · `SurfacePM.md` (second host) · `Framework.md` (this pass supersedes the v0.9.0 contexts line) · Decision Log stays as the ratified record.
- [ ] Final commit; Nathan's live pass; merge call is his.

---

## Self-Review Notes (run before ratification review)

- Spec coverage: A-1…A-11 (T1.1–1.3, 2.3–2.4) · A-6's universal availability = the pipeline's registry-driven column/picker offering (T3.1 — the `mergeTierProperties` module is unwired and stays that way) · B-1…B-10 (T3.5, 5.1–5.2, 6.1–6.2) · C/F-4/F-5 (T3.3) · D-1…D-9a (T2.2, 2.4, 3.2) · E (T7.2) · F-1…F-17 (T3.4, 4.1–4.2, 5.2, 6.1–6.2; F-7 via T3.1's default-OFF inversion) · G-1…G-5 (T2.2, 2.3, 5.2, 6.2) · H-1…H-10 (cross-cutting, named in tasks).
- The `'gallery'` reserved ViewType, group-by-Context, ContextView/ContextPanel: deliberately absent (Prospects).
