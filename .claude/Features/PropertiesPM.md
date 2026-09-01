## Properties

```
Properties
├── The Type Catalog
├── Identity & Values
├── Property Types
│   ├── II. Status
│   ├── II. Checkbox
│   ├── II. Number
│   ├── II. Date & Time
│   ├── II. Select & Multi-Select
│   ├── II. Link
│   ├── II. File
│   └── II. Context
├── Auto-Managed Properties
├── Shared Mechanisms
└── Pending
```

Pommora's property system. A **property** is a typed field defined once in the nexus-wide registry and filled in on the members of every Collection that assigns it. Three layers hold the system: a **definition** in `.nexus/properties.json` says what a property is — its type and per-type configuration; an **assignment** on a Collection's sidecar says which definitions that Collection carries and shows; a **value** in a Page's frontmatter says what one entity holds. A definition, its options included, is one shared object everywhere it's assigned, so the same property means the same thing in every Collection, and genuinely divergent needs get a separate property. Page Sets carry no schema of their own and inherit the Collection's.[^1]

### The Type Catalog

The ten types are the `propertyType` enum in `src/shared/properties.ts`; the on-disk value is bare and natively typed, legible to any YAML tool.

| Type | On-Disk Value | Notes |
| --- | --- | --- |
| **Number** | `Count: 42` | Bare number |
| **Checkbox** | `Done: true` | `true`, or the key absent |
| **Date** | `2026-06-15` (date-only) or `2026-06-15T14:30:00` (with time, no zone) | A bare date-only value folds into Date on read |
| **Select** | `Stage:` over a one-element block sequence | A list holding one option; one colored chip. A list holding several reads as its last registered option |
| **Multi-select** | `Tags:` over a block sequence | Bare array; tag-style multi-pick |
| **Status** | `Status:` over a one-element block sequence | The option's own value, in a list of one; grouped by workflow phase. Resolves like Select |
| **Link** | `Link: https://…` or `Link: "[[Page]]"` | A string — an address with a scheme, or a connection naming a page |
| **Context** | `<Context>:` at the root, over a block sequence of bare Space titles | One column per registry Context, synthesized at runtime — never a schema definition |
| **Last Edited Time** | *(derived from `modified_at`)* | Virtual — never persisted |
| **File** | `Attachments:` over a block sequence of `[[Basename.ext]]` | Array of wikilinks naming files by basename; files copy into the Nexus |

### Identity & Values

Every property carries two independent identifiers. Its **`id`** is stable and never changes: user properties mint a `prop_<ulid>`, and built-ins use a reserved `_`-prefixed id (`_id`, `_title`, `_created_at`, `_modified_at`, `_location`) that user properties can't claim. The id is the key in the registry, in a Collection's assignment list and restore cache, and in every saved view; member files never carry it. Its **`name`** is the key a value writes under, bare and exactly as spelled — unique nexus-wide, case-folded, trimmed and NFC-normalized once at write; a name Pommora's own keys use (`PageID`, `TaskID`, `EventID`, `icon`, `cover`, `created_at`, `modified_at`) or one starting with `<` is refused. A rename cascades the key across every page holding it; a rename onto a taken name, or onto a key any Collection page already holds, is refused — the second naming how many pages hold it.

A value is decoded against the type its definition declares (`src/shared/propertyValue.ts`): the key names the property, so the definition is in hand before the value is read, and nothing is inferred from a value's shape. Two rules follow. **No value, no key** — setting a property to null or any empty value removes its key from the member file, so a member without a value never carries a placeholder; number `0` is a real value and stays, while a checkbox is either `true` or absent — a `false` written by another application reads as no value. **A key the registry doesn't name is foreign** — preserved by value, read by nothing, and never rewritten; registering a property under that name makes the values it already holds live at once. A name is shown as written unless **Capitalize All Metadata** is on, which Title Cases every property name where it is displayed — the rename fields and the on-disk key are untouched.[^3] Another application may hold a key's casing to its own rule — Obsidian rewrites `tags`, `aliases`, and `cssclasses` lowercase on any touch — so a property wanting one of those names is created lowercase and read capitalized through the toggle.

Here's an example of how the frontmatter page with both Pommora-managed and externally-applied frontmatter would appear:

```yaml
<Projects>:
  - Pommora
Tags:
  - Claude
  - Docs
Areas:
  - Work
  - "[[Personal]]"
tags:
  - Obsidian
  - Task
```

### Property Types

Each type's definition-level configuration lives on the `propertyDefinition` schema; its per-view look lives on the view's `column_styles`.[^2] The editor frame for each type is a frame of the Property Frame.

#### II. Status

A workflow property whose options sort into **groups**. The group set is open — each group is a stable `id` with a user-editable label, a color, and its own options — seeded with three: `upcoming` (Open, grey), `in_progress` (Active, blue), `done` (Done, green). Every option references its group by id, so status semantics resolve by id rather than position, and further groups drop in with no data change. An option's `value` is its label, so renaming rewrites both and cascades onto every assigning page; an option without its own color wears its group's. Sort is group position first, then option order within it.

