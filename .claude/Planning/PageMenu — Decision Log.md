## PageMenu — Decision Log

### Frame

- **Purpose:** Decide the shape of the Page's Settings dropdown — the surface that answers "what is this Page and how is it configured" — and settle whether Aliases belongs inside the Properties leaf or beside it.
- **Core Value:** A Page gets the same configuration reach a container already has, without standing up a second surface for anything the app already edits somewhere else.
- **Success Criteria:** Every leaf either edits something no other surface owns, or re-hosts the one that does. No fact gains a second writer.

### Sources

- `.claude/Features/PagesPM.md` §On-Disk Shape — frontmatter carries `PageID`, an optional `icon`, `created_at`/`modified_at`, and `cover` as **modeled root fields**, alongside the wrapped `(Context)` and `<Property>` keys. States the governing line: *"The wrap is what separates a property from a modeled root field, which is why `cover` is not a property and never appears in a properties surface."*
- `.claude/Features/PagePreviewPM.md` §The Inspector — the shipped page-level property surface: contexts group then properties group in rounded quaternary fills, each rendering only once something is assigned; icon-leading label with the value hugging the right edge; pickers anchor to the value field; `+ Add Property` reveals a row; right-click Remove Property / Remove Context; writes on the optimistic-patch path.
- `.claude/Features/PropertiesPM.md` §Where Properties Live — three layers (definition / assignment / value). Names the Page Preview inspector as the entity-level value surface today, and records "The Page Property Panel is Pending."
- `.claude/Features/ConnectionsPM.md` §Resolver + Index and §Prospects — resolution is an in-memory normalized-title → PageIDs map rebuilt on every tree reload; nothing persists edges. Its **Prospects list already owns the word "Aliases"**, meaning the `[[Title|alias]]` pipe tail: it parses and survives rewrites, but nothing renders it and no surface authors one.
- `~/NexusOS` (the live vault) — 5 pages carry Obsidian's bare `aliases:` frontmatter key; one holds a real value (`- Product Marketing`, a short alias on a long "Overview꞉ PMM" title). Evidence the feature has real on-disk data before Pommora writes a line.
- `Pommora/src/renderer/src/Components/Detail/SettingsPane.tsx` — the container analogue: an `InlineEditHeader` identity row, a separator, then the leaf rows (Configuration · Properties · Visibility · Layout · Group · Filter · Sort) drilling through `PaneSlider` at its shared minimum-width floor.
- `Pommora/src/renderer/src/Components/Detail/PageMenu.tsx` — what exists today: the identity header and its icon picker, nothing else.
- `Pommora/src/renderer/src/PagePreview/PreviewInspector.tsx` — the inspector body in code. Takes a bare `{ id, path }` target and **fetches its own page** through a warm path-keyed slot; derives schema from the tree by path prefix; edits through the table views' own primitives (`Cell`, `PropertyPicker`, `PropertyEditor`, `DatetimeValuePicker`) on the optimistic-patch write path. Its only host coupling is the `pgpreview-insp-*` class prefix — it holds no reference to the preview window, its store, or its chrome.
- `Pommora/src/renderer/src/PagePreview/previewWindow.css` — the inspector's layout is **proportional, not fixed**: the label takes a percentage basis, the value hugs right under a percentage cap, and groups are rounded quaternary fills. Two rules are host-specific: the rows' top padding offsets the preview toolbar, and the root fills its pane's height.
- `Pommora/src/renderer/src/Detail/InspectorPanel/InspectorPanel.tsx` — the main pane's right-hand inspector is an **empty scaffold**, and its own comment names this exact payload: *"selection-aware content (frontmatter → properties → page info) mounts in `.inspector-body`."*

### Approaches Weighed

