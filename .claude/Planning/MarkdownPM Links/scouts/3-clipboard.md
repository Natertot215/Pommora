## Scout 3: Pasting, Paste As, Copying, and the Clipboard

Read-only. "Verified" means traced by reading; "inferred" means reasoned from code without running it. In-flight files (`Core/MarkdownPM/Links/*`, `Engine/tokens.ts`, `Engine/detect.ts`, `decorations.ts`, `Tables/cellStatic.tsx`, `Input/format.ts`) are cited by function.

### 1. Surface Map

| File | Lines | Rule(s) It Owns | Read By | Why Separate |
|---|---|---|---|---|
| `Core/MarkdownPM/Links/pasteLink.ts` | 137 | Three paste entries: `paste` DOM event, the `paste-inverse` chord (`keydown`), and `pasteAs` (menu forms + `'literal'`). Also `literalAt` (code/destination → literal) and the three writers `writeLink`/`writeLine`/`writePlain` | `surface.ts:53` (`inlineSurface`, so page, cell, AND Text pane), `Menus/menu.ts:69,73` (`applyEditorAction`) | The CM6 side; the only file that dispatches a paste |
| `Core/MarkdownPM/Links/pasteDecision.ts` | 47 | `pastedUrl` (paste-time URL test) and `decidePaste` (wrap vs format axis, inverse) | `pasteLink.ts` `linkFor` only | Header comment says "the same decision serves both editors (page body and table cell)"; both editors already share `pasteLink` through `inlineSurface`, so the remaining reason is unit-testability |
| `Core/Actions/pasteAsMenu.ts` | 122 | `pasteAsTarget` + `wholeWikiLink` (Paste As classifier), `pasteAsRows` (row set), `pasteAsWrite` (form → text) | `Desktop/Actions/editorMenu.ts:105` (rows, in main), `pasteLink.ts` `pasteAs` (write, in renderer), `Menus/menu.ts:6` (prefix) | Pure so Electron main can import it |
| `Desktop/Actions/editorMenu.ts` | 138 | Parks the renderer's `EditorMenuRequest` until the native `context-menu` event, reads `clipboard.readText()` in that turn (`:103-105`), builds Paste As rows | `Desktop/main.ts:294` | Native menu must be built in main |
| `Core/Actions/editorMenu.ts` | 143 | Request schema (`embedSeat`, `citeSeat`), `PASTE_PLAIN_ACTION`, Insert Link gate `isValidLink(selection)` (`:113`) | both processes | Shared model |
| `Core/Actions/connectionMenu.ts` | 122 | `COPY_LINK_ROW` placement per surface | `connectionMenuActions.ts:33,59` | Menu model |
| `Core/Interface/Menus/connectionMenuActions.ts` | 103 | URL Copy Link writes `target.url` (`:37`); page Copy Link delegates to `runPageAction` (`:60`); `linkValueMenuTarget` reads a Link value (`:76-103`) | link pointer, `LinkCell` menus | Renderer action side |
| `Core/Interface/Menus/pageMenuActions.ts` | 63 | Page Copy Link writes `connectionText(title, undefined, heading)` (`:51-53`) | page/nav/tab/connection menus | Shared page verbs |
| `Core/MarkdownPM/Menus/gripMenu.ts` | 169 | Heading grip Copy Link writes `connectionText(title, undefined, heading)` through `host.clipboard` (`:91-92`) | grip | Editor can't reach `dialer` (layering) |
| `Core/Connections/linkValue.ts` | 144 | `parsePastedLink` (unexported, `:48-62`), `linkValueFromEdit` (`:82-95`), `readLink`, `LinkPaste`/`linkPaste`/`linkMarkdown` (`:124-144`) | `Properties/parseEditorValue.ts:36`, `pasteAsMenu.ts:121`, `pasteDecision.ts:46`, `linkFormat.ts` `formatted`, `pendingTitle.ts:59` | Link value grammar |
| `Core/Properties/Cells/LinkCell.tsx` | 97 | Display only; there is no Link-property paste handler. A paste lands in the field as text and is classified at commit by `linkValueFromEdit` | views/cards | — |
| `Core/Paths/urlPath.ts` | 36 | `WEB_ADDRESS`, `isValidLink` (schemeless/mailto OK), `isHttpLink`, `normalizeLinkUrl` | ~15 sites (see §2B) | Leaf |
| `Core/MarkdownPM/Guards/tableGuard.ts` | 62 | `tablePasteGuard`: refuses a multi-line table payload tagged `input.paste` in a list line or the citations tail (`:26-44`) | `editorBase` | Guard |
| `Core/MarkdownPM/Tables/CellEditor.tsx` | 291 | Transaction filter on `input.paste` diverts a table payload to `onTablePaste` (`:151-163`) | cell mount | Relies on every paste write being tagged `input.paste` |
| `Core/MarkdownPM/Tables/MarkdownTable.tsx` | 645 | Rectangle ⌘C/⌘X/⌘V via `host.clipboard` (`:239-253`) | table | No focused editor under a rectangle, so no `paste` event |
| `Core/MarkdownPM/Tables/widget.tsx` | 578 | Table-menu copies (`:303-306`, `copyTextFor`) | table menu | — |
| `Core/MarkdownPM/Engine/Tables/clipboard.ts` | 58 | `encodeRect`/`encodeColumn`/`decodePayload` (table payload grammar) | the three table files above | Engine-pure |
| `Core/MarkdownPM/Citations/citationActions.ts` | 159 | `cite:copy` writes `` `[^${label}]` `` (`:147-149`) | citation menu | — |
| `Core/Pages/editorHost.tsx` | 168 | `clipboard.read/write` → `clipboard:read`/`clipboard:write` (`:94-99`) | every editor `host.clipboard` | The editor's only door to the host |
| `Core/Contract/bridge.ts:70-72`, `Core/Interface/handlers.ts:79-83`, `Desktop/main.ts:287-290` | — | The two clipboard channels | — | Contract |

