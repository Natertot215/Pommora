### 8 — Code-Block Parity

**DATE:** 11-05-2026
**SCOPE:** The mechanics of C-1 to C-7 on `b7f2f17a5`, read against the log as ratified, including the coordinator's ruling that rewrote C-3, C-5, and C-7 partway through this scout.
**RUN:** Every behavior below marked **Observed** was driven through a real mounted editor (`mountEditor`, the real keymaps, `inputHandler`, `applyEditorAction`, and a dispatched `contextmenu`) in a throwaway worktree, first at `b7f2f17a5` and again on the prototype. Nothing ran against the app. Cites are to `b7f2f17a5`, under `Core/MarkdownPM/` unless stated.
**PATCH:** `Scouts/Planning/Code-Block Parity Prototype.patch`, which applies clean to `b7f2f17a5`.

### The Shape of It

Two small readings carry nearly everything. **One:** a line in a Markdown block has its marker parsed from the fence's body, and a line in any other block has no marker. **Two:** the keys and rows take a line's lead from the fence when the line is fenced, rather than from its quote.

The first settles levels, numbering's start, `> - item`, and the whole of C-3 at once. The second settles Tab, Shift-Tab, Backspace, the shorthands, and where a row writes. The ruling also made the host contract untouched: no new field, no row logic, no change to `Actions/editorMenu.ts` or `Desktop/`.

**Delta:** production **+56 (+125 / -69)**, excluding comments. Comments **+5 (+9 / -4)** against the 3,511 cap.

| File | Code | Comments |
| --- | --- | --- |
| `Input/format.ts` | +53 / -34 | +3 / -1 |
| `Input/edits.ts` | +46 / -17 | +2 / -1 |
| `Engine/detect.ts` | +8 / -0 | +2 / -0 |
| `Engine/listModel.ts` | +6 / -2 | +1 / -1 |
| `Engine/docScan.ts` | +4 / -2 | none |
| `Input/listRenumber.ts` | +3 / -7 | +1 / -1 |
| `Input/formatState.ts` | +2 / -4 | none |
| `Input/markdownInput.ts` | +2 / -2 | none |
| `Menus/gripMenu.ts` | +1 / -1 | none |

**Why It's Positive:** every added line delivers a behavior the log requires and today's tree lacks: list levels past a fence's lead, a pick that writes in plain code, two shorthands, and rows that clear a diff sign. *Scouts/4*'s -3 for this same section priced none of those, and it predates the ruling. What leaves: four of the six `'outside'` reads, the deletion's read guard, both fence refusals in the inline rows, and a repeated fence test in `readFormatState`. The largest shares are `readLine`'s fenced branch and the two shorthands; the diff-sign work C-7 asks for (8-T22) is about ten lines.

**Tests:** 5 red, all conflicting with the log, **0 regressions** (8-T31). `Core/MarkdownPM` and `Core/Actions` read 2,256 passed and those 5 red. `tsc` is clean on `Core`, `Core/tsconfig.src.json`, and both `Desktop` projects, and Biome, `no-wrapped-comments`, and `no-name-mentions` are clean. The seeded scan properties pass with the generator's alphabet widened to Markdown fences (8-T30).

---

### Levels and Offsets

**8-T1 — Observed For Levels, Inferred For Numbering:** A list in a carried or indented Markdown block starts deep today. `indentLevel` (`Engine/detect.ts:523`) counts the whole leading indent, so `  - a` under a two-space fence reads level 1. In a run, `head.level > 0` (`Engine/listModel.ts:280`) then forces a count from 1, so `  5. a` loses its base on any recount. `MAX_NESTING_LEVEL` (`detect.ts:521`) would bite three levels early for a block carried at depth.

**8-T2 — Observed:** The fix is reading the marker from the body. `parseListMarker` already takes an `offset`, and `fenceBodyStart` (`detect.ts:153`) is the existing reading of where a fenced line's text begins, so `parseListMarker(line.slice(body), body)` returns a level measured from the body with `markerStart` still line-relative. On the prototype, `  5. a` under a two-space fence continues as `6.` then recounts `7.`; a Tab to the cap stops at three levels past the body (`  \t\t\t- a` refuses), and a fence carried six spaces deep under three items still takes a Tab. Every drawing path is untouched, since `pushConstruct` (`Engine/intents.ts:663`) parses for itself and a fenced line never reaches it.

