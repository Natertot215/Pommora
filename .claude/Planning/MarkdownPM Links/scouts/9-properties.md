## Scout 9 — The Link Property's Whole Path

HEAD `42a18f4a5` (Link Gestures baseline `75c3bcb9c` + docs). Probe script: `probe9/p1.ts` (run with `npx vite-node`). Marks: **V** = verified by reading, **R** = verified by running, **I** = inferred. Line counts are `wc -l` / measured spans, production only.

**Measured files:** `Connections/linkValue.ts` 144 · `Connections/rewrite.ts` 133 · `Connections/scan.ts` 137 · `Connections/connections.ts` 109 · `Nexus/cascade.ts` 268 · `Properties/Cells/LinkCell.tsx` 97 · `Cells/TextCell.tsx` 82 · `Cells/Cell.tsx` 240 · `Cells/linkResolve.ts` 8 · `Properties/parseEditorValue.ts` 43 · `Pickers/valueClick.ts` 77 · `Pickers/PropertyValueInput.tsx` 88 · `Properties/propertyValue.ts` 219 · `Interface/Menus/connectionMenuActions.ts` 103 · `Actions/connectionMenu.ts` 122 · `Actions/cellMenu.ts` 149 · `Tiles/Surfaces/WebTile.tsx` 180.

---

### 0. The Path in One Read

- **Decode:** `decodeValue`'s link arm accepts any string or a YAML-nested `[[x]]` through `linkEntry(raw, 2)` (`propertyValue.ts:72-75`, `linkValue.ts:16-22`). Nothing validates on read, so a hand-written garbage value reads as a URL. **V**
- **Classify:** `readLink` (`linkValue.ts:30-35`) — a whole `[[…]]` is a page, everything else is a url (`[x](Old)` → `{url:'Old', alias:'x'}`). **R**
- **Commit:** `parseEditorValue` → `linkValueFromEdit(raw, current, resolveTitle)` (`parseEditorValue.ts:35-40`) → `parsePastedLink` (`linkValue.ts:48-62`) with `resolveTitle` = `resolveConnection(tree).title` (`linkResolve.ts:7-8`, `treeIndex.ts:284-288`).
- **Draw/Open:** `Cell.tsx:129-138` → `LinkCell` → URL half (`LinkCell.tsx:42-61`) or `ConnectionCell` (`:64-97`).
- **Menu:** each parent calls `linkValueMenuTarget` (`connectionMenuActions.ts:76-103`) → `showConnectionMenu` (`:19-72`), else falls back to `cellMenuModel({kind:'link'})`.
- **Cascade:** rename → `patchOf` (`cascade.ts:193-214`) → `rewriteFrontmatterConnections` for Link keys, `rewrite` (the body rewrite) for Text keys; delete → `goneEntry` (`cascade.ts:95-99`) → `parkLinks` (`Trash/holdings.ts:84-94`) → restore relabel via `rewriteFrontmatterConnections` (`Trash/spend.ts:264`) and the gone-page drop `namesGonePage` (`propertyValue.ts:123-126`, called at `propertyValue.ts:136`, `assignment.ts:95`, `restoreProperty.ts:65`, `restoreScrub.ts:39`).
- **Index:** `frontmatterMentions` (whole-connection values, kind `frontmatter`) and `valueLinks` (every other string value read as a body, kind `body`) over **every** frontmatter key, untyped (`scan.ts:112-137`, `indexSeed.ts:69-71`). **V**

---

### Property-Specific (Genuine)

