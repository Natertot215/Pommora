## Scout 2: Links Outside the Editor (Property Values, Views, Tiles)

In-flight files (`Core/MarkdownPM/Links/*`, `decorations.ts`, `Tables/cellStatic.tsx`, `Engine/tokens.ts`) are cited by function name only. "Verified" means read in source; "Inferred" is marked.

### Short Answers

- **Write → Parse → Resolve → Display → Open:** A Link value is stored as one string: `[[Title#H|Alias]]`, `[alias](url)`, or a bare `url`. It's decoded by `linkEntry` (`Core/Connections/linkValue.ts:16`, via `decodeValue` at `Core/Properties/propertyValue.ts:73`), parsed by `readLink` (`linkValue.ts:30`) into the pre-resolution `LinkTarget`, and resolved by `resolveConnection` (`Core/Nexus/treeIndex.ts:284`), which collapses `ConnResolution` to `ConnPage | null`. It's drawn by `LinkCell`/`ConnectionCell` (`Core/Properties/Cells/LinkCell.tsx:16-97`) and opened either by the anchor's own `onClick` (`LinkCell.tsx:51-56`, `:83-91`) or by the parent's `valueClickIntent` → `{kind:'open'}` → `openWebLink` (`valueClick.ts:47-52`, plus three handlers). That gives two openers per URL value and one hand-rolled opener per page value.
- **Same Rules as the Editor:** No. A `[[Title]]` inside a **Text** value runs the editor's stack: `renderCellContent` → `linkGestures` → `resolveFollow` / `dwellTarget` / `api.menu` (`Core/Properties/Cells/TextCell.tsx:27-41,60`). The same `[[Title]]` as a whole **Link** value hand-rolls every step. *§Duplicated or Parallel Rules* lists the divergences with their mechanisms, and `ConnectionsPM.md:73` already records this as a known limitation ("Connection rendering is written twice").
- **What Collapses:** `LinkTarget` and `MdTarget` aren't duplicates; they're the pre- and post-resolution stages of the same link. The parallel machinery is everything *between* them on the value side: `resolveConnection`, `linkResolve.ts`, `ConnectionCell`, and `linkValueMenuTarget`'s own resolution. Once a Link value reads through `PageIndex.resolve` → `titleTarget` → `heldTarget`, it feeds `mdLinkClass` / `resolveFollow` / `dwellTarget` / `linkMenuTarget` unchanged.

---

### 1. Surface Map