**8-T3 — Inferred For The Failure, Observed For The Fix:** Today's `pfx` would eat or misplace the fence's indent once keys open. `indentListOnTab` (`Input/edits.ts:156`) writes its tab at `ls + pfx.length` where `pfx` is the quote alone, so under a two-space fence the tab would land before the indent and `fenceBodyStart`, which measures by length, would swallow it. `listLineAt` taking the fence's lead as `pfx` fixes Tab, Shift-Tab, and `takeMarker` together. On the prototype: Tab writes `  \t- a`, Shift-Tab on `  - a` changes nothing, Shift-Tab on `    - a` lands at `  - a`, and Backspace on an empty `  - ` cuts to `  `. Nothing reaches past the fence's indent.

**8-T4 — Observed, The Closer Inferred:** `rolesAgainst` needs the body too (`Engine/listModel.ts:84`). `continuesList` tests raw leading whitespace, so from inside a carried block a line at the block's left edge, `  text`, read as an indented continuation and today's pick switched the items either side of it as one list. A carried block's own `  ``` ` closer read the same way, which would have stretched the last item's sub-block over the closer. Reading the body makes both flush, so both end the list, with no rule for delimiters. Observed: `  - a` / `  text` / `  - b` now reads as two lists, as it does on a page.

**8-T5 — Observed, Accepted Edge:** A content line indented *less* than its fence absorbs Tabs, because `fenceBodyStart` takes the smaller of the two by length: `   ```md` over `- a` takes a Tab to `\t- a`, which still reads level 0. Tabs and spaces mixed between fence and content also read by length, so `\t```md` over `    - a` reads level 1. Enter still continues both correctly. Each is hand-typed only, and the drawn code already uses the same reading, so the list agrees with what's on screen. No code is warranted.

### The Keys

**8-T6 — Observed:** Inside a Markdown block every key now does what it does on a page, each from one reader change: `itemAt(k, k)` in place of `'outside'` at `Input/edits.ts:68`, `:240`, and `Input/listRenumber.ts:27`.

| Key | Result In A Markdown Block |
| --- | --- |
| Enter | `- a` continues, a checkbox continues unchecked, `→` and `A.` continue, and numbers recount (`1. a`/`2. b` to `1.`/`2.`/`3.`). |
| Shift-Enter | Breaks to a plain line at the fence's lead with no marker, through the existing `shiftEnterEdit` (`edits.ts:139`). No change needed. |
| Tab, Shift-Tab | Nest and outdent with the run recounting: `2. b` tabbed becomes `\t1. b` and the run below closes up, and back again. |
| Backspace | An empty item clears, a nested one keeps its indent as a continuation, and `12|. a` takes the whole marker, which answers *Scouts/4*'s 4-T54 by matching a page. |
| Deletion Recount | A removed line closes the gap (`1. a`/`3. c` reads `2. c`), carried or not, and the surrounding list's own recount still steps past the block. |

**8-T7 — Observed:** `smartBackspace`'s `inCodeAt` return (`edits.ts:236`) has to move below `takeMarker`, and it stays as the block's answer to everything past a list: quote and heading collapse remain off in all code. It moves rather than leaves.

**8-T8 — Observed:** Enter outside an item needs nothing. CodeMirror's default keeps a carried line's indent (`  text` to `  |`). Tab outside an item is swallowed in every code block, today and after, because `nest` always answers true (`Input/markdownInput.ts:69`), so a Tab in a `js` block writes nothing. That's existing behavior the log doesn't touch.

**8-T9 — Observed, Defect Found:** `continueBlockquoteOnEnter` (`edits.ts:96`) treats a `> x` line in a top-level fence as a quote, in every language: Enter writes `> ` on the next line. That contradicts C-1's "lists are the only Markdown such a block reads" and C-3's plain code. `scan.quotes` already holds the right answer (`Engine/docScan.ts`, where a top-level fence owns its bytes), so one gate fixes it, and a quoted fence keeps its prefix.

**8-T10 — Observed:** Delete at a line's end joins raw (`- a|` over `- b` reads `- a- b`), since nothing hides the marker. That's the one key that differs from a bullet on a page, and it follows from drawing no glyph, which C-1 allows.

