## Block Menu — Implementation Plan

> **Status:** written, pending review · Spec: Nathan's direction of 09-09-2026 (in-app only, layout ratified, `/` trigger), over `Slash Command Menu — Grounding.md` · Three phases · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

Typing `/` on an empty line in a Page opens a pane under the caret listing the blocks the editor can make: Headings, Lists, Insert, and Embed. Typing on filters it, `/hea` leaving the five headings; Arrow keys move, Return picks, Escape closes; a click or Return removes the typed `/query` and writes the block through the editor's one action runner, and a single undo reverts it. At the end, a keyboard writer creates any block without leaving the line, and the context menu's Heading and Lists rows work on an empty line, which they don't today.

The pane is the editor's own, a peer of the `[[` autocomplete rather than a door menu: it filters as the user types, which the door's presenter cannot do and an OS menu cannot do while the editor holds focus. Nathan ruled the Use Native Menus preference unaffected, so the door widening the grounding proposed has no writer and is not built. The row catalog is a React-free model in `Core/Actions`, where every other menu model lives, with the editor filtering it by the typed query. The blank-line no-op in `setHeading` and `setList` is fixed at the source rather than routed around, so the context menu gains the same behavior.

Bounded to the four sections Nathan ratified. Inline Format marks, chord display, table cells, and the arrow list kind are out; the cell editor is single-line inline GFM and cannot hold a block.

**Requirements**

1. A model in `Core/Actions/blockMenu.ts` yields four titled sections of rows: Headings (Heading 1–5), Lists (Bullet List, Numbered List, Task List), Insert (Blockquote, Callout, Code Block, Table, Horizontal Rule, and Footnote only where a marker can bind), Embed (Internal Page, Webpage). Every row carries an icon the registry resolves and an action `applyEditorAction` already runs.
2. A filter over the model matches a query against the start of any word in a row's label, case-insensitively; an empty query keeps everything; a section with no surviving rows disappears with its heading.
3. A `/` typed as the whole body of a line, after any blockquote, callout, or list-marker prefix, with the caret at line end and outside code, opens the pane under the caret; each further non-space character narrows it; a space, a caret move off the line, Escape, or blur closes it; the pane shows only while a row matches.
4. Return or a click on a row removes the typed `/query` and applies the row's action; one undo reverts the block and leaves the blank line.
5. `setHeading` and `setList` act on a blank line when the caret alone selects it, so Heading 2 on an empty line writes `## ` from the pane and from the context menu alike.
6. The pane is `Core/MarkdownPM/Menus/BlockMenu.tsx`, drawn from existing UIX parts with no new stylesheet, and mounts only in `MarkdownEditor`.
7. The record: `MarkdownPM.md` carries a `Block Menu:` sub-label under Block Structure; `ContextPM.md`'s Slash Commands item closes; the grounding document leaves the tree; History gains PM-134.

**Acceptance — the whole thing working:** In a Page with the dev build, on an empty line type `/hea`: a pane under the caret shows a Headings section with five rows and nothing else. Press ArrowDown once and Return: the line reads `## ` with the caret after the space and no `/hea` anywhere. Press ⌘Z once: the line is blank. Type `/` inside a code fence: nothing opens. Type `/` then a space: the pane closes. With `npm run test`, `Core/MarkdownPM/Menus/blockMenuFlow.test.tsx` asserts the same four outcomes.

**Forced By** *(what each grounded fact makes mandatory or impossible)*

