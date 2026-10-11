## Connections


A **Connection** is a link from one Page to another, written in the page's Markdown body or inside a Text property's value. Two syntaxes spell one — the wikilink `[[Title]]` and the Markdown link `[Alias](Title)` whose target names a page — and the word covers both. A connection may also be held as the whole value of a Link property, where it reads as a connection rather than an address. Connections are the only page-to-page relation Pommora has; Contexts are the relation layer, and there is no relation-type property. 

### Syntax + Scope

The grammar lives in `Core/Connections/connections.ts` (the wikilink) and `Core/Connections/links.ts` (the markdown link), shared code both processes read, and one walk over both syntaxes reads every link for the editor's tokenizer, the content index, and main's rename rewriter alike. One normalization — trim, case-fold, NFC — is applied to every title and every fragment on every side, so the scanner, the resolver, and the uniqueness check always agree.

- **Wikilinks** — `[[Title]]` resolves by its title, `[[Title#Heading]]` names a heading inside that page, and `[[#Heading]]` names a heading on the page it sits in; the fragment after the `#` is the heading's own text. `[[Title|Alias]]` shows the alias and still resolves by the title; the title and its pipe join the hidden markers and reveal with the caret like any other syntax, and an alias follows a fragment the same way. A title can't contain `|`, `#`, or `§`, and the name rule rejects them at creation; a `§` typed where a title is being written becomes `#`, so the file only ever holds `#`.
- **Markdown links** — `[Label](Title)` names a page through its target, percent-encoded so spaces and parentheses survive, and `[Label](Title#Heading)` and `[Label](#Heading)` carry the same fragments the wikilink does; a `§` typed in the target before its fragment becomes `#` the same way. A target whose page half carries a scheme or a path separator addresses something outside the Nexus and is never read as a page title, so a URL can't reach a page by its last segment. The label is the author's own text.
- **Scope** — A Page, or a heading within one, is a target. Spaces are reached through Context links, and Tasks and Events aren't targets. A `!`-prefixed form standing alone on its own line in a page body renders as a live tile: `![[Title]]` a page embed and `![Label](url)` a webpage embed. Anywhere else, and wherever no tile forms, it reads as a `!` followed by a connection or a link.

### Resolution

Every title the scanner finds is looked up in the page index, an in-memory map the renderer builds from the page tree, and lands in one of these states, a heading half reading against its page's headings and muted when none matches:

- **Resolved** — exactly one Page holds the title. The link is styled and navigable, and its target's id is known in memory.
- **Ambiguous** — more than one Page holds it, so no target can be chosen. The link is muted and inert until one side is renamed.
- **Phantom** — no Page holds it. The link stays literal bracketed text and goes live on the editor's next update once a single match exists.

Main resolves no link. Where it reads one without the index, as the Paste As rows do, a title-shaped target that isn't a valid address names a page.

### The Rename Cascade

A connection resolves by title, so renaming a page rewrites every body that names the old title, each fragment re-emitted as written. `Core/Connections/rewrite.ts` is the primitive — span edits over the one walk of both syntaxes, embeds included, with Link and Text property values riding the same rewrite as the body — and the cascade runs it over every file the content index relates to the title (its frontmatter values only under keys the registry types as Link or Text), every markdown tile, the Spaces whose Link or Text values name it, and, for a title, the values a property Remove cached, confirming each under its own lock, with assigned aliases also using the same cascading mechanism; Connections inside code syntax aren't cascaded. A File property's `[[Basename.ext]]` values are in a different domain and are left alone. Anything inside a code span or fence is a sample and is never rewritten.

Renaming a heading carries its links once the rename settles — when the caret leaves the heading line, the editor loses focus, or the page closes — on its own page, in every file the index names, and in every markdown tile, from the old text to the final one in one pass. A rename made outside Pommora takes the same path once the content index reads it, whether it lands while the app watches, during the catch-up after the watcher starts, or while the app was closed, when the next open carries it. Where a heading with the old text still stands, or the new text matches another heading, no link moves, and links to the old text read as missing.

Deleting a page strips the Link property values naming it from every page and Space the tree holds outside the delete, through the same sweep, and the delete's notice counts what it reached. Bodies and Text values keep their connections and read as phantoms. A restore from the Trash returns each value to the page or Space it came from while **Restore Links On Deletion** is on. A title another page still holds is left to that page: renaming or deleting one of two same-titled pages rewrites and strips nothing.

### Rendering

A connection renders as inline text in the connection color (the **Internal Link Color** setting), never as a chip, with its brackets hidden until the caret enters it. Revealed, an aliased connection shows both halves — the target marked as a target, the alias as prose — with a link glyph between them that takes the connection color when the target resolves and reads muted when it doesn't. A connection being typed takes the color from its first character, so it never reads as prose while a title is being written. A markdown link that names a page uses the same color, leads to the same place, and shows the same glance pane; one that names a website keeps the external-link treatment (External Link Color); and one that names neither reads as an unresolved connection does. A connection naming a heading reads per **Heading Link Style** — `Page § Heading`, or `§Heading` alone — a link to a heading on its own page reading as the heading alone, and an alias overriding both halves. A heading its page lacks reads muted, and so does the alias or label standing in for it.

Clicking a connection, a Link property's value included, opens the page, routed by **Open Connections In Preview** — the active tab by default, the Page Window when the setting is on, and a new tab on ⌘-click. Resting on a resolved connection raises the glance pane with a read-only render of the target. Ambiguous links keep the bracket treatment in a muted tone; a phantom is inert and reads either muted with its syntax showing or as plain prose, per **Display Unresolved Links As Plain Syntax**, on every surface a link draws in. A connection naming a heading opens its page and travels to the heading, folds opened, the glance pane opening scrolled there; a link to its own page's heading travels in place — from prose, a table cell, or a footnote — with no glance and no menu. Where a heading text repeats, the nearest one answers.