**Clipboard → write paths (verified):**

1. **⌘V in a page body, a live table cell, or a Text pane:** All three are the same path. `pasteLink.paste` reads `event.clipboardData`, then `linkFor` → `pastedUrl` → `literalAt` → `decidePaste` (which calls `pastedUrl` a second time) → `writeLink`. Otherwise it falls through to CM's default insert, tagged `input.paste`, which `tablePasteGuard` and the cell's filter see.
2. **⌘⇧V (`paste-inverse`):** `pasteLink.keydown` does `host.clipboard.read()` over IPC, then `linkFor(…, true)`, then `writeLink`, or `writePlain` when there is no link.
3. **Paste Without Formatting:** It's in the context menu (`Desktop/Actions/editorMenu.ts:82-86`) and the Edit menu (`Desktop/Actions/appMenu.ts:127-128` → `commandRouter.ts:66-70`). Both call `applyEditorAction(PASTE_PLAIN_ACTION)` → `pasteAs(view, 'literal')`, which does an IPC read and then `writePlain`.
4. **Paste As ▸ row:** Main reads the clipboard and runs `pasteAsRows` → `pasteAsTarget`. The click resolves `'pasteAs:<form>'`. The renderer's `pasteAs` then reads the clipboard **again** over IPC, runs `pasteAsTarget` **again**, then `pasteAsWrite`, then `writeLink`/`writeLine`/`writePlain`. Footnote forks to `insertCitation(view, citationText(text))`.
5. **Rectangle ⌘V in a table:** `MarkdownTable.tsx:244-252` runs `decodePayload` or `cellToSource(text)` and then `onFill`. **No link formatting at all.**
6. **Link property field:** The text lands raw. At commit, `parseEditorValue` → `linkValueFromEdit` → `parsePastedLink(trimmed, resolveTitle)` runs, then falls back to `isValidLink` + `normalizeLinkUrl`.
7. **Image picker:** `ImagePicker.tsx:109-120` accepts the text when `WEB_ADDRESS.test(text)` and otherwise uses `nexus:pasteImage`.
8. **Drag-and-drop of a URL into the editor:** No Pommora handler exists. `decorations.ts`'s `dropMargin` only refuses margin drops. CM's default drop inserts the raw text as `input.drop` (inferred from CM6), so a dropped address never becomes a formatted link.

**Link → clipboard writers (verified):**

- **Page Copy Link:** `pageMenuActions.ts:52`, which writes `[[Title]]` or `[[Title#Heading]]`.
- **Connection menu on a page link:** Goes through the same `runPageAction`.
- **Heading grip Copy Link:** `gripMenu.ts:92`, which writes the same form through `host.clipboard`.
- **Connection menu on an address:** `connectionMenuActions.ts:37` writes the raw `target.url`. The alias is dropped and the URL isn't normalized.
- **Citation copy:** Writes `[^label]`.
- **Code block copy:** `decorations.ts` (code-tag widget).
- **Table copies:** `encodeRect`.
- **Path copy:** `path:copy`, which main formats.
- **Editor cut/copy:** No `copy`/`cut` handler and no `clipboardOutputFilter` exist anywhere in `Core/MarkdownPM` or `Core/Properties` (verified by grep), so the source text is copied as-is.

