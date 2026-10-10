## Links Cleanup Synthesis

How Pommora and its MarkdownPM editor handle links at baseline, what's broken, and the design the rulings and evidence settle on, organized by rule. It's the code-level companion to *Links Cleanup — Continuation*, which holds the rulings (§5), the design summary (§6), the prototype (§7), and the process; each rule section here carries the detail and reasons behind a §6 row. It's drawn from the scout reports (`scouts/`), the verifier reports (`verified/`), and the foundation prototype (`proving/`), which remain beside it as the evidence trail.

**Now and Target:** Each rule section keeps the code as it stands (*Current Shape*, *Defects*) apart from what the cleanup makes true (*Design*). Nothing in *Design* exists yet; the pieces marked as built in the prototype exist only in its unapplied diff.

**Markers:** Unmarked claims are verified by reading the code at baseline. **Probed** marks a behavior reproduced by running a pure function, **Inferred** a mechanism read but not driven, and **Live Check** a behavior only driving the app settles (each is listed in the Continuation's §11). A trailing ID such as (A-45) or (X-01) locates the evidence in the reports; F-numbers name findings in `.claude/Planning/Pommora Codebase Audit.md`.

---

### 1. Contents

1. *§Contents*
2. *§Baseline*
3. *§The Rules*
   - 3.1 Reading Link Syntax
   - 3.2 Writing Link Syntax
   - 3.3 Caret Readers and Slots
   - 3.4 Code Gating
   - 3.5 Resolution and Status
   - 3.6 Drawing and Looks
   - 3.7 Pointer Gestures
   - 3.8 Menus and Their Actions
   - 3.9 MarkdownPM Table Cells at Rest
   - 3.10 Link Property Values
   - 3.11 Paste, Paste As, Copy, and Retarget
   - 3.12 The Picker
   - 3.13 Opening and Titles
   - 3.14 Embeds
   - 3.15 Section Runs and Citations
   - 3.16 Rename and Index
   - 3.17 Delivery Seams
   - 3.18 Names and Vocabulary
   - 3.19 Types and Conversions
   - 3.20 Placement

---

### 2. Baseline

- **The Code:** Production code is unchanged since `42a18f4a5`, which is the Link Gestures commit `75c3bcb9c` plus a docs reconcile, so every anchor here holds. The prototype's diff isn't applied to the repository.

#### 2.1 Where Link Code Lives

Paths are under `Core/` unless they name another root.

| File | Owns |
|---|---|
| `Connections/connections.ts` | The wikilink and embed grammars, `linkSpans`, the regex caret readers (`linkAt`, `aliasSpanAt`, `emptyAliasPipeAt`, `emptyHeadingHashAt`), `parseConnectionText`, `connectionText`, `expressibleHeading`, `embeddableTitle`, `pageEmbedText` |
| `Connections/links.ts` | The markdown-link grammar (`MD_LINK`, `emptyTolerantLinkRegex`), `escapeAlias`/`unescapeAlias`, `composeWebpageEmbedLine`, destination spans, `targetTitle`/`targetFragment`/`targetNamesTitle` |
| `Connections/scan.ts` | `linksIn` (the index's link walk), `sectionRunsIn`, `frontmatterMentions`, `valueLinks` |
| `Connections/rewrite.ts` | Title and heading rename rewrites, `rewriteFrontmatterConnections` |
| `Connections/linkValue.ts` | The Link value codec (`linkEntry`, `readLink`, `parseLink`, `serializeLink`, `parsePastedLink`, `linkValueFromEdit`, `linkDisplayText`) and the editor's paste writers (`LinkPaste`, `linkMarkdown`, `linkPaste`) |
| `Connections/pageIndex.ts` | `buildPageIndex`, the one resolver builder |
| `Connections/aliasMemory.ts` | Alias memory |
| `MarkdownPM/Links/connectionsApi.ts` | `ConnectionsApi`, `ConnMenuTarget`, `MdTarget`, `titleTarget`, `resolveMdTarget`, `tokenTarget`, the menu-target builders, `wikiLinkView`, `openPage` |
| `MarkdownPM/Links/linkClicks.ts` | `linkPointer`, `followTarget`, `heldTarget`, `resolveFollow`, `dwellTarget`, `sectionRunAt` |
| `MarkdownPM/Links/linkEdit.ts` | `applyLinkAction`, `wikiAuthorTarget`, `commitAliasOnEnter`, alias memory and slot cleanup (`slotNear`, `leaveSlot`, `aliasOnLeave`) |
| `MarkdownPM/Links/linkFormat.ts` | `applyUrlLinkAction` and `linkActionText`, the markdown-link actions |
| `MarkdownPM/Links/pendingTitle.ts` | Pending page-title swaps (`awaitTitle`, the sweep) |
| `MarkdownPM/Links/pasteLink.ts`, `pasteDecision.ts` | The editor's paste handler and its decision |
| `MarkdownPM/Links/headingHash.ts`, `linkReveal.ts` | The `§` → `#` typing transform; `linkRest`/`linkTyping` |
| `MarkdownPM/Autocomplete/` | The `[[` picker: `autocomplete.ts` (query and commit), `useConnectionAutocomplete.ts` (the hook), `AutocompletePane.tsx`, `headingTarget.ts` |
| `MarkdownPM/Engine/tokens.ts`, `detect.ts` | The tokenizer (`wikiLinkTokens`, `tokenizeChunk`, `linkTokenAt`); lone-embed and webpage-embed detection |
| `MarkdownPM/decorations.ts` | The body draw, `drawnLinkAt`, the embed claim filter, section runs |
| `MarkdownPM/Tables/cellStatic.tsx` | The resting renderer for MarkdownPM table cells and Text values (`renderCellContent`, `linkGestures`, `menuAt`, `menuTarget`) |
| `MarkdownPM/Tables/MarkdownTable.tsx`, `CellEditor.tsx`, `widget.tsx` | Cell activation and selection seating, the live cell editor, the `tableConnections` facet |
| `MarkdownPM/Input/edits.ts`, `markdownInput.ts`, `format.ts` | Link-liveness predicates (`linkInCode`, `inAliasAt`, `isInsideWikilink`, `isLiteralAt`), typing, Format ▸ wrap and unwrap |
| `MarkdownPM/Embeds/embedWidget.tsx`, `embedInsert.ts`; `Engine/embedClaims.ts` | Page and webpage tiles; the embed claim |
| `MarkdownPM/Citations/` | Citation markers and their pointer and menu |
| `Properties/Cells/LinkCell.tsx`, `TextCell.tsx`, `linkResolve.ts` | Link and Text property values at rest; the Link commit's resolver |
| `Interface/Menus/connectionMenuActions.ts`; `Actions/connectionMenu.ts` | `showConnectionMenu` and `linkValueMenuTarget`; the pure link-menu model |
| `Actions/pasteAsMenu.ts`, `editorMenu.ts`; `Desktop/Actions/editorMenu.ts` | Paste As rows and writes (pure, read by main); the editor menu schema; main's clipboard read and row build |
| `Session/pageConnections.ts` | The `ConnectionsApi` builder (`preview`, `window`, `inert`) |
| `Web/openWebLink.ts`, `handlers.ts`, `titleScan.ts`; `Desktop/Web/` | The in-app vs system choice for an address; the `link:open` handler; title fetching and the guest attach gate |
| `Paths/urlPath.ts` | `isHttpLink`, `isValidLink`, `WEB_ADDRESS`, `normalizeLinkUrl` |
| `Nexus/treeIndex.ts` | `pageIndexOf`, `resolveConnection` |

---

### 3. The Rules

Each section states the rule's *Current Shape* and *Defects* at baseline, its *Design* after the cleanup, its *Traps*, and the documentation and tests that *Would Go False*.

---

#### 3.1 Reading Link Syntax

##### Current Shape

- **Wikilink and Embed Grammars:** `pageLinkPattern` (`connections.ts:7-8`) reads `[[Title#Heading|Alias]]` with a 255 cap on each half, which keeps an unclosed `[`-run from backtracking quadratically; its alias admits no `]`. `(?<!!)` keeps it disjoint from `pageEmbedPattern` (`connections.ts:3-4`), which excludes `#` from the page and has no alias. (A-123)
- **Seven Readers Consume Raw `pageLinkPattern` Groups:** `linkSpans` (`connections.ts:24-40`, feeding `linkAt` and `wikiLinkTokens`, `tokens.ts:228-253`); `WHOLE_LINK`/`parseConnectionText` (`connections.ts:66,74-87`); `linksIn` (`scan.ts:80-91`); the two rewrites (`rewrite.ts:35,81`, through `groupsOf`/`offsetOf`, `:21-23`); `wholeWikiLink` (`pasteAsMenu.ts:30-33`); the picker's worn alias (`useConnectionAutocomplete.ts:165-168`); and `sectionRunsIn`'s exclusion (`scan.ts:30-32`). `wholeWikiLink` skips the trim and `titleOf`, refuses a heading, and drops the alias. **Probed:** `[[T|a]]` → page `T`, no alias. (A-13)
- **The Cell-Escape Rule Is Written Twice:** `linkSpans` strips a trailing `\` only when an alias follows (`connections.ts:32-33`). `titleOf` (`connections.ts:21-22`) strips one unconditionally, called from `linksIn` (`scan.ts:87,89`), the rewrites (`rewrite.ts:37,39,84`), and `parseConnectionText` (`connections.ts:79-80`). (A-07)
- **Two Markdown Grammars:** The tokenizer's `markdownLinkRegex` and `emptyTolerantLinkRegex` (`links.ts:8-17`) cap the label at 255 and the destination at 2048, refuse a label opening with `^` (GFM's footnote reference), and admit parentheses nested two deep. `MD_LINK` (`links.ts:5`) has no caps and no `^` refusal, its destination is a greedy `(.*)`, and only its label admits a newline. Its readers are `parseLink` (`linkValue.ts:39`), `parsePastedLink` (`:55`), and `pasteAsTarget` (`pasteAsMenu.ts:42`, which refuses newlines first at `:37`). (A-09, A-150)
- **Four Classifiers Answer "What Link Does This Text Name":** One question with four policies, the mechanism behind F-042. `namesGonePage` (`propertyValue.ts:123-126`) is a fifth entry point, through `parseConnectionText`. (A-14)

| Reader | Location | A Markdown Target Naming a Title Is |
|---|---|---|
| `readLink` | `linkValue.ts:30-35` | A url, always (**Probed:** `[x](Old)` → url) |
| `parsePastedLink` | `linkValue.ts:48-62` | A page if it resolves, else refused; an unresolved title never falls through to the address arm at `:61` |
| `pasteAsTarget` | `pasteAsMenu.ts:35-47` | A page, never resolved (**Probed:** `[x](example.com)` → page `example.com`) |
| `resolveMdTarget` | `connectionsApi.ts:64-68` | A page if it resolves, else `external` if valid |

- **`parsePastedLink` on an Unresolved Markdown Title:** The `title !== null` branch returns `named(...)` (`linkValue.ts:59-60`), which returns null when the resolver answers nothing (`:49-52`), so `linkValueFromEdit` refuses it; `isValidLink('[x](example.com)')` is false (`:91`). **Probed:** `[l](example.com)` → `undefined`; a bare `example.com` → `https://example.com`. (A-15, A-142)
- **`pasteAsTarget` on Headings and Bare Fragments:** `wholeWikiLink` refuses a heading, `MD_LINK` doesn't match, and `isValidLink` refuses the text, so `[[T#H]]`, Copy Link's own output, reads as nothing. `[x](#H)` reads as a page with an empty title (`targetTitle('#H')` is `''`, `links.ts:98`). (A-106)
- **`readLink` Classifies by Syntax Alone:** A whole wikilink is a page and everything else a url (`linkValue.ts:30-35`). Its host-side readers are `goneEntry` (`cascade.ts:97`), `frontmatterMentions` (`scan.ts:118`, through `wholeValueLink`), `valueLinks`' exclusion (`scan.ts:134`), and `rewriteFrontmatterConnections` (`rewrite.ts:125`); its renderer-side readers are `LinkCell.tsx:30`, `valueClick.ts:51`, `connectionMenuActions.ts:81`, and `linkValue.ts:66,71,78,92,99,111`. The host has no resolver (*§3.5*). (A-133, B-167, T-05)
- **A Bare URL Isn't a Token:** `TokenKind` has no url kind (`tokens.ts:17-29`). (A-132)
- **Precedence and the Code Rule Live Only in the Editor:** The tokenizer drops a markdown token overlapping a wikilink or embed (`notOverlapping`, `tokens.ts:284-288`); `linksIn` applies no precedence and masks only a link's start (`scan.ts:83`). **Probed:** `[x]([[T]])` tokenizes to `wikiLink` alone, while `linksIn` yields `wiki:t` and `markdown:[[t]]`, an unresolvable extra key; `[[T]](x)` yields no markdown match in either reader, since a label can't hold `]`. (A-21, B-139)

##### Defects

- **Heading Escape Drift:** For `[[A#Note\]]`, the index records qualifier `note` while the editor keeps the heading as `Note\`, and both a heading rename of `Note` and a title rename of `A` consume the backslash. **Probed.** The page half is latent, since titles can't hold `\` (`Paths/names.ts:15`). (A-07, B-139)
- **`MD_LINK` Misreads:** `[a](b) [c](d)` reads as url `b) [c](d`, and `[^1](x)` reads as a link, in Link values and Paste As. **Probed.** (A-09)
- **Four Policies for One Question:** A Link value `[x](Old)` is a url to `readLink` but a backlink to `Old` in the index (*§3.16*); Paste As treats `[x](example.com)` as a page; the Link property refuses it. **Probed.** (A-14, A-15)
- **Paste As Loses What It's Handed:** `[[T|a]]` loses its alias, `[[T#H]]` offers no rows, and `[x](#H)` offers page rows that write an empty connection (rows: *§3.11*). (A-13, A-106)

##### Design

- **The One Link Walk (S1-C, B-127):** `linkOccurrences(text, inCode)` in `Core/Connections/connections.ts` becomes the one reader of written link syntax, which the draw, typing, the index, and renames all go through (*Continuation §5.2*) (built in the prototype).
  - It will return every connection and markdown link that code doesn't touch (*§3.4*): a connection with `full`, `title`, `heading`, and `alias` spans, a markdown link with `full`, `label`, and `destination`. Empty slots will be kept: `[[]]` and `[[|x]]` stay refused, while `[[#]]`, `[[T|]]`, and `[[T#]]` will return zero-width slots.
  - A markdown link overlapping a connection will yield to it, so `[[Title]](target)` stays a connection trailed by literal parens, as Obsidian reads it.
  - `(?<!!)` and `pageEmbedPattern` go, so `![[P]]` becomes `!` plus a connection to every reader; what tiles is decided by the tile claim (*§3.14*).
  - The tokenizer will map occurrences to tokens through `linkToken`, replacing `wikiLinkTokens`, the markdown-link and embed `RegexSpec`s, and the `'embed'` kind; every other token kind keeps its overlap rule exactly. It keeps the per-chunk call shape (`visibleInline`, `decorations.ts:376`), so the walk adds no high-frequency work. The token shape is in *§3.3*. (A-100)
  - `linksIn` will yield from the walk, each `LinkHit` carrying `title`, `heading`, and `alias` spans for the span edits (*§3.16*). A `names()` rule will keep a bare fragment or `§` run keyed `''` when the surface gives no own title, while `[[#]]`, `[[ ]]`, and a blank page half will name nothing. A connection alone on its line behind `!` will keep `syntax: 'embed'`, with `at` on the `[[` (*§3.14*). `sectionRunsIn`'s exclusion will read the walk (*§3.15*).
  - `linkSpans` and `titleOf` become private (`parseConnectionText` still reads `titleOf`); `linkAt`, `aliasSpanAt`, `emptyAliasPipeAt`, `emptyHeadingHashAt`, and `targetNamesTitle` go.
  - **What It Changes:** Host and editor will share one grammar, one precedence, one escape rule, and one code rule. **Probed in the prototype:** `[[A#Note\]]` stopped matching heading `Note`; `[[A\]]` with no alias indexed as `A\`; `[x]([[T]])` recorded no phantom key; a link holding inline code wasn't indexed.
- **One Markdown Grammar and One Value Model (S1-B):** `MD_LINK` will be rebuilt from the anchored `emptyTolerantLinkRegex` source, as `WHOLE_LINK` is built from `pageLinkPattern`, so whole-value readers take the tokenizer's caps and `^` refusal and the two `MD_LINK` misreads stop. `ConnectionParts`, `LinkValue`, and `parseLink` go; `parseLink` has no production reader outside `linkValue.ts`. (A-99, A-159)
- **`readLink` Reports Written Syntax (X-01):** `readLink` will report what was written (`wiki`, `markdown`, or `bare`, with the title or destination, heading, and alias) as a `ParsedLink` (*§3.19*), and classify nothing. Host readers will answer by name-matching the title they already hold; renderer readers and the commit will read the resolved target (*§3.5*); Rename and Edit Title will keep the written syntax (*§3.10*). *Continuation §5.7*'s handling of a hand-written `[x](Page)` value rests on it. The host readers' move, their name-match predicate (the prototype deletes `targetNamesTitle` with its last caller), and M9-01 are *§3.16*'s.
  - A resolver-free page arm on `readLink`, where a markdown target with a non-null `targetTitle` is a page, doesn't work: `namesGonePage` would answer yes for `[x](example.com)`, `[x](www.google.com)`, and `[Doc](Notes.md)`, so a frozen restore strips those values with nothing parked, and `linkValueFromRename` would write the phantom `[[example.com|y]]`. **Probed.** (P-21, X-01)
- **One Clipboard-and-Commit Reader (S3-1):** `readLinkText(text, resolve?): LinkTarget | null` in `linkValue.ts` will replace `parsePastedLink`, `pasteAsTarget`, `wholeWikiLink`, and `PasteAsTarget`. (A-106, A-142, A-144, Q-25)
  - **Rules:** A whole connection will be a page carrying its heading and alias. A markdown link whose target names a title will be a page when it resolves, its fragment the heading and its label the alias. Anything else will be a valid address, normalized to a scheme, or nothing. `[x](#H)` will be refused explicitly.
  - **With a Resolver:** Ambiguity will be refused explicitly (*§3.5*), and the value's holder will answer an empty title, so `[[#H]]` commits on a page and is refused on a Space (*Continuation §5.7*).
  - **Without a Resolver:** Main builds the Paste As rows and can't resolve (F-114), so there a page will need a non-null `targetTitle` and `!isValidLink(dest)`. `[Doc](Notes.md)` will then offer address rows in main, as it does today, which is the accepted trade.
  - **Behavior:** Paste As will keep alias and heading, `[[T#H]]` will offer Connection and Markdown Link, `[x](example.com)` will offer address rows, and `[x](#H)` will offer nothing (*Continuation §5.8*); the Link property will accept `[x](example.com)` as `[x](https://example.com)`. Paste As rows and `pasteAsWrite` are *§3.11*'s; the Link value commit is *§3.10*'s.
  - Reading `[x](Page)` as an unresolved page whenever its target is title-shaped doesn't work: `targetTitle('example.com')` is non-null, so every schemeless address would become a page. (A-105)

##### Traps

- The 255 and 2048 caps are load-bearing against backtracking on unclosed runs (`connections.ts:6`, `links.ts:7`); the rebuilt `MD_LINK` keeps them.
- `emptyTolerantLinkRegex` earns itself: ⌘K seats the caret in `[]()` (`links.ts:45`), and `markdownDestinationAt`/`linkDestinationStart` (`links.ts:46-65`) read `[]()` mid-authoring, while the drawn grammar refuses empty halves (`links.ts:15`). (A-126, B-166)
- `linkSpans`' `unescaped` (`connections.ts:32-33`) is the cell-escape rule the walk keeps. (A-124)
- `parseConnectionText` keeps `titleOf`'s unconditional strip, a second spelling of the cell-escape rule: a whole value `[[A#Note\]]` reads heading `Note` where the walk reads `Note\`. **Inferred.**
- `linkEntry`'s nested unwrap is real: YAML reads an unquoted `[[Page]]` as a nested sequence (`linkValue.ts:15-22`, `propertyValue.ts:73`). (A-50, A-127)
- The `readLink` family runs host-side, where main has no resolver (F-114). (A-133, B-167)
- A bare URL isn't a token, so synthesizing `[d](url)` for a value would put it through page-first resolution. (A-132)

##### Would Go False

- `ConnectionsPM.md:8` ("the editor's tokenizer and main's rename rewriter can never disagree") is false today (precedence, escape, and code rule differ); the walk makes it true. (B-139)
- `PropertiesPM.md:83`: "a title no page answers to is refused at commit" goes false for a markdown link whose destination is a valid address, which commits as a weblink.

---

#### 3.2 Writing Link Syntax

##### Current Shape

- **Spellers:** `connectionText` (`connections.ts:89-96`) drops an alias that repeats the target or holds `]` or a newline (`:91-93`). `pageEmbedText` (`:107-109`) writes `![[Title]]`. `serializeLink(v: LinkValue)` (`linkValue.ts:44-46`) writes `[alias](url)` through `escapeAlias`, which escapes only `\` and `]` (`links.ts:19-21`). `composeWebpageEmbedLine` (`links.ts:28-30`) writes `![label](url)`. `linkMarkdown`/`linkPaste` (`linkValue.ts:132-144`) write a formatted weblink. Copy Link (`pageMenuActions.ts:52`, `gripMenu.ts:92`) and the asset writers (`assetWrite.ts:31`, `adoptFile.ts:53,64`) spell through `connectionText`. (B-13, B-105)
- **Hand Spellings:**
  - The picker's `formSyntax` `'link'` arm (`autocomplete.ts:210`) writes `[[value|alias]]` without `connectionText` (F-035); its slot openers write `[[value#]]`, `[[value|]]`, and `value|` with caret arithmetic (`autocomplete.ts:237-261`).
  - The rename's embed passes spell `![[New#Heading]]` by hand (`rewrite.ts:47,92`).
  - `webpageInsertAtCaret` writes `![]()` by hand (`Embeds/embedInsert.ts:59-60`).
  - No function writes a page markdown link with a heading and a label: `pasteAsWrite` writes `serializeLink({ url: encodeLinkTarget(title), alias: title })` with no heading (`pasteAsMenu.ts:111-115`), and the picker's target and fragment arms spell the destination by span (`autocomplete.ts:206,270-278`). (A-40, A-81, E-29)
- **Wrap and Unwrap:** Paste over a selection (`pasteDecision.ts:38`) and `insertLinkOverSelection` (`menu.ts:52`) wrap through `serializeLink`. Format ▸ Link and Connection (`toggleWrap`, `format.ts:116-145`, specs `:55-58`) write `[` + selection + `]()` and `[[` + selection + `]]` raw; toggled off, they write the raw `contentRange` (`format.ts:127-136`), while Remove Link unescapes (`linkFormat.ts:32`). (B-43, B-44, B-121)
- **No Title Expressibility Check:** `nameError` rejects `|`, `#`, and `§` and allows `]` (`Paths/names.ts:27`). `expressibleHeading` and `embeddableTitle` (`connections.ts:99-105`) have no title sibling. (A-47)

##### Defects

- **A Title Ending in `]`:** `[[Draft]]]` matches `[[Draft]]` with page `Draft`, so Copy Link, Paste As Connection, and the picker write a broken connection for such a title. **Probed** (grammar copy). (A-47)
- **Unlink Leaves Escapes:** `toggleInline('[a\]b](https://x.com)', 3, 3, 'link')` writes `a\]b`. **Probed.** (B-43)
- **Wrap Writes Unreadable Syntax:** Wrapping `a]b` yields `[a]b]()`, which no link grammar reads; the wikilink arm has the same gap for a selection holding `]]`. **Probed.** (B-44, B-121)
- **The Picker Writes `[[Bar|Bar]]`:** Through `formSyntax`, bypassing `connectionText`'s alias drop (F-035). An embed commit replacing the whole span drops a typed `#heading` (**Inferred**; *§3.12*). (A-40)

##### Design

- **One Writer per Syntax (S1-B writer pieces, S3-3):**
  - `connectionText` becomes the only wikilink spelling: the picker's commit will write through it (*§3.12*), and the body rename's span edit will drop a repeated or empty alias as `connectionText` does (*§3.16*; built in the prototype). The rename's hand-spelled embed goes with the span edit (built in the prototype); `pageEmbedText` is unchanged.
  - `markdownPageLink(title, heading?, label?)` becomes the one page markdown-link writer, called by Paste As's Markdown Link form and by `retarget`'s page-into-markdown arm (*§3.11*). (E-29)
  - `serializeLink(url, label?)` will replace `serializeLink(v: LinkValue)`, since `LinkValue` goes (*§3.1*). (B-123)
  - `composeWebpageEmbedLine` becomes the one `![label](url)` writer, called by `pasteAsWrite` and `webpageInsertAtCaret`. Its label parameter has only a test caller; production passes `''` (`pasteAsMenu.ts:119`). (A-81, A-108)
  - A title expressibility check will generalize `expressibleHeading` and `embeddableTitle` rather than add a third predicate, so a title ending in `]` stops producing broken connections. What Copy Link, Paste As Connection, and the picker do with an inexpressible title is open (**Planner**). (A-99)
- **One Escape Rule for Wrap and Unwrap (S7-E):** `toggleWrap`'s markdown arms will escape the label on wrap (`escapeAlias`) and unescape it on unwrap (`unescapeAlias`), matching `serializeLink` and Remove Link. The wikilink arm's fix for a selection holding `]]` is open (**Planner**). (B-121)

##### Traps

- `escapeAlias` escapes only `\` and `]`, so a title or alias holding `|` written into a MarkdownPM table cell splits the row unless it goes through `cellToSource` (*Continuation §14*). (R-11, B-176, E-35)

---

#### 3.3 Caret Readers and Slots

##### Current Shape

- **Regex Caret Readers:** `linkAt`, `aliasSpanAt`, `emptyAliasPipeAt`, and `emptyHeadingHashAt` (`connections.ts:42-64`) are code-blind, and each wrapper re-runs `linkAt`. (B-20)
- **Slot Classification Happens Four Times:** `autocompleteQuery` (`autocomplete.ts:72-94`), `slotNear` (`linkEdit.ts:104-113`), `titleSpanAt` (`headingHash.ts:7-12`), and `aliasSpanAt` (through `commitAliasOnEnter` and `inAliasAt`). (A-39)
- **"Inside Link Syntax" Readers in the Typing Surface:** `linkInCode` (`edits.ts:324-331`), `inAliasAt` (`:334-338`), `isInsideWikilink` (`:612-627`, counting `[[` depth, so unclosed and `![[` openers count), `inBracket` (`:646-650`), `inUrlRun` (`:631-637`), and `headingHash`'s `titleSpanAt`. The split between closed and unclosed readers is genuine. (B-45)
- **"Literal Here" Is Spelled Three Times:** `isLiteralAt` (`edits.ts:638-643`: code, the position behind, math, `isInsideWikilink`, a url run), `literalAt` (`pasteLink.ts:42-47`), and `headingHash`'s `inCodeAt(sel) || inCodeAt(sel - 1)` (`headingHash.ts:21`). `literalAt` ignores wikilink interiors (consequence: *§3.11*). (A-44)
- **Pass Counts:** `slotNear` runs three `pageLinkPattern` passes (`linkInCode`, `aliasSpanAt`, `linkAt`), `commitAliasOnEnter` three, and `inAliasAt` two. `aliasOnLeave` can call `slotNear` twice per update (`linkEdit.ts:154,158`), up to six passes per keystroke, and `linkTyping` runs `linkAt` on every document change (`linkReveal.ts:17-25`). All are line-scoped. (A-36, A-143, B-17)
- **The Token Drops Slots:** `wikiLinkTokens` discards an empty alias and heading (`tokens.ts:235-236`) and sets `resolveRange` only when an alias or heading is written (`:243`). What follows: `aliasedToken` (`:44-45`); four `tk.resolveRange ?? tk.contentRange` fallbacks (`decorations.ts:594`, `cellStatic.tsx:78`, `connectionsApi.ts:72`, `linkEdit.ts:28`); the empty-pipe sniff (`decorations.ts:606`, `linkEdit.ts:35`); and the caret paths' own regex reader. (B-50, B-76)
- **Raw HTML:** Only `commitAliasOnEnter` refuses raw HTML (`linkEdit.ts:60`); the draw drops `inHtml` tokens when `scope === 'page' && settings.htmlFormatting` (`decorations.ts:471-472`). `slotNear`, `inAliasAt`, the picker, and `rememberAliasNear` don't refuse. `commitAliasOnEnter` is bound only in `markdownInput` (`markdownInput.ts:271`), which only `MarkdownEditor.tsx:142` mounts, always with page scope; `aliasOnLeave` and `typedInput` sit in `inlineSurface` (`surface.ts:55,68`) and run in cells too. The disagreement is page-scope only. (A-37, A-70, B-196)
- **Derived Gates:** `rememberAliasNear` (`linkEdit.ts:79-90`) is called only from `leaveSlot` (`:126`), after `slotNear` passed `linkInCode` (`:106`), so it inherits that gate. `linkTyping` is code-blind, but its value is read only where a drawn `wikiLink` token starts (`decorations.ts:641`), so the blindness doesn't show. (B-36)

##### Defects

- **Raw-HTML Stand-Down:** On a page with HTML Formatting on, the picker, slot collapse, and alias memory act inside a raw-HTML block the draw doesn't render as a link. **Inferred.** (A-37)
- The code-gate defects are *§3.4*'s.

##### Design

- **The Caret Reader (B-127 as built):** `connectionAt(scan, at)` in `Input/edits.ts` becomes the one reader of the closed connection around the caret (built in the prototype).
  - Gated on `line.includes('[[')`, it will run the walk (*§3.1*) over the caret's line with the document scan's code mask (`inCodeAt(scan, lineStart + p)`), and return the connection's spans relative to that line, empty slots kept, or null where code touches it (*§3.4*). That's one regex pass over one line, within the high-frequency rule.
  - **Callers:** `commitAliasOnEnter`, `slotNear`, `leaveSlot` and the alias memory (`rememberAlias` takes the spans), `inAliasAt`, `linkTyping` (reading `docScan.after(tr)`, shared with the draw's cache, so it becomes code-gated), `headingHash`'s title, and the picker's closed-link branch. Passes will drop from three to one in `commitAliasOnEnter` and `slotNear`, and from two to one in `leaveSlot` with the alias memory.
  - `headingHash` will read `connectionAt`'s title, falling back to `openedTitle` for a `[[` typed before its closer or pipe. Its `line[rel - 3] !== '!'` guard goes, so an embed's title takes `#` (M11-01).
  - **Goes:** The four regex caret readers, `linkInCode`, `titleSpanAt`, and `rememberAliasNear`'s own re-read.
  - Unclosed openers stay outside it; the opener rule is *§3.12*'s.
- **The Token Shape (Settled; Built in the Prototype):** A `wikiLink` token will always set `resolveRange` to the title span, set `fragment` only when the heading has text, and carry no slots; `aliasedToken` and the two empty-pipe checks are unchanged. The four fallbacks become `tk.resolveRange!`; the assertions exist because `resolveRange` is optional on every kind, and a `wikiLink`-narrowed `Token` union would remove them (*§3.19*). An always-set `resolveRange` and the one reader compose.
  - Slots on the token don't work: the caret readers would no longer read tokens, and a possibly-empty heading slot adds emptiness checks where readers rely on absence (`headingOf`, `decorations.ts:608,615`, `cellStatic.tsx:96`).
  - A caret/draw chunk memo (S6-A) doesn't work: `chunksOver` returns a different chunk for one line than for the viewport (`docScan.ts:290-300`), so the caret path misses the memo and parses up to about 50 lines per keystroke or caret move on a `[[` line. **Probed:** on a 1,362-line document, 499 of 528 lines mismatched. (B-114)
- **Raw HTML (*Continuation §5.2*):** The picker, slot cleanup, and alias memory will stand down inside a raw-HTML block on a page, as Enter does. The prototype keeps the clause in `commitAliasOnEnter` alone. Where the check lives is open (**Planner**): `connectionAt` holds `scan.html`, but not the HTML Formatting setting or the scope the draw's condition reads, and `aliasOnLeave` and `typedInput` also run in cells.
  - **Live Check:** On a page with HTML Formatting on, inside a raw-HTML block, type `[[Foo|]]`, press Enter, leave the slot, and open the picker; none of them act.

##### Traps

- `drawnTokens` can't serve the caret paths: `linkTyping` runs in a `StateField` before the draw, `autoPair` and `inAliasAt` are pure over the scan (`edits.ts:340,375`), and `aliasOnLeave`'s blur can fire with the caret off-screen. (B-163)
- A shared chunk memo can't be keyed by chunk text, and chunks can exceed 50 lines (`CHUNK_REACH`, `docScan.ts:263`). (B-164)
- `chunksOver` returns no chunk for a fenced line (`docScan.ts:284-287`). (B-165)
- `Token.contentRange` can't stand in for the alias span: `[[T|]]` leaves it on the title (`tokens.ts:235-238`). (B-189)
- `isInsideWikilink` isn't a duplicate of the closed reader: it counts unclosed `[[` for typography, is code-blind on purpose (`isLiteralAt` asks `inCodeAt` first, `edits.ts:638-643`), and is the nearest existing piece for the picker's opener rule (*§3.12*). (A-128, B-182)
- `activeTokenIndices`' inclusive end is deliberate (`tokens.ts:360-361`), compensated by `linkRest` (`linkReveal.ts:6-14`). (B-171)

##### Would Go False

- Tests pinning the regex readers and the old token shape: `connections.test.ts` (`aliasSpanAt`, `emptyAliasPipeAt`, `linkAt`), `aliasPicker.test.tsx` (imports `linkAt`), and `tokens.test.ts:120-133` (`resolveRange` undefined on `[[Page]]` and `[[Page|]]`).

---

#### 3.4 Code Gating

##### Current Shape

"Is this connection live, or code?" has five gates. (B-35)

| Gate | Rule | Sites |
|---|---|---|
| 1. Tokenizer | A link starting in code (`tokens.ts:232`), or overlapping a closed inline code token, backticks included (`notOverlapping([...embeds, ...code])`, `:282`; `inlineCodeTokens` skips unclosed runs, `:192-193`) | The draw and everything reading drawn tokens |
| 2. `linkInCode` | `inFenceAt`, or overlap with any `inlineSpans` inner span, unclosed runs included (`edits.ts:324-331`) | `commitAliasOnEnter` (`linkEdit.ts:61`), `slotNear` (`:106`), `inAliasAt` (`edits.ts:335`) |
| 3. Caret `inCodeAt` | The caret position only | `autocompleteQuery` (`autocomplete.ts:50`), `headingHash` (`headingHash.ts:21`), `literalAt` (`pasteLink.ts:42-47`) |
| 4. Line-alone `tokenize` | The line tokenized alone, with no fence context | `readFormatState` (`formatState.ts:16`), `toggleInline` and `toggleWrap` (`format.ts:86,123`) |
| 5. Host `linksIn` | The link's start only (`scan.ts:83`) | The index and renames |

- Gates 1 and 2 are two spellings of one question that answer differently: `inlineSpans` reports an unclosed opener as claiming the rest of the line (`markdownCode.ts:123`), and gate 2 compares against the text inside the backticks. (prototype report §6)
- `codeMask` and `inCodeAt` agree on fences: `codeMask` (`Engine/markdownCode.ts:199`) masks through `fenceSpans`, and `inCodeAt` (`Engine/docScan.ts:350-355`) reads `scan.fences`, built over the same `fenceSpans`. (A-125)
- `linkTyping` has no gate (*§3.3*). (A-36, B-36)

##### Defects

- **Half-in-Code Connections Act Live:** For `` x `[[A`]] y `` with the caret before `]]`, `tokenize` yields only `inlineCode`, while `autocompleteQuery` returns `{ form: 'link', query: "A`" }` and `headingHash` turns `§` into `#`. **Probed.** (B-35)
- **Unclosed Backticks Split Enter From the Draw:** `` [[A `b]] `` draws as a live connection, while Enter, slot cleanup, and the `]` refusal treat it as text. **Inferred** (prototype report §6)
- **Fenced Connections Format:** For a `[[A]]` line inside a fence, `readFormatState` returns `connection: true`, and `toggleInline(..., 'connection')` unwraps it to `A`. **Probed.** (B-35)
- **The Index Reads Links Code Touches After Their Start:** A link holding inline code is indexed and renamed while the draw shows it as code. **Inferred**

##### Design

- **One Code Rule (B-35):** `codeTouches(text, inCode, span)` becomes the one code rule for written links (built in the prototype): a link will be text when its start sits in code by the caller's mask, or when a closed inline code span, backticks included, overlaps it. It's private to the walk (*§3.1*), so the tokenizer (gate 1), the caret reader through `connectionAt` (gate 2, *§3.3*), and `linksIn` (gate 5) will all apply it, and `linkInCode` goes. A link written inside code will act like code everywhere (*Continuation §5.2*).
  - **Probed in the prototype:** `autocompleteQuery` and `headingHash` on `` x `[[A`]] y `` returned null; `connectionAt` returned null on a fence and half-in-code; a half-in-code link tokenized to code only.
  - After it, `inlineSpans` will have three readers: `codeTouches`, the tokenizer's `inlineCodeTokens`, and `codeAt` (`markdownCode.ts:207`).
- **Gate 3 Remains for Unclosed Openers (B-120):** An unclosed opener isn't a link the walk returns, so the caret-position `inCodeAt` stays in `autocompleteQuery`, `headingHash`, and `literalAt`; the opener rule is *§3.12*'s.
- **Gate 4 Reads Fence Context:** `readFormatState`, `toggleInline`, and `toggleWrap` will read a line with its fence context, so the Format menu stops reporting Connection or Link inside a fence and its toggle stops unwrapping there (*Continuation §5.2*); the prototype names this gate's mask as remaining work. Links are regex kinds, which read the mask (`tokens.ts:270-271`). A mask alone won't reach emphasis, since bold, italic, and strikethrough come from `parse` and `walkEmphasis`, which never read it; emphasis inside a fence is outside the ruling. `tokenizeChunk` builds its own scan from the text it's given (`tokens.ts:259`); `editFor` hands the readers a document string (`menu.ts:28-44`) and the menu ask holds the view (`menu.ts:94-96`). The shape is open (**Planner**).

##### Traps

- `inlineSpans` reports an unclosed opener as running to the line's end (`markdownCode.ts:123`), so a reader wanting closed spans filters `b <= line.length`, as `inlineCodeTokens` does (`tokens.ts:193`).
- `isInsideWikilink` is code-blind on purpose (*§3.3*). (B-182)
- `chunksOver` returns no chunk for a fenced line (`docScan.ts:284-287`), so fence context for a caret reader comes from the document scan. (B-165)

##### Would Go False

- `MarkdownPM.md:21` ("suppressed inside code") is false today for half-in-code connections and for Format inside a fence; the code rule and gate 4 make it true. (B-35)
- `Editor-Internals.md:12` ("Fenced lines hold no inline tokens") is false today for the line-alone readers, which tokenize a fenced line without its fence; gate 4 makes it true.
- `headingHash.test.ts:33-37` pins a `§` typed one past the closing backtick in `` [[`Page`]] `` writing `#`; under the code rule it stays `§`.

---

#### 3.5 Resolution and Status

##### Current Shape

- **One Builder:** `buildPageIndex` is called only in `pageIndexOf` (`Nexus/treeIndex.ts:270-274`). `resolve` answers `phantom`, `ambiguous`, or `resolved` with its page (`pageIndex.ts:34-38`), and an empty key is never stored (`:26`), so `resolve('')` is phantom. Raw `.resolve` readers include `Matrix/matrixInput.ts:58` and `Session/pageConnections.ts:30`. (A-04)
- **Two Front Doors, Two Type Spines:** `ConnectionsApi.resolve` (the `PageIndex` spread, `pageConnections.ts:30`) feeds `titleTarget` → `MdTarget`, the editor's spine (`Token → MdTarget`). `resolveConnection` (`treeIndex.ts:283-288`) collapses ambiguity to null and serves `LinkCell.tsx:75`, `connectionMenuActions.ts:90`, and `linkResolve.ts:8`, the Link value's spine (`LinkTarget → ConnPage | null`). Both read `pageIndexOf`. The ambiguity-null is right for the commit and wrong for display and click. (B-27)
- **Five Hand Adapters Read "Resolved Page or Null":** `resolveConnection` (`treeIndex.ts:284-288`), `titleTarget` (`connectionsApi.ts:58-59`), `aliasRows` (`autocomplete.ts:180-182`), `headingTargetOf` (`headingTarget.ts:15-16`), and `rememberAliasNear` (`linkEdit.ts:86-88`), each re-reading `resolve()` and keeping `resolved` plus `page`. (A-19)
- **The Resolution Half Sits in the Editor:** `MdTarget`, `titleTarget`, and `resolveMdTarget` (`connectionsApi.ts:46-68`) import only `PageIndex`, `targetTitle`/`targetFragment`, and `isValidLink`; `tokenTarget` (`:70-74`) is the only part needing Engine tokens. Properties re-derives resolution through `resolveConnection`. (A-74, A-76, B-72)
- **`LinkStatus` Is Derived Twice:** From `ConnResolution.status` (`pageIndex.ts:11-14`) and from `MdTarget` (`linkStatus`, `connectionsApi.ts:131-134`); the first runs before an `MdTarget` exists. Their fate is *§3.6*'s. (B-48)
- **The Held `[[#Heading]]` Rule Is Written Three Ways:** `heldTarget` (`linkClicks.ts:89-92`) turns a `self` target into the holder's page; `LinkCell` hand-copies it (`LinkCell.tsx:75`); `linkValueMenuTarget` has no held arm (`connectionMenuActions.ts:89-91`), so `resolveConnection(tree, '')` → phantom → null, and the menu falls back to the generic cell menu (`PropertyPanel.tsx:344-346`, `CardValue.tsx:114-120`, `TableView.tsx:287-293`). A Text value's bare heading gets a menu through `heldTarget` (`cellStatic.tsx:411`). **Probed.** (A-18, B-53)
- **The Commit's Resolver:** `parsePastedLink` and `linkValueFromEdit` take an optional `resolve?` (`linkValue.ts:48,85`), but the only production caller always passes `resolveTitle` (`parseEditorValue.ts:35-40`), which reads the tree live at the gesture through `resolveConnection` (`linkResolve.ts:1-8`). (A-55)
- **No Host Resolver:** `Core/Index` resolves nothing; `Relation.target` is a normalized title resolved at read time (`Core/Platform/stores.ts:11`), and `pageIndexOf` imports UIX `.tsx` modules, so main can't import it (F-114). (B-140)

##### Defects

- **A Bare `[[#Setup]]` Link Value Follows but Has No Page Menu.** (A-18, B-53)
- **Ambiguity Collapses to Nothing on the Value Side:** A Link value naming an ambiguous title draws no ambiguous tone and opens nothing, where a body connection draws `md-connection-ambiguous` (*§3.6*, *§3.10*). (B-27, B-51)

##### Design

- **One Resolution Chain (S2-C):** After the cleanup, every "what does this link point to" question will run `PageIndex.resolve` → `titleTarget`/`MdTarget` → `heldTarget`.
  - **Values:** `valueTarget = whole token ? heldTarget(tokenTarget(api, raw, tk), own) : isValidLink(raw) ? external : invalid` will answer for a Link value's draw, open, and menu (*§3.10*). It will reuse `tokenTarget` rather than re-dispatch from `readLink` output, tokenize through a `perText` memo as `cellTokens` does (`cellStatic.tsx:52`), and inherit the editor grammar. **Probed:** `[[Old|a]]`, `[[#H]]`, `[x](example.com)`, and `[x](https://a.com)` each tokenize to one whole-range token and a bare URL to none; `[^1](https://a.com)` yields no token and `[a](b) [c](d)` two, neither whole.
  - With a holder, `heldTarget` will turn a value's `[[#H]]` into a page target, so it gets page rows through the one menu builder (*§3.8*); an ambiguous value will carry `invalid.ambiguous` into the ambiguous tone (*§3.6*).
  - **Commit:** The Link value commit will read through `readLinkText` (*§3.1*), handed a `PageIndex` read live at the gesture, and refuse any status other than `resolved` explicitly (*Continuation §5.7*). The holder and `connections` threading to the inline editors is *§3.10*'s.
  - **Goes:** `resolveConnection`, `linkResolve.ts`, `ResolveTitle`, and the hand adapters, which will read through `titleTarget`. `LinkCell.tsx:75` and `connectionMenuActions.ts:90` stop calling `resolveConnection` (*§3.10*, *§3.8*), and `headingTargetOf` goes with `headingTarget.ts` (*§3.12*). The prototype's `rememberAlias` still reads `api.resolve` raw.
  - Keeping `resolveConnection` for display doesn't work: its ambiguity-null blanks the ambiguous tone and the open, and only the commit wants the refusal.
- **Placement (Planner):** Moving the token-free half (`MdTarget`, `titleTarget`, `resolveMdTarget`) to `Core/Connections/target.ts` is open. It imports nothing renderer-side, and `Core/Connections` is already engine-reached (`scan.ts`, `rewrite.ts`), so it can move while these stay: `ConnectionsApi` (imports UIX `TrailSegment`, `connectionsApi.ts:13,43`), `ConnMenuTarget` (`pasteAsMenu.ts` imports Connections, and menu types live in `Actions/`), `tokenTarget` (`tokens.ts:14` is the Engine → Connections edge), and `heldTarget` (takes `OwnPage` from `MarkdownPM/api.ts`). (A-99, B-124, B-185, B-186, B-187)

##### Traps

- **The Commit Gate:** `resolveConnection`'s ambiguity-null is the Link property's commit gate today (`treeIndex.ts:287` → `linkResolve.ts:8` → `parseEditorValue.ts:39` → `named`, `linkValue.ts:49-52`). Once it goes, the refusal has to be written explicitly, or an ambiguous `[[Dup]]` starts committing. (B-153, T-06)
- **Read at the Gesture:** The commit reads the index live rather than through a resolver closed over a memoized render context, or a page created moments ago is refused (`linkResolve.ts:1`).
- **The Lazy Alphabetical Sort Is Load-Bearing** (`pageIndex.ts:31-32`): the index rebuilds on every tree change, and most rebuilds never reach a picker. (A-130)
- **`MdTarget.invalid.ambiguous` Isn't Redundant With `LinkStatus`:** It's read after resolution at `linkClicks.ts:67` and `connectionsApi.ts:133`. (B-188)
- **`holder` Is Undefined for Spaces** (`valueContext.ts:18-20`), so the held arm has to tolerate a missing holder, and a `[[#H]]` on a Space is refused at commit (*Continuation §5.7*). (A-135)

##### Would Go False

- `ConnectionsPM.md:16` ("the content index in main") is false today: main resolves nothing. (B-140)

---

#### 3.6 Drawing and Looks

##### Current Shape

- **Two Renderers Decide One Link Look:** The CodeMirror draw (`decorations.ts`, markdown links `:557-588`, wikilinks `:589-664`) and the resting React renderer (`renderCellContent`, `cellStatic.tsx:55-179`) each decide it. (B-37)
  - **Heading Join:** `decorations.ts:613-637` and `cellStatic.tsx:94-124` state the same `showPage` and `resolved && !alias` rule; `headingLinkStyle` comes from settings in one (`decorations.ts:590`) and from a prop in the other.
  - **Phantom:** The same classes in both, plus `md-unresolved-fixed` in the cell (`cellStatic.tsx:84-89`).
  - **Invalid Markdown Link:** The body keeps its syntax, dimmed (`decorations.ts:570-573,581`); the cell draws the label alone (`cellStatic.tsx:128-141`). A phantom connection shows its dimmed syntax on both surfaces.
  - **Ambiguous:** A connection draws `md-connection-ambiguous`; a markdown link draws `md-link-invalid`, because `mdLinkClass` maps every `invalid` target to it (`decorations.ts:96-97`).
  - **Title Span:** The draw sites read `tk.resolveRange ?? tk.contentRange` (`decorations.ts:594`, `cellStatic.tsx:78`); the token shape is *§3.3*'s.
- **The Look Functions:** `wikiLinkView`/`WikiLinkView`/`linkStatus` live in `connectionsApi.ts:114-148`, and `mdLinkClass` in `decorations.ts:82-99`. `cellStatic.tsx:10` imports `mdLinkClass` and `MD_LINK_CLASS` from the CodeMirror draw module. `headingMissing` (`connectionsApi.ts:121-129`) serves both. (B-66)
- **Two Class Pairs for One Unresolved Look:** `md-link-invalid` and `md-connection-phantom` share a rule (`markdown-pm.css:233-237`), with an underline on `md-link-invalid` alone (`:238-240`); `md-unresolved-syntax` and `md-phantom-syntax` share another (`:241-244`). (B-38)
- **The Plain Setting:** **Display Unresolved Links As Plain Syntax** toggles `:root.plain-unresolved` (`applyPersonalization.ts:58`). The override (`markdown-pm.css:245-252`) resets `md-link-invalid`, `md-connection-phantom`, and `md-phantom-syntax`, but not `md-unresolved-syntax`, and skips anything wearing `md-unresolved-fixed`. Only the resting renderer emits that opt-out (`cellStatic.tsx:84,87,88,136`); the CodeMirror draw serves every scope (`surface.ts:47`) and never emits it. (B-60, B-78)
- **The Slash Menu Borrows the Phantom Look:** `blockQuery.ts:29-30` marks the `/` query with `md-phantom-syntax` and `md-connection-phantom`. (B-61)
- **Class Constants:** `MD_LINK_CLASS` (`decorations.ts:80`) is the only link class with a constant; the rest are literals (`decorations.ts:91,97,570,581,620,631`, `linkClicks.ts:60,135`, `cellStatic.tsx:255`). An internal markdown link wears `md-connection-resolved` (`decorations.ts:91`). (B-64, B-97)
- **Three "Is This a Link" Selectors:** `linkClicks.ts:60` (five classes), `linkClicks.ts:135` (two, `hoverGate`), and `LINK_SELECTOR` (`cellStatic.tsx:255`: `.md-link, .md-connection-resolved, [data-link-span]`). Every link span the resting renderer draws carries `data-link-span` (`cellStatic.tsx:105,138`), inner spans carry neither class, and `linkSpanAt` returns null without the attribute, so the selector's class arms never decide anything; they're the only reason `cellStatic` imports `MD_LINK_CLASS`. A phantom connection at rest draws three spans with no `data-link-span` (`cellStatic.tsx:81-92`). (B-41)
- **Overlapping Tokens at Rest:** The tokenizer emits overlapping tokens (`**a [[P]] b**` → `bold 0-13`, `wikiLink 4-9`; `[x **b**](url)` → `link 0-23`, `bold 3-8`), and `renderCellContent` skips every token that starts inside an earlier one (`cellStatic.tsx:72-75`). **Probed** (M10-01)
- **No `§` Pass at Rest:** The body draws `§Heading` runs (`decorations.ts:666-676`, only when `inPageHeadingResolution === 'automatic'`); `renderCellContent` has none. (B-58)
- **An Unreachable Arm:** Every kind reaching `renderCellContent`'s final `else` has a `CONTENT_CLASS` entry, so its classless `: content` branch (`cellStatic.tsx:170-171`) never runs; `CONTENT_CLASS` is `Partial` only to admit the link kinds, which have their own arms (`Engine/intents.ts:120-133`). (M10-05)
- **A Resting Text Value Draws Without Its Page:** `TextCell.tsx:60` passes `renderCellContent` neither `around` nor `headingLinkStyle`. (F-062, B-37)
- **Tokenizer Memos:** `drawnLast(tokenizeChunk)` (`decorations.ts:366`) and `perText(tokenize, 4096)` (`cellStatic.tsx:52`). (B-39)
- **Link Property Values** draw through their own path (*§3.10*).

##### Defects

- **An Ambiguous Markdown Link Draws as Broken:** `resolveMdTarget(ix, 'Dup')` → `{ kind: 'invalid', ambiguous: true }` → `md-link-invalid`, while a connection to the same title draws `md-connection-ambiguous` (`decorations.ts:653-660`, `cellStatic.tsx:101-102`). **Probed** (B-62)
- **Unresolved Links Look Different by Syntax:** `[x](Missing)` is underlined (`markdown-pm.css:238-240`); `[[Missing]]` isn't. (B-63)
- **The Plain Setting Misses Markdown Links:** With it on, an invalid markdown link's `[`/`](…)` keep the control color, since `md-unresolved-syntax` has no override. (B-38)
- **The Plain Setting Reaches Live Surfaces Only:** It restyles the live cell and the live Text pane but not their resting forms. (B-60)
- **The Plain Setting Restyles the `/` Menu's Query** (`blockQuery.ts:29-30`). (B-61)
- **An Invalid Markdown Link Hides Its Syntax at Rest** and shows it in the body. (B-37)
- **A Link Inside Emphasis Is Dead and Raw at Rest:** `**a [[P]] b**` draws `[[P]]` as raw text with no `data-link-span`, so it doesn't follow, glance, or open a menu; emphasis inside a label draws its `**`. It reaches resting Text values through the shared renderer. **Probed** (M10-01, X-12)
- **A `§` Run Changes Appearance on Entering a Cell:** It draws in a live cell and not at rest. (B-58)
- **A Resting Text Value's Heading Links Ignore Its Page:** No missing-heading mark from the holder's headings and no Heading Link Style. (F-062)

##### Design

**Rulings:** *Continuation §5.4*.

- **One Look Rule (S6-B):** One `linkLook(conn, text, tk, ownKeys, headingLinkStyle)` in `connectionsApi.ts` will return `{ target, status, missing, bare, join: { showPage, heading } | null }`, and both renderers will draw from it. `wikiLinkView`, `WikiLinkView`, `linkStatus`, and `mdLinkClass` go, along with the duplicated heading join and `cellStatic`'s import of `decorations.ts`; `headingMissing` stays as the rule `linkLook` calls.
- **One Status Vocabulary:** An invalid markdown link will read `phantom`, or `ambiguous` when its title is ambiguous, so it will draw in the ambiguous tone. `md-link-invalid` merges into `md-connection-phantom` and `md-unresolved-syntax` into `md-phantom-syntax`; the survivors already carry the live sites and tests, so fewer hooks change than the reverse merge would need. The underline on unresolved markdown links goes with the merge. `linkClicks.ts:67`'s wiki-only ambiguous exception becomes `target.ambiguous` for both syntaxes.
- **One Unresolved Treatment at Rest:** The resting renderer will draw an invalid markdown link's syntax dimmed, as it already draws a phantom connection's and as the body draws both. Hiding the syntax for both at rest instead would split the resting cell from the live one.
- **The Plain Setting Everywhere:** `md-unresolved-fixed` goes from its four sites, so the `:root.plain-unresolved` override will reach the body, MarkdownPM table cells live and at rest, and Text values live and at rest. `blockQuery.ts:29-30` will get a look of its own that the setting doesn't reach. A container-scoped rule limiting the setting to page prose is unnecessary under the ruling.
- **Selectors and Constants:** `LINK_SELECTOR` becomes `[data-link-span]`, and `MD_LINK_CLASS` goes, inlined as `'md-link'`. The remaining body selectors will read the merged class names.
- **Nested Links at Rest (X-12):** `renderCellContent` will draw a token nested inside an earlier one, so a link inside emphasis will draw as a link with its `data-link-span` and act through the shared gestures (*§3.7*), and emphasis inside a label will draw as emphasis. How the renderer nests its spans is open (**Planner**).
- **`§` Runs at Rest:** The resting renderer will draw `§Heading` runs as the live cell does, in the look below; how it finds them is *§3.15*'s. Whether a resting run also follows, as a live one does, is unruled (*Continuation §12*).
- **F-062:** `TextCell` will pass its holder's headings (`holder && conn.headingsOf(holder.path)`) and Heading Link Style, so the draw will agree with the `heldTarget` its gestures already use (`TextCell.tsx:27,41`).
- **M10-05:** The unreachable `: content` arm goes, so every token will draw a span; *§3.9*'s offset mapper relies on that.
- **Unresolved-Link Menus:** If *§3.8*'s open X-02 call gives unresolved links a menu, a phantom resting connection will also need `data-link-span` (`cellStatic.tsx:81-92`).
- **Live Check:** A visual pass on link looks across the body, live and resting cells, and Text values.

##### Traps

- `data-link-span` is load-bearing: only `LINK_SELECTOR`'s class arms are dead, and `linkSpanAt`'s callers pass cell event targets (`cellStatic.tsx:289,385,443`). (B-168)
- `drawnLast` stays: `codeHighlight.ts:186` and `codeScroll.ts:218` read it. (B-169)
- The two tokenizer memos serve React and CodeMirror respectively and aren't drift. (B-170)
- `md-connection-heading` has no CSS but is a test hook (`textScope.test.tsx:94,123,137`); only `.md-connection-heading-missing` has a rule (`markdown-pm.css:291`). (B-172, B-195)
- The `conn` gate on connection drawing and the `'link'`-only lookup agree (`decorations.ts:589`, `linkClicks.ts:56`, `cellStatic.tsx:80`). (B-174)
- The nested render must stay on the token path: `renderCellContent`'s token-less fast path (`cellStatic.tsx:64-67`) is the per-cell cost of a table scrolling in, shared with `TextCell`. (R-25)

##### Would Go False

- `ConnectionsPM.md:34` ("applies to page prose only — cells and other fields stay muted") is false today, since live cells and Text panes go plain (B-60), and goes false differently under the ruling, which applies the setting everywhere.
- `ConnectionsPM.md:32` ("one that names neither keeps the broken-link treatment") goes false: it takes the phantom treatment.
- Tests: `externalLink.test.tsx:80`, `mdLinkTarget.test.tsx:158`, `blockMenuFlow.test.tsx:301,308`. (B-134)

---

#### 3.7 Pointer Gestures

##### Current Shape

- **The Body Handler:** `linkPointer` (`linkClicks.ts:132`) runs on `pointerHandlers` (`Gestures/pointerPath.ts:30`; `onText`/`hidesSyntax` read only at `:50`). `linkUnder` (`linkClicks.ts:46`) hit-tests through `drawnLinkAt` and converts with `heldTarget` (`:58`); `followTarget` (`:75`) finds the page editor (`:81-82`) and checks `glance.contains` (`:84`); `resolveFollow` (`:95`) converts again with `heldTarget` (`:102`); `dwellTarget` (`:118`) spells the address gate as `WEB_ADDRESS.test(normalizeLinkUrl(x))` (`:128-129`); `sectionRunAt` (`:31-43`) reads `.md-section-run` from the DOM. (B-03, B-22)
- **The Pointer's Own Lookup Is Legitimate:** `drawnTokens` (`decorations.ts:367,484`) holds the scope- and setting-filtered list (raw HTML in page scope); scope is a closure parameter of `markdownDecorations`, not a facet. (B-77)
- **The Resting Gestures:** `linkGestures` (`cellStatic.tsx:397-434`) and `cellLinkTarget` (`:436-446`, null without an api at `:442`) serve the resting MarkdownPM table cell and `TextCell`. `linkGestures.linkAt` returns the unconverted target (`:404-405`), so `heldTarget` runs again at `:411` (the read-only menu) and `:430` (dwell), and `TextCell.tsx:41` relies on `resolveFollow` converting. `heldTarget` runs at four sites in all. (B-18, B-46)
- **The Resting Menu Re-Derives the Hit:** `menuAt` repeats `cellLinkTarget`'s span and token lookup (`cellStatic.tsx:289-290` vs `:443-444`), and `tokenTarget` runs again at `:458`. (B-47)
- **Elsewhere:** Link value clicks are *§3.10*'s, section runs and citations *§3.15*'s, selectors and spans *§3.6*'s.

##### Design

- **One Hit Shape (S7-C):** `linkGestures` will give its `linkAt` the `own` it already receives and return `{ el, tk, span, target: heldTarget(tokenTarget(…), own) }`, the resting counterpart of the body's `LinkHit`. The read-only menu's and dwell's own `heldTarget` calls go, and the resting menu (*§3.9*) will read the hit's `tk`, `span`, and `target` rather than re-deriving them. Nothing changes for the user: both surfaces will convert at hit time, and a `TextCell` link's follow, dwell, and menu will read one target. `LinkHit`'s name is *§3.18*'s.
- **`dwellTarget` Reads `isHttpLink` (S5-D3):** `dwellTarget`'s `WEB_ADDRESS.test(normalizeLinkUrl(x))` (`linkClicks.ts:128-129`) will read `isHttpLink`, the same test, since its input already passed `isValidLink` in `resolveMdTarget`; the armed address still goes through `normalizeLinkUrl`. One spelling of the address gate goes (*§3.11*). (B-112)
- **Elsewhere:** Claiming every right press at rest and mapping the pointer to a source offset are *§3.9*'s.

##### Traps

- `resolveFollow`'s own `heldTarget` (`linkClicks.ts:102`) stays: it serves `TextCell.tsx:41`, the resting cell's `claimLink`, and `followCitation` (`citationPointer.ts:42`), which passes an unconverted target and is mounted on every scope (`surface.ts:52`). It's idempotent where the hit already converted. (B-154, B-119)
- `inert`'s no-op `open` and `glance.contains` are two rules for two surfaces: PageHistoryWindow's host is inert with no glance (`PageHistoryWindow.tsx:117-118`, `editorHost.tsx:111`), while GlancePane's `PageTile` builds a non-inert host (`PageTile.tsx:90`), so `followTarget`'s `contains` check (`linkClicks.ts:84`) is what stops follows there. (B-155)
- `sectionRunAt` can't go through `drawnLinkAt`: no token holds a run. (B-159)
- `followTarget` and `resolveFollow` can't merge: `TextCell` has no surrounding editor for `pageEditorAt` (`linkClicks.ts:81-82`). (B-180)
- `cellLinkTarget`'s null without an api isn't a gap for values: `PropertyPanel` always supplies one and views read `previewConnections` (`Views/Host/useViewHost.ts:113`). (A-138)

---

#### 3.8 Menus and Their Actions

##### Current Shape

- **The Menu Target Is Built Four Ways:** `tokenMenuTarget` (body, live cell); `linkMenuTarget` through `linkGestures`' read-only menu (`cellStatic.tsx:409-412`); `menuTarget` (`cellStatic.tsx:448-477`, editable resting cell); and `linkValueMenuTarget` (`connectionMenuActions.ts:76-103`). `linkMenuTarget` is `tokenMenuTarget` without a token (`connectionsApi.ts:102,111`). The first three route through `ConnectionsApi.menu` (`pageConnections.ts:43`); the fourth calls `showConnectionMenu` directly. (B-28)
- **The Link Menu Is Fire-and-Forget:** Grip, table, and citation menus are promise-returning host members whose answer the editor applies (`api.ts:175-179`; e.g. `citationPointer.ts:67-73`). `showConnectionMenu` returns `void` and runs closures (`connectionMenuActions.ts:19,33,59`). That protocol is what produces `apply`, `onCell`, `editable`, the url `apply` filter (`:98-100`), and the resting cell's `still()`. (B-67, B-80)
- **"Editable" Is Stated Twice:** The consumer reads `(target.editable ?? true) && target.apply !== undefined` (`connectionMenuActions.ts:23`), and every producer sets both in lockstep (`connectionsApi.ts:86,90,107`, `connectionMenuActions.ts:84`), so `editable` never changes the outcome. (B-29)
- **`ConnMenuTarget` Carries Arm-Inconsistent and Values-Only Fields:** `editable` and `hasAlias` are required on the page arm and optional on the url arm (`connectionsApi.ts:25-26,32-33`); `surface`, `hideable`, and `onCell` (`:17-19`) are set only by `linkValueMenuTarget` (`connectionMenuActions.ts:83-87`), and `surface === 'cell'` holds exactly when `onCell` is set. A resting MarkdownPM table cell reads `surface: 'editor'` by default (`:22`). (B-70)
- **`hasAlias` Feeds Only Labels:** Its full production set is `connectionsApi.ts:26,33,87,108`, `connectionMenu.ts:14`, and `connectionMenuActions.ts:30,49,85`; the only reader is `connectionMenuModel`'s label (`connectionMenu.ts:84`: Add Title / Edit Title / Rename). (B-71, Q-08)
- **`LinkCellAction` Exists Only to Narrow `apply`** (`connectionMenuActions.ts:74,78,98-100`). (B-81, A-78)
- **One Model, Two Url Returns:** `connectionMenuModel` (`connectionMenu.ts:80-122`) returns url rows two ways whose order differs: a value puts Copy Link beside the opens (`:93-94`), the body after the authoring rows (`:95-109`). Closing rows exist in the editor only for weblinks (`closingRows`, `:64-67`). **Probed** (Q-07)
- **Two Appliers Split by Syntax:** `applyLinkAction` (`linkEdit.ts:38`, wikilink) and `applyUrlLinkAction` (`linkFormat.ts:55-86`, markdown link, which may name a page). The pure halves are `wikiAuthorTarget` (`linkEdit.ts:21-36`) and `linkActionText` + `formatted` (`linkFormat.ts:19-52`). Edit Link seats a caret at a connection's title end (`linkEdit.ts:27-29`) but selects a weblink's address (`linkFormat.ts:64-66`), and the markdown-link caret rule is written again at `cellStatic.tsx:469-470`. (B-42, B-100)
- **The Url Applier's Guards:** It writes nothing when the text is identical (`linkFormat.ts:77-79`) and never focuses after Remove Link, Delete, or Format (`:70-85`); the wikilink applier focuses (`linkEdit.ts:47`).
- **Value Menus and the Resting Cell's Menu** are *§3.10*'s and *§3.9*'s.

##### Defects

- **A Markdown Link Naming a Page Gets a Read-Only Menu in an Editable Editor:** `tokenMenuTarget` authors only a `wikiLink` naming a page (`connectionsApi.ts:102`); everything else falls to `linkMenuTarget`'s `editable: false` (`:86`). `cellLinks.test.tsx:317-320` pins it. (B-57)
- **Connections Have No Remove Link or Delete** in an editor (`connectionMenu.ts:65`). (Q-07)
- **Row Labels Depend on an Alias:** A connection reads Add Title or Edit Title by `hasAlias` (`connectionMenu.ts:84`). **Probed** (Q-02)
- **The Create-Ghost Shows Behind a Link Value's Menu:** `holdGhost` awaits a menu that returns immediately (`ghostCreate.ts:144-153`). (B-68; the value side is *§3.10*'s)

##### Design

**Rulings:** *Continuation §5.5*.

- **The Link Menu Answers (S7-A):** `showConnectionMenu(target)` will return a promise of the picked action, the protocol the citation, grip, and table menus already use. It will run the open, site, and copy rows itself, since they read session state and need no span, and resolve with an authoring or value action, or null, for the caller to apply. `apply`, `onCell`, `ConnCellApply`, `isConnCellAction`, the url `apply` filter, and the second `editable` go. The body's menu becomes `menu(target).then((a) => a && applyLinkAction(view, a, hit.range))`. This will fix B-68: `holdGhost` will await a real promise (*§3.10*).
- **One Builder (9b Q-06):** One `linkMenuTarget(target, editable, value?: { hideable })` in `connectionsApi.ts`, with `tokenMenuTarget` folded in, will produce `{ kind: 'page', page, heading? } | { kind: 'url', url }` plus `editable` and `value`. Its callers:

  | Caller | Target | `editable` | `value` |
  |---|---|---|---|
  | Body (`linkClicks.ts:139-154`) | the hit's target | `!view.state.readOnly` | — |
  | Resting MarkdownPM table cell | the hit's target (*§3.7*) | `!readOnly()` (*§3.9*) | — |
  | Resting Text value (`TextCell`) | the hit's target | `false` (*Continuation §5.7*) | — |
  | Link value (three parents) | `valueTarget(raw, api, holder)` (*§3.5*) | `true` | `{ hideable }` |

  The `tk?.kind === 'wikiLink'` gate goes, so `[x](Page)` will author like `[[Page]]` (B-57). `surface`, `ConnSurface`, and the `surface`/`hideable` pair become the one optional `value` (Q-09), whose name won't collide with a resting table cell. `hasAlias` goes everywhere (Q-08), `LinkCellAction` goes, and `linkValueMenuTarget` goes whole: its resolve becomes `valueTarget`'s, its base fields the builder's arguments, and its filter the promise (Q-12). Resting Text values will change only through the builder: `linkGestures`' read-only branch folds into it, and they'll inherit whatever X-02 gives (X-11). The parents' wiring is *§3.10*'s.
- **One Model Join (9b Q-07):** `connectionMenuModel` will build every link's menu as opens (none on an unresolved link), then Rename and Edit Title (connection) or Edit Link (weblink) when editable, then Copy Link (plus Copy Path on a page), then Format ▸ for an editable weblink outside a value, then the closing rows: Remove Link and Delete in an editor, for connections too, or the value's Clear and Remove. "Add Title" goes, and no label reads an alias. Format stays off values (*Continuation §5.7*). `closingRows` folds into the join.
- **One Pure Link Edit and One Live Applier (R-07, S7-B):** One `linkEdit(text, tk, action, titles): (FormatEdit & { title?: PendingTitle }) | null` will replace `wikiAuthorTarget`, `linkActionText`, `formatted`, and `LinkActionText`, with one switch over the shared action set. Its arms will:
  - **Rename:** select the shown text, or insert `|` after the title and seat after it, reusing an abandoned pipe as `linkEdit.ts:32-35` does.
  - **Edit Title / Edit Link:** select what the link points to: a connection's title span, leaving its heading outside the selection, or a markdown link's destination (`linkAddress(tk)`), `#H` included. A connection's Edit Title will then select its title, where today it seats a bare caret at the title's end (`linkEdit.ts:27-29`); a weblink's Edit Link already selects its address (`linkFormat.ts:63-66`).
  - **Format ▸:** write the three forms, spelled out (`linkFormat.ts:35`).
  - **Remove Link:** write `unescapeAlias(label)`, so `[[P|a]]` keeps `a` and `[[P]]` keeps `P`.
  - **Delete:** remove the whole link.
  - **Unchanged Text:** return no change, carrying over the identical-text no-op (`linkFormat.ts:77-79`).
  - `FormatEdit` will gain `head?` for a range seat, since `applyEdit` reads `head` only for an `Edit` (`applyEdit.ts:20`), and `applyEdit` will gain an effects option.
  - The live applier, `applyLinkAction(view, action, range)`, will read `drawnLinkAt(view, range[0])` with no kind, apply the edit, and announce a pending title through *§3.11*'s `writeLinkAt` (M10-06), so one writer will own the announce pair. `applyUrlLinkAction` and `linkFormat.ts` go, and `linkClicks.ts:148-151`'s `{ wiki, url }` and its import (`:17`) become one closure. The resting side will apply the same edit (*§3.9*).
  - The merged home will be `linkActions.ts`; the naming is a **Planner** call, and its neighbors' placement is *§3.20*'s.
- **Focus After Writes (Checkpoint Question):** R-07's applier would focus after every action, so the body would focus after Remove Link, Delete, and Format, which it doesn't at baseline. The editor menu focuses after every edit (`menu.ts:78`). It's unruled (*Continuation §12*).
- **Unresolved and Held Links (X-02, Open Planner Call):** Whether phantom, ambiguous, invalid, and held `[[#H]]` links get a menu. Bearing on it:
  - `linkMenuTarget` returns null for `invalid` and `self` (`connectionsApi.ts:91-92`), and `MdTarget`'s `invalid` arm carries no syntax to choose Edit Title or Edit Link.
  - A phantom resting connection draws no `data-link-span` (*§3.6*), so the resting hit never reaches the builder.
  - A Link value's fallback menu rides the same answer (9b Q-13, *§3.10*).
  - Nathan leans that it shouldn't add weight; the measured cost decides it (*Continuation §12*).
- **Value-Menu Row Order (Open, Checkpoint Question):** The one model would move a URL value's Copy Link after Rename and Edit Link, while *Continuation §5.7* keeps today's value menu. Either the model takes a value branch or the move is accepted (*Continuation §12*).
- **Rejected:** Folding the link menu into F-096's `menus.pop` doesn't work, because its rows read session state (`connectionMenuActions.ts:45-57`). (B-183)
- **Live Check:** No create-ghost appears while a Link value's menu is open (B-68).

##### Traps

- `popMenu` resolves the whole `ConnMenuAction` union (`connectionMenu.ts:50-56`) and `runPageAction` takes a string (`pageMenuActions.ts:32-35`), so narrowing to the returnable actions keeps `isConnUrlAction`. (B-117)
- The promise's type is the authoring union (`format:*`, `link:remove`, `link:delete` included), while the value callers' `valueMenuIntent` takes `CellMenuAction` (`valueClick.ts:64`). Widening its parameter over the same `Partial<Record>` table absorbs it, since an action a value never offers maps to null; a surface-typed return would add an overload per surface. (Q-12, B-117)
- The resting `TextCell`'s read-only branch can go only in the same change that moves every caller onto the builder: a read-only embedded page's resting cells still need non-authoring menus, which `editable: !readOnly()` gives. (Q-31)
- `ConnMenuTarget` and `tokenTarget` can't move to `Core/Connections`. (B-185…B-187)

##### Would Go False

- `ConnectionsPM.md:38` ("never depend on where it was found") is false today (B-53, *§3.10*).
- `ConnectionsPM.md:43` (the Author row's Add Title / Edit Title · Edit Link), `:45` ("Format (editor only)", which resting cells reach too, *§3.9*), and `:46` (a connection's "—" for Close in the editor).
- Tests: `connectionMenu.test.ts:5,15,20,24,49,71,98,112` (`surface`, `hasAlias`, labels); `connectionMenuActions.test.ts:8,16,33,45,66,75,82,106` (`ConnMenuTarget`, `linkValueMenuTarget`, `hasAlias`); `linkEdit.test.tsx:65,80,95,124` (`editable` expectations); `linkFormat.test.tsx` (the file goes); `linkEdges.test.tsx:432`; `externalLink.test.tsx:129,145`; `cellLinks.test.tsx:305,317-320`. (B-135, B-138)

---

#### 3.9 MarkdownPM Table Cells at Rest

##### Current Shape

- **Two Menu Doors, One Reachable at Rest:** The link menu door is `linkGestures.onContextMenu` → `api.menu(target)` (`cellStatic.tsx:417-427`) → `popMenu` → the generic `menu` channel (`Core/Actions/handlers.ts:7-10`), independent of Chromium's `context-menu`. The editor menu door is CodeMirror's `editorMenu(scope)` (`Menus/menu.ts:83-108`) asking `host.menus.format` → `editor:menu` (`editorHost.tsx:104-109`), where `askEditorMenu` parks until Chromium's `context-menu` (`Desktop/Actions/editorMenu.ts:26-31`) and main returns null when `!params.isEditable` (`:128`). A resting cell has no editor of its own, and the page editor never sees its events: CodeMirror marks a non-editable widget `contentEditable = "false"` and drops events inside a widget whose `ignoreEvent` is true, the default, which `TableWidget` doesn't override (`@codemirror/view` `index.js:161,2146-2148,4833-4836`). That Chromium reports `isEditable: false` for the static cell is **Inferred**. (R-01)
- **A Non-Link Right-Click Focuses the Cell:** With no link menu opened and the cell editable, the right-click calls `onActivate` (`cellStatic.tsx:354-357`), mounting a `CellEditor` whose `editorMenu` never received the event, so no Pommora menu appears (**Inferred**). `cellStatic.test.tsx:117-127` pins the focus. (R-02)
- **What Each Construct Gets Today:**
  - **Plain text, emphasis, code, highlight, inline math, HTML tags:** focus, no menu; live, the editor menu (scope `cell`: Insert Link · Lists ▸ · Format ▸, `Core/Actions/editorMenu.ts:138-139`).
  - **A DOM selection over static text:** focus at the click point, losing the selection (`CellEditor.tsx:247-262`).
  - **A checkbox:** left-click toggles in place (`claimCheckbox`, `cellStatic.tsx:326-338`); right-click focuses.
  - **A connection naming a page:** the link menu with authoring (`menuTarget`, `:448-477`).
  - **A phantom connection:** no `data-link-span`, so focus; ambiguous, `[[#H]]`, and invalid-target links reach `linkMenuTarget`'s null (`connectionsApi.ts:91-92`) and focus too.
  - **A weblink:** the full url menu, including Format ▸ (`surface` defaults to `'editor'`, `connectionMenuActions.ts:22`).
  - **`[x](Page)`:** the read-only page menu (B-57).
  - **`![[P]]`, `![](u)`:** an `embed` token with no span, so focus.
  - **A footnote marker:** focus; a live cell has no marker menu either (`citationPointer.ts:63-65`; the cell's scan binds no ordinal). **Probed**
  - **Table grips:** their own menus (`MarkdownTable.tsx:577-601`).
  (R-03)
- **The Editable Resting Link Menu:** `menuAt` (`cellStatic.tsx:288-306`) builds `menuTarget` (`:448-477`), whose closures re-find the link through `still()` (`:293-298`, by offset and slice). Wiki actions commit an optional pipe and enter through `onSelect` (`:459-465`); url Rename and Edit Link enter through `onSelect` (`:469-470`); Remove Link, Delete, and Format commit through `onCommit` (`:471-474`). (B-73)
- **Entering the Cell Is Three Refs:** `caretCoords`, `initialSelect`, and `sweepFrom` (`MarkdownTable.tsx:152-154`), reset at three sites (`:419-421`, `:458-460`, `:470-472`), passed as three `CellEditor` props (`:434-436`; `CellEditor.tsx:121-123`), split across `onActivate` (`cellStatic.tsx:281`) and `onSelect` (`:283`), and consumed by one nested ternary (`CellEditor.tsx:247-262`). (R-09)
- **The Pure Edit Layer Exists in Pieces:** `FormatEdit` (`format.ts:28-32`) and `Edit` (`edits.ts:37-42`) carry post-change selections; `applyEdit` dispatches either (`applyEdit.ts:6-29`) and `applyEdits` applies one to a string (`markdownCode.ts:16-29`). Pure producers: `editFor` (`menu.ts:28-44`, module-private), `readFormatState` (`formatState.ts:7-44`), `checkboxToggleChange` (already applied at rest: pure change → `applyEdits` → `onCommit`, `cellStatic.tsx:332-337`). `insertLinkOverSelection` (`menu.ts:47-60`) is not pure. (R-06)
- **Resting Writes:** `onCommit` routes through `cellCommitChange` (`sync.ts:21-27`) and settles the table, since a resting cell has no editor to demote (`MarkdownTable.tsx:463-467`). The widget dispatches the commit with `tableSelfEdit` and no user event (`widget.tsx:238-241`).
- **Read-Only at Rest:** `readOnly()` is consulted for the fallback (`cellStatic.tsx:355`), the left-click (`:365`), the crossing sweep (`:371`), and the checkbox (`:327`), but `menuAt` is handed to `linkGestures` unconditionally (`:307-313`). (R-04)
- **The Resting Url Arm Has No Title Tracker:** It commits the short form and calls `host.linkTitles.resolve(url)` with nothing awaiting the result (`cellStatic.tsx:471-474`); the body announces through `awaitTitle` (`linkFormat.ts:81-83`). (A-33, B-30)
- **The Table Payload Reaches Only the Live Cell:** A table-shaped clipboard fills cells through `CellEditor`'s `input.paste` filter (`CellEditor.tsx:154-163`); `onFill` reaches `CellEditor` (`MarkdownTable.tsx:442`), not `StaticCell`. (R-23)
- **Main's Role Rows:** Undo, Redo, Cut, Copy, Paste, and Select All are Electron roles (`Desktop/Actions/editorMenu.ts:74-79,87`); Paste As and Paste Without Formatting resolve to the renderer through a parked request (`:80,82-86`). Insert Link reads `params.selectionText` (`:133`). (R-16)

##### Defects

- **Every Non-Link Construct at Rest Lacks Its Menu,** and the right-click focuses the cell instead. (R-02, R-03)
- **A Read-Only Embedded Page Offers Link Authoring at Rest:** A resting embedded page is read-only (`PageTile.tsx:182`) and holds a bundle with a `menu` (`TileHost.tsx:102`), so its cells offer the full authoring set. Remove Link, Delete, and Format commit through `onCommit`, which `MarkdownEditor.tsx:139`'s `changeFilter` drops; Rename and Edit Link mount a `CellEditor` through `onSelect`, which checks nothing. **Inferred** (B-56)
- **Format ▸ Page Title at Rest Never Swaps the Title In:** Uncached, it writes `[domain](url)` with `wantsTitle` true and nothing tracks the span (`linkFormat.ts:45-52`, `linkValue.ts:132-143`). **Inferred** (F-043)
- **A Resting Commit of Identical Text Records an Empty Undo Step:** `cellCommitChange` returns a non-empty replace for identical text (`sync.ts:23`), and the url arm commits whatever `linkActionText` returns, so Format ▸ choosing the link's current form records a step; the body guards it (`linkFormat.ts:77-79`). **Probed** (M10-04)
- **A Pending Swap Dies With a Live Cell's Editor** (B-158) and **nested links are dead at rest** (X-12) are *§3.13*'s and *§3.6*'s.

##### Design

**Rulings:** *Continuation §5.6*; read-only per B-56.

- **Every Construct Answers at Rest:** A right-click on a resting cell will open the construct's menu without focusing the cell. The right-click focus fallback (`cellStatic.tsx:355-356`) goes, and the cell will claim every right press (`:384-386` claims only a link today), so the browser doesn't seat the word under the pointer before the menu reads the selection.
  - **On a Link:** It will take the link door, with the target from the one hit shape (*§3.7*) and the one builder (*§3.8*).
  - **Elsewhere:** It will take the editor door (below), which will also serve a link X-02 leaves without a menu, a footnote marker (parity with the live cell, *Continuation §5.12*), and a selection.
  - **Embeds:** A cell's `![[P]]` will read as `!` plus a connection (built in the prototype, *§3.14*), so it will take the link door.
- **One Read-Only Consult (R-13):** `readOnly()` will be read once at the top of the resting right-click: it will set the builder's `editable` and gate the editor-menu ask, mirroring the body (`linkClicks.ts:146`, `menu.ts:88`). Authoring then won't be reachable at rest on a read-only page, so entering the cell will need no guard of its own.
- **Commit at Rest (R-08):** One `commitEdit(edit, enter)` in `StaticCellImpl` will serve link, format, checkbox, and system-row writes:
  - It will stand down unless `live.current === text`, a whole-text guard that replaces `still()` and matches the table menu's rule (`widget.tsx:292,297`), so a cell edited while its menu stood open will decline rather than retarget.
  - It will commit `applyEdits(text, edit.changes)` through `onCommit`, which escapes and settles.
  - Writes will commit without placing the caret; rows that need typing (Rename, Edit Title / Edit Link) will enter the cell with their selection seated.
  - The link menu's answer will go through the pure `linkEdit` (*§3.8*).
  - `menuTarget`, `still()`, and the `wikiAuthorTarget`/`linkActionText` imports go. The `live` ref stays: `claimCheckbox` reads it (`cellStatic.tsx:332`).
- **One Seat (R-09):** `type Seat = { kind: 'point'; x; y; sweep? } | { kind: 'select'; range }` will replace the three refs, the three resets, and the three `CellEditor` props with one ref, one prop, and `onActivate(seat)`. `onSelect` goes, and the nested ternary becomes a `switch`. The drag activations (`MarkdownTable.tsx:349,388`) aren't seats.
- **Pointer-to-Offset Mapper (R-15):** A mapper will turn the pointer, or a DOM selection clamped to this cell, into source offsets. Rendered text differs from source length (aliases, `§`, ordinals, list glyphs, `​`), and only link spans carry offsets today. It needs:
  - an offset on every token span (*§3.6*'s M10-05 removal guarantees a span per token);
  - a base offset on list lines, whose `data-cell-line` holds an index (`cellStatic.tsx:237`);
  - a walk from a text node to the nearest span or line base, with synthetic glyphs clamping to their token.
  - It will run on `contextmenu` and at Copy/Cut only. No reader exists to reuse; CodeMirror's `posAtDOM` needs a view.
- **The Resting Editor-Menu Ask (R-16):** The resting cell will ask through the same `host.menus.format` / `editor:menu` door the live cell uses (`bridge.ts:266`):
  - **Request:** It will be built from `readFormatState(text, from, to)` with a `resting` flag on `editorMenuRequest` (`Core/Actions/editorMenu.ts:18-37`), and carry the source selection for Insert Link in place of `params.selectionText`, which is the drawn text at rest.
  - **Main:** `:128`'s gate returns before `systemItems`, so a resting request will need a branch there. That branch will drop Undo, Redo, and Select All; make Cut, Copy, and Paste renderer-resolved items; and override Paste Without Formatting's `enabled: f.canPaste` (`:84`).
  - **Reply:** `editFor` will be exported as the pure dispatcher, and `insertLinkOverSelection` split into a pure `insertLinkEdit` the same switch returns, both feeding `commitEdit`. `applyEditorAction`'s view-only arms stay unchanged.
- **System Rows at Rest:** Cut, Copy, Paste, Paste As, and Paste Without Formatting will act at rest; Undo and Redo stay out.
  - **Copy:** It will write the source slice through `host.clipboard`, matching a live cell; the native role would copy the drawn text.
  - **Cut:** It will copy, then commit the deletion.
  - **Paste Rows:** They will run at the click offset through *§3.11*'s pure pipeline, the hard prerequisite that keeps them from restating `pasteAs`'s ordering (`pasteLink.ts:86-109`).
  - **Table Payload:** A table-shaped clipboard will fill cells as a live paste does, so `onFill` will reach `StaticCell`.
- **Titles at Rest:** Format ▸ Page Title at rest will use the title fallback (*§3.13*): wait for the title, then commit once under the whole-text guard. That will fix F-043.
- **Identical-Text Commits (Open, Planner):** The pure `linkEdit` will carry the no-op guard, but other resting writes would still reach `cellCommitChange`'s non-empty replace. A guard in `commitEdit`, or reusing `changesTo` (`Pages/merge3.ts:4-9`) in `cellCommitChange`, would each close it. (M10-04)
- **Text Values Stay Out:** `TextCell` shares `linkGestures` and `renderCellContent`, but *Continuation §5.7* keeps today's right-click on values. The editor-door claim, the mapper, and `commitEdit` will live on `StaticCell` only; a `TextCell` right-click on non-link content stays unchanged, bubbling to the value's host menu.
- **Rejected:**
  - Withholding authoring at rest: *Continuation §5.6* rules every construct's menu in.
  - Activating, then re-popping the live menu: an activate-then-menu handoff across a mount, for no gain.
  - Answering at rest and entering the cell to apply: a chosen write would place the caret, which the ruling excludes.
  - A renderer-popped editor menu: the live and resting cell would open different doors with different system rows.
  - Page-owned pending titles: superseded by the title fallback.
- **Live Checks:**
  - A read-only embedded page's resting cells offer no authoring rows (B-56).
  - The resting editor menu's system rows behave at rest: Paste Without Formatting's `canPaste`, and that no role row reaches the page body's caret (R-16, R-19).
  - The link door's `preventDefault` and the editor door's undefaulted event stay exclusive (R-20).

##### Traps

- **Writes That Leave a Slot:** *Continuation §5.6* sorts rows into writes (no caret) and typing rows (enter), but some writes produce a slot meant for typing. Bold at a plain point inserts `****` with `selection: 2` (**Probed**), and Format ▸ Link or Connection writes `[]()` or `[[]]` at a point and `[word]()` over a range, each with the caret meant inside the empty slot (`format.ts:51,55-59`). Committed without entering, these strand the slot. A wrap over a range leaves nothing to type (`selection: 8` sits before the closing marker), so it commits as written. The ruling doesn't name them (*Continuation §12*). **Probed** (R-05, R-21)
- **Role Rows Act on the Focused Element:** At rest that's the page body's caret or nothing, so a role Paste would write into the page. **Inferred** (R-19)
- **The Two Doors Stay Exclusive:** The link door's `preventDefault` (`cellStatic.tsx:423`) withholds Chromium's `context-menu`; the editor-door claim must stop the bubble without defaulting, or main never pops (`MarkdownPM.md:97`). (R-20, Q-37)
- **Cell Writes Escape `|`:** A title or alias holding `|` written raw into a row splits it (`[A | B](https://a.co)` reads as cells `["x","[A","B](https://a.co)"]`); through `cellToSource` it round-trips. `onCommit` escapes already (`sync.ts:21`); any write that reaches the page document at a cell's span some other way needs `cellToSource`. **Probed** (R-11, B-176)
- **Resting Writes Settle the Table:** A write must go through `onCommit`'s settle (`MarkdownTable.tsx:463-467`), or the document changes while the widget draws the old text (`Editor-Internals.md:17`).
- **`input.paste` Tags:** The live cell's and the table guard's paste filters key on the tag (`CellEditor.tsx:155`, `tableGuard.ts:28`). The resting commit carries no user event, so the resting paste must route a table payload to `onFill` itself. (A-119, R-23)
- **The Seat Survives the Commit Only Approximately:** Entering commits and enters in one tick; `CellEditor` clamps the selection to the document end (`:258`) and `mirrorBody` syncs a late `initial` (`:279-283`). GFM trims cell edges on read (`codec.ts:52`), so a commit introducing a leading space would shift the seat; none of these actions writes one. (R-22)
- **The Hot Path:** Span attributes ride the token path; the token-less fast path (`cellStatic.tsx:64-67`) stays bare. (R-25)
- **`tableConnections` Is Read Inside the Widget's React Render** (`widget.tsx:345`). (B-190)

##### Would Go False

- Tests: `cellStatic.test.tsx:117-127` (a right-click enters the cell); `cellLinks.test.tsx`'s resting-menu cases that enter through `onSelect`, `still` declining (`:207-239`), and the labels (`:253-269`); `:194` and `:201` (rewriting in place without entering) stay true; `Desktop/Actions/editorMenu.test.ts:114-120` (stays true for live requests and needs a resting case); `Menus/editorMenu.test.tsx:59-177` where `applyEditorAction` splits. (R-29)
- `MarkdownPM.md:97` ("The right-clicked editor sends what sits under the click"): a resting cell, which isn't an editor, will send it too.
- `ConnectionsPM.md:49` (a read-only surface offers the opens and Copy Link) is false today at rest (B-56) and becomes true; its omission of Copy Path is an abbreviation of `:44`.
- `Editor-Internals.md:17` stays true.

---

#### 3.10 Link Property Values

##### Current Shape

- **Read and Store:** `decodeValue`'s link arm accepts any string or a YAML-nested `[[x]]` through `linkEntry(raw, 2)` (`propertyValue.ts:72-75`, `linkValue.ts:15-22`); nothing validates on read, so a hand-written non-address reads as a URL. `readLink` (`linkValue.ts:30-35`) reads a whole `[[…]]` as a page and everything else as a URL, so `[x](Old)` is `{ url: 'Old', alias: 'x' }` (P-13). The app writes pages into a Link value only as wikilinks under the page's own capitalization: `[x](Old)` commits as `[[Old|x]]`, `[x](Old#H)` as `[[Old#H|x]]` (`linkValue.ts:49-51,59-60`). This earns itself, since other tools read the frontmatter and Obsidian recognizes a quoted `"[[Page]]"` as a link but not a markdown link (**Inferred**, external behavior); a `[x](Page)` value only arrives by hand or from another tool (P-02).
- **Mounting:** `Cell.tsx:131-137` mounts `LinkCell` without `ctx.connections`; `:139-141` mounts `TextCell` with it. `LinkCell` reads the value once (`LinkCell.tsx:30`) and branches: a page goes to `ConnectionCell` (`:40-41`, `:64-97`), anything else to the URL half (`:42-61`), and an empty URL draws nothing (`:42`). `ConnectionCell` predates the shared resting stack; `TextCell` already runs that stack on a resting value: `renderCellContent`'s draw, `resolveFollow` through the api, the `dwellTarget` glance, and `heldTarget` for `[[#H]]` (`TextCell.tsx:28-41,60`) (A-77, P-11).
- **Where `ctx.connections` Comes From:** Views build the value context from `previewConnections` (`Views/Host/useViewHost.ts:113`), which follows **Open Connections In Preview**; the Panel passes the window side pane's `hostConnections` (from `useConnections('window')`, `WindowTabBody.tsx:160,215`) or `previewConnections` (`PropertyPanel.tsx:164-175`). `connectionsOf` routes `'window'` and Open-in-Preview to `openWindowTab` (`Session/pageConnections.ts:17-19,37-40`). GlancePane mounts no `PropertyPanel` (mounts: `Contexts/SpaceMenu.tsx:103`, `WindowTabBody.tsx:215`, `Pages/PageMenu.tsx:92`) (A-23, A-149).
- **A Page Value Opens Through Its Own Route:** `ConnectionCell` calls `useSession.select` directly with `{ newTab: isCmd(e), heading }` (`LinkCell.tsx:73-74,86-90`), bypassing `pageConnections.ts:37-40`. It resolves through `resolveConnection(tree, title)` (`:75`), or `holder` for `[[#H]]`, and shows `alias ?? (title || '#' + heading)` (`:76,93`), while `renderCellContent` draws `Alpha § Setup` (`cellStatic.tsx:55-110`).
- **The URL Half:** It carries the property's look: `link_display` (or the view column's look), `link_color`, and `link_underline` (`LinkCell.tsx:32,46-47`), which `ConnectionCell` doesn't apply. A per-value alias overrides the format but not color or underline (`PropertiesPM.md:81`). Page Title subscribes to and fetches the site title when the value has no alias (`:33-38`); that hook is a copy of `WebTile`'s (*§3.13*). Its anchor opens any non-empty URL and stops propagation (`:51-56`); it has no glance.
- **The Look:** `.cell-link`, `.cell-link-underline`, and `.cell-connection` (`UIX/Table/table.css:252-262`; `.cell-connection` sets its own `cursor: pointer`, `:261`) plus an inline `solidColorCss`. A page value has one `.cell-connection` color whatever its status, and no value has an invalid tone (A-28).
- **Clicks:** A padding click bubbles to `valueClickIntent`'s link arm (`valueClick.ts:47-52`): a valid address returns `{ kind: 'open' }` through `urlClickTarget` (`linkValue.ts:64-68`), a page returns `null`, and anything else returns `edit`. **Probed:** `https://a.com` → open, `[[Old]]` → null, `[x](Old)` → edit (Q-28). The `open` intent has one producer and three handlers (`TableView.tsx:155`, `CardValue.tsx:94`, `PropertyPanel.tsx:301`), each importing `openWebLink` for nothing else (`TableView.tsx:52`, `CardValue.tsx:29`, `PropertyPanel.tsx:42`). The padding is reachable because `.cell-text-scroll` is a content-sized `inline-block` (`table.css:189-193`) and Cards add inner padding (`cards-view.css:119-123`).
- **Commit:** `parseEditorValue` → `linkValueFromEdit(raw, current, resolveTitle)` (`parseEditorValue.ts:35-40`, `linkValue.ts:82-95`) → `parsePastedLink` (`:48-62`), with `resolveTitle` = `resolveConnection(tree).title` (`Properties/Cells/linkResolve.ts:7-8`, `Nexus/treeIndex.ts:284-288`). `resolveConnection`'s null on an ambiguous title (`treeIndex.ts:287`) is the only thing refusing `[[Dup]]` (T-06). **Probed** (P-15, Q-24):
  - `[[Nope]]` → refused; `[x](example.com)` → refused, since a title-shaped target that doesn't resolve never reaches the address arm (`:59-60`), while bare `example.com` → `https://example.com`.
  - `[[#H]]` and `[x](#H)` → refused, because `resolve('')` is phantom (`Connections/pageIndex.ts:26,36`), though `LinkCell` draws and opens `[[#H]]` through `holder` (A-62).
  - `[^1](https://a.com)` commits (`MD_LINK` has no `^` exclusion, `links.ts:5`); `[a](b) [c](d)` is refused only because the greedy destination `b) [c](d` is title-shaped and doesn't resolve.
  - Alias carry follows three rules: page → page keeps whatever was typed (`[[New]]` over `[[Old|a]]` → `[[New]]`); URL → URL keeps the old alias always (`https://b.com` over `[x](https://a.com)` → `[x](https://b.com)`, `:92-93`, reached only by a bare typed address); a cross-kind edit loses it.
- **Edit Field Seeds:** `linkEditText` shows a page with its alias (`[[Old|a]]`) and an address without it (`https://a.com`) (`linkValue.ts:70-75`); a hand-written `[x](Old)` seeds `Old`. The inline editors (`PropertyPanel.tsx:408-413`, `CardValue.tsx:146-151`, `TableView.tsx:217-222`) pass no `holder` or `connections`; only the popover mounts pass `holder` (`TableView.tsx:257`, `CardsView.tsx:495`, `PropertyPanel.tsx:536`) (T-08).
- **Rename:** `rename` → `editAs('popover')` → `PropertyValueInput` seeded with `linkAlias(raw)` (`PropertyValueInput.tsx:56,66-75`; `linkAlias` at `linkValue.ts:77-79` has no other caller), committing `linkValueFromRename` (`linkValue.ts:97-107`); `''` clears the alias. It rebuilds through `readLink`'s kind, so a page value is written back through `connectionText`.
- **The Value Menu, Wired at Three Parents:** `TableView.tsx:287-293`, `CardValue.tsx:114-120`, `PropertyPanel.tsx:340-347`. Card passes `hideable` (`CardValue.tsx:115`); Card and Table wrap the menu in `holdGhost` (`CardValue.tsx:117`, `TableView.tsx:290`); the Panel has neither. Each calls `linkValueMenuTarget` (`Interface/Menus/connectionMenuActions.ts:74-103`), which resolves on its own (`:89-91`, `resolveConnection(tree, '')` for `[[#H]]` → null), filters the url arm's `apply` to `rename`/`editLink` (`:98-100`), and routes Clear and Remove through `onCell` (`:86`), a channel that exists only for value menus (`ConnCellApply`, `connectionMenu.ts:24`; `isConnCellAction`, `:61-62`; the `onCell` field, `connectionsApi.ts:5,19`; dispatch, `connectionMenuActions.ts:38,67-69`). Labels read `ctx.external ? 'Rename' : ctx.hasAlias ? 'Edit Title' : 'Add Title'` and `Edit Link` (`connectionMenu.ts:84,87`); **Probed:** a page value reads Edit Title · Edit Link, a URL value Rename · Edit Link. A URL value's rows run `Preview, Open In Browser, Copy Link, Rename, Edit Link, Clear, Remove`, where the editor's run `…, Rename, Edit Link, Copy Link, Format ▸, Remove Link, Delete` (`:93-94` vs `:95-109`); a value has no Format (Q-07).
- **The Fallback Menu:** When `linkValueMenuTarget` returns null (empty, invalid, phantom, ambiguous, `[[#H]]`), the parents pop `cellMenuModel({ kind: 'link' })` → Edit · Rename · Clear · Remove (`Actions/cellMenu.ts:65-66,127-133`; `TableView.tsx:294-302`, `CardValue.tsx:121-128`, `PropertyPanel.tsx:346`) (P-08).
- **Remove by Surface:** Card's Remove hides the property from the view (`CardValue.tsx:95`). Table and Panel pass `hide: null` (`TableView.tsx:156`, `PropertyPanel.tsx:303`), yet the Panel's row menu offers Remove, which clears the value and un-reveals the row (`value:remove` → `emptyRow(id, false)`, `PropertyPanel.tsx:315-319,331-332`), so a Link value's own menu there lacks a row its row menu has (Q-05).
- **Sort and Filter:** Link values sort and filter on `linkDisplayText` with no look (`filter.ts:147-149`, `sort.ts:60-62`), so a style change never reorders (`linkValue.ts:109`); `[[#H]]` returns `''` and sorts first. Text values use raw markdown (`filter.ts:144-146`, `sort.ts:58-59`), which *Continuation §5.12* leaves as is.
- **Text Values:** A resting Text value reaches the link menu through `linkGestures`' `readOnlyMenu` (`cellStatic.tsx:409-412`), which stops propagation (`:423-424`); everything else bubbles to the parent's text menu. The live `TextPane` is a full editor (`TextPane.tsx:117-123`, `inlineSurface`).

##### Defects

- **Routing:** A Text value's `[[Page]]` opens in the window's tab strip or in Preview; a Link value's opens in main content (A-23, B-26).
- **A Plain Click Overrides Tab Open Behavior:** `ConnectionCell` passes `newTab: isCmd(e)`, so a plain click passes an explicit `false`, which `select` takes over `settingOf(…, 'tabOpenBehavior') === 'newtab'` (`Core/Session/navigationSlice.ts:540-541`). Every other page opener passes no option on a plain click (`pageConnections.ts:39`; `useViewInteractions.tsx:369-370`). With Tab Open Behavior set to new tab, a Link value opens in the current tab (B-52).
- **A Page Value Hides Its Heading:** `Alpha` instead of `Alpha § Setup`; `#Setup` instead of `§Setup` (A-24).
- **One Color for Resolved, Phantom, and Ambiguous; No Glance** on either half (A-25, A-28, B-51).
- **A Bare `[[#Setup]]` Value Follows but Has No Link Menu,** and the Link property refuses to commit what its cell draws (A-18, A-62).
- **`[x](example.com)` Is Refused** while bare `example.com` commits (P-15).
- **An Invalid Value's Text Opens Something:** The anchor opens any non-empty URL. On the default route the host's `link:open` refuses it (`Web/handlers.ts:39-40`); with **Open Links In Pommora** on, `openWebLink` → `openBrowser` is ungated (`Web/openWebLink.ts:9`, `windowSlice.ts:247`) and `WebWindow.tsx:17-48` loads the summon unvalidated, while the attach gate refuses anything without a written `http(s)://` (`Desktop/Web/webGuests.ts:18,150-157`), so the expected result is a blank in-app window (**Inferred**; A-26, A-27, P-12).
- **The Create-Ghost Appears Behind a Link Value's Menu:** `suppressWrap` counts `menusOpen` around `await menu()` (`UIX/Interactions/ghostCreate.ts:144-153`), but `showConnectionMenu` resolves at once, so `blocked()` (`:49`) stops suppressing while the native menu is still up; sibling cell menus await the real `popMenu` (`TableView.tsx:302`, `CardValue.tsx:128`). Table and Card are affected; the Panel has no create-ghost. **Inferred** (B-68)
- **Edit Link Loses or Keeps an Alias by Kind** (the three rules under *§Current Shape*), and **Remove Title On Link Change** never reaches a value.

##### Design

**Rendering (P-24):** The value's resolved target (`valueTarget`, *§3.5*) will decide the renderer:
- An external target, or a bare value with no token, will keep the URL half with the property's look (`link_display`, `link_color`, `link_underline`), since a bare address isn't a token (`tokens.ts:17-30`) and the look options are genuinely the property's (P-04). Its anchor will follow through `resolveFollow(target, own, api, e, openWebLink)` and gain `onPointerOver`/`onPointerOut` → `dwellTarget`, so an address value gets the site glance a Text value's weblink has.
- Every other whole-token value (page, held `[[#H]]`, phantom, ambiguous, hand-written `[x](Page)`) will render through `<TextCell text={showFullLink ? connectionText(title, undefined, heading) : raw} connections holder … />`, and `Cell.tsx:131-137` will pass `ctx.connections`. Values then gain the routing, Tab Open Behavior, phantom and ambiguous tones, `Alpha § Setup`, the missing-heading mark, and the glance (*Continuation §5.7*). F-062's gap is inherited from `TextCell` and fixed there once (*§3.6*).
- `TextCell` will take a decline so its read-only link menu doesn't pre-empt the parent's value menu (T-04; see *§Traps*).
- `ConnectionCell`, its page branch, the `resolveConnection` import, and `.cell-connection` (`table.css:258-262`) go. `useSession` stays for the title hook, and `isCmd`/`LinkTarget` share import lines with names that stay.
- **Routing Note:** "Pages to `TextCell`, external and invalid to the URL half" doesn't work: a phantom or ambiguous `[[Nope]]` has no URL, and `if (!url) return null` (`LinkCell.tsx:42`) would draw a blank cell.
- **Live Check:** A Link value through `TextCell` (`cell-text-host`/`clip`/`line`, `TextCell.tsx:47-63`) truncates and shows its ellipsis as `OverScroll className="cell-text-scroll"` does, in a Table, a Card, and the Panel.
- **Live Check:** With Open Links In Pommora on, an invalid Link value's text edits rather than opening.

**Clicks (Q-29):** Clicking the text will follow and clicking the padding will edit, for page and address values alike (*Continuation §5.7*). The URL half's anchor will stop propagation only when `resolveFollow` returns a follow, so an invalid address's text bubbles and edits (`resolveFollow` returns null for `invalid`, `linkClicks.ts:112-113`). `TextCell`'s follow stops the click on any hit link before knowing whether it can follow (`TextCell.tsx:37-41`), and an ambiguous value draws a `data-link-span` (`cellStatic.tsx:105`), so its text neither follows nor edits. Whether `TextCell` stops a click only when a follow exists, matching the URL half, is open (**Planner**). `valueClickIntent`'s `case 'link':` will join `case 'text':` (returning `edit`), and `urlClickTarget`, the `open` intent, its three handlers, and their `openWebLink` imports go. A page value's padding click will then edit.

**Commit (P-23, Q-25, Q-26):** Edit Title / Edit Link will commit through the one reader, `readLinkText` (*§3.1*), and the one `retarget` (*§3.11*):
- **Classification:** A page if a page has that title, refusing `status !== 'resolved'` explicitly (*§3.5*); otherwise a weblink if valid, normalized to a scheme; otherwise refused. `[[#H]]` and `[x](#H)` will commit when the value has a holder and stay refused on a Space, where `holder` is undefined (`valueContext.ts:18-20`) and a bare `[[#H]]` names nothing (`rewrite.ts:76-78`, `cascade.ts:219`). `[x](example.com)` will commit as `[x](https://example.com)` unless a page has that title, in which case it will be stored as `[[example.com|x]]` (*Continuation §5.7*).
- **Retarget Call:** The caller will pass the next target's kind as the container syntax (`wiki` for a page, so pages stay `[[…]]`; `markdown` for a weblink) and no format, so no Default Link Format label is ever written into a value. Shown text follows `retarget`'s precedence, which means **Remove Title On Link Change** (default on, `Settings/personalization.ts:153`) will govern value commits too: an address value renamed "Docs" will lose "Docs" when Edit Link changes its address (*Continuation §5.8*). Re-typing the same target will keep the alias; the field's own `text === initial` skip (`PropertyValueInput.tsx:62`) catches only an untouched field.
- **Threading:** The three inline editors will receive `holder`, `connections` (the commit reads the index live), and the Remove Title On Link Change setting, which `PropertyValueInput` will read and pass through `parseEditorValue`. `linkResolve.ts` and `resolveConnection` go (*§3.5*).
- **Seed:** The edit field will show the value's target without its label for both kinds: `connectionText(title, undefined, heading)` for a page, the address for a weblink. A page seed will keep `[[…]]`, because a bare-title reader arm would read `Note: x` as a scheme (`HAS_SCHEME`, `urlPath.ts:2`).
- **Pasted Labels:** The inline field stays a UIX `EditableInput` with no CodeMirror view (unchanged), so neither Paste As nor the paste pipeline will run there; a pasted `[a.com](https://a.com)` will keep `a.com` as its alias, which the property's Format can't reach. That is coherent with Format hidden: a pasted label is the alias, and Rename to empty clears it (*Continuation §5.7*, Q-17).

**Rename (X-01):** The Rename row keeps the value's written syntax: `[x](Old)` renames to `[y](Old)` and `[x](Nope)` to `[y](Nope)`, as today's url-kind rebuild already does (`linkValue.ts:97-106`). That holds only while the rebuild reads written syntax: a rebuild through a classifying reader would read `Nope` as a page, even under `readLinkText`'s resolver-free tiebreak, and write the phantom `[[Nope|y]]`. `linkAlias` goes; the popover will read the alias from `readLink`'s written-syntax report (*§3.1*). The cascade's rename, strip, park, and restore of hand-written `[x](Page)` values belong to *§3.16*.

**The Value Menu (Q-07…Q-12):** The three parents will call the one builder (*§3.8*) with the value's resolved target and `{ hideable }`, await the promise-returning `showConnectionMenu` inside `holdGhost`, and hand the answer to `runMenuIntent`; each parent's two pop paths fold into one. What stays at the parents: the `dt === 'link'` decision, the `runValueIntent` handlers, `holdGhost` (Table, Card), `hideable`, and the generic fallback for an empty or unresolvable value.
- `linkValueMenuTarget` goes whole with its imports and `LinkCellAction`; its resolve becomes `valueTarget`'s, its fields become the builder's arguments, and its `apply` filter becomes the menu's promise. The `onCell` channel goes (`onCell`, `ConnCellApply`, `isConnCellAction`, the dispatch), since `cell:clear` and `cell:hide` return through the promise.
- `valueMenuIntent` will take `CellMenuAction | LinkMenuAction` over the same table; a `format:*` the value menu never offers maps to `null`, the table's existing "not mine".
- `[[#H]]` and hand-written `[x](Page)` values will gain their link menu through `valueTarget`'s held and markdown arms (P-19).
- **Rows:** Today's rows stay (*Continuation §5.7*). Labels will come from the one source: Rename, then Edit Title on a connection or Edit Link on a weblink, with no alias dependence (*Continuation §5.5*). Format stays off values; the builder keeps it to editors only.
- **Panel Remove:** The Panel will pass `hideable` and map `hide: () => emptyRow(def.id, false)` in place of `null` (`PropertyPanel.tsx:303`), so its value menu offers the Remove its row menu already does: clear this page's value and hide the row on this page (*Continuation §5.7*). Table stays without Remove.
- **B-68:** `holdGhost` will await a real promise once the menu answers (*§3.8*), so the create-ghost stays held.
- **Live Check (B-68):** No create-ghost appears while a Link value's menu is open in a Table or a Card.
- **Rejected:** A value-owned menu (handing the value menu to `TextCell` as `menuAt`) would have to thread `holdGhost`, `hideable`, the editable closures, and a separate return route for cell actions down into the cell, where the parent-owned shape keeps them where they live.
- **Rejected:** Format ▸ on a value would write a per-value label (`linkMarkdown`), after which the property's and the column's Format never reach that value, Full Link pins a label equal to the address, sort and filter move to the label, and Page Title needs a value-side title wait (Q-14).
- **Open (Checkpoint Q1):** The one model join moves a URL value's Copy Link after Rename and Edit Link; *Continuation §5.7* says values keep today's menu. Keeping today's order means the model takes a value branch. The lean is today's order unless the one model clearly wants it (*Continuation §12*).
- **Open (Checkpoint Q2):** Whether phantom, ambiguous, invalid, and held links get a link menu is the planner's call (X-02, *§3.8*). The value fallback's labels depend on it: a phantom value has no target arm to say Edit Title or Edit Link, so unless that call gives unresolved links a target, `cellMenuModel`'s `link` kind keeps its own labels as the one place they differ (Q-13).
- **Open (Checkpoint Q3):** The column's Format ▸ on a Link cell, matching Number, Select, and Date cells (`cellMenu.ts:73-84` → `styleBranch`, absent for the link kind at `:65-66`; the parents already route `style:*` at `TableView.tsx:307`, `CardValue.tsx:131-132`), only if cheap and unconstrained. It would restyle the whole column in that view, leave an aliased value unchanged, and be absent in the Panel, which has no column.

**Text Values:** Their non-link content keeps today's right-click. The links inside get only what rides along through the one builder: `readOnlyMenu`'s path will become the builder with `editable: false`, the same labels, and whatever the unresolved-link call gives (X-11, *§3.8*). No authoring plumbing is added (*Continuation §5.7*). The live `TextPane` is already at parity; its pending-title close-forward is *§3.13*'s.

##### Traps

- **`TextCell`'s Decline Is Required:** `ctx.connections` carries `menu` in both value contexts (`useViewHost.ts:113`, `PropertyPanel.tsx:168-172`), so without the decline `linkGestures.onContextMenu` pops the read-only link menu and calls `stopPropagation` (`cellStatic.tsx:416-424`) before the parent's value menu. `linkGestures` already takes a fifth `menuAt` parameter (`:402`); a `menuAt` returning null makes `onContextMenu` return false without stopping propagation (`:419-420`). `TextCell` has no prop for it today, and *§3.9*'s resting `menuAt` work touches the same parameter (`cellStatic.tsx:422`; T-04).
- **The Ambiguity Refusal Is Explicit:** Once `resolveConnection` goes, the commit refuses `status !== 'resolved'` itself, or `[[Dup]]` commits (B-153, T-06; *§3.5*).
- **Value Retargets Choose Their Syntax:** Calling `retarget` with the container's own syntax stores `[x](New)` for a page retarget of `[x](https://a.com)`, breaking P-02's canonical `[[New|x]]` and every host reader keyed on it (Q-35).
- **Remove Title On Link Change Defaults On:** Every value commit through the one rule starts dropping aliases on retarget by default (Q-34).
- **`linkDisplayText`'s No-Format Raw URL Is Deliberate:** Sort and filter stand on it (`linkValue.ts:109`, pinned by `linkValue.test.ts:120`) (A-134).
- **`showFullLink` Stays:** `TableView.tsx:680` sets it while the column's alias popover is open, so the cell under it shows the target the alias names (P-05).
- **A Bare URL Isn't a Token,** so the URL half stays (A-132).
- **Panel and Card Remove Differ:** Same label and action id; Card hides a property from the view, the Panel clears the value and un-reveals the row (`PropertyPanel.tsx:315-319,332`). The builder can't assume one meaning (Q-33).

##### Would Go False

- `ConnectionsPM.md:34`: "Clicking a connection opens the page, routed by Open Connections In Preview" is false for Link values today and becomes true.
- `ConnectionsPM.md:48`: "Close, in a property cell | Clear (· Remove on a card…)" gains the Panel's Remove.
- `ConnectionsPM.md:73`: the "Connection rendering is written twice" limitation goes.
- `PropertiesPM.md:81`: "A per-value alias, set through Rename and stored as `[alias](url)`" goes false: a pasted label is an alias too, Rename to empty clears it, and a page value stores its alias as `[[Page|alias]]`.
- `PropertiesPM.md:83`: "the connection color, a click that opens the page" becomes the shared connection tones and routing; `[x](example.com)` commits as an address rather than being refused; `[[#Heading]]` commits on a page.
- **Tests:** `LinkCell.test.tsx:33,52` (`.cell-connection`) and `:26-27,37-39,43-44,63-70` (mocked `select` with `{ newTab: false, heading }`); `valueClick.test.ts:61-66` (`open`, page `null`); `linkValue.test.ts:13,170` (`urlClickTarget`), `:241` (the edit seed shows the alias), `:249,255-262` (alias carry on Edit), and the `linkValueFromEdit` refusals of `[[#H]]`; `connectionMenuActions.test.ts:8,16,106` (`linkValueMenuTarget`).

---

#### 3.11 Paste, Paste As, Copy, and Retarget

##### Current Shape

- **One Mount:** `pasteLink` is mounted once in `inlineSurface` (`MarkdownPM/surface.ts:53`) for page, cell, and Text value alike; `pasteDecision.ts`'s only reader is `linkFor` (`Links/pasteLink.ts:17-39`).
- **Plain ⌘V:** `linkFor` declines on a read-only view, exits unless `pastedUrl` reads a bare scheme-bearing address (`pasteLink.ts:21-22`; `pasteDecision.ts:21-27`), returns literal where `literalAt` holds (`:42-47`: inside a markdown destination per `linkDestinationStart`, or in code), and otherwise asks `decidePaste`: a one-line selection wraps as the label, a bare caret takes the Default Link Format. Everything else falls to CodeMirror's raw insert.
- **The Inverse Chord (⌘⇧V):** `paste-inverse` reads the clipboard through main (`pasteLink.ts:123-135`) and inverts whichever axis is in play: with a selection it writes the formatted link instead of wrapping; at a bare caret it pastes literally.
- **One Paste Classifies Twice; Paste As Reads the Clipboard Twice:** `linkFor` calls `pastedUrl` (`:21`) and `decidePaste` calls it again (`pasteDecision.ts:30`); `trimmedRange` runs in both `linkFor` (`:32`) and `writeLink` (`:51`). For Paste As, main reads the clipboard to build the rows (`Desktop/Actions/editorMenu.ts:103-105`), then the renderer reads and classifies it again (`pasteLink.ts:88,101`), because the menu's reply is a bare action string (`Menus/menu.ts:72-73`) (A-32, A-80).
- **`pasteDecision` Is a Subset of `pasteAsWrite`:** Its bare-caret arm `linkPaste(target, format, title)` (`pasteDecision.ts:46`) equals `pasteAsWrite({ kind: 'url', url }, format, title)` (`Actions/pasteAsMenu.ts:121`). `PasteInput`, `LITERAL`, and `PasteDecision` (`pasteDecision.ts:7-18`) exist only to keep `decidePaste` pure; `wholeWikiLink` duplicates `parseConnectionText` (A-79).
- **Title-Pending Writes: Two Shapes, Three Writers:** `LinkPaste` (`linkValue.ts:124-129`) and `LinkActionText` (`Links/linkFormat.ts:13-17`, with `formatted()` at `:45-52` only renaming fields). Writers: `writeLink` (`pasteLink.ts:49-63`, `awaitTitle` at `:58` plus `linkTitles.resolve` at `:62`), `applyUrlLinkAction` (`linkFormat.ts:55-86`), and the resting cell's URL arm (`cellStatic.tsx:466-474`, fetch without announce; *§3.9*).
- **The Address Gate Is Spelled Six Ways:** `isValidLink`; `isHttpLink` (`Core/Paths/urlPath.ts:20`); `WEB_ADDRESS.test(normalizeLinkUrl(x))` (`dwellTarget`, `linkClicks.ts:128-129`, which is `isHttpLink` restated, since its input already passed `isValidLink`); `WEB_ADDRESS.test(x) && isHttpLink(x)` (`Desktop/Web/webGuests.ts:18`, equivalent in effect); `WEB_ADDRESS.test(x) && isValidLink(x)` (`loneWebpageEmbed`, `detect.ts:414`, and `pastedUrl`, `pasteDecision.ts:25-26`); `WEB_ADDRESS.test(url)` alone (`embeddableTarget`, `pasteAsMenu.ts:70`). The written-scheme variants are genuine, and `pastedUrl`'s scheme requirement is deliberate; its `/\s/` repeats `isValidLink`'s (`urlPath.ts:26`) (B-34).
- **Normalization Differs:** Paste As writes a URL raw (`pasteAsMenu.ts:118,121`); the Link property (`linkValue.ts:61,94`) and Insert Link (`Menus/menu.ts:52`) normalize (A-30).
- **Three Literal-Paste Commands:** Paste Without Formatting (`pasteAs(view, 'literal')`, `pasteLink.ts:92-95`, dispatched by `PASTE_PLAIN_ACTION = 'paste:plain'`), ⌘⇧V at a bare caret (`:123-135`), and Paste As ▸ Plain Text (`pasteAsMenu.ts:118`), which writes `[Home](url)` as the address alone (A-35). The code says "literal" in the pipeline and "plain" in the action and the Paste As form.
- **Paste As Rows:** Main builds them from the clipboard alone with `pasteAsRows`; the request already carries `link` and `connection` flags (`Core/Actions/editorMenu.ts:29-30`, filled by `readFormatState`, `formatState.ts:38-39`), which are edge-inclusive (`tk.range[0] <= f && t <= tk.range[1]`): **Probed**, `[[P]] tail` reads `connection: true` at offsets 0, 3, and 5 (E-22, E-27). Footnote is offered on any non-empty clipboard (`pasteAsMenu.ts:79`). Page Title is offered for any `isValidLink` address (`URL_ROWS`, `:59-62`; *§3.13*).
- **Retargets Today:** The picker is the only writer that changes a link's target by intent (*§3.12*). Edit Title / Edit Link writes nothing: it seats the caret or selects the address (`Links/linkEdit.ts:27-29`, `linkFormat.ts:64-66`, `cellStatic.tsx:469-470`, `Menus/gripMenu.ts:151-157`), and what follows is typing, a paste, or the picker. The rename cascade changes targets by construction and keeps syntax (*§3.16*) (E-16, E-17, E-18).
- **The Container Reader Exists:** `readFormatState` tokenizes the caret's line alone (`formatState.ts:13-16`), and `linkTokenAt(tokenize(line), rel)` is the same read: pure, line-scoped, and working with the caret off-screen, where `drawnLinkAt` doesn't (B-163). It hands over the container's range, kind, and title. A line read alone misses fences (E-24).
- **Copy Link:** Page Copy Link is written twice, through `dialer` (`pageMenuActions.ts:51-52`) and through `host.clipboard` (`gripMenu.ts:91-92`), because the editor imports no `Platform/dialer` (A-34, A-118). Address Copy Link drops the alias and doesn't normalize (`connectionMenuActions.ts:37`), so a schemeless copy fails plain ⌘V, which is defensible given `pastedUrl`'s scheme rule (A-63).
- **Rectangle ⌘V:** `MarkdownTable.tsx:243-252` writes `cellToSource(text)` with no link formatting; `:245` already holds `host` (A-57).
- **Drop:** The only drop handler is `dropMargin` (`decorations.ts:760-766`); CodeMirror's default inserts a dropped address as raw text (**Inferred**, A-60).

##### Defects

- **`[x](#Heading)` Becomes an Empty Page Target:** **Probed:** `pasteAsTarget('[x](#Heading)')` → `{ kind: 'page', title: '' }`, offering Connection, Markdown Link, and Embedded Page, which write `[[]]`, `''`, and `![[]]`; `writePlain(view, '')` deletes the selection. `targetTitle` returns `''` for a fragment-only target (`links.ts:98`), `pasteAsMenu.ts:45` tests `!== null`, and `embeddableTitle('')` is true (`connections.ts:103-104`) (A-16).
- **Heading Copies Don't Round-Trip:** **Probed:** `pasteAsRows('[[T#H]]')` → `[]` (`wholeWikiLink` refuses a heading, `pasteAsMenu.ts:32`), while Copy Link from the page menu or the heading grip writes `[[T#H]]`. `pasteAsTarget('[x](example.com)')` → page `example.com` (A-17).
- **Paste As Drops a Copied Link's Alias and Heading** (F-042; A-13, A-14).
- **A Pasted Link Nests Inside a Link:** **Probed:** every link but a bare address takes the raw insert, so `[[P2]]` into `[[P1]]`'s title writes `[[P[[P2]]1]]`, one `wikiLink` over `[[P[[P2]]` with `1]]` loose; `[y](P2)` into `[[P1|x]]`'s alias writes `[[P1|x[y](P2)]]`, which tokenizes as a markdown link labeled `[P1|x[y` and loses the connection (E-19).
- **A Pasted Address Destroys a Connection:** **Probed:** with the caret in `[[Foo|]]` and `https://a.co` on the clipboard, `literalAt` sees no destination, so `decidePaste` writes `[a.co](https://a.co)`, and `[[Foo|[a.co](https://a.co)]]` tokenizes as one markdown link over `[[Foo|[a.co](https://a.co)` (`LINK_LABEL` admits `[`, `links.ts:8`). The same holds in the title and heading slots and in a markdown label; with `Foo` selected in `[[Foo]]`, the wrap axis writes `[[[Foo](https://a.co)]]`. The typing guard stands down inside a wikilink (`isInsideWikilink` in `isLiteralAt`, `edits.ts:642`); `literalAt` doesn't (E-20, A-59).
- **A Pasted Address Splices Into a Closed Destination:** **Probed:** in `[x](Page)` or `[x](https://b.co)`, `literalAt` holds (`linkDestinationStart` → 4), so the address inserts at the caret inside the old one instead of replacing it (E-21).
- **Paste As Inside a Link Nests:** `pasteAs` writes literal only where `literalAt` holds (`pasteLink.ts:92`), so Paste As ▸ Connection in `[[Foo]]`'s title nests `[[…]]` (E-22).
- **The Picker's Remove Title Rule Covers Only Connections** (*§3.12*).
- **Paste As Writes Schemeless Addresses Raw** where every other writer normalizes (A-30).
- **Rectangle ⌘V and Dropped Addresses Stay Raw** where a plain paste formats (A-57, A-60).

##### Design

**One Reader:** Paste, Paste As's rows, and the Link value commit will classify through `readLinkText` (*§3.1*), which fixes the empty page target, heading round-trips, and F-042's alias and heading loss, and normalizes addresses. After the cleanup, `[[T#H]]` (Copy Link's own output) will offer Connection and Markdown Link, and `[x](#H)` will offer nothing broken (*Continuation §5.8*). Main's rows will use its resolver-free arm. `pasteAsTarget`, `wholeWikiLink`, and `PasteAsTarget` go.

**One Pipeline (S3-2):**
- `pasteAsWrite(target, how)` in `Actions/pasteAsMenu.ts`, with `how: PasteAsForm | 'auto' | 'inverse'` (a union and a switch), will absorb `decidePaste`'s wrap and inverse axes; `pasteDecision.ts` goes. `pasteAsMenu.ts` stays pure and main-importable, so Desktop keeps building rows.
- `linkFor` and the bodies of `pasteAs` and `keydown` will collapse into one `paste(view, text, how): boolean`, called synchronously by the `paste` event (which must claim the event on the decision alone, or the original text pastes alongside the link) and after the IPC read by the chord and the menu.
- One `writeLinkAt(view, from, to, link, userEvent)` in `pendingTitle.ts` beside `awaitTitle` will be the one announce writer, serving paste, retarget, and the link-edit applier (*§3.8*, M10-06). `LinkActionText`, `formatted()`, and `linkFormat.ts` go.
- One `isWebAddress` in `urlPath.ts` will replace the `WEB_ADDRESS && isValidLink` copies; `pastedUrl` keeps its scheme rule on top of it, and `ImagePicker`/`adoptFile` stay off it (*§Traps*). `openWebLink`'s gate is *§3.13*'s and `dwellTarget`'s *§3.7*'s.
- **Plain Text Stays:** Paste As ▸ Plain Text and Paste Without Formatting will share the pipeline as distinct literal forms (*Continuation §5.8*). One word for leave-as-typed ("plain" or "literal") across the paste code is a **Planner** call, disclosed at the checkpoint (*Continuation §12*, Q4); it's an implementation name, not a product label.
- **Parity:** Pasting a link over several selected MarkdownPM table cells, and dropping an address into a page, will format as a plain paste does, through the pipeline (*Continuation §5.8*): rectangle ⌘V will route a single-line non-table text through `pasteAsWrite(…, 'auto')` with settings and the title cache read from `host`, and a drop handler will route an address through the same decision.
- **Resting Table Cells:** The resting cell's Paste and Paste As rows will run through this pipeline rather than restating `pasteAs`'s ordering, so the pipeline lands first (*§3.9*, *Continuation §10*).

**One Retarget (E-23, Q-26):** A pure `retarget` will live in `Core/Connections/linkValue.ts` beside `LinkTarget`, `LinkPaste`, and the already type-imported `LinkDisplay`, with no import-direction break:

```ts
retarget(container: { syntax: 'wiki' | 'markdown'; title?: string }, next: LinkTarget,
         keepTitle: boolean, format?: LinkDisplay, cached?: string): LinkPaste
```

- It will take targets already classified by `readLinkText`, adding no classifier. `keepTitle` is Remove Title On Link Change off.
- **Shown Text:** `next.alias ?? (keepTitle ? container.title : undefined)`. Re-typing the same target will keep the alias whatever the setting (9b's same-target keep), which needs the container's own target compared with `next`; the `container` shape above carries only its syntax and title, so it gains the target.
- **Arms:** a page into wiki → `connectionText(next.title, title, next.heading)`; a page into markdown → `markdownPageLink(title, heading, label)` (*§3.2*); a weblink into either → `serializeLink(url, title)` when a title exists, else `linkPaste(url, format, cached)`, or the bare `serializeLink(url)` when no `format` is passed (Link values). A wiki container can't hold an address, so a weblink pasted into `[[…]]` becomes `[…](url)`.
- **Callers:** paste inside a link (below), the picker's link form (*§3.12*), and a Link value's Edit Title / Edit Link commit, which passes the next target's kind as the syntax and no format (*§3.10*). The rename cascade isn't a retarget and won't call it.
- `LinkPaste.target` holding a title for a page retarget is cosmetic: `writeLink` reads `target` only when `wantsTitle`, which a page retarget never sets. *§3.18*'s `target` → `url` rename removes the oddity.
- The rule table and the carve-out (the `keepTitle` argument at one call site) are *Continuation §5.8*'s.

**Paste Inside a Link (E-25):** `paste(view, text, how)` will decide in this order:
1. A read-only view declines.
2. Code pastes literally (`inCodeAt` before the line read, which misses fences).
3. A selection strictly inside one link token (`range[0] < sel.from` and `sel.to < range[1]`, read with `linkTokenAt` on the caret's line), with a clipboard that reads as a link, will retarget, replacing the token's range. A bare address counts only under `pastedUrl`'s scheme rule. This fixes the nesting, the destroyed connection, and the splice (E-19, E-20, E-21, A-59).
4. `literalAt`, with its destination clause whole, pastes literally.
5. The wrap or format decision.
6. Otherwise the raw insert.
- Plain text inside a link pastes as text (step 5 finds no address). Plain Text, Paste Without Formatting, and ⌘⇧V paste literally, inside a link included (*Continuation §5.8*).
- **Paste As Inside a Link** will retarget in the picked form, over the container (*Continuation §5.8*). Main knows the caret is inside a link from the existing `link`/`connection` flags, with no new channel field. **Planner:** those flags are edge-inclusive while step 3 is strict, so at the resting seat after a link ⌘V appends while Paste As would retarget; either a strict `inLink` field joins the request or the edge disagreement is accepted. Making the existing flags strict would change what the Format menu's link rows read.
- The container read will run on paste only, so it adds no keystroke or caret cost.
- Mid-line `![[P]]` and `![x](url)` will be containers through their `[[…]]`/`[…](…)` token, so the `!` survives every retarget (*§3.14*).
- **What the User Sees:** With Remove Title On Link Change on (the default), Edit Link (address selected) followed by ⌘V of a bare URL into `[Label](https://old)` will replace `Label` with the Default Link Format's text, then the site title once it resolves. This is intended (*Continuation §5.8*, M11-05). Typing a replacement keeps the label, since typing isn't the app rewriting the link (*Continuation §5.8*, X-04).
- **Rejected:** Removing `literalAt`'s closed half (and leaving only the unclosed `[x](`) sends a URL pasted into ⌘K's `[]()` or Insert ▸ Embed ▸ Website's `![]()` to the format decision, writing `[]([a.co](https://a.co))`; those seats are closed but tokenless (`markdownLinkRegex` needs both halves non-empty, `links.ts:12-13`), and `embedInsert.ts:58`'s comment names this guard. **Probed:** `[]()`, `![]()`, `[x]()`, `[](P)` → `linkDestinationStart` 3/4/4/3, no token.

##### Traps

- **Main Must Read the Clipboard and Build Paste As Rows:** `askEditorMenu` parks until Chromium's `context-menu` (`Desktop/Actions/editorMenu.ts:25-31,43-50`), and rows read `clipboard.readText()` in that turn (`:103-105`). The `clipboard:read` channel stays for ⌘⇧V (`pasteLink.ts:128`), Paste Without Formatting (`:88`), and rectangle ⌘V (`MarkdownTable.tsx:245`) (A-117).
- **Every Paste Write Keeps `input.paste`:** `CellEditor.tsx:154-163`, `tableGuard.ts:26-28`, and `pasteMargin` (`decorations.ts:753-759`) key on it; `writeLinkAt` takes `userEvent` from its caller, because Format ▸ isn't a paste. `CellEditor`'s payload filter passes a pasted link through (`decodePayload` needs `|`-bounded lines, `Engine/Tables/clipboard.ts:21-27`) (A-119).
- **Async and Read-Only Re-Checks Survive the Merge:** `isConnected` and `readOnly` at `pasteLink.ts:19,90,126,130`, the null `clipboardData` path at `:114`, and `writeLine`'s `embedSeatAt` re-check at `:67` (A-120).
- **Keep the Strict Paste Test:** Unify only the spelling. `pastedUrl`'s scheme rule keeps `3.14` or `App.tsx` from formatting, or from retargeting a link it's pasted into (E-36); `ImagePicker`/`adoptFile` stay off the composite, because `isValidLink` needs a dotted host (`urlPath.ts:32`) (A-121).
- **The Container Test Is Strict:** `linkTokenAt` is inclusive at both edges (`tokens.ts:339-341`), and `range[1]` is the resting seat a finished link leaves the caret on (`tokens.ts:346,358`); an inclusive test would retarget `[[P]]` when the user pastes `[[Q]]` right after it.
- **Retarget Into an Embed Changes the Construct:** A URL pasted into mid-line `![[P]]` writes `![x](url)`, which tiles on leaving the line if the line is alone; a page pasted into a webpage tile's seated address writes `![t](P)`, which un-forms the tile into `!` plus a connection (E-34).
- **Cell Writes Escape `|`:** A live cell escapes `[[P|a]]` on commit through `cellToSource` → `escapeCell` (`Engine/Tables/codec.ts:12`). The exposure is a retarget carrying `wantsTitle` at rest, whose title write lands in the page source (B-176, *§3.9*).
- **`pendingTitle`'s Exact-Text Match** (`pendingTitle.ts:33`) survives (B-157).
- **`pasteAsWrite`'s Null Arms Are Mostly Type-Forced** (`pasteAsMenu.ts:105-106,116,120`) (A-122).

##### Would Go False

- `MarkdownPM.md:33`: "Inside a code span, a fence, or another link's `( )`, the address lands as the literal text" goes false: inside a tokenized link the address retargets it. "Pasted anywhere in the editor" is false today for rectangle ⌘V and a drop, and becomes true.
- `MarkdownPM.md:107`: "a copied connection or markdown link offers Connection, Markdown Link, and Embedded Page" is false today for a headed connection, which offers nothing; it will offer Connection and Markdown Link.
- `ConfigurationPM.md:100`: "Pointing a connection at another page drops the alias it was wearing" widens to every link syntax and every retarget: paste, the picker, and a Link value's Edit Title / Edit Link. The setting's hint (`Settings/frames.ts:532`) says the same.
- **Tests:** `pasteDecision.test.ts` (whole file); `pasteLink.test.tsx:212` and any `pasteLink` case pinning an address inserted inside a destination (E-21) or a link nested inside a link.

---

#### 3.12 The Picker

##### Current Shape

- **Three Mounts:** `MarkdownEditor.tsx:298`, `Tables/CellEditor.tsx:288`, `Properties/Pickers/TextPane.tsx:180`.
- **The Openers Disagree:** `autoPair` returns null with Pair Brackets off (`edits.ts:353`). `[[` needs a closed link (`linkAt`; `pageLinkPattern` requires `]]`, `connections.ts:8`), and `[label](` needs a closing `)` (`markdownDestinationAt` through `emptyTolerantLinkRegex`, `links.ts:16-17,46-56`). Only the `![[` loop feeds the picker unclosed input (`autocomplete.ts:119-134`). `[[]]` is refused because `linkSpans` rejects an empty page with no heading (`connections.ts:30`), so with Pair Brackets on, `[[` opens on the first title character rather than on the brackets (A-38, B-69).
- **Three Partial Unclosed Readers, None Feeding `[[` or `[label](`:** the `![[` loop (spans, committing to line end or the closer, `autocomplete.ts:120-133`); `linkDestinationStart`'s fallback (`links.ts:62-64`, `head.lastIndexOf('](')` with no `)` after, read by `headingHash`, `inUrlRun`, and `literalAt`); and `isInsideWikilink` (unclosed `[[` depth with no spans, `edits.ts:612-627`, one caller at `:642`) (A-112).
- **The Embed Form:** `form: 'embed'`, `allowEmbeds`, and `formSyntax`'s embed arm (`autocomplete.ts:19,47,207-208`) serve the `![[` loop; `allowEmbeds` is the hook's only read of its `scope` (`useConnectionAutocomplete.ts:44,67`). The pool drops already-tiled pages, the host chain, and titles the embed grammar can't express (`useConnectionAutocomplete.ts:134-140`). Insert ▸ Embed ▸ Internal Page writes `![[]]` (`Embeds/embedInsert.ts:55`), which only the loop opens, on the alphabetical browse (`pageIndex.ts:43`); the `link` form refuses an empty query (`useConnectionAutocomplete.ts:146`) (E-31).
- **The Embed-Pairing Comment Is False:** `autocomplete.ts:119` says `[` doesn't auto-pair after `!`; with Pair Brackets on, the first `[` after `!` is refused (`edits.ts:374`) and the second takes the doubled-marker branch (`:357-369`), writing `![[|]]` (A-71).
- **Retarget Is Two Rules:** The `link` form replaces the whole `[[…]]` (`autocomplete.ts:77`); `commit` re-parses the worn alias with a fresh `pageLinkPattern().exec` (`useConnectionAutocomplete.ts:165-169`), passes `keepAlias: settings.removeTitleOnLinkChange ? undefined : worn` (`:178`), and `formSyntax` hand-spells `[[v|a]]` (`autocomplete.ts:210`, F-035); the heading is dropped. The `target` and `fragment` forms replace only the destination span (`:270-278`); the label always survives whatever the setting says, and an empty label is filled with the title (`:272-273`). The setting governs connections and not markdown links (E-16).
- **Heading Lists Come From Two Sources:** the picker reads `warmBody`/`fetchBody` → `headingOutline` (`headingTarget.ts:20-27`, `editorHost.tsx:139-143`); the missing-heading mark reads `conn.headingsOf` → `s.headings[path]` (`pageConnections.ts:31`, `decorations.ts:459`), fed by the index, which stores normalized keys only (`indexSeed.ts:73`) (A-41).
- **The Heading Tree Is Derived Twice:** `openHeadingRows` (`autocomplete.ts:159-171`) and the pane's `nested()` over fake `OutlineHeading`s `{ from: 0, key, text, level }` (`AutocompletePane.tsx:184`), while the hook holds real outlines (`useConnectionAutocomplete.ts:103`) (A-42).
- **State Lives in React:** the `ac` state, the `armed` ref (never mapped through changes: `sectionArmAfter` returns positions without `mapPos`, `:251-273`), `measured`, `sameQuery`, and `formRef` with its effect (`useConnectionAutocomplete.ts:46-83,242-248`). Its sibling `blockQuery` is a `StateField` (`Menus/blockQuery.ts:32-54`), and `useBlockMenu` compares field identity (`useBlockMenu.ts:21-30`) (A-65).
- **Arming:** A typed `§` arms the heading list; `##` → `§` doesn't, because `sectionArmAfter` needs `input.type` (`:255`) and `sectionSign` applies through `applyEdit` with userEvent `'input'` (`markdownInput.ts:56,262`, `applyEdit.ts:26`). `sectionArmAfter`'s `inBracket` check (`:268`) repeats `autocompleteQuery`'s (`autocomplete.ts:61`); its code check doesn't, since the query checks the caret and the arm checks the `§` (A-43, A-66).
- **Self-Machinery:** the commit's alias re-parse; `connectionInsert` (`autocomplete.ts:214-222`, sole production caller `commitEdit` at `:263`); `cameFrom` (a ref written during render, `AutocompletePane.tsx:81-87,90`) beside `viaChevron` state (`useConnectionAutocomplete.ts:85,182`); the `fetched` reset in an effect (`:107-115`), where a stale frame is possible (**Inferred**); `AcQuery` (`autocomplete.ts:30`), dead; and seven optional pane props with defaults plus `NONE` (`AutocompletePane.tsx:35-45,63-69`), while production always spreads the full `ac.pane` (`useConnectionAutocomplete.ts:224-238`) (A-67, A-82).
- **Other Odd-Ones-Out:** alias rows carry a closure (`autocomplete.ts:35,192`); `headingRows` applies `expressibleHeading` to the `fragment` form too (`:151`) (A-70).

##### Defects

- **The Opener Ruling Isn't Implemented:** With Pair Brackets off, `[[Foo` and `[label](foo` open no picker (*Continuation §5.9*).
- **`##` → `§` Doesn't Open the Heading List** (*Continuation §5.9*).
- **Remove Title On Link Change Skips Markdown Links:** A picker retarget of `[Notes](Old)`'s destination keeps `Notes` with the setting on (*Continuation §5.8*).
- **The Alias List Slides When the Caret Walks Into a Typed `|`,** not only when the picker opened the slot (*Continuation §5.9*).
- **`armed` Drifts** when text shifts before the `§` on its line (A-65).
- **Chevron and ArrowRight Disagree on an Empty Markdown Target:** the chevron draws on every `link`/`target` page row (`AutocompletePane.tsx:83,127`); ArrowRight requires `query !== ''` for `target` (`useConnectionAutocomplete.ts:203`), though `lookup('')` lists pages for `target` (`:146`) (A-68).
- **`openAlias` and `aliasRows` Key the Page Differently:** `openAlias` uses `target?.pageId` (`useConnectionAutocomplete.ts:170-176`); `aliasRows` needs a title and returns `[]` for `''` (`autocomplete.ts:179`), so for `[[#H` in a held Text-value pane the pipe opens over an empty list (**Inferred**, A-69).

##### Design

**One Opener Rule (S7-D):** One `openLinkAt(line, rel): { opener: '[[' | '](', start, closed: boolean } | null` in `Core/Connections/connections.ts` will read back from the caret to an opener with no closer between, delegate `](` to `linkDestinationStart` (`links.ts:59`), note whether a closer follows, and end the query at the caret.
- `![[` is `!` plus `[[` (*Continuation §5.9*), so the opener set has two members.
- `isInsideWikilink` goes; its caller will test `openLinkAt(…) !== null`.
- The `![[` loop goes, and one opener branch will serve both openers unclosed or empty; the `[[]]` refusal becomes an empty-query open. The closed `link`, `heading`, and `alias` arms stay for the slots, read through `connectionAt` (*§3.3*).
- **Behavior:** `[[` and `[label](` will open the picker whether or not Pair Brackets is on; with it on, `[[` will open on the brackets. Enter or a pick will complete the link, write `]]` or `)` when absent, and place the caret outside the syntax, as Enter already does for a closed link; dismissing will leave the typed text (*Continuation §5.9*). `autoPair` is unchanged.
- **Code:** `openLinkAt` stays code-blind in `Connections`, so its callers keep a caret-position `inCodeAt`, since an unclosed opener is no token (gate 3, *§3.4*). Raw-HTML stand-down follows *Continuation §5.2*.
- **Order:** The opener rule lands in or before the phase that deletes the `![[` loop, because the empty opener has to take over the alphabetical browse Insert ▸ Embed ▸ Internal Page's `![[]]` relies on (E-31, *Continuation §10*).
- **The Embed Form Goes (E-13):** A closed `![[P]]` will be the `link` form starting at `[[`, so its `!` survives the commit, with `autocompleteQuery`'s closed-link branch reading `connectionAt` (built in the prototype, which also moves `embeddable` into `Embeds/embedWidget.tsx` beside `embedExclusions`). `form: 'embed'`, `allowEmbeds`, `formSyntax`'s embed arm, the hook's `scope` read, and the pool filter go; the prototype leaves all of them, and the `![[` loop, in place. Picking an already-tiled page on a lone line will write a duplicate, which draws as a working connection (*§3.14*), and picker embeds will work in cells and Text values as connections. `embeddable`'s remaining reader will then be `embedPickTree` (`gripMenu.ts:29`), which can inline `embeddableTitle(n.pick) && !exclude.has(normalizeTitle(n.pick))`.

**The Query as a `StateField` (S4-B):** One `acQuery` field `{ q, armed }` will arm on a typed `§` and on `sectionSign`'s `##` → `§` conversion, map `armed` with `tr.changes.mapPos`, clear on a `closeAcQuery` effect (Escape, blur, a commit that finishes the link), and keep `q`'s identity when `sameQuery` holds. The hook will measure geometry only when the field's identity changes, as `useBlockMenu` does.
- The `armed` ref, `measured`, `formRef` and its effect, `sectionArmAfter`, and the listener body go; the arm logic moves into the field, dropping the redundant `inBracket` check and keeping the code check on the `§`.
- Unlike `blockQuery`, which nulls on selection-only transactions (`blockQuery.ts:36`), the field will re-derive on every selection transaction, the same cost as today's listener (`useConnectionAutocomplete.ts:61`).
- The field needs defining per mount (in the hook's `useState`) only while `autocompleteQuery` reads a scope (`allowEmbeds = scope === 'page'`), since no facet carries `MarkdownScope` (`Facet.define` sites: `embedWidget.tsx:46`, `Tables/widget.tsx:56`, `api.ts:44,206`). The embed form's removal deletes that read (`useConnectionAutocomplete.ts:67`), so whether the field stays per mount is open (**Planner**).
- **Rejected:** Folding `linkTyping` into the field couples the draw's color rule to the picker.

**Commit Cleanup (S4-C):**
- **Link Form:** The link-form query will carry the worn alias, and the commit will write through `retarget` (*§3.11*), so the `pageLinkPattern().exec` re-parse and its import go and `formSyntax`'s `link` arm will read `connectionText` (F-035).
- **Target Form:** The `target` arm keeps its span edit (with `#`-slot opening and anchor math), and its `fill` (`autocomplete.ts:272`) will also fire when Remove Title On Link Change is on, with the setting threaded through `commitEdit`'s options; because an empty label isn't a token (`links.ts:15`), "remove" means "fill with the new title". With the default on, picking a new page in `[Notes](Old)`'s destination will write `[New](New)`, while re-picking `Old` keeps `Notes` under the same-target rule (*§3.11*). The `fragment` arm keeps its label, as the wikilink `heading` form does. These arms don't call `retarget`: they write a half-open `#` and anchor the caret at `caret + label.length + 1` (`autocomplete.ts:270-278`), which a whole-text `LinkPaste` can't express, so they keep `commitEdit`'s span edit and take the setting through its options (E-23, E-26).
- `connectionInsert` will be inlined into `commitEdit`.
- One `behind: AcRow[] | null` will replace `viaChevron` and `cameFrom`, so the alias list slides in only when the picker opened that slot (*Continuation §5.9*).
- The hook will build the heading tree once, and `openHeadingRows` and the fake-outline reshape go.
- **Heading Rows From the Index:** The picker's heading list and the missing-heading mark will both read `conn.headingsOf` (*Continuation §5.9*). The index holds normalized heading keys only (`indexSeed.ts:73`), so the ruling needs it extended to carry each heading's raw text and level; that extension has no design yet, and its shape and home are open (**Planner**). With it, `headingTarget.ts`, `warmBody`/`fetchBody` on the seam (`api.ts`, `editorHost.tsx`, the harness), and the `fetched` state and effect go, and a heading typed in another page moments ago won't be offered, which the ruling accepts. F-041's `warmBody` → `knownBody` fix applies only if `headingTarget.ts` stays.
- Required pane props replace the optional ones, and `NONE` and `AcQuery` (F-069) go.
- **Small Fixes:** ArrowRight and the chevron will share one rule on an empty markdown target, either ArrowRight following the chevron or the chevron hiding (**Planner**); `aliasRows` will key on `pageId` (A-68, A-69).
- **Rejected:** Replacing `leaveSlot`'s `setTimeout` with a `transactionFilter`: no mechanism shows a filter can append the collapse without altering undo grouping, and the blur path still needs its handler (A-84).

##### Traps

- **Copying the Embed Branch for `[[` Swallows the Line:** `autocomplete.ts:123-125` runs an unclosed query to `line.length` (B-177).
- **The Opener Rule Can't Stop `[[` Pairing:** `autoPair`'s doubled-marker branch (`edits.ts:356-362`) still pairs it (B-178).
- **What Earns Itself:** `backedTo`, `authored`/`typedInto`, `aliasEpoch`, and `sameQuery`; alias memory has one writer and one forgetter. Tokens carry no slots (built in the prototype), so the closed slots come from `connectionAt` (A-140).
- **A Raw `![[]]`:** Once the embed token goes, an inserted `![[]]` shows raw while its picker is open, as `[[]]` does (M11-02).
- **Embed Commits Gain the Alias Slot:** Riding the `link` form, a picker commit writes `![[P|]]` for a page with remembered aliases when **Alias Picker On Commit** is on (the default, `personalization.ts:154`; `autocomplete.ts:246-252`); `leaveSlot` collapses the empty pipe (M11-04).
- **A Typed Heading Can Be Dropped:** an embed commit that replaces the whole span drops a typed `#heading` today (**Inferred**, A-40). Under the opener rule the unclosed query ends at the caret, so a pick in `[[Page#H` or an unclosed `![[Page#H` must keep or deliberately refuse `#H`.
- **The Own Page's Headings Stay Live:** `[[#` reads the open page's live outline (`docOutline`, `useConnectionAutocomplete.ts:101`), and an open page's warm body is what offers "a heading typed moments ago" (`headingTarget.ts:9`). The ruling's "unreachable in practice" is about a heading typed in another page; reading the own page from the index too would drop a heading just typed on the same page. If the index extension doesn't land, a heading source keyed by `pageId` closes the `fetched` stale frame (A-82).

##### Would Go False

- `ConnectionsPM.md:55`: "Inside `[[ ]]` … an empty query lists nothing" goes false if the empty opener gives `[[` the alphabetical browse `![[]]` needs (**Inferred**: no source states what an empty `[[` lists).
- `ConnectionsPM.md:57`: "Inside `![[ ]]` — the same pool, minus pages already embedded, the host chain, and titles the embed grammar can't express. Page-body editors only." goes false.
- `MarkdownPM.md:70`: "the `![[` autocomplete, which offers only pages the syntax can express" goes false.
- `Guidelines/Editor-Internals.md:25`: the embed claim's readers lose "the autocomplete pool" (*§3.14* owns the rest of the sentence).
- **Tests:** `autocomplete.test.ts:25-26` (`[[]]` suppressed), `:389` (the arm-time `inBracket`), `:92` and `:120` (the `'embed'` form and `connectionInsert(…, 'embed')`); `edits.test.ts:873-…` (`describe('isInsideWikilink')`, imported at `:5`); `aliasPicker.test.tsx:97,193` (optional pane props); the `connectionCommit.test.tsx` and `autocomplete.test.ts` cases on `connectionInsert`, which re-point at `commitEdit`.

---

#### 3.13 Opening and Titles

##### Current Shape

- **The Address Adjudicator:** `openWebLink` (`Core/Web/openWebLink.ts:7-10`) sends an address to the in-app browser (`openBrowser`) when **Open Links In Pommora** is on and to the system (`link:open`) otherwise. The menu's Preview and Open In Browser rows (`connectionMenuActions.ts:35-36`) and `WebWindow.tsx:85` call their arm directly, which is the point of an explicit pick. `Core/Web/` holds a host file (`handlers.ts`) beside window files (`openWebLink.ts`, `WebGuest.tsx`), an F-090 instance. (B-01, B-02, B-156)
- **The In-App Arm Takes Raw Addresses:** `resolveMdTarget('example.com')` returns `{ kind: 'external', url: 'example.com' }`, and `mailto:a@b.co` is external too (**Probed**). `openWebLink.ts:9` passes the address raw to `openBrowser` (`windowSlice.ts:247`) and on to `WebGuest src={url}` (`WebWindow.tsx:94`), while the attach gate refuses anything without a written `http(s)://` (`webGuests.ts:18,150-157`). The system arm normalizes (`Web/handlers.ts:41`); the menu's Preview row makes the same raw call (`connectionMenuActions.ts:35`). (B-54)
- **The Page-Open Bundle:** `pageConnections.ts` builds `ConnectionsApi` in `preview`, `window`, and `inert` modes: `open` (`:37-40`) goes to a window tab in window mode and to `select` otherwise; `bypass` (`:41-42`) always calls `select` with `newTab: true`; `menu` is `:43`; the inert bundle (`:34`) has a no-op `open` and no `bypass`. `bypass` is optional only because the inert bundle omits it, and `openPage` (`connectionsApi.ts:150-158`) exists to fall back from `bypass` to `open`. `ConnectionsApi.open` has one non-link reader, `TileHost.tsx:104` (`openRoute`, used at `:238`, `:281`). The Link value's own page-open route is in *§3.10*. (B-08, B-26, B-74)
- **`EditorHost.openLink` Is an Earned Seam:** one production value (`editorHost.tsx:138`) plus the harness default (`Core/Testing/editorHarness.ts:24,122`). `openWebLink` imports `Session/store` (`openWebLink.ts:2`), which MarkdownPM can't import. (B-75, B-161)
- **The Display-Time Title Hook Is Written Twice:** `LinkCell.tsx:33-38` and `WebTile.tsx:21-30` (`useWebpageTitle`) each subscribe to `linkTitles`, read `resolveLinkTitle`, and run the same effect over one store cache and `resolveLinkTitle`. They differ in three genuine ways: the predicate (`display === 'link-title' && !alias && isHttpLink(url)` vs `label === '' && display === 'link-title'`), the display source (the property's `link_display` vs the device's `defaultLinkFormat`, `WebTile.tsx:22`), and the subscription (WebTile's `linkTitles[url]` selector is unconditional, `:23`; LinkCell's is gated on `wantsTitle`, `:34`). (A-29, A-148, B-32, B-194)
- **Pending Titles in Live Editors:** Page Title writes the short form first and swaps the title in when it arrives. `pendingTitle.ts` holds `PendingTitle`, the `pendingTitles` field (`:20-41`), and the `sweepOnTitles` plugin (`:44-72`). An entry survives only while the text at its mapped range still matches exactly what was written (`:33`). The sweep writes `linkMarkdown` (`:59-60`) and unsubscribes on `destroy` (`:68-70`), so a fetch landing after a live cell or TextPane closes reaches nothing. (B-05, B-89, B-157)
- **Title Fetches:** `linkPaste` sets `wantsTitle` with no http gate (`linkValue.ts:142`), while `fetchPageTitle` refuses non-http addresses (`Desktop/Web/linkTitles.ts:9`). `resolveLinkTitle` returns early when the URL is in flight, has failed, or is cached (`cacheSlice.ts:24`); a failed fetch lands in `failedTitles` and never sets a title (`:31-32`). `sweepOnTitles` skips an entry whose title is `null` (`pendingTitle.ts:57`), and the store never changes for a failure, so the entry waits until its text is edited. This holds for every failed fetch, not only non-http ones. (A-61, A-156)

##### Defects

- **The In-App Browser Opens Unnormalized or Non-Web Addresses:** with Open Links In Pommora on, `[x](example.com)` and `[m](mailto:a@b.co)` in a page, and an invalid Link value's text (`foo`, `[x](Some%20Page)`), reach `openBrowser` raw. **Inferred:** a blank in-app window for each. **Live Check:** with the setting on, open `[x](example.com)`, a `mailto:` link, and an invalid Link value; expect an in-app window on `https://example.com`, `mailto:` going to the system, and the invalid value editing. (B-54, A-27)
- **Failed Title Fetches Strand a Pending Entry** until the text is edited, and Page Title is offered for addresses that can't fetch one. (A-61)
- **Page Title at Rest Leaves the Short Form (F-043):** a resting MarkdownPM table cell has no editor to hold a swap, so Format ▸ Page Title at rest writes the bare domain and nothing replaces it. (R-10)
- **A Pending Swap Dies With Its Editor (B-158):** a live cell or TextPane closing with a swap pending drops it (`pendingTitle.ts:68-70`). F-043 and B-158 are one defect. (R-10)
- **Link Values Ignore Tab Open Behavior and Open Connections In Preview** (*§3.10*). (B-52)

##### Design

- **One Page-Open Route (S5-A):** `ConnectionsApi.open(page, heading?, newTab?)` replaces `open`, `bypass`, and `openPage`. `pageConnections.ts` will open a window tab when `inWindow && !newTab` and otherwise call `select(ref, { newTab: newTab || undefined, heading })`, so "no option means the tab preference decides" (`useViewInteractions.tsx:369`) is unchanged; `resolveFollow` will call `api.open(named.page, named.heading, isCmd(event))`. `openRoute` (`TileHost.tsx:104`) will keep working through the optional parameter. With *§3.10*'s routing, a Link value's page honors Open Connections In Preview, ⌘-click, and Tab Open Behavior as a body connection does (*Continuation §5.7*). An ambiguous value still opens nothing. (B-106)
- **`openWebLink` Normalizes and Gates (S5-D1):** the in-app arm will take only `isHttpLink` addresses and pass them through `normalizeLinkUrl`; everything else goes to `link:open` (*Continuation §5.10*). Normalizing inside `openBrowser` (`windowSlice.ts:247`) also covers the Preview row's direct call. An invalid Link value stops reaching `openBrowser` through *§3.10*'s click rule and *§3.5*'s `valueTarget`: an invalid target follows nothing, and its padding click edits. The Preview row will hide for a non-web address; the pure menu model receives no URL today (`connectionMenu.ts:11-19,92`), so the fact has to reach the row filter through *§3.8*'s builder. `dwellTarget` reading `isHttpLink` is *§3.7*'s. (B-110)
- **One Title Hook:** one `useLinkTitle(url, wants)` replaces LinkCell's and WebTile's copies; each caller keeps computing its own `wants` and display source, which covers all three differences. LinkCell's address half will keep it under *§3.10*'s routing (a bare or external value keeps the URL half). **Planner:** its home, `Session/` beside `useConnections` (`pageConnections.ts:54`) or `Core/Web/`. `Core/Session/cacheSlice.ts` imports no React, so a hook there would be the file's odd one out. (S2-C, A-104, B-111)
- **Web-Only Titles:** `wantsTitle` and the Page Title row will be gated on `isHttpLink`, so a non-web address is never offered Page Title (*Continuation §5.10*). (A-61)
- **A Failed Fetch Settles:** the sweep will settle an entry whose fetch failed, leaving the short form in place (*Continuation §5.10*). (A-61)
- **The Title Fallback (Rest Wait and Close-Forward):** one fallback will serve every surface that can't hold a swap (*Continuation §5.10*). `resolveLinkTitle` becomes promise-returning, which needs a promise map for in-flight dedupe and resolved arms for its cached and failed early returns (`cacheSlice.ts:24`). A resting MarkdownPM table cell will await the title and then commit once under *§3.9*'s whole-text guard. A live cell or TextPane closing with an entry still pending will forward it to the same wait. Live editors keep the pending swap unchanged. At rest, Page Title will update once when the title arrives; in a live editor, it will still write the short form and then swap. This fixes F-043 and B-158 as one mechanism. **Rejected:** a page-level swap for resting cells (T-A) would be a second mechanism beside the live swap, needing source-form entry text and a minimal-diff commit, and it can't map a title on a ragged row. M10-04's identical-text no-op belongs to *§3.9*'s commit. **Live Check (F-043):** at rest, Format ▸ Page Title writes the title once it arrives. **Live Check (B-158):** a pending title survives a live cell closing. (R-10, R-12, Q-21, Q-22)

##### Traps

- The explicit browser picks call their arm directly by design (`connectionMenuActions.ts:35-36`, `WebWindow.tsx:85`). (B-156)
- `EditorHost.openLink` can't be replaced by importing `openWebLink` (`openWebLink.ts:2` imports `Session/store`). (B-161)
- Pending-title matching is exact-text (`pendingTitle.ts:33`); the swap and any forwarded wait must keep it. (B-157, R-24)
- A title holding `|` written into a MarkdownPM table cell goes through `cellToSource`, or the row splits (`links.ts:19-21`, `sync.ts:21`). This applies to the rest wait's commit and to any forwarded entry that lands in a cell. (R-11, B-176)
- `inert`'s no-op `open` and `glance.contains` (*§3.7*). (B-155)

##### Would Go False

- `WebviewPM.md:20` ("decides where every external link opens") is false today: the menu's Preview and Open In Browser rows and `WebWindow.tsx:85` call their arm directly by design, so the sentence needs correcting in the docs pass. (B-150)
- `ConnectionsPM.md:34`'s routing sentence is false today for Link values and becomes true with the one page-open route and *§3.10*.
- Tests: `Core/Session/pageConnections.test.tsx:57` (`.bypass?.(page, 'Setup')`). (B-130)

---

#### 3.14 Embeds

##### Current Shape

- **The Embed Grammar Has Several Readers:** `pageEmbedPattern` (`connections.ts:3-4`) feeds the tokenizer's embed spec (`tokens.ts:275-280`), the index's embed loop (`scan.ts:92-98`), and both rename passes (`rewrite.ts:42-48,87-93`); `pageLinkPattern`'s `(?<!!)` (`connections.ts:8`) keeps the wikilink pass off `![[`. The lone-line reader is `loneEmbedRe` (`Engine/detect.ts:400`), read through `loneEmbedTitle` (`:402-404`) and `blockEmbedLines` (`:426-431`). The picker opens `![[` with its own hand loop (`autocomplete.ts:119-134`), and `headingHash`'s `titleSpanAt` refuses `§`→`#` after `![[` (`headingHash.ts:10`, comment `:14`). (A-11, E-07, M11-01)
- **`![[…]]` Is an Inert Token:** the tokenizer's `'embed'` kind (`tokens.ts:25`, pushed at `:313`, threaded through five overlap filters at `:282,288,290,298,309`) is styled `md-embed` (`intents.ts:126`) with hidden markers. `linkTokenAt` accepts only `link` and `wikiLink` (`tokens.ts:339`), so an embed token has no follow, glance, or menu; the resting cell draws it as an inert `<span class="md-embed">` (`cellStatic.tsx:163-173`). `![[P|a]]` reads as one embed titled `P|a`, and `linksIn` records the dead key `p|a`. (E-06)
- **`![x](url)` Is Already `!` Plus a Weblink:** `markdownLinkRegex` (`links.ts:12-13`) has no `!` guard, so a webpage embed tokenizes as a `link` over `[x](url)` with a literal `!` and draws, follows, glances, and opens its menu as a weblink everywhere but a tiled line (**Probed**). (E-05)
- **The Claim Pipeline:** a line tiles when it is (1) lone and unindented (`loneEmbedRe`, through `loneLines`, `detect.ts:206-219`, trailing whitespace allowed); (2) outside a fence, table, or block math (`docScan.ts:69-74,85`; raw-HTML blocks aren't excluded, so a lone embed inside one tiles); (3) under a `ConnectionsApi` (`embedWidget.tsx:398,404`); (4) its raw bracket text resolves to exactly one page (`embedClaims.ts:18`); (5) the first line naming that title (`embedClaims.ts:19-21`). A claimed page already in `host.ancestors` forms as the `mdpm-embed-cycle md-embed` text stub (`embedWidget.tsx:203-207,433`), and a page passes its own path as its first ancestor (`PageView.tsx:107`), so a lone self-embed is a stub. `interactive = host.ancestors.length <= 1` (`:400`) locks a nested tile without deciding the claim. (E-01)
- **`embeddable` Isn't the Claim's Gate:** `claimedEmbeds` never calls `embeddableTitle`. `embeddable()` (`embedClaims.ts:6-8`) is read only by the picker's pool filter (`useConnectionAutocomplete.ts:139`) and the grip's Source ▸ tree (`gripMenu.ts:29`). The claim's only semantic gate is the resolve over the raw text, so a lone `![[P#H]]` or `![[P|a]]` resolves as phantom and never tiles, while the token draws `P` with `#H]]` hidden in the closer. The rename cascade writes exactly that headed form (`rewrite.ts:47,92`). (E-02, E-03)
- **The Claim Is Computed Twice, Once on Every Caret Move:** `build` runs `claimedEmbeds(scan.embeds, t => conn.resolve(t).status)` over every embed line in the document (`decorations.ts:473-483`) on every build, which reruns on `selectionSet` (`:842`): the one document-scale per-caret-move cost in the link code, against the editor's hard rule. `buildTiles` runs it again and resolves each claimed title a second time (`embedWidget.tsx:404-411`). The suppression runs in every scope while the tile field mounts only in `MarkdownEditor` (`MarkdownEditor.tsx:155,164-168`), which is F-054's cause. (B-33, E-01)
- **The Index:** `indexSeed.ts:61-62` records `'embed'` vs `'body'`; the graph query excludes `'embed'` (`Desktop/Store/stores.ts:137`), and backlinks include both (`:102,109`). `linksIn('![[]]')` records a self-relation and `![[#H]]` an `embed` heading relation on the own page (`scan.ts:95`). (E-12, M11-03)
- **Webpage Embeds:** `loneWebpageEmbed` (`detect.ts:406-417`) requires a written scheme (`:414`); `webpageEmbedUrlSpan` (`:419-423`) re-runs the regex its guard ran. Their writers are *§3.2*'s. (B-40, A-81)
- **Files:** `embedWidget.tsx` (`buildTiles` claim `:403-411`, `embedField` `:511`, `redrawNudge` `:526`, `embedTileRanges` `:647`), `embedClaims.ts`, and `embedInsert.ts` (read by `Menus/menu.ts:10` and `pasteLink.ts:11`). Asset `[[name.ext]]` values aren't the link layer. (B-11, B-15, B-162)

##### Defects

- **Per-Caret-Move Document-Scale Work** (`decorations.ts:473-483,842`). (B-33)
- **Embeds That Don't Tile Are Dead Text (F-054):** a mid-line `![[P]]`, any `![[P]]` in a table cell or Text value, and a lone embed that doesn't claim (missing, ambiguous, duplicate, headed, aliased) draws as inert grey text with no follow, glance, or menu; a lone self-embed is a grey stub. (E-04, E-06)

##### Design

After the cleanup, a tile forms only from an embed alone on its own line in a body that mounts the tile field, and every other `![[Page]]` is a literal `!` followed by the connection `[[Page]]` (*Continuation §5.3*). Everything below is built in the prototype unless marked.

- **The Lookbehind and the Embed Token Go:** `pageLinkPattern` loses `(?<!!)`, so *§3.1*'s one walk reads `[[P]]` inside `![[P]]` as an ordinary connection with the `!` outside it. `pageEmbedPattern`, the tokenizer's `'embed'` kind, spec, push, and overlap filters, `CONTENT_CLASS.embed`, and `.md-embed` go. Every token reader will then draw, follow, glance, and offer the menu on it in bodies, cells, and Text values, which is F-054's connection-look half with no added code; the audit's planned `embedAsConnection` isn't built. (E-08, E-15, X-10)
- **`loneEmbedTitle` Takes the Connection Grammar:** it becomes `^!(?:<pageLinkPattern source>)[ \t]*$` and returns the raw bracket text, empty included, so a lone `![[]]` keeps its `'embed'` block, grip, and Source ▸. `blockEmbedLines`, `blockModel`'s embed block, `embedGuard`'s lone checks, and `subfieldStats.ts:29` keep calling it, so a lone headed or aliased line will keep its block and grip (the grip re-aims a stale embed through Source ▸, `gripMenu.ts:142`). (E-09)
- **One Claim Owner, `buildTiles`:** a line will tile when its title is embeddable (no heading, no alias, `embeddableTitle`), it resolves, its page isn't already shown in the document, and the page isn't an ancestor; one resolve per line, deduplicated by page path. `embedClaims.ts` goes; `embeddable` will move beside `embedExclusions` for the grip and the picker. The cycle stub goes (`cyclic`, the widget's `title`, `.mdpm-embed-cycle`), so a self-embed or cycle will draw as `!` plus a connection. A lone headed `![[P#H]]`, a duplicate, and a self-embed become links (*Continuation §5.3*); a lone aliased `![[P|a]]` becomes a link too, a disclosed call, since a tile has nowhere to show the alias and `embedGuard.ts:65`'s present-check can't round-trip one (M11-06). (E-10, E-14)
- **`build`'s Claim Filter Goes (E-11 Option B):** `build` stops filtering tokens, removing the per-caret-move claim. A page tile drawn over its `wikiLink` token draws clean, proven in `embedSuppression.test.tsx` with the real editor and tile field: `![[Alpha]]\n\n![[Nowhere]]` gives one tile and a phantom connection, a duplicate gives one tile plus one connection, and a headed embed gives no tile. **Rejected:** Option A (filtering tokens against `embedTileRanges`) keeps a per-build filter that suppresses nothing visible, since a mark under a tile's replace is already harmless (a lone webpage line's `link` token sits under its tile today unsuppressed). **Live Check (E-11):** with a selection spanning a page tile (drag or Select All), the tile's `wikiLink` must not draw `connGlyph` inside the tile, since an active `wikiLink` emits its glyph at `range[0] + 2` (`decorations.ts:611`). (E-11, B-33)
- **The Index Will Keep `'embed'` for Lone Lines:** `linksIn` will yield `'embed'` only for a connection alone on its line behind `!` (through `loneEmbedTitle`), with `at` on the `[[`; a mid-line embed becomes an ordinary `body` relation and enters the Matrix graph, while lone embeds stay excluded (*Continuation §5.3*). The embed loop goes, since the walk already yields the connection and keeping both double-counts. `valueLinks` hits will record `'body'`, since a value never tiles. The index will record "lone in a body," not "tiled": a lone duplicate, self-embed, phantom, headed, or aliased line will still record `'embed'`, since the host has no resolver (F-114). `![[]]` will record nothing, and a mid-line `![[#H]]` becomes a same-page heading link like `[[#H]]`. **Open Edge:** a lone embed line inside a `$$` block (unregistered by `scanDoc`) would index as `'embed'`; excluding it is one more condition. (E-12, M11-03)
- **Readers That Change With It:** renames will reach embeds through the span edit (*§3.16*), so `![[Old|a]]` starts renaming; `sectionRunsIn` will exclude embed spans (*§3.15*); `headingHash`'s `!` guard goes, so an embed's title will take `#` (M11-01).
- **The Picker (Not Built):** the `'embed'` form, `allowEmbeds`, `formSyntax`'s embed arm, and the `![[` hand loop go in the picker phase (*§3.12*), with the closed `![[P]]` riding the `link` form. The pool filter (`useConnectionAutocomplete.ts:134-140`) goes, along with the hook's then-dead `scope` parameter: its purpose was keeping a picked page tile-able, and a lone duplicate or self-embed now draws as a working connection; Source ▸ keeps its own filter (`embedPickTree`), unchanged. The prototype left the picker untouched: `autocompleteQuery('![[]]', 3, true)` still returns the `'embed'` form and commits `![[Alpha]]`. (E-13, E-31)
- **Value and Clipboard Readers, Unchanged:** `WHOLE_LINK` and `parseConnectionText` readers (`linkValue.ts:31,53`, `propertyValue.ts:124`, the asset readers), and `wholeWikiLink` (`pasteAsMenu.ts:31`, whose `m[0] === s` check refuses a match at index 1), refuse every `!`-prefixed form with or without the lookbehind (**Probed**), so `readLink('![[P]]')` stays a URL. The picker's worn-alias re-parse reads from `[[` (`autocomplete.ts:77`, `useConnectionAutocomplete.ts:168`) and is unaffected. (E-08)
- **Webpage Embeds:** unchanged: `![x](url)` stays `!` plus a weblink, and a lone one still tiles. `webpageEmbedUrlSpan` re-running `loneWebpageEmbed`'s regex is removable by returning the span from `loneWebpageEmbed`; no phase owns it yet. (E-05, B-40)

##### Traps

- **The Opener Rule Comes First:** the `![[` loop can't go before *§3.12*'s opener rule lands. Insert ▸ Embed ▸ Internal Page and Pair Brackets write `![[]]`, whose `[[]]` the walk refuses and whose empty query the `link` form refuses (`useConnectionAutocomplete.ts:146`); only the loop opens the picker there today. (E-31)
- **One Tile per Page per Document:** first-per-page stays, so two editors never write one page from one document. (E-32)
- **`![[]]` Must Stay a Lone Embed:** reading the lone line through `linkSpans` would refuse the empty page (`connections.ts:30`) and take away the block, grip, and Source ▸ the moment it's inserted. (E-09)
- **`![[]]` Shows Raw:** with no embed token, an inserted `![[]]` shows raw while its picker is open, as `[[]]` does. An embed commit can open the alias slot under Alias Picker On Commit (`autocomplete.ts:246-252`); `leaveSlot` collapses the empty pipe. (M11-02, M11-04)
- **The `'embed'` Relation Feeds the Graph's Exclusion** (`stores.ts:137`); collapsing it into `'body'` changes the Matrix. (E-33)
- **The Token Under a Tile:** today `build` filters a claimed embed's token out before `drawnTokens.set` (`decorations.ts:473-484`); once that filter goes, the token under a tile will stay in `drawnTokens`. The tile is atomic, `ReactWidget` keeps CodeMirror's default `ignoreEvent`, and `linkUnder` requires `onText` (`linkClicks.ts:66`), so no pointer will reach it.
- **Webpage Tiles Need a Scheme:** `loneWebpageEmbed` requires a written scheme (`detect.ts:414`), and the attach gate refuses a schemeless `src` (`webGuests.ts:18,150-157`). (B-160)
- **Images:** `![[pic.png]]` becomes `!` plus a phantom connection `pic.png` and doesn't tile; images render nothing today (`MarkdownPM.md:206`). (E-37)
- **Word Count:** `subfieldStats.ts:29` zeroes every lone `![[…]]` line, including lone embeds that are links; it belongs to the audit's deferred counter rework (*Continuation §13*). (M11-08)

##### Would Go False

- `ConnectionsPM.md:12` ("a `!`-prefixed form standing alone on a line is not a connection") holds only for a line that tiles.
- `ConnectionsPM.md:57` ("minus pages already embedded… Page-body editors only") goes false when the pool filter goes.
- `Editor-Internals.md:25` ("The embed claim has one owner", read by "token suppression… and the autocomplete pool") is false today, since `build` and `buildTiles` each compute the claim; under the design the one-owner sentence becomes true and its reader list loses token suppression and the autocomplete pool.
- `MarkdownPM.md:68` names `embedClaims.ts`.
- `MarkdownPM.md:70`: "four ways to create one" is false today (the `/` menu is a fifth; the audit's reconcile plan rewrites it, `Pommora Codebase Audit.md:697`), and "the `![[` autocomplete, which offers only pages the syntax can express" goes false with the pool filter. (B-148)
- Tests that pin the inert embed: `embedClaims.test.ts` (deleted), `embedSuppression.test.tsx` (rewritten as the E-11 proof), `tokens.test.ts:58-61` ("image wins over wikilink" inverts), `intents.test.ts`'s `md-embed` case, `detect.test.ts`'s `![[ ]]` cases, `scan.test.ts` (mid-line `wiki`, lone `embed`, `at` on `[[`), `indexSeed.test.ts` (mid-line embed is `body`; the footnote-embed case), `headingHash.test.ts` (embed titles take `#`), and in the picker phase `autocomplete.test.ts:92,120`.

---

#### 3.15 Section Runs and Citations

##### Current Shape

- **`sectionRunsIn`** (`Core/Connections/scan.ts:24-57`) returns the bare `§Heading` runs in a text: the longest outline heading the text after `§` begins with, ending at a non-word character. It returns early unless the text holds a `§` and the outline has headings (`:29`), excludes runs in code, on a heading line, or inside a link, and finds links by re-matching `pageLinkPattern` and `markdownLinkRegex` (`:30-32`); the link comparison is end-exclusive (`:44-45`), so `[[A]]§B` yields the run `{ from: 5, to: 7 }` (**Probed**). Its `byLength` map is rebuilt per call and scales with the heading count, not the document. It has three callers: the draw (`decorations.ts:670`), the index (`scan.ts:107`), and the heading rename (`rewrite.ts:107`). A `§` inside `![[A §Intro]]` reads as a run, since embed spans aren't excluded. (B-79, B-116, E-08)
- **Drawing:** `build`'s pass (`decorations.ts:666-676`) runs in every scope, only when `inPageHeadingResolution === 'automatic'`, over the visible ranges with a mask of code and raw HTML. It's gated, not a per-keystroke violation: it needs the setting, a page with headings, and a `§` in the visible text. `renderCellContent` (`cellStatic.tsx:55-179`) has no `§` pass. (B-58, B-79)
- **Runs Live Outside the Token List:** `sectionRunAt` reads `.md-section-run` from the DOM (`linkClicks.ts:31-43`), since runs depend on the outline, which the text-keyed chunk memo can't carry. (B-65)
- **Citations:** `citationPointer.ts` holds `loneTarget` (`:19`), `followCitation` (`:30-45`), `citationPointer` (`:57`, with `dwell: () => null` at `:62`), `citationRowPointer` (`:95`), and `citationRowMenu` (`:109`); `citationActions` is also read by `MarkdownEditor.tsx:19` and `citationMenu` by `api.ts:25`; `citationEdits.ts` holds the edits. The citation menu is a promise-returning host member whose answer the editor applies (`citationPointer.ts:67-73`), the model *§3.8*'s link menu follows. A citation marker follows its lone link but never glances; no ruling changes that. (B-12, B-59, B-67)
- The picker's `§` arming is *§3.12*'s. (A-66)

##### Defects

- **A `§` Run Draws in a Live Cell but Not at Rest,** so a cell changes appearance on entry. (B-58)

##### Design

- **`§` at Rest:** a run will draw at rest as it does live (*Continuation §5.4*), in *§3.6*'s look. The resting renderer will run `sectionRunsIn` over a cell's text with its page's outline; the renderer's `around` input (`CellPage`, `cellStatic.tsx:43`) carries the page's heading keys today, and how the outline itself reaches a resting cell or Text value is open (**Planner**). `StaticCell`'s memo re-renders a cell on an outline change only when `linksOwnHeadings` finds a heading link (`cellStatic.tsx:49,479-486`), so it has to learn `§` too, and `TextCell` passes no `around` today (`TextCell.tsx:60`). The live pass runs only when Heading Resolution is automatic (`inPageHeadingResolution === 'automatic'`, `decorations.ts:666`) and hands `sectionRunsIn` the outline's raw heading text, while a table cell's `around.ownKeys` holds normalized keys, filled only when the cell links its own headings (`widget.tsx:507`).
- **Link Exclusion Through the Walk:** `sectionRunsIn` will find links through *§3.1*'s walk (`linkOccurrences(text, inCode)`'s full spans), keeping the end-exclusive comparison, so the re-match goes and one rule serves every caller (built in the prototype). Embed spans become excluded. A link that code touches will drop out of the walk, so a `§` inside `` [[A `x` §B]] `` is no longer excluded, matching the draw. The rename caller goes with the span-edit rename, which will read runs through `linksIn` (*§3.16*). **Rejected:** moving the exclusion into each caller's mask spreads it over three callers, and `linkTokenAt` is end-inclusive (`tokens.ts:340-341`), which would misreport the `§` in `[[A]]§B` as inside the link (**Probed**). (B-116)
- **Open:** memoizing `byLength` is sound but removes a gated cost; nothing in the design depends on it. (B-116)

##### Traps

- `sectionRunAt` can't go through `drawnLinkAt`, since no token holds a run. (B-159)
- `sectionRunsIn` can't go into the chunk memo. (B-173)

---

#### 3.16 Rename and Index

##### Current Shape

- **Rename Reads Links Separately From the Index:** `linksIn` (`scan.ts:70-109`) and the rewrites (`rewrite.ts:31-111`) walk the same three patterns separately. The rename runs three chained `String.replace` passes (wikilink, embed, markdown link) that rebuild whole tokens (`rewrite.ts:40,47,57,85,92,100`) and rebuild the code mask before each (`:34,43,50`), since each pass sees the previous one's offsets; the heading rename repeats the shape and adds a fourth mask for `§` runs (`:79,87,94,104`). The heading path runs from the editor's settle (`Guards/headingRenameSettle.ts:57`), not per keystroke. (A-10, A-46, B-141)
- **Machinery the Passes Need:** `groupsOf`/`offsetOf` (`rewrite.ts:21-23`) read regex callback arguments, and `escapedPipe` (`:25-26`) re-emits a table cell's escaped pipe and silently drops an empty alias. `targetNamesTitle` (`links.ts:107-110`, sole caller `rewrite.ts:54`) exists because the markdown pass reads raw groups. `applyEdits` already exists (`markdownCode.ts`, used at `rewrite.ts:105`). (A-72, A-73)
- **Bodies and Link Values Rename Differently:** the body path re-emits an alias verbatim (`rewrite.ts:40`); the Link-value path, `rewriteFrontmatterConnections` (`rewrite.ts:112-133`), writes through `connectionText`, which drops an alias equal to the target (`connections.ts:91-93`), and skips any value that isn't `readLink`'s `page` kind (`:125-126`). It has two callers: the cascade's `patchOf` for Link-typed keys (`cascade.ts:199-205`, Text-typed keys going through the body rewrite at `:206-211`) and the Trash restore's relabel (`spend.ts:258-271`). (A-08, T-02)
- **The Index and Rename Disagree on Scope:** `readLink('[x](Old)').kind` is `url`, so a Link value `[x](Old)` is indexed as a body backlink to Old through `valueLinks` (`scan.ts:128-136`) and `linksIn`'s markdown branch, but rename skips it (`rewrite.ts:125-126`) and delete's `goneEntry` (`cascade.ts:95-99`) skips it too. (A-20)
- **Four Host Readers of a Whole Link Value:** `goneEntry` (strip on delete, via `readLink` after `linkEntry`), `parkLinks` (`Core/Trash/holdings.ts:84-94`, via `parseConnectionText`), `namesGonePage` (`Core/Properties/propertyValue.ts:123-126`, frozen restore, via `parseConnectionText` on strings only), and `frontmatterMentions` (`scan.ts:111-124`, via `wholeValueLink`). `goneEntry` unwraps a nested-YAML `[[Page]]` and `namesGonePage` doesn't, so a hand-written unquoted `[[Gone]]` is stripped on a frozen restore and never noted or parked; the notes write `String(raw)` (`restoreScrub.ts:43`, `restoreProperty.ts:66`, `assignment.ts:99`), which `parkLinks` can't read (**Probed**). (T-01, M9-01)
- **Two Heading-Reference Gates Earn Their Difference:** `HEADING_REFERENCE` (`rewrite.ts:62`) and `linksOwnHeadings` (`Tables/cellStatic.tsx:49`) answer different questions. (A-12)
- **Settle-Time Cost:** a heading rename runs four whole-document mask builds in the settle, and `patchOf` evaluates `headingOutline(outlineOf)` once per Text key when the renamed page is its own (`cascade.ts:185-187,210`). (A-10, M9-03)

##### Defects

- **Heading Escape:** a heading or title rename consumes the `\` in `[[A#Note\]]` (*§3.1*). (A-07)
- **`[[Old|Bar]]` Renamed to Bar:** a body gets `[[Bar|Bar]]`; a Link value gets `[[Bar]]` (**Probed**). (A-08, A-141)
- **Scope:** a Link value `[x](Old)` counts as a backlink to Old but isn't rewritten when Old is renamed, or stripped, parked, and restored when Old is deleted. (A-20)
- **Nested-YAML Values Lost on Frozen Restore** (above). (M9-01)

##### Design

- **Rename as Span Edits (S1-A; built in the prototype):** `LinkHit` gains spans: `title` (the page name as written, empty where the link names its own page by leaving it out), `heading` (a wiki heading, a markdown fragment, or a `§` run's text), and `alias` (a connection's alias only). `rewriteConnections` becomes one `linksIn` walk filtered by target, then `applyEdits` over each title span (encoded with `encodeLinkTarget` for markdown); `rewriteHeadingConnections` becomes one walk with `[...outline, oldHeading]`, filtered by target and qualifier, editing heading spans (markdown always, encoded; `§` runs; wiki and embed only while `expressibleHeading` holds). `groupsOf`, `offsetOf`, `escapedPipe`, the chained passes and their rebuilt masks, and `targetNamesTitle` go; `titleOf` stays, since `parseConnectionText` reads it. The escape rule will then live once in the walk, so `[[A#Note\]]` stops matching heading `Note`, as the editor already treats it; spacing inside link syntax will survive byte for byte, and a markdown destination will be edited at its trimmed span (`destinationHalves`). A heading rename's four masks become one.
- **The `names()` Rule (built in the prototype):** a bare fragment or `§` run will keep key `''` when no own title is given, while `[[#]]`, `[[ ]]`, and a blank page half will name nothing. A heading rename on a surface with no page title depends on it: without it the walk drops those hits (`rewriteHeadingConnections('## A\n[[#A]] §A','','A','B','',['A'])` → `[[#B]] §B`). A title rename passes no own title, so `[[#H]]` never matches it: `rewriteConnections('[[#H]] [[Old]]','Old','New')` → `[[#H]] [[New]]` (**Probed**).
- **F-035's Alias Drop (built in the prototype):** the body rename will drop an alias that is empty or repeats the new target (heading included), as `connectionText` does: `[[Old|New]]` → `[[New]]` and `[[Old|]]` → `[[New]]`, in bodies and values alike. The drop is explicit, since `escapedPipe` did the empty case implicitly. It's mandatory with the next piece, or Link values regress to `[[New|New]]`.
- **Link Keys Ride the Body Rewrite (P-22; built in the prototype):** `patchOf` will send Link-typed keys through the same rewrite as Text-typed keys, and `spend.ts` will map stored values through `rewriteConnections(value, was, landed)` behind its `landed === was` guard; `rewriteFrontmatterConnections` goes. A hand-written `[x](Old)` value will rename keeping its written syntax, encoded (`[x](Old%202)`), and a heading rename on the renamed page will rewrite a Link value's `§H` too (*Continuation §5.7*). (P-22, T-02)
- **The Four Host Readers Move Together:** under *§3.1*'s `readLink`, which reports written syntax, the host readers will answer by name-matching the title they hold, so `goneEntry`, `parkLinks`, `namesGonePage`, and `frontmatterMentions` will recognize `[x](Page)` in one step; `valueLinks`' exclusion (`scan.ts:134`) moves with them, or the value double-indexes. `namesGonePage` will read `wholeValueLink`, and the three notes will write `linkEntry(raw, 2)` (M9-01). A hand-written `[x](Page)` value will then be stripped, parked, and restored like `[[Page]]`, and stay indexed as a backlink (*Continuation §5.7*). The name-match is what `targetNamesTitle` (`links.ts:107-110`: a target's title, normalized, equals the key) does today; the prototype deletes it with its only caller, the markdown rename pass, so this step brings the predicate back or reads the same normalization through `readLink`'s reported title. **Rejected:** a resolver-free page arm in `readLink` (P-21) makes `namesGonePage` strip schemeless addresses on a frozen restore with nothing parked, and turns a renamed weblink value into a phantom connection. (T-01, X-01, M9-01)
- **Index Effects (built in the prototype):** `[[A\]]` with no alias will index as `A\`; a link that code touches won't be indexed (*§3.4*); `[x]([[T]])` will record no phantom key (*§3.1*).
- **Open:** hoisting `headingOutline` once per file in `patchOf`; P-22 adds one evaluation per Link key at settle time. (M9-03)

##### Traps

- **The Heading Rename's Outline:** it must pass `[...outline, oldHeading]` to `linksIn`, as `rewrite.ts:107` does today: the settle reads the outline after the heading's edit (`headingRenameSettle.ts:52-55`), so it holds the new heading and not the old one. (A-131)
- **`spend.ts`'s Guard:** dropping `landed === was` changes behavior: `rewriteConnections('[[old]]','Old','Old')` → `[[Old]]` (**Probed**). (P-22)
- **The Four Readers in One Step:** if `goneEntry` recognizes `[x](Page)` and `parkLinks` doesn't, the value is stripped and never parked, so it's lost on restore. (T-01)
- `frontmatterMentions` and `valueLinks` stay separate readers. (A-129)
- The lazy alphabetical sort is load-bearing (`pageIndex.ts:31-32`). (A-130)
- `linkEntry`'s YAML unwrap stays. (A-50)

##### Would Go False

- `ConnectionsPM.md:24` ("one pure pass over three patterns (wikilink, page embed, markdown link) plus the Link property values in frontmatter") is false today (three chained passes) and goes false again: one walk over two syntaxes, with Link values riding the body rewrite. (A-114, B-141)
- Tests: `scan.test.ts:235,254` (exact `LinkHit` shape); `rewrite.test.ts:154-165` and its "drops an empty alias segment" case; `cascade.test.ts`'s `[[Target|New Target]]` → `[[New Target]]`; `linkValue.test.ts`'s `rewriteFrontmatterConnections` cases (`[x](Meeting%20Notes#H)` now renames); `headingRename.test.tsx` on a surface with no page title. (A-116)

---

#### 3.17 Delivery Seams

##### Current Shape

- **The Connections Getter Rides Three Carriers:** `() => ConnectionsApi | undefined` is threaded through every intermediate signature, built in `MarkdownEditor.tsx`, TextPane, and `CellEditor.tsx`; it runs through `surface.ts:43-87`, is re-wrapped as `embedHost.getConn` (`embedWidget.tsx:41,47`), and rides the `tableConnections` facet (`Tables/widget.tsx:55-56` define, `:345` read, `:560` parameter, `:570` `.of`) into `MarkdownTable.connections` (`:133`), `CellEditor.connections` (`:124,147`), and `StaticCell.connections` (`cellStatic.tsx:278`). `buildEditorHost` keeps its own `connRef`, a change needs a manual nudge, and `useEditorHost`'s memo lists `connections` though the builder never reads it. The audit's F-094 (`Pommora Codebase Audit.md:1013-1024`, footnote `:1501`) doesn't name the `tableConnections` facet. (B-49)
- **Optional but Always Supplied:** `ConnectionsApi.location?` and `headingsOf?` (`connectionsApi.ts:42-43`) are supplied by every builder, inert included (`pageConnections.ts:34,44-45`). `bypass?` is optional only because the inert bundle omits it (*§3.13*). (A-83, B-74)
- **`EditorHost.openLink`** is an earned seam (*§3.13*). (B-75)
- **Two Clipboard Doors** are forced by layering (*§3.11*). (A-118)
- **Alias Memory Is Written Twice:** `Core/Connections/aliasMemory.ts:1-9` and `Core/Testing/editorHarness.ts:83-90`; the harness copy skips the `trim` and the head-is-same `null` short-circuit, a test-fidelity gap rather than production duplication. (A-22)

##### Design

- **F-094 Whole (*Continuation §5.11*):** connections become an `EditorHost.connections()` member read live through `view.state.facet(editorHost)`; the parameter drops out of every intermediate, `embedHost.getConn` goes, and the `tableConnections` facet and the `connections` props on `MarkdownTable` and `StaticCell` fold into the `host` `StaticCell` already takes. `connRef` stays as the member's backing, and the redraw nudge becomes one effect on `[host]`. The getter will survive only in the resting cell and Text value renderers outside an editor. A Text value's pane will read connections from its last render, so a rename made in another window while it's open could trail by one render. It will land on `editorBase`, whose `getConn` parameter it removes, and land early, before the menu and gesture phases, since it rewrites the same mounts and signatures. If it needs a roster, it gets a table (*Continuation §5.11*). (F-094, B-49, B-125)
- **`ConnectionsApi` Moves:** it becomes the type of `EditorHost.connections` in `MarkdownPM/api.ts`, so its outside importers read `MarkdownPM/api`. (B-124)
- **Open:** making `location` and `headingsOf` required, which drops the optional chains at their readers. (A-83)
- **Planner:** moving `aliasMemory` into `editorHost`, with the harness importing the real functions, which also closes the harness gap. (A-101, A-22)

##### Traps

- `tableConnections` is read inside the widget's React render (`widget.tsx:345`); the fold must read `host.connections()` live at the gesture. (B-190)
- `ConnectionsApi` can't move into `Core/Connections`: it imports UIX `TrailSegment` (`connectionsApi.ts:13`) and menu types from `Actions/connectionMenu` (`:4-9`), and `Core/Connections` runs on the host. (B-185)
- `EditorHost.openLink` stays. (B-161)
- **The Audit Bundles F-094:** it lands with F-093 and F-095 in the audit's W21 (`Pommora Codebase Audit.md:995`), since all three rewrite the editor mounts. The other two stay deferred, so those mounts will be rewritten again when they land.

##### Would Go False

- The audit's W21 says F-093, F-094, and F-095 land together (`Pommora Codebase Audit.md:995`); taking F-094 alone makes that false.

---

#### 3.18 Names and Vocabulary

##### Current Shape

The product's words are settled (*Continuation §5.1*): a **connection** is any link to a page or heading, whichever syntax wrote it (`[[Page]]`, `[[#H]]`, `[x](Page)`, `[x](#H)`); **weblink** is the code's name for a link to a URL, which the docs call a **link**; the `'wikiLink'` token kind keeps its name. Settings already split the two ("Internal Link Color"/"External Link Color", `frames.ts:477,484`; "Open Connections In Preview"/"Open Links In Pommora", `:357,328`). The code drifted from that split. (B-122)

| Concept | Names in Code | Under the Design | IDs |
|---|---|---|---|
| **"Target"** | Raw destination: `linkTarget` (`tokens.ts:52`), `rawTarget`, `encodeLinkTarget`/`decodeLinkTarget` (`links.ts:68,77`), `targetTitle`/`targetFragment` (`:94,102`). Parsed: `LinkTarget` (`linkValue.ts:11`, differing from `linkTarget` by case alone). Resolved: `MdTarget`, `titleTarget`, `tokenTarget`, `heldTarget`. Thunks: `followTarget`, `dwellTarget`. Menu payload: `ConnMenuTarget`, `linkMenuTarget`, `tokenMenuTarget`, `menuTarget`, `linkValueMenuTarget`. Also `cellLinkTarget` (`cellStatic.tsx:436`), `PasteAsTarget` (`pasteAsMenu.ts:28`), `GlanceTarget`, `HeadingTarget` (`headingTarget.ts:5`), the `'target'` form (`autocomplete.ts:19`), `LinkHit.target`/`Relation.target`, `LinkPaste.target` (a URL, `linkValue.ts:127`), `urlClickTarget` (`:64`), `loneTarget` (`citationPointer.ts:19`), `wikiAuthorTarget` | Destination vocabulary for the markdown `( )` text; `ParsedLink`; `LinkMenuTarget`; several go with their pieces (*§3.8*, *§3.10*, *§3.11*, *§3.12*) | A-88, B-85 |
| **A web address** | `external` (`MdTarget`, `connectionsApi.ts:49`), `url` (`LinkTarget`, `ConnMenuTarget`, `PasteAsTarget`, `LinkActionText`), `target` (`LinkPaste`), `site` (`GlanceTarget`, `api.ts:75`; `ConnSiteAction`; `GlancePane.tsx:97,98,124,202,273,374`; `linkClicks.ts:129`), `webpage` (`TileRange`, `embedWidget.tsx:62`; `TileMount`, `api.ts:151`). `'external'` also tags the unrelated `AssetValue { kind: 'external' }` (`Core/Assets/assetUrl.ts:9`) | `'external'` and `'site'` → `'url'`; `webpage` stays for the embed | B-83, B-84 |
| **"Link"** | Any link (`linkTokenAt`, `drawnLinkAt`, `linkPointer`); the markdown token kind `'link'` (`tokens.ts:27`); a web address (`isValidLink`, `isHttpLink`, `normalizeLinkUrl`, `linkDomain`, `linkTitles`, `openWebLink`, `'link:open'`, `link:*` actions, `EditorHost.openLink`); the Link property type; `ConnectionForm 'link'` (the wikilink title slot); `LinkFormat 'link'` (writes `[sel]()`, labeled "External Link", `Core/Actions/blockMenu.ts:4,44-46`) | `LinkFormat` → `LinkWrapKind` | B-101 |
| **"Connection" / `Conn`** | Names covering weblinks: `ConnMenuTarget { kind: 'url' }`, `ConnUrlAction`, `ConnSiteAction`, `CONN_SITE_ROWS`, `ConnectionsApi.menu`, `showConnectionMenu`; `MarkdownPM.md:8` calls `Links/` "the connection layer," though it also holds address paste, pending titles, and URL formatting | `ConnMenuTarget` → `LinkMenuTarget` with the menu rewrite; `ConnectionsApi` becomes `EditorHost.connections`' type (*§3.17*) and isn't renamed alone | B-91, B-146 |
| **The heading half** | `heading` (`ConnectionParts`, `LinkTarget`, `MdTarget`, `LinkSpans.heading`), `qualifier` (`LinkHit.qualifier`, `scan.ts:65`), `fragment` (`Token.fragment`, `targetFragment`, `DestinationSpans.fragment`, the `'fragment'` form), `headingOf` (`tokens.ts:54`), `'section'` (`ConnectionForm`). `qualifier` is legitimately wider on `Relation` (Context keys, `Core/Platform/stores.ts:11`) | `heading` in every link type; `qualifier` stays on `Relation` | A-89, B-95 |
| **Shown text** | `alias` for both a connection alias and a markdown label: `escapeAlias`/`unescapeAlias` (`links.ts:19-25`) act on labels only, while `DestinationSpans` and `composeWebpageEmbedLine` say `label` | `escapeLabel`/`unescapeLabel` with *§3.1*'s reader | A-90, B-105 |
| **"Title"** | "Page Title" (`LINK_DISPLAY_LABELS['link-title']`, `Core/Properties/properties.ts:120`) is a website's `<title>`; `EditorHost.pageTitle()` (`api.ts:195`) is the Pommora page's; "Add Title"/"Edit Title" (`connectionMenu.ts:84`) and "Remove Title On Link Change" (`Core/Settings/frames.ts:530-533`, hint "drops the alias") mean the alias | Menu labels follow *Continuation §5.5*: Rename edits shown text, Edit Title edits a connection's target, "Add Title" goes; "Page Title" stays | B-88, A-97 |
| **"Preview"** | `link:window` (`connectionMenu.ts:30`, the in-app browser) and `title:window` (`Core/Actions/pageMenu.ts:73`, the Page Window) | Copy stays (*Continuation §5.5*) | B-92 |
| **"Format"** | `LinkFormat` (`blockMenu.ts:4`, wrap kinds) vs Default Link Format / `LinkDisplay` (`properties.ts:110`, `frames.ts:504`, `LinkEditor.tsx:51-55`, `LINK_FORMAT_OPTIONS`); `linkFormat.ts` holds every URL action | `LinkWrapKind`; `linkFormat.ts` merges into `linkActions.ts` (*§3.8*) | B-103 |
| **"Address"** | `linkAddress(tk)` (`tokens.ts:47`) returns a markdown destination that may name a page, while the docs use "address" for a web address; `links.ts` already calls that span `dest` (`:39-43`) | Destination vocabulary | B-102 |
| **Readers and resolvers** | Readers: `parseLink`, `readLink`, `parseConnectionText`, `parsePastedLink` (run on every commit, `linkValue.ts:89`). Resolvers: `PageIndex.resolve`, `resolveConnection`, `resolveTitle`, `ResolveTitle`, `titleTarget`, `resolveMdTarget`, `tokenTarget`. Writers: `connectionText`, `pageEmbedText`, `serializeLink`, `composeWebpageEmbedLine`, `linkMarkdown`, `linkPaste` | `parseConnectionText` → `readWikilink` inside *§3.1*'s fold; `connectionText` keeps its name; the rest per *§3.1*, *§3.2*, *§3.5* | A-91, B-105 |
| **The connections getter** | `getConn`, `GetApi` (`linkClicks.ts:22`), `ConnGetter` (`widget.tsx:55`), `connections` props, `getConnRef` | Goes under F-094 (*§3.17*) | B-105 |
| **`LinkHit`** | The index occurrence (`scan.ts:62`) and a private pointer hit (`linkClicks.ts:24`) | Pointer hit renamed with *§3.7*'s hit shape | A-85, B-93 |
| **"Link at"** | `linkAt` (`connections.ts:42`), `linkGestures`' DOM-hit closure (`cellStatic.tsx:404`, destructured at `:307` and `TextCell.tsx:28`), `linkTokenAt` (`tokens.ts:331`), `drawnLinkAt` (`decorations.ts:370`) | `connections.ts`'s `linkAt` goes (*§3.1*) | A-86, B-94 |
| **`titleOf`** | An escape stripper (`connections.ts:21`) that collides with a parameter name (`Properties/properties.ts:55`) | Stays (`parseConnectionText` reads it) | A-87 |
| **`openPage`** | `connectionsApi.ts:150` (link follow), `useViewInteractions.tsx:368` (row open), `tile.openPage` (`:376-377`, typed at `ViewTile.tsx:231`, `tileKinds.tsx:27`) | The link-follow one goes (*§3.13*) | B-86 |
| **"Plain" vs "literal"** | `PASTE_PLAIN_ACTION = 'paste:plain'` (`Actions/editorMenu.ts:41`) dispatches `pasteAs(view, 'literal')` (`Menus/menu.ts:68-69`), while the `'plain'` Paste As form means the address alone; `pastedUrl` isn't paste-specific | **Planner:** one word (*Continuation §12*, *§3.11*) | A-96 |
| **Picker vocabulary** | `ConnectionForm 'link'` is a wikilink title (`autocomplete.ts:19`); `AutocompleteQuery.title` names the owning page; `warmBody` (`api.ts:192`) collides with `WarmSeam`/`warmSeamOf`/`tileWarmSeam` (`editorHost.tsx:10,15,36`); `headingHash` is named for its output; `HeadingTarget 'warm'` also covers "no page" (`headingTarget.ts:16`); `aliasOnLeave` also handles heading slots (`linkEdit.ts:98-102`); `AcRow`/`AcState` abbreviate | Several go with *§3.12*'s pieces | A-97 |
| **Patterns** | `*Pattern()` and `*Regex()` factories beside the `MD_LINK` constant; `MD_LINK` (`links.ts:5`) vs `MD_LINK_CLASS` (`decorations.ts:80`, external links only); `MdTarget` is also what `tokenTarget` returns for wikilinks (`connectionsApi.ts:72-73`) | `pageEmbedPattern` goes (*§3.14*); `MD_LINK_CLASS` goes (*§3.6*) | A-48, B-97 |
| **`resolveRange` / `contentRange`** | `resolveRange` (`tokens.ts:35`) is the title span, set only when aliased or a heading slot is written; `contentRange` is the shown span | `resolveRange` always set on `wikiLink` (*§3.19*) | B-96 |
| **Menu pairs** | `linkMenuTarget` vs `tokenMenuTarget` differ by input; `applyLinkAction` vs `applyUrlLinkAction` differ by syntax | One builder and one applier (*§3.8*) | B-100 |
| **`ConnSurface 'cell'`** | A property-value cell (`connectionMenu.ts:21`); a MarkdownPM table cell is `'editor'` by default (`connectionMenuActions.ts:22`); `ConnCellAction`, `onCell`, `cellClosingRows` share the meaning | `surface` goes (*§3.8*) | B-99 |
| **Classes** | `ConnectionCell` and `.cell-connection` break the `md-connection-*` family; `linkDisplayText` handles connections, which `LinkDisplay` doesn't cover | `ConnectionCell` and `.cell-connection` go (*§3.10*); classes per *§3.6* | A-95 |
| **Rename functions** | `rewriteConnections` also rewrites embeds and markdown links; `rewriteTileConnections` (`tilesFile.ts:291`) takes any rewrite | `rewriteFrontmatterConnections` goes (*§3.16*) | A-92 |
| **Grammar files** | `pageLinkPattern` (the wikilink) lives in `connections.ts`, the markdown grammar in `links.ts` | *§3.20* | A-93 |
| **`linkValue.ts` names** | Its private `LinkValue` type (`:7`) isn't the property value; `pasteLink` and `linkPaste` are anagrams | `LinkValue` goes (*§3.1*) | A-94 |

##### Defects

- **Product Copy:** "External Link" and "Website Link" (`ConnectionsPM.md:40`) name one thing, as do "Embedded Link" and "Webpage"; "Remove Title On Link Change" uses "Title" for the alias. No ruling covers these; the ruled copy is *Continuation §5.5*'s (Preview and Page Title stay, no "Add Title"). (B-83, A-97)

##### Design

- **Rename Only Where a Shape Change Already Rewrites the Line (S8 §6.1):** a standalone rename deletes nothing and costs churn, so each rename rides the piece that rewrites its lines; the Under the Design column lists them. The renames that earn themselves: `'external'` and `'site'` → `'url'` (which also ends the `AssetValue` collision), the destination vocabulary for a markdown link's `( )` text (`linkDestination`, `destinationSpan`, `encodeDestination`, replacing `linkAddress`/`linkTarget` and the `target*` helpers where *§3.1* and *§3.16* touch them; the walk's `LinkOccurrence.destination` and `destinationHalves` are built in the prototype), `ParsedLink` (*§3.19*), `LinkMenuTarget`, `heading` in every link type, `escapeLabel`, and `LinkWrapKind`. (B-122, B-83, B-84, B-103)
- **Open:** *Continuation §5.1* names a URL link "weblink" in code, while the design row keeps S8's `'url'` kind tag; whether the tag and the type names follow the ruled word is the planner's to reconcile and disclose.
- **Open:** `Token.fragment` → `heading`. The tokenizer mapping rewrites the line that sets it, so the rename can ride; the prototype kept `fragment`.

##### Traps

- Persisted keys can't be renamed for vocabulary: `link_display` (`properties.ts:178`) and the settings keys (`frames.ts:326-504`) would need a decoder migration. `Relation.qualifier` is wider than "heading." (B-184)

##### Would Go False

- `MarkdownPM.md:8` ("`Links/` … the connection layer") is false today. (B-146)

---

#### 3.19 Types and Conversions

##### Current Shape

- **Two Type Spines:** `Token → MdTarget` in the editor; `LinkTarget → ConnPage | null` for Link values (*§3.5*). (B-27)
- **Parsed-Link Types:** `LinkTarget` (`linkValue.ts:11-13`), `ConnectionParts` (`connections.ts:68`), the private `LinkValue` (`linkValue.ts:7`), and `PasteAsTarget` (`pasteAsMenu.ts:28`). (A-94, B-123)
- **Formatted-Write Types:** `LinkPaste` and `LinkActionText` (*§3.11*). (B-31)
- **`LinkSyntax`** (`scan.ts:59`) has four arms and one reader, `indexSeed.ts:62` (embed or not). (A-49)
- **Menu Types:** `ConnMenuTarget`'s arm-inconsistent fields, the unread url `hasAlias`, and `LinkCellAction` (*§3.8*). (B-70, B-71, B-81)
- **Status:** `ConnResolution.status` and the `MdTarget`-derived `LinkStatus` are both genuine (*§3.5*). (B-48)
- **Token Spans:** `Token.resolveRange` is set on a `wikiLink` only when it's aliased or a heading slot is written, so four readers fall back with `?? contentRange` (`decorations.ts`, `cellStatic.tsx`, `connectionsApi.ts`, `linkEdit.ts`). (B-96)
- **Type-Forced Arms:** `pasteAsWrite`'s null arms are mostly forced by its types (`pasteAsMenu.ts:105-106,116,120`). (A-122)

##### Design

**One Shape per Concept (S8 §6.2):** the value of the type set is one spine; the deletions it enables belong to the pieces named.

| Concept | Keeps | Folds In or Goes |
|---|---|---|
| Text spans | `LinkSpans` and `LinkOccurrence` (Connections), `Token` (Engine), `DestinationSpans` | — |
| Parsed, unresolved | `ParsedLink`, the one shape *§3.1*'s `readLink` returns (written syntax: wiki, markdown, or bare, with title or destination, heading, and alias); it classifies nothing, and classification lives in *§3.1*'s `readLinkText` and *§3.5*'s `valueTarget` | `ConnectionParts`, `LinkValue`, `PasteAsTarget` go; the anonymous `{ page, fragment }` stays private to `links.ts` |
| Classified | `LinkTarget` (page or url), which `readLinkText` returns and `retarget` takes | — |
| Resolved | `MdTarget` | `resolveConnection`'s `ConnPage \| null` (*§3.5*) |
| Status | `LinkStatus` | `MdTarget`'s `invalid.ambiguous` stays |
| Glance | `GlanceTarget` | `'site'` → `'url'` |
| Menu | `LinkMenuTarget` (*§3.8*) | `hasAlias`, `surface`, `apply`, and `LinkCellAction` go (*§3.8*) |
| Pointer hit | *§3.7*'s one hit shape | — |
| Index occurrence | `LinkHit` (`scan.ts:62`) with spans (*§3.16*); `LinkSyntax` keeps its `'embed'` arm (*§3.14*) | — |
| Formatted write | `LinkPaste` (`target` → `url`) | `LinkActionText`, `formatted` (*§3.11*) |
| Unread exports | — | `export` drops from `ConnResolution` (`pageIndex.ts:11`) and `LinkSyntax` |

- **The Token Shape (built in the prototype):** a `wikiLink` token will always set `resolveRange` to the title span, set `fragment` only when the heading has text, and carry no slots; the four `?? contentRange` fallbacks become `tk.resolveRange!`, and `aliasedToken` is unchanged. It composes with *§3.3*'s caret reader, which reads no tokens. **Rejected:** slots on the token add emptiness checks to a wider type for no gain once caret readers stop reading tokens. **Open:** a `wikiLink`-narrowed `Token` union would remove the four `!` assertions, which exist only because `resolveRange` is optional on every kind.
- **Conversions That Remain** (each a real stage change): text → `LinkOccurrence`/`Token` (the walk and its tokenizer mapping); `Token` → `MdTarget` (`tokenTarget`); a whole value → `ParsedLink` (`readLink`) for the host, and → `MdTarget` (`valueTarget`) for the renderer and menu; clipboard or commit text → a classified target (`readLinkText`); `ParsedLink` → `MdTarget` (`titleTarget` for a page; a URL maps directly); `MdTarget` → `heldTarget` → consumers (`LinkMenuTarget`, `GlanceTarget`, follow, look); `MdTarget`/`ConnPage` → `LinkPaste` → `PendingTitle`.
- **Conversions That Go:** the `ConnectionParts` → `LinkTarget` spread (`linkValue.ts:32`); the `LinkValue` → `LinkTarget` re-tag (`:33-34`); clipboard → `PasteAsTarget` (which loses alias and heading); `LinkPaste` → `LinkActionText` (`linkFormat.ts:50-51`); `LinkTarget` → `ConnPage | null` (`resolveConnection` in `LinkCell` and the value menu). (B-123)

##### Traps

- `MdTarget`'s `invalid.ambiguous` isn't redundant with `LinkStatus`. (B-188)
- `Token.contentRange` can't stand in for the alias span. (B-189)

---

#### 3.20 Placement

##### Current Shape

| File | Runs In | Finding | IDs |
|---|---|---|---|
| `Core/Connections/connections.ts` | both | The wikilink grammar; `linkAt` and the slot wrappers are editor-only readers | B-20, B-124 |
| `Core/Connections/links.ts` | both | The markdown-link grammar, named "links" beside a wikilink file named "connections"; `composeWebpageEmbedLine` is embed spelling | A-93 |
| `Core/Connections/linkValue.ts` | both | The value codec plus field writers plus the editor's paste writers (`linkPaste`/`linkMarkdown`/`LinkPaste`, `:124-144`, read by `pasteDecision`, `pendingTitle`, `linkFormat`, `pasteLink`, `pasteAsMenu`, `Menus/menu.ts`); imports `Properties/properties` and `Properties/propertyValue` (`:4-5`) while Properties imports Connections, a type-only folder cycle | A-94, B-124 |
| `Core/Connections/scan.ts`, `rewrite.ts` | both | Import `MarkdownPM/Engine` (`markdownCode`, `detect`; `scan.ts:7-8`, `rewrite.ts:18`): allowed, since the binding rule is no React and no `Links/` (`engineGraph.test.ts` enforces no `.tsx`, an externals allowlist, and pure UIX leaves), but invisible from the path | B-124, E-12 |
| `Core/Connections/aliasMemory.ts` | window | Holds no link grammar | A-101 |
| `MarkdownPM/Links/connectionsApi.ts` | window | Declares the app-wide `ConnectionsApi`; holds the pure `titleTarget`/`resolveMdTarget`; imports menu types from `Actions/connectionMenu` (`:4-9`) and UIX `TrailSegment` (`:13`) | B-04, A-74 |
| `MarkdownPM/Links/linkEdit.ts`, `linkFormat.ts` | window | One concern (link menu actions) split by syntax; `linkFormat.ts` is named for one of seven actions | B-103 |
| `MarkdownPM/Links/headingHash.ts` | window | A typing transform whose siblings live in `Input/edits.ts` | A-70 |
| `Input/edits.ts` (`linkInCode`, `inAliasAt`, `isInsideWikilink`, `:324-340`) | window | Link-liveness rules outside `Links/` | B-21 |
| `MarkdownPM/Tables/cellStatic.tsx` (`linkGestures`, `cellLinkTarget`, `renderCellContent`, `cellTokens`, `CellPage`/`around`) | window | The resting renderer for both MarkdownPM table cells and Text values (`TextCell.tsx:11`), filed under `Tables/`; imports `mdLinkClass`/`MD_LINK_CLASS` from the CodeMirror draw module (`:10`) | B-98, B-66 |
| `Core/Paths/urlPath.ts` | both | Holds the web-address predicates; many readers, and moving it deletes nothing | B-124 |
| `Core/Web/handlers.ts` vs `openWebLink.ts`, `WebGuest.tsx` | host / window | One folder mixing host and window files (F-090) | B-02 |
| `Core/Interface/Menus/connectionMenuActions.ts` | window | `showConnectionMenu` belongs; `linkValueMenuTarget` (`:76-103`) is a property-value concern | B-124 |
| `Core/Properties/Cells/linkResolve.ts` | window | Serves `parseEditorValue.ts:5,39` only, no cell | A-54 |
| `Core/Nexus/treeIndex.ts` (`resolveConnection`) | window | A link resolver in Nexus | B-124 |

**Where a Reader Looks and Doesn't Find:** "How does a Link value resolve?" (`Nexus/treeIndex.ts:284`, `Properties/Cells/linkResolve.ts:7`, `MarkdownPM/Links/connectionsApi.ts:52`); "Where does a page link open?" (`Session/pageConnections.ts:37-42`, `connectionsApi.ts:150`, `LinkCell.tsx:87`); "Where does an address open?" (`Web/openWebLink.ts`, `EditorHost.openLink` at `api.ts:190`, `connectionMenuActions.ts:35-36`); "Where is a link's caret-liveness rule?" (`Input/edits.ts:324-340`, not `Links/`). (B-124)

##### Design

Placement moves ride the phases that already rewrite their lines; their cost is import churn. (B-124)

- **Settled by Other Pieces:** `ConnectionsApi` will move into `MarkdownPM/api.ts` under F-094 (*§3.17*). `linkAt` and the slot wrappers leave `connections.ts`, and the caret reader becomes `connectionAt`/`inAliasAt` in `Input/edits.ts` in place of `linkInCode` (*§3.3*; built in the prototype); `isInsideWikilink` goes under the opener rule (*§3.12*). `linkEdit.ts` and `linkFormat.ts` will merge into `linkActions.ts` (*§3.8*, naming **Planner**). `linkValueMenuTarget` goes (*§3.8*). `linkResolve.ts` and `resolveConnection` go (*§3.5*). `retarget` will live in `linkValue.ts` beside `readLink` and `LinkPaste` (*§3.11*).
- **Planner:** moving the token-free resolution half (`MdTarget`, `titleTarget`, `resolveMdTarget`) to `Core/Connections/target.ts`, with `tokenTarget` and the menu-target builders staying in `Links/` (*§3.5*).
- **Planner:** where `linkPaste`/`linkMarkdown`/`LinkPaste` live; the paste model in `Actions/` is the candidate, since main reads `pasteAsMenu.ts` (*§3.11*). `retarget` returns `LinkPaste` from `linkValue.ts`, and `pasteAsMenu.ts:14` imports `Connections/linkValue`, so moving `LinkPaste` alone would make `Connections` import `Actions` and close a cycle; moving it means moving `retarget` too, which reopens *§3.11*'s placement. Moving them alone doesn't break the `linkValue.ts` ↔ Properties type cycle.
- **Planner:** `headingHash.ts`'s folder, `Links/` or beside its siblings in `Input/`. (A-70)
- **Planner:** the resting renderer's home (`renderCellContent`, `linkGestures`, `cellLinkTarget`), which serves Text values from `Tables/`; its import of the draw module goes with *§3.6*. (B-98)
- **Planner:** `useLinkTitle`'s home (*§3.13*) and `aliasMemory` into `editorHost` (*§3.17*).
- **Unchanged:** `Core/Paths/urlPath.ts`.

##### Traps

- `ConnectionsApi` (UIX import), `ConnMenuTarget`, and `tokenTarget` can't move into `Core/Connections`. (B-185, B-186, B-187)

##### Would Go False

- `MarkdownPM.md:8`'s description of `Links/` (*§3.18*); otherwise import paths only.