| File | Lines | Rule(s) It Owns | Read By | Why It's Separate |
|---|---|---|---|---|
| `Core/Connections/linkValue.ts` | 144 | `linkEntry` (yaml nesting unwrap), `wholeValueLink`, `readLink`/`parseLink`/`serializeLink` (value grammar), `parsePastedLink` (edit-time classify+resolve), `urlClickTarget`, `linkEditText`, `linkAlias`, `linkValueFromEdit`/`linkValueFromRename` (field writers), `linkDisplayText` (format), `linkMarkdown`/`linkPaste`/`LinkPaste` (paste formatting) | `propertyValue.ts:73,99`, `scan.ts:118,134`, `rewrite.ts:125`, `cascade.ts:96-97,209`, `LinkCell.tsx:9`, `valueClick.ts:6`, `parseEditorValue.ts:3`, `PropertyValueInput.tsx:10`, `connectionMenuActions.ts:11`, `filter.ts:149`, `sort.ts:62`, `WebTile.tsx:7`, `pasteAsMenu.ts:14`, and the editor's `pasteDecision`, `pendingTitle`, `linkFormat`, `pasteLink`, `Menus/menu.ts:5` | It's the host-safe (no React, no index) home for value grammar. Three concerns share it: the value codec, the field writers, and editor paste formatting. |
| `Core/Properties/Cells/LinkCell.tsx` | 97 | Link value display (format/color/underline/title fetch) and a hand-rolled `ConnectionCell` (resolve, held heading, follow) | `Cells/Cell.tsx:131-137` | URL formats earn it; the `ConnectionCell` half (`:64-97`) duplicates the shared stack. |
| `Core/Properties/Cells/linkResolve.ts` | 8 | `resolveTitle` (live tree → canonical title) | `parseEditorValue.ts:5,39` only | It's a one-expression file that sits in `Cells/`, though no cell reads it. |
| `Core/Properties/Cells/TextCell.tsx` | 82 | Resting Text value: renders through `renderCellContent`, gestures through `linkGestures`, and follows through `resolveFollow` | `Cell.tsx:141` | It's already on the shared stack. |
| `Core/Properties/Pickers/PropertyValueInput.tsx` | 88 | Chooses the field (Number popover / TextPane / text field); link alias-vs-address mode | `PropertyPanel.tsx:531`, `TableView.tsx:233,277`, `CardValue.tsx:140` | Field dispatch. |
| `Core/Properties/Pickers/valueClick.ts` | 77 | `valueClickIntent` (link arm `:47-52`), `valueMenuIntent`, `runValueIntent` | `PropertyPanel.tsx:294,313,342`, `CardValue.tsx:84,99,106`, `TableView.tsx:143,170,283` | It's the per-type click semantics shared by three surfaces. |
| `Core/Properties/parseEditorValue.ts` | 43 | `editorText` / `parseEditorValue` (link arm → `linkValueFromEdit` with `resolveTitle`) | `PropertyValueInput.tsx:11` | Field text ↔ value. |
| `Core/Properties/propertyValue.ts` | 219 | `decodeValue` link arm (`:72-75`), `namesGonePage` (`:123-126`, its own `parseConnectionText` read) | Everywhere | It's the value schema. |
| `Core/Properties/PropertyPanel.tsx` | 571 | Link-value menu wiring (`valueMenu`, `:333-348`), the `open` handler (`:304`), and `hostConnections` → `ctx.connections` (`:164-175`) | n/a | Panel surface. |
| `Core/Views/Cards/CardValue.tsx` | 171 | Link-value menu wiring (`:114-120`), the `open` handler (`:91`) | n/a | Card surface. |
| `Core/Views/Table/TableView.tsx` | 734 | Link-value menu wiring (`:287-293`), the `open` handler (`:154`), `showFullLink` (`:680`) | n/a | Table surface. |
| `Core/Views/Pipeline/filter.ts` / `sort.ts` | 300 / 160 | Link filters and sorts by `linkDisplayText(v.value)` with no format (`filter.ts:147-149`, `sort.ts:60-62`) | Pipeline | It's deliberately format-independent (`linkValue.ts:109`). |
| `Core/Tiles/Surfaces/WebTile.tsx` | 180 | `useWebpageTitle` (`:21-30`), a second copy of LinkCell's title-fetch hook | `WebTile` | Webpage tile label. |
| `Core/Interface/Menus/connectionMenuActions.ts` | 103 | `showConnectionMenu` (shared), `linkValueMenuTarget` (`:76-103`), the value's own resolve + `ConnMenuTarget` builder | `PropertyPanel.tsx:344`, `CardValue.tsx:115`, `TableView.tsx:288` | It's parallel to `linkMenuTarget`/`tokenMenuTarget` in `connectionsApi.ts`. |

### 2. Duplicated or Parallel Rules

##### 2.1 Resolving a Connection Value: Two Resolvers Over One Index
- **Value Side:** `resolveConnection(tree, title)` at `treeIndex.ts:284-288` returns `ConnPage | null` and discards `status`. Its callers are `LinkCell.tsx:75`, `connectionMenuActions.ts:90`, and `linkResolve.ts:8`.
- **Editor / Text-Value Side:** `PageIndex.resolve` → `titleTarget` → `MdTarget` (`connectionsApi.ts`), carrying `ambiguous`.
- **Difference:** Both read `pageIndexOf(tree)` (`treeIndex.ts:270,286`), so the resolution is identical, but the value side throws away phantom-vs-ambiguous. That's **drift**: it's why `ConnectionCell` draws every connection with one `.cell-connection` color (`UIX/Table/table.css:258-262`), whether it's resolved, phantom, or ambiguous. The editor and TextCell draw `md-connection-phantom` / `-ambiguous` (`renderCellContent`).

##### 2.2 The Held `[[#Heading]]` Rule, Written Three Times
- `heldTarget` (`linkClicks.ts`) is used by `linkGestures` and `resolveFollow` (TextCell, body).
- `LinkCell.tsx:75`: `target.title ? resolveConnection(...) : (holder ?? null)`, a hand-written copy.
- `linkValueMenuTarget` (`connectionMenuActions.ts:89-91`) has **no** held rule. `resolveConnection(tree, '')` hits `byTitle.get('')`, which `buildPageIndex` never fills (`pageIndex.ts:26`), so it returns null and the menu falls back to the generic `cellMenuModel({kind:'link'})` (`PropertyPanel.tsx:346`, `CardValue.tsx:116-121`, `TableView.tsx:289-293`). **Verified by reading:** a `[[#Setup]]` Link value follows to its holder on click (`LinkCell.test.tsx:42`) but right-clicks to "Edit / Rename / Clear" with no page rows, where a Text value's `[[#Setup]]` gets the page menu. That's **drift**.

