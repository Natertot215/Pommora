## Stamp Retirement — Implementation Plan

> **Status:** written, pending review (09-01-2026) · Spec: the 09-01-2026 session's confirmed direction (recorded under Rulings) · Execute tasks in order.
> Citations name files and symbols at HEAD `53b5d903`; re-derive before editing.

**Goal**

A page's frontmatter carries no `created_at` and no `modified_at`, and no sidecar carries a `modified_at` twin. "Last Modified" is the file's own mtime; "Creation Time" is the moment encoded in the page's `PageID` ULID. Both reach every view as columns that can be revealed, sorted, filtered, and rendered, from one carrier — the value batch a container loads — instead of a frontmatter key one arm of the pipeline reads and another arm falls back around. Every writer that existed only to keep a stamp current is gone, and with it the "does this count as an edit?" question each of them answered differently.

The shape: `loadValues` returns a typed record per page (`{ frontmatter, createdAt, modifiedAt }`) built from the stat the walk cache already takes and the id the read engine already assigns; `ViewRow` carries the two stamps beside its frontmatter; the renderer's stamp branches read the row, and the `created_time` type joins `last_edited_time` in every switch that dispatches on a declared type, so the two stamps are one shape with two sources. Alternatives weighed: keeping `modified_at` as a key the app maintains (rejected — the file system already holds the fact, and the key is the one thing in a page an external editor can never keep true); minting a new `created:` frontmatter key from the ULID (rejected — Nathan: no new frontmatter key of any kind); an untyped map `Record<pageId, [fm, ms, ms]>` (rejected for the typed record — Nathan: "typed"); the database as the modified authority (rejected — nexus.db is a cache and a per-machine store, never the truth). Settled by Nathan on 09-01-2026.

Bounded by: no new frontmatter key; a rename or move no longer changes Modified (`fs.rename` leaves mtime alone — Nathan: "the preferred outcome"); grouping by either stamp is not built; PageID and path identity stay as they are; the content index is untouched; the vault normalization is a throwaway script at closeout, never app code.

**Requirements**

1. Task 0 first strips every target file's comments to why-only, by a single-handed subagent, so no file asserts a stamp truth while the change lands.
2. The batch a container loads is `Record<pageId, PageValues>` with `PageValues = { frontmatter, createdAt, modifiedAt }`; `ViewRow` carries `createdAt?`/`modifiedAt?`; every consumer of the batch reads `.frontmatter` where it read the map's value.
3. A body save refetches an open view: `page:updateBody` notes the value write and pushes, the same shared writer path every other frontmatter writer already takes.
4. `created_time` is a PropertyType beside `last_edited_time`; `_created_at` resolves to it; both stamps resolve from the row through the generic date branches of sort, filter, styles, menus, and widths; the modified∥created fallback, the `_id` sort, and the `lastEditedTime` value kind are deleted.
5. Both stamp columns are revealable from the Hidden frame on any view, labeled "Creation Time" / "Last Modified" from one source, glyphed from the type registry, and offered as sort and filter targets.
6. No page writer sets or governs `created_at`/`modified_at`; `createPage` writes id (+icon); a relocate is a rename only; a body save governs no key and passes the frontmatter bytes through; `governedWrite`, `pageValue`, and `governedSweep` govern only the caller's keys; the sweep's `stamp` option is gone; `pageFrontmatter` and `PAGE_MODELED_KEYS` drop the stamps while `RESERVED_KEY_NAMES` keeps refusing both names.
7. No sidecar writer sets `modified_at`; `baseSidecar` drops it.
8. Clear Exclusion strips the kind id keys and `<Context>` keys only; its copy says so.
9. Adoption mints a page's ULID seeded from the file's `min(birthtime, mtime)`, so an adopted page's Creation Time is the file's age rather than the adoption moment; in-app creates keep the monotonic mint.
10. The `patchBandValue` / `patchSeedValues` fallback base is `{ PageID: id }`, never `{ id }`.
11. Every document the change falsifies is rewritten in the commit that falsifies it, carried by the Made False table.
12. Closeout normalizes NexusOS once — every `.md` and sidecar under the vault, excluded folders included — with the app closed, after a backup, on Nathan's per-item go.

**Acceptance — the whole thing working:** In a scratch nexus with a Collection holding three pages created one second apart, its Table view open: the Hidden frame lists Creation Time and Last Modified; revealing both shows Creation Time in the pages' creation order and Last Modified equal to each file's mtime as `stat` reports it; sorting by Last Modified descending puts the page whose body was just edited first, and that reorder happens without reopening the view; renaming a page moves neither column; a filter "Last Modified is after <yesterday>" keeps all three; `rg -e "created_at|modified_at" <nexus>` → 0 after every one of those actions; and a page adopted from a file dated last year shows last year under Creation Time.

**Forced By**

