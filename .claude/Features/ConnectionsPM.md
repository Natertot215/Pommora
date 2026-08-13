## Connections
```
Connections
├── Syntax + Scope
├── Resolution
├── The Rename Cascade
├── Rendering
├── Autocomplete
├── Known Issues
└── Prospects
```

A **Connection** is an inline link in a Markdown body pointing to another Page. Two syntaxes reach one, because Pommora reads what other Markdown tools write: the wikilink `[[Title]]`, and the markdown link `[Title](Page)` whose target names a page rather than a website. The text is canonical and Obsidian-readable, with no frontmatter mirror, and resolution is computed at read time. `[[…]]` appears only in a body, never as a frontmatter key sigil, so the wikilink form carries one meaning in Markdown. Only a Page's body and a markdown block tile author connections, and Pages are the only targets — Spaces come through Context links, and Tasks and Events are never targets.

### Syntax + Scope

The parser matches on the title alone, so `[[Title|alias]]` resolves to the same Page while the alias is what the reader sees — the title and its pipe join the hidden marker set, revealed like any other syntax once the caret enters. A pipe can't appear in a title — it opens that tail — and the shared name rule rejects it at creation everywhere.

A **markdown link** names a page through its target, percent-encoded so a title's spaces and parentheses survive a grammar whose target ends at the first `)`. Page resolution is tried before the URL gate, which accepts any dotted host: without that ordering a page called `Node.js` would be read as a website and become unreachable through this form. A target carrying a scheme or a path separator addresses something outside the Nexus and never names a page, so a URL can't reach one by its last segment. The label is the author's own text, free where a connection's title is its target. `[[Title]](target)` stays a connection followed by literal parentheses, which is what a shared vault means by it — CommonMark would read the outer brackets as a link's label, but doing so here would create a link the rename cascade's own grammar cannot match.

`![[ ]]` isn't a connection — it's the page-embed syntax (→ [[MarkdownPM]] §Page Embeds), never a link-graph edge — and `{{ }}` renders as written. The rename cascade still reaches it: one sweep rewrites `[[` and `![[` together. Nothing offers a Page its own title and a self-link is dropped, though a hand-typed one navigates normally.

**Code is never a connection.** A `[[Title]]` inside a fence or an inline span is a sample — it doesn't tokenize, doesn't index an edge, and no rename touches it.

### Resolution

A scanned title, matched through one shared normalization, lands in one of three states:

- **Resolved** — one Page holds the title; the link is styled and navigable, its target's ULID in memory.
- **Ambiguous** — several Pages hold it, so no target can be picked; the link is muted and inert until one side is renamed.
- **Phantom** — no Page holds it; the link stays literal bracketed text, going live on the editor's next update once a single match exists.

### The Rename Cascade

Identity is the title and the body carries no id, so a rename **cascades** — renaming a target rewrites every body holding its old title, in all three syntaxes, one sweep per pattern. A markdown link's target is re-encoded for the new title and its label is left alone, on the same principle that carries an alias through. An alias rides through: a rename changes which Page a connection points at, never the words the author chose to show for it. Page bodies come from a walk of the nexus's markdown, and a file the tree won't admit is passed over, so a rename never rewrites a body Pommora would refuse to render. Markdown-block bodies sit inside `.nexus`, out of that walk's reach, and a second best-effort pass heals them afterward.

### Rendering

A resolved connection is inline text in the connection color — never a chip — brackets hidden until the caret enters it. A markdown link naming a page wears the same colour and leads to the same place, decided by one resolver behind the click path and both renderers, so a link can never be painted as one thing and act as another; one that names a website keeps the external-link treatment, and one that names neither keeps the broken-link treatment unchanged. Click opens it, routed by the `connectionsOpenInPreview` personalization knob (→ [[ConfigurationPM]]); ⌘-click opens a new tab; hover raises the preview hover card (→ [[PagePreviewPM]]); right-click pops a native menu holding **Open Preview** and, where the surface can take an edit, the two authoring actions — **Add Title** (**Rename** once one exists) and **Edit Link**. Inside a link's own syntax the menu stands down, leaving the native editor menu its spelling and substitution items. Ambiguous links keep the bracket treatment in their muted tone; phantom text renders raw and inert.

### Autocomplete

One panel serves four forms, distinguished by where the caret sits. Typing inside `[[ ]]`'s title filters Pages nexus-wide by title prefix; an empty query lists nothing, its pool being every Page there is. The panel anchors below the caret, flipping above only to avoid overflowing the viewport. Arrows move the selection, Return commits the form being typed — a bare `[[Title]]`, or `![[Title]]` when the panel fired on the embed syntax, where the pool also drops already-embedded pages, the host chain, and titles the embed grammar can't express. Escape closes, each key falling through to the editor's own binding while the panel is closed. One state machine drives the page editor, block tiles, and markdown table cells alike; the embed form fires only in page-body editors.

Inside an alias the panel offers the names that Page has been given before, listing all of them the moment the pipe is typed — that being the one point where nothing has been typed to filter by, and offering them back the reason the memory exists. A suggestion identical to what is already written is withheld, since accepting it would be a no-op that holds Return away from the editor. Each row carries a hover-revealed **×** that forgets that alias for good; bodies already carrying it are untouched, because forgetting a suggestion never edits a document.

Inside a markdown link's `( )` the panel offers Pages, and accepting one encodes the target and hands the caret back to the label — pre-filled with the Page's own title and selected, since the display text is free and unwritten. A label already written is left as the author left it.

### The Alias Memory

A Page remembers the aliases it has been given. The list is written when an alias is authored — on leaving it, which is also when an alias opened and abandoned drops its pipe — rather than derived from a scan of every body, because a derived list cannot honour a real deletion and the next scan would resurrect what the × removed. It is keyed by PageID, so it survives a rename, and it lives in `nexus.db` beside the other per-machine records rather than on disk in the Nexus: the alias itself is written on-page in universal syntax, and what the database holds is an autocomplete accelerator whose loss costs a suggestion and never a link. A duplicated Page carries its memory to the copy. Deleting a Page does not clear it, matching every sibling record and leaving the restore path whole.

### Known Issues

- **The cascade is per-file, not cross-file atomic** — a page pass failing partway reverts the target's rename, leaving already-rewritten bodies pointing at a title no Page holds until the rename is re-run.
- **The markdown-block healing pass is best-effort** — its failure is swallowed, and blocks stay stale until the next rewrite.

### Prospects

- **Duplicate disambiguation** — id-scoping so a connection to an ambiguous title can pick its target inline.
- **Backlinks panel** — a surface listing every Page that links to the current one; it rides the reverse lookup a content index would answer, and no index exists (→ [[ArchitecturePM]]).
- **An alias-management pane** — curating a Page's remembered aliases wholesale rather than forgetting them one at a time through the picker's ×.
- **Wider targets + embeds** — Tasks and Events as targets, heading and block anchors (`#`, `#^`), and transclusion (`![[ ]]`).
