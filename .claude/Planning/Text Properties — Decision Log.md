### Text Properties — Decisions & Intention

**DATE:** 10-07-2026
**STATUS:** Drafting

### Context

Pommora's property catalog holds eleven types and no free-typed one; *§Pending* in [[PropertiesPM]] names the gap, and a Select stands in for it today. This log records the brainstorm toward a **Text** property type: a value typed freely, stored as a bare YAML string under its property's key, and edited on every value surface the other types already share. The working bet under test is that Text is mostly assembly of what exists; where the bet fails, the log says so with the evidence.

### Overview

#### Concepts

- **Text Property:** A registry definition of type `text` whose value is one free-typed string, decoded by the type its definition declares and never by the value's shape.
- **TextPane:** The proposed panel surface for editing a Text value with inline Markdown — a restricted MarkdownPM scope, as a table cell's is.
- **Plain Field:** The single-line `EditableInput` path that Number and Link already share through `PropertyValueInput` and `parseEditorValue`.
- **Whole-Value Connection:** A frontmatter string that is entirely one `[[Page]]`. The rename cascade's frontmatter patch and the mention index read it under any registered key; the delete strip and the Trash's park and refill read it under Link-typed keys only. A link inside a sentence is neither.
- **Foreign Key:** A frontmatter key the registry doesn't name; registering a property under it brings its values to life.

---

### Decisions

