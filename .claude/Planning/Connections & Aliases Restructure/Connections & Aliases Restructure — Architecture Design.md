## Connections & Aliases Restructure — Architecture Design

**DATE:** 10-15-2026
**SOURCE:** *Connections & Aliases Restructure — Architecture Brief* (base `5272eb82f`); designed from its behavior specification alone, with no source file read.

### Context

Connections are Pommora's page-to-page links (wikilinks `[[Page]]` and markdown links `[Label](Page)`, in page bodies, table cells, markdown tiles, and Link and Text property values), and Aliases are the alternate names a page remembers, kept per page ID in the Nexus's `.nexus/metadata/` shards. The Alias Management work (PM-151) and three follow-up commits that made a markdown label behave as an alias (`10fe6e38d`, `b565a7f37`, `5272eb82f`) were review-driven and patch-heavy, each fix answering the gap the one before exposed, so the surface ended with two markdown grammars, two target readers, two trackers sharing one listener, and most rules stated two or three times.

A workstream audit at `5272eb82f` read the whole surface: six scouts, a behavior specification, this design (written by a fresh-eyes architect from *Connections & Aliases Restructure — Architecture Brief* alone, with no code read), simplification, adversarial, and neutral reviews, and the six largest fixes typed on scratch worktrees to measure their nets. Its findings are W22 of the *Pommora Codebase Audit* (F-114 and F-116 to F-131), which maps this design onto the code. This document, the Brief, and W22 are the planning session's sources.

### Overview

The target is one link grammar both syntaxes share, one shape per layer (span, written, resolved), one resolver holding the page-before-address rule, the bare-heading rule, and the status, one tree walk and title index both processes import, one tracker for edits made inside a link, and one picker model keyed by slot that every place a connection is typed mounts. The data layer (the alias edit operation, its host-side apply, and the metadata shard) stays as it is. Landed in sequence, W22 measures about −230 production lines, or about −185 to −215 with the one-line field editors. Where this design and W22 differ, W22's findings carry the measured reasoning: the editor's link readers stay beside the scan rather than behind a span cache.

**Settled Decisions:**

- **Empty Parts:** `[](Page)` is a link, drawn showing its default label, indexed, and readable as a Link value; `[x]()` isn't a link. Both syntaxes tidy an emptied part when the caret leaves the whole link, and an already-empty part in a link that was edited tidies with it.
- **Headings in Wikilinks:** a wikilink heading never holds `#`, since Obsidian reads extra `#`s as a nested path; every writer, the heading rename included, falls back to the markdown form when a wikilink can't spell a slot, and the reader takes everything after the first `#` as the heading without modelling nested paths.
- **Embeds:** any link alone on its own line with `!` first, in either syntax, is an embed line that the graph, backlinks, and anything visualizing relationships leave out, while renames, recognition, and alias rules treat it as a link; whether it tiles is the editor's separate question. A `!` beside an in-paragraph link changes nothing, so an inline image's alt text is an ordinary label.
- **Heading Aliases:** an alias typed into a link that names a heading, in a body or a Link value, stays in the link and isn't saved to the page's aliases; the picker still offers the page's existing aliases there, and the alias list's **+** still adds.
- **The Picker:** a markdown pick opens the alias list as a wikilink pick does, and Return in a markdown link's destination, the moment an address is assigned, rests the caret in its label (an empty list for a URL, since aliases are kept per page). A `§Heading` run and `[[#Heading]]` take one approach in property values and cells, menu and glance included. The Link field and the Text field's single line host the picker as one-line instances of the editor the Text pane already mounts.
- **Link Values:** a Link value writes a wikilink wherever one can be spelled, on edit and Rename alike; one rule (Link, Text, or unregistered keys, never File) decides which frontmatter keys hold links, for the index and the rename cascade alike; addresses resolve as written.
- **Remove Title On Link Change:** the shown text drops only when the link pointed somewhere as it read before the edit, in the picker, in paste over a link, and in the Link field through the picker inside it.
- **Text Values in Views:** a Text value sorts and filters on its shown text.
- **The Resolver's Home:** `Core/Connections/`.
- **Kept As Is:** Remove Link's leftover text (`Title § Heading`); the typing color of a link being written.
- **Placement:** the heading-rename settle moves from `Guards/` to `Links/`.

### Principles

