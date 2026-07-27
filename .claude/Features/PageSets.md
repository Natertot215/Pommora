## Page Sets

The recursive sub-container on the [[Studio/Pommora/II. Features/Pages|Pages]] side. A Page Set is a folder inside [[Collections]] that nests to any depth. One type, two roles by depth:

- **Set** (depth-1, a direct child of the Collection) — carries its own views and is selectable in the sidebar.
- **Sub-Set** (depth-2+) — a plain organizing folder, expand-only in the sidebar.

A Set's role is a function of its depth in the folder tree, computed at render time and never stored: the same folder becomes a Set or a Sub-Set purely by where it sits. Every Set at every depth inherits the Collection's whole schema and adds none of its own. Nesting is unbounded.

### Features

#### II. Sidecar

`_pageset.json` holds the Set's `id`, a `parent_id` breadcrumb, `icon`, `page_order` (its own Pages), `set_order` (its child Sets), and the view-bearing fields — `views`, `banner`, and the view-presentation keys. The shape is identical at every depth: an app-made Set is born with a default view on disk wherever it sits, and the read path parses those fields without consulting depth. Position is authoritative for parentage — `parent_id` is stamped at create and healed from position when an un-adopted folder is adopted, so a missing one is never a data problem and nothing on the read path consults it. The title is the folder name, and foreign keys ride through on every write.

#### II. Recursive Nesting

Sets nest to any depth — no cap. Discovery, rendering, navigation, and the index all recurse on the real folder tree. A folder tree can't cycle, and depth is the literal directory depth.

#### II. Depth-1 View Rule

Only a depth-1 Set — a direct child of a Collection — is offered the view switcher, and only a depth-1 Set mints an active view on open. Eligibility is a render-time check against the folder tree, not stored state, so it's move-safe: reparent a depth-1 Set under another Set and its views stop being offered; lift it back to depth-1 and they return. The views themselves stay in the sidecar throughout, and the renderer that picks one takes no depth — a Sub-Set reached as a selection renders from its own saved views. The saved-view model → `Views.md`.

#### II. Selection + Navigation

In the sidebar a **depth-1 Set is selectable** — it opens its own scoped view and carries its path for rename-safe reconciliation — while a **Sub-Set's row is expand-only**, its click toggling the disclosure. A Set's disclosure shows its child Sub-Sets and its Pages. The depth rule is the sidebar's alone: nav search indexes every Set at any depth, and a `set` selection mounts the container view whatever its depth, so the view paths test for depth-1 rather than trusting it — a reparent plus a Back-nav replay can surface a Sub-Set as a selection. Sidebar layout → `Sidebar.md`.

#### II. Moves

Within one Collection, moving a Page or a whole Set — between Sets, Sub-Sets, and the Collection root, at any depth — is a pure filesystem move with no property loss; Sets carry no schema of their own. Reparenting that changes a Set's depth flips its view-eligibility automatically. Cross-Collection moves are governed by the destination schema → `Collections.md`.

### Architecture

#### II. CRUD

Page Sets run through the same generic folder-entity CRUD as Collections and Spaces: create writes the folder plus a sidecar with a fresh ULID, the `parent_id` breadcrumb, and the seeded default view; rename is a folder rename; move reparents the whole subtree; delete sends the folder — with its Sub-Sets and Pages — to the configured delete target, the in-Nexus trash by default (→ `Configuration.md`). Reorder persists the parent's `page_order` and `set_order` on each drag.

#### II. Index (Model A)

Each `page_sets` row references exactly one parent — its Collection at depth-1, its parent Set deeper. A page row records the owning Collection plus its immediate Set (null at the Collection root); both come from the build's tree walk, so pages in Sets are ordinary page rows with no special-casing. Nothing queries the index — it's built and maintained against the query facade that would read it. Full index → `Architecture.md`.

### Pending

**Sub-Set Openability:** Whether a Sub-Set should be openable outside the sidebar at all is unresolved — close the hole in the nav and resolve indexes, resolve a Sub-Set hit to its depth-1 ancestor, or keep it openable as the shipped behavior does.

**Delete Set Only (Re-Home Pages):** The current delete removes the folder and everything in it. A second mode would dissolve a Set while re-homing its Pages up one level into the immediate parent.