- **A — Re-host the inspector body.** Extract the property list into one component; the preview inspector, the PageMenu leaf, and the main-pane scaffold all mount it. One editor, one write path, three hosts. **Deferred, not rejected on merit** (C-3): the sharing that matters — the write path and every value editor — is already shared through `Detail/Views/`, so extraction would collapse markup alone, and no second surface yet exists to prove what the shared shape should be. Reopens when the main-pane inspector is built.
- **B — Menu-native property rows.** Author rows in the menu's own vocabulary, drilling to a picker per property. Fits the dropdown's language, but stands up a second value editor against the same frontmatter. **Dropped** once the field look was chosen: a property row is a field, not a menu command, and the menu's trailing `detail` slot is footnote text that a chip stack or long select value would crowd.
- **C — The leaf is a launcher.** The menu's Properties row doesn't edit at all; it reveals the main-pane inspector scoped to the page — no new editing surface anywhere, at the cost of a drill that leaves the menu. **Dropped** because quick edits without opening a panel is the point of the leaf.

### Decisions

#### A — Aliases, Vocabulary

- **A-1:** [open] "Aliases" is overloaded. Pommora's docs already use it for the `[[Title|alias]]` display tail, authored in the **linking** page's body. A PageMenu leaf can only mean alternate titles for **this** page. Both are real features; they sit at opposite ends of the same link and must not share a name in the docs.

#### B — Aliases, Placement

- **B-1:** [assumed] Aliases is a **modeled root field**, not a property — the same class as `icon` and `cover`: bare (Obsidian-compatible), not wrapped, not schema-governed, not assignable per Collection. It therefore takes its own leaf and stays out of the Properties surface, under the rule PagesPM already states for `cover`.

#### C — Properties Leaf

- **C-2:** [confirmed] The preview's field look reflows into a narrow drill without pixel tuning. The row model is proportional with no fixed widths, and exactly two rules are host-specific — the preview-toolbar top padding and the fill-the-pane height — both of which belong to a host rather than to the row body.
- **C-3:** [confirmed] **No extraction now — the leaf is PageMenu-exclusive.** The shared body is deferred until a second surface actually exists to share it. Don't-foreclose: the row chrome stays a self-contained component under `Components/Detail/`, taking a page ref and nothing host-shaped, so a future inspector mounts it rather than re-deriving it.
- **C-3a:** [confirmed] The concern that motivated extraction is already answered by the codebase: **the editor is not the inspector's to own.** `Cell`, `PropertyPicker`, `PropertyEditor`, `DatetimeValuePicker`, `sharedValueClickAction`, and `resolveFieldValue` all live in `Detail/Views/` and are composed by every value surface — table, cards, preview inspector. A new leaf built on them edits and writes identically by construction, so the only thing written twice is row markup, and no fact gains a second writer.
- **C-4:** [confirmed] Properties **includes Contexts, ordered first** — contexts group, then properties group, matching the order the inspector already renders.

#### D — Leaf Shape

- **D-1:** [confirmed] The **pane frame** comes from `design-system/components/menu`, in order: a `‹ Settings` TopRow, the flush separator, the rows, then `+ Add Property`. The frame is the menu's; the rows inside it are not (D-4).
- **D-2:** [confirmed] The TopRow carries its **`current` breadcrumb** like every other leaf — `‹ Settings    Properties`. It is the only thing naming the pane.
- **D-3:** [confirmed] **No heading.** The groups separate themselves visually, and a heading over the Context rows would have named them wrongly.
- **D-4:** [confirmed] Rows wear the **field look**, not menu rows — the preview's arrangement: Contexts in one rounded quaternary block, properties in the next, icon-leading label, value hugging the right edge with the picker anchored to it. The `menu` primitives still own the pane frame — TopRow, separator, scroll frame, the `+ Add Property` affordance.
- **D-5:** [confirmed] The row chrome is therefore a **knowing near-copy** of the preview's `pgpreview-insp-*` rules, held apart by C-3 until a second surface exists. This duplicates *markup and CSS only* — never the write path, which is shared by construction (C-3a). Recorded so it reads as a decision rather than an oversight, and so the eventual extraction needs no re-litigation.
- **D-6:** [confirmed] **Contexts open shown, and can be set aside.** Every Context renders a row whether or not the page holds a value, so the slots read as ready to fill; `—` is the empty render. Remove takes one away for the session and `+ Add Property` offers it back, so the two row types are mirror images rather than different rules: a property is hidden until a value or an add reveals it, a Context is shown until a Remove sets it aside. Both sets are session-only and write nothing — a shown row holds no key until a value lands, and a value deletes its key when emptied rather than storing a blank.
- **D-6a:** [confirmed] A row's menu carries **Clear** and **Remove** when it holds a value, and **Remove** alone when it doesn't — Clear stands down rather than showing inert. Clear empties the value and leaves the row to be refilled in place; Remove empties it and takes the row away. Neither touches the schema: the property stays assigned to its Collection either way.
- **D-7:** [confirmed] **No pre-emptive sizing.** The leaf takes the container panes' existing width floor, and a long or multi-chip value overflows on the shared truncate-then-hover-scroll every overflowing menu label already uses. The field model is proportional, so it reflows on its own; widening or special-casing before anything reads badly would add a per-surface dimension to tune. Revisit from a screenshot, not from arithmetic.
- **D-8:** [assumed] Configuration is reached by a **drill to the existing per-property editor**, not by inline definition fields — a definition edit is nexus-wide (`PropertiesPM`: a rename, type change, or option edit "change the global definition for every assigning Collection"), and a page row gives no signal that the change leaves the page.

