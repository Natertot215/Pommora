## Handoff — Pommora

> **User Prompt:** *"I want you to create a framework or prompt to take a look at Pommora's architecture as a whole across all lines of code… I'm really asking for a complete audit."* — then *"Kick off bundle 1… run the cycle… commit final tree before the prompt is given,"* and *"Look at Bundle 2… explain it back to me simply what it is and why,"* closing on *"sure. Then run it with clear verification steps."*

#### Current Focus

**Session ID:** 3e3b1d3a-51d4-4651-905c-daa38b8c0e63
**Date:** 08-21-2026
**Model:** Fable 5

**The whole-codebase architecture audit ran, and its verdict is no rebuild — of anything.** Six parallel domain audits (data core, process boundary, MarkdownPM, view layer, design system, shell) each independently landed on healthy, every load-bearing claim re-verified at its cited lines before acceptance. The finding record is [[Architecture Audit — Full-Codebase Report]]; the work it produced is [[Codebase-Cleanup-Checklist]] — eight session bundles, each with verification and the documentation entries it retires, run under a fixed cycle: block → execution → full review → checklist + scrub → report → continuation prompt. `ArchitecturePM.md` was rewritten as the whole-app architecture guide, and `Cohesive-Cleanup.md` retired (queue absorbed into the bundles, sweep records moved to [[Cohesion-Rulings]]).

