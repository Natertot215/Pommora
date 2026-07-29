# Property Syntax Unification — Implementation Plan

**Spec:** `.claude/Planning/Property Syntax Unification — Decision Log.md` — ratified after three adversarial rounds. Every reference below (`B-2`, `H-3`, `K-1a`…) points there. Read it before Phase 1; this plan does not restate its reasoning.

**Goal:** Page and agenda property values move out of the ULID-keyed `properties:` map and become wrapped, name-keyed entries at the frontmatter root, so one syntax governs every Pommora-owned key.

**Architecture:** One module owns the reserved syntax. One type-directed decoder replaces three. One governed-root-key writer serves both sigils. A rename commits the registry, then sweeps once. The removal half is scheduled work, not cleanup.

**Tech Stack:** Electron 42 · React 19 · TypeScript 6 · `eemeli/yaml` · Vitest.

---

## Deviations From The Plan-Writing Discipline, And Why

The skill's default shape assumes a greenfield feature built by an engineer with no context. This is a format migration inside a mature subsystem, executed by the agent that wrote the spec. Four deviations, each argued:

**1. TDD applies to new behaviour, not to deletion.** The skill mandates write-failing-test-first for every step. That is right for the syntax module, the decoder and the sweep — all genuinely new. It is theatre for "delete the `$status` branch," where the meaningful verification is that the compiler finds every consumer and that an existing test *inverts*. So: **new behaviour gets a failing test first; changed behaviour gets its existing test inverted in the same commit; removal gets a straggler grep.** Each phase names which mode it is in.

**2. The typecheck is a discovery tool, not just a gate.** Removing a union member and a frontmatter key makes the compiler enumerate every consumer. That is more reliable than any inventory I could write by hand, and the plan uses it deliberately — several steps say "typecheck will list these; fix each." Treating it only as a pass/fail gate wastes its best property here.

**3. There is a window where the app is broken, and the plan schedules it rather than avoiding it.** No migration code exists by design (`F-1`), so between the read path switching to wrapped keys and the live files being converted, property values do not render. Avoiding that window would require dual-read code — the exact thing the spec forbids. The window is bounded to Phase 3→Phase 8 and the plan says so out loud.

**4. Commits are per phase, not per step.** The skill's "commit after every green test" produces a commit history where half the commits describe a codebase that cannot build — this migration crosses module boundaries, so a phase is the smallest unit that is internally consistent. Each phase still ends green on all four gates.

---

## Global Constraints

Every task's requirements implicitly include these.

- **Values on disk are bare.** Native YAML types survive; nothing is wrapped or tagged. (`B-4`)
- **Keys are `(Context)` and `<Property>`** — single delimiters, written plain and unquoted. Never `[[…]]`, reserved for Connections-in-frontmatter. (`B-1`, `B-3`)
- **No migration code.** Nothing reads, detects, or converts the outgoing shape. The live nexus is converted by hand. (`F-1`)
- **Every merge names its loser.** A replaced implementation is deleted in the same phase, never left beside its replacement. (`I-4`)
- **YAGNI.** No guard, retry, rollback or reporting path for an event needing a coincidence chain. (`H-5a`)
- **No key is built renderer-side** except for the optimistic patch. Main resolves id→name inside the file lock. (`H-8`)
- **Docs ship with the code that makes them stale** — bundled into that phase's commit, not deferred to Phase 9. Phase 9 is for the prose that needs rewriting, not for catching up.

---

## Execution Notes

**Gates, all four, every phase:**

```bash
npm run typecheck && npm run lint && npx vitest run && npm run build
```

Never pipe a gate through `head`/`tail` — a piped exit code is the tail's, and it has masked a red suite before. Read the summary line.

**The live app.** Nathan runs the dev app against `~/NexusOS` with HMR. Renderer edits appear immediately. **`src/main` and `src/preload` changes do not hot-reload and are not picked up by ⌘R — they need the dev process restarted.** Phases 4, 6, 7 and 8 all touch main. Launch is `env -u ELECTRON_RUN_AS_NODE npm run dev`; the env var being set is what makes Electron run as plain Node and crash.

