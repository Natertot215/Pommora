## Stamp Retirement — Implementation Plan

> **Status:** approved by Nathan (09-01-2026), executing · Spec: the 09-01-2026 session's confirmed direction (recorded under Rulings) · Execute tasks in order.
> Citations name files and symbols at HEAD `27080e45`; re-derive before editing. Line numbers are the weakest part of every citation here — a parallel session's comment sweep is shifting them under the plan as it's read, so trust the symbol names and the greps, and treat every `:NN` as an approximate landmark.

**Goal**

A page's frontmatter carries no `created_at` and no `modified_at`, and no sidecar carries a `modified_at` twin. "Last Modified" is the file's own mtime; "Creation Time" is the moment encoded in the page's `PageID` ULID. Both reach every view as columns that can be revealed, sorted, filtered, and rendered, from one carrier — the value batch a container loads — instead of a frontmatter key one arm of the pipeline reads and another arm falls back around. Every writer that existed only to keep a stamp current is gone, and with it the "does this count as an edit?" question each of them answered differently.

The shape: `loadValues` returns a typed record per page (`{ frontmatter, createdAt, modifiedAt }`) built from the stat the walk cache already takes and the id the read engine already assigns; `ViewRow` carries the two stamps beside its frontmatter; the renderer's stamp branches read the row, and the `created_time` type joins `last_edited_time` in every switch that dispatches on a declared type, so the two stamps are one shape with two sources. Alternatives weighed: keeping `modified_at` as a key the app maintains (rejected — the file system already holds the fact, and the key is the one thing in a page an external editor can never keep true); minting a new `created:` frontmatter key from the ULID (rejected — Nathan: no new frontmatter key of any kind); an untyped map `Record<pageId, [fm, ms, ms]>` (rejected for the typed record — Nathan: "typed"); the database as the modified authority (rejected — nexus.db is a cache and a per-machine store, never the truth). Settled by Nathan on 09-01-2026.

Bounded by: no new frontmatter key; a rename or move no longer changes Modified (`fs.rename` leaves mtime alone — Nathan: "the preferred outcome"); grouping by either stamp is not built; PageID and path identity stay as they are; the content index is untouched; the vault normalization is a throwaway script at closeout, never app code.

**Requirements**

1. Task 0 first strips every target file's comments to why-only, by a single-handed subagent, so no file asserts a stamp truth while the change lands.
2. The batch a container loads is `Record<pageId, PageValues>` with `PageValues = { frontmatter, createdAt, modifiedAt }`; `ViewRow` carries `createdAt?`/`modifiedAt?`; every consumer of the batch reads `.frontmatter` where it read the map's value.
3. A body save and a page creation refetch an open view: `page:updateBody` and `createPage` note the value write, the same shared writer path every other frontmatter writer already takes.
4. `created_time` is a PropertyType beside `last_edited_time`; `_created_at` resolves to it; both stamps resolve from the row through the generic date branches of sort, filter, styles, menus, and widths; the modified∥created fallback, the `_id` sort, and the `lastEditedTime` value kind are deleted.
5. Both stamp columns are revealable from the Hidden frame on any view, labeled "Creation Time" / "Last Modified" from one source, glyphed from the type registry, and offered as sort and filter targets.
6. No page writer sets or governs `created_at`/`modified_at`; `createPage` writes id (+icon); a relocate is a rename only; a body save governs no key and passes the frontmatter bytes through; `governedWrite`, `pageValue`, and `governedSweep` govern only the caller's keys; the sweep's `stamp` option is gone; `pageFrontmatter` and `PAGE_MODELED_KEYS` drop the stamps while `RESERVED_KEY_NAMES` keeps refusing both names.
7. No sidecar writer sets `modified_at`; `baseSidecar` drops it.
8. Clear Exclusion strips the kind id keys and `<Context>` keys only; its copy says so.
9. Adoption mints a page's ULID seeded from the file's `min(birthtime, mtime)`, so an adopted page's Creation Time is the file's age rather than the adoption moment; in-app creates keep the monotonic mint.
10. The `patchBandValue` / `patchSeedValues` fallback base is `{ PageID: id }`, never `{ id }`.
11. Every document the change falsifies is rewritten in the commit that falsifies it, carried by the Made False table.
12. Closeout normalizes NexusOS once — every `.md` and sidecar under the vault, excluded folders included — with the app closed, after a backup, on Nathan's per-item go.

**Acceptance — the whole thing working:** In a scratch nexus, a Collection's Table view open with both stamp columns revealed from the Hidden frame, three pages created through **New Page** one second apart: each row shows Creation Time and Last Modified the moment it lands, in creation order, Last Modified equal to each file's mtime as `stat` reports it; sorting by Last Modified descending puts the page whose body was just edited first, and that reorder happens without reopening the view; renaming a page moves neither column; single- and double-clicking a stamp cell opens no editor; a filter "Last Modified is after <yesterday>" keeps all three; `rg -e "created_at|modified_at" <nexus>` → 0 after every one of those actions; and a page adopted from a file dated last year shows last year under Creation Time.

**Forced By**

- `cachedParse` (`walkCache.ts:38`) stats before every parse and discards the stat → the record carries `mtimeMs` from that stat, and a failed stat (which today falls through to an uncached parse) yields `mtimeMs: null` (Task 1).
- `resolveFieldValue`'s memo is keyed by the frontmatter object (`value.ts:93`), and the optimistic override replaces that object → a stamp read through the memo would go stale on every patch, so both stamps bypass it, as `_title` already does (Task 3).
- `OverrideEntry.fm` is a frontmatter (`useValuesEpoch.ts:6`) and the epoch's merge replaces a page's batch entry wholesale (`useViewHost.ts:169–178`) → the merge preserves the page's stamps around a patched frontmatter (Task 1).
- `monotonicFactory` clamps a seed at or below the last mint up to the last mint → the seeded adoption mint uses plain `ulid(seed)`, never the monotonic factory (Task 8).
- `adoptedId` pages have no ULID → `createdAt` is null for them and Creation Time renders blank, which is honest: the file has no identity yet (Task 1).
- `fs.rename` does not change mtime → renames and moves stop bumping Modified; Nathan accepted this (Task 5).
- `mergeFrontmatter` re-emits the YAML document on every governed write → a body save that governs no key passes the frontmatter bytes through untouched instead of re-serializing them (Task 5).
- `page:updateBody` calls neither `noteValueWrite` nor `pushValueChanges` (`index.ts:1097–1110`) → once Modified is the mtime, a body save must note and push or the open view's column lags until the next unrelated write (Task 2).
- `mintNewView` (`shared/views.ts:327–337`) seeds `property_order: [_title]` and `hidden_properties` as the schema ids, and `hiddenListIds` lists `_modified_at` only when already hidden → a stamp is in neither array on a new view, so no UI path reveals Modified; the hidden list must offer both stamps whenever they aren't shown (Task 4).
- The NexusOS working tree is dirty (543 entries at grounding) → the closeout backup is a dated copy of the touched files, not a stash (Closeout).
- `atomicWriteFile` is temp + rename, which replaces the inode and stamps it with now → once Modified is the mtime, every rewrite is a mutation of the feature: the closeout script restores each file's timestamps after writing, and its backup copies with `-p` (Closeout).
- `mutate.ts`'s `createPage` case never calls `noteValueWrite`, and nothing refetches a container's batch on membership change → a row can enter a view without a batch entry, which under Task 1 renders both stamps blank; the creation notes its write like the cover and icon cases beside it (Task 2).

