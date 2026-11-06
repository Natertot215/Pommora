### Scout 5 — Right-Press Probe (Reconciled)

**DATE:** 11-06-2026
**HEAD:** `b7f2f17a5` on `active`
**EVIDENCE:** **[Observed]** is a reading from the running app, driven over CDP from a worktree build, with selection snapshots taken synchronously inside each listener. **[Inferred]** is reasoning no run confirmed. Reconciliation didn't relaunch the app, so these readings stand as driven; what changed is what they're used for.
**STANDS UNDER:** E-1 keeps the resting menu. This probe's variants are the evidence behind the *§Rejections* entry, so only their conclusions remain, and the "Today" readings now describe the design that stays.

**Limits of the Drive:**

- **Platform:** macOS only. Windows wasn't driven, and nothing here says when it seats.
- **Native Menu:** The harness records the menu and doesn't draw it, so `mouseReleased` reaches the page after `contextmenu`, which a real menu would swallow.
- **Focus:** The window is never key; DevTools focus emulation stands in for it.
- **Clipboard:** Stubbed in main for the drive.

---

#### Event Order

Every target ran three times on the unmodified build, and each run matched. `contextmenu` arrives 0.1 to 1.9 ms after `mousedown`, inside the press. "CM" is `EditorState`'s selection, "DOM" is `getSelection()`, and a star marks the synthetic `selectionchange`.

##### Page Text on a Word

| Step | DOM | CM |
| --- | --- | --- |
| `pointerdown`, `mousedown` | old caret | old caret |
| `selectstart`, trusted | old caret | old caret |
| `contextmenu`, capture | **caret at the click** | old caret |
| `selectionchange*`, inside the handler | word | word |
| `contextmenu`, bubble | word | word |
| `selectionchange`, trusted, about 3 ms later | word | word |

##### The Other Targets

| Target | `selectstart` Before / After `contextmenu` | At `contextmenu` Capture | What Stands After |
| --- | --- | --- | --- |
| Blank past a line's end | 1 / 1, the second refused | DOM caret at line end, CM old | Caret at line end |
| Caret already in the word | 1 / 0 | DOM caret at click, CM old caret | Word |
| Word beside a selection | 1 / 0 | DOM caret at click, **CM still the old selection** | New word |
| List glyph | 0 / 0 | Nothing moved | Nothing moved; type menu |
| Block grip | 0 / 0 | Nothing moved | Nothing moved; grip menu |
| Resting cell, word | 0 / 0 | Nothing moved | DOM word in the cell, page CM and focus untouched |
| Resting cell, blank | 0 / 0 | Nothing moved | DOM caret at the text's end |
| Resting cell, space between words | 0 / 1, refused | Nothing moved | DOM caret at the click |
| Page space, page period | 1 / 1, refused | DOM caret at click, CM old | Caret at the click |

- **5-T1 · Two Seats, Not One [Observed]:** Chromium seats twice. The **Press Seat** is a caret at the click, the default action of `mousedown`, announced by a trusted `selectstart` before `contextmenu`. The **Menu Seat** is a word, the default action of `contextmenu`, announced by a second trusted `selectstart` after the event's bubble and its microtasks, and before `requestAnimationFrame` and `setTimeout(0)`.
- **5-T2 · CM Lags the Press [Observed]:** At `contextmenu` the DOM already holds the Press Seat, while `view.state.selection` is still the pre-press selection. `routeRightClick` reads that as `sel`, which is why a word beside a selection routes correctly.
- **5-T3 · The Window Never Sees a Resting Bubble [Observed]:** `cellStatic.tsx:606`'s `stopPropagation` keeps `contextmenu` from a `window` bubble listener. No app listener sits there; the two window listeners are capture (`glanceAction.ts:96`, `hoverReveal.ts:155`).
- **5-T4 · Mac Ctrl-Click Differs [Observed]:** It reaches `contextmenu` with no `selectstart`, and CM's own left-press path has already seated `cm=9-9`, so `sel` there is the press rather than the prior selection. The outcome matches a right-click, since an outside click seats a word either way. A Ctrl-click inside a selection keeps it through `contextmenu`.

---

#### What Stops the Seat

Each row applied at the earliest listener on `window`, on page text. "App Off" also blocks the app's handler, so Chromium's result shows bare.

