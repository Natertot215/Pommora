### Properties

Pommora's property system. The same type catalog applies to [[Studio/Pommora/II. Features/Pages|Pages]], Tasks, and Events. Page-property definitions live in one nexus-wide registry that [[Collections]] *assign*; Agenda keeps its own definitions on its config sidecars; values live on each member entity. The on-disk file is canonical.

A **property** is a typed field defined once in the nexus-wide registry and populated on the members of every Collection that assigns it. The registry declares each property's type and per-type config; a Collection's assignment list names which registry properties its Pages validate and show; member entities store the values.

| Scope | Definitions |
|---|---|
| Nexus-wide registry | `.nexus/properties.json` → `propId → definition` |
| Page Collection | `<Collection>/_pagecollection.json` → `properties[]` (assigned registry ids) |
| Task | `<Tasks>/_taskconfig.json` → `property_definitions[]` (own defs — separate from the registry) |
| Event | `<Events>/_eventconfig.json` → `property_definitions[]` (own defs — separate from the registry) |

Page values live in `.md` frontmatter; Task and Event values live in a `properties` JSON object. [[Studio/Pommora/II. Features/PageSets|PageSets]] don't carry their own schema — they inherit the Collection's. A definition — options included — is one shared object everywhere it's assigned; genuinely divergent needs get a separate property, never per-Collection option forks.

### Features

#### II. Type Catalog

| Type                  | On-disk value                                                           | Notes                                           |
| --------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| **Number**            | `42` or `3.14`                                                          | Bare number.                                    |
| **Checkbox**          | `true` / `false`                                                        | Bare boolean.                                   |
| **Date**              | `"2026-06-15"` (date-only, UTC) or `"2026-06-15T14:30:00Z"` (with time) | A bare date-only value folds into Date on read. |
| **Select**            | `"<value>"`                                                             | Bare string; one colored chip.                  |
| **Multi-select**      | `["<value>", ...]`                                                      | Bare array; tag-style multi-pick.               |
| **Status**            | `{"$status": "<value>"}`                                                | Tagged object; grouped by workflow phase.       |
| **URL**               | `"https://..."`                                                         | A string with a scheme.                         |
| **Context**           | `"[<Context>]": [<Space titles>]` at the entity ROOT                    | Not under `properties`; one column per registry Context, synthesized at runtime. |
| **Last Edited Time**  | *(derived from `modified_at`)*                                          | Virtual — never persisted.                      |
| **File / Attachment** | `[{ "path", "original_name", "added_at", "mime_type" }, ...]`           | Array; files copy into the Nexus.               |

There's no free-form text type — the filename is the title, and text-shaped values use creatable Select options. The **context** type isn't offered in the type picker; a stored context definition is dropped on read, as is any user-relation definition — content ↔ content relational properties don't exist.

#### II. Identity vs Name

Every property carries two independent identifiers:

- **`id`** — a stable identity, never changing. User properties mint a `prop_<ulid>`; built-ins use a reserved `_`-prefixed id. This is the key used in member-file values and in cross-property references.

- **`name`** — the user-facing display label, renameable freely. A rename is registry-only — member files are keyed by ID, so nothing cascades; every assigning Collection sees the new name.

Reserved property IDs (`_id`, `_title`, `_created_at`, `_modified_at`, `_status`, `_type`, `_location`) are blocked from user properties. The page `cover` is a root frontmatter field, not a property, and never appears in any properties UI.

#### II. On-Disk Value Shapes

A value is recovered from raw JSON by **shape**, in a fixed precedence — the declared type lives in the schema, and the on-disk value is type-erased. Status uses a tagged object (`$status`) so an agent can identify the value type from any single file without the schema; Select stays a bare string and Multi-select a bare array because their shapes don't collide. **No value, no key:** setting a property to null — or to any empty value (an empty array or empty string) — clears its key from the member file; a member without a value never carries a null / `[]` / `''` placeholder. Checkbox false and number zero are real values and stay. Context keys follow the same rule — an emptied bracketed key leaves the root entirely.

#### II. Status

A workflow property whose values sort into status **groups**. The group model is open — each group is a stable `id` with a user-editable label, a color, and its own options — seeded with three calendar-phase defaults:

| Group         | Default label | Default color |
| ------------- | ------------- | ------------- |
| `upcoming`    | Open          | grey          |
| `in_progress` | Active        | blue          |
| `done`        | Done          | green         |

