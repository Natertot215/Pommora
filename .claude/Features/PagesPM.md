## Pages
```
Pages
├── On-Disk Shape
├── Title + Membership
├── Opening Behavior
├── Outline
├── Editor UI State
├── Read + Write
├── Adoption
├── Pending
└── Prospects
```

A Page is one Markdown file inside a [[CollectionsPM|Collection]] — the operational entity that holds free prose. A Page is a single `.md`: YAML frontmatter for identity and property values, then a Markdown body. Membership is by location — a file inside a Collection, or one of its Sets at any depth, is a Page in that Collection and conforms to that Collection's property schema; there's no container field. The body is portable Markdown, edited in [[MarkdownPM]], and can hold inline `[[Title]]` Connections (→ [[ConnectionsPM]]).

### On-Disk Shape

Frontmatter carries `PageID` — the key naming the kind, holding a bare ULID — an optional `icon`, `created_at` / `modified_at`, and `cover` — a Nexus-relative page-banner path — plus the wrapped keys: `(Context)` keys naming Spaces, and one `<Property>` key per value the page holds. The wrap separates a property from a modeled root field; `cover` is a root field and never appears in a properties surface. Property values conform to the owning Collection's schema. Foreign frontmatter keys — and YAML comments — are preserved by value on every write; the writer re-serializes only the modeled keys.

`modified_at` answers to a property value change, a text change, a location change, and a rename. A schema-level edit is not one of them — renaming a property rewrites the key on every page holding it without moving a stamp, since a derived rewrite is not a user modification, and the `[[link]]` rename cascade runs under the same rule.

### Title + Membership

The filename minus `.md` is the title — there's no `title` field, and a rename is a file rename. Within a folder, names must be unique: a colliding create auto-disambiguates with a numeric suffix, and a colliding rename is rejected. Titles aren't unique Nexus-wide — two Pages in different folders can share one, and a `[[Title]]` to a shared title resolves as ambiguous (→ [[ConnectionsPM]]). Membership is purely positional: moving the file between Collections or Sets changes its membership, with no field to update (→ [[CollectionsPM]] §Move Semantics).

### Opening Behavior

Clicking a Page opens it in the active tab, replacing that tab's selection, and the editor auto-saves on a debounce. A Collection can route its Pages to the floating Page Preview window instead via `open_in`; ⌘-click always bypasses to a full page in a new tab (→ [[CollectionsPM]], [[PagePreviewPM]]).

### Outline

A page's own table of contents, in the toolbar. Present only while the detail pane holds a Page, it takes the Views button's slot rather than adding one — a selection is either a container or a Page. Rows carry each heading's own text at the emphasized weight with its markers stripped, nested by heading level and opened fully. Levels may skip freely, so a heading attaches to the nearest shallower one above it. A heading with nothing beneath it still appears, keeping consecutive headings both visible even though the fold machinery has nothing to fold there.

The chevron collapses a group in the dropdown alone and leaves the page untouched, and neither gesture dismisses the pane, so a long document can be worked through without reopening the list. The row travels to its heading — a scroll glide rather than a cut (→ [[InteractionPM]]) — never editing the document and never moving the caret, opening any collapsed section hiding the target and waiting for that reveal to land before scrolling. A heading arrives at the band the page header occupies, the same height its own inline title reads at. Long headings truncate in the row and scroll on hover; the pane widens with its content only until its edge would leave the window.

### Editor UI State

Per-page editor UI state lives per-machine in the database, never in the portable `.md`: heading-fold state and per-table heading-column choices, each keyed by page ID. Keeping this state out of the frontmatter leaves the `.md` out of cloud-sync churn.

### Read + Write

A Page reads through a lenient envelope split — a missing or unterminated frontmatter fence yields an all-body read, so a frontmatter-less Markdown file still opens. A separator blank line after the closing fence is stripped on read and never written, so a note never opens with an empty line under Obsidian's properties panel. Every write goes through the comment-preserving merge and an atomic temp-file-plus-rename. The editor binds to the body and debounces saves; frontmatter is a typed object the editor can't corrupt.

### Adoption

Opening a folder adopts it: every `.md` carrying no kind key is stamped with a fresh `PageID`, so the index and every later write key off a stable identity. That stamp runs through the same preserving merge — foreign frontmatter, YAML comments, and the body all survive, and the kind key is the only one added. A file whose key contradicts its folder is never stamped — it is Unknown: absent from the tree, skipped by every nexus-wide write, left byte-identical. A file carrying no key reads throughout, wearing a synthetic id hashed from its Nexus-relative path, stable across launches, until the stamp lands. Missing timestamps fall back to the file's own.

### Pending

- **Columns directive** — the multi-column section directive; specified, not built. Callouts already render in the editor (→ [[MarkdownPM]]).

### Prospects

- **Page Property Panel** — a property panel on the entity itself, Pages and Agenda items alike. The Page Preview's front-matter inspector is the one shipped value surface (→ [[PropertiesPM]]); the in-content panel isn't built.
- **Sub-Pages** — a nested Page hierarchy beyond the current flat Page-in-container model.
- **Independent UI titles** — a display title distinct from the filename, so a rename needn't move the file.
- **Ad-hoc properties** — Page-local frontmatter fields outside the Collection schema.
