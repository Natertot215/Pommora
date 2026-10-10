## Scout 8: Names, Types, Placement, and Docs Across Every Link Surface

Baseline is HEAD `75c3bcb9c`; every citation is `path:line` at that commit. "Verified" means read in source or confirmed by `git grep`; "inferred" is marked. Reference counts come from `git grep -cw` over `Core` and `Desktop` (production excludes `*.test.*` and `Core/Testing/`). Scouts 1-5 were read; every name and type below was re-checked at HEAD rather than taken from them.

**Up front:** this surface's *own* line contribution is small. Renames are ~0 lines, the type consolidations unique to this report net about −10 to −15 once deletions other scouts already counted are excluded, and the placement work rides F-094. What the surface is worth is the constraint set: it decides whether the other reports' deletions land as one vocabulary and one type spine, or as seven local cleanups that each keep their own words.

---

### 1. Surface Map

This surface cuts across files, so the map below is organized by concept. Per-file placement is in *§6.3*.

#### 1.1 Every Link Type at HEAD, With Its Builder and Its Readers

| Type | Fields | Built At | Read At | Same Concept As |
|---|---|---|---|---|
| `LinkSpans` (private) | `full`, `title`, `heading`, `alias` spans | `Connections/connections.ts:24` `linkSpans` | `linkAt` `:42`; Engine `tokens.ts:231`; `aliasSpanAt`/`emptyAliasPipeAt`/`emptyHeadingHashAt` `:50-63` | `Token` link fields; `DestinationSpans`; `Slot` |
| `DestinationSpans` (private) | `label`, `dest`, `fragment` | `Connections/links.ts:46` `markdownDestinationAt` | `linkDestinationStart` `:60`; picker; `edits.ts` | `LinkSpans`'s markdown-link twin |
| `Token` (link kinds) | `range`, `contentRange` (shown text), `resolveRange?` (title span, set only when aliased or headed), `fragment?` (heading span, wikiLink only), `markerRanges` | `tokens.ts:228-253` (`wikiLink`), `:283-288` (`link`) | `tokenTarget` `connectionsApi.ts:70`; `decorations.ts:559-660`; `cellStatic.tsx:76-140`; `linkEdit.ts:22-47`; `linkFormat.ts:19-85`; `loneTarget` `citationPointer.ts:19` | `LinkSpans` re-encoded |
| `ConnectionParts` (private) | `title`, `heading?`, `alias?` | `connections.ts:74` `parseConnectionText` | `readLink` `linkValue.ts:31-32` (spread into the page arm); 7 other prod callers read fields directly | Page arm of `LinkTarget` |
| `LinkValue` (private) | `url`, `alias?` | `linkValue.ts:37` `parseLink` | `readLink` `:33`; `serializeLink` `:44` | URL arm of `LinkTarget` |
| `LinkTarget` | `{page; title; alias?; heading?} \| {url; url; alias?}` | `linkValue.ts:30` `readLink` | 5 refs / 2 files (`linkValue.ts`, `LinkCell.tsx:69`) | Parsed, unresolved link |
| `PasteAsTarget` (private) | `{url; url} \| {page; title} \| null` | `Actions/pasteAsMenu.ts:35` `pasteAsTarget` | `pasteAsRows` `:80`, `pasteAsWrite` `:100`, `pasteLink.ts` `pasteAs` | `LinkTarget` with alias and heading dropped |
| `{page, fragment}` (anonymous) | — | `links.ts:85` `pageTarget` | `targetTitle` `:94`, `targetFragment` `:102` | Page arm of `LinkTarget`, from a markdown destination |
| `ConnPage` | `id`, `title`, `path`, `icon?` | `Nexus/treeIndex.ts` `pageIndexOf` | 53 refs / 16 files | — |
| `ConnResolution` | `status`, `page?` | `pageIndex.ts:34-39` | `titleTarget` `connectionsApi.ts:58`; `resolveConnection` `treeIndex.ts:286`; `rememberAliasNear` `linkEdit.ts:86`; `embedWidget.tsx:405` | Index-level answer |
| `MdTarget` | `page` · `self` · `external` · `invalid{ambiguous?}` | `titleTarget` `connectionsApi.ts:52`, `resolveMdTarget` `:64`, `tokenTarget` `:70`, `heldTarget` `linkClicks.ts:89` | 18 refs / 4 files | Resolved link; `resolveConnection`'s `ConnPage \| null` is the same answer collapsed |
| `LinkStatus` | `resolved \| phantom \| ambiguous` | `pageIndex.ts:37`; `linkStatus` `connectionsApi.ts:131` | `wikiLinkView`; `claimedEmbeds` `embedClaims.ts:13` | Derived twice: from `ConnResolution` and from `MdTarget` |
| `GlanceTarget` | `{page; id; path; heading?} \| {site; url}` | `dwellTarget` `linkClicks.ts:125,129` | `EditorHost.glance.arm` `api.ts:73-75` | `MdTarget`'s page and external arms |
| `ConnMenuTarget` | shared `surface?`, `hideable?`, `onCell?` + `{page; page; heading?; editable; hasAlias; apply?} \| {url; url; editable?; hasAlias?; apply?}` | `linkMenuTarget` `connectionsApi.ts:76`, `tokenMenuTarget` `:97`, `linkValueMenuTarget` `connectionMenuActions.ts:76` | `showConnectionMenu` `connectionMenuActions.ts:19` | `MdTarget` plus menu capability |
| `ConnMenuContext` | `surface`, `editable`, `hasAlias`, `external?`, `open?`, `windowed?`, `hideable?` | `showConnectionMenu` `:21-58` | `connectionMenuModel` `Actions/connectionMenu.ts:80` | `ConnMenuTarget` flattened |
| `LinkCellAction` | `ConnEditAction \| ConnCellAction` | `connectionMenuActions.ts:74` | `linkValueMenuTarget` `:78` | An alias of a union already named twice |
| `LinkHit` (pointer, private) | `PointerTarget` + `target: MdTarget`, `tk?` | `linkUnder` `linkClicks.ts:46`, `sectionRunAt` `:31` | `linkPointer` `:132` | Same concept as cellStatic's `{el, target}` |
| `{el, target}` (anonymous) | `el`, `target: MdTarget` | `cellLinkTarget` `cellStatic.tsx:437` | `linkGestures` `:404`, `claimLink` `:316` | Pointer `LinkHit` |
| `{text, tk}` (anonymous) | — | `loneTarget` `citationPointer.ts:19` | `followCitation` | — |
| `LinkHit` (index, exported) | `syntax`, `target` (normalized key), `qualifier`, `at` | `linksIn` `Connections/scan.ts:70` | `indexSeed.ts:61-70`; `rewrite.ts` via `sectionRunsIn` | `Relation` (`Platform/stores.ts:12`) |
| `LinkPaste` | `kind:'link'`, `text`, `target` (a URL), `wantsTitle` | `linkPaste` `linkValue.ts:137`; `decidePaste` `pasteDecision.ts:36` | `pasteLink.ts`; `pasteAsWrite`; `formatted` `linkFormat.ts:50` | `LinkActionText` |
| `LinkActionText` (private) | `insert`, `url`, `wantsTitle` | `linkActionText` `linkFormat.ts:19`; `formatted` `:45` | `applyUrlLinkAction` `:71`; `cellStatic.tsx` `menuTarget` | `LinkPaste` with two fields renamed |
| `PendingTitle` | `from`, `to`, `url`, `text` | `awaitTitle` effects in `pasteLink.ts` and `linkFormat.ts:82` | `pendingTitles` `pendingTitle.ts:20` | `LinkPaste` + a range |
| `TextPaste` / `LinePaste` (private) | `kind`, `text` | `pasteAsWrite` | `pasteLink.ts` `pasteAs` | — |
| `PasteInput` | `clipboard`, `selectionText`, `inverse`, `format`, `title?` | `linkFor` `pasteLink.ts:29` | `decidePaste` | — |
| `OwnPage` | `{body; view; seat} \| {held; page}` | `ownPage` `api.ts:53` | `heldTarget`, `resolveFollow`, `followTarget` | `holder` prop, `heldPage` facet |
| `LinkFormat` | `'link' \| 'linkText' \| 'connection'` | `Actions/blockMenu.ts:4` | `format.ts:55` `LINKS` | Wrap kinds — unrelated to Default Link Format |
| `LinkDisplay` | `link-full \| link-short \| link-title` | `Properties/properties.ts:110` | settings, `PasteAsForm`, `connectionMenu.ts:37-39`, `linkValue.ts:110-143`, `LinkCell` | What the product calls "Format" |
| `ConnectionsApi` | `PageIndex` + `open`, `menu?`, `bypass?`, `headingsOf?`, `location?` | `connectionsOf` `Session/pageConnections.ts:15` | 80 refs / 26 files (13 outside MarkdownPM) | The renderer's link bundle |

