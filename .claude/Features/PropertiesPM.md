## Properties

```
Properties
├── The Type Catalog
├── Identity & Name
├── Value Shapes
├── Property Types
│   ├── II. Status
│   ├── II. Checkbox
│   ├── II. Number
│   ├── II. Date & Time
│   ├── II. Select & Multi-Select
│   ├── II. Links & URL
│   └── II. Context Links
├── Auto-Managed Properties
├── Where Properties Live
│   └── The Properties Pane
├── Schema Mutations
├── Validation
├── The Index
├── Chip Tokens
│   ├── II. Shapes
│   ├── II. The Recipe & Variants
│   └── II. Knobs
├── Known Issues
└── Pending
```

Pommora's property system. A **property** is a typed field defined once in the nexus-wide registry and populated on the members of every Collection that assigns it — the registry declares each property's type and per-type config, a Collection's assignment list names which registry properties its Pages validate and show, and member entities store the values. The same type catalog applies to Pages, Tasks, and Events; Agenda's kinds are modeled to keep their own definitions on their config sidecars, though a seeded config carries identity only until the Agenda rethink builds that schema.

| Scope               | Definitions                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| Nexus-wide registry | `.nexus/properties.json` → `propId → definition`                                                         |
| Page Collection     | `<Collection>/_pagecollection.json` → `properties[]` (assigned registry ids)                             |
| Task                | `<Tasks>/_taskconfig.json` → `property_definitions[]` (own defs — separate from the registry; unbuilt)   |
| Event               | `<Events>/_eventconfig.json` → `property_definitions[]` (own defs — separate from the registry; unbuilt) |

A Page's values are wrapped title keys at its frontmatter root; a Task's or Event's are the same wrapped keys at its JSON root, resolved against that kind's own `property_definitions`. Page Sets carry no schema of their own and inherit the Collection's. A definition — options included — is one shared object everywhere it's assigned; genuinely divergent needs get a separate property.

### The Type Catalog

| Type                  | On-Disk Value                                                           | Notes                                                                                |
| --------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Number**            | `<Count>: 42`                                                           | Bare number. |
| **Checkbox**          | `<Done>: true`                                                          | Bare boolean.                                                                        |
| **Date**              | `"2026-06-15"` (date-only, UTC) or `"2026-06-15T14:30:00Z"` (with time) | A bare date-only value folds into Date on read.                                      |
| **Select**            | `<Stage>: Active`                                                       | Bare string; one colored chip.                                                       |
| **Multi-select**      | `<Tags>:` over a block sequence                                         | Bare array; tag-style multi-pick.                                                    |
| **Status**            | `<Status>: Complete`                                                    | Bare label — the option's own value; grouped by workflow phase.                      |
| **URL**               | `<Link>: https://…` or `<Link>: [[Page]]`                               | A string — an address with a scheme, or a connection naming a page.                  |
| **Context**           | `(Context):` at the root, over a block sequence of bare Space titles    | One column per registry Context, synthesized at runtime — never a schema definition. |
| **Last Edited Time**  | *(derived from `modified_at`)*                                          | Virtual — never persisted.                                                           |
| **File / Attachment** | `[{ "path", "original_name", "added_at", "mime_type" }, ...]`           | Array; files copy into the Nexus.                                                    |

### Identity & Name

Every property carries two independent identifiers:

- **`id`** — a stable identity, never changing. User properties mint a `prop_<ulid>`; built-ins use a reserved `_`-prefixed id. This is the key used in `.nexus/properties.json`, in a Collection's assignment list and its remove-cache, and in every SavedView config. Member files never carry it.
- **`name`** — the key a value writes under, unique nexus-wide, folded for case, trimmed and NFC-normalized once at write. A rename is instant and cascades — the registry commits first, then one sweep rewrites the key on every page holding it, with the new key winning wherever both appear. A rename onto a taken title is refused rather than disambiguated.

Reserved property ids (`_id`, `_title`, `_created_at`, `_modified_at`, `_location`) are blocked from user properties. The page `cover` is a root frontmatter field, not a property, and never appears in any properties UI.

### Value Shapes

A value is decoded against the type its definition declares — the key names the property, so the definition is in hand before the value is read, and nothing is inferred from a value's shape. Values are bare and natively typed: a number is a number, a checkbox a boolean, a date a timestamp, each legible to any YAML tool.