**Inherited Reasoning:** Nathan raised and settled: Clear Metadata reduces to ids + Contexts (09-01-2026); the typed carrier over a tuple; group-by-stamp not built ("if it already exists, just make sure it rides the change" — it doesn't: `GROUPABLE_PANE` admits schema definitions only, so nothing rides); rename/move not bumping Modified; the body-save push as "a shared writer across different purposes"; the `{ id: pageId }` fallback fixed alongside; the one-time vault normalization at closeout. The sibling plan's Sequenced After row "A `Last Edited Time` column can lag on an in-app body edit" is Task 2 here.

**Grounding** *(re-open these; don't cite them)*

- `src/shared/identity.ts:20–23` · `schemas.ts:31–36, 61–68` · `properties.ts:7–18, 130–151` · `propertyValue.ts:14, 57–60, 126–129` · `types.ts:594–616` · `bridge.ts:146` · `cellMenu.ts:86–99` · `columnStyles.ts:62–80` · `columnMenu.ts:76–90` · `views.ts:327–337`.
- `src/main/walkCache.ts:38–62` · `readNexus.ts:321, 372–398` · `CRUD/loadValues.ts` · `CRUD/page.ts` · `CRUD/governedWrite.ts:30–46` · `CRUD/pageValue.ts:33–72` · `CRUD/governedSweep.ts:44–48, 112–124` · `CRUD/contextCascade.ts:74` · `CRUD/deleteProperty.ts:88–95, 120–130` · `CRUD/replaySchemaCascade.ts:60–68` · `CRUD/removeProperty.ts:87–98` · `CRUD/views.ts:40, 61, 79` · `CRUD/containerConfig.ts:44` · `CRUD/contextWrite.ts:210, 303` · `CRUD/util.ts:46–49` · `IO/pageFile.ts:78–112` · `identity.ts:32` · `index.ts:469–486, 1093–1106, 1237–1245` · `adopt.ts:56–65` · `ids.ts` · `exclusionScan.ts:8, 22, 60–75`.
- `src/renderer/Properties/value.ts:21–112` · `Properties/PropertyTypes.tsx:1–75` · `Properties/Assignment/columnLabel.ts` · `Views/Pipeline/{columns,sort,filter,group}.ts` · `Views/{useViewHost,useValuesEpoch,useViewCreation,contextCellWrite}.ts` · `Views/TableView/TableView.tsx:433–450, 1155–1167` · `Frames/{GroupFrame,SortFrame,HiddenFrame}.tsx` · `Frames/{filterModel,hiddenFrameModel}.ts` · `Tables/columnWidths.ts:15–72`.
- `node_modules/ulidx/dist/ulid.d.ts` — `decodeTime(id)`, `ulid(seedTime?)`, `monotonicFactory()`.
- `.claude/Guidelines/Development-Environment.md` — gates, pipefail, lint-warnings-in-text, no whole-tree git ops, main/preload don't HMR.
- NexusOS census at grounding: 49 `.md` with `created_at:`, 88 with `modified_at:`, 29 `.json` sidecars with `modified_at`, 292 `.md` in all; excluded folders Agenda, TaskNotes, Atlas, slates, file-assets.

**Environment:** Plan directory `.claude/Planning`. Spec: this session's confirmed direction. Explorer: `Explore`. Code reviewer: `feature-dev:code-reviewer`. Attack reviewer: `build-breaking-agent`. Simplification: `code-simplifier`, dual-briefed to also report non-simplicity bugs. Comments: `comment-killer-agent`, briefed "no sub-agents, no worktree." Neutral verifier: general-purpose. Gates from `Pommora/`: `npm run typecheck && npm run test && npm run lint`.

**Shapes:** removal (the stamp keys, their writers, the fallback, the `_id` sort, the `lastEditedTime` kind) · additive (the carrier, `created_time`, the body-save push, the seeded mint) · fix (the `{ id }` fallback) · user-visible (two revealable columns, a label change) · migration (the closeout vault pass) · live data (the closeout pass runs over Nathan's vault).

**Global Constraints (every task inherits these):**

- Gates from `Pommora/`: `npm run typecheck && npm run test && npm run lint`, `set -o pipefail` on any pipeline, and `Found 0 warnings` read from lint's text.
- Biome formats on write via the PostToolUse hook; an Edit failing on whitespace means re-read and retry. Shell-driven edits run `npm run format` after.
- One tree-touching writer at a time. A parallel session is executing the Comment Reduction plan on this tree: never `git stash`, `checkout .`, `clean`, or `reset`; stage explicit paths only; attribute a surprise failure to its dirty set before your own; commit each task as soon as its gate is green.
- `src/main` and `src/preload` don't hot-reload: after any main-side task the dev process restarts before anything is verified live. Tasks 1, 2, 5, 6, 8 touch main.
- `src/shared` imports no fs, no React, and nothing from `src/main`. Main owns the filesystem.
- Comments: at most one load-bearing why per change; never restate a value; never narrate. The plan's fences carry only path markers and contract edges.
- Commit granularity: one commit per task, message on the task heading, ticks in the same commit. No per-task line-count reporting; the closeout reports Task 0's target files baseline → finish, comments and tests excluded (Nathan, 09-01-2026).
- Out of scope everywhere: Sapphire; PageID or path-identity retirement; the content index; grouping by a stamp; any new frontmatter key.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| ------------------------- | ---------------------------- | ---------------------- | ------------------------- |
| [[PropertiesPM]] Type Catalog :37 · Identity :42 · §Page keys :114–121 | "Last Edited Time — derived from `modified_at`" · `_id` in the reserved-id list · "Every Page carries … `created_at`, and `modified_at`" · "sorting and filtering fall back to `created_at`" · the frontmatter example's two stamp lines | two stamp types from mtime and the ULID; `_id` gone; no stamp keys | 3, 5 |
| [[ViewTypesPM]] :85 | "Sort By (None, Title, Modified, and the sortable properties)" | Creation Time and Last Modified both sort | 4 |
| [[PagesPM]] :17, :19 | "five keys Pommora governs … `created_at`, `modified_at`" · "`modified_at` is stamped on a property value change, a text change, a move, and a rename" | three governed keys; Modified is the mtime, so a value write or body save moves it, a rename or move does not, and a schema sweep that rewrites a page restores it | 5 |
| [[ArchitecturePM]] :93 · :116 | "each page's identity key, `created_at` and `modified_at` stamps, and `<Context>` keys" · the reserved-name list (still true — the names stay refused) | Clear strips ids and Context keys only | 5 |
| [[ArchitecturePM]] §Data layer | (no statement of the sweep's effect on Modified) | a governed sweep that rewrites a page restores its Modified time — the sweep is not the user's edit | 5 |

**Dead Vocabulary**

- `created_at` · `modified_at` → expect 0 in `src/` outside `properties.ts`'s reserved-name set (2 legitimate hits) and `RESERVED_PROPERTY_ID` (`_created_at`, `_modified_at` are ids, not keys). `PAGE_STAMP_KEYS` → 0. `modifiedStampString` → 0. `lastEditedTime` → 0. `MODIFIED_TARGET` → 0. `stamp:` in `src/main/CRUD` → 0. `'modified'` as a ColumnKind → 0. `RESERVED_PROPERTY_ID.id` → 0.
- Control: `last_edited_time` → ≥ 12 in `src/` outside tests (16 at grounding; Task 0 strips three comment mentions, and Task 3 adds `created_time` arms rather than more of these); `nowIso` → ≥ 1 (`main/identity.ts:32`, nexus.json's `createdAt` — its only surviving caller once Tasks 5 and 6 land). Zero on a control means the sweep never ran.

**Hazard Window:** Task 1 opens it — from that commit the running build reads Modified from mtime while the vault still holds stamp keys as inert foreign frontmatter (harmless: a foreign key is preserved and shown nowhere). Task 5 closes the writers. The closeout pass removes the keys; until then a page written by the app keeps whatever stamp it had, frozen.

---

### Phase 0 — Strip the old truth

#### Task 0: Strip stamp-era comments from the target files

**Requirement:** 1

**Why:** The files this plan rewrites carry prose asserting what is about to become false — "bumps modified_at — a rename counts as an edit," "the modified∥created stamp resolution is shared with filter," "It also stamps `modified_at` itself," "virtual — never persisted (encode throws)." An implementor reading those mid-arc inherits a contradiction; a reviewer reading them reads a prompt.

**Now** — baselines recorded at execution: `rg -F "KNOB" src` → N; `rg -F "(Nathan" src` → N:

```ts
// Targets — every file a later task's Now fence names:
// src/shared/{identity,schemas,properties,propertyValue,types,bridge,cellMenu,columnStyles,columnMenu}.ts
// src/main/{walkCache,readNexus,index,adopt,ids,exclusionScan}.ts
// src/main/CRUD/{loadValues,page,governedWrite,pageValue,governedSweep,contextCascade,deleteProperty,replaySchemaCascade,removeProperty,views,containerConfig,contextWrite,util}.ts · src/main/IO/pageFile.ts
// src/renderer/Properties/{value.ts,PropertyTypes.tsx} · Properties/Assignment/columnLabel.ts · Views/Pipeline/{columns,sort,filter,group}.ts · Views/{useViewHost,useValuesEpoch,useViewCreation,contextCellWrite}.ts · Views/TableView/TableView.tsx · Frames/{GroupFrame,SortFrame,HiddenFrame}.tsx · Frames/{filterModel,hiddenFrameModel}.ts · Tables/columnWidths.ts
```

**Becomes** — the same files, each comment either a why the code can't show or gone. Anything describing a stamp's bump rule, the modified∥created fallback, "virtual — never persisted," the sweep's `stamp` option, or the `_modified_at` default-off rule goes. `KNOB` and `(Nathan's …)` markers survive.

**Skills:** `comment-killer-agent`, single-handed — "no sub-agents, no worktree; the tree is shared with a parallel session and not clean; touch only the listed files; stage nothing."

**Verify — automated**

- [ ] `git diff --stat` touches only the target files; `git diff -- '*.test.*'` is empty.
- [ ] `rg -F "counts as an edit" src` → 0; `rg -F "modified∥created" src` → 0; `rg -F "never persisted" src` → 0. Controls: `KNOB` = baseline; `(Nathan` = baseline.
- [ ] `git worktree list` shows only the main tree.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] *(none)*

---

### Phase 1 — The carrier

#### Task 1: `loadValues` returns `PageValues`; `ViewRow` carries the stamps

**Requirement:** 2

**Why:** The two stamps need one road from main to every row, and the batch a container already loads is that road — it is keyed by the same id the tree assigns and refetched by the same epoch. Carrying them beside the frontmatter, typed, means no arm of the renderer ever asks the frontmatter for a stamp again. Unblocks Tasks 3 and 4.

**Now** — `rg -n "Record<string, PageFrontmatter>" src --glob '!*.test.*'` → 11 (`bridge.ts:146`, `main/index.ts:1239`, `loadValues.ts:18,28`, `useViewHost.ts:68`, `useValuesEpoch.ts:54`, `useViewCreation.ts:37,39`, `group.ts:90,107`, `GroupFrame.tsx:785`) — `preload/index.ts:86` and `TableView.tsx` derive the shape and hold no annotation; `rg -n "\{ id: pageId \}" src` → 2 (`TableView.tsx:1161`, `useViewCreation.ts:94`):

```ts
// src/main/walkCache.ts:38
export async function cachedParse<T>(absPath: string, parse: () => Promise<T>): Promise<T> {
  let s: { mtimeMs: number; size: number }
  try {
    s = await stat(absPath)
  } catch {
    return parse()
  }

// src/main/readNexus.ts:372
export interface PageRecord {
  node: PageNode
  fm: Json
}
// :395 — inside readPageRecord's `cachedParse(absFile, async () => { … })`
    retainContextKeys(node, fm)
    return { node, fm }

// src/main/CRUD/loadValues.ts:15
export async function loadValues(rootPath: string, containerRelPath: string): Promise<Record<string, PageFrontmatter>> {
    const parsed = pageFrontmatter.safeParse({ ...rec.fm, [PAGE_ID_KEY]: rec.node.id })
    if (parsed.success) out[rec.node.id] = parsed.data

// src/main/index.ts:1237 — the handler annotates the reply shape a second time
    'view:loadValues': { kind: 'raw', fn: async (containerPath: unknown): Promise<Record<string, PageFrontmatter>> => { … } }

// src/shared/bridge.ts:146
  'view:loadValues': { args: [containerPath: string]; reply: Record<string, PageFrontmatter> }

// src/shared/types.ts:594
export interface ViewRow {
  id: string
  title: string
  icon?: string
  path: string
  parentSetId?: string
  frontmatter: PageFrontmatter
  contextValues?: Record<string, string[]>
}

// src/renderer/Views/Pipeline/group.ts:87
function toRow(page: PageNode, parentSetId: string | undefined, values: Record<string, PageFrontmatter>): ViewRow {
  return {
    ...
    frontmatter: values[page.id] ?? { [PAGE_ID_KEY]: page.id },

// src/renderer/Views/useViewHost.ts:168
  const effectiveValues = useMemo(
    () => valueOverride
        ? { ...values, ...Object.fromEntries(Object.entries(valueOverride).map(([id, e]) => [id, e.fm])) }
        : values,
    [values, valueOverride])
// :276
    const prior = effectiveValues[row.id] ?? row.frontmatter

// src/renderer/Views/TableView/TableView.tsx:1161
    return applyValueAtRoot((values[pageId] ?? { id: pageId }) as Record<string, unknown>, def, value) as PageFrontmatter
// src/renderer/Views/useViewCreation.ts:94
      let patched = (c.values[pageId] ?? { id: pageId }) as Record<string, unknown>
```

**Becomes**

```ts
// src/main/walkCache.ts
export interface FileStat {
  mtimeMs: number
  size: number
}
// A failed stat hands `null` through, uncached, so the parser's own error semantics decide.
export async function cachedParse<T>(absPath: string, parse: (stat: FileStat | null) => Promise<T>): Promise<T> {
  let s: FileStat
  try {
    s = await stat(absPath)
  } catch {
    return parse(null)   // the catch's bare `parse()` no longer typechecks — the argument is required
  }
  … (the cache hit, the miss, and the null-value rule, all unchanged; the miss calls `parse(s)`)
}
// readNexus.ts:321 (the JSON caller) ignores the argument: `cachedParse(abs, () => …)` still typechecks —
// a function of fewer parameters is assignable.

// src/main/readNexus.ts
export interface PageRecord {
  node: PageNode
  fm: Json
  mtimeMs: number | null
}
  return cachedParse(absFile, async (stat) => {
    ...
    return { node, fm, mtimeMs: stat?.mtimeMs ?? null }
  })

// src/main/ids.ts — total: `isUlidShaped` admits a first character 8–Z that ulidx's decoder rejects
// (its own pattern is `^[0-7]…`), and a throw here rejects the whole batch, blanking every column in
// the container. A hand-edited id reads as "no instant," the same as an adopted one.
/** The instant a ULID encodes; null for an adopted (path-derived) id or one the decoder refuses. */
export function idTime(id: string): number | null {
  if (isAdoptedId(id)) return null
  try {
    return decodeTime(id)
  } catch {
    return null
  }
}

// src/shared/types.ts
/** One page's batch entry for the view pipeline. Both stamps are ISO 8601; `createdAt` is null under
 *  an adopted id, `modifiedAt` null when the file could not be stat'd. */
export interface PageValues {
  frontmatter: PageFrontmatter
  createdAt: string | null
  modifiedAt: string | null
}
export interface ViewRow {
  id: string
  title: string
  icon?: string
  path: string
  parentSetId?: string
  frontmatter: PageFrontmatter
  createdAt?: string
  modifiedAt?: string
  contextValues?: Record<string, string[]>
}

// src/main/CRUD/loadValues.ts
export async function loadValues(rootPath: string, containerRelPath: string): Promise<Record<string, PageValues>> {
  ...
    const parsed = pageFrontmatter.safeParse({ ...rec.fm, [PAGE_ID_KEY]: rec.node.id })
    if (!parsed.success) continue
    const created = idTime(rec.node.id)
    out[rec.node.id] = {
      frontmatter: parsed.data,
      createdAt: created === null ? null : new Date(created).toISOString(),
      modifiedAt: rec.mtimeMs === null ? null : new Date(rec.mtimeMs).toISOString(),
    }

// src/shared/bridge.ts
  'view:loadValues': { args: [containerPath: string]; reply: Record<string, PageValues> }

// src/main/index.ts:1229–1231 — the handler's own annotation follows, and its header line stops
// saying "pageId → frontmatter".
      fn: async (containerPath: unknown): Promise<Record<string, PageValues>> => {

// src/renderer/Views/Pipeline/group.ts
function toRow(page: PageNode, parentSetId: string | undefined, values: Record<string, PageValues>): ViewRow {
  const v = values[page.id]
  return {
    id: page.id,
    title: page.title,
    icon: page.icon,
    path: page.path,
    ...(parentSetId !== undefined ? { parentSetId } : {}),
    frontmatter: v?.frontmatter ?? { [PAGE_ID_KEY]: page.id },
    ...(v?.createdAt != null ? { createdAt: v.createdAt } : {}),
    ...(v?.modifiedAt != null ? { modifiedAt: v.modifiedAt } : {}),
    ...(page.contextValues !== undefined ? { contextValues: page.contextValues } : {}),
  }
}

// src/renderer/Views/useViewHost.ts — the override patches the frontmatter and keeps the stamps
  const effectiveValues = useMemo(() => {
    if (!valueOverride) return values
    const out = { ...values }
    for (const [id, e] of Object.entries(valueOverride))
      out[id] = { createdAt: null, modifiedAt: null, ...values[id], frontmatter: e.fm }
    return out
  }, [values, valueOverride])
// :276
    const prior = effectiveValues[row.id]?.frontmatter ?? row.frontmatter

// src/renderer/Views/contextCellWrite.ts — the same `?.frontmatter ??` at its base read.
// src/renderer/Views/useValuesEpoch.ts — `setValues: Dispatch<SetStateAction<Record<string, PageValues>>>`; OverrideEntry unchanged.
// src/renderer/Views/useViewCreation.ts — `values`/`effectiveValues: Record<string, PageValues>`; `patchSeedValues`:
      let patched = (c.values[pageId]?.frontmatter ?? { [PAGE_ID_KEY]: pageId }) as Record<string, unknown>
// src/renderer/Views/TableView/TableView.tsx — patchBandValue:
      (values[pageId]?.frontmatter ?? { [PAGE_ID_KEY]: pageId }) as Record<string, unknown>,
// src/renderer/Frames/GroupFrame.tsx:785 — `useState<Record<string, PageValues>>({})`.
```

**Assumed by:** Tasks 3, 4 (rows carry `createdAt`/`modifiedAt`); Task 2 (the push refetches this batch).

**Verify — automated**

- [ ] Red first: `loadValues.test.ts` gains "carries the file's mtime and the id's time as ISO strings" (a page whose PageID is a known ULID, `utimes` set to a fixed instant → `modifiedAt` equals it; `createdAt` equals `decodeTime`) and "an adopted page has `createdAt: null`" — both fail on the old map shape.
- [ ] Degenerate: `ids.test.ts` "`idTime` returns null for a shape-valid id the decoder refuses" (`8` + 25 valid characters); `loadValues.test.ts` "one undecodable PageID leaves the rest of the batch intact" — the page lands with `createdAt: null`, its siblings with theirs. Both go red with the try/catch removed.
- [ ] `group.test.ts` (or the pipeline test that covers `toRow`): a values entry with stamps → the row carries them; an absent entry → neither key present.
- [ ] Fix test (Req 10): `patchBandValue` on a page absent from the batch produces a frontmatter keyed `PageID`, not `id` — red before, green after.
- [ ] Inverted in the same commit: every test building the batch by hand — `group.test.ts` (5 sites) and `resolveView.test.ts` (8 sites) both declare `Record<string, PageFrontmatter>` literals and hand them to `flattenContainer`; each becomes a `PageValues` entry. `rg -n "Record<string, PageFrontmatter>" src` → 0 including tests.
- [ ] `rg -n "\{ id: pageId \}" src` → 0. Control: `rg -c "PageValues" src` ≥ 8.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] *(carried — Completion Criteria: the batch shape is invisible until Task 4 reveals the columns)*

#### Task 2: A body save and a page creation note and push their value write

**Requirement:** 3

**Why:** Modified is now the mtime, and a body save moves it; a creation mints both stamps at once. Every other frontmatter writer already hands its file to `noteValueWrite` and lets `confirmWrite` push; the body handler and `createPage` are the two writers that don't. Without the first, an open view showing Last Modified sits stale after a text edit; without the second, a page made from **New Page** has no batch entry until an unrelated write in its container — both stamp columns blank on the row just created. One shared push path, no second mechanism.

**Now** — `rg -n "noteValueWrite\(" src/main --glob '!*.test.*'` → 10 (its definition in `valuesChanged.ts:16` plus nine callers; `mutate.ts` holds two of them, for cover and icon, and none for createPage):

```ts
// src/main/index.ts:1093
    'page:updateBody': {
      kind: 'envelope',
      fn: async (relPath: unknown, body: unknown) => {
        ...
        const r = await updatePageBody(resolved.value, body)
        if (r.ok) await indexWrittenPage(root, resolved.value)
        return r.ok ? ok(null) : r
      },
    },

// src/main/mutate.ts — case 'createPage', after the order write; `confirmWrite` already runs after mutate
      await indexWrittenPage(root, r.value.path)
      return ok({
        created: { id: r.value.id, path: relJoin(req.parentPath, basename(r.value.path)) },
      })
```

**Becomes**

```ts
// src/main/index.ts
        const r = await updatePageBody(resolved.value, body)
        if (!r.ok) return r
        await indexWrittenPage(root, resolved.value)
        noteValueWrite(root, resolved.value)
        pushValueChanges(root)
        return ok(null)

// src/main/mutate.ts — case 'createPage'
      await indexWrittenPage(root, r.value.path)
      noteValueWrite(root, r.value.path)
      return ok({
        created: { id: r.value.id, path: relJoin(req.parentPath, basename(r.value.path)) },
      })
```

**Verify — automated**

- [ ] Red first: the `index.ts` handler test (or `valuesChanged.test.ts`'s handler-level case) asserts a body save yields one `values:changed` push naming the page's container and id; `mutate.test.ts` asserts a `createPage` request leaves the new page in `flushValueWrites`' set — both fail before the change.
- [ ] `rg -n "noteValueWrite\(" src/main --glob '!*.test.*'` → 12. Control: `pushValueChanges` ≥ 3 (`index.ts:394, 470, 484` at grounding; this adds a fourth).
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] *(carried — Completion Criteria: an open table sorted by Last Modified reorders after a body edit in the page window, and a page made from New Page shows both stamps without a reopen)*

#### Gate 1 — the carrier

- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.
- [ ] Every task's **Verify — automated** ticked against a result just watched.
- [ ] `code-simplifier` over the phase diff, dual-briefed (simplify; report any non-simplicity bug it sees); every finding fixed or carrying a ruling.
- [ ] Commits landed per task, explicit paths only.
- [ ] Not a declared stop — Phase 2 opens.

---

### Phase 2 — The renderer reads the row

#### Task 3: Two stamp types, one date branch; the fallback, the `_id` sort, and the virtual kind go

**Requirement:** 4

**Why:** With both stamps on the row, the pipeline's special cases have nothing left to special-case: `_modified_at` resolved through a fallback because the key could be missing; the `lastEditedTime` kind existed to throw on a persist that can no longer be attempted; the `_id` sort ordered by a ULID string that Creation Time now orders by meaning. Declaring `created_time` beside `last_edited_time` lets every type-dispatched switch treat the two stamps as one date shape.

**Now** — `rg -c "last_edited_time" src --glob '!*.test.*'` → 16 lines across 13 files at grounding (three are comments Task 0 strips first — re-record the baseline after Phase 0); `modifiedStampString` → 5; `lastEditedTime` → 4; `RESERVED_PROPERTY_ID.id\b` → 1 (`sort.ts:119`):

```ts
// src/shared/properties.ts:7
export const propertyType = z.enum(['number', 'checkbox', 'datetime', 'select', 'multi_select', 'status', 'url', 'context', 'last_edited_time', 'file'])
// :130
export const RESERVED_PROPERTY_ID = { id: '_id', title: '_title', createdAt: '_created_at', modifiedAt: '_modified_at', location: '_location' } as const

// src/shared/propertyValue.ts:14
  | { kind: 'lastEditedTime' } // virtual — never persisted (encode throws)
// :57
    case 'datetime':
    case 'last_edited_time':
      return typeof raw === 'string' ? { kind: 'datetime', value: raw } : NULL
// :126
    case 'lastEditedTime':
      throw new Error('PropertyValue.lastEditedTime is virtual and must not be persisted; …')

// src/renderer/Properties/value.ts:21
export function declaredType(propertyId, schema, contextIds = []): PropertyType | 'title' | undefined {
  switch (propertyId) {
    case RESERVED_PROPERTY_ID.title: return 'title'
    case RESERVED_PROPERTY_ID.modifiedAt: return 'last_edited_time'
    default: …
// :50
  if (propertyId === RESERVED_PROPERTY_ID.title) return { kind: 'select', value: row.title }
// :87 — inside computeFieldValue, not resolveFieldValue
  if (propertyId === RESERVED_PROPERTY_ID.modifiedAt) {
    return typeof fm.modified_at === 'string' && fm.modified_at ? { kind: 'datetime', value: fm.modified_at } : { kind: 'null' }
  }
// :105
export function modifiedStampString(row: ViewRow): string | null { … modified_at || created_at || null }

// src/renderer/Views/Pipeline/sort.ts:105
function modifiedStamp(row: ViewRow): number { … }
// :119
    case RESERVED_PROPERTY_ID.id: return { extract: (r) => r.id, less: plainLess, ascending }
    case RESERVED_PROPERTY_ID.modifiedAt: return { extract: modifiedStamp, less: numericLess, ascending }
// :142
    case 'datetime':
    case 'last_edited_time':
      return { extract: (r) => dateOf(r, c.property_id, schema), less: numericLess, ascending }

// src/renderer/Views/Pipeline/filter.ts:139
  if (rule.property_id === RESERVED_PROPERTY_ID.modifiedAt) {
    const s = modifiedStampString(row)
    return evaluateDate(s ? { kind: 'datetime', value: s } : { kind: 'null' }, rule.op, rule.value)
  }
// :192
    case 'datetime':
    case 'last_edited_time':
      return evaluateDate(v, op, expected)

// src/shared/columnStyles.ts:73–75 · src/shared/columnMenu.ts:89–90 · src/renderer/Frames/filterModel.ts:176–178
    case 'datetime':
    case 'last_edited_time':          // three date-shaped arms; `created_time` joins each

// src/shared/cellMenu.ts:90–99 — NOT a date-shaped arm. A stamp sits with checkbox/number
// (style-only, NO `clearable`); the datetime arm above it carries `clearable: filled`, so putting
// a stamp there would offer Clear on a cell that has nothing to clear.
  if (type === 'status' || type === 'datetime')
    return { kind: 'style-only', type, current: style, clearable: filled }
  if (type === 'checkbox' || type === 'number' || type === 'last_edited_time') {

// src/renderer/Tables/columnWidths.ts:27–28 — keyed by type, plus `created` keyed by id instead
  last_edited_time: { min: 90, default: 120, max: 250 },
  created: { min: 90, default: 120, max: 250 },
// columnWidths.ts:51 (widthFor), :67 (minWidthFor)
  if (columnId === RESERVED_PROPERTY_ID.createdAt) return WIDTHS.created
  if (columnId === RESERVED_PROPERTY_ID.createdAt) return base
```

**Becomes**

```ts
// src/shared/properties.ts
export const propertyType = z.enum(['number', 'checkbox', 'datetime', 'select', 'multi_select', 'status', 'url', 'context', 'created_time', 'last_edited_time', 'file'])
export const RESERVED_PROPERTY_ID = { title: '_title', createdAt: '_created_at', modifiedAt: '_modified_at', location: '_location' } as const
/** The type each stamp column declares — the one place an id becomes a stamp type. Partial so a
 *  lookup on any other id types as `undefined` and the truthiness guard at each reader means
 *  something. */
export const STAMP_TYPE: Readonly<Partial<Record<string, PropertyType>>> = {
  [RESERVED_PROPERTY_ID.createdAt]: 'created_time',
  [RESERVED_PROPERTY_ID.modifiedAt]: 'last_edited_time',
}

// src/shared/propertyValue.ts — the `lastEditedTime` member and its encode arm are gone; decode:
    case 'datetime':
    case 'created_time':
    case 'last_edited_time':
      return typeof raw === 'string' ? { kind: 'datetime', value: raw } : NULL

// src/renderer/Properties/value.ts
export function declaredType(propertyId, schema, contextIds = []): PropertyType | 'title' | undefined {
  if (propertyId === RESERVED_PROPERTY_ID.title) return 'title'
  const stamp = STAMP_TYPE[propertyId]
  if (stamp) return stamp
  if (contextIds.includes(propertyId)) return 'context'
  return schema.find((d) => d.id === propertyId)?.type
}
const stampValue = (iso: string | undefined): PropertyValue =>
  iso === undefined ? { kind: 'null' } : { kind: 'datetime', value: iso }
export function resolveFieldValue(row, propertyId, schema): PropertyValue {
  // Title and the stamps read the row, not the frontmatter the memo is keyed on.
  if (propertyId === RESERVED_PROPERTY_ID.title) return { kind: 'select', value: row.title }
  if (propertyId === RESERVED_PROPERTY_ID.createdAt) return stampValue(row.createdAt)
  if (propertyId === RESERVED_PROPERTY_ID.modifiedAt) return stampValue(row.modifiedAt)
  … (the context rider, the def lookup, and the memo's cacheKey, unchanged)
  // computeFieldValue is INLINED: with the `_modified_at` branch gone it is a two-line wrapper over
  // decodeValue with one caller, and its `propertyId` parameter goes unread — which trips
  // `lint/correctness/noUnusedFunctionParameters` (verified against this repo's Biome config), so
  // the gate forces the question either way.
  if (!v) {
    v = def ? decodeValue(def, (row.frontmatter as Record<string, unknown>)[def.name]) : { kind: 'null' }
    m.set(cacheKey, v)
  }
  return v
}
// computeFieldValue, modifiedStampString: deleted.

// src/renderer/Views/Pipeline/sort.ts — `modifiedStamp` and the `_id`/`_modified_at` cases deleted; the title case stays:
  switch (c.property_id) {
    case RESERVED_PROPERTY_ID.title:
      return { extract: (r) => r.title, less: ciLess, ascending }
  }
  switch (declaredType(c.property_id, schema)) {
    ...
    case 'datetime':
    case 'created_time':
    case 'last_edited_time':
      return { extract: (r) => dateOf(r, c.property_id, schema), less: numericLess, ascending }

// src/renderer/Views/Pipeline/filter.ts — the `_modified_at` block deleted; evaluateByType:
    case 'datetime':
    case 'created_time':
    case 'last_edited_time':
      return evaluateDate(v, op, expected)

// src/shared/columnStyles.ts · columnMenu.ts · src/renderer/Frames/filterModel.ts — `case 'created_time':`
//   joins each `last_edited_time` arm.
// src/shared/cellMenu.ts — `created_time` joins the checkbox/number/`last_edited_time` predicate, NOT
//   the datetime one: a stamp is style-only and never clearable.
  if (type === 'checkbox' || type === 'number' || type === 'created_time' || type === 'last_edited_time') {
// src/renderer/Tables/columnWidths.ts — WIDTHS keyed by type only; both `createdAt` special cases deleted:
  created_time: { min: 90, default: 120, max: 250 },
  last_edited_time: { min: 90, default: 120, max: 250 },
```

**Assumed by:** Task 4 (`STAMP_TYPE`, `declaredType` resolving both stamps).

**Verify — automated**

- [ ] Red first: `sort.test.ts` "sorts `_created_at` by the row's createdAt" and "sorts `_modified_at` by the row's modifiedAt, absent last ascending"; `filter.test.ts` the same pair through `evaluateDate`; `value.test.ts` "`_created_at` resolves from the row, not the frontmatter" — all fail before.
- [ ] Inverted in the same commit: every sort/filter test asserting the created fallback; `propertyValue.test.ts`'s encode-throws case (deleted); `columnWidths.test.ts`'s `created` key.
- [ ] Crossing: one test resolves the same row through `resolveFieldValue('_modified_at')`, `buildCriterion`, and the filter — three readers, one value.
- [ ] `rg -c "modifiedStampString" src` → 0; `lastEditedTime` → 0; `RESERVED_PROPERTY_ID.id\b` → 0; `WIDTHS.created\b` → 0; `computeFieldValue` → 0. Control: `rg -c "created_time" src --glob '!*.test.*'` ≥ 11 — the Becomes fences name eleven sites, and a looser floor passes with an arm missed.
- [ ] The compiler enumerates one site only: `PROPERTY_TYPES` is the codebase's sole exhaustive `Record<PropertyType, …>`, so adding `'created_time'` to the enum alone yields exactly one typecheck error; every other arm (`columnStyles.defaultStyleFor`, `filter.evaluateByType`, `sort.buildCriterion`, `cellMenu`, `columnMenu`, `filterModel`, the decode, `WIDTHS`) sits behind a `default:` or a `Record<string, …>` and fails silently when missed — a Creation Time column with no date format, a filter that always passes, a sort that returns null. Tick each named site by hand against the fence, not by the gate.
- [ ] Regression guard for the cellMenu split: a `_created_at` cell resolves to a `style-only` menu with no `clearable` — the same kind `_modified_at` gets, never the `datetime` arm's.
- [ ] Doc: PropertiesPM :37 (two rows: Creation Time from the ULID, Last Modified from the mtime; neither persisted), :42 (`_id` removed from the reserved list). Req 11.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] *(carried — Completion Criteria)*

#### Task 4: Both stamp columns reveal, label, glyph, and target from one source

**Requirement:** 5

**Why:** A stamp the pipeline can sort is useless if no surface offers it. Today a new view's hidden list never lists Modified and the column resolver refuses `_created_at`; the header label, the pane label, and the type label are three literals. After this, revealing either stamp is a Hidden-frame toggle, and "Creation Time" / "Last Modified" is written once.

**Now** — `rg -n "MODIFIED_TARGET" src` → 5 (`PropertyTypes.tsx:68`, `SortFrame.tsx:12,96`, `filterModel.ts:14,213`); `rg -n "'modified'" src --glob '!*.test.*'` → 2 (`types.ts:609`, `columns.ts:18`):

```ts
// src/shared/types.ts:609
export type ColumnKind = 'title' | 'property' | 'context' | 'modified'

// src/renderer/Views/Pipeline/columns.ts:13
function columnKind(id, contextIds): ColumnKind {
  switch (id) {
    case RESERVED_PROPERTY_ID.title: return 'title'
    case RESERVED_PROPERTY_ID.modifiedAt: return 'modified'
    default: return contextIds.includes(id) ? 'context' : 'property'
  }
}
// :37
    if (id === RESERVED_PROPERTY_ID.title || id === RESERVED_PROPERTY_ID.modifiedAt || contextIds.includes(id) || schema.some((d) => d.id === id)) {

// src/renderer/Frames/hiddenFrameModel.ts:38
    ...(set.has(RESERVED_PROPERTY_ID.modifiedAt) ? [RESERVED_PROPERTY_ID.modifiedAt] : []),

// src/renderer/Frames/HiddenFrame.tsx:21 — rowIcon; a schema def answers FIRST and stays untouched
function rowIcon(id: string, schema: PropertyDefinition[]): ReactNode {
  const def = schema.find((d) => d.id === id)
  if (def) return <Icon name={propertyIcon(def)} size={s.ICON.doc} />
  if (id === RESERVED_PROPERTY_ID.title) return <PropertyTypeIcon type="title" size={s.ICON.doc} />
  if (id === RESERVED_PROPERTY_ID.modifiedAt) return <PropertyTypeIcon type="last_edited_time" size={s.ICON.doc} />
  return <PropertyTypeIcon type="context" size={s.ICON.doc} />
}

// src/renderer/Properties/Assignment/columnLabel.ts:6
const RESERVED_LABEL: Record<string, string> = {
  [RESERVED_PROPERTY_ID.title]: 'Title',
  [RESERVED_PROPERTY_ID.createdAt]: 'Created',
  [RESERVED_PROPERTY_ID.modifiedAt]: 'Modified',
}

// src/renderer/Properties/PropertyTypes.tsx:27
  last_edited_time: { label: 'Last edited', icon: 'history' },
// :68
export const MODIFIED_TARGET: PaneTarget = { id: RESERVED_PROPERTY_ID.modifiedAt, label: 'Modified', icon: propertyTypeIconName('last_edited_time') }

// src/renderer/Frames/SortFrame.tsx:58
  if (propertyId === RESERVED_PROPERTY_ID.modifiedAt) return VALUE_DIRECTIONS
// :96 · src/renderer/Frames/filterModel.ts:213
    MODIFIED_TARGET,

// src/renderer/Views/TableView/TableView.tsx:437
    if (id === RESERVED_PROPERTY_ID.createdAt) {
      return (<span className="col-header-icon"><Icon name="clock-plus" size="body" /></span>)
    }
```

**Becomes**

```ts
// src/shared/types.ts
export type ColumnKind = 'title' | 'property' | 'context' | 'stamp'

// src/renderer/Views/Pipeline/columns.ts — one idiom for "is this a stamp id" everywhere: the lookup
function columnKind(id, contextIds): ColumnKind {
  if (id === RESERVED_PROPERTY_ID.title) return 'title'
  if (STAMP_TYPE[id]) return 'stamp'
  return contextIds.includes(id) ? 'context' : 'property'
}
    if (id === RESERVED_PROPERTY_ID.title || STAMP_TYPE[id] || contextIds.includes(id) || schema.some((d) => d.id === id)) {

// src/renderer/Frames/hiddenFrameModel.ts — the stamps follow the schema-property rule: listed unless shown
    ...Object.keys(STAMP_TYPE).filter((id) => set.has(id) || !shown.has(id)),

// src/renderer/Frames/HiddenFrame.tsx — rowIcon's def check and context tail unchanged
  if (id === RESERVED_PROPERTY_ID.title) return <PropertyTypeIcon type="title" size={s.ICON.doc} />
  const stamp = STAMP_TYPE[id]
  if (stamp) return <PropertyTypeIcon type={stamp} size={s.ICON.doc} />

// src/renderer/Properties/Assignment/columnLabel.ts — the one source for the three reserved labels
export const RESERVED_LABEL: Readonly<Record<string, string>> = {
  [RESERVED_PROPERTY_ID.title]: 'Title',
  [RESERVED_PROPERTY_ID.createdAt]: 'Creation Time',
  [RESERVED_PROPERTY_ID.modifiedAt]: 'Last Modified',
}

// src/renderer/Properties/PropertyTypes.tsx — the type labels read the column labels (this file already imports from columnLabel)
  created_time: { label: RESERVED_LABEL[RESERVED_PROPERTY_ID.createdAt], icon: 'clock-plus' },
  last_edited_time: { label: RESERVED_LABEL[RESERVED_PROPERTY_ID.modifiedAt], icon: 'history' },
export const STAMP_TARGETS: PaneTarget[] = Object.entries(STAMP_TYPE).map(([id, type]) => ({
  id,
  label: propertyTypeLabel(type),
  icon: propertyTypeIconName(type),
}))
// MODIFIED_TARGET: deleted.

// src/renderer/Frames/SortFrame.tsx
  if (STAMP_TYPE[propertyId]) return VALUE_DIRECTIONS
    ...STAMP_TARGETS,
// src/renderer/Frames/filterModel.ts:213
    ...STAMP_TARGETS,

// src/renderer/Views/TableView/TableView.tsx — the `createdAt` glyph block deleted; `_created_at` reaches the
// PropertyTypeIcon path through declaredType like every other typed column.
```

**Verify — automated**

- [ ] Red first: `hiddenFrameModel.test.ts` "lists both stamps on a view that shows neither" and "omits a stamp the view shows"; `columns.test.ts` "`_created_at` in property_order emits a `stamp` column" — fail before.
- [ ] Inverted: `columns.test.ts`'s kind `'modified'`; `columnLabel.test.ts`'s 'Created'/'Modified'; any SortFrame/filterModel test naming `MODIFIED_TARGET`.
- [ ] `rg -c "MODIFIED_TARGET" src` → 0; `rg -c "'modified'" src` → 0; `rg -F "clock-plus" src/renderer/Views` → 0 (it moves to `PROPERTY_TYPES.created_time.icon`). Control: `rg -c "STAMP_TYPE" src` ≥ 8; `STAMP_TARGETS` in 3 files (`PropertyTypes.tsx` defines, `SortFrame.tsx` and `filterModel.ts` import and spread).
- [ ] `rg -F "'Last Modified'" src` → 1; `rg -F "'Creation Time'" src` → 1 (columnLabel.ts only).
- [ ] Doc: ViewTypesPM :85 Sort By lists Creation Time and Last Modified. Req 11.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] On a Collection's Table view, the Hidden frame lists **Creation Time** and **Last Modified** with the clock-plus and history glyphs; toggling each reveals a dated column; the header glyph appears when Column Icons is on; the Sort and Filter frames offer both.
- [ ] Label check: the labels read "Creation Time" and "Last Modified" — an assumption Nathan can overturn by editing two strings in `columnLabel.ts`.
- [ ] Single-click, then double-click, a Creation Time cell: no popover, no editor. `_created_at` reaching a `Cell` is new — both write paths guard on a schema def a reserved id never has, so nothing can persist, but whether TableView's editor host opens a calendar and then no-ops was not traced statically. If one opens, the editor host needs the stamp types excluded the way `cellMenu`'s style-only arm already does.

#### Gate 2 — the columns

- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.
- [ ] Every task's **Verify — automated** ticked against a result just watched.
- [ ] `code-simplifier` over the phase diff, dual-briefed; findings fixed or ruled.
- [ ] Commits landed per task, explicit paths only.
- [ ] Not a declared stop — Phase 3 opens.

---

### Phase 3 — Retire the writers

#### Task 5: No page writer stamps; Clear strips ids and Context keys only

**Requirement:** 6, 8

**Why:** With nothing reading the keys, every writer that set them is maintaining a fact the file system already holds. Removing them also removes a whole class of judgment — whether a rename, a Context unlink, or a property delete "counts as an edit" — that each writer answered on its own. A body save that governs no key can also stop re-serializing frontmatter it doesn't touch.

Clear Exclusion rides in the same commit rather than its own: `exclusionScan.ts:8` imports `PAGE_STAMP_KEYS`, so the constant cannot be deleted without its one remaining consumer in the same change — splitting them would leave a commit that doesn't typecheck. With the stamps gone, Clear has two things left to strip from a page — its kind id and its `<Context>` keys — and the copy says exactly that.

**Now** — `rg -c "modified_at" src/main --glob '!*.test.*'` → 25; `rg -c "created_at" src/main --glob '!*.test.*'` → 3; `stamp:` in `src/main/CRUD` → 3 (`replaySchemaCascade.ts`, `deleteProperty.ts`, `contextCascade.ts` — the literal does not match `stamp?: boolean` or `opts.stamp` in `governedSweep.ts`); `PAGE_STAMP_KEYS` → 4 lines (`identity.ts` ×2 — its definition and the `PAGE_MODELED_KEYS` spread — and `exclusionScan.ts` ×2 — the import and `BOOKKEEPING_KEYS`):

```ts
// src/shared/identity.ts:22
export const PAGE_STAMP_KEYS = ['created_at', 'modified_at'] as const
export const PAGE_MODELED_KEYS = [PAGE_ID_KEY, 'icon', ...PAGE_STAMP_KEYS, 'cover'] as const
// src/shared/schemas.ts:61
export const pageFrontmatter = z.looseObject({ [PAGE_ID_KEY]: z.string(), icon: z.string().optional(), created_at: z.string().optional(), modified_at: z.string().optional(), cover: z.string().optional() })
// src/shared/properties.ts:148
const RESERVED_KEY_NAMES: ReadonlySet<string> = new Set([...Object.values(KIND_ID_KEY), ...PAGE_MODELED_KEYS])

// src/main/exclusionScan.ts:8, :22 — PAGE_STAMP_KEYS' one consumer outside identity.ts
import { KIND_ID_KEY, PAGE_STAMP_KEYS } from '@shared/identity'
const BOOKKEEPING_KEYS: readonly string[] = [...Object.values(KIND_ID_KEY), ...PAGE_STAMP_KEYS]
// :73
    detail: 'Pommora’s container files are removed and each page’s identity key, timestamps, and Context keys are dropped; every other key a page holds stays. This cannot be undone.',

// src/main/CRUD/page.ts:33
  const id = newId()
  const now = nowIso()
  const modeled: Record<string, unknown> = { [PAGE_ID_KEY]: id, created_at: now, modified_at: now }
// :60 — relocatePage
  await serializeOnFile(absFile, async () => {
    recordWrite(absFile)
    recordWrite(target)
    await rename(absFile, target)
    const existing = await readFile(target, 'utf8')
    const content = mergeFrontmatter(existing, { modified_at: nowIso() }, ['modified_at'], splitEnvelope(existing).body)
    await atomicWriteFile(target, content)
  })
// :91 — updatePageBody
    await writePageFile(absFile, { modified_at: nowIso() }, ['modified_at'], body)

// src/main/CRUD/governedWrite.ts:37
  const content = mergeFrontmatter(existing, { ...survivingChanges(reconciled), ...next, modified_at: nowIso() }, [...changed, ...govern, 'modified_at'], splitEnvelope(existing).body)

// src/main/CRUD/pageValue.ts:39
    nextValue === null ? { modified_at: nowIso() } : { [key]: nextValue, modified_at: nowIso() },
    [key, 'modified_at'],
// :67 — stripPageMember
  return mergeFrontmatter(content, { modified_at: nowIso() }, [key, 'modified_at'], splitEnvelope(content).body)

// src/main/CRUD/governedSweep.ts:46
export interface SweepOptions { stamp?: boolean; rewriteText?: RewriteText }
// :118
      if (opts.stamp) modeled.modified_at = nowIso()
      const merged = opts.stamp ? [...keys, 'modified_at'] : keys
// callers: contextCascade.ts `const STAMP_ON_CLEAR = { stamp: true }` · deleteProperty.ts `{ stamp: true }` · replaySchemaCascade.ts `{ stamp: true }`

// src/main/IO/pageFile.ts:84
  if (frontmatter === '' && modeledKeys.length === 0) return body
// :106 — the escape a body-only write takes today; every other key set throws
  if (modeledKeys.some((k) => k !== 'modified_at')) { throw new Error('This page’s frontmatter has a syntax error…') }
  return assembleEnvelope(frontmatter, body)

// src/main/CRUD/util.ts:46
/** The ISO-8601 timestamp written to governance fields (`created_at` / `modified_at`). */
export function nowIso(): string {
```

**Becomes**

```ts
// src/shared/identity.ts — PAGE_STAMP_KEYS deleted
export const PAGE_MODELED_KEYS = [PAGE_ID_KEY, 'icon', 'cover'] as const
// src/shared/schemas.ts
export const pageFrontmatter = z.looseObject({ [PAGE_ID_KEY]: z.string(), icon: z.string().optional(), cover: z.string().optional() })
// src/shared/properties.ts — the two names stay refused: a user property under either would collide with the vault's own history
const RESERVED_KEY_NAMES: ReadonlySet<string> = new Set([...Object.values(KIND_ID_KEY), ...PAGE_MODELED_KEYS, 'created_at', 'modified_at'])

// src/main/exclusionScan.ts — the import narrows to KIND_ID_KEY alone
const BOOKKEEPING_KEYS: readonly string[] = Object.values(KIND_ID_KEY)
    detail: 'Pommora’s container files are removed and each page’s identity key and Context keys are dropped; every other key a page holds stays. This cannot be undone.',

// src/main/CRUD/page.ts
  const id = newId()
  const modeled: Record<string, unknown> = { [PAGE_ID_KEY]: id }
// relocatePage — the rename is the whole write
  await serializeOnFile(absFile, async () => {
    recordWrite(absFile)
    recordWrite(target)
    await rename(absFile, target)
  })
// updatePageBody
    await writePageFile(absFile, {}, [], body)

// src/main/CRUD/governedWrite.ts
  const content = mergeFrontmatter(existing, { ...survivingChanges(reconciled), ...next }, [...changed, ...govern], splitEnvelope(existing).body)

// src/main/CRUD/pageValue.ts
    nextValue === null ? {} : { [key]: nextValue },
    [key],
// stripPageMember
  return mergeFrontmatter(content, {}, [key], splitEnvelope(content).body)

// src/main/CRUD/governedSweep.ts — `stamp` gone from SweepOptions; the write governs `keys` alone
      await atomicWriteFile(file, mergeFrontmatter(content, modeled, keys, splitEnvelope(content).body))
// contextCascade.ts — STAMP_ON_CLEAR deleted, its call site passes no options · deleteProperty.ts / replaySchemaCascade.ts — the `{ stamp: true }` argument gone

// src/main/IO/pageFile.ts — a key-less write never parses the frontmatter, and the escape clause the
// `modified_at` exemption stood for is now unconditional: any key set that reaches an unmergeable
// document throws.
  const { frontmatter } = splitEnvelope(existingContent)
  if (modeledKeys.length === 0) return frontmatter === '' ? body : assembleEnvelope(frontmatter, body)
  const doc = parseDocument(frontmatter)
  if (mergeable(doc)) { … }
  throw new Error('This page’s frontmatter has a syntax error, so Pommora left it untouched. Fix the frontmatter and try again.')
// The zero-key path is reached by TWO callers, not one. `updatePageBody` is the new arrival;
// `cascade.ts:49` already reaches it whenever a connection rename rewrites only the body
// (`keys.length === 0 && newBody !== body`), which today re-serializes the frontmatter it never
// touched. Both stop reformatting — the intended outcome; `cascade.test.ts` is the assertion to
// re-read. `restoreScrub.ts:77` and `governedSweep.ts:122` each guard on a non-empty key list and
// never reach it.

// src/main/CRUD/util.ts
/** The ISO-8601 instant nexus.json records at creation. */
export function nowIso(): string {
```

**Verify — automated**

- [ ] Inverted in the same commit: `page.test.ts` (`:59` key set is `[PageID]`; `:98`/`:154` become "leaves the frontmatter bytes untouched" — byte-equal before and after a rename and a move; `:136`); `governedWrite.test.ts`, `pageValue`/`mutate.test.ts`, `contextCascade.test.ts`, `replaySchemaCascade.test.ts`, `cascade.test.ts`, `pageFile.test.ts` — every `modified_at` assertion becomes its absence; `exclusionScan.test.ts`'s stamp-strip case becomes "a legacy `modified_at` key survives Clear as foreign frontmatter" and its copy assertion follows the new detail; `registryProperty.test.ts` keeps refusing `created_at` and `modified_at` as names (unchanged, re-run).
- [ ] New: `pageFile.test.ts` "a body-only write on a syntax-broken frontmatter passes it through byte-for-byte" (the old `some(k !== 'modified_at')` escape, now the zero-key path) and "a body-only write re-serializes nothing" (a flow-style list `[a, b]` survives unspaced).
- [ ] Degenerate: `createPage` with a body and no icon writes exactly `PageID` + the body (`PAGE_MODELED_KEYS` still governs `icon` and `cover`, and deleting an absent key is a no-op).
- [ ] `rg -c "modified_at" src/main --glob '!*.test.*'` → 0 outside the sidecar writers Task 6 owns (list them in the tick); `created_at` → 0; `PAGE_STAMP_KEYS` → 0; `stamp:` in `src/main/CRUD` → 0; `rg -F "timestamps" src/main/exclusionScan.ts` → 0. Controls: `nowIso` ≥ 1; `KIND_ID_KEY` in `exclusionScan.ts` ≥ 1.
- [ ] Docs: PagesPM :17, :19; PropertiesPM :114–121 (the example loses both lines; the paragraph states the two sources and that a schema edit rewriting a page moves its Modified time); ArchitecturePM :93 and §Data layer (the latter gains the sweep-moves-mtime sentence); ConfigurationPM wherever it quotes the Clear detail (`rg -F "timestamps" .claude/Features` → 0 after). Req 11.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] The Clear confirm dialog reads "identity key and Context keys."
- [ ] *(carried — Completion Criteria: a rename leaves Last Modified where it was; a body edit moves it)*

#### Task 6: No sidecar writer stamps

**Requirement:** 7

**Why:** The sidecar twin had no reader at all; each writer spread `modified_at: nowIso()` into a JSON object nothing consulted. Dropping the field from `baseSidecar` lets the schema enumerate the writers.

**Now** — `rg -n "modified_at" src/main/CRUD/{views,containerConfig,contextWrite,deleteProperty,removeProperty}.ts` → 8:

```ts
// src/shared/schemas.ts:31
export const baseSidecar = z.looseObject({ id: z.string(), icon: z.string().optional(), modified_at: z.string().optional() })
// src/main/CRUD/views.ts:40, :61, :79 — three distinct spreads, not one repeated
    await writeSidecar(folder, kind, { ...sidecar, views, modified_at: nowIso() })
    await writeSidecar(folder, kind, { ...sidecar, views: reordered, modified_at: nowIso() })
    await writeSidecar(folder, kind, { ...sidecar, views: next, modified_at: nowIso() })
// src/main/CRUD/containerConfig.ts:44
    await writeSidecar(folder, kind, { ...sidecar, ...definedOnly(patch), modified_at: nowIso() })
// src/main/CRUD/contextWrite.ts:210
    return { ...root, modified_at: nowIso() }
// :303
    const next: Raw = { ...cur, modified_at: nowIso() }
// src/main/CRUD/deleteProperty.ts:123–128
    const next: Record<string, unknown> = { ...sidecar, properties: assigned.filter((id) => id !== propertyId), modified_at: nowIso() }
// src/main/CRUD/removeProperty.ts:90
  const next: Record<string, unknown> = { ...cur, modified_at: nowIso() }
```

**Becomes**

```ts
// src/shared/schemas.ts
export const baseSidecar = z.looseObject({ id: z.string(), icon: z.string().optional() })
// each writer above spreads without the stamp:
    await writeSidecar(folder, kind, { ...sidecar, views })          // and `views: reordered`, `views: next`
    await writeSidecar(folder, kind, { ...sidecar, ...definedOnly(patch) })
    return root
    const next: Raw = { ...cur }
    const next: Record<string, unknown> = { ...sidecar, properties: assigned.filter((id) => id !== propertyId) }
  const next: Record<string, unknown> = { ...cur }
// `nowIso` imports drop wherever this leaves them unused.
```

**Verify — automated**

- [ ] Inverted: every sidecar test asserting `modified_at` (views, containerConfig, contextWrite, deleteProperty, removeProperty suites) asserts the key's absence; a write over a sidecar that still holds a legacy `modified_at` leaves it in place (loose object, foreign key).
- [ ] `rg -c "modified_at" src --glob '!*.test.*'` → 1 — `properties.ts`'s reserved-name set, the last standing mention in `src/`. Control: `writeSidecar` ≥ 6.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] *(none)*

#### Task 8: Adoption seeds the ULID from the file's age

**Requirement:** 9

**Why:** Creation Time is read from the ULID, so a page adopted today from a file written last year should carry last year in its id. The seed is the older of birthtime and mtime — on a filesystem that reports no birthtime, mtime is the honest floor. In-app creates keep the monotonic mint, since their instant is now.

**Now** — `rg -n "newId\(\)" src/main --glob '!*.test.*'` → count at execution:

```ts
// src/main/ids.ts:10
const nextUlid = monotonicFactory()
export function newId(): string { return nextUlid() }

// src/main/adopt.ts:56
async function stampPage(absFile: string, kind: ContentKind): Promise<boolean> {
  const content = await readFile(absFile, 'utf8')
  if (admitContentFile(readFrontmatterFields(content), kind).state !== 'missing') return false
  const key = KIND_ID_KEY[kind]
  const { body } = splitEnvelope(content)
  await atomicWriteFile(absFile, mergeFrontmatter(content, { [key]: newId() }, [key], body))
  return true
}
```

**Becomes**

```ts
// src/main/ids.ts
import { decodeTime, monotonicFactory, ulid } from 'ulidx'
/** A ULID whose time part is `atMs` — for an entity whose birth predates the mint. Not monotonic:
 *  the factory clamps a past seed to its last mint, which would erase the age. The seed is floored
 *  and clamped at zero because `stat` reports sub-millisecond floats on APFS (and a negative for a
 *  pre-epoch file) and the encoder throws on both — a throw here is swallowed per file by adopt's
 *  `.catch(() => false)`, so adoption would silently stamp nothing. */
export function idAt(atMs: number): string {
  return ulid(Math.max(0, Math.floor(atMs)))
}

// src/main/adopt.ts
async function stampPage(absFile: string, kind: ContentKind): Promise<boolean> {
  const content = await readFile(absFile, 'utf8')
  if (admitContentFile(readFrontmatterFields(content), kind).state !== 'missing') return false
  const key = KIND_ID_KEY[kind]
  const { body } = splitEnvelope(content)
  // A filesystem with no birthtime reports 0, and mtime is then the honest floor.
  const { birthtimeMs, mtimeMs } = await stat(absFile)
  const id = idAt(birthtimeMs > 0 ? Math.min(birthtimeMs, mtimeMs) : mtimeMs)
  await atomicWriteFile(absFile, mergeFrontmatter(content, { [key]: id }, [key], body))
  return true
}
```

**Verify — automated**

- [ ] Red first: `adopt.test.ts` "an adopted page's id decodes to the file's mtime when that is older than now" (`utimes` to a fixed past instant → `idTime(id)` equals it within the second) and `ids.test.ts` "`idAt` round-trips through `idTime`" — fail before.
- [ ] Both halves: the same adopt test with the seed replaced by `newId()` goes red (the id decodes to now).
- [ ] Degenerate: `birthtimeMs === 0` (unsupported) → the mtime seeds; `ids.test.ts` "`idAt` accepts a fractional seed and a negative one" (`1788295304609.0347` → decodes to `1788295304609`; `-5` → decodes to `0`) — both throw with the floor/clamp removed. The adopt test uses a real `stat`, never a hand-built integer, so the fractional path is exercised end to end.
- [ ] `rg -c "idAt\(" src/main --glob '!*.test.*'` → 2 (definition + adopt). Control: `newId\(\)` = baseline − 1.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] *(carried — Completion Criteria: an adopted page dated last year shows last year)*

#### Gate 3 — no writer, no key

- [x] typecheck 0 · Vitest 309 files / 3855 tests · Biome 997 files, no diagnostics — at `1c2dcae7`.
- [x] Every task's **Verify — automated** ticked against a result just watched.
- [x] Dead Vocabulary sweep, every line, controls non-zero — every dead token 0; bare `created_at`/`modified_at` only at `properties.ts:170-171`; `last_edited_time` 11, `nowIso` 0 (see Deviations).
- [x] `code-simplifier` over the Phase 3 diff alone, dual-briefed; findings fixed or ruled — the phase earns its own pass before the arc is judged whole. `92bf3e73`
- [x] Then over the whole arc's diff (`<pre-Phase-0 baseline>..HEAD`), in this order: `code-simplifier` (dual-briefed) → `comment-killer-agent` (single-handed) → `build-breaking-agent` (≤ 3 rounds). Every finding verified against the code, fixed or carrying a ruling; a fix re-runs the gates and lands as its own commit. `da7fce8c` `bf3a6e7b` · two attack rounds: `84b79d8c` `6ecd6d37` `581678af` `bf070dfc` `b443c5a5` `1c2dcae7`
- [x] Commits landed per task, explicit paths only.
- [x] **Declared Stop** — the closeout vault pass needs Nathan.

---

### Progress

Pre-Phase-0 baseline at `30e10845`: typecheck 0 · Vitest 308 files / 3820 tests · Biome 988 files, 0 warnings. Controls: `KNOB` → 144; `(Nathan` → 0 in `src/` (no control there — `KNOB` alone carries Task 0's check). Task 0 targets: 47 files, 10 052 non-comment lines (per-file table in the closeout report's baseline column).

- [x] **Phase 0** — Task 0 · `9966332c`
- [x] **Phase 1** — Tasks 1–2 · Gate 1 · `5770a1d9` `ba0ea590` `ca7958d5`
- [x] **Phase 2** — Tasks 3–4 · Gate 2 · `7b1a42ab` `c465820f` `9b4ad05c`
- [x] **Phase 3** — Tasks 5, 6, 8 · Gate 3 · `4722f3a7` `1132360d` `81caae42` · `92bf3e73` `7c7d3c81` `da7fce8c` `bf3a6e7b` `84b79d8c` `6ecd6d37` `581678af` `bf070dfc` `b443c5a5` `1c2dcae7`
- [x] **Closeout** — rulings `750dcad5` `a5be9a13` `7eaf39bf` · vault pass 09-01-2026 · docs · History PM-123

### Rulings

- **Carrier** (Nathan, 09-01-2026): the typed record, not a tuple.
- **Rename/move leave Modified alone** (Nathan, 09-01-2026): "the preferred outcome."
- **Body-save push** (Nathan, 09-01-2026): fold it in — one shared writer path.
- **Group by stamp** (Nathan, 09-01-2026): not built; nothing existing rides.
- **Both columns first-class** (Nathan, 09-01-2026): Creation Time and Last Modified sort, filter, reveal, render.
- **Labels** (Nathan, 09-01-2026): "Creation Time" / "Last Modified".
- **`{ id: pageId }` fallback** (Nathan, 09-01-2026): fixed alongside.
- **Clear Metadata** (Nathan, 09-01-2026): reduces to ids + Context keys.
- **Clear rides Task 5** (simplifier, 09-01-2026): `exclusionScan.ts` is `PAGE_STAMP_KEYS`' one consumer outside `identity.ts`, so a separate task would land a commit that doesn't typecheck. Task 8 keeps its number — Forced By, Rulings, and Sequenced After all cite it.
- **`_id` sort** (executor, 09-01-2026): deleted with its constant — its one consumer was the sort case Creation Time supersedes; a saved view naming `_id` resolves to no criterion, which is the same treatment any stale id gets.
- **Task 0 by subagent** (Nathan, 09-01-2026): comments first, single-handed, so old prose never reads as instruction.
- **Vault pass** (Nathan, 09-01-2026): one-time, manual, whole vault including excluded folders, when the plan is done.
- **`idTime` is total, `isUlidShaped` stays loose** (attack review, 09-01-2026): a hand-edited PageID reads as "no instant" and blanks one cell; tightening the shape check to ulidx's `^[0-7]` would flip the file to Unknown and hide it — strictly worse.
- **`createPage` notes its write** (attack review, 09-01-2026): rides Task 2 as the same one-line shape; the alternative — a membership-change refetch in the renderer — is a second mechanism for what `noteValueWrite` already does.
- **The closeout script restores timestamps** (attack review, 09-01-2026): non-negotiable once mtime is the fact; a pass that stamped 88 pages with the closeout date would falsify the column the arc builds.
- **Rewrites the user did not make keep the file's time** (Nathan, 09-01-2026, replacing the earlier position that a schema rewrite is a modification): `rewritePreservingTimes` (`atomicWrite.ts`) is the one writer for a sweep, a migration, and adoption — stat, write, `utimes`, and drop the walk cache's entry so a same-size rewrite is never served stale. `rewritePageSerialized` and both page writes in `sweepGovernedRoots` take it; `adopt.ts` folds its own stat/`utimes` pair into it. A user's own write — `setGovernedRootKeys`, `writePageFile`, the body save — still takes now.
- **A push refreshes only the pages it names** (Nathan, 09-01-2026): `loadValues` takes an optional page-id list resolved through the live tree; `useValuesEpoch` merges a named refetch into the values it holds and re-reads the container whole only when a batch degraded to naming none. The rename epoch stays whole.
- **`view:loadValues` is an envelope** (executor, 09-01-2026): `raw` with no `.catch` would blank a container on a throw; `fetchValues` unwraps it and a failed read keeps the values already held.
- **`setGovernedRootKeys` skips a byte-identical write** (executor, 09-01-2026; unruled — Nathan did not answer Decision 2): one compare before the write, so a no-op edit neither rewrites the inode nor moves Last Modified. Vetoable.
- **Re-mint the adopted ids from their dates** (Nathan, 09-01-2026, "just manually change them in the db after the sweep"): the information-loss check found 40 pages whose PageID encoded the adoption instant while `created_at` held the real date; after the strip, each took a fresh ULID seeded at that date, and the old id was substituted in its page, the sidecar orderings, `navigation.json`, and every `nexus.db` row, the db vacuumed after.

### Review Pass — 09-01-2026

- `code-simplifier` over the plan: fifteen edits folded (Task 7 → Task 5 on the `PAGE_STAMP_KEYS` import; the cellMenu arm split; `computeFieldValue` inlined; `STAMP_TYPE` typed `Partial`; five count corrections; the `index.ts` handler annotation; `resolveView.test.ts` added). Not acted on, with reasons in the Rulings: `created_time` stays a distinct type (the cellMenu `clearable` difference is behavioral); stamps stay off `PageFrontmatter` (a loose object can't distinguish a virtual field from a foreign key); `idAt`/`idTime` both stay (the one ulidx seam).
- `build-breaking-agent`, one round: six findings, none blocking, all verified against the code and folded — the closeout rewrite moving every mtime (Closeout 2–3); `ulid()` throwing on APFS's fractional `mtimeMs` (Task 8 `idAt`); `createPage` never noting a write (Task 2); `decodeTime` throwing on a shape-valid id and rejecting the whole batch (Task 1 `idTime`); no gate catching a missed `created_time` arm (Task 3 control raised, the site list made the check); the closeout script's missing skip rule and `serializeJson` newline (Closeout 3–4). One unknown carried to Task 4's user verify (a stamp cell opening an editor). Seventeen candidate attacks killed by execution or trace, among them the `cachedParse` staleness hypothesis, same-ms (mtime, size) collisions, the override double-flip, stamp ids leaking into `hidden_properties`, and adopted-id collisions.

### Gate 3 Attack — 09-01-2026

- Round 1, whole arc: three findings. UTC `Z` stamps against a local-day filter and cell (High, `84b79d8c`); a `null` icon or cover failing the batch schema and blanking every cell of that row (Medium, `6ecd6d37`); the body-only passthrough emitting LF fences over CRLF frontmatter (Low, `581678af`). One High held for Nathan — the rename cascades (`registryProperty.ts`, `contextCascade.ts`, `cascade.ts`) rewrote every holder through `atomicWriteFile`, so a property, Space, or page-title rename moved Last Modified on pages whose content did not change; ruled and fixed after the Declared Stop (Rulings, `rewritePreservingTimes`). Thirteen attacks killed.
- Round 2, the three fixes: two pre-existing findings inside the fixes' claimed scope. A bare-day `Before`/`After` operand parsed to midnight, so any timed value later that day fell outside `Before` and inside the next day's `After` (Medium, every timed date property, `bf070dfc`); the CRLF fold reached one of three envelope assemblers (Low, moved into `assembleEnvelope`, `b443c5a5`). `setGovernedRootKeys` writing without a compare was fixed after the Declared Stop (Rulings). Eleven attacks killed; a third round was not spent — round 2 found nothing the arc introduced.

### Open Against Later Tasks

### Deviations

- The `nowIso` control reads 0: the Phase 3 simplification pass (`92bf3e73`) inlined its one caller to `new Date().toISOString()` at `identity.ts:31`, which still mints nexus.json's `createdAt`. `last_edited_time` reads 11 against a ≥ 12 floor: the `STAMP_TYPE` map replaced three per-site mentions with one.
- Two Gate 3 commits (`b69dc164`, `6ecd6d37`) carry a parallel session's staged files — the commit hook's ledger amend picks up whatever the index holds. Left in history; the peer's work is intact.
- The census read 133 pages / 37 sidecars against the predicted 49 / 88 / 29: the grounding grep counted one key per file and missed folders the exclusion list names; the plan's own sequence held (skip list 0, bodies byte-equal, mtimes held to the millisecond). The information-loss check read 40 against a predicted 0 — adoption before Task 8 minted the id at the adoption instant, and `created_at` still held the real date; ruled and re-minted (Rulings). The backup's mtimes are second-precision (macOS's bundled rsync), so the invariant compared at `stat -f %m`. Decisions 3 and 4 landed as one commit — they share the same bridge, handler, and hook hunks.

### Lessons

### Sequenced After

- `mergeFrontmatter` emits `---\n{}\n---` when Clear empties a page's map (a page holding only its id and Context keys); pre-existing, unchanged by this arc — drop the fence when the map empties.
- The content index's `values` rows still record legacy stamp keys until each file's (mtime, size) moves; harmless, self-healing.

### Closeout

**Coordination point — the vault pass** (Nathan present; nothing touched before the per-item go):

1. App closed (`ps` shows no Electron on NexusOS). Census run and shown: every `.md` under `~/NexusOS` (excluded folders included) holding `created_at:` or `modified_at:` at the frontmatter root, and every `.json` sidecar holding `modified_at` — predicted 49 / 88 / 29 from grounding; the actual list is presented file by file. Alongside it, the information-loss check: every page holding both `PageID` and `created_at` where `idTime(PageID)` and `created_at` disagree by more than a second — those are the pages whose Creation Time changes when the key goes, and the list is presented before any write (predicted 0: Pommora's `createPage` minted both from one instant, and adoption never wrote `created_at`).
2. Backup: a dated copy of every file the census names, relative paths **and timestamps** preserved (`cp -Rp`, never `cp -R` — the bare form stamps every copy with now, and the true mtimes would be unrecoverable), at `~/NexusOS-stamp-backup-MM-DD-YYYY/` — the vault's tree is dirty, so no stash and no commit of Nathan's in-flight work.
3. The transform, a throwaway script in the scratchpad (never app code). **It restores each file's timestamps after writing:** the arc makes mtime the Last Modified fact, and a rewrite through temp + rename replaces the inode and stamps it with now — so without `stat` before and `utimes(file, atime, mtime)` after, the closing act sets Last Modified on all 88 pages to the closeout date and erases the birthtime Task 8 seeds from (a stamped file with no `PageID` yet would then adopt as born today). Pages: `yaml`'s `parseDocument` → skip and **list** any document with `errors.length > 0` or a non-map root (an alias-bearing `*important`, a duplicate key, a tab-indented block — the shapes this vault has produced before), else `doc.delete('created_at')`, `doc.delete('modified_at')`, `toString()` inside a try that skips and lists on throw; a map that empties drops the fence entirely rather than emitting `---\n{}\n---`; the envelope reassembled with the body byte-identical (the same document edit `mergeFrontmatter` performs, so comments and foreign keys survive). Sidecars: parse → delete → `serializeJson` (`stableStringify(value) + '\n'`, `atomicWrite.ts:31` — the exact bytes the app writes, so no one-byte diff on the trailing newline). Dry run first: three sample diffs and the skip list shown before any write. Restartable and idempotent: each file is stat'd, transformed, and restored on its own; a second run reports 0 changes.
4. Invariants after: `rg -e "^created_at:|^modified_at:" ~/NexusOS --glob '*.md'` → the skip list's count exactly, each named; `rg -F '"modified_at"' ~/NexusOS --glob '*.json'` → 0; control `rg -c "^PageID:" ~/NexusOS` unchanged from the census; every touched page's body byte-equal to its backup's body; `stat -f %m` on every touched file equal to its backup's. The skip list is presented to Nathan for hand-editing in Obsidian; the pass does not touch what it cannot parse.
5. Disclosed consequence: a page's Creation Time is now its PageID's instant — for a page Pommora created, the same instant `created_at` held; for a page adopted before Task 8, its adoption date. Last Modified is unchanged by the pass.

**Then:** History entry (arc "Stamp Retirement"); Context doc's Recent Work; Handoff; a Development-Environment line if the executor hit a trap worth keeping; the Delivery Claim below checked by a neutral verifier against Requirements 1–12; and the target-file report — every file Task 0 names, non-comment non-test line count at the pre-Phase-0 baseline commit → at finish, per file and in total, with the files the arc deleted or created listed apart.

## Completion Criteria

**The bar.** A future review of this arc finds nothing to correct; no concerns carried; a second stamp source anywhere means the plan is wrong or the executor is.

**The deliverable**

- [x] Every numbered requirement traces to a landed task (neutral verifier).
- [ ] The Acceptance criterion observed running, clause by clause, in a scratch nexus over CDP.
- [x] Dead Vocabulary at zero, controls non-zero.
- [x] Every Made False row landed in its task's commit.

**The passes**

- [x] Each phase's own simplification pass, then the whole range: simplification → comment pass → attack review; every finding fixed or carrying a defensible ruling.

**Nathan's own pass**

- [ ] The two labels.
- [ ] The Hidden frame on a real NexusOS Collection: reveal both, sort by each, filter by each.
- [x] The vault pass's per-item go, and the backup's location (`~/NexusOS-stamp-backup-09-01-2026/`).