1. [CONFIRMED] Text sorts alphabetically through `sortText`, as Link, Multi-Select, and File do. (Settled by evidence: not sorting would add an exclusion predicate at `SortFrame.tsx:85` and make Text the first unsortable user-origin type.)
2. [CONFIRMED] Text takes Link's seven filter operators — Is, Isn't, Starts With, Contains, Doesn't Contain, Is Empty, Isn't Empty — through the existing `TEXT_OPS + EMPTIES`. No narrower constant.
3. [CONFIRMED] No validation feedback: no string can break frontmatter (the `yaml` library quotes or block-scalars every value and round-trips it), so no error outline, ring, or refusal exists for Text.
4. [CONFIRMED] A Text value is written as plain unquoted yaml wherever yaml allows it — `model: opus`, never `model: "opus"` — so Pommora writes the same syntax other applications do. A hand-typed scalar under a Text key (`Notes: 42`) reads and shows as its text ("42") and is left on disk exactly as written: the repair pass and every write keep a raw whose own text equals the value, through a text arm in `writtenSpelling` on the checkbox precedent (`propertyValue.ts:142`). Quotes appear only where yaml needs them to keep a typed value a string — a user typing `42` into an empty Text field lands as `Notes: "42"`, since bare `42` would read back as a number. A list under a Text key reads as no value.
5. [CONFIRMED] A connection written inside a Text value is a body link in every respect: a page rename rewrites it, a heading rename rewrites it, deleting its target leaves it as a phantom, and nothing strips, parks, or restores it. This requires the content index to record links inside frontmatter strings, which today it doesn't (`indexSeed.ts:61-67`).
6. [CONFIRMED] Text is single-line on every in-place surface and multi-line only in TextPane. Every in-place surface is an input field on the `PathField` pattern — typed into directly on a single click, with a right-side glyph as the one door into TextPane, which opens as a PickerMenu dropdown anchored to the field. The panel row and the card value wear the field's chrome; a table cell stays a plain cell carrying the same right-side glyph. A single click on a filled field seats the caret, as Number does.
7. [CONFIRMED] In the native **Properties ▸** menu the Text row is a clickable leaf, as Number, Link, and Date are, and picking it opens TextPane anchored where the menu originated — in place of the `TextPicker` popover the leaf chain presents for Link today (`ValuePickPresenter.tsx:9-46`).
8. [ASSUMED] The user creates a Text property named Description, and the `description:` values files already hold appear on their pages at once. This is the catalog's existing adoption rule and needs no Text-specific code. The other reading — Pommora creating the property itself on finding the key — is a registry mutation with no precedent and would have to pick a type for every foreign key.
9. [CONFIRMED] "Recognize Foreign Frontmatter" means a Nexus-level toggle making Pommora's reading of externally added frontmatter optional. It isn't part of Text; it's a separate feature that would also govern Multi-Select's unconditional option recognition, and it goes to Prospects.
10. [INFERRED] The rename cascade's frontmatter patch becomes type-aware: a Link-typed key keeps the whole-value patch, a Text-typed key runs the body rewriter. One writer per key, so a Text value of exactly `[[Old|New]]` is never handled twice (the two writers disagree: `[[New]]` against `[[New|New]]`).
11. [INFERRED] `[[Nowhere]]` typed into a Text value is accepted as prose, as a page body accepts a phantom; the Link type's refusal of a title no page answers doesn't apply.
12. [INFERRED] The restricted editor is one component that takes a seat. TextPane is its first seat; a table cell editing in place is a possible second, so the component is built with no TextPane-specific assumptions. Edit-in-place itself is a Prospect.
13. [CONFIRMED] `valueClickIntent` for a Text value returns `edit`. The glyph is `InputField`'s existing `trailing` slot holding `BrowseButton` (`UIX/Fields/PathField.tsx:7-25`), whose press is its own callback and stops propagation — the mechanism FileEditor, ImagePicker, and the directory settings rows already use. `BrowseButton` gains an `icon` prop so it can show `square-pen` in place of its hard-coded `folder-open`; no new `ValueIntent` kind exists.
14. [INFERRED] The Cards add-chooser hands Text to the same `TextPicker` popover Number and Link receive today; no FrameSlide drill-in is added for Text.
15. [CONFIRMED] Enter saves in an input field and writes a new line in TextPane. TextPane carries a top-right × that saves and closes.
16. [CONFIRMED] A Text value renders its connections live at rest — colored, clickable, resolving as a body link does — on every surface, since Link and the table cell already render connections at rest. Inline marks render the same way. This is a resting renderer for cell-scope Markdown outside an editor; `StaticCell` (`cellStatic.tsx:264-286`) is the one existing implementation and is coupled to `EditorHost` and the table's `CellPage`.
17. [INFERRED] A multi-line value at rest in a single-line field shows its first line with an ellipsis.
18. [CONFIRMED] A single click on a multi-line value opens the single-line field over its first line alone; the lines behind it are untouched and rejoined on commit. An emptied first line drops that line, so the value never gains a leading blank. This is a Text arm in `editorText`/`parseEditorValue` (`parseEditorValue.ts:7-31`).
19. [CONFIRMED] The glyph reveals on hover, through `data-reveal-host` and `revealTarget`, which the `(hover: none)` pin shows at rest on touch. Table cells gain a per-cell reveal host, since the row is the only host today (`TableView.tsx:653`).
20. [CONFIRMED] Escape saves and closes TextPane, as the × does. A press outside leaves it open: TextPane is a `PickerMenu` with no `onDismiss`, the `CaretPane` pattern (`PickerMenu.tsx:118-123`), so no outside-press dismissal and no shield.
21. [INFERRED] Navigation and a tab switch close TextPane and save it, as they close an unlocked glance pin.
22. [CONFIRMED] A Compact card draws the Text value as a bordered, full-width `InputField` row on the hook the Number bar already uses (`cards-view.css:116-123`). A Standard card and a panel row draw plain text and open the bare inline field on click, as Number does.
23. [CONFIRMED] A `[[#Heading]]` written inside a Text value on a page names a heading on that page, and a click travels there. Link gets the same reading: today `ConnectionCell` resolves the empty title to no page and the click does nothing (`LinkCell.tsx:66-67`). On a Space, which has no body, the fragment resolves to nothing.

---

#### Constraints

Grounded facts the decisions sit on; each traces to *00 — Orchestrator Notes* and the lettered report behind it.