**P-01 · A Link Value Names an Existing Page or a Valid Address (the Data-Layer Invariant).** Commit refuses a phantom (`[[Nope]]` → `undefined`) and an ambiguous title (`resolveConnection`'s `status === 'resolved'` test, `treeIndex.ts:287`); delete strips any value naming a gone page (`cascade.ts:77,95-99`); a restore drops one naming a page the frozen world doesn't hold (`propertyValue.ts:123-126,136`). Body links have none of this — a body keeps `[[Nope]]` as a phantom (`ConnectionsPM.md:28`). The three are one rule held at three moments; it's genuine (a typed value pointing nowhere is a broken value, not prose) and is the "destructive" exception Nathan named. **R** (commit), **V** (rest). The ambiguity refusal (B-153) belongs to this rule, so it must survive `resolveConnection`'s deletion as an explicit `status !== 'resolved'` refusal in the commit reader.

**P-02 · Pages Are Stored as Wikilinks.** Commit canonicalizes a markdown link naming a page into a connection under the page's own capitalization: `[x](Old)` → `[[Old|x]]`, `[x](Old#H)` → `[[Old#H|x]]`; the label survives as the alias (**R**; `linkValue.ts:49-51,60`; documented at `PropertiesPM.md:83`). This earns itself: frontmatter is read by other apps (NexusOS is also an Obsidian vault), and Obsidian's properties recognize a quoted `"[[Page]]"` as a link but not a markdown link (**I**, external behavior). It's the Legibility lock applied to a data field. Keep it; it also means **the app never writes `[x](Page)` into a Link value** — that form only arrives by hand or from another tool.

**P-03 · YAML Unwrap.** `linkEntry`'s nesting read (`linkValue.ts:15-22`) exists because unquoted `[[Page]]` is a nested sequence to YAML; `wholeValueLink` asks for `nesting` 2. Genuine (synthesis trap A-50 holds). **R** (`wholeValueLink([['Old']])` → page `Old`).

**P-04 · The Look Options Apply to Addresses Only.** `link_display` (Full/Short/Page Title), `link_color`, `link_underline` (`LinkCell.tsx:32,46-47`) style the URL half; `ConnectionCell` applies none of them. A per-value alias overrides the format but not color/underline (`PropertiesPM.md:81`). Genuine: it's the property's look, and it must keep a non-token renderer because a bare address isn't a token (`tokens.ts:17-29`, A-132). **V**

**P-05 · `showFullLink`.** `TableView.tsx:680` sets it while that column's popover (the alias editor) is open, so the cell under the popover shows the target the alias names. Genuine. **V**

**P-06 · `linkDisplayText` for Sort and Filter.** `filter.ts:147-149`, `sort.ts:60-62` read it without a look so a style change never reorders (`linkValue.ts:109`). Genuine; its `''` for `[[#H]]` (**R**) sorts a heading-only value first, which is cosmetic.

**P-07 · Value Editors and Value Rows.** Rename opens the alias popover, Edit Link opens the inline field, Clear writes null, Remove hides (Card only) — through `valueMenuIntent` (`valueClick.ts:56-62`) and each parent's `runValueIntent` handlers (`TableView.tsx:135-157`, `CardValue.tsx:84-96`, `PropertyPanel.tsx:287-302`). The Panel's Clear keeps the emptied row (`PropertyPanel.tsx:299,314-318`); Table has no Hide (`hide: null`, `TableView.tsx:156`). Genuine per-surface value behavior; it stays at the parents per Nathan's closing call. **V**

**P-08 · The Generic Fallback Menu.** When `linkValueMenuTarget` returns null (empty, invalid address, phantom/ambiguous page, `[[#H]]`), the parents pop `cellMenuModel({kind:'link'})` → Edit, Rename, Clear, Remove (`cellMenu.ts:65-66,127-131`; `TableView.tsx:295-300`, `CardValue.tsx:122-129`, `PropertyPanel.tsx:346`). A value's editing rows don't depend on resolution, so this is genuine; a phantom body connection getting no menu at all is a different surface's question. **V**

**P-09 · Holder-Less Spaces.** `holderOf` returns undefined for a Space (`valueContext.ts:18-20`); `rewriteHeadingConnections` with `own=''` never matches `[[#H]]` (`rewrite.ts:76-78`), and `spaceMoved` passes no own (`cascade.ts:219`). A bare `[[#H]]` on a Space names nothing, so refusing it at commit there is consistent, not a guard. **V**

**P-10 · Type-Gated Cascade.** `patchOf` rewrites only keys the registry types Link or Text (`cascade.ts:192,199-212`); a Select or unregistered key is "left as written." Genuine (only typed text and links are link-bearing). The index is type-blind by necessity (host-side, no registry in the seed path, `indexSeed.ts:46-71`) — see P-17.

---

### Link-Generic Drift

**P-11 · `ConnectionCell` Is a Second Resting Connection Renderer.** **V**
- **Routing:** `useSession.select` directly (`LinkCell.tsx:74,87-90`) instead of `api.open` (`pageConnections.ts:37-42`), so Open Connections In Preview and window mode are skipped (A-23).
- **Tab Open Behavior:** passes `newTab: isCmd(e)`, so a plain click's explicit `false` overrides the setting (`navigationSlice.ts:540-541`, B-52).
- **Look:** one `.cell-connection` color whatever the status (`UIX/Table/table.css:258-262`); heading drawn as `#H`/`Alpha` rather than `Alpha § H` (`LinkCell.tsx:76,93`).
- **No glance** (no pointer handlers). `ConnectionsPM.md:73` already names the drift.
- `TextCell` (`TextCell.tsx:15-82`) is the shared resting stack it should be: `renderCellContent` draw, `resolveFollow` through the api, `dwellTarget` glance, `heldTarget` for `[[#H]]`.

**P-12 · The URL Half Opens Anything Non-Empty.** The anchor's `onClick` calls `openWebLink(url)` for any non-empty url (`LinkCell.tsx:42,51-56`); `openWebLink` has no validity gate (`Web/openWebLink.ts:7-11`). The shared opener only opens `external` targets, which exist only when `isValidLink` passed (`connectionsApi.ts:64-68`, `linkClicks.ts:110-111`). So a hand-written `[x](Old)` value today draws as an address and clicking its text sends `Old` to the browser or a blank in-app window. One opener (`resolveFollow` on the value's resolved target) closes A-26. The URL half also lacks the site glance a Text value's weblink has (`linkClicks.ts:127-129`). **V**