Group **ids** are the load-bearing keys: every value references its group by id, and the status semantics (the checkbox cycle, the group glyph) resolve by id rather than list position. The model isn't capped at the seed — more groups (Paused, Cancelled, or user-defined) drop into the open enum later with no data change, and a future EventKit bridge maps each group by a completion semantic (which groups count as done) rather than a fixed count. Group labels and the options within each group are user-editable. An option's `value` IS its label (value=title): renaming rewrites both and cascades the new value onto every assigning page's `$status`. Each option also carries an optional `color` and its `group_id` — an option without its own colour wears its group's (group colour is the default, option colour the override), and every chip surface resolves through that one rule (`statusOptions`). Creating a Status property seeds one starter option per group. Sort is group position first, then option order within a group. On a Collection, Status is opt-in like any other property.

The **Status editor** edits it in place: a group-labeled option list (double-click a heading to relabel its group), each option a pill chip in its group's colour, with a per-group `+` for an inline-named option, a hover palette to recolor, drag to reorder within or across groups, and a right-click **Rename · Remove · Clear** menu.

#### II. Checkbox

A boolean with two per-view looks and one property-wide colour. The **look** (`column_styles`) is **Checkbox** (a rounded box) or **Switch** (the Figma switch); both read on/off straight from the value, so an empty box or off switch means no stored value — toggling one on assigns `true` in place, toggling off strips the key. The **colour** (def-level `checkbox_color`) applies to the ON state only: a checked box fills with it and a switch's on-track tints, while an empty box and an off switch stay neutral grey and the check or knob reads at label-control. An absent colour is **Accent** — the nexus-configured accent — and a chosen colour equal to that accent reads "Accent" too, since the accent is a live config rather than a frozen palette label. The **Checkbox editor** pane pairs a colour chip (opening the recolor picker) with a Style picker (Checkbox ⇄ Switch, the shared double-chevron control).

#### II. Number

A bare number on disk with **property-wide** (def-level) format config plus a **per-view** look. The format — a **family** (Number, Percent, or Currency), a currency code, thousands **Separators**, **Decimals** (Hidden or a fixed number of places), and a **Fraction** toggle that renders "N out of Value" — is set once on the property and applies in every view, mirroring the checkbox colour and link config rather than the per-view date formats. Percent stores the **literal** value and appends `%` (a stored `30` reads as "30%"), keeping the file legible; it's also the family that hides the Separators, Fraction, and Value rows. The **look** (`column_styles`) is per-view — **Number** (formatted text) or **Bar**, a rounded progress bar filling its accent against a muted track by `value ÷ Value` (fraction) or `value ÷ 100` (percent). The **Number editor** pane exposes the format as one Format section whose conditional rows reveal on the disclosure, and whose Style row (Number ⇄ Bar) writes the per-view look and appears only when the config makes a bar meaningful. Ring and the tile-grid Show-as belong to view types with vertical room, not the table.

#### II. Date & Time

Stores a single ISO value — a date-only string folds into Date on read, a with-time string carries the clock. Its **formats** are per-view (`column_styles`): a **Date** format (numeric MM/DD/YYYY or DD/MM/YYYY, worded Short or Full, or **Relative** — "N Days from now" and "N Ago"), a conditional **Day** weekday (Full · Short · Hidden, offered only for the worded formats), and a **Time** (12- or 24-hour, or Hidden; en-US pinned). A cell opens the **CalendarPicker** — a calendar grid plus segmented time editor whose clock follows the nexus-wide `time_format` (`.nexus/settings.json`, resolved onto the tree like the accent; default 12-hour). The **Date & Time editor** pane exposes the same formats as a discoverable Format section (Date · conditional Day · Time), writing the same per-view `column_styles`.

#### II. Select & Multi-Select

Select stores a bare string and renders one colored chip; Multi-Select stores a bare array and renders several. Both draw from a shared option list on the definition — an option's `value` is its label, so renaming rewrites both and cascades onto every assigning page. The **option editor** is an inline list of chips: a per-list `+` adds an inline-named option, a hover palette recolors, drag reorders, and a right-click offers **Rename · Remove · Clear**; creating the property seeds one starter option. Neither carries a per-view Style — their chips always take the squared label shape, the pill being Status's alone.

#### II. Links & URL

A URL property renders each value as a clickable link (opened through the sanctioned IPC). Its look is set on the property and applies everywhere:

- **Display** — each link as its full URL, or its fetched page title.
- **Underline** — on or off.
- **Color** — the link colour, a palette key chosen from the chip beside it (Default = the app accent), which also themes the editor pane's own controls.

