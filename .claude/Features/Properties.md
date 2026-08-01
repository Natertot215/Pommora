### Properties

Pommora's property system. The same type catalog applies to [[Studio/Pommora/II. Features/Pages|Pages]], Tasks, and Events. Page-property definitions live in one nexus-wide registry that [[Collections]] *assign*; Agenda keeps its own definitions on its config sidecars; values live on each member entity. The on-disk file is canonical.

A **property** is a typed field defined once in the nexus-wide registry and populated on the members of every Collection that assigns it. The registry declares each property's type and per-type config; a Collection's assignment list names which registry properties its Pages validate and show; member entities store the values.

| Scope | Definitions |
|---|---|
| Nexus-wide registry | `.nexus/properties.json` → `propId → definition` |
| Page Collection | `<Collection>/_pagecollection.json` → `properties[]` (assigned registry ids) |
| Task | `<Tasks>/_taskconfig.json` → `property_definitions[]` (own defs — separate from the registry) |
| Event | `<Events>/_eventconfig.json` → `property_definitions[]` (own defs — separate from the registry) |

A Page's values are wrapped title keys at its frontmatter root; a Task's or Event's are the same wrapped keys at its JSON root, resolved against that kind's own `property_definitions` rather than the nexus registry. [[Studio/Pommora/II. Features/PageSets|PageSets]] don't carry their own schema — they inherit the Collection's. A definition — options included — is one shared object everywhere it's assigned; genuinely divergent needs get a separate property, never per-Collection option forks.

### Features

#### II. Type Catalog

| Type                  | On-disk value                                                           | Notes                                           |
| --------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| **Number**            | `<Count>: 42`                                                           | Bare number.                                    |
| **Checkbox**          | `<Done>: true`                                                          | Bare boolean.                                   |
| **Date**              | `"2026-06-15"` (date-only, UTC) or `"2026-06-15T14:30:00Z"` (with time) | A bare date-only value folds into Date on read. |
| **Select**            | `<Stage>: Active`                                                       | Bare string; one colored chip.                  |
| **Multi-select**      | `<Tags>:` over a block sequence                                         | Bare array; tag-style multi-pick.               |
| **Status**            | `<Status>: Complete`                                                    | Bare label — the option's own value; grouped by workflow phase. |
| **URL**               | `<Link>: https://…`                                                     | A string with a scheme.                         |
| **Context**           | `(Context):` at the root, over a block sequence of bare Space titles   | One column per registry Context, synthesized at runtime — never a schema definition. |
| **Last Edited Time**  | *(derived from `modified_at`)*                                          | Virtual — never persisted.                      |
| **File / Attachment** | `[{ "path", "original_name", "added_at", "mime_type" }, ...]`           | Array; files copy into the Nexus.               |

There's no free-form text type — the filename is the title, and text-shaped values use creatable Select options. The **context** type isn't offered in the type picker; a stored context definition is dropped on read, as is any user-relation definition — content ↔ content relational properties don't exist.

#### II. Identity vs Name

Every property carries two independent identifiers:

- **`id`** — a stable identity, never changing. User properties mint a `prop_<ulid>`; built-ins use a reserved `_`-prefixed id. This is the key used in `.nexus/properties.json`, in a Collection's assignment list and its remove-cache, and in every SavedView config. Member files never carry it.

- **`name`** — the key a value writes under, and therefore unique nexus-wide, folded for case, trimmed and NFC-normalized once at write so an untrimmed name can never reach a key. A rename is instant and cascades: the registry commits first, then one sweep rewrites the key on every page holding it. The new key always wins where both appear, because the registry has already switched and any value written during the sweep used the new name. A rename onto a taken title is refused rather than disambiguated.

Reserved property IDs (`_id`, `_title`, `_created_at`, `_modified_at`, `_location`) are blocked from user properties. The page `cover` is a root frontmatter field, not a property, and never appears in any properties UI.

#### II. On-Disk Value Shapes

A value is decoded against the type its definition declares. The key names the property, so the definition is in hand before the value is read. Values are bare and natively typed: a number is a number, a checkbox a boolean, a date a timestamp, and every one stays legible to any YAML tool. The key names the property and the registry names the type, so nothing is ever inferred from a value's shape — a Select option spelled `2024-01-01` stays a Select, which shape inference could never guarantee.

**No value, no key.** Setting a property to null, or to any empty value, clears its key from the member file — a member without a value never carries a placeholder, and the rule reaches the Remove-cache the same way. Checkbox false and number zero are real values and stay. Every wrapped key follows it.

**An unmatched wrapped key persists inert and is never dropped.** A key naming no registry entry is preserved by value and read by nothing. This is what lets an interrupted rename sit on disk in plain language rather than vanish, and what makes every pass of one safe to re-run.

