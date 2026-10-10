## Verified C · Lanes 9, 10, 11 (Link Property Path, Resting-Cell Authoring, Embeds and Retarget)

**Baseline:** HEAD `42a18f4a5` (production identical to the Link Gestures commit `75c3bcb9c`), clean tree, read-only. Every cited span was opened with `sed -n` and every count re-measured with `wc -l`; production TS only unless marked CSS. **V** = verified by reading, **VR**/**R** = verified by running, **I** = inferred.

**Rulings Applied:** Checkpoints 1, 1b, 1c, 1d, the Format-Hidden reconciliation, the Disclosed Calls following from 1b-1d, 1e, 1f, and 1g (which supersedes 1d's resting-Text-value parity). Lane 9b (`scouts/9b-properties.md`) is folded in where it supersedes Lane 9: Q-07…Q-12 replace P-25, Q-29 replaces P-24's click-intent sub-bullet, Q-25/Q-26 replace P-23's commit half. The Disclosed Calls replace Lane 10's T-A with a rest-side title wait (one fallback for every surface that can't hold a swap).

**Probes Re-Run at HEAD** (outputs in `verified/C-runs/`):
- `probe9/p1.ts` → `p9.out`: reproduces every **R** claim in Lane 9 row for row (P-14's table, P-15's refusals, P-16's edit texts, P-17's index labels, T-07's nested unwrap).
- `probe10/p.ts` → `p10.out`: reproduces R-11 (raw row split, escaped round-trip), R-05's `toggleInline` outputs (unwrap at a point with no `selection`; `****` with `selection: 2`; range wrap `selection: 8`), R-03's footnote `ordinal: null`, R-27's `["embed"]`.
- `probe11/tok.ts` → `p11tok.out`: reproduces E-03, E-05, E-06, and adds two cases the lane didn't cite (`!![[P]]` → `embed` over `![[P]]`; `![[P]]]` → `embed` over `![[P]]`).
- `probe11/paste.ts` → `p11paste.out`: reproduces E-19, E-20, E-21, E-22's `pasteAsTarget` rows.
- New probes by this verification: `verified/C-parts/probe9b/p.ts`, `probe10b/{p,nest}.ts` (`p.out`), `probe11b/{e08,e25}.ts` (`e08.out`, `e25.out`, with patched copies under `probe11b/after/`).

**Tally:** Lane 9 — Verified 25 · Corrected 9 · Dropped 0. Lane 10 — Verified 22 · Corrected 10 · Dropped 0. Lane 11 — Verified 24 · Corrected 14 · Dropped 0. **Total: Verified 71 · Corrected 33 · Dropped 0.** Cross-lane findings follow as X-01…X-12 under *Missed*.

**Brief Correction:** the brief's "the MarkdownPM Engine can't import `Links/`" holds, but its implied "`Core/Connections` can't import MarkdownPM" doesn't: `Connections/scan.ts:7-8` and `Connections/rewrite.ts:18` already import `MarkdownPM/Engine/` (`markdownCode`, `detect`). `engineGraph.test.ts` enforces no React, no `.tsx`, an externals allowlist, and pure UIX leaves; the binding rules are "no React" and "no `Links/`".

---

### Lane 9 · The Link Property's Whole Path

**Coordinator Notes on Lane 9 (After 9b and 1g):**
- **Superseded:** P-25 by 9b Q-07…Q-12 (the value menu built by the one link-menu builder; Q-12 re-measures `linkValueMenuTarget` whole at −36 with imports, not P-25's 28 → 8); P-24's click-intent sub-bullet by Q-29 (−18, which this verification also measured independently); P-23's commit half by Q-25/Q-26 (commit through S3-1's reader and the corrected `retarget`; holder threading +6 stands). P-24's renderer move, P-21, and P-22 stand as corrected below.
- **1g Narrows P-24/P-25's Surroundings:** property value cells keep today's right-click, so *§Stress 5*'s two-owner conflict (Text value authoring at rest vs the parent's value menu) is moot; T-04's decline is still required, because `TextCell`'s read-only link menu still pre-empts the parent's menu on a page value. The value menu's rows stay today's; only labels move to 1c's one source (Rename · Edit Title/Edit Link), disclosed in 1g. 9b Q-10's Panel Remove (1e) is a row add that 1g's "no new rows at rest" reads against; it's ±0 lines either way and needs the coordinator's reading.
- **P-21's Reader Conflicts With S3-1** (cross-lane, *X-01*): the host gets a resolver-free `readLink` arm while S3-1 adds `readLinkText(text, resolve?)` with the opposite tiebreak — two classifiers of one value. The verification's shape (a) resolves both: `readLink` reports written syntax and classifies nothing; host readers answer by name-match against the title they hold; renderer readers and the commit read the resolved target (`tokenTarget`-based `valueTarget`, *§Stress 3*).


HEAD `42a18f4a5`, clean. Every cited span opened with `sed -n`. Measured files match the lane's header exactly (`linkValue.ts` 144, `rewrite.ts` 133, `scan.ts` 137, `connections.ts` 109, `cascade.ts` 268, `LinkCell.tsx` 97, `TextCell.tsx` 82, `Cell.tsx` 240, `linkResolve.ts` 8, `parseEditorValue.ts` 43, `valueClick.ts` 77, `PropertyValueInput.tsx` 88, `propertyValue.ts` 219, `connectionMenuActions.ts` 103, `connectionMenu.ts` 122, `cellMenu.ts` 149, `WebTile.tsx` 180). `p9.out` lines match every **R** claim. New probe: `verified/C-parts/probe9b/p.ts` (run with `npx vite-node`); its results are cited as **probe9b**.


---

**P-01 · Data-Layer Invariant** · Verified · `treeIndex.ts:283-288` (`status === 'resolved'` at :287), `linkValue.ts:49-52`, `cascade.ts:77,95-99`, `propertyValue.ts:123-126,136`, `ConnectionsPM.md:28` · spans as cited.
Commit refusal, delete strip, and frozen-restore drop are the three moments, each seen. One caveat belongs here (M9-01): the restore-moment reader `namesGonePage` reads only `typeof raw === 'string'`, so the rule is held for quoted values only at three of its four call sites.

**P-02 · Pages Stored as Wikilinks** · Verified (Obsidian behavior Inferred) · `linkValue.ts:49-51,59-60`, `PropertiesPM.md:83` · `p9.out:62-63`.
`[x](Old)` → `[[Old|x]]`, `[x](Old#H)` → `[[Old#H|x]]`. The Obsidian claim is external and stays **I**. "The app never writes `[x](Page)` into a Link value" holds: every writer goes through `linkValueFromEdit`/`linkValueFromRename` (`git grep "kind: 'link'"`), and the page arms write `connectionText`.

**P-03 · YAML Unwrap** · Verified · `linkValue.ts:15-22`, `propertyValue.ts:73` · `p9.out:81`.

**P-04 · Look Options Apply to Addresses Only** · Verified · `LinkCell.tsx:32,46-47`, `tokens.ts:17-30` (`TokenKind`, no url), `PropertiesPM.md:81`.

**P-05 · `showFullLink`** · Verified · `TableView.tsx:680` (`showFullLink={popoverCol === c.id}`).

**P-06 · `linkDisplayText` for Sort and Filter** · Verified · `filter.ts:147-149`, `sort.ts:60-62`, `linkValue.ts:109` · `p9.out:79`.

**P-07 · Value Editors and Rows** · Verified (re-anchored) · `valueClick.ts:56-62`; handlers `TableView.tsx:143-157`, `CardValue.tsx:84-96`, `PropertyPanel.tsx:294-304`.
Re-anchors: Table `rename` is `:154` (`:153` is `popover`); Panel's Clear-keeps-row is `:295` (`value === null ? emptyRow(def.id, true)`) and `emptyRow` `:315-319` (lane: `:299`, `:314-318`). Table `hide: null` at `:156` is right.

**P-08 · Generic Fallback Menu** · Verified (re-anchored) · `cellMenu.ts:65-66,127-133` (rows), `:88-96` (`cellClosingRows` appends Clear/Remove); parents `TableView.tsx:294-302`, `CardValue.tsx:121-128`, `PropertyPanel.tsx:346`.

**P-09 · Holder-Less Spaces** · Verified · `valueContext.ts:19-20`, `rewrite.ts:76-78`, `cascade.ts:219`.

**P-10 · Type-Gated Cascade** · Verified · `cascade.ts:192-214` (Link filter `:201`, Text gate `:207`).

**P-11 · `ConnectionCell` Is a Second Resting Renderer** · Verified · `LinkCell.tsx:64-97` (34 + blank `:63`), select `:74,87-90`, display `:76,93`; `pageConnections.ts:37-40` (`open`), `navigationSlice.ts:540-541`, `table.css:258-262` (5), `ConnectionsPM.md:73`, `TextCell.tsx:15-82`.

**P-12 · The URL Half Opens Anything Non-Empty** · Corrected · `LinkCell.tsx:42,51-56`, `openWebLink.ts:7-11`, `Web/handlers.ts:39-40`, `linkClicks.ts:110-111,126-129`.
The anchor does call `openWebLink(url)` for any non-empty url, and `openWebLink` has no gate. But "sends `Old` to the browser" is false on the default route: `openWebLink` dials `link:open`, whose host handler returns without opening when `!isValidLink(url)` (`handlers.ts:39`). Only the **Open Links In App** route (`s.openBrowser(url)`, `openWebLink.ts:9`) is ungated, so the defect is "an invalid value opens an in-app browser window on a non-address" (what that window shows is **I**). The fix the lane names (one opener through `resolveFollow`) stands.

**P-13 · `readLink` Is the Odd One Out** · Verified · `p9.out:35,50`; `cascade.ts:95-99`, `holdings.ts:89`, `propertyValue.ts:124`, `scan.ts:118-119`, `connectionsApi.ts:64-68`.

**P-14 · `rewriteFrontmatterConnections` Re-Implements the Body Rewrite** · Verified · `rewrite.ts:113-133`, `cascade.ts:200-205` · `p9.out:2-28`.
Every table row matches the probe. Nuance on "`{}` for **every** key": `rewriteFrontmatterConnections` returns `{}` for the whole call (`rewrite.ts:120`), and `patchOf` only hands it Link keys (`cascade.ts:201`); Text keys in the same file still go through the body rewrite. The equivalences the lane draws (own-page `link.title || ownTitle` ≡ `names('')`, `expressibleHeading` ≡ the `wiki` gate, alias drop ≡ `connectionText:91-93`) were each read.

**P-15 · Two Commit Readers Disagree With the Ruling** · Corrected · `linkValue.ts:48-62`, `links.ts:5`, `pageIndex.ts:26,36` · `p9.out:65-73`.
All probe results hold. Two mechanism corrections: (1) `[a](b) [c](d)` is refused today because `MD_LINK`'s greedy destination `b) [c](d` is title-shaped (`targetTitle` non-null, no `/` or scheme), so it takes the `named` branch and fails to resolve (`:59-60`); `isValidLink` is never reached. After the `:60` fall-through it would be refused by `isValidLink` (whitespace). (2) `resolve('')` is phantom because the build skips empty keys (`pageIndex.ts:26`) and `resolve` returns phantom on no holders (`:36`).

**P-16 · Edit Link's Field Text Differs by Kind** · Verified · `linkValue.ts:70-75,81,92-93` · `p9.out:76-78`.

**P-17 · Index and Cascade Disagree on Scope** · Verified · `indexSeed.ts:68-71`, `Matrix/Engine/graph.ts:4-5`, `Desktop/Store/stores.ts:137` · `p9.out:45,50`.
Also checked: `queryMentions` filters only `kind <> 'space'` (`stores.ts:99-104`), so relabeling `[x](Old)` from `body` to `frontmatter` under P-21 keeps it in the rename/delete corpus.

**P-18 · `resolveConnection` + `linkResolve.ts` Exist Only for This Lane** · Verified · `treeIndex.ts:283-288` (6), `linkResolve.ts:1-8` (8); callers `LinkCell.tsx:75`, `connectionMenuActions.ts:90`, `linkResolve.ts:8`.

**P-19 · `linkValueMenuTarget` Resolves on Its Own** · Verified · `connectionMenuActions.ts:76-103` (28), resolve `:89-91`, url filter `:98-100`, `onCell` `:86`; `connectionMenu.ts:24,61-62`; `connectionsApi.ts:5,19`; dispatch `connectionMenuActions.ts:38,67-69`.

**P-20 · The Title Hook Is Written Twice** · Verified (re-anchored) · `LinkCell.tsx:33-38`; `WebTile.tsx:21-30` (`useWebpageTitle`; lane `:20-29`).

**P-21 · One Host Reader (≈ −1)** · Corrected · `linkValue.ts:30-42` (readLink 6 + blank + parseLink 6 = 13), `holdings.ts:6,89`, `propertyValue.ts:10,124` · probe9b.
Three corrections. **(a) The rule is S2-D's.** "A markdown target with non-null `targetTitle` is a page, unresolved" is word-for-word the option §3.1 rejected (A-105); probe9b confirms `[x](example.com)` → `{kind:'page', title:'example.com'}`. **(b) "The host stays resolver-free safely" is false for one of the four host readers.** The lane's argument holds for questions that ask "does this value name title T, which exists or just did": `goneEntry` (T ∈ `gone`), `parkLinks` (a bundle holds T), `frontmatterMentions`, and rename's match on `oldTitle`. `namesGonePage` asks the negative question — "does it name a title the frozen world *doesn't* hold" (`propertyValue.ts:125`) — and a resolver-free page arm answers yes for every schemeless address: probe9b `[x](example.com)`, `[x](www.google.com)`, `[Doc](Notes.md)` → `namesGone=true`, all with `isValidLink(dest)=true`. Through `reconcilePropertyValue:136`, `restoreScrub.ts:39`, `restoreProperty.ts:65`, and `assignment.ts:95`, a frozen restore strips those values (noted for parking only if a bundle holds that title, which for `example.com` none does). S3-1's resolver-free tiebreak (page iff `targetTitle` non-null **and** `!isValidLink(dest)`) fails the other way: `[Doc](Notes.md)` reads as an address, so a markdown value naming a dotted title is never stripped, parked, or renamed (today's behavior). The exposure is foreign or hand-written values only either way (P-02; P-23 normalizes app-written addresses to a scheme). P-21's tiebreak fails toward data loss and phantom writes; S3-1's fails toward today's untouched value. **(c) Arithmetic.** Folding `parseLink` into `readLink` without the arm is ≈ 8 lines (S1-B's −5); the arm adds 3 (title, null-check, page return) → merged 11 vs 13. Import savings are −1, not −2: `propertyValue.ts:10` goes (it already imports `linkEntry` from `linkValue` at `:14`), but `holdings.ts:6` is replaced by a `linkValue` import (±0). Unique P-21 ≈ **+2** (−3 if S1-B's fold is counted here). Uncounted: the renderer readers T-05 says must stop trusting `readLink`'s kind (see *§Stress 1*), ≈ +3. `namesGonePage` should read `wholeValueLink(raw)` (±0), which also closes M9-01.

**P-22 · Link Values Ride the Body Rewrite (≈ −26)** · Corrected · `rewrite.ts:2,17,112-133` (function 21 + blank), `cascade.ts:20,199-212`, `spend.ts:23,258-271` · `p9.out:4`, probe9b.
Verified: `patchOf`'s text loop already unwraps nested YAML (`cascade.ts:209`, T-07), `rewriteConnections(text, title, change.title)` and `rewriteHeadingConnections(...own, outline)` reproduce the frontmatter path's own-page and inexpressible-heading semantics (body is stricter for wiki, writes `%7C` for markdown), and Space values keep `own=''` (`:219`). Corrections: **(1) The F-035 alias drop is mandatory, not an add-on.** Without it, Link values regress from `[[New]]` to `[[New|New]]` (`p9.out:4`; probe9b `[[Old|Old 2]]` → body `[[Old 2|Old 2]]`, frontmatter `[[Old 2]]`), so the "≈ −28" figure isn't a valid option; only the with-drop figure is. **(2) The `spend.ts` replacement isn't ±0..+1.** The values are `Record<pageId, string>` (`spend.ts:260-262`; `record.ts:23` types `value` as string). Folding the rewrite into the existing builder as `.map((l) => [l.page, landed === was ? l.value : rewriteConnections(l.value, was, landed)])` is 101 columns, so Biome splits it (+5) and `rebuilt`/`all` go (−3): **+2**. Dropping the `landed === was` guard fits (−1) but changes behavior: `rewriteConnections('[[old]]','Old','Old')` → `[[Old]]` (probe9b). **(3) "Keeping the written syntax"** holds with encoding: `[x](Old)` relabels to `[x](Old%202)` (probe9b, `encodeLinkTarget`). Also new: a heading rename on the renamed page now runs `§` runs over Link values too (`p9.out:24`), and computes `headingOutline` once more per Link key (M9-03). Corrected arithmetic in *§Corrected Deltas*.

**P-23 · One Commit Reader (≈ +7, ≈ −7 With S2-C)** · Corrected · `linkValue.ts:48-62,82-95`, `parseEditorValue.ts:25-40`, `PropertyValueInput.tsx:55-63`, inline editors `PropertyPanel.tsx:408-413`, `CardValue.tsx:146-151`, `TableView.tsx:217-222` · probe9b.
**(1) "Commit keeps the current label… `:92-93` drops its `cur?.kind === 'url'` test, ±0" is wrong.** Lines `:92-93` are reached only by a bare typed address: any typed `[[…]]` or `[x](…)` returns at `:89-90` from `parsePastedLink`, which never sees `current`. Probe9b: `[[Other]]` over `[[Old|a]]` → `[[Other]]` (label lost); `https://b.com` over `[[Old|a]]` → `https://b.com`. Keeping the label for page retargets means threading the current alias into the reader's page arms (≈ +2). **(2) It contradicts T-05.** P-23 defines `linkEditText` as `connectionText(title, undefined, heading)` off `readLink`; under P-21 a hand-written `[x](example.com)` opens Edit Title as `[[example.com]]` (today `example.com`, probe9b), and `PropertyValueInput`'s `invalid` (`:59`) runs the commit reader on it, which refuses it (no such page, not an address). **(3) S2-C's −14 isn't free.** Reading `connections()` live at commit needs `connections` at the three inline editors (T-08) and a parameter through `parseEditorValue` (≈ +4), which the lane names in T-08 but doesn't cost. **(4) The commit reader and P-24's `valueTarget` answer the same question** (the resolved target of a whole value); see *§Stress 3*. Lane-unique pieces verified: `[x](example.com)` fall-through +1 (`:60`), holder threading +6 (popover mounts already pass `holder`: `TableView.tsx:257`, `CardsView.tsx:495`, `PropertyPanel.tsx:536`; the inline three don't).

**P-24 · Pages Ride `TextCell` (≈ −27 TS, −36 With Click Cut)** · Corrected · `LinkCell.tsx:1-13,40-41,63-97`, `Cell.tsx:131-137`, `TextCell.tsx:15-33`, `cellStatic.tsx:397-430`, `connectionsApi.ts:46-74`, `valueClick.ts:6,18,47-52`, `linkValue.ts:64-68` · probe9b.
**(1) Import deletions are ≈ −1, not ≈ −5.** `useSession` stays (title hook `LinkCell.tsx:34-35`); `isCmd` shares line 7 with `isSecondaryClick`, which the address `onClick` keeps; `LinkTarget` shares line 9. Only `resolveConnection` (`:10`) goes. **(2) Uncounted additions:** LinkCell's own `connections` prop (+2), and new imports `TextCell`, `valueTarget`+`ConnectionsApi`, `resolveFollow`+`dwellTarget`, `glanceHost`, `connectionText` (+5); `TextCell`'s decline also changes the multi-line `linkGestures(...)` call (+1). **(3) The routing contradicts a claimed gain.** "Page/Self → `TextCell`, External/Invalid → URL half" sends a phantom or ambiguous `[[Nope]]` (reachable: outside rename, later duplicate titles, hand edits) to the URL half, whose `url` is `''` for a non-external target, so `if (!url) return null` (`:42`) draws a blank cell. The "phantom/ambiguous tones" gain only holds if routing is "external (or a bare value) → URL half; every link-token value → `TextCell`." **(4) Click intent (ruled by 1d):** see *§Stress 4* — ≈ −18, not −9. Corrected: ≈ −15 TS / −5 CSS.

**P-25 · Value Menu = Link Menu + Destructive Rows (≈ −39 Gross)** · Corrected · `connectionMenu.ts:11-24,58-67,80-122`, `connectionMenuActions.ts:19-103`, `connectionsApi.ts:5,15-36`, parents `TableView.tsx:287-293`, `CardValue.tsx:114-120`, `PropertyPanel.tsx:340-347` · `surface` sites `connectionMenu.ts:12,21,65,93`, set `connectionMenuActions.ts:22,83`, `cellStatic.tsx:458`.
Arithmetic re-measured and it holds (≈ −39..−41; see table), with three corrections. **(1) It depends on S7-A (#16).** The `onCell` deletion (−10 across `connectionsApi.ts:5,19`, `connectionMenu.ts:24,61-62`, `connectionMenuActions.ts:4,38,67-69`) is real at every site but only once the shared menu resolves with unhandled actions; without the promise, `apply`'s type widens to carry `cell:*` and the channel's lines move into it (≈ −3). The `linkValueMenuTarget` −20 and the `apply` filter are also lines S7-A counts (J1 logic), so P-25 + #16 must subtract them once. **(2) Missed −2:** `type LinkCellAction` (`connectionMenuActions.ts:74` + blank) dies with the rebuild. **(3) Re-anchors:** Table rename `:154`, Card block `:114-120`, Panel block `:340-347` (lane `:339-346`); Panel's fold is −1 (the `if/else` pair becomes one ternary), Table and Card −5 each, so −11 rather than −12. `surface` claims verified: `tokenMenuTarget` sets none (`connectionsApi.ts:97-112`, called at `cellStatic.tsx:458`), so a resting table cell is `'editor'`. The label change to Rename/Edit Title leaves `hasAlias` dead (M9-02, uncounted).

**T-01 · The Four Host Readers Must Move Together** · Verified · `cascade.ts:95-99`, `holdings.ts:84-94`, `spend.ts:258-271`, `propertyValue.ts:123-126`, `scan.ts:112-125`.
Trace for `[x](Old)` under P-21 (+P-22): delete → `goneEntry` (via `readLink`) strips it and records `value:'[x](Old)'` in Old's bundle (`delete.ts:97-101`); restore → `spend.ts:258-268` relabels (`[x](Old%202)` under P-22; `[[Old 2|x]]` through the frontmatter path if P-22 isn't taken) and `refillValues` writes it back through `reconcilePropertyValue` (`assignment.ts:57`); permanent delete → `parkLinks(recorded)` (`spend.ts:88-89`) parks it only if `holdings.ts:89` recognizes it, so P-21 must switch it in the same step (as stated). **No fifth Link reader via `parseConnectionText`:** `assetMigrate.ts:57,178`, `assetRoots.ts:22,28`, `assetUrl.ts:22`, `value.ts:67` are File-domain. The readers that move automatically are `valueLinks`' exclusion (`scan.ts:134`, must move or the value double-indexes), `rewriteFrontmatterConnections` (`rewrite.ts:125`, form change unless P-22), and `spacesLinkHeading` (`cascade.ts:64`). The readers already disagree today on YAML nesting: `goneEntry` unwraps, `namesGonePage` doesn't (M9-01).

**T-02 · `spend.ts:264` Is a Second Caller** · Verified · `spend.ts:23,263-265`; `exports.sh`: `rewriteFrontmatterConnections prod=2` (cascade, spend).
The replacement's shape and cost are corrected under P-22 (+2 keeping the guard).

**T-03 · Format on a Link Value Collides** · Corrected · `connectionMenu.ts:93-94`, `linkValue.ts:112,132-134`, `cellStatic.tsx:470-474`, `linkFormat.ts:81-85`.
The collision is real in principle, but no live trap: the value menu already omits Format, since `connectionMenuModel` returns `[opens + Copy Link, authoring, closing]` for `surface === 'cell'` (`:93-94`) and Format exists only on the editor branch (`:95-109`). Checkpoint 1d rules Format hidden on Link values. What remains is a constraint on P-25: the shared row set must keep the `surface` branch that drops Format.

**T-04 · `menu={false}` Is Required** · Verified (re-anchored) · `cellStatic.tsx:416-427` (`onContextMenu`; stop at `:423-424`), `Session/pageConnections.ts:43` (`menu: showConnectionMenu`).
`ctx.connections` carries `menu` for both value contexts (`useViewHost.ts:113`, `PropertyPanel.tsx:168-172`), so `TextCell` would pop the read-only link menu and stop propagation. The decline doesn't exist today; `linkGestures` already takes a fifth `menuAt` parameter (`:402`) that a decline can ride (a `menuAt` returning null makes `onContextMenu` return false without stopping propagation, `:419-420`). `TextCell` has no such prop. 1d conflict: see *§Stress 5*.

**T-05 · The Resolver-Free Page Arm Is Host-Only** · Corrected · readers `LinkCell.tsx:30`, `valueClick.ts:51`, `connectionMenuActions.ts:81`, `linkValue.ts:66,71,78,92,99,111`.
The reader list is complete (`git grep -n "readLink("`). The trap is understated in two directions: the host side isn't uniformly safe either (P-21 (b), `namesGonePage`), and the lane's own P-23 keeps `linkEditText` on `readLink`. The concrete per-reader outcomes are in *§Stress 1*; `linkValueFromRename` turns a weblink value into a phantom connection, which T-05 doesn't name.

**T-06 · The Ambiguity Refusal Must Be Explicit** · Verified · `treeIndex.ts:287`, `pageIndex.ts:37`, `linkValue.ts:49-52`.

**T-07 · `linkEntry(value, 2)` on Both Branches** · Verified · `cascade.ts:209`; `p9.out:81`.

**T-08 · Inline Editors Lack `holder` and `connections`** · Verified · `PropertyPanel.tsx:408-413`, `CardValue.tsx:146-151`, `TableView.tsx:217-222`.
The `connections` half is uncosted in P-23's S2-C offset (see P-23 (3)).

**T-09 · `.cell-connection` Has a Test Pin** · Verified · `LinkCell.test.tsx:33,52` (class), `:26-27,37,43-44,63,67,70` (mocked `select`).

---

#### Stress

**1 · P-21 vs T-05 vs P-23 Isn't Internally Consistent.** `readLink` is one function with host and renderer callers, so P-21's arm reaches every renderer reader unless each is migrated, and only LinkCell (P-24), the value menu (P-25), and `valueClickIntent` (cut by 1d) are. For a hand-written `[x](example.com)` with no such page, after P-21:

| Reader | Today (probe9b) | After P-21 | Mechanism |
|---|---|---|---|
| `linkEditText` | `example.com` | `[[example.com\|x]]`; under P-23's spec `[[example.com]]`, which the field marks invalid | `linkValue.ts:71-73`; `PropertyValueInput.tsx:59` |
| `linkValueFromRename('y')` | `[y](example.com)` | `[[example.com\|y]]`, a phantom connection written to disk (breaks P-01) | `linkValue.ts:99-104` |
| `linkDisplayText` | `x` | `x` (alias wins); aliasless `[](Notes.md)` changes `Notes.md` → `Notes`, moving sort/filter | `linkValue.ts:112-113`, `filter.ts:149`, `sort.ts:62` |
| `linkAlias` | `x` | `x` | `linkValue.ts:78` |
| `valueClickIntent` (unchanged code) | `open` | `null` | `valueClick.ts:49-51` (moot once the 1d cut lands: always `edit`) |
| `LinkCell` (unchanged code) | anchor opens | `ConnectionCell`, `resolveConnection` null, a dead anchor | `LinkCell.tsx:40-41,75,86` |
| `linkValueMenuTarget` (unchanged code) | url menu with Preview/Open In Browser | generic fallback | `connectionMenuActions.ts:89-91` |
| `linkValueFromEdit`'s `cur` | url alias carried | not carried | `linkValue.ts:92-93` |

A resolved read would need the api or resolver at `editorText` (`parseEditorValue.ts:9`; the inline editors get no `connections`, T-08) and at `linkValueFromRename` (popover mounts do pass `connections`), and nothing in the delta counts it (≈ +3). Is P-21 S2-D with a split bolted on? Yes: the rule is S2-D's verbatim, and the split is a convention, not a type. Nothing stops a renderer caller from reading the resolver-free `page` kind, and P-23 does. The coherent shapes are: (a) `readLink` reports the **written syntax** (`wiki | markdown | bare` with title/dest, heading, alias) and classifies nothing, so the host answers by name-match and the renderer by `tokenTarget` resolution, with rename and Edit Title keeping the written syntax (which also makes `linkValueFromRename` syntax-preserving as the body rename is); or (b) S3-1's tiebreak (`!isValidLink(dest)`), which keeps `[x](example.com)` a url on both sides and leaves `[x](Dotted.Title)` unrecognized by the host (fail-safe).

**2 · T-01 / P-21 on the Negative Question.** `namesGonePage` is the only host reader whose resolver-free misread loses data: probe9b `[x](www.google.com)` → `namesGone=true` under P-21. On a frozen restore, `reconcileGovernedRoot` (`contextResolve.ts:132,143-151`) nulls the value and `restoreScrub.ts:39,55-57` strips it; it's noted, but `parkLinks` finds no bundle titled `www.google.com`, so it's gone.

**3 · `valueTarget` Duplicates `tokenTarget`.** `tokenTarget` (`connectionsApi.ts:70-74`) already dispatches wiki → `titleTarget`, markdown → `resolveMdTarget`, and `cellLinkTarget` (`cellStatic.tsx:437-447`) and `tokenMenuTarget` (`:97-112`) build on it. The lane's `valueTarget` re-dispatches the same kinds from `readLink`/`MD_LINK` output, a third mapping. Probe9b: every link-shaped value tokenizes to one whole-range token (`[[Old|a]]` [0,9], `[[#H]]` [0,6], `[x](example.com)` [0,16], `[x](https://a.com)` [0,18]); only a bare URL yields none. So `valueTarget = whole token ? heldTarget(tokenTarget(api, raw, tk), own) : isValidLink(raw) ? external : invalid` costs ≈ +5..+6 with a `perText(tokenize)` memo (as `cellTokens`, `cellStatic.tsx:52`), and inherits the editor grammar. That fixes the value side of A-09 for free: `[^1](https://a.com)` → no token (footnote), `[a](b) [c](d)` → two tokens, neither whole (probe9b), where `MD_LINK` reads both as one link. The commit reader (P-23) can read the same `valueTarget` plus a page-index lookup rather than a separate resolver-callback reader: one classification for draw, open, menu, and commit.

**4 · Click-Intent Cut (1d: Padding Edits for Both Kinds).** Verified and under-counted. Beyond `urlClickTarget` (`linkValue.ts:64-68`, 5 + blank), `{kind:'open'}` (`valueClick.ts:18`), and the three handlers (`TableView.tsx:155`, `CardValue.tsx:94`, `PropertyPanel.tsx:301`): under 1d both arms return `{ kind: 'edit' }`, so the link arm `valueClick.ts:47-52` (6) collapses into `case 'link':` above `case 'text':` (+1); `valueClick.ts:6` (`readLink, urlClickTarget`) loses both names (−1); and `openWebLink` has no other use in `TableView.tsx:52`, `CardValue.tsx:29`, `PropertyPanel.tsx:42` (−3; grep shows one use each). User-visible: a page value's padding click now opens the editor (today nothing, `valueClick.ts:21`). The `valueClick.ts:1,21` comments go false.

**5 · P-24/P-25 vs 1d's Resting Text Values.** Under 1d, `TextCell` authors at rest with the resting table cell's mechanism: Pommora's rows and Cut/Copy/Paste/Paste As/Paste Without Formatting, committed without focus, through a `menuAt` built like `cellStatic.tsx:449-477`'s `menuTarget` (needs a commit and `host`). P-24 mounts page values in that same `TextCell` with `menu={false}` so a parent pops a different menu (P-25). That gives two owners of right-click on identical syntax in identical renderers: a Text value `[[Page]]` (resting authoring, Rename edits text) and a Link value `[[Page]]` (parent menu, Rename opens the alias popover). The decline is the seam where they diverge, and Link values would get no system rows. The two shapes are: parent-owned (P-25, needs S7-A's promise) vs value-owned (S2-B: the value menu handed to `TextCell` as `menuAt`, +2 prop / +9 parent threading per §3.10; `onCell`'s −10 isn't free there, since cell actions then need their own route back). Another lane costs the resting mechanism; flag for the plan.

**6 · P-22's Remaining Behavior Changes.** (a) Bodies change too once the alias drop lands: `[[Old|New]]` in prose becomes `[[New]]`. (b) A Link value `§H` on the renamed page is rewritten by a heading rename (`p9.out:24`). (c) `[x](Old)` relabels and renames to `[x](Old%202)`/`[x](New%20Title)`, the encoded spelling.

---

#### Missed (M9-01…)

**M9-01 · Nested-YAML Gone Values Are Stripped on Frozen Restore but Never Noted or Parked.** `namesGonePage` reads `typeof raw === 'string' ? parseConnectionText(raw) : null` (`propertyValue.ts:124`), while `reconcilePropertyValue` decodes through `linkEntry(raw, 2)` first (`:73,134-136`). Probe9b: `[["Gone"]]` → `namesGonePage=false`, `reconcilePropertyValue=null`; `[["Kept"]]` → kept. At `restoreScrub.ts:49-58`, `reconcileGovernedRoot(raw, world, frozen)` retires the key (frozen skips the shrink guard at `contextResolve.ts:143`, so `:149` retires it), `unlinked(raw)` (`:39`) returns nothing, so `note()` records nothing: the value is stripped and never parked. The same split exists at `restoreProperty.ts:65` (raw filter, then `refillValues` → `reconcilePropertyValue`, `assignment.ts:57`) and `assignment.ts:95-99`. Second miss, same cause: the noted value is `String(raw)` (`restoreScrub.ts:43`, `restoreProperty.ts:66`, `assignment.ts:99`), which for `[["Gone"]]` is `"Gone"` (probe9b), and `parkLinks`' `parseConnectionText("Gone")` refuses it. `goneEntry` already unwraps (`cascade.ts:96`). Reach: Pommora's YAML writer quotes strings and `writtenSpelling` keeps a raw nested spelling unchanged (`propertyValue.ts:145-146`), so it applies to hand-written unquoted `[[Page]]` values, which Obsidian users write. Fix: `namesGonePage` reads `wholeValueLink(raw)` and the three notes write `linkEntry(raw, 2)` (±0..+1). It belongs in P-21's step.

**M9-02 · `hasAlias` Goes Dead Under 1b's Labels (Uncounted −7).** The label `ctx.external ? 'Rename' : ctx.hasAlias ? 'Edit Title' : 'Add Title'` (`connectionMenu.ts:84`) is `hasAlias`' only reader. Under 1b/1c, labels read `Rename` and `Edit Title`/`Edit Link` regardless of alias, so `ConnMenuContext.hasAlias` (`connectionMenu.ts:14`), its two sets (`connectionMenuActions.ts:30,49`), the target fields (`connectionsApi.ts:26,33`), and their writers (`connectionsApi.ts:87,108`) go: −7 (`:85` falls inside P-25's −20). `aliasedToken` keeps its other readers (`linkEdit.ts:31`, `cellStatic.tsx:95`, `decorations.ts:593`). Likely the menus lane's to count; count once.

**M9-03 · Heading Rename Recomputes the Outline per Value Key.** `rewrite` evaluates `headingOutline(outlineOf)` as an argument on every call when `own` is the renamed page (`cascade.ts:185-187`), and `patchOf` calls it per Text key (`:210`) besides the body (`:226`). That's one full-body outline scan per Text key at settle time, plus one per Link key under P-22. Hoisting it once per file (≈ ±0) removes it. Low impact (one file, settle-time); listed because P-22 widens it.

---

#### Corrected Deltas

Production TS lines unless noted; `wc -l` spans include the trailing blank line where a whole function goes.

| Option | Lane | Corrected | Arithmetic |
|---|---|---|---|
| P-21 one host reader | ≈ −1 | **≈ +2 unique** (−3 with S1-B's fold counted here); **+3 more** for renderer readers if the arm is P-21's rule | Fold-only `readLink` ≈ 8 vs 13 today (−5, S1-B's); page arm +3; `propertyValue.ts:10` −1; `holdings.ts:6` replaced ±0; `parkLinks`/`namesGonePage` call swaps ±0 → +3 −1 = +2. Renderer migration (`linkValueFromRename` syntax-keeping +2, `linkEditText` +1) applies only under P-21's tiebreak, not S3-1's. |
| P-22 body rewrite | ≈ −26 (with F-035) | **≈ −26 to −29** (with F-035, which is mandatory) | `rewrite.ts:112-133` −22, imports `:2`,`:17` −2, `cascade.ts:200-205` −6 → `const patch` +1, `cascade.ts:20` −1 (the import stays multi-line at 105 cols), alias drop +2 → −28; `spend.ts` +2 with the `landed === was` guard (Biome splits the 101-col map) → **−26**, or −1 without it → −29. Optional −1: inline `entries` (`cascade.ts:199`). |
| P-23 one commit reader | ≈ +7; ≈ −7 with S2-C | **≈ +9; ≈ −1 with S2-C** | Lane +7 (fall-through +1, holder +6) + label carry into the page arms +2 = +9. S2-C −14 (`linkResolve.ts` 8, `treeIndex.ts:283-288` 6) + `connections` to three inline editors and `parseEditorValue` +4 → −10; +9 −10 = −1. |
| P-24 pages ride `TextCell` | ≈ −27 TS, −5 CSS | **≈ −15 TS** (−13..−17), −5 CSS | Deleted: `ConnectionCell` `:63-97` −35, old branch `:40-41` −2, `resolveConnection` import −1 = −38. Added: `valueTarget` +6, page/self branch +4, LinkCell `connections` prop +2, imports (`TextCell`, `valueTarget`+`ConnectionsApi`, `resolveFollow`+`dwellTarget`, `glanceHost`, `connectionText`) +5, address `onPointerOver`/`Out` +2, `Cell.tsx` +1, `TextCell` decline +3 = +23. −38 +23 = −15. CSS `table.css:258-262` −5. |
| P-24 click-intent cut (ruled, 1d) | ≈ −9 | **≈ −18** (−19 with blank) | `urlClickTarget` −5 (+blank −1), `open` member −1, three handlers −3, link arm `valueClick.ts:47-52` −6 +1 (`case 'link':` joins `text`), `valueClick.ts:6` −1, three `openWebLink` imports −3 → −18. |
| P-25 value menu | ≈ −39 gross | **≈ −39 to −41, conditional on S7-A (#16); ≈ −32 without it** | `onCell` channel −10 (`connectionsApi.ts:5,19`; `connectionMenu.ts:24,61-62`+blank; `connectionMenuActions.ts:4,38,67-69`); `linkValueMenuTarget` 28 → 8 −20; `LinkCellAction` `:74`+blank −2; parents −5/−5/−1 = −11; open/copy applier +4 → −39 (−41 counting the blank in `isConnCellAction`'s span). Without S7-A, `onCell` folds into a widened `apply` (≈ −3 instead of −10). The `linkValueMenuTarget` −20 and `apply` filter overlap S7-A's count (J1); subtract once when summing with #16. M9-02 (−7) is additive if the menus lane doesn't own it. |
| Lane "new" total (beyond the synthesis) | ≈ −48; ≈ −57 with cut | **≈ −45; ≈ −63 with cut** (S7-A taken, M9-02 excluded) | Lane: P-22 −26, P-21 +1, `onCell` −11, parents' fold −12 = −48; cut −9. Corrected: P-22 −26, P-21 +2, `onCell` −10, fold −11 = −45; cut −18 → −63. P-23's +2 label carry and P-24's −12 shortfall sit in the synthesis-replacing rows (S3-3, S2-A), not here. |

*Superseded by* §De-Overlapped Delta *rows 1-9; retained as the lane verifier's own sum, computed before 9b replaced P-25 and before the cross-option overlaps were removed.*

---

### Lane 10 · Authoring in a Resting Table Cell

**Coordinator Notes on Lane 10 (After the Disclosed Calls and 1g):**
- **T-A Is Not Taken:** the Disclosed Calls chose "one fallback for every surface that can't hold a swap — wait for the title, then commit once under the whole-text guard," with a live cell or TextPane forwarding a still-pending entry to the same wait on close (9b Q-21/Q-22). That is T-B's shape plus the close-forward. This verification's T-B re-cost applies to it: `resolveLinkTitle` dedupes through `inFlightTitles` and returns early when cached or failed (`cacheSlice.ts:24-25`), so the promise needs a map and resolved arms for both early returns (+4..+6, not 9b's +3), and the rest consumer re-finds and commits (+3..+6) → **+7 to +12**; the close-forward adds **+3 to +4** → **+10 to +16** for F-043 and B-158 together. T-A's verified mechanics (source-form matching, `changesTo` minimal diff, convergence) stay recorded below as evidence; only M10-04's identical-text no-op survives as a separate finding.
- **1g Drops Text-Value Parity:** R-14's cost (+16..+28), M10-02's menu collision, and M10-03's missing owner apply to property value cells, which keep today's right-click. MarkdownPM table cells keep reading (b) with system rows, Undo/Redo out.
- **The Apply-Live Alternative** (answer at rest, enter only to apply) isn't what 1g ruled ("every construct's right-click menu at rest without focusing"); a chosen row entering the cell is a separate product call. It's recorded as evidence that the rest-side paste re-implementation is the costliest piece.


HEAD `42a18f4a5`, clean tree. Every cited span opened with `sed`/`awk`; counts by `wc -l` (production only). **V** = read, **VR** = run (`probe10b/p.ts` + `probe10b/nest.ts`, output `probe10b/p.out`; the lane's `probe10/p.ts` re-run at HEAD in `C-runs/p10.out` matches every **VR** claim), **I** = inferred. File sizes re-measured and all match the scout: `cellStatic.tsx` 486 · `MarkdownTable.tsx` 645 · `CellEditor.tsx` 291 · `widget.tsx` 578 · `sync.ts` 41 · `linkEdit.ts` 173 · `linkFormat.ts` 86 · `pendingTitle.ts` 74 · `connectionsApi.ts` 158 · `linkClicks.ts` 156 · `Menus/menu.ts` 108 · `Core/Actions/editorMenu.ts` 143 · `Desktop/Actions/editorMenu.ts` 138 · `applyEdit.ts` 29 · `cacheSlice.ts` 53. Added: `surface.ts` 98 · `TextCell.tsx` 82 · `TextPane.tsx` 183 · `pasteLink.ts` 137 · `codec.ts` 86.

`exports.sh` (cross-file production readers): `linkActionText` 1 (`cellStatic.tsx`) · `applyUrlLinkAction` 1 (`linkClicks.ts`) · `wikiAuthorTarget` 1 (`cellStatic.tsx`) · `applyLinkAction` 2 (`linkClicks.ts`, `linkFormat.ts` comment) + 1 test (`linkEdges.test.tsx`) · `linkGestures` 1 (`TextCell.tsx`) · `renderCellContent` 1 (`TextCell.tsx`) + 3 tests · `cellCommitChange` 1 (`widget.tsx`) + 2 tests (`sync.test.ts`, `widget.test.ts`) · `awaitTitle` 2 · `PendingTitle` 0 prod · `applyEditorAction` 3. No test calls `linkActionText` or `wikiAuthorTarget` directly.


---

**R-01 · Two Menu Doors; the Resting Cell Reaches One** · Verified · `cellStatic.tsx:417-427`; `Core/Actions/handlers.ts:7-10,11-14`; `Core/Pages/editorHost.tsx:100-103,104-109`; `Menus/menu.ts:83-108`; `Desktop/Actions/editorMenu.ts:26-31,128`; `node_modules/@codemirror/view/dist/index.js:161,2146-2148,4833-4836` · all spans exact.
`WidgetType.ignoreEvent` defaults to `true` (`index.js:161`); `WidgetTile.of` sets `contentEditable = "false"` when `!widget.editable` (`:2146-2148`); `eventBelongsToEditor` returns false for an event inside such a widget (`:4833-4836`). `TableWidget`/`ReactWidget` override neither (grep: 0 hits in `widget.tsx`, `reactWidget.ts`). `Desktop/Actions/editorMenu.test.ts` pins the `:128` gate at `:114-120` (scout `:113-119`). That Chromium reports `isEditable: false` for the static cell stays **I**.

**R-02 · A Non-Link Right-Click at Rest Focuses the Cell** · Verified · `cellStatic.tsx:354-357`; `MarkdownTable.tsx:456-462`; `CellEditor.tsx:245`; `Desktop/Actions/editorMenu.ts:43-50` (null at `:46`); `cellStatic.test.tsx:117-127` · spans exact.
Path as stated. Whether Chromium's params reflect the freshly mounted editor stays **I**.

**R-03 · Construct-by-Construct Map** · Corrected · `cellStatic.tsx:163-174,143-151,326-338,340-347,448-477`; `Core/Actions/editorMenu.ts:138-139`; `Core/Actions/connectionMenu.ts:91-109`; `Core/Interface/Menus/connectionMenuActions.ts:22`; `connectionsApi.ts:91-92,102`; `linkClicks.ts:139-154`; `Gestures/pointerPath.ts:89-90`; `gripMenu.ts:115-130`; `citationPointer.ts:63-65`; `MarkdownTable.tsx:577-601` · spans exact.
Every row holds except the phantom one's mechanism: a phantom connection draws `md-connection-phantom` spans with no `data-link-span` (`cellStatic.tsx:81-92`), so `linkSpanAt` misses `LINK_SELECTOR` (`:255`) and `menuAt` returns null before `tokenTarget` runs; only the ambiguous/`[[#H]]`/invalid cases take the `tokenTarget → linkMenuTarget → null` route (`connectionsApi.ts:91-92`). Same outcome (focus, no menu). Embed row **VR** (`["embed"]`). Footnote row **VR** (`ordinal: null`).

**R-04 · Read-Only Consulted Only After the Link Menu (B-56)** · Verified · `cellStatic.tsx:288-306,307-313,327,355,365,458-476`; `MarkdownTable.tsx:468-474`; `Core/Tiles/Surfaces/PageTile.tsx:182` · spans exact.
`readOnly()` is also consulted by the crossing-sweep `onMouseUp` (`:371`); no other authoring entry exists, so R-13's single consult closes it.

**R-05 · Row-by-Row Requirements** · Verified · `connectionMenuActions.ts:35-37`; `linkEdit.ts:22-36,27-29`; `linkFormat.ts:19-52,31-35,64-66`; `cellStatic.tsx:469-470`; `linkValue.ts:137-143`; `pendingTitle.ts:16-41`; `menu.ts:28-44,47-60`; `format.ts:65,224`; `format.ts:116-145` (scout `:112-140`); `formatState.ts:7-44`; `pasteLink.ts:17-39,86-109`; `pasteAsMenu.ts:99-122`; `CellEditor.tsx:154-163`; `MarkdownTable.tsx:112-113` · re-anchored `toggleWrap`.
Outputs **VR** (`p10.out`: unwrap at a point has no `selection`; `****` at a plain point `selection: 2`; range wrap `selection: 8`). Under 1d the Undo/Redo row is out of scope, and the Cut/Copy row's role semantics stay **I** (see R-16).

**R-06 · The Pure-Edit Layer Exists in Pieces** · Verified · `format.ts:28-32`; `edits.ts:37-42`; `applyEdit.ts:6-29`; `markdownCode.ts:16-29` (scout `:16-31`); `cellStatic.tsx:332-337` · re-anchored `applyEdits`.
Selections are post-change in both shapes (**VR**: `a word c` 2-6 wrap → `selection: 8`, the close marker's post-change seat). `applyEdit` reads `head` only for an `Edit` (`:20`), so `FormatEdit` needs `head?` for a range seat.

**R-07 · The Shape to Adopt (`linkEdit` + One Applier)** · Corrected · removes `linkFormat.ts:1-86` (86) + `linkEdit.ts:21-48` (28) = **114** · `linkClicks.ts:148-151,17`; `decorations.ts:370-374`; `menu.ts:63-80`.
The removal count holds (**V**). The added side doesn't fit 32-45: the codebase's own seven-arm switch under Biome, `linkActionText` (`linkFormat.ts:19-43`), is 25 lines; the merged switch adds the two seat arms (`wikiAuthorTarget`'s body `:27-35`, 9 lines, plus the url seat arm), the title builder (`formatted`, `:45-52`, 8 lines, now also building the `PendingTitle`), a `replace` helper (~3), and a new action union (`ConnEditAction | ConnUrlAction`, +1) → **≈ 40-50**; applier 12-14; net-new imports 4-6 (it reuses `linkEdit.ts:9,11,12,18`). Row 1 = 114 − (56..70) = **−44 to −58** (scout −50 to −66). **Behavior change, unstated:** `applyUrlLinkAction` never focuses after Remove Link, Delete, or Format (`linkFormat.ts:70-85`); R-07's "then focus" does, in the body. The no-op guard (`linkFormat.ts:77-79`, identical text → no change) must survive into the pure edit (+1, inside the range). The `{ wiki, url }` collapse also deletes `linkClicks.ts:17`, which S7-B counted and R-17 row 4 didn't. Overlap ranges in *§Corrected Deltas*.

**R-08 · `still()` Becomes a Whole-Text Guard** · Verified · `cellStatic.tsx:293-298,332`; sibling rule `widget.tsx:292,297` (scout `:290-296`) · re-anchored.
The table menu captures `source` at `:292` and stands down at `:297` if it changed. Adequacy stays **I**.

**R-09 · Entering the Cell Takes One Union** · Verified (sites) · `MarkdownTable.tsx:152-154,419-421,434-436,456-462,468-474`; `CellEditor.tsx:108-110,121-123,247-262`; `cellStatic.tsx:271-283` · every site exact: 3 refs, 3 reset sites (3 lines each), 3 props, `onActivate` 7 lines, `onSelect` 7 lines, selection block 16 lines.
The fourth `onActivate` callers (`MarkdownTable.tsx:349,388`) are drag activations, not seats. One arithmetic correction (R-17 row 3): written as a union + `switch` (the rule), the 16-line block doesn't shrink to 12: the `select` arm, the `point` arm with its `posAtCoords` `try` and its `sweep` branch, and the `null` default land at 15-19 lines.

**R-10 · F-043 and B-158 Are One Defect** · Verified · `cellStatic.tsx:471-474`; `pendingTitle.ts:43,68-70`; `surface.ts:54`; `widget.tsx:238-241` · exact.

**R-11 · A Swap Raw in a Row Splits It** · Verified · `links.ts:19-21`; `sync.ts:21` · **VR** re-run identical (`["x","[A","B](https://a.co)"]` raw; escaped round-trips).

**R-12 · Two Title Mechanisms (T-A, T-B)** · Corrected · `pendingTitle.ts:29-33,59-60,64`; `sync.ts:21-27`; `CellEditor.tsx:236-239,279-283`; `surface.ts:25-40,43-70`; `cacheSlice.ts:24-25`; `Pages/merge3.ts:4-9`; `api.ts:63-71`.
(a) The entry's matched `text` must be the source form too, not only the swap write: a `|` or `\` in the URL makes `cellToSource(link) ≠ link` (**VR**: `[d.co](https://d.co\|x)`), and the filter at `:33` would drop a display-form entry on the first remap. (b) The formula is **VR**-correct at link boundaries for `|`, `\`, `\\`, and newline cases, because a link's edges never split an escape pair; `cellToSource` isn't additive at an arbitrary cut (**VR**: `a\` + `|b`). A ragged row has no segment for the padded column (**VR**: `segments: [[21,24]]`; commit rewrites the row via `pipeRow`, `sync.ts:25-27`), so the title is unmappable there without a second formula. (c) The minimal diff already exists: `changesTo` (`merge3.ts:4-9`), which `mirrorBody` uses for the reverse direction (`api.ts:63-71`); reused in `cellCommitChange`, it keeps the entry (**VR**: maps to 31-51, text kept) and yields the identical document (**VR**). It changes `cellCommitChange`'s return to `TextEdit[]`; `tableSelfEdit` remaps through any change set (`widget.tsx:536`), and `tableMergeGuard` skips it (`tableGuard.ts:50`) — no conflict. (d) No scope switch is needed: with both sweeps mounted, either order converges on one swap (cell first → the cell's commit edits inside the page entry, which `:33` drops; page first → the cell's commit writes identical source, which `changesTo` reduces to `[]`, **VR**). Which sweep fires first is store-subscription order (**I**). `inlineSurface` already holds a scope switch (`blockGestures`, `surface.ts:25-40`), so one wouldn't be an odd kind anyway. **T-A from code ≈ +18 to +23** (itemized in *§Stress*). **T-B** is under-counted: `resolveLinkTitle` dedupes through an `inFlightTitles` Set and returns early when cached or failed (`cacheSlice.ts:24-25`), so a promise-returning version needs a promise map plus resolved arms for both early returns (+4..+6), and the rest consumer's re-find-and-commit adds +4..+6 → **≈ +9 to +13**. Under 1d, "Text values keep the view-local mechanism" leaves a resting Text value with no owner at all (M10-03).

**R-13 · One Consult at the Top of the Resting Right-Click** · Verified · `linkClicks.ts:146`; `menu.ts:88`; `cellStatic.tsx:327,365,371` · exact.

**R-14 · `TextCell` Becomes the Odd-One-Out** · Corrected · `TextCell.tsx:28-33,52`; `Cell.tsx:41,141`; `Views/Table/TableView.tsx:269-308,383,697`; `Views/Cards/CardValue.tsx:109-133`; `Properties/PropertyPanel.tsx:320-333,390-404` · exact.
"Its other constructs nothing" is false. `linkGestures.onContextMenu` returns false without stopping the event when no link is hit (`cellStatic.tsx:417-422`), so the press bubbles to the value's host: in a table view to `.data-cell` → `openCellMenu` (Edit · Remove, `TableView.tsx:697,383,269-308`; model `cellMenu.ts:134-135`), on a card to `CardValue`'s menu (Edit · Remove · Hide, `:109-133`), and in the property panel to the row's `propertyMenuModel` menu (`PropertyPanel.tsx:390-393,320-333`). A resting Text value has three different non-link right-click menus today. `Cell` holds `commit?` (`:41`) but passes `TextCell` only text/connections/holder/onPane (`:141`). Cost under 1d in *§Stress*.

**R-15 · Pointer-to-Offset Mapping** · Corrected · `cellStatic.tsx:64-67,75,105,110-112,138,158-160,163-174,177,249`; `TextCell.tsx:59-61` · exact.
No DOM-offset reader exists in Core or UIX outside CodeMirror's `posAtDOM` (grep). The mapper runs on `contextmenu` only, unlike the hover path, which already runs `linkAt` per `pointerover` (`:428-431`), so it breaks no high-frequency rule. The token-less fast path (`:65,67`) returns a bare string with no spans, so attributes ride the token path only (R-25 holds). Two items the +17..+23 omits: list lines carry `data-cell-line` as an index (`:237`), not a base offset, and `TextCell` lines carry neither (`:59`), so a base attribute is needed on both (+2); the classless `: content` arm (`:170-171`) is unreachable (M10-05), so every token draws a span the walk can read. **≈ +20 to +27.**

**R-16 · The Door for the Editor Menu at Rest** · Corrected · `Desktop/Actions/editorMenu.ts:73-87` (roles `:74-75,77-79,87`), `:80,82-86,104-116,128,133`; `Core/Actions/editorMenu.ts:18-37`; `menu.ts:95-102`; `bridge.ts:266`.
Paste As and Paste Without Formatting aren't role rows: with a parked request both already `editor.resolve(...)` to the renderer (`:80,104-116`; `:85`). The roles are Undo, Redo, Cut, Copy, Paste, Select All. Two things the scout didn't state: the `:128` gate returns before `systemItems` runs, so the resting path needs the schema flag **and** a branch there; and Paste Without Formatting's `enabled: f.canPaste` (`:84`) reads the non-editable press's flags, so at rest it needs an override (**I**: Chromium's `canPaste` follows editability). Role semantics at rest stay **I**: Cut acts on nothing, Paste on whatever element holds focus (the page body's caret when the page editor had it), and Copy copies the drawn text (alias, `§`, ordinals, `•`), where a live cell copies source — an odd-one-out unless renderer-resolved. Under 1d, Cut, Copy, and Paste become renderer-resolved items at rest; Undo, Redo, and Select All are dropped. No seam rule breaks: same channel (`bridge.ts:266`), schema in main-importable `Core/Actions`, clipboard through `host.clipboard` (`editorHost.tsx:95-98`), Desktop still the only Electron caller. Recomputed in *§Stress* and *§Corrected Deltas*.

**R-17 · The Arithmetic** · Corrected · see *§Corrected Deltas* (every row redone; shared total T-A −65 to −94; the 1d shape −9 to +59).

**R-18 · What Each Reading Pulls In** · Corrected · adds `Pages/merge3.ts` (T-A reuse), `Guards/tableGuard.ts` (reads `tableSelfEdit`; unchanged but in the path), `pasteLink.ts` (`literalAt`/paste extraction under 1d), and for Text values `TextCell.tsx`, `Cell.tsx`, `TextPane.tsx`, `PropertyValueInput.tsx`, `TableView.tsx`, `CardValue.tsx`, `PropertyPanel.tsx`.

**R-19 · Role Rows Act on the Focused Element** · Verified (stays **I**) · `Desktop/Actions/editorMenu.ts:73-87`.

**R-20 · The Two Doors Stay Exclusive** · Verified (code **V**, Electron **I**) · `cellStatic.tsx:423`; `menu.ts:105` (`return false`); `MarkdownPM.md:97`.

**R-21 · When a Resting Edit Enters the Cell** · Verified · `menu.ts:78`; `caretPlacement.ts:10-15`; `format.ts:51,55-59` (scout `:51-55`) · re-anchored.

**R-22 · The Seat Survives Approximately** · Verified · `cellStatic.tsx:463-464`; `CellEditor.tsx:258,279-283`; `codec.ts:52` · exact.

**R-23 · Pasting at Rest Must Honor the Table Payload** · Verified · `CellEditor.tsx:154-163`; `MarkdownTable.tsx:243-252,442` · `onFill` reaches only `CellEditor` (`:442`), not `StaticCell`.

**R-24 · Exact-Text Matching Must Survive T-A** · Verified · `pendingTitle.ts:29-33` · **VR**: today's whole-segment commit maps the entry to `52,25` (dropped), the minimal diff to `31,51` (kept).

**R-25 · `TextCell` Shares the Hot Path** · Verified · `cellStatic.tsx:64-67`; `TextCell.tsx:60`.

**R-26 · Footnote Markers Have No Live Menu Either** · Verified · `citationPointer.ts:63-65` · **VR** (`ordinal: null`).

**R-27 · Embeds Change Under the Reader Lane** · Verified · `tokens.ts:274-280` (scout `:270-279`) · **VR**.

**R-28 · "Every Link" Meets `null` Targets** · Verified · `connectionsApi.ts:91-92` (scout `:89-92`).

**R-29 · Tests That Go False** · Corrected · `cellStatic.test.tsx:117-127`; `cellLinks.test.tsx:154-269` (incl. `:194`, `:207-239`, `:253-269`), `:271-321` (`:317-320`); `Desktop/Actions/editorMenu.test.ts:114-120`; `Menus/editorMenu.test.tsx:59-177`.
`linkEdit.test.tsx:65,80,95,124` are `editable:` expectations in menu-target tests (`describe` at `:58`), pinned by S7-A's `editable` fold, not applier calls. Missing: under T-A, `sync.test.ts:18,24,28,32,36,47,53,65,71` and `widget.test.ts:94-125` pin `cellCommitChange` as one `TextEdit` (`.insert`, `splice(...)`); the `applyLinkAction` reader `linkEdges.test.tsx` (exports count 1).

**R-30 · Comments** · Verified · `cellStatic.tsx:285,383,396,448`; `linkEdit.ts:21`; `linkFormat.ts:54`; `pendingTitle.ts:43`; `Desktop/Actions/editorMenu.ts:128`; `menu.ts:82` · exact. Add `sync.ts:8` and the `sync.test.ts:18` title under T-A.

**R-31 · Docs** · Verified · `MarkdownPM.md:56,97`; `Editor-Internals.md:17`; `ConnectionsPM.md:43-49` (scout `:44-49`; the Author row is `:43`) · re-anchored.

**R-32 · A T-A Swap Takes the Rebuild Path** · Corrected (survival **V** by sibling path, unprobed live) · `pendingTitle.ts:64`; `sync.ts:8-9`; `widget.tsx:371-376` (scout `:406-410`, which is `buildWidgetDecorations`' height hand-back); `widget.tsx:343,536,546`; `CellEditor.tsx:277-283`.
`updateDOM` is at `:372-376`. Survival is supported by a path production already takes: a focused cell's ⌘Z calls `undo(view)` (`:343`), which dispatches without `tableSelfEdit`, rebuilds through `editAffectsTables` (`:546`), re-renders the same React root, and reaches the live editor through `mirrorBody` — the case `CellEditor.tsx:278` names ("a reorder or focused undo brings genuinely different text the sync must apply"). Upgrade from **I** to **V** by sibling path; a live probe remains unrun.

---

#### Stress

##### T-A Pending Titles (R-12)

- **(a) Source Form:** both the announced entry (`text: cellToSource(insert)`) and the swap write (`p.cell ? cellToSource(text) : text`, compared against `p.text` in source form) need it. Both fit the budget (+1 each).
- **(b) Mapping:** correct at link edges (**VR**); unavailable on ragged rows (**VR**) unless the widget re-scans after the commit (+2) or the title is dropped there.
- **(c) Minimal Diff:** reuse `changesTo` (`merge3.ts:4-9`); MarkdownPM already imports it (`api.ts:4`). It also makes identical rewrites empty (**VR**), which today aren't (M10-04).
- **(d) Scope Switch:** unnecessary (convergence above).
- **Cost From Code:** `pendingTitle.ts` `cell?: true` + source-form swap + import (+3) · `sync.ts` `changesTo` arm + import, return `TextEdit[]` (+4..+5) · `widget.tsx` commit takes `title?`, maps `from`/`to`, adds the effect + 2 imports (+6..+8) · `MarkdownTable.tsx` `onCellCommit` type + import (+1) · `CellEditor.tsx` updateListener forwards the transaction's `awaitTitle` + import (+3..+4) · `cellStatic.tsx` `onCommit(text, title?)` + import (+1..+2) = **+18 to +23**.
- **1d Gap:** no page editor owns a resting Text value (M10-03).

##### Offset Mapper (R-15)

Right-click only (and at Copy/Cut time), so rule-safe. Span attributes stay on the token path, leaving the fast path untouched. No existing reader to reuse; CodeMirror's `posAtDOM` needs a view. **+20 to +27.**

##### Same Door (R-16) Under 1d

Role rows can't serve a resting cell for Cut or Paste (**I**), and Copy serves the drawn form; Undo/Redo/Select All are dropped by ruling. Replacements, all renderer-handled through the parked request:
- **Desktop:** resting branch in `systemItems` — omit Undo/Redo/Select All, Cut/Copy/Paste as `editor.resolve` items with labels and accelerators, PWF `enabled` override, `:128` branch → +6..+10.
- **Core:** three action constants (+2..+3) and Insert Link's source selection in place of `params.selectionText` (`:133`) (+1..+2); the `resting` flag itself is counted under (b).
- **Renderer:** Copy (source slice → `host.clipboard.write`, +2), Cut (+3), Paste (clipboard read, table payload → `onFill`, `literalAt` + `decidePaste`, commit with title: +10..+14), Paste As (`pasteAsTarget`/`pasteAsWrite` with the literal check: +5..+7), PWF (+2), `StaticCell` `onFill` prop and wiring (+2), a pure `literalAt` extracted from `pasteLink.ts:42-47` (+1..+2).
- **System Rows Total: +34 to +47.** The rest-side Paste and Paste As restate `pasteAs`'s ordering (`pasteLink.ts:86-109`) — a second copy unless S3-2's pure pipeline lands first.

##### Alternative: Answer at Rest, Apply Live (**I**)

The menu is answered at rest (no focus on the press); any chosen row that writes enters the cell with a seat carrying the action (`Seat` gains `then`), and `CellEditor` runs it after seating through the one live path (`applyEditorAction`, the merged `applyLinkAction`). Unlike B′, nothing re-pops: only the application waits for the mount. It deletes `commitEdit`, the rest-side Paste/Paste As/PWF re-implementation (the live `applyEditorAction` already handles `paste:plain` and `paste-as:*`, `menu.ts:68-75`; table payloads already route through `CellEditor.tsx:154-163`), the `editFor` export and `insertLinkEdit` split, and T-A's rest half; it adds the `then` runner (+5..+8) and live Cut/Paste arms (+5..+8, the paste body extracted from `pasteLink.ts:128-134`). Copy at rest needs no entry (+2). Text values open the `TextPane` with the same seat. **≈ −36 to +22** for the 1d shape (vs −9 to +59), with one mechanism per surface. **User-visible:** Remove Link, Delete, Format, and an unwrap chosen at rest now enter the cell (body parity, R-21's recommended rule extended to every write); `cellLinks.test.tsx:194` ("rewrites the cell in place, without entering it") and `:201` go false. Needs Nathan's call on whether a chosen row may enter.

##### R-07 / `linkEdit`

Takes the same lines as S7-B, Side 2, and S3-2's `linkFormat.ts` piece; ranges in *§Corrected Deltas*. Its applier and `pasteLink.ts`'s `writeLink` still both write the announce pair (M10-06).

##### R-09 Seat Union

All 15 sites exact (R-09). Net −13 to −17 (row 3).

##### R-14 / Text Values Under 1d

- **Commit:** `TextCell` takes `commit` from `Cell` (`:141`, +0..+1; prop +1); read-only is `commit === undefined` (no new prop). The empty→`null` rule (`TextPane.tsx:23,107`) must be shared, not restated (+1..+2 to export it).
- **Ask:** `TextCell` has no `EditorHost`; `useEditorHost({})` as `TextPane.tsx:43` (+1..+2).
- **Shared Wiring:** `menuAt`/`commitEdit`/the ask live inside `StaticCellImpl`; both surfaces need them from one hook (+4..+8).
- **Entering With a Seat:** `TextPaneEditor` seats at the end only (`TextPane.tsx:147`); a seat prop through `PropertyValueInput` and the three hosts' intent paths (`TableView`, `CardValue`, `PropertyPanel`) (+8..+12).
- **Titles:** withheld at rest (+1..+2) or T-B (+9..+13).
- **Menu Collision:** unpriced pending a ruling (M10-02).
- **Total: +16 to +28** (titles withheld).

---

#### Missed (M10-01…)

**M10-01 · A Link Nested in Emphasis Is Dead and Raw at Rest** · **VR** · `cellStatic.tsx:72-75`. The tokenizer emits overlapping tokens (`**a [[P]] b**` → `bold 0-13`, `wikiLink 4-9`; `[x **b**](url)` → `link 0-23`, `bold 3-8`), and `if (s < pos) continue` drops every token inside an earlier one. A connection or weblink inside bold/italic/highlight renders as raw `[[P]]` with no `data-link-span`: no follow, no dwell, no menu; emphasis inside a label draws its `**`. Reaches `TextCell` through `renderCellContent`. Under 1b.3 ("everything at rest"), these links get no menu. The body's rendering of the same text is **I** (separate mark decorations). Fix ≈ +8..+15 (nested render), uncosted by any lane.

**M10-02 · A Resting Text Value Already Has Three Non-Link Menus** · **V** · `TableView.tsx:697,383,269-308`; `CardValue.tsx:109-133`; `PropertyPanel.tsx:390-404,320-333`. 1d puts the editor rows and system rows (door 2, native) on the same press that today pops the value's own menu (door 1, `popMenu`). One press can pop one menu: either the value rows move into the native editor menu (rows, main routing, renderer handling) or the text area shows the editor menu and the padding keeps the value menu. Needs a ruling before it can be costed.

**M10-03 · T-A Doesn't Reach Text Values at Rest** · **V** · `TextPane.tsx:152-156` (view destroyed on close); no page editor holds a Text value. Under 1d, Format ▸ Page Title on a resting Text value has no owner, so "one mechanism for body, live cell, and resting cell" holds only for table cells; Text values need T-B (a second swap rule) or Page Title withheld at rest.

**M10-04 · A Resting Commit of Identical Text Is Still a Change** · **VR** · `sync.ts:23`; `cellStatic.tsx:471-473`. `cellCommitChange` returns a non-empty replace for identical text (**VR**: `empty? false`), and the rest url arm commits whatever `linkActionText` returns, so Format ▸ (the link's current form) at rest records an empty undo step. The body guards it (`linkFormat.ts:77-79`); the rest path doesn't — the same rule written once and skipped once. `changesTo` (T-A (c)) removes the guard's reason in both places.

**M10-05 · An Unreachable Arm in `renderCellContent`** · **V** · `cellStatic.tsx:163-173`; `Engine/intents.ts:120-133`. Every kind reaching the `else` arm (italic, bold, strikethrough, inlineCode, highlight, both latex kinds, embed) has a `CONTENT_CLASS` entry, so `: content` (`:170-171`) never runs; `CONTENT_CLASS` is `Partial` only to allow the link kinds, which have their own arms. −2..−3, and it lets R-15's walk assume a span per token.

**M10-06 · R-07 Keeps the Announce Pair in Two Writers** · **V** · `pasteLink.ts:53-62` and `linkFormat.ts:75-85` today; R-07's applier re-writes the second (`awaitTitle` effect + `linkTitles.resolve`). S3-2's `writeLinkAt` was the one owner; R-07 should land on it (or make its applier the sole writer `writeLink` calls). ±0 to −3.

---

#### Corrected Deltas

##### R-17 Redone (Shared by Both Readings)

| # | Item | Removed (Measured) | Added | Net | Scout |
|---|---|---|---|---|---|
| 1 | Pure `linkEdit` + one applier; `linkFormat.ts` deleted | `linkFormat.ts:1-86` 86 + `linkEdit.ts:21-48` 28 = 114 (**V**) | switch 40-50 + applier 12-14 + imports 4-6 = 56-70 (**I**, anchored on `linkFormat.ts:19-43` = 25 for seven arms) | **−44 to −58** | −50 to −66 |
| 2 | Rest link menu rewrite (`menuAt` + `commitEdit` + R-13 consult) | `:288-306` 19 + `:448-477` 30 + `:33-34` 2 + dead `linkAddress` `:5`, `Token` `:8` 2 = 53 (**V**) | `menuAt` 10-12 + `commitEdit` 7-9 + `linkEdit` import 1 = 18-22 | **−31 to −35** | −33 |
| 3 | Seat union | `MarkdownTable` −15 (**V**: 3→1, 3→1, 3→1, 7→5, −7); `CellEditor` props −4 (**V**); `StaticCell` `onSelect` −2 (**V**) | block 16 → 15-19 (−1..+3); `Seat` +4; import +1 | **−13 to −17** | −15 to −21 |
| 4 | `{ wiki, url }` → one apply | `linkClicks.ts:148-151` 4 → 1 (−3); `linkClicks.ts:17` (−1) | — | **−3 to −4** | −2 |
| 5 | `FormatEdit.head` + `applyEdit` effects | — | `format.ts:28-32` +1; `applyEdit.ts:9,22` +1..+2 | **+2 to +3** | +2 to +3 |
| 6 | Titles: T-A / T-B | — | itemized in *§Stress* / promise map + consumer | **+18 to +23 / +9 to +13** | +20..+24 / +6..+8 |
| | **Shared Total** | | | **T-A −65 to −94 · T-B −75 to −103** | T-A −74..−95 · T-B −88..−111 |

Arithmetic: T-A low end −58−35−17−4+2+18 = −94; high end −44−31−13−3+3+23 = −65. T-B −58−35−17−4+2+9 = −103; −44−31−13−3+3+13 = −75.

##### Readings

| Reading | Items | Net |
|---|---|---|
| (a) Links Only | shared (T-A) + fallback `:355-356` (−1) | **−66 to −95** |
| (b) Core Over (a) | mapper +20..+27 · ask/reply +12..+16 (**I**) · `editFor` export + `insertLinkEdit` +2..+4 (**I**) · schema flag, sender flag, `:128` branch +2..+3 | **+36 to +50** |
| 1d System Rows (no Undo/Redo) | Desktop +6..+10 · Core +3..+5 · renderer +25..+32 | **+34 to +47** |
| 1d Text Values | commit +2..+4 · host +1..+2 · shared hook +4..+8 · seat +8..+12 · titles withheld +1..+2 | **+16 to +28** (+8..+11 more with T-B instead of withholding; menu collision M10-02 unpriced) |
| **1d Shape (b + system rows + Text values + T-A)** | −95+36+34+16 = −9 · −66+50+47+28 = +59 | **−9 to +59 (mid ≈ +25)** |
| 1d Shape, Apply-Live Alternative (**I**) | rows 1, 4, 5 as above; row 2 −42..−44; row 3 −5..−12; T-A live half +17..+21; (a) −1; (b) +34..+46; system rows +16..+25; Text values +14..+22 | **−36 to +22 (mid ≈ −7)** |

Scout's "(b) With System Rows ≈ +22 to −23 (T-A)" becomes **−9 to +59** under 1d: the shared rows shrink (rows 1, 3), the system rows don't shed much with Undo/Redo gone (the role swap at rest is required either way), and Text values add +16..+28 the scout left to the properties lane.

##### `linkFormat.ts` / `linkEdit.ts` Overlap (Count Once)

| Option | Lines It Counts | Its Figure | Inside R-07's 114? |
|---|---|---|---|
| **R-07 / R-17 Row 1** | `linkFormat.ts:1-86`; `linkEdit.ts:21-48` | −44 to −58 (corrected) | — |
| S7-B Applier Merge | `linkFormat.ts:60-61` + one prelude line (−3); imports `linkFormat.ts:1,7,8,9,11` (−5); comment `:54` (−1); `linkClicks.ts:17` (−1) | −10 | All but `linkClicks.ts:17`, which this verification moves to R-17 row 4 |
| Side 2 `linkAuthorEdit` | `linkEdit.ts:21-36` (16) + `linkFormat.ts:13-17` (5), `:19-43` (25), `:45-52` (8) = 54 → ≈ 38 | −16 | Yes, wholly |
| S3-2 `linkFormat.ts` Piece | `LinkActionText` `:13-17` (5) + `formatted` `:45-52` (8) + dispatch block ≈ `:73-84` (≈ 10) | −23 (−12 while `cellStatic.tsx:33,471-474` consumes `linkActionText`) | Yes, wholly |

Taking R-07 zeroes S7-B's −10 (its `linkClicks.ts:17` line now sits in row 4), Side 2's −16 (and its −10 merge and −6 closures, which rows 1 and 2 restate), S3-2's `linkFormat.ts` −12/−23 (S3-2's −40..−50 drops to ≈ −28..−38 for its remaining pieces), and adjustment J2 (−3).

---

### Lane 11 · Embeds Become Links, and Paste Retargets a Link

**Coordinator Notes on Lane 11:**
- **Two Verified Defects in the Lane's Own Design:** E-23's title precedence is inverted against 1c (fixed identically by this verification and by 9b Q-26), and E-25's `literalAt` edit would break pasting into the closed-but-tokenless `[]()`, `![]()`, `[x]()`, `[](P)` seats that ⌘K and Insert ▸ Embed ▸ Website write. Both are ±0 corrections.
- **9b Q-26 Extends `retarget`:** a Link value passes the next target's kind as the container syntax (P-02 storage) and no `format` (no Default Link Format label on a value), +1 inside Lane 9's count. 1e makes Edit Title / Edit Link a retarget for every link; see *X-04* for where that isn't reachable in the body.
- **Two Lane Rows Are Already Counted by Synthesis Options** (*X-06*, *X-07*): the `rewrite.ts` embed passes sit inside S1-A's deleted bodies (#1), and the picker's worn-alias re-parse and query alias are S4-C's (#13).


**Baseline:** HEAD `42a18f4a5`, clean. Every cited span opened with `sed -n`; counts are `wc -l` / measured line ranges, production TS only (CSS listed, uncounted). **Probes (new):** `C-parts/probe11b/after/` holds copies of `connections.ts` (lookbehind removed), `scan.ts` (embed loop kept → `scanKeep.ts`, removed → `scan.ts`), `rewrite.ts` (passes kept → `rewriteKeep.ts`, removed → `rewrite.ts`), and `tokens.ts` (embed spec matching nothing); `e08.ts` → `e08.out` drives every pure reader before/after; `e25.ts` → `e25.out` drives the paste edges. Lane probes `p11tok.out`/`p11paste.out` match every **V·R** claim. **Rulings:** 1b-1d applied (headed, duplicate, and self lone embeds are links; cycle stub deleted; E-12 Keep; Remove Title applies to markdown-link picker retargets).


---

**E-01 · The Pipeline, in Order** · Verified · `Engine/detect.ts:400,402-404,426-431,206-219`; `Engine/docScan.ts:69-74,85`; `Embeds/embedWidget.tsx:398,400,404-411,433,203-207`; `Engine/embedClaims.ts:18-21`; `Pages/PageView.tsx:107`; `MarkdownEditor.tsx:155,164-168`; `decorations.ts:473-483` · all spans exact.
Each condition reads as stated. `excluded` is fences + tables + block math only (`docScan.ts:69-74`), so a lone embed in a raw-HTML block tiles (`MarkdownPM.md:28` lists embeds among what renders inside a block). `embedAncestors={[pageDetail.path]}` (`PageView.tsx:107`) makes every lone self-embed a cyclic stub today. `build`'s claim runs in every scope (`decorations.ts:474`) while `embedTiles` mounts only in `MarkdownEditor` (`:164-168`).

**E-02 · The Synthesis Misnames the Gate** · Verified · `embedClaims.ts:6-8`; `Autocomplete/useConnectionAutocomplete.ts:139`; `Menus/gripMenu.ts:29` · `embeddable` prod=2 (exports.sh).
`claimedEmbeds` never calls `embeddableTitle`; `embeddable` has exactly the two readers named. (Path note: the picker files live in `MarkdownPM/Autocomplete/`, not `Links/`.)

**E-03 · A Lone Headed or Aliased Embed Never Tiles** · Verified (V·R) · `rewrite.ts:47,92`; `p11tok.out` lines 5-6, 15-16.
`scan.embeds` holds `P#H` and `P|a`, both resolve `phantom`; the token shows `P` with `#H]]` in the closer. Under 1d a lone headed embed is a link anyway, so the mismatch's fix is a refusal, not a parse (*E-09*).

**E-04 · What Each Condition Becomes** · Corrected · same anchors as E-01.
1d settles three of the table's "Decision" rows: Heading → link; First-per-title survives as a claim condition (duplicate → link); Cycle → folded into the claim (self-embed → link). Two corrections: (1) **row 3** — with no `ConnectionsApi` the body's wikilink pass is skipped entirely (`decorations.ts:589`) and the resting cell writes the raw source (`cellStatic.tsx:80`), so the rejected case shows raw `![[P]]`, not "unresolved-looking text"; (2) **a row is missing for the alias** — a lone `![[P|a]]` isn't ruled by 1d, and tiling it can't round-trip `embedGuard.ts:65` (`line.text.includes(pageEmbedText(r.title))` is false for `![[P|a]]`, so the guard's boundary repair skips it). Recommend alias → link (one open call for Nathan; see *E-09*).

**E-05 · `![x](url)` Is Already Half the Ruling** · Verified (V·R) · `Connections/links.ts:12-13` · `p11tok.out` lines 1-2.

**E-06 · `![[…]]` Is a Separate, Inert Token** · Verified (V·R) · `tokens.ts:275-280` (spec), `:282,288,290,298,309` (five filters), `:313` (push); `connections.ts:8`; `Engine/intents.ts:126`; `tokens.ts:339`; `Tables/cellStatic.tsx:163-173`.
Probe confirms `linksIn` records the dead key `p|a` (and `p\|a`).

**E-07 · Five Embed Grammar Readers** · Corrected · `tokens.ts:277`; `Connections/scan.ts:92`; `rewrite.ts:44,88`; `detect.ts:400`; `Autocomplete/autocomplete.ts:119-134`; **plus `Links/headingHash.ts:10`**.
The five regex/loop sites are right. A sixth `![[`-shaped reader exists: `titleSpanAt`'s `line[rel - 3] !== '!'` (`headingHash.ts:10`, comment `:14` "an embed takes no fragment") refuses `§`→`#` in an opened `![[|]]`. It's the only non-regex `!`-before-`[[` special case in `Core Desktop UIX` (`edits.ts:793` is `dashArrow`'s `<!--` guard, unrelated). See *M11-01*.

**E-08 · `pageLinkPattern` Loses `(?<!!)`** · Verified (V·R) · `connections.ts:8`; `tokens.ts:25,228-253,275-280,313`; `scan.ts:30,80-98`; `rewrite.ts:35-48,81-93`; `connections.ts:66,74`; `Actions/pasteAsMenu.ts:30-33`; `connections.ts:3-4`.
Every outcome the lane lists holds in `e08.out`: tokens become `wikiLink` over `[[…]]` with the `!` outside; `linksIn` double-counts with the loop kept (`["wiki:p#@1","embed:p#@0"]`) and counts once with it removed; `rewrite` output is byte-identical with the embed passes removed, and `![[Old|a]]`/`![[Old\|a]]` start renaming; `sectionRunsIn` stops reading `§Intro` inside `![[A §Intro]]` as a run (today it does); `parseConnectionText` refuses every `!`-prefixed case before and after; `wholeWikiLink`'s `m[0] === s` still refuses (`index` 1). One reader the lane didn't list, unaffected: `useConnectionAutocomplete.ts:168` re-parses `ac.from..ac.to`, which starts at `[[` (`autocomplete.ts:77`). Full per-reader table in *Stress*.

**E-09 · `loneEmbedTitle` Becomes the Anchored Connection Grammar** · Corrected · `detect.ts:395-404,426-431`; `Embeds/embedWidget.tsx:478`; `Guards/embedGuard.ts:46,65,69`; `Engine/blockModel.ts:71`; `Engine/subfieldStats.ts:29`.
The regex works (V·R): `new RegExp('^!(?:' + src + ')[ \\t]*$', 'd')` yields named groups and `indices` (flags `d`), refuses indent/`!![[P]]`/`![[P]]]`, and matches `![[]]` with `page: ''` where `linkSpans` returns null — the lane's reason for bypassing `linkSpans` is right. Its **±0 is wrong**: returning parts widens `EmbedLine` (`detect.ts:395-398`), and `editAffectsEmbeds` keys tile rebuilds on `a.title === b.title` (`embedWidget.tsx:478`), so if `title` becomes the page group alone, editing a lone `![[P#H]]` to `![[P]]` changes no identity and the newly claimable line doesn't form until another trigger; `embedGuard.ts:46` compares `loneEmbedTitle(line) === r.title` on the old shape. Honest cost ≈ +3 (import, fields, body). **Dominated under 1d:** narrowing the class to `/^!\[\[([^\]\r\n#|]*)\]\][ \t]*$/` (±0, no import) takes headed and aliased lone lines out of `scan.embeds` entirely, so they lose the embed block, grip, Source ▸, and `subfieldStats.ts:29`'s zero-word count — everything 1d implies for a link — while `![[]]` still registers. No other reader changes. **Wart:** the narrowed class restates `embeddableTitle`'s set (`connections.ts:103-104`); one shared character-class constant keeps it single-sourced (±0..+1). Test inventory: `detect.test.ts` has no lone-embed cases; they live in `embedClaims.test.ts`.

**E-10 · The Claim Moves Into `buildTiles`, and `embedClaims.ts` Goes** · Corrected · `embedWidget.tsx:33,404-411,433,651-658`; `embedClaims.ts` 25.
The move is right and the double resolve (`:405-407`) goes. The loop is **+3, not +1**: `const seen = new Set<string>()`, `seen.add(r.page.id)`, and the ancestors refusal from *E-14* each take a line (Biome `lineWidth` 100 forbids folding all four refusals into `:407`'s guard). The embed import (`:33`) goes (−1). `embeddable` needn't move under *E-13* Drop: its only remaining reader is `embedPickTree` (`gripMenu.ts:29`), which inlines `embeddableTitle(n.pick) && !exclude.has(normalizeTitle(n.pick))` with an import swap (±0). Under Keep it moves beside `embedExclusions` (+5) with `embeddableTitle` imported (+1) and `gripMenu.ts:10` merging into `:12` (−1).

**E-11 · `build`'s Claim Filter** · Verified · `decorations.ts:41,473-483,842,845`; `embedWidget.tsx:526,647-649`.
11 lines + the import (`:41`) = −12 for **Option B**. **Option A** keeps the comment and writes `const tiles = embedTileRanges(view.state)` + one 98-column filter line: −8 (lane −7). No import cycle: none of `embedWidget.tsx`'s direct imports (`../api`, `../docCache`, `../lineDom`, `../reactWidget`, `./scrollHeal`, `Tiles/tileZoom`, `Settings/personalization`) imports `decorations` (grep count 0 each). Option B stays **Inferred**; *Stress* names the one uncovered draw.

**E-12 · The `'embed'` Relation Kind** · Corrected · `Index/indexSeed.ts:51,61-62,69`; `Desktop/Store/stores.ts:102,109,137`; `scan.ts:59,92-98`.
1d rules Keep. The lane's +4 inside `scan.ts` is the wrong place: `indexSeed.ts:51` already holds `scanDoc(body)`, whose `embeds` are the editor's own lone lines (fences, tables, math excluded), and a wiki hit for a lone `![[P]]` lands at `e.from + 1`. Keep = `const lone = new Set(scan.embeds.map((e) => e.from + 1))` + `linked(hit, lone.has(hit.at))` in the body loop only (`:63`; values at `:69` never tile) ≈ **+1 to +2**, and `scan.ts` takes its full −7 with `'embed'` leaving `LinkSyntax`. With *E-09*'s narrowed class, headed and aliased lone lines record `'body'` automatically. **Approximation, stated:** the index records "lone in a body," not "tiled" — a lone duplicate or self-embed (links per 1d) still records `'embed'` and stays out of the graph, and phantom/ambiguous lone lines can't be told apart host-side (no resolver, F-114). Reachability: `scan.ts:7-8` and `rewrite.ts:18` already import `MarkdownPM/Engine/` (`markdownCode`, `detect`), so `Connections` can reach `loneEmbedTitle`; `indexSeed` is simply the reader already holding the scan.

**E-13 · The Picker** · Corrected · `autocomplete.ts:19,47,119-134,197,207-208`; `useConnectionAutocomplete.ts:19,27-28,44,67,134-141`; `ConnectionsPM.md:57`.
Drop is **−11, not −9**: the pool filter (`:134`, `:136-140` = 6), two imports (`:27-28`), the `scope === 'page'` arg (`:67`), and — once `allowEmbeds` goes — the hook's `scope` param (`:44`) and `MarkdownScope` import (`:19`), dead with nothing else reading them (three callers' args become edits: `MarkdownEditor.tsx:127`, `CellEditor.tsx:136`, `TextPane.tsx:100`). Keep ≈ +2 stands. **Judgment: Drop.** The filter exists to keep a picked page tile-able; under 1d a lone duplicate and a lone self-embed draw and act as working links, so both halves of its purpose are gone, and Keep would re-derive the claim's context (`!` before `s.full[0]`, line alone, page scope) in a second place — the odd-one-out this plan removes. Source ▸ keeps its own filter (`embedPickTree`), which is right: it re-aims an existing tile. The loop is 16 lines (`:119-134`; `:118` closes the markdown branch), owned by S7-D.

**E-14 · The Cycle Stub** · Corrected · `embedWidget.tsx:144,147,161,203-207,214,433,439,441-442`; `markdown-pm.css:341-344`.
Ruled delete (1d). **−11, not −9**: the widget's `title` field (`:144`) and its argument (`:439`) exist only for the stub's text (`:205` is the only `this.title`); `TileRange.title` stays for `embedExclusions` and `embedGuard`. Deleted: `:144,147,161,203-207,433,439,442`; edits at `:214` and `:441`. The ancestors refusal lands in the claim loop (*E-10*'s +3). A lone self-embed then draws as `!` + the connection to its own page; no claim text changes beyond that refusal. CSS: `.mdpm-embed-cycle` `:341-343` + blank = 4.

**E-15 · Smaller Deletions** · Verified · `intents.ts:126`; `markdown-pm.css:300` (lane `:301`); `pageEmbedText` writers `pasteAsMenu.ts:109`, `gripMenu.ts:144`, `embedGuard.ts:65`, `autocomplete.ts:208`, `rewrite.ts:47` · `pageEmbedText` prod=5.

**E-16 · The Picker Is the Only Real Retarget, and It's Two Rules** · Verified · `autocomplete.ts:77,210,270-279,272-273`; `useConnectionAutocomplete.ts:165-169,178`; `Settings/personalization.ts:153`; `ConfigurationPM.md:100`.

**E-17 · Edit Link Isn't a Writer** · Verified · `Links/linkEdit.ts:26-29`; `Links/linkFormat.ts:64-66`; `cellStatic.tsx:469-470`; `Menus/gripMenu.ts:151-157`.

**E-18 · Other Target-Changing Writers** · Verified · `rewrite.ts:31-133`; `Connections/linkValue.ts:82-95,97-107`.

**E-19 · Plain ⌘V Handles Only Bare Addresses** · Verified (V·R) · `Links/pasteLink.ts:21-22` · `p11paste.out` lines 1-5, 16-17.

**E-20 · P6 Confirmed, and Worse Than Reported** · Verified (V·R) · `pasteLink.ts:42-47`; `links.ts:8` · `p11paste.out` lines 6-15.

**E-21 · Literal Where It Shouldn't Be** · Verified (V·R) · `links.ts:59-61`; `pasteLink.ts:44` · `p11paste.out` lines 10-11.

**E-22 · Paste As Inside a Link** · Verified · `pasteLink.ts:92`; `Desktop/Actions/editorMenu.ts:104-105`; `Actions/editorMenu.ts:29-30`; `Input/formatState.ts:38-39`.

**E-23 · One Pure `retarget` in `Connections/linkValue.ts`** · Corrected · `linkValue.ts:4,11-13,44-46,124-144`; `Properties/properties.ts:110`.
**Title precedence is inverted against 1c.** 1c: the pasted alias shows if present; otherwise the container keeps its own unless Remove Title On Link Change is on; a weblink with no shown text takes the Default Link Format. The rule is `title = next.alias ?? (keepTitle ? container.title : undefined)`, not `keepTitle && container.title || next.alias`. **Placement is clean:** `LinkTarget` (`linkValue.ts:11`) and `LinkPaste` (`:124`) live in `linkValue.ts`, and `LinkDisplay` (`properties.ts:110`) is already type-imported there (`:4`); nothing comes from `MarkdownPM/Links/connectionsApi.ts`, so there's no import-direction break and no move cost. The container shape is inline; the caller maps a `Token` to it. **Replace or add:** it adds a rule for paste; for the picker it replaces only `formSyntax`'s `link` arm and the worn-alias re-parse (*E-26*), not `commitEdit`'s span math or Edit Title (which writes nothing, *E-17*). **Size:** the four arms plus a five-parameter signature under Biome land ≈ +12 to +18 (+12 assumes the page-into-markdown arm is *E-29*'s shared writer).

**E-24 · The Container Reader Already Exists** · Verified · `formatState.ts:13-16`; `tokens.ts:331-344`.
`linkTokenAt(tokenize(line), rel)` is pure and line-scoped; it runs only inside `linkFor`, which only the `paste` event and the inverse chord call (`pasteLink.ts:116,131`) — no keystroke or caret cost.

**E-25 · Paste Precedence** · Corrected · `pasteLink.ts:25,42-47,92`; `links.ts:45-65`; `Embeds/embedInsert.ts:58-60`; `tokens.ts:339-341,346,358`.
Steps 1-3 and the strict-interior test hold. **The `literalAt` change is wrong:** `[]()`, `![]()`, `[x]()`, and `[](P)` are closed but tokenless (`markdownLinkRegex` needs both halves non-empty, `links.ts:12-13`; `linkDestinationStart` reads them through `emptyTolerantLinkRegex`, `:16-17,60-61`) — `e25.out`: `linkDestinationStart` 3/4/4/3, tokens `[]`, `linkTokenAt` null. Keeping "only the unclosed half" would send a URL pasted into ⌘K's `[]()` or Insert ▸ Embed ▸ Website's `![]()` to `decidePaste`, writing `[]([a.co](https://a.co))`; `embedInsert.ts:58`'s comment names this exact guard. **Corrected order:** read-only → code → **retarget on a strict-interior `linkTokenAt` hit** → `literalAt` with its clause whole → wrap/format → raw. *E-21* is still fixed (a closed, tokenized destination is caught by step 3 first), and `literalAt` needs no edit. Writes keep `input.paste` through `writeLink` (`:56`); `CellEditor.tsx:154-163` passes a link through (`decodePayload` needs `|`-bounded lines, `Engine/Tables/clipboard.ts:21-27`), and `tableGuard.ts:28` and `pasteMargin` (`decorations.ts:753-759`) read only the tag.

**E-26 · The Picker Calls the Same `retarget`** · Corrected · `autocomplete.ts:209-210,270-279`; `useConnectionAutocomplete.ts:165-169,178`.
1d applies the setting to markdown-link picker retargets. Because an empty label isn't a token (`links.ts:15`), "remove" can only mean "fill with the new title": the `target` arm's `fill` (`:272`) must also fire when `removeTitleOnLinkChange` is on, with the setting threaded through `commitEdit`'s opts — ≈ +2. The `fragment` arm keeps the label, mirroring the wikilink `heading` form. Picker row: −6 (re-parse + import) +2 (S4-C's query alias) +2 = **−2** (lane −4). **User-visible with the default On** (`personalization.ts:153`): picking a new page in `[Notes](Old)`'s destination writes `[New](New)`.

**E-27 · Paste As Inside a Link** · Corrected · `formatState.ts:38-39`; `Actions/editorMenu.ts:29-30`.
`req.link`/`req.connection` are **edge-inclusive** (`tk.range[0] <= f && t <= tk.range[1]`); `e25.out` shows `connection: true` at offset 0 and 5 of `[[P]] tail`. E-25's rule is strict, so at the resting seat after a link ⌘V appends while (a) would retarget and (b) would hide Paste As ▸ Connection. Making the flags strict changes what the Format menu's link rows read too. Decision, not picked: a strict `inLink` field (+1) or accept the edge disagreement. Range +1 to +5.

**E-28 · Writers That Exist** · Verified · `connections.ts:89-96,107-109`; `linkValue.ts:44-46,132-143`; `links.ts:19-21,28-30,68-74`.

**E-29 · The Missing Writer** · Verified · `pasteAsMenu.ts:111-115`; `autocomplete.ts:206,270-279`.

**E-30 · The Conversion Table** · Corrected · rulings 1b(2), 1c.
Re-keyed to 1c's precedence (pasted alias → container's if `keepTitle` → default): `[[P#H|a]]` into `[[A|t]]` → `[[P#H|a]]` regardless of `keepTitle`; `[x](P)` into `[[A]]` → `[[P|x]]`; `[[P]]` into `[t](A)` → `[t](P)` if `keepTitle`, else `[P](P)`. **The "Pending" is resolved by 1c:** a pasted page link's alias carries (`[[Page2|x]]`); 1b-1d supersede the earlier example.

**E-31 · S7-D Is a Prerequisite for the Picker Half** · Verified · `embedInsert.ts:55`; `connections.ts:30`; `useConnectionAutocomplete.ts:146`; `Connections/pageIndex.ts:43-44`.
Traced A-71: with Pair Brackets on, `!`+`[` is refused (`Input/edits.ts:374`), the second `[` takes the multi branch (`:357-369`) and writes `![[]]`.

**E-32 · Two Tiles of One Page** · Verified · `embedClaims.ts:10`. `resolve` is keyed one-to-one on `normalizeTitle` (`pageIndex.ts:35`), so deduping by title key equals deduping by page.

**E-33 · The `'embed'` Relation Feeds the Graph's Exclusion** · Verified · `Desktop/Store/stores.ts:137`.

**E-34 · Retarget Into an Embed Changes the Construct** · Verified (reasoned) · `embedWidget.tsx:565-573`; `gripMenu.ts:151-157`; `detect.ts:407-417`.

**E-35 · Retarget in a Table Cell** · Corrected · `Tables/sync.ts:21`; `Engine/Tables/codec.ts:12,29-30`; `Tables/MarkdownTable.tsx:426,439`.
A live cell editor holds display text (`cellToDisplay`, `MarkdownTable.tsx:426`), and every commit runs `cellToSource` → `escapeCell`, which escapes `|` (`codec.ts:12`). A retarget writing `[[P|a]]` into the cell's doc is escaped on commit; no F-043 budget is needed. B-176 is specifically the `awaitTitle` sweep writing into the page source from a resting cell, which a retarget carrying `wantsTitle` at rest would still hit.

**E-36 · Keep `pastedUrl`'s Scheme Rule** · Verified · `Links/pasteDecision.ts:20-27`.

**E-37 · Images** · Corrected · `tokens.test.ts:58-62`; `MarkdownPM.md:206`.
The test is `![[pic]]`, not `![[pic.png]]`, at `:58-62`. The behavior claim holds.

**E-38 · The Synthesis Trap A-123 Goes False** · Verified · synthesis *§3.1* Traps, *§3.14* Traps.

**F-054 Status:** taken and unimplemented. The entry reads **Fix | Literal** (audit `:509`), `:693` lists it among "the taken fixes," and `embedAsConnection` exists nowhere in code (`git grep` hits only the audit and its Dashboard mirror). Its ≈ +12 (claim −4, look +16) is a **planned cost this lane avoids** — a credit against the plan, not a deletion from HEAD.

---

#### Stress

**E-08 Reader Sweep** (`git grep -n 'pageLinkPattern\|pageEmbedPattern\|linkSpans\|linkAt\b\|parseConnectionText\|WHOLE_LINK'`, production; outcomes from `e08.out`):

| Reader | `![[P]]` | `![[P#H\|a]]` | `!![[P]]` | `![[P]]]` | `![[]]` |
|---|---|---|---|---|---|
| `wikiLinkTokens` (`tokens.ts:228`) | `wikiLink`@1-6 | `wikiLink`@1-10, shown `a` | `wikiLink`@2-7 | `wikiLink`@1-6, `]` text | none (today: invisible `embed` token) |
| `linkAt` → `slotNear`, `commitAliasOnEnter`, `rememberAliasNear` (`linkEdit.ts:56,82,109`), `linkInCode`/`inAliasAt` (`edits.ts:327,337`), `linkTyping` (`linkReveal.ts:23`), `titleSpanAt` (`headingHash.ts:8`), `autocompleteQuery` (`autocomplete.ts:72`) | hit 1-6 | hit 1-10, alias `[7,8]` | hit 2-7 | hit 1-6 (7 misses) | null (`linkSpans`, `connections.ts:30`) |
| `linksIn` (`scan.ts:80`) | `wiki:p@1` | `wiki:p#h@1` | `wiki:p@2` | `wiki:p@1` | none (today `embed:own@0`) |
| `rewrite.ts:35,81` | renames, `!` kept | renames (today unrenamed) | renames | renames | n/a |
| `sectionRunsIn` (`scan.ts:30`) | excludes span | excludes | excludes | excludes | — |
| `WHOLE_LINK` readers (`linkValue.ts:31,53`; `assetMigrate.ts:57,178`; `assetRoots.ts:22,28`; `assetUrl.ts:22`; `propertyValue.ts:124`; `value.ts:67`; `holdings.ts:89`) | null (both) | null | null | null | null |
| `wholeWikiLink` (`pasteAsMenu.ts:31`) | index 1, refused | refused | refused | refused | refused |
| worn re-parse (`useConnectionAutocomplete.ts:168`) | slice starts at `[[`; unchanged | | | | |

**Non-regex `!` cases:** `autoPair` has no `!` case — `isPairEdge('!')` is the generic punctuation rule (`edits.ts:301-302,374`), and `![[` pairs exactly as `.[[` does; `isInsideWikilink` counts `[[` and ignores `!` (`edits.ts:612-627`); `embedInsert.ts:55`, `embedGuard.ts:46,65,69`, `blockModel.ts:71,158`, `gripMenu.ts:52-58,142-146`, and Paste As ▸ Embedded Page (`pasteAsMenu.ts:109`, blank-line seat) all read the **lone-line** shape, which the ruling keeps. The one odd-one-out is `headingHash.ts:10` (*M11-01*).

**`linksIn` Double Count:** confirmed (`scanKeep` yields both `wiki` and `embed` for every case); the loop's removal is mandatory, not optional.

**E-12 Keep Reachability:** host-reachable; `indexSeed.ts:51` already computes `scan.embeds`. The brief's "`Connections` can't import `MarkdownPM`" is inaccurate at HEAD — `scan.ts:7-8` and `rewrite.ts:18` import `MarkdownPM/Engine/`; `engineGraph.test.ts` enforces "no `.tsx`, externals allowlist, pure UIX leaves," and the binding rule is "no React, no `Links/`." The claim's resolver conditions stay editor-only.

**E-09/E-10 `![[]]`:** both the anchored grammar and the narrowed class keep `![[]]` in `scan.embeds` (block, grip, Source ▸ survive insertion). `blockModel` and grips are untouched under the narrowed class.

**E-11 Option B:** the pointer path is safe — `ReactWidget` doesn't override `ignoreEvent` (CodeMirror's default ignores events inside the tile), and `linkUnder` requires `onText` (`linkClicks.ts:66`), which a tile-edge `posAtCoords` can't satisfy. A `link` token under a webpage tile already emits `hideMarker` (`Decoration.replace({})`, `decorations.ts:362,575-576`) inside the tile's replace, so replace-over-replace is harmless. **Uncovered:** a selection spanning a page tile (drag or select-all) makes its `wikiLink` active (`tokens.ts:361`) and emits `connGlyph`'s point widget at `range[0] + 2` (`decorations.ts:611`) inside the tile's inline replace; a webpage `link` emits a glyph only when internal (`:584`), so the webpage evidence doesn't cover it. That's the one live check. `HeadingJoinWidget` (`:626`) is unreachable under a tile, since 1d makes a headed lone embed a link.

**E-14:** no claim text changes beyond the ancestors refusal; counted in *E-10*.

**E-23:** no import-direction break (see entry). `LinkPaste.target` holding a title for a page retarget is cosmetic: `writeLink` reads `target` only when `wantsTitle` (`pasteLink.ts:57-62`), and a page retarget never wants a title.

**E-25:** container read on paste only (*E-24*); the retarget write keeps `input.paste`, `CellEditor`'s payload filter passes it, and `literalAt` stays whole.

---

#### Missed (M11-01…)

- **M11-01 · `headingHash`'s Embed Exception:** `titleSpanAt` refuses an opened `![[|]]` (`headingHash.ts:10`), so `§` stays `§` there while `[[|]]` converts it to `#` and a closed `![[P]]` converts it through `linkAt`. Under the ruling `![[` is `!` + `[[`. Delete `&& line[rel - 3] !== '!'` (edit, 0 lines) and the comment's "an embed takes no fragment" (`:14`).
- **M11-02 · `![[]]` Becomes Visible:** today the empty `embed` token hides `![[` and `]]` when inactive and its empty content draws nothing (`intents.ts:151-152`, `decorations.ts:542`), so Insert ▸ Embed ▸ Internal Page's line looks blank once the caret leaves; after *E-08* it is tokenless and shows raw `![[]]`, as `[[]]` does today. User-visible until S7-D's picker fills it.
- **M11-03 · Empty and Fragment-Only Embeds Index Today:** `linksIn('![[]]')` → `embed:own@0` and `![[#H]]` → `embed:own#h@0` (`scan.ts:95`, `titleKey('')` → own), so an empty embed records a self-relation that `queryMentions` returns (`stores.ts:102`). The loop's removal deletes the first; the second becomes `wiki:own#h`, a same-page heading link like `[[#H]]`.
- **M11-04 · Embed Commits Gain the Alias Slot:** once the `![[` opener rides the `link` form, `aliasPickerOnCommit` (default On, `personalization.ts:154`) makes a picker commit write `![[P|]]` for a page with remembered aliases (`autocomplete.ts:246-252`); `leaveSlot` collapses the empty pipe, so it self-heals. Today the `embed` form never opens it.
- **M11-05 · Remove Title's Default Reaches Edit Link + ⌘V:** with the setting On by default (`personalization.ts:153`) and 1c's rule, Edit Link (address selected, `linkFormat.ts:64-66`) then ⌘V of a bare URL into `[Label](https://old)` replaces `Label` with the Default Link Format's text; today the label survives because the paste is literal (`pasteLink.ts:44`). This is the most common retarget, ruled behavior, and a visible change Nathan should hear about.
- **M11-06 · Lone Aliased Embed Is Unruled:** see *E-04*/*E-09*; `embedGuard.ts:65`'s present-check can't round-trip an alias, so alias → link is the cheap default (the narrowed class does it at ±0).
- **M11-07 · The Narrowed Lone Class Restates `embeddableTitle`:** both spell "no `]`, `|`, `#`, newline" (`connections.ts:104`, proposed `detect.ts:400`); one exported class string serves both (±0..+1). Without it the fix introduces a second copy.
- **M11-08 · Word Count:** `proseStart` zeroes every lone `![[…]]` line (`subfieldStats.ts:29`), including lone duplicates, self-embeds, and phantoms that now draw as `!` + a link; `hiddenOf`'s comment (`:38`, "and embeds") goes false. Minor, and it belongs to the audit's deferred counter rework (scan-fed `chromeOf`).

