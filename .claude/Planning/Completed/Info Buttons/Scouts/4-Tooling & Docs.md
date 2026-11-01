### Scout 4 — Tooling & Docs

**DATE:** 10-27-2026
**SCOPE:** the mirror row (E-1), the daily commit (E-2), the live drive (G-1, D-4), the examples' removal (G-2), and the docs and tooling outside the code that the change reaches. The examples live in the real tree, cited by Label Format and Value Format, and the drive builds the main checkout. Cleaned against *Info Buttons — Investigation*; paths are relative to `~/The Studio/Projects/Project Pommora` unless they start with `~`.

---

#### Contradictions

1. **The Examples Collide With E-1 and E-2 Once Either Is Live:** the mirror watcher runs now (launchd `com.nexus.claude-mirror`), so once the map row exists, whatever the InfoIndex holds seeds into `~/NexusOS/Studio/Pommora/II. Resources/PM-Info-Index.md` within seconds, and a vault edit to an example flows back into the shipped file. The 5:00 PM daily line would commit Claude's example wording to `active` under the wording message, and the hook would push it. Both land after the examples leave.
2. **The F-3 Rename Crosses a Repo Boundary:** `~/The Studio/.claude/dashboard/src/showcase/MenuLeaf.tsx:32` and `:59` pass `subLabel="Sub-label"` to UIX's `MenuItem`, and Pommora's `npm run typecheck` ends with `tsc -p ../../.claude/dashboard` (`package.json:20`). Renaming `subLabel` fails Pommora's gate until a matching edit lands in The Studio's repo, a separate commit there, whose own post-commit (`core.hooksPath=.claude/hooks`) runs `sync.mjs athena` and pushes The Studio. The vite build alone wouldn't catch it: esbuild strips types, and the prop would drop silently at runtime.
3. **`.claude/CLAUDE.md:117` Is Already False:** it lists `// Dashboard | • The line ledger and design-system showcase pages`, but Pommora has no `Dashboard/` folder; the dashboard lives in `~/The Studio/.claude/dashboard/`.

---

#### Findings

##### The Mirror Row (E-1)

**Grammar:**

- `~/.claude/scripts/cross-file-mirroring/mirror-map.md:5`: in a **Project:** table, "`~`-anchored `.md` rows are pinned source files."
- The parser routes an absolute or `~` source row after a Project table's roots row into the project's `extra` list (`cross-file-mirroring:362-370`).
- It pairs one only while the source is a file: `if src_abs.is_file(): pmd.append((vbase / vrel, src_abs))` (`:1032-1034`).
- Pinned pairs are among the explicit pairs every prune exempts (`:530-538`, `:980`; the safety note at `:1063`).

**The row** goes in *Project: Pommora*, after the roots and docs rows (`mirror-map.md:90-100`), its Mirror cell relative to the table's vault base, `Studio // Pommora`:

```
| ~ // The Studio // Projects // Project Pommora // Core // <placement> // InfoIndex.md | II. Resources // PM-Info-Index.md |         |
```

The Core-side path is the InfoIndex's placement, which Nathan approves (H-1).

**Pinned Project row versus Files row:**

| Behavior | Pinned Project Row | Files Row |
| --- | --- | --- |
| Source missing, vault note exists | No pair (`is_file` gate); the vault never seeds the repo. | Seeds the source from the vault (`:794-807`). |
| Source deleted after mirroring | The pair drops out; the vault copy stays. | The vault copy goes to `.trash`. |
| Vault note deleted | Its key is dismissed; the row stays. | `strike_map_row` deletes the row from the map (`:436-458`). |
| Vault note moved within `Studio/Pommora` | The Mirror cell is rewritten. | The Mirror cell is rewritten. |
| Precedent | None yet in either Project table. | `mirror-map.md:38` pins `~/.claude/memory/pommora/MEMORY.md` → `Studio // Pommora // MemoryPM.md`. |

The map's prose names the pinned row as the mechanism for a project-owned file and groups it with Pommora's other docs; the Files row's vault-seeds-source behavior is the one property that could write the shipped file from NexusOS.