The owner's principles, verbatim; they decide every judgment the plan makes.

- "Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebase."
- "Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly."
- "Make decisions based on actual necessity without sacrifices or being negligent, but don't overcomplicate or over-engineer things when its maintainability and complexity outweigh the actual purpose."
- "Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements."
- "Consider various perspectives, multiple alternatives, and potentially relevant opportunities before deciding upon an approach or isolating options."
- "Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct."
- "Each responsibility is clarified and reads totally intentional, and the next change of a kind has one obvious place to go, with no choice left between layers, helpers, or modules. Complexity relocated, renamed, or exchanged for new complexity of similar weight counts as no improvement."
- "We shouldn't simply port behavior that should be relocated when that's the better long-term approach."
- "We shouldn't leave anything half-done, deliberately divergent, or deferred when doing so would undermine cohesion, completion, and always-intended behavior."
- "Time and time again, past sessions have hand-rolled, re-implemented, or created near-duplicate designs of what already exists instead of using established shared things, or changing the near-duplicates to allow reuse — that's one of the core perspectives we must consider when evaluating any approach."
- "Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered."
- "There's opportunity for ending this with 'less stuff' and 'fewer ways to do the same thing, or unifying things that are unnecessarily different'."
- "Odd-ones-out aren't allowed. Alignment work must reduce complexity and improve the codebase overall (net-less)."
- "They're the same picker… There's no 'needs another trigger' here. They're the same damn thing."
- "Ensure anything that resides within the data-layer and mutation lenses of this work does so cohesively and confidently coherent with the rest of the codebase and the intended paths."
- "Ensure the elements… are all reused implementations of what already exists and done so in the ways that honor their intentions as reusable building blocks."
- "resolve this with totality at its simplest form and most coherent source"; "truly always intended, consistent, and architecturally aligned… total cohesion within the system as if there wasn't any asymmetry to begin with."

### Constraints

The hard requirements every phase meets.

- **Less to Carry:** the codebase ends with no more functions, helpers, wrappers, types, layers, and call sites than the behaviors require, and no logic stated twice; new code earns its place by removing more than it adds, making a wrong behavior correct, or delivering a required behavior in its smallest form.
- **Less to Understand:** a reader finds what exists, where it lives, what owns it, and what calls it with less searching than before, through file names, file headers, and the feature documents alike; no pass-through abstraction survives that doesn't need to exist.
- **One Owner:** each responsibility has one owner, and the next change of a kind (a new link syntax, a new editor surface, a new property type holding links) has one obvious place to go.
- **Always-Intended:** nothing temporary, transitional, compatibility-kept, unreachable, or left over remains; one implementation, one pattern, and one source of truth per thing, and an exception carries its reason where a reader meets it.
- **The Number:** every net is measured, with removals and additions tallied separately; a phase that nets positive states exactly what the increase buys; the total is reported honestly against the 200 to 500 lines the audit set out to remove.
- **No Cost Added:** zero added latency on keystrokes, caret moves, or decoration builds, and zero findings a future audit would raise.
- **Codebase Hard Rules:** Core reaches the host only through `Core/Platform`; every channel is declared once in `Core/Contract/bridge.ts` and answers the `Result` envelope; host-run code imports no React; finite states are unions plus exhaustive switches; the read path is read-only by construction; no O(N), allocating, or layout-reading work on a high-frequency trigger, and no full rebuild or re-walk where an incremental update works; comments aren't authoritative.
- **Locked Decisions:** the Nexus stays legible from the filesystem alone, with links in universal syntax Obsidian reads; the database holds only a regenerative index; cross-device conflicts resolve recency-first with per-section updates to synced configuration; every decision is judged against the platform growing.
- **Neutral Gate:** the work ends with a `fable-high` neutral reviewer given only the pre-work commit, the post-work commit, and W22's one-paragraph intention, judging whether the after version is smaller, plainer, clearer about ownership, and deliberate throughout.

---

### Modules

Ten modules, nine under `Connections/` and one under the editor. Each exists because a process boundary or a consumer that imports nothing else forces the split; anything that could fold into a neighbor without crossing one of those lines has been folded. Files that import React or CodeMirror are named as window-only inside their folder, so the host-graph test fails the moment a shared file reaches them.