All link writers go through `connectionText` or are the raw URL. There's no second link serializer on the copy side.

### 2. Duplicated or Parallel Rules

**A. Four classifiers for "what link does this text name".** Each reads the same input space differently.

| Reader | Where | Whole `[[…]]` | `[[…#H]]` / alias | `[l](page-ish)` | `[l](example.com)` | Bare `example.com` | Resolver |
|---|---|---|---|---|---|---|---|
| `pastedUrl` | `pasteDecision.ts:21-27` | — | — | — | — | refused (needs `https?://`) | no |
| `pasteAsTarget` + `wholeWikiLink` | `pasteAsMenu.ts:30-47` | via `pageLinkPattern().exec` + `m[0]===s` | heading → **null** (no rows); alias **dropped** | page (title only, fragment dropped) | **page `example.com`** | url, **not normalized** | no (runs in main) |
| `parsePastedLink` + `linkValueFromEdit` | `linkValue.ts:48-62,82-95` | via `parseConnectionText` (`WHOLE_LINK`) | kept | page if resolved, else refused | url only if `example.com` doesn't resolve as a title; normalized | url, normalized | `resolveTitle` (`linkResolve.ts:7`) |
| `resolveMdTarget`/`titleTarget` | `connectionsApi.ts` `resolveMdTarget` | — | `''`+heading → `self` | page if resolved | external if no page | — | page index |

- **`wholeWikiLink` vs `parseConnectionText`:** They're the same "the whole string is one connection" rule, written twice (`pasteAsMenu.ts:30-33` and `connections.ts:66,74-87`). The copies differ: `wholeWikiLink` skips `titleOf` (the GFM `\|` unescape), skips the trim, refuses headings, and drops the alias. This is drift. Audit F-042 covers the symptom.
- **`parsePastedLink` vs `resolveMdTarget`:** Both apply the same "page first, else address" rule to a markdown target. Both use `targetTitle`/`targetFragment` + resolve + `isValidLink`. They differ in three ways, all drift:
  - **Same-page target:** `resolveMdTarget` reads `[x](#H)` as `self`. `parsePastedLink` resolves `''` → phantom → refused.
  - **Normalization:** `parsePastedLink` normalizes the address and `resolveMdTarget` doesn't.
  - **Copy of `pageTarget` logic:** `parsePastedLink` repeats it inline.
- **New defect, not in F-042 (verified by trace):** `pasteAsTarget('[x](#Heading)')` returns `{kind:'page', title:''}`. The trace: `targetTitle('#Heading')` → `pageTarget` gives `{page:'', fragment:'Heading'}` → `''` (`links.ts:85-100`), and `'' !== null` passes `pasteAsMenu.ts:45`. As a result, Paste As offers Connection, Markdown Link, and (on a blank line, since `embeddableTitle('')` is true) Embedded Page:
  - **Connection:** Writes `[[]]`.
  - **Embedded Page:** Writes `![[]]`.
  - **Markdown Link:** `serializeLink({url: encodeLinkTarget(''), alias: ''})` returns `''` (`linkValue.ts:44-46`), so `writePlain(view, '')` **deletes the selection**.

  A same-page markdown link is what heading links produce, so copying one is ordinary.

**B. The "is this a web address" predicate comes in four strengths, and one composite is written four times.**

- **`isValidLink`:** Accepts schemeless addresses and mailto. Used at `editorMenu.ts:113` (Insert Link gate), `menu.ts:51`, `pasteAsMenu.ts:46`, `linkValue.ts:61,67,91`, `connectionMenuActions.ts:93`, `connectionsApi.ts` `resolveMdTarget`, `Web/handlers.ts:40`.
- **`isHttpLink`:** Equals `isValidLink` minus mailto (`urlPath.ts:20-22`). Used at `LinkCell.tsx:33`, `Desktop/Web/linkTitles.ts:9`, `webGuests.ts:18`.
- **"Written-out web address" (`WEB_ADDRESS.test(s) && isValidLink(s)`):** Written four times:
  - `pasteDecision.ts:25-26` (`pastedUrl`)
  - `detect.ts` `loneWebpageEmbed` (`!WEB_ADDRESS.test(url) || !isValidLink(url)`)
  - `webGuests.ts:18` (`isWebUrl`, with a comment explaining why)
  - `pasteAsMenu.ts:70` (`embeddableTarget`, on a url already passed through `isValidLink`)

  The copies are identical in effect. That's drift from not having a name for the composite.
