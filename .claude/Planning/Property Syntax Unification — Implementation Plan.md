# Property Syntax Unification — Implementation Plan

**Spec:** `.claude/Planning/Property Syntax Unification — Decision Log.md` — ratified after three adversarial rounds. Every reference below (`B-2`, `H-3`, `K-1a`…) points there. Read it before Phase 1; this plan does not restate its reasoning.

**Goal:** Page and agenda property values move out of the ULID-keyed `properties:` map and become wrapped, name-keyed entries at the frontmatter root, so one syntax governs every Pommora-owned key.

**Architecture:** One module owns the reserved syntax. One type-directed decoder replaces three. One governed-root-key writer serves both sigils. A rename commits the registry, then sweeps once. The removal half is scheduled work, not cleanup.

**Tech Stack:** Electron 42 · React 19 · TypeScript 6 · `eemeli/yaml` · Vitest.

---

## Deviations From The Plan-Writing Discipline, And Why

The skill's default shape assumes a greenfield feature built by an engineer with no context. This is a format migration inside a mature subsystem, executed by the agent that wrote the spec. Four deviations, each argued:

**1. TDD applies to new behaviour, not to deletion.** The skill mandates write-failing-test-first for every step. That is right for the syntax module, the decoder and the sweep — all genuinely new. It is theatre for "delete the `$status` branch," where the meaningful verification is that the compiler finds every consumer and that an existing test *inverts*. So: **new behaviour gets a failing test first; changed behaviour gets its existing test inverted in the same commit; removal gets a straggler grep.** Each phase names which mode it is in.

**2. The typecheck is a discovery tool for the typed half only — and the plan says where it is blind.** Removing a union member makes the compiler enumerate every `PropertyValue` consumer, which is more reliable than a hand-written inventory. But `splitFrontmatter` returns `Json`, so **every `.properties` access routed through it survives the typecheck untouched** — `crud/pageValue.ts:54`, `crud/schema.ts:55`, `crud/deleteProperty.ts:37`, `crud/removeProperty.ts:54`. Those four files are the IO seam, they are where this change does its damage, and no compiler will point at them. They get **named steps**, not a gate. Trusting the typecheck there is the single largest way this plan could fail.

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

## Execution Order — Authoritative

The phases below are written in dependency groups, but **run them in this order**, which differs from the document's section order in two places:

**1 + 5 → 2 → 3 → 4 → 8a (convert values) → 6 → 7 (+ 8b) → 9**

- **Phase 5 runs inside Phase 1.** Phase 1 creates the syntax module while `contexts.ts:26-43` keeps three live duplicate implementations — which the Global Constraint "a replaced implementation is deleted in the same phase" forbids. Worse, Phase 4 deletes `governedContextKeys` (the only thing that recognises `[…]`) while contexts still write `[Title]`, so **context writes would silently no-op for one phase.** Merging closes both.
- **The value conversion (8.1, 8.2, 8.4, 8.5) moves to sit immediately after Phase 4.** It depends on Phase 3 and Phase 4 and on nothing in 5, 6 or 7. Moving it shortens the window where values do not render from five phases to one — and, more importantly, **Phase 6 is otherwise unverifiable**: Step 6.6 exists because a rename blanks the column, but during Phases 3-7 every column is already blank, so the bug and the scheduled window are indistinguishable and screenshot verification is worthless for the phase that needs it most.
- **Step 8.3** (strip the empty `properties: {}` maps) stays **after** Phase 7, because `createPage` keeps writing the empty map until Step 7.1 lands.
- **Phase 7 splits.** 7a is mechanical removal, grep-gated: 7.1, 7.2, 7.3, 7.6. 7b is two behaviour-changing consolidations that each invert a pinning test: 7.4 and 7.5. They are different modes and the phase currently claims only one.

---

## The Consumer Inventory

Everything that touches the outgoing shape. The straggler gate in Phase 7 checks this list is empty; it exists here so nothing is discovered late.

**Reads the `properties` map:** `crud/loadValues.ts:16-33` · `pipeline/value.ts:123` · `PagePreview/PreviewInspector.tsx:111` (a raw presence read by id, schema one line away at `:42`) · `crud/removeProperty.ts:54` · `crud/deleteProperty.ts:41` · `crud/schema.ts:56`

**Writes it:** `shared/propertyValue.ts:152-161` · `crud/page.ts:35,112-118` · `crud/agendaEntity.ts:33,109-110` · `crud/pageValue.ts:47-59` · `crud/removeProperty.ts:171-176`

**Builds a key renderer-side (optimistic patches):** `Table/TableView.tsx:625-628,1206-1210,1224-1228` · `Cards/CardsView.tsx:112-115` · `PagePreview/PreviewInspector.tsx:116-119` — each needs the same rider treatment `contextValues` already gets.

**Produces or consumes `kind: 'status'`:** `pipeline/group.ts:142` · `pipeline/sort.ts:55` · `PropertyEditing/valueClick.ts:25,28` · `PropertyEditing/PropertyPicker.tsx:24,178` · `Table/Cell.tsx:82,102-103` · `Table/reassign.ts:15` · `crud/removeProperty.ts:102`. Four of these already read `select || status`; the typecheck will list all of them.