| Module | Responsibility | Contents | Importable By |
|---|---|---|---|
| `Connections/Grammar` | The one definition of link syntax: text ↔ span ↔ written. | `scanLine`, `linkAt`, `decode`, `write`, `normalize`, `isAddressShaped`, `encodeTarget`/`decodeTarget`, `escapeLabel`/`unescapeLabel`, slot validity, `isComplete`, `isEmbed`. | Host and window. |
| `Connections/Resolve` | What a written link points at. | `TitleIndex` (incremental, versioned), `HeadingIndex`, `classifyTarget`, `resolve`, `isAddress`. | Host and window; each process feeds its own instance from its own tree. |
| `Connections/Edit` | Pure transforms on a written link given its resolution. | `shownAlias`, `defaultShown`, `retarget`, `followRename`, `collapse`. | Host (cascade) and window (editor, picker, paste, fields, Paste As). |
| `Connections/Aliases` | The alias list's rules and its one write door. | `rules.ts` (`tidy`, `apply`, `AliasEdit` union, `isValidAlias`) shared; `AliasList.tsx` window-only, used by the picker stage and the panel row. | Rules: host and window. Component: window. |
| `Connections/Values` | Link and Text property values. | `readLinkValue`, `commitLinkValue`, `shownText`, `linksInText`, `holdsLinks(key, registry, value)`. | Host (cascade, strip, restore) and window (fields, cards, table views, sort and filter). |
| `Connections/Relations` | What one file contributes to the content index. | `relationsOf(markdown, frontmatter, registry)` → body links, embeds, citations, value links, headings, with counts. | Host (the index). Pure, so the window's tests may import it. |
| `Connections/Cascade` | Multi-file mutations that follow a page or heading rename, a deletion, and a restore. | `renameTitle`, `renameHeading`, `stripLinkValues`, `restoreLinkValues`; each file confirmed under its own lock; warning counts. | Host only, behind the mutation dispatcher. |
| `Connections/Surface` | What a resolved link offers wherever it draws: its look, its click routing, its menu. | `look(resolved, settings)`, `follow(resolved, modifiers, settings)`, `menuRows(resolved, place)`, `Connection.tsx` (the at-rest renderer), `connection.css`. | Window: the editor's decorations, cards, table views, Link and Text values, tiles, embeds. |
| `Connections/Picker` | The one picker: its model and its surface. | `pickerState` (pure reducer), `commit`, `Picker.tsx`, size memory. | Window: the editor extension and, through it, every surface a connection is typed in. |
| `MarkdownPM/Links` | The editor's link extension. | The span cache field, the active region and its settle, decorations, the typing color, keys (Return, `]`, `[`), paste, the picker binding, the host object's link half. | Window: the editor factory only. |

**The Editor Host Object:** the editor already learns the app through one object; this design adds nothing beside it. Its link half is `resolve(written)`, `headingsOf(id)`, `aliasesOf(id)`, `remember(id, name)`, `settings`, `openLink`, `linkMenu`, and `scope` (the holding page or `null`). The five editor places build it from one factory that differs only in `scope` and Markdown level, which is what lets one picker and one settle serve all of them.

