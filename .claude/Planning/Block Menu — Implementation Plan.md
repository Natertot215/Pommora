## Block Menu — Implementation Plan

> **Status:** Ratified — in execution · Spec: Nathan's direction of 09-09-2026 (in-app only, layout ratified, `/` trigger, the native menu untouched), over `Slash Command Menu — Grounding.md` · Three phases · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

Typing `/` on an empty line in a Page opens a pane under the caret listing the blocks the editor can make, filtered by what follows the slash, picked by Return or a click, and undone in one step. At the end, a keyboard writer creates any block without leaving the line, and the context menu's Heading and Lists rows work on an empty line, which they don't today.

The pane is the editor's own, a peer of the `[[` autocomplete rather than a door menu: it filters as the user types, which the door's presenter cannot do and an OS menu cannot do while the editor holds focus. The row catalog is a React-free model in `Core/Actions`, where every other menu model lives; the native context menu is a different surface with its own rows and is not touched.

Bounded to the four sections Nathan ratified and to a line that holds nothing but the slash and its query. Inline Format marks, chord display, table cells, the arrow list kind, and a `/` typed after a quote, callout, or list prefix are out.

**Requirements**

1. A model in `Core/Actions/blockMenu.ts` yields four titled sections of rows: Headings (Heading 1–5), Lists (Bullet List, Numbered List, Task List), Insert (Blockquote, Callout, Code Block, Table, Horizontal Rule, and Footnote only where a marker can bind), Embed (Internal Page, Webpage). Every row carries an icon the registry resolves and an action `applyEditorAction` already runs.
2. A filter over the model keeps a row whose label has a word starting with the query, case-insensitively, and returns where that match begins; an empty query keeps everything; a section with no surviving rows disappears with its heading.
3. A `/` typed as the entire text of a line, with the caret at line end, outside code, math, and the citations run, opens the pane under the caret; each further non-space character narrows it; a space, a caret move off the line, or blur closes it; Escape closes it until the next edit, as the `[[` pane does; the pane shows only while a row matches.
4. Return or a click on a row removes the typed `/query` and applies the row's action; one undo reverts the block and leaves the blank line.
5. `setHeading` and `setList` act on a blank line when the caret alone selects it, so Heading 2 on an empty line writes `## ` from the pane and from the context menu alike.
6. The record: `MarkdownPM.md` carries a `Block Menu:` sub-label under Block Structure; `ContextPM.md`'s Slash Commands item closes; the grounding document leaves the tree; History gains PM-134.

**Acceptance — the whole thing working:** In a Page with the dev build, on an empty line type `/hea`: a pane under the caret shows a Headings section with five rows and nothing else. Press ArrowDown once and Return: the line reads `## ` with the caret after the space and no `/hea` anywhere. Press ⌘Z once: the line is blank. Type `/` inside a code fence: nothing opens. Type `/` then a space: the pane closes. `npm run test` runs `Core/MarkdownPM/Menus/blockMenuFlow.test.tsx`, whose list under Task 5 covers each of these.

**Forced By** *(what each grounded fact makes mandatory or impossible)*

