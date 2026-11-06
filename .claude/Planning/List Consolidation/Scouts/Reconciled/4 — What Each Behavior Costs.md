### 4 — What Each Behavior Costs

**DATE:** 11-06-2026
**COMMIT:** `b7f2f17a5`
**RECONCILED FROM:** `Scouts/4 — What Each Behavior Costs.md`

Each price below is a behavior removed alone in a throwaway worktree, measured, and restored, in production lines excluding comments and blanks. Prices were cut from `b7f2f17a5` before the log was ratified, so a price measures that cut alone and doesn't stack with the patches in *Engine Reconciliation*. Only what still informs a choice stays here.

**Confirmed During Reconciliation:** the kept start through a drag and the diff block's overwrite reproduced on `b7f2f17a5`, and `citationBreakage` and `embedAbsorb`, its suite-load flakes, pass in the full suite on the stack. The individual prices weren't re-measured.

#### The Prices That Still Stand

| ID | Behavior | Lines | What Leaves | Reds | Standing |
|---|---|---|---|---|---|
| 4-T2 | **Ruled:** `+` is a bullet, `- [] x` is a bullet, no box after an ordinal | -92 +56 (**-36**) | `drawnKind`, `listGlyphOf`, `ListGlyph`, the `bullet` field, the bullet's `box`, `Box.inner`, the cell's `{ lm, glyph }` wrapper | 9: 6 pin the old reading, 3 mechanism | The one price for B-1 to B-3, which no patch delivers. Its 13 lines of `listMarkerText` moving to `detect.ts` already sit in *Numbering and Edges*, and it predates B-2's no-space ruling |
| 4-T17 | Tabs and spaces read by drawn depth | -2 +2 (**0**) | Nothing | 1 pin | Stays, with nothing to save |
| 4-T22 | Outliner rails reading quote depth | -30 +8 (**-22**) | `quoteDepths` from the cached line facts and `railIntents` | 1 pin | Stays: no decision takes it, and a quoted rail stays correct |
| 4-T23 | Backspace keeping a marker's indent under an owning item | -12 +4 (**-8**) | The owner check and 2 `takeMarker` parameters | 2: 1 pin, 1 mechanism | Stays |
| 4-T24 | A glyph click inside a selection acts on the selection | -6 +4 (**-2**) | The `glyph` parameter of `clickInside` | 2, both pin | D-2 says a glyph acts on its group, so this branch leaves with E-7's right-click work |
| 4-T25 | The nesting cap at three levels | -4 +2 (**-2**) | `MAX_NESTING_LEVEL` | 3, all pin | Stays |

**4-T2's Figure:** 13 lines in each column are `listMarkerText`'s move, which puts the real churn near -79 +43 at the same net. It conflicts with the stack in 14 hunks across 6 files, so it's a price and a guide rather than a patch to land.

#### Shared Machinery

- **4-T30 — What A Marker Is:** The two readings in 4-T2 only pay off together. With both gone, `drawnKind(lm)` equals `lm.kind`, and `listGlyphOf` has nothing left to return null for.

#### What Couldn't Be Priced

- **4-T33 — Drawn Depth:** This is a rule rather than machinery, because `indentLevel` stays for drawing and for Tab. 4-T17 is the cheapest stand-in, and its net of 0 shows there's nothing to save.
- **4-T34 — The Right-Click's Lists Submenu:** It's built from the block menu's rows, which the `/` pane needs either way.
- **4-T38 — Coverage:** Lint didn't run for the prices, and neither did `Sync`'s or the dashboard's typecheck.

#### What Stands From the Cost Reading

- **4-T43 — The Recount Below:** A plain Tab or a deleted item must close the gap it leaves, or a list reads `1, 3`. B-10 keeps this, and the whole-list recount delivers it.
- **4-T44 — The Kept Start:** Always counting from 1 rewrites text in the user's own files, and a list resumed at `3.` after a paragraph is written that way on purpose. B-10 keeps the start.
- **4-T46 — The Resting Cell:** It's the largest single machinery on the list at -116, and raw `- a` in every table would be the most visible regression. G-3 and E-1 lean on it.
- **4-T47 — Leave Alone:** 4-T17, 4-T23, and 4-T25 are too small to spend a decision on.
- **4-T49 — A Live Defect (Observed):** On `b7f2f17a5` a pick inside a diff block overwrites the sign: `- removed` becomes `1. removed`, and `+ added` becomes `- [ ] added`. F-1 names it, and the parity step closes it, testing `tally` rather than `signedLine`, because `signedLine` misses a diff's unsigned lines.

---

#### Dropped Findings

| Finding | Why |
|---|---|
| 4-T1, 4-T48 | Superseded: *Scouts/8* priced the ruled C section at +56 on its own, including the writes and shorthands 4-T1 didn't |
| 4-T3, 4-T4, 4-T41, 4-T51 | D-4 rules it, and *Numbering and Edges* delivers it |
| 4-T5, 4-T6, 4-T7, 4-T27, 4-T37 | B-10 keeps the recount and the start, and *9-T14* and *9-T17* rebuild them; 4-T7's broken drag is the bare first-item rule, which *9-T18* repairs |
| 4-T8, 4-T9, 4-T10, 4-T28, 4-T29, 4-T39 | D-1 keeps Preserve List-Level Formatting |
| 4-T11, 4-T12, 4-T13, 4-T14, 4-T31, 4-T35 | B-6 and B-10 keep them |
| 4-T15, 4-T16, 4-T45 | B-5 reverses the loose reading, and the numbering step measures the real removal; `Slot.line` stays (*9-T5*) |
| 4-T18, 4-T19, 4-T40 | D-2 and D-3 keep the grip's menu and the glyph's menu |
| 4-T20, 4-T21 | G-3 and E-1 keep the resting cell's drawing and menu |
| 4-T26, 4-T36 | B-10 keeps the filter |
| 4-T32 | `Reader` leaves whole with masking |
| 4-T42 | Its stance withdrawn with 4-T22's standing |
| 4-T50 | B-5 closes the seam between `blockAt` and `siblingsAt` |
| 4-T52 | B-2 |
| 4-T53 | B-4 and B-2: Enter writes `-`, and `+[]` writes `- [ ] ` |
| 4-T54 | *8-T6*: `12|. a` takes the whole marker, as on a page |
| *My Stance* | D-1 and D-2 overrule its Preserve and grip cuts, and D-4 takes the restart |
| *§Patches* | Only 4-T2's survives a reader's interest, and it sits in the session scratchpad as `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/plus-and-empty-box.patch` |
