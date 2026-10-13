## Number & Checkbox Adoption — Implementation Plan

**DATE:** 10-12-2026
**STATUS:** Complete 10-13-2026 — `faadbae37..c8b0f1070`
**SOURCE:** This session's conversation of 10-12-2026 with Nathan; its rulings are listed under *§Constraints › Settled Decisions*.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `faadbae37` | 7,666 passed · 2 skipped | 10-12-2026 8:44 PM | 10-13-2026 1:05 AM |

### Context

A frontmatter key the registry doesn't name is foreign: kept as written, and live the moment a definition names it. Key matching is already type-agnostic — a key matches a name in any casing, a write lands on the spelling the file holds (an empty `Price:` included), and a rename onto held keys adopts them for every type. What differs per type is two arms in `Core/Properties/propertyValue.ts`: `decodeValue` decides which held shapes read as a value, and `writtenSpelling` decides what spelling a write keeps. Text reads any shape and keeps it; a Multi-Select keeps unregistered members (which the settle registers as options) and each member's casing. Number reads only a YAML number, so a held `"30"` or `$1,200` reads as nothing; Checkbox reads only `true`/`yes` as checked, and a tick over `no` writes `true`. Reading ignores quote marks already, since every reader works on parsed YAML, and Select, Status, Multi-Select, Context, and Text fold a scalar by its text whatever YAML type quoting gave it; writing doesn't, since `mergeInto` writes each changed value as a fresh node that drops the file's quotes.

The content index stores every key's raw value untyped, and the watcher, walk, and settle chain (`oweNamedKeys`, `registerHeldOptions`) exists only to register Multi-Select options, which Number and Checkbox don't have — so none of it changes. Adjacent findings join the work. `NumberValuePicker` is a second copy of the popover `PropertyValueInput` already renders for every other type, minus its unchanged-text guard, so dismissing it over a value it shows blank deletes that value. And two readers still match the literal `'true'` where a hand-written checkbox rule may name `yes`: the creation seed (through `reassign.ts`) and the filter pane's operator label.

### Overview

Number and Checkbox gain the same two arms Text and Multi-Select have. A Checkbox reads one vocabulary of word pairs in any casing — `true`/`false`, `yes`/`no`, `on`/`off`, `y`/`n` — and a tick over an unchecked word writes its partner in the same casing (`No` → `Yes`, `OFF` → `ON`), while an untick still removes the key. A Number reads a quoted number, or one written with comma thousands, a trailing `%`, or a currency symbol before or after it — the inverse of what a cell itself shows — through one reader in `formatValue.ts` beside `readDate`, which the inline field, the popover, and Number filter operands share. A write keeps the file's symbol, percent sign, spacing, and grouping, and an unchanged value leaves the file byte-identical. Display stays governed by the property's own format. Beneath both, a changed string of any type keeps the file's quote formatting — a scalar's own quotes, or a list's on each member — and an unchanged member keeps its spelling, a bare `2024` or `[[a.png]]` included, so keys and scalar values match and write back without regard to case or quoting.

Every reader of a checkbox word — the filter, the creation seed, the filter pane's label — reads the shared vocabulary, so `1`/`0` stop meaning anything. `NumberValuePicker` goes, and the Number popover becomes the shared one with its format glyph. PropertiesPM states the reading rule once, naming Multi-Select, Text, Number, and Checkbox together. A live drive on `~/Test` reads the bytes each gesture leaves.

#### Concepts

**ADDED**

| Concept                                           | Description                                                                                                                                                                                                                                                                                                                                                            | Location                                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `readNumber` • Function                           | The one reading of a stored or typed number: a YAML number as itself, or a string spelling one. Read by `decodeValue`, `parseEditorValue`, and the Number filter.                                                                                                                                                                                                      | `Core/Properties/formatValue.ts`                         |
| `spelledNumber` • Function                        | A number written in the spelling a held string uses; `writtenSpelling`'s number arm.                                                                                                                                                                                                                                                                                   | `Core/Properties/formatValue.ts`                         |
| `currencySymbol` • Function                       | The symbol Intl gives a currency, by default as a cell shows it or narrow as the picker leads with it; `numberFormatGlyph` and the reader's symbol list both read it.                                                                                                                                                                                                  | `Core/Properties/formatValue.ts`                         |
| `escapeRegExp` • Function                         | Text with every RegExp syntax character escaped; the reader's symbol alternation and `webGuests.ts`'s app-name match both read it.                                                                                                                                                                                                                                     | `UIX/Utilities/escapeRegExp.ts`                          |
| `nodeSpelledAs` • Function                        | A changed value as a node spelled as the held spellings of its key: a list keeps the flow or block style of the one it lands on, each single-line string keeps its own held quotes from any spelling or takes those the file chose, and a kept unquoted wikilink, whole or a member, keeps its flow spelling. `mergeInto` and `renameFrontmatterKey` write through it. | `Core/Files/pageFile.ts`                                 |
| `wholeLinkTitle` • Function                       | The title node of a whole unquoted `[[x]]`, a list of one list of one scalar; `nodeSpelledAs` writes one flow and reads a held one as no list style, and `linkAsWritten` reads its title.                                                                                                                                                                              | `Core/Files/pageFile.ts`                                 |
| `linkAsWritten` • Function                        | A whole unquoted `[[x]]` whose title yaml read as a number or boolean that prints otherwise, as its title was written; the frontmatter read substitutes it.                                                                                                                                                                                                            | `Core/Files/pageFile.ts`                                 |
| `quotesUnasked` • Function                        | Whether yaml quotes a string unasked, as it does a numeral or a `[[Page]]`; `nodeSpelledAs` reads it to tell the quotes a file chose from the ones yaml needed.                                                                                                                                                                                                        | `Core/Files/pageFile.ts`                                 |
| `checkboxWord` • Function                         | What a checkbox value says in any casing: true, false, or null. Read by `decodeValue`, the filter, the group-key decode, and the filter pane.                                                                                                                                                                                                                          | `Core/Properties/propertyValue.ts`                       |
| `checkedSpelling` • Function                      | A checked value as a held value spells one; `writtenSpelling`'s checkbox arm.                                                                                                                                                                                                                                                                                          | `Core/Properties/propertyValue.ts`                       |
| `asText` • Function                               | A held value as text: a string as itself, an unquoted `[[x]]` as the connection it spells, anything else as the yaml that spells it; the Text decode and `writtenSpelling`'s string arm read it.                                                                                                                                                                       | `Core/Properties/propertyValue.ts`                       |
| `contextTitles` • Function                        | The folded titles a Context value names, its scalar members only; Context resolution, the live reconcile, and the index's Space relations read it.                                                                                                                                                                                                                     | `Core/Contexts/contexts.ts`                              |
| `scalarMembers` • Function                        | A held value's scalar members as strings; `optionList`, `contextTitles`, and a Context unlink read it.                                                                                                                                                                                                                                                                 | `Core/Contract/validators.ts`                            |
| `memberKey` • Function                            | What a held member matches by: a scalar's folded title, or the member itself; `joinValues`, `namesValue`, and the reconcile's no-shrink `memberCount` read it.                                                                                                                                                                                                         | `Core/Files/heldKeys.ts`                                 |
| `Metadata Spelling Drive/live-drive.mjs` • Script | The live drive over every value type's reads, writes, and rename cascades across quote styles, casings, checkbox words, and number shapes, one page per case.                                                                                                                                                                                                          | `.claude/scripts/Metadata Spelling Drive/live-drive.mjs` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `isCheckedRaw` • Function | Replaced by `checkboxWord`. | `Core/Properties/propertyValue.ts` |
| `parseBool` • Function | The filter's own true/false reading, `1`/`0` included; replaced by `checkboxWord`. | `Core/Views/Pipeline/filter.ts` |
| `NumberValuePicker.tsx` • Component | A second copy of the shared popover in `PropertyValueInput`, lacking its unchanged-text guard and invalid dimming. | `Core/Properties/Pickers/NumberValuePicker.tsx` |

#### Constraints