- `@codemirror/commands`' history joins only `input.type` and `delete` user events (`joinableUserEvent`, dist/index.js:471), so two `input` dispatches never merge; and `embedInsertAtCaret`, `webpageInsertAtCaret`, and `insertCitation` dispatch for themselves (`Embeds/embedInsert.ts:39-55`, `Citations/citationActions.ts:56-67`), so no composed single transaction serves every row → the `/query` removal leaves history through `addToHistory.of(false)`, and the action's own dispatch is the one history entry for all sixteen rows. → Task 5.
- `setBlock('> ', 2, 2, 'quote')` and `setList('- ', 2, 2, 'bullet')` strip the prefix (`Input/format.ts:249-267, 181-198`), and `setBlock` table and hr on a non-blank line write the line above the block → a pick on a prefixed line would delete or strand what the user typed. → Task 4.
- `selectedLines` (`Input/format.ts:154-176`) pushes only lines whose body is non-blank, so `setHeading` and `setList` return `{ changes: [] }` on an empty line and `applyEditorAction` dispatches an empty change set and returns `true` → the pane cannot rely on the runner's boolean. → Task 2.
- `embedSeatAt` (`Embeds/embedInsert.ts:31-38`) refuses fences, `scan.maths`, and `scan.tables`, and `citationSeatAt` (`Citations/citationActions.ts:45-52`) refuses the citations mask; a Heading written inside the citations run dissolves the whole section (`MarkdownPM.md:66`) → the trigger refuses everything its two sibling predicates refuse. → Task 4.
- `applyEditorAction` (`Menus/menu.ts:68`) refuses a string without `EDITOR_ACTION_PREFIX` → the model carries bare actions as `pasteAsMenu.ts` does, and the pick prepends the prefix. → Tasks 1, 5.
- `HEADING_LEVELS[].level` is `number` (`Core/Actions/gripMenu.ts:32`) → a row built from it needs the action narrowed to the union. → Task 1.
- `MenuItem` sets `role="button"` only when it has `onClick` (`UIX/Menus/menu-row.tsx:100, 113`), and a row must answer `onMouseDown` with `preventDefault` instead or the editor blurs before the click lands (`AutocompletePane.tsx:82-87`) → rows carry a class the flow test counts by, and `MenuRowView`'s item branch (`menu-index.tsx:105-124`), which forwards neither `ref` nor `onMouseDown`, draws only the headings. → Task 5.
- `picker-base.css.ts:64` composes `menuCompact` into every `PickerMenu` pane → the pane is compact by being a `PickerMenu`; nothing to add. → Task 5.
- The extension array in `MarkdownEditor.tsx:196` is built once, so the blur handler and the update listener capture the first render's values → the detector is a module-level function and the setter it is handed is React's own, unwrapped, as `setAc` is at `:266, 305`. → Task 5.
- `whenAcOpen` (`useConnectionAutocomplete.ts:30-34`) is the one seam the keymap knows → it takes a list of ctls and the keymap keeps four entries; a line such as `/[[foo` satisfies both grammars at once, so each pane's `open` requires a surviving row, which is what keeps the two from fighting over Return. → Tasks 3, 5.
- `Editor-Internals.md`: a predicate answered on every caret move reads the cached scan → detection takes `docScan(view.state.doc)`, never the document string. → Task 4.

**Inherited Reasoning**

- The grounding recorded `//` as the trigger to avoid "CommonMark's escape." Backslash is the escape; `/` has no Markdown meaning, and the empty-line constraint is what makes a single `/` unambiguous.
- The door widening to `HTMLElement | MenuAnchor`, `EditorHost.menus.slash`, a parity-fixture row in `Desktop/Actions/menu.test.ts`, and the Configuration row edit were all premised on the door. None is built, and the union the previous plan cut stays cut.
- A prefix-aware trigger (`> /`, `- /`) and a task making `Desktop/Actions/editorMenu.ts` read the model were both drafted in review and withdrawn under the rulings below.

