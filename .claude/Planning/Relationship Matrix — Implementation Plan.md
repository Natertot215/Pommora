## Relationship Matrix — Implementation Plan

### Context

`nexus.db` records every content relationship across three tables of near-identical shape — `mentions(path, title)`, `heading_mentions(path, title, heading)`, and `memberships(path, key, title)` — and the extraction that fills them discards where each relationship came from. `Core/Connections/scan.ts` walks wikilinks, page embeds, and markdown links into one `Set`, and `Core/Index/indexSeed.ts` folds frontmatter Link-property targets into that same set, so a body link, an embed, and a property value arrive at storage indistinguishable from one another. This plan replaces the three tables with `matrix_nodes(path, kind, target, qualifier, count)`, where `kind` names the relationship's origin and `count` carries its occurrence tally, and rebuilds extraction around a single walker that reports both.

The plan touches `Desktop/Store/ddl.ts`, `Desktop/Store/stores.ts`, `Core/Platform/stores.ts`, `Core/Connections/scan.ts`, `Core/Index/indexSeed.ts`, `Core/MarkdownPM/Engine/headingScan.ts`, and the two test doubles in `Core/Testing/`. The `headings` and `page_values` tables are untouched, no query signature changes, and no consumer of the index is rewritten. No graph view, backlinks panel, or read method serving either is built here.

### Summary

Pommora's index knows which pages relate to which, but not how. A link in a sentence, a link inside a footnote, a link held in a page's properties, an embedded page, and a Space a page is filed under are all recorded the same way, so nothing downstream can tell them apart or treat one as more meaningful than another.

This replaces the three storage tables with one that records the kind of each relationship and how many times it occurs. Nothing changes on screen and nothing changes in the files — the index rebuilds itself on first launch, as it does whenever its shape moves. What it buys is the ability for a future graph view to weight a footnote mention differently from a body link, and for a backlinks panel to become a matter of wiring rather than a matter of new plumbing.

#### Constraints

- Gates, from the repo root with `set -o pipefail`: `npm run typecheck` · `npm run test` · `npm run lint` — each exits 0; read each tail rather than trusting an exit code through a pipe. Biome formats on write (single quotes, no semicolons); an Edit failing on whitespace means re-read and retry; a shell-driven edit is repaired by `npm run format`.
- Comments are `//` line comments and appear only where a boundary needs stating. A wrapped block comment fails `npm run lint`.
- **Settled rulings, never re-litigated:** targets stay normalized titles resolved at read time, never paths; folder hierarchy is read from `NexusTree` and `Core/Nexus/treeIndex.ts`, never stored in the database; weights are graph-view configuration and no weight column exists; property-value sharing is derived from `page_values` at read time and is not a `matrix_nodes` row; a link inside a footnote definition emits both its own syntax row and a `citation` row; an unresolved target is stored exactly as a resolved one is; the table is named `matrix_nodes`; `count` is kept although nothing reads it yet.
- **Override of a prior ruling, granted:** `Heading Links — Implementation Plan.md` names `mentions(path, title)` and `queryMentions(title)` frozen interfaces, and its decision **B-1** ratified `heading_mentions` as a separate table. Nathan has overridden the storage half. `queryMentions(title)` keeps its contract and every caller is untouched; B-1's operative guarantee — a heading consult runs only against a ready index and never takes the page cascade's full-corpus fallback — is preserved, because `queryHeadingMentions` keeps its null-on-no-index behavior and gains no fallback.
- **Frozen interfaces:** every method on `ContentIndexStore` keeps its exact signature and return type. `queryMentions`, `queryHeadingMentions`, `queryKeyHolders`, `queryMembers`, `readHeadings`, `readIndexedStat`, `readIndexedStats`, and the five path mutators are not touched by any task. `mentionsTitle(body, key)` keeps its two-argument predicate signature. `Core/Contract/bridge.ts` gains no channel.
- **Never delete:** `Core/Connections/scan.ts` exports `sectionRunsIn` (called standalone by `Core/MarkdownPM/decorations.ts` and `Core/Connections/rewrite.ts`) and `mentionsTitle` (called by `Core/Nexus/cascade.ts` and `Core/Tiles/tilesFile.ts`). `Core/MarkdownPM/Engine/headingScan.ts` keeps `headingOutline(doc: string)` — `Core/MarkdownPM` calls it on a raw string in several places.
- The host owns the machine: Core reaches it only through `Core/Platform`. No task adds a Node or Electron call to Core.
- `headings` and `page_values` keep their exact shape, contents, and queries.
- The index is derived and disposable. Nothing migrates; the generation step drops and reseeds.

#### Baseline

- Gates: green at `ef88befe3`, confirmed at ratification — typecheck clean across all seven projects, 403 files / 4998 tests passing, Biome clean over 1210 files.
- `wc -l Core/Connections/scan.ts` → 127 — two walkers become one generator plus two thin re-expressions, then the re-expressions retire
- `wc -l Core/MarkdownPM/Engine/headingScan.ts` → 105 — gains `headingOutlineOf`
- `wc -l Core/MarkdownPM/Engine/docScan.ts` → 112 — gains one returned field, loses the memo block to `scanCache.ts`
- `grep -rn "codeMaskOf" Core Desktop --include=*.ts --include=*.tsx` → 6 (definition, one internal caller, one regression pin's import and call, and `docScan.ts`'s import and call); the hand-rebuilt copies drop by one as `scanDoc` returns its own mask
- `grep -rn "pommora/uix" Core/MarkdownPM/Engine/docScan.ts` → 1 — retires to 0
- `grep -c "UIX/" Core/Contract/engineGraph.test.ts` → 5 (the filter line plus the four-leaf list) — unchanged; the plan's whole engine-surface obligation is that this figure does not move
- `wc -l Desktop/Store/ddl.ts` → 96 — loses three tables, three indexes, and the dead `truncateIndex`; gains one table and one index
- `wc -l Desktop/Store/stores.ts` → 241 — three insert loops become one
- `wc -l Core/Platform/stores.ts` → 106 — `Membership` and the `HeadingMention` import leave, `MatrixKind` and `MatrixNode` arrive
- `wc -l Core/Index/indexSeed.ts` → 217 — grows; this is where the plan's weight lands, and the honest expectation is roughly flat overall rather than negative
- `wc -l Core/Testing/memoryStores.ts` → 307 — five maps become three and the hand-unrolled rekey blocks collapse to one helper
- `wc -l Core/Testing/storesContract.ts` → 365 — fixture literals reshape behind two builders, assertions hold
- `grep -c "mentions:\|headingMentions:\|memberships:" Core/Testing/storesContract.ts` → 27 — retires to 0
- `grep -c "mentions:\|headingMentions:\|memberships:" Core/Index/contentIndex.test.ts` → 16 — retires to 0
- `grep -c "mentions:\|headingMentions:\|memberships:" Core/Index/indexMaintenance.test.ts` → 3 — retires to 0
- `grep -c "expect(" Core/Connections/scan.test.ts` → 37 — grows with kind, citation, and count cases
- `grep -n "INDEX_GENERATION = " Desktop/Store/ddl.ts` → `3:export const INDEX_GENERATION = 5` — steps to 6
- `grep -rn "truncateIndex" Core Desktop Sync Mobile` → 1, the definition alone — retires to 0

**START:** 2026-09-17T23:47:20Z
**END:** <same command, run as the report is given>

#### Implementation Process

- [x] **Phase 1** — The Unified Walker
  - [x] Task 1.1 — `linksIn`, and the two extractors re-expressed over it
  - [x] Task 1.2 — `headingOutlineOf`
  - [x] Task 1.3 — The scan cache leaves `docScan`
  - [x] Review Checkpoint
- [x] **Phase 2** — The Matrix Table
  - [x] Task 2.1 — The schema, the generation step, and the retired-name drop
  - [x] Task 2.2 — The Core seam
  - [x] Task 2.3 — The SQLite store
  - [x] Task 2.4 — The in-memory store
  - [x] Task 2.5 — The producer
  - [x] Task 2.6 — The contract suite and the index tests
  - [x] Review Checkpoint
- [x] `[Stop: Nathan renames a page whose links include a footnote link and a name shared with a Space, and confirms every link rewrote]`
- [x] **Phase 3** — Reconciliation
  - [x] Task 3.1 — The feature documents
  - [x] Task 3.2 — The pending plans

### Phase 1 — The Unified Walker

**GOAL:** Replace the two independent link walkers in `Core/Connections/scan.ts` with one generator that reports a syntax, a target, a qualifier, and a position, and prepare the two `Core/MarkdownPM/Engine` entry points Phase 2's producer reads. This phase touches no storage and no database, and every behavior it changes is none — which is what makes it a clean baseline for Phase 2.

#### Task 1.1

**TASK:** Add `linksIn` as the one walker over all three link syntaxes plus bare `§` runs, and rebuild `extractMentions`, `extractHeadingMentions`, and `mentionsTitle` on top of it without changing what any of them return.

**FILES:** `Core/Connections/scan.ts`

**NOW**

`extractMentions` builds its own `codeMask` and walks `pageLinkPattern`, `pageEmbedPattern`, and `markdownLinkRegex` into a `Set<string>`. `extractHeadingMentions` builds a second `codeMask` and walks `pageLinkPattern` and `markdownLinkRegex` plus `sectionRunsIn` into a `HeadingMention[]`, deduplicating through a `seen` set. `mentionsTitle` builds a whole `Set` to answer one boolean.

