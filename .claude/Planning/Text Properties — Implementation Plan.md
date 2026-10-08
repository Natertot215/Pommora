## Text Properties — Implementation Plan

**DATE:** 10-07-2026
**STATUS:** Ratified 10-07-2026 — runs unattended
**SOURCE:** *Text Properties — Decisions & Intention* (ratified 10-07-2026); grounded at `8ee6f8cf5`.

### Context

Pommora's property catalog holds eleven types and no free-typed one; a Select stands in for it today. This plan adds **Text**: a definition of type `text` whose value is one free-typed string, written as a bare YAML string under its key, edited on every value surface the other types already share, and multi-line only inside **TextPane**, a dropdown pane that mounts MarkdownPM's `'cell'` scope. The decision log settled what Text does; this plan was written by opening the code at every point the design touches and shaping each change around what is there. Where the code offered a simpler seat than the log's stated mechanism, the plan takes the seat and records the departure under *§Deviations*.

The work touches the catalog (`Core/Properties`), the value surfaces (`Core/Properties/Cells`, `Core/Views/Table`, `Core/Views/Cards`, `Core/Properties/PropertyPanel.tsx`), one UIX icon, MarkdownPM (a `text` scope holding the inline vocabulary, and the pane), the content index and rename cascade (`Core/Index`, `Core/Nexus/cascade.ts`), five documents, and one drive script under `.claude/Scripts` that proves every interaction against the built app. `Core/Properties` begins to import from `Core/MarkdownPM` (the resting renderer and the pane); MarkdownPM imports nothing from Properties at runtime, so no cycle forms. It leaves alone UIX's components, the Trash, the delete cascade, the Matrix, `TextPicker`, `BrowseButton`, `LinkCell`'s hand-rolled render (one fix excepted), and every prospect the log parked: Wrapped Table Cells, Edit In Place, LinkCell On The Shared Renderer, Recognize Foreign Frontmatter.

### Summary

After this plan, a user can create a **Text** property and type into it anywhere a value shows: a table cell, a card, the Properties panel, or the Properties ▸ menu. Typing is single-line, like a Number; a small pen beside the value opens a pane where the text can run to many lines, hold bold, italic, highlights, and `[[links]]`, and saves when it closes. A link written inside the text behaves like a link in a page body: it colors, opens, and renames with its page, and if the page is deleted the text keeps the words. Files other apps wrote — a `description:` line, a number, a list — show as their text and stay on disk exactly as written until the user edits them. Text filters and sorts the way Link does, and never groups or seeds new pages.

What it achieves: the one missing basic type lands with no special cases — every switch gains the same kind of arm its siblings have, every surface opens the same inline field, and the pane is the editor Pommora already has, in the scope a table cell already uses.

#### Constraints

- **Gates:** `npm run typecheck` · `npm run test` · `npm run lint`, from the repo root; each exits 0; `test` ends in a pass count. Biome reformats every TS/CSS/JSON write, so an Edit failing on whitespace means it reformatted — re-read and retry.
- **Frozen:** `Core/Contract/bridge.ts` gains no channel (verify at each phase's close: `git diff --stat 8ee6f8cf5..HEAD -- Core/Contract/bridge.ts` is empty). `ValueIntent` gains no kind (one is renamed — Task 2.3). `RelationKind` gains no member. `MarkdownScope` gains `'text'` (Task 4.1) and nothing else. `PickerMenu`, `TextPicker`, `BrowseButton`, `EMPTY_PAGE_TEXT`, `EditableInput`, `InputField` do not change.
- **Host-run halves import no renderer:** `properties.ts`, `propertyValue.ts`, `pageFile.ts`, `indexSeed.ts`, `cascade.ts`, `registryProperty.ts` stay React-free; `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` stay green.
- **The decode rule (B-2):** a Text value is written plain and unquoted wherever yaml allows; a foreign raw under a Text key — a number, a boolean, a list, a map, an unquoted `[[Page]]` — reads as its text and keeps its shape on disk on every path (open, adjacent write, frozen Trash restore) until the user's first edit replaces it; its bytes hold wherever the writer's own spelling matches the author's (an unpadded flow collection does, a padded one is re-spelled unpadded, as every key's always has been re-spelled by the writer). A blank raw (`null`, `''`, `[]`) is blank, as it is for every type.
- **Siblings, not specials:** every compile-forced arm joins the sibling group named in its task; no `text`-only predicate anywhere outside the Text arm itself. A sibling that is wrong changes everywhere (the `[[#Heading]]` fix lands in `LinkCell` too).
- **Comments:** none that explain what the code shows; file-level sectioning or a non-obvious constraint only. User-facing copy added by this plan: the label **Text**, the placeholder **Begin typing.**, the aria-labels **Open in TextPane** and **Save and close**; nothing else.
- **Prospects stay out:** no table wrap flag, no edit-in-place cell editor, no `LinkCell` retire, no path from a found key to a definition. Honor the don't-foreclose notes: the renderer draws every line and CSS clips (D-3); the pane's wiring stays plain (F-1); the renderer takes a string and a connections accessor (H-1).
- **Tests** pinpoint expectations; no production code exists as a test fixture. Every task reports its line-count delta (comments and tests excluded).
- **Decisions tagged `[CONFIRMED]`** in the log are Nathan's product rulings; the ones this plan departs from are ruled in *§Deviations*. An executor that finds another impossible takes the sibling behavior, lands it, and records the departure there.
- **Unattended:** the run goes end to end without Nathan — no task, checkpoint, or review waits on him. A judgment call takes the simplest reading, lands, and is recorded in *§Deviations*; nothing is deferred, narrowed, or left for a later session. The one precondition is granted before the run starts: Accessibility permission for the terminal, which the drive's native-menu steps need.

#### Baseline

Recorded at ratification, after `git status` shows only this plan and Nathan's own edits.

- Gates: green at `8ee6f8cf5` — `npm run typecheck` clean · `npm run test` → 519 files, 7397 passed, 2 skipped · `npm run lint` → 1420 files, no fixes.
- `sed -n '/^const typeIds = z.enum/,/^])/p' Core/Properties/properties.ts | grep -c "^  '"` (the `typeIds` entries) → 11 — adds 1
- `grep -r "case 'link'" Core/Properties Core/Views Core/Actions --include='*.ts' --include='*.tsx' | wc -l` → 17 — unchanged (Text joins Link's groups; it adds `case 'text'` lines, never removes Link's)
- `grep -rc "numberPicker" Core --include='*.ts' --include='*.tsx' | grep -v ':0'` → 5 files (`PropertyPanel.tsx`, `valueClick.test.ts`, `valueClick.ts`, `TableView.tsx`, `CardValue.tsx`) — retires to 0 (Task 2.3)
- `wc -l Core/MarkdownPM/Tables/CellEditor.tsx` → 320 — unchanged
- `grep -n "INDEX_GENERATION = " Desktop/Store/ddl.ts` → 10 — becomes 11 (Task 3.1)
- `git diff --stat 8ee6f8cf5..HEAD -- Core/Contract/bridge.ts` → empty — unchanged
- `ls .claude/Scripts | wc -l` → 11 — adds 1 (`Text Property Drive/`)

**START** 2026-10-08T02:35:22Z
**END:** `<same, as the report is given>`

#### Names

Every name, file, and location this plan introduces, for Nathan to change before execution.

| Name                                                                             | What                                                                                                                                                         | Where                                                                                                     | Sibling it sits beside                                                  |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `text` · **Text**                                                                | The type id and its label                                                                                                                                    | `Core/Properties/properties.ts` · `Cells/PropertyTypes.tsx`                                               | `link` · **Link**                                                       |
| `text-align-start`                                                               | The curated icon name                                                                                                                                        | `UIX/Symbols/index.tsx`                                                                                   | `text-align-justify` (Title's)                                          |
| `yamlInline`                                                                     | One helper: a parsed yaml value re-spelled in flow form                                                                                                      | `Core/Files/pageFile.ts`                                                                                  | `splitFrontmatter`, `mergeFrontmatter`                                  |
| `TextCell`                                                                       | The resting renderer of a Text value (text, inline marks, connections, the pen)                                                                              | `Core/Properties/Cells/TextCell.tsx` (new)                                                                | `LinkCell.tsx`, `CheckboxGlyph.tsx`                                     |
| `cell-text` · `cell-text-host`                                                   | The renderer root's class (the kit's ellipsis cap, one line tall) and its reveal-host row                                                                    | `UIX/Table/table.css`                                                                                     | `.cell-text-scroll`, `.cell-chips`                                      |
| `textFromEdit`                                                                   | The field's commit for a Text value: the typed first line rejoined with the lines behind it                                                                  | `Core/Properties/parseEditorValue.ts`                                                                     | `linkValueFromEdit`                                                     |
| `glanceHost`                                                                     | The `{ arm, cancel, close, contains }` literal every editor host already builds, exported once                                                               | `Core/Interface/Glance/glanceAction.ts`                                                                   | `glanceLink`, `closeGlance`                                             |
| `valueLinks`                                                                     | The links inside every string value that isn't one whole connection, read as a body's are                                                                    | `Core/Connections/scan.ts`                                                                                | `frontmatterMentions`, `linksIn`                                        |
| `patchOf`                                                                        | The cascade's one frontmatter patch, split by a key's type: Link whole-value, Text as prose, others nothing                                                  | `Core/Nexus/cascade.ts` (local to `renameCascade`)                                                        | `rewrite`, `spaceMoved`                                                 |
| `holder`                                                                         | The page a value sits on (`undefined` on a Space), computed once in `Cell` and handed to `TextCell` and `LinkCell` for a bare `[[#Heading]]`                 | `Core/Properties/Cells/Cell.tsx`                                                                          | `def`, `dt`                                                             |
| `onPane`                                                                         | `Cell`'s optional callback the pen presses, handed the pen's anchor                                                                                          | `Core/Properties/Cells/Cell.tsx`                                                                          | `commit`, `empty`                                                       |
| `pane`                                                                           | `RowCellApi`'s member the table row hands the pen                                                                                                            | `Core/Views/Table/TableView.tsx`                                                                          | `overlay`, `commit`                                                     |
| `popover`                                                                        | The renamed `ValueIntent` kind — "open this type's popover at the value" (Number's bar, Text's pen); was `numberPicker`                                      | `Core/Properties/Pickers/valueClick.ts`                                                                   | `edit`, `picker`, `dateTime`                                            |
| `connections`                                                                    | `ValueContext`'s connections accessor, built once per view host                                                                                              | `Core/Properties/valueContext.ts`                                                                         | `assets`                                                                |
| `TextPane` · `TextPaneEditor`                                                    | The pane shell (the `PickerMenu` and its ×) and the editor that mounts and unmounts with the pane's body; one file and its stylesheet                        | `Core/Properties/Pickers/TextPane.tsx` (new) + `text-pane.css` (new)                                      | `NumberValuePicker.tsx`; `glance-pane.css` for the CodeMirror overrides |
| `--row-value-reach`                                                              | How far a row's trailing value may reach toward its label (`75%`, a KNOB); one rule on every `MenuItem` trailing slot, mirrored on the Standard card's value | `UIX/Menus/menu-row.css.ts` (the `:root` row vars) · `Core/Views/Cards/cards-view.css`                    | `--row-size`, `--row-line`; the `detail` slot's `55%` cap               |
| `text` (a `MarkdownScope`) | MarkdownPM's third scope: the inline vocabulary (bold, italic, highlight, code, links) and no block vocabulary — no lists, headings, quotes, fences, tables | `Core/MarkdownPM/Engine/detect.ts` and every switch on the scope | `'page'`, `'cell'` |
| Catalog position                                                                 | `text` is the **first** entry of `typeIds`, `PROPERTY_TYPES`, and so the New Property menu                                                                   | `properties.ts`, `PropertyTypes.test.ts`                                                                  | —                                                                       |
| Column width                                                                     | Text takes Link's `{ min: 100, default: 140, max: 350 }`                                                                                                     | `Core/Views/Table/useColumns.ts`                                                                          | `link`                                                                  |
| `INDEX_GENERATION`                                                               | 10 → 11: the first open after upgrade re-extracts every page once                                                                                            | `Desktop/Store/ddl.ts`                                                                                    | —                                                                       |
| **Text Property Drive** · `live-drive.mjs`                                       | The CDP drive that seeds, exercises, asserts, and screenshots every Text interaction against the built app, by phase group                                   | `.claude/Scripts/Text Property Drive/live-drive.mjs` (new) + its paragraph in `.claude/Scripts/README.md` | `Option Picker Drive/live-drive.mjs`                                    |
| **Drive Notes** · **Drive Link** · **Drive Bar** · the `Drive …` pages and views | The drive's seed on `~/Test`'s `Collection A/Set Alpha`, restored from backup when the run ends                                                              | the drive                                                                                                 | the Option Picker Drive's `Drive Select` family                         |

#### Implementation Process

One `opus-medium` agent implements Phase 1 and one `opus-high` agent each later phase; `opus-high` reviews each phase once it lands (two in parallel on Phase 1, one on the rest), briefed as *§Final Verification* says. Every Review Checkpoint is the orchestrator's own: it runs the drive Task 1.1 builds with the groups the landed phases cover, reads the screenshots the run wrote, and ticks the checkpoint only on what it saw. Phases 2 and 3 run in parallel and share one checkpoint after both land.