**Screenshot verification** is available headlessly via `--remote-debugging-port` + CDP `Page.captureScreenshot`. Use it for Phase 8's verification rather than asking Nathan to look.

**Never type into the running editor to test** — it autosaves to the real Nexus. Create a throwaway page if a live editor check is needed.

**Rollback is git.** Each phase is one commit; abandoning a phase is `git reset --hard HEAD~1`. No rollback machinery is written.

**Agent discipline.** Phase reviews run **one at a time**, never concurrently — a prior dispatch turned into thirteen agents writing across one tree. Every brief forbids sub-agents. Confirm `git status` is quiet before the next writer starts.

---

## The Consumer Inventory

Everything that touches the outgoing shape. The straggler gate in Phase 7 checks this list is empty; it exists here so nothing is discovered late.

**Reads the `properties` map:** `crud/loadValues.ts:16-33` · `pipeline/value.ts:123` · `PagePreview/PreviewInspector.tsx:111` (a raw presence read by id, schema one line away at `:42`) · `crud/removeProperty.ts:54` · `crud/deleteProperty.ts:41` · `crud/schema.ts:56`

**Writes it:** `shared/propertyValue.ts:152-161` · `crud/page.ts:35,112-118` · `crud/agendaEntity.ts:33,109-110` · `crud/pageValue.ts:47-59` · `crud/removeProperty.ts:171-176`

**Builds a key renderer-side (optimistic patches):** `Table/TableView.tsx:625-628,1206-1210,1224-1228` · `Cards/CardsView.tsx:112-115` · `PagePreview/PreviewInspector.tsx:116-119` — each needs the same rider treatment `contextValues` already gets.

**Produces or consumes `kind: 'status'`:** `pipeline/group.ts:142` · `pipeline/sort.ts:55` · `PropertyEditing/valueClick.ts:25,28` · `PropertyEditing/PropertyPicker.tsx:24,178` · `Table/Cell.tsx:82,102-103` · `Table/reassign.ts:15` · `crud/removeProperty.ts:102`. Four of these already read `select || status`; the typecheck will list all of them.

**Id-keyed with no registry access, needing id→name:** `crud/removeProperty.ts` `removeInner` · `crud/schema.ts:54-66` `stripPageMember`

**Tests pinning the outgoing shape** (~15 files) — inventory in Phase 0.

---

## Phase 0: Inventory The Tests That Pin The Old Shape

Not busywork. Tests are the one consumer the compiler cannot find for us, and a test asserting the outgoing behaviour will look like a regression later instead of like intent.

- [ ] **Step 0.1 — List them**

```bash
cd Pommora && grep -rln "properties:\s*{\|prop_[0-9A-Z]\|\$status\|\$ctx\|parsePropertyValue\|applyPropertyValue\|coerceToDeclaredType\|reconcileCachedValue\|contextKey\|parseContextKey" src/ --include="*.test.ts" --include="*.test.tsx"
```

- [ ] **Step 0.2 — Classify each** into *invert* (asserts behaviour that intentionally changes — e.g. `registryProperty.test.ts:40-43` asserting duplicate names are legal, `contexts.test.ts:32-33` pinning the bracket ban), *retarget* (asserts surviving behaviour through an outgoing shape), or *delete* (asserts only the outgoing shape).
- [ ] **Step 0.3 — Write the classification into this plan file** under each phase that owns it, then commit the plan edit. A phase that changes behaviour without touching its pinning test has not finished.

---

## Stage A — Build

### Phase 1: The Reserved-Syntax Module

Everything downstream reads from this, so it ships first and no consumer hard-codes a glyph. Mode: **new behaviour, TDD.** (`D-1`)

**Files:** Create `src/shared/governedKeys.ts` + `src/shared/governedKeys.test.ts`

**Produces:** `wrapKey(layer, name)` · `parseGovernedKey(key)` · `isGovernedKey(key)` · `normalizePropertyName(raw)` · `invalidPropertyName(name)` · `KEY_REFUSAL`