**P-13 · `readLink`'s Classification Is the Odd One Out.** `[x](Old)` is a url to `readLink` (**R**) while the index counts it as a backlink to `Old` (`valueLinks` → `linksIn`'s markdown branch, **R**: `[["markdown","old",""]]`), and the body draws it as a connection when `Old` resolves (`resolveMdTarget`, `connectionsApi.ts:64-68`). Four host-side readers inherit `readLink`'s or `parseConnectionText`'s narrower rule: `goneEntry` (`cascade.ts:95-99`), `parkLinks` (`holdings.ts:89`), `namesGonePage` (`propertyValue.ts:124`), `frontmatterMentions` (`scan.ts:118-119`).

**P-14 · `rewriteFrontmatterConnections` Re-Implements the Body Rewrite for Whole Values.** Probe (`rewriteConnections`/`rewriteHeadingConnections` vs `rewriteFrontmatterConnections` on the same strings, **R**):

| Value | Body Path | Frontmatter Path | Verdict |
|---|---|---|---|
| `[[Old]]`, `[[Old\|a]]`, `[[Old#H\|a]]`, `[[ Old ]]` | `[[New…]]` | same | Agree |
| `[x](Old)`, `[x](Old#H)` | `[x](New)`, `[x](New#H)` | **untouched** | Drift (P-13) |
| `[[Old\|New]]` | `[[New\|New]]` | `[[New]]` | One rule needed (A-08/F-035) |
| `[[#H]]` own page, title rename | untouched | untouched | Agree |
| `[[#H]]` / `[x](#H)` own page, heading rename H→H2 | `[[#H2]]` / `[x](#H2)` | `[[#H2]]` / **untouched** | Drift |
| heading → inexpressible `A\|B` | wiki untouched, `[x](Old#A%7CB)` | `{}` for **every** key | Body more correct |
| `see [[Old]] too` (hand-written) | rewritten | untouched (indexed, P-17) | Drift |

The own-page `link.title || ownTitle` test (`rewrite.ts:126`) is what `rewriteHeadingConnections`' `names('')` → `own` does (`rewrite.ts:76-78`); `expressibleHeading` is the body's `wiki` gate (`rewrite.ts:80`); the alias drop is `connectionText`'s (`connections.ts:91-93`). Nothing in the frontmatter path is genuine except the alias drop, which is a rule for *both* paths. **V/R**

**P-15 · Two Commit Readers Disagree With the Ruling.** `parsePastedLink` (`linkValue.ts:48-62`): a markdown target that names a title is a page if it resolves, else **refused** (`:59-60`) — so `[x](example.com)` → `undefined` while bare `example.com` → `https://example.com` (**R**). The ruling (one rule: page if a page has that title, otherwise a weblink if valid) changes `:60` to fall through to the `isValidLink` arm. `[[#H]]` and `[x](#H)` → `undefined` (**R**) because `resolve('')` is phantom (`pageIndex.ts:26`). `[^1](https://a.com)` commits (`MD_LINK` has no `^` exclusion, `links.ts:5`; **R**), `[a](b) [c](d)` is refused only because the greedy destination is invalid (**R**).

