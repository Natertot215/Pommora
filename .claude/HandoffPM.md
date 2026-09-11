## Handoff — Pommora

> **User Prompt:** Execute `.claude/Planning/Sync Groundwork — Implementation Plan.md` (ratified 09-11-2026) as Fable orchestrating background Opus agents: dispatch, review, and verify, never implement; one tree-touching writer at a time; every phase runs implement → simplify → attack → fix → commit, with each agent claim independently checked by reading the diff and rerunning the gates rather than trusting the report. The goal is one Ed25519 device key minted per install, a one-file server holding which devices a Nexus admits, six bridge channels, and a Nexus heading in Settings › General, proved by two instances on one Mac walking connect → pending → approve → revoke → reconnect. The Settings surface is designed headlessly against the existing kit, its decisions disclosed in-chat and not requested. Reconcile every document the arc makes false and write the closeout records.

#### Current Focus

**Session ID:** 12e60a02-f033-4f39-b9fb-d2c2722c463c
**Dates:** 09-11-2026
**Model:** Fable 5.1 orchestrating, Opus 5 implementing and reviewing

**The Sync groundwork, closed.** The session opened on a six-phase ratified plan and ran it end to end. Phase 1 turned `Sync/` into a gated workspace under a `nodenext` tsconfig and wrote `Core/Sync/contract.ts` — types and a route table, nothing executable — beside `authority.ts`, the canonical signing string, pinned to a fixture both the Core and server suites assert. Phase 2 gave Desktop its identity: `secrets.ts` over Electron's `safeStorage`, the `device` field in `pommora.json`, `device.ts` minting one Ed25519 pair per install through WebCrypto, a `net.fetch` transport, and the two new `HostContext` members. Phase 3 wrote the server, Phase 4 the client, the handlers, the six `sync:*` channels, and the `sync` scope of `local_state`, and Phase 5 the Nexus heading. Phase 6 proved the whole thing and rewrote every document the arc made false.

**The design decisions Nathan could not oversee were disclosed rather than asked.** The heading composes existing Settings rows and adds no UIX kind: a `nexus` row kind in `frames.ts`, a `NexusRows` component keying a `NexusBody` on the Nexus id so a Nexus switch re-derives rather than carrying stale rows, device rows that are inert display with Approve and Revoke as their only controls, and a busy gate held in a ref so a double-press cannot double-send. Placeholders are blank: an unbound heading shows the address field and Connect and says nothing about what has not been built.

**The reviews found real things.** Every gate ran a simplification pass before a build-breaking pass, both dual-briefed to flag bugs. The finds that mattered: a mint that wrote the config's device before the keychain had answered, which a crash between the two writes would have left mismatched — `mint` now refuses before any write when the keychain is unavailable and clears the config's device before writing the new secret; a re-mint on an *undecryptable* secret, which would have thrown away a key that may still return — only an absent key re-mints now, and an undecryptable one leaves the launch identity-less and reported; a refused approve or revoke answering the interface with a guess instead of a re-fetched list; and a connect whose header fingerprint did not match the public key in its own body, which now answers 401 rather than trusting the body.

**Verified against assumed.** The two-instance proof was observed, not inferred: one Mac, one Nexus id, instance A approved by construction, instance B pending, approved, revoked, reconnected, every state surviving a server restart and both apps relaunching, with `sync.db` read directly for its `device` and `membership` rows. The scratch tree under `$HOME/pommora-sync-proof/` was deleted afterward and `git status --porcelain` confirmed clean of it. What is *not* verified is anything above the admission layer, because none of it exists: no content crosses, nothing is encrypted, and the server has never run anywhere but localhost.

#### Completion Criteria

- [x] Every task of the plan ticked, with no scaffolding, debug output, or unauthorized TODO in `2d17c1ead..HEAD`.
- [x] A fresh `POMMORA_USERDATA` mints a device that survives a relaunch; `npm run sync` serves four verbs and refuses unsigned, stale, tampered, and oversized requests.
- [x] Two instances holding one Nexus id walk connect, pending, approve, revoke, and reconnect, every state surviving a server restart and an app relaunch.
- [x] Every review finding fixed or ruled on; nothing carried as a concern.
- [x] Gates green: `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`.
- [x] Reconciliation complete — `NexusSyncPM`, the Features docs, the PRD, CLAUDE.md, the Guidelines, the Mobile log and plan, Framework, History PM-135, Context, and this document.
- [ ] Nathan's own pass over the Nexus heading in Settings › General.

#### Next Session