#### II. Status

A workflow property whose values sort into status **groups**. The group model is open — each group is a stable `id` with a user-editable label, a color, and its own options — seeded with three calendar-phase defaults:

| Group         | Default label | Default color |
| ------------- | ------------- | ------------- |
| `upcoming`    | Open          | grey          |
| `in_progress` | Active        | blue          |
| `done`        | Done          | green         |

Group **ids** are the load-bearing keys: every value references its group by id, and the status semantics resolve by id rather than list position. The model isn't capped at the seed — further groups drop into the open enum with no data change, and a future EventKit bridge maps each by a completion semantic rather than a fixed count.

An option's `value` IS its label, so renaming rewrites both and cascades onto every assigning page. An option without its own colour wears its group's, and every chip surface resolves through that one rule. Sort is group position first, then option order within it. Status is opt-in on a Collection like any other property.

The **Status editor** edits it in place: a group-labeled option list (double-click a heading to relabel its group), each option a pill chip in its group's colour, with a per-group `+` for an inline-named option, a hover palette to recolor, drag to reorder within or across groups, and a right-click **Rename · Remove · Clear** menu.

#### II. Checkbox

A boolean with two per-view looks and one property-wide colour. The **look** (`column_styles`) is **Checkbox** (a rounded box) or **Switch** (the Figma switch); both read on/off straight from the value, so an empty box or off switch means no stored value — toggling one on assigns `true` in place, toggling off strips the key. The **colour** (def-level `checkbox_color`) applies to the ON state only: a checked box fills with it and a switch's on-track tints, while an empty box and an off switch stay neutral grey and the check or knob reads at label-control. An absent colour is **Accent** — the nexus-configured accent — and a chosen colour equal to that accent reads "Accent" too, since the accent is a live config rather than a frozen palette label. The **Checkbox editor** pane pairs a colour chip (opening the recolor picker) with a Style picker (Checkbox ⇄ Switch, the shared double-chevron control).

#### II. Number

A bare number on disk with a **property-wide** format and a **per-view** look. The format — a family (Number, Percent, Currency), a currency code, thousands separators, decimal places, and a Fraction toggle rendering "N out of Value" — is set once and applies everywhere, like the checkbox colour rather than the per-view date formats. Percent stores the **literal** value and appends the sign, keeping the file legible.

The **look** is per-view: **Number** (formatted text) or **Bar**, a progress bar filling against a muted track. The editor exposes the format as one section whose conditional rows reveal on disclosure, with the Style row appearing only when the config makes a bar meaningful. Ring and the tile-grid Show-as belong to view types with vertical room, not the table.

#### II. Date & Time

Stores a single ISO value — a date-only string folds into Date on read, a with-time string carries the clock. Its **formats** are per-view: a Date format (numeric, worded, or Relative), a conditional weekday offered only for the worded formats, and a Time. A cell opens the **CalendarPicker**, a calendar grid plus segmented time editor whose clock follows the nexus-wide `time_format`. The editor pane exposes the same formats as one discoverable section.

#### II. Select & Multi-Select

Select stores a bare string and renders one colored chip; Multi-Select stores a bare array and renders several. Both draw from a shared option list on the definition — an option's `value` is its label, so renaming rewrites both and cascades onto every assigning page. The **option editor** is an inline list of chips: a per-list `+` adds an inline-named option, a hover palette recolors, drag reorders, and a right-click offers **Rename · Remove · Clear**; creating the property seeds one starter option. Neither carries a per-view Style — their chips always take the squared label shape, the pill being Status's alone.

#### II. Links & URL

A URL property renders each value as a clickable link (opened through the sanctioned IPC). Its look is set on the property and applies everywhere:

- **Display** — each link as its full URL, or its fetched page title.
- **Underline** — on or off.
- **Color** — the link colour, a palette key chosen from the chip beside it (Default = the app accent), which also themes the editor pane's own controls.

A per-value **alias** (right-click → Rename, stored markdown-native as `[alias](url)`) overrides the display for a single link. In the title look, the page `<title>` is fetched once per URL and cached per-machine in `nexus.db`, falling back to the bare domain while loading or on failure.

#### II. Context Links

Context links are the only relation-type connection. They store as **parenthesized title keys at the entity root**, over a block sequence of bare Space titles:

```yaml
(Projects):
  - Pommora
```

In a Task, an Event or a `_space.json` the same key rides the JSON root, quoted there because JSON quotes every key. They're never schema definitions: each registry Context resolves to one column at runtime, alongside the assigned schema rather than inside it, and every entry — seeded or user-created — carries an ordinary minted ULID. Full cross-layer behavior → `Contexts.md`.

