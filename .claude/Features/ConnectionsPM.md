## Connections


A **Connection** is a link from one Page to another, written in the page's Markdown body. Two syntaxes spell one — the wikilink `[[Title]]` and the Markdown link `[Alias](Title)` whose target names a page — and the word covers both. A connection may also be held as the whole value of a Link property, where it reads as a connection rather than an address. Connections are the only page-to-page relation Pommora has; Contexts are the relation layer, and there is no relation-type property. 

### Syntax + Scope

The grammar lives in `Core/Connections/connections.ts` (the wikilink) and `Core/Connections/links.ts` (the markdown link), shared code both processes read so the editor's tokenizer and main's rename rewriter can never disagree about what a link is. One normalization — trim, case-fold, NFC — is applied to every title and every fragment on every side, so the scanner, the resolver, and the uniqueness check always agree.

- **Wikilinks** — `[[Title]]` resolves by its title, `[[Title#Heading]]` names a heading inside that page, and `[[#Heading]]` names a heading on the page it sits in; the fragment after the `#` is the heading's own text. `[[Title|Alias]]` shows the alias and still resolves by the title; the title and its pipe join the hidden markers and reveal with the caret like any other syntax, and an alias follows a fragment the same way. A title can't contain `|`, `#`, or `§`, and the name rule rejects them at creation; a `§` typed where a title is being written becomes `#`, so the file only ever holds `#`.
- **Markdown links** — `[Label](Title)` names a page through its target, percent-encoded so spaces and parentheses survive, and `[Label](Title#Heading)` and `[Label](#Heading)` carry the same fragments the wikilink does. A target that carries a scheme or a path separator addresses something outside the Nexus and is never read as a page title, so a URL can't reach a page by its last segment. The label is the author's own text.
- **Scope** — A Page, or a heading within one, is a target. Spaces are reached through Context links, and Tasks and Events aren't targets. A `!`-prefixed form standing alone on a line is not a connection: `![[Title]]` is a page embed and `![Label](url)` a webpage embed, each rendered as a live tile.

### Resolution

Every title the scanner finds is looked up in an in-memory map built from the page tree (`treeIndex` in the renderer, the content index in main), and lands in one of these states, a heading half reading against its page's headings and muted when none matches:

- **Resolved** — exactly one Page holds the title. The link is styled and navigable, and its target's id is known in memory.
- **Ambiguous** — more than one Page holds it, so no target can be chosen. The link is muted and inert until one side is renamed.
- **Phantom** — no Page holds it. The link stays literal bracketed text and goes live on the editor's next update once a single match exists.

### The Rename Cascade

A connection resolves by title, so renaming a page rewrites every body that names the old title, each fragment re-emitted as written. `Core/Connections/rewrite.ts` is the primitive — one pure pass over three patterns (wikilink, page embed, markdown link) plus the Link property values in frontmatter — and the cascade runs it over every file the content index relates to the title, confirming each under its own lock, with assigned aliases also using the same cascading mechanism; Connections inside code syntax aren't cascaded. A File property's `[[Basename.ext]]` values are in a different domain and are left alone. Anything inside a code span or fence is a sample and is never rewritten.

Renaming a heading rewrites the links that name it the same way: the page's own inside the editing transaction, one undo step with the rename, and every other file the index names once the edit settles, the page's fold keys following. A rename landing from outside Pommora is read by the index re-scan and takes the same path; where one of two identical headings is renamed, links keep the one still standing.

### Rendering

A connection renders as inline text in the connection color (the **Internal Link Color** setting), never as a chip, with its brackets hidden until the caret enters it. Revealed, an aliased connection shows both halves — the target marked as a target, the alias as prose — with a link glyph between them that takes the connection color when the target resolves and reads muted when it doesn't. A connection being typed takes the color from its first character, so it never reads as prose while a title is being written. A markdown link that names a page uses the same color, leads to the same place, and shows the same glance pane; one that names a website keeps the external-link treatment (External Link Color); and one that names neither keeps the broken-link treatment. A connection naming a heading reads per **Heading Link Style** — `Page § Heading`, or `§Heading` alone — a link to a heading on its own page reading as the heading alone, and an alias overriding both halves.

Clicking a connection opens the page, routed by **Open Connections In Preview** — the active tab by default, the Page Window when the setting is on, and ⌘-click always takes the other route. Resting on a resolved connection raises the glance pane with a read-only render of the target. Ambiguous links keep the bracket treatment in a muted tone; a phantom is inert and reads either muted with its syntax showing or as plain prose, per **Display Unresolved Links As Plain Syntax**, which applies to page prose only — cells and other fields stay muted. A connection naming a heading opens its page and travels to the heading, folds opened, the glance pane opening scrolled there; a link to its own page's heading travels in place, with no glance and no menu. Where a heading text repeats, the nearest one answers.

### The Link Menu

