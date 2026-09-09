## Handoff — Pommora

> **User Prompt:** Execute `.claude/Planning/Menu System — Implementation Plan.md` once ratified: orchestrate only, Opus agents implement and run gates, one writer on the tree, every gate simplify → review → fix, Gate 1 a declared stop. Through the run: no comments from any agent; MarkdownPM never imports the store; attended sessions get a manual check list instead of a CDP smoke launch; when done, delete the plan from disk, scrub audit topic 5 from the report and the published artifact as if it never existed, write a grounding document for a MarkdownPM slash-command menu on the door, and close out in the codemap format.

#### Current Focus

**Dates:** 09-08-2026
**Model:** Fable 5.1 supervising, Opus 4.8 implementing

**The menu system has one door.** `popMenu(items, trigger?, { solid, stay, compact })` in `Core/Actions/menuActions.ts` is the only way a menu opens: no trigger means the operating system's menu at the cursor, a trigger means the Use Native Menus preference decides between a system menu anchored under the control and `MenuPresenter`, the one in-app renderer. Both renderers draw from one `ActionItem` tree, and `Desktop/Actions/menu.test.ts` deep-equals their projections from one fixture. The tile handle menu is one model, `tileHandleMenu.ts`, with its 413-line hand-built pane gone; `PickerControl` opens through `MenuDoorContext`; the connection menu model sits in `Core/Actions` with its siblings. Every keyboard chord is a row in `Core/Actions/commands.ts`, read by the native menu at `refreshMenu`, by the editor through its host's `settings().commands` behind a Compartment, and by every renderer handler; `readCommands` keeps only known ids and drops chords it cannot spell. Escape has one arbiter: six window listeners joined the dismissal stack through `pushEscape` and `useEscape`, each pinned glance holds its own entry, and a press on an open menu's own trigger closes it. The grip-hot stand-down chain is gone; the renderer's `preventDefault` on `contextmenu` was always what withheld main's menu.

**Fourteen rulings landed during the run.** Nathan's stop at Gate 1 restored `solid` for the three window-set pickers, gave the tile menu its five root glyphs and the deleted pane's 120 floor and 180 cap, then in later passes made Lock, Style, and Scale stay rows that redraw the pane in place, put the lock glyph on Lock, returned picker lists to their natural width through `compact`, made a press on an open menu's trigger close it while keeping an outside click's click-through, kept the three untriggered click menus native, made the cell editor's format chords live, and had a right-click on a resting table cell activate it. Escape order is open order; focus never reorders it.

**What the reviews were worth.** Four gates and a closeout pass ran simplify → review → fix; the finds were mostly real. Gate 1: the door resolved nothing on an empty list where the native popper returned null, both projections disagreed on a checked row with a submenu, and `PickerRow` had no disabled state. Gate 3: every pinned glance shared one Escape entry pushed on the first pin, so a pin opened after a window was never the layer Escape closed. Gate 4: a modifier-only chord in settings killed its shortcut silently. The closeout attack found the settings row claiming a wider reach than the code has, which Nathan settled by narrowing the row, and three pre-plan chord literals in the cell editor, now derived from CodeMirror's own history keymap.

#### Completion Criteria

- [x] Every menu opens through `popMenu`; `popRowMenu`, `RowMenuHost`, `rowMenuRows`, `NativePickerContext`, `useNativeMenus`, the tile pane and its stylesheet, `accelerators.ts`, `FORMAT_CHORDS`, and the grip-hot chain sweep to zero against a control of 107 `ActionItem` hits.
- [x] One parity test proves the native template and the presenter rows agree, including checked with submenu, checked with disabled, and stay.
- [x] Every chord is a table row; no chord literal outside `commands.ts`; `chords.ts` is the engine graph's fourth UIX file.
- [x] MarkdownPM imports nothing from `Core/Session/store`; the editor's chords ride `EditorHost.settings().commands`.
- [x] Gates green at every commit: typecheck 0, lint 0, 358 files / 4317 tests at close.
- [x] Nathan's own pass at Gate 1 and after Phases 2 and 3: the tile menu, the pickers, the grip right-clicks, and the Escape order behave as described.
- [x] Audit topic 5 and R-21 to R-24 removed from the report and the published artifact; Context and the Features docs describe the door.
- [ ] Nathan's live pass on the closeout fold: a right-click on a resting table cell activates it, a rebind reaches an open cell editor on the table's next render, and ⌘N / ⌘B still fire after a full dev-process restart.

