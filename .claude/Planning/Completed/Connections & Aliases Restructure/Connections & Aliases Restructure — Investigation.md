## Connections & Aliases Restructure — Investigation

**DATE:** 10-15-2026
**BASE:** `f94fc0af3` (identical to the audit commit `5272eb82f` under `Core/`, `Desktop/`, and `UIX/`)
**SOURCES:** W22 of the *Pommora Codebase Audit* (lines 827–1053 and its footnotes), *Architecture Design*, *Architecture Brief*, the typed fixes (`c4.diff` F-118, `c5-full.diff` F-114, `c11-core.diff` F-119), five planning scouts and three sweep agents, each load-bearing claim reopened at HEAD. Every `path:line` below was opened at HEAD; a claim that couldn't be is marked *(unverified)*.

### 1. Status at HEAD

The code matches W22's description in substance: two markdown grammars (`links.ts:10-15`), two resolvers (`linkValue.ts:61-80` against `connectionsApi.ts:28-60`), two closure trackers in one listener (`linkEdit.ts:235-286`) beside `linkTyping` (`linkReveal.ts:18-26`) and the picker's `origin` (`acQuery.ts:17-56`), and the duplicated shown-text rules (`linkValue.ts:83-108`, `rewrite.ts:24-42`, `connections.ts:86-96`). Probes run through `vite-node` against HEAD modules reproduced the defects W22 rests on: `linksIn('[[ #H]]')` yields nothing while `[[#H]]` yields `p/h`; `retarget` and `linkValueFromRename` drop an alias holding `]`; `markdownPageLink('C# Notes','Intro')` writes `[C# Notes](C#%20Notes#Intro)`, which reads back as title `C`; `rewriteConnections('[[Old#Intro|Old#Intro]]')` leaves `[[New#Intro|Old#Intro]]`; `[](Page)` isn't an occurrence. Scout 2's host-clean probe (`scratchpad/s2probe/tsconfig2.json` under `Desktop/tsconfig.node.json`) re-ran at exit 0.

**Sources That Aren't What They're Labelled:**

- `c3.diff` is the base commit `5272eb82f` (production files), not a typed F-116/F-117 fix; no typed grammar diff exists anywhere in the scratchpad, so F-116's −12, F-117's −43, and the C-3 remainder's +6 can't be re-checked, and their AFTER shapes come from the Fix paragraphs and Scout 1's design alone.
- `measured.md` uses the audit's pre-ledger numbering: its "F-121 (C-11)" is F-119, "F-122 (C-8)" is F-120, "F-127" is F-129, and its F-114 reads −102 (unformatted) where the ledger reads −84.
- The scouts' brief named three wrong paths: `Core/Index/scan.ts` is `Core/Connections/scan.ts`, `Core/Index/cascade.ts` is `Core/Nexus/cascade.ts`, and `Core/Platform/stores.ts:138` is `Desktop/Store/stores.ts:138`.
- The coordinator's note places `readMatrixGraph` renderer-side; it runs in the host (`Core/Matrix/handlers.ts:22`, `Core/Matrix/README.md:55`). The renderer's read of the reply is `matrixConnections` (`Core/Matrix/matrixInput.ts:59-70`).

**Citations That Moved or Failed:**