A per-value **alias** (right-click → Rename, stored markdown-native as `[alias](url)`) overrides the display for a single link. In the title look, the page `<title>` is fetched once per URL and cached in `.nexus/linkTitles.json` (device-local, regeneratable), falling back to the bare domain while loading or on failure.

#### II. Context Links

Context links are the only relation-type connection. They store as **quoted bracketed title keys at the entity root** (`"[Projects]": [Pommora]`), not under `properties`. They're never schema definitions: each registry Context resolves to one column at runtime, alongside the assigned schema rather than inside it, and every entry — seeded or user-created — carries an ordinary minted ULID. Full cross-layer behavior → `Contexts.md`.

#### II. Auto-Managed Properties

Every Page, Task, and Event carries an `id` (a ULID, assigned at creation), `created_at`, and `modified_at` — maintained by Pommora, not user-creatable. It surfaces as **Last Edited Time**, whose column shows the stored `modified_at` stamp; sorting and filtering fall back to `created_at` so a never-modified page still orders by its creation time. Tasks and Events also carry a plain-text `description` JSON field.

**A schema edit is not a page edit.** Renaming a property definition, changing its type, or reordering an assignment leaves every member page's `modified_at` untouched — the page didn't change, its schema did. Only a property's VALUE changing counts, alongside a text edit, a move, and a rename (→ `Pages.md`).

#### II. Where Properties Live

Definitions live in the nexus-wide registry (`.nexus/properties.json`) alongside a nexus-wide cosmetic display order; a Collection's sidecar holds only its assignment list, and the read walk joins the two so every surface still receives a resolved schema — the tree also carries the full ordered registry, so the pane lists everything live. The **Properties pane** in the toolbar's Settings dropdown is the full assign surface for a Collection: assigned properties on top (chevron → the per-property editor), an **All Properties** disclosure pinned to the pane's bottom that rises open to list every unassigned registry definition in the nexus order, each promotable via its `+` or by dragging into the assigned group at a slot. Dragging within a group reorders it (assigned = the Collection's order; All Properties = the nexus order); dragging an assigned row out Removes it. Creating (the `+` in the pane's pinned bottom row) mints into the registry — appending to the nexus order, seeding per-type options — and assigns here; renames (the editor header, or a row's right-click → inline rename), type changes, and option edits change the global definition for every assigner. Remove strips-and-caches (see Schema Mutations); the global **Delete lives only inside a property's own editor pane**, behind its ⋮ menu and a native confirm. **Display formats aren't definition config**: the per-type look and date/time formats persist per-VIEW in the SavedView's `column_styles` (a deliberate divergence from Swift's def-level format keys, which ride through definitions as inert foreign keys). The exception is **Number's format**, which is property-wide (def-level, like the checkbox colour and link config); only its look (Number/Bar) is per-view. The first surface for *setting values* is the table's cells (the gesture matrix → `TableView.md`); on a Page, the Page Preview's front-matter inspector (→ `PagePreview.md`) is the entity-level surface. The Page Property Panel is Pending.

### Architecture

#### II. Schema Mutations

| Mutation                   | Effect on existing values                                                                                                                                                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create a property          | Mints a nexus-wide definition (appending its id to the nexus order) and assigns it to the creating Collection; appears empty on every member — no member writes until a value is set.                                                                                                                                                  |
| Assign a property          | Adds this Collection's reference to an existing definition — idempotent, no name check — then restores any Remove-cache: each cached value that still conforms to the definition's current type and options writes back to the page that held it; non-conforming values drop per-value, and the cache block clears either way.         |
| Remove a property          | Caches each member's value (with which pages held it) on the Collection's own sidecar and unassigns, THEN strips the value from every member page — cache-before-strip, so a failure mid-strip is recoverable rather than lossy. A page carrying no `id` is stripped without a cache entry. Re-assigning restores what was cached; the definition and other Collections are untouched. |
| Rename a property          | Registry-only — members are keyed by ID; every assigner sees the new name.                                                                                                                                                                                                                                                             |
| Reorder properties         | Per-Collection assignment order (sidecar-only); the All Properties group reorders the nexus-wide display order instead (registry-file-only).                                                                                                                                                                                           |
| Change a property's type   | A global definition edit — a value whose shape no longer matches stops rendering but stays in frontmatter.                                                                                                                                                                                                                             |
| Delete a property (global) | A timestamped recovery snapshot of the definition and every value lands in `.trash`, then the value is stripped across every collection's pages and assignment lists, every Remove-cache block for it is purged (a cache without its definition is corrupt state), and the definition leaves the registry — nothing restorable in-app. |
| Edit options               | Global — adding, reordering, and recoloring are registry-only; renaming an option cascades its new value onto every assigning page's `$status` (value=title), and removing or clearing one strips that value from those pages.                                                                                                                                                                                                   |