- `cachedParse` (`walkCache.ts:38`) stats before every parse and discards the stat → the record carries `mtimeMs` from that stat, and a failed stat (which today falls through to an uncached parse) yields `mtimeMs: null` (Task 1).
- `resolveFieldValue`'s memo is keyed by the frontmatter object (`value.ts:93`), and the optimistic override replaces that object → a stamp read through the memo would go stale on every patch, so both stamps bypass it, as `_title` already does (Task 3).
- `OverrideEntry.fm` is a frontmatter (`useValuesEpoch.ts:6`) and the epoch's merge replaces a page's batch entry wholesale (`useViewHost.ts:169–178`) → the merge preserves the page's stamps around a patched frontmatter (Task 1).
- `monotonicFactory` clamps a seed at or below the last mint up to the last mint → the seeded adoption mint uses plain `ulid(seed)`, never the monotonic factory (Task 8).
- `adoptedId` pages have no ULID → `createdAt` is null for them and Creation Time renders blank, which is honest: the file has no identity yet (Task 1).
- `fs.rename` does not change mtime → renames and moves stop bumping Modified; Nathan accepted this (Task 5).
- `mergeFrontmatter` re-emits the YAML document on every governed write → a body save that governs no key passes the frontmatter bytes through untouched instead of re-serializing them (Task 5).
- `page:updateBody` calls neither `noteValueWrite` nor `pushValueChanges` (`index.ts:1097–1110`) → once Modified is the mtime, a body save must note and push or the open view's column lags until the next unrelated write (Task 2).
- `hidden_properties` is minted as the schema ids (`views.ts:337–338`) and `hiddenListIds` lists `_modified_at` only when already hidden → today no UI path reveals Modified on a new view; the hidden list must offer both stamps whenever they aren't shown (Task 4).
- The NexusOS working tree is dirty (543 entries at grounding) → the closeout backup is a dated copy of the touched files, not a stash (Closeout).

