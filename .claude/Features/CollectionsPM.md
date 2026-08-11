## Page Collections
```
Page Collections
├── Sidecar + Schema
├── Collection Settings
├── Open-In Mode
├── Move Semantics
├── On-Disk Layout
└── CRUD
```

The operational layer's schema-bearing tier. A Page Collection is a folder at the Nexus root whose sidecar assigns the nexus-wide properties every Page inside it shares — at any nesting depth — plus its saved views, child ordering, and open-in mode. It has no text editor of its own — a pure database surface.

| Entity              | Role                                                               | On-Disk                                           |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| **Page Collection** | Assigns the properties every Page inside shares                    | Folder + `_pagecollection.json` at the Nexus root |
| **Page Set**        | Organizing sub-folder at any depth; inherits the schema, adds none | Folder + `_pageset.json` → [[PageSetsPM]]         |
| **Content**         | Pages only (`.md`)                                                 | Files at any level                                |

Property definitions live in the nexus-wide registry (`.nexus/properties.json`); the assignment lives on the Collection, and Sets inherit it whole. Nesting is unbounded. The default UI label is "Collection," renameable per Nexus. Each Collection carries its own saved views — the view model, pipeline, and renderers live in [[ViewsPM]]; the page document in [[PagesPM]].

### Sidecar + Schema

`_pagecollection.json` holds the Collection's identity, its `properties` assignment, its children's order — the parent owns the order of both its child Sets and its root Pages — its saved views, its open-in mode, and its presentation keys. The title is the folder name, not a field, and foreign keys ride through on every write. Creating a Collection mints a ULID and seeds one default view, with no properties. The full property catalog and schema mechanics → [[PropertiesPM]].

### Collection Settings

The schema editor — create properties, rename, reorder, change a type, and seed per-type options; renames, type changes, and option edits change the global definition for every assigning Collection. Removing a property lifts each member's value into a restore cache on the Collection's sidecar, then clears the key from every member's frontmatter, and re-assigning replays the cached values that still validate; the nexus-wide delete is a separate, `.trash`-backed operation (→ [[PropertiesPM]] §Schema Mutations). The pane is the Properties leaf of the toolbar's Settings dropdown.

### Open-In Mode

Each Collection carries an `open_in` field deciding where its Pages open — the main detail pane or the floating Page Preview window, defaulting to full-page when absent. Container-view title clicks and sidebar rows both honor it; ⌘-click is always the explicit full-page bypass to a new tab. The field is set from the SettingsPane's Configuration leaf. The window → [[PagePreviewPM]].

### Move Semantics

Moving a Page **within** a Collection is a pure filesystem move with no property loss — the schema is shared and Sets carry none of their own. Moving a Page to a **different** Collection brings it under the destination's assigned schema, and a move never strips values: properties the destination doesn't assign ride through as preserved foreign frontmatter rather than rendering, and assigning one there surfaces its values. Pages and whole Sets both reparent by sidebar drag; a Set lands in any Collection or Set outside its own subtree, never at the top level.

### On-Disk Layout

```
<nexus-root>/
  <Collection>/                 ← folder at the Nexus root
    _pagecollection.json        ← assigned properties + views + child ordering + open_in
    <Set>/                      ← sub-folder, at any depth
      _pageset.json
      <SubSet>/
        _pageset.json
        <Page>.md
      <Page>.md
    <Page>.md                   ← Page directly in the Collection root
```

Collections live as siblings at the Nexus root — there's no `Pages/` wrapper. Discovery is position-driven: any root folder carrying `_pagecollection.json` is a Collection, and its sub-folders are Sets at any depth. Banner bytes live under `.nexus/assets/<id>/`, served over the read-only `nexus-asset://` scheme.

### CRUD

One generic folder-entity CRUD. Create writes the folder plus its sidecar; a name already taken disambiguates on a numeric suffix so a new entity always appears, while a rename onto a taken name fails outright, and both reject a name the walk could never surface again. Delete moves the folder, and everything under it, to the configured delete target (→ [[ConfigurationPM]]). Top-level Collections persist their order in `.nexus/state.json`; a Collection holds its children's order in its own sidecar.