### What the Block Reads

**8-T11 — Observed:** `> - item` in a top-level Markdown block isn't an item, because the body is `> - item` and no marker opens it. The log settles this: a quote isn't read there. Enter makes a plain line, and a pick writes `1. > - a`. Inside a quoted block, `> - a` is an item, since the `>` is the fence's own, and `> > - a` isn't.

**8-T12 — Observed:** A `` ```js `` sample inside a ```` ````md ```` block isn't a block to the scan, so its dash lines read as list items: Enter on `- a` inside it writes `- `. This is C-1 as written, since a nested fence is Markdown the block doesn't read. It costs little, because a flush `` ```js `` line ends any list above it, so the sample's lines are only reached by acting on them directly, and `- x` above the sample and `- y` below it stay unaffected by a pick inside. Pairing fences inside the block would be a second pairing pass, which *Editor Internals* forbids. Accept it.

**8-T13 — Observed:** C-4 holds through `codeFence` (`Engine/codeLangs.ts:65`) with no new reading: `md`, `markdown`, and `notes/a.md` read lists, and `md diff` doesn't, nor does a bare fence. The whole test is `f.name === 'Markdown' && f.tally === undefined`, which the patch names `readsListsIn` in `detect.ts`.

### The Shorthands

**8-T14 — Observed:** `canonicalizeCheckbox` (`edits.ts:261`) takes a raw string, so it can't tell any block from any other: today `-[] ` and `-[x] ` rewrite in `js`, which is F-1's defect. It takes the scan instead and stops when the fence doesn't read lists. On the prototype: `-[] ` stays literal in `js`; in `md` it writes `- [ ] `, indented lines included; `- -[] ` and `> -[] ` stay literal, the second because the lead is the fence's rather than the quote's. Its one caller and two test files change signature, as do `calloutShorthand`'s and `setHeading`'s, which is the patch's only test churn past the generator.

**8-T15 — Observed:** `dashArrow` (`edits.ts:808`) refuses at `isLiteralAt` (`:673`) in all code. A narrow arm ahead of that refusal handles `->` at a Markdown block line's start, `opensCodeList`, the block's analog of `opensLine` (`:695`), since `opensLine` reads the quote prefix and would fire on `> ->`. As on a page, the arrow fires whatever the Arrows setting reads, because it writes a marker. `x ->`, `- ->`, `<-`, and `--` all stay literal.

**8-T16 — Observed, Two Defects Found:** C-6's "other typing transforms stay off in code" isn't true today in two places. `calloutShorthand` (`edits.ts:114`) reads no fence, so `||` at a code line's start writes `> [!callout] ` in every language. The third-mark arm of `punctuation` (`edits.ts:769`) runs before its literal check, so `‼` then `!` rewrites to `!!!` in code. Both are closed in the patch. Every other typed transform was driven in `js` and `md` and stays off: ellipsis, equations, section sign, bullet, dashes, pairs, `[[`, `[^1]`.

### The Rows

The ruling removes the host question, so `EditorMenuRequest` keeps `block: 'code'` for both kinds of block and `editorContextItems` is unchanged. Observed: all six rows build in code (Insert Link, Lists, Insert, Format, Embed, Heading).

**8-T17 — Observed, How a Pick Tells Them Apart:** It doesn't ask. With no marker on a plain line, `listReach` (`Input/format.ts:302`) already answers correctly: `itemAt` gives no owners, so a caret reaches its own line and a range reaches each non-blank line, which is exactly "the lines it touches." Every reached line takes `setList`'s existing plain-line branch, and `listRenumber` finds no item, so nothing counts. **`listReach` needs no change.** Only `readLine` (`format.ts:277`) changes, to stop reading a fenced line as Markdown. Observed: `- foo` Numbered writes `1. - foo`; two lines write `1. foo`/`1. bar`; `    return x` writes `    1. return x`; a blank line writes `1. `; `- a` over `- b` touches only the clicked line.