- **No value, no key.** Setting a property to null, or to any empty value, clears its key from the member file — a member without a value never carries a placeholder, and the rule reaches the Remove-cache the same way. Checkbox false and number zero are real values and stay.
- **An unmatched wrapped key persists inert.** A key naming no registry entry is preserved by value and read by nothing.

Here's an example of how the frontmatter page with both Pommora-managed and externally-applied frontmatter would appear:

```yaml
(Projects):
  - Pommora
<Tags>:
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

#### II. Status

A workflow property whose values sort into status **groups**. The group model is open — each group is a stable `id` with a user-editable label, a color, and its own options — seeded with three calendar-phase defaults:

| Group         | Default Label | Default Color |
| ------------- | ------------- | ------------- |
| `upcoming`    | Open          | grey          |
| `in_progress` | Active        | blue          |
| `done`        | Done          | green         |

Every value references its group by id, and the status semantics resolve by id rather than list position; further groups drop into the open enum with no data change. An option's `value` is its label — renaming rewrites both and cascades onto every assigning page. An option without its own color wears its group's. Sort is group position first, then option order within it. Status is opt-in on a Collection like any other property.

The **Status editor** edits it in place — a group-labeled option list (double-click a heading to relabel its group), each option a pill chip in its group's color, a per-group `+` for an inline-named option, a hover palette to recolor, drag to reorder within or across groups, and a right-click **Rename · Remove · Clear** menu.

#### II. Checkbox

A boolean with two per-view looks and one property-wide color. The **look** (`column_styles`) is **Checkbox** (a rounded box) or **Switch** (the Figma switch) — toggling one on assigns `true` in place, toggling off strips the key. The **color** (def-level `checkbox_color`) applies to the ON state only: a checked box fills with it and a switch's on-track tints, while an empty box and an off switch stay neutral grey. An absent color follows the nexus-configured accent live. The **Checkbox editor** pane pairs a color control (a nameless swatch wearing the Switch's own shell, opening the recolor picker) with a Style picker (Checkbox ⇄ Switch, the shared double-chevron control). Its picker withholds the greyscale row, whose dark end is the window substrate itself.

#### II. Number

A bare number on disk with a **property-wide** format and a **per-view** look. The format — a family (Number, Percent, Currency), a currency code, thousands separators, decimal places, and a Fraction toggle rendering "N out of Value" — is set once and applies everywhere. Percent stores the literal value and appends the sign, keeping the file legible.

The **look** is per-view — **Number** (formatted text) or **Bar**, a progress bar filling against a muted track. The editor exposes the format as a single section whose conditional rows are revealed on disclosure, with the Style row appearing only when the config makes a bar meaningful.

#### II. Date & Time

Stores a single ISO value — a date-only string folds into Date on read, a with-time string carries the clock. Its **formats** are per-view: a Date format (numeric, worded, or Relative), a conditional weekday offered only for the worded formats, and a Time. A cell opens the **CalendarPicker**, a calendar grid plus segmented time editor whose clock follows the Nexus's own **timeFormat** (→ [[ConfigurationPM]] §General). A view that names no Date format takes the Nexus's **dateFormat**, so an unconfigured column follows the Nexus rather than a constant. The editor pane exposes the same formats as one discoverable section.

#### II. Select & Multi-Select

Select stores a bare string and renders one colored chip; Multi-Select stores a bare array and renders several. Both draw from a shared option list on the definition — an option's `value` is its label, so renaming rewrites both and cascades onto every assigning page. The **option editor** is an inline list of chips: a per-list `+` adds an inline-named option, a hover palette recolors, drag reorders, and a right-click offers **Rename · Remove · Clear**; creating the property seeds one starter option. Neither carries a per-view Style — their chips always take the squared label shape, the pill being Status's alone.

#### II. Links & URL

A URL property renders each value as a clickable link, opened through the sanctioned IPC. Its look is set on the property and applies everywhere, though a view's column may read its links differently — the column style carries the same three forms, and a column that names none takes the property's:

- **Format** — one of the three link formats: **Full Link** the whole address, **Short Link** its bare domain, **Page Title** the site's fetched title.
- **Underline** — on or off.
- **Color** — the link color, a palette key chosen from the chip beside it (Default = the app accent), which also themes the editor pane's own controls.

A per-value **alias** (right-click → Rename, stored markdown-native as `[alias](url)`) overrides the format for a single link. Page Title is the only format that reaches the network: the page `<title>` is fetched once per URL and cached per-machine in `nexus.db`, showing the bare domain while it loads or if it never arrives. Sorting and filtering read the raw address regardless of the chosen format, so a column's order never moves when its look does.

A URL property also holds a **connection**. Pasting `[[Title]]` — what Copy Link puts on the clipboard — or a markdown link whose target names a page stores the value as the same `[[Title]]` connection every other surface writes, under the page's own capitalization, with any alias carried through as `[[Title|alias]]`. The cell then reads as a connection: the connection color, and a click that opens the page (⌘-click in a new tab) rather than a browser. The three link formats are address concepts and don't apply to it — a connection shows the page it names, or its alias. A title no page answers to is not a link: the field ghosts it and the commit is refused, exactly as a malformed address is. Renaming a page rewrites the connections held in frontmatter alongside those in page bodies, so a Link property never comes to name a page that has moved on.

A filled link value right-clicks to the **link menu** rather than a cell menu of its own — the same menu the editor pops on the same link (→ [[ConnectionsPM]]), so what a link offers doesn't depend on where it was found. A connection opens on Open Preview · Open New Tab and closes on Copy Link · Copy Path; an address opens on Open Preview · Open Browser · Copy Link. Both carry the authoring pair, and both end on **Clear** where the editor's ends on Remove Link · Delete, a value being the thing a property surface can act on. On an inspector row the split is the point: the value's menu clears the link, and **Remove** stays on the property itself, reached by right-clicking the row rather than the value it holds. A card's menu keeps the Remove that drops the property from the view, the card having no separate property to address.

#### II. Context Links

Context links are the only relation-type connection. They store as **parenthesized title keys at the entity root**, over a block sequence of bare Space titles:

```yaml
(Projects):
  - Pommora
  - Website
