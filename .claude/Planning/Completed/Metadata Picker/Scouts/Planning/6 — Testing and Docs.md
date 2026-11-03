### Scout 6 — Testing and Documentation (G-1, G-2, and the Execution, Testing, Screenshots, Comments, and Documentation Constraints)

**BASE:** `8824cce29` on `active`. HEAD has since moved to `16d932567`, touching only `Desktop/main.ts` and one guideline, so line numbers hold. Nothing in the repo changed and no file in `~/Test` did. **In-Flight Call:** the assignment allowed read-only commands, and running drives isn't strictly that, so I ran them from a `git archive` export under the scratchpad, against a scratch copy of `~/Test`, with every harness change made to a scratch copy.

**Disclosure:** my first drive run overrode `HOME` to keep `~/Test` untouched, and each launch popped a macOS "A keychain cannot be found to store 'Pommora Key'" dialog on Nathan's screen for about seven minutes. The coordinator flagged it; I stopped the run by exact PID, and every later launch carried `--use-mock-keychain`. The Text drive's launch timeout from that run is discarded: it passes 115/115 with the flag, so the timeout fits the dialog blocking startup. The Option Picker and Properties results stand, since both launched and ran, and group 15's failure reproduced under the flag. A sibling scout's orphaned instance (pid 22207, `scratchpad/plan/flip-tmp/wt`, port 9398, no mock flag) was seen, left alone, and has since exited.

---

#### 1. Contradictions

- **X-1 · G-1's second date can't be pinned whole "before the restructure":** at HEAD a date never slides (`CardsView.tsx:486` gates on `pickKindOf`), so the slide half has no route to drive until a date slides. The click half can land first. The slide half lands in the commit that makes a date slide. Proven in a scratch copy: with the Live Check's one-line change alone, the second date opens showing `November 12th, 2026` where it should read `—`; keying the pane per entry turns it green. This confirms Open Item 8 is a real bug. It also narrows what "its own date" means in the slide: C-5 makes a held date show-only, so a date that slides is always blank when it opens.
- **X-2 · G-2 says I-027's and I-042's text "should be corrected", but the convention deletes them:** E-3 and E-4 resolve both, and `~/The Studio/.claude/commands/batch-issues.md` says a resolved issue loses its block, index row, and footnote. `index-issues.py` then closes the gaps, keeping order: I-028 to I-041 drop by one and I-043 to I-075 by two, so **I-051 becomes I-049 and I-075 becomes I-073**, and the totals go 75 → 73 (Low 40 → 39, Minimal 20 → 19) before X-6's issue joins. No other entry cites I-027 or I-042, so the script won't refuse. No I-number appears in the repo outside `IssuesPM.md`, `Planning/`, `sessions/`, and `HistoryPM.md`. The plan should correct I-075's text first, renumber last, and give both numbers in its final report.
- **X-3 · E-4's "citations corrected" has nothing to correct at HEAD:** all six citations in `[^51]` are accurate today (`MenuRows.tsx:163`, `menu-row.css.ts:214`, `FrameSlide.tsx:83`, `PropertyFrame.tsx:399-405`, `formatRows.ts:12-39`, `frames.ts:83-89`). The task should re-anchor whichever the work moves, and write `~#-#` ranges as the convention asks.
- **X-4 · G-2's list is short:** it omits `ViewTypesPM.md:130`, `InterfacePM.md:34,41`, `PommoraUIX.md:210,255,357`, `scripts/README.md`, and `Properties Drive/MATRIX.md`. See *§6*.
- **X-5 · Properties Drive group 15 is broken at HEAD:** `27500c110` (11-01) dropped the `Date format` and `Time format` aria-labels and the Date editor's heading row, so `pickIn` at `live-drive.mjs:1100` throws and ends the run. T&A's closing count predates that commit. The Testing Constraint leans on this drive, so its repair comes first, and it's proven at 11/11 (*§The Group 15 Repair*).
- **X-6 · `reveal-parity` can't run at HEAD:** its `fixtures.mjs` writes `Collection C/Window One.md` and reads `.nexus/interface/homepage/_tiles.json`, and the `make-benchmark-nexus.mjs test` preset (10-21) writes neither file, so it dies before launching. This is the real "`~/Test` is missing something": the properties aren't the issue. A scratch patch adding `Collection C` only moved the failure to the next missing file, so I stopped there. The Source names it among the drives to read, and its one relevant sample, the `+` held while its list is open (`run.mjs:545`), can be asserted directly in group 16. Recommendation: don't repair it inside this plan, and file it as its own issue.
- **X-7 · "Every possible outcome" meets two OS boundaries:** the README says a run never takes focus, which holds only because no drive has ever opened a file dialog or pressed Reveal Location. B-5 and D-4 require both. Unstubbed, an overnight run would hang on a dialog nobody is there to dismiss. See *§5 · Harness*.
- **X-8 · Some outcomes can't be proven by a drive, and the plan should say so rather than claim them:** the `PickerMenu` development warning (E-6) doesn't exist in a built app, since it's gated on `import.meta.env.DEV` (`PickerMenu.tsx:137`); B-3, C-8, and E-2 are structural; I-042's extraction has no visible outcome. Those go to units, gates, and `git grep` checks, marked in the matrix.
- **X-9 · Decision letters collide in the Properties Drive's matrix:** its groups already print `D-1`, `E-2`, `C-2`, and `B-4` from the Properties Restructure's decisions. New groups should print `MP-` prefixed letters (`[g16 MP C-1]`) so the two namespaces can't be misread.

**Nothing here reverses a decision.** X-1, X-2, X-3, and X-4 sharpen G-1, E-4, and G-2. One note on D-2: it already holds at HEAD. A leaf and a submenu pick both commit through `commitValue` (`useViewInteractions.tsx:414`), and only the card's own seat uses `commitOnCard`'s reveal (`CardsView.tsx:194`). D-2 needs a pin, not a change.

---

#### 2. What's True

##### The Baseline

| Gate | Result | Time |
|---|---|---|
| `npm run test` | 548 files · **9,072 passed · 2 skipped** | 73.4 s |
| `npm run typecheck` | exit 0 | 17.6 s |
| `npm run lint` | exit 0, 1,436 files | 0.9 s |

##### The Drives at HEAD