- [ ] **Step 1.1 — Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parseDocument } from 'yaml'
import {
  wrapKey, parseGovernedKey, isGovernedKey, normalizePropertyName, invalidPropertyName,
} from './governedKeys'

describe('governedKeys', () => {
  it('wraps each layer in its own sigil', () => {
    expect(wrapKey('context', 'Projects')).toBe('(Projects)')
    expect(wrapKey('property', 'Status')).toBe('<Status>')
  })

  it('round-trips a name containing the closing glyph', () => {
    expect(parseGovernedKey(wrapKey('property', 'Budget (USD)')))
      .toEqual({ layer: 'property', name: 'Budget (USD)' })
  })

  it('rejects unwrapped, mismatched, empty and legacy keys', () => {
    for (const k of ['Projects', '(Projects>', '<>', '()', '[Projects]', '[[Projects]]'])
      expect(parseGovernedKey(k)).toBeNull()
  })

  it('governs any wrapped key, malformed included, so a rewrite still sweeps it', () => {
    expect(isGovernedKey('(Anything')).toBe(true)
    expect(isGovernedKey('<Anything')).toBe(true)
    expect(isGovernedKey('id')).toBe(false)
  })

  it('normalizes once — trim then NFC', () => {
    expect(normalizePropertyName('  Café  ')).toBe('Café'.normalize('NFC'))
  })

  it('refuses a leading $ and an empty name, allows an interior $', () => {
    expect(invalidPropertyName('$Status')).toBe(true)
    expect(invalidPropertyName('   ')).toBe(true)
    expect(invalidPropertyName('Budget ($)')).toBe(false)
  })

  // The reason both glyphs were chosen. This test is why the module exists and stays permanently.
  it('a hand-typed unquoted key parses clean and survives a write plain', () => {
    for (const key of ['(Projects)', '<Status>', '<Budget ($)>']) {
      const doc = parseDocument(`id: P\n${key}: Complete\n`)
      expect(doc.errors).toHaveLength(0)
      expect(Object.keys(doc.toJSON())).toContain(key)
      doc.set('modified_at', 'T')
      expect(doc.toString({ lineWidth: 0 })).toContain(`${key}:`)
    }
  })
})
```

- [ ] **Step 1.2 — Run it, confirm it fails**

`npx vitest run src/shared/governedKeys.test.ts` → FAIL, module not found.

- [ ] **Step 1.3 — Write the module**

```ts
// The one owner of Pommora's reserved frontmatter syntax: which glyphs wrap which layer, how a key
// is built and read, what a name may not be, and what a refusal says. Every consumer reads from
// here, so changing a glyph is a one-line edit. Both sigils are deliberately NOT YAML flow
// indicators — a wrapped key writes plain and unquoted, so what Pommora emits and what a person
// types by hand are byte-identical.

export type GovernedLayer = 'context' | 'property'

const SIGIL: Record<GovernedLayer, readonly [string, string]> = {
  context: ['(', ')'],
  property: ['<', '>'],
}

/** Reserved for system-assigned roles — a user name may not start with it. */
export const RESERVED_NAME_PREFIX = '$'

export const KEY_REFUSAL = {
  empty: 'A name cannot be empty.',
  reservedPrefix: `A name cannot start with ${RESERVED_NAME_PREFIX}.`,
  duplicate: (name: string) => `A property named "${name}" already exists.`,
} as const

export function wrapKey(layer: GovernedLayer, name: string): string {
  const [open, close] = SIGIL[layer]
  return `${open}${name}${close}`
}

/** Any wrapped key, malformed ones included — governance is by shape, so a root rewrite still
 *  sweeps a key it cannot parse. */
export function isGovernedKey(key: string): boolean {
  return Object.values(SIGIL).some(([open]) => key.startsWith(open))
}