**8-T18 — Inferred, A Constraint on Placement:** The other scout's marker placement has two requirements from here. It must parse from the body (8-T2), so a raw `scan.markers` with the test added in `readsFrom` can't deliver levels without a re-parse. And `readsFrom` must stay true for a plain line read from its own block. *Scouts/4*'s `readsFrom` line returns false there, so `outOfReach` would filter the pick and plain code would write nothing, which the ruling reverses. The patch puts the rule in `lineMarker`, feeding `scan.markers` (`Engine/docScan.ts:82`), and leaves `readsFrom`'s logic alone. An `itemAt` placement would satisfy both too.

**8-T19 — Observed, `outOfReach`:** It stays, gains no plain-fence case, and doesn't disappear. It's still what holds a pick from outside away from a block, and what keeps a fence's own lines and a callout's head out of reach. The patch names the delimiter test `fenceDelimiter`, since three sites now ask it.

**8-T20 — Observed, What the Check Marks Read:** Nothing but a Markdown block's list and the Code Block row. `list` reads null in plain code, because no line is an item; `heading` reads 0, since a heading isn't read in code; the inline flags stay false, because `underSelection` already tokenizes nothing on a fenced line (`format.ts:85`); `block` stays `'code'`, so Insert ▸ Code Block keeps its check and its take-off. In a Markdown block `list` reads the group as on a page. Paragraph reads checked in code, and picking it changes nothing, which is true of a paragraph anywhere. The consequence is that a second pick stacks rather than toggles: `1. 1. - foo`, and Bold over `**x**` writes `****x****`. See *§Questions*.

**8-T21 — Observed, The Inline Rows:** `toggleInline`'s refusal (`format.ts:114`) goes in two parts, because `inCodeAt` answers true on any fenced line. The fence half goes, and the inline-span half stays for prose only, so on a code line Bold writes even inside backticks: `` `foo` `` reads `` `**foo**` ``. `link:insert`'s refusal (`format.ts:174`) goes too. Observed writing in `js` and `md`: Bold, Inline Code, Text Color (`=🔴foo=`), Highlight, Connection (`[[foo]]`), External Link (`[foo]()`), and Insert Link. `toggleWrap` tokenized the line for itself, so Connection on `[[foo]]` in `js` unwrapped it while Bold stacked; it now takes the tokens `underSelection` already holds, so a link row writes `[[[[foo]]]]` like any other row, and prose still unwraps. Heading writes `## ` past the line's own indent and strips nothing, so `- foo` reads `## - foo`, in a Markdown block too, since Heading is no list behavior there.

**8-T22 — Observed, Diff Lines:** Each row now writes past the sign, through `signSeatAt`, which already answers where a diff line's code starts. `+foo` reads `+1. foo`, `+## foo`, `+> foo`, and `+> [!callout] foo`. A selection taking the sign reads `+**foo**`, because `editFor` clamps its range once, for every row. `+> foo` picked Blockquote toggles off to `+foo`. `- foo` in `md diff` reads `- 1. foo`, so F-1's overwritten sign closes. An `@@` header has no sign, so a pick there writes `- @@ -1 +1 @@`, which is C-7's "after the line's sign" with no sign to step past.

**8-T23 — Observed, Insert ▸ As Today:** Unchanged off a diff line. Blockquote writes `> foo`; Callout writes `> [!callout] foo`, stripping `- ` from `- foo`, as it does today; Code Block takes the fence off; Table and Rule write inside the block; Internal Page and External Link write `![[]]` and `![]()` *below* the block, since `insertEmbedToken` seats past it. Footnote's row never shows in code, as `citationSeatAt` (`Citations/citationActions.ts:38`) reads false there, and Paste As's embed row is off too, as `embedSeatAt` (`Embeds/embedInsert.ts:37`) reads false.

**8-T24 — Observed, The Language Rename Inferred:** Rows that write at a line's start break a fence if they touch its delimiters. Heading on a selection from prose into code wrote `## ```js` and destroyed the block, and Bold on the word `js` in an opener would rename the language. The patch refuses both on delimiter lines alone: `selectedLines` skips them, and `toggleInline` stands down there, while a selection crossing in still writes `## code` on the code line. That's narrower than the ruling's letter, and it's in *§Questions*.