**P-16 · Edit Link's Field Text Differs by Kind.** `linkEditText('[[Old|a]]')` = `[[Old|a]]` (alias shown), `linkEditText('[x](https://a.com)')` = `https://a.com` (alias hidden, re-attached by `linkValueFromEdit:92-93`; comment `:81` "Only an address carries its alias through an edit"). **R** Under 1b ("Edit Title edits what the link points to"), one rule serves both: the field shows the link without its label; commit keeps the current label unless the typed text brings its own.

**P-17 · Index and Cascade Disagree on Scope, and the Index Mislabels.** The index reads every key untyped; the cascade reads Link/Text keys. A Text value that is exactly `[[Old]]` indexes as kind `frontmatter`; a Link value `[x](Old)` indexes as kind `body` (**R**). Only Matrix reads the label (`Matrix/Engine/graph.ts:4-5`, edge styling), so the mislabel is cosmetic; the relation query reads all three kinds alike (`Desktop/Store/stores.ts:137`, **V**). With P-14's fix the disagreement that matters (indexed but never rewritten) goes; the label stays "whole-value connection" vs "link inside a value," which is honest once `frontmatterMentions` reads `[x](Page)` too (P-21).

**P-18 · `resolveConnection` + `linkResolve.ts` Exist Only for This Lane.** Three callers, all Link-value: `LinkCell.tsx:75`, `connectionMenuActions.ts:90`, `linkResolve.ts:8` (**V**, `git grep`). Its doc (`treeIndex.ts:283`) binds it to the Link cell. Display and menu don't want the ambiguity-null (the body draws ambiguous); only the commit does (P-01).

**P-19 · `linkValueMenuTarget` Resolves on Its Own and Has No Held Arm.** `connectionMenuActions.ts:89-91` → `resolveConnection(tree, '')` for `[[#H]]` → null → generic menu, though the cell draws and opens it (A-18). Its url arm filters `apply` to rename/editLink (`:98-100`) and routes Clear/Hide through `onCell` (`:86`), a channel that exists only for value menus (`ConnCellApply`, `connectionMenu.ts:24`; `isConnCellAction`, `:61-62`; `onCell` field, `connectionsApi.ts:19`; dispatch `connectionMenuActions.ts:38,67-70`). **V**

**P-20 · The Title Hook Is Written Twice.** `LinkCell.tsx:33-38` and `WebTile.tsx:20-29` are the same subscribe-then-resolve shape; they differ only in where `display` comes from (the definition/look vs the device's Default Link Format). Owned by synthesis §3.13 (`useLinkTitle`); listed so the plan counts it once. **V**

---

### Answers to the Pending Link Property Questions

**Alias/Label Kept (Q6, 1b.5):** Already true at commit for every accepted form (**R**): `[[Old|a]]` → `[[Old|a]]`; `[x](Old)` → `[[Old|x]]`; `[x](https://a.com)` → `[x](https://a.com)`. The one exception is `[[Old|Old]]` → `[[Old]]` (alias equal to the title is dropped by `connectionText`), which is F-035's rule. What's *not* uniform is the edit field (P-16) and the menu labels (below). No new storage form is needed.

**`[[#Heading]]` as a Link Value (6b):** Everything but commit already supports it (**R/V**): the cell draws and opens it (`LinkCell.tsx:75`), the index maps it to `own#h` (`scan.ts:120`), a heading rename rewrites it to `[[#H2]]` through either path, `namesGonePage` deliberately lets it stand (`propertyValue.ts:122,125`), `parkLinks` skips it (`holdings.ts:90`, empty title). Accept it when the value has a holder; refuse on a Space (P-09). **Cost:** the commit reader takes the holder (+2), and the three **inline** editors don't receive one today — `PropertyPanel.tsx:408-413`, `CardValue.tsx:146-151`, `TableView.tsx:217-222` pass no `holder` (only the popover mounts at `TableView.tsx:258`, `CardsView.tsx:495`, `PropertyPanel.tsx:536` do) → +3 threading, +1 in `PropertyValueInput` → `parseEditorValue`. **≈ +6.** `[x](#H)` rides the same arm (stored as `[[#H|x]]` per P-02).

**`[x](Page)` Rename/Delete (Q7, A-20):** Answer yes — and weigh it correctly: the app never writes this form (P-02), so it's hand-edited or foreign values only. Today those are indexed as backlinks yet never renamed, never stripped on delete, never parked or restored, and their text opens `Page` as a web address (P-12). Riding the body rewrite (P-22) renames them **keeping the written syntax** (`[x](Old)` → `[x](New)`, **R**) — the visible-form-change worry in synthesis §7 Q4 (`[[New|x]]`) came from routing them through `connectionText`, which P-22 deletes. Delete needs the host reader to recognize them (P-21), and then **all four** host readers must agree, or a value is stripped but never parked (data loss on restore): `goneEntry`, `parkLinks`, `namesGonePage`, `frontmatterMentions`.

**`[x](example.com)` Acceptance:** Under the one rule: page if `example.com` resolves (stored `[[example.com|x]]` per P-02), else `[x](https://example.com)` (normalized as bare input already is). Today refused (**R**). Change: `linkValue.ts:60` falls through when `named` is null (+1). The host stays resolver-free safely: every host operation asks "does this value name the title T of a page that exists (or just did)?", and when such a page exists the one rule reads `[x](T)` as that page — so "the markdown target's title normalizes to T" is the same answer without a resolver. Committed addresses always carry a scheme (`normalizeLinkUrl`), and `targetTitle` refuses schemed targets (`links.ts:33-34,94-96`), so an app-written address never reads as a title. **V/I**

---

### Recommended Shape

Five moves, each net-negative or justified. Deltas are production TS lines; **I** = estimated from measured spans.

**P-21 · One Host Reader for "the Page a Whole Value Names" (≈ −1; Overlaps S1-B's `parseLink` Fold).** `readLink` gains the markdown arm the index already uses: `[label](dest)` whose `targetTitle(dest)` is non-null is `{kind:'page', title, heading: targetFragment || undefined, alias: label}` (title `''` only with a fragment). +3 in `readLink` (`linkValue.ts:30-35`). Then `goneEntry` (unchanged, already reads `readLink`), `frontmatterMentions`/`wholeValueLink` (unchanged), `valueLinks`' exclusion (unchanged), and `parkLinks`/`namesGonePage` switch `parseConnectionText(x)` → `readLink(x)` page arm (±0 each; `holdings.ts:89`, `propertyValue.ts:124`); `propertyValue.ts:10` and `holdings.ts:6` drop the `parseConnectionText` import (−2). `parseLink` (`linkValue.ts:37-42`) folds in (−2, synthesis S1-B). **Net ≈ +3 −2 −2 = −1.** **Trap:** renderer-side readers must not read this resolver-free kind as "is a page" (S2-D's objection: `[x](example.com)` with no such page is a weblink) — they read the resolved target (P-24). **User-Visible:** hand-written `[x](Page)` values are stripped/parked/restored like `[[Page]]`; the index labels them `frontmatter`.

**P-22 · Link Values Ride the Body Rewrite (≈ −26 With F-035's Alias Drop; New to the Synthesis).** **Deleted:** `rewriteFrontmatterConnections` (`rewrite.ts:113-133`, 21) + its imports (`rewrite.ts:2` `connectionText,`, `:17` `wholeValueLink`, −2) + `patchOf`'s call (`cascade.ts:200-205`, 6, replaced by `const patch: Record<string, string> = {}`, +1) + `cascade.ts:20` import (−1). **Changed:** `cascade.ts:207` `typeOf(key) !== 'text'` → `!== 'text' && … !== 'link'` (±0); `Trash/spend.ts:264` maps the stripped values through `rewriteConnections(value, was, landed)` (±0 to +1; values are strings, `record.ts:23`). **Net = −21 −2 −6 +1 −1 +1 ≈ −28; with F-035's alias-drop added to the body rename (+2, synthesis §3.16) ≈ −26.** **User-Visible:** hand-written `[x](Old)` / `[x](#H)` Link values rename; an inexpressible heading still updates markdown-form values; `[[Old|New]]` → `[[New]]` everywhere once F-035 lands (today bodies keep `[[New|New]]`). Composes with S1-A (span-edit rewrite): Link values simply become another caller.

**P-23 · One Commit Reader (Supersedes S3-3 and the Lane Half of S3-1/S2-C; ≈ +7, ≈ −7 With S2-C).** `linkValueFromEdit` reads through S3-1's one reader with: page if resolved (refusing `status !== 'resolved'` explicitly — P-01/B-153), else weblink if valid (normalized), else refuse; a holder answers `''` (`[[#H]]`, `[x](#H)`); pages stored via `connectionText` (P-02). Commit keeps the current label unless the typed link brings its own, for both kinds (P-16: `:92-93` drops its `cur?.kind === 'url'` test, ±0). `linkEditText` shows the link without its label for both kinds (`connectionText(title, undefined, heading)`, ±0). `linkResolve.ts` (8) and `resolveConnection` + doc (`treeIndex.ts:283-288`, 6) go once P-24 removes the display/menu callers, with the commit reading `connections()`'s index live at the gesture (synthesis S2-C, −14 counted there). Lane-unique: `[x](example.com)` fall-through +1, holder +6 (above) − `ResolveTitle` optional `?` cleanups 0 → **≈ +7, offset by S2-C's −14 if taken together ≈ −7.** **User-Visible:** `[x](example.com)` and `[[#H]]` commit; Edit Title shows the target only.

**P-24 · Pages Ride `TextCell`, Addresses Keep the Property Look With Shared Gestures (Supersedes S2-A; ≈ −27 TS, −36 With the Click-Intent Cut; −5 CSS).** One resolved target per value: `valueTarget(raw, api, holder)` = `heldTarget` of `titleTarget` for a page arm, `resolveMdTarget` for a markdown arm, `isValidLink ? external : invalid` for a bare value (+6, beside `tokenTarget` in `connectionsApi.ts`). `LinkCell`:
- **Page/Self:** `<TextCell text={showFullLink ? connectionText(title, undefined, heading) : raw} connections holder menu={false} />` (+3). `TextCell` gains the decline so the parent's value menu isn't pre-empted by `linkGestures`' read-only menu and its `stopPropagation` (`cellStatic.tsx:415-424`; +2).
- **External/Invalid:** the URL half keeps `link_display`/`link_color`/`link_underline` (P-04); its `onClick` becomes `resolveFollow(target, own, api, e, openWebLink)` (replaces `:51-56`, −2) and gains `onPointerOver`/`Out` → `dwellTarget` (+2). An invalid value no longer opens.
- **Deleted:** `ConnectionCell` (`LinkCell.tsx:64-97`, 34), the page branch + imports (`isCmd`, `useSession` select/tree, `resolveConnection`, `LinkTarget`, ≈ 5), `.cell-connection` (`table.css:258-262`, 5 CSS). **Added:** `Cell.tsx:131-137` passes `ctx.connections` (+1).
- **Net ≈ −34 −5 −2 +6 +3 +2 +2 +1 ≈ −27 TS** (the synthesis's −33/−38 omitted the address gestures and the shared `valueTarget`). **User-Visible:** P-11's routing, Tab Open Behavior, phantom/ambiguous tones, `Alpha § H`, heading-missing mark, glance on page values; site glance on address values; an invalid value's text stops opening a browser. **Depends:** layout parity probe P8; F-062 is inherited from `TextCell`.
- **Click intent:** `valueClickIntent`'s link arm (`valueClick.ts:47-52`) keeps one meaning for padding clicks — today a page's padding does nothing and an address's padding opens (A-75). With the text following through `resolveFollow`, `urlClickTarget` (`linkValue.ts:64-68`, −5) and the `open` intent with its three handlers (`TableView.tsx:155`, `CardValue.tsx:94`, `PropertyPanel.tsx:301`, `valueClick.ts:18`, −4) can go if padding behaves like the page arm; that's a product call (padding on an address stops opening). ≈ −9 more if taken.

**P-25 · The Value Menu Is the Link Menu Plus Destructive Rows (1b Addendum; Supersedes S2-B; ≈ −39 Gross).**

*What 1b asks for, mapped:* Rename (edit/add the shown text) and Edit Title (edit what it points to) are the link's own rows, present for every link and independent of an alias (1b.1). Today the value menu's labels branch: `ctx.external ? 'Rename' : hasAlias ? 'Edit Title' : 'Add Title'` and `'Edit Link'` (`connectionMenu.ts:84,87`); the generic fallback says `Edit`/`Rename` (`cellMenu.ts:127-131`). Both become `Rename` + `Edit Title` from one source (±0).

*Seating on a Link value (genuine application, shared row):*
- **Rename** → `rename` intent → `editAs('popover')` (`TableView.tsx:153`, `CardValue.tsx:91`, `PropertyPanel.tsx:300`) → `PropertyValueInput` with `alias` → `TextPicker` anchored at the cell (`PropertyValueInput.tsx:56-75`), seeded with the label (`linkAlias`), committing `linkValueFromRename` (target and syntax kept, label set or cleared). Under it the Table cell shows the full target (`showFullLink`, P-05). Unchanged.
- **Edit Title** → `editLink` intent → `{kind:'edit'}` → the inline `EditableInput` replacing the value (Panel row `:408`, Card `:146`, Table overlay `:217`), seeded with the link minus its label (P-16), committing through P-23's reader, keeping the label. It's the value-side twin of the body's Edit Title (which selects `linkAddress`, `linkFormat.ts:64-66`) and of paste-into-link's retarget: a page retargeted to a URL becomes `[label](url)` (1b.2), a URL retargeted to a page becomes `[[Page|label]]` (P-02). The pure retarget function the plan writes for paste-into-link and the picker should be the one this commit calls (**I**, shared-source opportunity).
- **Format (weblinks):** see Traps T-03 — it collides with the property's own Format.
- **Open rows, Copy Link/Path:** the link's own, unchanged.
- **Destructive rows:** Clear (and Remove where `hideable`) replace the body's Remove Link/Delete (`connectionMenu.ts:64-67`). This is the only genuine row difference.

*What survives at the three parents* (menu promise-returning; the shared menu applies open/copy rows itself and resolves with anything else):
```
const link = dt === 'link' ? valueMenuTarget(value, valueTarget(...), hideable) : null
const action = await holdGhost(() => (link ? linkMenu(link) : popMenu(cellMenuModel(ctx))))
if (action) runMenuIntent(action) /* rename | editLink | cell:clear | cell:hide */ ...
```
- **Survives:** the `dt === 'link'` decision, `runMenuIntent`/`runValueIntent` handlers, `holdGhost` (Card, Table), `hideable` (Card), the generic fallback (P-08). The parents' two pop paths fold into one ternary each (≈ −4 per parent: `TableView.tsx:287-293`, `CardValue.tsx:114-121`, `PropertyPanel.tsx:339-346`), ≈ −12.
- **Deleted:** `onCell` (`connectionsApi.ts:19` + `:5` import), `ConnCellApply` (`connectionMenu.ts:24`), `isConnCellAction` (`:61-62`), the `onCell` dispatch (`connectionMenuActions.ts:4,38,67-70`), `linkValueMenuTarget`'s own resolve and `apply` filter (`:76-103`, 28 → ≈ 8 built on `valueTarget` + `linkMenuTarget`) ≈ −2 −1 −2 −6 −20 = −31; **added:** open/copy applier shared by both kinds (today page rows go through `runPageAction`, url rows are inlined at `connectionMenuActions.ts:35-37`) ≈ +4, the promise return ≈ owned by S7-A.
- **Net ≈ −12 −31 +4 ≈ −39 gross:** the `linkValueMenuTarget` −20 replaces what S2-B, S1-B, and S7-A each claim; the `onCell` channel (−11) and the parents' fold (−12) are new (see *Lane Totals*).
- **`surface: 'editor' | 'cell'`** (`connectionMenu.ts:12,21,65,93`; set only at `connectionMenuActions.ts:22,83`): once Format and authoring are the same everywhere, its only job is which destructive rows close the menu — genuine, so it survives. Its name misleads: a resting **table cell** in a page is `'editor'` (`tokenMenuTarget` sets no surface, `cellStatic.tsx:458`), while `'cell'` means "a property value." Rename the member `'value'` (±0).
- **B-68 fixes itself:** `holdGhost` awaits a real promise instead of the `async () => showConnectionMenu(...)` that resolves immediately (`TableView.tsx:290`, `CardValue.tsx:117`). The Panel gains nothing to hold (no create-ghost).
- **Also fixes:** `[[#H]]` and `[x](Page)` values get their link menu (P-19); an ambiguous value falls to the generic menu (as today).

**Lane Totals (I), Two Numbers So §5 Doesn't Double-Count:**
- **Replaces Synthesis Options:** P-24 replaces S2-A (−38 incl. CSS → −27 TS −5 CSS; the gap is `valueTarget` +6, the `TextCell` menu decline +2, address gestures ±0); P-25 replaces S2-B (−12..−14 → ≈ −39 gross, which also absorbs the `linkValueMenuTarget` lines S1-B and S7-A claim); P-23 replaces S3-3 (+2 → +7, the holder threading S3-3 didn't count) and supplies the Link-value half of S3-1/S2-C; P-21 overlaps S1-B's `parseLink` fold (−2).
- **Adds Beyond the Synthesis:** P-22 ≈ −26 (not in §3.16); P-21's `readLink` arm + two import drops ≈ +1; P-25's `onCell` channel deletions ≈ −11 and the parents' fold ≈ −12; P-24's optional click-intent cut ≈ −9. **≈ −48 new, ≈ −57 with the click-intent cut.**

---

### Traps

**T-01 · The Four Host Readers Must Move Together.** `goneEntry` strips → `parkLinks` parks → `spend.ts:258-271` restores (relabeling through the rewrite) → `namesGonePage` drops on frozen restore. If `goneEntry` recognizes `[x](Page)` (it reads `readLink`) but `parkLinks` still reads `parseConnectionText` (`holdings.ts:89`), the value is stripped and never parked: lost on restore. P-21 changes `readLink` and the two `parseConnectionText` callers in one step. **V**

**T-02 · `spend.ts:264` Is a Second Caller of `rewriteFrontmatterConnections`.** Missed by the synthesis (§3.16 lists only `cascade.ts`). Deleting the function requires mapping it there. **V**

**T-03 · Format on a Link Value Collides With the Property's Format.** (a) `link_display` already *is* a Link value's Format, and a per-value alias overrides it (`PropertiesPM.md:81`, `linkValue.ts:112`); applying the link menu's Format to one value means **writing its label** (`linkMarkdown`, `linkValue.ts:132-134`), after which the definition's Format no longer reaches that value — Full Link would write `[url](url)` where the value's natural "full" is the bare address. (b) Page Title needs the deferred swap (`wantsTitle`) the body gets through `awaitTitle` (`linkFormat.ts:81-85`) and the resting cell lacks (F-043; `cellStatic.tsx:470-474` only calls `host.linkTitles.resolve`); a value would inherit the same gap unless the commit waits for the title. Nathan's "Format for weblinks" needs one of: write the label (and a value-side title wait), or map Format to clearing the label so the property's Format shows. Not resolved here. **V**

**T-04 · `menu={false}` on `TextCell` Is Required, Not Optional.** Without it `linkGestures.onContextMenu` opens the read-only link menu and stops propagation before the parent's value menu (`cellStatic.tsx:410-424`). **V**

**T-05 · The Resolver-Free Page Arm Is Host-Only.** `readLink('[x](example.com)')` would say page; display, menu, click intent, and the edit field must read `valueTarget` (resolved) or a hand-written `[x](example.com)` with no such page shows `[[example.com]]` in its Edit Title field and opens nothing. Today's renderer readers of `readLink`'s kind: `LinkCell.tsx:30`, `valueClick.ts:51`, `connectionMenuActions.ts:81`, `linkEditText`/`linkValueFromRename`/`linkDisplayText` (`linkValue.ts:70-122`). **V/I**

**T-06 · The Ambiguity Refusal Must Be Explicit.** `resolveConnection`'s null-on-ambiguous is the only thing stopping `[[Dup]]` committing (`treeIndex.ts:287` → `linkValue.ts:49-52`). Any replacement reader refuses `status !== 'resolved'` itself (B-153). **V**

**T-07 · `linkEntry(value, 2)` on Both Branches.** `patchOf`'s text loop already unwraps a YAML-nested `[[Old]]` (`cascade.ts:209`); the widened Link branch needs nothing extra (**R**: `wholeValueLink([['Old']])`). Don't add a second unwrap.

**T-08 · The Inline Editors Lack `holder` and `connections`.** P-23 (holder for `[[#H]]`) and S2-C (commit reads `connections()` live) both need them threaded at `PropertyPanel.tsx:408`, `CardValue.tsx:146`, `TableView.tsx:217`. **V**

**T-09 · `.cell-connection` Has a Test Pin.** `LinkCell.test.tsx` asserts the class and the mocked `select` (synthesis §3.10). **V** (2 refs)

---

### Would Go False

**Docs:**
- `ConnectionsPM.md:24` — "plus the Link property values in frontmatter" (P-22: they ride the body pass; also already wrong about "one pass").
- `ConnectionsPM.md:28` — "strips the Link property values naming it" stays true but widens to markdown-form values (P-21).
- `ConnectionsPM.md:73` — the "Connection rendering is written twice" limitation goes (P-24).
- `PropertiesPM.md:81` — "A per-value alias, set through Rename" stays; Format wording needs T-03's resolution.
- `PropertiesPM.md:83` — "a title no page answers to is refused" stays; `[x](example.com)` now stores as an address, `[[#H]]` is accepted, and "the connection color" becomes the shared connection tones.

**Comments:**
- `linkValue.ts:81` ("Only an address carries its alias through an edit") — P-16/P-23.
- `rewrite.ts:113` (deleted with the function).
- `scan.ts:111` ("A Link property holds a connection as its whole value…") — still true, widen to "a link naming a page."
- `treeIndex.ts:283`, `linkResolve.ts:1` — deleted with S2-C.
- `LinkCell.tsx:15` — "Opens through the sanctioned IPC" becomes "follows through the shared opener."
- `valueClick.ts:1,21` — if the `open` intent goes (P-24 click-intent cut).

**Tests** (reference counts by `git grep -c`):
- `linkValue.test.ts` (27 refs across `linkValueFromEdit`, `linkEditText`, `linkAlias`, `urlClickTarget`, and `rewriteFrontmatterConnections` ×5) — P-22, P-23.
- `scan.test.ts` (5, `frontmatterMentions`) — P-21 widens what it reports.
- `connectionMenuActions.test.ts` (2, `linkValueMenuTarget`) — P-25.
- `LinkCell.test.tsx` — P-24's behavior change: the `.cell-connection` pin and the mocked `select` called with `{ newTab }` both go (routing moves to `api.open`, a plain click passes no `newTab`).
- Cascade and Trash behavior: `cascade.test.ts` (Link definitions at `:168,326,387,432,713`), `deleteOrder.test.ts`, `indexSeed.test.ts`, `aliasAcceptance.test.ts`, `admission.test.ts` reach `renameCascade`/`deleteCascade`/`parkLinks`/`namesGonePage`; none writes a markdown-form Link value (`git grep` for `](` in `cascade.test.ts` finds none), so P-21/P-22 add cases rather than falsify existing ones (**V**).
