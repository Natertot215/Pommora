## Connections

```
Connections
├── Syntax + Scope
├── Resolution
├── The Rename Cascade
├── Rendering
├── The Link Menu
├── Autocomplete
├── Known Issues
└── Prospects
```

A **Connection** is a link from one Page to another, written in the page's Markdown body. Two syntaxes spell one — the wikilink `[[Title]]` and the markdown link `[Alias](Title)` whose target names a page — and the word covers both. A connection may also be held as the whole value of a Link property, where it reads as a connection rather than an address. Connections are the only page-to-page relation Pommora has; Contexts are the relation layer, and there is no relation-type property. 

### Syntax + Scope

The grammar lives in `src/shared/connections.ts` (the wikilink) and `src/shared/links.ts` (the markdown link), shared code both processes read so the editor's tokenizer and main's rename rewriter can never disagree about what a link is. One normalization — trim, case-fold, NFC — is applied to every title on every side, so the scanner, the resolver, and the uniqueness check always agree.

- **Wikilinks** — `[[Title]]` resolves by its title. `[[Title|Alias]]` shows the alias and still resolves by the title; the title and its pipe join the hidden markers and reveal with the caret like any other syntax. A title can't contain `|`, and the name rule rejects one at creation.
- **Markdown links** — `[Label](Title)` names a page through its target, percent-encoded so spaces and parentheses survive. A target carrying a scheme or a path separator is addressing something outside the Nexus and is never read as a page title, so a URL can't reach a page by its last segment. The label is the author's own text.
- **Scope** — Pages are the only targets. Spaces are reached through Context links, and Tasks and Events aren't targets. A `!`-prefixed form standing alone on a line is not a connection: `![[Title]]` is a page embed and `![Label](url)` a webpage embed, each rendered as a live tile.[^1]

### Resolution

Every title the scanner finds is looked up in an in-memory map built from the page tree (`treeIndex` in the renderer, the content index in main), and lands in one of three states:

- **Resolved** — exactly one Page holds the title. The link is styled and navigable, and its target's id is known in memory.
- **Ambiguous** — more than one Page holds it, so no target can be chosen. The link is muted and inert until one side is renamed.
- **Phantom** — no Page holds it. The link stays literal bracketed text and goes live on the editor's next update once a single match exists.

### The Rename Cascade

Because a connection's identity is its title, renaming a page rewrites every body that names the old title. `src/main/connections/rewrite.ts` is the primitive — one pure pass over three patterns (wikilink, page embed, markdown link) plus the Link property values in frontmatter — and the cascade runs it over every file the content index says mentions the title, confirming each under its own lock, with assigned aliases also using the same cascading mechanism; Connections inside code syntax aren't cascaded. A File property's `[[Basename.ext]]` values are in a different domain and are left alone.[^2] Anything inside a code span or fence is a sample and is never rewritten.

### Rendering

A connection renders as inline text in the connection color (the **Internal Link Color** setting[^3]), never as a chip, with its brackets hidden until the caret enters it. Revealed, an aliased connection shows both halves — the target marked as a target, the alias as prose — with a link glyph between them that takes the connection color when the target resolves and reads muted when it doesn't. A connection being typed takes the color from its first character, so it never reads as prose while a title is being written. A markdown link that names a page uses the same color, leads to the same place, and shows the same hover card; one that names a website keeps the external-link treatment (External Link Color); and one that names neither keeps the broken-link treatment.

Clicking a connection opens the page, routed by **Open Connections In Preview** — the active tab by default, the floating preview when the setting is on, and ⌘-click always takes the other route.[^3] Resting on a resolved connection raises the hover card with a read-only render of the target.[^4] Ambiguous links keep the bracket treatment in a muted tone; a phantom is inert and reads either muted with its syntax showing or as plain prose, per **Display Unresolved Links As Plain Syntax**, which applies to page prose only — cells and other fields stay muted.

### The Link Menu

Right-clicking any link, wherever it sits, opens one native menu built from one model (`src/shared/connMenu.ts`), so the actions a link offers never depend on where it was found. The rows follow what the link is and where it sits:

| | Page connection | Website link |
| --- | --- | --- |
| **Open** | Open Preview · Open New Tab (reads *Open* where the page already holds a tab; each dropped where its own surface is already showing the page) | Open Preview · Open Browser (the in-app browser and the system one) |
| **Author** (editable surfaces) | Add Title / Edit Title · Edit Link | Rename · Edit Link |
| **Copy** | Copy Link · Copy Path | Copy Link |
| **Format** (editor only) | — | Format ▸ Full Link · Short Link · Page Title, rewriting the label alone |
| **Close, in the editor** | — | Remove Link (keeps the label as prose) · Delete |
| **Close, in a property cell** | Clear (· Remove on a card, dropping the property from the view) | Clear (· Remove) |

A read-only surface — a hover card, an embedded page at rest — offers the opens and Copy Link. Inside a link's own syntax the menu stands down, leaving the native editor menu its spelling and substitution items.

### Autocomplete

One picker (`MarkdownPM/autocomplete.ts`, driven by `useConnectionAutocomplete`) serves every place a connection is typed — the page editor, table cells, and markdown block tiles — anchored below the caret and flipping above only to stay in the viewport. Arrows move the selection, Return commits, Escape closes, and each key falls through to the editor while the panel is closed. What it offers depends on where the caret is:

- **Inside `[[ ]]`** — Pages nexus-wide, matched by title prefix; an empty query lists nothing.
- **Inside `![[ ]]`** — the same pool, minus pages already embedded, the host chain, and titles the embed grammar can't express. Page-body editors only.
- **After a pipe** — the aliases this Page has been given before. Accepting a page whose aliases are worth offering opens the list without a keystroke when **Automatically Suggest Existing Aliases When Linking A Page** is on, and **Remove Title On Link Change** decides whether re-aiming a link drops the alias it wore.[^3] Each row carries a hover-revealed × that forgets that alias.
- **Inside a markdown link's `( )`** — Pages; accepting one encodes the target and hands the caret to the label, pre-filled with the page's title and selected.

**Alias memory.** A Page remembers the aliases it has been given. The list is written when an alias is authored rather than derived by scanning bodies, so forgetting one sticks. It is keyed by page id, so it survives a rename, and lives in `nexus.db` as a per-machine accelerator — the alias itself is on the page in universal syntax, and losing the record costs a suggestion, never a link.

---

#### Known Issues

- **The cascade is per-file, not cross-file atomic.** A page pass failing partway reverts the target's rename, leaving already-rewritten bodies pointing at a title no page holds until the rename is re-run.
- **The markdown-block healing pass is best-effort.** Its failure is swallowed, and blocks stay stale until the next rewrite.

#### Prospects

- **Duplicate disambiguation** — id-scoping so a connection to an ambiguous title can pick its target inline.
- **Backlinks** — a surface listing every Page that links to the current one. The content index already records mentions; the surface doesn't exist.
- **Alias management** — curating a Page's remembered aliases in one place rather than forgetting them one at a time.
- **Wider targets** — Tasks and Events, heading and block anchors (`#`, `#^`).

[^1]: [[MarkdownPM]] §Embeds · [[WebviewPM]]
[^2]: [[PropertiesPM]] §File
[^3]: [[ConfigurationPM]] §Navigation · §Appearance · §Files & Links · §Pages & Editor
[^4]: [[InterfacePM]] §The Hover Card
