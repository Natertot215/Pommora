## Scout 7 · Link Gestures, Edits, and Menus

Baseline `75c3bcb9c`. Every claim is verified by reading unless marked *inferred*. Line counts are `wc -l` on production files. Scouts 1-5 are cited as S1-S5 where an approach composes with or contests theirs.

### 1. Surface Map

| File | Lines | Rule(s) It Owns | Read By | Why Separate |
|---|---|---|---|---|
| `Links/linkClicks.ts` | 156 | Body hit-test (`linkUnder` :46), `followTarget` :75, `heldTarget` :89, `resolveFollow` :95, `dwellTarget` :118, `linkPointer` :132 | `surface.ts` (mount), `cellStatic.tsx:35`, `TextCell.tsx:9`, `citationPointer.ts:8` | The body's pointer handler, plus the follow/dwell answers every surface shares |
| `Gestures/pointerPath.ts` | 99 | Press/click/menu/dwell discipline over any `PointerTarget` (`pointerHandlers` :30) | `linkClicks.ts:133`, `citationPointer.ts:58,96` | Shared by link and citation handlers |
| `Links/linkEdit.ts` | 173 | Wikilink authoring (`wikiAuthorTarget` :22, `applyLinkAction` :38), Enter-in-alias (`commitAliasOnEnter` :51), slot collapse and alias memory (`slotNear` :104, `leaveSlot` :116, `aliasOnLeave` :135) | `linkClicks.ts:16`, `cellStatic.tsx:34`, `markdownInput.ts:42,271`, `surface.ts:20,55` | Wikilink-specific editing |
| `Links/linkFormat.ts` | 86 | Markdown-link authoring (`linkActionText` :19, `formatted` :45, `applyUrlLinkAction` :55) | `linkClicks.ts:17`, `cellStatic.tsx:33` | The markdown-link half of the same job `linkEdit.ts` does for wikilinks (its own comment at :54 calls itself "the parallel") |
| `Links/connectionsApi.ts` | 158 | `ConnMenuTarget` :16, `ConnectionsApi` :38, `MdTarget` :46, `titleTarget`/`resolveMdTarget`/`tokenTarget` :52-74, `linkMenuTarget` :76, `tokenMenuTarget` :97, `headingMissing`/`wikiLinkView` :121-148, `openPage` :150 | Everywhere links are read | The MarkdownPM ↔ session seam for links |
| `Links/pendingTitle.ts` | 74 | Title-pending ranges and their swap | `linkFormat.ts:10`, `pasteLink.ts` | S3/S5 cover it |
| `Interface/Menus/connectionMenuActions.ts` | 103 | `showConnectionMenu` :19 (target → context → `popMenu` → run), `linkValueMenuTarget` :76 | `pageConnections.ts:43`, `TableView.tsx:288`, `CardValue.tsx:115`, `PropertyPanel.tsx:344` | The host half of the link menu |
| `Actions/connectionMenu.ts` | 122 | The pure row model (`connectionMenuModel` :80), action vocabularies, `isConnUrlAction`/`isConnCellAction` :58-62 | `connectionMenuActions.ts:2-9` | Pure model, per the Actions layer |
| `Menus/menu.ts` | 108 | `insertLinkOverSelection` :47, `applyEditorAction` :63, `editorMenu` :83 | Editor menu | Prose menu; one link writer lives here |
| `Input/edits.ts` | 819 | `linkInCode` :324, `inAliasAt` :334, `autoPair` :340, `closerEndAt` :501, `isInsideWikilink` :612, `isLiteralAt` :638, `inBracket` :646 | `markdownInput.ts`, `linkEdit.ts:14` | Pure typing transforms |
| `Input/markdownInput.ts` | 283 | `typedInput` :229 (the `]` refusal :249), the Enter chain :268-277 | `surface.ts` | Keymap and input handler |
| `Input/format.ts` | 346 | `LINKS` :55-59 and `toggleWrap` :116 (Format ▸ Link/Connection wrap and unwrap) | `menu.ts:77` via `editFor` | Inline format toggles |
| `Tables/cellStatic.tsx` | 486 | Resting cell render; `linkGestures` :397 (shared with `TextCell`); `menuAt` :288 and `menuTarget` :449 (resting-cell authoring) | `MarkdownTable.tsx`, `TextCell.tsx:11` | Resting surfaces have no `EditorView` |
| `Tables/MarkdownTable.tsx` | 645 | `initialSelect` ref :153, set non-null only by `onSelect` :468-473 | — | Hands a selection to the cell editor it mounts |
| `Tables/CellEditor.tsx` | 291 | Seats `initialSelect` on mount :248-262 | `MarkdownTable.tsx:435` | — |
| `Citations/citationPointer.ts` | 131 | Marker follow/menu (`citationPointer` :57), row follow (`citationRowPointer` :95), row menu (`citationRowMenu` :109), `followCitation` :30 | `surface.ts`, `cellStatic.tsx:36` | See §Q4 |

