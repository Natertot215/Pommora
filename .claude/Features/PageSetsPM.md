## Page Sets

```
Page Sets
├── The Sidecar
├── The Depth-1 View Rule
├── Selection + Navigation
├── Moves + CRUD
└── Pending
```

The recursive sub-container on the [[PagesPM|Pages]] side. A Page Set is a folder inside a [[CollectionsPM|Coll]] that nests to any depth — one type, two roles by depth:

- **Set** (depth-1, a direct child of the Collection) — carries its own views and is selectable in the sidebar.
- **Sub-Set** (depth-2+) — a plain organizing folder, expand-only in the sidebar.

Role is computed from depth at render time and never stored — the same folder becomes a Set or a Sub-Set purely by where it sits. Every Set inherits the Collection's whole schema and adds none of its own.

### The Sidecar

`_pageset.json` holds the Set's id, its icon, the orders for its Pages and child Sets, and the view-bearing fields. The shape is identical at every depth, and an app-made Set is born with a default view wherever it sits. Parentage is the folder nesting itself — a Set stores no pointer to its parent. The title is the folder name, and discovery, rendering, and navigation all recurse on the real folder tree.

### The Depth-1 View Rule

Only a depth-1 Set is offered configurable [[ViewsPM|views]], and only it mints an active view on open. Eligibility is a render-time check against the folder tree, so it's move-safe — reparent a Set deeper and its views stop being offered; lift it back to depth-1 and they return.

### Selection + Navigation

A selected depth-1 Set opens its own scoped view and carries its path for rename-safe reconciliation; a Sub-Set's row only toggles its disclosure. The depth rule is the sidebar's alone — nav search indexes every Set at any depth, and a `set` selection mounts the container view whatever its depth.

### Moves + CRUD

Within one Collection, moving a Page or a whole Set at any depth is a pure filesystem move. Page Sets run through the same generic folder-entity CRUD as Collections and Spaces — a move reparents the whole subtree, a delete sends the folder with its Sub-Sets and Pages to the configured delete target, and reorder persists the parent's orders on each drag.

### Pending

- **Delete Set only (re-home Pages)** — the current delete removes the folder and everything in it; a second mode would dissolve a Set while re-homing its Pages into the immediate parent.