**Channels:** four typed channels carry everything to the host, each answering the success-or-error envelope: `aliases.edit(pageId, AliasEdit)`, `values.write(pageId, key, value)` (the existing value write), `addresses.title(url)` (the host fetches a website's title once per address and caches it per machine; the paste handler's Page Title form and a Link value's Page Title format are its two readers), and the rename, delete, and restore mutations the cascade already sits behind. No channel is added for links themselves; the window resolves them locally, and each page's headings reach it on the relation feed the graph already consumes.

### Shapes

Four link shapes and three supporting ones. A step between two shapes is one function, named with the shape it produces.

#### Span

Offsets into raw text, produced by `Grammar.scanLine` (all spans on a line) and read back by `Grammar.linkAt(spans, offset)`. A link is line-bounded in both syntaxes: Return in a label rests past the closer rather than breaking the line (*§5.2*) and an alias can't hold a line break (*§1.5*), so a span never crosses a line, and that is what makes a per-line cache sound. CommonMark allows a multi-line label; the Grammar reads such a label as prose, and this is the one place the design diverges from CommonMark on purpose.

```ts
type Syntax = 'wiki' | 'markdown'
interface Slot { from: number; to: number }         // zero-length = present and empty

interface LinkSpan {
  syntax: Syntax
  from: number; to: number                           // opener through closer, or line end while unclosed
  closed: boolean
  bang: boolean                                      // a `!` directly before the opener
  block: 'prose' | 'html'                            // inside an HTML block; code never yields a span
  title: Slot | null                                 // wiki: before `#` or `|`; markdown: the target's page half
  heading: Slot | null                               // after the first `#`
  shown: Slot | null                                 // wiki: after `|`; markdown: the label
}
```

`scanLine(text, state)` returns `{ spans, state }`, where `state` is `'prose' | 'fence' | 'html'` and carries across lines. The scanner is the single authority on code: inline code and fenced blocks yield no span, in either process. A line without `[` and without a backtick or fence marker returns immediately. Where the editor's Markdown parser and the scanner disagree on an unclosed backtick, the scanner decides for links; that seam is named here and nowhere else.

#### Written

Decoded strings, produced by `Grammar.decode(span, text)` and turned back into text by `Grammar.write(written, prefer)`. `null` means the slot is absent; `""` means present and empty (`[[T|]]` against `[[T]]`), which collapse and the default label both key on.

```ts
interface WrittenLink {
  syntax: Syntax
  bang: boolean
  title: string | null                               // null when the target opens with `#`; an address-shaped target whole
  heading: string | null
  shown: string | null
}
```

`decode` splits a markdown target at its first `#` only when `Grammar.isAddressShaped(target)` is false; a target carrying a URL scheme or a path separator is one undivided `title` with `heading: null`, since a fragment there belongs to the address. `write` is the one writer. It percent-encodes a markdown target, escapes a label, and emits a wikilink when `prefer` is `wiki` and every slot is spellable there (title and heading free of `]]`, `|`, and line breaks; shown free of `]` and line breaks, at most 255 characters), falling back to the markdown form otherwise. The `§` → `#` substitution is an input transform in the editor, so `write` never sees `§`. `decode(scanLine(write(w)))` returns `w` for every valid `w`; that round trip is the grammar's one test of itself.

#### Resolved

What the link points at, produced by `Resolve.resolve(written, scope)` with `scope = { titles: TitleIndex, headings: HeadingIndex, holder: PageId | null }`.

```ts
type Target =
  | { kind: 'page'; id: PageId; title: string; heading: { text: string; found: boolean } | null }
  | { kind: 'ambiguous'; title: string; ids: PageId[] }
  | { kind: 'phantom'; title: string; heading: string | null }
  | { kind: 'address'; url: string }
  | { kind: 'refused' }                              // a bare `#Heading` with no holder

interface ResolvedLink { written: WrittenLink; target: Target }
```

`classifyTarget` runs first for a markdown link: an address-shaped title (the same `Grammar.isAddressShaped`) is an address, and its `url` is the title; otherwise a `.md` suffix is a page; a title the index holds is a page; a valid address is an address; anything else is a phantom page. A bare `#Heading` resolves to `scope.holder`. `found` is `false` both for a missing heading and for a page whose headings the window hasn't received yet, so the heading half reads muted until known rather than blocking on the host.

#### The Indexes

`TitleIndex` maps a normalized title to the page IDs holding it. It's fed by `add`, `remove`, and `rename` from tree events, never rebuilt from a walk after load. `HeadingIndex` maps a page ID to its normalized headings, fed in the host by `Relations` as files are indexed and in the window by the per-page heading records on the relation feed. Each carries a `version` that increments on every change, which is what the editor's resolution memo keys on. Both are plain data under `Resolve`; the host instance answers "does any page outside this deletion hold the title" and "which page answers after a restore," the window instance answers every draw.

#### The Alias Edit

```ts
type AliasEdit =
  | { kind: 'add'; name: string }
  | { kind: 'rename'; from: string; to: string }
  | { kind: 'delete'; name: string }
  | { kind: 'move'; name: string; to: number }
```

`Aliases.apply(list, edit, title)` returns the new list, tidied, or a refusal. The host applies each edit to the list as freshly read, so two edits fired together both land and neither resurrects what the other removed; the window never sends a whole list.

#### The Place

```ts
type Place = 'body' | 'cell' | 'tile' | 'textValue' | 'linkValue' | 'card' | 'tableView' | 'embed' | 'glance' | 'history'
```

`Surface.menuRows` switches on it exhaustively; `glance` and `history` return no rows.

### Rules and Their Owners

| Rule | Owner | Readers |
|---|---|---|
| Link syntax, both forms; which text is a link, an embed, a sample, or raw HTML. | `Grammar` | Everything below. |
| One normalization (trim, case-fold, NFC). | `Grammar.normalize` | `Resolve`, `Aliases`, `Edit`, `Values`. |
| Slot validity: alias and heading spellability, label escaping, the `^` footnote rule, the 255 limit. | `Grammar` (slot validity, `write`) | Picker commit, Link field commit, the alias list (`isValidAlias` calls the same check). |
| Which syntax to write; markdown fallback when a wikilink can't spell the target. | `Grammar.write` | Picker, paste, cascade, Values commit, Paste As. |
| Page, ambiguous, phantom, address, refused. | `Resolve` | Surface, picker, Values, cascade, Paste As, the graph. |
| Heading lookup, nearest match, muted until known. | `Resolve` | Surface, picker, cascade. |
| Shown text only names its target. | `Edit.shownAlias` | Editor settle, Values commit, `followRename`. |
| The default label (heading, else title). | `Edit.defaultShown` | Picker commit, collapse, Surface (drawing `[](Page)` at rest). |
| Retarget keeps or drops shown text (Remove Title On Link Change applies only when the link pointed somewhere). | `Edit.retarget` | Picker, paste over a link, the Link field, Paste As inside a link. |
| An alias or label follows a rename, drops when it would repeat the new target, stays when it names something else. | `Edit.followRename` | Cascade (titles and headings), Values restore. |
| Emptied parts collapse; an emptied markdown label fills. | `Edit.collapse` | Editor settle. |
| Alias list: one name per case-fold, newest spelling, never the title, never blank, at most 255, tidy on read. | `Aliases.rules` | The host's shard write, the picker stage, the panel row. |
| The order is the user's. | `Aliases.apply` (`move`) | `AliasList`. |
| Link value read, commit, refusal; shown text for sort and filter. | `Values` | Fields, cards, table views, cascade, trash. |
| Which frontmatter keys hold links; a File-typed key never does. | `Values.holdsLinks` | `Relations` and `Cascade`, so the graph and the rename agree by construction. |
| A heading rename moves nothing while the old text still stands or the new text matches another heading; the same call serves a rename made in the editor and one the index reads from outside. | `Cascade.renameHeading` | The editor's heading region (through the host) and the index's reconcile of a re-indexed page whose heading list lost one text and gained one. |
| What one file contributes to the index. | `Relations` | The host's index. |
| Per-file rewrite, locking, and warning counts. | `Cascade` | The mutation dispatcher. |
| One look, one click route, one menu per place. | `Surface` | Every drawing surface. |
| The picker's stages and its commit. | `Picker` | The editor extension. |
| Leave, blur, close: when an edit settles. | `MarkdownPM/Links` (the active region) | Collapse, authorship, heading rename. |

### The Lookup and Its Cost

**The Cache:** `MarkdownPM/Links` keeps one `RangeSet<LinkSpan>` in a state field, with a parallel per-line entry-state array for the scanner. On a transaction the set is mapped through the changes, which moves every untouched span for free, and the scanner reruns only from the first changed line, continuing past the changed range only while a line's resulting state differs from its cached entry state (a fence opened or closed above). On a keystroke in prose this is one line; on a keystroke that opens a fence it runs to the fence's close.

**The Lookup:** "the link at this offset" is `set.between(offset, offset)`, logarithmic in the spans in the document, and it's the only way any part of the editor asks the question: the active region, the keymap, paste, the picker, the menu, and the context-menu stand-down all read it. The picker's "link being typed" is the same span with `closed: false`; the reader is lenient by construction and `isComplete` is the predicate drawing and indexing apply on top, so there's one reader for finished and half-typed links.

**Drawing:** decorations are built for the visible ranges only, from the cached spans, so the cost per build is the links on screen, which is what drawing already needs. Each span's resolution is memoized by its normalized written key against `TitleIndex.version` and `HeadingIndex.version`, so a caret move resolves nothing and an index change re-resolves a link once when it next draws. The "a page tiles once per document" rule is a set of first embeds derived from the embed spans in the whole `RangeSet` whenever an embed span changes, which costs the embeds, never the document.

**Nothing Else on the Hot Path:** the active region is one object mapped through changes. Alias memory, collapse, and heading rename run on settle, not on keystrokes. The cascade reads the files the index relates to the title and no others. An alias edit is one `apply` and one shard write.

### The Picker

**What Truly Differs:** three stages, decided by which slot the caret sits in. Syntax changes only how a pick is spelled, and `Grammar.write` already owns that.

```ts
type PickerSource =
  | { kind: 'link'; span: LinkSpan; slot: 'title' | 'heading' | 'shown' }
  | { kind: 'prose'; from: number; to: number }        // `§` in prose under automatic heading resolution

type Stage =
  | { kind: 'pages'; rows: PageRow[] }
  | { kind: 'headings'; page: PageId | 'self'; rows: HeadingRow[] }
  | { kind: 'aliases'; page: PageId; rows: AliasRow[]; editing: { name: string; draft: string } | null; pendingInsert: string | null }

interface PickerState { source: PickerSource; stage: Stage; query: string; selected: number }
```

`title` lists pages (exact, shortest, A to Z; empty browses), `heading` lists the target page's headings (`self` when the title is absent), and `shown` lists the target's aliases filtered by the query; a `shown` slot on an address lists nothing and the picker doesn't open. A page row's chevron or ArrowRight re-derives the state as a `heading` stage for that page; ArrowLeft returns. The reducer is pure and tested without a DOM.

**The Commit Path:** one function. `Picker.commit(state, pick)` produces the written link by setting the picked slot on `decode(span)` (a page sets `title`, a heading sets `heading` with the page's title when sliding, an alias sets `shown`), passes it through `Edit.retarget` (which applies Remove Title On Link Change against the resolution the picker opened on) and `Edit.defaultShown` for an empty markdown label, and hands `Grammar.write(written, span.syntax)` to the editor as one replacement of `span.from..span.to` with the caret past the closer. A `prose` source writes the heading's bare text. Both syntaxes, every stage, one path; a markdown pick lists aliases afterward exactly as a wikilink pick does, because the post-pick alias stage is one rule in the reducer (open when the picked page has aliases and the setting is on), not per syntax.

**Keys:** while the picker is open the editor's keymap routes arrows, Return, Tab, and Escape to the reducer and lets everything else fall through; a sole suggestion identical to the typed title closes the picker. The 300 ms double-click window is the one timer in the design: a single click sets `pendingInsert`, a keystroke or slot move clears it, and the window's end inserts; the panel's list passes no insert handler and so never sets it.

### Alias Authorship

Alias memory, empty-part collapse, and heading rename all have the shape "take an image when the caret enters, compare when it leaves, act once," so the editor owns one mechanism, the active region, and the three are its readers.

```ts
type Region =
  | { kind: 'link'; span: LinkSpan; before: WrittenLink | null; target: Target }
  | { kind: 'heading'; line: number; before: string; links: { span: LinkSpan; before: WrittenLink | null; target: Target }[] }
```

The region is set when the caret enters a span or heading line, or when a span appears under the caret as it's typed (then `before` is that half-typed self). A heading line is the region whenever the caret is on one, carrying the before-images of the link spans inside it, so `## See [[Page]]` settles its heading and its links together when the caret leaves the line. It's mapped through changes and settles when the caret leaves it, when the editor blurs, when a Text pane closes on Return, and when the page closes. A pick that creates a link and rests past its closer in one transaction settles against the span as it read before that transaction. On settle, in order: `Edit.collapse(after, before)` queues one transaction if the visit edited the link and left a part empty (a link the caret only walked through changes nothing); `Edit.shownAlias(after, before)` returns a name or `null`, and a name goes to `host.remember`; a heading region whose text changed and whose old text no longer stands on the page runs `renameHeading` through the host.

**The Rule:** `shownAlias(after, before)` returns `after.shown` when `after.target` is a page, the link names no heading, `after.shown` is non-empty, `after.shown` normalizes to neither the target's title as resolved now nor `before`'s title, the link isn't inside an HTML block, and either the shown text or the target changed. Walking through returns `null` because nothing changed; a phantom, ambiguous, or address target fails the first test; a link naming a heading never remembers, since an alias typed there stays in the link (the picker still offers the page's existing aliases, and a proposed **Save Heading Aliases** setting would opt in); a label kept through a retarget fails against `before`'s title; a retarget that keeps a real alias passes, so the new page gets it. The same function runs after a Link value write lands, with `before` the value as last read, so the editor and the field share one authorship rule.

**The Alternatives Weighed:**

- **Explicit Recording at a Pick or Commit:** record the alias when the picker inserts it or the field commits. It carries no snapshot, but it misses a link typed in full and closed by typing, it records before the caret leaves and so must un-record on an undo it can't see, and it fires on a Text pane's commit where the brief asks for leave-time. It fails two of the four named cases outright.
- **A Marked Candidate Confirmed on Leave:** flag the link at a pick and record on leave. It adds a flag the comparison already makes redundant; every case the flag catches, `before` catches.
- **Comparison on Leave (chosen):** the region above.

**What It Costs:** one state field holding one region, mapped through every transaction (a constant, not the document). A link typed in full before its page exists is never remembered, since it settles as a phantom and a later walk-through changes nothing; the owner can re-enter and retype it. An alias recorded on leave and undone after leaving stays in the list, because *§10.8* forbids recording on undo, not un-recording; losing it costs a suggestion, which the list's × removes.

### Focus

The picker's surface prevents default on `mousedown`, so clicks on rows never move focus and the editor keeps it; keys reach the picker through the editor's keymap. The one exception is the alias rename field. It takes real focus only from the explicit handler of a double-click, the row menu's Rename, or `+`, and it does so synchronously in that handler, with the editor's selection saved into the region at the same moment.

The editor's `focusout` handler is the single owner of "focus left." It reads `relatedTarget`: inside the picker's root, the picker is holding focus and the region is not settled, so the link keeps its active look; outside the picker's root or `null`, the picker closes and the region settles as a blur. When the field's edit ends (Return lands the value, Escape, or the value is refused and then abandoned), the field's own handler calls the editor's `focus()` and restores the saved selection, synchronously, and the picker stays open on its alias stage. An edit elsewhere that empties the list dispatches the stage's `editing: null` through the reducer, which unmounts the field; the field's unmount returns focus the same way. No timers, no synthetic events, and no focus bookkeeping anywhere but the handler and the region.

### Open Items

#### Every Place a Connection Is Typed Is the Same Editor Surface

This one decision answers *§7.3* (the single-line Text field), *§10.3* (the Link field and the picker), *§10.4* (edit against Rename on a Link value), *§6.4*'s Link-field half, and *§6.5* (a markdown pick and the alias stage).

- **Assumed:** the Link field and the single-line Text field are inline-level editor instances built by the same factory, with Return committing. The Link field opens on the value's full written form, alias included, so an alias picked from the stage has text to land in and Rename on a value is the same edit as typing one; Show Full Link still governs the at-rest display alone. Both fields host the picker, the active region, and `Edit.retarget`, so Remove Title On Link Change, alias memory, and the post-pick alias stage behave identically in a body, a cell, a tile, a pane, and both fields. A Link value commits through `Values.commitLinkValue`, which writes with `Grammar.write(written, 'wiki')` whether the edit came from the field or from Rename, so a markdown-written page value becomes a wikilink on either path, and both paths are one path.
- **Cost of the Other Answer:** keeping the fields as plain text fields keeps five divergences alive, each needing its own copy of the retarget rule and its own answer to alias memory, and leaves the owner's "same picker" principle false in two places.
- **Recommendation:** adopt. The cost is one more editor instance per field, which the factory already makes.

#### Paste Over a Link and Remove Title On Link Change

- **Assumed:** paste over a link goes through `Edit.retarget` with the link's resolution before the paste, so the "pointed somewhere" rule applies to it as to a pick.
- **Cost of the Other Answer:** a second retarget rule.
- **Recommendation:** adopt; it's free once `retarget` is the one owner.

#### Collapse Timing

- **Assumed:** both syntaxes collapse an emptied part when the caret leaves the whole link, on blur, or on close, because that's when the one settle fires.
- **Cost of the Other Answer:** a per-part region for wikilinks beside the per-link region, two settle points, and a wikilink alias that can't be revisited within the link once emptied.
- **Recommendation:** wait for the whole link in both.

#### Headings Containing `#` and the Wikilink Fallback

*§1.10* and *§8.6* are one writer rule.

- **Settled:** a wikilink heading never holds `#`, since Obsidian reads `[[Page#C# Notes]]` as a nested heading path; `Grammar.write` emits a wikilink only when it can spell every slot, `#` in a heading included, and the markdown form otherwise, and the cascade, like every writer, calls `write`, so nothing is ever left stale. The reader takes everything after the first `#` as the heading and doesn't model nested paths.
- **Cost of the Other Answer:** writing `#` into a wikilink heading reads differently in Obsidian, and reading nested paths is new machinery across the heading span, the index, and travel.
- **Outcome:** the owner's ruling.

#### Empty Label and Empty Target

- **Assumed:** `isComplete` requires a target; `[](Page)` is a link (CommonMark agrees) that draws its `defaultShown` at rest in the connection color, is indexed, and resolves; `[x]()` is prose. While edited, both are spans, which is how the picker lists aliases in an empty label and collapse fills one.
- **Cost of the Other Answer:** treating `[](Page)` as prose makes a link that the editor recognizes but the index doesn't, and leaves CommonMark-valid links invisible to the graph.
- **Recommendation:** adopt.

#### Inline Image Alt Text

- **Assumed:** `![x](Page)` outside an embed line is a `!` followed by a link whose label is `x`; `shownAlias` therefore applies, and `collapse` fills an emptied one, because the grammar sees no difference and inventing one costs a flag.
- **Cost of the Other Answer:** a `bang`-aware branch in `shownAlias` and `collapse` for a form the app never renders as an image.
- **Recommendation:** adopt; the `bang` flag stays on the span for the embed rule alone.

#### Embed Lines and the Graph

- **Settled:** any link alone on its own line with `!` first, in either syntax, is an embed line: one predicate, which `Relations` asks for the graph and backlinks, leaves it out of them, while renames, recognition, and alias rules treat it as a link. Whether the line tiles is the editor's separate rendering question (`Grammar.isEmbed(span, tiledAbove)`: a title alone, not the page itself, and the page's first tile in the document); a lone line that can't tile draws as a `!` followed by the connection and still stays out of the graph.
- **Cost of the Other Answer:** counting embed lines as connections drops one predicate and the embed relation kind but draws a graph edge for every tile.
- **Outcome:** the owner's ruling.

