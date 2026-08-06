## MarkdownPM

Pommora's in-house Markdown editor for Pages: a dynamic-syntax editor on a web-native (CodeMirror 6) substrate. 
### Architecture — Three Strata, One Owned

| Stratum | React uses | Ownership |
|---|---|---|
| Text substrate (caret, IME, undo, viewport) | CodeMirror 6, behind the `editor/` seam | dependency |
| Behavior layer (syntax, styling, detection, transforms) | hand-written | **ours** |
| Parser / AST (GFM tree + per-node offsets) | micromark / mdast, behind `parser/` | dependency |

The behavior layer is pure logic over `(doc string, selection, tokens, decorations)` — it never imports CodeMirror or micromark; two adapters (`editor/`, `parser/`) bridge it. CM6 decorations (mark / widget / replace) apply the styling. Swapping either dependency touches only its seam.

### The Dynamic-Syntax Pattern

A construct's Markdown markers are **revealed** (literal editable text) when the caret is inside its token and **hidden / decorated** when it leaves; chrome (HR rule, blockquote card, code background, bullet / checkbox glyph) is a render-side decoration that never exists on disk. Reveal is caret-scoped two ways: **line-scoped** for inline marks, headings, and the thematic break, **marker-local** for the list glyphs — only a caret sitting on the marker itself brings the raw `- [ ] ` back. Box chrome (blockquote, callout) is **always shown**. One detection function per construct feeds both the hide logic and the chrome — no "marker hidden but no chrome" half-states.

### Source-of-Truth Contract

- **Disk == `EditorState.doc` string, always** — no reconstruction layer; survives an editor swap.
- **Display ≠ source** — the same bytes render differently; the editor never auto-tidies source (mutations are user-initiated only).
- **Binds to the body only** — frontmatter is stripped on load, held on the model, re-serialized from the typed object on save (foreign keys / comments preserved). YAML is never visible or destroyable in the editor.
- **Display-only UI state lives in `nexus.db`, never frontmatter** — e.g. heading folds, keyed by page id, per-machine.

### Constructs

- **Inline marks** — bold / italic / bold-italic, strikethrough, inline code, links, Connections; caret-aware marker reveal; heading-aware sizing; suppressed inside code + literal targets.

- **Headings** — H1–H6 on the em scale; `#` reveals on caret. The context menu offers Paragraph plus H1–H5. **Foldable** via a chevron in the fold gutter reusing the sidebar's disclosure language (chevron on hover when open, persistent when folded); fold state is per-machine, in `nexus.db`.

- **Lists** — bullet (`-` → `•`), `+`, arrow `→` (typed `->`), ordered, and GFM task checkboxes — all sharing one indent/spacing zone and the full behavior set (continuation, indent, drag). On disk all are portable CommonMark except the arrow line (`→ text`, a Pommora render directive legible anywhere but only rendered as a list inside Pommora). **Drag-to-reorder by the glyph**: grab a list glyph to move the item with its nested sub-block; dropping beside a shallower item re-nests, ordered runs renumber — one source-line transaction, one undo. Pure logic in a unit-tested `editor/listDragModel.ts` under the `editor/listDrag.ts` gesture.

- **Outliner rails** — an optional hairline guide down each nested run (personalization `outlinerLines`, → [[ConfigurationPM]]). One rail per **ancestor** level, emitted as a side widget per nested line and drawn **run-based** — square through the middle so segments connect, rounded caps and an end-gap only at each run's first/last line, exactly the blockquote bar's first/last trick. A rail centres on its **ancestor's** glyph (so a nested checkbox under a bullet takes the bullet's centre, not its own) and paints on the neutral segment-separator token. **Scoped to dash-bullets + checkboxes.** Run + type logic in `decorations/intent.ts` (unit-tested), the widget in `editor/decorations.ts`, all knobs in `Styles.css`.

- **Code** — inline and fenced share the mono family and nothing else: inline code wears the code colour over a code-tinted fill, a fenced block a neutral secondary fill. A fence's info word (```` ```yaml ````) types the block: a curated language set (JSON, YAML, JS/TS, CSS, HTML, Swift) gets a real nested parse whose tokens color as spectrum-solid pastels — each solid mixed toward system-white, the whole palette one KNOB block in the stylesheet — while a bare fence gets no parse and keeps the plain mono look. The backticks themselves always show; a typed block hides only its info word and wears its language top-right as `<TYPE>` at the code colour — plain text in the block's own mono — and the caret directly on the fence line trades the chrome back for the raw info word. The per-nexus **Show Line Count In Code Blocks** setting (Settings ▸ Pages) numbers a block's content lines at the first-character position as a widget. 