### Answers to the Four Questions

#### Q1: Target Shapes and Conversions

**Shapes (8):** `Token` → `MdTarget` (4 kinds, `connectionsApi.ts:46`) → hit wrappers `LinkHit` (`linkClicks.ts:24`) in the body and the anonymous `{ el, target }` (`cellStatic.tsx:436-446`) at rest → `ConnMenuTarget` (`connectionsApi.ts:16`, two arms plus three value-only fields) → `ConnMenuContext` (`connectionMenu.ts:11`). Beside them sit `LinkTarget` (`linkValue.ts:11`, Link values), `OwnPage` (`api.ts:48`), and the glance's `{ kind: 'page' | 'site' }` built inside `dwellTarget`.

**Conversions (10):** `tokenTarget`, `titleTarget`, `resolveMdTarget`, `heldTarget`, `linkMenuTarget`, `tokenMenuTarget`, `linkValueMenuTarget` (with its own resolver, `resolveConnection`, `connectionMenuActions.ts:90`), `dwellTarget`, `resolveFollow`, and `showConnectionMenu`'s rebuild into `ConnMenuContext` (:21-58).

**Redundancy that already exists:**
- `heldTarget` runs at four sites: `linkClicks.ts:58` (hit-test), `:102` (inside `resolveFollow`, so the body path converts twice), `cellStatic.tsx:411`, and `:430`. `linkGestures.linkAt` (`cellStatic.tsx:405`) returns the *unconverted* target, which is why `TextCell.tsx:41` depends on `resolveFollow` converting again.
- `ConnMenuTarget.editable` is derivable from `apply !== undefined` at every producer: `connectionsApi.ts:86` (false, no apply), `:107` (`edit !== undefined` beside `apply: edit?.wiki`), and `connectionMenuActions.ts:84` (true, apply present). The consumer already ANDs the two (`connectionMenuActions.ts:23`). S5 found this too.
- `surface`, `hideable`, and `onCell` are set only by `linkValueMenuTarget` (`connectionMenuActions.ts:83-87`), so `surface === 'cell'` is equivalent to `onCell !== undefined`.
- The url arm's `hasAlias` (`connectionsApi.ts:33`) is never read, because `connectionMenuModel` labels an external link "Rename" whatever its value (`connectionMenu.ts:84`).
- In the resting cell, `menuAt` (`cellStatic.tsx:289-290`) re-derives the span and token that `cellLinkTarget` (:443-445) already derived for the same event, and `tokenTarget` runs again at :458.

**What one shape removes:** If a hit (body or rest) always produced `{ tk, range, target }`, with `heldTarget` applied once at hit time, then the two `heldTarget` calls in `cellStatic.tsx` go and `menuAt`'s second lookup goes. `resolveFollow` keeps its conversion for `followCitation` (§8). `ConnMenuTarget` shrinks to a descriptor (see Approach A). The remaining shapes each earn their place: `MdTarget` is what follow/dwell/look switch on, `ConnMenuContext` is the pure model's input, and `LinkTarget` is S1-B/S2's concern.

#### Q2: Paths That Apply a Link Edit

