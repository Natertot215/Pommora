## Unwrapped Frontmatter — Implementation Plan

> **Status:** ratified — in execution (08-31-2026) · Spec: [[Unwrapped Frontmatter — Decision Log]] · Execute tasks in order · Progress artifact: see Completion Criteria.
> Citations name files and symbols at HEAD `2ee4e077`; re-derive before editing.

**Goal**

Property values live in Markdown frontmatter under bare Obsidian-style keys (`Status:`, `Tags:`) instead of `<Status>:`; Context relations live under `<Projects>:` instead of `(Projects):`; Select and Status values are one-element lists so an Obsidian List and a Pommora Select edit each other. An edit made outside Pommora — Obsidian, an agent, a hand — appears in an open view within one watcher settle, resolves by one rule when its shape is off, and is canonicalized on disk the next time a value is deliberately set on that file. Renaming a property onto a key the vault already uses is refused instead of destroying data.

The shape: the registry name match becomes the sole ownership gate (the sigil's only architectural job was answering "ours?" without a registry in hand); the two governed-page writers collapse to one, and that writer runs the one reconcile — `reconcileContextKeys` generalized with a property arm and an `adoptions` output — over the whole file on every governed page write, loading the strict Contexts world only when an exact-match pre-check finds drift; the content index records every frontmatter key so a newly registered name finds its holders on the first query. Alternatives weighed and rejected are in the log's Considered & Rejected: case-folding key translation, a translation layer over wrapped keys, repair-on-load by default, written-key-only repair, adoption on the schema chain, a strict round-trip as the repair. Settled by Nathan across 08-31-2026; the phase order (writer unification first, as a behavior-preserving refactor) settled by the explorer's lock and byte-identity evidence.

Bounded by: no migration code exists in the app — the executor converts the vault once with a throwaway scratchpad script at Gate 1; Contexts change nothing but the sigil; no Text property type; Agenda pages get no property repair; net reduction is required in concepts and tests, not a set line count.

**Requirements**

1. Phase 0 first strips every target file's comments to why-only (so no file asserts the old truth while the change lands), then collapses the writers: `setPageContext` delegates to `setGovernedRootKeys`; `optionOps.optionValues` is deleted; `restoreCachedValues` writes through `updatePageProperty`. Zero behavior change, zero test change.
2. Bare property keys: ownership is exact-case registry-name match; `governedKeys.ts` is deleted; `(X)` → `<X>`; `propertyKey(def)` collapses to `def.name`; the four property-shape sites go registry-driven.
3. A reserved-name rule (`KIND_ID_KEY` ∪ `PAGE_MODELED_KEYS`, plus a leading `<`) in `invalidPropertyName`; a rename onto a key any Collection page already holds is refused before the journal is staged.
4. Select/Status are one-element lists on disk; one shape rule for the option types (normalize to list; Select/Status keep the last valid element; Multi-Select keeps every valid one); `rewriteRaw` takes the array path for all option types and loses its `type` parameter; checkbox `false` decodes as no value.
5. One reconcile with a property arm and `adoptions`, run by the one writer when handed a world, whole-file, with the three precedence rules; the strict Contexts world loads only when the drift pre-check fails and is skipped when its load fails on a property write; adoption is `mutateRegistry`-only; the property arm is the one standing check.
6. The content index records all keys; an index-generation mismatch truncates the two index tables (never the database); `renameCascade` filters frontmatter patches against the registry.
7. A `values:changed` push fed by the watcher and by main's own writes (operation-level, per container, with page ids); the epoch union; id-scoped override retirement with an in-flight marker; `refreshValues` deleted; `GroupFrame` subscribes.
8. Two toggles in Settings' Properties leaf: the on-load repair sweep (default off, detection in the seed loop, deep-equal drift) and Capitalize All Metadata (Title Case each word, every property-name render site except the rename fields).
9. Clear Exclusion strips sidecars, `<Context>` keys, and the stamps only; `preservePropertiesOnClear` and the unwrap arm are deleted.
10. Every document the change falsifies is rewritten in the commit that falsifies it — carried by the Made False table; each row's task cites this requirement.

**Acceptance — the whole thing working:** In a scratch nexus with a Collection assigning Select `Status` (Open/Active/Done), Multi-Select `Tags` (alpha), and Number `Priority`, and its Table view open: an external write replaces one page's frontmatter with `Status:\n  - Open\n  - Active\nTags:\n  - alpha\n  - zeta\nPriority: 2\nfoo: bar` — within one settle the row shows Status **Active** and Tags **alpha, zeta** (zeta uncolored) without the container being reopened. Setting `Priority` to 3 in that row rewrites the file to `Status:\n  - Active`, adopts `zeta` into `properties.json`'s `Tags` options, leaves `foo: bar` byte-identical, and the file diffed against eemeli/`yaml`'s stringify of its parsed object is empty. Renaming `Status` → `foo` is refused naming one holder. An independent agent handed the pre-plan and post-plan trees and asked "which is more sustainable" answers the post-plan tree.

**Forced By**

- `serializeOnFile` refuses only same-key re-entry; `serializeSchemaOp` wedges the process on any nested await (`schemaChain.ts:4`) → adoption never enters the chain (Task 13); Phase 0's delegation is legal because `setGovernedRootKeys` takes no lock (Task 1).
- `queryKeyHolders` returns `[]` for an indexed-but-unheld key and `null` only with no index → an index filtered by "governed" never re-indexes a page whose key was registered later; the index records all keys (Task 6) and the rename refusal confirms holders per file (Task 9).
- `governedWrite.ts:3–8`: an unassign is signalled by a key's absence from `next` → the writer's reconcile must never reassert a caller-governed key from the disk root (Task 16's three rules).
- `loadContextWorld` fails the whole world on one corrupt `_space.json`, and the lenient walk drops that Space → a property write whose strict load fails skips the context arm (Task 17).
- Every reconcile seam is synchronous (`Rewrite<C>`, `rewritePageSerialized`'s callback, `mutateRegistry`'s `fn`) → adoptions are returned and applied after (Tasks 14, 15, 16, 21).
- Obsidian rewrites `Tags` → `tags` and treats a List and a one-element list identically; Pommora's writer and Obsidian's produce identical bytes (executed) → the list shape (Task 10) and no serialization change.
- `writeEcho` makes the watcher blind to app writes → the write leg of the push is mandatory (Task 20).
- `getLiveTree()` has no disk fallback and is null pre-walk → a null tree means "load strict" in the pre-check (Task 17).
- `src/shared` imports nothing from `src/main` → the `Adoption` type lives in `src/shared/propertyValue.ts` (Task 13).

**Inherited Reasoning:** the log's Considered & Rejected, in full — notably: first-wins was rejected for last-valid (appending writers put the newest entry last); written-key-only repair does no work for properties because a set replaces the value; the lenient tree may detect drift but never be the reconcile's world (a lenient miss strips valid tags, `contextWrite.test.ts:147`); skipping the rename-refusal check when the index is cold reopens the collision exactly in the post-reset window.

**Grounding** *(re-open these; don't cite them)*

- [[Unwrapped Frontmatter — Decision Log]] — the spec; §Carriers names each task's seam.
- `src/shared/governedKeys.ts`, `contexts.ts:27–64`, `propertyValue.ts`, `properties.ts`, `contextResolve.ts`, `schemas.ts:68–85`, `bridge.ts:375–395`, `types.ts:116–168, 280–303, 405–426`, `identity.ts:9–18`.
- `src/main/CRUD/governedWrite.ts`, `contextWrite.ts:45–188`, `page.ts:123–146`, `pageValue.ts:17–81`, `optionOps.ts:94–135, 229–237, 274–287`, `registryProperty.ts:80–160`, `keyHolders.ts`, `governedSweep.ts:27–147`, `restoreScrub.ts:31–151`, `standing.ts`, `restoreProperty.ts:65–83`, `removeProperty.ts:97–148`, `replaySchemaCascade.ts:58–92`, `cascade.ts:25–53`, `schemaChain.ts`.
- `src/main/IO/propertiesRegistry.ts:47–89`, `pageFile.ts:78–152`, `fileLock.ts:1–36`, `writeEcho.ts:10–16`; `src/main/indexSeed.ts:31–65, 137–169`; `Database/contentIndex.ts:39–41, 122–135`; `Database/schema.ts:8–36`; `Connections/rewrite.ts:58–73`, `scan.ts:46–58`; `exclusionScan.ts:28, 67–102`; `Properties/schema.ts:8–21`; `readNexus.ts:118–146, 362–377, 670–681, 712`; `liveTree.ts`; `adopt.ts:62–75`; `index.ts:394–437, 522–526`; `settings.ts:52–68`; `watcher.ts:146–174`; `watchPatch.ts:52–63, 110–115, 194–209, 267–291`; `mutate.ts:236–242, 633–648, 714–722`.
- `src/renderer/Store/RenameSlice.ts:47–53, 189–211`; `Views/useValuesEpoch.ts`; `Views/useViewHost.ts:68–86, 169–172, 298–303`; `Views/CardView/CardsView.tsx` (refreshValues ×6); `Views/TableView/TableView.tsx:1145–1161`; `Frames/GroupFrame.tsx:164–166, 779–788, 829–831`; `Properties/Assignment/columnLabel.ts`; `Properties/value.ts:75–107`; `Properties/PageProperties.tsx:75–83, 285`; `Windows/WindowInspector.tsx:93–100, 168, 302`; `Properties/PropertyFrame.tsx:94, 153, 252–258, 344, 355, 424`; `Properties/PropertyTypes.tsx:76`; `Views/CardView/CardAddPicker.tsx:39`; `Settings/SettingsWindow.tsx:192–200, 389–399`; `App.tsx:129–131`; `Testing/propsAtRoot.ts`; `src/preload/index.ts:21–29, 246–251`.
- `.claude/Guidelines/Development-Environment.md` — gates, pipefail, lint-warnings-in-text, no whole-tree git ops, main/preload don't HMR.

**Environment:** Plan directory `.claude/Planning`. Spec: the decision log. Explorer: `Explore`. Research: general-purpose with web (used in the brainstorm). Code reviewer: `feature-dev:code-reviewer`. Attack reviewer: `build-breaking-agent`. Neutral verifier: `general-purpose`, handed the claim, the log, this plan, and the range only. Simplification: `code-simplifier` then `comment-killer-agent`. Gates: from `Pommora/`, `npm run typecheck && npm run test && npm run lint` — exit codes read directly, never piped; `lint` also demands `Found 0 warnings` in its text. Rules directory: `.claude/Guidelines`.

**Shapes:** refactor (Phase 0) · removal (`governedKeys.ts`, the unwrap arm, `refreshValues`, `type` threading) · additive (predicate, coercion, reconcile arm, push, toggles) · migration (on-disk key and value format — manual pass, hand-run) · fix (`false` filter parity; index staleness) · user-visible (toggles, unadopted chip, Created column) · live-data (Nathan's vault).

**Declared Stops**

- **Gate 1** — the point of no return for on-disk format. **The executor runs the vault pass** (M-1/M-2 in the log: `<Prop>` → bare with bare-twin-wins and empty-twin-absent, `(Ctx)` → `<Ctx>`, Select/Status written as lists, `.trash` swept, `properties.json` re-registered, `.nexus/property-cascade.json` cleared) as a throwaway script in the scratchpad, per Nathan's conversion instructions recorded under Rulings, **after a backup** (a git commit of NexusOS if it is a repository, else a dated copy of `.nexus/` and every touched `.md`). Then it opens NexusOS on the Phase 1 build, runs the automated Gate 1 checks (Rulings), pings Nathan, and continues — the pass is reversible from the backup, and every later phase runs against scratch nexuses until closeout.

**Global Constraints (every task inherits these):**

- Gates from `Pommora/`: `npm run typecheck && npm run test && npm run lint`, `set -o pipefail` on any pipeline, and `Found 0 warnings` read from lint's text.
- Biome formats on write via the PostToolUse hook; an Edit failing on whitespace means re-read and retry. Shell-driven edits run `npm run format` after.
- One tree-touching writer at a time. Never `git stash`, `checkout .`, `clean`, or `reset` — another session may be active. Stage explicit paths only. Nathan's unattributed doc edits ride the commit at hand.
- `src/main` and `src/preload` don't hot-reload: after any main-side task the dev process restarts before anything is verified live; 17 of the 23 tasks touch main.
- `src/shared` imports no fs, no React, and nothing from `src/main`. Main owns the filesystem. IPC returns the `Result` envelope; a `window`-kind handler self-wraps.
- Comments: the shipped code carries at most one load-bearing why per change; never restate a value; never narrate. The plan's fences carry only path markers and contract edges — an implementor transcribes nothing else into code.
- Commit granularity: one commit per task, message on the task heading, ticks in the same commit.
- Out of scope everywhere: Sapphire; `.claude/Mobile`; the Text type; any Context change beyond the sigil; migration code; the echo window.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| [[ContextsPM]] | every `(Title)` example and "parenthesized title keys" | the sigil becomes `<Title>` | 4 |
| `.claude/CLAUDE.md` §The Model | "resolved through the registry via parenthesized `(Title):` keys" · "assigned as frontmatter via `<Property>:` syntax" · "bare, natively typed values under wrapped title keys" | bare property keys, `<Context>` keys | 5 |
| [[ArchitecturePM]] §Mutations | "Pommora recognizes its own frontmatter keys by their wrap alone — `(Context)` … `<Property>` … no reserved-name blocklist" | the registry match is the gate; a reserved list exists | 5 |
| [[PagesPM]] §On-Disk Shape | "the wrapped keys — `(Context)` keys naming Spaces, and one `<Property>` key per value" | bare property keys, `<Context>` keys | 5 |
| [[PropertiesPM]] Identity & Values, example | "wrapped as `<Name>`" · "An unmatched wrapped key persists inert" · the `(Projects)`/`<Tags>` example | bare keys; foreign is any key the registry doesn't name | 5 |
| [[ArchitecturePM]] §Folder Exclusion · [[ConfigurationPM]] | the "keep values" / unwrap description | Clear strips bookkeeping only | 7 |
| [[PropertiesPM]] Validation | "a rename onto a taken name is refused" (registry-only) | refused also when a page holds the new key | 9 |
| [[PropertiesPM]] Type Catalog, Validation | "Select `<Stage>: Active` bare string" · "Status … bare label" · `"2026-06-15T14:30:00Z"` · "checkbox `false` … real values and stay" · Known Issue on the stray Multi-Select string | list-shaped Select/Status; zoneless already; `false` ≡ absent; the issue is gone | 10 |
| [[PropertiesPM]] §Shared Mechanisms | (no repair described) | repair-on-write, adoption, the sweep toggle | 21 |
| [[PropertiesPM]] §Shared Mechanisms · `ContextPM` §Pending | (no Capitalize toggle; no K-5 guidance; no Text-type prospect) | the toggle, the lowercase-or-nothing guidance, the prospect | 22 |

**Dead Vocabulary**

- `wrapKey` · `parseGovernedKey` · `isGovernedKey` · `governedKeys'` (the import path) · `GovernedLayer` → expect 0 in `src/`. Legitimate hits: none.
- `propertyKey(` → 0. `preservePropertiesOnClear` → 0. `refreshValues` → 0. `propertyValueStands` → 0. `'prefer-new'` with `--glob '!*.test.*'` → 3 (`pageFile.ts:120` the union member, `:166` the compare, `registryProperty.ts` the during-sweep case).
- Control: `parseContextKey` → ≥ 6. Zero here means the sweep never ran.

**Hazard Window:** Task 4 opens it — from the first Phase 1 commit, the running build reads bare keys and a vault still holding `<Prop>` keys renders those values as foreign. Nothing closes it in code; **Gate 1's manual pass** closes it. **`npm run dev` reopens the last nexus by itself at launch** (`session.ts:42–48` `resolveRestorePath` reads `config.lastNexusPath` from `pommora.json` under `userData`, written by the user-adopt path `adoptNexusInner` at `index.ts:477–490`; `TEST_NEXUS_PATH` never steers the app). So the ordering step, **before Task 4's first commit:** open a scratch nexus through the picker in the running app once, so the restore points there for every Phase 1 restart — 17 tasks touch main and each restarts the dev process. Task 4's Verify carries the box. Task 6's index generation rides Phase 1 so the index rebuilds on that same first open, leaving `local_state` whole.

---

### Phase 0 — One writer for governed page roots

#### Task 0: Strip the old truth from the target files' comments

**Requirement:** 1

**Why:** The files this plan rewrites carry prose asserting what is about to become false — "governance is by shape," "the ONE answer for every path that puts a value back," "a key already wearing it is genuinely the fresher," "every single-option kind … = bare string." An implementer reading them mid-plan is steered against the spec. Strip each target file to why-only comments before any behavior changes, so later tasks add the one new why they need to a clean slate instead of arguing with a paragraph.

**Now** — baselines recorded at execution: `rg -F "KNOB" src` → 144; `rg -F "(Nathan" src` → 2:

```ts
// Targets — every file a later task's Now fence names:
// src/shared/{governedKeys,contexts,propertyValue,properties,contextResolve,schemas,bridge,types}.ts
// src/main/CRUD/{governedWrite,contextWrite,page,pageValue,optionOps,registryProperty,keyHolders,governedSweep,restoreScrub,standing,restoreProperty,removeProperty,replaySchemaCascade,cascade,schemaChain}.ts
// src/main/{indexSeed,exclusionScan,readNexus,watcher,watchPatch,mutate,index,session,liveTree,adopt,settings}.ts · src/main/CRUD/assignment.ts · src/main/IO/{propertiesRegistry,pageFile,fileLock,writeEcho}.ts · src/main/Database/{contentIndex,schema,open}.ts · src/main/Connections/{rewrite,scan}.ts · src/main/Properties/schema.ts
// src/renderer/Store/RenameSlice.ts · Views/{useValuesEpoch,useViewHost}.ts · Views/CardView/CardsView.tsx · Views/TableView/TableView.tsx · Frames/GroupFrame.tsx · Properties/{value,PageProperties,PropertyFrame}.tsx|ts · Properties/Assignment/{columnLabel,Cell,usePropertyRows}.ts|tsx · Windows/WindowInspector.tsx · Testing/propsAtRoot.ts · src/preload/index.ts
```

**Becomes** — the same files, each comment either a why the code can't show or gone. Anything describing the sigil, the wrapped shape, "governance by shape," the scalar Select contract, `prefer-new`'s freshness argument, `standing.ts`'s one-answer header, or `refreshValues`' purpose is removed outright — not rewritten to the new truth, which each later task states once where it lands. `KNOB` markers and `(Nathan's call)` markers survive untouched. No code changes.

**Skills:** `comment-killer-agent`, briefed with this task's removal list and the survive list.

**Verify — automated**

- [x] `git diff --stat` touches only the target files (26 of the 60 needed cuts); the code-line grep flags the two trailing-comment lines named under Deviations, nothing else.
- [x] `rg -F "governance is by shape" src` → 0; `rg -F "the ONE answer" src` → 0; `rg -F "genuinely the fresher" src` → 0. Controls: `KNOB` 144 = baseline; `(Nathan` 0 (baseline moved to 0 by `345a82ab`, Deviations).
- [x] typecheck 0 · 304 files / 3749 tests · Biome clean over the touched files; `git diff --stat -- '*.test.*'` empty.

**Verify — user**

- [ ] *(none)*

#### Task 1: `setPageContext` delegates to `setGovernedRootKeys`

**Requirement:** 1

**Why:** Two writers hand-roll the same merge; every later repair mechanism (world load, key widening, adoption spend) would otherwise be built twice and one copy deleted. This is the behavior-preserving refactor the whole reconcile lands into.

**Now** — `rg -F "mergeFrontmatter(" src/main/CRUD/contextWrite.ts` → 1:

```ts
// src/main/CRUD/contextWrite.ts:155-166
    const keys = governedContextKeys(raw, applied.value.root, applied.value.key)
    const modeled: Raw = { modified_at: nowIso() }
    for (const k of keys) if (k in applied.value.root) modeled[k] = applied.value.root[k]
    const content = mergeFrontmatter(
      existing,
      modeled,
      [...keys, 'modified_at'],
      splitEnvelope(existing).body,
    )
    await atomicWriteFile(absFile, content)
    return ok(null)
```

```ts
// src/main/CRUD/governedWrite.ts:20-32 — unchanged this task
export async function setGovernedRootKeys(
  absFile: string,
  next: Record<string, unknown>,
  govern: readonly string[],
): Promise<void>
```

**Becomes**

```ts
// src/main/CRUD/contextWrite.ts
    const keys = governedContextKeys(raw, applied.value.root, applied.value.key)
    const next: Raw = {}
    for (const k of keys) if (k in applied.value.root) next[k] = applied.value.root[k]
    await setGovernedRootKeys(absFile, next, keys)
    return ok(null)
```

`mergeFrontmatter`, `splitEnvelope`, `nowIso` imports drop from `contextWrite.ts` where no other use remains (`atomicWriteFile` stays — `:248`).

**Assumed by:** Task 16 (the writer's world parameter lands on this one call path).

**Verify — automated**

- [x] `npx vitest run src/main/CRUD/contextWrite src/main/CRUD/governedWrite src/main/CRUD/writePathRace` → 26 pass (14 + 6 + 6), no test file modified.
- [x] typecheck 0 · full Vitest green · Biome clean on the file.
- [x] `rg -F "mergeFrontmatter(" src/main/CRUD/contextWrite.ts` → 0. Control on `governedWrite.ts` → 1.

**Verify — user**

- [ ] *(none — byte-identical output)*

#### Task 2: One `optionValues`

**Requirement:** 1

**Why:** Two identical definitions of one thing; the shared one is the one every other consumer imports.

**Now** — `rg -n "export function optionValues" src` → 2:

```ts
// src/main/CRUD/optionOps.ts:96-100
export function optionValues(def: PropertyDefinition): string[] {
  if (def.type === 'status')
    return (def.status_groups ?? []).flatMap((g) => g.options.map((o) => o.value))
  return (def.select_options ?? []).map((o) => o.value)
}
// src/shared/properties.ts:200-206 — the one that stays
```

**Becomes** — `optionOps.ts` imports `optionValues` from `@shared/properties`; its local definition is deleted. The compiler lists any caller that imported the main copy.

**Verify — automated**

- [x] `rg -n "export function optionValues" src` → 1 (`src/shared/properties.ts`). Control: `dropOptionFromDef` → 1.
- [x] typecheck 0 · full Vitest green · Biome clean; `optionOps.test.ts` unmodified. The only importer of the main copy was `replaySchemaCascade.ts`; `optionOps.ts` itself never read it.

**Verify — user**

- [ ] *(none)*

#### Task 3: `restoreCachedValues` writes through `updatePageProperty`

**Requirement:** 1

**Why:** A third hand-rolled one-key write; its sibling `restoreProperty.ts:81` already routes correctly, and Phase 3 makes `updatePageProperty` the only path that can run the standing check.

**Now**

```ts
// src/main/CRUD/removeProperty.ts:136-146
    const wrote = await rewritePageSerialized(file, (content) =>
      !sweepAdmits(content)
        ? null
        : mergeFrontmatter(
            content,
            { [key]: encodeValue(standing.value), modified_at: nowIso() },
            [key, 'modified_at'],
            splitEnvelope(content).body,
          ),
    )
```

**Becomes**

```ts
// src/main/CRUD/removeProperty.ts
    const wrote = await serializeOnFile(file, async () => {
      const content = await readTextOrNull(file)
      if (content === null || !sweepAdmits(content)) return false
      return (await updatePageProperty(file, def, standing.value)).ok
    })
```

`key` (`propertyKey(def)` at `:115`) is no longer needed here; `mergeFrontmatter`/`splitEnvelope`/`nowIso`/`encodeValue` imports drop where unused.

**Verify — automated**

- [x] `removeProperty` suite green inside the full run, tests unmodified.
- [x] `rg -F "mergeFrontmatter(" src/main/CRUD/removeProperty.ts` → 0. Control: `updatePageProperty(` in `CRUD/` non-test → 3.
- [x] typecheck 0 · 304 / 3749 · Biome clean on the file.

**Verify — user**

- [ ] *(none)*

#### Gate 0 — one writer, behavior unmoved

- [x] typecheck 0 · Vitest 304 / 3749 · `biome check .` clean, no warnings line.
- [x] Every task's **Verify — automated** ticked against a result just watched.
- [x] `git diff b1c0bdc8..6d720e31 --stat -- '*.test.*'` is empty (the phase's own range; `a4037b94..` also carries the parallel session's fixture scrub `345a82ab`).
- [x] Simplifier (two edits: a destructure in `setPageContext`, one comment line), code review (clean), attack review (0 findings, 8 kills; byte-parity probes over set, unassign-delete, and restore, `oldWrote === true` asserted).
- [x] The one concern — the simplifier's TOCTOU — carries a ruling (Log).
- [x] Progress hashes filled in.
- [x] Not a declared stop — Phase 1 opens.

---

### Phase 1 — Keying: the registry is the gate

#### Task 4: The sigil is the Context's alone; `governedKeys.ts` dissolves

**Requirement:** 2, 10

**Why:** One sigil, one layer. The property layer's ownership moves to the registry match (Task 5); what's left of the syntax module is three context helpers and three name helpers, each belonging beside its layer's other code.

**Now** — `rg -l "governedKeys'" src` → 17 (the `@shared/…` importers: `governedSweep.ts`, `indexSeed.ts`, `restoreScrub.ts`, `exclusionScan.ts`, `registryProperty.ts`, `replaySchemaCascade.ts`, `Properties/schema.ts`, `RenameSlice.ts`, `PropertyFrame.tsx`, `propsAtRoot.ts`; the relative `./governedKeys` importers `contexts.ts`, `propertyValue.ts`, `governedKeys.test.ts`; and four tests — `removeProperty.test`, `assignment.test`, `page.test`, `cascade.test`):

```ts
// src/shared/governedKeys.ts:12-16
export type GovernedLayer = 'context' | 'property'
const SIGIL: Record<GovernedLayer, readonly [string, string]> = {
  context: ['(', ')'],
  property: ['<', '>'],
}
// :29-31 wrapKey · :37-40 isGovernedKey(key, layer?) · :44-51 parseGovernedKey
// :55-57 normalizePropertyName · :59-62 invalidPropertyName · :21-27 KEY_REFUSAL, RESERVED_NAME_PREFIX
```

```ts
// src/shared/contexts.ts:28-43
export function contextKey(title: string): string { return wrapKey('context', title) }
export function isGovernedContextKey(key: string): boolean { return isGovernedKey(key, 'context') }
export function parseContextKey(key: string): string | null {
  const parsed = parseGovernedKey(key)
  return parsed?.layer === 'context' ? parsed.name : null
}
```

**Becomes**

```ts
// src/shared/contexts.ts
const SIGIL = ['<', '>'] as const

export function contextKey(title: string): string
export function isGovernedContextKey(key: string): boolean // prefix test
export function parseContextKey(key: string): string | null // '<Projects>' → 'Projects'; '<>' and unwrapped → null
```

```ts
// src/shared/properties.ts
export const RESERVED_NAME_PREFIX = '$'
export const KEY_REFUSAL = { empty, reservedPrefix, duplicate } as const
export function normalizePropertyName(raw: string): string
export function invalidPropertyName(name: string): boolean
```

`src/shared/governedKeys.ts` and `src/shared/governedKeys.test.ts` are deleted. Every `'(…)'` fixture in `contexts.test.ts`, `contextResolve.test.ts`, `contextWrite.test.ts`, `contextCascade.test.ts`, `restoreScrub.test.ts`, and the `readNexus`/`watchPatch` tests becomes `'<…>'`. `restoreScrub.ts:102` `parseGovernedKey(key)?.layer !== 'context'` becomes `parseContextKey(key) === null`. Tasks 4 and 5 land as one commit, since the property-layer callers of `wrapKey('property', …)` have no home in between. [[ContextsPM]]'s examples are rewritten here.

**Assumed by:** Tasks 5, 6, 7.

**Verify — automated**

- [ ] Red first: the context fixtures rewritten to `<…>` fail on the old sigil (`contexts.test`, `contextResolve.test` — expect ≥ 8 failures); then green.
- [ ] `rg -F "governedKeys'" src` → 0. Control: `rg -F "@shared/contexts" src` → ≥ 10.
- [ ] `rg -F "['(', ')']" src` → 0. Control: `rg -F "['<', '>']" src/shared/contexts.ts` → 1.
- [ ] Full gates green.

**Verify — user**

- [ ] **Before this task's commit:** the running dev app has a scratch nexus open (picked through the picker, so `pommora.json`'s `lastNexusPath` points at it), not NexusOS.
- [ ] *(the rest carried to Gate 1's stop)*

#### Task 5: Ownership is the registry name; `propertyKey(def)` is `def.name`

**Requirement:** 2, 10

**Why:** The sigil answered "ours?" without a registry; the registry match now answers it everywhere, in both processes, from names both already hold.

**Now** — `rg -c "wrapKey|propertyKey\(" src --glob '!*.test.*'` → 33 across 16 files; `propertyKey(def)` callers → 14:

```ts
// src/shared/propertyValue.ts:158-160
export function propertyKey(def: PropertyDefinition): string {
  return wrapKey('property', def.name)
}
// callers: page.ts:50,142 · deleteProperty.ts:35,78 · removeProperty.ts:44,115 · optionOps.ts:152,226
//          replaySchemaCascade.ts:77,88 · restoreScrub.ts:53 · value.ts:107 · PageProperties.tsx:76 · WindowInspector.tsx:98
// src/renderer/Store/RenameSlice.ts:209 · Properties/PropertyFrame.tsx:257 — wrapKey('property', before/after)
// src/main/CRUD/registryProperty.ts:88-89 — const oldKey = wrapKey('property', oldName)
// src/main/CRUD/replaySchemaCascade.ts:60 — const key = wrapKey('property', journal.name)
// src/renderer/Testing/propsAtRoot.ts:15 — [d ? wrapKey('property', d.name) : id, v]
```

**Becomes**

```ts
// src/shared/properties.ts
export function isRegisteredPropertyName(key: string, names: ReadonlySet<string>): boolean // exact case
export const propertyNames = (defs: Iterable<PropertyDefinition>): ReadonlySet<string> => new Set([...defs].map((d) => d.name))
```

`propertyKey(def)` is deleted; all 14 callers read `def.name`. `RenameSlice.ts:209` and `PropertyFrame.tsx:257` bump with `before`/`after` bare. `renameSweep` builds `oldKey = oldName`, `newKey = newName`. `replaySchemaCascade.ts:60` uses `journal.name`. `propsAtRoot.ts` maps to `d.name`. `value.ts:107` reads `fm[def.name]`. `useValuesEpoch`'s re-key (`oldKey in root`) is unchanged — it consumes whatever the bump passes. `.claude/CLAUDE.md` §The Model, [[ArchitecturePM]] §Mutations, [[PagesPM]] §On-Disk Shape, and [[PropertiesPM]] Identity & Values are rewritten here.

**Assumed by:** Tasks 6, 9 (the name `Set` and the bare-key sweeps), Task 18 (the epoch's bare `oldKey`/`newKey`).

**Verify — automated**

- [ ] Red first: a `value.test.ts` case decoding `{ Status: 'Active' }` (bare key) against a `Status` def fails while `propertyKey` still wraps; then green. Fixtures across the wrapped-key test files (`rg -l "<Status>|<Stage>|<Tags>" src --glob '*.test.*'` → 16 today, re-derived at execution) rewrite to bare keys and stay green.
- [ ] A new `properties.test.ts` case: `isRegisteredPropertyName('tags', names)` true only on exact case; `'Tags'` false when `'tags'` is registered.
- [ ] `rg -F "propertyKey(" src` → 0. `rg -F "wrapKey" src` → 0. Control: `rg -F "def.name" src` → ≥ 20.
- [ ] Full gates green.

**Verify — user**

- [ ] *(carried to Gate 1's stop)*

#### Task 6: The four property-shape sites; the index records every key; the index generation

**Requirement:** 2, 6

**Why:** Registering a property whose key already sits in the vault writes no file; an index filtered by "governed" would never see those pages and every cascade would miss them forever. Recording every key makes the index registry-independent, the rule the parse cache already follows; the gate moves to the two consumers. The stale wrapped-key rows must be rebuilt on the first post-change open — by truncating the two index tables, never by dropping `nexus.db`, which also holds page aliases and every dashboard layout (`local_state` scopes `aliases`, `blockDoc`; executed: a version mismatch removes them all).

**Now**

```ts
// src/main/indexSeed.ts:43-50
export function governedValues(content: string): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  const fm = splitFrontmatter(content) as Record<string, unknown>
  for (const [key, value] of Object.entries(fm)) {
    if (isGovernedKey(key, 'property')) values[key] = value
  }
  return values
}
// src/main/CRUD/governedSweep.ts:70-73
const changedKeys = (raw: Raw, next: Raw): string[] =>
  [...new Set([...Object.keys(raw), ...Object.keys(next)])].filter(
    (k) => parseGovernedKey(k) !== null && JSON.stringify(raw[k]) !== JSON.stringify(next[k]),
  )
// src/main/CRUD/cascade.ts:40
      const patch = rewriteFrontmatterConnections(governedValues(content), oldKey, newTitle)
// src/main/CRUD/restoreScrub.ts:52-53 · :71-77
    if (def) defs.set(propertyKey(def), def)
    const governed = parseGovernedKey(key)
    if (!governed) continue
    const standing = governed.layer === 'property' ? propertyValueStands(world.defs.get(key), raw) : contextTagStands(world.contextSpaces.get(key), raw)
// src/main/Database/schema.ts:8-11
/** A mismatch drops + recreates the file. Bump when an EXISTING table's shape changes; … */
export const SCHEMA_VERSION = 1
// src/main/Database/open.ts:41-54 — the mismatch path: removeDbFiles(dbPath)
```

**Becomes**

```ts
// src/main/indexSeed.ts
export function frontmatterValues(content: string): Record<string, unknown> // every key, registry-independent
// src/main/CRUD/governedSweep.ts
const changedKeys = (raw: Raw, next: Raw): string[] =>
  [...new Set([...Object.keys(raw), ...Object.keys(next)])].filter(
    (k) => JSON.stringify(raw[k]) !== JSON.stringify(next[k]),
  )
// src/main/CRUD/cascade.ts
  const names = propertyNames(Object.values((await readRegistry(nexusRoot)).defs))
  …
      const values = Object.fromEntries(Object.entries(frontmatterValues(content)).filter(([k]) => names.has(k)))
      const patch = rewriteFrontmatterConnections(values, oldKey, newTitle)
// src/main/CRUD/restoreScrub.ts
    if (def) defs.set(def.name, def)
    const def = world.defs.get(key)
    const title = def ? null : parseContextKey(key)
    if (!def && title === null) continue
    const standing = def ? propertyValueStands(def, raw) : contextTagStands(world.contextSpaces.get(key), raw)
// src/main/Database/schema.ts
export const SCHEMA_VERSION = 1
export const INDEX_GENERATION = 2 // a mismatch truncates page_values + indexed_files; local_state is untouched
export function readMeta(db: Database, key: string): string | null // readSchemaVersion generalized; stampSchemaVersion → writeMeta
export function writeMeta(db: Database, key: string, value: string): void
export function truncateIndex(db: Database): void // DELETE FROM page_values; DELETE FROM indexed_files
// src/main/Database/open.ts — version-MATCH branch, on `existing`, after applySchema and before its return at :51
  if (readMeta(existing, 'index_generation') !== String(INDEX_GENERATION)) {
    truncateIndex(existing)
    writeMeta(existing, 'index_generation', String(INDEX_GENERATION))
  }
// fresh-create branch, beside stampSchemaVersion(db) at :60
  writeMeta(db, 'index_generation', String(INDEX_GENERATION))
```

Both exits stamp the generation: a brand-new nexus's second open must not truncate the index it just seeded. `applySchema` has already created the tables on the matched handle when the check runs, so no guard is needed around the truncate.

The registry is read once before `renameCascade`'s loop; `restoreScrub`'s `Map.get` is the predicate. `frontmatterMentions` (`scan.ts:50`) keeps reading every string value — a foreign `[[Link]]` now reaches the mentions table, which is more correct, not less. Truncating `indexed_files` leaves `readIndexedStats()` empty, so the next seed re-reads every file once; `readyDb` is set only after the seed, so queries answer null (corpus fallback) throughout. `SCHEMA_VERSION` stays 1.

**Assumed by:** Task 9 (`keyHolderFiles` on a bare name returns real holders), Task 21.

**Verify — automated**

- [ ] Red first (`indexSeed.test` or new): a page with `foo: bar` + `Status: [Active]` indexes **two** `page_values` rows; `queryKeyHolders('foo')` returns the page. Fails on the filtered version; then green.
- [ ] Crossing test: register `Notes` after indexing a page holding `Notes: x` with no re-read → `keyHolderFiles(root, 'Notes', folders)` includes the page.
- [ ] Generation test (`open.test` or new): a db with `aliases`, `blockDoc`, and `folds` rows plus a stale `index_generation` opens with **all three rows intact** and `page_values` empty; the same db at the current generation opens with `page_values` intact; **a freshly created db, seeded, then reopened keeps its `page_values`**. Red first — with `SCHEMA_VERSION` bumped instead, the rows-intact assertion fails; with the fresh-create stamp missing, the reopen assertion fails.
- [ ] `governedSweep.test` unchanged and green; `restoreScrub.test` context fixtures `<…>` green.
- [ ] `rg -F "governedValues" src` → 0. Control: `rg -F "frontmatterValues" src` → ≥ 3.
- [ ] Full gates green.

**Verify — user**

- [ ] First open after the pass: aliases, dashboard layouts, folds, and tabs all still there. *(carried to Gate 1's stop)*

#### Task 7: Clear Exclusion strips bookkeeping only

**Requirement:** 9, 10

**Why:** Property values are the user's frontmatter now; the scan has no business stripping or unwrapping them. The unwrap arm also became actively lossy (`prefer-new` against a bare Obsidian twin deletes Pommora's Context value).

**Now**

```ts
// src/main/exclusionScan.ts:68-89
function clearRewrite(preserveProperties: boolean): RewriteText {
  return (content) => {
    const keys = Object.keys(readFrontmatterFields(content))
    const governed = keys.flatMap((k) => { const parsed = parseGovernedKey(k); return parsed ? [{ key: k, name: parsed.name }] : [] })
    const bookkeeping = keys.filter((k) => BOOKKEEPING_KEYS.includes(k))
    let text = content
    if (preserveProperties) { for (const { key, name } of governed) { const renamed = renameFrontmatterKey(text, key, name, 'prefer-new'); if (renamed !== null) text = renamed } }
    const remove = preserveProperties ? bookkeeping : [...bookkeeping, ...governed.map((g) => g.key)]
    if (remove.length > 0) text = mergeFrontmatter(text, {}, remove, splitEnvelope(text).body)
    return text === content ? null : text
  }
}
// :91-102 clearConfirmCopy(folderCount, preserveProperties) — two detail strings
// src/shared/types.ts:168 preservePropertiesOnClear?: boolean · readNexus.ts:145 · SettingsWindow.tsx:391-397 · index.ts:1047
```

**Becomes**

```ts
// src/main/exclusionScan.ts
function clearRewrite(): RewriteText {
  return (content) => {
    const keys = Object.keys(readFrontmatterFields(content))
    const remove = keys.filter((k) => BOOKKEEPING_KEYS.includes(k) || isGovernedContextKey(k))
    if (remove.length === 0) return null
    return mergeFrontmatter(content, {}, remove, splitEnvelope(content).body)
  }
}
export function clearConfirmCopy(folderCount: number): { message: string; detail: string }
```

The one detail string: *Pommora’s container files are removed and each page’s identity key, timestamps, and Context keys are dropped; every other key a page holds stays. This cannot be undone.* `preservePropertiesOnClear` leaves `types.ts`, `readNexus.ts`, `SettingsWindow.tsx`, and `index.ts:1047`'s read. `renameFrontmatterKey` import drops from `exclusionScan.ts`. [[ArchitecturePM]] §Folder Exclusion and [[ConfigurationPM]]'s "keep values" sentences are rewritten here.

**Verify — automated**

- [ ] `exclusionScan.test`: the preserve-mode cases are deleted (the mode is gone); one case asserts `Status: [Active]` and `foo: bar` survive Clear while `PageID`, both stamps, and `<Areas>` go. Red first with the old arm present.
- [ ] `rg -F "preservePropertiesOnClear" src` → 0. Control: `rg -F "permanentDelete" src` → ≥ 3.
- [ ] Full gates green.

**Verify — user**

- [ ] *(none — the row's absence is the `rg` control)*

#### Task 8: The reserved-name rule

**Requirement:** 3

**Why:** With bare keys, a property named `PageID` or `modified_at` would collide with a governed field; a name starting with `<` would parse as a Context key.

**Now**

```ts
// src/shared/properties.ts (moved in Task 4)
export function invalidPropertyName(name: string): boolean {
  const n = normalizePropertyName(name)
  return !n || n.startsWith(RESERVED_NAME_PREFIX)
}
// callers: registryProperty.ts:53 (create), :138 (rename)
```

**Becomes**

```ts
// src/shared/properties.ts
const RESERVED_KEY_NAMES: ReadonlySet<string> = new Set([...Object.values(KIND_ID_KEY), ...PAGE_MODELED_KEYS])
export const KEY_REFUSAL = { …, reserved: (name: string) => `"${name}" is a key Pommora manages.` } as const
export function invalidPropertyName(name: string): boolean // empty · leading '$' · leading '<' · exact member of RESERVED_KEY_NAMES
```

`registryProperty.ts:139` maps the refusal to `KEY_REFUSAL.reserved(next.name)` when the name is reserved, `reservedPrefix` otherwise.

**Verify — automated**

- [ ] Red first: `invalidPropertyName('modified_at')` and `('<Foo')` expected true fail; then green. `('pageid')` false. Both create and rename refuse `created_at` through their IPC (`registryProperty.test`).
- [ ] Full gates green.

**Verify — user**

- [ ] *(none)*

#### Task 9: A rename onto a held key is refused

**Requirement:** 3, 10

**Why:** Under bare keys the key holding the new name can be someone else's data; both collision policies destroy a value (executed). The Names rule generalizes from files to keys.

**Now**

```ts
// src/main/CRUD/registryProperty.ts:128-160 (editProperty)
  return serializeSchemaOp(async () => {
    const record = await stageRename(root, propertyId, changes.name)
    const edit = await mutateRegistry<Result<Rename | null>>(root, (registry) => { … })
    …
    const skipped = edit.value ? await renameSweep(root, edit.value.from, edit.value.to) : 0
```

```ts
// src/main/CRUD/keyHolders.ts:11-16 — candidates, not holders
export async function keyHolderFiles(root, key, folders): Promise<string[]>
```

**Becomes**

```ts
// src/main/CRUD/keyHolders.ts
export async function confirmedKeyHolders(root: string, key: string, folders: string[]): Promise<string[]>
// src/main/CRUD/registryProperty.ts (editProperty, before stageRename)
    const to = typeof changes.name === 'string' ? normalizePropertyName(changes.name) : undefined
    const prior = (await readRegistry(root)).defs[propertyId]
    if (to !== undefined && prior && to !== prior.name) {
      const holders = await confirmedKeyHolders(root, to, await collectionFolders(root))
      if (holders.length) return fail('invalid-property', KEY_REFUSAL.held(to, holders.length))
    }
    const record = await stageRename(root, propertyId, changes.name)
```

`confirmedKeyHolders` reads each candidate from `keyHolderFiles` and keeps the files whose frontmatter holds `key` — an unready index yields the whole Collection corpus as candidates, which is why the per-file read is unconditional. The `to !== prior.name` gate mirrors `stageRename`'s own: a commit that normalizes back to the current name (`"Status "`) is a no-op, not a refusal against the property's own holders. `KEY_REFUSAL.held = (name, n) => \`${n} page${n === 1 ? '' : 's'} already use "${name}" as a key.\``. `renameSweep`'s `prefer-new` stays, covering the one case left: a value written under the new name during the sweep. [[PropertiesPM]] Validation is rewritten here.

**Verify — automated**

- [ ] Red first: rename `Status` → `foo` with a page holding `foo: bar` expected refused; fails (today it renames and drops); then green. A rename with **no** holder still succeeds and sweeps. Renaming `Status` → `"Status "` succeeds as a no-op. Both halves of the guard: with the check disabled the refusal test goes red.
- [ ] With no index (`sessionDb` not ready), a rename onto an **unheld** name succeeds — the corpus fallback confirms per file, not by candidacy.
- [ ] `.nexus/property-cascade.json` is absent after a refusal (no stranded journal).
- [ ] Full gates green.

**Verify — user**

- [ ] The refusal message reads in the property editor. *(carried to Gate 1's stop)*

#### Gate 1 — bare keys · **Declared Stop**

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** ticked against a result just watched.
- [ ] `rg -F "wrapKey" src` → 0; `rg -F "governedKeys" src` → 0. Control `rg -F "parseContextKey" src` → ≥ 6.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `src/shared`, `src/main`, `src/renderer/{Store,Properties,Testing}`; reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling in the Log.
- [ ] Made False rows for Tasks 4, 5, 7, 9 landed in their commits.
- [ ] Progress hashes filled in.
- [ ] **Declared stop.** The executor runs the vault pass (Rulings, "Vault conversion") after the backup, then the automated Gate 1 checks (Rulings, "Gate 1 is automated"):
  - [ ] The pass's post-check: every rewritten file's frontmatter equals its pre-pass frontmatter under the translation; other keys and bodies byte-identical; counts match the survey.
  - [ ] NexusOS on this build: the Ideas Collection's `loadValues` agrees with the files' frontmatter page by page; nothing the registry names reads foreign.
  - [ ] Nathan pinged; execution continues at once (Rulings — he is unavailable for the run).

---

### Phase 2 — Values: one shape rule

#### Task 10: `decodeValue` coerces; `encodeValue` writes lists

**Requirement:** 4, 10

**Why:** Select/Status as lists make an Obsidian List and a Pommora Select the same shape; one coercion for the three option types replaces three `return NULL`s; `false` reads as absent so the cell, grouping, and the filter agree.

**Now**

```ts
// src/shared/propertyValue.ts:66-77
    case 'checkbox':
      return typeof raw === 'boolean' ? { kind: 'checkbox', value: raw } : NULL
    case 'select':
    case 'status': {
      if (typeof raw !== 'string') return NULL
      if (strict && !optionValues(def).includes(raw)) return NULL
      return str({ kind: 'select', value: raw })
    }
    case 'multi_select': {
      if (!Array.isArray(raw) || !raw.every((x): x is string => typeof x === 'string')) return NULL
      const kept = strict ? raw.filter((v) => optionValues(def).includes(v)) : raw
      return strict && kept.length === 0 ? NULL : { kind: 'multiSelect', value: kept }
    }
// :114-124 encodeValue — case 'select': … return value.value
```

**Becomes**

```ts
// src/shared/propertyValue.ts
const optionList = (raw: unknown): string[] =>
  (Array.isArray(raw) ? raw : [raw]).filter((x): x is string => typeof x === 'string' && x !== '')

    case 'checkbox':
      return raw === true ? { kind: 'checkbox', value: true } : NULL
    case 'select':
    case 'status':
    case 'multi_select': {
      const known = optionValues(def)
      const xs = optionList(raw)
      if (def.type === 'multi_select') {
        const kept = strict ? xs.filter((v) => known.includes(v)) : xs
        return kept.length === 0 ? NULL : { kind: 'multiSelect', value: kept }
      }
      const value = resolveSingleOption(xs, known)
      return value === undefined ? NULL : { kind: 'select', value }
    }

// The one address for "an externally written option list sets a Select or Status value":
// the newest valid element wins, an invalid trailing element yields to the nearest valid one before it.
export const resolveSingleOption = (written: readonly string[], known: readonly string[]): string | undefined =>
  written.filter((v) => known.includes(v)).at(-1)
// encodeValue
    case 'select':
      return [value.value]
```

Select/Status membership is no longer `strict`-gated — it is the read rule. `PropertyValue`'s `checkbox` value is always `true`. `Cell.tsx`'s arms are unchanged (an unknown Multi-Select value still renders through `o ?? { value: val }`). [[PropertiesPM]]'s Type Catalog, the `false` line, and the Known Issue are rewritten here.

**Assumed by:** Task 11 (`rewriteRaw` shares the list shape), Task 14 (the standing check re-encodes through this), Task 21.

**Verify — automated**

- [ ] Red first in `propertyValue.test.ts`, the single-value cases run **twice — once against a Select definition, once against a Status definition** (Rulings): `['Open','Active']` → `Active`; `['Green','Blue']` against Red/Blue → `Blue`; `['Active','Wip']` (invalid trailing) → `Active`; `'Active'` scalar → `Active`; `['Wip']` unknown → null; plus `'zeta'` scalar on Multi-Select → `['zeta']`; `false` on checkbox → null; `encodeValue({kind:'select',value:'Active'})` → `['Active']`. Then green. Existing 27 stay green after fixture rewrite. `resolveSingleOption` is exported and named in the tests so the rule's address is the test's subject.
- [ ] `filter.test`: "is empty" on a checkbox with `false` on disk → true (red first against `:333`).
- [ ] `rg -F "kind: 'checkbox', value: raw" src` → 0. Control: `rg -F "optionList(" src/shared/propertyValue.ts` → 1 (the one call; the definition is `const optionList = (`).
- [ ] Full gates green.

**Verify — user**

- [ ] *(carried to Completion Criteria — a list-shaped Select round-trips through Obsidian's List widget)*

#### Task 11: `rewriteRaw` takes the array path for every option type; `type` retires

**Requirement:** 4

**Why:** Option rename and delete would otherwise silently skip every list-shaped Select/Status page (executed). With the list path universal the `type` argument has no reader.

**Now** — `rg -F "type: PropertyType" src/main/CRUD/pageValue.ts src/main/CRUD/optionOps.ts` → 8 (5 on the value-rewrite path, 3 legitimate survivors: `requireOptionType:32`, `RequireType:139`, `requireStatusType:180`):

```ts
// src/main/CRUD/pageValue.ts:19-40
function rewriteRaw(raw: unknown, type: PropertyType, target: string, edit: ValueEdit): unknown | typeof SKIP {
  if (type === 'multi_select') { … array path … }
  if (raw !== target) return SKIP
  return edit.op === 'replace' ? edit.to : null
}
// :62-81 stripPageValue(content, key, value, type) · replacePageValue(content, key, oldValue, newValue, type)
// src/main/CRUD/optionOps.ts:135 type CascadeTarget = { type: PropertyType; key: string }
// :234 replacePageValue(content, edit.value.key, oldValue, newTitle, edit.value.type)
// src/main/CRUD/replaySchemaCascade.ts:79, 90 — …, def.type)
```

**Becomes**

```ts
// src/main/CRUD/pageValue.ts
function rewriteRaw(raw: unknown, target: string, edit: ValueEdit): unknown | typeof SKIP {
  const xs = Array.isArray(raw) ? raw : [raw]
  if (!xs.includes(target)) return SKIP
  if (edit.op === 'replace') {
    if (edit.to !== target && xs.includes(edit.to)) return xs.filter((el) => el !== target)
    return xs.map((el) => (el === target ? edit.to : el))
  }
  const filtered = xs.filter((el) => el !== target)
  return filtered.length ? filtered : null
}
export function stripPageValue(content: string, key: string, value: string): string | null
export function replacePageValue(content: string, key: string, oldValue: string, newValue: string): string | null
// src/main/CRUD/optionOps.ts
type CascadeTarget = { key: string }
```

Foreign elements in the list ride through untouched, as today's array path already guarantees; `requireOptionType` remains the type gate.

**Verify — automated**

- [ ] Red first in `pageValue.test.ts`: `replacePageValue` on `Status:\n  - Active` → `Status:\n  - Live` (today returns null); `stripPageValue` on the same → key deleted. Then green. The scalar `Status: Active` case rewrites to a list — asserted.
- [ ] `optionOps.test` 19 green after the fixtures go list-shaped.
- [ ] `rg -F "type: PropertyType" src/main/CRUD/pageValue.ts src/main/CRUD/optionOps.ts` → 3 (the three type-gate survivors named in Now; none on the rewrite path). Control: `rg -F "requireOptionType" src/main/CRUD/optionOps.ts` → ≥ 2.
- [ ] Full gates green.

**Verify — user**

- [ ] *(none)*

#### Gate 2 — one shape

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** ticked against a result just watched.
- [ ] Scalar fixture sweep: `rg -n "^\s*(Status|Stage|Tags): [A-Za-z]" src --glob '*.test.*'` → 0 (legit hits: none). Control: `rg -F "- Active" src --glob '*.test.*'` → ≥ 5.
- [ ] Simplification and review against `<base>..HEAD` scoped to `src/shared/propertyValue.ts`, `src/main/CRUD/{pageValue,optionOps,replaySchemaCascade}.ts`, `src/renderer/Views/Pipeline`.
- [ ] Every concern fixed, or carrying an explicit user ruling in the Log.
- [ ] Made False row for Task 10 landed.
- [ ] Progress hashes filled in. Not a declared stop.

---

### Phase 3 — Repair: one reconcile in one writer

#### Task 12: `GovernedWorld`, and the one loader generalizes

**Requirement:** 5

**Why:** The reconcile needs, in one object, what a context write already loads (registry + Spaces) plus what a property write never loaded (the page's Collection assignment as a name-keyed defs map). `loadContextWorld` is the loader the log names; it generalizes rather than growing a sibling module.

**Now**

```ts
// src/main/CRUD/contextWrite.ts:47-53
export interface ContextWorld {
  registry: ContextsRegistry
  spacesByContext: Map<string, SpaceNode[]>
  spaceById: Map<string, SpaceRef>
}
export async function loadContextWorld(root: string): Promise<Result<ContextWorld>>
// src/main/CRUD/restoreScrub.ts:40-62 liveWorld(root, tree, destCollectionFolder) → { defs: Map<name, def>; contextSpaces }
```

**Becomes**

```ts
// src/shared/contextResolve.ts
export interface GovernedWorld {
  registry: ContextsRegistry | null // null → the context arm is skipped
  spacesByContext: Map<string, SpaceNode[]>
  defs: ReadonlyMap<string, PropertyDefinition> // name → def, the page's Collection assignment only; empty on a sidecar or an Agenda page
}
// src/main/CRUD/contextWrite.ts
export interface ContextWorld extends GovernedWorld { registry: ContextsRegistry; spaceById: Map<string, SpaceRef> }
export async function loadContextWorld(root: string): Promise<Result<ContextWorld>> // unchanged; defs: EMPTY
export async function assignedDefs(root: string, collectionFolder: string | null): Promise<ReadonlyMap<string, PropertyDefinition>>
// src/main/CRUD/assignment.ts (beside collectionFolders)
export async function collectionFolderOf(root: string, absFile: string): Promise<string | null> // the one Collection folder that is an ancestor; null for Agenda and sidecar roots
```

`assignedDefs` serves from `getLiveTree()` when it holds this root (`CollectionNode.properties` is the resolved assignment) and from `readRegistry` + the Collection sidecar otherwise — the shape `restoreScrub.liveWorld` builds today, which now calls it. `collectionFolderOf` is `(await collectionFolders(root)).find((f) => absFile.startsWith(f + sep)) ?? null` — `collectionFolders` returns only `kind === 'collection'` nodes, so exactly one is an ancestor of any page. `spaceById` stays on `ContextWorld` because only the context write resolves Space ids.

**Assumed by:** Tasks 15, 16, 17, 21.

**Verify — automated**

- [ ] `assignedDefs` test: a Collection assigning `Status` only → map has `Status`, lacks a registered-but-unassigned `Priority`; `null` folder → empty map; tree-served and disk-served results agree (crossing test).
- [ ] `collectionFolderOf`: a page two Sets deep resolves to its Collection; a `_space.json` path and an Agenda page resolve to null; with the live tree held for the root, ten calls perform zero `refreshTree` walks (spy) — `collectionFolders`' disk fallback never runs on a cell edit.
- [ ] `contextWrite.test` 14 green unmodified; `restoreScrub.test` green.
- [ ] Full gates green.

**Verify — user**

- [ ] *(none)*

#### Task 13: `addOptionToDef`

**Requirement:** 5

**Why:** Adoption is a registry-only mutation; it mirrors `dropOptionFromDef`, which already runs off the schema chain. It must never ride `serializeSchemaOp` — the repair that calls it holds a page lock the chain's cascades also take.

**Now** — `rg -F "serializeSchemaOp" src/main/CRUD/optionOps.ts` → 11:

```ts
// src/main/CRUD/optionOps.ts:105-131
export function dropOptionFromDef(root: string, propertyId: string, value: string): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry) => { … status_groups | select_options filter … })
}
```

**Becomes**

```ts
// src/shared/propertyValue.ts
export type Adoption = { propertyId: string; value: string }
// src/main/CRUD/optionOps.ts
export function addOptionToDef(root: string, propertyId: string, value: string): Promise<Result<null>> // multi_select only; already present → ok
export async function applyAdoptions(root: string, adoptions: readonly Adoption[]): Promise<void> // [] → no registry touch
```

`addOptionToDef` appends `{ value, label: value }` to `select_options` through `mutateRegistry` alone — the caller holds a page lock, so the schema chain is never entered.

**Assumed by:** Tasks 14, 15, 16, 17, 21.

**Verify — automated**

- [ ] Red first: `addOptionToDef` on a Multi-Select adds the option once across two concurrent calls (both resolve ok; registry holds one); on a Select → fails. Then green.
- [ ] Deadlock control: `applyAdoptions` called from inside `serializeOnFile(page)` resolves; a probe calling it from inside `serializeSchemaOp` also resolves — it never enters the chain.
- [ ] `rg -F "serializeSchemaOp" src/main/CRUD/optionOps.ts` → 11 (unchanged). Control: `rg -F "mutateRegistry(" src/main/CRUD/optionOps.ts` → ≥ 3.
- [ ] Full gates green.

**Verify — user**

- [ ] *(none)*

#### Task 14: The property arm is the one standing check

**Requirement:** 5

**Why:** `standing.ts` promises one answer for every path that puts a value back, and `propertyValueStands` gives a different one (strict drops what adoption keeps). The property arm, exported once, becomes that answer for the reconcile and for every restore path.

**Now**

```ts
// src/main/CRUD/standing.ts:22-32
export function propertyValueStands(def: PropertyDefinition | undefined, raw: unknown): PropertyStanding {
  if (!def) return { stands: false }
  const value = decodeValue(def, raw, { strict: true })
  if (isBlankValue(value)) return { stands: false }
  return { stands: true, layer: 'property', value }
}
// callers: restoreScrub.ts:75 · restoreProperty.ts:75 · removeProperty.ts:130
```

**Becomes**

```ts
// src/shared/propertyValue.ts
export function reconcilePropertyValue(def: PropertyDefinition, raw: unknown): { next: unknown | null; adoptions: Adoption[] } // null → the key deletes
// src/main/CRUD/standing.ts
export function contextTagStands(coercedSpaceTitles: Set<string> | undefined, raw: unknown): ContextStanding
```

`next` is `encodeValue(decodeValue(def, raw))`, or null when that decodes blank; `adoptions` is every Multi-Select element not in `optionValues(def)`, carrying `def.id`. `propertyValueStands` and `PropertyStanding` are deleted. `restoreProperty.ts:75` and `removeProperty.ts:130` call `reconcilePropertyValue`, write `next` when non-null, and collect `adoptions` for one `applyAdoptions` after their loop. `restoreScrub.ts:75` follows in Task 15.

**Assumed by:** Task 15.

**Verify — automated**

- [ ] Red first: restoring `Tags: [alpha, zeta]` (zeta unregistered) through `restoreProperty` keeps `zeta` on disk **and** adopts it (today drops it); through Remove→Restore likewise. Then green. A Select `[Wip]` unknown restores to no key.
- [ ] `rg -F "propertyValueStands" src` → 0. Control: `rg -F "contextTagStands" src` → ≥ 2.
- [ ] Full gates green.

**Verify — user**

- [ ] *(none)*

#### Task 15: One reconcile for both layers

**Requirement:** 5

**Why:** `reconcileContextKeys` already is the root reconcile — key-wise, verbatim pass-through, no-empties. One property arm inside its loop is the whole generalization; a sibling function is the failure the log names.

**Now**

```ts
// src/shared/contextResolve.ts:58-88
export function reconcileContextKeys(root, registry, spacesByContext): { root: Record<string, unknown>; changed: boolean } {
  …
  for (const [key, raw] of Object.entries(root)) {
    const title = parseContextKey(key)
    const contextId = title !== null ? contextIds.get(title) : undefined
    if (contextId === undefined || !Array.isArray(raw)) { out[key] = raw; continue }
    … repair values → repaired[]; if (repaired.length) out[key] = repaired; else changed = true
  }
  return { root: out, changed }
}
// callers: contextWrite.ts:117 (applyTarget)
```

**Becomes**

```ts
// src/shared/contextResolve.ts
export interface Reconciled { root: Record<string, unknown>; changed: string[]; adoptions: Adoption[] } // changed: keys set or deleted
export function reconcileGovernedRoot(root: Record<string, unknown>, world: GovernedWorld): Reconciled
```

The context arm runs as before and is skipped when `world.registry` is null; the property arm runs `reconcilePropertyValue` for keys `world.defs` names; every other key passes verbatim; a present-but-empty list is deleted. `reconcileContextKeys` is deleted; `applyTarget` calls `reconcileGovernedRoot` (Task 16 removes that call on the page arm). `restoreScrub.reconciled` becomes `reconcileGovernedRoot(splitFrontmatter(content), world)` → `mergeFrontmatter(content, pick(root, changed), changed, body)` and returns its adoptions; `reconciledSidecar` uses the same with an empty `defs`.

**Assumed by:** Tasks 16, 17, 21.

**Verify — automated**

- [ ] Red first (`contextResolve.test`): `{ Status: 'Active' }` with `Status` in defs → `{ Status: ['Active'] }`, `changed: ['Status']`; `{ Tags: ['alpha','zeta'] }` → unchanged root, `adoptions: [{…,'zeta'}]`; `{ '<Areas>': [] }` → key deleted; `{ '<Notes>': ['x'] }` (no such Context) → verbatim; `registry: null` → context keys verbatim, property arm still runs; `Priority: 5` registered but not in `defs` → verbatim. Then green; the 4 existing reconcile cases pass renamed.
- [ ] Crossing test: `reconcileGovernedRoot` and `decodeValue` agree — for every fixture, `decodeValue(def, reconciled.root[k])` deep-equals `decodeValue(def, raw)`.
- [ ] `rg -F "reconcileContextKeys" src` → 0. Control: `rg -F "reconcileGovernedRoot" src` → ≥ 3.
- [ ] Full gates green.

**Verify — user**

- [ ] *(none)*

#### Task 16: The writer takes a world and owns the reconcile

**Requirement:** 5

**Why:** Repair is a parameter of the one writer: the two user value-edit entries pass a world, restore passes none. The three precedence rules are what keep an unassign or a clear from being reverted by the reconciled disk root (executed on both arms).

**Now**

```ts
// src/main/CRUD/governedWrite.ts:20-32
export async function setGovernedRootKeys(absFile, next, govern): Promise<void> {
  const existing = await readFile(absFile, 'utf8')
  const content = mergeFrontmatter(existing, { ...next, modified_at: nowIso() }, [...govern, 'modified_at'], splitEnvelope(existing).body)
  await atomicWriteFile(absFile, content)
}
// src/main/CRUD/contextWrite.ts:110-134 applyTarget → reconcileGovernedRoot(raw, world) … root[key] = titles
// :155-158 (after Task 1) const keys = governedContextKeys(raw, applied.value.root, applied.value.key) … setGovernedRootKeys(absFile, next, keys)
// src/main/CRUD/page.ts:136-146 updatePageProperty(absFile, def, value) → setGovernedRootKeys(absFile, clear ? {} : { [def.name]: encodeValue(value) }, [def.name])
```

**Becomes**

```ts
// src/main/CRUD/governedWrite.ts
export async function setGovernedRootKeys(
  absFile: string,
  next: Record<string, unknown>,
  govern: readonly string[],
  world?: GovernedWorld,
): Promise<Adoption[]> {
  const existing = await readFile(absFile, 'utf8')
  const raw = splitFrontmatter(existing)
  const own = Object.fromEntries(Object.entries(raw).filter(([k]) => !govern.includes(k)))
  const { root, changed, adoptions } = world ? reconcileGovernedRoot(own, world) : { root: own, changed: [], adoptions: [] }
  const repaired = Object.fromEntries(changed.map((k) => [k, root[k]]))
  const content = mergeFrontmatter(
    existing,
    { ...repaired, ...next, modified_at: nowIso() },
    [...changed, ...govern, 'modified_at'],
    splitEnvelope(existing).body,
  )
  await atomicWriteFile(absFile, content)
  return adoptions
}
// src/main/CRUD/contextWrite.ts
function applyTarget(world: ContextWorld, contextId: string, titles: string[]): Result<{ key: string; value: string[] | undefined }>
// src/main/CRUD/page.ts
export async function updatePageProperty(absFile: string, def: PropertyDefinition, value: PropertyValue | null, world?: GovernedWorld): Promise<Result<Adoption[]>>
```

`setPageContext` passes `[key]` as `govern` and `value ? { [key]: value } : {}` as `next`, with the world, then awaits `applyAdoptions`. `setSpaceContext`'s `rmwJsonStrict` callback runs `reconcileGovernedRoot(raw, { ...world, defs: EMPTY })` and applies the key over the result. The caller-governed keys are removed from the root **before** the reconcile sees it, so `next`'s absence deletes and the reconcile can never reassert them. `governedContextKeys` is deleted. `restoreProperty.ts:81` calls `updatePageProperty` with no world. `mutate.setProperty` passes the world Task 17 assembles and awaits `applyAdoptions` after the lock releases.

**Assumed by:** Tasks 17, 20.

**Verify — automated**

- [ ] Red first (`governedWrite.test`): disk `{ '<Areas>': ['Health'], Priority: 'High' }`, call with `next = {}`, `govern = ['<Areas>']`, a world → `<Areas>` **deleted**, `Priority` → `['High']`, `changed` includes `Priority` only. Clearing `Priority` (`govern=['Priority']`, `next={}`) with a drifted `Status: 'Open'` sibling → `Priority` gone, `Status: ['Open']`. Both fail on the naive merge; then green.
- [ ] The inverse guard: with `setPageContext` passing the wide key set, a test asserting the sibling repair goes red — proving rule (1) is load-bearing.
- [ ] `writePathRace.test` 6 unmodified and green; `contextWrite.test` context cases green; a `setSpaceContext` test shows sidecar context keys still repaired.
- [ ] `rg -F "governedContextKeys" src` → 0. Control: `rg -F "setGovernedRootKeys(" src/main` → ≥ 3.
- [ ] Full gates green.

**Verify — user**

- [ ] *(carried — Completion Criteria: clearing a cell removes the key; unassigning the last Space removes the key)*

#### Task 17: The drift pre-check gates the strict world on property writes

**Requirement:** 5

**Why:** The strict Contexts world costs a JSON read per Space; a clean file should never pay it on a cell edit, and a failed load should never refuse the edit.

**Now**

```ts
// src/main/mutate.ts:640-647
      return serializeOnFile(resolved.value, async () => {
        const def = (await readRegistry(root)).defs[req.propertyId]
        if (!def) return fail('not-found', 'Property not found.')
        const r = await updatePageProperty(resolved.value, def, req.value)
        if (!r.ok) return r
        await indexWrittenPage(root, resolved.value)
        return ok({})
      })
```

**Becomes**

```ts
// src/main/CRUD/contextWrite.ts
export function contextDriftPresent(raw: Record<string, unknown>, tree: NexusTree | null): boolean // null tree → true
export async function loadGovernedWorld(root: string, absFile: string, raw: Record<string, unknown>): Promise<GovernedWorld> // registry null when the strict load fails
// src/main/mutate.ts
      const adoptions = await serializeOnFile(resolved.value, async () => {
        const def = (await readRegistry(root)).defs[req.propertyId]
        if (!def) return fail('not-found', 'Property not found.')
        const world = await loadGovernedWorld(root, resolved.value, splitFrontmatter(await readFile(resolved.value, 'utf8')))
        const r = await updatePageProperty(resolved.value, def, req.value, world)
        if (!r.ok) return r
        await indexWrittenPage(root, resolved.value)
        return r
      })
      if (adoptions.ok) await applyAdoptions(root, adoptions.value)
      return adoptions.ok ? ok({}) : adoptions
```

`contextDriftPresent` is true when any `<X>` key whose `X` is a Context title holds a value not byte-equal to a Space title of that Context, or holds an empty list, or when the tree is null; a `<X>` naming no Context title never counts. `loadGovernedWorld` always supplies `assignedDefs(root, await collectionFolderOf(root, absFile))`; it calls `loadContextWorld` only when drift is present, and a failed load yields `registry: null`.

**Verify — automated**

- [ ] `contextDriftPresent`: `{ '<Areas>': ['Work'] }` with Space "Work" → false; `['work']` → true; `[]` → true; `{ '<Notes>': ['x'] }` (no Context) → false; `tree = null` → true. Red first.
- [ ] End to end through `mutate.setProperty` (not a hand-built world): a page in a Collection assigning `Status` holds `Status: Open` (scalar); setting `Priority` on it rewrites `Status` to `['Open']`. Red first — with `collectionFolderOf` returning null the property arm never runs and the scalar survives.
- [ ] Both halves of the gate: a property write on a clean page performs **zero** `_space.json` reads (spy on `readJsonStrict`); on a drifted page ≥ 1 and the drift repairs. With the pre-check disabled the zero-reads test goes red.
- [ ] Failure branch: a corrupt `_space.json` present, a property write on a page tagging that Context **succeeds** and leaves the context key untouched; a context write on the same page still refuses.
- [ ] Full gates green.

**Verify — user**

- [ ] *(carried — Completion Criteria)*

#### Gate 3 — repair

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** ticked against a result just watched.
- [ ] Simplification and review against `<base>..HEAD` scoped to `src/shared/{contextResolve,propertyValue}.ts`, `src/main/CRUD/{governedWrite,contextWrite,page,optionOps,standing,restoreScrub,restoreProperty,removeProperty}.ts`, `src/main/mutate.ts`.
- [ ] Every concern fixed, or carrying an explicit user ruling in the Log.
- [ ] Lock audit: `rg -n "serializeSchemaOp\(" src/main/CRUD` unchanged in count from Gate 2; `applyAdoptions` has no caller inside a `serializeSchemaOp` callback that also holds a page lock (read the three restore callers).
- [ ] Progress hashes filled in. Not a declared stop.

---

### Phase 4 — Live values

#### Task 18: The `values:changed` push and the epoch union

**Requirement:** 7

**Why:** Property values reach the renderer only through `loadValues` on container open; nothing invalidates them. One push, one epoch union, one hook change.

**Now**

```ts
// src/shared/bridge.ts:391  'nexus:changed': NexusTree
// src/renderer/Store/RenameSlice.ts:52-53
  valuesEpoch: { n: number; oldKey: string; newKey: string } | null
  bumpValuesEpoch: (oldKey: string, newKey: string) => void
// src/renderer/Views/useValuesEpoch.ts:5,11-15
type Overrides = Record<string, PageFrontmatter>
export function useValuesEpoch(path: string, setValues: Dispatch<SetStateAction<Overrides>>, setValueOverride: Dispatch<SetStateAction<Overrides | null>>): void
// src/renderer/App.tsx:129-131 — window.nexus.onNexusChanged((next) => void applyTree(next))
// src/preload/index.ts:251 onNexusChanged: on('nexus:changed'),
```

**Becomes**

```ts
// src/shared/bridge.ts
  'values:changed': { rel: string; pageIds: string[] }[]
// src/shared/types.ts
export type ValuesEpoch = { n: number } & ({ kind: 'rename'; oldKey: string; newKey: string } | { kind: 'container'; rel: string; pageIds: string[] })
// src/renderer/Store/RenameSlice.ts
  valuesEpoch: ValuesEpoch | null
  bumpValuesEpoch: (oldKey: string, newKey: string) => void
  bumpContainerValues: (changes: { rel: string; pageIds: string[] }[]) => void
// src/preload/index.ts
  onValuesChanged: on('values:changed'),
// src/renderer/App.tsx
  useEffect(() => window.nexus.onValuesChanged(bumpContainerValues), [bumpContainerValues])
// src/renderer/Views/useValuesEpoch.ts
export type OverrideEntry = { fm: PageFrontmatter; pending: boolean }
export type Overrides = Record<string, OverrideEntry>
export function useValuesEpoch(path: string, setValues: Dispatch<SetStateAction<Record<string, PageFrontmatter>>>, setValueOverride: Dispatch<SetStateAction<Overrides | null>>): void
```

A `rename` epoch refetches and re-keys `entry.fm` as today. A `container` epoch refetches only when `rel === path || rel.startsWith(path + '/')`, then retires overrides per Task 19. `GroupFrame.tsx:779–788` mounts the hook with a no-op override setter. `useViewHost`'s override state becomes `Overrides | null` and its `effectiveValues` memo maps `entry.fm`.

**Assumed by:** Tasks 19, 20.

**Verify — automated**

- [ ] Red first (`useViewHost.test`): a `container` epoch for the mounted path refetches `loadValues`; for a sibling path does not; a `rename` epoch still re-keys. Then green; existing 12 pass.
- [ ] Typecheck proves the bridge: a `values:changed` push with a wrong payload shape fails `npm run typecheck`.
- [ ] `rg -F "onValuesChanged" src` → 2 (preload, App). Control: `rg -F "onNexusChanged" src` → 2.
- [ ] Full gates green.

**Verify — user**

- [ ] *(carried — Completion Criteria)*

#### Task 19: Overrides carry an in-flight marker; retirement is by id

**Requirement:** 7

**Why:** Clearing an override on "the refetch differs" is the assign-vanish bug already fixed once; the push carries page ids, and a refresh-batch bump has none, so only settled overrides retire.

**Now**

```ts
// src/renderer/Views/useViewHost.ts:74  const [valueOverride, setValueOverride] = useState<Record<string, PageFrontmatter> | null>(null)
// src/renderer/Views/TableView/TableView.tsx:1151-1161 patchBandValue → setValueOverride((prev) => ({ ...prev, [pageId]: patched }))
// src/renderer/Properties/Assignment/usePropertyRows.ts:132-139 commitValue → setFm(…); void mutate({ op: 'setProperty', … })
```

**Becomes**

```ts
// src/renderer/Views/useValuesEpoch.ts
export const retireSettled = (o: Overrides | null, pageIds: readonly string[] | null): Overrides | null // null ids → drop settled only; named ids → drop regardless
```

Every patch site writes `{ fm, pending: true }` and flips `pending` to false when its own mutate promise resolves, ok or not — `patchBandValue` included. The `container` arm of `useValuesEpoch` calls `retireSettled(prev, epoch.pageIds.length ? epoch.pageIds : null)`.

**Verify — automated**

- [ ] Red first: an override for page A, mutate unresolved, then a `container` epoch naming page B → A's override survives; naming A → retired; with empty `pageIds` → pending A survives, a settled C retires. Then green. `useViewHost.test.tsx:165` (assign-vanish) still green.
- [ ] Full gates green.

**Verify — user**

- [ ] *(carried — Completion Criteria)*

#### Task 20: Both legs push; `refreshValues` is deleted

**Requirement:** 7

**Why:** The watcher is structurally blind to app writes (`writeEcho`), so main's own operations push too — once per operation, per container touched, never per file. With the write leg live, `refreshValues`' only consumer (a cover save) is served and the prop chain dies.

**Now**

```ts
// src/main/watcher.ts:164  if (tree && tree !== before) pushToWindow(win, 'nexus:changed', tree)
// src/main/watchPatch.ts:52-53  | { kind: 'page-upsert'; rel: string } · :284 const node = record.node (id in hand)
// src/main/index.ts:523-526 confirmWrite(work) { const root = sessionRoot(); if (root !== null) pushConfirmed(await work(root)) }
// src/renderer/Views/useViewHost.ts:298-303 refreshValues · CardsView.tsx:130, 230, 247, 558, 755, 1016, 1101 (onDone: onRefreshValues)
```

**Becomes**

```ts
// src/main/valuesChanged.ts (new)
export function noteValueWrite(root: string, absFile: string, pageId?: string): void
export function flushValueWrites(root: string): { rel: string; pageIds: string[] }[] // drains the ledger
// callers of noteValueWrite: governedWrite.setGovernedRootKeys after its write, via sessionRoot() (the funnel — covers setProperty, setContext, restoreProperty, restoreCachedValues) · optionOps.cascadePages · governedSweep.sweepGovernedRoots (page arm) · cascade.renameCascade · mutate.ts:495 (cover), :589 (icon) · repairSweep.runRepairSweep (Task 21)
// src/main/index.ts:523-526 (confirmWrite)
async function confirmWrite(work: (root: string) => Promise<NexusTree | null>): Promise<void> {
  const root = sessionRoot()
  if (root === null) return
  pushConfirmed(await work(root))
  setImmediate(() => {
    const changes = flushValueWrites(root)
    if (changes.length && mainWindow && !mainWindow.isDestroyed()) push(mainWindow, 'values:changed', changes)
  })
}
```

`sessionRoot()` is importable from `src/main/CRUD` (`journalSlot.ts:9` already does), so the hook sits at the one writer every value edit crosses rather than on an enumerated caller list. The flush is **not** inside `pushConfirmed`: that function returns at once when the tree didn't move (`index.ts:512`), and a value write never moves the tree (`mutatePatch.ts:52` → `'no-change'`) — the hottest op would never push. Its own `setImmediate` is FIFO behind `pushConfirmed`'s, so when a `nexus:changed` exists it lands first, and the invoke's own reply always beats both — a cell's optimistic override is never retired before its write is acknowledged. `root` is the one the write used, so a nexus switch in the window can't strand the ledger. `flushValueWrites` emits one entry per containing Collection/Set rel, resolving page ids from the live tree when a writer had none. `watcher.settle` collects `{ rel, pageId }` from each applied `page-upsert` and pushes one grouped `values:changed` after the tree push; a `refresh` outcome pushes the batch's rels with `pageIds: []`. `refreshValues` and `onRefreshValues` are deleted from `useViewHost.ts` and the six `CardsView.tsx` sites; `useBannerMenu`'s `onDone` for the cover is dropped.

**Verify — automated**

- [ ] Red first: a `setProperty` mutate (which sends no `nexus:changed`) pushes exactly one `values:changed` with the page's container rel and id; a `setContext` mutate sends `nexus:changed` then `values:changed`, in that order; an option rename over 3 pages in 2 containers pushes **one** message with 2 entries; re-assigning a property with a Remove-cache (`assignInner` → `restoreCachedValues`) pushes for every restored page (spy on `push`). Then green.
- [ ] Watcher leg: an external page edit pushes `{ rel, pageIds: [id] }`; a batch containing a folder create pushes `pageIds: []`.
- [ ] `rg -F "refreshValues" src` → 0. `rg -F "onRefreshValues" src` → 0. Control: `rg -F "onValuesChanged" src` → 2.
- [ ] Full gates green.

**Verify — user**

- [ ] *(carried — Completion Criteria: a cover save still updates the card without reopening)*

#### Gate 4 — live values

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** ticked against a result just watched.
- [ ] Push-frequency audit: `rg -F "'values:changed'" src/main` → 3 (settle, `confirmWrite`, `runRepairSweep`); `noteValueWrite(` never appears inside `indexWrittenPage` or `atomicWriteFile`.
- [ ] Simplification and review against `<base>..HEAD` scoped to `src/shared/{bridge,types}.ts`, `src/preload`, `src/main/{watcher,watchPatch,index,valuesChanged}.ts`, `src/main/CRUD/governedWrite.ts`, `src/renderer/{App.tsx,Store,Views,Frames}`.
- [ ] Every concern fixed, or carrying an explicit user ruling in the Log.
- [ ] Progress hashes filled in. Not a declared stop.

---

### Phase 5 — Surfaces

The Properties leaf exists but is empty (`SettingsWindow.tsx:418–423`, `sections: []`, rendering "Nothing to set here yet."); Task 21 creates its one section, titled **Metadata** (Nathan's call — the other single-section leaves leave their first section untitled), and Task 22 adds its row to it.

#### Task 21: The on-load repair sweep and its toggle

**Requirement:** 8, 10

**Why:** Repair-on-write reaches only files the user edits; the sweep reaches files the seed already re-read because they changed on disk, at no extra read. Its toggle lands with its reader.

**Now**

```ts
// src/shared/types.ts:119  hideChevrons?: boolean
// src/main/readNexus.ts:126  hideChevrons: bool(p.hideChevrons),
// src/renderer/Settings/SettingsWindow.tsx:194-198  { kind: 'toggle', key: 'hideChevrons', label: 'Hide Disclosure Chevrons', hint: "Collapse the sidebar's chevron gutter." },
// src/main/indexSeed.ts:147-159
        if (prior && prior.mtimeMs === st.mtimeMs && prior.size === st.size) continue
        content = await readFile(abs, 'utf8')
      …
      recordPage(rel, content, { mtimeMs: st.mtimeMs, size: st.size })
// src/main/index.ts:426-430  await seedContentIndex(root) … await replaySchemaCascade(root)
// src/main/CRUD/governedSweep.ts:102-107 sweepGovernedRoots<C>(root, scope: { kind:'files'; files }, rewrite: Rewrite<C>, opts)
```

**Becomes**

```ts
// src/shared/types.ts
  repairOnOpen?: boolean
// src/main/readNexus.ts
    repairOnOpen: bool(p.repairOnOpen),
// src/renderer/Settings/SettingsWindow.tsx:418-423 — the Properties leaf gains its section
  { key: 'properties', label: 'Properties', icon: 'server', sections: [{ title: 'Metadata', rows: [
    { kind: 'toggle', key: 'repairOnOpen', label: 'Repair Properties On Open', hint: 'Canonicalize drifted property and Context values on the pages changed since the last open.' },
  ] }] }
// src/main/indexSeed.ts
export function driftedSinceSeed(): readonly string[]
// src/main/repairSweep.ts (new)
export async function runRepairSweep(root: string): Promise<void>
// src/main/index.ts (openNexusSequence, after replaySchemaCascade)
  await runRepairSweep(root)
```

In the seed loop, after `recordPage`, a page is flagged when for any key the registry names or `parseContextKey` accepts, `JSON.stringify(reconcileGovernedRoot(...).root[k]) !== JSON.stringify(raw[k])`; the list is transient, per session. `runRepairSweep` returns when `repairOnOpen` (via `readLivePersonalization`, `settings.ts:67`) is off or nothing is flagged; otherwise it builds one world per Collection folder (`assignedDefs` plus one strict `loadContextWorld`, a failure yielding `registry: null`), runs `sweepGovernedRoots(root, { kind: 'files', files }, rewrite, { stamp: false })` where `rewrite` returns `{ next: r.root, capture: r.adoptions }` when `r.changed.length` and null otherwise, then `applyAdoptions(root, result.captured.flat())`, then drains and pushes its own `values:changed` (`flushValueWrites` → `push`) — the open sequence never reaches `pushConfirmed`, and a sweep that drops unknown options or empty Context keys changes what renders. Best-effort and logged, never blocking the open. [[PropertiesPM]] §Shared Mechanisms gains repair-on-write, adoption, and the sweep here.

**Assumed by:** Task 22 (the toggle-row pattern).

**Verify — automated**

- [ ] Red first: with the toggle on, a seeded page holding `Status: Open` (scalar) and `Tags: [alpha, zeta]` is rewritten to `Status:\n  - Open` and `zeta` is adopted; with the toggle off nothing is written. An unchanged file (mtime unmoved) is never read (spy on `readFile`). Then green.
- [ ] Drift is deep-equal: a canonical `Status:\n  - Open` page is **not** in `driftedSinceSeed()` after two consecutive seeds.
- [ ] `readPersonalization` round-trips `repairOnOpen`; absent → undefined.
- [ ] Full gates green.

**Verify — user**

- [ ] The row sits in the Properties leaf. Toggle on, relaunch: a hand-drifted scratch page is canonical after the open. *(Completion Criteria)*

#### Task 22: Capitalize All Metadata and its toggle

**Requirement:** 8, 10

**Why:** Stored `tags`, shown `Tags` — the display half of the lowercase rule for Obsidian's special keys. One capitalizer, two entry points, never the rename fields.

**Now** — `rg -n "\bd\.name\b|\bdef\.name\b" src/renderer --glob '!*.test.*'` → 15; `rg -F "columnLabel(" src/renderer --glob '!*.test.*'` → 6 (5 calls + the definition):

```ts
// src/renderer/Properties/Assignment/columnLabel.ts:21
  return RESERVED_LABEL[columnId] ?? schema.find((d) => d.id === columnId)?.name ?? columnId
// render sites: GroupFrame.tsx:165, :830 · PropertyTypes.tsx:76 · PageProperties.tsx:83, :285 · WindowInspector.tsx:168, :302 · CardAddPicker.tsx:39 · PropertyFrame.tsx:153 (aria)
// stay raw: PropertyFrame.tsx:94, :424 (rename fields) · :344, :355 (native-menu payloads) · value.ts:78 (memo key) · propsAtRoot.ts:15 (an on-disk key, after Task 5)
```

**Becomes**

```ts
// src/shared/types.ts
  capitalizeMetadata?: boolean
// src/main/readNexus.ts
    capitalizeMetadata: bool(p.capitalizeMetadata),
// src/renderer/Settings/SettingsWindow.tsx (the Metadata section Task 21 created)
  { kind: 'toggle', key: 'capitalizeMetadata', label: 'Capitalize All Metadata', hint: 'Present all Markdown frontmatter as capitalized; useful when working in a shared directory with specific metadata standards.' },
// src/renderer/Properties/Assignment/columnLabel.ts
export function displayPropertyName(name: string, capitalize: boolean): string // Title Case each word when on
export function columnLabel(columnId: string, schema: PropertyDefinition[], contexts: ReadonlyMap<string, ContextIdentity>, capitalize: boolean): string
```

The nine render sites read `personalization.capitalizeMetadata` from the store and call `displayPropertyName`; `columnLabel`'s five callers pass the boolean, and only the property branch routes through it. [[PropertiesPM]] gains the Capitalize toggle and the lowercase-or-nothing guidance for `tags`/`aliases`/`cssclasses`; `ContextPM` §Pending gains the Text-type prospect.

**Verify — automated**

- [ ] `displayPropertyName('due date', true)` → `'Due Date'`; `('tags', false)` → `'tags'`; `('PageID', true)` → `'PageID'`.
- [ ] `rg -n "\bd\.name\b|\bdef\.name\b" src/renderer --glob '!*.test.*'` → 6 (the stay-raw list, re-derived). Control: `rg -F "displayPropertyName" src/renderer` → ≥ 10.
- [ ] `readPersonalization` round-trips `capitalizeMetadata`; absent → undefined.
- [ ] Full gates green.

**Verify — user**

- [ ] The row sits in the Properties leaf. Toggle on: a property named `tags` reads "Tags" in the table header, the properties pane, the group picker; the rename field still shows `tags`. *(Completion Criteria)*

#### Gate 5 — surfaces

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** ticked against a result just watched.
- [ ] Simplification and review against `<base>..HEAD` scoped to `src/shared/types.ts`, `src/main/{readNexus,indexSeed,repairSweep,index}.ts`, `src/renderer/{Settings,Properties,Views,Frames,Windows}`.
- [ ] Made False rows for Tasks 21, 22 landed.
- [ ] Every concern fixed, or carrying an explicit user ruling in the Log.
- [ ] Progress hashes filled in. Not a declared stop — Closeout.

---

## Implementation Log

### Progress

Pre-Phase-0 baseline (08-31-2026): typecheck 0 · Vitest 304 files / 3749 tests · Biome clean, no warnings line.

- [x] **Phase 0** — One writer · base `a4037b94`
  - [x] Task 0 — comments stripped to why-only on every target file · `b1c0bdc8`
  - [x] Task 1 — `setPageContext` delegates · `c15e21ad`
  - [x] Task 2 — one `optionValues` · `3a73ffb4`
  - [x] Task 3 — `restoreCachedValues` via `updatePageProperty` · `6d720e31`
- [ ] **Phase 1** — Keying · base `<commit>`
  - [ ] Task 4 — sigil to Contexts; `governedKeys.ts` dissolves
  - [ ] Task 5 — registry name is the gate; `propertyKey` → `def.name`
  - [ ] Task 6 — four shape sites; index records every key; the index generation
  - [ ] Task 7 — Clear strips bookkeeping only
  - [ ] Task 8 — reserved-name rule
  - [ ] Task 9 — rename onto a held key refused
  - [ ] **Declared stop — vault pass, Nathan's look**
- [ ] **Phase 2** — Values
  - [ ] Task 10 — `decodeValue` coerces; `encodeValue` lists
  - [ ] Task 11 — `rewriteRaw` array path; `type` retires
- [ ] **Phase 3** — Repair
  - [ ] Task 12 — `GovernedWorld`; `assignedDefs`
  - [ ] Task 13 — `addOptionToDef` / `applyAdoptions`
  - [ ] Task 14 — `reconcilePropertyValue` is the standing check
  - [ ] Task 15 — `reconcileGovernedRoot`
  - [ ] Task 16 — the writer takes a world; precedence rules
  - [ ] Task 17 — drift pre-check; `loadGovernedWorld`
- [ ] **Phase 4** — Live values
  - [ ] Task 18 — `values:changed` push; epoch union
  - [ ] Task 19 — in-flight overrides; id-scoped retire
  - [ ] Task 20 — both legs; `refreshValues` deleted
- [ ] **Phase 5** — Surfaces
  - [ ] Task 21 — on-load repair sweep + toggle
  - [ ] Task 22 — Capitalize All Metadata + toggle

### Rulings

- **Vault conversion** (Nathan, 08-31-2026). The executor's throwaway script (scratchpad only) runs at Gate 1 over `~/NexusOS`, after a backup (a git commit of the vault if it is a repository, else a dated copy of `.nexus/` and every `.md` the pass touches). Then, in order:
  1. **Wrapped property keys → bare.** `<Status>`, `<Pinned>`, `<Timeframe>` (and any other `<Prop>` found) rename in place. Where a bare twin already holds a value, **Obsidian's value always wins** and the wrapped key is dropped; an empty twin (`Status:` with nothing under it) counts as absent and the wrapped value renames in.
  2. **Context keys re-sigil.** `(Projects)`/`(Areas)`/`(Topics)` → `<Projects>`/`<Areas>`/`<Topics>`. Where a bare Obsidian `Projects:`/`Areas:`/`Topics:` key holds `[[Title.slate]]` pseudo-context links (the four Project titles: Athena, NexusOS, Pommora, Sapphire), those links get a **one-time move** into the matching Pommora Context key — `<Projects>:` gets `Title` for each `[[Title.slate]]` (Nathan, 09-01-2026; whether the bare key is then deleted or kept is pending his answer — the pass defaults to **keeping** the bare key, the recoverable reading). Every `.slate` title already names an existing Pommora Space, so the pass **creates nothing** — a `.slate` title with no matching Space is listed in the dry-run report and left alone, never invented. Bare context keys holding anything else are never touched.
  3. **Select/Status values as one-element lists**, matching what the app now writes.
  4. **`.trash` bundles** get the identical treatment.
  5. **`properties.json` re-registered** from the vault's actual keys and values: `Status` (Status type; its options exactly Active · Paused · Archived · Revisit · Complete · Closed, in that order — a vault value outside the six is listed by the dry-run, never invented), `Pinned` (Checkbox), `Timeframe` (Date), **`Brand`** (Select — there is no Text type; options harvested from the values in use) and **`Price`** (Number), and the **Link properties merged**: where Obsidian and Pommora use the same key name (`Links`), one Pommora Link (`url`) property under that exact name so the existing `"[[Page]]"` values are its connections. `tags` stays Obsidian's — not registered. Empty bare keys stay empty and unregistered. Assignments: each registered property is assigned to every Collection whose pages hold its key.
  6. **`.nexus/property-cascade.json`** deleted if present; **`nexus.db` untouched** (the index generation rebuilds the index on open); every `.md` the pass rewrites keeps its foreign keys and comments byte-identical (the pass edits the YAML document in place, as `pageFile.ts` does).
  Dry-run first: print every file and every key the pass would change, with counts against the 08-31-2026 survey (`<Status>`×6, `<Pinned>`×4, `<Timeframe>`×1, six bare `Status:` twins), then run.
- **Every phase is verified by the executor** over CDP — Phase 1 against NexusOS on the converted vault (the automated Gate 1 checks), every later phase against scratch nexuses. NexusOS is opened again only at closeout, read-only. **No migration code exists in the app**: the vault conversion is a throwaway script in the session scratchpad, run once by hand by the executor, and nothing of it is committed.
- **The Metadata section title** is Nathan's call; the other single-section leaves leave theirs untitled.
- **Nathan is unavailable for the whole run** (Nathan, 09-01-2026 — supersedes "Nathan drives Gate 1"). Gate 1 is not a wait: the executor runs the vault pass, the automated Gate 1 checks, pings, and continues at once. Every user-facing behavior is covered by an interaction checklist the executor writes before closeout — the directive's manual list widened to every interaction the change touches (each action and its inverse, each toggle on and off, each external-write shape, each restore path) — and runs over CDP against a scratch nexus, expected-vs-observed recorded under Closeout.
- **The run ends with a push.** The final commit closes the plan; the closing report is the summary plus an honest account, and `main` is pushed to `origin` afterward. Nothing is left in the working tree — doc edits that don't belong to a task's commit get their own commit before the push.
- **Gate 1 is automated** (Nathan, 09-01-2026). Nathan's two boxes are replaced by checks the executor runs: (a) the vault pass's own post-check — for every rewritten `.md`, the parsed frontmatter after equals the frontmatter before under the translation (wrapped property → bare, twin-wins; `(C)` → `<C>`; Select/Status wrapped as one-element lists) and every other key and the body are byte-identical, with counts printed against the survey; (b) NexusOS opened on the Phase 1 build over CDP, the Ideas Collection's `loadValues` compared page by page against the files' frontmatter — every Status equal, no registered key reading foreign. Obsidian's own panel isn't driven. The Settings row Task 7 removes needs no verification beyond `rg` → 0.
- **Status translates exactly** (Nathan, 09-01-2026): the registered Status property's options are, in order, Active · Paused · Archived · Revisit · Complete · Closed; every vault value maps onto one of those six or the dry-run lists it.
- **The single-value resolution is tested per type** (Nathan, 09-01-2026): Task 10's red-first cases run once against a Select definition and once against a Status definition, not through one shared "single" fixture; and the lines that resolve an externally written option list to the property's value are isolated in one named function in `propertyValue.ts`, so the rule has one address.
- **Gate 0, the re-read window** (executor, 08-31-2026). `setPageContext` now reads once under its lock and `setGovernedRootKeys` reads again; a page deleted in the microtask between them throws `ENOENT` into the mutate envelope where the old path wrote its stale first read back — resurrecting the deleted page. The window sits inside the held file lock and the new outcome is the better one; no code added. From `restoreCachedValues` the same throw is absorbed by `reconcile`'s catch and the entry stays cached, exactly as before (probe-verified).
- **Closeout's manual list is at least fifteen actions**, each stated as expected behavior before the attempt and watched over CDP, observed behavior recorded beside it.

### Open Against Later Tasks

### Deviations

- **Task 0, the sweep's shape.** The comment-killer agent fanned out to three sub-agents on its own; all three were stopped and the sweep finished single-handed. A parallel session was live in the same tree throughout (its commit `345a82ab` removed both `(Nathan's call)` markers, so that control reads 0 from here on, and it holds uncommitted CSS edits that ride no commit of this arc). Task 0's "only comment lines moved" grep flags two lines whose trailing same-line comment was removed (`watcher.ts` `ignoreInitial`, `propertyValue.ts`'s `select` union member); the code on those lines is unchanged. `npm run lint` as a whole is red on the other session's unformatted `window-base.css`; Biome over the 26 files this task touched is clean.

### Lessons

### Sequenced After

- Text property type (log Prospects) — `decodeValue` stays type-dispatched so a `text` arm slots in.
- Echo-window fix — external writes landing inside 2000ms of an app write are still dropped.
- Full context unwrap; `types.json` cohabitation (Sapphire); page aliases in `aliases:`.

### Closeout

---

## Completion Criteria

**The directive**

```
Execute .claude/Planning/Unwrapped Frontmatter — Implementation Plan.md end to end. Unattended overnight — stop only when a task is wrong as specified or a gate cannot go green after a real fix attempt; never for a question the plan or the decision log already answers. There is no planned pause: at Gate 1 run the vault pass per the Rulings entry "Vault conversion", run the automated Gate 1 checks, ping Nathan, and continue — he is unavailable for the run, and no migration code exists in the app.
Live-verify, in this order, at closeout: (1) open NexusOS, the Ideas Collection — every page's Status shows the value its frontmatter holds (the same values Obsidian shows), Contexts resolve, nothing reads foreign that the registry names; (2) then the MANUAL list below, each tried in the running app over CDP against a scratch nexus (never NexusOS), each with its expected outcome stated before the attempt and the observed outcome recorded under Closeout.
Manual list: an external write of Status: [Open, Active] → Active shows within one settle · an external Status: [Wip] (unknown) → cell blank, key deleted on the next value edit · an external Tags: [alpha, zeta] → zeta shows uncolored, adopted into properties.json on the next value edit, then colored-default · a Checkbox written false externally → reads unchecked and "is empty" filters it · a new property created by editing a page's frontmatter as another app would (a bare key not yet registered) → foreign until registered in Pommora, then live on the first view without re-indexing · registering a property whose key already exists on pages → the values appear at once · renaming a property onto a key some page already uses → refused with the message · clearing a cell → key gone · unassigning a page's last Space → <Context> key gone · setting Priority on a page holding a drifted Status list → Status repaired to one element, foreign keys byte-identical · Repair On Open toggled on, a hand-drifted page, relaunch → canonical · Capitalize on → tags reads Tags everywhere but the rename field · a cover save → card updates without reopening · an option rename/delete on a list-shaped Select → every holder rewritten · Clear Exclusion → property values survive, <Context> keys and stamps gone, aliases and dashboard layouts intact after relaunch. Another app's UI is not driven; its writes are reproduced byte-for-byte (the serializers are identical, executed).
Screenshots: Gate 1 (a page in Obsidian's Properties panel and in Pommora); Gate 5 (the Properties leaf's Metadata section); closeout (the Ideas Collection table).
Pings: per phase · at the Gate 1 stop · at completion.
Record: History arc "Compatible Properties".
Docs: surgical — rewrite only the sentences Made False names and what closeout proves false; never mention Obsidian by name where "another application" or "a shared vault" reads the same; the Features docs describe Pommora's format, not another app's.
Progress artifact: republish .claude/Planning/Compatible-Properties-Progress.html to https://claude.ai/code/artifact/fe48782e-d0e9-49d3-b3d4-8e90704b3b9a (pass it as `url`; read it first) at the start of every task, every gate, the Gate 1 stop, and closeout — edit only the JSON `data` block: `now`, each task's `state`/`sha`/`note`, each phase's `state`/`base`/`gate.output`/`gate.deviation` — so Nathan can follow while away.
Also: after Phase 5, dispatch the sustainability judge — an agent handed the pre-Phase-0 and post-Phase-5 trees, the file list from the Reduction Ledger, and only the question "which is more sustainable, and why"; its answer is recorded verbatim under Closeout.
Everything else is the standard below.
```

**The Standard**

- **The bar.** A future review of this arc finds nothing to correct.
- **Only the live confirmation may be pending.** No concerns carried, no deferrals when the fix is known.
- **Reusability first.** A second resolver, reconcile, writer, or epoch means the plan is wrong, or you are — log it before proceeding.
- **Fix at the source.** Add code only where it repairs something flawed or makes things simpler.
- **Ambiguity:** take the simplest reading, record it under Rulings or Deviations, continue.
- **Per phase:** implement → simplify → comment pass → gates (exit codes read directly, never piped) → code review → attack review → every finding fixed or carrying a defensible ruling → commit → ping.
- **Comments** only where the why can't be inferred. **Docs** rewritten, never amended. Nathan's unattributed doc edits ride the commit at hand.

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The Acceptance criterion observed running, clause by clause, in a scratch nexus.
- [ ] The sustainability judge answered "after"; its reasoning recorded under Closeout.
- [ ] Net test count ≤ the pre-Phase-0 count; the sigil suite gone; a foreign-key-collides-with-property fixture present.

**The passes**

- [ ] Simplification and the comment pass over the whole range, not only per phase.
- [ ] Simplification → code review over the full implementation, in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against the decision log.
- [ ] Attack review after the claim is verified; every finding fixed or carrying a defensible ruling.

**The live pass** (the executor's, over CDP — Nathan is unavailable for the run)

- [ ] Gate 1: the vault pass done; NexusOS's Ideas Collection agrees with its files page by page.
- [ ] Clearing a cell removes its key; unassigning a page's last Space removes `<Context>`; setting Priority on a page with a drifted `Status` list repairs it to one element.
- [ ] An Obsidian edit to an open Collection's page appears in the table within a second, on a row you had edited that session as well as one you hadn't.
- [ ] A cover save still updates the card.
- [ ] Both toggles in the Properties leaf; Capitalize shows `tags` as "Tags" everywhere but the rename field; Repair On Open canonicalizes a hand-drifted scratch page on relaunch.
- [ ] Renaming a property onto a key some page uses is refused with a readable message.

**The record**

- [ ] Every Made False row landed in the commit that falsified it.
- [ ] Dead Vocabulary at zero against its control.
- [ ] Context and Handoff current; the History entry written to its format.
- [ ] Lessons routed to `.claude/Guidelines`; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way · what each screenshot showed · every gate's real output · in-flight decisions · what's left for the live pass · final +/− line count, comments and tests excluded, against the Reduction Ledger. Honest about what didn't work.