#### Next Session

- **The system menu's Format rows still act on the page editor, not a focused cell.** `host.menus.format.onAction` has one reader, `MarkdownEditor`; routing the action to whichever view holds focus, with a `pushState` from the cell so the menu's checkmarks follow it, is the piece that finishes "a right-click into a cell targets it." Recorded under Known Issues.
- **A press on a second picker while one list is open reopens inside the first's bloom-out.** Closing it costs the click-through Ruling 14 keeps. Recorded under Known Issues.
- **Escape follows open order and the stack cannot re-insert.** Raise-on-click for floating windows and a pinned glance's entry surviving a tab round-trip both need an open-sequence number on stack entries. Recorded under Open Calls.
- **The slash-command menu** has its grounding in `// Planning`'s `Slash Command Menu — Grounding.md`: the door needs to accept a `MenuAnchor` rect where it accepts an element, the editor reaches it through a new `EditorHost.menus.slash`, and the model sits in `Core/Actions`.
- **A Shortcuts settings pane** over the one table, with the named-key map and the duplicate-chord rule it needs. Recorded under Next-Feature Candidates.

#### Feedback

- "Tell the Opus agents not to add comments." Every implementer brief carries it; the plan's `//` lines are notes to the agent, not code to write.
- "The store import thing shouldn't happen." MarkdownPM reaches app state only through `EditorHost`; saved to memory.
- "Why is the agent smoke testing? Is this something I can do manually?" The agent smoke launch is the unattended default; an attended session gets a numbered check list. Saved to memory.
- "Keep the click-through, and make sure this also removes any of the grip menu's ad-hoc reconciliation of that exact behavior, if it exists." None existed; the stack's `suppressReleaseClick` was already the one writer.
- "YAGNI" on a setting for right-click dismissal: a right-click outside an in-app surface closes nothing, an outside left-click closes the whole stack, no preference.

#### Session Pointers

- The plan is deleted; its rulings, deviations, and lessons live in this Handoff, in Context, and in the commits `39e8d9439..c1fcce94b` filtered by the Fable trailer. No History entry by ruling.
- Two arcs interleave on `main`: this one and Nathan's own MarkdownPM class-vocabulary, glance, and audit-ledger work. A whole-range diff credits this arc with the other's; the codemap in the closeout report was built per commit from this session's 31 commits alone.
- Task 6's commit `1b6c552e7` carried two of Nathan's `md-bq` → `md-blockquote` hunks because they sat in the same files; that one commit alone draws no blockquote grip. The tree is consistent.
- The audit artifact was republished by the parallel session twice between this session's reads and its publish; the final scrub was reapplied onto the newest version and published from a merged copy.

#### Working Notes

- **A press on a menu's own trigger never closed it before this plan either.** The shield sits above every trigger and the stack held the trigger's entry to avoid flicker; the toggle is new behavior, not a restoration. Three reviewers assumed the opposite before one tested it at the base commit.
- **The stack's `layer: () => null` never holds a target.** Every press is outside it; `outsidePress: false` is the whole protection. Two briefs had the two roles swapped.
- **`--only` on a shared index carries the other session's hunks in a shared file.** The rule is to bundle them; the cost is one commit whose own tree is inconsistent. Say so in the commit's Lesson and move on.
- **A stay handler must return rows in the same count and order.** The presenter identifies the open branch by row index; `tileHandleMenu.ts` satisfies it only because `drill()` runs before the `off` check.
- **`historyKeymap`'s third binding has no `key`** (it is `linux: 'Ctrl-Shift-z'`), and mac redo lives on the second's `mac` field; derive bindings by spreading the whole entry, never by reading `key`.
