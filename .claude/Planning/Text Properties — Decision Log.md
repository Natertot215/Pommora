### Text Properties — Decisions & Intention

**DATE:** 10-07-2026
**STATUS:** Ratified 10-07-2026
**GROUNDED:** `32d3fa62c`; HEAD `8ee6f8cf5` touches no cited file.

### Context

Pommora's property catalog holds eleven types and no free-typed one; *§Pending* in [[PropertiesPM]] names the gap, and a Select stands in for it today. This log records the brainstorm toward a **Text** property type: a value typed freely, stored as a bare YAML string under its property's key, and edited on every value surface the other types already share. The working bet under test is that Text is mostly assembly of what exists; where the bet fails, the log says so with the evidence.

### Overview

#### Concepts

- **Text Property:** A registry definition of type `text` whose value is one free-typed string, decoded by the type its definition declares and never by the value's shape.
- **TextPane:** The dropdown pane that edits a Text value with inline Markdown — MarkdownPM in the `'text'` scope, which holds the inline vocabulary alone, opened from the value's glyph or a menu.
- **Plain Field:** The single-line `EditableInput` path that Number and Link already share through `PropertyValueInput` and `parseEditorValue`.
- **Whole-Value Connection:** A frontmatter string that is entirely one `[[Page]]`. The rename cascade's frontmatter patch and the mention index read it under any key; the delete strip and the Trash's park and refill read it under Link-typed keys only. A link inside a sentence is neither.
- **Foreign Key:** A frontmatter key the registry doesn't name; registering a property under it brings its values to life.

---

### Decisions

#### A - Type & Names

- **A-1:** [INFERRED] `text-align-start` joins the curated icon registry (`UIX/Symbols/index.tsx:76-81, 99-184`) as Text's default glyph in `TYPE_META`.
- **A-2:** [CONFIRMED] Names: the type id is `text`, the label **Text**, the pane `TextPane` (beside `TextPicker`, the single-line popover Link opens, which keeps its name), and the `MarkdownScope` value TextPane runs under is `'text'`, beside `'page'` and `'cell'`. No rename anywhere.
- **A-3:** [CONFIRMED] The user creates a Text property named Description, and the `description:` values files already hold appear on their pages at once — the catalog's existing adoption rule, with no Text-specific code. Pommora never creates a property from a key it finds, for Text as for every other type: Multi-Select recognition adds options to a Multi-Select that already exists (`optionOps.ts:93-150`), and `createProperty` is called only by the user's Create and a Trash restore. Automatic creation is the Recognize Foreign Frontmatter prospect.
- **A-4:** [CONFIRMED] "Recognize Foreign Frontmatter" means a Nexus-level toggle making Pommora's reading of externally added frontmatter optional. It isn't part of Text; it's a separate feature that would also govern Multi-Select's unconditional option recognition, and it goes to Prospects.

#### B - Storage & Decode

- **B-1:** [CONFIRMED] No validation feedback: no string can break frontmatter (the `yaml` library quotes or block-scalars every value and round-trips it), so no error outline, ring, or refusal exists for Text.
- **B-2:** [CONFIRMED] A Text value is written as plain unquoted yaml wherever yaml allows it — `model: opus`, never `model: "opus"` — so Pommora writes the same syntax other applications do. A hand-typed scalar under a Text key (`Notes: 42`) reads and shows as its text ("42") and is left on disk exactly as written: the repair pass and every write keep a raw whose own text equals the value, through a text arm in `writtenSpelling` on the checkbox precedent (`propertyValue.ts:142`; `contextResolve.ts:143-154` routes through it). Quotes appear only where yaml needs them to keep a typed value a string — a user typing `42` into an empty Text field lands as `Notes: "42"`, since bare `42` would read back as a number. [CONFIRMED] A yaml array or map under a Text key (`Tags: [a, b]`, not a Markdown list) renders as plain text — the parsed value re-spelled in YAML's inline form, `[milk, eggs, bread]`, whichever spelling the file used — and stays on disk exactly as written on every path, the frozen Trash restore included, since a foreign shape isn't a gone option or page; the first edit the user makes writes the typed string in its place. A number yaml has already parsed shows in its parsed form — `3.10` as "3.1", `007` as "7" — while the file keeps the original spelling.

#### C - Views Pipeline