**8-T25 — Observed, A Cell Holding Fence Shapes:** `readFormatState` and `underSelection` read `scan.fences` with no scope, though a cell draws no fence (*Editor Internals*, "A cell's document model is page-shaped"). A cell whose lines read ```` ``` ````, `**b**`, ```` ``` ```` reports `block: 'code'` and no Bold. Today its ⌘B refuses by the same fence test; with the refusal gone the patch writes there, and a second press would stack. The rows are safe, since `block` is read only in the page's arm. Two more readers share the gap: `opensCodeList` asks with `'page'` and `editFor`'s `signSeatAt` clamp takes no scope, so a cell holding `` ```md `` or `` ```diff `` lines is read as a block by both. Passing `scope` through those four sites fixes the class for an estimated +5 lines, and it isn't in the patch. The *One Scan Per Scope* prospect would remove it outright.

### Reach

**8-T26 — Observed, C-2:** Holds with no change to `listReach`. A pick on the surrounding list leaves the block's lines alone, by caret and by selection: `|1. a` … `2. c|` switches `a` and `c` and leaves the carried `1. b`. A pick wholly inside, fence lines included, acts on the block's own list. The block's run keeps counting apart from the list around it.

**8-T27 — Observed, A Pick From Inside Reaching Out:** A selection from inside a carried block out to the next item leaves the block alone and switches the item carrying it plus the items it touches: `- b|` in the block through `- c|` turns `- a` and `- c` Numbered. The block's lines answer for the item they ride, which is what a continuation does elsewhere. From a top-level block, only the lines outside change.

**8-T28 — Observed, The Glyph-Less Right-Click:** Works through `routeRightClick` (`Menus/menu.ts:50`) as a caret does: right-clicking `- b` in a `md` block reports `list: 'bullet'`, and Numbered writes `1. a`/`2. b`. The same click in `js` reports null and writes `1. - b` on that line alone.

**8-T29 — Inferred, D-5:** Needs nothing block-specific. Today a one-line selection in a block switches that item alone, as on a page, and D-5's rule lands in `listReach`, which the block shares. The `/` menu stays closed through `inSealedLine` (`Menus/blockQuery.ts:19`), and the grip is untouched.

### What Stays Plain

Every path by which list logic reaches a plain code line, for C-3 as ratified:

| Path | Today | After |
| --- | --- | --- |
| `listReach` / `setList` (`format.ts:302`, `:364`) | Reads items, groups, nesting in any language. | Writes a marker on the lines touched, by ruling. Reads no item. |
| `listKindOf` / the Lists check (`format.ts:350`) | Reads a kind in any language. | Null. |
| `listRenumber`, marker-writing arm (`listRenumber.ts:27`, `:42`) | Counts in any language. | Finds no item. |
| `listRenumber`, deletion arm (`:27`, `:49`) | Off, through `'outside'` and `readsFrom`. | Off, since no item stands there. The guard leaves. |
| `renumberRuns` / `runAt` (`listModel.ts:235`, `:255`) | Reached by the two above. | Finds no item. |
| `canonicalizeCheckbox` (`edits.ts:261`) | **Writes in any language.** | Off. |
| `continueListOnEnter`, Tab, Shift-Tab, `smartBackspace` (`edits.ts:68`, `:240`) | Off, through `'outside'`. | Off, since no item stands there. |
| `dashArrow`'s line-start arm (`edits.ts:808`) | Off, through `isLiteralAt`. | Off. |
| `checkboxToggleChange`, `subBlockAt`, `collectBoundaries` (`Gestures/listDrag.ts`) | Glyph presses only, and no glyph draws. | Unchanged. |
| `tablePasteGuard` (`Guards/tableGuard.ts:39`) | **Refuses a table paste onto a list-shaped code line.** | Reads no marker there, so the paste lands as text. |
| `blockModel`'s `isMarker` | Reads only a block's opener, never a code line. | Unchanged. |
| `readLine`, `stripInnerMarkers` (`format.ts:277`) | **A pick strips `- ` and `# `.** | Strips nothing on a fenced line. |
| Insert ▸ Callout (`format.ts:431`) | Strips a list marker from a code line. | Unchanged, by C-7. |
| `Tables/codec.ts:25`, `citationEntries`, `subfieldStats` | Fenced lines excluded or unrelated. | Unchanged. |

### Scan and Tests

