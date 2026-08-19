## MarkdownPM

```
MarkdownPM
├── Architecture
├── Dynamic Syntax
├── Constructs
├── Tables
├── Page Embeds
├── Webpage Embeds
├── Block Drag & The Grip Menu
├── Typing Transforms
├── Context Menu + Shortcuts
├── Module Shape
├── Design System
│   ├── II. Scale
│   ├── II. Header, Banner & Title
│   ├── II. Lists & Outliner
│   ├── II. Quotes, Callouts & Code
│   ├── II. Syntax Colors
│   └── II. Embeds & Autocomplete
├── Known Issues
└── Pending
```

Pommora's in-house Markdown editor for Pages: a dynamic-syntax editor on a web-native (CodeMirror 6) substrate. Portable CommonMark/GFM stays canonical on disk; everything the editor draws is presentation.

### Architecture

| Stratum | Provided By | Ownership |
| --- | --- | --- |
| Text substrate (caret, IME, undo, viewport) | CodeMirror 6, behind the `editor/` seam | dependency |
| Behavior layer (syntax, styling, detection, transforms) | hand-written | **ours** |
| Parser / AST (GFM tree + per-node offsets) | micromark / mdast, behind `parser/` | dependency |

The behavior layer is pure logic over `(doc string, selection, tokens, decorations)`; swapping either dependency touches only its seam.

**The source-of-truth contract:**

- **Disk == `EditorState.doc` string, always** — no reconstruction layer.
- **Display ≠ source** — the same bytes render differently, and the editor never auto-tidies; mutations are user-initiated only.
- **The editor binds to the body only** — frontmatter is stripped on load, held on the model, and re-serialized from the typed object on save (foreign keys and comments preserved). YAML is never visible or destroyable in the editor.
- **Display-only UI state lives in `nexus.db`, never frontmatter** — heading folds, embed tile heights, and their kin are per-machine.

### Dynamic Syntax

A construct's markers are **revealed** (literal editable text) when the caret is inside its token and **hidden or decorated** when it leaves; chrome — the HR rule, the quote card, code fills, list glyphs — is render-side decoration that never exists on disk. Reveal is line-scoped for inline marks, headings, and the thematic break, and marker-local for list glyphs; box chrome (blockquote, callout) always shows.

### Constructs

