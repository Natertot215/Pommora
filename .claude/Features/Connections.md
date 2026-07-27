### Connections

A **Connection** is an inline `[[Title]]` link in a Markdown body that points to another Page. `[[` is the sole connection syntax — distinct from the bracketed Context keys that bind entities to Spaces.

A connection lives in the body and nowhere else: the text is canonical and Obsidian-readable, there's no frontmatter mirror, and resolution is computed at read time against an in-memory title map. Two surfaces author them — a Page's body and a markdown block tile on a block surface. A `[[Title]]` targets a Page. Spaces are reached only through Context links; Tasks and Events are never connection targets.

### Features

#### II. Syntax + Scope

On disk a connection is the bracketed title — `[[Title]]`. The parser tolerates a piped tail and matches on the title alone, so `[[Title|alias]]` resolves to the same Page while its tail renders as plain text beside the styled title. `![[ ]]` isn't a connection — the tokenizer claims it as an image embed and gives it the muted marker treatment; `{{ }}` carries no meaning and renders as written. Nothing offers a Page its own title, and the index drops a self-link, but a hand-typed one resolves and navigates like any other.

#### II. Resolution

Titles match through one shared normalization — the same one the scanner, autocomplete, the cascade, and the index all use, so they can never disagree. A scanned title resolves to one of three states:

- **Resolved** — exactly one Page holds the title. The link is live: rendered styled and navigable, with its target's current ULID held in memory.

- **Ambiguous** — more than one Page holds the title. Nothing can pick a target, so the link renders muted and inert until one side is renamed.

- **Phantom** — no Page holds the title. The link renders as literal bracketed text, and goes live on the editor's next doc, caret, focus, or scroll update once a single matching Page exists.

#### II. Rename Cascade

Because identity is the title and the body carries no id, a rename **cascades**: renaming a target rewrites every body that references its old title. Two passes with different guarantees cover the two sources. Page bodies are found by walking the nexus's markdown outside `.nexus` and `.trash`, skipping any file with no id — the index plays no part. Markdown-block bodies are `.nexus`-resident and out of that walk's reach, so a second best-effort pass heals them after the page pass commits; its failure is swallowed and leaves blocks stale until the next rewrite.

Every file is rewritten under its own lock — the same lock a live edit takes — and frontmatter is preserved untouched, since a derived link edit isn't a user modification. The cascade is per-file, not cross-file atomic: if the page pass fails partway, the target's own rename reverts, leaving the bodies it never reached correct and the ones it already rewrote pointing at a title no Page holds. Re-running the rename heals them.

#### II. Rendering

A resolved connection wears the connection color as inline text — never a chip — with its brackets hidden until the caret enters the link. It carries four gestures: a plain click opens it, routed by the **Open Connections In Preview** personalization knob; ⌘-click opens it in a new tab; resting the pointer on it raises the preview hover card (→ `PagePreview.md`); right-click pops the native menu, whose one action is **Open in Preview**. Ambiguous connections take a muted tone with the same bracket treatment and no gesture attached. Phantom connections render raw — brackets visible, inert.

#### II. Autocomplete

Typing inside `[[ ]]` filters Pages nexus-wide by title prefix; an empty query lists nothing, and the page editor drops the page's own title from its candidates. The panel anchors below the caret and flips above it only when it would overflow the viewport bottom. Arrows move the selection, Return commits, Escape closes — each falling through to the editor's own binding while the panel is closed — and committing inserts a bare `[[Title]]`. One state machine drives the panel for the page editor, block tiles, and markdown table cells alike. A hand-typed title resolves identically.

### Architecture

#### II. Resolver + Index

The body is the source of truth — a connection exists because `[[ ]]` sits in the text. An in-memory map, from normalized title to the Page IDs holding it, resolves every link and drives the cascade; it's built from the page tree and rebuilt whenever that tree reloads. A `connections` table mirrors every scanned edge — page bodies and block bodies alike, distinguished by source kind — staging the shape a query facade would read. It regenerates by re-scanning, refreshes on `mutate` ops only (a body autosave lands on disk without touching it), and has no query consumer. Full data layer → `Architecture.md`.

### Prospects

**Aliases:** the `|` segment of `[[Title|alias]]` is a display alias. The shared pattern drops it on scan, a rename rewrites the whole link and takes the tail with it, and no surface authors one — honoring the alias end to end, plus an insertion path, is the outstanding work.

**Duplicate Disambiguation:** id-scoping so a connection to an ambiguous title can pick its target inline.

**Backlinks Panel:** a surface listing every Page that links to the current one. The edges are captured in the index; the query facade that would read them isn't built.

**Wider Targets + Embeds:** Tasks and Events as targets, heading and block anchors (`#`, `#^`), and transclusion (`![[ ]]`).