#### 1.2 Conversion Map

```
text ──pageLinkPattern──► LinkSpans ──wikiLinkTokens──► Token(wikiLink) ─┐
text ──markdownLinkRegex────────────────────────────► Token(link) ──linkTarget──► raw destination ─┤
                                                                                                    ├─► MdTarget ─heldTarget─► MdTarget
value string ──readLink──► LinkTarget ─(page)─► resolveConnection ──► ConnPage|null   (LinkCell, value menu)
clipboard ──pasteAsTarget──► PasteAsTarget            (alias/heading dropped)
clipboard ──pastedUrl──► string ──decidePaste──► {literal} | LinkPaste ──formatted──► LinkActionText ──► PendingTitle
MdTarget ──linkMenuTarget/tokenMenuTarget──► ConnMenuTarget ──showConnectionMenu──► ConnMenuContext ──► rows
MdTarget ──dwellTarget──► GlanceTarget      MdTarget ──linkStatus──► LinkStatus ──► CSS class
PageIndex.resolve ──► ConnResolution ──► { MdTarget (titleTarget) | ConnPage|null (resolveConnection) | LinkStatus }
body ──linksIn──► LinkHit(index) ──indexSeed──► Relation ──► graph LinkKind
```

Two parallel spines carry one link: the editor runs `Token → MdTarget`, while a Link value runs `LinkTarget → ConnPage | null`. They don't meet, which is the type-level shape behind scouts 2 and 5's LinkCell drift.

---

### 2. Duplicated or Parallel Rules

- **"Is this element a link" has three selector lists:** `linkClicks.ts:60` (resolved, ambiguous, `md-heading-symbol`, `md-link`, `md-link-invalid`); `linkClicks.ts:135` hover gate (resolved, `md-link`); `cellStatic.tsx:255` `LINK_SELECTOR` (`md-link`, resolved, `[data-link-span]`). In a resting cell every link span carries `data-link-span` (`cellStatic.tsx:105,138`), so the two class arms of `LINK_SELECTOR` add nothing (*inferred*: no other link-classed element is drawn in a cell, since `renderCellContent` has no `§`-run pass). The body lists differ for a reason (the click accepts invalid and ambiguous for `hidesSyntax`; the hover arms only what glances), but none of the three is named, and `MD_LINK_CLASS` is a constant while its siblings `md-link-invalid`, `md-link-url`, and `md-connection-resolved` are literals at `decorations.ts:91,97,581,620,631`, `linkClicks.ts:60,135`, and `cellStatic.tsx:255`.
- **Title span read with a fallback four times:** `tk.resolveRange ?? tk.contentRange` at `connectionsApi.ts:72`, `linkEdit.ts:28`, `cellStatic.tsx:78`, and `decorations.ts:594`. The fallback exists because `wikiLinkTokens` sets `resolveRange` only when an alias or heading exists (`tokens.ts:243`). This is drift from an optional field.
- **`LinkStatus` derived twice:** from `ConnResolution.status` (`pageIndex.ts:36-38`, read raw by `claimedEmbeds` at `embedWidget.tsx:405` and `decorations.ts:475`) and re-derived from `MdTarget` by `linkStatus` (`connectionsApi.ts:131-134`). This is genuine, since one runs before resolution exists as an `MdTarget`, but `MdTarget.invalid.ambiguous` re-encodes what `ConnResolution.status` already said.
- **Editable stated twice:** `ConnMenuTarget.editable` (`connectionsApi.ts:25,32`) and `apply !== undefined` are combined at `connectionMenuActions.ts:23`. Every producer sets them in lockstep (`:86` false with no apply, `:107` `edit !== undefined` with `apply: edit?.wiki`, `connectionMenuActions.ts:84` true with apply), so `editable` never changes the outcome. Scout 5 also found this.
- **Formatted-link write has two shapes:** `LinkPaste {text, target}` (`linkValue.ts:124-129`) and `LinkActionText {insert, url}` (`linkFormat.ts:13-17`). `formatted` (`:45-52`) only renames the fields. Scouts 3 and 5 also found this.
- **The editor's connections getter rides three carriers inside one editor state:** the `getConn` parameter threaded through `surface.ts:44-87`, the `embedHost` facet's `getConn` (`embedWidget.tsx:41,47`), and a third facet, `tableConnections` (`Tables/widget.tsx:55-56,570`), read at `widget.tsx:345` to feed `StaticCell`'s `connections` prop. `StaticCell` already receives `host: EditorHost` beside it (`cellStatic.tsx:276-278`). F-094 names the first two. **The `tableConnections` facet isn't in F-094.**
- **Raw-HTML link gate written twice with different scope handling:** `decorations.ts:471` (`scope === 'page' && settings.htmlFormatting`) and `commitAliasOnEnter` (`linkEdit.ts:60`, `htmlFormatting` with no scope check, safe only because it mounts on the page alone).

### 3. Odd-Ones-Out