---

#### Corrected Deltas

##### Embeds (Production TS; 1d Applied: E-12 Keep, E-14 Deleted, Headed/Duplicate/Self Lone Embeds as Links)

| Piece | Lean | Conservative | Arithmetic |
|---|---|---|---|
| `connections.ts`: `pageEmbedPattern` + blank | −3 | −3 | `:3-5` |
| `tokens.ts`: kind, spec, push | −8 | −8 | `:25` 1 + `:275-280` 6 + `:313` 1 |
| `intents.ts`: class entry | −1 | −1 | `:126` |
| `decorations.ts`: claim filter (B / A) | −12 | −8 | B: `:473-483` 11 + `:41` 1; A: 11 → 3 |
| `embedClaims.ts` + claim loop + `embeddable` | −23 | −18 | −25 file, −1 import `embedWidget.tsx:33`, +3 loop; Keep adds +5 move, +1 import, −1 `gripMenu.ts:10` merge |
| `embedWidget.tsx` cycle stub (*E-14*) | −11 | −11 | `:144,147,161,203-207,433,439,442` |
| `detect.ts`: narrowed lone class (*E-09*) | 0 | 0 | class edit at `:400` |
| `autocomplete.ts`: `formSyntax` arm, `allowEmbeds` | −3 | −3 | `:207-208` 2 + `:47` 1 (loop `:119-134` owned by S7-D) |
| `useConnectionAutocomplete.ts` (*E-13* Drop / Keep) | −11 | +1 | Drop: `:134,136-140` 6 + `:27-28` 2 + `:67` 1 + `:44` 1 + `:19` 1; Keep: re-key +2, `:28` merges into `:27` −1 |
| `rewrite.ts`: both embed passes + imports | −16 | −16 | `:42-48` 7 + `:87-93` 7 + `:4-5` 2 |
| `scan.ts`: embed loop | −7 | −7 | `:92-98` |
| `indexSeed.ts`: Keep via `scan.embeds` (*E-12*) | +1 | +2 | `lone` set; `linked` wrap if Biome splits it |
| `headingHash.ts:10` (*M11-01*) | 0 | 0 | edit |
| **Total** | **−94** | **−72** | Lean: −3−8−1−12−23−11+0−3−11−16−7+1; Conservative: −3−8−1−8−18−11+0−3+1−16−7+2 |