**Inherited Reasoning:** Nathan raised and settled: Clear Metadata reduces to ids + Contexts (09-01-2026); the typed carrier over a tuple; group-by-stamp not built ("if it already exists, just make sure it rides the change" — it doesn't: `GROUPABLE_PANE` admits schema definitions only, so nothing rides); rename/move not bumping Modified; the body-save push as "a shared writer across different purposes"; the `{ id: pageId }` fallback fixed alongside; the one-time vault normalization at closeout. The sibling plan's Sequenced After row "A `Last Edited Time` column can lag on an in-app body edit" is Task 2 here.

**Grounding** *(re-open these; don't cite them)*

- `src/shared/identity.ts:20–23` · `schemas.ts:32–36, 61–68` · `properties.ts:8–19, 136–157` · `propertyValue.ts:14, 58–60, 126–128` · `types.ts:594–616` · `bridge.ts:146` · `cellMenu.ts:92` · `columnStyles.ts:74` · `columnMenu.ts:90`.
- `src/main/walkCache.ts:38–62` · `readNexus.ts:321, 372–398` · `CRUD/loadValues.ts` · `CRUD/page.ts` · `CRUD/governedWrite.ts` · `CRUD/pageValue.ts:36–75` · `CRUD/governedSweep.ts:61–66, 140–148` · `CRUD/contextCascade.ts:82` · `CRUD/deleteProperty.ts:91–94, 125–130` · `CRUD/replaySchemaCascade.ts:65` · `CRUD/removeProperty.ts:96` · `CRUD/views.ts:40, 61, 79` · `CRUD/containerConfig.ts:44` · `CRUD/contextWrite.ts:210, 303` · `CRUD/util.ts:60–62` · `IO/pageFile.ts:78–112` · `index.ts:472–490, 1097–1110` · `adopt.ts:68–75` · `ids.ts` · `exclusionScan.ts:22, 61–75`.
- `src/renderer/Properties/value.ts:26–125` · `Properties/PropertyTypes.tsx:1–75` · `Properties/Assignment/columnLabel.ts` · `Views/Pipeline/{columns,sort,filter,group}.ts` · `Views/{useViewHost,useValuesEpoch,useViewCreation,contextCellWrite}.ts` · `Views/TableView/TableView.tsx:441–451, 1161–1169` · `Frames/{GroupFrame,SortFrame,HiddenFrame}.tsx` · `Frames/{filterModel,hiddenFrameModel}.ts` · `Tables/columnWidths.ts:18–75`.
- `node_modules/ulidx/dist/ulid.d.ts` — `decodeTime(id)`, `ulid(seedTime?)`, `monotonicFactory()`.
- `.claude/Guidelines/Development-Environment.md` — gates, pipefail, lint-warnings-in-text, no whole-tree git ops, main/preload don't HMR.
- NexusOS census at grounding: 49 `.md` with `created_at:`, 88 with `modified_at:`, 29 `.json` sidecars with `modified_at`, 292 `.md` in all; excluded folders Agenda, TaskNotes, Atlas, slates, file-assets.

**Environment:** Plan directory `.claude/Planning`. Spec: this session's confirmed direction. Explorer: `Explore`. Code reviewer: `feature-dev:code-reviewer`. Attack reviewer: `build-breaking-agent`. Simplification: `code-simplifier`, dual-briefed to also report non-simplicity bugs. Comments: `comment-killer-agent`, briefed "no sub-agents, no worktree." Neutral verifier: general-purpose. Gates from `Pommora/`: `npm run typecheck && npm run test && npm run lint`.

**Shapes:** removal (the stamp keys, their writers, the fallback, the `_id` sort, the `lastEditedTime` kind) · additive (the carrier, `created_time`, the body-save push, the seeded mint) · fix (the `{ id }` fallback) · user-visible (two revealable columns, a label change) · migration (the closeout vault pass) · live data (the closeout pass runs over Nathan's vault).

**Global Constraints (every task inherits these):**

- Gates from `Pommora/`: `npm run typecheck && npm run test && npm run lint`, `set -o pipefail` on any pipeline, and `Found 0 warnings` read from lint's text.
- Biome formats on write via the PostToolUse hook; an Edit failing on whitespace means re-read and retry. Shell-driven edits run `npm run format` after.
- One tree-touching writer at a time. A parallel session is executing the Comment Reduction plan on this tree: never `git stash`, `checkout .`, `clean`, or `reset`; stage explicit paths only; attribute a surprise failure to its dirty set before your own; commit each task as soon as its gate is green.
- `src/main` and `src/preload` don't hot-reload: after any main-side task the dev process restarts before anything is verified live. Tasks 1, 2, 5, 6, 7, 8 touch main.
- `src/shared` imports no fs, no React, and nothing from `src/main`. Main owns the filesystem.
- Comments: at most one load-bearing why per change; never restate a value; never narrate. The plan's fences carry only path markers and contract edges.
- Commit granularity: one commit per task, message on the task heading, ticks in the same commit. No line-count reporting (Nathan, 09-01-2026).
- Out of scope everywhere: Sapphire; `.claude/Mobile`; PageID or path-identity retirement; the content index; grouping by a stamp; any new frontmatter key.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| [[PropertiesPM]] Type Catalog :37 · Identity :42 · §Page keys :114–121 | "Last Edited Time — derived from `modified_at`" · `_id` in the reserved-id list · "Every Page carries … `created_at`, and `modified_at`" · "sorting and filtering fall back to `created_at`" · the frontmatter example's two stamp lines | two stamp types from mtime and the ULID; `_id` gone; no stamp keys | 3, 5 |
| [[ViewTypesPM]] :85 | "Sort By (None, Title, Modified, and the sortable properties)" | Creation Time and Last Modified both sort | 4 |
| [[PagesPM]] :17, :19 | "five keys Pommora governs … `created_at`, `modified_at`" · "`modified_at` is stamped on a property value change, a text change, a move, and a rename" | three governed keys; Modified is the mtime, so a value write or body save moves it, a rename or move does not, and a schema sweep that rewrites a page does | 5 |
| [[ArchitecturePM]] :93 · :116 | "each page's identity key, `created_at` and `modified_at` stamps, and `<Context>` keys" · the reserved-name list (still true — the names stay refused) | Clear strips ids and Context keys only | 7 |
| [[ArchitecturePM]] §Data layer | (no statement of the sweep's effect on Modified) | a governed sweep that rewrites a page moves its Modified time, because Modified is the file's mtime | 5 |

**Dead Vocabulary**

- `created_at` · `modified_at` → expect 0 in `src/` outside `properties.ts`'s reserved-name set (2 legitimate hits) and `RESERVED_PROPERTY_ID` (`_created_at`, `_modified_at` are ids, not keys). `PAGE_STAMP_KEYS` → 0. `modifiedStampString` → 0. `lastEditedTime` → 0. `MODIFIED_TARGET` → 0. `stamp:` in `src/main/CRUD` → 0. `'modified'` as a ColumnKind → 0. `RESERVED_PROPERTY_ID.id` → 0.
- Control: `last_edited_time` → ≥ 17 in `src/` outside tests (it survives as a type); `nowIso` → ≥ 1 (`main/identity.ts` nexus.json `createdAt`). Zero on a control means the sweep never ran.

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

**Now** — `rg -n "Record<string, PageFrontmatter>" src --glob '!*.test.*'` → 11 (`bridge.ts:146`, `loadValues.ts:19`, `useViewHost.ts:68`, `useValuesEpoch.ts:56`, `useViewCreation.ts:37,39`, `group.ts:91,110`, `GroupFrame.tsx:785`, `TableView.tsx` ×1, `preload/index.ts:86`); `rg -n "\{ id: pageId \}" src` → 2 (`TableView.tsx:1165`, `useViewCreation.ts:94`):

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
    retainContextKeys(node, fm)
    return { node, fm }

// src/main/CRUD/loadValues.ts:16
export async function loadValues(rootPath: string, containerRelPath: string): Promise<Record<string, PageFrontmatter>> {
    const parsed = pageFrontmatter.safeParse({ ...rec.fm, [PAGE_ID_KEY]: rec.node.id })
    if (parsed.success) out[rec.node.id] = parsed.data

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

// src/renderer/Views/useViewHost.ts:169
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
export async function cachedParse<T>(absPath: string, parse: (stat: FileStat | null) => Promise<T>): Promise<T>
// readNexus.ts:321 (the JSON caller) ignores the argument: `cachedParse(abs, () => …)` still typechecks.

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

// src/main/ids.ts
/** The instant a ULID encodes; null for an adopted (path-derived) id, which encodes none. */
export function idTime(id: string): number | null {
  return isAdoptedId(id) ? null : decodeTime(id)
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
- [ ] `group.test.ts` (or the pipeline test that covers `toRow`): a values entry with stamps → the row carries them; an absent entry → neither key present.
- [ ] Fix test (Req 10): `patchBandValue` on a page absent from the batch produces a frontmatter keyed `PageID`, not `id` — red before, green after.
- [ ] `rg -n "Record<string, PageFrontmatter>" src --glob '!*.test.*'` → 0 outside `useValuesEpoch.ts`'s `OverrideEntry` line; `rg -n "\{ id: pageId \}" src` → 0. Control: `rg -c "PageValues" src` ≥ 8.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] *(carried — Completion Criteria: the batch shape is invisible until Task 4 reveals the columns)*

#### Task 2: A body save notes and pushes its value write

**Requirement:** 3

**Why:** Modified is now the mtime, and a body save moves it. Every other frontmatter writer already hands its file to `noteValueWrite` and lets `confirmWrite` push; the body handler is the one writer that doesn't, so an open view showing Last Modified would sit stale after a text edit. One shared push path, no second mechanism.

**Now** — `rg -n "noteValueWrite\(" src/main --glob '!*.test.*'` → 5:

```ts
// src/main/index.ts:1097
    'page:updateBody': {
      kind: 'envelope',
      fn: async (relPath: unknown, body: unknown) => {
        ...
        const r = await updatePageBody(resolved.value, body)
        if (r.ok) await indexWrittenPage(root, resolved.value)
        return r.ok ? ok(null) : r
      },
    },
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
```

**Verify — automated**

- [ ] Red first: the `index.ts` handler test (or `valuesChanged.test.ts`'s handler-level case) asserts a body save yields one `values:changed` push naming the page's container and id — fails before the change.
- [ ] `rg -n "noteValueWrite\(" src/main --glob '!*.test.*'` → 6. Control: `pushValueChanges` ≥ 2.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] *(carried — Completion Criteria: an open table sorted by Last Modified reorders after a body edit in the page window)*

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

**Now** — `rg -c "last_edited_time" src --glob '!*.test.*'` → 17 across 12 files; `modifiedStampString` → 5; `lastEditedTime` → 4; `RESERVED_PROPERTY_ID.id\b` → 1:

```ts
// src/shared/properties.ts:8
export const propertyType = z.enum(['number', 'checkbox', 'datetime', 'select', 'multi_select', 'status', 'url', 'context', 'last_edited_time', 'file'])
// :136
export const RESERVED_PROPERTY_ID = { id: '_id', title: '_title', createdAt: '_created_at', modifiedAt: '_modified_at', location: '_location' } as const

// src/shared/propertyValue.ts:14
  | { kind: 'lastEditedTime' } // virtual — never persisted (encode throws)
// :58
    case 'datetime':
    case 'last_edited_time':
      return typeof raw === 'string' ? { kind: 'datetime', value: raw } : NULL
// :126
    case 'lastEditedTime':
      throw new Error('PropertyValue.lastEditedTime is virtual and must not be persisted; …')

// src/renderer/Properties/value.ts:30
export function declaredType(propertyId, schema, contextIds = []): PropertyType | 'title' | undefined {
  switch (propertyId) {
    case RESERVED_PROPERTY_ID.title: return 'title'
    case RESERVED_PROPERTY_ID.modifiedAt: return 'last_edited_time'
    default: …
// :60
  if (propertyId === RESERVED_PROPERTY_ID.title) return { kind: 'select', value: row.title }
// :100
  if (propertyId === RESERVED_PROPERTY_ID.modifiedAt) {
    return typeof fm.modified_at === 'string' && fm.modified_at ? { kind: 'datetime', value: fm.modified_at } : { kind: 'null' }
  }
// :118
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

// src/shared/cellMenu.ts:92 · src/shared/columnStyles.ts:74 · src/shared/columnMenu.ts:90 · src/renderer/Frames/filterModel.ts:182 · src/renderer/Tables/columnWidths.ts:27–28
    case 'last_edited_time':          // each a date-shaped arm; columnWidths keys `created` by id instead
  last_edited_time: { min: 90, default: 120, max: 250 },
  created: { min: 90, default: 120, max: 250 },
// columnWidths.ts:51, :67
  if (columnId === RESERVED_PROPERTY_ID.createdAt) return WIDTHS.created
  if (columnId === RESERVED_PROPERTY_ID.createdAt) return base
```

**Becomes**

```ts
// src/shared/properties.ts
export const propertyType = z.enum(['number', 'checkbox', 'datetime', 'select', 'multi_select', 'status', 'url', 'context', 'created_time', 'last_edited_time', 'file'])
export const RESERVED_PROPERTY_ID = { title: '_title', createdAt: '_created_at', modifiedAt: '_modified_at', location: '_location' } as const
/** The type each stamp column declares — the one place an id becomes a stamp type. */
export const STAMP_TYPE: Readonly<Record<string, PropertyType>> = {
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
  … (the context rider and the memo, unchanged)
}
function computeFieldValue(fm, propertyId, def): PropertyValue {
  if (!def) return { kind: 'null' }
  return decodeValue(def, (fm as Record<string, unknown>)[def.name])
}
// modifiedStampString: deleted.

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

// src/shared/cellMenu.ts · columnStyles.ts · columnMenu.ts · src/renderer/Frames/filterModel.ts — `case 'created_time':` joins each `last_edited_time` arm.
// src/renderer/Tables/columnWidths.ts — WIDTHS keyed by type only; both `createdAt` special cases deleted:
  created_time: { min: 90, default: 120, max: 250 },
  last_edited_time: { min: 90, default: 120, max: 250 },
```

**Assumed by:** Task 4 (`STAMP_TYPE`, `declaredType` resolving both stamps).

**Verify — automated**

- [ ] Red first: `sort.test.ts` "sorts `_created_at` by the row's createdAt" and "sorts `_modified_at` by the row's modifiedAt, absent last ascending"; `filter.test.ts` the same pair through `evaluateDate`; `value.test.ts` "`_created_at` resolves from the row, not the frontmatter" — all fail before.
- [ ] Inverted in the same commit: every sort/filter test asserting the created fallback; `propertyValue.test.ts`'s encode-throws case (deleted); `columnWidths.test.ts`'s `created` key.
- [ ] Crossing: one test resolves the same row through `resolveFieldValue('_modified_at')`, `buildCriterion`, and the filter — three readers, one value.
- [ ] `rg -c "modifiedStampString" src` → 0; `lastEditedTime` → 0; `RESERVED_PROPERTY_ID.id\b` → 0; `WIDTHS.created\b` → 0. Control: `rg -c "created_time" src --glob '!*.test.*'` ≥ 9.
- [ ] Doc: PropertiesPM :37 (two rows: Creation Time from the ULID, Last Modified from the mtime; neither persisted), :42 (`_id` removed from the reserved list). Req 11.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] *(carried — Completion Criteria)*

#### Task 4: Both stamp columns reveal, label, glyph, and target from one source

**Requirement:** 5

**Why:** A stamp the pipeline can sort is useless if no surface offers it. Today a new view's hidden list never lists Modified and the column resolver refuses `_created_at`; the header label, the pane label, and the type label are three literals. After this, revealing either stamp is a Hidden-frame toggle, and "Creation Time" / "Last Modified" is written once.

**Now** — `rg -n "MODIFIED_TARGET" src` → 5; `rg -n "'modified'" src --glob '!*.test.*'` → 2:

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

// src/renderer/Frames/hiddenFrameModel.ts:39
    ...(set.has(RESERVED_PROPERTY_ID.modifiedAt) ? [RESERVED_PROPERTY_ID.modifiedAt] : []),

// src/renderer/Frames/HiddenFrame.tsx:21
  if (id === RESERVED_PROPERTY_ID.title) return <PropertyTypeIcon type="title" size={s.ICON.doc} />
  if (id === RESERVED_PROPERTY_ID.modifiedAt) return <PropertyTypeIcon type="last_edited_time" size={s.ICON.doc} />
  return <PropertyTypeIcon type="context" size={s.ICON.doc} />

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
// :96 · src/renderer/Frames/filterModel.ts:218
    MODIFIED_TARGET,

// src/renderer/Views/TableView/TableView.tsx:445
    if (id === RESERVED_PROPERTY_ID.createdAt) {
      return (<span className="col-header-icon"><Icon name="clock-plus" size="body" /></span>)
    }
```

**Becomes**

```ts
// src/shared/types.ts
export type ColumnKind = 'title' | 'property' | 'context' | 'stamp'

// src/renderer/Views/Pipeline/columns.ts
function columnKind(id, contextIds): ColumnKind {
  if (id === RESERVED_PROPERTY_ID.title) return 'title'
  if (id in STAMP_TYPE) return 'stamp'
  return contextIds.includes(id) ? 'context' : 'property'
}
    if (id === RESERVED_PROPERTY_ID.title || id in STAMP_TYPE || contextIds.includes(id) || schema.some((d) => d.id === id)) {

// src/renderer/Frames/hiddenFrameModel.ts — the stamps follow the schema-property rule: listed unless shown
    ...Object.keys(STAMP_TYPE).filter((id) => set.has(id) || !shown.has(id)),

// src/renderer/Frames/HiddenFrame.tsx
  if (id === RESERVED_PROPERTY_ID.title) return <PropertyTypeIcon type="title" size={s.ICON.doc} />
  const stamp = STAMP_TYPE[id]
  if (stamp) return <PropertyTypeIcon type={stamp} size={s.ICON.doc} />
  return <PropertyTypeIcon type="context" size={s.ICON.doc} />

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
  if (propertyId in STAMP_TYPE) return VALUE_DIRECTIONS
    ...STAMP_TARGETS,
// src/renderer/Frames/filterModel.ts:218
    ...STAMP_TARGETS,

// src/renderer/Views/TableView/TableView.tsx — the `createdAt` glyph block deleted; `_created_at` reaches the
// PropertyTypeIcon path through declaredType like every other typed column.
```

**Verify — automated**

- [ ] Red first: `hiddenFrameModel.test.ts` "lists both stamps on a view that shows neither" and "omits a stamp the view shows"; `columns.test.ts` "`_created_at` in property_order emits a `stamp` column" — fail before.
- [ ] Inverted: `columns.test.ts`'s kind `'modified'`; `columnLabel.test.ts`'s 'Created'/'Modified'; any SortFrame/filterModel test naming `MODIFIED_TARGET`.
- [ ] `rg -c "MODIFIED_TARGET" src` → 0; `rg -c "'modified'" src` → 0; `rg -F "clock-plus" src/renderer/Views` → 0. Control: `rg -c "STAMP_TYPE" src` ≥ 8; `rg -c "STAMP_TARGETS" src` = 3.
- [ ] `rg -F "'Last Modified'" src` → 1; `rg -F "'Creation Time'" src` → 1 (columnLabel.ts only).
- [ ] Doc: ViewTypesPM :85 Sort By lists Creation Time and Last Modified. Req 11.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] On a Collection's Table view, the Hidden frame lists **Creation Time** and **Last Modified** with the clock-plus and history glyphs; toggling each reveals a dated column; the header glyph appears when Column Icons is on; the Sort and Filter frames offer both.
- [ ] Label check: the labels read "Creation Time" and "Last Modified" — an assumption Nathan can overturn by editing two strings in `columnLabel.ts`.

#### Gate 2 — the columns

- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.
- [ ] Every task's **Verify — automated** ticked against a result just watched.
- [ ] `code-simplifier` over the phase diff, dual-briefed; findings fixed or ruled.
- [ ] Commits landed per task, explicit paths only.
- [ ] Not a declared stop — Phase 3 opens.

---

### Phase 3 — Retire the writers

#### Task 5: No page writer stamps

**Requirement:** 6

**Why:** With nothing reading the keys, every writer that set them is maintaining a fact the file system already holds. Removing them also removes a whole class of judgment — whether a rename, a Context unlink, or a property delete "counts as an edit" — that each writer answered on its own. A body save that governs no key can also stop re-serializing frontmatter it doesn't touch.

**Now** — `rg -c "modified_at" src/main --glob '!*.test.*'` → 25; `rg -c "created_at" src/main --glob '!*.test.*'` → 3; `stamp:` in `src/main/CRUD` → 5:

```ts
// src/shared/identity.ts:22
export const PAGE_STAMP_KEYS = ['created_at', 'modified_at'] as const
export const PAGE_MODELED_KEYS = [PAGE_ID_KEY, 'icon', ...PAGE_STAMP_KEYS, 'cover'] as const
// src/shared/schemas.ts:61
export const pageFrontmatter = z.looseObject({ [PAGE_ID_KEY]: z.string(), icon: z.string().optional(), created_at: z.string().optional(), modified_at: z.string().optional(), cover: z.string().optional() })
// src/shared/properties.ts:154
const RESERVED_KEY_NAMES: ReadonlySet<string> = new Set([...Object.values(KIND_ID_KEY), ...PAGE_MODELED_KEYS])

// src/main/CRUD/page.ts:35
  const id = newId()
  const now = nowIso()
  const modeled: Record<string, unknown> = { [PAGE_ID_KEY]: id, created_at: now, modified_at: now }
// :62
  await serializeOnFile(absFile, async () => {
    recordWrite(absFile)
    recordWrite(target)
    await rename(absFile, target)
    const existing = await readFile(target, 'utf8')
    const content = mergeFrontmatter(existing, { modified_at: nowIso() }, ['modified_at'], splitEnvelope(existing).body)
    await atomicWriteFile(target, content)
  })
// :98
    await writePageFile(absFile, { modified_at: nowIso() }, ['modified_at'], body)

// src/main/CRUD/governedWrite.ts:37
  const content = mergeFrontmatter(existing, { ...survivingChanges(reconciled), ...next, modified_at: nowIso() }, [...changed, ...govern, 'modified_at'], splitEnvelope(existing).body)

// src/main/CRUD/pageValue.ts:40
    nextValue === null ? { modified_at: nowIso() } : { [key]: nextValue, modified_at: nowIso() },
    [key, 'modified_at'],
// :67
  return mergeFrontmatter(content, { modified_at: nowIso() }, [key, 'modified_at'], splitEnvelope(content).body)

// src/main/CRUD/governedSweep.ts:61
export interface SweepOptions { stamp?: boolean; rewriteText?: RewriteText }
// :143
      if (opts.stamp) modeled.modified_at = nowIso()
      const merged = opts.stamp ? [...keys, 'modified_at'] : keys
// callers: contextCascade.ts:82 `const STAMP_ON_CLEAR = { stamp: true }` · deleteProperty.ts:93 `{ stamp: true }` · replaySchemaCascade.ts:65 `{ stamp: true }`

// src/main/IO/pageFile.ts:84
  if (frontmatter === '' && modeledKeys.length === 0) return body
// :106
  if (modeledKeys.some((k) => k !== 'modified_at')) { throw new Error('This page’s frontmatter has a syntax error…') }
  return assembleEnvelope(frontmatter, body)

// src/main/CRUD/util.ts:60
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

// src/main/IO/pageFile.ts — a key-less write never parses the frontmatter
  const { frontmatter } = splitEnvelope(existingContent)
  if (modeledKeys.length === 0) return frontmatter === '' ? body : assembleEnvelope(frontmatter, body)
  const doc = parseDocument(frontmatter)
  if (mergeable(doc)) { … }
  throw new Error('This page’s frontmatter has a syntax error, so Pommora left it untouched. Fix the frontmatter and try again.')

// src/main/CRUD/util.ts
/** The ISO-8601 instant nexus.json records at creation. */
export function nowIso(): string {
```

**Verify — automated**

- [ ] Inverted in the same commit: `page.test.ts` (`:59` key set is `[PageID]`; `:98`/`:154` become "leaves the frontmatter bytes untouched" — byte-equal before and after a rename and a move; `:136`); `governedWrite.test.ts`, `pageValue`/`mutate.test.ts`, `contextCascade.test.ts`, `replaySchemaCascade.test.ts`, `cascade.test.ts`, `pageFile.test.ts` — every `modified_at` assertion becomes its absence; `registryProperty.test.ts` keeps refusing `created_at` and `modified_at` as names (unchanged, re-run).
- [ ] New: `pageFile.test.ts` "a body-only write on a syntax-broken frontmatter passes it through byte-for-byte" (the old `some(k !== 'modified_at')` escape, now the zero-key path) and "a body-only write re-serializes nothing" (a flow-style list `[a, b]` survives unspaced).
- [ ] Degenerate: `createPage` with a body and no icon writes exactly `PageID` + the body.
- [ ] `rg -c "modified_at" src/main --glob '!*.test.*'` → 0 outside the sidecar writers Task 6 owns (list them in the tick); `created_at` → 0; `PAGE_STAMP_KEYS` → 0; `stamp:` in `src/main/CRUD` → 0. Control: `nowIso` ≥ 1.
- [ ] Docs: PagesPM :17, :19; PropertiesPM :114–121 (the example loses both lines; the paragraph states the two sources and that a schema edit rewriting a page moves its Modified time); ArchitecturePM §Data layer gains the sweep-moves-mtime sentence. Req 11.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] *(carried — Completion Criteria: a rename leaves Last Modified where it was; a body edit moves it)*

#### Task 6: No sidecar writer stamps

**Requirement:** 7

**Why:** The sidecar twin had no reader at all; each writer spread `modified_at: nowIso()` into a JSON object nothing consulted. Dropping the field from `baseSidecar` lets the schema enumerate the writers.

**Now** — `rg -n "modified_at" src/main/CRUD/{views,containerConfig,contextWrite,deleteProperty,removeProperty}.ts` → 7:

```ts
// src/shared/schemas.ts:32
export const baseSidecar = z.looseObject({ id: z.string(), icon: z.string().optional(), modified_at: z.string().optional() })
// src/main/CRUD/views.ts:40, :61, :79
    await writeSidecar(folder, kind, { ...sidecar, views, modified_at: nowIso() })
// src/main/CRUD/containerConfig.ts:44
    await writeSidecar(folder, kind, { ...sidecar, ...definedOnly(patch), modified_at: nowIso() })
// src/main/CRUD/contextWrite.ts:210
    return { ...root, modified_at: nowIso() }
// :303
    const next: Raw = { ...cur, modified_at: nowIso() }
// src/main/CRUD/deleteProperty.ts:125
    const next: Record<string, unknown> = { ...sidecar, properties: assigned.filter((id) => id !== propertyId), modified_at: nowIso() }
// src/main/CRUD/removeProperty.ts:96
  const next: Record<string, unknown> = { ...cur, modified_at: nowIso() }
```

**Becomes**

```ts
// src/shared/schemas.ts
export const baseSidecar = z.looseObject({ id: z.string(), icon: z.string().optional() })
// each writer above spreads without the stamp:
    await writeSidecar(folder, kind, { ...sidecar, views })
    await writeSidecar(folder, kind, { ...sidecar, ...definedOnly(patch) })
    return root
    const next: Raw = { ...cur }
    const next: Record<string, unknown> = { ...sidecar, properties: assigned.filter((id) => id !== propertyId) }
  const next: Record<string, unknown> = { ...cur }
// `nowIso` imports drop wherever this leaves them unused.
```

**Verify — automated**

- [ ] Inverted: every sidecar test asserting `modified_at` (views, containerConfig, contextWrite, deleteProperty, removeProperty suites) asserts the key's absence; a write over a sidecar that still holds a legacy `modified_at` leaves it in place (loose object, foreign key).
- [ ] `rg -c "modified_at" src --glob '!*.test.*'` → 1 (`properties.ts` reserved names) + `exclusionScan.ts` until Task 7. Control: `writeSidecar` ≥ 6.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] *(none)*

#### Task 7: Clear Exclusion strips ids and Context keys only

**Requirement:** 8

**Why:** With no stamps written, Clear has two things left to remove from a page: its kind id and its `<Context>` keys. The copy says exactly that.

**Now**

```ts
// src/main/exclusionScan.ts:22
const BOOKKEEPING_KEYS: readonly string[] = [...Object.values(KIND_ID_KEY), ...PAGE_STAMP_KEYS]
// :68
    detail: 'Pommora’s container files are removed and each page’s identity key, timestamps, and Context keys are dropped; every other key a page holds stays. This cannot be undone.',
```

**Becomes**

```ts
// src/main/exclusionScan.ts
const BOOKKEEPING_KEYS: readonly string[] = Object.values(KIND_ID_KEY)
    detail: 'Pommora’s container files are removed and each page’s identity key and Context keys are dropped; every other key a page holds stays. This cannot be undone.',
```

**Verify — automated**

- [ ] Inverted: `exclusionScan.test.ts`'s stamp-strip case becomes "a legacy `modified_at` key survives Clear as foreign frontmatter"; the copy assertion follows the new detail.
- [ ] `rg -c "modified_at" src --glob '!*.test.*'` → 1; `rg -F "timestamps" src/main/exclusionScan.ts` → 0. Control: `KIND_ID_KEY` in the file ≥ 1.
- [ ] Doc: ArchitecturePM :93; ConfigurationPM wherever it quotes the Clear detail (`rg -F "timestamps" .claude/Features` → 0 after). Req 11.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] The Clear confirm dialog reads "identity key and Context keys."

#### Task 8: Adoption seeds the ULID from the file's age

**Requirement:** 9

**Why:** Creation Time is read from the ULID, so a page adopted today from a file written last year should carry last year in its id. The seed is the older of birthtime and mtime — on a filesystem that reports no birthtime, mtime is the honest floor. In-app creates keep the monotonic mint, since their instant is now.

**Now** — `rg -n "newId\(\)" src/main --glob '!*.test.*'` → count at execution:

```ts
// src/main/ids.ts:10
const nextUlid = monotonicFactory()
export function newId(): string { return nextUlid() }

// src/main/adopt.ts:68
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
 *  the factory clamps a past seed to its last mint, which would erase the age. */
export function idAt(atMs: number): string {
  return ulid(atMs)
}

// src/main/adopt.ts
async function stampPage(absFile: string, kind: ContentKind): Promise<boolean> {
  const content = await readFile(absFile, 'utf8')
  if (admitContentFile(readFrontmatterFields(content), kind).state !== 'missing') return false
  const key = KIND_ID_KEY[kind]
  const { body } = splitEnvelope(content)
  const st = await stat(absFile)
  const id = idAt(Math.min(st.birthtimeMs || st.mtimeMs, st.mtimeMs))
  await atomicWriteFile(absFile, mergeFrontmatter(content, { [key]: id }, [key], body))
  return true
}
```

**Verify — automated**

- [ ] Red first: `adopt.test.ts` "an adopted page's id decodes to the file's mtime when that is older than now" (`utimes` to a fixed past instant → `idTime(id)` equals it within the second) and `ids.test.ts` "`idAt` round-trips through `idTime`" — fail before.
- [ ] Both halves: the same adopt test with the seed replaced by `newId()` goes red (the id decodes to now).
- [ ] Degenerate: `birthtimeMs === 0` (unsupported) → the mtime seeds.
- [ ] `rg -c "idAt\(" src/main --glob '!*.test.*'` → 2 (definition + adopt). Control: `newId\(\)` = baseline − 1.
- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.

**Verify — user**

- [ ] *(carried — Completion Criteria: an adopted page dated last year shows last year)*

#### Gate 3 — no writer, no key

- [ ] typecheck 0 · Vitest green · lint `Found 0 warnings`.
- [ ] Every task's **Verify — automated** ticked against a result just watched.
- [ ] Dead Vocabulary sweep, every line, controls non-zero.
- [ ] `code-simplifier` over the whole arc's diff, dual-briefed; `comment-killer-agent` (single-handed) over the same; findings fixed or ruled.
- [ ] `build-breaking-agent` over the whole arc (≤ 3 rounds); every finding verified against the code, fixed or carrying a ruling.
- [ ] Commits landed per task, explicit paths only.
- [ ] **Declared Stop** — the closeout vault pass needs Nathan.

---

### Progress

Pre-Phase-0 baseline (recorded at execution): typecheck · Vitest files / tests · Biome.

- [ ] **Phase 0** — Task 0
- [ ] **Phase 1** — Tasks 1–2 · Gate 1
- [ ] **Phase 2** — Tasks 3–4 · Gate 2
- [ ] **Phase 3** — Tasks 5–8 · Gate 3
- [ ] **Closeout** — vault pass · docs · History

### Rulings

- **Carrier** (Nathan, 09-01-2026): the typed record, not a tuple.
- **Rename/move leave Modified alone** (Nathan, 09-01-2026): "the preferred outcome."
- **Body-save push** (Nathan, 09-01-2026): fold it in — one shared writer path.
- **Group by stamp** (Nathan, 09-01-2026): not built; nothing existing rides.
- **Both columns first-class** (Nathan, 09-01-2026): Creation Time and Last Modified sort, filter, reveal, render.
- **Labels** (executor's reading, unratified): "Creation Time" / "Last Modified" — two strings in `columnLabel.ts` if Nathan wants otherwise.
- **`{ id: pageId }` fallback** (Nathan, 09-01-2026): fixed alongside.
- **Clear Metadata** (Nathan, 09-01-2026): reduces to ids + Context keys.
- **`_id` sort** (executor, 09-01-2026): deleted with its constant — its one consumer was the sort case Creation Time supersedes; a saved view naming `_id` resolves to no criterion, which is the same treatment any stale id gets.
- **Task 0 by subagent** (Nathan, 09-01-2026): comments first, single-handed, so old prose never reads as instruction.
- **Vault pass** (Nathan, 09-01-2026): one-time, manual, whole vault including excluded folders, when the plan is done.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- `mergeFrontmatter` emits `---\n{}\n---` when Clear empties a page's map (a page holding only its id and Context keys); pre-existing, unchanged by this arc — drop the fence when the map empties.
- The content index's `values` rows still record legacy stamp keys until each file's (mtime, size) moves; harmless, self-healing.
- An adopted page's Creation Time is its adoption instant for every page adopted *before* Task 8; re-minting those ids is identity surgery (`page_order`, nexus.db rows) and is not this arc's.

### Closeout

**Coordination point — the vault pass** (Nathan present; nothing touched before the per-item go):

1. App closed (`ps` shows no Electron on NexusOS). Census run and shown: every `.md` under `~/NexusOS` (excluded folders included) holding `created_at:` or `modified_at:` at the frontmatter root, and every `.json` sidecar holding `modified_at` — predicted 49 / 88 / 29 from grounding; the actual list is presented file by file.
2. Backup: a dated copy of every file the census names, relative paths preserved, at `~/NexusOS-stamp-backup-MM-DD-YYYY/` — the vault's tree is dirty, so no stash and no commit of Nathan's in-flight work.
3. The transform, a throwaway script in the scratchpad (never app code): pages through `yaml`'s `parseDocument` → `doc.delete('created_at')`, `doc.delete('modified_at')` → the envelope reassembled with the body byte-identical (the same document edit `mergeFrontmatter` performs, so comments and foreign keys survive); sidecars through parse → delete → `JSON.stringify(sortKeys(value), null, 2)` matching `atomicWrite.ts:137`. Dry run first: three sample diffs shown before any write. Idempotent: a second run reports 0 changes.
4. Invariants after: `rg -e "^created_at:|^modified_at:" ~/NexusOS --glob '*.md'` → 0; `rg -F '"modified_at"' ~/NexusOS --glob '*.json'` → 0; control `rg -c "^PageID:" ~/NexusOS` unchanged from the census; every touched page's body byte-equal to its backup's body.
5. Disclosed consequence: a page's Creation Time is now its PageID's instant — for a page Pommora created, the same instant `created_at` held; for a page adopted before Task 8, its adoption date.

**Then:** History entry (arc "Stamp Retirement"); Context doc's Recent Work; Handoff; a Development-Environment line if the executor hit a trap worth keeping; the Delivery Claim below checked by a neutral verifier against Requirements 1–12.

## Completion Criteria

**The bar.** A future review of this arc finds nothing to correct; no concerns carried; a second stamp source anywhere means the plan is wrong or the executor is.

**The deliverable**

- [ ] Every numbered requirement traces to a landed task (neutral verifier).
- [ ] The Acceptance criterion observed running, clause by clause, in a scratch nexus over CDP.
- [ ] Dead Vocabulary at zero, controls non-zero.
- [ ] Every Made False row landed in its task's commit.

**The passes**

- [ ] Simplification and the comment pass over the whole range, not only per phase.
- [ ] Attack review after the Delivery Claim is verified; every finding fixed or carrying a defensible ruling.

**Nathan's own pass**

- [ ] The two labels.
- [ ] The Hidden frame on a real NexusOS Collection: reveal both, sort by each, filter by each.
- [ ] The vault pass's per-item go, and the backup's location.