- **Inline marks** — bold / italic / bold-italic, strikethrough, inline code, links, Connections; caret-aware reveal, heading-aware sizing, suppressed inside code and literal targets.
- **Headings** — H1–H6 on the em scale; the context menu offers Paragraph plus H1–H5. Foldable via a chevron in the fold gutter wearing the sidebar's disclosure language; a heading with nothing beneath it carries no chevron, while the outline still lists it. Fold state is per-machine.
- **Lists** — bullet (`-` → `•`), `+`, arrow `→` (typed `->`), ordered, and GFM task checkboxes, all sharing one indent zone and the full behavior set. **Drag-to-reorder by the glyph** moves an item with its nested sub-block in one transaction, re-nesting and renumbering as it lands. **The grip menu's Type ▸** switches a whole block between the four kinds at every nesting level.
- **Outliner rails** — an optional hairline guide down each list's nested run (personalization `outlinerLines`, → [[ConfigurationPM]]): one rail per ancestor level, run-based with rounded caps, centered on the ancestor's glyph, painted on the segment-separator token. Scoped to dash-bullets and checkboxes.
- **Code** — inline and fenced share the mono family and nothing else: inline wears the code color over a code-tinted fill, a fenced block a neutral fill. A fence's info word types the block: the curated language set (JSON, YAML, JS/TS, CSS, HTML, Swift) gets a real nested parse colored as spectrum pastels, a bare fence stays plain. Backticks always show; a typed block hides only its info word, wears its language top-right as `<TYPE>`, and reverts back to the raw info word when the caret sits on the fence line. A construct line inside a closed fence is code text and wears no chrome. The per-nexus **Show Line Count In Code Blocks** setting numbers content lines.
- **Blockquote** — an always-shown rounded card with the accent bar. Block constructs nest inside it: the `>` prefix strips and the inner line renders as its own construct, the same renderer at any depth. A marker needs whitespace or line-end after its last `>`, so a bare `>` reads as the quote's own blank line while `>a` stays prose.
- **Callout** — a `> [!callout]` blockquote rendered as a bordered, gutter-width box, typed with the `||` shorthand, coexisting with plain quotes. Detection is per-head, so adjacent or pasted heads never merge, and an invalid tag falls back to a plain quote. Block constructs render inside the box; the hidden head is caret-proof, deletes can't erode a body line's prefix out of the box, and Shift+Enter stays in.
- **Thematic break** (`---`) — caret-aware full-width rule; never a setext interpretation.
- **[[ConnectionsPM|Connections]]** (`[[Title]]`) — styled colored inline text showing its alias where one is given, three states (resolved / phantom / ambiguous) riding the live `@shared/connections` layer; resolution, styling, click-routing, and the rename cascade belong to the connection layer. Resting on a resolved connection raises the hover preview card. The `[[` autocomplete — a glass popup at the caret, prefix-matched, keyboard-driven — is shared by the page editor and table cells.
- **Markdown links** (`[text](target)`) — label-only at rest, the target resolved once for all of the editor, the cell renderer, and the click path. A target naming a Page reads and behaves as a connection; one naming a website carries the link color, underline, and navigation; one naming neither dims with its brackets shown. Targets carry balanced parentheses, as CommonMark's link destination does, so an address holding them survives however it was authored.
- **A link's own menu** — right-clicking a link that names a website offers its two halves first, each selected rather than merely reached, since each is a thing you replace outright: **Rename** for the words shown, **Edit Link** for the address behind them. Then **Copy Link**, and **Format ▸**, which rewrites the label as the whole address, its bare domain, or the site's page title. Below a separator sit the two ways to be rid of it: **Remove Link** leaves the label behind as prose, and **Delete** takes the whole link. Format writes the label and nothing else — no per-link state is stored anywhere, so a link written in one form is indistinguishable from the same words typed by hand, and Page Title defers to the fetch exactly as a paste in that form does. A read-only surface is offered Copy Link alone.
- **Pasted links** — an address pasted into any editor surface is written as a link rather than as literal text, in one of three forms: the whole address, its bare domain, or the site's page title. Which form is a per-Nexus default (→ [[ConfigurationPM]] §Files & Links), and a knob decides whether pasting over selected text turns that text into the link instead of replacing it. Only an address with an explicit scheme qualifies — a filename or a version number pasted from elsewhere stays the text it was — and position matters as much as shape: inside a code span or fence, or inside another link's `( )`, the address lands as the literal text those places are made of. Page Title writes the domain immediately and swaps the fetched title in when it arrives, tracking the span it inserted so the swap can never land on a different link or over words since edited by hand; a title that arrives after the surface closes is simply dropped. **⌘⇧V does the opposite of ⌘V**, on whichever axis a selection puts in question: with text selected it reverses whether the paste wraps it, and with none it pastes the address as the literal text a plain paste no longer leaves.
- **The caret** — a drawn caret with a smooth symmetric fade and a custom I-beam cursor, an app-wide identity owned by the motion system. 

### Tables