| Path | Where | Syntax Writer | Transaction |
|---|---|---|---|
| Body menu, wikilink | `linkEdit.ts:38-48` | `wikiAuthorTarget` inserts `\|` | `view.dispatch` + `focusRange` |
| Body menu, markdown link | `linkFormat.ts:55-85` | `linkActionText` → `linkPaste` / `unescapeAlias` | `view.dispatch` + `awaitTitle` |
| Resting cell menu, both kinds | `cellStatic.tsx:449-478` | Same two pure halves | `onCommit(string)` + `onSelect(range)` → `initialSelect` (`MarkdownTable.tsx:471`) → seat on mount (`CellEditor.tsx:257`); no `awaitTitle` (F-043) |
| Format ▸ Page Title swap | `pendingTitle.ts:59` | `linkMarkdown` | Plugin dispatch |
| Alias commit (Enter) | `linkEdit.ts:51-69` | None (caret only) | Dispatch |
| Slot collapse | `linkEdit.ts:92-95` | Deletes `\|` or `#` | Dispatch |
| Picker commit | `autocomplete.ts:198-250` (S4) | Hand-spelled `[[${value}]]`, `[[${value}#]]`, `[[${value}\|]]` | Hook dispatch |
| Insert Link | `menu.ts:47-60` | `serializeLink` | Dispatch, `userEvent: 'input'` |
| Format ▸ Link / Connection | `format.ts:55-59,116-145` | Its own `LINKS` table | `applyEdit` |
| Paste and Paste As | S3 | `linkPaste`, `serializeLink`, `connectionText` | S3 |

These paths don't share one writer. The **rename/editLink caret rule for a markdown link is written twice**: `linkFormat.ts:64-66` and `cellStatic.tsx:469-470`. **Unlinking is written twice with different escaping**: Remove Link unescapes the label (`linkFormat.ts:32`), while Format ▸ Link toggled off writes the raw `contentRange` (`format.ts:124-133`), so `[a\]b](x)` becomes `a]b` one way and `a\]b` the other. **Wrapping a selection is written three times**: paste-over-selection (`pasteDecision.ts:38`) and Insert Link (`menu.ts:52`) escape through `serializeLink`, but `toggleWrap` (`format.ts:138-143`) writes `[`+selection+`]()` raw, so a selection holding `]` produces a broken link.

#### Q3: Menu Builders and F-096's Cost

Four builders exist:
1. The body's `linkPointer.menu` (`linkClicks.ts:139-154`).
2. The resting cell's `menuAt` + `menuTarget` (`cellStatic.tsx:288-305,449-478`).
3. `linkGestures`' `readOnlyMenu` (`cellStatic.tsx:408-412`) for `TextCell` and any caller without `menuAt`.
4. `linkValueMenuTarget` (`connectionMenuActions.ts:76-103`), whose three callers are `TableView.tsx:288`, `CardValue.tsx:115`, and `PropertyPanel.tsx:344`.

Builders 1-3 route through `ConnectionsApi.menu` (`pageConnections.ts:43`), and builder 4 calls `showConnectionMenu` directly.

**The protocol is the odd-one-out, not the host member.** Grip, table, and citation menus are promise-returning host members (`api.ts:175-179`), and the editor applies the answer (e.g. `citationPointer.ts:67-73`). The link menu is fire-and-forget: the target carries `apply`/`onCell` closures, and `showConnectionMenu` returns `void` (`connectionMenuActions.ts:19,33,59`). F-096's `menus.pop<A>(items)` can't absorb the link menu, because its rows read session state (`shownDetail`, `isOpenInTabs`, `windowTargetOf`, `connectionMenuActions.ts:45-57`). So F-096 costs the link layer nothing directly. The callback protocol is what produces `apply`, `onCell`, `editable`, the url `apply` filter (`connectionMenuActions.ts:98-100`), and `still()`'s closure plumbing.

**A defect this protocol produces:** All three value-menu sites wrap the link menu in `holdGhost(async () => showConnectionMenu(target))` (`TableView.tsx:290`, `CardValue.tsx:117`), and `PropertyPanel.tsx:345` doesn't wrap it at all. `suppressWrap` increments `menusOpen`, awaits `menu()`, and decrements it in `finally` (`UIX/Interactions/ghostCreate.ts:144-153`). Because `showConnectionMenu` resolves immediately, `menusOpen` drops back to 0 while the native link menu is still up, and `blocked()` (`ghostCreate.ts:49`) stops suppressing the create-ghost. The sibling cell menus await the real `popMenu` promise (`TableView.tsx:302`, `CardValue.tsx:128`).