/** Positional strip, so a name containing the closing glyph round-trips. */
export function parseGovernedKey(key: string): { layer: GovernedLayer; name: string } | null {
  for (const [layer, [open, close]] of Object.entries(SIGIL) as [
    GovernedLayer,
    readonly [string, string],
  ][]) {
    if (key.length > open.length + close.length && key.startsWith(open) && key.endsWith(close)) {
      return { layer, name: key.slice(open.length, -close.length) }
    }
  }
  return null
}

/** Applied once at write, so an untrimmed or denormalized name never reaches disk. */
export function normalizePropertyName(raw: string): string {
  return raw.trim().normalize('NFC')
}

export function invalidPropertyName(name: string): boolean {
  const n = normalizePropertyName(name)
  return !n || n.startsWith(RESERVED_NAME_PREFIX)
}
```

- [ ] **Step 1.4 — Run the test** → PASS.
- [ ] **Step 1.5 — Gates and commit**

```bash
npm run typecheck && npm run lint && npx vitest run && npm run build
git add src/shared/governedKeys.ts src/shared/governedKeys.test.ts
git commit -m "feat(syntax): one owner for the reserved frontmatter syntax"
```

- [ ] **Step 1.6 — Phase review** (brief below, scoped to this phase).

---

### Phase 2: One Type-Directed Decoder

Three decoders become one. The shape-guessing codec exists only because a ULID key said nothing about type; a named key resolves to its definition first. Mode: **new behaviour TDD + compiler-driven consumer sweep.** (`K-1`)

**Files:** Modify `src/shared/propertyValue.ts` + its test · delete `STRING_KIND_FOR_TYPE`/`coerceToDeclaredType` from `pipeline/value.ts:43-68` · delete `reconcileCachedValue` from `crud/removeProperty.ts:82-134` · retarget `Table/Cell.tsx:82,102-103`

**Produces:** `decodeValue(def, raw, opts?: { strict?: boolean }): PropertyValue` · `encodeValue(v): unknown`

`strict` is restore's schema-currency gate and nothing else: option membership, raw-JS-type rejection, emptiness rejection. Reads pass nothing. This is the merge naming its loser — read's leniency wins by default, restore's strictness becomes an argument. (`K-1a`)

- [ ] **Step 2.1 — Write the failing test**

```ts
const def = (over: Partial<PropertyDefinition>): PropertyDefinition =>
  ({ id: 'p', name: 'P', type: 'select', ...over }) as PropertyDefinition

it('reads a status value as its bare label', () => {
  const d = def({ type: 'status', status_groups: [
    { id: 'g', label: 'G', color: 'blue', options: [{ value: 'Done', label: 'Done', group_id: 'g' }] },
  ] })
  expect(decodeValue(d, 'Done')).toEqual({ kind: 'select', value: 'Done' })
})

it('never guesses from shape — a select option shaped like a date stays a select', () => {
  expect(decodeValue(def({ type: 'select' }), '2024-01-01'))
    .toEqual({ kind: 'select', value: '2024-01-01' })
})

it('lenient by default: an unknown option still renders its raw text', () => {
  const d = def({ type: 'select', select_options: [{ value: 'A', label: 'A' }] })
  expect(decodeValue(d, 'Gone')).toEqual({ kind: 'select', value: 'Gone' })
})

it('strict rejects what the schema cannot validate', () => {
  const d = def({ type: 'select', select_options: [{ value: 'A', label: 'A' }] })
  expect(decodeValue(d, 'Gone', { strict: true })).toEqual({ kind: 'null' })
  expect(decodeValue(def({ type: 'number' }), '5', { strict: true })).toEqual({ kind: 'null' })
  expect(decodeValue(def({ type: 'url' }), '', { strict: true })).toEqual({ kind: 'null' })
})