##### 2.3 Opening a Page Link: Bypasses the Connections Bundle
- `ConnectionCell` calls `useSession.select(...)` directly (`LinkCell.tsx:87-90`).
- TextCell and the editor call `resolveFollow` → `openPage(api, …)` → `api.open`. `connectionsOf` honors `connectionsOpenInPreview` and the `'window'` mode there (`Core/Session/pageConnections.ts:17-19,37-39`).
- **Verified by reading:** `Cell.tsx:131-137` doesn't pass `ctx.connections` to `LinkCell`. In a window's side pane, `WindowTabBody.tsx:160` passes `useConnections('window')` to `PropertyPanel` (`:215-219`), which flows into `ctx.connections` (`PropertyPanel.tsx:172`). A Text value's `[[Page]]` there opens in the window's tab strip (`openWindowTab`), while a Link value's `[[Page]]` calls `select` and lands in the main content view. Under the Open in Preview preference, a Link value also ignores it. In a glance (`'inert'` mode, `GlancePane.tsx:216`), the shared stack opens nothing; Link values reach PropertyPanel only via `hostConnections` (inferred: glance doesn't mount a PropertyPanel, so this is unverified there). This is a **user-visible defect**.

##### 2.4 Displaying a Page Link: The Heading Is Dropped
- `ConnectionCell` shows `target.alias ?? (target.title || '#' + heading)` (`LinkCell.tsx:76,93`), so `[[Alpha#Setup]]` reads "Alpha" and the heading is invisible. A bare one reads `#Setup`.
- `renderCellContent` (TextCell, cell, editor) draws `Alpha § Setup` and `§Setup`, with heading-missing marking and Heading Link Style.
- `linkDisplayText` (`linkValue.ts:110-113`) mirrors the cell ("Alpha"), so filter and sort agree with the cell but not with the editor. That's **drift**.

##### 2.5 Hover Preview
- TextCell: `onPointerOver` → `dwellTarget` (via `linkGestures`).
- LinkCell: none. A Link value never glances, whether it's a page or an address. That's **drift** (`ConnectionsPM.md:73` names it).

