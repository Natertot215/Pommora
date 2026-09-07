#### Index Extension: Process

Closes audit topic 8 (full-corpus walks and per-trigger rebuilds) from `Codebase Audit — Report.md`, in two stages. Stage 1 extends the content index to Context keys and scopes the Context cascade to it; it's the same index extension that Backlinks, a Context view, and Linked-From are waiting on. Stage 2 is five independent narrowings that don't depend on stage 1's design but were held back so they don't collide with it in `Core/Index`, `Core/Contexts`, or `Core/Properties`.

**Ruled out of this process:** 8.2 (the view-order channel) waits on the state-placement ruling D-1; 8.3 (watcher id resolution), 8.6 (carrying the tree index forward), and 8.8 (per-version connection resolution on the scroll path) are deferred, not dropped.

##### Stage 1: Context Keys In The Content Index

**Status:** Dispatched 09-07-2026 as a Fable agent from the audit session, running in the background. Do not dispatch a second one. Its brief, in full, is below so the parallel session can judge the result against it.

**Finding:** `Core/Contexts/contextCascade.ts:63-72` calls `sweepGovernedRoots(root, { kind: 'nexus' }, …)` for every Space rename, Context delete, and single-Space unlink, reading, locking, and frontmatter-parsing every Markdown file in the nexus plus every Space sidecar. The property side (`Core/Properties/keyHolders.ts:8-14`) asks the content index which files hold the key and sweeps only those. Context keys (`<Title>:`) are outside the content index, which `ContextsPM.md`'s Pending note states.

**Scope the agent owns:**

1. **Model.** Decide how Context membership is represented in the content index (`Core/Platform/stores.ts` `ContentIndexStore`, seeded by `Core/Index/indexSeed.ts`, maintained by the hooks `Core/Index/indexMaintenance.test.ts` proves). Context values stay Space titles; ids were ruled out on legibility grounds. Extend an existing row shape over adding a parallel one.
2. **Seed and maintain.** The seed walk records membership; every path that changes a page's Context keys keeps it current (page write, rename, move, delete, trash and restore, external watch patch). The reseed-equivalence property test extends to Context rows. With no store present, the cascade falls back to today's full sweep.
3. **Consume.** The three cascade arms scope to the holders the index reports, in the shape of `keyHolders.ts`. The agent rules whether the cascade needs `confirmedKeyHolders`' confirm-from-disk step (a row inside the write-echo window can be missing from the index) and states why.
4. **Reverse query.** One read function answering "which pages hold Space X or Context C," no UI.
5. **Docs.** `ContextsPM.md` loses the Pending note and describes what exists; `CorePM.md` if its index section lists what's indexed; a concise `HistoryPM.md` entry per `History-Format.md`.

**Gate:** `set -o pipefail; npm run typecheck && npm run lint && npx vitest run`, all green. No commit; the working tree holds the change for review.

**Confirmation before stage 2:** read the agent's report, then check three things by hand: the reseed-equivalence test covers Context rows; `contextCascade.ts` no longer passes `{ kind: 'nexus' }`; the fallback path with a null store still sweeps. If any fails, send the agent back with the specific miss rather than starting over.

##### Stage 2: Five Independent Narrowings

**Status:** Not dispatched. Start once stage 1 is confirmed. One Opus agent, one brief, read-only outside the files named. Each item is independent; if one turns out to need a decision, skip it and report rather than guess.

| Audit action | Finding | What changes | Where |
| --- | --- | --- | --- |
| 8.4 | R-38 (c) | `confirmedKeyHolders` narrows its candidate set with `queryKeyHolders` and then confirms each hit from disk, instead of opening every Markdown file in the nexus. The disk confirm stays; it's there because a row inside the write-echo window can be missing from the index. | `Core/Properties/keyHolders.ts:17-27`, `Core/Properties/registryProperty.ts:113-116` |
| 8.5 | R-38 (d), (e) | The folder classifier reads `_taskconfig.json` / `_eventconfig.json` once per root folder; `agendaContext` already holds the parsed sidecars, so carrying that map into `FolderKindContext` answers from memory instead of a second `pathExists` pass. Separately, `applyWatchEvents`, `valueChangesOf`, and `tilesChangedIn` each re-classify the whole watch batch; classify once and share. | `Core/Nexus/folderKind.ts:51-53,90-96`, `Desktop/FileWatch/watcher.ts:94,104,106` |
| 8.7 | R-40 | `calloutAtomic.ts`'s `hiddenRanges` rebuilds an O(document) `RangeSet` on every caret motion. Wrap its body in `perDoc(...)` exactly as `docAtomics` in `decorations.ts:309-326` does, so the set is built once per document version. About four lines. | `Core/MarkdownPM/Guards/calloutAtomic.ts:6-24` |
| 8.9 | R-42 | `persistTabs()` (ten call sites) and `mirrorWindows()` (five) serialize and write the whole tab or window set on every activation. Debounce both through the pattern `createBodyWriter` already implements, with a flush on `beforeunload` and before a nexus switch (`nexusSlice.ts` already awaits `flushAllPageSaves()` there; add the tab flush beside it). | `Core/Session/navigationSlice.ts:211-219`, `Core/Session/windowSlice.ts:90`, `Core/Session/saveScheduler.ts` |
| 8.10 | F-VWS-11 | `GroupFrame.tsx`'s date list walks every page in the container in its render body. Memoize it on its inputs. The duplicate values read over IPC stays; the pane mounts from a menu outside `ViewHost` and has no path to the host's rows. | `Core/Views/Settings/GroupFrame.tsx:772-785` |

**Brief for the stage 2 agent:** the table above verbatim, plus: Edit tool only (Biome hook); no comments; no touching files not named; the same three-command gate; report the line delta; append `- **FIXED (this session):** …` to each closed finding's block in the audit ledger if the ledger path is supplied, otherwise list the closed IDs in the reply.

##### After Both Stages

The audit report and its artifact are scrubbed of R-37, R-38 (c) (d) (e), R-40, R-42, and F-VWS-11 by the session that owns the artifact.