#### II. Auto-Managed Properties

Every Page, Task, and Event carries its kind's id key (`PageID` / `TaskID` / `EventID`, holding a ULID assigned at creation), `created_at`, and `modified_at` — maintained by Pommora, not user-creatable. It surfaces as **Last Edited Time**, whose column shows the stored `modified_at` stamp; sorting and filtering fall back to `created_at` so a never-modified page still orders by its creation time.

**A schema edit is not a page edit.** Renaming a property definition, changing its type, or reordering an assignment leaves every member page's `modified_at` untouched — the page didn't change, its schema did. Only a property's VALUE changing counts, alongside a text edit, a move, and a rename (→ `Pages.md`).

#### II. Where Properties Live

Three layers, deliberately separate: a **definition** (the nexus-wide registry, `.nexus/properties.json`, alongside a nexus-wide cosmetic display order) says what a property is; an **assignment** (a Collection's sidecar) says which definitions that Collection carries; a **value** (a Page's frontmatter) says what one entity holds. The read walk joins definition to assignment so every surface receives a resolved schema, and the tree carries the full ordered registry so the pane lists everything live. Of the three, the definition is the only layer the storage line permits moving into the database; assignments and values stay files. The **Properties pane** in the toolbar's Settings dropdown is the full assign surface for a Collection: assigned properties on top (chevron → the per-property editor), an **All Properties** disclosure pinned to the pane's bottom that rises open to list every unassigned registry definition in the nexus order, each promotable via its `+` or by dragging into the assigned group at a slot. Dragging within a group reorders it (assigned = the Collection's order; All Properties = the nexus order); dragging an assigned row out Removes it. Creating (the `+` in the pane's pinned bottom row) mints into the registry — appending to the nexus order, seeding per-type options — and assigns here; renames (the editor header, or a row's right-click → inline rename), type changes, and option edits change the global definition for every assigner. Remove strips-and-caches (see Schema Mutations); the global **Delete lives only inside a property's own editor pane**, behind its ⋮ menu and a native confirm. **Display formats aren't definition config**: the per-type look and date/time formats persist per-VIEW in the SavedView's `column_styles` — how a value renders is the view's call, never the definition's. The exception is **Number's format**, which is property-wide (def-level, like the checkbox colour and link config); only its look (Number/Bar) is per-view. The first surface for *setting values* is the table's cells (the gesture matrix → `TableView.md`); on a Page, the Page Preview's front-matter inspector (→ `PagePreview.md`) is the entity-level surface. The Page Property Panel is Pending.

### Architecture

#### II. Schema Mutations

| Mutation                   | Effect on existing values                                                                                                                                                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create a property          | Mints a nexus-wide definition (appending its id to the nexus order) and assigns it to the creating Collection; appears empty on every member — no member writes until a value is set.                                                                                                                                                  |
| Assign a property          | Adds this Collection's reference to an existing definition — idempotent, no name check — then restores any Remove-cache: each cached value that still conforms to the definition's current type and options writes back to the page that held it, leaving the cache as its write lands. What can't restore — a non-conforming value, a vanished page — stays cached for the day it can, and the block clears only when nothing remains.         |
| Remove a property          | Caches each member's value (with which pages held it) on the Collection's own sidecar and unassigns, THEN strips the value from every member page — cache-before-strip, so a failure mid-strip is recoverable rather than lossy. A page carrying no identity key is stripped without a cache entry. Re-assigning restores what was cached; the definition and other Collections are untouched. |
| Rename a property          | Commits the registry, then sweeps every page holding the old key in one pass — the new key wins wherever both appear. Instant to the eye; the sweep runs behind it and never re-dates a page, because a key-only rename is not a content edit. Collections are untouched: the assignment list and the remove-cache are id-keyed and therefore rename-immune. |
| Reorder properties         | Per-Collection assignment order (sidecar-only); the All Properties group reorders the nexus-wide display order instead (registry-file-only).                                                                                                                                                                                           |
| Change a property's type   | A global definition edit — a value whose shape no longer matches stops rendering but stays in frontmatter.                                                                                                                                                                                                                             |
| Delete a property (global) | A timestamped recovery snapshot of the definition and every value lands in `.trash`, then the value is stripped across every collection's pages and assignment lists, every Remove-cache block for it is purged (a cache without its definition is corrupt state), and the definition leaves the registry — nothing restorable in-app. |
| Edit options               | Global — adding, reordering, and recoloring are registry-only; renaming an option rewrites its stored label on every assigning page — a Select's bare string, one element of a Multi-select's array, or a Status's bare label alike, and removing or clearing one strips that value from those pages.                                                                                                                                                                                                   |

Neither Remove nor the global delete is cross-file atomic: each is a per-file fan-out whose safety net is written first — the sidecar cache for Remove, the `.trash` snapshot for delete — so a partial run re-runs cleanly. Registry mutations serialize through one write chain, so overlapping edits never lose an update. Remove is the daily path; the global delete is the rare destructive one, reachable only inside the property's own editor pane behind a native confirm.

#### II. Validation

At every write: a created property's `name` is non-empty and its `id` is unique and not a reserved one. Select and Multi-select option titles must be unique within the property — there's no minimum count, so a zero-option Select is legal. **Names are unique nexus-wide**, compared case-folded, because the name is the on-disk key: two definitions sharing a title would leave that key unresolvable. A leading `$` is refused, reserving `$`-prefixed keys for system-assigned roles — a leading `_` is not, because the wrap is the namespace boundary and a property named `_title` writes `<_title>`, which can never meet the reserved id. Agenda's own definitions keep their own unique-name rule over their own namespace. Assigning runs no name check — it's a reference to an existing definition, not a new one. Each member value's shape must match its schema entry's type.

#### II. Index

Nothing mirrors the registry into a database: filter, sort, and group all run renderer-side over the frontmatter the walk already carries, and the registry file is the single source.

**The sigil governs; the registry registers.** A wrapped key is Pommora's — that is what makes it safe to sweep, safe for Sapphire to hide, and distinguishable from foreign frontmatter. It does not make it a property. A key registers as a live value only when its name matches a definition, so resolution runs definition-first: the schema supplies the key, and the frontmatter is read at it. Context keys resolve at walk assembly, being cheap and registry-independent; property values load when a container opens, and each container builds one id→definition index rather than scanning per cell. Full data layer → `Architecture.md`.

### Pending

**Page Property Panel:** The surface for setting property values on a Page in the main pane, and on a Task or Event anywhere — a panel attached to the content. The Page Preview's front-matter inspector covers a Page inside the preview only; the main pane renders no property rows, and Agenda items have no value surface at all.

**Built-in Agenda Status:** The Status property Tasks and Events are meant to carry by construction — a seed plus a delete guard that keeps it there. Neither exists, and neither does an agenda schema to hold them: a seeded config carries identity only.

**Lossy Change-Type Strip:** The cross-assigner value strip a lossy type change should trigger. `changeType` accepts the drop flag and ignores it, applying a plain global definition edit.

**Per-Type Editor Panes:** File is the one creatable type whose editor body is blank. The Checkbox, Number, Select, Multi-Select, Status (grouped / flat option lists, add · recolor · reorder · drag, right-click Rename · Remove · Clear), URL, and Date & Time editors have shipped; File follows on their patterns.

**Number Show-as for dynamic views:** the completion **Ring** and the Notion-style Number/Bar/Ring tile grid belong to view types with vertical room (Gallery/Board) — the table ships the Number/Bar look row only. The bar's stroke is held pending a visual pass.

**Larger Color Picker:** option colors store an open solid-palette key (resolved through `chipColorFor` with a legacy read-map for old Notion values), so the ColorPicker's grid can grow into a much larger selector over the shared color tokens — reusable across every color-token consumer — with no schema churn. A future enhancement, not a limitation.

**Calendar Picker refinements:** the Date & Time value editor is live in table cells but pending — range values (a datetime value is a single ISO on disk, so the value picker disables the shared picker's range mode), keyboard stepping on the time segments, an in-app control for the `time_format` setting, and its own test coverage.

**Per-View Link Styling:** a URL property's look — display (full-URL ⇄ title), underline, colour — is entirely property-level; a URL column has no per-view style. Letting a view override it (one view titles, another raw URLs, of the same property) is a prospect, not a limitation — the `column_styles` seam already carries per-view looks for the other types.

### Known Issues

**A checkbox's "Accent" reads neutral in the pane under a `system` accent:** the cell box and switch tint the true accent through `var(--accent)`, so they render correctly for any accent setting. The editor's colour *chip*, though, resolves through a palette key — and `system` (follow-the-OS) has no palette key, so it falls back to the neutral default chip. A palette-key accent (the default and every explicit choice) is unaffected, and only the settings chip shows the mismatch.

**A stray bare-string Multi-Select value reads as Select:** the read-side coercion that overrides a shape-vs-column type mismatch — a value's on-disk shape corrected to what its column actually declares — covers only the single-string kinds (URL / Select / Date). A Multi-Select value stored as a lone string rather than an array therefore stays classified as Select and drops out of grouping and filtering. Unreachable while nothing writes that shape, but it goes live the moment the **Lossy Change-Type Strip** performs a Select→Multi-Select change; fix it there as a value migration (bare string → single-element array), not a coercion special-case.