- **The Census:** Adding `text` to `typeIds`, `PROPERTY_TYPES`, and the `propertyValue` union forces 23 compile errors across 18 files (A, probe at `32d3fa62c`); a further eleven sites compile and misbehave until they gain an arm, led by `parseEditorValue` returning `undefined` (every commit refused) and `editorText` returning `''` (a filled value opens blank, and an untouched blur clears the key).
- **Write Side:** The `yaml` library quotes or block-scalars every string and round-trips it exactly, so no Text value can break frontmatter; the one commit-time refusal is file-level broken frontmatter, shared by every type (A). No "invalid text" category exists.
- **Read Side:** A foreign raw under a Text key may be a number, boolean, list, or an unquoted `[[Page]]` (a nested array); `reconcileGovernedRoot` runs on open under Repair On Open, on every adjacent property write, and frozen on Trash restore, so the decode rule decides what lands on disk (A, B).
- **Plain Fields:** `EditableInput` is an `<input>` that trims on blur; no multi-line field exists in UIX, `Core/Views`, or `Core/Properties`. A multi-line value opened in any plain field is flattened and trimmed on an untouched open-and-blur (A, C, D, F).
- **Editors:** `'cell'` scope renders lists, marks, highlights, and connections live and everything block-level literal, so no third `MarkdownScope` is needed; no MarkdownPM editor submits or cancels, and no cell-scope editor carries `history()` or a placeholder (E).
- **Cascade:** The rename cascade has the registry in hand and its body rewriters are pure over any string; the index records no row for a link inside a frontmatter sentence, so a ready index never selects that file, and heading renames have no corpus fallback (B, G). The whole-value patch is key-filtered, so a Text value of exactly `[[Page]]` is already renamed today; the delete strip is Link-type-filtered, so it's never stripped (B, G).
- **Seats:** The native **Properties ▸** leaf already opens a `TextPicker` through `requestPick` → `ValuePickPresenter`; Number and Link don't drill into the FrameSlide pane, only option kinds do; the table's hover-reveal host is the row and a card value's is the View tile or none (C, D).
- **Pane Shell:** `usePaneResize` sizes only axes with drag edges; every fixed-size pane is CSS on the body; the resize tint's ease exists only with edges; `errorRing()` has no app consumer; `PickerMenu` cancels every `contextmenu` inside its layer, so the native Format menu likely never opens inside one (E, F).

#### Rejected

#### Open Items

1. Whether Pommora creates a Text property on its own when it finds a frontmatter key no definition names. Nathan holds that Multi-Select recognition already does this; it doesn't — `registerHeldOptions` adds options to an existing Multi-Select (`optionOps.ts:93-150`), and `createProperty` is called only by the user's handler and the Trash restore (`Core/Properties/handlers.ts:142`, `restoreProperty.ts`). Decision 8 waits on this.
2. Whether "PathField within a TableView gets the same treatment" means File cells gain the same hover glyph, opening the file dialog — a change to File's cell, outside Text.

#### Prospects

---

#### Sources

- `.claude/Planning/Text Properties — Investigation Reports/00 — Orchestrator Notes.md` — the synthesis of the eight reports; the tensions verdicts, the touch census, the decode, cascade, and pane questions, and the names table.
- `.claude/Planning/Text Properties — Investigation Reports/A–H` — the eight slice reports, cross-checked against `32d3fa62c`.
- [[PropertiesPM]] — the type catalog, identity and values, the Property Frame, the Value Picker, the Properties Menu, repair, and *§Pending*'s Text entry.
- [[ConnectionsPM]] — the two grammars, the rename cascade, deletion and restore, rendering, and the "written twice" known issue.
- [[MarkdownPM]] — the constructs, the `'cell'` behavior in tables, the block menu, and the context menu.
- [[ViewTypesPM]] — the pipeline, the filter operator table, sort, creation, Table cells, and Cards.
- [[PommoraUIX]] — Fields, Glass, Pickers, Menus, Interactions, Symbols.
- `.claude/Guidelines/Editor-Internals.md` — a cell's page-shaped document model; the code-mask readers; the caret-pane focus rule.
- `.claude/Guidelines/Interface-Styling.md` — the `transition` shorthand hazard; `data-reveal-host` and the `(hover: none)` pin.
- `Core/Properties/properties.ts`, `propertyValue.ts`, `value.ts`, `parseEditorValue.ts`, `Pickers/PropertyValueInput.tsx`, `Pickers/valueClick.ts` — the catalog, the decode and encode, the plain edit path, and click routing.
- `Core/Connections/scan.ts`, `rewrite.ts`, `linkValue.ts`; `Core/Nexus/cascade.ts`; `Core/Index/indexSeed.ts`; `Core/Trash/spend.ts` — the link primitives and their callers.
- `Core/Files/pageFile.ts`, `heldKeys.ts` — the yaml write and the case-insensitive key model.
- `Core/Views/filterModel.ts`, `Pipeline/filter.ts`, `Pipeline/sort.ts` — the operator families and the evaluators.
- `Core/MarkdownPM/surface.ts`, `Engine/detect.ts`, `Tables/CellEditor.tsx`, `MarkdownEditor.tsx` — the shared inline surface, the scope, and the two editors.
- `UIX/Fields/EditableInput.tsx`, `fieldRing.ts`; `UIX/Pickers/TextPicker.tsx`, `PickerMenu.tsx`, `usePaneResize.tsx` — the field and pane primitives.