**8-T30 — Observed:** `markers` now depends on `fences`, so per *Editor Internals* the construct joins the generator's alphabet in the same change. The patch adds seven lines (`` ```md ``, `` ```notes.md ``, `` ```md diff ``, `` ␣␣```md ``, `> ```md `, `  - in`, `> - in`) to `Engine/docScan.test.ts`, and `rescan` still equals `scanDoc` across the seeded properties. No resync rule changed, since a window computes `markers` from the same `fences` it splices.

**8-T31 — Observed, The Red Tests:** Five, none a regression, each per A-4:

| Test | Conflicts With | What To Do |
| --- | --- | --- |
| `Input/format.test.ts:98` Insert Link stands down on a fenced line | C-5 | Leaves. |
| `Input/format.test.ts:147` stands down on a fenced line, and inside inline code | C-5, its first assertion only | Keep the inline-code half, whose assertions still hold. |
| `Input/formatKeymap.test.ts:38` claims its chord on a fenced line | C-5, if the chord follows the row | Leaves, or stands if Question 2 goes the other way. |
| `Input/listRenumber.test.ts:168` counts within the block | C-3 | Re-aim at `` ```md ``, which was run and passes. |
| `Input/listRenumber.test.ts:174` a pick wholly inside a code block | C-3 | Re-aim at `` ```md ``, which was run and passes unchanged in every assertion. |

A full-suite run during this scout showed eleven more reds in `citationBreakage`, `embedAbsorb`, and `codeDiff`. All 70 tests in those three files pass alone and in the touched-suites run. The machine sat at load 34 with other scouts' suites running, so those were timeouts under contention, and a task's gate should be run on a quiet machine.

**8-T32 — Inferred, Interactions With The Rest Of The Work:** B-5 retires `continuesList`'s `'blank'` answer, after which its depth argument only trims a prefix, and 8-T4's two-armed call collapses to one. D-2's grip pick runs through `listReach`, so it inherits C-2. `'outside'` keeps two readers, `firstItemOf` (`Menus/gripMenu.ts:63`) and `listReach`'s crossing case, so `Reader` stays. Section G needs care only if the pane reads `scan.fences`, which 8-T25 covers.

**8-T33 — Inferred, Docs:** *Editor Internals*'s numbering entry ("A code block is read only from inside it…") and *Features/MarkdownPM.md*'s scope line ("none applying inside a fence pair") and right-click section need rewriting to match. The drives' code-block items change with A-6.

---

### Questions for Nathan

**1. Should a row picked twice in code undo itself or write again?** On a page, Bold on bold text removes it. The ruling says a row in code is unaware of what's there, so picking Bold twice writes `****word****`, and Numbered twice writes `1. 1. - foo`. The alternative is that Bold alone notices its own marks and toggles off, while lists keep stacking. **My call:** write again. Nothing in code gets read but a Markdown block's own list, so every row in code behaves the same way and the check marks stay honest by staying blank. Undo removes a mistaken pick.

**2. Should ⌘B do what the Bold row does in code?** Today ⌘B does nothing in a code block. The shortcut and the row run the same action, so the ruling turns ⌘B on too. That means a stray ⌘B while writing code now writes asterisks into it, and that ⌘B writes while ⌘8, a typing shortcut that stays off, doesn't. **My call:** let it write. Keeping it silent would need a second path telling a shortcut from a row, and the log asks for one way of doing each thing.

**3. If a selection starts in normal text and runs through a plain code block, should a list pick write into the code?** The ruling says a pick writes on the lines it touches. For a Markdown block, C-2 says a crossing selection leaves it alone. Taken literally, selecting a numbered list that holds a code sample and picking Bulleted would put `- ` on every line of the sample. Heading and Bold are a different case today: from a crossing selection they do write into the code, since they have no reach rule at all. **My call:** list picks leave the code alone, as the prototype does, so both kinds of block follow one list rule, while Heading and Bold keep writing, as the ruling says rows do. If you'd rather a crossing selection skip code for every row, that's about two more lines.

**4. Should rows refuse on the ```` ```js ```` lines themselves?** Those lines hold the block rather than its code. Today, Heading on one destroys the block, and with the refusal gone Bold on the word `js` would rename its language. The prototype refuses Heading, Bold, and the other inline rows on those two lines, and list picks already refuse there. **My call:** keep the refusal. It's narrower than "every row writes", but it writes into the block's frame rather than its code, and the result is a broken block.