**Grounding** *(re-open these; don't cite them)*

- `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts` / `AutocompletePane.tsx` — the caret-anchored pane the editor already owns: geometry from `coordsAtPos`, `PickerMenu` with `manageFocus={false}` and no `onDismiss`, the keymap owning arrows, Return, and Escape, `whenAcOpen` as the guard idiom, one ref holding the last live snapshot through the close.
- `Core/MarkdownPM/MarkdownEditor.tsx:175, 206-209, 266, 305, 433` — the connection hook, the `Prec.highest` keymap, the blur handler, the read-only-guarded detection call, and the pane mount.
- `Core/MarkdownPM/Tables/CellEditor.tsx:160-162` — the cell's three `whenAcOpen` readers.
- `Core/MarkdownPM/Menus/menu.ts` — `applyEditorAction` and `editFor`, the one runner every row resolves through.
- `Core/MarkdownPM/Input/format.ts:20, 154-176` — `BlockFormat` and `selectedLines`.
- `Core/MarkdownPM/Embeds/embedInsert.ts:31-38` and `Core/MarkdownPM/Citations/citationActions.ts:45-52` — the two seat predicates the trigger mirrors.
- `Core/Actions/gripMenu.ts:32-39` — `HEADING_LEVELS`, exported, leading with Paragraph.
- `Core/Actions/pasteAsMenu.ts` — the bare-action-plus-prefix pattern, the `citeSeat` gate, and a type-only import from MarkdownPM.
- `Core/MarkdownPM/Autocomplete/connectionCommit.test.tsx:26-40` — how a pane test mounts, spies `coordsAtPos`, and sends keys.
- `.claude/Guidelines/Editor-Internals.md` — the cached-scan rule and the offset rule.
- `.claude/Features/MarkdownPM.md:70-82` — Block Structure, where the record lands.

**Environment:** Plan directory `.claude/Planning`. Spec input: Nathan's ratification in session over the grounding document. Explorer: `Explore` agents on Opus. Reviewer and simplifier: Opus agents briefed per the skill, `code-simplification` then `build-breaking`. Neutral verifier: a general-purpose Opus agent handed the claim, the requirements, and the range. Gates from `package.json`: `npm run typecheck`, `npm run test`, `npm run lint`. Rules directory `.claude/Guidelines`. Format references live at `~/The Studio/.claude/references/History-Format.md` and `Context-Format.md`. Baseline before Phase 1, measured 09-09-2026: `npm run test` at 359 files / 4336 tests, all green.

**Shapes:** additive · fix (Task 2) · refactor (Task 3) · user-visible.

**Declared Stops**

- Gate 2 — the pane is on screen for the first time. Nathan sees the sections, the filter, the pick, and the undo before the record is written around them.

**Global Constraints (every task inherits these):**

- Gates from the repo root, exit codes read directly, never piped: `npm run typecheck && npm run test && npm run lint`.
- No comments in any new or edited line. A `//` line only where a why cannot be read from the code, and none is expected here.
- MarkdownPM imports nothing from `Core/Session/store`; the editor reaches app state only through `EditorHost`, and this pane needs nothing from it. `Core/Actions` imports no React and nothing from `Core/Interface` or UIX; the model's icon names are plain strings, checked against `ICON_NAMES` by its test alone.
- Biome formats every write through the hook; a whitespace mismatch on an Edit means re-read and retry, never hand-align.
- One writer on the tree. Commit per task; tick the task's boxes in the same commit. Bundle any unattributed hunks Nathan leaves in a shared file.
- Out of scope everywhere: `Core/Actions/menuActions.ts`, `Core/Session/chromeSlice.ts`, `Core/Interface/Menus/`, `Desktop/`, `Core/MarkdownPM/api.ts`, `Core/MarkdownPM/editorHarness.ts`, `UIX/`, `.claude/Features/ConfigurationPM.md`, `Showcase/`. `Core/MarkdownPM/Tables/CellEditor.tsx` changes only at its three `whenAcOpen` calls in Task 3 and never mounts the block menu.

**Made False** *(each rewrite lands in the commit that falsifies it)*

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `.claude/Features/MarkdownPM.md:72, 74` | "…and where its menu lives." · "The handle is also where the block's menu lives." | A second block menu exists; these are the grip's. | 5 |
| `.claude/ContextPM.md:45` | "**Slash Commands** … triggered via `//` … records what the menu door provides" | The menu ships on `/`, in-app, off the door. The item closes. | 6 |
| `.claude/HandoffPM.md:32` | "the door needs to accept a `MenuAnchor` rect … `EditorHost.menus.slash`" | Neither is built. The Handoff is rewritten by `/handoff` at session end; this line goes then. | 6 |
| `.claude/Planning/Slash Command Menu — Grounding.md` | The whole premise: door, native-or-in-app, `//`. | This plan supersedes it. Deleted. | 6 |

**Dead Vocabulary**

- `Slash Command Menu` → expect 1 file in `.claude` and `Core` with this plan excluded: `HandoffPM.md`, until `/handoff`.
- `menus.slash` → expect 1 file with this plan excluded: `HandoffPM.md`, until `/handoff`.
- Control: `AutocompletePane` → 9 files after Task 6 (10 today; the grounding doc is one).

---

### Phase 1 — The catalog, the blank line, and the shared seams

#### Task 1: The block menu model

**Requirement:** 1, 2

**Why:** The rows the pane draws are data; keeping them beside the other menu models in `Core/Actions`, React-free and tested on their own, is what lets the pane be a thin view over a filter. The filter and the offset it matched at live with the data they read, so the view never matches a second time.

**Now** — `—` (new file). `HEADING_LEVELS` at `Core/Actions/gripMenu.ts:32-39` is the one heading label source, typed `{ level: number; label: string }`; `LIST_KIND_LABELS` at `:41` is private and carries the grip's vocabulary, so it is not reused. `BlockFormat` at `Core/MarkdownPM/Input/format.ts:20` is `'quote' | 'code' | 'hr' | 'callout' | 'table'`, the union `editFor` switches on.

**Becomes**

```ts
// Core/Actions/blockMenu.ts (new) + Core/Actions/blockMenu.test.ts
import type { ActionItem } from './menuModel'
import { HEADING_LEVELS, type ListKind } from './gripMenu'
import type { BlockFormat } from '../MarkdownPM/Input/format'

export type BlockMenuAction =
  | `heading:${1 | 2 | 3 | 4 | 5}`
  | `list:${Extract<ListKind, 'bullet' | 'ordered' | 'checkbox'>}`
  | `block:${BlockFormat}` | 'block:citation' | 'block:page' | 'block:webpage'

export interface BlockMenuSection { title: string; rows: ActionItem<BlockMenuAction>[] }
export interface BlockMenuMatch { title: string; rows: (ActionItem<BlockMenuAction> & { at: number })[] }

// Headings: HEADING_LEVELS.slice(1), action `heading:${level}` narrowed to BlockMenuAction, icon `heading-${level}`
// Lists: Bullet List `list` · Numbered List `list-ordered` · Task List `list-todo`
// Insert: Blockquote `text-quote` · Callout `message-square-quote` · Code Block `square-code` · Table `table` · Horizontal Rule `separator-horizontal` · Footnote `brackets` (citeSeat only)
// Embed: Internal Page `file-text` · Webpage `globe`
export function blockMenuSections(citeSeat: boolean): BlockMenuSection[]

// keeps a row whose label has a word starting with the lowercased query, at = that word's offset (0 for ''); drops a section left with no rows
export function filterBlockMenu(sections: BlockMenuSection[], query: string): BlockMenuMatch[]
```

Actions are bare; the caller prepends `EDITOR_ACTION_PREFIX`. Icons are plain strings.

**Assumed by:** Task 5 (draws the matches, prepends the prefix, gates on `citeSeat`, highlights from `at`).

**Verify — automated**

- [x] Red first: the test file asserts section titles `['Headings', 'Lists', 'Insert', 'Embed']`, the label list of each, sixteen rows with `true` and fifteen with `false`, every `icon` a member of `ICON_NAMES` from `@pommora/uix/Symbols/iconNames`, `filterBlockMenu(s, 'hea')` yielding one section of five each at 0, `filterBlockMenu(s, 'bl')` yielding Insert with Blockquote at 0 and Code Block at 5, `filterBlockMenu(s, 'od')` yielding `[]`, `filterBlockMenu(s, 'zz')` yielding `[]`, and `filterBlockMenu(s, '')` carrying every row at 0. Expect module-not-found; then green.
- [x] `rg -F "@pommora/uix" Core/Actions/blockMenu.ts` → 0. Control: `rg -F "@pommora/uix" Core/Actions/blockMenu.test.ts` → 1.
- [x] Full gate green, exit codes read directly.

**Verify — user**

- [ ] *(none — nothing on screen until Task 5.)*

#### Task 2: A caret on a blank line counts

**Requirement:** 5

**Why:** Heading 2 on an empty line writes nothing today, from the pane-to-be and from the context menu. Fixing the one line resolver both transforms read gives the pane a uniform pick (remove the query, run the action) and repairs the context menu in the same stroke.

**Now** — `rg -F "selectedLines" Core/MarkdownPM/Input/format.ts` → 3 (the declaration and two readers); `rg -F "from === to" Core/MarkdownPM/Input/format.ts` → 1 (`:67`, in `toggleInline`):

```ts
// Core/MarkdownPM/Input/format.ts:154-160
function selectedLines(doc: string, from: number, to: number): SelectedLine[] {
  const out: SelectedLine[] = []
  for (let p = lineStartAt(doc, from); p <= to; p = lineEndAt(doc, p) + 1) {
    const ls = p
    const le = lineEndAt(doc, p)
    const { prefix, body } = splitPrefix(doc.slice(ls, le))
    if (body.trim() !== '') {
```

**Becomes**

```ts
// Core/MarkdownPM/Input/format.ts:160
    if (body.trim() !== '' || from === to) {
// a caret alone on a blank line yields one SelectedLine with inner '' · a multi-line selection still skips its blank lines
```

`setHeading('', 0, 0, 2)` → `## ` with selection 3 · `setList('', 0, 0, 'bullet')` → `- ` · `setList('> ', 2, 2, 'ordered')` → `> 1. ` · `setHeading('one\n\ntwo', 0, 8, 1)` unchanged at `# one\n\n# two`.

**Assumed by:** Task 5 (every heading and list row runs through the unchanged `applyEditorAction` on the emptied line).

**Verify — automated**

- [ ] Red first in `format.test.ts`: `heads a blank line the caret sits on` and `marks a blank line the caret sits on` (the four cases above); the existing `leaves a blank line unheaded` and `leaves a blank line unmarked` stay green throughout. Expect 2 failures; then green.
- [ ] `rg -F "from === to" Core/MarkdownPM/Input/format.ts` → 2. Control: `rg -F "selectedLines" Core/MarkdownPM/Input/format.ts` → 3.
- [ ] Full gate green, exit codes read directly.

**Verify — user**

- [ ] On an empty line, right-click → Heading ▸ Heading 2 writes `## `; Lists ▸ Bullet List writes `- `.

#### Task 3: One caret geometry and one key guard for both panes

**Requirement:** 3

**Why:** The block pane anchors exactly where the connection pane does and answers the same four keys. One exported geometry helper and a guard that takes a list of ctls keep both in one place, so Task 5 adds a pane without adding a keymap.

**Now** — `rg -F "surfaceOf" Core` → 1 file, private; `rg -F "AcCtl" Core` → 1 file, private; `rg -F "whenAcOpen(" Core --glob '!*.test.*'` → 7 calls in 2 files (`MarkdownEditor.tsx:206-209`, `CellEditor.tsx:160-162`):

```ts
// Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts:16-34, 136-151
export interface AcState extends AutocompleteQuery {
  caretX: number
  caretTop: number
  caretBottom: number
  bounds: { left: number; right: number }
}
interface AcCtl { open: boolean; pick: () => void; move: (d: number) => void; close: () => void }
export const whenAcOpen = (ctl: RefObject<AcCtl>, drive: (c: AcCtl) => void) => (): boolean => { … }
// detectConnectionQuery computes coordsAtPos + surfaceOf inline and spreads the four fields onto next
```

**Becomes**

```ts
// Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts
export interface CaretGeometry {
  caretX: number
  caretTop: number
  caretBottom: number
  bounds: { left: number; right: number }
}
export interface AcState extends AutocompleteQuery, CaretGeometry {}
export interface AcCtl { open: boolean; pick: () => void; move: (d: number) => void; close: () => void }
// the first open ctl is driven; none open → false, so the key falls through to the editor
export const whenAcOpen = (ctls: readonly RefObject<AcCtl>[], drive: (c: AcCtl) => void) => (): boolean
// null when coordsAtPos has nothing for pos (the view is unmeasured)
export function caretGeometry(view: EditorView, pos: number): CaretGeometry | null
// detectConnectionQuery: const g = q && caretGeometry(view, sel.head); if (q && g) next = { ...q, ...g }
// MarkdownEditor.tsx:206-209 and CellEditor.tsx:160-162 pass [acCtl]
```

Refactor baseline: `Core/MarkdownPM/Autocomplete/*.test.*` and `Core/MarkdownPM/Tables/*.test.*` pass counts before equal after.

**Assumed by:** Task 5 (calls `caretGeometry`, types its ctl as `AcCtl`, joins the list).

**Verify — automated**

- [ ] `npx vitest run Core/MarkdownPM/Autocomplete Core/MarkdownPM/Tables` green with the same test count as at the phase base.
- [ ] `rg -F "whenAcOpen(acCtl" Core` → 0. Control: `rg -F "whenAcOpen(" Core --glob '!*.test.*'` → 7 matches in 2 files.
- [ ] Full gate green, exit codes read directly.

**Verify — user**

- [ ] *(none — behavior-preserving.)*

#### Gate 1 — the catalog stands, the blank line answers, the seams are shared

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `Core/Actions/blockMenu*`, `Core/MarkdownPM/Input/format*`, `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts`, `Core/MarkdownPM/MarkdownEditor.tsx`, `Core/MarkdownPM/Tables/CellEditor.tsx`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop: Phase 2 opens; Task 2's user box carries to Completion Criteria.

---

### Phase 2 — The pane

#### Task 4: The trigger

**Requirement:** 3

**Why:** The pane opens on a grammar, and a grammar is a pure function over the cached scan that can be tested without a mount, exactly as `autocompleteQuery` is apart from its hook. Keeping it apart is what lets the edge cases be asserted as text in, position out.

**Now** — `—` (new file). Readers reused: `inCodeAt` and `lineIndexAt` (`Engine/docScan.ts:69, 81`), `scan.fences`, `scan.maths`, `scan.tables`, `scan.citations.mask` as `embedSeatAt` and `citationSeatAt` read them.

**Becomes**

```ts
// Core/MarkdownPM/Menus/blockQuery.ts (new) + Core/MarkdownPM/Menus/blockQuery.test.ts
export interface BlockQuery { query: string; from: number; to: number }
// null when the line is not exactly /\S*, when the caret is not at its line's end, or when the line sits in code, a math block, a table, or the citations run
// from is the line start; to is the caret; query excludes the slash
export function blockQueryAt(scan: DocScan, caret: number): BlockQuery | null
```

Cases: `'/'` caret 1 → `{ '', 0, 1 }` · `'/hea'` caret 4 → `{ 'hea', 0, 4 }` · `'/he a'` → null · `'a/'` → null · `' /'` → null · `'> /'` → null · `'- /'` → null · `'/hea'` caret 2 → null · a `/` line inside a closed fence → null · `'```\n/'` caret at end (an unclosed fence) → null · a `/` line between `$$` lines → null · `'body\n\n[^1]: note\n/'` caret at end → null · `'/'` followed by a second line, caret on line one → the first case.

**Assumed by:** Task 5 (calls it from the detector).

**Verify — automated**

- [ ] Red first on the thirteen cases above through `scanOf(text)`; expect module-not-found; then green.
- [ ] Full gate green, exit codes read directly.

**Verify — user**

- [ ] *(none — surfaces in Task 5.)*

#### Task 5: The pane, its hook, and the mount

**Requirement:** 3, 4, 6 (the Block Structure half)

**Why:** This is the deliverable: the pane on screen, filtered by what the user types, picking through the one runner, undone in one step. The hook holds the state and the ctl exactly as the connection hook does, so the shared key guard and the blur handler treat the two panes the same way.

**Now**

```tsx
// Core/MarkdownPM/MarkdownEditor.tsx (after Task 3)
// :206-209  { key: 'ArrowDown', run: whenAcOpen([acCtl], (c) => c.move(1)) }, … four entries
// :266  blur: () => { setAc(null); return false },
// :305  if ((u.docChanged || u.selectionSet) && !u.state.readOnly) detectConnectionQuery(u.view, setAc, true)
// :433  <AutocompletePane ac={ac} candidates={candidates} index={acIndex} onPick={commit} />
```

**Becomes**

```ts
// Core/MarkdownPM/Menus/useBlockMenu.ts (new)
export interface BlockMenuState extends BlockQuery, CaretGeometry { citeSeat: boolean }
// module-level: the extension array captures its caller once
export function detectBlockQuery(view: EditorView, set: (s: BlockMenuState | null) => void): void
// sel.empty && blockQueryAt(docScan(doc), sel.head) && caretGeometry → state with citeSeat = citationSeatAt(view.state); else null

export function useBlockMenu(viewRef: RefObject<EditorView | null>): {
  state: BlockMenuState | null
  setState: (s: BlockMenuState | null) => void   // React's own setter, unwrapped: the listener and the blur handler capture it once
  matches: BlockMenuMatch[]                       // filterBlockMenu(blockMenuSections(citeSeat), query), memoized on query and citeSeat
  selected: BlockMenuAction | null                // the highlighted row, walked flat across matches; the index resets in an effect on the query
  open: boolean                                   // state !== null && matches has a row; the ctl reads the same value
  pick: (action: BlockMenuAction) => void
  ctl: RefObject<AcCtl>
}
// pick: dispatch({ changes: { from, to, insert: '' }, annotations: Transaction.addToHistory.of(false), userEvent: 'input' })
//       then applyEditorAction(view, EDITOR_ACTION_PREFIX + action); state clears through the listener re-detecting a blank line
```

```tsx
// Core/MarkdownPM/Menus/BlockMenu.tsx (new)
export function BlockMenu(props: {
  open: boolean
  state: BlockMenuState | null
  matches: BlockMenuMatch[]
  selected: BlockMenuAction | null
  onPick: (action: BlockMenuAction) => void
}): React.JSX.Element
// one ref holds the last { state, matches, selected } while open, as AutocompletePane.tsx:35-37 does, so the close animates over real rows
// PickerMenu glass="window" open anchorX/anchorY/anchorHeight/bounds origin="center" manageFocus={false} contentClassName="mdpm-block-menu"
// MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT} className="mdpm-autocomplete-slot"
// per match: <MenuRowView row={{ kind: 'heading', label: title, caps: true }} /> then MenuItem rows: className="mdpm-block-row", leading <Icon name={row.icon}>, selected={row.action === selected}, ref={keepInView} from ../Autocomplete/useKeepInView, onMouseDown preventDefault → onPick
// the label's slice at row.at of the query's length wrapped in .mdpm-autocomplete-match
```

```tsx
// Core/MarkdownPM/MarkdownEditor.tsx
// :175  const block = useBlockMenu(viewRef)
// :206-209  whenAcOpen([acCtl, block.ctl], …) on each of the four entries
// :266  blur: () => { setAc(null); block.setState(null); return false }
// :305  the same guard also calls detectBlockQuery(u.view, block.setState)
// :434  <BlockMenu open={block.open} state={block.state} matches={block.matches} selected={block.selected} onPick={block.pick} />
```

```md
<!-- .claude/Features/MarkdownPM.md, ### Block Structure -->
<!-- :72 "…(`Core/MarkdownPM/Menus/blockHandles.ts`) … and where the grip menu lives." · :74 "The handle is also where the grip menu lives." -->
<!-- after the table: -->
**Block Menu:** Typing `/` on an otherwise empty line opens a pane under the caret listing the blocks the editor can make — Headings, Lists, Insert, and Embed — filtered by whatever follows the slash, so `/hea` leaves the five headings. Return or a click removes the typed query and writes the block through the same action the context menu runs; one undo reverts it. The pane is the editor's own, drawn in-app whatever Use Native Menus says, and never opens inside code, math, or the footnotes, behind a quote or list marker, or in a table cell.
```

**Assumed by:** Task 6 (History names these files).

**Verify — automated**

- [ ] Red first in `Core/MarkdownPM/Menus/blockMenuFlow.test.tsx` (mount through `editorHarness`, `coordsAtPos` spied as `connectionCommit.test.tsx` does, keys sent to `contentDOM`, rows counted as `.mdpm-block-menu .mdpm-block-row`, sections asserted by the pane's text): typing `/` on the empty line mounts `.mdpm-block-menu` whose text holds the four titles and sixteen rows; typing `hea` leaves the Headings title only and five rows; ArrowDown then Enter leaves the document `## ` and no `.mdpm-block-menu`; one `undo(view)` leaves `''`; typing `/` then a space unmounts the pane; Escape unmounts it and a further character reopens it; `/` typed inside a fence never mounts it; a pick of Table leaves the serialized 3×3 table with no `/`. Expect module-not-found; then green.
- [ ] `rg -F "Session/store" Core/MarkdownPM --glob '!*.test.*'` → 0. Control: `rg -F "editorHost" Core/MarkdownPM --glob '!*.test.*'` → 16 files.
- [ ] `rg -F "grip menu lives" .claude/Features/MarkdownPM.md` → 2; `rg -F "Block Menu:" .claude/Features/MarkdownPM.md` → 1; `rg -F "Menus/blockHandles.ts" .claude/Features/MarkdownPM.md` → 1. Control: `rg -F "Block Structure" .claude/Features/MarkdownPM.md` → 1.
- [ ] Full gate green, exit codes read directly; `npm run lint` clean including the wrapped-comment scan.

**Verify — user**

- [ ] `/` on an empty line opens the pane under the caret with four headed sections, Headings, Lists, Insert, Embed, each row carrying its icon.
- [ ] `/hea` leaves the five headings; `/bl` leaves Blockquote and Code Block with the matched letters emphasized in each; `/zz` shows nothing.
- [ ] ArrowDown and ArrowUp move the highlight; Return picks the highlighted row; Escape closes; a click picks; clicking elsewhere closes; a space closes.
- [ ] A pick of each of the sixteen rows writes the block with no `/` left, and ⌘Z once leaves the blank line.
- [ ] `/` mid-sentence, `> /`, `- /`, an indented `/`, `/` inside a fence, and `/` on a blank line inside the footnotes do not open it.

#### Gate 2 — the pane on screen · **declared stop**

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] `rg -F "BlockMenu" Core/MarkdownPM/Tables` → 0. Control: `rg -F "AutocompletePane" Core/MarkdownPM/Tables` → 1.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `Core/MarkdownPM/Menus/` and `Core/MarkdownPM/MarkdownEditor.tsx`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] **Declared stop.** Execution halts until Nathan closes Task 5's user boxes and Task 2's carried box, or redirects the layout.

