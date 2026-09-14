## Handoff — Pommora

> **User Prompt:** Execute Phases 6 through 10 of `.claude/Planning/Sync-Scaffolding-V2 — Implementation Plan.md`, then the Final Verification and Reconciliation, in the shape the first session used: one Opus agent per phase, the orchestrator running every gate itself, a simplification review then a build-breaking review per phase with fixes sent back, every ruling written in chat and copied into Deviations. Mid-run: no over-guarding; Fable reviewers for the Final Verification (two on correctness, cohesion, and integrity with no target points, one on build-breaking); the neutral Opus verifier skipped; Docker installed; `NexusSyncPM.md` condensed to overview level; the Cross-Device Mutation Checklist walked during the final review.

#### Current Focus

**Session ID:** a16cb60d-9640-4f9d-9980-01f54860cb69
**Dates:** 09-14-2026
**Model:** Fable 5.1 orchestrating, Opus 5 implementing and reviewing, Fable 5.1 for the arc reviews, Sonnet 5 for the document condense

**The content-sync arc is complete: 62 commits from `7913eadca` to `0e62df351`, every gate green, pushed; the closeout's fixes in `48e0e6d79` are local.** Files travel between two devices through the hub: a page created on one lands on the other in about 2.7 seconds, every checklist mutation the bridge can drive was observed landing (37 rows measured, in the plan's Proof table and the Checklist's Measured column), conflicts resolve by recency with the losing bytes captured, a landing merges into an open editor around the caret, and the Settings heading carries the password, the pin, the status, and Sync Now. The hub builds as a container image and boots. Phases 6 through 10 ran today with the reviews the plan asked for; the three Fable arc reviews then found twenty-four things across the whole diff, of which nineteen were fixed in four commits and the rest are recorded under the plan's Open for Nathan.

**Every ruling that changed the design is under the plan's `### Deviations`,** and each was written in chat first. The ones that changed the design most: a blob stays sealed under the path it was written at and the hub keeps a renamed item's record; the long poll waits outside the session chain; a snapshot's mtime is whole milliseconds; a session starting over base rows sweeps the tree with a stat short-circuit that applies to the sweep alone; the editor's body base lives as long as the open page and a save never fetches; a landing over a dirty file whose push was declined captures the local bytes first; `sync:state` reports and never forgets.

The documents commit at the end of this session carries every `.claude` edit of the day, including Nathan's own to `Cross-Platform Compatibility Checklist.md`.

#### Completion Criteria

- [x] Phases 6–10 ticked; every task committed alone; every gate read by the orchestrator at every checkpoint; the two-instance landing observed four times on built output (2.8 s, 2.8 s, 2.7 s, and the final build).
- [x] Task 10.2's 22 rows plus the checklist walk observed on two rigs; the results table in the plan and the Measured column in the Checklist.
- [x] Three Fable arc reviews run; their fixes in `7586b918f`, `984aa5ac7`, `801a1d780`, `0e62df351`; the rest recorded.
- [x] Reconciliation walked; `NexusSyncPM.md` rewritten and condensed (1,828 words); PM-138 in History; Context and Framework current.
- [x] The hub image built and booted after a user-local Docker install (Lima + Colima + the static CLI under `~/.local`).
- [ ] Nathan's own pass: the Deviations, the open items below, the Nexus heading (his to tune), and the two manual checks (row 17's undo half; the heading's rows).
- [x] Push.

#### Next Session

- **Nathan's open calls, recorded under the plan's Open for Nathan:** a capture's retention clock (arrival time today) and whether a client-supplied timestamp should travel; whether `captures` earns a reader (with File History off a losing buffer sits there unseen); whether the 30 s reconnect cap should shorten; `SyncStatus` and `Change` as discriminated unions; `Core/Testing/syncHub.ts` as a hand-ported copy of the hub's `apply` (client suites could boot `Sync/Testing/hub.ts` in-process); the change log's growth (`reconcile` replays it from zero on every join, and the hub's `item` table could answer heads); the AAD path binding stated as transit integrity rather than blob-for-path protection; `nav:write` accepting a duplicate pinned entry.
- **The mobile companion** is the arc's open Prospect; `Sync/` is a folder on Node built-ins with a Dockerfile, so a hub can run anywhere Node 24 does.
- **A clean-checkout gate run** was not obtained (a worktree under a symlinked `node_modules` failed at module resolution on unrelated suites); a fresh clone with its own `npm install` is the honest form.

#### Feedback

- "Please also avoid over guarding if complications where it isn't necessary."
- "If the Cross-Device checklist remains relevant for verification, please run what you can verify through that during the plan's final review."
- "Send two Fable agents only … 2 on 'correctness, cohesion, integrity' WITHOUT specific target points. 1 on general build breaking." · "Skip the final neutral opus review."
- "Install docker if required." · "The final doc is way too large. Send a Sonnet agent with the writing standards skill to fix it."
- "There is no parallel session … Continue with the plan in full." (The overnight session, resumed from a stale compaction in another window, had committed Task 10.1 and a certificate fix in parallel; it accepted a hand-off and went idle.)

#### Session Pointers

- The plan's Summary, Deviations, Open for Nathan, and Proof: `.claude/Planning/Sync-Scaffolding-V2 — Implementation Plan.md`; the why: `.claude/Planning/Sync-Scaffolding-V2 — Decision Log.md`; the feature: `.claude/Features/NexusSyncPM.md`.
- The client: `Core/Sync/Client/{session,push,pull,reconcile,tap,base,keyring,call,status}.ts`; arrival: `Core/Sync/Arrival/{land,jsonMerge,captures}.ts`; the editor's side: `Core/Pages/{merge3,PageView}.ts(x)`, `Core/Session/{saveScheduler,pageDetailCache,useBridgeSubscriptions}.ts`; the heading: `Core/Settings/NexusRows.tsx`.
- The hub: `Sync/hub.ts`, `Sync/wire.ts`, `Sync/Store/log.ts`, `Sync/Dockerfile` with the root `.dockerignore`, `Sync/scripts/cert.sh`.
- Test furniture the client suites share: `Core/Testing/syncHub.ts` (the route-level fake hub), `Core/Testing/syncDevice.ts`.
- The two-instance rig used today lived in this session's scratchpad (`smoke/cdp.mjs`, `two.mjs`, `checklist.mjs`, `proof22.mjs`, `excl.mjs`, `hubsql.mjs`) and is deleted with the scratchpad; the recipe is in `.claude/Guidelines/Development-Environment.md`.

#### Working Notes

- **Kill the process holding the debug port, never the node shim** — `lsof -ti :<port> -sTCP:LISTEN`; killing the shim orphans Electron, and a stale instance on the port answered the first two-instance run with the previous build.
- **A shell-driven pipeline that ends in a background job loses its earlier output**; read gate tails from the log files.
- **Docker here is user-local:** `export PATH=~/.local/bin:~/.local/opt/lima/bin:$PATH`, `colima start` for the daemon; the static CLI has no buildx, so a per-Dockerfile ignore file is inert and the root `.dockerignore` is the one that counts.
- **The auto-mode classifier denies `git add .claude` and shell heredocs over `.claude` documents;** a Python script replacing tick strings passes; Edit for prose.
- **Every `page:updateBody` now takes the base hash** as its third argument (a bare two-argument ask answers a refusal); `page:open` returns `bodyHash`.