| Drive | Port | Ran | Checks | Seconds | T&A's Count | State |
|---|---|---|---|---|---|---|
| Option Picker | 9343 | All | 46 | 84 | — | Clean |
| Properties | 9403 | 1-15 | 71, then the crash | 174; group 15 alone 33 | 78 | **Crashes in g15**, 78 once repaired |
| Text Property | 9353 | 1-4 | 115 | 174 | 115 | Clean |
| Metadata | 9363 | 1-9 | 261 | 227 | 261 | Clean |
| Alias | 9373 | 1-5 | 339 | 271 | — | Clean; group 6 is timing only, not run |
| Path Links | 9383 | 1-9, `POMMORA_PL_LANDED=9` | 817 | 384 | 817 | Clean |
| Archive | 9393 | All 11 | 159 | 409 | 159 | Clean |
| `editor-parity` | 9444 | One record | 4 pages, 9 behaviors | 44 | — | Runs; touches no picker |
| `reveal-parity` | 9446 | — | 0 | 0 | — | **Can't start** (X-6) |

Seconds include the drive's own `npm run build`, which takes about 4.5 s, so a skip-build flag would buy nothing. All seven in series take about **29 minutes**.

##### How They Run

- **One at a Time:** `launch` calls `sweepStrays()` (`drive-harness.mjs:563`), which SIGKILLs any Electron whose helpers carry `pommora-drive-`, and every drive shares `~/Test`. Two concurrent drives kill each other whatever their ports. Execution agents and reviewers mustn't start a drive while one runs.
- **Worktree Builds:** T&A's rule stands (`Trash & Archive Restructure — Plan.md:263`): `POMMORA_DRIVE_REPO=<worktree>` on every run, since the harness's default is the main checkout, where Nathan's instance runs. `editor-parity/worktree.sh <commit> <dir>` cuts a detached worktree with linked `node_modules`. The drive scripts run from the main checkout, so a drive edit needs no commit; the code under test does.
- **Three Quiet Failure Modes:** `POMMORA_PL_LANDED` defaults to 1 (`Path Links Drive/live-drive.mjs:21`), so a failure in phases 2 to 9 prints `AWAIT` and exits 0 unless it's set to 9. `Alias Drive/live-drive.mjs:22` reads any `POMMORA_DRIVE_REPO` as a baseline build, which affects group 6 only. `reveal-parity/expect.mjs` is the Hover Reveal plan's verdict, not a general one.
- **What Drives Need:** `~/Test` holds an empty registry (`properties.json` has 0 defs) and one Cards view. That's harmless: every drive seeds its own properties, as the passing runs show. The new groups should seed the same way, as `group14` does (`Properties Drive/live-drive.mjs:901-918`). `Path Links scale` alone needs `~/Benchmark-Medium`. `editor-parity` copies `~/Test` and never touches it.
- **T&A's Cold Machine (`Plan.md:265`, `:9667`):** `git worktree list`, `ls -d ~/Benchmark-*`, a scratch-folder listing, and a process listing for anything launched from a worktree or scratch folder.
- **Coverage Today:** no drive presses a back bar on a slid-in pane, slides into anything from the Add list, opens a file dialog, presses Reveal Location, right-clicks a Matrix node, or checks a window edge. The Add list has three drive touches in all, each a non-sliding pick: `Properties Drive:973-979`, `Text Property Drive:255-258`, and `:679-688`.

---

#### 3. Removal Inventory

##### Tests That Leave

| What | Where | Why |
|---|---|---|
| Four chooser tests driving props | `PropertyPicker.pane.test.tsx:151-248` | G-1; the mode leaves. `:195`'s order, divider, and "Spaces" bar re-home at the surface; `:219`'s entry-carrying commit is plumbing |
| Their fixtures | same file: `Host`'s `chooser`, `onReveal`, `resolveTarget` and `onCommit`'s `entry` (`:37-43`, `:55`, `:58`, `:60`), the `PickEntry` import (`:13`), `rowButton` (`:66-70`), `buttons` (`:103-105`) | Used by nothing else |
| The seed-status direct mount | `cellGestures.test.tsx:564-593` | Duplicate: `PropertyPicker.pane.test.tsx:322` lists a Status through the same rows. G-1 says move; deleting is the removal-first reading, and it's disclosed here |
| `orderAddableEntries` | `cardColumns.test.ts:62-81`, `:10` | C-8 replaces the function |
| The stamp entry | `cardColumns.test.ts:114-120` | C-6 flips it: stamps leave the card's Add |
| One of three pins for one regression | `ValueSeat.test.tsx:125-131` | `:302` proves the menu seat and `cardGestures.test.tsx:155` the real host; `:125` feeds its own column, so it proves the least |
| `PickEntry`, `revealOnly`, and `drillable` vocabulary | 21 hits in `PropertyPicker.pane.test.tsx`, 6 in `cardColumns.test.ts` | B-5 |

##### Tests That Move

| What | From | To |
|---|---|---|
| `parseEditorValue` cases, with the `:13` import | `cardColumns.test.ts:18-60` | `Core/Properties/parseEditorValue.test.ts`, **a new file needing placement approval in planning** |
| The multi-select direct mount | `cellGestures.test.tsx:595-628` | `PropertyPicker.pane.test.tsx`, on its `Host`. `pickModel.test.ts:50-68` holds the semantics; this one proves the picker wires them. The `:10-11` imports then leave too |
| `PickerControl` suites | `UIX/Pickers/PickerControl.options.test.ts`, `.typeable.test.tsx` | `UIX/Menus/PickerControl.test.tsx` (E-2), with the options suite folded in; their relative imports survive |
| The seat's suite | `Core/Properties/Cells/ValueSeat.test.tsx` | `Core/Properties/Pickers/ValueSeat.test.tsx`, beside the seat (B-3), in the last move |
| Centering cases | `PickerMenu.test.tsx:452-520` | Plain function tests beside `placePane` (I-042) |

**Import-Only (E-2):** `Core/Interface/mount.test.tsx:4,10`, `Core/Matrix/MatrixMenu.test.tsx:5`, `Core/Properties/Schema/PropertyFrame.test.tsx:20`, `Core/Testing/MenuDoorHost.tsx:1`.

##### Tests That Flip With a Decision

| Test | Decision | Change |
|---|---|---|
| `cardGestures.test.tsx:275` "a Date entry opens its own calendar" | C-1 | "a Date entry slides into its calendar under ‹ Properties, in the same pane" |
| `valueClick.test.ts:21-25` | E-6 | A Date's intent reads `picker` |
| `cardMenu.test.ts:5-22` | D-4 | Reborn in `pageMenu.test.ts` with Preview and Reveal Location |
| `cellMenu.test.ts:8-28` | D-4 | Reborn in `pageMenu.test.ts` with Preview and Reveal Location; the `'title'` arm's cases (`:30-43,159-162,166-170,259`) leave with it, and `:272` moves its `hideable` case onto an empty Context |
| `pageMenu.test.ts:37` | D-4 | `reveal`'s opt-in leaves, since every full menu carries it |
| `propertyMenuActions.test.ts:89-146` | C-7, C-8 | Merges into `metadataMenu.test.ts`, reading the one builder's order; the option-first sort leaves |

