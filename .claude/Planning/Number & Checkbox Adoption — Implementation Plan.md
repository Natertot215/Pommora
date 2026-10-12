## Number & Checkbox Adoption — Implementation Plan

**DATE:** 10-12-2026
**STATUS:** Draft
**SOURCE:** This session's conversation of 10-12-2026 with Nathan; its rulings are listed under *§Constraints › Settled Decisions*.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `0d0b7f3f4` | {count} | {MM-DD-YYYY h:mm AM/PM} | {MM-DD-YYYY h:mm AM/PM} |

### Context

A frontmatter key the registry doesn't name is foreign: kept as written, and live the moment a definition names it. Key matching is already type-agnostic — a key matches a name in any casing, a write lands on the spelling the file holds (an empty `Price:` included), and a rename onto held keys adopts them for every type. What differs per type is two arms in `Core/Properties/propertyValue.ts`: `decodeValue` decides which held shapes read as a value, and `writtenSpelling` decides what spelling a write keeps. Text reads any shape and keeps it; a Multi-Select keeps unregistered members (which the settle registers as options) and each member's casing. Number reads only a YAML number, so a held `"30"` or `$1,200` reads as nothing; Checkbox reads only `true`/`yes` as checked, and a tick over `no` writes `true`.

The content index stores every key's raw value untyped, and the watcher, walk, and settle chain (`oweNamedKeys`, `registerHeldOptions`) exists only to register Multi-Select options, which Number and Checkbox don't have — so none of it changes. Three adjacent findings join the work. `NumberValuePicker` is a second copy of the popover `PropertyValueInput` already renders for every other type, minus its unchanged-text guard, so dismissing it over a value it shows blank deletes that value. And two readers still match the literal `'true'` where a hand-written checkbox rule may name `yes`: the creation seed (through `reassign.ts`) and the filter pane's operator label.

### Overview

Number and Checkbox gain the same two arms Text and Multi-Select have. A Checkbox reads one vocabulary of word pairs in any casing — `true`/`false`, `yes`/`no`, `on`/`off`, `y`/`n` — and a tick over an unchecked word writes its partner in the same casing (`No` → `Yes`, `OFF` → `ON`), while an untick still removes the key. A Number reads a quoted number, or one written with comma thousands, a trailing `%`, or a currency symbol before or after it — the inverse of what a cell itself shows — through one reader in `formatValue.ts` beside `readDate`, which the inline field, the popover, and Number filter operands share. A write keeps the file's quoting, symbol, percent sign, spacing, and grouping, and an unchanged value leaves the file byte-identical. Display stays governed by the property's own format.

Every reader of a checkbox word — the filter, the creation seed, the filter pane's label — reads the shared vocabulary, so `1`/`0` stop meaning anything. `NumberValuePicker` goes, and the Number popover becomes the shared one with its format glyph. PropertiesPM states the reading rule once, naming Multi-Select, Text, Number, and Checkbox together. A live drive on `~/Test` reads the bytes each gesture leaves.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `readNumber` • Function | The one reading of a stored or typed number: a YAML number as itself, or a string spelling one. Read by `decodeValue`, `parseEditorValue`, and the Number filter. | `Core/Properties/formatValue.ts` |
| `spelledNumber` • Function | A number written in the spelling a held string uses; `writtenSpelling`'s number arm. | `Core/Properties/formatValue.ts` |
| `currencySymbol` • Function | The symbol Intl gives a currency, by default as a cell shows it or narrow as the picker leads with it; `numberFormatGlyph` and the reader's symbol list both read it. | `Core/Properties/formatValue.ts` |
| `checkboxWord` • Function | What a checkbox value says in any casing: true, false, or null. Read by `decodeValue`, the filter, the group-key decode, and the filter pane. | `Core/Properties/propertyValue.ts` |
| `CHECKBOX_WORDS` • Constant | The four word pairs, checked word first. | `Core/Properties/propertyValue.ts` |
| `checkedSpelling` • Function | A checked value as a held value spells one; `writtenSpelling`'s checkbox arm. | `Core/Properties/propertyValue.ts` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `isCheckedRaw` • Function | Replaced by `checkboxWord`. | `Core/Properties/propertyValue.ts` |
| `parseBool` • Function | The filter's own true/false reading, `1`/`0` included; replaced by `checkboxWord`. | `Core/Views/Pipeline/filter.ts` |
| `NumberValuePicker.tsx` • Component | A second copy of the shared popover in `PropertyValueInput`, lacking its unchanged-text guard and invalid dimming. | `Core/Properties/Pickers/NumberValuePicker.tsx` |

#### Constraints