The **Status editor** edits in place: a Style toggle over a group-labeled option list, double-click on a heading to relabel its group, a per-group `+` for a new option, a hover palette to recolor, drag to reorder within or across groups, and a right-click **Rename · Remove · Clear** menu. The value renders as a pill in its group's color; the **Compact** style renders it icon-only as the group's glyph.

#### II. Checkbox

A boolean with two per-view looks and one property-wide color. The look is **Checkbox** (a rounded box) or **Switch** (a DualSwitch); toggling on writes `true` and toggling off strips the key. The `checkbox_color` applies to the on state only — a checked box fills with it and a switch's on-track tints — while the off state stays neutral; an absent color follows the Nexus accent live. The editor pairs a ColorSwatch with a Style picker.

#### II. Number

A bare number with a **property-wide format** and a **per-view look**. The format — a family (Number, Percent, Currency), a currency code, thousands separators, decimal places, and a Fraction toggle rendering "N out of denominator" — is set once in the Number editor and applies everywhere. Percent stores the literal value and appends the sign, keeping the file legible. The look is **Number** (formatted text) or **Bar**, a progress bar filling against a muted track.

#### II. Date & Time

A single ISO value: a date-only string folds into Date on read, and a with-time string carries the clock. Its formats are per-view — a Date format (numeric, worded, or Relative), a weekday offered with the worded formats, and a Time — and a view that names no Date format takes the Nexus's own **Date Format**, with the clock following **Time Format**.[^3] A cell opens the CalendarPicker, a calendar grid plus a segmented time editor.

#### II. Select & Multi-Select

Select stores a one-element list and renders one colored tag chip; Multi-Select stores a list and renders several. The three option types read one shape — a list, with a bare scalar read as a list of one: Select and Status keep the last element that names a registered option (an unregistered one reads as no value; removing that option from the property reveals the registered one before it), Multi-Select keeps every element. A YAML number or boolean names the option it spells, so a hand-written `- 2024` is the option "2024". Both draw from a shared option list, seeded with one starter option at creation. The option editor is an inline list under a Style toggle: a per-list `+`, a hover palette to recolor, drag to reorder, and a right-click **Rename · Edit Icon · Remove · Clear** menu. The **Compact** style renders each chip icon-only — the option's own icon, or the single- or double-tag default.

#### II. Link

A Link property renders each value as a clickable link and holds either an address or a connection. Its look is set on the property and applies everywhere, though a view's column may read its links differently: a **Format** of Full Link, Short Link, or Page Title; **Underline** on or off; and a **Color** picked from the ramp, defaulting to the app accent. A per-value alias, set through Rename and stored as `[alias](url)`, overrides the format for that one link. Page Title is the only format that reaches the network — the page's `<title>` is fetched once per address and cached per machine, showing the bare domain while it loads. Sorting and filtering read the raw address, so a column's order never moves when its look does.

Pasting `[[Title]]`, or a markdown link whose target names a page, stores the value as a connection under the page's own capitalization, with any alias carried through. The cell then reads as a connection — the connection color, a click that opens the page — and the three link formats don't apply; a title no page answers to is refused at commit, as a malformed address is. Renaming a page rewrites the connections held in frontmatter alongside those in bodies.[^4] A filled link value right-clicks to the shared link menu, closing on Clear rather than the editor's Remove Link and Delete.[^4]

#### II. File

A File property holds an ordered list of files that live in the Nexus, each named by a wikilink over its basename:

```yaml
<Attachments>:
  - "[[Q3 Report.pdf]]"
  - "[[Floorplan.png]]"
```

The name is the whole reference; no path is stored. It resolves against an in-memory basename index the file watcher keeps current (`src/main/assetMap.ts`), which is what lets the asset directory be re-pointed or a file be moved within it without a value going stale. A name that answers to no file still renders, dimmed, so it can be removed. Each value renders as a **file chip** — the file type's glyph and its name — and the cell clips and scrolls when the run outgrows the column.[^5]

The property-wide **Directory** is the folder its files land in, stored relative to the asset root so re-pointing the root carries it along; unset means the root itself. Filling a value opens the operating system's file dialog: clicking a chip replaces the file it names, clicking the value's own area adds one, and a right-click offers **Add File · Replace File · Remove File**. The file is copied into the Nexus before the reference is written, stepping a colliding name aside and skipping the copy when the bytes already match; removing a value drops the reference and leaves the bytes. Sorting reads the filename and filtering is presence only. A File column carries no per-view style.

#### II. Context

Context links are the relation layer. They store as `<Title>` keys at the entity root, over a block sequence of bare Space titles, in a page's frontmatter, and at the root of `_space.json`, alike. They are never schema definitions: each registry Context resolves to one column at runtime, alongside the assigned schema rather than inside it.[^6]

### Auto-Managed Properties