**First pass with no vault note** (`reconcile_pair`): it writes the source's body with only the `description` and `version` keys, if the source carries them (`mirror-map.md:13-18`), so a frontmatter-free InfoIndex seeds a frontmatter-free note. `II. Resources` is a Pommora Set in NexusOS (it holds `_pageset.json`), so Sapphire and Pommora stamp `ID` on the vault side, as on the sibling `Libraries.md`; those keys never cross. If Nathan adds `description:` in the vault, it lands as a frontmatter block at the top of the shipped file, which the parser ignores. The mirror strips only surrounding blank lines from a body (`cross-file-mirroring:622-624`). An emptied source mirrors as an empty-bodied note.

**The existing `// Resources → // II. Resources` row** (`mirror-map.md:101`):

- `.claude/Resources` is absent and untracked, so its scope is offline every pass (`cross-file-mirroring:1022-1025`) and neither seeds nor prunes; the pinned mirror is exempt either way.
- **Hazard:** the three vault notes in `II. Resources` (`Deployment.md`, `Distribution.md`, `Libraries.md`) are recorded as mirrored in `.mirror-state.json`. If anything recreates `.claude/Resources/`, the scope comes online and `prune_orphans` → `_judge` trashes all three (`:1258-1291`).
- The row is dead configuration that tells a reader `II. Resources` mirrors `.claude/Resources`; the Sapphire table (`:103-117`) has no such row. Removing it leaves the three notes as ordinary vault notes, out of every scope.

**Write path:** `mirror-map.md` lives in `~/.claude`, committed daily, and is itself mirrored two-way to `Studio // NexusOS // Cross-File-Mirroring.md` (`:34`), so an edit on either side applies. The watcher re-reads the map every pass, and pruning waits 15 seconds of map stillness (`PRUNE_SETTLE_SECS`, `:148`).

##### The Commit Step (E-2)

**Repo shape:** Pommora is its own repo (branch `active`). The Studio's `.gitignore` is `/*` plus `!/.gitignore`, `!/.claude/`, and `!/.github/`, so `auto-push.sh`'s loop (`~/.claude/scripts/auto-push.sh:4-9`, over `~/The Studio`, `~/NexusOS`, and `~/.claude`) never reaches Pommora. It runs from `com.<user>.auto-push.plist` daily at 5:00 PM with `/usr/local/bin` first on `PATH` (`auto-push.sh:2`), where `node` lives, so hooks that call node work under launchd.

**The line**, before the loop:

```zsh
git -C ~/"The Studio/Projects/Project Pommora" commit -qm "<message>" -- Core/<placement>/InfoIndex.md >> ~/Library/Logs/auto-push.log 2>&1
```

Its behavior, probed in a throwaway repo since removed:

| Case | Result |
| --- | --- |
| Changed file | `git commit -- <path>` commits that path's working-tree content alone; another file already staged stays staged and uncommitted. |
| Unchanged file | Exits 1 with a "no changes added to commit" status; nothing commits and no hooks run, matching the "nothing to commit" lines The Studio's loop already writes to the log. |
| Untracked file | `error: pathspec … did not match`; a session commits the InfoIndex once before the line can work. |

**Branch:** the commit lands on whatever `HEAD` is. Off `active`, or mid-rebase, it still commits, and the post-commit hook skips the push.

**Hooks on that commit:**

- `.claude/hooks/pre-commit` runs `check-atlas.mjs` and always exits 0, so it only warns.
- `.claude/hooks/post-commit` runs `node "$HOME/The Studio/.claude/dashboard/sync.mjs" pommora`, which, when settled (on `active`, not replaying a rebase or merge), updates the line count (`EXT = ['.ts', '.tsx', '.css']`, `~/The Studio/.claude/dashboard/line-count.mjs:19`, so an `.md` adds nothing), copies `.claude/IssuesPM.md` into the dashboard data, commits The Studio's dashboard with a pathspec commit (`sync.mjs:76-80`), and pushes Pommora and The Studio (`sync.mjs:105-118`). The line needs no push of its own.