| Citation | Status |
|---|---|
| `scan.ts:118` (`[[ #H]]` dropped) | The drop is `names` at `scan.ts:116`, fed by the untrimmed read at `:113`; `:118` is the `yield`. |
| `names.ts:28-29` ("unreachable branch") | Location holds; the claim fails. Only the `|#` alternative inside `expressibleInLink` is shadowed by `:28`; the call at `:29` still refuses `]]`, a trailing `]`, and line breaks. |
| `assignValue.ts:54-57` ("builds its own index") | Location holds; the claim fails. `pageIndexOf(tree)` (`:57`) is the memoized object `previewConnections()` hands out (`pageConnections.ts:31`). |
| `autocomplete.ts:55-165` | Function ends at `:167`. |
| `connectionCommit.test.tsx:518-537` | The test runs `518-540`; the text-only assertion is `:539`. |
| `linkEdit.test.tsx:307` | Holds (Scout 1's "moved to `:306`" is wrong; `:306` is the URL row). |
| `filter.ts:143`, `sort.ts:61` | Hold (Scout 5's "moved to `:142`/`:60`" is wrong). |
| Paste's fence check | `pasteLink.ts:50` (Scout 1 cited `:54`). |
| `ConnectionsPM.md` Return and label-fill sentences | `:59` and `:60` (Scout 3 cited `:57` and `:58`). |
| F-114's "the `TreeIndex` and `Looks` interfaces and the empty-icon placeholder" | Only `TreeIndex` exists (`treeIndex.ts:34`); `Looks` and the placeholder were introduced and removed inside the typing (`c5-step123.diff`). The typed −84 was measured against HEAD, so the net stands; the removal list doesn't. |

**Session Rulings (Settled After the Scouts Reported):** labelled S1–S4 here, apart from the standing rulings' numbers (`[](Page)` is standing ruling 1, and so on).

- **S1 · Return Everywhere:** Return inside a link's alias or label rests the caret past the link in every editor place, cells and the Text pane included; a second Return does the surface's own thing.
- **S2 · The Full-Form Link Field:** the Link field opens on the value's full written form, alias included, and Rename on a Link value becomes that same one-line field seated in its alias slot; `linkValueFromRename` and the alias-only field retire.
- **S3 · A Plain Field's Feel:** the one-line fields are one line that scrolls, with spellcheck off; the typing transforms stay.
- **S4 · Frontmatter Keys by Principle:** the owner delegated F-127's keys rule to three criteria: one rule applied identically by the graph and the cascade, no invalidation plumbing, and nothing that can go stale.
- **Addresses:** out of scope, so no behavior change: resolution keeps returning the destination as written and stored values keep the `https://` they get today.
- **Save Heading Aliases:** no setting exists; the heading-alias intent stands. The *Architecture Design* still proposes it (`Design.md:21`, `:32`), and W22's Target bullet and F-121's **Your call** carry it; the plan inherits none of them.

### 2. Contradictions With W22 and the Rulings

Grouped by finding; each changes the Fix text, a net, or the sequencing.

#### F-114

- **The typed test edit contradicts the Fix.** `c5-full.diff` adds `parent: 'Library'` to `remintLedger.test.ts` (diff lines 286, 294) where the Fix has `projectBaseline` strip records to `{ id, kind, title, path }`. The strip is right: `remint.ts` reads only those four fields. The two test edits revert; the strip costs +3 (one mapper over `entries` and `claimants`, `remintLedger.ts:19-26`). **Net:** −81.
- **The removal list** names `Looks` and the placeholder (see §1); the Fix text drops them.
- **`searchEntriesOf` and `navKeysOf`** key on `LOOKS` in `c5-full.diff`, where the Fix narrows them; their honest keys are `[contexts, nexus.name]` and `[contexts]` (their output carries no icon). Fix over diff, 0 lines.

#### F-116 and F-117

- **Return's binding can't move into `typedInput(scope)`.** `typedInput` is an `EditorView.inputHandler` (`markdownInput.ts:231-232`); Enter arrives by keymap (`markdownInput.ts:271`, page-only through `MarkdownEditor`). S1 has since made Return-in-a-shown-slot universal (§3, conflict 13), which settles the shape: the binding lives in `editorBase`'s `Prec.highest` keymap after `paneKeys` (`surface.ts:82-87`), not in `inlineSurface` as Scout 1 proposed, since `inlineSurface` sits ahead of `paneKeys` in `editorBase`'s array and would preempt a pick.
- **`inRawHtml` can't move "beside `docScan`"** if that means `docCache.ts`: `inRawHtml` reads the `editorHost` facet (`decorations.ts:441-446`), and `api.ts:5` already imports `docCache`, so it would close `docCache → api → docCache`. Its home is `api.ts`, beside `editorHost` and the `htmlFormatting` setting.
- **"Paste into a link respects fenced code" is HEAD behavior.** `pasteEdit` returns the literal paste on `inCodeNear` (`pasteLink.ts:50`), and `inCodeAt` reads `scan.fences` (`docScan.ts:351-356`). Three of the four "behaviors that move" are real.
- **`drawnLink` has no job left.** The tokenizer draws every occurrence (`tokens.ts:292`); with `[](Page)` ruled a link and `[x]()` refused by the pattern, "real link" equals "is an occurrence".
- **`[](Page)` drawing is two renderers**, the editor's markdown loop (`decorations.ts:533-566`, which hides both markers around an empty `contentRange`) and the resting cell (`cellStatic.tsx:161`, `draw(cs, ce, inner)`), each drawing nothing today.
- **F-117's one walk refuses every empty slot the picker opens on.** Both patterns refuse an empty title or destination (`connections.ts:31`, `links.ts:7-8` at `min 1`), so `[[`, `[x](`, `[x]()`, and `[]()` read as nothing once a closer is appended. Six tests pin the picker opening there (§3, conflict 14); `openLinkAt` answers them with a placeholder at the caret.

#### F-118

- **`[[ #H]]` isn't a bare heading everywhere after `c4`.** The body index reads `written = read(o.title)` untrimmed (`scan.ts:113`), so `titleKey` gives `''` and `names` refuses it (`scan.ts:26-30,116`), while `frontmatterMentions` reads through `readLinkText`, which trims. One `.trim()` at `scan.ts:113` closes it (§3, conflict 6).
- **`c4` normalizes resolved addresses** (`resolveLink` returns `written.url`, built through `normalizeLinkUrl`), against the ruling; HEAD resolves raw (`connectionsApi.ts:49`, `valueTarget.ts:25`). D4(A) is the shape, with five normalize points rather than three (§4, F-118).
- **`c4` keeps the guards the ruling removes.** `c4` adds `hit.tk &&` to `dwell` and `menu` (the `linkPointer` hunk, diff lines 393-396) and fabricates `{ kind: 'page', syntax: 'wiki', title: '' }` targets in `sectionRunAt` and `cellLinkTarget` (diff lines 344, 429). Standing ruling N5 and the Fix ("no guards for it, no stand-in wikilink") remove both; `bareHeading(heading, own?)` is the honest input.
- **`parseConnectionText` folds into a read narrowed to a wiki page**, not to a page: its six callers read File values (`assetMigrate.ts:57,178`, `assetRoots.ts:22,28`, `assetUrl.ts:22`, `value.ts:67`), and `readLinkText('[x](Photo)')` returns a markdown page, which a kind-only narrowing would newly admit as an asset reference.
- **`assignValue` reads the shared index already** (§1); `c4`'s switch to `previewConnections()?.index` adds a Properties → Session → Interface edge for nothing. Keep `pageIndexOf(tree)` (moved to `Nexus/record` by F-114).
- **Net ≈ −28, not −15** (§7).

#### F-119

- **CellEditor and TextPane need the unmount flush.** CodeMirror's `destroy()` blurs only while `contentDOM` is the active element (`@codemirror/view` 6.43.1, `dist/index.js:8594-8595`), and both hosts destroy in passive cleanup, after React has detached the node (`TextPane.tsx:149-153`, `CellEditor.tsx:273-276`). TextPane's `save()` reads the document in `close()` before any settle (`TextPane.tsx:46-49,101-106`). HEAD's Return-close memory is host-dependent: where the `PickerMenu` outlives `open=false` through its exit (`TableView.tsx:251`'s keyed popover, `ValuePickPresenter.tsx:39` under `useHeld`), `useFocusScope`'s cleanup returns focus to the trigger (`UIX/Interactions/focusScope.ts:37-49`), the editor blurs while attached, and `aliasOnLeave` remembers and collapses, the layout-cleanup save (`TextPane.tsx:156`) then catching the collapse; where the host unmounts outright (`PropertyPanel.tsx:540`, `CardsView.tsx:486`), no blur reaches the editor, by the codebase's own premise that a removed focused field fires none (`EditableInput.tsx:89`; *unverified at runtime*). A Tab or Return out of a cell unmounts its editor while focused the same way. The flush is required either way, which keeps Brief §7.1 ("when a Text value pane closes on Return") true on every host.
- **The unarmed baseline needs one more arm.** For a link no edit armed, W22 has the baseline read at the pick; for an unclosed one (`[Nice](Alpha` with Pair Brackets off), that text resolves and Remove Title would drop `Nice`, where HEAD keeps it (`originOf` snapshots `[Nice]()` at query birth, `acQuery.ts:38-42`). An unclosed query has no baseline, read as "pointed nowhere".
- **`linkTyping`'s reasons for staying don't hold for a state field.** Decorations read state fields synchronously (`decorations.ts:466`); the staleness came from `c11-core.diff`'s plugin-instance tracker. The fold is viable (§3, conflict 3).
- **The tracker is a field plus a plugin, and the field lives in `linkReveal.ts`.** A field can't run the leave (blur, `hasFocus`, the host call need a view); and `linkEdit.ts:34` imports `decorations.ts`, which reads the field, so a field in `linkEdit.ts` would close a cycle. `c11-core.diff` keeps the state on the plugin instance, against the Fix.
- **`c11-core.diff` re-adds the inline `!` check** in `emptied` (`line.text[md.full[0] - 1] === '!'`), against ruling 4+5.

#### F-120

No contradiction survives. Two conditions the Fix leaves implicit: the open-slot anchor reads the slot back from the written text through the one grammar, which needs the writers to spell a present-but-empty heading and alias (`connections.ts:92-95` drops an empty alias; `links.ts:85` drops an empty heading); and the page pick passes `container: null` to the writer with the shown text decided once from the document, since passing the document link as `container` would compare the partial title against the pick.

#### F-121

- **`namesTarget` can't be the drop rule.** The Fix has `namesTarget` on both rewrite arms ("the new target to drop") while keeping `connectionText`'s drop as "would the link draw the same without the alias"; those disagree, and the rewrite reading drops `[[New#H|New]]`'s alias, changing what it draws (§3, conflict 1).
- **The lead example isn't a defect the Fix repairs.** `connectionText('Page', 'Intro', 'Intro')` keeping the alias is correct under the drop rule the Fix keeps (`[[Page#Intro]]` draws `Page § Intro` under Page & Heading, not `Intro`); the Finding should present only the rename example (`[[Old#Intro|Old#Intro]]`), which the carry fixes.
- **The Remove Title fold flips two pinned paste rows.** `pasteLink.test.tsx:350-351` (`[[Page1|Mine]]` → `[[Page2]]`, `[y](Page1)` → `[Page2](Page2)`) mount with no `connections` (`:335`), so `Page1` never pointed; under the ruled rule both keep their shown text. The block needs a seeded index and new phantom rows.
- **Save Heading Aliases is gone.** No setting exists (owner's clarification); W22's Target bullet and F-121's **Your call** drop the proposal.

#### F-122

- **The alias slot is missing from the writer's fallback.** `connectionSpells` checks title and heading only (`linkValue.ts:178-179`), and `connectionText` silently drops an alias `keepsAlias` refuses (`connections.ts:94`), so an alias holding `]`, a line break, or more than 255 characters vanishes on edit, Rename, and paste-as-Connection (probed). Brief §1.5 lets a label hold anything escaped; the ruling falls back "when a wikilink can't spell a slot". `keepsAlias` stays the alias-list rule (`aliasMemory.ts:21,34`, `AliasList.tsx:174`); spellability joins the writer's check.
- **The markdown fallback can't hold `#` in the page half.** `encodeLinkTarget` (`links.ts:76-82`) rides `encodeURI`, which leaves `#` alone, so every encoding writer (`markdownPageLink`, the picker's commit `autocomplete.ts:303`, the page rename `rewrite.ts:16`, the heading rename `rewrite.ts:65`) writes a raw `#` the first-`#` reader mis-cuts (probed). `.replace(/#/g, '%23')` on that chain fixes all four at 0 lines; it's a prerequisite for F-122 and F-125, so it lands with F-116.
- **`expressibleInLink` needs no slot parameter.** `pageLinkPattern` caps page and heading alike at 255 (`connections.ts:7`), and a title can't pass 255 as a filename, so a uniform length check mirrors the grammar with all nine callers untouched.
- **`nameError`'s branch isn't removable** (§1).
- **The whole-link span costs 0, not +5**: `full: Span` replaces `at` on `LinkHit` (§3, conflict 8).

#### F-127

- **The index-side rule as ruled needs invalidation W22 didn't count.** `extractPageIndex` reads no registry (`indexSeed.ts:39-66`); a registry change that flips a key's verdict writes no page file (`createProperty`, `registryProperty.ts:46-78`), `oweNamedKeys` re-reads only for multi-select renames (`fileEvents.ts:522-539`), and the seed's mtime gate never re-reads an unchanged file (`indexSeed.ts:214`), so a baked verdict outlives restarts. The owner delegated the choice to the principles; the `value`-kind shape passes all three criteria (§6).
- **The embed can't stay a `syntax` value for markdown.** Both rewriters branch on `'markdown'` only (`rewrite.ts:15,63`), so a markdown embed tagged `'embed'` would be rewritten as a wikilink (raw title, wiki alias drop). `embed: boolean` on `LinkHit`.
- **`spacesLinkHeading` is a missed consumer** (`cascade.ts:60-68`, called from `fileEvents.ts:302`): it reads every Space key with no registry gate and must apply the one rule too.
- **MarkdownPM.md's embed note already exists** (`MarkdownPM.md:120`); the Fix's last sentence becomes "states both syntaxes and the in-paragraph rule".

#### F-129

- **Alias memory would have two owners for the Link field.** Every Link-value write remembers after it lands (`assignValue.ts:49-60,77-80`), reached by the panel (`PropertyPanel.tsx:208`), the view host (`useViewHost.ts:177`), and the menu's value pick (`entityMenuActions.ts:95`); a one-line Link instance carrying the tracker's remember would add the same alias a second time, before the write is known to land.
- **The net is +30 to +55 before S2's offsets** (§7), and `inlineSurface` forces what the ruled feel removes: `EditorView.lineWrapping` (`surface.ts:54`) and `spellcheck: 'true'` (`surface.ts:59`), where `EditableInput` scrolls with an eclipse fade and has spellcheck off (`EditableInput.tsx:53,63`).
- **A fourth Link-field surface:** `ValuePickPresenter.tsx:39` (the menu's value pick) mounts `PropertyValueInput` as a popover without `alias`.

### 3. Conflicts Resolved

1. **The rename drop rule.** HEAD's title arm drops an alias only when it normalizes to `title#heading`, or the title with no heading (`rewrite.ts:24-27`), the same "repeats the target" test `connectionText` applies (`connections.ts:93-94`). **Resolution:** `namesTarget` decides what's carried (shown text naming the old title, heading, or `title#heading` follows it) and what's never remembered; the drop stays the writer's one `repeatsTarget`. Under it `[[New#H|New]]` keeps drawing `New`, `rewrite.test.ts:29-33` and `:189-197` hold, and the heading arm gains a drop only for an alias carried to the full `title#heading` (`[[P#Old|P#Old]]` → `[[P#New]]`; HEAD leaves `[[P#New|P#Old]]`, probed). Under W22's reading both tests flip (`[[New#H]]`, `[[P#New]]`). Scout 4's example "`[[Page#A|B]]` renamed A→B gains a drop" is wrong under Scout 4's own rule: `B` doesn't repeat `Page#B`, so it stays.
2. **Remove Title's baseline for paste and the Link field.** Paste can't read the tracker in every path: `pasteEdit` is a pure function over a `DocScan` and the host (`pasteLink.ts:42-78`), also called with no view by the resting cell (`cellStatic.tsx:460`) and a new table cell (`MarkdownTable.tsx:248`) through `pastedCellText` (`pasteLink.ts:130-139`). It already receives `host`, whose `connections()` is the renderer's index (`api.ts:166-168`). F-114's "Paste and Paste As stay resolver-free together" concerns the clipboard's target (`clipboardTarget`, `pasteLink.ts:18-23`; `pasteAsItems`, `Desktop/Actions/editorMenu.ts:111-114`), never the container under the paste. **Resolution:** one rule owns "pointed": `keepsShown(baseline, next, removeTitle, index)` returns `!removeTitle || !pointed(baseline) || sameTarget(baseline, next)`, with `pointed` read from `resolveLink(baseline, index)` and a null baseline reading as unpointed. Callers pass what they hold: the picker its tracker baseline (null for an unclosed query), paste the link under the paste as it read before dispatch (`readLinkText(within.text)`, `pasteLink.ts:69`) with `host.connections()?.index`, and the Link field `current` until F-129 retires the field-only path. Scout 3's sketch (`baseline = … : ''`) inverts the ruling: `readLinkText('')` is null, `keepsShown(null, …)` is false at HEAD (`linkValue.ts:187-191`), and the document label would drop. Choosing the container before dispatch as paste's "before the edit" is a planner's disclosure; a paste into a link the user had just typed into compares against that typed text.
3. **`linkTyping`.** Decorations read `linkTyping` from state inside `build` (`decorations.ts:466`), so a state-field tracker is never stale on arming. The fold doesn't widen the color's reach: the typing class is applied only in the wiki loop (`decorations.ts:569` returns for every non-wiki token; the class at `:613-618`), so markdown phantoms stay as they are unless the markdown loop is changed (Scout 3's "spans markdown phantoms too" is false). The four `linkReveal.test.ts` cases (`:43,49,54,60`) dispatch without `userEvent`; under the fold they gain `userEvent: 'input'`, `:54-58` ("a bare caret move ends it") flips, which standing ruling 12 accepts, and `:49` and `:60` keep passing. One lag survives: under Scout 3's D1-A the leave clears the field through a deferred `linkSettled` dispatch, so the color lingers one macrotask on a link just left. **Resolution:** fold it (≈ −8), with that lag named.
4. **Flushes.** Resolved for Scout 3 (§2, F-119): both hosts flush. TextPane's flush runs inside `save()` before it reads the document, so the collapse is saved on every way out, and it must be idempotent (the first flush clears the field), since a Return close runs `save()` twice, once in `close()` and once as the layout cleanup (`TextPane.tsx:46-49,156`); CellEditor's runs in its cleanup before `onClose` (`CellEditor.tsx:273`), whose update listener commits a non-mirrored change (`:255-258`; *hypothesis* that committing from inside unmount is safe).
5. **Link-field alias memory under F-129.** Verified (§2, F-129). Removing `rememberedAlias` would lose memory for every non-editor write (`useViewHost.ts:177` serves table writes beyond the field) and would remember before a write is known to land; mounting the Link instance "without the remember half" and "a flag on the settle plugin" are one shape. **Resolution:** the settle extension takes `remembers: boolean`, the Link instance passes false, with the reason stated where it's passed: the write layer owns Link-value memory. The Text one-line instance remembers, since `rememberedAlias` covers Link values only (`assignValue.ts:55`).
6. **`[[ #H]]`.** `read(o.title).trim()` at `scan.ts:113` is the whole fix: `titleKey('', own)` then returns `own`, and `names` admits a bare heading (`scan.ts:26-30`). `titleKey` and `names` need nothing else; `[[ ]]` still names nothing (written `''`, qualifier `''`). Rewrites still edit the untrimmed `o.title` span, which is correct for an in-place edit.
7. **The embed flag.** The only producer is `scan.ts:117` and the only reader `indexSeed.ts:56`; `rewrite.ts` reads `syntax` only against `'markdown'` and `'section'` (`:15`, `:41` through `shows`, `:63-64`) and stays untouched, becoming correct for markdown embed lines. `tilesFile.ts:277` and `cascade.ts:64` read `target` and `qualifier` alone.
8. **`LinkHit`'s shape.** Readers: `rewrite.ts:13` (`syntax`, `target`, `title`, `heading`, `alias`), `rewrite.ts:36` (`syntax`, `alias`), `rewrite.ts:60-66`, `indexSeed.ts:55-58` (`syntax`, `target`, `qualifier`, and the only external read of `at`, `:57`), `tilesFile.ts:277`, `cascade.ts:64`, `scan.ts:167`, and `scan.test.ts`. **Resolution:** one shape, the occurrence's spans under the occurrence's names plus the index's keys: `{ syntax: 'wiki' | 'markdown' | 'section'; embed: boolean; target; qualifier; full: Span; title: Span; heading: Span | null; shown: Span | null }`. `at` goes (`indexSeed.ts:57` reads `hit.full[0]`), `alias` becomes `shown` (retiring the `scan.ts:128` label remap and `scan.ts:70`'s false comment), and section runs yield `full: [from, to]`, `embed: false`. Net 0.
9. **Where the default label is drawn.** One rule, `defaultLabel(title, heading) = heading || title`, with three readers: the writer (`markdownPageLink`'s empty label, which the picker reaches through the writer under F-120), the collapse (`emptied`'s fill, `linkEdit.ts:195-197`), and the shown-text rule (`linkDisplayText`'s markdown page arm, F-126). The two resting renderers (`decorations.ts:533-566`, `cellStatic.tsx:161`) draw what `linkDisplayText` returns for an empty label rather than spelling the rule, so `[](P#H)` draws `H` everywhere. An address has no default label: an emptied URL label stays empty on leave (`emptied` returns null when `targetTitle` is null, pinned by `linkEdit.test.tsx:306`); what `[](https://…)` draws at rest is an owner question (§9).
10. **F-118's net.** Scout 2's D5 table checks against `c4`: `tokenLink` is 13 lines (diff lines 275-287) and goes once tokens carry their occurrence; `c4` already removed `parseConnectionText` from `readLinkText` but kept it for the six asset callers, so the fold (`connections.ts:67-83`, 17 lines, to a 4-line `wikiTitle`) is real; the two `§` literals are real. The guards line is 0, not +1 (the `hit.tk &&` edits modify existing lines), and D4(A) is +2 to +4 with its two extra normalize points. D5 mixes `c4`-as-typed with recommended design deltas (D2–D4); read as a sequenced estimate, its items tally ≈ 247 removed and 218 to 220 added, ≈ −28 (−18 to −29).
11. **F-127's cost.** Scout 5's staleness chain holds (§2, F-127). D2-C's gap: links under registered non-link keys still draw graph edges while the cascade skips them. App-written File values are string arrays that `linkEntry(v, 2)` rejects (`linkValue.ts:28-34`), and Number, Date, and Checkbox can't hold `[[…]]`, so the gap is a Select or Status option literally named like a link, or a hand-written unquoted single File entry. The owner's criteria rule both D2-A and D2-C out; the third shape is evaluated in §6.
12. **F-129's net and feel.** Confirmed: `inlineSurface` hard-codes wrapping and spellcheck (`surface.ts:54,59`), and `typedInput(scope)` brings the transforms and auto-pairs (`markdownInput.ts:231-266`). Under S3 the one-line instance needs a no-wrap, spellcheck-off variant of `inlineSurface` (an option on the factory, since `lineWrapping` can't be removed by a later extension), keeps the transforms, and adds: Return commits after the shown-slot rest, a newline filter (paste flattened), Escape restoring `initial` while the picker is closed, blur committing unless focus moves into the caret pane, an invalid text cancelling, and the invalid state on `view.dom`. ≈ +30 to +55 before the offsets in §7.
13. **Return's binding.** Confirmed and now ruled (S1). **Shape:** `{ key: 'Enter', run: commitAliasOnEnter(scope) }` in `editorBase`'s `Prec.highest` keymap after `paneKeys`, beside `smartDelete(scope)` (`surface.ts:82-87`), so an open picker still takes Return and the binding runs ahead of `CellEditor`'s and `TextPane`'s own `Prec.highest` Enter, which come later in their arrays (`CellEditor.tsx:199-205`, `TextPane.tsx:125-133`); it leaves `markdownInput` (`:271`), and `shownEnd` takes `scope` where it hard-codes `'page'` (`linkEdit.ts:130`). **Behavior change:** in a table cell, Return with the caret in a wikilink's alias or a markdown link's label (picker closed, outside code) now rests the caret just past the link's closer instead of moving to the cell below or continuing a list; in a Text pane it rests past the link instead of saving and closing; in the one-line fields it rests past the link instead of committing. A second Return, the caret no longer in a shown slot, does the surface's own thing. Raw HTML gates only page scope with HTML Formatting on (`decorations.ts:438-439`), so cells and Text values never stand down for it. Resting past the closer leaves the link, so the first Return now settles the tracker (remember, collapse) in a cell, where HEAD's Return unmounts the cell editor unsettled.
14. **The picker's empty-destination tests.** The six: `autocomplete.test.ts:210-217` and `:227-231` (`[]()` and `[the notes]()` at `(`+1), `:371-380` (`[]()` label escape), `connectionCommit.test.tsx:574` (`[sel]()`, ArrowRight), `acQuery.test.ts:72` (`[x](`) and `:101` (`[x]()`); the last two sit inside the `origin` describe F-119 rewrites, so they move with it. The placeholder is sound: `\u0000` is legal in every wiki slot and in a destination (`connections.ts:7`, `links.ts:7-8`); the code mask is the real document's (`(p) => inCodeAt(scan, ls + p)`), and `codeTouches` checks the link's start against it and inline spans on the synthetic line (`markdownCode.ts:213-224`), exactly what HEAD's `openConnectionAt` does with `${head}]]` (`edits.ts:346-360`). It also answers `headingHash.test.ts`'s empty cases (`[[]]` at 2, `![[]]` at 3, `[a]()` at 4), which Scout 5d expected to need special-casing.

### 4. What's True, by Finding

#### F-114

- **Chain:** `indexFor` memoizes `walk` on six inputs including `pageMetadata` (`treeIndex.ts:48-60`); the host walks again through `recordsOf` (`record.ts:15`) → `indicesOf` (`heldPages.ts:16`) → `titlesOf` (`heldPages.ts:47-56`), read by `titleHeldOutside` and `frozenWorld` (`heldPages.ts:59-75`).
- **Consumers W22 missed:** `assignment.ts:91` (`frozenWorld`, signature unchanged); memo-key readers `Sidebar.tsx:296` (`ownIcon`), `MatrixLabel.tsx:28`, `matrixPaint.ts:207`, `matrixSlice.ts:165`, `navigationSlice.ts:525`, `useNavData.ts:24`; `TileHost.tsx:220`, the one `ConnPage.icon` reader `c5` repoints (its clean `tsc` is the evidence).
- **Landing conditions confirmed:** `pagesOf`, `pagesByIdOf`, `pageIndexOf` on `entityMemo([])` (`c5-full.diff` 260, 277), sound because pages live only under collections and dropping `ConnPage.icon` removes the last `pageMetadata` read; `holders(title)` with `resolve` derived; `titlesOf` keys agree with `PageNode.title` (`readNexus.ts:128`); the host graph stays clean. The null-on-duplicate reason belongs once, on `pagesByIdOf`: "the window shows a page two files claim; the host's writers refuse it."
- **No direct tests** of `titleHeldOutside` or `frozenWorld` exist; F-131 pins `holders` and both readers.

#### F-116 and F-117

- **The shape:** one flat `LinkOccurrence { syntax: 'wiki' | 'markdown'; full; title; heading: Span | null; shown: Span | null }` (`LinkSpans`, `connections.ts:14-19`, goes; its one external importer is `edits.ts:3`). A markdown destination splits at its first raw `#` only when the half before names a page (`namesPage`, `links.ts:31-32`, exported once and shared by the split, the `§` fold, and the resolver), the split runs before decoding, and spans are trimmed.
- **Tokens carry the occurrence** (`link: LinkOccurrence` on both link kinds); `resolveRange` and `heading` leave the wiki token (`tokens.ts:45,263-264`), `aliasedToken`, `headingOf`, `linkAddress` read `tk.link`, and `shiftToken` (`tokens.ts:76-92`) shifts it for every caller, `format.ts:103,166` and `decorations.ts:363` included.
- **Consumers W22 missed:** `edits.ts:406` (`autoPair`'s `[` stand-down reads `inAliasAt`), `format.ts:103,166` (`shiftToken`), `tokens.ts:52-66` (the helpers derived from token fields), `acQuery.ts:91` (the third raw-HTML asker).
- **Caret readers stay in `Input/edits.ts`:** moving them into `connections.ts` closes `connections → Engine/docScan → detect → connections` (`docScan.ts:10-34`, `detect.ts:15`, evaluated at module top by `detect.ts:401`).
- **`linkAt`** keeps the highest `full[0]` holding the offset (no sort); `isLiteralAt` tests the caret against the slots, ends inclusive, never `full`, since `linkAt` holds `at === full[1]` and HEAD's transforms don't stand down there; `connectionAt`'s inlining into `linkTyping` keeps the `[[` gate (`edits.ts:341`), or the fold in conflict 3 removes that caller.
- **`openLinkAt` (placeholder, Scout 1's sketch):** reads `head + '\u0000' + closer` with the closer chosen by whichever opener (`[[` or `](`) comes last, finds the occurrence ending at the synthetic end, and cuts the slot holding the placeholder back to the caret; HEAD's `endsWith('[[')` branch (`edits.ts:350-353`) goes. The picker's `closed` reads "the closer follows the caret" for both syntaxes.
- **The `§` fold:** "the caret is in the title slot" plus `syntax === 'wiki' || namesPage(title text)`, so an address's undivided title never turns `§` into `#` (HEAD guards it through `opensFragment`, `headingHash.ts:23`).
- **The raw-HTML gate:** `drawsRawHtml` and `inRawHtml` move to `api.ts`; `shownEnd(state, at, scope)` becomes the one "the shown slot of a live link holds the caret" question, read by Return, by the `]` swallow (`markdownInput.ts:249`), and by `autoPair`'s `[` (`edits.ts:406`), which then asks the same scope-aware question.
- **Behavior moves:** `[]()`-family empty labels make every inline `![](x.png)` an occurrence and a phantom index row, as `![alt](x.png)` already is (`scan.ts:122`); `[[]](x)` reads as `[` plus `[](x)`; both want pins.

#### F-118

- **Chain:** text → `parseConnectionText` (`connections.ts:73`) or `wholeLink` (`:61`) → `readLinkText` (`linkValue.ts:61-80`, refusing and recapitalizing with `resolve`, `:50-51`); token → `tokenTarget` (`connectionsApi.ts:52-60`) → `resolveMdTarget`/`titleTarget` → `MdTarget`, then `heldTarget` (`linkClicks.ts:85`) and `linkStatus`.
- **Consumers W22 missed:** `valueMenuTarget` (`valueTarget.ts:28-34`) and its readers `PropertyPanel.tsx:346`, `CardValue.tsx:112`, `TableView.tsx:286`; `TextCell.tsx:56` (passes `own` to `resolveFollow`, harmless); `Core/Testing/editorHarness.ts:45,52,87` (types `connections` as `ConnectionsApi` and needs `location` beside `pickTree`).
- **AFTER:** the resolver in `linkValue.ts` beside `readLinkText` (no new file, no new edge; it imports only `connections` types, `pageIndex` types, and its own module); `LinkTarget`'s url arm carries `page?: { title; heading? }` (the Fix over `c4`'s loose fields); `ResolvedLink = page | self | url | unresolved(status)`; `bareHeading(heading, own?)` as the bare-heading rule's one owner, called by `resolveLink` for an empty title and directly by `sectionRunAt`, `cellLinkTarget`, and the picker; a tk-less hit opens the menu with `editable: !!hit.tk` (`applyLinkAction` returns silently without a token, `linkEdit.ts:109-110`); `wikiTitle(raw)` for the asset callers, whose `!!x` tests become `x !== null` (a bare `[[#H]]` returns `title: ''`); drawing calls `resolveLink` without `own`, or a held `[[#H]]` loses `bare` and draws `Holder § H`.
- **`connectionsApi.ts` keeps** `ConnectionsApi`, `headingMissing`, `LinkLook`, `linkLook`, `linkClass`; `LinkMenuTarget`/`linkMenuTarget` fit `Actions/connectionMenu.ts` beside `LinkMenuContext` (net 0, drops two MarkdownPM imports).
- **D4(A), verified at every writer and reader.** `LinkTarget.url` carries the destination as written; HEAD's one normalize point (`linkValue.ts:79`) is replaced by normalizing where HEAD's behavior depends on it: `retarget`'s url arm (`linkValue.ts:209-210`), `pasteAsWrite`'s url branch (`pasteAsMenu.ts:105-120`), the paste title lookup (`pasteLink.ts:57`, whose cache is keyed normalized), `linkDisplayText`'s default arm (`linkValue.ts:156`, or sort and filter keys and LinkCell's Full Link text move for a hand-written `example.com`), and `sameTarget`'s url compare (`linkValue.ts:185`, or Remove Title's same-target test splits `example.com` from `https://example.com`). Already safe raw: `linkDomain` and `isHttpLink` normalize internally (`urlPath.ts:12-22`), so the Paste As rows (`pasteAsMenu.ts:46,65`) and the Short Link and Page Title arms hold; the openers normalize at their boundary (`linkClicks.ts:124`, `windowSlice.ts:250`, `Web/handlers.ts:41`); `linkEditText` (`linkValue.ts:119`) retires under S2. With those five points, D4(A) preserves HEAD: the resolver, Copy Link (`connectionMenuActions.ts:23`), and LinkCell's `href` read raw as today, and every stored value keeps the `https://` it gets today. Scout 2's "sorts as written" side effect doesn't occur.

#### F-119

- **Chain:** `aliasOnLeave(scope)` is mounted only through `inlineSurface` (`surface.ts:51`) under `editorBase` in the three picker hosts (`MarkdownEditor.tsx:148`, `CellEditor.tsx:163`, `TextPane.tsx:115`), so a field in the surface is present wherever the picker reads it.
- **AFTER (Scout 3's D1-A):** `linkWriting: StateField<{ start; was } | null>` in `linkReveal.ts`, armed by a user input or delete whose changed range strictly overlaps a link (`c11`'s `full[0] < to && full[1] > from`), mapped through changes, cleared by a `linkSettled` effect; a `linkSettle(scope, { remembers })` plugin owns the leave (caret leaves, blur whose `relatedTarget` isn't the caret pane, or `flush()`), remembers synchronously, and dispatches the collapse with `linkSettled`, deferred from `update` and immediate from blur or flush, re-reading the field when it runs (HEAD's deferred collapse runs against a stale offset, `linkEdit.ts:206-212`). The raw-HTML gate runs at settle, where `scope` is closed over. `pendingTitles` (`pendingTitle.ts:19-29`) is the codebase's precedent for an effect-armed, change-mapped field.
- **The picker's baseline:** `w?.start === ac.start ? w.was : ac.closed ? sliceString(ac.start, ac.end) : null`, read through conflict 2's rule.
- **Sequencing:** the heading-rename settle has one importer (`MarkdownEditor.tsx:17,165,244`); its move to `Links/` collides with F-071's proposed MarkdownPM sentence placing the settle under `Guards/` (audit F-071 Fix) and with F-049's heading-name change in the same file.
- **Hot path:** an unarmed caret move costs one null check; an input costs one changed-range lookup; an armed caret move one `linkAt`, against HEAD's three to four line reads per update.

#### F-120

- **Query:** `{ syntax: 'wiki' | 'markdown' | 'prose'; part: 'title' | 'heading' | 'shown'; start; end; from; to; query; closed; title? }`, `'prose'` always `part: 'heading'` (renaming `c8`'s `'bare'`); predicates read `part` inline; `CLOSER: Record<Syntax, string>` replaces `closerOf`.
- **`commitEdit`:** four arms switched on `part`. A page pick writes the whole link through the writer with `container: null` and the shown text decided once; the anchor is `start + text.length` finishing, or the slot read back from the written text through `linkOccurrences` when opening one. A heading pick never applies Remove Title (HEAD, `autocomplete.ts:297-301`). The alias-stage gate is the same in both syntaxes and includes `heading` (`connectionCommit.test.tsx:383`).
- **Return in a markdown destination** extends `commitAliasOnEnter`, the Return-in-link owner: with the picker closed and the caret in a closed markdown link's destination, it rests at the label's end under `aliasPickerOnCommit` (+4); the `shown` query then lists the page's aliases, or nothing for a URL.
- **Consumers:** `ConnectionForm` and the predicates at `useConnectionAutocomplete.ts:81,84,116,134,149,155,188,234`, `AutocompletePane.tsx:26,56-63,87-88`, `acQuery.ts:8,27-34`; `commitEdit` has one caller (`useConnectionAutocomplete.ts:161`).
- **Picker heading rows:** `autocomplete.ts:182` hides headings `expressibleInLink` refuses; once picks write through the falling-back writer, the filter can go.

#### F-121

- **The rules (Scout 4's sketch, corrected):** `repeatsTarget(alias, title, heading?)` is the drop; `namesTarget(shown, { title, heading })` is true for the title, the heading, or `title#heading`, and serves the carry and the remember rule; `defaultLabel(title, heading) = heading || title`. `showsTarget` (`linkValue.ts:83-89`, read only by `shownAlias`) and `shows` (`rewrite.ts:34-42`) go.
- **Remember rule:** `shownAlias` (`linkValue.ts:92-108`) is already the one rule both callers share (`linkEdit.ts:245`, `assignValue.ts:57`); the heading clause is one line in it. Its `was` comparison should resolve `before` through `resolveLink` too, or a markdown `before` on the url arm skips the already-showed check.
- **Probe:** `shownAlias('[[Page#H|nice]]', …, '[[Page#H]]')` returns `nice` at HEAD (Scout 4); the rule makes it null.

#### F-122

- **Writers bypassing the fallback, missed by W22:** `pageMenuActions.ts:54` (Copy Link writes `connectionText` bare) and `gripMenu.ts:92` (guards the heading through `linkable`, `:79`, not the title).
- **AFTER:** one page writer `pageLinkText({ title, heading, shown }, prefer)` returning a wikilink only when every slot spells (alias spellability included), else `markdownPageLink`; the heading rename's wikilink arm falls back over `hit.full`, keeping an embed line's `!` outside `full`, so it stays an embed in markdown form; `follow` keeps in-place edits otherwise, since whole-link re-emission loses a table cell's `\|` (`rewrite.ts:9`).
- **Pinned behaviors that change:** `rewrite.test.ts:232-236`, `linkValue.test.ts:264-271` (`:270`, missed by W22), `linkValue.test.ts:334-339`.

#### F-123

Confirmed literal. `RenamableLabel.tsx:71` turns an unchanged commit into `onCancel()`, so `by` is forwarded on both paths (`:43-48`, `:71`). In `EditableInput`, Enter blurs (`:83`) and the blur commits (`:94-103`), so a key flag set at `:80` is read in `onBlur`; Escape passes `{ by: 'key' }` (`:91`); the invalid-blur cancel passes `{ by: 'blur' }` (`:100`). The post-unmount path is unpinned (`aliasPicker.test.tsx:336-366` covers `paneHeld` only). Only `AliasList` reads `by`.

#### F-124

`aliasRows` has one caller (`useConnectionAutocomplete.ts:116`); dropping `.slice(0, AC_MAX)` (`autocomplete.ts:214`) is −1. `useEntrance(list.rows, (r) => r.key, match === 0)` (`UIX/Animations/useEntrance.ts:5-19`) reseeds when a filter clears, which a plain `match === 0 &&` guard wouldn't. Both alias reads already call the one rule `heldAliases` (`aliasMemory.ts:17`; `editorHost.tsx:62` imperatively, `AliasesRow.tsx:15-16` reactively), so a session selector would add a cached function to save nothing; `slot`'s row typing is clean only inside F-120's switch on `part`.

#### F-125

Confirmed: Rename keeps the value's syntax (`linkValue.ts:140-141`), and Show Full Link writes `connectionText` unguarded (`LinkCell.tsx:47-48`). Under S2 the Rename field and `linkValueFromRename` retire into the one-line Link field seated in its alias slot, and `linkEditText` retires with the field-only edit text, so `linkValueFromEdit` loses `current` and `keepTitle` and becomes `retarget('wiki', null, next)` through the writer; Show Full Link goes through `pageLinkText(…, 'wiki')`. Until F-129 lands, the plain field still re-applies the hidden alias through `keepsShown`, so the ruled rule applies there in the interim.

#### F-126

`linkDisplayText` has three consumers W22 omits: `LinkCell.tsx:77`, `WebTile.tsx:25`, and `linkMarkdown` (`linkValue.ts:168`, then `pendingTitle.ts:94` and `linkPaste`). Remove Link spells its own `shownConnection` (`linkEdit.ts:43-48`). One pass serves Link and Text values: `shownProse(text)` replaces each occurrence with `linkDisplayText`, a Link value being a whole link or a bare address; `sort.ts:58-62` and `filter.ts:140-144` merge `text` and `link`. Keys are extracted once per row per resolve (`sort.ts:136-141`), off every keystroke path. File values stay on `fileName` (`Properties/value.ts:66`).

#### F-127

- **Chain:** `extractPageIndex` (`indexSeed.ts:39-66`) adds body rows from `linksIn`, `embed` rows from the wiki-only `loneEmbed` (`scan.ts:81-84,117`), `body` rows from `valueLinks` under every key (`scan.ts:159-169`), and `frontmatter` rows from `frontmatterMentions` (`scan.ts:143-157`). The graph reads body, citation, and frontmatter rows (`Desktop/Store/stores.ts:133-156`); the rename lookups read every kind but `space` (`stores.ts:100-115`).
- **`loneEmbedTitle` keeps four editor consumers** (`detect.ts:430`, `embedGuard.ts:46,69`, `subfieldStats.ts:29`); `loneEmbedRe` is composed from `pageLinkPattern().source` (`detect.ts:401`), not a hand copy.
- **The embed question on the occurrence:** `embedLine(body, full)` = `!` immediately before `full[0]` at the line's start and nothing but whitespace after `full[1]` to the line's end, asked of both syntaxes.
- **Whole-value test:** today a whole-value `[x](notes.app)` lands as a `body` row through `valueLinks` (`readLinkText` reads it as url, so `scan.ts:166` doesn't skip it), and a rename reaches it that way; Scout 2's "never a mention, a page rename won't rewrite it" doesn't hold. The `value`-kind shape folds the two readers into one and retires the question (§6).
- **The cascade's gate** is `patchOf` (`cascade.ts:190-205`), reading `readKeptRegistry(root)` at rename time (`cascade.ts:186-188`); `deleteCascade` strips only Link-defined keys (`cascade.ts:89`), a different question that stays.

#### F-128

`connectionText`'s eight callers confirmed, four passing `undefined` for the heading; `composeWebpageEmbedLine` (`pasteAsMenu.ts:108`, `embedInsert.ts:62`) and `serializeLink` (`pasteAsMenu.ts:115`, `linkValue.ts:168,209`, `format.ts:152`) spell the same template. `c4` already renames `linkValue.ts:42`'s `pageTarget` to `writtenPage`, and F-116 retires `links.ts:98`'s, so F-128 has no `pageTarget` work left; of the two `LinkHit`s, the unexported one in `linkClicks.ts:20` renames. The reorder is a silent runtime change (both slots `string | undefined`): `connections.test.ts:88,108-111` keep compiling and go false.

#### F-129

- **Surfaces:** inline editing at `PropertyPanel.tsx:410`, `CardValue.tsx:144`, `TableView.tsx:213`; the full Link popover at `ValuePickPresenter.tsx:39`; the Rename popover at `PropertyPanel.tsx:541`, `CardsView.tsx:487`, `TableView.tsx:251` (each passing `alias` for a Link value). Rest-state drawing is unchanged at every site, which swaps the Cell for `PropertyValueInput` only while editing.
- **AFTER (Scout 3's D3-A, under S2 and S3):** `TextPaneEditor` (`TextPane.tsx:78-180`) generalizes into one value editor with a `oneLine` mode; `TextPane` wraps it in its `PickerMenu`; `PropertyValueInput` mounts it for the Link field (opening on the full written value), the Rename field (the same editor seated in the alias slot), and the single-line Text field. `PropertyValueInput`'s `parse`, `invalid`, and `commit` (`:56-68`) stay the one owner of value semantics. `TextPicker` and `EditableInput` stay for Number.
- **Gains:** the picker, the alias stage, Remove Title through the picker, collapse, Return in a shown slot, the paste rules, the typing color, live connection drawing; the single-line Text field remembers aliases as its pane does (Brief §7.3).

#### F-130 and F-131

The documentation and test reconciliation is §8.

#### AFTER Sketches (Corrected)

The scouts' literal sketches, carried here so the planner needn't open the reports; corrections are noted beside each.

**F-116 · The occurrence and `LinkHit` (Scouts 1, 4, 5; conflict 8):**

```ts
export interface LinkOccurrence {
  syntax: 'wiki' | 'markdown'
  full: Span
  title: Span            // markdown: the trimmed destination up to a page-naming `#`, else all of it
  heading: Span | null
  shown: Span | null     // wiki alias; markdown label (never null for markdown)
}
export interface LinkHit {
  syntax: LinkOccurrence['syntax'] | 'section'
  embed: boolean
  target: string
  qualifier: string
  full: Span
  title: Span
  heading: Span | null
  shown: Span | null
}
```

**F-117 · `openLinkAt` (Scout 1, unchanged; verified in conflict 14):**

```ts
/** The link still being written before `at`, as it reads once closed; a placeholder at the caret keeps an empty slot readable, since both patterns refuse an empty title or destination. */
export function openLinkAt(scan: DocScan, at: number): LinkOccurrence | null {
  const i = lineIndexAt(scan, at)
  const ls = scan.lineStarts[i]
  const head = scan.lines[i].slice(0, at - ls)
  const wiki = head.lastIndexOf('[[')
  const md = head.lastIndexOf('](')
  if (wiki === -1 && md === -1) return null
  const text = `${head}\u0000${wiki > md ? ']]' : ')'}`
  const o = linkOccurrences(text, (p) => inCodeAt(scan, ls + p)).find((x) => x.full[1] === text.length)
  const cut = (s: Span | null): Span | null => (s && s[1] > head.length ? [s[0], head.length] : s)
  return o ? { ...o, full: [o.full[0], head.length], title: cut(o.title)!, heading: cut(o.heading), shown: cut(o.shown) } : null
}
```

**F-117 · The `§` fold (Scout 1):**

```ts
export function headingHash(scan: DocScan, selStart: number, selEnd: number, inserted: string): Edit | null {
  if (inserted !== '§' || inCodeNear(scan, selStart)) return null
  const li = lineIndexAt(scan, selStart)
  const ls = scan.lineStarts[li]
  const o = linkAt(scan, selStart) ?? openLinkAt(scan, selStart)
  if (!o || selStart - ls < o.title[0] || selEnd - ls > o.title[1]) return null
  if (o.syntax === 'markdown' && !namesPage(scan.lines[li].slice(o.title[0], o.title[1]))) return null
  return { from: selStart, to: selEnd, insert: '#', selection: selStart + 1 }
}
```

**F-118 · The bare-heading rule (Scout 2's D2) and the asset read (D3):**

```ts
/** A bare heading names `own`, the page holding a value, and otherwise the document it's written in. */
export const bareHeading = (heading: string, own?: ConnPage): ResolvedLink =>
  own ? { kind: 'page', page: own, heading } : { kind: 'self', heading }
// in resolveLink:
if (title === '') return heading ? bareHeading(heading, own) : { kind: 'unresolved', status: 'phantom' }
// linkClicks.ts sectionRunAt:
target: bareHeading(text.slice(1), heldOf(ownPage(view))),

export const wikiTitle = (raw: string): string | null => {   // linkValue.ts
  const t = readLinkText(raw)
  return t?.kind === 'page' && t.syntax === 'wiki' ? t.title : null
}
```

**F-119 · The tracker (Scout 3's D1-A; the baseline's third arm corrected to `null`):**

```ts
// linkReveal.ts — replaces linkTyping
export const linkSettled = StateEffect.define<null>()
export const linkWriting = StateField.define<{ start: number; was: string } | null>({
  create: () => null,
  update(w, tr) {
    if (tr.effects.some((e) => e.is(linkSettled))) return null
    if (!tr.docChanged) return w
    const kept = w && { start: tr.changes.mapPos(w.start, 1), was: w.was }
    if (!tr.isUserEvent('input') && !tr.isUserEvent('delete')) return kept
    const hit = changedLink(tr) // first changed range strictly overlapping a link; `was` read in startState
    return hit && hit.start !== kept?.start ? hit : kept
  },
})
// linkEdit.ts — replaces aliasOnLeave; `remembers` is false for the Link field's instance
export const linkSettle = (scope: MarkdownScope, remembers: boolean) => ViewPlugin.define((view) => ({
  update(u) {
    const was = u.startState.field(linkWriting), now = u.state.field(linkWriting)
    if (was && now?.start !== u.changes.mapPos(was.start, 1)) settle(view, scope, remembers, mapped(was, u), true)
    if (now && u.selectionSet && !(view.hasFocus && within(u.state, now))) settle(view, scope, remembers, now, true)
  },
  flush() { const w = view.state.field(linkWriting); if (w) settle(view, scope, remembers, w, false) },
}), { eventHandlers: { blur(e) { if (!inCaretPane(e.relatedTarget)) this.flush(); return false } } })
// the picker's baseline, in useConnectionAutocomplete's commit:
const w = view.state.field(linkWriting)
const baseline = w?.start === ac.start ? w.was : ac.closed ? view.state.sliceString(ac.start, ac.end) : null
```

**F-121, F-122 · The rules and the one writer (Scout 4; the drop is `repeatsTarget`, `namesTarget` carries and never remembers):**

```ts
const fitsSlot = (s: string): boolean => s.length <= 255 && !/[\r\n]/.test(s)
export const expressibleInLink = (t: string): boolean => fitsSlot(t) && !/[|#]/.test(t) && !t.includes(']]') && !t.endsWith(']')
export const aliasSpells = (a: string): boolean => fitsSlot(a) && !a.includes(']')
export const keepsAlias = (name: string, target: string): boolean =>
  name.trim() !== '' && aliasSpells(name) && normalizeTitle(name) !== normalizeTitle(target)
export const repeatsTarget = (alias: string, title: string, heading?: string): boolean =>
  normalizeTitle(alias) === normalizeTitle(heading ? `${title}#${heading}` : title)
export const namesTarget = (shown: string, t: { title: string; heading?: string }): boolean =>
  [t.title, t.heading, t.heading && `${t.title}#${t.heading}`].some((n) => !!n && normalizeTitle(n) === normalizeTitle(shown))
export const defaultLabel = (title: string, heading?: string): string => heading || title
export function pageLinkText(t: { title: string; heading?: string; shown?: string }, prefer: 'wiki' | 'markdown'): string {
  const wiki = prefer === 'wiki' && expressibleInLink(t.title) && (!t.heading || expressibleInLink(t.heading)) && (!t.shown || aliasSpells(t.shown))
  return wiki ? connectionText(t.title, t.heading, t.shown) : markdownPageLink(t.title, t.heading, t.shown)
}
// Remove Title's one rule (conflict 2): a null baseline is unpointed, so the shown text stays
export const keepsShown = (baseline: LinkTarget | null, next: LinkTarget, removeTitle: boolean, index?: PageIndex): boolean =>
  !removeTitle || !pointed(baseline, index) || (baseline !== null && sameTarget(baseline, next))
```

**F-126 · One pass for Link and Text values (Scout 4):**

```ts
export function shownProse(text: string): string {
  if (!text.includes('[[') && !text.includes('](')) return text
  let out = ''
  let at = 0
  for (const o of linkOccurrences(text, codeMask(text))) {   // in start order once F-116's walk yields in order
    out += text.slice(at, o.full[0]) + linkDisplayText(text.slice(o.full[0], o.full[1]))
    at = o.full[1]
  }
  return out + text.slice(at)
}
```

**F-127 · The embed question and the keys rule (Scout 5):**

```ts
const embedLine = (body: string, [from, to]: Span): boolean =>
  body[from - 1] === '!' && lineStartAt(body, from) === from - 1 &&
  !/\S/.test(body.slice(to, lineEndAt(body, to)))
export const holdsLinks = (key: string, type: PropertyType | undefined): boolean =>   // Properties/schema.ts
  type === undefined ? keyRefusal(key) === null : type === 'link' || type === 'text'
```

### 5. What's Reusable

| Mechanism | Where | Serves |
|---|---|---|
| `entityMemo(keys, build)` | `Core/Nexus/tree.ts:131` | F-114's per-projection memos; `matrixTree` already uses it (`matrixInput.ts:33`). |
| Effect-armed, change-mapped `StateField` | `pendingTitles`, `Links/pendingTitle.ts:19-29` | F-119's `linkWriting`. |
| `linkRest` / `restedOnLink` | `Links/linkReveal.ts:5-15` | The Return rest and the shown-slot rest after a pick. |
| `paneHeld`, `holdPane`, `inCaretPane` | `Menus/caretPane.tsx:52-58` | The blur exemption in F-119's settle and F-129's blur commit. |
| `commitAliasOnEnter` | `Links/linkEdit.ts:143-153` | Return in a shown slot everywhere (S1) and Return in a markdown destination (F-120). |
| `editorBase` / `inlineSurface` | `MarkdownPM/surface.ts:42-92` | The one factory F-129's one-line mode extends (no second mount lifecycle). |
| `heldPage` facet, `ownPage` | `MarkdownPM/api.ts:47,59` | `bareHeading`'s `own` and the picker's held page. |
| `pickTree` on `EditorHost` | `api.ts:198`, built `editorHost.tsx:134` | The precedent for `location` moving to `EditorHost`. |
| `heldAliases(worn, title)` | `Connections/aliasMemory.ts:17` | F-124's one alias read (no selector). |
| `useEntrance(items, keyOf, ready)` | `UIX/Animations/useEntrance.ts:5` | F-124's alias-list entrance, `ready = match === 0`. |
| `keyRefusal(name)` | `Properties/schema.ts:21-26` | `holdsLinks`' reserved keys (`ID`, `banner`, `<Context>`, `$…`). |
| `byFoldedName(defs)` | `Properties/properties.ts:49` | `holdsLinks`' registry lookup, as `patchOf` already does (`cascade.ts:187-188`). |
| `linkEntry(v, nesting)` | `Connections/linkValue.ts:28-34` | One value reader covering YAML-nested `[[Page]]`. |
| `INDEX_GENERATION` | `Desktop/Store/ddl.ts:3` | The regenerative rebuild a `relations` column needs. |
| `normalizeLinkUrl`, `linkDomain`, `isHttpLink` | `Paths/urlPath.ts:7-22` | D4(A)'s normalize points; the last two already normalize internally. |
| `namesPage` | `Connections/links.ts:31-32` (exported once) | The occurrence split, the `§` fold, the resolver's address check. |
| `useFocusScope` focus return | `UIX/Interactions/focusScope.ts:37-49` | Explains HEAD's host-dependent TextPane blur; not something to add to. |

### 6. Approaches Worth Weighing

Each item lists the approaches, the scouts' recommendation, its verification, and the net (removed / added, production lines).

#### The One Occurrence Shape (F-116)

- **A, flat interface (recommended, Scout 1):** one shape for both syntaxes; `syntax` stays for the decoder, the writer, and token markers. **B,** a union with renamed slots: a second shape for a non-null `shown` only markdown readers need.
- **Verified:** `LinkSpans` has one external importer (`edits.ts:3`). Adds no type (replaces two).

#### Tokens Carrying the Occurrence (F-116)

- **A, `link: LinkOccurrence` on both link kinds (recommended):** ≈ −2 in `tokens.ts`, plus `tokenLink`'s −12 counted in F-118. **B,** consumers re-read the line: fails for resting cells, which have no `DocScan` per token (`cellStatic.tsx:613`). **C,** keep HEAD's fields beside an occurrence: the same span twice.
- **Cost named:** a markdown token gains a few small arrays per draw in `shiftToken`, on-screen links only, about what a wiki token already pays.

#### `openLinkAt` and the Empty Slot (F-117)

- **A, placeholder at the caret (recommended, verified in conflict 14):** ≈ +9 inside F-117's net; one comment carries the reason. **B,** explicit empty-slot branches: a second bracket walk. **C,** accept an empty destination while editing: contradicts ruling 1.

#### The Raw-HTML Gate's One Owner (F-116)

- **A (recommended):** `inRawHtml`/`drawsRawHtml` to `api.ts`; `shownEnd(state, at, scope)` the one question for Return, `]`, and `[`. ≈ −3. **B,** a `rawHtml` flag on the pure reader: a setting parameter on a `DocScan` reader, and `autoPair` has no scope (`edits.ts:371`). **C,** `c3`-era typed shape: `[` asks nothing, an odd one out.
- **Behavior change named:** `[` inside a shown slot no longer pairs, consistent with `]`.

#### The Resolver's Home and the Bare-Heading Rule (F-118)

- **Home:** **A, `linkValue.ts` (recommended):** no new file or edge. **B,** a new `resolve.ts`: a mutual (type-only one way) import with `linkValue.ts`, ≈ +4. **C,** move the written shape too: ≈ 12 importers churn for a rename.
- **Bare heading:** **A, `bareHeading(heading, own?)` (recommended):** one rule, no fake syntax, ≈ −6 against `c4`'s literals; adds one function that retires two literals and the picker's restatement. **B,** a `syntax: 'section'` arm: every writer switching on `syntax` must refuse it. **C,** a union parameter on `resolveLink` for one caller kind.

#### Addresses Under One Resolver (F-118)

- **A, D4(A) with five normalize points (recommended, verified behavior-preserving in §4):** ≈ +2 to +4 (one call out, five in, two of them in-line wraps). **B,** `written: string` beside a normalized `url`: two spellings of one address. **C,** accept normalized resolution: contradicts the ruling.

#### The Tracker (F-119)

- **A, field plus settle plugin (recommended, Scout 3):** ≈ −50 with the `linkTyping` fold (≈ 165 / 115; −45 to −60), plus the two flushes (+2). **B,** plugin state (`c11`): ≈ 8 lines simpler, but the picker reads another extension's instance, `linkTyping` stays, and it's the shape the adversarial review flagged. **C,** a self-clearing field the plugin watches: misses a transaction that arms and leaves at once (a pick resting past the closer).
- **Adds:** one field and one effect; no type, no host parameter.

#### The Picker Model (F-120)

- **A, flat `syntax` axis with `'prose'` (recommended):** ≈ −25 (171 / 146). **B,** the design's `PickerSource` union: +4 to +6, every reader narrows to reach `part`.

#### One-Line Fields (F-129, Under S2 and S3)

- **A, one value editor with a `oneLine` mode (recommended):** ≈ +30 to +55 before offsets; the no-wrap, spellcheck-off option on the factory is +3 to +5 of it. **B,** a separate `LineEditor`: a second mount lifecycle, ≈ +70 to +90. **C,** a plain-input driver: ruled out (N3).
- **Link-field memory:** `remembers: false` on the settle extension (≈ +2), per conflict 5.
- **Offsets:** Rename as the same field retires `linkValueFromRename` and the `alias` branches (`PropertyValueInput.tsx:55,57-58`), ≈ −8 to −12; F-125's field half (`linkEditText`, `linkValueFromEdit`'s `current` and `keepTitle`, `PropertyValueInput.tsx:42`, `LinkEditContext.keepTitle`) ≈ −11.

#### One Page Writer (F-121, F-122, F-128)

- **A, `pageLinkText` with one slot check (recommended, Scout 4):** adds `pageLinkText`, `aliasSpells`, `repeatsTarget`, `namesTarget`, `defaultLabel`; retires `connectionSpells`, `showsTarget`, `shows`, and three spellings of "names the target"; ≈ +1 for the writer and slot check. **B,** `connectionText` learns the fallback: wrong, since file references are wikilink-only by domain (`adoptFile.ts:53,64`, `assetWrite.ts:31`). **C,** add the alias to `connectionSpells`: leaves `pageMenuActions` and `gripMenu` bypassing.
- **F-128's template:** one `markdownLink(dest, label)` in `links.ts` that `markdownPageLink`, the embed line, and `serializeLink` share, ≈ −3. Scout 1 and Scout 4 agree the template collapse and the one writer are two layers (template under writer), not two writers.

#### The Rename Arms (F-121, F-122)

- **A, one private `follow` (recommended):** ≈ −6 (30 / 24), carrying both arms, the fallback, and the heading arm's `title#heading` drop. **B,** keep two bodies with `namesTarget` swapped in and the fallback on the heading arm only: ≈ +6, two carry spellings stay. **C,** whole-link re-emission: loses the table cell's escaped pipe.

#### Remove Title's One Rule (F-121)

- **A, `keepsShown(baseline, next, removeTitle, index)` owning "pointed" (recommended, conflict 2):** ≈ −4 / +3; `useConnectionAutocomplete.ts:144-147` goes. **B,** a separate `keepTitle` helper beside the rule: two places for one decision. Scout 4's carried-resolution variant needs the resolved union to reach `retarget`, which F-118 doesn't give it.

#### Sort and Filter on Shown Text (F-126)

- **A, style-free (Scout 4's recommendation):** wikilink headings read `Title § Heading`, the Remove Link text; ≈ +1 (11 / 12). **B,** styled by Heading Link Style, as W22 and the design state: the setting threads through `resolveView` → `applyFilter`/`prepareGroup` → `evaluatorOf`, `makeSorter`, the Matrix's two `applyFilter` calls, and `previewRules`, ≈ +10 to +12. An owner question (§9).

#### Which Frontmatter Keys Hold Links (F-127)

Owner's criteria: one rule applied identically by the graph and the cascade; no invalidation plumbing; nothing that can go stale.

- **D2-A, registry-aware index with owe-and-stamp:** one rule, but needs a verdict-flip owe in `oweNamedKeys` and a persisted registry stamp for the seed. Fails "no plumbing". ≈ +20 to +30.
- **D2-C, registry-blind index minus reserved keys, cascade on the rule:** no plumbing, nothing stale, but two rules (the index relates what the cascade won't rewrite). Fails "one rule". ≈ +4.
- **The `value` kind (recommended; passes all three):** the index records registry-independent facts and the readers apply `holdsLinks(key, type)` at the moment of use.
  - **Scope of the shape:** the coordinator named in-value links; folding the whole-value `frontmatter` rows into the same `value` kind is this investigation's extension, since those rows need the key for the same filter. The narrower alternative keeps `frontmatter` and gives it the `key` column too, at the cost of keeping two value readers.
  - **Index:** every link in every frontmatter value becomes one `value` row carrying its key. `frontmatterMentions` (`scan.ts:143-157`) folds into `valueLinks`, which reads each value through `linkEntry(v, 2)` (covering YAML-nested `[[Page]]`) and yields `key` with each hit; `indexSeed.ts:60-63` collapses to one loop, and its comment "a value's links are a small body's" goes. `RelationKind`'s `frontmatter` becomes `value` (`Core/Platform/stores.ts:9,40`); `relations` gains `key TEXT NOT NULL` with the primary key widened to `(path, kind, target, qualifier, key)`, and `INDEX_GENERATION` bumps (`ddl.ts:3,18-26`), the index being regenerative. Body rows carry `key = ''`.
  - **Graph:** the renderer applies the rule in `matrixConnections` (`matrixInput.ts:59-70`), with the registry in hand (`tree.config.registry`), one folded-name map per run and one lookup per `value` row; `readMatrixGraph`'s `seen` dedupe (`matrixGraph.ts:30-37`) carries `key` (or moves after the filter), and `matrixRuntime.ts:140`'s connections memo adds the registry identity check its `judged` memo already makes (`:146`). `LinkKind`, `ConnectionKind`, and `LINK_MULTIPLE` rename `frontmatter` to `value` (`Engine/graph.ts:4-5`, `Engine/forces.ts:7-13`; body and frontmatter already weigh the same, 0.075).
  - **Cascade:** `patchOf`'s gate (`cascade.ts:199`) becomes `if (!holdsLinks(key, typeOf(key))) continue`, and `spacesLinkHeading` (`cascade.ts:60-68`) filters keys the same way from the held tree's registry. `queryMentions` stays a superset (`stores.ts:103`), so a page whose only mention sits under a non-link key costs one file read the patch then skips.
  - **The rule:** `holdsLinks(key, type) = type === undefined ? keyRefusal(key) === null : type === 'link' || type === 'text'`, beside `keyRefusal` (`schema.ts:21`).
  - **Cost on the graph read:** one map lookup per `value` row, on graph pushes and registry changes only, never a keystroke; the per-link resolve `matrixConnections` already runs dominates it.
  - **Net:** removed ≈ 18 (`frontmatterMentions`, the second index loop, `spacesLinkHeading`'s double read), added ≈ 14 to 22 (DDL column and key, `Relation.key`, `holdsLinks`, `valueLinks`' key and `linkEntry`, the `add` key, `spacesLinkHeading`'s registry, the graph filter, the dedupe key, the memo check); ≈ −4 to +4. Test doubles change with it: `Core/Testing/memoryStores.ts:162` and `storesContract.ts:217`.
  - **What it settles beyond F-127:** Scout 5's "`valueLinks` and `frontmatterMentions` must share one whole-value test" disappears with the fold, and values read link syntax exactly as bodies do (`targetTitle` rather than `readLinkText`'s address-first reading).

#### The Embed Flag (F-127)

- **A, `embed: boolean` on the hit (recommended, Scouts 1 and 5):** ≈ +2 (5 / 7); `rewrite.ts` untouched. **B,** an exported `isEmbedLine` asked by `indexSeed`: an export for one caller. **C,** `'embed'` extended to markdown with `rewrite.ts` recovering the syntax: two axes conflated.

### 7. Nets, Sequenced

Production lines; removed / added where a typed diff or a scout's tally gives them, estimates marked ≈.

| Finding | Source of Figure | Removed | Added | Net | W22 |
|---|---|---|---|---|---|
| F-114 | `c5` typed, formatted, plus the baseline strip | 275 | 194 | −81 | −84 |
| F-116 | Scout 1 estimate (no typed diff): readers and codec ≈ −20, `[](Page)` in two renderers +15 to +20, tokens −2, raw-HTML gate −3, Return move 0, `#` encoding 0 | ≈ 205 | ≈ 197 | ≈ −8 (−13 to −1) | ≈ −5 |
| F-117 | Typed −43, unverifiable; placeholder `openLinkAt` inside | ≈ 82 | ≈ 42 | ≈ −40 (−35 to −45) | −43 |
| C-3 remainder | Early return; `codeToucher` cut per the adversarial review | ≈ 1 | ≈ 3 to 7 | ≈ +2 to +6 | +6 |
| F-118 | `c4` +3, `tokenLink` −12, `readOccurrence` −4, `wikiTitle` −11, `bareHeading` −6, D4(A) +2 to +4, `page?` nesting 0 (3 / 3) | ≈ 247 | ≈ 218 to 220 | ≈ −28 (−18 to −29) | ≈ −15 |
| F-119 | Scout 3 D1-A with the fold and both flushes | ≈ 165 | ≈ 117 | ≈ −48 (−43 to −58) | ≈ −50 |
| F-120 | Scout 3 (typed −16, less `narrowed`, plus the destination rule and early return) | 171 | 146 | ≈ −25 | ≈ −26 |
| F-121 | Scout 4: rules −11, Remove Title fold −1 | ≈ 23 | ≈ 11 | ≈ −12 | ≈ −8 |
| F-122 | `follow` −6, writer and slot check +1, `LinkHit.full` 0 | ≈ 38 | ≈ 33 | ≈ −5 | ≈ +4 |
| F-123 | Scout 1 | ≈ 9 | ≈ 5 | ≈ −4 | ≈ −4 |
| F-124 | Scout 3 | ≈ 2 | ≈ 1 | ≈ −1 | ≈ 0 |
| F-125 | Rename's syntax line only; the rest lands in F-129 | 1 | 0 | −1 | ≈ −3 |
| F-126 | Style-free one pass | ≈ 11 | ≈ 12 | ≈ +1 | ≈ +2 (+10 with Text) |
| F-127 | `embed` flag +2; `value` kind ≈ −4 to +4 | ≈ 23 | ≈ 21 to 29 | ≈ −2 to +6 | ≈ +2 |
| F-128 | One markdown template; reorder and `Span` at 0 | ≈ 6 | ≈ 3 | ≈ −3 | ≈ −4 |
| F-129 | One-line mode +30 to +55 (feel option inside), memory flag +2, Rename-as-field −8 to −12, F-125's field half −11 | ≈ 26 to 30 | ≈ 37 to 62 | ≈ +11 to +36 | +15 to +45 |
| F-130, F-131 | Docs and tests | 0 | 0 | 0 | 0 |

**Double counts removed:** `tokenLink`'s −12 sits in F-118 alone (Scout 1's F-116 token figure is the separate −2); F-125's `linkEditText` half sits in F-129; F-120's `narrowed` +10 is out (F-119's overlap arming retires it); the empty-slot writer (+2) sits in F-122's writer row; F-114's phantom `Looks` removals were never in the measured net.

**Sequenced total:** ≈ −250 before F-129 (range ≈ −215 to −270, the spread being the untyped F-116, F-117, and F-119 figures and about ±20 for overlaps between independently estimated fixes), and ≈ −215 to −235 with F-129 and S2's offsets (honest range ≈ −185 to −260). Against W22's ≈ −230 before F-129 and −185 to −215 in all, the investigation lands slightly better, mostly from F-118 (the fold and the `§` literals W22 didn't count) and S2 retiring Rename's separate field. It sits at the low end of the mandate's 200 to 500, as W22 said.

### 8. Reconciliation

Deduplicated across the scouts and sweeps; each line was opened. **The owner's uncommitted ConnectionsPM edit** rewrites `ConnectionsPM.md:11-12` (it drops "The label is the author's own text." and replaces the *Scope* bullet with an *Embedded Pages* bullet); line numbering below it is unchanged. No reconciliation item touches `:11-12`; F-127's embed sentence there already states the ruled embed rule in prose.

#### Feature Documents

| Finding | Line | Claim made false |
|---|---|---|
| F-114 | `ConnectionsPM.md:16` | "the page index, an in-memory map the renderer builds from the page tree" (both processes build it from `record.ts`). |
| F-114 | `ConnectionsPM.md:22` | "Main resolves no link." (main resolves titles through the shared index; it resolves no link syntax). |
| F-114 | `CorePM.md:83` | "Interface lookups derive from `treeIndex`: one record per entity … cached against the tree object" (the one walk is `recordsOf`; each projection its own memo). |
| F-127, F-130 | `ConnectionsPM.md:26` | "with assigned aliases also using the same cascading mechanism" (nothing cascades alias memory); "its frontmatter values only under keys the registry types as Link or Text" and "the Spaces whose Link or Text values name it" (Link, Text, or unregistered, never File). |
| F-119 | `ConnectionsPM.md:34` | "A connection being typed takes the color from its first character…" stays true; under the fold the color lasts until the caret leaves the link. |
| F-129 | `ConnectionsPM.md:55` | "serves every place a connection is typed — the page editor, table cells, markdown block tiles, and a Text property's TextPane" (adds the Link field and the single-line Text field). |
| F-120, ruling 1 | `ConnectionsPM.md:59` | "opens the list without a keystroke when **Automatically Suggest…** is on" (both syntaxes); "with the list closed, Return in either rests the caret there" (true everywhere after S1; add Return in a destination). |
| F-120, F-121 | `ConnectionsPM.md:60` | "accepting one … fills an empty label with the page's title, and rests the caret past the link" (the alias stage may open; the default label is the heading, else the title). |
| F-121 | `ConnectionsPM.md:62` | "decides whether a pick that re-aims a link … The pick re-aims the link as it read when the picker opened on it" (paste over a link and the Link field too; "as it read before the edit"). |
| F-121 | `ConnectionsPM.md:64` | "a body link of either syntax … or a Link property value that comes to show one" (a link naming a heading adds nothing); "the body picker's alias stage and the page panel's Aliases row show the same rows" is false today past 20 aliases and true after F-124. |
| F-130 | `MarkdownPM.md:31` | "an autocomplete that opens on `[[`" (also in a label, a destination, a fragment, and on `§`). |
| F-121 | `MarkdownPM.md:33` | "keeps its shown text unless the paste brings its own or **Remove Title On Link Change** is on" (only where the link pointed somewhere). |
| F-116 | `MarkdownPM.md:90` | "Bracket content, a citation's label included, and a link's destination stay literal." (a link's label too). |
| F-130 | `MarkdownPM.md:104` | "such as Rename or Edit Link" (a page link reads Edit Title). |
| F-127 | `MarkdownPM.md:118` | "a lone embed that can't tile … reads as the connection it holds" (it still stays out of the graph). |
| F-127 | `MarkdownPM.md:120` | Add both syntaxes and the in-paragraph `!` rule. |
| F-121 | `MarkdownPM.md:156` | "Picked inside a link, a form retargets it" (the pointed rule reaches Paste As Connection and Markdown Link through `retarget`; see §9 Calls on the link-display forms). |
| F-130 | `MarkdownPM.md:255` | "an image-style `![[file.png]]` target renders nothing" (it draws as a phantom connection). |
| F-119, F-071 | `MarkdownPM.md:8` | the `Guards/` and `Links/` folder sentences (the heading-rename settle sits in `Links/`); "for a page, a table cell, and a Text value alike" (adds the one-line fields). |
| F-129 | `MarkdownPM.md:10` | "run inside a page, a window, a tile, a property's TextPane, and a test harness" (adds the two fields). |
| F-126, F-129 | `PropertiesPM.md:62` | "It edits single-line wherever a value shows" (a one-line editor with the picker); "Text filters with Link's operators and sorts alphabetically" (on its shown text). |
| F-125 | `PropertiesPM.md:80` | "stored as `[alias](url)` or `[[Page|alias]]`" (Rename writes a wikilink wherever one spells). |
| F-121, F-125 | `PropertiesPM.md:82` | "stored as a connection under the page's own capitalization" (wikilink where spellable, markdown otherwise, Rename included); "an alias the value shows is remembered by the page" (unless the value names a heading). |
| F-129 | `PropertiesPM.md:117` | "Text-shaped values — a number, a link's address or alias, a Text value's first line — keep the shared text field" (a number alone). |
| F-123 | `PommoraUIX.md:287` | The `EditableInput` row gains the optional `{ by: 'key' | 'blur' }` on `onCommit` and `onCancel`. |

`.claude/Guidelines/Editor-Internals.md:25` stays true; no other Guideline is affected.

#### Code Comments

| Finding | Line | Comment |
|---|---|---|
| F-114 | `treeIndex.ts:1` | "One walk per tree … A new lookup belongs here, never as its own walk." |
| F-114 | `record.ts:1` | "which the host's lookups project from" (the renderer projects from it too). |
| F-114 | `heldPages.ts:1`, `:46` | "by title"; "Walked only when a delete, rename, or restore asks…" (goes with `titlesOf`). |
| F-114 | `pageIndex.ts:42` | "the index rebuilds on every tree change" (whenever the collections change). |
| F-114 | `destinationTree.ts:1` | "Both askers read the tree index's one walk" *(depends on what `nodesOf` becomes)*. |
| F-116 | `links.ts:13`, `:34`, `:45`, `:66` | the empty-tolerant regex, `opensFragment`, `markdownLinkAt`, `linkDestinationStart` docs (go). |
| F-116 | `links.ts:106` | "The `#` is split before decoding…" (moves to the occurrence builder). |
| F-116 | `scan.ts:70`, `:86` | "a connection's `alias`" (field renamed `shown`); `destinationHalves`' doc (goes). |
| F-116 | `edits.ts:329`, `:362`, `:641` | `linkAt` (add the later-starting rule); `inAliasAt` (renamed); "or a link address the caret sits in" (URL runs only). |
| F-116 | `linkEdit.ts:127`, `:182` | `shownEnd`'s doc (one shown slot, scoped); "An image's alt text is its own…" (goes). |
| F-116 | `headingHash.ts:6`, `autocomplete.ts:139` | move with the fold and into `openLinkAt`. |
| F-116, ruling 1 | `markdownInput.ts:231` | "Every typed character on both surfaces…" stays true; Return leaves `markdownInput`. |
| F-118 | `linkClicks.ts:26` | "A bare `§Heading` run in prose: no page, no menu, no glance" (false in held values and cells). |
| F-118 | `linkClicks.ts:84`, `:90`, `connectionsApi.ts:39` | `heldTarget`'s doc (goes); `own` "the page a bare `#Heading` answers to" (the body it travels in); the page-first doc moves to `resolveLink`. |
| F-119 | `linkEdit.ts:162`, `:189`, `:221`, `:234`, `:262` | `Slot`, `emptied`, `linkWithin`, `aliasOnLeave` (four claims), and the old-caret mapping (rewritten with the code). |
| F-119 | `linkReveal.ts:17` | `linkTyping`'s doc (goes with the fold). |
| F-120 | `autocomplete.ts:32`, `:45`, `:48`, `:52`, `:98`, `:244-245`, `:259`, `:267`, `:284`, `:302`, `:314` | the form, predicate, and anchor docs. |
| F-120 | `useConnectionAutocomplete.ts:153` | "an empty pipe with nothing behind it" (an empty slot, either syntax). |
| F-121 | `linkValue.ts:82`, `:91` | `showsTarget`'s doc (goes); `shownAlias`'s doc (the heading clause). |
| F-121 | `rewrite.ts:9`, `:33` | the carry and drop sentence (rewritten with `follow`); `shows`' doc (goes). |
| F-121 | `assignValue.ts:49` | "A landed Link value newly showing an alias for a page gives that page the alias" (not when it names a heading). |
| F-122 | `rewrite.ts:46` | "A heading the wikilink grammar can't write is never written into one" (true, but the link falls back to markdown). |
| F-123 | `useConnectionAutocomplete.ts:206` | `endEdit`'s doc names neither the no-blur paths nor why the tick and the fabricated blur stay. |
| F-126 | `filter.ts:143`, `sort.ts:61` | "the same parse Cell renders" (both go when the `link` cases merge). |
| F-126 | `linkValue.ts:144` | stays true under the style-free reading; moves above the address arm. |
| F-127 | `scan.ts:1`, `:159` | "a connection alone on its line behind a `!` is an embed" (both syntaxes, a flag); "a sentence under any key, registered or not" (rewritten for the `value` kind). |
| F-127 | `indexSeed.ts:60` | "A value's links are a small body's…" (goes). |
| F-127 | `cascade.ts:189` | "Every other type is left as written." (unregistered keys are rewritten). |
| F-127 | `Core/Platform/stores.ts:8`, `:11` | "emits its own syntax kind AND a `citation` row" (the kind isn't a syntax); "always 1 for `frontmatter`" (the kind becomes `value`, counted). |
| F-128 | `links.ts:25` | "The ONLY assembly path…" (one markdown template). |
| F-129 | `TextPane.tsx:26` | the pane's doc, if the editor generalizes. |

#### Test Assertions

| Finding | Test | Change |
|---|---|---|
| F-114 | `treeIndex.test.ts:5-17,208,213` | imports move to `record.ts`; `titlesOf` goes. |
| F-114 | `treeIndex.test.ts:108-118` | the icon assertion becomes "a `pageMetadata`-only change keeps the same `pageIndexOf`". |
| F-114 | `remintLedger.test.ts:76-81,98-104,191-196` | hold; `c5`'s `parent` edits don't carry over. |
| F-114 | `destinationTree.test.ts` | fixture gains `contexts: []` (`c5`). |
| F-116 | `connections.test.ts:15-23,26-30` | `alias` → `shown`; markdown `label`/`destination` → the one shape. |
| F-116 | `linkValue.test.ts:88` | `readLinkText('[](Page)')` reads a page. |
| F-116 | `linkEdit.test.tsx:307` | `a ![x](Alpha) b` fills to `a ![Alpha](Alpha) b`. |
| F-116, F-117 | `links.test.ts:154-209` | `linkDestinationStart`'s describe goes (no local shim over `openLinkAt`). |
| F-116 | `links.test.ts:8-9,81-118,138,145` | the `#`-splitting codec cases go or rename with the codec *(depends on the decoder's final names)*. |
| F-116, F-117 | `edits.test.ts:886-898,901-924` | `inAliasAt` → `shownLinkAt`; `openConnectionAt` → `openLinkAt` with `shown` in the expectations; `:912` (`[[`) holds through the placeholder. |
| F-116 | `edits.test.ts:539` | holds and becomes load-bearing for `isLiteralAt` reading slots. |
| F-116 | `aliasPicker.test.tsx:528-558` | the `connectionAt` describe (name and calls). |
| F-116, F-117 | `headingHash.test.ts:3` | moves with the fold; its empty cases hold through the placeholder. |
| F-116 | `tokens.test.ts:119,126,140-152,155-181` | `resolveRange` assertions change; `:140-152` must assert the shifted occurrence, not only key parity. |
| F-116, ruling 1 | `linkEdit.test.tsx:417,434,452,468,479` | call `commitAliasOnEnter(view)` directly; follow its scoped signature. |
| F-117 | `pasteLink.test.tsx:124,388` | hold if paste's "inside a link being written" reads `openLinkAt`. |
| F-117 | `autocomplete.test.ts:210-217,227-231,371-380`, `connectionCommit.test.tsx:574` | must pass (conflict 14); `:216`, `:230` read `shown` for `label`. |
| F-118 | `linkValue.test.ts:4,93,107-138,350-351,362-365` | `parseConnectionText` and the resolver describe move to `wikiTitle` and `resolveLink`; `:127`'s `linkResolver` contract goes. |
| F-118 | `connections.test.ts:7,53-84` | `parseConnectionText`'s describe re-pins on `wikiTitle` (bare heading, empty heading, cell escape). |
| F-118 | `linkValue.test.ts:62-73` | holds under D4(A) only if it asserts the stored form; a `readLinkText` url assertion reads raw. |
| F-118 | `valueTarget.test.ts:7-46`, `connectionsApi.test.ts:6-25`, `mdLinkTarget.test.tsx:8,52-86,192,202` | move to `resolveLink`; `invalid` literals become `unresolved(status)`. |
| F-118 | `ConnectionsApi` fixtures: `LinkCell.test.tsx:30-40`, `TextCell.test.tsx:23-28`, `PropertyValueInput.test.tsx:114-123`, `aliasPicker.test.tsx:60-65`, `connectionCommit.test.tsx:24-35,345-356`, `aliasRender.test.tsx:13-18`, `connectionHover.test.tsx:27-32`, `externalLink.test.tsx:44-48`, `linkEdges.test.tsx:27-31,155-162,404`, `linkEdit.test.tsx:45-51`, `mdLinkTarget.test.tsx:19-26,151-160` | the `{ index, … }` shape; `Cell.test.tsx:262-289,308-331` casts compile and fail at runtime. |
| F-119 | `acQuery.test.ts:70-130` | `origin` cases become `linkWriting` state tests. |
| F-119 | `linkReveal.test.ts:43-63` | gain `userEvent`; `:54-58` flips. |
| F-119 | `linkEdit.test.tsx:366-390` | pass without exercising their gates once arming needs an edit; rewrite to type. |
| F-120 | `autocomplete.test.ts` `form` sites (`:35`–`:482`), `:494`, `acQuery.test.ts:34,105,111,167`, `mdLinkTarget.test.tsx:235` | `{ syntax, part }`; `toEqual` objects gain `start`/`end`; `:203` loses its partial edit. |
| F-120 | `connectionCommit.test.tsx:315` | row 1 reads `[](Gamma) x` with the stage open, filled on leave. |
| F-121 | `connectionCommit.test.tsx:488,502` | `[x](Notes#Setup)` remembers nothing. |
| F-121 | `linkEdit.test.tsx:248`, `assignValue.test.ts:292,295,296` | pass for the heading reason; `:292` needs a page-only fixture to keep pinning "already showed". |
| F-121 | `pasteLink.test.tsx:350-351` | invert unless the block seeds an index. |
| F-121 | `linkValue.test.ts:391-401` | default label `heading || title`: `[H\]](P#H%5D)`. |
| F-121 | `rewrite.test.ts:29-33,189-197` | hold under conflict 1's reading. |
| F-122 | `rewrite.test.ts:232-236` | `[A | B](#A%20%7C%20B)` fallback for the wikilink. |
| F-122 | `linkValue.test.ts:270`, `:334-339` | markdown fallback; the alias kept in markdown form. |
| F-122 | `scan.test.ts:255-265` | `LinkHit` gains `full`, loses `at`, renames `alias`. |
| F-123 | `EditableInput.test.tsx:54,70` | `onCommit` receives `(next, { by })`. |
| F-125 | `linkValue.test.ts:252-257` | Rename writes `[[Meeting Notes#H|Today]]`. |
| F-125, F-129 | `linkValue.test.ts:239-241,285,307-310` | `linkEditText` goes. |
| F-127 | `scan.test.ts:184-212,220-227,235-241` | `frontmatterMentions` folds; `syntax: 'embed'` → `embed: true`. |
| F-127 | `indexSeed.test.ts:341` | "whatever the key" goes false; kinds become `value`. |
| F-127 | `rewrite.test.ts:3,121-128` | `loneEmbedTitle` cases belong in `detect`'s tests. |
| F-128 | `connections.test.ts:88,108-111` | silent reorder: compile and go false. |
| F-128 | `linkValue.test.ts:16,100,140-150` | `serializeLink` follows the one template. |
| F-129 | `PropertyValueInput.test.tsx:41-50,94-100,138-152` | no `<input>` for Link; behaviors stay. |
| F-129 | `.claude/scripts/Alias Drive/live-drive.mjs:212-230` | group 1's Link-value block drives an `INPUT` (`drive-harness.mjs:207`); re-type with F-129, not F-130. |
| F-120 | `live-drive.mjs:513-516` | re-expect once F-120's gate for a non-empty label is set. |

#### Unpinned Behaviors Needing New Tests

`[](Page)` read, indexed, renamed, and drawn with its default label; `[[]](x)`; `[[ #H]]` in the body index; a lone `![Alias](Zeta)` line as an `embed` row and an inline one as a link row; a value link under an unregistered key renamed, under a registered Number key filtered from the graph, and a registry change re-filtering without a re-index; `PageIndex.holders`, `titleHeldOutside`, `frozenWorld`; a 256-character heading falling back; an alias holding `]` falling back to markdown; a `#`-titled markdown link round-tripping; `linkDisplayText` for `[[#H]]`, `[[P#H]]`, `[](P#H)`; a Text value sorting on shown text; Remove Title in paste over a phantom container, in the Link field, and for an unclosed unarmed query; the heading pick's caret in `[[Notes#|Mine]]`; a wiki emptied alias waiting for the whole link; an already-empty slot tidying in an edited link; a drop arming the tracker; the TextPane Return-close and the cell Tab-out flushes; Return in a shown slot in a cell and a Text pane, and a second Return; the typing transforms standing down in a label; `foo](bar` no longer a destination; abutting links resolving to the later; a `]` in a label inside an HTML block; a `§` run's menu and glance in a held value; `autocompleteQuery`'s early return; the post-unmount alias-edit path; more than twenty aliases; typing cost on a link-dense line.

### 9. Questions for the Owner

1. **What does `[](https://example.com)` show at rest?** F-116 makes it a drawn link; standing ruling 1 (`[](Page)` is a link) covers pages. *Recommended:* the address as written, the one shown-text rule's address arm, with an emptied URL label staying empty on leave (`linkEdit.test.tsx:306`). Depends: F-116's two renderers and F-126's rule.
2. **Should a `§` run's menu in a property value or cell offer Open and Copy only?** A run has no link text to rename or remove, so authoring rows would do nothing (`linkEdit.ts:109-110`). *Recommended:* yes. Depends: F-118's `editable: !!hit.tk`.
3. **Should a heading link sort and filter as `Title § Heading` regardless of Heading Link Style?** W22 and the design say styled; styled costs the setting threaded through the view pipeline and the Matrix filter (≈ +10). *Recommended:* style-free, matching Remove Link and `linkValue.ts:144`'s "sort and filter must not move when a property's look changes"; under Heading Only, a filter for the page name also matches. Depends: F-126.

#### Calls for the Planner

- **F-127's shape:** the `value` kind (§6), the only shape meeting the owner's three criteria; recommend it.
- **Pommora's own keys** (`ID`, `banner`, `heading_icon_hidden`, `<Context>`, `$…`) never hold links, through `keyRefusal` (Scout 5 Q2).
- **A Text value's line holding only `![[Page]]`** is an embed line, out of the graph: standing ruling 4+5 says "any link alone on its own line with `!` first" (Scout 5 Q3).
- **A link to a heading on its own page counts as "pointed"** once the resolver answers the holder: the rule reads `resolveLink`'s own answer (Scout 4 Q2).
- **A paste inside a half-typed wikilink lands literally**, the same "a link still being written" rule asked of both syntaxes through `openLinkAt` (Scout 1 Q3).
- **Paste's baseline is the container before dispatch** (conflict 2); disclose it.
- **Paste As link-display forms inside a link** (`pasteLink.ts:67-68`) write through `pasteAsWrite` with no container, discarding a label whatever Remove Title says; bring them under `retarget`'s rule or state the exception with its reason.
- **`wikiTitle` lives in `linkValue.ts`**, since `linkValue.ts` imports `connections.ts` and the fold there would cycle.
- **Return in a markdown destination follows `aliasPickerOnCommit`**, as the post-pick stage does.
- **The heading-rename settle exempting the caret pane:** it settles on any `focusChanged` (`headingRenameSettle.ts:66`), focus into the alias rename field included, while the link settle exempts the caret pane; moving the file "unchanged" keeps the difference, which wants one line of reason or alignment.
- **`markdownLink` under `pageLinkText`:** the template and the writer are two layers; land the template with F-128 and the writer's signature once, with F-121/F-122.
- **A table cell's `|` in a markdown label** isn't escaped by `escapeLabel` (pre-existing at `rewrite.ts:70`; the fallback adds a path): a follow-up, outside W22.

### 10. Risks

- **Hot path:** `linkAt` is O(links × line) through `codeTouches` re-running `inlineSpans` per occurrence (`markdownCode.ts:213-224`); `isLiteralAt` becoming `linkAt ?? openLinkAt` is two parses on transform keys only. Inlining `connectionAt` into `linkTyping` without its `[[` gate adds a regex walk per keystroke on markdown-link lines; the fold removes the caller instead. F-118's `resolveLink` replaces `tokenTarget`'s allocations one for one, and D4(A) removes `c4`'s per-link `normalizeLinkUrl` from drawing. The `value` kind's filter runs per graph rebuild, not per keystroke.
- **Typing color lag:** under D1-A the color lingers one macrotask on a link just left, until the deferred `linkSettled` lands.
- **Drawing against following in held editors:** passing `own` to `linkLook` flips a held `[[#H]]` from `bare` to `Holder § H`.
- **Silent reorder:** `connectionText`'s argument swap compiles everywhere; four callers and `connections.test.ts:88,108-111` change meaning without an error.
- **D4(A)'s cache key:** `linkTitles` is keyed by the normalized url; every lookup and store must keep normalizing (`pasteLink.ts:57`, `pendingTitle.ts`, `useLinkTitle.ts`); `LinkCell.tsx:42` already passes a raw url *(unverified whether it misses today for scheme-less values)*.
- **F-129 inside the page settings dropdown:** whether a press on the caret pane counts as outside `PropertyPanel`'s dropdown is untested *(unverified)*; `TextPane` proves it inside a `PickerMenu`.
- **Sequencing collisions:** F-071's Fix writes `Guards/` as holding "the settle that carries a heading rename" (audit F-071), which W22's move to `Links/` makes false, so F-071's MarkdownPM sentence lands after or with the move; F-049 changes heading names in the file the settle moves from; F-066 and F-067 read the raw-HTML spans F-116's gate asks once; F-114 and F-118 both edit `editorHost.tsx`, `pageConnections.ts`, and `assignValue.ts` imports, so F-114 lands first.
- **Encoding before fallback:** the `#` escape in `encodeLinkTarget` must land before F-122 and F-125 write markdown fallbacks, or they write links to the wrong page.
- **Test-support churn:** `Core/Testing/editorHarness.ts` carries the `{ index }` shape and `location` into every editor test (`c4` touched 32 fixture files); a harness helper absorbs it only if none exists already.
- **The live drive:** group 1 is the only end-to-end check of Link-value alias memory, and F-129 breaks it; it's re-typed in F-129's change.
- **Runtime premise:** the TextPane and cell flush analysis rests on a removed focused element firing no blur (`EditableInput.tsx:89`), which no one has run; the flushes are required whichever way it falls.