```ts
export function extractMentions(body: string, ownTitle = ''): Set<string> {
  const out = new Set<string>()
  if (!body.includes('[[') && !body.includes('](')) return out
  const inCode = codeMask(body)
  const own = normalizeTitle(ownTitle)
  const add = (raw: string | null): void => {
    const key = titleKey(raw, own)
    if (key) out.add(key)
  }
  for (const m of body.matchAll(pageLinkPattern())) {
    const g = m.groups
    if (!g || (m.index !== undefined && inCode(m.index))) continue
    if (g.page === '' && !g.heading) continue
    add(g.heading === undefined ? titleOf(g.page) : g.page)
  }
  for (const m of body.matchAll(pageEmbedPattern())) {
    if (m.index !== undefined && inCode(m.index)) continue
    add(m.groups?.page ?? null)
  }
  for (const m of body.matchAll(markdownLinkRegex())) {
    if (m.index !== undefined && inCode(m.index)) continue
    add(targetTitle(m[2]))
  }
  return out
}

export function mentionsTitle(body: string, normalizedKey: string): boolean {
  return normalizedKey !== '' && extractMentions(body).has(normalizedKey)
}

export interface HeadingMention {
  title: string
  heading: string
}

export function extractHeadingMentions(
  body: string,
  ownTitle: string,
  outline: readonly string[] = [],
): HeadingMention[] {
  // second walk, second codeMask, `seen` dedupe over `${title}#${heading}`
}
```

**CHANGE**

- [x] Add `LinkSyntax`, `LinkHit`, and `linksIn` exactly as the AFTER block spells them.
- [x] Preserve the page-title asymmetry rather than unifying it: `extractMentions` applies `titleOf` only when the link names no heading, while `extractHeadingMentions` uses the raw page. They are not equivalent — `[[Foo\#Bar]]` parses as `page: 'Foo\'` with a heading present, because `pageLinkPattern` admits a backslash in the page group and terminates it on `#`. Carry the conditional into `linksIn` unchanged.
- [x] Re-express `extractMentions` and `extractHeadingMentions` as thin collectors over `linksIn`, and `mentionsTitle` as an early-exit loop. Keep all three exported and keep every signature identical; Task 2.5 retires the two extractors once the producer reads `linksIn` directly.
- [x] Widen the early-out to `§`, but gate that term on `outline.length > 0` — the only condition under which a `§` run can yield. Nathan's own writing uses `§Heading` heavily, so an ungated term would let a large share of linkless bodies past the gate and into three `matchAll` passes before the run loop bails.
- [x] Take `inCode` as optional and resolve it **inside** the body, never as a default parameter. A generator initializes its parameter bindings at call time, before the body's first statement runs, so `inCode: CodeMask = codeMask(body)` would build a full-document mask for every call including the ones that return at the gate. `Core/Nexus/cascade.ts` runs `mentionsTitle` over the entire corpus whenever `queryMentions` returns null, and `Core/Tiles/tilesFile.ts` runs it over every markdown tile file unconditionally — a default parameter here is the "never expensive work on every X" rule broken on the hottest path this plan touches.
- [x] Leave `sectionRunsIn` and `frontmatterMentions` untouched.

**AFTER**

```ts
// `![[ ]]` embeds are NOT connections, but the cascade still sweeps them so a rename reaches them — one walker answers for every syntax, and `syntax` keeps them apart for a reader that cares.

import { normalizeTitle, pageEmbedPattern, pageLinkPattern, titleOf } from './connections'
import { markdownLinkRegex, targetFragment, targetTitle } from './links'
import { readLink } from './linkValue'
import { codeMask, type CodeMask } from '../MarkdownPM/Engine/markdownCode'

export interface SectionRun {
  from: number
  to: number
  heading: string
}

const wordChar = /[\p{L}\p{N}_]/u

function titleKey(raw: string | null, own: string): string {
  if (raw === null) return ''
  return raw === '' ? own : normalizeTitle(raw)
}

// `sectionRunsIn` keeps its current body verbatim.
export function sectionRunsIn(
  text: string,
  headings: readonly string[],
  inCode: CodeMask,
  sorted = false,
): SectionRun[] {
  // unchanged
}

export type LinkSyntax = 'wiki' | 'embed' | 'markdown' | 'section'

/** One occurrence. `target` and `qualifier` are normalized keys; `qualifier` is '' when the link names no heading. `at` is the offset into `body`, which the indexer resolves to a line. */
export interface LinkHit {
  syntax: LinkSyntax
  target: string
  qualifier: string
  at: number
}

/** The gate in front is on SYNTAX rather than any title: a substring test would break the NFC invariant `normalizeTitle` exists for, and an NFD-composed body would be skipped silently. `inCode` is resolved inside the body, never as a default parameter: a generator binds its parameters at call time, so a default would build a whole-document mask even for the calls that return at the gate. */
export function* linksIn(
  body: string,
  ownTitle = '',
  outline: readonly string[] = [],
  inCode?: CodeMask,
): Generator<LinkHit> {
  const runs = outline.length > 0 && body.includes('§')
  if (!body.includes('[[') && !body.includes('](') && !runs) return
  const mask = inCode ?? codeMask(body)
  const own = normalizeTitle(ownTitle)
  for (const m of body.matchAll(pageLinkPattern())) {
    const g = m.groups
    const at = m.index
    if (!g || at === undefined || mask(at)) continue
    // `[[]]` matches with an empty page and no heading; it names nothing, and never the page itself.
    if (g.page === '' && !g.heading) continue
    // `titleOf` only where the page half ends the link: with a heading present a trailing backslash is the title's own, not a table cell's escaped pipe.
    const target = titleKey(g.heading === undefined ? titleOf(g.page) : g.page, own)
    if (!target) continue
    const qualifier = g.heading === undefined ? '' : normalizeTitle(titleOf(g.heading))
    yield { syntax: 'wiki', target, qualifier, at }
  }
  for (const m of body.matchAll(pageEmbedPattern())) {
    const at = m.index
    if (at === undefined || mask(at)) continue
    const target = titleKey(m.groups?.page ?? null, own)
    if (target) yield { syntax: 'embed', target, qualifier: '', at }
  }
  for (const m of body.matchAll(markdownLinkRegex())) {
    const at = m.index
    if (at === undefined || mask(at)) continue
    const target = titleKey(targetTitle(m[2]), own)
    if (!target) continue
    yield { syntax: 'markdown', target, qualifier: normalizeTitle(targetFragment(m[2])), at }
  }
  if (!runs || own === '') return
  for (const run of sectionRunsIn(body, outline, mask))
    yield { syntax: 'section', target: own, qualifier: normalizeTitle(run.heading), at: run.from }
}

export function extractMentions(body: string, ownTitle = ''): Set<string> {
  const out = new Set<string>()
  for (const hit of linksIn(body, ownTitle)) out.add(hit.target)
  return out
}

export function mentionsTitle(body: string, normalizedKey: string): boolean {
  if (normalizedKey === '') return false
  for (const hit of linksIn(body)) if (hit.target === normalizedKey) return true
  return false
}

export interface HeadingMention {
  title: string
  heading: string
}

/** Every link that names a heading, keyed the way the index stores it; a bare fragment or a bare `§` run names the containing page. */
export function extractHeadingMentions(
  body: string,
  ownTitle: string,
  outline: readonly string[] = [],
): HeadingMention[] {
  const seen = new Set<string>()
  const out: HeadingMention[] = []
  for (const hit of linksIn(body, ownTitle, outline)) {
    // An embed always yields an empty qualifier, so this one test rejects both.
    if (hit.qualifier === '') continue
    const key = `${hit.target}#${hit.qualifier}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ title: hit.target, heading: hit.qualifier })
  }
  return out
}

