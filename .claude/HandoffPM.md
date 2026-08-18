## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence.”*

#### Current Focus

**Session ID:** b0908f7d-f069-4dee-abeb-10cee48cc7fe
**Dates:** 08-17-2026 → 08-18
**Model:** Fable 5

**PM-105's closing pass, then PM-106 — the property-cascade journal — end to end overnight.** The session opened by sealing the live-tree & content-index arc: a simplification review over the whole range folded nine duplications and surfaced two real defects (the rename bookkeeping's case-sensitive `.md` check against the walk's case-insensitive admit, and `folderCorpus` paying a whole-nexus readdir on every container open — fixed with `corpusFilesUnder`, a subtree-scoped form of the one corpus law). Then the journal ran the full writing-plans arc headless: scouting, plan, plan-attack (9 findings folded — both Highs were name-keyed replay arms that would have merged unrelated properties' values), three phases of execution, an implementation attack (4 findings folded — the big one being that the sweep layer *skips* unreadable pages rather than throwing, which forced "skips hold the record"), a simplifier pass, and a neutral verification round that adjudicated all four folds FIXED with executed evidence.

**The shipped shape:** `.nexus/property-cascade.json` — one id-keyed intent record, written before each dual-writer cascade (rename, delete, option-rename, option-remove), cleared on settle, replayed at open post-index-seed under one law: act only on the exactly-mapped state, clear on every other. The slot protects a stranded record from later ops; skips hold it; option-clear and `removeProperty` stay unjournaled because their residue disagrees with nothing. The crash-window suite proves heals byte-identical to uninterrupted ops (modulo `modified_at` on stamping ops), with a red-proof on the gates.

#### Completion Criteria

- [x] **PM-105 sealed** — simplifier folds verified personally, two defects fixed with regression tests, gates green, tree clean at `ab0f25ce`.
- [x] **The record module** — write/read/clear with the no-displace and clear-own-only guards; the Context journal's clear gained the same watcher echo.
- [x] **Every dual-writer op journaled** — rename (pre-commit, id-carrying), delete (post-snapshot), option-rename (def-gated pre-commit), option-remove (pre-strip, drop deferred on skips).
- [x] **The replay** — one wrapped `serializeSchemaOp` entry, per-op id-gated verification, never blocks an open, wired post-seed at both open paths.
- [x] **The failure half** — unreadable holders hold the record; `createProperty` consumes a matching delete record only after its commit; all four attack findings independently re-adjudicated FIXED.
- [x] **Docs made true** — PropertiesPM §Schema Mutations carries the journal; ContextsPM cross-references the sibling; ContextPM resolved + Recent Work refreshed; HistoryPM PM-106.

#### Next Session

- The abstract-plumbing era is closed. The menu: **full-text search** (the index makes it cheap; the most user-visible payoff of the plumbing) or **View QuickFilter** (first new user-facing feature) as the pivot back to visible work; the store split, `mutate.ts` arm moves, and the debt list remain standing get-it-done options — see ContextPM.

#### Feedback

- "Run headlessly through this work… ping me during milestones using the mobile notification tool" — overnight arcs proceed without pausing; PushNotification at phase boundaries, not per-step.
- "Don't leave any docs in the working tree on any final commits" — every commit sweeps the session's doc edits; a final commit leaves `git status` clean.
- "Explain the review findings as you're going into phase 2" / "explain the plan in plain english and give a codemap diff report when done" — review outcomes and plans get non-technical explanations in-chat; a closing report includes the codemap-formatted diff.
- "Go for your own review afterwards to simplify rather than trying to catch more bugs. Review from agents, you fold, then look over for any birds-eye-view insights" — after agent reviews: verify + fold personally, then a birds-eye simplification pass, no extra bug-hunt rounds.

#### Session Pointers

- `Pommora/src/main/crud/propertyJournal.ts` — the record: shapes, `sameRecord`, the no-displace write, the clear-own-only + session-root + echo guards.
- `Pommora/src/main/crud/replaySchemaCascade.ts` — the replay and its per-op law; the delete arm's crashed/freed states are the subtle pair.
- `Pommora/src/main/crud/replaySchemaCascade.test.ts` — the crash-window suite; `seedNexus`/`renameCrashState` are the fixture pattern, `unstamped` is the modulo-`modified_at` compare.
- `Pommora/src/main/crud/journalWiring.test.ts` — the ordering spies (journal present during page writes) via the `io/atomicWrite` triple mock.
- `Pommora/src/main/io/walk.ts` — `corpusFilesUnder`, the subtree-scoped corpus law; `corpusFiles` delegates to it.
- `.claude/Planning/Property-Cascade-Journal — Implementation Plan.md` — the closed plan; its Log carries every deviation and both attack rounds' foldings.

#### Working Notes

- **`rewritePageSerialized` conflates "unreadable" with "unchanged" in its boolean** — the disambiguator is the rewrite callback itself, which only runs on a landed read. `cascadePages` counts silence as a skip; any future sweep consumer needs the same trick, never the boolean alone.
- **The registry commits LAST in a delete and FIRST in a rename** — so a delete record meeting its def still present is the *owed* state, while a rename record meeting its old name still present is the *never-landed* state. Any future replay arm must derive its gate from the op's own commit order, not by analogy to a sibling.
- **`serializeSchemaOp` wraps entry points only** — the replay is one wrapped entry calling unwrapped internals; wrapping any internal it calls deadlocks every open holding a record.
- **A vitest fixture root must be `realpath`ed** before comparing against `sessionRoot()` — macOS `/var` → `/private/var` breaks identity guards silently.
- **`sameRecord`'s `b.op === a.op` after the early return is TS narrowing, not redundancy** — don't let a cleanup pass strip it.

#### Changes

**FILES ADDED**

- `.claude/Planning/Property-Cascade-Journal — Implementation Plan.md`
- `Pommora/src/main/crud/propertyJournal.ts` (+ test)
- `Pommora/src/main/crud/replaySchemaCascade.ts` (+ test)
- `Pommora/src/main/crud/journalWiring.test.ts`

**FILES MODIFIED**

- `.claude/ContextPM.md` · `.claude/HistoryPM.md` · `.claude/Features/PropertiesPM.md` · `.claude/Features/ContextsPM.md`
- `Pommora/src/main/crud/registryProperty.ts` · `deleteProperty.ts` · `optionOps.ts` · `contextJournal.ts` · `keyHolders.ts`
- `Pommora/src/main/liveTree.ts` · `mutatePatch.ts` · `watcher.ts` · `watchPatch.ts` · `exclusion.ts` · `indexSeed.ts` · `index.ts`
- `Pommora/src/main/io/walk.ts` · `Pommora/src/shared/treePatch.ts` (+ test)

**FILES DELETED**

- `.claude/Planning/Link Formatting — Implementation Plan.md` · `.claude/Planning/Live-Tree-Execution-Brief.md` (spent, removed by Nathan, bundled)

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
- Parallel sessions: the latest /handoff owns the document, and every session's transcript survives through retirement into // Sessions.
- If additional guidelines appear here that aren't in the handoffs template, it means they've been user-added and should be preserved.