**The Name Hook:** `~/The Studio/.claude/hooks/no-name-mentions.mjs` is a Claude Code `PreToolUse` hook on Bash and a `--scan` mode, not a git hook, so launchd's run isn't subject to it. It blocks any agent Bash command containing `git` or `gh` and a name variant anywhere, file paths included; the executor editing or testing `auto-push.sh` keeps the plist's filename out of git commands. `npm run lint`'s `--scan` reads tracked files outside `.claude/`, so the InfoIndex can't carry Nathan's name.

**Sequencing:** the line lands after the examples leave, and `~/.claude` commits `auto-push.sh`'s own edit in its next daily update.

##### The Live Drive (G-1, D-4)

**Structure to reuse:**

- `.claude/scripts/<Name> Drive/live-drive.mjs` plus `MATRIX.md` (the Archive, Metadata, and Properties drives carry one), and a paragraph in `.claude/scripts/README.md`.
- Ports in use: 9343, 9353, 9363, 9373, 9383, 9393, 9403; the next is 9413.
- Skeleton, from `Archive Drive/live-drive.mjs`: a phase and group argv check; `cdp = (await launch(PORT, '<name>-shots')).cdp`; group calls; `item(group, decision, name, pass, detail)` per check; `finally { await restore() }`; `tally([...])`; a non-zero exit on failure.
- `launch()` (`.claude/scripts/drive-harness.mjs:562`) runs `npm run build` in `REPO` (the main checkout by default, `:10`), backs up `~/Test`, and launches with its own userData; `restore()` (`:613`) rsyncs `~/Test` back. The repo tree is never touched.

**Navigation already written:**

- The Metadata Drive's `openEditor(cdp, label)` (`.claude/scripts/Metadata Drive/live-drive.mjs:1341-1349`) goes sidebar → Collection → `viewFrame('Properties')` → the property's row and waits on `trigger('Label Format')`, `button[aria-label="Label Format"]` (`:1337`).
- `Value Format` appears only on option types (`Core/Properties/Schema/formatRows.ts:33-38`), so the drive's property is a Select, Multi-Select, or Status.
- The InfoButton's name, "Label Format - Info" (A-5), keeps those exact-match selectors unique.

**CDP mechanics** (helpers in `drive-harness.mjs`):

| Gesture | How |
| --- | --- |
| Dwell | `hover(cdp, expr, dwell = 600)` (`:227-233`) moves the pointer 20px off, then onto the target, and waits; a bracket checks "closed at about 400ms, open by about 600ms." |
| Click | `mouseClick` and `mouseAt` (`:188-194`) send real move, press, and release events, and a real click also starts the dwell. A-3 needs these: `click` (`:235`) fires only `el.click()` with no pointerdown. |
| Outside press | `mouseAt` at a point outside the pane, for B-1 and B-3. |
| Escape | `pressKey(cdp, 'Escape')` (`:238`); `escapeAll` for cleanup. |
| Screenshots | `shot(cdp, name)` (`:248`) into `$POMMORA_DRIVE_SHOTS` or `tmpdir()/<name>-shots`. |
| Touch | Unverified; no drive has done it. `coarse()` reads `matchMedia('(hover: none)')` at render (`UIX/Interactions/hoverReveal.ts:18`), so emulation is on before the row mounts. Candidates: `Emulation.setTouchEmulationEnabled({ enabled: true, maxTouchPoints: 1 })`, or `Emulation.setEmulatedMedia({ features: [{ name: 'hover', value: 'none' }] })`; the tap is `Input.dispatchTouchEvent`. The first touch case asserts `matchMedia('(hover: none)').matches` before trusting any result. |
| No copy (C-3) | A real drag across the pane (`sweep`, `:204`), then `getSelection().toString() === ''`. |
| One at a time (B-3) | Click-hold glyph A, then `hover` glyph B: A closes and B opens. |