```

In a Task, an Event, or a `_space.json` the same key rides the JSON root, quoted there because JSON quotes every key. They're never schema definitions — each registry Context resolves to one column at runtime, alongside the assigned schema rather than inside it, and every entry carries an ordinary minted ULID.

### Auto-Managed Properties

Every Page, Task, and Event carries its kind's id key (`PageID` / `TaskID` / `EventID`, holding a ULID assigned at creation), `created_at`, and `modified_at` — maintained by Pommora, not user-creatable. It surfaces as **Last Edited Time**, whose column shows the stored `modified_at` stamp; sorting and filtering fall back to `created_at` for a never-modified page. Additionally, pages may carry a `cover` property used for storing their banners.

**A schema edit is not a page edit.** Renaming a property definition, changing its type, or reordering an assignment leaves every member page's `modified_at` untouched. Only a property's value change counts, along with a text edit, a move, and a rename.

```yaml
PageID:
created_at:
modified_at:
cover:
```

### Where Properties Live

Three layers hold the system: a **definition** (the nexus-wide registry, `.nexus/properties.json`, alongside a nexus-wide cosmetic display order) says what a property is; an **assignment** (a Collection's sidecar) says which definitions that Collection carries; a **value** (a Page's frontmatter) says what one entity holds. The read walk joins definition to assignment so every surface receives a resolved schema, and the tree carries the full ordered registry. Of the three, the definition is the only layer the storage line permits moving into the database.

**Display formats aren't definition config.** The per-type look and date/time formats persist per-view in the SavedView's `column_styles` — how a value renders is the view's call. The exception is Number's format, which is property-wide like the checkbox color and link config; only its look (Number/Bar) is per-view.

The first surface for setting values is the table's cells; on a Page, the entity-level surfaces are the Page Preview's front-matter inspector, and the Properties leaf of a Page's own Settings dropdown.

#### The Properties Pane

The pane in the toolbar's Settings dropdown is the full assign surface for a Collection — assigned properties on top (chevron → the per-property editor), and an **All Properties** disclosure pinned to the pane's bottom that rises open to list every unassigned registry definition in the nexus order, each promotable via its `+` or by dragging into the assigned group at a slot. Dragging within a group reorders it (assigned = the Collection's order; All Properties = the nexus order); dragging an assigned row out removes it. Creating (the `+` in the pane's pinned bottom row) mints into the registry — appending to the nexus order, seeding per-type options — and assigns here. Renames, type changes, and option edits change the global definition for every assigner. The global **Delete lives only inside a property's own editor pane**, behind its ⋮ menu and a native confirm.

### Schema Mutations
| Mutation                   | Effect on Existing Values                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create a property          | Mints a nexus-wide definition (appending its id to the nexus order) and assigns it to the creating Collection; appears empty on every member — no member writes until a value is set.                                                                                                                                                                                                                                                                                                   |
| Assign a property          | Adds this Collection's reference to an existing definition — idempotent, no name check — then restores any Remove-cache: each cached value that still conforms to the definition's current type and options writes back to the page that held it. What can't restore — a non-conforming value, a vanished page — stays cached, and the block clears only when nothing remains.                                                                                                          |
| Remove a property          | Caches each member's value (with which pages held it) on the Collection's own sidecar and unassigns, then strips the value from every member page — cache-before-strip, recoverable rather than lossy mid-strip. Re-assigning restores what was cached; the definition and other Collections are untouched.                                                                                                                                                                             |
| Rename a property          | Commits the registry, then sweeps every page holding the old key in one pass. The sweep never re-dates a page. Collections are untouched — the assignment list and the remove-cache are id-keyed and rename-immune.                                                                                                                                                                                                                                                                     |
| Reorder properties         | Per-Collection assignment order (sidecar-only); the All Properties group reorders the nexus-wide display order instead (registry-file-only).                                                                                                                                                                                                                                                                                                                                            |
| Change a property's type   | A global definition edit — a value whose shape no longer matches stops rendering but stays in frontmatter.                                                                                                                                                                                                                                                                                                                                                                              |
| Delete a property (global) | A record — the definition, the Collections that assigned it, and every value keyed by page id — lands in `.trash` as an artifact-less bundle before anything is destroyed, then the value is stripped across every collection's pages and assignment lists, every Remove-cache block for it is purged, and the definition leaves the registry. **Restorable:** the definition re-enters, its Collections get it back, and each value returns if it still validates → [[NexusRecordPM]]. |
| Edit options               | Global — adding, reordering, and recoloring are registry-only; renaming an option rewrites its stored label on every assigning page, and removing or clearing one strips that value from those pages.                                                                                                                                                                                                                                                                                   |

Neither Remove nor the global delete is cross-file atomic — each is a per-file fan-out whose safety net is written first (the sidecar cache for Remove, the `.trash` pair for delete), re-running cleanly after a partial run. The nexus-wide fan-outs — the rename sweep, the option cascades, and the global delete's snapshot and strip — open only the pages the content index says hold the key, intersected with the Collection folders whose schemas govern values, and fall back to reading the governed corpus when no index answers; each rewrite still confirms the key on the page it opens, so a stale row costs one wasted read, never a wrong rewrite. Registry mutations serialize through one write chain. Remove is the daily path; the global delete is the rare destructive one.

**The cascade journal.** Every operation that writes to both the registry and pages — the rename, the global delete, an option rename, an option removal — states its intent in `.nexus/property-cascade.json` before the work and deletes it after, the property side's sibling of the Contexts layer's pending-rename journal. The record carries intent, never a snapshot: the operation‘s identity, the names or values it moves, nothing else. At the next open, a surviving record replays — the sweep re-derives its targets from current disk through the same key-holder query the live op uses, acts only on the state the record exactly maps (identity-checked by id), and discards itself on any state it no longer describes, so a crash mid-cascade forward-completes instead of stranding half the pages against the registry. A holder the sweep cannot read holds the record for the next open rather than being silently dropped, and a record left by a faulted session is never displaced or cleared by a later op — only its own settle or the replay disposes of it. The pages-only ops — Remove, and clearing an option's values — carry no record: they leave nothing that disagrees with anything, and their safety nets are their own.

### Validation

At every write, a created property's `name` is non-empty and its `id` is unique and not reserved. Select and Multi-select option titles must be unique within the property; there's no minimum count, and a zero-option Select is legal. **Names are unique nexus-wide**, compared case-folded, because the name is the on-disk key. A leading `$` is refused, reserving `$`-prefixed keys for system-assigned roles; a leading `_` is allowed, since the wrap is the namespace boundary. Agenda's own definitions keep their own unique-name rule over their own namespace. Assigning runs no name check — it references an existing definition. Each member value's shape must match its schema entry's type.

### The Index

**The sigil governs; the registry registers.** A wrapped key is Pommora's — sweepable, and distinguishable from foreign frontmatter. A key registers as a live value only when its name matches a definition, so resolution runs definition-first: the schema supplies the key, and the frontmatter is read at it. Context keys resolve at walk assembly; property values load when a container opens, each container building one id→definition index.

### Chip Tokens

The chip is the property value's rendered form, so its design vocabulary lives here. One tint recipe drives every color — the picked cell at fixed tint steps (a heavier fill, a lighter stroke, a near-white text wash carrying a faint tint of the base) — and it composes with any shape. The color itself comes from the ramp, whose rows run a family from dark to light; the greyscale row is the one exception, tinting its brightest cells from a darkened base and outlining all eight against the label ramp so they read on any surface.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/chip.css.ts` · `tokens/tint.ts` · `tokens/colorMap.ts` · `tokens/ramp.ts`

