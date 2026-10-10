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
| 7 | **P-21** Host readers agree (with *X-01*'s renderer syntax-keeping) | S1-B's (#2) `parseLink` fold stays in #2 | +2 (+3 renderer) | — | **+5** | **+5** |
| 8 | **P-22** Link values ride the body rewrite (F-035 alias drop mandatory; `spend.ts` guard kept) | New; composes with #1 (no shared lines) | −26 | — | **−26** | **−26** |
| 9 | **M9-01** Nested-YAML gone values noted and parked | New | +1 | — | **+1** | **+1** |
| | **Lane 9 Subtotal** | | | | | **−62** |
| 10 | **R-07/R-17 Rows 1, 2, 3, 5** `linkEdit` + one applier, rest link menu, seat union, `FormatEdit.head` | Replaces #15b Side 2 (−32) whole: S7-B −10 and Side 2's −16/−6 sit inside; takes S3-2's `linkFormat.ts` −12 from #9; S7-C's −3 (#17) sits inside row 2's `menuAt`/`menuTarget` | −44..−58, −31..−35, −13..−17, +2..+3 | Row 4 (−3..−4) is inside #16's `linkClicks.ts` −7 → 0 | **−96** (−85..−108) | +32 +12 +3 −96 = **−49** |
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

**Uncosted, Ruled or In Scope:** *X-02* unresolved-link menus (≈ +4..+8), *X-12* nested links at rest (≈ +8..+15), *X-04*'s decision on typed retargets, E-27's strict-flag decision (inside row 18's range), M11-02 (an inserted `![[]]` shows raw until S7-D's picker fills it).
