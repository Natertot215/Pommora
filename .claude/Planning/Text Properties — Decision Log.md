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