- **Gates:** `npm run typecheck` · `npm run test` · `npm run lint`, from the repo root, chained with `&&`, each exiting 0; lint prints no `Found N warnings` line. Biome formats every TS write, so an Edit failing on whitespace means it reformatted — re-read and retry.
- **Commits:** `git add <new files>` and `git rm <removed files>` first, then `git commit --only -m "…" -- <paths>`; messages past-tense and short, ending with the Co-Authored-By line. The pre-commit hook adds `Dashboard/Ledger/loc-history.json`.
- **Frozen:** The value union (`checkbox: z.literal(true)`, `number: z.number()`); `encodeValue`; UIX `numberFrom` and its UIX callers; `applyValueAtRoot` (the renderer's optimistic copy lands the bare encoded value, and both copies decode alike); the watcher, settle, index, and `registerHeldOptions`; "No value, no key" — an untick and an emptied number remove the key.
- **Reuse:** Nothing is built that the codebase already provides, and nothing diverges from how it already does a thing. Plan review found four places a first draft hand-rolled an existing mechanism, and the plan now reuses each: the number reader lives in `formatValue.ts` beside `readDate` (the one reading of a stored date) and formats digits through its memoized en-US `numFmt`; the currency symbol comes from one `currencySymbol` that `numberFormatGlyph` shares; the casing transfer uses UIX `capitalize`; and the Number popover is `PropertyValueInput`'s shared one, whose unchanged-text guard already exists, rather than a second guard in a second component. Execution keeps looking outward the same way: before writing any helper, search for the existing one, and record any new instance under *§Deviations*. A future audit finding a duplicate here is a defect of this plan.
- **Conventions:** No comments beyond the doc comments the plan writes and the one decision comment in `spelledNumber`. No user-facing copy. Every test added fails without its change, and a grammar case is pinned once, in the reader's tests; each consumer's test pins only its wiring.
- **Shape (fix):** Every consumer of the old behavior is named in a task: `isCheckedRaw`'s two callers; `parseBool`'s one; the two literal-`'true'` readers (`reassign.ts`, `FilterFrame.tsx`'s operator label); `numberFrom`'s two Core value callers (`parseEditorValue`, `filter.ts`); and `NumberValuePicker`'s one caller. `NumberEditor.tsx`'s `numberFrom` calls read format configuration and stay; `filterModel.ts`'s `impliedValue`, `propertyMenuActions.ts`'s `CHECKBOX_OPTIONS`, and `group.ts`'s `'true'` key are the app's own canonical writes and stay.
- **Shape (one commit):** The Number decode and its spelling arm land in one commit. A decode alone would let the live reconcile (`reconcileGovernedRoot`, `runRepairSweep`) rewrite every quoted or formatted number in a Nexus to a bare one.

**Settled Decisions** — Nathan, 10-12-2026:

- The checkbox pairs are `true`/`false`, `yes`/`no`, `on`/`off`, `y`/`n`, in any casing; the first of each is checked.
- A tick over an unchecked word writes its partner in the same casing; an untick removes the key. YAML-native `True`/`FALSE` parse to booleans before any spelling is seen, so a tick over `False` writes `true` — accepted.
- A number write follows the held shape: bare stays bare, quoted stays quoted, formatted keeps its symbol, `%`, and grouping with the digits the typed value's. Fresh writes stay bare; always-quoting was weighed and declined for cross-application continuity.
- The grammar: commas only as thousands in groups of three (`1,5` reads as nothing), a trailing `%`, and the currency symbols of `CURRENCY_CODES` (`$ € £ A$ CA$ ¥`) before or after — symbols only, no ISO codes. The property's own format alone decides display.
- The field and filter operands read typed text by the same grammar. `1`/`0` stop counting as checkbox operands.
- The write-back decision is noted on its line as a one-line comment.
- Documentation stays overview-level: nothing the code shows plainly, no exhaustive detail.
- Plan reviews before ratification run as Opus at extra-high effort; every code review during and after execution runs as Opus at high effort.

#### Process Overview

- [ ] **Phase 1** — Checkbox Word Pairs
  - [ ] Task 1-1
  - [ ] Task 1-2
- [ ] **Phase 2** — Number Reading And Spelling
  - [ ] Task 2-1
  - [ ] Task 2-2
  - [ ] Review Checkpoint
- [ ] **Phase 3** — Documentation
  - [ ] Task 3-1
- [ ] **Phase 4** — Live Drive
  - [ ] Task 4-1

---

### Phase 1 — Checkbox Word Pairs

**GOAL:** One vocabulary decides what a checkbox value says everywhere a value or an operand is read, and a tick writes the checked word of the pair the file already uses. A separate phase because it shares no code path with the number reader beyond `writtenSpelling`'s first line.

#### Task 1-1

**TASK:** Replace `isCheckedRaw` with `CHECKBOX_WORDS` and `checkboxWord`, and give `writtenSpelling` the `checkedSpelling` arm.

**NOW:** `isCheckedRaw` (`propertyValue.ts:59-61`) reads `true` or the string `true`/`yes` in any casing; `decodeValue` and `writtenSpelling` call it, the latter keeping a checked word and otherwise writing `true`. `governedWrite.test.ts:196` pins `Done: No` → `true`.

**CHANGE**

- [ ] Write the tests below and watch the decode, partner, and governed-write cases fail.
- [ ] Delete the test `a checkbox is true or absent — false written from outside reads as no value`; the rewritten casing test covers a YAML `false`.
- [ ] The source changes.

**AFTER**

```Core/Properties/propertyValue.ts diff
@@ imports @@

 import { linkEntry, wholeValueLink } from '../Connections/linkValue'
+import { capitalize } from '@pommora/uix/Utilities/capitalize'

@@ below registeredOption @@

-/** Checked as a file spells it: `true`, or the word `true` or `yes` in any casing. */
-const isCheckedRaw = (raw: unknown): boolean =>
-  raw === true || (typeof raw === 'string' && ['true', 'yes'].includes(normalizeTitle(raw)))
+const CHECKBOX_WORDS = [
+  ['true', 'false'],
+  ['yes', 'no'],
+  ['on', 'off'],
+  ['y', 'n'],
+] as const
+const PARTNER = new Map(
+  CHECKBOX_WORDS.flatMap(([on, off]): [string, string][] => [
+    [on, off],
+    [off, on],
+  ]),
+)
+const CHECKED = new Set<string>(CHECKBOX_WORDS.map(([on]) => on))
+
+/** What a checkbox value says as a file spells it, in any casing: true for a pair's checked word, false for its partner, null for anything else. */
+export function checkboxWord(raw: unknown): boolean | null {
+  if (typeof raw === 'boolean') return raw
+  const word = typeof raw === 'string' ? normalizeTitle(raw) : ''
+  return PARTNER.has(word) ? CHECKED.has(word) : null
+}

@@ decodeValue @@

     case 'checkbox':
-      return isCheckedRaw(raw) ? { kind, value: true } : NULL_VALUE
+      return checkboxWord(raw) ? { kind, value: true } : NULL_VALUE

@@ above writtenSpelling @@

+/** A checked value as `raw` spells one: its checked word as written, or its unchecked word's partner in the same casing (`no` → `yes`, `OFF` → `ON`), else `true`. */
+function checkedSpelling(raw: unknown): unknown {
+  if (checkboxWord(raw) === true) return raw
+  const word = typeof raw === 'string' ? raw.trim() : ''
+  const partner = PARTNER.get(normalizeTitle(word))
+  if (partner === undefined) return true
+  if (word === word.toUpperCase()) return partner.toUpperCase()
+  return word[0] === word[0].toUpperCase() ? capitalize(partner) : partner
+}
+
-/** `next` spelled as `raw` already spells it: a checked `true` keeps `raw`'s checked word, a string keeps … */
+/** `next` spelled as `raw` already spells it: a checked `true` takes `raw`'s checkbox word as `checkedSpelling` does, a string keeps … */
 export function writtenSpelling(next: unknown, raw: unknown): unknown {
-  if (next === true) return isCheckedRaw(raw) ? raw : next
+  if (next === true) return checkedSpelling(raw)
```

The doc comment's `…` stands for its unchanged remainder.

```Core/Properties/propertyValue.test.ts diff
@@ decodeValue — delete @@

-  it('a checkbox is true or absent — false written from outside reads as no value', () => {
-    expect(decodeValue(def({ type: 'checkbox' }), false)).toEqual({ kind: 'null' })
-  })

@@ writtenSpelling — replaces the two checked-value tests @@

-  it('a checked value keeps the checked word the file holds', () => {
-    expect(writtenSpelling(true, 'Yes')).toBe('Yes')
-  })
-
-  it('a checked value the file never held stays true', () => {
-    expect(writtenSpelling(true, undefined)).toBe(true)
-  })
+  it('a checked value keeps the checked word the file holds, and takes its unchecked word’s partner in the same casing', () => {
+    expect(writtenSpelling(true, 'Yes')).toBe('Yes')
+    expect(writtenSpelling(true, 'no')).toBe('yes')
+    expect(writtenSpelling(true, 'No')).toBe('Yes')
+    expect(writtenSpelling(true, 'OFF')).toBe('ON')
+    expect(writtenSpelling(true, 'N')).toBe('Y')
+    expect(writtenSpelling(true, 'false')).toBe('true')
+  })
+
+  it('a checked value over no checkbox word, or a YAML false, is true', () => {
+    expect(writtenSpelling(true, undefined)).toBe(true)
+    expect(writtenSpelling(true, false)).toBe(true)
+    expect(writtenSpelling(true, 'maybe')).toBe(true)
+  })

@@ options and checkboxes decode without regard to case @@

-  it('a checkbox reads true, or the word true or yes in any casing, as checked', () => {
-    for (const raw of ['Yes', 'yes', 'TRUE', 'true', true])
+  it('a checkbox reads a pair’s checked word in any casing as checked, and its partner or any other value as no value', () => {
+    for (const raw of ['Yes', 'yes', 'TRUE', 'true', true, 'on', 'ON', 'y', 'Y'])
       expect(decodeValue(checkbox, raw)).toEqual({ kind: 'checkbox', value: true })
-    for (const raw of ['No', '1', false, 1])
+    for (const raw of ['No', 'off', 'n', 'false', '1', false, 1])
       expect(decodeValue(checkbox, raw)).toEqual({ kind: 'null' })
   })
```

```Core/Properties/governedWrite.test.ts diff
@@ setGovernedRootKey — spellings @@

-  it('a checked box the file spells otherwise lands as true', async () => {
+  it('a checked box over an unchecked word lands as its pair’s checked word, cased alike', async () => {
     await seeded('Done: No')
     await setGovernedRootKey(page, 'Done', true, world)
-    expect(splitFrontmatter(await readFile(page, 'utf8')).Done).toBe(true)
+    expect(splitFrontmatter(await readFile(page, 'utf8')).Done).toBe('Yes')
   })
```

**VERIFY**

- [ ] With the tests alone, `npx vitest run Core/Properties/propertyValue.test.ts Core/Properties/governedWrite.test.ts` fails on the `'on'` decode, the `'no'` partner, and `'Yes'`; green after the change.
- [ ] `grep -rn "isCheckedRaw" Core` → none.

#### Task 1-2

**TASK:** Every other reader of a checkbox word reads `checkboxWord`: the filter's operand, the group-key decode the creation seed reaches, and the filter pane's operator label. The click-intent header states the untick rule.

**NOW:** `parseBool` (`filter.ts:127-140`) reads `true`/`1`/`yes` and `false`/`0`/`no`, its one caller `evaluateCheckbox`. `reassign.ts:8` checks only `key === 'true'`, so `filterSeeds` seeds nothing from an Is rule naming `yes`. `FilterFrame.tsx:538-542` finds a rule's operator by `o.impliedValue === ruleOperands(row.rule)[0]` (only the checkbox operators carry an `impliedValue`, `filterModel.ts:140-141`), so a rule naming `yes` shows the bare op `is`. `valueClick.ts:1` says "a checkbox is true-or-absent on disk, never a stored false".

**CHANGE**

- [ ] Write the filter, seed, and pane tests and watch them fail.
- [ ] The source changes.
- [ ] Commit Phase 1: `git commit --only -m "…" -- Core/Properties/propertyValue.ts Core/Properties/propertyValue.test.ts Core/Properties/governedWrite.test.ts Core/Views/Pipeline/filter.ts Core/Views/Pipeline/filter.test.ts Core/Views/reassign.ts Core/Views/Pipeline/creationSeeds.test.ts Core/Views/Settings/FilterFrame.tsx Core/Views/Settings/FilterFrame.test.tsx Core/Properties/Pickers/valueClick.ts`.

**AFTER**

```Core/Views/Pipeline/filter.ts diff
@@ imports @@

-import { isBlankValue, type PropertyValue, type ValueKind } from '../../Properties/propertyValue'
+import {
+  checkboxWord,
+  isBlankValue,
+  type PropertyValue,
+  type ValueKind,
+} from '../../Properties/propertyValue'

@@ parseBool — deleted @@

-function parseBool(s: string): boolean | null {
-  switch (s.toLowerCase()) {
-    case 'true':
-    case '1':
-    case 'yes':
-      return true
-    case 'false':
-    case '0':
-    case 'no':
-      return false
-    default:
-      return null
-  }
-}

@@ evaluateCheckbox @@

-      const e = parseBool(want[0])
+      const e = checkboxWord(want[0])
```

```Core/Views/reassign.ts diff
@@ imports @@

-import type { PropertyValue, ValueKind } from '../Properties/propertyValue'
+import { checkboxWord, type PropertyValue, type ValueKind } from '../Properties/propertyValue'

@@ FROM_GROUP_KEY @@

-  checkbox: (key) => (key === 'true' ? { kind: 'checkbox', value: true } : null),
+  checkbox: (key) => (checkboxWord(key) ? { kind: 'checkbox', value: true } : null),
```

```Core/Views/Settings/FilterFrame.tsx diff
@@ imports @@

 import { declaredType } from '../../Properties/value'
+import { checkboxWord } from '../../Properties/propertyValue'

@@ ruleRow @@

     const current = ops.find(
       (o) =>
         o.op === row.rule.op &&
-        (o.impliedValue === undefined || o.impliedValue === ruleOperands(row.rule)[0]),
+        (o.impliedValue === undefined ||
+          checkboxWord(o.impliedValue) === checkboxWord(ruleOperands(row.rule)[0])),
     )
```

```Core/Properties/Pickers/valueClick.ts diff
@@ header @@

-// One home for what a click or a value menu means on every surface: a checkbox is true-or-absent on disk, never a stored false; the option kinds …
+// One home for what a click or a value menu means on every surface: a checkbox toggles between checked and its key removed, never a stored unchecked word; the option kinds …
```

```Core/Views/Pipeline/filter.test.ts diff
@@ applyFilter — per type, after the checkbox test @@

+  it('checkbox: an operand reads as a checkbox word in any casing; one that is none abstains', () => {
+    const rows = [
+      row('t', { props: { prop_done: 'Yes' } }),
+      row('f', { props: { prop_done: 'off' } }),
+      row('n', { props: {} }),
+    ]
+    const is = (value: string): FilterGroup => ({
+      match: 'all',
+      rules: [{ property_id: 'prop_done', op: 'is', value }],
+    })
+    expect(ids(rows, is('on'))).toEqual(['t'])
+    expect(ids(rows, is('N'))).toEqual(['f', 'n'])
+    expect(ids(rows, is('1'))).toEqual(['t', 'f', 'n'])
+  })
```

```Core/Views/Pipeline/creationSeeds.test.ts diff
@@ filterSeeds, after "derives nothing from Isn't Checked" @@

+  it('seeds a checked box from an Is rule naming any checked word', () => {
+    const filter: FilterGroup = {
+      match: 'all',
+      rules: [{ property_id: 'p_check', op: 'is', value: 'Yes' }],
+    }
+    expect(filterSeeds(filter, true, schema)).toEqual({ p_check: { kind: 'checkbox', value: true } })
+  })
```

```Core/Views/Settings/FilterFrame.test.tsx diff
@@ FilterFrame value editors, after "a checkbox rule renders no value editor…" @@

+  it('a checkbox rule naming any checked word carries its clause', async () => {
+    await mount(
+      view({
+        filter: { match: 'all', rules: [{ property_id: 'prop_check', op: 'is', value: 'Yes' }] },
+      }),
+    )
+    expect(texts()).toContain('Is Checked')
+  })
```

**VERIFY**

- [ ] With the tests alone, the filter test fails on `is('on')` and `is('1')`, the seed test on `{}`, and the pane test on its missing clause; green after.
- [ ] `grep -rn "parseBool" Core` → none; `grep -rn "=== 'true'" Core --include='*.ts' --include='*.tsx' | grep -v test` → only `FilterFrame.tsx`'s `checkboxBox` (an operator's own `impliedValue`).
- [ ] Run the gates.

---

### Phase 2 — Number Reading And Spelling

**GOAL:** A Number reads a quoted or formatted number held in a file or typed in a field, and a write keeps the spelling the file uses. Decode and spelling are one commit (*§Constraints › Shape*); the popover's consolidation is its own task because it touches a component, not the codec.

#### Task 2-1

**TASK:** Add `readNumber`, `spelledNumber`, and the shared `currencySymbol` to `formatValue.ts`; `decodeValue`, `writtenSpelling`, `parseEditorValue`, and the Number filter read them.

**NOW:** `decodeValue` reads `typeof raw === 'number'` alone (`propertyValue.ts:67-68`); `writtenSpelling` returns a number `next` as is; `parseEditorValue` (`:36-39`) and `evaluateNumber` (`filter.ts:169`) read typed text through UIX `numberFrom`, which takes `Number(text)` when finite. `formatValue.ts` holds `readDate` (`:88-97`, "the one reading of a stored date"), the memoized en-US `numFmt` (`:21`), and `numberFormatGlyph` (`:233-243`), which extracts a currency's narrow symbol through `formatToParts`. A cell shows a currency with the default `'symbol'` display (`formatScalar`, `:197`): `$ € £ A$ CA$ ¥` for `CURRENCY_CODES`, where narrow collapses AUD and CAD to `$`. `formatValue.ts` joining the host graph adds no external and no UIX leaf outside `engineGraph.test.ts`'s list (`numberUnit` and `pad` are already on it).

**CHANGE**

- [ ] Write the tests below; watch them fail.
- [ ] The source changes.
- [ ] Commit with Task 2-2.

**AFTER**

```Core/Properties/formatValue.ts diff
@@ imports @@

-import { DEFAULT_CURRENCY, type NumberConfig } from './properties'
+import { CURRENCY_CODES, DEFAULT_CURRENCY, type NumberConfig } from './properties'
 import { pad } from '@pommora/uix/Utilities/pad'
+import { numberFrom } from '@pommora/uix/Utilities/numberUnit'

@@ numberFormatGlyph @@

+/** The symbol Intl gives `currency`: by default the one a cell shows (`A$`, `CA$`), or the narrow one the picker leads with. */
+const currencySymbol = (currency: string, currencyDisplay?: 'narrowSymbol'): string =>
+  numFmt({ style: 'currency', currency, currencyDisplay })
+    .formatToParts(0)
+    .find((p) => p.type === 'currency')?.value ?? currency
+
 /** The number picker's leading glyph; a currency shows its narrow symbol, where a cell spells out the ambiguous ones (A$, CA$). */
 export function numberFormatGlyph(cfg: NumberConfig): string {
   if (cfg.number_family === 'percent') return '%'
   if (cfg.number_family !== 'currency') return '#'
-  const currency = cfg.number_currency ?? DEFAULT_CURRENCY
-  return (
-    numFmt({ style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
-      .formatToParts(0)
-      .find((p) => p.type === 'currency')?.value ?? currency
-  )
+  return currencySymbol(cfg.number_currency ?? DEFAULT_CURRENCY, 'narrowSymbol')
 }
+
+const SYMBOL = CURRENCY_CODES.map((c) => currencySymbol(c).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')).join('|')
+const NUMBER_SHAPE = new RegExp(`^(-?)((?:${SYMBOL})\\s*)?(.*?)(\\s*(?:%|${SYMBOL}))?$`)
+const GROUPED = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/
+
+interface NumberShape {
+  value: number
+  lead: string
+  tail: string
+  grouped: boolean
+}
+
+/** A number as text spells it, the inverse of a cell's own formatting: digits as `numberFrom` reads them, commas only as thousands, and a currency symbol before, or a `%` or a symbol after, never both. */
+function numberShape(text: string): NumberShape | null {
+  const m = NUMBER_SHAPE.exec(text.trim())
+  if (!m || (m[2] && m[4])) return null
+  const [, sign, lead = '', body, tail = ''] = m
+  const grouped = GROUPED.test(body)
+  const value = numberFrom(sign + (grouped ? body.replaceAll(',', '') : body))
+  return value === undefined ? null : { value, lead, tail, grouped }
+}
+
+/** The one reading of a stored or typed number: a YAML number as itself, or a string that spells one. */
+export const readNumber = (raw: unknown): number | undefined =>
+  typeof raw === 'number' ? raw : typeof raw === 'string' ? numberShape(raw)?.value : undefined
+
+/** `next` as `raw` spells a number: an unchanged value keeps `raw` as written, and over anything but a string spelling a number it lands bare. */
+export function spelledNumber(next: number, raw: unknown): unknown {
+  const shape = typeof raw === 'string' ? numberShape(raw) : null
+  if (!shape) return next
+  if (shape.value === next) return raw
+  // A changed value keeps the file's quoting, currency symbol, percent sign, and grouping; its digits are the typed value's.
+  const digits = numFmt({ maximumFractionDigits: 20, useGrouping: shape.grouped }).format(Math.abs(next))
+  const spelled = `${next < 0 ? '-' : ''}${shape.lead}${digits}${shape.tail}`
+  return readNumber(spelled) === next ? spelled : next
+}
```

`SYMBOL` is built after `currencySymbol` and `numFmt` in file order. A plain numeral string such as `"31"` is quoted by yaml's `createNode` on write, which is how quoted stays quoted (yaml 2.9.0 through `mergeFrontmatter`: `"31"` emits `"31"`; `$1,300`, `45%`, `31 €`, `-$40`, and `1,234,567` emit plain). The closing read-back lands bare a value the spelling can't carry — `1e-25` formats to `0` at twenty fraction digits.

```Core/Properties/propertyValue.ts diff
@@ imports @@

 import { linkEntry, wholeValueLink } from '../Connections/linkValue'
+import { readNumber, spelledNumber } from './formatValue'

@@ decodeValue @@

-    case 'number':
-      return typeof raw === 'number' ? { kind, value: raw } : NULL_VALUE
+    case 'number': {
+      const value = readNumber(raw)
+      return value === undefined ? NULL_VALUE : { kind, value }
+    }

@@ writtenSpelling @@

-/** `next` spelled as `raw` already spells it: a checked `true` takes `raw`'s checkbox word as `checkedSpelling` does, a string keeps … */
+/** `next` spelled as `raw` already spells it: a checked `true` takes `raw`'s checkbox word as `checkedSpelling` does, a number keeps `raw`'s spelling as `spelledNumber` does, a string keeps … */
 export function writtenSpelling(next: unknown, raw: unknown): unknown {
   if (next === true) return checkedSpelling(raw)
+  if (typeof next === 'number') return spelledNumber(next, raw)
```

```Core/Properties/parseEditorValue.ts diff
@@ imports @@

-import { numberFrom } from '@pommora/uix/Utilities/numberUnit'
+import { readNumber } from './formatValue'

@@ parseEditorValue @@

-    const n = numberFrom(raw)
+    const n = readNumber(raw)
```

```Core/Views/Pipeline/filter.ts diff
@@ imports @@

-import { dayMs, readDate } from '../../Properties/formatValue'
+import { dayMs, readDate, readNumber } from '../../Properties/formatValue'
 …
-import { numberFrom } from '@pommora/uix/Utilities/numberUnit'

@@ evaluateNumber @@

-  const e = numberFrom(want[0])
+  const e = readNumber(want[0])
```

```Core/Properties/formatValue.test.ts diff
@@ imports @@

   numberFormatGlyph,
   readDate,
+  readNumber,
+  spelledNumber,
 } from './formatValue'

@@ end of file @@

+describe('readNumber', () => {
+  it('reads a YAML number as itself and a string as the number it spells', () => {
+    expect(readNumber(42)).toBe(42)
+    expect(readNumber('30')).toBe(30)
+    expect(readNumber(' 3.5 ')).toBe(3.5)
+    expect(readNumber('1,200')).toBe(1200)
+    expect(readNumber('-1,200.50')).toBe(-1200.5)
+    expect(readNumber('30%')).toBe(30)
+    expect(readNumber('30 %')).toBe(30)
+    expect(readNumber('$1,200')).toBe(1200)
+    expect(readNumber('-$30')).toBe(-30)
+    expect(readNumber('CA$1,300.5')).toBe(1300.5)
+    expect(readNumber('5A$')).toBe(5)
+    expect(readNumber('30 €')).toBe(30)
+    expect(readNumber('£ 7')).toBe(7)
+    expect(readNumber('¥500')).toBe(500)
+  })
+
+  it('reads nothing from a value that spells no number', () => {
+    for (const raw of ['five', '', '$', '%', '1,5', '12,34,567', '$30%', '-$-30', '30 USD', true, null, ['30']])
+      expect(readNumber(raw)).toBeUndefined()
+  })
+})
+
+describe('spelledNumber', () => {
+  it('keeps the file’s spelling of an unchanged value', () => {
+    expect(spelledNumber(30, '30.0')).toBe('30.0')
+    expect(spelledNumber(1200, '$1,200.00')).toBe('$1,200.00')
+  })
+
+  it('a changed value keeps the quoting, symbol, percent sign, spacing, and grouping, its digits typed', () => {
+    expect(spelledNumber(31, '30')).toBe('31')
+    expect(spelledNumber(1300, '$1,200.00')).toBe('$1,300')
+    expect(spelledNumber(1234567, '1,200')).toBe('1,234,567')
+    expect(spelledNumber(1234, '1200')).toBe('1234')
+    expect(spelledNumber(45, '30%')).toBe('45%')
+    expect(spelledNumber(-40, '$30')).toBe('-$40')
+    expect(spelledNumber(31, '30 €')).toBe('31 €')
+  })
+
+  it('lands bare over anything but a string spelling a number, and where the spelling would not read back', () => {
+    expect(spelledNumber(31, 30)).toBe(31)
+    expect(spelledNumber(31, 'five')).toBe(31)
+    expect(spelledNumber(31, undefined)).toBe(31)
+    expect(spelledNumber(1e-25, '$30')).toBe(1e-25)
+  })
+})
```

The grammar is pinned here alone; each consumer test below pins only that it reads through `readNumber` or `spelledNumber`.

```Core/Properties/propertyValue.test.ts diff
@@ decodeValue, after "a value whose shape contradicts its type reads as null…" @@

+  it('a Number reads a formatted number as the number it spells', () => {
+    expect(decodeValue(def({ type: 'number' }), '$1,200')).toEqual({ kind: 'number', value: 1200 })
+  })

@@ writtenSpelling, after the checkbox tests @@

+  it('a number keeps the spelling of the number the file holds', () => {
+    expect(writtenSpelling(1300, '$1,200')).toBe('$1,300')
+  })
```

```Core/Properties/governedWrite.test.ts diff
@@ setGovernedRootKey — spellings: fixtures @@

   const done: PropertyDefinition = { id: 'prop_done', name: 'Done', type: 'checkbox' }
+  const price: PropertyDefinition = { id: 'prop_price', name: 'Price', type: 'number' }
 …
-    defs: byFoldedName([tags, done, status]),
+    defs: byFoldedName([tags, done, status, price]),

@@ setGovernedRootKey — spellings, after the checked-box test @@

+  it('a number lands in the spelling the file holds: quoted stays quoted, formatted stays formatted', async () => {
+    await seeded('Price: "30"')
+    await setGovernedRootKey(page, 'Price', 31, world)
+    expect(await lines()).toContain('Price: "31"')
+    await seeded('Price: $1,200')
+    await setGovernedRootKey(page, 'Price', 1300, world)
+    expect(await lines()).toContain('Price: $1,300')
+  })
```

```Core/Contexts/contextResolve.test.ts diff
@@ the crossing describe @@

-describe('reconcileGovernedRoot — option and checkbox casing (the crossing)', () => {
+describe('reconcileGovernedRoot — option, checkbox, and number spellings (the crossing)', () => {
   const doneDef: PropertyDefinition = { id: 'prop_done', name: 'Done', type: 'checkbox' }
+  const priceDef: PropertyDefinition = { id: 'prop_price', name: 'Price', type: 'number' }
-  const casing: GovernedWorld = { ...world, defs: byFoldedName([stageDef, doneDef]) }
-  const input = { Stage: ['done'], Done: 'Yes' }
+  const casing: GovernedWorld = { ...world, defs: byFoldedName([stageDef, doneDef, priceDef]) }
+  const input = { Stage: ['done'], Done: 'Yes', Price: '$1,200.00' }

   it('keeps each value as the file spells it, reading it as registered', () => {
     const { root } = reconcileGovernedRoot(input, casing)
     expect(root).toEqual(input)
     expect(decodeValue(stageDef, root.Stage)).toEqual({ kind: 'select', value: 'Done' })
     expect(decodeValue(doneDef, root.Done)).toEqual({ kind: 'checkbox', value: true })
+    expect(decodeValue(priceDef, root.Price)).toEqual({ kind: 'number', value: 1200 })
   })
+
+  it('a restore keeps a formatted number as written', () => {
+    expect(reconcileGovernedRoot(input, casing, {}).root.Price).toBe('$1,200.00')
+  })
```

```Core/Views/Cards/cardValueInput.test.ts diff
@@ parseEditorValue @@

     expect(parseEditorValue('number', '  3.5 ')).toEqual({ kind: 'number', value: 3.5 })
+    expect(parseEditorValue('number', '$1,200')).toEqual({ kind: 'number', value: 1200 })
```

```Core/Views/Pipeline/filter.test.ts diff
@@ applyFilter — per type, after the number test @@

+  it('number: a formatted value and operand read as the numbers they spell', () => {
+    const rows = [row('a', { props: { prop_num: '$1,200' } }), row('b', { props: { prop_num: 30 } })]
+    expect(
+      ids(rows, {
+        match: 'all',
+        rules: [{ property_id: 'prop_num', op: 'greater_than', value: '$1,000' }],
+      }),
+    ).toEqual(['a'])
+  })
```

**VERIFY**

- [ ] With the tests alone, `npx vitest run Core/Properties Core/Contexts/contextResolve.test.ts Core/Views` fails on the new number cases: the reader tests on their missing exports, each consumer's wiring case, and the restore case (today a restore drops a number it can't read).
- [ ] Green after; `formatValue.test.ts`'s existing `numberFormatGlyph` test (`['$','€','£','$','$','¥']`) still passes through `currencySymbol`.
- [ ] `grep -rn "numberFrom" Core --include='*.ts' --include='*.tsx' | grep -v test` → `formatValue.ts` and `Schema/NumberEditor.tsx` only.

