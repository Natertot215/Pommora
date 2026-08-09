## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Session Summary

**Session ID:** 5d28593d-449f-4f5f-8728-8218f1e557fe
**Dates:** 08-08-2026
**Model:** Opus 5 (1M context)

The session opened on documentation and ended on the write path, and the hinge between them was a question that dissolved when it was actually read. The first ask was to reconcile the Handoff against Context and prune Current Focus to next-task terms. That went cleanly: the retrospective paragraphs came out because Recent Work already held them, the Handoff's standing content routed to its real homes — the decision writeup and the `/simplify` findings to Context, two dev-process traps to `Build-Gotchas`, three durable lessons to Context's Lessons — and both its Pending Focus and Working Notes emptied and were deleted rather than left as hollow headers. One Working Note claiming the Studio's own skills don't resolve through the Skill tool was simply false this session and went with them.

The second ask was to explain the native-menu decision, and the honest answer turned out to be that there wasn't one. Relaying the retired Handoff's framing without checking it was the session's first mistake: read against the code, the "two ways to keep the confirm guarantee" were not a fork — `BlockHandleMenu` already ships an in-app menu whose Remove calls `blocks:confirmRemove`, so the recommended route was the existing house pattern and Nathan's own prior call. The blocker was also far narrower than stated. Only three items across `optionMenu` and `propertyMenu` run a confirm at all; everything else, including the page value row's Clear and Remove that the previous session had made native "for their confirm," resolves with no dialog. `viewButtonMenu`'s submenu is a two-option toggle the house rule already answers with a switch. The whole area collapsed to one line in Debt.

The third ask was for a grounded recommendation on what to build next, independent of what either document claimed, produced by five agents each carrying a different definition of "important" and converged into a ranking. That worked well — the lenses agreed on the trash browser from three directions, and each found things the backlog had never named. The correctness lens was the one that mattered: a container's sidecar had writers spread across three lock keys with several holding none, a page relocate held no lock while every other write to that page did, and there was no single-instance guard at all. Every load-bearing claim was opened and verified before ranking, and one ContextPM entry turned out stale — the "four disabled affordances" are three; the ViewSettings icon picker does not exist.

The write-path work then ran in three commits. The first converged every container-sidecar writer onto one key built in the path module, put the page relocate under its source path's lock, moved `updatePageBody`'s existence check inside its own lock so the guarantee stops depending on a caller, made a move's trailing order write best-effort, and added the single-instance lock. Regression tests were confirmed against the unfixed tree before being kept — three of five went red and the ghost page reproduced exactly, the folder listing both the renamed file and the resurrected one.

The closeout found the first pass incomplete against its own claim. `restoreCachedValues` writes the sidecar at its tail and had no lock, so "every writer takes the key" was not yet true; `sidecarIO` was still hand-building the sidecar path directly beneath the helper added to stop that; and three comments described a world that no longer existed, one of them mine. The third commit closed the last unlocked page write: `restoreProperty` was calling `updatePageProperty` bare. That function deliberately takes no lock of its own — its callers need a span wider than the write, because a rename sweep passing the page between the definition read and the write strands the value under a key the sweep has moved past — so the lock stayed at the caller and the precondition is now stated on the function, since a future reader comparing it to `updatePageBody` would otherwise "fix" it into a deadlock.

**Verified:** typecheck clean on both projects, `biome lint` clean over 726 files with zero warnings, 2,246 tests across 198 files, `build` green — re-run after every removal, not once at the start. Both remaining races are pinned by tests proven red against the unfixed code. **Assumed:** nothing user-visible changed, so none of it wants hand verification; the single-instance lock is a main-process change and will not be live in a running dev session until it restarts.

#### Next Session

- **Brainstorm what heals an interrupted cascade** — stated in full as an Open Question in ContextPM. Open it with the brainstorm, not with code: the fork is whether a property rename wants a journal of its own or whether an open-time orphaned-key check answers it and more besides.
- **Push.** 109 commits sit unpushed on `main`. Everything gating them is now closed.

#### Pending Focus

The survey that opened this session produced a ranked read of what to build next, and the three that outlive it are now Next-Feature Candidates in ContextPM: the trash browser, the main pane's Inspector, and the inert unresolved `[[Link]]`. Any of them is a legitimate pick over the cascade question if that brainstorm stalls — the trash browser is the one three separate lenses ranked highest.

#### Feedback

- *"I have ADHD so I want a clear reccomendation, independent from what the Handoff or ContextPM claims, about what's actually appropriate to do next."*
- *"Grounded in what's real: Open the actual files, docs, and call sites — don't recall them. A claim about a file, type, or behavior you haven't opened is a hypothesis, not a fact. Don't be satisfied with a description of a mechanism or feature you haven't actually seen yourself — descriptions of how something works aren't a guarantee that it works the way it's described; explore the chain and ground yourself in truth independently."*
- *"Please explain if theres actually a decision to make here."*
- *"Find the simplest fix to these issues."*
- *"Explain this to non-technical Nathan."*

#### Session Pointers

- The write-path law and its two keys: `io/fileLock.ts`'s header states why a key is built in one place, `paths.ts`'s `sidecarPath` builds the sidecar one, and `sidecarIO.ts`'s `withSidecarLock` is what every sidecar read-merge-write takes.
- `updatePageProperty` in `crud/page.ts` carries a call-under-the-lock precondition in its docstring, and the reason it cannot take one itself. Read that before touching either of its two call sites.
- The races are pinned in `crud/writePathRace.test.ts`, beside the older `crud/cascadeRace.test.ts`.
- The single-instance lock and its `second-instance` handler sit immediately above the `app.whenReady()` chain in `main/index.ts`.
- Implementation history is `// History` (`PM-History-Index.md` + numbered entries) under `//The Studio//.claude//references//History-Format.md`; the write-path arc is `PM-004`. The pre-08-07 record is archived in that index.
- The PageMenu record: `Planning/PageMenu — Decision Log.md`, with A-1 the only item still `[open]`.
- The properties leaf: `Components/Detail/PagePropertiesPane.tsx` and `pageProperties.css.ts`; `PAGE_PROPERTIES_MAX_WIDTH` is the pane's growth ceiling and the one knob in it.
- The caret nobody sees: `Carets.css` hides every native caret app-wide; `nativeCaret.ts` repaints it. A missing caret is that file's, never the field's.