- **A markdown link naming an ambiguous title draws as broken:** `mdLinkClass` maps every `invalid` to `md-link-invalid` (`decorations.ts:96-97`), while a wikilink to the same title draws `md-connection-ambiguous` (`decorations.ts:656`, `cellStatic.tsx:101`). The pointer hit already treats a wikilink's ambiguity specially and the markdown link's not (`linkClicks.ts:67`). ConnectionsPM.md:4 defines both syntaxes as one connection, so this doesn't earn itself.
- **A page nothing answers to has two class families with one look:** `md-link-invalid` and `md-connection-phantom` share color and opacity (`markdown-pm.css:233-237`) and differ only by underline (`:238-240`), and `md-unresolved-syntax` and `md-phantom-syntax` are identical rules (`:241-244`). The plain-unresolved override lists both pairs (`:245-252`). Two names cover one state ("names nothing reachable"). The underline difference is the only part that may be intended.
- **`ConnMenuTarget.hasAlias` is required on the page arm and optional on the url arm** (`connectionsApi.ts:26,33`). `editable` is the same, required on page and optional on url (`:25,32`).
- **`ConnMenuTarget` carries Properties-only fields:** `surface`, `hideable`, and `onCell` (`connectionsApi.ts:17-19`) are set only by `linkValueMenuTarget` (`connectionMenuActions.ts:83-87`) and `CardValue.tsx:123`, yet they're declared in the editor's `Links/` folder.
- **`resolveConnection` is the only resolver that discards ambiguity** (`treeIndex.ts:284-288`). For the commit gate that's correct (see *§8*), and its doc (`:283`) also binds it to the Link cell's drawing, which is why the cell can't show the ambiguous tone (scouts 2 and 5).

### 4. Self-Induced Machinery

- **`?? tk.contentRange` ×4:** produced by `resolveRange` being optional on a wikiLink token. Always setting it (`tokens.ts:243` becomes `resolveRange: s.title`) deletes the four fallbacks. `aliasedToken` (`tokens.ts:44-45`) stays correct, since an unaliased token's `contentRange[0]` equals the title start whether or not a heading follows (verified by reading `wikiLinkTokens` `:236-238`). `shiftToken`'s conditional spread (`:67`) stays because `Token` is shared by every kind. The net is about 0 lines; the change is one read per site.
- **`tableConnections` facet + `ConnGetter` + `StaticCell.connections` + `MarkdownTable.connections`:** produced by connections not being an `EditorHost` member. Under F-094 the resting cell reads `host.connections()` from the `host` prop it already holds.
- **`LinkCellAction`** (`connectionMenuActions.ts:74`): it exists so `linkValueMenuTarget`'s `apply` can be narrowed (`:98-100`). Scout 2's approach B removes the narrowing, and the alias goes with it.
- **`resolveMdTarget` exported** (`connectionsApi.ts:64`): its one production caller is `tokenTarget` (`:71`). It's exported for `mdLinkTarget.test` (11 test refs).

### 5. Confusing Names

#### 5.1 One Word, Several Concepts

- **"connection"** means three things in code:
  - The wikilink syntax: `connectionText` (`connections.ts:89`), `parseConnectionText`, `ConnectionForm` (`autocomplete.ts:19`), `LinkFormat 'connection'` (`blockMenu.ts:4`), `PasteAsForm 'connection'` (`pasteAsMenu.ts:20`), and `ConnectionCell` (`LinkCell.tsx:64`).
  - A link naming a page, either syntax: CSS `md-connection-resolved` on a markdown link (`decorations.ts:91`), the `connectionColor` setting key, and `connectionsOpenInPreview`, which governs `[x](Page)` through `resolveFollow` (`linkClicks.ts:108-109`).
  - Any link, addresses included: `connectionMenu.ts` / `connectionMenuModel` / `ConnMenu*` (the url arm and `CONN_SITE_ROWS`), `ConnectionsApi.menu` (it pops the URL menu), `showConnectionMenu`, `connectionMenuActions.ts`, and MarkdownPM.md:8's "`Links/` the connection layer".

  The product's definition (ConnectionsPM.md:4, the Settings labels at `frames.ts:357,477`) is the second meaning.
- **"link"** means four things:
  - Any link syntax: `linkTokenAt`, `drawnLinkAt`, `linkPointer`.
  - The markdown-link token kind `'link'` (`tokens.ts:27`).
  - A web address: `isValidLink`, `isHttpLink`, `normalizeLinkUrl`, `linkDomain` (`urlPath.ts:9-36`), `linkTitles`, `openWebLink`, `'link:open'` (`bridge.ts:256`), the `link:window` / `link:browser` / `link:remove` / `link:delete` actions (`connectionMenu.ts:27,40-41`), and `EditorHost.openLink`.
  - The Link property type (`PropertyTypes.tsx:30`).

  `ConnectionForm 'link'` is a fifth meaning: the wikilink's *title* slot (`autocomplete.ts:19`). `LinkFormat 'link'` writes `[sel]()`, labelled "External Link" (`blockMenu.ts:45-46`).
- **"target"** means seven things:
  - The raw destination string: `linkTarget(text, tk)` (`tokens.ts:52`), `rawTarget` (`connectionsApi.ts:64`), `encodeLinkTarget` / `decodeLinkTarget` / `targetTitle` / `targetFragment` (`links.ts:68-105`).
  - Parsed and unresolved: `LinkTarget` (`linkValue.ts:11`).
  - Resolved: `MdTarget`, `titleTarget`, `tokenTarget`.
  - A menu payload: `ConnMenuTarget`, `linkMenuTarget`, `tokenMenuTarget`, `linkValueMenuTarget`.
  - A Paste As classification: `PasteAsTarget`.
  - A glance payload: `GlanceTarget`.
  - A normalized index key: `LinkHit.target`, `Relation.target`.

  `LinkPaste.target` is a URL (`linkValue.ts:127`). `LinkTarget` and `linkTarget` differ by case alone and name different stages. `cellLinkTarget` (`cellStatic.tsx:437`) returns `{el, target}`.
- **"address"** means a web address in every doc and in `linkValue.ts:81`, yet `linkAddress(tk)` (`tokens.ts:47`, new at HEAD) returns the destination span, which may be a page title. `links.ts` already names that span `dest` (`DestinationSpans` `:39-43`, `markdownDestinationAt`, `linkDestinationStart`).
- **"title"** means three things:
  - A page's title: `ConnPage.title`, `LinkSpans.title`.
  - A website's `<title>`: `linkTitles`, `LINK_DISPLAY_LABELS['link-title'] = 'Page Title'` (`properties.ts:120`), `PasteInput.title`, `pendingTitle.ts`.
  - An alias, in product copy: "Add Title" / "Edit Title" (`connectionMenu.ts:84`), and "Remove Title On Link Change", whose hint says "drops the alias" (`frames.ts:531-533`).

  `titleOf` (`connections.ts:21`) strips a cell-escape backslash.
