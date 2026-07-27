## Connections

A **Connection** is an inline `[[Title]]` link in a Markdown body pointing to another Page — the sole connection syntax, distinct from the bracketed Context keys that bind entities to Spaces.

It lives in the body and nowhere else: the text is canonical and Obsidian-readable, with no frontmatter mirror, and resolution is computed at read time. Only a Page's body and a markdown block tile author connections. Pages are the only targets — Spaces come through Context links, and Tasks and Events are never targets.

### Features

#### II. Syntax + Scope

The parser matches on the title alone, so `[[Title|alias]]` resolves to the same Page while the piped tail renders as plain text beside the styled title. `![[ ]]` isn't a connection — the tokenizer claims it as an image embed and mutes its marker — and `{{ }}` renders as written. Nothing offers a Page its own title and the index drops a self-link, though a hand-typed one resolves and navigates normally.

#### II. Resolution

One shared normalization matches titles everywhere, so no two surfaces disagree. A scanned title lands in one of three states:

- **Resolved** — one Page holds the title; the link is styled and navigable, its target's ULID in memory.
- **Ambiguous** — several Pages hold it, so no target can be picked; the link is muted and inert until one side is renamed.
- **Phantom** — no Page holds it; the link stays literal bracketed text, going live on the editor's next update once a single match exists.

#### II. Rename Cascade

Identity is the title and the body carries no id, so a rename **cascades**: renaming a target rewrites every body holding its old title. Page bodies come from a walk of the nexus's markdown outside `.nexus` and `.trash`, skipping id-less files; the index plays no part. Markdown-block bodies sit inside `.nexus`, out of that walk's reach, so a second best-effort pass heals them afterward; its failure is swallowed and blocks stay stale until the next rewrite.

Every file is rewritten under the same lock a live edit takes, frontmatter untouched — a derived link edit isn't a user modification. The cascade is per-file, not cross-file atomic: a page pass failing partway reverts the target's rename, leaving already-rewritten bodies pointing at a title no Page holds until the rename is re-run.

#### II. Rendering

A resolved connection is inline text in the connection color — never a chip — brackets hidden until the caret enters it. Click opens it, routed by the **Open Connections In Preview** personalization knob; ⌘-click opens a new tab; hover raises the preview hover card (→ `PagePreview.md`); right-click pops a native menu whose one action is **Open in Preview**. Ambiguous links keep that same bracket treatment in their muted tone; phantom text renders raw and inert.

#### II. Autocomplete

Typing inside `[[ ]]` filters Pages nexus-wide by title prefix; an empty query lists nothing. The panel anchors below the caret, flipping above only to avoid overflowing the viewport. Arrows move the selection, Return commits a bare `[[Title]]`, Escape closes — each falling through to the editor's own binding while the panel is closed. One state machine drives the page editor, block tiles, and markdown table cells alike.

### Architecture

#### II. Resolver + Index

An in-memory map from normalized title to the Page IDs holding it resolves every link and drives the cascade, rebuilt whenever the page tree reloads. A `connections` table mirrors every scanned edge, page and block bodies distinguished by source kind, staging the shape a query facade would read; it regenerates by re-scanning, refreshes on `mutate` ops only (a body autosave doesn't touch it), and has no query consumer. Full data layer → `Architecture.md`.

### Prospects

**Aliases:** the tail of `[[Title|alias]]` is a display alias nothing honors — no surface authors one, and a rename rewrites the link tail and all. Honoring it end to end, plus an insertion path, is outstanding.

**Duplicate Disambiguation:** id-scoping so a connection to an ambiguous title can pick its target inline.

**Backlinks Panel:** a surface listing every Page that links to the current one; the edges are already indexed.

**Wider Targets + Embeds:** Tasks and Events as targets, heading and block anchors (`#`, `#^`), and transclusion (`![[ ]]`).
