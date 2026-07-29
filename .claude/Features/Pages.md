## Pages

A Page is one Markdown file inside a [Collection](Collections.md) — the operational entity that holds free prose. A Page is a single `.md`: YAML frontmatter for identity and property values, then a Markdown body. Membership is by location — a file inside a Collection, or one of its Sets at any depth, is a Page in that Collection and conforms to that Collection's property schema; there's no container field. The body is portable Markdown, edited in [[Studio/Pommora/II. Features/MarkdownPM|MarkdownPM]] → `MarkdownPM.md`.

### Features

#### II. On-Disk Shape

Frontmatter carries `id`, an optional `icon`, `created_at` / `modified_at`, and `cover` — a Nexus-relative page-banner path — plus the wrapped keys: `(Context)` keys naming Spaces, and one `<Property>` key per value the page holds. The wrap is what separates a property from a modeled root field, which is why `cover` is not a property and never appears in a properties surface. Property values conform to the owning Collection's schema. Foreign frontmatter keys — and YAML comments — are preserved by value on every write: the writer re-serializes only the modeled keys and never reconstructs the object.

**Four things modify a Page**, and `modified_at` answers to exactly them: a property VALUE change, a text change, a location change, and a rename. A schema-level edit is not one of them. Renaming a property rewrites the key on every page holding it and changing its type rewrites nothing — neither moves a stamp, because a derived rewrite is not a user modification. The `[[link]]` rename cascade runs under the same rule. A derived rewrite is likewise untouched: the `[[link]]` rename cascade edits bodies without claiming they were modified.

#### II. Title + Membership

The filename minus `.md` is the title — there's no `title` field, and a rename is a file rename. Within a folder, names must be unique: a colliding create auto-disambiguates with a numeric suffix, and a colliding rename is rejected. Titles aren't unique Nexus-wide, though — two Pages in different folders can share one, and a `[[Title]]` to a shared title resolves as ambiguous (→ `Connections.md`). Membership is purely positional: moving the file between [[Collections]] or [[Studio/Pommora/II. Features/PageSets|PageSets]] changes its membership, with no field to update. Moving across Collections brings the Page under the destination schema → `Collections.md`.

#### II. Properties Surface

A Page's property values are written and read straight off the file, with no query layer between. The one shipped surface that edits them is the Page Preview's front-matter inspector → `PagePreview.md`; the main pane renders no property rows. The catalog and schema mechanics → `Properties.md`.

#### II. Opening Behavior

Clicking a Page opens it in the active tab, replacing that tab's selection, and the editor auto-saves on a debounce. A Collection can route its Pages to the floating Page Preview window instead via `open_in` — title clicks (and sidebar rows) open the preview, and ⌘-click always bypasses to a full page in a new tab. Routing → `Collections.md`; the window → `PagePreview.md`.

#### II. Connections

A Page's body can hold inline `[[Title]]` [[Studio/Pommora/II. Features/Connections|Connections]] — Obsidian-compatible wikilinks that render as styled colored inline text and navigate on click. Canonical spec → `Connections.md`; the bracketed Context-key counterpart → `Contexts.md` + `Properties.md`.

#### II. Editor UI State

Per-page editor UI state lives per-machine in the database, never in the portable `.md`: heading-fold state and per-table heading-column choices, each keyed by page ID. Keeping this state out of the frontmatter leaves the `.md` out of cloud-sync churn.

### Architecture

#### II. Read + Write

A Page reads through a lenient envelope split — a missing or unterminated frontmatter fence yields an all-body read, so a frontmatter-less Markdown file still opens, and one legacy separator blank line after the closing fence is stripped on read. Writes never emit that line, so a note never opens with an empty line under Obsidian's properties panel. Every write goes through the comment-preserving merge and an atomic temp-file-plus-rename. The editor binds to the body and debounces saves; frontmatter is a typed object the editor can't corrupt.

#### II. Adoption

Opening a folder adopts it: every `.md` still lacking an `id` is stamped with a fresh ULID, so the index and every later write key off a stable identity rather than a transient placeholder. That stamp runs through the same preserving merge — foreign frontmatter, YAML comments, and the body all survive, and `id` is the only key added. The pass walks parents before children. Anything it skips still reads with a synthetic id hashed from the file's Nexus-relative path, stable across launches, and missing timestamps fall back to the file's own.

### Pending

**Columns Directive:** The `Columns` multi-column section directive — specified, not built. Callouts already render in the editor (→ `MarkdownPM.md`).

### Prospects

**Page Property Panel:** A property panel on the entity itself — Pages and Agenda items alike — to view and edit its schema's property values. The values are already on disk; the surface isn't built.

**Sub-Pages:** A nested Page hierarchy — a Page owning child Pages — beyond the current flat Page-in-container model.

**Independent UI Titles:** A display title distinct from the filename, so a rename needn't move the file.

**Ad-Hoc Properties:** Page-local frontmatter fields outside the Collection schema.