---

### Phase 3 — The record

#### Task 6: Context, History, and the grounding

**Requirement:** 6

**Why:** Three documents describe a menu that isn't the one that shipped; left standing, the next session builds the door version. The History entry is how the arc is found later.

**Now** — `rg -F "Slash Command Menu" .claude Core --glob '!Block Menu*'` → 3 files (`ContextPM.md`, `HandoffPM.md`, the grounding itself); `.claude/HistoryPM.md` index tops at PM-133.

**Becomes**

```md
<!-- .claude/ContextPM.md:45 — the Slash Commands item is removed from Next-Feature Candidates -->
<!-- .claude/HistoryPM.md — index row `| 09-09-2026 | PM-134 | The Block Menu |` and an entry in History-Format naming Core/Actions/blockMenu.ts, Core/MarkdownPM/Menus/blockQuery.ts, useBlockMenu.ts, BlockMenu.tsx, the selectedLines fix, and the history-free removal -->
<!-- .claude/Planning/Slash Command Menu — Grounding.md — deleted -->
```

`HandoffPM.md:32` is left to `/handoff`, which rewrites the whole document at session end.

**Verify — automated**

- [ ] `rg -F "Slash Command Menu" .claude Core --glob '!Block Menu*'` → 1 file (`HandoffPM.md`). Control: `rg -F "Block Menu" .claude/Features .claude/HistoryPM.md` → 2 files.
- [ ] `rg -F "PM-134" .claude/HistoryPM.md` → 2 lines.
- [ ] `test ! -e ".claude/Planning/Slash Command Menu — Grounding.md" && test -e ".claude/Planning/Block Menu — Implementation Plan.md"` exits 0.
- [ ] Full gate green, exit codes read directly.