Right-clicking a link that names a page, wherever it sits, opens one native menu built from one model (`Core/Actions/connectionMenu.ts`), so the actions a link offers never depend on where it was found. The rows follow what the link is and where it sits:

| Action | Page Connection | Website Link |
| --- | --- | --- |
| **Open** | Preview · New Tab (reads *Open*, and leads, where the page already holds a tab; each dropped where its own surface is already showing the page) | Preview · Open In Browser (the in-app browser and the system one) |
| **Author** (editable surfaces) | Add Title / Edit Title · Edit Link | Rename · Edit Link |
| **Copy** | Copy Link · Copy Path | Copy Link |
| **Format** (editor only) | — | Format ▸ Full Link · Short Link · Page Title, rewriting the label alone |
| **Close, in the editor** | — | Remove Link (keeps the label as prose) · Delete |
| **Close, in a property cell** | Clear (· Remove on a card, dropping the property from the view) | Clear (· Remove) |

Copy Link on a connection naming a heading copies the whole fragment form. A read-only surface — a glance pane, an embedded page at rest — offers the opens and Copy Link. Inside a link's own syntax the menu stands down, leaving the native editor menu its spelling and substitution items.

### Autocomplete

One picker (`Core/MarkdownPM/Autocomplete/autocomplete.ts`, driven by `useConnectionAutocomplete`) serves every place a connection is typed — the page editor, table cells, and markdown block tiles — anchored below the caret and flipping above only to stay in the viewport. Arrows move the selection, Return commits, Escape closes, and each key falls through to the editor while the panel is closed. The pane shows as many suggestions as its height allows and scrolls to the rest, carrying the selection with it as the arrows move past the last visible row. A page row names its location beneath its title — the containers it sits in, drawn from the same ancestry every trail in the app reads. Accepting a page that opens an alias slot doesn't close the panel: the suggestions push aside on the shared `FrameSlide` and the remembered aliases take their place, so the two lists read as one surface rather than two openings. What it offers depends on where the caret is:

- **Inside `[[ ]]`** — Pages nexus-wide, matched by title prefix; an empty query lists nothing.
- **After a `#` or a `§` in a title** — the headings of the page that title names, nested by level; `[[#` lists the headings of the page being written in. Headings can also be assigned via the initial connection autocomplete panel via the sliding secondary panel accessed from clicking a hovered pages trailing chevron.
- **Inside `![[ ]]`** — the same pool, minus pages already embedded, the host chain, and titles the embed grammar can't express. Page-body editors only.
- **After a pipe** — the aliases this Page has been given before. Accepting a page whose aliases are worth offering opens the list without a keystroke when **Automatically Suggest Existing Aliases When Linking A Page** is on, and **Remove Title On Link Change** decides whether re-aiming a link drops the alias it wore. Each row carries a hover-revealed × that forgets that alias, and an alias names no location of its own, so it wears no trail.
- **Inside a markdown link's `( )`** — Pages; accepting one encodes the target and hands the caret to the label, pre-filled with the page's title and selected.

**Alias memory.** A Page remembers the aliases it has been given. The list is written when an alias is authored rather than derived by scanning bodies, so forgetting one sticks. It is keyed by page id, so it survives a rename, and lives in `nexus.db` as a per-machine accelerator — the alias itself is on the page in universal syntax, and losing the record costs a suggestion, never a link.

### In-Page Heading Resolution

**In-Page Heading Resolution** decides what reaches a heading on the page being written. Under Explicit, the default, link syntax does. Under Automatic, a bare `§Heading` in prose reaches one as well: the text after the `§` is read against the page's outline, and the longest heading it begins with is the target, provided the match ends at the run's end or at a non-word character. Typing a `§` in prose opens the current page's heading list on the keystroke, and picking a heading writes the bare text. The file keeps that text bare, so the page reads as prose in every other Markdown tool.

---

#### Known Issues

- **The cascade is per-file, not cross-file atomic.** A page pass failing partway reverts the target's rename, leaving already-rewritten bodies pointing at a title no page holds until the rename is re-run.
- **The markdown-block healing pass is best-effort.** Its failure is swallowed, and blocks stay stale until the next rewrite.
- **Connection rendering is written twice.** The editor's decoration layer and the resting property-cell renderer each map a connection's resolved state to its styling by hand, so the two can drift — today the cell omits the open-state glyph and target mark the editor draws.

#### Prospects

- **Duplicate disambiguation** — id-scoping so a connection to an ambiguous title can pick its target inline.
- **Backlinks** — a surface listing every Page that links to the current one. The content index records each relationship with its kind — body link, citation, embed, or frontmatter value — and its occurrence count, so the surface is a read over those rows; the surface doesn't exist.
- **Alias management** — curating a Page's remembered aliases in one place rather than forgetting them one at a time.
- **Wider targets** — Tasks and Events, and block anchors (`#^`).
