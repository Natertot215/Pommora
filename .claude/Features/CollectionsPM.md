## Page Collections

```
Page Collections
├── Sidecar + Schema
├── Page Sets
├── Open In
├── Move Semantics
├── On-Disk Layout
└── CRUD
```

A Page Collection is the operational layer's schema-bearing tier: a folder at the Nexus root whose sidecar assigns the nexus-wide properties every Page inside it shares, at any nesting depth, along with its saved views, its children's order, and where its pages open. It has no text editor of its own — a Collection is a pure database surface, rendered through its views.[^1] Property definitions live in the nexus-wide registry; the Collection holds only the assignment, and its Sets inherit that assignment whole.[^2]

| Entity | Role | On-Disk |
| --- | --- | --- |
| **Page Collection** | Assigns the properties every Page inside shares | Folder + `_pagecollection.json` at the Nexus root |
| **Page Set** | Organizing sub-folder at any depth; inherits the schema, adds none | Folder + `_pageset.json` |
| **Page** | The content | `.md` files at any level |

### Sidecar + Schema

`_pagecollection.json` is modeled by `pageCollectionSidecar` in `src/shared/schemas.ts`: the Collection's `id` and `icon`, its `banner`, the `properties` assignment list (registry ids), its saved `views`, `set_order` and `page_order` for the children it parents directly, `open_in`, and the two view-button presentation keys. A `property_cache` block appears while a removed property's values are held for restore.[^2] The title is the folder name rather than a field, and foreign keys ride through every write. Creating a Collection mints a ULID and seeds one default view with no properties assigned; the schema is then edited from the Properties pane in the toolbar's Settings dropdown.[^2]

### Page Sets

A Page Set is a folder inside a Collection that nests to any depth, carrying `_pageset.json` (`pageSetSidecar`) with the same shape at every level: id, icon, banner, the orders of its own Pages and child Sets, and its views. Parentage is the folder nesting itself; a Set stores no pointer to its parent, and discovery, rendering, and navigation all recurse on the real folder tree. Every Set inherits the Collection's whole schema and adds none of its own.

One type takes two roles by depth. A **Set** — a direct child of the Collection — is selectable in the sidebar, opens its own scoped view, and is offered configurable views; a **Sub-Set** at depth two or deeper is a plain organizing folder whose sidebar row only toggles its disclosure. The role is computed from depth at render time (`isDepth1Set` in `src/renderer/src/Detail/Scope.ts`) and never stored, so reparenting a Set deeper hides its views and lifting it back restores them. The depth rule is the sidebar's alone: nav search indexes every Set, and a `set` selection mounts the container view at any depth.

### Open In

Each Collection carries an `open_in` field that decides where its Pages open — the main detail pane, or the floating Page Window — defaulting to the full page when absent. Container-view title clicks and sidebar rows both honor it, and ⌘-click always opens a full page in a new tab. The field is Collection-owned: a Set proxies its Collection's value and a write against a Set is refused (`src/main/crud/containerConfig.ts`). It is set from the **Open In** row of the container's Configuration pane.[^3]

### Move Semantics

Moving a Page within a Collection — between its Sets and root, at any depth — is a filesystem move with no property loss, since the schema is shared and Sets carry none of their own. Moving a Page to a different Collection brings it under the destination's assigned schema without stripping anything: values for properties the destination doesn't assign ride through as preserved foreign frontmatter and surface again if that property is assigned there. Pages and whole Sets both reparent by sidebar drag; a Set may land in any Collection or Set outside its own subtree, never at the Nexus root, and every move passes one main-side check admitting only a Collection or a Set as the destination.

### On-Disk Layout

```
// <Nexus>
└── // <Collection>                      | • A folder at the Nexus root
    ├── // <Set>                         | • A sub-folder, at any depth
    │   ├── // <SubSet>
    │   │   ├── [<Page>.md]
    │   │   └── _pageset.json
    │   ├── [<Page>.md]
    │   └── _pageset.json
    ├── [<Page>.md]                      | • A Page directly in the Collection root
    └── _pagecollection.json             | • Assigned properties, views, child ordering, open-in
```

Collections sit as siblings at the Nexus root with no wrapper folder. Discovery is position-driven (`src/main/folderKind.ts`): a root folder carrying `_pagecollection.json` is a Collection, and every sub-folder beneath one is a Set. A banner names its image the way a page's cover does, from the asset directory.[^4]

### CRUD

Collections and Sets share the generic folder-entity CRUD in `src/main/crud/folderEntity.ts`: create writes the folder and its sidecar, rename is a folder rename, and update preserves foreign sidecar keys. A create under a taken name disambiguates with a numeric suffix, while a rename onto a taken name is refused. Delete moves the folder and everything under it to the trash.[^5] Reorder persists parent-side on each drag — a container's sidecar holds its Sets' and Pages' order, and the top-level Collection order lives in `.nexus/state.json`.

---

#### Pending

- **Dissolve a Set** — deleting a Set while re-homing its Pages into the parent; today a delete takes the folder with everything in it.

[^1]: [[ViewTypesPM]]
[^2]: [[PropertiesPM]] §Shared Mechanisms
[^3]: [[ConfigurationPM]] §Collections
[^4]: [[ArchitecturePM]] §The Asset Directory
[^5]: [[NexusRecordPM]]