- **C-1:** [CONFIRMED] Text sorts alphabetically through `sortText`, as Link, Multi-Select, and File do. (Settled by evidence: not sorting would add an exclusion predicate at `SortFrame.tsx:85` and make Text the first unsortable user-origin type.)
- **C-2:** [CONFIRMED] Text takes Link's seven filter operators — Is, Isn't, Starts With, Contains, Doesn't Contain, Is Empty, Isn't Empty — through the existing `TEXT_OPS + EMPTIES`. No narrower constant.
- **C-3:** [INFERRED] Text carries no `groups` flag on its `TypeSpec`, so Group By and Sub-Group exclude it as they exclude Link; `bucketKey` gains its compile-forced arm returning no bucket.
- **C-4:** [INFERRED] Text seeds nothing: `FROM_GROUP_KEY.text` is `null` and `SEEDS_FROM_SORT.text` is `false`, as Link's are, so no filter rule, band, or New Page Above/Below writes a Text value onto a new page, and a sort-run drag never rewrites one.

#### D - In-Place Surfaces

- **D-1:** [CONFIRMED] Text is single-line on every in-place surface and multi-line only in TextPane. Every in-place surface follows the `PathField` pattern — typed into directly on a single click, with a right-side glyph as the one door into TextPane, which opens as a PickerMenu dropdown anchored to the value. Only a Compact card wears the field's chrome (decision D-6); a Standard card, a panel row, and a table cell draw plain text carrying the same right-side glyph. A single click on a filled value seats the caret, as Number does.
- **D-2:** [CONFIRMED] `valueClickIntent` for a Text value returns `edit`. The glyph is the kit's `AccessoryButton` (`UIX/Menus/MenuRows.tsx:269-311`) — icon, `reveal`, `pressed`, and a propagation-stopping press, already used by PropertyPanel rows, PropertyFrame, OptionEditor, and ImagePicker — with `icon="square-pen"`, seated in `InputField`'s `trailing` slot on a Compact card, beside the value on a Standard card and in a table cell, and in the row's trailing on the panel. Nothing new in UIX, and no new `ValueIntent` kind.
- **D-3:** [INFERRED] A multi-line value at rest in a single-line field shows its first line with an ellipsis. The renderer draws the whole value and CSS clips it to one line, so a container that allows wrapping later shows every line with no renderer change.
- **D-4:** [CONFIRMED] A single click on a multi-line value opens the single-line field over its first line alone; the lines behind it are untouched and rejoined on commit. This is a Text arm in `editorText`/`parseEditorValue` (`parseEditorValue.ts:7-31`). [INFERRED] An emptied first line drops that line, so the value never gains a leading blank.
- **D-5:** [CONFIRMED] The glyph reveals on hover, through `data-reveal-host` and `revealTarget`, which the `(hover: none)` pin shows at rest on touch. [INFERRED] Table cells and card values each gain their own reveal host: the row is the table's only host today (`TableView.tsx:653`), and a card value has none on a Cards view and the whole View tile inside one (`CardValue.tsx:138-144`; `ViewTile.tsx:589`), so without a host of its own the glyph never shows on a card, or shows on every card at once.
- **D-6:** [CONFIRMED] A Compact card draws the Text value as a bordered, full-width `InputField` row on the hook the Number bar already uses (`cards-view.css:116-123`) — as chrome only, with no `edit`, hosting the same inline field every other surface opens, so no second commit path through `RenamableLabel`. A Standard card and a panel row draw plain text and open the bare inline field on click, as Number does.

#### E - Entry Points

- **E-1:** [CONFIRMED] In the native **Properties ▸** menu the Text row is a clickable leaf, as Number, Link, and Date are, and picking it opens TextPane anchored where the menu originated — in place of the `TextPicker` popover the leaf chain presents for Link today (`ValuePickPresenter.tsx:9-46`).
- **E-2:** [INFERRED] The Cards add-chooser hands Text to TextPane at the card's anchor, where Link receives the `TextPicker` popover and Number its `NumberValuePicker` (`CardsView.tsx:518-530`; `PropertyValueInput.tsx:27-36`), matching decision E-1: wherever Text opens from a menu, it opens TextPane. No FrameSlide drill-in is added.

#### F - TextPane

