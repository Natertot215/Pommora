## Connections

A **Connection** is an inline `[[Title]]` link in a Markdown body pointing to another Page — the sole connection syntax. The text is canonical and Obsidian-readable, with no frontmatter mirror, and resolution is computed at read time. `[[…]]` appears only in a body, never as a frontmatter key sigil, so the wikilink form carries one meaning in Markdown. Only a Page's body and a markdown block tile author connections, and Pages are the only targets — Spaces come through Context links, and Tasks and Events are never targets.

### Syntax + Scope

The parser matches on the title alone, so `[[Title|alias]]` resolves to the same Page while the piped tail renders as plain text beside the styled title. A pipe can't appear in a title — it opens that tail — and the shared name rule rejects it at creation everywhere.

`![[ ]]` isn't a connection — it's the page-embed syntax (→ [[MarkdownPM]] §Page Embeds), never a link-graph edge — and `{{ }}` renders as written. The rename cascade still reaches it: one sweep rewrites `[[` and `![[` together. Nothing offers a Page its own title and a self-link is dropped, though a hand-typed one navigates normally.

**Code is never a connection.** A `[[Title]]` inside a fence or an inline span is a sample — it doesn't tokenize, doesn't index an edge, and no rename touches it.

### Resolution

A scanned title lands in one of three states:

- **Resolved** — one Page holds the title; the link is styled and navigable, its target's ULID in memory.
- **Ambiguous** — several Pages hold it, so no target can be picked; the link is muted and inert until one side is renamed.
- **Phantom** — no Page holds it; the link stays literal bracketed text, going live on the editor's next update once a single match exists.

One shared normalization matches titles everywhere.

### The Rename Cascade

Identity is the title and the body carries no id, so a rename **cascades** — renaming a target rewrites every body holding its old title. An alias rides through: a rename changes which Page a connection points at, never the words the author chose to show for it. Page bodies come from a walk of the nexus's markdown, and a file the tree won't admit is passed over, so a rename never rewrites a body Pommora would refuse to render. Markdown-block bodies sit inside `.nexus`, out of that walk's reach, and a second best-effort pass heals them afterward.

Every file is rewritten under the same lock a live edit takes, frontmatter untouched — a derived link edit isn't a user modification (→ [[PagesPM]]).

### Rendering

A resolved connection is inline text in the connection color — never a chip — brackets hidden until the caret enters it. Click opens it, routed by the `connectionsOpenInPreview` personalization knob (→ [[ConfigurationPM]]); ⌘-click opens a new tab; hover raises the preview hover card (→ [[PagePreviewPM]]); right-click pops a native menu whose one action is **Open in Preview**. Ambiguous links keep the bracket treatment in their muted tone; phantom text renders raw and inert.

### Autocomplete

Typing inside `[[ ]]` filters Pages nexus-wide by title prefix; an empty query lists nothing. The panel anchors below the caret, flipping above only to avoid overflowing the viewport. Arrows move the selection, Return commits the form being typed — a bare `[[Title]]`, or `![[Title]]` when the panel fired on the embed syntax, where the pool also drops already-embedded pages, the host chain, and titles the embed grammar can't express. Escape closes, each key falling through to the editor's own binding while the panel is closed. One state machine drives the page editor, block tiles, and markdown table cells alike; the embed form fires only in page-body editors.

### The Resolver

An in-memory map from normalized title to the Page IDs holding it resolves every link and drives the cascade, rebuilt whenever the page tree reloads. Nothing persists the edges. Full data layer → [[ArchitecturePM]].

### Known Issues

- **The cascade is per-file, not cross-file atomic** — a page pass failing partway reverts the target's rename, leaving already-rewritten bodies pointing at a title no Page holds until the rename is re-run.
- **The markdown-block healing pass is best-effort** — its failure is swallowed, and blocks stay stale until the next rewrite.

### Prospects

- **Aliases** — the tail of `[[Title|alias]]` parses and survives every rewrite, but nothing renders it as the display text and no surface authors one.
- **Duplicate disambiguation** — id-scoping so a connection to an ambiguous title can pick its target inline.
- **Backlinks panel** — a surface listing every Page that links to the current one; it rides the reverse lookup a content index would answer, and no index exists (→ [[ArchitecturePM]]).
- **Wider targets + embeds** — Tasks and Events as targets, heading and block anchors (`#`, `#^`), and transclusion (`![[ ]]`).
