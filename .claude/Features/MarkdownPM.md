## MarkdownPM

Pommora's in-house Markdown editor for Pages: a dynamic-syntax editor on a web-native (CodeMirror 6) substrate. Portable CommonMark/GFM stays canonical on disk; everything the editor draws is presentation.

### Architecture

| Stratum | Provided by | Ownership |
|---|---|---|
| Text substrate (caret, IME, undo, viewport) | CodeMirror 6, behind the `editor/` seam | dependency |
| Behavior layer (syntax, styling, detection, transforms) | hand-written | **ours** |
| Parser / AST (GFM tree + per-node offsets) | micromark / mdast, behind `parser/` | dependency |

The behavior layer is pure logic over `(doc string, selection, tokens, decorations)` — it imports neither CodeMirror nor micromark; the two adapters bridge it, and CM6 decorations apply the styling. Swapping either dependency touches only its seam.

**The source-of-truth contract:**

- **Disk == `EditorState.doc` string, always** — no reconstruction layer.
- **Display ≠ source** — the same bytes render differently, and the editor never auto-tidies; mutations are user-initiated only.
- **The editor binds to the body only** — frontmatter is stripped on load, held on the model, and re-serialized from the typed object on save (foreign keys and comments preserved). YAML is never visible or destroyable in the editor.
- **Display-only UI state lives in `nexus.db`, never frontmatter** — heading folds, embed tile heights, and their kin are per-machine.

### Dynamic Syntax

A construct's markers are **revealed** (literal editable text) when the caret is inside its token and **hidden or decorated** when it leaves; chrome — the HR rule, the quote card, code fills, list glyphs — is render-side decoration that never exists on disk. Reveal is line-scoped for inline marks, headings, and the thematic break, and marker-local for list glyphs; box chrome (blockquote, callout) always shows. One detection function per construct feeds both the hiding and the chrome, so no half-states exist.

### Constructs

- **Inline marks** — bold / italic / bold-italic, strikethrough, inline code, links, Connections; caret-aware reveal, heading-aware sizing, suppressed inside code and literal targets.

- **Headings** — H1–H6 on the em scale; the context menu offers Paragraph plus H1–H5. Foldable via a chevron in the fold gutter wearing the sidebar's disclosure language; fold state is per-machine.

- **Lists** — bullet (`-` → `•`), `+`, arrow `→` (typed `->`), ordered, and GFM task checkboxes, all sharing one indent zone and the full behavior set. On disk every kind is portable CommonMark except the arrow line, a Pommora render directive that stays legible anywhere. **Drag-to-reorder by the glyph** moves an item with its nested sub-block in one transaction, re-nesting and renumbering as it lands. **The grip menu's Type ▸** switches a whole block between the four kinds at every nesting level — ordered runs count per level, a marker already correct yields no edit, and the block switch and the per-line format toggle share one marker writer.

- **Outliner rails** — an optional hairline guide down each nested run (personalization `outlinerLines`, → [[ConfigurationPM]]): one rail per ancestor level, run-based with rounded caps, centred on the ancestor's glyph, painted on the segment-separator token. Scoped to dash-bullets and checkboxes.

- **Code** — inline and fenced share the mono family and nothing else: inline wears the code color over a code-tinted fill, a fenced block a neutral fill. A fence's info word types the block: the curated language set (JSON, YAML, JS/TS, CSS, HTML, Swift) gets a real nested parse colored as spectrum pastels, a bare fence stays plain. Backticks always show; a typed block hides only its info word, wears its language top-right as `<TYPE>`, and trades the chrome back for the raw info word when the caret sits on the fence line. The per-nexus **Show Line Count In Code Blocks** setting numbers content lines. A fence's run length is part of its identity, so a longer fence holds shorter ones as literal content — the rule's full law lives in §Non-Obvious.

- **Blockquote** — an always-shown rounded card with the accent bar. Block constructs nest inside it: the `>` prefix strips and the inner line renders as its own construct, the same renderer at any depth. A marker needs whitespace or line-end after its last `>`, so a bare `>` reads as the quote's own blank line while `>a` stays prose.