#### Q4: Is `citationPointer` a Copy?

It's a genuine sibling. Its hit is a DOM glyph that names the marker's seat exactly (`citationPointer.ts:48-55`), its follow delegates to `followTarget` only when the footnote is a lone link (:39-44), it has no dwell, and its menu is the citation menu. What it shares with `linkPointer` is `pointerHandlers`' press/click/menu discipline, which is the right sharing. One sign that `pointerHandlers` was cut to `linkPointer`'s shape: `CiteHit` and `RowHit` hard-code `onText: true, hidesSyntax: true` (:54, :91), fields read only by the seat-at-edge branch (`pointerPath.ts:50-51`), and both stub `dwell: () => null`. That's a cost of ±0 lines, so it isn't worth restructuring. `citationRowMenu` (:109) is a bare `domEventHandlers`, because a whole-line menu with no follow doesn't fit `pointerHandlers`. That earns its place.

### 2. Duplicated or Parallel Rules

- **"Is this a link element":** There are three selector spellings: `linkClicks.ts:60` (five classes), `linkClicks.ts:135` (two, as `hoverGate`), and `cellStatic.tsx:255`. The resting cell's class half is dead, because every element it renders as a link carries `data-link-span` (`cellStatic.tsx:105,138`), so `[data-link-span]` alone is the rule. That's drift with no consequence today.
- **Markdown-link Rename/Edit Link caret:** `linkFormat.ts:64-66` and `cellStatic.tsx:469-470`. Drift.
- **Unlink:** `linkFormat.ts:31-32` and `format.ts:124-133` differ on escaping. Drift (defect).
- **Wrap a selection:** `pasteDecision.ts:38`, `menu.ts:52`, and `format.ts:138-143` differ on escaping. Drift (defect).
- **"Am I inside link syntax" readers in the typing surface:** six of them, with different grammars:
  - `linkInCode` (`edits.ts:324`, closed link, overlap with code)
  - `inAliasAt` (:334)
  - `isInsideWikilink` (:612, `[[` depth, so unclosed counts and `![[` counts)
  - `inBracket` (:646)
  - `inUrlRun` (:631)
  - `headingHash`'s `titleSpanAt` (`headingHash.ts:7-12`, closed link or an empty `[[` with `|`/`]]` after it)

  The unclosed/closed split is genuine: a link being typed has no closer yet. The code gate differs too: `headingHash.ts:21` and `autoPair` (`edits.ts:351`) ask `inCodeAt` at the caret, while `linkInCode` asks whether code touches *any* of the link. S4-A's `slotAt`/`liveLinkAt` owns the closed half. The unclosed half folds into Approach D.
- **Follow entry:** `followTarget` (`linkClicks.ts:75`) derives the view, glance, own page, and `openLink` from the DOM, while `resolveFollow` (:95) takes them as arguments. `TextCell` needs the bare one because no editor surrounds it (`TextCell.tsx:41`). Both are genuinely needed.

### 3. Odd-One-Outs

- **The link menu's protocol** is callbacks, where every sibling menu is a promise (Q3). It doesn't earn the difference, and it produces the ghost defect.
- **Resting-cell authoring:** it's the only surface that authors a link without an editor. It produces the duplicated caret rule, `still()` (`cellStatic.tsx:292-298`), `onSelect` → `initialSelect` across three files, the pure-of-editor exports (`linkEdit.ts:21`, `linkFormat.ts:19`), and F-043. A resting `TextCell` is already read-only (`cellStatic.tsx:408-412`). This is S5-B's subject, and both sides are costed in Approach B.
- **The picker's openers:** `![[` opens unclosed (`autocomplete.ts:119-134`, a line scan with no closer needed), while `[[` and `[label](` open only inside a *closed* construct (`linkAt`, `connections.ts:42`, and `markdownDestinationAt`, `links.ts:46`, which needs `)`). `[[]]` is refused outright (`linkSpans` rejects an empty page, `connections.ts:28-29`, pinned by `autocomplete.test.ts:26`). So today, with Pair Brackets off, `![[` is the only opener that obeys Nathan's ruling, and `[[`/`[label](` depend on `autoPair` having written the closer. This doesn't earn itself (Approach D).
- **`citationPointer`'s marker** follows its lone link (`citationPointer.ts:42`) but doesn't glance it or offer its link menu (:62-73). That's intended, since the marker is a citation first. It earns itself.