it('encodes bare — no tagged objects', () => {
  expect(encodeValue({ kind: 'select', value: 'Done' })).toBe('Done')
  expect(encodeValue({ kind: 'number', value: 42 })).toBe(42)
})
```

- [ ] **Step 2.2 — Run it, confirm it fails.**
- [ ] **Step 2.3 — Rewrite the codec type-directed.** Switch on `def.type`. No shape inference, no regexes — delete `SCHEME`, `YMD`, `ISO_DATETIME`. `encodeValue` returns `value.value` for every case except `file` (the array) and `lastEditedTime` (throws, unchanged).
- [ ] **Step 2.4 — Remove `{ kind: 'status' }` from the `PropertyValue` union. Keep `{ kind: 'context' }`.** Context is genuinely not redundant: the type resolver runs without the Context id list on the value path (`pipeline/value.ts:100`), so nothing downstream can derive it from the schema, and `CardValue.tsx:56-58` says so in its own comment. Applying J-2 uniformly would break Context cells. (`K-1b`)
- [ ] **Step 2.5 — Delete the two other decoders.** `resolveFieldValue` returns the decoder's result directly. `reconcileCachedValue`'s two call sites become `decodeValue(def, raw, { strict: true })` — which requires `removeInner` to hold the registry it currently does not.
- [ ] **Step 2.6 — Retarget the three Status looks onto the declared type.** `Cell.tsx:82` gates Capsule and Checkbox on the value's kind; `:102-103` passes the kind to `chipShapeForType`. Both take `declaredType(...)`, already computed at `:63`. **Without this the pill silently becomes a label and two looks stop rendering, with no error.** (`J-1`)
- [ ] **Step 2.7 — Let the typecheck find the rest.** It will list every remaining `kind: 'status'` consumer from the inventory. Fix each to read the declared type; **do not re-add the union member** to quiet an error.
- [ ] **Step 2.8 — Gates, commit, phase review.**

```bash
git commit -m "refactor(properties): one decoder that reads the type instead of guessing at it"
```

---

### Phase 3: The Read Path

**From here until Phase 8, property values do not render in the live app.** That is the scheduled window — no dual-read code exists by design.

**Files:** `readNexus.ts:206-215` (generalize retention to every governed key) · `crud/loadValues.ts` · `Table/resolveContext.ts:18-26` · `pipeline/value.ts` · `PagePreview/PreviewInspector.tsx:111`

- [ ] **Step 3.1 — Write the failing test**

```ts
it('resolves a value from its wrapped root key', () => {
  const fm = { id: 'p1', '<Status>': 'Done' } as unknown as PageFrontmatter
  const schema = [{ id: 'prop_1', name: 'Status', type: 'status' }] as PropertyDefinition[]
  expect(resolveFieldValue(rowWith(fm), 'prop_1', schema))
    .toEqual({ kind: 'select', value: 'Done' })
})
```

- [ ] **Step 3.2 — Run it, confirm it fails.**
- [ ] **Step 3.3 — Build the name→definition index once per container.** `buildResolveContext` gains `defsByName`. `resolveFieldValue` reads the property's name from its def, then `fm[wrapKey('property', name)]`. A per-cell scan is already the measured hot spot; this must be built once, not per cell. (`G-2`)
- [ ] **Step 3.4 — Re-key the value memo.** `resolvedByFm` (`pipeline/value.ts:113`) keys on frontmatter identity + property id; add the resolved **name**, or a rename that does not swap the frontmatter identity serves a stale value. (`G-3`)
- [ ] **Step 3.5 — Fix the preview inspector's raw presence read** (`PreviewInspector.tsx:111`) — it has the schema one line away at `:42`.
- [ ] **Step 3.6 — The agenda read path takes the same keys.** Agenda item values resolve against their kind's own `property_definitions`, not the registry — a separate namespace, so an agenda property and a page property may share a name with no collision. The *shape* is identical (wrapped keys at the JSON root) and the writer is shared, but the definition lookup is not: agenda resolves through `_taskconfig.json` / `_eventconfig.json`. **JSON quotes every key, so the unquoted-key property is YAML-only and does not apply here.** Zero agenda items exist in either nexus, so this is code-only with nothing to convert. (`B-8`)
- [ ] **Step 3.7 — Gates, commit, phase review.**

---

### Phase 4: The Write Path

Two write paths become one, and the loser is deleted. (`I-4`)

**Files:** Create `src/main/crud/governedWrite.ts` · modify `crud/page.ts:105-122`, `crud/agendaEntity.ts:101-113`, `crud/contextWrite.ts:113-193` · delete `applyPropertyValue` (`propertyValue.ts:152-161`) · update the three optimistic-patch sites

- [ ] **Step 4.1 — Write the failing test**

```ts
it('writes one governed key and preserves foreign keys and comments', async () => {
  await writeFile(p, '---\nid: p1\n# keep me\nfoo: bar\n---\nbody\n')
  await setGovernedRootKey(p, '<Status>', 'Done')
  const out = await readFile(p, 'utf8')
  expect(out).toContain('<Status>: Done')
  expect(out).toContain('# keep me')
  expect(out).toContain('foo: bar')
})