- **Callout** — a `> [!callout]` blockquote rendered as a bordered, gutter-width box, typed with the `||` shorthand, coexisting with plain quotes. Detection is per-head, so adjacent or pasted heads never merge, and an invalid tag falls back to a plain quote. Block constructs render inside the box; the hidden head is caret-proof, deletes can't erode a body line's prefix out of the box, and Shift+Enter stays in. On disk it's a plain, portable blockquote.

- **Thematic break** (`---`) — caret-aware full-width rule; never a setext interpretation.

- **Connections** (`[[Title]]`) — title-only, styled colored inline text (never a chip), three states (resolved / phantom / ambiguous) riding the live `@shared/connections` layer: resolution, styling, click-routing, and the rename cascade are all the connection layer's, so the editor cannot drift from it. The `[[` autocomplete (a glass popup at the caret, prefix-matched, keyboard-driven) is one hook shared by the page editor and table cells.

- **External links** (`[text](url)`) — title-only at rest, validity decided by the same static check the opener uses (`@shared/links`), so color can never disagree with what opens. Valid titles carry the link color, underline, and navigation; invalid ones dim with brackets shown.

- **The caret** — a drawn caret with a smooth symmetric fade in place of Chromium's hard blink, plus a custom I-beam cursor. It's an app-wide identity: the editor mounts the CM layer, and the same bar paints over native text fields from the global caret layer.

### Tables