### 4. Self-Induced Machinery

| Mechanism | What Produces the Need | What Removing the Cause Deletes |
|---|---|---|
| `wikiAuthorTarget` and `linkActionText` exported "pure of any editor" (`linkEdit.ts:21-36`, `linkFormat.ts:13-52`) | Resting-cell authoring | Inlining into one editor applier (Approach B) |
| `still()` and its re-read (`cellStatic.tsx:292-298`) | Resting-cell authoring outliving the menu | Goes with authoring at rest. `live` stays, because `claimCheckbox` reads it (`cellStatic.tsx:332`) |
| `onSelect` / `initialSelect` (`cellStatic.tsx:273,283`, `MarkdownTable.tsx:153,420,435,459,468-473`, `CellEditor.tsx:109,122,248,257-258`) | Resting-cell Rename/Edit Link handing a selection into a not-yet-mounted editor | All of it |
| `apply`, `onCell`, `editable`, and the url `apply` filter on `ConnMenuTarget` | The callback protocol | Approach A |
| `heldTarget` at three call sites past the hit-test (`linkClicks.ts:102`, `cellStatic.tsx:411,430`) | `linkGestures.linkAt` returning an unconverted target | Approach C removes the two in `cellStatic.tsx`. The one in `resolveFollow` stays (see C) |

### 5. Confusing Names

- **"Target" means four things:**
  - an `MdTarget` (`tokenTarget`, `titleTarget`, `heldTarget`, `resolveMdTarget`)
  - a thunk (`followTarget`, `dwellTarget`, which return `(() => void) | null`)
  - a `ConnMenuTarget` (`linkMenuTarget`, `tokenMenuTarget`, `menuTarget`, `linkValueMenuTarget`)
  - `{ el, target }` (`cellLinkTarget`)

  `wikiAuthorTarget` returns `{ pipeAt, select }`. Suggested renames: `followOf`/`dwellOf` for the thunks, and `wikiAuthorTarget` dissolves under B.
- **`ConnSurface = 'editor' | 'cell'`** (`connectionMenu.ts:21`): `'cell'` means a *property value* cell, while a MarkdownPM table cell is `'editor'` (by default, `connectionMenuActions.ts:22`). `ConnCellAction`, `onCell`, and `cellClosingRows` share that meaning. In a codebase where "cell" mostly means a MarkdownPM table cell, `'value'` would say what it is.
- **`linkMenuTarget` vs `tokenMenuTarget`:** the first takes an `MdTarget` and the second a token. The name says neither. S5-B folds them.
- **`applyLinkAction` (wikilink only) vs `applyUrlLinkAction` (markdown link):** "Link" names the connection, and "UrlLink" names a markdown link that may name a page. Under B they become one `applyLinkAction`.
- **`linkGestures` lives in `Tables/cellStatic.tsx`**, but `Properties/Cells/TextCell.tsx:11` imports it. It's a resting-surface link primitive filed under tables.
- **`openPage`** collides: `connectionsApi.ts:150` (editor follow) and `useViewInteractions.tsx:368` / `ViewTile.tsx:226` / `tileKinds.tsx:27` (view row open). S5-A deletes the first.

### 6. Approaches

The approaches compose. A and C are independent of the resting-cell ruling. B is costed on both sides of it.

#### A · The Link Menu Answers, the Caller Applies (≈ −30)

`showConnectionMenu(target): Promise<ConnUrlAction | ConnCellAction | null>`. The host runs open, site, and copy rows itself (as now), and returns any authoring or value action, the same protocol `menus.citation` uses. `ConnectionsApi.menu` takes that type.