- `@codemirror/commands`' history joins only `input.type` and `delete` user events (`joinableUserEvent`, dist/index.js:471); two `input` dispatches never merge → one undo step needs the `/query` removal to leave history, dispatched with `addToHistory.of(false)`, and the action's own dispatch is the one history entry. → Task 5.
- `embedInsertAtCaret`, `webpageInsertAtCaret`, and `insertCitation` dispatch for themselves (`Embeds/embedInsert.ts:39-55`, `Citations/citationActions.ts:56-67`) → a composed single transaction cannot serve every row; the history-free removal is the one mechanism that serves all thirteen. → Task 5.
- `selectedLines` (`Input/format.ts:154-179`) pushes only lines whose body is non-blank, so `setHeading` and `setList` return `{ changes: [] }` on an empty line and `applyEditorAction` dispatches an empty change set and returns `true` → the pane cannot rely on the runner's boolean; the blank line must count when the caret alone selects it. → Task 2.
- `Core/Contract/engineGraph.test.ts:15-22` pins the UIX files the engine graph may reach to four `.ts` leaves → the model carries icon names as plain strings; its test, not the model, imports `ICON_NAMES`. → Task 1.
- `applyEditorAction` (`Menus/menu.ts:68`) refuses a string without `EDITOR_ACTION_PREFIX` → the model carries bare actions as `pasteAsMenu.ts` does, and the pick prepends the prefix. → Tasks 1, 5.
- `MenuRowView`'s item branch forwards neither `ref` nor `onMouseDown` (`UIX/Menus/menu-index.tsx:112-127`), and a row must `preventDefault` its mousedown or the editor blurs before the click lands → headings render through `MenuRowView`, rows through `MenuItem` directly, as `AutocompletePane.tsx:53-88` does. → Task 5.
- `picker-base.css.ts:64` composes `menuCompact` into every `PickerMenu` pane → the pane is compact by being a `PickerMenu`; nothing to add. → Task 5.
- The connection pane's caret geometry and `surfaceOf` are module-private in `useConnectionAutocomplete.ts:112-153` → the geometry is hoisted into one exported helper both detectors call. → Task 3.
- `Editor-Internals.md`: a predicate answered on every caret move reads the cached scan → detection takes `docScan(view.state.doc)` and `inCodeAt`, never the document string. → Task 4.

**Inherited Reasoning**

- The previous plan cut the `HTMLElement | MenuAnchor` trigger union from the door for having no writer. The grounding proposed the slash menu as that writer; Nathan's ruling that native menus are unaffected removes the writer again. The union stays cut.
- The grounding recorded `//` as the trigger to avoid "CommonMark's escape." Backslash is the escape; `/` has no Markdown meaning, and the empty-line constraint is what makes a single `/` unambiguous. `//` is retired.
- `EditorHost.menus.slash`, a parity-fixture row in `Desktop/Actions/menu.test.ts`, and the Configuration row edit were all premised on the door. None is built.