#### Task 2-2

**TASK:** Delete `NumberValuePicker`; the Number popover becomes `PropertyValueInput`'s shared `TextPicker`, carrying the format glyph and the fraction suffix.

**NOW:** `PropertyValueInput.tsx:43-52` returns `NumberValuePicker` for a Number popover, its only caller. `NumberValuePicker.tsx` renders a `TextPicker` with `leading={numberFormatGlyph(def)}` and a `/ {denominator}` trailing, and commits `parseEditorValue('number', raw)` on every dismiss — over a value it shows blank, dismissing commits `null` and deletes the key. `PropertyValueInput.tsx:80-90` renders the same `TextPicker` for every other popover, with `value={initial}`, `invalid` dimming, and `commit`'s unchanged-text guard (`:74-78`), the design commit `f78e6e572` set ("the three value surfaces edit through one PropertyValueInput, which closes without committing unchanged text"). `TextPicker` already takes `leading` and `trailing`. The shared path closes before it commits, an order its link and other popovers already run through the same callers (`CardsView.tsx` `commitPicked`, `ValuePickPresenter.tsx`).

**CHANGE**

- [ ] Write the test and watch it fail.
- [ ] `git rm Core/Properties/Pickers/NumberValuePicker.tsx`; the `PropertyValueInput` changes.
- [ ] Commit Phase 2: `git commit --only -m "…" -- Core/Properties/formatValue.ts Core/Properties/formatValue.test.ts Core/Properties/propertyValue.ts Core/Properties/propertyValue.test.ts Core/Properties/parseEditorValue.ts Core/Properties/governedWrite.test.ts Core/Contexts/contextResolve.test.ts Core/Views/Cards/cardValueInput.test.ts Core/Views/Pipeline/filter.ts Core/Views/Pipeline/filter.test.ts Core/Properties/Pickers/NumberValuePicker.tsx Core/Properties/Pickers/PropertyValueInput.tsx Core/Properties/Pickers/PropertyValueInput.test.tsx`.