**Bundle 1 landed the same day, full cycle.** Seven fixes: the four `raw`-registered write channels enveloped; a shared journal-slot primitive with the slot law both crash journals now share — plus a `supersedes` arm the attack pass demanded, or a rename-back would replay the abandoned rename at every open; the select/status option twins parameterized; block tiles resolving their Space host from the live tree with a stale-folder guard; Cards' structural drag writing canonical `page_order` location-scoped, with a `resolveIndex` seam on `DragGroup` so a cross-location landing displaces nothing and flies home; card column-styles applying optimistically; Table's column readers fully memoized. Two build-breaking passes produced five real findings — all folded and test-pinned, including the viewOrders-mask coherence fix (a held mask is what the pipeline paints in structural views, so both views' structural drags now maintain it beside the canonical write).

**Verified live on the real nexus** through a throwaway collection driven over CDP: a same-location card drag wrote `page_order` = the gesture's exact intent; a cross-location hover displaced nothing and wrote nothing (sidecar hash byte-identical); a Sub-set drag wrote its own sidecar alone. Fixture deleted, trash bundle emptied, zero residue.

**Bundle 2 landed the same day, at `425ac6bd`.** MarkdownPM's remaining duplicate document reads are gone: the keystroke transforms take the cached scan and answer through the new line-local `inCodeAt` / `inCalloutAt` (`lineInCallout` deleted; `isInsideCode` survives only on the paste path), the heading scan reads that same scan through a structural `HeadingSrc` that `DocScan` satisfies, and `codeMaskOf` lets one scan thread a single code mask to the table and citation scans that each used to re-pair the whole document. Line chrome now assembles only the viewport's lines. **The specification changed before it was built:** the checklist's original 2b called for a ±1-line margin, which the code showed to be unnecessary — every `first`/`last` flag is decided by the whole-document derivation before the viewport is consulted, so a window only ever selects among already-correct answers. Atomic ranges are the deliberate exception and stay whole-document. Net **+79 code lines** against estimates of −15 and ≈0, recorded on the bundle as a correction to how the checklist sizes threading work.

#### Completion Criteria

- [x] **Audit complete** — six domains, verdicts evidenced, findings verified at cited lines.
- [x] **Checklist written** — bundles, cycle, rulings (location-scoped canonical card drag; accepted write-silence), open questions quarantined.
- [x] **Bundle 1 landed** — gates green (3,358 tests), simplify + attack cycles run, findings folded.
- [x] **Live interaction pass** — three drag behaviors driven and file-verified on the real nexus.
- [x] **Nathan confirmed the flat-mode boundary live** — his first try exposed the legacy-mask hole (a held viewOrder row interleaving the paint), the mask-suppression fix landed at `5e424c28`, and his retry confirmed the refusal works. Style optimism remains his to eyeball in passing; the main-process half of Bundle 1 loads on his next dev restart.
- [x] **Bundle 2 landed** — gates green (3,368 tests), simplifier and comment passes run and their changes independently verified at the cited lines, the windowed parity pin exhaustive over every line pair of every corpus document.
- [ ] **Bundle 2's live pass is owed** — a long page's typing latency, callout boxes and list rails at the viewport edges while scrolling, and arrow-key motion across a bulleted list's markers. Not driven this session: a `electron-vite dev` session was running, and CM6 extension changes need a full ⌘R to load, so the running instance was stale regardless.

#### Next Session — Two Parallel Tracks

1. **Finding the next thing to work on** — §Next-Feature Candidates in ContextPM, or wherever the day points. The footnotes Verification Checklist walk (plan document, eighteen lines) is still owed an eyeball, and the native right-click menu check with it.
2. **The continuous codebase cleanup** — [[Codebase-Cleanup-Checklist]], Bundle 3 (the Subfield reads the editor's scan) next unblocked; 6a → 6b (the rehome, then Table hoisting) are the high-priority pair after. Any session starts it with "Run the next bundle from Codebase-Cleanup-Checklist."

#### Feedback

- "Keep comments minimal" — mid-implementation; the diff's comments were trimmed to 1–2-line whys and the simplifier briefed the same.
- The flat-mode drag ruling came with its reason stated: location-scoped so ordering "remains file-system but doesn't confuse with cross-location drag when no visible boundaries exist" — and cross-location drops should *literally look non-valid, not displacing*. Built exactly so, verified visually.
- Bundle 1 ran as "everything besides the cards first, run the cycle, then the cards" — Cards carrying a double-check for cohesion plus full live-interaction testing with file-tree and screenshot confirmation.

#### Session Pointers

- `main/crud/journalSlot.ts` — the slot law + `supersedes`, stated once; both journals are codecs on it.
- `design-system/interactions/group.tsx` — `resolveIndex` is the landing-resolver seam; null = refused landing, origin preview, fly-home no-op.
- `Detail/Views/Cards/CardsView.tsx` — `structuralSlotFor` (the location scope), the structural arm in `reorderInBandByIndex` (canonical write + mask maintenance + painted-order no-op guard), `stylePatch` → `liveView` → card faces.
- `Detail/Views/creationOrder.ts` — `sameIds` joined `spliceBeside`/`tieOrderWith` as the shared order helpers.
- `decorations/intent.ts` — `inCodeAt` / `inCalloutAt` / `lineIndexAt` are the line-local readers; `assembleLineIntents` takes the window; `railIntents` returns per-line buckets.
- `editor/decorations.ts` — `docAtomics` / `atomicFor` hold the whole-document atomic set and drop the caret's line by bounded filter.
- `editor/headingScan.ts` — `HeadingSrc` is the structural contract `DocScan` satisfies; `headingSrc(text)` serves string callers; the one section cache lives here.
- `shared/markdownCode.ts` — `codeMaskOf` is the mask over an already-paired document; `codeMask(text)` is a wrapper on it.
- The audit report's §Redundancy Ledger maps every remaining bundle to the documentation entries it deletes on landing.

#### Working Notes

- **`sortedOrGrouped` is true for every view** — `mintNewView` stamps `group: {kind:'structural'}` — which is why both views suppress a held `viewOrder` mask at the order source when `structuralOrder` holds: structural paints are filesystem order, and a mask interleaving locations dissolves the drag boundary (found live in the Studio flat view, whose 3KB legacy mask let a drag cross locations). The mask stays the sorted/grouped tiebreaker.
- **The engine's refused-landing preview is the origin slot** — `resolveIndex` returning null re-aims `zid/idx` at the source; on release the origin commit is caught by the painted-order no-op guard, not by the engine.
- **A journal whose replay trusts the record's before-state needs the `supersedes` arm; one that verifies against current state does not** — that's the whole context/property asymmetry.
- **`styleFor` is read from the `view` prop by `CardFace`/`CardProperties`, never through `resolveColumns`** — an optimistic style layer must ride the view prop to the card faces; routing it through `columns` paints nothing.
- **The single-instance lock yields to a running dev session** — an agent relaunch with a debug port dies quietly if `electron-vite dev` holds the app; check `ps` before diagnosing a dead CDP port.
- **Windowing the drawn chrome is safe without a margin; windowing `atomicRanges` is not.** Every `first`/`last` flag is decided by the whole-document derivation before the viewport is consulted, so a window only selects among correct answers — but atomic ranges decide where a caret or selection endpoint may land, and a motion resolved against a slot the viewport hasn't reached seats the caret inside a marker nothing on screen stands for. A constraint written as a one-clause caveat in a bundle spec can hide a whole second implementation.
- **Rails are emitted after every line intent, never interleaved** — they anchor at the same offset as their line's own classes, and emission order stacks them. The parity pin compares sequences rather than sets, which is what caught the interleaved first draft.
- **`DocScan` extends `DocLines`**, so it already carries `text`, `lines`, and `lineStarts` — which is why the transforms could take the scan with zero body churn (`const doc = scan.text` at the top, everything below byte-identical). No wrapper type is needed to thread document facts.