CSS, uncounted: `.mdpm-embed-cycle` −4 (`markdown-pm.css:341-344`), `.md-embed` in the grouped selector −1 (`:300`). **Overlaps (count once, here):** S7-D owns the 16-line loop; S1-C's anchored `loneEmbedTitle` and embed `RegexSpec`/filters (≈ −10) are superseded; S5-C's −4 to −7 is this table's `decorations.ts` + `embedClaims.ts` rows. **F-054:** taken and unimplemented, so its ≈ +12 planned cost is avoided — a credit against the plan on top of this table, not a HEAD deletion. **E-13 Judgment:** Drop (lean column), for the reason in *E-13*; the conservative column prices Keep and Option A only to bound the range.

##### Retarget (Paste Into a Link, With 1c Precedence and 1d's Picker Rule)

| Piece | Standalone | Inside S3-2 | Arithmetic |
|---|---|---|---|
| `retarget` (`linkValue.ts`) | +12 to +18 | +12 to +18 | four arms + Biome-wrapped five-parameter signature; +12 with *E-29*'s shared page writer |
| Container branch in `linkFor` (strict `linkTokenAt` read ahead of `literalAt`, range-aware `writeLink`) | +8 | +5 | lane's estimate; `literalAt` unchanged (*E-25*), so no saving there |
| Clipboard classifier | 0 to +10 | 0 | 0 with S3-1 (S3-1 owns ≈ −15), +10 without |
| Picker: re-parse −6, S4-C query alias +2, target-arm setting +2 (*E-26*) | −2 | −2 | −6 + 2 + 2 |
| Paste As inside a link (*E-27* a/b), strict flag if chosen | +1 to +5 | +1 to +5 | lane +1 to +4, strict `inLink` +1 |
| **Net** | **+19 to +39** | **+16 to +26** | low: 12+8+0−2+1; high: 18+8+10−2+5 / 12+5+0−2+1 to 18+5+0−2+5 |