### The Link Menu

Right-clicking a resolved link, wherever it sits, opens one native menu built from one model (`Core/Actions/connectionMenu.ts`). The rows follow what the link is and where it sits:

| Action | Connection | External Link |
| --- | --- | --- |
| **Open** | Preview · New Tab (reads *Open*, and leads, where the page already holds a tab; each dropped where its own surface is already showing the page, unless the link names a heading) | Preview · Open In Browser (the in-app browser, offered for a web address, and the system one) |
| **Author** (editable surfaces) | Rename · Edit Title | Rename · Edit Link |
| **Copy** | Copy Link · Copy Path | Copy Link |
| **Format** (editors) | — | Format ▸ Full Link · Short Link · Page Title (for a web address), rewriting the label alone |
| **Close, in an editor** | Remove Link (keeps the shown text as prose) · Delete | Remove Link (keeps the label as prose) · Delete |
| **Close, on a property value** | Clear (· Remove on a card and in the Panel, hiding the property there) | Clear (· Remove) |

Rename edits the shown text, adding one where there is none, and Edit Title or Edit Link edits what the link points to. The editors are a page body, a table cell live or at rest, and a Text value's pane; a Link value's look follows its property's Format instead. Copy Link on a connection naming a heading copies the whole fragment form. An embedded page at rest offers the opens and the copies; a glance pane and a page's history offer no link menu. A phantom, ambiguous, or invalid link offers no link menu, and the right-click falls through to the editor's own menu where there is one. Inside a link's own syntax the menu stands down, leaving the native editor menu its spelling and substitution items.

### Autocomplete

One picker (`Core/MarkdownPM/Autocomplete/autocomplete.ts`, driven by `useConnectionAutocomplete`) serves every place a connection is typed — the page editor, table cells, markdown block tiles, and a Text property's TextPane — anchored below the caret and flipping above only to stay in the viewport. Typing `[[` or `[label](` opens it whether or not Pair Brackets is on, and an unclosed link reads as the link it will be once closed. Arrows move the selection, Return or a pick completes the link, writing its closer where it isn't written yet and resting the caret past it, Escape closes and leaves the typed text, and each key falls through to the editor while the panel is closed. The pane shows as many suggestions as its height allows and scrolls to the rest, carrying the selection with it as the arrows move past the last visible row. Its free edges resize it, and the size is remembered per machine; its width fits its titles until it's resized itself. A page row names its location beneath its title — the containers it sits in, drawn from the same ancestry every trail in the app reads. The alias list slides in only when a pick opens its slot, which keeps the panel open: the suggestions push aside on the shared `FrameSlide` and the remembered aliases take their place, so the two lists read as one surface rather than two openings. What it offers depends on where the caret is:

- **Inside `[[ ]]`** — Pages nexus-wide, matched by title prefix; an empty `[[` browses them alphabetically.
- **After a `#` or a `§` in a title or a markdown link's target** — the headings of the page that title names, read from the content index and nested by level; `[[#` and `](#` list the headings of the page being written in. Headings can also be assigned via the initial connection autocomplete panel via the sliding secondary panel accessed from clicking a hovered pages trailing chevron.
- **After a pipe** — the aliases this Page has been given before. Accepting a page whose aliases are worth offering opens the list without a keystroke when **Automatically Suggest Existing Aliases When Linking A Page** is on. Each row carries a hover-revealed × that forgets that alias, and an alias names no location of its own, so it wears no trail.
- **Inside a markdown link's `( )`** — Pages, matched by the target's page half; accepting one encodes the target, fills an empty label with the page's title, and rests the caret past the link. A heading accepted after the `#` is encoded the same way and fills an empty label with its own text.

**Remove Title On Link Change** decides whether a pick that re-aims a link, in either syntax, drops the alias or label it was showing. The pick re-aims the link as it read when the picker opened on it, and the shown text drops only where that link pointed at a page or an address, so a label or alias typed while the link is being written stays.

**Alias memory.** A Page remembers the aliases it has been given. The list is written when an alias is authored rather than derived by scanning bodies, so forgetting one sticks. It is keyed by page id, so it survives a rename, and lives in the page's metadata, so it travels with the Nexus — the alias itself is on the page in universal syntax, and losing the record costs a suggestion, never a link.

### In-Page Heading Resolution

**In-Page Heading Resolution** decides what reaches a heading on the page being written. Under Explicit, the default, link syntax does. Under Automatic, a bare `§Heading` in prose reaches one as well: the text after the `§` is read against the page's outline, and the longest heading it begins with is the target, provided the match ends at the run's end or at a non-word character. Typing a `§` in prose, or a `##` that becomes one, opens the heading list on the keystroke, in a table cell or a Text value listing the page it sits on, and picking a heading writes the bare text. The file keeps that text bare, so the page reads as prose in every other Markdown tool.

---

#### Known Issues

- **The cascade is per-file, not cross-file atomic.** A file it can't write keeps the old link while the rename stands, and the rename's warning counts the files left behind.

#### Prospects

- **Duplicate disambiguation** — id-scoping so a connection to an ambiguous title can pick its target inline.
- **Backlinks** — a surface listing every Page that links to the current one. The content index records each relationship with its kind — body link, citation, embed, or frontmatter value — and its occurrence count, so the surface is a read over those rows; the surface doesn't exist.
- **Alias management** — curating a Page's remembered aliases in one place rather than forgetting them one at a time.
- **Wider targets** — Tasks and Events, and block anchors (`#^`).