**Verify — user**

- [ ] *(none.)*

#### Gate 3 — the record is true

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked.
- [ ] Dead Vocabulary sweep at its expected counts against the control.
- [ ] Progress hashes filled in.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — The catalog, the blank line, and the shared seams · base `03fd99873`
  - [ ] Task 1 — The block menu model · `<commit>`
  - [ ] Task 2 — A caret on a blank line counts · `<commit>`
  - [ ] Task 3 — One caret geometry and one key guard for both panes · `<commit>`
- [ ] **Phase 2** — The pane · base `<commit>`
  - [ ] Task 4 — The trigger · `<commit>`
  - [ ] Task 5 — The pane, its hook, and the mount · `<commit>`
- [ ] **Phase 3** — The record · base `<commit>`
  - [ ] Task 6 — Context, History, and the grounding · `<commit>`

### Rulings

- 09-09-2026, Nathan: Use Native Menus is unaffected; the block menu always draws in-app.
- 09-09-2026, Nathan: the four-section layout as proposed; Format marks omitted.
- 09-09-2026, Nathan: `/` is the trigger, not `//`.
- 09-09-2026, Nathan: the block menu is not native and defines its own order; the native context menu is not changed by this plan.
- 09-09-2026, Nathan: the trigger admits only a line that is exactly `/` plus the query; a prefixed or indented line never opens the pane.
- 09-09-2026, Claude (routine, disclosed): undo after a pick leaves the blank line rather than restoring `/query`; the typed query was a command, not content, and it is the one mechanism that gives every row a single undo step.
- 09-09-2026, Claude (routine, disclosed): the blank-line no-op is fixed in `selectedLines` for the caret-only case, repairing the context menu's Heading and Lists rows on an empty line as well.
- 09-09-2026, Claude (routine, disclosed): Escape is a one-shot dismissal; the next edit on the line re-detects and reopens, as the `[[` pane does. No dismissed-offset latch.
- 09-09-2026, Claude (routine, disclosed): the trigger refuses a math block and the citations run as well as code, mirroring the two seat predicates beside it; the context menu still offers its rows there, which is its own exposure and not this plan's.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- Chord display on rows, once a display speller for the command table exists (the Shortcuts settings pane candidate in Context).
- A Format section, if Nathan wants the inline marks reachable from `/`; one more section in `blockMenuSections`.
- A prefix-aware trigger (`> /`, `- /`), which needs the rows gated on the line's quote, callout, and list state, `BlockQuery.from` redefined as the slash's offset, and the Table, Horizontal Rule, and Embed transforms taught to reuse a prefixed blank line.
- Rows that read their query as an argument (`/todo Buy milk`): the `\S*` grammar admits no space, and the removal-then-action pick discards the query before the action runs.
- `MenuIndex`'s item branch forwarding `ref` and `onMouseDown`, which would let both editor panes render through it and retire their hand-rolled row loops. UIX is out of this plan's scope.

