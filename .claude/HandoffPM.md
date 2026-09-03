## Handoff — Pommora

> **User Prompt:** *"Execute the closeout of .claude/Planning/File History — Implementation Plan.md … autonomously and overnight."* — then, awake: *"'Days' should be capitalized"*, *"Write it under Architecture as a short paragraph(s) instead"*, *"The description is true, its device local history even if the toggle is a preference."*

#### Current Focus

**Session ID:** 6136d3e7-c065-4171-a7c4-8303e63d3e74
**Dates:** 09-02-2026 → 09-03
**Model:** Fable 5.1

**Page File History is closed, and its secondary review has landed.** Six report-only lenses, a tests pass, and a final regression pass ran after the closeout; every finding was folded or ruled in the plan's log, the feature is documented as its own section under ArchitecturePM's data layer, and the review's five commits net −11 lines against the arc's +975.

**The closeout.** The arc ran five phases to its Declared Stop and then an unattended closeout: a sixteen-item live checklist (A1–A16) driven over CDP against NexusOS and a scratch nexus, two report-only simplifiers whose twenty-eight findings all folded (`c0f1b184`), a code reviewer that found nothing at its bar, an attacker whose five verified breaks folded with tests (`b1632f28`), and a neutral verifier reading every requirement and Core item as MET. The record landed under ArchitecturePM › Persistence, ConfigurationPM, InterfacePM, PagesPM, NexusRecordPM, and Context's Known Issues, with three lessons in Development-Environment.md.

**Verified live, as distinct from traced.** Capture on the real page: the pre-edit text as `edit`, an in-interval save held, the settled text from the quiet timer at 300 s, an outside edit as `external` from its own timer, a fresh outside text landing at once when the app overwrote it, identical text refused, zero `nexus:changed` pushes from the app's own saves. Restore reached the content pane, the Page Window, and an embed at once, a keystroke in the window saved restored text plus the keystroke, Back re-seeded the restored body, and a trash round-trip kept the rows. ⌘Q exited in 828 ms on one press and left the flush row; a root switch through the native chooser flushed NexusOS and opened the scratch nexus on a fresh store with its garbage file set aside; Clear History confirmed with Nathan's sentence and read Cleared. Screenshots of the window, the menus, and the settings section sit in the session scratchpad under `shots/`.

**Nathan ruled three things live during the closeout**, each landed as it came: the timeframe's unit reads Days (`2bed5ade`); the feature is documented as two short paragraphs under ArchitecturePM rather than its own Features document (`a5662871`); the toggle's hint stands — the history is device-local even though the toggle is a preference.

**What the attack changed.** `replaceBody` cancels the path's pending save before the epoch remount, so a keystroke armed during a restore's round trips no longer writes the old body back; `livePagePath` in `treeIndex.ts` is the one resolver the restore and the window share, so a renamed page keeps its Current Version; the 1 MB cap binds `edit` offers alone; a Clear or Delete frees the interval clock; an identical write offers nothing; `arm` arms nothing while history is off.

#### Completion Criteria

- [x] Every task and gate of the plan landed with its gate green; Gate 4's review ran as the closeout sweep.
- [x] A1–A16 ticked with evidence in the progress artifact; every fix at the source, nothing ruled that could be fixed.
- [x] Two simplifiers, the reviewer, the attacker, and the neutral verifier signed off; every finding folded or ruled in the plan's Log.
- [x] History PM-125, Context, the guideline lines, the plan's Closeout and Delivery Claim committed.
- [x] The throwaway pages, their bundles, their rows, the scratch nexus, and the gate files gone; the dev instance relaunched on NexusOS at the final main.
- [x] The secondary review: cohesion, simplicity, correctness, duplication, stability, debt, the tests, and a final regression pass — folded, gated, pushed.
- [ ] Nathan's own pass: the window against his mock on a real page; the Days unit; the File History section under ArchitecturePM.

#### Next Session

- The external-edit reload: the watcher's `page-upsert` driving `replaceBody`, the mechanism the two-host Known Issue names.
- `versions.db` in NexusOS's repository — a `.gitignore` line in the vault, or a ruling that it stays tracked.
- Nathan's secondary review prompt (cohesion, simplicity, correctness, duplication, stability, debt) was drafted in chat and is his to run.
- Sequenced After in the plan: per-snapshot titles, a diff view on `@codemirror/merge`, per-device store files, a git provider as a second store module.

#### Feedback

- "Anything that can be consolidated should not be left hanging. No simplification opportunities passed."
- "selecting the snapshot should not auto-checkmark. Selection should have the row selected and the snapshot in view; checkmarking it is a separate action."
- "Any parallel working tree edits must be in a separate commit on final closure; they're my own comment pruning."
- "Write it under Architecture as a short paragraph(s) instead."

#### Session Pointers

- The plan and its closing records: `.claude/Planning/File History — Implementation Plan.md` — Rulings, Deviations, Closeout (the Delivery Claim), Completion Criteria.
- The progress artifact: https://claude.ai/code/artifact/4c986520-22fd-4965-b229-ed7d244dbf93 (its JSON and HTML sit beside the plan, untracked).
- The capture rule: `Pommora/src/main/CRUD/fileHistory.ts`; the store: `Database/versionsDb.ts`; the window: `Windows/PageHistoryWindow.tsx`; the restore's renderer half: `Interface/restoreSnapshot.ts` and `navigationSlice.replaceBody`.
- The drive scripts, throwaway, in the session scratchpad: `lib.mjs`, `a1.mjs` (capture, 16 min), `a7.mjs` (hosts, seams, trash), `a4.mjs` (settings), `a3.sh` (quit), `root.mjs` (the native chooser driven by keystrokes), `a5.mjs` (scratch store), `cleanup.mjs`, `locdelta.py` (the +/- with comments and tests excluded).