#### II. Shapes
| Title | Token | Value |
| --- | --- | --- |
| Base | `chipBase` | zoom `var(--chip-zoom, 1.0)` · gap `4px` · type `text.control.semibold` |
| Pill | `chipPill` | h `20px` · pad `0 var(--chip-pad-x, 6px)` · radius `10px` · border `2px` |
| Label | `chipLabel` | h `20px` · same pad · radius `6px` · border `2px` |
| Context | `chipContext` | h `22px` · `--chip-pad-x: 8px` · neutral fill, color on border and text |
| Capsule | `chipCapsule` | h `20px` · pad `0 var(--chip-capsule-pad-x, 6px)` · radius `10px` · gap `0` |
| Box | `chipBox` | `17px × 17px` · radius `5.5px` · border `1.5px` (the checkbox look) |

#### II. The Recipe & Variants
| Title | Token | Value |
| --- | --- | --- |
| Background | `tint(base).background` | base @ tint-primary (60%) |
| Border | `tint(base).borderColor` | base @ tint-secondary (40%) |
| Text | `tint(base).color` | base @ 15% mixed toward label-primary |
| Variants | `chipColor.*` | the 64 ramp cells + `default` (`grey-4`'s value) + `accent` (`--system-accent`) |
| Palette Accessor | `chipColorFor(color)` | the cell when it's one, a legacy solid name normalized to its anchor cell, else `default` |

#### II. Knobs
| Title | Token | Value |
| --- | --- | --- |
| Zoom | `--chip-zoom` | fallback `1.0`; Cards retunes `0.85` |
| Pad X | `--chip-pad-x` | fallback `6px`; Cards `4px`, the option editor its own |
| Capsule Pad X | `--chip-capsule-pad-x` | fallback `6px` |
| Label Cap | `--chip-max` | fallback `80px` |
| Fill / Accent Channels | `--chip-fill` / `--chip-accent` | set by the variant — base @ 60% / the raw base |

The remove-× melt (the hover-revealed remove zone, the crisp and blurred label twins, the mask ramps) is chip machinery in the same file; its guards — static masks, opacity-only transitions, a pointer-inert label — protect against a Chromium repaint defect and stay as written.

### Known Issues

- **A stray bare-string Multi-Select value reads as Select.** The read-side coercion for shape-vs-column mismatches handles only the single-string types (URL / Select / Date), so a Multi-Select value stored as a lone string remains classified as Select and drops out of grouping and filtering. Unreachable while nothing writes that shape; it goes live when the Lossy Change-Type Strip performs a Select→Multi-Select change — fix it there as a value migration (bare string → single-element array).

### Pending

- **Page Property Panel** — the surface for setting property values on a Page in the main pane, and on a Task or Event anywhere. The Page Preview's front-matter inspector covers a Page inside the preview only; the main pane renders no property rows, and Agenda items have no value surface at all.
- **Built-in Agenda Status** — the Status property Tasks and Events are meant to carry — a seed plus a delete guard that keeps it there. Neither exists, and neither does an agenda schema to hold them; a seeded config carries identity only.
- **Lossy Change-Type Strip** — the cross-assigner value strip a lossy type change should trigger. `changeType` accepts the drop flag and ignores it, applying a plain global definition edit.
- **Per-Type Editor Panes** — File is the one creatable type whose editor body is blank; it follows the shipped panes' patterns.
- **Number Show-as for dynamic views** — the completion **Ring** and the Notion-style Number/Bar/Ring tile grid belong to view types with vertical room (Gallery/Board); the table ships the Number/Bar look row only. The bar's stroke is held pending a visual pass.
- **Calendar Picker refinements** — range values (a datetime value is a single ISO on disk, so the value picker disables the shared picker's range mode), keyboard stepping on the time segments, and test coverage.
- **Per-View Link Styling** — a URL property's look is entirely property-level. Letting a view override it is a prospect; the `column_styles` seam already carries per-view looks for the other types.