- **F-1:** [CONFIRMED] TextPane is the one MarkdownPM surface Text adds, and no separate editor component sits under it. [INFERRED] It mounts an `EditorView` over `inlineSurface(getConn, 'text')` (`surface.ts:24-57`) the way `CellEditor` does, under a `useEditorHost({})` host, with `previewConnections` as its connections, and inside the `.mdpm-shell`/`.mdpm-editor` wrapper classes that carry `--glyph-scale` (`markdown-pm.css:15-17, 357, 437`), adding what a cell-scope editor doesn't carry today: `history()`, a placeholder, an Enter that saves and closes, and a read of the document at close. Edit-in-place later reuses TextPane's wiring when it comes; nothing is abstracted ahead of it.
- **F-2:** [CONFIRMED] Enter saves and closes in an input field and in TextPane alike, where Shift-Enter writes a new line. TextPane carries a top-right × that saves and closes.
- **F-3:** [CONFIRMED] Escape saves and closes TextPane, as the × does, so TextPane has no cancel: it reads as a page body, where everything saves and ⌘Z is the undo, and not as a field, where Escape reverts (`EditableInput.tsx:84-92`). A press outside leaves it open. [INFERRED] The dismissal stack already has this exact mode: `useDismissal` with `outsidePress: false` routes Escape to the pane and ignores outside presses, as `useEscape` and `MenuDropdown`'s `dismissOnOutside` do (`dismissalStack.ts:45, 154-160`; `MenuDropdown.tsx:38-42`). A `PickerMenu` with no `onDismiss` at all would receive neither Escape nor outside presses; `PickerMenu` passes only `dismiss` and `shield` today (`PickerMenu.tsx:118-123`), so it gains `MenuDropdown`'s `dismissOnOutside` or TextPane pairs a dismiss-less `PickerMenu` with `useEscape`.
- **F-4:** [INFERRED] Navigation, a tab switch, a window close, a Nexus switch, and quit each close TextPane and save it, as they close an unlocked glance pin; the save runs on every unmount path, and planning verifies the close paths.
- **F-5:** [CONFIRMED] TextPane's placeholder reads "Begin typing." through CodeMirror's `placeholder()` extension, the mechanism `MarkdownEditor.tsx:178` uses; the copy is TextPane's own, not `EMPTY_PAGE_TEXT`.
- **F-6:** [INFERRED] TextPane's width and height are fixed by CSS on the pane body with internal scroll; it takes no `usePaneResize`. `CalendarPicker` and `TextPicker` fix width alone and let content drive height (`calendar-picker.css.ts:20`, `text-picker.css.ts:17`), so a fixed height with a scrolling body has no picker precedent. `PickerMenu` flips but never clamps to the room (`PickerMenu.tsx:209`), so the fixed height is chosen to fit a small window.
- **F-7:** [INFERRED] TextPane holds `PickerMenu`'s focus trap, which counts a contenteditable among its tab stops (`focusScope.ts:3-4`) and so focuses the editor on open; Tab writes nothing, and Shift-Tab stops short of the trap, which would carry the caret to the ×.
- **F-8:** [CONFIRMED] Text holds no lists: a line that spells a list marker is prose in TextPane and at rest, because a YAML list under a key is a list to every other reader, and a Text string drawn as a list would be a list in Pommora alone. A multi-line value lands on disk as a yaml block scalar (`Notes: |-` over indented lines), which the `yaml` library writes and reads back exactly (verified: `"- item\n- two"` round-trips).
- **F-9:** [CONFIRMED] Pasting a link into TextPane behaves as MarkdownPM does everywhere — `pasteLink` and **Default Link Format** ride in through `inlineSurface` (`surface.ts:24-57`) — and highlight colors (`==🔴words🔴==`) render as the page renders them. Both are inline formatting the shared surface already carries; nothing is added or withheld.
- **F-10:** [INFERRED] A Text value changed on disk or by another window while its TextPane is open lands in the open pane the way the page editor takes `mirrorBody` (`api.ts:44-52`), recency-first, as the Nexus's concurrency rule says.

#### G - Connections & Index