- **"format"** means two things. `LinkFormat` (`blockMenu.ts:4`) holds the wrap kinds behind Format ▸ Connection / External Link. Default Link Format (`defaultLinkFormat`, `frames.ts:502`), the property's "Format" picker (`LinkEditor.tsx:51-55`), `LINK_FORMAT_OPTIONS`, and the `format:link-*` actions all hold `LinkDisplay` values. The file `linkFormat.ts` holds every URL menu action (rename, editLink, remove, delete, format), not only Format.
- **`LinkHit`** names two unrelated types: the index occurrence (`scan.ts:62`, exported) and the pointer hit (`linkClicks.ts:24`, private).
- **`linkAt`** names two things: Connections' wikilink span lookup (`connections.ts:42`) and `linkGestures`' per-event DOM lookup (`cellStatic.tsx:404`, destructured at `TextCell.tsx:28`).
- **`LINK_ROWS`** names two constants: `blockMenu.ts:50` (three rows) and `editorMenu.ts:60` (two rows).
- **`MD_LINK`** (`links.ts:5`, a regex) vs **`MD_LINK_CLASS`** (`decorations.ts:80`, a CSS class).
- **`MdTarget`** covers wikilinks too (`tokenTarget` `connectionsApi.ts:72-73`). "Md" says markdown link.
- **Preview:** "Preview" is the label for both the in-app browser (`link:window`, `connectionMenu.ts:30`) and the Page Window (`pageMenu`). "Open Connections In Preview" means the Page Window.

#### 5.2 Several Words, One Concept

- **Web address:** `external` (`MdTarget` `connectionsApi.ts:49`), `url` (`LinkTarget`, `ConnMenuTarget`, `PasteAsTarget`, `LinkActionText`), `target` (`LinkPaste.target`), `site` (`GlanceTarget` `api.ts:75`, `ConnSiteAction`), `webpage` (`TileMount` `api.ts:151`). Product copy uses "External Link" (format row; External Link Color), "Website Link" (ConnectionsPM.md:40), "Webpage" (Embed ▸), and "Embedded Link" (Paste As, `pasteAsMenu.ts:66`) for the webpage embed that Embed ▸ calls "Webpage" (`blockMenu.ts:75`).
- **Heading part of a link:** `heading` (`LinkSpans`, `LinkTarget`, `MdTarget`, `GlanceTarget`), `fragment` (`Token.fragment`, `targetFragment`, `DestinationSpans.fragment`, `ConnectionForm 'fragment'`), `qualifier` (`LinkHit`, `Relation`; legitimately wider there, since it also holds Context keys, `stores.ts:11`), `section` (`ConnectionForm 'section'`, `sectionRunsIn`).
- **Shown text:** `alias` for a connection's `|alias` and for a markdown label (`escapeAlias`/`unescapeAlias` `links.ts:19-25` only ever touch labels; `LinkTarget.url.alias`), `label` (`DestinationSpans.label`, `composeWebpageEmbedLine(label)`), and `contentRange` on the token.
- **The page a value sits on:** `holder` (`LinkCell.tsx:28`, `TextCell`), `heldPage` (facet `api.ts:44`), `OwnPage{kind:'held'}`, `heldTarget`.
- **The connections getter:** `getConn` (27 refs / 8 files), `getApi` / `GetApi` (`linkClicks.ts:22`, `linkEdit.ts:135`, `citationPointer.ts:57`), `ConnGetter` (`widget.tsx:55`), `connections` (props on 8 components), and `getConnRef` (`useConnectionAutocomplete.ts:89`).
- **Resolve a title:** `PageIndex.resolve`, `resolveConnection`, `resolveTitle` (`linkResolve.ts:7`), `ResolveTitle`, `titleTarget`, `resolveMdTarget`, `tokenTarget`.
- **Leave the clipboard as typed:** `'literal'`, `LITERAL`, `literalAt`, `PASTE_PLAIN_ACTION = 'paste:plain'`, `writePlain`. `PasteAsForm 'plain'` means something else, "the address alone" (scout 3).
- **Spell a link:** `connectionText`, `pageEmbedText`, `serializeLink`, `composeWebpageEmbedLine`, `linkMarkdown`, `linkPaste` (four naming schemes).

---

### 6. Approaches

#### 6.1 Target Vocabulary

**Rule for the plan:** a rename earns itself where a shape change from another approach already rewrites the line. A standalone rename deletes zero lines and costs N files of churn. Each row states its cost so the plan can choose.

Anchor: the product already settled the words. ConnectionsPM.md:4 says a *connection* is any link naming a page. The Settings pair "Internal Link Color" / "External Link Color" (`frames.ts:477,484`) and "Open Connections In Preview" / "Open Links In Pommora" (`:357,328`) split connection from web link. The code drifted from that split.