| Applied | Press Seat | Menu Seat | Native Menu |
| --- | --- | --- | --- |
| Nothing, app off | Lands | Lands, the word | System rows |
| `preventDefault` at `mousedown`, app off | **Stopped** | **Lands, the word** | System rows |
| `preventDefault` at `selectstart`, app off | **Stopped** | **Stopped** | System rows |
| `preventDefault` at `contextmenu`, capture | Lands | **Stopped** | None |
| `preventDefault` at `contextmenu`, bubble | Lands | **Stopped** | None; the app's own seat stands |

- **5-T5 · What Stops Each [Observed]:** `mousedown`'s default stops only the Press Seat. `contextmenu`'s default stops only the Menu Seat, and takes the menu with it. `selectstart` stops whichever seat it fires for, and is the one lever that spares the menu.
- **5-T6 · The Menu Seat's Own Rule [Observed]:** It fires when the selection doesn't hold the click. A word the app seats holds it, so nothing fires on any word case. A caret doesn't, so blank space, a space, and a period all fire. With the app off, a caret already at the click drew no Menu Seat (3 of 3), while a caret the press moved there did. **[Inferred]** A collapsed selection holds the click unless the press just placed it.
- **5-T7 · What `keepSeatedSelection`'s Refusal Stops [Observed]:** Only the Menu Seat, and only on a caret seat. Blocking it left word, caret-in-word, beside-a-selection, resting word, and resting blank unchanged. On page blank space it decided the outcome: unrefused, the Menu Seat selected the line's newline (`cm=39-40`) and the menu grew from 15 to 18 rows.
- **5-T8 · The Refusal's `setTimeout` Earns Its Place [Observed]:** The Menu Seat lands after the handler's microtasks and before `setTimeout(0)`, so a microtask removal would come too early.
- **5-T9 · What Beats the Press Seat [Observed]:** Nothing refuses it on page text. The app's seat overwrites it inside the handler.

##### The Selection's Edges

Nothing reseats at an edge. Each case held the selection with zero `selectstart` events, and Bold wrapped exactly the selection.

- **5-T10 · Page Edges [Observed]:** First character, last character, the neighbor one pixel past either end, the near quarter of the next and previous letters, and blank space past a selection that ends the line. A click on the far quarter of the next letter counted as outside: Chromium seated, and the word took over.
- **5-T11 · Resting Edges [Observed]:** A seated `apple` held through its first character, last character, and both neighbors, and a seated `pear` through blank space past it.
- **5-T12 · One Disagreement, the Other Way [Observed]:** A line selected through its newline, clicked on the empty line below: Chromium counts it inside, while `reachEnd` routes it outside, seats a caret, and the refusal stops the Menu Seat. Bold there wrote `****` on the empty line, which is the click acting where it landed.

---

#### Why the Resting Menu Stays

Seven ways of entering a cell for the menu's length were driven against today, 482 runs in all. The mount itself lands in time, so **5-T13 and 5-T49** stand as a mechanical fact: `contextmenu` reached the mounted editor every time, within 16 ms of `mousedown`, on macOS. No variant came out indistinguishable from today, and that's what *§Rejections* rests on.

- **5-T16 · What Restores the Page's Caret [Observed]:** After a demotion, plain Demote leaves focus on `body`, DOM `.focus()` moves the page caret to 0, and `view.focus()` restores focus with the caret where it was. This is the one reading from the variants that bears on E-2.
- **5-T18 · Layout [Observed]:** Inside bold, a focused mount reveals the `**` markers; a cell with no slack rewraps, growing the row from 33.1 to 57.1 px and pushing the page down 24 px until the menu closes. This is the rejection's stated reason.
- **5-T37 · Select All [Observed by Hand-Ordered Calls]:** `webContents.selectAll()` from a live cell selected the whole page and moved focus there. This bears on E-4, since a native Select All acts on whatever holds focus rather than on the surface clicked.

**Retired:** 5-T14, 5-T15, 5-T17, 5-T19, 5-T28, 5-T34 to 5-T36, and the variants' columns of the table below, which describe a route E-1 declined.

##### The Resting Menu as It Stands