- **G-1:** [CONFIRMED] A connection written inside a Text value is a body link in every respect: a page rename rewrites it, a heading rename rewrites it, deleting its target leaves it as a phantom, and nothing strips, parks, or restores it. This requires the content index to record links inside frontmatter strings, which today it doesn't (`indexSeed.ts:61-67`).
- **G-2:** [INFERRED] The rename cascade's frontmatter patch becomes type-aware: a Link-typed key keeps the whole-value patch, a Text-typed key runs the body rewriter. One writer per key, so a Text value of exactly `[[Old|New]]` is never handled twice (the two writers disagree: `[[New]]` against `[[New|New]]`). The patch's second caller, the Trash restore under a landed title (`spend.ts:264`), skips Text-typed keys the same way, since bodies aren't rewritten there.
- **G-3:** [INFERRED] `[[Nowhere]]` typed into a Text value is accepted as prose, as a page body accepts a phantom; the Link type's refusal of a title no page answers doesn't apply.
- **G-4:** [CONFIRMED] A `[[#Heading]]` written inside a Text value on a page names a heading on that page, and a click travels there. Link gets the same reading: today `ConnectionCell` resolves the empty title to no page and the click does nothing (`LinkCell.tsx:69, 79`). On a Space, which has no body, the fragment resolves to nothing. While TextPane is open off a table, `[[#` coloring and the outline resolve against the pane's own text (`api.ts:32-35`); the pane's host answers for the holding page instead.
- **G-5:** [INFERRED] A link inside a Text value lands in the content index as a `body` relation, as decision G-1's "body link in every respect" implies; it weighs in the Matrix as a body link, and no new relation kind is introduced. `frontmatterMentions` skips Text-typed keys, since it reads every string value under any key today (`scan.ts:112-125`), so a Text value of exactly `[[Page]]` is indexed once, as `body`, and never also as `frontmatter`.
- **G-6:** [CONFIRMED] `extractPageIndex` (`Core/Index/indexSeed.ts`) runs `valueLinks` (`Core/Connections/scan.ts`) over every string frontmatter value, under the page's own title and outline, and records the hits as `body` relations — on the seed and on `indexWrittenPage`'s per-write call alike. A whole-value `[[Page]]` stays a `frontmatter` mention, as `banner:` and a File value do.
- **G-7:** [CONFIRMED] A registry change leaves the index as it is: the links inside a value are indexed when the page is read, so registering `Description` over existing `description:` values finds them already there.
- **G-8:** [INFERRED] The rename cascade's rewrite of a Text value passes the holding page's body outline for `§` runs, not one built from the value (`cascade.ts:188-190`), and runs under the page's own title so a bare `[[#Heading]]` names the holding page. The outside-edit heading rename's Space gate, `spacesLinkHeading` (`cascade.ts:59-72`; `fileEvents.ts:298-304`), reads whole values only today and learns Text-typed keys, or a Space-only sentence `[[Page#Heading]]` is never rewritten.

#### H - Resting Render

- **H-1:** [CONFIRMED] A Text value renders its connections live at rest — colored, clickable, resolving as a body link does — on every surface, since Link and the table cell already render connections at rest. [INFERRED] Inline marks (bold, italic, highlight, code) render the same way. The resting renderer is `renderCellContent` (`cellStatic.tsx:44`), the one existing non-editor renderer of cell-scope Markdown, which already takes no `EditorHost` and an optional `CellPage`. What a field has to lift is the interaction layer around it — the glance and `linkTitles` reads through `host` (`cellStatic.tsx:275, 293-299, 329-354, 362-374, 451-454`) — which is what lets a resting link click without also firing the surface's `edit` intent; `useEditorHost` already builds an off-page host.
- **H-2:** [CONFIRMED] `LinkCell`'s hand-rolled connection render (`LinkCell.tsx:60-90`: no phantom or ambiguous tone, no glance, no heading shown) stays as it is in V1; decision G-4's own-page heading fix lands in it directly. Retiring it onto the shared resting renderer of decision H-1 is a Prospect, and ConnectionsPM's "written twice" known issue stays open until then.

#### I - Documentation

- **I-1:** [INFERRED] Documentation reconciliation: [[PropertiesPM]]'s type table gains a Text row, *§Property Types* gains a Text section, and *§Pending* loses its Text entry; [[ViewTypesPM]]'s filter table relabels its "Text (Title)" row to cover Title, Link, and Text, since all three read `TEXT_OPS` (`ViewTypesPM.md:30`); [[ConnectionsPM]] states that a connection inside a Text value is a body connection, and its "written twice" known issue names the Link cell alone, since Text's resting render shares the editor's mapping, and stays open until decision H-2's prospect lands; [[PommoraUIX]] lists no app-side picker, so TextPane stays out of it, and its Row Tokens gain `--row-value-reach`; [[MarkdownPM]] names TextPane among the surfaces the editor runs inside.