Every Page carries its kind's id key (`PageID`, holding a ULID assigned at creation), `created_at`, and `modified_at`, maintained by Pommora and not user-creatable. `modified_at` surfaces as **Last Edited Time**, whose column shows the stored stamp; sorting and filtering fall back to `created_at` for a never-modified page; pages may also carry `cover:` which assigns their banners. A schema edit is not a page edit: renaming a property or reordering an assignment leaves every member's `modified_at` untouched.[^7]

```yaml
PageID:
created_at:
modified_at:
cover:
```

### Shared Mechanisms

What holds across every type: the assign surface, the mutations and their safety, validation, and the label vocabulary.

**The Property Frame.** The Properties frame of the toolbar's Settings menu (`src/renderer/Properties/PropertyFrame.tsx`) is the assign surface for a Collection: the assigned properties on top, each opening its per-type editor, and an **All Properties** disclosure pinned to the bottom listing every unassigned registry definition in the nexus order, each promotable by its `+` or by dragging into the assigned group. Dragging within a group reorders it — the Collection's order above, the nexus order below — and dragging an assigned row out removes it. The frame's `+` creates: it mints into the registry, seeds per-type options, and assigns here. A definition's type is chosen at that moment and fixed for its life — a different type is a different property. Renames and option edits change the global definition for every assigner. The global Delete lives only inside a property's own editor frame, behind its ⋮ menu and a native confirm.

**Schema Mutations.** The registry mutations live in `src/main/CRUD/registryProperty.ts` and its siblings; their entry points serialize on one chain, and every operation that writes both the registry and pages states its intent in a journal first so a crash replays forward on the next open.[^8]

| Mutation | Effect on Existing Values |
| --- | --- |
| Create a property | Mints a nexus-wide definition and assigns it to the creating Collection; appears empty on every member, with no member writes until a value is set. |
| Assign a property | Adds this Collection's reference to an existing definition, then restores any cached values that still conform to the definition's current type and options. |
| Remove a property | Caches each member's value on the Collection's own sidecar (`property_cache`) and unassigns, then strips the value from every member page — cache before strip, so a failure mid-strip never loses anything. Re-assigning restores the cache. |
| Rename a property | Commits the registry, then sweeps every page holding the old key. Never re-dates a page; assignment lists are id-keyed and unaffected. |
| Reorder properties | Per-Collection assignment order on the sidecar; the All Properties group reorders the nexus-wide display order in the registry. |
| Delete a property (global) | A record — the definition, the Collections that assigned it, and every value keyed by page id — lands in `.trash` before anything is destroyed, then the value is stripped everywhere, every cache block is purged, and the definition leaves the registry. Restorable.[^9] |
| Edit options | Global — adding, reordering, and recoloring are registry-only; renaming an option rewrites its stored label on every assigning page, and removing one strips that value. |

Neither Remove nor the global delete is cross-file atomic; each is a per-file fan-out whose safety net is written first and which re-runs cleanly after a partial run. Remove is the daily path; the global delete is the rare destructive one.

**Repair.** Every governed write runs one reconcile over the file's root (`reconcileGovernedRoot` in `src/shared/contextResolve.ts`) before it lands: an assigned property's value is re-encoded as its definition reads it — a scalar option becomes a one-element list, a Multi-Select option the definition doesn't hold is adopted into it, a checkbox `false` or an emptied value deletes its key — and a Context key's near-miss Space title is repaired to the canonical spelling while a value naming no Space is dropped. Files that changed while the app was closed are reached by the on-open sweep behind **Repair Properties On Open**: the index seed already knows which pages it re-read, and the sweep runs the same reconcile over exactly those, writing only where something moved and pushing the containers it touched.[^3]

**Validation.** A created property's name is non-empty, unique nexus-wide (compared case-folded, because the name is the on-disk key), and may not start with `$`, which is reserved for system roles; a leading `_` is allowed. Select and Multi-select option titles are unique within their property, and a zero-option Select is legal. Each member value's shape must match its definition's type.

**Labels.** A value renders as a label — a chip whose shape names the property's kind: a pill for Status, a tag for the other options. The label vocabulary is the design system's.[^10]

---

#### Pending

- **Number looks for other views** — the completion Ring and the Number / Bar / Ring tile grid belong to view types with vertical room; the table ships Number and Bar.
- **Calendar Picker** — range values, keyboard stepping on the time segments.
- **Per-view link styling** — a Link property's look is property-level; letting a view override it is a prospect the `column_styles` seam already allows for.
- **A Text type** — free text is the default type in other frontmatter editors and has no Pommora type; a Select stands in for it today.

[^1]: [[CollectionsPM]]
[^2]: [[ViewTypesPM]] §The Saved-View Model
[^3]: [[ConfigurationPM]] §General
[^4]: [[ConnectionsPM]]
[^5]: [[SymbolsPM]] §File Types
[^6]: [[ContextsPM]]
[^7]: [[PagesPM]] §On-Disk Shape
[^8]: [[ArchitecturePM]] §Mutations
[^9]: [[NexusRecordPM]]
[^10]: [[DesignSystemPM]] §Labels & Chips