#### Unregistered Frontmatter Keys

- **Assumed:** `Values.holdsLinks(key, registry, value)` is the one answer to "does this key hold links," read by `Relations` and `Cascade`; a key is link-bearing when the registry types it Link or Text, or when it's untyped and its value reads as a complete connection; a File-typed key never is, so `[[Basename.ext]]` values stay their own domain. The cascade rewrites every value the index relates, by reading the index's relation records rather than re-deciding.
- **Cost of the Other Answer:** indexing only registry-typed keys hides the links an Obsidian-authored vault carries under its own keys from the graph.
- **Recommendation:** adopt; the graph and the rename then agree by construction.

#### Link Value Sort and Filter

- **Assumed:** `Values.shownText(value, scope)` is alias, else the title with the heading under Heading Link Style, else the address, for Link and Text values alike; a `[[#Heading]]` value reads as its heading. Text values sort and filter on their rendered first line, with each connection replaced by its shown text.
- **Cost of the Other Answer:** three sort keys for one kind of content.
- **Recommendation:** adopt; the two defects fall out of the one function.

### What This Design Deliberately Leaves Out

- **A Link Channel:** the window resolves every link against its own indexes; nothing crosses to the host to draw.
- **A Second Reader:** no regex beside the scanner in the picker, the paste handler, the index, or the cascade; each reads spans.
- **A Second Writer:** no module spells a link but `Grammar.write`; Values, the cascade, paste, Paste As, and the picker call it.
- **Per-Syntax Branches Past the Grammar:** `Edit`, `Resolve`, `Surface`, `Picker`, and `Aliases` see written links and never ask which syntax wrote them, except `Picker.commit` passing the span's syntax to `write`.
- **Alias Derivation From Bodies:** the list is written where an alias is authored and read from the shard; no scan rebuilds it.
- **Un-Recording on Undo:** stated under *§Alias Authorship*.
- **A Nested Heading Path:** `#` in a heading is text; the design doesn't model Obsidian's nested path.
- **Timers:** the double-click window is the only one, and it lives in the picker's reducer.
- **New Settings:** every setting named in the brief is read where the table above says; none is added.