**Grounding** *(re-open these; don't cite them)*

- `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts` / `AutocompletePane.tsx` — the caret-anchored pane the editor already owns: geometry from `coordsAtPos`, `PickerMenu` with `manageFocus={false}` and no `onDismiss`, the keymap owning arrows, Return, and Escape, `whenAcOpen` as the guard idiom.
- `Core/MarkdownPM/MarkdownEditor.tsx:204-212, 266, 303-305, 433` — the `Prec.highest` keymap, the blur handler, the read-only-guarded detection call, and the pane mount.
- `Core/MarkdownPM/Menus/menu.ts` — `applyEditorAction` and `editFor`, the one runner every row resolves through.
- `Core/MarkdownPM/Input/format.ts:119, 154-179` — `splitPrefix` and `selectedLines`.
- `Core/Actions/gripMenu.ts:32-39` — `HEADING_LEVELS`, exported, leading with Paragraph.
- `Core/Actions/pasteAsMenu.ts` — the bare-action-plus-prefix pattern and the `citeSeat` gate.
- `Core/MarkdownPM/Citations/citationActions.ts:45` — `citationSeatAt(state)`, the Footnote gate.
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
- MarkdownPM imports nothing from `Core/Session/store`; the editor reaches app state only through `EditorHost`. `Core/Actions` imports no React and nothing from `Core/Interface` or UIX beyond the four pinned leaves.
- Biome formats every write through the hook; a whitespace mismatch on an Edit means re-read and retry, never hand-align.
- One writer on the tree. Commit per task; tick the task's boxes in the same commit. Bundle any unattributed hunks Nathan leaves in a shared file.
- Out of scope everywhere: `Core/Actions/menuActions.ts`, `Core/Session/chromeSlice.ts`, `Core/Interface/Menus/`, `Desktop/`, `Core/MarkdownPM/Tables/CellEditor.tsx`, `Core/MarkdownPM/api.ts`, `Core/MarkdownPM/editorHarness.ts`, `.claude/Features/ConfigurationPM.md`, `Showcase/`.

**Made False** *(each rewrite lands in the commit that falsifies it)*

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `.claude/Features/MarkdownPM.md:74` | "The handle is also where the block's menu lives." | A second block menu exists; this one is the grip's. | 5 |
| `.claude/Features/MarkdownPM.md:72` | "`Core/MarkdownPM/blockHandles.ts`" | The file is `Core/MarkdownPM/Menus/blockHandles.ts`; corrected in the same paragraph edit. | 5 |
| `.claude/ContextPM.md:45` | "**Slash Commands** … triggered via `//` … records what the menu door provides" | The menu ships on `/`, in-app, off the door. The item closes. | 6 |
| `.claude/HandoffPM.md:32` | "the door needs to accept a `MenuAnchor` rect … `EditorHost.menus.slash`" | Neither is built. The Handoff is rewritten by `/handoff` at session end; this line goes then. | 6 |
| `.claude/Planning/Slash Command Menu — Grounding.md` | The whole premise: door, native-or-in-app, `//`. | This plan supersedes it. Deleted. | 6 |

**Dead Vocabulary**

- `Slash Command Menu` → expect 0 in `.claude` and `Core`. Legitimate hits: none.
- `menus.slash` → expect 0.
- Control: `AutocompletePane` → 9 files.

---

### Phase 1 — The catalog and the blank line

#### Task 1: The block menu model

**Requirement:** 1, 2

**Why:** The rows the pane draws are data every renderer could read; keeping them beside the other menu models in `Core/Actions`, React-free and tested on their own, is what lets the pane be a thin view over a filter. The filter lives with the data it filters.

**Now** — `—` (new file). `HEADING_LEVELS` at `Core/Actions/gripMenu.ts:32-39` is the one heading label source; `LIST_KIND_LABELS` at `:41` is private and carries the grip's vocabulary, so it is not reused.

**Becomes**

```ts
// Core/Actions/blockMenu.ts (new) + Core/Actions/blockMenu.test.ts
import type { ActionItem } from './menuModel'
import { HEADING_LEVELS } from './gripMenu'
import type { ListKind } from './gripMenu'

export type BlockMenuAction =
  | `heading:${1 | 2 | 3 | 4 | 5}`
  | `list:${Extract<ListKind, 'bullet' | 'ordered' | 'checkbox'>}`
  | 'block:quote' | 'block:callout' | 'block:code' | 'block:table' | 'block:hr' | 'block:citation'
  | 'block:page' | 'block:webpage'

export interface BlockMenuContext { citeSeat: boolean }
export interface BlockMenuSection { title: string; rows: ActionItem<BlockMenuAction>[] }

// Headings: HEADING_LEVELS.slice(1), icon `heading-${level}`
// Lists: Bullet List `list` · Numbered List `list-ordered` · Task List `list-todo`
// Insert: Blockquote `text-quote` · Callout `message-square-quote` · Code Block `square-code` · Table `table` · Horizontal Rule `separator-horizontal` · Footnote `brackets` (citeSeat only)
// Embed: Internal Page `file-text` · Webpage `globe`
export function blockMenuSections(ctx: BlockMenuContext): BlockMenuSection[]

// '' keeps every section; a word of the label starting with the lowercased query keeps a row; a section with no rows is dropped
export function filterBlockMenu(sections: BlockMenuSection[], query: string): BlockMenuSection[]
```

Actions are bare; the caller prepends `EDITOR_ACTION_PREFIX`. Icons are plain strings.

**Assumed by:** Task 5 (draws the sections, prepends the prefix, gates on `citeSeat`).

**Verify — automated**

- [ ] Red first: the test file asserts section titles `['Headings', 'Lists', 'Insert', 'Embed']`, the label list of each, Footnote present with `citeSeat: true` and absent with `false`, every `icon` a member of `ICON_NAMES` from `@pommora/uix/Symbols/iconNames`, `filterBlockMenu(s, 'hea')` yielding one section of five, `filterBlockMenu(s, 'co')` yielding Insert with Code Block only, `filterBlockMenu(s, 'zz')` yielding `[]`, and `filterBlockMenu(s, '')` identical to the input. Expect module-not-found; then green.
- [ ] `npx vitest run Core/Contract/engineGraph.test.ts` green.
- [ ] Full gate green, exit codes read directly.

**Verify — user**

- [ ] *(none — nothing on screen until Task 5.)*

#### Task 2: A caret on a blank line counts

**Requirement:** 5

**Why:** Heading 2 on an empty line writes nothing today, from the pane-to-be and from the context menu. Fixing the one line resolver both transforms read gives the pane a uniform pick (remove the query, run the action) and repairs the context menu in the same stroke.

**Now** — `rg -F "selectedLines" Core/MarkdownPM/Input/format.ts` → 3 (the declaration and two readers):

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
- [ ] `rg -F "from === to" Core/MarkdownPM/Input/format.ts` → 1 more than before the edit. Control: `rg -F "selectedLines" Core/MarkdownPM/Input/format.ts` → 3.
- [ ] Full gate green, exit codes read directly.

**Verify — user**

- [ ] On an empty line, right-click → Heading ▸ Heading 2 writes `## `; Lists ▸ Bullet List writes `- `.

#### Gate 1 — the catalog stands, the blank line answers

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `Core/Actions/blockMenu*` and `Core/MarkdownPM/Input/format*`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop: Phase 2 opens; Task 2's user box carries to Completion Criteria.

---

### Phase 2 — The pane

#### Task 3: One caret geometry for both panes

**Requirement:** 3

**Why:** The block pane anchors exactly where the connection pane does. One exported helper keeps `surfaceOf` and the rounding in one place, and lets the block detector be a pure function over the scan plus one geometry call.

**Now** — `rg -F "surfaceOf" Core` → 1 file, private; `AcCtl` → 1 file, private:

```ts
// Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts:17-23, 136-151
export interface AcState extends AutocompleteQuery {
  caretX: number
  caretTop: number
  caretBottom: number
  bounds: { left: number; right: number }
}
interface AcCtl { open: boolean; pick: () => void; move: (d: number) => void; close: () => void }
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
// null when coordsAtPos has nothing for pos (the view is unmeasured)
export function caretGeometry(view: EditorView, pos: number): CaretGeometry | null
// detectConnectionQuery: const g = q && caretGeometry(view, sel.head); if (q && g) next = { ...q, ...g }
```

Refactor baseline: `Core/MarkdownPM/Autocomplete/*.test.*` pass count before equals after; `AutocompletePane.tsx` and `CellEditor.tsx` compile unchanged.

**Assumed by:** Task 4 (calls `caretGeometry`), Task 5 (types its ctl as `AcCtl`).

**Verify — automated**

- [ ] `npx vitest run Core/MarkdownPM/Autocomplete` green with the same test count as at the phase base.
- [ ] `rg -F "coordsAtPos" Core/MarkdownPM --glob '!*.test.*'` → the same file set as before the edit (`useConnectionAutocomplete.ts`, `Gestures/blockDrag.ts`, `Gestures/listDrag.ts`), no new caller. Control: `rg -F "caretGeometry" Core/MarkdownPM` → 1.
- [ ] Full gate green, exit codes read directly.

**Verify — user**

- [ ] *(none — behavior-preserving.)*

#### Task 4: The trigger

**Requirement:** 3

**Why:** The pane opens on a grammar, and a grammar is a pure function over the cached scan that can be tested without a mount. Keeping it apart from the hook is what lets the edge cases be asserted as text in, position out.

**Now** — `—` (new file). Readers reused: `splitPrefix` (`Input/format.ts:119`), `parseListMarker` (`Engine/detect.ts:381`), `inCodeAt` and `lineIndexAt` (`Engine/docScan.ts`), `docScan` (`docCache.ts:22`).

**Becomes**

```ts
// Core/MarkdownPM/Menus/blockQuery.ts (new) + Core/MarkdownPM/Menus/blockQuery.test.ts
export interface BlockQuery { query: string; from: number; to: number }
// null inside code, when the caret is not at its line's end, or when the body after splitPrefix and the list marker is not /\S*
// from is the slash's offset; to is the caret; query excludes the slash
export function blockQueryAt(scan: DocScan, caret: number): BlockQuery | null
```

Cases: `'/'` caret 1 → `{ '', 0, 1 }` · `'/hea'` caret 4 → `{ 'hea', 0, 4 }` · `'> /t'` caret 4 → `{ 't', 2, 4 }` · `'- /'` caret 3 → `{ '', 2, 3 }` · `'> [!callout] /'` → from after the head · `'/he a'` → null · `'a/'` → null · `'/hea'` caret 2 → null · a `/` on a line inside a fence → null · `'/'` followed by a second line, caret on line one → the first case.

**Assumed by:** Task 5 (calls it from the update listener).

**Verify — automated**

- [ ] Red first on the ten cases above through `scanOf(text)`; expect module-not-found; then green.
- [ ] Full gate green, exit codes read directly.

**Verify — user**

- [ ] *(none — surfaces in Task 5.)*

#### Task 5: The pane, its hook, and the mount

**Requirement:** 3, 4, 6, 7 (the `MarkdownPM.md` half)

**Why:** This is the deliverable: the pane on screen, filtered by what the user types, picking through the one runner, undone in one step. The hook holds the state and the ctl exactly as the connection hook does, so the keymap and the blur handler treat the two panes the same way.

**Now** — `rg -F "whenAcOpen" Core` → 3 files; `rg -F "AutocompletePane" Core UIX Desktop .claude` → 9 files:

```tsx
// Core/MarkdownPM/MarkdownEditor.tsx:204-212
Prec.highest(
  keymap.of([
    { key: 'ArrowDown', run: whenAcOpen(acCtl, (c) => c.move(1)) },
    { key: 'ArrowUp', run: whenAcOpen(acCtl, (c) => c.move(-1)) },
    { key: 'Enter', run: whenAcOpen(acCtl, (c) => c.pick()) },
    { key: 'Escape', run: whenAcOpen(acCtl, (c) => c.close()) },
  ]),
),
// :266  blur: () => { setAc(null); return false },
// :303-305  if ((u.docChanged || u.selectionSet) && !u.state.readOnly) detectConnectionQuery(u.view, setAc, true)
// :433  <AutocompletePane ac={ac} candidates={candidates} index={acIndex} onPick={commit} />
```

**Becomes**

```ts
// Core/MarkdownPM/Menus/useBlockMenu.ts (new)
export interface BlockMenuState extends BlockQuery, CaretGeometry { citeSeat: boolean }
export function detectBlockQuery(view: EditorView, set: (s: BlockMenuState | null) => void): void
// sel.empty && blockQueryAt(docScan(doc), sel.head) && caretGeometry → state with citeSeat = citationSeatAt(view.state); else null

export function useBlockMenu(viewRef: RefObject<EditorView | null>): {
  state: BlockMenuState | null
  setState: (s: BlockMenuState | null) => void
  sections: BlockMenuSection[]       // filterBlockMenu(blockMenuSections({ citeSeat }), query), memoized on query and citeSeat
  index: number                      // flat across sections, clamped to the row count
  pick: (action: BlockMenuAction) => void
  ctl: RefObject<AcCtl>              // open = state !== null && sections has a row
}
// pick: dispatch({ changes: { from, to, insert: '' }, annotations: Transaction.addToHistory.of(false), userEvent: 'input' })
//       then applyEditorAction(view, EDITOR_ACTION_PREFIX + action); state clears through the listener re-detecting a blank line
```

```tsx
// Core/MarkdownPM/Menus/BlockMenu.tsx (new)
export function BlockMenu(props: {
  state: BlockMenuState | null
  sections: BlockMenuSection[]
  index: number
  onPick: (action: BlockMenuAction) => void
}): React.JSX.Element
// PickerMenu glass="window" open={live} anchorX/anchorY/anchorHeight/bounds origin="center" manageFocus={false} contentClassName="mdpm-block-menu"
// MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT} className="mdpm-autocomplete-slot"
// per section: <MenuRowView row={{ kind: 'heading', label: title, caps: true }} /> then MenuItem rows with leading Icon, selected, ref={keepInView}, onMouseDown preventDefault → onPick
// the matched word-prefix wrapped in .mdpm-autocomplete-match; the last live state held through the close as AutocompletePane does
```

```tsx
// Core/MarkdownPM/MarkdownEditor.tsx
// :175  const block = useBlockMenu(viewRef)
// :204-212  one more entry per key after the connection entry: whenAcOpen(block.ctl, …)
// :266  blur: () => { setAc(null); block.setState(null); return false }
// :303-305  the same guard also calls detectBlockQuery(u.view, block.setState)
// :434  <BlockMenu state={block.state} sections={block.sections} index={block.index} onPick={block.pick} />
```

```md
<!-- .claude/Features/MarkdownPM.md, ### Block Structure -->
<!-- :72 path → Core/MarkdownPM/Menus/blockHandles.ts · :74 "The handle is also where the grip menu lives." -->
<!-- after the table: -->
**Block Menu:** Typing `/` as the only content of a line opens a pane under the caret listing the blocks the editor can make — Headings, Lists, Insert, and Embed — filtered by whatever follows the slash, so `/hea` leaves the five headings. Return or a click removes the typed query and writes the block through the same action the context menu runs; one undo reverts it. The pane is the editor's own, drawn in-app whatever Use Native Menus says, and never opens inside code or a table cell.
```

**Assumed by:** Task 6 (History names these files).

**Verify — automated**

- [ ] Red first in `Core/MarkdownPM/Menus/blockMenuFlow.test.tsx` (mount through `editorHarness`, `coordsAtPos` spied as `connectionCommit.test.tsx` does, keys sent to `contentDOM`): typing `/` on the empty line mounts `.mdpm-block-menu` with four headings and thirteen rows minus Footnote where `citationSeatAt` is false; typing `hea` leaves one heading and five rows; ArrowDown then Enter leaves the document `## ` and no `.mdpm-block-menu`; one `undo(view)` leaves `''`; typing `/` then a space unmounts the pane; Escape unmounts it and a further character reopens it; `/` typed inside a fence never mounts it; a pick of Table leaves the serialized 3×3 table with no `/`. Expect module-not-found; then green.
- [ ] `rg -F "Session/store" Core/MarkdownPM --glob '!*.test.*'` → 0. Control: `rg -F "editorHost" Core/MarkdownPM --glob '!*.test.*'` → ≥ 3.
- [ ] `rg -F "BlockMenu" Core/MarkdownPM/Tables` → 0. Control: `rg -F "AutocompletePane" Core/MarkdownPM/Tables` → 1.
- [ ] `rg -F "grip menu lives" .claude/Features/MarkdownPM.md` → 1; `rg -F "Block Menu:" .claude/Features/MarkdownPM.md` → 1. Control: `rg -F "Block Structure" .claude/Features/MarkdownPM.md` → 1.
- [ ] Full gate green, exit codes read directly; `npm run lint` clean including the wrapped-comment scan.

**Verify — user**

- [ ] `/` on an empty line opens the pane under the caret; sections read Headings, Lists, Insert, Embed with their icons; the pane is compact and its width matches the connection pane's.
- [ ] `/hea` filters to the five headings; `/co` leaves Code Block; the matched letters read emphasized.
- [ ] ArrowDown, ArrowUp, Return, Escape, click, and blur behave as the Goal says; a space closes it.
- [ ] A pick of each of the thirteen rows writes the block with no `/` left, and ⌘Z once leaves the blank line.
- [ ] `> /` and `- /` open it; `/` mid-sentence and `/` inside a fence do not.

#### Gate 2 — the pane on screen · **declared stop**

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `Core/MarkdownPM/Menus/`, `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts`, `Core/MarkdownPM/MarkdownEditor.tsx`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] **Declared stop.** Execution halts until Nathan closes Task 5's user boxes and Task 2's carried box, or redirects the layout.

