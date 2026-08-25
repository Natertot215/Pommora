## MarkdownPM

```
MarkdownPM
├── Architecture
├── Constructs
│   └── Typing Transforms
├── Tables
├── Embeds
├── Footnotes
├── Block Structure
├── Context Menu + Shortcuts
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

Pommora's Markdown editor, and the surface every Page body is written in. It behaves like a rich editor — styled headings, real bullets, rendered tables, live embeds — while the file underneath stays plain CommonMark and GFM. The syntax you type is exactly what gets saved, and everything the editor draws on top of it is presentation that never touches the disk, so a Page opened in any other Markdown tool reads as the same document. The editor also hosts the constructs Pommora adds on top of the standard: connections between pages, callouts, page and webpage embeds, and footnotes that number themselves.

### Architecture

The editor is built on CodeMirror 6, which provides the text substrate — caret, selection, IME, undo, viewport — with micromark and mdast supplying the Markdown parse behind the parser/seam. Everything above those two layers is Pommora's and lives in `src/renderer/src/MarkdownPM/`, one folder per concern: `detect/` scans the document once per version into a cached model of every construct (fences, tables, callouts, embeds, the citations section) so every feature reads the same answers; `tokens/` and `decorations/` turn that model into the marks, widgets, and caret-skip spans the view draws; `input/` holds the typing transforms; `Tables/` the table widget; `connections/` the link layer; and `editor/` wires it all into CM6 alongside the block drag, callout and citation guards, and the caret. Appearance is `Styles.css`, reading the design system's tokens through the CSS-variable bridge. Four rules hold the design together:

- **The document is the file.** The editor's document string is the page body as saved on disk. There is no intermediate model and no reconstruction step.
- **Display is not source.** The same bytes render differently depending on where the caret is, and the editor never tidies or normalizes what you wrote — every change to the file is one you made.
- **The editor sees only the body.** Frontmatter is split off when a page loads, held as a typed object, and re-serialized on save with any foreign keys and comments preserved. YAML never appears in the editor and can't be damaged from it.
- **Interface state stays out of the file.** Heading folds, embed tile heights, Scale factors, and similar per-machine preferences live in `nexus.db`, so the `.md` carries content and nothing else.[^1]

### Constructs

Markdown syntax in the editor is dynamic. A construct's markers — the asterisks around bold text, the hashes before a heading, the dashes of a list — appear as literal, editable text while the caret is inside it, and are hidden or replaced by styling the moment it leaves. Writing feels like editing source on the line you're on and reading a rendered page everywhere else. Each construct is recognized by `detect/`, given its marks by the tokenizer, and drawn by the decoration layer, which emits both what is shown and which spans the caret must skip from one intent stream so the two can never disagree. The chrome the editor draws — the horizontal rule, the quote card, code fills, list glyphs — exists only on screen, while reveal is line-scoped for inline marks, headings, and the thematic break, and marker-local for list glyphs; the box constructs (blockquote and callout) keep their chrome visible at all times.

- **Inline Marks** — bold, italic, bold-italic, strikethrough, highlight, inline code, links, and Connections. Each reveals with the caret, scales with the heading it sits in, and is suppressed inside code. All of them are reachable from the context menu's Format submenu and their ⌘ shortcuts, and each auto-pairs as you type.
- **Headings** — H1 through H6, sized on the em scale; the menus offer Paragraph and H1–H5. A heading folds from a chevron in the gutter. One with nothing beneath it carries no chevron but still appears in the page outline, and fold state is remembered per machine.
- **Lists** — bullets (`-`, drawn as `•`), `+`, arrows (typed `->`, drawn `→`), numbered lists, and GFM checklists all share one indent zone and one set of behaviors. Dragging an item by its glyph moves it together with its nested block and renumbers as it lands. The grip menu's **Type ▸** switches a whole block between the four kinds, and the context menu's **Lists ▸** turns each selected line into an item, removing the marker only when every selected line already has one. With **Mute Checked Items** on, a checked task reads as done — dimmed and struck through — while the file keeps its plain `- [x]`.[^2]
- **Outliner Rails** — an optional hairline guide down each nested list run, one per ancestor level, turned on with **Outliner Lines**. It covers dash bullets and checklists.[^2]
- **Code** — inline code and fenced blocks share the mono family and little else: inline code wears the code color over a tinted fill, a fenced block a neutral one. A fence's info word sets its language. Any of the forty-odd languages in the roster gets a syntax-colored parse; a bare fence stays plain. The backticks always show, but a typed block hides its info word behind the language's name and mark at the top-right, revealing the raw word again while the caret is on the fence line. That tag is also the block's copy control. **Show Line Count In Code Blocks** numbers the content lines.[^2]
- **Blockquote** — an always-visible rounded card with an accent bar down its side. Other block constructs nest inside it at any depth. A `>` counts as a marker only when whitespace or the line's end follows it, so `>a` stays ordinary prose.
- **Callout** — a `> [!callout]` blockquote rendered as a bordered box spanning the gutter width, typed with the `||` shorthand. Each head is detected on its own, so adjacent or pasted callouts never merge, and an invalid tag falls back to a plain quote. The hidden head can't be reached by the caret, and Shift+Enter keeps you inside the box.
- **Horizontal Lines** — `---` draws as a full-width rule whenever the caret is off its line. It is never read as a setext heading.
- **Connections** — `[[Title]]` and `[Alias](Title)` render as colored inline text in one of three states, with an autocomplete that opens on `[[` and a right-click menu of their own. How they resolve, how they're styled, what the menu offers, and how renames cascade all belong to Connections.[^3]
- **Pasted Links** — an address with an explicit scheme, pasted anywhere in the editor, is written as a link rather than as bare text, in one of three forms: the whole address, its bare domain, or the site's page title. **Default Format** picks the form and **Paste Link Into Text** decides whether pasting over a selection wraps that text instead of replacing it.[^2] Inside a code span, a fence, or another link's `( )`, the address lands as the literal text those places are made of. ⌘⇧V does the opposite of whatever ⌘V would have done.
- **The Caret** — a drawn caret with a smooth symmetric fade and a custom I-beam cursor, shared by every text surface in the app.[^4]

#### Typing Transforms

A handful of rewrites fire as you type, implemented in `input/` as CodeMirror transaction handlers: each fires as one atomic transaction with a re-entry guard, and each is prefix-aware, so a list inside a blockquote behaves exactly like one at the top level. They only ever respond to keystrokes — pasted text is left as it was.

- **List continuation** — Enter continues a list, Tab indents (to a cap), Shift+Tab outdents, and `-[]` canonicalizes to `- [ ]`.
- **Callout shorthand** — `||` becomes `> [!callout] `.
- **Auto-pair** — brackets and the single emphasis, code, and quote markers pair when the caret sits at a word boundary. A marker types over its own closer on the way out, doubled emphasis promotes to the stronger form rather than pairing again, and Backspace inside an empty pair removes both halves. `~` and `=` pair only on the second press, since a single one is punctuation. All of this works inside table cells too.
- **Enter and Shift+Enter** — Enter steps past an open construct's closer; Shift+Enter closes it first, then breaks the line.
- **Dashes and arrows** — `--` becomes `—`, `->` becomes `→`.
- **Whole-marker backspace** — on a marker line, Backspace removes the whole marker at once, callouts included.

### Tables

GFM pipe tables render as an editable HTML table rather than as rows of pipes: a block-replace widget drawn over the canonical GFM source, ported to React from [ckant/codemirror-markdown-tables](https://github.com/ckant/codemirror-markdown-tables) (MIT) and living in `MarkdownPM/Tables/`. `regions.ts` finds every table in the document model, `codec.ts` translates between a cell's text and its GFM encoding, `guard.ts` refuses edits that would corrupt the structure, and `widget.tsx` draws the table. You click into a cell and type; the editor writes the pipes. GFM sets the ceiling — rectangular cells, per-column alignment, and inline-only content — which is exactly what a widget over that source can express without loss, so a table built here is a table anywhere. Pommora's additions on top of the port are dash-count column widths with drag-to-resize, the heading-column toggle, the structure guards, in-cell undo, and the native grip menus.

- **Cells** — the focused cell mounts a nested editor with the main editor's inline rendering; resting cells render without one. ⌘Z inside a cell forwards to the page's own history. Each cell is single-line GFM — `|` and `\` are escaped, and Shift+Enter writes a `<br>` — so no keystroke or paste can split a row.
- **Structure** — because the widget replaces the source, the caret never reaches the pipes. Deleting at a table's boundary removes the entire block in a single undoable step, and tables are fenced by blank lines, so two can't be fused.
- **Connections in cells** — connections render, autocomplete, and carry their menu inside cells just as they do in the body.[^3]
- **Width** — a column's width is the number of dashes in its delimiter cell (the Pandoc convention), rendered as proportional widths here and treated as best-effort cosmetics by other tools.
- **Self-healing** — a region is a widget only while it parses as a single GFM table. A table that breaks falls back to raw text with the caret where it was, and tables written elsewhere round-trip byte-for-byte.
- **Grips** — hovering reveals one grip at a time: above each column and beside each row. Dragging a grip reorders; right-clicking it opens the native menu with align, insert, clear, and delete, plus Make Heading Column and Delete Table. Dragging a column boundary resizes; the header row's grip drags the entire table as a block, and the strips along the bottom and right edges append a row or column.

### Embeds

Two forms, each written alone on its own line, render as live tiles on the page: another Page, or a website. A tile is the real thing — a page tile is that page's editor, scrollable and editable in place, and a webpage tile is the live site. The editor's side of it is small: `detect/` recognizes a lone-line embed, `editor/embedRanges.ts` decides which lines claim a tile, and `editor/embedWidget.tsx` mounts the shared `PageEmbed` or `WebpageEmbed` component from `src/renderer/src/Embeds/`, the same components the dashboard, the preview window, and the hover card render through. Both forms stay plain Markdown on disk — Obsidian's `![[Title]]` for a page and the image form `![Label](url)` for a site — so a Nexus reads the same outside Pommora and the tile is presentation over an ordinary line.

- **Page Embeds** — `![[Title]]` embeds that Page in place as an editable tile; edits made within the tile are edits to the page itself.[^5] A title resolving to exactly one page claims a tile (the first occurrence per document). Unresolved, ambiguous, duplicate, non-page, and self-referencing targets remain as inert tokens and become tiles the moment resolution succeeds. Tiles are blank-line-fenced like tables, and only a deliberate gesture removes one — the grip's Delete, or a selection swept across it. There are four ways to create one: the `![[` autocomplete, which offers only pages the syntax can express; the context menu's **Embed ▸ Internal Page**; **Paste As ▸ Embedded Page** on a copied connection; and the grip's **Source ▸** tree, which re-aims an existing tile. The grip's **Scale ▸** carries the shared Scale ramp, and both the factor and the tile's dragged height persist per machine. Nested embeds render one level down, display-only. Sub-targets such as `#heading`, `^block`, and `|alias` rest as the inert token.
- **Webpage Embeds** — `![Label](url)` with an explicit http(s) scheme renders the site as a live tile on the same framework. The tile and everything about it that faces the web belong to Webview.[^6]

### Footnotes

GFM reference footnotes work as written: a `[^label]` marker in the body and a `[^label]: text` citation in the run at the end of the document, left as plain GFM on disk. The document model (`detect/`) identifies that trailing run as the citations section, and a citation only counts as one while the run reaches the document's end — a citation-shaped line sitting above live content is just prose. The guards and edit handlers in `editor/citation*.ts` keep the section consistent as the body changes. In the editor, markers draw as their first-use ordinal rather than their label, so footnotes read as 1, 2, 3 in reading order regardless of what they were named, in the body and in table cells alike. A marker nothing binds to stays literal, and a citation nothing points at draws dimmed.

Whether the citations section is visible follows **Show Footnotes By Default**, overridden per page from the **Show Footnotes** / **Hide Footnotes** control in the Subfield band, and **Jump To Citation On Creation** carries the caret down to a citation you've just made.[^2] Clicking a marker's number travels to its citation — or follows it directly, where the citation is exactly one link or Connection — and a citation's own number leads back to its first marker. Right-clicking a marker gives **Edit · Copy · Delete**; a citation gives **Copy · Delete**. Deleting a footnote removes every row its label claims, and editing either end renumbers the section within the same transaction, so a single undo reverses both. The section contributes nothing to the Subfield's word counts and can't be dragged as a block.

### Block Structure

The editor treats the document as a sequence of blocks — paragraphs, headings, lists, quotes, callouts, code blocks, tables, tiles — resolved from the document model by `editor/blockModel.ts`, and every block has a handle in the gutter to its left (`editor/blockHandles.ts`) that is both how you move it (`editor/blockDrag.ts`) and where its menu lives. Blocks that already carry chrome of their own use it as the handle: the heading's fold chevron, the quote and callout grips, the table's heading-row grip. Dragging the handle relocates the block to the nearest block boundary as one move of its source lines, kept blank-separated at both seams so it never fuses with a neighbor; the gesture itself is the shared insertion-line drag.[^7] A folded heading unfolds when its drag begins.

The handle is also where the block's menu lives. One menu model serves every kind of block, with rows keyed to what that block is:

| Block | Rows |
| -------------------------------------- | -------------------------------------------------------------- |
| Plain (paragraph, quote, callout, code, table) | Delete |
| Heading | Rename · Size ▸ (Paragraph, H1–H5) · Delete — removes the heading line and keeps its body |
| List | Type ▸ (Numbered, Bulleted, Checklist, Arrowed) · Delete |
| Page tile | Source ▸ (Collections → Sets → Pages) · Scale ▸ · Delete |
| Webpage tile | Edit Link · Scale ▸ · Delete |

### Context Menu + Shortcuts

Right-click anywhere in the editor opens the operating system's own menu rather than an in-app one. The renderer sends a snapshot of the editor state — what's selected, what construct the caret is in, whether a footnote could bind here — over IPC, and `src/main/editorMenu.ts` builds the native menu from it, so the standard edit roles, spelling, Speech, and Share all arrive native and every Pommora item's enabled state reflects where you clicked. The submenu models themselves (`shared/PasteAsMenu.ts`, `shared/gripMenu.ts`, `shared/citationMenu.ts`) are shared code both processes read, so the renderer and main can't disagree about what a menu offers:

- **Insert ▸** — Blockquote, Horizontal Rule, Code Block, Callout, Table, and — anywhere a marker can bind — Footnote.
- **Insert Link** — appears when the selection is itself an address, and points it at itself in place.
- **Format ▸** — the inline marks, plus Connection and Link.
- **Embed ▸** — Webpage or Internal Page.
- **Heading ▸** — Paragraph and H1–H5. **Lists ▸** — Bullet, Numbered, Task.
- **Paste As ▸** — what the clipboard could become rather than what a plain paste would make of it. An address offers the three link forms, Plain Text, and Embedded Link on a blank line; a copied connection or markdown link offers Connection, Markdown Link, and Embedded Page; any text offers Footnote wherever a marker can bind.

Keyboard shortcuts are the Format marks' ⌘ chords and **Inverse Paste** on ⌘⇧V.[^8]

### Design System

The editor's design vocabulary is defined in one stylesheet as scoped custom-property families; there is no separate theme module. The editor doesn't consume the type ramp — everything scales in `em` multiples off its own zoom root.

**SOURCE:** `Pommora/src/renderer/src/MarkdownPM/Styles.css`

#### II. Scale

The root of everything: one size factor for structure, one derived factor for glyphs. `--block-zoom` is a registered `<number>` so the per-block zoom classes interpolate.

| Title | Token | Value · Scope |
| --- | --- | --- |
| Editor Size Factor | `--mdpm-scale` | `var(--editor-scale)` · `:root` (`--editor-scale: 1`, the Editor Scale setting) |
| Per-Block Zoom | `@property --block-zoom` | `<number>`, inherits, initial `1` |
| Glyph Scale | `--glyph-scale` | `calc(var(--mdpm-scale) * var(--block-zoom, 1))` · `.mdpm-shell` |
| Fold Chevron Size | `--fold-chevron-size` | `calc(var(--text-title3-size) * var(--glyph-scale))` · `.mdpm-shell` |

#### II. Header, Banner & Title

The page header's own measures — the title size and the zones the banner and header park in.

| Title | Token | Value · Scope |
| --- | --- | --- |
| Page Title Size | `--detail-title-size` | `calc(28px * var(--editor-scale, 1))` · `.mdpm-header .detail-title` |
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

The box constructs — quote, callout, code, and highlight — share a corner radius and a gap and each names its own knobs over them.

| Title | Token | Value · Scope |
| --- | --- | --- |
| Quote Bar | `--bar-width` / `--bar-color` / `--bar-radius` | `4px` / → label-tertiary / `2px` · `.md-bq` |
| Quote Box | `--box-fill` / `--box-radius-r` | → fill-tertiary / `6px` |
| Quote Gap | `--bq-gap` | → box gap |
| Callout Frame | `--callout-border` / `--callout-bw` / `--callout-radius` | → label-tertiary / `1.5px` / `6px` · `.md-callout` |
| Callout Padding | `--callout-pad` / `--callout-gap` / `--callout-inner-pad` | `15px` / `6px` / `8px` |
| Callout Grip | `--grip-x` / `--grip-y` | `-18px` / `4px` |
| Nested Quote | `--nq-bar` / `--nq-bar-radius` / `--box-radius-r` / `--nq-gap` / `--nq-inset` | `3px` / `2px` / `5px` / `9px` / `2px` · `.md-callout.md-bq-in` |
| Code Block | `--cb-bg` / `--cb-radius` / `--cb-size` / `--cb-gap` / `--cb-pad` | → fill-secondary / → box corner / `0.85em` / `6px` / `12px` (`10px` inside quotes and callouts) · `.md-cb` |
| Box Corner | `--md-box-radius` | `6px` · `:root` — what quote, callout, code and highlight round to; each still names its own knob |
| Box Gap | `--md-box-gap-base` / `--md-box-gap` | `6px` · `:root` / `base × --glyph-scale` · `.mdpm-shell` — what quote, callout, code and the table float off their neighbours by, scaling with the surface |
| Highlight | `--highlight` / `--highlight-bleed` | → the Highlight Color, else the accent, worn at tint-secondary / `0.1em` · `.md-highlight` |
| Language Tag | `.md-cb-lang` | name at → label-control, its mark at → label-secondary, `1.15em` — fifteen languages carry a mark; the tag is the block's copy control |
| Line-Number Zone | `--cb-ln-zone` | `calc(3ch + var(--list-gap))` |

#### II. Syntax Colors

One pastel recipe: `color-mix(in srgb, var(--tok-solid) var(--tok-tint), var(--label-primary))` — the same tint-step system as the rest of the design system.

| Title | Token | Value |
| --- | --- | --- |
| Pastel Mix Step | `--tok-tint` | → `var(--tint-primary)` (60%) |
| Keyword / String / Number | `--tok-solid` on `.tok-kw` / `.tok-str` / `.tok-num` | purple / green / orange solids |
| Property / Function / Type | `.tok-prop` / `.tok-fn` / `.tok-type` | cobalt / yellow / cyan solids |

#### II. Embeds & Autocomplete

The tile ring and grip, and the autocomplete pane's one editor-owned measure.

| Title | Token | Value · Scope |
| --- | --- | --- |
| Editing / Resizing Tile Ring | `--tile-border-color` | → accent-stroke / accent-stroke-hot · `.mdpm-embed-tile` states |
| Embed Grip Top | `--grip-top` | `28px` · `.mdpm-embed-line` |
| Autocomplete | `--ac-rows` | `4` · `.mdpm-ac` — the pane is a PickerMenu, which owns its radius |

---

#### Known Issues

- **An unreproduced renderer crash** on a programmatic scroll toward a table inside an embed tile — the window goes black with no crash log, and the same jump replays cleanly.
- **A code fence on the first line of a callout reads as prose** — the fence grammar admits only whitespace and `>` before its marker run, so a fence authored on the head line sits behind the `[!type]` tag.

#### Pending

- **Multi-citation markers** — `[^#-#]`, one marker binding two footnotes.
- **Image and LaTeX rendering** — LaTeX is detected and styled only; an image-style`![[file.png]]` target renders nothing. The bang-paren form is the webpage embed, so a future image renderer arrives through the wiki form.
- **Heading fold and tables inside a callout** — headings render there, but the chevron isn't prefix-aware; a table inside a callout renders as raw text.
- **Outliner rails on numbered, arrow, and `+` lists** — the guide is bullets and checklists only.
- **Language ▸ on the code block grip** — retyping a block's language from its grip, following the list's Type ▸.

[^1]: [[ArchitecturePM]] §Persistence
[^2]: [[ConfigurationPM]] §Pages & Editor · §Files & Links
[^3]: [[ConnectionsPM]]
[^4]: [[InteractionPM]] §The Caret
[^5]: [[SurfacePM]] §The Embed Framework
[^6]: [[WebviewPM]]
[^7]: [[PommoraDND]]
[^8]: [[ConfigurationPM]] §Shortcuts