### Closeout

---

## Completion Criteria

**The directive**

```
Execute .claude/Planning/Block Menu — Implementation Plan.md. Live.
Live-verify: Task 5's user list and Task 2's carried box, at the Gate 2 stop.
Screenshots: none — Nathan is present.
Pings: at Gate 2.
Record: History PM-134, The Block Menu.
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. A future review of this arc finds nothing to correct.
- **Only the live confirmation may be pending.** No concerns carried, no "for a later session," no deferrals when the fix is known and could be done now.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding.
- **Fix at the source**, never down-river; leave a unified thing rather than stitched pieces.
- **Ambiguity:** take the simplest reading, record it under Rulings or Deviations, continue.
- **Per phase:** implement → simplify → gates, exit codes read directly → code review → attack review → every finding fixed or carrying a defensible ruling → commit. Simplification before review, never inverted.
- **Comments** none. **Docs** rewritten where false, never amended.

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] Task 5's flow test green as listed.

**The passes**

- [ ] Simplification over the whole range, then code review, in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against the requirements.
- [ ] Every finding from every pass fixed, or carrying a defensible ruling.

**The user's own pass**

- [ ] Task 2's context-menu check on an empty line.
- [ ] Task 5's five boxes.

**The record**

- [ ] Documents made false rewritten in the commits that falsified them.
- [ ] The closing sweep at its expected counts against the control.
- [ ] Context and Handoff current; History PM-134 written to its format.
- [ ] Lessons routed; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way worth knowing · every gate's real output · in-flight decisions, a sentence or two each · what's left for the live pass · final +/- line count, comments and tests excluded.