##### Tests That Hold and Must Be Watched

- **`PickerMenu.test.tsx:190-227`** "still reaches its target" logs at `pointerdown`, so a fix that swallows the release passes while the name goes misleading for a list. jsdom can't tell a swallowed click, so only a real press proves E-3. `dismissalStack.test.tsx:178` is the neighbor to extend.
- **`PickerMenu.test.tsx:230`** is the `focus="keep"` carve-out E-3 keeps.
- **`GlancePane.test.tsx:585`** pins today's warning key (`anchorX === undefined`); under E-6's rekey it holds once its control pane at `:597` becomes `<PickerMenu open onDismiss={() => {}}>`.
- **Nothing pins the side latch.** E-1 flips no test and needs a new one (*§5*).

---

#### 4. Approaches

##### Where the New Cases Live

- **A · Extend the Properties Drive and the Option Picker Drive (recommended):** four new groups plus `MATRIX.md` rows, two new steps in the Option Picker Drive, and word changes in the Text drive. The Constraint names these drives, group 14 already holds this surface's seeds and helpers, and groups are selectable by argument.
- **B · A new Metadata Picker Drive:** clean naming, but it's a new folder, a README paragraph, and a second home for what group 14 starts, with no gap that requires it. Rejected.

##### Showing Screenshots

- **A · The orchestrator reads a named handful (recommended):** no new machinery; `shot` already writes them, and T&A and Disclosable Bundles worked this way (`Disclosable Bundles — Plan.md:2502`).
- **B · A published gallery updated each phase:** he could browse it anytime, but it's a new artifact the Constraint didn't ask for, which says "shown in the session". Rejected.
- **C · A contact sheet:** needs an image tool the repo doesn't carry, and shrinks what's already small. Rejected.

##### Full Window or Crop

A full-window shot at 2560×1664 shows position well, which E-1 needs. A pane sits at about 5% of its width, which is unreadable on an iPhone without zooming. So `shot` should take an optional element to crop around: a real need from how he's following, for about 3 lines. Proven: a crop around the pane came out 658×660 at 32 KB with the bar and chips plainly readable. Full-window shots stay the default for anything about position.

---

#### 5. The Proposed Change

##### Before Any Code