---

### Phase 3 — The record

#### Task 6: Context, History, and the grounding

**Requirement:** 7

**Why:** Three documents describe a menu that isn't the one that shipped; left standing, the next session builds the door version. The History entry is how the arc is found later.

**Now** — `rg -F "Slash Command Menu" .claude Core` → 3 files (`ContextPM.md`, `HandoffPM.md`, the grounding itself); `.claude/HistoryPM.md` index tops at PM-133.

**Becomes**

```md
<!-- .claude/ContextPM.md:45 — the Slash Commands item is removed from Next-Feature Candidates -->
<!-- .claude/HistoryPM.md — index row `| 09-09-2026 | PM-134 | The Block Menu |` and an entry in History-Format naming Core/Actions/blockMenu.ts, Core/MarkdownPM/Menus/blockQuery.ts, useBlockMenu.ts, BlockMenu.tsx, the selectedLines fix, and the history-free removal -->
<!-- .claude/Planning/Slash Command Menu — Grounding.md — deleted -->
```

`HandoffPM.md:32` is left to `/handoff`, which rewrites the whole document at session end.

**Verify — automated**

- [ ] `rg -F "Slash Command Menu" .claude Core` → 1 (`HandoffPM.md`, until `/handoff`). Control: `rg -F "Block Menu" .claude` → ≥ 3.
- [ ] `rg -F "PM-134" .claude/HistoryPM.md` → 2 (index row and heading).
- [ ] `test ! -e ".claude/Planning/Slash Command Menu — Grounding.md"` exits 0.
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