#### E — Sweep (interactive + structural)

- **E-1:** [confirmed] **Persistence, validation, and failure are all inherited.** Values write through the existing `setProperty` / `setContext` mutate ops — no new frontmatter key, no migration, nothing to roll back, and a value-only write skips the vault walk. Every value is entered through the shared pickers and `PropertyEditor`, so malformed input and write refusal behave exactly as they do in the table, cards, and preview.
- **E-2:** [assumed] **Layering: a portalled picker must clear the dropdown, and opening one must not dismiss it.** Precedent exists in the same surface — the Settings dropdown's Properties pane already opens the IconPicker, and FilterPane opens pickers from within a pane — so the mechanism is proven rather than novel. Still the sharpest interactive risk here and worth an explicit check, since a picker that dies with the menu that spawned it is unusable.
- **E-3:** [confirmed] **Two surfaces on one page go unsynchronised, on purpose.** The preview inspector caches its own frontmatter and this leaf will too, so a write in one leaves the other's display stale until it refetches. No mechanism is built for it: most-recent-wins is the project's philosophy, disk stays correct either way, and the two are rarely open together on the same page. A refresh bus for this alone would be machinery bought for a state nobody produces.

### Core (must-have)

The Properties leaf of the Page's Settings dropdown:

- Reached from a `Properties` row on the PageMenu root, drilling through the existing `PaneSlider`.
- A TopRow reading `‹ Settings    Properties`, no heading.
- Two field blocks — Contexts, then properties — in the preview's field look.
- The seeded Contexts always present, empty rows reading `—`, writing nothing until a value lands.
- Values set and cleared through the shared picker/editor primitives, on the existing write path.
- `+ Add Property` revealing any unassigned Context or property; right-click removing one.

Nothing here introduces a data shape, a write path, or a persistence rule — the whole leaf is an arrangement of mechanisms that already ship.

#### Prospects (allowed later, not now)

- **The configure drill (D-8)** — a row's right-click reaching the existing per-property editor. Wanted and additive: it changes nothing about the leaf's shape, so it can land after the value surface is proven rather than beside it.
- **Contexts set aside remember nothing.** A Remove lasts the session; reopening the Page brings every Context back. Whether a page should remember which ones it was told to hide is a storage question — an empty row holds no key today, and persisting the absence would mean writing something to say nothing.
- **The shared body** — extraction into an editor mounted by both this leaf and a future inspector surface, once that surface exists to prove what they share (C-3).
- **Aliases** — its own leaf, deferred whole (A-1, B-1). The vocabulary collision with the `[[Title|alias]]` Prospect must be settled before it is specified.

#### Out of Scope (won't do — distinct from Prospects)

- **Inline definition editing.** The drill in D-8 is the only route to a definition, and it lands in the surface that already carries that weight.
- **Assigning a property to the Collection from here.** `+ Add Property` reveals a row from the schema the Collection already assigns — it does not change the assignment. That belongs to the container's Properties pane.