#### Working Notes

- **The lock takes a raw string and nothing can assert two callers agree on it.** That is the actual cause of the class fixed this session, and it is still live for every non-sidecar file with more than one writer. A branded key type only path builders can mint would make it impossible rather than fixed once.
- **`serializeSchemaOp` is one global chain, not per-file.** Schema ops serialize against each other and against nothing else, which is exactly why property assignment needed its own sidecar lock despite already looking serialized.
- **`setGovernedRootKeys` is an unlocked read-modify-write.** Both its callers now hold the page lock, so it is safe today, but the primitive itself offers no protection to a third.
- **A regression test that passes before the fix proves nothing.** Every test added this session was confirmed red against the unfixed tree — stash the source, keep the untracked test, run, restore. It caught that the new value-write test had teeth and showed exactly which write disappears.
- **Consolidation that stops one layer short of its own module is a repeat shape.** `sidecarPath` was added and then not used inside the file that defines sidecar reads and writes.
- **Three `tabBar.css` knobs do nothing, and one of them says it does.** `--tab-icon`, `--tab-x` and `--tab-plus` sit under the `KNOBS — the whole bar tunes here` header while `TabBar.tsx` passes 14, 11 and 13 as literals past them; `--tab-icon`'s own comment concedes the TSX "mirrors it." Tuning them moves nothing. Left in place deliberately — the question to answer is what they were meant to drive, and whether the TSX should read them or they should go.
- **`ViewPane`'s disabled More menu may be redundant rather than pending** — a view row already carries a working context menu with the same actions. That one wants a product call, not a build.

#### Handoff Guidelines

- The Summary and Pending Focus restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the handoff's cohesion standards.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Context's § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs to know, remove what it doesn't.
- Parallel sessions: the latest /handoff owns the document, and every session's transcript survives through retirement into // Sessions.
- If additional guidelines appear here that aren't in the handoffs template, it means they've been user-added and should be preserved.

---

### Session Transcript