**AFTER**

```Core/Properties/Pickers/PropertyValueInput.tsx diff
@@ imports @@

 import { editorText, parseEditorValue } from '../parseEditorValue'
-import { NumberValuePicker } from './NumberValuePicker'
+import { fractionDenominator, numberFormatGlyph } from '../formatValue'
 import { TextPane } from './TextPane'

@@ PropertyValueInput @@

   const keepTitle = !useSetting('removeTitleOnLinkChange')
-  if (popover && def.type === 'number')
-    return (
-      <NumberValuePicker
-        {...popover}
-        def={def}
-        current={current}
-        onCommit={onCommit}
-        onDismiss={onClose}
-      />
-    )
   if (popover && def.type === 'text')
 …
   const accent = def.type === 'link' ? solidColorCss(def.link_color) : undefined
+  const denominator = fractionDenominator(def)
   if (popover)
     return (
       <TextPicker
         {...popover}
         value={initial}
         accent={accent}
+        leading={def.type === 'number' ? numberFormatGlyph(def) : undefined}
+        trailing={denominator === undefined ? undefined : `/ ${denominator}`}
         invalid={invalid}
         onCommit={commit}
         onDismiss={onClose}
       />
     )
```

`fractionDenominator` answers `undefined` for any definition without a fraction configured, so only a Number with one shows a suffix.