- [ ] **Phase 1** — The catalog and the blank line · base `<commit>`
  - [ ] Task 1 — The block menu model · `<commit>`
  - [ ] Task 2 — A caret on a blank line counts · `<commit>`
- [ ] **Phase 2** — The pane · base `<commit>`
  - [ ] Task 3 — One caret geometry for both panes · `<commit>`
  - [ ] Task 4 — The trigger · `<commit>`
  - [ ] Task 5 — The pane, its hook, and the mount · `<commit>`
- [ ] **Phase 3** — The record · base `<commit>`
  - [ ] Task 6 — Context, History, and the grounding · `<commit>`

### Rulings

- 09-09-2026, Nathan: Use Native Menus is unaffected; the block menu always draws in-app.
- 09-09-2026, Nathan: the four-section layout as proposed; Format marks omitted.
- 09-09-2026, Nathan: `/` is the trigger, not `//`.
- 09-09-2026, Claude (routine, disclosed): undo after a pick leaves the blank line rather than restoring `/query`; the typed query was a command, not content, and it is the one mechanism that gives every row a single undo step.
- 09-09-2026, Claude (routine, disclosed): the blank-line no-op is fixed in `selectedLines` for the caret-only case, repairing the context menu's Heading and Lists rows on an empty line as well.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- Chord display on rows, once a display speller for the command table exists (the Shortcuts settings pane candidate in Context).
- A Format section, if Nathan wants the inline marks reachable from `/`; one more section in `blockMenuSections`.

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
- [ ] `blockMenuFlow.test.tsx` asserts the single undo, the removal, the filter, the fence, and the space.

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
