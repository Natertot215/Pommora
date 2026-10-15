## Connections & Aliases Restructure — Architecture Brief

**DATE:** 10-15-2026
**BASE:** `5272eb82f`
**PURPOSE:** The brief a fresh-eyes architect designs from. It holds the behaviors Connections and Aliases must deliver and the constraints they live under, and nothing of the current code, so the design isn't shaped by today's code. The design it produced sits beside it as *Connections & Aliases Restructure — Architecture Design*, and W22 of the *Pommora Codebase Audit* maps that design onto the code.

### The Task

Design the smallest system that delivers the behavior specification below (*§Behavior Specification*). Design from the behaviors alone: **don't open, grep, or read any source file in the repository.** Someone else maps the design onto the existing code afterward.

Design:
- **One grammar story:** how link syntax is defined, read, and written, including half-typed links the picker reads while the user types, empty parts the editor must still see while they're being edited, and the slots (title, heading, shown text) both syntaxes share.
- **One link shape per layer:** the span-level shape (offsets into text), the written shape (decoded strings), and the resolved shape (what it points at), with the step between each stated once.
- **One lookup** for "the link at this offset," and how its cost stays off the keystroke and caret-move paths.
- **One owner per responsibility:** grammar, validity rules for each slot, the "shown text only names its target" rule, the default label, resolution and the title index (usable by both processes), drawing, the picker's model and commit, alias authorship (when the editor decides an alias was given), the alias list's rules, storage and its write door, the rename rewrite, and property-value reading and writing.
- **Module and folder placement:** which modules exist, what each holds, and which process may import each, named by responsibility.
- **The picker's model:** what forms truly differ, and the smallest commit path covering both syntaxes.
- **Alias authorship:** weigh at least two designs (inferring authorship by comparing a link's text before and after an edit, and recording it at an explicit moment such as a pick or a commit) against every case in *§7. Alias Memory*, item 2, including a link typed in full before its target exists, an undo back to the original, a retarget that keeps an old-title label, and a heading retyped behind an alias it already showed. Pick one and say what it costs.
- **The focus model** between the editor and an alias rename field that must take real focus inside the picker, without timers or synthetic events.

For each **Open** item in the specification, state which answer the design assumes, what the other answer would cost, and a recommendation.

### Constraints

These are the codebase's hard rules:
- The host owns the machine. Shared logic both processes import doesn't import interface code (React, design-kit components). The window reaches the disk only through typed channels to the host, each answering a success-or-error envelope and never throwing across the boundary.
- Host-run code imports no React.
- Finite states are unions plus exhaustive switches; shared logic is hoisted rather than repeated.
- The read path is read-only by construction; mutations are clearly separable.
- No expensive work on every keystroke, caret move, or decoration build (nothing proportional to the document, the Nexus, or the links on screen), and no full rebuild or re-walk when an incremental or cached update works.
- Every external dependency sits behind a thin seam.

### Locked Product Decisions

- **Legibility:** the Nexus and its content stay understandable from the filesystem alone, app-agnostic. Links stay in universal syntax that other Markdown tools, Obsidian especially, read.
- **The Database:** holds only what's appropriate to a regenerative index, nothing that must persist through sync.
- **Concurrency:** recency-first resolution for cross-device conflicts, with per-section updates to synced configuration files.
- **Scalability:** decisions are judged against the platform growing: a mobile companion, sync, more link kinds, more editor surfaces.

### The Owner's Principles

Quoted verbatim:
- "Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebase."
- "Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly."
- "Make decisions based on actual necessity without sacrifices or being negligent, but don't overcomplicate or over-engineer things when its maintainability and complexity outweigh the actual purpose."
- "Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements."
- "Consider various perspectives, multiple alternatives, and potentially relevant opportunities before deciding upon an approach or isolating options."
- "Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct."
- "Each responsibility is clarified and reads totally intentional, and the next change of a kind has one obvious place to go, with no choice left between layers, helpers, or modules. Complexity relocated, renamed, or exchanged for new complexity of similar weight counts as no improvement."
- "We shouldn't simply port behavior that should be relocated when that's the better long-term approach."
- "We shouldn't leave anything half-done, deliberately divergent, or deferred when doing so would undermine cohesion, completion, and always-intended behavior."
- "Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered."
- "There's opportunity for ending this with 'less stuff' and 'fewer ways to do the same thing, or unifying things that are unnecessarily different'."
- "Zero 'latency' or performance issues should be introduced as consequences."
- "Odd-ones-out aren't allowed. Alignment work must reduce complexity and improve the codebase overall (net-less)."
- "They're the same picker… There's no 'needs another trigger' here. They're the same damn thing."
- "resolve this with totality at its simplest form and most coherent source"; "truly always intended, consistent, and architecturally aligned… total cohesion within the system as if there wasn't any asymmetry to begin with."

### The Mandate

- **Less to Carry:** no more functions, helpers, wrappers, types, layers, and call sites than the behaviors require, and no logic stated twice.
- **Less to Understand:** a reader finds what exists, where it lives, what owns it, and what calls it quickly, with no pass-through abstractions.
- **Clearer Rules and Boundaries:** each responsibility has one owner, and the next change of a kind (a new link syntax, a new editor surface, a new property type holding links) has one obvious place to go.
- **Always-Intended:** one implementation, one pattern, and one source of truth per thing; an exception carries its reason where a reader meets it.

### The Report

The design is written to *Connections & Aliases Restructure — Architecture Design* in this folder, with these sections: **Modules** (name, responsibility, contents, who may import it); **Shapes** (each with its fields and the one function producing it); **Rules and Their Owners** (a table of rule, owning module, and readers); **The Lookup and Its Cost**; **The Picker**; **Alias Authorship** (the alternatives weighed and the choice); **Focus**; **Open Items** (assumption, cost of the other answer, recommendation); and **What This Design Deliberately Leaves Out**. It's concrete enough to compare module by module with an existing codebase, and under 350 lines.

---

### Behavior Specification

What the system must do, stated as observable behavior, naming no existing code. Items marked **Open** are undecided product questions.

#### The Platform

- **Pommora** is a local-first desktop productivity app (Electron) with two processes: the **host** owns the disk and the user's folder (the **Nexus**), and the **window** draws the interface (React) and keeps an in-memory copy of the folder's tree. Every change to a Nexus file goes through one host-side mutation dispatcher that the window calls over a typed channel; the host never imports interface code.
- **Pages** are Markdown files carrying an `ID:` key. A page's title is its filename. Titles can't contain `|`, `#`, or `§` when created in the app, though a file named outside the app can.
- **The editor** is a CodeMirror 6 Markdown editor that runs in five places: a page body, a table cell inside a page, a markdown tile on a dashboard, a Text property value's multi-line pane, and a test harness. Each reads a different amount of Markdown: a page reads every block, a cell reads lists and inline marks, and a Text value reads inline marks only. The editor learns everything about the app (page lookup, aliases, menus, settings) through one host object it's given.
- **Property values** live in a page's YAML frontmatter. A **Link** property holds one address or one connection; a **Text** property holds free text that may contain connections inline.
- **The content index** is a local database the host keeps of which page mentions which (body links, embeds, citations, frontmatter values) and each page's headings. It's regenerative, always rebuildable from the files.
- **Page metadata** (icon, aliases, a lock flag) lives in synced JSON shards under `.nexus/metadata/`, keyed by page ID, so it survives renames and travels with the Nexus.

#### 1. Writing a Connection

1. Two syntaxes spell a connection, and the word covers both:
   - **Wikilink:** `[[Title]]`, `[[Title#Heading]]`, `[[#Heading]]` (a heading on the same page), `[[Title|Alias]]`, and an alias after a heading (`[[Title#Heading|Alias]]`).
   - **Markdown Link:** `[Label](Title)`, `[Label](Title#Heading)`, `[Label](#Heading)`. The target is percent-encoded so spaces and parentheses survive, and parentheses nest two deep.
2. A markdown target whose page half carries a URL scheme or a path separator is an **address**, never a page, so a URL can't reach a page by its last segment. A markdown target is a page first when a page holds that title, and an address when it's a valid address no page holds. A target naming a `.md` file is a page.
3. One normalization (trim, case-fold, Unicode NFC) applies to every title and heading on every side, so lookup, uniqueness, and every comparison agree.
4. A `§` typed where a title or a target's page half is being written becomes `#`, so files hold only `#`.
5. A wikilink alias can't contain `]` or a line break and is at most 255 characters. A markdown label escapes what Markdown requires and may contain anything else.
6. A label may not open with `^`, which marks a footnote.
7. Anything inside inline code or a fenced block is a sample: never drawn as a link, indexed, rewritten, remembered, or collapsed. Inside a raw HTML block (when HTML rendering is on), links draw as raw text and are neither collapsed nor remembered.
8. A `!` directly before a link:
   - `![[Title]]` alone on its own line in a page body is a **page embed**, a live, editable tile of that page. A page tiles once per document; a repeat, the page itself, or a form naming a heading or carrying an alias reads as a `!` followed by the connection.
   - `![Label](url)` alone on its line, with an http(s) scheme, is a **webpage embed**.
   - Anywhere else, `!` is a literal character followed by a link.
   - **Open:** whether an inline image's alt text (`![x](Page)`) counts as a label, remembered as an alias and filled when emptied. Today it's remembered but never filled.
   - **Open:** whether a lone `![[Page#Heading]]` or `![[Page|alias]]` line counts as an embed for the content index and the graph. Today the index calls it an embed while the editor draws it as a connection, so the graph omits it.
9. **Open:** whether `[](Page)` (an empty label) and `[x]()` (an empty target) are links. CommonMark reads `[](Page)` as a link. Today neither is drawn, indexed, or read as a Link value, though the editor still recognizes both while they're edited, to fill an emptied label and to list aliases in an empty one.
10. **Open:** whether a heading may contain `#` (`[[Page#C# Notes]]`). Obsidian reads extra `#`s as a nested heading path. Today the reader accepts it as one heading while the writer refuses to write it, so a heading renamed to `C# Notes` updates markdown links and strands wikilinks.

#### 2. Resolution

1. Every connection resolves against an in-memory index of page titles built from the tree:
   - **Resolved:** exactly one page holds the title.
   - **Ambiguous:** two or more pages hold it; the link is muted and inert until one is renamed.
   - **Phantom:** no page holds it; it stays literal and goes live as soon as one page takes the title.
2. A heading half reads against the target page's headings; a missing heading reads muted, as does the alias or label standing in for it. Where a heading text repeats, the nearest one answers.
3. A bare `#Heading` in a page body names that page. In a Link or Text value it names the page holding the value; with no holding page (a Space's value) it's refused.
4. The host also needs title lookups (whether any page outside a deletion still holds a title; which page answers a title after a restore). The host never decides whether a markdown target is a page or an address without the index. Paste As rows, computed in the host, treat a title-shaped target that isn't a valid address as a page.

#### 3. Drawing and Following

1. A connection draws as inline text in the connection color (Internal Link Color), never a chip, with its brackets and markers hidden until the caret enters it.
2. Revealed, an aliased connection shows both halves, the target styled as a target and the alias as prose, with a link glyph between them, colored when resolved and muted when not.
3. A link being typed takes the connection color from its first character, so it never reads as prose while a title is written; the typing color ends on the next bare caret move.
4. A caret resting on a finished link's closer doesn't reveal it; a click does.
5. A markdown link naming a page uses the connection color, destination, and glance. One naming a website keeps the external-link look (External Link Color). One naming neither reads as an unresolved connection.
6. **Heading Link Style** picks `Page § Heading` or `§Heading`. A heading on the same page reads as the heading alone, and an alias overrides both halves.
7. A phantom reads muted with its syntax showing, or as plain prose, per **Display Unresolved Links As Plain Syntax**, on every surface a link draws in.
8. Clicking opens the page per **Open Connections In Preview** (the Page Window) or **Open In Preview**, and ⌘-click opens a new tab. A link to a heading opens its page and travels to the heading with folds opened; a link to the same page's heading travels in place from prose, a table cell, or a footnote, with no glance and no menu.
9. Resting the pointer on a resolved connection raises the glance pane, a read-only render of the target scrolled to the heading when one is named. A context menu consumes the pending glance.
10. Every surface draws the same link the same way: page body, table cell (live and at rest), markdown tile, Text value (at rest and in its pane), Link value, card, and table view.

#### 4. The Link Menu

1. Right-clicking a resolved link anywhere opens one native menu from one model, with rows following what the link is and where it sits:
   - **Open:** Preview, New Tab, or Open In Browser for an address.
   - **Author,** on editable surfaces: Rename edits the shown text, adding one where there's none; Edit Title or Edit Link edits the target.
   - **Copy:** Copy Link copies the whole form, heading included; Copy Path for a page.
   - **Format,** for an address in an editor: Full Link, Short Link, Page Title, rewriting the label only.
   - **Close:** in an editor, Remove Link (keeping the shown text as prose) and Delete; on a property value, Clear, plus Remove on a card or in the panel.
2. An embedded page at rest offers the opens and copies. A glance pane and a page's history offer no link menu. A phantom, ambiguous, or invalid link offers none, and the right-click falls through to the editor's own menu. Inside a link's own syntax the menu stands down, leaving the native editor menu its spelling items.

#### 5. Editing Links in the Editor

1. **Empty Parts:** leaving an emptied alias drops its pipe, and leaving an emptied heading drops its `#`. An emptied markdown label is filled with what the link names (the heading, else the title). This happens only to a part an edit emptied; an empty part the caret merely passes through stays as written. It also happens on blur, without waiting on a timer. Today a wikilink's emptied alias collapses as soon as the caret leaves the alias, while a markdown label waits until the caret leaves the whole link. **Open:** whether both should wait for the whole link.
2. **Return** in an alias or a label rests the caret past the link's closer instead of breaking the line, except in code, in raw HTML, or outside an alias.
3. **`]`** typed in an alias or label is swallowed, since the closer is already there. `[` doesn't auto-pair there.
4. **Equations, Sections, and Bullets** typing transforms leave a link's brackets and destination literal (`>=` stays `>=` inside link syntax).
5. **Pasting** an address writes a link (Default Link Format picks the whole address, its bare domain, or the site's page title), and pasting over a one-line selection wraps it as the label. Pasted inside a link, an address or copied link retargets it, keeping its shown text unless the paste brings its own or Remove Title On Link Change is on. Inside a code span, a fence, or a destination still being written, the paste lands literally. The Page Title form writes the domain and swaps in the fetched title when it lands, if the link is still unedited. ⌘⇧V does the opposite of ⌘V.
6. **Heading Rename:** renaming a heading carries its links once the rename settles (the caret leaves the heading line, the editor blurs, or the page closes), from the old text to the final one in one pass, on the page, in every indexed file, and in every markdown tile. A rename made outside the app takes the same path when the index reads it. Where a heading with the old text still stands, or the new text matches another heading, nothing moves.

#### 6. The Picker

1. One picker serves every editor place where a connection is typed (page body, table cell, markdown tile, Text value pane), anchored below the caret and flipping above only to stay on screen. Its free edges resize it, remembered per machine, and its width fits its titles until resized. It shows as many rows as fit and scrolls the rest with the selection.
2. Typing `[[` or `[label](` opens it whether or not Pair Brackets is on, and an unclosed link reads as the link it will be once closed. Arrows move; Return or Tab picks, writing the closer where missing and resting the caret past the link; Escape closes and keeps the typed text; keys fall through to the editor while it's closed. A sole suggestion identical to the typed title opens nothing.
3. What it lists depends on the caret:
   - **In a Wikilink's Title:** pages matched by title prefix (exact first, then shortest, then A to Z); an empty `[[` browses alphabetically. Each page row shows its location beneath its title.
   - **After `#` or `§` in a Title or Target:** that page's headings, nested by level and deduplicated; `[[#` and `](#` list the current page's headings. A page row's trailing chevron (or ArrowRight) slides to that page's headings, and ArrowLeft backs out.
   - **After a Pipe, or in a Markdown Label:** the target page's remembered aliases, filtered by what's typed. A pick into a label is escaped and rests past the link. A website's label lists nothing.
   - **In a Markdown Target:** pages by the target's page half. Accepting encodes the target, fills an empty label with the title (or the heading's text for a heading pick), and rests past the link.
   - **In Prose Under Automatic In-Page Heading Resolution:** typing `§` (or `##` that becomes one) lists the page's headings, and a pick writes bare text.
4. **Remove Title On Link Change:** a pick that re-aims a link drops the shown text only when the link pointed at a page or an address as it read when the picker opened on it, so a label typed while the link is being written stays. **Open (Divergence Today):** paste-over-link and the Link field apply the setting without that "pointed somewhere" rule.
5. With **Automatically Suggest Existing Aliases When Linking A Page** on, accepting a page that has aliases opens its alias list without a keystroke. **Open (Divergence Today):** this happens only for wikilinks; a markdown pick never opens the label's list.
6. No press inside the picker takes the caret out of the editor, except a rename field in the alias list (*§7. Alias Memory*, item 7).

#### 7. Alias Memory

1. A page remembers the aliases it has been given. The list is written where an alias is authored, never derived by scanning bodies:
   - a body link of either syntax, typed into or picked, that shows the page an alias or label it didn't show before, once the caret leaves the link (also when the editor blurs, and when a Text value pane closes on Return with the caret still in the link);
   - a Link property value whose write lands and newly shows one;
   - an explicit add or rename in the alias list.
2. Nothing is remembered from a phantom, ambiguous, or address target; a link the caret only walked through; an undone edit; a link inside code or raw HTML; or shown text that only names the target (the page's title or the heading, as written now or before the edit, which covers a label kept through a retarget and a heading retyped behind an alias it already showed). A retarget that keeps a real alias gives the new page that alias.
3. A Text value's plain single-line field remembers nothing (accepted today). **Open:** whether it should match its pane.
4. **The List's Rules:** an alias is one name whatever its case, the newest spelling standing; it's never the page's own title; it's never blank, a line break, or a `]`; and it's at most 255 characters. Legacy duplicate spellings tidy on the page's next alias edit, and the list reads tidy before then. An alias a page rename turns into the new title stops showing.
5. **The Order Is the User's:** a used alias keeps its place, a new one joins the end, and a drag (or the keyboard move) reorders it; a filtered list doesn't reorder.
6. **One List, Two Places:** the picker's alias stage and the page panel's Aliases row (in the page's settings dropdown and the Page Window's side pane, below Properties under a divider, showing a count) show the same rows: the alias glyph, the name, and an always-visible ×. A page with no aliases opens no alias stage in the picker.
7. **Editing the List:**
   - × or the row menu's Delete deletes; a double-click on the name or the row menu's Rename renames in place; + adds a draft at the end with the caret seated.
   - In the picker, a single click inserts the alias once the double-click window (300 ms) passes, a keyboard pick inserts at once, and a keystroke or slot move inside the window cancels the pending insert; in the panel, a single click does nothing. The picker's + adds without inserting.
   - A draft closes only once its value lands and stays open on refusal; Escape on an empty draft closes it; a draft naming a held alias closes with no refusal; typing the title marks the draft invalid.
   - While an alias is being edited in the picker, the link keeps its active look, and Escape or the end of the edit returns the caret to the link's slot with the picker still open. Focus leaving for elsewhere closes the picker and collapses an empty slot as a blur does. An edit elsewhere that empties the list ends an in-progress edit cleanly.
8. **Edits never rewrite link text** and never touch a page file. The host applies each edit to the stored list, and two edits fired together both land, neither resurrecting what the other removed. The list is keyed by page ID (it survives a rename) and lives in the Nexus's metadata (it travels with the Nexus); losing it costs suggestions, never a link.

#### 8. The Rename Cascade

1. Renaming a page rewrites every body naming the old title, in both syntaxes and embeds, each heading re-emitted as written and each markdown target re-encoded; every markdown tile; the Link and Text values (under keys the property registry types as Link or Text) of pages and Spaces; and, for a title, the values a property Remove cached. Each file is confirmed under its own lock.
2. An alias or label that only showed the old title (or the old heading, for a heading rename) follows the rename; an alias that would repeat the new target drops; an alias naming something else stays.
3. Code spans and fences are never rewritten. A File property's `[[Basename.ext]]` values are a different domain and are left alone.
4. A rename or delete of one of two same-titled pages rewrites and strips nothing.
5. The cascade is per file, not atomic across files; a file it can't write keeps the old link, and the rename's warning counts the files left behind.
6. A heading rename never writes a wikilink it can't spell. **Open:** whether it should fall back to the markdown form, as other writers do, rather than leave the link stale.
7. **Open (Divergence Today):** the index relates links under every frontmatter key, but the cascade rewrites only registry-typed Link and Text keys, so a link under an unregistered key draws a graph edge and goes stale on rename.

#### 9. Deletion and the Trash

1. Deleting a page strips the Link values naming it from every page and Space outside the deletion, and the delete's notice counts what it reached. Bodies and Text values keep their connections, which read as phantoms.
2. Stripped Link values park in the page's newest Trash bundle; a restore returns each to the page or Space it came from while **Restore Links On Deletion** is on, re-titled if the page was renamed meanwhile, and never revives a link to a page that's gone.

#### 10. Link and Text Property Values

1. A Link value holds an address or one connection, read from a string or an unquoted YAML `[[Page]]`, which YAML parses as a nested list.
2. **Committing a Link Value:** a value written as a connection or a markdown link is a page when a page has that title, stored as a wikilink under the page's own capitalization with any alias carried. A title two pages share, or that no page holds, is refused at commit, and the field marks it invalid. Otherwise a valid address is an address (`[x](example.com)` commits as that address), and anything else is refused. `[[#Heading]]` commits on a page, naming its heading. An unchanged field commits nothing; emptying it clears the value; an alias repeating the title drops.
3. **The Link Field** opens on the target alone (`[[Title#Heading]]` or the address); the alias isn't shown there. It's a plain text field without the picker. **Open:** whether the Link field should host the shared picker like every other place a connection is typed.
4. **Rename on a Link Value** sets or clears its alias without touching its target. **Open (Divergence Today):** an edit converts a markdown-written page value to a wikilink, while Rename keeps markdown.
5. A page value draws exactly as a body connection does (tones, Heading Link Style, glance, click routing), and the property's Format doesn't apply. An address value keeps the property's **Format** (Full Link, Short Link, Page Title), **Underline**, and **Color**; a per-value alias overrides the Format; only Page Title fetches a page's title, once per address, cached per machine, and never when an alias exists. **Show Full Link** shows the target, not the alias.
6. **Sort and Filter** of a Link value use its shown text (alias, else title, else address), independent of Format. **Open (Defects Today):** a `[[#Heading]]` value reads as empty, and `[[Page#H]]` sorts by the page alone. **Open (Divergence Today):** a Text value sorts and filters on its raw link syntax, unlike a Link or File value.
7. A Text value at rest shows its first line with its connections live (open, glance, follow a rename, read as phantom when the page is deleted). Its pane hosts the full editor surface, the picker and alias stage included.
8. ⌘Z reverses a value write; a refused write leaves nothing to revert; undo never remembers aliases.

#### 11. The Index, the Graph, and Paste As

1. The content index records, per page, its body links, embeds, citations, frontmatter values, and Text-value links with counts, plus its headings. It's rebuilt from files whenever needed and catches renames made outside the app. The graph view's edges come from those relations, resolved in the window.
2. **Paste As** offers, for a copied connection or a markdown link naming a page: Connection (only when the target can be spelled as a wikilink), Markdown Link, and Embedded Page (only for a plain title on a blank line); for an address: the link forms, Plain Text, and Embedded Link. Picked inside a link, a form retargets it.

#### 12. Performance Floor

1. No work proportional to the document, the Nexus, or the number of links on screen runs on a keystroke or a caret move beyond what drawing already needs, and lines without link syntax cost nothing extra.
2. No full-Nexus walk on a rename when an incremental lookup answers; a rename reads only the files that mention the title.
3. An alias edit costs one shard write and doesn't rebuild unrelated indexes.