```Core/Properties/Pickers/PropertyValueInput.test.tsx diff
@@ the popover routes, after "opens TextPane for a Text value…" @@

+  it('a Number popover commits nothing when its text is unchanged, and changed text as the number it spells', () => {
+    const field = (): HTMLInputElement => popoverFor('number').querySelector('input')!
+    const blank = field()
+    act(() => {
+      blank.focus()
+      blank.blur()
+    })
+    expect(onCommit).not.toHaveBeenCalled()
+    act(() => root.render(null))
+    const typed = field()
+    act(() => {
+      typed.focus()
+      typed.value = '$1,300'
+      typed.dispatchEvent(new Event('input', { bubbles: true }))
+    })
+    act(() => typed.blur())
+    expect(onCommit).toHaveBeenCalledWith({ kind: 'number', value: 1300 })
+  })
```

**VERIFY**

- [ ] With the test alone, it fails on `onCommit` called with `null` (the deletion); green after.
- [ ] `grep -rn "NumberValuePicker" Core` → none.
- [ ] Run the gates.

#### Review Checkpoint

- [ ] Phases 1 and 2 reviewed (simplification and correctness, Opus at high effort) against *§Constraints*, its Reuse bullet first, and the settled decisions; every finding closed.
- [ ] No live path rewrites an unchanged quoted or formatted number: the crossing test passes, and `runRepairSweep` reaches values only through `reconcileGovernedRoot`.