`````
[NATHAN]

1. Reconcile @.claude/HandoffPM.md with @.claude/ContextPM.md and prune the current focus on a next-task basis; current focus is what comes now.
2. The Handoff's live-testing is done; I've confirmed.

3. Explain simply and quickly the menu decision. My guess is that it's about the Remove/Clear split, and that it's hand-rolled across different sources when they all do essentially the same thing. If that's true, then yes, Remove = Remove the property entirely from the selection/page; Clear = clear the value.

[CLAUDE]

Reading the Handoff now — I'll answer the menu question from what the code actually says rather than confirming your guess blind.

- READ: [.claude/HandoffPM.md]

Read the Handoff's structural sections. Before I answer the menu question — your guess and the code may be describing two different things, so let me verify which `Remove · Clear` the decision is actually about.

- GREP: [optionMenu|propertyMenu|viewButtonMenu|iconFavoriteMenu|confirmRemove]
- BASH: check the History folder and recent commits
- READ: [Pommora/src/shared/propertyMenu.ts] -> [Pommora/src/main/optionMenu.ts]
- BASH: read main/index.ts's menu-wiring lines

Verified. Now reading the Context format rules before I rewrite anything, and checking those two modified History files.

- BASH: read Context-Format.md's rules -> check git status and diff -> check commits ahead of origin/main
- READ: [.claude/History/PM-003.md]
- EDIT: [.claude/ContextPM.md]
- GREP: [orphan|pkill|restart|preload] in Build-Gotchas.md
- READ: [.claude/Guidelines/Build-Gotchas.md]
- EDIT: [.claude/Guidelines/Build-Gotchas.md] -> [.claude/ContextPM.md]

[NATHAN]

1. Done.

Please explain if there's actually a decision to make here.

[CLAUDE]

Reading the code before I answer that, because the honest answer depends on what `blocks:confirmRemove`'s consumer actually does.

- READ: [Pommora/src/renderer/src/Blocks/BlockSurface.tsx]
- BASH: read BlockSurface.tsx's confirm-flow lines -> read OptionEditor.tsx's menu items
- READ: [Pommora/src/main/viewButtonMenu.ts] -> [Pommora/src/main/propertyMenu.ts]

Confirmed the mechanism. Updating Context — the confirm claim I wrote is narrower in the code than the Handoff stated it, and your hand checks are done.

- EDIT: [.claude/ContextPM.md]
- BASH: stage and commit ContextPM as "docs(context): the native menus state which items actually depend on being native"

#### Honestly? No. There Isn't One.

I relayed the Handoff's framing last turn without checking it against the code. Having now read it, the "decision" mostly dissolves. Four reasons:

**1. The two options aren't a fork — one is already shipped, and it was your call.** The choice was presented as "native confirm behind a channel" *vs* "build an in-app confirm surface." But the first isn't a proposal, it's the existing house pattern: [BlockHandleMenu](Pommora/src/renderer/src/Blocks/BlockSurface.tsx#L408) is an in-app React menu whose Remove calls `blocks:confirmRemove`, and the channel's own comment says *"Delete keeps the native confirm (Nathan's call)."* You already decided this. And the second option doesn't compete with it — an in-app confirm surface would later swap in behind that same channel without touching any picker. So it's not "pick one," it's "do the shipped thing now, the other whenever it gets built."

**2. The blocker covers far less than the menus.** Between `optionMenu` and `propertyMenu` there are eight items. **Three** actually run a confirm dialog: the property editor's `Delete`, and an option's `Remove` and `Clear`. Everything else resolves immediately with no dialog at all — [propertyMenu.ts:25-28](Pommora/src/main/propertyMenu.ts#L25-L28) returns straight out for any action that isn't `property:destroy`. So `propertyMenu`'s Rename, Remove, and the **page-value Clear/Remove you just built** are native for no structural reason whatsoever. Nothing to decide there — they could convert whenever someone's in the file.

**3. `viewButtonMenu`'s question is already answered by your own hard rule.** Its submenu is `Style ▸ Dropdown / Toolbar` — a two-option mutually-exclusive toggle. CLAUDE.md says dual-option menu toggles use a switch or a toggleable double-chevron, never a dropdown picker. So "hover flyout vs pane drill" was a false choice; you'd never build it as a pane drill. It's a switch. The only reason it's still native is that nobody's done it.

**4. `iconFavoriteMenu`** is picker-in-picker. That's just "don't," not a decision.

**One thing worth naming, since it was your call and the record got it wrong.** The page property row's Clear/Remove went native because *"emptying a row is its one destructive gesture."* That's a legitimate reason — a system menu feels heavier, and you wanted the weight. But the Handoff wrote the reason up as *"native for their confirm,"* which isn't true of that row: it has no confirm. I've corrected Context to say what the code does. If you want that row to actually confirm, that's a real decision — and the only one in this whole area.

**What I'd do:** nothing, as its own task. Convert each menu opportunistically when you're next in its file. It isn't worth a session and there's no ruling to give.

The batch on `main` is clear to push now — say the word and I'll push it.

[NATHAN]

Alright -- if it's not an issue, name it as a one-liner in Context. Then, please ground me in what my next focus should be.

I have ADHD so I want a clear recommendation, independent from what the Handoff or ContextPM claims, about what's actually appropriate to do next. Please send out multiple agents into the recent commits; each agent should gain a different perspective on what "important means" and converge each with 10 recommendations; then, you take all of them and rank them. Then, recommend 3 concrete options we should focus on.

[CLAUDE]

Right — it's cleanup, not focus. Moving it to a one-liner in Debt, then sending the agents out.

- EDIT: [.claude/ContextPM.md]

Context trimmed. Now sending five agents out, each with a different definition of "important."

- DISPATCH: general-purpose — Daily-use friction lens
- DISPATCH: general-purpose — Architectural leverage lens
- DISPATCH: general-purpose — Latent correctness risk lens
- DISPATCH: general-purpose — Shortest-path-to-value lens
- DISPATCH: general-purpose — Model coherence lens

Five lenses back. Before I rank anything I'm verifying the load-bearing claims myself — especially the data-loss ones.

- READ: [Pommora/src/main/io/fileLock.ts]
- BASH: grep for `requestSingleInstanceLock`, every `serializeOnFile` call site, and `setChildOrder`/`updateFolderSidecar`
- BASH: read folderEntity.ts's `updateFolderSidecar` -> mutate.ts's `patchConfig` -> reorder.ts's `setChildOrder`
- BASH: read crud/page.ts's `relocatePage`/`renamePage`

Both data-loss findings check out. Verifying the opportunity claims now.

- BASH: read InspectorPanel.tsx whole -> grep `profileSubtitle` in the renderer -> grep `phantom` in MarkdownPM
- BASH: check ViewSettings.tsx for an icon picker -> grep the bridge for `listBundles`/trash -> grep `flattenStructural`'s renderer consumers
- BASH: read the top of db/schema.ts and db/localState.ts

Five agents back, 44 recommendations. I opened every load-bearing claim myself — the top four are confirmed in code, and one ContextPM entry turned out to be stale.

- RETURN: (Daily-use friction) led with unresolved `[[Links]]` rendering inert with no color, click, or create-on-click — "the single highest-frequency friction for anyone actually taking notes in this app the way its own design implies they should" — then the trash-restore UI gap, ranked by frequency × annoyance.
- RETURN: (Architectural leverage) topped its list with `main/index.ts`'s 1,107-line IPC handler object literal — "the store-split problem's twin... larger in raw size, and currently unrecognized" — confirmed the renderer store split is a comprehension tax rather than a hidden perf bug (all 270 call sites already use selectors), and flagged the `PropertyValue.kind` redundant-identity sweep as a live symptom of the codebase's own "two writers for one fact" defect class.
- RETURN: (Latent correctness) found a container's sidecar protected by four incompatible locking regimes — one of them no lock at all — because `serializeOnFile()` keys on whatever literal string a caller hands it with nothing checking that two callers agree; plus the page-rename-versus-body-write race and the `movePage`/`moveSet` false-failure report.
- RETURN: (Shortest-path-to-value) led with an independent find — the main-window Inspector Panel is a fully-built shell (toolbar toggle, slide animation, resizable persisted-width edge, glass shell) around one empty `<div className="inspector-body" />`, with `PreviewInspector` already doing the job for the preview window — then the trash browser, and corrected one of ContextPM's four "disabled affordances" as overstated.
- RETURN: (Model coherence) found four places the implementation drifts from CLAUDE.md's own promises, headlined by the SurfacePM dashboard living only in `nexus.db` despite "Files are canonical for content" — `ArchitecturePM.md` calls a BlockDoc "not authored content" while `SurfacePM.md` calls the same object "tiles holding real content," and a routine schema-version bump silently wipes a user's entire Homepage construction.

#### The Ranking

**Tier 1 — Silent data loss on your real vault. Nothing else competes.**

| # | Finding | Verified |
|---|---|---|
| 1 | **No single-instance lock.** Every write lock in the app is a process-local `Map`. Two Electron processes on one nexus coordinate *nothing*. Your own Working Note recorded **three live instances at once** — this already fires. [Absent from `src/main`] | ✅ grep, absent |
| 2 | **A container sidecar has three writers under three different locks — one of them none.** `patchConfig` locks on the *file* path; view saves lock on the *folder* path (a different Map key); `updateFolderSidecar` locks on **nothing**. All three read-merge-write `_collection.json`. Drag a page into a Collection while a view saves → one silently erases the other. `patchConfig`'s own comment warns about exactly this failure. | ✅ [mutate.ts:170](Pommora/src/main/mutate.ts#L170), [index.ts:754](Pommora/src/main/index.ts#L754), [folderEntity.ts:73](Pommora/src/main/crud/folderEntity.ts#L73) |
| 3 | **Page rename is unlocked while body writes are locked.** Type, then rename inside the 400ms autosave debounce → the body write can recreate a file at the vacated old path. You get a ghost duplicate holding your newest keystrokes while the renamed file keeps the stale body. | ✅ [page.ts:48-60](Pommora/src/main/crud/page.ts#L48-L60) vs [index.ts:711](Pommora/src/main/index.ts#L711) |
| 4 | **`movePage`/`moveSet` report failure after the move already succeeded.** No rollback; the renderer treats `!ok` as a no-op, so the UI keeps showing the page where it no longer is. | ✅ [mutate.ts:564-595](Pommora/src/main/mutate.ts#L564-L595) |

**Tier 2 — Already built, not reachable.**

5. **Trash browser** — the entire restore engine ships and is tested. There is no bridge entry. *(All three lenses independently ranked this top-4.)*
6. **The Inspector panel** — toggle, slide animation, resizable edge, persisted width, glass shell: all done. The body is `<div className="inspector-body" />`. `PreviewInspector` is a portable body that already does the job.
7. **Unresolved `[[Links]]` are inert** — no color, no click, no create. The "write now, structure later" loop that makes wiki-linking worth using doesn't exist.
8. **Four Personalization settings are modeled, persisted, and invisible** — accent, connection color, default icons, set placement.
9. **Table can't flatten.** `flattenStructural` is passed only by Cards; the pipeline is generic.
10. **`profileSubtitle`** — implemented, tested, read back, zero UI. One text field.
11. **Subfield order persists; there's no drag UI.**

**Tier 3 — Leverage.**

12. **`main/index.ts` holds 1,107 lines of IPC handler bodies in one object literal** — the store-split problem's bigger twin, and nobody had named it.
13. Store split *(confirmed a comprehension tax, not a perf bug — all 270 call sites already use selectors)*.
14. `PropertyValue.kind` redundant-identity sweep.
15. Table virtualization *(smaller than it looks — TanStack Virtual is already wired in IconPicker)*.

**Tier 4 — Model coherence.**

16. **A schema bump wipes every dashboard you've built.** `blockDoc` lives in `local_state`, and [schema.ts:1-3](Pommora/src/main/db/schema.ts#L1-L3) says a version mismatch drops the file because "nothing here is content — that costs a user their folds and tab set." Dashboards aren't folds.
17. Several genuine data channels are `kind: 'raw'`, so throw-safety is enforced twice by two mechanisms with no compiler tie.

**Correction to make:** ContextPM claims four disabled affordances including "the ViewSettings icon picker." It doesn't exist — there's no picker in that file, disabled or otherwise. Three, not four.

---

#### Three Options

**A. Close the write path.** ← **My recommendation**
Findings 1–4 as one session, because they're one subsystem. Add `requestSingleInstanceLock()` (one line, kills the worst class outright). Give every container-sidecar writer one canonical lock key. Put rename inside the same lock as its page's other writes. Make the trailing order-write best-effort instead of a false failure. **Size: one session, mostly small edits.**

*Why this and not something fun:* you are about to move your real knowledge base into this. Findings 1 and 3 lose work with no error and no way to notice — the file just quietly holds the wrong thing. Finding 2's precondition has already occurred on your machine. Every other item on this list gets more valuable after this, and none of them is worth building on a floor that drops writes.

**B. Make what's built reachable.** Trash browser + Inspector panel (5 and 6). Two real surfaces where the hard part already ships and is tested — the restore engine has zero UI, and the Inspector is a finished shell with an empty div. High visible payoff per hour, and it closes the "I deleted something and can't get it back" hole. **Size: one session, maybe two.**

**C. Fix the writing loop.** Unresolved-link create-on-click (7), plus in-view page creation. This is the one that changes how the app *feels* daily — right now every forward reference is a dead end that forces you out to the sidebar. **Size: wants a brainstorm first; it's a design question, not a patch.**

**If you want one sentence:** do A now because it's cheap and the downside is losing work you won't notice, then B, and let C be the next real feature arc once you've brainstormed it.

Want me to start on A?

[NATHAN]

A. Explain this to non-technical Nathan.

[CLAUDE]

#### First, The One Idea Everything Here Rests On

Changing a file on disk is never "edit line 4." It's three steps: **read the whole file, change your bit in memory, write the whole file back.**

Picture a whiteboard you're not allowed to edit in place. To change one line you photograph the board, edit the photo, then wipe the board and rewrite it from your photo.

Now imagine two people doing that at the same time. You photograph the board. I photograph it. You add a line and rewrite the board. I add my line to *my* photo — which never had your line on it — and rewrite the board. **Your line is gone.** No error, no warning. The board just doesn't have it anymore.

The fix is a **lock**: before you touch the board, you take a ticket with that board's name on it and wait your turn. Pommora has a working ticket system. All four bugs are places where the ticket doesn't get taken, or gets taken with the wrong name on it.

#### The Four Problems

**1. The ticket system only works inside one running copy of the app.**

The tickets live in memory. If two copies of Pommora are open on the same Nexus, each has its own private queue and neither can see the other's — so "one at a time" quietly stops applying to everything, everywhere.

This isn't hypothetical. Your own notes from the last session recorded **three copies running at once** on your real Nexus after a `pkill` left orphaned processes behind.

**Fix:** tell Electron "only one copy of me runs at a time — if someone launches a second, focus the window that's already open." One function call. It's a standard feature; it doesn't affect the multi-window plans, because one copy of the app can still own many windows.

**2. Three parts of the app write to the same settings file, using three different tickets.**

Every Collection folder has a settings file beside it holding its properties, saved views, banner, icon, and the order of the pages inside. Three things write to it:

| What you do | Ticket it takes |
|---|---|
| Change the icon or banner | one named after **the file** |
| Save a view | one named after **the folder** |
| Drag a page in (reorders it) | **none at all** |

Three different names means three separate queues. Nobody waits for anybody. So drag a page into a Collection at the moment a view saves, and one silently erases the other — the view you just saved, or the page order you just set, quietly reverts.

The part that stings: the code that takes the file-named ticket has a comment directly above it saying *"two unlocked read-merge-writes lose whole keys."* Whoever wrote that knew this exact hazard and closed it in one place while two others stayed open.

**Fix:** every writer to that file takes the same ticket, named the same way. Mechanical — it's changing which string gets passed.

**3. Renaming a page skips the ticket entirely; saving your typing takes one.**

A page's filename *is* its title, so renaming physically moves the file. Meanwhile, when you type, the app waits 0.4 seconds after you stop and then saves.

Type something, then immediately rename the page. The rename moves the file to the new name. The save — already in flight and still aiming at the old name — finishes and **recreates a file at the old name** holding your newest text.

You now have two pages: the renamed one with your *old* text, and a ghost under the old title with your *new* text. And because the app deliberately ignores file changes it made itself, the ghost doesn't even appear right away.

**Fix:** renaming takes the same ticket as every other write to that page.

**4. Moving a page says it failed after it already worked.**

A move is two steps: relocate the file, then record the new ordering. If step two fails — which problem #2 can cause — the app reports the *whole move* as a failure. The renderer's rule for a failure is "change nothing," so the sidebar keeps showing the page where it used to be. But the file already moved.

You see an error. You see the page in its old spot. It isn't there. You try again and get *"a page with that name already exists."*

**Fix:** the order-write is a nice-to-have, not the move. If it fails, the move still succeeded — report that honestly and let the order fall back to alphabetical.

#### Why This Is Worth Doing Before Anything Fun

Three of these four **lose your work without telling you.** The app doesn't crash, doesn't warn, doesn't leave a mark — it just holds the wrong thing afterward, and you find out weeks later when a note is missing a paragraph you're sure you wrote. That's the single worst failure shape for something you're about to trust with your actual second brain.

And they're all cheap. #1 is one line. #2 and #3 are "pass the same string here as there." #4 is changing what a function returns.

**One honesty note on confidence:** #1 is structural — the protection is simply absent, no timing involved, and it has already occurred on your machine. #2, #3, and #4 need two things to overlap in time. I traced all three code paths and they're real, but I haven't reproduced #3 live — the window is narrow, roughly "rename within 0.4 seconds of typing." Narrow isn't rare when it's a thing you do dozens of times a day.

#### The Plan

1. Single-instance lock + focus-the-existing-window handler. *(minutes)*
2. One canonical ticket name for every container-sidecar writer. *(the biggest of the four)*
3. Rename and move run under the page's own ticket, holding it across the path change.
4. Move stops reporting a false failure.
5. Gates — typecheck, lint, full test suite — plus tests for the two races that now can't happen.

Then I'll correct ContextPM's stale claim about a fourth disabled affordance that doesn't exist.

Say go and I'll start at the top.

[NATHAN]

GO for it.

- **Grounded in what's real:** Open the actual files, docs, and call sites — don't recall them. A claim about a file, type, or behavior you haven't opened is a hypothesis, not a fact. Don't be satisfied with a description of a mechanism or feature you haven't actually seen yourself -- descriptions of how something works aren't a guarantee that it works the way it's described; explore the chain and ground yourself in truth independently.

Find the simplest fix to these issues.

[CLAUDE]

Starting. Reading the real call chains first — every claim I act on gets opened.

- READ: [Pommora/src/main/crud/folderEntity.ts] -> [Pommora/src/main/crud/reorder.ts] -> [Pommora/src/main/crud/views.ts]
- BASH: grep `updateFolderSidecar`'s and `patchConfig`'s callers -> cat containerConfig.ts and sidecarIO.ts
- BASH: cat paths.ts -> grep every `writeSidecar` caller
- READ: [Pommora/src/main/crud/assignment.ts]
- BASH: read mutate.ts's move and rename arms

All four confirmed against real code. Starting with the shared lock key.

- EDIT: [Pommora/src/main/paths.ts] -> [Pommora/src/main/sidecarIO.ts]

Now wrapping the six read-modify-write sites that share that file.

- EDIT: [Pommora/src/main/crud/folderEntity.ts] -> [Pommora/src/main/crud/views.ts] -> [Pommora/src/main/crud/containerConfig.ts]
- BASH: grep `assignInner`'s callers -> `restoreCachedValues`'s sidecar write -> `removeProperty`/`deleteProperty`'s sidecar writes
- BASH: read removeProperty.ts and deleteProperty.ts's unlocked write sites

Two more unlocked writers to the same file — `removeInner` and `deleteProperty`. Routing all of them onto the one key.

- EDIT: [Pommora/src/main/crud/assignment.ts]
- BASH: read removeProperty.ts's write site
- EDIT: [Pommora/src/main/crud/removeProperty.ts] -> [Pommora/src/main/crud/deleteProperty.ts]

Now removing the outer folder-keyed locks in `index.ts` (a second name for the same thing) and aligning `mutate.ts`'s key.

- BASH: read index.ts's view/config handlers -> strip their outer `serializeOnFile(folder, …)` wrap by script
- BASH: check mutate.ts's `paths` import and its rename case
- EDIT: [Pommora/src/main/crud/page.ts]
- BASH: check page.ts's import block
- EDIT: [Pommora/src/main/mutate.ts]
- BASH: swap `mutate.ts`'s hand-built `cfgPath` template literal for `sidecarPath()` by script

Now the single-instance lock. Reading how the app boots first.

- BASH: grep `app.whenReady`/window-creation lines -> read index.ts's boot sequence and its window-focus handling -> cat sessionDb.ts
- EDIT: [Pommora/src/main/index.ts]
- BASH: run typecheck -> run the full test suite

One failure. Reading the test and what I changed rather than guessing.

- BASH: read deleteProperty.test.ts's probe -> deleteProperty.ts's write path -> the rest of the test file

Diagnosed: the test's probe assumes the first `serializeOnFile` call is the page scrub. Assignment now takes a sidecar lock during *setup*, so the probe latches on that instead. The write-ahead property itself is intact — the probe needs to measure what it claims.

- EDIT: [Pommora/src/main/crud/deleteProperty.test.ts]
- BASH: re-run the full test suite

Green. Now regression tests — these races are silent, so they need pinning.

- BASH: grep `updatePageBody`'s callers -> list candidate test files

`updatePageBody` has one caller, which wraps it. Moving the lock inside makes the guarantee structural instead of caller-remembered — same shape as `relocatePage`.

- EDIT: [Pommora/src/main/crud/page.ts] -> [Pommora/src/main/index.ts]
- BASH: read cascadeRace.test.ts and views.test.ts/reorder.test.ts for the house pattern
- WRITE: [Pommora/src/main/crud/sidecarRace.test.ts]
- BASH: run the new test file alone

Now proving these tests actually catch the bug — a regression test that passes before the fix is worthless.

- BASH: check git status
- BASH: stash the source tree (`Pommora/src/main`) and re-run the new test against the untouched tree

3 of 5 red without the fix — including the ghost reproducing exactly: `['New.md', 'Old.md']`. Restoring.

- BASH: pop the stash and confirm the tree is restored
- BASH: run typecheck, the full test suite, and lint together

One unused import left behind. Removing it.

- EDIT: [Pommora/src/main/index.ts]
- BASH: re-run typecheck, lint, and the full test suite

All three gates clean. Now the docs.

- BASH: grep ArchitecturePM.md for existing lock/atomic claims -> read its atomic-write section
- EDIT: [.claude/Features/ArchitecturePM.md] -> [.claude/ContextPM.md]

Now the History entry.

- BASH: check the cumulative diff stat and the new test file's length
- WRITE: [.claude/History/PM-004.md]
- EDIT: [.claude/History/PM-History-Index.md]
- BASH: run all three gates -> stage and commit as `fix(write-path): one lock per file, and one instance over a nexus`

Option A is done and committed as `fea330d2`.

#### What Changed

**The sidecar turned out worse than the survey said — six writers, not three.** Opening every call site found two more nobody had named: the property Remove cache and the nexus-wide property Delete were each doing their own unlocked read-merge-write on the same file. So the count was three lock keys, two writers with none, and one path built by hand as a second spelling of a string the rest built properly.

Fixed by consolidating rather than patching each: `sidecarPath()` in the path module builds the key, `withSidecarLock()` sits beside the sidecar read/write pair it governs, and all six writers take it. The four call-site locks keyed on the bare folder came out — an outer lock under a second name *is* the defect.

**The page relocate** now runs under its source path's key. One thing I changed beyond the plan: `updatePageBody`'s lock lived at its single IPC caller, so the guarantee depended on a caller remembering it. It has exactly one call site today and would silently lose the protection at a second, so I moved the lock inside the function and dropped the outer one. Same shape as the relocate fix.

**The move's false failure** and **the single-instance lock** went in as described.

#### Proof, Not Assertion

I stashed the source, kept the new tests, and ran them against the unfixed tree. **Three of five went red** — and the ghost reproduced exactly:

```
expected [ 'New.md', 'Old.md' ] to deeply equal [ 'New.md' ]
```

That's the duplicate page, on demand. A regression test that passes before the fix proves nothing, so this is the part that matters.

**Gates:** typecheck clean on both projects, `biome lint` clean over 726 files with no warnings, **2,245 tests across 198 files**. Diff is **+190 / −118** code lines across 12 files, plus a 103-line test file.

#### One Test I Changed, and Why

`deleteProperty.test.ts` went red. It mocks the lock primitive and pins "was the recovery record already on disk when the scrub first fired" on the *first* lock call — but assignment now takes a sidecar lock during that test's **setup**, so the probe latched before the act under test began. The write-ahead property itself never moved; the probe was measuring the wrong call. It now only fires on `.md` paths, which is what its own comment claims it measures.

#### Two Things I Did Not Do

- **Folder rename has the same hazard as page rename** — `renameFolderEntity`/`moveFolderEntity` move a folder while its sidecar lock key is derived from that folder's path, so a sidecar write racing a folder rename is unprotected. It's a narrower window (folder renames aren't on a 400ms autosave timer) and fixing it means threading the sidecar kind into those functions. Out of scope for the four; flagging rather than silently leaving it.
- **`app.quit()` vs a hard exit** for the losing second instance — I used `app.quit()`, the conventional pattern, after checking `closeSessionDb()` is null-safe.

#### Docs

`ArchitecturePM` gained a **Write serialization** section under the atomic-write contract — atomicity stops a torn file, the lock stops a lost update, and they're different guarantees. `ContextPM` got the arc, four new Lessons, and its stale claim corrected: the "four disabled affordances" are three, since the ViewSettings icon picker doesn't exist. `PM-004` records it.

**Worth knowing:** the single-instance lock is a main-process change, so your running dev session won't have it until you restart — and if you've got orphaned instances from before, kill them by pid first or the new one will be the loser and exit.

[NATHAN]

Ensure that the finalized form the codebase now takes, and the purpose it provides, is concretely all the intent that remains — no trial-and-error residue, no comments pointing to functionality or reasoning that has since been changed, and no evidence that the work that you've just completed wasn't directed from start to finish through absolute intent. The following criteria must be verified:

- [ ] **Nothing dead survives** — branches that can no longer be taken, exports nothing imports, functions nothing calls, parameters nothing passes, and tests pinning behavior that no longer exists; if you've created *intentional* placeholders or stubs, this shouldn't apply; mark those creations deliberately with comments so that a future agent wouldn't assume they're dead.
- [ ] **No orphaned values** — constants, tokens, types, and CSS variables whose only consumer moved or died. They outlive their use silently, and the next reader spends time assuming they mean something.
- [ ] **No scaffolding from the approach that lost** — flags guarding a path no longer taken, shims bridging a shape that no longer exists, adapters between two things that are now one.
- [ ] **Instrumentation is gone** — logging, probes, timing harnesses, and debug affordances added to get here — confirmed by search rather than memory, since these get added mid-flight and are the easiest things to forget.
- [ ] **Comments describe the code that exists** — a comment explaining reasoning that has since changed argues confidently for a decision that was reversed, which costs more than having said nothing.
- [ ] **Names match current behavior** — a symbol named for what it used to do is the longest-lived residue of all, and renaming it is the cheapest it will ever be.

[CLAUDE]

This is a closeout audit — invoking the skill, then running every criterion as an actual search rather than from memory.

- SKILL: [closeout]
- DISPATCH: code-simplifier — Simplify the write-path lock diff
- RETURN: net −5 code lines across 7 files, no behavior change, no lock span touched. Declined to build a merge-callback helper across the six sidecar wrappers and showed its work — it covers only 5 of 8 bodies, needs two extra escape channels, and would unify three deliberately different not-found messages. Extracted `deleteProperty`'s 18-line loop body into `unassignAndPurge` so `deleteInner` shows its four ordered steps at once, dropped `async` from five functions whose body became a single `return`, and — the load-bearing catch — found `sidecarIO.ts` itself still hand-building the sidecar path directly beneath the helper added to stop exactly that, so `readSidecar`/`writeSidecar` now resolve through `sidecarPath()` too.

Simplifier flagged that my convergence **missed a writer**. Verifying that myself before anything else — my commit message claims every writer takes the key.

- BASH: read `restoreCachedValues`'s tail write -> grep every `rmwJsonStrict`/`writeJson`/`writeSidecar` call across main

Confirmed — `removeProperty.ts:151` is a sidecar write with no lock. My commit claims *every* writer takes the key, so that's my own fix left incomplete, not adjacent work. Checking its callers for nesting, and the second finding.

- BASH: grep `restoreCachedValues`'s and `updatePageProperty`'s callers -> check contextWrite.ts's lock keys -> check reorder.ts's path build
- BASH: read restoreProperty.ts's write site and mutate.ts's `setProperty` arm
- READ: [Pommora/src/main/crud/governedWrite.ts]

`setGovernedRootKeys` is an unlocked read-modify-write too — but that one predates my commit and isn't covered by its claim, so it's a finding, not a fix. Reviewing the simplifier's actual edits before I trust them.

- BASH: diff the simplifier's edits to sidecarIO.ts, assignment.ts, folderEntity.ts -> diff its edits to deleteProperty.ts and removeProperty.ts

The simplifier's edits are sound — no lock span moved, and it correctly caught that `sidecarIO` itself was still hand-building the path the helper exists to own. Now closing the writer I missed.

- EDIT: [Pommora/src/main/crud/removeProperty.ts] -> [Pommora/src/main/crud/reorder.ts]
- BASH: swap reorder.ts's manual sidecar-path build and its `paths` import for `sidecarPath()` by script

Now the six criteria, each as an actual search.

- BASH: grep for consumers of `sidecarPath`/`withSidecarLock`/`unassignAndPurge` -> grep `SIDECAR_FILENAME`/`SPACE_SIDECAR` for orphaned consumers
- BASH: grep for surviving folder-keyed locks -> grep the diff and `src/main` for `console.log`/`debugger`/timing/TODO markers

Criteria 1–4 clean. Now comments and names — reading the headers that described the narrower world.

- BASH: read fileLock.ts's header -> sidecarIO.ts's header and helper doc -> index.ts's container-config comment

One stale comment and one of my own that overclaims. `fileLock.ts` still describes itself as page-only, and my `withSidecarLock` doc implies the banner/icon patches route through it — they share the *key*, not the helper.

- EDIT: [Pommora/src/main/io/fileLock.ts] -> [Pommora/src/main/sidecarIO.ts]
- BASH: grep every touched crud file for lingering lock/race/clobber comments

- BASH: read index.ts's page-body-write comment

Found it — that comment describes a lock the handler no longer holds. And the test file is named for half of what it covers.

- EDIT: [Pommora/src/main/index.ts] -> [Pommora/src/main/mutate.ts]
- BASH: rename `sidecarRace.test.ts` to `writePathRace.test.ts`
- BASH: run typecheck, lint, and the full test suite
- BASH: grep reorder.ts for its now-unused `join` import count
- EDIT: [Pommora/src/main/crud/reorder.ts]
- BASH: run typecheck, lint, the full test suite, and build

All four gates green including build. Reconciling the docs — I put a hard count in them, and the count moved.

- BASH: grep ContextPM/PM-004/ArchitecturePM for the stale "six" count
- BASH: measure the cumulative code-line diff since before the fix
- BASH: replace PM-004's "six unrelated surfaces" framing and its old test filename by script -> recompute its file-by-file line table
- BASH: correct assignment.ts's and removeProperty.ts's/deleteProperty.ts's PM-004 write-up, and ContextPM's matching claim, by script
- BASH: re-run typecheck, lint, and the full test suite -> sweep `git status` across the tree
- BASH: measure the closeout pass's own code-line delta since `fea330d2`

**What changed:** The write-path fix now holds everywhere it claimed to. Every place that rewrites a container's settings file waits its turn on one shared key, renaming a page can't strand the save you were mid-typing, a move that worked no longer says it failed, and two copies of the app can't open one Nexus. The closeout found the first version had left one writer out and three comments describing a world that no longer existed.

**Simplification:** The simplifier's best catch was that `sidecarIO` — the module whose whole job is owning sidecar paths — was still hand-building that path directly beneath the helper added to stop exactly that. Lock key and written path are now one expression instead of two that agree by luck. It also extracted `deleteProperty`'s 18-line loop body into `unassignAndPurge` so `deleteInner` shows its four ordered steps at once, and dropped `async` from five functions whose body became a single `return` — a promise of an await that no longer happens. It declined to build a merge-callback helper across the six wrappers and showed its work: the helper covers 5 of 8 bodies, needs two extra escape channels, and would unify three deliberately different not-found messages. Correct call.

**Verification:** typecheck clean on both projects · `biome lint` **zero warnings** over 726 files · **2,245 tests / 198 files** · `build` ✓. Re-run after every removal, not before.

**Rules:** Respected. One conflict named: the environment says not to call agents unless requested, while StudioMD makes `code-simplifier` mandatory before calling multi-step code work complete and `/closeout` Step 1 mandates it. I treated invoking the skill as the request. No separate comment-killer run — the simplifier reported none warranted, and I disagreed and found three myself rather than dispatching a second writer at the same tree.

**Purge:**

- **Dead:** none. Every new export (`sidecarPath`, `withSidecarLock`, `unassignAndPurge`) has real consumers, verified by search.
- **Orphaned:** none. `SIDECAR_FILENAME` and `SPACE_SIDECAR` are both still widely consumed.
- **Scaffolding:** the four folder-keyed outer locks are gone — grep confirms no survivors. One unused `join` import in `reorder.ts` caught by lint and removed.
- **Instrumentation:** none. No `console.log`, `debugger`, or timing anywhere in `src/main`.
- **Comments:** three were wrong. `fileLock.ts` still called itself the lock for "BOTH page-write paths" when a single sidecar now has more writers than that; `index.ts` said "Under the page's file lock" above a handler whose lock had moved down a layer; and **my own** `withSidecarLock` doc claimed the banner/icon patches route through it — they share the key, not the helper. All three rewritten or deleted.
- **Names:** `sidecarRace.test.ts` → `writePathRace.test.ts`. It was named when it only tested sidecars; I then added the page-rename half and left the name behind.

**The real find:** `restoreCachedValues` writes the sidecar at its tail with no lock. My commit message says *every* writer takes the key — that was false. Fixed, so the claim is now true.

**INSIGHTS**

- The lock takes a raw string and nothing can assert two callers agree on it. That's the actual cause of this whole class, and it's still live for every non-sidecar file with multiple writers. A branded key type that only path builders can mint would make the bug impossible rather than fixed once — worth thinking about before the next multi-writer file appears.
- `setGovernedRootKeys` is an unlocked read-modify-write, and `updatePageProperty` wrapping it takes no lock of its own. `mutate.ts` locks at the call site; `restoreProperty.ts:79` doesn't. Same defect, page side — a restore rewriting values while you edit a cell on that page loses one of them. Predates this commit and isn't covered by its claim, so I left it.
- Consolidation that stops one layer short of its own module is a shape worth watching: I added `sidecarPath` and then didn't use it in the file that defines sidecar reads and writes.

**What I learned:** `serializeSchemaOp` is one *global* chain, not per-file. So schema ops serialize against each other and against nothing else — which is exactly why property assignment needed its own sidecar lock despite already looking "serialized."

**CALLS**

- **`updatePageProperty` — fix now or file it?** It's the same bug I just fixed for `updatePageBody`, but not a clean copy: `mutate.ts`'s `setProperty` deliberately holds a *wider* span (the registry read sits inside the lock, with a comment saying why), so moving the lock inward would shrink it. The alternative is locking at `restoreProperty.ts:79` instead, which closes the hole but keeps the caller-remembers shape. Small either way; I'd rather you pick than have me choose the span.

**Documentation:** `ArchitecturePM`'s new Write serialization section was already correct. `PM-004` and `ContextPM` both carried a hard count — "six unrelated surfaces" — and PM-004 then listed eight. Counts dropped in favour of the class, the old test filename corrected, the `restoreCachedValues` lock and the `sidecarIO` consolidation added, and the line table recomputed.

**Lines:** +159 / −129 code lines total for the write-path work (comments and tests excluded); the closeout pass itself was **+37 / −47** — net negative, which is what a good purge looks like.

**Commit:** Not committed — you didn't ask on invocation and there's one open call. Everything on disk is verified and green, and the tree holds nothing but my own work. Say the word and I'll commit it as a closeout on top of `fea330d2`; the `updatePageProperty` call can ride separately either way.

[NATHAN]

1. On the call, would tackling the rename journal disparity across Context and Space renames also be applicable to scope this? I'm talking about the Property rename journal. And would doing both following committing this work be a genuinely good scope to task for this session's History wrap-up?

GO for the wrap up with updatePageProperty

[CLAUDE]

Taking the span decision myself since only one option is defensible: `mutate.ts`'s wider span exists to stop a rename sweep resurrecting a stale key, and shrinking it would undo a deliberate, commented design. So the lock goes at the unlocked caller, and the precondition gets stated where a third caller would see it.

- BASH: read restoreProperty.ts's top and its unlocked write site
- EDIT: [Pommora/src/main/crud/restoreProperty.ts]

Now the precondition — a future reader will see `updatePageBody` locking internally and this one not, and "fix" it into a deadlock unless the reason is stated.

- EDIT: [Pommora/src/main/crud/page.ts]
- BASH: confirm both `updatePageProperty` call sites are now locked

Both call sites locked. Adding the test that pins it, and proving it red first.

- BASH: check `PropertyValue`'s `kind` variants and the `propertyType` enum
- EDIT: [Pommora/src/main/crud/writePathRace.test.ts]
- BASH: run the new test alone

Proving the new test has teeth — removing `updatePageBody`'s internal lock and confirming it goes red.

- BASH: back up page.ts, strip its internal lock by script, confirm the test goes red, restore the backup

Test has teeth — the body write is exactly what gets lost. Running full gates.

- BASH: run typecheck, lint, and the full test suite
- BASH: update PM-004 and ContextPM's write-ups for the new caller and the corrected line table by script -> re-run the full test suite
- BASH: stage and commit as `fix(write-path): the property restore writes home under the page's lock`

Committed as `277655c8`. Tree is clean. Now the session record.

- SKILL: [handoff]
- BASH: check the session-ID env var, the newest session log, and the Handoff's recorded owner

Different ID — `a41db668` is retired, this session is `5d28593d`. Archiving the retired transcript before writing the new document.

- BASH: list the Sessions folder and check the Handoff's current size
- DISPATCH: transcription-agent — Archive retired session transcript
- RETURN: archived to `Session - 08-06 > 08-07.md` (1,771 lines) — session ran 08-06 21:29 UTC to 08-08 02:49 UTC (local: 08-06 → 08-07), 40 `[NATHAN]`/40 `[CLAUDE]` tags balanced, no compaction markers in that stretch, and `HandoffPM.md`'s content above the transcript verified byte-identical to before. `HandoffPM.md` trimmed to 65 lines, ending in an empty five-backtick fence.

Archived to `Session - 08-06 > 08-07.md` (1,771 lines). Writing the fresh document.

- BASH: check commits and diff stat across this session, and commits ahead of origin
- READ: [.claude/HandoffPM.md]
- WRITE: [.claude/HandoffPM.md]
- DISPATCH: transcription-agent — Transcribe this session
`````