- **`WEB_ADDRESS` alone:** Used at `ImagePicker.tsx:111`, `adoptFile.ts:69`, `linkClicks.ts` (glance arm).
- **Within `pastedUrl` itself:** Its `/\s/` single-token check (`pasteDecision.ts:24`) is already inside `isValidLink` (`urlPath.ts:26`), so the comment "One token, so a pasted document…" describes a check that's done twice.

The stricter paste-time test (an explicit scheme is required) is a deliberate choice (`pasteDecision.ts:20`) and is genuinely correct: `App.tsx` pasted as prose must not become a link. What lacks justification is that Paste As and the Link property normalize (or don't) differently:
- **Paste As:** Writes `linkPaste(target.url, …)` with the URL **raw** (`pasteAsMenu.ts:121`).
- **Link property:** `linkValueFromEdit` normalizes (`linkValue.ts:61,94`).
- **Insert Link:** Normalizes (`menu.ts:52`).

**C. The URL is classified twice per plain paste.** `linkFor` calls `pastedUrl(text)` (`pasteLink.ts:21`) so it can look up the title cache. Then `decidePaste` calls `pastedUrl(input.clipboard)` again (`pasteDecision.ts:30`). `trimmedRange(docString(…), sel.from, sel.to)` is likewise computed in both `linkFor` and `writeLink`.

**D. Paste As classifies twice per pick: once in main, once in the renderer, on two separate clipboard reads.** The two reads are `Desktop/Actions/editorMenu.ts:105` and `pasteLink.ts` `pasteAs` (`host.clipboard.read()`). `pasteAsWrite` is therefore total over target × form and returns `null` for pairs the rows never offered (`pasteAsMenu.ts:105-106,116,120`). Most of that totality is type-forced, because the form arrives as a string; see §8.

**E. "Write a formatted link that may await a title" has two shapes and two dispatchers.**
- **Shapes:** `LinkPaste {kind, text, target, wantsTitle}` (`linkValue.ts:124-129`) and `LinkActionText {insert, url, wantsTitle}` (`linkFormat.ts` top). `formatted()` in `linkFormat.ts` only renames fields between them.
- **Dispatch + `awaitTitle` + `titles.resolve`:** Written in `pasteLink.ts` `writeLink` and in `linkFormat.ts` `applyUrlLinkAction`. A third call to `resolve` is in `cellStatic.tsx` `menuTarget`'s `url` arm.

**F. Page Copy Link is written twice, at `pageMenuActions.ts:51-53` and `gripMenu.ts:91-92`.** Both write `connectionText(title, undefined, heading)` but use different doors (`dialer` vs `host.clipboard`) and different title sources (`titleFromPath(path)` vs `host.pageTitle()`). The form is identical, and the split is forced by the editor's layering (see §8), so it's acceptable.

**G. Three "paste it plain" commands.** The copies differ as follows:

| Command | Bare URL clipboard | `[Home](url)` clipboard | Selection + URL |
|---|---|---|---|
| Paste Without Formatting (`'literal'`) | the text as copied | `[Home](url)` | replaces the selection |
| ⌘⇧V (inverse) | the text as copied (no selection) | the text as copied | **formats** instead of wrapping |
| Paste As ▸ Plain Text (`'plain'`) | `url`, trimmed | **`url`** (label stripped; `pasteAsMenu.test.ts:101`) | replaces the selection |

On a bare URL, all three write the same thing. Plain Text's only distinct behavior is "strip a copied markdown link to its address", which its label doesn't say.

### 3. Odd-Ones-Out

- **Rectangle ⌘V skips link formatting:** `MarkdownTable.tsx:244-252` writes `cellToSource(text)`, so pasting an address over a cell rectangle gives a bare URL, while the same paste into the live cell gives a formatted link. The rectangle path has no view and no `literalAt`, so it can't reuse `linkFor` today. This is drift rather than a decision, since nothing comments on it.
- **Dropping an address doesn't format it:** Paste formats an address and drop doesn't (inferred: CM6 default `input.drop`). It's arguably fine, but it's undocumented.
- **Page Title is offered for addresses that can never fetch a title:** Paste As offers Page Title for any `isValidLink` address, mailto and schemeless included (`pasteAsMenu.ts:59-62`). `linkPaste` sets `wantsTitle` without an http gate (`linkValue.ts:142`). `LinkCell` gates the same fetch on `isHttpLink` (`LinkCell.tsx:33`), and main's `linkTitles.ts:9` refuses non-http. So Paste As ▸ Page Title on `mailto:` writes the fallback label and leaves a `pendingTitles` entry that never settles (inferred from `pendingTitle.ts:56-57`: it `continue`s while `get` is null).
- **Paste As doesn't normalize addresses:** Paste As writes a schemeless address unnormalized, while the Link property and Insert Link normalize (§2B).
- **The Link property refuses a value its own display draws:** The Link property refuses `[[#Heading]]` at commit (`resolve('')` → phantom → `undefined`), yet `LinkCell.tsx:27,75-76` draws and opens `[[#Heading]]` via `holder`. Verified on the commit side through `pageIndex.ts:34-36`. A hand-edited or pre-existing value displays, but the same text retyped is refused.
- **Copy Link → Paste As round trip fails:** Copy Link on a heading (`[[T#H]]`, from the page menu or the heading grip) round-trips through plain paste and through the Link property. Through Paste As it yields **no link rows** (F-042), so the app's own copy output is refused by its own Paste As.
- **Footnote is offered on any non-empty clipboard:** Paste As ▸ Footnote appears on any non-empty clipboard (`pasteAsMenu.ts:79`), including a copied `[^label]` reference (the citation menu's own copy output), which creates a footnote whose text is a reference marker. This is minor and left as-is.
- **Address Copy Link writes `target.url` raw and drops the alias.** That's defensible, since the label is "Copy Link". Pasting it back formats it per Default Link Format only if it carries an explicit scheme. A schemeless `[x](example.com)` copies as `example.com`, which a plain paste then leaves as prose (`pastedUrl` refuses it). The app's own copy fails to round-trip through ⌘V.

### 4. Self-Induced Machinery

- **`pasteDecision.ts` as its own module:** Its stated reason, "serves both editors", no longer holds, because `pasteLink` sits in `inlineSurface` (`surface.ts:42-53`), which page, cell, and Text all mount. Its decision is also a subset of `pasteAsWrite`: the bare-caret arm `linkPaste(target, format, title)` (`pasteDecision.ts:46`) is exactly `pasteAsWrite({kind:'url', url}, format, title)` (`pasteAsMenu.ts:121`). The plain paste is "Paste As with form = Default Link Format, plus the selection-wrap axis". The module exists because the plain paste and Paste As were built as separate features.
- **`PasteInput` + `LITERAL` + `PasteDecision`:** These exist to make `decidePaste` pure. `linkFor` then has to pre-run `pastedUrl` to fetch the title before calling it (§2C). Passing the cache getter, or folding the decision into the Paste As module, removes the double classification.
- **`wholeWikiLink` (`pasteAsMenu.ts:30-33`):** Exists only because `pasteAsTarget` predates or ignores `parseConnectionText`.
- **`TextPaste`/`LinePaste` vs `LinkPaste` (`pasteAsMenu.ts:89-97`):** A three-way union whose `kind` drives `pasteAs`'s three writers. That's fine, but `LinkPaste.kind: 'link'` (`linkValue.ts:125`) exists only to discriminate in this union and in `PasteDecision`.
- **`LinkActionText` + `formatted()` in `linkFormat.ts`:** A rename of `LinkPaste`, plus a second dispatch-with-`awaitTitle` (§2E).
- **The renderer-side second clipboard read in `pasteAs`:** Reading in main at right-click time is required (§8). The renderer's re-read exists because the reply is a bare action string. If the reply carried the text main classified, the re-read, the race window, and the second `pasteAsTarget` would all go. The cost is a reply-type change in `bridge.ts:266` and `handlers.ts:51`, and Paste Without Formatting from the Edit menu still needs `clipboard:read`, so the channel stays. The net is about 0, so it isn't recommended on its own.
- **`composeWebpageEmbedLine(label, url)` (`links.ts:27-30`):** Its only production caller passes `''` (`pasteAsMenu.ts:119`), and its "ONLY assembly path" comment is false, since `embedInsert.ts` `webpageInsertAtCaret` writes `![]()` by hand. The `label` parameter is test-only (`detect.test.ts:420-423`) unless F-042's alias-carry gives it a caller.

### 5. Confusing Names

- **"plain" vs "literal":**
  - `PASTE_PLAIN_ACTION = 'paste:plain'` (`editorMenu.ts:41`) dispatches `pasteAs(view, 'literal')` (`menu.ts:68-69`).
  - The `PasteAsForm` value `'plain'` (`pasteAsMenu.ts:19,61,118`) is a different thing: "the address alone".
  - `{kind:'literal'}` (`pasteDecision.ts:16-18`) and `literalAt` (`pasteLink.ts`) mean "leave the clipboard as-is".
  - `writePlain` (`pasteLink.ts`) writes either.

  The vocabulary is one word for two concepts and two words for one.
- **`linkPaste` / `LinkPaste`:** Its own doc says it serves "paste, Paste As, Format rewrite" (`linkValue.ts:136`), and `linkFormat.ts` `formatted` uses it for Format ▸. It's a formatted-link write rather than a paste.
- **`pasteLink` vs `linkPaste`:** `pasteLink` is the CM extension (`pasteLink.ts:111`) and `linkPaste` is the builder (`linkValue.ts:137`). They're anagrams with different jobs.
- **`parsePastedLink`:** Runs on every Link-property commit, typed or pasted (`linkValue.ts:89`). "Pasted" is wrong.
- **`pastedUrl`:** Means "an explicitly-schemed web address"; nothing about it is paste-specific. Its sibling copies are named `isWebUrl` (`webGuests.ts:18`) and inline conditions.
- **`pasteAsTarget` / `PasteAsTarget`:** Duplicate the existing `LinkTarget` (`linkValue.ts:11-13`) with fewer fields, which is exactly why alias and heading are lost.
- **"Copy Link" on an address:** Copies an address, while "Copy Link" on a page copies a connection. It's the same label for different syntaxes, which is defensible because each round-trips into its own kind.

### 6. Approaches

The baseline is post-Link-Gestures. Production lines only. The counts are estimates from reading; nothing has been typed.

#### Approach 1: One Link Reader (Resolves F-042 at Its Cause)

`readPastedLink(text, resolve?) : LinkTarget | null` goes in `linkValue.ts`, or, better named, `readLinkText`. It reuses `parseConnectionText`, `MD_LINK`, `targetTitle`/`targetFragment`, `isValidLink`, and `normalizeLinkUrl`, and returns the existing `LinkTarget`. The rules:
- A whole connection is a page with its heading and alias.
- A markdown link's title-shaped target is a page when it resolves, or, without a resolver, when it isn't a valid address. The fragment becomes the heading and the label the alias.
- An empty title with a fragment is refused, which also fixes the `[x](#H)` defect.
- Anything else is an address if valid, normalized.

`pasteAsRows`/`pasteAsWrite` take a `LinkTarget`, and `linkValueFromEdit` calls the reader with `resolveTitle`.

- **Deleted:**
  - `pasteAsMenu.ts`: `wholeWikiLink` (4), `PasteAsTarget` (1), `pasteAsTarget` (13) → −18.
  - `linkValue.ts`: `parsePastedLink` (15) → −15.
- **Added:**
  - The reader: about +14.
  - `pasteAsWrite`'s page arms carrying alias and heading: +2.
  - Embedded Page withheld for a headed page via `embeddableTitle`: 0.
  - `linkValueFromEdit` switching to the reader: +2.
- **Net:** −33 + 18 ≈ **−15**, in line with the audit's −14.
- **User-visible behavior:**
  - Paste As keeps alias and heading.
  - `[[T#H]]` (Copy Link's own output) offers Connection and Markdown Link.
  - `[x](example.com)` offers address rows.
  - `[x](#H)` offers nothing instead of writing `[[]]` or deleting the selection.
  - Paste As normalizes schemeless addresses.
- **Depends on:** Nothing outside the surface. F-114 stays unfixed. Without a resolver in main, `[x](Notes.md)` offers address rows. Fixing F-114 only to settle that edge isn't worth it.

#### Approach 2: One Paste Pipeline (Recommended; Includes Approach 1)

Plain paste, the inverse chord, Paste Without Formatting, and Paste As become one decision. `pasteAsWrite(target, how, ctx)` in `pasteAsMenu.ts`, where `how` is `PasteAsForm | 'auto' | 'inverse'` (a union + switch, per the project rule), absorbs `decidePaste`'s selection-wrap and inverse axes. `pasteDecision.ts` is deleted.
- **Collapsed entries:** In `pasteLink.ts`, `linkFor` and the bodies of `pasteAs` and `keydown` collapse into one `paste(view, text, how): boolean`, called synchronously by the `paste` event (it must claim the event on the decision alone) and after the IPC read by the chord and the menu.
- **One title-pending write:** `writeLinkAt(view, from, to, link, userEvent)` lives once, in `pendingTitle.ts`, beside `awaitTitle`. Both `pasteLink.ts` and `linkFormat.ts` `applyUrlLinkAction` call it, and `LinkActionText`/`formatted()` give way to `LinkPaste`.
- **One plain command:** Paste As ▸ Plain Text is removed. Paste Without Formatting sits directly under it, and its only distinct behavior (stripping a markdown link to its address) has no other request behind it. Rename the vocabulary to one word ("literal" or "plain") throughout.
- **One web-address predicate:** `isWebAddress` in `urlPath.ts` replaces the four `WEB_ADDRESS && isValidLink` copies. Use it for the ImagePicker/`adoptFile` too only if §8's localhost trap is accepted.

- **Deleted:**
  - `pasteDecision.ts` (47) → −47.
  - `pasteLink.ts` → about −20: `linkFor` (23) and the duplicated read/guard/title-lookup code in `pasteAs`/`keydown`, partly re-added as one `paste`.
  - `linkFormat.ts`: `LinkActionText` (5), `formatted` (8), and its dispatch block (≈10) → −23.
  - The Plain Text row and its arm: −3.
  - `webGuests.ts:17-18` → −2.
  - Approach 1 → −15.
- **Added:**
  - The wrap/inverse arms in `pasteAsWrite`: about +14.
  - `writeLinkAt`: about +14.
  - `isWebAddress`: +2.
- **Net:** −110 + 30 ≈ **−80**. The ±15 uncertainty is mostly in how much of `pasteLink.ts` survives.
- **User-visible behavior:** Approach 1's changes, plus Paste As loses Plain Text. Nothing else changes; the decision outputs are identical.
- **Depends on:** `linkFormat.ts` and `pendingTitle.ts` (the Format/menu scout's surface). Lands after Link Gestures, which edits `linkFormat.ts`.

#### Approach 3: Approach 2 + the Rectangle and Copy-Side Odd-Ones-Out

- **Rectangle ⌘V:** `MarkdownTable.tsx:244-252` routes a single-line non-table text through the same `pasteAsWrite(…, 'auto')` (no selection and no view context, so the format axis comes from settings and the title from the cache), so an address formats there too. About +3.
- **`composeWebpageEmbedLine`:** Becomes `![${escapeAlias(alias ?? '')}](${url})` written once and used by both `pasteAsWrite` and `webpageInsertAtCaret`; the false "ONLY" comment goes. About −2.
- **`[[#H]]` commits:** `linkValueFromEdit` admits `[[#H]]` (the reader with a holder-aware resolver), matching what `LinkCell` draws. About +2.
- **Net:** Approach 2 + 3 ≈ **−77**. These changes are behavioral consistency fixes rather than line wins, and each is independently skippable.

### 7. Would Go False

- **`.claude/Features/MarkdownPM.md:107`:**
  - Approach 1: "a copied connection or markdown link offers Connection, Markdown Link, and Embedded Page" (its current wording is already false for headed connections).
  - Approach 2: "Plain Text" in that sentence.
- **`MarkdownPM.md:97`:** Approach 2 falsifies "`Core/Actions/pasteAsMenu.ts` — so the renderer and main can't disagree" only if the reply-carries-text variant were taken. Otherwise it's unchanged.
- **`MarkdownPM.md:33`:** Approach 2 needs no edit. Approach 3: the rectangle paste now formats too ("pasted anywhere in the editor" becomes true).
- **`.claude/Features/PropertiesPM.md:83`:** Approach 1: markdown-link-to-address storage (the audit names this sentence).
- **`.claude/Features/DesktopPM.md:26`:** Unchanged.
- **`pasteDecision.ts:1,20`:** Deleted along with the file.
- **`pasteAsMenu.ts:78`:** The comment changes if the reader's newline rule moves. **`pasteAsMenu.ts:104`:** Stays.
- **`linkValue.ts:131,136`:** The "Every writer of a formatted link…" claim stays true and becomes literally true once `writeLinkAt` exists.
- **`linkFormat.ts` `applyUrlLinkAction`:** The "Announces the same anchor the paste path does" comment goes, since the write is shared.
- **`links.ts:27`:** "The ONLY assembly path" (already false).
- **Tests:**
  - **`pasteAsMenu.test.ts`:** 18 references to `pasteAsTarget`/`'plain'`. `:42-43,51,70` (Plain Text in the row lists), `:100-101,131` (`'plain'` writes) go false under Approach 2.
  - **`pasteDecision.test.ts` (132 lines):** Its 22 `decidePaste`/`pastedUrl` calls move to `pasteAsWrite(…, 'auto'|'inverse')`.
  - **`pasteLink.test.tsx:212`:** `pasteAs(plain, 'plain')`.
  - **`linkValue.test.ts:133,139`:** These pass unchanged.
  - **`detect.test.ts:420-423`:** "the ONE assembly path".

### 8. Traps

- **Main must read the clipboard and build the Paste As rows (required, not self-induced).** The renderer's `contextmenu` handler can't read the clipboard synchronously. `askEditorMenu` parks the request until Chromium's `context-menu` event (`Desktop/Actions/editorMenu.ts:25-31,43-50`), so a renderer that awaited `clipboard:read` before asking would arrive after the event and get no editor block. Classifying in main is therefore forced. Only the *lack of a resolver* there is F-114's doing, and it costs a single edge case (`[x](Notes.md)`).
- **`clipboard:read` channel:** It can't go. The ⌘⇧V chord (a keydown with no `clipboardData`, per `bridge.ts:71`), Paste Without Formatting from the Edit menu (`commandRouter.ts:66-70`), and rectangle ⌘V (`MarkdownTable.tsx:245`) all need it.
- **Two clipboard doors (`dialer().ask('clipboard:write')` in `Interface/Menus` vs `host.clipboard.write` in the editor):** These look like duplication, but `Core/MarkdownPM` imports no `Platform/dialer` (verified by grep). The host facet is how the editor stays host-agnostic and harness-testable (`Testing/editorHarness.ts:112`). The same applies to `gripMenu.ts:92` vs `pageMenuActions.ts:52`.
- **`literalAt` in `pasteAs` overrides an explicit form:** It looks like it contradicts "the user picked". It doesn't, because a picked form inside a destination would nest a link inside the one being authored (`pasteLink.ts` comment in `pasteAs`, test `pasteLink.test.tsx:137-170`).
- **`view.dom.isConnected` after each async read:** It's real. A table cell's editor is destroyed when its cell deactivates while the native menu stands open (`pasteLink.ts` `pasteAs` comment). It must survive any merge.
- **`view.state.readOnly` checks before dispatch:** These are real. The read-only change filter drops the transaction silently, so the paste event would be claimed and nothing written.
- **`event.clipboardData?.` can be null:** That's CM's `brokenClipboardAPI` path. Keep the optional chain.
- **Every paste write tagged `userEvent: 'input.paste'`:** It's load-bearing. `CellEditor.tsx:151-163` diverts table payloads on it, and `tableGuard.ts:28` keys on it, as does the citation guard's relocation rescue (per `tableGuard.ts:25`). A shared `writeLinkAt` must take the `userEvent` from its caller, because Format ▸ (`applyUrlLinkAction`) is not a paste and must not enter those filters.
- **`pastedUrl` being stricter than `isValidLink`:** This is correct. Don't "unify" it into `isValidLink`, or `App.tsx`/`3.14` pasted into prose becomes a link (`pasteDecision.ts:20`). Unify only the predicate's *spelling* (`isWebAddress`).
- **ImagePicker/`adoptFile` using `WEB_ADDRESS` alone:** Swapping in `isWebAddress` would refuse dotless hosts such as `http://localhost:3000/img.png`, because `isValidLink` requires a dot (`urlPath.ts:32`). Leave them on `WEB_ADDRESS` unless that refusal is wanted.
- **`pasteAsWrite`'s null arms (`pasteAsMenu.ts:116,120`):** They look like ghost guards for a clipboard that changed under the menu. They're mostly type-forced, because the form arrives as a string-sliced action (`menu.ts:73`) over the full `PasteAsForm` union. They shrink only if the form type is split per target kind.
- **The re-check in `writeLine`:** `writeLine` re-checks `embedSeatAt` (`pasteLink.ts` `writeLine`) after main already gated `embedSeat`. The document can move while the native menu stands open, so the re-check is real.
- **`connectionText`'s alias suppression:** `connectionText` drops an alias equal to the title (`connections.ts:91-94`). Carrying aliases through Paste As (Approach 1) relies on this, so `[[Bar|Bar]]` can't be produced.