#### Working Notes

- `electron-vite dev` does not restart Electron on a main-process change; a fresh `env -u ELECTRON_RUN_AS_NODE npm run dev -- --remote-debugging-port=9333` is the only way the new main runs, and a parallel session's relaunch drops the debug port.
- AppleScript's `click menu item` hangs against an Electron context menu; type-select (`keystroke "View H"` then Return) selects the row, and `key code 53` dismisses.
- The native folder chooser is drivable: fire `window.nexus.choose()` un-awaited, then ⌘⇧G, the path, Return, Return.
- A page id minted by hand has to carry the kind mark at index 10 or the store refuses it as a non-page.
- The commit hook stages `.claude` edits on its own, so a draft document rides the next commit by anyone; commit documents as soon as they are true.

#### Changes

**FILES ADDED**

- Pommora/src/main/Database/versionsDb.ts · versionsDb.test.ts · sessionDb.test.ts · CRUD/fileHistory.ts · fileHistory.test.ts
- Pommora/src/shared/fileHistoryMenu.ts · fileHistoryMenu.test.ts
- Pommora/src/renderer/Windows/PageHistoryWindow.tsx · page-history-window.css · Interface/restoreSnapshot.ts · Store/replaceBody.test.ts · DesignSystem/Util/checkSet.ts · Settings/ClearActionRow.tsx (renamed from ClearExclusionsRow.tsx)

**FILES MODIFIED**

- .claude: HistoryPM.md · ContextPM.md · HandoffPM.md · Guidelines/Development-Environment.md · Planning/File History — Implementation Plan.md
- .claude/Features: ArchitecturePM.md · ConfigurationPM.md · InterfacePM.md · NexusRecordPM.md · PagesPM.md
- Pommora/src/shared: types.ts · bridge.ts · pageMenu.ts · connMenu.ts · cellMenu.ts · cardMenu.ts
- Pommora/src/main: index.ts · sessionDb.ts · exclusion.ts · watcher.ts · watchPatch.ts · valuesChanged.ts · readNexus.ts · contextMenu.ts · Database/driver.ts · IO/pageFile.ts · IO/atomicWrite.ts · IO/navigationFile.ts · CRUD/page.ts
- Pommora/src/preload/index.ts
- Pommora/src/renderer: App.tsx · treeIndex.ts · Store/previewSlice.ts · Store/navigationSlice.ts · Store/tabState.ts · Interface/PageView.tsx · Interface/pageFlush.ts · SurfacePM/PageTile.tsx · SurfacePM/tileCache.ts · Windows/useWindowWarm.ts · Windows/PageWindow.tsx · Windows/confirmations.ts · Settings/SettingsWindow.tsx · Settings/TrashFrame.tsx · Frames/PageMenu.tsx · Frames/SettingsFrame.tsx · Actions/pageMenuActions.ts · Links/ConnectionPane.tsx · MarkdownPM/AutocompletePane.tsx · Views/CardView/CardsView.tsx · Properties/Assignment/formatValue.ts · DesignSystem/Menus/menu-base.css.ts · menu-row.tsx · index.ts · DesignSystem/Elements/NavTrail/NavTrail.tsx · index.ts · DesignSystem/Elements/PickerControl
- The matching test files beside each of the above.

**FILES REMOVED**

- Pommora/src/renderer/Windows/pageHistoryModel.ts · pageHistoryModel.test.ts (folded into the window at the closeout)

**COMMITS**

- `ac153859` Task 1 · `12f6404f` Task 2 · `507232e8` Task 3 · `1ef7370a` `a2435dea` Gate 1
- `a4e33d6b` Task 4 · `3a0ce799` Task 5 · `79337e52` `6dd39091` `d8cb7095` `266e85fc` `6b5f7feb` Gate 2
- `d20c6324` Task 6 · `b1df9dfc` Task 7 · `c2bf15f3` Gate 3
- `085bfe51` Task 8 · `bc020d83` Tasks 9 and 10 · `6b9f7bc2` `3d10828b` `93fbcad5` `c4cf76ff` Gate 4
- `47ebcd65` the scout's leftovers · `c0f1b184` the simplifier sweep · `2bed5ade` Days · `a5662871` the documents · `b1632f28` the attack · `b0bf0f1d` the record
- The secondary review: `1866ca5d` cohesion and simplicity · `9aa3a4af` correctness and duplication · `3ad1c405` stability and debt · `c86026c0` the tests pass · `c770e9a4` the final pass and the ArchitecturePM section
- Nathan's own, interleaved: `5e13fd47` `86eafc48` `bd8725b3` `b35cb697` `82583e3b` `f7f81b81` `f8d7398a` `f556c354` `f9f9a2c1` and the tab work before them; his comment pruning (`OutlineMenu.tsx`, `WebWindow.tsx`) lands as its own commit at the push.

#### Handoff Guidelines

- §Current Focus names its focus in the first line and separates what was verified from what was assumed.
- A criterion is a checkable statement about the work; process steps do not belong here.
- §Changes comes from git, and a file that rode another session's commit is said to have done so rather than listed as this session's.