GFM pipe-tables render as an editable HTML table — a block-replace widget over canonical GFM source. Portable GFM caps the feature set (rectangular cells, per-column alignment, inline-only content), so a widget over the source reaches that ceiling losslessly. A React port of [`ckant/codemirror-markdown-tables`](https://github.com/ckant/codemirror-markdown-tables) (MIT); Pommora's additions are dash-count column widths with resize, the heading-column toggle, the structure and merge guards, page-scoped in-cell undo, and the OS-native grip menu.

- **Live cell editors** — the focused cell mounts a nested editor reusing the main editor's inline rendering; resting cells render through the same token renderer with no editor behind them. ⌘Z forwards to the page history. A cell edit writes a minimal pipe-to-pipe diff and only the edited table's widget rebuilds.
- **Cell ⇄ source encoding** — a cell is single-line GFM: literal `|` / `\` escape, Shift+Enter serializes as `<br>`, so no keystroke or paste can split a row.
- **Structure is uncorruptible from the keyboard** — the widget replaces the source so the caret never reaches the pipes; a boundary delete removes the whole block, undoable. Two tables can't be fused: inserts are blank-line-fenced and deleting the lone blank between tables is refused.
- **Connections in cells** — render and autocomplete both work in-cell, aliases included, since the cell decoder restores the pipe before tokenizing. Resting on a resolved connection raises the shared hover preview, and a link in a resting cell carries its own right-click menu — the same menu its syntax and target earn it anywhere else. The actions that only rewrite text are performed against the cell without entering it; the ones that put you in position to retype enter it with what you came to replace already selected. A markdown link keeps its full behavior in the focused cell as well, so a link reads and acts the same in a cell as in a body.
- **Dash-count width** — column width is the delimiter cell's dash count (Pandoc convention) rendered as `<colgroup>` ratios; orthogonal to alignment, best-effort cosmetic outside Pommora.
- **Self-healing** — a region is a widget iff it parses as a single GFM table, re-evaluated per change; broken tables fall back to raw text with the caret preserved, and foreign tables round-trip byte-identical.
- **Grips** — hover reveals one quiet grip at a time (top per-column, left per-row): drag reorders live, right-click pops the OS-native menu (align / insert / clear / delete, Make Heading Column, Delete Table), a column-boundary drag resizes by moving whole dashes between neighbors, and the header-row grip's left-press drags the whole table as a block. Border append strips add a column or row at the end.

### Page Embeds

Typing`![[Title]]` on its own line embeds that Page in place — Obsidian's syntax, so a Nexus reads identically outside Pommora. The line becomes a live tile on the shared [[SurfacePM|Embed Framework]]: the page's real content at embed scale, wearing the tile chassis with the accent border that brightens on hover or when the caret is inside. **An embed is the page** — click in and edit in place; keystrokes flow through the page's own debounced save. A bottom-edge drag sets the tile's height, which is persisted per host page and target in `nexus.db` as a viewing preference.

The line must hold exactly one`![[Title]]`, and resolution is the discriminator: a title resolving to exactly one page claims a tile (first occurrence per document); unresolved, ambiguous, duplicate, non-page, and self-chain-cycle targets rest as the inert dim token, becoming tiles the moment resolution succeeds. Tiles are blank-line-fenced like tables — the fencing blanks keep their seats and their deletion refusal but render closed, so the tile sits at block-margin distance; a click seats the caret by the nearer edge, and typing at a seam reopens the blank. The raw syntax never shows at any caret position, and only a deliberate gesture removes a tile — its grip's Delete, or a selection swept across it.

**Creation has three doors:** the`![[` autocomplete (offering only pages the syntax can express — already-embedded pages, the host chain, and bracket-bearing titles omitted; an empty query browses the whole index), the context menu's **Embed ▸ Internal Page** (types the fenced empty pair with the autocomplete open), and the tile grip's **Page Source ▸** (a native Collections → Sets → Pages tree re-aiming the line in place).

**Nothing stays hot.** Tiles live with their host view, rehydrate from the warm path-keyed detail slot, and die with the tab; a tile's reading state (scroll, caret, undo) survives teardown in a session-scoped cache keyed by the host chain, invalidated when the page's body changes elsewhere. The rename cascade sweeps`![[` targets in the same pass as connections; an embed is never a link-graph edge. Nested embeds render display-only one level down; sub-targets (`#heading`, `^block`, `|alias`) and prefix-hosted embeds are deferred, degrading to the inert token.

### Webpage Embeds

The editor's second embedding type: `![Label](url)` alone on a line, with an explicit http(s) scheme, renders the live website as a tile on the same embed framework — the markdown mirror of the wiki form, so a Nexus still reads as plain CommonMark outside Pommora. The tile, its engagement model, and everything web-facing belong to [[WeblinkPM]]; the editor's own concerns — the grammar, the claim, the formation gate, and the Embed ▸ Webpage door — ride the same machinery the page tiles use.

### Block Drag & The Grip Menu

Every block carries a gutter drag handle that relocates the whole block to the nearest block boundary and doubles as its menu anchor. Blocks with their own chrome — the heading chevron, the quote and callout grips, the table's heading-row grip — double that chrome as the handle; one shared gesture serves them all. The drop is one source-line move, blank-separated at both new seams so a relocation never fuses adjacent blocks; the accent insertion line marks the slot, with edge auto-scroll and Escape/blur abort (→ [[PommoraDND]]). A folded heading auto-unfolds at drag start, since a fold can't survive the relocating edit. **One grip menu serves every kind**, keyed by the resolved block: **Delete** on all of them, with the kind's own arm above it — **Type ▸** on a list, **Page Source ▸** on an embed tile.

### Typing Transforms

Input-time only; each fires as one atomic transaction with a re-entry guard, all prefix-aware (a list behind `>` behaves like one at top level), and paste preserves literal text.

- **List continuation / indent** — Enter continues, Tab indents (capped), Shift+Tab outdents; checkbox canonicalizes (`-[]` → `- [ ]`).
- **Callout shorthand** — `||` → `> [!callout] `.
- **Auto-pair + paired-delete** — brackets plus the single emphasis / code / quote markers, gated on both sides of the caret so ordinary prose stays literal; markers type over their own closer on the way out, doubled emphasis promotes rather than pairs, and Backspace inside an empty pair removes both halves. All of it runs in table cells.
- **Enter / Shift+Enter close an open construct** — Enter steps past the closer; Shift+Enter closes first, then breaks, so a newline never lands inside a pair.
- **Dash / arrow auto-format** — `--` → `—`, `->` → `→`.
- **Smart whole-marker backspace** — deletes the whole marker on a marker line; callout-aware.

### Context Menu + Shortcuts

Right-click pops the OS-native menu, built in the main process off the `context-menu` event so the system edit roles, spelling, Speech, and Share come native, with Pommora submenus (Insert / Format / Embed / Heading / Lists) whose active state reads the live `EditorState`. **Insert Link** appears where the selection is itself an address, pointing it at itself in place — the words you selected stay the label, and a schemeless one gains the scheme that makes it open. It sits apart from `Format ▸ Link`, which opens an empty target for words you have yet to point anywhere. **Paste As ▸** closes that block, offering what the clipboard could become rather than what a plain paste would make of it: an address offers the three link forms and the address itself, a copied `[[Connection]]` offers either syntax that reaches its page, and a markdown link is read through its target the same way a link's own menu reads one. A clipboard holding none of those shows no submenu at all. The menu is main's, built off the `context-menu` event, so it never pops over a table's non-editable widget — Paste As is absent inside a cell, where ⌘V and the inverse chord still work. Shortcuts: ⌘B / I / E / K, ⌘⇧X (strike), ⌘⇧K (connection), and ⌘⇧V for the inverse paste (→ [[ConfigurationPM]] §Shortcuts).

### Module Shape

`MarkdownPM/` — one folder per concern: `parser/` · `detect/` · `tokens/` · `decorations/` · `input/` · `connections/` · `Tables/` · `editor/` (CM6 wiring). Appearance is `Styles.css` plus the table widget's stylesheet, every value resolving from the design-system tokens via the `--var` bridge. The pure-logic layer imports neither React nor CodeMirror and is unit-tested against a dedicated corpus. Internal invariants for working in this module live in [[Editor-Internals]].

### Design System

The editor's entire design vocabulary lives in one stylesheet as scoped custom-property families — there is no separate theme module (`MarkdownPM/tokens/` is the *markdown tokenizer*, not design tokens). The editor doesn't consume the type ramp: everything scales in `em` multiples off its own zoom root. 

**SOURCE:** `Pommora/src/renderer/src/MarkdownPM/Styles.css`

#### II. Scale

The root of everything: one size factor for structure, one derived factor for glyphs. `--block-zoom` is a registered `<number>` so the per-block zoom classes interpolate.

| Title | Token | Value · Scope |
| --- | --- | --- |
| Editor Size Factor | `--mdpm-scale` | `1` · `:root` (global so hosts inherit) |
| Per-Block Zoom | `@property --block-zoom` | `<number>`, inherits, initial `1` |
| Glyph Scale | `--glyph-scale` | `calc(var(--mdpm-scale) * var(--block-zoom, 1))` · `.mdpm-shell` |
| Fold Chevron Size | `--fold-chevron-size` | `calc(var(--text-title3-size) * var(--glyph-scale))` · `.mdpm-shell` |

#### II. Header, Banner & Title

| Title | Token | Value · Scope |
| --- | --- | --- |
| Page Title Size | `--detail-title-size` | `28px` · `.mdpm-header .detail-title` |
| Add-Banner Strip | `--add-banner-zone` | `44px` · `.mdpm-header:not(.has-banner)` |
| Header Park Distance | `--header-zone` | JS-set on `.mdpm-shell`; fallback `90px` |

#### II. Lists & Outliner

List geometry scopes to `.cm-line.md-li`; the outliner rail aliases the shared `--list-outline-*` primitives and adds its caps and x-position.

| Title | Token | Value |
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

| Title | Token | Value · Scope |
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

| Title | Token | Value |
| --- | --- | --- |
| Pastel Mix Step | `--tok-tint` | → `var(--tint-primary)` (60%) |
| Keyword / String / Number | `--tok-solid` on `.tok-kw` / `.tok-str` / `.tok-num` | purple / green / orange solids |
| Property / Function / Type | `.tok-prop` / `.tok-fn` / `.tok-type` | cobalt / yellow / cyan solids |

#### II. Embeds & Autocomplete

| Title | Token | Value · Scope |
| --- | --- | --- |
| Editing / Resizing Tile Ring | `--tile-border-color` | → accent-stroke / accent-stroke-hot · `.mdpm-embed-tile` states |
| Embed Grip Top | `--grip-top` | `28px` · `.mdpm-embed-line` |
| Autocomplete | `--ac-radius` / `--ac-rows` | `12px` / `4` · `.mdpm-ac` |

### Known Issues

- **An unreproduced renderer crash on a programmatic scroll toward a table inside an embed tile** — the window goes black with no crash log, and the same jump replays cleanly. Unreproduced since; no mechanism established.
- **A selection paints around a revealed connection's link glyph rather than across it** — the browser highlights text and steps over a decorative box holding none, leaving a notch mid-link. Giving the glyph an invisible space to carry the highlight worked in isolation and not in the editor.
- **Codeblock syntax cannot be rendered when on the first line of a callout** — an accepted limitation to handle later. The fence grammar admits only whitespace and `>` levels before its marker run, so a fence authored on the head line sits behind the `[!type]` tag and reads as prose.
- A mid-drag column hide/show or watcher view-push is silently reverted by a column drop's persist (`reorderColumn` reads grab-time state) — reachable only by mutating columns while holding a drag; a ref-read at commit fixes it if it's ever felt.
### Pending

- **Image + LaTeX render seams** — LaTeX is detected and styled only, and the wiki-image form rests inert: an image-style `![[file.png]]` target fails page resolution and renders nothing. The bang-paren form is spoken for — `![Label](url)` alone on a line is a webpage embed (→ [[WeblinkPM]]) — so a future image renderer arrives through the wiki form.
- **Fenced-code copy button** · **zoom slider** UI placement · **heading-fold inside a callout** (headings render there, but the fold chevron isn't prefix-aware) · **table inside a callout** (renders as raw text; needs prefix-aware region detection).
- **Outliner rails on ordered / arrow / `+` lists** — the guide is bullets + checkboxes only; the other glyphs need their own glyph-center math before their rails read straight.
- **Codeblock Style ▸ Language grip menu** — retyping a block's language from its grip; the list's Type ▸ arm is the pattern it follows. Widening the curated language set is one description in the highlight module plus its package.
