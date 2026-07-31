## Connections

A **Connection** is an inline `[[Title]]` link in a Markdown body pointing to another Page — the sole connection syntax. `[[…]]` appears only in a body and is deliberately unused as a frontmatter key sigil, so the wikilink form carries one meaning in Markdown and never has to carry a second in YAML — where it would parse as a nested flow sequence.

It lives in the body and nowhere else: the text is canonical and Obsidian-readable, with no frontmatter mirror, and resolution is computed at read time. Only a Page's body and a markdown block tile author connections. Pages are the only targets — Spaces come through Context links, and Tasks and Events are never targets.

### Features

#### II. Syntax + Scope

The parser matches on the title alone, so `[[Title|alias]]` resolves to the same Page while the piped tail renders as plain text beside the styled title. **A pipe can't appear in a title** — it opens that tail, so a title holding one could never resolve back to itself; the shared name rule rejects it at creation everywhere.

`![[ ]]` isn't a connection — the tokenizer claims it as an image embed — and `{{ }}` renders as written. Nothing offers a Page its own title and a self-link is dropped, though a hand-typed one navigates normally.

**Code is never a connection.** A `[[Title]]` inside a fence or an inline span is a sample: it doesn't tokenize, doesn't index an edge, and no rename touches it. One shared mask decides where code is, so the editor and the write side can't disagree.

#### II. Resolution

One shared normalization matches titles everywhere, so no two surfaces disagree. A scanned title lands in one of three states:

- **Resolved** — one Page holds the title; the link is styled and navigable, its target's ULID in memory.
- **Ambiguous** — several Pages hold it, so no target can be picked; the link is muted and inert until one side is renamed.
- **Phantom** — no Page holds it; the link stays literal bracketed text, going live on the editor's next update once a single match exists.

#### II. Rename Cascade

Identity is the title and the body carries no id, so a rename **cascades**: renaming a target rewrites every body holding its old title. An alias rides through — a rename changes which Page a connection points at, never the words the author chose to show for it. Page bodies come from a walk of the nexus's markdown, the index playing no part; a file the tree won't admit is passed over, so a rename never rewrites a body Pommora would refuse to render. Markdown-block bodies sit inside `.nexus`, out of that walk's reach, so a second best-effort pass heals them afterward; its failure is swallowed and blocks stay stale until the next rewrite.

Every file is rewritten under the same lock a live edit takes, frontmatter untouched — a derived link edit isn't a user modification. The cascade is per-file, not cross-file atomic: a page pass failing partway reverts the target's rename, leaving already-rewritten bodies pointing at a title no Page holds until the rename is re-run.

#### II. Rendering

A resolved connection is inline text in the connection color — never a chip — brackets hidden until the caret enters it. Click opens it, routed by the **Open Connections In Preview** personalization knob; ⌘-click opens a new tab; hover raises the preview hover card (→ `PagePreview.md`); right-click pops a native menu whose one action is **Open in Preview**. Ambiguous links keep that same bracket treatment in their muted tone; phantom text renders raw and inert.

#### II. Autocomplete

Typing inside `[[ ]]` filters Pages nexus-wide by title prefix; an empty query lists nothing. The panel anchors below the caret, flipping above only to avoid overflowing the viewport. Arrows move the selection, Return commits a bare `[[Title]]`, Escape closes — each falling through to the editor's own binding while the panel is closed. One state machine drives the page editor, block tiles, and markdown table cells alike.

### Architecture

#### II. Resolver + Index

An in-memory map from normalized title to the Page IDs holding it resolves every link and drives the cascade, rebuilt whenever the page tree reloads. Nothing persists the edges: the map is the whole mechanism, and every consumer runs off it in memory. Backlinks and Linked-From are what a stored edge table would be *for*, and it gets written alongside the query layer that reads it. Full data layer → `Architecture.md`.

### Prospects

**Aliases:** the tail of `[[Title|alias]]` parses and survives every rewrite, but nothing renders it as the display text yet and no surface authors one. The display treatment and an insertion path are outstanding.

**Duplicate Disambiguation:** id-scoping so a connection to an ambiguous title can pick its target inline.

**Backlinks Panel:** a surface listing every Page that links to the current one. It needs the reverse lookup a content index would answer, and no index exists — this and Linked-From are what one would be built for.

**Wider Targets + Embeds:** Tasks and Events as targets, heading and block anchors (`#`, `#^`), and transclusion (`![[ ]]`).