- **Content sync**, the arc this one paved for: items, versions, blobs, and the change feed over the same server and the same device identities. `.claude/Planning/Cross-Device Mutation Checklist.md` is its test plan — every mutation the app can make, and what has to cross for each.
- **The Nexus password and the wrap key.** One random content key per Nexus wrapped by the password, with a second wrapped entry per device against an X25519 key each device mints beside its signing key, so an approved device unlocks without the password being typed again.
- **The phone**, which binds the same client to a native transport and a native secret store; `.claude/Planning/Mobile Companion & Pommora Sync — Implementation Plan.md` is unratified and re-derives Tasks 3–6, 12, 14, and 15 against this arc at execution.
- **The manifest predicate.** What travels is described in `NexusSyncPM` and expressed nowhere — it lands as one predicate beside `neverWatched` in `Core/Paths/exclusion.ts` when the sync client consumes it.
- **Deployment and TLS**, untouched: the server has only ever run on localhost over plain HTTP.

#### Feedback

- "You never drive smoke launches or CDP yourself; the implementer's brief carries the recipe and reports back."
- "Every agent claim is independently evaluated before it counts: completion, accuracy, and concerns are checked by reading the diff and rerunning the gates, never by trusting the report."
- "The settings surface itself should be minimally functional with a simple interface that requires the agent to stop and look for best-practices in the codebase to drive the design of it headlessly… I cannot oversee its design so you should disclose your decisions in-chat and proceed."

#### Session Pointers

- The plan, its ticked tasks, START/END, and Deviations: `.claude/Planning/Sync Groundwork — Implementation Plan.md`; the why behind each decision: `.claude/Planning/Sync Groundwork — Decision Log.md`.
- What the whole thing is, in one document: `.claude/Features/NexusSyncPM.md`.
- The canonical signing string and its pinned fixture: `Core/Sync/authority.ts` and `Core/Sync/vectors.json`; the wire types and route table: `Core/Sync/contract.ts`.
- The device mint and its secret store: `Desktop/Config/device.ts` and `Desktop/Config/secrets.ts`; the transport: `Desktop/Web/transport.ts`.
- The server: `Sync/server.ts`, started with `npm run sync` from the root, its `sync.db` under `~/.pommora-sync/`.
- The heading: `Core/Settings/NexusRows.tsx`, reached through the `nexus` row kind in `Core/Settings/frames.ts`.
- The two-device recipe (a copied Nexus with its databases deleted, two `POMMORA_USERDATA` dirs, built output): `.claude/Guidelines/Development-Environment.md` §Parallel Write Agents.

#### Working Notes

- **`node_modules/.bin/electron` is a Node shim.** It spawns the real Electron as a child, so killing the launch pid orphans the app exactly as `electron-vite dev` does; kill the port holder or the process carrying `--user-data-dir=`.
- **Two `npm run dev` processes cannot coexist.** They share one renderer server through a stale port, which is why both proof instances launched from built output.
- **A copied Nexus is a replica, not a new Nexus.** The id lives in `.nexus/nexus.json` and travels with the copy; deleting `.nexus/*.db*` is what gives the copy its own per-machine state while keeping that id.
- **Core stays string-only across the sync seam.** `Core/Sync/` never handles key bytes and never base64-encodes; Desktop signs and hands back a base64url string. No gate enforces this — it is a review rule.
- **`Core/package.json` has no `"type": "module"`, and that is the gate.** Sync's `nodenext` program reads Core's files as CommonJS, which is what makes a value import from Core a compile error under `verbatimModuleSyntax`; adding the key would silently open the door.
- **Connect verifies against the key in its own body**, not a stored one — it is the one route that must, and it refuses unless that key's fingerprint equals the caller's device id.

**FILES ADDED**

- Core/Settings/NexusRows.tsx
- Core/Settings/NexusRows.test.tsx
- Core/Sync/contract.ts
- Core/Sync/authority.ts
- Core/Sync/authority.test.ts
- Core/Sync/vectors.json
- Core/Sync/client.ts
- Core/Sync/client.test.ts
- Core/Sync/handlers.ts
- Core/Sync/handlers.test.ts
- Desktop/Config/device.ts
- Desktop/Config/device.test.ts
- Desktop/Config/secrets.ts
- Desktop/Config/secrets.test.ts
- Desktop/Web/transport.ts
- Sync/server.ts
- Sync/server.test.ts
- Sync/vitest.config.ts
- .claude/Features/NexusSyncPM.md
- .claude/Planning/Cross-Device Mutation Checklist.md

**FILES MODIFIED**

