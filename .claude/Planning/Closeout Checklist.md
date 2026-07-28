# Closeout Checklist — the full-cleanup session

Nathan is asleep and unreachable. This document is the contract for finishing the session and
survives an auto-compact. **Nothing here may be dropped.** Work top to bottom; tick a job only when
its verification command has actually been run and passed.

## Session baseline

`origin/main` = **`05a98344`** — the post-merge state of the `contexts-spaces` work. Every diff and
line count in the final report is measured against it.

```
git diff --stat 05a98344..HEAD -- Pommora/src
```

## Measured baseline at `05a98344` — for the final report

Measured with `scratchpad/measure.py` over `Pommora/src` (`.ts`/`.tsx`/`.css`, excluding
`graphify-out` and `node_modules`):

```
files=678  comments=10484  code=75781  blank=6094
docs: 51 files, 4578 lines (.claude/**/*.md)
```

Re-measure the same way at closeout and report all three deltas. The baseline tree is extracted at
`scratchpad/base/` if it's needed again; regenerate with
`git archive 05a98344 Pommora/src | tar -x -C <dir>`.

## Standing rules for the rest of this session

- **One writer on `Pommora/src` at a time.** A completion notification only covers that agent's own
  children. Before starting the next writer, poll `git status --short` until unchanged for ~60s.
- Forbid sub-agents in every dispatch brief.
- Gates, from `Pommora/`, with `set -o pipefail`, reading the summary line:
  `env -u ELECTRON_RUN_AS_NODE npm run typecheck` · `npx biome lint src` · `npx vitest run` ·
  `env -u ELECTRON_RUN_AS_NODE npm run build`
- Baseline: typecheck 0 · lint 0 · **1913 tests / 185 files** · build clean.
  `src/main/mutate.test.ts` has a **known flaky `ENOTEMPTY`** in temp-dir cleanup under full-suite
  parallelism — re-run before ever reporting it as a break.
- Verify every agent claim against the code before folding it. Several this session were stale.
- **Comment standard is Nathan's, set by his own hand-edits in `da096de5`.** Read those diffs before
  judging any comment. He cuts prop docs that name the prop, and he cuts architectural rationale a
  reader could reconstruct — even when it reads like a genuine "why". The test is *"would I know this
  without the comment?"*, not *"is this a why?"*. `KNOB` markers and `(Nathan's call)` decision
  markers are exempt and must survive.
- Do not add code unless it refactors something flawed or makes the result simpler.

## THE FOUR JOBS

### 1. Code comments — two agents, full tree

- [x] `main` + `preload` + `shared`: 2675 → 2490 (6.9%) — committed `ae7e2691`
- [x] CSS, all 69 stylesheets: 2071 → 2030 — committed `98a2682b`
- [ ] `src/renderer` re-run under Nathan's standard, all 403 files — **agent `acfc3479b641be769` running**
- [ ] Report the TOTAL comment-line diff vs `05a98344`

Verify:
```
python3 - <<'PY'
import pathlib
tot=0
for p in pathlib.Path('Pommora/src').rglob('*'):
    if p.suffix not in ('.ts','.tsx','.css'): continue
    n,inblk=0,False
    for ln in p.read_text().splitlines():
        s=ln.strip()
        if inblk:
            n+=1
            if '*/' in s: inblk=False
        elif s.startswith('/*'):
            n+=1
            if '*/' not in s: inblk=True
        elif s.startswith('//') or '//' in s or '/*' in s: n+=1
    tot+=n
print(tot)
PY
```

### 2. Code cleanup — recent commits

- [x] Simplification sweep: −470 code lines, 5 hoists — committed `26c6da64`
- [ ] Fold whatever the review surfaces as a NOW fix
- [ ] Re-verify: no new dead code, no duplicated fact left behind

### 3. Code review — source causes, not down-river patches

- [ ] **agent `a58f0e3da3f4a7e1e` running** (read-only, 17 behaviour commits, IPC hoist first)
- [ ] Split findings into **APPLY NOW** vs **NEEDS ITS OWN SESSION**. Do not defer anything easy or
      important. Nathan's words: don't let anything hang he'd say "do this now" about.
- [ ] Apply the NOW list, gate, commit
- [ ] Record the session-sized items as pending focuses

Already independently verified by me (do not redo):
- IPC channel parity across `26c6da64`: **102 → 102**, none added/dropped/renamed.
- preload↔main: the 6 unmatched names are `ipcRenderer.on` push listeners, each with a real
  `webContents.send` on the main side.

### 4. Doc pass — do the docs still align?

- [ ] Every feature doc vs the code as it now stands
- [ ] `PommoraPRD.md`, `Architecture.md`, `Views.md`, `Connections.md`, `Pages.md`, `Contexts.md`
      were touched this session — re-verify they're still true after simplification
- [ ] `Framework.md` roadmap
- [ ] Kill any claim the simplification falsified (the IPC envelope shape is the likely one)

## CLOSEOUT — required before the session ends

- [ ] `Context.md` — current state, and the pending focuses below
- [ ] `Handoff.md` — rewritten for this session
- [ ] `History.md` — the campaign entry
- [ ] Delete this checklist once every box is ticked