/** A Link property holds a connection as its whole value, so a rename reaching only bodies would leave it pointing at nothing. */
export function frontmatterMentions(values: Record<string, unknown>): Set<string> {
  // unchanged
}
```

**VERIFY**

- [x] `npm run test` passes with **zero edits** to `Core/Connections/scan.test.ts`. That file pins both extractors, and this task is behavior-preserving by construction — a red assertion is a defect in the re-expression, not churn.
- [x] `extractMentions` yields no `§` run: its callers pass no outline, and `linksIn` returns before the run loop when `outline` is empty.
- [x] `mentionsTitle` returns at the first match. Confirm by reading the loop, not by timing it.
- [x] **No mask is built for a body that returns at the gate.** Prove it: call `linksIn` on a linkless body with a counting stub in place of `codeMask` and confirm the count stays 0. A generator's default parameters evaluate at call time, so this regresses silently if the mask moves back into the signature — and `Core/Nexus/cascade.ts` runs `mentionsTitle` over the whole corpus on the no-index path.
- [x] A body holding `§` but no link syntax returns at the gate when no outline is passed: `runs` is false, and the three `matchAll` passes never run.
- [x] `[[Foo\#Bar]]` yields `target` `foo\`, matching what `extractHeadingMentions` records today.
- [x] Run all three gates with `set -o pipefail` and read each tail.

#### Task 1.2

**TASK:** Add a heading-outline entry point that accepts a prepared scan, so Phase 2's producer derives its outline from the same scan it derives everything else from.

**FILES:** `Core/MarkdownPM/Engine/headingScan.ts`

**NOW**

```ts
/** `headingSections` drops body-less headings; an outline still lists them, or two consecutive headings would show only the second. */
export function headingOutline(doc: string): OutlineHeading[] {
  const src = headingSrc(doc)
  return scanHeadings(src).map((h) => ({
    from: src.lineStarts[h.idx],
    level: h.level,
    text: h.text,
    key: h.key,
  }))
}
```

**CHANGE**

- [x] Split the body into `headingOutlineOf(src)` and keep `headingOutline(doc)` as the string entry point over it.
- [x] Do not export `HeadingSrc`. `headingSections(src: HeadingSrc)` is already exported against the private type and every caller works, because a caller's argument arrives by inference rather than by annotation.

**AFTER**

```ts
/** `headingSections` drops body-less headings; an outline still lists them, or two consecutive headings would show only the second. */
export function headingOutlineOf(src: HeadingSrc): OutlineHeading[] {
  return scanHeadings(src).map((h) => ({
    from: src.lineStarts[h.idx],
    level: h.level,
    text: h.text,
    key: h.key,
  }))
}

export const headingOutline = (doc: string): OutlineHeading[] => headingOutlineOf(headingSrc(doc))
```

**VERIFY**

- [x] `headingOutline` returns identically for every input the existing suite covers — this task moves an entry point and computes nothing new.
- [x] `DocScan` satisfies `HeadingSrc` structurally, which Phase 2 depends on: `DocScan` carries `lines: string[]`, `lineStarts: number[]`, `headings: boolean[]`, and `fences: (FenceInfo | undefined)[]`, each assignable to the `readonly` members `HeadingSrc` declares. The file's own comment at the `HeadingSrc` declaration already states this; confirm it still reads true.
- [x] `HeadingSrc` is not exported and `npm run typecheck` is green.

#### Task 1.3

**TASK:** Move the document-scan memo cache out of `docScan.ts` into its own module, so the pure derivations carry no UIX import and the engine's pinned leaf list stays as it is.

**FILES:** `Core/MarkdownPM/Engine/docScan.ts`, `Core/MarkdownPM/Engine/scanCache.ts`, `Core/MarkdownPM/docCache.ts`, `Core/MarkdownPM/Engine/listDragModel.ts`, `Core/MarkdownPM/Engine/subfieldStats.ts`, and the eight test files that import `scanOf`

**DEPENDENCIES:** Task 2.5 imports `scanDoc` into `Core/Index`, which is what makes this necessary.

**NOW**

`docScan.ts` opens with `import { capSet } from '@pommora/uix/Utilities/capMap'` and uses it at exactly one place — inside `perText`, the four-slot memo helper at the bottom of the file. `scanDoc` and every other derivation in the file never touch it.

`Core/Contract/engineGraph.test.ts` asserts the host-run half of Core reaches **exactly four** UIX leaves: `chords.ts`, `colors.ts`, `clamp.ts`, `moveItem.ts`. The moment `Core/Index/indexSeed.ts` imports `scanDoc`, `capMap.ts` becomes a fifth and that gate goes red.

```ts
// docScan.ts, first line and last block
import { capSet } from '@pommora/uix/Utilities/capMap'
// …
/** A few texts rather than one, because more than one page can be on screen and a single slot would let their renders evict each other. */
const TEXT_SLOTS = 4
export function perText<T>(derive: (text: string) => T): (text: string) => T {
  const held = new Map<string, T>()
  return (text) => {
    const hit = held.get(text)
    if (hit !== undefined) return hit
    const v = derive(text)
    capSet(held, text, v, TEXT_SLOTS)
    return v
  }
}

export const scanOf = perText(scanDoc)
```

**CHANGE**

- [x] Create `Core/MarkdownPM/Engine/scanCache.ts` holding `TEXT_SLOTS`, `perText`, and `scanOf`, moved verbatim with their comment.
- [x] Delete the `capSet` import and that whole block from `docScan.ts`. Nothing else in the file referenced either.
- [x] Retarget every `scanOf` and `perText` import to `./scanCache`. Three production files — `Core/MarkdownPM/docCache.ts`, `Core/MarkdownPM/Engine/listDragModel.ts`, `Core/MarkdownPM/Engine/subfieldStats.ts` — and eight test files. `subfieldStats.ts` imports both `perText` and `scanOf` alongside `scanDoc` and `lineIndexAt`, so its import splits across the two modules.
- [x] Change nothing about what either function computes. This is a move, not a rewrite.

**AFTER**

```ts
// Core/MarkdownPM/Engine/scanCache.ts — new file

import { capSet } from '@pommora/uix/Utilities/capMap'
import { scanDoc } from './docScan'

/** A few texts rather than one, because more than one page can be on screen and a single slot would let their renders evict each other. */
const TEXT_SLOTS = 4

export function perText<T>(derive: (text: string) => T): (text: string) => T {
  const held = new Map<string, T>()
  return (text) => {
    const hit = held.get(text)
    if (hit !== undefined) return hit
    const v = derive(text)
    capSet(held, text, v, TEXT_SLOTS)
    return v
  }
}

export const scanOf = perText(scanDoc)
```

```ts
// Core/MarkdownPM/Engine/docScan.ts — the import line goes, and the file ends at `inSealedBlockAt`.
// Every derivation above it is untouched.
```

**VERIFY**

- [x] `grep -n "pommora/uix" Core/MarkdownPM/Engine/docScan.ts` → no result.
- [x] `npm run test` green, including `Core/Contract/engineGraph.test.ts`, whose four-leaf assertion is unchanged. The gate stays pinned at four because the engine graph reaches `docScan.ts` and never `scanCache.ts`.
- [x] `grep -rn "perText\|scanOf" Core --include=*.ts --include=*.tsx` shows every import resolving to `scanCache`, and `docScan` exporting neither.
- [x] `Core/MarkdownPM/docCache.test.ts` asserts `scanOf(body)` and the per-doc cache agree; it passes unedited but for its import line.

#### Review Checkpoint

- [x] Gates green from clean across Phase 1's range, each tail read.
- [x] `Core/Contract/engineGraph.test.ts` is green and its four-leaf list is unedited. Phase 2 adds a host-side importer of `docScan`, and this phase is what keeps that from widening the engine's declared UIX surface.
- [x] No test file changes beyond the `scanOf` import line: `git diff` over the range shows `Core/Connections/scan.test.ts` untouched.
- [x] A page rename still rewrites body links, embeds, and heading-naming links, exercised in the running app rather than asserted — the walker is now the single source for all three.
- [x] Diff size reported, comments excluded.

### Phase 2 — The Matrix Table

**GOAL:** Replace the three tables with `matrix_nodes`, reshape both store implementations, and rewrite the producer to emit five kinds with occurrence counts and the citation overlay. This phase is one unit because `PageIndexEntry`'s shape, both stores, the producer, and every fixture must move together or nothing typechecks.

#### Task 2.1

**TASK:** Replace the three table definitions with `matrix_nodes`, step the index generation, teach `rebuildIndex` to drop the retired names — which nothing currently does, because no prior generation has ever removed a table — and delete the dead `truncateIndex` export.

**FILES:** `Desktop/Store/ddl.ts`

**DEPENDENCIES:** Tasks 2.2 through 2.6 turn `npm run typecheck` red until all six land; the phase commits as one.

**NOW**

```ts
export const INDEX_GENERATION = 5

  CREATE TABLE IF NOT EXISTS mentions (
    path TEXT NOT NULL,
    title TEXT NOT NULL,
    PRIMARY KEY (path, title)
  );
  CREATE INDEX IF NOT EXISTS mentions_by_title ON mentions (title);
  CREATE TABLE IF NOT EXISTS headings ( ... );
  CREATE TABLE IF NOT EXISTS heading_mentions (
    path TEXT NOT NULL, title TEXT NOT NULL, heading TEXT NOT NULL,
    PRIMARY KEY (path, title, heading)
  );
  CREATE INDEX IF NOT EXISTS heading_mentions_by_target ON heading_mentions (title, heading);
  CREATE TABLE IF NOT EXISTS page_values ( ... );
  CREATE TABLE IF NOT EXISTS memberships (
    path TEXT NOT NULL, key TEXT NOT NULL, title TEXT NOT NULL,
    PRIMARY KEY (path, key, title)
  );
  CREATE INDEX IF NOT EXISTS memberships_by_title ON memberships (key, title);

export const INDEX_TABLES = [
  'mentions', 'headings', 'heading_mentions', 'page_values', 'memberships', 'indexed_files',
] as const

export function truncateIndex(db: Db): void {
  db.exec(INDEX_TABLES.map((table) => `DELETE FROM ${table};`).join(' '))
}

// A generation step drops the index tables outright, so a table whose shape changed is recreated rather than kept as it was.
export function rebuildIndex(db: Db): void {
  db.exec(INDEX_TABLES.map((table) => `DROP TABLE IF EXISTS ${table};`).join(' '))
  applySchema(db)
}
```

**CHANGE**

- [x] Step `INDEX_GENERATION` to `6`.
- [x] Delete the `mentions`, `heading_mentions`, and `memberships` definitions and their three indexes; put `matrix_nodes` and its one index where `mentions` stood so the DDL keeps its reading order. Leave `headings`, `page_values`, `indexed_files`, `meta`, `local_state`, and `sync` exactly as they are.
- [x] Replace the three names in `INDEX_TABLES` with `'matrix_nodes'`.
- [x] Add `RETIRED_TABLES` and have `rebuildIndex` drop it alongside `INDEX_TABLES`.
- [x] Delete `truncateIndex`. It has no caller anywhere in the live tree — `grep -rn "truncateIndex" Core Desktop Sync Mobile` returns only its own definition.

**AFTER**

```ts
import type { Db } from './driver'

export const INDEX_GENERATION = 6

const DDL = `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS local_state (
    scope TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (scope, key)
  );
  CREATE TABLE IF NOT EXISTS matrix_nodes (
    path TEXT NOT NULL,
    kind TEXT NOT NULL,
    target TEXT NOT NULL,
    qualifier TEXT NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (path, kind, target, qualifier)
  );
  CREATE INDEX IF NOT EXISTS matrix_nodes_by_target ON matrix_nodes (target, qualifier, kind);
  CREATE TABLE IF NOT EXISTS headings (
    path TEXT NOT NULL,
    heading TEXT NOT NULL,
    ordinal INTEGER NOT NULL,
    PRIMARY KEY (path, heading)
  );
  CREATE TABLE IF NOT EXISTS page_values (
    path TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (path, key)
  );
  CREATE INDEX IF NOT EXISTS page_values_by_key ON page_values (key);
  CREATE TABLE IF NOT EXISTS indexed_files (
    path TEXT PRIMARY KEY,
    mtime_ms REAL NOT NULL,
    size INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sync (
    path TEXT PRIMARY KEY,
    mtime_ms REAL NOT NULL,
    size INTEGER NOT NULL,
    hash TEXT NOT NULL,
    blob_sha TEXT NOT NULL,
    version INTEGER NOT NULL,
    base_bytes BLOB
  );`

export function applySchema(db: Db): void {
  db.exec(DDL)
}

export function readMeta(db: Db, key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function writeMeta(db: Db, key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value)
}

export const INDEX_TABLES = ['matrix_nodes', 'headings', 'page_values', 'indexed_files'] as const

// Names a generation has retired. `applySchema` only ever creates, so a table dropped from the schema is dropped from an existing database here or never.
const RETIRED_TABLES = ['mentions', 'heading_mentions', 'memberships'] as const

// A generation step drops every index table and every retired name outright, so a table whose shape changed is recreated and one whose rows moved elsewhere is gone.
export function rebuildIndex(db: Db): void {
  db.exec(
    [...INDEX_TABLES, ...RETIRED_TABLES].map((table) => `DROP TABLE IF EXISTS ${table};`).join(' '),
  )
  applySchema(db)
}
```

**VERIFY**

- [x] `PRIMARY KEY (path, kind, target, qualifier)` is path-leading — `clearPath`, `renamePathIndex`, and both prefix operations range-scan on `path` and ride this index.
- [x] `qualifier` and `count` are `NOT NULL`. SQLite permits NULL in a rowid table's primary key and compares NULLs as distinct, so a nullable `qualifier` would let `INSERT OR REPLACE` accrete duplicates instead of collapsing them.
- [x] The index is `(target, qualifier, kind)` in that order: `queryMentions` uses the leading column, `queryHeadingMentions` the leading pair, `queryMembers` all three by equality. A `kind`-leading order would force `queryMentions` into an `IN` list.
- [x] `grep -rn "truncateIndex" Core Desktop Sync Mobile` → no result.

#### Task 2.2

**TASK:** Replace the three relationship arrays on `PageIndexEntry` with one `MatrixNode[]`, and retire the `Membership` type and the `HeadingMention` import.

**FILES:** `Core/Platform/stores.ts`

**NOW**

```ts
import type { KeyValueStore } from './machine'
import type { HeadingMention } from '../Connections/scan'

export interface Membership {
  key: string
  title: string
}

export interface PageIndexEntry {
  mentions: string[]
  headings: string[]
  headingMentions: HeadingMention[]
  values: Record<string, unknown>
  memberships: Membership[]
}
```

**CHANGE**

- [x] Replace the three arrays with `matrix: MatrixNode[]`, and add `MatrixKind` and `MatrixNode` above `PageIndexEntry`.
- [x] Delete the `Membership` interface and the `HeadingMention` import. `Core/Platform/stores.ts` then imports nothing from `Core/Connections`.
- [x] Leave every method signature on `ContentIndexStore` exactly as it reads today.

**AFTER** — the head of the file only. Everything from `SnapshotSource` down, including `SnapshotStore`, `SyncStore`, `CaptureStore`, `Stores`, `NO_STORES`, `installStores`, and the five accessors, is untouched and stays exactly as it reads today.

```ts
import type { KeyValueStore } from './machine'

// `citation` overlays rather than replaces: a link or embed inside a footnote definition emits its own syntax kind AND a `citation` row, so a reader asking for body links sees it and a reader weighting footnotes sees it too.
export type MatrixKind = 'body' | 'citation' | 'frontmatter' | 'embed' | 'space'

/** `target` is a normalized title, never a path — resolution happens at read time. `qualifier` is a normalized heading key for a heading-naming link, a Context key for a `space` row, and '' otherwise. `count` is occurrences for `body`, `citation` and `embed`, and always 1 for `frontmatter` and `space`, whose producers key by target. */
export interface MatrixNode {
  kind: MatrixKind
  target: string
  qualifier: string
  count: number
}

export interface PageIndexEntry {
  matrix: MatrixNode[]
  headings: string[]
  values: Record<string, unknown>
}

export interface IndexedStat {
  mtimeMs: number
  size: number
}

export interface ContentIndexStore {
  upsertPageIndex(path: string, entry: PageIndexEntry, stat: IndexedStat): void
  removePathIndex(path: string): void
  renamePathIndex(oldPath: string, newPath: string): void
  removePathPrefixIndex(dir: string): void
  renamePathPrefixIndex(oldDir: string, newDir: string): void
  queryMentions(normalizedTitle: string): string[]
  queryHeadingMentions(normalizedTitle: string, normalizedHeading: string): string[]
  readHeadings(paths?: string[]): Record<string, string[]>
  queryKeyHolders(key: string): string[]
  queryMembers(key: string, title: string): string[]
  readIndexedStat(path: string): IndexedStat | null
  readIndexedStats(): Map<string, IndexedStat>
}
```

**VERIFY**

- [x] `git diff Core/Platform/stores.ts` shows no edit between `export interface ContentIndexStore {` and its closing brace.
- [x] `grep -n "Connections" Core/Platform/stores.ts` → no result.
- [x] The `count` doc sentence states the per-kind unit. A graph reading `count` uniformly across kinds would otherwise compare occurrences against a constant 1.

#### Task 2.3

**TASK:** Collapse the three insert loops in `upsertPageIndex` into one over `entry.matrix`, and rewrite the three queries against `matrix_nodes` with the kind predicates and the `DISTINCT` the merge requires.

**FILES:** `Desktop/Store/stores.ts`

**NOW**

`upsertPageIndex` prepares five statements and runs five loops. `queryMentions`, `queryHeadingMentions`, and `queryMembers` each select from their own table without `DISTINCT`, which the narrow per-table primary keys made unnecessary.

**CHANGE**

- [x] Replace the `mentions`, `heading_mentions`, and `memberships` statements and loops with one statement over `matrix_nodes` and one loop over `entry.matrix`. Keep the `indexed_files` write last.
- [x] Rewrite the three queries as the AFTER block spells them. **The binding is the trap:** `queryMembers(key, title)` binds `key` to the `qualifier` column and `title` to the `target` column.
- [x] Leave `clearPath`, `renamePathIndex`, `removePathPrefixIndex`, and `renamePathPrefixIndex` untouched — they iterate `INDEX_TABLES` generically and now issue four statements instead of six.

**AFTER**

```ts
const clearPath = (db: Db, path: string): void => {
  for (const table of INDEX_TABLES) db.prepare(`DELETE FROM ${table} WHERE path = ?`).run(path)
}

// The prefix pair `path >= dir||'/' AND path < dir||'0'` selects `dir`'s descendants by range — exact because '0' is the code point after '/', where a LIKE would let a legal '%' in a folder name over-match.
export const contentIndexStore = (db: Db): ContentIndexStore => ({
  upsertPageIndex(path, entry, stat) {
    clearPath(db, path)
    const insNode = db.prepare(
      'INSERT OR REPLACE INTO matrix_nodes (path, kind, target, qualifier, count) VALUES (?, ?, ?, ?, ?)',
    )
    for (const { kind, target, qualifier, count } of entry.matrix)
      insNode.run(path, kind, target, qualifier, count)
    const insHeading = db.prepare(
      'INSERT OR REPLACE INTO headings (path, heading, ordinal) VALUES (?, ?, ?)',
    )
    entry.headings.forEach((heading, ordinal) => {
      insHeading.run(path, heading, ordinal)
    })
    const insValue = db.prepare(
      'INSERT OR REPLACE INTO page_values (path, key, value) VALUES (?, ?, ?)',
    )
    for (const [key, value] of Object.entries(entry.values)) {
      insValue.run(path, key, JSON.stringify(value) ?? 'null')
    }
    // The gate row lands LAST, so a write that dies part-way leaves no stat and the next seed re-reads the file.
    db.prepare('INSERT OR REPLACE INTO indexed_files (path, mtime_ms, size) VALUES (?, ?, ?)').run(
      path,
      stat.mtimeMs,
      stat.size,
    )
  },
  removePathIndex(path) {
    clearPath(db, path)
  },
  renamePathIndex(oldPath, newPath) {
    for (const table of INDEX_TABLES) {
      db.prepare(`UPDATE OR REPLACE ${table} SET path = ? WHERE path = ?`).run(newPath, oldPath)
    }
  },
  removePathPrefixIndex(dir) {
    for (const table of INDEX_TABLES) {
      db.prepare(`DELETE FROM ${table} WHERE path >= ? || '/' AND path < ? || '0'`).run(dir, dir)
    }
  },
  renamePathPrefixIndex(oldDir, newDir) {
    for (const table of INDEX_TABLES) {
      // The suffix offset is computed by SQL's own length() — SQLite counts characters where a JS .length counts UTF-16 units, and mixing the two swallows the separator after any astral character.
      db.prepare(
        `UPDATE OR REPLACE ${table} SET path = ? || substr(path, length(?) + 1) WHERE path >= ? || '/' AND path < ? || '0'`,
      ).run(newDir, oldDir, oldDir, oldDir)
    }
  },
  // Qualifier-agnostic by construction: a page that links only `[[Alpha#Intro]]` names Alpha, and a predicate narrowing to the unqualified row would drop it from the rename cascade silently. DISTINCT because one page reaches one target through several kinds and qualifiers.
  queryMentions(normalizedTitle) {
    return paths(
      db,
      "SELECT DISTINCT path FROM matrix_nodes WHERE target = ? AND kind <> 'space' ORDER BY path",
      normalizedTitle,
    )
  },
  queryHeadingMentions(normalizedTitle, normalizedHeading) {
    return paths(
      db,
      "SELECT DISTINCT path FROM matrix_nodes WHERE target = ? AND qualifier = ? AND kind <> 'space' ORDER BY path",
      normalizedTitle,
      normalizedHeading,
    )
  },
  readHeadings(paths) {
    // unchanged
  },
  queryKeyHolders(key) {
    return paths(db, 'SELECT path FROM page_values WHERE key = ? ORDER BY path', key)
  },
  // `key` is the Context key and lands in `qualifier`; `title` is the Space title and lands in `target`.
  queryMembers(key, title) {
    return paths(
      db,
      "SELECT DISTINCT path FROM matrix_nodes WHERE kind = 'space' AND qualifier = ? AND target = ? ORDER BY path",
      key,
      title,
    )
  },
  readIndexedStat(path) {
    // unchanged
  },
  readIndexedStats() {
    // unchanged
  },
})
```

**VERIFY**

- [x] `queryMembers` filters `kind = 'space'`. Without it the Space-deletion sweep receives every page that merely writes `[[SpaceTitle]]`; one page whose frontmatter cannot round-trip then lands in `refused` at `Core/Properties/governedSweep.ts`, which `Core/Trash/gather.ts`'s `sweepIncomplete` reads to stamp a complete Space deletion as `partial`.
- [x] `queryMentions` carries no `qualifier` predicate and does carry `DISTINCT`.
- [x] `grep -n "INDEX_TABLES" Desktop/Store/stores.ts` still shows the four generic path loops unedited.

#### Task 2.4

**TASK:** Collapse the in-memory store's five per-table maps to three, and replace the hand-unrolled per-table blocks in its four path operations with one descriptor that owns both operations.

**FILES:** `Core/Testing/memoryStores.ts`

**NOW**

`MemoryIndex` holds `mentions`, `headings`, `headingMentions`, `values`, and `memberships`. `clearPath` and `removePathPrefixIndex` iterate an inline array of maps; `renamePathIndex` and `renamePathPrefixIndex` each hand-write five near-identical rekey blocks that differ only in which fields form the key.

**CHANGE**

- [x] Replace `mentions`, `headingMentions`, and `memberships` with one `matrix` map keyed as the SQLite primary key is.
- [x] Add `tableOf`, a generic descriptor carrying `clear` and `rekey` closed over one map and its key fields, and build the list once per store.
- [x] Rewrite all four path operations as one loop over that list each.
- [x] Mirror the three queries against the merged map, including the kind predicates. **The `space` binding is the same trap as Task 2.3:** the Context key lives in `qualifier`, the Space title in `target`.

**AFTER** — the `MemoryIndex` shape, the new `tableOf` helper, the `contentIndex` factory, and the `memoryStores` export. `keyValue()`, `snapshots()`, `sync()`, and `captures()` sit between `contentIndex` and `memoryStores` in the real file and are untouched.

```ts
import type { KeyValueStore } from '../Platform/machine'
import type {
  BaseRecord,
  CaptureReason,
  CaptureStore,
  ContentIndexStore,
  IndexedStat,
  MatrixKind,
  SnapshotRow,
  SnapshotSource,
  SnapshotStore,
  Stores,
  SyncStore,
} from '../Platform/stores'

interface MatrixRow {
  path: string
  kind: MatrixKind
  target: string
  qualifier: string
  count: number
}

interface MemoryIndex {
  matrix: Map<string, MatrixRow>
  headings: Map<string, { path: string; heading: string; ordinal: number }>
  values: Map<string, { path: string; key: string; value: string }>
  stats: Map<string, IndexedStat>
}

const k = (...parts: string[]): string => JSON.stringify(parts)

const underPrefix = (path: string, dir: string): boolean => path.startsWith(`${dir}/`)

interface IndexTable {
  clear(holds: (path: string) => boolean): void
  rekey(holds: (path: string) => boolean, move: (path: string) => string): void
}

// One descriptor per map: the four path operations differ only in which fields key a row, so the difference lives here and each operation is one loop.
const tableOf = <R extends { path: string }>(
  map: Map<string, R>,
  keyOf: (row: R) => string[],
): IndexTable => ({
  clear(holds) {
    for (const [key, row] of map) if (holds(row.path)) map.delete(key)
  },
  rekey(holds, move) {
    for (const [key, row] of [...map]) {
      if (!holds(row.path)) continue
      map.delete(key)
      const next = { ...row, path: move(row.path) }
      map.set(k(next.path, ...keyOf(next)), next)
    }
  },
})

const contentIndex = (index: MemoryIndex): ContentIndexStore => {
  const tables: IndexTable[] = [
    tableOf(index.matrix, (r) => [r.kind, r.target, r.qualifier]),
    tableOf(index.headings, (r) => [r.heading]),
    tableOf(index.values, (r) => [r.key]),
  ]
  const clearPath = (path: string): void => {
    for (const t of tables) t.clear((p) => p === path)
    index.stats.delete(path)
  }
  const sortedPaths = (paths: Iterable<string>): string[] => [...new Set(paths)].sort()
  const nodes = (): MatrixRow[] => [...index.matrix.values()]
  return {
    upsertPageIndex(path, entry, stat) {
      clearPath(path)
      for (const node of entry.matrix)
        index.matrix.set(k(path, node.kind, node.target, node.qualifier), { path, ...node })
      entry.headings.forEach((heading, ordinal) => {
        index.headings.set(k(path, heading), { path, heading, ordinal })
      })
      for (const [key, value] of Object.entries(entry.values))
        index.values.set(k(path, key), { path, key, value: JSON.stringify(value) ?? 'null' })
      index.stats.set(path, { mtimeMs: stat.mtimeMs, size: stat.size })
    },
    removePathIndex(path) {
      clearPath(path)
    },
    // `rekey` deletes each row before re-setting it, so no row still holds `oldPath` and the stats are all that remain to move.
    renamePathIndex(oldPath, newPath) {
      for (const t of tables)
        t.rekey(
          (p) => p === oldPath,
          () => newPath,
        )
      const stat = index.stats.get(oldPath)
      if (!stat) return
      index.stats.delete(oldPath)
      index.stats.set(newPath, stat)
    },
    removePathPrefixIndex(dir) {
      for (const t of tables) t.clear((p) => underPrefix(p, dir))
      for (const path of [...index.stats.keys()])
        if (underPrefix(path, dir)) index.stats.delete(path)
    },
    renamePathPrefixIndex(oldDir, newDir) {
      const move = (path: string): string => newDir + path.slice(oldDir.length)
      for (const t of tables) t.rekey((p) => underPrefix(p, oldDir), move)
      // Biome expands a call whose arguments are all functions regardless of width, which is why the `renamePathIndex` call above reads across five lines and this one does not.
      for (const [path, stat] of [...index.stats]) {
        if (!underPrefix(path, oldDir)) continue
        index.stats.delete(path)
        index.stats.set(move(path), stat)
      }
    },
    queryMentions(normalizedTitle) {
      return sortedPaths(
        nodes()
          .filter((r) => r.target === normalizedTitle && r.kind !== 'space')
          .map((r) => r.path),
      )
    },
    queryHeadingMentions(normalizedTitle, normalizedHeading) {
      return sortedPaths(
        nodes()
          .filter(
            (r) =>
              r.target === normalizedTitle &&
              r.qualifier === normalizedHeading &&
              r.kind !== 'space',
          )
          .map((r) => r.path),
      )
    },
    readHeadings(paths) {
      // unchanged
    },
    queryKeyHolders(key) {
      return sortedPaths([...index.values.values()].filter((r) => r.key === key).map((r) => r.path))
    },
    queryMembers(key, title) {
      return sortedPaths(
        nodes()
          .filter((r) => r.kind === 'space' && r.qualifier === key && r.target === title)
          .map((r) => r.path),
      )
    },
    readIndexedStat(path) {
      // unchanged
    },
    readIndexedStats() {
      // unchanged
    },
  }
}

export function memoryStores(): { stores: Stores; index: MemoryIndex } {
  const index: MemoryIndex = {
    matrix: new Map(),
    headings: new Map(),
    values: new Map(),
    stats: new Map(),
  }
  return {
    stores: {
      keyValue: keyValue(),
      contentIndex: contentIndex(index),
      snapshots: snapshots(),
      sync: sync(),
      captures: captures(),
    },
    index,
  }
}
```

**VERIFY**

- [x] `wc -l Core/Testing/memoryStores.ts` reads between 280 and 292, Biome-formatted, against a baseline of 307. Report the figure. A bound in one direction only would wave through a wholesale truncation, which is the actual risk in a file whose AFTER block is a fragment.
- [x] No path operation names an individual map: `grep -n "index.matrix\|index.headings\|index.values" Core/Testing/memoryStores.ts` shows them in the descriptor list, `upsertPageIndex`, and the queries alone.
- [x] `renamePathIndex` with `oldPath === newPath` leaves the rows and the stat in place. `rekey` deletes and re-sets the same key, and the stat does the same.
- [x] `renamePathIndex` no longer calls `clearPath`. After `rekey` no row holds `oldPath`, so the sweep deleted nothing and existed only to reach its stats line.
- [x] `sortedPaths` already dedupes; no `Set` needs adding anywhere.

#### Task 2.5

**TASK:** Rewrite `extractPageIndex` on one `scanDoc` call, emitting five kinds with occurrence counts and the citation overlay, and retire the two extractors Phase 1 left as thin collectors.

**FILES:** `Core/Index/indexSeed.ts`, `Core/Connections/scan.ts`, `Core/MarkdownPM/Engine/docScan.ts`

**DEPENDENCIES:** Tasks 1.1, 1.2, 1.3, and 2.2. Task 1.3 in particular — without it this task's `scanDoc` import turns the engine-graph gate red.

**NOW**

```ts
const NO_ROWS: PageIndexEntry = {
  mentions: [], headings: [], headingMentions: [], values: {}, memberships: [],
}

function extractPageIndex(rel: string, content: string): PageIndexEntry {
  if (!sweepAdmitsBody(content)) return NO_ROWS
  const values = frontmatterValues(content)
  const own = titleFromPath(rel)
  const { body } = splitEnvelope(content)
  const outline = headingOutline(body).map((h) => h.text)
  const mentions = extractMentions(body, own)
  for (const title of frontmatterMentions(values)) mentions.add(title)
  return {
    mentions: [...mentions],
    headings: [...new Set(outline.map(normalizeTitle))].filter(Boolean),
    headingMentions: extractHeadingMentions(body, own, outline),
    values,
    memberships: extractMemberships(values),
  }
}

// Every `<Title>` key counts, registered or not — the same latitude page_values gives an unregistered property name, so a Context created later finds its holders.
function extractMemberships(values: Record<string, unknown>): Membership[] {
  // returns { key, title }[]
}
```

**CHANGE**

- [x] Call `scanDoc(body)` once. It already performs every derivation this task needs — `splitWithOffsets`, `scanFencedCode`, `codeMaskOf`, `tableRegions`, and `docLineScan`, which returns `citations` — and its result satisfies `HeadingSrc` structurally. Do not assemble those calls by hand in `Core/Index`; that is the hand-rolled parallel the project's conventions name.
- [x] Use `scanDoc`, never `scanOf`. `perText` caps at four text slots and a full-nexus seed would thrash it while sharing nothing — the editor's cache key is the whole document and the indexer holds the envelope-stripped body.
- [x] Return the code mask `scanDoc` already builds. It constructs `inCode` via `codeMaskOf`, threads it into `tableRegions` and `docLineScan`, then drops it — and the same construction is hand-rebuilt a third time in `Core/MarkdownPM/regression-pins.test.ts`. Add `inCode: CodeMask` to `DocScan` and to `scanDoc`'s return, so the indexer reads `scan.inCode` and `Core/Index` names no scanning primitive at all. This is why `docScan.ts` is in this task's FILES: exposing a derivation the function already performs deletes the duplicate rather than documenting an exception to a rule.
- [x] Task 1.3 has already taken the UIX import out of `docScan.ts`. Without it, this import would make `Core/Index` the first host-side reader of that module and turn `Core/Contract/engineGraph.test.ts` red on a fifth UIX leaf.
- [x] Tally into a `Map` keyed by kind, target, and qualifier joined on a NUL character, which no normalized title or Context key can hold.
- [x] Increment the citation row under the same hit that increments the syntax row. The two counts match only when every occurrence sits inside the footnote block: one link above it and one inside gives `body: 2, citation: 1`, which is correct and is what a weighting reader wants.
- [x] Rename `extractMemberships` to `spaceRelations` and retype it to `{ target, qualifier }[]`, keeping its comment. It dedupes per key, so every `space` row is `count: 1`.
- [x] Delete `extractMentions` and `extractHeadingMentions` from `Core/Connections/scan.ts`, along with the `HeadingMention` type. `linksIn` and `mentionsTitle` stay; `frontmatterMentions` stays returning `Set<string>` and is mapped to rows here rather than importing `MatrixNode` into `Core/Connections`.

**AFTER**

```ts
// in Core/MarkdownPM/Engine/docScan.ts — the mask `scanDoc` already builds, now returned

/** Every whole-document derivation the editor reads. Pure on `text`, so per-keystroke callers cache one per doc VERSION. */
export interface DocScan extends DocLines, DocLineScan {
  inCode: CodeMask
  fences: (FenceInfo | undefined)[]
  callouts: (CalloutLine | undefined)[]
  tables: TableRegion[]
  headings: boolean[]
  quotes: boolean[]
  breaks: boolean[]
  /** A closed top-level fence owns its bytes outright, so a `>` inside one is code text; an unclosed fence keeps its quote chrome while being typed, and a quoted fence keeps its box. */
  literal: boolean[]
}

export function scanDoc(text: string): DocScan {
  const d = splitWithOffsets(text)
  const { lines, lineStarts } = d
  const fences = scanFencedCode(lines, lineStarts)
  const inCode = codeMaskOf(lines, lineStarts, (i) => fences[i] !== undefined)
  const tables = tableRegions(d, inCode)
  return {
    ...d,
    inCode,
    fences,
    callouts: calloutLines(lines, fences),
    tables,
    ...docLineScan(d, fenceRangesOf(fences), tables, inCode),
    headings: lines.map(isHeadingLine),
    quotes: lines.map(isBlockquoteLine),
    breaks: lines.map(isThematicBreakLine),
    literal: fences.map((f) => f?.closed === true && f.depth === 0),
  }
}
```

```ts
// in Core/Index/indexSeed.ts — the imports that CHANGE, plus the two rewritten functions.
// Every other import stays: `normalizeTitle`, `titleFromPath`, `parseContextKey`, `sweepAdmitsBody`,
// `splitEnvelope`, `frontmatterValues`, the whole `./contentIndex` group, and `headingOutline`
// itself, which `indexWrittenPage` still calls on a raw string.

import { headingOutline, headingOutlineOf } from '../MarkdownPM/Engine/headingScan'
import { lineIndexAt, scanDoc } from '../MarkdownPM/Engine/docScan'
import { frontmatterMentions, linksIn } from '../Connections/scan'
import type { MatrixKind, MatrixNode, PageIndexEntry } from '../Platform/stores'

const NO_ROWS: PageIndexEntry = { matrix: [], headings: [], values: {} }

function extractPageIndex(rel: string, content: string): PageIndexEntry {
  if (!sweepAdmitsBody(content)) return NO_ROWS
  const values = frontmatterValues(content)
  const own = titleFromPath(rel)
  const { body } = splitEnvelope(content)
  const scan = scanDoc(body)
  const outline = headingOutlineOf(scan).map((h) => h.text)
  const tally = new Map<string, MatrixNode>()
  // A NUL separator: no normalized title or Context key can hold one, so the three parts never blur.
  const add = (kind: MatrixKind, target: string, qualifier: string): void => {
    const key = `${kind}\0${target}\0${qualifier}`
    const held = tally.get(key)
    if (held) held.count++
    else tally.set(key, { kind, target, qualifier, count: 1 })
  }
  for (const hit of linksIn(body, own, outline, scan.inCode)) {
    add(hit.syntax === 'embed' ? 'embed' : 'body', hit.target, hit.qualifier)
    // `mask` is indexed by LINE, so the hit's offset resolves to one first; `firstLine` is a line index and comparing it to an offset would classify by document length.
    if (scan.citations.mask[lineIndexAt(scan, hit.at)] === 1)
      add('citation', hit.target, hit.qualifier)
  }
  for (const target of frontmatterMentions(values)) add('frontmatter', target, '')
  for (const { target, qualifier } of spaceRelations(values)) add('space', target, qualifier)
  return {
    matrix: [...tally.values()],
    headings: [...new Set(outline.map(normalizeTitle))].filter(Boolean),
    values,
  }
}

// Every `<Title>` key counts, registered or not — the same latitude page_values gives an unregistered property name, so a Context created later finds its holders.
function spaceRelations(values: Record<string, unknown>): { target: string; qualifier: string }[] {
  const out: { target: string; qualifier: string }[] = []
  for (const [key, raw] of Object.entries(values)) {
    if (parseContextKey(key) === null || raw == null) continue
    const titles = new Set<string>()
    for (const value of Array.isArray(raw) ? raw : [raw]) {
      const title = normalizeTitle(value)
      if (title) titles.add(title)
    }
    for (const target of titles) out.push({ target, qualifier: key })
  }
  return out
}
```

**VERIFY**

- [x] `queryMentions` still reaches embed-only pages. `Core/Connections/rewrite.test.ts` asserts a rename rewrites `![[Old]]`; exercise a rename against an embed-only page.
- [x] `queryMentions` still reaches pages whose only reference is a frontmatter Link property. Splitting `frontmatter` out of the body set is the one change that could silently drop them; exercise a rename against such a page.
- [x] A link inside a footnote definition produces two rows; a link above the footnote block produces one. Use a fixture long enough that the above-block link's character offset exceeds `firstLine`'s value — a short fixture passes under a line-versus-offset confusion and ships the defect.
- [x] `queryHeadingMentions(title, '')` is checked rather than guarded. The merged table holds unqualified rows, so an empty heading key now matches every `body`, `embed`, `citation`, and `frontmatter` row for that title, where the separate `heading_mentions` table returned nothing. `Core/Contract/bridge.ts` does not constrain `oldHeading`, so confirm `Core/MarkdownPM/Guards/headingRenameGuard.ts` cannot emit an empty one; if it can, the cascade's entry refuses it rather than the query carrying a predicate for it.
- [x] An embed inside a footnote produces `embed` and `citation`, never `body`.
- [x] `grep -n "splitWithOffsets\|scanFencedCode\|tableRegions\|blockMathRanges\|codeMask" Core/Index/indexSeed.ts` → no result. Every derivation, the mask included, comes from the one `scanDoc` call.
- [x] `scanDoc` returns the same `inCode` it passes to `tableRegions` and `docLineScan` — one mask per document, not two. Reading the function is the proof; it is the same binding.
- [x] Record as an accepted behavior change: a page with a bare `§Heading` run now answers `queryMentions(ownTitle)` for itself. The `section` hit lands as a `body` row and `queryMentions` ignores `qualifier`, where the separate `heading_mentions` table never answered that query. The rename cascade opens the page, `mentionsTitle` returns false, nothing is written — one extra read.
- [x] `Core/Contract/engineGraph.test.ts` is green and its four-leaf list is unedited. `npm run test` is the gate that proves this, not `npm run typecheck` — every tsconfig project compiles clean either way, and the pin is a test assertion.

#### Task 2.6

**TASK:** Reshape every `PageIndexEntry` fixture behind two builders, retarget the raw SQL and the internal reach-ins, and add the cases the merge makes necessary.

**FILES:** `Core/Testing/storesContract.ts`, `Core/Index/contentIndex.test.ts`, `Core/Index/indexMaintenance.test.ts`, `Core/Index/indexSeed.test.ts`, `Core/Connections/scan.test.ts`, `Desktop/Store/open.test.ts`, `Desktop/Store/stores.test.ts`

**NOW**

Fixture literals read `{ mentions, headings, headingMentions, values, memberships }`. `Desktop/Store/open.test.ts` carries raw `INSERT INTO mentions` and `INSERT INTO memberships` inside its stale-generation case, and asserts `for (const table of INDEX_TABLES) expect(count(second, table)).toBe(0)`. `Desktop/Store/stores.test.ts` hand-lists all six names in a `DROP TABLE` string. `Core/Index/indexSeed.test.ts` and `Core/Index/indexMaintenance.test.ts` reach into `mem.index.mentions` and `.memberships` directly.

**CHANGE**

- [x] Add two builders at the top of `describeContentIndexStore` and use them in every fixture. `space(key, title)` takes its arguments in `queryMembers(key, title)` order, so a reversed binding is visible at the call site rather than buried in a literal.
- [x] Rewrite all 13 fixture literals in `storesContract.ts` to `{ matrix, headings, values }`.
- [x] Add the three new contract cases in the AFTER block.
- [x] Retarget `open.test.ts`'s raw inserts to `matrix_nodes`, rename its case from "truncates" to what `rebuildIndex` does, and extend it to assert the retired tables are gone from `sqlite_master`.
- [x] Rewrite `stores.test.ts`'s `DROP TABLE` string to the four current names.
- [x] Reshape the two `PageIndexEntry` literals these files also carry, which the bullets above do not reach: one inside `open.test.ts`'s "upgrade in place" case and one inside `stores.test.ts`'s missing-tables case.
- [x] Retarget every `mem.index.mentions` and `mem.index.memberships` reach-in to `mem.index.matrix`.
- [x] Keep `scan.test.ts`'s existing assertions verbatim by moving the two deleted extractors into that file as local helpers, spelled exactly as Task 1.1 left them. Eleven assertions and the `MUST AGREE` property were the proof that `linksIn` preserved behavior; respelling them by hand against `linksIn` would dissolve that proof at the moment Phase 2 changes the producer, which is when it is worth most. The helpers are three lines each and pin the generator's contract from the outside.
- [x] Scope the agreement property where it is stated: it holds for `linksIn(body)` with defaults only. With an `ownTitle` and an `outline` supplied, a `§` run and a `[[#Intro]]` yield the page's own title, which `mentionsTitle` — which passes neither — never affirms.
- [x] Add to `indexSeed.test.ts`, where a real file exercises the producer: one case per kind, the citation overlay, the embed-inside-a-footnote case, the count case, a `[^1]:` inside a fence and inside a table, and a wikilink inside an inline code span producing no row.

**AFTER**

```ts
// Core/Testing/storesContract.ts — the reshaped fixtures and the three new cases

export function describeContentIndexStore(name: string, make: () => ContentIndexStore): void {
  describe(name, () => {
    let store: ContentIndexStore
    const STAT = { mtimeMs: 1000, size: 10 }
    // Built rather than spelled: `space` takes (key, title) in `queryMembers` order, so the transposition onto (target, qualifier) reads on one line and a reversed binding reads wrong at the call site.
    const node = (kind: MatrixKind, target: string, qualifier = ''): MatrixNode => ({
      kind,
      target,
      qualifier,
      count: 1,
    })
    const body = (target: string, qualifier = ''): MatrixNode => node('body', target, qualifier)
    const space = (key: string, title: string): MatrixNode => node('space', title, key)
    beforeEach(() => {
      store = make()
    })

    it('round-trips an upsert through every query', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        {
          matrix: [body('beta'), space('<Projects>', 'pommora')],
          headings: [],
          values: { Status: 'Open', '<Projects>': ['Pommora'] },
        },
        STAT,
      )
      store.upsertPageIndex(
        'Loose/B.md',
        {
          matrix: [
            body('beta'),
            body('gamma'),
            space('<Projects>', 'pommora'),
            space('<Projects>', 'sapphire'),
          ],
          headings: [],
          values: { '<Projects>': ['Pommora', 'Sapphire'] },
        },
        STAT,
      )
      expect(store.queryMentions('beta')).toEqual(['Loose/B.md', 'Notes/A.md'])
      expect(store.queryMentions('gamma')).toEqual(['Loose/B.md'])
      expect(store.queryKeyHolders('Status')).toEqual(['Notes/A.md'])
      expect(store.queryMembers('<Projects>', 'pommora')).toEqual(['Loose/B.md', 'Notes/A.md'])
      expect(store.queryMembers('<Projects>', 'sapphire')).toEqual(['Loose/B.md'])
      expect(store.readIndexedStat('Notes/A.md')).toEqual(STAT)
      expect(store.readIndexedStats().get('Loose/B.md')).toEqual(STAT)
    })

    it('a re-upsert replaces the page rows rather than accreting them', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        { matrix: [body('beta')], headings: [], values: { Status: 'Open' } },
        STAT,
      )
      store.upsertPageIndex(
        'Notes/A.md',
        { matrix: [body('gamma')], headings: [], values: {} },
        { mtimeMs: 2000, size: 12 },
      )
      expect(store.queryMentions('beta')).toEqual([])
      expect(store.queryMentions('gamma')).toEqual(['Notes/A.md'])
      expect(store.queryKeyHolders('Status')).toEqual([])
      expect(store.readIndexedStat('Notes/A.md')).toEqual({ mtimeMs: 2000, size: 12 })
    })

    it('serializes a null value rather than dropping the key', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        { matrix: [], headings: [], values: { Blank: null } },
        STAT,
      )
      expect(store.queryKeyHolders('Blank')).toEqual(['Notes/A.md'])
    })

    it('removes every row for a path', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        {
          matrix: [body('beta'), space('<Projects>', 'pommora')],
          headings: [],
          values: { Status: 'Open' },
        },
        STAT,
      )
      store.removePathIndex('Notes/A.md')
      expect(store.queryMentions('beta')).toEqual([])
      expect(store.queryKeyHolders('Status')).toEqual([])
      expect(store.queryMembers('<Projects>', 'pommora')).toEqual([])
      expect(store.readIndexedStat('Notes/A.md')).toBeNull()
    })

    it('renames a path across every table', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        {
          matrix: [body('beta'), space('<Projects>', 'pommora')],
          headings: [],
          values: { Status: 'Open' },
        },
        STAT,
      )
      store.renamePathIndex('Notes/A.md', 'Notes/Alpha.md')
      expect(store.queryMentions('beta')).toEqual(['Notes/Alpha.md'])
      expect(store.queryKeyHolders('Status')).toEqual(['Notes/Alpha.md'])
      expect(store.queryMembers('<Projects>', 'pommora')).toEqual(['Notes/Alpha.md'])
      expect(store.readIndexedStat('Notes/A.md')).toBeNull()
      expect(store.readIndexedStat('Notes/Alpha.md')).toEqual(STAT)
    })

    it('round-trips headings and heading mentions, then carries them across a rename', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        { matrix: [body('beta', 'setup')], headings: ['setup', 'intro'], values: {} },
        STAT,
      )
      expect(store.readHeadings()).toEqual({ 'Notes/A.md': ['setup', 'intro'] })
      expect(store.readHeadings(['Notes/A.md'])).toEqual({ 'Notes/A.md': ['setup', 'intro'] })
      expect(store.queryHeadingMentions('beta', 'setup')).toEqual(['Notes/A.md'])
      store.renamePathIndex('Notes/A.md', 'Notes/Alpha.md')
      expect(store.readHeadings()).toEqual({ 'Notes/Alpha.md': ['setup', 'intro'] })
      expect(store.queryHeadingMentions('beta', 'setup')).toEqual(['Notes/Alpha.md'])
    })

    it('a heading-naming link answers the bare title query', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        { matrix: [body('beta', 'setup')], headings: [], values: {} },
        STAT,
      )
      expect(store.queryMentions('beta')).toEqual(['Notes/A.md'])
    })

    it('returns a path once however many rows reach the target', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        {
          matrix: [
            body('beta'),
            body('beta', 'setup'),
            node('embed', 'beta'),
            node('citation', 'beta'),
          ],
          headings: [],
          values: {},
        },
        STAT,
      )
      expect(store.queryMentions('beta')).toEqual(['Notes/A.md'])
    })

    it('keeps space rows out of the title queries and link rows out of the member query', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        { matrix: [space('<Projects>', 'beta')], headings: [], values: {} },
        STAT,
      )
      store.upsertPageIndex(
        'Loose/B.md',
        { matrix: [body('beta')], headings: [], values: {} },
        STAT,
      )
      expect(store.queryMentions('beta')).toEqual(['Loose/B.md'])
      expect(store.queryHeadingMentions('beta', '')).toEqual(['Loose/B.md'])
      expect(store.queryMembers('<Projects>', 'beta')).toEqual(['Notes/A.md'])
    })

    it('prefix-renames descendants, exact on a % folder name', () => {
      store.upsertPageIndex(
        '50% Off/A.md',
        { matrix: [body('beta')], headings: [], values: {} },
        STAT,
      )
      store.upsertPageIndex(
        '50% Off More/B.md',
        { matrix: [body('beta')], headings: [], values: {} },
        STAT,
      )
      store.renamePathPrefixIndex('50% Off', 'Sale')
      expect(store.queryMentions('beta')).toEqual(['50% Off More/B.md', 'Sale/A.md'])
    })

    it('prefix-renames across an astral folder name', () => {
      store.upsertPageIndex(
        'Projects 🚀/A.md',
        { matrix: [body('beta')], headings: [], values: {} },
        STAT,
      )
      store.renamePathPrefixIndex('Projects 🚀', 'Launchpad')
      expect(store.queryMentions('beta')).toEqual(['Launchpad/A.md'])
    })

    it('removes a prefix, exact on a % folder name', () => {
      store.upsertPageIndex(
        '50% Off/A.md',
        { matrix: [body('beta')], headings: [], values: {} },
        STAT,
      )
      store.upsertPageIndex(
        '50% Off More/B.md',
        { matrix: [body('beta')], headings: [], values: {} },
        STAT,
      )
      store.removePathPrefixIndex('50% Off')
      expect(store.queryMentions('beta')).toEqual(['50% Off More/B.md'])
    })
  })
}
```

```ts
// Desktop/Store/open.test.ts — the stale-generation case, retargeted and extended

  it('a stale index generation rebuilds the index tables, drops the retired ones, and keeps the rest', () => {
    const first = opened()
    for (const scope of ['aliases', 'folds', 'tabs']) {
      first
        .prepare('INSERT INTO local_state (scope, key, value) VALUES (?, ?, ?)')
        .run(scope, 'k', '{}')
    }
    first
      .prepare("INSERT INTO page_values (path, key, value) VALUES ('a.md', 'Status', '\"x\"')")
      .run()
    first
      .prepare(
        "INSERT INTO matrix_nodes (path, kind, target, qualifier, count) VALUES ('a.md', 'body', 'x', '', 1)",
      )
      .run()
    first.prepare("INSERT INTO indexed_files (path, mtime_ms, size) VALUES ('a.md', 1, 1)").run()
    // A table this generation retired, as a database written before the merge still carries it.
    first.exec('CREATE TABLE mentions (path TEXT NOT NULL, title TEXT NOT NULL)')
    first.prepare("INSERT INTO mentions (path, title) VALUES ('a.md', 'x')").run()
    first.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('index_generation', '1')").run()
    first.close()

    const second = opened()
    expect(count(second, 'local_state')).toBe(3)
    for (const table of INDEX_TABLES) expect(count(second, table)).toBe(0)
    const named = (name: string): number =>
      (
        second
          .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = ?")
          .get(name) as { n: number }
      ).n
    for (const retired of ['mentions', 'heading_mentions', 'memberships'])
      expect(named(retired)).toBe(0)
    expect(readMeta(second, 'index_generation')).toBe(String(INDEX_GENERATION))
    second.close()
  })
```

**VERIFY**

- [x] `grep -c "mentions:\|headingMentions:\|memberships:" Core/Testing/storesContract.ts Core/Index/contentIndex.test.ts Core/Index/indexMaintenance.test.ts` → 0 in all three.
- [x] `grep -rn "INSERT INTO mentions\|INSERT INTO memberships\|mem.index.mentions\|mem.index.memberships" Core Desktop` → results only inside the retired-table fixture in `open.test.ts`, which creates the old table deliberately.
- [x] The retired-table case goes red with Task 2.1's `RETIRED_TABLES` reverted. Prove it, don't assert it.
- [x] Each new case in `indexSeed.test.ts` goes red with its production change reverted. Prove it per case rather than as a group.
- [x] `grep -c "expect(" Core/Connections/scan.test.ts` grew; report the figure.
- [x] Run all three gates with `set -o pipefail` and read each tail. All three green.

#### Review Checkpoint

- [x] Gates green from clean across Phase 2's range, each tail read.
- [x] The five kinds each appear in `matrix_nodes` against a real seeded nexus, confirmed by querying the database rather than by reading the producer.
- [x] Deleting a Space produces a complete Trash record, not a `partial` one, on a nexus where an unrelated page writes that Space's name in its body. This is the check that catches a reversed `space` binding, which no unit test catches on its own because the fixtures and the memory store would be wrong together.
- [x] The citation boundary agrees with the editor's: a `[^1]:` line inside a table classifies the same way in both.
- [x] `SELECT COUNT(*) FROM (SELECT DISTINCT path, target FROM matrix_nodes WHERE kind <> 'space')` and `SELECT COUNT(*) FROM matrix_nodes WHERE kind = 'space'` each match the pre-merge `mentions` and `memberships` row counts over the same nexus, allowing for the `§`-run self-mention delta. A raw total proves nothing here — a heading-only link collapses two rows into one, a page carrying both a link and an embed to one target splits one into two, a body link plus a frontmatter Link splits one into two, and every footnote link adds one.
- [x] Seed timing measured on a real nexus and reported against the pre-merge figure, with a temporary `console.time` around `seedContentIndex` removed before the phase commits. The table parse is a known cost of the ratified design; the number is recorded, not litigated.
- [x] Diff size reported, comments and tests excluded, with `Core/Testing/memoryStores.ts` reported separately.

### Phase 3 — Reconciliation

**GOAL:** Rewrite every document the merge makes false, including one unshipped plan whose fixture would ship red against the new schema. Separate from Phase 2 because it follows the `[Stop: …]` and reconciles what Nathan has by then confirmed.

#### Task 3.1

**TASK:** Rewrite the feature documents and the framework roadmap where they name the retired tables or describe the index as recording undifferentiated mentions.

**FILES:** `.claude/Features/CorePM.md`, `.claude/Features/ConnectionsPM.md`, `.claude/FrameworkPM.md`

**DEPENDENCIES:** Load the `writing-standards` skill before the first edit.

**CHANGE**

- [x] `CorePM.md` §The Device-Local Database — the content index parenthetical reads `(mentions, page_values, memberships, indexed_files)`, which omits `headings` and `heading_mentions` and is stale before this plan touches it. Rewrite to the post-merge four and to what `matrix_nodes` records: which pages relate to which titles, by what kind of relationship, and how often.
- [x] `CorePM.md` state table, Content index row — replace the three-way "mentions / governed values / Spaces it tags" split with the one keyed relation.
- [x] `CorePM.md` §Pending, Index consumers — "the FTS table is the one piece of schema still unwritten" goes false. Rewrite so backlinks reads as having its substrate and FTS reads as the remaining unwritten schema.
- [x] `ConnectionsPM.md` — the cascade sentence naming "every file the content index says mentions the title", and the Backlinks pending entry's "the content index already records mentions". Replace the retiring vocabulary; the Backlinks entry is the natural home for the kind-weighted statement.
- [x] `FrameworkPM.md` — the `nexus.db` sentence carries the same two claims as `CorePM.md` §Pending and already omits the membership half. Rewrite both.
- [x] Apply the most surgical edit in each case. Remove a claim that is simply false rather than amending it; do not frame any rewrite as a discovery.

**VERIFY**

- [x] `grep -rn "heading_mentions\|memberships\|FTS table is the one piece" .claude/Features .claude/FrameworkPM.md` returns no result that describes current state.
- [x] Each edited paragraph reads coherently start to finish, not only at the edited sentence.
- [x] No added amendment, supersede, or correction framing.

#### Task 3.2

**TASK:** Update the two planning documents whose contents the merge falsifies, one of them unshipped and would otherwise ship red.

**FILES:** `.claude/Planning/Local Data — Implementation Plan.md`, `.claude/Planning/Heading Links — Implementation Plan.md`

**CHANGE**

- [x] `Local Data — Implementation Plan.md` Phase 2 carries a test literal asserting the exact table list, including `'memberships'` and `'mentions'`. Its Phases 2 and 3 are unshipped — `Desktop/Store/localData.ts` and `Core/Interface/Windows/DatabaseWindow.tsx` do not exist — so the literal must be rewritten or the Database window ships red when that plan resumes. The literal also omits `headings`, which was stale before this plan touched it, so a name swap alone leaves it wrong. The correct sorted list is `headings, indexed_files, local_state, matrix_nodes, meta, page_values, sync`.
- [x] `Heading Links — Implementation Plan.md` names `mentions(path, title)` and `queryMentions(title)` frozen interfaces. Record the override: the storage moved by ratified decision, `queryMentions`' contract held, and B-1's guarantee that a heading consult never takes the corpus fallback is preserved.
- [x] `Heading Links — Decision Log.md` is left alone. It records what was decided and when, which stays true whatever the storage does later; a decision log is history, not a description of current state.

**VERIFY**

- [x] `grep -n "'mentions'\|'memberships'" ".claude/Planning/Local Data — Implementation Plan.md"` returns no result inside the Phase 2 table literal.
- [x] The Heading Links note states what changed and what held, without re-arguing the decision.

### Completion Criteria

**Conformance**

- [ ] No duplicated mechanism: `grep -n "scanDoc" Core/Index/indexSeed.ts` returns the one call, and the indexer names no scanning primitive of its own. The code mask is read from the scan rather than rebuilt, so the construction that existed in three places now exists in one.
- [ ] No weight column, no container table, no path-keyed target, and no property-sharing rows exist — each was ruled out explicitly.
- [ ] Nothing changed outside what the plan named: `git diff --name-only ef88befe3..HEAD` matches the plan's FILES lists.
- [ ] No dependency added.
- [ ] The engine's declared UIX surface did not widen: `Core/Contract/engineGraph.test.ts` still names four leaves and `git diff` shows the file unedited, although `Core/Index` now reads `Core/MarkdownPM/Engine/docScan.ts`.

**Correctness**

- [ ] `matrix_nodes` distinguishes all five kinds against a real seeded nexus, read from the database.
- [ ] A link inside a footnote definition carries both its syntax row and a `citation` row; a link above the footnote block carries its syntax row alone. Where a target is linked both above and inside, the syntax row's count exceeds the citation row's by the occurrences outside the block.
- [ ] `count` reflects occurrences for `body`, `citation`, and `embed`: a target linked three times in one body reads 3. `frontmatter` and `space` rows read 1 by construction.
- [ ] A page rename rewrites body links, embeds, frontmatter Link properties, and heading-naming links — every kind the cascade reached before the merge.
- [ ] Deleting a Space produces a complete Trash record on a nexus where an unrelated page writes that Space's name as a body link.
- [ ] A `space` row carries the Context key in `qualifier` and the Space title in `target`, confirmed against the producer rather than against the fixtures.
- [ ] An existing `nexus.db` at generation 5 opens, drops all three retired tables, and reseeds.

**Completeness**

- [ ] Every task ticked; no scaffolding, debug output, or unauthorized TODO in `ef88befe3..HEAD`. The Phase 2 `console.time` is gone.
- [ ] `grep -rn "extractMentions\|extractHeadingMentions\|HeadingMention\|truncateIndex" Core Desktop --include=*.ts --include=*.tsx` → no result.
- [ ] `grep -rn "mentions:\|headingMentions:\|memberships:" Core Desktop --include=*.ts --include=*.tsx` → no result.

**Confirmation**

- [ ] Every verification result read, not declared. Each new test goes red with its production change reverted, proven per case.
- [ ] `npm run typecheck`, `npm run test`, and `npm run lint` each run with `set -o pipefail` and each tail read — a piped gate exits with the pipe's status and has masked a red suite before.
- [ ] User: Nathan's rename pass, taken at the `[Stop: …]`.

**Continuity**

- [ ] Reconciliation complete; `CorePM.md`, `ConnectionsPM.md`, and `FrameworkPM.md` read true; both planning documents updated.
- [ ] Every deviation fixed or carrying Nathan's ruling.

**Confidence**

- [ ] Gates green from clean on `ef88befe3..HEAD`.
- [ ] Every Baseline count moved as the plan said, or the difference is in Deviations.
- [ ] Diff size reported, comments and tests excluded, with `Core/Testing/memoryStores.ts` reported separately — it is test infrastructure and must not be counted as the shipped win. The expectation is roughly flat, not negative: `ddl.ts` and `scan.ts` shrink, `indexSeed.ts` grows, and the rest hold.
- [ ] Seed timing against a real nexus reported beside the pre-merge figure.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run. Edits found in adjacent files that no task made belong to Nathan — folded into the commit at hand, not reverted.

- [ ] Phase review dispatched: Phase 1 · Phase 2 · Phase 3
- [ ] All findings fixed or ruled on
- [ ] Neutral verification passed on `ef88befe3..HEAD`
- [ ] Final pass: gates · baseline · diff · deviations · criteria
- [ ] Reconciliation walked; living documents read
- [ ] Report delivered

#### Reconciliation

- `.claude/Features/CorePM.md` — "**The content index** (`mentions`, `page_values`, `memberships`, `indexed_files`) records which pages mention which titles…" — Task 3.1
- `.claude/Features/CorePM.md` — state table, Content index row: "Which titles each page mentions, the governed values each page carries, the Spaces it tags…" — Task 3.1
- `.claude/Features/CorePM.md` — §Pending: "the FTS table is the one piece of schema still unwritten" — Task 3.1
- `.claude/Features/ConnectionsPM.md` — "the cascade runs it over every file the content index says mentions the title" — Task 3.1
- `.claude/Features/ConnectionsPM.md` — Backlinks: "The content index already records mentions; the surface doesn't exist." — Task 3.1
- `.claude/FrameworkPM.md` — "`nexus.db` carries the content index — which pages mention which titles… the FTS table is the one piece of schema still unwritten." — Task 3.1
- `.claude/Planning/Local Data — Implementation Plan.md` — Phase 2's table-name literal including `'mentions'` and `'memberships'`; unshipped, would ship red — Task 3.2
- `.claude/Planning/Heading Links — Implementation Plan.md` — "`mentions(path, title)` keeps its shape and `queryMentions(title)` its contract" as a frozen interface — Task 3.2
- `Core/Connections/scan.ts` — the file-head comment's "without giving them a link-graph edge"; an embed is a row now, though the cascade still sweeps it — Task 1.1
- `Desktop/Store/ddl.ts` — the `rebuildIndex` comment claiming a generation step drops the index tables outright, which was never true of a retired name — Task 2.1
- `Desktop/Store/open.test.ts` — the stale-generation case named "truncates the index tables", which describes the retired `truncateIndex` rather than what `rebuildIndex` does — Task 2.6

#### Report & Closure

Written when the chain is confirmed, per the skill's shape: the feature, phase by phase, verification, deviations, open items, diff, and a closing stance.

### Open Items

- None.

### Deviations

- **Phase 1, Task 1.1** — `Core/Connections/scan.ts` read 147 lines while the two extractors still stood beside `linksIn`, and 117 once Task 2.5 retired them; the Baseline's 115 was the end-state estimate and the two-line difference is the retained `/** */` lines.
- **Phase 2, Task 2.4** — `keyValue()` sits between `k` and `underPrefix` in the real file, not between `contentIndex` and `memoryStores` as the AFTER block's framing said; it was left in place so the untouched factories carried no boundary hunks.
- **Phase 2, Task 2.6** — `Core/MarkdownPM/regression-pins.test.ts` held the third hand-rebuilt code mask the Baseline counted; its pin now reads `s.inCode`, so `grep -rn "codeMaskOf"` retires from 6 to 4 (the definition, its one internal caller, and `docScan.ts`'s import and call) rather than to 5. Recorded rather than reverted: the pin now tests the mask the scan returns rather than a copy of its construction.
- **Phase 2, Task 2.6** — the table-boundary case cannot pin `indexSeed.ts`: micromark ends a table at a footnote-definition line, and `citationHeadRe` never matches a leading pipe, so no `[^1]:` inside a table region opens a citation block in either the editor or the indexer. The case asserts both facts and the resulting rows; it is a pin on `detect.ts`, not on the producer.
- **Phase 2, Task 2.6** — `Core/Index/indexMaintenance.test.ts`'s membership case was retitled from "lands in memberships" to "lands as a space row"; the assertion is unchanged.
- **Phase 2, Review Checkpoint** — the live corpus moved between the two snapshots (one draft removed, two drafts and this plan added, one page edited), so the memory-store figures read 217 files against 216. Every relationship delta is otherwise accounted for: the ten new `(path, target)` pairs are the `§`-run self-mentions the plan accepts, the `space` set is identical row for row, and the heading-mention deltas belong to the moved drafts.
- **Phase 2, Review Checkpoint** — NexusOS writes every `![[ ]]` inside an inline code span and its one footnote holds an external URL, so `embed` and `citation` carried zero rows on the real corpus; a temporary probe page (deleted after) produced all five kinds with the citation overlay and the embed-in-footnote rows as specified.
- **Phase 3, Task 3.2** — `.claude/Planning/Local Data — Implementation Plan.md` was deleted from the working tree by Nathan during ratification; awaiting his ruling on whether the deletion stands, in which case that half of Task 3.2 falls away.