---

### Phase 3 — Documentation

**GOAL:** PropertiesPM states the reading rule once, naming Multi-Select, Text, Number, and Checkbox together, and drops the checkbox claims the change makes false.

#### Task 3-1

**TASK:** Three surgical edits to PropertiesPM: the Checkbox table row, the decode paragraph, and the Checkbox paragraph's toggle clause.

**NOW:** Line 14 reads "`true`, or the key absent; `true` and `yes` in any casing read as checked"; line 29's checkbox clause "while a checkbox is written as `true` or left absent — `true` and `yes` in any casing read as checked, and any other value, a `false` written by another application included, reads as no value"; line 59 "toggling on writes `true` and toggling off strips the key". The Number row ("Bare number") and the Number paragraph still read true and stay.

**CHANGE**

- [ ] The three edits, as below.
- [ ] Commit: `git commit --only -m "…" -- .claude/Features/PropertiesPM.md`.

**AFTER**

```.claude/Features/PropertiesPM.md diff
@@ type table @@

-| **Checkbox**      | `Done: true` | `true`, or the key absent; `true` and `yes` in any casing read as checked |
+| **Checkbox**      | `Done: true` | `true`, or the key absent |

@@ decode paragraph @@

-… and nothing is inferred from a value's shape. Two rules follow. **No value, no key** — … number `0` is a real value and stays, while a checkbox is written as `true` or left absent — `true` and `yes` in any casing read as checked, and any other value, a `false` written by another application included, reads as no value. **A key …
+… and nothing is inferred from a value's shape. Each type reads what other applications write: a Multi-Select keeps members it doesn't register, a Text reads any value as text, a Number reads a quoted or formatted number, and a Checkbox reads `true`/`false`, `yes`/`no`, `on`/`off`, and `y`/`n` in any casing. Two rules follow. **No value, no key** — … number `0` is a real value and stays, and unchecking a checkbox removes its key. **A key …

@@ Checkbox paragraph @@

-… toggling on writes `true` and toggling off strips the key. …
+… toggling on writes `true`, or the checked word of the pair the file holds, and toggling off strips the key. …
```