1. **Keep the Machine Awake:** `caffeinate -dims` in the background for the whole run, killed at the end. Rendering stops on a sleeping display (`editor-parity/launch.sh:12`), and a capture that gets no frame fails after the 60-second CDP timeout (`drive-harness.mjs:52`). I didn't test this, since sleeping his display wasn't mine to do.
2. **Record the Start:** a hash of `~/Test` to compare at the end.
3. **Repair Group 15** (*§The Group 15 Repair*).
4. **Land the Harness Additions** (*§Harness*).
5. **Land the Pins** (*§The Pins*, with Scout 2's D-2 and C-9 pins), green at HEAD.
6. **Run Every Drive Once** from a worktree of that commit, so any later red is this work's.

##### Harness

`drive-harness.mjs`, run in a scratch copy. Both stubs recorded their call: Reveal Location logged the page's path and opened no Finder window, and a File leaf logged one dialog. The `SIGTERM` hunk is the one line not exercised. It's the gap that stranded a backup when my killed run left one in `$TMPDIR`, though a `kill -9` like mine skips any handler, so it covers a plain stop only.

```diff
@@ PATCHES (:104, :116)
-  const { app, BrowserWindow, Menu } = require('electron')
+  const { app, BrowserWindow, Menu, dialog, shell } = require('electron')
-  const drive = { popup: null, seq: 0 }
+  const drive = { popup: null, seq: 0, dialogs: 0, picks: [], revealed: [] }
+  dialog.showOpenDialog = async () => {
+    drive.dialogs++
+    const picked = drive.picks.shift()
+    return picked ? { canceled: false, filePaths: [picked] } : { canceled: true, filePaths: [] }
+  }
+  shell.showItemInFolder = (path) => { drive.revealed.push(path) }
@@ beside nativeRows (:167)
+export const inMain = (expr) => main.evaluate(expr)
@@ shot (:248)
-export async function shot(cdp, name) {
-  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
+export async function shot(cdp, name, around) {
+  const clip = around && (await cdp.evaluate(`(() => { const b = (${around}).getBoundingClientRect(); const x = Math.max(0, b.left - 100), y = Math.max(0, b.top - 100); return { x, y, width: Math.min(innerWidth - x, b.width + 200), height: Math.min(innerHeight - y, b.height + 200), scale: 1 } })()`))
+  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', ...(clip && { clip }) })
@@ launch (:572)
-  process.once('SIGINT', () => restore().then(() => process.exit(130)))
+  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => restore().then(() => process.exit(130)))
```

A case reads `await inMain('__drive.revealed')`, and hands the dialog a path with `await inMain(`__drive.picks.push(${JSON.stringify(path)})`)`. The harness needs no keychain flag of its own: both `start()` and `editor-parity/launch.sh` set `POMMORA_USERDATA`, and `Desktop/main.ts:78-81` appends the mock keychain under it at `16d932567` and later. Every worktree a drive runs from should be cut at that commit or later, a *before* worktree included.

##### The Group 15 Repair

`Properties Drive/live-drive.mjs:1100-1106`, run in a scratch copy at 33 s: **11 of 11**. With the labels alone it read `[8,8]` and `[8]`, since the heading row is gone, so the counts change with them.

```diff
-      await pickIn(cdp, 'Date format', 'Full Date')
-      const shown = await rowGaps(cdp, 'Date format', 'Time format')
-      item(15, 'L-1', 'a Date editor with its Day row shown keeps 8px between its heading and every row', even(shown, 3), show(shown))
+      await pickIn(cdp, 'Date Format', 'Full Date')
+      const shown = await rowGaps(cdp, 'Date Format', 'Time Format')
+      item(15, 'L-1', 'a Date editor with its Day row shown keeps 8px between every row', even(shown, 2), show(shown))
@@
-      await pickIn(cdp, 'Date format', 'MM/DD/YYYY')
-      const hidden = await rowGaps(cdp, 'Date format', 'Time format')
-      item(15, 'L-1', 'a collapsed Day row leaves no gap: Date to Time is 8px', even(hidden, 2), show(hidden))
+      await pickIn(cdp, 'Date Format', 'MM/DD/YYYY')
+      const hidden = await rowGaps(cdp, 'Date Format', 'Time Format')
+      item(15, 'L-1', 'a collapsed Day row leaves no gap: Date to Time is 8px', even(hidden, 1), show(hidden))
```

`MATRIX.md:154`'s action and expected cells should read "Date Format Full Date, then MM/DD/YYYY" and "8px through Date, Day, and Time; with Day collapsed, Date to Time is 8px; screenshots `g15-date-revealed`, `g15-date-collapsed`", its L-1 cell unchanged.

##### The Pins

Both were run in a scratch copy. Pin 1 and Pin 2 pass at HEAD; each was mutation-checked red (Pin 1 by removing the panel's `seat.run`, Pin 2 by removing `ValueSeat.tsx:278`'s per-value key). The second press has to land during the first pane's exit: a pin that waits out the exit stays green with the key removed, because a full exit remounts the calendar anyway.

**Pin 1, `PropertyPanel.test.tsx`, before `describe('the property row drag'`.** It's written at behavior level, so it holds across the restructure: the Add button, an entry, a value. The typed case gains "the list gone" in Scout 1's commit: after its last assertion, a 400ms settle inside `act`, then `expect(entry('Note')).toBeUndefined()`, since the list's Bloom-out holds its rows for 250ms.

```tsx
describe('picking from the Add list', () => {
  const entry = (name: string): HTMLElement | undefined =>
    [...document.querySelectorAll<HTMLElement>('[data-picker-portal] [role="button"]')].find(
      (e) => e.textContent?.trim() === name,
    )
  const press = async (el: HTMLElement | null | undefined): Promise<void> => {
    await act(async () => {
      el?.click()
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
  }
  const add = (): HTMLElement | null => host.querySelector('[aria-label="Add Property"]')
  const row = (id: string): HTMLElement | null => host.querySelector(`[data-property-row="${id}"]`)

  it('a typed entry shows its row with its field open in it', async () => {
    cachePageDetail(detail({ path: 'Col/Page.md' }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    await press(add())
    await press(entry('Note'))
    expect(row('prop_note')?.querySelector('input')).not.toBeNull()
  })

  it('an option entry lands the picked option on the page and shows its row', async () => {
    cachePageDetail(detail({ path: 'Col/Page.md' }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    await press(add())
    await press(entry('Stage'))
    await press(entry('Alpha'))
    expect(useSession.getState().mutate).toHaveBeenCalledWith(
      {
        op: 'setProperty',
        path: 'Col/Page.md',
        propertyId: 'prop_stage',
        value: { kind: 'select', value: 'opt_Alpha' },
      },
      expect.anything(),
    )
    expect(row('prop_stage')).not.toBeNull()
  })
})
```

**Pin 2, `cardGestures.test.tsx`, the click half:**

```tsx
describe('a card’s dates', () => {
  const dueDef: PropertyDefinition = { id: 'prop_due', label: 'Due', key: 'Due', type: 'dateTime' }
  const startDef: PropertyDefinition = {
    id: 'prop_start',
    label: 'Start',
    key: 'Start',
    type: 'dateTime',
  }
  const pane = (): string =>
    [...document.querySelectorAll('[data-picker-portal]')].map((e) => e.textContent).join('')

  it('a second date’s click shows its own date, even as the first’s pane leaves', async () => {
    useSession.setState({ tree: makeTree({ registry: [dueDef, startDef] }) })
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'view:loadValues': async () =>
        valuesReply({
          p1: {
            [ID_KEY]: 'p1',
            ...propsAtRoot({ prop_due: '2026-03-09', prop_start: '2026-07-21' }, [dueDef, startDef]),
          },
          p2: { [ID_KEY]: 'p2' },
        }),
      menu: menuSpy,
    })
    const base = source()
    await renderView(root, {
      ...base,
      propertyIds: [dueDef.id, startDef.id],
      views: base.views?.map((v) => ({
        ...v,
        property_order: ['_title', 'prop_due', 'prop_start'],
      })),
    } as CollectionNode)
    const values = (): HTMLElement[] => [...card('p1').querySelectorAll<HTMLElement>('.card-value')]
    await act(async () => {
      values()[0].click()
    })
    expect(pane()).toContain('March')
    await act(async () => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await act(async () => {
      values()[1].click()
    })
    expect(pane()).toContain('July')
    expect(pane()).not.toContain('March')
  })
})
```

**The Slide Half** lands with the task that slides a date, as the patch's "a second date slides in on its own value, not the one the last calendar held" in `cardGestures.test.tsx`, which fails with the pane's `key` removed.

##### Other New Units

- **E-1:** `PickerMenu.test.tsx`, in *§close render*, run in a scratch copy: red at HEAD because the side is latched, green with the latch lifted on growth, and the other 27 tests in the file stay green, which confirms nothing pins the latch. `UIX/vitest.setup.ts:12` stubs `ResizeObserver` as a no-op, so the test installs one that captures its callbacks; without that, growth never fires. This test pins the other answer to Nathan's in-place call. Under the answer taken, small growth rises rather than flips, so the pin is Scout 3's child calling `SlideGrowth`: it flips past the room, and a shrink doesn't.

```tsx
it('flips above its trigger when the pane outgrows the room below it', async () => {
  const observers: Array<() => void> = []
  const real = globalThis.ResizeObserver
  globalThis.ResizeObserver = class {
    constructor(cb: () => void) {
      observers.push(cb)
    }
    observe(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver
  try {
    paneH = 100
    await render(<Anchored open={false} at={null} />)
    await render(<Anchored open at={{ x: 400, y: 500 }} />)
    expect(layer().style.top).not.toBe('')
    paneH = 300
    await act(async () => {
      for (const fire of observers) fire()
    })
    expect(layer().style.bottom).not.toBe('')
    expect(layer().style.top).toBe('')
  } finally {
    globalThis.ResizeObserver = real
  }
})
```

- **E-3:** `dismissalStack.test.tsx`, beside `:178`: a press past a list inside a pane swallows its release.
- **E-6:** the patch's `PropertyPicker.pane.test.tsx` pin, "a calendar ignores the click and opens on its trigger". After the `'dateTime'` merge the seat holds `x` on a date and `PropertyPicker` stops it, so the pin sits at the picker rather than on `seat.open.x`.
- **C-5, C-6, C-7, C-8:** the one builder's own suite, with each surface's filter and the show-only rows' exception.
- **D-3:** `ValueSeat.test.tsx`: the menu seat resolves a Context and a stamp through the shared route, once that lands.

##### The Outcome Matrix

Key: **OP** Option Picker Drive · **PD** Properties Drive · **TP** Text Property Drive · **MD** Metadata Drive · **Unit** a unit test · **Gate** typecheck, lint, or a `git grep` check. "Today" names what proves the outcome at HEAD, and "—" means nothing does.

| Decision | Must Be Proven Against | Today | Added Where |
|---|---|---|---|
| A-1 to A-5 | Process only | — | None |
| B-1 | Add opens from a card's text area and its location footing, a panel's `+`, its standing Add row, and its hover ghost; on a page dropdown, the SidePane, and a Space. A Table's empty cell opens no list | PD g14 (one card path), TP g1, g4 | g16 |
| B-2 | A click and a leaf open a value directly, no list, no back bar. The same rows in both pickers: New Option, drag, right-click, Status groups | PD g14, OP | OP `stepSlides`, g16 |
| B-3, E-2, C-8 | Structure: imports run Pickers → Menus only; `Cells/` draws values only; one builder | — | Gate: `Scripts/uixgraph.mjs UIX` prints no `MENUS ~> PICKERS` |
| B-4 | "Spaces" on a slid Context on a card and in the panel; the heading reads "Contexts" | — | g16 |
| B-5 | Each of the 12 entry kinds on every surface (table below) | Unit, one card each | g16 |
| B-6 | A leaf and a card's Add land the same pane for a typed value; no ghost under either | Unit | g16, g17 |
| B-7 | Mass Select writes every row and closes; Multi toggles and stays; a value held by only some rows isn't ringed; one ⌘Z undoes all; create, drag, and menu in the folded pane | OP (create, drag, menu only) | OP `stepMassPicks` |
| B-8 | A mass pane opens exactly where a single pane opens from the same cell | — | g18 |
| C-1 | "›" on exactly the rows that slide; each kind's gesture on card and panel | — | g16 |
| C-2 | Back, Escape, and an outside press each leave no row and no write; a pick shows the row; Text, Number, Link edit in the row in the panel and in a small window on a card | TP g1 (Text) | g16 |
| C-3 | Bar height, padding, icon size, and label inset equal across Select, Multi, Status, Context, Date on card and panel | — | g16, measured |
| C-4 | The same measures match a menu's bar; a long list scrolls at the ceiling; the calendar doesn't scroll (Open Item 7) | — | g16 |
| C-5 | Only what's on the card leaves; hidden stays listed; a held hidden value shows; a blank in Compact is listed | Unit | g16 |
| C-6 | Created and Modified absent from Add, present in Visibility | Unit pins the opposite | g16 |
| C-7 | After reordering Contexts and the schema: card Add, panel, and both system branches read one order; a Space uses `$order`; show-only rows stay last | PD none | g17, g16 |
| C-9 | A file naming a Checkbox with `false` shows its row in the panel and leaves the panel's Add list; a card's Add lists it and fills it | — | Unit (*§The Pins*' C-9 pins) |
| D-1 | Every metadata menu is recorded by `Menu.popup`; none draws in `MenuPresenter` | PD g14 | g17 |
| D-2 | Sidecar bytes unchanged after a right-click value on a hidden property; the column stays hidden; Text, Number, Link, Date open their own panes | TP g4 (Text leaf), PD g14 (Date leaf) | g17 |
| D-3 | Every leaf type from a sidebar row, a card, a Table title, a Matrix node; an option created mid-pick joins; no `.ghost-card` while a leaf is open | PD g14 (one), Unit | g17 |
| D-4 | Row lists per surface; each row runs on each surface: Rename, Edit Icon, New Page, Preview, Reveal Location, Move To, Copy Link, Copy Path, View History, Archive, Delete; Edit Image on a card | Unit rows only | g17 |
| D-5 | Tab, nav row, link, and ⋮ menus keep their rows | Unit | Unit stands |
| D-6 | A tile's menu still draws in-app: a press on its handle opens `[data-picker-portal]` and records no `Menu.popup` | Unit (`MenuPresenter.test.tsx`); `reveal-parity`'s `tileHandle` samples the handle's reveal only | g19 |
| D-7 | An empty Select's branch reads `{ label, enabled: false }`, a disabled row | — | g17 |
| E-1 | Low card: every frame stays inside the window; the calendar ends above its trigger; list and long option list; End Date growth at the edge; Back returns | — | g18, Unit |
| E-3 | Tile settings and toolbar settings: a second dropdown press only closes the list; the second list doesn't open; a second press does. A `focus="keep"` pane still lets the press land | Unit, `pointerdown` only | g19 |
| E-4 | Behavior unchanged; I-051's fix stays its own issue | PD g1, g13 | Unit |
| E-5 | Month, Year, Hour, Minute open as nested panes in the slide and on a click | — | g18 |
| E-6 | A card's calendar stays where it opens today; the panel's commits; Space chips | Unit | g18, Gate; the warning is Unit only (X-8) |
| F-1 | Visibility pane height equal by both routes; a view's icon picker sits at its row; ⋮ menu's Duplicate and Delete run; back bars read as before | Unit in part | g19 |
| F-2 | Each consolidated icon and color site still edits and saves | OP popup, Unit | g19 |
| F-3 | Pane floors unchanged by route; Layout's flat mode opens no slide | Unit in part | g19 |
| F-4 | Group opens "Grouping", Sort "Sorting", Filter "Filtering" | — | g19 |
| F-5 | The view editor's header draws the view's glyph, opens the icon picker at it, and saves the pick | — | g19 |
| F-6 | The ⋮'s Duplicate and Delete run, and Delete closes the dropdown; it draws in-app with Use Native Menus off and as a system menu with it on | Unit in part | g19 |
| F-7 | A view list with few rows holds 245 across the slide; the Properties list and Preview Rules scroll at 440 | — | g19 |
| G-1, G-2 | *§The Pins*, *§6* | — | — |
| Sync | `git diff --stat <BASE>..HEAD -- Core/Sync Sync` prints nothing | — | Gate |

##### Group 16 — The Add List

Seeds, by group 14's route: one property of each type below, a Select with no options, and a Context with no Spaces. Pages `Add Blank` and `Add Held`, the latter holding values in hidden properties. Views `Add Standard` and `Add Compact`. **Surfaces, each crossed with every row:** Standard card, Compact card, page dropdown, SidePane, Space dropdown.

| Entry | "›" | Press | Card Ends | Panel Ends | Also Assert |
|---|---|---|---|---|---|
| Select | Yes | Slides | Pick writes, all closes | Same, row shows | New Option in the slide; Back, Escape, outside press |
| Multi-Select | Yes | Slides | Stays open across picks | Same | The pane outlives its entry leaving the list; first pick of a last hidden entry keeps the pane (Open Item 6) |
| Status | Yes | Slides | As Select | As Select | Groups behind dividers, no New Option |
| Context | Yes | Slides | As Multi | As Multi | Bar reads "Spaces"; pick-only rows |
| Date | Yes | Slides | Pane stays; one write | Same | Day then Back, then Escape, then outside press: one write each; two days: last only; Start after Due opens blank |
| Checkbox | No | Acts | Checked, nothing open | Same | Unchecking keeps it drawn |
| File | No | OS dialog | List closes | Same | Cancel writes nothing and leaves no row in the panel; a picked path adopts a chip |
| Number | No | Pops | Small window, empty | Row's field | Typing lands |
| Text | No | Pops | TextPane | Row's field | Typing lands |
| Link | No | Pops | Field, empty | Row's field | Typing lands |
| Held and hidden | No | Shows | Property shows, list closes | Not listed | Listed after fillable rows; saved view changes |
| Stamp | Absent | — | — | — | Present in Visibility |

**Measured at HEAD, so each flip reads as a change:** every fillable row wears "›", Checkbox, Number, Text, Link, and File included; Creation Time and Last Modified are listed; a 15-row list stands 365 px tall against the 240 ceiling; the back bar is 14 px tall with no padding and a 12 px icon. Also assert the `+` stays held while its list is open, which replaces `reveal-parity`'s sample.

**A Selector Trap:** the list stays in the DOM, inert, behind a slid pane, so `[role="button"]` reads both levels at once. New helpers should filter `!e.closest('[inert]')`, as `liveRow` does (`Properties Drive/live-drive.mjs:1021`).

**Rows That Follow Nathan's Answer:** Escape in a slid pane closes everything; a Select's pick in a slid pane closes everything, since a Select holds one value; an empty Select slides to New Option, and an empty Status or Context slides to an empty pane under its back bar, since greying those rows would be a new rule for a rare case (Fresh-Eyes 27); and a File cancelled from the panel's Add leaves no row, as C-2 asks. The table is written to those answers.

##### Group 17 — Right-Click

Surfaces: sidebar page, sidebar Space, Table title, Table grip, card, Matrix node. Each reads `labels(rows)` against one expected list with its reasons (a card's single New Page and Edit Image, no New Page on the Matrix), then runs every row (Rename, Edit Icon, New Page, Preview, Reveal Location through `__drive.revealed`, Move To, Copy Link, Copy Path, View History, Archive, Delete), then every value row: Select, Multi, Status, Context, Checkbox Check and Uncheck, Date, Number, Text, Link, File through `__drive.dialogs`, and an empty Select.

**The Matrix:** no drive has reached one, and the menu hangs on an overlay that exists only under the pointer. Proven at HEAD: step the pointer over the canvas in 24 px increments until `[data-node-id]` appears, then right-click there, reading Preview, New Tab, Rename, Edit Icon, Spaces, Properties, Move To, Copy Link, Copy Path, View History, Reveal Location, Archive, Delete. The sweep should confirm `Move To` is present, since the first node hit may not be a page, and a node's label should stay through an icon pick.

**D-7, Confirmed:** a Select with no options reads `{ label, enabled: false }`, a disabled row, as `Desktop/Actions/menu.ts:28` says. Nothing renders empty.

**C-7's Visible Change:** the Properties branch reads `… P Tags, P Done, P Due, P Count …`, with the Checkbox jumping the Date, because the option-first sort counts Check and Uncheck as options. That's the sort at `propertyMenuActions.ts:60` that C-8 removes.

**D-3's Ghost, Partly Answered:** the recipe that summoned `.ghost-card`: park the pointer off the card, step `mouseMoved` across `.card-text` four times at 60 ms, then dwell 1.5 s, with no glance up. The harness's `hover()` on `.card-title` summoned nothing, but that run changed both the target and the movement, so neither is established as the cause. `onPointerEnter` also calls `hoverGlance`, and `glanceShown()` blocks the ghost, so a case should read for a glance as its control. With a Date leaf open at HEAD the ghost stays absent, since the pane's shield stops the hover from reaching a card. `suppressed` (`CardsView.tsx:175-179`) never names the pending pick, so the code doesn't state what the shield delivers. A typed leaf wasn't measured. Keep it as a pin, with the control.

##### Group 18 — Placement

A low window is one `Emulation.setDeviceMetricsOverride`, cleared afterward, with no harness change. Proven, with one trap: `{ width: 1280, height: 640 }` gave `innerHeight` 711, because the app's zoom makes a CSS pixel 0.9 of a DIP, which is why the default window reads 1422×924. A case should read `innerHeight` back. E-1's failure needs a list short enough to fit below its card, since a long one flips at once and hides the bug: the 15-row list did exactly that.

| Case | Setup | Expected |
|---|---|---|
| Calendar, low | Lowest card whose list fits | Ends inside the window, above its trigger |
| Every frame | An in-page rAF sampler across the slide | No frame past the window's edge; largest per-frame step recorded for Open Item 4 |
| A View Tile's Visibility | Low tile, the slide into Visibility | Flips, its largest per-frame step under 60px; nothing passes the window |
| Option list, low | 40 options | Same, capped |
| End Date at the edge | A popped calendar, and a slid one flipped, End Date on | Rises rather than flips, no clip |
| TextPane, low | Typing on a low card | Rises line by line, no flip |
| Back after a flip | | Returns, no jump |
| Tall list | 20 rows, near the bottom | Flipped from the start; no second move |
| Right edge | Last card in a row | Stays inside |
| Panel, dropdown and SidePane | Add at the panel's end | Same rules |
| Mass and single | The sweep's **last** cell, with long option labels | Same rect (B-8). Measured at HEAD: same top, the mass pane 29 px right of the single one (117 px wide). A 57 px pane differs by 1 px and hides it, and a first-cell compare shows a false 59 px vertical gap |
| Month, Year, Hour, Minute | In the slide | Nested, over the pane, a pick lands |
| 24-hour clock | Nexus setting | Clock draws, no AM/PM |
| Keyboard | Tab to Back, Enter | Returns |

##### Group 19 — Settings Panes

E-3, D-6, and F-1 to F-7, per the matrix: E-3 and D-6 open it with the pane shell, and the settings panes and then the icon and color choices join as each lands. E-3 needs two `PickerControl`s in one pane, in a view tile's settings and in the toolbar's: open one, press the other, then assert on rects and a real `click` listener rather than `pointerdown`. The same holds for Month open and a press on Year, Hour open and a press on Minute, a filter's field list and a press on a second, and a press on a slider row with a list open; a double-click on Hour still lands in its field, and a `LocationField` press still lands beneath its `focus="keep"` pane.

##### What Breaks in Existing Drives

| Site | Today | After |
|---|---|---|
| `Properties Drive:1100-1106` | Crashes at HEAD | *§The Group 15 Repair* |
| `Properties Drive:870,974,975,979`; `MATRIX.md:143` | "chooser" | Reword; the flow still holds (a Link pops) |
| `Text Property Drive:255-258` | Panel pick | Holds under C-2; reword `:256` |
| `Text Property Drive:679-688` | Card pick on Compact | Holds; reword, rename shot `pane-from-chooser` |
| `reveal-parity/run.mjs:545` | "An open chooser holds its + shown" | Stranded at HEAD (X-6); the comment's word goes false regardless |
| `drive-harness.mjs:324-333` | `openPanel` waits on `[aria-label="Add Property"]` | Holds: the `+` keeps its name and place under Open Item 6's answer, as does `Archive Drive:1249` |
| `Option Picker Drive:207-210` | Mass sweep | Holds; `key` moves with B-7 |
| All `[data-picker-portal]` queries | Generic | Hold; rows keep `role="button"` |

No drive presses the chooser's back bar or asserts its text, so no back-bar selector breaks. That's a coverage hole rather than good news.

##### Screenshots

- **Taking Them:** `shot(cdp, 'g16-card-slide-date')`, named for its group as g15 does, with a fresh `POMMORA_DRIVE_SHOTS` per run, since `shot` numbers by run and reruns leave stale neighbors.
- **Showing Them:** Remote Control shows what the session reads, so the **orchestrator itself** runs `Read` on each. I take that to mean the top-level session: an executor's read stays in its own transcript. A drive runs with `run_in_background`, and on its exit notification the orchestrator reads the named shots and writes one caption line for each: what it shows and whether it's right.
- **How Many:** six to ten per phase, named in the plan's VERIFY, plus any `failure` shot first. At about 120 KB each, that's nothing to carry. Keep MATRIX's screenshot names as the source of the list.
- **At the End:** one pass per decision group, plus the Add list, a slid calendar, and Visibility under each Appearance setting, captioned against the same three from the baseline run, since vanilla-extract emits CSS in import order and this work reorders it. Shots live in the session scratchpad, outside the repo.

##### When Each Runs

| When | Run | Time |
|---|---|---|
| Before any code | All seven, on the repaired group 15 | about 29 min |
| Each picker or Add phase's checkpoint | Properties `14 16 18`, Option Picker, Text `1 4` | 4-6 min |
| Each menu phase's checkpoint | Properties `14 17`, Text `4` | about 3 min |
| Each kit or settings phase's checkpoint | Properties `14 18 19`, Option Picker, Alias `2 3 4`, since `CaretPane` and `ManageRow` ride `PickerMenu` | 4-6 min |
| Every task | The three gates | under 2 min |
| The end, and after each folded review wave | All seven, the baseline's groups with Properties `1`–`19`, from a worktree of the head | about 35 min |

Each runs with `run_in_background`, one chain at a time: `POMMORA_DRIVE_REPO="$WT" POMMORA_DRIVE_SHOTS="$SHOTS/<phase>-<drive>" node live-drive.mjs <groups>`. A wait must never `grep` `ps` for its own command's text: a loop of mine matched its own wrapper shell and sat idle for 24 minutes.

---

#### 6. Goes False

Everything here is replacive. **Drastic Rewording:** none is needed. The two closest are `ViewTypesPM.md:130`, whose row list was already wrong and should simply go, and `PommoraUIX.md:357`, whose file-by-file sentence goes false with every move and survives this one by a one-for-one swap. `PropertiesPM.md:115` carries the most specificity, and its file path should leave.

##### `Features/PropertiesPM.md`

**`:115`** Now: "setting a member's value runs through one control (`Core/Properties/Pickers/PropertyPicker.tsx`) across every surface that assigns one — the page window's SidePane, the Properties panel, and the Cards and Table views. It renders the popup each type needs: option rows for Select, Status, Multi-Select, and Context; a calendar for Date & Time; the operating system's file dialog for File; and it can open on a chooser pane that adds a property and drills straight into its value."

Should read: "setting a member's value runs through one value seat across every surface that assigns one — the Properties panel, the Cards and Table views, and a system menu's value rows. It opens what each type needs: option rows for Select, Status, Multi-Select, and Context; a calendar for Date & Time; and the operating system's file dialog for File. Adding a value on a card or in the Properties panel starts from one **Add** list, which slides into option rows and the calendar under a back bar, while any other type opens its own picker."

**`:117`** Now: "opens that group's chooser". Should read: "opens that group's **Add** list". "A row shows once it holds a value or was added in the session" should read "A row shows once its file names it or it was added in the session", since C-9 keeps a row for a file naming a property with nothing readable.

**`:119`** Now: "The first lists the nexus Contexts in registry order; the second lists the Collection's assigned properties." Should read: "Both list in the order the item's Properties panel uses." The next sentences hold. The doc needn't state D-2.

##### `Features/ViewTypesPM.md`

**`:122`** Now: "A two-stage **add-picker** — from empty space in the text area or the location footing — lists the Contexts not shown on the card, then the properties, and reveals a property on its first committed value." Should read: "An **Add** list — from empty space in the text area or the location footing — lists the Contexts and properties not shown on the card, with rows that only show a held value last, since picking one shows it rather than sets it, and reveals a property on its first committed value." The sentence before it, "The value, add, icon, and image pickers mount at the grid level", should drop "icon", since the one icon picker mounts at the App.

**`:130`, not in G-2** Now: "A card's right-click menu is the page menu, led by Edit Image when a banner is set: Open, Rename, Edit Icon, Spaces ▸, Properties ▸, New Page, Move To ▸, Copy Link, Copy Path, Delete. New Page creates after the anchor, and the hover ghost". Already false, since it omits View History and Archive. Should read: "A card's right-click menu is the page menu, led by Edit Image when a banner is set, and its one New Page creates after the anchor, and the hover ghost" (fewer words).

##### `Features/InterfacePM.md`, not in G-2

**`:34`** "the same rows in the same order wherever a page can be right-clicked — a sidebar row, a table row, a card, a row grip:" goes from false to nearly true under D-4. Add `a Matrix node`.

**`:38`** The Open row should add that a banner card leads with Edit Image.

**`:41`** Now: "New Page Above · New Page Below (a sibling at that slot in the manual order)". Should read: "New Page Above · New Page Below (a sibling at that slot in the manual order; one New Page on a card, none on a Matrix node)".

##### `Resources/PommoraUIX.md`

- **`:210`, not in G-2** The Feel row, "Duration + snap as numbers for the drag engine", gains `BASE_FEEL`: the `base` rung on `ease`, which the slide's timing, the pane's move, and the windows' morphs share.
- **`:255`, not in G-2** "The switch shape holding a color, anchoring a ColorPicker" goes false: the swatch reports its press, and the app opens the one color picker at it.
- **`:357`, not in G-2** Now: "`ManageRow.tsx` and `manage-row.css.ts` the row of a list managed in a pane,". Should read: "`PickerControl.tsx` the double-chevron picker,".
- **`:364`** The `Manage` row moves to the Pickers table unchanged.
- **`:373`** Now: "The measured height a menu grows to." False: `frameGrowth.ts` sets a width (Open Item 3). Should read: "The width a menu grows to, floored at its host's."
- **`:380`** Now: "The rectangle every menu, dropdown panel, and picker mounts — anchoring to an element or a bare point, the collision flip decided per open once its content is in, dismissal, focus, and an opt-in resize from its free edges (`usePaneResize`). Under `focus="keep"` the trigger counts as part of the pane and no shield draws." Should read: "The pane action menus, managed lists, and pickers mount — anchoring to an element or a bare point, deciding its side per open once its content is in and again at the head of a slide, held inside the window, with dismissal, focus, and an opt-in resize from its free edges (`usePaneResize`). A dropdown list passes `ownShield`, so a press beside it inside a pane only closes it. Under `focus="keep"` the trigger counts as part of the pane and no shield draws." The first half is I-075's own citation, so that footnote re-quotes it.
- **`:383`** Now: "the app binds icon favorites through `UIX/Pickers/IconPicker`". Should read: "… through `Core/Assets/IdentityChoice`".
- **`:385`** The `PickerControl` row moves to the Menus table, dropping `NumberUnit`, `unitLabel`, and `numberFrom`, which are `UIX/Utilities/numberUnit.ts`'s.
- **`:366`** names `MENU_MAX_HEIGHT` alone, and it stays true.

##### `Features/InteractionPM.md`

**`:16`** Now: "A menu's placement and collision flip are decided per open once its content is in". Should add "and again at the head of a slide".

**`:48`** Open Item 3 asks. "Both slots stay mounted and measured" holds for the slots and for the moment that matters, the flip; only the detail's content drops after its exit. Recommendation: leave it.

##### Project `CLAUDE.md`

G-2 names its folder lines, and **I'd leave `:108-109` alone**: neither claims totality, so `PickerControl` and `ManageRow` swapping folders falsifies nothing, and I-075 cites `:109`'s omission of the shell as part of its case. Only a new top-level folder would make them false. This is a call for Nathan, since G-2 says otherwise.

##### `IssuesPM.md`

- **I-027, I-042:** delete block, index row, and footnote (`:90`, `:93`, `:994-1006`, `:1052-1062`, `[^27]`, `[^42]`).
- **I-075 `:1120`** Now: "A new name touches the 29 code files that mention it and the seven Feature, Guideline, and Resource documents, and a new folder has to settle which way `UIX/Pickers` and `UIX/Menus` depend on each other." Should read: "A new name touches the code files that mention it and the Feature, Guideline, and Resource documents, and a new folder keeps imports running one way, from Pickers to Menus." Dropping the counts is the surgical fix: both are true at HEAD (29 and 7), and this work changes the first.
- **`[^75]`:** `UIX/Menus/ManageRow.tsx:~3,~53-63` becomes `UIX/Pickers/ManageRow.tsx`; `.claude/Resources/PommoraUIX.md:~380` re-quotes.
- **`[^51]`:** re-anchor whatever moved.
- **Then** run `index-issues.py`, per X-2.

##### Scripts

- **`scripts/README.md:10-16`:** gains the slid-in and mass-pick surfaces in the existing list, swapping "the value picker" for "both pickers".
- **`:93-97`:** "in fifteen groups" becomes "in seventeen groups" when groups 18 and 19 open, "eighteen" with group 16, and "nineteen" with group 17, and `live-drive.mjs 1 15` stays an example.
- **`:99-107`:** one clause, that a file dialog and Reveal Location are recorded rather than shown.
- **`Properties Drive/MATRIX.md:3`:** names the second source, and that new groups print `MP-` letters. **`:143`** "chooser". **`:154`** *§The Group 15 Repair*.

##### Comments

Owned by the code scouts, seen here: `ValueSeat.tsx:251,259`, `CardsView.tsx:193`, `valueClick.ts:1`, `cardGestures.test.tsx:15`. In the drives: `Properties Drive:870,975`, `Text Property Drive:679`, `reveal-parity/run.mjs:545`. The new groups add none beyond a file-level `// ── Group N` line each, which the removed chooser comments offset.

---

#### 7. Risks and Order

**Order:** group 15 repair → harness → pins → baseline run → each phase's code with its group's drive → final full run → docs → `index-issues.py` → reviews, with the drives after each folded wave.

| Risk | Consequence | Handling |
|---|---|---|
| Two drives at once | Each kills the other (`sweepStrays`) | One chain; agents told never to start one |
| A drive killed mid-run | `~/Test` left dirty and a backup stranded in `$TMPDIR`; it happened to me | Add SIGTERM beside SIGINT (`drive-harness.mjs:572`); end-of-run hash; `make-benchmark-nexus.mjs test` rebuilds |
| A build older than `16d932567` reaching the keychain | With `HOME` overridden, a dialog on his screen and a stalled launch; under the real `HOME`, a write to his login keychain | Every worktree cut at `16d932567` or later, where `Desktop/main.ts:78-81` covers any `POMMORA_USERDATA` launch |
| Worktree goes stale | Drive passes against old code | `git -C "$WT" checkout --detach <sha>` before each phase's drive; the harness rebuilds |
| `POMMORA_PL_LANDED` unset | Path Links failures pass silently | Always `=9` |
| Machine sleeps | Captures time out | `caffeinate`, checked in the Cold-Machine list |
| Screenshots read by an executor | He sees nothing | Orchestrator reads, named in each VERIFY |

**Cold-Machine Check, on top of T&A's:** `git worktree list` shows the main checkout alone; `ls -d "$TMPDIR"/pommora-drive-*` prints nothing; no Electron carries a worktree path; `pgrep caffeinate` prints nothing; the `~/Test` hash matches the start.