---

#### Constraints

Grounded facts the decisions sit on; each traces to *00 — Orchestrator Notes* and the lettered report behind it.

- **The Census:** Adding `text` to `typeIds`, `PROPERTY_TYPES`, and the `propertyValue` union forces 23 compile errors across 18 files (A, probe at `32d3fa62c`); a further eleven sites compile and misbehave until they gain an arm, led by `parseEditorValue` returning `undefined` (every commit refused) and `editorText` returning `''` (a filled value opens blank, and an untouched blur clears the key).
- **Write Side:** The `yaml` library quotes or block-scalars every string and round-trips it exactly, so no Text value can break frontmatter; the one commit-time refusal is file-level broken frontmatter, shared by every type (A). No "invalid text" category exists.
- **Read Side:** A foreign raw under a Text key may be a number, boolean, list, or an unquoted `[[Page]]` (a nested array); `reconcileGovernedRoot` runs on open under Repair On Open, on every adjacent property write, and frozen on Trash restore, so the decode rule decides what lands on disk (A, B).
- **Plain Fields:** `EditableInput` is an `<input>` that trims on blur; no multi-line field exists in UIX, `Core/Views`, or `Core/Properties`. A multi-line value opened in any plain field is flattened and trimmed on an untouched open-and-blur (A, C, D, F).
- **Editors:** `'cell'` scope renders lists, marks, highlights, and connections live and everything block-level literal; no MarkdownPM editor submits or cancels, and no cell-scope editor carries `history()` or a placeholder (E).
- **Cascade:** The rename cascade has the registry in hand and its body rewriters are pure over any string; the index records no row for a link inside a frontmatter sentence, so a ready index never selects that file, and heading renames have no corpus fallback (B, G). The whole-value patch is key-filtered, so a Text value of exactly `[[Page]]` is already renamed today; the delete strip is Link-type-filtered, so it's never stripped (B, G).
- **Seats:** The native **Properties ▸** leaf already opens a `TextPicker` through `requestPick` → `ValuePickPresenter`; Number and Link don't drill into the FrameSlide pane, only option kinds do; the table's hover-reveal host is the row and a card value's is the View tile or none (C, D).
- **Pane Shell:** `usePaneResize` sizes only axes with drag edges; every fixed-size pane is CSS on the body; the resize tint's ease exists only with edges; `errorRing()` has no app consumer; `PickerMenu` cancels every `contextmenu` inside its layer, so the native Format menu opens inside one only where the content stops the event short of the layer (E, F).

#### Core

What Text must do to function at all; each item names the decisions it rests on.

- The catalog entry and its 23 compile-forced arms, each joining an existing arm — Link's for `WIDTHS`, `DEFAULT_ALIGN`, filter, sort, and `baseCellMenu` with no Edit row; `NO_SETTINGS` for `SETTINGS`; `[]` and `{}` beside Context and File for `styleMenuItems` and `defaultStyleFor` (C-1, C-2, E-2, C-3, C-4, A-1, A-2).
- The decode and write rule: scalars read as text, arrays and maps as plain text, raws kept as written through a `writtenSpelling` text arm (B-2).
- The single-line field on every surface — first-line editing over a multi-line value through the existing `PropertyValueInput` path, hover `AccessoryButton` glyph, per-cell and per-value reveal hosts, Compact's bordered full-width row as chrome only (`InputField` without `edit`, so no second commit path through `RenamableLabel`) (D-1, D-2, D-3, D-4, D-5, D-6).
- TextPane: a `PickerMenu` on the window surface, mounting `inlineSurface('text')` with history, placeholder, an Enter that saves and closes, and a save-on-close through × and Escape; opened from the glyph and the **Properties ▸** leaf; pasted links and highlight colors as the shared surface carries them (E-1, F-1, F-2, F-3, F-4, F-5, F-6, F-7, F-8, F-9).
- Inside-value connections as body links: the index's scan of string values into `body` relations, the type-aware cascade with the page's outline, phantom on delete (G-1, G-2, G-3, G-5, G-6, G-7, G-8).
- The shared resting renderer for connections and marks, and the own-page `[[#Heading]]` fix for Text and Link (H-1, G-4).
- Documentation reconciliation (I-1).