- **`ConnMenuTarget`** (`connectionsApi.ts:16-36`): it drops `apply` ×2, `onCell`, the per-arm `editable` ×2, and the dead url `hasAlias`, and gains `editable: boolean` once in the head. Net −5. `linkMenuTarget` drops its `apply` parameter, and `tokenMenuTarget`'s `edit` object becomes `editable: boolean` with `apply: edit?.wiki` gone. Net −2.
- **`connectionMenuActions.ts`:**
  - The comment and the `editable` AND at :20-23 go (−1).
  - The url `.then` chain at :33-40 returns the action and loses `const apply` (−3).
  - The page `switch` at :61-70 becomes `return isConnUrlAction(action) || isConnCellAction(action) ? action : null` after `runPageAction` (−8). `popMenu` resolves the whole `ConnMenuAction` union (`connectionMenu.ts:50-56`), and `runPageAction` takes a `string` and returns a `boolean` (`pageMenuActions.ts:32-35`), so it doesn't narrow. The two predicates stay as that narrowing.
  - `linkValueMenuTarget` drops its `apply` parameter, `onCell`, and the url filter at :97-100 (−6).
  - Net −18.
- **`connectionMenu.ts`:** unchanged. The predicates survive as the return narrowing.
- **`linkClicks.ts:139-154`** → `() => void menu(target).then((a) => a && apply(view, a, hit.range))`, net −6 (−7 with B's single applier).
- **Callers:** at `TableView.tsx:288-290` and `CardValue.tsx:115-117`, `const action = await holdGhost(() => showConnectionMenu(target)); if (action) runMenuIntent(action)` adds +1 each. `PropertyPanel.tsx:345` becomes `.then(run)`, ±0. Net +2.
- **Resting cell (only if authoring at rest is kept):** `menuAt` has to return the target plus its continuation, which is ±0.
- **Total:** −5 −2 −18 −6 +2 ≈ **−29**, or about **−30** (±5). The −7 in `connectionsApi.ts` overlaps with S5-B's `editable` fold, so it's counted once, here.
- **What users notice:** The create-ghost stays suppressed while a Link value's menu is open (the Q3 defect is fixed). Nothing else changes.
- **Depends on:** nothing in flight. It composes with S2-B (value menus move into `LinkCell`, and the returned action is what S2-B's `onLinkAction` prop receives) and with S5-B (whose `editable` fold this subsumes, so don't count S5-B's −10 twice).

#### B · Authoring Lives Where an Editor Lives: Both Sides of the Ruling

**Side 1, S5-B adopted (the resting cell gets the read-only menu):** S5's −85 to −95 stands, with one correction. `live` isn't removable, because `claimCheckbox` reads it (`cellStatic.tsx:332`), which adds back about +2. On top of that, the two body appliers merge into one `applyLinkAction(view, action, range)` in `linkEdit.ts`, dispatching on `drawnLinkAt(view, range[0])`'s kind, and `linkFormat.ts` is deleted:
- One prelude goes (−3).
- The duplicated imports go (`EditorView`, `drawnLinkAt`, `docString`, `focusRange`, `editorHost`: −5).
- The cross-reference comment at `linkFormat.ts:54` goes (−1).
- One import goes from `linkClicks.ts` (−1).

That's ≈ −10 beyond S5. **Side 1 alone ≈ −93 to −103** (S5's −85 to −95, +2 for `live`, −10 for the merge). Taken with A, subtract the ≈ −7 `editable` fold that both count, which leaves **≈ −86 to −96** attributable to B. F-043 is fixed at its cause.

**Side 2, authoring kept at rest:**
- The ~100 lines stay.
- To honor "one rule," one pure `linkAuthorEdit(text, tk, action, titles): { change?: TextEdit; select?: [number, number]; titleUrl?: string }` replaces `wikiAuthorTarget` + `linkActionText` + `formatted` + `LinkActionText` (54 lines → ~38, −16).
- The body appliers merge as above (−10), and the cell's two closures become one (−6).
- **Side 2 total ≈ −32.**
- **F-043 stays.** Its clean fixes are B′ (S5: activate the cell, then re-pop, at about +timing seam) or withholding Format ▸ Page Title at rest. Announcing `awaitTitle` into the *page* editor is a trap (§8).

**The difference Nathan is ruling on is ≈ 65 lines plus F-043.** User-visible under Side 1: in a resting table cell, a right-click on a link offers Open, Preview, and Copy only. Rename, Edit Link, Format, and Remove need a click into the cell first, which is how a resting Text value already behaves.

#### C · One Hit Shape From Hit-Test to Action (≈ 0 to −3)

`linkGestures(text, connections, glance, own, menuAt)` gives its `linkAt` the `own` it already receives, and returns `{ el, tk, span, target: heldTarget(tokenTarget(…), own) }`, the resting twin of `LinkHit`.
- `readOnlyMenu` (`cellStatic.tsx:411`) and `onPointerOver` (:430) drop their `heldTarget` (±0, inline).
- `resolveFollow`'s own `heldTarget` (`linkClicks.ts:102`) **stays**. `citationPointer` is mounted on every scope (`surface.ts:52`), and `followCitation` hands `resolveFollow` an unconverted target (`citationPointer.ts:42`), so a held surface could reach it.
- `menuAt` reads `found.tk`/`found.span` instead of re-deriving them (`cellStatic.tsx:289-290`, −2), and `menuTarget` takes the found target (:458, −1). Under B Side 1, `menuAt` is gone, so these lines don't count.
- `LINK_SELECTOR` becomes `[data-link-span]` (±0).

**Net ≈ −3** under Side 2 and **≈ 0** under Side 1. C is a consistency change, not a line win: the body and the resting surface both convert at hit time, and the `TextCell` link value's three gestures read one target. No user-visible change. It depends on S2-A, which routes `LinkCell` through `TextCell`, so the `own` it threads is the one this reads.

#### D · One Opener Rule for `[[`, `![[`, `[label](` (≈ 0 to −11 Across This Surface and S4's)

Nathan's ruling makes the embed branch's shape (opener before the caret, closer optional) the rule for all three. One `openLinkAt(line, rel): { opener: '[[' | '![[' | '](', start, closed: boolean } | null` in `Connections/connections.ts` reads back from the caret to an opener with no closer in between. The markdown arm reuses `linkDestinationStart` (`links.ts:59`), which already reads "one still open before the caret."
- **The reader itself:** `openLinkAt` in `Connections/connections.ts` walks back to `[[`/`![[`, delegates `](` to `linkDestinationStart`, notes whether a closer follows, and ends the query at the caret (§8): about **+12**.
- **In this surface:** `isInsideWikilink` (`edits.ts:611-627`, 17 lines) becomes `openLinkAt(…) !== null` at its one caller (`edits.ts:642`): **−16**.
- **In S4's surface:** the embed loop in `autocompleteQuery` (`autocomplete.ts:118-134`, −17) gives way to one opener branch that serves all three openers when unclosed or empty (+7). The closed `link`/`heading`/`alias` arms stay for the slots. Commit writes the closer when `closed` is false (+3). Net **−7**. The `[[]]` refusal becomes an empty-query open.
- **Net:** +12 −16 −7 ≈ **−11**. The picker side is an estimate from reading, so the result could land anywhere from −11 to ±0. **D earns its place as the ruling's behavior with no added lines**, not as a line win.
- **What users notice:** with Pair Brackets off, `[[` and `[label](` open the picker. With it on, `[[` opens on the brackets rather than the first title character. Enter or a pick writes `]]`/`)` when absent, and Escape leaves the typed text.
- **`autoPair` is unchanged:** pairing stays its own setting, and the picker simply stops depending on it.
- **Depends on:** S4-A (`slotAt` for the closed slots) and S4-B (the query field). This reader is the unclosed counterpart.

#### E · One Escape Rule for Wrap and Unwrap (+2, a Defect Fix)

`toggleWrap`'s markdown arms escape the selection on wrap (`escapeAlias`) and unescape on unwrap (`unescapeAlias`), matching `serializeLink` and Remove Link (`format.ts:133,140-141`, +2). It's worth taking only alongside A-D, so the bundle stays net negative.

**Bundle:**
- **Side 1:** A −30, B −91 (the overlap is removed), C 0, D −5 (midpoint), E +2 ≈ **−124** (range ≈ −110 to −135).
- **Side 2:** A −30, B −32, C −3, D −5, E +2 ≈ **−68**.

### 7. Would Go False

- **A:**
  - `connectionMenuActions.test.ts:16,33,45,66,75,82` (`editable` field, void `showConnectionMenu`)
  - `linkEdit.test.tsx:65,80,95,124` and `linkFormat.test.tsx:78,92` (`editable` in menu-target assertions)
  - `linkEdges.test.tsx:432`
  - `cellLinks.test.tsx:305,319`
  - The comment at `connectionsApi.ts:15` ("`apply` closes over the span…")
  - The comment at `connectionMenuActions.ts:20`
- **B Side 1:**
  - `cellLinks.test.tsx`, the whole `describe('a link's menu in a resting cell')` block (:154-269: rewrites in place, settles, declines, Remove Link, Delete, Rename, Edit Link) and the connection-menu block's Rename (:308)
  - `.claude/Guidelines/Editor-Internals.md:17` ("anything a link, a gesture or a menu does in the body has to be given to the resting cell separately"): the menu half goes false
  - The comments at `linkEdit.ts:21` and `linkFormat.ts:54`
  - `cellStatic.tsx:396`'s doc ("read-only by default", which becomes always)
  - Audit F-043's trace (`audit.md:437`)
- **C:** none found. Audit F-038 (`audit.md:389`) stays true, because `resolveFollow` keeps its `heldTarget`.
- **D:**
  - `autocomplete.test.ts:26` (`[[]]` → null)
  - The comments at `autocomplete.ts:107` and `:117` ("`[` doesn't auto-pair after `!`, so an in-progress embed is usually unclosed")
  - `edits.ts:611`'s comment, with its function
- **E:** none found by grep. A `format.test.ts` case should pin it.

### 8. Traps

- **`live` in `StaticCellImpl` survives B.** `claimCheckbox` reads `live.current` (`cellStatic.tsx:332`), because a native menu or undo can move the cell under the resting render. S5 counts it as −2.
- **Announcing `awaitTitle` into the page editor from a resting cell** (a tempting F-043 fix under Side 2; *inferred*, since this is reasoning about a path nobody has written): `pendingTitle`'s sweep writes `linkMarkdown(…)` raw into the document it lives in (`pendingTitle.ts:59-64`). The resting cell's text is `cellToDisplay` text (`MarkdownTable.tsx:426`), so a page title holding `|` would be written unescaped into the page's table row and split it. A live cell editor avoids this, because its document is the display text and commits through the cell's escaping.
- **Copying the embed branch verbatim for `[[` (Approach D):** its unclosed `contentEnd` is `line.length` (`autocomplete.ts:123-125`), so the query and the commit span run to the end of the line. That's harmless for a lone-line embed, but mid-sentence `[[` would swallow the rest of the line on commit. `openLinkAt` has to end the query at the caret.
- **The opener rule can't stop pairing `[[`:** with Pair Brackets on, the first `[` already wrote `[]`, so the second `[` must yield `[[]]` (`edits.ts:358-362`) or leave a stray `]`. The picker reads both shapes. `autoPair` is left alone.
- **`linkSpans`' empty-page refusal** (`connections.ts:28-29`) is shared by rendering, rename, and hit-testing, where `[[]]` isn't a link. The picker opening on `[[]]` has to come from the opener reader, not from loosening `linkSpans`.
- **`followTarget` vs `resolveFollow`** look mergeable but aren't. `TextCell` has no editor for `pageEditorAt` to find (`linkClicks.ts:81-82` would return null), so it needs the bare form with `openWebLink` (`TextCell.tsx:41`).
- **`pointerHandlers`' `onText`/`hidesSyntax`** look link-only, but making them optional changes no line count (citations would pass nothing, and the branch at `pointerPath.ts:50` would read `undefined`), so it isn't worth doing.
- **`heldTarget` inside `resolveFollow` looks redundant**, since the body hit-test already converts (`linkClicks.ts:58`). But `citationPointer` is mounted on every scope (`surface.ts:52`), and `followCitation` passes an unconverted target (`citationPointer.ts:42`), so the conversion stays.
- **`isInsideWikilink` is code-blind on purpose:** its one caller, `isLiteralAt` (`edits.ts:638-643`), asks `inCodeAt` first. An `openLinkAt` replacement can stay code-blind, matching S4-A's ruling that Connections can't take `DocScan`.
- **The link menu can't join F-096's `menus.pop`:** its rows read session state. Approach A changes its protocol, not its owner.