it('an emptied value deletes its key — never a placeholder', async () => {
  await setGovernedRootKey(p, '<Status>', null)
  expect(await readFile(p, 'utf8')).not.toContain('<Status>')
})
```

- [ ] **Step 4.2 — Run it, confirm it fails.**
- [ ] **Step 4.3 — Write `setGovernedRootKey`** on `mergeFrontmatter`, governed keys computed by shape across both the original and next roots.
- [ ] **Step 4.4 — Resolve the name in main, inside the file lock.** `updatePageProperty` gains the registry and builds the key there. Preserve the locking asymmetry: `setPageContext` takes its own lock; `updatePageProperty` is wrapped by its caller at `mutate.ts:474`. A naive merge drops one.
- [ ] **Step 4.5 — Route Contexts through the same writer; delete `applyTarget` and `governedContextKeys`.**
- [ ] **Step 4.6 — Update the optimistic patch sites** (TableView ×3, CardsView, PreviewInspector) to build keys through `wrapKey`, the same rider treatment `contextValues` already has.
- [ ] **Step 4.7 — Gates, commit, phase review.** Restart the dev process — this phase is main-side.

---

### Phase 5: Contexts Move To `(…)`

Free today: zero wrapped context keys exist on disk in either nexus, and this is the last moment that is true. (`F-4`)

- [ ] **Step 5.1** — `contexts.ts:26-43`'s `contextKey`/`parseContextKey`/`isGovernedContextKey` become thin re-exports of Phase 1's module; delete the local implementations. **Note the inversion:** `parseContextKey:42` rejects interior brackets today, which would reject the new form — Phase 1's positional strip replaces that logic rather than amending it.
- [ ] **Step 5.2** — `invalidContextTitle`'s bracket ban goes (`contexts.ts:52-53`); `contexts.test.ts:32-33` pins it and **inverts**. Intended behaviour change, not a regression. (`D-4`)
- [ ] **Step 5.3** — Gates, commit, phase review.

---

### Phase 6: The Rename

Registry first, then one sweep. (`H-2`, `H-3`)

**Files:** `crud/registryProperty.ts:41-59` · `main/index.ts:726-737` · `store.ts:1410-1424` · `Table/TableView.tsx:141-153` · `Cards/CardsView.tsx:87-96` · `registryProperty.test.ts:40-43` (**inverts**)

**Interfaces:**
- Consumes: `wrapKey`, `parseGovernedKey`, `normalizePropertyName`, `invalidPropertyName` (Phase 1) · `setGovernedRootKey` (Phase 4)
- Produces: `renameSweep(root: string, oldName: string, newName: string): Promise<void>` — the single pass, exported for its test; `editProperty` calls it after the registry commits.

- [ ] **Step 6.1 — Write the failing tests**

```ts
it('drops the old key where the new one already exists', async () => {
  await writeFile(p, '---\nid: p1\n<Status>: Old\n<Stage>: New\n---\n')
  await renameSweep(root, 'Status', 'Stage')
  const out = await readFile(p, 'utf8')
  expect(out).toContain('<Stage>: New')
  expect(out).not.toContain('<Status>')
})

it('renames in place where only the old key exists', async () => {
  await writeFile(p, '---\nid: p1\n<Status>: Old\n---\n')
  await renameSweep(root, 'Status', 'Stage')
  expect(await readFile(p, 'utf8')).toContain('<Stage>: Old')
})