- Core/Contract/bridge.ts
- Core/Contract/handlers.ts
- Core/Contract/serve.ts
- Core/Platform/localState.ts
- Core/Settings/SettingsWindow.tsx
- Core/Settings/frames.ts
- Desktop/Config/appConfig.ts
- Desktop/Config/appConfig.test.ts
- Desktop/main.ts
- Sync/package.json
- Sync/tsconfig.json
- package.json
- vitest.config.ts
- .claude/CLAUDE.md
- .claude/ContextPM.md
- .claude/FrameworkPM.md
- .claude/HandoffPM.md
- .claude/HistoryPM.md
- .claude/PommoraPRD.md
- .claude/Features/ConfigurationPM.md
- .claude/Features/CorePM.md
- .claude/Features/DesktopPM.md
- .claude/Features/InterfacePM.md
- .claude/Guidelines/Dependencies.md
- .claude/Guidelines/Development-Environment.md
- .claude/Planning/Codebase Audit — Report.md
- .claude/Planning/Cross-Platform Compatibility Checklist.md
- .claude/Planning/Mobile Companion & Pommora Sync — Decision Log.md
- .claude/Planning/Mobile Companion & Pommora Sync — Implementation Plan.md
- .claude/Planning/Sync Groundwork — Implementation Plan.md

**FILES REMOVED**

- *(none — the deletions in this range belong to the parallel naming arc.)*

**COMMITS**

- `0aa4a5369` — docs(planning): rewrite the Mobile log to the device-key model and close the Sync Groundwork plan
- `58b5391a4` — docs(planning): correct four writer cells in the mutation checklist
- `76074b531` — docs(planning): write the cross-device mutation checklist for the sync arc
- `96fd2d117` — docs(pommora): name the manifest rule and tighten two NexusSyncPM sentences
- `a542bf469` — docs(pommora): write NexusSyncPM and restate every sync claim
- `313dc4c94` — fix(pommora): make the first Connect land, follow a Nexus switch, and keep the mount fetch quiet
- `6b6bcfa4c` — refactor(pommora): settle the Nexus heading to its minimal form and enforce its busy gate
- `2eeb90e30` — docs(pommora): title the Nexus subsection the way the frame's sub-groupings read
- `e0ded0d51` — feat(pommora): add the Nexus heading to Settings › General
- `98444c79f` — fix(sync): detach the listen error handler once bound
- `b944cc84b` — fix(pommora): re-mint only on an absent key, never on an unreadable one
- `9c3e39528` — fix(sync): answer a refused act with the true list and self-heal a dropped tree
- `bb6894f8f` — refactor(sync): settle the client and handlers to their minimal form
- `4f3155c6a` — docs(sync): name the two refusals ready() holds
- `ae01671be` — fix(sync): hand the transport a plain header record
- `87c0c9a97` — feat(sync): expose the six sync channels
- `563bdfc98` — feat(sync): sign and send any route through the host
- `f4c549096` — fix(sync): report a failed start and pin the revoke test to the list
- `ff5db3a67` — refactor(sync): settle the server to its minimal form
- `61d35329d` — docs(pommora): name the sync server start command
- `0b81617cc` — test(sync): drive the server through its verbs and refusals
- `f52152b57` — feat(sync): serve the four device verbs on built-ins alone
- `64297b748` — fix(pommora): refuse a mint before the keychain answers and bound the transport
- `7fce0c924` — refactor(pommora): settle the device mint to its minimal form
- `3d717b765` — feat(pommora): keep the secret store to its two exports
- `acc701e8f` — docs(pommora): describe the device identity and its secret store
- `426050dcb` — feat(pommora): hand the device and transport to every host context
- `8bbd3649e` — feat(pommora): add the host transport over net.fetch
- `f381e9b21` — feat(pommora): mint the device key once per install
- `4f6644da4` — feat(pommora): declare the host device and transport types
- `58152ac5a` — feat(pommora): carry the device in the app config
- `d06635c48` — feat(pommora): add the keychain-backed secret store
- `3adf2ecf1` — docs(pommora): state the type-only gate's mechanism precisely
- `7ca135851` — docs(planning): the name refusals the checklist tracked now exist, Windows-gated
- `9e2a89efb` — docs(pommora): fold the Sync workspace into the rules and guidelines
- `ff4395dad` — feat(sync): add the canonical signing string and its pinned vectors
- `38d1b479f` — feat(sync): declare the type-only wire contract
- `53688425a` — feat(sync): make Sync a gated workspace

#### Handoff Guidelines

- Restate rather than amend; a handled item leaves for Context, History, or the Feature docs with no tombstone.
- §Working Notes holds what a fresh session would trip over; what Context or the Feature docs already say isn't restated.
