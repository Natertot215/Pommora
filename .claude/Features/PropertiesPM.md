## Properties


Pommora's property system. A **property** is a typed field defined once in the nexus-wide registry and filled in on the members of every Collection that assigns it. Three layers hold the system: a **definition** in `.nexus/properties.json` says what a property is — its type and per-type configuration; an **assignment** on a Collection's sidecar says which definitions that Collection carries and shows; a **value** in a Page's frontmatter says what one entity holds. A Space holds values for any registry property as bare keys on its sidecar, reconciled on write and on restore as a page's are. A definition, including its options, is a shared object everywhere it's assigned, so the same property means the same thing in every Collection, and genuinely divergent needs get a separate property.

### The Type Catalog

The twelve types are the type ids in `Core/Properties/properties.ts`; a value Pommora writes fresh is bare and natively typed, legible to any YAML tool. A definition names its type by the displayed name in camelCase — `multiSelect`, `link`, `dateTime`, `createdTime`, `lastEditedTime` — and the spellings earlier builds wrote (`multi_select`, `url`, `datetime`) still read, and are rewritten in `properties.json` when a Nexus opens.

| Type              | On-Disk Value                                                          | Notes                                                                                                   |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Text**          | `Notes: opus`, or `Notes: \|-` over indented lines                     | A free-typed string                                                                                     |
| **Number**        | `Count: 42`                                                            | Bare number                                                                                             |
| **Checkbox**      | `Done: true`                                                           | `true`, or the key absent                                                                               |
| **Date**          | `2026-06-15` (date-only) or `2026-06-15T14:30:00` (with time, no zone); a span as `2026-06-15/2026-06-18` | A bare date-only value folds into Date on read                                                          |
| **Select**        | `Stage:` over a one-element block sequence                             | A list holding one option; one colored chip. A list holding several reads as its last registered option |
| **Multi-select**  | `Tags:` over a block sequence                                          | Bare array; tag-style multi-pick                                                                        |
| **Status**        | `Status:` over a one-element block sequence                            | The option's own key, in a list of one; grouped by workflow phase. Resolves like Select                 |
| **Link**          | `Link: https://…` or `Link: "[[Page]]"`                                | A string — an address with a scheme, or a connection naming a page                                      |
| **Context**       | `<Context>:` at the root, over a block sequence of bare Space titles   | One column per registry Context, synthesized at runtime — never a schema definition                     |
| **Creation Time** | *(derived from the `ID` ULID's timestamp)*                         | Virtual — never persisted; a date for sort, filter, and display                                         |
| **Last Modified** | *(derived from the file's modification time)*                          | Virtual — never persisted; a date for sort, filter, and display                                         |
| **File**          | `Attachments:` over a block sequence of `[[Basename.ext]]`             | Array of wikilinks naming files by basename; files copy into the Nexus                                  |

### Identity & Values

Every property carries an identifier and two names. Its **`id`** is stable and never changes: user properties mint a `prop_<ulid>`, and built-ins use a reserved `_`-prefixed id (`_title`, `_created_at`, `_modified_at`, `_location`) that user properties can't claim. The id is the key in the registry, in a Collection's assignment list and restore cache, and in every saved view; member files never carry it. Its **`label`** is the name the app shows, and its **`key`** is the word a value is written under, bare and matched exactly, written from the label by the property's **Key Format**: `Match Title`, the default, makes the key the label, and `lowercase`, `UPPERCASE`, `kebab-case`, `PascalCase`, `camelCase`, `snake_case`, `Train-Case`, `UPPER_SNAKE_CASE`, and `UPPER-KEBAB-CASE` convert it. A key that differs from what the format would write, as in a hand-edited registry, stays the key until the next label or format change rewrites it. Both are trimmed and NFC-normalized once at write, and *Validation* holds what each may be. A label rename writes the key the format gives the new label and, where that key changes, cascades it across every page and Space holding the old key. A rename onto a taken label or key is refused. A rename or a Key Format change onto a key that pages or Spaces already hold adopts their values, as registering the key would, and is refused only where a file holds both the old and the new key, naming how many do.

A value is decoded against the type its definition declares (`Core/Properties/propertyValue.ts`): the key names the property, so the definition is in hand before the value is read, and a type is never inferred from a value's shape. Each type reads what other applications write: a Multi-Select adopts the members its Value Format could have produced, a Text reads any value as text, a Number reads a quoted or formatted number, and a Checkbox reads `true`/`false`, `yes`/`no`, `on`/`off`, and `y`/`n` in any casing. Three rules follow. **No value, no key** — setting a property to null or any empty value removes its key from the member file, so a member without a value never carries a placeholder; number `0` is a real value and stays, and unchecking a checkbox removes its key. **A key the registry doesn't name is foreign** — preserved by value and decoded by no property; registering a property under that key makes the values it already holds live at once. Keys and option words match exactly, whatever their quoting, so a key in another casing is foreign. **A write keeps the file's style** — it lands on the property's key, keeps a list's flow or block style and each unchanged value as written, and gives a changed string the quotes the file chose, never quotes YAML needed only for another value. A Multi-Select write keeps every word on the page that no option claims, after the options the write leaves picked, and emptying the property removes the key and those words with it.

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
aliases:
  - Obsidian
  - Task
```

### Property Types

Each type's definition-level configuration lives on the `propertyDefinition` schema; its per-view look lives on the view's `column_styles`. The editor frame for each type is a frame of the Property Frame.

#### Status

A workflow property whose options sort into **groups**. The group set is open — each group is a stable `id` with a user-editable label, a color, and its own options — seeded with three: `upcoming` (Open, grey), `in_progress` (Active, blue), `done` (Done, green). Every option references its group by id, so status semantics resolve by id rather than position, and further groups drop in with no data change. An option stores a `label`, shown in the app, and a `key`, the word written to disk, so a rename rewrites the key on every assigning page wherever the new label gives a different one; an option without its own color wears its group's. Sort is group position first, then option order within it.

The value renders as a pill in its group's color; the **Compact** style renders it icon-only — the option's own icon, or its group's glyph.

#### Checkbox

A boolean with two per-view looks and one property-wide color. The look is **Checkbox** (a rounded box) or **Switch** (a DualSwitch); toggling on writes `true` by default, or the checked word of the pair the file holds, and toggling off strips the key. The `checkbox_color` applies to the on state only — a checked box fills with it and a switch's on-track tints — while the off state stays neutral; an absent color follows the Nexus's Checkbox Color live. Cells, cards, and filter rows all draw the value in its color and the view's look.
#### Text

A Text property holds one free-typed string. It edits single-line wherever a value shows, in a one-line editor carrying the connection picker, and multi-line in **TextPane**, the dropdown a pen beside the value opens, where the text runs to many lines and takes bold, italic, highlights, text colors, code, and connections. At rest a value shows its first line with its connections live, so a `[[Page]]` written inside a sentence opens, glances, follows a rename, and reads as a phantom when its page is deleted, as a link in a page body does. Text filters with Link's operators and sorts alphabetically, both on the value as it shows — each connection read as its alias, else its title or `Page § Heading` — and like Link it doesn't group or seed a new page.

#### Number

A number with a **property-wide format** and a **per-view look**. The format — a family (Number, Percent, Currency), a currency code, thousands separators, decimal places, and a Fraction toggle rendering "N out of denominator" — is set once in the Number editor and applies everywhere. Percent stores the literal value and appends the sign, keeping the file legible. The look is **Number** (formatted text) or **Bar**, a progress bar filling against a muted track.

#### Date & Time

A single ISO value: a date-only string folds into Date on read, a with-time string carries the clock, and an ISO interval `start/end` holds a span whose ends share the clock setting. Its formats are per-view — a Date format (numeric, worded, or Relative), a weekday offered with the worded formats, and a Time — and a view column follows the Nexus's own **Date Format** and **Time Format** until it picks its own; picking the Nexus's form or clock again returns it to following. A cell opens the CalendarPicker, a calendar grid plus a time editor of hour, minute, and AM/PM parts; its **End Date** switch unfolds a second date and time for the span's end, picked on the same grid. A span shows as its start → its end, and sorts and groups by its start.

#### Select & Multi-Select

Select stores a one-element list and renders one colored tag chip; Multi-Select stores a list and renders several. A **Value Format**, offering the Key Format's ten choices, writes each option's key from its label for Select, Status, and Multi-Select alone. The three option types read one shape — a list, with a bare scalar read as a list of one: Select and Status keep the last element whose word is a registered option's key, read as that option's label (an unregistered one reads as no value; removing that option from the property reveals the registered one before it), Multi-Select keeps each such element once, reading it as that option's label and leaving any other word on the page unread. A Multi-Select member a Space or a page of an assigning Collection holds that its definition doesn't list is registered as an option, its word becoming the option's key and label, provided the Value Format could have produced it and no option's label or key matches it without regard to case, when the file changes or comes into reach, when the property is assigned to the page's Collection, the registry gains its key, or its Key Format or Value Format changes, and for every file once the Nexus opens.

The option editor is an inline list under a Style toggle, grouped under labeled headings where the type has groups, with double-click on a heading to relabel its group: a `+` per list or group, a hover square-pen opening the per-option editor — icon and title fields over the color grid over an **Appearance** toggle (**Filled**, the tinted default, or **Clear**, which drops the fill and keeps the tinted border and label) — drag to reorder within or across groups, and a right-click **Style ▸ · Edit Option · Clear · Remove** menu, where Style sets the view's look, Edit Option opens the same per-option editor, and Clear asks first, naming the Items holding the option, and skips the question when none holds it, while Remove always asks, naming them. The **Compact** style renders each chip icon-only — the option's own icon or the property type's default.

#### Link

A Link property renders each value as a clickable link and holds either an address or a connection. Its look is set on the property and applies everywhere, though a view's column may read its links differently: a **Format** of Full Link, Short Link, or Page Title; **Underline** on or off; and a **Color** picked from the ramp, defaulting to the External Link Color. A per-value alias, set through Rename or carried in by a pasted label and stored as `[[Page|alias]]` for a page and `[alias](url)` for an address, overrides the format for that one link. Page Title is the only format that reaches the network — the page's `<title>` is fetched once per address and cached per machine, showing the bare domain while it loads.

A value written as a connection or a markdown link is a page when a page has that title, stored as a wikilink wherever one can spell it, under the page's own capitalization with any alias carried through, on an edit and a Rename alike, and an alias the value shows is remembered by the page unless the value names a heading; a title two pages share is refused. Otherwise a bare or markdown-written value is an address when it's a valid one, so `[x](example.com)` commits as that address, and anything else is refused at commit. `[[#Heading]]` commits on a page, naming a heading of the page that holds it. A page value then reads as every connection does — the shared connection tones, `Page § Heading`, the glance, and a click that opens it where connections open — and the three link formats don't apply. Renaming a page rewrites the connections held in frontmatter alongside those in bodies, and deleting one removes them permanently unless **Restore Links On Deletion** is toggled on, which then restores the deleted page into pages that previously targeted it.

#### File

A File property holds an ordered list of files that live in the Nexus, each named by a wikilink over its basename:

```yaml
Attachments:
  - "[[Q3 Report.pdf]]"
  - "[[Floorplan.png]]"
```

The name is the whole reference; no path is stored. It resolves against an in-memory basename index the file watcher keeps current (`Core/Assets/assetMap.ts`), which is what lets the asset directory be re-pointed or a file be moved within it without a value going stale. A name that answers to no file still renders, dimmed, so it can be removed. Each value renders as a **file chip** — the file type's glyph and its name — and the cell clips and scrolls when the run outgrows the column.

The property-wide **Directory** is the folder its files land in, stored relative to the asset root so re-pointing the root carries it along; unset means the root itself. Filling a value opens the operating system's file dialog: clicking a chip replaces the file it names, clicking the value's own area adds one, and a right-click offers **Add File · Replace File · Remove File**. The file is copied into the Nexus before the reference is written, stepping a colliding name aside and skipping the copy when the bytes already match; removing a value drops the reference and leaves the bytes.

#### Context

Context links are the relation layer. They are stored as `<Title>` keys at the entity root, over a block sequence of bare Space titles, in a page's frontmatter, and at the root of `_space.json`, alike. They are never schema definitions: each registry Context resolves to one column at runtime, alongside the assigned schema rather than inside it.

### Auto-Managed Properties

Every Page carries the id key (`ID`, holding a kind-marked ULID assigned at creation), maintained by Pommora and not user-creatable, and may carry `banner:`, which assigns its banner. **Creation Time** and **Last Modified** are never written: the first is the instant the `ID` ULID encodes, the second is the file's modification time as the filesystem reports it. A write the user makes to the page moves Last Modified — a value edit or a text edit — while a rename, a move, and a schema edit that rewrites the page for a reason of its own leave it where it was.

```yaml
ID:
banner:
```

### Shared Mechanisms

What holds across every type: the assign surface, the mutations and their safety, validation, and the label vocabulary.

**The Property Frame:** The Properties frame of the toolbar's Settings menu (`Core/Properties/Schema/PropertyFrame.tsx`) is the assign surface for a Collection: the assigned properties on top, each opening its per-type editor, and an **All Properties** disclosure pinned to the bottom listing every unassigned registry definition in the nexus order, each promotable by its `+` or by dragging into the assigned group. Dragging within a group reorders it — the Collection's order above, the nexus order below — dragging an assigned row out removes it, and a release outside the frame writes nothing. The frame's `+` creates: it mints into the registry, seeds per-type options, assigns here, and opens the new property's editor. Renames, format changes, and option edits change the global definition for every assigner. A property's editor opens with its **Label Format** row, which sets its Key Format, and, for a Select, Status, or Multi-Select, its **Value Format** row, divided from the type's own settings below. The global Delete lives only inside a property's own editor frame, behind its ⋮ menu and a confirmation naming the Items holding the property.

**The Value Picker:** Where the Property Frame assigns the schema, setting a member's value runs through one control (`Core/Properties/Pickers/PropertyPicker.tsx`) across every surface that assigns one — the page window's SidePane, the Properties panel, and the Cards and Table views. It renders the popup each type needs: option rows for Select, Status, Multi-Select, and Context; a calendar for Date; a file field for File; and it can open on a chooser pane that adds a property and drills straight into its value. Every option list scrolls inside a fixed-height pane, and a Status lists its groups apart behind dividers. A Select, Multi-Select, or Status list also edits its options in place: its rows drag to reorder the property's options, a Status's within their own group; a row's right-click offers the option editor's menu without Clear and Remove, and without Style where no view is in hand; and beneath a Select or Multi-Select list, a `+` names a new option, added at the end and left unassigned. A number keeps the shared text field, a Link value and a Text value's single line open the one-line editor, and a Text value's pen opens TextPane. The Properties panel (`Core/Properties/PropertyPanel.tsx`) is the value surface itself: a page's or a Space's shown Contexts and properties as menu rows, each row's value opening the picker, and the row's own menu editing a Text value in place, clearing the value, or removing the row. A Text value's right-click on every surface reads **Edit · Clear · Remove**, where Edit opens the same inline field a click does and a table, having no per-cell Remove, stops at Clear.

**The Properties Panel:** One panel (`Core/Properties/PropertyPanel.tsx`) is the body of a page's settings dropdown, a Space's settings dropdown, and the page window's SidePane. It holds two groups, Contexts and Properties, each under a heading whose `+` appears on hover and opens that group's chooser; an empty group shows its Add row in place. A page's panel ends, past a divider, with its Aliases row, described in [[ConnectionsPM]]; a Space's has none. A row shows once it holds a value or was added in the session, and a page reads its Collection's properties where a Space reads the whole registry. Rows drag within their group: a page's Context order is nexus-wide and separate from the sidebar's, its property order is its Collection's schema order, and a Space keeps its own order under `$order` on its sidecar. ⌘Z reverses a value, a link, and a reorder alike.

**The Properties Menu.** Any full page menu — a sidebar page row, a view row's title cell, a card, a Matrix node — carries **Spaces ▸** and **Properties ▸** branches that enable quick management of contexts and properties. The first lists the nexus Contexts in registry order; the second lists the Collection's assigned properties, skipping the auto-managed stamps. A row whose type offers a fixed set expands into it with the page's standing values checked — the options for Select, Status, Multi-Select, and Context, a Status's groups apart behind dividers, with **Check** and **Uncheck** for a Checkbox. Non-option properties stay leaves; File opens the operating system's file dialog, with Number, Link, and Date opening their pickers and Text its TextPane, anchored where the menu originates. 

**Schema Mutations:** The registry mutations live in `Core/Properties/registryProperty.ts` and its siblings; their entry points queue on one lock on the `.nexus` folder, which quitting waits on, and every operation that writes both the registry and pages states its intent in a journal first so a crash replays forward on the next open, and the Try Again a property rename, a format change, a property delete, an option rename, or an option removal offers replays what that property still owes at once, an option removal offering it only while the journal holds its record.

| Mutation | Effect on Existing Values |
| --- | --- |
| Create a property | Mints a nexus-wide definition and assigns it to the creating Collection; appears empty on every member, with no member writes until a value is set. |
| Assign a property | Adds this Collection's reference to an existing definition, then restores any cached values that still conform to the definition's current type and options; a cached Link naming a page gone leaves the cache, joining that page's Trash bundle when it sits there. |
| Remove a property | Caches each member's value on the Collection's own sidecar (`property_cache`) beside any the cache already holds, unassigns, and clears the property from the Collection's views, its Sets' views, and the View Tiles showing them, then strips the value from every member page — cache before strip, so a failure mid-strip never loses anything. A member without an ID, like a copy sharing another member's ID, keeps its own value. Re-assigning restores the cache. |
| Rename a property | Commits the registry, then sweeps every page and Space holding the old key to the key the Key Format gives the new label. Never re-dates a page; assignment lists are id-keyed and unaffected. Files the sweep skipped are reported with Try Again. |
| Change a format | Renames the property's key (Key Format) or every option's key (Value Format) on every page and Space holding it, with a Value Format change rewriting the Collection value caches alongside, asking first, naming the Items it rewrites, when it rewrites more than one. Saved views, View Tiles, and the Matrix filter name options by label and stay as they are. A Value Format change is refused when it would give two options one key or give an option a key another option holds before the change, and it is refused while another journal record is owed, pointing to Try Again. Files the sweep skipped are reported with Try Again. |
| Reorder properties | Per-Collection assignment order on the sidecar; the All Properties group reorders the nexus-wide display order in the registry. |
| Delete a property (global) | A record — the definition, the Collections that assigned it, and every value keyed by its holder's id, and each Collection's cached values — lands in `.trash` before anything is destroyed, then the value is stripped everywhere, every cache block is purged, the saved views, View Tiles, and the Matrix filter drop what named it, and the definition leaves the registry. Restorable from the Trash pane or the notification's Undo; when a file couldn't be updated, the label offers Try Again and the undo chord keeps Undo. |
| Edit options | Global — adding, reordering, and recoloring are registry-only; renaming an option rewrites its key, where the new label gives a different one, on every page, Space, and Collection value cache holding it, and its label in every saved view, View Tile, and the Matrix filter naming it; removing one strips its key from the pages, Spaces, and caches and drops a filter rule left with nothing to match. A rename or removal is refused while another record is owed, and a Clear while its own property's is, each pointing to Try Again; files the sweep skipped are reported with Try Again. |

Neither Remove nor the global delete is cross-file atomic; each is a per-file fan-out whose safety net is written first and which re-runs cleanly after a partial run. Remove is the daily path; the global delete is the rare destructive one.

**Repairs:** Every governed write runs one reconcile over the file's root (`reconcileGovernedRoot` in `Core/Contexts/contextResolve.ts`) before it lands: an assigned property's value is re-encoded as its definition reads it — a scalar option becomes a one-element list — keeping each value as the file gives it. A list naming one option or Space more than once is written with it once. Apart from a member it collapses, the reconcile removes nothing: a checkbox `false`, an emptied value, and a value naming no Space stay as written, and a Trash restore alone drops them. Files that changed while the app was closed are reached by the on-open sweep behind **Repair Properties On Open**: the index seed already knows which pages it re-read, and the sweep runs the same reconcile over exactly those, behind the window rather than before it, writing only where a value moved and pushing the containers it touched.

**Validation:** A property's label and key are each non-empty and unique nexus-wide (compared case-folded, since Obsidian reads two keys that differ only in case as one property), and may not start with `$`, which is reserved for system roles, or with `<`, which marks a Context key; neither may be a name Pommora keeps for itself on a page or a sidecar (`ID`, `banner`, `heading_icon_hidden`) in any casing, nor a name every object already answers to (`constructor`, `toString`) in its exact spelling, so a format change that would give the key one is refused, as is one that converts a label to an empty key; a leading `_` is allowed. A definition a hand-edited registry holds under a refused label or key, or under a label or key an earlier definition holds in another casing, stays in the file and reaches no reader; two options whose labels or keys fold alike read as the first, and the second leaves the file on that property's next option edit. A create under a taken label or key steps aside with a numbered suffix, as any create does, while a rename onto one is refused. Option labels and keys are each non-empty and unique within their property, compared without regard to case, a Status's options are checked at create as a Select's are, a Status group's label is non-empty, and a zero-option Select is legal.

**Labels:** A value renders as a label — a chip whose shape names the property's kind: a pill for Status, a tag for the other options. The label vocabulary is the design system's.

---

#### Pending

- **Number looks for other views** — the completion Ring and the Number / Bar / Ring tile grid belong to view types with vertical room; the table ships Number and Bar.
- **Calendar Picker** — range values, keyboard stepping on the time parts.
- **Per-view link styling** — a Link property's look is property-level; letting a view override it is a prospect the `column_styles` seam already allows for.