it('is idempotent', async () => {
  await renameSweep(root, 'Status', 'Stage')
  const once = await readFile(p, 'utf8')
  await renameSweep(root, 'Status', 'Stage')
  expect(await readFile(p, 'utf8')).toBe(once)
})
```

- [ ] **Step 6.2 — Run, confirm failing.**
- [ ] **Step 6.3 — Implement the sweep.** Reuse `cascadePages` (`optionOps.ts:176-185`) — already `allCollectionFolders` → `listMarkdownFiles` → `rewritePageSerialized`, exactly this scope. Rewrite rule: **new key present ⇒ delete old; else rename old → new.** The new key always wins and needs no comparison, because the registry switched first so every write during the sweep used the new name. (`H-3`, `H-3a`)
- [ ] **Step 6.4 — Order the rename.** Wrap the handler in `serializeSchemaOp`. It currently runs on the registry file's own chain while remove, delete, assign and the option cascades run on the shared one — harmless while a rename touched no files, unsafe the moment it sweeps. One line closes rename-against-remove, delete, option-cascade and rename. (`H-3c`)
- [ ] **Step 6.5 — Uniqueness and normalization.** Drop `{ unique: false }` at `registryProperty.ts:28,51`; normalize the name through Phase 1 before persisting. Rename onto a taken name fails; create disambiguates. (`C-5`, `C-7`, `D-6`)
- [ ] **Step 6.6 — Refetch values when a rename lands.** The values snapshot loads once per container open keyed on `source.path`, and the file's own comment says it never re-reads mid-session. A rename does not change that path, so **the whole column reads blank until the user navigates away and back** — 100% reproducible, not a race. `submitPropertyRename` must refresh values, not just the tree. (`H-3d`)
- [ ] **Step 6.7 — Gates, commit, phase review.** Restart the dev process.

---

## Stage B — Remove

### Phase 7: The Removal Half

Nothing here is optional or deferred. This phase is what makes the change a reduction. Mode: **straggler grep, not TDD.** (`I-1`…`I-7`)

- [ ] **Step 7.1** — `properties` out of `PAGE_MODELED_KEYS` and `pageFrontmatter` (`schemas.ts:90,103`), out of `createPage` (`page.ts:35`) and `createAgendaEntity` (`agendaEntity.ts:33`).
- [ ] **Step 7.2** — `folded_headings` out of the schema and the modeled set. No reader, no writer, zero on disk. (`B-10`)
- [ ] **Step 7.3** — `removeProperty.ts:60-61` stops writing an empty cache block — same no-empties rule already enforced three feet away. (`J-3`)
- [ ] **Step 7.4** — Three sidecar read-mutate-write implementations (`assignment.ts:14-29`, `removeProperty.ts:38-70`, `deleteProperty.ts:74-91`) route through one, with the cache-delete-when-empty rule — currently duplicated in two different spellings — in one place.
- [ ] **Step 7.5** — Three validators collapse to one core with thin wrappers. `validateName` has zero character bans today, `invalidName` never sees a property name, and `invalidContextTitle` re-implements a subset of the basename rules while claiming to share them. (`D-5`)
- [ ] **Step 7.6 — The straggler gate.** This is the phase's real deliverable:

```bash
cd Pommora && grep -rn "properties?\.\[\|properties: {}\|folded_headings\|\$status\|\$ctx\|parsePropertyValue\|coerceToDeclaredType\|reconcileCachedValue\|applyPropertyValue\|STRING_KIND_FOR_TYPE" src/ --include="*.ts" --include="*.tsx"
```

Expected: **no output.** Any hit is a straggler — fix before committing. Run it again including tests; a test still pinning the outgoing shape is the same failure.

- [ ] **Step 7.7 — Gates, commit, phase review.**

---

### Phase 8: Migrate The Live Nexus By Hand

No helper code. (`F-1`) This closes the broken window opened in Phase 3.

- [ ] **Step 8.1** — `tar` the affected files to `~/Pommora-premigration-backups/`, verify the archive lists them, before touching anything.
- [ ] **Step 8.2** — Convert the 6 pages carrying real values: each `properties.prop_X: v` becomes `<Name>: v` at the root, the name resolved from `.nexus/properties.json`. Use the repo's own `yaml` through a throwaway script mirroring `pageFile.ts` — `doc.set`/`doc.delete` only, never regex, so comments and foreign keys survive.
- [ ] **Step 8.3** — Strip `properties: {}` from the 33 pages carrying it.
- [ ] **Step 8.4** — Convert any `property_cache` block holding cached values; drop the empty ones.
- [ ] **Step 8.5 — Verify:** zero `properties:` in any frontmatter; bodies byte-identical; Obsidian's own bare keys untouched; every converted value rendering in the running app, confirmed by screenshot.
- [ ] **Step 8.6** — Nothing to commit — the nexus is not the repo. Report counts.

---

## Stage C — Document

### Phase 9: Documentation Reconciliation

Roughly sixty statements across fifteen docs describe the outgoing format, a registry-only rename, or non-unique names. (`I-5`)

- [ ] **Step 9.1** — Dispatch explore agents over `.claude/`, read-only, to report conflicting statements. Serialize them.
- [ ] **Step 9.2** — Fix each: **reword the fact, keep the surrounding prose flowing.** No amendments, no "this changed" notes, no supersede markers. A fresh reader must not be able to tell the old version existed.
- [ ] **Step 9.3 — The larger rewrites.** `Features/Properties.md` — type catalog, identity-vs-name, schema mutations, validation, index. `Features/Architecture.md` — the assignment-line section inverts from what the line *costs* to what it *buys*. `PommoraPRD.md` — identity-and-linking, storage philosophy, properties.
- [ ] **Step 9.4 — Reframe `History.md`.** Dated entries record what shipped, never what remains true; this change takes its own newest-first entry. (`I-6`)
- [ ] **Step 9.5 — Fix the drift this surfaced that predates the change:** the PRD's identity claim describes a resolver and index that no longer exist and gets the true fact rather than a gap (`I-7`); the option-rename cascade is described as `$status`-only when it covers Select and Multi-select too; one fact carries three different numbers across two files.
- [ ] **Step 9.6** — Commit the docs.

---

## Closeout

- [ ] Final code-review + simplification pass over the whole change, both briefed with session context.
- [ ] `/handoff` — updates `Context.md`.
- [ ] The in-chat deliverable: overview, phase-by-phase, non-technical impact, line counts, what this unlocks.

---

## Review Briefing

Every phase-review agent gets this verbatim above its scope. Without it, reviewers re-raise settled decisions and the findings are mostly noise.

> **Already decided — do not re-raise.** Single delimiters `(Context)` / `<Property>`, not doubled, not square brackets; `[[…]]` reserved for Connections-in-frontmatter. Values are bare — wrapping destroys native YAML types. No journal, no replay, no rollback on rename: the registry commits first and one sweep follows, so the new key always wins with no comparison needed. Collection sidecars and SavedView configs stay ULID-keyed. Property names unique nexus-wide. No migration code by design — the live nexus is hand-converted. `$status` and `$ctx` removed; no live file carries either. Agenda definitions stay a separate namespace, their rename sweep defers. `kind: 'context'` is deliberately kept while `kind: 'status'` goes.
>
> **Explicitly accepted, not defects.** An orphaned key surviving a crash and later being inherited by a reused name — a three-step coincidence, guardable only by a full-nexus scan per create. A page too malformed to parse being skipped by the sweep. A value briefly unresolvable between the registry commit and its page being swept. Property values not rendering between Phase 3 and Phase 8.
>
> **What to attack:** whether the phase's code matches the spec's decisions; whether the replaced implementation is genuinely gone rather than orphaned beside its replacement; whether any consumer of the old shape survives, tests included; whether a behaviour changed without its pinning test inverting. Ground every finding in `file:line`. Do not spawn sub-agents.