The row keeps the file's column padding; `…` stands for unchanged text. The paragraph's existing "keeps how each value it holds is spelled" already covers a number's and a checkbox word's spelling.

**VERIFY**

- [ ] `grep -n "\`true\` and \`yes\` in any casing" .claude/Features/PropertiesPM.md` → none.
- [ ] Each edited paragraph reads without contradiction.

---

### Phase 4 — Live Drive

**GOAL:** The built app, on a throwaway copy of `~/Test`, leaves exactly the bytes the plan claims after registering, ticking, unticking, and editing over held values.

#### Task 4-1

**TASK:** A scratchpad script on `.claude/scripts/drive-harness.mjs`'s `launch` and `restore` seeds one page, registers the properties over it, drives each gesture through `mutate`, and reads the page file after each.

**FILES:** none in the repo; the script lives in the session scratchpad and is deleted after.

**CHANGE**

- [ ] Seed `Collection A/Set Alpha/Drive Adopt.md` with a minted page ID (`mintPageId`) and frontmatter `done: No`, `Price: $1,200.00`, `Count: "30"`, `Pinned: OFF`.
- [ ] `schema:add` into `Collection A`: Done (checkbox), Price (number), Count (number), Pinned (checkbox). Read the file: byte-identical to the seed.
- [ ] `mutate setProperty` Done → `{ kind: 'checkbox', value: true }`: the file holds `done: Yes`. Pinned → checked: `Pinned: ON`. Price → 1300: `Price: $1,300`. Count → 31: `Count: "31"`.
- [ ] Done → `null`: the `done` line is gone, every other line unchanged.
- [ ] `restore()`; delete the script.