- **Gates:** `npm run typecheck` · `npm run test` · `npm run lint`, from the repo root, chained with `&&`, each exiting 0; lint prints no `Found N warnings` line. Biome formats every TS write, so an Edit failing on whitespace means it reformatted — re-read and retry.
- **Commits:** `git add <new files>` and `git rm <removed files>` first, then `git commit --only -m "…" -- <paths>`; messages past-tense and short, ending with the Co-Authored-By line. The pre-commit hook adds `Dashboard/Ledger/loc-history.json`.
- **Frozen:** The value union (`checkbox: z.literal(true)`, `number: z.number()`); `encodeValue`; UIX `numberFrom` and its UIX callers; `applyValueAtRoot` (the renderer's optimistic copy lands the bare encoded value, and both copies decode alike); the watcher, settle, and `registerHeldOptions`; "No value, no key" — an untick and an emptied number remove the key.
- **Reuse:** Nothing is built that the codebase already provides, and nothing diverges from how it already does a thing. Plan review found six places a first draft hand-rolled an existing mechanism, and the plan now reuses each: the number reader lives in `formatValue.ts` beside `readDate` (the one reading of a stored date) and formats digits through its memoized en-US `numFmt`; the currency symbol comes from one `currencySymbol` that `numberFormatGlyph` shares; the casing transfer uses UIX `capitalize`; the regex escape `Desktop/Web/webGuests.ts` hand-wrote becomes one UIX `escapeRegExp` both read; `writtenSpelling`'s member arm matches through `namesValue`, the folded member matcher every option sweep already uses; the two frontmatter writers share one `nodeSpelledAs`; and the Number popover is `PropertyValueInput`'s shared one, whose unchanged-text guard already exists, rather than a second guard in a second component. Execution keeps looking outward the same way: before writing any helper, search for the existing one, and record any new instance under *§Deviations*. A future audit finding a duplicate here is a defect of this plan.
- **Conventions:** No comments beyond the doc comments the plan writes and the one decision comment in `spelledNumber`. No user-facing copy. No test churn: a behavior an existing test already exercises is pinned by extending that test, a new test exists only for behavior nothing pins, nothing repeats a sibling, and every added assertion fails without its change. A grammar case is pinned once, in the reader's tests; each consumer pins only its wiring.
- **Shape (fix):** Every consumer of the old behavior is named in a task: `isCheckedRaw`'s two callers; `parseBool`'s one; the literal-`'true'` readers of a rule operand (`reassign.ts`, `FilterFrame.tsx`'s operator label); `numberFrom`'s two Core value callers (`parseEditorValue`, `filter.ts`); `NumberValuePicker`'s one caller; both frontmatter writers (`mergeInto`, `renameFrontmatterKey`); the three readers of a Context value's members (`resolveContextKeys`, `reconcileGovernedRoot`, `indexSeed.ts`'s `spaceRelations`); and the two member folds that dedupe or count (`joinValues`, `memberCount`). Sync's arrival writes incoming bytes as they are and isn't a value writer. `NumberEditor.tsx`'s `numberFrom` calls read format configuration and stay; `filterModel.ts`'s `impliedValue` and `FilterFrame.tsx`'s `checkboxBox` reading it, `propertyMenuActions.ts`'s `CHECKBOX_OPTIONS`, and `group.ts`'s `'true'` key are the app's own canonical values and stay.
- **Shape (one commit):** The Number decode and its spelling arm land in one commit. A decode alone would let the live reconcile (`reconcileGovernedRoot`, `runRepairSweep`) rewrite every quoted or formatted number in a Nexus to a bare one.

**Settled Decisions** — Nathan, 10-12-2026:

- The checkbox pairs are `true`/`false`, `yes`/`no`, `on`/`off`, `y`/`n`, in any casing; the first of each is checked.
- A tick over an unchecked word writes its partner in the same casing; an untick removes the key. YAML-native `True`/`FALSE` parse to booleans before any spelling is seen, so a tick over `False` writes `true` — accepted.
- A number write follows the held shape: bare stays bare, quoted stays quoted, formatted keeps its symbol, `%`, grouping, and decimal places with the digits the typed value's (`$1,200.00` → `$1,300.00`). Fresh writes stay bare; always-quoting was weighed and declined for cross-application continuity.
- The grammar: commas only as thousands in groups of three (`1,5` reads as nothing), a trailing `%`, and the currency symbols of `CURRENCY_CODES` (`$ € £ A$ CA$ ¥`) before or after — symbols only, no ISO codes. The property's own format alone decides display.
- The field and filter operands read typed text by the same grammar. `1`/`0` stop counting as checkbox operands.
- The write-back decision is noted on its line as a one-line comment.
- A changed value keeps the file's quote formatting, for every type and every list member, through one helper both frontmatter writers share (`nodeSpelledAs`), reversing the Text-era fresh-node write (`b80a7b12a`). Keys and values match without regard to case or quoting; an unchanged member keeps its spelling, its own quotes included (`2024`, a bare `b` beside `"a"`, `[[a.png]]`), and a list keeps its flow or block style. A quote yaml needed — a numeral's `"2024"` or `'2024'`, `'"Q3"'` — isn't the file's choice, so it spreads to no value yaml would leave bare, a joined member keeps its own quotes from whichever spelling held it, and a Space, like every type, is bare by default. A string YAML can only spell quoted — a changed `[[Page]]`, or `43` over a bare `42` — takes yaml's double quotes. PropertiesPM states the write rule as one of its primary rules. `ID` follows the same rule as every key.
- A Context value names Spaces through its scalar members only, as every option list already reads; a wikilink member is an unknown value like any other.
- Link and File join the same rule if they come free, and they do: `linkEntry` reads a quoted or unquoted connection alike, a title yaml reads as a number or boolean read as written (`[[007]]`, `[[1.10]]`), both writers are type-agnostic, and a page rename's frontmatter rewrite lands through `nodeSpelledAs`. A whole unquoted `[[x]]` that gains a sibling becomes a block list of quoted members, the spelling yaml gives a string link.
- Documentation stays overview-level: nothing the code shows plainly, no exhaustive detail.
- Plan reviews before ratification run as Opus at extra-high effort; every code review during and after execution runs as Opus at high effort, and the final neutral verification as Opus at extra-high effort.
- Execution is dispatched to Opus at low effort, phase by phase. Alongside it, one Haiku agent at extra-high effort applies the same plan in a parallel worktree, as a comparison of whether Opus earns its cost on code the plan already writes; *§Execution Comparison* records the outcome.

#### Process Overview

- [x] **Phase 1** — Checkbox Word Pairs
  - [x] Task 1-1
  - [x] Task 1-2
- [x] **Phase 2** — Quote Formatting
  - [x] Task 2-1
  - [x] Review Checkpoint
- [x] **Phase 3** — Number Reading And Spelling
  - [x] Task 3-1
  - [x] Task 3-2
  - [x] Task 3-3
  - [x] Review Checkpoint
- [x] **Phase 4** — Documentation
  - [x] Task 4-1
- [x] **Phase 5** — Live Drive
  - [x] Task 5-1
  - [x] Task 5-2
- [x] `[Parallel: the Haiku comparison run, dispatched with Phase 1 — see §Execution Comparison]`

---

### Phase 1 — Checkbox Word Pairs

**GOAL:** One vocabulary decides what a checkbox value says everywhere a value or an operand is read, and a tick writes the checked word of the pair the file already uses. A separate phase because it shares no code path with the number reader beyond `writtenSpelling`'s first line.

#### Task 1-1

**TASK:** Replace `isCheckedRaw` with `checkboxWord` over one table of word pairs, and give `writtenSpelling` the `checkedSpelling` arm.

**NOW:** `isCheckedRaw` (`propertyValue.ts:59-61`) reads `true` or the string `true`/`yes` in any casing; `decodeValue` and `writtenSpelling` call it, the latter keeping a checked word and otherwise writing `true`. `governedWrite.test.ts:196` pins `Done: No` → `true`.

**CHANGE**

- [x] Write the tests below and watch the decode, partner, and governed-write cases fail.
- [x] Delete the test `a checkbox is true or absent — false written from outside reads as no value`; the rewritten casing test covers a YAML `false`.
- [x] The source changes.

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
+const CHECKED_WORD = new Map(
+  CHECKBOX_WORDS.flatMap(([on, off]): [string, string][] => [
+    [on, on],
+    [off, on],
+  ]),
+)
+
+/** What a checkbox value says as a file spells it, in any casing: true for a pair's checked word, false for its partner, null for anything else. */
+export function checkboxWord(raw: unknown): boolean | null {
+  if (typeof raw === 'boolean') return raw
+  const word = typeof raw === 'string' ? normalizeTitle(raw) : ''
+  const checked = CHECKED_WORD.get(word)
+  return checked === undefined ? null : checked === word
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
+  const partner = CHECKED_WORD.get(normalizeTitle(word))
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

@@ writtenSpelling — the checked-word test, extended @@

-  it('a checked value keeps the checked word the file holds', () => {
+  it('a checked value keeps the checked word the file holds, and takes its unchecked word’s partner in the same casing', () => {
     expect(writtenSpelling(true, 'Yes')).toBe('Yes')
+    expect(writtenSpelling(true, 'no')).toBe('yes')
+    expect(writtenSpelling(true, 'No')).toBe('Yes')
+    expect(writtenSpelling(true, 'OFF')).toBe('ON')
+    expect(writtenSpelling(true, 'N')).toBe('Y')
+    expect(writtenSpelling(true, 'false')).toBe('true')
   })

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

- [x] With the tests alone, `npx vitest run Core/Properties/propertyValue.test.ts Core/Properties/governedWrite.test.ts` fails on the `'on'` decode, the `'no'` partner, and `'Yes'`; green after the change.
- [x] `grep -rn "isCheckedRaw" Core` → none.

#### Task 1-2

**TASK:** Every other reader of a checkbox word reads `checkboxWord`: the filter's operand, the group-key decode the creation seed reaches, and the filter pane's operator label. The click-intent header states the untick rule.

**NOW:** `parseBool` (`filter.ts:127-140`) reads `true`/`1`/`yes` and `false`/`0`/`no`, its one caller `evaluateCheckbox`. `reassign.ts:8` checks only `key === 'true'`, so `filterSeeds` seeds nothing from an Is rule naming `yes`. `FilterFrame.tsx:538-542` finds a rule's operator by `o.impliedValue === ruleOperands(row.rule)[0]` (only the checkbox operators carry an `impliedValue`, `filterModel.ts:140-141`), so a rule naming `yes` shows the bare op `is`. `valueClick.ts:1` says "a checkbox is true-or-absent on disk, never a stored false".

**CHANGE**

- [x] Write the filter, seed, and pane tests and watch them fail.
- [x] The source changes.
- [x] Commit Phase 1: `git commit --only -m "…" -- Core/Properties/propertyValue.ts Core/Properties/propertyValue.test.ts Core/Properties/governedWrite.test.ts Core/Views/Pipeline/filter.ts Core/Views/Pipeline/filter.test.ts Core/Views/reassign.ts Core/Views/Pipeline/creationSeeds.test.ts Core/Views/Settings/FilterFrame.tsx Core/Views/Settings/FilterFrame.test.tsx Core/Properties/Pickers/valueClick.ts`.

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
@@ applyFilter — per type: the checkbox test, extended @@

     expect(
       ids(rows, { match: 'all', rules: [{ property_id: 'prop_done', op: 'is', value: 'true' }] }),
     ).toEqual(['t'])
+    expect(
+      ids(rows, { match: 'all', rules: [{ property_id: 'prop_done', op: 'is', value: 'On' }] }),
+    ).toEqual(['t'])
+    expect(
+      ids(rows, { match: 'all', rules: [{ property_id: 'prop_done', op: 'is', value: 'N' }] }),
+    ).toEqual(['f', 'n'])
+    expect(
+      ids(rows, { match: 'all', rules: [{ property_id: 'prop_done', op: 'is', value: '1' }] }),
+    ).toEqual(['t', 'f', 'n'])
```

```Core/Views/Pipeline/creationSeeds.test.ts diff
@@ filterSeeds — "derives positive Is rules…", extended @@

     expect(filterSeeds(filter, true, schema)).toEqual({
       p_status: { kind: 'select', value: 'doing' },
       p_check: { kind: 'checkbox', value: true },
     })
+    const word: FilterGroup = { match: 'all', rules: [{ property_id: 'p_check', op: 'is', value: 'Yes' }] }
+    expect(filterSeeds(word, true, schema)).toEqual({ p_check: { kind: 'checkbox', value: true } })
```

```Core/Views/Settings/FilterFrame.test.tsx diff
@@ FilterFrame value editors — "a checkbox rule renders no value editor…" @@

-        filter: { match: 'all', rules: [{ property_id: 'prop_check', op: 'is', value: 'false' }] },
+        filter: { match: 'all', rules: [{ property_id: 'prop_check', op: 'is', value: 'no' }] },
```

The edited fixture pins a hand-written word; `twoRules` still pins the pane's own `'true'`.

**VERIFY**

- [x] With the tests alone, the filter test fails on `'On'`, `'N'`, and `'1'`, the seed test on `{}`, and the pane test on its missing clause; green after.
- [x] `grep -rn "parseBool" Core` → none; `grep -rn "=== 'true'" Core --include='*.ts' --include='*.tsx' | grep -v test` → `propertyMenuActions.ts` (the menu's own `CHECKBOX_OPTIONS` values) and `FilterFrame.tsx`'s `checkboxBox` (an operator's own `impliedValue`).
- [x] Run the gates.

---

### Phase 2 — Quote Formatting

**GOAL:** A changed string keeps the file's quote formatting on every type, a scalar or each member of a list, through one helper both frontmatter writers share; and an unchanged list member keeps the spelling the file gave it — a bare `2024` beside quoted strings, or an unquoted `[[a.png]]` in a File list. Its own phase because it changes the writer every property type shares, and Phase 3's number spelling leans on it.

#### Task 2-1

**TASK:** `nodeSpelledAs` gives a changed value the held value's quotes, and `mergeInto` and `renameFrontmatterKey` both write through it; `writtenSpelling`'s member arm matches held members through the shared `namesValue`, reading an unquoted wikilink member through `linkEntry`, and a whole unquoted wikilink stays whole.

**NOW:** Reading ignores quote marks by construction: every reader works on parsed YAML, so `- "Ideas"` and `- Ideas` are the same string. Where quoting changes a scalar's YAML type (`2024` and `"2024"`, `true` and `"true"`), Select, Status, Multi-Select, Context, and Text fold it by its text — `normalizeTitle`, and `namesValue` (`Core/Properties/pageValue.ts:12-15`, the folded member matcher every option sweep uses) — and Phases 1 and 3 bring Checkbox and Number in; `linkEntry` reads `[[Page]]` and `"[[Page]]"` alike for Link and File. Writing doesn't: `mergeInto` (`Core/Files/pageFile.ts:122-125`) writes a changed value as a fresh node, so its quotes go — the Text-era choice in `b80a7b12a` — and `pageFile.test.ts:88` pins that. `renameFrontmatterKey` (`:176`) writes a joined list with `doc.set(String(pair.key), value)`, outside `mergeInto`. `writtenSpelling`'s member arm (`propertyValue.ts:150-155`) matches held members only when they're strings, so the live reconcile rewrites a held bare `- 2024` to `- "2024"` and an unquoted `- [[a.png]]` to `- "[[a.png]]"` on any sibling write; `propertyValue.test.ts` ("takes only string members"), `contextResolve.test.ts:120`, and `restoreScrub.test.ts:216` pin the string coercion, against ContextsPM's "a drifted-but-resolvable value … keeps its spelling". Sapphire double-quotes every string it writes, list members included, so today a Pommora write to a key Sapphire wrote strips its quotes and Sapphire's next write restores them.

**CHANGE**

- [x] Write the tests below and watch them fail.
- [x] The source changes.
- [x] Commit Phase 2: `git commit --only -m "…" -- Core/Files/pageFile.ts Core/Files/pageFile.test.ts Core/Connections/linkValue.ts Core/Properties/propertyValue.ts Core/Properties/propertyValue.test.ts Core/Properties/repairSweep.test.ts Core/Contexts/contextResolve.test.ts Core/Trash/restoreScrub.test.ts`.

**AFTER**

```Core/Files/pageFile.ts diff
@@ imports @@

-import { type Document, type Pair, type ParsedNode, parseDocument, isMap, stringify } from 'yaml'
+import {
+  type Document,
+  type Node,
+  type Pair,
+  type ParsedNode,
+  parseDocument,
+  isMap,
+  isScalar,
+  isSeq,
+  stringify,
+} from 'yaml'

@@ valuesOf @@

+/** The title of a whole unquoted `[[x]]`, a list of one list of one scalar; null for any other node. */
+function wholeLinkTitle(n: unknown): Scalar | null {
+  const only = isSeq(n) && n.items.length === 1 ? n.items[0] : null
+  const title = isSeq(only) && only.items.length === 1 ? only.items[0] : null
+  return isScalar(title) ? title : null
+}
+
+/** A whole unquoted `[[x]]` whose title yaml read as a number or boolean that prints otherwise (`[[007]]`, `[[1.10]]`, `[[True]]`), as its title was written; undefined for any other node. */
+function linkAsWritten(n: unknown): unknown[][] | undefined {
+  const title = wholeLinkTitle(n)
+  if (!title || typeof title.value === 'string' || title.source === undefined) return undefined
+  return title.source === String(title.value) ? undefined : [[title.source]]
+}
+
~/** Anything that isn't a YAML map — an array, a scalar, unrecoverable YAML — reads as an empty map, and the file is still a valid page. A whole unquoted `[[x]]`, the value or a list's member, keeps its title as written, so a connection names the page its author typed. */
 function valuesOf(doc: Document): Record<string, unknown> {
   try {
     const parsed: unknown = doc.toJSON()
-    return isPlainObject(parsed) ? parsed : {}
+    if (!isPlainObject(parsed)) return {}
+    for (const { key, value } of isMap(doc.contents) ? doc.contents.items : []) {
+      const written = linkAsWritten(value)
+      if (written) parsed[String(key)] = written
+      else if (isSeq(value))
+        value.items.forEach((member, i) => {
+          const link = linkAsWritten(member)
+          if (link) (parsed[String(key)] as unknown[])[i] = link
+        })
+    }
+    return parsed

@@ above mergeInto @@

+/** Whether yaml quotes `value` unasked, as it does a numeral's `"2024"`, a `'"Q3"'`, or a `[[Page]]`. */
+const quotesUnasked = (value: unknown): boolean => /^["']/.test(yamlInline(value))
+
+/** `value` as a node spelled as the `held` spellings of its key are, the first the one it lands on: a list keeps that one's flow or block style unless it's a whole unquoted `[[x]]`, whose brackets spell a link rather than a style, and a list nested in it, or a whole `[[x]]`, is written flow; each single-line string, the value itself or a list's member, keeps the quotes of the held string equal to it, else takes those of the first held string quoted where yaml wouldn't, and a string yaml quotes unasked, where the file chose none, those of the first quoted held string; anything else is spelled as yaml spells it. */
+function nodeSpelledAs(doc: Document, value: unknown, held: unknown[]): Node {
+  const node = doc.createNode(value)
+  const [lands] = held
+  const heldScalars = held.flatMap((h) => (isSeq(h) ? h.items : [h])).filter(isScalar)
+  const quoted = heldScalars.filter((n) => n.type === 'QUOTE_DOUBLE' || n.type === 'QUOTE_SINGLE')
+  const chosen = quoted.find((n) => !quotesUnasked(n.value))
+  const flowHeld = isSeq(lands) && lands.flow && !wholeLinkTitle(lands)
+  if (isSeq(node) && (flowHeld || wholeLinkTitle(node))) node.flow = true
+  for (const member of isSeq(node) ? node.items : [node]) {
+    if (isSeq(member)) member.flow = true
+    else if (isScalar(member) && typeof member.value === 'string' && !member.value.includes('\n'))
+      member.type = (
+        heldScalars.find((n) => n.value === member.value) ??
+        chosen ??
+        (quotesUnasked(member.value) ? quoted[0] : undefined)
+      )?.type
+  }
+  return node
+}

@@ mergeInto @@

     const held = valuesOf(doc)
-    for (const key of modeledKeys) {
-      if (!written(key)) {
-        if (doc.has(key)) doc.delete(key)
-      } else if (JSON.stringify(held[key]) !== JSON.stringify(modeled[key]))
-        // A fresh node, so a changed value takes the spelling yaml gives it rather than the old node's quoting or block style.
-        doc.set(key, doc.createNode(modeled[key]))
-    }
+    for (const key of modeledKeys.filter(written)) {
+      if (JSON.stringify(held[key]) === JSON.stringify(modeled[key])) continue
+      const spelled = [key, ...spellings(dropped, key)].map((k) => doc.get(k, true))
+      doc.set(key, nodeSpelledAs(doc, modeled[key], spelled))
+    }
+    for (const key of dropped) doc.delete(key)

@@ renameFrontmatterKey @@

     const value = rival ? joinValues(values[String(rival.key)], moved) : moved
-    if (value !== values[String(pair.key)]) doc.set(String(pair.key), value)
-    for (const p of [...variants, ...(rival ? [rival] : [])]) drop(p)
+    const joined = [...variants, ...(rival ? [rival] : [])]
+    const spelled = [pair, ...joined].map((p) => p.value)
+    if (value !== values[String(pair.key)])
+      doc.set(String(pair.key), nodeSpelledAs(doc, value, spelled))
+    for (const p of joined) drop(p)
```

yaml's own in-place replacement — `doc.set(key, rawValue)` over a scalar keeps that node's style — is what `b80a7b12a` bypassed, and it doesn't fit: it keeps a `|-` block on a one-line value, folds a multi-line value under a plain node into broken lines, and replaces lists wholesale. So the helper builds a fresh node and carries the spelling over: the list's flow or block style, each unchanged member's own quotes, and for a changed string the quotes the file chose. A quote yaml would give that string unasked — the quotes on a numeral string, in either style, or those around a `"` — is no choice, so it stays on its own value and spreads to none yaml would leave bare, while a new value yaml must quote takes the style the file held. The writes delete a dropped spelling only after the written key is spelled, so its members are among the held spellings. The frontmatter read hands a whole link's title over as written where yaml read it as a number or boolean that prints otherwise, patching the parsed values rather than the document a write serializes; a faithful title such as `[[2024]]` stays the number it is, so its unchanged spelling is never re-quoted. A multi-line string keeps yaml's `|-` block. A quoted value replaced by a number, boolean, or list of non-strings lands as yaml spells it. A string YAML can only spell quoted — a changed `[[Page]]`, or `43` over a bare `42` — takes yaml's double quotes. A joined member keeps its own quotes from whichever spelling held it, and the join takes the list style of the spelling it lands on. Escaping round-trips under both styles, and yaml falls back to double quotes where single can't hold the content (checked against yaml 2.9.0 across every writer: governed writes, the page and heading rename cascades, every sweep, undo, the Trash restore, asset migration, and ID stamping). An unquoted `[[a.png]]` parses as a nested list, so without the flow spelling a changed list would write a kept member `- - - a.png`, and a whole value kept into a fresh key (a property refill) `- - a.png`.

```Core/Properties/propertyValue.ts diff
@@ imports @@

+import { namesValue } from './pageValue'

@@ writtenSpelling @@

-/** `next` spelled as `raw` already spells it: … and each member takes the one member of `raw` its title folds to. … */
+/** `next` spelled as `raw` already spells it: …, a one-member list keeps a whole unquoted wikilink `raw` that spells its member, and each member takes the one member of `raw` whose title folds to its own — a scalar of any shape, or an unquoted wikilink. … */
 …
   if (!Array.isArray(next)) return next
-  const written = listOf(raw).filter((w): w is string => typeof w === 'string')
+  if (next.length === 1 && Array.isArray(raw) && linkEntry(raw, 2) === next[0]) return raw
+  const held = listOf(raw)
   return next.map((v) => {
-    const named = written.filter((w) => normalizeTitle(w) === normalizeTitle(v))
+    const names = namesValue(v)
+    const named = held.filter((w) => names(linkEntry(w, 2) ?? w))
     return named.length === 1 ? named[0] : v
   })

@@ above optionList; the Text decode; writtenSpelling's string arm @@

+/** A held value as text: a string as itself, an unquoted `[[x]]` as the connection it spells, anything else as the yaml that spells it. */
+const asText = (raw: unknown): string => linkEntry(raw, 2) ?? yamlInline(raw)
 …
-    // Free text reads whatever the file holds: a string as itself, any other shape as the yaml that spells it.
     case 'text':
-      if (isBlankRaw(raw)) return NULL_VALUE
-      return { kind, value: typeof raw === 'string' ? raw : yamlInline(raw) }
+      return isBlankRaw(raw) ? NULL_VALUE : { kind, value: asText(raw) }
 …
-    return raw != null && typeof raw !== 'string' && yamlInline(raw) === next ? raw : next
+    return raw != null && typeof raw !== 'string' && asText(raw) === next ? raw : next
```

`…` stands for the doc comment's unchanged text. `linkEntry` is already imported; at nesting 2 it reads a member spelling a wikilink, so a whole-key `Cover: [[a.png]]`, whose one-deep inner list spells a link only as the whole value, isn't kept as a member (written `- [a.png]`, no wikilink to another reader), and the one-member keep returns that whole value as written, the list arm's twin of the string arm's. `pageValue.ts` imports `propertyValue.ts` nowhere, so the new edge makes no cycle.

```Core/Files/pageFile.test.ts diff
@@ replaces "a changed value takes a fresh spelling…" @@

-  it('a changed value takes a fresh spelling: a quoted or block scalar does not hold the new value to its old style', () => {
-    expect(
-      mergeFrontmatter(
-        '---\nN: "42"\nB: |-\n  old\n  l2\n---\nBody',
-        { N: 'hello', B: 'x' },
-        ['N', 'B'],
-        'Body',
-      ),
-    ).toBe('---\nN: hello\nB: x\n---\nBody')
-    expect(mergeFrontmatter('---\nN: plain\n---\nBody', { N: 'a\nb' }, ['N'], 'Body')).toBe(
-      '---\nN: |-\n  a\n  b\n---\nBody',
-    )
-  })
+  it('a changed list keeps its flow or block style and a kept wikilink, whole or a member, its flow spelling, while a whole wikilink that grows is a block list', () => {
+    expect(
+      mergeFrontmatter(
+        `---\nL: [a]\nF:\n  - [[a.png]]\nG: [[a.png]]\n---\nBody`,
+        { L: ['a', 'b'], F: [[['a.png']], '[[b.png]]'], G: ['[[a.png]]', '[[c.png]]'], R: [['Page']] },
+        ['L', 'F', 'G', 'R'],
+        'Body',
+      ),
+    ).toBe(
+      `---\nL: [a, b]\nF:\n  - [[a.png]]\n  - "[[b.png]]"\nG:\n  - "[[a.png]]"\n  - "[[c.png]]"\nR: [[Page]]\n---\nBody`,
+    )
+  })
+
+  it('a changed string keeps the quotes the file held for it, else takes the quotes the file chose, never ones yaml needed, and a string yaml quotes unasked takes the chosen style, else the held one', () => {
+    expect(
+      mergeFrontmatter(
+        `---\nN: "42"\nS: 'x'\nL: ["a", b]\nY:\n  - '2024'\nZ: ["2024", 'a']\n---\nBody`,
+        { N: 'hello', S: 'y', L: ['a', 'b', 'c'], Y: ['2024', 'x', '2025'], Z: ['2024', 'a', '2025'] },
+        ['N', 'S', 'L', 'Y', 'Z'],
+        'Body',
+      ),
+    ).toBe(
+      `---\nN: hello\nS: 'y'\nL: ["a", b, "c"]\nY:\n  - '2024'\n  - x\n  - '2025'\nZ: ["2024", 'a', '2025']\n---\nBody`,
+    )
+  })
+
+  it('a changed block or multi-line value is spelled as yaml spells it', () => {
+    expect(
+      mergeFrontmatter(`---\nB: |-\n  old\n  l2\nM: "x"\n---\nBody`, { B: 'x', M: 'a\nb' }, ['B', 'M'], 'Body'),
+    ).toBe(`---\nB: x\nM: |-\n  a\n  b\n---\nBody`)
+  })

@@ renameFrontmatterKey — every spelling of the old name: "joins the old spellings…", extended @@

-  it('joins the old spellings at the first one’s line with `join`', () => {
+  it('joins the old spellings at the first one’s line with `join`, each member keeping its own quotes', () => {
     const out = renameFrontmatterKey(
-      page('a: 1\nTags: [b]\ntags: [a, B]\nz: 2'),
+      page('a: 1\nTags: ["b"]\ntags: [a, B]\nz: 2'),
 …
     expect(held(out)).toEqual([
       ['a', 1],
       ['Labels', ['b', 'a']],
       ['z', 2],
     ])
+    expect(out).toContain('Labels: ["b", a]')

@@ mergeFrontmatter — a key moved to another spelling keeps its place: "takes the first dropped spelling’s place…", extended @@

-  it('takes the first dropped spelling’s place when two are dropped', () => {
+  it('takes the first dropped spelling’s place when two are dropped, each member keeping its own quotes', () => {
     expect(
       mergeFrontmatter(
-        '---\na: 1\ntags:\n  - x\nb: 2\nTAGS:\n  - y\n---\nbody',
+        '---\na: 1\ntags:\n  - x\nb: 2\nTAGS:\n  - "y"\n---\nbody',
 …
-    ).toBe('---\na: 1\nTags:\n  - x\n  - y\nb: 2\n---\nbody')
+    ).toBe('---\na: 1\nTags:\n  - x\n  - "y"\nb: 2\n---\nbody')
```

```Core/Connections/linkValue.ts diff
@@ imports @@

 import { isHttpLink, isValidLink, linkDomain, normalizeLinkUrl } from '../Paths/urlPath'
+import { isScalar } from '../Contract/validators'

@@ linkEntry @@

~/** … unwrapping single-element arrays reads the connection the author spelled, a title yaml reads as a number or boolean included, so a hand-edit never nulls the value. … */
 …
-  return typeof inner === 'string' && depth >= nesting ? `[[${inner}]]` : null
+  return isScalar(inner) && depth >= nesting ? `[[${inner}]]` : null
```

An unquoted `[[2024]]` is a list of one list of the number 2024 to yaml, so a string-only unwrap read it as no value where `"[[2024]]"` read as the link; reading any scalar title, which the frontmatter read hands over as written, makes Link and File match quoted or bare: `[[2024]]` names the page `2024`, `[[007]]` the page `007`, and `[[1.10]]` the page `1.10`, each following its renames from either spelling. A Text value reads an unquoted connection through the same unwrap, so `[[007]]` shows as written and an unchanged one keeps its bytes.

```Core/Properties/propertyValue.test.ts diff
@@ decodeValue: "reads each declared type from its own bare shape" @@

~    // An unquoted `[[Page]]` is a nested one-element list to yaml, and reads as the link it spells, whatever scalar yaml reads its title as.
     expect(decodeValue(def({ type: 'link' }), [['Page']])).toEqual({
       kind: 'link',
       value: '[[Page]]',
     })
+    expect(decodeValue(def({ type: 'link' }), [[2024]])).toEqual({
+      kind: 'link',
+      value: '[[2024]]',
+    })

@@ decodeValue: "free text reads a string as itself, an unquoted wikilink as the connection it spells, and any other shape as the yaml that spells it" @@

     expect(decodeValue(text, [['Page']])).toEqual({ kind: 'text', value: '[[Page]]' })
+    expect(decodeValue(text, [['007']])).toEqual({ kind: 'text', value: '[[007]]' })

@@ writtenSpelling: "a string keeps a number, a list, and an unquoted wikilink…" @@

     expect(writtenSpelling('[[Page]]', [['Page']])).toEqual([['Page']])
+    expect(writtenSpelling('[[007]]', [['007']])).toEqual([['007']])
```

```Core/Files/pageFile.test.ts diff
@@ above "mergeFrontmatter — an empty or absent block" @@

+describe('splitFrontmatter', () => {
+  it('reads a whole unquoted wikilink’s title as written where yaml read it as a number or boolean that prints otherwise', () => {
+    expect(
+      splitFrontmatter('---\nA: [[007]]\nB:\n  - [[1.10]]\n  - [[2024]]\nC: [[True]]\nD: 007\n---\nBody'),
+    ).toEqual({ A: [['007']], B: [[['1.10']], [[2024]]], C: [['True']], D: 7 })
+  })
+})
```

```Core/Properties/repairSweep.test.ts diff
@@ "joins a re-read page’s two spellings of a list under the registered one, on the first’s line" @@

-    expect(out.split('\n')[line]).toBe('Tags:')
+    expect(out.split('\n')[line]).toBe('Tags: [alpha, beta]')
```

A join lands in the style of the spelling it takes the place of, here the first's flow `[alpha]`.

```Core/Properties/propertyValue.test.ts diff
@@ writtenSpelling @@

-  it('takes only string members', () => {
-    expect(writtenSpelling(['2024'], [2024])).toEqual(['2024'])
+  it('a member keeps the held member that names it, of any scalar shape or as an unquoted wikilink, and a whole unquoted wikilink stays whole', () => {
+    expect(writtenSpelling(['2024'], [2024])).toEqual([2024])
+    expect(writtenSpelling(['[[A.png]]'], [[['a.png']]])).toEqual([[['a.png']]])
+    expect(writtenSpelling(['[[a.png]]'], [['a.png']])).toEqual([['a.png']])
+    expect(writtenSpelling(['[[a.png]]', '[[b.png]]'], [['a.png']])).toEqual(['[[a.png]]', '[[b.png]]'])
   })
```

```Core/Contexts/contextResolve.test.ts diff
@@ reconcileGovernedRoot @@

-  it('repairs scalar-typed values to their canonical string titles', () => {
+  it('keeps a scalar-typed member as the file spells it', () => {
     const { root } = reconcileGovernedRoot({ '<Classes>': [2024, true] }, world)
-    expect(root['<Classes>']).toEqual(['2024', 'true'])
+    expect(root['<Classes>']).toEqual([2024, true])
   })
```

```Core/Trash/restoreScrub.test.ts diff
@@ "a value an outside write left as a number still names its Space" @@

-    expect((await fm('Notes/Alpha.md'))['<Projects>']).toEqual(['2024'])
+    expect((await fm('Notes/Alpha.md'))['<Projects>']).toEqual([2024])
```

**VERIFY**

- [x] With the tests alone, `npx vitest run Core/Files/pageFile.test.ts Core/Properties/propertyValue.test.ts Core/Contexts/contextResolve.test.ts Core/Trash/restoreScrub.test.ts` fails on the quote and flow cases, the rename's quotes, the member cases, and the two scalar-member flips; green after.
- [x] `grep -n "doc.createNode\|doc.set(" Core/Files/pageFile.ts` → only `nodeSpelledAs`'s `createNode` and the two writes through it.
- [x] Run the gates.

#### Review Checkpoint

- [x] Phase 2 reviewed (simplification and correctness, Opus at high effort) against *§Constraints*, its Reuse bullet first: every frontmatter writer reaches `nodeSpelledAs`; the display surfaces read parsed values, so no quote mark reaches a cell, chip, picker, option, panel, card, Matrix label, filter, or link title; every finding closed.

---

### Phase 3 — Number Reading And Spelling

**GOAL:** A Number reads a quoted or formatted number held in a file or typed in a field, and a write keeps the spelling the file uses. Decode and spelling are one commit (*§Constraints › Shape*); the popover's consolidation is its own task because it touches a component, not the codec.

#### Task 3-1

**TASK:** Add `readNumber`, `spelledNumber`, and the shared `currencySymbol` to `formatValue.ts`, and hoist `webGuests.ts`'s regex escape into UIX `escapeRegExp`; `decodeValue`, `writtenSpelling`, `parseEditorValue`, and the Number filter read the reader.

**NOW:** `decodeValue` reads `typeof raw === 'number'` alone (`propertyValue.ts:67-68`); `writtenSpelling` returns a number `next` as is; `parseEditorValue` (`:36-39`) and `evaluateNumber` (`filter.ts:169`) read typed text through UIX `numberFrom`, which takes `Number(text)` when finite. `formatValue.ts` holds `readDate` (`:88-97`, "the one reading of a stored date"), the memoized en-US `numFmt` (`:21`), and `numberFormatGlyph` (`:233-243`), which extracts a currency's narrow symbol through `formatToParts`. A cell shows a currency with the default `'symbol'` display (`formatScalar`, `:197`): `$ € £ A$ CA$ ¥` for `CURRENCY_CODES`, where narrow collapses AUD and CAD to `$`. `formatValue.ts` joining the host graph adds no external; its UIX imports `numberUnit` and `pad` are already on `engineGraph.test.ts`'s exact leaf list, and the new `escapeRegExp` joins it. Core and UIX hold no regex escape; `Desktop/Web/webGuests.ts:22` hand-writes one for the app-name match, and already imports `@pommora/uix`.

**CHANGE**

- [x] Write the tests below; watch them fail.
- [x] The source changes.
- [x] Commit with Task 3-2.

**AFTER**

```Core/Properties/formatValue.ts diff
@@ imports @@

-import { DEFAULT_CURRENCY, type NumberConfig } from './properties'
+import { CURRENCY_CODES, DEFAULT_CURRENCY, type NumberConfig } from './properties'
 import { pad } from '@pommora/uix/Utilities/pad'
+import { numberFrom } from '@pommora/uix/Utilities/numberUnit'
+import { escapeRegExp } from '@pommora/uix/Utilities/escapeRegExp'

@@ numberFormatGlyph @@

+/** The symbol Intl gives `currency`: by default the one a cell shows (`A$`, `CA$`), or the narrow one the picker leads with. */
+const currencySymbol = (currency: string, currencyDisplay?: 'narrowSymbol'): string =>
+  numFmt({ style: 'currency', currency, currencyDisplay })
+    .formatToParts(0)
+    .find((p) => p.type === 'currency')?.value ?? currency
+
-/** The number picker's leading glyph; a currency shows its narrow symbol, where a cell spells out the ambiguous ones (A$, CA$). */
+/** The number picker's leading glyph. */
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
+const SYMBOL = CURRENCY_CODES.map((c) => escapeRegExp(currencySymbol(c))).join('|')
+const NUMBER_SHAPE = new RegExp(`^([+-]?)((?:${SYMBOL})\\s*)?(.*?)(\\s*(?:%|${SYMBOL}))?$`)
+const GROUPED = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/
+
+interface NumberShape {
+  value: number
+  lead: string
+  tail: string
+  grouped: boolean
+  places: number
+}
+
+/** The number a string spells, the inverse of a cell's own formatting: digits as `numberFrom` reads them, commas only as thousands, and a currency symbol before, or a `%` or a symbol after, never both. */
+function numberShape(raw: unknown): NumberShape | null {
+  if (typeof raw !== 'string') return null
+  const m = NUMBER_SHAPE.exec(raw.trim())
+  if (!m || (m[2] && m[4])) return null
+  const [, sign, lead = '', body, tail = ''] = m
+  const grouped = GROUPED.test(body)
+  const value = numberFrom(sign + (grouped ? body.replaceAll(',', '') : body))
+  const places = /\.(\d+)$/.exec(body)?.[1].length ?? 0
+  return value === undefined ? null : { value, lead, tail, grouped, places }
+}
+
+/** The one reading of a stored or typed number: a YAML number as itself, or a string that spells one. */
+export const readNumber = (raw: unknown): number | undefined =>
+  typeof raw === 'number' ? raw : numberShape(raw)?.value
+
+/** `next` as `raw` spells a number: an unchanged value keeps `raw` as written, and over anything but a string spelling a number it lands bare. */
+export function spelledNumber(next: number, raw: unknown): unknown {
+  const shape = numberShape(raw)
+  if (!shape) return next
+  if (shape.value === next) return raw
+  // A changed value keeps the file's currency symbol, percent sign, grouping, and decimal places; its digits are the typed value's.
+  const digits = numFmt({
+    minimumFractionDigits: Math.min(shape.places, 20),
+    maximumFractionDigits: 20,
+    useGrouping: shape.grouped,
+  }).format(Math.abs(next))
+  const spelled = `${next < 0 ? '-' : ''}${shape.lead}${digits}${shape.tail}`
+  return readNumber(spelled) === next ? spelled : next
+}
```

`SYMBOL` is built after `currencySymbol` and `numFmt` in file order. A held quoted number keeps its quotes through Phase 2's `nodeSpelledAs`; over a plain held value, a numeral string such as `31` is still quoted by yaml, since unquoted it would read as a number, while `$1,300`, `45%`, `31 €`, `-$40`, and `1,234,567` emit plain. Grouping follows what the held text shows, so `$999` → 1500 lands `$1500`. The closing read-back lands bare a value the spelling can't carry — `1e-25` formats to `0` at twenty fraction digits.

```UIX/Utilities/escapeRegExp.ts diff
+/** `text` with every RegExp syntax character escaped, so a pattern built from it matches only itself. */
+export const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
```

```Desktop/Web/webGuests.ts diff
@@ imports @@

+import { escapeRegExp } from '@pommora/uix/Utilities/escapeRegExp'

@@ cleanedUA @@

-  const name = app.getName().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
+  const name = escapeRegExp(app.getName())
```

```Core/Contract/engineGraph.test.ts diff
@@ reaches exactly the pure UIX leaves @@

       'UIX/Utilities/clamp.ts',
+      'UIX/Utilities/escapeRegExp.ts',
       'UIX/Utilities/moveItem.ts',
```

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
+    expect(readNumber('+$5')).toBe(5)
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
+  it('a changed value keeps the string shape, symbol, percent sign, spacing, grouping, and decimal places, its digits typed', () => {
+    expect(spelledNumber(1300, '$1,200.00')).toBe('$1,300.00')
+    expect(spelledNumber(45.125, '30.50%')).toBe('45.125%')
+    expect(spelledNumber(2, '1.000000000000000000001')).toBe('2.00000000000000000000')
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
+    expect(spelledNumber(1e-25, '$30')).toBe(1e-25)
+  })
+})
```

The grammar is pinned here alone; the consumers below pin only their wiring — decode and the unchanged spelling through the crossing test, a changed spelling through the governed write, the field, and a filter operand.

```Core/Properties/governedWrite.test.ts diff
@@ setGovernedRootKey — spellings: fixtures @@

   const done: PropertyDefinition = { id: 'prop_done', name: 'Done', type: 'checkbox' }
+  const price: PropertyDefinition = { id: 'prop_price', name: 'Price', type: 'number' }
 …
-    defs: byFoldedName([tags, done, status]),
+    defs: byFoldedName([tags, done, status, price]),

@@ setGovernedRootKey — spellings, after the checked-box test @@

+  it('a number lands in the spelling the file holds: quoted stays quoted, formatted stays formatted', async () => {
+    await seeded(`Price: '30'`)
+    await setGovernedRootKey(page, 'Price', 31, world)
+    expect(await lines()).toContain(`Price: '31'`)
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
+  const spelled: GovernedWorld = { ...world, defs: byFoldedName([stageDef, doneDef, priceDef]) }
+  const input = { Stage: ['done'], Done: 'Yes', Price: '$1,200.00' }

   it('keeps each value as the file spells it, reading it as registered', () => {
-    const { root } = reconcileGovernedRoot(input, casing)
+    const { root } = reconcileGovernedRoot(input, spelled)
     expect(root).toEqual(input)
     expect(decodeValue(stageDef, root.Stage)).toEqual({ kind: 'select', value: 'Done' })
     expect(decodeValue(doneDef, root.Done)).toEqual({ kind: 'checkbox', value: true })
+    expect(decodeValue(priceDef, root.Price)).toEqual({ kind: 'number', value: 1200 })
   })
+
 @@ "writes a Multi-Select holding two casings of one option as that option once" @@

-    const held = { ...casing, defs: byFoldedName([labels]) }
+    const held = { ...spelled, defs: byFoldedName([labels]) }
```

```Core/Views/Cards/cardValueInput.test.ts diff
@@ parseEditorValue @@

     expect(parseEditorValue('number', '  3.5 ')).toEqual({ kind: 'number', value: 3.5 })
+    expect(parseEditorValue('number', '$1,200')).toEqual({ kind: 'number', value: 1200 })
```

```Core/Views/Pipeline/filter.test.ts diff
@@ applyFilter — per type: the number test, extended @@

     expect(
       ids(rows, { match: 'all', rules: [{ property_id: 'prop_num', op: 'is_empty' }] }),
     ).toEqual(['c'])
+    expect(
+      ids(rows, { match: 'all', rules: [{ property_id: 'prop_num', op: 'greater_than', value: '$3' }] }),
+    ).toEqual(['a'])
```

**VERIFY**

- [x] With the tests alone, `npx vitest run Core/Properties Core/Contexts/contextResolve.test.ts Core/Views` fails on the new number cases: each `readNumber` and `spelledNumber` test with `readNumber is not a function`, and each consumer's wiring case.
- [x] Green after, `formatValue.test.ts`'s existing `numberFormatGlyph` test (`['$','€','£','$','$','¥']`) still passes through `currencySymbol`.
- [x] `grep -rn "numberFrom" Core --include='*.ts' --include='*.tsx' | grep -v test` → `formatValue.ts` and `Schema/NumberEditor.tsx` only; `grep -rnF '$&' Core Desktop UIX --include='*.ts' --include='*.tsx' | grep -v test` → `escapeRegExp.ts` and `Core/Connections/links.ts` (a link label's own `\` and `]` escape, not RegExp text).

#### Task 3-2

**TASK:** Delete `NumberValuePicker`; the Number popover becomes `PropertyValueInput`'s shared `TextPicker`, carrying the format glyph and the fraction suffix.

**NOW:** `PropertyValueInput.tsx:43-52` returns `NumberValuePicker` for a Number popover, its only caller. `NumberValuePicker.tsx` renders a `TextPicker` with `leading={numberFormatGlyph(def)}` and a `/ {denominator}` trailing, and commits `parseEditorValue('number', raw)` on every dismiss — over a value it shows blank, dismissing commits `null` and deletes the key. `PropertyValueInput.tsx:80-90` renders the same `TextPicker` for every other popover, with `value={initial}`, `invalid` dimming, and `commit`'s unchanged-text guard (`:74-78`), the design commit `f78e6e572` set ("the three value surfaces edit through one PropertyValueInput, which closes without committing unchanged text"). `TextPicker` already takes `leading` and `trailing`. The shared path closes before it commits, an order its link and other popovers already run through the same callers (`CardsView.tsx` `commitPicked`, `ValuePickPresenter.tsx`).

**CHANGE**

- [x] Write the test and watch it fail.
- [x] `git rm Core/Properties/Pickers/NumberValuePicker.tsx`; the `PropertyValueInput` changes.
- [x] Commit Phase 3: `git add UIX/Utilities/escapeRegExp.ts && git commit --only -m "…" -- UIX/Utilities/escapeRegExp.ts Desktop/Web/webGuests.ts Core/Contract/engineGraph.test.ts Core/Properties/formatValue.ts Core/Properties/formatValue.test.ts Core/Properties/propertyValue.ts Core/Properties/parseEditorValue.ts Core/Properties/governedWrite.test.ts Core/Contexts/contextResolve.test.ts Core/Views/Cards/cardValueInput.test.ts Core/Views/Pipeline/filter.ts Core/Views/Pipeline/filter.test.ts Core/Properties/Pickers/NumberValuePicker.tsx Core/Properties/Pickers/PropertyValueInput.tsx Core/Properties/Pickers/PropertyValueInput.test.tsx`.

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
-  if (popover)
+  if (popover) {
+    const number = def.type === 'number'
+    const denominator = number ? fractionDenominator(def) : undefined
     return (
       <TextPicker
         {...popover}
         value={initial}
         accent={accent}
+        leading={number ? numberFormatGlyph(def) : undefined}
+        trailing={denominator === undefined ? undefined : `/ ${denominator}`}
         invalid={invalid}
         onCommit={commit}
         onDismiss={onClose}
       />
     )
+  }
```

```Core/Properties/Pickers/PropertyValueInput.test.tsx diff
@@ the popover routes, after "opens TextPane for a Text value…" @@

+  it('a Number popover commits nothing when its text is unchanged', () => {
+    const blank = popoverFor('number').querySelector('input')!
+    act(() => {
+      blank.focus()
+      blank.blur()
+    })
+    expect(onCommit).not.toHaveBeenCalled()
+  })
```

**VERIFY**

- [x] With the test alone, it fails on `onCommit` called with `null` (the deletion); green after.
- [x] `grep -rn "NumberValuePicker" Core` → none.
- [x] Run the gates.

#### Task 3-3

**TASK:** One `contextTitles` reads what a Context value names, its scalar members only, for Context resolution, the live reconcile, and the index's Space relations; one `memberKey` matches a non-scalar member only by itself wherever members dedupe, match, or count — `joinValues`, `namesValue`, and the reconcile's no-shrink `memberCount`; one `scalarMembers` reads a value's scalar members for `optionList`, `contextTitles`, and a Context unlink; and the index generation moves to 13, since the Space rows it records change.

**NOW:** Three loops fold a Context value's members through `normalizeTitle`, which reads any value through `String()`: `resolveContextKeys` (`contextResolve.ts:79-82`), `reconcileGovernedRoot`'s Context arm (`:136-139`), and `spaceRelations` (`indexSeed.ts:75-79`). So an unquoted `- [[Personal]]`, a nested list, resolves to the Space "Personal" and `- [[a, b]]` to one titled "a,b", while a quoted `- "[[Personal]]"` resolves nothing; the reconcile then rewrites the unquoted one to `- Personal`. `memberCount` (`:110`) and `joinValues` (`heldKeys.ts:51-54`) fold the same way, so the no-shrink rule takes a nested member beside its own title for that title, and joining two spellings of a key (`<Projects>: ["pommora"]` beside `<projects>: [[Pommora]]`) drops the wikilink member before any reader sees it — through every spelling join, a `'merge'` rename, and the Trash re-apply. Every option list already reads scalars only (`optionList`, `namesValue`), and `unlinkContextKey` (`contextCascade.ts:141-144`) spells the same reading a third way; ContextsPM matches a value through "scalar drift". CorePM: "the index carries its own generation, so a change to what it records drops the index alone" (`INDEX_GENERATION`, `Desktop/Store/ddl.ts:3`, at 12).

**CHANGE**

- [x] Write the tests below and watch them fail.
- [x] The source changes.
- [x] Commit: `git commit --only -m "…" -- Core/Contract/validators.ts Core/Contexts/contexts.ts Core/Contexts/contextResolve.ts Core/Contexts/contextResolve.test.ts Core/Contexts/contextCascade.ts Core/Files/heldKeys.ts Core/Files/heldKeys.test.ts Core/Properties/pageValue.ts Core/Properties/propertyValue.ts Core/Index/indexSeed.ts Core/Index/indexSeed.test.ts Desktop/Store/ddl.ts Desktop/Store/open.test.ts`.

**AFTER**

```Core/Contract/validators.ts diff
@@ below isScalar @@

+export const scalarMembers = (raw: unknown): string[] => listOf(raw).filter(isScalar).map(String)
```

```Core/Contexts/contexts.ts diff
@@ imports @@

 import { holdsName } from '../Paths/names'
+import { scalarMembers } from '../Contract/validators'
+import { normalizeTitle } from '../Paths/caseFold'

@@ below parseContextKey @@

+/** The folded titles a Context value names: each scalar member's, a lone scalar read as a list of one. A member of any other shape names nothing. */
+export const contextTitles = (raw: unknown): string[] =>
+  scalarMembers(raw).map(normalizeTitle).filter(Boolean)
```

```Core/Properties/propertyValue.ts diff
@@ imports @@

-import { isScalar, listOf } from '../Contract/validators'
+import { listOf, scalarMembers } from '../Contract/validators'

@@ optionList @@

 const optionList = (raw: unknown): string[] =>
-  listOf(raw)
-    .filter(isScalar)
-    .map(String)
-    .filter((x) => normalizeTitle(x) !== '')
+  scalarMembers(raw).filter((x) => normalizeTitle(x) !== '')
```

```Core/Contexts/contextCascade.ts diff
@@ imports @@

-import { isScalar, listOf } from '../Contract/validators'
+import { scalarMembers } from '../Contract/validators'

@@ unlinkContextKey @@

-    const values = keys
-      .flatMap((k) => listOf(raw[k]))
-      .filter(isScalar)
-      .map(String)
+    const values = keys.flatMap((k) => scalarMembers(raw[k]))
```

```Core/Properties/pageValue.ts diff
@@ imports @@

-import { isScalar } from '../Contract/validators'
-import { editHeldList } from '../Files/heldKeys'
+import { editHeldList, memberKey } from '../Files/heldKeys'

@@ namesValue @@

-  return (el) => isScalar(el) && normalizeTitle(el) === want
+  return (el) => memberKey(el) === want
```

```Core/Contexts/contextResolve.ts diff
@@ imports @@

-import { contextKey, parseContextKey } from './contexts'
+import { contextKey, contextTitles, parseContextKey } from './contexts'
-import { heldKey, heldValue, writeTarget } from '../Files/heldKeys'
+import { heldKey, heldValue, memberKey, writeTarget } from '../Files/heldKeys'

@@ resolveContextKeys @@

-    const ids: string[] = []
-    for (const value of listOf(heldValue(root, name, true) ?? [])) {
-      const match = byTitle?.get(normalizeTitle(value))
-      if (match) ids.push(match.id)
-    }
+    const ids = contextTitles(heldValue(root, name, true)).flatMap(
+      (title) => byTitle?.get(title)?.id ?? [],
+    )

@@ memberCount @@

-const memberCount = (v: unknown): number => new Set(listOf(v).map(normalizeTitle)).size
+const memberCount = (v: unknown): number => new Set(listOf(v).map(memberKey)).size

@@ reconcileGovernedRoot — the Context arm @@

-      const titles = listOf(held ?? []).flatMap((value) => {
-        const space = byTitle?.get(normalizeTitle(value))
-        return space ? [space.title] : []
-      })
+      const titles = contextTitles(held).flatMap((title) => byTitle?.get(title)?.title ?? [])
```

```Core/Index/indexSeed.ts diff
@@ imports @@

-import { listOf } from '../Contract/validators'
-import { parseContextKey } from '../Contexts/contexts'
+import { contextTitles, parseContextKey } from '../Contexts/contexts'

@@ spaceRelations @@

-    if (parseContextKey(key) === null || raw == null) continue
+    if (parseContextKey(key) === null) continue
-    const titles = new Set<string>()
-    for (const value of listOf(raw)) {
-      const title = normalizeTitle(value)
-      if (title) titles.add(title)
-    }
-    for (const target of titles) yield { target, qualifier: foldKey(key) }
+    for (const target of new Set(contextTitles(raw))) yield { target, qualifier: foldKey(key) }
```

```Core/Files/heldKeys.ts diff
@@ imports @@

-import { listOf } from '../Contract/validators'
+import { isScalar, listOf } from '../Contract/validators'

@@ joinValues @@

-/** Two values as one list: `keep`'s members, then each of `from`'s whose title folds to none of them; a single value reads as a list of one. … */
+/** What a member matches by: a scalar's folded title, or the member itself. */
+export const memberKey = (v: unknown): unknown => (isScalar(v) ? normalizeTitle(v) : v)
+
+/** Two values as one list: `keep`'s members, then each of `from`'s that matches none of them by `memberKey`; a single value reads as a list of one. … */
 export function joinValues(keep: unknown, from: unknown): unknown[] {
   const kept = listOf(keep ?? [])
-  const seen = new Set(kept.map(normalizeTitle))
-  return [...kept, ...listOf(from ?? []).filter((v) => !seen.has(normalizeTitle(v)))]
+  const seen = new Set(kept.map(memberKey))
+  return [...kept, ...listOf(from ?? []).filter((v) => !seen.has(memberKey(v)))]
 }
```

A lone `- [[Personal]]` now names nothing, so the live reconcile leaves it as written; beside other members, or joined from another spelling, `memberKey` keeps it as its own unresolved member and the no-shrink rule keeps the whole value. `spaceRelations`' `raw == null` guard goes, since `contextTitles` reads nothing from a null value. `memberKey` lives beside `joinValues` in Files, so neither layer imports Properties, and folds scalars only: member identity for joins and counts stays scalar-folded, so a File list holding a repeated attachment, a designed case its chips reorder one by one, is never shrunk or re-spelled by the live reconcile, while `writtenSpelling` reads through a wikilink's quoting because its job is pairing a typed value with the spelling the file holds. `scalarMembers` lives beside `listOf` and `isScalar`, which all three readers already import.

```Desktop/Store/ddl.ts diff
-export const INDEX_GENERATION = 12
+export const INDEX_GENERATION = 13
```

```Desktop/Store/open.test.ts diff
@@ "a generation-11 index drops its key-only headings table…" @@

-    expect(INDEX_GENERATION).toBe(12)
 …
-    expect(readMeta(second, 'index_generation')).toBe('12')
+    expect(readMeta(second, 'index_generation')).toBe(String(INDEX_GENERATION))
```

A Nexus indexed before holds Space rows for nested members, which the mtime-gated reseed would keep until each page is edited; the generation drops the index once instead. The same generation covers Task 2-1's as-written link titles, since this range is unreleased and no index built inside it holds an unquoted wikilink whose title yaml reads as a number.

```Core/Contexts/contextResolve.test.ts diff
@@ "matches values through coercion + NFC…", extended @@

-  it('matches values through coercion + NFC (scalars, case, whitespace)', () => {
+  it('matches values through coercion + NFC (scalars, case, whitespace), and only a scalar names a Space', () => {
 …
+    expect(resolveContextKeys({ '<Projects>': [[['Pommora']]] }, contexts).has('ctx_projects')).toBe(false)

@@ "a live reconcile leaves a list naming an unknown Space as written", extended @@

-  it('a live reconcile leaves a list naming an unknown Space as written', () => {
+  it('a live reconcile leaves a list naming an unknown Space, or holding a wikilink, as written', () => {
 …
+    const linked = { '<Projects>': ['pommora', [['Pommora']]] }
+    expect(reconcileGovernedRoot(linked, world).root).toEqual(linked)
```

```Core/Files/heldKeys.test.ts diff
@@ joinValues, extended @@

-  it('keeps the first value and adds each member of the second whose title folds to none of it', () => {
+  it('keeps the first value and adds each member of the second that matches none of it: a scalar by its folded title, any other member only by itself', () => {
     expect(joinValues(['b'], ['a', 'B'])).toEqual(['b', 'a'])
+    expect(joinValues(['Pommora'], [[['Pommora']]])).toEqual(['Pommora', [['Pommora']]])
```

```Core/Index/indexSeed.test.ts diff
@@ "records every `<Title>` key as a space row…", extended @@

-  it('records every `<Title>` key as a space row, one normalized row per value, scalar or list', async () => {
+  it('records every `<Title>` key as a space row, one normalized row per value, scalar or list; a member of any other shape names nothing', async () => {
-      `---\nID: ${ULID_A}\n<Projects>:\n  - Pommora\n  - pommora\n<Areas>: 2024\n---\n\nbody\n`,
+      `---\nID: ${ULID_A}\n<Projects>:\n  - Pommora\n  - pommora\n<Areas>: 2024\n<Topics>:\n  - [[Pommora]]\n---\n\nbody\n`,
 …
+    expect(queryMembers('<Topics>', 'pommora')).toEqual([])
```

**VERIFY**

- [x] With the tests alone, the four extended tests fail; green after.
- [x] `grep -rn "normalizeTitle(value)" Core/Contexts Core/Index` → none.
- [x] Run the gates.

#### Review Checkpoint

- [x] Phase 3 reviewed (simplification and correctness, Opus at high effort) against *§Constraints*, its Reuse bullet first, and the settled decisions; every finding closed.
- [x] No live path rewrites an unchanged quoted or formatted number: the crossing test passes, and `runRepairSweep` reaches values only through `reconcileGovernedRoot`.

---

### Phase 4 — Documentation

**GOAL:** PropertiesPM states the reading rule once, naming Multi-Select, Text, Number, and Checkbox together, makes the write rule one of its primary rules, and drops the claims the change makes false.

#### Task 4-1

**TASK:** Surgical edits to PropertiesPM: the catalog's opening sentence, the Text and Checkbox table rows, the decode paragraph, the Number paragraph's opener, the Checkbox paragraph's toggle clause, and the Text paragraph's on-disk sentence, which the decode paragraph's reading rule and the write rule now state once; and ContextsPM's matching sentence names Spaces as quote-insensitive.

**NOW:** Line 8 reads "the on-disk value is bare and natively typed"; line 12 "A free-typed string, plain and unquoted wherever YAML allows"; line 14 reads "`true`, or the key absent; `true` and `yes` in any casing read as checked"; line 29's checkbox clause "while a checkbox is written as `true` or left absent — `true` and `yes` in any casing read as checked, and any other value, a `false` written by another application included, reads as no value"; line 29 also reads "A key matches a name without regard to case. A write lands on the spelling a file already holds and keeps how each value it holds is spelled, and a file without the key takes the registered spelling."; line 59 "toggling on writes `true` and toggling off strips the key"; line 63 "On disk the value is plain and unquoted wherever YAML allows". The Number row ("Bare number") and the Number paragraph still read true and stay.

**CHANGE**

- [x] The edits, as below.
- [x] Commit: `git commit --only -m "…" -- .claude/Features/PropertiesPM.md .claude/Features/ContextsPM.md`.

**AFTER**

```.claude/Features/PropertiesPM.md diff
@@ The Type Catalog @@

-… the on-disk value is bare and natively typed, legible to any YAML tool. …
+… a value Pommora writes fresh is bare and natively typed, legible to any YAML tool. …

@@ type table @@

-| **Text**          | `Notes: opus`, or `Notes: \|-` over indented lines | A free-typed string, plain and unquoted wherever YAML allows |
+| **Text**          | `Notes: opus`, or `Notes: \|-` over indented lines | A free-typed string |
-| **Checkbox**      | `Done: true` | `true`, or the key absent; `true` and `yes` in any casing read as checked |
+| **Checkbox**      | `Done: true` | `true`, or the key absent |

@@ decode paragraph @@

-… and nothing is inferred from a value's shape. Two rules follow. **No value, no key** — … number `0` is a real value and stays, while a checkbox is written as `true` or left absent — `true` and `yes` in any casing read as checked, and any other value, a `false` written by another application included, reads as no value. **A key …
+… and a type is never inferred from a value's shape. Each type reads what other applications write: a Multi-Select reads members its definition doesn't list, a Text reads any value as text, a Number reads a quoted or formatted number, and a Checkbox reads `true`/`false`, `yes`/`no`, `on`/`off`, and `y`/`n` in any casing. Three rules follow. **No value, no key** — … number `0` is a real value and stays, and unchecking a checkbox removes its key. **A key …

-… A key matches a name without regard to case. A write lands on the spelling a file already holds and keeps how each value it holds is spelled, and a file without the key takes the registered spelling. …
+… Keys and scalar values match without regard to case or quoting. **A write keeps the file's spelling** — it lands on the key spelling the file holds, keeps a list's flow or block style and each unchanged value as written, and gives a changed string the quotes the file chose, never quotes YAML needed only for another value; a file without the key takes the registered spelling. …

@@ Number paragraph @@

-A bare number with a **property-wide format** and a **per-view look**. …
+A number with a **property-wide format** and a **per-view look**. …

@@ Checkbox paragraph @@

-… toggling on writes `true` and toggling off strips the key. …
+… toggling on writes `true`, or the checked word of the pair the file holds, and toggling off strips the key. …

@@ Text paragraph: its on-disk sentence goes, the decode paragraph now stating it for every type @@

-On disk the value is plain and unquoted wherever YAML allows, and a number, list, or map another application wrote under its key reads as its text and stays as written until it is edited.
```

```.claude/Features/ContextsPM.md diff
@@ Validation is registry membership at read @@

-… a value matches through one normalizer (`normalizeTitle`) that folds case, whitespace, composition, and scalar drift …
+… a value matches, quoted or bare, through one normalizer (`normalizeTitle`) that folds case, whitespace, composition, and scalar drift …
```

The rows keep the file's column padding; `…` stands for unchanged text.

**VERIFY**

- [x] `grep -n "\`true\` and \`yes\` in any casing\|plain and unquoted" .claude/Features/PropertiesPM.md` → none.
- [x] Each edited paragraph reads without contradiction.

---

### Phase 5 — Live Drive

**GOAL:** The built app, on a throwaway copy of `~/Test`, leaves exactly the bytes the plan claims after registering, ticking, unticking, and editing over held values.

#### Task 5-1

**TASK:** A scratchpad script on `.claude/scripts/drive-harness.mjs`'s `launch` and `restore` seeds one page, registers the properties over it, drives each gesture through `mutate`, and reads the page file after each.

**FILES:** none in the repo; the script lives in the session scratchpad and is deleted after.

**CHANGE**

- [x] Seed a page `Collection A/Set Alpha/2024.md`, and `Collection A/Set Alpha/Drive Adopt.md` with a minted page ID (`mintPageId`) and frontmatter `done: No`, `Price: $1,200.00`, `Count: "30"`, `Pinned: 'OFF'`, `Brand: ["Acme", 2024]`, `Tags: ['2024', work]`, `Source: [[2024]]`.
- [x] `schema:add` into `Collection A`: Done (checkbox), Price (number), Count (number), Pinned (checkbox), Brand and Tags (multiSelect), Source (link). Read the file: byte-identical to the seed.
- [x] `mutate setProperty` Done → `{ kind: 'checkbox', value: true }`: the file holds `done: Yes`. Pinned → checked: `Pinned: 'ON'`. Price → 1300: `Price: $1,300.00`. Count → 31: `Count: "31"`. Brand → `['Acme', '2024', 'Drive']`: `Brand: ["Acme", 2024, "Drive"]`. Tags → `['2024', 'work', 'job']`: `Tags: ['2024', work, job]`. `mutate rename` of the page `2024` to `2025`: `Source: "[[2025]]"`.
- [x] Done → `null`: the `done` line is gone, every other line unchanged.
- [x] `restore()`; delete the script.

**VERIFY**

- [x] Each read printed and matched, pasted into *§Final Verification*'s own pass.
- [x] `~/Test` restored (the harness's backup), no instance left running.

#### Task 5-2

**TASK:** A kept drive, `.claude/scripts/Metadata Spelling Drive/live-drive.mjs` on the same harness, runs the whole matrix against the built app, one page per case, and the scripts README describes it beside the other drives.

**CHANGE**

- [x] Cases: each checkbox word pair in three casings and three quote styles, checked and unchecked; each number shape under each quote style, unchanged and changed, with the shapes the grammar refuses; Select, Status, Multi-Select, Text, Link, File, and Space values held bare, single-quoted, double-quoted, in another casing, and as flow and block lists; and the page, whole-number page, option, Space, and property renames over held spellings.
- [x] Register the properties and assert every page byte-identical; read each value from the table as it draws it; write each case and assert its exact bytes; untick every checkbox; run each rename and assert every holder.
- [x] Document it in `.claude/scripts/README.md`; commit the drive and the README.

**VERIFY**

- [x] `node ".claude/scripts/Metadata Spelling Drive/live-drive.mjs"` exits 0 with every check passing; `~/Test` restored, no instance left running.

---

### Completion Criteria

**Conformance**

- [x] This plan's commits change nothing outside the files the tasks name, `Dashboard/Ledger/loc-history.json`, and this plan; other sessions' commits to `active` inside `<BASELINE>..HEAD` are left out of every check and review.
- [x] One reader of number text in Core (`formatValue.ts`, beside `readDate`), one currency-symbol lookup, one checkbox vocabulary (`propertyValue.ts`), one value popover (`PropertyValueInput`), and one quote rule both frontmatter writers share (`nodeSpelledAs`); no second list of words or symbols and no helper the codebase already had.

**Correctness**

- [x] A quoted, comma-grouped, percent, or currency number under a Number key reads as its number on every surface; a held unchecked word reads unchecked and a tick writes its partner; an untick removes the key.
- [x] A changed string of every type keeps the file's quotes, scalar or list member; an unchanged member keeps its spelling; no quote mark shows in any displayed value.
- [x] The live drives' bytes match Tasks 5-1 and 5-2.

**Completeness**

- [x] Every task ticked; no scaffolding, debug output, or TODO in `<BASELINE>..HEAD`.

**Confirmation**

- [x] Every new test goes red with its change reverted.

**Continuity**

- [x] *§Reconciliation* walked; PropertiesPM reads true.

**Confidence**

- [x] Gates green from clean across `<BASELINE>..HEAD`; the production diff is roughly +140/−95 lines, comments, tests, and docs excluded — growth past it reported. Landed at +61 (+202/−141): both sides larger than planned through the review folds.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

- [x] Phase review (Opus, high effort): Phase 1 · Phase 2 · Phase 3 · Phase 4
- [x] Simplification lens → adversarial lens (Opus, high effort) over `<BASELINE>..HEAD`
- [x] Fold review, simplification and adversarial (Opus, high effort): the quote-rule, scalar-member, and whole-link commits
- [x] Neutral verification (Opus, extra-high effort) over `<BASELINE>..HEAD`
- [x] Own pass: gates · diff · deviations · criteria · the drive's reads
  - Gates at `c8b0f1070` from a clean tree: typecheck 0 · 7,675 passed · 2 skipped · lint clean.
  - Task 5-2's drive: registering left all 199 pages byte-identical; 185 reads as the table draws them; writes kept the file's spelling in every case (Check 72 · Amount 52 · Choice 9 · Stage 4 · Labels 12 · Note 13 · Ref 10 · Files 6 · Areas 7); 72 unticks removed the key; the page, whole-number page, option, Space, and property renames rewrote 14 holders in their own quotes — 17/17 checks.
- [x] Reconciliation walked
- [x] Execution comparison measured and recorded; the comparison worktree removed
- [x] Report delivered, with the comparison as its own section

#### Reconciliation

- `Core/Properties/propertyValue.ts` — `isCheckedRaw`'s doc "the word `true` or `yes` in any casing"; `writtenSpelling`'s doc "a checked `true` keeps `raw`'s checked word" — Tasks 1-1, 2-1
- `Core/Properties/Pickers/valueClick.ts:1` — "a checkbox is true-or-absent on disk, never a stored false" — Task 1-2
- `Core/Properties/propertyValue.test.ts` — "a checkbox is true or absent — false written from outside reads as no value"; "a checkbox reads true, or the word true or yes in any casing, as checked"; the two checked-value `writtenSpelling` tests — Task 1-1
- `Core/Properties/governedWrite.test.ts:196` — "a checked box the file spells otherwise lands as true" — Task 1-1
- `Core/Files/pageFile.ts:124` — "A fresh node, so a changed value takes the spelling yaml gives it rather than the old node's quoting or block style" — Task 2-1
- `Core/Files/pageFile.test.ts:88` — "a changed value takes a fresh spelling…"; `Core/Properties/propertyValue.test.ts` — "takes only string members"; `Core/Contexts/contextResolve.test.ts:120` — "repairs scalar-typed values to their canonical string titles"; `Core/Trash/restoreScrub.test.ts:216` — `['2024']` — Task 2-1
- `.claude/Features/PropertiesPM.md:8, 12, 14, 29, 59, 63, 67` — "bare and natively typed", the Text and Checkbox rows, the decode paragraph's checkbox clause and its matching and spelling sentences, the toggle clause, the Text paragraph's on-disk sentence, the Number paragraph's "A bare number" — Task 4-1
- `.claude/Features/ContextsPM.md:12` — "a value matches through one normalizer" — Task 4-1
- `Core/Properties/repairSweep.test.ts:185` — a join's first line `Tags:` — Task 2-1
- `Desktop/Store/open.test.ts:128, 145` — the generation pinned at 12 — Task 3-3

#### Execution Comparison

The plan is executed twice from the same **BASELINE** head, so the difference between a strong and a light model applying code the plan already writes is measured rather than assumed.

- **Primary:** Opus at low effort (`opus-low`), one agent per phase in the main tree, committing as each phase's CHANGE says, reviewed and verified as *§Final Verification* sets out. This is the run that ships.
- **Comparison:** one Haiku agent at extra-high effort (`model: haiku`, `effort: xhigh`), dispatched with Phase 1 in an isolated worktree (`isolation: worktree`), given this plan file and told to apply Phases 1–4 task by task as written: tests first, then source, then the gates. It never commits or pushes — the post-commit hook pushes `active` — so its work stays an uncommitted diff in the worktree. Its `node_modules` is a symlink to the main tree's. It gets no review, fix, or help from the orchestrator beyond its brief, so its result is its own; Phase 5's live drive is the primary run's alone.
- **Measured for each:** wall-clock time and tokens from each agent's completion usage (`duration_ms`, `subagent_tokens`, `tool_uses`), summed across the primary run's phase agents and excluding the reviews both would need alike; the gates' results on its own tree (typecheck, lint, test count against **BASELINE**); the production line delta; tasks it left incomplete or applied differently from the AFTER blocks; and `git diff` between the two trees' production files, with each difference judged correct, equivalent, or wrong.
- **Recorded:** in the report's *Execution Comparison* section — a table of time, tokens, gate results, and delta per run; the substantive differences; and a stance on whether Opus was worth its cost here and for which kinds of task. Cost is given in tokens per model, with a dollar estimate only where current pricing is known. The worktree is removed with `git worktree remove` once recorded.

#### Open Items


#### Deviations

- **The quote rule's mechanics (`0a12a86e3`):** `nodeSpelledAs` first carried only the quotes of a list's first quoted member onto every changed string. Final review showed that re-quoting untouched bare members of a mixed list, flattening a flow list to block, and spreading quotes yaml itself needed (Pommora's own `"2024"`) to new values, against "an unchanged member keeps its spelling" and Nathan's "bare by default". It now keeps each member's own quotes from any spelling of its key and a list's flow or block style, a whole unquoted `[[x]]` counting as no style, and counts only quotes the file chose, in either style.
