### Reach-In Benchmark — Rerunning

The harness that measured moving the Trash onto the Archive's reach-in model (`reach-in-measurement.md`) against today's code, and the host-process profiles behind *§Where the Time Goes*. Every script resolves paths from its own folder; the repo is `POMMORA_REPO` (required while the folder sits outside a checkout) or the repository holding this folder, and all working state (worktrees, benchmark Nexuses, fills, live clones, userData, raw results) lives under `REACH_IN_WORK`, by default `pommora-reach-in` in the OS temp directory. `results/` and `profiles/` are copied back beside the harness.

#### The Patches

Both are cut against `52bf41b6f` (the first run's, against `15fe7422a`, kept its results as `results/<cell>-15fe7422a.jsonl` and `profiles/profile-15fe7422a.json`) and may need re-fitting onto a newer HEAD; `setup.sh` applies them in this order.

- **`instrumentation.patch`:** byte-identical in both builds, a `git diff` from the repo root. `Desktop/Platform/nodeMachine.ts` counts every machine call on `globalThis.__benchIo`, split out for paths under `/.trash/`; `Core/Nexus/handlers.ts` stamps the open's phases (`openStartedAt`, `treeAt`, `indexAt`, `openAt`, `repairAt`) on `globalThis.__bench`.
- **`reach-in.patch`:** the prototype alone, a `diff -ruN baseline reach-in` cut after the instrumentation, applied with `patch -p1`. It touches `Core/Paths/nexusPaths.ts`, `Core/Paths/exclusion.ts`, `Core/Files/walk.ts`, `Core/Index/indexSeed.ts`, `Core/Index/keyHolders.ts`, `Core/Nexus/heldPages.ts`, `Core/Nexus/cascade.ts`, `Core/Nexus/governedSweep.ts`, `Core/Nexus/handlers.ts`, `Core/Matrix/matrixGraph.ts`, `Core/Trash/delete.ts`, and `Core/Trash/spend.ts`.
- **`stack-probe.mjs`:** profiling only, applied to the baseline after the matrix; it adds a call-chain tally to the instrumentation's counter in `nodeMachine.ts`.

#### Steps

Run from this folder, with nothing else heavy on the machine; leave any running Pommora alone, since every launch takes its own userData and debug ports 9391–9396.

1. **Worktrees:** `./setup.sh` (or `./setup.sh <commit>`), which builds both.
2. **Fills:** `./fills.sh Small Medium Large`. Each size runs `make-benchmark-nexus.mjs`, which sweeps every earlier `~/Benchmark-*` it built, so the script moves each Nexus into the working folder before building the next; it then adds hub backlinks and Link values (`augment.mjs base`) and builds the 0%, 10%, and 50% fills by deleting cloned Doomed Sets and pages through the baseline's own `mutate` channel (`fill.mjs`).
3. **Matrix:** `node bench.mjs <Size> <runs> <pct...>`, for example `node bench.mjs Small 5 0 10 50`. Builds alternate run by run on a fresh clone of the fill; each run is a cold open, a warm open, and the operation sequence, and the first run takes the spot checks. `START_RUN=<n>` resumes an interrupted cell.
4. **Tables:** `node report.mjs`.
5. **Profiles** (baseline, Medium-0, after the matrix; `BUILDS=baseline ./setup.sh <commit>` and `PCTS=0 ./fills.sh Medium` build only what they need): `node profile.mjs profile`, `node profile.mjs noflush`, and `node profile.mjs nowatch` or `shared`, the last two after adding `if (process.env.POMMORA_BENCH_NOWATCH) return` after `stopWatcher()` in the baseline worktree's `startWatcher` (`Desktop/FileWatch/watcher.ts`) and rebuilding; `RUNS=<n>` repeats each on a fresh clone. Then `node stack-probe.mjs "$REACH_IN_WORK/baseline"`, rebuild it (`npm run build` inside it), and `node profile.mjs stacks`. Each takes an optional operation (`renameProperty`, `renameContext`, `renamePage`) to run alone. Read them with `node analyze-profile.mjs <op>` for the top self and inclusive times, call chains, and walk timeline, or `node analyze-profile.mjs <op> fn,fn,…` for named functions' inclusive time.
6. **Cleanup:** `./teardown.sh`, which kills any Electron launched from the working folder, removes both worktrees, prunes them, and deletes the working folder.

#### Timing

On an M5 MacBook Air: Small takes about 30 s per build-run, Medium 4–6 min, and Large 8–12 min, so a five-run Large matrix is several hours.