**VERIFY**

- [ ] Each read printed and matched, pasted into *§Final Verification*'s own pass.
- [ ] `~/Test` restored (the harness's backup), no instance left running.

---

### Completion Criteria

**Conformance**

- [ ] Nothing changed outside the files the tasks name, `Dashboard/Ledger/loc-history.json`, and this plan.
- [ ] One reader of number text in Core (`formatValue.ts`, beside `readDate`), one currency-symbol lookup, one checkbox vocabulary (`propertyValue.ts`), and one value popover (`PropertyValueInput`); no second list of words or symbols and no helper the codebase already had.

**Correctness**

- [ ] A quoted, comma-grouped, percent, or currency number under a Number key reads as its number on every surface; a held unchecked word reads unchecked and a tick writes its partner; an untick removes the key.
- [ ] The live drive's bytes match Task 4-1.

**Completeness**

- [ ] Every task ticked; no scaffolding, debug output, or TODO in `0d0b7f3f4..HEAD`.

**Confirmation**

- [ ] Every new test goes red with its change reverted.

**Continuity**

- [ ] *§Reconciliation* walked; PropertiesPM reads true.

**Confidence**

- [ ] Gates green from clean across `0d0b7f3f4..HEAD`; the production diff is roughly +55/−50 lines, comments, tests, and docs excluded — growth past it reported.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

- [ ] Phase review (Opus, high effort): Phase 1 · Phase 2 · Phase 3
- [ ] Simplification lens → adversarial lens (Opus, high effort) over `0d0b7f3f4..HEAD`
- [ ] Neutral verification (Opus, high effort) over `0d0b7f3f4..HEAD`
- [ ] Own pass: gates · diff · deviations · criteria · the drive's reads
- [ ] Reconciliation walked
- [ ] Report delivered

#### Reconciliation

- `Core/Properties/propertyValue.ts` — `isCheckedRaw`'s doc "the word `true` or `yes` in any casing"; `writtenSpelling`'s doc "a checked `true` keeps `raw`'s checked word" — Tasks 1-1, 2-1
- `Core/Properties/Pickers/valueClick.ts:1` — "a checkbox is true-or-absent on disk, never a stored false" — Task 1-2
- `Core/Properties/propertyValue.test.ts` — "a checkbox is true or absent — false written from outside reads as no value"; "a checkbox reads true, or the word true or yes in any casing, as checked"; the two checked-value `writtenSpelling` tests — Task 1-1
- `Core/Properties/governedWrite.test.ts:196` — "a checked box the file spells otherwise lands as true" — Task 1-1
- `.claude/Features/PropertiesPM.md:14, 29, 59` — the Checkbox row, the decode paragraph's checkbox clause, the toggle clause — Task 3-1

#### Open Items

- None.

#### Deviations