- **Blockquote** — always-show rounded card + accent bar. Block constructs nest inside it (and inside callouts): the `>` prefix is stripped and the inner line renders as its own construct — `> - item` is a real bullet, `> # h` a heading, `> ---` an inner rule. Same renderer at the top level or behind a prefix (no exclusivity).

- **Callout** — a `> [!callout]` blockquote rendered as a **bordered, gutter-width box**, distinct from the quote card; typed with the `||` shorthand, coexists with plain quotes (the tag discriminates). **Detection is per-HEAD** — every `[!type]` line starts its own box, so adjacent / pasted / nested heads never merge with a leaked tag; an invalid tag falls back to a plain quote. Block constructs (lists, headings, separators, fenced code, nested quotes) render **inside** the box, their indent measured from one shared `--li-origin`. The hidden `> [!type] ` head is an **atomic range** (the caret can't enter, so typing / delete can't demote it to a quote), and a **transaction guard** keeps any delete from eroding a body line's `>` prefix out of the box; Shift+Enter stays in. On disk it's a plain, portable blockquote.

- **Thematic break** (`---`) — caret-aware full-width rule; no setext interpretation, ever.

- **Connections** (`[[Title]]`) — title-only, rendered as **styled colored inline text (never a chip)**, three states (resolved / phantom / ambiguous) wired to the live `@shared/connections` layer; click navigates, and a connection restyles as its target appears or is renamed. Plus the `[[` **autocomplete panel** (glass popup at the caret, prefix-matched, keyboard-driven), one `useConnectionAutocomplete` hook shared by the page editor and table cells.

