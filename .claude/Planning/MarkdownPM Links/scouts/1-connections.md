## Scout 1: Connections Layer and Host-Side Readers

All claims were verified by reading unless they're marked *inferred*. Files still being edited in flight (`Engine/tokens.ts`, `Engine/detect.ts`, `decorations.ts`, `Tables/cellStatic.tsx`, `Links/*`, `Input/format.ts`) are cited by function name.

### 1. Surface Map

| File | Lines | Rules It Owns | Production Readers | Why It's Separate |
|---|---|---|---|---|
| `Core/Connections/connections.ts` | 109 | The wikilink grammar (`pageLinkPattern`), the embed grammar (`pageEmbedPattern`), the cell-escape rule (`titleOf`, plus `linkSpans`' own `unescaped`), caret-at lookups (`linkAt`, `aliasSpanAt`, `emptyAliasPipeAt`, `emptyHeadingHashAt`), the whole-value parser (`parseConnectionText`), the writer (`connectionText`, `pageEmbedText`), and the expressibility checks (`expressibleHeading`, `embeddableTitle`), along with `LinkStatus` | Engine `wikiLinkTokens` and the embed spec in `tokenizeChunk`; `scan.ts:3`; `rewrite.ts:1`; `linkValue.ts:1`; `Actions/pasteAsMenu.ts:1`; `Autocomplete/autocomplete.ts:1`, `useConnectionAutocomplete.ts:20`; `Links/headingHash.ts:1`, `linkReveal.ts:2`, `linkEdit.ts`; `Input/edits.ts:326`; Assets (`assetMigrate.ts:57,178`, `assetRoots.ts:22,28`, `assetUrl.ts:22`, `adoptFile.ts:24,53,64`, `assetWrite.ts:31`); `Properties/propertyValue.ts:124`, `value.ts:67`; `Trash/holdings.ts:89`; `Interface/Menus/pageMenuActions.ts:52`; `Menus/gripMenu.ts:79,92,144`; `Guards/embedGuard.ts:65`; `Engine/embedClaims.ts:7` | The wikilink half of the grammar. Its caret lookups are used only by the editor. |
| `Core/Connections/links.ts` | 110 | Three markdown-link grammars (`MD_LINK`, `markdownLinkRegex`, `emptyTolerantLinkRegex`), label escaping (`escapeAlias`/`unescapeAlias`), the webpage-embed writer, destination caret lookups (`markdownDestinationAt`, `linkDestinationStart`, `opensFragment`), target encoding, and target classification (`targetTitle`, `targetFragment`, `targetNamesTitle`) | `tokens.ts` (`markdownLinkRegex`), `detect.ts` (`emptyTolerantLinkRegex`, `unescapeAlias`), `scan.ts:5`, `rewrite.ts:10`, `linkValue.ts:2`, `pasteAsMenu.ts:7`, `autocomplete.ts:3`, `connectionsApi.ts` (`targetTitle`/`targetFragment`), `headingHash.ts:2`, `edits.ts:624`, `pasteLink.ts`, `linkFormat.ts` | The markdown-link half. |
| `Core/Connections/scan.ts` | 137 | The host-side occurrence walk (`linksIn`), whole-value frontmatter mentions (`frontmatterMentions`), links inside values (`valueLinks`), `§`-run detection (`sectionRunsIn`), and `LinkHit`/`LinkSyntax` | `Index/indexSeed.ts:63,69,70`; `Tiles/tilesFile.ts:277`; `Nexus/cascade.ts:64`; `rewrite.ts:107` and `decorations.ts` (`sectionRunsIn`) | The index-side reader, which yields normalized keys rather than spans. |
| `Core/Connections/rewrite.ts` | 133 | Title rename, heading rename, and the frontmatter patch | `Nexus/cascade.ts:178-205`; `Guards/headingRenameSettle.ts:57`; `Trash/spend.ts:264` | The write-side reader. It re-reads all three grammars on its own instead of using `linksIn`. |
| `Core/Connections/linkValue.ts` | 144 | The Link-property value model (`LinkTarget`, `readLink`, `parseLink`, `serializeLink`), YAML unnesting (`linkEntry`, `wholeValueLink`), edit and rename value builders, display text, and paste writers (`linkMarkdown`, `linkPaste`) | `scan.ts:6`; `rewrite.ts:17`; `cascade.ts:30,96-97,209`; `propertyValue.ts:73,99`; `LinkCell.tsx:30`; `connectionMenuActions.ts:81`; `valueClick.ts:49-51`; `parseEditorValue.ts:9,36`; `PropertyValueInput.tsx:56-58`; `filter.ts:149`; `sort.ts:62`; `WebTile.tsx:29`; `pasteAsMenu.ts:14`; `pasteDecision.ts`; `menu.ts:52`; `pendingTitle.ts`; `linkFormat.ts` | It's the value-level model, but it also holds the editor's paste writers. |
| `Core/Connections/pageIndex.ts` | 55 | Title → page resolution (`resolve`) and the picker's candidates | `Nexus/treeIndex.ts:272` (the only builder), wrapped by `resolveConnection` (`treeIndex.ts:284`), `titleTarget` (`connectionsApi.ts`), and `linkResolve.ts:7`; read raw by `Matrix/matrixInput.ts:58` and `Session/pageConnections.ts:30` | The single resolver. It's clean. |
| `Core/Connections/aliasMemory.ts` | 9 | MRU list operations | `Pages/editorHost.tsx:62-63` only. `Testing/editorHarness.ts:85,89` re-implements the same rule. | It reads no link grammar, so Connections isn't the natural home for it. |

**Total:** 697 production lines.

### 2. Duplicated or Parallel Rules

**Wikilink grammar entry points:** `pageLinkPattern` is read by seven independent group-readers:

- `linkSpans` (`connections.ts:26`), which feeds `linkAt` and `wikiLinkTokens`.
- `parseConnectionText` via `WHOLE_LINK` (`connections.ts:66-85`).
- `linksIn` (`scan.ts:80-91`).
- `rewriteConnections` and `rewriteHeadingConnections` (`rewrite.ts:35,81`), which use `replace` callbacks and the positional-args hack in `groupsOf`/`offsetOf` (`rewrite.ts:21-23`).
- `wholeWikiLink` (`pasteAsMenu.ts:30-33`).
- The `worn` alias in `useConnectionAutocomplete.ts:168`.
- `sectionRunsIn`'s link exclusion (`scan.ts:30`).

Each of these does its own escape, trim, and empty handling.

**Cell-escape rule, written twice with different conditions:** `linkSpans` strips the trailing `\` only when an alias follows (`connections.ts:31-32`, `unescaped`), which is correct because the escape belongs to the cell's `\|`. `titleOf` (`connections.ts:21`) strips it unconditionally at `scan.ts:89` (heading), `rewrite.ts:37` (page, even when a heading is present), `rewrite.ts:39,84` (heading), and `connections.ts:80`. `scan.ts:86` carries a comment that states the right rule, and `rewrite.ts:37` violates it. Page titles can't contain `\` (`Paths/names.ts:15`), so the page-half drift is latent. The heading-half drift is live: for `[[A#Note\]]`, the editor resolves the heading as `Note\` (via `linkSpans`), while the index records `note` (`scan.ts:89`), and a heading rename of `Note` rewrites it to `[[A#New]]` (`rewrite.ts:84-85`), consuming the backslash. This is drift.

**Title-rename body vs. frontmatter alias rule:** `rewriteConnections` re-emits the alias verbatim (`rewrite.ts:40`). `rewriteFrontmatterConnections` writes through `connectionText` (`rewrite.ts:130`), which drops an alias equal to the target (`connections.ts:91-93`). Renaming `Old` → `Bar` therefore leaves `[[Bar|Bar]]` in bodies but writes `[[Bar]]` in Link values. This is drift.

**Markdown whole-value grammar:** `MD_LINK` (`links.ts:5`) is a separate grammar from `markdownLinkRegex`/`emptyTolerantLinkRegex`. It has no 255 cap, no `^` footnote exclusion, admits newlines, and its destination is `(.*)`. On the anchored string `[a](b) [c](d)`, `parseLink` reads label `a` and URL `b) [c](d`. `[^1](x)` reads as a link in a Link value but as a footnote in the body. `WHOLE_LINK` already shows the correct pattern (anchoring the streaming grammar), and `MD_LINK` doesn't follow it. This is drift.

**Rename reader vs. index reader:** `linksIn` (`scan.ts:70-109`) and `rewriteConnections`/`rewriteHeadingConnections` (`rewrite.ts:31-111`) each walk the same three patterns, along with code masks and `§` runs. The rewrite builds `codeMask` three times for a title (`rewrite.ts:34,43,50`) and four times for a heading (`rewrite.ts:79,87,94,104`) because sequential `String.replace` passes shift offsets. Its own comments (`rewrite.ts:42,49`) explain this. The index walk builds one mask. Both answer the same question ("does this occurrence name title/heading X"), and that's how the escape drift above arose.

**Embed grammar:** There are three readers:

- `pageEmbedPattern` (`connections.ts:3`), whose page excludes `#`.
- `loneEmbedRe` (`detect.ts`, `loneEmbedTitle`), whose title admits `#`. It's gated afterward by `embeddableTitle` in `embedClaims.ts:7`.
- A hand loop over `![[` in `autocompleteQuery` (`autocomplete.ts:120-131`). This one is justified because the embed is unclosed while it's being typed.

The lone-line reader could be `^…$` over `pageEmbedPattern().source`, the same way `WHOLE_LINK` is built. The difference doesn't earn itself.

**"Does this text reference a heading" gates:** `HEADING_REFERENCE` (`rewrite.ts:62`, `\[\[…#|\]\(…#|§`) and `linksOwnHeadings` (`cellStatic.tsx`, `/\[\[#|\]\(\s*#/`) are two hand regexes. They answer different questions (any heading vs. an own-page heading), so this is acceptable, but neither derives from the grammar.

**Wiki-depth reader:** `isInsideWikilink` (`edits.ts:601-616`) counts `[[`/`]]` depth by hand. It treats an unclosed `[[` as inside, which the in-progress transform guard needs. This is a genuine difference.

**Resolve-a-parsed-connection:** There are four adapters over `PageIndex.resolve`:

- `titleTarget` (`connectionsApi.ts`), which handles `''` + heading as `self`.
- `resolveConnection` (`treeIndex.ts:284`), which returns `null` for `''`.
- `ConnectionCell` (`LinkCell.tsx:75`), which re-implements `self` through `holder`.
- `linkValueMenuTarget` (`connectionMenuActions.ts:89-91`), which has no `self` arm.

Result: a bare `[[#H]]` Link value opens on click (`LinkCell.tsx:75-87`) but gets no context menu, because `resolveConnection(tree, '')` is phantom, so it returns `null` (`connectionMenuActions.ts:90-91`). This is drift.

**Markdown-target classification policy:** There are three policies over the same `targetTitle`:

- The editor resolves first and falls back to a URL (`resolveMdTarget`).
- The Link value requires a page whenever `targetTitle` is non-null, with no URL fallback, so `[x](example.com)` is refused (`linkValue.ts:59-61`).
- Paste As treats anything with `targetTitle` as a page, with no index (`pasteAsMenu.ts:44-45`).

These are F-042's mechanism. Paste reading belongs to another scout, but the rule should have one home, and `resolveMdTarget`/`titleTarget` are pure functions of `PageIndex` that sit in `MarkdownPM/Links`.

**Index scope vs. rename scope:** `valueLinks`/`frontmatterMentions` read every key, registered or not, and `valueLinks` reads a markdown-form Link value such as `Link: "[x](Notes)"` as a body link (`scan.ts:128-136`). `cascade.ts:199-211` rewrites only keys the registry types as `link` (whole page connections only, via `rewrite.ts:126`) or `text`. An indexed mention in an unregistered key, or a markdown-form Link value, makes the cascade sweep the file and change nothing. ConnectionsPM.md:24 documents the gating, so this may be intended. It's a decision for Nathan, but the index and rename disagree about what "names a page" means.

**Alias MRU:** `aliasMemory.ts:1-9` and `Testing/editorHarness.ts:85,89` implement the same rule twice. The harness doesn't import the production rule.

### 3. Odd-Ones-Out

- **Rename rewriting reconstructs whole tokens:** `rewrite.ts:40,47,57,85,92,100` hand-spell `[[…]]`, `![[…]]`, and `[…](…)`. Every other link mutation in the codebase edits a span. `escapedPipe` (`rewrite.ts:25-26`) exists only to re-create bytes that a span edit would never have touched.
- **Titles have no expressibility check:** `expressibleHeading` (`connections.ts:99`) and `embeddableTitle` (`connections.ts:103`) exist, but no title check does, and `connectionText` writes any title. The name rule rejects `|#§` (`names.ts:27`) but allows `]`. A page titled `Draft]` is written as `[[Draft]]]` by Copy Link (`pageMenuActions.ts:52`), Paste As Connection (`pasteAsMenu.ts:108`), and the picker (`autocomplete.ts:210`). `pageLinkPattern` then closes at the first `]]` and resolves `Draft` (*inferred* from the regex, not run).
- **Writer naming:** `connectionText`, `pageEmbedText`, `composeWebpageEmbedLine`, and `serializeLink` follow four naming schemes for "spell this link." `pageEmbedText` takes no heading, so `rewrite.ts:47,92` hand-spell `![[T#H]]`.
- **Pattern naming:** `pageLinkPattern()`/`pageEmbedPattern()` are factories named `*Pattern`. `markdownLinkRegex()`/`emptyTolerantLinkRegex()` are factories named `*Regex`. `MD_LINK` is a shared constant (stateful `lastIndex` is safe only because it isn't `g`).
- **`LinkSyntax` granularity:** The type has four values (`scan.ts:59`), and its only production reader collapses it to embed vs. not (`indexSeed.ts:62`). Approach A below gives the markdown arm a second reader, which is its encoding.
- **`linkAt` scope:** It's wikilink-only, while `linkTokenAt` and the editor's notion of "link" cover both kinds.
- **`linkEntry` hand-spells `[[${inner}]]`** (`linkValue.ts:21`). This earns itself, because it restores the spelling a YAML flow-sequence ate and shouldn't normalize through `connectionText`.
- **Overlap precedence:** The editor gives embeds and wikilinks precedence over markdown links (`tokenizeChunk`'s `notOverlapping` filters). `linksIn` yields every pattern independently. So `[a]([[B]])` indexes as B plus a phantom key `[[b]]` (`scan.ts:99-104`, `targetTitle('[[B]]')`), while the editor draws only the connection. The impact is harmless today but undecided.

### 4. Self-Induced Machinery

- **Rewrite's mask rebuilds, positional-args hack, and `escapedPipe`:** These are caused by rewriting through three chained `String.replace` passes that reconstruct whole tokens. Collecting edits against the original string and applying them once with `applyEdits` (`markdownCode.ts:16`, already used at `rewrite.ts:105`) deletes the extra masks (5 calls), `groupsOf`/`offsetOf` (3 lines), `escapedPipe` (2 lines), and four of the three-line justification comments. Editing only the title span or heading span preserves alias, escape, and fragment bytes by construction.
- **`titleOf` as an exported helper:** It exists because readers consume raw regex groups instead of `linkSpans`' already-unescaped spans. If every reader goes through `linkSpans`, `titleOf` folds into it and the escape drift disappears.
- **`targetNamesTitle` (`links.ts:107-110`):** It has a single caller (`rewrite.ts:54`) and exists only because rewrite doesn't read `linksIn`'s normalized `target`.
- **`emptyTolerantLinkRegex` and the editor caret helpers:** They exist because tokens refuse empty halves (`links.ts:15` says so). This is real, since ⌘K seats the caret inside `[]()`. It belongs to the editor scout.
- **`MdTarget`'s home:** It lives in `MarkdownPM/Links/connectionsApi.ts` even though it depends only on `PageIndex`, so Properties (`LinkCell`, `connectionMenuActions`) re-derive resolution through `resolveConnection`, and the `self` arm diverged.

### 5. Confusing Names

- **`LinkHit`:** It names an index occurrence (`scan.ts:62`) and also a pointer hit (`linkClicks.ts`, `interface LinkHit extends PointerTarget`), which are unrelated types.
- **`linkAt`:** It names the Connections wikilink span lookup (`connections.ts:42`) and also the per-event token lookup returned by `linkGestures` (`cellStatic.tsx`, destructured at `TextCell.tsx:28`).
- **`titleOf`:** Despite its name, it means "strip a cell-escape backslash" (`connections.ts:21`), and it collides with the unrelated parameter at `Properties/properties.ts:55`.
- **`target`:** It means at least six things: a normalized title key (`LinkHit.target`, `Relation.target`), a raw markdown destination (`targetTitle(rawTarget)`, `linkTarget(text, tk)` in `tokens.ts`), a parsed value (`LinkTarget`), a resolved destination (`MdTarget`, `titleTarget`, `tokenTarget`), a Paste As classification (`PasteAsTarget`), and a menu payload (`ConnMenuTarget`). `LinkPaste.target` is a URL.
- **Heading, qualifier, and fragment:** "Heading" is `heading` in `ConnectionParts`/`LinkTarget`/`MdTarget`, `qualifier` in `LinkHit`/`Relation`, and `fragment` in `Token.fragment`, `targetFragment`, and `markdownDestinationAt().fragment`.
- **`alias`:** It means both a connection's `|alias` and a markdown link's label (`escapeAlias`/`unescapeAlias` operate only on markdown labels, `links.ts:20-25`; `LinkValue.alias` and `LinkTarget` URL `alias` are labels).
- **Readers:** `parseLink` (markdown or bare URL), `readLink` (either kind), `parseConnectionText` (wikilink), and `parsePastedLink` (paste normalizer returning text) are four readers whose names don't say which grammar each reads.
- **`rewriteConnections`:** It also rewrites embeds and markdown links. The file is `rewrite.ts`, while `rewriteTileConnections` (`tilesFile.ts:291`) takes any rewrite function.
- **`connections.ts` vs. `links.ts`:** "Link" files hold the markdown grammar, while `pageLinkPattern` (in `connections.ts`) is the wikilink grammar.

### 6. Approaches

#### A. Rename Reads the Index's Walk (Recommended Core)

`linksIn` yields spans as well as keys: `title: [s,e] | null` (the page half: the wikilink title span from `linkSpans`, the embed `page` group, or a markdown destination up to `#`) and `heading: [s,e] | null` (the heading span from `linkSpans`, the embed heading group, a markdown fragment, or a `§` run's text). The wikilink branch reads through `linkSpans`, so the escape rule lives once. `rewriteConnections` becomes "one mask, `linksIn(body)` filtered by `target === oldKey`, then edit each `title` span with the new title (`encodeLinkTarget` for `syntax === 'markdown'`) through `applyEdits`." `rewriteHeadingConnections` becomes "`linksIn(body, own, outline && [...outline, oldHeading])` filtered by `target` and `qualifier`, then edit each `heading` span (encoded for markdown)," keeping the `expressibleHeading` gate for wiki and embed. `rewriteFrontmatterConnections` stays.

- **Deleted:** `rewrite.ts:21-26` (6), the replace-pass bodies `rewrite.ts:32-59` and `73-110` (~66 including comments), `targetNamesTitle` (`links.ts:107-110`, 4), and `titleOf` as an export (`connections.ts:20-21`, with `parseConnectionText` slicing `linkSpans`, ~2).
- **Added:** span fields in `LinkHit` and the three branches (+8), and the new rename bodies (~+24).
- **Net:** −78 + 32 ≈ **−46** (±10).
- **What users would notice:** A heading ending in `\` is no longer mangled. Unusual whitespace inside link syntax is preserved byte-for-byte on rename (span edit vs. reconstruction). A heading rename no longer runs four whole-document mask builds in the editor's settle (`headingRenameSettle.ts:57`).
- **Dependencies outside the surface:** None. `indexSeed.ts:61-62` ignores the new fields.

#### B. One Value Model and One Resolver (Pairs With A)

- `parseConnectionText` returns the page arm of `LinkTarget` (delete `ConnectionParts` and spread it in `readLink`, ~−6).
- Fold the private `LinkValue`/`parseLink` into `readLink` (~−5).
- `MD_LINK` becomes the anchored `emptyTolerantLinkRegex` source, as `WHOLE_LINK` does (±0 lines, one grammar fewer).
- Move `MdTarget`/`titleTarget`/`resolveMdTarget` into `Core/Connections` (they're pure over `PageIndex`, so the move nets ~0).
- Have `ConnectionCell` and `linkValueMenuTarget` resolve through `titleTarget`, so `self` is handled once (~−6).
- Make `connectionText` the only wikilink spelling: `autocomplete.ts:210` goes through it (F-035, ~−1), and give `pageEmbedText` a heading parameter so `rewrite.ts`'s remaining embed hand-spelling goes away (A already removes most of it).
- Add a title expressibility check beside `expressibleHeading` and `embeddableTitle`, by generalizing one of them rather than adding a third (~+1).
- **Net:** ≈ **−17**.
- **What users would notice:** A bare `[[#H]]` Link value gets its context menu. `[a](b) [c](d)` and `[^1](x)` stop reading as a link in a Link value. A title ending in `]` stops producing broken connections.
- **Dependencies:** The paste scout's resolution of F-042 (whether `pasteAsTarget`/`parsePastedLink` adopt `resolveMdTarget`), plus F-114 for the host-side resolver.

#### C. One Occurrence Reader for Editor and Host (Optional, After Link Gestures Lands)

`Connections` exports a `linkOccurrences(text, inCode)` with the editor's overlap precedence (embed > wiki > markdown, code excluded). `tokenizeChunk` maps occurrences to tokens in place of `wikiLinkTokens` and the embed and link `regexTokens` specs, and `linksIn` and `sectionRunsIn`'s exclusion consume the same walk. `loneEmbedTitle` becomes an anchored `pageEmbedPattern`.

- **Deleted:** `wikiLinkTokens` (~26), two `RegexSpec` entries plus link and embed overlap filters (~10), `sectionRunsIn`'s re-match (`scan.ts:30-32`, 3), and `loneEmbedRe` (1).
- **Added:** the occurrence reader (~+22) and the token mapping (~+12).
- **Net:** ≈ **−6**.
- **Value:** The value is the agreement it creates. The ConnectionsPM.md:8 claim ("the editor's tokenizer and main's rename rewriter can never disagree") becomes true by construction, and `[a]([[B]])` reads the same everywhere.
- **Dependencies:** It touches in-flight `tokens.ts` and `detect.ts`. It's justified only if the editor scout's restructuring also wants occurrences. Otherwise, skip it.

`aliasMemory.ts`, which doesn't touch link grammar, could move into `editorHost.tsx`, with the harness importing it (~−4 net). It's optional.

**Combined A + B:** ≈ −63 production lines in this surface.

### 7. Would Go False

- `.claude/Features/ConnectionsPM.md:24`: "one pure pass over three patterns." Under A, rename runs over the index's walk, so the description needs updating to say rename and index read one walk.
- `.claude/Features/ConnectionsPM.md:8`: The claim becomes accurate under C. Under A alone it stays half-true (it holds for index vs. rename but not for the tokenizer).
- `rewrite.ts:38,42,49` comments (pipe-escape re-emission and mask rebuilds) are deleted with the code they describe.
- `scan.ts:86` comment (`titleOf` only where…) is deleted, since `linkSpans` owns the rule.
- `scan.test.ts:235,254`: Exact-`toEqual` `LinkHit` objects gain span fields.
- `rewrite.test.ts:154-165` keep passing (byte-preservation). Any test asserting reconstruction of whitespace inside syntax would change (none found).
- `connections.test.ts`/`links.test.ts` cases for `titleOf`, `targetNamesTitle`, and `parseLink` (if exported for tests) go when the helpers go. The `linkValue.test.ts` cases for `parseLink` on `[a](b) [c](d)`-shaped input change under B.
- `connectionMenuActions.ts:81-99` behavior for a bare-heading value changes under B (no test found covering `null` there).

### 8. Traps

- **Wikilink and embed patterns can't merge:** The embed grammar excludes `#` from the page and admits `|` in the heading, while `![[ ]]` has no alias and `(?<!!)` keeps them disjoint. Keep the two patterns, and share only the walk (C).
- **`linkSpans`' `unescaped` must stay:** GFM cells really produce `[[T\|a]]` (`connections.ts:20`, `rewrite.test.ts:163`). Approach A preserves it by editing only spans, which is why `escapedPipe` can go and `unescaped` can't.
- **`codeMask` (`markdownCode.ts:199`) vs. `inCodeAt` (`docScan.ts:350`) aren't a divergence:** Both read `fenceSpans` (`markdownCode.ts:100`; `detect.ts:89` `scanFencedCode`). `codeMask` exists so host code needn't build a full `DocScan`. Don't merge them in this surface.
- **`emptyTolerantLinkRegex` is needed:** ⌘K writes `[]()` and the picker must read it (`autocomplete.ts:93-117`). It's removable only if tokens admit empty halves, which belongs to the editor scout.
- **`linkEntry`'s `[[${inner}]]` must stay:** YAML parses unquoted `[[Page]]` as a nested sequence (`linkValue.ts:15`), and routing it through `connectionText` would normalize an alias the author wrote.
- **`isInsideWikilink` vs. `linkAt` isn't a duplicate:** It must treat an unclosed `[[` as inside, since transforms stand down while a link is being typed (`edits.ts:600,631`). `linkAt` requires the closer.
- **`frontmatterMentions` and `valueLinks` look mergeable but stay separate:** The cascade and the index treat whole-value links (Link-typed, connection-only, written through `connectionText`) differently from prose links inside strings (span rewrite). Only their key-scope disagreement with `cascade.ts` is open (§2).
- **`buildPageIndex`'s lazy `alphabetical` sort (`pageIndex.ts:31-32`) is needed:** It's load-bearing because `pageIndexOf` rebuilds per tree change (`treeIndex.ts:272`).
- **`rewriteHeadingConnections`' `outline` must be `[...outline, oldHeading]` (`rewrite.ts:107`):** That keeps a longer heading the run names. Approach A has to pass the same outline to `linksIn`.