It's net positive, as the lane said, and it buys three verified fixes (*E-19*, *E-20*, *E-21*). It nets negative only inside S3-1/S3-2's credits.

---

### Cross-Lane Stress

Each lane's own stress sits under its section above. These are the interactions between lanes, and between the lanes and the synthesis options.

- **Relocation Check:** no approach relocates without deleting. The two net-positive pieces are Lane 10's reading (b) with system rows (+70..+97, bought by the 1g mandate) and Lane 11's retarget (+20..+30, bought by three verified data-corrupting pastes, E-19/E-20/E-21). Both add a capability; neither moves an existing rule. The rest-side paste rows restate `pasteAs`'s ordering (`pasteLink.ts:86-109`) unless S3-2's pure pipeline lands first, so S3-2 is a prerequisite for Lane 10's system rows, not a sibling.
- **Project Rules:** no host file gains React (P-21/P-22 stay in `Connections`/`Nexus`/`Trash`; `retarget` lives in `linkValue.ts` beside `LinkTarget`, `LinkPaste`, and the already-imported `LinkDisplay`, so E-23 has no import-direction break). The Engine gains no `Links/` import (E-09's narrowed class edits `detect.ts:400` only). No new seam: the resting editor-menu ask rides the existing `editor:menu` channel (`bridge.ts:266`) with one schema flag in main-importable `Core/Actions/editorMenu.ts`, and Desktop stays the only Electron caller. High-frequency: the offset mapper runs on `contextmenu` only (R-15), the paste container read on paste only (E-24), E-11 Option A's filter is O(tiles) and Option B removes the per-build claim (F-054's caret-move half either way), and E-12 Keep reads the `scanDoc` `indexSeed.ts:51` already holds.
- **T-A, the Mapper, and the Same Door:** T-A's mechanics verified (source-form entry text, `changesTo` minimal diff, convergence without a scope switch), but it's superseded by the rest wait (Lane 10 notes). The mapper is right-click-only and needs a base attribute on list lines and `TextCell` lines (+2, now `StaticCell` lines only under 1g). The same door works under 1d/1g only with Cut/Copy/Paste renderer-resolved at rest: Paste As and Paste Without Formatting already resolve to the renderer (`Desktop/Actions/editorMenu.ts:80,85,104-116`), and the `:128` gate returns before `systemItems`, so a resting request needs the schema flag and a branch there.
- **`(?<!!)` Removal:** every `pageLinkPattern`/`linkAt`/`WHOLE_LINK` reader was driven before and after (`probe11b/e08.out`); outcomes match the ruling. `linksIn`'s embed loop removal is mandatory (double count with it kept), `sectionRunsIn` stops reading `§` inside `![[…]]`, and `![[Old|a]]` starts renaming. The one remaining `!` special case is `headingHash.ts:10` (M11-01).
- **T-01/T-02:** the four host readers move together only if `holdings.ts:89` switches in the same step as `readLink`; P-21's resolver-free arm makes `namesGonePage` strip schemeless markdown values on a frozen restore with nothing parked (Lane 9 P-21(b), *§Stress 2*). `spend.ts:264`'s replacement is +2 with the `landed === was` guard kept.
- **One Target-Change Writer, Three Callers:** E-23 (paste), E-26 (picker), and 9b Q-26 (Link value commit) converge on one `retarget` with 1c's precedence `next.alias ?? (keepTitle ? container.title : undefined)`, a caller-chosen container syntax, and an optional `format`. Lane 10's Edit Title isn't a writer (it selects), which matters for *X-04*.
- **One Announce Writer:** Lane 10's applier (`applyEdit` + `awaitTitle` + `linkTitles.resolve`) and S3-2's `writeLinkAt` would both write the announce pair; the applier should call `writeLinkAt` (M10-06).

---

### Missed

The lanes' own *Missed* entries (M9-01…M9-03, M10-01…M10-06, M11-01…M11-08) are under each lane above. These cross lanes or the synthesis.

**X-01 · Two "One Reader" Rules for One Value.** P-21 makes `readLink('[x](example.com)')` a page (resolver-free); S3-1 (#8) adds `readLinkText(text, resolve?)` whose resolver-free tiebreak makes it a url (page only when `!isValidLink(dest)`). Both would ship. Probe9b shows each fails differently: P-21 toward data loss (`namesGonePage`) and phantom writes (`linkValueFromRename` → `[[example.com|y]]`), S3-1's toward leaving `[Doc](Notes.md)` unrecognized by the host (today's behavior). Even under S3-1's tiebreak, `[x](Nope)` (no dot) reads as a page, so `linkValueFromRename` still converts it to a phantom `[[Nope|y]]`; the +3 renderer syntax-keeping applies under either tiebreak (Lane 9's verification says only under P-21's; this is the counter-case). **Resolution:** `readLink` reports written syntax (`wiki | markdown | bare` with title or destination, heading, alias) and classifies nothing; host readers answer by name-match against the title they already hold (`targetNamesTitle`, `links.ts:107-110`, is that predicate today); renderer readers and the commit read the resolved target. **V** (sites, probe9b), **I** (shape).

**X-02 · Menus for Unresolved and Held Links Are Ruled but Uncosted.** The Disclosed Calls give phantom, ambiguous, and invalid-target links a link menu (authoring and closing rows, no open rows), and 1g carries it to resting Text values' links. `linkMenuTarget` returns null for `invalid` and `self` (`connectionsApi.ts:91-92`); `MdTarget`'s `invalid` arm carries no syntax to choose Edit Title vs Edit Link; and a phantom resting-cell connection draws no `data-link-span` at all (`cellStatic.tsx:81-92`, Lane 10 R-03), so `linkSpanAt` never reaches the builder. Lane 10 R-28 and 9b Q-13 each hand it to "the menu lane," which no lane is. ≈ +4 to +8 (an `invalid` arm with its syntax, the builder's arm, the span attribute on unresolved resting links). **V** (sites), **I** (cost).

**X-03 · `headingHash`'s Embed Exception** is Lane 11's M11-01 (`headingHash.ts:10,14`); listed once there.

**X-04 · 1e's "Edit Title Is a Retarget" Isn't Reachable in the Body.** 1e routes Edit Title / Edit Link through `retarget` so Remove Title On Link Change governs it. On a Link value that holds (the commit is a writer, 9b Q-26). In the body and a live cell, Edit Title only selects the address (`linkEdit.ts:27-29`, `linkFormat.ts:64-66`, Lane 11 E-17); what replaces it is typing, a paste (retarget, E-25), or the picker (retarget, E-26). A typed replacement never passes through `retarget`, so with the setting on, `[Docs](https://a.com)` → select → type `https://b.com` keeps "Docs", while the same edit by paste drops it (M11-05) and the same edit on a Link value drops it (Q-27). One rule holds only per gesture. The plan either accepts "typing is never a link change" (and says so) or adds a commit-time check; Nathan should hear it with M11-05. **V** (sites), **I** (consequence).

**X-05 · S3-2's Ledger Mid Removes Paste As ▸ Plain Text, Which Checkpoint 1 Q8 Kept.** #9's −45 "includes Plain Text −3"; the Lean bundle already used −42, the Full bundles didn't. Corrected to −42 before Lane 10's `linkFormat.ts` piece leaves it (→ −30). **V** (synthesis §5.1, rulings Q8).

**X-06 · Lane 11's `rewrite.ts` Row Double-Counts S1-A (#1).** S1-A deletes `rewrite.ts:32-59` and `:73-110` (`synthesis.md` §3.16), which contain both embed passes (`:42-48`, `:87-93`, read at HEAD). With #1 in the bundle, Lane 11's rewrite row keeps only the two import lines (`:4-5`, which S1-A didn't count): −2, not −16. S1-A's +8 also budgets span fields on an embed branch that Lane 11 deletes (≈ −2 more, **I**, not counted). **V.**

**X-07 · Lane 11's Picker Row Double-Counts S4-C (#13).** S4-C already deletes the worn-alias re-parse and import (−6) and adds the query alias (+2) (`synthesis.md` §3.12). E-26's unique piece is the `target` arm's setting thread (+2). **V.**

**X-08 · The `tokenMenuTarget` → `linkMenuTarget` Fold Is Taken but Unowned.** 9b Q-06 folds `tokenMenuTarget` (`connectionsApi.ts:96-112`) into one `linkMenuTarget(target, editable, value?)` and drops the `tk?.kind === 'wikiLink'` gate (1b.1). The synthesis counted that fold (≈ −5, B-107) only inside Side 1 (#15a); Side 2 bundles and every lane omit it. ≈ −5 (**I**, re-measure at plan time).

**X-09 · 9b's S7-A Overlap on `onCell` Is Two Lines, Not One.** S7-A's −5 type change removes `connectionsApi.ts:19`, and its url `.then` chain rewrite (`connectionMenuActions.ts:33-40`, −3) removes `:38`. 9b nets only the first. 9b's menu block is ≈ −57 net of S7-A, not −58..−59. **V.**

**X-10 · F-054 Is a Planned Cost the Plan Avoids, Not a Deletion.** The audit's F-054 is *Fix | Literal* (taken), and its `embedAsConnection` exists nowhere in code; at HEAD a cell's `![[Page]]` is still an inert `embed` token (`p10.out`). Lane 11's "the +12 disappears" is credited against the alternative; the synthesis bundles counted only F-054's claim half (#20, −6), which Lane 11 supersedes. **V.**

**X-11 · Resting Text Values Still Change Under 1g, Through the Builder.** 1g gives a resting Text value's links "whatever rides along through the one shared menu builder." `TextCell` reaches the link menu through `readOnlyMenu` (`cellStatic.tsx:409-412`); with 9b Q-06's one builder, that path is `linkMenuTarget(heldTarget(tokenTarget…), false)` and `readOnlyMenu` with the `menuAt ?` branch can fold (≈ −2 to −5, uncounted, **I**). It also inherits X-02's unresolved-link menus, which is the visible change.

**X-12 · Nested Links at Rest Are In Scope Under 1g.** Lane 10's M10-01 (`cellStatic.tsx:72-75` drops every token inside an earlier one, so `**a [[P]] b**` draws `[[P]]` raw with no menu) is a defect of exactly what 1g mandates for MarkdownPM table cells ("every construct's right-click menu at rest"). ≈ +8 to +15, uncosted by every lane; listed so the plan owns it or rules it out.

---

### De-Overlapped Delta

Production lines, mids unless a range is given; CSS included where marked. "Bundle Change" is the move against synthesis §5.2's **Full, Side 2, B-127 (≈ −382)**. Every line is counted by exactly one row.

**Base Arithmetic (Re-Checked):** #1 −46, #2 −11, #5 −38, #6 −13, #7 −29, #8 −15, #9 −45, #10 +3, #11b −30, #12 −18, #13 −32, #14 −5, #15b −32, #16 −25 (+1 rest `.then`), #17 −3, #18 +2, #19 −13, #20 −6, #21 +5, #23 −29, #24 +1, #25 −2, #26 −6, #27 −2, J1 +6 = **−382**.

| # | Lane Option | Synthesis Rows It Replaces or Overlaps | Verified Lane Figure | Already Counted Elsewhere | Unique Net | Bundle Change |
|---|---|---|---|---|---|---|
| 1 | **P-24** Link value pages ride `TextCell` (routing corrected: every link-token value → `TextCell`) | Replaces #5 S2-A (−38) | −15 TS, −5 CSS | — | **−20** | +38 −20 = **+18** |
| 2 | **9b Q-29** Click-intent cut (1d) | Replaces P-24's sub-bullet; takes #7's `urlClickTarget` (−5) and voids #7's anchor-opener piece (−3, contradicted by 1d) | −18 | — | **−18** | **−18** |
| 3 | #7 S2-C residual | #7 loses −5 and −3 (row 2); gains the inline editors' `connections` threading S2-C needs (+4, Lane 9 P-23(3)) | — | — | #7: −29 → **−17** | **+12** |
| 4 | **9b Q-07…Q-12** One value-menu build (replaces P-25) | Replaces #6 S2-B (−13); J1 (+6, S2-B vs S7-A) voids; overlaps #16 S7-A on `linkValueMenuTarget`'s `apply`/filter (−6), `onCell` (−2, *X-09*), url `hasAlias` (−1) | Q-08 −8, Q-09 −4, Q-07 −5, Q-12 −36 and `onCell` −7, Q-11 −7, widen +0..+1 = −66 gross | −9 inside #16 | **−57** | +13 −6 −57 = **−50** |
| 5 | `tokenMenuTarget` fold (9b Q-06; *X-08*) | Side 1 only in the synthesis | ≈ −5 (**I**) | — | **−5** | **−5** |
| 6 | **P-23 + 9b Q-25/Q-26** One commit | Replaces #10's `[[#H]]` +2 (#10 → +1); S3-1 (#8) owns `parsePastedLink`; the `[x](example.com)` fall-through is S3-1's rule | holder +6, same-target keep +1, `linkValueFromEdit` on `retarget` −5, `format?` +1 | — | **+3** | −2 +3 = **+1** |
| 7 | **P-21's replacement** (*X-01* shape: `readLink` reports written syntax, host readers name-match, renderer and commit read the resolved target). P-21 as written (the S2-D arm) is not taken | S1-B's (#2) `parseLink` fold stays in #2 | Lane figure +2 (+3 renderer) re-used as the estimate: syntax field and name-match ≈ +2, Rename/Edit Title syntax-keeping ≈ +3 (**I**) | — | **+5** (**I**) | **+5** |
| 8 | **P-22** Link values ride the body rewrite (F-035 alias drop mandatory; `spend.ts` guard kept) | New; composes with #1 (no shared lines) | −26 | — | **−26** | **−26** |
| 9 | **M9-01** Nested-YAML gone values noted and parked | New | +1 | — | **+1** | **+1** |
| | **Lane 9 Subtotal** | | | | | **−62** |
| 10 | **R-07/R-17 Rows 1, 2, 3, 5** `linkEdit` + one applier (its range includes the surviving identical-text no-op guard, +1, and carries R-07's behavior change: Remove Link, Delete, and Format now focus the body), rest link menu, seat union, `FormatEdit.head` | Replaces #15b Side 2 (−32) whole: S7-B −10 and Side 2's −16/−6 sit inside; takes S3-2's `linkFormat.ts` −12 from #9; S7-C's −3 (#17) sits inside row 2's `menuAt`/`menuTarget` | −44..−58, −31..−35, −13..−17, +2..+3 | Row 4 (−3..−4) is inside #16's `linkClicks.ts` −7 → 0 | **−96** (−85..−108) | +32 +12 +3 −96 = **−49** |
| 11 | Title fallback: rest wait + close-forward (Disclosed Calls; replaces T-A) | New; fixes F-043 and B-158 | +10..+16 | — | **+13** | **+13** |
| 12 | Reading (a): right-click focus fallback | — | −1 | — | **−1** | **−1** |
| 13 | Reading (b) core: mapper, resting ask/reply, `editFor` export, schema flag | New (1b.3/1g) | +36..+50 | — | **+43** | **+43** |
| 14 | System rows at rest, Undo/Redo out (1d/1g) | New; needs S3-2's pure pipeline (#9) for Paste/Paste As | +34..+47 | — | **+40** | **+40** |
| 15 | **M10-06** Applier lands on `writeLinkAt` | Inside S3-2 (#9) | 0..−3 | — | **−1** | **−1** |
| 16 | #9 Plain Text correction (*X-05*) | #9 −45 → −42 (before row 10 takes −12 → −30) | — | — | — | **+3** |
| | **Lane 10 Subtotal** | | | | | **+48** |
| 17 | **E-08…E-15** Embeds as links (1d: headed, duplicate, self lone embeds are links; cycle stub deleted; E-12 Keep +2 in `indexSeed`; E-13 Drop; E-11 Option A; E-09 narrowed class) | Replaces #20 S5-C (−6); supersedes S1-C's embed piece (#3, outside bundles); S7-D (#14) keeps the 16-line picker loop | −89 | `rewrite.ts` passes −14 inside #1 (*X-06*) | **−75** | +6 −75 = **−69** |
| 18 | **E-23…E-27** Retarget inside S3-2 (1c precedence; 9b Q-26's syntax and `format?`) | S3-1 (#8) owns the classifier; S4-C (#13) owns the re-parse −6 and query alias +2 (*X-07*) | `retarget` +12..+18, container branch +5, picker setting +2, Paste As inside a link +1..+5 | — | **+25** (+20..+30) | **+25** |
| | **Lane 11 Subtotal** | | | | | **−44** |
| 19 | **F-094** Connections as an `EditorHost` member (ruled in) | #26 (−6) counts only the `tableConnections` lines F-094's 22 signatures don't; `tableWidgetExtension(connections)` (`widget.tsx:560`) may be one of the 22, so re-measure #26 at plan time | −50 (audit-measured) | — | **−50** | **−50** |
| | **Total Change** | | | | | **−108** |

**Arithmetic:** Lane 9: +18 −18 +12 −50 −5 +1 +5 −26 +1 = −62. Lane 10: −49 +13 −1 +43 +40 −1 +3 = +48. Lane 11: −69 +25 = −44. F-094: −50. Total −62 +48 −44 −50 = **−108**.

**Embeds Row Arithmetic (Row 17):** `connections.ts` −3, `tokens.ts` −8, `intents.ts` −1, `decorations.ts` Option A −8, `embedClaims.ts` + loop + `embeddable` inlined (Drop) −23, cycle stub −11, `detect.ts` narrowed class 0, `autocomplete.ts` −3, `useConnectionAutocomplete.ts` Drop −11, `rewrite.ts` −16, `scan.ts` −7, `indexSeed.ts` Keep +2 = −89; minus the −14 inside #1 = −75. Option B (if the one live check passes, Lane 11 *§Stress*) adds −4.

#### Revised Bundle

| Bundle | Mid | Range |
|---|---|---|
| Synthesis **Full, Side 2, B-127** | −382 | −348 to −419 |
| **Revised: + Lanes 9, 9b, 10, 11 under 1b-1g, + F-094** | **≈ −490** | ≈ −435 to −540 on the lane ranges (the base's own ±35 sits on top) |
| Same without F-094 | ≈ −440 | ≈ −385 to −490 |
| Same with the optional Link-cell column Format ▸ (1f/1g, ≈ +4) | ≈ −486 | |

**Range Arithmetic:** most negative = Lane 9 −72 (P-24 −17, cut −19, menu −58, P-21 +2, P-22 −29) + Lane 10 +18 (rows −108, title +10, (b) +36, system +34, M10-06 −3) + Lane 11 −54 (Option B −94 +14, retarget +20) − 50 = −158 → −540; least negative = Lane 9 −59 + Lane 10 +77 + Lane 11 −21 (conservative −71 +14, retarget +30) − 50 = −53 → −435.

**Reading the Total:** the revised mid overshoots Nathan's −200..−400 band by ≈ 90, almost all of it F-094 (−50) and the lanes' structural deletions (value menu −57, embeds −75, P-22 −26, Lane 10's shared rows −96). The ruled-in additions (rows 11, 13, 14, 18 ≈ +121) are what keep it from reaching −600. Per Nathan's ruling, the real figure is reported after implementation.

#### Additive Pieces and What Each Buys

| Piece | Lines | Buys |
|---|---|---|
| Reading (b) core (row 13) | +36..+50 | 1b.3/1g: every construct in a resting MarkdownPM table cell answers its right-click menu without the press focusing the cell |
| System rows at rest (row 14) | +34..+47 | 1d/1g: Cut, Copy (source form), Paste, Paste As, Paste Without Formatting at rest, with the table payload still filling cells |
| Title fallback (row 11) | +10..+16 | F-043 (Page Title at rest swaps in) and B-158 (a pending swap survives the live cell or TextPane closing), one mechanism |
| Retarget (row 18) | +20..+30 | E-19/E-20/E-21: a pasted address no longer destroys a connection, a pasted link no longer nests, a pasted address replaces a closed destination; one target-change rule for paste, picker, and Link value commit |
| P-23 + Q-25/Q-26 (row 6) | +3 | `[[#H]]` and `[x](example.com)` commit on a Link value; one commit rule with 1c's alias precedence |
| P-21 + renderer syntax-keeping (row 7) | +5 | Hand-written `[x](Page)` Link values are stripped, parked, restored, and renamed like `[[Page]]`; Rename keeps the written syntax |
| M9-01 (row 9) | +1 | Hand-written unquoted `[[Page]]` values are parked when stripped |
| S2-C threading (inside row 3) | +4 | The commit reads `connections()` live, which lets `resolveConnection` and `linkResolve.ts` go (−14) |
| E-12 Keep (inside row 17) | +2 | Tiled embeds stay out of the Matrix graph (1d) |
| Column Format ▸ on Link cells (optional) | ≈ +4 | Link cells match Number/Select/Date cells' right-click (1f/1g) |

**Uncosted, Ruled or In Scope:** *X-02* unresolved-link menus (≈ +4..+8), *X-12* nested links at rest (≈ +8..+15), *X-04*'s decision on typed retargets, E-27's strict-flag decision (inside row 18's range), M11-02 (an inserted `![[]]` shows raw until S7-D's picker fills it), M10-04 (a resting commit of identical text still records an empty undo step; T-A's `changesTo` would have closed it and the rest wait doesn't — a guard in the rest commit, or `changesTo` reused in `cellCommitChange`, ±0..+3).