| Finding | Today |
| --- | --- |
| **5-T20 · Rows on a Word** | 10 entries, separators counted: Cut, Copy, Paste, Paste Without Formatting, Lists, Format, Speech, Share |
| **5-T21 · Rows on Blank** | 7 entries |
| **5-T22 · Word During the Menu** | Nothing painted by default |
| **5-T23 · Blank During the Menu** | Nothing |
| **5-T24 · Markers Inside Bold** | Hidden |
| **5-T25 · Page Caret During the Menu** | Keeps blinking |
| **5-T26 · Focus Events** | None |
| **5-T27 · Add Strips** | Stay shown; after a pick they replay a fade-in |
| **5-T29 · Table Rectangle** | Stays selected |
| **5-T30 · Another Live Cell** | Stays live |
| **5-T31 · Bold on Blank** | Enters the cell with `****`, typing fills it |
| **5-T32 · Selection After a Dismissal** | DOM range stays on the word |
| **5-T33 · Typing After a Dismissal** | Goes nowhere |

- **5-T38 · Selection Paint Depends on a Setting [Observed]:** 5-T22 holds with `Use Native Highlighting` off, its default. Turned on, today's word paints in the native blue.

---

#### Which Written Claims Fail

##### The Four Models

- **5-T39 · `gripMenu.ts:139`, Editor-Internals' Grip Entry — Holds, Incomplete [Observed]:** The Press Seat lands before `contextmenu`, and preventing `contextmenu` leaves it. Preventing it does stop the Menu Seat, which this model omits.
- **5-T40 · `pointerPath.ts:48`'s LOAD-BEARING Comment — Fails as Written [Observed]:** With the app's `mousedown` blocked on a link, the link's full 10-row menu opened in both positions tried. "The menu never appears" didn't happen. What the line protects is smaller: the caret would otherwise end inside the link. Only a page link with a follow target was run.
- **5-T41 · `menu.ts:41` — Holds, Narrower Than It Reads [Observed]:** The word comes after the handler and is refusable through `selectstart`, and it applies only when the seat doesn't hold the click (5-T6).
- **5-T42 · The Links Plan's Belief — Stays Disproved [Observed]:** Defaulting the press leaves the Menu Seat, on page text and on a resting cell.

##### Guards From Scout 3

- **5-T43 · 3-T34, Edge Clicks — Fails [Observed]:** The inferred reseat at a selection's edges didn't happen in any case driven.
- **5-T44 · 3-T40, The Refusal — Earned [Observed]:** It's reachable and it changes the outcome on caret seats (5-T7).
- **5-T45 · 3-T39, The Synthetic `selectionchange` — Unreached [Observed]:** Blocking it changed nothing across 10 runs, page and resting, focused and blurred. Ten more with the pointer moved just before the press saw no table mutation between `contextmenu` and Chromium's own event.
- **5-T46 · 3-T17, `cellStatic.tsx:639` — Earns Its Line [Observed]:** With the page blurred, letting the press through moved focus to the page and CM's selection overwrote the seated word. It's also what keeps the Press Seat out of a resting cell.
- **5-T47 · 3-T12, The Seat's Purpose at Rest — Partly Fails [Observed]:** "The highlight" paints nothing on the default setting. The seated range still feeds Speech, Share, and the next click's `restingSelection`, and the rows act on `from, to` regardless.
- **5-T48 · 3-T41, A Stale `pending` — Reached Only by Injection [Observed]:** A `preventDefault` at the bubble parks an ask with no `context-menu` behind it, and no menu appears. No production path was driven there.

**Not Driven:** whether a Ctrl-click arms a grip's drag, which reading settles harmlessly (3-T16), and 3-T60.

---

#### Insights

- **5-T50 · The Refusal Could Be Scoped by Cause [Inferred]:** It only has work on a caret seat. A condition would add a line to save a listener that fires nothing, so it stays unscoped.
- **5-T51 · A Resting Dismissal Swallows Typing [Observed]:** After a dismissed resting menu the DOM range stays in the cell and keystrokes go nowhere, though the page reports focus (5 of 5 across two batches). E-2 takes this.
- **5-T53 · The List Types Drive's `shown` Reads a Range, Not Paint [Observed]:** `getSelection().toString()` returned `apple` while nothing was drawn (`List Types Drive/live-drive.mjs:58-62`), so that assertion can pass with no visible highlight.
- **5-T54 · `getComputedStyle` Can't Answer for `::selection` [Observed]:** It read transparent with the blue highlight on screen, so only a screenshot settles paint. A-6's rewritten drive proves E-3 that way.

**Retired:** 5-T52, which served a later drive of entering the cell.

**Probes:** Scripts, logs, and screenshots are in `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/press-probe/`.