**The disabled-row case (A-4):** Label Format and Value Format are never disabled; `pickerRow` passes only `{ inert: true }` (`formatRows.ts:28`). A-4 needs a disabled citing row elsewhere, or it goes undriven. `Core/Interface/Windows/IterationWindow.tsx` (⌘⇧T, a blank `WindowBase` with a `{/* drop JSX here to preview it */}` slot at `:25`) is the codebase's home for a temporary preview of a disabled row and each glyph, type, and border combination (A-2); the examples' removal then reverts it too.

**After the examples leave:** an empty InfoIndex leaves the drive nothing to open, since the index is bundled at build time.

- **Retire:** delete the drive with the examples and its README paragraph.
- **Keep, rebased on real rows:** `MATRIX.md` keeps the behavior cases and drops formatting and layout; it runs only once real rows cite entries.
- **Keep, self-seeding:** the drive writes examples into the source before `launch()`'s build and restores the bytes in `finally`; with the mirror row live, each write reaches NexusOS within seconds and a run near 5:00 PM could be swept into the commit, so it's viable only with the mirror paused.

---

#### Chain of Logic & Reuse

- **One Owner Per Concern:** the mirror watcher owns NexusOS ↔ codebase sync, so one map row is enough with no script change; the post-commit hook owns pushing and the dashboard, so the daily line only commits; the drive harness owns build, launch, backup, restore, CDP, and screenshots.
- **One Pattern:** the pathspec commit (`git commit … -- <paths>`) is how `sync.mjs:80` commits the dashboard, and *Development-Environment*'s `--only` rule is the same form.
- **Navigation:** the Metadata Drive's `openEditor` and `trigger` are copied into the new drive, as drives share only `drive-harness.mjs`. A touch helper, if one is written, belongs in `drive-harness.mjs` beside `hover`.
- **Typecheck Reach:** Pommora's typecheck spans The Studio's dashboard, so the F-3 rename breaks the gate loudly.

---

#### Removal & Simplification

- **`mirror-map.md:101`:** dead configuration with a latent trash hazard; removed beside the pinned row (a `~/.claude` edit, which Nathan approves).
- **`.claude/CLAUDE.md:117`:** already false; removed, since The Studio's own CLAUDE.md names the dashboard.
- **The Drive's Afterlife:** retiring it with the examples is the removal-first default; keeping it earns its place only once it can prove behavior on real cited rows.
- **No New Script:** the commit step is one line in an existing script, and the mirror is one row in an existing map.

---

#### Approaches

| # | Approach | Reasoning | Cost |
| --- | --- | --- | --- |
| 1 | **Wire at the End.** The InfoIndex, the examples, the drive, and the citations are built and the drive runs; the last phase removes the examples and their citations, then adds the pinned row, removes the dead row, and adds the daily line. | Nothing of Claude's reaches NexusOS or a wording commit, and the first mirror pass seeds exactly what ships. | The vault note seeds empty, so Open Item 1 (how the tags draw in Obsidian and in Pommora on NexusOS) waits for the first real entry. |
| 2 | **Wire First, Examples Visible.** The mirror row lands early so Nathan sees and drafts in `PM-Info-Index.md` while the work runs; the daily line lands last. | Answers Open Item 1 early, and Nathan can draft entries in parallel. | Claude's examples sit in the vault, and the removal step deletes only the example tags; a vault edit to an example is a live write into the source mid-drive. |

A third shape, keeping the examples in a second drive-only index, breaks D-1 ("lives once") and is listed only to rule it out.

---

#### Placement Candidates

Every placement goes to Nathan for approval (H-1).