| Concept | Current Words (Sites in *§5*) | Proposed | Prod Refs/Files | Test Refs/Files | Bundled With | Verdict |
|---|---|---|---|---|---|---|
| A link naming a page (either syntax) | connection (meaning 2) | **connection** | — | — | — | Keep; it's already the product word |
| The `[[ ]]` syntax | connection (meaning 1), `wikiLink` | **wikilink** for the syntax; the token kind `'wikiLink'` stays | `connectionText` 19/8, `parseConnectionText` 18/8 | 3/1, 16/3 | Scout 1-B (`parseConnectionText` returns the `LinkTarget` page arm) | Rename only `parseConnectionText` → `readWikilink` inside 1-B; leave `connectionText` (19 refs, no shape change; it's the writer every surface calls) |
| The menu and bundle for any link | `connectionMenu*`, `ConnMenu*`, `ConnectionsApi`, `showConnectionMenu` | **link** menu: `linkMenu*`, `LinkMenuTarget` | `ConnMenuTarget` 12/3; `ConnectionsApi` 80/26 | 5/1; 65/27 | Scout 2-B and 5-B rewrite `linkValueMenuTarget` / `linkMenuTarget` / `tokenMenuTarget` | Rename `ConnMenuTarget` → `LinkMenuTarget` with those (cheap). **Don't** rename `ConnectionsApi` standalone (145 refs, 53 files); under F-094 it becomes `EditorHost.connections` and its declaration moves to `api.ts` anyway |
| A web address | `external`, `url`, `site`, `target`, `address` | **url** in code; the Glance and `MdTarget` kind tags become `'url'` | `MdTarget` 18/4; `GlanceTarget` 9/2 | 0; 2/1 | Any `MdTarget` edit (scouts 1-B, 5-A) | Earns: `'external'` → `'url'` touches ~6 switch arms already being edited. `'site'` → `'url'` is ~4 sites, cheap. Keep `webpage` for the *embed* (a different concept) |
| A markdown link's `( )` text | `linkTarget`, `rawTarget`, `linkAddress`, `encodeLinkTarget`, `targetTitle`, `targetFragment` | **destination**: `linkDestination`, `destinationSpan`, `destinationTitle`, `destinationHeading`, `encodeDestination` | `linkTarget` 5/3; `linkAddress` 6/3; `targetTitle`/`targetFragment` ~14/8; `encodeLinkTarget`/`decodeLinkTarget` ~8/5 | ~25 | Scout 1-A (rewrite reads spans) and 3-#1 (one reader) rewrite most `targetTitle` callers | Earns for `linkAddress` / `linkTarget` (9 sites; "address" collides with web address, and `LinkTarget` collides by case). The `target*` helpers rename only where 1-A and 3-#1 touch them; otherwise defer |
| Parsed, unresolved link | `LinkTarget`, `ConnectionParts`, `LinkValue`, `PasteAsTarget` | **one type**: `ParsedLink`, freeing "target" for the resolved stage | `LinkTarget` 5/2 | 0 | Scouts 1-B and 3-#1 | Earns (5 refs, already being rewritten) |
| Resolved link | `MdTarget` | **`LinkTarget`** once the old one is `ParsedLink` | 18/4 | 0 | 1-B (moves it to Connections) | Earns if it moves (*§6.3*); otherwise leave it |
| The heading part | heading, fragment, qualifier, section | **heading** in every link type; `qualifier` stays on `Relation` (it holds Context keys too) | `Token.fragment` ~8 sites / 4 files; `targetFragment` | few | `tokens.ts` / `decorations.ts` edits in F-054 | Rename `Token.fragment` → `heading` only if F-054 or scout 1-C rewrites `wikiLinkTokens`; standalone, no |
| A markdown link's shown text | alias, label | **label** for markdown, **alias** for wikilinks: `escapeLabel` / `unescapeLabel` | `escapeAlias`/`unescapeAlias` ~10/6 | — | 3-#1 | Cheap; take it with 3-#1 |
| The page a value sits on | holder, held, own | **holder** for the prop and **held** for the arm already agree. Leave | — | — | — | No change |
| The connections getter | `getConn`, `getApi`, `GetApi`, `ConnGetter`, `connections`, `getConnRef` | Gone under F-094 (`host.connections()`); the two out-of-editor renderers keep one prop named `connections` | 35 refs / 11 files + 8 props | 6/3 | F-094 | Earns only with F-094 |
| Leave as typed | literal, plain | Scout 3's call | — | — | Scout 3, approach 2 | Defer to 3 |
| Wrap kinds | `LinkFormat` | **`LinkWrapKind`**, so "format" means Default Link Format alone | 3/2 | — | — | Cheap (3 refs) and removes a real collision; standalone is acceptable |
| `linkFormat.ts` | file holding every URL action | merge with `linkEdit.ts`'s `applyLinkAction` as **`linkActions.ts`** | — | `linkFormat.test.tsx` imports | Scout 5-B deletes `linkActionText` and `wikiAuthorTarget` | Earns with 5-B |
| `md-link-invalid` / `md-connection-phantom`, `md-unresolved-syntax` / `md-phantom-syntax` | two class pairs, one look | One pair, e.g. `md-link-unresolved` / `md-unresolved-syntax` | CSS 4 rules; TS ~8 sites | DOM-class tests in `aliasRender` / `linkEdges` / `cellLinks` (count when chosen) | `mdLinkClass` edit (*§6.2*) | Earns together with the ambiguous fix |
| Persisted keys: `link_display`, `connectionColor`, `defaultLinkFormat` | — | Leave | — | — | — | Trap (*§8*): a rename needs a decoder migration |

**Product copy (Nathan's call, listed rather than proposed):**

- "Add Title" / "Edit Title" and "Remove Title On Link Change" name the alias.
- "Embedded Link" (Paste As) and "Webpage" (Embed ▸) name one embed.
- "Preview" names two windows.
- "Website Link" (ConnectionsPM.md:40) and "External Link" (Settings and Format) name one thing.

**Net lines:** about 0. **Churn if every "earns" row is taken inside its bundle:** about 60 production refs across about 25 files, almost all already edited by those bundles.

#### 6.2 Target Type Set

One shape per concept; the conversions that remain are listed after the table. Deltas count only what no other scout counted.

| Concept | Keep | Fold In | Who Counted It | Unique Delta Here |
|---|---|---|---|---|
| Text spans | `LinkSpans` (Connections), `Token` (Engine), `DestinationSpans` | — | — | `Token.resolveRange` always set on wikiLink: 4 fallbacks become plain reads, ±0 lines |
| Parsed, unresolved | `ParsedLink` (today's `LinkTarget`) | `ConnectionParts`, `LinkValue`, `PasteAsTarget`, the anonymous `{page, fragment}` stays private to `links.ts` | 1-B (`ConnectionParts`, `parseLink`), 3-#1 (`PasteAsTarget`, `wholeWikiLink`) | 0. `serializeLink(v: LinkValue)` becomes `serializeLink(url, label?)`, inside 1-B |
| Resolved | `MdTarget` (renamed per *§6.1* if moved) | `resolveConnection`'s `ConnPage \| null` for display and menu uses | 2-A/C, 5-A | 0 |
| Status | `ConnResolution.status` → `LinkStatus` | `MdTarget.invalid.ambiguous` stays (needed: `hidesSyntax`, `linkStatus`) | — | `mdLinkClass` gains an ambiguous arm (`md-connection-ambiguous` for a page-shaped `invalid`): +1. Fixes *§3*'s first bullet |
| Glance | `GlanceTarget` | `'site'` → `'url'` (*§6.1*) | — | 0 |
| Menu | `ConnMenuTarget` → `LinkMenuTarget` | drop `editable` (5-B counted −10 with the builder fold); make `hasAlias` required on both arms; drop `LinkCellAction` | 5-B (`editable`), 2-B (narrowing) | `LinkCellAction` −1; `hasAlias?` → required ±0 |
| Pointer hit | private `LinkHit` → `PointerLink` | cellStatic's `{el, target}` becomes `Pick<PointerLink, 'target'> & {el}` only if 5-B's read-only resting menu lands; otherwise leave | — | 0; the rename is file-local |
| Index occurrence | `LinkHit` (`scan.ts:62`) keeps the name once the pointer one is renamed | — | — | 0 |
| Formatted write | `LinkPaste` (`target` → `url`) | `LinkActionText`, `formatted` | 3-#2, 5-B | `LinkPaste.target` → `url`: 4 sites, ±0 |
| Test-only and unread exports | — | drop `export` from `ConnResolution` (`pageIndex.ts:11`) and `LinkSyntax` (`scan.ts:59`), which have no outside reader at all | — | 0 lines |

**Conversions that remain** (each a real stage change):

- text → `LinkSpans` / `Token` (tokenize)
- `Token` → `MdTarget` (`tokenTarget`)
- value or clipboard → `ParsedLink` (one reader)
- `ParsedLink` → `MdTarget` (`titleTarget`, page arm; the url arm maps directly)
- `MdTarget` → `heldTarget` → consumers (`LinkMenuTarget`, `GlanceTarget`, follow, CSS class)
- `MdTarget` / `ConnPage` → `LinkPaste` → `PendingTitle`

**Deleted conversions:**

- `ConnectionParts` → `LinkTarget` spread (`linkValue.ts:32`)
- `LinkValue` → `LinkTarget` re-tag (`:33-34`)
- clipboard → `PasteAsTarget` (alias and heading loss)
- `LinkPaste` → `LinkActionText` rename (`linkFormat.ts:50-51`)
- `LinkTarget` → `ConnPage | null` (`resolveConnection` in `LinkCell` and the value menu)

**Unique net for §6.2:** about −1 to −3. The type set's value is the single spine. The −40-plus deletions it enables are already counted in 1-B, 2-A/B/C, 3-#1/#2, and 5-A/B.

#### 6.3 Target Placement

| File | Lines | Runs In | Folder Says What It Is? | Finding |
|---|---|---|---|---|
| `Core/Connections/connections.ts` | 109 | both | yes | Wikilink grammar. `linkAt` and the slot wrappers are editor-only readers (scout 4) |
| `Core/Connections/links.ts` | 110 | both | partly | Markdown-link grammar named "links" beside a wikilink file named "connections"; `composeWebpageEmbedLine` is embed spelling |
| `Core/Connections/linkValue.ts` | 144 | both | no | Value codec, plus field writers, plus the editor's paste writers `linkPaste`/`linkMarkdown`/`LinkPaste` (`:124-144`, read by `pasteDecision`, `pendingTitle`, `linkFormat`, `pasteLink`, `pasteAsMenu`, `Menus/menu.ts`). It imports `Properties/properties` and `Properties/propertyValue` (`:4-5`), while Properties imports Connections: a folder cycle (type-only) |
| `Core/Connections/scan.ts`, `rewrite.ts` | 137, 133 | both (`cascade.ts` host; `headingRenameSettle.ts`, `decorations.ts` window) | yes | Import `MarkdownPM/Engine/markdownCode` and `detect` (`scan.ts:7-8`, `rewrite.ts:18`): host-run Connections depends on the editor's Engine. Allowed (Engine is pure) but invisible from the path |
| `Core/Connections/pageIndex.ts` | 55 | pure; built only in the window (`treeIndex.ts:272`) | yes | — |
| `Core/Connections/aliasMemory.ts` | 9 | window | no | No link grammar (scout 1) |
| `MarkdownPM/Links/connectionsApi.ts` | 158 | window | no | Declares the app-wide `ConnectionsApi` (13 non-MarkdownPM importers, all for that type: `WindowTabBody`, `editorHost`, `TextCell`, `PropertyValueInput`, `TextPane`, `PropertyPanel`, `valueContext`, `pageConnections`, `MarkdownTile`, `PageTile`, `TileHost`, `tileKinds`, and `connectionMenuActions` for `ConnMenuTarget`). Holds `titleTarget` / `resolveMdTarget`, which are pure over `PageIndex` but sit in the editor, so Properties re-derives through `resolveConnection` and the `self` arm drifted (scouts 1, 2). Imports the menu types from `Actions/connectionMenu` (`:4-9`) |
| `MarkdownPM/Links/linkClicks.ts` | 156 | window | yes | `heldTarget` is pure over `MdTarget` and `OwnPage` |
| `MarkdownPM/Links/linkEdit.ts`, `linkFormat.ts` | 173, 86 | window | no | One concern (link menu actions) split by syntax; `linkFormat.ts` is named for one of its seven actions |
| `MarkdownPM/Links/headingHash.ts` | 35 | window | no | A typing transform; its siblings are in `Input/edits.ts` (scout 4) |
| `MarkdownPM/Input/edits.ts` `linkInCode` `:324`, `inAliasAt` `:334`, `isInsideWikilink` | — | window | no | Link rules in `Input/`. `inAliasAt` was moved here by Link Gestures. A reader looking for "where is a link live" opens `Links/` and doesn't find them |
| `MarkdownPM/Tables/cellStatic.tsx` `linkGestures`, `cellLinkTarget`, `renderCellContent` | 486 | window | no | The resting renderer for both table cells and Text values (`TextCell.tsx:11`), filed under `Tables/` |
| `Core/Paths/urlPath.ts` | 36 | both | no | The web-address predicate (`isValidLink`, `isHttpLink`, `WEB_ADDRESS`) lives in Paths. It has 15+ readers and no deletion follows from moving it, so leave it and note it |
| `Core/Web/openWebLink.ts` | 11 | window | — | — |
| `Core/Web/handlers.ts` | 57 | host | no | `Core/Web` mixes host (`handlers.ts`) with window (`openWebLink.ts`, `WebGuest.tsx`), an F-090 instance |
| `Core/Actions/pasteAsMenu.ts`, `connectionMenu.ts` | 122, 122 | both | yes | Shared menu models. Fine |
| `Core/Interface/Menus/connectionMenuActions.ts` | 103 | window | partly | `showConnectionMenu` belongs here; `linkValueMenuTarget` (`:76-103`) is a Properties value concern |
| `Core/Properties/Cells/linkResolve.ts` | 8 | window | no | Serves `parseEditorValue.ts` only, no cell (scout 2) |
| `Core/Nexus/treeIndex.ts` `resolveConnection` `:284` | — | window | no | A link resolver in Nexus |
| `Core/Session/pageConnections.ts` | 56 | window | yes | The `ConnectionsApi` builder |

**Where a reader looks and doesn't find:**

- **"How does a Link value resolve?"** The answer is split across `Nexus/treeIndex.ts:284`, `Properties/Cells/linkResolve.ts:7`, and `MarkdownPM/Links/connectionsApi.ts:52`.
- **"Where does a page link open?"** The answer is split across `Session/pageConnections.ts:37-42`, `connectionsApi.ts:150` `openPage`, and `LinkCell.tsx:87`.
- **"Where does an address open?"** The answer is split across `Web/openWebLink.ts`, `EditorHost.openLink` (`api.ts:190`), and `connectionMenuActions.ts:35-36`.
- **"Where is a link's caret-liveness rule?"** It sits in `Input/edits.ts:324-340`, not `Links/`.

**Proposal (placement):**

1. **Under F-094:** `ConnectionsApi` moves from `Links/connectionsApi.ts` into `MarkdownPM/api.ts` as the type of `EditorHost.connections`. The editor declares what it needs from its host in one file. That removes the reason 13 outside files reach into `MarkdownPM/Links/`; they import from `MarkdownPM/api`, as `editorHost.tsx` already does.
2. **The token-free resolution half** (`MdTarget`, `titleTarget`, `resolveMdTarget`, `heldTarget`'s rule) moves to `Core/Connections/target.ts`. Properties (`LinkCell`, the value menu, `parseEditorValue`) then resolves through it, and `resolveConnection` and `linkResolve.ts` lose their display callers (scouts 2-C and 5-A count those deletions). `tokenTarget` and the menu-target builders stay in `Links/`. `heldTarget` takes `OwnPage` (`api.ts`), so either it stays in `Links/` or `OwnPage`'s `held` arm is expressed as `ConnPage | null`; leaving it costs nothing.
3. **`linkPaste` / `linkMarkdown` / `LinkPaste`** move from `linkValue.ts` beside `pendingTitle.ts` / `pasteLink.ts`, or into scout 3's merged paste module. `pasteAsMenu.ts` (`Actions`, read by main) also reads them, so the home has to be importable from main: the paste model in `Actions/`, not `Links/`.
4. **`linkEdit.ts` + `linkFormat.ts`** become `linkActions.ts` (authoring and URL actions) plus `aliasSlots.ts` (`commitAliasOnEnter`, `aliasOnLeave`, slot reading), so each file names its concern. Scout 5-B already shrinks both.
5. **`headingHash.ts`** goes to `Input/edits.ts` (scout 4). Conversely, `linkInCode` / `inAliasAt` / `isInsideWikilink` could move from `Input/edits.ts` to `Links/`. Pick one direction: link-liveness predicates in `Links/`, and typing transforms (including `headingHash`) in `Input/`.

**Placement delta:** about 0 lines (moves). The import-path churn is the cost: about 13 files for (1), about 6 for (2), about 7 for (3), and 3 to 4 for (4). (1) is free inside F-094.

#### 6.4 Seams

- **F-094 (getter beside the facet):** at HEAD, link code carries the getter in `linkPointer` (`linkClicks.ts:22,132-140`), `citationPointer` (`:57,61`), `aliasOnLeave` (`linkEdit.ts:135,138`), `markdownDecorations` / `decorationPlugin` / `build` (`decorations.ts:822-847,462`), `inlineSurface` / `editorBase` (`surface.ts:44-87`), `useConnectionAutocomplete` (`:43,89,97,131`), and `embedHost.getConn` (`embedWidget.tsx:41,47,398`). It also travels through the `tableConnections` facet (`widget.tsx:55-56,345,560,570`), `MarkdownTable.connections` (`:133`), `CellEditor.connections` (`:124,147`), and `StaticCell.connections` (`cellStatic.tsx:278`). Outside the editor it's on `renderCellContent` / `linkGestures` (`cellStatic.tsx:57,204,399`), `TextCell` (`:22`), `TextPane` (`:37,89,119`), `PropertyValueInput` (`:28`), and `valueContext` (`:15,26`). The audit typed F-094 at **−50** (measured by the audit). **Unique here:** folding `tableConnections` and the `connections` props on `MarkdownTable` / `StaticCell` into the `host` that `StaticCell` already takes, about **−6** (facet define 2, `.of` 1, read 1, two prop declarations 2), *estimated*. The getter then survives only on `TextCell` / `TextPane` / `PropertyValueInput` / `valueContext` / `renderCellContent` / `linkGestures`, the renderers with no editor.
- **F-093 (scope strings):** link code barely branches on scope. The branches are `useConnectionAutocomplete.ts:67` (`allowEmbeds`), `Menus/menu.ts:94`, and `decorations.ts:471,704`. The one link-relevant inconsistency is the raw-HTML gate written with scope at `decorations.ts:471` and without it at `linkEdit.ts:60`. This is a near non-finding.
- **F-099 (test-only exports in link files):**
  - `resolveMdTarget` (`connectionsApi.ts:64`)
  - `parseLink` (`linkValue.ts:37`)
  - `PasteInput` (`pasteDecision.ts:7`)
  - `PendingTitle` and `pendingTitles` (`pendingTitle.ts:9,20`)
  - `ConnMenuAction` (`Actions/connectionMenu.ts:50`)
  - With no outside reader at all, tests included: `ConnResolution` (`pageIndex.ts:11`) and `LinkSyntax` (`scan.ts:59`).

  Each is 0 lines. They drop when their file is rewritten.

#### 6.5 Docs False at HEAD

| Doc | Quote | Truth at HEAD |
|---|---|---|
| ConnectionsPM.md:8 | "so the editor's tokenizer and main's rename rewriter can never disagree about what a link is" | They disagree on overlap precedence and on the heading escape. The tokenizer drops a markdown link overlapping a wikilink (`tokens.ts:282-288`), while `linksIn` yields both (`scan.ts:80-104`). For `[[A#Note\]]`, `linkSpans` keeps the backslash (`connections.ts:32-37`, no alias) and `scan.ts:89` strips it. Truth: they share the patterns, not the reading |
| ConnectionsPM.md:16 | "built from the page tree (`treeIndex` in the renderer, the content index in main)" | Main resolves no title. The index stores normalized keys and "resolution happens at read time" (`Platform/stores.ts:11`). `git grep resolve -- Core/Index` finds no resolver. Audit F-114 (`Pommora Codebase Audit.md:1359`) says main can't build one. Truth: the renderer's `treeIndex` map resolves; main records title keys |
| ConnectionsPM.md:24 | "one pure pass over three patterns" | Three chained `String.replace` passes, each rebuilding the code mask (`rewrite.ts:34-35,43-44,50-51`; the heading rename runs the same shape at `:79-88`) |
| ConnectionsPM.md:34 | "Clicking a connection opens the page, routed by **Open Connections In Preview** … ⌘-click always takes the other route" | A Link value's connection opens through `select` with `newTab: isCmd(e)` and ignores the setting and window routing (`LinkCell.tsx:87-90`) |
| ConnectionsPM.md:38 | "Right-clicking a link that names a page, wherever it sits, opens one native menu … so the actions a link offers never depend on where it was found" | A markdown link naming a page in an editable editor gets no authoring rows (`connectionsApi.ts:102-111` → `linkMenuTarget` `editable: false`). A Link value's bare `[[#H]]` gets no link menu (`connectionMenuActions.ts:89-91`, since `resolve('')` is phantom at `pageIndex.ts:35-36`) |
| ConnectionsPM.md:43 | Author row "Add Title / Edit Title · Edit Link" under "Page Connection" | False for a markdown link naming a page (same mechanism), which `:4` defines as a connection |
| ConnectionsPM.md:49 | "A read-only surface … offers the opens and Copy Link" | A page link's read-only menu also offers Copy Path (`Actions/connectionMenu.ts:119`) |
| ConnectionsPM.md:73 | Lists what the Link cell omits | Incomplete rather than false: it also omits Open Connections In Preview and window routing (`LinkCell.tsx:87-90`) |
| MarkdownPM.md:8 | "`Links/` the connection layer" | `Links/` also holds address paste, pending titles, and URL formatting (`pasteLink.ts`, `pasteDecision.ts`, `pendingTitle.ts`, `linkFormat.ts`). Truth: the link layer |
| MarkdownPM.md:33 | "An address with an explicit scheme, pasted anywhere in the editor, is written as a link" | A rectangle paste over table cells writes the raw text (`MarkdownTable.tsx:243-251`) |
| MarkdownPM.md:70 | "There are four ways to create one: … and the grip's **Source ▸** tree, which re-aims an existing tile" | Source ▸ creates nothing. The `/` menu's Embed ▸ Internal Page creates one (`blockMenu.ts:73-74,83`). Paste As ▸ Embedded Page is also offered for a markdown link naming a page, not only a "copied connection" (`pasteAsMenu.ts:42-45`) |
| MarkdownPM.md:107 | "a copied connection or markdown link offers Connection, Markdown Link, and Embedded Page" | A headed connection `[[T#H]]` offers nothing (`wholeWikiLink` refuses a heading, `pasteAsMenu.ts:32`). `[x](example.com)` offers page rows (`:44-45`). Embedded Page appears only on a blank line (`:83`) |
| WebviewPM.md:10 | "an empty one derives through Default Link Format, sharing the fetched-title path the cells use" | It's a copy, not a share: `WebTile.tsx:21-28` repeats `LinkCell.tsx:33-38` (one store cache, two hooks) |
| WebviewPM.md:20 | "decides where every external link opens — editor clicks, table cells, tile titles, and guest popups all route through it" | True for clicks. The link menu's Preview and Open In Browser bypass it by design (`connectionMenuActions.ts:35-36`). "Every external link opens" overstates it |
| Editor-Internals.md:25 | "The embed claim has one owner" | One predicate (`embedClaims.ts:11`) run by two owners (`decorations.ts:475`, `embedWidget.tsx:405`). The audit's own verdict (`Pommora Codebase Audit.md:783`) lists this sentence as untrue at its pin until F-054 lands |
| PropertiesPM.md:83 | "The cell then reads as a connection — the connection color, a click that opens the page" | Same routing gap as ConnectionsPM.md:34. The color (`table.css:258-259` `var(--connection)`) holds |
| InteractionPM.md | — | Makes no link-bearing claim (grep for link / connection / url finds only resize and caret entries) |
| Editor-Internals.md:17 | "anything a link, a gesture or a menu does in the body has to be given to the resting cell separately" | True at HEAD; listed because scout 5-B would narrow it |

---

### 7. Would Go False

- **§6.1 renames:**
  - `ConnMenuTarget` → `LinkMenuTarget`: `connectionMenuActions.test.ts` (5 refs).
  - `'external'` → `'url'`: `mdLinkTarget.test.tsx`, `externalLink.test.tsx` (assertions on `kind: 'external'`; *count when chosen*).
  - `GlanceTarget 'site'`: 2 test refs, 1 file.
  - `parseConnectionText` → `readWikilink`: 16 test refs, 3 files.
  - `escapeAlias` → `escapeLabel`: `links.test.ts`.
  - `LinkFormat` → `LinkWrapKind`: no test refs (`git grep -w LinkFormat` hits only `blockMenu.ts` and `format.ts`).
- **§6.2:**
  - `md-link-invalid` / `md-connection-phantom` merge: every DOM-class assertion on those names (`aliasRender.test.tsx`, `linkEdges.test.tsx`, `cellLinks.test.tsx`; *count when chosen*) and `markdown-pm.css:233-252`.
  - `ConnResolution` / `LinkSyntax` un-export: nothing.
  - `resolveRange` always set: `tokens.test.ts:124,132` (`expect(w.resolveRange).toBeUndefined()`).
- **§6.3:** the `MarkdownPM.md:8` folder sentence (`Links/` description) and the `ConnectionsPM.md:8` file attribution if `target.ts` joins Connections. `connectionsApi.ts:15` and `:63` comments move with their code. `linkFormat.ts:54` ("`applyLinkAction` is the parallel for a wikilink") goes false under the merge.
- **§6.4:** the `MarkdownPM.md:10` EditorHost member list gains connections. F-094's own list applies.

### 8. Traps

- **Persisted keys can't be renamed for vocabulary:** `link_display` (the property definition on disk, `properties.ts:178`), `connectionColor` / `externalLinkColor` / `connectionsOpenInPreview` / `defaultLinkFormat` (settings files, `frames.ts:326-504`, `devicePrefs.ts:41`). Each needs a decoder migration. `Relation.qualifier` is wider than "heading" (Context keys for `space` rows, `stores.ts:11`) and must keep its name.
- **`ConnectionsApi` can't move into `Core/Connections`:** `location` returns UIX `TrailSegment` (`connectionsApi.ts:13,43`; NavTrail is `.tsx`), and Connections is pulled into main through `cascade.ts`. F-114 is the proof that a UIX import in main's graph fails `tsc -p Desktop/tsconfig.node.json`. Its home is `MarkdownPM/api.ts` beside `EditorHost`.
- **`ConnMenuTarget` can't move into `Core/Connections` either:** it depends on `Actions/connectionMenu` types (`connectionsApi.ts:4-9`), while `Actions/pasteAsMenu.ts` already imports Connections, so the move would make Connections and Actions import each other. It stays with the menu, in `Links/` or `Interface/Menus/`.
- **`tokenTarget` can't leave MarkdownPM:** it reads Engine `Token` (`connectionsApi.ts:70-74`), and Connections can't import Engine types without inverting the Engine → Connections edge (`tokens.ts:14`). Only the token-free half (`titleTarget`, `resolveMdTarget`) moves.
- **`resolveConnection`'s ambiguity-null is the Link property's commit gate** (`treeIndex.ts:283`, `linkResolve.ts:8` → `parseEditorValue.ts`). The type spine replaces its display and menu uses only. Folding it into `titleTarget` wholesale would let an ambiguous title commit (scout 5's trap, confirmed by reading).
- **`MdTarget.invalid.ambiguous` isn't redundant with `LinkStatus`:** `linkClicks.ts:67` (`hidesSyntax`) and `linkStatus` (`connectionsApi.ts:133`) read it after resolution, where no `ConnResolution` is in hand.
- **`md-link-invalid`'s underline may be intended:** merging the class pairs (*§3*) has to keep a markdown link's underline unless Nathan rules otherwise (`markdown-pm.css:238-240`).
- **`Token.contentRange` can't stand in for the alias span:** an empty alias `[[T|]]` leaves `contentRange` on the title (`tokens.ts:234-238`), which is why the slot readers use `linkAt` (scout 4's trap). Always setting `resolveRange` changes nothing there.
- **`tableConnections` reads at `widget.tsx:345` inside a widget's React render:** folding it into `host.connections()` must read live at the gesture, as the getter does now. F-094's own note (a Text value's pane can trail one render) applies only to the Text pane, not to the resting cell, which sits inside the live page editor.
- **`LINK_SELECTOR`'s class arms:** they look dead in a cell (*§2*). Before dropping them, confirm no caller passes a non-cell element to `linkSpanAt` (both callers at HEAD pass cell event targets, `cellStatic.tsx:289,385,443`).
