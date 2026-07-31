## Identity + Enforcement — Implementation Plan

> **Status: ratified — in execution.** Two adversarial rounds run and folded. Spec: [[Identity + Enforcement — Decision Log]]. Removal inventory: [[Agenda De-Scaffolding Report]]. Steps use checkbox syntax for tracking; execute tasks strictly in order (D-20: remove old → verify clean slate → implement new). Every `file:line` below was verified at planning time; re-confirm a line before editing if the tree has moved.

**Goal:** Delete the old agenda architecture wholesale, collapse the old frontmatter-`id` system to one seam, then implement kind-stamped identification (`PageID:`/`TaskID:`/`EventID:`) with the five-arm admission predicate, folder-kind resolver, and singleton registration.

**Architecture:** Identity's key vocabulary moves to one shared module consumed by main's read/write/adopt paths. Classification = folder-declared kind (sidecar) + in-file kind-key agreement; failures are **Unknown** (invisible, untouched). Sidecar JSON `id` fields are NOT in scope — a sidecar's kind is its filename; the kind-key system governs content files (`.md` frontmatter) only.

**Global Constraints (every task inherits these):**
- Gates, exit codes read directly (never piped): `env -u ELECTRON_RUN_AS_NODE npm run typecheck` · `npx biome lint src` · `npx vitest run` · `env -u ELECTRON_RUN_AS_NODE npm run build`.
- Biome's PostToolUse hook formats every write — never hand-align; an Edit failing on whitespace means re-read and retry.
- Commits per task, explicit-path staging only. Comment discipline: why-only, no value restatement, no plan references.
- Tests run against fixtures/`TEST_NEXUS_PATH` — never the live nexuses. Never launch a second app instance against a live nexus.
- Out of scope everywhere: the record system (own plan), agenda shape/surfaces/CRUD (the rethink), EventKit, duplicate-id policy (D-15), the kind toggle UI.

---

### Phase 1 — Remove the Old Agenda Architecture

#### Task 1: Relocate `stripPageMember`, delete the dead write layer

**Files:**
- Modify: `src/main/crud/pageValue.ts` (receive `stripPageMember` from `src/main/crud/schema.ts:56-66`)
- Modify: `src/main/crud/removeProperty.ts:10` + `src/main/crud/deleteProperty.ts:16` (import path only — both currently `import { stripPageMember } from './schema'`)
- Delete: `src/main/crud/agendaEntity.ts` · `src/main/crud/agendaEntity.test.ts` · `src/main/crud/agendaSchema.test.ts` · `src/main/crud/schema.ts` (all of it, once `stripPageMember` is out — `agendaTarget`/`rewriteAgendaMember`/four agenda ops at `:68-92`,`:230-249` have zero production importers; the generic `SchemaTarget` core `:40-226` has `agendaTarget` as its only instantiation) · `src/main/io/schemaTransaction.ts` + its test (sole non-io consumer is `schema.ts`)
- Modify: `src/main/crud/contextWrite.test.ts` — remove the `import { updateAgendaItem, updateAgendaProperty } from './agendaEntity'` (`:14`) and the whole agenda-lock describe block (`:170-196`; its subject `setAgendaContext` dies in Task 3, so the block goes now, not a rewrite)
- Modify: `src/shared/schemas.ts:66-73` — delete `agendaConfigSidecar` (sole consumer was `schema.ts`)
- Modify: `src/shared/result.ts:12-13` — delete `'invalid-event'` + `'not-agenda'` from `ErrorCode` (sole producers were `agendaEntity.ts:50,:64`)