Neither Remove nor the global delete is cross-file atomic: each is a per-file fan-out whose safety net is written first — the sidecar cache for Remove, the `.trash` snapshot for delete — so a partial run re-runs cleanly. Registry mutations serialize through one write chain, so overlapping edits never lose an update. Remove is the daily path; the global delete is the rare destructive one, reachable only inside the property's own editor pane behind a native confirm.

#### II. Validation

At every write: a created property's `name` is non-empty and its `id` is unique and not a reserved one. Select and Multi-select option titles must be unique within the property — there's no minimum count, so a zero-option Select is legal. **Names need not be unique** — definitions are ID-keyed, so twin names are mechanically safe on both create and rename (a deliberate quirk; the visible All Properties list makes accidental twins unlikely). Agenda's own definitions keep the unique-name rule. Assigning runs no name check — it's a reference to an existing definition, not a new one. Each member value's shape must match its schema entry's type.

#### II. Index

The SQLite `property_definitions` table mirrors the nexus-wide registry — one row per definition, keyed by id alone, no owner columns; Agenda's own definitions stay out of it. Each member's values mirror into its entity row as a JSON column. Nothing reads either yet: filter, sort, and group all run renderer-side over the frontmatter the walk already carries, so the mirror stages the shape a query facade would read. It's regeneratable — a schema-version bump drops and rebuilds it. Full data layer → `Architecture.md`.

### Pending

**Page Property Panel:** The surface for setting property values on a Page in the main pane, and on a Task or Event anywhere — a panel attached to the content. The Page Preview's front-matter inspector covers a Page inside the preview only; the main pane renders no property rows, and Agenda items have no value surface at all.

**Built-in Agenda Status:** The Status property Tasks and Events are meant to carry by construction — a seed on the config sidecar plus a delete guard that keeps it there. Neither exists: a fresh agenda config is written with no definitions, and the agenda delete removes any id handed to it.

**Lossy Change-Type Strip:** The cross-assigner value strip a lossy type change should trigger. `changeType` accepts the drop flag and ignores it, applying a plain global definition edit.

**Per-Type Editor Panes:** File is the one creatable type whose editor body is still blank. The Checkbox, Number, Select, Multi-Select, Status (grouped / flat option lists, add · recolor · reorder · drag, right-click Rename · Remove · Clear), URL, and Date & Time editors have shipped; File follows on their patterns.

**Number Show-as for dynamic views:** the completion **Ring** and the Notion-style Number/Bar/Ring tile grid belong to view types with vertical room (Gallery/Board) — the table ships the Number/Bar look row only. The bar's stroke is held pending a visual pass.

**Larger Color Picker:** option colors store an open solid-palette key (resolved through `chipColorFor` with a legacy read-map for old Notion values), so the ColorPicker's grid can grow into a much larger selector over the shared color tokens — reusable across every color-token consumer — with no schema churn. A future enhancement, not a limitation.

**Calendar Picker refinements:** the Date & Time value editor is live in table cells but pending — range values (a datetime value is a single ISO on disk, so the value picker disables the shared picker's range mode), keyboard stepping on the time segments, an in-app control for the `time_format` setting, and its own test coverage.

**Per-View Link Styling:** a URL property's look — display (full-URL ⇄ title), underline, colour — is entirely property-level today; a URL column has no per-view style. Letting a view override it (one view titles, another raw URLs, of the same property) is a prospect, not a limitation — the `column_styles` seam already carries per-view looks for the other types.

### Known Issues

**A checkbox's "Accent" reads neutral in the pane under a `system` accent:** the cell box and switch tint the true accent through `var(--accent)`, so they render correctly for any accent setting. The editor's colour *chip*, though, resolves through a palette key — and `system` (follow-the-OS) has no palette key, so it falls back to the neutral default chip. A palette-key accent (the default and every explicit choice) is unaffected, and only the settings chip shows the mismatch.

**A stray bare-string Multi-Select value reads as Select:** the read-side coercion that overrides a shape-vs-column type mismatch — a value's on-disk shape corrected to what its column actually declares — covers only the single-string kinds (URL / Select / Date). A Multi-Select value stored as a lone string rather than an array therefore stays classified as Select and drops out of grouping and filtering. Unreachable today (nothing writes that shape), but it goes live the moment the **Lossy Change-Type Strip** performs a Select→Multi-Select change; fix it there as a value migration (bare string → single-element array), not a coercion special-case.