- **The Drive Folder:** `.claude/scripts/Info Buttons Drive/` matches the feature's planning folder and the drive naming (`Archive Drive`, `Alias Drive`), with port 9413 and shots `info-shots`; `.claude/scripts/InfoPane Drive/` names a component, which no other drive does.
- **Its Matrix:** `MATRIX.md` beside it, in the Archive Drive's form: a group per plan phase, with `Case | Seeds | Operation | Expected | Decisions` rows, each check printed as `[g<group> <decisions>]`.
- **Extra Example Surfaces** (a disabled row and the glyph, type, and border variants): `IterationWindow.tsx`'s preview slot, temporary and reverted with the examples, or none, leaving A-4 and A-2's variants undriven.
- **The InfoIndex** decides the mirror row's Source cell and the daily line's pathspec, and it sits outside every mirrored `.claude` doc tree (Features, Guidelines, Planning), since it ships from Core.
- **The Workflow in Docs:** `.claude/Guidelines/Development-Environment.md` *§Gates & Commits*, which already documents `--only`, the hooks, and branches.

---

#### What Becomes False

**Cross-Repo Code:** `~/The Studio/.claude/dashboard/src/showcase/MenuLeaf.tsx:32` (`<MenuItem leading={dashed} subLabel="Sub-label">`) and `:59` (`subLabel="Sub-label"`), compile errors under Pommora's typecheck after F-3. `~/The Studio/.claude/dashboard/data/pommora-issues.md` follows `IssuesPM.md` through the post-commit copy.

**Structure:**

- `.claude/CLAUDE.md:117` — "`// Dashboard | • The line ledger and design-system showcase pages`," already false.
- `.claude/CLAUDE.md:99` — "`├── // Buttons | • Button.tsx + button-base.css`" names `button-base.css.ts`; under the `UIX/Buttons/` placement the line also under-describes the folder. A new top-level Core folder for the InfoIndex would need its own line.
- `.claude/PommoraPRD.md` and `.claude/FrameworkPM.md` say nothing about hints, captions, or in-app information.

**Tooling:**

- `~/.claude/scripts/cross-file-mirroring/mirror-map.md:90-101` — gains the pinned row and loses `:101`.
- `~/.claude/scripts/auto-push.sh:4` — gains the commit line before the loop.
- `.claude/scripts/README.md` — gains the drive's paragraph, which leaves with the drive.

**Settings Docs:** `.claude/Features/ConfigurationPM.md:63` — "| Hover Previews | `previewPersistence` | Whether a preview raises at all, and how long it lingers after hovering off. |" stays true; B-2 (InfoPanes sit outside it) earns one clause so a reader doesn't assume the setting covers them.

**Collisions to flag, not falsities:** `.claude/Features/ViewTypesPM.md:75` ("Resting on the title slides a "Search" hint out beside it") is the title-search reveal; `.claude/Features/PommoraUIX.md:195` (`text.caption`, "The secondary line under a title") is consistent with F-3.

**Where the feature's description belongs:**

| Topic | Owning Doc |
| --- | --- |
| The row slot and the glyph (UIX) | `PommoraUIX.md` *§Menus* (`:355-372`), with the button's look under *§Buttons* (`:219`) and the pane under `PickerMenu` (`:380`) |
| The Settings window's rows | `InterfacePM.md:76` |
| The format rows | `PropertiesPM.md:72` (Value Format) and `:113` (the Property Frame) |
| The InfoIndex and InfoPane as an app behavior | No home yet; `InterfacePM.md`, beside *§Confirmation & Notifications*, is the natural candidate |

---

#### Risks

- **Mirror Timing:** once the row exists, every write to the InfoIndex reaches NexusOS within seconds and the reverse holds, so a vault edit changes the working tree under a running drive or test; a branch switch rewrites the vault copy.
- **The Vault Side Becomes a Pommora Page:** in `II. Resources`, Sapphire stamps `ID`, which stays vault-side; a rename or move in Obsidian carries the row with it, and a deletion dismisses the pairing with no error.
- **A Daily Commit on an Unsettled Tree:** the line commits off `active` or mid-rebase, and the push is skipped silently.
- **Untracked at First:** the line errors daily until a session commits the file once.
- **Touch Emulation** is unproven in this Electron's Chromium; the `matchMedia` assertion comes first, and emulation precedes the row's mount.
- **The Name Hook** blocks agent git commands whose text carries a name variant, file paths included.