GFM pipe-tables render as an editable HTML table — a block-replace widget over canonical GFM source. Portable GFM caps the feature set (rectangular cells, per-column alignment, inline-only content), so a widget over the source reaches that ceiling losslessly. A React port of [`ckant/codemirror-markdown-tables`](https://github.com/ckant/codemirror-markdown-tables) (MIT); Pommora's additions are dash-count column widths with resize, the heading-column toggle, the structure and merge guards, page-scoped in-cell undo, and the OS-native grip menu.

- **Live cell editors** — the focused cell mounts a nested editor reusing the main editor's inline rendering; resting cells render through the same token renderer with no editor behind them. ⌘Z forwards to the page history. A cell edit writes a minimal pipe-to-pipe diff and only the edited table's widget rebuilds.
- **Cell ⇄ source encoding** — a cell is single-line GFM: literal `|` / `\` escape, Shift+Enter serializes as `<br>`, so no keystroke or paste can split a row.
- **Structure is uncorruptible from the keyboard** — the widget replaces the source so the caret never reaches the pipes; a boundary delete removes the whole block, undoable. Two tables can't be fused: inserts are blank-line-fenced and deleting the lone blank between tables is refused.
- **Connections in cells** — render and autocomplete both work in-cell (alias-free, since cell encoding escapes the pipe). Resting on a resolved connection raises the shared hover preview; the focused cell editor carries no link behavior.
- **Dash-count width** — column width is the delimiter cell's dash count (Pandoc convention) rendered as `<colgroup>` ratios; orthogonal to alignment, best-effort cosmetic outside Pommora.
- **Self-healing** — a region is a widget iff it parses as a single GFM table, re-evaluated per change; broken tables fall back to raw text with the caret preserved, and foreign tables round-trip byte-identical.
- **Grips** — hover reveals one quiet grip at a time (top per-column, left per-row): drag reorders live, right-click pops the OS-native menu (align / insert / clear / delete, Make Heading Column, Delete Table), a column-boundary drag resizes by moving whole dashes between neighbors, and the header-row grip's left-press drags the whole table as a block. Border append strips add a column or row at the end. Creation is the Insert menu's Table.

The module is a framework-free headless core (model / codec / regions / operations / navigation) under thin adapters; one CM6 extension exports it, and unregistering degrades tables to plain text.

### Hover Previews

Resting on a resolved connection past a short intent delay opens the hover preview card — a compact, read-only view of the target page rendered through the shared embed framework without its banner or inline title. Content scrolls within it, headings fold on click, the caret never enters. It anchors to the link through scroll and closes on hover-off, Escape, navigation, or the link leaving view; the Settings ▸ Pages linger slider extends the stay. It resizes from its right and bottom edges to one remembered size, and resting table cells raise the same card. The card belongs to the Page Preview system (→ [[PagePreviewPM]]).

### Page Embeds

Typing `![[Title]]` on its own line embeds that Page in place — Obsidian's syntax, so a Nexus reads identically outside Pommora. The line becomes a live tile on the shared Embed Framework (→ [[SurfacePM]]): the page's real content at embed scale, wearing the tile chassis with the accent border breathing on hover or while the caret is inside. **An embed is the page** — click in and edit in place; keystrokes flow through the page's own debounced save. A bottom-edge drag sets the tile's height, persisted per host page and target in `nexus.db` as viewing preference, never page content.

**Lone-ness is the whole grammar.** The line must hold exactly one `![[Title]]`, and **resolution is the only discriminator**: a title resolving to exactly one page claims a tile (first occurrence per document); unresolved, ambiguous, duplicate, non-page, and self-chain-cycle targets all rest as the inert dim token, becoming tiles the moment resolution succeeds. Tiles are blank-line-fenced like tables — the fencing blanks keep their seats and their deletion refusal but render closed, so the tile sits at block-margin distance; a click seats the caret by the nearer edge, and typing at a seam reopens the blank. The raw syntax never shows at any caret position; only a deliberate gesture removes a tile — its grip's Delete, or a selection swept across it.

**Chrome follows the page.** A banner shows as a band at the tile's top with the page's own park behavior re-homed at tile scale; a coverless page reveals the two-tone location breadcrumb on hover. **Creation has three doors:** the `![[` autocomplete (offering only pages the syntax can express — already-embedded pages, the host chain, and bracket-bearing titles omitted; an empty query browses the whole index), the context menu's **Insert ▸ Page** (types the fenced empty pair with the autocomplete open), and the tile grip's **Page Source ▸** (a native Collections → Sets → Pages tree re-aiming the line in place).

**Nothing stays hot.** Tiles live with their host view, rehydrate from the warm path-keyed detail slot, and die with the tab; a tile's reading state (scroll, caret, undo) survives teardown in a session-scoped cache keyed by the host chain, invalidated when the page's body changes elsewhere. The rename cascade sweeps `![[` targets in the same pass as connections through a parallel pattern — an embed is never a link-graph edge. Nested embeds render display-only one level down; sub-targets (`#heading`, `^block`, `|alias`) and prefix-hosted embeds are deferred, degrading to the inert token.

### Block Drag & The Grip Menu

Every block carries a gutter drag handle that relocates the whole block to the nearest block boundary and doubles as its menu anchor. Blocks with their own chrome — the heading chevron, the quote and callout grips, the table's heading-row grip — double that chrome as the handle; one shared gesture serves them all. The drop is one source-line move, blank-separated at both new seams so a relocation never fuses adjacent blocks; the accent insertion line snaps to the nearer block's outer box edge and flips at its midpoint, with edge auto-scroll and Escape/blur abort. A folded heading auto-unfolds at drag start, since a fold can't survive the relocating edit. Interior drop-slots (dropping *into* a box) are deferred to V2 nesting.

**One grip menu serves every kind**, keyed by the resolved block: **Delete** on all of them, with the kind's own arm above it — **Type ▸** on a list, **Page Source ▸** on an embed tile. Delete removes the block's lines and collapses the doubled blank it leaves, one rule for every kind. A grip acts on its block, never the caret. Tables keep their own grip menu, since their grips address rows and columns rather than a block.

### Typing Transforms

Input-time only; each fires as one atomic transaction with a re-entry guard, all prefix-aware (a list behind `>` behaves like one at top level), and paste preserves literal text.

- **List continuation / indent** — Enter continues, Tab indents (capped), Shift+Tab outdents; checkbox canonicalizes (`-[]` → `- [ ]`).
- **Callout shorthand** — `||` → `> [!callout] `.
- **Auto-pair + paired-delete** — brackets plus the single emphasis / code / quote markers, gated on both sides of the caret so ordinary prose stays literal; markers type over their own closer on the way out, doubled emphasis promotes rather than pairs, and Backspace inside an empty pair removes both halves. All of it runs in table cells.
- **Enter / Shift+Enter close an open construct** — Enter steps past the closer; Shift+Enter closes first, then breaks, so a newline never lands inside a pair.
- **Dash / arrow auto-format** — `--` → `—`, `->` → `→`.
- **Smart whole-marker backspace** — deletes the whole marker on a marker line; callout-aware.

### Context Menu + Shortcuts

Right-click pops the OS-native menu, built in the main process off the `context-menu` event so the system edit roles, spelling, Speech, and Share come native, with Pommora submenus (Format / Heading / Lists / Insert) whose active state reads the live `EditorState`. Shortcuts: ⌘B / I / K, ⌘⇧X (strike), ⌘⇧K (connection); Inline Code carries no keybinding (⌘E belongs to the ribbon toggle).

### Host Services

Wikilink resolution, embeds, and links all ride shared layers rather than editor-local ones (§Constructs names each). LaTeX and syntax highlighting are detected and styled only — no renderer and no injection seam exists; building one is part of that work. Image rendering stays reserved the same way: a `![[file.png]]`-style target fails page resolution and rests inert.

### Module Shape

`MarkdownPM/` — one folder per concern: `parser/` · `detect/` · `tokens/` · `decorations/` · `input/` · `connections/` · `Tables/` · `editor/` (CM6 wiring, including the callout and widget code). Appearance is `Styles.css` plus the table widget's stylesheet, every value resolving from the design-system tokens via the `--var` bridge. The pure-logic layer — the per-construct folders, the pure models under `editor/`, and the Tables headless core — imports neither React nor CodeMirror and is unit-tested against a dedicated corpus.

### Design System

The editor's entire design vocabulary lives in one stylesheet as scoped custom-property families — there is no separate theme module (`MarkdownPM/tokens/` is the *markdown tokenizer*, not design tokens). The editor doesn't consume the type ramp: everything scales in `em` multiples off its own zoom root. Tables follow the atlas convention (`DesignSystemPM.md` §charter); each family's scope is part of its contract — a value set outside its scope silently does nothing.

**SOURCE:** `Pommora/src/renderer/src/MarkdownPM/Styles.css`

#### II. Scale

The root of everything: one size factor for structure, one derived factor for glyphs. `--block-zoom` is a registered `<number>` so the per-block zoom classes interpolate.

| Title | token | value · scope |
| --- | --- | --- |
| Editor Size Factor | `--mdpm-scale` | `1` · `:root` (global so hosts inherit) |
| Per-Block Zoom | `@property --block-zoom` | `<number>`, inherits, initial `1` |
| Glyph Scale | `--glyph-scale` | `calc(var(--mdpm-scale) * var(--block-zoom, 1))` · `.mdpm-shell` |
| Fold Chevron Size | `--fold-chevron-size` | `calc(var(--text-title3-size) * var(--glyph-scale))` · `.mdpm-shell` |

#### II. Header, Banner & Title

| Title | token | value · scope |
| --- | --- | --- |
| Page Title Size | `--detail-title-size` | `28px` · `.mdpm-header .detail-title` |
| Add-Banner Strip | `--add-banner-zone` | `44px` · `.mdpm-header:not(.has-banner)` |
| Header Park Distance | `--header-zone` | JS-set on `.mdpm-shell`; fallback `90px` |

#### II. Lists & Outliner

List geometry scopes to `.cm-line.md-li`; the outliner rail aliases the shared `--list-outline-*` primitives and adds its caps and x-position.

| Title | token | value |
| --- | --- | --- |
| Marker Gap | `--list-gap` | `4px` (on `.cm-editor`) |
| Indent Step | `--list-indent` | `20px` |
| Bullet / Number / Task Gutter | `--bullet-zone` / `--number-zone` / `--task-zone` | `16px` / `1.3em` / `1.8em` |
| Bullet Glyph | `--bullet-size` | `1.25em` |
| Inner-Gutter Origin | `--li-origin` | `0px`; `16px` in quotes; callout pad in callouts |
| Computed Column | `--li-col` | `calc((var(--li-level, 0) + 1) * var(--list-indent))` |
| Rail Width / Color / Gap / Radius | `--outliner-*` | → the `--list-outline-*` tokens |
| Rail Level | `--rail-level` | JS-set per rail element |

#### II. Quotes, Callouts & Code

| Title | token | value · scope |
| --- | --- | --- |
| Quote Bar | `--bar-width` / `--bar-color` / `--bar-radius` | `4px` / → label-tertiary / `2px` · `.md-bq` |
| Quote Box | `--bg-color` / `--bg-radius` | → fill-tertiary / `6px` |
| Quote Gap | `--bq-gap` | `6px` |
| Callout Frame | `--callout-border` / `--callout-bw` / `--callout-radius` | → label-tertiary / `1.5px` / `6px` · `.md-callout` |
| Callout Padding | `--callout-pad` / `--callout-gap` / `--callout-inner-pad` | `15px` / `6px` / `8px` |
| Callout Grip | `--grip-x` / `--grip-y` | `-18px` / `4px` |
| Nested Quote | `--nq-bar` / `--nq-bar-radius` / `--nq-radius` / `--nq-gap` / `--nq-inset` | `3px` / `2px` / `5px` / `9px` / `2px` · `.md-callout.md-bq-in` |
| Code Block | `--cb-bg` / `--cb-radius` / `--cb-size` / `--cb-gap` / `--cb-pad` | → fill-secondary / `6px` / `0.85em` / `6px` / `10px` · `.md-cb` |
| Line-Number Zone | `--cb-ln-zone` | `calc(3ch + var(--list-gap))` |

#### II. Syntax Colors

One pastel recipe: `color-mix(in srgb, var(--tok-solid) var(--tok-tint), var(--system-white))`, the tint step shared with the chip ladder. Comments skip the recipe and read label-tertiary directly.

| Title | token | value |
| --- | --- | --- |
| Pastel Mix Step | `--tok-tint` | → `var(--tint-primary)` (60%) |
| Keyword / String / Number | `--tok-solid` on `.tok-kw` / `.tok-str` / `.tok-num` | purple / green / orange solids |
| Property / Function / Type | `.tok-prop` / `.tok-fn` / `.tok-type` | cobalt / yellow / cyan solids |

#### II. Embeds & Autocomplete

| Title | token | value · scope |
| --- | --- | --- |
| Editing / Resizing Tile Ring | `--tile-border-color` | → accent-stroke / accent-stroke-hot · `.mdpm-embed-tile` states |
| Embed Grip Top | `--grip-top` | `28px` · `.mdpm-embed-line` |
| Autocomplete | `--ac-radius` / `--ac-rows` | `12px` / `4` · `.mdpm-ac` |

### Non-Obvious

- **One heading scan serves both the folds and the outline, and they disagree on purpose** — a fold section is dropped when nothing sits beneath its heading; an outline keeps it, or consecutive headings would show only the second. Both read the same fence-aware scan, so what counts as a heading can never diverge between them. The editor also publishes a reveal seam beside its fold toggle: scroll to an offset, opening every collapsed section hiding it.
- **Emphasis markers are located by geometry, not width-subtraction** — per side, take the tighter of the content bounds; naive `start + width` mislocates whenever an inner span abuts the delimiter run. Re-validate against the parser's offset semantics if the parser is swapped.
- **One pass decides where every code block ends, shared across processes** — the fence grammar and its pairing live in the shared code module beside the mask the write side reads, so the renderer's chrome and the rename cascade's protection are the same answer by construction; every layer above consumes that pass. A layer pairing fences for itself eventually under-claims a block, and an under-claimed block is one whose `[[Title]]` a rename will rewrite — a file edited inside its own code sample. Two divergences from the reference parser are load-bearing: the info-string capture stays unanchored at line-end (or CRLF documents lose every fence), and a backtick fence whose info string holds a backtick is prose.
- **A closed top-level fence owns its bytes against every box construct** — a `>` or `[!callout]` line inside one is code text: no quote chrome, no grip, no drop slot. A *quoted* fence keeps its box because the `>` is real there. The block resolver and the decoration pass read the same rule.
- **Block constructs confirm by parsing a single line in isolation** — which is why a bare `---` is always a thematic break. Setext H2 was removed; a setext-underline guard must never be reintroduced.
- **`WidgetType.ignoreEvent` defaults to TRUE** — an interactive glyph widget needs an explicit `ignoreEvent → false` or pointerdown never reaches its handler.
- **Hot-path reads share one per-doc-version derivation** — the doc string, the whole-doc line / fence / callout scan, and the caret-free per-line intents are computed once per document version; a caret move re-derives only its own affected lines, so per-caret cost stops scaling with document length. Inline tokenizing scopes to the visible ranges, cached by doc version and span set, and each slice opens on a line whose block context is self-evident so its fence verdicts match the whole document's.
- **All offsets are character offsets (UTF-16), never bytes** — micromark reports char offsets; still guard astral-plane characters at parser boundaries.
- **Box constructs float with an outer gap, never a line margin** — CM6 line margins break caret mapping. Each box paints its fill as an inset `::after` and pads its edge lines by its own gap knob; a box nested in a box drops its gap.
- **A list line wraps only inside its content span** — the line is `white-space: pre` and the item's content wears the one wrapping region; the marker zone is saturated with soft-wrap opportunities that would drop a long word below its glyph. Re-test a single-long-word item at narrow width before touching either.
- **Display math is a block to every layer that can move or mark it** — a pair of lone `$$` lines under fence-style pairing (never the token layer's lazy span regex). One derivation (`editor/mathRanges.ts`) feeds the block resolver, the list gesture, and the decoration pass; indented math rides its list item whole.
- **The embed claim has one owner** — the resolved, first-per-title claim set is read by the tile field, token suppression, boundary guards, grip-menu exclusions, and the autocomplete pool; a second predicate is how two layers disagree about one line. Protect embed edits at the transaction layer, never by chasing motion commands.
- **A grip acts on its block, never the caret** — the right-press is defaulted away exactly as the drag gestures default the left, since preventing the context menu comes too late to stop the browser seating a caret. The hover flag that keeps the generic editor menu out of the gutter reads the same grip-bearing line-class list as the menu's hit-test, so the two can't disagree.

### Known Issues

- **An unreproduced renderer crash on a programmatic scroll toward a table inside an embed tile** — the window goes black with no crash log, and the same jump replays cleanly. Unreproduced since; no mechanism established.

### Deferred

- **Image + LaTeX** render seams (styled only) · **fenced-code copy button** · **zoom slider** UI placement · **heading-fold inside a callout** (headings render there, but the fold chevron isn't prefix-aware) · **table inside a callout** (renders as raw text; needs prefix-aware region detection).
- **Aliased connections** — the pipe segment of `[[Title|alias]]` parses and survives every rewrite, but nothing renders it as display text. The display treatment and the authoring gesture are both unbuilt.
- **Outliner rails on ordered / arrow / `+` lists** — the guide is bullets + checkboxes only; the other glyphs need their own glyph-centre maths before their rails read straight.
- **Codeblock Style ▸ Language grip menu** — retyping a block's language from its grip; the list's Type ▸ arm is the pattern it follows. Widening the curated language set is one description in the highlight module plus its package.