**Id-keyed with no registry access, needing id→name:** `crud/removeProperty.ts` `removeInner` · `crud/schema.ts:54-66` `stripPageMember`

**The IO seam — loose-typed, invisible to the compiler, each with a named step in Phase 4:** `crud/pageValue.ts` (`rewriteRaw` + `applyEdit`) · `crud/schema.ts:54-66` `stripPageMember` · `crud/schema.ts:68-81` `stripAgendaMember` · `crud/deleteProperty.ts:37,41` · `crud/removeProperty.ts:54`. All five read `.properties` off a `Json`, so removing the key from `pageFrontmatter` produces **zero** type errors here.

**Tests pinning the outgoing shape.** Run Step 0.1 and take the count from the run — do not trust a number quoted here. The broad `properties` token over-matches (it pulls in unrelated suites), so classification is triage, not a to-do list. These pin behaviour without naming any token and must be added by hand: `registryProperty.test.ts` (duplicate names legal), `properties/schema.test.ts:105` (uniqueness), `io/pageFile.test.ts:66,75,92`, `contextResolve.test.ts`, `contextWrite.test.ts`, `contextCascade.test.ts`, `deleteProperty.test.ts`, `assignment.test.ts:78-81`, `readNexus.test.ts`. **`assignment.test.ts:78-81` is the trap** — it asserts `readFrontmatterFields(...).properties` is `undefined`, so after the change it passes vacuously while asserting nothing.

---

## Phase 0: Inventory The Tests That Pin The Old Shape

Not busywork. Tests are the one consumer the compiler cannot find for us, and a test asserting the outgoing behaviour will look like a regression later instead of like intent.

- [ ] **Step 0.1 — List them**

```bash
cd Pommora && for t in 'properties' 'prop_0' '$status' '$ctx' 'parsePropertyValue' 'applyPropertyValue' \
  'coerceToDeclaredType' 'reconcileCachedValue' 'contextKey' 'parseContextKey' 'splitFrontmatter' \
  '[Areas]' '[Projects]' 'unique' "kind: 'status'"; do
  grep -rlF "$t" src/ --include="*.test.ts" --include="*.test.tsx"
done | sort -u
```

**`-F` per token, never one quoted alternation.** A `$`-leading token inside shell double quotes is a literal `$`, which the grep shim then reads as an end-of-line anchor — that branch matches nothing and the gate returns a false pass. Measured: `"\$status"` finds 0, `-F '$status'` finds 3. **Before trusting any clean exit, grep a token you know is present.**

- [ ] **Step 0.2 — Classify each** into *invert* (asserts behaviour that intentionally changes — e.g. `registryProperty.test.ts:40-43` asserting duplicate names are legal, `contexts.test.ts:32-33` pinning the bracket ban), *retarget* (asserts surviving behaviour through an outgoing shape), or *delete* (asserts only the outgoing shape).
- [ ] **Step 0.3 — Write the classification into this plan file** under each phase that owns it, then commit the plan edit. A phase that changes behaviour without touching its pinning test has not finished.

---

## Stage A — Build

### Phase 1: The Reserved-Syntax Module

Everything downstream reads from this, so it ships first and no consumer hard-codes a glyph. Mode: **new behaviour, TDD.** (`D-1`)