**Steps:**
- [x] Move `stripPageMember` verbatim into `pageValue.ts`; update the two imports; run typecheck — expect green.
- [x] Delete the files/blocks listed above in one pass. **Also removed:** the `setAgendaContext` import at `contextWrite.test.ts:9` (orphaned with the describe block), `listFilesBySuffix` (`io/walk.ts` — zero consumers once `agendaTarget` died), and the `SchemaTransaction` citation in `atomicWrite.ts`'s `serializeJson` header.
- [x] Run all four gates — green (172 files / 1857 tests; `contextWrite.test.ts`'s remaining blocks cover `setPageContext`/`setSpaceContext` and still pass).
- [x] Grep-verify: `grep -rn "agendaEntity\|agendaConfigSidecar\|SchemaTarget\|schemaTransaction\|invalid-event\|not-agenda\|listFilesBySuffix" Pommora/src` → zero hits.
- [x] Commit (explicit paths): `refactor(agenda): the dead write layer leaves — stripPageMember rehomes beside the page value writers`

#### Task 2: Delete the interim read surface

**Files:**
- Delete: `src/main/agenda/collectAgenda.ts` + `collectAgenda.test.ts` (the whole `src/main/agenda/` folder)
- Modify: `src/shared/bridge.ts:223` — remove the `'agenda:list'` channel entry
- Modify: `src/main/index.ts:496-505` — remove the handler
- Modify: `src/preload/index.ts:135` — remove `agenda: { list: ask('agenda:list') }`
- Modify: `src/shared/types.ts:48-57` — delete `AgendaEntry`
- Modify: `src/renderer/src/store.ts` — delete `agendaSnapshot` + `ensureAgendaSnapshot` (`:230-231`, `:1078-1086`) and both invalidations (`:631`, `:794`)
- Modify: `src/renderer/src/Navigation/useNavData.ts` — drop the snapshot read (`:48`) + re-warm effect (`:54-56`) + the `agenda` dependency of the search memo (`:59-62`); `splitSearch`/`extras` (`:23-33`) STAY (the pattern is on the never-delete list; with no producer, `extras` is simply always empty)
- Modify: `src/renderer/src/Navigation/navSearch.ts:26-36` — remove the `agenda` parameter and both append loops (`:33-34`)
- Modify: `src/renderer/src/Navigation/navSearch.test.ts` — its `AgendaEntry` import (`:2`) and agenda-append cases go with the parameter
- Modify: `src/renderer/src/Sidebar/Sidebar.tsx:505-521` — delete the agenda fetch state + effect; `agendaLayer` renders the inert mode
- Modify: `src/renderer/src/Sidebar/AgendaMode.tsx` — reduce to the static empty state (the row renderer, both list props, and the icon fallback go; the component renders its existing `"No tasks or events"` empty state unconditionally); update `AgendaMode.test.tsx` to pin exactly that. Its doc-comment (`:11-16`) explains the fetch-ownership split that dies with the fetch — rewrite it to the inert truth, and delete the matching rationale comment at `Sidebar.tsx:501-504`.
- Modify: `src/renderer/src/Sidebar/Sidebar.css:181-197` — the row renderer's death orphans `.agenda-row` + `.agenda-title`, and the unconditional empty state orphans `.agenda-mode`; all three go, along with the now-false `agenda mode (read-only list)` section heading. **`.agenda-empty` survives** (it is what the mode now renders).
- Modify: `Features/Sidebar.md` — the Agenda bullet's whole fetch-ownership paragraph ("the sidebar owns the fetch rather than the mode component… It re-reads per open nexus") describes machinery this task deletes; restate the mode as an inert slot.
- Modify: `Features/Navigation.md` — the search paragraph's "plus a cached Agenda snapshot so Tasks and Events are findable", the rail paragraph's "the inert agenda hits render as List rows only", and the Deferred entry's "Agenda entries are search-listable but route nowhere" all go false the moment the snapshot dies.
- **Survivors, deliberate (do NOT touch):** the `'agenda'` `SidebarMode` + ribbon entry + `readPersonalization` allowlist (`readNexus.ts:84`) · `labels.agendaTask`/`agendaEvent` parsing (`readNexus.ts:154-155`) · `NavRef`'s `'task' | 'event'` kinds (`types.ts:285`) + the three renderer guards (`tabsModel.ts:35`, `store.ts:1000`, `store.ts:1047`) + `NAV_KINDS`/`TAB_KINDS` allowlists (D-19: the kind-scoping capability stays) · `NavList`'s extras rendering (`NavList.tsx:242-252`)

**Steps:**
- [x] Delete/modify per the list, renderer last (the bridge entry's removal makes any missed caller a compile error — use that: typecheck after the main/shared half, expect the renderer callers to be the only reds, then fix exactly those). The technique worked: 10 errors, all renderer, all expected.
- [x] Run all four gates — green (171 files / 1852 tests).
- [x] Grep-verify: `grep -rn "agenda:list\|AgendaEntry\|agendaSnapshot\|ensureAgendaSnapshot\|agenda-row\|agenda-title\|agenda-mode\|buildNavIndex\|collectAgenda" Pommora/src` → zero hits.
- [x] **`buildNavIndex` collapsed rather than trimmed.** With the agenda append gone it was a one-line passthrough to `searchEntriesOf` with one production caller, wrapped in a `useMemo` around an already-identity-memoized function. Its purpose — merging an *off-tree* source into the tree index — is permanently dead under D-9, not temporarily. `useNavData` now calls `searchEntriesOf` directly against a stable empty constant; the `treeIndex` ↔ `navSearch` import cycle breaks; `navSearch.test.ts`'s index-shape coverage moved to `treeIndex.test.ts`, where its subject lives.
- [ ] **Live check — Nathan's loop, not mine.** Against the TEST nexus: the Agenda ribbon mode renders "No tasks or events"; nav search returns no task/event rows for any query.
- [x] Commit: `refactor(agenda): the interim read surface leaves — the mode slot stays inert`

#### Task 3: Delete the suffix grammar

**Files:**
- Delete: `src/shared/agenda.ts` (whole file — item schemas, `AGENDA_SUFFIX`, `agendaKindOf`)
- Modify: `src/main/crud/contextWrite.ts` — delete `setAgendaContext` (`:177-193`), its dispatch line (`:225` — `if (agendaKindOf(abs)) return setAgendaContext(...)`), and the `agendaKindOf` import (`:20`)
- Modify: `src/main/crud/contextCascade.ts` — remove the agenda suffixes from the json sweep (`:102-104` — the `listFilesRecursive(root, [AGENDA_SUFFIX.task, AGENDA_SUFFIX.event], …)` spread), leaving the `_space.json` sweep; drop the `AGENDA_SUFFIX` import (`:16`)
- Modify: `src/main/crud/util.ts:23` — `invalidName`'s extension test `/\.(md|task\.json|event\.json)$/i` → `/\.md$/i`
- Modify: `Features/Agenda.md` — the suffix grammar's death falsifies the doc's spine: both kind bullets' `.task.json`/`.event.json` formats, the EventKit-mirror framing, the "file format and the CRUD behind it are written and tested" note, and "what ships is a read-only list feeding display-only rows". Restate to the de-scaffolded truth — the singleton-folder + config-sidecar law and the settled identity/kind rules survive; shape, fields, and surfaces await the Agenda rethink. Do not invent shape decisions here.
- **Survivors, deliberate:** `paths.ts:17-18` (`taskConfig`/`eventConfig` filenames) and the agenda-folder skips in `adopt.ts:105-110` + `readNexus.ts:487-492` — they keep old/stray agenda folders from adopting as Collections until Task 8 replaces them with registration-aware classification.

**Steps:**
- [x] Delete/modify per the list; run typecheck to catch any missed `@shared/agenda` importer, fix exactly those. **Also removed:** `readJsonObject` + `writeJson` from `contextWrite.ts` (orphaned with `setAgendaContext` — it was their only caller), and the `.task.json` fixture files in `adopt.test.ts` + `readNexus.test.ts`, which asserted the dead grammar; both became `.md` members, strengthening the assertion (a *content-bearing* agenda folder still isn't adopted as a Collection).
- [x] Rewrite `src/main/crud/contextCascade.test.ts` (the attack round measured **7 of 15 tests failing** here — measured live as 7 there plus 1 in `util.test.ts`; this is a rewrite subtask, not assertion-trimming): the rename/unlink cases drop their agenda-JSON scope assertions; the D-7b skip-journal test (`:136-146`) keeps its *behavior* (an enumerated-but-unreadable file is skipped, the journal survives) on a NEW non-agenda fixture — a directory named `Broken.md` inside a Collection (matches the `.md` sweep's suffix filter, unreadable as a file).
- [x] Update `src/main/crud/util.test.ts:25-28` — `'Thing.task.json'`/`'Thing.event.json'` move from the rejected list to accepted names (the extension rule now guards `.md` only); `contextWrite.test.ts`'s remaining `.task.json` fixture cases delete.
- [x] Clean the now-stale comment block at `adopt.ts:101-104` (it cites `agendaKindOf`/`shared/agenda.ts`, which no longer exist) — the skip itself survives, its comment tells the new truth.
- [x] Run all four gates — green (171 files / 1853 tests).
- [ ] Grep-verify: `grep -rn "AGENDA_SUFFIX\|agendaKindOf\|task\.json\|event\.json" Pommora/src` → hits only in `paths.ts`/`adopt.ts`/`readNexus.ts` survivor lines (filenames + skips) **and `util.test.ts`'s accepted-name fixtures** (this task deliberately moves `Thing.task.json`/`Thing.event.json` into the accepted list — expected hits, not a miss); none in comments citing dead modules.
- [x] Commit: `refactor(agenda): the suffix grammar leaves — sidecar skips survive until registration lands`

#### Task 4: Live-nexus folder deletion (Nathan-coordinated)

**Steps:**
- [x] App closed (both nexuses) — and **fully stopped, not just the window closed**: a detached `electron-vite dev` keeps the watcher alive, and main/preload never HMR, so a surviving dev process is still executing pre-Task-1 main code.
- [x] Enumerate: `find <test-nexus> <NexusOS> -maxdepth 2 \( -name "_taskconfig.json" -o -name "_eventconfig.json" \)` — list every hit's parent folder with its contents to Nathan **before touching anything**. Four folders, each sidecar-only; zero item files on either nexus. **Read each config in FULL** — a truncated read understated the NexusOS pair, which carried a hand-authored `_type` Select beyond the built-in Status (recorded in the log's Schema Scrub Inventory).
- [x] On Nathan's go per folder: move each singleton folder to the **system trash** (recoverable — never `rm`). Bytes also snapshotted to the session scratchpad, so the taxonomy survives an emptied trash.
- [x] Re-run the enumeration → zero hits. No tolerance code is ever written for what was removed.

#### Gate 1 — clean-slate verification
- [x] All four gates green (171 files / 1853 tests).
- [x] The Task 1–3 greps all clean.
- [x] Survivor sweep: four comments describing deleted machinery rewritten to durable truth — `treeIndex.ts`'s "agenda entries append per surface", `mutate.ts`'s three-scope cascade list, and the two nav-guard comments in `store.ts` whose rationale was written as a wait ("no resolver yet", "until the agenda resolver ships"). A guard's comment states why it refuses, not what hasn't shipped.
- [ ] **Live — Nathan's loop:** a Context rename in the TEST nexus still sweeps `.md` + `_space.json`; Agenda mode inert; search clean.

**Phase 1 closed. Self-review findings that rewrite later tasks:**

1. **Task 9/10 gained a prerequisite Phase 1 created.** `readSidecar` requires a zod schema, and Task 1 deleted `agendaConfigSidecar` — the only one for an agenda config. Task 9's resolver must read that sidecar's `id` to match the registration, so it needs a schema first. `baseSidecar` (`schemas.ts:23`) is exactly `{ id, icon?, modified_at? }` loose — *precisely* D-10's identity-only config — but it is not exported. **Export it and read agenda configs through it**; do not author a parallel schema. `writeSidecar` takes `unknown`, so Task 10's seed needs nothing.
2. **Citation drift, re-verified against the post-Phase-1 tree.** Task 6: `pageFrontmatter` `:80-86` → **`:71-77`**, `PAGE_MODELED_KEYS` `:91` → **`:82`** (both moved up with `agendaConfigSidecar`'s deletion). Task 11: `sweepContextRoots`' `.md` loop `:77` → **`:76`**. Task 9: `adopt.ts`'s skip `:105-110` → **`:104-109`**. Unchanged and re-confirmed: `readNexus.ts:224` · `readPage.ts:23` · `loadValues.ts:30` · `cascade.ts:34` · `removeProperty.ts:57`/`:118` · `adopt.ts:30`/`:32` · `mutate.ts:321`/`:325` · `readNexus.ts:487-493`.
3. **One Task 6 claim still to prove, not assume.** The plan states `writeImageAsset`'s other callers pass trusted constants. Three exist — `mutate.ts:275` (nexus id), `:348` (`''`), `:382` (`assetKey`, a *variable*). Confirm `:382` resolves to a constant before gating only the `:325` call site.
4. **Phase 2's baseline is 171 files / 1853 tests** — Phase 2 must not change either number beyond stub typing.

---

### Phase 2 — Remove the Old ID System (Consolidate to One Seam)

#### Task 5: The identity seam module

**Files:**
- Create: `src/shared/identity.ts`
- Test: `src/shared/identity.test.ts`

**Interfaces (later tasks rely on these exact names):**
```ts
// src/shared/identity.ts — the single owner of the content-file identity key.
// Sidecar JSON `id` fields are NOT this key: a sidecar's kind is its filename.
// Pure module — no runtime imports (safe for any consumer).
export const PAGE_ID_KEY = 'id'

/** The content id off a parsed frontmatter/JSON root, or undefined. */
export function contentId(fm: Record<string, unknown>): string | undefined {
  const v = fm[PAGE_ID_KEY]
  return typeof v === 'string' && v.length > 0 ? v : undefined
}
```

**Steps:**
- [ ] Write the failing test: `contentId({ id: 'X' }) === 'X'`, `contentId({}) === undefined`, `contentId({ id: 3 }) === undefined`, `contentId({ id: '' }) === undefined`.
- [ ] `npx vitest run src/shared/identity.test.ts` — expect FAIL (module missing).
- [ ] Implement as above; vitest → PASS.
- [ ] Commit: `feat(identity): the seam module — one owner for the content id key`

#### Task 6: Route every consumer through the seam

**Files (the grep-complete production set — modify each):**
- `src/main/readNexus.ts:224` — `asString(fm.id)` → `contentId(fm)` (in `readPageRecord`)
- `src/main/readPage.ts:23` — same substitution
- `src/main/crud/loadValues.ts:30` — `{ ...rec.fm, [PAGE_ID_KEY]: rec.node.id }`
- `src/main/crud/cascade.ts:34` — `if (!splitFrontmatter(content).id)` → `if (!contentId(splitFrontmatter(content)))`
- `src/main/crud/removeProperty.ts:57` (snapshot) + `:118` (restore) — `fields.id`/`readFrontmatterFields(content).id` → `contentId(...)`
- `src/main/adopt.ts:30` — `asString(readFrontmatterFields(content).id)` → `contentId(readFrontmatterFields(content))`; `:32`'s `{ id: newId() }, ['id']` → `{ [PAGE_ID_KEY]: newId() }, [PAGE_ID_KEY]`
- `src/main/mutate.ts:321` — `fields.id` → `contentId(fields)`. **The F6 gate moved to the sink, and the premise behind its original placement was false.** `writeImageAsset` has FOUR callers, not three-trusted-plus-one: `:275` (nexus id) and `:348` (`''`) are trusted, `'homepage'` is a literal, but the container-banner arm assigns `assetKey` from `readJsonObject(<container sidecar>).id` — arbitrary disk content reaching `join(root, '.nexus', 'assets', assetKey, file)`, the same untrusted class as the page frontmatter id and behind the same insufficient `typeof === 'string'` check. Gating one call site would have left a demonstrated hole: a negative-control run with the guard disabled **creates a directory outside the nexus root**. One predicate at the sink instead, covering every present and future caller.
  **Shape, deliberately narrow:** the key must be ONE path segment (no `/`, no `\`, not `.`/`..`) — *not* ULID-shaped. A ULID requirement would strip cover images from any hand-authored id, including the live `research-*` slug pages, which is a behavior change Phase 2 must not make. Path syntax is the harm; id shape is not.
- `src/main/crud/page.ts:34-38` — `createPage`'s modeled record keys via `PAGE_ID_KEY`
- `src/shared/schemas.ts:71-77` — `pageFrontmatter` uses the computed key. **The explicit interface proved unnecessary and was not written:** `PAGE_ID_KEY` is a literal type, so TypeScript resolves the computed property to a named field and `z.infer` survives intact (typecheck green across the whole frontmatter surface). Hand-writing a parallel interface would have duplicated the schema and broken the file's own stated law — each schema IS its type. The plan's sketch, kept for the record:
```ts
import { PAGE_ID_KEY } from './identity'
export const pageFrontmatter = z.looseObject({
  [PAGE_ID_KEY]: z.string(),
  icon: z.string().optional(),
  created_at: z.string().optional(),
  modified_at: z.string().optional(),
  cover: z.string().optional(),
})
export interface PageFrontmatter {
  [key: string]: unknown
  icon?: string
  created_at?: string
  modified_at?: string
  cover?: string
}
```
- `src/shared/schemas.ts:91` — `PAGE_MODELED_KEYS = [PAGE_ID_KEY, 'icon', 'created_at', 'modified_at', 'cover'] as const`
- `src/renderer/src/Detail/Views/pipeline/group.ts:68` — `flattenContainer`'s fallback `{ id: page.id }` → `{ [PAGE_ID_KEY]: page.id }` (round 2, M7 — the one renderer site holding the literal).
- Renderer/test stubs that read `.frontmatter.id` directly: fix what typecheck flags after the schema change; nothing else.

**Steps:**
- [x] Route the readers (the first seven files), typecheck between groups — behavior identical, the seam still answers `'id'`.
- [x] Route the writers + schemas (the last three). `asString` left `readPage.ts` with its last use.
- [x] Run all four gates — green at **172 files / 1858 tests**: the Task 5 baseline of 1857 plus the one new test, and no assertion rewrites anywhere. Zero behavior change confirmed by the count, not by assertion.
- [x] Pin the sink guard with a **negative control**: disable `assetKeyOk` and the new test must fail on a directory appearing outside the nexus root. Verified failing, then restored — a guard test that passes both ways proves nothing.
- [ ] Grep proof of one ownership: `grep -rn "fm\.id\b\|frontmatter\.id\b\|fields\.id\b\|splitFrontmatter(content)\.id\|readFrontmatterFields(content)\.id\|{ id: \|, id: " Pommora/src --include="*.ts"` reviewed hit-by-hit — the accesses AND object-literal writes; zero production hits outside the seam (the grep is a reviewed sweep, not a bare count — sidecar/nexus/tab `id` fields are different keys and stay).
- [ ] Commit: `refactor(identity): every content-id consumer routes through the seam`

#### Task 7: The ID-less fixture (review F7 — lands BEFORE the cutover)

**Files:**
- Test: extend `src/main/readNexus.test.ts` + `src/main/crud/loadValues.test.ts` (or nearest existing suites)

**Steps:**
- [x] Write the test: a fixture page with NO identity key flows through the walk (gets `adopted-` synthetic id), through `loadValues` (present in the value map under the synthetic id — no silent drop), and through `readPage` (detail opens) — pinned green under the OLD key so Phase 3's flip must keep it green.
- [x] **Audit first — two of the three legs were already pinned.** The walk (`readNexus.test.ts`, "adopts no-frontmatter pages") and the detail read (`readPage.test.ts`, "adopts an id … when no frontmatter") already covered it. `loadValues` pinned only the *key*, so it was strengthened to assert the values ride intact — a row landing in the batch with its values dropped renders blank, which reads as data loss rather than as a page awaiting adoption.
- [x] **The real gap was elsewhere, and Gate 3 depends on it:** the documented Remove-Property law — "an id-less page still gets stripped, its value just isn't restorable" — had **no test at all**. Written now: an identity-less member is stripped like any other, and caches nothing. This is the tripwire for the round-2 R5 gate; a `member`-only admission check in Task 11 turns it red.
- [x] vitest → PASS (this behavior exists today; the fixtures pin it). 172 files / 1859 tests.
- [x] Commit: `test(identity): the ID-less page fixture — the cutover cannot hide behind migrated fixtures`

#### Gate 2 — one-owner verification
- [x] All four gates green (172 files / 1859 tests); the Task 6 grep clean; Task 7's fixtures green.
- [x] Behavior unchanged confirmed by **count, not by assertion**: Phase 2 rewrote zero existing assertions. Every test that passed before the seam passes after it, and the only count movement is the three tests this phase added.

**Phase 2 closed. Self-review findings:**

1. **The plan's `writeImageAsset` census was wrong, and the correction changed the fix's shape.** Four callers, not three-trusted-plus-one — the container-banner arm takes its key from a sidecar read off disk. Gating the one named call site would have left a *demonstrated* escape: with the guard lifted, the pinning test creates a directory outside the nexus root. The guard belongs at the sink. **Lesson for the remaining tasks: a hand-enumerated caller list in this plan is a hypothesis, not a census** — re-derive it by grep before relying on it. Task 11's five-sweep list is the next one that matters.
2. **A "make the type explicit" instruction proved unnecessary.** `PAGE_ID_KEY` is a literal type, so the computed schema key resolves to a named field and `z.infer` survives. Writing the parallel interface would have duplicated the schema. Check inference before hand-writing a type the schema already yields.
3. **Guard tests need negative controls.** The traversal test was verified by disabling the guard and watching it fail. A guard test that passes both ways proves nothing — apply this to every refusal Task 11 adds.
4. **Phase 3's baseline is 172 files / 1859 tests.**

---

### Phase 3 — Implement the New Identification System

**Phase constraint (attack round 2, C1 — data-loss window):** between Task 8 landing and Task 12 completing, **the app must not open either live nexus** — adoption under the flipped seam stamps fresh `PageID`s onto legacy `id:` pages, and the later rename then creates duplicate keys (silent identity loss + a permanent write-freeze via the broken-frontmatter refusal). Task 12 therefore runs **immediately after Task 8 gates green** — Tasks 9–11 touch no on-disk format and follow after; scratch/fixture nexuses are unaffected.

#### Task 8: The seam flips — kind vocabulary + the five-arm predicate

**Files:**
- Modify: `src/shared/identity.ts`
- Test: `src/shared/identity.test.ts`

**Interfaces:**
```ts
export type ContentKind = 'page' | 'task' | 'event'
// `as const satisfies` keeps the literal types — a plain Record<ContentKind, string> widens
// PAGE_ID_KEY to string, which collapses pageFrontmatter's computed key into an index
// signature and blinds the type gate over the whole frontmatter surface (attack round 2, R2).
export const KIND_ID_KEY = {
  page: 'PageID',
  task: 'TaskID',
  event: 'EventID',
} as const satisfies Record<ContentKind, string>
export const PAGE_ID_KEY = KIND_ID_KEY.page
const ALL_KIND_KEYS = Object.values(KIND_ID_KEY)
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

export type Admission =
  | { state: 'member'; id: string }
  | { state: 'missing' }
  | { state: 'unknown'; reason: 'contradicting' | 'malformed' | 'dual' }

/** THE admission predicate (D-1/D-16) — the one multi-key reader, shared verbatim by the
 *  walk and adoption. Unknown is never stamped over, never surfaced. */
export function admitContentFile(
  fm: Record<string, unknown>,
  expected: ContentKind,
): Admission {
  const present = ALL_KIND_KEYS.filter((k) => fm[k] !== undefined)
  if (present.length > 1) return { state: 'unknown', reason: 'dual' }
  if (present.length === 0) return { state: 'missing' }
  const raw = fm[present[0]]
  if (typeof raw !== 'string' || !ULID_RE.test(raw))
    return { state: 'unknown', reason: 'malformed' }
  if (present[0] !== KIND_ID_KEY[expected])
    return { state: 'unknown', reason: 'contradicting' }
  return { state: 'member', id: raw }
}
```
`contentId(fm)` flips to kind-blind-over-kind-keys, deliberately WITHOUT shape validation (shape belongs to the admission predicate; keeping `contentId` lenient keeps Task 6's `isUlid` gate at the banner call site live — attack round 2, M9):
```ts
export function contentId(fm: Record<string, unknown>): string | undefined {
  const present = ALL_KIND_KEYS.filter((k) => fm[k] !== undefined)
  if (present.length !== 1) return undefined
  const v = fm[present[0]]
  return typeof v === 'string' && v.length > 0 ? v : undefined
}
```

**Steps:**
- [ ] Write the failing admission matrix first — every arm: valid PageID in page context (member) · no key (missing) · `TaskID` in page context (unknown/contradicting) · `PageID: hello world`, numeric, empty, nested-map values (unknown/malformed) · `PageID` + `TaskID` together (unknown/dual) · case variant `pageid:` (missing — keys are exact) · legacy `id:` (missing — D-3, no synonym).
- [ ] vitest → FAIL; implement; vitest → PASS. Task 7's fixture still green (missing ⇒ adoptable path unchanged).
- [ ] Commit: `feat(identity): kind-stamped keys + the five-arm admission predicate`

#### Task 9: The folder-kind resolver + registration oracle

**Files:**
- Create: `src/main/folderKind.ts` · Test: `src/main/folderKind.test.ts`
- Modify: `src/main/identity.ts`-adjacent read: `src/main/readNexus.ts` (identity read at `:435-443` already loads `nexus.json` — expose `agenda_singletons` off it)

**Interfaces:**
```ts
// src/main/folderKind.ts
export type FolderKind =
  | 'collection' | 'set'
  | 'tasks-singleton' | 'events-singleton'
  | 'unknown'
export interface AgendaRegistration { tasks?: string; events?: string }

/** Folder-declared kind, depth-agnostic. An agenda config only counts where its sidecar id
 *  matches the registration (D-8) — anywhere else the folder is Unknown (inert). */
export async function resolveFolderKind(
  absDir: string,
  depth: 'root' | 'nested',
  reg: AgendaRegistration,
): Promise<FolderKind>
```
Resolution: read `_taskconfig.json`/`_eventconfig.json` presence; if present, read its `id` — match against `reg` ⇒ the singleton kind; no match/duplicate/nested-config ⇒ `'unknown'`. **A folder carrying both an agenda config AND a container sidecar ⇒ `'unknown'`** (no arm guesses between them). Else root + `_pagecollection.json` ⇒ `'collection'`; nested ⇒ `'set'` (the positional law for the page world is unchanged); root without collection sidecar ⇒ `'unknown'`. Cost: ≤2 extra `pathExists` per folder — same order as the root loop's existing checks (B-9 held).

**Steps:**
- [ ] Failing tests: registered singleton at root (kind) · unregistered config at root (unknown) · config nested in a collection (unknown — the A-7 nested-folder hole closes) · duplicate config folder whose id ≠ registration (unknown) · agenda config + collection sidecar together (unknown) · plain nested folder (set).
- [ ] Implement; PASS. Retire both remaining divergent detections onto it: `readNexus.ts:487-492`'s root checks and `adopt.ts:105-110`'s skip both call the resolver (the third divergent site died with `collectAgenda` in Task 2).
- [ ] All four gates green.
- [ ] Commit: `feat(identity): the folder-kind resolver — one depth-agnostic classification owner`

#### Task 10: Registration + creation-seed

**Files:**
- Modify: `src/main/identity.ts` (`ensureIdentity`, `:15-29`) · `src/shared/types.ts` (nexus identity type) · Test: extend `src/main/identity.test.ts`

**Seed timing (resolves the recreate-conflict):** the seed runs ONLY on `ensureIdentity`'s **create** branch — a brand-new nexus gets `Tasks/` + `Events/` folders, minimal identity-only configs (`{ id }` via `writeSidecar`), and `nexus.json` written with `agenda_singletons: { tasks, events }` in the same stroke. An **existing** nexus (id already present) is never re-seeded — Nathan's Task-4 deletions stay deleted; his nexuses gain their registered pair at the Agenda Rethink, not before.

**Steps:**
- [ ] Failing tests: fresh nexus open → both folders + configs + registration exist, ids match; second open → byte-identical (idempotent, no re-seed); existing nexus without the pair → untouched.
- [ ] Implement; PASS; gates green.
- [ ] Commit: `feat(identity): singleton registration — seeded at nexus creation, inert everywhere else`

#### Task 11: Adoption + walk enforcement

**Files:**
- Modify: `src/main/adopt.ts` (predicate-driven stamping; singleton stamping, flat) · `src/main/readNexus.ts` (`readPageRecord`/`readDirectPages` admit through the predicate; Unknown files excluded from the tree) · `src/main/index.ts` (the `adopting` flag → counter; locate via `grep -n "adopting" src/main`) · `src/main/mutate.ts` (`movePage`/`moveSet` backstop)

**Steps:**
- [ ] Walk: `readPageRecord` gains the expected-kind param (its callers know their folder's kind from the resolver); an `unknown` admission returns null and the file is skipped exactly like an unreadable page (`readDirectPages:245`'s existing filter) — never rendered, never indexed.
- [ ] Adoption: `stampPage(absFile, kind)` stamps `KIND_ID_KEY[kind]` on `missing` ONLY (any `unknown` reason ⇒ untouched); `stampTree` consumes the resolver. Two explicit clauses for the singleton branch (review R7 — the naive "remove the skip" corrupts it): **the singleton folder itself is never container-stamped** (`stampFolder` never runs against it — its agenda config already holds its id), and only its **direct** `.md` children stamp `TaskID`/`EventID` — no subfolder recursion, nothing stamped below.
- [ ] Write-sweep admission (rounds 1+2, R5/R3/R5b): the nexus-wide `.md` write sweeps gate on **`admitContentFile(fm, 'page').state !== 'unknown'`** before rewriting — admitting `member` AND `missing`, because an ID-less page must still be swept (the documented Remove-Property law: "an id-less page still gets stripped, its value just isn't restorable"; a member-only gate would leak the value Remove exists to clear). The gated sweeps, complete: the link cascade (Task 6's seam gate upgrades to this check) · the property sweeps (`removeProperty.ts:45/:115`, `deleteProperty.ts:71`, `optionOps.ts:192` via `cascadePages`) · **`sweepContextRoots`' `.md` loop (`contextCascade.ts:77`)** — the fifth nexus-wide writer, whose Context rename/delete rewrites would otherwise touch Unknown files. A `TaskID:` file planted in a Collection is untouched by link renames, property ops, AND context cascades; an ID-less page keeps full sweep coverage.
- [ ] Plumb the registration into adoption (round 2, R4): `stampAdopted` gains the registration input (read `nexus.json`'s `agenda_singletons` in `prepareOpenedNexus` and pass it through, mirroring how `excluded` already flows) — without it the resolver answers `'unknown'` for every agenda folder inside adoption and the singleton stamping + re-homing never fire.
- [ ] The walk's nested read path consults the resolver too (round 2, M6): `readChildSets` skips a subfolder whose resolved kind is not `'set'` — a nested agenda-config folder renders as nothing, not as a Set, closing A-7's hole on the READ path, not only in adoption.
- [ ] The `adopting` boolean becomes a counter (increment on entry, decrement in finally; suppression active while > 0).
- [ ] Singleton re-homing (D-8 — the registered id IS its record, no last-known-state system involved): during the adoption pass, a folder whose config sidecar id matches the registration but which sits NESTED (the resolver returns the singleton kind at `'nested'` depth) is moved back to the nexus root — one `rename`, collision-refused, echo-suppressed via `recordWrite` on both ends.
- [ ] `removeProperty`'s pre-strip guard turns positive (review F5): count kind-ID-key *presence* across the file loop independently of value presence; refuse the strip (`fail('operation-failed', …)`) only when the file set is non-empty and no file carried a readable identity.
- [ ] Backstop: in `mutate.ts:491-518`, after resolving `dst`, `resolveFolderKind(dst, …)` must return `'collection' | 'set'` or the move fails `('invalid-path', 'Pages live in Collections and Sets.')` — nothing more (C-2a minimal).
- [ ] Failing tests → implement → PASS: the Unknown matrix on disk (contradicting/malformed/dual/nested-config/unregistered-config fixtures — each invisible in the walked tree AND byte-unmodified after adoption); flat-singleton stamping; the nested-registered-singleton re-home; the positive strip guard; the backstop refusal.
- [ ] All four gates green.
- [ ] Commit: `feat(identity): admission enforced at walk + adoption; the move backstop lands`

#### Task 12: The manual migration moment (Nathan, app closed)

**Steps:**
- [ ] Confirm Tasks 8–11 gated green and committed; app closed on both nexuses.
- [ ] **Pre-flight — the non-ULID census (attack C1; verified live):** enumerate every `.md` whose frontmatter `id:` value fails the ULID shape across both nexuses and present the list to Nathan for a per-file ruling BEFORE the rename. Known today: **8 pages in `NexusOS/Knowledge/II. Research/` carry hand-authored slugs** (`research-bizops`, `research-technical-pm`, `research-product-sando`, `research-marketing-sando`, + 4 more `research-*`). Blanket-renamed, they'd become malformed `PageID:` values ⇒ Unknown ⇒ silently invisible; skipped, they'd re-stamp fresh ids and detach. The two clean rulings: mint real ULIDs into them as part of the migration, or strip the key so they adopt fresh (accepting new identities). Neither happens silently.
- [ ] Nathan runs the rename across each nexus's pages — frontmatter `id:` → `PageID:`, first occurrence inside the opening frontmatter block only:
```bash
# Dry run first — list what would change:
find "<nexus>" -name "*.md" -not -path "*/.*" \
  -exec perl -00 -ne 'print "$ARGV\n" if /\A---\n(?:(?!---).*\n)*?id:/' {} +
# Then apply — idempotent: a file already carrying PageID: is skipped, never double-keyed
# (round 2, C1: a re-run or an adoption-stamped file must not gain a duplicate key):
find "<nexus>" -name "*.md" -not -path "*/.*" \
  -exec perl -0pi -e 'next if /^PageID:/m; s/\A(---\n(?:(?!---).*\n)*?)^id:/${1}PageID:/m' {} +
# Verify: zero files carrying both keys —
grep -rlZ "^PageID:" "<nexus>" --include="*.md" | xargs -0 grep -l "^id:" | wc -l   # expect 0
```
- [ ] Disclosed consequence stands (D-3): an un-migrated page reads as missing-key and re-stamps under a fresh identity, detaching pins/tabs/asset folders.
- [ ] First launch after migration: verify against the TEST nexus first, NexusOS only after test passes.

#### Task 13: Docs reconciliation — identity half

**Files:** `Features/Architecture.md` (kind-authority paragraph, principle-header storage clause, adoption skip clause, "no reserved-name blocklist") · `PommoraPRD.md` (classification claims, `id` definition) · `Features/Structure.md` + project `CLAUDE.md` (kind law) · `Features/Connections.md` (cascade-gate description) · `Context.md` (the redundant-identity exemption + the named-step lesson carve-outs; the `adopting` debt resolved).

**Not here — landed with the code that falsified them:** `Features/Sidebar.md`, `Features/Navigation.md` (Task 2) and `Features/Agenda.md` (Task 3). Their claims die to Phase-1 *deletions*, not to the identity cutover, so they reconcile in those commits — a doc left false across two phases is deferred cleanup.

**Steps:**
- [ ] Rewrite each named claim to the durable new truth (replace, never amend); agenda-shape claims wait for the rethink.
- [ ] Reconcile against the Watchkeeper's docs ledger — every entry it accumulated closes here or in the commit that falsified it; nothing carries past this plan.
- [ ] Commit docs with the phase's final code state.

#### Gate 3 — the named cutover verification
- [ ] All four gates green.
- [ ] Fixtures: ID-less (adoptable — Task 7's, still green under `PageID` — AND still covered by the write sweeps: a Remove-Property run strips an ID-less page's value, round 2 R5) · migrated (member) · the full Unknown matrix (invisible in the tree + untouched by adoption AND by a link rename, a property removal, and a context rename — the five gated sweeps) · remove-property snapshot capturing under kind keys (the F5 positive guard: refuse only when a non-empty file set carried no readable identity) · zero dual-key files post-migration (Task 12's verify command).
- [ ] Live launch, test nexus: pages resolve; pins/tabs survive; a hand-planted `TaskID:` file in a Collection is invisible and untouched; a fresh scratch nexus creates + registers its singleton pair.

---

### Sequenced After (not this plan)

1. **The Record Plan** (D-17): the shared last-known-state mechanism — structural revert + trash restore, one design.
2. **The Agenda Rethink**: shape, fields, surfaces, CRUD, ordering — from the De-Scaffolding clean slate, with identification already total (existing nexuses receive their seeded singletons here).