### The pending focuses Nathan named (order is my judgement)

1. **Rethink SQL's place in Pommora.** He gives *full permission and encouragement* to rethink the
   agent-legibility line: it is meant for **content the user authors**, not plumbing. Candidates to
   move out of JSON and into SQLite: heading folds, active views, tabs, and similar device-local
   state. Also examine what constraints the JSON state-recording currently imposes that SQL would
   dissolve. This subsumes the standing "query consumer" prerequisite and is the highest-leverage
   item on the list.
2. **PagePreview hover — unbuilt, needs building.**
3. **NavWindow search defaults to List even when the format is Gallery** — a bug fix.
4. **Cross-location card reordering in views** — pending, wanted soon.
5. **In-view creation methods** — creating a page from inside a view is noticeably sparse across
   surfaces; wants a full brainstorm loop.

State explicitly in both docs that Nathan should **feel free to find an alternative focus** — these
are what came to mind, not a mandate.

## FINAL REPORT — the deliverable

**Nathan stressed this twice. It is the point of the whole session.** Two pieces:

### Piece 1 — what got done, in PLAIN ENGLISH

Not a changelog. Not commit subjects. **What each thing MEANS.** Nathan is not a technical reader:
say what was broken in terms of what he would have seen, and what is different now that he would
notice. "The filter looked like it did nothing because the folder headings kept drawing even when
every row under them was gone" — not "pruned empty structural bands in the group resolver."

Must include:
- Line-count deltas vs `05a98344`: **comments**, **actionable code**, **documentation**.
- What was found and what was resolved.
- **Bugs that were already there, that he never knew about, now fixed.** Call these out explicitly —
  they are the most valuable part of the report.
- **Things newly surfaced that are now known**, and where each is written down.

### Piece 2 — state-of-project brief

Where the project actually stands, and **things to think about going forward.** Give him something
to chew on, not just a task list — the tradeoffs behind the pending focuses, what each would unlock,
what it would cost. He should finish reading it thinking about what he wants to build, with no
worry that something was left dangling.

No hedging, no jargon, no "as previously mentioned". Write it so it reads well at a glance and
rewards a second pass.

## Inventory for the SQL focus (gathered while agents ran)

`.nexus/` config files today, from `main/paths.ts` `NEXUS_CONFIG_FILES`:

| File | Nature |
|---|---|
| `nexus.json` | identity — canonical, stays a file |
| `settings.json` | user settings — canonical, stays a file |
| `properties.json` | the property registry — canonical, stays a file |
| `homepage.json` · `navview.json` | composed block documents — canonical, stay files |
| `state.json` · `sidebar-sections.json` | ordering + section structure — arguably canonical |
| **`folds.json`** | heading fold state — device-local |
| **`activeViews.json`** | container → active view — device-local |
| **`viewOrders.json`** | per-machine manual row order — device-local |
| **`tableHeadingColumns.json`** | per-table heading-column toggles — device-local |
| **`linkTitles.json`** | derived title map — device-local, regeneratable |
| `navRecents.json` · `navFavorites.json` · `tabs.json` · `page-previews.json` | session/nav state — device-local in nature, NOT currently in the exclude set |

`DEVICE_LOCAL_NEXUS_FILES` already names the first five as never-sync. **The bolded rows plus the
four nav/session files are the candidate set to move into SQLite** — none is content the user
authored, and all of it is plumbing the legibility rule was never meant to cover.

Worth noting for the rethink: `linkTitles.json` is *derived*, so it is a cache masquerading as a
config file; `viewOrders.json` exists specifically to keep manual order out of the synced sidecar,
which is a constraint the JSON shape imposes rather than one the product wants.

## DIAGNOSED — NavWindow search ignores the Gallery toggle (Nathan's focus #3)

**It is a small fix, not a session. Apply it, don't defer it.**

`NavWindow/NavWindow.tsx:262` renders a three-way branch:

```
{results ? <NavList …/> : viewMode === 'gallery' ? <NavGallery …/> : <NavList …/>}
```

The `results` arm short-circuits before `viewMode` is ever consulted, so a search always lists even
when the rail toggle says Gallery.

**Fix:** branch on `viewMode` FIRST, and let each arm choose its data source (`results` vs
recents+pins). That collapses three branches to two — fewer lines, and the toggle governs both
states as the rail claims.

One consequence to state in `Navigation.md`: `results.extras` (inert agenda hits — `NavList` renders
them with "Agenda navigation isn't wired yet") has no gallery equivalent, so they show in List only.
`NavGallery` takes no `extras` prop and adding one would be new code for placeholder rows whose
routing is unbuilt. Acceptable; note it rather than build it.

## Nathan is asleep — ping his phone for important updates only

He asked for phone pings. Use `PushNotification` sparingly, since he is sleeping:

- **When the whole session is done and the report is ready** — the one he actually wants.
- **If something blocks that genuinely needs him** — a gate that will not go green, a decision that
  can't be made from the record.
- **Not** for routine agent completions or progress. He is asleep; a ping he didn't need costs more
  than one he missed.