- **External links** (`[text](url)`) — title-only at rest. Valid vs invalid by a static URL check shared with the opener (`@shared/links`, so color can't disagree with what opens): valid → link color + underline; invalid → dimmed with `[brackets]` shown. Pointer cursor + navigation (`shell.openExternal`) on valid titles only.

- **Caret + hover cursor** — a **drawn caret** (a CM `layer` over a transparent native caret, native selection untouched) with a smooth symmetric fade instead of Chromium's hard blink, plus a custom I-beam hover cursor. `editor/caret.ts` is the CM layer; the caret is one app-wide identity, so its knobs and the overlay that paints the same bar over native text fields sit in the global caret layer.

### Tables

GFM pipe-tables render as an editable HTML table — a CodeMirror **block-replace widget** over the canonical GFM source, which stays in `EditorState.doc`. Chosen over a ProseMirror table because portable GFM itself caps the feature set (rectangular cells, per-column alignment, inline-only content) — a widget over the source reaches that ceiling with far less surface and lossless round-trips. A React port of [`ckant/codemirror-markdown-tables`](https://github.com/ckant/codemirror-markdown-tables) (MIT); Pommora-only additions are the dash-count width columns + width-resize, the heading-column toggle, the structure + merge guards, page-scoped in-cell undo, and the OS-native grip menu.

- **Live cell editors** — the focused cell mounts a nested CodeMirror editor reusing the main editor's inline rendering (caret / IME / marks work in-cell); every resting cell renders through that same inline-token renderer with no editor behind it, so a table scrolling into view never builds R×C editors in one frame. **Cmd-Z forwards to the page history**. A cell edit writes a minimal pipe-to-pipe diff, tagged as a self-edit so the widgets remap forward — the focused cell stays mounted — and only the edited table's widget rebuilds from the new doc, so its static cells repaint live.

- **Cell ⇄ source encoding** — a cell is single-line GFM: literal `|` / `\` are backslash-escaped, an in-cell line break (Shift+Enter) serializes as `<br>` — so no keystroke or paste can split a row. `cellToSource` / `cellToDisplay` are the inverse pair.

- **Structure is uncorruptible from the keyboard** — the widget replaces the source so the caret never reaches the pipes; `atomicRanges` skip each table (a boundary delete removes the whole block, undoable). **Two tables can't be fused** — an insert is blank-line-fenced, and deleting the lone blank line between two tables is refused by a transaction filter. *(Known minor: deleting a trailing table with no final newline leaves one orphan blank line.)*

- **Connections in cells** — `[[…]]` render + autocomplete inside a cell (Tab / Enter accepts). Autocomplete inserts alias-free `[[Title]]`: cell encoding backslash-escapes a literal pipe, so an aliased form typed into a cell can't survive the round-trip as one connection. Resting on a resolved connection in a static cell raises the hover preview card on the shared intent delay — the card floats above the table by portal — and clicking the cell (which swaps it into its editor) closes it; the focused cell editor itself carries no link behavior, so hover from the resting state is the cell's one link affordance.

- **On-disk: dash-count width** — column width is the dash count per delimiter cell (Pandoc convention), rendered as `<colgroup>` ratios with `table-layout: fixed`; orthogonal to alignment (re-aligning never resizes). Best-effort cosmetic (Pandoc honors, GitHub / Obsidian ignore, a reformatter may normalize away). Rides the portable source because CSS renders custom widths natively.

- **Self-healing** — a region is a widget iff it parses as a single GFM table, re-evaluated per change; a half-typed / broken table falls back to raw text with the caret preserved. Empty cells are real min-height cells; a header-only table is valid; deleting the last column deletes the table; a foreign table round-trips byte-identical; no horizontal scroll (many columns narrow and wrap).

- **Structural edits via grips** — hovering reveals a quiet grip, one at a time (top per-column, left per-row). Dragging reorders live (a no-op move snaps back); right-click pops the OS-native menu (align / insert / clear / delete · Make Heading Column on the first column · Delete Table on the header grip), and the header-row grip's **left-press drags the whole table** (see Block Drag); dragging a column boundary resizes by moving whole dashes between the two neighbors (total conserved, 1-dash floor, the moving columns are the only feedback). Hovering the table also reveals a pair of border append strips — a table-height strip on the right edge adds a column, a table-width strip below adds a row — always appended at the end, so a mounted cell editor and the caret stay exactly where they were. Creation is the Insert menu's Table.

- **Module shape** — `MarkdownPM/Tables/`: a framework-free headless core (model / codec / regions / operations / navigation, unit-tested standalone) under thin adapters (`widget.tsx` the block-replace decoration, `TableView` / `CellEditor`, `sync.ts` the minimal-diff commit); `index.ts` exports the one CM6 extension — unregister it and tables degrade to plain text.


#### II. Embeddings

Typing `![[Title]]` on its own line embeds that Page where the line stood — Obsidian's own embed syntax, so a Nexus reads identically outside Pommora. Inside it, the line becomes a live tile riding the shared Embed Framework (→ [[SurfacePM]]): the page's real content at the embed scale, wearing the shared tile chassis with the accent border breathing in on hover or while the caret is inside. An embed **is** the page — click into the tile and edit in place; every keystroke flows through the page's own debounced save, frontmatter and foreign keys preserved. The tile's height is the reader's call: a bottom-edge drag resizes it live (SurfacePM's own south-edge gesture, floored at the shared tile minimum, Escape aborting), and the chosen height persists per host page and target in `nexus.db` — per-machine viewing preference, never page content, so the Markdown stays untouched. Tiles without a height keep the default; only interactive tiles offer the edge.

**Lone-ness is the whole grammar.** The line must hold exactly one `![[Title]]` — trailing whitespace tolerated, a leading indent read as list-continuation context (the token stays inline, riding its bullet, exactly like a quoted one). Detection is a whole-doc, per-version derivation on the display-math pattern — fence, table, and math regions own their own `![[` bytes — and **resolution is the only discriminator**: a title that resolves to exactly one page claims a tile, first occurrence per document; everything else (unresolved, ambiguous, duplicate, a `file.png`-style non-page) stays the inert dim token, becoming a tile the moment resolution succeeds. A cycle — a tile naming any page in its own host chain — renders as the inert token by the ancestor guard.

**The tile is never live-preview.** Its decorations live in their own state field (the Tables discipline — a plugin-sourced tile would under-report the scrollbar), the raw syntax never shows at any caret position, and an atomic absorb swallows the line's boundary newlines so ordinary motion hops the tile whole. Where a caret can still be seated — the document edges, syntax-aware word motion — the lone-line guard makes every keystroke harmless: interior damage refuses whole, a boundary-seat insertion repairs onto its own fresh line, and only a deliberate gesture removes a tile — its grip menu's Delete, or a selection swept across it. Tiles are blank-line-fenced like tables: inserts land with their separating blanks, and deleting the lone fencing blank is refused (hand-typed gluing stays legal authoring).

**The fencing space is mechanical, never visible.** The blanks keep their seats and their deletion refusal but render closed — the fencing lines and the tile line's own text strut collapse, so the tile sits against its neighbors at block-margin distance. A click landing on the tile's line seats the caret by its nearer edge (never a backward snap across the whole tile), and the drawn caret survives every boundary seat: a seat whose measured side faces the replaced range flips to the surviving side, and a collapsed seam floors back to a full-height bar. Typing at a seam opens the blank line back into visible content.

**Chrome follows the page.** A page with a banner shows it as a band at the tile's top — out of flow with its height reserved, the page's own layout contract at tile scale — with the title as static text and the band's change/remove context menu kept; rename and add-banner stay page-surface affordances. The band parks exactly as the full page's header does — the editor's scroll timeline re-homed at the tile, the same keyframes retargeted to the band's height — so scrolling the embedded content slides the banner away instead of pinning it to the tile's top. A coverless page reveals, on hover, the centered two-tone location breadcrumb (Collection › Set › Page) at the accent border's own timing.

**Creation has four doors.** The `[[` autocomplete extends to `![[` — a local trigger branch, never a widening of the connections pattern — offering only pages the syntax can express and the document can hold (already-embedded pages, the host chain, and bracket-bearing titles are omitted); table cells never see it. Any rail grip's right-click offers **Embed Page ▸**, a native Collections → Sets → Pages tree whose pick lands a fenced embed below that block; the editor context menu's **Insert ▸ Page** instead types the empty `![[]]` pair on a fenced line below the caret's block with the caret between the brackets, where the embed autocomplete opens immediately — an empty embed query browses the whole page index alphabetically, while an empty `[[` link query still shows nothing until a first character. And the syntax is hand-typeable from anywhere, Obsidian included. An embedded tile's own grip carries **Page Source ▸** — the same tree, re-aiming the line in place, reaching stale and unresolved tokens exactly when they need it — plus **Delete Embed**.

**Nothing stays hot.** Tiles live only while their host view does, rehydrate from the warm path-keyed detail slot when scrolled back (write-through-fresh from any host's pending edit, so no refetch and no stale seed), and die with the tab. A tile's own reading state — scroll position, caret, undo history — survives that teardown through a session-scoped warm cache keyed by the full host chain, invalidated whole whenever the page's body changed elsewhere since the capture; it never touches disk, so a fresh session mounts cold. Re-slots that never unmount are healed separately: the browser silently zeroes a detached scroller, so warm editors register a scroll self-check that the host editor runs from its measure phase after any update on a tile-bearing document — the one signal a re-slot can't dodge. The rename cascade sweeps `![[` targets in the same pass as connections — through a parallel pattern, because an embed is never a link-graph edge — and a resolution nudge re-renders tiles and connection styling the moment the tree changes, no caret move needed. Nested embeds render as display-only tiles one level down; deeper interactivity, sub-target forms (`#heading`, `^block`, `|alias`), and prefix-hosted embeds are deferred, degrading to the inert token today.

### Block Drag

Every block carries a gutter **drag handle** that relocates the whole block to the nearest block boundary — and every grip doubles as that block's menu anchor where one exists (the callout's Delete, the table's structural menu, the embed's create/re-aim/delete tree), one hover-flag seam keeping the generic editor menu out of their way. The rail grip is a content-anchored `::before` revealed only on gutter hover; blocks with their own chrome (the heading chevron, the blockquote's grip widget, the callout's gutter grip, the table's heading-row grip) double it as their drag handle — one shared `createBlockDragGesture`, hit-tested by a gutter x-coordinate (a non-CM-line handle like the table widget calls the same `startBlockDrag` directly). The block to move is resolved by `blockAt`; the drop is one source-line move (`blockMoveChanges`), blank-separated at BOTH new seams so a relocation never fuses adjacent blocks (a glue-adjacent paragraph won't become a lazy list continuation). The fixed accent insertion line snaps list-drag-style to the nearer block's **outer** box edge (the DOM line box, so it lands outside a callout/quote/code border, not inside) and flips at the block's midpoint, with edge auto-scroll, scroll re-measure, and Escape/blur abort. A folded heading **auto-unfolds at drag-start** — a fold can't survive the relocating single-replace edit (CM's `mapPos` collapses interior positions to a span endpoint). Interior drop-slots (dropping INTO a box) are deferred to V2 nesting.

### Typing Transforms (Input-Time Only)

Each fires as one atomic transaction with a re-entry guard; all are **prefix-aware** (a list behind a `>` behaves like one at the top level); paste preserves literal text.

- **List continuation / indent** — Enter continues a list, Tab indents (capped at the nesting limit) and Shift+Tab outdents; checkbox canonicalizes (`-[]` → `- [ ]`).

- **Callout shorthand** — `||` → `> [!callout] `.

- **Auto-pair + paired-delete** — brackets plus the single emphasis / code / quote markers. Each is gated so ordinary prose stays literal: `[` pairs only at a line start or after whitespace, and the emphasis / code / quote markers only when not right after a word char, where they instead **type over** their own closer on the way out; the doubled emphasis forms promote rather than pair. Backspace inside an empty pair removes both halves. All of it runs in table cells too.

- **Enter / Shift+Enter close an open construct** — Enter inside a pair / quote / emphasis / connection steps the caret past the closer (no newline); Shift+Enter closes it **first**, then breaks the line, so a newline never lands inside the pair.

- **Dash / arrow auto-format** — `--` → `—`, `->` → `→`.

- **Smart whole-marker backspace** — deletes the whole marker on a marker line; callout-aware (never strips a lone `>`).

### Context Menu + Shortcuts

Right-click pops the **OS-native** menu, built in the Electron main process off the `context-menu` event so the system edit roles, spelling suggestions, Speech, and Share come native, with Pommora submenus (Format / Heading / Lists / Insert) whose active state is computed from the live `EditorState`, not a static snapshot. Shortcuts: ⌘B / I / K, ⌘⇧X (strike), ⌘⇧K (connection) — Inline Code carries no keybinding (⌘E belongs to the ribbon toggle).

### Host Services

The wikilink resolver is **wired** to `@shared/connections`: resolution, styling, click-routing, and rename-cascade all ride the connections layer, and page embeds render through the shared Embed Framework (→ [[SurfacePM]]). LaTeX and syntax highlighting are **detected and styled only** — there is no renderer and no injection seam for them; building one is part of the work, not a slot waiting to be filled. Image rendering stays reserved the same way: a `![[file.png]]`-style target simply fails page resolution and rests as the inert token.

### Module Shape

`MarkdownPM/` — one folder per concern: `parser/` · `detect/` · `tokens/` · `decorations/` · `input/` · `connections/` · `Tables/` · `editor/` (CM6 wiring, which also holds the callout and widget code). Appearance is `Styles.css` plus the table widget's own stylesheet; every value in both resolves from the root design-system tokens via the `--var` bridge. The drawn caret and its I-beam cursor are an app-wide identity rather than an editor-local one, so they live in the global caret layer. The pure-logic layer — the per-construct folders, the pure models under `editor/` (block, list-drag, format-state), and the Tables headless core — imports neither React nor CodeMirror and is unit-tested against a dedicated corpus.

### Non-Obvious

- **Emphasis markers are located by geometry, not width-subtraction** — per side, take the *tighter* of the content bounds and place the `*`/`_` run exactly that many chars adjacent; naive `start + width` mislocates whenever an inner span abuts the delimiter run (`**a *b* c**`). The one genuinely subtle AST algorithm; re-validate against the parser's offset semantics if the parser is swapped.

- **Block constructs confirm by parsing a single line in isolation** — which is why a bare `---` is *always* a thematic break. Setext H2 was removed; a setext-underline guard must never be reintroduced.

- **`WidgetType.ignoreEvent` defaults to TRUE** — a CM6 widget swallows every event from its own DOM, so an interactive glyph widget (bullet, checkbox) needs an explicit `ignoreEvent → false` or a pointerdown never reaches its handler (the bug that made bullet-drag silently dead).

- **Connection detection reuses `@shared/connections`, not its own regex** — so the editor can't drift from the scanner / resolver / rename-cascade, and a connection re-resolves against the live layer with no doc reparse and no editor-local connection cache.

- **Hot-path reads share one per-doc-version derivation** — the doc string, the whole-doc line / fence / callout scan, AND the caret-free per-line decoration intents are each computed once per document version and cached against the CM6 doc. A caret move re-derives only its own affected lines (its line, plus its fence's edge lines) and assembles the rest from the cache, so per-caret cost stops scaling with document length; the pure whole-doc derivation survives as the reference an equivalence test pins the assembly against. Inline tokenizing is deliberately *not* cached: it's scoped to the visible ranges, which is why a scroll rebuilds decorations too.

- **All offsets are character offsets (UTF-16), never bytes** — micromark/mdast reports char offsets, dissolving the cmark byte-offset column-bug class; still guard astral-plane characters at parser boundaries.

- **Box constructs float with an outer gap, never a line margin** — CM6 line margins break caret and arrow mapping, since only padding is measured. Each box paints its fill as an inset `::after` and pads its first and last line by its own gap knob, leaving space *outside* the fill so it reads as separated even with no blank line between neighbours. A box nested in a box drops its gap; the outer one already owns that spacing.

- **A list line wraps only inside its content span** — the line itself is `white-space: pre` and the item's content wears the one wrapping region (`md-li-text`). The marker zone is saturated with soft-wrap opportunities the line must suppress: the marker-content space, an ordered number's period, and the atomic `cm-widgetBuffer` imgs CM plants beside every replace decoration — any one of them would drop a long unbroken word below its marker instead of filling beside the glyph. Don't re-enable wrapping on the line or remove the span without re-testing a single-long-word item at a narrow width.

- **Display math is a block to every layer that can move or mark it** — a pair of LONE `$$` lines (fenceBlocks-style pairing; never the token layer's span regex, whose lazy pairing one stray `$$` flips document-wide). `editor/mathRanges.ts` is the one derivation, read by the block resolver, the list-item gesture, and the decoration pass — which renders a marker-lookalike line inside a formula as math source, never as a bullet with a live drag glyph. Indented math rides its list item whole (internal blank lines can't split the item); hanging delimiters and single-line `$$x$$` stay inline.

- **The embed claim has one owner** — `claimedEmbeds` (resolved + first-per-normalized-title) is read by the tile field, the token suppression, the boundary guards, the grip-menu exclusions, and the autocomplete pool; a second predicate is how two layers would disagree about one line. The absorb stops ordinary motion, but the lone-line guard is what makes every caret seat harmless — protect edits at the transaction layer, never by chasing motion commands.

### Known Issues

- **`*` and `•` bullets render as plain text** — the marker parser accepts them (so the drag layer sees list lines) but no construct branch renders them, and `* [ ]` *does* render as a checkbox. Whether `*` becomes a rendered bullet or the parser narrows is an open call.

- **A four-backtick typed fence colorizes but carries no chrome** — the info capture stops at the fourth backtick, so the nested parse runs (CodeMirror reads the info string itself) while the glyph and info-word hide stay off and the raw ````` ````yaml ````` remains visible. Bounded by the pre-existing pairing rule, under which a longer fence closes on the first inner ```` ``` ````.

### Deferred

- **Image + LaTeX** render seams (styled only; an image-form `![[…]]` rests inert by failing page resolution) · **fenced-code copy button** · **zoom slider** UI placement · **heading-fold inside a callout** (headings render in a callout, but the fold chevron isn't prefix-aware) · **table inside a callout** (renders as raw text; needs prefix-aware region detection).

- **Aliased connections** — the pipe segment of `[[Title|alias]]` parses and survives every rewrite, but nothing renders it as the display text, so it shows as plain text beside the styled title. The display treatment and the authoring gesture are both unbuilt.

- **Outliner rails on ordered / arrow / `+` lists** — the guide is bullets + checkboxes only; a right-aligned number and the arrow / `+` glyphs need their own glyph-centre and vertical-evenness maths before their rails read straight.

- **Codeblock Style ▸ Language grip menu** — retyping a block's language from its rail grip; today the info word is edited on the fence line directly. Widening the curated language set is one description in the highlight module plus its package.
