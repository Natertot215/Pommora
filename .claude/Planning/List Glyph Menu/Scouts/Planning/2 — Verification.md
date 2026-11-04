### 2 — Verification — Planning Report

**BASE:** `cd813afdd`

Every live claim comes from a built worktree of `cd813afdd` (`Pommora-LGM-B`, from `editor-parity/worktree.sh`) launched through `drive-harness.mjs` on debug port 9481 with its own userData and a scratch copy of `~/Test` (the run's `HOME` pointed at a scratch folder, so the real `~/Test` was never opened). The probe's harness copy recorded each Chromium `context-menu` event's `isEditable` and `selectionText` from main, and each menu row's `checked`. Logs and shots sit in the session scratchpad: `…/scratchpad/probe.log`, `…/scratchpad/probe2.log`, `…/scratchpad/shots/probe/`, `…/scratchpad/shots/probe2/` (the scratchpad is `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/e5eec1fe-e04b-4212-9010-3f98def4b533/scratchpad`). The window ran at zoom 0.90 (harness `zoom`) with the default Editor Scale, the editor's text at 15px; every pixel figure below is a CSS pixel.

#### Live Checks

P2-L1. **Does a right-click on an unselected word leave it selected by the time the reply would land, and where does a caret elsewhere go?** → **Observed** (`probe.log` keys `q1.*`; shots `shots/probe/02-q1-elsewhere.png` to `06-q1-blurred.png`): yes, and `Core/MarkdownPM/Menus/menu.ts:32`'s comment holds. With the caret parked on another line (pos 163, line 21), the editor's selection is unchanged at `mousedown`, at the `contextmenu` capture phase, and after `editorMenu`'s bubble (DOM selection still empty there too); when main's `context-menu` event arrives the DOM already holds the word (`selectionText: "several"`) while CodeMirror's state still reads 163; by 300 ms and still at 1.5 s the state is the word, 21–28 on line 1. So the caret leaves its old line entirely and the clicked word becomes the selection. The same holds with the caret already inside the word (23 → 21–28), on an item's text (`→ arrow one`: 163 → `arrow`, 123–128), and on a blurred editor (focus returns and the word is selected). Inside a prior selection the selection survives untouched (`with several words`, 16–34). **Implies:** a reply reading the live selection always sees a one-word range on an unselected right-click, so C-2 can only hold if the click-time range (`menu.ts:33-36`) is what the list rows act on, as Scouts 1-C5 and 2-C4 said; the resting cell already works that way (`Core/MarkdownPM/Tables/cellStatic.tsx:393-409`, `:501-535`).

P2-L2. **What does a right-click on each glyph kind show today, on a page and in a table cell, and is a widget glyph reported editable?** → **Observed** (`probe.log` `q2.*`, `probe2.log` `a.*`, `b.*`, `c.*`, `d.*`, `e.*`, `f.*`; shots `shots/probe/07`–`20`, `shots/probe2/`):
- **Page, bullet (top and nested), checkbox (open and checked), quoted bullet:** no menu at all. Each is a `contenteditable="false"` widget, Chromium reports `isEditable: false`, `editorMenu` still asks, and Desktop resolves `null` at `Desktop/Actions/editorMenu.ts:136`. Selection and document unchanged.
- **Page, number (`1.`), arrow (`→`), `+`:** the full general menu — Undo, Redo, Cut, Copy, Paste, Paste As ▸, Paste Without Formatting, Select All, Lists ▸ (five rows), Insert ▸, Format ▸, Embed ▸, Heading ▸ (Paragraph ✓), Speech ▸, Share ▸. These glyphs are class marks over editable source (`isEditable: true`). **Lists ▸** checks Numbered List on `1.`, Arrowed List on `→`, and **Bullet List** on `+`. The right-press seats a selection inside the marker: `.` of `1.` (74–75), the space after `→` (122–123), the space after `+` (147–148).
- **Page, revealed bullet marker** (caret on `- A`, so the source `-` draws): the general menu with Bullet List ✓; the selection becomes the `-` itself (42–43).
- **Page, `- [] bare item`** (no glyph drawn): the general menu with Bullet List ✓.
- **Page, grip on `- A`:** `Type ▸ [Bulleted ✓, Numbered, Alphabetical, Checklist, Arrowed]`, separator, Delete; the bubble-phase event arrives `defaultPrevented: true`.
- **Focused cell, bullet (first and second line), checkbox:** no menu (`isEditable: false`), as on a page.
- **Focused cell, number (first line) and arrow:** the cell's general menu — Undo, Redo, Cut, Copy, Paste, Paste Without Formatting, Select All, Lists ▸ (Numbered ✓ / Arrowed ✓), Format ▸, Speech ▸, Share ▸ — with the selection seated on `.` and on the space after `→`.
- **Resting cell, bullet, checkbox, number, arrow:** the resting menu — Cut (off), Copy (off), Paste, Paste Without Formatting, Lists ▸ (the clicked kind checked), Format ▸ — and, on every glyph but the checkbox, Speech ▸ and Share ▸, because Chromium still reports a `selectionText` (`cella`, `.`, `carrow`) even though the cell defaults the right-press away (`cellStatic.tsx:585-588`). The cell stays at rest. (A first resting-arrow attempt popped nothing because the row sat under the status bar; scrolled into view, it answers like the others.)

**Implies:** the decisions' premise that "on a page the general right-click menu answers" a glyph is true only for numbers, arrows, and `+`; bullets and checkboxes answer nothing today, on a page and in a live cell (P2-C2). A-9's suppression is needed: numbers, arrows, and `+` seat a selection inside the marker on the right-press.

P2-L3. **In a focused cell, how much of the list's inset does the first glyph leave for the grip's press band?** → **Observed** (`probe.log` `q3.geometry`, `q3.band`; `probe2.log` `a.cellLive.*` `geom`; shot `shots/probe/18-q3-cell-live.png`): all of it. The first line carries `--grip-strip: 20px` (`Core/MarkdownPM/markdown-tables.css:193-196`, `--list-indent: 20px` at `Core/MarkdownPM/markdown-pm.css:58`), so the grip's band is 0–20px from the line box's left edge (`Core/MarkdownPM/lineDom.ts:31-34`); the grip's `::before` draws at 3.5–16.5px. The glyph starts exactly where the band ends: bullet 20–30.5px, number 20–39.5px, checkbox 20–47px, with text at the 36px padding. An `elementFromPoint` sweep reads the line box for 0–19px and the glyph from 20px; real right-clicks at every pixel 0–20 pop the grip menu, and at 21–22 (on the bullet) nothing pops. **Implies:** the glyph and the grip don't share a spot in a focused cell. A right-click on the first glyph never reached the grip menu, which is why the Fresh-Eyes Read's question 4 and Scout 2's 2-T13, 2-C5, 2-E4, and 2-Q5 don't hold; A-5 holds by construction, with the grip's whole 20px band left and no ordering between the two handlers to decide. Open Item 1 closes: 20px of 20px.

#### Drives at Baseline

P2-D1. **Text Property Drive, group 4** (TextPane: keys, autocomplete, formatting, the native menu, saves, style parity): `node live-drive.mjs 4` from `.claude/scripts/Text Property Drive/`, port 9353 (inspector 9354), 66 s including the ~10 s build. **Green, 37/37 — Observed** (`…/scratchpad/tp4.log`). It touches MarkdownPM only in `text` scope, where no list is read (`Core/MarkdownPM/Engine/detect.ts:512-516`), and it pins that the pane's menu holds no Lists row, so it's a regression guard with no list-type cases.

P2-D2. **Alias Drive, group 3** (the `[[` picker's alias stage in a page body, a TextPane, and a table cell): `node live-drive.mjs 3` from `.claude/scripts/Alias Drive/`, port 9373, 111 s. **Green, 121/121 — Observed** (`…/scratchpad/al3.log`, metrics in `…/scratchpad/shots/al3/metrics.json`). It drives the live cell's editor and the page editor's keys; a regression guard.

P2-D3. **Path Links Drive, group 9** (marks by chord and by the editor menu's Format row over links): `node live-drive.mjs 9` from `.claude/scripts/Path Links Drive/`, port 9383. 210 s. **Green, 496/496 in group 9 plus the 2 seed checks — Observed** (`…/scratchpad/pl9.log`). It right-clicks the page editor and picks Format ▸ rows by label (`.claude/scripts/Path Links Drive/live-drive.mjs:1157-1194`), the exact mechanism the list-type cases need, and it never seats a caret-only case through the menu, since a right-press selects the word (its comment at `:1166`). Its passes stay valid only while Format rows keep acting on the seated word, which C-6 preserves.

P2-D4. **Editor Parity** (four fixture pages rendered line by line, nine behaviors including a glyph drag and checkbox toggles, keystroke latency): `./twice.sh base base2 <worktree>` from `.claude/scripts/editor-parity/`, port 9444, its own `run/<label>/nexus` copy of `~/Test`. 90 s for two runs. **Green — Observed** (`…/scratchpad/parity.log`, `Pommora-LGM-B/.claude/scripts/editor-parity/results/base-vs-base2.md`, removed with the worktree): 0 of 112 rendered lines differ, every screenshot 0 differing pixels, all nine behaviors `same` and none recorded an error. Its `launch.sh` has none of the harness's inactive-window patches, so it raises a real, focus-taking window for those 90 s. During execution the same command over a before-build and the patched build is the regression read (P2-W2).

P2-D5. All four were run one after another against the worktree, each with `POMMORA_DRIVE_REPO` set to it. The harness's `sweepStrays` kills every Electron carrying a `pommora-drive-` userData (`.claude/scripts/drive-harness.mjs:588-601`), and every drive backs up and restores the one `~/Test`, so two drives (or two agents' drives) can't run at once. These runs pointed `HOME` at a scratch copy of `~/Test` and disabled `sweepStrays` in the worktree's harness copy (probe-only tweaks, absent from the prototype patch); the commands above, as written, touch `~/Test` and sweep strays, so execution runs them serially.

#### Where the Cases Go

P2-W1. **A new drive, `.claude/scripts/List Types Drive/live-drive.mjs`, on port 9413 — a placement Nathan must approve.** The cases need four things only `drive-harness.mjs` gives: real right-clicks whose native menus are recorded and chosen from by label (`drive-harness.mjs:106-174`), the page editor, a live and a resting table cell, and a setting flipped on a running build (`personalization:set`, `Core/Contract/bridge.ts:159-162`). A prototype of that drive ran against the baseline (P2-W4). Weighed against it:
- **Path Links Drive group 10:** the nearest precedent, since group 9 already right-clicks a page editor and picks Format rows (`.claude/scripts/Path Links Drive/live-drive.mjs:1157-1194`), but the drive is owned by Path Links' plan phases and its `README` describes it as such; list types there would be an odd one out.
- **Text Property Drive group 5:** the TextPane is `text` scope and reads no lists.
- **Editor Parity:** see P2-W2.
The new drive takes the Path Links shape for "owned by a later landing": an item the build doesn't carry yet prints `AWAIT` rather than failing (`Path Links Drive/live-drive.mjs:21-32`), so it runs whole against the baseline and the patched build. It also needs one paragraph in `.claude/scripts/README.md`.

P2-W2. **Editor Parity can't host the cases, and shouldn't change.** Its `cdp.mjs` attaches only to the page target (`.claude/scripts/editor-parity/cdp.mjs:2-26`) and `launch.sh` starts Electron without a main-process inspector (`launch.sh:13-15`), so a right-click there would pop a real native menu that nothing can read or close. Its comparison is two builds side by side: `compare.mjs` marks any behavior whose recorded value differs as `DIFFERENT` (`compare.mjs:96-102`), and `expect.mjs` passes a changed behavior only through its `want` table, which is written for the Incremental Scan plan (`expect.mjs:38-46`). A behavior the after-build adds by design would read as an error on the before-build (`run.mjs:144-151` stores the thrown message) and fail the compare. None of its fixtures or behaviors change under these decisions — `render.md`'s lists are only drawn, and its glyph drag and checkbox taps are left-presses — so its role here is the regression guard: a before-and-after `compare.mjs` should report 0 differing lines and every behavior `same`, which is a stronger read than `expect.mjs`'s Incremental Scan verdict.

P2-W3. **One harness edit is required: record a row's check.** `rowsOf` keeps a row's label, enabled state, and submenu but not `checked` (`drive-harness.mjs:116-117`), and A-3 and C-4 are about checks. Adding `...(i.checked && { checked: true })` to that line is the whole change (+0 lines), and every existing drive keeps reading the same labels.

P2-W4. **The prototype** is saved at `.claude/Planning/List Glyph Menu/Scouts/Planning/2 — Drive Prototype.patch` (the new drive file and the one-line harness edit). It ran against the baseline build in 29 s on port 9413 — **Observed** (`…/scratchpad/proto.log`, shots in `…/scratchpad/shots/proto/`): 7/7 held, with the five items the switch owns printing `AWAIT` (the bullet's glyph menu pops nothing, so its rows read `[]`; the picks leave the example unchanged) and the two items that already hold today passing — the grip's Type ▸ Numbered over the example writes `1. A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n2. F`, and a right-click 10px into a focused cell's first line opens `Type ▸`. `POMMORA_LGM_LANDED=1` flips the owned items to must-pass. It sets the setting through `personalization:set` under the placeholder key `preserveListLevels` (P2-Q5). One trap it met: ⌘Z after a pick that wrote nothing undoes the seed itself, so the undo case presses only over a change. The prototype covers K1–K3, K12's two menus, and a D-1 item that runs the grip over the example rather than K20's blank-line text; the rest of *§The Case List* follows the same helpers.

#### The Case List

Each case runs in the new drive (P2-W1) on a page seeded by the drive, with the caret parked on a trailing `Tail.` line unless the case says otherwise, so no glyph is revealed as source. `→` stands for the arrow marker; the example is `- A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n- F`. "Glyph menu" is the flat five-row menu A-2 names. Group 1 is the page, group 2 a focused cell, group 3 a resting cell, group 4 Lists ▸ and the grip, group 5 the setting.

P2-K1. A-1, A-2, A-3, B-1 (on) — the example → right-click B's bullet → rows read `Bulleted ✓, Numbered, Alphabetical, Checklist, Arrowed`, no Delete; pick Numbered → `- A\n\t1. B\n\t\t- C\n\t\t- D\n\t2. E\n- F`; group 1.

P2-K2. A-7 — K1's result → ⌘Z → the example, in one step; group 1.

P2-K3. B-1 (off), B-3 — the example, setting off → right-click E's bullet → Numbered → `- A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n- F`; group 1.

P2-K4. A-3 (off, mixed) — `- A\n\t- B\n\t\t1. C\n\t\t2. D\n\t- E\n- F`, setting off → right-click B's bullet → no row checked; with the setting on, Bulleted ✓; group 1.

P2-K5. A-1, A-4, B-13 — `1. one\n2. two`, `- [ ] open\n- [x] done`, `→ a\n→ b`, `+ p` → right-click each glyph → the glyph menu with Numbered ✓, Checklist ✓, Arrowed ✓, and Arrowed ✓ on `+`; each pick of the checked row leaves the text unchanged (B-8, B-12: `- [x] done` stays checked); group 1.

P2-K6. A-9 — `1. one\n2. two`, caret on `Tail.` → right-click `1.` → close the menu → the selection is still the caret on `Tail.` (today it becomes `.`, P2-L2); the same on `→`; group 1.

P2-K7. A-9, C-2 — the example, caret on `- A`'s marker so `-` draws as source → right-click `-` → Lists ▸ Numbered List → `1. A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n2. F` (A and F, the top group, as a glyph pick on A gives); group 1.

P2-K8. A-9 — `- [] bare` → right-click its text → Lists ▸ Task List → `- [ ] bare`; group 1.

P2-K9. A-10, B-11 — `> - q1\n> - q2\n>\n> - q3` → right-click q2's bullet → Numbered → `> 1. q1\n> 2. q2\n>\n> - q3`; group 1.

P2-K10. B-7 — the example with C and D numbered, a selection from B's text through E's text → right-click C's glyph inside it → Checklist → `- A\n\t- [ ] B\n\t\t- [ ] C\n\t\t- [ ] D\n\t- [ ] E\n- F`, setting on; group 1.

P2-K11. B-7 — the example, a selection over B's text alone → right-click F's bullet, outside it → Numbered → `1. A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n2. F`; group 1.

P2-K12. A-4, A-5 — a cell holding `- a<br>- b`, focused by a click on `b` → right-click the first line's bullet → the glyph menu; right-click 10px into the line's inset → `Type ▸`, Delete; pick Numbered from the second line's bullet → the row reads `| 1. a<br>2. b | x |`; group 2.

P2-K13. A-8 — the same cell at rest → right-click `•` → the glyph menu → Checklist → `| - [ ] a<br>- [ ] b | x |`, no `.mdpm-tbl-cell-editor` mounted; repeat on a resting `1.` and `→`; group 3.

P2-K14. C-1, C-2 — the example, caret on `Tail.` → right-click E's word → Lists ▸ Numbered List → K1's result (B and E, not E alone, though the word was seated, P2-L1); group 4.

P2-K15. C-1 — `Tail.` → right-click the word → Lists ▸ Bullet List → `- Tail.`; group 4.

P2-K16. C-3, B-7 — the example, select A through F → Lists ▸ Bullet List → the example unchanged; group 4.

P2-K17. C-4 — K4's text, setting off → right-click B's word → Lists ▸ has no row checked; on → Bullet List ✓; group 4.

P2-K18. C-5 — a resting cell holding `> a` → right-click → Lists ▸ Bullet List → the cell reads `- > a` and draws a bullet; group 3.

P2-K19. C-6 — `plain word here`, caret elsewhere → right-click `word` → Format ▸ Bold → `plain **word** here`; group 4.

P2-K20. D-1 — `- a\n- b\n\n- c`, setting on or off → the grip's Type ▸ Numbered → `1. a\n2. b\n\n- c`; group 4.

P2-K21. D-1, D-2 — an empty line → type `/bul` and Enter → `- `; group 4.

P2-K22. E-1, E-2 — Settings › Pages & Writing → the first section's rows read Editor Scale, Outliner Lines, **Preserve List-Level Formatting** (on), Show Icon In Title, in that order; turning it off there, then repeating K3 on the open page without a reload, gives K3's text; group 5.

#### Pruned Cases

P2-R1. B-2 (other parents' items stay), B-4 (counting past a differently-typed sibling), B-5 (tabs and spaces as one group), B-6 (a top group spans a blank line), B-9 (a pick recounts from 1 or A), B-10 (the run an item leaves recounts), B-11 (group edges), B-12 (checked stays checked), and B-13's `+` → `-` rewrite: each is the switch's text outcome for a given document and range, deterministic and fully observable through `setList` plus `landEdit` with `editEvent` under vitest, the way `Core/MarkdownPM/Input/listRenumber.test.ts:92-126` already pins Lists ▸'s counting. The live drive proves the entry points reach the switch with the right range (K1–K14); repeating every grouping rule through a real right-click adds launch time and proves nothing a unit test doesn't. Their pins belong beside `Core/MarkdownPM/Input/format.test.ts:158-264`.

P2-R2. A-6 (nothing opens read-only): pinned for the grip by `Core/MarkdownPM/Menus/gripMenuFlow.test.tsx:195-200`, for the text menu by `Core/MarkdownPM/Menus/editorMenu.test.tsx:77-78`, and for the resting cell by `Core/MarkdownPM/Tables/cellRestingMenu.test.tsx:210`; a glyph twin sits beside the grip's. A read-only editor isn't reachable on a seeded page without the file-history window, which the drives don't drive.

P2-R3. B-8 (re-picking the applied type): the text outcome is K5's last clause; the off-setting half (differing items set) is the switch's rule over a range, a unit test.

P2-R4. D-2 (one switch) and E-3 (the setting earns its place): structural, with no visible behavior beyond K1–K21.

P2-R5. B-3's "with the setting on, among one type's items": K1 and K3 cover the two readings live; the mixed-type variant is a unit test.

#### Tests and Docs Made False

P2-F1. `'re-applying the same kind clears it'`: re-picking a kind removes the markers, which C-3 ends — `Core/MarkdownPM/Input/format.test.ts:165`.

P2-F2. `'clears only where every line already reads that way'`: same toggle-off, C-3 — `Core/MarkdownPM/Input/format.test.ts:186`.

P2-F3. `'enters with the caret in the slot Bold writes at a point on a list glyph'`: a right-click on a resting cell's `•` gets the general menu and Format ▸ Bold; under A-8 that right-click opens the glyph menu, so the general menu no longer answers on a glyph — `Core/MarkdownPM/Tables/cellRestingMenu.test.tsx:262-268`.

P2-F4. The `setListKind` describe, including `'numbers per indent level…'` and `'repairs a broken ordered sequence'`: the grip's private writer and its per-level counters go under D-2; the outcomes `'repairs…'` pins survive under B-9 through the one switch, so the cases move rather than vanish — `Core/MarkdownPM/Input/format.test.ts:234-264`.

P2-F5. `'a run that began past 1 keeps its base'` (`5. a\nb` → Lists ▸ Numbered on `b` → `5. a\n6. b`): B-9 says a list-type pick recounts every numbered run it reaches from 1, while typing, Tab, and moves keep a top-level base; whether a Lists ▸ pick that joins `b` to `5. a` "reaches" that run decides whether this becomes `1. a\n2. b` — false under B-9's literal reading — `Core/MarkdownPM/Input/listRenumber.test.ts:105-107`. Open in P2-Q3.

P2-F6. `'a list offers its Type set…'` and the grip flow's `listKind:` picks: they pin the `listKind:` action name, false only if D-2's one switch folds the grip into `list:` (Scout 2's 2-X1) — `Core/Actions/gripMenu.test.ts:51-60`, `Core/MarkdownPM/Menus/gripMenuFlow.test.tsx:81-97`.

P2-F7. `'reads list kind and blockquote'`: pins `readFormatState`'s one-line `list`; false if C-4's check replaces that field rather than sitting beside it — `Core/MarkdownPM/Input/formatState.test.ts:17-19`.

P2-F8. `parseListMarker('+ a')!.kind` is `'bullet'`: false only if B-13 is delivered by parsing `+` as `arrow` rather than by the switch and check reading the drawn kind — `Core/MarkdownPM/Engine/detect.test.ts:94`.

P2-F9. Lists, last sentence: "The grip menu's **Type ▸** switches a whole block between the five kinds, counting from 1 or A, and the context menu's **Lists ▸** turns each selected line into an item, removing the marker only when every selected line already has one" — C-3 ends the removal, and the glyph menu and setting are new — `.claude/Features/MarkdownPM.md:24`. The same paragraph's "a top-level run keeps the number it began at" is also false for a list-type pick under B-9.

P2-F10. "the grip's Type ▸ is the one writer that counts for itself, because it rewrites a whole list and restarts it" — D-2 — `.claude/Guidelines/Editor-Internals.md:40`.

P2-F11. "where a surface answers the press itself — a block grip, a heading gutter, a citation, a connection —": the list glyph joins that list — `.claude/Features/MarkdownPM.md:146`.

P2-F12. I-037's "`format.ts`'s Lists ▸ menu … read the quote-prefixed grammar with no scope" leaves its sites list once C-5 lands — `.claude/IssuesPM.md:394`, with its footnote `.claude/IssuesPM.md:1248`.

P2-F13. The settings table gains the row under Outliner Lines — `.claude/Features/ConfigurationPM.md:151`.

P2-F14. The ratified Decisions' *§Context* sentence "on a page the general right-click menu answers it, and in a focused table cell the first item's glyph sits inside the grip's press band, so the grip's menu answers there" and A-5's "where the first item's glyph shares the grip's spot" are false (P2-L2, P2-L3) — `.claude/Planning/List Glyph Menu/List Glyph Menu — Decisions & Intention.md`, *§Context* and A-5.

The production patch (`Scouts/Planning/1 — The Patch.patch`) hadn't landed when this report was written, so the list above is checked against `cd813afdd` only.

#### What Contradicts the Decisions

P2-C1. Decision A-5 and *§Context*: in a focused cell the first glyph doesn't share the grip's spot. The grip's band is the line's first 20px and the glyph begins at 20px, so a right-click on the first glyph never reached the grip menu, and the grip keeps its whole band (P2-L3, `shots/probe/18-q3-cell-live.png`). A-5's outcome holds with no handler ordering; its premise and Open Item 1 should be rewritten.

P2-C2. *§Context* "on a page the general right-click menu answers it": a bullet or checkbox glyph shows **no menu at all** today, on a page and in a focused cell, because the widget isn't editable and Desktop gates the general menu on `isEditable` (`Desktop/Actions/editorMenu.ts:136`; P2-L2). Only numbers, arrows, and `+` get the general menu. So the glyph menu fills a dead spot for bullets and checkboxes, and replaces the general menu only on numbers, arrows, and `+`; a glyph handler must `preventDefault` its `contextmenu` or those three would also get Desktop's menu (Scout 2's 2-A1).

P2-C3. Decision B-13 against today's check: **Lists ▸** checks Bullet List on a `+` item (P2-L2). That's the change B-13 asks for, not a conflict, but K5 is the live proof it landed.

P2-C4. *§Prospects*' "a resting table cell acts where a right-click lands": its menu still carries Speech ▸ and Share ▸ beside a disabled Cut and Copy, because Chromium reports a `selectionText` the cell's own range doesn't hold (`Desktop/Actions/editorMenu.ts:104-111` against `:139`; P2-L2). Under A-8 the glyph menu replaces that menu on a glyph, but the general resting menu keeps the mismatch on text; it belongs in the Prospect's issue.

#### Open Calls for Nathan

P2-Q1. **A new drive file.** The list-type cases need real right-clicks whose native menus the drive can read and pick from, which only the shared drive harness does, and no existing drive is about lists. I'd add `.claude/scripts/List Types Drive/live-drive.mjs` on port 9413, with a paragraph in the scripts README, rather than bolting a group onto the Path Links drive. **Recommended:** approve the new file.

P2-Q2. **One harness line.** The harness reads a menu's row names but not their check marks, and A-3 and C-4 are about check marks. **Recommended:** add the check to the row it records; nothing else reads it differently.

P2-Q3. **Does a Lists ▸ pick restart a list that began past 1?** Today, turning `b` into an item under `5. a` makes `6. b`. B-9 says a list-type pick recounts what it reaches from 1, so it could become `1. a` / `2. b`, while typing keeps the 5. **Recommended:** a pick restarts only the items it changed type on and the runs they form, so turning a plain line into an item keeps the run's base (`5. a` / `6. b`) and B-9's restart applies when a pick switches existing items' type; B-9's wording should say which.

P2-Q4. **A-5 is already true.** In a table cell the first bullet sits just right of the grip's strip rather than on top of it, so a right-click on the glyph and one on the grip already land on different things. **Recommended:** rewrite A-5 and the Context sentence to say so and close Open Item 1 with "the whole 20px inset."

P2-Q5. **The setting's stored key** is still unnamed; the prototype uses `preserveListLevels` as a placeholder. **Recommended:** name it before execution so the drive and the settings row agree.