##### 2.6 Opening a URL: Two Openers on One Click
- The anchor `onClick` → `openWebLink(url)` fires for **any** non-empty `url` (`LinkCell.tsx:42,51-56`) and `stopPropagation`s.
- Clicking the padding bubbles to `valueClickIntent` → `urlClickTarget` (`linkValue.ts:64-68`), which opens only when `isValidLink`; otherwise it returns `{kind:'edit'}` (`valueClick.ts:47-52`). The handlers are `open: ({url}) => openWebLink(url)` at `PropertyPanel.tsx:304`, `CardValue.tsx:91`, and `TableView.tsx:154`. `{kind:'open'}` has no other producer (`git grep "kind: 'open'"`).
- **Difference:** For an invalid address (e.g. a hand-written `foo`, or `[x](Some%20Page)`, which `readLink` reads as url `Some%20Page`), clicking the text opens it, while clicking the padding edits it. `link:open` refuses it host-side (`Core/Web/handlers.ts:39-40`). With `openLinksInApp` on, `openWebLink` → `openBrowser(url)` (`openWebLink.ts:9`, `windowSlice.ts:247`) has no validity gate. *Inferred:* WebWindow opens on a non-address. The editor never follows an invalid target (`resolveFollow`'s `'invalid'` arm). This is **drift**, and the anchor's opener is the odd one.

##### 2.7 The Link Look
- The editor, cells, and Text values use `mdLinkClass(conn, target, ownKeys)` (`decorations.ts`): `md-link` / `md-link-invalid` / `md-connection-resolved` plus heading-missing.
- LinkCell uses `.cell-link` (+ `.cell-link-underline`) with an inline `solidColorCss(def.link_color)` (`LinkCell.tsx:46-47`, `table.css:252-257`), and an invalid address draws exactly like a valid one.
- **Difference:** The per-property color and underline **earn themselves** (`PropertiesPM.md:81`). The missing invalid tone is **drift**.

##### 2.8 Title Fetch for an Address: Two Hooks
- `LinkCell.tsx:33-38` and `WebTile.tsx:21-28` are the same four lines: `wantsTitle` gate, the `s.linkTitles[url]` selector, the `resolveLinkTitle` selector, and the effect. The editor's third reader is imperative (`editorHost.tsx:69-71`) and is correctly different, since it's a facet and not a hook.
- **Difference:** Only the `wantsTitle` predicate differs. LinkCell adds `!alias && isHttpLink`; WebTile uses `label === ''`. That's mechanical duplication.

##### 2.9 Four Parsers Over Copied/Typed Link Text
- `readLink` (`linkValue.ts:30`): connection, else `[a](u)` → url, else bare url. A markdown link naming a page reads as **url**.
- `parsePastedLink` (`linkValue.ts:48-62`): a markdown link naming a page reads as **page** (with resolve).
- `pasteAsTarget` + `wholeWikiLink` (`Core/Actions/pasteAsMenu.ts:28-47`): F-042 already covers these.
- `namesGonePage` (`propertyValue.ts:123-126`) calls `parseConnectionText` directly, not `readLink`. It's equivalent for a connection, but it's a fourth entry point.
- **Consequence (verified by reading):** a Link value hand-written as `[x](Old)` is indexed as a backlink to *Old*. `valueLinks` skips only `readLink(...).kind === 'page'` (`scan.ts:134`), then `linksIn` reads the markdown link as a page mention (`scan.ts:99-104`). A rename doesn't rewrite it, though: `patchOf` sends Link-typed keys only through `rewriteFrontmatterConnections` (`cascade.ts:199-204`), which skips non-`page` `readLink` results (`rewrite.ts:125-126`). Delete doesn't strip it either (`cascade.ts:95-99`). It displays and opens as an (invalid) address (§2.6). The app's own field never writes this form, because `linkValueFromEdit` converts it to `[[Title|x]]` (`linkValue.ts:89`, `:59-60`). So the state comes from hand-edits and external writers (an agent or Obsidian). **Drift:** the value side answers "is `[x](Page)` a page?" yes when typed, no when read.

##### 2.10 Two Value-Menu Builders Beside the Token Ones
- `linkValueMenuTarget` (`connectionMenuActions.ts:76-103`) resolves on its own and builds `ConnMenuTarget` by hand, narrowing `ConnUrlAction` → `ConnEditAction` with a filtering wrapper (`:98-100`).
- `linkMenuTarget` / `tokenMenuTarget` (`connectionsApi.ts`) build from `MdTarget`.
- **Difference:** The value menu genuinely needs `surface:'cell'`, `editable`, `hasAlias`, and `onCell`, which the surface earns. Its separate resolution doesn't (§2.1, §2.2).

### 3. Odd-Ones-Out

- **LinkCell Ignores `ctx.connections`:** Every other link-bearing value (TextCell via `Cell.tsx:141`, TextPane via `PropertyValueInput.tsx:50`) reads it. That's not earned (§2.3).
- **The Menu Is Wired at the Parent, Three Times:** `TableView.tsx:287-293`, `CardValue.tsx:114-121`, `PropertyPanel.tsx:339-347` each run `linkValueMenuTarget(...)` → `showConnectionMenu`, with the generic menu as fallback. TextCell owns its link menu through `linkGestures` → `api.menu`, which *is* `showConnectionMenu` (`pageConnections.ts:43`). It's partly earned: the editable actions need each parent's `runMenuIntent` closure.
- **`valueClickIntent`'s Link Arm Is Asymmetric:** A URL returns `open`, while a page returns `null` ("its own text opens it", `valueClick.ts:21,51`). So a page value's padding click does nothing, while a URL value's opens. That's not earned. It follows from §2.6's double opener.
- **`linkResolve.ts` Lives in `Cells/`** but serves only `parseEditorValue.ts`. It's misplaced.
- **`resolve?` Is Optional** on `linkValueFromEdit` and `parsePastedLink` (`linkValue.ts:48,85`). The only production caller always passes it (`parseEditorValue.ts:36-40`), and every test call passes it (`linkValue.test.ts:133-157`, while `cardValueInput.test.ts:24-29` goes through `parseEditorValue`). Without it, `named` always returns null. The optionality has no consumer.
- **Text Values Filter and Sort on Raw Markdown:** `filter.ts:144-146` and `sort.ts:58-59` read `v.value`, while Link values use their shown text (`filter.ts:147-149`). A Text value `[[Page|Alias]]` sorts by `[[`. It's minor, and *inferred* to be unintentional.

### 4. Self-Induced Machinery

- **`urlClickTarget` + the `{kind:'open'}` Intent + Three `open` Handlers** (`linkValue.ts:64-68`, `valueClick.ts:18,49-50`, `PropertyPanel.tsx:304`, `CardValue.tsx:91`, `TableView.tsx:154`). They exist so a padding click opens, because the anchor swallows its own click. One opener suffices. Either the anchor only `preventDefault`s and lets the intent open (this deletes LinkCell's opener and fixes §2.6's invalid-open), or the anchor owns it and the intent goes. Removing `open` outright changes padding clicks (from open to edit).
- **`resolveConnection`'s Null-Collapse** (`treeIndex.ts:283-288`) exists only for the value side. Its doc says it's "behind both a Link property's paste gate and the connection a Link cell draws". When LinkCell and the value menu read `PageIndex` / `titleTarget`, its last caller is `linkResolve.ts` (§6 D).
- **`ConnectionCell`** (`LinkCell.tsx:64-97`) re-derives resolve, held heading, open, and new-tab chord because LinkCell was built before `linkGestures` / `resolveFollow` were shared. TextCell proves the shared stack runs on a resting value surface.
- **`linkValueMenuTarget`'s `apply` Filter** (`connectionMenuActions.ts:98-100`) exists only to narrow the union for a cell surface whose model never offers format or unlink rows (`connectionMenu.ts:96-97`). That's a type adapter, not behavior.

### 5. Confusing Names

- **"Target" Means Six Things:** `LinkTarget` (`linkValue.ts:11`, a parsed but unresolved page/url), `MdTarget` (resolved, `connectionsApi.ts`), `linkTarget(text, tk)` (`tokens.ts`, the raw destination **string**), `encodeLinkTarget`/`decodeLinkTarget` (`links.ts:68,77`, a title ↔ destination codec), `targetTitle`/`targetFragment` (`links.ts:94,102`), and `ConnMenuTarget` plus `linkMenuTarget`/`tokenMenuTarget`/`linkValueMenuTarget`/`cellLinkTarget`/`PasteAsTarget`/`pasteAsTarget`. `LinkTarget` and `linkTarget` collide by case alone and name different stages.
- **`linkValue.ts`** reads as "the Link property value", but half its exports serve the editor's paste (`linkPaste`, `linkMarkdown`, `LinkPaste`: `pasteDecision.ts:4`, `pendingTitle.ts:3`, `linkFormat.ts:4`, `pasteLink.ts:3`, `pasteAsMenu.ts:14`, `Menus/menu.ts:5`). Its internal `type LinkValue` (`:7`) is `{url, alias}`, which isn't the property value either (`PropertyValue` `kind:'link'` is a string).
- **`readLink` vs `parseLink` vs `parsePastedLink` vs `parseConnectionText`** (`linkValue.ts:30,37,48`, `connections.ts:74`): "read" and "parse" are used for the same act at different layers, and `parseLink` returns a url+alias while `readLink` returns a tagged target.
- **Resolver Names:** `resolveTitle` (`linkResolve.ts:7`, returns a canonical title string), `ResolveTitle` (type, `linkValue.ts:9`), `resolveConnection` (`treeIndex.ts:284`, returns a page), `PageIndex.resolve` (returns a status), `titleTarget`/`resolveMdTarget` (return an `MdTarget`). That's five names for one lookup.
- **`ConnectionCell` / `.cell-connection`** vs the `md-connection-*` classes the rest of the app draws connections with.
- **`linkDisplayText`** vs `LinkDisplay` (`properties.ts`): the function also handles connections, which have no `LinkDisplay`.

### 6. Approaches

Baseline line counts come from `wc -l` (production). Deltas are estimates from reading.

##### A: A Link Value Naming a Page Rides the Shared Stack (Lead)
- **Deletes:** `ConnectionCell` (`LinkCell.tsx:64-97`, −34), the page branch and its imports (`isCmd`, `resolveConnection`, the `LinkTarget` type; about −5), and `.cell-connection` (`table.css:258-262`, −5).
- **Adds:** LinkCell's page kind renders `<TextCell text={showFullLink ? unaliased : raw} connections={connections} holder={holder} />` (+3, where `unaliased` is `connectionText(title, undefined, heading)` to keep `TableView.tsx:680`'s alias-popover behavior). `Cell.tsx:131-137` passes `ctx.connections` (+1).
- **Menu Seam:** TextCell's `linkGestures` would otherwise open the read-only link menu and `stopPropagation`, pre-empting the parent's editable value menu. That makes A depend on B. If it's taken alone, TextCell has to decline the menu (+2 for an optional `menuAt` passthrough, which `linkGestures` already accepts).
- **Net (A Alone):** −34 − 5 − 5 + 3 + 1 + 2 ≈ **−38**.
- **User-Visible Changes:**
  - Window and Open-in-Preview routing are honored.
  - Phantom and ambiguous tones show.
  - `Alpha § Setup` and `§Setup` replace `Alpha` and `#Setup`.
  - Heading-missing marking appears.
  - Hovering glances.