#### Rejected

- **A nested editor on every surface** — a Text cell or row becoming a live cell-scope editor in place, with no plain field. Rejected for V1 in favor of the single-line field plus TextPane; the in-place editor is the Edit In Place prospect.
- **Text doesn't sort** — would add an exclusion predicate at `SortFrame.tsx:85` and make Text the first unsortable user-origin type.
- **Four filter operators** — a new constant for a subset of what Link already gets.
- **A muted Properties ▸ row** — needs a `disabled` field with no "type unsupported" precedent, while the leaf opening TextPane is free.
- **An error outline or ring** — nothing exists for it to guard; `errorRing()` has no app consumer and the resize tint's ease exists only with drag edges.
- **A separate reusable editor component under TextPane** — abstraction ahead of a second seat; TextPane mounts the surface itself.
- **Renaming `MarkdownScope`'s `'cell'` to `'inline'`** and **renaming `BrowseButton` to `FieldButton`** — the glyph is `AccessoryButton`, and the scope's behavior is unchanged.
- **A new `ValueIntent` kind for the glyph** — the glyph's press is the button's own callback.
- **Automatic creation of a Text property from a found key** — no sibling does it; Multi-Select recognition adds options to an existing property. The Recognize Foreign Frontmatter prospect.
- **Link as a format of Text** — collapsing the two types, since a Text value of exactly `[[Page]]` already renames like a Link. Rejected: Link carries URL formats, color, underline, page-title fetching, and the delete-time strip and restore that prose doesn't want.
- **A FrameSlide drill-in for Text in the Cards chooser** — Number and Link don't drill; Text takes their popover.

#### Prospects

- **Wrapped Table Cells:** a Table layout toggle under which a cell shows its line breaks and wraps its content — links, chips, titles, and text — instead of one `nowrap` line. A Table feature, briefed in *Wrapped Table Cells — Brainstorm Brief*. Don't-foreclose: Text's resting renderer draws `\n` as a line break whenever its container allows wrapping, so the toggle becomes a view flag and a CSS rule.
- **Edit In Place:** a table cell becoming the restricted editor on entry, as a cell inside a page body does. Reuses TextPane's editor wiring in a second seat and needs the table's edit overlay to learn it. Don't-foreclose: decision F-1 keeps TextPane's wiring plain enough to lift.
- **LinkCell On The Shared Renderer:** `LinkCell`'s resting connection render retires onto decision H-1's renderer, giving Link values the glance, phantom and ambiguous tones, and heading display they lack, and closing ConnectionsPM's "written twice" issue. Deferred because it changes Link's resting look and the renderer must carry Link's title/alias switch; Text works without it. Don't-foreclose: the renderer takes a plain string and a connections accessor, nothing Text-shaped.
- **Recognize Foreign Frontmatter:** a Nexus-level toggle making Pommora's reading of externally added frontmatter optional, and a path from a found key to a definition. Would also govern Multi-Select's unconditional option recognition. Its own brainstorm.

#### For Planning

Nathan's mandates for the planning session, recorded here so the handoff carries them.

- **The code leads.** This log is the ideas. The planning session finds the code itself and designs the approach around what it finds; anything here that says "done this way" yields when the codebase proves otherwise or a better option exists.
- **Nathan's principles for the plan:** assemble before adding; no odd one out — Text reads as if it had always been in the design, and a sibling that's wrong changes everywhere; look outward and share rather than fork; look before committing; right-sized, with no protection whose upkeep outweighs its purpose; don't overcomplicate — when a mechanism exists, use it and anchor to it rather than designing a cousin.
- **Task format:** each task carries a short **Before** summary, a one-line **Change** description, and a code block in `ts|diff` form carrying explicit, as-near-literal-as-possible code for every changed and impacted file — the diff *is* the instruction. `+` marks an added line, `-` a removed one, `~` a changed single line (MarkdownPM renders it). *Codeblock Deltas — Implementation Plan*, Task 4.1, is the shape.
- **Conflicts surface in planning:** lists in TextPane against yaml, the Format menu inside a PickerMenu, the autocomplete clamp, and anything the code contradicts in this log are raised there, not papered over.

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