- [x] **Phase 1** — The Catalog & Value Path — `b80a7b12a`, +99 / −23 (27 files, tests excluded; the drive's 750 lines beside it)
  - [x] Task 1.1 The drive
  - [x] Task 1.2 The catalog entry and the decode
  - [x] Task 1.3 Label, icon, settings frame
  - [x] Task 1.4 The cell: resting render, click, menu, style, width
  - [x] Task 1.5 The pipeline arms
  - [x] Task 1.6 The plain field's first line
  - [x] Review Checkpoint — drive group 1 (29/29; seven screenshots read; two opus-high reviews folded)
- [x] **Phase 2** — The Surfaces: live connections, the pen, one popover intent `[Parallel with Phase 3]` — `f1bf08f74`, +178 / −63 and `TextCell.tsx` 65 lines (22 files, tests excluded)
  - [x] Task 2.1 `TextCell`: live connections, the pen, and the glance literal defined once
  - [x] Task 2.2 The clip, the reveal host, and Compact's chrome
  - [x] Task 2.3 One popover intent on every surface
  - [x] Task 2.4 `LinkCell`'s own-page heading
  - [x] Task 2.5 A row's value reach, stated once
- [x] **Phase 3** — Connections Inside a Value: index and cascade `[Parallel with Phase 2]` — `5aabe6707`, +110 / −63 (8 files, tests excluded)
  - [x] Task 3.1 The index reads the links inside every value
  - [x] Task 3.2 The rename cascade is type-aware
  - [x] Task 3.3 The Spaces heading gate
- [x] Review Checkpoint — Phases 2 and 3, drive groups 1–3 (72/72 after the glance fix; 21 screenshots read; one opus-high review each, folded)
- [x] **Phase 4** — TextPane — +379 / −72 (24 files, tests excluded; `TextPane.tsx` 163 and `text-pane.css` 24 of it)
  - [x] Task 4.1 The `text` scope
  - [x] Task 4.2 TextPane
  - [x] Review Checkpoint — drive groups 1–4 (101/101 before the review, 105/105 after its folds; the parity pair and six pane screenshots read)
- [x] **Phase 5** — Documentation — eight documents, +35 / −34 prose; one opus-high review folded
  - [x] Task 5.1 The five documents
- [ ] **Final Verification** — the three final agents, then the orchestrator's own pass and the report

---

### Phase 1 — The Catalog & Value Path

**GOAL:** Text exists everywhere the type system reaches, correctly and inertly: it is creatable, decodes and encodes by rule B-2, filters and sorts as Link does, never groups or seeds, renders its text at rest, and edits its first line in the shared inline field. Every compile-forced arm lands here so the gates are green before any surface work, and Phases 2 and 3 build on a type that already behaves.

#### Task 1.1

**BEFORE:** `.claude/Scripts/Option Picker Drive/live-drive.mjs` drives the option picker against a built app on its own userData and debug port, with `~/Test` backed up and restored, native menus chosen through System Events, a frontmost guard before any keystroke, and a screenshot per state; `editor-parity/run.mjs` records a rendered line as runs of computed style (`SNAP`). No drive covers a value type end to end.

**TASK**

- [ ] Write `.claude/Scripts/Text Property Drive/live-drive.mjs` on the precedent's skeleton (`connect`, `ask`, `check`, `mouseClick`, `chooseNative`, `shot`, the seed, `restore`), taking the phase groups to run as arguments — `node live-drive.mjs 1 2`; none runs all four — so each Review Checkpoint runs the groups its landed phases cover. Every step below is written now, from the tasks' VERIFY lines; a group whose phase hasn't landed is simply not asked for.
- [ ] Add its paragraph to `.claude/Scripts/README.md` beside the Option Picker Drive's: what it covers, how it's run, where the screenshots land (`$POMMORA_DRIVE_SHOTS`, else the temp directory's `text-property-shots`), and the Accessibility permission its native-menu steps need.

The drive's parts, in prose rather than a hunk; the implementer looks up each channel's shape in `bridge.ts` and each selector in the component it names.

**Seed** on `Collection A/Set Alpha`: a Text property **Drive Notes**, a Link property **Drive Link**, and a Number property **Drive Bar**; views **Drive Table** (table, Drive Bar styled `look: 'bar'` through `column_styles`), **Drive Cards** (cards, `format: 'standard'`), and **Drive Compact** (cards, `format: 'compact'`), each showing the three properties; pages **Drive Target** (body: `## Setup`, then the SHOWCASE lines as prose, so the page renders the very text the pane will; Drive Link `[[#Setup]]`; Drive Notes `see [[#Setup]] first`), **Drive Prose** (Drive Notes = SHOWCASE), **Drive Empty** (no value), **Drive Raw** and **Drive List** (written on disk after creation as `Drive Notes: 42` and `Drive Notes: [milk, eggs, bread]`), **Drive Foreign** (`description: see [[Drive Target]] first`, with no definition named description), and **Drive Items** (Drive Notes = `- milk\n- eggs` — the yaml-conflict case: a string that spells a list and must stay one, drawn as the literal text). SHOWCASE is:

```
see [[Drive Target]] and [[Drive Target#Setup]], then [[Nowhere]]
milk with **bold** and _italic_
eggs with ==🔴a highlight🔴==
a third line, plain
```

**Group 1 — the catalog and the field** (Phase 1). Drive Raw's cell reads `42` and Drive List's `[milk, eggs, bread]`; after a `setProperty` on another key of each page the files still hold `42` and the flow list. Click Drive Empty's cell, type `opus`, Enter → `Drive Notes: opus`; the same with `42` on Drive Raw → `Drive Notes: "42"`. Click Drive Prose's cell → the field holds the first SHOWCASE line; blur untouched → the file's bytes are unchanged; type a new first line, Enter → the file holds it over the untouched lines as a `|-` block. Drive Items: the cell shows the literal `- milk` (no `.md-list-*` element inside `.cell-text`) and the field holds it; typing `- oats` lands `|-` over `  - oats` and `  - eggs`; emptying the field lands `Drive Notes: "- eggs"`; typing `1. a` into an emptied value lands `Drive Notes: 1. a` plain; whitespace alone clears the key. `views:save` a sort on Drive Notes → the table's rows read A → Z; a `contains` filter on `milk` leaves Drive Prose and Drive Items. Right-click Drive Prose's cell → **Clear** through `chooseNative` → the cell empties and the key is gone from disk; `setProperty` restores the value for the groups behind. Screenshots: `table-filled-empty`, `cards-standard`, `cards-compact`, `panel-filled`, `panel-empty`, `field-open`, `cell-menu`.

**Group 2 — the surfaces** (Phase 2). Drive Prose's value holds `.md-connection-resolved` for Drive Target and `.md-connection-phantom` for Nowhere on the table, both card views, and the panel; a click on `Drive Target` opens the page (the active tab's title); ⌘-click opens a second tab; a dwell raises the glance (its portal appears beside the value); hovering the value shows the pen (`[aria-label="Open in TextPane"]` at non-zero opacity) whose box doesn't intersect the text's, and the text's computed `text-overflow` is `ellipsis` at rest on Drive Prose (prose) and on Drive Items's first `[data-cell-line]` (a list); a press opens the popover (`[data-picker-portal]:has(input)` — the first portal is `PickerMenu`'s full-window shield) anchored at the value: within its horizontal span and within 8px below its box, as Number's bar popover sits, with no glance up. The same on a Standard card, a Compact card (the flow span's computed border is the field's — a non-zero width in the kit's border color — and it stands no taller than its neighbors), and a panel row, where Drive Notes's row and Drive Link's row have the same `getBoundingClientRect().height` and their values the same computed `font-family`, `font-size`, and `line-height`. The reach (Task 2.5): in the panel and on the Standard card, Drive Prose's label "Drive Notes" is whole (`scrollWidth <= clientWidth`) and its value's box is at most 75% of the row's content box, while Drive Raw's `42` sits flush at the row's right edge. Drive Bar's bar still opens its popover. Drive Target's Drive Link `[[#Setup]]` reads `#Setup` and a click brings the heading into view. Screenshots: `cell-hover-pen`, `cell-popover`, `glance`, `cards-standard-pen`, `cards-compact-pen`, `panel-pen`, `panel-popover`, `link-heading`.

**Group 3 — index and cascade** (Phase 3). `mutate` `rename` Drive Target → Drive Renamed: Drive Prose's file reads `[[Drive Renamed]]` and `[[Drive Renamed#Setup]]`, Drive Foreign's `description` still reads `[[Drive Target]]`; `schema:add` a Text property named **description** and rename back → Drive Foreign follows this time. `mutate` `renameHeading` on Drive Target (`Setup` → `Intro`, with its own path as the settled page) → Drive Target's own Drive Notes reads `see [[#Intro]] first` (the `skipRel` reading: its body is left to the editor, its frontmatter takes the patch) and Drive Prose reads `[[Drive Target#Intro]]`; then rewrite `## Intro` → `## Setup` in Drive Target's file on disk → the watcher's seen-rename cascade (`cascadeSeen`) carries both values back. `mutate` `delete` Drive Target → Drive Prose's sentence is unchanged on disk and its cell shows `.md-connection-phantom` for it; `mutate` `restore` → resolved again. Screenshots: `phantom-after-delete`, `resolved-after-restore`.

**Group 4 — TextPane** (Phase 4). The pen on Drive Prose's table cell opens `.text-pane` with its `.cm-editor` focused and the caret at the end; the body shows the four SHOWCASE lines with bold, italic, the highlight, and the two connection classes, and Drive Items's `- milk` lines as literal text with no `.md-list-*` element. Shift-Enter at the end of a line writes a line break and the caret sits on the new line; Enter saves and closes (the file holds the typed document, `.text-pane` is gone); Tab inserts nothing and `document.activeElement` stays inside `.text-pane` throughout. Typing `[[Dri` opens the autocomplete inside the pane body's box; a press on its row inserts `[[Drive Target]]` and the pane stays open. ⌘B wraps a selection in `**`; `Input.insertText` of `https://example.com` lands as the Default Link Format writes it. Right-click in the body → the native menu (its groups are the scope's: Insert Link and Format, no Lists — proven by Task 4.1's test; the screenshot is for the orchestrator's eyes). Escape saves and closes → the file holds the typed document as `|-`; reopen → the pane shows it, and Escape without typing leaves the file's mtime unchanged (no second write); × saves; a press outside saves; a press on another cell is taken by the dismissal shield — the pane saves and closes and nothing else opens. The Properties ▸ Drive Notes leaf from Drive Prose's row menu opens the pane; the Cards chooser's Drive Notes entry opens it on Drive Empty. A typed `- a` lands as `"- a"` and `- a
- b` as `|-`, and each reopens as the same literal lines. Parity: open Drive Target and record each SHOWCASE line of its body with `SNAP`'s style tuples (`color|fontWeight|fontStyle|fontSize|fontFamily|decoration|fill|verticalAlign` per run, the line's height) and the drawn caret's (`.caret-bar`, which `inlineSurface`'s `customCaret` draws on both surfaces) computed background color, width, and height; record the same from the pane; the two records must be identical, line for line, `.cm-content`'s padding aside. Screenshots: `pane-open`, `pane-break` (after Shift-Enter), `pane-autocomplete`, `pane-format-menu`, `pane-from-menu`, `pane-from-chooser`, `parity-page`, `parity-pane`.

**VERIFY**

- [ ] `node ".claude/Scripts/Text Property Drive/live-drive.mjs" 1` against HEAD before Task 1.2 fails at the seed (`schema:add` refuses type `text`) and still restores `~/Test`; the backup, the own userData and port (9353), SIGINT restore, and the frontmost guard before any keystroke are the precedent's.
- [ ] Every step asserts a file, a DOM fact, or a channel result; no step is proven by a screenshot alone. The screenshots are for the orchestrator's eyes at each checkpoint.
- [ ] A later phase's implementer corrects a drive selector that mis-targets the DOM it landed, without moving the check's intent; a check that can't be met is a defect in the phase, not in the drive.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Task 1.2

**BEFORE:** Eleven type ids; `decodeValue` has no free-string arm; `writtenSpelling` preserves raw spelling for a checkbox only; yaml is imported by `pageFile.ts` alone.

**TASK**

- [ ] Write the decode, spelling, and reconcile tests and watch them fail.
- [ ] Add `text` first in `typeIds` and `PROPERTY_TYPES`; add the `text` value to the union; decode a string as itself and any other raw as its inline yaml text; keep a non-string raw whose text equals the value; encode and blank as Link does.

```ts|diff
--- a/Core/Files/pageFile.ts
+++ b/Core/Files/pageFile.ts
@@ imports @@
-import { type Document, type Pair, type ParsedNode, parseDocument, isMap } from 'yaml'
+import { type Document, type Pair, type ParsedNode, parseDocument, isMap, stringify } from 'yaml'
@@ after stampedId @@
+/** A parsed yaml value as one line of yaml — `[milk, eggs, bread]`, `{x: 1}`, `[[Page]]`, `42` — the text a free-typed key shows for a shape it didn't write. */
+export const yamlInline = (raw: unknown): string =>
+  stringify(raw, { collectionStyle: 'flow', flowCollectionPadding: false, lineWidth: 0 }).trimEnd()
```

```ts|diff
--- a/Core/Properties/properties.ts
+++ b/Core/Properties/properties.ts
@@ typeIds @@
 const typeIds = z.enum([
+  'text',
   'number',
   'checkbox',
@@ PROPERTY_TYPES @@
 export const PROPERTY_TYPES: Readonly<Record<PropertyType, TypeSpec>> = {
+  text: { kind: 'text', origin: 'user' },
   number: { kind: 'number', origin: 'user' },
@@ pickKindOf @@
     case 'number':
     case 'checkbox':
     case 'dateTime':
     case 'link':
     case 'file':
+    case 'text':
     case undefined:
       return null
```

```ts|diff
--- a/Core/Properties/propertyValue.ts
+++ b/Core/Properties/propertyValue.ts
@@ imports @@
 import { heldValue, landValue, writeTarget } from '../Files/heldKeys'
+import { yamlInline } from '../Files/pageFile'
@@ propertyValue @@
 export const propertyValue = z.discriminatedUnion('kind', [
+  z.object({ kind: z.literal('text'), value: z.string() }),
   z.object({ kind: z.literal('number'), value: z.number() }),
@@ decodeValue @@
     case 'link':
     case 'dateTime':
       return typeof raw === 'string' ? { kind, value: raw } : NULL_VALUE
+    // Free text reads whatever the file holds: a string as itself, any other shape as the yaml that spells it.
+    case 'text':
+      return { kind, value: typeof raw === 'string' ? raw : yamlInline(raw) }
     case 'select': {
@@ writtenSpelling @@
-/** `next` spelled as `raw` already spells it: a checked `true` keeps `raw`'s checked word, and each member takes the one member of `raw` its title folds to. A member `raw` names more than once keeps the spelling `next` gives it, the registered one. */
+/** `next` spelled as `raw` already spells it: a checked `true` keeps `raw`'s checked word, a string keeps a `raw` of any other shape whose inline yaml reads as that string, and each member takes the one member of `raw` its title folds to. A member `raw` names more than once keeps the spelling `next` gives it, the registered one. */
 export function writtenSpelling(next: unknown, raw: unknown): unknown {
   if (next === true) return isCheckedRaw(raw) ? raw : next
+  if (typeof next === 'string')
+    return raw != null && typeof raw !== 'string' && yamlInline(raw) === next ? raw : next
   if (!Array.isArray(next)) return next
@@ encodeValue @@
     case 'number':
     case 'checkbox':
     case 'link':
     case 'dateTime':
+    case 'text':
     case 'multiSelect':
@@ isBlankValue @@
     case 'select':
     case 'link':
     case 'dateTime':
+    case 'text':
       return value.value === ''
```

```ts|diff
--- a/Core/Properties/properties.test.ts
+++ b/Core/Properties/properties.test.ts
@@ propertyType @@
-  it('accepts the 11 type ids', () => {
+  it('accepts the 12 type ids', () => {
     for (const t of [
+      'text',
       'number',
@@ specOf and pickKindOf @@
     for (const t of [
+      'text',
       'number',
       'checkbox',
```

```ts|diff
--- a/Core/Properties/propertyValue.test.ts
+++ b/Core/Properties/propertyValue.test.ts
@@ decodeValue — the declared type decides, never the shape @@
+  it('free text reads a string as itself and any other shape as the yaml that spells it', () => {
+    const text = def({ type: 'text' })
+    expect(decodeValue(text, 'see [[Plan]] first')).toEqual({ kind: 'text', value: 'see [[Plan]] first' })
+    expect(decodeValue(text, 42)).toEqual({ kind: 'text', value: '42' })
+    expect(decodeValue(text, true)).toEqual({ kind: 'text', value: 'true' })
+    expect(decodeValue(text, 3.1)).toEqual({ kind: 'text', value: '3.1' })
+    expect(decodeValue(text, ['milk', 'eggs', 'bread'])).toEqual({ kind: 'text', value: '[milk, eggs, bread]' })
+    expect(decodeValue(text, { x: 1 })).toEqual({ kind: 'text', value: '{x: 1}' })
+    expect(decodeValue(text, [['Page']])).toEqual({ kind: 'text', value: '[[Page]]' })
+  })
@@ describe('writtenSpelling', …) at ~341 — a new case inside it @@
+  it('a free-typed key keeps a number, a list, and an unquoted wikilink the file spells, and takes a typed string over anything else', () => {
+    expect(writtenSpelling('42', 42)).toBe(42)
+    expect(writtenSpelling('[milk, eggs]', ['milk', 'eggs'])).toEqual(['milk', 'eggs'])
+    expect(writtenSpelling('[[Page]]', [['Page']])).toEqual([['Page']])
+    expect(writtenSpelling('forty-two', 42)).toBe('forty-two')
+    expect(writtenSpelling('note', 'note')).toBe('note')
+    expect(writtenSpelling('note', undefined)).toBe('note')
+  })
@@ the no-empties rule — the empties loop @@
     { kind: 'link', value: '' },
+    { kind: 'text', value: '' },
```

```ts|diff
--- a/Core/Contexts/contextResolve.test.ts
+++ b/Core/Contexts/contextResolve.test.ts
@@ fixtures @@
+const notesDef: PropertyDefinition = { id: 'prop_notes', name: 'Notes', type: 'text' }
 const world: GovernedWorld = {
   contexts,
-  defs: byFoldedName([statusDef, tagsDef, stageDef]),
+  defs: byFoldedName([statusDef, tagsDef, stageDef, notesDef]),
 }
@@ reconcileGovernedRoot — the property arm @@
+  it('a free-typed key keeps a foreign shape as written, live and frozen alike', () => {
+    for (const raw of [42, true, ['milk', 'eggs'], [['Page']]]) {
+      const live = reconcileGovernedRoot({ Notes: raw }, world)
+      expect(live.root).toEqual({ Notes: raw })
+      expect(live.changed).toEqual([])
+      const frozen = reconcileGovernedRoot({ Notes: raw }, world, {})
+      expect(frozen.root).toEqual({ Notes: raw })
+      expect(frozen.changed).toEqual([])
+    }
+  })
```

**VERIFY**

- [ ] The new cases fail before the change and pass after; `npm run typecheck` reports the compile census (the arms Tasks 1.3–1.6 fill) and nothing else.
- [ ] `writtenSpelling`'s string arm fires only when `next` is a string and `raw` is a non-string whose inline text equals it: no other kind hands it a string `next` with a non-string `raw` (number, checkbox, select, multiSelect, file, context never encode to a string; link and dateTime decode a non-string to null). State this in the task's completion note, not as a guard.
- [ ] `yamlInline(['milk', 'eggs', 'bread'])` is `[milk, eggs, bread]`, `yamlInline([['Page']])` is `[[Page]]`, `yamlInline(42)` is `42`: run the test. The never-shrink guard in `reconcileGovernedRoot` sees `memberCount('[milk, eggs, bread]') === 1 < memberCount(['milk','eggs','bread']) === 3` and keeps the raw on live paths; `writtenSpelling` keeps it on the frozen path.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 1.3

**BEFORE:** `TYPE_META` has no `text` row; `text-align-start` is not a curated icon; `SETTINGS` has no `text` frame; the `CREATABLE_TYPES` test pins eight types.

**TASK**

- [ ] Update the `CREATABLE_TYPES` test and watch it fail.
- [ ] Add the label and icon, curate the icon, and give Text the icon-and-title-only settings frame.

```ts|diff
--- a/UIX/Symbols/index.tsx
+++ b/UIX/Symbols/index.tsx
@@ lucide imports @@
   TextAlignJustify,
+  TextAlignStart,
   Type,
@@ icons registry @@
   'text-align-justify': TextAlignJustify,
+  'text-align-start': TextAlignStart,
   'view-table': Grid3x2,
```

```ts|diff
--- a/Core/Properties/Cells/PropertyTypes.tsx
+++ b/Core/Properties/Cells/PropertyTypes.tsx
@@ TYPE_META @@
   title: { label: 'Title', icon: 'text-align-justify' },
+  text: { label: 'Text', icon: 'text-align-start' },
   number: { label: 'Number', icon: 'hash' },
```

```ts|diff
--- a/Core/Properties/Schema/PropertyFrame.tsx
+++ b/Core/Properties/Schema/PropertyFrame.tsx
@@ SETTINGS — the settings-less group at the end @@
-    // A registry Context and the two stamps carry no settings of their own.
+    // Text, a registry Context, and the two stamps carry no settings of their own.
+    text: NO_SETTINGS,
     context: NO_SETTINGS,
```

```ts|diff
--- a/Core/Properties/Cells/PropertyTypes.test.ts
+++ b/Core/Properties/Cells/PropertyTypes.test.ts
@@ CREATABLE_TYPES @@
     expect(CREATABLE_TYPES).toEqual([
+      'text',
       'number',
```

**VERIFY**

- [ ] `grep -n "TextAlignStart" node_modules/lucide-react/dist/lucide-react.d.ts` finds the export (lucide-react 1.18.0 declares it at `:19868`).
- [ ] The New Property menu (PropertyFrame's type picker) lists **Text** first with the `text-align-start` glyph; the Properties ▸ menu lists a created Text property as a leaf (`pickKindOf('text') === null`).
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Task 1.4

**BEFORE:** `Cell` has no `text` arm; `valueClickIntent`, `baseCellMenu`, `styleMenuItems`, `defaultStyleFor`, `WIDTHS`, `DEFAULT_ALIGN` have none; `renderCellContent` is private to `cellStatic.tsx`; no `.cell-text` rule exists.

**TASK**

- [ ] Write the `Cell` and `valueClickIntent` tests and watch them fail.
- [ ] Export `renderCellContent` (the prose path; `renderCellBody`, the list-aware path, stays private); render the whole value through it inside the `OverScroll` every sibling's one-line value sits in, clipped to its first line (Phase 2 moves this arm into `TextCell`); give the cell its click (edit), menu (Clear when filled, as Context's), style (none), default style (none), width and alignment (Link's).

```ts|diff
--- a/Core/MarkdownPM/Tables/cellStatic.tsx
+++ b/Core/MarkdownPM/Tables/cellStatic.tsx
@@ renderCellContent @@
-function renderCellContent(
+export function renderCellContent(
```

```ts|diff
--- a/Core/Properties/Cells/Cell.tsx
+++ b/Core/Properties/Cells/Cell.tsx
@@ imports @@
 import { LinkCell } from './LinkCell'
+import { renderCellContent } from '../../MarkdownPM/Tables/cellStatic'
@@ switch (v.kind) @@
     case 'link':
       return <LinkCell raw={v.value} def={def} look={style.look} showFullLink={showFullLink} />
-
+    // The whole value is drawn and clipped to its first line; it hover-scrolls as a Number or a Link does, and a container that lets it wrap shows every line.
+    case 'text':
+      return (
+        <OverScroll className="cell-text-scroll">
+          <span className="cell-text">{renderCellContent(v.value)}</span>
+        </OverScroll>
+      )
     case 'dateTime':
```

```ts|diff
--- a/UIX/Table/table.css
+++ b/UIX/Table/table.css
@@ after .cell-text-scroll @@
+/* Every line is drawn; the box is one line tall and clips the rest, so a wrapping container later shows them all. The newline breaks where the pane breaks it, so the first line is the one that shows, and the scroller around it carries a long first line. */
+.cell-text {
+  display: block;
+  white-space: pre;
+  max-height: 1lh;
+  overflow-y: clip;
+}
```

```ts|diff
--- a/Core/Properties/Pickers/valueClick.ts
+++ b/Core/Properties/Pickers/valueClick.ts
@@ valueClickIntent @@
     case 'number':
       return barDivisor(look, config) === undefined ? { kind: 'edit' } : { kind: 'numberPicker' }
+    case 'text':
+      return { kind: 'edit' }
     case 'link': {
```

```ts|diff
--- a/Core/Actions/cellMenu.ts
+++ b/Core/Actions/cellMenu.ts
@@ baseCellMenu @@
     case 'context':
+    case 'text':
       return filled ? { kind: 'clear-only' } : null
```

```ts|diff
--- a/Core/Actions/columnMenu.ts
+++ b/Core/Actions/columnMenu.ts
@@ styleMenuItems @@
     case 'context':
     case 'file':
+    case 'text':
       return []
```

```ts|diff
--- a/Core/Properties/columnStyles.ts
+++ b/Core/Properties/columnStyles.ts
@@ defaultStyleFor @@
     case 'dateTime':
     case 'context':
     case 'file':
+    case 'text':
     case undefined:
       return {}
```

```ts|diff
--- a/Core/Views/Table/useColumns.ts
+++ b/Core/Views/Table/useColumns.ts
@@ WIDTHS @@
   link: { min: 100, default: 140, max: 350 },
+  text: { min: 100, default: 140, max: 350 },
   file: { min: 100, default: 140, max: 250 },
@@ DEFAULT_ALIGN @@
   link: 'left',
+  text: 'left',
   file: 'left',
```

```ts|diff
--- a/Core/Properties/Pickers/valueClick.test.ts
+++ b/Core/Properties/Pickers/valueClick.test.ts
@@ valueClickIntent @@
+  it('a text value edits in place, filled or empty', () => {
+    expect(valueClickIntent('text', { kind: 'text', value: 'a note' })).toEqual({ kind: 'edit' })
+    expect(valueClickIntent('text', { kind: 'null' })).toEqual({ kind: 'edit' })
+  })
```

```ts|diff
--- a/Core/Properties/Cells/Cell.test.tsx
+++ b/Core/Properties/Cells/Cell.test.tsx
@@ schema fixture @@
+  { id: 'prop_notes', name: 'Notes', type: 'text' },
@@ new describe @@
+describe('a text value', () => {
+  it('renders every line of the value; the one-line clip is the class, not a slice', () => {
+    mount(rowWith({ prop_notes: 'first line\nsecond line' }), 'prop_notes', {})
+    const root = host.querySelector('.cell-text')
+    expect(root?.textContent).toBe('first line\nsecond line')
+  })
+})
```

**VERIFY**

- [ ] The new cases fail before the change and pass after. `Core/Views/Table/useColumns.test.ts` "left-aligns title, number, link, and modified" gains a Text def in its `schema` fixture and `expect(defaultAlignFor(<its id>, schema)).toBe('left')`, retitled to name text; `Core/Actions/cellMenu.test.ts` and `columnMenu.test.ts` each gain one case where a sibling has one (a filled Text cell's menu is Clear alone; `styleMenuItems` on a text def is `[]`).
- [ ] In the app, a Text column's right-click on a filled cell offers **Clear** and nothing else (Context's `clear-only` arm); on an empty cell nothing but **Remove** where hideable.
- [ ] A two-line value in a table cell shows its first line and hover-scrolls a long one as a Link does; the same on a Standard card and in the panel; `document.querySelector('.cell-text').textContent` holds both lines.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Task 1.5

**BEFORE:** `KIND_OPS`, `evaluatorOf`, `textValue`, `sortText`, `buildCriterion`, `directionOptions`, `bucketKey`, `ruleSeed`, `FROM_GROUP_KEY`, `SEEDS_FROM_SORT` have no `text` arm; the `SEEDS_FROM_SORT` comment names "a link aside".

**TASK**

- [ ] Add Text's filter, sort, group, and seed arms, each joining Link's group; it never groups, never seeds, and sorts case-insensitively by its text.

```ts|diff
--- a/Core/Views/filterModel.ts
+++ b/Core/Views/filterModel.ts
@@ KIND_OPS @@
   link: [...TEXT_OPS, ...EMPTIES],
+  text: [...TEXT_OPS, ...EMPTIES],
   file: EMPTIES,
```

```ts|diff
--- a/Core/Views/Pipeline/filter.ts
+++ b/Core/Views/Pipeline/filter.ts
@@ evaluatorOf @@
     case 'select':
     case 'link':
+    case 'text':
       return evaluateText
@@ textValue @@
   switch (v.kind) {
     case 'select':
+    case 'text':
       return v.value
```

```ts|diff
--- a/Core/Views/Pipeline/sort.ts
+++ b/Core/Views/Pipeline/sort.ts
@@ sortText @@
   switch (v.kind) {
+    case 'text':
+      return v.value
     case 'link':
@@ buildCriterion @@
     case 'link':
+    case 'text':
     case 'multiSelect':
     case 'file':
       return { extract: (r) => sortText(r, c.property_id, schema), less: ciLess, ascending }
```

```ts|diff
--- a/Core/Views/Settings/SortFrame.tsx
+++ b/Core/Views/Settings/SortFrame.tsx
@@ directionOptions @@
     case 'link':
+    case 'text':
     case 'multiSelect':
     case 'file':
       return TEXT_DIRECTIONS
```

```ts|diff
--- a/Core/Views/Pipeline/group.ts
+++ b/Core/Views/Pipeline/group.ts
@@ bucketKey @@
     case 'link':
+    case 'text':
     case 'file':
     case 'null':
       return null
```

```ts|diff
--- a/Core/Views/Pipeline/creationSeeds.ts
+++ b/Core/Views/Pipeline/creationSeeds.ts
@@ ruleSeed @@
     case 'link':
+    case 'text':
     case 'file':
     case undefined:
       return rule.op === FILTER_OPS.is ? groupKeyToValue(operands[0], type) : null
```

```ts|diff
--- a/Core/Views/reassign.ts
+++ b/Core/Views/reassign.ts
@@ FROM_GROUP_KEY @@
   link: null,
+  text: null,
   file: null,
```

```ts|diff
--- a/Core/Views/Host/useViewCreation.ts
+++ b/Core/Views/Host/useViewCreation.ts
@@ SEEDS_FROM_SORT @@
-// Sort criteria whose value a new page can inherit from its anchor — single-value user properties, a link aside; under anything else the row simply lands where the sort puts it.
+// Sort criteria whose value a new page can inherit from its anchor — single-value user properties, a link and a text aside; under anything else the row simply lands where the sort puts it.
 const SEEDS_FROM_SORT: Record<ValueKind, boolean> = {
@@ entries @@
   link: false,
+  text: false,
   file: false,
```

**VERIFY**

- [ ] `Core/Views/reassign.test.ts` "reassignable holds for Status, Select and Checkbox and nothing else" adds `'text'` to its false list; `Core/Views/Cards/cardValueInput.test.ts`'s `fillsBlank` case adds `'text'` to the types that fill; add one `it` per pipeline file where a sibling has one: Text filters with Link's seven operators (`operatorsFor` on a text def equals `KIND_OPS.link`), `is` is exact and `contains` folds (as `evaluateText` already does), sorts A → Z by its text, `bucketKey` is null, `ruleSeed` is null.
- [ ] In the app, a Text column in Sorting offers **A → Z / Z → A**; Group By and Sub-Group don't list it (`groupable('text')` is false with no frame edit); a filter rule on it offers Link's seven operators.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Task 1.6

**BEFORE:** `editorText` returns `''` for a Text value (the field would open blank and an untouched blur would clear the key); `parseEditorValue` returns `undefined` (every commit refused). Its tests live beside Number's and Link's in `Core/Views/Cards/cardValueInput.test.ts`.

**TASK**

- [ ] Add the Text cases beside Number's and Link's and watch them fail.
- [ ] Hand the field the trimmed first line (so an untouched blur matches `initial` and writes nothing, as Number's normalized text does); rejoin it with the lines behind on commit; an emptied first line drops; a value left blank clears.

```ts|diff
--- a/Core/Properties/parseEditorValue.ts
+++ b/Core/Properties/parseEditorValue.ts
@@ editorText @@
 export function editorText(value?: PropertyValue | null): string {
   if (value?.kind === 'number') return String(value.value)
   if (value?.kind === 'link') return linkEditText(value.value)
+  if (value?.kind === 'text') return firstLine(value.value).trim()
   return ''
 }
+
+const firstLine = (text: string): string => text.split('\n', 1)[0]
+
+/** The field edits the first line alone; the lines behind it ride through untouched, and an emptied first line drops. */
+function textFromEdit(raw: string, current?: PropertyValue | null): PropertyValue | null {
+  const behind = current?.kind === 'text' ? current.value.split('\n').slice(1) : []
+  const lines = raw.trim() === '' ? behind : [raw, ...behind]
+  const value = lines.join('\n')
+  return value.trim() === '' ? null : { kind: 'text', value }
+}
@@ parseEditorValue @@
   if (type === 'link')
     return linkValueFromEdit(
       raw,
       current?.kind === 'link' ? current.value : undefined,
       resolveTitle,
     )
+  if (type === 'text') return textFromEdit(raw, current)
   return undefined
 }
```

```ts|diff
--- a/Core/Views/Cards/cardValueInput.test.ts
+++ b/Core/Views/Cards/cardValueInput.test.ts
@@ imports @@
-import { parseEditorValue } from '../../Properties/parseEditorValue'
+import { editorText, parseEditorValue } from '../../Properties/parseEditorValue'
@@ describe parseEditorValue — after the link case @@
+  it('text: opens on its trimmed first line, rejoins it with the lines behind, drops an emptied first line, clears a blank', () => {
+    const text = (value: string) => ({ kind: 'text', value }) as const
+    expect(editorText(text('first \nsecond\nthird'))).toBe('first')
+    expect(editorText(text(''))).toBe('')
+    expect(parseEditorValue('text', 'changed', text('first\nsecond'))).toEqual(text('changed\nsecond'))
+    expect(parseEditorValue('text', 'fresh', null)).toEqual(text('fresh'))
+    expect(parseEditorValue('text', '', text('first\nsecond'))).toEqual(text('second'))
+    expect(parseEditorValue('text', '', text('only'))).toBeNull()
+    expect(parseEditorValue('text', '', text('a\n\n'))).toBeNull()
+    expect(parseEditorValue('text', '   ', null)).toBeNull()
+  })
```

**VERIFY**

- [ ] The new case fails before the change and passes after.
- [ ] In the app: click a filled Text cell → the field holds the first line with the caret at its end; blur untouched → no write (`text === initial` in `PropertyValueInput.commit`, both trimmed); change it and press Enter → the file's value is the new first line over the old second line, written as a `|-` block scalar; the same on a Standard card and in the panel.
- [ ] A first line that spells a list marker stays a string and draws as one: a value `- milk
- eggs` opens on `- milk`; typing `- oats` lands `Notes: |-` over `  - oats` and `  - eggs`; emptying the field lands `Notes: "- eggs"` (one line that begins `- ` is double-quoted, as `"42"` is); `1. a` alone lands plain as `Notes: 1. a`. Each reads back as the typed string and renders as the literal text — the drive's group 1 asserts each on disk.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [ ] `npm run typecheck` is clean with `text` in the catalog — the census is closed; no `switch` on `ValueKind` or `PropertyType` lacks the arm.
- [ ] `node ".claude/Scripts/Text Property Drive/live-drive.mjs" 1` passes every check and restores `~/Test`; its output is kept for the report.
- [ ] Read the seven screenshots it wrote: Drive Prose's cell shows the first SHOWCASE line (its brackets plain for now) and Drive Empty's cell is empty; the Standard card and the Compact card show the first line; the panel shows the first line beside Drive Notes and the empty placeholder on Drive Empty; the open field holds the first line with the caret at its end; the cell menu shows **Clear** alone. Anything that reads wrong is fixed before the phase closes.
- [ ] Line-count delta reported (comments and tests excluded).

---

### Phase 2 — The Surfaces: Live Connections, the Pen, One Popover Intent

**GOAL:** A Text value at rest behaves as a body does — its links color, open, and glance — and every surface shows the pen that will open TextPane, through one intent Number's bar already uses. Separate from Phase 4 because TextPane is a second context window's worth of work and this phase is complete without it: until Phase 4 routes `text` in `PropertyValueInput`, the pen opens the shared `TextPicker`, which already edits the first line. Shares no file with Phase 3.

#### Task 2.1

**BEFORE:** `Cell`'s text arm draws the value with no `ConnectionsApi`, so its links read as plain brackets: `ValueContext` carries `schema`, `contextsById`, `contexts`, `assets`. `followTarget` needs an `EditorView`, so a resting value outside an editor can't use it; `cellLinkTarget` resolves a link under the pointer and is private, with a `.mdpm-tbl-cell-static` ancestor check that is dead (its one caller's handlers sit on that element). The glance literal `{ arm, cancel, close, contains }` is written inline in `editorHost.tsx`. The table row is the only reveal host (`TableView.tsx:653`); cards have none.

**TASK**

- [ ] Write the `Cell` test for a resolved link inside a Text value and watch it fail.
- [ ] Put one connections accessor on `ValueContext`, built once per view host; export the glance literal once; export the link resolver without its dead gate; move the text arm into `TextCell`, which follows and glances its links, carries the pen inside its own reveal host, and names its holding page for a bare `[[#Heading]]`.

```ts|diff
--- a/Core/Interface/Glance/glanceAction.ts
+++ b/Core/Interface/Glance/glanceAction.ts
@@ after glanceLink @@
+/** What an editor host, and a resting value outside one, arm a glance through. */
+export const glanceHost = {
+  arm: glanceLink,
+  cancel: cancelGlance,
+  close: closeGlance,
+  contains: insideGlance,
+}
```

```ts|diff
--- a/Core/Pages/editorHost.tsx
+++ b/Core/Pages/editorHost.tsx
@@ imports @@
-import {
-  cancelGlance,
-  closeGlance,
-  glanceLink,
-  insideGlance,
-} from '../Interface/Glance/glanceAction'
+import { glanceHost } from '../Interface/Glance/glanceAction'
@@ buildEditorHost — glance @@
-    glance: inert
-      ? undefined
-      : { arm: glanceLink, cancel: cancelGlance, close: closeGlance, contains: insideGlance },
+    glance: inert ? undefined : glanceHost,
```

```ts|diff
--- a/Core/MarkdownPM/Tables/cellStatic.tsx
+++ b/Core/MarkdownPM/Tables/cellStatic.tsx
@@ cellLinkTarget @@
-function cellLinkTarget(
+/** The link under `eventTarget` in `text`, resolved through `api`; null off a link. */
+export function cellLinkTarget(
   text: string,
   eventTarget: EventTarget | null,
   api: ConnectionsApi | undefined,
 ): { el: Element; target: MdTarget } | null {
   const el = (eventTarget as HTMLElement | null)?.closest?.(LINK_SELECTOR)
-  if (!el || !api || !el.closest('.mdpm-tbl-cell-static')) return null
+  if (!el || !api) return null
   const span = linkSpanAt(eventTarget)
```

```ts|diff
--- a/Core/Properties/valueContext.ts
+++ b/Core/Properties/valueContext.ts
@@ imports @@
 import type { ContextIdentity, IdentityMaps, SpaceIdentity } from '../Contexts/contextIdentity'
+import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
@@ ValueContext @@
   assets: AssetMap
+  /** Read when a value colors or follows a link. A getter rather than the api itself, so the api's rebuild on every heading change never re-derives the context and re-renders every row. */
+  connections?: () => ConnectionsApi | undefined
 }

 export function buildValueContext(
   identity: IdentityMaps,
   schema: PropertyDefinition[],
   assets: AssetMap,
+  connections?: () => ConnectionsApi | undefined,
 ): ValueContext {
-  return { schema, contextsById: identity.spaces, contexts: identity.contexts, assets }
+  return { schema, contextsById: identity.spaces, contexts: identity.contexts, assets, connections }
 }
```

```ts|diff
--- a/Core/Views/Host/useViewHost.ts
+++ b/Core/Views/Host/useViewHost.ts
@@ imports @@
 import { useSession } from '../../Session/store'
+import { useConnections } from '../../Session/pageConnections'
+import { useLatest } from '@pommora/uix/Utilities/stableApi'
@@ ctx @@
   const identity = tree && identityOf(tree)
+  const connections = useLatest(useConnections(tree, 'preview'))
   const ctx = useMemo(
-    () => (identity ? buildValueContext(identity, schema, assetMap) : null),
+    () =>
+      identity ? buildValueContext(identity, schema, assetMap, () => connections.current) : null,
     [identity, schema, assetMap],
   )
```

```ts|diff
--- a/Core/Properties/PropertyPanel.tsx
+++ b/Core/Properties/PropertyPanel.tsx
@@ imports @@
 import { useSession, useSetting } from '../Session/store'
+import { useConnections } from '../Session/pageConnections'
+import { useLatest } from '@pommora/uix/Utilities/stableApi'
+import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
@@ props @@
 export function PropertyPanel({
   subject,
   host: panelHost,
+  connections: hostConnections,
 }: {
   subject: PanelSubject
   host: 'dropdown' | 'side-pane'
+  /** A window's own routing for the links its values hold, as `TileHost` takes it; preview otherwise. */
+  connections?: ConnectionsApi
 }): React.JSX.Element {
@@ ctx (~157) @@
+  const preview = useConnections(tree, 'preview')
+  const connections = useLatest(hostConnections ?? preview)
   const ctx = useMemo<ValueContext | null>(
-    () => (identity ? buildValueContext(identity, schema, assetMap) : null),
+    () =>
+      identity ? buildValueContext(identity, schema, assetMap, () => connections.current) : null,
     [identity, schema, assetMap],
   )
```

```ts|diff
--- a/Core/Interface/Windows/WindowTabBody.tsx
+++ b/Core/Interface/Windows/WindowTabBody.tsx
@@ the side pane (~215) @@
             <PropertyPanel
               subject={{ kind: 'page', id: pageTarget.id, path: pageTarget.path }}
               host="side-pane"
+              connections={connections}
             />
```

```ts|diff
--- /dev/null
+++ b/Core/Properties/Cells/TextCell.tsx
@@ new file @@
+import { useRef } from 'react'
+import { trailing } from '@pommora/uix/Fields/fields.css'
+import { isCmd, isSecondaryClick } from '@pommora/uix/Interactions/chords'
+import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
+import { AccessoryButton } from '@pommora/uix/Menus'
+import { cx } from '@pommora/uix/Utilities/cx'
+import type { ConnPage } from '../../Connections/pageIndex'
+import { glanceHost } from '../../Interface/Glance/glanceAction'
+import { type ConnectionsApi, openPage } from '../../MarkdownPM/Links/connectionsApi'
+import { dwellTarget } from '../../MarkdownPM/Links/linkClicks'
+import { cellLinkTarget, renderCellContent } from '../../MarkdownPM/Tables/cellStatic'
+import { openWebLink } from '../../Web/openWebLink'
+
+/** The whole value is drawn and the class clips it to one line, so a container that lets it wrap shows every line; the line is the kit's ellipsis cap, ending in `…` short of the pen at rest and scrolling on hover, as a tab label does. A link inside it follows and glances as a body link does; a bare `[[#Heading]]` names `holder`, the page the value sits on, and nothing on a Space. */
+export function TextCell({
+  text,
+  connections,
+  holder,
+  onPane,
+}: {
+  text: string
+  connections?: () => ConnectionsApi | undefined
+  holder?: ConnPage
+  onPane?: (anchor: HTMLElement) => void
+}): React.JSX.Element {
+  const hostRef = useRef<HTMLSpanElement>(null)
+  const linkAt = (e: React.SyntheticEvent) => cellLinkTarget(text, e.target, connections?.())
+  const follow = (e: React.MouseEvent): void => {
+    if (isSecondaryClick(e)) return
+    const api = connections?.()
+    const found = api && linkAt(e)
+    if (!found) return
+    const { target } = found
+    if (target.kind === 'external') openWebLink(target.url)
+    else if (target.kind === 'page') openPage(api, target.page, isCmd(e), target.heading)
+    else if (target.kind === 'self' && holder) openPage(api, holder, isCmd(e), target.heading)
+    else return
+    e.preventDefault()
+    e.stopPropagation()
+  }
+  return (
+    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the value's keyboard route is its field; a link inside it is pointer-followed as a resting table cell's is
+    <span
+      ref={hostRef}
+      className="cell-text-host"
+      data-reveal-host=""
+      onClick={follow}
+      onPointerOver={(e) => {
+        const found = linkAt(e)
+        if (found) dwellTarget(found.target, glanceHost, found.el)?.()
+      }}
+      onPointerOut={() => glanceHost.cancel()}
+    >
+      <div className={cx('cell-text', overScrollEllipsis)}>{renderCellContent(text, connections)}</div>
+      {onPane && (
+        <AccessoryButton
+          icon="square-pen"
+          size="body"
+          ariaLabel="Open in TextPane"
+          reveal
+          className={trailing}
+          onClick={() => {
+            if (hostRef.current) onPane(hostRef.current)
+          }}
+        />
+      )}
+    </span>
+  )
+}
```

```ts|diff
--- a/Core/Properties/Cells/Cell.tsx
+++ b/Core/Properties/Cells/Cell.tsx
@@ imports @@
 import { LinkCell } from './LinkCell'
-import { renderCellContent } from '../../MarkdownPM/Tables/cellStatic'
+import { TextCell } from './TextCell'
@@ props @@
   hideRemove,
   empty,
+  onPane,
 }: {
@@ prop types @@
   hideRemove?: boolean
   empty?: React.JSX.Element
+  /** Opens the value's pane from its pen, anchored at the pen's host; absent, no pen is drawn. */
+  onPane?: (anchor: HTMLElement) => void
 }): React.JSX.Element | null {
@@ after `const dt = def?.type` @@
   const dt = def?.type
+  // The page a bare `[[#Heading]]` in a value names; a Space (its row id is a Space id) has none.
+  const holder = ctx.contextsById.has(row.id) ? undefined : row
@@ switch — text @@
-    // The whole value is drawn and the class clips it to one line, so a container that lets it wrap shows every line.
     case 'text':
-      return <span className="cell-text">{renderCellContent(v.value)}</span>
+      return (
+        <TextCell text={v.value} connections={ctx.connections} holder={holder} onPane={onPane} />
+      )
```

```ts|diff
--- a/Core/Properties/Cells/Cell.test.tsx
+++ b/Core/Properties/Cells/Cell.test.tsx
@@ imports @@
 import type { ValueContext } from '../valueContext'
+import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
@@ describe a text value @@
+  it('colors a link it holds through the context’s connections, as a resting table cell does', () => {
+    const page = { id: 'p9', title: 'Target', path: 'X/Target.md' }
+    const connections = () =>
+      ({
+        resolve: (title: string) =>
+          title === 'Target' ? { status: 'resolved', page } : { status: 'phantom', page: null },
+        candidates: () => [],
+        open: () => {},
+      }) as unknown as ConnectionsApi
+    act(() =>
+      root.render(
+        <Cell row={rowWith({ prop_notes: 'see [[Target]] and [[Nowhere]]' })} column={col('prop_notes')}
+          ctx={{ ...ctx, connections }} hideIcon={false} style={dateDefaults('full')} />,
+      ),
+    )
+    expect(host.querySelector('.md-connection-resolved')?.textContent).toBe('Target')
+    expect(host.querySelector('.md-connection-phantom')?.textContent).toBe('Nowhere')
+  })
```

**VERIFY**

- [ ] The new case fails before the change and passes after; `editorHost.tsx` compiles with `glanceHost` (`grep -rn "arm: glanceLink" Core` → one hit, in `glanceAction.ts`); the MarkdownPM table tests stay green with `cellLinkTarget`'s dead ancestor check gone (its one caller's handlers sit on `.mdpm-tbl-cell-static` itself, `cellStatic.tsx:359-402`).
- [ ] In the app, a Text cell holding `see [[Plan]]` draws `Plan` in the connection color; a click opens the page (⌘-click in a new tab, both routed by **Open Connections In Preview** through `openPage`); a rest raises the glance; `[[Nowhere]]` reads as a phantom with its brackets muted; a `[[#Heading]]` on a page opens that page at the heading, and on a Space does nothing.
- [ ] A click on the value's plain text (not a link) still reaches the surface's `edit` intent (the handler returns before `stopPropagation`). The pen is drawn only where a surface passes `onPane` (none until Task 2.3).
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Task 2.2

**BEFORE:** `TextCell`'s host wraps the value and the pen with no layout of its own; Task 1.4's `.cell-text` rule sits inside an `OverScroll` fade wrapper; the Compact card's flow spans wear chrome only through `.cell-bar`'s full-width rule.

**TASK**

- [ ] Lay the value and the pen out in one box: the pen overlays the value's trailing edge and shows on hover (at rest on touch), the text runs to the row's edge at rest as a Link value does and, while the glyph shows, takes a trailing pad of the pen's box plus the kit's smallest step so its `…` lands just left of the glyph; the value is a `pre`, `1lh`, `overflow: hidden`, `text-overflow: ellipsis` box — `…` at rest, no hover scroll; give the Compact card's flow span the kit's bordered-field class on a Text column, full width, at the compact row's height, keyed on one class.
- [ ] The resting box is sized by its first line, not by the lines hidden under it: with `white-space: pre` the box's scroll width is the widest line's, so the cap's hover scroll today runs a short first line into blank space and the fade marks a line that isn't cut. Fix it in CSS at the box; if no rule gives both the ellipsis at rest and a scroll bounded to the first line, Text keeps the ellipsis and no hover scroll (`line-clamp: 1` on the `pre` block), which is the departure to record if taken. Prove it live: Drive Prose's first line is shorter than its second, and the box's `scrollWidth` must not exceed what the first line alone needs.

```ts|diff
--- a/UIX/Table/table.css
+++ b/UIX/Table/table.css
@@ .cell-text — replaces Task 1.4's rule @@
+/* The value and its pen in one row, the pen revealed by this host and the text ending short of it. */
+.cell-text-host {
+  display: flex;
+  align-items: center;
+  width: 100%;
+  min-width: 0;
+}
-/* Every line is drawn; the box is one line tall and clips the rest, so a wrapping container later shows them all. The newline breaks where the pane breaks it, so the first line is the one that shows, and the scroller around it carries a long first line. */
-.cell-text {
-  display: block;
-  white-space: pre;
-  max-height: 1lh;
-  overflow-y: clip;
-}
+/* Every line is drawn; the box is one line tall and clips the rest, so a wrapping container later shows them all. The newline breaks where the pane breaks it, so the first line is the one that shows, and it ends in an ellipsis. */
+.cell-text-host > .cell-text {
+  display: block;
+  flex: 1 1 auto;
+  white-space: pre;
+  max-height: 1lh;
+  overflow: hidden;
+  text-overflow: ellipsis;
+}
```

```ts|diff
--- a/Core/Views/Cards/CardsView.tsx
+++ b/Core/Views/Cards/CardsView.tsx
@@ imports @@
+import { borderedField } from '@pommora/uix/Fields/fields.css'
~import { columnType, resolveFieldValue } from '../../Properties/value'
@@ CardProps — compact branch @@
     <div className="card-props is-flow" onClick={zoneClick}>
       {shown.map((c) => (
-        <span key={c.id}>{value(c)}</span>
+        <span key={c.id} className={columnType(c, ctx.schema) === 'text' ? borderedField : undefined}>
+          {value(c)}
+        </span>
       ))}
     </div>
```

```ts|diff
--- a/Core/Views/Cards/cards-view.css
+++ b/Core/Views/Cards/cards-view.css
@@ .card-props.is-flow > span:has(.cell-bar) @@
-.card-props.is-flow > span:has(.cell-bar) {
+.card-props.is-flow > span:has(.cell-bar, .cell-text) {
   flex-basis: 100%;
 }
+/* The field's own minimum would stand a Text row taller than the compact row it sits in. */
+.card-props.is-flow > span:has(.cell-text) {
+  min-height: var(--card-row-h);
+}
```

**VERIFY**

- [ ] `borderedField` renders the same chrome `PathField` wears (one class, no `InputField`); the Compact predicate is the surface's, as `isCompact(view)` is known only in `CardProps` (the column `look` is the chip look, not the card layout).
- [ ] Live, in the Electron renderer: (a) a two-line prose value in a table cell shows its first line only; (b) a value whose first line spells a list marker shows it literally — `- milk`, no glyph, no gutter — and nothing of the lines below; (c) the same two inside `.card-value`'s `inline-flex` and the panel's `s.value` flex box; (d) a long first line ends in `…` at rest (`getComputedStyle` reads `text-overflow: ellipsis`) and never scrolls.
- [ ] The pen appears on hovering the value's box, on every cell of a Text column independently, and the row grip still reveals on hovering the row; the text's box ends short of the pen's box at rest and on hover (the two `getBoundingClientRect`s don't intersect); on a Standard card and in the panel it reveals the same way; in the panel a Text row looks as a Link row does — the value's computed `font`, `color` (a plain run against a Link's plain run), and the row's height match the Link row's beside it — with the pen the only addition; on a Compact card the value wears the bordered field across the card's width at the compact row height; on a touch emulation (`(hover: none)`) every pen shows at rest.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Task 2.3

**BEFORE:** `ValueIntent` has `numberPicker`, which Number's bar click produces and each surface maps to its popover seat — Table `editAs('popover')`, Cards `open('popover')`, Panel `null`. The Panel's editing modes are `'picker' | 'editor' | 'rename'`, its one popover seat the `rename` block. A pen press on a Text value has no intent to produce.

**TASK**

- [ ] Update `valueClick.test.ts` and watch it fail.
- [ ] Rename the intent to `popover` so one kind means "open this type's popover at the value"; hand every surface's `onPane` to it; give the Panel a `popover` mode that is the `rename` seat widened, as the Table's already is.

```ts|diff
--- a/Core/Properties/Pickers/valueClick.ts
+++ b/Core/Properties/Pickers/valueClick.ts
@@ ValueIntent @@
-  | { kind: 'numberPicker' }
+  | { kind: 'popover' }
@@ valueClickIntent — number @@
-      return barDivisor(look, config) === undefined ? { kind: 'edit' } : { kind: 'numberPicker' }
+      return barDivisor(look, config) === undefined ? { kind: 'edit' } : { kind: 'popover' }
```

```ts|diff
--- a/Core/Views/Table/TableView.tsx
+++ b/Core/Views/Table/TableView.tsx
@@ runIntent handlers @@
-      numberPicker: editAs('popover'),
+      popover: editAs('popover'),
@@ cellApi @@
   const cellApi = useStableApi<RowCellApi>({
     menu: (row, col, e) => void openCellMenu(row, col, e),
     click: onCellClick,
+    pane: (row, col, anchor) => {
+      triggerElRef.current = anchor.closest<HTMLElement>('.data-cell') ?? anchor
+      runIntent(row, col, { kind: 'popover' }, null)
+    },
     overlay: cellEditor,
@@ RowCellApi @@
   click: (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent) => void
+  pane: (row: ViewRow, col: ResolvedColumn, anchor: HTMLElement) => void
   overlay: (row: ViewRow, col: ResolvedColumn) => React.ReactNode
@@ Row — the Cell @@
             showFullLink={popoverCol === c.id}
             commit={(next) => api.commit(row, c, next)}
+            onPane={(anchor) => api.pane(row, c, anchor)}
           />
```

```ts|diff
--- a/Core/Views/Cards/CardValue.tsx
+++ b/Core/Views/Cards/CardValue.tsx
@@ runIntent handlers @@
-      numberPicker: () => open('popover'),
+      popover: () => open('popover'),
@@ the Cell @@
           commit={commit}
           hideRemove={!allowInlineRemove}
+          onPane={() => runIntent({ kind: 'popover' }, null)}
         />
```

```ts|diff
--- a/Core/Properties/PropertyPanel.tsx
+++ b/Core/Properties/PropertyPanel.tsx
@@ Editing @@
-type Editing = { id: string; mode: 'picker' | 'editor' | 'rename' } | null
+type Editing = { id: string; mode: 'picker' | 'editor' | 'popover' } | null
@@ runIntent handlers @@
       edit: editAs('editor'),
-      rename: editAs('rename'),
+      rename: editAs('popover'),
       open: ({ url }) => openWebLink(url),
-      numberPicker: null,
+      popover: editAs('popover'),
       hide: null,
@@ the Cell (~391) @@
                   commit={(next) => commit(id, next)}
                   empty={<EmptyValue className={s.empty} />}
+                  onPane={(anchor) => {
+                    // The row's value span, where `editRow` anchors every other popover.
+                    triggerRef.current = anchor.closest<HTMLElement>('[data-property-row]') ?? anchor
+                    if (def) runIntent(def, current, { kind: 'popover' }, null)
+                  }}
                 />
@@ the popover seat (~482) @@
-        {editing?.mode === 'rename' && editingDef && row && (
+        {editing?.mode === 'popover' && editingDef && row && (
           <PropertyValueInput
-            alias
+            alias={editingDef.type === 'link'}
             popover={{ open: true, triggerRef }}
```

```ts|diff
--- a/Core/Properties/Pickers/valueClick.test.ts
+++ b/Core/Properties/Pickers/valueClick.test.ts
@@ a number edits in place unless it draws as a bar @@
-    ).toEqual({ kind: 'numberPicker' })
+    ).toEqual({ kind: 'popover' })
@@ the on() fixture @@
-    numberPicker: null,
+    popover: null,
```

**VERIFY**

- [ ] `grep -rn "numberPicker" Core UIX` → no hits; the Panel's `rename` menu action still opens the alias popover for a Link (`alias={editingDef.type === 'link'}` matches `TableView.tsx:256`'s `alias={def.type === 'link'}`).
- [ ] In the app, Number's bar still opens its popover on every surface; the Text pen opens a popover anchored at the value on the table (at the cell), a Standard card, a Compact card, and the panel row — until Phase 4 that popover is the shared `TextPicker` holding the first line, and a commit through it rejoins the lines as Task 1.6 says.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Task 2.4

**BEFORE:** `ConnectionCell` resolves `target.title` through `resolveConnection(tree, title)`; for `[[#Heading]]` the title is `''`, so `page` is null, the click does nothing, and the label (`target.alias ?? target.title`) is empty. `Cell` computes `holder` since Task 2.1 and hands it to `TextCell` only.

**TASK**

- [ ] Write the `LinkCell` test and watch it fail.
- [ ] Hand `LinkCell` the same `holder` `Cell` already computes for `TextCell`; resolve an empty title to it; label a bare heading by its heading.

```ts|diff
--- a/Core/Properties/Cells/LinkCell.tsx
+++ b/Core/Properties/Cells/LinkCell.tsx
@@ imports @@
+import type { ConnPage } from '../../Connections/pageIndex'
@@ LinkCell props @@
   look,
   showFullLink,
+  holder,
 }: {
   raw: string
   def: PropertyDefinition | undefined
   look?: ColumnLook
   showFullLink?: boolean
+  /** The page the value sits on, which a bare `[[#Heading]]` names; a Space has none to name. */
+  holder?: ConnPage
 }): React.JSX.Element | null {
@@ the connection branch @@
   if (target.kind === 'page')
-    return <ConnectionCell target={target} showTitle={showFullLink === true} />
+    return <ConnectionCell target={target} showTitle={showFullLink === true} holder={holder} />
@@ ConnectionCell @@
 function ConnectionCell({
   target,
   showTitle,
+  holder,
 }: {
   target: Extract<LinkTarget, { kind: 'page' }>
   showTitle: boolean
+  holder?: ConnPage
 }): React.JSX.Element {
   const tree = useSession((s) => s.tree)
   const select = useSession((s) => s.select)
-  const page = resolveConnection(tree, target.title)
+  const page = target.title ? resolveConnection(tree, target.title) : (holder ?? null)
+  const label = target.alias ?? (target.title || `#${target.heading}`)
@@ the anchor's text @@
-        {showTitle ? target.title : (target.alias ?? target.title)}
+        {showTitle ? target.title || `#${target.heading}` : label}
```

```ts|diff
--- a/Core/Properties/Cells/Cell.tsx
+++ b/Core/Properties/Cells/Cell.tsx
@@ switch — link @@
-      return <LinkCell raw={v.value} def={def} look={style.look} showFullLink={showFullLink} />
+      return (
+        <LinkCell
+          raw={v.value}
+          def={def}
+          look={style.look}
+          showFullLink={showFullLink}
+          holder={holder}
+        />
+      )
```

```ts|diff
--- a/Core/Properties/Cells/LinkCell.test.tsx
+++ b/Core/Properties/Cells/LinkCell.test.tsx
@@ describe('a Link cell naming a page') — new case @@
+  it('a bare `[[#Heading]]` names the page it sits on and opens it at the heading', () => {
+    // Render `<LinkCell raw="[[#Setup]]" holder={{ id: 'p1', title: 'Page', path: 'X/Page.md' }} …/>` against the file's tree and `select` fixtures;
+    // expect the anchor's text to be `#Setup`, its href `X/Page.md`, and a click to call `select` with `{ kind: 'page', id: 'p1', path: 'X/Page.md' }, { newTab: false, heading: 'Setup' }`.
+    // Without `holder`, the anchor renders `#Setup` and a click calls nothing.
+  })
```

**VERIFY**

- [ ] The new case fails before the change and passes after (the comment above is the expectation, not the code).
- [ ] In the app, a Link value `[[#Setup]]` on a page shows `#Setup` and travels to the heading; the same value on a Space renders `#Setup` and does nothing (`holder` is undefined for a Space row); every other Link value renders and opens as before.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Task 2.5

**BEFORE:** A long value in a label-beside-value row takes the row from its label: the Properties panel's trailing side shrinks with the label (`property-panel.css.ts:55` overrides the kit's `side` to `flex: 0 1 auto`, and `titleWrap` is `flex: 1 1 auto`, so a 600px value beside a 60px label leaves "Drive …"); a Settings field row's trailing side can't shrink at all (`menu-row.css.ts:184`), so the label absorbs every pixel and the row overflows; a Standard card's `.card-prop-label` is `flex: 0 0 auto` with no clip, so there a long label starves the value instead. The kit already states the rule once, for one slot: `${side}:has(${detail})` is capped at `55%` (`menu-row.css.ts:267`).

**TASK**

- [ ] State the reach once: a row's trailing value may take up to `--row-value-reach` (`75%`, a KNOB) of the row and clips to the right past it inside its own cap; the value gives way before the label does — where a trailing value can shrink at all (the panel's value side, the Standard card's value) it grows from zero into the room the label leaves, capped at the reach, so a label that fits is never shrunk (a shrink weight was tried and still cost the label a fraction of a pixel, enough to ellipsize it) and only a label longer than the row ellipsizes; a short value still hugs the right. A field inside a row's trailing side clips inside its own chrome (one rule beside the reach, since `InputField` is frozen). Apply it to every `MenuItem` trailing slot (the panel row and the Settings field row are both `MenuItem`), drop the panel's own override, and mirror it on the Standard card's `.card-value` with the label taking the kit's ellipsis cap instead of never shrinking. The `detail` slot's narrower `55%` stays (a detail is secondary to its label; a value is the row's content). The panel's bar and the card's bar are exempt as they are today.

```ts|diff
--- a/UIX/Menus/menu-row.css.ts
+++ b/UIX/Menus/menu-row.css.ts
@@ the :root row vars @@
     '--row-size': font.scale.body.size,
     '--row-line': font.scale.body.line,
+    '--row-value-reach': '75%', // KNOB — how far a trailing value may reach toward its label
@@ after titleWrap, before the detail cap (so detail's 55% wins the tie by source order) @@
+/* A trailing value reaches no further than the row's mark; past it, it clips inside its own cap and the label keeps the rest. */
+globalStyle(`${titleWrap} + ${side}`, { maxWidth: 'var(--row-value-reach)' })
 globalStyle(`${side}:has(${detail})`, { flex: '0 1 auto', minWidth: 0, maxWidth: '55%' })
```

```ts|diff
--- a/Core/Properties/property-panel.css.ts
+++ b/Core/Properties/property-panel.css.ts
@@ imports @@
-import { globalStyle, style } from '@vanilla-extract/css'
+import { style } from '@vanilla-extract/css'
-import { item, side } from '@pommora/uix/Menus/menu-row.css'
+import { item } from '@pommora/uix/Menus/menu-row.css'
@@ the trailing-side override @@
-globalStyle(`${row} > .${side}:last-child`, { flex: '0 1 auto', minWidth: 0 })
```

```ts|diff
--- a/Core/Views/Cards/cards-view.css
+++ b/Core/Views/Cards/cards-view.css
@@ .card-prop-label @@
 .card-prop-label {
-  flex: 0 0 auto;
+  flex: 0 1 auto;
   color: var(--label-secondary);
 }
+/* The card's row reads the same mark a menu row does; a percentage against the Compact flow's content-sized span would be circular, so the rule sits on the row. */
+.card-prop-row > .card-value {
+  flex-shrink: 0;
+  max-width: var(--row-value-reach);
+}
@@ .card-value:has(.cell-bar) @@
 .card-value:has(.cell-bar) {
   flex: 1;
   width: 100%;
+  max-width: none;
   overflow: visible;
 }
```

```ts|diff
--- a/Core/Views/Cards/CardsView.tsx
+++ b/Core/Views/Cards/CardsView.tsx
@@ imports @@
+import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
@@ the Standard card's label (~719) and the New Page ghost card's (~588) @@
-        className={cx('card-prop-label', text.caption.emphasized)}
+        className={cx('card-prop-label', text.caption.emphasized, overScrollEllipsis)}
```

```ts|diff
--- a/Core/Settings/NexusRows.tsx
+++ b/Core/Settings/NexusRows.tsx
@@ the This Device name field (~126) @@
~        <InputField … capped …>   (the one boxed field a long name can push past the mark; `capped` gives it the kit's clip, as `ImagePicker`'s field has)
```

**VERIFY**

- [ ] `grep -rn "row-value-reach" UIX Core` → `menu-row.css.ts` (the var and its one rule) and `cards-view.css` (the mirror); `property-panel.css.ts` keeps one rule for the value side (`flex: 1000 1 0; min-width: 0`), its old shrink override gone; the `:has(${detail})` rule is unchanged and still sits after the new one.
- [ ] Live, with Drive Prose's SHOWCASE value: in the panel, Drive Notes's row shows the whole label "Drive Notes" (the label's `scrollWidth <= clientWidth`) and the value's box is at most 75% of the row's content box, clipped to the right with the `…`; the same on the Standard card; a short value (Drive Raw's `42`) still sits at the row's right edge on both. A Number bar on each surface is as wide as before. A Settings row with a long device name clips inside its field rather than pushing its label to nothing. The Trash's date lane and a NavList path (the `detail` slot) are unchanged at 55%.
- [ ] `TextCell`'s pen is a non-shrinking sibling of its capped text inside the value (Task 2.2's row), so the cap clips the text, never the pen.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

---

### Phase 3 — Connections Inside a Value: Index and Cascade

**GOAL:** A link written inside a Text value is a body link to the host: the content index records it as a `body` relation (so a rename finds the file), the rename cascade rewrites it with the body's rewriter under the page's own title and outline (one writer per key), and the Spaces heading gate reads it. The index stays registry-blind, as it is for every `<Title>` key: it reads what the file holds, and the registry governs only what the cascade writes. Host-run only; shares no file with Phase 2.

#### Task 3.1

**BEFORE:** `extractPageIndex` reads body links from `linksIn(body, …)` and, from frontmatter, only whole-value connections (`frontmatterMentions`: every string value that is entirely one `[[Page]]`, under any key, registered or not — the same latitude `spaceRelations` gives a `<Title>` key). A link inside a sentence under any key yields no row, so a rename never finds the file. `INDEX_GENERATION` is 10.

**TASK**

- [ ] Write the index tests and watch them fail.
- [ ] Add `valueLinks` beside `frontmatterMentions` — the links inside every string value that isn't one whole connection, read with `linksIn` under the page's own title and outline — and record its hits as `body` (and `embed`) rows; leave `frontmatterMentions` as it is; bump the generation so every page's rows gain the new reading on the first open.

```ts|diff
--- a/Core/Connections/scan.ts
+++ b/Core/Connections/scan.ts
@@ after frontmatterMentions @@
+/** The links inside every string value that isn't one whole connection — a sentence under any key, registered or not, read as a body is; the whole-value ones are `frontmatterMentions`'. */
+export function* valueLinks(
+  values: Record<string, unknown>,
+  ownTitle = '',
+  outline: readonly string[] = [],
+): Generator<LinkHit> {
+  for (const value of Object.values(values)) {
+    if (typeof value !== 'string' || readLink(value).kind === 'page') continue
+    yield* linksIn(value, ownTitle, outline)
+  }
+}
```

```ts|diff
--- a/Core/Index/indexSeed.ts
+++ b/Core/Index/indexSeed.ts
@@ imports @@
-import { frontmatterMentions, linksIn } from '../Connections/scan'
+import { frontmatterMentions, linksIn, valueLinks } from '../Connections/scan'
@@ the relation loops @@
   for (const hit of linksIn(body, own, outline, (p) => inCodeAt(scan, p))) {
     add(hit.syntax === 'embed' ? 'embed' : 'body', hit.target, hit.qualifier)
     if (hit.at >= scan.lineStarts[scan.citations.firstLine])
       add('citation', hit.target, hit.qualifier)
   }
+  // A value's links are a small body's — under the page's own title and outline, never citations.
+  for (const hit of valueLinks(values, own, outline))
+    add(hit.syntax === 'embed' ? 'embed' : 'body', hit.target, hit.qualifier)
   for (const { target, qualifier } of frontmatterMentions(values))
     add('frontmatter', target, qualifier)
```

```ts|diff
--- a/Desktop/Store/ddl.ts
+++ b/Desktop/Store/ddl.ts
@@ INDEX_GENERATION @@
~export const INDEX_GENERATION = 11
```

```ts|diff
--- a/Core/Index/indexSeed.test.ts
+++ b/Core/Index/indexSeed.test.ts
@@ the relations a page yields — new cases @@
+  it('a link inside a value is a `body` row under the page’s own title, whatever the key', async () => {
+    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\ndescription: see [[Zeta]] and [[#Part]]\n---\n\n## Part\n`)
+    await seedContentIndex(root)
+    expect(rowsOf('Notes/A.md')).toEqual([
+      { kind: 'body', target: 'a', qualifier: 'part', count: 1 },
+      { kind: 'body', target: 'zeta', qualifier: '', count: 1 },
+    ])
+  })
+  it('a value that is one whole connection stays a `frontmatter` row and is never also a `body` one', async () => {
+    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\nDescription: '[[Zeta]]'\n---\n\nbody\n`)
+    await seedContentIndex(root)
+    expect(rowsOf('Notes/A.md')).toEqual([{ kind: 'frontmatter', target: 'zeta', qualifier: '', count: 1 }])
+  })
+  it('a value’s link adds to the body’s count for the same target', async () => {
+    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\nDescription: see [[Zeta]]\n---\n\nalso [[Zeta]]\n`)
+    await seedContentIndex(root)
+    expect(rowsOf('Notes/A.md')).toEqual([{ kind: 'body', target: 'zeta', qualifier: '', count: 2 }])
+  })
```

**VERIFY**

- [ ] The new cases fail before the change and pass after; `indexSeed.test.ts`'s existing cases are unchanged (none holds a sentence link in a value); `stores.test.ts` is untouched (no new kind or column); `Desktop/Store/open.test.ts` compares against the constant, so the bump pins nothing red.
- [ ] `scan.test.ts` gains one `valueLinks` case beside `frontmatterMentions`'s: a sentence yields its hits, a whole-value `[[Page]]` yields none, a non-string yields none; `indexSeed.ts` imports nothing new beyond the reader; `engineGraph.test.ts` and `hostGraph.test.ts` stay green.
- [ ] On open, the first launch re-extracts every page once (generation 11), then the index is steady; a page holding `description: see [[Plan]]` is listed by `queryMentions('plan')` with no Text definition in the registry, so creating one later finds its holders indexed, as creating a Context does.
- [ ] A `banner:` or File value that is one `[[Basename.ext]]` is a whole connection and keeps its `frontmatter` row as today; a Link's `https://…` address holds no link syntax and `linksIn` returns at its gate.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Task 3.2

**BEFORE:** `renameCascade` reads the registry once, keeps every registered key (`registered()`), and feeds all of them to the whole-value patch `rewriteFrontmatterConnections` — File and Select values included, which the documentation says are left alone. The body rewriter `rewrite(body, own)` builds a `§` outline from its own first argument. `skipRel` drops the caller's page from the sweep entirely, so the page's own Text value never sees a heading rename the editor settled (after Task 3.1 the page's own `[[#Old]]` is a `body` row under its title, so `queryHeadingMentions` already lists it). `editCacheBlocks` hands `edit` a block's values with no property id, so the cache pass is Link-only.

**TASK**

- [ ] Write the cascade tests and watch them fail.
- [ ] Split the frontmatter patch by type — Link-typed keys keep the whole-value patch, Text-typed keys take the body rewriter under the page's own title and the body's outline, other types take neither — written once and parameterized by how a key's type is found; stop dropping the caller's page from the sweep (its body alone is skipped); let the cache pass know which property it edits.

```ts|diff
--- a/Core/Properties/propertyCache.ts
+++ b/Core/Properties/propertyCache.ts
@@ editCacheBlocks @@
 export function editCacheBlocks(
   sidecar: Record<string, unknown>,
   ids: readonly string[],
-  edit: (values: Record<string, unknown>) => Record<string, unknown> | null,
+  edit: (values: Record<string, unknown>, id: string) => Record<string, unknown> | null,
 ): Record<string, unknown> | null {
   let next: Record<string, unknown> | null = null
   for (const id of ids) {
     const values = cachedValues(next ?? sidecar, id)
-    const edited = values && edit(values)
+    const edited = values && edit(values, id)
@@ editCaches @@
   propertyIds: ReadonlySet<string>,
-  edit: (values: Record<string, unknown>) => Record<string, unknown> | null,
+  edit: (values: Record<string, unknown>, id: string) => Record<string, unknown> | null,
 ): Promise<number> {
```

```ts|diff
--- a/Core/Nexus/cascade.ts
+++ b/Core/Nexus/cascade.ts
@@ imports @@
 import { byFoldedName } from '../Properties/properties'
+import type { PropertyDefinition } from '../Properties/properties'
@@ renameCascade — the rewriter and the patch @@
-    const rewrite = (body: string, own = ''): string =>
+    // `outlineOf` is the text whose headings a `§` run resolves against: a body's own, or the body around a value.
+    const rewrite = (text: string, own = '', outlineOf = text): string =>
       'title' in change
-        ? rewriteConnections(body, title, change.title)
+        ? rewriteConnections(text, title, change.title)
         : rewriteHeadingConnections(
-            body,
+            text,
             title,
             change.heading,
             change.to,
             own,
             runs && normalizeTitle(own) === titleKey
-              ? headingOutline(body).map((h) => h.text)
+              ? headingOutline(outlineOf).map((h) => h.text)
               : undefined,
           )
     const defs = Object.values((await readKeptRegistry(root)).defs)
-    const names = byFoldedName(defs)
-    const registered = (raw: Record<string, unknown>): Record<string, unknown> =>
-      Object.fromEntries(Object.entries(raw).filter(([k]) => names.has(foldKey(k))))
-    const moved = (values: Record<string, unknown>): Record<string, unknown> | null => {
-      const patch = rewriteFrontmatterConnections(values, title, change)
-      return Object.keys(patch).length ? { ...values, ...patch } : null
-    }
-    const spaceMoved: Rewrite = (raw) => {
-      const next = moved(registered(raw))
-      return next && { ...raw, ...next }
-    }
+    const names = byFoldedName(defs)
+    type TypeOf = (key: string) => PropertyDefinition['type'] | undefined
+    const byName: TypeOf = (key) => names.get(foldKey(key))?.type
+    // One writer per key: a Link value is a whole connection and takes the whole-value patch; a Text value is prose and takes the body's rewriter under the page's own title; every other type is left as written. `typeOf` answers a key's type — by name for a file or a Space, by the block's own definition for a cache.
+    const patchOf = (
+      raw: Record<string, unknown>,
+      typeOf: TypeOf,
+      own: string,
+      outlineOf: string,
+    ): Record<string, string> => {
+      const links = Object.fromEntries(Object.entries(raw).filter(([k]) => typeOf(k) === 'link'))
+      const patch = rewriteFrontmatterConnections(links, title, change)
+      for (const [key, value] of Object.entries(raw)) {
+        if (typeOf(key) !== 'text' || typeof value !== 'string') continue
+        const next = rewrite(value, own, outlineOf)
+        if (next !== value) patch[key] = next
+      }
+      return patch
+    }
+    const withPatch = (
+      raw: Record<string, unknown>,
+      patch: Record<string, string>,
+    ): Record<string, unknown> | null => (Object.keys(patch).length ? { ...raw, ...patch } : null)
+    const spaceMoved: Rewrite = (raw) => withPatch(raw, patchOf(raw, byName, '', ''))
     const text = (content: string, file: string): string | null => {
-      const patch = rewriteFrontmatterConnections(
-        registered(splitFrontmatter(content)),
-        title,
-        change,
-      )
-      const keys = Object.keys(patch)
       const { body } = splitEnvelope(content)
-      const next = rewrite(body, titleFromPath(file))
+      const own = titleFromPath(file)
+      const patch = patchOf(splitFrontmatter(content), byName, own, body)
+      const keys = Object.keys(patch)
+      // The caller's editor already rewrote its own body; its frontmatter still takes the patch.
+      const next = relative(root, file) === skipRel ? body : rewrite(body, own)
       return next === body && keys.length === 0
         ? null
         : mergeFrontmatter(content, patch, keys, next)
     }
     const tree = heldTreeOf(root)
-    const files = rels.filter((rel) => rel !== skipRel).map((rel) => join(root, rel))
+    const files = rels.map((rel) => join(root, rel))
@@ renameCascade — the caches @@
-    // A heading edit settles often and a cached Link still reaches its page, so only a title reaches the caches.
-    const linkIds = new Set(defs.filter((d) => d.type === 'link').map((d) => d.id))
-    const uncached =
-      'title' in change && tree ? await editCaches(root, tree.collections, linkIds, moved) : 0
+    // A heading edit settles often and a cached Link still reaches its page, so only a title reaches the caches; a cached Text value follows the rename as a cached Link does. A block is keyed by page id, so the type comes from the block's own definition.
+    const byId = new Map(defs.map((d) => [d.id, d]))
+    const cachedIds = new Set([...byId].filter(([, d]) => d.type === 'link' || d.type === 'text').map(([id]) => id))
+    const movedCache = (values: Record<string, unknown>, id: string): Record<string, unknown> | null =>
+      withPatch(values, patchOf(values, () => byId.get(id)?.type, '', ''))
+    const uncached =
+      'title' in change && tree ? await editCaches(root, tree.collections, cachedIds, movedCache) : 0
```

```ts|diff
--- a/Core/Nexus/cascade.test.ts
+++ b/Core/Nexus/cascade.test.ts
@@ renameCascade over frontmatter — beforeEach also creates a Text def named Notes and a File def named Files @@
+  it('rewrites a link inside a Text value as prose, alias kept, and writes a whole-value Text link once', async () => {
+    const a = await createTestPage(dir, 'Prose', { body: 'no links here' })
+    if (!a.ok) throw new Error('setup failed')
+    await setValue(a.value.path, 'Notes', 'see [[Target|the brief]] here')
+    const b = await createTestPage(dir, 'Whole', { body: 'no links here' })
+    if (!b.ok) throw new Error('setup failed')
+    await setValue(b.value.path, 'Notes', '[[Target|New Target]]')
+    await renameCascade(root, 'Target', { title: 'New Target' })
+    expect((await fmOf(a.value.path)).Notes).toBe('see [[New Target|the brief]] here')
+    expect((await fmOf(b.value.path)).Notes).toBe('[[New Target|New Target]]')
+  })
+  it('leaves a File value and a Select value that read as connections', async () => {
+    const a = await createTestPage(dir, 'Other', { body: 'no links here' })
+    if (!a.ok) throw new Error('setup failed')
+    await setValue(a.value.path, 'Files', '[[Target]]')
+    await renameCascade(root, 'Target', { title: 'New Target' })
+    expect((await fmOf(a.value.path)).Files).toBe('[[Target]]')
+  })
@@ renameCascade for a heading — new cases @@
+  it('rewrites a `[[#Old]]` and a `§Old` run inside the page’s own Text value, with skipRel leaving its body alone', async () => {
+    // Page A: body '## Setup\n[[#Setup]]' (already rewritten by the editor), Notes: 'see [[#Setup]] and §Setup'.
+    // With `inPageHeadingResolution` automatic and the index seeded, `renameCascade(root, 'A', { heading: 'Setup', to: 'Intro' }, rel(a))`
+    // leaves A's body as written, sets A's Notes to 'see [[#Intro]] and §Intro', and lists A in `r.pages`.
+  })
@@ the link cascades reach Spaces and caches — new cases @@
+  it('a title rename moves a Space’s Text value and a cached Text value onto the new title', async () => {
+    // A Space sidecar holding Notes: 'see [[Target]]' and a Collection cache holding the Text property with 'see [[Target]]':
+    // after `renameCascade(root, 'Target', { title: 'New Target' })` both read 'see [[New Target]]'.
+  })
```

**VERIFY**

- [ ] The new cases fail before the change and pass after; the existing `skipRel` case (`cascade.test.ts:222`) still holds — the caller's page is in `rels` through its own `[[#Setup]]` body row, its body is untouched and its frontmatter patch empty, so `text()` returns `null`, it is never touched, and `r.pages` lists only the other page. When the index isn't ready a heading rename sweeps nothing (`?? []`), as today.
- [ ] `grep -rn "registered(" Core/Nexus/cascade.ts` → no hits; `Core/Nexus/configReach.ts`'s `editCacheBlocks` call compiles unchanged (its `edit` ignores the new second argument).
- [ ] A Text value of exactly `[[Old|New]]` lands as `[[New|New]]` (the body rewriter's spelling), never `[[New]]` — one writer.
- [ ] On `~/Test`, rename a page another page's Text value names in a sentence: the sentence follows; delete that page: the sentence stays and reads as a phantom; restore it: the phantom resolves again.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Task 3.3

**BEFORE:** `spacesLinkHeading` decides whether an outside heading rename sweeps the Spaces by reading each Space value as a whole-value connection (`readLink`), so a Space value `see [[Page#Heading]]` never answers.

**TASK**

- [ ] Write the gate test and watch it fail.
- [ ] Read a Space's values with the index's two readers, so the gate and the index agree on what names a heading.

```ts|diff
--- a/Core/Nexus/cascade.ts
+++ b/Core/Nexus/cascade.ts
@@ imports @@
+import { frontmatterMentions, valueLinks } from '../Connections/scan'
@@ spacesLinkHeading @@
-/** Whether a Space the tree holds links `title#heading`, which no index names. */
+/** Whether a Space the tree holds links `title#heading` — as a whole value or inside one — which no index names. */
 export function spacesLinkHeading(root: string, title: string, heading: string): boolean {
   const [page, section] = [normalizeTitle(title), normalizeTitle(heading)]
   return (heldTreeOf(root)?.contexts ?? []).some((g) =>
-    g.spaces.some((s) =>
-      Object.values(s.values ?? {}).some((value) => {
-        const link = typeof value === 'string' ? readLink(value) : null
-        return (
-          link?.kind === 'page' &&
-          normalizeTitle(link.title) === page &&
-          normalizeTitle(link.heading ?? '') === section
-        )
-      }),
-    ),
+    g.spaces.some((s) =>
+      [...frontmatterMentions(s.values ?? {}), ...valueLinks(s.values ?? {})].some(
+        (h) => h.target === page && h.qualifier === section,
+      ),
+    ),
   )
 }
```

```ts|diff
--- a/Core/Nexus/cascade.test.ts
+++ b/Core/Nexus/cascade.test.ts
@@ the link cascades reach Spaces and caches — new case @@
+  it('an outside heading rename reaches a Space whose value names the heading in a sentence', async () => {
+    // A Space sidecar holding Notes: 'see [[Target#Setup]] first'; `spacesLinkHeading(root, 'Target', 'Setup')` is true,
+    // and false for Notes: 'see [[Target]] first'.
+  })
```

**VERIFY**

- [ ] The new case fails before the change and passes after; the existing Space heading case (`cascade.test.ts:642`) still passes through `frontmatterMentions`; `readLink` is still imported by `cascade.ts` for `deleteCascade`'s `namesGone`.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint — Phases 2 and 3

Run once, after both phases have landed and merged.

- [ ] The two phases' `git diff --name-only` lists are disjoint; Phase 3's lists only host-run files and their tests; the compile is clean with `numberPicker` gone; `engineGraph.test.ts` and `hostGraph.test.ts` are green.
- [ ] `node ".claude/Scripts/Text Property Drive/live-drive.mjs" 1 2 3` passes every check and restores `~/Test`. Spaces (`spaceMoved`, `spacesLinkHeading`) are proven by `cascade.test.ts` alone; the drive seeds no Space.
- [ ] Read the screenshots: `Drive Target` in the connection color and `Nowhere` with muted brackets in the table cell, both cards, and the panel; the pen beside the value on hover on each surface, its glyph and size the row grip's, the first line ending in `…` short of it; the popover anchored at the value on each surface; the glance tile; the panel's Text row indistinguishable from its Link row but for the pen; the Compact card's value in the bordered field at the row's height; the phantom tone after the delete and the connection color after the restore. Anything that reads wrong is fixed before Phase 4 opens.
- [ ] Line-count delta reported (comments and tests excluded).

---

### Phase 4 — TextPane

**GOAL:** The pen and the Properties ▸ leaf open TextPane: a dropdown pane mounting MarkdownPM in a `text` scope — the inline vocabulary and nothing else — with undo history, a placeholder, keys that never leave the editor, and a save on every close. After Phases 2 and 3, since it needs the `popover` route (Task 2.3) and reads connections (Phase 3 makes them reach the index; the pane renders them regardless).

#### Task 4.1

**BEFORE:** `MarkdownScope` is `'page' | 'cell'`; the `'cell'` scope reads the list vocabulary and nothing else (`detect.ts:493`); every switch on the scope has two arms; the native Format menu is built per scope and offers Lists in both. No scope reads the inline marks alone.

**TASK**

- [ ] Write the scope tests and watch them fail: in `detect`'s scope cases, a `- item`, `1. item`, `- [ ] item`, and `# heading` line under `'text'` is prose (no marker, no intent), while `**bold**`, `_italic_`, `==mark==`, `` `code` ``, and `[[Page]]` still read as marks; the menu builder for `'text'` yields Insert Link and Format and no Lists group.
- [ ] Add `'text'` to `MarkdownScope`. `npm run typecheck` names every switch on the scope; in each, `text` takes the inline reading and no block one — `detect` (markers, headings, quotes, fences, tables, citations), the line intents (`docLineIntentsOf`, `seatPastMarker`, `listGlyphOf` reach no marker), the native menu's groups, the autocomplete's gate (`[[` opens, `![[` stays silent as in a cell), and `inlineSurface(getConn, scope)`. No `text`-only predicate outside the scope's own arms; where `cell` and `text` agree, they share the arm (`case 'cell': case 'text':`).
- [ ] `detect.ts:493`'s comment names the three scopes.

**VERIFY**

- [ ] The new cases fail before the change and pass after; `cellLists.test.tsx`, `cellNavigation.test.tsx`, and every MarkdownPM test stay green with `CellEditor` untouched (`git diff --stat HEAD -- Core/MarkdownPM/Tables/CellEditor.tsx` empty).
- [ ] `grep -rn "case 'text'" Core/MarkdownPM` lists only arms beside a `case 'cell'` or in a switch on `MarkdownScope`.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Task 4.2

**BEFORE:** `PropertyValueInput` routes `popover && def.type === 'number'` to `NumberValuePicker` and every other popover to `TextPicker`; a Text pen or Properties ▸ leaf therefore opens the single-line popover. The one MarkdownPM surface under a `PickerMenu` is the glance's read-only page tile, whose `glance-pane.css` already overrides the editor's `--rail-inset` and content padding for a pane; no editor outside a page carries `history()` or a placeholder. `PickerMenu` unmounts its body after the exit while the seat keeps the picker component mounted (`useHeld`, `lastCell`), so an editor created once per component would be attached to a detached node on the second open. A right-click inside a `PickerMenu` is `preventDefault`ed by its layer, so Chromium never emits the `context-menu` event the Format menu waits on.

**TASK**

- [ ] Write the TextPane tests and watch them fail.
- [ ] Add `TextPane` beside `NumberValuePicker`: a shell (the `PickerMenu` and its ×) around a `TextPaneEditor` that mounts and unmounts with the pane's body, in the `text` scope; route `text` to it in `PropertyValueInput`; save on Escape, on an outside press, on the ×, and on unmount — once, through one `save()`; mirror an outside change only into a clean pane; let the editor's own right-click reach the Format menu.

```ts|diff
--- /dev/null
+++ b/Core/Properties/Pickers/TextPane.tsx
@@ new file @@
+import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
+import { EditorView, keymap, placeholder } from '@codemirror/view'
+import { EditorState, Prec } from '@codemirror/state'
+import { history, historyKeymap } from '@codemirror/commands'
+import { paneKeys } from '../../MarkdownPM/Menus/caretPane'
+import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
+import { AccessoryButton } from '@pommora/uix/Menus'
+import { useLatest } from '@pommora/uix/Utilities/stableApi'
+import { type EditorHost, editorHost, mirrorBody } from '../../MarkdownPM/api'
+import { inlineSurface } from '../../MarkdownPM/surface'
+import { insertNewline } from '@codemirror/commands'
+import { editorKeymap, formatKeymap } from '../../MarkdownPM/Input/formatKeymap'
+import { useReconfigured } from '../../MarkdownPM/Input/useReconfigured'
+import {
+  detectConnectionQuery,
+  useConnectionAutocomplete,
+} from '../../MarkdownPM/Autocomplete/useConnectionAutocomplete'
+import { AutocompletePane } from '../../MarkdownPM/Autocomplete/AutocompletePane'
+import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
+import { useEditorHost } from '../../Pages/editorHost'
+import { useConnections } from '../../Session/pageConnections'
+import { useSession } from '../../Session/store'
+import type { PropertyValue } from '../propertyValue'
+import './text-pane.css'
+
+const stopBubble = (e: { stopPropagation: () => void }): void => e.stopPropagation()
+
+/** A Text value's pane: MarkdownPM's `'text'` scope with its own history and placeholder, saving once on every way out. The editor lives in the pane's body, which `PickerMenu` mounts and unmounts around each open. */
+export function TextPane({
+  current,
+  open,
+  triggerRef,
+  onCommit,
+  onDismiss,
+}: {
+  current: PropertyValue | null
+  open: boolean
+  triggerRef: RefObject<HTMLElement | null>
+  onCommit: (value: PropertyValue | null) => void
+  onDismiss: () => void
+}): React.JSX.Element {
+  const tree = useSession((s) => s.tree)
+  const connections = useLatest(useConnections(tree, 'preview'))
+  const getConn = (): ConnectionsApi | undefined => connections.current
+  const host = useEditorHost({ connections: connections.current })
+  const saveRef = useRef<() => void>(() => {})
+  const close = (): void => {
+    saveRef.current()
+    onDismiss()
+  }
+  return (
+    <PickerMenu
+      open={open}
+      onDismiss={close}
+      triggerRef={triggerRef}
+      direction="down"
+      origin="center"
+      contentClassName="text-pane"
+    >
+      <AccessoryButton icon="x" size="control" ariaLabel="Save and close" className="text-pane-close" onClick={close} />
+      <TextPaneEditor
+        text={current?.kind === 'text' ? current.value : ''}
+        host={host}
+        getConn={getConn}
+        saveRef={saveRef}
+        onCommit={onCommit}
+        onClose={close}
+      />
+    </PickerMenu>
+  )
+}
+
+function TextPaneEditor({
+  text,
+  host,
+  getConn,
+  saveRef,
+  onCommit,
+  onClose,
+}: {
+  text: string
+  host: EditorHost
+  getConn: () => ConnectionsApi | undefined
+  saveRef: RefObject<() => void>
+  onCommit: (value: PropertyValue | null) => void
+  onClose: () => void
+}): React.JSX.Element {
+  const onCloseRef = useLatest(onClose)
+  const mountRef = useRef<HTMLDivElement>(null)
+  const viewRef = useRef<EditorView | null>(null)
+  const committed = useRef(text)
+  const onCommitRef = useLatest(onCommit)
+  const { setAc, acCtl, pane } = useConnectionAutocomplete(viewRef, host, getConn)
+  const formatExt = useReconfigured(viewRef, host.settings().commands, formatKeymap)
+
+  // Reads the document once and commits only what changed; a blank pane clears the key, as a blank field does.
+  const save = (): void => {
+    const doc = viewRef.current?.state.doc.toString()
+    if (doc === undefined || doc === committed.current) return
+    committed.current = doc
+    onCommitRef.current(doc.trim() === '' ? null : { kind: 'text', value: doc })
+  }
+  saveRef.current = save
+
+  useEffect(() => {
+    const view = new EditorView({
+      parent: mountRef.current!,
+      state: EditorState.create({
+        doc: text,
+        extensions: [
+          editorHost.of(host),
+          inlineSurface(getConn, 'text'),
+          history(),
+          placeholder('Begin typing.'),
+          // The autocomplete's keys first; then Enter saves and closes as a field's does, Shift-Enter breaks the line, and Tab stays in the pane and writes nothing.
+          Prec.highest(
+            keymap.of([
+              ...paneKeys([acCtl]),
+              { key: 'Enter', run: () => (onCloseRef.current(), true) },
+              { key: 'Shift-Enter', run: insertNewline },
+              { key: 'Tab', run: () => true },
+              { key: 'Shift-Tab', run: () => true },
+            ]),
+          ),
+          formatExt,
+          keymap.of([...editorKeymap, ...historyKeymap]),
+          EditorView.domEventHandlers({
+            blur: () => {
+              setAc(null)
+              return false
+            },
+          }),
+          EditorView.updateListener.of((u) => {
+            if (u.docChanged || u.selectionSet) detectConnectionQuery(u.view, setAc)
+          }),
+        ],
+      }),
+    })
+    viewRef.current = view
+    view.focus()
+    view.dispatch({ selection: { anchor: view.state.doc.length } })
+    return () => {
+      view.destroy()
+      viewRef.current = null
+    }
+    // Mount once — the body IS the live editor.
+  }, [])
+  // Saved in the mutation phase: a seat unmounting with the pane retires its writer in its own passive cleanup first, so a passive save here would be dropped.
+  useLayoutEffect(() => save, [])
+  // An outside write lands only in a pane that holds nothing unsaved; the pane's own close then writes last, as a page body's merge does.
+  useEffect(() => {
+    const view = viewRef.current
+    if (view && view.state.doc.toString() === committed.current && text !== committed.current) {
+      committed.current = text
+      mirrorBody(view, text)
+    }
+  }, [text])
+
+  return (
+    <>
+      {/* The layer above cancels every right-click; the editor's own menu asks first, so its event stops here. */}
+      {/* biome-ignore lint/a11y/noStaticElementInteractions: a bubble guard, not a control */}
+      <div className="text-pane-body mdpm-shell" onContextMenu={stopBubble}>
+        <div ref={mountRef} className="mdpm-editor" />
+      </div>
+      <AutocompletePane {...pane} />
+    </>
+  )
+}
```

```ts|diff
--- /dev/null
+++ b/Core/Properties/Pickers/text-pane.css
@@ new file @@
+/* The pane's size is its own; the body scrolls, so the `[[` pane bounds to it as it does to a glance's tile. */
+.text-pane {
+  width: 360px; /* KNOB — clears the autocomplete's title-fit width */
+  padding: 0;
+}
+.text-pane-close {
+  position: absolute;
+  top: 6px;
+  right: 6px;
+  z-index: 1;
+}
+.text-pane-body {
+  max-height: 320px; /* KNOB */
+  overflow-y: auto;
+  --rail-inset: 0px;
+}
+/* A page's shell and editor fill their host and pad for a rail the pane doesn't have. */
+.text-pane .mdpm-shell,
+.text-pane .mdpm-editor,
+.text-pane .mdpm-editor .cm-editor {
+  height: auto;
+  overflow: visible;
+}
+.text-pane .mdpm-editor .cm-content {
+  padding: 12px 14px; /* KNOB — the pane's interior inset */
+  min-height: 96px; /* KNOB — room to see the placeholder and a first list */
+}
```

```ts|diff
--- a/Core/Properties/Pickers/PropertyValueInput.tsx
+++ b/Core/Properties/Pickers/PropertyValueInput.tsx
@@ imports @@
 import { NumberValuePicker } from './NumberValuePicker'
+import { TextPane } from './TextPane'
@@ the popover routes @@
   if (popover && def.type === 'number')
     return (
       <NumberValuePicker
         ...
       />
     )
+  if (popover && def.type === 'text')
+    return <TextPane {...popover} current={current} onCommit={onCommit} onDismiss={onClose} />
   const raw = current?.kind === 'link' ? current.value : ''
```

```ts|diff
--- /dev/null
+++ b/Core/Properties/Pickers/TextPane.test.tsx
@@ new file — jsdom, mounting TextPane with a stub tree; the expectations @@
+// it('Enter saves and closes; Shift-Enter writes a line break; Tab stays in the editor and inserts nothing; a line typed as `- a` stays prose')
+// it('Escape commits the typed text once, then closes; a second close commits nothing')
+// it('the × commits and closes; an unchanged document commits nothing; a blanked document commits null')
+// it('unmounting the pane while its seat unmounts still lands the typed text (the layout cleanup runs before the seat’s passive one)')
+// it('an outside change replaces a clean pane’s text and leaves a dirty pane’s text alone')
+// it('a right-click inside the body leaves the event un-prevented for the editor’s menu, and one on the pane’s chrome stays cancelled')
```

**VERIFY**

- [ ] The new cases fail before the change and pass after (write them against the `cellLists.test.tsx` harness; the comments are the expectations). `PropertyValueInput.test.tsx` gains the `text` route.
- [ ] Open, close, and reopen the pane on the same Cards value and from the Properties ▸ menu twice in a row: the second open shows the value and types (the editor remounts with the body — `useHeld` keeps the seat's component alive across closes).
- [ ] Two reachable losses are accepted, not guarded: a row deleted from another window while the pane holds typing — the unmount save lands on a gone path and `reportRefusal` toasts; a Compact card value blanked from another window while the pane holds typing — `CardsView` nulls its picker and `commitPicked` drops the save. Both need a second window acting on the same value mid-edit.
- [ ] Live, on `~/Test`: the pen on a table cell, a Standard card, a Compact card, and a panel row opens TextPane anchored at the value; the Properties ▸ menu's Text leaf opens it where the menu originated; the Cards add-chooser's Text entry opens it. Typing renders bold, italic, highlights, and connections; a line typed as `- a` or `1. a` stays plain text; Enter saves and closes as a field's Enter does; Shift-Enter breaks the line; Tab writes nothing and never leaves the pane; `[[` opens the autocomplete bounded inside the pane body and a press on its rows keeps the pane open; a pasted URL lands as the **Default Link Format** writes it; ⌘B bolds; a right-click inside the text opens the native menu with Insert Link and Format (no Lists, Headings, Insert, or Embed); × saves and closes; Escape saves and closes (with a range selected the first Escape collapses it, as on a page); a press outside saves and closes; the value lands on disk as a `|-` block scalar and the cell shows its first line.
- [ ] Open the pane, type, click another cell: the shield takes the press, the pane saves and closes through `close()`, and no refusal toast appears. Open it on a row, delete the row elsewhere: the pane unmounts and saves nothing if untouched.
- [ ] A Text value changed in another window while the pane is open and untouched appears in the pane; one changed while the pane holds typing is left to the pane's close.
- [ ] A document ending in a newline lands as `|` and reopens with its trailing line; a typed `- a` lands as `"- a"` and reopens as the same literal line. The drive's group 4 asserts each on disk.
- [ ] Parity with MarkdownPM, one for one: the drive's `parity-page` and `parity-pane` records — each SHOWCASE line as runs of `color|fontWeight|fontStyle|fontSize|fontFamily|decoration|fill|verticalAlign`, the line's height, and the drawn caret's (`.caret-bar`) computed background color, width, and height — are identical between Drive Target's body and the pane, `.cm-content`'s padding aside.
- [ ] Run the gates. Check the work for unnecessary code or obvious mistakes.

#### Review Checkpoint

- [ ] `node ".claude/Scripts/Text Property Drive/live-drive.mjs" 1 2 3 4` passes every check and restores `~/Test` — the whole run, as the final report will quote it.
- [ ] Read the screenshots: the pane's bold, italic, highlight, connection colors, and caret against `parity-page` — the same shapes, spacing, tones, and caret; a `- milk` line drawn as plain text in the pane and in the cell; the autocomplete inside the pane body; the native menu with no Lists group; the pane opened from the Properties ▸ menu and from the Cards chooser, anchored where each originated; the × in the pane's corner at the kit's control size. Anything that reads wrong is fixed before Phase 5 opens.
- [ ] Line-count delta reported (comments and tests excluded).

---

### Phase 5 — Documentation

**GOAL:** The five documents read true for a catalog that holds Text. Surgical edits, written as the behavior had always been there; nothing is amended or superseded.

#### Task 5.1

**BEFORE:** PropertiesPM counts eleven types, has no Text row or section, says text-shaped values keep the shared field, and lists Text under *§Pending*; ViewTypesPM's filter table has a "Text (Title)" row and no Link row; ConnectionsPM says the rewrite covers "the Link property values in frontmatter", that File values are left alone (true only after Task 3.2), and counts two connection renderers; MarkdownPM describes the `'cell'` scope as a table's; PommoraPRD's property list (`:143`) lacks Text and says "There is no free-form text type yet" (`:145`); SymbolsPM's icon table (`:44-46`) has no Text row; PommoraUIX's Row Tokens lack `--row-value-reach` (`PickerMenu` is untouched).

**TASK**

- [ ] Make each passage true: the four hunks below, and in PommoraPRD add **Text** to the property list and remove the "no free-form text type yet" sentence (its remaining clauses stay), and in SymbolsPM add `| Text | \`text-align-start\` |` beside Title's row; in the Decision Log, rewrite every decision that gave Text lists to the ruling in *§Deviations*, surgically, as if it had always read so.

```ts|diff
--- a/.claude/Features/PropertiesPM.md
+++ b/.claude/Features/PropertiesPM.md
@@ §The Type Catalog — line 8 @@
~The twelve types are the type ids in `Core/Properties/properties.ts`; the on-disk value is bare and natively typed, legible to any YAML tool. …(rest of the sentence unchanged)
@@ the table — before the Number row @@
+| **Text**          | `Notes: opus`, or `Notes: |-` over indented lines for several                 | A free-typed string, plain and unquoted wherever YAML allows; a number, list, or map another app wrote reads as its text and stays as written until edited |
@@ §Property Types — a new section between Checkbox and Number @@
+#### Text
+
+A Text property holds one free-typed string. It edits single-line wherever a value shows, and multi-line in **TextPane**, the dropdown a pen beside the value opens, where the text runs to many lines and takes bold, italic, highlights, and connections. At rest a value shows its first line with its connections live, so a `[[Page]]` written inside a sentence opens, glances, follows a rename, and reads as a phantom when its page is deleted, as a link in a page body does. On disk the value is plain and unquoted wherever YAML allows, and a value another application wrote as a number, list, or map reads as its text and stays as written until it is edited. Text filters with Link's operators, sorts alphabetically, and never groups or seeds a new page.
+
@@ §Shared Mechanisms — the Value Picker paragraph @@
~… Text-shaped values — a number, a link's address or alias, a Text value's first line — keep the shared text field, and a Text value's pen opens TextPane. …
@@ §Pending @@
-- **A Text type** — free text is the default type in other frontmatter editors and has no Pommora type; a Select stands in for it today.
```

```ts|diff
--- a/.claude/Features/ViewTypesPM.md
+++ b/.claude/Features/ViewTypesPM.md
@@ the filter table @@
-| Text (Title) | Is · Isn't · Starts With · Contains · Doesn't Contain |
+| Title | Is · Isn't · Starts With · Contains · Doesn't Contain |
+| Text · Link | Is · Isn't · Starts With · Contains · Doesn't Contain · Is Empty · Isn't Empty |
@@ §Sort — line 52 @@
~… dates chronological, checkbox by rank, text — Title, Text, Link, Multi-select, and File — case-insensitive. …
@@ §Table › Rows & Cells — the type-aware cell sentence and the click rules @@
~… a page icon and title, chips, a checkbox or switch, a link, file chips, a formatted date or number, a progress bar, or a Text value's first line with its connections live — reading the per-view column style. …
~… a number enters its inline editor or, drawn as a bar, the number picker, a Text value enters its inline field over its first line or, from the pen beside it, TextPane, a link opens its address, …
```

```ts|diff
--- a/.claude/Features/ConnectionsPM.md
+++ b/.claude/Features/ConnectionsPM.md
@@ §Syntax + Scope — line 4 @@
~… written in the page's Markdown body, inside a Text property's value, or as the whole value of a Link property. …
@@ §The Rename Cascade — line 24 @@
~… one pure pass over three patterns (wikilink, page embed, markdown link) plus the Link property values in frontmatter, with a Text property's value rewritten as the prose it is — and the cascade runs it over every file the content index relates to the title, …
@@ line 28 @@
~Deleting a page strips the Link property values naming it from every page and Space the tree holds outside the delete, through the same sweep, and the delete's notice counts what it reached. Bodies and Text values keep their connections and read as phantoms. …
@@ §Known Issues @@
-- **Connection rendering is written twice.** The editor's decoration layer and the resting property-cell renderer each map a connection's resolved state to its styling by hand, so the two can drift — today the cell omits the open-state glyph and target mark the editor draws.
+- **Connection rendering is written twice.** The editor's decoration layer and the Link property's resting cell each map a connection's resolved state to its styling by hand, so the two can drift — today the Link cell omits the open-state glyph, the phantom and ambiguous tones, the glance, and the heading display the editor and a Text value's resting render draw.
```

```ts|diff
--- a/.claude/Features/MarkdownPM.md
+++ b/.claude/Features/MarkdownPM.md
@@ §Architecture — line 10 @@
~… which is what lets the same editor run inside a page, a window, a tile, a property's TextPane, and a test harness. …
@@ §Tables — the Cells bullet @@
~- **Cells** — The focused cell mounts a nested editor with the main editor's inline rendering — the cell scope, which a Text property's pane mounts as well, under its own history; a resting cell renders the same content as plain markup. …
```

**VERIFY**

- [ ] `grep -rn "eleven" .claude/Features .claude/Guidelines .claude/CLAUDE.md` → no hits; `grep -n "Text (Title)" .claude/Features/ViewTypesPM.md` → no hits; *§Pending* in PropertiesPM holds no Text entry.
- [ ] Read each edited paragraph once in full: no sentence contradicts its neighbor, no "now" or "previously", no reference to this plan.
- [ ] `PommoraUIX.md` changes on one line, the Row Tokens row (`git diff --stat -- .claude/Features/PommoraUIX.md` → 1 file, that row).

---

### Completion Criteria

**Conformance**

- [ ] No duplicated mechanism: `grep -rn "arm: glanceLink" Core` → one hit; `grep -rn "numberPicker" Core UIX` → none; `grep -rn "registered(" Core/Nexus/cascade.ts` → none.
- [ ] No `text`-only predicate outside Text's own arms: `grep -rn "=== 'text'" Core UIX --include='*.ts' --include='*.tsx'` lists only `PropertyValueInput.tsx`'s route (Number's twin), `CardsView.tsx`'s Compact span (the layout's one seat), and `cascade.ts`'s type split (beside its `'link'` twin).
- [ ] Nothing changed outside what the plan named: `git diff --name-only <baseline>..HEAD` matches the union of the tasks' hunks.
- [ ] `Core/Contract/bridge.ts` unchanged; `PickerMenu.tsx` unchanged.

**Correctness**

- [ ] A Text property is created first in the New Property menu with the `text-align-start` glyph, and a `description:` line a file already held appears on its page at once.
- [ ] `Notes: 42`, `Notes: true`, `Notes: [milk, eggs, bread]`, and an unquoted `Notes: [[Plan]]` each show as their text and stay byte-identical on disk after Repair On Open, an adjacent write, and a frozen Trash restore; the first edit replaces them with the typed string.
- [ ] Typing `opus` lands as `Notes: opus`; typing `42` lands as `Notes: "42"`; a two-line value lands as a `|-` block scalar and round-trips.
- [ ] A click on a filled value edits its first line in place on the table, both card layouts, and the panel; the lines behind it are untouched; an emptied first line drops.
- [ ] The pen reveals on hover per value, at rest on touch, and opens TextPane on every surface; the Properties ▸ leaf and the Cards chooser open it too; every way out saves once.
- [ ] A link inside a Text value colors, opens (⌘ for a new tab), glances, is indexed as `body`, follows a page rename and a heading rename (the page's own included), and reads as a phantom after a delete; a Link value `[[#Heading]]` opens its own page at the heading.
- [ ] Text takes Link's seven filter operators, sorts A → Z, is absent from Group By and Sub-Group, and seeds nothing on New Page Above/Below or an `Is` rule.
- [ ] End to end: create Text **Notes**, fill it on three pages from three surfaces, write a `[[link]]` in one, rename the linked page, filter and sort by Notes, delete the linked page, restore it — every step as the log says.

**Completeness**

- [ ] Every task ticked; no scaffolding, debug output, or unauthorized TODO in `<baseline>..HEAD`.

**Confirmation**

- [ ] Every verification result read; each new test goes red with its change reverted (the executor reverts one hunk per test file and watches).
- [ ] The drive's full run (`live-drive.mjs 1 2 3 4`) is green from the final HEAD, and every screenshot it wrote was read by the orchestrator at the checkpoint that produced it.
- [ ] A line typed as `- milk` or `1. a`, through the field or the pane, lands as a string and reads back as the literal text, on disk and on screen, in the drive's run.

**Continuity**

- [ ] *§Reconciliation* complete; living documents read true; *§Deviations* each fixed or ruled on.

**Confidence**

- [ ] Gates green from clean on `<baseline>..HEAD`; *§Baseline* counts moved as planned.
- [ ] Diff size as the plan implied: roughly +500 / −80 lines (comments, tests, and the drive excluded) — the cascade's split is the removal; a larger figure is reported, not tidied away.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run. Edits found in adjacent files that no task made belong to Nathan — folded into the commit at hand, not reverted.

**AGENTS:** Each phase is implemented by one `opus-medium` agent and, once landed, reviewed by one `opus-high` agent briefed simplicity-first and outward-facing — does the phase read correct from the rest of the codebase's point of view, not whether it churned in isolation — on the phase's diff and the drive's output. After Phase 5, three agents run in order over the whole `<baseline>..HEAD` diff, each after the last one's findings have landed:

- A `fable-high` **simplification lens**, reading the total before and after: over-complication, duplication, cross-file conflicts, and the principles the work was held to — assemble before adding, no odd one out, look outward, look before committing, right-sized, nothing overcomplicated. It is briefed with this plan's *§Constraints* and *§Deviations* and nothing else of the plan.
- A `fable-medium` **adversarial review**: correctness and regressions along every path the diff touches — the decode and spelling, the field, the pane's saves and dismissals, the index and cascade, the Link cell — with the drive's run as its evidence of what was exercised.
- A `fable-high` **neutral verification**. This agent is handed no plan, log, report, skill, or document: only the baseline commit, HEAD, and a plain statement of what the change intended to produce (the first paragraph of *§Summary*, in Nathan's terms). It is asked to treat the diff as a change to a codebase it would inherit, not an addition to one, and to answer honestly from the whole codebase's perspective: was it done cleanly and sensibly, without contradiction, maintainably, without over-complication, without any odd-one-out behavior, and without regressions — and would it be comfortable inheriting this code.

Every finding from the three is fixed in the run or ruled on in *§Deviations* with the reason; nothing is carried.

- [ ] Phase review (`opus-high`): Phase 1 · Phase 2 and Phase 3 (one each, in parallel) · Phase 4 · Phase 5
- [ ] All phase findings fixed or ruled on
- [ ] Final review over `<baseline commit>..HEAD`: simplification lens → adversarial → neutral, each closed before the next opens
- [ ] The orchestrator's own pass from the final HEAD: `live-drive.mjs 1 2 3 4` green · gates · baseline · diff · deviations · criteria
- [ ] Reconciliation walked; living documents read
- [ ] Report delivered

#### Reconciliation

- `Core/Views/Host/useViewCreation.ts` — "single-value user properties, a link aside" — Task 1.5
- `Core/Properties/properties.test.ts` — "accepts the 11 type ids" — Task 1.2
- `Core/Views/Table/useColumns.test.ts` — the left-align enumeration's title names title, number, link, modified — Task 1.4
- `Core/Properties/Pickers/PropertyValueInput.tsx` — Number as the only typed popover route — Task 4.2
- `Core/MarkdownPM/Links/linkClicks.ts:50` — "The one answer the body, a footnote marker, and a table cell resting or live all read" — Task 2.1 (a resting value outside an editor reads `cellLinkTarget` + `openPage` instead; reword to name it)
- `Core/MarkdownPM/surface.ts:23` — "Everything a page body and a table cell share … The two surfaces differ only in what wraps this" — Task 4.2 (three surfaces)
- `Core/MarkdownPM/Engine/detect.ts:493` — "A table cell reads the list vocabulary and nothing else" — Task 4.1 (three scopes, each named)
- `Core/Index/indexSeed.ts:73` — "Every `<Title>` key counts, registered or not" — Task 3.1 (the new loop's comment says the same of a value's links; the two read as one rule)
- `Core/Nexus/cascade.ts:161` — the sweep comment gains "a Text value is rewritten as prose; `skipRel` is a body the editor already rewrote" — Task 3.2
- `Core/Nexus/cascade.ts:59` — `spacesLinkHeading`'s comment gains "or names it in a sentence" — Task 3.3
- `.claude/Features/PropertiesPM.md` — "eleven", the table, *§Property Types*, the Value Picker paragraph, *§Pending* — Task 5.1
- `.claude/Features/ViewTypesPM.md` — the filter table's "Text (Title)" row, *§Sort*, *§Rows & Cells* — Task 5.1
- `.claude/Features/ConnectionsPM.md` — *§Syntax + Scope*, *§The Rename Cascade* (File values now truly left alone), *§Known Issues* — Task 5.1
- `.claude/Features/MarkdownPM.md` — *§Architecture*'s surfaces, *§Tables*' Cells bullet — Task 5.1
- `.claude/Features/PommoraPRD.md` — the property list and "no free-form text type yet" — Task 5.1
- `.claude/Features/SymbolsPM.md` — the property icon table — Task 5.1
- `.claude/Scripts/README.md` — no paragraph for the Text Property Drive — Task 1.1
- `.claude/Planning/Text Properties — Decision Log.md` — every decision that gave Text lists (the pane's list vocabulary and keys, the cell's list render) is rewritten to the no-lists ruling, and *§Open Items* 1 and 2 close (the Format menu opens through the body's `stopPropagation`; the autocomplete bounds to the pane body) — the closing commit

#### Report & Closure

Written when phase review is closed, neutral verification has passed, the final pass is ticked, and reconciliation is walked, in the shape *writing-plans-v3* §5.5 gives: the feature in one paragraph, phase by phase, verification (phase review · the three final agents · the orchestrator's own pass with the drive's final output · reconciliation), deviations, the diff's line count and run time, and a closing stance. Written for Nathan to read on waking: plain language, the real gate output, what was ruled and why, nothing overstated.

### Deviations

Departures from the decision log, each with the line that forced it, and the rulings made at ratification on 10-07-2026. Nothing is open; an executor that meets a new fork takes the sibling behavior and adds its line here.

- **F-3 — "A press outside leaves TextPane open."** Replaced by the sibling behavior: a press outside saves and closes, as Number's, Link's, and Date's popovers do (`PickerMenu` default). Forced by `ContentView.tsx:91` (views park off screen on navigation rather than unmounting, so a persistent portalled pane would float over the next page), `nexusSlice.ts:100-118` (a Nexus switch rebinds the root before the view unmounts, so a cleanup save would land on the wrong Nexus), and `ValuePickPresenter.tsx` (the Properties ▸ seat has no parking signal). Honoring F-3 would need a `dismissOnOutside` prop on `PickerMenu`, a parked-close hook through `useContentHost`, a presenter dismiss on selection change, and an open-edit registry in `saveScheduler.ts` — four mechanisms against the decision's own "no new machinery here."
- **Quit and ⌘W with the pane open.** Typing since the last save is lost, exactly as a focused Number or Link field loses its typing today (`flushAllSaves` knows neither). No open-edit registry is built, since it would make TextPane the one field that survives quit.
- **The pen on an empty value.** None is drawn: `Cell` renders the `empty` placeholder before any kind arm, as it does for Number from empty, and the doors from empty are the click (the inline field), the Properties ▸ leaf, and the Cards chooser; the pen appears once a value exists.
- **Sorting and filtering by the raw text.** Text sorts and filters by the string the file holds, markup included, as Link sorts by its spelling; MarkdownPM has no plain-text reduction to call, and one written for a leading `**` or `- ` would be the type's one special mechanism.
- **`LinkCell` opens through `select`**, ignoring **Open Connections In Preview**, while a Text value's resting link routes through `openPage`. The difference belongs to the *LinkCell On The Shared Renderer* prospect the log parked; Task 2.4 doesn't widen into it.
- **D-3 — the one-line clip.** A `pre`, `1lh`, `overflow: hidden`, `text-overflow: ellipsis` box: a long first line ends in `…` short of the pen (Nathan, 10-07-2026: as `PathField` seats its browse button, with an ellipsis at rest rather than the fade). No hover scroll: the kit's scroll cap was tried and dropped in Phase 2, because a `pre` box's scroll width is its widest line, hidden lines included, and `line-clamp`, `::first-line`, and `pre-wrap` left it so in Electron 42; a scroll bounded to the first line would need the resting render to slice, which D-3's don't-foreclose forbids. The pen overlays the value's trailing edge and shows on hover (at rest on touch); at rest the text runs to the row's edge exactly as a Link value does, and while the glyph shows the text takes a trailing pad so its ellipsis lands short of the glyph (Nathan, 10-08-2026, on the panel's screenshot: a held slot left the value a glyph short of Link's edge).
- **D-2 — "no new `ValueIntent` kind."** None is added; one is renamed: `numberPicker` → `popover`, so Number's bar and Text's pen produce one intent every surface already maps (`TableView.tsx:153`, `CardValue.tsx:92`, `PropertyPanel.tsx:285`). The alternative was a second, Text-only route into the same seats.
- **D-2 / D-6 — the pen "seated in `InputField`'s `trailing` slot on a Compact card."** The pen lives in `TextCell` on every surface; the Compact card's chrome is the kit's `borderedField` class on the flow span, not an `InputField`, since `InputField` without `edit` adds only the two slots (`InputField.tsx:63-97`) and the pen is already in the value. One renderer, one chrome rule.
- **D-5 — "the row is the table's only host."** The renderer's own root is the reveal host on every surface (`cell-text-host`), nested inside the row host on the table; CSS custom properties scope the inner host to its subtree, so the row grip is unaffected (`hover-reveal.css.ts:12-15`).
- **G-2 — the type-aware patch.** Beyond Link and Text, every other registered type is now excluded from the whole-value patch (`cascade.ts:194-195` fed all of them to it, File values included, against ConnectionsPM's *§The Rename Cascade*). Untested behavior today; a sibling fix taken under "a sibling that's wrong changes everywhere."
- **G-2 — `skipRel`.** Reinterpreted as "this page's body is already rewritten": the filter that dropped the page from the sweep goes, and its frontmatter takes the patch, so its own Text value follows a heading rename the editor settled (`mutate.ts:94` passes the page as `skipRel`; `headingRenameSettle.ts:57-58` rewrites the body only). The heading sweep covers what a ready index names and the caller's own page, since a value holding only a `§Old` run has no row left once the body's save re-indexed under the new heading.
- **G-2 — caches.** A Text value a property Remove cached follows a title rename as a cached Link does (`assignment.ts:85-100` caches every type); `editCacheBlocks` hands `edit` the property id to tell them apart. Not in the log; the alternative leaves a cached sentence pointing at a gone title.
- **A link inside a member of a foreign list value** (`Notes: ["see [[Page]]", more]`) shows as a connection through `yamlInline` but is read by neither the index nor the cascade, which scan strings alone; reading every non-string value through `yamlInline` would put a yaml serialization on the index's per-value loop for a shape no application writes, and the first edit turns the value into a string that indexes normally. Left as a known limit.
- **G-5 / G-6 / G-7 — the index stays registry-blind.** The log had the index read the registry to find Text-typed keys, fall back to disk when no tree is held, and re-index a key's holders when a Text definition is created. The code's own convention is the opposite: the index reads what a file holds, registered or not (`indexSeed.ts:73`, "so a Context created later finds its holders"), and the registry governs only what the cascade writes. So the index scans every string value that isn't one whole connection with `linksIn` (`readLink(raw).kind === 'page'` is the shape test `frontmatterMentions` already makes), and a definition created later finds its holders already indexed. Consequences: no registry reach, no fallback, no holder re-index, no `Index → Properties` edge, no gap for a definition that arrives by sync; a Text value of exactly `[[Page]]` is a `frontmatter` row (G-5 wanted `body`; only the Matrix's edge kind reads the difference); a sentence link under an unregistered key is indexed too, which the rename sweep reads and leaves as written, as it does today for an unregistered whole-value link.
- **`INDEX_GENERATION` 10 → 11.** Not in the log. Every page's rows gain the new reading on the first open after upgrade, so the sentence links files already hold are found without a rewrite.
- **Lists (Nathan, 10-08-2026).** Text holds no lists: a line that spells a list marker is prose in the cell and in TextPane, because a YAML list under a key is a list to every other reader, and a Text string drawn as a list would be a list in Pommora alone. The log's list vocabulary for the pane, the shared key layer lifted out of `CellEditor`, and the cell's list geometry all go; the pane mounts a `text` scope holding the inline vocabulary only.
- **`cellLinkTarget`'s ancestor check.** Removed as dead rather than hoisted around: its one caller's handlers sit on the `.mdpm-tbl-cell-static` element itself, so the check could never fail.
- **F-2 — Enter in TextPane (Nathan, 10-08-2026).** Enter saves and closes, as it does in a field; Shift-Enter writes the line break. The log had Enter write a new line in the pane.
- **A resting value's heading colour (Phase 2 review).** A Text value's `[[Target#Setup]]` is coloured when its row renders, through a connections getter that subscribes to nothing, so a heading added to or removed from Target in another tab leaves the colour until the row next renders; a click resolves fresh. Taken over a per-heading-change re-render of every table and card view.
- **A yaml-coerced scalar shows yaml's spelling (final review).** `Notes: 1.0`, `True`, `0x1F` read as `1`, `true`, `31` — the value yaml parsed, re-spelled inline — and keep their bytes until edited; retyping the file's own spelling lands it quoted. Reading the source text would need the yaml CST.
- **The Properties ▸ seat passes a snapshot (Phase 4 review).** `ValuePickPresenter` hands the pane the value as it was when the menu's leaf was pressed, so an outside change made while a pane opened from that seat is untouched does not appear in it; the table, panel, and card seats pass the live value and do. Left as the seat's existing behavior for every picker it presents; the pane's own close still writes last.
- **I-1 — PommoraUIX.** `PickerMenu` gains no prop under the F-3 deviation, and app-side pickers aren't listed there; its Row Tokens gain `--row-value-reach` (Task 2.5).
- **The writer (Phase 1 review).** `pageFile.ts` emits a flow collection unpadded (`flowCollectionPadding: false`, one `YAML_OUT` shared with `yamlInline`), so a foreign `[milk, eggs]` survives an adjacent write byte for byte, and a changed value is set as a fresh node (`doc.createNode`), so a key once quoted or written as a block does not hold its next value to that style — `"42"` then `hello` lands `hello`, not `"hello"`. Both apply to every key; both are what "written plain wherever yaml allows" needs. Found by the Phase 1 reviews.
- **Link reads an unquoted `[[Page]]` (Phase 1 review).** `writtenSpelling`'s string arm kept a nested-list raw for a Link whose typed value spelled the same, so a Link picked over an Obsidian-written unquoted `[[Page]]` never landed. The sibling fix: Link decodes that raw as the link it spells, through the one unwrapping File already does (`fileEntry`, now `linkEntry`, shared by both), so the raw reads and a re-save of the same link leaves the file alone.
- **Task format.** `#### Task N.M` → `**BEFORE:**` one line → `**TASK**` checklist → `ts|diff` hunks → `**VERIFY**`, per Nathan's *§For Planning* and *Codeblock Deltas* Task 4.1; the skill's NOW/CHANGE/AFTER blocks are not used.
