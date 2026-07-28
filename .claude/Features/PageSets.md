## Page Sets

The recursive sub-container on the [[Studio/Pommora/II. Features/Pages|Pages]] side. A Page Set is a folder inside [[Collections]] that nests to any depth. One type, two roles by depth:

- **Set** (depth-1, a direct child of the Collection) — carries its own views and is selectable in the sidebar.
- **Sub-Set** (depth-2+) — a plain organizing folder, expand-only in the sidebar.

Role is computed from depth at render time and never stored: the same folder becomes a Set or a Sub-Set purely by where it sits. Every Set inherits the Collection's whole schema and adds none of its own.

### Features

#### II. Sidecar

`_pageset.json` holds the Set's id, a `parent_id` breadcrumb, its icon, the orders for its Pages and child Sets, and the view-bearing fields. The shape is identical at every depth, and an app-made Set is born with a default view wherever it sits. Position is authoritative for parentage: `parent_id` is stamped at create and healed from position on adoption, so a missing one is never a data problem and nothing on the read path consults it. The title is the folder name, and foreign keys ride through on every write.

#### II. Recursive Nesting

Discovery, rendering, navigation, and the index all recurse on the real folder tree: depth is literal directory depth, uncapped, and a folder tree can't cycle.

#### II. Depth-1 View Rule

Only a depth-1 Set is offered the view switcher, and only it mints an active view on open. Eligibility is a render-time check against the folder tree, not stored state, so it's move-safe: reparent a Set deeper and its views stop being offered; lift it back to depth-1 and they return. The views stay in the sidecar throughout, and the renderer takes no depth — a Sub-Set reached as a selection renders from its own saved views. The saved-view model → `Views.md`.

#### II. Selection + Navigation

A selected depth-1 Set opens its own scoped view and carries its path for rename-safe reconciliation; a Sub-Set's row only toggles its disclosure. The depth rule is the sidebar's alone: nav search indexes every Set at any depth, and a `set` selection mounts the container view whatever its depth, so the view paths test for depth-1 rather than trusting it — a reparent plus a Back-nav replay can surface a Sub-Set as a selection. Sidebar layout → `Sidebar.md`.

#### II. Moves

Within one Collection, moving a Page or a whole Set at any depth is a pure filesystem move with no property loss — Sets carry no schema of their own. Cross-Collection moves are governed by the destination schema → `Collections.md`.

### Architecture

#### II. CRUD

Page Sets run through the same generic folder-entity CRUD as Collections and Spaces. A move reparents the whole subtree, and a delete sends the folder with its Sub-Sets and Pages to the configured delete target (→ `Configuration.md`). Reorder persists the parent's orders on each drag.

### Pending

**Sub-Set Openability:** Whether a Sub-Set should be openable outside the sidebar at all is unresolved — close the hole in the nav and resolve indexes, resolve a Sub-Set hit to its depth-1 ancestor, or keep it openable as the shipped behavior does.

**Delete Set Only (Re-Home Pages):** The current delete removes the folder and everything in it; a second mode would dissolve a Set while re-homing its Pages into the immediate parent.
