### Build Log

The record of the phase build. The branches and worktrees it names were scratch and left when planning closed, so the patches beside this file are what stands.

**Order:** the Investigation's eleven phases with a Phase 0 for the drives. The key merge stays at Phase 6: the end tree is the same wherever it lands, a cell's scan holds no fences after Phase 1, and Phase 2's step touches the shared transforms rather than either keymap, so Scout 6's concern was churn rather than correctness. The arrow's fold moves into Phase 5 so `parseListMarker`'s groups are set once.

| Phase | Commit | Gates | Actionable (cumulative) | Comments | Notes |
|---|---|---|---|---|---|
| 8 (on `a37d2d7b2`, awaiting rebase) | `c79848d44` on `lc-word` | Green but the five known reds | -47 (+19 / -66) own | ±0 own | `Prec.high(contractions)`, since `markdown()` mounts first and a language fence's `wordChars` would otherwise answer first. New departure for *§Behavior Changes*: in a language fence a gesture reaching a contraction drops that language's word characters (`$a's` in JS reads `a's`). Accepted: E-5 says every word gesture. |
| 5 (on `a37d2d7b2`, awaiting rebase) | `ee21a3d4f` on `lc-grammar` | Green but the five known reds | -41 (+40 / -81) own | -4 own, reads 3,511 | Arrow folded into the regex here; Phase 7's rows for it leave. `→ a` holding a control character stops reading as an item, as every other kind already did. |
| 6 (on `ee21a3d4f`, awaiting rebase) | `e978c9c1c`, `6e92fd3d1` on `lc-grammar` | Green but the five known reds | -28 (+90 / -118) own | -1 own, reads 3,510 | `'lists'`, `'inline'`, and one `listKeys`. A pane's Backspace on an empty first line takes the break from here (accepted; Phase 10 brings it anyway). A cell's list keys scroll the caret into view. |
| 1 | `fe4eecd7c` | typecheck, lint green; 9,127 of 9,129 pass, 2 skipped, with one load timeout passing alone | -85 (+505 / -590) | 3,512 | `68aa474bc` landed, six cell pins added, `detect.ts:508`'s false sentence and `pastedCellText`'s page scan fixed |
| 2 | `e238998dd` | typecheck, lint green; 9,129 of 9,131 pass, 2 skipped, with load timeouts here that `b7f2f17a5` shows more of, and clean full runs at the three commits above it | -21 (+625 / -646) | 3,515 | `f0d5f60c5`'s step landed, *8-T31*'s five handled by A-4, four ` ```md ` pins added |
| 3a | `9ed06416d` | Green, clean: 9,129 passed, 2 skipped | -21 (+723 / -744) | 3,515 | The pure move to `Engine/blockMove.ts`, `leadOf` to `quoteAndIndent` |
| 3b | `61e78ecc5` | Green, clean: 9,129 passed, 2 skipped | -22 (+723 / -745) | 3,514 | The stale-drop compare; no pin, since jsdom draws no slots |
| 3c | `db5378a37` | Green, clean: 9,152 passed, 2 skipped | -108 (+777 / -885) | 3,514 | The stack's remainder without paste; `dropChanges`' lost scope fixed and pinned |
| 4 | `cb1619ba7` | typecheck, lint green; 9,159 of 9,161 pass, 2 skipped, with one load timeout passing alone | -107 (+778 / -885) | 3,514 | *9-T27*'s four edits, paste's tests, one assertion for `toB`; six patches replay to this head exactly |
| 9 (on `a37d2d7b2`, awaiting rebase) | `4fb5a41c8`, `c90db450e`, `023e26f3e`, `659db8beb`, `89c0afef0` on `lc-click` | Green but the five known reds | -1 (+182 / -183) own | -2 own | Both live questions answered: `::highlight()` paints, so no fallback; a press left of a glyph did seat at the line's start, fixed in a fifth commit. New behavior row: a left press left of a bullet or box seats at the content. The bubble stop sits on `MarkdownEditor`'s shell, since a glance sits under the same layer as the info pane. |
| 5 (stacked) | `e332c47fb` on `lc-plan` | All green, 9,164 passed | -148 (+813 / -961) | 3,510 | Clean cherry-pick. |
| 6 (stacked) | `7d3c3b469`, `25f901832` | Green but load timeouts in `citationBreakage` and `embedAbsorb`, passing alone | -176 (+885 / -1061) | 3,509 | Rename's new pins follow `'lists'`; `detect.ts`' scope comment names what each scope reads. |
| 7 (stacked) | `fd93f0669`, `d240d90ae`, `f846d8960`, `ef34ef64f` | Typecheck clean; full gates pending | see Phase 8 | | -52 own. Two tables: `LIST_TYPES` (marker, rail) in the engine and `LIST_KINDS` (wording, icon) in Actions, since menu copy doesn't belong in the grammar the host embeds. `/task`, `/bullet list`, and `/numbered list` stop matching, by D-6, for the morning report. |
| 8 (stacked) | `c0da89b74` | Typecheck clean; full gates pending | -275 (+947 / -1222) | 3,508 | `type Command` stays imported for Phase 6's `seated`. |
| 2's pins | `0f4161b92` on `lc-pins`, on `e238998dd` | Test files green | +2 production lines | 0 | Fourteen pins for C-5 to C-7, and Blockquote and Callout refuse a lone delimiter line as every other row does (a selection across a whole block still quotes it). The stack is rebuilt on this commit once Phases 9 and 10 land. Accepted: `->  removed`'s double space, since the sign survives as C-7 asks and a blockquote on a diff line reads as what it is. |
| Drives | `lc-drive`: frame, groups 1 to 5 | 245 of 246 at Phase 6's head | n/a | n/a | The one red was `1. x\n` pasted at an item's start. Ruled not a defect: `MarkdownPM.md:32` states a paste lands without the whitespace at its own edges, so it's a one-line paste by design. The item re-aims at a two-line paste, and one item pins the one-line join. |
| 7, 8 gates | `c0da89b74` | All green, 9,177 passed, 550 files | | | Full run clean at low load. |
| 9 (stacked) | `3dd8f1ee9`, `068db3df6`, `d29682ca5`, `ac160451c`, `5f48aab88` | All green, 9,183 passed | See below | 3,506 | `editorMenu` became a plain extension reading `scan.scope`. Both live answers held on the rebased tree. |
| 10 (on `6e92fd3d1`, awaiting rebase) | `29f3cc040`, `0e2778623`, `2b2213a27`, `eb30e0721` on `lc-text` | Green but the five known reds | +23 (+76 / -53) own | 0 own | Live probe proved the pane's glyph, grip, rails, drags, menus, Preserve, resting `• milk…`, and the YAML shape. Screenshots caught `☑bought…` on Standard cards, fixed by `text-align: start` on the seat. |
| Drives | `lc-drive`: groups 1 to 8 | 447 of 447 at `c0da89b74` | n/a | n/a | No app defects. Row 33 corrected: Delete at an item's end joins raw on every surface, so it isn't a code-block difference. F-2's unit pin dispatches `1. x\n`, an input the app's paste can't deliver; re-aim at a two-line paste. |

**Final State:** the production stack closed on `lc-w3`, head `18b7ea4cc`, one commit per task, with Waves One, Two, and Three folded. Its 23 patches and Phase 11's sit beside this file, with the drive patches from `lc-drive2`, head `29b3a2feb`, and the docs from `lc-docs4`, head `0cc3d3fc3`. All green: 9,219 passed, 2 skipped, 550 files. Actionable -286 (+1465 / -1751). Comments 3,508.

| Phase Head | Comments | Actionable | Tests |
|---|---|---|---|
| 1 `98becb14b` | 3,512 | -108 (+687 / -795) | +44 |
| 2 `c85eb6cd2` | 3,515 | -39 (+838 / -877) | +175 |
| 3 `018cb5f4f` | 3,515 | -126 (+1000 / -1126) | +410 |
| 4 `1ea13c25e` | 3,515 | -124 (+1002 / -1126) | +460 |
| 5 `b36d3177b` | 3,511 | -173 (+1040 / -1213) | +522 |
| 6 `e9674162f` | 3,510 | -201 (+1108 / -1309) | +536 |
| 7 `9e657f17e` | 3,509 | -260 (+1153 / -1413) | +580 |
| 8 `65b3ae617` | 3,509 | -307 (+1172 / -1479) | +634 |
| 9 `f6a937fe5` | 3,507 | -308 (+1386 / -1694) | +738 |
| 10 `18b7ea4cc` | 3,508 | -286 (+1465 / -1751) | +902 |

**Drives:** every run and its head sit in *Drives — Notes*.