**Files:** Create `src/shared/governedKeys.ts` + `src/shared/governedKeys.test.ts` · **and, because Phase 5 runs inside this phase:** `src/shared/contexts.ts:26-60`, `contexts.test.ts`, `contextWrite.test.ts`, `contextCascade.test.ts`, `contextResolve.test.ts`, `io/pageFile.test.ts`. Stage all of them — explicit-path staging drops whatever is not listed.

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
    // Decomposed input, precomposed expectation. Both literals written the same way assert
    // nothing: an implementation with no .normalize() call passes.
    expect(normalizePropertyName('  Cafe\u0301  ')).toBe('Caf\u00e9')
  })

  it('refuses a leading $ and an empty name, allows an interior $', () => {
    expect(invalidPropertyName('$Status')).toBe(true)
    expect(invalidPropertyName('   ')).toBe(true)
    expect(invalidPropertyName('Budget ($)')).toBe(false)
  })

  // The reason both glyphs were chosen. This test is why the module exists and stays permanently.
  it('a hand-typed unquoted key parses clean and survives a write plain', () => {
    // Derived from wrapKey, not hardcoded — a literal list still passes if SIGIL changes to `[[`.
    for (const key of [wrapKey('context', 'Projects'), wrapKey('property', 'Status'), wrapKey('property', 'Budget ($)')]) {
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
export function isGovernedKey(key: string, layer?: GovernedLayer): boolean {
  const pairs = layer ? [SIGIL[layer]] : Object.values(SIGIL)
  return pairs.some(([open]) => key.startsWith(open))
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
- [ ] **Step 2.5 — Delete the two other decoders.** `resolveFieldValue` returns the decoder's result directly. `reconcileCachedValue` has exactly **one** call site (`removeProperty.ts:167`), inside `restoreCachedValues`, which **already holds the registry** (`:150`) — it becomes `decodeValue(def, raw, { strict: true })` with no plumbing. (`removeInner` does need the registry, for its snapshot read at `:54`, but that is Step 4.5b's job, not the decoder's.)
- [ ] **Step 2.6 — Retarget the three Status looks onto the declared type.** `Cell.tsx:82` gates Capsule and Checkbox on the value's kind; `:102-103` passes the kind to `chipShapeForType`. Both take `declaredType(...)`, already computed at `:63`. **Without this the pill silently becomes a label and two looks stop rendering, with no error.** (`J-1`)
- [ ] **Step 2.7 — Let the typecheck find the rest.** It will list every remaining `kind: 'status'` consumer from the inventory. Fix each to read the declared type; **do not re-add the union member** to quiet an error.
- [ ] **Step 2.8 — Gates, commit, phase review.**

```bash
git commit -m "refactor(properties): one decoder that reads the type instead of guessing at it"
```

---

### Phase 3: The Read Path

**From here until Phase 8, property values do not render in the live app.** That is the scheduled window — no dual-read code exists by design.

**Files:** `crud/loadValues.ts` · `Table/resolveContext.ts:18-26` · `pipeline/value.ts` · `PagePreview/PreviewInspector.tsx:111`

**Not touched:** `readNexus.ts`'s key retention. It has exactly one reader — the Context resolver — and property values load lazily through `loadValues`, which re-reads the file itself. Generalizing retention here would enlarge a per-page map for no consumer, and doing it before Phase 1's sigil lands would stop `[Areas]` keys resolving inside a phase that declares no test inversions.

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
- [ ] **Step 3.3 — Build the **id→definition** index once per container.** `buildResolveContext` gains `defsById: ReadonlyMap<string, PropertyDefinition>`. The direction matters and the obvious guess is wrong: `resolveFieldValue(row, propertyId, schema)` starts from an **id** and needs the def to learn the *name* it writes under — a `defsByName` map serves key→def, which no consumer needs. Build `defsByName` only if a later phase resolves a wrapped key back to a def; nothing currently does. (`G-2`)

  While the index exists, it retires roughly two dozen per-cell `schema.find(d => d.id === …)` scans — `Cell.tsx:65,85,156,173`, `TableView.tsx:589,680,769,820,856,878`, `CardValue.tsx:60`, `cellResolve.ts:17`, `columnLabel.ts:21`. Convert the sites that already hold a `ResolveContext`; leave the pane sites alone.

  **Trap:** `syntheticContextDef` (`PropertyPicker.tsx:33-37`) returns `{ name: '' }`, and `wrapKey('property','')` is `<>`, which `parseGovernedKey` rejects by design. The existing Context short-circuit at `value.ts:87-95` runs first — do not move the def lookup above it.
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
  await setGovernedRootKeys(p, { '<Status>': 'Done' }, ['<Status>'])
  const out = await readFile(p, 'utf8')
  expect(out).toContain('<Status>: Done')
  expect(out).toContain('# keep me')
  expect(out).toContain('foo: bar')
})

it('an emptied value deletes its key — never a placeholder', async () => {
  // Governed-but-omitted. Passing null here writes `<Status>: null` — verified.
  await setGovernedRootKeys(p, {}, ['<Status>'])
  expect(await readFile(p, 'utf8')).not.toContain('<Status>')
})

it('a Context unassign deletes its key', async () => {
  await writeFile(p, '---\nid: p1\n(Projects):\n  - Pommora\n---\n')
  await setGovernedRootKeys(p, {}, ['(Projects)'])
  expect(await readFile(p, 'utf8')).not.toContain('(Projects)')
})
```

- [ ] **Step 4.2 — Run it, confirm it fails.**
- [ ] **Step 4.3 — Write `setGovernedRootKeys(absFile, next: Record<string, unknown>, govern: readonly string[])`.**

  **The signature is the whole finding.** `mergeFrontmatter` is set-if-present-**else-delete** over `modeledKeys` (`pageFile.ts:60-63`), and `isGovernedKey` spans *both* layers. So "governed keys computed by shape" plus a single-key write deletes every other governed key on the page — writing a property value wipes the page's Context links, and comments attached to them go too. Verified by execution.

  **But a change-set alone cannot express a delete, and `null` is not the sentinel.** Verified by execution: `mergeFrontmatter` sets when `modeled[key] !== undefined`, so `null` writes `<Status>: null`; only `undefined` or absence deletes. And a Context *unassign* is signalled by the key being **omitted** from the reconciled root — with only a change-set, nothing records that it used to be there, so the key survives and the unassign silently no-ops.

  So the signature carries **both halves**: `govern` is the key set the write owns, `next` is the values. **A key in `govern` and absent from `next` is deleted.** A property write passes `govern=[key], next={key: v}`; a property clear passes `govern=[key], next={}`; a Context write passes `govern = every governed key across the original and reconciled roots, next = the reconciled root`. `modeledKeys` is `govern` plus `modified_at`, **and the writer supplies the stamp itself** — `mergeFrontmatter(existing, { ...next, modified_at: nowIso() }, [...govern, 'modified_at'], body)`.

  **This is the same two-contract trap one field over.** `modeledKeys` deletes anything it lists that the value map does not carry, so leaving the stamp to the caller means a property write **deletes `modified_at` from the page** (verified) and a Context write freezes it at the reconciled root's stale value. The Last-Edited column blanks and `_modified_at` sorts collapse. This writer replaces all four of the stamping sites Step 6.3a enumerates, so it inherits their job.

  That is `governedContextKeys` **generalized to both sigils, not deleted** — its raw ∪ next union *is* the delete mechanism, and Step 4.5 must not remove it as "subsumed".

  **The Phase 4.1 test above cannot catch this** — its fixture has no pre-existing governed keys. Add the test that does:

```ts
it('leaves the other layer alone', async () => {
  await writeFile(p, '---\nid: p1\n# keep\n<Status>: Active\n<Due>: 2026-08-01\n(Projects):\n  - Pommora\n---\n')
  await setGovernedRootKeys(p, { '<Status>': 'Live' }, ['<Status>'])
  const out = await readFile(p, 'utf8')
  expect(out).toContain('<Status>: Live')
  expect(out).toContain('<Due>: 2026-08-01')   // survives
  expect(out).toContain('(Projects)')          // survives
  expect(out).toContain('# keep')
  expect(out).toMatch(/modified_at:/)   // the writer stamps; none of the other assertions catch its loss
})
```

- [ ] **Step 4.4 — Resolve the name in main, inside the file lock.** `updatePageProperty` gains the registry and builds the key there. Preserve the locking asymmetry: `setPageContext` takes its own lock; `updatePageProperty` is wrapped by its caller at `mutate.ts:474`. A naive merge drops one.

- [ ] **Step 4.5 — Route Contexts through the same writer.** `applyTarget` (`contextWrite.ts:115-128`) has **three** call sites and does more than build a key — it resolves `defById` and runs `reconcileContextKeys`. Only its key-building half moves; deleting it wholesale breaks `setAgendaContext` and `setSpaceContext`. **Keep `governedContextKeys`'s union logic** — generalize it to both sigils and let it compute `govern`. Deleting it removes the only code that knows which keys must go.

- [ ] **Step 4.5a — Convert `pageValue.ts`. This file is the plan's biggest blind spot.** `rewriteRaw` (`:20-45`) is a **fourth decoder** — it switches on `PropertyType` and reads the raw shapes directly, including `{ $status }` at `:38-41`. `applyEdit` (`:47-68`) reads and writes the nested map. All six option ops reach it through `cascadePages`.

  Leave it unconverted and **every option rename, clear and remove silently no-ops on every migrated page** — no error, green suite. Verified by execution. Neither the typecheck (loose-typed via `splitFrontmatter`) nor the straggler grep can see it. Convert to wrapped keys through `setGovernedRootKeys`, resolve id→name in main, and delete the `type === 'status'` branch — status and select become the same path.

- [ ] **Step 4.5b — Convert the four remaining IO-seam readers**, same loose-typed blind spot, same consequence:
  - `crud/schema.ts:54-66` `stripPageMember` → **stays a pure `(content) => string | null` transform, presence check intact.** Only the key it looks up changes: nested-map-by-id becomes wrapped-root-key. Do not route it through the async writer — it returns `null` to mean *skip*, and `rewritePageSerialized` writes nothing on null. Replace that with an unconditional write and one property Delete **re-dates every page in the nexus**, because the delete walks every collection. It is also a sync callback held under a non-reentrant per-file lock, so an async writer inside it deadlocks.
  - `crud/deleteProperty.ts:37,41` — the `.trash` snapshot. Unconverted it writes an **empty** recovery set while leaving every value on disk.
  - `crud/removeProperty.ts:54` `removeInner` — the cache snapshot. Unconverted it caches nothing and strips nothing. Needs the registry added for id→name; `restoreCachedValues` already reads it at `:150`.
  - `crud/schema.ts:68-81` `stripAgendaMember` — agenda side. **JSON, and consumed by a staging transaction, not a file writer** — same key change, different plumbing.
  - `crud/removeProperty.ts:171` `restoreCachedValues`' write-back — uses `applyPropertyValue`, which Phase 4 deletes. Compiler-visible, so it fails loud, but what it becomes is specified here: `setGovernedRootKeys` with the wrapped key.

  **This is not tidiness.** Left undone, every deleted property leaves its full value set orphaned on disk — which converts H-5a's accepted-YAGNI ("an orphan needs a crash inside a sub-second sweep") into the ordinary path. That is a different risk than the one signed off, so it does not get to ride along unfixed.
- [ ] **Step 4.6 — Update the optimistic patch sites** (TableView ×3, CardsView, PreviewInspector) to build keys through `wrapKey`, the same rider treatment `contextValues` already has.
- [ ] **Step 4.7 — Gates, commit, phase review.** Restart the dev process — this phase is main-side.

---

### Phase 5: Contexts Move To `(…)`

Free today: zero wrapped context keys exist on disk in either nexus, and this is the last moment that is true. (`F-4`)

- [ ] **Step 5.1** — `contexts.ts:26-43`'s `contextKey`/`parseContextKey`/`isGovernedContextKey` become **layer-scoped** wrappers over Phase 1's module; delete the local implementations.

  **They must pass `layer: 'context'`, never re-export bare.** A blind `parseGovernedKey(k)?.name ?? null` makes `reconcileContextKeys` read `<Projects>` as the Context "Projects" — and since a Context and a property may legally share a name (`B-1`), one Context assign then **deletes that property's values off disk**. Verified. The same blind parse would also start retaining every property value at walk, which is exactly what Phase 3's "Not touched" paragraph refuses.

  So: `parseContextKey = (k) => { const r = parseGovernedKey(k); return r?.layer === 'context' ? r.name : null }` and `isGovernedContextKey = (k) => isGovernedKey(k, 'context')`. **Note the inversion:** `parseContextKey:42` rejects interior brackets today, which would reject the new form — Phase 1's positional strip replaces that logic rather than amending it.
- [ ] **Step 5.2** — `invalidContextTitle`'s bracket ban goes (`contexts.ts:52-53`); `contexts.test.ts:32-33` pins it and **inverts**. Intended behaviour change, not a regression. (`D-4`)
- [ ] **Step 5.3** — *(No separate gate, commit or review — this phase runs inside Phase 1 and shares its Step 1.5.)*

---

### Phase 6: The Rename

Registry first, then one sweep. (`H-2`, `H-3`)

**Files:** `crud/registryProperty.ts:41-59` · `main/index.ts:726-737` · `store.ts:1410-1424` · `Table/TableView.tsx:141-153` · `Cards/CardsView.tsx:87-96` · `registryProperty.test.ts:40-43` (**inverts**) · `Components/Detail/PropertiesPane.tsx:257-258,413` (the second rename entry point) · `PagePreview/PreviewInspector.tsx:47` · `crud/optionOps.ts:176-185` (hoist `cascadePages`) · `properties/schema.ts:46,50` (refusal messages). **Stage every one** — explicit-path staging drops what is not listed, and this phase's commit would otherwise ship half the change.

**Interfaces:**
- Consumes: `wrapKey`, `parseGovernedKey`, `normalizePropertyName`, `invalidPropertyName` (Phase 1) · `cascadePages` (hoisted in Step 6.3)
- **Not** the governed writer — it stamps `modified_at`, and Step 6.3a rules that a key-only rename must not. The sweep is a pure `(content) => string | null` transform.
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
  // Seeds its own file — inheriting the previous test's leaves no old key, so both sweeps
  // no-op and the test proves nothing.
  await writeFile(p, '---\nid: p1\n<Status>: Old\n---\n')
  await renameSweep(root, 'Status', 'Stage')
  const once = await readFile(p, 'utf8')
  await renameSweep(root, 'Status', 'Stage')
  expect(await readFile(p, 'utf8')).toBe(once)
})

it('leaves an unmatched wrapped key inert — never dropped', async () => {
  // H-5 is what makes the no-journal design safe and the sweep re-runnable. Nothing tested it.
  await writeFile(p, '---\nid: p1\n<Status>: Old\n<Retired>: keep\nforeign: keep\n---\n')
  await renameSweep(root, 'Status', 'Stage')
  const out = await readFile(p, 'utf8')
  expect(out).toContain('<Retired>: keep')
  expect(out).toContain('foreign: keep')
})
```

- [ ] **Step 6.2 — Run, confirm failing.**
- [ ] **Step 6.3 — Implement the sweep.** Reuse `cascadePages` (`optionOps.ts:176-185`) — already `allCollectionFolders` → `listMarkdownFiles` → `rewritePageSerialized`, exactly this scope. **It is module-private; hoist it to an export.** Rewrite rule: **new key present ⇒ delete old; else rename old → new.** The new key always wins with no comparison needed. (`H-3`)

- [ ] **Step 6.3a — The sweep does NOT stamp `modified_at`.** Every other page rewrite in the codebase stamps it (`pageValue.ts:64`, `schema.ts:62`, `contextWrite.ts:163`, `removeProperty.ts:174`), so the house pattern points the wrong way here and an implementer will follow it. A key-only rename is not a content edit — the spec already rules that a schema edit never moves a page's stamp. Stamping would re-date **every page in the nexus** on a rename, scrambling `_modified_at` sorts and the Last-Edited column. It also makes Step 6.1's idempotence test fail on the timestamp. Return null when nothing changed; that is what makes that test meaningful.
- [ ] **Step 6.4 — Order the rename.** Wrap the handler in `serializeSchemaOp`. It currently runs on the registry file's own chain while remove, delete, assign and the option cascades run on the shared one — harmless while a rename touched no files, unsafe the moment it sweeps. One line closes rename-against-remove, delete, option-cascade and rename. (`H-3c`)
- [ ] **Step 6.5 — Uniqueness, normalization, and the `$` ban.** Drop `{ unique: false }` at `registryProperty.ts:28,51`; normalize through Phase 1 before persisting; **call `invalidPropertyName` and source every message from `KEY_REFUSAL`.** Without this the `$` reservation ships dead and the module owns nothing — the exact failure D-1 exists to prevent. `properties/schema.ts:50`'s duplicate message is byte-identical to `KEY_REFUSAL.duplicate`. **`:46` is not** — it reads "A property name cannot be empty." against the module's "A name cannot be empty." Swapping it changes user-visible copy, so either widen the module's string or keep a property-scoped one; do not silently re-word. Rename onto a taken name fails; create disambiguates. (`C-5`, `C-7`, `D-2`, `D-6`)
- [ ] **Step 6.6 — Refetch values when a rename lands, from BOTH entry points, via a named mechanism.**

  The values snapshot loads once per container open keyed on `source.path`, and the file's own comment says it never re-reads mid-session. A rename does not change that path, so **the whole column reads blank until the user navigates away and back** — 100% reproducible, not a race. (`H-3d`)

  **Two renderer paths reach `schema:rename`**, and the obvious one is only half of it: `store.ts:1410-1424` (the inline row rename) *and* `PropertiesPane.tsx:257-258`, called from the editor header at `:413`. Both end in `load()`, which refreshes tree and schema only.

  **The mechanism, because both obvious ones are wrong:** add a `valuesEpoch: { n: number; oldKey: string; newKey: string } | null` slice to the store, set on a successful rename — **a bare counter cannot carry the re-key below**, since the old→new pair is in the store and the effect would receive only a number, and consume it in a **separate** effect that only calls `loadValues` + `setValues`. Do not add it to the existing `[source.path]` effect — that also runs `setValueOverride(null)`, which `TableView.tsx:239-244` documents as the cause of the fixed "~1/10 assign-vanish". Do not key on `[source.path, schema]` — that refetches on every tree write, which is the "never reload the entire Y" rule.

  **The epoch effect must re-key `valueOverride`, not ignore it.** The table merges `{ ...values, ...valueOverride }` as a *per-page replacement*, and an override built before the rename still carries the old key — so a fresh `values` is masked for exactly the rows the user just edited, which are the rows they are watching. Clearing it reintroduces the fixed assign-vanish; re-keying does not, and the old→new pair is in hand at the rename.

  `PreviewInspector` holds its own `fm` state (`:47`) with the same staleness — add it to this phase's files.
- [ ] **Step 6.7 — Gates, commit, phase review.** Restart the dev process.

---

## Stage B — Remove

### Phase 7: The Removal Half

Nothing here is optional or deferred. This phase is what makes the change a reduction. Mode: **straggler grep, not TDD.** (`I-1`…`I-7`)

- [ ] **Step 7.1** — `properties` out of `PAGE_MODELED_KEYS` and `pageFrontmatter` (`schemas.ts:90,103`), out of `createPage` (`page.ts:35`) and `createAgendaEntity` (`agendaEntity.ts:33`).
- [ ] **Step 7.2** — `folded_headings` out of the schema and the modeled set. No reader, no writer, zero on disk. (`B-10`)
- [ ] **Step 7.3** — `removeProperty.ts:60-61` stops writing an empty cache block — same no-empties rule already enforced three feet away. (`J-3`)
- [ ] **Step 7.4** — Three sidecar read-mutate-write implementations (`assignment.ts:14-29`, `removeProperty.ts:38-70`, `deleteProperty.ts:74-91`) route through one. The cache-delete-when-empty rule lives in two spellings at **`deleteProperty.ts:88-89` and `removeProperty.ts:190`** (`restoreCachedValues`) — `removeInner` has no such rule, it sets the block unconditionally at `:61`. Note `assignment.ts` writes through validated `writeSidecar` while the other two use raw `writeJson`; merging changes what lands on disk.
- [ ] **Step 7.5** — **`invalidContextTitle` and `invalidName` share one basename core. Property names do NOT join them.**

  The three guard different things and merging all three breaks a ratified decision: `invalidName` (`crud/util.ts:11-29`) is the file-*basename* rule and bans a leading `_`, so routing property names through it would refuse `_title` — which **D-3 explicitly permits**, because the wrap is the namespace boundary. It would also newly refuse `Notes/Ideas` and `README.md` as property names, and `_Archive` as a Context title, with no pinning test inverted.

  So: the two *filesystem* validators share a core (they name folders and files; the drift between them on `|` and leading `_` is real and worth closing — invert `contexts.test.ts` for the new `|` ban). **Property names keep their own validator**, and it reads its bans from the Phase 1 module, which already owns them. (`D-5`, `D-3`)
- [ ] **Step 7.6 — The straggler gate.** This is the phase's real deliverable:

```bash
cd Pommora && for t in '.properties' 'properties:' 'folded_headings' '$status' '$ctx' \
  'parsePropertyValue' 'coerceToDeclaredType' 'reconcileCachedValue' 'applyPropertyValue' \
  'STRING_KIND_FOR_TYPE'; do
  printf '%s: ' "$t"; grep -rnF "$t" src/ --include='*.ts' --include='*.tsx' | wc -l
done
```

**Expected: 0 for the removed tokens only.** `.properties` and `properties:` have a **permanent floor of ~30 non-test sites** — the Collection **assignment list**, which the spec deliberately keeps ULID-keyed. Chasing those two to zero would delete the assignment list. Use the discriminating forms instead, and treat the bare tokens as informational:

```bash
grep -rnE 'splitFrontmatter\(.*\)\.properties|readFrontmatterFields\(.*\)\.properties' src/ --include='*.ts'
grep -rnF 'fields.properties' src/ --include='*.ts'
```

The first is **the one regex exception to the `-F` rule** — it needs `-E` for the wildcard. Written with a literal `…` and run under `-F` it returns 0 by construction, which is a false clean in the step that carries the phase's whole deliverable.

**`stripPageMember` and `stripAgendaMember` are NOT in this gate** — Step 4.5b keeps both as pure transforms. Only the key they look up changes. `-F` per token, never one quoted alternation — a `$`-leading token in double quotes is read as an end-of-line anchor and that branch silently matches nothing. **Sanity-check the gate itself first**: grep a token you know is present and confirm a non-zero count, or a clean run proves nothing. Run it over tests too; a test still pinning the outgoing shape is the same failure.

- [ ] **Step 7.7 — Gates, commit, phase review.**

---

### Phase 8: Migrate The Live Nexus By Hand

No helper code. (`F-1`) This closes the broken window opened in Phase 3.

- [ ] **Step 8.1** — `tar` the affected files to `~/Pommora-premigration-backups/`, verify the archive lists them, before touching anything.
- [ ] **Step 8.2** — Convert the pages carrying real values: each `properties.prop_X: v` becomes `<Name>: v` at the root, the name resolved from `.nexus/properties.json`. Use the repo's own `yaml` through a throwaway script mirroring `pageFile.ts` — `doc.set`/`doc.delete` only, never regex, so comments and foreign keys survive.

  **The wrapped key wins where both exist.** Between the write path switching and this conversion, the app writes `<Name>: newvalue` onto pages still carrying `properties.prop_X: oldvalue`. An unconditional conversion overwrites the newer value with the stale one — and the spec's own reasoning says a user seeing an empty column retypes it, so this is the expected case rather than the rare one. Same rule as the rename sweep: **if the wrapped key is already present, drop the legacy entry and keep what is already there.**
- [ ] **Step 8.3** — Strip the empty `properties: {}` maps. **Count them at the time — 35 on disk now, and the number moves with every page created before this lands.**
- [ ] **Step 8.4** — Convert any `property_cache` block holding cached values. **Dropping the empty ones moves to 8.3's slot after Phase 7** — `removeInner` keeps writing them until Step 7.3.
- [ ] **Step 8.5 — Verify, split the way 8.2/8.3 are.** At **8a**: every converted value renders in the running app (screenshot), bodies byte-identical, Obsidian's own bare keys untouched. **After Phase 7, with 8.3**: zero `properties:` in any frontmatter — asserting that at 8a is guaranteed false, because the empty maps are deliberately still there and `createPage` keeps writing them until Step 7.1.
- [ ] **Step 8.6** — Nothing to commit — the nexus is not the repo. Report counts.

---

## Stage C — Document

### Phase 9: Documentation Reconciliation

Roughly sixty statements across fifteen docs describe the outgoing format, a registry-only rename, or non-unique names. (`I-5`)

- [ ] **Step 9.1** — **Grep first.** A token sweep over `.claude/` for `[Projects]`, `[Areas]`, `$status`, `prop_`, `properties`, `bracketed`, `registry-only` finds most of the drift deterministically in milliseconds. Reserve one read-only agent for the semantic drift a token match cannot see — the PRD's identity claim, prose asserting a rename is cheap. Opening this phase with an agent fan-out for work grep does exactly is the wrong default.
- [ ] **Step 9.2** — Fix each: **reword the fact, keep the surrounding prose flowing.** No amendments, no "this changed" notes, no supersede markers. A fresh reader must not be able to tell the old version existed.
- [ ] **Step 9.3 — The larger rewrites.** `Features/Properties.md` — type catalog, identity-vs-name, schema mutations, validation, index. `Features/Architecture.md` — the assignment-line section inverts from what the line *costs* to what it *buys*. `PommoraPRD.md` — identity-and-linking, storage philosophy, properties.
- [ ] **Step 9.4 — Reframe `History.md`.** Dated entries record what shipped, never what remains true; this change takes its own newest-first entry. (`I-6`)
- [ ] **Step 9.5 — Fix the drift this surfaced that predates the change:** the PRD's identity claim describes a resolver and index that no longer exist and gets the true fact rather than a gap (`I-7`); the option-rename cascade is described as `$status`-only when it covers Select and Multi-select too; one fact carries three different numbers across two files.
- [ ] **Step 9.6** — Commit the docs.

---

## Closeout

- [ ] Final code-review + simplification pass over the whole change, both briefed with session context.
- [ ] `/handoff` — updates `Context.md`.
- [ ] The in-chat deliverable (requirements verbatim below).

---

## Nathan's Instructions — Verbatim

Recorded exactly as given, so a post-compact agent works from his words rather than a paraphrase.

**On execution:**

> Once I manually compact, you begin the step-by-step implementation, with a simplification agent after each phase. And a code-review + simplification agent once the plan is finished.
>
> The agents must verify that FIRST the old code is truly gone, no stragglers remain, and that dead code is truly gone. No migration assistants for now dead code, all migration of MY NEXUS must be done manually to remove need for coding any aid.
>
> The codebase should read as if the existing mechanism BEFORE this plan starts was always intended to be the post-implementation state, no stragglers.

**On documentation:**

> Then, you are to send explore agents into the existing documentation, have them report conflicting findings, then fix those findings how NATHAN would want them fixed. Don't ammend, keep flowing prose where they are, just reword or reqwite facts. Properties.MD gets a larger reqrite, so does architecture and PRD.

**On the deliverable:**

> Once all three major phases are done -- give Nathan a final deliverable in an in-chat response AFTER doing /handoff which updates context.md.
>
> This deliverable should include a overview-level summary of what got done, a phase-by-phase breakdown, and everything non-technical natahn needs to know about the changes made to the codebase, architecture, and the total line-count differences here.
>
> This involves letting me know anything this plan unlockes, changes for how things go forward, and the overall impact of this re-factor on the codebase and future of Pommora as a whole.
>
> DONT leave anything haning -- if it involves this work, you finish it through and cleanly.
> MUST give nathan's phone periodic updtes.

**Phone cadence:** phase boundaries and genuine blockers. Not routine progress — a notification he didn't need is annoying in a way that accumulates.

---

## Working While Nathan Is Unreachable

He is asleep for the execution run. The project rule to ask before designing is **void when he is unreachable** — the standing instruction is to proceed on the best record of his wishes and the existing design logic, and to **disclose every such decision and assumption as it is made**. Log each one; they go in the final deliverable.

**Decision procedure, in order. Stop at the first that answers.**

1. **Does the spec answer it?** The decision log is the contract. Use it.
2. **Is there an existing pattern in the codebase?** Follow it rather than inventing a parallel one. The repeated failure here is hand-rolling something the design system, the token ramps, or an existing seam already provides.
3. **Does a documented rule cover it?** `CLAUDE.md`, `Guidelines/`, the feature docs.
4. **Still ambiguous?** Take the simpler option. Simple beats robust when both achieve the same result, and a guard for an event needing a coincidence chain is dust in a month.
5. **A genuinely novel visual or interaction choice with no precedent?** Do not invent it. Ship the functional part, leave the surface unstyled rather than wrongly styled, and flag it for his call. Deferring is more his answer than guessing.

**Standing preferences that will come up:**

- New source files are PascalCase. Do not mass-rename existing kebab-case design-system files.
- UI action labels are Title Case; captions and prose stay sentence case.
- No keyboard shortcut is ever baked in without his explicit per-shortcut approval.
- Tokens come from `design-system`; never hand-roll a parallel value.
- Comments explain a genuine *why* only, one or two lines. `KNOB` and `(Nathan's call)` markers are functional — never strip them.
- Reported line counts exclude comments and blanks.
- Documentation is reworded to be true, never amended. A fresh reader must not be able to tell the old version existed.
- Docs changes are bundled into the commit that makes them stale, never left dangling.

**Hard stop conditions — do not proceed, leave it and report:**

- Anything that would delete or overwrite data in `~/NexusOS` beyond what Phase 8 specifies.
- A gate that cannot be made green without abandoning a spec decision.
- A finding that invalidates a ratified decision rather than an implementation detail.

---

## Review Briefing

Every phase-review agent gets this verbatim above its scope. Without it, reviewers re-raise settled decisions and the findings are mostly noise.

> **Already decided — do not re-raise.** Single delimiters `(Context)` / `<Property>`, not doubled, not square brackets; `[[…]]` reserved for Connections-in-frontmatter. Values are bare — wrapping destroys native YAML types. No journal, no replay, no rollback on rename: the registry commits first and one sweep follows, so the new key always wins with no comparison needed. Collection sidecars and SavedView configs stay ULID-keyed. Property names unique nexus-wide. No migration code by design — the live nexus is hand-converted. `$status` and `$ctx` removed; no live file carries either. Agenda definitions stay a separate namespace, their rename sweep defers. `kind: 'context'` is deliberately kept while `kind: 'status'` goes.
>
> **Explicitly accepted, not defects.** An orphaned key surviving a crash and later being inherited by a reused name — a three-step coincidence, guardable only by a full-nexus scan per create. A page too malformed to parse being skipped by the sweep. A value briefly unresolvable between the registry commit and its page being swept. Property values not rendering between Phase 3 and Phase 8.
>
> **What to attack:** whether the phase's code matches the spec's decisions; whether the replaced implementation is genuinely gone rather than orphaned beside its replacement; whether any consumer of the old shape survives, tests included; whether a behaviour changed without its pinning test inverting. Ground every finding in `file:line`. Do not spawn sub-agents.