- **Depends On:** `linkGestures` / `resolveFollow` / `renderCellContent` staying exported (they're in-flight in `cellStatic.tsx` / `linkClicks.ts`). It also inherits TextCell's F-062 gap (no `around` or `headingLinkStyle`); fix F-062 once in TextCell and both values get it.

##### B: The Value Menu Lives With the Value (Stacks on A)
- **Deletes:** The three parent `if (t === 'link')` blocks (`TableView.tsx:287-293`, `CardValue.tsx:114-121`, `PropertyPanel.tsx:339-347`'s link half; about −20). `linkValueMenuTarget`'s own resolve plus the `apply` filter go too (`connectionMenuActions.ts:81-102` → about 10 lines, built as `linkMenuTarget(heldTarget(titleTarget(api, …), own), …)` spread with the cell fields; about −12). That also fixes §2.2's `[[#H]]` menu.
- **Adds:** One `onLinkAction`-shaped prop threaded through `Cell` (+2) and passed by the three surfaces (+3 each, +9), plus the `menuAt` handed to `linkGestures` (+3).
- **Net:** −20 − 12 + 2 + 9 + 3 ≈ **−18**.
- **Behavior:** Unchanged, except the `[[#H]]` menu gains its page rows.
- **Depends On:** The `menuAt` parameter of `linkGestures` (in-flight `cellStatic.tsx`). The parents' `runMenuIntent` closures stay, so B can't be zero-add.

##### C: One Reader per Concern, Unused Machinery Out (Independent, Mostly Mechanical)
- **`useLinkTitle(url, wants)`:** One hook in `Core/Session/cacheSlice.ts` (+7) replaces `LinkCell.tsx:33-38` (−6) and `WebTile.tsx:21-28`'s body (−7, keeping the `label` fallback). Net −6.
- **One URL Opener:** The LinkCell anchor's `onClick` becomes `preventDefault` only (−4), and the click bubbles to `valueClickIntent`'s `open`. This fixes §2.6: invalid addresses edit instead of opening, and the text and the padding agree. `linkDisplayText` / the anchor render only valid URLs with the `md-link-invalid` look (+1). Net −3.
- **`urlClickTarget`** (`linkValue.ts:64-68`, −6): `valueClick.ts:47-52` reads `readLink` once and checks `isValidLink` itself (+1). Net −5.
- **`linkAlias`** (`linkValue.ts:77-79`, −4): inline `readLink(raw).alias` at `PropertyValueInput.tsx:56` (+0). Net −4.
- **`linkResolve.ts`** (−8) and **`resolveConnection`** (`treeIndex.ts:283-288`, −6, once A and B remove its other callers): `linkValueFromEdit` / `parsePastedLink` take a required `PageIndex` (dropping `ResolveTitle`, `linkValue.ts:9`, −1). `parseEditorValue.ts:39` passes `previewConnections()` (+1; it's read live at the gesture, satisfying `linkResolve.ts:1`'s concern). The two `resolve?` become required (§3). Net about −14.
- **Net C:** about **−32**.
- **Behavior:** Only the invalid-address click changes.

**A + B + C Total:** about **−88** production lines.

##### D (Optional, Cross-Scout, Behavioral): `readLink` Reads a Markdown Link Naming a Page as a Page
`readLink` gains `parsePastedLink`'s page-target arm, without resolving (+4). `parsePastedLink` reduces to "readLink, then resolve a page arm" (−8). That makes the value read, the scan, the rename, and the delete agree on `[x](Page)` (§2.9). The cost: a rename rewrites such a value through `connectionText` (`rewrite.ts:130`), which converts the form to `[[New|x]]`, and that change is visible in the file. Net about −4. It overlaps with F-042's `readPastedLink` and should be decided with the paste scout.

### 7. Would Go False

- **A:**
  - `.claude/Features/ConnectionsPM.md:73` (delete the limitation entirely, since it's resolved).
  - `Core/Properties/Cells/LinkCell.test.tsx:33,52,59` (query `.cell-connection`; expect `#Setup` text; mock `useSession.select` where the path becomes `api.open`).
  - `LinkCell.tsx:15` doc ("Opens through the sanctioned IPC").
  - `valueClick.ts:21` ("a page link, whose own text opens it" still holds, but via TextCell).
  - `treeIndex.ts:283` doc.
- **B:**
  - `Core/Interface/Menus/connectionMenuActions.test.ts:104` ("a Link value carries its heading onto the menu", signature).
  - `PropertiesPM.md:118`'s menu sentence, if it names the parent route (verify on edit).
- **C:**
  - `linkValue.test.ts:170` ("has no address to open", which uses `urlClickTarget`).
  - `valueClick.test.ts:61` (unchanged in assertions if `open` stays).
  - `linkValue.test.ts:133-157` (the resolver argument changes shape from `ResolveTitle` to `PageIndex`).
  - `linkResolve.ts:1` comment (file deleted).
  - `openWebLink.ts:1` stays true.
- **D:**
  - `PropertiesPM.md:81-83` Link sentence.
  - `ConnectionsPM.md:4` ("held as the whole value … reads as a connection") gains the markdown form.
  - `linkValue.test.ts:159` ("reads a markdown link over an address as the aliased URL") stays. A new case is needed for `[x](Page)`.

### 8. Traps

- **A Bare URL Isn't a Token.** No autolink token exists (`tokens.ts` `TokenKind` has no url kind), so `renderCellContent` would draw `https://example.com` as plain text. LinkCell's URL half (format, color, underline, title, `draggable={false}` for card drag at `LinkCell.tsx:49`) earns itself, and A is a page-kind change only. Synthesizing `[display](url)` to feed the renderer would hit the editor's page-first rule (`resolveMdTarget`): a bare `Notes.md` value would open the page *Notes* instead of `https://Notes.md`. Don't.
- **`readLink` / `linkEntry` / `wholeValueLink` Run Host-Side** (`cascade.ts:96-97,209`, `scan.ts:118,134`, `rewrite.ts:125`), where no `PageIndex` is reachable (F-114: `treeIndex.ts` imports UIX). The parser must stay resolver-free, and resolution belongs only on the renderer side.
- **`linkEntry`'s `nesting` 2** (`linkValue.ts:15-22`, `propertyValue.ts:73`) handles unquoted `[[Page]]`, which yaml reads as a nested array. It looks removable and isn't.
- **`linkDisplayText` With No Format Returns the Raw URL** for sort and filter on purpose (`linkValue.ts:109`, pinned by `linkValue.test.ts:120`). Don't fold it into the shown-format path.
- **`holder` Is Undefined for Spaces** (`valueContext.ts:18-20`), so a Space's `[[#H]]` correctly resolves nowhere. `heldTarget` with `own=null` already yields `'self'` → no follow, matching `LinkCell.test.tsx:66-69`.
- **The Value Menu's Editable Actions** (`rename`, `editLink`, `cell:clear`, `cell:hide`) close over each parent's `runMenuIntent` / `setEditing`. B can move the *call site* but not delete the closures.
- **`showFullLink`** (`TableView.tsx:680`) shows the unaliased form while the alias popover is open. A has to preserve it (accounted +1).
- **Views Read `previewConnections`, Not a Window Bundle** (`useViewHost.ts:113`). A Table or Cards view mounted in a window tab would route through preview mode for TextCell *and* (after A) LinkCell. *Inferred adjacent issue:* it's outside this surface, and A makes LinkCell consistent with TextCell, not with the window.
- **The `open` Intent:** Deleting it instead of the anchor's opener turns a URL value's padding click into an edit. Keep the intent and drop the anchor's opener (C).
